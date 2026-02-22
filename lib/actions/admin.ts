"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { appointments, barbers, services, timeBlocks } from "@/lib/db/schema";
import { requireAdminAccessPage } from "@/lib/auth/access";

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
  const status = String(formData.get("status"));
  await db.update(appointments).set({ status }).where(and(eq(appointments.id, id), eq(appointments.shopId, shopId)));
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
