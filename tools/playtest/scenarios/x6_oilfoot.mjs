// Slice 6.3b2b (G4): the oil driver on foot (tlx-lights.js v6, tracklayer.js api.walkAs). At a light the sled stops at
// the end of the run, the driver gets off, carries the drums to the oil store's door one at a time on the shoulder
// (the walker's own gait: api.walkAs), and rides home; at the quay they stand by the parked sled; stopped, they can be
// hailed with the use control and talked to in person.
// Asserts, exit 1 on a failure. NOSTILLS=1 skips the stills.
//  A. the carry planned at each of the three lights: from the sledge to a door, round anything standing, a sane length
//     and time.
//  B. at the quay: the driver stands by the sled (nobody in the saddle), boots on the snow, looks round at you; while
//     loading they are at the sledge.
//  C. the hail: within reach the use control reads TALK on keyboard, pad and touch, and says a line; out of reach, not.
//  D. the stop at Finnkirka, watched in real time: every part of it in order, the drums off the sledge one at a time and
//     on the shoulder, walking pace with a drum and without, no jumps, boots on the ground, planted boots on the packed
//     path, a trench behind; the drums are in the store only when the stop ends; then home in the saddle.
//  E. in person: while they carry, the Staff app's place is the light; riding, nowhere.
//  F. a storm does not stop the carry.  G. a reload mid-stop carries on.  H. a stop slept through lands the drums.
//  I. DRV.unload off: the drums land as the sled arrives.  J. let go mid-stop: the drums stand at the quay again.
import { boot, reload, ev, sleep, shot, done, park, tap, padSet } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const STILLS = !process.env.NOSTILLS;
const still = async n => { if (STILLS) await shot(n); };
const pass = (hours, st = 0.25) => ev(`(() => { for (let t = 0; t < ${hours} - 1e-9; t += ${st}) { GS.hour += ${st}; TLX.state("staff").crew.forEach(q => q.hap = 70); TLX.lights.step(); } return true; })()`);
const warm = () => ev(`window.__warm = window.__warm || setInterval(() => { GS.warmth = 100; if (TLX.state("staff")) TLX.state("staff").crew.forEach(q => q.hap = 70); }, 300); true`);
const calm = () => ev(`WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; true`);
const D = () => J(`Object.assign({}, TLX.lights.drv(), { line: TLX.lights.drvLine() })`);
const stand = (x, z, yaw = 0) => ev(`(() => { if (INT.on) intGoOut(); crashCancel(); FOOT.on = true; FOOT.x = ${x}; FOOT.z = ${z}; FOOT.yaw = ${yaw}; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.vx = FOOT.vz = 0; FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return true; })()`);
// the figure as drawn
const G = () => J(`(() => { const d = TLX.lights.sled(), f = d.fig; if (!f) return { built: false, fig: false };
  return { built: true, fig: f.visible, rider: d.rider.visible, mode: d.mode, x: d.F.x, z: d.F.z, y: f.position.y, fy: d.F.y, surf: surf(d.F.x, d.F.z), yaw: d.F.yaw, hy: d.hy, n: d.drums.filter(q => q.visible).length, cd: d.cd.visible,
    sx: d.g.position.x, sz: d.g.position.z, gx: d.sg.position.x, gz: d.sg.position.z, hail: d.hail, shown: d.shown, us: d.us }; })()`);
const cam = (expr) => ev(`(() => { if (!window.__camHk) { window.__camHk = 1; const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.__cam) window.__cam(c); _r(s, c); }; } window.__cam = ${expr}; return true; })()`);
// a camera on the figure: side (to its left), back, up
const figCam = (side, back, up) => cam(`c => { const d = TLX.lights.sled(), F = d.F; if (!d.fig) return; const y = F.yaw, fx = Math.sin(y), fz = Math.cos(y), lx = Math.cos(y), lz = -Math.sin(y); const gy = surf(F.x, F.z); c.position.set(F.x + lx * ${side} - fx * ${back}, Math.max(surf(F.x + lx * ${side} - fx * ${back}, F.z + lz * ${side} - fz * ${back}) + 0.5, gy + ${up}), F.z + lz * ${side} - fz * ${back}); c.lookAt(F.x, gy + 0.95, F.z); }`);
const fixCam = (x, z, up, tx, tz) => cam(`c => { c.position.set(${x}, surf(${x}, ${z}) + ${up}, ${z}); c.lookAt(${tx}, surf(${tx}, ${tz}) + 0.9, ${tz}); }`);
const toasts = () => ev(`(() => { if (!window.__tsaw) { window.__tsaw = []; setInterval(() => { for (const e of document.querySelectorAll("#toasts > *")) { const t = e.textContent; if (!window.__tsaw.includes(t)) window.__tsaw.push(t); } }, 80); } return true; })()`);
const said = async () => { const a = await J(`window.__tsaw || []`); await ev(`window.__tsaw.length = 0; true`); return a; };
const setup = async () => { await warm(); await calm(); await ev(`tutSkip(); crashCancel(); true`); await sleep(300); await toasts(); };

await boot(); await setup();
await ev(`GS.hour = 34; GS.cash = 90000; GS.apps.realestate = 1; TLX.state("staff").apps = []; TLX.state("staff").next = 1e9; true`);
await sleep(1200); await park();
await ev(`TLX.prop.buy("slettnes"); TLX.prop.buy("finnkirka"); TLX.prop.buy("kinnarodden"); TLX.lights.step(); TLX.staff.tick(); true`); await sleep(500);

// ---- A: the carry at each light
const A = await J(`(() => { const o = {}, L = TLX.lights, W = TLX.api.world;
  for (const lp of L.LAMPS) { const R = L.route(lp.id), un = L.unPlan(lp.id); if (!un) { o[lp.id] = null; continue; }
    const l = TLX.prop.listing(lp.prop), d = l.at.rooms[lp.room.split(":")[1]], b = L.posAt(R, R.len - L.UN.back), end = un.pts[un.pts.length - 1];
    let hit = 0, sea = 0, n = 0; for (let s = 0; s <= un.len - 1.6; s += 0.4) { const p = L.posAt(un, s); n++; if (obNear(p.x, p.z, 0.45)) hit++; if (isSea(p.x, p.z)) sea++; }
    o[lp.id] = { len: +un.len.toFixed(1), pts: un.pts.length, hit, sea, n, dS: +Math.hypot(un.S[0] - b.x, un.S[1] - b.z).toFixed(2), dDoor: +Math.hypot(end[0] - d.x, end[1] - d.z).toFixed(2), atWall: obNear(end[0], end[1], 1.2),
      per: +un.per.toFixed(1), tot2: +(L.unTot(un, 2) / 50).toFixed(2), line: +Math.hypot(un.S[0] - d.x, un.S[1] - d.z).toFixed(1) }; }
  return o; })()`);
console.log("A", JSON.stringify(A));
for (const id of ["slettnes", "finnkirka", "kinnarodden"]) {
  const r = A[id];
  ok(r && r.hit === 0 && r.sea === 0 && r.len >= 3 && r.len <= 60 && r.len < r.line * 1.8 + 4, `A: ${id}: a way on foot from the sledge to the door, ${r && r.len} m (${r && r.line} m in a line), through nothing standing: ` + JSON.stringify(r));
  ok(r && r.dS < 1.2 && r.dDoor < 2.6 && r.atWall && r.tot2 > 0.3 && r.tot2 < 2.6, `A: ${id}: it starts beside the sledge and ends at the door; two drums take ${r && r.tot2} game hours (${r && r.per} s a drum)`);
}

// ---- B: at the quay
const q0 = await J(`TLX.lights.quaySpot()`);
for (const id of ["slettnes", "finnkirka", "kinnarodden"]) await ev(`(() => { const r = TLX.lights.rec("${id}"); r.oil = TLX.lights.num("${id}", "tank"); r.store = 0; r.q = 0; r.on = true; TLX.state("lights").hT = GS.hour; return true; })()`);
const did = await ev(`(() => { const a = TLX.staff.post({ id: "oil:quay", role: "oildriver" }); Object.assign(a, { name: "Mikkel Utsi", xp: 6, xpReal: 6, wage: 98 }); a.tr = Object.assign(a.tr || {}, { honest: true, temper: 0.2, work: 1 }); TLX.staff.hire(a.id); TLX.lights.drv().so = false; return a.id; })()`);
await stand(q0.x + 30, q0.z + 22); await sleep(2800);
let g = await G();
// stand to one side of them, 4 m off, not in front
await stand(g.x + Math.cos(g.yaw) * 3.4 + Math.sin(g.yaw) * 2.2, g.z - Math.sin(g.yaw) * 3.4 + Math.cos(g.yaw) * 2.2); await sleep(1600);
g = await G();
ok(g.fig && !g.rider && g.mode === "stand" && Math.hypot(g.x - g.sx, g.z - g.sz) < 1.6 && Math.hypot(g.x - g.sx, g.z - g.sz) > 0.6, `B: hired: the driver stands by the parked sled (${Math.hypot(g.x - g.sx, g.z - g.sz).toFixed(2)} m from its middle), nobody in the saddle: ` + JSON.stringify([g.fig, g.rider, g.mode]));
ok(Math.abs(g.fy - g.surf) < 0.35 && Math.abs(g.y - g.fy) < 0.12, `B: boots on the snow (the figure ${(g.fy - g.surf).toFixed(2)} m from the top of it, bob ${(g.y - g.fy).toFixed(2)})`);
ok(Math.abs(g.hy) > 0.3, `B: they look round at you (head turned ${g.hy.toFixed(2)} rad)`);
await figCam(2.8, -2.4, 1.5); await sleep(400); await still("x6f_b_quay");

// ---- C: the hail, on all three schemes
const use = () => J(`(() => { const u = footXUse(); return { label: u ? u.label : null, hint: u ? u.hint() : "", foot: footUse(), wn: $("wnHint") ? $("wnHint").textContent : "" }; })()`);
await stand(g.x + Math.sin(g.yaw) * 1.6, g.z + Math.cos(g.yaw) * 1.6, g.yaw + Math.PI); await sleep(700);
let u = await use(); await said();
ok(u.label === "TALK" && /talk to Mikkel/.test(u.hint) && /talk to Mikkel/.test(u.wn), `C: keyboard: within reach the use control talks to them ("${u.hint}"; on screen: "${u.wn}")`);
await tap("KeyE"); await sleep(500); let sd = await said();
ok(sd.some(t => /^Mikkel: "Nothing to haul just now\. Order the drums/.test(t)), "C: keyboard: the use key gets a line from them: " + JSON.stringify(sd).slice(0, 200));
await padSet({}); await sleep(300); await padSet({ 10: 1 }); await sleep(160); await padSet({}); await sleep(600); sd = await said(); u = await use();
ok(sd.some(t => /^Mikkel: "/.test(t)) && u.label === "TALK" && /talk to Mikkel/.test(u.hint) && !/^E:/.test(u.hint), `C: pad: the stick click hails them, the hint names the pad's control ("${u.hint}")`);
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(500);
const tb = await J(`({ t: $("tcUse") ? $("tcUse").textContent : null, hint: footXUse() ? footXUse().hint() : "" })`);
await ev(`(() => { const b = $("tcUse"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return true; })()`);
await sleep(500); sd = await said();
ok(/TALK/.test(tb.t || "") && /tap TALK/.test(tb.hint) && sd.some(t => /^Mikkel: "/.test(t)), `C: touch: the use button reads TALK and hails them ("${tb.hint}")`);
await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`); await sleep(200);
await stand(g.x + Math.sin(g.yaw) * 6, g.z + Math.cos(g.yaw) * 6); await sleep(500); u = await use();
ok(u.label !== "TALK", "C: six metres off the use control is not theirs");

// loading: at the sledge
await ev(`(() => { TLX.lights.rec("finnkirka").oil = 10; TLX.lights.order("finnkirka"); TLX.lights.order("finnkirka"); return true; })()`);
await pass(0.25); for (let i = 0; i < 40 && (await G()).mode !== "load"; i++) await sleep(400);   // (they walk the four metres back to the sledge: headless that is a few seconds)
await sleep(500); g = await G(); let d = await D();
ok(d.st === "quay" && g.fig && g.mode === "load" && g.n === 2 && Math.hypot(g.x - g.gx, g.z - g.gz) < 1.4, `B: loading: they have walked back to the sledge (${Math.hypot(g.x - g.gx, g.z - g.gz).toFixed(2)} m from its middle), two drums on it: ` + JSON.stringify([d.st, g.mode, g.n]));
await figCam(-2.6, -3.0, 1.6); await sleep(400); await still("x6f_b_loading");

// ---- D: the stop at Finnkirka, watched
let h = 0; while (h < 12 && (await D()).st !== "unload") { await pass(0.25); h += 0.25; }
d = await D(); let fk = await J(`TLX.lights.rec("finnkirka")`);
const un = await J(`TLX.lights.unPlan("finnkirka")`), plan = await J(`TLX.lights.unTot(TLX.lights.unPlan("finnkirka"), 2)`);   // (6.3b2c: the brake and the swings off and on are in the stop's clock too)
ok(d.st === "unload" && d.n === 2 && fk.store === 0 && Math.abs(d.uT * 50 - plan) < 0.5 && /at Finnkirka, carrying 2 drums in/.test(d.line), `D: ${h} h out: stopped at the light, the two drums still on the sledge, ${(d.uT).toFixed(2)} game hours of carrying ahead ("${d.line}")`);
ok((await J(`TLX.lights.drvAboard("finnkirka")`)) === 2 && (await J(`TLX.lights.atQuay("finnkirka")`)) === 0, "D: the drums are the driver's until they are in the store");
// watch from beside the way, a third along it
const mid = await J(`(() => { const L = TLX.lights, un = L.unPlan("finnkirka"), p = L.posAt(un, un.len * 0.4); return { x: p.x - p.tz * 6.5, z: p.z + p.tx * 6.5, px: p.x, pz: p.z, tx: p.tx, tz: p.tz }; })()`);
await stand(mid.x, mid.z, Math.atan2(mid.px - mid.x, mid.pz - mid.z));
await ev(`(() => { const q = TLX.lights.drv(); q.u = 0; TLX.state("lights").hT = GS.hour; return true; })()`);
await sleep(600);
await ev(`(() => { window.__fr = []; if (!window.__frH) { window.__frH = 1; const T = TLX.api.THREE, v = [new T.Vector3(), new T.Vector3()]; const f = () => { const s = TLX.lights.sled(); if (s.fig && window.__fr) { const U = s.fig.userData, F = s.F, vis = s.fig.visible; if (vis) { s.fig.updateMatrixWorld(true); U.ank[0].getWorldPosition(v[0]); U.ank[1].getWorldPosition(v[1]); }
  window.__fr.push([gameClock, s.mode, vis ? 1 : 0, F.x, F.z, s.fig.position.y, F.y, F.hardW, F.sp, v[0].x, v[0].y, v[0].z, v[1].x, v[1].y, v[1].z, s.drums.filter(q => q.visible).length, s.cd.visible ? 1 : 0, s.cd.position.y, s.rider.visible ? 1 : 0, s.us, surf(F.x, F.z)]); } requestAnimationFrame(f); }; requestAnimationFrame(f); } return true; })()`);
await fixCam(mid.x, mid.z, 1.7, mid.px, mid.pz);
const seen = {}; let guard = 0, burst = 0;
while ((await D()).st === "unload" && guard++ < 3000) {
  const m = await ev(`TLX.lights.sled().mode`); seen[m] = (seen[m] || 0) + 1;
  if (STILLS) {
    if (m === "toS" && seen[m] === 4) { await figCam(3.4, 0.2, 1.5); await sleep(120); await still("x6f_d1_off"); }
    if (m === "lift" && seen[m] <= 4 && !seen.in) { await figCam(-2.4, -2.4, 1.6); await sleep(80); await still("x6f_d2_lift" + seen[m]); }
    if (m === "carry" && !seen.in && seen[m] >= 6 && burst < 6) { await figCam(3.3, 0, 1.3); await sleep(60); await still("x6f_d3_carry_side" + (++burst)); }
    if (m === "carry" && !seen.in && seen[m] === 30) { await figCam(0.5, -3.6, 1.5); await sleep(120); await still("x6f_d4_carry_front"); await figCam(-0.6, 3.6, 1.7); await sleep(120); await still("x6f_d4_carry_behind"); }
    if (m === "back" && seen[m] >= 5 && burst < 12) { await figCam(3.3, 0, 1.3); await sleep(60); await still("x6f_d6_back_side" + (++burst - 6)); }
    if (m === "carry" && seen.in && seen[m] === 12) { await figCam(3.3, 0, 1.3); await sleep(60); await still("x6f_d7_carry2_side"); }
    if (m === "toQ" && seen[m] === 3) { await figCam(3.4, 0.2, 1.5); await sleep(120); await still("x6f_d8_on"); }
  }
  await sleep(110);
}
const fr = await J(`window.__fr`); await ev(`window.__fr = null; true`);
d = await D(); fk = await J(`TLX.lights.rec("finnkirka")`); g = await G();
// the order of things
const seq = []; for (const f of fr) if (seq[seq.length - 1] !== f[1]) seq.push(f[1]);
console.log("D seq", seq.join(" > "), "frames", fr.length, "game s", (fr[fr.length - 1][0] - fr[0][0]).toFixed(1));
ok(/^(brake,)?(seat,)?off,toS,lift,carry,in,back,lift,carry,in,back,toQ,on,seat(,ride)?$/.test(seq.join(",")), "D: off the sled, to the sledge, a drum up and carried in, back for the second, the same again, back to the sled and on: " + seq.join(" > "));
const span = fr[fr.length - 1][0] - fr[0][0];
ok(Math.abs(span - d.uT * 50) < 6 || Math.abs(span - plan) < 6, `D: the stop took ${span.toFixed(0)} game seconds (planned ${plan.toFixed(0)})`);
// pace and jumps, per mode
const pace = m => { const F = fr.filter(f => f[1] === m && f[2]); let dist = 0, t = 0, jump = 0; for (let i = 1; i < F.length; i++) { const dt = F[i][0] - F[i - 1][0]; if (dt <= 0 || dt > 0.3) continue; const dd = Math.hypot(F[i][3] - F[i - 1][3], F[i][4] - F[i - 1][4]); dist += dd; t += dt; jump = Math.max(jump, dd); } return { v: t ? dist / t : 0, jump, n: F.length }; };
const pc = pace("carry"), pb = pace("back"), ps = pace("toS");
console.log("D pace", JSON.stringify({ pc, pb, ps }));
ok(Math.abs(pc.v - 1.1) < 0.2 && Math.abs(pb.v - 1.5) < 0.25, `D: ${pc.v.toFixed(2)} m/s with a drum on the shoulder, ${pb.v.toFixed(2)} m/s walking back`);
ok(pc.jump < 0.3 && pb.jump < 0.3 && ps.jump < 0.3, `D: no jumps on foot (largest step in a frame ${Math.max(pc.jump, pb.jump, ps.jump).toFixed(2)} m)`);
// on the ground: the figure's own floor against the snow, and the lower ankle near that floor
let off = 0, ank = 0; for (const f of fr) if (f[2] && f[1] !== "off" && f[1] !== "on") { off = Math.max(off, Math.abs(f[6] - f[20])); ank = Math.max(ank, Math.abs(Math.min(f[10], f[13]) - 0.075 - f[6])); }
ok(off < 0.4 && ank < 0.3, `D: on the ground all the way (floor within ${off.toFixed(2)} m of the snow top, the lower boot within ${ank.toFixed(2)} m of the floor)`);
// planted boots where the snow is packed (the walk): the lower ankle barely moves over the ground
const W = fr.filter(f => f[2] && f[7] > 0.9 && f[8] > 0.8 && (f[1] === "carry" || f[1] === "back")); let slide = [], hwMax = 0; for (const f of fr) hwMax = Math.max(hwMax, f[7]);
for (let i = 1; i < W.length; i++) { const a = W[i - 1], b = W[i], dt = b[0] - a[0]; if (dt <= 0 || dt > 0.1) continue; const k = b[10] < b[13] ? 9 : 12, lo = Math.min(b[10], b[13]), hi = Math.max(b[10], b[13]); if (hi - lo < 0.04) continue; slide.push(Math.hypot(b[k] - a[k], b[k + 2] - a[k + 2]) / dt); }
slide.sort((a, b) => a - b); const med = slide.length ? slide[slide.length >> 1] : -1, p80 = slide.length ? slide[Math.floor(slide.length * 0.8)] : -1;
console.log("D planted", JSON.stringify({ frames: W.length, n: slide.length, med: +med.toFixed(3), p80: +p80.toFixed(3), hwMax: +hwMax.toFixed(2) }));
if (slide.length > 30) ok(med < 0.25 && p80 < 0.6, `D: on the packed path the standing boot stays put (median ${med.toFixed(2)} m/s over the ground, 80% under ${p80.toFixed(2)}; the body does ${pb.v.toFixed(1)})`);
else console.log("note: too few walking frames on packed snow to judge planted boots (" + slide.length + "): the snow at the light was deep and loose, the gait was the wade (hardW max " + hwMax.toFixed(2) + ")");
// the drums
const liftN = fr.filter(f => f[1] === "lift").map(f => f[15]), carryCd = fr.filter(f => f[1] === "carry"), l1 = fr.findIndex(f => f[1] === "in");
const sh = carryCd.map(f => f[17] - f[6]); const shMin = Math.min(...sh), shMax = Math.max(...sh);
ok(fr[0][15] === 2 && fr.slice(0, l1).filter(f => f[1] === "carry").every(f => f[15] === 1 && f[16] === 1) && fr.filter(f => f[1] === "back" || f[1] === "toQ").every(f => f[16] === 0) && fr[fr.length - 1][15] === 0, "D: two on the sledge, one while the first is carried, none after the second; a drum is in hand only on the way in");
ok(shMin > 1.2 && shMax < 2.0, `D: carried, the drum rides ${shMin.toFixed(2)}-${shMax.toFixed(2)} m over the snow (on the shoulder)`);
ok(fr.filter(f => f[1] === "in").every(f => !f[2]) && fr.filter(f => f[1] === "seat" || f[1] === "brake").every(f => f[18] === 1 && !f[2]), "D: inside the door they are out of sight; in the saddle the rider is the one drawn");
ok(d.st === "back" && fk.store === 120 && fk.q === 0, `D: the stop over: both drums in Finnkirka's store (${fk.store} L), on the way home`);
// the trench they left
const pk = await J(`(() => { const L = TLX.lights, un = L.unPlan("finnkirka"); let s = 0, n = 0; for (let t = 2; t < un.len - 3; t += 1) { const p = L.posAt(un, t), ix = Math.round((p.x + HALF) / CELL), iz = Math.round((p.z + HALF) / CELL), dd = depthAt(ix, iz), f = freshAt(ix, iz); s += f > 0.02 ? 1 - dd / f : 1; n++; } return s / n; })()`);
ok(pk > 0.15, `D: four walks left a trodden path to the door (mean pack ${pk.toFixed(2)} along it)`);
await sleep(1500); g = await G();
ok(g.rider && !g.fig && g.n === 0, "D: riding home: in the saddle, nobody on foot, the sledge empty");

// ---- E: in person
h = 0; while (h < 12 && (await D()).st !== "quay") { await pass(0.25); h += 0.25; }
await ev(`(() => { TLX.lights.rec("finnkirka").oil = 10; TLX.lights.order("finnkirka"); return true; })()`);
await pass(1); d = await D();
const pl1 = await J(`(() => { const m = TLX.lights.driver(); return { st: TLX.lights.drv().st, at: TLX.staff.atPlace(m), places: TLX.staff.places ? TLX.staff.places().filter(p => p.id === "oil:quay").map(p => ({ x: p.x === undefined ? null : p.x, talk: p.talk })) : null }; })()`);
console.log("E riding", JSON.stringify(pl1));
ok(pl1.st === "out" && !pl1.at && (!pl1.places || (pl1.places[0].x === null && /riding the run/.test(pl1.places[0].talk))), "E: riding, there is no having a word in person");
h = 0; while (h < 12 && (await D()).st !== "unload") { await pass(0.25); h += 0.25; }
const end = await J(`TLX.lights.drvPos()`);
await stand(end.x + 7, end.z + 5); await sleep(1500);
const pl2 = await J(`(() => { const m = TLX.lights.driver(); return { st: TLX.lights.drv().st, at: TLX.staff.atPlace(m) }; })()`);
ok(pl2.st === "unload" && pl2.at, "E: while they carry the drums in, standing at the light is talking in person (PRAISE / CRITICISE open)");

// ---- F: a storm does not stop the carry
const u0 = (await D()).u; await ev(`WX.at = () => 1; true`); await pass(0.25, 0.05); d = await D();
ok(d.st === "unload" && d.u > u0 + 0.2 && !d.held, `F: a storm over the light: the carry goes on (${u0.toFixed(2)} -> ${d.u.toFixed(2)} h)`);
await ev(`WX.at = () => 0; true`);

// ---- G: a reload mid-stop
await ev(`save(); true`);
const sv = await J(`JSON.parse(localStorage.getItem("tracklayer.save.v2"))`);
await reload(sv); await setup(); await sleep(1200); await park();   // (a reload starts you on the sled at the quay, where the quay's own pickup would load a drum put back there)
await stand(end.x + 7, end.z + 5); await sleep(2500);
d = await D(); g = await G();
ok(sv.x.sys.lights.s.drv.st === "unload" && d.st === "unload" && d.n === 1 && d.u >= sv.x.sys.lights.s.drv.u - 1e-6 && g.shown && (g.fig || g.rider || g.mode === "in"), `G: a reload mid-stop: still at the light with the drum (${d.u.toFixed(2)} of ${d.uT.toFixed(2)} h), drawn (${g.mode})`);
const hailG = await J(`(() => { const s = TLX.lights.sled(); return { hail: !!s.hail, obs: s.obs ? s.obs.length : 0 }; })()`);
ok(hailG.obs === 2, "G: the sled stands solid at the light while they carry");

// ---- H: a stop slept through
await pass(3); d = await D(); fk = await J(`TLX.lights.rec("finnkirka")`);
ok((d.st === "back" || d.st === "quay") && fk.q === 0 && fk.store + fk.oil > 60, `H: three hours on without a look: the drum is in the store and they are ${d.st === "back" ? "on the way home" : "home"}`);

// ---- I: DRV.unload off
h = 0; while (h < 12 && (await D()).st !== "quay") { await pass(0.25); h += 0.25; }
await ev(`(() => { TLX.lights.DRV.unload = false; TLX.lights.rec("finnkirka").oil = 10; TLX.lights.rec("finnkirka").store = 0; TLX.lights.order("finnkirka"); return true; })()`);
let sawUn = false; h = 0; while (h < 12 && (await D()).st !== "back") { await pass(0.25); h += 0.25; if ((await D()).st === "unload") sawUn = true; }
fk = await J(`TLX.lights.rec("finnkirka")`);
ok(!sawUn && fk.store === 60, "I: with DRV.unload off the drum lands as the sled arrives (6.3b2a's way)");
await ev(`TLX.lights.DRV.unload = true; true`);

// ---- J: let go mid-stop
h = 0; while (h < 12 && (await D()).st !== "quay") { await pass(0.25); h += 0.25; }
await ev(`(() => { TLX.lights.rec("kinnarodden").oil = 8; TLX.lights.order("kinnarodden"); TLX.lights.order("kinnarodden"); return true; })()`);
h = 0; while (h < 14 && (await D()).st !== "unload") { await pass(0.25); h += 0.25; }
d = await D(); const kEnd = await J(`TLX.lights.drvPos()`);
await stand(kEnd.x + 8, kEnd.z + 4); await sleep(1500);
await ev(`TLX.staff.letGo(${JSON.stringify(did)}) || TLX.staff.letGo(TLX.lights.driver().id); true`); await sleep(4200);   // (the trip's clock steps once a game second)
const j1 = await J(`(() => { const s = TLX.lights.sled(), q = TLX.state("lights").drv, lp = "kinnarodden"; return { st: q.st, n: q.n, fig: !!(s.fig && s.fig.visible), cd: !!(s.cd && s.cd.visible), g: !!(s.g && s.g.visible), obs: s.obs ? s.obs.length : 0, claims: GS.claims.filter(c => c.own === "lights" && c.lamp === lp).length, q: TLX.lights.rec(lp).q, store: TLX.lights.rec(lp).store, drv: !!TLX.lights.driver() }; })()`);
ok(d.st === "unload" && !j1.drv && j1.st === "quay" && j1.n === 0 && !j1.fig && !j1.cd && !j1.g && j1.obs === 0 && j1.claims === 2 && j1.q === 2 && j1.store === 0, "J: let go mid-stop: nobody at the light, nothing left standing there, both drums at the quay again: " + JSON.stringify(j1));
await done(fails ? 1 : 0);
