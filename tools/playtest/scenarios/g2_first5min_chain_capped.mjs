// G2: same chain as g2_first5min_chain.mjs but the auto-nav drive is speed-capped to ~40 mph (17.88 m/s)
// instead of letting the sled run flat-out (45-96 mph), to get a number closer to how a real player
// (who doesn't floor it in a straight line the whole way) would pace the first few deliveries.
// Backlog ask (loop/LOOP.md G2, 0046 follow-up): "Don't retune until a hand-paced (or speed-capped
// ~40 mph) run gives a real-player number." Auto-nav (direct yaw-to-target, braking near dest, now also
// speed-clamped) is a measurement harness, not player input; each leg capped at LEG_CAP_S wall-seconds.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_first5min_chain_capped.mjs
import { boot, ev, tap, shot, sleep, st, down, up, done } from "../lib.mjs";
const LEG_CAP_S = 100;      // wall-seconds cap per delivery leg
const TOTAL_CAP_S = 340;    // wall-seconds cap for the whole chain (fits one 8-min tool call with headroom)
const MAX_DELIVERIES = 6;
const WOODSMAN_PRICE = 600;
const SPEED_CAP_MS = 17.88; // ~40 mph

await boot();
const s0 = await st();
console.log("start", JSON.stringify(s0));

const chainStart = Date.now();
const legs = [];

async function acceptTop() {
  await tap("Tab"); await sleep(400);
  await ev(`TABLET.go("parcels"); true`); await sleep(500);
  const picked = await ev(`(() => {
    const a = TABLET.apps.find(x=>x.id==="parcels");
    const r = a.posted.find(x=>x.act);
    if (!r) return null;
    const title = r.title, pay = r.pay;
    r.act();
    return { title, pay };
  })()`);
  await sleep(400);
  await tap("KeyH");
  return picked;
}

for (let i = 0; i < MAX_DELIVERIES; i++) {
  if ((Date.now() - chainStart) / 1000 > TOTAL_CAP_S) { console.log("TOTAL_CAP_S hit, stopping chain at leg", i); break; }
  const cashBefore = (await st()).cash;
  if (cashBefore >= WOODSMAN_PRICE) { console.log("Woodsman price reached before leg", i, "cash", cashBefore); break; }
  const hasLoadAlready = await ev(`GS.load.length > 0`);
  let picked = null;
  if (!hasLoadAlready) picked = await acceptTop();
  const hasLoad = await ev(`GS.load.length > 0`);
  let pickupLeg = null;
  if (!hasLoad) {
    const claim = await ev(`(() => { const c = GS.claims[0]; if (!c) return null; const f = c.from || depot; return { x: +f.x.toFixed(1), z: +f.z.toFixed(1), name: f.name || "quay", dist0: +Math.hypot(P.x-f.x,P.z-f.z).toFixed(1) }; })()`);
    if (!claim) { console.log(`leg ${i}: no job accepted/claimed, board empty, stopping`, JSON.stringify(picked)); legs.push({ leg: i, delivered: false, reason: "no job on board" }); break; }
    const tClaim = (await st()).t;
    await down("KeyW");
    const pickWallStart = Date.now();
    let loaded = false, lastPickDist = claim.dist0, tick = 0, maxSp = 0;
    try {
      while ((Date.now() - pickWallStart) / 1000 < LEG_CAP_S) {
        const r = await ev(`(() => {
          if (GS.load.length > 0) return { done: true };
          const f = GS.claims[0] ? (GS.claims[0].from || depot) : null;
          if (!f) return { done: true };
          const dx = f.x - P.x, dz = f.z - P.z, dist = Math.hypot(dx, dz);
          P.yaw = Math.atan2(dx, dz);
          const sp = Math.hypot(P.vx||0, P.vz||0);
          if (sp > ${SPEED_CAP_MS}) { const k = ${SPEED_CAP_MS} / sp; P.vx *= k; P.vz *= k; }
          if (dist < 20) { P.vx *= 0.8; P.vz *= 0.8; }
          return { done: false, dist: +dist.toFixed(1), spd: +Math.hypot(P.vx||0,P.vz||0).toFixed(2) };
        })()`);
        if (r.done) { loaded = true; break; }
        lastPickDist = r.dist;
        if (r.spd) maxSp = Math.max(maxSp, r.spd);
        tick++;
        if (tick % 8 === 0) { console.log("pickTick", JSON.stringify(r)); await shot(`leg${i}_pick_t${tick}`); }
        await sleep(400);
      }
    } finally { await up("KeyW"); }
    const tLoaded = (await st()).t;
    pickupLeg = { from: claim.name, dist0: claim.dist0, loaded, gameSecs: +(tLoaded - tClaim).toFixed(1), lastPickDist, maxSp: +maxSp.toFixed(2) };
    console.log("pickup", JSON.stringify(pickupLeg));
    if (!loaded) { legs.push({ leg: i, delivered: false, reason: "pickup never reached (LEG_CAP_S)", pickupLeg }); break; }
  }
  const dest = await ev(`(() => { const d = GS.load[0].dest; return { x: +d.x.toFixed(1), z: +d.z.toFixed(1), name: d.name||d.id, dist0: +Math.hypot(P.x-d.x,P.z-d.z).toFixed(1) }; })()`);
  const tAccept = (await st()).t;
  await down("KeyW");
  const legWallStart = Date.now();
  let delivered = false, lastDist = dest.dist0, maxSpDeliver = 0;
  try {
    while ((Date.now() - legWallStart) / 1000 < LEG_CAP_S) {
      const r = await ev(`(() => {
        const d = GS.load[0] ? GS.load[0].dest : null;
        if (!d) return { done: true };
        const dx = d.x - P.x, dz = d.z - P.z, dist = Math.hypot(dx, dz);
        P.yaw = Math.atan2(dx, dz);
        const sp = Math.hypot(P.vx||0, P.vz||0);
        if (sp > ${SPEED_CAP_MS}) { const k = ${SPEED_CAP_MS} / sp; P.vx *= k; P.vz *= k; }
        if (dist < 30) { P.vx *= 0.85; P.vz *= 0.85; }
        return { done: false, dist: +dist.toFixed(1), spd: +Math.hypot(P.vx||0,P.vz||0).toFixed(2) };
      })()`);
      if (r.done) { delivered = true; break; }
      lastDist = r.dist;
      if (r.spd) maxSpDeliver = Math.max(maxSpDeliver, r.spd);
      await sleep(400);
    }
  } finally { await up("KeyW"); }
  const sAfter = await st();
  const leg = delivered
    ? { leg: i, delivered: true, title: picked && picked.title, pickupLeg, dest: dest.name, dist0: dest.dist0, tAccept, tDeliver: sAfter.t, gameSecs: +(sAfter.t - tAccept).toFixed(1), cashBefore, cashAfter: sAfter.cash, gained: sAfter.cash - cashBefore, maxSpDeliver: +maxSpDeliver.toFixed(2) }
    : { leg: i, delivered: false, title: picked && picked.title, pickupLeg, dest: dest.name, dist0: dest.dist0, reason: `LEG_CAP_S hit, dist remaining ${lastDist}`, tAccept, cashBefore };
  console.log("leg", JSON.stringify(leg));
  legs.push(leg);
  await shot(`leg${i}_${delivered ? "delivered" : "capped"}`);
  if (!delivered) { console.log("leg failed to complete, stopping chain"); break; }
}

const sFinal = await st();
console.log("final", JSON.stringify(sFinal));
console.log("legsSummary", JSON.stringify(legs));
console.log("totalWallS", +((Date.now() - chainStart) / 1000).toFixed(1));
await shot("zz_final");
await done();
