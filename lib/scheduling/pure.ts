export const DEFAULT_SLOT_MINUTES = 30;
export const SAO_PAULO_OFFSET = "-03:00";

export type DateRangeInput = {
  startDate: string;
  endDate: string;
};

export type AvailabilityInput = {
  shopId: string;
  barberId: string;
  range: DateRangeInput;
  serviceDurationMinutes: number;
  slotMinutes?: number;
};

export type MinuteRange = { startMinute: number; endMinute: number };
export type Interval = { startsAt: Date; endsAt: Date };

export type AvailabilityData = {
  shopRulesByWeekday: Map<number, MinuteRange[]>;
  barberRulesByWeekday: Map<number, MinuteRange[]>;
  blockedIntervals: Interval[];
  bookedIntervals: Interval[];
};

export function dateAtMinute(dateISO: string, minuteOfDay: number): Date {
  const hh = Math.floor(minuteOfDay / 60).toString().padStart(2, "0");
  const mm = (minuteOfDay % 60).toString().padStart(2, "0");
  return new Date(`${dateISO}T${hh}:${mm}:00${SAO_PAULO_OFFSET}`);
}

export function eachDateISOInRange({ startDate, endDate }: DateRangeInput): string[] {
  const out: string[] = [];
  let cursor = new Date(`${startDate}T00:00:00${SAO_PAULO_OFFSET}`);
  const end = new Date(`${endDate}T00:00:00${SAO_PAULO_OFFSET}`);
  while (cursor <= end) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
  return out;
}

export function byWeekdayRanges(rules: { weekday: number; startMinute: number; endMinute: number }[]) {
  const map = new Map<number, MinuteRange[]>();
  for (const r of rules) {
    const list = map.get(r.weekday) ?? [];
    list.push({ startMinute: r.startMinute, endMinute: r.endMinute });
    map.set(r.weekday, list);
  }
  for (const [k, v] of map) {
    v.sort((a, b) => a.startMinute - b.startMinute);
    map.set(k, v);
  }
  return map;
}

export function intersectRanges(base: MinuteRange[], overlay: MinuteRange[]): MinuteRange[] {
  const output: MinuteRange[] = [];
  for (const a of base) {
    for (const b of overlay) {
      const start = Math.max(a.startMinute, b.startMinute);
      const end = Math.min(a.endMinute, b.endMinute);
      if (start < end) output.push({ startMinute: start, endMinute: end });
    }
  }
  return output.sort((x, y) => x.startMinute - y.startMinute);
}

function overlaps(aStart: Date, aEnd: Date, b: Interval): boolean {
  return aStart < b.endsAt && aEnd > b.startsAt;
}

export function calculateAvailableStartTimes(input: AvailabilityInput, data: AvailabilityData): string[] {
  const slot = input.slotMinutes ?? DEFAULT_SLOT_MINUTES;
  const requiredSlots = Math.ceil(input.serviceDurationMinutes / slot);
  if (requiredSlots <= 0) return [];

  const available: string[] = [];
  const days = eachDateISOInRange(input.range);

  for (const dayISO of days) {
    const weekday = new Date(`${dayISO}T00:00:00${SAO_PAULO_OFFSET}`).getDay();
    const shopWindows = data.shopRulesByWeekday.get(weekday) ?? [];
    const barberWindows = data.barberRulesByWeekday.get(weekday) ?? [];
    const workingWindows = intersectRanges(shopWindows, barberWindows);

    for (const window of workingWindows) {
      for (let minute = window.startMinute; minute + requiredSlots * slot <= window.endMinute; minute += slot) {
        const start = dateAtMinute(dayISO, minute);
        const end = new Date(start.getTime() + requiredSlots * slot * 60_000);

        if (data.blockedIntervals.some((x) => overlaps(start, end, x))) continue;
        if (data.bookedIntervals.some((x) => overlaps(start, end, x))) continue;

        available.push(start.toISOString());
      }
    }
  }

  return available;
}
