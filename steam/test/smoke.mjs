// Smoke test for the Tracklayer desktop shell. Run: npm test (from steam/).
// Launches Electron itself with TL_TEST=1 (hidden window: never shown, focused or full screen), a fresh
// --user-data-dir under $TMPDIR and --remote-debugging-port, and drives the page over CDP with Node's own WebSocket.
// Prints PASS/FAIL per assert; exit 1 on any FAIL. Needs `npm run dist:mac` and `npm run dist:win` done first
// for asserts 6 and 7 (set TL_SKIP_DIST=1 to skip those two, printed as SKIP).
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import net from "node:net";
import http from "node:http";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const steam = path.resolve(here, "..");
const repo = path.resolve(steam, "..");
const require = createRequire(import.meta.url);
const TMP = process.env.TMPDIR || os.tmpdir();
const RUN = fs.mkdtempSync(path.join(TMP, "tlsmoke-"));      // a new dir per run, never cleaned by this script
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
function check(name, ok, detail = "") { if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -- " + detail : ""}`); return ok; }
function skip(name, why) { console.log(`SKIP  ${name}  -- ${why}`); }
console.log("smoke: scratch dir " + RUN);

const freePort = () => new Promise(res => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); }); });
async function until(fn, ms, step = 250) { const t0 = Date.now(); for (;;) { let v; try { v = await fn(); } catch (e) { v = null; } if (v) return v; if (Date.now() - t0 > ms) return null; await sleep(step); } }

/* ---------------------------------------------------------------- CDP */
async function cdpConnect(wsUrl) {
  const ws = new WebSocket(wsUrl); let id = 0; const pend = new Map(), subs = [];
  await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", () => rej(new Error("ws error"))); });
  ws.addEventListener("message", m => {
    const o = JSON.parse(m.data);
    if (o.id && pend.has(o.id)) { pend.get(o.id)(o); pend.delete(o.id); } else if (o.method) for (const s of subs) s(o);
  });
  const send = (method, params = {}) => new Promise(res => {
    const i = ++id; pend.set(i, res);
    try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { res({ error: { message: String(e) } }); }
    setTimeout(() => { if (pend.has(i)) { pend.delete(i); res({ error: { message: "timeout " + method } }); } }, 30000);
  });
  return { send, on: f => subs.push(f), close: () => { try { ws.close(); } catch (e) { } } };
}

/* ---------------------------------------------------------------- one Electron run */
function electronBin() { return require("electron"); }          // path string of the dev binary
async function launch({ exe, args = [], userData, env = {} }) {
  const port = await freePort();
  const e = { ...process.env, TL_TEST: "1", ...env }; delete e.ELECTRON_RUN_AS_NODE; delete e.TL_DEV;
  const proc = spawn(exe, [...args, `--remote-debugging-port=${port}`, `--user-data-dir=${userData}`], { cwd: steam, env: e, stdio: ["ignore", "pipe", "pipe"] });
  const out = []; proc.stdout.on("data", d => out.push(String(d))); proc.stderr.on("data", d => out.push(String(d)));
  const exited = new Promise(r => { proc.on("exit", (code, sig) => r({ code, sig })); proc.on("error", er => r({ code: -1, sig: String(er) })); });
  const g = { proc, out, exited, userData, errors: [], reqs: [], logText: () => out.join("") };
  const target = await until(async () => {
    const r = await fetch(`http://127.0.0.1:${port}/json/list`).then(x => x.json());
    return r.find(t => t.type === "page" && t.url.startsWith("app://tracklayer/"));
  }, 40000, 300);
  if (!target) { g.dead = true; return g; }
  const c = await cdpConnect(target.webSocketDebuggerUrl); Object.assign(g, c);
  c.on(o => {
    if (o.method === "Runtime.exceptionThrown") g.errors.push("exception: " + (o.params.exceptionDetails.exception?.description || o.params.exceptionDetails.text).slice(0, 300));
    else if (o.method === "Runtime.consoleAPICalled" && o.params.type === "error") g.errors.push("console.error: " + o.params.args.map(a => a.value ?? a.description ?? "").join(" ").slice(0, 300));
    else if (o.method === "Log.entryAdded" && o.params.entry.level === "error") g.errors.push("log: " + o.params.entry.text + " " + (o.params.entry.url || "").slice(0, 200));
    else if (o.method === "Network.requestWillBeSent") g.reqs.push(o.params.request.url);
    else if (o.method === "Network.loadingFailed" && !o.params.canceled) g.errors.push("network failure: " + o.params.errorText);
  });
  for (const m of ["Runtime.enable", "Log.enable", "Network.enable", "Page.enable"]) await g.send(m);
  await g.send("Network.setCacheDisabled", { cacheDisabled: true });
  await g.send("Emulation.setFocusEmulationEnabled", { enabled: true });   // key events reach a never-focused window
  await g.send("Page.reload", { ignoreCache: true });                        // so Network sees the whole boot
  return g;
}
const ev = async (g, expr) => { const r = await g.send("Runtime.evaluate", { expression: "window.__tl(" + JSON.stringify(expr) + ")", returnByValue: true, awaitPromise: true }); if (r.error || r.result?.exceptionDetails) throw new Error("ev: " + expr.slice(0, 80) + " :: " + JSON.stringify(r.error || r.result.exceptionDetails.exception?.description).slice(0, 200)); return r.result.result.value; };
const raw = async (g, expr) => { const r = await g.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); if (r.error || r.result?.exceptionDetails) throw new Error("raw: " + expr.slice(0, 80)); return r.result.result.value; };
async function toMenu(g) { return !g.dead && !!(await until(async () => (await raw(g, "typeof window.__tl")) === "function" && (await ev(g, "TT.mode")) === "menu", 150000, 500)); }
async function key(g, k, code, vk, text) {      // text "\r" on Enter, as a real keyboard sends it: that is what makes a focused button click
  await g.send("Input.dispatchKeyEvent", { type: text ? "keyDown" : "rawKeyDown", key: k, code, windowsVirtualKeyCode: vk, ...(text ? { text } : {}) });
  await g.send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk }); await sleep(120);
}
async function endRun(g) {                                          // our own PID only
  const r = await Promise.race([g.exited, sleep(12000).then(() => null)]);
  if (!r) { try { g.proc.kill("SIGKILL"); } catch (e) { } await g.exited; return { code: "killed" }; }
  g.close?.(); return r;
}
const saveFileOf = d => path.join(d, "saves", "tracklayer-save.json");
const readSaveFile = d => { try { return JSON.parse(fs.readFileSync(saveFileOf(d), "utf8")); } catch (e) { return null; } };
function copySaves(from, to) { fs.mkdirSync(path.join(to, "saves"), { recursive: true }); for (const f of fs.readdirSync(path.join(from, "saves"))) fs.copyFileSync(path.join(from, "saves", f), path.join(to, "saves", f)); }
const cashInSave = o => { try { return JSON.parse(o.keys["tracklayer.save.v2"]).cash; } catch (e) { return null; } };

/* ---------------------------------------------------------------- asserts 1-3 on a running game (boot, ride) */
async function bootAsserts(tag, g, { ride = true } = {}) {
  const menu = await toMenu(g);
  check(`${tag} 1a title menu reached (TT.mode === 'menu')`, menu, menu ? "" : "never reached; log tail: " + g.logText().slice(-400));
  if (!menu) return false;
  await sleep(2500);
  try { const m = await g.send("Page.captureScreenshot", { format: "jpeg", quality: 70 }); if (m.result) { const f = path.join(RUN, tag.replace(/\W+/g, "_") + "_menu.jpg"); fs.writeFileSync(f, Buffer.from(m.result.data, "base64")); console.log("      menu screenshot: " + f); } } catch (e) { }
  const three = await raw(g, "THREE.REVISION");
  check(`${tag} 1b THREE.REVISION === '128'`, three === "128", String(three));
  await until(async () => (await raw(g, "[...document.fonts].some(f => /Barlow Semi Condensed/.test(f.family) && f.status === 'loaded')")), 15000);
  const faces = JSON.parse(await raw(g, "JSON.stringify([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight))"));
  const woff = g.reqs.filter(u => /\.woff2/.test(u));
  check(`${tag} 1c Barlow Semi Condensed loaded from app://`, faces.some(f => /Barlow Semi Condensed/.test(f)) && woff.length > 0 && woff.every(n => n.startsWith("app://tracklayer/vendor/fonts/")), `${faces.length} faces loaded, ${woff.length} woff2 requested, all app://`);
  if (ride) {
    await ev(g, "tutSkip()"); await ev(g, "titleLaunch()");
    const t0 = await ev(g, "gameClock"); await sleep(10000); const t1 = await ev(g, "gameClock"), mode = await ev(g, "TT.mode");
    check(`${tag} 2a rode for 10 s (title closed, game clock ran)`, mode === "off" && t1 - t0 > 0.5, `mode=${mode}, gameClock +${(t1 - t0).toFixed(1)} s over 10 s wall`);
    try { const s = await g.send("Page.captureScreenshot", { format: "jpeg", quality: 70 }); if (s.result) { const f = path.join(RUN, tag.replace(/\W+/g, "_") + "_ride.jpg"); fs.writeFileSync(f, Buffer.from(s.result.data, "base64")); console.log("      screenshot: " + f); } } catch (e) { }
  }
  check(`${tag} 2b no exceptions / console errors through boot${ride ? " and 10 s of riding" : ""}`, g.errors.length === 0, g.errors.slice(0, 4).join(" | "));
  const odd = g.reqs.filter(u => !u.startsWith("app://tracklayer/")), net = odd.filter(u => !/^(data|blob):/.test(u));
  check(`${tag} 3a CDP saw no request outside app://tracklayer/`, net.length === 0, `${g.reqs.length} requests, ${odd.length} data:/blob:; offenders: ${net.slice(0, 3).join(" ")}`);
  const blocked = JSON.parse(await raw(g, "fetch('/__tl_blocked').then(r => r.text())"));
  check(`${tag} 3b main.js blocked-request counter is 0`, blocked.count === 0, JSON.stringify(blocked));
  return true;
}

/* ================================================================ staging checks (no Electron) */
const appDir = path.join(steam, "app");
const normalStage = path.join(RUN, "stage-normal");
const st = spawnSync(process.execPath, [path.join(steam, "build.mjs"), normalStage], { encoding: "utf8" });
check("0a build.mjs stages a normal build", st.status === 0, (st.stdout + st.stderr).trim().split("\n").pop());
const stagedJs = fs.existsSync(path.join(normalStage, "tracklayer.js")) ? fs.readFileSync(path.join(normalStage, "tracklayer.js"), "utf8") : "";
const stagedHtml = fs.existsSync(path.join(normalStage, "index.html")) ? fs.readFileSync(path.join(normalStage, "index.html"), "utf8") : "";
check("0b a normal stage has no test hook (window.__tl)", stagedJs.length > 1e6 && !/window\.__tl\s*=/.test(stagedJs));
check("0c staged index.html: no http(s) in any src/href, local three + fonts", !/(src|href)="https?:/.test(stagedHtml) && /src="vendor\/three\.min\.js"/.test(stagedHtml) && /href="vendor\/fonts\.css"/.test(stagedHtml));
check("0d the repo's own index.html still uses the CDN links", /cdnjs\.cloudflare\.com\/ajax\/libs\/three\.js\/r128/.test(fs.readFileSync(path.join(repo, "index.html"), "utf8")));
{ // build.mjs must fail on a bad page: a CDN script left in, and a script that is not staged
  const fake = path.join(RUN, "fakerepo"); fs.mkdirSync(fake);
  for (const f of ["manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"]) fs.copyFileSync(path.join(repo, f), path.join(fake, f));
  fs.writeFileSync(path.join(fake, "a.js"), "1;");
  const html = fs.readFileSync(path.join(repo, "index.html"), "utf8").replace("</body>", '<script src="https://example.com/x.js"></script><script src="nope.js?v=1"></script></body>');
  fs.writeFileSync(path.join(fake, "index.html"), html);
  const r = spawnSync(process.execPath, [path.join(steam, "build.mjs"), path.join(RUN, "stage-bad")], { encoding: "utf8", env: { ...process.env, TL_BUILD_REPO: fake } });
  check("0e build.mjs exits 1 on a CDN script and on an unstaged local script", r.status === 1 && /example\.com/.test(r.stderr) && /nope\.js/.test(r.stderr), `exit ${r.status}; ${r.stderr.trim().split("\n").slice(0, 3).join(" / ")}`);
}
if (st.status !== 0) { console.log("cannot go on without a stage"); process.exit(1); }
spawnSync(process.execPath, [path.join(steam, "build.mjs")], { encoding: "utf8" });   // refresh steam/app for `electron .`

/* ================================================================ run 1: dev shell, boot, ride, save, TLDesktop.quit() */
const uA = path.join(RUN, "profile-A"); fs.mkdirSync(uA);
let g = await launch({ exe: electronBin(), args: ["."], userData: uA });
if (await bootAsserts("run1", g)) {
  const has = await raw(g, "JSON.stringify({ t: typeof window.TLDesktop, keys: Object.keys(window.TLDesktop || {}).sort(), v: window.TLDesktop && window.TLDesktop.version, p: window.TLDesktop && window.TLDesktop.platform })");
  const d = JSON.parse(has);
  check("run1 4a window.TLDesktop exists (quit, version, platform, setFullscreen, isFullscreen)", d.t === "object" && ["isFullscreen", "platform", "quit", "setFullscreen", "version"].every(k => d.keys.includes(k)), has);
  await ev(g, "GS.cash = 123457; save();");
  const f1 = await until(() => { const o = readSaveFile(uA); return o && cashInSave(o) === 123457 ? o : null; }, 15000);
  check("run1 5a the save file appears on its own (timer mirror) with the cash value", !!f1, f1 ? `t=${f1.t}, ${Object.keys(f1.keys).length} keys` : "no file");
  await ev(g, "GS.cash = 234567;");                      // no explicit save: the quit path must make the game save and flush
  const fs0 = await raw(g, "TLDesktop.isFullscreen()");
  check("run1 4b isFullscreen() is false in test mode (never full screen)", fs0 === false);
  await raw(g, "TLDesktop.quit()");
  const r = await endRun(g);
  check("run1 5b TLDesktop.quit() exits cleanly (code 0)", r.code === 0, JSON.stringify(r));
  const f2 = readSaveFile(uA);
  check("run1 5c the last change made just before quit is in the file (flush on quit)", f2 && cashInSave(f2) === 234567, f2 ? "cash in file " + cashInSave(f2) : "no file");
  check("run1 5d the file has the {v, t, keys} shape and only tracklayer.* keys", f2 && f2.v === 1 && typeof f2.t === "number" && Object.keys(f2.keys).length > 0 && Object.keys(f2.keys).every(k => k.startsWith("tracklayer.")) && !("tracklayer.desktop.t" in f2.keys));
  check("run1 5e a .bak of the previous good file exists", fs.existsSync(saveFileOf(uA) + ".bak"));
} else { await endRun(g); }

/* ================================================================ run 2: same profile; value there; removals mirrored; Quit by keyboard */
g = await launch({ exe: electronBin(), args: ["."], userData: uA });
if (await toMenu(g)) {
  const cash = await ev(g, "GS.cash");
  check("run2 5f same profile: the saved value is there", cash === 234567, "cash " + cash);
  const items = JSON.parse(await ev(g, "JSON.stringify(TT.items.map(i => i.id))"));
  check("run2 4c title menu shows Quit as its last entry", items[items.length - 1] === "quit", items.join(","));
  await raw(g, "localStorage.setItem('tracklayer.slot.9', 'x')");
  const added = await until(() => readSaveFile(uA)?.keys["tracklayer.slot.9"] === "x", 15000);
  await raw(g, "localStorage.removeItem('tracklayer.slot.9')");
  const gone = added && await until(() => { const o = readSaveFile(uA); return o && !("tracklayer.slot.9" in o.keys); }, 15000);
  check("run2 5g a key added then removed in localStorage is added to, then removed from, the file", !!added && !!gone);
  await key(g, "ArrowUp", "ArrowUp", 38);
  const sel = JSON.parse(await ev(g, "JSON.stringify({ i: TT.sel, id: TT.items[TT.sel].id, on: document.querySelector('#tMenu .ti.on .tl').textContent })"));
  check("run2 4d ArrowUp from the top lands on Quit (keyboard)", sel.id === "quit" && sel.on === "QUIT", JSON.stringify(sel));
  const gap = async () => JSON.parse(await raw(g, "JSON.stringify({ menu: Math.round(document.getElementById('tMenu').getBoundingClientRect().bottom), keys: Math.round(document.querySelector('.tkeys').getBoundingClientRect().top), h: innerHeight })"));
  let q1 = await gap();
  check("run2 4i with Quit selected the menu ends above the key-hint bar (1280x720)", q1.menu <= q1.keys, JSON.stringify(q1));
  await g.send("Emulation.setDeviceMetricsOverride", { width: 960, height: 540, deviceScaleFactor: 1, mobile: false }); await sleep(1200);
  q1 = await gap();
  check("run2 4j same at the smallest window, 960x540", q1.menu <= q1.keys, JSON.stringify(q1));
  await g.send("Emulation.clearDeviceMetricsOverride"); await sleep(600);
  await key(g, "Enter", "Enter", 13, "\r");
  const r = await endRun(g);
  check("run2 4e Enter on Quit exits cleanly (code 0)", r.code === 0, JSON.stringify(r));
} else { check("run2 reached the menu", false, g.logText().slice(-300)); await endRun(g); }

/* ================================================================ run 3: new profile with only the save file copied in */
const uC = path.join(RUN, "profile-C"); fs.mkdirSync(uC); copySaves(uA, uC);
g = await launch({ exe: electronBin(), args: ["."], userData: uC });
if (await toMenu(g)) {
  const cash = await ev(g, "GS.cash");
  check("run3 5h empty localStorage + save file only: the game comes up with the value from the file", cash === 234567, "cash " + cash);
  const stamp = Number(await raw(g, "localStorage.getItem('tracklayer.desktop.t')")), fileT = readSaveFile(uC)?.t;
  check("run3 5i the restore stamped localStorage with the file's time", stamp > 0 && stamp === fileT, `stamp ${stamp}, file t ${fileT}`);
  await raw(g, "document.querySelectorAll('#tMenu .ti')[document.querySelectorAll('#tMenu .ti').length - 1].click()");
  const r = await endRun(g);
  check("run3 4f clicking Quit exits cleanly (mouse)", r.code === 0, JSON.stringify(r));
} else { check("run3 reached the menu", false, g.logText().slice(-300)); await endRun(g); }

/* ================================================================ run 4: corrupt json, good .bak */
const uD = path.join(RUN, "profile-D"); fs.mkdirSync(uD); copySaves(uA, uD);
fs.copyFileSync(saveFileOf(uD), saveFileOf(uD) + ".bak"); fs.writeFileSync(saveFileOf(uD), '{"v":1,"t":17000000000');   // half-written
g = await launch({ exe: electronBin(), args: ["."], userData: uD });
if (await toMenu(g)) {
  const cash = await ev(g, "GS.cash");
  check("run4 5j corrupt save file + good .bak: restored from .bak", cash === 234567, "cash " + cash);
  check("run4 5k the corruption was logged and nothing threw", /save file corrupt/.test(g.logText()) && /restoring from the \.bak/.test(g.logText()) && g.errors.length === 0, g.errors.slice(0, 2).join(" | "));
  await raw(g, "TLDesktop.quit()"); await endRun(g);
} else { check("run4 reached the menu", false, g.logText().slice(-300)); await endRun(g); }

/* ================================================================ run 5: file AND .bak corrupt, localStorage has a good save: left alone */
fs.writeFileSync(saveFileOf(uA), "not json at all"); fs.writeFileSync(saveFileOf(uA) + ".bak", "{}");
g = await launch({ exe: electronBin(), args: ["."], userData: uA });
if (await toMenu(g)) {
  const cash = await ev(g, "GS.cash");
  check("run5 5l both files bad: localStorage is not wiped, no throw", cash === 234567 && g.errors.length === 0, `cash ${cash}; ${g.errors.slice(0, 2).join(" | ")}`);
  const neg = JSON.parse(await raw(g, "(async () => JSON.stringify({ net: await fetch('https://example.com/').then(() => 'LOADED', () => 'blocked'), trav: await fetch('/..%2fmain.js').then(r => r.status, () => 'err'), win: window.open('https://example.com/') === null })) ()"));
  const bl = JSON.parse(await raw(g, "fetch('/__tl_blocked').then(r => r.text())"));
  check("run5 3c negative control: an https fetch is cancelled and counted, window.open is denied, path traversal is refused (403)", neg.net === "blocked" && neg.trav === 403 && neg.win && bl.count >= 2, JSON.stringify({ ...neg, blocked: bl.count }));
  await raw(g, "TLDesktop.quit()"); await endRun(g);
} else { check("run5 reached the menu", false, g.logText().slice(-300)); await endRun(g); }

/* ================================================================ run 6: the packaged mac build */
const macApp = path.join(steam, "dist", "mac-arm64", "Tracklayer.app");
if (process.env.TL_SKIP_DIST === "1") skip("6 packaged mac build", "TL_SKIP_DIST=1");
else if (!fs.existsSync(macApp)) check("6 packaged mac build exists (npm run dist:mac)", false, macApp);
else {
  const uM = path.join(RUN, "profile-mac"); fs.mkdirSync(uM);
  g = await launch({ exe: path.join(macApp, "Contents", "MacOS", "Tracklayer"), userData: uM });
  const ok = await bootAsserts("run6 (packaged .app)", g);
  if (ok) {
    check("run6 4g packaged: window.TLDesktop exists and the menu has Quit", await raw(g, "typeof window.TLDesktop === 'object'") && JSON.parse(await ev(g, "JSON.stringify(TT.items.map(i => i.id))")).includes("quit"));
    await ev(g, "GS.cash = 4242; save();");
    const f = await until(() => { const o = readSaveFile(uM); return o && cashInSave(o) === 4242; }, 15000);
    check("run6 5m packaged: the save file is written under the user-data dir", !!f);
    await raw(g, "TLDesktop.quit()");
  }
  const r = await endRun(g);
  check("run6 packaged app exits cleanly (code 0)", r.code === 0, JSON.stringify(r));
}

/* ================================================================ 7: the Windows folder (not runnable here) */
const winDir = path.join(steam, "dist", "win-unpacked");
if (process.env.TL_SKIP_DIST === "1") skip("7 windows folder", "TL_SKIP_DIST=1");
else if (!fs.existsSync(winDir)) check("7 windows folder exists (npm run dist:win)", false, winDir);
else {
  check("7a Tracklayer.exe is in the Windows folder", fs.existsSync(path.join(winDir, "Tracklayer.exe")));
  const asarPath = path.join(winDir, "resources", "app.asar");
  let listed = [];
  try { listed = require("@electron/asar").listPackage(asarPath).map(s => s.replace(/\\/g, "/")); } catch (e) { try { listed = require(path.join(steam, "node_modules", "@electron", "asar")).listPackage(asarPath).map(s => s.replace(/\\/g, "/")); } catch (e2) { } }
  const staged = fs.readdirSync(appDir, { recursive: true }).filter(f => fs.statSync(path.join(appDir, f)).isFile()).map(f => "/app/" + f.split(path.sep).join("/"));
  const missing = staged.filter(f => !listed.includes(f));
  check("7b every staged app file is inside the Windows app.asar", listed.length > 0 && missing.length === 0, `${staged.length} staged files, ${missing.length} missing ${missing.slice(0, 3).join(" ")}`);
  check("7c main.js and preload.js are inside it", listed.includes("/main.js") && listed.includes("/preload.js"));
  console.log("      NOTE: Tracklayer.exe was NOT run (this is a Mac): Windows is UNVERIFIED beyond files being present.");
}

/* ================================================================ 4: Quit is absent without TLDesktop (plain headless Chrome on the staged copy) */
{
  const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" };
  const srv = http.createServer((q, s) => { const p = path.join(appDir, decodeURIComponent(new URL(q.url, "http://x").pathname).replace(/^\/$/, "/index.html")); if (!p.startsWith(appDir) || !fs.existsSync(p)) { s.writeHead(404).end(); return; } s.writeHead(200, { "content-type": mime[path.extname(p)] || "application/octet-stream" }).end(fs.readFileSync(p)); });
  await new Promise(r => srv.listen(0, "127.0.0.1", r));
  const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (!fs.existsSync(chrome)) skip("4h Quit absent in plain Chrome", "Google Chrome not installed");
  else {
    const port = await freePort(), prof = path.join(RUN, "profile-chrome");
    const proc = spawn(chrome, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, "--no-first-run", "--mute-audio", "--use-angle=metal", "--enable-unsafe-swiftshader", "--window-size=1280,720", `http://127.0.0.1:${srv.address().port}/index.html`], { stdio: "ignore" });
    try {
      const t = await until(async () => (await fetch(`http://127.0.0.1:${port}/json/list`).then(x => x.json())).find(x => x.type === "page" && x.url.includes("index.html")), 60000, 400);
      const c = t && await cdpConnect(t.webSocketDebuggerUrl);
      const q = c && await until(async () => { const r = await c.send("Runtime.evaluate", { expression: "JSON.stringify({ n: document.querySelectorAll('#tMenu .ti').length, labels: [...document.querySelectorAll('#tMenu .ti .tl')].map(e => e.textContent), td: typeof window.TLDesktop })", returnByValue: true }); const v = r.result && r.result.result && r.result.result.value; return v && JSON.parse(v).n >= 6 ? JSON.parse(v) : null; }, 120000, 1000);
      check("4h without TLDesktop (plain Chrome, same staged files) the menu has no Quit", !!q && q.td === "undefined" && !q.labels.includes("QUIT") && q.labels.includes("CREDITS"), q ? q.labels.join(",") : "menu never rendered");
      c && c.close();
    } finally { try { proc.kill("SIGKILL"); } catch (e) { } srv.close(); }
  }
}

console.log(fails ? `\nsmoke: ${fails} FAIL` : "\nsmoke: all PASS");
process.exit(fails ? 1 : 0);
