import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/guard";
import { db } from "@/lib/prisma";

export async function GET(req: Request) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const comparisons = await db.jobComparison.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      jobIds: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch job names for display
  const jobIdSet = new Set<string>();
  comparisons.forEach((c) => {
    (c.jobIds as string[]).forEach((id) => jobIdSet.add(id));
  });

  const jobs = await db.job.findMany({
    where: { id: { in: Array.from(jobIdSet) } },
    select: { id: true, company: true, title: true },
  });
  const jobMap = new Map(jobs.map((j) => [j.id, j]));

  return NextResponse.json(
    comparisons.map((c) => ({
      id: c.id,
      jobIds: c.jobIds,
      jobs: (c.jobIds as string[]).map((id) => jobMap.get(id) || { id, company: "?", title: "?" }),
      createdAt: c.createdAt,
    }))
  );
}
