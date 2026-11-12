// 3.1 beta (pad + night): the pickup driven along the roads at night with a scripted Xbox pad (RT + left stick pure pursuit),
// then with touch UI on; mid-drive reload; pickup lights/hint text per scheme; closed road sign text under pad.
import { boot, ev, sleep, done, shot, sideCam, camOff, padSet, padOff, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
const prep = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 23; GS.cash = 9000; true`;
await boot();
await ev(prep); await sleep(600);
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400); await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400); await ev(`closeGarage(); true`);
const seat = async () => {
  await ev(`(() => { const r = TLX.state("vehicles").owned[0]; const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); crashCancel(); FOOT.on = true; FOOT.x = r.x + fz * 3 - fx * 0.3; FOOT.z = r.z - fx * 3 - fz * 0.3; FOOT.yaw = r.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
  await sleep(800); await padSet({}, [0.6, 0, 0, 0]); await sleep(250); await padSet(); await sleep(400); await padSet({ 4: 1 }); await sleep(150); await padSet(); await sleep(300);
  return waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14);
};
await ev(`(() => { const r = TLX.state("vehicles").owned[0]; return 1; })()`);
let seated = await seat();
if (!seated) { // pad button for GET ON may differ: fall back to the keyboard and note it
  console.log("pad Y did not seat; hint was:", await ev(`$("wnHint").textContent`));
  const { tap } = await import("../lib.mjs"); await tap("KeyQ"); seated = await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14);
  ok(false, "pad Y (north) seats the walker in the pickup");
}
ok(seated, "seated in the pickup");
const routes = await J(`TLXR.routes.map((r, i) => ({ i, id: r.id, closed: r.closed, n: r.pts.length }))`);
const place = (ri, idx) => ev(`(() => { const r = TLXR.routes[${ri}]; const a = r.pts[${idx}], b = r.pts[Math.min(r.pts.length - 1, ${idx} + 3)]; BOG.on = false; BOG.acc = 0; BOG.immune = 0; crashCancel(); P.x = a[0]; P.z = a[1]; P.yaw = Math.atan2(b[0] - a[0], b[1] - a[1]); P.vx = P.vz = P.vy = 0; P.y = surf(a[0], a[1]) + 0.2; recenter(a[0], a[1], true); return 1; })()`);
const steer = (ri) => J(`(() => { const r = TLXR.routes[${ri}]; let bi = 0, bd = 1e9; for (let i = 0; i < r.pts.length; i++) { const d = Math.hypot(r.pts[i][0] - P.x, r.pts[i][1] - P.z); if (d < bd) { bd = d; bi = i; } }
  let j = bi, acc = 0; while (j < r.pts.length - 1 && acc < 14) { acc += Math.hypot(r.pts[j + 1][0] - r.pts[j][0], r.pts[j + 1][1] - r.pts[j][1]); j++; }
  const t = r.pts[j]; let e = Math.atan2(t[0] - P.x, t[1] - P.z) - P.yaw; while (e > Math.PI) e -= 2 * Math.PI; while (e < -Math.PI) e += 2 * Math.PI;
  return { bi, bd, e, end: bi >= r.pts.length - 3, v: Math.hypot(P.vx, P.vz), bog: BOG.on, crash: !!(CRASH && CRASH.on) }; })()`);
async function drive(ri, idx, secs, tag) {
  await place(ri, idx); await waitGame(1.2);
  const t0 = await clock(); let maxOff = 0, vs = [], bogs = 0, wasBog = false, last = null, i0 = null;
  try {
    while ((await clock()) - t0 < secs) {
      const s = await steer(ri); last = s;
      if (!drive.dumped && tag.includes("dyfjord") && (await clock()) - t0 > 4) { drive.dumped = true; console.log("dump", await ev(`JSON.stringify({ v: Math.hypot(P.vx, P.vz), vy: P.vy, pitch: P.pitch, roll: P.roll, y: P.y, ground: surf(P.x, P.z), bog: BOG.on, acc: BOG.acc, crash: CRASH && CRASH.on, dev: INP.dev, fuel: GS.fuel, gear: GB.gear, paused: typeof paused !== "undefined" ? paused : null, mode: TT.mode, toasts: [...document.querySelectorAll("#toasts *")].map(e => e.textContent).slice(-3), toastq: typeof TOASTQ !== "undefined" ? TOASTQ.slice(-3) : null, flipHidden: $("flip").hidden, flipTxt: $("flip").textContent, sink: P.sink, wet: P.wet, slush: P.slush, thin: P.thin, rig: TLXV.rigOn(), drag: P.drag, exc: P.exc, rpm: P.rpm, input: typeof input !== "undefined" ? input : null, cur: VEH.cur && Object.fromEntries(Object.entries(VEH.cur).filter(([k, v]) => typeof v !== "object" && typeof v !== "function")), brake: typeof held !== "undefined" ? 1 : 0, hb: P.hb, pk: P.parked, keys: Object.keys(P).filter(k => /brake|park|hold|lock|stuck|still/i.test(k)).map(k => k + "=" + P[k]), pad: window.__fakePad && window.__fakePad.buttons[7].value, ax: window.__fakePad && window.__fakePad.axes[0] })`)); } if (i0 === null) i0 = s.bi; maxOff = Math.max(maxOff, s.bd); vs.push(s.v);
      if (s.bog && !wasBog) bogs++; wasBog = s.bog;
      // pad: stick left = negative x. e>0 means target is to the left (A key) so axis = -k
      const ax = Math.max(-1, Math.min(1, -s.e * 1.6));
      await padSet({ 7: 1 }, [ax, 0, 0, 0]);
      if (s.end || s.crash) break; await sleep(100);
    }
  } finally { await padSet(); }
  const o = { tag, idxMoved: last.bi - i0, dt: +((await clock()) - t0).toFixed(1), vmean: +(vs.reduce((a, b) => a + b, 0) / Math.max(1, vs.length)).toFixed(1), maxOff: +maxOff.toFixed(1), bogs, endBog: last.bog };
  o.wetEnd = await J(`({ wet: P.wet, sink: P.sink, wl: P.wl, sea: isSea(P.x, P.z), water: isWater(P.x, P.z), x: Math.round(P.x), z: Math.round(P.z), y: P.y, g: surf(P.x, P.z), v: Math.hypot(P.vx, P.vz) })`);
  console.log(JSON.stringify(o)); return o;
}
const gentle = routes.filter(r => !r.closed && /gamvik|dyfjord/.test(r.id));
console.log("routes", JSON.stringify(routes.map(r => r.id)));
const hint = await J(`({ dev: INP.dev, hint: $("wnHint").textContent, hud: [...document.querySelectorAll("#hud *")].filter(e => /hitch|get on|get off|key|press/i.test(e.textContent) && e.children.length === 0 && e.offsetParent).map(e => e.textContent).slice(0, 4) })`);
console.log("pad hud", JSON.stringify(hint));
ok(hint.dev === "pad", "INP.dev is pad after pad input (" + hint.dev + ")");
for (const r of gentle) {
  const o = await drive(r.i, Math.floor(r.n * 0.3), 20, "pad night " + r.id);
  console.log("dev", await ev("INP.dev"), "veh", await ev("!!VEH.cur"), "foot", await ev("FOOT.on"));
  ok(o.idxMoved > 30 && o.bogs === 0, `${r.id}: pad at night covers the road (idx +${o.idxMoved}, bogs ${o.bogs}, off ${o.maxOff} m, mean ${o.vmean})`);
  if (r === gentle[0]) { await sideCam(undefined, 7, 2.4, Math.PI * 0.8); await sleep(300); await shot("pad_night_" + r.id); await camOff(); }
}
// lights at night: headlight flag present and ground in front lit?
const lit = await J(`({ hour: GS.hour, lights: typeof VEH !== "undefined" && VEH.cur ? Object.keys(VEH).slice(0, 12) : null, poleN: TLXR.poles })`);
console.log("lit", JSON.stringify(lit));
// mid-drive reload on the road, resume
const rr = gentle[0];
await place(rr.i, Math.floor(rr.n * 0.5)); await waitGame(0.8);
const pos0 = await J(`({ x: P.x, z: P.z, veh: !!VEH.cur })`);
await padSet({ 7: 1 }, [0, 0, 0, 0]); await waitGame(2.5); await padSet();
await ev(`window.dispatchEvent(new Event("pagehide")); true`); await sleep(400);
await reload(); await ev(`tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; true`); await sleep(1500);
const after = await J(`({ veh: !!VEH.cur, foot: FOOT.on, x: P.x, z: P.z, roads: TLXR.ready, err: TLXR.err || null, hour: GS.hour })`);
console.log("after reload", JSON.stringify(pos0), JSON.stringify(after));
ok(after.roads && !after.err, "roads rebuilt after mid-drive reload");
ok(after.veh === pos0.veh, "same vehicle state after reload (veh " + after.veh + ")");
// touch scheme on the road
await padOff();
await ev(`SET.touch = "on"; setTouchUI(); true`); await sleep(500);
const tt = await J(`({ btns: [...document.querySelectorAll("#touch button, .tc button, [id^=tc]")].filter(e => e.offsetParent).map(e => e.id + ":" + e.textContent.trim()).slice(0, 14) })`);
console.log("touch ui", JSON.stringify(tt));
await shot("touch_after_reload");
console.log("fails", fails);
await done(fails ? 1 : 0);
