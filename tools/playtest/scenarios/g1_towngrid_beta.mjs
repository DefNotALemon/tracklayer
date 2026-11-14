// Beta: Kjøllefjord street grid (v226/227). Door aprons clear of colliders, sled drives every street, houses on sea/steep ground,
// night + storm plowing, reload keeps it. Run: tools/playtest/run.sh tools/playtest/scenarios/g1_towngrid_beta.mjs <out>
import { boot, ev, shot, done, sleep, reload } from "../lib.mjs";
await boot();
await ev("GS.hour = 12; WX.at = () => 0; GS.storm = 0; tutSkip(); true");
const r = JSON.parse(await ev(`(() => {
  const d = depot, doors = KIT.doors.filter(D => Math.hypot(D.x - d.x, D.z - d.z) <= TOWN_R);
  const out = { n: doors.length, blocked: [], sea: [], steep: [], dup: 0, noGrid: 0 };
  const seen = new Set();
  for (const D of doors) {
    const k = Math.round(D.x) + "," + Math.round(D.z); if (seen.has(k)) out.dup++; seen.add(k);
    if (!D.grid) out.noGrid++;
    for (const m of [2, 3.5, 5]) { const x = D.x + D.nx * (D.d / 2 + m), z = D.z + D.nz * (D.d / 2 + m); if (obNear(x, z, 0.6)) out.blocked.push([Math.round(D.x - d.x), Math.round(D.z - d.z), m]); }
    if (isSea(D.x, D.z) || isWater(D.x, D.z)) out.sea.push([Math.round(D.x - d.x), Math.round(D.z - d.z)]);
    if (slopeAt(D.x, D.z, 8) > 0.25) out.steep.push([Math.round(D.x - d.x), Math.round(D.z - d.z), +slopeAt(D.x, D.z, 8).toFixed(2)]);
  }
  return JSON.stringify(out);
})()`));
console.log("doors", JSON.stringify(r));
// storm: do streets stay plowed (yard value) after heavy snow? streets are YARDS so should.
const y0 = JSON.parse(await ev("JSON.stringify({a: yardAt(depot.x + 2, depot.z + 30), b: yardAt(depot.x + 2, depot.z - 20)})"));
console.log("street yard values", JSON.stringify(y0));
// overview stills
for (const [name, hr] of [["day", 12], ["night", 23]]) {
  await ev(`GS.hour = ${hr}; WX.at = () => 0; GS.storm = 0; FOOT.on = true; FOOT.x = depot.x; FOOT.z = depot.z - 60; recenter(FOOT.x, FOOT.z, true); FOOT.y = surf(FOOT.x, FOOT.z) + 0.1; camState.init = false; true`);
  await ev(`window.__cam = null; true`);
  await sleep(1500);
  await shot(name + "_street");
}
const errs = await ev("JSON.stringify(window.__errs || [])");
await reload();
await sleep(1500);
const n2 = await ev("KIT.doors.filter(D => Math.hypot(D.x - depot.x, D.z - depot.z) <= TOWN_R).length");
console.log("doors after reload", n2);
await done();
