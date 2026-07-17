"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

// Electron is unavailable in the plain Node test runner. Stub just enough of
// the module before loading the pure bounds helper exported by focus-hud.
const Module = require("module");
const originalLoad = Module._load;
Module._load = function load(request, parent, isMain) {
  if (request === "electron") return { BrowserWindow: function BrowserWindow() {}, screen: {}, ipcMain: {} };
  return originalLoad.call(this, request, parent, isMain);
};
const { computeFocusHudBounds } = require("../src/focus-hud");
Module._load = originalLoad;

test("Focus HUD prefers above the pet", () => {
  const bounds = computeFocusHudBounds({
    petBounds: { x: 400, y: 300, width: 200, height: 200 },
    workArea: { x: 0, y: 0, width: 1200, height: 800 },
  });
  assert.ok(bounds.y < 300);
});

test("Focus HUD flips below near the top edge and remains clamped", () => {
  const bounds = computeFocusHudBounds({
    petBounds: { x: -30, y: 4, width: 120, height: 120 },
    workArea: { x: 0, y: 0, width: 800, height: 600 },
    expanded: true,
  });
  assert.ok(bounds.y >= 124);
  assert.ok(bounds.x >= 8);
});

