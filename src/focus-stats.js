"use strict";

function startOfLocalDay(stamp) {
  const date = new Date(stamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function startOfLocalWeek(stamp, weekStartsOn = 1) {
  const start = startOfLocalDay(stamp);
  const day = new Date(start).getDay();
  const offset = (day - weekStartsOn + 7) % 7;
  const date = new Date(start);
  date.setDate(date.getDate() - offset);
  return date.getTime();
}

function overlapDuration(entry, rangeStart, rangeEnd) {
  if (!entry || entry.durationMs <= 0) return 0;
  const wallDuration = Math.max(1, entry.endedAt - entry.startedAt);
  const overlap = Math.max(0, Math.min(entry.endedAt, rangeEnd) - Math.max(entry.startedAt, rangeStart));
  return Math.min(entry.durationMs, Math.round(entry.durationMs * overlap / wallDuration));
}

function summarize(data, stamp = Date.now(), weekStartsOn = 1) {
  const dayStart = startOfLocalDay(stamp);
  const nextDay = new Date(dayStart); nextDay.setDate(nextDay.getDate() + 1);
  const weekStart = startOfLocalWeek(stamp, weekStartsOn);
  const nextWeek = new Date(weekStart); nextWeek.setDate(nextWeek.getDate() + 7);
  const activities = {};
  for (const activity of data.activities || []) {
    activities[activity.id] = { activity: { ...activity }, todayMs: 0, weekMs: 0, allTimeMs: 0, pomodoros: 0 };
  }
  for (const entry of data.entries || []) {
    const bucket = activities[entry.activityId];
    if (!bucket) continue;
    bucket.allTimeMs += Math.max(0, entry.durationMs || 0);
    bucket.todayMs += overlapDuration(entry, dayStart, nextDay.getTime());
    bucket.weekMs += overlapDuration(entry, weekStart, nextWeek.getTime());
    if (entry.completedPomodoro && entry.endedAt >= weekStart && entry.endedAt < nextWeek.getTime()) bucket.pomodoros += 1;
  }
  const values = Object.values(activities);
  return {
    dayStart,
    weekStart,
    activities,
    todayMs: values.reduce((sum, item) => sum + item.todayMs, 0),
    weekMs: values.reduce((sum, item) => sum + item.weekMs, 0),
    allTimeMs: values.reduce((sum, item) => sum + item.allTimeMs, 0),
  };
}

module.exports = { startOfLocalDay, startOfLocalWeek, overlapDuration, summarize };

