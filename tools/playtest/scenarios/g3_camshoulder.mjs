// G3/G1: on foot with a house right behind you, camWallClip (v110) pulls the chase camera in to ~0.6 m, and the helmet
// then fills the middle of the screen. This stands the rider on foot just out from each lit town door facing AWAY from
// the house (camera trails into the walls), lets the camera settle, and reports where the head lands on screen (NDC x/y,
// 0 = centre), how far the camera is from the head, and whether the camera ended up inside a building (must stay 0).
// Env: CS_N (doors, default 8). Run: tools/playtest/run.sh tools/playtest/scenarios/g3_camshoulder.mjs
import { boot, ev, sleep, shot, done } from "../lib.mjs";
const N = +(process.env.CS_N || 8);
await boot();
await ev("GS.hour = 12; WX.at = () => 0; GS.storm = 0; window.__inOb = () => { const x = camera.position.x, z = camera.position.z; let best = 0; for (let j = Math.floor((z - 4 + HALF) / OBC); j <= Math.floor((z + 4 + HALF) / OBC); j++) for (let i = Math.floor((x - 4 + HALF) / OBC); i <= Math.floor((x + 4 + HALF) / OBC); i++) { const a = obGrid.get(j * OBW + i); if (!a) continue; for (const o of a) { if (o.box) { const B = o.box, px = x - B.x, pz = z - B.z, lu = px * B.c - pz * B.s, lv = px * B.s + pz * B.c, e = Math.min(B.hw - 0.45 - Math.abs(lu), B.hd - 0.4 - Math.abs(lv)); if (e > best) best = e; continue; } if (o.tree !== undefined || o.log || o.parked || o.r < 0.5 || camera.position.y > o.top) continue; const d = o.r - Math.hypot(o.x - x, o.z - z); if (d > best) best = d; } } return best; }; true");
const doors = JSON.parse(await ev(`JSON.stringify(KIT.doors.filter(D => Math.hypot(D.x - depot.x, D.z - depot.z) < 140).slice(0, ${N}))`));
console.log("doors", doors.length);
const R = [];
for (let k = 0; k < doors.length; k++) {
  const D = doors[k];
  await ev(`(() => {
    const D = ${JSON.stringify(D)}, x = D.x + D.nx * (D.d / 2 + 1.0), z = D.z + D.nz * (D.d / 2 + 1.0), yaw = Math.atan2(D.nx, D.nz);
    camMode = 0;
    FOOT.on = true; FOOT.ski = false; FOOT.dig = false; FOOT.x = x; FOOT.z = z; FOOT.yaw = yaw;
    P.x = depot.x + 6; P.z = depot.z + 8; P.y = surf(P.x, P.z) + 0.3; recenter(x, z, true);
    FOOT.y = surf(x, z) + 0.1; FOOT.sp = 0; FOOT.fwd = 0; FOOT.turn = 0; if (FOOT.g) FOOT.g.visible = true;
    camState.init = false; camState.yaw = yaw; return 1;
  })()`);
  await sleep(1800);
  const q = JSON.parse(await ev(`(() => { const h = new THREE.Vector3(FOOT.x, FOOT.y + 1.65, FOOT.z), d = camera.position.distanceTo(h); h.project(camera);
    return JSON.stringify({ inOb: +window.__inOb().toFixed(2), hx: +h.x.toFixed(2), hy: +h.y.toFixed(2), d: +d.toFixed(2), wk: +(camState.wallK ?? 1).toFixed(2) }); })()`));
  R.push(q);
  console.log(`door ${k}: head ndc x ${q.hx} y ${q.hy}, cam→head ${q.d} m, wallK ${q.wk}, inside building ${q.inOb} m`);
  if (k < 6) await shot(`${String(k).padStart(2, "0")}_foot`);
}
const clipped = R.filter(q => q.wk < 0.6), m = (a) => (a.reduce((s, v) => s + v, 0) / Math.max(a.length, 1)).toFixed(2);
console.log(`RESULT clipped ${clipped.length}/${R.length}: mean |head x| ${m(clipped.map(q => Math.abs(q.hx)))}, mean head y ${m(clipped.map(q => q.hy))}, mean cam→head ${m(clipped.map(q => q.d))} m; inside a building ${R.filter(q => q.inOb > 0).length}/${R.length}`);
await done();
