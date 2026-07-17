"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { findNewGoal, findDueReminder } = require("../src/focus-goals");

function fixture() {
  return {
    activities: [{ id: "ai", name: "AI programming", dailyTargetMs: 8 * 3600000, remindersEnabled: true, archivedAt: null }],
    celebrations: {}, reminderSkips: {}, reminderLastShown: {},
  };
}

test("daily goal celebrates once", () => {
  const now = new Date(2026, 6, 17, 20).getTime();
  const data = fixture();
  const stats = { activities: { ai: { todayMs: 8 * 3600000 } } };
  const first = findNewGoal(data, stats, now);
  assert.equal(first.activity.id, "ai");
  data.celebrations[first.key] = true;
  assert.equal(findNewGoal(data, stats, now), null);
});

test("reminder is due at configured hour only while below target", () => {
  const data = fixture();
  const stats = { activities: { ai: { todayMs: 3 * 3600000 } } };
  const noon = new Date(2026, 6, 17, 12).getTime();
  assert.equal(findDueReminder(data, stats, { now: noon }).remainingMs, 5 * 3600000);
  assert.equal(findDueReminder(data, stats, { now: noon, active: true }), null);
  assert.equal(findDueReminder(data, stats, { now: new Date(2026, 6, 17, 13).getTime() }), null);
});

