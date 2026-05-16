import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth } from "@/lib/guard";

export async function GET() {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const plans = await db.careerPlan.findMany({
    where: { userId: user.id },
    include: { job: { select: { company: true, title: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(plans);
}

export async function POST(req: Request) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const { title, jobId, skillGaps, roadmap } = await req.json();

  if (!title) {
    return NextResponse.json({ error: "请输入规划标题" }, { status: 400 });
  }

  const plan = await db.careerPlan.create({
    data: {
      userId: user.id,
      title,
      jobId: jobId || null,
      skillGaps: skillGaps || [],
      roadmap: roadmap || [],
      progress: {},
    },
  });

  return NextResponse.json(plan);
}
