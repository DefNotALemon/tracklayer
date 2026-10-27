// G3 v148 follow-up (branch-tip pine hem, report/PROGRESS "Next: playtester judges the tips at ride
// distance and FPS on GFX low in a dense stand"). Rides the real chase camera (no override) past the
// densest flat pine stand found by g3_pines.mjs's search, taking stills at several points along the
// approach/through/past the stand, then measures FPS (RAF-counted over 2 wall-s) once at default GFX and
// once reloaded with ?gfx=low, sitting at the same spot in the same stand.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_pines_ride.mjs [outdir]; sheet.py the outdir.
import { boot, ev, raw, send, sleep, shot, tap, done, errors } from "../lib.mjs";
await boot();
await ev("WX.at = () => 0; GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + 12; true");

const s = JSON.parse(await ev(`(() => {
  const pines = []; for (const a of obGrid.values()) for (const o of a) if (o.pine && !o.down) pines.push(o);
  let best = null;
  for (let k = 0; k < pines.length; k += 7) { const o = pines[k]; if (o.s < 1.15) continue;
    if (slopeAt(o.x, o.z, 10) > 0.12 || isSea(o.x, o.z) || isWater(o.x, o.z)) continue;
    let n = 0; for (const p of pines) if (Math.abs(p.x - o.x) < 30 && Math.abs(p.z - o.z) < 30) n++;
    if (!best || n > best.n) best = { x: o.x, z: o.z, y: o.y, s: o.s, n };
    if (k > 4000) break; }
  return JSON.stringify(best); })()`));
console.log("stand", JSON.stringify(s));

// Approach from 45 m out on open ground, aimed at the stand centre, real chase cam, hold W through it.
await ev(`(() => {
  const a = 0.7, d = 45, x = ${s.x} + Math.sin(a) * d, z = ${s.z} + Math.cos(a) * d;
  P.x = x; P.z = z; P.y = surf(x, z) + 0.3; P.vx = P.vy = P.vz = 0;
  P.yaw = Math.atan2(${s.x} - x, ${s.z} - z); recenter(x, z, true); camMode = 0; return true; })()`);
await sleep(600);
await shot("ride_00_approach45");
import { down, up } from "../lib.mjs";
await down("KeyW");
const marks = [8000, 5500, 3500, 1800, 800]; // ms-from-now labels, sampled by wall time since headless dt is fixed
let shotAt = 0, names = ["ride_01_far", "ride_02_near", "ride_03_enter", "ride_04_inside", "ride_05_through"];
for (let i = 0; i < names.length; i++) { await sleep(1300); await shot(names[i]); }
await up("KeyW");
const st1 = JSON.parse(await ev(`JSON.stringify({ mph: +(Math.hypot(P.vx||0, P.vz||0)*2.237).toFixed(1), t: +gameClock.toFixed(1) })`));
console.log("ride_end", JSON.stringify(st1));

// FPS at default GFX, sitting in the stand.
await ev("P.vx = P.vz = P.vy = 0; true");
await sleep(300);
await ev("window.__fpsN = 0; (function tick(){ window.__fpsN++; requestAnimationFrame(tick); })(); true");
await sleep(2000);
const fpsHigh = await ev("window.__fpsN");
const gfxHigh = await ev("JSON.stringify({ low: GFX.low, pr: GFX.pr, treeR: GFX.treeR })");
console.log("fps_default", fpsHigh / 2, gfxHigh);
await shot("ride_06_fps_default");

// Reload the SAME tab with ?gfx=low, get back to the same stand, measure FPS again.
const urlLow = (process.env.TL_URL || "") + "?gfx=low";
await send("Page.navigate", { url: urlLow });
let ok = false;
for (let i = 0; i < 90; i++) { await sleep(500); try { if (await raw("typeof window.__tl === 'function' && window.__tl(\"typeof titleLaunch === 'function' && TT.mode === 'menu'\")")) { ok = true; break; } } catch (e) { } }
if (!ok) { console.log("RELOAD-LOW FAILED", errors.join("\n")); await done(3); }
await sleep(1000);
await ev("titleLaunch(); true"); await sleep(3000);
await tap("KeyH"); await sleep(400);
await ev(`(() => { const x = ${s.x} + Math.sin(0.7)*45, z = ${s.z} + Math.cos(0.7)*45;
  P.x = ${s.x}; P.z = ${s.z}; P.y = surf(${s.x}, ${s.z}) + 0.3; P.vx = P.vy = P.vz = 0; camMode = 0;
  WX.at = () => 0; GS.storm = 0; GS.hour = Math.floor(GS.hour/24)*24 + 12; recenter(${s.x}, ${s.z}, true); return true; })()`);
await sleep(600);
await shot("ride_07_low_in_stand");
await ev("window.__fpsN = 0; (function tick(){ window.__fpsN++; requestAnimationFrame(tick); })(); true");
await sleep(2000);
const fpsLow = await ev("window.__fpsN");
const gfxLow = await ev("JSON.stringify({ low: GFX.low, pr: GFX.pr, treeR: GFX.treeR })");
console.log("fps_low", fpsLow / 2, gfxLow);

await done();
