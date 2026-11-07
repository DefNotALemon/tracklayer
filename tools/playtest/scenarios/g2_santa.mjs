// Santa's Sled + wildlife: rare Bytteboden listing → pay → trailer pickup → garage; the nine harnessed reindeer
// (Rudolph only after eight); riding with the team; the wildlife rig (gait strips) and a moose that's solid.
import { boot, ev, shot, sleep, done, park, sideCam, camOff, hold, OUT } from "../lib.mjs";
import fs from "node:fs";
const sub = d => { fs.mkdirSync(`${OUT}/${d}`, { recursive: true }); return d + "/"; };
await boot();
await park();
await sleep(1500);
console.log("wild groups after boot", await ev(`JSON.stringify(WILD.groups.map(g => [g.kind, g.m.length, Math.round(Math.hypot(g.x - P.x, g.z - P.z))]))`));

// ---- gait strips: a lone rig, driven by hand, posed 0.1 s apart, shot side-on ----
await ev(`window.__rig = null; window.__mk = (kind, variant) => { if (window.__rig) window.__rig.g.visible = false; const q = quadMake(kind, variant); q.g.visible = true; q.x = P.x + 8; q.z = P.z; q.yaw = 0; q.v = 0; q.graze = 0; window.__rig = q; wildPlace(q, 0.016, camera.position.x, camera.position.z, false); return true; }; true`);
await ev(`window.__step = (v, dt, graze = 0) => { const q = window.__rig; q.v = v; q.graze = graze; q.z += v * dt; wildPlace(q, dt, q.x, q.z - 4, false); return true; }; true`);
await ev(`WILD.max = 0; for (const G of WILD.groups) for (const q of G.m) wildFree(q); WILD.groups.length = 0; GS.hour = 12; true`);
for (const [kind, v, dist, h] of [["reindeer", 1.3, 3.4, 0.4], ["reindeer", 4, 3.4, 0.4], ["reindeer", 10, 3.6, 0.4], ["moose", 1.8, 5.5, 0.6], ["moose", 6, 5.5, 0.6], ["fox", 2.5, 1.6, 0.2], ["fox", 8, 1.6, 0.2], ["hare", 6, 1.4, 0.15]]) {
  await ev(`__mk("${kind}"); true`);
  await sideCam(`[__rig.x, __rig.g.position.y + ${QH(kind)}, __rig.z]`, dist, h, 1.5708);
  for (let i = 0; i < 40; i++) await ev(`__step(${v}, 0.02)`);      // settle into the gait
  const d = sub(`strip_${kind}_${v}`);
  for (let i = 0; i < 8; i++) { await ev(`__step(${v}, 0.05); __step(${v}, 0.05)`); await sleep(120); await shot(`${d}${String(i).padStart(2, "0")}`); }
}
function QH(k) { return { reindeer: 0.7, moose: 1.2, fox: 0.25, hare: 0.15 }[k]; }
await ev(`__mk("reindeer"); true`); await sideCam(`[__rig.x, __rig.g.position.y + 0.6, __rig.z]`, 3.2, 0.5, 2.4);
for (let i = 0; i < 30; i++) await ev(`__step(0, 0.05, 1)`); await sleep(200); await shot("graze_reindeer");
await ev(`__mk("reindeer", "harness"); true`); for (let i = 0; i < 30; i++) await ev(`__step(0, 0.05, 0)`); await sleep(200); await shot("harness_reindeer");
await ev(`__mk("moose"); __rig.ant.visible = true; true`); await sideCam(`[__rig.x, __rig.g.position.y + 1.2, __rig.z]`, 5.5, 0.6, 2.2);
for (let i = 0; i < 20; i++) await ev(`__step(0, 0.05, 0)`); await sleep(200); await shot("moose_bull");
await ev(`__rig.g.visible = false; window.__rig = null; true`); await camOff();

// ---- Bytteboden: a rare listing ----
const L = await ev(`(() => { let l = null; for (let i = 0; i < 200 && !l; i++) { const t = mktMake(CAL.abs()); if (t && t.cat === "rare") l = t; } if (!l) { l = mktMake(CAL.abs()); Object.assign(l, { cat: "rare", item: "santa" }); } GS.mkt.list.push(l); return JSON.stringify({ id: l.id, cat: l.cat, ask: l.ask, lemon: l.lemon, site: l.site, info: mktInfo(l) }); })()`);
console.log("rare listing", L);
await ev(`MKT.cat = "rare"; TABLET.toggle(true, "market"); true`); await sleep(2500); await shot("10_market_rare");
console.log("market text", await ev(`$("tabV").innerText.slice(0, 500)`));
const id = JSON.parse(L).id;
await ev(`MKT.view = ${id}; TABLET.render(); true`); await sleep(1500); await shot("11_market_detail");
await ev(`TABLET.toggle(false); true`); await sleep(800);
console.log("pool after list", await ev(`JSON.stringify(mktPool("rare"))`));
// pay from afar, then try to collect without a trailer, then with one
console.log("pay", await ev(`(() => { GS.cash = 20000; const l = GS.mkt.list.find(q => q.id === ${id}); mktPay(l); return JSON.stringify({ cash: GS.cash, held: GS.mkt.held.map(h => [h.cat, h.state, heldWhy(h)]), poolNow: mktPool("rare").length, jobs: jobsList().filter(r => r.kind === "santa").map(r => r.title) }); })()`));
console.log("trailer", await ev(`(() => { const o = GS.own; o.partsOwned["recv:ball"] = true; o.parts.recv = "ball"; o.partsOwned["hitch:trailer"] = true; o.parts.hitch = "trailer"; restat(); const h = GS.mkt.held[0]; const s = SITES.find(x => x.id === h.site); P.x = s.x + 6; P.z = s.z; P.vx = P.vz = 0; recenter(P.x, P.z, true); mktCollect(s); return JSON.stringify({ why: heldWhy(h), state: h.state, load: GS.load.map(j => [j.cargo, j.look, j.dest.id, j.bays]) }); })()`));
await sleep(2500);
await sideCam(`[P.x, P.y + 0.4, P.z]`, 6.5, 2.4, 2.6); await sleep(600); await shot("12_sleigh_on_trailer"); await camOff();
console.log("deliver", await ev(`(() => { deliver(garageSite); return JSON.stringify({ sleds: GS.own.sleds, held: GS.mkt.held.length, load: GS.load.length }); })()`));
console.log("ride w/o team", await ev(`(() => { buySled("santa"); return GS.own.sled; })()`));

// ---- the nine ----
const spots = await ev(`JSON.stringify(rareSpots().map(s => ({ id: s.id, x: Math.round(s.x), z: Math.round(s.z), h: Math.round(groundAt(s.x, s.z)), hint: Math.round(Math.hypot(s.hx - s.x, s.hz - s.z)), near: nearestSiteName(s.x, s.z) })))`);
console.log("spots", spots);
console.log("jobs row", await ev(`JSON.stringify(jobsList().filter(r => r.kind === "santa").map(r => [r.title, r.meta]))`));
await ev(`(() => { const s = rareSpots()[0]; P.x = s.x - 30; P.z = s.z; P.vx = P.vz = 0; P.yaw = Math.PI / 2; recenter(P.x, P.z, true); return true; })()`);
await sleep(3000);
console.log("dasher live?", await ev(`JSON.stringify({ q: !!rareSpots()[0].q, vis: rareSpots()[0].q && rareSpots()[0].q.g.visible })`));
await sideCam(`[rareSpots()[0].q.x, rareSpots()[0].q.g.position.y + 0.8, rareSpots()[0].q.z]`, 4, 0.6, 2.0); await sleep(800); await shot("20_dasher"); await camOff();
console.log("catch", await ev(`(() => { const q = rareSpots()[0].q; P.x = q.x - 2; P.z = q.z; return true; })()`));
await sleep(1500);
console.log("found", await ev(`JSON.stringify(santaSt())`));
// eight found → Rudolph appears; at night his nose glows
await ev(`santaSt().found = SANTA_TEAM.slice(0, 8).map(t => t[0]); GS.hour = 23; (() => { const s = rareSpots()[8]; P.x = s.x - 25; P.z = s.z; P.vx = P.vz = 0; recenter(P.x, P.z, true); })(); true`);
await sleep(3500);
console.log("rudolph", await ev(`JSON.stringify({ q: !!rareSpots()[8].q, live: rareLive(rareSpots()[8]) })`));
await sideCam(`[rareSpots()[8].q.x, rareSpots()[8].q.g.position.y + 0.9, rareSpots()[8].q.z]`, 4, 0.5, 2.2); await sleep(800); await shot("21_rudolph_night"); await camOff();
await ev(`(() => { const q = rareSpots()[8].q; P.x = q.x - 2; P.z = q.z; return true; })()`); await sleep(1500);
console.log("found all", await ev(`JSON.stringify({ n: santaN(), jobs: jobsList().filter(r => r.kind === "santa").length })`));

// ---- ride it ----
await ev(`GS.hour = 12; GS.own.parts.hitch = "none"; restat(); true`);
console.log("ride", await ev(`(() => { buySled("santa"); return JSON.stringify({ sled: GS.own.sled, eng: engineOf(sledDef()).name, light: ST.light, power: ST.power }); })()`));
await park();
await sleep(1500);
const f0 = await ev(`GS.fuel`);
await shot("30_team_parked");
await hold("KeyW", 5000);
console.log("riding", await ev(`JSON.stringify({ mph: +(Math.hypot(P.vx, P.vz) * 2.237).toFixed(1), fuel: GS.fuel, f0: ${f0}, team: TEAM.q.filter(q => q.g.visible).length, lines: TEAM.lines && TEAM.lines.visible })`));
await shot("31_team_running");
await ev(`P.vx = Math.sin(P.yaw) * 22; P.vz = Math.cos(P.yaw) * 22; true`); await hold("KeyW", 1500); await shot("32_team_flying");
console.log("fly", await ev(`JSON.stringify({ mph: +(Math.hypot(P.vx, P.vz) * 2.237).toFixed(1), lift: +(TEAM.q[8].g.position.y - surf(TEAM.q[8].x, TEAM.q[8].z)).toFixed(2) })`));
await sideCam(`[P.x + Math.sin(P.yaw) * 6, P.y + 0.6, P.z + Math.cos(P.yaw) * 6]`, 12, 3, 1.5708); await sleep(400); await shot("33_team_side"); await camOff();

// ---- a moose is solid ----
await park(); await sleep(1000);
await ev(`(() => { WILD.max = 0; const x = P.x + Math.sin(P.yaw) * 14, z = P.z + Math.cos(P.yaw) * 14, G = { kind: "moose", sp: QSP.moose, x, z, yaw: 0, state: "graze", t: 999, v: 0, m: [] }; const q = wildRig("moose"); Object.assign(q, { x, z, yaw: 1.2, v: 0, ox: 0, oz: 0, graze: 0, wT: 99 }); G.m.push(q); WILD.groups.push(G); P.vx = Math.sin(P.yaw) * 9; P.vz = Math.cos(P.yaw) * 9; return true; })()`);
await hold("KeyW", 2500);
console.log("moose hit", await ev(`JSON.stringify({ crash: CRASH.on, why: CRASH.why, mooseState: WILD.groups[0] && WILD.groups[0].state })`));
await shot("40_moose");
await done();
