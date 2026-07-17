"use strict";

const { contextBridge, ipcRenderer } = require("electron");
const listeners = new Set();
const expandedListeners = new Set();

ipcRenderer.on("focus-hud:snapshot", (_event, snapshot) => {
  for (const listener of listeners) listener(snapshot);
});
ipcRenderer.on("focus-hud:set-expanded", (_event, value) => {
  for (const listener of expandedListeners) listener(value === true);
});

contextBridge.exposeInMainWorld("focusHudAPI", {
  getSnapshot: () => ipcRenderer.invoke("focus:get-snapshot"),
  setExpanded: (value) => ipcRenderer.invoke("focus:set-expanded", !!value),
  addActivity: (payload) => ipcRenderer.invoke("focus:add-activity", payload),
  archiveActivity: (payload) => ipcRenderer.invoke("focus:archive-activity", payload),
  updateActivity: (payload) => ipcRenderer.invoke("focus:update-activity", payload),
  setStyle: (style) => ipcRenderer.invoke("focus:set-style", { style }),
  start: (payload) => ipcRenderer.invoke("focus:start", payload),
  pause: () => ipcRenderer.invoke("focus:pause"),
  resume: () => ipcRenderer.invoke("focus:resume"),
  finish: () => ipcRenderer.invoke("focus:finish"),
  updateConfig: (payload) => ipcRenderer.invoke("focus:update-config", payload),
  onSnapshot: (listener) => {
    if (typeof listener !== "function") return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  onExpanded: (listener) => {
    if (typeof listener !== "function") return () => {};
    expandedListeners.add(listener);
    return () => expandedListeners.delete(listener);
  },
});
