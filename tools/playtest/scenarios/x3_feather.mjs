// Beta fix 0320 #1 (and 0129 #1 before it): a feathered pad trigger in snow. A pickup on a flat land spot, a measured depth
// of unpacked snow laid under and ahead, the right trigger held at a fixed part of its travel from rest for 7 s of game time.
// Asserts: a light pull still creeps through a boot's depth of powder (it used to sit at 0.6 m/s and cover 1.6 m), a light
// pull the snow beats says "more throttle" on screen within ~2 s instead of sitting silent, the full pedal's crawl curve is
// where it was (keyboard W), and on hard pack a light pull is still a light pull (no lurch).
import { boot, ev, tap, sleep, done, down, up, errors, padSet, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const DBG = !!process.env.DBG;
await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.cash = 9000; WX.at = () => 0; GS.storm = 0; true`);
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400); await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400); await ev(`closeGarage(); true`);
await ev(`(() => { const r = TLX.state("vehicles").owned[0]; const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); crashCancel(); FOOT.on = true; FOOT.x = r.x + fz * 3 - fx * 0.3; FOOT.z = r.z - fx * 3 - fz * 0.3; FOOT.yaw = r.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(800); await tap("KeyQ");
ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14), "seated in the pickup");
// toasts as they appear (a toast lives 4.2 s of wall time: reading #toasts after a hold misses it)
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80);
  return 1; })()`);
// unpacked snow of depth d in a box fixed in the world round the spot
const layAt = (cx, cz, d) => ev(`(() => { for (let ix = Math.floor((${cx} - 12 + HALF) / CELL); ix <= Math.ceil((${cx} + 12 + HALF) / CELL); ix++) for (let iz = Math.floor((${cz} - 10 + HALF) / CELL); iz <= Math.ceil((${cz} + 75 + HALF) / CELL); iz++) { const x = ix * CELL - HALF, z = iz * CELL - HALF; if (Math.abs(x - P.x) < 3.2 && Math.abs(z - P.z) < 3.2 + (window.__moved ? 0 : -9)) continue; const c = getChunk(ix >> 5, iz >> 5), k = (iz & 31) * CH + (ix & 31), d0 = c.d[k]; c.f[k] = ${d}; c.d[k] = ${d}; writeCell(ix, iz, d0, ${d}, ${d}); } recenter(P.x, P.z, true); return 1; })()`);
// a flat land spot with room ahead (north, yaw 0): no lake ice or sea near, nothing solid within 25 m (the map is dense with
// roads, lots and villages now: beta 0320 #2, a 60 m clear radius leaves one candidate in 560)
const spot = await J(`(() => { const x0 = P.x, z0 = P.z; for (let r = 600; r < 2600; r += 90) for (let k = 0; k < 60; k++) { const x = x0 + Math.sin(k * 0.105 + r) * r, z = z0 + Math.cos(k * 0.105 + r) * r; if (isSea(x, z) || isWater(x, z) || obNear(x, z, 25) || obNear(x, z + 25, 15) || obNear(x, z + 50, 15)) continue; let bad = false; for (let a = -2; a <= 2 && !bad; a++) for (let b = -2; b <= 3; b++) { const i = clamp(Math.round((x + a * 20 + HALF) / GRES), 0, GN - 1), j = clamp(Math.round((z + b * 20 + HALF) / GRES), 0, GN - 1); if (bio[j * GN + i] === 1 || bio[j * GN + i] === 3) { bad = true; break; } } if (bad) continue; if (slopeAt(x, z, 8) > 0.02 || slopeAt(x, z + 15, 10) > 0.025 || slopeAt(x, z + 30, 10) > 0.03 || slopeAt(x, z + 55, 12) > 0.04) continue; if (window.TLXR && TLXR.near && (TLXR.near(x, z).d < 40 || TLXR.near(x, z + 30).d < 30)) continue; return [x, z]; } return null; })()`);
console.log("spot", JSON.stringify(spot));
ok(!!spot, "found a flat land spot");
if (!spot) await done(1);
const place = () => ev(`(() => { crashCancel(); FOOT.on = false; BOG.on = false; BOG.acc = 0; BOG.immune = 0; BOG.warned = false; P.x = ${spot[0]}; P.z = ${spot[1]}; P.yaw = 0; P.vx = P.vz = 0; P.y = surf(${spot[0]}, ${spot[1]}) + 0.1; recenter(${spot[0]}, ${spot[1]}, true); return 1; })()`);
async function run(label, d, drive, secs = 7, mid = null) {
  await place(); await ev(`window.__moved = 0; true`); await layAt(spot[0], spot[1], d); await waitGame(1.2);
  await ev(`window.__t0 = [P.x, P.z]; window.__moved = 1; true`); await clearToasts();
  await drive(true); const t0 = await clock(); let vmax = 0, bogAt = null, v3 = null, saidAt = null, line = "", lineAt = null, lineEnd = "";
  while ((await clock()) - t0 < secs) {
    await sleep(200); await layAt(spot[0], spot[1], d);
    const t = (await clock()) - t0;
    if (mid && t >= mid.at) { await mid.fn(); mid = null; }
    const q = await J(`(() => { const R = TLXV.rt() || {}; return { v: Math.hypot(P.vx, P.vz), b: BOG.on, thr: input.thr, fe: Math.round(R.fe || 0), t0: Math.round(R.t0 || 0), fs: Math.round(R.fsnow || 0), dr: Math.round(R.drag || 0), why: R.why || "", mv: +Math.hypot(P.x - __t0[0], P.z - __t0[1]).toFixed(2), n: (window.__tsaw || []).length, h: $("wnHud").hidden ? "" : $("wnHint").textContent }; })()`);
    vmax = Math.max(vmax, q.v); if (q.b && bogAt === null) bogAt = +t.toFixed(1); if (v3 === null && t >= 3) v3 = q.v; if (saidAt === null && q.n) saidAt = +t.toFixed(1);
    if (q.h && !line) { line = q.h; lineAt = +t.toFixed(1); } lineEnd = q.h;
    if (DBG) console.log("  ", t.toFixed(1), JSON.stringify(q));
  }
  await drive(false);
  const r = await J(`{ mv: Math.hypot(P.x - __t0[0], P.z - __t0[1]), bog: BOG.on, why: (TLXV.rt() || {}).why || "", nan: [P.x, P.z, P.y, camera.position.x].some(v => !isFinite(v)) }`);
  r.vmax = vmax; r.bogAt = bogAt; r.v3 = v3; r.saidAt = saidAt; r.said = await toasts(); r.line = line; r.lineAt = lineAt; r.lineEnd = lineEnd;
  await waitGame(0.4); r.lineOff = await ev(`$("wnHud").hidden ? "" : $("wnHint").textContent`);
  console.log(`${label}, ${Math.round(d * 100)} cm: moved ${r.mv.toFixed(1)} m in ${secs} s, vmax ${vmax.toFixed(1)}, v at 3 s ${(v3 ?? 0).toFixed(1)}, bog ${r.bog}${bogAt !== null ? ` at ${bogAt} s` : ""}, why "${r.why}", line ${line ? `at ${lineAt} s "${line}"` : "none"}, said ${r.saidAt !== null ? `at ${r.saidAt} s: ` : ""}${JSON.stringify(r.said)}`);
  ok(!r.nan, label + " no NaN"); return r;
}
const rt = f => on => on ? padSet({ 7: f }, [0, 0, 0, 0]) : padSet();
const keyW = on => on ? down("KeyW") : up("KeyW");
const more = r => r.said.some(m => /more/i.test(m) && /throttle/i.test(m));
const R = {};
R.p30_15 = await run("pad RT 30%", 0.15, rt(0.3));
R.p30_25 = await run("pad RT 30%", 0.25, rt(0.3));
R.p30_35 = await run("pad RT 30%", 0.35, rt(0.3));
R.p15_15 = await run("pad RT 15%", 0.15, rt(0.15));
R.p15_35 = await run("pad RT 15%", 0.35, rt(0.15), 7, { at: 3, fn: () => shot("feather_line") });
R.p60_35 = await run("pad RT 60%", 0.35, rt(0.6));
R.p100_35 = await run("pad RT 100%", 0.35, rt(1));
R.w_35 = await run("keyboard W", 0.35, keyW);
R.w_15 = await run("keyboard W", 0.15, keyW);
R.p30_0 = await run("pad RT 30% on pack", 0.02, rt(0.3), 5);
R.p100_0 = await run("pad RT 100% on pack", 0.02, rt(1), 5);
// a pull the snow beats, then squeezed on: the standing line shows, then goes as the truck makes way
R.sq = await run("pad RT 10% then 100% at 3.5 s", 0.35, rt(0.1), 8, { at: 3.5, fn: () => padSet({ 7: 1 }, [0, 0, 0, 0]) });
// and half a metre no pedal moves: the line must not go on asking for throttle the truck already has
R.deep = await run("pad RT 100%", 0.5, rt(1), 6);
if (!process.env.PROBE) {
  ok(R.p30_15.mv >= 15 && !R.p30_15.bog && !R.p30_15.said.length, `RT 30% pulls away in 15 cm (${R.p30_15.mv.toFixed(1)} m >= 15; the tester's run: 1.6 m at 0.6 m/s)`);
  ok(R.p30_25.mv >= 8 && !R.p30_25.said.length, `RT 30% makes way in 25 cm (${R.p30_25.mv.toFixed(1)} m >= 8; 0.0 before)`);
  ok(R.p30_35.mv >= 4 && !R.p30_35.said.length && !R.p30_35.line, `RT 30% crawls through 35 cm with nothing said (${R.p30_35.mv.toFixed(1)} m >= 4; 0.0 before)`);
  ok(R.p15_15.mv >= 8, `RT 15% creeps through 15 cm (${R.p15_15.mv.toFixed(1)} m >= 8; 0.0 before)`);
  ok(R.p15_35.mv < 1 && more(R.p15_35) && R.p15_35.saidAt <= 2.2, `RT 15% can't push 35 cm and is told "more throttle" within ~2 s (${R.p15_35.mv.toFixed(1)} m, said at ${R.p15_35.saidAt} s)`);
  ok(/^NOT ENOUGH THROTTLE/.test(R.p15_35.line) && R.p15_35.lineAt <= 2.2 && R.p15_35.lineEnd === R.p15_35.line, `and the driving hint says so for as long as it is held ("${R.p15_35.line}" from ${R.p15_35.lineAt} s, still there at 7 s: "${R.p15_35.lineEnd}")`);
  ok(!/NOT ENOUGH/.test(R.p15_35.lineOff), `the line goes when the trigger is let go ("${R.p15_35.lineOff}")`);
  ok(!R.p15_35.said.some(m => /ease off/i.test(m)), "a light pull is never told to ease off");
  ok(/^NOT ENOUGH THROTTLE/.test(R.sq.line) && !/NOT ENOUGH/.test(R.sq.lineEnd) && R.sq.mv >= 2, `RT 10% in 35 cm gets the line too, and squeezing on clears it and moves the truck (${R.sq.mv.toFixed(1)} m, line at the end "${R.sq.lineEnd}")`);
  ok(R.deep.mv < 3 && !/NOT ENOUGH/.test(R.deep.line) && !/NOT ENOUGH/.test(R.deep.lineEnd) && !more(R.deep), `floored in 50 cm is never asked for more throttle (line "${R.deep.line}")`);
  ok(R.p60_35.mv >= 8, `RT 60% crawls through 35 cm (${R.p60_35.mv.toFixed(1)} m >= 8)`);
  ok(R.p15_15.mv < R.p30_15.mv && R.p30_15.mv < R.w_15.mv && R.p15_35.mv < R.p30_35.mv && R.p30_35.mv <= R.p60_35.mv + 0.5 && R.p60_35.mv <= R.p100_35.mv + 1.5, `more pedal is more way (15 cm: ${R.p15_15.mv.toFixed(1)} < ${R.p30_15.mv.toFixed(1)} < ${R.w_15.mv.toFixed(1)} m; 35 cm: ${R.p15_35.mv.toFixed(1)} < ${R.p30_35.mv.toFixed(1)} <= ${R.p60_35.mv.toFixed(1)} <= ${R.p100_35.mv.toFixed(1)} m)`);
  ok(Math.abs(R.p100_35.mv - R.w_35.mv) < 3, `a full trigger is the W key (${R.p100_35.mv.toFixed(1)} vs ${R.w_35.mv.toFixed(1)} m in 35 cm)`);
  ok(R.w_35.mv >= 9 && R.w_35.mv <= 20 && R.w_35.vmax < 5.5, `the full-pedal crawl in 35 cm is where it was (${R.w_35.mv.toFixed(1)} m, vmax ${R.w_35.vmax.toFixed(1)}; 14.3 m / 4.1 before the change)`);
  ok(R.w_15.mv >= 35, `full pedal in 15 cm pulls away as before (${R.w_15.mv.toFixed(1)} m; the tester's v256 run: 45)`);
  ok(R.p30_0.v3 > 1 && R.p30_0.v3 < R.p100_0.v3 * 0.75, `on hard pack a light pull is still a light pull (v at 3 s ${R.p30_0.v3.toFixed(1)} vs ${R.p100_0.v3.toFixed(1)} m/s floored)`);
  ok(!R.p30_0.said.length, `nothing said on hard pack (${JSON.stringify(R.p30_0.said)})`);
}
ok(!errors.length, "no page errors" + (errors.length ? ": " + errors.join(" | ") : ""));
await done(fails ? 1 : 0);
