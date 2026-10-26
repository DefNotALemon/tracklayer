// Tracklayer CDP playtest library. Import from a scenario run by tools/playtest/run.sh:
//
//   import { boot, ev, hold, tap, shot, st, sideCam, camOff, park, done } from "../lib.mjs";
//   await boot();                       // load page, wait for the title, launch a fresh game, hide help
//   await hold("KeyW", 5000);           // hold a key for 5 s of WALL time
//   console.log(await st());            // rider/sled state snapshot
//   await shot("01_after");             // JPEG into $OUT
//   await done();                       // prints page errors, closes, exits
//
// ev(expr) runs inside the game's IIFE (window.__tl), so every internal is reachable: GS, P, FOOT, V, SLEDS,
// camera, renderer, gameClock... Headless runs at ~0.6x game speed (dt capped at 0.05): time and speed results
// by gameClock, never wall time (see timed()). Starting state is a brand-new save (fresh Chrome profile).
import fs from "node:fs";
export const OUT = process.env.OUT || "./shots";
const URL = process.env.TL_URL, PORT = process.env.TL_CDP;
fs.mkdirSync(OUT, { recursive: true });
export const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, id = 0; const pend = new Map();
export const errors = [];
export const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
export async function ev(expr) {
  const r = await send("Runtime.evaluate", { expression: "window.__tl(" + JSON.stringify(expr) + ")", returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error("ev failed: " + expr.slice(0, 120) + " :: " + (r.exceptionDetails.exception?.description || JSON.stringify(r.exceptionDetails)).slice(0, 500));
  return r.result?.value;
}
export async function raw(expr) {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error("raw failed: " + (r.exceptionDetails.exception?.description || "").slice(0, 500));
  return r.result?.value;
}
export async function shot(name, quality = 85) {
  const r = await send("Page.captureScreenshot", { format: "jpeg", quality });
  const f = `${OUT}/${name}.jpg`; fs.writeFileSync(f, Buffer.from(r.data, "base64")); return f;
}
const VK = { KeyW: 87, KeyS: 83, KeyA: 65, KeyD: 68, KeyQ: 81, KeyE: 69, KeyR: 82, KeyF: 70, KeyH: 72, KeyM: 77, KeyT: 84, KeyB: 66, KeyV: 86, KeyC: 67, KeyG: 71, KeyJ: 74, KeyK: 75, KeyL: 76, KeyN: 78, KeyP: 80, KeyX: 88, KeyZ: 90, KeyI: 73, KeyO: 79, KeyU: 85, KeyY: 89,
  Space: 32, ShiftLeft: 16, ControlLeft: 17, Enter: 13, Escape: 27, Tab: 9, ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39,
  Digit1: 49, Digit2: 50, Digit3: 51, Digit4: 52, Digit5: 53, Digit6: 54, Digit7: 55, Digit8: 56, Digit9: 57, Digit0: 48 };
const keyName = code => code.startsWith("Key") ? code.slice(3).toLowerCase() : code.startsWith("Digit") ? code.slice(5) : code === "Space" ? " " : code.replace("Left", "");
export const key = (type, code) => send("Input.dispatchKeyEvent", { type, code, key: keyName(code), windowsVirtualKeyCode: VK[code] || 0 });
export const down = code => key("keyDown", code);
export const up = code => key("keyUp", code);
export async function tap(code, ms = 70) { await down(code); await sleep(ms); await up(code); }
export async function hold(codes, ms) { codes = [].concat(codes); for (const c of codes) await down(c); await sleep(ms); for (const c of codes) await up(c); }
export async function click(x, y) { for (const type of ["mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 }); }

// One snapshot of what matters for walking / riding / progression. Extend freely.
export const st = async () => JSON.parse(await ev(`JSON.stringify({
  t: +gameClock.toFixed(2), onFoot: !!FOOT.on, ski: !!FOOT.ski,
  foot: FOOT.on ? { x: +FOOT.x.toFixed(1), z: +FOOT.z.toFixed(1), sp: +FOOT.sp.toFixed(2), tired: +(FOOT.tired||0).toFixed(2), strain: +(FOOT.strain||0).toFixed(2) } : null,
  sled: { id: GS.own.sled, x: +P.x.toFixed(1), z: +P.z.toFixed(1), mph: +(Math.hypot(P.vx||0, P.vz||0) * 2.237).toFixed(1) },
  cash: Math.round(GS.cash), delivered: GS.delivered, rank: rankOf(GS.delivered).name, fuel: +(GS.fuel||0).toFixed(1), hour: +(GS.hour % 24).toFixed(2)
})`));

// Measure over GAME time: hold keys until gameClock advanced by `gameSecs`, sampling fn() each ~0.5 s game.
export async function timed(codes, gameSecs, fn = st) {
  codes = [].concat(codes); const t0 = await ev("gameClock"), samples = [];
  for (const c of codes) await down(c);
  try { for (;;) { await sleep(300); const t = await ev("gameClock"); samples.push(await fn()); if (t - t0 >= gameSecs) break; } }
  finally { for (const c of codes) await up(c); }
  return samples;
}

// Camera override for stills: sideCam(() => [x,y,z] target expr string, dist, height, yaw offset). camOff() restores.
let camHooked = false;
export async function sideCam(targetExpr = "[FOOT.on ? FOOT.x : P.x, (FOOT.on ? FOOT.y : P.y) + 0.8, FOOT.on ? FOOT.z : P.z]", dist = 2.8, h = 2, yawOff = 1.5708) {
  if (!camHooked) { await ev(`(() => { const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); }; return true; })()`); camHooked = true; }
  await ev(`window.camOv = c => { const T = ${targetExpr}, yaw = (FOOT.on ? FOOT.yaw : P.yaw) + ${yawOff}; c.position.set(T[0] + Math.sin(yaw) * ${dist}, T[1] + ${h}, T[2] + Math.cos(yaw) * ${dist}); c.lookAt(T[0], T[1] + 0.2, T[2]); }; true`);
  await sleep(250);
}
export const camOff = () => ev("window.camOv = null; true");

// Teleport the sled to open, gentle, obstacle-free ground near (cx, cz). Returns {x,z} or null.
export const park = (cx = "P.x + 400", cz = "P.z + 300") => ev(`(() => {
  const cx = ${cx}, cz = ${cz};
  for (let r = 0; r < 1500; r += 20) for (let a = 0; a < 6.28; a += 0.5) {
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    if (isSea(x, z) || (typeof isWater === "function" && isWater(x, z))) continue;
    if (Math.abs(groundAt(x + 20, z) - groundAt(x - 20, z)) > 1.2 || Math.abs(groundAt(x, z + 20) - groundAt(x, z - 20)) > 1.2) continue;
    if (obNear(x, z, 30)) continue;
    P.x = x; P.z = z; P.y = surf(x, z) + 0.3; P.vx = P.vz = P.vy = 0; P.yaw = 0; recenter(x, z, true);
    return { x: Math.round(x), z: Math.round(z) };
  }
  return null; })()`);

export async function boot({ width = 1280, height = 720 } = {}) {
  const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" }); const p = await r.json();
  ws = new WebSocket(p.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  ws.onmessage = m => { const d = JSON.parse(m.data);
    if (d.id && pend.has(d.id)) { pend.get(d.id)(d.result || {}); pend.delete(d.id); }
    else if (d.method === "Runtime.exceptionThrown") errors.push("EXC " + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).slice(0, 400));
    else if (d.method === "Runtime.consoleAPICalled" && d.params.type === "error") errors.push("ERR " + d.params.args.map(a => a.value || a.description).join(" ").slice(0, 300)); };
  await send("Runtime.enable"); await send("Page.enable"); await send("Network.enable"); await send("Network.setCacheDisabled", { cacheDisabled: true });
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: URL });
  let ok = false;
  for (let i = 0; i < 120; i++) { await sleep(500); try { if (await raw("typeof window.__tl === 'function' && window.__tl(\"typeof titleLaunch === 'function' && TT.mode === 'menu'\")")) { ok = true; break; } } catch (e) { } }
  if (!ok) { console.log("BOOT FAILED: title menu never appeared.", errors.join("\n")); await done(3); }
  await sleep(1200);
  await ev("titleLaunch(); true"); await sleep(3000);
  await tap("KeyH");          // hide the help panel
  await sleep(500);
}

export async function done(code = 0) {
  console.log(errors.length ? "PAGE ERRORS:\n" + errors.join("\n") : "page errors: none");
  try { ws && ws.close(); } catch (e) { }
  process.exit(code || (errors.some(e => e.startsWith("EXC")) ? 1 : 0));
}
