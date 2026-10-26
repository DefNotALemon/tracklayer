// G3/G1: does the chase camera end up inside a building? Report 0046's delivery stills showed the screen filled with a
// house's painted timber wall (the camera behind the sled/rider sat inside the Strandbu house). For each lit town door
// (KIT.doors near the quay) it stands the rider on foot just out from the door facing AWAY from the house (the camera
// trails behind, into the walls), then parks the sled there facing away (normal chase view), lets the camera settle and
// counts how often the camera sits inside a building's obstacle footprint (non-tree obstacles, r >= 0.5).
// Env: CW_N (doors, default 8). Run: tools/playtest/run.sh tools/playtest/scenarios/g3_camwall.mjs
import { boot, ev, sleep, shot, done } from "../lib.mjs";
const N = +(process.env.CW_N || 8);
await boot();
await ev("GS.hour = 12; WX.at = () => 0; GS.storm = 0; window.__inOb = () => { const x = camera.position.x, z = camera.position.z; let best = 0; for (let j = Math.floor((z - 4 + HALF) / OBC); j <= Math.floor((z + 4 + HALF) / OBC); j++) for (let i = Math.floor((x - 4 + HALF) / OBC); i <= Math.floor((x + 4 + HALF) / OBC); i++) { const a = obGrid.get(j * OBW + i); if (!a) continue; for (const o of a) { if (o.box) { const B = o.box, px = x - B.x, pz = z - B.z, lu = px * B.c - pz * B.s, lv = px * B.s + pz * B.c, e = Math.min(B.hw - 0.45 - Math.abs(lu), B.hd - 0.4 - Math.abs(lv)); if (e > best) best = e; continue; } if (o.tree !== undefined || o.log || o.parked || o.r < 0.5 || camera.position.y > o.top) continue; const d = o.r - Math.hypot(o.x - x, o.z - z); if (d > best) best = d; } } return best; }; true");
const doors = JSON.parse(await ev(`JSON.stringify(KIT.doors.filter(D => Math.hypot(D.x - depot.x, D.z - depot.z) < 140).slice(0, ${N}))`));
console.log("doors", doors.length);
const res = { foot: [], sled: [] };
for (let k = 0; k < doors.length; k++) {
  const D = doors[k];
  for (const mode of ["foot", "sled"]) {
    const out = mode === "foot" ? D.d / 2 + 1.0 : D.d / 2 + 2.2;
    const r = JSON.parse(await ev(`(() => {
      const D = ${JSON.stringify(D)}, x = D.x + D.nx * ${out}, z = D.z + D.nz * ${out}, yaw = Math.atan2(D.nx, D.nz);
      camMode = 0;
      if ("${mode}" === "foot") {
        FOOT.on = true; FOOT.ski = false; FOOT.dig = false; FOOT.x = x; FOOT.z = z; FOOT.yaw = yaw;
        P.x = depot.x + 6; P.z = depot.z + 8; P.y = surf(P.x, P.z) + 0.3; recenter(x, z, true);
        FOOT.y = surf(x, z) + 0.1; FOOT.sp = 0; FOOT.fwd = 0; FOOT.turn = 0; if (FOOT.g) FOOT.g.visible = true;
      } else {
        FOOT.on = false; if (FOOT.g) FOOT.g.visible = false; P.x = x; P.z = z; P.y = surf(x, z) + 0.3; P.vx = P.vz = P.vy = 0; P.yaw = yaw;
        recenter(x, z, true);
      }
      camState.init = false; camState.yaw = yaw; return JSON.stringify({ x: +x.toFixed(1), z: +z.toFixed(1) });
    })()`));
    await sleep(1500);   // let the camera settle behind the rider/sled (it faces away from the house)
    const q = JSON.parse(await ev(`JSON.stringify({ inOb: +window.__inOb().toFixed(2), cy: +camera.position.y.toFixed(1), fx: FOOT.on ? FOOT.x : P.x, fz: FOOT.on ? FOOT.z : P.z, d: +Math.hypot(camera.position.x - (FOOT.on ? FOOT.x : P.x), camera.position.z - (FOOT.on ? FOOT.z : P.z)).toFixed(1) })`));
    res[mode].push(q.inOb);
    console.log(`door ${k} ${mode}: camera inside a building by ${q.inOb} m, cam ${q.d} m from focus`);
    if (k < 4) await shot(`${String(k).padStart(2, "0")}_${mode}`);
  }
}
for (const m of ["foot", "sled"]) console.log(`RESULT ${m}: camera inside a building ${res[m].filter(v => v > 0).length}/${res[m].length}, mean depth ${(res[m].reduce((a, b) => a + b, 0) / res[m].length).toFixed(2)} m`);
await done();
