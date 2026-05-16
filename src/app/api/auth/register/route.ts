import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email, password, nickname, phone } = await req.json();

    if (!password) {
      return NextResponse.json({ error: "密码为必填项" }, { status: 400 });
    }

    if (!email && !phone) {
      return NextResponse.json({ error: "手机号和邮箱至少填写一项" }, { status: 400 });
    }

    // Check uniqueness for email
    if (email) {
      const existing = await db.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: "该邮箱已注册" }, { status: 400 });
      }
    }

    // Check uniqueness for phone
    if (phone) {
      const existing = await db.user.findFirst({ where: { phone } });
      if (existing) {
        return NextResponse.json({ error: "该手机号已注册" }, { status: 400 });
      }
    }

    // First user becomes admin
    const userCount = await db.user.count();
    const role = userCount === 0 ? "ADMIN" : "USER";

    const passwordHash = await bcrypt.hash(password, 12);

    const identifier = email || phone || "unknown";

    const user = await db.user.create({
      data: {
        email: email || `${phone}@phone.user`,
        passwordHash,
        nickname: nickname || (email ? email.split("@")[0] : phone),
        phone,
        role,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "REGISTER",
        detail: `用户 ${identifier} 注册${role === "ADMIN" ? "（首个管理员）" : ""}`,
        ip: req.headers.get("x-forwarded-for") || undefined,
      },
    });

    return NextResponse.json({ success: true, email: user.email });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "注册失败，请重试" }, { status: 500 });
  }
}
