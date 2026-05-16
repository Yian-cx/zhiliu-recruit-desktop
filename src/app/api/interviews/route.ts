import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, checkInterviewLimit, incrementDailyUsage } from "@/lib/guard";

export async function GET(req: Request) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");

  const sessions = await db.interviewSession.findMany({
    where: {
      userId: user.id,
      ...(jobId ? { jobId } : {}),
    },
    include: { job: { select: { company: true, title: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(sessions);
}

export async function POST(req: Request) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const limit = await checkInterviewLimit(user.id, user);
  if (!limit.allowed) {
    return NextResponse.json({ error: limit.message }, { status: 429 });
  }

  const { jobId, type } = await req.json();

  const interviewSession = await db.interviewSession.create({
    data: {
      userId: user.id,
      jobId: jobId || null,
      type: type || "TECHNICAL",
      messages: [],
    },
  });

  await incrementDailyUsage(user.id, "interviews");

  return NextResponse.json(interviewSession);
}
