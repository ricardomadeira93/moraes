import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminCalendarData } from "@/lib/calendar/admin-calendar";
import { requireAdminAccessApi } from "@/lib/auth/access";

const schema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceDurationMinutes: z.coerce.number().int().min(5).max(480).optional(),
  slotMinutes: z.coerce.number().int().min(5).max(60).optional()
});

export async function GET(req: NextRequest) {
  const authz = await requireAdminAccessApi();
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status });

  const parsed = schema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = await getAdminCalendarData({
    shopId: authz.access.shopId,
    range: { startDate: parsed.data.startDate, endDate: parsed.data.endDate },
    serviceDurationMinutes: parsed.data.serviceDurationMinutes,
    slotMinutes: parsed.data.slotMinutes
  });

  return NextResponse.json(data);
}
