// G2: the first 5 minutes of a brand-new save. What's on the Parcels board at t=0, is the first job
// obvious, how clear is the pitch (pay, route, note), and what happens when you take the top one.
// Since 0020's idea: also actually drive the accepted job to delivery and record gameClock to first
// cash (cargo is already strapped on at accept, so this is a straight-line drive-and-deliver, not a
// pickup+dropoff pair). Auto-nav (direct yaw-to-target) is a measurement harness, not meant to look like
// player input; it's capped at DRIVE_CAP_S wall-seconds so one pass never overruns.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_first5min.mjs
import { boot, ev, tap, shot, sleep, st, down, up, done } from "../lib.mjs";
const DRIVE_CAP_S = 150;
await boot();
const s0 = await st();
console.log("start", JSON.stringify(s0));
// Open the tablet (Tab opens to Home); go to Parcels, same as tapping its icon.
await tap("Tab");
await sleep(500);
await shot("00_tab_home");
await ev(`TABLET.go("parcels"); true`);
await sleep(700);
await shot("01_parcels_fresh");
console.log("board", await ev(`JSON.stringify({
  nPosted: TABLET.apps.find(a=>a.id==="parcels").posted.length,
  rows: TABLET.apps.find(a=>a.id==="parcels").posted.slice(0,4).map(r => ({
    title: r.title, pay: r.pay, sub: r.sub, note: (r.note||"").slice(0,140), warn: r.warn||"", kind: r.kind
  }))
})`));
// Row DOM text as the player actually sees it (icons/chips included)
console.log("rowsDOM:\n" + await ev(`[...document.querySelectorAll("#pbRows .pbr")].slice(0,4).map(r=>r.innerText.replace(/\\n+/g," | ")).join("\\n")`));
console.log("capDOM: " + await ev(`(document.querySelector("#pbCap")||{}).innerText||""`));
// Click the top posted row's act button (ACCEPT/CLAIM) to see what happens.
const before = await ev(`GS.jobs.length + "," + (GS.load||[]).length`);
await ev(`(() => { const a = TABLET.apps.find(x=>x.id==="parcels"); const r = a.posted.find(x=>x.act); if (r) r.act(); return !!r; })()`);
await sleep(500);
await shot("02_after_accept");
const after = await ev(`GS.jobs.length + "," + (GS.load||[]).length`);
console.log(`jobs,load before=${before} after=${after}`);
console.log("toast: " + await ev(`(document.querySelector("#toast")||{}).innerText || [...document.querySelectorAll(".toast")].map(t=>t.innerText).join(" / ")`));
await tap("KeyH");

// Drive the accepted load to its dest and let the proximity check auto-deliver (near && spd<4).
const hasLoad = await ev(`GS.load.length > 0`);
const tAccept = (await st()).t;
let driveResult = { delivered: false, reason: "no load to drive" };
if (hasLoad) {
  const dest = await ev(`(() => { const d = GS.load[0].dest; return { x: +d.x.toFixed(1), z: +d.z.toFixed(1), name: d.name || d.id, dist0: +Math.hypot(P.x - d.x, P.z - d.z).toFixed(1) }; })()`);
  console.log("dest", JSON.stringify(dest));
  await down("KeyW");
  const wallStart = Date.now();
  let delivered = false, lastDist = dest.dist0, cashBefore = (await st()).cash;
  try {
    while ((Date.now() - wallStart) / 1000 < DRIVE_CAP_S) {
      // Direct yaw-to-target each tick: a nav harness, not simulated player steering.
      const r = await ev(`(() => {
        const d = GS.load[0] ? GS.load[0].dest : null;
        if (!d) return { done: true };
        const dx = d.x - P.x, dz = d.z - P.z, dist = Math.hypot(dx, dz);
        P.yaw = Math.atan2(dx, dz);
        if (dist < 30) { P.vx *= 0.85; P.vz *= 0.85; } // brake on approach so spd<4 can trigger the delivery check
        return { done: false, dist: +dist.toFixed(1), spd: +Math.hypot(P.vx||0, P.vz||0).toFixed(2), t: +gameClock.toFixed(2), cash: Math.round(GS.cash), loadLeft: GS.load.length };
      })()`);
      if (r.done || r.loadLeft === 0) { delivered = true; break; }
      lastDist = r.dist;
      await sleep(400);
    }
  } finally { await up("KeyW"); }
  const sAfter = await st();
  driveResult = delivered
    ? { delivered: true, tAccept, tDeliver: sAfter.t, gameSecs: +(sAfter.t - tAccept).toFixed(1), cashBefore, cashAfter: sAfter.cash, gained: sAfter.cash - cashBefore }
    : { delivered: false, reason: `DRIVE_CAP_S (${DRIVE_CAP_S}s wall) hit, dist remaining ${lastDist} m`, tAccept, cashBefore, dest };
  console.log("drive", JSON.stringify(driveResult));
  await shot(delivered ? "03_delivered" : "03_drive_capped");
}
await done();
