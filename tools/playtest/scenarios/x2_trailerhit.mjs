// 2.5/2.6 (beta fix 0285 #1): the sled trailer on a truck's ball is solid. Backed square into a rock it stops the truck and
// says so; off-centre it swings off the rock; a fast hit costs the trailer condition; the lowered ramp is part of it; a
// trailer cutting a corner into a rock is dragged round it; a real tree stops it too. Asserting: exit 1 on a failure.
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

// ---- A: back it square into a rock at walking pace
await ev("__clear()"); await settle(); await ev("__rock(5.5, 0, 1.3)"); await clearToasts();
let t0 = await T(), t = await drive(["KeyS"], 9);
const tsA = await toasts();
console.log("A", brief(t), "backed", r2(t0.pz - t.pz), JSON.stringify(tsA));
ok(t.fin, "A: all finite");
ok(t0.pz - t.pz > 1.2 && t0.pz - t.pz < 3.2, `A: the truck backs until the trailer meets the rock, then stops (${r2(t0.pz - t.pz)} m, 2.2 m of room)`);
ok(t.sp < 0.3, `A: held against it the truck stands still (${r2(t.sp)} m/s)`);
ok(t.clr > -0.05, `A: the trailer's hull never sank into the rock (deepest ${r2(t.clr)} m)`);
ok(t.axle > 3.2, `A: the axle stays ${r2(t.axle)} m from the rock's centre (was 0.15 m: through it)`);
ok(tsA.some(m => /trailer is hard against something solid/i.test(m)), "A: a line says the trailer is against something solid");
ok(t.cond === 100, `A: a walking-pace touch costs nothing (${t.cond}%)`);
await sideCam("[TLXV.haul().x, P.y + 0.8, TLXV.haul().z]", 8, 3, 1.2); await sleep(300); await shot("A_trailer_on_rock").catch(() => {}); await camOff();
const a1 = await T(); t = await drive(["KeyW"], 5);
ok(t.pz - a1.pz > 3, `A: pulling forward frees it (${r2(t.pz - a1.pz)} m in 5 s)`);

// ---- B: the same, 0.7 m off centre: the trailer swings off the rock, never into it
await ev("__clear()"); await settle(); await ev("__rock(5.5, 0.7, 1.3)"); await clearToasts();
t0 = await T(); t = await drive(["KeyS"], 12);
console.log("B", brief(t), "backed", r2(t0.pz - t.pz));
ok(t.fin, "B: all finite");
ok(t.clr > -0.05, `B: hull never in the rock (deepest ${r2(t.clr)} m)`);
ok(t.clr < 0.3, `B: it did reach the rock (nearest ${r2(t.clr)} m)`);
ok(Math.abs(t.rel) > 0.12 || t.sp < 0.3, `B: the trailer swung off it (${r2(t.rel)} rad) or the truck stopped (${r2(t.sp)} m/s)`);
ok(Math.abs(t.rel) <= 70 * Math.PI / 180 + 0.02, `B: never past the jackknife stop (${r2(t.rel)} rad)`);
const b1 = await T(); t = await drive(["KeyW"], 5);
ok(t.pz - b1.pz > 3, `B: pulling forward frees it (${r2(t.pz - b1.pz)} m)`);

// ---- C: a hard hit: 7 m/s backwards into the rock
await ev("__clear()"); await settle(); await ev("__rock(5.5, 0, 1.3)"); await clearToasts();
await ev("P.vz = -7; true"); t = await drive(["KeyS"], 2.5);
const tsC = await toasts();
console.log("C", brief(t), JSON.stringify(tsC));
ok(t.fin, "C: all finite");
ok(t.cond < 100 && t.cond > 60, `C: the trailer took damage (${r2(t.cond)}%)`);
ok(tsC.some(m => /The trailer hit something solid: the Fjordhenger sled trailer is at \d+%/.test(m)), "C: a line names the trailer and its condition");
ok(t.clr > -0.05, `C: hull never in the rock (deepest ${r2(t.clr)} m)`);
ok(t.sp < 1.5, `C: the hit stopped it (${r2(t.sp)} m/s)`);
await ev("TLXV.haul().cond = 100; true");

// ---- D: the ramp gate down is part of the trailer
await ev("__clear()"); await settle(); await ev("TLXV.haul().ramp = 1; __rock(5.6, 0, 1.3)"); await clearToasts();
await ev("P.vz = -3; true"); t = await drive(["KeyS"], 3);
console.log("D", brief(t));
ok(t.clr > -0.05 && t.clr < 0.3, `D: the ramp reached the rock and never sank into it (${r2(t.clr)} m)`);
ok(t.axle > 4.3, `D: the lowered ramp meets it first (axle ${r2(t.axle)} m off, 3.3 m with the ramp up)`);
await ev("TLXV.haul().ramp = 0; true");

// ---- E: forward, turning: a rock on the inside of the corner the trailer cuts. First the same turn with nothing there, to
// find a spot the trailer's hull sweeps into (0.2-0.6 m) and the truck's own hull clears.
await ev("__clear()"); await settle();
await ev(`window.__path = []; window.__pathI = setInterval(() => { const h = TLXV.haul(); window.__path.push([P.x, P.z, P.yaw, h.x, h.z, h.yaw]); }, 60); true`);
await drive(["KeyW", "KeyA"], 7);
const pick = await J(`(() => { clearInterval(window.__pathI); const A = window.__path, R0 = 1.0;
  for (const s of [1, -1]) for (let i = 8; i < A.length; i++) { const a = A[i]; if (Math.hypot(a[0] - A[0][0], a[1] - A[0][1]) < 4) continue;
    for (const into of [0.6, 0.45, 0.3, 0.2]) {
    const x = a[3] + Math.cos(a[5]) * s * (1.08 + R0 - into), z = a[4] - Math.sin(a[5]) * s * (1.08 + R0 - into); let clear = true, deep = 9;
    for (const b of A) { for (const off of [2, 0, -2]) if (Math.hypot(b[0] + Math.sin(b[2]) * off - x, b[1] + Math.cos(b[2]) * off - z) < 1.25 + R0 + 0.05) clear = false;
      for (const k of [-0.9, 0.2]) deep = Math.min(deep, Math.hypot(b[3] + Math.sin(b[5]) * k - x, b[4] + Math.cos(b[5]) * k - z) - 1.08 - R0); }
    if (clear && deep < -0.12) return { x, z, r: R0, deep, n: A.length }; } }
  return { n: A.length }; })()`);
ok(pick.x != null, `E: a spot the trailer cuts into and the truck clears (${pick.x != null ? r2(pick.deep) + " m into the trailer's sweep" : "none in " + pick.n + " samples"})`);
await settle();
if (pick.x != null) await ev(`(() => { const o = { x: ${pick.x}, z: ${pick.z}, r: ${pick.r}, top: surf(${pick.x}, ${pick.z}) + 1.8, rock: true }; addOb(o); window.__rocks.push(o); window.__clr = 9; return 1; })()`);
await clearToasts();
t0 = await T(); t = await drive(["KeyW", "KeyA"], 7);
console.log("E", brief(t), "moved", r2(Math.hypot(t.px - t0.px, t.pz - t0.pz)), JSON.stringify(await toasts()));
ok(t.fin, "E: all finite");
ok(t.clr < 0.1, `E: the trailer did cut in to the rock (nearest ${r2(t.clr)} m)`);
ok(t.clr > -0.05, `E: hull never in the rock (deepest ${r2(t.clr)} m)`);
ok(Math.hypot(t.px - t0.px, t.pz - t0.pz) > 5, `E: the truck drags it round and keeps going (${r2(Math.hypot(t.px - t0.px, t.pz - t0.pz))} m)`);
await sideCam("[TLXV.haul().x, P.y + 0.8, TLXV.haul().z]", 9, 4, 0.6); await sleep(300); await shot("E_trailer_round_rock").catch(() => {}); await camOff();

// ---- F: a real tree
await ev("__clear()");
const tree = await J(`(() => { let best = null, seen = 0; for (let r = 30; r < 4000 && !best; r += 20) for (let a = 0; a < 6.28 && !best; a += 0.25) {
  const x = ${spot.x} + Math.cos(a) * r, z = ${spot.z} + Math.sin(a) * r;
  for (const o of obstaclesNear(x, z, 10)) { if (o.tree === undefined || o.down || o.top === -Infinity) continue; seen++;
    const tx = o.x, tz = o.z + 16; if (isSea(tx, tz) || isWater(tx, tz) || isWater(o.x, o.z + 8) || slopeAt(o.x, o.z + 8, 8) > 0.12) continue;
    const near = obstaclesNear(o.x, o.z + 9, 16).filter(q => q !== o && !q.down && q.top !== -Infinity && Math.abs(q.x - o.x) < 2.6 + (q.r || 0) && q.z > o.z + 0.3 && q.z < o.z + 19);
    if (near.length) continue; window.__trees = [o]; best = { x: o.x, z: o.z, r: o.r, top: o.top - surf(o.x, o.z) }; break; } }
  return best || { seen }; })()`);
ok(tree.x != null, `F: found a tree with open ground in front of it${tree.x != null ? "" : " (" + tree.seen + " trees looked at)"}`);
if (tree.x != null) {
  await ev(`(() => { const o = window.__trees[0]; __place(${tree.x}, ${tree.z + 9.5}); window.__trees = [o]; window.__clr = 9; return 1; })()`);
  await waitGame(0.6); await clearToasts();
  t0 = await T(); await ev("P.vz = -8; true"); t = await drive(["KeyS"], 4);
  const tsF = await toasts();
  console.log("F", JSON.stringify(tree), brief(t), "backed", r2(t0.pz - t.pz), JSON.stringify(tsF));
  ok(t.fin, "F: all finite");
  ok(t.clr > -0.05, `F: hull never in the trunk (deepest ${r2(t.clr)} m)`);
  ok(t.clr < 0.3, `F: it reached the tree (nearest ${r2(t.clr)} m)`);
  ok(tsF.some(m => /The trailer hit a tree: the Fjordhenger sled trailer is at \d+%/.test(m)) && t.cond < 100, `F: a hard hit on a tree is named as one (${r2(t.cond)}%)`);
}
await done(fails ? 1 : 0);
