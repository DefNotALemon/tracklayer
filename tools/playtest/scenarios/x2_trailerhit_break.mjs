// 2.5 break test (beta 0335): the solid sled trailer under hostile placements: pinched, overlapped, side-swiped, thin post, hit then save. Asserting.
import { boot, ev, tap, sleep, done, down, up, shot, sideCam, camOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80);
  return 1; })()`);

await boot(); await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`);
await ev(`GS.cash = 9000; garageTab = "trucks"; openGarage(); true`); await sleep(500);
await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400);
await ev(`[...document.querySelectorAll("#garageBody .row")].find(e => /Fjordhenger/.test(e.textContent)).click(); closeGarage(); true`); await sleep(400);
ok(!!(await ev(`TLXV.haul() ? 1 : 0`)), "bought truck + trailer");
const spot = await J(`(() => { for (let r = 0; r < 3000; r += 25) for (let a = 0; a < 6.28; a += 0.4) {
  const x = 900 + Math.cos(a) * r, z = -600 + Math.sin(a) * r;
  if (isSea(x, z) || isWater(x, z) || obNear(x, z, 60) || nearSite(x, z, 80) || slopeAt(x, z, 8) > 0.03 || slopeAt(x, z + 40, 8) > 0.03 || slopeAt(x, z - 40, 8) > 0.03) continue;
  return { x, z }; } return null; })()`);
ok(!!spot, "flat open spot"); if (!spot) await done(1);
await ev(`(() => { const S = ${JSON.stringify(spot)}, r = TLX.state("vehicles").owned[0], h = TLXV.haul();
  r.x = S.x; r.z = S.z; r.yaw = 0; crashCancel(); FOOT.on = false;
  const bz = r.z - 3.1 - 0.9; h.on = null; h.x = r.x; h.z = bz - TLXV.HAUL.L; h.yaw = 0; h.ramp = 0; recenter(r.x, r.z, true); return 1; })()`);
await sleep(500);
await ev(`(() => { const h = TLXV.haul(), c = TLXV.haulCoupler(h), lx = Math.cos(h.yaw), lz = -Math.sin(h.yaw); FOOT.on = true; FOOT.x = c[0] + lx * 1.6; FOOT.z = c[1] + lz * 1.6; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.yaw = h.yaw - Math.PI / 2; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await waitGame(0.8); await tap("KeyE"); await waitGame(0.6);
ok((await ev(`TLXV.haul().on`)) === "v1", "trailer hitched");
await ev(`(() => { const r = TLX.state("vehicles").owned[0]; const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); FOOT.on = true; FOOT.x = r.x + fz * 3.2; FOOT.z = r.z - fx * 3.2; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.yaw = r.yaw - 1.4; FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(1200); await tap("KeyQ");
for (let i = 0; i < 80 && !(await ev("!MNT.on && !FOOT.on && !!VEH.cur")); i++) await sleep(200);
await waitGame(0.5);
ok(!!(await ev("VEH.cur ? 1 : 0")), "driving the truck");

// the in-page kit: place the outfit, plant and clear rocks (in the trailer's own frame), and a per-frame clearance meter
await ev(`(() => {
  window.__rocks = [];
  window.__place = (x, z) => { const h = TLXV.haul(); crashCancel(); FOOT.on = false; P.x = x; P.z = z; P.yaw = 0; P.vx = P.vz = 0; P.y = surf(x, z); h.x = x; h.z = z - 9; h.yaw = 0; h.ramp = 0; recenter(x, z, true); window.__clr = 9; return 1; };
  window.__rock = (back, side, r) => { const h = TLXV.haul(), fx = Math.sin(h.yaw), fz = Math.cos(h.yaw);
    const o = { x: h.x - fx * back + fz * side, z: h.z - fz * back - fx * side, r, top: surf(h.x, h.z) + 1.8, rock: true }; addOb(o); window.__rocks.push(o); window.__clr = 9; return { x: o.x, z: o.z, r }; };
  window.__clear = () => { for (const o of window.__rocks) { o.down = true; o.top = -Infinity; dropOb(o); } window.__rocks = []; window.__trees = null; return 1; };
  window.__clr = 9;
  const HULL = [[-0.9, 1.08], [0.2, 1.08], [1.4, 0.95]];
  const loop = () => { const h = TLXV.haul(); if (h) { const fx = Math.sin(h.yaw), fz = Math.cos(h.yaw), list = window.__rocks.concat(window.__trees || []);
      for (const C of (h.ramp > 0.5 ? HULL.concat([[-2.3, 0.8]]) : HULL)) for (const o of list) { const c = Math.hypot(h.x + fx * C[0] - o.x, h.z + fz * C[0] - o.z) - C[1] - o.r; if (c < window.__clr) window.__clr = c; } }
    requestAnimationFrame(loop); };
  requestAnimationFrame(loop); return 1; })()`);
const T = () => J(`(() => { const h = TLXV.haul(), R = TLXV.rt(), o = window.__rocks[0] || (window.__trees || [])[0]; return { px: P.x, pz: P.z, hx: h.x, hz: h.z, sp: Math.hypot(P.vx, P.vz), rel: Math.atan2(Math.sin(h.yaw - P.yaw), Math.cos(h.yaw - P.yaw)), cond: h.cond, clr: window.__clr,
  axle: o ? Math.hypot(h.x - o.x, h.z - o.z) : null, why: R && R.why, haulTouch: !!(R && R.touchHaul), fin: [P.x, P.z, P.vx, P.vz, h.x, h.z, h.yaw].every(Number.isFinite) }; })()`);
const r2 = v => v == null ? v : +v.toFixed(2);
const brief = t => JSON.stringify({ sp: r2(t.sp), rel: r2(t.rel), cond: r2(t.cond), clr: r2(t.clr), axle: r2(t.axle), why: t.why });
const settle = async () => { await ev(`__place(${spot.x}, ${spot.z})`); await waitGame(0.6); };
async function drive(keys, secs) { for (const k of keys) await down(k); await waitGame(secs); const t = await T(); for (const k of keys) await up(k); return t; }
const fin = t => t.fin;
await ev("__clear()"); await settle(); await ev("__rock(5.0, 1.75, 1.0); __rock(5.0, -1.75, 1.0)"); await clearToasts();
let t0 = await T(), t = await drive(["KeyS"], 8);
console.log("G", brief(t), "backed", r2(t0.pz - t.pz), JSON.stringify(await toasts()));
ok(fin(t), "G: all finite");
ok(t.clr > -0.1, `G: hull not through either rock (deepest ${r2(t.clr)} m)`);
ok(Number.isFinite(t.rel) && Math.abs(t.rel) <= 70 * Math.PI / 180 + 0.02, `G: within the jackknife stop (${r2(t.rel)})`);
await ev("__clear()"); await settle(); await ev("__rock(0.2, 0.3, 1.0)"); await clearToasts();
await waitGame(1.5); t = await T();
console.log("H", brief(t));
ok(fin(t) && Math.hypot(t.px - spot.x, t.pz - spot.z) < 15, `H: nothing flew off (${r2(Math.hypot(t.px - spot.x, t.pz - spot.z))} m)`);
t0 = await T(); t = await drive(["KeyW"], 3);
ok(fin(t) && t.pz - t0.pz > 2, `H: still drives afterwards (${r2(t.pz - t0.pz)} m)`);
await ev("__clear()"); await settle(); await ev("__rock(0.2, 2.4, 1.0)"); await ev("P.vz = 12; true"); await clearToasts();
t0 = await T(); t = await drive(["KeyW", "KeyA"], 3);
console.log("I", brief(t), "moved", r2(Math.hypot(t.px - t0.px, t.pz - t0.pz)), JSON.stringify(await toasts()));
ok(fin(t), "I: all finite");
ok(t.clr > -0.15, `I: hull not through the rock (deepest ${r2(t.clr)} m)`);
ok(t.cond >= 0 && t.cond <= 100, `I: condition sane (${r2(t.cond)})`);
await ev("__clear()"); await settle(); await ev("__rock(5.5, 0, 0.15)"); await ev("P.vz = -9; true"); await clearToasts();
t = await drive(["KeyS"], 3);
console.log("J", brief(t), JSON.stringify(await toasts()));
ok(fin(t), "J: all finite");
ok(t.clr > -0.15, `J: thin post: hull not through it (deepest ${r2(t.clr)} m)`);
await ev("__clear()"); await settle(); await ev("__rock(5.5, 0, 1.3)"); await ev("P.vz = -7; true");
await drive(["KeyS"], 2);
const before = await J(`({ cond: TLXV.haul().cond, on: TLXV.haul().on })`);
console.log("K", JSON.stringify(before));
ok(before.cond < 100, `K: trailer damaged (${r2(before.cond)})`);
await done(fails ? 1 : 0);
