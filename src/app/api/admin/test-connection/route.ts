import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guard";

export async function GET() {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  try {
    const config = await db.aiConfig.findFirst({ where: { id: "default" } });
    if (!config?.apiKey) {
      return NextResponse.json({ error: "请先保存 API 配置" }, { status: 400 });
    }

    const res = await fetch(`${config.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.modelName,
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
