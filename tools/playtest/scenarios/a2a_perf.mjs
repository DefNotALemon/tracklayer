// G9 A2a performance: the frame cost of a grow barn and its crew against the same view with the option off.
// Pixel ratio pinned (PR=1.5 by default) so the numbers are shader and draw cost; two rounds, alternating, to show the noise.
//   OUT=<dir> tools/playtest/run.sh tools/playtest/scenarios/a2a_perf.mjs
import { boot, ev, sleep, done } from "../lib.mjs";
import { install, collect } from "../perfhook.mjs";
const W = +process.env.W || 1280, H = +process.env.H || 720, DSF = +process.env.DSF || 1, SECS = +process.env.SECS || 6, PR = +process.env.PR || 1.5;
await boot({ width: W, height: H, dsf: DSF });
await install(ev);
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 37; TLX.setOn("police", false); TLX.setOn("traffic", false); QG.on = false; renderer.setPixelRatio(${PR}); true`);
await sleep(1500);
await ev(`(() => { clearInterval(window.__warm); window.__warm = setInterval(() => { GS.warmth = 100; GS.health = 100; }, 400);
  window.__S = i => TLXRD.S().sites[i]; window.__door = i => { const s = __S(i), B = s.B || TLXRD.build(s); return B.pt(B.pts.door[0], B.pts.door[1] - 0.45); };
  window.__atD = (i, d, a) => { const s = __S(i), dp = __door(i), an = s.ry + (a || 0), x = dp.x + Math.sin(an) * d, z = dp.z + Math.cos(an) * d; FOOT.on = true; FOOT.x = x; FOOT.z = z; FOOT.y = surf(x, z); FOOT.sp = FOOT.fwd = 0; FOOT.yaw = Math.atan2(dp.x - x, dp.z - z); camState.init = false; if (FOOT.g) FOOT.g.visible = true; return true; };
  const s = __S(0); s.n = 5; s.rider = true; return true; })()`);
const rows = [];
async function scene(name, setup) {
  await ev(setup); await sleep(4500);
  const r = await collect(ev, SECS, sleep); r.scene = name; rows.push(r); console.log("PERF " + JSON.stringify(r));
}
for (let round = 0; round < (+process.env.ROUNDS || 2); round++) {
  await ev(`TLX.setOn("raids", false); true`); await sleep(800);
  await scene("off_60m", `__atD(0, 60, 0); true`);
  await ev(`TLX.setOn("raids", true); true`); await sleep(500);
  await scene("on_60m", `__atD(0, 60, 0); true`);
  await scene("on_25m", `__atD(0, 25, 0); true`);
  await ev(`TLX.setOn("raids", false); true`); await sleep(800);
  await scene("off_25m", `__atD(0, 25, 0); true`);
  await ev(`TLX.setOn("raids", true); true`); await sleep(500);
  await scene("on_far_1200m_built_not_in_view", `(() => { const s = __S(0), dp = __door(0); for (let a = 0; a < 6.28; a += 0.2) { const x = dp.x + Math.cos(a) * 1200, z = dp.z + Math.sin(a) * 1200; if (!isSea(x, z) && !isWater(x, z)) { FOOT.on = true; FOOT.x = x; FOOT.z = z; FOOT.y = surf(x, z); FOOT.yaw = Math.atan2(x - dp.x, z - dp.z); camState.init = false; return true; } } return false; })()`);
  await ev(`TLX.setOn("raids", false); true`); await sleep(800);
  await scene("off_far_1200m_same_view", `true`);
}
console.log("SUMMARY\nscene                            gpuMed  updMs  rcpuMs  calls   tris  fps");
for (const r of rows) console.log(r.scene.padEnd(32), String(r.gpuMed).padStart(6), String(r.updMed).padStart(6), String(r.rcpuMed).padStart(7), String(r.calls).padStart(6), String(r.tris).padStart(7), String(r.fps).padStart(5));
await done();
