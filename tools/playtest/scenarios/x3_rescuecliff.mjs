// Beta 0131 #1/#2: the fjord rescue on cliff coasts. Asserts, exit 1 on a fail.
// A) dryLandNear over 120 sea points near the coast (sled 9 m, pickup 14 m): never wet, never on ground below sea level,
//    never steep, the clear ring honoured (looser pass allows 0.75x), every landing timed.
// B) live rescue at 0131's two cliff points: one fee, dry 8 game s later, HELP off.
// C) sitting dead in the water with no rescue running turns into a dunking (startDrown) within a few seconds.
import { boot, ev, sleep, done, tap, shot } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
let fails = 0;
const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; GS.cash = 9000; true`); await sleep(600);

// ---- A
const A = await J(`(() => {
  const out = []; let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let tries = 0, tmax = 0;
  const pts = [[-2216, -745], [-1842, -469], [-2158, -670]];
  while (pts.length < 123 && tries++ < 20000) {
    const x = (rnd() * 2 - 1) * (HALF - 400), z = (rnd() * 2 - 1) * (HALF - 400);
    if (!isWater(x, z)) continue;
    let near = false; for (let k = 0; k < 16 && !near; k++) { const b = k * Math.PI / 8; for (const r of [15, 30, 60]) if (!isWater(x + Math.cos(b) * r, z + Math.sin(b) * r)) { near = true; break; } }
    if (near) pts.push([x, z]);
  }
  for (const [x, z] of pts) {
    const row = { x: Math.round(x), z: Math.round(z) };
    for (const [tag, clear] of [["s", 9], ["v", 14]]) {
      const t0 = performance.now(), d = dryLandNear(x, z, clear); tmax = Math.max(tmax, performance.now() - t0);
      let ring = 99; for (let k = 0; k < 32; k++) { const b = k * Math.PI / 16; for (let r = 0; r <= 40; r++) { const qx = d[0] + Math.cos(b) * r, qz = d[1] + Math.sin(b) * r; if (isWater(qx, qz) || groundAt(qx, qz) < SEA) { ring = Math.min(ring, r); break; } } }
      row[tag] = { wet: isWater(d[0], d[1]), g: +groundAt(d[0], d[1]).toFixed(2), slope: +slopeAt(d[0], d[1], 3).toFixed(3), ring, moved: Math.round(Math.hypot(d[0] - x, d[1] - z)) };
    }
    out.push(row);
  }
  return { out, tmax }; })()`);
console.log("A samples:", A.out.length, "slowest dryLandNear", A.tmax.toFixed(1), "ms");
for (const tag of ["s", "v"]) {
  const clear = tag === "s" ? 9 : 14, R = A.out.map(r => r[tag]);
  const wet = R.filter(r => r.wet || r.g < 0.5), steep = R.filter(r => r.slope > 0.24), shortR = R.filter(r => r.ring < clear * 0.75 - 1), full = R.filter(r => r.slope <= 0.18 && r.ring >= clear - 1);
  ok(wet.length === 0, `A ${tag}: ${R.length - wet.length}/${R.length} set down on dry ground above sea level`);
  ok(steep.length === 0, `A ${tag}: none steeper than 0.24 (max ${Math.max(...R.map(r => r.slope))})`);
  ok(shortR.length === 0, `A ${tag}: clear ring >= ${clear * 0.75 - 1} m everywhere (min ${Math.min(...R.map(r => r.ring))} m)`);
  ok(full.length >= R.length * 0.9, `A ${tag}: ${full.length}/${R.length} meet the full spec (slope <= 0.18, ${clear} m ring)`);
  const mv = R.map(r => r.moved).sort((a, b) => a - b);
  console.log(`   ${tag}: carried median ${mv[mv.length >> 1]} m, max ${mv[mv.length - 1]} m, >150 m: ${mv.filter(m => m > 150).length}`);
  A.out.filter(r => r[tag].wet || r[tag].g < 0.5 || r[tag].slope > 0.24 || r[tag].ring < clear * 0.75 - 1).slice(0, 5).forEach(r => console.log("   bad", JSON.stringify(r)));
}
ok(A.tmax < 400, `A: slowest search ${A.tmax.toFixed(0)} ms (< 400)`);

// ---- B
for (const [x, z] of [[-2216, -745], [-1842, -469]]) {
  await ev(`(() => { BOG.on = false; crashCancel(); FOOT.on = false; HELP.dryT = 0; GS.warmth = 90; P.x = ${x}; P.z = ${z}; P.yaw = 0; P.vx = P.vz = P.vy = 0; P.y = 0.5; recenter(P.x, P.z, true); return 1; })()`);
  await waitGame(2);
  const c0 = await ev("GS.cash"), fee = await ev(`helpCost("sea")`);
  ok(await ev("HELP.on"), `B ${x},${z}: dunked (HELP on)`);
  await tap("KeyP"); await sleep(300);
  let t = 0; while ((await ev("HELP.on")) && t < 90) { await waitGame(2); t += 2; }
  const a = await J(`({ x: P.x, z: P.z, g: groundAt(P.x, P.z), slope: slopeAt(P.x, P.z, 3), cash: GS.cash })`);
  await shot(`cliff_${x}`);
  await waitGame(8);
  const b = await J(`({ moved: Math.hypot(P.x - ${a.x}, P.z - ${a.z}), wet: P.wet, help: HELP.on, inWater: isWater(P.x, P.z), y: P.y, cash: GS.cash })`);
  console.log(`   landed ${JSON.stringify(a)} 8 s later ${JSON.stringify(b)}`);
  ok(!b.wet && !b.inWater && !b.help, `B ${x},${z}: dry 8 game s after the rescue (wet ${b.wet}, help ${b.help}, y ${b.y.toFixed(2)})`);
  ok(c0 - b.cash === fee, `B ${x},${z}: one fee charged (${c0} -> ${b.cash}, fee ${fee})`);
  ok(b.moved < 3, `B ${x},${z}: stayed put (${b.moved.toFixed(1)} m)`);
}

// ---- C: dead in the water, nobody coming
await waitGame(4);
await ev(`(() => { HELP.dryT = 0; helpEnd(true); HELP.phase = ""; crashCancel(); FOOT.on = false; P.x = -2216; P.z = -745; P.vx = P.vz = P.vy = 0; P.sink = 0; P.y = -0.1; recenter(P.x, P.z, true); return 1; })()`);
let tc = 0; while (!(await ev("HELP.on")) && tc < 10) { await waitGame(1); tc++; }
ok(await ev("HELP.on"), `C: floating dead in the water became a dunking within ${tc} game s`);

console.log(fails ? "FAILED " + fails : "ALL OK");
await done(fails ? 1 : 0);
