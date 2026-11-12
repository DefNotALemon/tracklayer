// Probe for beta 0116 #1: where does the pickup sit silent with S held? Logs per-step internals at the 0116 break
// scenario's spot 5 (reverse with full lock after backing 12 m) and on its 10% uphill spot.
import { boot, ev, sleep, done, park, down, up } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
const toasts = () => J(`[...document.querySelectorAll("#toasts > *")].map(e => e.textContent)`);
await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; true`);
await park(); await sleep(400);
await ev(`GS.cash = 9000; garageTab = "trucks"; openGarage(); true`); await sleep(500);
await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(400);
await ev(`(() => { const r = TLX.state("vehicles").owned[0], fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); crashCancel(); FOOT.on = true; FOOT.x = r.x + fz * 3.2; FOOT.z = r.z - fx * 3.2; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.yaw = r.yaw - 1.4; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(800); await down("KeyQ"); await sleep(120); await up("KeyQ");
console.log("in", await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14));
const base0 = await J(`({ x: P.x, z: P.z })`);
const tel = () => J(`(() => { const R = TLXV.rt(); return { t: +gameClock.toFixed(2), x: +P.x.toFixed(2), z: +P.z.toFixed(2), rev: R.rev, fx: R.fx | 0, drag: R.drag | 0, gp: +(R.gp || 0).toFixed(2), vfA: +(R.vfA || 0).toFixed(2), gok: R.gok, sink: R.sink.map(v => +v.toFixed(2)), H: R.H.map(v => +(v - P.y).toFixed(2)), acc: +BOG.acc.toFixed(2), bog: BOG.on, spin: +R.spinK.toFixed(2) }; })()`);
const watch = async (keys, s) => { for (const k of keys) await down(k); const t0 = await clock(); while ((await clock()) - t0 < s) { console.log(JSON.stringify(await tel())); await sleep(350); } for (const k of keys) await up(k); console.log("toasts", JSON.stringify(await toasts())); };
let spotN = 4;
const fresh = async () => { spotN++; await ev(`(() => { BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; const cx = ${base0.x}, cz = ${base0.z}; for (let i = 0; i < 6000; i++) { const a = (i + ${spotN} * 37) * 2.39996, r = 60 + ${spotN} * 45 + i * 0.1, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; if (isSea(x, z) || isWater(x, z) || obNear(x, z, 25) || slopeAt(x, z, 8) > 0.04 || (yardAt && yardAt(x, z))) continue; const ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL); if (depthAt(ix, iz) > 0.3) continue; P.x = x; P.z = z; P.yaw = a; P.vx = P.vz = 0; P.y = surf(x, z); recenter(x, z, true); return 1; } return 0; })()`); await waitGame(1.5); };
await fresh();
console.log("--- D: S 3 s"); await watch(["KeyS"], 3);
await down("KeyS"); await waitUntil("Math.hypot(P.vx, P.vz) < 0.3", 8); await up("KeyS"); await waitGame(1);
console.log("--- D: S + A 4 s"); await watch(["KeyS", "KeyA"], 4);
const sl = await J(`(() => { const cx = P.x, cz = P.z; for (let i = 0; i < 6000; i++) { const a = i * 2.39996, r = 30 + i * 0.2, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; if (isSea(x, z) || isWater(x, z) || obNear(x, z, 20)) continue; const g = slopeAt(x, z, 8); if (g > 0.10 && g < 0.2) { const e = 1, gx = (surf(x + e, z) - surf(x - e, z)) / 2, gz = (surf(x, z + e) - surf(x, z - e)) / 2; return { x, z, g, yaw: Math.atan2(-gx, -gz) }; } } return null; })()`);
console.log("slope", JSON.stringify(sl));
await ev(`(() => { P.x = ${sl.x}; P.z = ${sl.z}; P.yaw = ${sl.yaw}; P.vx = P.vz = 0; P.y = surf(P.x, P.z); BOG.on = false; BOG.acc = 0; BOG.immune = 0; recenter(P.x, P.z, true); return 1; })()`); await waitGame(1);
console.log("--- G: S 5 s uphill"); await watch(["KeyS"], 5);
console.log("--- G: W 3 s downhill"); await watch(["KeyW"], 2);
await done(0);
