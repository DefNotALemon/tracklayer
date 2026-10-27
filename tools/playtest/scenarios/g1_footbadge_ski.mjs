// G1 (follow-up to v149 footBadge, report 0085/report of this pass): does footBadge's ski/ice branch read right
// on cross-country skis? v149 (8bad103) made the on-foot pill/line read the walker's own cell; its ski text lines
// ("Gliding on ice" / "Skiing a track" / "Skis float you") were never exercised because no save starts with skis.
// Three spots, skis equipped (GS.own.xc = Turski all-rounder): (A) depot yard edge (packed) -> "Skiing a track";
// (B) open powder away from any trail -> "Skis float you" once d > 0.3; (C) a lake centre (frozen, fresh snow < 0.12)
// -> "Gliding on ice". Truth mirrors footBadge() itself. Also checks on-FOOT (no skis) at the same ice spot reads
// "Slippery footing" for contrast.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_footbadge_ski.mjs [outdir]
import { boot, ev, shot, sleep, tap, sideCam, camOff, done } from "../lib.mjs";
await boot();
await ev("WX.at = () => 0; GS.storm = 0; GS.hour = 12; true");
await sleep(1500);

const truthExpr = `(() => { const ix = Math.round((FOOT.x + HALF) / CELL), iz = Math.round((FOOT.z + HALF) / CELL);
  const d = depthAt(ix, iz), f = freshAt(ix, iz), pk = f > 0.02 ? Math.min(1, Math.max(0, 1 - d / f)) : 1;
  const ice = bioAt(FOOT.x, FOOT.z) === 1 && f < 0.12;
  return JSON.stringify({ t: gameClock, x: FOOT.x, z: FOOT.z, on: FOOT.on, ski: FOOT.ski, d: +d.toFixed(2), pk: +pk.toFixed(2),
    yard: +yardAt(FOOT.x, FOOT.z).toFixed(2), truth: ice ? "ICE" : pk > 0.62 ? "PACKED" : "POWDER",
    pill: document.getElementById("pill").textContent, bonus: document.getElementById("bonus").textContent }); })()`;

async function teleportAndDismount(x, z, withSkis) {
  await ev(`GS.own.xc = ${withSkis ? '{ id: "tur", cond: 1 }' : "null"}; true`);
  await ev(`P.x = ${x}; P.z = ${z}; P.y = surf(${x}, ${z}); P.vx = P.vz = 0; true`);
  await sleep(300);
  await tap("KeyQ"); await sleep(2500);
  return JSON.parse(await ev(truthExpr));
}

async function check(tag, x, z, withSkis) {
  const s = await teleportAndDismount(x, z, withSkis);
  const ok = s.on && s.pill === s.truth;
  console.log(tag, JSON.stringify(s), ok ? "OK" : "MISMATCH/FAIL");
  await sideCam(); await sleep(300); await shot(tag); await camOff();
  // remount for the next spot
  await ev("FOOT.x = P.x + 1.2; FOOT.z = P.z; FOOT.y = surf(FOOT.x, FOOT.z); true"); await sleep(300);
  await tap("KeyQ"); await sleep(2500);
  return { tag, ...s, ok };
}

const depot = JSON.parse(await ev("JSON.stringify({x: depot.x, z: depot.z})"));
const lake = JSON.parse(await ev("JSON.stringify(LAKES[3])"));
console.log("depot", JSON.stringify(depot), "lake", JSON.stringify(lake));

// A: yard edge near the depot, skis on -> expect PACKED "Skiing a track"
const a = await check("A_yard_ski", depot.x + 60, depot.z + 10, true);
// B: open backcountry powder away from any trail, skis on -> expect POWDER, "Skis float you" if deep enough.
// Search outward from the depot for a safe land spot (not sea, not yard, deep fresh snow) instead of guessing.
const bSpot = JSON.parse(await ev(`(() => {
  for (let r = 200; r <= 900; r += 50) for (let a = 0; a < 6.28; a += 0.5) {
    const x = ${depot.x} + Math.sin(a) * r, z = ${depot.z} + Math.cos(a) * r;
    if (bioAt(x, z) === 3) continue; // sea
    const ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL), d = depthAt(ix, iz), f = freshAt(ix, iz);
    const pk = f > 0.02 ? Math.min(1, Math.max(0, 1 - d / f)) : 1;
    if (pk < 0.5 && d > 0.3 && yardAt(x, z) < 0.3 && groundAt(x, z) > 0) return JSON.stringify({ x, z });
  }
  return JSON.stringify(null);
})()`));
console.log("bSpot", JSON.stringify(bSpot));
const b = bSpot ? await check("B_powder_ski", bSpot.x, bSpot.z, true) : { tag: "B_powder_ski", ok: false, skipped: true };
// C: lake centre, skis on -> expect ICE "Gliding on ice"
const c = await check("C_ice_ski", lake.x, lake.z, true);
// D: same lake centre, NO skis (bare boots) -> expect ICE "Slippery footing" (contrast)
const d = await check("D_ice_noski", lake.x, lake.z, false);

const rows = [a, b, c, d];
console.log("SUMMARY", JSON.stringify({ checked: rows.length, ok: rows.filter(r => r.ok).length, fail: rows.filter(r => !r.ok).map(r => r.tag) }));
await done();
