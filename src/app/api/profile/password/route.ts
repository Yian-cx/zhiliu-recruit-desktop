import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth } from "@/lib/guard";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "请填写完整" }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ error: "新密码至少 6 位" }, { status: 400 });
  }

  const u = await db.user.findUnique({
    where: { id: user.id },
  });

  if (!u) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  const valid = await bcrypt.compare(currentPassword, u.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "当前密码错误" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.user.update({
    where: { id: u.id },
    data: { passwordHash },
  });

  await db.auditLog.create({
    data: {
      userId: u.id,
      action: "CHANGE_PASSWORD",
      detail: "用户修改密码",
      ip: req.headers.get("x-forwarded-for") || undefined,
    },
  });

  return NextResponse.json({ success: true });
}
