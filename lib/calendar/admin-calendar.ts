import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { appointments, availabilityRules, barbers, timeBlocks } from "@/lib/db/schema";
import {
  SAO_PAULO_OFFSET,
  eachDateISOInRange,
  byWeekdayRanges,
  intersectRanges,
  dateAtMinute,
  calculateAvailableStartTimes,
  DEFAULT_SLOT_MINUTES,
  type DateRangeInput,
  type MinuteRange
} from "@/lib/scheduling/slots";

export type AdminCalendarInput = {
  shopId: string;
  range: DateRangeInput;
  serviceDurationMinutes?: number;
  slotMinutes?: number;
};

function rangeBounds(range: DateRangeInput) {
  const days = eachDateISOInRange(range);
  return {
    days,
    rangeStart: new Date(`${days[0]}T00:00:00${SAO_PAULO_OFFSET}`),
    rangeEnd: new Date(`${days[days.length - 1]}T23:59:59${SAO_PAULO_OFFSET}`)
  };
}

function serializeWindows(days: string[], windowsByWeekday: Map<number, MinuteRange[]>) {
  return days.flatMap((dayISO) => {
    const weekday = new Date(`${dayISO}T00:00:00${SAO_PAULO_OFFSET}`).getDay();
    const windows = windowsByWeekday.get(weekday) ?? [];
    return windows.map((w) => ({
      startsAt: dateAtMinute(dayISO, w.startMinute).toISOString(),
      endsAt: dateAtMinute(dayISO, w.endMinute).toISOString(),
      startMinute: w.startMinute,
      endMinute: w.endMinute
    }));
  });
}

export async function getAdminCalendarData(input: AdminCalendarInput) {
  const slotMinutes = input.slotMinutes ?? DEFAULT_SLOT_MINUTES;
  const serviceDurationMinutes = input.serviceDurationMinutes ?? slotMinutes;
  const { rangeStart, rangeEnd, days } = rangeBounds(input.range);

  const [barberRows, appointmentRows, blockRows, shopRuleRows] = await Promise.all([
    db.select({ id: barbers.id, name: barbers.name, active: barbers.active }).from(barbers).where(eq(barbers.shopId, input.shopId)),
    db
      .select()
      .from(appointments)
      .where(and(eq(appointments.shopId, input.shopId), lte(appointments.startsAt, rangeEnd), gte(appointments.endsAt, rangeStart))),
    db
      .select()
      .from(timeBlocks)
      .where(and(eq(timeBlocks.shopId, input.shopId), lte(timeBlocks.startsAt, rangeEnd), gte(timeBlocks.endsAt, rangeStart))),
    db
      .select({ weekday: availabilityRules.weekday, startMinute: availabilityRules.startMinute, endMinute: availabilityRules.endMinute })
      .from(availabilityRules)
      .where(and(eq(availabilityRules.shopId, input.shopId), isNull(availabilityRules.barberId)))
  ]);

  const shopRulesByWeekday = byWeekdayRanges(shopRuleRows);

  const overlays = await Promise.all(
    barberRows.map(async (barber) => {
      const barberRuleRows = await db
        .select({ weekday: availabilityRules.weekday, startMinute: availabilityRules.startMinute, endMinute: availabilityRules.endMinute })
        .from(availabilityRules)
        .where(and(eq(availabilityRules.shopId, input.shopId), eq(availabilityRules.barberId, barber.id)));

      const barberRulesByWeekday = byWeekdayRanges(barberRuleRows);

      const workingWindowsByWeekday = new Map<number, MinuteRange[]>();
      for (let weekday = 0; weekday <= 6; weekday++) {
        workingWindowsByWeekday.set(
          weekday,
          intersectRanges(shopRulesByWeekday.get(weekday) ?? [], barberRulesByWeekday.get(weekday) ?? [])
        );
      }

      const blockedIntervals = blockRows
        .filter((b) => !b.barberId || b.barberId === barber.id)
        .map((b) => ({ startsAt: b.startsAt, endsAt: b.endsAt }));

      const bookedIntervals = appointmentRows
        .filter((a) => a.barberId === barber.id && (a.status === "scheduled" || a.status === "walk_in"))
        .map((a) => ({ startsAt: a.startsAt, endsAt: a.endsAt }));

      const availableStarts = calculateAvailableStartTimes(
        {
          shopId: input.shopId,
          barberId: barber.id,
          range: input.range,
          serviceDurationMinutes,
          slotMinutes
        },
        {
          shopRulesByWeekday,
          barberRulesByWeekday,
          blockedIntervals,
          bookedIntervals
        }
      );

      return {
        barberId: barber.id,
        barberName: barber.name,
        active: barber.active,
        workingWindows: serializeWindows(days, workingWindowsByWeekday),
        availableStarts,
        blockedWindows: blockedIntervals.map((x) => ({ startsAt: x.startsAt.toISOString(), endsAt: x.endsAt.toISOString() }))
      };
    })
  );

  return {
    timezone: "America/Sao_Paulo",
    slotMinutes,
    serviceDurationMinutes,
    range: input.range,
    appointments: appointmentRows.map((a) => ({
      id: a.id,
      barberId: a.barberId,
      serviceId: a.serviceId,
      customerId: a.customerId,
      status: a.status,
      source: a.source,
      startsAt: a.startsAt.toISOString(),
      endsAt: a.endsAt.toISOString(),
      notes: a.notes
    })),
    timeBlocks: blockRows.map((b) => ({
      id: b.id,
      barberId: b.barberId,
      reason: b.reason,
      startsAt: b.startsAt.toISOString(),
      endsAt: b.endsAt.toISOString()
    })),
    availabilityOverlays: overlays
  };
}
