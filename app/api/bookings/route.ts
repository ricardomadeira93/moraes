import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, DEFAULT_SHOP_ID } from "@/lib/db/client";
import { appointments, customers, services } from "@/lib/db/schema";
import { notifyShop } from "@/lib/push/webpush";
import { sendBookingConfirmationSMS } from "@/lib/sms/provider";

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
  const body = bookingSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const { barberId, serviceId, startsAt, name, phone, source } = body.data;

  const service = await db.query.services.findFirst({
    where: and(eq(services.id, serviceId), eq(services.shopId, DEFAULT_SHOP_ID))
  });
  if (!service) return NextResponse.json({ error: "service not found" }, { status: 404 });

  const start = new Date(startsAt);
  const end = new Date(start.getTime() + service.durationSlots * 30 * 60_000);

  try {
    const appointment = await db.transaction(async (tx) => {
      // App-level serialization by barber to reduce race windows and retries.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${barberId}))`);

      // App-level overlap guard with explicit locking read.
      const overlapRows = await tx.execute(sql`
        select id from appointments
        where shop_id = ${DEFAULT_SHOP_ID}
          and barber_id = ${barberId}
          and status in ('scheduled','walk_in')
          and tstzrange(starts_at, ends_at, '[)') && tstzrange(${start}, ${end}, '[)')
        for update
        limit 1
      `);

      if ((overlapRows as any).rows?.length) {
        throw new Error("Selected slot is no longer available");
      }

      let customer = await tx.query.customers.findFirst({
        where: and(eq(customers.shopId, DEFAULT_SHOP_ID), eq(customers.phone, phone))
      });

      if (!customer) {
        [customer] = await tx
          .insert(customers)
          .values({ shopId: DEFAULT_SHOP_ID, name, phone })
          .onConflictDoUpdate({
            target: [customers.shopId, customers.phone],
            set: { name }
          })
          .returning();
      }

      const [created] = await tx
        .insert(appointments)
        .values({
          shopId: DEFAULT_SHOP_ID,
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

    await notifyShop(DEFAULT_SHOP_ID, { title: "Novo agendamento", body: `${name} às ${start.toISOString()}` });
    await sendBookingConfirmationSMS(phone);

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    if (isDoubleBookingError(error) || (error as Error)?.message === "Selected slot is no longer available") {
      return NextResponse.json(
        { error: "Selected slot is no longer available" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "Booking error" }, { status: 500 });
  }
}
