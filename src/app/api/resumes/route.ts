import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, checkResourceLimit } from "@/lib/guard";

export async function GET() {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const resumes = await db.resume.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    include: {
      _count: { select: { jobResumes: true } },
    },
  });

  return NextResponse.json(resumes);
}

export async function POST(req: Request) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const limit = await checkResourceLimit(user.id, user, "resumes");
  if (!limit.allowed) {
    return NextResponse.json({ error: limit.message }, { status: 429 });
  }

  const { name, content, isDefault } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "请输入简历名称" }, { status: 400 });
  }

  if (isDefault) {
    await db.resume.updateMany({
      where: { userId: user.id },
      data: { isDefault: false },
    });
  }

  const resume = await db.resume.create({
    data: {
      name,
      content: content || "",
      isDefault: isDefault || false,
      userId: user.id,
    },
  });

  return NextResponse.json(resume, { status: 201 });
}
