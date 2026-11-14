// Kjøllefjord's 3D layout stills: overhead (camera straight down), street-level and the east-edge sled country.
// Run: OUT=<dir> tools/playtest/run.sh tools/playtest/scenarios/town3d_shots.mjs   (H=<m> sets the overhead height)
import { boot, ev, sleep, shot, done } from "../lib.mjs";
await boot();
await ev(`tutSkip(); FOOT.on = false; VEH.cur = null; true`); await sleep(400);
const D = JSON.parse(await ev(`JSON.stringify({x: depot.x, z: depot.z, sc: sledCountry.at || null, n: KIT.doors.length, houses: KIT.foot.length})`));
console.log("depot", D.x.toFixed(0), D.z.toFixed(0), "sledCountry", JSON.stringify(D.sc), "doors", D.n, "foot", D.houses);
const go = async (x, z) => { await ev(`(() => { P.x = ${x}; P.z = ${z}; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = P.vy = 0; recenter(P.x, P.z, true); return true; })()`); await sleep(1600); };
await go(D.x - 12, D.z + 6);
await ev(`(() => { const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); }; return true; })()`);
const over = async (name, cx, cz, H, fov = 55) => {
  await ev(`window.camOv = c => { c.up.set(0, 0, -1); c.position.set(${cx}, groundAt(${cx}, ${cz}) + ${H}, ${cz} + 0.01); c.lookAt(${cx}, groundAt(${cx}, ${cz}), ${cz}); c.fov = ${fov}; c.updateProjectionMatrix(); }; true`);
  await sleep(1300); await shot(name);
};
const eye = async (name, [x, z], [tx, tz], h = 1.8, th = 1.6, near) => {
  const px = D.x + x, pz = D.z + z, L = Math.hypot(tx - x, tz - z) || 1;
  await go(px - (tx - x) / L * 9, pz - (tz - z) / L * 9);          // the sled/rider stand 9 m behind the lens
  await ev(`window.camOv = c => { c.up.set(0, 1, 0); c.fov = 62; c.updateProjectionMatrix(); c.position.set(${px}, surf(${px}, ${pz}) + ${h}, ${pz}); c.lookAt(${D.x + tx}, surf(${D.x + tx}, ${D.z + tz}) + ${th}, ${D.z + tz}); }; true`);
  await sleep(1300); await shot(name);
};
if (process.env.NIGHT) await ev(`GS.hour = ${process.env.NIGHT}; true`);
await go(D.x + 10, D.z + 10);
await over("t3d_overhead", D.x + 10, D.z + 12, Number(process.env.H || 200));
await eye("t3d_street_kaigata", [-52, 14], [30, 12]);               // down Kaigata from the pier end
await eye("t3d_street_cross", [4, -30], [4, 40], 2.2, 1.4);          // down the depot street
await eye("t3d_street_msouth", [20, 17], [-30, 22], 1.7, 2.2);      // along the south side of Kaigata
await eye("t3d_alley", [-20, -12], [30, -12], 1.7, 1.8);            // down a back alley between two rows' rear yards
if (D.sc) {
  const sx = D.sc.x - D.x, sz = D.sc.z - D.z;
  await over("t3d_sled_over", D.sc.x + 8, D.sc.z, 80, 55);
  await eye("t3d_sled_approach", [sx - 40, sz + 2], [sx + 8, sz - 6], 2.4, 2.6);
  await eye("t3d_sled_park", [sx - 4, sz - 8], [sx - 12, sz + 2], 2.0, 0.9);
  await eye("t3d_groomer", [sx + 6, sz - 1], [sx + 20, sz - 9], 2.2, 1.6);
  await eye("t3d_arch", [sx + 16, sz + 0.5], [sx + 30, sz], 2.0, 3.8);
  await eye("t3d_hut", [sx + 8, sz - 2], [sx + 14, sz + 13], 2.0, 1.8);
}
await done(0);
