import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth } from "@/lib/guard";

export async function GET(req: Request) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const events = await db.calendarEvent.findMany({
    where: {
      userId: user.id,
      ...(start && end
        ? {
            startAt: { gte: new Date(start) },
            endAt: { lte: new Date(end) },
          }
        : {}),
    },
    orderBy: { startAt: "asc" },
  });

  return NextResponse.json(events);
}

export async function POST(req: Request) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const { title, description, type, startAt, endAt, jobId } =
    await req.json();

  if (!title || !startAt || !endAt) {
    return NextResponse.json(
      { error: "请填写标题和时间" },
      { status: 400 }
    );
  }

  const event = await db.calendarEvent.create({
    data: {
      userId: user.id,
      title,
      description: description || null,
      type: type || "CUSTOM",
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      jobId: jobId || null,
    },
  });

  return NextResponse.json(event);
}
