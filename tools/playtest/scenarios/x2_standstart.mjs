// Beta fix 0117 #1/#2, 0119 #3, 0116 #2: the pickup pulling away from rest off the lane.
// Asserts: in shallow fresh snow (<= ~25 cm) it pulls away on W without bogging; in deep powder (>= 45 cm, over the
// clearance) it is honestly stuck but warns before the bog; a bogged truck put on plowed ground is freed; pad LT at 30%
// backs it up in shallow snow; on the lane it still pulls away as before. Prints the depth bands it found.
import { boot, ev, tap, sleep, done, down, up, padSet, errors } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 9000; WX.at = () => 0; GS.storm = 0; true`); await sleep(600);
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400); await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400); await ev(`closeGarage(); true`);
await ev(`(() => { const r = TLX.state("vehicles").owned[0]; const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); crashCancel(); FOOT.on = true; FOOT.x = r.x + fz * 3 - fx * 0.3; FOOT.z = r.z - fx * 3 - fz * 0.3; FOOT.yaw = r.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(800); await tap("KeyQ");
ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14), "seated in the pickup");
// flat open spots, binned by the mean fresh depth over the truck's footprint (9 samples over 6 x 4 m), all headings the same
const spots = await J(`(() => { const sh = [], dp = [], md = []; const fr = (x, z) => freshAt(Math.round((x + HALF) / CELL), Math.round((z + HALF) / CELL));
  for (let r = 120; r < 3600 && (sh.length < 2 || dp.length < 2 || md.length < 2); r += 37) for (let a = 0; a < 6.28 && (sh.length < 2 || dp.length < 2 || md.length < 2); a += 0.21) {
    const x = depot.x + Math.cos(a) * r, z = depot.z + Math.sin(a) * r;
    if (isSea(x, z) || isWater(x, z) || obNear(x, z, 25) || slopeAt(x, z, 10) > 0.035 || yardAt(x, z) > 0.05 || bioAt(x, z) === 1) continue;
    let s = 0, mx = 0; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const v = fr(x + i * 2, z + j * 3); s += v; mx = Math.max(mx, v); } const m = s / 9;
    const o = { x, z, m: +m.toFixed(2), mx: +mx.toFixed(2) };
    if (m >= 0.1 && mx <= 0.24 && sh.length < 2 && !sh.some(q => Math.hypot(q.x - x, q.z - z) < 60)) sh.push(o);
    else if (m >= 0.24 && mx <= 0.33 && md.length < 2 && !md.some(q => Math.hypot(q.x - x, q.z - z) < 60)) md.push(o);
    else if (m >= 0.45 && dp.length < 2 && !dp.some(q => Math.hypot(q.x - x, q.z - z) < 60)) dp.push(o);
  } return { sh, dp, md }; })()`);
console.log("shallow", JSON.stringify(spots.sh)); console.log("medium", JSON.stringify(spots.md)); console.log("deep", JSON.stringify(spots.dp));
const put = (s, yaw = 0) => ev(`(() => { BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; P.x = ${s.x}; P.z = ${s.z}; P.yaw = ${yaw}; P.vx = P.vy = P.vz = 0; P.y = surf(P.x, P.z); recenter(P.x, P.z, true); camState.init = false; window.__t0 = [P.x, P.z]; return 1; })()`);
const moved = () => J(`({ mv: +Math.hypot(P.x - __t0[0], P.z - __t0[1]).toFixed(1), v: +Math.hypot(P.vx, P.vz).toFixed(1), bog: BOG.on, warned: BOG.warned, drag: TLXV.rt().drag | 0, sink: TLXV.rt().sink.map(v => +v.toFixed(2)) })`);
const toasts = () => ev(`Array.from(document.querySelectorAll("#toasts > *")).map(e => e.textContent).join(" | ") + " | " + (typeof TOASTQ !== "undefined" ? TOASTQ.map(t => t.msg || t[0] || "").join(" | ") : "")`);
ok(spots.sh.length >= 1, `found ${spots.sh.length} shallow open spots`);
// 1b. a boot's depth (24-33 cm): it crawls away from rest, wheels working, but it goes
for (const s of spots.md) {
  await put(s); await waitGame(0.8); await ev(`window.__t0 = [P.x, P.z]; true`);
  await down("KeyW"); await waitGame(5); const r = await moved(); await up("KeyW");
  console.log(`  medium ${s.m} (max ${s.mx}) m: ${JSON.stringify(r)}`);
  ok(r.mv > 3 && !r.bog, `medium ${s.m} m fresh: W from rest crawls away (${r.mv} m, bog ${r.bog})`);
  await waitGame(1.5);
}
ok(spots.dp.length >= 1, `found ${spots.dp.length} deep open spots`);
// 1. shallow: W from rest pulls away
for (const s of spots.sh) {
  await put(s); await waitGame(0.8); await ev(`window.__t0 = [P.x, P.z]; true`);
  await down("KeyW"); await waitGame(5); const r = await moved(); await up("KeyW");
  console.log(`  shallow ${s.m} (max ${s.mx}) m: ${JSON.stringify(r)}`);
  ok(r.mv > 6 && !r.bog, `shallow ${s.m} m fresh: W from rest pulls away (${r.mv} m, bog ${r.bog})`);
  await waitGame(1.5);
}
// 2. pad LT 30% in shallow snow backs up (0116 #2)
{
  const s = spots.sh[0]; await put(s, 1.2); await waitGame(0.8); await ev(`window.__t0 = [P.x, P.z]; true`);
  await padSet({ 6: 0.3 }); await waitGame(4); const r = await moved(); await padSet();
  console.log(`  pad LT 30%: ${JSON.stringify(r)}`);
  ok(r.mv > 1.5 && !r.bog, `pad LT 30% backs up in shallow snow (${r.mv} m)`);
  await waitGame(1);
}
// 3. deep: honestly stuck, but it warns before the bog; then put on plowed ground it is freed and drives
const lane = await J(`(() => { let best = null; for (const Y of YARDS) { if (Y.x2 === undefined || Y.r > 4 || Math.hypot(Y.x - depot.x, Y.z - depot.z) > TOWN_R) continue; const L = Math.hypot(Y.x2 - Y.x, Y.z2 - Y.z); if (!best || L > best.L) best = { x: (Y.x + Y.x2) / 2, z: (Y.z + Y.z2) / 2, yaw: Math.atan2(Y.x2 - Y.x, Y.z2 - Y.z), L }; } return best; })()`);
if (spots.dp.length) {
  const s = spots.dp[0]; await put(s); await waitGame(0.8); await ev(`window.__t0 = [P.x, P.z]; window.__warnFirst = null; true`);
  await down("KeyW");
  let warnAt = null, bogAt = null; const t0 = await clock();
  while ((await clock()) - t0 < 7) { const q = await J(`({ w: BOG.warned, b: BOG.on })`); const t = (await clock()) - t0; if (q.w && warnAt === null) warnAt = t; if (q.b && bogAt === null) { bogAt = t; if (warnAt === null) warnAt = 99; break; } await sleep(100); }
  await up("KeyW"); const r = await moved();
  console.log(`  deep ${s.m} m: warn ${warnAt?.toFixed?.(1)} s, bog ${bogAt?.toFixed?.(1)} s, ${JSON.stringify(r)}`);
  ok(r.mv < 3, `deep ${s.m} m powder: the pickup can't pull away (${r.mv} m)`);
  ok(bogAt !== null && warnAt !== null && warnAt < bogAt - 0.3, `the dig warning comes before the bog (warn ${warnAt}, bog ${bogAt})`);
  // onto the plowed lane, still flagged bogged: the bog clears on hard ground and W drives
  await ev(`(() => { P.x = ${lane.x}; P.z = ${lane.z}; P.yaw = ${lane.yaw}; P.vx = P.vz = 0; P.y = surf(P.x, P.z); recenter(P.x, P.z, true); return 1; })()`);
  await waitGame(1.2);
  const b = await J(`BOG.on`);
  ok(!b, `bog clears once the truck sits on plowed ground (BOG.on ${b})`);
  await ev(`window.__t0 = [P.x, P.z]; true`); await down("KeyW"); await waitGame(3); await up("KeyW"); const r2 = await moved();
  ok(r2.mv > 8, `then W drives off along the lane (${r2.mv} m)`);
  await waitGame(1.5);
}
// 4. lane from rest (no regression)
{
  await ev(`(() => { BOG.on = false; P.x = ${lane.x}; P.z = ${lane.z}; P.yaw = ${lane.yaw}; P.vx = P.vz = 0; P.y = surf(P.x, P.z); recenter(P.x, P.z, true); return 1; })()`);
  await waitGame(1); await ev(`window.__t0 = [P.x, P.z]; true`);
  await down("KeyW"); await waitGame(3); const r = await moved(); await up("KeyW");
  console.log(`  lane: ${JSON.stringify(r)}`);
  ok(r.mv > 10, `lane: W from rest drives (${r.mv} m in 3 s)`);
}
ok(errors.length === 0, "no page errors");
await done(fails ? 1 : 0);
