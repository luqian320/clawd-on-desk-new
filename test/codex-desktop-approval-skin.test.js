"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { describe, it } = require("node:test");

const ROOT = path.join(__dirname, "..");
const renderer = fs.readFileSync(path.join(ROOT, "src", "bubble-renderer.js"), "utf8");
const css = fs.readFileSync(path.join(ROOT, "src", "bubble.css"), "utf8");
const permission = fs.readFileSync(path.join(ROOT, "src", "permission.js"), "utf8");
const main = fs.readFileSync(path.join(ROOT, "src", "main.js"), "utf8");

describe("Codex Desktop approval notification skins", () => {
  it("defaults malformed or missing styles to pixel and scopes skin classes to Codex notices", () => {
    assert.match(renderer, /data\.uiStyle === "modern" \? "modern" : "pixel"/);
    assert.match(renderer, /card\.classList\.add\("codex-notify", `skin-\$\{uiStyle\}`\)/);
    assert.match(renderer, /card\.classList\.remove\("codex-notify", "skin-modern", "skin-pixel"\)/);
    assert.match(css, /\.card\.codex-notify\.skin-modern/);
    assert.match(css, /\.card\.codex-notify\.skin-pixel/);
  });

  it("uses the shared Focus HUD preference and refreshes visible bubbles when it changes", () => {
    assert.match(permission, /getFocusHudStyle\(\)/);
    assert.match(permission, /function syncPermissionBubbleStyles\(\)/);
    assert.match(main, /getFocusHudStyle: \(\) => _settingsController\.get\("focusHudStyle"\) \|\| "pixel"/);
    assert.match(main, /subscribeKey\("focusHudStyle", \(\) => \{[\s\S]*syncPermissionBubbleStyles\(\);/);
  });
});
