"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { appointments, barbers, customers, services, timeBlocks } from "@/lib/db/schema";
import { requireAdminAccessPage } from "@/lib/auth/access";
import { notifyShop } from "@/lib/push/webpush";
import { sendCancellationSMS } from "@/lib/sms/provider";

const appointmentStatusSchema = z.enum(["scheduled", "walk_in", "canceled", "no_show", "completed"]);

export async function saveBarber(formData: FormData) {
  const { shopId } = await requireAdminAccessPage();
  const name = String(formData.get("name"));
  await db.insert(barbers).values({ shopId, name });
  revalidatePath("/admin/barbers");
}

export async function saveService(formData: FormData) {
  const { shopId } = await requireAdminAccessPage();
  const name = String(formData.get("name"));
  const durationSlots = Number(formData.get("durationSlots"));
  await db.insert(services).values({ shopId, name, durationSlots });
  revalidatePath("/admin/services");
}

export async function updateAppointmentStatus(formData: FormData) {
  const { shopId } = await requireAdminAccessPage();
  const id = String(formData.get("id"));
  const parsedStatus = appointmentStatusSchema.safeParse(String(formData.get("status")));
  if (!parsedStatus.success) return;

  const [updated] = await db
    .update(appointments)
    .set({ status: parsedStatus.data })
    .where(and(eq(appointments.id, id), eq(appointments.shopId, shopId)))
    .returning();

  if (updated && parsedStatus.data === "canceled") {
    const customer = await db.query.customers.findFirst({
      where: and(eq(customers.id, updated.customerId), eq(customers.shopId, shopId))
    });

    await notifyShop(shopId, {
      eventKey: `booking:${updated.id}:canceled`,
      title: "Agendamento cancelado",
      body: `Agendamento ${updated.id} foi cancelado.`
    });

    if (customer?.phone) {
      await sendCancellationSMS(customer.phone).catch((error) => {
        console.error("sms_cancellation_failed", { appointmentId: updated.id, message: (error as Error).message });
      });
    }
  }

  revalidatePath("/admin/appointments");
}

export async function createTimeBlock(formData: FormData) {
  const { shopId } = await requireAdminAccessPage();
  await db.insert(timeBlocks).values({
    shopId,
    barberId: String(formData.get("barberId")),
    reason: String(formData.get("reason")),
    startsAt: new Date(String(formData.get("startsAt"))),
    endsAt: new Date(String(formData.get("endsAt")))
  });
  revalidatePath("/admin/schedule");
}
