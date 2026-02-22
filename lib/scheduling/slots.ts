import { and, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { appointments, availabilityRules, timeBlocks } from "@/lib/db/schema";
import {
  SAO_PAULO_OFFSET,
  AvailabilityData,
  AvailabilityInput,
  byWeekdayRanges,
  calculateAvailableStartTimes,
  eachDateISOInRange,
  DEFAULT_SLOT_MINUTES,
  dateAtMinute,
  intersectRanges
} from "./pure";

export {
  DEFAULT_SLOT_MINUTES,
  SAO_PAULO_OFFSET,
  calculateAvailableStartTimes,
  eachDateISOInRange,
  byWeekdayRanges,
  dateAtMinute,
  intersectRanges
};
export type { AvailabilityInput, AvailabilityData };

export async function getAvailabilityData(input: AvailabilityInput): Promise<AvailabilityData> {
  const days = eachDateISOInRange(input.range);
  const rangeStart = new Date(`${days[0]}T00:00:00${SAO_PAULO_OFFSET}`);
  const rangeEnd = new Date(`${days[days.length - 1]}T23:59:59${SAO_PAULO_OFFSET}`);

  const [shopRules, barberRules, booked, blocked] = await Promise.all([
    db
      .select({ weekday: availabilityRules.weekday, startMinute: availabilityRules.startMinute, endMinute: availabilityRules.endMinute })
      .from(availabilityRules)
      .where(and(eq(availabilityRules.shopId, input.shopId), isNull(availabilityRules.barberId))),
    db
      .select({ weekday: availabilityRules.weekday, startMinute: availabilityRules.startMinute, endMinute: availabilityRules.endMinute })
      .from(availabilityRules)
      .where(and(eq(availabilityRules.shopId, input.shopId), eq(availabilityRules.barberId, input.barberId))),
    db
      .select({ startsAt: appointments.startsAt, endsAt: appointments.endsAt })
      .from(appointments)
      .where(
        and(
          eq(appointments.shopId, input.shopId),
          eq(appointments.barberId, input.barberId),
          inArray(appointments.status, ["scheduled", "walk_in"]),
          lte(appointments.startsAt, rangeEnd),
          gte(appointments.endsAt, rangeStart)
        )
      ),
    db
      .select({ startsAt: timeBlocks.startsAt, endsAt: timeBlocks.endsAt })
      .from(timeBlocks)
      .where(
        and(
          eq(timeBlocks.shopId, input.shopId),
          or(eq(timeBlocks.barberId, input.barberId), isNull(timeBlocks.barberId)),
          lte(timeBlocks.startsAt, rangeEnd),
          gte(timeBlocks.endsAt, rangeStart)
        )
      )
  ]);

  return {
    shopRulesByWeekday: byWeekdayRanges(shopRules),
    barberRulesByWeekday: byWeekdayRanges(barberRules),
    blockedIntervals: blocked,
    bookedIntervals: booked
  };
}

export async function computeAvailableSlots(input: AvailabilityInput) {
  const data = await getAvailabilityData(input);
  const slots = calculateAvailableStartTimes(input, data);

  return {
    timezone: "America/Sao_Paulo",
    slotMinutes: input.slotMinutes ?? DEFAULT_SLOT_MINUTES,
    slots
  };
}
