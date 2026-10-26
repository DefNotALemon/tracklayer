// G1: walking in town. Measures snow depth/packing and a 12 m walk from a standstill toward the door at
// the places a player walks most: the quay depot yard, the garage forecourt, a Kjøllefjord shore-road house,
// a first-week home (Strandbu) and a Mehamn village house. Compares against open powder nearby. Stills of
// the depot yard by day and night. Run: tools/playtest/run.sh tools/playtest/scenarios/g1_yards.mjs
import { boot, ev, shot, sideCam, camOff, done, sleep, down, up } from "../lib.mjs";
await boot();
await ev("GS.hour = 12; true");

const cellJ = `(x, z) => { const ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL), d = depthAt(ix, iz), f = freshAt(ix, iz); return { d: +d.toFixed(2), pack: +(f > 0.02 ? Math.max(0, Math.min(1, 1 - d / f)) : 1).toFixed(2) }; }`;
function setFoot(x, z, yawExpr) {
  return ev(`(() => {
    FOOT.on = true; FOOT.ski = false; FOOT.dig = false; FOOT.x = ${x}; FOOT.z = ${z};
    FOOT.yaw = ${yawExpr}; P.x = FOOT.x - Math.sin(FOOT.yaw) * 5; P.z = FOOT.z - Math.cos(FOOT.yaw) * 5; P.y = surf(P.x, P.z) + 0.3; recenter(P.x, P.z, true);
    FOOT.y = surf(FOOT.x, FOOT.z) + 0.1; FOOT.sp = 0; FOOT.fwd = 0; FOOT.turn = 0;
    FOOT.tired = 0; FOOT.strain = 0.6; FOOT.step = 0; FOOT.half = 0; if (FOOT.g) FOOT.g.visible = true;
    camState.init = false; true;
  })()`);
}
async function walk(dist, cap) {
  const s0 = JSON.parse(await ev("JSON.stringify({x: FOOT.x, z: FOOT.z, t: gameClock})"));
  await down("KeyW"); let s;
  try { for (;;) { await sleep(120); s = JSON.parse(await ev("JSON.stringify({x: FOOT.x, z: FOOT.z, t: gameClock})")); if (Math.hypot(s.x - s0.x, s.z - s0.z) >= dist || s.t - s0.t > cap) break; } }
  finally { await up("KeyW"); }
  const m = Math.hypot(s.x - s0.x, s.z - s0.z), dt = s.t - s0.t;
  return { m: +m.toFixed(1), secs: +dt.toFixed(2), avg: +(m / dt).toFixed(2) };
}
// a spot 12 m out from a target, walking toward it
const spots = JSON.parse(await ev(`(() => {
  const out = [];
  const add = (name, tx, tz, a) => out.push({ name, x: tx + Math.cos(a) * 12, z: tz + Math.sin(a) * 12, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)), tx, tz });
  const dep = depot, sb = SITES.find(s => s.id === "strandbu"), me = SITES.find(s => s.id === "mehamn");
  add("depot yard", dep.x - 5, dep.z, 0.4);
  add("garage forecourt", garageSite.x - 5, garageSite.z, 0.3);
  // the red shore-road house (buildTown lot +46,+26, ry 0.2, 7 m deep): its door is on the local +z wall, so walk
  // up to it square on (the old target was the house's middle from the side, which walked into the wall)
  add("shore-road house", dep.x + 46 + 3.5 * Math.sin(0.2), dep.z + 26 + 3.5 * Math.cos(0.2), Math.PI / 2 - 0.2);
  add("shore-rd old aim", dep.x + 46, dep.z + 26, -1.2);
  add("Strandbu home", sb.x - 5, sb.z, 0.2);
  add("Mehamn village", me.x - 5, me.z, 0.5);
  add("open powder", dep.x + 300, dep.z + 300, 0.0);
  return JSON.stringify(out);
})()`));
const rows = [];
for (const p of spots) {
  await setFoot(p.x.toFixed(2), p.z.toFixed(2), p.yaw.toFixed(4));
  await sleep(500);
  const at = JSON.parse(await ev(`JSON.stringify((${cellJ})(${p.x}, ${p.z}))`));
  const tg = JSON.parse(await ev(`JSON.stringify((${cellJ})(${p.tx}, ${p.tz}))`));
  const w = await walk(10, 14);
  rows.push({ name: p.name, startDepth: at.d, startPack: at.pack, targetDepth: tg.d, targetPack: tg.pack, ...w });
  console.log(`${p.name.padEnd(18)} start d ${at.d} pack ${at.pack} · target d ${tg.d} pack ${tg.pack} · 10 m in ${w.secs}s = ${w.avg} m/s`);
}
// stills: depot yard (day, then night), Strandbu home, and the yard edge berm
await setFoot("depot.x - 2", "depot.z + 8", "Math.PI");
await sleep(600);
await sideCam("[depot.x - 6, surf(depot.x - 6, depot.z) + 1, depot.z]", 12, 3.5, 0.9); await sleep(400); await shot("00_depot_yard_day");
await sideCam("[depot.x - 6, surf(depot.x - 6, depot.z) + 1, depot.z]", 26, 12, 2.4); await sleep(400); await shot("01_depot_wide_day");
await camOff();
await sleep(300); await shot("02_depot_chase_day");
const sb = JSON.parse(await ev(`JSON.stringify(SITES.find(s => s.id === "strandbu"))`));
await setFoot(sb.x + 2, sb.z + 6, "Math.PI");
await sleep(600);
await sideCam(`[${sb.x - 6}, surf(${sb.x - 6}, ${sb.z}) + 1, ${sb.z}]`, 12, 3.5, 0.7); await sleep(400); await shot("03_home_yard_day");
await camOff();
await ev("GS.hour = 22; true");
await setFoot("depot.x - 2", "depot.z + 8", "Math.PI");
await sleep(800);
await sideCam("[depot.x - 6, surf(depot.x - 6, depot.z) + 1, depot.z]", 12, 3.5, 0.9); await sleep(400); await shot("04_depot_yard_night");
await camOff();
console.log("ROWS " + JSON.stringify(rows));
await done();
