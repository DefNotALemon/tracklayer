// gait strips only: side-on, narrow FOV, 0.1 s apart
import { boot, ev, shot, sleep, done, park, OUT } from "../lib.mjs";
import fs from "node:fs";
await boot(); await park(); await sleep(1000);
await ev(`WILD.max = 0; for (const G of WILD.groups) for (const q of G.m) wildFree(q); WILD.groups.length = 0; GS.hour = 12; V.rider.visible = false; true`);
await ev(`window.__mk = (kind, variant) => { if (window.__rig) window.__rig.g.visible = false; const q = quadMake(kind, variant); q.g.visible = true; q.x = P.x + 30; q.z = P.z + 30; q.yaw = 0; q.v = 0; q.graze = 0; window.__rig = q; return true; };
window.__step = (v, dt, graze = 0) => { const q = window.__rig; q.v = v; q.graze = graze; q.z += v * dt; wildPlace(q, dt, q.x, q.z - 4, false); return true; };
(() => { const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { const q = window.__rig; if (q && window.__cam) { const [d, h, fov, y] = window.__cam; c.fov = fov; c.updateProjectionMatrix(); c.position.set(q.x + d, q.g.position.y + y + h, q.z); c.lookAt(q.x, q.g.position.y + y, q.z); } _r(s, c); }; })(); true`);
for (const [kind, v, d, y] of [["reindeer", 1.3, 9, 0.75], ["reindeer", 4, 9, 0.75], ["reindeer", 10, 9, 0.75], ["moose", 1.8, 14, 1.3], ["moose", 6, 14, 1.3], ["fox", 2.5, 4, 0.28], ["fox", 8, 4, 0.28], ["hare", 6, 3.5, 0.2]]) {
  await ev(`__mk("${kind}"); window.__cam = [${d}, 0.15, 22, ${y}]; true`);
  for (let i = 0; i < 40; i++) await ev(`__step(${v}, 0.02)`);
  const dir = `${OUT}/s_${kind}_${v}`; fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < 8; i++) { await ev(`__step(${v}, 0.05); __step(${v}, 0.05)`); await sleep(150); await shot(`s_${kind}_${v}/${i}`); }
}
await done();
