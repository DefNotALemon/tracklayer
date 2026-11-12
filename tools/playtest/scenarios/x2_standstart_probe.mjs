// Probe for 0117 #1 / 0119 #3: truck seated, W from rest at flat open spots; log the physics internals per step.
import { boot, ev, tap, sleep, done, down, up } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 9000; true`); await sleep(600);
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400); await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400); await ev(`closeGarage(); true`);
await ev(`(() => { const r = TLX.state("vehicles").owned[0]; const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); crashCancel(); FOOT.on = true; FOOT.x = r.x + fz * 3 - fx * 0.3; FOOT.z = r.z - fx * 3 - fz * 0.3; FOOT.yaw = r.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(800); await tap("KeyQ");
console.log("seated", await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14));
const spots = await J(`(() => { const o = []; for (let r = 150; r < 900 && o.length < 3; r += 25) for (let a = 0; a < 6.28 && o.length < 3; a += 0.3) { const x = depot.x + Math.cos(a) * r, z = depot.z + Math.sin(a) * r;
  if (isSea(x, z) || isWater(x, z) || obNear(x, z, 40) || slopeAt(x, z, 12) > 0.03) continue; if (o.some(q => Math.hypot(q.x - x, q.z - z) < 150)) continue; o.push({ x, z }); } return o; })()`);
const MODE = process.env.MODE || "drop";
for (const s of spots) for (const yaw of [0, 1.57]) {
  await ev(`(() => { P.x = ${s.x}; P.z = ${s.z}; P.yaw = ${yaw}; P.y = surf(P.x, P.z) + ${MODE === "drop" ? 0.3 : 0}; P.vx = P.vy = P.vz = 0; BOG.on = false; BOG.acc = 0; recenter(P.x, P.z, true); camState.init = false; return 1; })()`);
  await waitGame(1.2);
  await ev(`window.__t0 = [P.x, P.z]; true`);
  await down("KeyW");
  for (let i = 0; i < 5; i++) {
    await waitGame(0.6);
    console.log(" ", JSON.stringify(await J(`(() => { const R = TLXV.rt(); const ix = Math.round((P.x + HALF) / CELL), iz = Math.round((P.z + HALF) / CELL); return { v: +Math.hypot(P.vx, P.vz).toFixed(2), mv: +Math.hypot(P.x - __t0[0], P.z - __t0[1]).toFixed(2), fx: R.fx | 0, drag: R.drag | 0, sink: R.sink.map(v => +v.toFixed(2)), H: R.H.map(h => +(h - groundAt(P.x, P.z)).toFixed(2)), Py: +(P.y - groundAt(P.x, P.z)).toFixed(2), gnd: P.gnd, d: +depthAt(ix, iz).toFixed(2), f: +freshAt(ix, iz).toFixed(2), bog: BOG.on, acc: +BOG.acc.toFixed(2), ice: P.ice, wet: P.wet, thr: input.thr }; })()`)));
  }
  await up("KeyW"); await waitGame(0.8);
}
await done(0);
