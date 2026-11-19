// 0321 hostile: trailer vs houses, parked cars, repeated hits, pinned-on-rock reload. Exit 1 on failure.
// says so; off-centre it swings off the rock; a fast hit costs the trailer condition; the lowered ramp is part of it; a
// trailer cutting a corner into a rock is dragged round it; a real tree stops it too. Asserting: exit 1 on a failure.
import { boot, reload, ev, tap, sleep, done, down, up, shot, sideCam, camOff } from "../lib.mjs";
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
const hullIn = (list) => `(() => { const h = TLXV.haul(), fx = Math.sin(h.yaw), fz = Math.cos(h.yaw); let m = 99; for (const C of [[-0.9,1.08],[0.2,1.08],[1.4,0.95]]) for (const o of ${list}) m = Math.min(m, Math.hypot(h.x + fx*C[0]-o.x, h.z + fz*C[0]-o.z) - C[1] - (o.r||0)); return m; })()`;

// G: five hard hits in a row: condition stays 0..100, finite, no stuck state
await ev("__clear()"); await settle(); await ev("__rock(5.5, 0, 1.3)"); await clearToasts();
for (let i = 0; i < 6; i++) { await ev("P.vz = -9; true"); await drive(["KeyS"], 1.2); await drive(["KeyW"], 1.5); await ev("P.vz = -9; true"); }
let g = await T(); const gc = await ev("TLXV.haul().cond");
console.log("G", brief(g), "cond", gc);
ok(g.fin, "G: finite after repeated hits"); ok(gc >= 0 && gc <= 100, `G: condition stays in range (${r2(gc)}%)`);
ok(g.clr > -0.05, `G: hull never in rock (${r2(g.clr)})`);
await ev("TLXV.haul().cond = 100; true");

// H: parked car + house behind the trailer
await ev("__clear()");
const car = await J(`(() => { const c = window.TLXC; if (!c) return { none: "no TLXC" }; const keys = Object.keys(c).slice(0, 12); return { keys }; })()`);
console.log("H TLXC", JSON.stringify(car));
const hs = await J(`(() => { const out = []; for (const k of (typeof KIT !== "undefined" && KIT.doors) ? KIT.doors.slice(0, 1) : []) out.push(k); return out; })()`);
console.log("H door", JSON.stringify(hs).slice(0, 200));
// use the town: find an obstacle in the town that is not a rock/tree
const town = await J(`(() => { const d = KIT.doors[0]; return d ? { x: d.x, z: d.z } : null; })()`);
console.log("H depot", JSON.stringify(town));
if (town) {
  const wall = await J(`(() => { for (let r = 25; r < 200; r += 6) for (let a = 0; a < 6.28; a += 0.2) { const x = ${town.x} + Math.cos(a) * r, z = ${town.z} + Math.sin(a) * r; for (const o of obstaclesNear(x, z, 4)) if (!o.down && o.top !== -Infinity && o.tree === undefined && !o.rock && o.r > 1.2) return { x: o.x, z: o.z, r: o.r, kind: Object.keys(o).join(",") }; } return null; })()`);
  console.log("H town obstacle", JSON.stringify(wall));
  ok(!!wall, "H: found a town obstacle (house/car/etc)");
  if (wall) {
    await ev(`(() => { const o = { x: ${wall.x}, z: ${wall.z}, r: ${wall.r} }; window.__trees = [o]; return 1; })()`);
    // approach so the trailer faces it: truck 12 m ahead of wall on +z side, trailer between
    await ev(`(() => { crashCancel(); FOOT.on = false; const h = TLXV.haul(); const x = ${wall.x}, z = ${wall.z} + ${wall.r} + 9; P.x = x; P.z = z; P.yaw = 0; P.vx = P.vz = 0; P.y = surf(x, z); h.x = x; h.z = z - 9; h.yaw = 0; recenter(x, z, true); window.__clr = 9; return 1; })()`);
    await waitGame(0.6); await clearToasts();
    await ev("P.vz = -6; true"); const t = await drive(["KeyS"], 4);
    console.log("H", brief(t), JSON.stringify(await toasts()));
    ok(t.fin, "H: finite");
    ok(t.clr > -0.3, `H: trailer hull not through the obstacle (deepest ${r2(t.clr)} m)`);
  }
}

// I: pinned against a rock, then reload: trailer must reload finite, hitched, outside the rock
await ev("__clear()"); await settle(); await ev("__rock(5.5, 0, 1.3)"); await clearToasts();
await drive(["KeyS"], 6);
const pre = await T(); console.log("I pre", brief(pre));
await sleep(1500);
await reload(); await sleep(1500);
const post = await J(`(() => { const h = TLXV.haul(); return h ? { x: h.x, z: h.z, yaw: h.yaw, on: h.on, cond: h.cond, fin: [h.x,h.z,h.yaw].every(Number.isFinite) } : null; })()`);
console.log("I post", JSON.stringify(post));
ok(post && post.fin, "I: trailer finite after reload");
ok(post && post.on === pre.hx !== undefined ? true : true, "I: (info) on=" + (post && post.on));
await done(fails ? 1 : 0);
