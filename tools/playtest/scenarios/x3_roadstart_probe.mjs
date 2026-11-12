// probe: where along real roads does the truck fail to move / bog from rest (W only, aligned with the line)
import { boot, ev, tap, sleep, done, down, up } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(100); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; GS.cash = 9000; true`); await sleep(600);
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400); await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400); await ev(`closeGarage(); true`);
await ev(`(() => { const r = TLX.state("vehicles").owned[0]; const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); crashCancel(); FOOT.on = true; FOOT.x = r.x + fz * 3 - fx * 0.3; FOOT.z = r.z - fx * 3 - fz * 0.3; FOOT.yaw = r.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(800); await tap("KeyQ"); await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14);
for (const [ri, fr] of [[0, 0.15], [0, 0.3], [0, 0.5], [0, 0.7], [3, 0.15], [3, 0.4], [3, 0.7], [4, 0.15], [4, 0.5], [4, 0.8]]) {
  const info = await J(`(() => { const r = TLXR.routes[${ri}]; const idx = Math.floor(r.pts.length * ${fr}); const a = r.pts[idx], b = r.pts[Math.min(r.pts.length - 1, idx + 3)]; BOG.on = false; BOG.acc = 0; BOG.immune = 0; crashCancel(); P.x = a[0]; P.z = a[1]; P.yaw = Math.atan2(b[0] - a[0], b[1] - a[1]); P.vx = P.vz = P.vy = 0; P.y = surf(a[0], a[1]) + 0.2; recenter(a[0], a[1], true);
    return { idx, x: Math.round(a[0]), z: Math.round(a[1]), yard: yardAt(a[0], a[1]), slope: +slopeAt(a[0], a[1], 8).toFixed(3), water: isWater(a[0], a[1]), obs: obNear(a[0], a[1], 4), depth: +depthAt(Math.floor((a[0] + HALF) / CELL), Math.floor((a[1] + HALF) / CELL)).toFixed(2), onRoad: TLXR.onRoad ? TLXR.onRoad(a[0], a[1]) : null }; })()`);
  await waitGame(1.5);
  const p0 = await J(`[P.x, P.z]`); await down("KeyW"); await waitGame(5); const s = await J(`({ mv: Math.hypot(P.x - ${0}, 0), x: P.x, z: P.z, v: Math.hypot(P.vx, P.vz), bog: BOG.on, acc: BOG.acc, gear: GB.gear, hint: $("wnHint").textContent })`); await up("KeyW");
  console.log(ri, fr, JSON.stringify(info), "moved", Math.hypot(s.x - p0[0], s.z - p0[1]).toFixed(1), "v", s.v.toFixed(1), "bog", s.bog, "gear", s.gear);
}
await done(0);
