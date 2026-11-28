// G3 fell colour over distance (Owner note 26 Oct 23:55: "mountains grey far away, white up close").
// Finds a deep-snow fell top near SPAWN with a clear line of sight along one bearing, then shoots the same patch of
// fell from 2000/1000/500/200/100/50/30 m (camera 3 m over the snow, or higher if the line is blocked, the 45 m snow
// patch recentred on the camera each time), weather pinned clear, at Nov 1 noon and 1 March noon. Each shot logs
// the screen positions of 49 points on a 24 m square on the fell so tools/playtest/fellcolour.py can average the
// same ground in every still. FC_VARIANTS=1 adds a fog-off pass (is the grey the haze or the material?).
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_fellcolour.mjs [outdir]; python3 tools/playtest/fellcolour.py <outdir>
import fs from "node:fs";
import { boot, ev, shot, sideCam, sleep, done, OUT } from "../lib.mjs";

await boot(); await sideCam();
await ev("WX.at = () => 0; GS.storm = 0; true");
const spot = JSON.parse(await ev(`(() => {
  const DS = [2000, 1000, 500, 200, 100, 50, 30];
  const dep = (x, z) => surf(x, z) - groundAt(x, z);
  let best = null;
  for (let r = 400; r < 3200; r += 50) for (let a = 0; a < 6.28; a += 0.1) {
    const x = SPAWN.x + Math.cos(a) * r, z = SPAWN.z + Math.sin(a) * r;
    if (isSea(x, z) || isWater(x, z) || obNear(x, z, 30) || bioAt(x, z) !== 0) continue;
    if ([[12, 0], [-12, 0], [0, 12], [0, -12]].some(([u, v]) => dep(x + u, z + v) < 0.6 || bioAt(x + u, z + v) !== 0)) continue;
    const h = surf(x, z); if (!best || h > best.h) best = { x, z, h };
  }
  if (!best) return JSON.stringify(null);
  // a bearing whose camera spots are all on land with a clear sight line to the target
  let pick = null;
  for (let b = 0; b < 6.28; b += 0.13) {
    const dx = Math.cos(b), dz = Math.sin(b); let ok = 0, lift = 0;
    for (const D of DS) {
      const cx = best.x + dx * D, cz = best.z + dz * D;
      if (((isSea(cx, cz) || isWater(cx, cz)) && D < 500) || Math.abs(cx) > HALF - 50 || Math.abs(cz) > HALF - 50) break;
      let up = 3;
      for (; up <= 150; up += 6) {
        const y0 = surf(cx, cz) + up; let clear = true;
        for (let t = 0.03; t < 0.97; t += 0.01) { const px = cx + (best.x - cx) * t, pz = cz + (best.z - cz) * t; if (surf(px, pz) > y0 + (best.h + 1 - y0) * t) { clear = false; break; } }
        if (clear) break;
      }
      if (up > 150) break;
      ok++; lift += up;
    }
    if (ok === DS.length && (!pick || lift < pick.lift)) pick = { b, lift };
  }
  return JSON.stringify({ ...best, b: pick ? pick.b : null, lift: pick ? pick.lift : null });
})()`));
console.log("target", JSON.stringify(spot));
if (!spot || spot.b === null) { console.log("NO CLEAR LINE FOUND"); await done(2); }
await ev(`window.__fc = ${JSON.stringify(spot)}; true`);

const log = [];
const take = async (tag, D, fogOff) => {
  const info = JSON.parse(await ev(`(() => {
    const T = window.__fc, dx = Math.cos(T.b), dz = Math.sin(T.b), cx = T.x + dx * ${D}, cz = T.z + dz * ${D};
    let up = 3;
    for (; up <= 150; up += 6) { const y0 = surf(cx, cz) + up; let clear = true;
      for (let t = 0.03; t < 0.97; t += 0.01) { const px = cx + (T.x - cx) * t, pz = cz + (T.z - cz) * t; if (surf(px, pz) > y0 + (T.h + 1 - y0) * t) { clear = false; break; } }
      if (clear) break; }
    const cy = surf(cx, cz) + up;
    P.x = cx; P.z = cz; P.y = surf(cx, cz) + 0.5; P.vx = P.vy = P.vz = 0; P.safe = { x: cx, z: cz, yaw: P.yaw };
    recenter(cx, cz, true); camState.init = false; sledRoot.visible = false;
    window.camOv = c => { c.position.set(cx, cy, cz); c.lookAt(T.x, T.h + 1, T.z); sledRoot.visible = false; if (${fogOff}) scene.fog.density = 0; if (window.__fcH !== undefined) GS.hour = window.__fcH; };
    return JSON.stringify({ cy: +cy.toFixed(1), up });
  })()`));
  await sleep(2200);
  const pts = JSON.parse(await ev(`(() => {
    const T = window.__fc, out = [], v = new THREE.Vector3(), W = renderer.domElement.clientWidth, H = renderer.domElement.clientHeight;
    camera.updateMatrixWorld();
    for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
      const x = T.x + i * 4, z = T.z + j * 4; v.set(x, surf(x, z), z).project(camera);
      out.push([+((v.x + 1) / 2 * W).toFixed(1), +((1 - v.y) / 2 * H).toFixed(1)]);
    }
    return JSON.stringify(out);
  })()`));
  const name = `${tag}_${String(D).padStart(4, "0")}`;
  await shot(name, 95);
  log.push({ name, D, ...info, fog: fogOff ? 0 : 1, pts });
};
// FC_TIMES="tag:days:hour,..." (days after the save's start date, local hour); default Nov 1 noon + 1 March noon
const at = async (off, hr) => { await ev(`GS.storm = 0; GS.hour = window.__fcH = Math.floor(GS.hour / 24) * 24 + ${hr} + ${off * 24}; true`); await sleep(800); };
const DS = (process.env.FC_DS || "2000,1000,500,200,100,50,30").split(",").map(Number);
const TIMES = (process.env.FC_TIMES || "nov:0:12,mar:120:12").split(",").map(s => s.split(":"));
for (const [tag, days, hr] of TIMES) {
  await at(+days, +hr);
  console.log(tag, "sunEl", await ev("sunEl(GS.hour % 24).toFixed(1)"), "fog", await ev("scene.fog.density.toFixed(5)"), "fogRGB", await ev("scene.fog.color.toArray().map(v => v.toFixed(3)).join(',')"));
  for (const D of DS) await take(tag, D, false);
  if (process.env.FC_VARIANTS) for (const D of DS) await take(tag + "nofog", D, true);
}
fs.writeFileSync(`${OUT}/fellcolour.json`, JSON.stringify(log));
await ev("window.camOv = null; true");
await done();
