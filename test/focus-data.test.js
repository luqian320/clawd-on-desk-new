"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { normalize } = require("../src/focus-data");

test("focus data drops invalid activities and orphan entries", () => {
  const data = normalize({
    activities: [{ id: "a", name: "AI programming", createdAt: 10 }, { id: "", name: "bad" }],
    entries: [
      { id: "e", activityId: "a", startedAt: 10, endedAt: 20, durationMs: 10 },
      { id: "orphan", activityId: "missing", startedAt: 10, endedAt: 20, durationMs: 10 },
    ],
  });
  assert.equal(data.activities.length, 1);
  assert.equal(data.entries.length, 1);
});

test("active running timer loads paused for safe recovery", () => {
  const data = normalize({
    activities: [{ id: "a", name: "AI programming", createdAt: 10 }],
    active: { activityId: "a", mode: "pomodoro", phase: "focus", status: "running", startedAt: 100, accumulatedMs: 500 },
  });
  assert.equal(data.active.status, "paused");
  assert.equal(data.active.startedAt, null);
  assert.equal(data.active.recovered, true);
});

