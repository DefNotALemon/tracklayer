// G1 follow-up to v106 (sledPinTick ridge lift, report 0042/e4b91c6): does the lifted beacon column
// slide DOWN smoothly as a walker crosses the ridge toward the sled (sight line opening), or does it
// pop/snap? Finds a rise the same way g1_sledpin_rise does (ray-march between sled and a candidate spot
// crests above the straight line), then walks the walker in N steps along that line from behind the rise
// to near the sled, sampling the column probe (colMax/liftRows/pinFoot height) at each step.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_sledpin_crestwalk.mjs
import { boot, ev, shot, park, tap, sleep, done } from "../lib.mjs";
await boot();
const p0 = await park();
console.log("parked at", JSON.stringify(p0));
await ev("WX.at = () => 0; GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24; true"); // night clear, max contrast
await sleep(1500);
await tap("KeyQ"); await sleep(2500);
if (!JSON.parse(await ev("JSON.stringify(FOOT.on)"))) { console.log("FAIL: not on foot"); await done(1); }

const FIND = `(() => {
  const sx = P.x, sz = P.z, sy = groundAt(sx, sz);
  let best = null;
  for (let a = 0; a < 24; a++) { const ang = a / 24 * Math.PI * 2;
    for (const dist of [220, 300, 450, 600]) {
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
if (!spot) { console.log("NOTE: no rise found near spawn; aborting (same risk as g1_sledpin_rise)."); await done(1); }

const PROBE = `(() => { const v = new THREE.Vector3(P.x, groundAt(P.x, P.z) + 1, P.z).project(camera);
  const c = renderer.domElement, w = c.width, h = c.height, sx = Math.round((v.x + 1) / 2 * w), sy = Math.round((1 - v.y) / 2 * h);
  renderer.render(scene, camera); const gl = renderer.getContext(), px = new Uint8Array(4);
  const L = (x, y) => { gl.readPixels(x, h - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return 0.299 * px[0] + 0.587 * px[1] + 0.114 * px[2]; };
  let mx = 0, lift = 0, liftMax = 0, rows = 0;
  for (let y = Math.min(h - 1, sy); y > 4; y -= 6) { if (sx < 75 || sx >= w - 75) break; rows++;
    let c = 0; for (let x = sx - 4; x <= sx + 4; x += 2) c = Math.max(c, L(x, y));
    let ctl = 0; for (const o of [-70, 70]) for (let x = sx + o - 4; x <= sx + o + 4; x += 2) ctl = Math.max(ctl, L(x, y));
    mx = Math.max(mx, c); const df = c - ctl; liftMax = Math.max(liftMax, df); if (df > 25) lift++; }
  return { colMax: Math.round(mx), liftRows: lift, rows, liftMax: Math.round(liftMax) }; })()`;
const S = `JSON.stringify((() => { const d = Math.hypot(P.x - FOOT.x, P.z - FOOT.z), pin = V.sledPin, over = groundAt((P.x+FOOT.x)/2, (P.z+FOOT.z)/2) - (groundAt(FOOT.x,FOOT.z) + 1.6 + (groundAt(P.x,P.z)+1 - (groundAt(FOOT.x,FOOT.z)+1.6)) * 0.5);
  return { d: +d.toFixed(1), pin: !!(pin && pin.visible), op: pin ? +pin.material.opacity.toFixed(3) : 0, pinFoot: pin ? Math.round(pin.position.y - 1000 * pin.scale.y / 2 - groundAt(P.x, P.z)) : 0, probe: ${PROBE} }; })())`;

const N = 6; // steps from behind-rise point to near the sled
const rows = [];
for (let i = 0; i <= N; i++) {
  const t = i / N; // 1 = far (behind rise), 0 = at sled
  const fx = p0.x + (spot.fx - p0.x) * (1 - t), fz = p0.z + (spot.fz - p0.z) * (1 - t);
  await ev(`(() => { FOOT.x = ${fx}; FOOT.z = ${fz}; FOOT.yaw = Math.atan2(P.x - FOOT.x, P.z - FOOT.z); camState.init = false; return true; })()`);
  await sleep(1800);
  const r = JSON.parse(await ev(S));
  rows.push([i, r]);
  console.log(`step ${i}/${N} (t=${t.toFixed(2)})`, JSON.stringify(r));
  await shot(String(i).padStart(2, "0") + "_step_t" + t.toFixed(2));
}
await ev(`(() => { FOOT.x = P.x + 1.5; FOOT.z = P.z; FOOT.yaw = Math.atan2(P.x - FOOT.x, P.z - FOOT.z); return true; })()`);
await sleep(800); await tap("KeyQ"); await sleep(3000);
const back = JSON.parse(await ev("JSON.stringify({ foot: FOOT.on, pin: !!(V.sledPin && V.sledPin.visible) })"));
console.log("back on:", JSON.stringify(back));
console.log(`SUMMARY dist=${spot.dist}m maxOver=${spot.maxOver.toFixed(1)} steps=${rows.map(([i,r]) => i+":d="+r.d+",pinFoot="+r.pinFoot+",liftRows="+r.probe.liftRows+"/"+r.probe.rows+",colMax="+r.probe.colMax).join(" ")} hiddenAfterRemount=${!back.pin && !back.foot}`);
await done();
