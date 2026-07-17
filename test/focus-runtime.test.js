"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { defaults } = require("../src/focus-data");
const { createFocusRuntime } = require("../src/focus-runtime");

test("stopwatch excludes paused time", () => {
  let clock = 1000;
  const data = defaults();
  const runtime = createFocusRuntime({ data, now: () => clock, persist: () => {} });
  const activity = runtime.addActivity({ name: "AI programming" }).activity;
  runtime.start({ activityId: activity.id, mode: "stopwatch" });
  clock += 5000;
  runtime.pause();
  clock += 20000;
  runtime.resume();
  clock += 3000;
  const result = runtime.finish();
  assert.equal(result.entry.durationMs, 8000);
  runtime.dispose();
});

test("Pomodoro duration is adjustable and completion starts a break paused", () => {
  let clock = 1000;
  const data = defaults();
  const runtime = createFocusRuntime({ data, now: () => clock, persist: () => {} });
  const activity = runtime.addActivity({ name: "Study" }).activity;
  runtime.start({ activityId: activity.id, mode: "pomodoro", durationMs: 10 * 60 * 1000 });
  clock += 10 * 60 * 1000;
  const result = runtime.completePhase();
  assert.equal(result.completedPhase, "focus");
  assert.equal(result.nextPhase, "short-break");
  assert.equal(result.entry.durationMs, 10 * 60 * 1000);
  assert.equal(runtime.snapshot().active.status, "paused");
  runtime.dispose();
});

test("activity can be archived but not while its timer is active", () => {
  let clock = 1000;
  const data = defaults();
  const runtime = createFocusRuntime({ data, now: () => clock, persist: () => {} });
  const activity = runtime.addActivity({ name: "Video" }).activity;
  runtime.start({ activityId: activity.id, mode: "stopwatch" });
  assert.equal(runtime.archiveActivity({ activityId: activity.id }).status, "error");
  runtime.finish();
  clock += 1;
  assert.equal(runtime.archiveActivity({ activityId: activity.id }).status, "ok");
  assert.ok(runtime.snapshot().activities[0].archivedAt);
  runtime.dispose();
});

test("daily goal can be updated for an existing activity", () => {
  const data = defaults();
  const runtime = createFocusRuntime({ data, now: () => 1000, persist: () => {} });
  const activity = runtime.addActivity({ name: "Video", dailyTargetMs: 8 * 3600000 }).activity;
  const result = runtime.updateActivity({ activityId: activity.id, dailyTargetMs: 3.5 * 3600000 });
  assert.equal(result.status, "ok");
  assert.equal(runtime.snapshot().activities[0].dailyTargetMs, 3.5 * 3600000);
  runtime.dispose();
});
