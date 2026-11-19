// 3.5b2b1 beta: the standing trailer's ENDS and speed. Sled ridden into the tail and the nose, at 7 and 18 m/s (tunnelling),
// walker walked into the tail, a sled pushed (P.v set) at the side at 25 m/s, and the tanker's circles after a reload.
import { boot, ev, sleep, done, reload, down, up } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
const rel = (id, px, pz) => J(`(() => { const t = TLXRIG.list().find(t => t.id === "${id}"), tx = Math.sin(t.yaw), tz = Math.cos(t.yaw), ex = ${px} - t.kx, ez = ${pz} - t.kz; return { along: ex * tx + ez * tz, side: ex * tz - ez * tx }; })()`);
// put the sled/walker `d` m beyond an end (end = "tail" | "nose") on the trailer's line, facing it
const atEnd = (id, end, d, who, v = 0) => ev(`(() => { const t = TLXRIG.list().find(t => t.id === "${id}"), tx = Math.sin(t.yaw), tz = Math.cos(t.yaw);
  const u = "${end}" === "tail" ? -(t.L + t.over) - ${d} : t.front + ${d}; const x = t.kx + tx * u, z = t.kz + tz * u;
  const yaw = "${end}" === "tail" ? t.yaw : t.yaw + Math.PI;
  if ("${who}" === "FOOT") { P.vx = P.vz = 0; FOOT.on = true; FOOT.g.visible = true; FOOT.x = x; FOOT.z = z; FOOT.yaw = yaw; FOOT.y = surf(x, z); FOOT.sp = 0; recenter(x, z, true); }
  else { crashCancel(); FOOT.on = false; FOOT.g.visible = false; P.x = x; P.z = z; P.yaw = yaw; P.vx = Math.sin(yaw) * ${v}; P.vz = Math.cos(yaw) * ${v}; P.vy = 0; P.y = surf(x, z); BOG.on = false; BOG.acc = 0; recenter(x, z, true); camState.init = false; }
  return 1; })()`);
const inside = async id => { const p = await J(`({ x: P.x, z: P.z })`), q = await rel(id, p.x, p.z), t = await J(`TLXRIG.list().find(t => t.id === "${id}")`);
  return q.along < t.front && q.along > -(t.L + t.over) && Math.abs(q.side) < 1.2; };
const ride = async (id, end, d, v, secs, key = "KeyW") => { await atEnd(id, end, d, "P", v); await sleep(150); await down(key); let ins = false, mn = 99, sdAt = 99, tr = []; const t0 = await clock();
  while ((await clock()) - t0 < secs) { await sleep(60); if (await inside(id)) ins = true; const p = await J(`({ x: P.x, z: P.z })`), q = await rel(id, p.x, p.z), t = await J(`TLXRIG.list().find(t => t.id === "${id}")`);
    const gap = end === "tail" ? -(t.L + t.over) - q.along : q.along - t.front; mn = Math.min(mn, gap); if (gap < 0.3 && gap > -(t.L + t.over + t.front)) sdAt = Math.min(sdAt, Math.abs(q.side)); tr.push([+q.along.toFixed(1), +q.side.toFixed(1)]); }
  await up(key); const crashed = await ev("!!CRASH.on"); console.log('   path', JSON.stringify(tr.filter((_, i) => i % 6 == 0))); return { ins, mn: +mn.toFixed(2), sdAt: +sdAt.toFixed(2), crashed }; };

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.hour = 12; GS.storm = 0; WX.at = () => 0; TLX.setOn("traffic", false); true`); await sleep(600);
const L = await J(`TLXRIG.list().map(t => ({ id: t.id, L: t.L, over: t.over, front: t.front }))`);
console.log("trailers", JSON.stringify(L));
for (const t of L) {
  for (const [end, d] of [["tail", 14], ["nose", 14]]) for (const v of [7, 18]) {
    const r = await ride(t.id, end, d, v, 3.5);
    console.log(t.id, end, v, JSON.stringify(r));
    ok(!r.ins, `${t.id}: sled into the ${end} at ${v} m/s never gets inside the body (nearest ${r.mn} m from the end)`);
    await ev(`crashCancel(); P.vx = P.vz = 0; true`); await sleep(300);
  }
  // walker into the tail
  await atEnd(t.id, "tail", 4, "FOOT"); await sleep(600); await down("KeyW"); let mn = 99; const t0 = await clock();
  while ((await clock()) - t0 < 5) { await sleep(150); const f = await J(`({ x: FOOT.x, z: FOOT.z })`), q = await rel(t.id, f.x, f.z); mn = Math.min(mn, -(t.L + t.over) - q.along); if (mn < -1.5) break; }
  await up("KeyW");
  ok(mn > -0.9, `${t.id}: walker held into the tail gets ${mn.toFixed(2)} m from the end (not inside)`);
  await ev(`FOOT.on = false; FOOT.g.visible = false; P.vx = P.vz = 0; true`); await sleep(300);
  // fast skim along the side (a glancing hit)
  await ev(`(() => { const t = TLXRIG.list().find(t => t.id === "${t.id}"), tx = Math.sin(t.yaw), tz = Math.cos(t.yaw); const u = -(t.L + t.over) / 2 - 20, side = 6;
    const sg = 1, x = t.kx + tx * u + tz * sg * side, z = t.kz + tz * u - tx * sg * side; crashCancel(); FOOT.on = false; P.x = x; P.z = z; P.yaw = t.yaw + 0.22 * -sg; P.vx = Math.sin(P.yaw) * 22; P.vz = Math.cos(P.yaw) * 22; P.y = surf(x, z); recenter(x, z, true); return 1; })()`);
  await down("KeyW"); let ins = false; const t1 = await clock(); while ((await clock()) - t1 < 3) { await sleep(60); if (await inside(t.id)) ins = true; } await up("KeyW");
  ok(!ins, `${t.id}: a 22 m/s glancing run at the flank (0.22 rad) does not end inside the body`);
  await ev(`crashCancel(); P.vx = P.vz = 0; true`); await sleep(300);
}
const n0 = await J(`TLXRIG.list().map(t => TLXRIG.circles(t.id).length)`);
await ev(`save(); true`); await sleep(300); await reload(); await sleep(700);
const n1 = await J(`TLXRIG.list().map(t => TLXRIG.circles(t.id).length)`);
ok(JSON.stringify(n0) === JSON.stringify(n1), `circles after a reload ${JSON.stringify(n1)} = before ${JSON.stringify(n0)}`);
ok(!(await ev("TLXRIG.err")), "no rig errors: " + (await ev("TLXRIG.err")));
console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
