import { createOpenAI } from "@ai-sdk/openai";
import { db } from "./prisma";
import { isVIP } from "./guard";

interface AIModelResult {
  model: ReturnType<ReturnType<typeof createOpenAI>["chat"]>;
  usingPersonalKey: boolean;
}

export async function getAIModel(userId?: string): Promise<AIModelResult> {
  const config = await db.aiConfig.findFirst({
    where: { id: "default" },
  });

  let apiKey: string;
  let baseUrl: string;
  let modelName: string;
  let usingPersonalKey = false;

  if (userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        membershipTier: true,
        membershipExpiresAt: true,
        role: true,
        personalApiKey: true,
        personalBaseUrl: true,
        personalModelName: true,
      },
    });

    if (user && isVIP(user) && user.personalApiKey) {
      apiKey = user.personalApiKey;
      baseUrl = user.personalBaseUrl || config?.baseUrl || "https://api.deepseek.com";
      modelName = user.personalModelName || config?.vipModelName || config?.modelName || "deepseek-chat";
      usingPersonalKey = true;
    } else if (user && isVIP(user) && config?.apiKey && config.vipModelName) {
      apiKey = config.apiKey;
      baseUrl = config.baseUrl;
      modelName = config.vipModelName;
    } else if (config?.apiKey) {
      apiKey = config.apiKey;
      baseUrl = config.baseUrl;
      modelName = config.modelName;
    } else {
      throw new Error("AI 配置未完成，请联系管理员");
    }
  } else if (config?.apiKey) {
    apiKey = config.apiKey;
    baseUrl = config.baseUrl;
    modelName = config.modelName;
  } else {
    throw new Error("AI 配置未完成，请联系管理员");
  }

  // Pre-flight check: verify API connection before returning model
  try {
    const probe = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 1,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!probe.ok) {
      const err = await probe.json().catch(() => ({}));
      throw new Error(`AI 连接失败 (${probe.status}): ${(err as any)?.error?.message || "请检查 API Key 和模型名称"}`);
    }
  } catch (e: any) {
    if (e.message?.startsWith("AI 连接失败") || e.message?.startsWith("AI 配置未完成")) {
      throw e;
    }
    throw new Error(`AI 连接失败: ${e.message || "请检查 API 配置"}`);
  }

  const provider = createOpenAI({ baseURL: baseUrl, apiKey });
  return {
    model: provider.chat(modelName),
    usingPersonalKey,
  };
}
