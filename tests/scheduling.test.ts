import test from "node:test";
import assert from "node:assert/strict";
import {
  byWeekdayRanges,
  calculateAvailableStartTimes,
  type AvailabilityData,
  type AvailabilityInput
} from "../lib/scheduling/pure.ts";

function baseInput(overrides: Partial<AvailabilityInput> = {}): AvailabilityInput {
  return {
    shopId: "00000000-0000-0000-0000-000000000001",
    barberId: "00000000-0000-0000-0000-000000000002",
    range: { startDate: "2026-03-02", endDate: "2026-03-02" },
    serviceDurationMinutes: 60,
    slotMinutes: 30,
    ...overrides
  };
}

function baseData(): AvailabilityData {
  return {
    shopRulesByWeekday: byWeekdayRanges([{ weekday: 1, startMinute: 9 * 60, endMinute: 12 * 60 }]),
    barberRulesByWeekday: byWeekdayRanges([{ weekday: 1, startMinute: 9 * 60, endMinute: 12 * 60 }]),
    blockedIntervals: [],
    bookedIntervals: []
  };
}

test("deterministic output for same input", () => {
  const input = baseInput();
  const data = baseData();
  const first = calculateAvailableStartTimes(input, data);
  const second = calculateAvailableStartTimes(input, data);
  assert.deepEqual(first, second);
});

test("service duration must fit contiguous slots", () => {
  const slots = calculateAvailableStartTimes(baseInput({ serviceDurationMinutes: 90 }), baseData());
  assert.equal(slots.length, 4);
  assert.equal(slots[0], "2026-03-02T12:00:00.000Z");
  assert.equal(slots.at(-1), "2026-03-02T13:30:00.000Z");
});

test("time blocks override availability", () => {
  const data = baseData();
  data.blockedIntervals.push({
    startsAt: new Date("2026-03-02T12:30:00.000Z"),
    endsAt: new Date("2026-03-02T13:30:00.000Z")
  });

  const slots = calculateAvailableStartTimes(baseInput(), data);
  assert.deepEqual(slots, ["2026-03-02T13:30:00.000Z", "2026-03-02T14:00:00.000Z"]);
});

test("booked appointments remove overlapping starts", () => {
  const data = baseData();
  data.bookedIntervals.push({
    startsAt: new Date("2026-03-02T13:00:00.000Z"),
    endsAt: new Date("2026-03-02T14:00:00.000Z")
  });

  const slots = calculateAvailableStartTimes(baseInput(), data);
  assert.deepEqual(slots, ["2026-03-02T12:00:00.000Z", "2026-03-02T14:00:00.000Z"]);
});

test("timezone sanity uses Sao Paulo offset baseline", () => {
  const slots = calculateAvailableStartTimes(baseInput({ serviceDurationMinutes: 30 }), baseData());
  assert.equal(slots[0], "2026-03-02T12:00:00.000Z");
});
