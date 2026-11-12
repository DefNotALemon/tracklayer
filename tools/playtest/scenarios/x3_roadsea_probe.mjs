// 3.1 beta probe: (a) how close each road's line runs to the sea/water; (b) pickup driven into the sea: sinks? any toast / STUCK prompt? does N (reset) recover?
import { boot, ev, sleep, done, down, up, tap, shot, sideCam, camOff } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; GS.cash = 9000; true`); await sleep(600);
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400); await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400); await ev(`closeGarage(); true`);
await ev(`(() => { const r = TLX.state("vehicles").owned[0]; const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); FOOT.on = true; FOOT.x = r.x + fz * 3 - fx * 0.3; FOOT.z = r.z - fx * 3 - fz * 0.3; FOOT.yaw = r.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(800); await tap("KeyQ"); await waitGame(5);
// (a) nearest sea/water to each route (sample ring 4..30 m round every 4th point)
const near = await J(`TLXR.routes.map(r => { let best = 1e9, at = -1, shore = 0; for (let i = 0; i < r.pts.length; i += 3) { const [x, z] = r.pts[i]; let hit = 0; for (const d of [3, 6, 9, 12, 16, 20, 30]) { for (let a = 0; a < 8; a++) { const px = x + Math.cos(a * 0.785) * d, pz = z + Math.sin(a * 0.785) * d; if (isSea(px, pz) || isWater(px, pz)) { hit = d; break; } } if (hit) break; } if (hit) { shore++; if (hit < best) { best = hit; at = i; } } } return { id: r.id, n: r.pts.length, ptsNearWater: shore, minWaterDist: best === 1e9 ? null : best, at }; })`);
console.log("water near roads", JSON.stringify(near));
// (b) into the sea, from the road at gamvik's closest-to-water point
const g = near.find(r => r.id === "gamvik");
const idx = g.at >= 0 ? g.at : 100;
await ev(`(() => { const S = [1493, -2822]; const r = TLXR.routes[1]; let bi = 0, bd = 1e9; for (let i = 0; i < r.pts.length; i++) { const d = Math.hypot(r.pts[i][0] - S[0], r.pts[i][1] - S[1]); if (d < bd) { bd = d; bi = i; } } const a = r.pts[bi]; console.log("nearest route pt", bi, bd); window.__seaD = { bi, bd }; BOG.on = false; crashCancel(); P.x = S[0]; P.z = S[1]; P.yaw = Math.atan2(S[0] - a[0], S[1] - a[1]); P.vx = P.vz = P.vy = 0; P.y = 0.5; recenter(S[0], S[1], true); return 1; })()`);
console.log("start", JSON.stringify(await J(`({ d: window.__seaD, x: Math.round(P.x), z: Math.round(P.z), sea: isSea(P.x, P.z), yard: yardAt(P.x, P.z), slope: slopeAt(P.x, P.z, 8) })`)));
await waitGame(1);
await down("KeyW");
for (let k = 0; k < 6; k++) {
  await waitGame(2.5);
  console.log("t", k, JSON.stringify(await J(`({ v: +Math.hypot(P.vx, P.vz).toFixed(1), wet: P.wet, sink: P.sink, sea: isSea(P.x, P.z), stuckT: +P.stuckT.toFixed(1), flipHidden: $("flip").hidden, bog: BOG.on, toasts: [...document.querySelectorAll("#toasts *")].map(e => e.textContent).slice(-2), crash: !!(CRASH && CRASH.on) })`)));
  if (k === 3) { await sideCam(undefined, 7, 2.4, Math.PI * 0.8); await sleep(300); await shot("sea_pickup"); await camOff(); }
}
await up("KeyW");
await tap("KeyN"); await waitGame(4);
console.log("after N", JSON.stringify(await J(`({ v: +Math.hypot(P.vx, P.vz).toFixed(1), wet: P.wet, sink: P.sink, sea: isSea(P.x, P.z), x: Math.round(P.x), z: Math.round(P.z), veh: !!VEH.cur, foot: FOOT.on })`)));
await down("KeyS"); await waitGame(5); await up("KeyS");
console.log("after reverse", JSON.stringify(await J(`({ v: +Math.hypot(P.vx, P.vz).toFixed(1), wet: P.wet, sink: P.sink, sea: isSea(P.x, P.z) })`)));
await done(0);
