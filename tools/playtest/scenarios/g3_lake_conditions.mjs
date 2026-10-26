// G3 follow-up to v109 (lake ice skin, report 0046 open item): does lkBare's snow-streaked/bare-ice look hold up
// off clear noon? Checks: night (no aurora), a forced aurora night, a daytime storm, and the near/far shader
// hand-over at ~45 m from the rider (the one spot both paths disagree, per the comment at tracklayer.js:450).
// Lake 3 (900, 300, r 300), same spot as g3_lake.mjs. Lake-only numbers: tools/playtest/lakestats.py <outdir>.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_lake_conditions.mjs
import { boot, ev, shot, sideCam, sleep, done } from "../lib.mjs";

await boot(); await sideCam();
const L = JSON.parse(await ev(`JSON.stringify(LAKES[3])`)); console.log("lake", L);
const place = (x, z) => ev(`(() => { P.x = ${x}; P.z = ${z}; P.y = surf(${x}, ${z}) + 0.5; P.vx = P.vy = P.vz = 0; P.safe = { x: P.x, z: P.z, yaw: P.yaw }; recenter(P.x, P.z, true); camState.init = false; return true; })()`);
const cam = (x, z, up, tx, tz, tup) => ev(`(() => { window.camOv = c => { c.position.set(${x}, surf(${x}, ${z}) + ${up}, ${z}); c.lookAt(${tx}, surf(${tx}, ${tz}) + ${tup}, ${tz}); }; return true; })()`);
const sunA = Number(await ev("Math.atan2(sunDir.z, sunDir.x)"));
const a = sunA + Math.PI / 2;
const sx = L.x + Math.cos(a) * L.r * 1.05, sz = L.z + Math.sin(a) * L.r * 1.05;
const vx = L.x + Math.cos(a) * 650, vz = L.z + Math.sin(a) * 650;

async function shoreAndLow(tag) {
  await place(sx, sz); await sleep(2000);
  await cam(sx, sz, 25, L.x + Math.cos(a) * L.r * 0.55, L.z + Math.sin(a) * L.r * 0.55, 0); await sleep(1200); await shot(`${tag}_shore`);
  const lx = L.x + Math.cos(a) * (L.r - 40), lz = L.z + Math.sin(a) * (L.r - 40);
  await place(lx, lz); await sleep(2000);
  await cam(lx, lz, 2, L.x + Math.cos(a + 0.4) * 60, L.z + Math.sin(a + 0.4) * 60, 0.5); await sleep(1200); await shot(`${tag}_low`);
}

// 1. clear night, no aurora
await ev("WX.at = () => 0; GS.storm = 0; AUR.update = () => AUR.v = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + 0; camState.init = false; true");
await sleep(1500);
console.log("night", await ev("JSON.stringify({hour: GS.hour % 24, aur: AUR.v, polar: CAL.isPolarNight()})"));
await shoreAndLow("01_night");

// 2. forced strong aurora, same hour
await ev("AUR.update = () => AUR.v = 0.8; camState.init = false; true");
await sleep(1500);
console.log("aurora", await ev("JSON.stringify({hour: GS.hour % 24, aur: AUR.v})"));
await shoreAndLow("02_aurora");

// 3. daytime storm, aurora off again
await ev("AUR.update = () => AUR.v = 0; GS.storm = 1; GS.hour = Math.floor(GS.hour / 24) * 24 + 12; camState.init = false; true");
await sleep(1500);
console.log("storm", await ev("JSON.stringify({hour: GS.hour % 24, storm: GS.storm, wet: MELT.wet})"));
await shoreAndLow("03_storm");

// 4. the ~45 m near/far hand-over: same proven ice vantage point as the "low" shot above (L.r-40 from centre,
// looking at L.r*0.55-ish inward), just varying how far out we look along that same bearing.
await ev("GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + 12; camState.init = false; true");
await sleep(1500);
const lx = L.x + Math.cos(a) * (L.r - 40), lz = L.z + Math.sin(a) * (L.r - 40);
await place(lx, lz); await sleep(2000);
for (const d of [20, 45, 90]) {
  await cam(lx, lz, 1.6, lx + Math.cos(a + 0.4) * d, lz + Math.sin(a + 0.4) * d, 0.3); await sleep(1200); await shot(`04_handover_${d}m`);
}
console.log("handover", JSON.stringify({ lx, lz, r: L.r }));

await ev("window.camOv = null; true");
await done();
