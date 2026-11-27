// RD1: what the road model costs a frame. Town street view and open-road view at 1280x720 pr 1.5: GPU ms (timer query) and
// CPU render ms with the roads shown, hidden, and with the low-preset material (no cracks, no bump). Not an assert scenario.
//   tools/playtest/run.sh tools/playtest/scenarios/rd1_perf.mjs
import { boot, ev, sleep, done } from "../lib.mjs";
import { install, collect } from "../perfhook.mjs";
await boot();
await ev("tutSkip(); crashCancel(); FOOT.on = false; VEH.cur = null; WX.at = () => 0; GS.storm = 0; QG.on = false; QG.apply && QG.apply(0); renderer.setPixelRatio(1.5); true");
await ev(`(() => { const D = Math.round((Date.UTC(2027, 2, 1) - CAL_EPOCH) / 864e5); const k = Math.floor(GS.hour / 24); GS.hour = k * 24 + 12; CAL.off = (D - k) * 24; CAL.dc = null; CAL.lastDay = CAL.dayIndex(); meltBoot(); return true; })()`);
await sleep(2000);
await ev(`(() => { if (!window.__camHk) { window.__camHk = 1; const rr = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv && s === scene) window.camOv(c); rr(s, c); }; } return true; })()`);
await install(ev);
let P = { x: 0, z: 0 };
const view = async (name, x, z, dx, dz) => {
  P = { x, z };
  await ev(`(() => { crashCancel(); FOOT.on = false; VEH.cur = null; P.x = ${x}; P.z = ${z}; P.y = surf(${x}, ${z}) + 0.3; P.vx = P.vz = 0; recenter(P.x, P.z, true); camState.init = false; window.camOv = c => { const px = ${x - dx * 12}, pz = ${z - dz * 12}; c.position.set(px, surf(px, pz) + 2.6, pz); c.lookAt(${x + dx * 40}, surf(${x + dx * 40}, ${z + dz * 40}) + 0.5, ${z + dz * 40}); }; return true; })()`);
  await sleep(2500); await ev("TLXRK.fillAll(); true"); await sleep(800);
  const res = {};
  const full = "TLXRK.meshes.forEach(m => m.visible = true); TLXRK.mat.defines = {}; TLXRK.mat.transparent = false; TLXRK.mat.alphaToCoverage = true; TLXRK.mat.needsUpdate = true;";
  const variants = [["roads", full], ["hidden", "TLXRK.meshes.forEach(m => m.visible = false);"], ["near400", full + " TLXRK.meshes.forEach(m => { const c = m.userData.chunk; m.visible = Math.hypot(c.x - P.x, c.z - P.z) < 400; });"],
    ["low", "TLXRK.meshes.forEach(m => m.visible = true); TLXRK.mat.defines = { RK_LOW: 1 }; TLXRK.mat.needsUpdate = true;"], ["blend", full + " TLXRK.mat.transparent = true; TLXRK.mat.alphaToCoverage = false; TLXRK.mat.needsUpdate = true;"], ["flat", "TLXRK.meshes.forEach(m => m.visible = true); TLXRK.mat.defines = { RK_LOW: 1, RK_FLAT: 1 }; TLXRK.mat.transparent = false; TLXRK.mat.alphaTest = 0.5; TLXRK.mat.needsUpdate = true;"], ["roads2", full], ["hidden2", "TLXRK.meshes.forEach(m => m.visible = false);"], ["near400b", full + " TLXRK.meshes.forEach(m => { const c = m.userData.chunk; m.visible = Math.hypot(c.x - P.x, c.z - P.z) < 400; });"], ["hidden3", "TLXRK.meshes.forEach(m => m.visible = false);"], ["roads3", full]];
  for (const [tag, setup] of variants) {
    await ev(setup + " true"); await sleep(1200);
    res[tag] = await collect(ev, 5, sleep);
    console.log(name, tag, JSON.stringify(res[tag]));
  }
  const best = ks => Math.min(...ks.map(k => res[k].gpuP10)), med = ks => ks.map(k => res[k].gpuMed);
  console.log(name, "COST (p10, ms): roads", +(best(["roads", "roads2", "roads3"]) - best(["hidden", "hidden2", "hidden3"])).toFixed(2), "near400", +(best(["near400", "near400b"]) - best(["hidden", "hidden2", "hidden3"])).toFixed(2), "blend", +(best(["blend"]) - best(["hidden", "hidden2", "hidden3"])).toFixed(2), "flat", +(best(["flat"]) - best(["hidden", "hidden2", "hidden3"])).toFixed(2), "low", +(best(["low"]) - best(["hidden", "hidden2", "hidden3"])).toFixed(2), "| medians hidden", med(["hidden", "hidden2", "hidden3"]), "roads", med(["roads", "roads2", "roads3"]));
};
const t = JSON.parse(await ev(`JSON.stringify({ x: depot.x - 20, z: depot.z + 12 })`));
await view("town", t.x, t.z, 1, 0);
const r = JSON.parse(await ev(`JSON.stringify((() => { const rt = TLXR.routes.find(r => r.id === "skjanes"), sg = rt.segs.find(s => !s.street), m = Math.floor(sg.pts.length / 2), a = sg.pts[m], b = sg.pts[m + 4], L = Math.hypot(b[0] - a[0], b[1] - a[1]); return { x: a[0], z: a[1], dx: (b[0] - a[0]) / L, dz: (b[1] - a[1]) / L }; })())`));
await view("road", r.x, r.z, r.dx, r.dz);
await ev("window.camOv = null; true");
await done();
