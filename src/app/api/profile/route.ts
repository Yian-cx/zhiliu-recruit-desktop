import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth } from "@/lib/guard";

export async function PATCH(req: Request) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const { nickname, avatarUrl, email, phone, wechat, qq } = await req.json();

  const data: Record<string, unknown> = {};

  if (nickname !== undefined) data.nickname = nickname || undefined;
  if (avatarUrl !== undefined) data.avatarUrl = avatarUrl || null;
  if (phone !== undefined) data.phone = phone || null;
  if (wechat !== undefined) data.wechat = wechat || null;
  if (qq !== undefined) data.qq = qq || null;

  // Email change requires it to be unique
  if (email !== undefined && email) {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing && existing.id !== user.id) {
      return NextResponse.json({ error: "该邮箱已被其他账户使用" }, { status: 409 });
    }
    data.email = email;
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data,
  });

  return NextResponse.json({
    success: true,
    user: {
      id: updated.id,
      email: updated.email,
      nickname: updated.nickname,
      avatarUrl: updated.avatarUrl,
      phone: updated.phone,
      wechat: updated.wechat,
      qq: updated.qq,
    },
  });
}
