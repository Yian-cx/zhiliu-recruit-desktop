import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/guard";
import { db } from "@/lib/prisma";

export async function GET() {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const conversations = await db.coachConversation.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json(conversations);
}

export async function POST(req: Request) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const { title } = await req.json();

  const conversation = await db.coachConversation.create({
    data: {
      userId: user.id,
      title: title || "新对话",
    },
  });

  return NextResponse.json(conversation);
}
