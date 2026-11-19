// 3.1 beta: a SLED (not the truck) ridden along each road at night in a storm, then a mid-road reload.
// Reports per route: metres covered, bogs, crashes, off-line; after reload: ground height under the sled vs road bed, routes unchanged.
import { boot, ev, sleep, done, down, up, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; VEH.cur = null; GS.hour = 23; GS.cash = 9000; true`); await sleep(600);
const sig = () => J(`TLXR.routes.map(r => ({ id: r.id, n: r.pts.length, len: Math.round(r.len), a: r.pts[0].map(Math.round), z: r.pts[r.pts.length - 1].map(Math.round) }))`);
const before = await sig();
console.log("routes", before.length, JSON.stringify(before.map(r => r.id + ":" + r.len)));
const place = (ri, idx) => ev(`(() => { const r = TLXR.routes[${ri}]; const a = r.pts[${idx}], b = r.pts[Math.min(r.pts.length - 1, ${idx} + 3)]; BOG.on = false; BOG.acc = 0; BOG.immune = 0; crashCancel(); FOOT.on = false; VEH.cur = null; P.x = a[0]; P.z = a[1]; P.yaw = Math.atan2(b[0] - a[0], b[1] - a[1]); P.vx = P.vz = P.vy = 0; P.y = surf(a[0], a[1]) + 0.2; recenter(a[0], a[1], true); true })()`);
const steer = ri => J(`(() => { const r = TLXR.routes[${ri}]; let bi = 0, bd = 1e9; for (let i = 0; i < r.pts.length; i++) { const d = Math.hypot(r.pts[i][0] - P.x, r.pts[i][1] - P.z); if (d < bd) { bd = d; bi = i; } }
  let j = bi, acc = 0; while (j < r.pts.length - 1 && acc < 14) { acc += Math.hypot(r.pts[j + 1][0] - r.pts[j][0], r.pts[j + 1][1] - r.pts[j][1]); j++; }
  const t = r.pts[j]; let e = Math.atan2(t[0] - P.x, t[1] - P.z) - P.yaw; while (e > Math.PI) e -= 2 * Math.PI; while (e < -Math.PI) e += 2 * Math.PI;
  return { bi, bd, e, v: Math.hypot(P.vx, P.vz), bog: BOG.on, crash: !!(CRASH && CRASH.on), x: P.x, z: P.z }; })()`);
async function drive(ri, idx, secs) {
  await ev(`WX.at = () => 1; GS.storm = 1; true`);
  await place(ri, idx); await waitGame(1.2);
  const t0 = await clock(); let maxOff = 0, bogs = 0, wasB = false, cr = 0, wasC = false, key = null, i0 = null, last = null;
  await down("KeyW");
  try { while ((await clock()) - t0 < secs) { const s = await steer(ri); last = s; if (i0 === null) i0 = s.bi; maxOff = Math.max(maxOff, s.bd);
    if (s.bog && !wasB) bogs++; wasB = s.bog; if (s.crash && !wasC) cr++; wasC = s.crash; if (s.crash) break;
    const w = s.e > 0.08 ? "KeyA" : s.e < -0.08 ? "KeyD" : null; if (w !== key) { if (key) await up(key); if (w) await down(w); key = w; } await sleep(100); }
  } finally { if (key) await up(key); await up("KeyW"); }
  return { id: before[ri].id, adv: last.bi - i0, maxOff: +maxOff.toFixed(1), bogs, cr, v: +last.v.toFixed(1), last };
}
let lastRes = null;
for (let ri = 0; ri < Math.min(before.length, 6); ri++) {
  if (before[ri].n < 40) continue;
  const r = await drive(ri, 20, 14); lastRes = { ri, ...r };
  console.log("sled", r.id, "advanced pts", r.adv, "maxOff", r.maxOff, "bogs", r.bogs, "crashes", r.cr, "v", r.v);
  ok(r.cr === 0, `${r.id}: no crash at night in a storm`);
  ok(r.adv > 8, `${r.id}: sled makes headway (${r.adv} pts)`);
}
// mid-road reload
const pos = await J(`({ x: P.x, z: P.z })`);
await ev(`save && save(); true`).catch(() => 0);
await reload();
await sleep(1500);
const after = await sig();
ok(JSON.stringify(after) === JSON.stringify(before), "routes identical after reload (same seed)");
const q = await J(`({ x: P.x, z: P.z, on: FOOT.on, veh: !!VEH.cur, gnd: groundAt(P.x, P.z), bed: !!TLXR.bed, err: TLXR.err || null })`);
console.log("after reload", JSON.stringify(q), "was", JSON.stringify(pos));
ok(!q.err, "no TLXR error after reload");
ok(Math.hypot(q.x - pos.x, q.z - pos.z) < 30, "player restored near where the ride stopped");
done(fails ? 1 : 0);
