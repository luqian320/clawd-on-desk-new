"use strict";

let snapshot = { activities: [], active: null, config: { focusMs: 1500000 } };
let expanded = false;
let creatingActivity = false;
let selectedActivityId = "";
let addPrompt = "";
let goalSaveTimer = null;
const $ = (id) => document.getElementById(id);

const COPY = {
  zh: {
    startFocus: "开始专注", pomodoro: "番茄钟", stopwatch: "正计时", paused: "已暂停",
    shortBreak: "短休息", longBreak: "长休息", choose: "选择你想投入时间的事情。",
    today: "今天", week: "本周", total: "累计", minPomodoro: "{n} 分钟番茄钟",
    goalDone: "今日目标完成，真棒！", continue: "继续 {name}", leftToday: "今天还差 {n} 小时",
    added: "已添加“{name}”，现在开始吗？", deleteConfirm: "删除“{name}”吗？历史记录会保留。",
    dailyGoal: "每日目标", goal: "目标", hours: "小时", hoursPerDay: "小时 / 天", minutes: "分钟",
    add: "添加", start: "开始", pause: "暂停", resume: "继续", finish: "结束", back: "返回",
    addActivity: "添加事项", deleteActivity: "删除事项", namePlaceholder: "例如：AI 编程",
  },
  en: {
    startFocus: "Start focus", pomodoro: "Pomodoro", stopwatch: "Stopwatch", paused: "Paused",
    shortBreak: "Short break", longBreak: "Long break", choose: "Choose what you want to make time for.",
    today: "Today", week: "Week", total: "Total", minPomodoro: "{n} min Pomodoro",
    goalDone: "Goal complete — great work!", continue: "Continue {name}", leftToday: "{n}h left today",
    added: "Added “{name}”. Start it now?", deleteConfirm: "Delete “{name}”? Its history will be kept.",
    dailyGoal: "Daily goal", goal: "Goal", hours: "hours", hoursPerDay: "h / day", minutes: "minutes",
    add: "Add", start: "Start", pause: "Pause", resume: "Resume", finish: "Finish", back: "Back",
    addActivity: "Add activity", deleteActivity: "Delete activity", namePlaceholder: "e.g. AI programming",
  },
};

function locale() { return snapshot.lang === "en" ? "en" : "zh"; }
function t(key, vars = {}) {
  let value = COPY[locale()][key] || COPY.zh[key] || key;
  for (const [name, replacement] of Object.entries(vars)) value = value.replace(`{${name}}`, replacement);
  return value;
}
function applyLanguage() {
  document.documentElement.lang = locale() === "zh" ? "zh-CN" : "en";
  $("cancelAdd").title = t("back"); $("cancelAdd").setAttribute("aria-label", t("back"));
  $("newName").placeholder = t("namePlaceholder");
  $("createGoalLabel").textContent = t("dailyGoal"); $("createGoalUnit").textContent = t("hours");
  $("goalLabel").textContent = t("goal"); $("goalUnit").textContent = t("hoursPerDay");
  $("minutesUnit").textContent = t("minutes"); $("add").textContent = t("add");
  $("start").textContent = t("start"); $("pause").textContent = t("pause");
  $("resume").textContent = t("resume"); $("finish").textContent = t("finish");
  $("newActivity").title = t("addActivity"); $("deleteActivity").title = t("deleteActivity");
  $("mode").options[0].textContent = t("pomodoro"); $("mode").options[1].textContent = t("stopwatch");
}

function show(id, visible) { $(id).classList.toggle("hidden", !visible); }
function format(ms, countdown = false) {
  const seconds = Math.max(0, countdown ? Math.ceil(ms / 1000) : Math.floor(ms / 1000));
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
function compactDuration(ms) {
  const minutes = Math.floor(Math.max(0, ms || 0) / 60000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (locale() === "zh") return hours ? `${hours}小时${rest}分钟` : `${rest}分钟`;
  return hours ? `${hours}h ${rest}m` : `${rest}m`;
}

function render(next) {
  snapshot = next || snapshot;
  applyLanguage();
  const active = snapshot.active;
  const hasActivities = snapshot.activities.some((item) => !item.archivedAt);
  const selectedId = active ? active.activityId : (selectedActivityId || $("activity").value);
  $("activity").innerHTML = "";
  for (const item of snapshot.activities.filter((value) => !value.archivedAt)) {
    const option = document.createElement("option"); option.value = item.id; option.textContent = item.name; $("activity").appendChild(option);
  }
  if (selectedId && [...$("activity").options].some((option) => option.value === selectedId)) {
    $("activity").value = selectedId;
    selectedActivityId = selectedId;
  } else if ($("activity").value) {
    selectedActivityId = $("activity").value;
  }
  const stats = snapshot.stats && snapshot.stats.activities
    ? snapshot.stats.activities[active ? active.activityId : $("activity").value]
    : null;
  const selectedActivity = snapshot.activities.find((item) => item.id === (active ? active.activityId : $("activity").value));
  if (selectedActivity && document.activeElement !== $("goalHours")) {
    $("goalHours").value = String((selectedActivity.dailyTargetMs || 0) / 3600000);
  }
  if (addPrompt && !active) {
    $("hint").textContent = addPrompt;
  } else if (stats) {
    const target = stats.activity.dailyTargetMs > 0 ? ` / ${compactDuration(stats.activity.dailyTargetMs)}` : "";
    $("hint").textContent = `${t("today")} ${compactDuration(stats.todayMs)}${target} · ${t("week")} ${compactDuration(stats.weekMs)} · ${t("total")} ${compactDuration(stats.allTimeMs)}`;
  } else {
    $("hint").textContent = t("choose");
  }
  show("createRow", (!hasActivities || creatingActivity) && !active);
  show("pickRow", hasActivities && !active && !creatingActivity);
  show("goalRow", hasActivities && !active && !creatingActivity);
  show("durationRow", hasActivities && !active && !creatingActivity && $("mode").value === "pomodoro");
  show("start", hasActivities && !active && !creatingActivity);
  show("pause", !!active && active.status === "running");
  show("resume", !!active && active.status === "paused");
  show("finish", !!active);
  show("time", !!active);
  if (!active) {
    $("label").textContent = t("startFocus");
    if (snapshot.notice && snapshot.notice.type === "goal") {
      $("label").textContent = t("goalDone");
      $("sub").textContent = snapshot.notice.activityName;
    } else if (snapshot.notice && snapshot.notice.type === "reminder") {
      $("label").textContent = t("continue", { name: snapshot.notice.activityName });
      $("sub").textContent = t("leftToday", { n: Math.ceil(snapshot.notice.remainingMs / 3600000 * 10) / 10 });
    } else {
      $("sub").textContent = t("minPomodoro", { n: Math.round((snapshot.config.focusMs || 1500000) / 60000) });
    }
    $("rail").style.setProperty("--progress", 1);
    return;
  }
  const phaseLabel = active.phase === "focus" ? active.activity.name : (active.phase === "long-break" ? t("longBreak") : t("shortBreak"));
  $("label").textContent = phaseLabel;
  $("sub").textContent = active.status === "paused" ? t("paused") : (active.mode === "pomodoro" ? t("pomodoro") : t("stopwatch"));
  $("time").textContent = format(active.mode === "pomodoro" ? active.remainingMs : active.elapsedMs, active.mode === "pomodoro");
  const progress = active.mode === "pomodoro" ? active.remainingMs / active.phaseDurationMs : 1;
  $("rail").style.setProperty("--progress", Math.max(0, Math.min(1, progress)));
}

$("summary").addEventListener("click", async () => {
  expanded = !expanded; $("card").classList.toggle("expanded", expanded); $("summary").setAttribute("aria-expanded", String(expanded));
  await window.focusHudAPI.setExpanded(expanded);
});
$("mode").addEventListener("change", () => render(snapshot));
$("activity").addEventListener("change", () => { selectedActivityId = $("activity").value; addPrompt = ""; render(snapshot); });
$("newActivity").addEventListener("click", () => { creatingActivity = true; render(snapshot); $("newName").focus(); });
$("cancelAdd").addEventListener("click", () => {
  creatingActivity = false; $("newName").value = ""; addPrompt = ""; render(snapshot);
});
$("add").addEventListener("click", async () => {
  const name = $("newName").value.trim(); if (!name) return $("newName").focus();
  const result = await window.focusHudAPI.addActivity({ name, dailyTargetMs: Number($("dailyTarget").value) * 3600000, remindersEnabled: true });
  if (!result || result.status !== "ok") return;
  selectedActivityId = result.activity.id;
  addPrompt = t("added", { name: result.activity.name });
  $("newName").value = ""; creatingActivity = false;
  render(await window.focusHudAPI.getSnapshot());
});
$("deleteActivity").addEventListener("click", async () => {
  const activityId = $("activity").value;
  const activity = snapshot.activities.find((item) => item.id === activityId);
  if (!activity || !window.confirm(t("deleteConfirm", { name: activity.name }))) return;
  const result = await window.focusHudAPI.archiveActivity({ activityId });
  if (!result || result.status !== "ok") return;
  selectedActivityId = ""; addPrompt = "";
  render(await window.focusHudAPI.getSnapshot());
});
async function saveGoal() {
  const activityId = $("activity").value;
  const result = await window.focusHudAPI.updateActivity({ activityId, dailyTargetMs: Number($("goalHours").value) * 3600000 });
  if (!result || result.status !== "ok") return;
  render(await window.focusHudAPI.getSnapshot());
}
$("goalHours").addEventListener("input", () => {
  if (goalSaveTimer) clearTimeout(goalSaveTimer);
  goalSaveTimer = setTimeout(() => { goalSaveTimer = null; void saveGoal(); }, 350);
});
$("goalHours").addEventListener("blur", () => {
  if (goalSaveTimer) { clearTimeout(goalSaveTimer); goalSaveTimer = null; }
  void saveGoal();
});
$("start").addEventListener("click", () => window.focusHudAPI.start({ activityId: $("activity").value, mode: $("mode").value, durationMs: Number($("minutes").value) * 60000 }));
$("pause").addEventListener("click", () => window.focusHudAPI.pause());
$("resume").addEventListener("click", () => window.focusHudAPI.resume());
$("finish").addEventListener("click", () => window.focusHudAPI.finish());
window.focusHudAPI.onSnapshot(render);
window.focusHudAPI.onExpanded((value) => {
  expanded = value === true;
  $("card").classList.toggle("expanded", expanded);
  $("summary").setAttribute("aria-expanded", String(expanded));
});
window.focusHudAPI.getSnapshot().then(render);
