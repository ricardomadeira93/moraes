import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { appointments, barbers, customers, services } from "@/lib/db/schema";
import { notifyShop } from "@/lib/push/webpush";
import { sendBookingConfirmationSMS } from "@/lib/sms/provider";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { normalizePhone } from "@/lib/utils/phone";

const bookingSchema = z.object({
  barberId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startsAt: z.string().datetime(),
  name: z.string().min(2),
  phone: z.string().min(8),
  source: z.enum(["online", "walk_in"]).default("online")
});

function isDoubleBookingError(error: unknown) {
  const code = (error as { code?: string })?.code;
  return code === "23P01" || code === "23505" || code === "40001";
}

export async function POST(req: NextRequest) {
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = checkRateLimit(`bookings:${clientIp}`, 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many booking attempts. Try again shortly." }, { status: 429 });
  }

  const body = bookingSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const { barberId, serviceId, startsAt, name, source } = body.data;

  let phone: string;
  try {
    phone = normalizePhone(body.data.phone);
  } catch {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  const service = await db.query.services.findFirst({ where: eq(services.id, serviceId) });
  if (!service) return NextResponse.json({ error: "service not found" }, { status: 404 });

  const shopId = service.shopId;

  const barber = await db.query.barbers.findFirst({
    where: and(eq(barbers.id, barberId), eq(barbers.shopId, shopId), eq(barbers.active, true))
  });
  if (!barber) return NextResponse.json({ error: "barber not found" }, { status: 404 });

  const start = new Date(startsAt);
  const end = new Date(start.getTime() + service.durationSlots * 30 * 60_000);

  try {
    const appointment = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${barberId}))`);

      const overlapRows = await tx.execute(sql`
        select id from appointments
        where shop_id = ${shopId}
          and barber_id = ${barberId}
          and status in ('scheduled','walk_in')
          and tstzrange(starts_at, ends_at, '[)') && tstzrange(${start}, ${end}, '[)')
        for update
        limit 1
      `);

      if ((overlapRows as { rows?: unknown[] }).rows?.length) {
        throw new Error("Selected slot is no longer available");
      }

      let customer = await tx.query.customers.findFirst({
        where: and(eq(customers.shopId, shopId), eq(customers.phone, phone))
      });

      if (!customer) {
        [customer] = await tx
          .insert(customers)
          .values({ shopId, name, phone })
          .onConflictDoUpdate({
            target: [customers.shopId, customers.phone],
            set: { name }
          })
          .returning();
      }

      const [created] = await tx
        .insert(appointments)
        .values({
          shopId,
          barberId,
          serviceId,
          customerId: customer.id,
          source,
          status: source === "walk_in" ? "walk_in" : "scheduled",
          startsAt: start,
          endsAt: end
        })
        .returning();

      return created;
    });

    console.info("booking_created", { shopId, barberId, source, startsAt: start.toISOString() });

    await notifyShop(shopId, {
      eventKey: `booking:${appointment.id}:created`,
      title: "Novo agendamento",
      body: `${name} às ${start.toISOString()}`
    });
    await sendBookingConfirmationSMS(phone);

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    if (isDoubleBookingError(error) || (error as Error)?.message === "Selected slot is no longer available") {
      return NextResponse.json({ error: "Selected slot is no longer available" }, { status: 409 });
    }

    console.error("booking_error", { barberId, serviceId, startsAt, message: (error as Error)?.message });
    return NextResponse.json({ error: "Booking error" }, { status: 500 });
  }
}
