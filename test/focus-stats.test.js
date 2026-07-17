"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { summarize } = require("../src/focus-stats");

test("focus stats split a cross-midnight entry between local days", () => {
  const noon = new Date(2026, 6, 17, 12).getTime();
  const start = new Date(2026, 6, 16, 23, 30).getTime();
  const end = new Date(2026, 6, 17, 0, 30).getTime();
  const stats = summarize({
    activities: [{ id: "a", name: "AI" }],
    entries: [{ id: "e", activityId: "a", startedAt: start, endedAt: end, durationMs: 3600000 }],
  }, noon);
  assert.equal(stats.activities.a.todayMs, 1800000);
  assert.equal(stats.activities.a.allTimeMs, 3600000);
});

