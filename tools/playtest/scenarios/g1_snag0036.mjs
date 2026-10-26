// G1: reproduce report 0036 F1 (jogging yaw 0 into open backcountry froze at 63.3 m against a Strandbu wall with
// the legs still striding). Same spot search as 0036's first run (start point only clear of obstacles), jog with
// W + Shift for up to 60 game-s; logs where it stalls, the wall it's against (face normal vs heading) and whether
// the stride clock (FOOT.step) keeps running while the walker isn't moving. Then a sweep: walker 4 m off Strandbu's
// long faces heading in at 0/10/20/35° off square, 6 game-s of W each: metres slid along the face + stride rate.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_snag0036.mjs
import { boot, ev, shot, sideCam, camOff, sleep, down, up, tap, done } from "../lib.mjs";
await boot();
await ev("GS.hour = 12; WX.at = () => 0; GS.storm = 0; true");
const spot = JSON.parse(await ev(`JSON.stringify((() => {
  for (let rr = 300; rr < 1200; rr += 50) for (let a = 0; a < 6.28; a += 0.4) {
    const x = depot.x + Math.cos(a) * rr, z = depot.z + Math.sin(a) * rr;
    if (isSea(x, z) || obNear(x, z, 25)) continue;
    if (slopeAt(x, z, 10) > 0.08) continue;
    let hit = null;
    for (let d = 5; d <= 140; d += 2) { const g = Math.floor((x + HALF) / OBC), gz = Math.floor((z + d + HALF) / OBC);
      for (let j = gz - 1; j <= gz + 1 && !hit; j++) for (let i = g - 1; i <= g + 1 && !hit; i++) for (const o of obGrid.get(j * OBW + i) || []) if (!o.log && !o.down && o.ax !== undefined && Math.abs(o.x - x) < o.r + 0.4 && o.z > z) { hit = d; break; }
      if (hit) break; }
    if (hit) return { x: +x.toFixed(1), z: +z.toFixed(1), house: hit };
  }
  return null;
})())`));
console.log("spot with a building dead ahead", JSON.stringify(spot));
if (!spot) { console.log("FAIL no spot"); await done(1); }
await ev(`P.x = ${spot.x} + 5; P.z = ${spot.z}; P.y = surf(P.x, P.z) + 0.3; recenter(P.x, P.z, true); true`);
await sleep(1200); await tap("KeyQ"); await sleep(3000);
if (!(await ev("!!FOOT.on"))) { await tap("KeyQ"); await sleep(2500); }
await ev(`FOOT.x = ${spot.x}; FOOT.z = ${spot.z} + ${Math.max(0, spot.house - 25)}; FOOT.yaw = 0; FOOT.y = surf(FOOT.x, FOOT.z) + 0.1; camState.init = false; true`);
await sleep(300);
const S = () => ev(`JSON.stringify({x: FOOT.x, z: FOOT.z, t: gameClock, sp: +FOOT.sp.toFixed(2), step: FOOT.step, mw: FOOT.moveW === undefined ? null : +FOOT.moveW.toFixed(2)})`);
const s0 = JSON.parse(await S()); let last = s0, stallT = null, stall = null;
await down("KeyW"); await down("ShiftLeft");
try {
  for (;;) {
    await sleep(200);
    const s = JSON.parse(await S()); const dt = s.t - s0.t;
    if (Math.hypot(s.x - last.x, s.z - last.z) < 0.02 * (s.t - last.t + 1e-3) * 10 && dt > 2) { if (stallT === null) { stallT = dt; stall = s; } } else if (Math.hypot(s.x - last.x, s.z - last.z) > 0.05) { stallT = null; stall = null; }
    last = s;
    if (dt > 40) break;
  }
} finally { await up("KeyW"); await up("ShiftLeft"); }
const moved = Math.hypot(last.x - s0.x, last.z - s0.z);
console.log(`jog yaw 0: ${moved.toFixed(1)} m in ${(last.t - s0.t).toFixed(1)} s; stalled from t=${stallT === null ? "never" : stallT.toFixed(1)}`);
if (stall) {
  console.log("at stall: stride clock ran", ((last.step - stall.step) / (2 * Math.PI)).toFixed(1), "cycles over", (last.t - stall.t).toFixed(1), "s; FOOT.sp", last.sp, "go", await ev("FOOT.go === undefined ? 'n/a' : FOOT.go.toFixed(2)"), "wind", await ev("FOOT.wind.toFixed(2)"));
  console.log("wall:", await ev(`(() => { let b = null, bd = 9; for (const a of obGrid.values()) for (const o of a) { const d = Math.hypot(FOOT.x - o.x, FOOT.z - o.z) - o.r; if (d < bd) { bd = d; b = o; } }
    return JSON.stringify({ r: b.r, ax: b.ax, gap: +bd.toFixed(2), headingVsAx: b.ax === undefined ? null : +((((FOOT.yaw - b.ax) * 180 / Math.PI) % 90 + 90) % 90).toFixed(1) }); })()`));
}
await sideCam(); await shot("01_stall"); await camOff();
await done();
