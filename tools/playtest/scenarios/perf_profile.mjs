// Performance profile per scene: GPU ms per frame (EXT_disjoint_timer_query: median / p10 / p90), CPU update ms (frame start -> render call),
// CPU render-call ms, draw calls, triangles, wall fps, pixel ratio the governor settled on.
//   PR=1.5   pin the pixel ratio and switch the governor off (apples-to-apples shader/draw cost; works on any version of the game)
//   AUTO=1   leave the governor on and give each scene WARM seconds to settle (what a player gets by default)
// SCENES=title,fell_riding,... limits which scenes are measured (title fell_riding town_idle town_riding night_town storm_riding).
// W/H/DSF set the viewport (default 1728x1117 @2, a 16" MacBook Pro in the default scaled mode). SECS = measuring window. SHOTS=<prefix> saves stills.
import { boot, ev, sleep, shot, tap, down, up, done } from "../lib.mjs";
import { install, collect } from "../perfhook.mjs";
const W = +process.env.W || 1728, H = +process.env.H || 1117, DSF = +process.env.DSF || 2, SECS = +process.env.SECS || 5, WARM = +process.env.WARM || 12;
const AUTO = !!process.env.AUTO, PR = process.env.PR ? +process.env.PR : 0;
await boot({ width: W, height: H, dsf: DSF, launch: false });
await install(ev);
async function pin() { if (!AUTO) await ev(`QG.on = false; QG.apply(QG.rungs[0].mk !== undefined ? 0 : 1); ${PR ? `renderer.setPixelRatio(${PR});` : ""} true`); }
const rows = [];
const ONLY = process.env.SCENES ? process.env.SCENES.split(",") : null;
async function measure(name) {
  if (ONLY && !ONLY.includes(name)) return;
  await pin(); await sleep(AUTO ? WARM * 1000 : 2500);
  const r = await collect(ev, SECS, sleep); r.scene = name; r.qg = await ev("QG.label()"); rows.push(r);
  console.log("PERF " + JSON.stringify(r)); if (process.env.SHOTS) await shot(process.env.SHOTS + "_" + name);
}
await measure("title");
await ev("titleLaunch(); true"); await sleep(3500); await tap("KeyH"); await sleep(400);
await ev("tutSkip(); FOOT.on = false; VEH.cur = null; GS.hour = 12; true"); await sleep(500);
const pk = await ev(`(() => { const cx = SPAWN.x + 1500, cz = SPAWN.z - 1500;
  for (let r = 0; r < 2500; r += 25) for (let a = 0; a < 6.28; a += 0.4) { const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    if (isSea(x, z) || (typeof isWater === 'function' && isWater(x, z)) || obNear(x, z, 30)) continue;
    P.x = x; P.z = z; P.y = surf(x, z) + 0.3; P.vx = P.vz = P.vy = 0; P.yaw = 0; recenter(x, z, true); return [Math.round(x), Math.round(z)]; } return null; })()`);
console.log("fell at", pk);
await down("KeyW"); await measure("fell_riding"); await up("KeyW");
await ev("godTeleport(depot); true"); await sleep(1000);
await measure("town_idle");
await down("KeyW"); await measure("town_riding"); await up("KeyW");
await ev("GS.hour = 34; true"); await sleep(1500); await measure("night_town");
await ev("GS.hour = 12 + 24; WX.force = { v: 1, until: GS.hour + 3 }; true"); await sleep(6000);
await down("KeyW"); await measure("storm_riding"); await up("KeyW");
console.log("SUMMARY\nscene          gpuMed gpuP10 updMs  rcpuMs  calls   tris  fps   pr");
for (const r of rows) console.log(r.scene.padEnd(14), String(r.gpuMed).padStart(6), String(r.gpuP10).padStart(6), String(r.updMed).padStart(6), String(r.rcpuMed).padStart(6), String(r.calls).padStart(6), String(r.tris).padStart(8), String(r.fps).padStart(5), String(r.pr).padStart(5), r.qg);
await done();
