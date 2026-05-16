import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, checkAILimit, incrementDailyUsage } from "@/lib/guard";
import { getAIModel } from "@/lib/ai";
import { streamText } from "ai";

export async function POST(req: Request) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const { jobIds } = await req.json();
  if (!Array.isArray(jobIds) || jobIds.length < 2) {
    return NextResponse.json({ error: "请至少选择2个岗位" }, { status: 400 });
  }

  // Sort IDs for consistent history lookup
  const sortedIds = [...jobIds].sort();

  // Check if this exact set was compared before
  const existing = await db.jobComparison.findFirst({
    where: { userId: user.id, jobIds: { equals: sortedIds } },
  });
  if (existing) {
    return NextResponse.json({
      cached: true,
      id: existing.id,
      result: existing.result,
      createdAt: existing.createdAt,
    });
  }

  const { model, usingPersonalKey } = await getAIModel(user.id);

  const limit = await checkAILimit(user.id, user, usingPersonalKey);
  if (!limit.allowed) {
    return NextResponse.json({ error: limit.message }, { status: 429 });
  }

  const jobs = await db.job.findMany({
    where: {
      id: { in: jobIds },
      userId: user.id,
    },
    select: {
      company: true,
      title: true,
      salaryMin: true,
      salaryMax: true,
      location: true,
      remote: true,
      jd: true,
    },
  });

  if (jobs.length < 2) {
    return NextResponse.json({ error: "未找到足够的岗位进行比较" }, { status: 400 });
  }

  const jobsSummary = jobs
    .map((j, i) => {
      const salary =
        j.salaryMin && j.salaryMax
          ? `${(j.salaryMin / 1000).toFixed(0)}k-${(j.salaryMax / 1000).toFixed(0)}k`
          : "未知";
      return `【岗位${i + 1}】${j.company} - ${j.title}
- 薪资: ${salary}
- 地点: ${j.location || "未知"}${j.remote ? " (可远程)" : ""}
- JD摘要: ${j.jd.slice(0, 500)}`;
    })
    .join("\n\n");

  const result = streamText({
    model,
    system: `你是一位资深的职业顾问，请对岗位进行详细对比分析，帮助求职者做出决策。

## 输出排版规则（严格遵守）

**节奏：** 每个段落不超过 3 行，段落之间空一行，使用短句保持停顿感，拒绝密集长文。

**标题：** 用 ## 标记小标题（如 "## 薪资待遇对比"），简洁有力，标题上下各空一行。

**强调：** 关键结论用 **加粗** 突出；核心结论用 > 引用块展示，搭配浅色背景更醒目。

**列表：** 用 - 做无序列表，每条不超过一行，间距统一不拥挤。

**表格：** 对比数据用 Markdown 表格呈现，表格前后各空一行。

**语气：** 客观中肯，一眼能看到重点，让用户有"想继续往下看"的阅读体验。`,
    prompt: `请从以下几个维度对比分析以下岗位：

${jobsSummary}

分析维度：
1. **薪资待遇对比** - 薪资水平、构成、竞争力
2. **地点与通勤** - 城市、远程政策、生活成本
3. **岗位要求对比** - 技术栈、经验要求、职责范围
4. **发展前景** - 公司情况、成长空间
5. **综合评价** - 每个岗位的优劣势总结，给出推荐排序

要求：客观中肯，每个维度都要具体分析，用表格呈现关键对比数据。`,
    onFinish: async ({ text }) => {
      await db.jobComparison.create({
        data: {
          userId: user.id,
          jobIds: sortedIds,
          result: text,
        },
      });
    },
  });

  if (!usingPersonalKey) {
    await incrementDailyUsage(user.id, "aiCalls");
  }

  return result.toTextStreamResponse();
}
