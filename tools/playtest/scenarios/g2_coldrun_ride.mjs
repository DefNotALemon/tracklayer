// G2 follow-up to v95 COLD RUN chip (PROGRESS backlog item): the chip's coldRun() estimates a leg's warmth
// cost assuming a conservative 12 + 6*power m/s. Does that estimate match what actually happens when you
// ride the flagged card? Sets up Woodsman lvl6 stock kit at noon (one of g2_coldcard.mjs's flagged combos),
// picks the shortest COLD RUN-flagged non-clean/tour/rescue freight card, and actually drives it with a
// yaw-to-target nav harness (same pattern as g2_cleanair_deliver.mjs), tracking GS.warmth start->finish.
// Also checks whether the chip's suggested stop sits near the direct route (not a detour).
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_coldrun_ride.mjs
import { boot, ev, shot, sleep, st, down, up, done } from "../lib.mjs";
const DRIVE_CAP_S = 220;
await boot();

await ev(`(() => {
  WX.at = () => 0; if (WX.atT) WX.atT = () => 0; GS.storm = 0;
  GS.cash = 50000; GS.lic = GS.lic || {}; GS.lic.freight = true;
  GS.own.sleds = SLEDS.map(s => s.id); GS.own.sled = "woodsman";
  GS.own.partsOwned["hitch:trailer"] = true; GS.own.parts.hitch = "trailer";
  GS.delivered = 6; GS.hour = 12;
  for (const slot of GEAR_ORDER) { const o = GEAR[slot].options || GEAR[slot]; GS.own.gear[slot] = o[0].id; }
  restat(); applyLoadout(); GS.contracts = null; makeContracts(depot);
  return true;
})()`);
await sleep(300);

// Pick the shortest COLD-RUN-flagged, non-clean/tour/rescue card: easiest to actually finish within budget.
const pick = JSON.parse(await ev(`(() => {
  const rows = [];
  GS.contracts.forEach((c, k) => {
    if (c.locked || !c.big || c.clean || c.tour || c.rescue) return;
    const f = conFrom(c), d = c.dest, km = +conKm(c).toFixed(2);
    const cr = coldRun(f, d, km);
    if (cr.loss < 70) return;
    rows.push({ k, dest: shortName(d), f: f.id || "depot", fx: f.x, fz: f.z, dx: d.x, dz: d.z, km, loss: +cr.loss.toFixed(1), stop: cr.stop ? { name: shortName(cr.stop), x: cr.stop.x, z: cr.stop.z } : null });
  });
  rows.sort((a, b) => a.km - b.km);
  return JSON.stringify({ flagged: rows.length, best: rows[0] || null, all: rows.slice(0, 6) });
})()`));
console.log("flagged cards:", pick.flagged, "picked:", JSON.stringify(pick.best));
console.log("sample:", JSON.stringify(pick.all));
if (!pick.best) { console.log("NO FLAGGED CARD FOUND — nothing to ride"); await done(); }
const job = pick.best;

// Lateral offset of the chip's named stop from the direct f->d line (sensibility check).
if (job.stop) {
  const off = await ev(`(() => {
    const fx=${job.fx}, fz=${job.fz}, dx=${job.dx}, dz=${job.dz}, sx=${job.stop.x}, sz=${job.stop.z};
    const vx = dx-fx, vz = dz-fz, len = Math.hypot(vx,vz), t = ((sx-fx)*vx + (sz-fz)*vz) / (len*len);
    const px = fx + vx*t, pz = fz + vz*t, perp = Math.hypot(sx-px, sz-pz);
    return JSON.stringify({ t: +t.toFixed(2), perpOffsetM: +perp.toFixed(1) });
  })()`);
  console.log("stop route check (t 0..1 = between pickup/dest, perpOffsetM = distance off the straight line):", off);
}

// Place the sled at the pickup, full warmth, and shoot the flagged card before riding.
await ev(`(() => { P.x = ${job.fx}; P.z = ${job.fz}; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = P.vy = 0;
  P.yaw = Math.atan2(${job.dx} - P.x, ${job.dz} - P.z); recenter(P.x, P.z, true); GS.warmth = 100; GS.near = null;
  GS.apps = GS.apps || {}; GS.apps.freight = true; TABLET.toggle(true, "freight"); return true; })()`);
await sleep(900);
await shot("00_flagged_card");
await ev(`TABLET.toggle(false); true`);
await sleep(300);

console.log("predicted loss %:", job.loss, "km:", job.km, "warmth before drive:", JSON.stringify(await st()));

const t0 = (await st()).t, warmth0 = await ev("GS.warmth");
await down("KeyW");
const wallStart = Date.now();
let arrived = false, lastDist = job.km * 1000;
try {
  while ((Date.now() - wallStart) / 1000 < DRIVE_CAP_S) {
    const r = await ev(`(() => {
      const dx = ${job.dx} - P.x, dz = ${job.dz} - P.z, dist = Math.hypot(dx, dz);
      P.yaw = Math.atan2(dx, dz);
      if (dist < 25) { P.vx *= 0.8; P.vz *= 0.8; }
      return { dist: +dist.toFixed(1), t: +gameClock.toFixed(2), warmth: +GS.warmth.toFixed(1), blackout: GS.warmth <= 0 || GS.dead };
    })()`);
    lastDist = r.dist;
    if (r.dist < 20 || r.blackout) { arrived = !r.blackout; if (r.blackout) console.log("BLACKOUT en route, t=" + r.t); break; }
    await sleep(400);
  }
} finally { await up("KeyW"); }
const sAfter = await st();
const warmth1 = await ev("GS.warmth");
const gameSecs = +(sAfter.t - t0).toFixed(1);
const actualLoss = +(warmth0 - warmth1).toFixed(1);
console.log("RIDE RESULT:", JSON.stringify({ arrived, lastDist, gameSecs, warmth0, warmth1, actualLossPct: actualLoss, predictedLossPct: job.loss }));
await shot(arrived ? "01_arrived" : "01_capped_or_blackout");
await done();
