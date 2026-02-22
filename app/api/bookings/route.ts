import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, DEFAULT_SHOP_ID } from "@/lib/db/client";
import { appointments, customers, services } from "@/lib/db/schema";
import { notifyShop } from "@/lib/push/webpush";
import { smsProvider } from "@/lib/sms/provider";

const bookingSchema = z.object({
  barberId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startsAt: z.string().datetime(),
  name: z.string().min(2),
  phone: z.string().min(8),
  source: z.enum(["online", "walk_in"]).default("online")
});

export async function POST(req: NextRequest) {
  const body = bookingSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const { barberId, serviceId, startsAt, name, phone, source } = body.data;

  const service = await db.query.services.findFirst({ where: and(eq(services.id, serviceId), eq(services.shopId, DEFAULT_SHOP_ID)) });
  if (!service) return NextResponse.json({ error: "service not found" }, { status: 404 });

  const start = new Date(startsAt);
  const end = new Date(start.getTime() + service.durationSlots * 30 * 60_000);

  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${barberId}))`);

    const overlapping = await tx.execute(sql`
      select id from appointments
      where barber_id = ${barberId}
      and status in ('scheduled','walk_in')
      and tsrange(starts_at, ends_at, '[)') && tsrange(${start}, ${end}, '[)')
      limit 1
    `);

    if ((overlapping as any).rows?.length) {
      throw new Error("Selected slot is no longer available");
    }

    let customer = await tx.query.customers.findFirst({ where: and(eq(customers.shopId, DEFAULT_SHOP_ID), eq(customers.phone, phone)) });
    if (!customer) {
      [customer] = await tx.insert(customers).values({ shopId: DEFAULT_SHOP_ID, name, phone }).returning();
    }

    const [appointment] = await tx.insert(appointments).values({
      shopId: DEFAULT_SHOP_ID,
      barberId,
      serviceId,
      customerId: customer.id,
      source,
      status: source === "walk_in" ? "walk_in" : "scheduled",
      startsAt: start,
      endsAt: end
    }).returning();

    return appointment;
  }).catch((e) => ({ error: e instanceof Error ? e.message : "Booking error" }));

  if ((result as any).error) return NextResponse.json(result, { status: 409 });

  await notifyShop(DEFAULT_SHOP_ID, { title: "Novo agendamento", body: `${name} às ${start.toISOString()}` });
  await smsProvider.sendSMS({ to: phone, type: "booking_confirmation", message: "Seu horário foi confirmado." });

  return NextResponse.json(result, { status: 201 });
}
