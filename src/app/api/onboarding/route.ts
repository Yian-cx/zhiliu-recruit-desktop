import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, checkAILimit, incrementDailyUsage } from "@/lib/guard";
import { getAIModel } from "@/lib/ai";
import { streamText } from "ai";

export async function POST(req: Request) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const { jobId, jobTitle, jobCompany, jd } = await req.json();

  let jobContext = "";
  if (jobId) {
    const job = await db.job.findUnique({ where: { id: jobId } });
    if (job && job.userId === user.id) {
      jobContext = `\n岗位：${job.title} @ ${job.company}\n岗位描述：${job.jd}\n`;
    }
  } else if (jobTitle) {
    jobContext = `\n岗位：${jobTitle}${jobCompany ? ` @ ${jobCompany}` : ""}\n${jd ? `岗位描述：${jd}` : ""}`;
  }

  if (!jobContext) {
    return NextResponse.json(
      { error: "请提供岗位信息" },
      { status: 400 }
    );
  }

  const { model, usingPersonalKey } = await getAIModel(user.id);

  const limit = await checkAILimit(user.id, user, usingPersonalKey);
  if (!limit.allowed) {
    return NextResponse.json({ error: limit.message }, { status: 429 });
  }

  try {
    const result = streamText({
      model,
      system: `你是一位资深的入职指导顾问。请为新员工制定一份详细的入职技能学习路线图。

要求：
1. 按周划分学习阶段（共 4-8 周）
2. 每个阶段包含：学习主题、具体任务、预期产出
3. 标注关键里程碑和检查点
4. 推荐学习资源（文档、课程、书籍）
5. 提供常见坑点和最佳实践

## 输出排版规则（严格遵守）

**节奏：** 每个段落不超过 3 行，段落之间空一行，使用短句保持停顿感，拒绝密集长文。

**标题：** 用 ## 标记小标题（如 "## 第1周：基础入门"），简洁有力，标题上下各空一行。

**强调：** 关键里程碑和结论用 **加粗** 突出；核心建议用 > 引用块展示。

**列表：** 学习任务和资源用 - 列表，每条不超过一行，间距统一不拥挤。

**语气：** 像一个耐心的导师在带新人，实用接地气，一眼能看到每周重点。`,
      prompt: `请根据以下岗位信息，生成一份入职技能学习路线图：${jobContext}

请详细规划从入职第一天到完全胜任的学习路径。`,
    });

    if (!usingPersonalKey) {
      await incrementDailyUsage(user.id, "aiCalls");
    }

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error("Onboarding generate error:", error);
    return NextResponse.json(
      { error: "AI 生成失败，请检查配置" },
      { status: 500 }
    );
  }
}
