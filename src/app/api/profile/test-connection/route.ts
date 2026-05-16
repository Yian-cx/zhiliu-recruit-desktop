import { NextResponse } from "next/server";
import { requireAuth, isVIP } from "@/lib/guard";
import { db } from "@/lib/prisma";

export async function POST(req: Request) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  if (!isVIP(user)) {
    return NextResponse.json({ error: "VIP 用户才能使用个人 API" }, { status: 403 });
  }

  const { apiKey, baseUrl, modelName } = await req.json();

  if (!apiKey) {
    return NextResponse.json({ error: "请先填写 API Key" }, { status: 400 });
  }

  const url = baseUrl || "https://api.deepseek.com";
  const model = modelName || "deepseek-chat";

  try {
    const res = await fetch(`${url}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "回复 OK" }],
        max_tokens: 10,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
      return NextResponse.json(
        { error: `连接失败 (${res.status}): ${err.error?.message || res.statusText}` },
        { status: 500 }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      message: `连接测试成功！模型响应: ${data.choices?.[0]?.message?.content || "OK"}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `连接失败: ${error.message}` },
      { status: 500 }
    );
  }
}
