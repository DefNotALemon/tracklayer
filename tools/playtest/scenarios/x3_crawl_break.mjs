// Beta break of 3.x v192 powder crawl: uphill in 35 cm, reverse in 35 cm, feathered keys-less pad 30%, stop/start inside the
// crawl, escape from a 40 cm bog by reversing, night, and the sled (should be unaffected). Reports numbers, asserts only no NaN/errors.
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
// lay depth d in a disc-ish box centred on (cx,cz) of half-size w
const layAt = (cx, cz, d, w = 22) => ev(`(() => { for (let ix = Math.floor((${cx} - ${w} + HALF) / CELL); ix <= Math.ceil((${cx} + ${w} + HALF) / CELL); ix++) for (let iz = Math.floor((${cz} - ${w} + HALF) / CELL); iz <= Math.ceil((${cz} + ${w} + HALF) / CELL); iz++) { const c = getChunk(ix >> 5, iz >> 5), k = (iz & 31) * CH + (ix & 31), d0 = c.d[k]; c.f[k] = ${d}; c.d[k] = ${d}; writeCell(ix, iz, d0, ${d}, ${d}); } recenter(P.x, P.z, true); return 1; })()`);
// find spots: flat and a ~10% slope (yaw uphill), land only
const find = (lo, hi) => J(`(() => { const x0 = P.x, z0 = P.z; for (let r = 600; r < 2600; r += 90) for (let k = 0; k < 60; k++) { const x = x0 + Math.sin(k * 0.105 + r) * r, z = z0 + Math.cos(k * 0.105 + r) * r; if (isSea(x, z) || isWater(x, z) || obNear(x, z, 60)) continue; let bad = false; for (let a = -2; a <= 2 && !bad; a++) for (let b = -2; b <= 2; b++) { const i = clamp(Math.round((x + a * 20 + HALF) / GRES), 0, GN - 1), j = clamp(Math.round((z + b * 20 + HALF) / GRES), 0, GN - 1); if (bio[j * GN + i] === 1 || bio[j * GN + i] === 3) { bad = true; break; } } if (bad) continue; const gx = (surf(x + 6, z) - surf(x - 6, z)) / 12, gz = (surf(x, z + 6) - surf(x, z - 6)) / 12, g = Math.hypot(gx, gz); if (g < ${lo} || g > ${hi}) continue; const yaw = Math.atan2(gx, gz); const ax = x + Math.sin(yaw) * 25, az = z + Math.cos(yaw) * 25; if (isSea(ax, az) || isWater(ax, az) || obNear(ax, az, 30)) continue; return { x, z, yaw, g }; } return null; })()`);
const flat = await find(0, 0.03), hill = await find(0.08, 0.13);
console.log("flat", JSON.stringify(flat), "hill", JSON.stringify(hill));
ok(!!flat && !!hill, "found flat and hill spots");
const place = s => ev(`(() => { crashCancel(); FOOT.on = false; BOG.on = false; BOG.acc = 0; BOG.immune = 0; BOG.warned = false; P.x = ${s.x}; P.z = ${s.z}; P.yaw = ${s.yaw ?? 0}; P.vx = P.vz = 0; P.y = surf(${s.x}, ${s.z}) + 0.1; recenter(${s.x}, ${s.z}, true); return 1; })()`);
async function run(label, s, d, drive, secs = 7, mid = null) {
  await place(s); await layAt(s.x, s.z, d); await waitGame(1.2);
  await ev(`window.__t0 = [P.x, P.z]; window.__yaw0 = P.yaw; true`);
  await drive(true); const t0 = await clock(); let vmax = 0, bogAt = null, midDone = false;
  while ((await clock()) - t0 < secs) {
    await sleep(200); await layAt(s.x, s.z, d);
    const t = (await clock()) - t0;
    if (mid && !midDone && t > mid.at) { midDone = true; await mid.fn(); }
    const q = await J(`{ v: Math.hypot(P.vx, P.vz), b: BOG.on }`); vmax = Math.max(vmax, q.v); if (q.b && bogAt === null) bogAt = +t.toFixed(1);
  }
  await drive(false);
  const r = await J(`{ mv: Math.hypot(P.x - __t0[0], P.z - __t0[1]), fwd: (P.x - __t0[0]) * Math.sin(__yaw0) + (P.z - __t0[1]) * Math.cos(__yaw0), bog: BOG.on, hint: $("wnHint").textContent, hid: $("wnHud").hidden, nan: [P.x, P.z, P.y, camera.position.x].some(v => !isFinite(v)) }`);
  console.log(`${label} ${d} m: moved ${r.mv.toFixed(1)} m (fwd ${r.fwd.toFixed(1)}), vmax ${vmax.toFixed(1)}, bog ${r.bog}${bogAt !== null ? ` at ${bogAt}s` : ""}, hud ${r.hid ? "hidden" : r.hint}`);
  ok(!r.nan, label + " no NaN"); return { ...r, vmax, bogAt };
}
const W = on => on ? down("KeyW") : up("KeyW"), S = on => on ? down("KeyS") : up("KeyS");
const pad3 = on => on ? padSet({ 7: 0.3 }, [0, 0, 0, 0]) : padSet();
await run("flat W", flat, 0.35, W);
await run("hill(" + hill.g.toFixed(2) + ") W", hill, 0.0, W, 5);
await run("hill W", hill, 0.2, W);
await run("hill W", hill, 0.3, W);
await run("hill W", hill, 0.35, W);
await run("flat reverse S", flat, 0.15, S);
await run("flat reverse S", flat, 0.35, S);
await run("flat pad RT 30%", flat, 0.15, pad3);
await run("flat pad RT 30%", flat, 0.35, pad3);
// stop-start inside the crawl: release W at 3 s, press again at 4.5 s
await run("flat W release/re-press", flat, 0.35, W, 9, { at: 3, fn: async () => { await up("KeyW"); await waitGame(1.5); await down("KeyW"); } });
// 40 cm bog then reverse out
{
  await run("flat W into 40", flat, 0.40, W, 6);
  await ev(`window.__pb = [P.x, P.z]; true`);
  await layAt(flat.x, flat.z, 0.40); await down("KeyS"); await waitGame(5); await up("KeyS");
  const r = await J(`{ mv: Math.hypot(P.x - __pb[0], P.z - __pb[1]), bog: BOG.on }`);
  console.log("bogged 40 cm then S 5 s:", JSON.stringify(r));
}
// night
await ev(`GS.hour = 23; true`);
await run("night flat W", flat, 0.35, W);
await run("night hill W", hill, 0.3, W);
console.log("page errors:", errors.length ? errors.join(" | ") : "none");
ok(!errors.length, "no page errors");
await done(fails ? 1 : 0);
