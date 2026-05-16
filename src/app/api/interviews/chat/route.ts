import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, checkAILimit, incrementDailyUsage } from "@/lib/guard";
import { getAIModel } from "@/lib/ai";
import { streamText } from "ai";

export async function POST(req: Request) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const { sessionId, message, jobId, type } = await req.json();

  if (!sessionId || !message) {
    return NextResponse.json(
      { error: "缺少必要参数" },
      { status: 400 }
    );
  }

  const interviewSession = await db.interviewSession.findUnique({
    where: { id: sessionId },
  });

  if (!interviewSession || interviewSession.userId !== user.id) {
    return NextResponse.json({ error: "会话不存在" }, { status: 404 });
  }

  const { model, usingPersonalKey } = await getAIModel(user.id);

  const limit = await checkAILimit(user.id, user, usingPersonalKey);
  if (!limit.allowed) {
    return NextResponse.json({ error: limit.message }, { status: 429 });
  }

  let jobContext = "";
  if (interviewSession.jobId) {
    const job = await db.job.findUnique({
      where: { id: interviewSession.jobId },
    });
    if (job) {
      jobContext = `\n目标岗位：${job.title} @ ${job.company}\n岗位描述：${job.jd}\n`;
    }
  }

  const messages = (interviewSession.messages as any[]) || [];
  const interviewType = type || interviewSession.type || "TECHNICAL";

  const typeLabels: Record<string, string> = {
    TECHNICAL: "技术面",
    HR: "HR 面",
    BEHAVIORAL: "行为面",
  };

  try {
    const result = streamText({
      model,
      system: `你是一位资深的面试官，正在进行一场${typeLabels[interviewType] || "技术"}面试。${jobContext}

面试规则：
1. 根据岗位要求提出有针对性的问题，每次只问一个问题
2. 根据候选人的回答给予简短评价（优点和改进点），然后提出下一个问题
3. 在面试过程中自然地评估：技术能力、沟通表达、问题解决思路
4. 保持专业、友好的语气
5. 面试轮数控制在 5-8 轮
6. 如果候选人回答过于简短，可以追问细节
7. 在最后一轮结束时，给出综合评价（1-10 分）和改进建议
8. 每次回复的最后一行用 "---" 分隔，之后写上本轮评分（1-10）`,
      prompt: `以下是对话历史：

${messages.map((m: any) => `${m.role === "user" ? "候选人" : "面试官"}: ${m.content}`).join("\n")}

候选人最新回答：${message}

请作为面试官回复。`,
    });

    if (!usingPersonalKey) {
      await incrementDailyUsage(user.id, "aiCalls");
    }

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error("Interview chat error:", error);
    return NextResponse.json(
      { error: "AI 服务不可用，请检查配置" },
      { status: 500 }
    );
  }
}
