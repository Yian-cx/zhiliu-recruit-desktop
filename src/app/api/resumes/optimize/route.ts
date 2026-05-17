import { NextResponse } from "next/server";
import { requireAuth, checkAILimit, incrementDailyUsage } from "@/lib/guard";
import { getAIModel } from "@/lib/ai";
import { streamText } from "ai";

export async function POST(req: Request) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const { resumeContent, jobTitle, jobCompany, jd, customInstructions } = await req.json();

  if (!resumeContent) {
    return NextResponse.json({ error: "请提供简历内容" }, { status: 400 });
  }

  const { model, usingPersonalKey } = await getAIModel(user.id);

  const limit = await checkAILimit(user.id, user, usingPersonalKey);
  if (!limit.allowed) {
    return NextResponse.json({ error: limit.message }, { status: 429 });
  }

  try {
    const result = streamText({
      model,
      system: `你是一位专业的简历优化顾问，擅长 ATS（应用跟踪系统）优化和针对性简历撰写。

请根据用户提供的简历和岗位描述（JD），优化简历内容。

## 优化原则

1. 根据 JD 中的关键词，匹配简历中的技能和经验
2. 用 STAR 方法重新组织项目经验：情境(Situation)、任务(Task)、行动(Action)、结果(Result)
3. 突出与岗位匹配的关键技能
4. 保持专业性，不要编造经历
5. 保持简洁，避免冗余描述

## 输出结构

先输出「## 主要优化点」章节，列出你做了哪些改动：
- 每条优化点说明改了什么、为什么这样改
- 至少列出 3-5 条关键优化
- 如果关联了 JD，说明如何针对 JD 关键词做了匹配

然后用分隔线「---」隔开，再输出「## 优化后简历」章节，包含完整的优化后简历。

## 输出排版规则（严格遵守）

**节奏：** 每个段落不超过 3 行，段落之间空一行，使用短句保持停顿感，拒绝密集长文。

**标题：** 用 ## 标记小标题，简洁有力，标题上下各空一行。

**强调：** 关键优化点和改动理由用 **加粗** 突出；核心建议用 > 引用块展示。

**列表：** 优化点用 - 列表，每条不超过一行，间距统一不拥挤。

**语气：** 专业精确，让用户一眼能看到改了什么、为什么。`,
      prompt: `${
        customInstructions
          ? `用户对简历修改提出了以下具体要求，请根据用户的要求进行针对性的修改：

用户要求：
${customInstructions}

${jobTitle ? `目标职位：${jobTitle}` : ""}
${jobCompany ? `目标公司：${jobCompany}` : ""}

简历原文：
${resumeContent}

${jd ? `岗位描述（JD）：\n${jd}` : ""}

注意：请只针对用户提出的要求进行修改，保持其他部分不变。先在「## 主要优化点」中说明你按用户要求做了哪些针对性修改，然后再输出完整的修改后简历。`
          : `请优化以下简历，使其更匹配目标岗位。

${jobTitle ? `目标职位：${jobTitle}` : ""}
${jobCompany ? `目标公司：${jobCompany}` : ""}

简历原文：
${resumeContent}

${jd ? `岗位描述（JD）：\n${jd}` : ""}`
      }`,
    });

    if (!usingPersonalKey) {
      await incrementDailyUsage(user.id, "aiCalls");
    }

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error("Resume optimize error:", error);
    return NextResponse.json(
      { error: "AI 优化失败，请检查 API 配置" },
      { status: 500 }
    );
  }
}
