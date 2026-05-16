import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth } from "@/lib/guard";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;

  const offer = await db.offer.findUnique({ where: { id } });
  if (!offer || offer.userId !== user.id) {
    return NextResponse.json({ error: "Offer 不存在" }, { status: 404 });
  }

  const body = await req.json();
  const updated = await db.offer.update({ where: { id }, data: body });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;

  const offer = await db.offer.findUnique({ where: { id } });
  if (!offer || offer.userId !== user.id) {
    return NextResponse.json({ error: "Offer 不存在" }, { status: 404 });
  }

  await db.offer.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
