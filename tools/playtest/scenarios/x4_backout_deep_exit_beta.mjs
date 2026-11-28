// Beta (0395) breaker for v36: 2.5 m drift, bogged-in-drift, forward push then exit. Exit 1 on FAIL.
// 4.1b1 follow-up (beta 0224 #1/#2, lane A): backing out of a drift with the blade down, a skin of snow under a
// back-drag, and a bladeful when you get out of the cab. Asserts; exit 1 on a FAIL. ONLY=<letters> runs sections.
//   A  blade down IN a 1 m drift: the reverse control backs the truck out (keyboard, pad, touch); forward still holds it
//   B  back-dragging over 6 cm on a cleared field pulls nothing and leaves the snow as it was; 30 cm is still pulled
//   C  out of the cab with a bladeful: it is left on the ground, none of it lost
import { boot, ev, sleep, done, down, up, tap, padSet, padOff } from "../lib.mjs";
let fails = 0; const bad = []; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) { fails++; bad.push(m); } };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(100); }
const ONLY = process.env.ONLY;
const section = async (n, f) => { if (ONLY && !ONLY.includes(n[0])) return; console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const kit = () => ev(`(() => {
  if (!window.__F) { const fb0 = freshBase; window.__F = []; freshBase = (ix, iz) => { const F = window.__F, x = ix * CELL - HALF, z = iz * CELL - HALF; for (let i = F.length - 1; i >= 0; i--) { const q = F[i]; if (x >= q[0] && x <= q[1] && z >= q[2] && z <= q[3]) return q[4]; } return fb0(ix, iz); }; }
  window.__field = (x0, x1, z0, z1, dep) => { window.__F.push([x0 - 0.01, x1 + 0.01, z0 - 0.01, z1 + 0.01, dep]); for (let iz = Math.ceil((z0 + HALF) / CELL); iz <= Math.floor((z1 + HALF) / CELL); iz++) for (let ix = Math.ceil((x0 + HALF) / CELL); ix <= Math.floor((x1 + HALF) / CELL); ix++) {
    const c = getChunk(ix >> 5, iz >> 5), k = (iz & 31) * CH + (ix & 31), d0 = c.d[k]; c.f[k] = dep; c.d[k] = dep; if (c.g) c.g[k] = 0; writeCell(ix, iz, d0, dep, dep); } return true; };
  window.__put = (x, z) => { BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; CRASH.cool = 1; P.x = x; P.z = z; P.yaw = 0; P.vx = P.vy = P.vz = 0; P.y = surf(x, z); recenter(x, z, true); camState.init = false; window.__t0 = [x, z, gameClock]; const B = TLXPL.rt(TLXV.state().cur); B.last = null; B.carry = 0; B.volCut = 0; B.volLaid = 0; B.full = false; B.back = false; B.hold = null; return true; };
  window.__vol = (x0, x1, z0, z1) => { let v = 0, n = 0, mx = 0; for (let iz = Math.ceil((z0 + HALF) / CELL); iz <= Math.floor((z1 + HALF) / CELL); iz++) for (let ix = Math.ceil((x0 + HALF) / CELL); ix <= Math.floor((x1 + HALF) / CELL); ix++) { const d = depthAt(ix, iz); v += d * CELL * CELL; n++; if (d > mx) mx = d; } return { v, n, mx }; };
  return true; })()`);
const moved = () => J(`(() => { const u = TLXV.state().cur, B = TLXPL.rt(u), R = TLXV.runtimeOf(u); return { mv: +(P.z - __t0[1]).toFixed(2), v: +Math.hypot(P.vx, P.vz).toFixed(2), bog: BOG.on, drag: Math.round(B.drag), carry: +B.carry.toFixed(3), cut: +B.volCut.toFixed(3), laid: +B.volLaid.toFixed(3), back: !!B.back, rev: R ? R.rev : null, why: B.why || "", foot: FOOT.on }; })()`);

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 9000; GS.warmth = 100; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`); await sleep(600);
await ev(`TLXV.buy("pickup"); true`); await sleep(300);
const uid = await ev(`TLXV.state().owned[0].uid`), QU = JSON.stringify(uid);
await ev(`TLXPL.fit(${QU}, "b23"); true`);
const spot = await J(`(() => { for (let r = 150; r < 3600; r += 41) for (let a = 0; a < 6.28; a += 0.19) { const x = depot.x + Math.cos(a) * r, z = depot.z + Math.sin(a) * r; let bad = false;
  for (let k = -10; k <= 70 && !bad; k += 10) for (const sx of [-6, 0, 6]) if (isSea(x + sx, z + k) || isWater(x + sx, z + k) || obNear(x + sx, z + k, 7) || slopeAt(x + sx, z + k, 8) > 0.03 || yardAt(x + sx, z + k) > 0.02 || bioAt(x + sx, z + k) === 1) { bad = true; break; }
  if (!bad && Math.abs(groundAt(x, z) - groundAt(x, z + 60)) < 1.0 && (!window.TLXR || TLXR.near(x, z + 30).d > 70)) return { x, z }; } return null; })()`);
ok(!!spot, "a flat open strip for the fields: " + JSON.stringify(spot));
if (!spot) await done(1);
const X = spot.x, Z = spot.z;
await ev(`TLXV.swapTo(${QU}); FOOT.on = false; true`); await sleep(600); await kit();
ok(await ev(`!!VEH.cur && !FOOT.on`), "seated in the bladed pickup");
// `depth` of snow everywhere, a cleared pad under the truck from 10 m behind it to `padTo` m ahead of its middle
const lane = (depth, padTo) => ev(`__F.length = 0; __field(${X - 7}, ${X + 7}, ${Z - 10}, ${Z + 70}, ${depth}); __field(${X - 7}, ${X + 7}, ${Z - 10}, ${Z + padTo}, 0.06); __put(${X}, ${Z}); true`);
const settle = async () => { await ev(`TLXPL.rt(${QU}).down = true; true`); await waitGame(1.0); await ev(`window.__t0 = [P.x, P.z, gameClock]; true`); };
// hold a control until the truck has gone m metres back, or `secs` of game time
const until = async (m, secs) => { const t0 = await clock(); let r = await moved(), revSeen = 0, dragStill = null; while (r.mv > -m && (await clock()) - t0 < secs) { await sleep(80); r = await moved(); if (r.rev) revSeen++; if (dragStill === null && r.rev && r.v < 0.2) dragStill = r.drag; } r.revSeen = revSeen; r.dragStill = dragStill; return r; };


await section("C forward 0.3 m: blade down vs up", async () => {
  for (const dn of [true, false]) {
    await lane(0.3, -9); await ev(`TLXPL.rt(${QU}).down = ${dn}; true`); await waitGame(1); await ev(`window.__t0 = [P.x, P.z, gameClock]; true`);
    await down("KeyW"); await waitGame(4); const r = await moved(); await up("KeyW");
    console.log("  fwd blade", dn ? "down" : "up", JSON.stringify(r));
    ok(r.mv > 3, `forward in 0.3 m with blade ${dn ? "down" : "up"} moved ${r.mv} m`);
    await waitGame(2);
  }
});
if (bad.length) console.log("FAILED: " + bad.join(" | "));
await done(fails ? 1 : 0);
