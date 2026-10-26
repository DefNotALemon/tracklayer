// G1 sled locator: on foot far from the sled at night / in a storm / by day, can you SEE where it is?
// Gets off, stands the walker 20 m and 90 m from the sled facing it, and logs the locator column
// (V.sledPin: visible, opacity) plus the brightest luma in a strip above the sled's screen point. Then gets back
// on and checks the column is gone. Stills 01-06 for vision.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_sledpin.mjs
import { boot, ev, shot, park, tap, sleep, done } from "../lib.mjs";
await boot();
console.log("parked at", JSON.stringify(await park()));
await ev("WX.at = () => 0; GS.storm = 0; true");
await sleep(1500);
await tap("KeyQ"); await sleep(2500);
if (!JSON.parse(await ev("JSON.stringify(FOOT.on)"))) { console.log("FAIL: not on foot"); await done(1); }
// column brightness: max luma of a 24 px strip from the sled's screen point up 200 px, read off the canvas
const PROBE = `(() => { const v = new THREE.Vector3(P.x, groundAt(P.x, P.z) + 1, P.z).project(camera);
  const c = renderer.domElement, w = c.width, h = c.height, sx = Math.round((v.x + 1) / 2 * w), sy = Math.round((1 - v.y) / 2 * h);
  renderer.render(scene, camera); const gl = renderer.getContext(), px = new Uint8Array(4);
  let mx = 0, sum = 0, n = 0; for (let y = sy - 200; y < sy; y += 8) for (let x = sx - 12; x <= sx + 12; x += 6) { if (x < 0 || y < 0 || x >= w || y >= h) continue;
    gl.readPixels(x, h - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const l = 0.299 * px[0] + 0.587 * px[1] + 0.114 * px[2]; mx = Math.max(mx, l); sum += l; n++; }
  return { onScreen: v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1, sx, sy, colMax: Math.round(mx), colMean: n ? Math.round(sum / n) : -1 }; })()`;
const S = `JSON.stringify((() => { const d = Math.hypot(P.x - FOOT.x, P.z - FOOT.z), pin = V.sledPin;
  return { d: +d.toFixed(1), pin: !!(pin && pin.visible), op: pin ? +pin.material.opacity.toFixed(3) : 0, hint: WN.hint, probe: ${PROBE} }; })())`;
const rows = [];
let i = 1;
for (const [lbl, hour, storm] of [["night clear", 0, 0], ["night storm", 0, 0.85], ["day clear", 12, 0]]) {
  await ev(`(() => { GS.hour = Math.floor(GS.hour / 24) * 24 + ${hour}; WX.at = () => ${storm}; GS.storm = ${storm}; return true; })()`);
  for (const dist of [20, 90]) {
    await ev(`(() => { const a = P.yaw + 2.2; FOOT.x = P.x + Math.sin(a) * ${dist}; FOOT.z = P.z + Math.cos(a) * ${dist};
      FOOT.yaw = Math.atan2(P.x - FOOT.x, P.z - FOOT.z); camState.init = false; return true; })()`);
    await sleep(2500);
    const r = JSON.parse(await ev(S)); rows.push([lbl, dist, r]);
    console.log(`${lbl.padEnd(12)} ${String(dist).padStart(3)} m`, JSON.stringify(r));
    await shot(String(i++).padStart(2, "0") + "_" + lbl.replace(/ /g, "_") + "_" + dist + "m");
  }
}
// back on: the column must go
await ev(`(() => { GS.hour = Math.floor(GS.hour / 24) * 24; WX.at = () => 0; GS.storm = 0; FOOT.x = P.x + 1.5; FOOT.z = P.z; FOOT.yaw = Math.atan2(P.x - FOOT.x, P.z - FOOT.z); return true; })()`);
await sleep(800); await tap("KeyQ"); await sleep(3000);
const back = JSON.parse(await ev("JSON.stringify({ foot: FOOT.on, pin: !!(V.sledPin && V.sledPin.visible) })"));
console.log("back on:", JSON.stringify(back));
const far = rows.filter(([, d]) => d === 90), near = rows.filter(([, d]) => d === 20);
console.log(`SUMMARY pin shown at 90 m: ${far.filter(r => r[2].pin).length}/${far.length}; at 20 m: ${near.filter(r => r[2].pin).length}/${near.length}; ` +
  `column max luma 90 m ${far.map(r => r[0].split(" ").join("-") + "=" + r[2].probe.colMax).join(" ")}; hidden after remount: ${!back.pin && !back.foot}`);
await done();
