import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, isVIP, getMonthlyAILimit, VIP_MONTHLY_AI_CALLS, SVIP_MONTHLY_AI_CALLS } from "@/lib/guard";

export async function GET() {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [usageToday, monthRecords, totalJobs, totalResumes, dbUser] = await Promise.all([
    db.usageRecord.findUnique({
      where: { userId_date: { userId: user.id, date: today } },
    }),
    db.usageRecord.findMany({
      where: { userId: user.id, date: { gte: monthStart } },
      select: { aiCalls: true },
    }),
    db.job.count({ where: { userId: user.id } }),
    db.resume.count({ where: { userId: user.id } }),
    db.user.findUnique({
      where: { id: user.id },
      select: { personalApiKey: true },
    }),
  ]);

  const vip = isVIP(user);
  const hasPersonalKey = !!(dbUser?.personalApiKey);
  const platformMonthly = monthRecords.reduce((sum, r) => sum + r.aiCalls, 0);
  const platformToday = usageToday?.aiCalls || 0;
  const monthlyLimit = vip ? getMonthlyAILimit(user) : 0;

  function buildDescription() {
    if (hasPersonalKey) return "当前使用个人 API Key，调用不限次数，不消耗平台额度";
    if (!vip) return `${platformToday} / 5 次（今日），升级 VIP 每月 ${VIP_MONTHLY_AI_CALLS} 次`;
    const tierLabel = user.membershipTier === "PERMANENT_SVIP" ? "永久 SVIP" : "VIP";
    return `${platformMonthly} / ${monthlyLimit} 次（本月），${tierLabel} 额度次月自动刷新`;
  }

  return NextResponse.json({
    membershipTier: user.membershipTier,
    membershipExpiresAt: user.membershipExpiresAt || null,
    isVIP: vip,
    hasPersonalKey,
    usage: {
      ai: {
        // Platform (admin) AI consumption
        platform: {
          today: platformToday,
          monthly: platformMonthly,
          monthlyLimit: vip ? monthlyLimit : undefined,
          dailyLimit: vip ? undefined : 5,
        },
        // Personal API key status
        personal: {
          enabled: hasPersonalKey,
          label: hasPersonalKey ? "个人模型" : "平台模型",
        },
        description: buildDescription(),
      },
      interviews: {
        today: usageToday?.interviews || 0,
        dailyLimit: vip ? Infinity : 5,
      },
      resources: {
        jobs: totalJobs,
        jobsLimit: vip ? Infinity : 10,
        resumes: totalResumes,
        resumesLimit: vip ? Infinity : 3,
      },
    },
  });
}
