"use strict";

const { EventEmitter } = require("events");

const DEFAULTS = Object.freeze({
  focusMs: 25 * 60 * 1000,
  shortBreakMs: 5 * 60 * 1000,
  longBreakMs: 15 * 60 * 1000,
  longBreakEvery: 4,
  autoStartNextPhase: false,
});

function makeId(prefix, now) {
  return `${prefix}-${now.toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function elapsedFor(active, now) {
  if (!active) return 0;
  const base = Math.max(0, Number(active.accumulatedMs) || 0);
  if (active.status !== "running" || !Number.isFinite(active.startedAt)) return base;
  return base + Math.max(0, now - active.startedAt);
}

function createFocusRuntime(options = {}) {
  const now = options.now || (() => Date.now());
  const persist = options.persist || (() => {});
  const emitter = new EventEmitter();
  let data = options.data;
  let config = { ...DEFAULTS, ...(options.config || {}) };
  let tickTimer = null;

  function activityFor(id) {
    return data.activities.find((item) => item.id === id && !item.archivedAt) || null;
  }

  function snapshot() {
    const stamp = now();
    const active = data.active ? { ...data.active } : null;
    if (active) {
      active.elapsedMs = elapsedFor(active, stamp);
      active.remainingMs = active.mode === "pomodoro"
        ? Math.max(0, active.phaseDurationMs - active.elapsedMs)
        : null;
      active.activity = activityFor(active.activityId);
    }
    return { activities: data.activities.map((item) => ({ ...item })), active, config: { ...config } };
  }

  function emit() {
    const value = snapshot();
    emitter.emit("change", value);
    return value;
  }

  function commit() {
    persist(data);
    return emit();
  }

  function stopTicker() {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = null;
  }

  function startTicker() {
    stopTicker();
    if (!data.active || data.active.status !== "running") return;
    tickTimer = setInterval(() => {
      const active = data.active;
      if (!active || active.status !== "running") return stopTicker();
      if (active.mode === "pomodoro" && elapsedFor(active, now()) >= active.phaseDurationMs) {
        completePhase();
      } else {
        emit();
      }
    }, 1000);
  }

  function addActivity(input) {
    const name = input && typeof input.name === "string" ? input.name.trim() : "";
    if (!name) return { status: "error", message: "Activity name is required" };
    const stamp = now();
    const activity = {
      id: makeId("activity", stamp),
      name: name.slice(0, 80),
      color: input.color || "#e85d3f",
      dailyTargetMs: Math.max(0, Math.floor(Number(input.dailyTargetMs) || 0)),
      weeklyTargetMs: Math.max(0, Math.floor(Number(input.weeklyTargetMs) || 0)),
      remindersEnabled: input.remindersEnabled === true,
      createdAt: stamp,
      archivedAt: null,
    };
    data.activities.push(activity);
    commit();
    return { status: "ok", activity };
  }

  function archiveActivity(input = {}) {
    const activityId = typeof input.activityId === "string" ? input.activityId : "";
    const activity = data.activities.find((item) => item.id === activityId && !item.archivedAt);
    if (!activity) return { status: "error", message: "Activity not found" };
    if (data.active && data.active.activityId === activityId) {
      return { status: "error", message: "Finish the active timer before deleting this activity" };
    }
    activity.archivedAt = now();
    commit();
    return { status: "ok", activityId };
  }

  function updateActivity(input = {}) {
    const activityId = typeof input.activityId === "string" ? input.activityId : "";
    const activity = data.activities.find((item) => item.id === activityId && !item.archivedAt);
    if (!activity) return { status: "error", message: "Activity not found" };
    if (input.dailyTargetMs !== undefined) {
      activity.dailyTargetMs = Math.max(0, Math.floor(Number(input.dailyTargetMs) || 0));
    }
    commit();
    return { status: "ok", activity: { ...activity } };
  }

  function start(input = {}) {
    if (data.active) return { status: "error", message: "A focus timer is already active" };
    const activity = activityFor(input.activityId);
    if (!activity) return { status: "error", message: "Choose an activity first" };
    const stamp = now();
    const mode = input.mode === "pomodoro" ? "pomodoro" : "stopwatch";
    const duration = Math.max(60_000, Math.floor(Number(input.durationMs) || config.focusMs));
    data.active = {
      activityId: activity.id,
      mode,
      phase: "focus",
      status: "running",
      accumulatedMs: 0,
      phaseDurationMs: duration,
      startedAt: stamp,
      phaseStartedAt: stamp,
      completedFocusPhases: 0,
      recovered: false,
    };
    commit();
    startTicker();
    return { status: "ok", snapshot: snapshot() };
  }

  function pause(reason = "user") {
    const active = data.active;
    if (!active || active.status !== "running") return { status: "error", message: "No running focus timer" };
    active.accumulatedMs = elapsedFor(active, now());
    active.startedAt = null;
    active.status = "paused";
    active.pauseReason = reason;
    stopTicker();
    commit();
    return { status: "ok" };
  }

  function resume() {
    const active = data.active;
    if (!active || active.status !== "paused") return { status: "error", message: "No paused focus timer" };
    active.startedAt = now();
    active.status = "running";
    active.pauseReason = null;
    active.recovered = false;
    commit();
    startTicker();
    return { status: "ok" };
  }

  function recordFocus(active, endedAt, completedPomodoro) {
    const durationMs = Math.max(0, elapsedFor(active, endedAt));
    if (active.phase !== "focus" || durationMs <= 0) return null;
    const entry = {
      id: makeId("entry", endedAt),
      activityId: active.activityId,
      startedAt: Math.max(0, endedAt - durationMs),
      endedAt,
      durationMs,
      source: active.mode,
      completedPomodoro: completedPomodoro === true,
    };
    data.entries.push(entry);
    return entry;
  }

  function finish() {
    const active = data.active;
    if (!active) return { status: "error", message: "No focus timer" };
    const stamp = now();
    const entry = recordFocus(active, stamp, false);
    data.active = null;
    stopTicker();
    commit();
    return { status: "ok", entry };
  }

  function completePhase() {
    const active = data.active;
    if (!active || active.mode !== "pomodoro") return { status: "error", message: "No Pomodoro phase" };
    const stamp = now();
    const completedPhase = active.phase;
    let entry = null;
    if (completedPhase === "focus") {
      active.accumulatedMs = active.phaseDurationMs;
      active.startedAt = null;
      entry = recordFocus(active, stamp, true);
      active.completedFocusPhases += 1;
      const longBreak = active.completedFocusPhases % config.longBreakEvery === 0;
      active.phase = longBreak ? "long-break" : "short-break";
      active.phaseDurationMs = longBreak ? config.longBreakMs : config.shortBreakMs;
    } else {
      active.phase = "focus";
      active.phaseDurationMs = config.focusMs;
    }
    active.accumulatedMs = 0;
    active.phaseStartedAt = stamp;
    active.startedAt = config.autoStartNextPhase ? stamp : null;
    active.status = config.autoStartNextPhase ? "running" : "paused";
    commit();
    startTicker();
    emitter.emit("phase-complete", { completedPhase, nextPhase: active.phase, entry });
    return { status: "ok", completedPhase, nextPhase: active.phase, entry };
  }

  function updateConfig(partial = {}) {
    const next = { ...config };
    for (const key of ["focusMs", "shortBreakMs", "longBreakMs"]) {
      if (partial[key] !== undefined) next[key] = Math.max(60_000, Math.floor(Number(partial[key]) || next[key]));
    }
    if (partial.longBreakEvery !== undefined) next.longBreakEvery = Math.max(1, Math.min(12, Math.floor(Number(partial.longBreakEvery) || 4)));
    if (partial.autoStartNextPhase !== undefined) next.autoStartNextPhase = partial.autoStartNextPhase === true;
    config = next;
    return emit();
  }

  function dispose() { stopTicker(); emitter.removeAllListeners(); }
  function on(event, listener) { emitter.on(event, listener); return () => emitter.off(event, listener); }

  emit();
  return { snapshot, addActivity, archiveActivity, updateActivity, start, pause, resume, finish, completePhase, updateConfig, on, dispose };
}

module.exports = { DEFAULTS, elapsedFor, createFocusRuntime };
