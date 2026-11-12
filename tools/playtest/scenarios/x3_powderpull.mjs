// Beta 0129 #1/#2 (pickup in powder): a light pad throttle that can't push 35 cm says "more throttle" (not "ease off") within
// ~1.5 s; traction control keeps a floored W crawling through 35 cm on a ~2% grade instead of spinning into a bog; it does
// NOT help a truck the snow alone outweighs (45 cm still stops, 80 cm still bogs); a 20 cm drift up a ~10% grade says
// "steep", not "ease off". Asserting; exit 1 on any fail.
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
const gentle = await find(0.015, 0.03), hill = await find(0.085, 0.13);
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
// 1. light pad throttle stalls in 35 cm: says why, asks for MORE throttle, never "ease off", no bog
const a = await run("A gentle pad RT 30%", gentle, 0.35, pad(0.3), 5);
ok(a.why === "pull" && a.whyAt !== null && a.whyAt <= 2 && a.ts.some(t => /more/i.test(t)), `A 30% RT stalled says "more throttle" (why "${a.why}" at ${a.whyAt} s)`);
ok(!a.ts.some(t => /ease off/i.test(t)) && !/ease off/i.test(a.hud) && !a.bog, "A no 'ease off' advice and no bog at 30%");
const a15 = await run("A2 gentle pad RT 15%", gentle, 0.2, pad(0.15), 4);
ok(a15.mv > 2 || a15.why === "pull", `A2 15% RT in 20 cm moves or says why (moved ${a15.mv.toFixed(1)} m, why "${a15.why}")`);
// 2. after the hint: more pad throttle crawls
const b = await run("B gentle pad RT 60%", gentle, 0.35, pad(0.6), 7);
ok(b.mv >= 4 && !b.bog, `B 60% RT crawls through 35 cm on the grade (${b.mv.toFixed(1)} m >= 4, no bog)`);
// 3. keyboard W floored on the ~2% grade: traction control, no spin-out bog (before v196: 4.5 m, bog at 5.4 s)
const c = await run("C gentle W", gentle, 0.35, W, 9);
ok(c.mv >= 6 && !c.bog, `C W crawls 35 cm up a ${(gentle.g * 100).toFixed(1)}% grade without bogging (${c.mv.toFixed(1)} m >= 6, bog ${c.bog})`);
ok(c.vmax < 5.5, `C still a crawl (vmax ${c.vmax.toFixed(1)} < 5.5)`);
ok(!c.ts.some(t => /ease off/i.test(t)) && !/ease off/i.test(c.hud), `C a crawl that makes way isn't told to ease off (hud "${c.hud}")`);
// 4. too deep: traction control can't help, it still stops / bogs
const e = await run("E gentle W", gentle, 0.45, W, 6);
ok(e.mv < 3, `E 45 cm still stops a pickup (${e.mv.toFixed(1)} m < 3)`);
const f = await run("F gentle W", gentle, 0.8, W, 6);
/* this run relays 80 cm under the truck every 200 ms, which lifts it off the ground for a frame and resets the dig
   clock, so the bog time here is the harness's (bogged at 4.5 s in 0140, not inside 6 s on main fb49641/56a0db3):
   assert it stops and digs; x3_crawl holds the real 5 s bog line (beta 0140 fix pass) */
ok(f.mv < 0.5 && (f.bog || f.ts.some(t => /digging in/i.test(t))), `F 80 cm stops it dead and digs in (moved ${f.mv.toFixed(1)} m, bog ${f.bogAt})`);
// 5. a 20 cm drift up the hill: the grade stops it and it says steep (not "ease off")
const h = await run("H hill W", hill, 0.2, W, 5);
ok(h.why === "steep" && h.ts.some(t => /steep/i.test(t)) && !h.ts.some(t => /ease off/i.test(t)), `H 20 cm up a ${(hill.g * 100).toFixed(1)}% grade says steep (why "${h.why}", moved ${h.mv.toFixed(1)} m)`);
const h0 = await run("H0 hill W bare", hill, 0.0, W, 4);
ok(h0.mv > 15, `H0 the same hill with no powder still climbs (${h0.mv.toFixed(1)} m > 15)`);
ok(!errors.length, "no page errors");
await done(fails ? 1 : 0);
