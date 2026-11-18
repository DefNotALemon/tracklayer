// Tracklayer expansion — plowing (milestone 4, loop/EXPANSION.md). Slices 4.1a1 (the blade on the Fjellvogn) and
// 4.1a2 (the road credit: a snowed-in road stretch you plow both sides of is open).
//
// WHAT THE PLAYER GETS. The garage has a Plow tab: the Fjellskjær 2.3, a 2.3 m angled blade, fits a pickup you own
// that stands within 60 m of the garage ($1,450 once; taking it off puts it in the shed and refitting is free). In a
// bladed truck the use control (E / L3 / the touch pill, which reads BLADE DOWN or BLADE UP) drops and lifts it, so the
// horn is gone from that control in a bladed truck (a bladeless truck keeps it). With the blade down and the truck
// rolling forward it cuts the snow in front of the bumper down to the level of a plowed yard, two metres wide, and
// throws what it took off into a windrow along the right-hand side, as the council's truck does. The wheels follow in
// the cut, so the pickup no longer sinks: what limits it now is the push on the blade, which grows with the depth of
// the snow, the square of the speed and what is heaped on the blade. Thirty centimetres is steady work, sixty a crawl,
// and a drift over the top of the blade stops it with a line that says so. The riding hint tells you when to drop it
// and, while it is down, the speed and the depth it is cutting.
//
// HOW. The cut and the windrow are snow cells (api.world.bladeSnow / heapSnow, tracklayer.js beside pressSnow): a
// windrow is snow standing deeper than the snowpack. Cells are not saved and snowfall eases them back, so a cut off
// the road is gone after a reload: what must last is a road stretch (4.1a2, the road credit) or a contract's own lane
// (4.2). The push goes into the truck's physics through TLXV.addLoad (kg, pin, drag, why), the control through
// TLXV.addUse, the model onto each truck's group through TLXV.onModel. tlx-vehicles.js knows nothing else about it.
//
// THE ROAD CREDIT (4.1a2). The roads keep their snow per 400 m stretch (tlx-roads.js). While the blade is down and the
// truck rolls forward within the road's half-width of a road's line, the 10 m length of the stretch under the blade's
// middle is marked for the SIDE of the centre line the blade's middle is on. A stretch with 80% of its lengths marked
// on BOTH sides is plowed for good (TLXR.plowSeg: its snow to 0 across the whole width, the scraped hour stamped, the
// Map repainted) with a line that names the road. So the 2 m blade opens a stretch by going out on one side and coming
// back on the other; twice along the same side does not, and the hint says how much of each side is done. The marks
// are not saved, and are dropped when the stretch is opened (by you or the council's plow) or new snow falls on it.
//
// SAVED: x.sys.plow = { blades: { truckUid: { id, cond, throw } }, shed: [bladeId...], shedC: [the edge of each blade in
// the shed], m: metres cut in all, opened: road stretches opened }. Up/down is not saved: a reload finds the blade up. A blade whose truck is gone (sold, an old
// save) moves to the shed.
//
// THE THROW AND THE BACK-DRAG (4.1b1). With the blade down, HOLDING the use control half a second slews it: throw
// right -> throw left -> square -> right (a tap still lifts it: the press is decided when the control is let go or the
// half second is up, api.useHeld). Slewed, the windrow goes off the trailing end, right or left. Square, nothing is
// thrown: the snow rides on the blade (twice what a slewed blade holds, the rest spilling off both ends) and is
// stacked in a heap where you lift it or stop, which is how a yard is cleared. Reversing with it down back-drags:
// the blade's back takes the top of the snow (down to BL.backLeave of the pack) and pulls up to a bladeful with the
// truck, leaving it as a heap under the blade when you stop, lift or drive forward again: the way to get snow away
// from a door or a wall you cannot push toward. The throw side is saved with the blade (blades[uid].throw: r, l, s).
//
// THE CUTTING EDGE WEARS (4.1b2a). blades[uid].cond is the cutting edge, 100 new. Every BL.wearM metres it cuts (forward
// or back-dragging; rolling with nothing to cut costs nothing) takes a point off. Under BL.ragged (30) the cut is ragged:
// it leaves BL.raggedLeave (0.3) of the snowpack, twice a good edge's, with one line when it gets there and a note in the
// hint from then on. The garage's Plow tab mends it at BL.mend dollars a point (as many points as your cash covers), the
// truck within 60 m as for fitting. A blade in the shed keeps its edge (shedC, beside shed).
//
// THE BLADE IS SOLID, TRIPS AND IS HEARD (4.1b2b). Fitted, the blade is one more circle of the truck's hull (TLXV.addHull).
// Option plowtrip (on): blade down at over BL.tripV, a rock, a log or a parked car trips it (the block comment at HX).
// A scrape on the game's audio by speed and by how much snow is under the edge, a clunk when it lands and when it comes
// up, sparks off the cutting edge on a scraped road stretch (TLXR.scrapeF). Nothing of this is saved but the edge.
// USED BLADES (4.1b3a). Bytteboden lists a used blade under Vehicles (the block comment at MKB): collected at the
// seller's door in a truck it fits, bolted on there or sent to the shed, its condition the cutting edge.
// THE PLOW TRUCK'S BLADE (4.1c1). The Nordtrekk Brøyt 4x2 (a VEHICLES row in tlx-vehicles.js) comes with BLADES row b35,
// `factory`: tidy() gives every such truck its blade, it never comes off or goes to the shed, and the Plow tab only mends
// it. Everything else is the same code with the row's numbers: 3.5 m, clearing 3.1 m (so one pass marks both sides of a
// road stretch: BL.both), a taller mouldboard, a higher windrow, a bigger bladeful, drawn larger on the truck's own front.
// THE GRITTER (4.1c2). The plow truck's body is a gritter: a 3 t hopper (BLADES row b35, `hop`), filled at the garage's
// Plow tab by the kilo, empty on a new truck. HOLDING the use control with the blade UP starts and stops the spinner (a
// tap still drops the blade, now when the control is let go; with the blade down the hold slews it as before). While it
// runs and the truck rolls it lays GRT.rate kg a metre behind the truck; on a road stretch the 10 m length under the
// spinner is stamped with the game hour. A gritted length grips GRT.mu times better under the tyres of any truck you
// drive (TLXV.addGrip) for GRT.hours game hours, fading over the last of them, and new snow on the stretch buries it.
// Grit on a stretch under deep snow does not bite unless the blade is cutting ahead of it. What is in the hopper rides
// on the truck (its mass and its tyres' load). Saved: blades[uid].hop (kg), grit: { "routeId:stretch": { h: [the game
// hour each 10 m length was last gritted, 0 = never], s0: the stretch's snow level then } }, gritKg (spread in all).
// The spinner running is not saved: a reload finds it off.
// NOT YET: door counting (4.1b3b), a used plow truck (4.1c3), pay (4.2).
(() => {
"use strict";
/* ---------------- tunables ---------------- */
const BLADES = [
  // w, h: the mouldboard, m. ang: how far it is slewed (rad; 28 degrees: it clears w x cos = 2.03 m, the pickup is 1.96).
  // z: its middle, m ahead of the truck's centre. leave: what it leaves standing, as a share of the snowpack (the yard level).
  { id: "b23", name: "Fjellskjær 2.3", fits: ["pickup"], cost: 1450, kg: 280, w: 2.3, h: 0.65, ang: 0.49, z: 3.25, leave: 0.15 },
  // 4.1c1, the plow truck's own. factory: it comes with the truck, never comes off, is never sold apart. rows / carry / whyN:
  // its windrow (it throws three times the snow, so the rows stand higher and there is one more), the m3 it holds slewed
  // (twice that square), the push from which "stuck" is its doing. mz: the truck's front, where the push frame is bolted.
  { id: "b35", name: "Brøytskjær 3.5", fits: ["plowtruck"], factory: true, cost: 0, kg: 900, w: 3.5, h: 1.15, ang: 0.49, z: 4.5, leave: 0.15,
    rows: [1.15, 0.95, 0.65, 0.4], carry: 3, whyN: 32000, mz: 3.24, hop: 3000 }   // hop: kg of grit its truck's hopper holds (4.1c2)
];
// the gritter (4.1c2)
const GRT = {
  rate: 0.4,       // kg laid per metre rolled (a full 3 t hopper: 7.5 km of road)
  minV: 1,         // m/s: the spinner is driven off the road wheels, slower than this nothing comes out
  back: 3.4,       // m behind the truck's centre the grit lands
  bin: 10,         // m: a road stretch is gritted in lengths this long
  mu: 1.35,        // the tyres' grip on a freshly gritted length (hard pack 0.42 -> 0.57)
  hours: 10,       // game hours a gritted length lasts
  fade: 0.6,       // it is at full strength for this share of them, then fades out
  bury: [0.03, 0.1],   // new snow on the stretch (its level up by this much since) fades the grit out: buried
  deep: 0.3,       // a stretch's snow level over which grit does not bite, unless the blade is cutting in front of it
  price: 0.05,     // $ a kg at the garage ($50 a tonne, $150 the hopper)
  spin: 16         // rad/s the disc turns
};
const BL = {
  face: 2600,      // N per m2 of snow face (depth cut x width cleared), standing
  v2: 0.15,        // the face term grows by 1 + v2 x v^2: the snow has to be thrown, not just pushed
  over: 9000,      // N per m2 of face ABOVE the mouldboard's top: it spills back over the blade onto the truck
  carryN: 900,     // N per m3 riding on the blade
  carryMax: 1.2,   // m3 the blade holds before it spills ahead
  scrape: 150,     // N, the cutting edge on the ground
  backN: 300,      // N reversing with it down
  rowW: 0.8,       // m, the width of one row of the windrow
  rows: [0.8, 0.6, 0.35],   // m each row may stand over the snowpack, nearest first: what one can't take rolls out to the next, so it slopes away
  rowMax: 0.8,     // m a pile dropped in front may stand over the snowpack
  garage: 60,      // m from the garage to fit or take off
  lift: 0.3,       // m the blade rides up
  liftT: 0.5,      // s to drop or lift
  sunk: 0.1,       // m the wheels sink, on average, from which a standing truck is told to start from cleared ground
  hintMin: 0.08,   // m of snow ahead, over what the blade would leave, before the hint suggests dropping it (not on a plowed street)
  whyN: 6000,      // N on the blade from which "stuck" is the blade's doing
  // the road credit (4.1a2)
  bin: 10,         // m: a road stretch is counted in lengths this long, per side of its centre line
  credit: 0.8,     // the share of a stretch's lengths, on each side, that opens it
  both: 3,         // m: a blade clearing this much or more marks both sides in one pass (the plow truck's, 4.1c)
  rise: 0.1,       // new snow on a stretch (its level up by this much since the marks began) wipes the marks
  // the throw and the back-drag (4.1b1)
  holdT: 0.5,      // s (wall clock) the use control is held, blade down, to slew it; let go sooner and it lifts
  slewT: 0.7,      // s to swing from one throw to the next
  carrySq: 2.4,    // m3 a square blade holds (nothing slides off it) before it spills off both ends
  stackR: 0.9,     // m, the radius of the heap a square blade leaves where it is lifted
  stackMax: 1.2,   // m that heap may stand over the snowpack
  backLeave: 0.49, // what back-dragging leaves, as a share of the snowpack: it takes 60% of what a forward cut takes
  backFace: 0.5,   // the share of the face term a back-drag costs: it rides over as much as it pulls
  // the cutting edge (4.1b2a)
  wearM: 250,      // m of cutting that take one point off the edge (a 400 m road stretch, both sides: about 3 points)
  ragged: 30,      // under this the cut is ragged
  raggedLeave: 0.3,// what a ragged edge leaves, as a share of the snowpack (a good edge: the blade's own leave, 0.15)
  mend: 6,         // $ a point at the garage (a wholly worn edge: $600, against $1,450 for the blade)
  // the solid blade, its trip and its sound (4.1b2b)
  tripV: 4,        // m/s: faster than this with the blade down, a rock, a log or a parked car trips it (option plowtrip)
  tripKeep: 0.6,   // the share of its speed the truck keeps through a trip (the springs take the rest)
  tripPts: [2, 0.75, 8],   // points off the cutting edge: 2, + 0.75 per m/s over tripV, 8 at most
  tripT: 0.45,     // s clear of the thing before the mouldboard springs back
  tripA: 0.6,      // rad the mouldboard folds forward while tripped
  sndG: 0.16,      // the scrape's gain at its loudest
  sparkN: 5        // sparks per metre the blade travels on a fully scraped road stretch
};
const SND = { g: 0, f: 0, v: null, dog: 0 };                                  // the scrape this frame (gain, Hz) and its voice
const tripKind = o => (o.rock ? "a rock" : o.log ? "a log" : o.car !== undefined ? "a parked car" : "");   // what the cutting edge catches on; walls, trees and posts meet the whole blade
const pct = c => (c < BL.ragged ? Math.floor(c) : Math.round(c));              // beta 0227 #1: 29.6 never reads "30%" beside "worn ragged"
const THROWS = { r: { next: "l", sign: 1, now: "", to: "throw right", said: "The blade is slewed to throw right." },
  l: { next: "s", sign: -1, now: "throwing left", to: "throw left", said: "The blade is slewed to throw left." },
  s: { next: "r", sign: 0, now: "square: it carries", to: "square it", said: "The blade is square. It carries the snow and stacks it where you lift it or stop." } };
const byId = id => BLADES.find(b => b.id === id) || null;
let api = null, T = null;
const S = () => TLX.state("plow");
const RTB = new Map();                                                        // truck uid -> { down, k (0 up .. 1 down), carry, last, drag, cut, depth, full, grp, B, lens }
const rt = uid => { uid = String(uid); let r = RTB.get(uid); if (!r) RTB.set(uid, r = { down: false, k: 0, carry: 0, last: null, drag: 0, cut: 0, depth: 0, full: false, stopT: 0, volCut: 0, volLaid: 0 }); return r; };
const bladeOf = uid => { const s = S(), b = s && s.blades[uid]; return b ? byId(b.id) : null; };
const throwOf = uid => { const s = S(), b = s && s.blades[uid]; return b && THROWS[b.throw] ? b.throw : "r"; };
const condOf = uid => { const s = S(), b = s && s.blades[uid]; return b && Number.isFinite(b.cond) ? Math.max(0, Math.min(100, b.cond)) : 100; };
const leaveOf = (uid, d) => (condOf(uid) < BL.ragged ? Math.max(d.leave, BL.raggedLeave) : d.leave);   // a ragged edge leaves twice the snow
const angOf = (d, th) => d.ang * THROWS[th].sign;                              // the slew, rad: + throws right (the left end leads), - throws left, 0 square
const sideOf = a => (a > 0.12 ? -1 : a < -0.12 ? 1 : 0);                       // where the windrow goes, as a sign of local x (+ = the truck's left); 0 = nowhere, it rides
const trucks = () => (window.TLXV ? TLXV.state().owned : []).filter(r => !TLXV.kinds[r.id]);
const curUid = () => (window.TLXV ? TLXV.state().cur : null);
const hopOf = uid => { const s = S(), b = s && s.blades[uid]; return b && Number.isFinite(b.hop) ? Math.max(0, b.hop) : 0; };
const tons = kg => (kg >= 995 ? (kg / 1000).toFixed(1) + " t" : Math.round(kg) + " kg");

/* ---------------- the save's housekeeping ---------------- */
function tidy() {
  const s = S(); if (!s) return;
  if (!s.blades || typeof s.blades !== "object" || Array.isArray(s.blades)) s.blades = {};
  if (!Array.isArray(s.shed)) s.shed = [];
  if (!Number.isFinite(s.m)) s.m = 0;
  if (!Number.isFinite(s.opened)) s.opened = 0;
  if (!Array.isArray(s.shedC)) s.shedC = [];
  if (!s.grit || typeof s.grit !== "object" || Array.isArray(s.grit)) s.grit = {};
  if (!Number.isFinite(s.gritKg)) s.gritKg = 0;
  for (const k of Object.keys(s.grit)) { const g = s.grit[k]; if (!g || !Array.isArray(g.h) || !Number.isFinite(g.s0) || !g.h.some(h => h > 0 && api.GS.hour - h < GRT.hours)) delete s.grit[k]; }   // worn off: forgotten
  { const ids = [], cs = []; s.shed.forEach((id, i) => { const d0 = byId(id); if (!d0 || d0.factory) return; const c = s.shedC[i]; ids.push(id); cs.push(Number.isFinite(c) ? Math.max(0, Math.min(100, c)) : 100); }); s.shed = ids; s.shedC = cs; }
  const own = trucks();
  for (const uid of Object.keys(s.blades)) {
    const b = s.blades[uid], d = b && byId(b.id), r = own.find(q => String(q.uid) === uid);
    if (!d) { delete s.blades[uid]; continue; }
    if (!r || !d.fits.includes(r.id)) { delete s.blades[uid]; if (!d.factory) { s.shed.push(d.id); s.shedC.push(Number.isFinite(b.cond) ? b.cond : 100); } drop(uid); continue; }   // the truck is gone: the blade is in the shed (a factory blade went with its truck)
    if (!Number.isFinite(b.cond)) b.cond = 100;
    b.cond = Math.max(0, Math.min(100, b.cond));
    if (!THROWS[b.throw]) b.throw = "r";
    if (d.hop) b.hop = Number.isFinite(b.hop) ? Math.max(0, Math.min(d.hop, b.hop)) : 0; else delete b.hop;
  }
  for (const r of own) {                                                         // 4.1c1: a truck that comes with a blade has it
    const fd = BLADES.find(d => d.factory && d.fits.includes(r.id)); if (!fd) continue;
    const b = s.blades[r.uid]; if (!b || b.id !== fd.id) { s.blades[r.uid] = { id: fd.id, cond: 100, throw: "r" }; if (fd.hop) s.blades[r.uid].hop = 0; }
  }
  NT = own.length;
}
let NT = -1;                                                                     // trucks owned when tidy last ran: a truck bought since gets its factory blade next frame
function drop(uid) { uid = String(uid); const r = RTB.get(uid); if (r && r.grp && r.grp.parent) r.grp.parent.remove(r.grp); RTB.delete(uid); }

/* ---------------- fitting it: the garage's Plow tab ---------------- */
function truckPos(r) { return curUid() === r.uid ? api.P : r; }
function near(r) { const g = api.world.garage(), p = truckPos(r); return Math.hypot(p.x - g.x, p.z - g.z) <= BL.garage; }
function fit(uid, id) {
  const s = S(), d = byId(id), r = trucks().find(q => q.uid === uid), GS = api.GS;
  if (!d || d.factory || !r || !d.fits.includes(r.id) || s.blades[uid]) return false;
  if (!near(r)) { api.toast(`Bring the truck within ${BL.garage} m of the garage to fit a blade.`, "warn"); return false; }
  if (!Array.isArray(s.shedC)) s.shedC = [];
  const i = s.shed.indexOf(id); let cond = 100;
  if (i >= 0) { s.shed.splice(i, 1); const c = s.shedC.splice(i, 1)[0]; if (Number.isFinite(c)) cond = c; }
  else { if (GS.cash < d.cost) { api.toast(`The ${d.name} is ${api.fmtCash(d.cost)}. You have ${api.fmtCash(GS.cash)}.`, "warn"); return false; } GS.cash -= d.cost; }
  s.blades[uid] = { id, cond, throw: "r" };
  const R = TLXV.runtimeOf(uid); if (R) model(R);
  api.toast(i >= 0 ? `The ${d.name} is back on the truck.` : `The ${d.name} is fitted. ${useLine()}`, "good");
  api.save(); api.garageRefresh(); return true;
}
function unfit(uid) {
  const s = S(), b = s.blades[uid], r = trucks().find(q => q.uid === uid);
  if (!b) return false;
  if ((byId(b.id) || {}).factory) { api.toast(`The ${byId(b.id).name} is part of the truck: it does not come off.`, "warn"); return false; }
  if (r && !near(r)) { api.toast(`Bring the truck within ${BL.garage} m of the garage to take the blade off.`, "warn"); return false; }
  const B = RTB.get(String(uid)); if (B && B.carry > 0) spill(B, uid);
  if (!Array.isArray(s.shedC)) s.shedC = [];
  while (s.shedC.length < s.shed.length) s.shedC.push(100);
  delete s.blades[uid]; s.shed.push(b.id); s.shedC.push(Number.isFinite(b.cond) ? b.cond : 100); drop(uid);
  api.toast(`The ${byId(b.id).name} is off the truck and in the garage's shed. Fitting it again costs nothing.`);
  api.save(); api.garageRefresh(); return true;
}
/* the cutting edge: worn by the metres it cuts, mended at the garage by the point */
function dull(uid, pts) {                                                        // points off the edge, with the one line when it goes ragged
  const s = S(), b = s && s.blades[uid]; if (!b || !(pts > 0)) return;
  const c0 = Number.isFinite(b.cond) ? b.cond : 100; b.cond = Math.max(0, c0 - pts);
  if (c0 >= BL.ragged && b.cond < BL.ragged) { api.toast("The blade's cutting edge is worn ragged: it leaves twice the snow behind it. The garage's Plow tab mends it.", "warn"); api.save(); }
}
function wear(uid, m) { if (m > 0) dull(uid, m / BL.wearM); }
function mendCost(uid) { return Math.floor(100 - condOf(uid)) * BL.mend; }      // whole points only
function mend(uid) {
  const s = S(), b = s.blades[uid], r = trucks().find(q => q.uid === uid), GS = api.GS; if (!b || !r) return false;
  const want = Math.floor(100 - b.cond); if (want < 1) return false;
  if (!near(r)) { api.toast(`Bring the truck within ${BL.garage} m of the garage to have the cutting edge mended.`, "warn"); return false; }
  const pts = Math.min(want, Math.floor(GS.cash / BL.mend));
  if (pts < 1) { api.toast(`Mending the cutting edge is ${api.fmtCash(BL.mend)} a point. You have ${api.fmtCash(GS.cash)}.`, "warn"); return false; }
  GS.cash -= pts * BL.mend; b.cond = pts === want ? 100 : b.cond + pts;
  api.toast(pts === want ? `The ${byId(b.id).name} has a new cutting edge (${api.fmtCash(pts * BL.mend)}).` : `${api.fmtCash(pts * BL.mend)} of work on the cutting edge: it is at ${Math.round(b.cond)}%. The rest is ${api.fmtCash((want - pts) * BL.mend)}.`, "good");
  api.save(); api.garageRefresh(); return true;
}
/* the hopper: grit by the kilo at the garage, as much as the hopper takes and your cash covers */
function fill(uid) {
  const s = S(), b = s.blades[uid], d = b && byId(b.id), r = trucks().find(q => q.uid === uid), GS = api.GS; if (!b || !d || !d.hop || !r) return false;
  const want = Math.floor(d.hop - hopOf(uid)); if (want < 1) return false;
  if (!near(r)) { api.toast(`Bring the truck within ${BL.garage} m of the garage to fill its hopper.`, "warn"); return false; }
  const kg = Math.min(want, Math.floor(GS.cash / GRT.price + 1e-6));
  if (kg < 20) { api.toast(`Grit is ${api.fmtCash(GRT.price * 1000)} a tonne. You have ${api.fmtCash(GS.cash)}.`, "warn"); return false; }
  const cost = Math.ceil(kg * GRT.price - 1e-6); GS.cash -= cost; b.hop = hopOf(uid) + kg; if (d.hop - b.hop < 1) b.hop = d.hop;
  api.toast(kg === want ? `The hopper is full: ${tons(b.hop)} of grit (${api.fmtCash(cost)}). ${gritLine()}` : `${api.fmtCash(cost)} of grit: the hopper holds ${tons(b.hop)} of its ${tons(d.hop)}.`, "good");
  api.save(); api.garageRefresh(); return true;
}
function gritLine() { return INPdev() === "touch" ? "In the truck with the blade up, hold the BLADE DOWN button to start and stop the gritter." : `In the truck with the blade up, hold ${api.btn("use")} to start and stop the gritter.`; }
function garageRows(body, row) {
  tidy();
  const s = S(), GS = api.GS, own = trucks(), V = TLXV.VEHICLES;
  const foot = t => { const e = document.createElement("div"); e.className = "bfoot"; e.textContent = t; body.appendChild(e); };
  for (const d of BLADES) {
    const can = own.filter(r => d.fits.includes(r.id)), inShed = s.shed.filter(id => id === d.id).length;
    const spec = `${d.w.toFixed(1)} m steel mouldboard that slews to throw right or left, or square to carry · clears ${(d.w * Math.cos(d.ang)).toFixed(1)} m · ${d.kg} kg on the nose · fits the ${d.fits.map(id => (V.find(v => v.id === id) || {}).name || id).join(", ")}`;
    const how = `${useLine()} Down and rolling forward it cuts the snow to a plowed yard's level and throws it into a windrow on the side it is slewed to; square, it carries the snow and stacks it where you lift. Reversing with it down drags snow back with you, away from a door. The deeper the snow and the faster you go, the harder it pushes back: a drift over the blade's top stops the truck, so take it in bites.`;
    if (d.factory && !can.length) continue;                                       // a blade that comes with a truck: nothing to offer without the truck
    if (!can.length) { row(d.name, `${spec}\n<span style="color:#9fd8a8">${how}</span>\n<span style="color:#f0c674">It goes on a pickup. Buy one on the Trucks tab first.</span>`, "$" + d.cost, "locked", () => { }, "plow"); continue; }
    can.forEach((r, i) => {
      const tn = (V.find(v => v.id === r.id) || {}).name + (can.length > 1 ? " no. " + (i + 1) : ""), here = near(r), has = s.blades[r.uid];
      const away = here ? "" : `\n<span style="color:#f0c674">The ${tn} stands ${Math.round(Math.hypot(truckPos(r).x - api.world.garage().x, truckPos(r).z - api.world.garage().z))} m from the garage. Bring it within ${BL.garage} m.</span>`;
      if (has) {
        const cond = condOf(r.uid), cost = mendCost(r.uid), edge = `Cutting edge ${pct(cond)}%${cond < BL.ragged ? ": worn ragged, it leaves twice the snow" : ""}.`;
        if (d.factory) row(`The ${d.name} on the ${tn}`, `${spec}\n<span style="color:#9fd8a8">${how}</span>\nIt came with the truck and stays on it. One pass with it opens a snowed-in road stretch: it is wide enough to count for both sides. ${edge}`, "Fitted", "locked", () => { }, "plow");
        else row(`Take the ${d.name} off the ${tn}`, `It goes into the garage's shed and fitting it again costs nothing. The truck gets its horn back on the use control and ${d.kg} kg off its nose. ${edge}${away}`, "To the shed", here ? "" : "locked", () => unfit(r.uid), "plow");
        if (d.hop) {
          const hop = hopOf(r.uid), want = Math.floor(d.hop - hop), fc = Math.ceil(want * GRT.price - 1e-6);
          row(`Fill the ${tn}'s hopper with grit`, `The hopper holds ${tons(hop)} of its ${tons(d.hop)}. ${gritLine()} It spreads while the truck rolls, about ${Math.round(GRT.rate * 100)} kg every 100 m, so a full hopper does ${(d.hop / GRT.rate / 1000).toFixed(1)} km of road.\n<span style="color:#9fd8a8">A gritted road grips about a third better under a truck's tyres, yours or the lorry's: shorter stops, steeper starts. It lasts about ${GRT.hours} hours, or until new snow buries it.</span>\nWhat is in the hopper rides on the truck: a full one is ${tons(d.hop)} more to pull and to stop. Grit is $${Math.round(GRT.price * 1000)} a tonne${want >= 1 && GS.cash < fc && GS.cash >= 1 ? `: your ${api.fmtCash(GS.cash)} buys ${tons(Math.floor(GS.cash / GRT.price))}` : ""}.${away}`, want < 1 ? "Full" : "$" + fc, !here || want < 1 || GS.cash < 1 ? "locked" : "", () => fill(r.uid), "plow");
        }
        if (cost > 0) row(`Mend the cutting edge of the ${tn}'s blade`, `${edge} It wears with every metre it cuts (a point about every ${BL.wearM} m); under ${BL.ragged}% the cut is ragged. A new edge is $${BL.mend} a point${GS.cash < cost && GS.cash >= BL.mend ? `: your ${api.fmtCash(GS.cash)} buys ${Math.floor(GS.cash / BL.mend)} of the ${cost / BL.mend} points` : ""}.${away}`, "$" + cost, !here || GS.cash < BL.mend ? "locked" : "", () => mend(r.uid), "plow");
      }
      else row(`Fit the ${d.name} to the ${tn}`, `${spec}\n<span style="color:#9fd8a8">${how}</span>${inShed ? "\nYours already: it is in the shed" + (s.shedC && s.shedC[s.shed.indexOf(d.id)] < 99.5 ? ", its cutting edge at " + Math.round(s.shedC[s.shed.indexOf(d.id)]) + "%." : ".") : ""}${away}`, inShed ? "Yours · free" : "$" + d.cost, !here || (!inShed && GS.cash < d.cost) ? "locked" : "", () => fit(r.uid, d.id), "plow");
    });
  }
  foot((s.m >= 50 ? `Snow cut with a blade so far: ${s.m >= 1000 ? (s.m / 1000).toFixed(1) + " km" : Math.round(s.m) + " m"}. ` : "A blade clears snow where you drive it. ") + "A cut off the road snows in again. A snowed-in road is open once you have plowed both sides of it: out on one side, back on the other." + (s.opened > 0 ? ` Road stretches you have opened: ${s.opened}.` : "") + (s.gritKg >= 50 ? ` Grit you have spread: ${tons(s.gritKg)}.` : "") + (own.some(r => BLADES.some(d => d.fits.includes(r.id))) ? " Used blades turn up on Bytteboden, under Vehicles." : ""));
}

/* ---------------- used blades on Bytteboden (4.1b3a) ---------------- */
// A used blade is a listing in Bytteboden's Vehicles category (TLXV.addMkt: tlx-vehicles.js hands every question about
// an item called "blade:<id>" to MKB). One is listed while you own a truck it fits and fewer blades (fitted, in the shed
// or paid for) than such trucks, and have made USED.need deliveries. The listing's condition IS the cutting edge (0.72 =
// 72%), so a lemon is a blade sold with a better edge than it has; what a point of edge costs to mend is on the listing's
// card, which makes the sum against a new one easy. You collect it at the seller's door IN a truck it fits (280 kg does
// not ride on a sled): bolted on there if that truck has no blade, else it goes in the bed and into the garage's shed.
const USED = { need: 6, w: 0.7, pre: "blade:" };
const usedId = item => (typeof item === "string" && item.startsWith(USED.pre) ? byId(item.slice(USED.pre.length)) : null);
const edgeOf = c => Math.max(1, Math.min(100, Math.round((Number.isFinite(c) ? c : 1) * 100)));
const fitsCur = d => { const u = curUid(), r = u == null ? null : trucks().find(q => q.uid === u); return r && d.fits.includes(r.id) ? r : null; };
const truckName = id => ((window.TLXV ? TLXV.VEHICLES : []).find(v => v.id === id) || {}).name || id;
const MKB = {
  owns: item => !!usedId(item),
  pool(held) {
    const s = S(), out = []; if (!s || api.GS.delivered < USED.need) return out;
    for (const d of BLADES) {
      if (d.factory) continue;                                                     // a blade that comes with its truck is not sold apart (4.1c)
      const can = trucks().filter(r => d.fits.includes(r.id)).length; if (!can) continue;
      const have = Object.keys(s.blades || {}).filter(u => s.blades[u] && s.blades[u].id === d.id).length + (s.shed || []).filter(id => id === d.id).length + (held || []).filter(h => h.cat === "veh" && h.item === USED.pre + d.id).length;
      if (have < can) out.push({ item: USED.pre + d.id, w: USED.w });
    }
    return out;
  },
  info(item, c) {
    const d = usedId(item), e = edgeOf(c);
    return { name: d.name + " plow blade", newP: d.cost, kind: "blade",
      stat: `${d.w.toFixed(1)} m · fits the ${d.fits.map(truckName).join(", ")} · cutting edge ${e}%${e < BL.ragged ? ": a ragged cut" : ""} · a new edge is $${Math.floor(100 - e) * BL.mend} at the garage` };
  },
  why: () => ["Sold the pickup and kept the blade. It's no use leaning on the shed.", "The council plows our road now, right to the gate.", "Bought a tractor with a snow blower. This just rusts.",
    "We moved down into the village. The lane is somebody else's job now.", "Dad plowed half of Lebesby with it. He's stopped driving."],
  tell: () => ["The cutting edge is worn right down to the bolt heads.", "The edge has been ground back so often there's hardly any steel left under the mouldboard.", "Somebody caught a rock at speed: the cutting edge is chewed up along half its length."],
  howTo: (h, place) => `It leans on ${h.seller}'s shed in ${place}. It weighs ${(usedId(h.item) || {}).kg || 280} kg, so come in a pickup: ${h.seller} helps you bolt it on if the truck has no blade, and if it has one this goes in the bed and into the garage's shed.`,
  blocked(h) { const d = usedId(h.item); if (!d) return ""; return fitsCur(d) ? "" : `It weighs ${d.kg} kg and bolts to a truck's frame: come in the ${d.fits.map(truckName).join(" or the ")}.`; },
  payWhy: () => "",
  collect(h) {
    const s = S(), d = usedId(h.item), r = d && fitsCur(d); if (!s || !r) return "";
    const e = edgeOf(h.cond), rag = e < BL.ragged ? ` Under ${BL.ragged}% it cuts ragged: the garage mends it at $${BL.mend} a point.` : "";
    if (!Array.isArray(s.shedC)) s.shedC = []; while (s.shedC.length < s.shed.length) s.shedC.push(100);
    if (!s.blades[r.uid]) {
      s.blades[r.uid] = { id: d.id, cond: e, throw: "r" };
      const R = TLXV.runtimeOf(r.uid); if (R) model(R);
      return `${h.seller} helps you bolt the ${d.name} onto the ${truckName(r.id)}. Cutting edge ${e}%.${rag} ${useLine()}`;
    }
    s.shed.push(d.id); s.shedC.push(e);
    return `The ${truckName(r.id)} already carries a blade, so ${h.seller}'s ${d.name} goes in the bed and into the garage's shed. Cutting edge ${e}%.${rag} The garage's Plow tab fits it to another pickup for nothing.`;
  },
  pic(g, l, cx, cy, R) {                                                         // the blade leaning on a shed wall, seen from the front
    const e = edgeOf(l.insp ? l.real : l.adv), W = 168, x0 = cx - W / 2, y0 = cy - 46;
    R(x0 - 14, y0 - 22, W + 28, 96, "#6b4a37"); for (let i = 0; i < 8; i++) R(x0 - 14 + i * 25, y0 - 22, 2, 96, "#553a2b");   // the shed's boards
    g.fillStyle = "#c9960f"; g.beginPath(); g.moveTo(x0, y0 + 6); g.quadraticCurveTo(cx, y0 - 8, x0 + W, y0 + 6); g.lineTo(x0 + W, y0 + 56); g.lineTo(x0, y0 + 56); g.closePath(); g.fill();   // mouldboard
    R(x0, y0 + 20, W, 3, "#a87c08"); R(x0, y0 + 38, W, 3, "#a87c08");             // its strips
    for (const fx of [0.12, 0.38, 0.62, 0.88]) R(x0 + W * fx - 2, y0 + 4, 4, 50, "rgba(0,0,0,.18)");   // ribs showing through
    for (let i = 0; i < 5; i++) { g.fillStyle = "rgba(90,60,20,.35)"; g.fillRect(x0 + 12 + ((i * 53) % (W - 30)), y0 + 12 + ((i * 17) % 30), 14 + (i % 3) * 6, 2); }   // scrapes
    R(x0, y0 + 56, W, 8, "#6d7379");                                              // the cutting edge...
    if (e < 60) for (let i = 0; i < 9; i++) R(x0 + 6 + i * (W / 9), y0 + 60 + (i % 2), W / 18, 4, "#2a2d31");   // ...notched when it is worn
    for (const sx of [x0 + 4, x0 + W - 6]) { R(sx, y0 - 34, 2, 40, "#23262a"); R(sx - 1, y0 - 40, 4, 8, "#ff6a1a"); }   // marker rods
    R(x0 + 2, y0 + 64, W - 4, 3, "rgba(0,0,0,.3)");                                // its shadow on the snow
  }
};

/* ---------------- the model: built onto the truck's own group ---------------- */
// one geometry from many boxes and rods, vertex-coloured, so the whole blade is three draw calls
function merge(parts) {
  let nv = 0, ni = 0;
  for (const p of parts) { p.g.applyMatrix4(p.m); nv += p.g.attributes.position.count; ni += p.g.index.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), idx = new Uint32Array(ni), c = new T.Color();
  let v = 0, i = 0;
  for (const p of parts) {
    const n = p.g.attributes.position.count; c.setHex(p.c).convertSRGBToLinear();
    pos.set(p.g.attributes.position.array, v * 3); nor.set(p.g.attributes.normal.array, v * 3);
    for (let k = 0; k < n; k++) { col[(v + k) * 3] = c.r; col[(v + k) * 3 + 1] = c.g; col[(v + k) * 3 + 2] = c.b; }
    const ia = p.g.index.array; for (let k = 0; k < ia.length; k++) idx[i + k] = ia[k] + v;
    v += n; i += ia.length; p.g.dispose();
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.BufferAttribute(pos, 3)); g.setAttribute("normal", new T.BufferAttribute(nor, 3)); g.setAttribute("color", new T.BufferAttribute(col, 3));
  g.setIndex(new T.BufferAttribute(idx, 1)); g.computeBoundingSphere();
  return g;
}
const _e = { v: null };
function mx(x, y, z, rx = 0, ry = 0, rz = 0) { if (!_e.v) _e.v = new T.Euler(0, 0, 0, "YXZ"); _e.v.set(rx, ry, rz); return new T.Matrix4().makeRotationFromEuler(_e.v).setPosition(x, y, z); }
const bx = (w, h, d, c, x, y, z, rx, ry, rz) => ({ g: new T.BoxGeometry(w, h, d), c, m: mx(x, y, z, rx, ry, rz) });
const rod = (r, h, c, x, y, z, rx, ry, rz) => ({ g: new T.CylinderGeometry(r, r, h, 8), c, m: mx(x, y, z, rx, ry, rz) });
const C_FRAME = 0x1d2024, C_BLADE = 0xd9a514, C_EDGE = 0x6d7379, C_ROD = 0x23262a, C_TIP = 0xff6a1a, C_RAM = 0xb4bac0, C_GRIT = 0x6a5b4b;
let MAT = null;
function mats() { return MAT || (MAT = { paint: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.25 }), grit: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }), lens: new T.MeshStandardMaterial({ color: 0x2a2c2e, roughness: 0.3, metalness: 0.1, emissive: 0xfff1cf, emissiveIntensity: 0 }) }); }
function heapSync(B, d, uid) { if (!B.heap) return; const k = Math.min(1, hopOf(uid) / d.hop); B.heap.visible = k > 0.005; B.heap.scale.y = 0.25 + 0.75 * k; B.heap.position.set(0, 2.5 + 0.1 * k, -1.35); }
function model(R) {
  const uid = R.rec.uid, d = bladeOf(uid); if (!d) return;
  const B = rt(uid); if (B.grp && B.grp.parent === R.grp) return;
  const M = mats(), grp = B.grp = new T.Group(), zb = d.z, hw = d.w / 2;
  // the pickup's blade is the measure; the plow truck's (factory) is the same blade drawn K times taller on a wider frame,
  // bolted to a push plate on the truck's own front, and it has no lamp bar: the truck's lamps sit above it already
  const big = !!d.factory, K = d.h / 0.65, mz = d.mz || 2.66, sx = big ? 1.5 : 1, fy = big ? 0.34 : 0.2;
  // on the truck: the push frame's mount under the bumper, the lift tower, the lamp bar over the bonnet
  const fixed = big ? [
    bx(1.7, 0.46, 0.12, C_FRAME, 0, 0.74, mz), bx(0.14, 0.9, 0.14, C_FRAME, 0.62, 1.0, mz + 0.05), bx(0.14, 0.9, 0.14, C_FRAME, -0.62, 1.0, mz + 0.05), bx(1.38, 0.12, 0.14, C_FRAME, 0, 1.42, mz + 0.05)
  ] : [
    bx(1.1, 0.1, 0.12, C_FRAME, 0, 0.36, 2.62), bx(0.1, 0.72, 0.1, C_FRAME, 0.34, 0.74, 2.74), bx(0.1, 0.72, 0.1, C_FRAME, -0.34, 0.74, 2.74),
    bx(0.82, 0.08, 0.1, C_FRAME, 0, 1.08, 2.74), bx(0.07, 0.3, 0.07, C_FRAME, 0.5, 1.26, 2.74), bx(0.07, 0.3, 0.07, C_FRAME, -0.5, 1.26, 2.74),
    bx(1.24, 0.06, 0.08, C_FRAME, 0, 1.4, 2.74), bx(0.2, 0.15, 0.13, C_FRAME, 0.5, 1.5, 2.72), bx(0.2, 0.15, 0.13, C_FRAME, -0.5, 1.5, 2.72)
  ];
  const fm = new T.Mesh(merge(fixed), M.paint); fm.castShadow = true; grp.add(fm);
  if (big) B.lens = null;
  else { const lens = B.lens = new T.Mesh(merge([bx(0.16, 0.11, 0.02, 0xffffff, 0.5, 1.5, 2.795), bx(0.16, 0.11, 0.02, 0xffffff, -0.5, 1.5, 2.795)]), M.lens.clone()); grp.add(lens); }
  // the part that lifts: the A-frame and the ram, and on its pivot the part that slews: the mouldboard in three strips, its
  // cutting edge, ribs and the two marker rods (built square; B.S turns it to the throw)
  const mov = [], slw = [];
  for (const sg of [1, -1]) { const x0 = sg * 0.42 * sx, z0 = mz, x1 = sg * 0.12 * sx, z1 = zb - 0.2, L = Math.hypot(x1 - x0, z1 - z0); mov.push(bx(0.08 * sx, 0.09 * sx, L, C_FRAME, (x0 + x1) / 2, fy, (z0 + z1) / 2, 0, Math.atan2(x1 - x0, z1 - z0), 0)); }
  mov.push(bx(0.5 * sx, 0.1 * sx, 0.1 * sx, C_FRAME, 0, fy, zb - 0.22));
  { const y0 = fy + 0.1, z0 = zb - 0.24, y1 = big ? 1.36 : 0.74, z1 = big ? mz + 0.12 : 2.8, L = Math.hypot(y1 - y0, z1 - z0); mov.push(rod(0.035 * sx, L, C_RAM, 0, (y0 + y1) / 2, (z0 + z1) / 2, Math.atan2(z1 - z0, y1 - y0), 0, 0)); }
  mov.push(rod(0.05 * sx, 0.3 * K, C_FRAME, 0, 0.3 * K, zb - 0.14));                       // the pivot pin the mouldboard swings on
  const strip = (h, y, lz, rx, c) => { slw.push(bx(d.w, h * K, 0.035 * sx, c, 0, y * K, lz * K, rx, 0, 0)); };
  strip(0.25, 0.185, 0.0, -0.42, C_BLADE); strip(0.22, 0.4, -0.045, 0, C_BLADE); strip(0.22, 0.595, 0.0, 0.46, C_BLADE);
  slw.push(bx(d.w, 0.09, 0.035 * sx, C_EDGE, 0, 0.045, 0.07 * K, -0.42, 0, 0));
  for (const lx of [-0.95, -0.32, 0.32, 0.95]) slw.push(bx(0.04 * sx, 0.56 * K, 0.12 * K, C_FRAME, lx * d.w / 2.3, 0.36 * K, -0.1 * K));
  for (const sg of [1, -1]) { slw.push(rod(0.012, 0.6, C_ROD, sg * (hw - 0.04), d.h + 0.33, 0)); slw.push(rod(0.022, 0.12, C_TIP, sg * (hw - 0.04), d.h + 0.65, 0)); }
  const bm = new T.Mesh(merge(mov), M.paint); bm.castShadow = true; B.B = new T.Group(); B.B.add(bm);
  const sm = new T.Mesh(merge(slw), M.paint); sm.castShadow = true; B.S = new T.Group(); B.S.position.set(0, 0, zb); B.S.add(sm); B.B.add(B.S); grp.add(B.B);
  B.heap = B.disc = null;
  if (d.hop) {                                                                   // 4.1c2: the grit in the hopper, by its level, and the spinner's disc with its vanes
    B.heap = new T.Mesh(merge([bx(1.9, 0.2, 2.6, C_GRIT, 0, 0, 0), bx(1.5, 0.12, 2.0, C_GRIT, 0, 0.14, 0), bx(0.9, 0.1, 1.2, C_GRIT, 0, 0.24, 0)]), M.grit); B.heap.castShadow = true; grp.add(B.heap);
    const dp = [{ g: new T.CylinderGeometry(0.42, 0.42, 0.05, 16), c: C_EDGE, m: mx(0, 0, 0) }]; for (let i = 0; i < 4; i++) dp.push(bx(0.36, 0.07, 0.03, C_FRAME, Math.cos(i * Math.PI / 2) * 0.2, 0.05, -Math.sin(i * Math.PI / 2) * 0.2, 0, i * Math.PI / 2, 0));
    B.disc = new T.Mesh(merge(dp), M.paint); B.disc.position.set(0, 0.56, -3.14); grp.add(B.disc);
    heapSync(B, d, uid);
  }
  if (!Number.isFinite(B.a)) B.a = angOf(d, throwOf(uid));
  B.S.rotation.order = "YXZ"; B.S.rotation.y = -B.a; B.S.rotation.x = BL.tripA * (B.tk || 0);
  B.B.position.y = BL.lift * (1 - B.k);
  R.grp.add(grp);
}

/* ---------------- the blade's two ends in the world ---------------- */
const _a = [0, 0], _b = [0, 0];
function ends(d, P, out, dz = 0, a = d.ang) {
  const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw), hx = d.w / 2 * Math.cos(a), hz = d.w / 2 * Math.sin(a);
  const L = (lx, lz, o, i) => { o[i] = P.x + fz * lx + fx * lz; o[i + 1] = P.z - fx * lx + fz * lz; };
  L(hx, d.z + hz + dz, out, 0); L(-hx, d.z - hz + dz, out, 2); return out;      // [left x, z, right x, z]
}
const _n = [0, 0, 0, 0], _m = [0, 0, 0, 0];
function depthLine(q, leave) {                                                   // the snow along a line: [mean depth, mean depth above what the blade leaves]
  const W = api.world, CELL = W.cell, HALF = W.half; let sd = 0, sc = 0; const N = 9;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1), x = q[0] + (q[2] - q[0]) * t, z = q[1] + (q[3] - q[1]) * t, ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL);
    const dd = W.depthAt(ix, iz), f = W.freshAt(ix, iz); sd += dd; sc += Math.max(0, dd - f * leave);
  }
  return [sd / N, sc / N];
}
function heapAt(d, P, lx, lz, r, vol, cap = BL.rowMax) { const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw); return api.world.heapSnow(P.x + fz * lx + fx * lz, P.z - fx * lx + fz * lz, r, vol, cap); }
function spill(B, uid) {                                                         // what the blade holds is left where it is: a pile in front of it; under it after a back-drag; a stack off a square blade
  const d = bladeOf(uid), P = truckPose(uid); if (!d || !P || !(B.carry > 0)) { B.carry = 0; B.back = false; return; }
  let v = B.carry; const sq = !B.back && sideOf(B.a) === 0;
  const lz = B.back ? d.z + 0.45 : sq ? d.z + BL.stackR + 0.1 : d.z + 1.1, r = B.back ? 0.75 : sq ? BL.stackR : 0.9;
  const cap = sq ? BL.stackMax : BL.rowMax;
  v -= heapAt(d, P, 0, lz, r * 0.55, v * 0.4, cap);                             // a heap, not a puck: two fifths of it over the middle
  v -= heapAt(d, P, 0, lz, r, v, cap);
  if (v > 1e-3) v -= heapAt(d, P, 0, lz + 0.6, r + 0.7, v, BL.rowMax);         // more than the heap may stand: the rest slumps round it
  B.volLaid += B.carry - v; B.carry = 0; B.back = false; B.full = false;
}
function truckPose(uid) { if (curUid() === uid) return api.P; return trucks().find(r => r.uid === uid) || null; }

/* ---------------- the road credit (4.1a2) ---------------- */
const RC = new Map();                                                         // "routeId:stretch" -> { n lengths, m: [Uint8Array, Uint8Array] marked per side, c: [count, count], s0: the lowest snow level seen }
function roadSide(rt, s, x, z) {                                              // which side of the route's line (x, z) is on: 0 = left of it facing up the route, 1 = right
  const c = rt.cum, p = rt.pts; let lo = 1, hi = c.length - 1;
  while (lo < hi) { const m = (lo + hi) >> 1; if (c[m] < s) lo = m + 1; else hi = m; }
  const a = p[lo - 1], b = p[lo];
  return (b[1] - a[1]) * (x - a[0]) - (b[0] - a[0]) * (z - a[1]) >= 0 ? 0 : 1;
}
function roadMark(d, x, z, mark) {                                            // -> { name, mine, other } (shares done, this side and the other) on a stretch with snow on it, else null
  const TR = window.TLXR; if (!TR || !TR.ready || !TR.plowSeg) return null;
  const n = TR.near(x, z), r = n.route; if (!r || r.closed || !r.st || !r.cum || !(n.d <= TR.ROADS.half)) return null;
  const SEG = TR.ROADS.seg, i = Math.floor(n.s / SEG), g = r.seg[i]; if (!g || !g.legs.length || !(i < r.st.s.length)) return null;
  const sn = r.st.s[i], key = r.id + ":" + i; let c = RC.get(key);
  if (!(sn > 0.02)) { if (c) RC.delete(key); return null; }                   // nothing on it (the council's plow has been, or it never drifted)
  if (c && sn > c.s0 + BL.rise) { RC.delete(key); c = null; }                 // new snow since: what was cut is filled in
  const side = roadSide(r, n.s, x, z);
  if (!c) {
    if (!mark) return { name: r.name, mine: 0, other: 0 };
    const nb = Math.max(1, Math.ceil(Math.min(SEG, r.len - i * SEG) / BL.bin));
    RC.set(key, c = { n: nb, m: [new Uint8Array(nb), new Uint8Array(nb)], c: [0, 0], s0: sn });
  }
  if (sn < c.s0) c.s0 = sn;
  if (mark) {
    const b = Math.max(0, Math.min(c.n - 1, Math.floor((n.s - i * SEG) / BL.bin))), wide = d.w * Math.cos(d.ang) >= BL.both;
    for (let sd = 0; sd < 2; sd++) if ((wide || sd === side) && !c.m[sd][b]) { c.m[sd][b] = 1; c.c[sd]++; }
    if (c.c[0] >= BL.credit * c.n && c.c[1] >= BL.credit * c.n) { RC.delete(key); opened(r, i, sn); return null; }
  }
  return { name: r.name, mine: c.c[side] / c.n, other: c.c[1 - side] / c.n };
}
function opened(r, i, sn) {
  const TR = window.TLXR, SEG = TR.ROADS.seg, wasShut = sn >= TR.ROADS.shut;
  TR.plowSeg(r.id, i * SEG + 1, true);                                         // quiet: the roads' own "the plow's been round" is not said for your work
  const s = S(); s.opened = (s.opened || 0) + 1;
  const km = v => (v / 1000).toFixed(1), from = `km ${km(i * SEG)} to ${km(Math.min(r.len, (i + 1) * SEG))}`;
  api.toast(!wasShut ? `You've plowed the ${r.name}, ${from}.` : TR.status(r.id) === "open" ? `The ${r.name} is open again: your blade cleared ${from}.` : `You've opened the ${r.name}, ${from}. More of it is still snowed in.`, "good");
  api.save();
}

/* ---------------- the gritter (4.1c2) ---------------- */
const GQ = { key: "", name: "", b: 0, n: 0, sn: 0 };
function gritSpot(x, z) {                                                        // the road stretch and its 10 m length at (x, z), in GQ; null off the road
  const TR = window.TLXR; if (!TR || !TR.ready) return null;
  const n = TR.near(x, z), r = n.route; if (!r || r.closed || !r.st || !(n.d <= TR.ROADS.half)) return null;
  const SEG = TR.ROADS.seg, i = Math.floor(n.s / SEG), g = r.seg[i]; if (!g || !g.legs.length || !(i < r.st.s.length)) return null;
  GQ.key = r.id + ":" + i; GQ.name = r.name; GQ.n = Math.max(1, Math.ceil(Math.min(SEG, r.len - i * SEG) / GRT.bin));
  GQ.b = Math.max(0, Math.min(GQ.n - 1, Math.floor((n.s - i * SEG) / GRT.bin))); GQ.sn = r.st.s[i]; return GQ;
}
function gritLive(h, sn, s0) {                                                   // 0..1: how much of its bite a length gritted at game hour h still has
  if (!(h > 0)) return 0; const age = api.GS.hour - h; if (!(age > -0.01) || age >= GRT.hours) return 0;
  return (1 - api.sstep(GRT.hours * GRT.fade, GRT.hours, age)) * (1 - api.sstep(GRT.bury[0], GRT.bury[1], sn - s0));
}
function gritAt(x, z) { const s = S(), q = s && s.grit ? gritSpot(x, z) : null, g = q && s.grit[q.key]; return g ? gritLive(g.h[q.b], q.sn, g.s0) : 0; }
function grip(x, z) { return 1 + (GRT.mu - 1) * gritAt(x, z); }                  // TLXV.addGrip: every wheeled truck you drive
function gritCover(q) { const g = S().grit[q.key]; if (!g) return 0; let c = 0; for (let i = 0; i < q.n; i++) if (gritLive(g.h[i], q.sn, g.s0) > 0.5) c++; return c / q.n; }
function gritToggle(uid) {
  const B = rt(uid), d = bladeOf(uid); if (!d || !d.hop) return false;
  if (B.grit) { B.grit = false; api.toast("The gritter is off."); return false; }
  if (!(hopOf(uid) >= 1)) { api.toast(`The hopper is empty. The garage's Plow tab fills it: $${Math.round(GRT.price * 1000)} a tonne of grit.`, "warn"); return false; }
  B.grit = true; B.gNote = ""; B.gRoad = null;
  api.toast(`The gritter is on: it spreads behind the truck while it rolls. ${tons(hopOf(uid))} in the hopper.`); return true;
}
function spread(uid, d, B, dt) {                                                 // the spinner is running: lay what the metres rolled this frame call for
  const s = S(), b = s.blades[uid], P = api.P, fx = Math.sin(P.yaw), fz = Math.cos(P.yaw), vf = P.vx * fx + P.vz * fz, v = Math.abs(vf);
  if (!(b.hop > 0)) { b.hop = 0; B.grit = false; heapSync(B, d, uid); api.toast("The hopper is empty: the spinner has stopped. The garage's Plow tab fills it.", "warn"); api.save(); return; }
  if (P.gnd === false || v < GRT.minV || !(dt > 0)) { B.gNote = "still"; B.gRoad = null; return; }
  const m = v * dt, kg = Math.min(b.hop, GRT.rate * m); b.hop -= kg; s.gritKg += kg; B.gKg = (B.gKg || 0) + kg;
  const x = P.x - fx * GRT.back, z = P.z - fz * GRT.back, q = gritSpot(x, z);
  if (!q) { B.gNote = "off"; B.gRoad = null; }
  else if (q.sn > GRT.deep && !(B.down && B.k >= 0.9 && vf > 0.3 && !(B.trip > 0))) { B.gNote = "deep"; B.gRoad = null; }
  else {
    let g = s.grit[q.key];
    if (!g || g.h.length !== q.n || q.sn - g.s0 >= GRT.bury[1]) g = s.grit[q.key] = { h: new Array(q.n).fill(0), s0: q.sn };   // new, or what was there is buried
    if (q.sn < g.s0) g.s0 = q.sn;
    g.h[q.b] = Math.round(api.GS.hour * 100) / 100; B.gNote = ""; B.gRoad = B.gRoad || {}; B.gRoad.name = q.name; B.gRoad.k = gritCover(q);
  }
  if (B.disc) B.disc.rotation.y += GRT.spin * dt;
  if (api.muck) { B.gAcc = (B.gAcc || 0) + m * 5; let n = 0; while (B.gAcc > 1 && n++ < 8) { B.gAcc -= 1; const k = (Math.random() - 0.5) * 2; api.muck(x + fx * 0.3 + fz * k * 0.3, P.y + 0.55, z + fz * 0.3 - fx * k * 0.3, P.vx * 0.35 + fz * k * 4.5 - fx * 1.5, 0.6 + Math.random(), P.vz * 0.35 - fx * k * 4.5 - fz * 1.5, 0.9, true); } if (B.gAcc > 8) B.gAcc = 0; }
}
function gritHint(uid, d, B) {                                                   // the gritter's part of the riding hint
  if (!d.hop) return "";
  const hop = hopOf(uid), touch = INPdev() === "touch", P = api.P, hold = on => (B.down ? "" : ` · ${touch ? "hold BLADE DOWN" : "hold " + api.btn("use")}: gritter ${on ? "on" : "off"}`);
  if (B.grit) {
    const where = B.gNote === "still" ? "it spreads once the truck rolls" : B.gNote === "off" ? "off the road: it is going on the snow" : B.gNote === "deep" ? "the snow here is too deep for grit to bite: plow it first" : B.gRoad ? `${B.gRoad.name}: ${Math.round(B.gRoad.k * 100)}% of this stretch gritted` : "";
    return `GRITTING · ${tons(hop)} in the hopper${where ? " · " + where : ""}${hold(false)}`;
  }
  if (B.down || !(hop >= 1) || Math.hypot(P.vx, P.vz) >= 3) return "";
  const q = gritSpot(P.x, P.z); if (!q || q.sn > GRT.deep) return "";
  const k = gritCover(q);
  return `${hold(true).slice(3)} · ${tons(hop)} of grit${k > 0.02 ? ` · ${q.name}: ${Math.round(k * 100)}% of this stretch gritted` : ""}`;
}

/* ---------------- each frame ---------------- */
function work(uid, d, B, dt) {
  const P = api.P, W = api.world, fx = Math.sin(P.yaw), fz = Math.cos(P.yaw), vf = P.vx * fx + P.vz * fz, a = B.a, wEff = d.w * Math.cos(a);
  const back = B.down && (vf < -0.3 || (B.back && vf < 0.3));
  const lv = leaveOf(uid, d);
  const dl = depthLine(ends(d, P, _m, back ? -0.35 : 0.35, a), back ? Math.max(lv, BL.backLeave) : lv);
  B.depth = dl[0]; B.cut = dl[1];
  if (!B.down) { B.drag = 0; B.full = false; B.last = null; B.why = ""; B.road = null; B.scr = 0; return; }
  if (B.trip > 0) { B.drag = BL.scrape; B.full = false; B.last = null; B.why = ""; B.road = null; B.scr = 0; return; }   // tripped: folded over the thing, it cuts nothing until it springs back
  const q = ends(d, P, _n, 0, a), L = B.last;
  B.road = roadMark(d, (q[0] + q[2]) / 2, (q[1] + q[3]) / 2, !!L && vf > 0.3 && P.gnd !== false && dt > 0 && Math.max(Math.abs(q[0] - L[0]), Math.abs(q[1] - L[1])) < 5);
  const mv = L ? Math.max(Math.hypot(q[0] - L[0], q[1] - L[1]), Math.hypot(q[2] - L[2], q[3] - L[3])) : 99;   // further than 5 m in a frame is a teleport, not plowing
  const sweep = leave => { const n = Math.max(1, Math.min(40, Math.ceil(mv / (W.cell * 0.5)))); let vol = 0; for (let i = 1; i <= n; i++) { const t = i / n; vol += W.bladeSnow(L[0] + (q[0] - L[0]) * t, L[1] + (q[1] - L[1]) * t, L[2] + (q[2] - L[2]) * t, L[3] + (q[3] - L[3]) * t, leave); } return vol; };
  if (L && mv < 5 && P.gnd !== false && vf > 0.3) {
    if (B.back) spill(B, uid);                                                   // it was pulling: what it pulled stays behind, under the blade
    const vol = sweep(lv), side = sideOf(a);
    B.carry += vol; B.volCut += vol; if (vol > 0) { S().m += vf * dt; wear(uid, vf * dt); }
    const hx = wEff / 2, hz = Math.abs(d.w / 2 * Math.sin(a)), r = BL.rowW / 2, cap = side ? cmax(d) : (d.carry ? d.carry * 2 : BL.carrySq), rows = d.rows || BL.rows;
    // slewed: the windrow, off the trailing end; what the first row can't take rolls one row further out
    if (side) for (let i = 0; i < rows.length && B.carry > 1e-4; i++) { const p = heapAt(d, P, side * (hx + 0.25 + r * (2 * i + 1)), d.z - hz - 0.35 - 0.25 * i, r, B.carry, rows[i]); B.carry -= p; B.volLaid += p; }
    // square: it rides on the blade, and what is over a bladeful spills off both ends
    else if (B.carry > cap) { const ex = (B.carry - cap) / 2; for (const sg of [1, -1]) { const p = heapAt(d, P, sg * (hx + 0.25 + r), d.z - 0.35, r, ex, rows[0]); B.carry -= p; B.volLaid += p; } }
    if (B.carry > cap + 1e-4) { const p = heapAt(d, P, 0, d.z + 1.1, 0.9, B.carry - cap); B.volLaid += p; B.carry = cap; B.full = true; }
    else if (!side && B.carry >= cap * 0.97) B.full = true;
    else if (B.carry < cap * 0.6) B.full = false;
    // a plume off the trailing end, more of it at speed
    if (side && vol > 0.002) { const n2 = vf > 8 ? 3 : 1, lx = fz * side, lz = -fx * side, ex = side < 0 ? q[2] : q[0], ez = side < 0 ? q[3] : q[1]; for (let i = 0; i < n2; i++) if (Math.random() < 0.7) api.emit(ex + lx * 0.3, P.y + 0.35, ez + lz * 0.3, lx * (2 + vf * 0.25) + fx * vf * 0.5, 1.2 + vf * 0.15, lz * (2 + vf * 0.25) + fz * vf * 0.5, 1.6, 0.9); }
  } else if (L && mv < 5 && P.gnd !== false && vf < -0.3) {
    // back-dragging: the blade's back takes the top of the snow and pulls a bladeful with the truck
    if (!B.back) { if (B.carry > 0) spill(B, uid); B.back = true; }             // what it was pushing stays in front
    if (B.carry < cmax(d)) { const vol = sweep(Math.max(lv, BL.backLeave)); B.carry += vol; B.volCut += vol; if (vol > 0) { S().m -= vf * dt; wear(uid, -vf * dt); } }
    B.full = B.carry >= cmax(d);
  }
  B.last = B.last || [0, 0, 0, 0]; B.last[0] = q[0]; B.last[1] = q[1]; B.last[2] = q[2]; B.last[3] = q[3];
  // a scraped road stretch (3.2b2, the council's cut in a cold snap): the cutting edge strikes sparks off the bare road
  B.scr = P.gnd !== false && Math.abs(vf) > 1 && window.TLXR && TLXR.scrapeF ? TLXR.scrapeF((q[0] + q[2]) / 2, (q[1] + q[3]) / 2) : 0;
  if (B.scr > 0.05 && api.spark && dt > 0) {
    B.spAcc = (B.spAcc || 0) + B.scr * BL.sparkN * Math.abs(vf) * dt; let n = 0;
    while (B.spAcc > 1 && n++ < 6) { B.spAcc -= 1; const t = Math.random(), k = (Math.random() - 0.5) * 3; api.spark(q[0] + (q[2] - q[0]) * t, P.y + 0.06, q[1] + (q[3] - q[1]) * t, P.vx * 0.5 + fz * k, 0.8 + Math.random() * 2.2, P.vz * 0.5 - fx * k); B.sparks = (B.sparks || 0) + 1; }
    if (B.spAcc > 6) B.spAcc = 0;
  }
  if (Math.abs(vf) < 0.15) { B.stopT += dt; if (B.stopT > 1.2 && B.carry > 0) spill(B, uid); } else B.stopT = 0;
  // the push it puts on the truck (read by core() through TLXV.addLoad next frame)
  if (vf < -0.2) { B.drag = BL.backN + (B.full ? 0 : BL.backFace * BL.face * B.cut * wEff) + BL.carryN * B.carry; B.why = ""; return; }
  const v = Math.max(0, vf);
  B.drag = BL.scrape + BL.face * B.cut * wEff * (1 + BL.v2 * v * v) + BL.over * Math.max(0, B.depth - d.h) * wEff + BL.carryN * (B.back ? 0 : B.carry);
  B.why = B.drag >= (d.whyN || BL.whyN) ? `The blade is into more snow than the truck can push. Lift it${INPdev() === "touch" ? "" : " (" + api.btn("use") + ")"}, back up and take it in bites.` : "";
}
const INPdev = () => api.INP.dev;
const cmax = d => d.carry || BL.carryMax;                                        // the m3 a slewed blade holds
function tick(dt) {
  if (!api || !window.TLXV) return;
  const s = S(); if (!s || !s.blades) return;
  if (trucks().length !== NT) tidy();                                            // a truck bought or gone since: its factory blade (4.1c1)
  const cur = curUid(), night = 1 - api.dayFactor(); let heard = false;
  for (const uid of Object.keys(s.blades)) {
    const r = trucks().find(q => String(q.uid) === uid); if (!r) { tidy(); return; }
    const d = byId(s.blades[uid].id), B = rt(r.uid), R = TLXV.runtimeOf(r.uid);
    if (R && (!B.grp || B.grp.parent !== R.grp)) { B.grp = null; model(R); }
    const mine = cur === r.uid, seated = mine && !api.FOOT.on, ta = angOf(d, throwOf(uid));
    if (!Number.isFinite(B.a)) B.a = ta;
    if (B.a !== ta) { const st = d.ang / BL.slewT * dt; B.a = Math.abs(ta - B.a) <= st ? ta : B.a + Math.sign(ta - B.a) * st; }
    if (B.S) B.S.rotation.y = -B.a;
    // a press with the blade down is decided here: let go inside half a second it lifts, held it slews to the next throw
    // (4.1c2) on a truck with a gritter a press with the blade UP is decided the same way: let go, the blade drops; held, the gritter starts or stops
    if (B.hold) {
      if (!seated || (!B.hold.up && !B.down) || (B.hold.up && B.down) || busy()) B.hold = null;   // a menu or the tablet came up over a press: it neither lifts nor slews
      else if (!(api.useHeld && api.useHeld())) { if (!B.hold.done) { if (B.hold.up) { B.down = true; B.last = null; } else lift(B, r.uid); } B.hold = null; }
      else if (!B.hold.done && performance.now() - B.hold.t0 >= BL.holdT * 1000) { B.hold.done = true; if (B.hold.up) gritToggle(r.uid); else slew(r.uid); }
    }
    if (B.grit) { if (!seated) B.grit = false; else spread(r.uid, d, B, dt); }
    if (B.heap) heapSync(B, d, r.uid);
    if (mine) work(r.uid, d, B, seated ? dt : 0); else { B.drag = 0; B.last = null; B.why = ""; B.road = null; B.scr = 0; }
    const k0 = B.k; B.k = Math.max(0, Math.min(1, B.k + (B.down ? 1 : -1) * dt / BL.liftT));
    if (seated && k0 < 1 && B.k >= 1) clunk(B, 0.3); else if (seated && k0 > 0 && B.k <= 0) clunk(B, 0.14);   // it lands on the ground; it comes up against its stop
    if (B.B) B.B.position.y = BL.lift * (1 - B.k);
    // the trip: folded forward while the thing is under it (the hull's pass keeps the timer up), then it springs back
    if (B.trip > 0) { B.trip -= dt; if (B.trip <= 0) { B.trip = 0; B.tripWhat = ""; if (seated) clunk(B, 0.22); } }
    B.tk = B.trip > 0 ? Math.min(1, (B.tk || 0) + dt / 0.08) : Math.max(0, (B.tk || 0) - dt / 0.3);
    if (B.S) B.S.rotation.x = BL.tripA * B.tk;
    if (seated) scrape(B, api.P), heard = true;
    if (B.lens) B.lens.material.emissiveIntensity = seated && night > 0.35 && api.GS.fuel > 0 ? 1.7 : 0;
  }
  if (!heard) { SND.g = 0; SND.f = 0; }
  sound();
}
function clunk(B, v) { B.clunks = (B.clunks || 0) + 1; api.thud(v); }

/* ---------------- the blade is solid, and trips (4.1b2b) ---------------- */
// One more hull circle on the truck (TLXV.addHull), blade up or down: it reaches as far as the slewed blade's leading end
// and is as wide as what the blade clears, so a bladed pickup needs that much more room at walls, trees and cars.
// The trip (option plowtrip): real blades hang on springs so that the cutting edge catching on something solid folds the
// mouldboard forward instead of stopping the truck dead. With the blade down and the truck over BL.tripV, a rock, a log
// or a parked car does that: a thud, sparks, the truck keeps BL.tripKeep of its speed, the edge loses a few points, and
// the thing passes under the folded blade to meet the bumper at what speed is left. The blade stays folded while the
// thing is under it and springs back BL.tripT after it is clear. Slower than that, with the blade up, with the option
// off, or against a wall, a tree or a post, the blade is plain hull: the truck stops against it.
const HX = { off: 0, r: 0,
  pass(R, o) { const B = rt(R.rec.uid); if (!(B.trip > 0) || !tripKind(o)) return false; B.trip = BL.tripT; return true; },
  hit(R, hit, o, nx, nz) {
    const uid = R.rec.uid, B = rt(uid), P = api.P, what = tripKind(o);
    if (!what || !TLX.on("plowtrip") || !B.down || B.k < 0.9 || api.FOOT.on) return false;
    const vf = P.vx * Math.sin(P.yaw) + P.vz * Math.cos(P.yaw); if (!(vf > BL.tripV) || hit < 1.5) return false;
    B.trip = BL.tripT; B.trips = (B.trips || 0) + 1; B.tripWhat = what; B.tripAt = vf;
    P.vx *= BL.tripKeep; P.vz *= BL.tripKeep;
    if (B.carry > 0) spill(B, uid); B.last = null;
    dull(uid, Math.min(BL.tripPts[2], BL.tripPts[0] + BL.tripPts[1] * (vf - BL.tripV)));
    P.shake = Math.max(P.shake || 0, Math.min(0.8, vf / 12)); api.thud(Math.min(1, 0.35 + vf / 16));
    if (api.spark) for (let i = 0; i < 10; i++) api.spark(o.x + nx * (o.r || 0), P.y + 0.1, o.z + nz * (o.r || 0), P.vx * 0.6 + (Math.random() - 0.5) * 5, 1 + Math.random() * 3, P.vz * 0.6 + (Math.random() - 0.5) * 5);
    if (api.now() - (B.tripSaid === undefined ? -9 : B.tripSaid) > 2.5) { B.tripSaid = api.now(); api.toast(`The blade tripped on ${what} at ${Math.round(vf * 3.6)} km/h and folded over it. Its cutting edge is at ${pct(condOf(uid))}%.`, "warn"); }
    api.save(); return true;
  } };
function hull(R) { const d = bladeOf(R.rec.uid); if (!d) return null; HX.r = d.w * Math.cos(d.ang) / 2 + 0.05; HX.off = d.z + 0.5 - HX.r; return HX; }

/* ---------------- the scrape: one voice on the game's own audio (4.1b2b) ---------------- */
// Steel on the ground with the blade down and the truck moving: louder with speed, a high ringing scrape on a plowed
// lane or thin snow, duller and quieter the deeper the snow it is into (the snow takes the edge off the ground), and
// harsher still on a scraped road stretch. SND.g / SND.f are worked out every frame whether or not there is an audio
// context (it only exists after a key or a tap); a watchdog fades the voice if the game stops ticking.
function scrape(B, P) {
  const v = Math.hypot(P.vx, P.vz);
  if (!B.down || B.k < 0.9 || B.trip > 0 || P.gnd === false || v < 0.5 || (api.INT && api.INT.on)) { SND.g = 0; SND.f = 0; return; }
  const hard = 1 - Math.min(1, (B.cut || 0) / 0.25), scr = B.scr || 0;
  SND.g = BL.sndG * Math.min(1, v / 9) * (0.4 + 0.6 * hard) * (1 + 0.6 * scr);
  SND.f = 700 + 1700 * hard + 70 * Math.min(v, 15) + 1400 * scr;
}
function sound() {
  try {
    const au = api.audio && api.audio(); if (!au) return;
    let h = SND.v;
    if (!h || h.au !== au) {
      if (!(SND.g > 0)) return;
      const AC = au.AC, s = AC.createBufferSource(), b = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = au.buf; s.loop = true;
      b.type = "bandpass"; b.frequency.value = 1500; b.Q.value = 1.6; g.gain.value = 0; s.connect(b); b.connect(g); g.connect(au.master); s.start(0, Math.random());
      h = SND.v = { au, b, g, last: 0, gain: 0 };
      if (!SND.dog) SND.dog = setInterval(() => { const q = SND.v; if (q && q.gain > 0 && performance.now() - q.last > 300) { q.g.gain.setTargetAtTime(0, q.au.AC.currentTime, 0.08); q.gain = 0; } }, 250);
    }
    const t = au.AC.currentTime; h.last = performance.now(); h.gain = SND.g;
    h.g.gain.setTargetAtTime(SND.g, t, 0.07); if (SND.f > 0) h.b.frequency.setTargetAtTime(SND.f, t, 0.1);
  } catch (e) { }
}

/* ---------------- the control and what it says ---------------- */
function useLine() { return INPdev() === "touch" ? "In the truck, the BLADE DOWN / BLADE UP button drops and lifts it. Held with the blade down, it slews the blade: throw right, throw left, square." : `In the truck, ${api.btn("use")} drops and lifts it. Held with the blade down, it slews the blade: throw right, throw left, square.`; }
/* beta 0223 #1/#2: the keyboard's use key (and a pad's L3) still reach the truck under Settings, the garage, the god
   panel, the death card and the tablet, so the blade itself checks: while one is up a press does nothing at all (no
   drop, no lift, no slew), and one coming up over a press that is still held cancels it. On touch the pill is already
   gone while the tablet is up, so all three schemes now agree. */
const elUp = id => { const e = document.getElementById(id); return !!e && !e.hidden; };
function busy() { return !!(api.GS.garageOpen || api.GS.dead || elUp("settings") || elUp("god") || (api.tablet && api.tablet())); }
function lift(B, uid) { B.down = false; B.last = null; B.hold = null; if (B.carry > 0) spill(B, uid); B.back = false; }
function slew(uid) {                                                             // to the next throw: right -> left -> square -> right
  const s = S(), b = s.blades[uid]; if (!b) return null;
  const B = rt(uid); if (B.carry > 0) spill(B, uid);                             // what it holds slides off as it swings
  b.throw = THROWS[throwOf(uid)].next; api.toast(THROWS[b.throw].said); api.save(); return b.throw;
}
function toggle(R) {
  const uid = R.rec.uid, d = bladeOf(uid); if (!d || api.FOOT.on || curUid() !== uid) return false;
  const B = rt(uid);
  if (busy()) return true;                                                       // behind a menu or the tablet the control rests (and stays the blade's: no horn)
  if (!B.down && !d.hop) { B.down = true; B.last = null; B.hold = null; return true; }
  if (!B.hold) B.hold = { t0: performance.now(), done: false, up: !B.down };                 // tick decides: a tap lifts it, a hold slews it
  return true;
}
function label(R) { const d = bladeOf(R.rec.uid); if (!d || api.FOOT.on) return null; return rt(R.rec.uid).down ? "BLADE UP" : "BLADE DOWN"; }
function rideLine() {
  const uid = curUid(); if (uid == null || api.FOOT.on) return "";
  const d = bladeOf(uid); if (!d) return "";
  const a = bladeLine(uid, d), g = gritHint(uid, d, rt(uid));
  return a && g ? a + " · " + g : a || g;
}
function bladeLine(uid, d) {
  const B = rt(uid), P = api.P, v = Math.hypot(P.vx, P.vz), touch = INPdev() === "touch", th = THROWS[throwOf(uid)];
  if (!B.down) return v < 3 && B.cut >= BL.hintMin ? (touch ? "tap BLADE DOWN" : api.btn("use") + ": drop the blade") + ` · ${Math.round(B.depth * 100)} cm of snow ahead` : "";
  const lift = (touch ? "tap BLADE UP" : api.btn("use") + ": lift it") + ` · hold it: ${THROWS[th.next].to}`;
  if (B.trip > 0) return `BLADE DOWN · tripped on ${B.tripWhat || "something solid"}: back off it and the blade springs back · ${touch ? "tap BLADE UP" : api.btn("use") + ": lift it"}`;
  // dropped where the truck stands in deep snow: the wheels are in snow the blade never reached, and that is what holds it
  if (v < 0.5 && B.cut > 0.02 && !B.back) { const R = TLXV.runtimeOf(uid), sk = R && R.sink ? (R.sink[0] + R.sink[1] + R.sink[2] + R.sink[3]) / 4 : 0; if (sk > BL.sunk) return `BLADE DOWN · your wheels stand in snow it has not cut: back up to cleared ground and plow in from there · ${lift}`; }
  if (B.back) return B.full ? `BLADE DOWN · back-dragging · it has all it can pull: stop or lift it to leave the heap · ${lift}` : `BLADE DOWN · back-dragging · ${Math.round(v * 3.6)} km/h · ${B.carry > 0.02 ? "pulling " + B.carry.toFixed(1) + " m3" : "nothing to pull"} · ${lift}`;
  if (B.full) return th.sign ? `BLADE DOWN · the blade is full: lift it or ease off · ${lift}` : `BLADE DOWN · square and full: it spills off both ends. Lift it or stop to stack what it carries · ${lift}`;
  const pc = x => Math.round(Math.min(1, x / BL.credit) * 100), rd = B.road ? ` · ${B.road.name}: this side ${pc(B.road.mine)}%, the other side ${pc(B.road.other)}%` : "";   // of what opens the stretch
  const worn = condOf(uid) < BL.ragged ? " · worn edge, a ragged cut: mend it at the garage" : "";
  return `BLADE DOWN · ${Math.round(v * 3.6)} km/h · ${B.cut > 0.04 ? "cutting " + Math.round(B.depth * 100) + " cm" : "nothing to cut"}${worn}${th.now ? " · " + th.now + (th.sign ? "" : " " + B.carry.toFixed(1) + " m3") : ""}${rd} · ${lift}`;
}
const XL = { kg: 0, pin: 0, drag: 0, brakeN: 0, hold: false, held: false, why: "" };
function load(uid) { const d = bladeOf(uid); if (!d) return null; const B = rt(uid); XL.kg = XL.pin = d.kg + (d.hop ? hopOf(uid) : 0); XL.drag = B.drag || 0; XL.why = B.why || ""; return XL; }

window.TLXPL = { BLADES, BL, GRT, hopOf, fill, gritToggle, gritAt, grip, gritSpot: (x, z) => { const q = gritSpot(x, z); return q ? Object.assign({ k: gritCover(q) }, q) : null; }, THROWS, USED, mkt: MKB, state: S, rt, fit, unfit, mend, mendCost, condOf, leaveOf, bladeOf, throwOf, slew, ends, hint: rideLine, tidy, road: RC, roadSide, hull, snd: () => ({ g: SND.g, f: SND.f, voice: !!SND.v }) };

TLX.option({ id: "plowtrip", name: "Plow blade trips", hint: "With the blade down at over 14 km/h, a rock, a log or a parked car trips the blade: it folds over the thing, the truck is checked and the cutting edge loses a few points. Off = the blade never trips; the truck just stops against whatever it meets.", sys: "plow" });

TLX.register({
  id: "plow", v: 1,
  state0: () => ({ blades: {}, shed: [], shedC: [], m: 0, opened: 0, grit: {}, gritKg: 0 }),
  migrate: st => st,
  init(a) {
    api = a; T = a.THREE; RTB.clear(); RC.clear();
    if (!window.TLXV) return;
    tidy();
    a.veh.tabs.push({ id: "plow", name: "Plow", render: garageRows });
    TLXV.addLoad(load);
    TLXV.addUse({ use: toggle, label });
    if (TLXV.addHull) TLXV.addHull(hull);
    if (TLXV.addGrip && !GQ.on) { GQ.on = true; TLXV.addGrip(grip); }
    if (TLXV.addMkt && !MKB.on) { MKB.on = true; TLXV.addMkt(MKB); }               // used blades on Bytteboden (4.1b3a)
    TLXV.onModel(model);
    if (a.ridex) a.ridex.push(rideLine);
  },
  tick,
  save() { tidy(); }
});
})();
