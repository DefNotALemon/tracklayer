// G3 follow-up to v132 (0060 F4): judge the new roof drip edge from RIDE distance (15 m and 25 m, roughly what
// a rider passing a house on the lane actually sees) rather than the up-close ~11 m test in g3_roofs.mjs, and
// specifically on a white house (grey trim per houses' mat.color sum > 2.1 rule) vs an ordinary painted one.
// Finds the nearest K.trimG (grey trim, i.e. a white house) mesh to the depot by scene-walking material color,
// and the nearest KIT.doors entry (ordinary trim) for comparison. Shoots nov noon (15 m, 25 m) and night (15 m).
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_drip_ride.mjs [outdir]
import { boot, ev, shot, sleep, done } from "../lib.mjs";

await boot();
await ev(`(() => { WX.at = () => 0; GS.storm = 0;
  const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); };
  tabCull = () => {}; V.rider.visible = false; FOOT.on = false; MNT.on = false; DMT.on = false; return true; })()`);

const near = JSON.parse(await ev(`(() => { const d0 = depot;
  const ds = KIT.doors.map(D => ({ ...D, r: Math.hypot(D.x - d0.x, D.z - d0.z) })).sort((a, b) => a.r - b.r);
  const D = ds[0];
  return JSON.stringify({ x: +D.x.toFixed(1), z: +D.z.toFixed(1), nx: +D.nx.toFixed(3), nz: +D.nz.toFixed(3) }); })()`));
const white = JSON.parse(await ev(`(() => { const d0 = depot; let best = null, bestD = 1e9;
  scene.traverse(o => { if (o.isMesh && o.material && o.material.color && o.material.color.getHex() === 0xa9b0b7) {
    const wp = new THREE.Vector3(); o.getWorldPosition(wp);
    const d = Math.hypot(wp.x - d0.x, wp.z - d0.z);
    if (d < bestD) { bestD = d; best = { x: +wp.x.toFixed(1), z: +wp.z.toFixed(1) }; } } });
  return JSON.stringify(best); })()`));
console.log("near", JSON.stringify(near), "white", JSON.stringify(white));

const setHour = async (h, day = 0) => { await ev(`GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + ${h} + ${day * 24}; true`); await sleep(1200); };
// shoot a house at ride distance: camera `dist` back along an approach line, eye 1.7 m (rider height on a sled),
// looking at the eave/roofline (~2.6 m up, a touch above wall height so the drip edge sits mid-frame).
const shootHouse = async (pt, nx, nz, dist, tag) => {
  await ev(`(() => { const nx = ${nx}, nz = ${nz}, px = ${pt.x} + nx * ${dist}, pz = ${pt.z} + nz * ${dist};
    P.x = px; P.z = pz; P.y = surf(px, pz) + 0.3; P.vx = P.vz = P.vy = 0; recenter(${pt.x}, ${pt.z}, true);
    FOOT.x = px + 500; FOOT.z = pz + 500;
    window.camOv = c => { V.rider.visible = false; c.position.set(px, groundAt(px, pz) + 1.7, pz); c.lookAt(${pt.x}, groundAt(${pt.x}, ${pt.z}) + 2.6, ${pt.z}); };
    return true; })()`);
  await ev("FOOT.x += 500; FOOT.z += 500; true");
  await sleep(900);
  await shot(tag);
};

await setHour(12, 0);
await shootHouse(near, near.nx, near.nz, 15, "nov_near_15");
await shootHouse(near, near.nx, near.nz, 20, "nov_near_20");
// white house: no stored door normal, so approach from -z (south) and let the still show whatever face that frames
await shootHouse(white, 0, -1, 15, "nov_white_15");
await shootHouse(white, 0, -1, 25, "nov_white_25");
console.log("info", await ev("JSON.stringify({ calls: renderer.info.render.calls })"));

await setHour(21, 0);
await shootHouse(near, near.nx, near.nz, 15, "night_near_15");
await shootHouse(white, 0, -1, 15, "night_white_15");

await done();
