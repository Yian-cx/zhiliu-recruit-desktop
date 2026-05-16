import { NextResponse } from "next/server";
import { requireAuth, checkAILimit, incrementDailyUsage } from "@/lib/guard";
import { getAIModel } from "@/lib/ai";
import { db } from "@/lib/prisma";
import { streamText } from "ai";

const SYSTEM_PROMPT = `你现在是网站专属AI心理疏导+职业人生规划导师，全程温柔共情、理性引导，严格按照固定流程一步步主动和用户对话，不一次性说完，循序渐进：

第一步：先做心理疏导，安抚用户迷茫焦虑情绪，纠正自我内耗、错误负面思维，引导用户跳出消极行为习惯。
第二步：主动询问用户【最不想做、最排斥的工作和岗位】，全部记录下来，后续所有职业推荐永久排除这类方向。
第三步：再主动询问用户【自己最喜欢做什么、擅长什么、会什么技能、做什么事最有状态】，深挖兴趣点。
第四步：逐步摸底现实条件：所在城市、当地租房消费、每月固定开支、存款负债、当前经济压力情况。
第五步：根据以上所有信息，分三层给用户做阶梯规划：
1. 当下立刻就能做、不触碰反感岗位、贴合兴趣的短期赚钱工作/过渡方案
2. 攒到一定资金后可以切换的进阶方向
3. 长期围绕兴趣发展的终身职业规划

全程一步步提问，不要一次性把所有问题抛出去，一问一答慢慢引导，语气温暖治愈，既有心理疏导又有落地实际规划，贴合用户现实经济能力，不画大饼。

## 回复排版格式
你必须使用 Markdown 格式回复，让排版美观易读：

- 用 ## 标记小标题，如 "## 你现在真正面临的问题"
- 用 **加粗** 强调重点关键词
- 用 - 或 * 做列表，每条不超过一行
- 用 > 做重点引用块，突出核心结论
- 每个段落不超过 3 行，多用短句
- 段落之间空一行
- 情绪类的回复，用短句 + 空行营造节奏感
- 不要写密集长文，保持呼吸感`;

export async function POST(req: Request) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const { messages, conversationId } = await req.json();

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "缺少对话消息" }, { status: 400 });
  }

  const { model, usingPersonalKey } = await getAIModel(user.id);

  const limit = await checkAILimit(user.id, user, usingPersonalKey);
  if (!limit.allowed) {
    return NextResponse.json({ error: limit.message }, { status: 429 });
  }

  // Find or create conversation
  let convId = conversationId;
  if (!convId) {
    // Only create a new conversation on first message
    const lastUserMsg = [...messages].reverse().find((m: { role: string; content: string }) => m.role === "user");
    const title = lastUserMsg ? lastUserMsg.content.slice(0, 50) : "新对话";
    const conv = await db.coachConversation.create({
      data: { userId: user.id, title },
    });
    convId = conv.id;
  }

  // Save user message
  const lastMessage = messages[messages.length - 1];
  if (lastMessage && lastMessage.role === "user") {
    await db.coachMessage.create({
      data: {
        conversationId: convId,
        role: "user",
        content: lastMessage.content,
      },
    });
  }

  try {
    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      prompt: messages
        .map((m: { role: string; content: string }) =>
          `${m.role === "user" ? "用户" : "AI导师"}: ${m.content}`
        )
        .join("\n"),
      onFinish: async ({ text }) => {
        await db.coachMessage.create({
          data: {
            conversationId: convId,
            role: "assistant",
            content: text,
          },
        });
        await db.coachConversation.update({
          where: { id: convId },
          data: { updatedAt: new Date() },
        });
      },
    });

    if (!usingPersonalKey) {
      await incrementDailyUsage(user.id, "aiCalls");
    }

    const response = result.toTextStreamResponse();

    // Attach conversationId header so client can track it
    const headers = new Headers(response.headers);
    headers.set("X-Conversation-Id", convId);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error: any) {
    console.error("Career coach chat error:", error);
    return NextResponse.json(
      { error: "AI 服务不可用，请检查配置" },
      { status: 500 }
    );
  }
}
