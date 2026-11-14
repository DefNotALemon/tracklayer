// Beta break of v190 "a held truck says why" (2.3 pickup): trees/boulders, brake+gas, steep forward, repeated holds, night,
// 8 s hold toast count, pad RT against the sled, reload mid-hold. Prints findings; exit 1 only on page errors/NaN.
import { boot, ev, sleep, done, park, down, up, padSet, reload, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
const toasts = () => J(`[...document.querySelectorAll("#toasts > *")].map(e => e.textContent).concat((TOASTQ || []).map(t => t.msg))`);
const clr = () => ev(`document.getElementById("toasts").innerHTML = ""; if (TOASTQ) TOASTQ.length = 0; (() => { const R = TLXV.rt(); R.stillTold = false; R.stillT = 0; R.why = ""; BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; return 1; })()`);
const pos = () => J(`({ x: P.x, z: P.z, fin: [P.x, P.y, P.z, P.yaw].every(Number.isFinite) })`);
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
async function hold(press, release, s, tag) {
  await clr(); await waitGame(0.3); const p0 = await pos(), t0 = await clock(); await press();
  let why = "", t = 0, seen = [];
  while ((t = (await clock()) - t0) < s) { why = await ev(`TLXV.rt().why || ""`); if (why && !seen.length) seen.push(t); await sleep(100); }
  const ts = await toasts(); await release(); await waitGame(0.5);
  const r = { tag, why, first: seen[0], toasts: ts, moved: dist(await pos(), p0) }; console.log(tag, JSON.stringify(r)); return r;
}
async function enterPickup() {
  await ev(`GS.cash = 9000; garageTab = "trucks"; openGarage(); true`); await sleep(500);
  await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(400);
  await ev(`(() => { const r = TLX.state("vehicles").owned[0], fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); crashCancel(); FOOT.on = true; FOOT.x = r.x + fz * 3.2; FOOT.z = r.z - fx * 3.2; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.yaw = r.yaw - 1.4; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
  await sleep(800); await down("KeyQ"); await sleep(120); await up("KeyQ");
  const t0 = await clock(); while ((await clock()) - t0 < 14) { if (await ev("!MNT.on && !FOOT.on && !!VEH.cur")) return true; await sleep(150); }
  return false;
}
await boot();
await ev(`tutSkip(); true`); await sleep(600); await ev(`crashCancel(); FOOT.on = false; true`); await park(); await sleep(400);
ok(await enterPickup(), "in the pickup");

// lane
const lane = await J(`(() => { let best = null; for (const Y of YARDS) { if (Y.x2 === undefined || Math.hypot(Y.x - depot.x, Y.z - depot.z) > TOWN_R || Y.r > 5) continue; const L = Math.hypot(Y.x2 - Y.x, Y.z2 - Y.z); if (!best || L > best.L) best = { x: Y.x, z: Y.z, x2: Y.x2, z2: Y.z2, L }; } return best; })()`);
const onLane = (off) => ev(`(() => { const L = ${JSON.stringify(lane)}, ux = (L.x2 - L.x) / L.L, uz = (L.z2 - L.z) / L.L; P.x = L.x + ux * L.L * 0.5; P.z = L.z + uz * L.L * 0.5; P.yaw = Math.atan2(ux, uz); P.vx = P.vz = 0; P.y = surf(P.x, P.z);
  const s = TLX.state("vehicles").sled; if (s) { const o = ${off}; if (o) { s.x = P.x + ux * o; s.z = P.z + uz * o; } else { s.x = P.x + 60; s.z = P.z + 60; } } recenter(P.x, P.z, true); return !!s; })()`);

// 1: brake+gas at a standstill on an open lane: should it warn? (W+S held)
await onLane(0); await waitGame(1.2);
const r1 = await hold(async () => { await down("KeyW"); await down("KeyS"); }, async () => { await up("KeyW"); await up("KeyS"); }, 3, "1 W+S open lane");
// 2: hold against sled 8 s: toast count
await onLane(4.2); await waitGame(1.2);
const r2 = await hold(() => down("KeyW"), () => up("KeyW"), 8, "2 W 8s vs sled");
ok(r2.toasts.length <= 1, `2 one toast over an 8 s hold (${r2.toasts.length})`);
// 3: release, press again against sled: says again?
await onLane(4.2); await waitGame(1.0);
await clr(); await down("KeyW"); await waitGame(2); await up("KeyW"); await waitGame(0.5); const t3a = (await toasts()).length;
await ev(`document.getElementById("toasts").innerHTML = ""; if (TOASTQ) TOASTQ.length = 0; true`);
await down("KeyW"); await waitGame(2.2); await up("KeyW"); const t3b = (await toasts()).length; console.log("3 re-press toasts", t3a, t3b);
// 4: pad RT against sled
await onLane(4.2); await waitGame(1.2);
const r4 = await hold(() => padSet({ 7: 1 }), () => padSet(), 3, "4 pad RT vs sled");
await padSet();
// 5: a tree/boulder
const ob = await J(`(() => { const w = TLX_WORLD_PROBE; return null; })`).catch(() => null);
const tree = await J(`(() => { const cx = P.x, cz = P.z; for (let i = 0; i < 4000; i++) { const a = i * 2.39996, r = 40 + i * 0.3, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; if (isSea(x, z) || isWater(x, z) || (yardAt && yardAt(x, z))) continue; const L = (typeof OBS !== "undefined") ? [] : []; if (typeof obNear === "function" && obNear(x, z, 1.2) && !obNear(x, z, 0.1) === false) { } } return null; })()`).catch(() => null);
// pick obstacle via the game's own list the truck uses
const t5 = await J(`(() => { const w = window.__tlxWorld; return !!w; })()`).catch(() => false);
const ob2 = await J(`(() => { const cx = P.x, cz = P.z; for (let i = 0; i < 6000; i++) { const a = i * 2.39996, r = 30 + i * 0.2, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; if (isSea(x, z) || isWater(x, z) || (yardAt && yardAt(x, z)) || slopeAt(x, z, 8) > 0.05) continue; if (obNear(x, z, 0.9) && !obNear(x, z, 0.05)) continue; if (obNear(x, z, 0.3)) { return { x, z }; } } return null; })()`);
console.log("ob2", JSON.stringify(ob2));
if (ob2) {
  // truck 4.5 m away from the obstacle, nose toward it
  await ev(`(() => { P.x = ${ob2.x} - 4.5; P.z = ${ob2.z}; P.yaw = Math.PI / 2; P.vx = P.vz = 0; P.y = surf(P.x, P.z); recenter(P.x, P.z, true); return 1; })()`);
  await waitGame(1.2);
  const r5 = await hold(() => down("KeyW"), () => up("KeyW"), 6, "5 W toward obstacle");
  await shot("tree");
}
// 6: steep forward grade in powder / steep firm
const sl = await J(`(() => { const cx = P.x, cz = P.z; for (let i = 0; i < 8000; i++) { const a = i * 2.39996, r = 30 + i * 0.3, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; if (isSea(x, z) || isWater(x, z) || obNear(x, z, 20) || (yardAt && yardAt(x, z))) continue; const g = slopeAt(x, z, 8); if (g > 0.28) { const e = 1, gx = (surf(x + e, z) - surf(x - e, z)) / 2, gz = (surf(x, z + e) - surf(x, z - e)) / 2; return { x, z, g, yaw: Math.atan2(gx, gz) }; } } return null; })()`);
console.log("steep", JSON.stringify(sl));
if (sl) {
  await ev(`(() => { P.x = ${sl.x}; P.z = ${sl.z}; P.yaw = ${sl.yaw}; P.vx = P.vz = 0; P.y = surf(P.x, P.z); recenter(P.x, P.z, true); return 1; })()`);
  await waitGame(1.2);
  await hold(() => down("KeyW"), () => up("KeyW"), 4, `6 W up ${sl.g.toFixed(2)} grade`);
}
// 7: night + reload mid-hold
await ev(`GS.hour = 23; true`); await onLane(4.2); await waitGame(1.0);
await down("KeyW"); await waitGame(0.6);
await reload(); await sleep(1500);
await up("KeyW");
const after = await J(`({ veh: !!VEH.cur, foot: FOOT.on, t: TT.mode, fin: [P.x, P.y, P.z].every(Number.isFinite), rt: TLXV.rt() ? { still: TLXV.rt().stillT, told: TLXV.rt().stillTold } : null })`).catch(e => ({ err: String(e) }));
console.log("7 after reload", JSON.stringify(after));
ok(after.fin !== false, "7 finite after reload");
await done(fails ? 1 : 0);
