"use strict";
// Runs before any game script, in the page's localStorage. Sandboxed: only contextBridge and ipcRenderer.
//  1. put the on-disk save back into localStorage when the file is newer (or localStorage has no game data)
//  2. mirror every tracklayer.* key to the file (changes, removals), on a timer, on pagehide, and on quit
//  3. window.TLDesktop = { quit, version, platform, setFullscreen, isFullscreen }
const { contextBridge, ipcRenderer } = require("electron");

const PREFIX = "tracklayer.", STAMP = "tracklayer.desktop.t";
const info = ipcRenderer.sendSync("tl-info") || { version: "0", platform: "unknown", fullscreen: false };
let fullscreen = !!info.fullscreen;

const mirrored = k => k.startsWith(PREFIX) && k !== STAMP;
function snapshot() {
  const o = {};
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (mirrored(k)) o[k] = localStorage.getItem(k); } } catch (e) { }
  return o;
}
function same(a, b) {
  const ka = Object.keys(a); if (ka.length !== Object.keys(b).length) return false;
  for (const k of ka) if (!(k in b) || a[k] !== b[k]) return false;
  return true;
}

let last = {};                                 // what the file holds, as far as this page knows
function restore() {
  let f = null;
  try { f = ipcRenderer.sendSync("tl-save-read"); } catch (e) { console.warn("[tracklayer] save read failed", e); }
  const now = snapshot();
  if (!f || !f.keys) { last = now; return; }   // no usable file: never touch localStorage
  let stamp = 0; try { stamp = Number(localStorage.getItem(STAMP)) || 0; } catch (e) { }
  if (Object.keys(now).length === 0 || f.t > stamp) {
    try {
      for (const k of Object.keys(now)) if (!(k in f.keys)) localStorage.removeItem(k);
      for (const k of Object.keys(f.keys)) localStorage.setItem(k, f.keys[k]);
      localStorage.setItem(STAMP, String(f.t));
      console.log("[tracklayer] restored " + Object.keys(f.keys).length + " keys from the save file");
    } catch (e) { console.warn("[tracklayer] restore failed", e); }
    last = snapshot();
  } else last = now;
}
restore();

let busy = false;
async function mirror() {                      // timer path: async, skipped when nothing changed
  if (busy) return; const now = snapshot(); if (same(now, last)) return;
  busy = true;
  try { const t = await ipcRenderer.invoke("tl-save-write", now); if (t) { last = now; localStorage.setItem(STAMP, String(t)); } }
  catch (e) { console.warn("[tracklayer] save mirror failed", e); } finally { busy = false; }
}
function flushNow() {                          // unload / quit path: synchronous so it lands before the process goes
  const now = snapshot(); if (same(now, last)) return;
  try { const t = ipcRenderer.sendSync("tl-save-write-sync", now); if (t) { last = now; localStorage.setItem(STAMP, String(t)); } }
  catch (e) { console.warn("[tracklayer] save flush failed", e); }
}
setInterval(mirror, 5000);
// registered at DOMContentLoaded so the game's own pagehide/visibilitychange saves (added by its scripts) run first
addEventListener("DOMContentLoaded", () => { addEventListener("pagehide", flushNow); addEventListener("beforeunload", flushNow); });

ipcRenderer.on("tl-flush", () => {             // main wants to quit: let the game save, write the file, say so
  try { dispatchEvent(new Event("pagehide")); } catch (e) { }
  flushNow();
  ipcRenderer.send("tl-flushed");
});
ipcRenderer.on("tl-fs", (e, v) => {
  fullscreen = !!v;
  try { document.dispatchEvent(new Event("fullscreenchange")); } catch (x) { }
});

contextBridge.exposeInMainWorld("TLDesktop", {
  quit: () => { ipcRenderer.send("tl-quit"); },
  version: String(info.version),
  platform: String(info.platform),
  setFullscreen: v => { ipcRenderer.send("tl-fullscreen", !!v); },
  isFullscreen: () => fullscreen,
});
