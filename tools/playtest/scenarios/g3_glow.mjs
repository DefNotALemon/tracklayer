// G3 KIT.glowM users (the church windows, the coastal ferry's windows/portholes, the fuel pump displays): did they burn
// cream at full brightness at noon? Finds every mesh using KIT.glowM, groups them by top-level scene object, and for one
// mesh per group places the camera out along the box's thin axis (away from the group centre) looking at it.
// Nov noon + 21:00, weather pinned. Logs each target's crop RGB (centre pixel block of the glow box, from the GPU via
// readRenderTargetPixels-free method: projects the box and samples the screenshot later with imgstats) and draw calls.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_glow.mjs [outdir]
import { boot, ev, shot, sleep, done } from "../lib.mjs";

await boot();
await ev(`(() => { WX.at = () => 0; GS.storm = 0;
  const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); };
  tabCull = () => {};
  if (steamer && steamer.userData.head) { const u = steamer.userData; u.head = null; steamer.visible = true; steamer.position.set(u.x, SEA, u.z); steamer.rotation.y = u.a; }   // ferry pinned alongside
  return true; })()`);
const info = await ev(`(() => { const by = new Map();
  scene.traverse(o => { if (!o.isMesh || o.material !== KIT.glowM) return; let t = o; while (t.parent && t.parent !== scene) t = t.parent; if (!by.has(t)) by.set(t, []); by.get(t).push(o); });
  const T = []; let i = 0;
  for (const [top, ms] of by) {
    const c = new THREE.Vector3(); new THREE.Box3().setFromObject(top).getCenter(c);
    const m = ms[Math.floor(ms.length / 2)]; m.updateWorldMatrix(true, false);
    const p = new THREE.Vector3(); m.getWorldPosition(p);
    const s = m.geometry.parameters, ax = s.width <= s.height && s.width <= s.depth ? 0 : s.depth <= s.height ? 2 : 1;
    const n = new THREE.Vector3(ax === 0 ? 1 : 0, ax === 1 ? 1 : 0, ax === 2 ? 1 : 0).transformDirection(m.matrixWorld);
    if (n.dot(p.clone().sub(c)) < 0) n.negate();
    T.push({ i: i++, n: ms.length, p: [p.x, p.y, p.z], d: [n.x, n.y, n.z], big: Math.max(top.position.y, 0) });
  }
  window.__gt = T; return JSON.stringify(T.map(t => ({ i: t.i, n: t.n, p: t.p.map(v => +v.toFixed(1)) }))); })()`);
console.log("targets", info);
const T = JSON.parse(info);
for (const [tag, h] of [["nov", 12], ["night", 21]]) {
  await ev(`GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + ${h}; true`); await sleep(1200);
  for (const t of T) {
    const D = t.n > 40 ? 34 : t.n > 4 ? 13 : 4;   // ferry far, church mid, pumps close
    await ev(`(() => { const t = window.__gt[${t.i}], [x, y, z] = t.p, [dx, , dz] = t.d, L = Math.hypot(dx, dz) || 1;
      const cx = x + dx / L * ${D}, cz = z + dz / L * ${D}, cy = y + ${D} * 0.12;
      P.x = cx + 30; P.z = cz + 30; recenter(x, z, true);
      window.camOv = c => { c.position.set(cx, cy, cz); c.lookAt(x, y, z); };
      return true; })()`);
    await sleep(900);
    const px = await ev(`(() => { const t = window.__gt[${t.i}], v = new THREE.Vector3(...t.p).project(camera);
      return JSON.stringify([Math.round((v.x + 1) / 2 * innerWidth), Math.round((1 - v.y) / 2 * innerHeight)]); })()`);
    console.log("shot", `${tag}_${t.i}`, "glowpx", px);
    await shot(`${tag}_${t.i}`);
  }
  console.log("info", tag, await ev("JSON.stringify({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles })"));
}
await done();
