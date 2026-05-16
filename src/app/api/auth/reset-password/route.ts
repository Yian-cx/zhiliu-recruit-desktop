import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { phone, email, code, password, confirmPassword } = await req.json();

    if (!email && !phone) {
      return NextResponse.json({ error: "手机号或邮箱为必填项" }, { status: 400 });
    }

    if (!code || code.length < 4) {
      return NextResponse.json({ error: "请输入验证码" }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: "密码至少需要 6 位" }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "两次输入的密码不一致" }, { status: 400 });
    }

    // Find user by email or phone
    const user = email
      ? await db.user.findUnique({ where: { email } })
      : await db.user.findFirst({ where: { phone } });

    if (!user) {
      return NextResponse.json({ error: "该账号未注册" }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "PASSWORD_RESET",
        detail: `用户 ${user.email || user.phone} 重置了密码`,
        ip: req.headers.get("x-forwarded-for") || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      email: user.email,
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "重置密码失败，请重试" }, { status: 500 });
  }
}
