// Lemmings, ermine, grizzlies: gait strips, warn → charge → swipes → mauled; fast hit kills, slow hit throws you.
import { boot, ev, shot, sleep, done, park, hold, OUT } from "../lib.mjs";
import fs from "node:fs";
await boot(); await park(); await sleep(1000);
await ev(`WILD.max = 0; for (const G of WILD.groups) for (const q of G.m) wildFree(q); WILD.groups.length = 0; GS.hour = 12; true`);
await ev(`window.__mk = (kind) => { if (window.__rig) window.__rig.g.visible = false; const q = quadMake(kind); q.g.visible = true; q.x = P.x + 30; q.z = P.z + 30; q.yaw = 0; q.v = 0; q.graze = 0; window.__rig = q; return true; };
window.__step = (v, dt, graze = 0) => { const q = window.__rig; q.v = v; q.graze = graze; q.z += v * dt; wildPlace(q, dt, q.x, q.z - 4, false); return true; };
(() => { const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { const q = window.__rig; if (q && window.__cam) { const [d, h, fov, y, a] = window.__cam; c.fov = fov; c.updateProjectionMatrix(); c.position.set(q.x + d * Math.cos(a || 0), q.g.position.y + y + h, q.z + d * Math.sin(a || 0)); c.lookAt(q.x, q.g.position.y + y, q.z); } else if (c.fov !== 70 && window.__cam) { } _r(s, c); }; })(); true`);
for (const [kind, v, d, y] of [["bear", 1.4, 13, 0.9], ["bear", 5, 13, 0.9], ["bear", 12, 13, 0.9], ["lemming", 1.2, 1.4, 0.05], ["ermine", 4, 2.6, 0.08]]) {
  await ev(`__mk("${kind}"); window.__cam = [${d}, 0.1, 22, ${y}]; true`);
  for (let i = 0; i < 40; i++) await ev(`__step(${v}, 0.02)`);
  const dir = `${OUT}/s_${kind}_${v}`; fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < 8; i++) { await ev(`__step(${v}, 0.05); __step(${v}, 0.05)`); await sleep(150); await shot(`s_${kind}_${v}/${i}`); }
}
// portraits: three-quarter view
for (const [kind, d, y] of [["bear", 6, 0.9], ["lemming", 0.7, 0.05], ["ermine", 1.1, 0.08]]) {
  await ev(`__mk("${kind}"); window.__cam = [${d}, 0.25, 30, ${y}, 0.8]; true`); for (let i = 0; i < 20; i++) await ev(`__step(0, 0.05)`); await sleep(250); await shot(`p_${kind}`);
}
// a lunge and a dead bear
await ev(`__mk("bear"); window.__cam = [7, 0.3, 30, 0.9, 1.2]; __rig.lunge = 0.6; true`); for (let i = 0; i < 6; i++) await ev(`__step(0, 0.05)`); await sleep(250); await shot("p_bear_lunge");
await ev(`__rig.dead = 1; true`); for (let i = 0; i < 30; i++) await ev(`__step(0, 0.05)`); await sleep(250); await shot("p_bear_dead");
await ev(`__rig.g.visible = false; window.__rig = null; window.__cam = null; camera.fov = 70; camera.updateProjectionMatrix(); true`);

const bear = (dist, extra = "") => ev(`(() => { for (const G of WILD.groups) for (const q of G.m) wildFree(q); WILD.groups.length = 0; WILD.hurt = 0; WILD.hitT = 0;
  const x = P.x + Math.sin(P.yaw) * ${dist}, z = P.z + Math.cos(P.yaw) * ${dist}, G = { kind: "bear", sp: QSP.bear, x, z, yaw: P.yaw + Math.PI, state: "graze", t: 999, v: 0, m: [] };
  const q = wildRig("bear"); Object.assign(q, { x, z, yaw: P.yaw + Math.PI, v: 0, ox: 0, oz: 0, graze: 0, wT: 99 }); G.m.push(q); WILD.groups.push(G); ${extra} return true; })()`);
const bs = () => ev(`JSON.stringify({ st: WILD.groups[0] && WILD.groups[0].state, d: WILD.groups[0] && +Math.hypot(WILD.groups[0].m[0].x - (CRASH.on ? CRASH.x : FOOT.on ? FOOT.x : P.x), WILD.groups[0].m[0].z - (CRASH.on ? CRASH.z : FOOT.on ? FOOT.z : P.z)).toFixed(1), hurt: +WILD.hurt.toFixed(2), crash: CRASH.on, foot: FOOT.on, dead: GS.dead, dq: WILD.groups[0] && WILD.groups[0].m[0].dead, toast: [...document.querySelectorAll("#toasts > *, .toast")].map(e => e.textContent).slice(-2) })`);

// stopped on the sled at 14 m: warn, then it charges and swipes
await park(); await sleep(800);
await bear(14); await sleep(600); console.log("parked 14m", await bs());
await sleep(3500); console.log("after warn", await bs());
await shot("10_bear_charge");
for (let i = 0; i < 16; i++) { await sleep(1000); const r = JSON.parse(await bs()); console.log("t", i, JSON.stringify(r)); if (r.dead) break; }
await sleep(5000);
// fast hit kills
await ev(`crashCancel(); FOOT.on = false; true`); await park(); await sleep(1500);
await bear(30, `WILD.groups[0].state = "walk";`); await ev(`P.vx = Math.sin(P.yaw) * 26; P.vz = Math.cos(P.yaw) * 26; true`);
await hold("KeyW", 1500); console.log("fast hit", await bs()); await shot("20_bear_killed");
// slow hit throws you, it charges
await sleep(2500); await ev(`crashCancel(); FOOT.on = false; true`); await park(); await sleep(1500);
await bear(14, `WILD.groups[0].state = "walk";`); await ev(`P.vx = Math.sin(P.yaw) * 12; P.vz = Math.cos(P.yaw) * 12; true`);
await hold("KeyW", 1500); console.log("slow hit", await bs());
// outrun it: get back on, floor it away
await sleep(6000); console.log("later", await bs());
// small ones spawn + lemming dive
await ev(`crashCancel(); FOOT.on = false; true`); await park(); await sleep(800);
console.log("lemmings", await ev(`(() => { for (const G of WILD.groups) for (const q of G.m) wildFree(q); WILD.groups.length = 0; const x = P.x + Math.sin(P.yaw) * 4, z = P.z + Math.cos(P.yaw) * 4, G = { kind: "lemming", sp: QSP.lemming, x, z, yaw: 0, state: "graze", t: 99, v: 0, m: [] }; for (let i = 0; i < 5; i++) { const q = wildRig("lemming"); Object.assign(q, { x: x + i * 0.3, z, yaw: 0, v: 0, ox: i * 0.3, oz: 0, graze: 0, wT: 9 }); G.m.push(q); } WILD.groups.push(G); return true; })()`));
await sleep(1500); console.log("dived", await ev(`JSON.stringify(WILD.groups[0].m.map(q => +q.dive.toFixed(1)))`));
await ev(`WILD.max = 8; true`); await sleep(15000);
console.log("spawned", await ev(`JSON.stringify(WILD.groups.map(g => g.kind + "x" + g.m.length))`));
await done();
