import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth } from "@/lib/guard";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;

  const interviewSession = await db.interviewSession.findUnique({
    where: { id },
    include: { job: { select: { company: true, title: true } } },
  });

  if (!interviewSession || interviewSession.userId !== user.id) {
    return NextResponse.json({ error: "会话不存在" }, { status: 404 });
  }

  return NextResponse.json(interviewSession);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const existing = await db.interviewSession.findUnique({ where: { id } });

  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "会话不存在" }, { status: 404 });
  }

  const { messages, feedback } = await req.json();

  const updated = await db.interviewSession.update({
    where: { id },
    data: {
      ...(messages !== undefined ? { messages } : {}),
      ...(feedback !== undefined ? { feedback } : {}),
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
  const existing = await db.interviewSession.findUnique({ where: { id } });

  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "会话不存在" }, { status: 404 });
  }

  await db.interviewSession.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
