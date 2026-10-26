// G2 verify v87 (clean-air runs): actually play one, not just read the numbers. Sets up an Aurora E
// with a freight trailer at 62 deliveries, opens the real Freight app, clicks the top CLEAN AIR card's
// STRAP IT DOWN button (pickup is the quay), drives the load to its far-peninsula dest with a yaw-to-target
// nav harness (measurement harness, not simulated player input, capped at DRIVE_CAP_S wall-seconds), and
// checks the crate/tanks "look" mesh renders on the trailer behind the sled (closes report 0026 finding 4's
// open question, for this cargo family) plus that cash actually lands on arrival.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_cleanair_deliver.mjs
import { boot, ev, shot, sleep, st, sideCam, camOff, done } from "../lib.mjs";
const DRIVE_CAP_S = 260;
await boot();

await ev(`(() => {
  GS.cash = 50000; GS.delivered = 62; GS.lic = GS.lic || {}; GS.lic.freight = true;
  GS.own.sleds = SLEDS.map(s => s.id); GS.own.sled = "aurora";
  GS.own.partsOwned["hitch:trailer"] = true; GS.own.parts.hitch = "trailer";
  restat(); applyLoadout(); GS.contracts = null; makeContracts(depot);
  GS.contracts.sort((a, b) => (b.clean ? 1 : 0) - (a.clean ? 1 : 0));
  return true;
})()`);
await sleep(300);
console.log("start", JSON.stringify(await st()));

await ev(`(() => { GS.apps = GS.apps || {}; GS.apps.freight = true; TABLET.toggle(true, "freight"); return true; })()`);
await sleep(1000);
await shot("00_freight_before_accept");

const pre = await ev(`JSON.stringify({ n: GS.contracts.length, cleanIdx: GS.contracts.findIndex(c => c.clean), cash: Math.round(GS.cash), load: GS.load.length })`);
console.log("pre", pre);

// Click the clean-air card's real act button in the DOM (same path a player's mouse would take).
const clicked = await ev(`(() => {
  const k = GS.contracts.findIndex(c => c.clean); if (k < 0) return "no clean contract found";
  const btn = document.querySelector('[data-act="con:' + k + '"]');
  if (!btn) return "no button for con:" + k;
  btn.click();
  return "clicked con:" + k;
})()`);
console.log("click", clicked);
await sleep(600);
await shot("01_after_strap");
console.log("toast: " + await ev(`(document.querySelector("#toast")||{}).innerText || [...document.querySelectorAll(".toast")].map(t=>t.innerText).join(" / ")`));

const post = await ev(`JSON.stringify({ load: GS.load.length, cash: Math.round(GS.cash), towKind: TOW.kind, towMass: +TOW.mass.toFixed(0), cargo: GS.load[0] ? GS.load[0].cargo : null, look: GS.load[0] ? GS.load[0].look : null })`);
console.log("post-strap", post);

await ev(`TABLET.toggle(false); true`);
await sleep(300);

// Camera behind and above the rig: wide enough to catch the trailer + its cargo slot, not just the sled.
await sideCam("[P.x - Math.sin(P.yaw) * 3.5, P.y + 1.1, P.z - Math.cos(P.yaw) * 3.5]", 3.0, 2.3, Math.PI);
await shot("02_rig_behind");
await camOff();

// Drive to the dest with a yaw-to-target nav harness, by gameClock.
const hasLoad = await ev(`GS.load.length > 0`);
let driveResult = { delivered: false, reason: "no load" };
if (hasLoad) {
  const dest = await ev(`(() => { const d = GS.load[0].dest; return { name: d.name || d.id, dist0: +Math.hypot(P.x - d.x, P.z - d.z).toFixed(1) }; })()`);
  console.log("dest", JSON.stringify(dest));
  const tAccept = (await st()).t, cashBefore = (await st()).cash;
  const { down, up } = await import("../lib.mjs");
  await down("KeyW");
  const wallStart = Date.now();
  let delivered = false, lastDist = dest.dist0;
  try {
    while ((Date.now() - wallStart) / 1000 < DRIVE_CAP_S) {
      const r = await ev(`(() => {
        const d = GS.load[0] ? GS.load[0].dest : null;
        if (!d) return { done: true };
        const dx = d.x - P.x, dz = d.z - P.z, dist = Math.hypot(dx, dz);
        P.yaw = Math.atan2(dx, dz);
        if (dist < 30) { P.vx *= 0.85; P.vz *= 0.85; }
        return { done: false, dist: +dist.toFixed(1), t: +gameClock.toFixed(2), cash: Math.round(GS.cash), loadLeft: GS.load.length };
      })()`);
      if (r.done || r.loadLeft === 0) { delivered = true; break; }
      lastDist = r.dist;
      await sleep(400);
    }
  } finally { await up("KeyW"); }
  const sAfter = await st();
  driveResult = delivered
    ? { delivered: true, gameSecs: +(sAfter.t - tAccept).toFixed(1), cashBefore, cashAfter: sAfter.cash, gained: sAfter.cash - cashBefore }
    : { delivered: false, reason: `DRIVE_CAP_S (${DRIVE_CAP_S}s wall) hit, dist remaining ${lastDist} m`, cashBefore };
  console.log("drive", JSON.stringify(driveResult));
  await shot(delivered ? "03_delivered" : "03_drive_capped");
  console.log("toast2: " + await ev(`(document.querySelector("#toast")||{}).innerText || [...document.querySelectorAll(".toast")].map(t=>t.innerText).join(" / ")`));
}
await done();
