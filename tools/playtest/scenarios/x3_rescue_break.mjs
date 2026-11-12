// Beta break pass on the v193 fjord rescue (0128 fix). Probes, prints numbers, exit 1 on a failed assert.
// A) dryLandNear over many sea points around the coast (pickup 14 m, sled 9 m): dry, gentle, clear ring, distance moved.
// B) a sled with the freight trailer fitted is rescued at night: where does the trailer end up?
// C) reload while waiting for the rescue (in the water) -> state after reload.
// D) rescue with less cash than the fee.
import { boot, ev, sleep, done, tap, shot, reload } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
let fails = 0;
const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const S = [1493, -2822];
const dunk = (x = S[0], z = S[1]) => ev(`(() => { BOG.on = false; crashCancel(); HELP.dryT = 0; P.x = ${x}; P.z = ${z}; P.yaw = 0; P.vx = P.vz = P.vy = 0; P.y = 0.5; recenter(P.x, P.z, true); return 1; })()`);

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; GS.cash = 9000; true`); await sleep(600);

// ---- A: sample the coast
const A = await J(`(() => {
  const out = []; let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let tries = 0;
  while (out.length < 120 && tries++ < 20000) {
    const x = (rnd() * 2 - 1) * (HALF - 400), z = (rnd() * 2 - 1) * (HALF - 400);
    if (!isWater(x, z)) continue;
    // want points within 60 m of land so it's a plausible dunking
    let near = false; for (let k = 0; k < 16 && !near; k++) { const b = k * Math.PI / 8; for (const r of [15, 30, 60]) if (!isWater(x + Math.cos(b) * r, z + Math.sin(b) * r)) { near = true; break; } }
    if (!near) continue;
    const row = { x: Math.round(x), z: Math.round(z) };
    for (const [tag, clear] of [["s", 9], ["v", 14]]) {
      const d = dryLandNear(x, z, clear);
      let ring = 99; for (let k = 0; k < 32; k++) { const b = k * Math.PI / 16; for (let r = 0; r <= 40; r++) if (isWater(d[0] + Math.cos(b) * r, d[1] + Math.sin(b) * r)) { ring = Math.min(ring, r); break; } }
      row[tag] = { wet: isWater(d[0], d[1]), slope: +slopeAt(d[0], d[1], 3).toFixed(3), ring, moved: Math.round(Math.hypot(d[0] - x, d[1] - z)), ob: !!obNear(d[0], d[1], 3), off: Math.abs(d[0]) > HALF - 80 || Math.abs(d[1]) > HALF - 80, yard: !!yardAt(d[0], d[1]) };
    }
    out.push(row);
  }
  return out; })()`);
console.log("A samples:", A.length);
for (const tag of ["s", "v"]) {
  const clear = tag === "s" ? 9 : 14;
  const bad = A.filter(r => r[tag].wet || r[tag].slope > 0.18 || r[tag].ring < clear - 0.5 || r[tag].ob || r[tag].off);
  const far = A.filter(r => r[tag].moved > 100);
  const yard = A.filter(r => r[tag].yard);
  ok(bad.length === 0, `A ${tag}: ${A.length - bad.length}/${A.length} land dry, gentle, with a ${clear} m clear ring`);
  console.log(`   ${tag} breakdown: steep>0.18 ${A.filter(r => r[tag].slope > 0.18).length} (>0.4: ${A.filter(r => r[tag].slope > 0.4).length}), ring short ${A.filter(r => r[tag].ring < clear - 0.5).length} (<5 m: ${A.filter(r => r[tag].ring < 5).length}), fallback-like`);
  bad.slice(0, 6).forEach(r => console.log("   bad", JSON.stringify(r)));
  if (process.env.AONLY && tag === "v") { console.log(fails ? "FAILED " + fails : "ALL OK"); await done(fails ? 1 : 0); }
  ok(far.length === 0, `A ${tag}: none carried more than 100 m (max ${Math.max(...A.map(r => r[tag].moved))} m, median ${A.map(r => r[tag].moved).sort((a, b) => a - b)[A.length >> 1]} m)`);
  console.log(`   ${tag}: set down on a plowed yard/road in ${yard.length} cases`);
}

// ---- B: trailer on the sled, night
await ev(`GS.hour = 34; (() => { const o = GS.own; o.partsOwned["recv:ball"] = true; o.partsOwned["hitch:trailer"] = true; o.parts.recv = "ball"; o.parts.hitch = "trailer"; restat(); return 1; })()`);
await waitGame(1);
const t0 = await J(`({ rig: TLXV.rigOn(), tx: TOW.x, tz: TOW.z })`);
console.log("trailer fitted:", JSON.stringify(t0));
await dunk(); await waitGame(2);
const hp = await J(`({ on: HELP.on, tx: TOW.x, tz: TOW.z, ty: TOW.y, px: P.x, pz: P.z })`);
console.log("in the water, trailer:", JSON.stringify(hp));
await tap("KeyP"); await sleep(300);
let t = 0; while ((await ev("HELP.on")) && t < 90) { await waitGame(2); t += 2; }
await waitGame(1);
const b = await J(`({ wet: P.wet, px: P.x, pz: P.z, tx: TOW.x, tz: TOW.z, ty: TOW.y, rig: TLXV.rigOn(), want: hitchBack(GS.own.parts.rack) + HITCH.trailer.len, gy: surf(TOW.x, TOW.z), water: isWater(TOW.x, TOW.z) })`);
const dist = Math.hypot(b.px - b.tx, b.pz - b.tz);
console.log("after rescue:", JSON.stringify(b), "trailer dist", dist.toFixed(2));
ok(!b.wet && b.rig === "sled", `B: sled out, trailer still hitched (rig ${b.rig})`);
ok(Math.abs(dist - b.want) < 1.0, `B: trailer rides behind the sled (${dist.toFixed(1)} m, expect ${b.want.toFixed(1)})`);
ok(!b.water, "B: trailer not in water");
await shot("B_night_trailer");
await waitGame(15);
const b2 = await J(`({ wet: P.wet, water: isWater(TOW.x, TOW.z), d: Math.hypot(P.x - TOW.x, P.z - TOW.z) })`);
ok(!b2.wet && !b2.water, `B: 15 s later still dry (trailer ${b2.d.toFixed(1)} m behind)`);

// ---- D: broke
await ev(`GS.cash = 30; true`);
await dunk(); await waitGame(2); await tap("KeyP"); await sleep(300);
t = 0; while ((await ev("HELP.on")) && t < 90) { await waitGame(2); t += 2; }
const dcash = await J(`({ cash: GS.cash, wet: P.wet, on: HELP.on })`);
ok(dcash.cash === 0 && !dcash.wet && !dcash.on, `D: with $30 the rescue still comes and cash floors at 0 (${JSON.stringify(dcash)})`);

// ---- C: reload while waiting in the water
await ev(`GS.cash = 5000; true`);
await dunk(); await waitGame(2);
await reload();
await ev(`tutSkip(); true`); await sleep(500);
const c = await J(`({ on: HELP.on, kind: HELP.kind, wet: P.wet, water: isWater(P.x, P.z), x: Math.round(P.x), z: Math.round(P.z), foot: FOOT.on })`);
console.log("after reload in the water:", JSON.stringify(c));
await waitGame(3);
const c2 = await J(`({ on: HELP.on, kind: HELP.kind, wet: P.wet, water: isWater(P.x, P.z), x: Math.round(P.x), z: Math.round(P.z), foot: FOOT.on, hint: !!(document.getElementById("tcF") && document.getElementById("tcF").offsetParent) })`);
console.log("3 s later:", JSON.stringify(c2));
ok(!c2.water || c2.on, "C: after a reload the rider is not left in water without a rescue available");
await tap("KeyP"); await sleep(300);
if (c2.water || c2.on) {
  t = 0; while ((await ev("HELP.on")) && t < 90) { await waitGame(2); t += 2; }
}
const c3 = await J(`({ on: HELP.on, wet: P.wet, water: isWater(P.x, P.z) })`);
ok(!c3.on && !c3.wet && !c3.water, `C: ends dry (${JSON.stringify(c3)})`);
console.log(fails ? `FAILED ${fails}` : "ALL OK");
await done(fails ? 1 : 0);
