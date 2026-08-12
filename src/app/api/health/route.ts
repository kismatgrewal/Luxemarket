import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

// Always execute — a cached health check is worthless.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness/readiness probe. Confirms the process is up and can reach the
 * database, returning 200 when healthy and 503 when the DB is unreachable so
 * load balancers can pull the instance out of rotation.
 */
export async function GET() {
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      database: "up",
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        database: "down",
        error: err instanceof Error ? err.message : "Unknown database error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
