"use strict";

const path = require("path");
const { BrowserWindow, screen, ipcMain } = require("electron");
const { keepOutOfTaskbar } = require("./taskbar");

const WIDTH = 226;
const COLLAPSED_HEIGHT = 42;
const EXPANDED_HEIGHT = 174;
const GAP = 6;
const EDGE = 8;

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, Math.max(min, max)));
}

function computeFocusHudBounds({ petBounds, workArea, expanded = false }) {
  if (!petBounds || !workArea) return null;
  const height = expanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;
  const centerX = petBounds.x + petBounds.width / 2;
  const x = clamp(Math.round(centerX - WIDTH / 2), workArea.x + EDGE, workArea.x + workArea.width - WIDTH - EDGE);
  const above = Math.round(petBounds.y - height - GAP);
  const canFitAbove = above >= workArea.y + EDGE;
  const y = canFitAbove
    ? above
    : clamp(Math.round(petBounds.y + petBounds.height + GAP), workArea.y + EDGE, workArea.y + workArea.height - height - EDGE);
  return { x, y, width: WIDTH, height };
}

function createFocusHud(options = {}) {
  const getPetWindowBounds = options.getPetWindowBounds;
  const getPetHidden = options.getPetHidden || (() => false);
  const getSnapshot = options.getSnapshot;
  const actions = options.actions || {};
  const onExpandedChange = options.onExpandedChange || (() => {});
  let hud = null;
  let expanded = false;
  const disposers = [];

  function reposition() {
    if (!hud || hud.isDestroyed()) return;
    const petBounds = getPetWindowBounds();
    if (!petBounds) return;
    const display = screen.getDisplayNearestPoint({
      x: Math.round(petBounds.x + petBounds.width / 2),
      y: Math.round(petBounds.y + petBounds.height / 2),
    });
    const bounds = computeFocusHudBounds({ petBounds, workArea: display.workArea, expanded });
    if (bounds) hud.setBounds(bounds, false);
  }

  function syncVisibility() {
    if (!hud || hud.isDestroyed()) return;
    if (getPetHidden()) hud.hide();
    else {
      reposition();
      hud.showInactive();
      keepOutOfTaskbar(hud);
    }
  }

  function broadcast(snapshot = getSnapshot()) {
    if (hud && !hud.isDestroyed() && !hud.webContents.isDestroyed()) {
      hud.webContents.send("focus-hud:snapshot", snapshot);
    }
  }

  function handle(channel, listener) {
    ipcMain.handle(channel, listener);
    disposers.push(() => ipcMain.removeHandler(channel));
  }

  function create() {
    if (hud && !hud.isDestroyed()) return hud;
    hud = new BrowserWindow({
      width: WIDTH,
      height: COLLAPSED_HEIGHT,
      frame: false,
      transparent: true,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      closable: false,
      skipTaskbar: true,
      show: false,
      hasShadow: false,
      focusable: true,
      alwaysOnTop: true,
      webPreferences: {
        preload: path.join(__dirname, "preload-focus-hud.js"),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    hud.setAlwaysOnTop(true, process.platform === "win32" ? "pop-up-menu" : "floating");
    hud.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    keepOutOfTaskbar(hud);
    hud.loadFile(path.join(__dirname, "focus-hud.html"));
    hud.webContents.once("did-finish-load", () => {
      broadcast();
      syncVisibility();
    });
    return hud;
  }

  handle("focus:get-snapshot", () => getSnapshot());
  handle("focus:set-expanded", (_event, value) => {
    expanded = value === true;
    reposition();
    onExpandedChange(expanded);
    return { status: "ok" };
  });
  for (const name of ["add-activity", "start", "pause", "resume", "finish", "update-config"]) {
    handle(`focus:${name}`, (_event, payload) => {
      const fn = actions[name];
      return typeof fn === "function" ? fn(payload || {}) : { status: "error", message: "Unavailable" };
    });
  }

  function cleanup() {
    for (const dispose of disposers.splice(0)) dispose();
    if (hud && !hud.isDestroyed()) {
      hud.destroy();
      hud = null;
    }
  }

  function showExpanded() {
    expanded = true;
    create();
    reposition();
    syncVisibility();
    if (hud && !hud.isDestroyed()) {
      hud.show();
      hud.focus();
      hud.webContents.send("focus-hud:set-expanded", true);
    }
  }

  return { create, broadcast, reposition, syncVisibility, showExpanded, cleanup, getWindow: () => hud };
}

module.exports = { WIDTH, COLLAPSED_HEIGHT, EXPANDED_HEIGHT, computeFocusHudBounds, createFocusHud };
