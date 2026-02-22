import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { computeAvailableSlots } from "@/lib/scheduling/slots";

const schema = z.object({
  shopId: z.string().uuid(),
  barberId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceDurationMinutes: z.coerce.number().int().min(30).max(480),
  slotMinutes: z.coerce.number().int().min(5).max(60).optional()
});

export async function GET(req: NextRequest) {
  const parsed = schema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await computeAvailableSlots({
    shopId: parsed.data.shopId,
    barberId: parsed.data.barberId,
    range: { startDate: parsed.data.startDate, endDate: parsed.data.endDate },
    serviceDurationMinutes: parsed.data.serviceDurationMinutes,
    slotMinutes: parsed.data.slotMinutes
  });

  return NextResponse.json(result);
}
