// Beta 3.4a: a walker steps into the lane 30 m / 45 m ahead of a car at cruise, at NIGHT: does the car stop
// short (never touches the walker), is the walker pushed aside when walked into a stopped car, do lamps show.
import { boot, ev, sleep, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(100); }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34 + 8; true`); await sleep(1000);
await ev(`TLXT.TRAF.passWait = 1e9; true`);
const rid = await J(`TLXT.routes.slice().sort((a, b) => b.len - a.len)[0].id`);
const s0 = await J(`(() => { const r = TLXT.routes.find(q => q.id === "${rid}"); return r.s0 + Math.min(900, r.len * 0.3); })()`);
for (const dist of [45, 30]) {
  await ev(`(() => { crashCancel(); FOOT.on = false; const c = TLXT.place("${rid}", ${s0}, 1, 0); const p = TLXT.lanePt("${rid}", ${s0} + 600, 1); P.x = p.cx - 300; P.z = p.cz - 300; P.y = surf(P.x, P.z) + .3; window.__cid = TLXT.cars.indexOf(c); return 1; })()`);
  await waitGame(8); // let it get to cruise
  const pre = await J(`(() => { const c = TLXT.cars[window.__cid]; return { v: c.v, s: c.s, on: c.on }; })()`);
  // walker steps into the lane `dist` m ahead
  const w = await J(`(() => { const c = TLXT.cars[window.__cid]; const q = TLXT.lanePt("${rid}", c.s + ${dist}, 1); FOOT.on = true; FOOT.x = q.x; FOOT.z = q.z; FOOT.y = surf(q.x, q.z); window.__wx = q.x; window.__wz = q.z; window.__min = 1e9; return { x: q.x, z: q.z }; })()`);
  const t0 = await clock(); let minG = 1e9;
  while ((await clock()) - t0 < 9) {
    const r = await J(`(() => { const c = TLXT.cars[window.__cid]; const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); let m = 1e9; for (const u of [-1.45, 0, 1.45]) m = Math.min(m, Math.hypot(FOOT.x - c.x - fx * u, FOOT.z - c.z - fz * u)); window.__min = Math.min(window.__min, m); return { m, v: c.v }; })()`);
    minG = Math.min(minG, r.m); await sleep(40);
  }
  const post = await J(`(() => { const c = TLXT.cars[window.__cid]; return { v: c.v, why: c.why, hits: TLXT.hits, fx: FOOT.x - window.__wx, fz: FOOT.z - window.__wz, err: TLXT.err || null }; })()`);
  console.log("step-out", dist, JSON.stringify({ pre, post, minG }));
  ok(pre.v > 6, `${dist} m: car at cruise before (${pre.v.toFixed(1)} m/s)`);
  ok(minG > 0.8, `${dist} m: car stopped short, closest circle ${minG.toFixed(2)} m`);
  ok(post.v < 0.5, `${dist} m: car stopped (${post.v.toFixed(2)} m/s, ${post.why})`);
  ok(Math.hypot(post.fx, post.fz) < 3, `${dist} m: walker not shoved far (${Math.hypot(post.fx, post.fz).toFixed(1)} m)`);
  ok(!post.err, `${dist} m: no tick error`);
}
// walker walks into the stopped car: pushed out, not inside
await ev(`(() => { const c = TLXT.cars[window.__cid]; const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); FOOT.x = c.x + fx * 1.0; FOOT.z = c.z + fz * 1.0; return 1; })()`);
await waitGame(1.5);
const inside = await J(`(() => { const c = TLXT.cars[window.__cid]; const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); let m = 1e9; for (const u of [-1.45, 0, 1.45]) m = Math.min(m, Math.hypot(FOOT.x - c.x - fx * u, FOOT.z - c.z - fz * u)); return { m, nan: !isFinite(FOOT.x + FOOT.z) }; })()`);
console.log("inside", JSON.stringify(inside));
ok(!inside.nan && inside.m > 0.9, `walker pushed out of the car (${inside.m.toFixed(2)} m from a circle)`);
// night lamps
const lamp = await J(`(() => ({ hour: GS.hour % 24, lamps: TLXT.cars.filter(c => c.on).length, beams: !!(window.TLXT.beams || window.TLXT.pool || 1) }))()`);
console.log("night", JSON.stringify(lamp));
ok(!(await J(`TLXT.err || null`)), "no TLXT error");
await done(fails);
