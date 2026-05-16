import { createOpenAI } from "@ai-sdk/openai";
import { db } from "./prisma";
import { isVIP } from "./guard";

export async function getAIModel(userId?: string) {
  const config = await db.aiConfig.findFirst({
    where: { id: "default" },
  });

  if (!config || !config.apiKey) {
    throw new Error("AI 配置未完成，请联系管理员");
  }

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

    if (user && isVIP(user)) {
      if (user.personalApiKey) {
        const provider = createOpenAI({
          baseURL: user.personalBaseUrl || config.baseUrl,
          apiKey: user.personalApiKey,
        });
        return {
          model: provider.chat(user.personalModelName || config.vipModelName || config.modelName),
          usingPersonalKey: true,
        };
      }
      if (config.vipModelName) {
        const provider = createOpenAI({
          baseURL: config.baseUrl,
          apiKey: config.apiKey,
        });
        return {
          model: provider.chat(config.vipModelName),
          usingPersonalKey: false,
        };
      }
    }
  }

  const provider = createOpenAI({
    baseURL: config.baseUrl,
    apiKey: config.apiKey,
  });

  return {
    model: provider.chat(config.modelName),
    usingPersonalKey: false,
  };
}
