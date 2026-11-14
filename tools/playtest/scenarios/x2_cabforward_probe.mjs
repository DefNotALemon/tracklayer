// Report 0119 probe: why does W stop the truck dead on open snow while S reverses? Trace speed, depth, slope, obstacles.
import { boot, ev, tap, sleep, done, park, down, up } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; true`); await sleep(600);
await park(); await sleep(400);
await ev(`GS.cash = 9000; GS.delivered = 12; garageTab = "trucks"; openGarage(); true`); await sleep(500);
await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(400);
await ev(`(() => { const s = TLX.state("vehicles"), r = s.owned[0]; const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); crashCancel(); FOOT.on = true; FOOT.x = r.x + fz * 3.2; FOOT.z = r.z - fx * 3.2; FOOT.yaw = r.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); recenter(FOOT.x, FOOT.z, true); return 1; })()`); await sleep(1200);
await tap("KeyQ"); await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14);
const lane = await J(`(() => { let best = null; for (const Y of YARDS) { if (Y.x2 === undefined || Y.r > 5) continue; const L = Math.hypot(Y.x2 - Y.x, Y.z2 - Y.z); if (!best || L > best.L) best = { x: Y.x, z: Y.z, x2: Y.x2, z2: Y.z2, L }; } return best; })()`);
// clean flat open-snow spots: no sea/water, nothing within 40 m, slope under 0.03 (all four headings tried at each)
const spots = await J(`(() => { const out = []; for (let r = 150; r < 900 && out.length < 3; r += 25) for (let a = 0; a < 6.28 && out.length < 3; a += 0.3) { const x = depot.x + Math.cos(a) * r, z = depot.z + Math.sin(a) * r;
  if (isSea(x, z) || isWater(x, z) || obNear(x, z, 40) || slopeAt(x, z, 12) > 0.03) continue; if (out.some(o => Math.hypot(o.x - x, o.z - z) < 150)) continue; out.push({ x, z }); } return out; })()`);
console.log("spots", JSON.stringify(spots));
const runs = []; for (const s of spots) for (const y of [0, Math.PI / 2, Math.PI, 4.71]) runs.push([s, y]);
for (const [s, yawAdd] of runs) {
  const off = 0;
  await ev(`(() => { P.x = ${s.x}; P.z = ${s.z}; P.yaw = ${yawAdd}; P.y = surf(P.x, P.z); P.vx = P.vy = P.vz = 0; BOG.on = false; recenter(P.x, P.z, true); camState.init = false; return 1; })()`);
  await waitGame(1.2);
  const info = await J(`({ x: P.x | 0, z: P.z | 0, yaw: +P.yaw.toFixed(2), d: +(surf(P.x, P.z) - groundAt(P.x, P.z)).toFixed(2), slope: +slopeAt(P.x, P.z, 8).toFixed(3), ob: obNear(P.x, P.z, 8) })`).catch(async e => J(`({ x: P.x | 0, z: P.z | 0, ob: obNear(P.x, P.z, 8) })`));
  console.log("spot off", off, "yaw+", yawAdd.toFixed(2), JSON.stringify(info));
  await down("KeyW");
  const tr = [];
  for (let i = 0; i < 5; i++) { await waitGame(0.8); tr.push(await J(`+Math.hypot(P.vx, P.vz).toFixed(1)`)); }
  const end = await J(`({ bog: BOG.on, x: P.x | 0, z: P.z | 0 })`);
  await up("KeyW");
  console.log("  W speeds", tr.join(" "), JSON.stringify(end));
  await waitGame(1);
}
await done(0);
