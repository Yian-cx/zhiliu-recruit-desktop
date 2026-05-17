import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guard";

export async function GET(req: Request) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 100);

  const where: any = {};
  if (search) {
    where.OR = [
      { email: { contains: search } },
      { nickname: { contains: search } },
    ];
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        role: true,
        membershipTier: true,
        membershipExpiresAt: true,
        createdAt: true,
        _count: { select: { jobs: true, resumes: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page, pageSize });
}

function computeExpiresAt(tier: string): Date | null {
  if (tier === "FREE" || tier === "PERMANENT_SVIP") return null;
  const now = new Date();
  switch (tier) {
    case "WEEKLY_VIP":
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case "MONTHLY_VIP":
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    case "YEARLY_VIP":
      return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

export async function PATCH(req: Request) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const { userId, membershipTier, membershipExpiresAt, role } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "缺少用户 ID" }, { status: 400 });
  }

  const data: any = {};
  if (membershipTier !== undefined) {
    data.membershipTier = membershipTier;
    data.membershipExpiresAt = membershipExpiresAt !== undefined
      ? (membershipExpiresAt ? new Date(membershipExpiresAt) : null)
      : computeExpiresAt(membershipTier);
  } else if (membershipExpiresAt !== undefined) {
    data.membershipExpiresAt = membershipExpiresAt ? new Date(membershipExpiresAt) : null;
  }
  if (role !== undefined) data.role = role;

  const user = await db.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      nickname: true,
      role: true,
      membershipTier: true,
      membershipExpiresAt: true,
    },
  });

  return NextResponse.json(user);
}
