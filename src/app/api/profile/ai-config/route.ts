import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, isVIP } from "@/lib/guard";

export async function GET() {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  if (!isVIP(user)) {
    return NextResponse.json({ error: "仅 VIP 用户可使用个人 AI 配置" }, { status: 403 });
  }

  const u = await db.user.findUnique({
    where: { id: user.id },
    select: {
      personalApiKey: true,
      personalBaseUrl: true,
      personalModelName: true,
    },
  });

  return NextResponse.json(u || { personalApiKey: null, personalBaseUrl: null, personalModelName: null });
}

export async function PATCH(req: Request) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  if (!isVIP(user)) {
    return NextResponse.json({ error: "仅 VIP 用户可使用个人 AI 配置" }, { status: 403 });
  }

  const { personalApiKey, personalBaseUrl, personalModelName } = await req.json();

  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      personalApiKey: personalApiKey !== undefined ? (personalApiKey || null) : undefined,
      personalBaseUrl: personalBaseUrl !== undefined ? (personalBaseUrl || null) : undefined,
      personalModelName: personalModelName !== undefined ? (personalModelName || null) : undefined,
    },
    select: {
      personalApiKey: true,
      personalBaseUrl: true,
      personalModelName: true,
    },
  });

  return NextResponse.json(updated);
}
