"use strict";

const fs = require("fs");
const path = require("path");

const DATA_VERSION = 1;

function defaults() {
  return {
    version: DATA_VERSION,
    activities: [],
    entries: [],
    active: null,
    celebrations: {},
    reminderSkips: {},
    reminderLastShown: {},
  };
}

function finiteTime(value) {
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

function normalizeActivity(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!id || !name) return null;
  return {
    id,
    name: name.slice(0, 80),
    color: typeof raw.color === "string" ? raw.color.slice(0, 20) : "#e85d3f",
    dailyTargetMs: finiteTime(raw.dailyTargetMs) || 0,
    weeklyTargetMs: finiteTime(raw.weeklyTargetMs) || 0,
    remindersEnabled: raw.remindersEnabled === true,
    createdAt: finiteTime(raw.createdAt) || Date.now(),
    archivedAt: finiteTime(raw.archivedAt),
  };
}

function normalizeEntry(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const activityId = typeof raw.activityId === "string" ? raw.activityId.trim() : "";
  const startedAt = finiteTime(raw.startedAt);
  const endedAt = finiteTime(raw.endedAt);
  const durationMs = finiteTime(raw.durationMs);
  if (!id || !activityId || startedAt === null || endedAt === null || durationMs === null) return null;
  if (endedAt < startedAt) return null;
  return {
    id,
    activityId,
    startedAt,
    endedAt,
    durationMs: Math.min(durationMs, endedAt - startedAt),
    source: raw.source === "pomodoro" ? "pomodoro" : "stopwatch",
    completedPomodoro: raw.completedPomodoro === true,
  };
}

function normalizeActive(raw) {
  if (!raw || typeof raw !== "object") return null;
  const activityId = typeof raw.activityId === "string" ? raw.activityId.trim() : "";
  if (!activityId) return null;
  const mode = raw.mode === "pomodoro" ? "pomodoro" : "stopwatch";
  const phase = raw.phase === "short-break" || raw.phase === "long-break" ? raw.phase : "focus";
  return {
    activityId,
    mode,
    phase,
    status: raw.status === "running" ? "paused" : "paused",
    accumulatedMs: finiteTime(raw.accumulatedMs) || 0,
    phaseDurationMs: finiteTime(raw.phaseDurationMs) || 25 * 60 * 1000,
    startedAt: null,
    phaseStartedAt: finiteTime(raw.phaseStartedAt),
    completedFocusPhases: Math.max(0, Math.floor(Number(raw.completedFocusPhases) || 0)),
    recovered: true,
  };
}

function normalize(raw) {
  const out = defaults();
  if (!raw || typeof raw !== "object") return out;
  const ids = new Set();
  for (const item of Array.isArray(raw.activities) ? raw.activities : []) {
    const activity = normalizeActivity(item);
    if (!activity || ids.has(activity.id)) continue;
    ids.add(activity.id);
    out.activities.push(activity);
  }
  const entryIds = new Set();
  for (const item of Array.isArray(raw.entries) ? raw.entries : []) {
    const entry = normalizeEntry(item);
    if (!entry || !ids.has(entry.activityId) || entryIds.has(entry.id)) continue;
    entryIds.add(entry.id);
    out.entries.push(entry);
  }
  const active = normalizeActive(raw.active);
  out.active = active && ids.has(active.activityId) ? active : null;
  out.celebrations = raw.celebrations && typeof raw.celebrations === "object" ? { ...raw.celebrations } : {};
  out.reminderSkips = raw.reminderSkips && typeof raw.reminderSkips === "object" ? { ...raw.reminderSkips } : {};
  out.reminderLastShown = raw.reminderLastShown && typeof raw.reminderLastShown === "object" ? { ...raw.reminderLastShown } : {};
  return out;
}

function load(filePath, deps = {}) {
  const io = deps.fs || fs;
  try {
    return normalize(JSON.parse(io.readFileSync(filePath, "utf8")));
  } catch (err) {
    if (err && err.code === "ENOENT") return defaults();
    try { io.copyFileSync(filePath, `${filePath}.corrupt-${Date.now()}`); } catch {}
    return defaults();
  }
}

function save(filePath, data, deps = {}) {
  const io = deps.fs || fs;
  const clean = normalize(data);
  const dir = path.dirname(filePath);
  const tempPath = `${filePath}.tmp`;
  io.mkdirSync(dir, { recursive: true });
  try { if (io.existsSync(filePath)) io.copyFileSync(filePath, `${filePath}.bak`); } catch {}
  io.writeFileSync(tempPath, `${JSON.stringify(clean, null, 2)}\n`, "utf8");
  io.renameSync(tempPath, filePath);
  return clean;
}

module.exports = { DATA_VERSION, defaults, normalize, load, save };
