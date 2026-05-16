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
  const note = await db.jobNote.findUnique({
    where: { id },
    include: { job: { select: { company: true, title: true } } },
  });

  if (!note || note.userId !== user.id) {
    return NextResponse.json({ error: "笔记不存在" }, { status: 404 });
  }

  return NextResponse.json(note);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const existing = await db.jobNote.findUnique({ where: { id } });

  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "笔记不存在" }, { status: 404 });
  }

  const { content } = await req.json();

  const updated = await db.jobNote.update({
    where: { id },
    data: { content },
    include: { job: { select: { company: true, title: true } } },
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
  const existing = await db.jobNote.findUnique({ where: { id } });

  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "笔记不存在" }, { status: 404 });
  }

  await db.jobNote.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
