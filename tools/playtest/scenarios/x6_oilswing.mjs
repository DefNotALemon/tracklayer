// Slice 6.3b2c (G4): the oil driver climbing off and on, and the sled easing to its stop (tlx-lights.js v7).
// The driver's own swing between the saddle and the snow (SW: a pelvis on a spring, pinned boots and hands, boots that
// fly arcs, IK knees and elbows; no figure moved by its root), at a light (in the stop's clock) and at the quay (as you
// watch); the sled brakes over its last metres instead of stopping dead.
// Asserts, exit 1 on a failure. NOSTILLS=1 skips the stills.
//  A. the numbers: the brake curve never runs backwards, comes in at the sled's pace and ends at rest; the stop's
//     clock has its new parts in order.
//  B. the stop at Finnkirka, seen coming in: the sled slows all the way to its stop at the end of the run; the driver
//     swings off: starts with boots, hips and hands where the seated figure has them, planted boots stay planted, a
//     leg is never longer than a leg, no boot under the snow's floor, ends standing beside the footwell, and the
//     walker's gait takes over without a jump.
//  C. back to the sled and on: from the walker as it stands, ends in the seat with boots on the boards and hands on
//     the grips, then the seated figure rides off.
//  D. home, seen coming in: the brake to the sled's own place at the quay, off the saddle, standing by the sled; the
//     sled stays as it came in and is solid again.
//  E. leaving the quay: from the sledge to the saddle and on before the sled pulls out.
//  F. a stop first seen part-way through a swing: seated or standing, no swing run from the middle.
import { boot, ev, sleep, shot, done, park } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const STILLS = !process.env.NOSTILLS;
const pass = (hours, st = 0.25) => ev(`(() => { for (let t = 0; t < ${hours} - 1e-9; t += ${st}) { GS.hour += ${st}; TLX.state("staff").crew.forEach(q => q.hap = 70); TLX.lights.step(); } return true; })()`);
const warm = () => ev(`window.__warm = window.__warm || setInterval(() => { GS.warmth = 100; if (TLX.state("staff")) TLX.state("staff").crew.forEach(q => q.hap = 70); }, 300); true`);
const calm = () => ev(`WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; true`);
const D = () => J(`TLX.lights.drv()`);
const stand = (x, z, yaw = 0) => ev(`(() => { if (INT.on) intGoOut(); crashCancel(); FOOT.on = true; FOOT.x = ${x}; FOOT.z = ${z}; FOOT.yaw = ${yaw}; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.vx = FOOT.vz = 0; FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return true; })()`);
const cam = (expr) => ev(`(() => { if (!window.__camHk) { window.__camHk = 1; const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.__cam) window.__cam(c); _r(s, c); }; } window.__cam = ${expr}; return true; })()`);
// a camera fixed on the sled: side (to its left), back, up
const sledCam = (side, back, up) => cam(`c => { const d = TLX.lights.sled(), g = d.g; if (!g) return; const y = g.rotation.y, fx = Math.sin(y), fz = Math.cos(y), lx = Math.cos(y), lz = -Math.sin(y), X = g.position.x + lx * ${side} - fx * ${back}, Z = g.position.z + lz * ${side} - fz * ${back}; c.position.set(X, Math.max(surf(X, Z) + 0.5, g.position.y + ${up}), Z); c.lookAt(g.position.x + lx * ${side} * 0.12, g.position.y + 0.75, g.position.z - fz * 0.3); }`);
// every frame: the body, the rig, the sled
const rec = on => ev(`(() => { window.__fr = ${on ? "[]" : "null"}; if (!window.__frH) { window.__frH = 1; const T = TLX.api.THREE, v = [new T.Vector3(), new T.Vector3(), new T.Vector3(), new T.Vector3()], r = x => Math.round(x * 1000) / 1000;
  const f = () => { const s = TLX.lights.sled(), S = TLX.lights.SW, q = TLX.state("lights").drv; if (s.fig && s.g && window.__fr && S.pel) { const U = s.fig.userData; s.fig.updateMatrixWorld(true); U.ank[0].getWorldPosition(v[0]); U.ank[1].getWorldPosition(v[1]); U.fore[0].localToWorld(v[2].set(0, -0.24, 0)); U.fore[1].localToWorld(v[3].set(0, -0.24, 0));
    window.__fr.push({ t: gameClock, st: q.st, m: s.mode, on: S.on ? 1 : 0, ph: S.ph, pel: [r(S.pel.x), r(S.pel.y), r(S.pel.z)], yaw: r(S.yaw),
      ft: S.foot.map(a => [r(a.p.x), r(a.p.y), r(a.p.z), a.pin, a.fly ? 1 : 0, a.ease > 0 ? 1 : 0]), hp: S.hand.map(a => [r(a.p.x), r(a.p.y), r(a.p.z), a.pin ? 1 : 0]),
      ank: [0, 1].map(i => [r(v[i].x), r(v[i].y), r(v[i].z)]), hnd: [2, 3].map(i => [r(v[i].x), r(v[i].y), r(v[i].z)]), fp: [r(s.fig.position.x), r(s.fig.position.y), r(s.fig.position.z)], fig: s.fig.visible ? 1 : 0, rider: s.rider.visible ? 1 : 0,
      g: [s.g.position.x, s.g.position.y, s.g.position.z, s.g.rotation.y, s.g.rotation.x, s.g.rotation.z], al: r(s.al), roll: r(S.roll), dip: r(S.dip), fo: r(S.fo), surf: r(surf(S.pel.x, S.pel.z)), mv: s.moving ? 1 : 0, n: s.drums.filter(d => d.visible).length }); }
    requestAnimationFrame(f); }; requestAnimationFrame(f); } return true; })()`);
const frames = async () => { const a = await J(`window.__fr || []`); await ev(`window.__fr = null; true`); return a; };
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const seqOf = (fr, k = "m") => { const s = []; for (const f of fr) if (s[s.length - 1] !== f[k]) s.push(f[k]); return s; };
// watch until `until(mode, st)` says so; `burst` names stills to take as fast as they come while its mode runs
async function watch(until, burst, max = 900) {
  const n = {}; let i = 0;
  for (; i < max; i++) {
    const [m, st] = await J(`[TLX.lights.sled().mode, TLX.state("lights").drv.st]`);
    if (until(m, st)) break;
    if (STILLS && burst && burst[m] && (n[m] = (n[m] || 0) + 1) <= 14) await shot(`${burst[m]}_${String(n[m]).padStart(2, "0")}`); else await sleep(70);
  }
  return i < max;
}
// the seated figure's own contacts in the world, for the sled as it stood in a frame
const contacts = g => J(`(() => { const T = TLX.api.THREE, K = TLX.lights.SW.K, o = new T.Object3D(); o.rotation.order = "YXZ"; o.position.set(${g[0]}, ${g[1]}, ${g[2]}); o.rotation.set(${g[4]}, ${g[3]}, ${g[5]}, "YXZ"); o.updateMatrixWorld(true); const w = p => { const v = o.localToWorld(new T.Vector3(p.x, p.y, p.z)); return [v.x, v.y, v.z]; }; return { ft: K.ft.map(w), hd: K.hd.map(w), pel: w({ x: 0, y: K.qy, z: K.qz }) }; })()`);
// the way in to a stop: the pace before it, the mean pace in each quarter of the last UN.brake seconds, steps backwards,
// the longest stand-still before the stop itself, the largest step in a frame
function brakeOf(fr, stopped, pos) {
  const i1 = fr.findIndex(stopped), F = fr.slice(0, i1 < 0 ? fr.length : i1 + 1), tE = F[F.length - 1].t, sp = []; let backN = 0, jump = 0;
  for (let i = 1; i < F.length; i++) { const dt = F[i].t - F[i - 1].t, dd = Math.hypot(F[i].g[0] - F[i - 1].g[0], F[i].g[2] - F[i - 1].g[2]); jump = Math.max(jump, dd); if (dt <= 0.004) continue; if (pos(F[i]) < pos(F[i - 1]) - 0.02) backN++; sp.push([tE - F[i].t, dd / dt, dt]); }
  const mean = (a, b) => { const w = sp.filter(s => s[0] >= a && s[0] < b); return w.length ? w.reduce((x, s) => x + s[1] * s[2], 0) / w.reduce((x, s) => x + s[2], 0) : -1; }, B = 3.4;
  let stall = 0, run = 0; for (const s of sp) { if (s[0] > 0.5 && s[0] < 8 && s[1] < 0.3) { run += s[2]; stall = Math.max(stall, run); } else run = 0; }
  if (process.env.DBG) console.log("speeds", sp.filter(s => s[0] < 7).filter((_, i) => i % 3 === 0).map(s => s[1].toFixed(1) + "@-" + s[0].toFixed(2)).join(" "));
  return { cruise: +mean(B + 1, B + 4).toFixed(2), q4: [mean(B * 0.75, B), mean(B * 0.5, B * 0.75), mean(B * 0.25, B * 0.5), mean(0, B * 0.25)].map(v => +v.toFixed(2)), backN, stall: +stall.toFixed(2), jump: +jump.toFixed(2), n: sp.length };
}
// what a swing must be, from its frames
async function judge(tag, F, dirOn) {
  const sw = F.filter(f => f.on);
  if (sw.length < 8) { ok(false, `${tag}: the swing was seen (${sw.length} frames)`); return; }
  const phs = seqOf(sw, "ph").join(" > ");
  ok(phs === (dirOn ? "step > drive > over > sit" : "rise > back > down > stand") || phs === (dirOn ? "step > over > sit" : "rise > back > down > stand"), `${tag}: the body's own order: ${phs} (${sw.length} frames, ${(sw[sw.length - 1].t - sw[0].t).toFixed(2)} game s)`);
  ok(sw.every(f => f.fig && !f.rider), `${tag}: while it runs the swinging figure is the one drawn, not the seated one`);
  let pj = 0, legMax = 0, rigOff = 0, slide = 0, under = 0, handOff = 0;
  for (let i = 0; i < sw.length; i++) {
    const f = sw[i], p = i ? sw[i - 1] : null;
    for (let k = 0; k < 2; k++) {
      const sd = k ? 0.1 : -0.1, hip = [f.pel[0] + Math.cos(f.yaw) * sd, f.pel[1], f.pel[2] - Math.sin(f.yaw) * sd];
      legMax = Math.max(legMax, dist(hip, f.ft[k])); rigOff = Math.max(rigOff, dist(f.ank[k], f.ft[k]));
      if (f.hp[k][3]) handOff = Math.max(handOff, dist(f.hnd[k], f.hp[k]));
      if (p && p.ft[k][3] === 1 && f.ft[k][3] === 1 && !p.ft[k][5] && !f.ft[k][5] && p.ph !== "drive" && f.ph !== "drive") slide = Math.max(slide, dist(p.ft[k], f.ft[k]));   // planted on the snow, settled (in the drive the heel lifts over a planted toe)
      if (f.ft[k][3] === 1) under = Math.max(under, (f.surf - f.fo + 0.075) - f.ft[k][1] - 0.25);   // (the floor under the pelvis; a boot is 0.3 m to the side on uneven snow)
    }
    if (p) pj = Math.max(pj, dist(p.pel, f.pel) / Math.max(0.004, f.t - p.t));
  }
  ok(pj < 3.2, `${tag}: the hips never move faster than a body can (peak ${pj.toFixed(2)} m/s)`);
  // (the leg is 0.85 and the drawn one cannot be longer: the IK stops at 0.846. The BODY can read 1-2 cm over for a frame,
  // when the sled's sway carries a board boot on after the hips were held; what that shows as is the next assert's number)
  ok(legMax < 0.88, `${tag}: a leg is never longer than a leg (hip to ankle at most ${legMax.toFixed(3)} m)`);
  ok(rigOff < 0.04, `${tag}: the figure's ankles are where the body's boots are (within ${rigOff.toFixed(3)} m)`);
  ok(slide < 0.004, `${tag}: a boot planted on the snow stays put (moved ${slide.toFixed(4)} m a frame at most)`);
  ok(under <= 0, `${tag}: no boot under the snow's floor`);
  ok(handOff < 0.06, `${tag}: a hand on a grip is on it (within ${handOff.toFixed(3)} m)`);
  const flew = [0, 1].map(k => sw.some(f => f.ft[k][4]));
  ok(flew[0] && flew[1], `${tag}: both boots moved only by leaving the ground (each flew an arc)`);
  const roll = Math.max(...sw.map(f => Math.abs(f.roll))), dip = Math.max(...sw.map(f => f.dip));
  ok(roll > 0.004 && roll < 0.2 && dip > 0.002, `${tag}: the sled tips to the loaded board and settles (roll up to ${roll.toFixed(3)} rad, pressed ${dip.toFixed(3)} m)`);
  // the ends, against the seated figure's own contacts
  const e = dirOn ? sw[sw.length - 1] : sw[0], world = await contacts(e.g);
  const dF = Math.max(dist(e.ft[0], world.ft[0]), dist(e.ft[1], world.ft[1])), dH = Math.max(dist(e.hp[0], world.hd[0]), dist(e.hp[1], world.hd[1])), dP = dist(e.pel, world.pel);
  ok(dF < 0.05 && dP < 0.07 && dH < 0.08, `${tag}: ${dirOn ? "it ends" : "it starts"} on the seated figure's own contacts (boots ${dF.toFixed(3)} m, hips ${dP.toFixed(3)} m, hands ${dH.toFixed(3)} m off)`);
}

await boot(); await warm(); await calm(); await ev(`tutSkip(); crashCancel(); true`); await sleep(300);
await ev(`GS.hour = 34; GS.cash = 90000; GS.apps.realestate = 1; TLX.state("staff").apps = []; TLX.state("staff").next = 1e9; true`);
await sleep(1200); await park();
await ev(`TLX.prop.buy("slettnes"); TLX.prop.buy("finnkirka"); TLX.prop.buy("kinnarodden"); TLX.lights.step(); TLX.staff.tick(); true`); await sleep(500);
for (const id of ["slettnes", "finnkirka", "kinnarodden"]) await ev(`(() => { const r = TLX.lights.rec("${id}"); r.oil = TLX.lights.num("${id}", "tank"); r.store = 0; r.q = 0; r.on = true; TLX.state("lights").hT = GS.hour; return true; })()`);
await ev(`(() => { const a = TLX.staff.post({ id: "oil:quay", role: "oildriver" }); Object.assign(a, { name: "Mikkel Utsi", xp: 6, xpReal: 6, wage: 98 }); a.tr = Object.assign(a.tr || {}, { honest: true, temper: 0.2, work: 1 }); TLX.staff.hire(a.id); TLX.lights.drv().so = false; return a.id; })()`);

// ---- A: the numbers
const A = await J(`(() => { const L = TLX.lights, U = L.UN, o = { un: U, curves: [] };
  for (const v0 of [3, 14.4, 18.7, 40]) { let back = 0, p = 100, v1 = 0, vE = 0; for (let i = 1; i <= 100; i++) { const x = L.brakeAt(100, 100 + U.brakeD, v0, i / 100); if (x < p - 1e-9) back++; if (i === 1) v1 = (x - 100) / (U.brake / 100); if (i === 100) vE = (x - p) / (U.brake / 100); p = x; } o.curves.push({ v0, back, v1: +v1.toFixed(2), vE: +vE.toFixed(3), end: +p.toFixed(3) }); }
  const un = L.unPlan("finnkirka"), tot = L.unTot(un, 2), seq = []; for (let t = 0; t < tot; t += 0.05) { const m = L.unAt(un, 2, t).m; if (seq[seq.length - 1] !== m) seq.push(m); }
  o.tot = tot; o.per = un.per; o.seq = seq.join(","); o.side = un.side; o.Q = un.Q; o.rev = L.brakeAt(60, 0, 18, 1); return o; })()`);
console.log("A", JSON.stringify(A.curves), A.seq, A.tot.toFixed(1));
ok(A.curves.every(c => c.back === 0 && Math.abs(c.end - 100 - A.un.brakeD) < 1e-6 && Math.abs(c.vE) < 0.6) && Math.abs(A.curves[1].v1 - 14.4) < 0.8 && Math.abs(A.curves[0].v1 - 3) < 0.5 && A.rev === 0, "A: the brake never runs backwards, comes in at the sled's own pace (3 and 14.4 m/s kept) and ends at rest on its stop: " + JSON.stringify(A.curves));
ok(A.seq === "brake,seat,off,toS,lift,carry,in,back,lift,carry,in,back,toQ,on,seat" && Math.abs(A.tot - (A.un.brake + A.un.off + A.un.swOff + 2 * A.un.seg + 2 * A.per + A.un.swOn + A.un.on)) < 1e-6, `A: the stop's clock: ${A.seq} (${A.tot.toFixed(1)} s with two drums)`);

// ---- B: the stop at Finnkirka, seen coming in
await ev(`(() => { TLX.lights.rec("finnkirka").oil = 10; TLX.lights.order("finnkirka"); TLX.lights.order("finnkirka"); return true; })()`);
let h = 0; while (h < 3 && (await D()).st !== "out") { await pass(0.25); h += 0.25; }
let d = await D();
ok(d.st === "out" && d.lamp === "finnkirka", "B: the driver is out for Finnkirka with the drums: " + JSON.stringify([d.st, d.lamp, d.n]));
const E = await J(`(() => { const L = TLX.lights, R = L.route("finnkirka"), un = L.unPlan("finnkirka"), e = L.posAt(R, R.len), s = un.side, lx = e.tz * s, lz = -e.tx * s; return { x: e.x, z: e.z, tx: e.tx, tz: e.tz, len: R.len, side: s, ox: e.x + lx * 6.5 - e.tx * 1.5, oz: e.z + lz * 6.5 - e.tz * 1.5 }; })()`);
await stand(E.ox, E.oz, Math.atan2(E.x - E.ox, E.z - E.oz));
await ev(`(() => { const q = TLX.lights.drv(); q.p = q.d - 420; TLX.state("lights").hT = GS.hour; TLX.lights.sled().key = "";   /* (the sled you watch starts afresh from the clock's new place) */ return true; })()`);
await sleep(5000);
await sledCam(E.side * 2.7, 3.1, 1.5); await rec(true);
let got = await watch((m, st) => st === "unload" && m === "toS", { off: "x6w_b_off" });
await sleep(700);
let fr = await frames();
const K = await J(`(() => { const s = TLX.lights.sled(), S = TLX.lights.SW, K = S.K, T = TLX.api.THREE, w = p => { const v = s.g.localToWorld(new T.Vector3(p.x, p.y, p.z)); return [v.x, v.y, v.z]; }; s.g.updateMatrixWorld(true);
  return { bx: K.bx, by: K.by, fz: K.fz, qy: K.qy, qz: K.qz, top: K.top, zc: K.zc, last: S.last, bad: S.bad || 0, runs: S.runs, land: S.land, mixT: S.mixT }; })()`);
console.log("B K", JSON.stringify({ bx: +K.bx.toFixed(3), by: +K.by.toFixed(3), fz: +K.fz.toFixed(3), qy: +K.qy.toFixed(3), top: +K.top.toFixed(3), last: K.last, runs: K.runs }), "frames", fr.length, "modes", seqOf(fr).join(" > "));
ok(got && seqOf(fr).join(",").includes("ride,brake,seat,off,toS"), "B: riding in, the brake, a moment in the saddle, off, away to the sledge: " + seqOf(fr).join(" > "));
{ const b = brakeOf(fr, f => f.al >= E.len - 0.01, f => f.al); const en = fr.filter(f => f.m === "seat")[0];
  console.log("B brake", JSON.stringify(b));
  ok(b.cruise > 12.5 && b.cruise < 16 && b.q4[0] > b.q4[1] && b.q4[1] > b.q4[2] && b.q4[2] > b.q4[3] && b.q4[0] > 8 && b.q4[0] < b.cruise + 0.6 && b.q4[3] < 4.5 && b.backN === 0 && b.stall < 0.2, `B: in at ${b.cruise.toFixed(1)} m/s, then slower each quarter of the last ${A.un.brake} s (${b.q4.map(v => v.toFixed(1)).join(" > ")} m/s), never backwards, never stopped short and started again`);
  ok(b.jump < 1.6 && en && Math.abs(en.al - E.len) < 0.05 && Math.hypot(en.g[0] - E.x, en.g[2] - E.z) < 0.1, `B: no jump on the way in (largest step in a frame ${b.jump.toFixed(2)} m) and it stops on the end of the run`);
  ok(fr.filter(f => f.m === "brake" || f.m === "seat").every(f => f.rider && !f.fig), "B: braking and stopped, the driver is in the saddle"); }
await judge("B off", fr, false);
{ const sw = fr.filter(f => f.on), i1 = fr.indexOf(sw[sw.length - 1]), after = fr.slice(i1).filter(f => f.m === "off"); let hop = 0; for (let i = 1; i < after.length; i++) hop = Math.max(hop, dist(after[i].fp, after[i - 1].fp));   // (standing, while the swing's pose blends into the gait's)
  const whole = after.length ? dist(after[0].fp, after[after.length - 1].fp) : 9; console.log("B hand-over", JSON.stringify({ frames: after.length, hop: +hop.toFixed(3), whole: +whole.toFixed(3) }));
  const land = K.land ? Math.hypot(K.land.x - A.Q[0], K.land.z - A.Q[1]) : 9;
  ok(K.last && K.last.dir === "off" && K.last.ph === "stand" && K.last.t < A.un.swOff && K.bad === 0, `B off: it finished standing inside its ${A.un.swOff} s (${K.last && K.last.t.toFixed(2)} s)`);
  ok(land < 0.3 && hop < 0.09, `B off: down ${land.toFixed(2)} m from where the walk to the sledge starts, and the gait takes over without a jump (the figure moved ${hop.toFixed(3)} m a frame at most over the hand-over)`); }

// ---- C: back to the sled and on (the carry itself is x6_oilfoot's: skip to the walk back)
await ev(`(() => { const q = TLX.lights.drv(), L = TLX.lights; q.u = (L.unTot(L.unPlan("finnkirka"), q.n) - L.UN.on - L.UN.swOn - L.UN.seg - 0.6) / L.UN.hourS; TLX.state("lights").hT = GS.hour; return true; })()`);
await sledCam(E.side * 2.9, -2.6, 1.5); await sleep(300); await rec(true);
got = await watch((m, st) => st === "back", { on: "x6w_c_on" });
await sleep(4000); fr = await frames();
let S1 = await J(`({ last: TLX.lights.SW.last, bad: TLX.lights.SW.bad || 0, runs: TLX.lights.SW.runs })`);
console.log("C modes", seqOf(fr).join(" > "), JSON.stringify(S1));
ok(got && /toQ,on,seat,ride$/.test(seqOf(fr).join(",")), "C: back to the sled, on, a moment in the saddle, away: " + seqOf(fr).join(" > "));
await judge("C on", fr, true);
ok(S1.last && S1.last.dir === "on" && S1.last.ph === "sit" && S1.last.t < A.un.swOn && S1.bad === 0 && S1.runs === K.runs + 1, `C on: seated inside its ${A.un.swOn} s (${S1.last && S1.last.t.toFixed(2)} s)`);
{ const ride = fr.filter(f => f.st === "back"); ok(ride.length > 5 && ride.every(f => f.rider && !f.fig) && ride[ride.length - 1].al < E.len - 2, "C: then the seated figure rides off down the run"); }
d = await D(); ok(d.st === "back" && (await J(`TLX.lights.rec("finnkirka").store`)) === 120, "C: the drums are in the store when the stop ends");

// ---- D: home, seen coming in
const Q = await J(`(() => { const L = TLX.lights, R = L.route("finnkirka"), u = L.quaySpot(), p = L.posAt(R, 5); let s = 1; if (obNear(p.x + p.tz * 7, p.z - p.tx * 7, 0.8) || isSea(p.x + p.tz * 7, p.z - p.tx * 7)) s = -1; return { x: u.x, z: u.z, yaw: u.yaw, r0: Math.hypot(L.posAt(R, 0).x - u.x, L.posAt(R, 0).z - u.z), ox: p.x + p.tz * 7 * s, oz: p.z - p.tx * 7 * s, ry: Math.atan2(-L.posAt(R, 0).tx, -L.posAt(R, 0).tz) }; })()`);
ok(Q.r0 < 0.05, `D: the run starts on the sled's own place at the quay (${Q.r0.toFixed(3)} m)`);
await stand(Q.ox, Q.oz, Math.atan2(Q.x - Q.ox, Q.z - Q.oz));
await ev(`(() => { const q = TLX.lights.drv(); q.p = q.d - 480; TLX.state("lights").hT = GS.hour; TLX.lights.sled().key = "";   /* (the sled you watch starts afresh from the clock's new place) */ return true; })()`);
await sleep(5000); await sledCam(2.7, 3.1, 1.5); await rec(true);
got = await watch((m, st) => st === "quay" && m === "stand", { off: "x6w_d_off" });
await sleep(900); fr = await frames();
S1 = await J(`(() => { const s = TLX.lights.sled(), S = TLX.lights.SW; return { last: S.last, bad: S.bad || 0, runs: S.runs, obs: s.obs ? s.obs.length : 0, qyaw: s.qyaw, mode: s.mode, fig: s.fig.visible, rider: s.rider.visible, land: S.land }; })()`);
console.log("D modes", seqOf(fr).join(" > "), JSON.stringify(S1));
ok(got && /ride,brake,seat,off,(walk,)?stand$/.test(seqOf(fr).join(",")), "D: riding in, the brake, a moment in the saddle, off, standing by the sled: " + seqOf(fr).join(" > "));
{ const b = brakeOf(fr, f => f.st === "quay" && f.m !== "brake" && f.m !== "ride", f => -f.al), st = fr.filter(f => f.m === "seat")[0], en = fr[fr.length - 1];
  console.log("D brake", JSON.stringify(b));
  ok(b.cruise > 15 && b.cruise < 20 && b.q4[0] > b.q4[1] && b.q4[1] > b.q4[2] && b.q4[2] > b.q4[3] && b.q4[0] > 8 && b.q4[0] < b.cruise + 0.6 && b.q4[3] < 5 && b.backN === 0 && b.stall < 0.2 && b.jump < 1.9, `D: in at ${b.cruise.toFixed(1)} m/s, then slower each quarter of the last ${A.un.brake} s (${b.q4.map(v => v.toFixed(1)).join(" > ")} m/s), no jump (${b.jump.toFixed(2)} m a frame at most), never stopped short`);
  ok(st && Math.hypot(st.g[0] - Q.x, st.g[2] - Q.z) < 0.15 && Math.hypot(en.g[0] - Q.x, en.g[2] - Q.z) < 0.15 && Math.abs(Math.atan2(Math.sin(en.g[3] - st.g[3]), Math.cos(en.g[3] - st.g[3]))) < 0.06 && S1.obs === 2, `D: it stops on its own place at the quay, stays as it came in (no turn on the spot after) and is solid again`); }
await judge("D off", fr, false);
ok(S1.last && S1.last.dir === "off" && S1.last.ph === "stand" && S1.bad === 0 && S1.mode === "stand" && S1.fig && !S1.rider, "D: standing by the sled, nobody in the saddle: " + JSON.stringify([S1.mode, S1.fig, S1.rider]));

// ---- E: leaving the quay
await ev(`(() => { TLX.lights.rec("kinnarodden").oil = 8; TLX.lights.order("kinnarodden"); TLX.lights.order("kinnarodden"); TLX.state("lights").hT = GS.hour; return true; })()`);
await sledCam(2.9, -2.6, 1.5); await rec(true); const r0 = S1.runs;
got = await watch((m, st) => st === "out", { on: "x6w_e_on" }, 1400);
await sleep(1300); fr = await frames();
S1 = await J(`({ last: TLX.lights.SW.last, bad: TLX.lights.SW.bad || 0, runs: TLX.lights.SW.runs })`);
console.log("E modes", seqOf(fr).join(" > "), JSON.stringify(S1));
{ const sq = seqOf(fr).join(","), qf = fr.filter(f => f.st === "quay"), sat = qf.filter(f => f.m === "seat"), out = fr.filter(f => f.st === "out");
  ok(got && /load/.test(sq) && /walk,(stand,)?on,seat,ride$/.test(sq), "E: loading at the sledge, the walk to the saddle, on, seated, away: " + seqOf(fr).join(" > "));
  ok(S1.runs === r0 + 1 && S1.last.dir === "on" && S1.last.ph === "sit" && S1.bad === 0 && sat.length > 2 && sat.every(f => f.rider && !f.fig), `E: in the saddle before the sled pulls out (${sat.length ? (qf[qf.length - 1].t - sat[0].t).toFixed(1) : "?"} game s seated at the quay)`);
  ok(out.length > 5 && out.every(f => f.rider && !f.fig && !f.on) && out[out.length - 1].n === 2, "E: out on the run in the saddle with both drums"); }
await judge("E on", fr.filter(f => f.st === "quay"), true);

// ---- F: a stop first seen part-way through the swing off
h = 0; while (h < 14 && (await D()).st !== "unload") { await pass(0.25); h += 0.25; }
d = await D(); ok(d.st === "unload" && d.lamp === "kinnarodden", "F: unwatched, the driver reached Kinnarodden and is stopped there");
const r1 = (await J(`TLX.lights.SW.runs`));
const E2 = await J(`(() => { const L = TLX.lights, R = L.route("kinnarodden"), un = L.unPlan("kinnarodden"), e = L.posAt(R, R.len), s = un.side; return { ox: e.x + e.tz * s * 6.5 - e.tx * 1.5, oz: e.z - e.tx * s * 6.5 - e.tz * 1.5, x: e.x, z: e.z }; })()`);
await ev(`(() => { const q = TLX.lights.drv(), U = TLX.lights.UN; q.u = (U.brake + U.off + 0.25) / U.hourS; TLX.state("lights").hT = GS.hour; return true; })()`);
await stand(E2.ox, E2.oz, Math.atan2(E2.x - E2.ox, E2.z - E2.oz)); await rec(true);
await sleep(2600); fr = await frames();
const fo = fr.filter(f => f.m === "off");
console.log("F modes", seqOf(fr).join(" > "), "off frames", fo.length);
ok(fo.length > 3 && (await J(`TLX.lights.SW.runs`)) === r1 && fr.every(f => !f.on) && fo.every(f => (f.rider ? 1 : 0) + (f.fig ? 1 : 0) === 1), "F: first seen part-way through getting off: seated, then standing; no swing started from the middle");
await done(fails ? 1 : 0);
