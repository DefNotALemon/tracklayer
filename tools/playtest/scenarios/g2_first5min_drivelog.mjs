// G2 investigation (report 0031): g2_first5min.mjs's auto-nav drive on the opening Pharmacy order
// (quay -> Neset, climb 122 m) covered only ~51 m of 895 m in 150 wall-s and ended on foot, freezing.
// This variant logs onFoot/crash state every ~5 game-s during the same drive to find where it goes wrong.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_first5min_drivelog.mjs
import { boot, ev, tap, shot, sleep, st, down, up, done } from "../lib.mjs";
const DRIVE_CAP_S = 90;
await boot();
await tap("Tab");
await sleep(500);
await ev(`TABLET.go("parcels"); true`);
await sleep(500);
await ev(`(() => { const a = TABLET.apps.find(x=>x.id==="parcels"); const r = a.posted.find(x=>x.act); if (r) r.act(); return !!r; })()`);
await sleep(400);
const hasLoad = await ev(`GS.load.length > 0`);
console.log("hasLoad", hasLoad);
const dest = await ev(`(() => { const d = GS.load[0].dest; return { x: +d.x.toFixed(1), z: +d.z.toFixed(1), name: d.name||d.id }; })()`);
console.log("dest", JSON.stringify(dest));
await down("KeyW");
const wallStart = Date.now();
let lastShot = 0;
try {
  while ((Date.now() - wallStart) / 1000 < DRIVE_CAP_S) {
    const r = await ev(`(() => {
      const d = GS.load[0] ? GS.load[0].dest : null;
      if (!d) return { done: true };
      const dx = d.x - P.x, dz = d.z - P.z, dist = Math.hypot(dx, dz);
      P.yaw = Math.atan2(dx, dz);
      if (dist < 30) { P.vx *= 0.85; P.vz *= 0.85; }
      return { done: false, dist: +dist.toFixed(1), spd: +Math.hypot(P.vx||0, P.vz||0).toFixed(2),
        t: +gameClock.toFixed(2), onFoot: typeof FOOT !== "undefined" ? !!FOOT.active : null,
        px: +P.x.toFixed(1), pz: +P.z.toFixed(1), py: +(P.y||0).toFixed(2),
        slope: typeof slopeAt === "function" ? +slopeAt(P.x, P.z, 4).toFixed(3) : null,
        warmth: GS.warmth !== undefined ? +GS.warmth.toFixed(1) : null,
        crashState: (typeof crashStep !== "undefined" && crashStep && crashStep.state) || null };
    })()`);
    if (r.done) break;
    console.log(JSON.stringify(r));
    if (r.t - lastShot > 15) { await shot(`t${Math.round(r.t)}`); lastShot = r.t; }
    await sleep(500);
  }
} finally { await up("KeyW"); }
await shot("zz_final");
console.log("final state", await st());
await done();
