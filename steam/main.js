"use strict";
// Tracklayer desktop shell: one window, the staged game served from app://tracklayer/, saves mirrored to disk.
// No network code. Everything that is not app://tracklayer/ is cancelled and counted.
const { app, BrowserWindow, Menu, protocol, session, ipcMain } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const TEST = process.env.TL_TEST === "1";           // hidden window, test hook, blocked-request endpoint
const ORIGIN = "app://tracklayer/";
const APP_DIR = path.resolve(TEST && process.env.TL_APP_DIR ? process.env.TL_APP_DIR : path.join(__dirname, "app"));
const log = (...a) => console.log("[tracklayer]", ...a);

// the fast GPU on dual-GPU laptops; must be set before ready
app.commandLine.appendSwitch("force_high_performance_gpu");
// one userData folder whether run as `electron .` or as the packaged app (tests pass --user-data-dir instead)
if (!app.commandLine.hasSwitch("user-data-dir")) app.setPath("userData", path.join(app.getPath("appData"), "Tracklayer"));

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

/* ------------------------------------------------------------------ requests that must never leave */
const blocked = { count: 0, urls: [] };
function noteBlocked(kind, url) {
  blocked.count++; if (blocked.urls.length < 50) blocked.urls.push(kind + " " + String(url).slice(0, 200));
  log("blocked", kind, String(url).slice(0, 160));
}
const okUrl = u => u.startsWith(ORIGIN) || u.startsWith("data:") || u.startsWith("blob:") || u.startsWith("devtools:");

/* ------------------------------------------------------------------ app:// file server */
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".txt": "text/plain; charset=utf-8",
  ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".wasm": "application/wasm",
};
const reply = (status, body, type) => new Response(body, { status, headers: { "content-type": type || "text/plain; charset=utf-8", "cache-control": "no-store" } });

// the same hook tools/playtest/mksite.py adds; only ever added while serving, only when TL_TEST=1
function withTestHook(js) {
  const i = js.lastIndexOf("})();");
  return i < 0 ? js : js.slice(0, i) + "window.__tl = e => eval(e);\n" + js.slice(i);
}

function fileFor(urlStr) {
  let u; try { u = new URL(urlStr); } catch (e) { return { status: 400 }; }
  if (u.hostname !== "tracklayer") return { status: 403 };
  let p; try { p = decodeURIComponent(u.pathname); } catch (e) { return { status: 400 }; }
  if (p.includes("\0") || p.includes("\\")) return { status: 403 };
  if (p === "/" || p === "") p = "/index.html";
  const full = path.resolve(APP_DIR, "." + p);
  if (full !== APP_DIR && !full.startsWith(APP_DIR + path.sep)) return { status: 403 };
  return { full, p };
}

function registerAppProtocol() {
  protocol.handle("app", async req => {
    if (TEST && req.url.startsWith(ORIGIN + "__tl_blocked")) return reply(200, JSON.stringify(blocked), MIME[".json"]);
    const f = fileFor(req.url);
    if (!f.full) { noteBlocked("bad-app-url", req.url); return reply(f.status, "refused"); }
    try {
      let buf = await fs.promises.readFile(f.full);
      if (TEST && f.p === "/tracklayer.js") buf = Buffer.from(withTestHook(buf.toString("utf8")), "utf8");
      return reply(200, buf, MIME[path.extname(f.full).toLowerCase()] || "application/octet-stream");
    } catch (e) {
      return reply(e.code === "ENOENT" || e.code === "EISDIR" ? 404 : 500, "not found");
    }
  });
}

/* ------------------------------------------------------------------ saves on disk */
// <userData>/saves/tracklayer-save.json = { v:1, t:<ms>, keys:{ "<tracklayer.* localStorage key>": "<string>" } }
// Written by temp file + rename; the previous good file is kept as .bak. Steam Cloud syncs this folder later (slice S4).
const saveDir = () => path.join(app.getPath("userData"), "saves");
const saveFile = () => path.join(saveDir(), "tracklayer-save.json");
const bakFile = () => saveFile() + ".bak";
const tmpFile = () => saveFile() + ".tmp";
let lastT = 0;

function parseSave(p) {
  let txt;
  try { txt = fs.readFileSync(p, "utf8"); } catch (e) { if (e.code !== "ENOENT") log("save file unreadable:", p, e.message); return null; }
  try {
    const o = JSON.parse(txt);
    if (!o || typeof o !== "object" || typeof o.t !== "number" || !o.keys || typeof o.keys !== "object" || Array.isArray(o.keys)) throw new Error("wrong shape");
    for (const k of Object.keys(o.keys)) if (!k.startsWith("tracklayer.") || typeof o.keys[k] !== "string") throw new Error("bad key " + k);
    return o;
  } catch (e) { log("save file corrupt:", p, "(" + e.message + ")"); return null; }
}
function readSave() {
  const a = parseSave(saveFile()); if (a) return a;
  const b = parseSave(bakFile());
  if (b) { log("restoring from the .bak save"); return b; }
  if (fs.existsSync(saveFile()) || fs.existsSync(bakFile())) log("no usable save file: leaving localStorage alone");
  return null;
}
function writeSave(keys) {
  const clean = {};
  for (const k of Object.keys(keys || {})) if (k.startsWith("tracklayer.") && typeof keys[k] === "string") clean[k] = keys[k];
  const t = Math.max(Date.now(), lastT + 1); lastT = t;
  fs.mkdirSync(saveDir(), { recursive: true });
  const fd = fs.openSync(tmpFile(), "w");
  try { fs.writeSync(fd, JSON.stringify({ v: 1, t, keys: clean })); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  if (parseSave(saveFile())) fs.copyFileSync(saveFile(), bakFile());     // keep one .bak of the previous GOOD file only
  fs.renameSync(tmpFile(), saveFile());
  return t;
}

/* ------------------------------------------------------------------ window */
let win = null, quitting = false;
const fromGame = e => { try { return !!(e.senderFrame && e.senderFrame.url.startsWith(ORIGIN)); } catch (x) { return false; } };

function toggleFullscreen(v) { if (win && !win.isDestroyed()) win.setFullScreen(typeof v === "boolean" ? v : !win.isFullScreen()); }

function createWindow() {
  win = new BrowserWindow({
    title: "Tracklayer",
    icon: path.join(APP_DIR, "icon-512.png"),
    width: 1280, height: 720, useContentSize: true, minWidth: 960, minHeight: 540,
    backgroundColor: "#0d1822",
    show: false, paintWhenInitiallyHidden: true,
    fullscreen: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      backgroundThrottling: false, spellcheck: false, devTools: TEST || process.env.TL_DEV === "1",
      autoplayPolicy: "no-user-gesture-required",
    },
  });
  if (process.platform !== "darwin") win.removeMenu();
  win.on("page-title-updated", e => e.preventDefault());
  win.webContents.on("before-input-event", (e, i) => {
    if (i.type !== "keyDown") return;
    if (i.key === "F11" || (i.alt && i.key === "Enter")) { e.preventDefault(); toggleFullscreen(); }
  });
  for (const [ev, v] of [["enter-full-screen", true], ["leave-full-screen", false]]) win.on(ev, () => { if (!win.webContents.isDestroyed()) win.webContents.send("tl-fs", v); });
  win.on("close", e => { if (!quitting) { e.preventDefault(); gracefulQuit(); } });
  win.on("closed", () => { win = null; });
  win.webContents.on("render-process-gone", (e, d) => log("renderer gone:", d.reason));
  win.loadURL(ORIGIN + "index.html");
  if (!TEST) { win.setFullScreen(true); win.show(); }          // tests never show, focus or full-screen a window
}

// ask the page to save and write the file, wait for it (max 2 s), then really quit
let quitStarted = false;
function gracefulQuit() {
  if (quitStarted) return; quitStarted = true;
  const done = () => { quitting = true; app.quit(); };
  if (!win || win.isDestroyed() || win.webContents.isDestroyed()) return done();
  const timer = setTimeout(() => { log("save flush timed out"); done(); }, 2000);
  ipcMain.once("tl-flushed", () => { clearTimeout(timer); done(); });
  win.webContents.send("tl-flush");
}

ipcMain.on("tl-info", e => {
  if (!fromGame(e)) { e.returnValue = null; return; }
  e.returnValue = { version: app.getVersion(), platform: process.platform, fullscreen: !!(win && win.isFullScreen()) };
});
ipcMain.on("tl-save-read", e => { e.returnValue = fromGame(e) ? readSave() : null; });
ipcMain.handle("tl-save-write", (e, keys) => { if (!fromGame(e)) return 0; try { return writeSave(keys); } catch (x) { log("save write failed:", x.message); return 0; } });
ipcMain.on("tl-save-write-sync", (e, keys) => { let t = 0; if (fromGame(e)) try { t = writeSave(keys); } catch (x) { log("save write failed:", x.message); } e.returnValue = t; });
ipcMain.on("tl-quit", e => { if (fromGame(e)) gracefulQuit(); });
ipcMain.on("tl-fullscreen", (e, v) => { if (fromGame(e)) toggleFullscreen(!!v); });

/* ------------------------------------------------------------------ lifecycle */
if (!app.requestSingleInstanceLock()) { app.quit(); }
else {
  app.on("second-instance", () => { if (win && !TEST) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.on("before-quit", e => { if (!quitting) { e.preventDefault(); gracefulQuit(); } });
  app.on("window-all-closed", () => app.quit());

  app.on("web-contents-created", (e, wc) => {
    wc.setWindowOpenHandler(d => { noteBlocked("window.open", d.url); return { action: "deny" }; });
    wc.on("will-navigate", (ev, url) => { if (!url.startsWith(ORIGIN)) { ev.preventDefault(); noteBlocked("navigate", url); } });
    wc.on("will-redirect", (ev, url) => { if (!url.startsWith(ORIGIN)) { ev.preventDefault(); noteBlocked("redirect", url); } });
    wc.on("will-attach-webview", ev => ev.preventDefault());
  });

  app.whenReady().then(() => {
    if (TEST && app.dock) app.dock.hide();                                  // no Dock icon bouncing on Lemon's Mac
    if (process.platform !== "darwin") Menu.setApplicationMenu(null);
    session.defaultSession.webRequest.onBeforeRequest((d, cb) => {
      if (okUrl(d.url)) return cb({});
      noteBlocked(d.resourceType || "request", d.url); cb({ cancel: true });
    });
    session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(["fullscreen", "pointerLock", "clipboard-sanitized-write", "keyboardLock"].includes(perm)));
    registerAppProtocol();
    createWindow();
  });
}
