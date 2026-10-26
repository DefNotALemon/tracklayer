// G3 follow-up to v110 camWallClip (report backlog item): camWallClip only treats K.house footprints as a real wall
// (box test); the garage and the quay freight shed are built with plain circle obstacles (addOb, no .box), so their
// footprints stop short of the real walls the same way houses used to before v110. This checks whether standing at
// the garage forecourt / quay-shed door facing out still lets the chase camera clip inside those two buildings.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_camwall_other.mjs
import { boot, ev, sleep, shot, done } from "../lib.mjs";
await boot();
await ev("GS.hour = 12; WX.at = () => 0; GS.storm = 0; window.__inOb = () => { const x = camera.position.x, z = camera.position.z; let best = 0; for (let j = Math.floor((z - 4 + HALF) / OBC); j <= Math.floor((z + 4 + HALF) / OBC); j++) for (let i = Math.floor((x - 4 + HALF) / OBC); i <= Math.floor((x + 4 + HALF) / OBC); i++) { const a = obGrid.get(j * OBW + i); if (!a) continue; for (const o of a) { if (o.box) { const B = o.box, px = x - B.x, pz = z - B.z, lu = px * B.c - pz * B.s, lv = px * B.s + pz * B.c, e = Math.min(B.hw - 0.45 - Math.abs(lu), B.hd - 0.4 - Math.abs(lv)); if (e > best) best = e; continue; } if (o.tree !== undefined || o.log || o.parked || o.r < 0.5 || camera.position.y > o.top) continue; const d = o.r - Math.hypot(o.x - x, o.z - z); if (d > best) best = d; } } return best; }; true");

// Point A: the garage forecourt door (buildTown: gx = garageSite.x - 12, door face at local x=5.5+0.4=~5.6->world +x)
const A = JSON.parse(await ev(`(() => {
  const gx = garageSite.x - 12, gz = garageSite.z, x = gx + 5.6 + 3.0, z = gz + 0.4, yaw = Math.PI / 2;
  return JSON.stringify({ x, z, yaw });
})()`));
// Point B: the quay freight shed's door-ish panel (buildTown: local (6.55, -20) on the Q group, rotation -qa)
const B = JSON.parse(await ev(`(() => {
  if (!QUAY) return JSON.stringify(null);
  const { qx, qz, qa } = QUAY, u = 6.55 + 3.0, v = -20;
  const x = qx + u * Math.cos(-qa) + v * Math.sin(-qa), z = qz - u * Math.sin(-qa) + v * Math.cos(-qa);
  const du = Math.cos(-qa), dz2 = -Math.sin(-qa), yaw = Math.atan2(du, dz2);
  return JSON.stringify({ x, z, yaw });
})()`));

const spots = [["garage", A], ["quayshed", B]].filter(([, p]) => p);
console.log("spots", spots.map(s => s[0]));
const res = { foot: [], sled: [] };
for (const [name, pt] of spots) {
  for (const mode of ["foot", "sled"]) {
    const out = mode === "foot" ? 1.0 : 2.2;
    const q = JSON.parse(await ev(`(() => {
      const yaw = ${pt.yaw}, x = ${pt.x} + Math.sin(yaw) * ${out - 3.0}, z = ${pt.z} + Math.cos(yaw) * ${out - 3.0};
      camMode = 0;
      if ("${mode}" === "foot") {
        FOOT.on = true; FOOT.ski = false; FOOT.dig = false; FOOT.x = x; FOOT.z = z; FOOT.yaw = yaw;
        P.x = x + 20; P.z = z + 20; P.y = surf(P.x, P.z) + 0.3; recenter(x, z, true);
        FOOT.y = surf(x, z) + 0.1; FOOT.sp = 0; FOOT.fwd = 0; FOOT.turn = 0; if (FOOT.g) FOOT.g.visible = true;
      } else {
        FOOT.on = false; if (FOOT.g) FOOT.g.visible = false; P.x = x; P.z = z; P.y = surf(x, z) + 0.3; P.vx = P.vz = P.vy = 0; P.yaw = yaw;
        recenter(x, z, true);
      }
      camState.init = false; camState.yaw = yaw;
      return JSON.stringify({ x: +x.toFixed(1), z: +z.toFixed(1) });
    })()`));
    await sleep(1500);
    const r = JSON.parse(await ev(`JSON.stringify({ inOb: +window.__inOb().toFixed(2), cy: +camera.position.y.toFixed(1) })`));
    res[mode].push(r.inOb);
    console.log(`${name} ${mode}: at ${JSON.stringify(q)}, camera inside a building by ${r.inOb} m`);
    await shot(`${name}_${mode}`);
  }
}
for (const m of ["foot", "sled"]) console.log(`RESULT ${m}: camera inside a building ${res[m].filter(v => v > 0).length}/${res[m].length}`);
await done();
