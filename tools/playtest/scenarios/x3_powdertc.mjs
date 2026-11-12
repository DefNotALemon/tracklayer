// Beta 0140 #1-#3 (pickup traction control): no cliff between 35 cm (crawl) and 45 cm (stops): 38-40 cm creeps; a pad
// throttle that is making way (RT 45%) and a truck backing through 35 cm are never told to "ease off"; a stalled light
// throttle still asks for more. Asserting; exit 1 on a fail. TELE=1 prints per-sample telemetry.
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
const layAt = (cx, cz, d, w = 22) => ev(`(() => { for (let ix = Math.floor((${cx} - ${w} + HALF) / CELL); ix <= Math.ceil((${cx} + ${w} + HALF) / CELL); ix++) for (let iz = Math.floor((${cz} - ${w} + HALF) / CELL); iz <= Math.ceil((${cz} + ${w} + HALF) / CELL); iz++) { const c = getChunk(ix >> 5, iz >> 5), k = (iz & 31) * CH + (ix & 31), d0 = c.d[k]; c.f[k] = ${d}; c.d[k] = ${d}; writeCell(ix, iz, d0, ${d}, ${d}); } recenter(P.x, P.z, true); return 1; })()`);
// spots: a gentle grade (1.5-3%) and a ~10% hill, yaw uphill, land only
const find = (lo, hi) => J(`(() => { const x0 = P.x, z0 = P.z; for (let r = 600; r < 2600; r += 90) for (let k = 0; k < 60; k++) { const x = x0 + Math.sin(k * 0.105 + r) * r, z = z0 + Math.cos(k * 0.105 + r) * r; if (isSea(x, z) || isWater(x, z) || obNear(x, z, 60)) continue; let bad = false; for (let a = -2; a <= 2 && !bad; a++) for (let b = -2; b <= 2; b++) { const i = clamp(Math.round((x + a * 20 + HALF) / GRES), 0, GN - 1), j = clamp(Math.round((z + b * 20 + HALF) / GRES), 0, GN - 1); if (bio[j * GN + i] === 1 || bio[j * GN + i] === 3) { bad = true; break; } } if (bad) continue; const gx = (surf(x + 6, z) - surf(x - 6, z)) / 12, gz = (surf(x, z + 6) - surf(x, z - 6)) / 12, g = Math.hypot(gx, gz); if (g < ${lo} || g > ${hi}) continue; const yaw = Math.atan2(gx, gz); const ax = x + Math.sin(yaw) * 25, az = z + Math.cos(yaw) * 25; if (isSea(ax, az) || isWater(ax, az) || obNear(ax, az, 30)) continue; return { x, z, yaw, g }; } return null; })()`);
const gentle = await find(0.015, 0.03), hill = await find(0.085, 0.13), mid = await find(0.04, 0.07);
console.log("gentle", JSON.stringify(gentle), "hill", JSON.stringify(hill));
ok(!!gentle && !!hill, "found a gentle grade and a hill");
const place = s => ev(`(() => { crashCancel(); FOOT.on = false; BOG.on = false; BOG.acc = 0; BOG.immune = 0; BOG.warned = false; P.x = ${s.x}; P.z = ${s.z}; P.yaw = ${s.yaw}; P.vx = P.vz = 0; P.y = surf(${s.x}, ${s.z}) + 0.1; recenter(${s.x}, ${s.z}, true); document.getElementById("toasts").innerHTML = ""; if (TOASTQ) TOASTQ.length = 0; const R = TLXV.rt(); R.stillTold = false; R.stillT = 0; R.why = ""; R.hold0 = null; return 1; })()`);
async function run(label, s, d, drive, secs = 7) {
  await place(s); await layAt(s.x, s.z, d); await waitGame(1.2);
  await ev(`document.getElementById("toasts").innerHTML = ""; if (TOASTQ) TOASTQ.length = 0; TLXV.rt().why = ""; window.__t0 = [P.x, P.z]; window.__yaw0 = P.yaw; true`);
  await drive(true); const t0 = await clock(); let vmax = 0, bogAt = null, whyAt = null, why = ""; const seen = [], huds = [];
  while ((await clock()) - t0 < secs) {
    await sleep(200); await layAt(s.x, s.z, d);
    const t = (await clock()) - t0;
    const q = await J(`{ rr: TLXV.rt().fsnow / Math.max(1, TLXV.rt().t0), sk: Math.max(...TLXV.rt().sink), sp: TLXV.rt().spinK || 0, acc: BOG.acc, v: Math.hypot(P.vx, P.vz), b: BOG.on, w: TLXV.rt().why || "", ts: (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent)), hud: $("wnHud").hidden ? "" : $("wnHint").textContent }`); vmax = Math.max(vmax, q.v); if (process.env.TELE) console.log(`  t ${t.toFixed(1)} v ${q.v.toFixed(2)} rr ${q.rr.toFixed(2)} sk ${q.sk.toFixed(2)} spin ${q.sp.toFixed(2)} acc ${q.acc.toFixed(2)} why ${q.w}`);
    for (const m of q.ts) if (!seen.includes(m)) seen.push(m); if (q.hud && !huds.includes(q.hud)) huds.push(q.hud);
    if (q.b && bogAt === null) bogAt = +t.toFixed(1); if (q.w && whyAt === null) { whyAt = +t.toFixed(1); why = q.w; }
  }
  const r = await J(`{ mv: Math.hypot(P.x - __t0[0], P.z - __t0[1]), bog: BOG.on, hud: $("wnHud").hidden ? "" : $("wnHint").textContent, ts: (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent)), nan: [P.x, P.z, P.y, camera.position.x].some(v => !isFinite(v)) }`);
  await drive(false);
  for (const m of r.ts) if (!seen.includes(m)) seen.push(m); if (r.hud && !huds.includes(r.hud)) huds.push(r.hud);
  Object.assign(r, { vmax, bogAt, whyAt, why, ts: seen, hud: huds.join(" / ") });
  console.log(`${label} ${d} m: moved ${r.mv.toFixed(1)} m, vmax ${vmax.toFixed(1)}, bog ${r.bog}${bogAt !== null ? ` at ${bogAt}s` : ""}, why "${why}"${whyAt !== null ? ` at ${whyAt}s` : ""}, hud "${r.hud}", toasts ${JSON.stringify(r.ts)}`);
  ok(!r.nan, label + " no NaN"); return r;
}
const W = on => on ? down("KeyW") : up("KeyW");
const pad = v => on => on ? padSet({ 7: v }, [0, 0, 0, 0]) : padSet();
// asserts (beta 0140 #1-#3): the depth ramp has no cliff and the advice matches what the truck does
const S = on => on ? down("KeyS") : up("KeyS");
const easeOff = r => r.ts.some(t => /ease off/i.test(t)) || /ease off/i.test(r.hud);
const dd = {};
for (const d of [0.35, 0.38, 0.40, 0.42, 0.45]) dd[d] = await run(`W ${d}`, gentle, d, W, 7);
console.log("depth ramp (m):", [0.35, 0.38, 0.40, 0.42, 0.45].map(d => `${d * 100} cm ${dd[d].mv.toFixed(1)}${dd[d].bogAt !== null ? ` bog ${dd[d].bogAt}s` : ""}`).join(", "));
ok(dd[0.35].mv >= 5 && !dd[0.35].bog, `#1 35 cm still crawls (${dd[0.35].mv.toFixed(1)} m >= 5)`);
ok(dd[0.40].mv >= 1 && dd[0.40].mv < dd[0.35].mv, `#1 40 cm creeps 1 m+ and less than 35 cm (${dd[0.40].mv.toFixed(1)} m; was 0.0 + bog at 3.5 s)`);
ok(dd[0.40].bogAt === null || dd[0.40].bogAt >= 5, `#1 40 cm doesn't bog inside 5 s (bog ${dd[0.40].bogAt})`);
ok(dd[0.45].mv < 3, `#1 45 cm still stops the pickup (${dd[0.45].mv.toFixed(1)} m < 3)`);
ok(dd[0.35].mv >= dd[0.38].mv && dd[0.38].mv >= dd[0.40].mv && dd[0.40].mv >= dd[0.42].mv && dd[0.42].mv >= dd[0.45].mv - 0.2, "#1 deeper snow never goes further");
for (const d of [0.35, 0.38, 0.40]) ok(!(dd[d].mv > 1 && dd[d].ts.some(t => /digging in/i.test(t)) && !dd[d].bog), `#1 ${d * 100} cm: a creep that makes way and never bogs isn't told it's digging in`);
const p45 = await run("#2 pad RT 45%", gentle, 0.35, pad(0.45), 6);
ok(p45.mv > 1, `#2 RT 45% makes way in 35 cm (${p45.mv.toFixed(1)} m)`);
ok(!easeOff(p45), `#2 RT 45% moving isn't told to ease off (why "${p45.why}", ${JSON.stringify(p45.ts)})`);
const p30 = await run("#2 pad RT 30%", gentle, 0.35, pad(0.3), 4);
ok(p30.why === "pull" && p30.ts.some(t => /more/i.test(t)) && !easeOff(p30), `#2 RT 30% stalled still says "more throttle" (why "${p30.why}")`);
const r35 = await run("#3 reverse 35", gentle, 0.35, S, 6);
ok(r35.mv > 3 && !r35.bog, `#3 S backs through 35 cm (${r35.mv.toFixed(1)} m)`);
ok(!easeOff(r35), `#3 moving in reverse isn't told to ease off (why "${r35.why}", ${JSON.stringify(r35.ts)})`);
const r60 = await run("#3 reverse 60", gentle, 0.6, S, 6);
ok(r60.mv < 2 && r60.why !== "", `#3 60 cm behind still stops it and says why (why "${r60.why}", moved ${r60.mv.toFixed(1)} m)`);
const f80 = await run("80 cm W", gentle, 0.8, W, 6);
ok(f80.mv < 0.5 && f80.ts.some(t => /digging in|stuck/i.test(t)), `80 cm floored stops dead and is told it digs in (bog at ${f80.bogAt} s; x3_crawl holds the bog clock)`);
ok(!errors.length, "no page errors");
await done(fails ? 1 : 0);
