import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, checkAILimit, incrementDailyUsage } from "@/lib/guard";
import { getAIModel } from "@/lib/ai";
import { streamText } from "ai";

export async function POST(req: Request) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const { offers } = await req.json();

  if (!offers || offers.length < 2) {
    return NextResponse.json(
      { error: "至少选择 2 个 Offer 进行对比" },
      { status: 400 }
    );
  }

  // Sort offer IDs for consistent history lookup
  const sortedIds = [...offers.map((o: any) => o.id)].sort();

  // Check if this exact set was compared before
  const existing = await db.offerComparison.findFirst({
    where: { userId: user.id, offerIds: { equals: sortedIds } },
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

  try {
    const result = streamText({
      model,
      system: `你是一位专业的职业规划顾问，请对比分析多个 Offer，并给出建议。

对比维度：
1. 薪资对比：月薪、年薪（含月数）、时薪折算
2. 发展前景：公司规模、赛道、团队
3. 福利对比：五险一金、补充保险、假期等
4. 综合推荐：给出明确推荐及理由

## 输出排版规则（严格遵守）

**节奏：** 每个段落不超过 3 行，段落之间空一行，使用短句保持停顿感，拒绝密集长文。

**标题：** 用 ## 标记小标题（如 "## 薪资对比分析"），简洁有力，标题上下各空一行。

**强调：** 关键结论用 **加粗** 突出；核心结论用 > 引用块展示，搭配浅色背景更醒目。

**列表：** 用 - 做无序列表，每条不超过一行，间距统一不拥挤。

**表格：** 对比数据用 Markdown 表格呈现，表格前后各空一行。

**语气：** 专业但不冰冷，一眼能看到重点，让用户有"想继续往下看"的阅读体验。`,
      prompt: `请对比以下 Offer，并给出分析和推荐：

${offers
  .map(
    (o: any, i: number) =>
      `Offer ${i + 1}：
- 公司：${o.company}
- 职位：${o.title}
- 月薪：${o.salary?.toLocaleString()} 元
- 月数：${o.salaryMonth || 12} 薪
- 福利：${o.benefits || "未填写"}
- 备注：${o.notes || "无"}`
  )
  .join("\n\n")}`,
      onFinish: async ({ text }) => {
        await db.offerComparison.create({
          data: {
            userId: user.id,
            offerIds: sortedIds,
            result: text,
          },
        });
      },
    });

    if (!usingPersonalKey) {
      await incrementDailyUsage(user.id, "aiCalls");
    }

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error("Offer compare error:", error);
    return NextResponse.json(
      { error: "AI 分析失败，请检查 API 配置" },
      { status: 500 }
    );
  }
}
