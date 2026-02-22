import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccessApi } from "@/lib/auth/access";
import { getAppointmentMetrics } from "@/lib/metrics/appointments";

const schema = z.object({
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional()
});

export async function GET(req: NextRequest) {
  const authz = await requireAdminAccessApi();
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status });

  const parsed = schema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const metrics = await getAppointmentMetrics(authz.access.shopId, {
    startAt: parsed.data.startAt ? new Date(parsed.data.startAt) : undefined,
    endAt: parsed.data.endAt ? new Date(parsed.data.endAt) : undefined
  });

  return NextResponse.json({
    shopId: authz.access.shopId,
    range: { startAt: parsed.data.startAt ?? null, endAt: parsed.data.endAt ?? null },
    metrics
  });
}
