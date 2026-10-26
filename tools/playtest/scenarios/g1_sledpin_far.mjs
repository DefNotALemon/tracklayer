// G1 sled locator follow-up (builder v104 next step): does the beacon column still read far out
// (150/300 m) and from BEHIND A RISE where the sled itself is hidden by terrain? Searches 16 compass
// directions from the parked sled for one where a ray-marched ground sample between walker and sled
// crests above the straight sight line (a real rise blocking the sled), then stands the walker there
// at night (max contrast for the column) and checks V.sledPin visibility + on-screen luma, plus whether
// the SLED's own screen point is actually occluded (confirms the rise truly blocks it).
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_sledpin_far.mjs
import { boot, ev, shot, park, tap, sleep, done } from "../lib.mjs";
await boot();
const p0 = await park();
console.log("parked at", JSON.stringify(p0));
await ev("WX.at = () => 0; GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24; true"); // night clear, max contrast
await sleep(1500);
await tap("KeyQ"); await sleep(2500);
if (!JSON.parse(await ev("JSON.stringify(FOOT.on)"))) { console.log("FAIL: not on foot"); await done(1); }

// Find a direction/distance where terrain between sled and walker crests above the sled-eye line (a rise).
const FIND = `(() => {
  const sx = P.x, sz = P.z, sy = groundAt(sx, sz);
  let best = null;
  for (let a = 0; a < 24; a++) { const ang = a / 24 * Math.PI * 2;
    for (const dist of [100, 150, 220, 300, 450, 600]) {
      const fx = sx + Math.sin(ang) * dist, fz = sz + Math.cos(ang) * dist, fy = groundAt(fx, fz) + 1.6;
      let blocked = false, maxOver = 0;
      for (let t = 0.15; t < 0.95; t += 0.05) {
        const mx = sx + (fx - sx) * t, mz = sz + (fz - sz) * t;
        const lineY = sy + 1 + (fy - (sy + 1)) * t, gy = groundAt(mx, mz);
        if (gy > lineY) { blocked = true; maxOver = Math.max(maxOver, gy - lineY); }
      }
      if (blocked && (!best || maxOver > best.maxOver)) best = { ang, dist, fx, fz, maxOver };
    }
  }
  return JSON.stringify(best);
})()`;
const spot = JSON.parse(await ev(FIND));
console.log("rise spot search:", JSON.stringify(spot));

const PROBE = `(() => { const v = new THREE.Vector3(P.x, groundAt(P.x, P.z) + 1, P.z).project(camera);
  const sledV = new THREE.Vector3(P.x, groundAt(P.x, P.z) + 1.2, P.z).project(camera);
  const c = renderer.domElement, w = c.width, h = c.height, sx = Math.round((v.x + 1) / 2 * w), sy = Math.round((1 - v.y) / 2 * h);
  renderer.render(scene, camera); const gl = renderer.getContext(), px = new Uint8Array(4);
  let mx = 0, sum = 0, n = 0; for (let y = sy - 220; y < sy; y += 8) for (let x = sx - 12; x <= sx + 12; x += 6) { if (x < 0 || y < 0 || x >= w || y >= h) continue;
    gl.readPixels(x, h - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const l = 0.299 * px[0] + 0.587 * px[1] + 0.114 * px[2]; mx = Math.max(mx, l); sum += l; n++; }
  gl.readPixels(sledV.x >= -1 && sledV.x <= 1 ? Math.round((sledV.x + 1) / 2 * w) : -1, h - Math.round((1 - sledV.y) / 2 * h), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  return { colMax: Math.round(mx), colMean: n ? Math.round(sum / n) : -1, sledPx: [px[0], px[1], px[2]] }; })()`;
const S = `JSON.stringify((() => { const d = Math.hypot(P.x - FOOT.x, P.z - FOOT.z), pin = V.sledPin;
  return { d: +d.toFixed(1), pin: !!(pin && pin.visible), op: pin ? +pin.material.opacity.toFixed(3) : 0, hint: WN.hint, probe: ${PROBE} }; })())`;

const rows = [];
if (spot) {
  await ev(`(() => { FOOT.x = ${spot.fx}; FOOT.z = ${spot.fz}; FOOT.yaw = Math.atan2(P.x - FOOT.x, P.z - FOOT.z); camState.init = false; return true; })()`);
  await sleep(2500);
  const r = JSON.parse(await ev(S)); rows.push(["behind_rise_" + spot.dist + "m", r]);
  console.log("behind rise", spot.dist + "m", JSON.stringify(r));
  await shot("01_behind_rise_" + spot.dist + "m");
} else {
  console.log("NOTE: no rise found in the 16-direction search near spawn; falling back to flat-ground far checks only.");
}
// Flat far checks regardless (150/300 m in the walker's facing-away direction) for a clean distance comparison.
for (const dist of [150, 300]) {
  await ev(`(() => { const a = P.yaw + 1.1; FOOT.x = P.x + Math.sin(a) * ${dist}; FOOT.z = P.z + Math.cos(a) * ${dist};
    FOOT.yaw = Math.atan2(P.x - FOOT.x, P.z - FOOT.z); camState.init = false; return true; })()`);
  await sleep(2500);
  const r = JSON.parse(await ev(S)); rows.push(["flat_" + dist + "m", r]);
  console.log("flat", dist + "m", JSON.stringify(r));
  await shot((rows.length === 1 ? "02_" : String(rows.length).padStart(2, "0") + "_") + "flat_" + dist + "m");
}
await ev(`(() => { FOOT.x = P.x + 1.5; FOOT.z = P.z; FOOT.yaw = Math.atan2(P.x - FOOT.x, P.z - FOOT.z); return true; })()`);
await sleep(800); await tap("KeyQ"); await sleep(3000);
const back = JSON.parse(await ev("JSON.stringify({ foot: FOOT.on, pin: !!(V.sledPin && V.sledPin.visible) })"));
console.log("back on:", JSON.stringify(back));
console.log(`SUMMARY rows=${rows.length} pinShown=${rows.filter(r => r[1].pin).length}/${rows.length} colMax=${rows.map(r => r[0] + "=" + r[1].probe.colMax).join(" ")} hiddenAfterRemount=${!back.pin && !back.foot}`);
await done();
