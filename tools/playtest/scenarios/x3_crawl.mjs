// Beta fix 0121 #2 / 0122 #2: the pickup crawls through 30-40 cm of fresh powder instead of going from "fine" at 25 cm to
// "stopped dead" at 35 cm. Seated truck on a flat land spot (no lake ice), a measured depth of unpacked snow laid under and
// ahead, W held 7 s from rest: distance, top speed, when (and how far in) it bogs. Asserts the shape of the curve: light
// snow still pulls away, 35 cm is a slow crawl of several metres, half a metre still stops it, deep powder still bogs fast.
// Then a pad run (RT at 60%) in 35 cm, and a run-up from packed snow into a 50 cm bank.
import { boot, ev, tap, sleep, done, down, up, errors, padSet } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.cash = 9000; WX.at = () => 0; GS.storm = 0; true`);
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400); await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400); await ev(`closeGarage(); true`);
await ev(`(() => { const r = TLX.state("vehicles").owned[0]; const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); crashCancel(); FOOT.on = true; FOOT.x = r.x + fz * 3 - fx * 0.3; FOOT.z = r.z - fx * 3 - fz * 0.3; FOOT.yaw = r.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(800); await tap("KeyQ");
ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14), "seated in the pickup");
// lay unpacked snow of depth d in a box round the truck (relative to its position): from `from` to `len` m ahead, ±wid
const lay = (d, len = 30, wid = 6, from = -6) => ev(`(() => { const cx = P.x, cz = P.z; for (let ix = Math.floor((cx - ${wid} + HALF) / CELL); ix <= Math.ceil((cx + ${wid} + HALF) / CELL); ix++) for (let iz = Math.floor((cz + ${from} + HALF) / CELL); iz <= Math.ceil((cz + ${len} + HALF) / CELL); iz++) { const c = getChunk(ix >> 5, iz >> 5), k = (iz & 31) * CH + (ix & 31), d0 = c.d[k]; c.f[k] = ${d}; c.d[k] = ${d}; writeCell(ix, iz, d0, ${d}, ${d}); } recenter(P.x, P.z, true); return 1; })()`);
const spot = await J(`(() => { const x0 = P.x, z0 = P.z; for (let r = 700; r < 2500; r += 130) for (let k = 0; k < 40; k++) { const x = x0 + Math.sin(k * 0.157 + r) * r, z = z0 + Math.cos(k * 0.157 + r) * r; if (!isSea(x, z) && !isWater(x, z) && (() => { for (let a = -2; a <= 2; a++) for (let b = -1; b <= 3; b++) { const i = clamp(Math.round((x + a * 20 + HALF) / GRES), 0, GN - 1), j = clamp(Math.round((z + b * 20 + HALF) / GRES), 0, GN - 1); if (bio[j * GN + i] === 1 || bio[j * GN + i] === 3) return false; } return true; })() && !obNear(x, z, 60) && !obNear(x, z + 30, 30) && slopeAt(x, z, 8) < 0.045 && slopeAt(x, z + 20, 10) < 0.05) return [x, z]; } return null; })()`);
console.log("spot", JSON.stringify(spot));
ok(!!spot, "found a flat land spot");
const place = () => ev(`(() => { crashCancel(); FOOT.on = false; BOG.on = false; BOG.acc = 0; BOG.immune = 0; BOG.warned = false; P.x = ${spot[0]}; P.z = ${spot[1]}; P.yaw = 0; P.vx = P.vz = 0; P.y = surf(${spot[0]}, ${spot[1]}) + 0.1; recenter(${spot[0]}, ${spot[1]}, true); return 1; })()`);
const R = {};
async function run(d, drive, secs = 7) {
  await place(); await lay(d); await waitGame(1.2);
  await ev(`window.__t0 = [P.x, P.z]; true`);
  await drive(true); const t0 = await clock(); let vmax = 0, bogAt = null, bogMv = null;
  while ((await clock()) - t0 < secs) {
    await sleep(200); await lay(d, 30, 6, 6);
    const s = await J(`{ v: Math.hypot(P.vx, P.vz), b: BOG.on, mv: Math.hypot(P.x - __t0[0], P.z - __t0[1]) }`);
    vmax = Math.max(vmax, s.v); if (s.b && bogAt === null) { bogAt = +((await clock()) - t0).toFixed(1); bogMv = +s.mv.toFixed(1); }
  }
  await drive(false);
  const r = await J(`{ mv: Math.hypot(P.x - __t0[0], P.z - __t0[1]), bog: BOG.on, nan: [P.x, P.z, P.y, camera.position.x].some(v => !isFinite(v)) }`);
  r.vmax = vmax; r.bogAt = bogAt; r.bogMv = bogMv;
  console.log(`depth ${d} m: moved ${r.mv.toFixed(1)} m in ${secs} s, vmax ${vmax.toFixed(1)} m/s, bog ${r.bog}${bogAt !== null ? ` (at ${bogAt} s, ${bogMv} m in)` : ""}`);
  return r;
}
const keyW = on => on ? down("KeyW") : up("KeyW");
for (const d of (process.env.DBG ? [] : [0.15, 0.25, 0.30, 0.35, 0.40, 0.45, 0.5, 0.8])) R[d] = await run(d, keyW);
ok(R[0.15].mv > 25 && !R[0.15].bog, `15 cm pulls away (${R[0.15].mv.toFixed(1)} m > 25)`);
ok(R[0.25].mv > 18 && !R[0.25].bog, `25 cm pulls away (${R[0.25].mv.toFixed(1)} m > 18)`);
ok(R[0.30].mv > 8, `30 cm still moves (${R[0.30].mv.toFixed(1)} m > 8)`);
const m35 = R[0.35].bog ? R[0.35].bogMv : R[0.35].mv;
ok(m35 >= 5, `35 cm crawls several metres before any bog (${m35} m >= 5)`);
ok(R[0.35].vmax < 5.5, `35 cm is a crawl, not a run (vmax ${R[0.35].vmax.toFixed(1)} < 5.5 m/s)`);
ok(R[0.40].mv < R[0.35].mv && R[0.45].mv < 3, `40 cm creeps less than 35 cm (${R[0.40].mv.toFixed(1)} m) and 45 cm stops (${R[0.45].mv.toFixed(1)} m)`);
ok(R[0.35].vmax < R[0.25].vmax, `35 cm is slower than 25 cm (${R[0.35].vmax.toFixed(1)} < ${R[0.25].vmax.toFixed(1)} m/s)`);
ok(R[0.25].mv > R[0.35].mv && R[0.35].mv > R[0.5].mv, "distance falls with depth (25 > 35 > 50 cm)");
ok(R[0.5].mv < 3, `50 cm of powder still stops a pickup from rest (${R[0.5].mv.toFixed(1)} m < 3)`);
ok(R[0.8].bog && R[0.8].bogAt !== null && R[0.8].bogAt <= 5, `80 cm bogs it within 5 s (${R[0.8].bogAt})`);
ok(Object.values(R).every(r => !r.nan), "no NaN");
// pad, feathered: RT at 60% in 35 cm
const pad = on => on ? padSet({ 7: 0.6 }, [0, 0, 0, 0]) : padSet();
const rp = await run(0.35, pad);
ok(rp.mv >= 3 && !rp.nan, `pad RT 60% crawls through 35 cm (${rp.mv.toFixed(1)} m >= 3)`);
// a run-up on hard pack into a 50 cm bank: momentum carries it in a few metres, then it stops. The snow field streams
// round the player, so the layout is re-laid (fixed in the world) while it drives, as the laps above do
await place();
await ev(`window.__z0 = P.z; window.__x0 = P.x; window.__runup = () => { for (let ix = Math.floor((__x0 - 6 + HALF) / CELL); ix <= Math.ceil((__x0 + 6 + HALF) / CELL); ix++) for (let iz = Math.floor((__z0 - 6 + HALF) / CELL); iz <= Math.ceil((__z0 + 45 + HALF) / CELL); iz++) { const z = iz * CELL - HALF; if (z < P.z + 3 && z > __z0 + 18) continue; const dd = z < __z0 + 18 ? 0.03 : 0.5, c = getChunk(ix >> 5, iz >> 5), k = (iz & 31) * CH + (ix & 31), d0 = c.d[k]; if (z < P.z + 3 && dd === 0.5) continue; c.f[k] = dd; c.d[k] = dd; writeCell(ix, iz, d0, dd, dd); } }; __runup(); recenter(P.x, P.z, true); true`);
await waitGame(1); await down("KeyW");
let into = 0, vin = 0; { const t0 = await clock(); while ((await clock()) - t0 < 15) { await sleep(200); const s = await J(`(() => { __runup(); return { dz: +(P.z - __z0).toFixed(1), v: +Math.hypot(P.vx, P.vz).toFixed(1), dr: Math.round(P.drag), sk: +(P.exc / 0.9).toFixed(2), b: BOG.acc.toFixed(2) }; })()`); if (s.dz + 2.6 < 18) vin = s.v; if (process.env.DBG) console.log(JSON.stringify(s)); } }
await up("KeyW");
const ru = await J(`{ dz: P.z - __z0, v: Math.hypot(P.vx, P.vz), bog: BOG.on }`);
into = ru.dz - 18 + 2.6;
console.log(`hit the bank at ${vin.toFixed(1)} m/s`);
console.log(`run-up into a 50 cm bank: front ${into.toFixed(1)} m into it, bog ${ru.bog}, v ${ru.v.toFixed(1)}`);
ok(into > 1 && into < 25 && (ru.bog || ru.v < 0.5), `momentum carries it into the bank and it stops there (${into.toFixed(1)} m in, v ${ru.v.toFixed(1)}, bog ${ru.bog})`);
console.log("page errors:", errors.length ? errors.join(" | ") : "none");
ok(!errors.length, "no page errors");
await done(fails ? 1 : 0);
