import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth } from "@/lib/guard";

export async function GET(req: Request) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  const search = searchParams.get("search") || "";
  const paginate = searchParams.has("page");

  const where = {
    userId: user.id,
    ...(jobId ? { jobId } : {}),
    ...(search ? { content: { contains: search } } : {}),
  };

  if (paginate) {
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "10")));

    const [notes, total] = await Promise.all([
      db.jobNote.findMany({
        where,
        include: { job: { select: { company: true, title: true } } },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.jobNote.count({ where }),
    ]);

    return NextResponse.json({ notes, total, page, pageSize });
  }

  const notes = await db.jobNote.findMany({
    where,
    include: { job: { select: { company: true, title: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(notes);
}

export async function POST(req: Request) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const { jobId, content } = await req.json();

  if (!jobId) {
    return NextResponse.json({ error: "请选择岗位" }, { status: 400 });
  }

  const note = await db.jobNote.create({
    data: {
      userId: user.id,
      jobId,
      content: content || "",
    },
    include: { job: { select: { company: true, title: true } } },
  });

  return NextResponse.json(note);
}
