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

  const [prevJob, nextJob] = await Promise.all([
    db.job.findFirst({
      where: { userId: user.id, updatedAt: { gt: job.updatedAt } },
      orderBy: { updatedAt: "asc" },
      select: { id: true },
    }),
    db.job.findFirst({
      where: { userId: user.id, updatedAt: { lt: job.updatedAt } },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    }),
  ]);

  return NextResponse.json({
    ...job,
    prevId: prevJob?.id || null,
    nextId: nextJob?.id || null,
  });
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

  const data: Record<string, unknown> = { ...(parsed.data as Record<string, unknown>) };
  // Only update status if the caller explicitly provided it;
  // otherwise keep the existing value (Zod default would reset it to INTERESTED)
  if (!("status" in body)) {
    delete data.status;
  }

  const updated = await db.job.update({
    where: { id },
    data,
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
