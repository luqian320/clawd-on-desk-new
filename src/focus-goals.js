"use strict";

const REMINDER_HOURS = Object.freeze([12, 18, 21]);
const REMINDER_COOLDOWN_MS = 90 * 60 * 1000;

function localDateKey(stamp) {
  const date = new Date(stamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function celebrationKey(activityId, stamp) {
  return `${localDateKey(stamp)}|${activityId}`;
}

function findNewGoal(data, stats, stamp = Date.now()) {
  for (const activity of data.activities || []) {
    if (activity.archivedAt || !(activity.dailyTargetMs > 0)) continue;
    const bucket = stats.activities && stats.activities[activity.id];
    if (!bucket || bucket.todayMs < activity.dailyTargetMs) continue;
    const key = celebrationKey(activity.id, stamp);
    if (!data.celebrations[key]) return { activity, key, todayMs: bucket.todayMs };
  }
  return null;
}

function findDueReminder(data, stats, options = {}) {
  const stamp = Number.isFinite(options.now) ? options.now : Date.now();
  if (options.active || options.doNotDisturb) return null;
  const date = new Date(stamp);
  if (!REMINDER_HOURS.includes(date.getHours())) return null;
  const dateKey = localDateKey(stamp);
  for (const activity of data.activities || []) {
    if (activity.archivedAt || !activity.remindersEnabled || !(activity.dailyTargetMs > 0)) continue;
    const bucket = stats.activities && stats.activities[activity.id];
    const todayMs = bucket ? bucket.todayMs : 0;
    if (todayMs >= activity.dailyTargetMs) continue;
    const key = `${dateKey}|${activity.id}`;
    if (data.reminderSkips[key] === true) continue;
    const lastShown = Number(data.reminderLastShown && data.reminderLastShown[key]) || 0;
    if (stamp - lastShown < REMINDER_COOLDOWN_MS) continue;
    return { activity, key, todayMs, remainingMs: activity.dailyTargetMs - todayMs };
  }
  return null;
}

module.exports = {
  REMINDER_HOURS,
  REMINDER_COOLDOWN_MS,
  localDateKey,
  celebrationKey,
  findNewGoal,
  findDueReminder,
};

