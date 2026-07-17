"use strict";

let snapshot = { activities: [], active: null, config: { focusMs: 1500000 } };
let expanded = false;
let creatingActivity = false;
const $ = (id) => document.getElementById(id);

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
  return hours ? `${hours}h ${rest}m` : `${rest}m`;
}

function render(next) {
  snapshot = next || snapshot;
  const active = snapshot.active;
  const hasActivities = snapshot.activities.some((item) => !item.archivedAt);
  const selectedId = active ? active.activityId : $("activity").value;
  $("activity").innerHTML = "";
  for (const item of snapshot.activities.filter((value) => !value.archivedAt)) {
    const option = document.createElement("option"); option.value = item.id; option.textContent = item.name; $("activity").appendChild(option);
  }
  if (selectedId && [...$("activity").options].some((option) => option.value === selectedId)) $("activity").value = selectedId;
  const stats = snapshot.stats && snapshot.stats.activities
    ? snapshot.stats.activities[active ? active.activityId : $("activity").value]
    : null;
  if (stats) {
    const target = stats.activity.dailyTargetMs > 0 ? ` / ${compactDuration(stats.activity.dailyTargetMs)}` : "";
    $("hint").textContent = `Today ${compactDuration(stats.todayMs)}${target} · Week ${compactDuration(stats.weekMs)} · Total ${compactDuration(stats.allTimeMs)}`;
  } else {
    $("hint").textContent = "Choose what you want to make time for.";
  }
  show("createRow", (!hasActivities || creatingActivity) && !active);
  show("pickRow", hasActivities && !active && !creatingActivity);
  show("durationRow", hasActivities && !active && !creatingActivity && $("mode").value === "pomodoro");
  show("start", hasActivities && !active && !creatingActivity);
  show("pause", !!active && active.status === "running");
  show("resume", !!active && active.status === "paused");
  show("finish", !!active);
  show("time", !!active);
  if (!active) {
    $("label").textContent = "Start focus";
    if (snapshot.notice && snapshot.notice.type === "goal") {
      $("label").textContent = "Goal complete — great work!";
      $("sub").textContent = snapshot.notice.activityName;
    } else if (snapshot.notice && snapshot.notice.type === "reminder") {
      $("label").textContent = `Continue ${snapshot.notice.activityName}`;
      $("sub").textContent = `${Math.ceil(snapshot.notice.remainingMs / 3600000 * 10) / 10}h left today`;
    } else {
      $("sub").textContent = `${Math.round((snapshot.config.focusMs || 1500000) / 60000)} min Pomodoro`;
    }
    $("rail").style.setProperty("--progress", 1);
    return;
  }
  const phaseLabel = active.phase === "focus" ? active.activity.name : (active.phase === "long-break" ? "Long break" : "Short break");
  $("label").textContent = phaseLabel;
  $("sub").textContent = active.status === "paused" ? "Paused" : (active.mode === "pomodoro" ? "Pomodoro" : "Stopwatch");
  $("time").textContent = format(active.mode === "pomodoro" ? active.remainingMs : active.elapsedMs, active.mode === "pomodoro");
  const progress = active.mode === "pomodoro" ? active.remainingMs / active.phaseDurationMs : 1;
  $("rail").style.setProperty("--progress", Math.max(0, Math.min(1, progress)));
}

$("summary").addEventListener("click", async () => {
  expanded = !expanded; $("card").classList.toggle("expanded", expanded); $("summary").setAttribute("aria-expanded", String(expanded));
  await window.focusHudAPI.setExpanded(expanded);
});
$("mode").addEventListener("change", () => render(snapshot));
$("activity").addEventListener("change", () => render(snapshot));
$("newActivity").addEventListener("click", () => { creatingActivity = true; render(snapshot); $("newName").focus(); });
$("add").addEventListener("click", async () => {
  const name = $("newName").value.trim(); if (!name) return $("newName").focus();
  await window.focusHudAPI.addActivity({ name, dailyTargetMs: Number($("dailyTarget").value) * 3600000, remindersEnabled: true });
  $("newName").value = ""; creatingActivity = false;
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
