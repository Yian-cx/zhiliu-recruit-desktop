import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/guard";
import { db } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const comparison = await db.offerComparison.findFirst({
    where: { id, userId: user.id },
  });

  if (!comparison) {
    return NextResponse.json({ error: "对比记录不存在" }, { status: 404 });
  }

  return NextResponse.json(comparison);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const result = await db.offerComparison.deleteMany({
    where: { id, userId: user.id },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "对比记录不存在" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
