import { auth } from "./auth";
import { db } from "./prisma";
import { NextResponse } from "next/server";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "未登录" }, { status: 401 }), user: null as any };
  }
  return { error: null, user: session.user };
}

export async function requireAdmin() {
  const { error, user } = await requireAuth();
  if (error) return { error, user: null as any };
  if (user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "无权限" }, { status: 403 }), user: null as any };
  }
  return { error: null, user };
}

export function isVIP(user: {
  role: string;
  membershipTier: string;
  membershipExpiresAt?: string | Date | null;
}): boolean {
  if (user.role === "ADMIN") return true;
  if (user.membershipTier === "PERMANENT_SVIP") return true;
  if (user.membershipTier === "FREE") return false;
  if (!user.membershipExpiresAt) return false;
  return new Date(user.membershipExpiresAt) > new Date();
}

const RESOURCE_LIMITS: Record<string, { limit: number; label: string }> = {
  jobs: { limit: 10, label: "岗位" },
  resumes: { limit: 3, label: "简历" },
};

export async function checkResourceLimit(
  userId: string,
  user: { role: string; membershipTier: string; membershipExpiresAt?: string | null },
  resource: "jobs" | "resumes"
) {
  if (isVIP(user)) return { allowed: true, current: 0, limit: Infinity };
  const cfg = RESOURCE_LIMITS[resource];
  const model = (resource === "jobs" ? db.job : db.resume) as { count: (args: any) => Promise<number> };
  const count = await model.count({ where: { userId } });
  return {
    allowed: count < cfg.limit,
    current: count,
    limit: cfg.limit,
    message: count >= cfg.limit ? `${cfg.label}数量已达上限 (${cfg.limit}个)，升级 VIP 可解锁更多` : undefined,
  };
}

const VIP_MONTHLY_AI_CALLS = 300;
const SVIP_MONTHLY_AI_CALLS = 50;
const FREE_DAILY_AI_CALLS = 5;

function getMonthStart() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMonthlyAILimit(user: { membershipTier: string }): number {
  if (user.membershipTier === "PERMANENT_SVIP") return SVIP_MONTHLY_AI_CALLS;
  return VIP_MONTHLY_AI_CALLS;
}

export async function checkAILimit(
  userId: string,
  user: { role: string; membershipTier: string; membershipExpiresAt?: string | null },
  usingPersonalKey: boolean
) {
  // Personal API key = user pays their own bill, no limit
  if (usingPersonalKey) return { allowed: true, current: 0, limit: Infinity };

  if (isVIP(user)) {
    const monthlyLimit = getMonthlyAILimit(user);
    const monthStart = getMonthStart();
    const records = await db.usageRecord.findMany({
      where: { userId, date: { gte: monthStart } },
      select: { aiCalls: true },
    });
    const total = records.reduce((sum, r) => sum + r.aiCalls, 0);
    return {
      allowed: total < monthlyLimit,
      current: total,
      limit: monthlyLimit,
      message: total >= monthlyLimit
        ? `本月平台 AI 调用已达上限 (${monthlyLimit}次)，次月自动重置，或绑定个人 API Key 解锁无限使用`
        : undefined,
    };
  }

  // FREE: 5 daily calls
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const record = await db.usageRecord.findUnique({
    where: { userId_date: { userId, date: today } },
  });
  const current = record?.aiCalls || 0;
  return {
    allowed: current < FREE_DAILY_AI_CALLS,
    current,
    limit: FREE_DAILY_AI_CALLS,
    message: current >= FREE_DAILY_AI_CALLS
      ? `今日 AI 调用已达上限 (${FREE_DAILY_AI_CALLS}次)，升级 VIP 每月 ${VIP_MONTHLY_AI_CALLS} 次，永久 SVIP 每月 ${SVIP_MONTHLY_AI_CALLS} 次`
      : undefined,
  };
}

export { getMonthlyAILimit, VIP_MONTHLY_AI_CALLS, SVIP_MONTHLY_AI_CALLS };

const INTERVIEW_DAILY_LIMIT = 5;

export async function checkInterviewLimit(
  userId: string,
  user: { role: string; membershipTier: string; membershipExpiresAt?: string | null }
) {
  if (isVIP(user)) return { allowed: true, current: 0, limit: Infinity };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const record = await db.usageRecord.findUnique({
    where: { userId_date: { userId, date: today } },
  });
  const current = record?.interviews || 0;
  return {
    allowed: current < INTERVIEW_DAILY_LIMIT,
    current,
    limit: INTERVIEW_DAILY_LIMIT,
    message: current >= INTERVIEW_DAILY_LIMIT
      ? `今日模拟面试已达上限 (${INTERVIEW_DAILY_LIMIT}次)，升级 VIP 可解锁无限使用`
      : undefined,
  };
}

export async function incrementDailyUsage(userId: string, type: "aiCalls" | "interviews") {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await db.usageRecord.upsert({
    where: { userId_date: { userId, date: today } },
    update: { [type]: { increment: 1 } },
    create: { userId, date: today, [type]: 1 },
  });
}
