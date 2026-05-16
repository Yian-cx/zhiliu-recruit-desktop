import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth } from "@/lib/guard";
import { jobSchema } from "@/lib/validations";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;

  const job = await db.job.findUnique({
    where: { id },
    include: {
      notes: { orderBy: { updatedAt: "desc" } },
      interviewSessions: { orderBy: { createdAt: "desc" } },
      offers: true,
      jobResumes: {
        include: { resume: true },
      },
    },
  });

  if (!job || job.userId !== user.id) {
    return NextResponse.json({ error: "岗位不存在" }, { status: 404 });
  }

  return NextResponse.json(job);
}

export async function PATCH(
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

  const body = await req.json();
  const parsed = jobSchema.partial().safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const updated = await db.job.update({
    where: { id },
    data: {
      ...parsed.data,
      status: parsed.data.status as any,
    },
    include: {
      notes: { orderBy: { updatedAt: "desc" } },
      interviewSessions: { orderBy: { createdAt: "desc" } },
      offers: true,
      jobResumes: {
        include: { resume: true },
      },
    },
  });

  return NextResponse.json(updated);
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

  await db.job.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
