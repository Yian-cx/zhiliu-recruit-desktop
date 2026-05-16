import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/guard";
import { db } from "@/lib/prisma";

export async function GET(req: Request) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const comparisons = await db.offerComparison.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      offerIds: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch offer names for display
  const offerIdSet = new Set<string>();
  comparisons.forEach((c) => {
    (c.offerIds as string[]).forEach((id) => offerIdSet.add(id));
  });

  const offers = await db.offer.findMany({
    where: { id: { in: Array.from(offerIdSet) } },
    select: { id: true, company: true, title: true },
  });
  const offerMap = new Map(offers.map((o) => [o.id, o]));

  return NextResponse.json(
    comparisons.map((c) => ({
      id: c.id,
      offerIds: c.offerIds,
      offers: (c.offerIds as string[]).map((id) => offerMap.get(id) || { id, company: "?", title: "?" }),
      createdAt: c.createdAt,
    }))
  );
}
