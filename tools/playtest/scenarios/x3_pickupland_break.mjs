// LAND repeat (spot excludes lake ice) + hint visibility check of the v189 pickup fix (light fresh snow no longer digs it in; bog clears on plowed ground).
// Seated truck at an open flat spot; lays a measured depth of unpacked snow under/ahead, holds W 6 s from rest, logs
// distance + bog per depth. Then: bog state carried onto a plowed lane clears? Reverse trigger on pad at light pull.
import { boot, ev, tap, sleep, done, down, up, errors, padSet, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.cash = 9000; true`);
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400); await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400); await ev(`closeGarage(); true`);
await ev(`(() => { const r = TLX.state("vehicles").owned[0]; const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); crashCancel(); FOOT.on = true; FOOT.x = r.x + fz * 3 - fx * 0.3; FOOT.z = r.z - fx * 3 - fz * 0.3; FOOT.yaw = r.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(800); await tap("KeyQ");
ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14), "seated");
const lay = (d, len = 30, wid = 6, from = -6) => ev(`(() => { const cx = P.x, cz = P.z; for (let ix = Math.floor((cx - ${wid} + HALF) / CELL); ix <= Math.ceil((cx + ${wid} + HALF) / CELL); ix++) for (let iz = Math.floor((cz + ${from} + HALF) / CELL); iz <= Math.ceil((cz + ${len} + HALF) / CELL); iz++) { const c = getChunk(ix >> 5, iz >> 5), k = (iz & 31) * CH + (ix & 31), d0 = c.d[k]; c.f[k] = ${d}; c.d[k] = ${d}; writeCell(ix, iz, d0, ${d}, ${d}); } recenter(P.x, P.z, true); return 1; })()`);
const spot = await J(`(() => { const x0 = P.x, z0 = P.z; for (let r = 700; r < 2500; r += 130) for (let k = 0; k < 40; k++) { const x = x0 + Math.sin(k * 0.157 + r) * r, z = z0 + Math.cos(k * 0.157 + r) * r; if (!isSea(x, z) && !isWater(x, z) && (() => { for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) { const i = clamp(Math.round((x + a * 20 + HALF) / GRES), 0, GN - 1), j = clamp(Math.round((z + b * 20 + HALF) / GRES), 0, GN - 1); if (bio[j * GN + i] === 1 || bio[j * GN + i] === 3) return false; } return true; })() && !obNear(x, z, 60) && slopeAt(x, z, 8) < 0.04) return [x, z]; } return null; })()`);
console.log("spot", spot);
for (const d of [0.08, 0.15, 0.25, 0.35, 0.5, 0.8]) {
  await ev(`(() => { BOG.on = false; BOG.acc = 0; BOG.immune = 0; P.x = ${spot[0]}; P.z = ${spot[1]}; P.yaw = 0; P.vx = P.vz = 0; P.y = surf(${spot[0]}, ${spot[1]}) + 0.1; recenter(${spot[0]}, ${spot[1]}, true); return 1; })()`);
  await lay(d); await waitGame(1.2);
  await ev(`window.__t0 = [P.x, P.z]; true`);
  await down("KeyW"); const t0 = await clock(); let vmax = 0, bogAt = null;
  while ((await clock()) - t0 < 7) { await sleep(250); await lay(d, 30, 6, 6); const s = await J(`{ v: Math.hypot(P.vx, P.vz), b: BOG.on }`); vmax = Math.max(vmax, s.v); if (s.b && bogAt === null) bogAt = +((await clock()) - t0).toFixed(1); }
  await up("KeyW");
  const r = await J(`{ mv: Math.hypot(P.x - __t0[0], P.z - __t0[1]), bog: BOG.on, hint: $("wnHint").textContent }`);
  console.log(`depth ${d} m: moved ${r.mv.toFixed(1)} m in 7 s, vmax ${vmax.toFixed(1)}, bog ${r.bog} (at ${bogAt}), hint "${r.hint}"`);
}
// bogged, then dragged onto plowed ground
await ev(`(() => { BOG.on = true; BOG.acc = 5; return 1; })()`);
const lane = await J(`(() => { let best = null; for (const Y of YARDS) { if (Y.x2 === undefined || Math.hypot(Y.x - depot.x, Y.z - depot.z) > TOWN_R || Y.r > 2) continue; const L = Math.hypot(Y.x2 - Y.x, Y.z2 - Y.z); if (!best || L > best.L) best = { x: Y.x, z: Y.z, L }; } return best; })()`);
await ev(`(() => { P.x = ${lane.x} + 2; P.z = ${lane.z} + 2; P.vx = P.vz = 0; recenter(P.x, P.z, true); return 1; })()`);
await waitGame(3);
const b1 = await J(`{ bog: BOG.on, hint: $("wnHint").textContent, hidden: $("wnHud").hidden }`);
console.log("after moving a bogged truck onto a lane:", JSON.stringify(b1));
ok(!b1.bog, "bog clears on plowed ground");
// bog, reload mid-bog, night
await ev(`(() => { P.x = ${spot[0]}; P.z = ${spot[1]}; P.yaw = 0; P.vx = P.vz = 0; BOG.on = false; BOG.acc = 0; BOG.immune = 0; P.y = surf(P.x, P.z) + 0.1; recenter(P.x, P.z, true); return 1; })()`);
await lay(0.6); await waitGame(1); await down("KeyW"); await waitGame(4); await up("KeyW");
const bb = await J(`{ bog: BOG.on, hint: $("wnHint").textContent, hidden: $("wnHud").hidden, nan: [P.x, P.z, camera.position.x].some(v => !isFinite(v)) }`);
console.log("deep 0.6 m bog:", JSON.stringify(bb)); ok(bb.bog && !bb.hidden && /STUCK/.test(bb.hint), "bog shows STUCK hint");
await ev(`GS.hour = 23; true`); await waitGame(1);
await reload(); await sleep(1500); await waitGame(1.5);
console.log("after reload bogged:", JSON.stringify(await J(`{ cur: !!VEH.cur, foot: FOOT.on, bog: BOG.on, hud: $("wnHud").hidden, hint: $("wnHint").textContent, hour: GS.hour, nan: [P.x, P.z, camera.position.x].some(v => !isFinite(v)) }`)));
// pad: light trigger from rest on light snow
await ev(`(() => { P.x = ${spot[0]}; P.z = ${spot[1]}; P.yaw = 0; P.vx = P.vz = 0; BOG.on = false; recenter(P.x, P.z, true); return 1; })()`);
await lay(0.15); await waitGame(1);
await ev(`window.__t0 = [P.x, P.z]; true`);
await padSet({ 7: 1 }, [0, 0, 0, 0]).catch(e => console.log("pad err", e.message));
await waitGame(5); await padSet();
console.log("pad RT 5 s on 0.15 m:", JSON.stringify(await J(`{ mv: Math.hypot(P.x - __t0[0], P.z - __t0[1]), bog: BOG.on }`)));
console.log("page errors:", errors.length ? errors.join(" | ") : "none");
await done(fails ? 1 : 0);
