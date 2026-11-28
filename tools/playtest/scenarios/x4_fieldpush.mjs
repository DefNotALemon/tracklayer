// 4.1a1 / 4.1b1 follow-up (beta 0395 #1/#2, lane A): a plain push through 0.3 m of snow on an open field, and a real
// bladeful left on the ground when you get out. Asserts; exit 1 on a FAIL. ONLY=<letters> runs sections.
//   A  driven in by keys (blade up), stopped, blade dropped with the use key: forward pushes 0.3 m from a standstill
//   B  a truck SET DOWN on untouched 0.3 m (a test's teleport: all four wheels in uncut snow) with the blade down stands
//      still and the hint says why inside the first second; the way out the hint gives works (lift, back up, drop, push)
//   C  a square blade carrying 0.5 m3+: out of the cab, the whole bladeful is on the ground in front of the blade
// Report 0395 #1 read only the blade's own `why` (set from 6 kN) and set the truck down by teleport: B is that case.
import { boot, ev, sleep, done, down, up, tap } from "../lib.mjs";
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
  window.__put = (x, z) => { BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; CRASH.cool = 1; P.x = x; P.z = z; P.yaw = 0; P.vx = P.vy = P.vz = 0; P.y = surf(x, z); recenter(x, z, true); camState.init = false; window.__t0 = [x, z, gameClock]; const B = TLXPL.rt(TLXV.state().cur); B.last = null; B.carry = 0; B.volCut = 0; B.volLaid = 0; B.full = false; B.back = false; B.hold = null; B.down = false; return true; };
  window.__vol = (x0, x1, z0, z1) => { let v = 0, n = 0, mx = 0; for (let iz = Math.ceil((z0 + HALF) / CELL); iz <= Math.floor((z1 + HALF) / CELL); iz++) for (let ix = Math.ceil((x0 + HALF) / CELL); ix <= Math.floor((x1 + HALF) / CELL); ix++) { const d = depthAt(ix, iz); v += d * CELL * CELL; n++; if (d > mx) mx = d; } return { v, n, mx }; };
  return true; })()`);
const moved = () => J(`(() => { const u = TLXV.state().cur, B = TLXPL.rt(u), R = TLXV.runtimeOf(u), sk = R && R.sink ? (R.sink[0] + R.sink[1] + R.sink[2] + R.sink[3]) / 4 : 0; return { mv: +(P.z - __t0[1]).toFixed(2), z: +P.z.toFixed(2), v: +Math.hypot(P.vx, P.vz).toFixed(2), down: !!B.down, bog: BOG.on, drag: Math.round(B.drag), carry: +B.carry.toFixed(3), cut: +B.volCut.toFixed(3), laid: +B.volLaid.toFixed(3), back: !!B.back, sink: +sk.toFixed(2), push: Math.round(Math.min(R.fe || 0, R.t0 || 0)), snow: Math.round(R.fsnow || 0), foot: FOOT.on, hint: FOOT.on ? "" : rideXHint() }; })()`);
const mark = () => ev(`window.__t0 = [P.x, P.z, gameClock]; true`);
// hold a key until `stop(r)` or `secs` of game time
const drive = async (key, secs, stop) => { await down(key); const t0 = await clock(); let r; do { await sleep(90); r = await moved(); } while ((await clock()) - t0 < secs && !(stop && stop(r))); await up(key); return r; };

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 9000; GS.warmth = 100; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`); await sleep(600);
await ev(`TLXV.buy("pickup"); true`); await sleep(300);
const uid = await ev(`TLXV.state().owned[0].uid`), QU = JSON.stringify(uid);
await ev(`TLXPL.fit(${QU}, "b23"); true`);
const spot = await J(`(() => { for (let r = 150; r < 3600; r += 41) for (let a = 0; a < 6.28; a += 0.19) { const x = depot.x + Math.cos(a) * r, z = depot.z + Math.sin(a) * r; let bad = false;
  for (let k = -20; k <= 80 && !bad; k += 10) for (const sx of [-6, 0, 6]) if (isSea(x + sx, z + k) || isWater(x + sx, z + k) || obNear(x + sx, z + k, 7) || slopeAt(x + sx, z + k, 8) > 0.03 || yardAt(x + sx, z + k) > 0.02 || bioAt(x + sx, z + k) === 1) { bad = true; break; }
  if (!bad && Math.abs(groundAt(x, z) - groundAt(x, z + 60)) < 1.0 && (!window.TLXR || TLXR.near(x, z + 30).d > 70)) return { x, z }; } return null; })()`);
ok(!!spot, "a flat open strip for the field: " + JSON.stringify(spot));
if (!spot) await done(1);
const X = spot.x, Z = spot.z;
await ev(`TLXV.swapTo(${QU}); FOOT.on = false; true`); await sleep(600); await kit();
ok(await ev(`!!VEH.cur && !FOOT.on`), "seated in the bladed pickup");
// 0.3 m of snow everywhere; `pad` = a cleared pad from 10 m behind the truck to 3 m ahead of its middle
const field = pad => ev(`__F.length = 0; __field(${X - 8}, ${X + 8}, ${Z - 20}, ${Z + 80}, 0.3); ${pad ? `__field(${X - 7}, ${X + 7}, ${Z - 10}, ${Z + 3}, 0.06);` : ""} __put(${X}, ${Z}); true`);
const useKey = async () => { await tap("KeyE", 120); await waitGame(0.9); };       // a tap, well inside the 0.5 s that slews

await section("A driven in by keys, the blade dropped at a standstill", async () => {
  await field(false); await waitGame(0.6);
  const a = await drive("KeyW", 14, r => r.mv > 12);
  ok(a.mv > 12 && !a.bog, `blade up it drives into the 0.3 m field (${a.mv} m)`);
  await drive("KeyS", 4, r => r.v < 0.4); await waitGame(1.2);
  const s = await moved(); console.log("  stopped", JSON.stringify(s));
  ok(s.v < 0.3 && !s.down, `stopped in the field, blade up (${s.v} m/s)`);
  ok(/drop the blade|BLADE DOWN/.test(s.hint), "the hint offers the blade: " + s.hint);
  await useKey(); const d = await moved(); ok(d.down, "the use key drops the blade"); await mark();
  const p = await drive("KeyW", 4); console.log("  pushed", JSON.stringify(p));
  ok(p.mv > 8, `forward with the blade down it pushes on (${p.mv} m in 4 s of game time)`);
  ok(p.cut > 3, `and cuts (${p.cut} m3 taken)`);
  ok(/BLADE DOWN/.test(p.hint) && /cutting \d+ cm/.test(p.hint), "the hint counts the cut: " + p.hint);
  ok(!p.bog, "not bogged");
  await useKey(); await waitGame(1.5);
});

await section("B set down on untouched snow, blade down: it stands, says why, and the way out works", async () => {
  await field(false); await ev(`TLXPL.rt(${QU}).down = true; true`); await waitGame(0.8); await mark();
  await down("KeyW"); await waitGame(0.9); const h1 = await moved(); await waitGame(0.6); const f = await moved(); await up("KeyW");
  console.log("  held", JSON.stringify(f));
  ok(f.sink > 0.1, `all four wheels stand in uncut snow (sunk ${f.sink} m: a truck that drove here stands ${"0.06"} m)`);
  ok(f.mv < 0.4, `it stands (${f.mv} m): the snow under the wheels and on the blade is ${f.snow} N against ${f.push} N of push`);
  ok(/wheels stand in snow it has not cut/.test(h1.hint), "inside the first second the hint says why: " + h1.hint);
  ok(!f.bog, "not bogged after 1.5 s of pedal");
  await waitGame(0.8);
  await useKey(); const l = await moved(); ok(!l.down, "the use key lifts it"); await mark();
  const b = await drive("KeyS", 8, r => r.mv < -4); console.log("  backed", JSON.stringify(b));
  ok(b.mv < -3 && !b.bog, `blade up it backs away (${b.mv} m)`);
  await waitGame(1.5); let s = await moved(), n = 0; while (s.v > 0.3 && n++ < 30) { await sleep(150); s = await moved(); }
  await useKey(); const d = await moved(); ok(d.down, "blade down again"); await mark();
  const p = await drive("KeyW", 5); console.log("  pushed", JSON.stringify(p));
  ok(p.mv > 8 && p.cut > 2 && !p.bog, `and now it plows in (${p.mv} m, ${p.cut} m3 cut)`);
  await useKey(); await waitGame(1.5);
});

await section("C out of the cab with a real bladeful", async () => {
  await field(true);
  let th = await ev(`TLXPL.throwOf(${QU})`), n = 0; while (th !== "s" && n++ < 3) th = await ev(`TLXPL.slew(${QU})`);
  ok(th === "s", "the blade is square: it carries");
  await ev(`const B = TLXPL.rt(${QU}); B.down = true; B.volCut = 0; B.volLaid = 0; B.carry = 0; true`); await waitGame(1.0); await mark();
  const w = await drive("KeyW", 9, r => r.carry >= 0.9); console.log("  loaded", JSON.stringify(w));
  ok(w.carry >= 0.5, `pushing forward with ${w.carry} m3 on the blade`);
  // brake to a crawl (never to a standstill with S held: that is reverse, a back-drag) and get out at once
  await drive("KeyS", 4, r => r.v < 1.2);
  /* the bladeful and the snow on the ground round the blade, read in one go: what is cut goes from the one to the other
     as the truck rolls, so their sum is what must not change when the door opens. stopT: a truck that has stood 1.2 s
     stacks its load by itself; under that the exit is what leaves it */
  const z0 = (await moved()).z, tot = () => J(`(() => { const B = TLXPL.rt(${QU}), g = __vol(${X - 4.5}, ${X + 4.5}, ${z0 - 3}, ${z0 + 13}); return { carry: +B.carry.toFixed(3), ground: +g.v.toFixed(3), mx: +g.mx.toFixed(2), stopT: +(B.stopT || 0).toFixed(2), foot: FOOT.on, v: +Math.hypot(P.vx, P.vz).toFixed(2) }; })()`);
  let t = await tot(), seat = t; n = 0; await tap("KeyQ");
  while (!(t = await tot()).foot && n++ < 90) { if (t.carry > 0) seat = t; await sleep(60); if (n % 25 === 0) await tap("KeyQ"); }
  console.log("  last seen in the seat with a load", JSON.stringify(seat)); console.log("  on foot at once", JSON.stringify(t));
  await sleep(500); const t1 = await tot(), r = await moved(); console.log("  on foot", JSON.stringify(t1), JSON.stringify(r));
  ok(r.foot, "out of the cab");
  ok(seat.carry >= 0.5, `a real bladeful was on the blade in the seat (${seat.carry} m3 at ${seat.v} m/s)`);
  ok(seat.stopT < 1.0, `and the truck had not stood long enough to stack it by itself (${seat.stopT} s still, 1.2 does that): the exit is what leaves it`);
  ok(t.carry === 0 && r.carry === 0 && !r.back, `on foot the blade is empty at once (carry ${t.carry})`);
  ok(r.laid >= 0.9 * r.cut && r.cut >= 0.5, `none of it lost: ${r.laid} laid of ${r.cut} m3 cut`);
  const d = t1.ground - (seat.ground + seat.carry);
  ok(Math.abs(d) < 0.12 * seat.carry, `it lies on the ground round the blade: ${seat.ground} m3 there + ${seat.carry} on the blade before, ${t1.ground} m3 there after (${d >= 0 ? "+" : ""}${d.toFixed(3)})`);
  ok(t1.mx > 0.45 && t1.mx > seat.mx + 0.1, `as a heap (${t1.mx} m at its deepest, ${seat.mx} m before, in a 0.3 m field)`);
  ok([r.carry, r.cut, r.laid, r.drag].every(Number.isFinite), "numbers finite");
  await ev(`FOOT.on = false; TLXV.swapTo(${QU}); true`); await sleep(600);
});

if (bad.length) console.log("FAILED: " + bad.join(" | "));
await done(fails ? 1 : 0);
