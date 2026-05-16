import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ connected: false, reason: "未登录" });
  }

  try {
    // Check if user has personal API key set
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { personalApiKey: true, personalBaseUrl: true, personalModelName: true },
    });

    let apiKey: string | undefined;
    let baseUrl: string;
    let modelName: string;

    if (user?.personalApiKey) {
      apiKey = user.personalApiKey;
      baseUrl = user.personalBaseUrl || "https://api.deepseek.com";
      modelName = user.personalModelName || "deepseek-chat";
    } else {
      const config = await db.aiConfig.findFirst({ where: { id: "default" } });
      if (!config?.apiKey) {
        return NextResponse.json({ connected: false, reason: "未配置 AI API" });
      }
      apiKey = config.apiKey;
      baseUrl = config.baseUrl;
      modelName = config.modelName;
    }

    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 5,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({
        connected: false,
        reason: (err as any)?.error?.message || `HTTP ${res.status}`,
      });
    }

    return NextResponse.json({ connected: true });
  } catch (error: any) {
    return NextResponse.json({
      connected: false,
      reason: error.message || "连接失败",
    });
  }
}
