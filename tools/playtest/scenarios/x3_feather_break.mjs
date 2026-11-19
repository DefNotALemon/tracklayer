// Beta break of 80c2d89 (tlx-vehicles v34 standing line): light LT in reverse, exit the cab while the line shows, the sled in the same snow, a 5% trigger.
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
const lt = f => on => on ? padSet({ 6: f }, [0, 0, 0, 0]) : padSet();
const R = {};
R.p5 = await run("pad RT 5%", 0.35, rt(0.05), 6);
R.rev = await run("pad LT 15% (reverse)", 0.35, lt(0.15), 7);
R.rev100 = await run("pad LT 100% (reverse)", 0.5, lt(1), 6);
// exit the cab while the line is up
await place(); await ev(`window.__moved = 0; true`); await layAt(spot[0], spot[1], 0.35); await waitGame(1.2);
await rt(0.15)(true); await waitGame(3);
const before = await ev(`$("wnHud").hidden ? "" : $("wnHint").textContent`);
await padSet(); await tap("KeyQ"); await waitGame(0.5);
const mid = await J(`{ foot: FOOT.on, dm: DMT.on, h: $("wnHud").hidden ? "" : $("wnHint").textContent }`);
await waitUntil("FOOT.on && !DMT.on", 10); await waitGame(1);
const after = await J(`{ foot: FOOT.on, h: $("wnHud").hidden ? "" : $("wnHint").textContent, w: (TLXV.rt() || {}).why || "" }`);
console.log("exit:", JSON.stringify({ before, mid, after }));
// the sled in the same snow
await ev(`(() => { const r = TLX.state("vehicles").owned[0]; FOOT.on = false; VEH.cur = null; P.x = ${spot[0]}; P.z = ${spot[1]}; P.yaw = 0; P.vx = P.vz = 0; P.y = surf(P.x, P.z) + 0.1; recenter(P.x, P.z, true); return 1; })()`);
await waitGame(1);
const sl = await J(`{ cur: !!VEH.cur, foot: FOOT.on }`); console.log("sled state", JSON.stringify(sl));
await layAt(spot[0], spot[1], 0.35); await rt(0.15)(true); await waitGame(4);
const sled = await J(`{ h: $("wnHud").hidden ? "" : $("wnHint").textContent, mv: Math.hypot(P.x - ${spot[0]}, P.z - ${spot[1]}) }`);
await padSet(); console.log("sled:", JSON.stringify(sled));
console.log("5%:", R.p5.mv.toFixed(1), "m line", R.p5.line, "| rev15:", R.rev.mv.toFixed(1), "m line", R.rev.line, "said", JSON.stringify(R.rev.said), "| rev100/50cm line", R.rev100.line);
ok(!/NOT ENOUGH/.test(after.h) && !/NOT ENOUGH/.test(mid.h || ""), "the truck line is gone once out of the cab");
ok(!/THROTTLE|DEEP|STEEP|GRIP|SOLID/.test(sled.h), "the sled is not given a truck line");
ok(!errors.length, "no page errors" + (errors.length ? ": " + errors.join(" | ") : ""));
await done(fails ? 1 : 0);
