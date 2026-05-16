import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { jobSchema } from "@/lib/validations";
import { requireAuth, checkResourceLimit } from "@/lib/guard";

export async function GET(req: Request) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const favorite = searchParams.get("favorite");
  const search = searchParams.get("search");

  const where: any = { userId: user.id };

  if (status) where.status = status;
  if (favorite === "true") where.isFavorite = true;
  if (search) {
    where.OR = [
      { company: { contains: search, mode: "insensitive" } },
      { title: { contains: search, mode: "insensitive" } },
      { jd: { contains: search, mode: "insensitive" } },
    ];
  }

  const jobs = await db.job.findMany({
    where,
    orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json(jobs);
}

export async function POST(req: Request) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const limit = await checkResourceLimit(user.id, user, "jobs");
  if (!limit.allowed) {
    return NextResponse.json({ error: limit.message }, { status: 429 });
  }

  const body = await req.json();
  // Normalize null → undefined for optional fields
  const data = {
    ...body,
    salaryMin: body.salaryMin ?? undefined,
    salaryMax: body.salaryMax ?? undefined,
    location: body.location ?? undefined,
    sourceUrl: body.sourceUrl ?? undefined,
  };
  const parsed = jobSchema.safeParse(data);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const job = await db.job.create({
    data: {
      ...parsed.data,
      status: parsed.data.status as any,
      salaryMin: parsed.data.salaryMin || null,
      salaryMax: parsed.data.salaryMax || null,
      sourceUrl: parsed.data.sourceUrl || null,
      userId: user.id,
    },
  });

  return NextResponse.json(job, { status: 201 });
}

export async function DELETE(req: Request) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const { ids } = await req.json();

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "请提供要删除的岗位 ID" }, { status: 400 });
  }

  const result = await db.job.deleteMany({
    where: {
      id: { in: ids },
      userId: user.id,
    },
  });

  return NextResponse.json({ deleted: result.count });
}
