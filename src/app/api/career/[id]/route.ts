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
  const plan = await db.careerPlan.findUnique({
    where: { id },
    include: { job: { select: { company: true, title: true } } },
  });

  if (!plan || plan.userId !== user.id) {
    return NextResponse.json({ error: "规划不存在" }, { status: 404 });
  }

  return NextResponse.json(plan);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const existing = await db.careerPlan.findUnique({ where: { id } });

  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "规划不存在" }, { status: 404 });
  }

  const { title, skillGaps, roadmap, progress } = await req.json();

  const updated = await db.careerPlan.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(skillGaps !== undefined ? { skillGaps } : {}),
      ...(roadmap !== undefined ? { roadmap } : {}),
      ...(progress !== undefined ? { progress } : {}),
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
  const existing = await db.careerPlan.findUnique({ where: { id } });

  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "规划不存在" }, { status: 404 });
  }

  await db.careerPlan.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
