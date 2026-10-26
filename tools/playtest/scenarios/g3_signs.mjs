// G3 painted signs by day and night: the Helsesenter board + H signs, the fish shop and fish buyer boards, a school sign,
// a fuel station price pylon, a fuel cabin board and the helipad. Each is shot square-on from ~10 m at Nov noon, 16:00
// dusk and 22:00 night; the screen rect of the sign is written to <out>/rects.json so tools/playtest/signstat.py can
// report the sign's mean luma against the frame's (a sign that glows like a lamp at night reads far above its frame).
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_signs.mjs [outdir]   then signstat.py <outdir>
import { boot, ev, shot, sleep, done, OUT } from "../lib.mjs";
import { writeFileSync } from "node:fs";

await boot();
await ev(`(() => { WX.at = () => 0; GS.storm = 0;
  const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); };
  tabCull = () => {};
  // find the signs by their geometry (plane w×h, or the pylon/cabin boxes)
  const want = { hosp: [7.4, 1.4], hosph: [1.3, 1.3], shop: [4.6, 1.15], buyer: [4.2, 0.95], school: [3.2, 1.2], pad: null };
  const S = window.__signs = {};
  scene.traverse(o => { if (!o.isMesh || !o.geometry || !o.geometry.parameters) return; const p = o.geometry.parameters, t = o.geometry.type;
    if (t === "PlaneGeometry") for (const k in want) { const w = want[k]; if (w && !S[k] && Math.abs(p.width - w[0]) < 1e-3 && Math.abs(p.height - w[1]) < 1e-3) S[k] = { o, n: [0, 0, 1], w: p.width, h: p.height }; }
    if (t === "BoxGeometry" && !S.pylon && Math.abs(p.width - 0.2) < 1e-3 && Math.abs(p.height - 2.2) < 1e-3 && Math.abs(p.depth - 2.4) < 1e-3) S.pylon = { o, n: [1, 0, 0], w: 2.4, h: 2.2 };
    if (t === "BoxGeometry" && !S.cabin && Math.abs(p.width - 1.1) < 1e-3 && Math.abs(p.height - 0.96) < 1e-3 && Math.abs(p.depth - 0.08) < 1e-3) S.cabin = { o, n: [0, 0, 1], w: 1.1, h: 0.96 };
    if (t === "CircleGeometry" && !S.pad && o === HOSP.pad) S.pad = { o, n: [0, 0, 1], w: 13, h: 13 };
  });
  return Object.keys(S).join(","); })()`).then(r => console.log("found", r));

const rects = {};
const ids = ["hosp", "hosph", "shop", "buyer", "school", "pylon", "cabin", "pad"];
for (const [tag, h] of [["noon", 12], ["dusk", 16], ["night", 22]]) {
  await ev(`GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + ${h}; true`); await sleep(1200);
  for (const id of ids) {
    const r = await ev(`(() => { const s = window.__signs.${id}; if (!s) return "none";
      const o = s.o; o.updateMatrixWorld(true);
      const c = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
      const n = new THREE.Vector3(...s.n).transformDirection(o.matrixWorld);
      const far = ${id === "pad" ? 0 : 1} ? Math.max(6, s.w * 2.2) : 0;
      let eye;
      if ("${id}" === "pad") eye = c.clone().add(new THREE.Vector3(0, 14, 0)).add(new THREE.Vector3(10, 0, 0));
      else { eye = c.clone().addScaledVector(n, far); eye.y = Math.max(eye.y, groundAt(eye.x, eye.z) + 1.8); }
      P.x = eye.x + 30; P.z = eye.z + 30; recenter(c.x, c.z, true);
      window.camOv = cam => { cam.position.copy(eye); cam.lookAt(c); };
      return JSON.stringify({ c: [c.x, c.y, c.z], hw: s.w / 2, hh: s.h / 2 }); })()`);
    if (r === "none") { console.log("no sign", id); continue; }
    await sleep(900);
    // project the sign's corners now the camera is placed
    const rect = await ev(`(() => { const s = window.__signs.${id}, o = s.o, W = innerWidth, H = innerHeight, xs = [], ys = [];
      const pts = s.o.geometry.type === "BoxGeometry" ? (s.n[0] ? [[0, -1, -1], [0, 1, -1], [0, -1, 1], [0, 1, 1]].map(([a, b, c2]) => [a, b * s.h / 2, c2 * s.w / 2]) : [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => [a * s.w / 2, b * s.h / 2, 0]))
        : [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => [a * s.w / 2 * (s.o.geometry.type === "CircleGeometry" ? 0.7 : 0.85), b * s.h / 2 * (s.o.geometry.type === "CircleGeometry" ? 0.7 : 0.8), 0]);
      for (const p of pts) { const v = new THREE.Vector3(...p).applyMatrix4(o.matrixWorld).project(camera); xs.push((v.x + 1) / 2 * W); ys.push((1 - v.y) / 2 * H); }
      return JSON.stringify([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), W, H]); })()`);
    rects[`${tag}_${id}`] = JSON.parse(rect);
    await shot(`${tag}_${id}`);
  }
}
writeFileSync(`${OUT}/rects.json`, JSON.stringify(rects, null, 1));
await done();
