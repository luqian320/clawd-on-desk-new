# Focus Module Specification

Status: implementation in progress  
Owner fork: `luqian320/clawd-on-desk-new`  
Feature branch: `codex/focus-timer`

## 1. Purpose

Focus is a local-first time tracking and Pomodoro module. It lets a user create
activities, track daily effort, run adjustable focus/break cycles, receive
goal reminders, and review weekly and all-time totals.

The primary control is a compact transparent HUD anchored to the pet. When no
timer is active it presents a one-click **Start focus** entry above the pet.
Tray, pet context-menu, Settings, and Dashboard entry points remain secondary.

## 2. Non-goals

- Focus does not create synthetic coding-agent sessions.
- Focus does not change permission, notification, DND, or agent gate behavior.
- Focus does not inspect window titles, source code, browsing, or app usage.
- Cloud sync and automatic activity detection are not part of v1.
- New mascot artwork is not required for v1.

## 3. Experience and layout

The Focus HUD is an always-on-top, frameless, transparent Electron window. It
has no taskbar or Dock entry and follows the pet across movement and displays.
It flips below the pet when there is insufficient room above it.

Collapsed states:

- Idle: `Start focus`
- Stopwatch: activity name plus elapsed time
- Pomodoro focus: activity name plus remaining time
- Break: break label plus remaining time
- Paused: time plus a paused marker

Clicking the collapsed HUD expands the controls. The expanded HUD provides the
activity picker, stopwatch/Pomodoro mode, adjustable Pomodoro duration, and
start/pause/resume/finish actions. Transparent pixels must not create a large
input-blocking rectangle.

The visual signature is a thin tomato-red progress rail at the top of the HUD.
It shrinks through a Pomodoro phase and stays solid for stopwatch mode. The HUD
otherwise follows the existing restrained translucent Session HUD language.

## 4. Activities and time rules

- Multiple activities are supported; exactly one timer may run at once.
- An activity has a stable id, name, optional color, daily target, optional
  weekly target, reminder settings, created timestamp, and optional archive
  timestamp.
- Paused time and break time never count toward an activity.
- Completed Pomodoro focus phases count toward the selected activity.
- Finishing a partial Pomodoro saves its actual focused duration by default.
- Records crossing local midnight are split for daily statistics.
- Totals derive from immutable time entries rather than stored rollups.
- Archived activities retain their history.

## 5. Pomodoro defaults

- Focus: 25 minutes, adjustable before a run.
- Short break: 5 minutes, adjustable.
- Long break: 15 minutes, adjustable.
- Long break after 4 completed focus phases, adjustable.
- Automatic next-phase start is off by default and configurable.

Durations are calculated from timestamps, not interval tick counts.

## 6. Recovery

- Normal quit persists the active timer snapshot.
- Unexpected restart restores a paused recovery state; it never silently
  counts time while the app was absent.
- System suspend pauses the timer. Resume keeps it paused until the user acts.
- Invalid clock movement cannot produce negative durations.

## 7. Presentation priority

Existing agent presentation remains authoritative. Focus is a lower-priority
local presentation source:

1. Permission requests, errors, and mandatory existing notifications
2. Active coding-agent work
3. Pomodoro phase completion and focus reminders
4. Focus work/break presentation
5. Existing idle, roam, and sleep presentation

V1 reuses `working`, `dozing`, `sleeping`, `notification`, and `attention`.
Future theme capabilities may add optional focus-specific visuals with fallback
to these states.

## 8. Reminders and goals

- Reminders only apply to activities with a target and reminders enabled.
- Do not remind while any focus timer is running.
- Respect DND and quiet hours.
- Default reminder cooldown is 90 minutes.
- Stop reminders after the daily target is met.
- Actions: start, remind in 90 minutes, and skip for today.
- Reaching a daily target celebrates once per activity per local day.
- Reminders require Clawd to be running; v1 adds no background service.

## 9. Storage

Preferences remain in `clawd-prefs.json` and must be written only through the
Settings controller. Activity definitions, entries, active runtime recovery,
and celebration/reminder markers live in `focus-data.json` under Electron's
userData directory.

`focus-data.json` is validated on load, written atomically, and backed up before
replacement. Corrupt data falls back safely without overwriting the corrupt
copy.

No code content, terminal content, window title, or browsing data is stored.

## 10. Weekly summary

The week starts Monday by default. The summary includes per-activity duration,
total duration, completed Pomodoros, and target-hit days. A compact summary may
appear on first launch of a new week; full detail belongs in Dashboard.

## 11. Accessibility and platform behavior

- Every action is keyboard reachable and has a visible focus state.
- Numeric time uses tabular figures.
- Reduced-motion preferences disable nonessential transitions.
- The HUD clamps to the active display work area.
- Pet hidden hides the Focus HUD. DND suppresses reminders but does not stop
  time tracking.
- Mini mode uses a compact single-line Focus HUD.

## 12. Change log

### 2026-07-17

- Approved the combined Focus module scope.
- Made the pet-anchored Focus HUD the primary entry point.
- Confirmed adjustable Pomodoro duration with a 25-minute default.
- Confirmed existing animations and existing agent-state priority.
- Confirmed local-only storage and an isolated implementation in the fork.
- Added the persistent pet-top primary entry plus tray and pet-menu entries.
- Added adjustable per-run Pomodoro minutes while retaining the 25-minute default.
- Added inline multi-activity creation with a daily-target field in the primary HUD.
- Added daily, weekly, all-time, Pomodoro, and cross-midnight statistics primitives.
- Ensured pause/finish returns presentation control to the existing state resolver.
- Added once-per-day goal celebrations and 12:00/18:00/21:00 deficit reminders.
- Added a persisted 90-minute reminder cooldown and suppression while active or in DND.
- Added per-activity Today / Week / Total summaries directly in the expanded HUD.
