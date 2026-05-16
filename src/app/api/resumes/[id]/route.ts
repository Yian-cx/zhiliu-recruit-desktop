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

  const resume = await db.resume.findUnique({
    where: { id },
    include: {
      jobResumes: {
        include: { job: true },
      },
    },
  });

  if (!resume || resume.userId !== user.id) {
    return NextResponse.json({ error: "简历不存在" }, { status: 404 });
  }

  return NextResponse.json(resume);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;

  const resume = await db.resume.findUnique({ where: { id } });
  if (!resume || resume.userId !== user.id) {
    return NextResponse.json({ error: "简历不存在" }, { status: 404 });
  }

  const body = await req.json();

  if (body.isDefault) {
    await db.resume.updateMany({
      where: { userId: user.id },
      data: { isDefault: false },
    });
  }

  const updated = await db.resume.update({
    where: { id },
    data: body,
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

  const resume = await db.resume.findUnique({ where: { id } });
  if (!resume || resume.userId !== user.id) {
    return NextResponse.json({ error: "简历不存在" }, { status: 404 });
  }

  await db.resume.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
