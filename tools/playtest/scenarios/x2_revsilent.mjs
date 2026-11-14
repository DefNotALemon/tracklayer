// Beta 0116 #1/#4 (+ 0121 #1): a pickup held on the pedal that can't move says why within ~1 s (deep snow, a grade, something
// solid behind/ahead), an open lane gives no false warning, and a freed truck leaves no stale STUCK text. Asserts, exit 1 on a fail.
import { boot, ev, sleep, done, park, down, up, padSet } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(120); } return false; }
const toasts = () => J(`[...document.querySelectorAll("#toasts > *")].map(e => e.textContent).concat((TOASTQ || []).map(t => t.msg))`);
const clearToasts = () => ev(`document.getElementById("toasts").innerHTML = ""; if (TOASTQ) TOASTQ.length = 0; (() => { const R = TLXV.rt(); R.stillTold = false; R.stillT = 0; R.why = ""; BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; return 1; })()`);
const pos = () => J(`({ x: P.x, z: P.z, fin: [P.x, P.y, P.z, P.yaw].every(Number.isFinite) })`);
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
// hold keys/pad until R.why is set (or s game seconds), report how long it took
async function holdWhy(press, release, s) {
  await clearToasts(); await waitGame(0.3);
  const p0 = await pos(), t0 = await clock(); await press();
  let why = "", t = 0; while ((t = (await clock()) - t0) < s) { why = await ev(`TLXV.rt().why || ""`); if (why) break; await sleep(100); }
  const ts = await toasts(); await waitGame(0.4); await release(); await waitGame(0.6);
  return { why, t, ts, moved: dist(await pos(), p0) };
}

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; true`);
await park(); await sleep(400);
await ev(`GS.cash = 9000; garageTab = "trucks"; openGarage(); true`); await sleep(500);
await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(400);
await ev(`(() => { const r = TLX.state("vehicles").owned[0], fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); crashCancel(); FOOT.on = true; FOOT.x = r.x + fz * 3.2; FOOT.z = r.z - fx * 3.2; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.yaw = r.yaw - 1.4; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(800); await down("KeyQ"); await sleep(120); await up("KeyQ");
ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14), "in the pickup");

// A: S held from rest, backing up a ~10% grade into deep powder (the 0116 G spot): a reason inside 1.8 s
const sl = await J(`(() => { const cx = P.x, cz = P.z; for (let i = 0; i < 6000; i++) { const a = i * 2.39996, r = 30 + i * 0.2, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; if (isSea(x, z) || isWater(x, z) || obNear(x, z, 20) || (yardAt && yardAt(x, z))) continue; const g = slopeAt(x, z, 8); if (g > 0.10 && g < 0.2) { const e = 1, gx = (surf(x + e, z) - surf(x - e, z)) / 2, gz = (surf(x, z + e) - surf(x, z - e)) / 2; return { x, z, g, yaw: Math.atan2(-gx, -gz) }; } } return null; })()`);
const toSlope = () => ev(`(() => { P.x = ${sl.x}; P.z = ${sl.z}; P.yaw = ${sl.yaw}; P.vx = P.vz = 0; P.y = surf(P.x, P.z); recenter(P.x, P.z, true); return 1; })()`);
await toSlope(); await waitGame(1.2);
const a = await holdWhy(() => down("KeyS"), () => up("KeyS"), 3);
console.log("A", JSON.stringify(a));
ok(a.why && a.t < 1.8 && a.ts.some(t => /dig|steep|grip/i.test(t)), `A keyboard S up a ${sl.g.toFixed(2)} grade in powder: "${a.why}" after ${a.t.toFixed(2)} s, toast ${JSON.stringify(a.ts)}`);
// A2: pad LT full, same spot (re-placed)
await toSlope(); await waitGame(1.2);
const a2 = await holdWhy(() => padSet({ 6: 1 }), () => padSet(), 3);
ok(a2.why && a2.t < 1.8, `A2 pad LT full, same spot: "${a2.why}" after ${a2.t.toFixed(2)} s, moved ${a2.moved.toFixed(1)} m`);
await padSet(); await ev(`BOG.on = false; true`);

// a straight town lane: truck on it, nose along it
const lane = await J(`(() => { let best = null; for (const Y of YARDS) { if (Y.x2 === undefined || Math.hypot(Y.x - depot.x, Y.z - depot.z) > TOWN_R || Y.r > 5) continue; const L = Math.hypot(Y.x2 - Y.x, Y.z2 - Y.z); if (!best || L > best.L) best = { x: Y.x, z: Y.z, x2: Y.x2, z2: Y.z2, L }; } return best; })()`);
console.log("lane", JSON.stringify(lane));
const onLane = (sledOff) => ev(`(() => { const L = ${JSON.stringify(lane)}, ux = (L.x2 - L.x) / L.L, uz = (L.z2 - L.z) / L.L; P.x = L.x + ux * L.L * 0.5; P.z = L.z + uz * L.L * 0.5; P.yaw = Math.atan2(ux, uz); P.vx = P.vz = 0; P.y = surf(P.x, P.z);
  const s = TLX.state("vehicles").sled; if (s) { const o = ${sledOff}; if (o) { s.x = P.x + ux * o; s.z = P.z + uz * o; } else { s.x = P.x + 60; s.z = P.z + 60; } } recenter(P.x, P.z, true); return !!s; })()`);
// C: open lane, S held: backs away, no warning
await onLane(0); await waitGame(1.2);
const c = await holdWhy(() => down("KeyS"), () => up("KeyS"), 3);
ok(!c.why && c.moved > 3, `C open lane, S 3 s: moved ${c.moved.toFixed(1)} m, why "${c.why}"`);
// B: the parked sled 4 m behind: backs into it, stops, says so
ok(await onLane(-4.0), "B parked sled record found");
await waitGame(1.2);
const b = await holdWhy(() => down("KeyS"), () => up("KeyS"), 3);
ok(b.why === "solid" && b.t < 2.2 && b.ts.some(t => /behind/.test(t)), `B sled 4 m behind, S: "${b.why}" after ${b.t.toFixed(2)} s, moved ${b.moved.toFixed(2)} m, toast ${JSON.stringify(b.ts)}`);
// F: the sled 4.2 m in front, W held from rest
await onLane(4.2); await waitGame(1.2);
const f = await holdWhy(() => down("KeyW"), () => up("KeyW"), 3);
ok(f.why === "solid" && f.ts.some(t => /in front of/.test(t)), `F sled in front, W: "${f.why}" after ${f.t.toFixed(2)} s, toast ${JSON.stringify(f.ts)}`);
await onLane(0); await waitGame(0.5);

// E (0121 #1): bogged, then on plowed ground: freed and no STUCK text left in #wnHint
await ev(`BOG.on = true; BOG.acc = 5; BOG.depth = 0.4; true`); await waitGame(0.5);
const e0 = await J(`({ bog: BOG.on, hint: $("wnHint").textContent })`);
await waitGame(2.5);
const e1 = await J(`({ bog: BOG.on, hint: $("wnHint").textContent, hidden: $("wnHud").hidden })`);
console.log("E", JSON.stringify(e0), JSON.stringify(e1));
ok(!e1.bog && !/STUCK/.test(e1.hint), `E bog on the lane clears and the hint line empties (${JSON.stringify(e1)})`);
const fin = await pos(); ok(fin.fin, "pose finite");
await done(fails ? 1 : 0);
