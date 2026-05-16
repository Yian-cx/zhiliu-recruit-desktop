import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guard";

export async function GET() {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const config = await db.aiConfig.findUnique({ where: { id: "default" } });
  if (!config) {
    return NextResponse.json({ apiKey: "", baseUrl: "", modelName: "", vipModelName: "" });
  }

  return NextResponse.json(config);
}

export async function POST(req: Request) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const { apiKey, baseUrl, modelName, vipModelName } = await req.json();

  const config = await db.aiConfig.upsert({
    where: { id: "default" },
    update: { apiKey, baseUrl, modelName, vipModelName },
    create: { id: "default", apiKey, baseUrl, modelName, vipModelName },
  });

  return NextResponse.json(config);
}
