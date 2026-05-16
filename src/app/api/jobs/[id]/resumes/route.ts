import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth } from "@/lib/guard";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;

  const job = await db.job.findUnique({ where: { id } });
  if (!job || job.userId !== user.id) {
    return NextResponse.json({ error: "岗位不存在" }, { status: 404 });
  }

  const { resumeId } = await req.json();
  if (!resumeId) {
    return NextResponse.json({ error: "请选择简历" }, { status: 400 });
  }

  const resume = await db.resume.findUnique({ where: { id: resumeId } });
  if (!resume || resume.userId !== user.id) {
    return NextResponse.json({ error: "简历不存在" }, { status: 404 });
  }

  const existing = await db.jobResume.findUnique({
    where: { jobId_resumeId: { jobId: id, resumeId } },
  });
  if (existing) {
    return NextResponse.json({ error: "已关联该简历" }, { status: 409 });
  }

  const jobResume = await db.jobResume.create({
    data: { jobId: id, resumeId },
    include: { resume: true },
  });

  return NextResponse.json(jobResume, { status: 201 });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;

  const job = await db.job.findUnique({ where: { id } });
  if (!job || job.userId !== user.id) {
    return NextResponse.json({ error: "岗位不存在" }, { status: 404 });
  }

  const { resumeId } = await req.json();
  if (!resumeId) {
    return NextResponse.json({ error: "请指定简历" }, { status: 400 });
  }

  const existing = await db.jobResume.findUnique({
    where: { jobId_resumeId: { jobId: id, resumeId } },
  });
  if (!existing) {
    return NextResponse.json({ error: "未关联该简历" }, { status: 404 });
  }

  await db.jobResume.delete({
    where: { jobId_resumeId: { jobId: id, resumeId } },
  });

  return NextResponse.json({ success: true });
}
