// Slice 6.1a (G4): dust and grit at the depot cabins you own, sweeping and dusting by hand, cleaning kits, caretakers
// who clean (tlx-property.js). Asserts, exit 1 on a failure.
//  A. a new depot starts clean (+3% let); ten game days away -> grit ~60, dust ~40, the occupancy falls (reOcc).
//  B. a caretaker who works cleans it down day by day; let go, it piles up again.
//  C. the Real Estate app shows the depot's floor/shelves and the cleaning-kit row; its button buys a kit ($40, 8 cleans).
//  D. inside your cabin: no kit -> CLEAN (says where to get one); with a kit -> SWEEP; grit decals show on the floor.
//  E. E starts sweeping: a broom in both hands, the walk slowed (held W tops out near 0.45 x the indoor pace), the
//     broom head on the floor ahead; walking the floor sweeps it: grit falls, at 85% the floor is clean, one clean used.
//  F. dusting: face each piece of furniture up close, E wipes it (stand still ~2.6 game s), dust falls piece by piece,
//     all done = clean, one clean used; walking off mid-wipe stops it.
//  G. pad L3 starts a sweep, a touch tap on the use button (STOP) stops it; the touch hint says "tap SWEEP".
//  H. grit/dust/kit survive a reload; a save from before 6.1a starts every cabin clean.
import { boot, reload, ev, tap, down, up, sleep, shot, sideCam, camOff, done, padSet, padOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function until(expr, secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) { if (await ev(expr)) return true; await sleep(80); } return !!(await ev(expr)); }
const R = () => J(`TLX.prop.rec("fjellbu")`);
const pass = (hours, step = 2) => ev(`(() => { for (let t = 0; t < ${hours}; t += ${step}) { GS.hour += ${step}; if (TLX.staff.crewTick) TLX.staff.crewTick(); TLX.prop.step(); } return true; })()`);
const goAway = () => ev(`(() => { const c = reCab("fjellbu"); crashCancel(); FOOT.on = true; FOOT.x = c.x + 400; FOOT.z = c.z + 300; FOOT.y = surf(FOOT.x, FOOT.z); return true; })()`);
const U = () => J(`(() => { const u = footUse(); return { use: u, hint: $("wnHint").textContent, tE: $("tcUse").hidden ? null : $("tcUse").textContent, on: INT.on, cab: INT.on ? INT.cab.id : null, kit: TLX.prop.kit, sw: TLX.prop.SW.on, du: TLX.prop.DU.cur }; })()`);

await boot();
await ev(`tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.hour = 34; GS.cash = 30000; GS.apps.realestate = 1; reBuy("fjellbu"); TLX.state("staff").apps = []; TLX.state("staff").next = 1e9; true`);
await goAway(); await sleep(1300);
await ev(`(() => { TLX.prop.step(); const r = TLX.prop.rec("fjellbu"); r.grit = 0; r.dust = 0; return true; })()`);   // the boot's clock jump to hour 34 is dirt too

// ---- A
let r = await R(); const occ0 = await ev(`reOcc(reCab("fjellbu"))`);
ok(r.grit < 0.5 && r.dust < 0.5 && Math.abs((await ev(`TLX.prop.occ("fjellbu")`)) - 0.03) < 1e-9, `A: a new depot is clean (+3% let; occupancy ${(occ0 * 100).toFixed(0)}%)`);
await pass(240);
r = await R(); const occ1 = await ev(`reOcc(reCab("fjellbu"))`);
ok(Math.abs(r.grit - 60) < 3 && Math.abs(r.dust - 40) < 3, `A: ten days away: grit ${r.grit.toFixed(1)}, dust ${r.dust.toFixed(1)}`);
ok(occ1 < occ0 - 0.07, `A: the dirt costs nights let: ${(occ0 * 100).toFixed(1)}% -> ${(occ1 * 100).toFixed(1)}%`);

// ---- B: a caretaker
const cid = await ev(`(() => { const a = TLX.staff.post({ id: "re:fjellbu", role: "caretaker" }); Object.assign(a, { xp: 8, xpReal: 8, wage: 60 }); a.tr = { honest: true, temper: 0.2, work: 1.2 }; TLX.staff.hire(a.id); return a.id; })()`);
const w = await ev(`TLX.staff.work("fjellbu")`);
await pass(72); r = await R();
ok(w > 0.9 && r.grit < 60 - 15 && r.dust < 40 - 20, `B: a caretaker (work ${w.toFixed(2)}) cleans: 3 days later grit ${r.grit.toFixed(1)}, dust ${r.dust.toFixed(1)}`);
// (work is read in the same call as the day's passing: a Monday falling in that day pays the wages from cash the next frame)
await ev(`TLX.state("staff").owed = 50; true`); const r0 = await R(); const wOwed = await ev(`(() => { for (let t = 0; t < 24; t += 2) { GS.hour += 2; TLX.staff.crewTick(); TLX.prop.step(); } return TLX.staff.work("fjellbu"); })()`); r = await R();
ok(r.grit > r0.grit && wOwed === 0, `B: owed wages, they don't clean (grit ${r0.grit.toFixed(1)} -> ${r.grit.toFixed(1)})`);
await ev(`TLX.state("staff").owed = 0; TLX.state("staff").crew = []; true`);
await ev(`(() => { const r = TLX.prop.rec("fjellbu"); r.grit = 62; r.dust = 44; return true; })()`);

// ---- C: the Real Estate app
await ev(`GS.cash = 30000; TABLET.toggle(true, "realestate"); TABLET.render(); true`); await sleep(400);
let txt = await ev(`$("tabV").textContent`);
ok(/Upkeep/.test(txt) && /Floor gritty · shelves dusty/.test(txt) && /Cleaning kit/.test(txt) && /0 left/.test(txt), "C: the app shows the depot's floor and shelves and the kit row");
await shot("x6c_app");
let k = await J(`(() => { const c0 = GS.cash; document.querySelector("[data-tlxkit]").click(); return { kit: TLX.prop.kit, paid: c0 - GS.cash }; })()`);
ok(k.kit === 8 && k.paid === 40, `C: the kit button buys 8 cleans for $40 (kit ${k.kit}, paid ${k.paid})`);
await ev(`TABLET.toggle(false); TLX.state("prop").kit = 0; true`); await sleep(300);

// ---- D: into the cabin
await ev(`(() => { const b = INT.beacons.find(q => q.cab.id === "fjellbu"); crashCancel(); FOOT.on = true; FOOT.x = b.x; FOOT.z = b.z; FOOT.y = surf(b.x, b.z); FOOT.sp = FOOT.fwd = 0; camState.init = false; return true; })()`);
const inside = await until(`INT.on && INT.cab.id === "fjellbu"`, 6); await sleep(600);
let s = await U(); console.log("D", JSON.stringify(s));
ok(inside && s.use === "CLEAN" && /no cleaning kit \(the Real Estate app sells them\)/.test(s.hint), "D: no kit: CLEAN, the hint says where to get one: " + s.hint);
await ev(`TLX.state("prop").kit = 8; true`); await sleep(400);
s = await U(); const dec = await J(`(() => { const g = INT.room._grit; return g ? { n: g.cells.length, vis: g.im.visible, op: g.mat.opacity } : null; })()`);
ok(s.use === "SWEEP" && /E: sweep the floor · floor gritty, shelves dusty · kit: 8/.test(s.hint), "D: with a kit: SWEEP, hint " + s.hint);
ok(dec && dec.n >= 20 && dec.vis && dec.op > 0.5, `D: grit specks on the floor (${dec && dec.n} cells, opacity ${dec && dec.op.toFixed(2)})`);
await shot("x6d_dirty");

// ---- E: sweep
const spot = await J(`(() => { for (const [x, z] of TLX.prop.freeCells(INT.room)) { INT.px = x; INT.pz = z; FOOT.yaw = 0; const u = TLX.prop.use(); if (u && u.label === "SWEEP") return [x, z]; } return null; })()`);
ok(!!spot, "E: a spot on open floor where the use control reads SWEEP " + JSON.stringify(spot)); await sleep(200);
await tap("KeyE"); await sleep(400);
s = await U(); ok(s.sw && s.use === "STOP", "E: E starts sweeping (use reads STOP)");
// held W: a sweeping pace
await ev(`INT.px = -2.5; INT.pz = 0.3; FOOT.yaw = Math.PI / 2; true`);
await down("KeyW"); const t0 = await clock(); let vmax = 0; while ((await clock()) - t0 < 1.4) { vmax = Math.max(vmax, await ev("FOOT.sp")); await sleep(60); } await up("KeyW");
ok(vmax > 0.6 && vmax < 1.15, `E: held W while sweeping tops out at ${vmax.toFixed(2)} m/s (indoors 2.35)`);
const poseAt = () => J(`(() => { const h = TLX.prop.SW.hands, hd = TLX.prop.SW.head; const ax = h.end.clone().sub(h.top), L = ax.length(); ax.normalize(); const offL = p => { const o = p.clone().sub(h.top); return o.sub(ax.clone().multiplyScalar(o.dot(ax))).length(); }; const dl = Math.max(offL(h.lo), offL(h.hi));
  const along = p => p.clone().sub(h.end).dot(ax.clone().negate());
  const wx = INT.room.g.position.x + INT.px, wz = INT.room.g.position.z + INT.pz; return { dl, hy: hd.y, ahead: Math.hypot(hd.x - wx, hd.z - wz), hiY: h.hi.y, loY: h.lo.y, L, kLo: along(h.lo), kHi: along(h.hi), topY: h.top.y - (INT.py || 0), side: (hd.x - wx) * Math.cos(FOOT.yaw) - (hd.z - wz) * Math.sin(FOOT.yaw) }; })()`);
// a whole stroke and more (0.85 Hz), standing still: the worst of every frame sampled (beta 0186 #1: one frame used to pass or fail by luck)
const P = []; for (let i = 0; i < 28; i++) { P.push(await poseAt()); await sleep(70); }
const mx = k => Math.max(...P.map(p => p[k])), mn = k => Math.min(...P.map(p => p[k]));
const pose = { dl: mx("dl"), ahead: P[0].ahead, L: mx("L"), Lmin: mn("L"), gap: Math.min(...P.map(p => p.kHi - p.kLo)), kHi: mx("kHi"), kLo: mn("kLo"), topY: mx("topY"), swing: mx("side") - mn("side"), hyOff: Math.max(...P.map(p => Math.abs(p.hy - (P[0].hy)))), hy: P[0].hy, up: P.every(p => p.hiY > p.loY) };
console.log("E pose", JSON.stringify(pose));
ok(pose.dl < 0.04 && pose.up && pose.hyOff < 0.02 && mn("ahead") > 0.35 && mx("ahead") < 1.4,
  `E: over a whole stroke both mitts stay on the shaft (worst ${pose.dl.toFixed(3)} m off it), top hand above the low one, the head on the floor ${mn("ahead").toFixed(2)}-${mx("ahead").toFixed(2)} m ahead`);
ok(pose.L - pose.Lmin < 0.005 && pose.L > 1.3 && pose.L < 1.6 && pose.kHi < pose.L - 0.02 && pose.kLo > 0.3 && pose.gap > 0.2 && pose.topY < 1.75,
  `E: the broom is one length, ${pose.Lmin.toFixed(2)}-${pose.L.toFixed(2)} m (a yard broom), hands ${pose.kLo.toFixed(2)}-${pose.kHi.toFixed(2)} m up it and never closer than ${pose.gap.toFixed(2)} m, its top ${pose.topY.toFixed(2)} m off the floor`);
ok(pose.swing > 0.3, `E: the head swings ${pose.swing.toFixed(2)} m side to side`);
await shot("x6e_sweep");
// beta 0186 #2: from behind the body hides the broom, so judge the pose side-on and from the front quarter too
const swT = "[INT.room.g.position.x + INT.px, (INT.py || 0) + 0.9, INT.room.g.position.z + INT.pz]";
await sideCam(swT, 2.0, 0.4); await shot("x6e_side"); await sleep(300); await shot("x6e_side2");
await sideCam(swT, 2.1, 0.5, 0.6); await shot("x6e_front"); await camOff(); await sleep(200);
// walk the floor in rows (the walker set along each row so the broom sees every cell)
const g0 = (await R()).grit;
// rows over the open floor (the free cells), each walked broom-first; never into the way-out ring
await ev(`window.__rows = (() => { const C = TLX.prop.freeCells(INT.room), zs = [...new Set(C.map(c => c[1].toFixed(2)))].sort((a, b) => a - b), out = []; let dir = 1;
  for (const zk of zs) { const row = C.filter(c => c[1].toFixed(2) === zk).sort((a, b) => dir * (a[0] - b[0])); for (const [x, z] of row) for (const dx of [-0.2, 0, 0.2]) out.push([x + dir * dx, z, dir > 0 ? Math.PI / 2 : -Math.PI / 2]); dir = -dir; } return out; })(); window.__ri = 0; true`);
let mid = null;
for (let i = 0; i < 700; i++) {
  const more = await ev(`(() => { const p = window.__rows[window.__ri++]; if (!p || !TLX.prop.SW.on) return false; INT.px = p[0]; INT.pz = p[1]; FOOT.yaw = p[2]; return true; })()`);
  if (!more) break; await sleep(45);
  if (!mid && (await ev(`TLX.prop.SW.got > TLX.prop.SW.n * 0.4`))) { mid = await R(); await shot("x6e_half"); }
}
await sleep(300);
r = await R(); s = await U();
ok(mid && mid.grit < g0 - 15 && mid.grit > 0, `E: grit falls as the floor is swept (${g0.toFixed(0)} -> ${mid && mid.grit.toFixed(0)} part way)`);
ok(r.grit === 0 && !s.sw && s.kit === 7, `E: floor swept clean (grit ${r.grit}), sweeping stops, one clean used (kit ${s.kit})`);
ok(!(await ev(`INT.room._grit.im.visible`)) && (await ev(`INT.slow`)) === 1, "E: the specks are gone, the walk is back to pace");

// ---- F: dust every piece
const pieces = await J(`TLX.prop.piecesOf(INT.room).map(c => TLX.prop.standAt(INT.room, c))`);
console.log("F pieces", pieces.length);
ok(pieces.length >= 3, `F: ${pieces.length} pieces of furniture to dust`);
// walk off mid-wipe
await ev(`(() => { const p = ${JSON.stringify(pieces[0])}; INT.px = p.x; INT.pz = p.z; FOOT.yaw = p.yaw; return true; })()`); await sleep(300);
s = await U(); ok(s.use === "DUST" && /E: dust this/.test(s.hint), "F: facing a piece up close: DUST, " + s.hint);
await tap("KeyE"); await sleep(500);
const hand = await J(`TLX.prop.DU.hand`); ok(!!hand && (await ev(`TLX.prop.DU.cur >= 0 && INT.slow === 0`)), "F: wiping: a cloth in the hand, standing still");
await shot("x6f_dust");
await ev(`(() => { const p = ${JSON.stringify(pieces[0])}; let b = null, bd = -1; for (const [x, z] of TLX.prop.freeCells(INT.room)) { const d = Math.hypot(x - p.x, z - p.z); if (d > bd) { bd = d; b = [x, z]; } } INT.px = b[0]; INT.pz = b[1]; return true; })()`); await sleep(400);
ok((await ev(`TLX.prop.DU.cur`)) === -1 && (await ev(`TLX.prop.DU.done.size`)) === 0, "F: walking off mid-wipe stops it, nothing counted");
const d0 = (await R()).dust; let prev = d0, down1 = true;
for (const p of pieces) {
  await ev(`(() => { const p = ${JSON.stringify(p)}; INT.px = p.x; INT.pz = p.z; FOOT.yaw = p.yaw; return true; })()`); await sleep(250);
  const u = await ev(`footUse()`); if (u !== "DUST") { console.log("  no DUST at", JSON.stringify(p), u); down1 = false; continue; }
  await tap("KeyE"); await until(`TLX.prop.DU.cur < 0`, 5); await sleep(150);
  const now = (await R()).dust; if (!(now < prev || now === 0)) down1 = false; prev = now;
}
r = await R(); s = await U();
ok(down1 && r.dust === 0 && s.kit === 6, `F: every piece dusted one by one (${d0.toFixed(0)} -> ${r.dust}), one clean used (kit ${s.kit})`);
ok(s.use === null, "F: a clean cabin: nothing on the use control (" + s.use + ")");

// ---- G: pad and touch
await ev(`(() => { const r = TLX.prop.rec("fjellbu"); r.grit = 50; INT.px = ${spot[0]}; INT.pz = ${spot[1]}; FOOT.yaw = 0; return true; })()`); await sleep(300);
await padSet({ 10: 1 }); await sleep(350); await padSet({}); await sleep(400);
ok(await ev(`TLX.prop.SW.on`), "G: Xbox L3 starts sweeping");
await padOff(); await sleep(200);
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(600);
s = await U(); ok(s.tE === "STOP", "G: touch: the use button reads STOP while sweeping (" + s.tE + ")");
await ev(`(() => { const b = $("tcUse"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return true; })()`);
await sleep(500); s = await U();
ok(!s.sw && s.tE === "SWEEP" && /tap SWEEP/.test(s.hint), "G: tapping STOP stops it; the button reads SWEEP, hint " + s.hint);
await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`); await sleep(200);

// ---- H: saved
await ev(`(() => { const r = TLX.prop.rec("fjellbu"); r.grit = 33; r.dust = 21; TLX.state("prop").kit = 5; save(); return true; })()`);
await reload(); await sleep(600);
r = await R(); k = await ev(`TLX.prop.kit`);
ok(Math.abs(r.grit - 33) < 0.5 && Math.abs(r.dust - 21) < 0.5 && k === 5, `H: grit ${r.grit.toFixed(1)}, dust ${r.dust.toFixed(1)}, kit ${k} survive a reload`);
const old = await J(`(() => { const s = JSON.parse(localStorage.getItem("tracklayer.save.v2")); delete s.x.sys.prop; return s; })()`);
await reload(old); await sleep(600);
r = await R(); k = await ev(`TLX.prop.kit`);
ok(r.grit < 0.5 && r.dust < 0.5 && k === 0 && (await ev(`GS.re.own.fjellbu ? 1 : 0`)) === 1, "H: a save from before 6.1a: the cabin starts clean, no kit");
await done(fails ? 1 : 0);
