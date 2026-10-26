// G3 follow-up to v131 (window glass reflection slides with view ray): walk past a ROW of house fronts and
// check (a) the sheen slides smoothly across panes as the lateral viewpoint moves on ONE building, and
// (b) several DIFFERENT buildings viewed from the same relative angle don't show the identical sheen
// position (which would read as a repeated texture stripe down the street).
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_glass_motion.mjs [outdir]
import { boot, ev, shot, sleep, done } from "../lib.mjs";

await boot();
await ev(`(() => { WX.at = () => 0; GS.storm = 0;
  const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); };
  tabCull = () => {}; return true; })()`);

// Collect house fronts, pick several, sorted by distance from depot (gives a "street" walk order).
const doors = JSON.parse(await ev(`(() => { const d0 = depot;
  const ds = KIT.doors.map(D => ({ ...D, r: Math.hypot(D.x - d0.x, D.z - d0.z) })).sort((a, b) => a.r - b.r);
  const out = []; for (const D of ds) { if (out.every(o => Math.hypot(o.x - D.x, o.z - D.z) > 15)) out.push(D); if (out.length >= 5) break; }
  return JSON.stringify(out.map(D => ({ x: +D.x.toFixed(1), z: +D.z.toFixed(1), nx: +D.nx.toFixed(3), nz: +D.nz.toFixed(3) }))); })()`));
console.log("doors", JSON.stringify(doors));

const setHour = async (h, day = 0) => { await ev(`GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + ${h} + ${day * 24}; true`); await sleep(1200); };
// Aim a front-on camera at distance `out`, offset laterally by `side` (along the wall), looking straight at the wall point.
const aim = async (D, out, side) => {
  await ev(`(() => { const D = ${JSON.stringify(D)}, sx = -D.nz, sz = D.nx;
    const cx = D.x + D.nx * ${out} + sx * ${side}, cz = D.z + D.nz * ${out} + sz * ${side};
    P.x = cx + D.nx * 30; P.z = cz + D.nz * 30; recenter(D.x, D.z, true);
    window.camOv = c => { c.position.set(cx, groundAt(cx, cz) + 1.9, cz); c.lookAt(D.x + sx*${side}*0.3, groundAt(D.x, D.z) + 1.7, D.z + sz*${side}*0.3); };
    return true; })()`);
  await sleep(900);
};

await setHour(12, 0);
console.log("info_before", await ev("JSON.stringify({ calls: renderer.info.render.calls })"));

// (a) sweep laterally across ONE building's front, 5 positions, to see the sheen slide.
const B = doors[0];
const sweeps = [-6, -3, 0, 3, 6];
for (const s of sweeps) {
  await aim(B, 7, s);
  await shot(`sweep_${s < 0 ? "L" + (-s) : "R" + s}`.replace("R0", "C"));
}

// (b) same relative angle (slightly off-square, out=7, side=3) on each of the 5 different buildings in a row.
for (let i = 0; i < doors.length; i++) {
  await aim(doors[i], 7, 3);
  await shot(`row_${i}`);
}

await done();
