import { NextResponse } from "next/server";
import { requireAuth, checkAILimit, incrementDailyUsage } from "@/lib/guard";
import { getAIModel } from "@/lib/ai";
import { streamText } from "ai";

export async function POST(req: Request) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const { currentRole, targetRole, skills, experience } = await req.json();

  if (!currentRole || !targetRole) {
    return NextResponse.json(
      { error: "请提供当前职位和目标职位" },
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
      system: `你是一位资深的职业规划顾问。请分析用户的技能差距，并提供职业发展建议。

分析维度：
1. 技能差距：当前技能 vs 目标岗位要求
2. 学习路径：按优先级排序的学习计划（含时间估算）
3. 项目建议：可以做的实战项目来弥补差距
4. 认证/课程推荐：有价值的证书或课程
5. 求职策略：如何在没有完全匹配的情况下获得面试机会

## 输出排版规则（严格遵守）

**节奏：** 每个段落不超过 3 行，段落之间空一行，使用短句保持停顿感，拒绝密集长文。

**标题：** 用 ## 标记小标题（如 "## 你的技能差距"），简洁有力，标题上下各空一行。

**强调：** 关键结论和行动项用 **加粗** 突出；核心建议用 > 引用块展示。

**列表：** 学习计划和项目建议用 - 列表，每条不超过一行，间距统一不拥挤。

**表格：** 技能对比用 Markdown 表格呈现，表格前后各空一行。

**语气：** 理性务实，给你一个清晰的行动路线图，一眼能看到重点。`,
      prompt: `请分析以下职业发展路径：

当前职位：${currentRole}
目标职位：${targetRole}
${skills ? `当前技能：${skills}` : ""}
${experience ? `工作经验：${experience}` : ""}

请给出详细的技能差距分析和职业发展建议。`,
    });

    if (!usingPersonalKey) {
      await incrementDailyUsage(user.id, "aiCalls");
    }

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error("Career analyze error:", error);
    return NextResponse.json(
      { error: "AI 分析失败，请检查配置" },
      { status: 500 }
    );
  }
}
