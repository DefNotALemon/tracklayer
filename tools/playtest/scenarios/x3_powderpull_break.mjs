// Beta break of 3.x v15 pickup traction control/"more throttle" hint: 30-40 cm on the gentle grade, hill depths, pad ramp, reverse, night, nan.
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
    const q = await J(`{ v: Math.hypot(P.vx, P.vz), b: BOG.on, w: TLXV.rt().why || "", ts: (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent)), hud: $("wnHud").hidden ? "" : $("wnHint").textContent }`); vmax = Math.max(vmax, q.v);
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

console.log("mid", JSON.stringify(mid));
const S = on => on ? down("KeyS") : up("KeyS");
const out = {};
out.g30 = await run("g30 W", gentle, 0.30, W, 6);
out.g40 = await run("g40 W", gentle, 0.40, W, 8);
out.g42 = await run("g42 W", gentle, 0.42, W, 8);
out.g35pad100 = await run("g35 pad100", gentle, 0.35, pad(1.0), 7);
out.g35pad40 = await run("g35 pad40", gentle, 0.35, pad(0.4), 7);
out.g35pad45 = await run("g35 pad45", gentle, 0.35, pad(0.45), 7);
out.g10pad5 = await run("g10 pad 5%", gentle, 0.10, pad(0.05), 4);
out.bare_pad5 = await run("bare pad 5%", gentle, 0.0, pad(0.05), 4);
out.m20 = await run("mid20 W", mid, 0.20, W, 6);
out.m30 = await run("mid30 W", mid, 0.30, W, 6);
out.m35 = await run("mid35 W", mid, 0.35, W, 7);
out.h10 = await run("hill 10cm W", hill, 0.10, W, 5);
out.h15 = await run("hill 15cm W", hill, 0.15, W, 5);
out.r35 = await run("gentle reverse 35", gentle, 0.35, S, 7);
await ev(`GS.hour = 23; true`);
out.n35 = await run("night g35 W", gentle, 0.35, W, 8);
await ev(`GS.hour = 12; true`);
// pad ramp: 30% (hint) then 70% after 2 s; does it get going and does the hint clear
await place(gentle); await layAt(gentle.x, gentle.z, 0.35); await waitGame(1.2);
await ev(`window.__t0 = [P.x, P.z]; true`);
await pad(0.3)(true); await waitGame(2.5);
const hintSeen = await J(`{ why: TLXV.rt().why, ts: (TOASTQ||[]).map(t=>t.msg).concat([...$("toasts").children].map(c=>c.textContent)) }`);
await pad(0.7)(true); const tt = await clock(); let moved = 0;
while ((await clock()) - tt < 5) { await sleep(200); await layAt(gentle.x, gentle.z, 0.35); }
moved = await J(`{ mv: Math.hypot(P.x - __t0[0], P.z - __t0[1]), why: TLXV.rt().why, bog: BOG.on }`);
await pad(0)(false);
console.log("ramp 30%->70%:", JSON.stringify(hintSeen), JSON.stringify(moved));
// deep W then ease: 36->20cm after stall
console.log("SUMMARY", JSON.stringify(Object.fromEntries(Object.entries(out).map(([k,v])=>[k,{mv:+v.mv.toFixed(1),bog:v.bogAt,why:v.why,whyAt:v.whyAt}]))));
ok(!errors.length, "no page errors");
await done(0);
