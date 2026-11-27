// RD1b: a 3-frame moving strip on the road edge (no moire, no dither while moving): the sled drives a town street and an open road,
// three stills 0.35 s apart, ground-level camera looking at the shoulder, written as strip_<place>_<n>.jpg.  OUT = output dir.
import { boot, ev, shot, sleep, done, down, up } from "/Users/lemon/Documents/GitHub/tracklayer-streets/tools/playtest/lib.mjs";
await boot();
await ev("tutSkip(); crashCancel(); FOOT.on = false; VEH.cur = null; WX.at = () => 0; GS.storm = 0; QG.on = false; QG.apply && QG.apply(0); renderer.setPixelRatio(1.5); GS.fuel = Math.max(GS.fuel, 20); true");
await ev(`(() => { const D = Math.round((Date.UTC(2027, 2, 1) - CAL_EPOCH) / 864e5); const k = Math.floor(GS.hour / 24); GS.hour = k * 24 + 12; CAL.off = (D - k) * 24; CAL.dc = null; CAL.lastDay = CAL.dayIndex(); meltBoot(); return true; })()`);
await sleep(2500);
const spots = JSON.parse(await ev(`JSON.stringify((() => { const d = depot, G = TOWNG; let best = null;
  for (const rt of TLXR.routes) for (const sg of rt.segs) { if (rt.closed || sg.street || sg.pts.length < 40) continue; const p = sg.pts, m = Math.floor(p.length / 2), a = p[m - 8], b = p[m + 8], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (!best || sg.pts.length > best.n) best = { n: sg.pts.length, x: a[0], z: a[1], dx: (b[0] - a[0]) / L, dz: (b[1] - a[1]) / L }; }
  return { town: { x: d.x + G.X[0] + 8, z: d.z + G.Z[1], dx: 1, dz: 0 }, road: best }; })())`));
for (const [name, s] of Object.entries(spots)) {
  await ev(`(() => { crashCancel(); FOOT.on = false; VEH.cur = null; const x = ${s.x}, z = ${s.z}; P.x = x; P.z = z; P.y = surf(x, z) + 0.2; P.vx = P.vz = 0; P.yaw = Math.atan2(${s.dx}, ${s.dz}); camMode = 0; camState.init = false; recenter(P.x, P.z, true); window.camOv = null; return true; })()`);
  await sleep(1800); await ev("TLXRK.fillAll(); true");
  await ev(`window.camOv = c => { c.position.set(P.x + ${-s.dz} * 1.6 - ${s.dx} * 3, surf(P.x, P.z) + 1.3, P.z + ${s.dx} * 1.6 - ${s.dz} * 3); c.lookAt(P.x + ${s.dx} * 22 + ${-s.dz} * 5, surf(P.x, P.z) + 0.3, P.z + ${s.dz} * 22 + ${s.dx} * 5); }; true`);
  await down("KeyW");
  for (let i = 0; i < 3; i++) { await sleep(i ? 350 : 1400); await shot(`strip_${name}_${i}`); }
  await up("KeyW"); await ev("P.vx = P.vz = 0; true");
}
await ev("window.camOv = null; true");
await done();
