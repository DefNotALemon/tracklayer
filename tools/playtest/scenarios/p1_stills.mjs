// P1 stills: the same camera spots at noon / 19:30 / 22:30 at pixel ratio 1.5, weather pinned (OUT=dir run.sh p1_stills.mjs dir)
import { boot, ev, shot, sleep, done, park } from "../lib.mjs";
await boot();
await ev("tutSkip(); WX.at = () => 0; GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + 12 + 120*24; camState.init = false; true");
await ev("QG.on = false; QG.apply(0); renderer.setPixelRatio(1.5); if (window.TLXPOST && TLXPOST.resize) TLXPOST.resize(); true");
if (process.env.CHAIN === "0") await ev("TLXPOST.setLevel(0); true");
await ev("(() => { const t = document.getElementById('toasts'); if (t) t.style.display = 'none'; const w = document.querySelector('.wxcard,#wxCard'); if (w) w.style.display = 'none'; return true; })()");
await sleep(2500);
await ev(`(() => { if (!window.__camHk) { window.__camHk = 1; const rr = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv && s === scene) window.camOv(c); rr(s, c); }; } return true; })()`);
const eye = async (name, x, z, h, lx, lz, lh) => { await ev(`window.camOv = c => { c.position.set(${x}, surf(${x}, ${z}) + ${h}, ${z}); c.lookAt(${lx}, surf(${lx}, ${lz}) + ${lh}, ${lz}); }; true`); await sleep(700); await shot(name); };
const dd = JSON.parse(await ev(`JSON.stringify(KIT.doors.map(d => ({x: d.x, z: d.z, D: Math.hypot(d.x - depot.x, d.z - depot.z)})).sort((a, b) => a.D - b.D).slice(0, 3))`));
const dep = JSON.parse(await ev("JSON.stringify([depot.x, depot.z])"));
const house = async (tag, i, far) => { const d = dd[i], L = Math.hypot(dep[0] - d.x, dep[1] - d.z) || 1, ux = (dep[0] - d.x) / L, uz = (dep[1] - d.z) / L; await eye(tag + "_house", d.x + ux * far, d.z + uz * far, 1.7, d.x, d.z, 1.6); };
const hours = [["a_noon", 12], ["b_eve", 19.5], ["c_night", 22.5]];
for (const [tag, hr] of hours) {
  await ev(`window.camOv = null; FOOT.on = false; VEH.cur = null; camMode = 0; camState.init = false; GS.hour = Math.floor(GS.hour / 24) * 24 + ${hr}; true`); await sleep(2500);
  await eye(tag + "_street", -1300, -372, 1.7, -1360, -400, 1.5);
  await house(tag, 0, 11);
  if (tag === "a_noon") { await house(tag + "2", 1, 6); await eye(tag + "_vista", -1300, -330, 60, -600, 200, 0); await eye(tag + "_over", -1300, -330, 30, -1320, -400, 0); }
  await ev("window.camOv = null; true"); await sleep(1200); await shot(tag + "_chase");
  if (tag === "a_noon") { await ev("camMode = 1; camState.init = false; true"); await sleep(1500); await shot(tag + "_fp"); await ev("camMode = 0; camState.init = false; true"); }
}
// the fell: park the sled out of town, chase view
await ev("GS.hour = Math.floor(GS.hour / 24) * 24 + 12; true");
const pk = await park("depot.x + 1500", "depot.z - 900");
console.log("park", pk); await sleep(3000); await shot("d_fell_chase");
await ev("GS.hour = Math.floor(GS.hour / 24) * 24 + 19.5; true"); await sleep(2500); await shot("d_fell_eve");
// an interior
await ev(`(() => { const b = INT.beacons.find(b => b.cab && b.cab.flat) || INT.beacons[0]; P.x = b.x + 8; P.z = b.z + 8; recenter(P.x, P.z, true); FOOT.on = true; FOOT.x = b.x + Math.sin(b.ry); FOOT.z = b.z + Math.cos(b.ry); FOOT.y = surf(FOOT.x, FOOT.z); intEnter(b); return true; })()`);
await sleep(4000); await shot("e_interior");
console.log("int", await ev("INT.on"));
await done();
