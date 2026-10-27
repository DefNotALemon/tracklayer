// G3 follow-up to v116 (KIT.house cladding): judge the far-village houses (Mehamn, Gamvik) at a
// realistic ride-by distance for moire (texture aliasing shimmer on the board/cladding pattern),
// never actually checked per the open "Playtester: ... v116 houses in the villages (Mehamn/Gamvik)
// for moire" ask in LOOP.md's buildings slice 3 item.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_village_moire.mjs [outdir]  then sheet.py <outdir>
import { boot, ev, shot, sleep, done } from "../lib.mjs";

await boot();
await ev(`(() => { WX.at = () => 0; GS.storm = 0;
  const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); };
  tabCull = () => {}; return true; })()`);

// Mehamn (650,-3150) and Gamvik (2250,-3350) village seeds (SITES, tracklayer.js:4247-4248).
const VILLAGES = [["mehamn", 650, -3150], ["gamvik", 2250, -3350]];

const doors = JSON.parse(await ev(`(() => { const vs = ${JSON.stringify(VILLAGES)};
  const out = [];
  for (const [name, vx, vz] of vs) {
    const near = KIT.doors.filter(D => Math.hypot(D.x - vx, D.z - vz) < 150);
    const picked = [];
    for (const D of near) { if (picked.every(o => Math.hypot(o.x - D.x, o.z - D.z) > 10)) picked.push(D); if (picked.length >= 3) break; }
    for (const D of picked) out.push({ name, x: +D.x.toFixed(1), z: +D.z.toFixed(1), nx: +D.nx.toFixed(3), nz: +D.nz.toFixed(3) });
  }
  return JSON.stringify(out); })()`));
console.log("doors", JSON.stringify(doors));

const setHour = async (h) => { await ev(`GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + ${h}; true`); await sleep(1200); };

// Ride-by camera: front-on at ~20 m (riding distance) and a closer 8 m check for comparison.
const aim = async (D, out) => {
  await ev(`(() => { const D = ${JSON.stringify(D)};
    const cx = D.x + D.nx * ${out}, cz = D.z + D.nz * ${out};
    P.x = cx + D.nx * 30; P.z = cz + D.nz * 30; recenter(D.x, D.z, true);
    window.camOv = c => { c.position.set(cx, groundAt(cx, cz) + 1.9, cz); c.lookAt(D.x, groundAt(D.x, D.z) + 1.7, D.z); };
    return true; })()`);
  await sleep(900);
};

await setHour(12);
console.log("info_before", await ev("JSON.stringify({ calls: renderer.info.render.calls })"));

for (let i = 0; i < doors.length; i++) {
  const D = doors[i];
  await aim(D, 20);
  await shot(`${D.name}_${i}_ride20`);
  await aim(D, 8);
  await shot(`${D.name}_${i}_close8`);
}

await setHour(21);
for (let i = 0; i < Math.min(2, doors.length); i++) {
  await aim(doors[i], 20);
  await shot(`${doors[i].name}_${i}_night20`);
}

console.log("info_after", await ev("JSON.stringify({ calls: renderer.info.render.calls })"));
await done();
