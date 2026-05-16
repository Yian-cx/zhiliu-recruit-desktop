import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth } from "@/lib/guard";
import { offerSchema } from "@/lib/validations";

export async function GET() {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const offers = await db.offer.findMany({
    where: { userId: user.id },
    orderBy: { receivedAt: "desc" },
    include: { job: { select: { company: true, title: true } } },
  });

  return NextResponse.json(offers);
}

export async function POST(req: Request) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const body = await req.json();
  const parsed = offerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const job = await db.job.findUnique({
    where: { id: parsed.data.jobId },
  });
  if (!job || job.userId !== user.id) {
    return NextResponse.json({ error: "岗位不存在" }, { status: 400 });
  }

  const offer = await db.offer.create({
    data: {
      ...parsed.data,
      userId: user.id,
      benefits: parsed.data.benefits || null,
      notes: parsed.data.notes || null,
    },
  });

  await db.job.update({
    where: { id: parsed.data.jobId },
    data: { status: "OFFER" },
  });

  return NextResponse.json(offer, { status: 201 });
}
