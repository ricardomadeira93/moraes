import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { appointments } from "@/lib/db/schema";

export type MetricsRange = {
  startAt?: Date;
  endAt?: Date;
};

export type AppointmentMetrics = {
  online: number;
  walkIn: number;
  noShows: number;
  cancellations: number;
};

/**
 * Read-only aggregate query over appointments.
 * Uses shop/time predicates so it can leverage scheduling indexes and avoids impacting booking writes.
 */
export async function getAppointmentMetrics(shopId: string, range?: MetricsRange): Promise<AppointmentMetrics> {
  const predicates = [eq(appointments.shopId, shopId)];
  if (range?.startAt) predicates.push(gte(appointments.startsAt, range.startAt));
  if (range?.endAt) predicates.push(lte(appointments.startsAt, range.endAt));

  const rows = await db
    .select({
      online: sql<number>`count(*) filter (where ${appointments.source} = 'online')::int`,
      walkIn: sql<number>`count(*) filter (where ${appointments.source} = 'walk_in')::int`,
      noShows: sql<number>`count(*) filter (where ${appointments.status} = 'no_show')::int`,
      cancellations: sql<number>`count(*) filter (where ${appointments.status} = 'canceled')::int`
    })
    .from(appointments)
    .where(and(...predicates));

  const r = rows[0] ?? { online: 0, walkIn: 0, noShows: 0, cancellations: 0 };
  return { online: Number(r.online), walkIn: Number(r.walkIn), noShows: Number(r.noShows), cancellations: Number(r.cancellations) };
}
