import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth } from "@/lib/guard";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const { id: resumeId } = await params;
  const { jobId } = await req.json();

  if (!jobId) {
    return NextResponse.json({ error: "请提供岗位 ID" }, { status: 400 });
  }

  const resume = await db.resume.findUnique({ where: { id: resumeId } });
  if (!resume || resume.userId !== user.id) {
    return NextResponse.json({ error: "简历不存在" }, { status: 404 });
  }

  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job || job.userId !== user.id) {
    return NextResponse.json({ error: "岗位不存在" }, { status: 404 });
  }

  const jobResume = await db.jobResume.upsert({
    where: { jobId_resumeId: { jobId, resumeId } },
    create: { jobId, resumeId },
    update: {},
  });

  return NextResponse.json(jobResume);
}
