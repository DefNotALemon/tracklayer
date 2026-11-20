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
// THE PLOW APP AND THE KOMMUNE'S ROAD CONTRACTS (4.2a). The block comment at PLC: sign for a road in the Plow app and the
// council's plow stays home on it; every due stretch your blade opens pays by the metre and by how soon; a stretch left
// shut is a warning, three take the road back. State: con, conBan, conLast, conPaid, conH.
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
// DRIVEWAYS (4.2b1). The block comment at DRV: eight Kjøllefjord households with a drive beside the house. One you take on
// in the Plow app snows in (api.world.addDrift) until your blade has cut four fifths of its length, which pays at once.
// State: drv, drvOff, drvRec, drvH, drvPaid, drvN, drvWk, drvWkN.
// DOORS (4.2b2). The block comment at WIN: snow the blade leaves lying across a front walk or the mouth of a drive has to
// be pulled clear again, or the household digs it out and holds it against you. State: win, winC, winN, winH, drvSulk.
// LOTS (4.2c1). The block comment at LOT: the place's public yards (the sled park, the helsesenter's forecourt) taken on in
// the Plow app, snowed in like a drive, plowed by the square metre and paid by area. State: lot, lotOff, lotRec, lotH, lotPaid, lotN.
// A LOT'S HEAP (4.2c2a). The block comment at lotHeap: a lot cut with your snow standing in its middle is held, not paid.
// STREETS (4.2c2b). The block comment at STR: a heap of the blade's snow left standing in a town street has to be pushed
// off it again, or the kommune's own truck clears it and it is a warning on a road contract of yours (no contract: no
// road is tendered to you for three days). State: str, strC, strN, strH, strBan.
// PLOW DRIVERS (5.4a1, 5.4a2). The block comment at PDR: a plow driver hired in the Staff app works a contract road of
// yours, in their own truck for a share of what they open, or in a truck of yours you ASSIGN them. State: pdr.
// NOT YET: the hotel forecourt (a LOTS row the day 7.2 builds a hotel).
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
const GHB = {};                                                                 // 5.4b1: a truck that is not yours (a plow driver's own, TLXV.ghost) -> its blade id
const bladeOf = uid => { const s = S(), b = s && s.blades[uid]; return b ? byId(b.id) : GHB[uid] ? byId(GHB[uid]) : null; };
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
  conTidy(s);                                                                    // 4.2a: the road contracts
  pdrTidy(s);                                                                    // 5.4a1: where each road's driver is
  drvTidy(s);                                                                    // 4.2b1: the driveways
  lotTidy(s);                                                                    // 4.2c1: the lots
  strTidy(s);                                                                    // 4.2c2b: heaps in a street
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
    /* 4.1c3: a truck bought used (its record says so, tlx-vehicles.js collect) comes with the edge its seller wore: the truck's own condition */
    const b = s.blades[r.uid]; if (!b || b.id !== fd.id) { s.blades[r.uid] = { id: fd.id, cond: r.used && Number.isFinite(r.cond) ? Math.max(1, Math.min(100, r.cond)) : 100, throw: "r" }; if (fd.hop) s.blades[r.uid].hop = 0; delete r.used; }
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
  if (r && r.out) { api.toast(`That truck is out ${r.out}.`, "warn"); return false; }
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
  if (r.out) { api.toast(`That truck is out ${r.out}.`, "warn"); return false; }
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
  if (r.out) { api.toast(`That truck is out ${r.out}.`, "warn"); return false; }
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
function heapAt(d, P, lx, lz, r, vol, cap = BL.rowMax) { const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw), x = P.x + fz * lx + fx * lz, z = P.z - fx * lx + fz * lz, p = api.world.heapSnow(x, z, r, vol, cap); if (p > 1e-4) { winLay(x, z, r, p); lotLay(x, z); strLay(x, z, r, p); } return p; }
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
  const pd = conPay(r, i, sn);                                                   // 4.2a: a road you hold the contract for pays
  const paid = pd ? ` The kommune pays ${api.fmtCash(pd.cash)}${pd.k < 0.995 ? ` (${Math.round(pd.k * 100)}%: ${Math.round(pd.h)} h after the weather eased)` : ""}.` : "";
  const km = v => (v / 1000).toFixed(1), from = `km ${km(i * SEG)} to ${km(Math.min(r.len, (i + 1) * SEG))}`;
  api.toast((!wasShut ? `You've plowed the ${r.name}, ${from}.` : TR.status(r.id) === "open" ? `The ${r.name} is open again: your blade cleared ${from}.` : `You've opened the ${r.name}, ${from}. More of it is still snowed in.`) + paid, "good");
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
  if (!B.down) { B.drag = 0; B.full = false; B.last = null; B.why = ""; B.road = null; B.drv = null; B.lot = null; B.scr = 0; return; }
  if (B.trip > 0) { B.drag = BL.scrape; B.full = false; B.last = null; B.why = ""; B.road = null; B.drv = null; B.lot = null; B.scr = 0; return; }   // tripped: folded over the thing, it cuts nothing until it springs back
  const q = ends(d, P, _n, 0, a), L = B.last;
  B.road = roadMark(d, (q[0] + q[2]) / 2, (q[1] + q[3]) / 2, !!L && vf > 0.3 && P.gnd !== false && dt > 0 && Math.max(Math.abs(q[0] - L[0]), Math.abs(q[1] - L[1])) < 5);
  const mv = L ? Math.max(Math.hypot(q[0] - L[0], q[1] - L[1]), Math.hypot(q[2] - L[2], q[3] - L[3])) : 99;   // further than 5 m in a frame is a teleport, not plowing
  B.drv = drvMark((q[0] + q[2]) / 2, (q[1] + q[3]) / 2, !!L && mv < 5 && Math.abs(vf) > 0.3 && P.gnd !== false && dt > 0);   // 4.2b1: a customer's drive under the blade, cutting forward or back-dragging
  B.lot = lotMark(q, !!L && mv < 5 && Math.abs(vf) > 0.3 && P.gnd !== false && dt > 0);   // 4.2c1: a lot of yours under the blade's edge
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
  conT += dt; if (conT >= 0.5) { conSec = conT; conT = 0; pdrSweep(); conStep(); conSec = 0; drvStep(); lotStep(); winStep(); strStep(); }               // 4.2a: the road contracts' clocks
  try { pdrSee(dt); } catch (e) { if (!PDSX.err) console.error("tlx-plow: the driver's truck", e); PDSX.err = String(e); }   // 5.4b1
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
    if (mine) work(r.uid, d, B, seated ? dt : 0); else { B.drag = 0; B.last = null; B.why = ""; B.road = null; B.drv = null; B.scr = 0; }
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
/* beta 0305 #1: whose press is it beside a lake. Stopped within 40 m of a lake the game's use control is ice fishing's
   ("get off and fish"), and it took the press ahead of the truck: the hint read "drop the blade", the press set the
   driver down on the ice with a rod, and the truck "would not move". Now the blade says when the control is its own
   (TLXV.addUse wants): while it is down (the press lifts or slews it), while a press is being decided, while the
   gritter runs, and while its own hint is offering the drop or the gritter. Standing ON the lake ice with the blade up
   it offers nothing (nobody plows a lake), so out there the press is still fishing's and the hint says so. */
const onIce = () => api.world.bioAt(api.P.x, api.P.z) === 1;
function wants(R) {
  const uid = R.rec.uid, d = bladeOf(uid); if (!d || api.FOOT.on || curUid() !== uid) return false;
  const B = rt(uid); return !!(B.down || B.hold || B.grit || bladeLine(uid, d) || gritHint(uid, d, B));
}
function rideLine() {
  const uid = curUid(); if (uid == null || api.FOOT.on) return "";
  const d = bladeOf(uid); if (!d) return "";
  const a = bladeLine(uid, d), g = gritHint(uid, d, rt(uid)), w = winLine(), l = lotLine(), sl = strLine();
  return [w, sl, l, a, g].filter(Boolean).join(" · ");
}
function bladeLine(uid, d) {
  const B = rt(uid), P = api.P, v = Math.hypot(P.vx, P.vz), touch = INPdev() === "touch", th = THROWS[throwOf(uid)];
  if (!B.down) return v < 3 && B.cut >= BL.hintMin && !onIce() ? (touch ? "tap BLADE DOWN" : api.btn("use") + ": drop the blade") + ` · ${Math.round(B.depth * 100)} cm of snow ahead` : "";
  const lift = (touch ? "tap BLADE UP" : api.btn("use") + ": lift it") + ` · hold it: ${THROWS[th.next].to}`;
  if (B.trip > 0) return `BLADE DOWN · tripped on ${B.tripWhat || "something solid"}: back off it and the blade springs back · ${touch ? "tap BLADE UP" : api.btn("use") + ": lift it"}`;
  // dropped where the truck stands in deep snow: the wheels are in snow the blade never reached, and that is what holds it
  if (v < 0.5 && B.cut > 0.02 && !B.back) { const R = TLXV.runtimeOf(uid), sk = R && R.sink ? (R.sink[0] + R.sink[1] + R.sink[2] + R.sink[3]) / 4 : 0; if (sk > BL.sunk) return `BLADE DOWN · your wheels stand in snow it has not cut: back up to cleared ground and plow in from there · ${lift}`; }
  if (B.back) return B.full ? `BLADE DOWN · back-dragging · it has all it can pull: stop or lift it to leave the heap · ${lift}` : `BLADE DOWN · back-dragging · ${Math.round(v * 3.6)} km/h · ${B.carry > 0.02 ? "pulling " + B.carry.toFixed(1) + " m3" : "nothing to pull"} · ${lift}`;
  if (B.full) return th.sign ? `BLADE DOWN · the blade is full: lift it or ease off · ${lift}` : `BLADE DOWN · square and full: it spills off both ends. Lift it or stop to stack what it carries · ${lift}`;
  const pc = x => Math.round(Math.min(1, x / BL.credit) * 100), rd = B.road ? ` · ${B.road.name}: this side ${pc(B.road.mine)}%, the other side ${pc(B.road.other)}%` : "";   // of what opens the stretch
  const worn = condOf(uid) < BL.ragged ? " · worn edge, a ragged cut: mend it at the garage" : "";
  const dv = B.drv ? ` · ${B.drv.name}'s drive: ${Math.round(Math.min(1, B.drv.k / DRV.credit) * 100)}% plowed out` : "";
  const lt = B.lot && B.lot.heap === undefined ? ` · ${B.lot.name}: ${Math.round(Math.min(1, B.lot.k / LOT.credit) * 100)}% plowed out` : "";
  return `BLADE DOWN · ${Math.round(v * 3.6)} km/h · ${B.cut > 0.04 ? "cutting " + Math.round(B.depth * 100) + " cm" : "nothing to cut"}${worn}${th.now ? " · " + th.now + (th.sign ? "" : " " + B.carry.toFixed(1) + " m3") : ""}${rd}${dv}${lt} · ${lift}`;
}
/* ---------------- the Plow app and the kommune's road contracts (4.2a) ----------------
   The Plow app (on the tablet once you own a blade) lists the kommune's roads that no convoy runs on (conR). SIGN one
   with a blade fitted and the council's plow stays home on it (TLXR.hold, asked by tlx-roads.js snowStep): the road is
   yours. A stretch is DUE from PLC.due of snow; its clock (hours) runs only while the weather over it is under the
   council's own limit, so nobody is asked to plow in the storm. Opening a due stretch with the blade (the road credit,
   opened()) pays PLC.perM a metre at once: in full inside PLC.fullH hours of the clock, falling to PLC.low of it at
   PLC.lowH. AT RISK: a SHUT stretch whose clock passes PLC.lateH, or one you slept through (a skip plows every road),
   is a warning: the kommune's own truck opens the road that once (`cover`: the hold is let go until the road is clean),
   unpaid. PLC.strikes warnings and the road is taken back and not tendered to you for PLC.banH hours. A Monday with no
   warning that week strikes one off and writes the statement. A due stretch that was never shut and waits PLC.staleH is
   plowed by the council without a warning. The Jobs app has a row per contract road with work on it (api.jobx).
   SAVED in x.sys.plow: con { routeId: { name, since, strikes, due: { stretch: [clock hours, was shut 0/1] }, cover, told,
   warned, clean, wk (cash this week), wkM (metres this week) } }, conBan { routeId: game hour it is tendered again },
   conLast [statements], conPaid, conH (the game hour last stepped).
   THE KOMMUNE'S FILE (beta 0246 #1/#2): HAND BACK does not wipe the slate. conRec { routeId: { strikes, due } } is what
   the kommune remembers of a road you no longer hold: its warnings, and the clocks of the stretches that still had
   snow on them (conStep keeps those running until the council's plow, a skip or a thaw clears the stretch). SIGN picks
   both up again, and a re-signed road with warnings on file must be held a whole clean week before a Monday strikes
   one off. Handing a road back with a stretch shut PLC.lateH / 2 hours or more (the hour the "wants it open" line is
   said) is itself a warning, the third one a ban like any other; the clocks are then dropped (one warning a stretch). */
const PLC = { perM: 0.25, due: 0.12, fullH: 3, lowH: 8, low: 0.5, lateH: 8, staleH: 24, strikes: 3, banH: 168 };
const conR = () => { const TR = window.TLXR; return TR && TR.ready ? TR.routes.filter(r => !r.closed && !r.convoy && r.st && r.seg) : []; };
const conK = h => 1 - (1 - PLC.low) * Math.max(0, Math.min(1, (h - PLC.fullH) / (PLC.lowH - PLC.fullH)));   // the share of the pay left after h hours on the clock
const conLen = (r, i) => { const SEG = window.TLXR.ROADS.seg; return Math.max(0, Math.min(SEG, r.len - i * SEG)); };
const conHold = id => { const s = S(), c = s && s.con && s.con[id]; return !!c && !c.cover; };
const conRefresh = () => { try { api.TABLET.refresh("plow"); } catch (e) { } };
function conTidy(s) {
  const obj = v => !!v && typeof v === "object" && !Array.isArray(v), num = (v, lo, hi) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : lo);
  if (!obj(s.con)) s.con = {};
  if (!obj(s.conBan)) s.conBan = {};
  s.conLast = Array.isArray(s.conLast) ? s.conLast.filter(obj).slice(0, 6) : [];
  s.conPaid = num(s.conPaid, 0, 1e9); if (!Number.isFinite(s.conH)) s.conH = -1;
  s.conWk = (Array.isArray(s.conWk) ? s.conWk : []).filter(e => obj(e) && typeof e.id === "string").slice(0, 12);   /* beta 0337: the week's pay on roads no longer held */
  for (const e of s.conWk) { e.road = typeof e.road === "string" ? e.road : e.id; e.pay = num(e.pay, 0, 1e9); e.m = num(e.m, 0, 1e9); e.dn = Math.floor(num(e.dn, 0, 1e6)); e.w = Math.floor(num(e.w, 0, PLC.strikes)); e.gone = e.gone === "taken" ? "taken" : "back"; }
  for (const id of Object.keys(s.con)) {
    const c = s.con[id]; if (!obj(c)) { delete s.con[id]; continue; }
    c.name = typeof c.name === "string" ? c.name : id; c.strikes = Math.floor(num(c.strikes, 0, PLC.strikes - 1)); c.wk = num(c.wk, 0, 1e9); c.wkM = num(c.wkM, 0, 1e9);
    c.clean = c.clean !== false; c.cover = !!c.cover; c.told = !!c.told; c.warned = !!c.warned; if (!obj(c.due)) c.due = {};
    for (const k of Object.keys(c.due)) { const d = c.due[k]; if (!Array.isArray(d) || !Number.isFinite(d[0])) delete c.due[k]; else { d[0] = Math.max(0, d[0]); d[1] = d[1] ? 1 : 0; } }
  }
  for (const id of Object.keys(s.conBan)) if (!Number.isFinite(s.conBan[id])) delete s.conBan[id];
  if (!obj(s.conRec)) s.conRec = {};
  for (const id of Object.keys(s.conRec)) {
    const q = s.conRec[id]; if (!obj(q)) { delete s.conRec[id]; continue; }
    q.strikes = Math.floor(num(q.strikes, 0, PLC.strikes - 1)); if (!obj(q.due)) q.due = {};
    for (const k of Object.keys(q.due)) { const d = q.due[k]; if (!Array.isArray(d) || !Number.isFinite(d[0])) delete q.due[k]; else { d[0] = Math.max(0, d[0]); d[1] = d[1] ? 1 : 0; } }
    if (!q.strikes && !Object.keys(q.due).length) delete s.conRec[id];
  }
}
const conQuitCost = c => !!c && !c.cover && Object.keys(c.due || {}).some(k => c.due[k][1] && c.due[k][0] >= PLC.lateH / 2);   // would HAND BACK be a warning now?
function conSign(id) {
  const s = S(), r = conR().find(q => q.id === id), H = api.GS.hour; if (!r || !s || s.con[id]) return false;
  if (!Object.keys(s.blades).length) { api.toast("The kommune tenders a road to someone with a plow. Fit a blade to a truck first: the garage's Plow tab.", "warn"); return false; }
  if (strOn() && s.strBan > H) { const dys = Math.max(1, Math.ceil((s.strBan - H) / 24)); api.toast(`The kommune had to send its own truck to clear your plow's heap out of a street. It tenders no road to you for another ${dys} day${dys === 1 ? "" : "s"}.`, "warn"); return false; }
  if (s.conBan[id] > H) { const dys = Math.max(1, Math.ceil((s.conBan[id] - H) / 24)); api.toast(`The kommune took the ${r.name} back from you. It tenders it again in ${dys} day${dys === 1 ? "" : "s"}.`, "warn"); return false; }
  delete s.conBan[id];
  const q = s.conRec && s.conRec[id], st = q ? q.strikes : 0, due = {};          // the kommune's file on this road: its warnings and the clocks still running
  if (q) { for (const k of Object.keys(q.due)) if (r.seg[k] && r.seg[k].legs.length && r.st.s[k] >= PLC.due) due[k] = [q.due[k][0], q.due[k][1]]; delete s.conRec[id]; }
  const on = Object.keys(due).length > 0;
  s.con[id] = { name: r.name, since: H, strikes: st, due, cover: false, told: on, warned: on && Object.keys(due).some(k => due[k][1] && due[k][0] >= PLC.lateH / 2), clean: !st, wk: 0, wkM: 0 };
  api.toast(`The ${r.name} is yours to plow: ${api.fmtCash(Math.round(400 * PLC.perM * api.payMul()))} for every 400 m stretch you open inside ${PLC.fullH} h of the weather easing. The council's plow stays home on it.` + (st ? ` The kommune's file on it still holds ${st === 1 ? "a warning" : st + " warnings"} against you.` : "") + (on ? " The clock on its snow never stopped." : ""), "good");
  api.save(); conRefresh(); return true;
}
function conQuit(id) {
  const s = S(), c = s && s.con && s.con[id]; if (!c) return false;
  const r = conR().find(q => q.id === id), cost = !!r && conQuitCost(c);
  if (cost && conStrike(c, r, "quit")) return true;                               /* the third warning: taken back, banned */
  const due = {}; if (!cost && !c.cover) for (const k of Object.keys(c.due || {})) due[k] = [c.due[k][0], c.due[k][1]];
  if (!obj0(s.conRec)) s.conRec = {};
  if (c.strikes > 0 || Object.keys(due).length) s.conRec[id] = { strikes: c.strikes, due }; else delete s.conRec[id];
  conKeep(s, id, c, "back"); delete s.con[id];
  if (!cost) api.toast(`You've handed the ${c.name} back. The council's plow has it again.` + (c.strikes ? ` The kommune keeps ${c.strikes === 1 ? "the warning" : "the " + c.strikes + " warnings"} on that road's file.` : ""));
  api.save(); conRefresh(); return true;
}
const obj0 = v => !!v && typeof v === "object" && !Array.isArray(v);
/* beta 0337 #1/#2: the week's pay belongs to the week, not to the contract (as 0325 #1 did for drives and lots). A road
   handed back, taken back on the third warning or gone from the map took its wk / wkM (and its driver's wkN) with it,
   so Monday's statement had no line for money already paid. conKeep moves them to s.conWk (one entry a road: id, road,
   pay, m, dn, w, gone "back" | "taken") before the contract is deleted; conMonday writes each as a line, or adds it to
   the road's own line when you hold the road again by Monday, and clears the list. Saved. */
function conKeep(s, id, c, gone) {
  if (!s || !obj0(c)) return; const pos = v => (Number.isFinite(v) && v > 0 ? v : 0), q = s.pdr && s.pdr[id];
  const pay = pos(c.wk), m = pos(c.wkM), dn = obj0(q) ? Math.floor(pos(q.wkN)) : 0; c.wk = 0; c.wkM = 0; if (obj0(q)) { q.wkN = 0; q.wkCash = 0; }
  if (!(pay > 0 || m > 0 || dn > 0)) return;
  if (!Array.isArray(s.conWk)) s.conWk = [];
  let e = s.conWk.find(v => obj0(v) && v.id === id); if (!e) s.conWk.push(e = { id, road: "", pay: 0, m: 0, dn: 0, w: 0, gone });
  e.pay = pos(e.pay) + pay; e.m = pos(e.m) + m; e.dn = pos(e.dn) + dn; e.w = Math.floor(pos(c.strikes)); e.gone = gone; e.road = typeof c.name === "string" ? c.name : String(id);
}
function conStrike(c, r, slept, lead) {                                          /* lead (4.2c2b): what the warning is for when it is not the road's own snow */
  const s = S(); c.strikes++; c.clean = false;
  if (c.strikes >= PLC.strikes) {
    conKeep(s, r.id, c, "taken"); delete s.con[r.id]; s.conBan[r.id] = api.GS.hour + PLC.banH;
    if (s.conRec) delete s.conRec[r.id];
    api.toast(`${lead ? lead + " " : ""}Third warning: the kommune has taken the ${r.name} back. It will not tender it to you again for a week.`, "bad");
    api.save(); conRefresh(); return true;
  }
  api.toast(lead ? `${lead} Warning ${c.strikes} of ${PLC.strikes} on your contract for the ${r.name}.` : slept === "quit" ? `You've handed the ${r.name} back with a stretch lying shut, and the kommune's own truck has to go out. Warning ${c.strikes} of ${PLC.strikes}, kept on that road's file.`
    : slept ? `The ${r.name} lay shut while you were away and the kommune's own truck opened it. Warning ${c.strikes} of ${PLC.strikes} on that contract.`
    : `The ${r.name} has lain shut ${PLC.lateH} h: the kommune's own truck is going out. Warning ${c.strikes} of ${PLC.strikes} on that contract.`, "warn");
  api.save(); conRefresh(); return false;
}
function conStep() {
  const s = S(), TR = window.TLXR; if (!s || !s.con || !TR || !TR.ready || !api.started()) return;
  const H = api.GS.hour, dh = s.conH < 0 || H < s.conH ? 0 : H - s.conH; s.conH = H;
  const ids = Object.keys(s.con), recs = obj0(s.conRec) ? Object.keys(s.conRec) : []; if (!ids.length && !recs.length) return;
  const rs = conR(), WX = api.WX, RD = TR.ROADS, slept = dh > RD.skip;
  for (const id of recs) {                                                       /* the file on a road handed back: its clocks run until the stretch is cleared */
    const q = s.conRec[id], r = rs.find(v => v.id === id); if (!q || !obj0(q.due)) continue; if (!r) { delete s.conRec[id]; continue; }
    for (const k of Object.keys(q.due)) { const g = r && r.seg[k]; if (slept || !g || !(r.st.s[k] >= PLC.due)) delete q.due[k]; else { if (WX.at(g.mx, g.mz) < RD.plowWx) q.due[k][0] += dh; if (r.st.s[k] >= RD.shut) q.due[k][1] = 1; } }
    if (!q.strikes && !Object.keys(q.due).length) delete s.conRec[id];
  }
  for (const id of ids) {
    const c = s.con[id], r = rs.find(q => q.id === id); if (!r) { conKeep(s, id, c, "back"); delete s.con[id]; continue; }
    c.name = r.name;
    pdrRun(c, r, dh, slept);                                                     /* 5.4a1: a driver of yours on this road works first: what they open this step is not late */
    let nd = 0, late = false, half = false, stale = false, gone = false, fresh = false;
    r.seg.forEach((g, i) => {
      if (!g.legs.length) return; const sn = r.st.s[i]; let d = c.due[i];
      if (sn >= PLC.due) {
        if (!d) { d = c.due[i] = [0, 0]; fresh = true; }
        if (!slept && WX.at(g.mx, g.mz) < RD.plowWx) d[0] += Math.max(0, dh - (PDLOST[id] || 0));   /* 5.4b1: less the hours your driver lost to being watched */
        if (sn >= RD.shut) d[1] = 1;
        nd++;
        if (d[1] && d[0] >= PLC.lateH) late = true; else if (d[1] && d[0] >= PLC.lateH / 2) half = true;
        if (d[0] >= PLC.staleH) stale = true;
      } else if (d) { if (d[1] && sn < 0.02) gone = true; delete c.due[i]; }   /* cleared, and not by your blade (opened() takes its own off the list) */
    });
    if ((late || gone) && !c.cover) { c.cover = true; if (conStrike(c, r, gone && !late)) continue; }
    else if (stale && !c.cover) { c.cover = true; api.toast(`The ${r.name} has waited a day: the kommune's own truck is taking it this once.`); }
    if (!nd) { if (r.st.p < 0) c.cover = false; c.told = c.warned = false; }
    else if (!c.cover) {
      if (fresh && !c.told) { c.told = true; api.toast(`Snow on the ${r.name}: it is yours to plow. Full pay inside ${PLC.fullH} h of the weather easing.`); conRefresh(); }
      if (half && !c.warned) { c.warned = true; api.toast(`The ${r.name} has been shut ${PLC.lateH / 2} h. The kommune wants it open inside ${PLC.lateH}, or its own truck goes out and you get a warning.`, "warn"); }
    }
  }
}
function conPay(r, i, sn, share = 1) {                                           // opened() asks: what the kommune pays for this stretch, or null (share: your part when a driver of yours opened it, 5.4a1)
  const s = S(), c = s.con && s.con[r.id]; if (!c) return null;
  const d = c.due && c.due[i]; if (c.due) delete c.due[i];
  if (!(sn >= PLC.due)) return null;
  const h = d ? d[0] : 0, k = conK(h), len = conLen(r, i), cash = Math.round(len * PLC.perM * k * api.payMul() * share);
  api.GS.cash += cash; c.wk += cash; c.wkM += len; s.conPaid = (s.conPaid || 0) + cash; conRefresh();
  return { cash, k, h };
}
function conMonday(week) {
  const s = S(); if (!s || !s.con) return; const ids = Object.keys(s.con), kept = Array.isArray(s.conWk) ? s.conWk.filter(obj0) : []; s.conWk = [];
  if (!ids.length && !kept.length) return;                                       /* beta 0337: a week's pay on a road no longer held still gets its line */
  const d = week && week.label || "", pos = v => (Number.isFinite(v) && v > 0 ? v : 0); let pay = 0, m = 0, off = 0;
  if (!Array.isArray(s.conLast)) s.conLast = [];
  for (const e of kept) {
    if (ids.includes(e.id)) continue;                                            /* held again by Monday: goes into that road's own line below */
    s.conLast.unshift({ d, road: String(e.road || e.id || ""), pay: pos(e.pay), m: Math.round(pos(e.m)), w: Math.floor(pos(e.w)), lapsed: false, dn: Math.floor(pos(e.dn)), gone: e.gone === "taken" ? "taken" : "back" });
    pay += pos(e.pay); m += pos(e.m);
  }
  for (const id of ids) {
    const c = s.con[id], lapsed = c.clean && c.strikes > 0; if (lapsed) { c.strikes--; off++; }
    const q = s.pdr && s.pdr[id]; let dn = q ? q.wkN : 0; if (q) { q.wkN = 0; q.wkCash = 0; }
    for (const e of kept) if (e.id === id) { c.wk += pos(e.pay); c.wkM += pos(e.m); dn += Math.floor(pos(e.dn)); }
    s.conLast.unshift({ d, road: c.name, pay: c.wk, m: Math.round(c.wkM), w: c.strikes, lapsed, dn });
    pay += c.wk; m += c.wkM; c.wk = 0; c.wkM = 0; c.clean = true;
  }
  s.conLast = s.conLast.slice(0, 6); api.save(); conRefresh();
  setTimeout(() => { try { api.TABLET.notify({ app: "plow", kind: "good", title: `Kommunen · week to ${d}`, body: `Plow contracts: ${api.fmtCash(pay)} for ${(m / 1000).toFixed(1)} km opened${off ? " · a warning struck off" : ""}`, ttl: 8 }); } catch (e) { } }, 1500);
}
function conWork(c, r) {                                                         // what is waiting on a contract road: { n, m, shut, h (longest clock), near (the stretch nearest you) }
  const P = api.FOOT.on ? api.FOOT : api.P, o = { n: 0, m: 0, shut: 0, h: 0, near: null }; let bd = Infinity;
  r.seg.forEach((g, i) => { const d = c.due[i]; if (!d || !g.legs.length) return; o.n++; o.m += conLen(r, i); if (d[1]) o.shut++; if (d[0] > o.h) o.h = d[0];
    const dd = Math.hypot(g.mx - P.x, g.mz - P.z); if (dd < bd) { bd = dd; o.near = g; } });
  return o;
}
function conState(c, w) {
  const hrs = v => (v >= 1 ? Math.round(v) + " h" : Math.max(1, Math.round(v * 60)) + " min");
  return c.cover ? "the kommune's own truck has it this once" : w.shut && w.h < PLC.lateH ? `shut · ${hrs(PLC.lateH - w.h)} on the clock before a warning` : w.h < PLC.fullH ? `full pay for another ${hrs(PLC.fullH - w.h)}` : "the pay is falling";
}
function conJob(k) {
  const s = S(); if (!s || !s.con) return null; const id = Object.keys(s.con)[k]; if (!id) return null;
  const c = s.con[id], r = conR().find(q => q.id === id); if (!r) return null;
  const w = conWork(c, r); if (!w.near) return null;
  const U = api.ui, pay = "~" + api.fmtCash(Math.round(w.m * PLC.perM * conK(w.h) * api.payMul())), state = conState(c, w), title = `Plow the ${r.name}`;
  const str = `${w.n} stretch${w.n === 1 ? "" : "es"}`;
  return { obj: c, kind: "plowcon", auto: !api.FOOT.on && !!bladeOf(curUid()), tgt: { x: w.near.mx, z: w.near.mz, name: r.name, isSnow: true }, col: "var(--signal)", title,
    chips: U.chip("PLOW CONTRACT") + (w.shut ? U.chip("SHUT", "due") : ""), meta: `${str}, ${(w.m / 1000).toFixed(1)} km under snow · ${state}`, pay,
    hud: d => ({ title, sub: `${U.fmtMi(d)} · ${str} to open · ${pay} · ${state}` }) };
}
/* ---------------- plow drivers (5.4a1, 5.4a2): someone on the books plows a contract road ----------------
   A road contract you hold is a place a plow driver can work (tlx-staff.js: the role and the place come from here,
   TLX.staff.addRole / addPlaces; applicants, interviews, wages, happiness and notice are all staff's). An applicant
   either has a truck and blade of their own (kit "own") and keeps PDR.cut of what the kommune pays for the stretches
   THEY open, the rest paid to you at once (conPay's share), or has none (kit "mine", PDR.mine of them, 5.4a2) and
   drives a truck of YOURS: all the pay is yours, and so are the diesel and the cutting edge. Both on a weekly wage.
   The work is stepped with the contract's clock (pdrRun, called by conStep for each road): HOME until a stretch is due
   and the weather at the road's first end is under the council's limit, then PDR.wait hours (over their skill) to get
   going; OUT along the road from its first end, PDR.vRoad m a game hour over clean stretches and PDR.v x skill over the
   ones with snow, each due stretch opened as they reach its far end (TLXR.plowSeg, quietly) and paid by its own clock; a
   storm over them and they sit it out where they are; BACK in at PDR.vRoad once nothing is due, or the kommune's own truck
   has the road (cover). Skill = (PDR.xp[0] + PDR.xp[1] x REAL years, to PDR.xp[2]) x TLX.staff.workAt (the hidden work
   trait x happiness; 0 while wages are owed: they do not go out). A slow driver still earns you warnings: nothing in the
   contract's rules changes. SLEPT THROUGH (pdrSleep): every due stretch the driver would have reached before the
   kommune's PLC.lateH (its clock + the wait + the drive there) is theirs, paid by that clock, and no warning; a shut
   stretch they would have been late for is left to the contract's own rule (the kommune's truck, a warning).
   YOUR TRUCK (5.4a2). ASSIGN on the driver's Staff card (PDROLE.acts / act) names one of your trucks with a blade
   fitted; it stays yours to drive while they are in. When they set out they take it (pdrTake: TLXV.setOut, so it is not
   at its parking spot, cannot be got into, is no wall and has no Map pin) and bring it back to the same spot (pdrHome,
   once you are clear of it). What stops them going (pdrKitWhy: no truck assigned, no blade on it, you sitting
   in it, a trailer hitched to it, the edge ragged, the tank empty) is a notification, once, and they wait. Out, the tank
   burns PDR.lkm litres a km x the truck's burn (more with the blade cutting) and the edge wears by the metres cut, as
   under you (a blade under BL.both wide cuts each stretch twice, at half the speed); a tank down to the drive home plus
   PDR.spare, or an edge gone ragged, sends them home with a line. RECALL brings them in and takes the truck off them;
   TAKE THE TRUCK BACK does that while they are in.
   SEEN (5.4b1, the block at PDS). While a driver is out their truck is on the road at p: yours (TLXV.outPose puts your
   truck's own model there) or their own (a plow truck in their paint, TLXV.ghost), blade down where it cuts, an amber
   beacon, a figure at the wheel, its own lane cut and a windrow thrown as it goes (near you), solid to you and to the traffic (a `led` car in TLXT.extra), a pin on the Map. A
   driver's OWN truck stands beside the road's first end while they are in. A game hour is 50 s, so the clock's pace
   (PDR.v, PDR.vRoad) is 80 to 240 m/s: within PDR.seeR of you the truck is held to PDR.seen instead, and the hours
   that costs the driver are taken off that road's due clocks (PDLOST), so watching your driver work earns no warning.
   SAVED in x.sys.plow: pdr { routeId: { st: "home" | "out" | "back", p (m along the route), w (hours waiting to set
   out), n, cash (stretches and your share this trip), wkN, wkCash (this week), who (the driver's staff id), truck (uid
   of yours, or null), f0 (its litres when they took it), told, why, rc (recalled), hold (back, the spot not clear),
   a (m driven of your truck's line between its spot and the road, 5.4b2b: the block at PDA) } },
   and on the truck's own record (tlx-vehicles.js) out / outBy while it is away.
   HAILED (5.4b2a, the block at pdrHailed): on foot beside a truck that is out, the use control stops it for a word.
   FROM ITS SPOT (5.4b2b, the block at PDA): your truck drives a line from its parking spot to the road's first end
   before p starts, and back along it after p is 0 again.
   STUCK (5.4c1, the block at pdrBogRisk): cutting a stretch drifted deeper than their blade copes with, or a grade while
   it snows, a driver may bog: st "stuck" (+ sk, tow, gone, bogI), a ping, and PAY A TOW on their Staff card.
   SEND SOMEONE (5.4c2a, the block at pdrAidLine): another road's driver who is in goes and pulls them out: on the bogged
   record help (the helper's road id), on the helper's aid (the road they went to), aidL (m of the drive), aidT (hours
   until the truck is free: the drive + PDR.aid.hitch), aidB (hours of the drive back left). All saved. */
const PDR = { wage: [150, 8], cut: 0.4, v: 4000, vRoad: 12000, wait: 0.75, xp: [0.7, 0.03, 10],
  mine: 0.5,        // the share of applicants with no truck of their own (5.4a2)
  lkm: [0.5, 1.2],  // litres a km x the truck's burn: on a clean road, with the blade cutting
  spare: 3,         // litres over the drive home at which they turn back (and under which they do not set out)
  clearR: 6,        // m: your truck is put back on its spot once you (and what you ride) are this far from it
  // 5.4b1, the truck seen: within seeR m of you it drives at a truck's real speed, seen[0] m/s with the blade cutting and
  // seen[1] on a clean road, and waits stopFor m short of you in its lane; park: where a driver's own truck stands at home,
  // [first, last metre along the road looked at, m beyond the plowed edge]; own: their truck and blade; tints: its paint
  seeR: 600, seen: [7, 12.5], stopFor: 11, cutR: 320,   // cutR: within this of you its blade cuts its own lane as it goes
  park: [14, 220, 3.4], own: ["plowtruck", "b35"],
  // 5.4b2a, the hail: on foot within hailR m of a truck that is out, the use control stops it for hailT seconds (or until
  // you wave it on, or walk hailOff m away); a word in person (the Staff app's PRAISE / CRITICISE) is had within the same 30 m
  hailR: 30, hailT: 60, hailOff: 45,
  // 5.4b2b, your truck's drive between its parking spot and the road: wayMax m (straight) from the spot to where it joins
  // the roads, beyond which there is no line (0 = no drive at all: on the road at once); wayG the search's cell, wayPad how
  // far outside the two ends it may look; wayV m/s in your sight over the ground that is not a road (seen[1] on the roads
  // on the way); wayStop m short of its spot where it waits while you stand on it; wayOff the cost of ground not plowed
  wayMax: 800, wayG: 3, wayPad: 150, wayV: 5.5, wayStop: 16, wayOff: 5,
  // 5.4c1, stuck (the block at pdrBogRisk): km bogs a km cut at the worst (a stretch drifted level, skill 1); deep: the
  // share of the snowpack a stretch must be drifted to before a blade h m tall can bog; grade / wx [from, to] and hill: a
  // grade while it snows adds up to hill of that; walk: hours until they walk home; mood: lost each hour stuck;
  // tow: [$, $ a km from the garage, hours until it is there]; off m / skew rad: how the bogged truck sits
  bog: { km: 0.3, deep: 0.65, h: 1.15, grade: [0.05, 0.12], wx: [0.25, 0.55], hill: 0.6, walk: 6, mood: 5, tow: [120, 20, 1], off: 1.1, skew: 0.3, rnd: () => Math.random() },
  // 5.4c2a, SEND SOMEONE (the block at pdrAidLine): hitch: hours the other driver needs at the bogged truck to rope up
  // and pull it onto the cut, after the drive there at vRoad
  // 5.4c2b1, the helper seen (the block at pdrSeeAid): gap m short of the bogged truck's place on the crown where the
  // helper stops and turns its tail to it; pull: the last share of the hitch hours in which the rope is taut and the
  // bogged truck comes back haul m onto the cut (the helper creeps the same haul m toward home); hookY m over the
  // underside of the body where the rope is made fast
  aid: { hitch: 0.5, gap: 11, pull: 0.25, haul: 2.5, hookY: 0.4 },
  tints: [0xffffff, 0xb9cfe6, 0xe6c9a0, 0xbfe0c2, 0xe2b3ac, 0xcfd3d8, 0xe9e2a8] };
const pdrPid = id => "plow:" + id;
const pdrOf = id => (TLX.staff && TLX.staff.at ? TLX.staff.at(pdrPid(id)) : null);
const pdrSkill = (m, id) => (m ? (PDR.xp[0] + PDR.xp[1] * Math.min(PDR.xp[2], Math.max(0, m.xpReal | 0))) * TLX.staff.workAt(pdrPid(id)) : 0);
const pdrFirst = m => String(m.name || "Your driver").split(" ")[0];
const pdrNote = (title, body, kind) => { try { api.TABLET.notify({ app: "plow", kind: kind || "info", title, body, ttl: 7 }); } catch (e) { } };
const pdrDue = (c, r) => Object.keys(c.due || {}).map(Number).filter(i => r.seg[i] && r.seg[i].legs.length && r.st.s[i] >= PLC.due).sort((a, b) => a - b);
const pdrMine = m => !!m && m.kit === "mine";
const pdrRec = uid => (uid == null ? null : trucks().find(t => String(t.uid) === String(uid)) || null);
const pdrDef = t => (window.TLXV ? TLXV.VEHICLES.find(v => v.id === t.id) : null) || { name: "truck", burn: 1 };
const pdrTName = t => pdrDef(t).name;
const pdrPasses = uid => { const d = bladeOf(uid); return d && d.w * Math.cos(d.ang) < BL.both ? 2 : 1; };   // a narrow blade cuts each side of the centre line
const pdrFuel = t => (curUid() === t.uid ? api.GS.fuel : t.fuel);
const pdrShare = m => (pdrMine(m) ? 1 : 1 - PDR.cut);
const pdrTheirs = m => (pdrMine(m) ? "all of it yours" : `to you after their ${Math.round(PDR.cut * 100)}%`);
function pdrTidy(s) {
  if (!obj0(s.pdr)) s.pdr = {};
  for (const id of Object.keys(s.pdr)) {
    const q = s.pdr[id]; if (!obj0(q) || !s.con || !s.con[id]) { if (obj0(q)) pdrFree(q); delete s.pdr[id]; continue; }
    if (q.st !== "out" && q.st !== "back" && q.st !== "stuck") q.st = "home";
    q.gone = !!q.gone && q.st === "stuck"; q.bogI = Number.isInteger(q.bogI) ? q.bogI : -1; if (q.st !== "stuck") { q.sk = 0; q.tow = 0; }
    for (const k of ["p", "w", "n", "cash", "wkN", "wkCash", "a", "sk", "tow", "aidT", "aidB", "aidL"]) q[k] = Number.isFinite(q[k]) ? Math.max(0, q[k]) : 0;
    /* 5.4c2a: help is the road whose driver is coming (bogged records only); aid the road this driver went to help on (only from home) */
    q.help = typeof q.help === "string" && q.st === "stuck" && !q.gone && q.help !== id ? q.help : "";
    q.aid = typeof q.aid === "string" && q.st === "home" && q.aid !== id ? q.aid : "";
    if (q.aid && !(Number.isFinite(q.aidX) && Number.isFinite(q.aidZ))) { delete q.aidX; delete q.aidZ; }   /* 5.4c2b1: where they were sent to (a save from before it: the bogged truck's own place) */
    if (!q.aid) pdrAidClr(q); else { q.aidT = Math.min(q.aidT, 48); q.aidB = Math.min(q.aidB, 48); q.aidL = Math.min(q.aidL, 2e5); if (!(q.aidT > 0) && !(q.aidB > 0)) q.aidB = 1e-6; }
    if (q.truck != null && !pdrRec(q.truck)) q.truck = null;                     /* the truck is gone */
    q.told = typeof q.told === "string" ? q.told : ""; q.why = typeof q.why === "string" ? q.why : ""; q.rc = !!q.rc; q.hold = !!q.hold;
    if (!Number.isFinite(q.f0)) q.f0 = 0;
  }
  pdrSweep();
}
/* a truck marked out by a driver that no driver has out any more comes home (a save edited, a road gone mid-trip) */
function pdrSweep() {
  const s = S(); if (!s || !window.TLXV || !TLXV.setOut) return;
  const held = new Set(); if (obj0(s.pdr)) for (const id of Object.keys(s.pdr)) { const q = s.pdr[id]; if (obj0(q) && q.truck != null && (q.st !== "home" || q.aid)) held.add(String(q.truck)); }
  for (const t of trucks()) if (t.out && t.outBy === "plow" && !held.has(String(t.uid))) TLXV.setOut(t.uid, null);
}
function pdrFree(q) { const t = pdrRec(q.truck); if (t && t.out && t.outBy === "plow" && window.TLXV && TLXV.setOut) TLXV.setOut(t.uid, null); }
function pdrHitched(uid) { const V = window.TLXV; if (!V) return false; const h = V.haul && V.haul(); return (V.rigOn && V.rigOn() === uid) || !!(h && h.on === uid); }
/* why a driver without a truck of their own cannot set out now ("" = they can) */
function pdrKitWhy(q) {
  const t = pdrRec(q.truck); if (!t) return "no truck of yours is assigned to them";
  const n = pdrTName(t);
  if (!bladeOf(t.uid)) return `the ${n} has no blade fitted`;
  if (t.out) return `the ${n} is out`;
  if (curUid() === t.uid && (!api.FOOT.on || !api.swapOk())) return `you are in the ${n}`;
  if (pdrHitched(t.uid)) return `a trailer is hitched to the ${n}`;
  if (condOf(t.uid) < BL.ragged) return `the ${n}'s cutting edge is worn ragged`;
  if (pdrFuel(t) <= PDR.spare + 1) return `the ${n}'s tank is empty`;
  return "";
}
function pdrTake(q, m, r) {                                                      // the driver takes your truck from its spot
  const t = pdrRec(q.truck); if (!t) return false;
  if (curUid() === t.uid) TLXV.swapTo(null);                                     /* you were standing beside it: it is theirs now, the sled is yours */
  if (curUid() === t.uid || !TLXV.setOut(t.uid, `with ${m.name} on the ${r.name}`, "plow")) return false;
  const B = RTB.get(String(t.uid)); if (B) { if (B.carry > 0) spill(B, t.uid); B.down = false; B.grit = false; B.hold = null; }
  q.f0 = t.fuel; return true;
}
function pdrSpotClear(t) {                                                       // neither you nor the machine you are on stands on the truck's parking spot (trucks parked beside it on the forecourt are no matter)
  const near = p => !!p && Math.hypot(p.x - t.x, p.z - t.z) < PDR.clearR;
  return !(near(api.P) || (api.FOOT.on && near(api.FOOT)));
}
function pdrOpen(c, r, i, q, share) {                                            // the driver's blade has reached the far end of due stretch i
  const SEG = window.TLXR.ROADS.seg, sn = Math.max(r.st.s[i], PLC.due);
  window.TLXR.plowSeg(r.id, i * SEG + 1, true); RC.delete(r.id + ":" + i);
  const s = S(); s.opened = (s.opened || 0) + 1;
  const pd = conPay(r, i, sn, share); if (!pd) return 0;
  q.n++; q.cash += pd.cash; q.wkN++; q.wkCash += pd.cash;
  return pd.cash;
}
function pdrHome(c, r, q, m, why) {
  const mine = pdrMine(m), t = mine ? pdrRec(q.truck) : null; why = why || q.why || "";
  if (mine) pdrFree(q);
  q.st = "home"; q.p = 0; q.a = 0; q.w = 0; q.hold = false; pdrUnbog(q);
  const kit = t ? ` · ${Math.max(0, Math.round(q.f0 - t.fuel))} L of your diesel, the cutting edge at ${pct(condOf(t.uid))}%` : "";
  if (q.n > 0) pdrNote(`${m.name} is back in`, `${q.n} stretch${q.n === 1 ? "" : "es"} of the ${r.name} opened · ${api.fmtCash(q.cash)} ${pdrTheirs(m)}${kit}${why ? " · " + why : ""}`, "good");
  else if (mine && why) pdrNote(`${m.name} is back in`, `Nothing opened on the ${r.name}: ${why}.${t ? ` The ${pdrTName(t)} is back on its spot.` : ""}`, "warn");
  if (q.rc) { q.truck = null; q.rc = false; }
  q.n = 0; q.cash = 0; q.why = ""; q.told = ""; api.save(); conRefresh(); try { api.TABLET.refresh("staff"); } catch (e) { }
}
function pdrSleep(c, r, q, m, k) {                                               // a jump of hours: what the driver opened while you were away
  const SEG = window.TLXR.ROADS.seg, due = Object.keys(c.due || {}).map(Number).filter(i => r.seg[i] && r.seg[i].legs.length).sort((a, b) => a - b);
  if (!(k > 0) || c.cover || !due.length) return;
  const mine = pdrMine(m); let T = null, burn = 0, pas = 1, f0 = 0, AL = 0;
  if (mine) {
    if (q.st === "home" && pdrKitWhy(q)) return;                                 /* no truck to take: the road is the contract's own business */
    T = pdrRec(q.truck); if (!T) return;
    burn = pdrDef(T).burn || 1; pas = pdrPasses(T.uid); f0 = T.fuel;
    const A = pdrWay(r, q); AL = A ? A.len : 0;                                  /* 5.4b2b: the drive from its spot to the road and back is in the hours and the diesel */
  }
  let t = PDR.wait / k, at = -AL, n = 0, cash = 0, stop = "";
  for (const i of due) {
    const len = conLen(r, i), gap = Math.max(0, i * SEG - at);
    if (T) {
      const use = (gap * PDR.lkm[0] + len * PDR.lkm[1] * pas) / 1000 * burn, home = (i * SEG + len + AL) / 1000 * burn * PDR.lkm[0];
      if (condOf(T.uid) < BL.ragged) { stop = "the cutting edge is worn ragged"; break; }
      if (T.fuel - use < home + PDR.spare) { stop = "the tank was nearly dry"; break; }
    }
    t += gap / PDR.vRoad + len * pas / (PDR.v * k); const at1 = i * SEG + len;
    const d = c.due[i], h = d[0] + t; if (d[1] && h >= PLC.lateH) { if (T) T.fuel = Math.max(0, T.fuel - (gap + len) / 1000 * burn * PDR.lkm[0]); at = at1; continue; }   /* too late for this one: the kommune's truck, and the contract's own rule */
    if (T) { T.fuel = Math.max(0, T.fuel - (gap * PDR.lkm[0] + len * PDR.lkm[1] * pas) / 1000 * burn); const b = S().blades[T.uid]; if (b) b.cond = Math.max(0, condOf(T.uid) - len * pas / BL.wearM); }
    at = at1; d[0] = h; const got = pdrOpen(c, r, i, q, pdrShare(m)); if (got) { n++; cash += got; }
  }
  if (T) { T.fuel = Math.max(0, T.fuel - (at + AL) / 1000 * burn * PDR.lkm[0]); pdrFree(q); }
  q.st = "home"; q.p = 0; q.a = 0; q.w = 0; q.n = 0; q.cash = 0; q.hold = false; q.why = ""; pdrUnbog(q); if (q.rc) { q.truck = null; q.rc = false; }
  const kit = T ? ` · ${Math.max(0, Math.round(f0 - T.fuel))} L of your diesel, the cutting edge at ${pct(condOf(T.uid))}%${stop ? " · they stopped there: " + stop : ""}` : "";
  if (n) pdrNote(`${m.name} plowed while you were away`, `${n} stretch${n === 1 ? "" : "es"} of the ${r.name} opened · ${api.fmtCash(cash)} ${pdrTheirs(m)}${kit}`, "good");
  else if (T && stop) pdrNote(`${m.name} could not plow while you were away`, `The ${r.name}: ${stop}.`, "warn");
}
/* ---- 5.4c1: stuck ----
   A driver cutting a due stretch may bog (pdrBogRisk: bogs a km; pdrRun rolls it on the metres cut): where the stretch is
   drifted deeper than their blade copes with (PDR.bog.deep of the snowpack for a blade PDR.bog.h tall, a lower blade in
   proportion), or on a grade while it snows; a slow driver (skill) bogs more. No bog on a clean stretch, on the line from
   the truck's spot, heading in, or asleep (pdrSleep), and never twice in one stretch of one trip (q.bogI).
   STUCK (q.st "stuck", saved with sk hours stuck, tow hours until a paid tow is there, gone, bogI): the truck stands
   where it bogged, nosed toward the windrow with its blade in the drift; the road's clocks run on, so its stretches run
   late by the contract's own rule. THE PING: a notification, a row in Jobs (pdrJob, trackable: the compass leads to the
   truck), the Map pin reads STUCK, the cards and the hailed driver say so. Each whole hour stuck costs the driver
   PDR.bog.mood of mood (TLX.staff.dent); after PDR.bog.walk hours they walk home (gone: nobody in the truck, lamps off, a
   word is had at the garage) and the truck stays until it is fetched.
   PAY A TOW (pdrTow, a button on the driver's Staff card): PDR.bog.tow dollars + dollars a km from the garage, there in
   tow[2] game hours; with the driver in it they plow on from there, an abandoned truck is brought in (yours to its spot).
   Not here: towing them yourself and sending another driver (5.4c2). */
const pdrHrs = v => (!(v > 0) ? "a moment" : v >= 1 ? Math.round(v) + " h" : Math.max(1, Math.round(v * 60)) + " min");
function pdrUnbog(q) { q.sk = 0; q.tow = 0; q.gone = false; q.bogI = -1; q.help = ""; }
function pdrAidClr(q) { q.aid = ""; q.aidT = 0; q.aidB = 0; q.aidL = 0; delete q.aidX; delete q.aidZ; }
function pdrBogRisk(r, q, i, k, d) {                                             // bogs a km on due stretch i, for a driver of skill k behind blade d (null: their own)
  const b = PDR.bog; if (!(b.km > 0)) return 0;
  const bh = (d || BLADES.find(v => v.id === PDR.own[1]) || { h: b.h }).h, lim = b.deep * Math.min(1, bh / b.h), sn = r.st.s[i], over = sn > lim ? (sn - lim) / Math.max(0.05, 1 - lim) : 0;
  const pt = pdrPt(r, q.p), wk = api.sstep(b.wx[0], b.wx[1], api.WX.at(pt.x, pt.z)); let hill = 0;
  if (wk > 0) { const W = api.world, a = pdrPt(r, q.p - 15), z = pdrPt(r, q.p + 15), run = Math.hypot(z.x - a.x, z.z - a.z); if (run > 1) hill = wk * api.sstep(b.grade[0], b.grade[1], Math.abs(W.groundAt(z.x, z.z) - W.groundAt(a.x, a.z)) / run); }
  return b.km * (over + b.hill * hill) / Math.max(0.4, k);
}
function pdrTowCost(r, q) { const g = api.world.garage(), p = pdrPos(r, q), b = PDR.bog.tow; return Math.round((b[0] + b[1] * Math.hypot(p.x - g.x, p.z - g.z) / 1000) / 5) * 5; }
function pdrBog(c, r, q, m, i, T) {
  pdrUnbog(q); q.st = "stuck"; q.bogI = i;
  const Z = PDS.get(r.id); if (Z && Z.hail > 0) pdrWave(r.id, true);
  pdrNote(`${m.name} is stuck`, `Bogged in the drift ${(q.p / 1000).toFixed(1)} km along the ${r.name}${T ? `, in your ${pdrTName(T)}` : ""}. PAY A TOW on their card in the Staff app (${api.fmtCash(pdrTowCost(r, q))})${pdrAidAble(r.id).length ? ", SEND another driver of yours from the same card (free, but slower)" : ""}, or leave them: after ${PDR.bog.walk} h in the cold they walk home and the truck stays where it is.`, "warn");
  try { api.ui.ping("note"); } catch (e) { }
  api.save(); conRefresh(); try { api.TABLET.refresh("staff"); } catch (e) { }
}
function pdrTowed(c, r, q, m, T) {                                               // the paid tow has reached the truck
  const km = (q.p / 1000).toFixed(1), was = q.gone, bi = q.bogI, me = pdrFirst(m);
  if (!was) {
    q.sk = 0; q.tow = 0; q.st = "out"; q.bogI = bi;
    pdrNote(`${m.name} is moving again`, `The tow truck pulled ${T ? `your ${pdrTName(T)}` : "their truck"} back onto the cut, ${km} km along the ${r.name}. They are plowing on.`, "good");
    api.save(); conRefresh(); try { api.TABLET.refresh("staff"); } catch (e) { }
    return;
  }
  pdrNote(`The tow truck has brought ${T ? `your ${pdrTName(T)}` : `${me}'s truck`} in`, `Fetched from ${km} km along the ${r.name}${T ? ": it is back on its spot" : ""}. ${me} can go out again.`, "good");
  pdrHome(c, r, q, m, "");
}
function pdrStuck(c, r, q, m, dh) {                                              // the clock of a bogged truck
  const b = PDR.bog, mine = pdrMine(m), T = mine ? pdrRec(q.truck) : null;
  if (mine && !T) { pdrHome(c, r, q, m, "the truck is no longer yours"); return; }
  if (!(dh > 0)) return;
  if (!Number.isFinite(q.sk) || q.sk < 0) q.sk = 0;
  /* 5.4c2a: another driver of yours is on the way: the hours stuck stop at their arrival, and nobody walks home from help that is coming */
  let hq = null;
  if (q.help) {
    const h2 = S().pdr[q.help]; hq = obj0(h2) && h2.aid === r.id && !(h2.aidB > 0) && pdrOf(q.help) ? h2 : null;
    if (!hq) { q.help = ""; pdrNote(`Nobody is coming for ${pdrFirst(m)} after all`, `The driver you sent out to the ${r.name} is no longer on the way. ${pdrFirst(m)} is still bogged ${(q.p / 1000).toFixed(1)} km along it: PAY A TOW or SEND SOMEONE on their card in the Staff app.`, "warn"); conRefresh(); try { api.TABLET.refresh("staff"); } catch (e) { } }
  }
  /* 5.4c2b1: the hours the helper lost to driving at a truck's real speed in your sight are not hours in the cold, and not hours on this road's clocks */
  const lk = hq && dh <= 0.05 ? Math.max(0, Math.min(1, PDAIDK[q.help] || 0)) : 0; if (lk > 0) PDLOST[r.id] = dh * lk;
  const arrive = q.tow > 0 && q.tow <= dh + 1e-9, eff = arrive ? q.tow : hq ? Math.min(dh * (1 - lk), Math.max(0, hq.aidT)) : dh, sk0 = q.sk;
  q.sk += eff; if (q.tow > 0) q.tow = arrive ? 0 : q.tow - dh;
  if (!q.gone && hq) { const n = Math.floor(Math.min(q.sk, b.walk) + 1e-9) - Math.floor(Math.min(sk0, b.walk) + 1e-9); if (n > 0 && TLX.staff && TLX.staff.dent) TLX.staff.dent(pdrPid(r.id), b.mood * n); }
  else if (!q.gone) {
    const n = Math.floor(Math.min(q.sk, b.walk) + 1e-9) - Math.floor(Math.min(sk0, b.walk) + 1e-9);
    if (n > 0 && TLX.staff && TLX.staff.dent) TLX.staff.dent(pdrPid(r.id), b.mood * n);
    if (q.sk >= b.walk) {
      q.gone = true; const Z = PDS.get(r.id); if (Z && Z.hail > 0) pdrWave(r.id, true);
      if (!arrive) { pdrNote(`${m.name} has walked home`, `${b.walk} h bogged on the ${r.name} was enough. ${T ? `Your ${pdrTName(T)}` : "Their truck"} stands ${(q.p / 1000).toFixed(1)} km along it until a tow fetches it${q.tow > 0 ? " (the tow truck is on its way)" : ": PAY A TOW on their card in the Staff app"}.`, "warn"); api.save(); conRefresh(); try { api.TABLET.refresh("staff"); } catch (e) { } }
    }
  }
  if (arrive) pdrTowed(c, r, q, m, T);
}
function pdrTow(id) {                                                            // PAY A TOW
  const s = S(), q = s.pdr && s.pdr[id], c = s.con && s.con[id], m = pdrOf(id), r = c && conR().find(v => v.id === id); if (!obj0(q) || !m || !r || q.st !== "stuck" || q.tow > 0 || q.help) return false;
  const cost = pdrTowCost(r, q), GS = api.GS;
  if (!(GS.cash >= cost)) { api.toast(`A tow out on the ${r.name} is ${api.fmtCash(cost)}. You have ${api.fmtCash(GS.cash)}.`, "warn"); return false; }
  GS.cash -= cost; q.tow = PDR.bog.tow[2];
  api.toast(`${api.fmtCash(cost)} paid. The tow truck is on its way out to ${q.gone ? "the truck" : pdrFirst(m)} on the ${r.name}: there in about ${pdrHrs(q.tow)}.`, "good");
  api.save(); conRefresh(); try { api.TABLET.refresh("staff"); } catch (e) { }
  return true;
}
function pdrJob(k) {                                                             // the ping's row in Jobs: the k-th truck of a driver of yours that is stuck
  const s = S(); if (!s || !obj0(s.pdr) || !window.TLXR || !TLXR.ready) return null;
  const id = Object.keys(s.pdr).filter(i => obj0(s.pdr[i]) && s.pdr[i].st === "stuck" && s.con && s.con[i] && pdrOf(i))[k]; if (!id) return null;
  const q = s.pdr[id], m = pdrOf(id), r = conR().find(v => v.id === id); if (!r) return null;
  const p = pdrPos(r, q), U = api.ui, me = pdrFirst(m), title = q.gone ? `${me}'s truck is stuck on the ${r.name}` : `${me} is stuck on the ${r.name}`;
  const hm = q.help ? pdrOf(q.help) : null;
  const state = hm ? `${pdrFirst(hm)} is on the way to pull them out` : q.tow > 0 ? "the tow truck is on its way" : q.gone ? "left there until a tow fetches it" : `${pdrHrs(q.sk)} in the cold · walks home after ${PDR.bog.walk} h`;
  return { obj: q, kind: "plowstuck", auto: false, tgt: { x: p.x, z: p.z, name: `${me}'s truck`, isSnow: true }, col: "var(--signal)", title,
    chips: U.chip("STUCK", "due") + (hm ? U.chip("HELP COMING", "ok") : q.tow > 0 ? U.chip("TOW COMING", "ok") : ""), meta: `${(q.p / 1000).toFixed(1)} km along · ${state}`, pay: q.tow > 0 || hm ? "" : "tow " + api.fmtCash(pdrTowCost(r, q)),
    hud: d => ({ title, sub: `${U.fmtMi(d)} · ${state}` }) };
}
/* ---- 5.4c2a: SEND SOMEONE ----
   The second way out of a bog: another road's driver, who is in, drives to the bogged truck and pulls it back onto the
   cut. SEND <NAME> on the bogged driver's Staff card, one button for each driver who can go (pdrAidAble / pdrAidWhy: in,
   paid, not already away, and with a truck: their own, or yours with the diesel for the drive there and back). It costs
   no money: the drive there by road at PDR.vRoad (pdrAidLine: TLXR.tripLine from where their truck stands to the bogged
   one) plus PDR.aid.hitch hours roping up, then the same drive back, and until they are in again their own road waits
   (pdrRun does nothing else for them, asleep or awake). In YOUR truck the diesel for both legs is yours and the truck is
   away from its spot (pdrTake / pdrFree, as when they plow).
   On the clock: helper.aidT runs down (pdrAid); at 0 the bogged driver is free (pdrHelped: st "out", they plow on, no
   second bog in that stretch) and helper.aidB, the drive back, starts. While help is coming the bogged driver does not
   walk home (the hours still cost mood) and a tow cannot be paid on top. If the bogged truck is freed some other way, its
   driver let go or its road handed back, the helper turns round where they are; if the helper is let go or their road is
   handed back, the bogged driver is told nobody is coming (pdrStuck).
   Told: a toast, notifications at each turn, both cards (pdrWhere), the Jobs row (HELP COMING), the hailed driver, and a
   Map pin for the helper that moves along the line. The helper's truck on the road, the rope and the pull are 5.4c2b1
   (the block at pdrSeeAid). NOT here (5.4c2b2): towing them yourself. */
const PDAID = new Map();                                                         // helper's road id -> { key, pts, cum, len }: the line they drive (session only, worked out again after a reload)
const PDAIDK = {};                                                               // helper's road id -> the share of the last step's hours they lost to your sight (5.4c2b1)
function pdrAidFrom(r2, q2, m2) {                                                // where the helper's truck stands: yours on its spot, their own beside their road
  if (pdrMine(m2)) { const t = pdrRec(q2.truck); return t && Number.isFinite(t.x) && Number.isFinite(t.z) ? [t.x, t.z] : null; }
  const sp = pdrSpot(r2); return sp ? [sp.x, sp.z] : [r2.pts[0][0], r2.pts[0][1]];
}
function pdrAidLine(id2, id) {
  const s = S(), rs = conR(), r2 = rs.find(v => v.id === id2), q2 = s.pdr && s.pdr[id2], m2 = pdrOf(id2);
  if (!r2 || !obj0(q2) || !m2) return null;
  /* 5.4c2b1: once sent, the far end is where the bogged truck stood at the send (saved), whatever becomes of that truck or its driver */
  let b = null;
  if (q2.aid === id && Number.isFinite(q2.aidX) && Number.isFinite(q2.aidZ)) b = { x: q2.aidX, z: q2.aidZ };
  else { const r = rs.find(v => v.id === id), q = s.pdr && s.pdr[id]; if (!r || !obj0(q)) return null; b = pdrPos(r, q); }
  const a = pdrAidFrom(r2, q2, m2); if (!a || !Number.isFinite(b.x)) return null;
  const key = [id, Math.round(a[0]), Math.round(a[1]), Math.round(b.x), Math.round(b.z), PDR.wayMax].join(":"); let A = PDAID.get(id2);
  if (A && A.key === key) return A;
  let road = null; try { road = window.TLXR.tripLine(a[0], a[1], b.x, b.z); } catch (e) { road = null; }
  /* a truck of yours leaves its parking spot over the ground as it does to plow (5.4b2b's search), not through a wall */
  let first = [a];
  if (road && road.length && pdrMine(m2) && PDR.wayMax > 0) {
    const J = road[0], d = Math.hypot(J[0] - a[0], J[1] - a[1]);
    if (d >= 1 && d <= PDR.wayMax) { try { const g = pdrGrid(a[0], a[1], J[0], J[1], (pdrRec(q2.truck) || {}).uid); if (g && g.length) first = g; } catch (e) { } }
  }
  const raw = first.concat(road || [], [[b.x, b.z]]), pts = [raw[0]], cum = [0];
  for (let i = 1; i < raw.length; i++) { const l = pts[pts.length - 1], d = Math.hypot(raw[i][0] - l[0], raw[i][1] - l[1]); if (!(d >= 0.4)) continue; pts.push(raw[i]); cum.push(cum[cum.length - 1] + d); }
  if (pts.length < 2) { pts.push([a[0] + 1, a[1]]); cum.push(1); }
  A = { key, pts, cum, len: cum[cum.length - 1] }; PDAID.set(id2, A); return A;
}
function pdrAidWhy(id2, id) {                                                    // why the driver of road id2 cannot be sent to the truck bogged on road id ("" = they can)
  const s = S(), m2 = pdrOf(id2), q2 = s.pdr && s.pdr[id2], c2 = s.con && s.con[id2]; if (id2 === id || !m2 || !c2) return "no such driver";
  const me = pdrFirst(m2);
  if (!obj0(q2)) return `${me} has only just started`;
  if (q2.aid) return `${me} is already away helping`;
  if (q2.st !== "home") return `${me} is out on the ${c2.name}`;
  if (!(pdrSkill(m2, id2) > 0)) return `${me} is not going anywhere while wages are owed`;
  const A = pdrAidLine(id2, id); if (!A) return `${me} has no truck to come in`;
  if (pdrMine(m2)) {
    const t = pdrRec(q2.truck); if (!t) return `${me} has no truck: none of yours is assigned to them`;
    const n = pdrTName(t);
    if (t.out) return `the ${n} is out`;
    if (curUid() === t.uid && (!api.FOOT.on || !api.swapOk())) return `you are in the ${n}`;
    if (pdrHitched(t.uid)) return `a trailer is hitched to the ${n}`;
    if (!(pdrFuel(t) >= 2 * A.len / 1000 * (pdrDef(t).burn || 1) * PDR.lkm[0] + PDR.spare)) return `the ${n} has not the diesel for the drive there and back`;
  }
  return "";
}
const pdrAidHrs = A => A.len / PDR.vRoad + PDR.aid.hitch;
function pdrAidAble(id) {                                                        // the roads whose drivers could be sent to the truck bogged on road id
  const s = S(); if (!s || !obj0(s.con)) return [];
  return Object.keys(s.con).filter(k => k !== id && pdrOf(k) && !pdrAidWhy(k, id));
}
function pdrSend(id, id2) {                                                      // SEND SOMEONE: road id2's driver goes to the truck bogged on road id
  const s = S(), q = s.pdr && s.pdr[id], m = pdrOf(id), rs = conR(), r = rs.find(v => v.id === id), r2 = rs.find(v => v.id === id2);
  if (!obj0(q) || !m || !r || !r2 || q.st !== "stuck" || q.gone || q.tow > 0 || q.help) return false;
  const why = pdrAidWhy(id2, id); if (why) { api.toast(`Nobody sent: ${why}.`, "warn"); return false; }
  const q2 = s.pdr[id2], m2 = pdrOf(id2), A = pdrAidLine(id2, id);
  if (pdrMine(m2) && !pdrTake(q2, m2, r)) { api.toast(`Nobody sent: ${pdrFirst(m2)} could not take the truck.`, "warn"); return false; }
  { const e = A.pts[A.pts.length - 1]; q2.aidX = e[0]; q2.aidZ = e[1]; }         /* 5.4c2b1: the line's far end, kept */
  q2.aid = id; q2.aidL = A.len; q2.aidT = pdrAidHrs(A); q2.aidB = 0; q2.w = 0; q2.told = ""; q2.hold = false; q.help = id2;
  const T2 = pdrMine(m2) ? pdrRec(q2.truck) : null;
  api.toast(`${pdrFirst(m2)} is on the way out to ${pdrFirst(m)} on the ${r.name}${T2 ? ` in your ${pdrTName(T2)}` : ""}: ${(A.len / 1000).toFixed(1)} km by road, about ${pdrHrs(q2.aidT)} until the truck is free. The ${r2.name} waits until they are back.`, "good");
  api.save(); conRefresh(); try { api.TABLET.refresh("staff"); } catch (e) { }
  return true;
}
function pdrHelped(c, r, q, m, m2, r2) {                                         // the other driver has pulled the bogged truck back onto the cut
  const T = pdrMine(m) ? pdrRec(q.truck) : null, bi = q.bogI;
  q.sk = 0; q.tow = 0; q.help = ""; q.gone = false; q.st = "out"; q.bogI = bi;
  pdrNote(`${m.name} is moving again`, `${m2.name} pulled ${T ? `your ${pdrTName(T)}` : "their truck"} back onto the cut, ${(q.p / 1000).toFixed(1)} km along the ${r.name}, and is heading back to the ${r2.name}. ${pdrFirst(m)} is plowing on.`, "good");
  api.save(); conRefresh(); try { api.TABLET.refresh("staff"); } catch (e) { }
}
function pdrAid(r2, q2, m2, dh) {                                                // the clock of a driver who is away helping (their own road waits)
  const s = S(), id = q2.aid, q = s.pdr[id], c = s.con[id], rs = conR(), r = c ? rs.find(v => v.id === id) : null, m = pdrOf(id);
  const mine = pdrMine(m2), T = mine ? pdrRec(q2.truck) : null, kml = T ? (pdrDef(T).burn || 1) * PDR.lkm[0] : 0, tGo = q2.aidL / PDR.vRoad, name = (c && c.name) || "road";
  if (mine && !T) { pdrAidClr(q2); q2.hold = false; delete PDAIDK[r2.id]; return; }   /* the truck is no longer yours: they are simply in again */
  if (!(dh > 0)) return;
  const burn = h => { if (T && h > 0) T.fuel = Math.max(0, T.fuel - h * PDR.vRoad / 1000 * kml); };
  /* 5.4c2b1: in your sight the helper's truck keeps a truck's speed, and waits short of you in its lane (as a driver who
     is plowing does): kv is the share of the clock's pace it drives at, and the hours that costs are lost to nobody
     (PDLOST: off this road's due clocks; PDAIDK: off the bogged driver's hours in the cold and that road's clocks) */
  const sph = dh <= 0.05 && conSec > 0 ? conSec / dh : 0, seen = sph > 0 && pdrAidNear(r2.id), kv = !seen ? 1 : pdrBlocked(r2.id) ? 0 : Math.min(1, PDR.seen[1] * sph / PDR.vRoad);
  const dh0 = dh; let lost = 0;
  const drv = h => { const u = Math.min(dh * kv, h), took = kv > 0 ? u / kv : dh; lost += took - u; dh = Math.max(0, dh - took); burn(u); return u; };   /* h hours of driving wanted: the hours of it done */
  const fin = () => { const l = Math.max(0, Math.min(dh0, lost)); PDLOST[r2.id] = l; PDAIDK[r2.id] = l / dh0; };
  if (!(q2.aidB > 0)) {
    const live = obj0(q) && q.st === "stuck" && !q.gone && q.help === r2.id && !!m && !!r;
    if (!live) {                                                                 /* nothing left to pull: they turn round where they are */
      q2.aidB = Math.max(1e-6, Math.min(tGo, tGo + PDR.aid.hitch - q2.aidT)); q2.aidT = 0;
      pdrNote(`${m2.name} has turned round`, `Nobody is left to pull out on the ${name}: they are on the way back to the ${r2.name}.`); api.save(); conRefresh(); try { api.TABLET.refresh("staff"); } catch (e) { }
    } else {
      const drive = q2.aidT - PDR.aid.hitch;
      if (drive > 1e-9) { q2.aidT -= drv(drive); if (q2.aidT > PDR.aid.hitch + 1e-9) { fin(); return; } }
      const use = Math.min(dh, q2.aidT); q2.aidT -= use; dh -= use;
      if (q2.aidT > 1e-9) { fin(); return; }
      q2.aidT = 0; q2.aidB = Math.max(1e-6, tGo); pdrHelped(c, r, q, m, m2, r2);
    }
  }
  q2.aidB -= drv(q2.aidB); fin();
  if (q2.aidB > 1e-9) return;
  delete PDAIDK[r2.id];
  if (T && !pdrSpotClear(T)) {                                                   /* you stand on your truck's parking spot: they wait for you to move clear, as after a plow run */
    q2.aidB = 1e-6; if (!q2.hold) { q2.hold = true; pdrNote(`${m2.name} is back with the ${pdrTName(T)}`, "Something of yours stands on its parking spot: move clear and they put it back.", "warn"); conRefresh(); }
    return;
  }
  if (mine) pdrFree(q2);
  pdrAidClr(q2); q2.hold = false; q2.w = 0; PDAID.delete(r2.id);
  pdrNote(`${m2.name} is back in`, `Back from the ${name}${T ? `: ${Math.max(0, Math.round(q2.f0 - T.fuel))} L of your diesel, and the ${pdrTName(T)} is on its spot again` : ""}. The ${r2.name} is theirs again.`, "good");
  api.save(); conRefresh(); try { api.TABLET.refresh("staff"); } catch (e) { }
}
function pdrAidPos(id2) {                                                        // where the clock has a helper who is away, on the line they drive (null: not away)
  const s = S(), q2 = s && s.pdr && s.pdr[id2]; if (!obj0(q2) || !q2.aid) return null;
  const A = pdrAidLine(id2, q2.aid); if (!A || !(q2.aidL > 0)) return null;
  const m = q2.aidB > 0 ? q2.aidB * PDR.vRoad : q2.aidL - Math.max(0, q2.aidT - PDR.aid.hitch) * PDR.vRoad;
  return pdrPt(A, Math.max(0, Math.min(1, m / q2.aidL)) * A.len);
}
function pdrRun(c, r, dh, slept) {
  const s = S(), TR = window.TLXR; if (!obj0(s.pdr)) s.pdr = {};
  PDLOST[r.id] = 0;
  const m = pdrOf(r.id); let q = s.pdr[r.id];
  if (!m) { if (q) { pdrFree(q); delete s.pdr[r.id]; } return; }
  if (!q) q = s.pdr[r.id] = { st: "home", p: 0, w: 0, n: 0, cash: 0, wkN: 0, wkCash: 0, who: m.id, truck: null, f0: 0, told: "", why: "", rc: false, hold: false };
  const mine = pdrMine(m);
  if (q.who !== m.id) {                                                          /* someone new on this road: the last one's truck comes home */
    const was = q.who; q.who = m.id;
    if (was != null) { pdrFree(q); q.truck = null; q.st = "home"; q.p = 0; q.w = 0; q.n = 0; q.cash = 0; q.told = q.why = ""; q.rc = q.hold = false; pdrUnbog(q); pdrAidClr(q); }
  }
  if (!mine && q.truck != null) { pdrFree(q); q.truck = null; }
  const k = pdrSkill(m, r.id), RD = TR.ROADS, SEG = RD.seg, WX = api.WX;
  if (q.st === "stuck") { pdrStuck(c, r, q, m, dh); return; }                    /* 5.4c1: bogged: no work, asleep or awake, wages paid or owed */
  if (q.aid) { if (q.st !== "home") pdrAidClr(q); else { pdrAid(r, q, m, dh); return; } }   /* 5.4c2a: away pulling another driver out: their own road waits */
  if (slept) { pdrSleep(c, r, q, m, k); return; }
  if (!(dh > 0)) return;
  if (!(k > 0)) { if (q.st !== "home") pdrHome(c, r, q, m, "home again: wages are owed"); q.w = 0; return; }
  const due = pdrDue(c, r);
  if (q.st === "home") {
    if (!due.length) q.told = "";
    if (!due.length || c.cover || WX.at(r.pts[0][0], r.pts[0][1]) >= RD.plowWx) { q.w = 0; return; }
    if (mine) {
      const why = pdrKitWhy(q);
      if (why) { if (q.told !== why) { q.told = why; pdrNote(`${m.name} cannot go out`, `Snow on the ${r.name}, and ${why}. They wait.`, "warn"); conRefresh(); try { api.TABLET.refresh("staff"); } catch (e) { } } return; }
      q.told = "";
    }
    q.w += dh; if (q.w < PDR.wait / k) return;
    if (mine && !pdrTake(q, m, r)) return;
    q.st = "out"; q.p = 0; q.a = 0; q.w = 0; q.n = 0; q.cash = 0; q.why = ""; q.rc = false; q.hold = false; pdrUnbog(q);
    const T0 = mine ? pdrRec(q.truck) : null;
    pdrNote(`${m.name} has set out`, `On the ${r.name}: ${due.length} stretch${due.length === 1 ? "" : "es"} under snow.${T0 ? ` In your ${pdrTName(T0)}, ${Math.round(T0.fuel)} L in the tank.` : ""}`);
    if (mine) api.save();
    conRefresh(); try { api.TABLET.refresh("staff"); } catch (e) { } return;
  }
  const T = mine ? pdrRec(q.truck) : null, burn = T ? pdrDef(T).burn || 1 : 0, pas = T ? pdrPasses(T.uid) : 1;
  if (mine && !T) { pdrHome(c, r, q, m, "the truck is no longer yours"); return; }
  /* 5.4b1: in your sight the truck keeps a truck's speed (sph: real seconds a game hour took this step; a clock put forward is not capped) */
  const sph = dh > 0 && dh <= 0.05 && conSec > 0 ? conSec / dh : 0, seen = sph > 0 && pdrNear(r, q), held = seen && (pdrBlocked(r.id) || pdrHailed(r.id));
  const dh0 = dh; let lost = 0;
  /* 5.4b2b: your truck's own drive between its spot and the road's first end (q.a of A.len m driven); p > 0 is past it */
  const A = T ? pdrWay(r, q) : null, AL = A ? A.len : 0; if (!A) q.a = 0; else if (q.p > 0 || q.a > AL) q.a = AL;
  if (q.st === "out") {
    if (!due.length || c.cover) q.st = "back";
    else {
      if (A && q.a < AL - 1e-6) {
        if (T.fuel <= q.a / 1000 * burn * PDR.lkm[0] + PDR.spare) { q.why = "the tank is nearly dry"; q.st = "back"; }
        else { const w = pdrWayGo(A, q, T, burn, dh, 1, seen ? sph : 0, held, 0); dh = w[0]; lost += w[1]; }
      }
      const onRoad = q.st === "out" && q.a >= AL - 1e-6;
      const g = r.seg[Math.min(r.seg.length - 1, Math.floor(q.p / SEG))];
      if (onRoad && g && WX.at(g.mx, g.mz) >= RD.plowWx) return;                 /* a storm over them: they sit it out where they are */
      const far = Math.min(r.len, due[due.length - 1] * SEG + conLen(r, due[due.length - 1])); let t = onRoad ? dh : 0, guard = 0;
      while (t > 1e-9 && q.p < far - 1e-6 && guard++ < 400) {
        if (T && T.fuel <= (q.p + AL) / 1000 * burn * PDR.lkm[0] + PDR.spare) { q.why = "the tank is nearly dry"; q.st = "back"; break; }
        const i = Math.floor(q.p / SEG + 1e-9), e = Math.min(far, i * SEG + conLen(r, i)), isDue = !!c.due[i] && r.st.s[i] >= PLC.due, v0 = isDue ? PDR.v * k / pas : PDR.vRoad;
        const v = seen ? Math.min(v0, held ? 0 : PDR.seen[isDue ? 0 : 1] * sph) : v0, need = v > 0 ? (e - q.p) / v : Infinity;
        if (!(e > q.p)) break;
        if (!(v > 0)) { lost += t; t = 0; break; }                                 /* you stand in its lane: it waits */
        lost += Math.min(need, t) * (1 - v / v0);
        const go = need <= t ? e - q.p : v * t;
        if (T) T.fuel = Math.max(0, T.fuel - go / 1000 * burn * (isDue ? PDR.lkm[1] * pas : PDR.lkm[0]));
        if (isDue && q.bogI !== i && go > 0) {                                     /* 5.4c1: the drift may hold them */
          const rk = pdrBogRisk(r, q, i, k, T ? bladeOf(T.uid) : null);
          if (rk > 0 && PDR.bog.rnd() < 1 - Math.exp(-rk * go / 1000)) { q.p = Math.max(q.p, Math.min(e - 3, q.p + go * 0.5)); pdrBog(c, r, q, m, i, T); break; }
        }
        if (need <= t) {
          q.p = e; t -= need;
          if (isDue) {
            pdrOpen(c, r, i, q, pdrShare(m));
            if (T) { const b = s.blades[T.uid]; if (b) b.cond = Math.max(0, condOf(T.uid) - conLen(r, i) * pas / BL.wearM); if (condOf(T.uid) < BL.ragged) { q.why = "the cutting edge is worn ragged"; q.st = "back"; break; } }
          }
        } else { q.p += go; t = 0; }
      }
      if (q.st === "out" && q.p >= far - 1e-6) q.st = "back";
      dh = t;
    }
  }
  PDLOST[r.id] = Math.max(0, Math.min(dh0, lost));
  if (q.st === "back") {
    const vB = seen ? Math.min(PDR.vRoad, held ? 0 : PDR.seen[1] * sph) : PDR.vRoad;
    const go = Math.min(q.p, dh * vB); q.p -= go; if (vB > 0) dh -= go / vB; if (T) T.fuel = Math.max(0, T.fuel - go / 1000 * burn * PDR.lkm[0]);
    if (q.p <= 1e-6) {
      q.p = 0;
      const stood = !!T && !pdrSpotClear(T), flo = stood && A ? Math.min(q.a, PDR.wayStop) : 0;   /* you on its spot: it waits a little short of it */
      if (A && q.a > flo + 1e-6) pdrWayGo(A, q, T, burn, Math.max(0, dh), -1, seen ? sph : 0, held, flo);
      if (stood && !q.hold && (!A || q.a <= PDR.wayStop + 10)) { q.hold = true; pdrNote(`${m.name} is back with the ${pdrTName(T)}`, "Something of yours stands on its parking spot: move clear and they put it back.", "warn"); conRefresh(); }
      if (stood || (A && q.a > flo + 1e-6)) return;
      pdrHome(c, r, q, m, c.cover ? "the kommune's own truck has the rest" : "");
    }
  }
}
/* ---- 5.4b2b: your truck's drive between its parking spot and the road ----
   A driver in YOUR truck starts where the truck stands and brings it back there. pdrWay(r, q) is the line: from the
   truck's spot over the ground to where the roads take over (pdrGrid: a search on PDR.wayG m cells that keeps to plowed
   ground where there is any, never through water, a wall, a tree, a parked car or another truck of yours), then by road
   (TLXR.tripLine) to the first end of the road they plow. q.a is the metres of it driven (saved; the line itself is
   worked out again from the truck's spot, which its record keeps while it is out). On the clock it is driven at
   PDR.vRoad and burns PDR.lkm[0] like a clean road; in your sight at PDR.wayV off the roads and PDR.seen[1] on them,
   the hours that costs going to PDLOST like the rest. No line (the spot further than PDR.wayMax from the roads, or
   walled in): the truck is on the road at once, as before 5.4b2b. */
const PDA = new Map();                                                           // routeId -> { key, pts, cum, len, town (m of it before the roads) }
function pdrGrid(x0, z0, x1, z1, skip) {
  const W = api.world, G = PDR.wayG, pad = PDR.wayPad, ox = Math.min(x0, x1) - pad, oz = Math.min(z0, z1) - pad;
  const nx = Math.ceil((Math.abs(x1 - x0) + 2 * pad) / G) + 1, nz = Math.ceil((Math.abs(z1 - z0) + 2 * pad) / G) + 1, N = nx * nz; if (!(N > 0) || N > 400000) return null;
  const cost = new Float32Array(N), gs = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), shut = new Uint8Array(N);
  const others = trucks().filter(t => !t.out && t.uid !== skip && Number.isFinite(t.x));
  const ci = (x, z) => Math.max(0, Math.min(nx - 1, Math.round((x - ox) / G))) + nx * Math.max(0, Math.min(nz - 1, Math.round((z - oz) / G)));
  const s = ci(x0, z0), e = ci(x1, z1);
  const costOf = i => {
    if (cost[i]) return cost[i];
    const x = ox + (i % nx) * G, z = oz + Math.floor(i / nx) * G; let c = -1;
    if (i === s || i === e) c = 1;
    else if (!W.isSea(x, z) && !W.isWater(x, z)) {
      const d0 = Math.hypot(x - x0, z - z0);
      if (!(d0 < 7 ? W.obNear(x, z, 1.1) : W.obNear(x, z, 2.1)) && W.slopeAt(x, z, 4) < 0.4 && !others.some(t => Math.hypot(t.x - x, t.z - z) < 3.4)) {
        const k = W.yardAt ? Math.max(0, Math.min(1, W.yardAt(x, z))) : 0;
        c = 1 + PDR.wayOff * (1 - k) + (W.obNear(x, z, 3.8) ? 1.2 : 0);
      }
    }
    return (cost[i] = c);
  };
  // a binary heap of [f, cell]
  const hf = [], hi = [];
  const push = (f, i) => { let k = hf.length; hf.push(f); hi.push(i); while (k > 0) { const p = (k - 1) >> 1; if (hf[p] <= f) break; hf[k] = hf[p]; hi[k] = hi[p]; k = p; } hf[k] = f; hi[k] = i; };
  const pop = () => { const top = hi[0], f = hf.pop(), i = hi.pop(), n = hf.length; if (n) { let k = 0; for (;;) { let c = 2 * k + 1; if (c >= n) break; if (c + 1 < n && hf[c + 1] < hf[c]) c++; if (hf[c] >= f) break; hf[k] = hf[c]; hi[k] = hi[c]; k = c; } hf[k] = f; hi[k] = i; } return top; };
  const ex = e % nx, ez = Math.floor(e / nx), h = i => Math.hypot(i % nx - ex, Math.floor(i / nx) - ez) * G;
  gs[s] = 0; push(h(s), s); let guard = 0;
  while (hf.length && guard++ < 600000) {
    const u = pop(); if (shut[u]) continue; shut[u] = 1; if (u === e) break;
    const ux = u % nx, uz = Math.floor(u / nx);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue; const vx = ux + dx, vz = uz + dz; if (vx < 0 || vz < 0 || vx >= nx || vz >= nz) continue;
      const v = vx + nx * vz; if (shut[v]) continue; const c = costOf(v); if (c < 0) continue;
      if (dx && dz && (costOf(ux + dx + nx * uz) < 0 || costOf(ux + nx * (uz + dz)) < 0)) continue;   /* no cutting a corner past a wall */
      const g = gs[u] + (dx && dz ? 1.4142 : 1) * G * (c + Math.max(1, costOf(u))) / 2;
      if (g < gs[v]) { gs[v] = g; from[v] = u; push(g + h(v), v); }
    }
  }
  if (!shut[e]) return null;
  const cells = []; for (let k = e; k !== -1; k = from[k]) cells.push(k); cells.reverse();
  let pts = [[x0, z0]]; for (let j = 2; j < cells.length - 2; j += 2) pts.push([ox + (cells[j] % nx) * G, oz + Math.floor(cells[j] / nx) * G]); pts.push([x1, z1]);
  for (let it = 0; it < 2 && pts.length > 2; it++) { const o = [pts[0]]; for (let j = 0; j < pts.length - 1; j++) { const a = pts[j], b = pts[j + 1]; o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } o.push(pts[pts.length - 1]); pts = o; }
  return pts;
}
function pdrWay(r, q) {
  const t = pdrRec(q.truck); if (!t || !(PDR.wayMax > 0) || !Number.isFinite(t.x) || !Number.isFinite(t.z) || !window.TLXR || !TLXR.tripLine) return null;
  const key = t.uid + ":" + Math.round(t.x * 2) + ":" + Math.round(t.z * 2) + ":" + PDR.wayMax; let A = PDA.get(r.id);
  if (A && A.key === key) return A.len > 0 ? A : null;
  A = { key, pts: null, cum: null, len: 0, town: 0 }; PDA.set(r.id, A);
  try {
    const e = r.pts[0], road = TLXR.tripLine(t.x, t.z, e[0], e[1]) || [], J = road.length ? road[0] : e;
    if (Math.hypot(J[0] - t.x, J[1] - t.z) > PDR.wayMax) return null;
    const first = Math.hypot(J[0] - t.x, J[1] - t.z) < 1 ? [[t.x, t.z]] : pdrGrid(t.x, t.z, J[0], J[1], t.uid); if (!first) return null;
    const raw = first.concat(road.slice(1)); raw.push([e[0], e[1]]);
    const pts = [raw[0]], cum = [0]; let town = 0;
    for (let i = 1; i < raw.length; i++) { const l = pts[pts.length - 1], d = Math.hypot(raw[i][0] - l[0], raw[i][1] - l[1]); if (d < 0.4) continue; pts.push(raw[i]); cum.push(cum[cum.length - 1] + d); if (i < first.length) town = cum[cum.length - 1]; }
    if (pts.length < 2 || cum[cum.length - 1] < 8) return null;
    A.pts = pts; A.cum = cum; A.len = cum[cum.length - 1]; A.town = town;
  } catch (err) { PDSX.err = PDSX.err || "way: " + String(err && err.message || err); return null; }
  return A.len > 0 ? A : null;
}
/* q.a moved along the line by dh hours (dir 1 out, -1 back as far as flo): [hours left, hours lost to your sight] */
function pdrWayGo(A, q, T, burn, dh, dir, sph, held, flo) {
  const end = dir > 0 ? A.len : flo; let t = dh, lost = 0, guard = 0;
  while (t > 1e-9 && (dir > 0 ? q.a < end - 1e-6 : q.a > end + 1e-6) && guard++ < 8) {
    const town = dir > 0 ? q.a < A.town - 1e-6 : q.a <= A.town + 1e-6, to = !town ? (dir > 0 ? end : Math.max(end, A.town)) : dir > 0 ? Math.min(end, A.town) : end;
    const v = sph > 0 ? Math.min(PDR.vRoad, held ? 0 : (town ? PDR.wayV : PDR.seen[1]) * sph) : PDR.vRoad;
    if (!(v > 0)) { lost += t; t = 0; break; }
    const d = Math.abs(to - q.a), need = d / v, used = Math.min(need, t), go = need <= t ? d : v * t;
    q.a = need <= t ? to : q.a + dir * go; lost += used * (1 - v / PDR.vRoad); t -= used;
    if (T) T.fuel = Math.max(0, T.fuel - go / 1000 * burn * PDR.lkm[0]);
  }
  return [t, lost];
}
function pdrPos(r, q) {                                                          // where the clock has the truck: on its way to the road, or p along it
  const A = obj0(q) && q.truck != null && q.st !== "home" && !(q.p > 0) ? pdrWay(r, q) : null;
  return A && q.a < A.len - 0.01 ? pdrPt(A, q.a) : pdrPt(r, q.p);
}
const pdrOnWay = (r, q) => { const A = obj0(q) && q.truck != null && q.st !== "home" && !(q.p > 0) ? pdrWay(r, q) : null; return !!A && q.a < A.len - 0.01; };
/* ---------------- 5.4b1: the driver's truck, seen ---------------- */
// PDS: routeId -> what is drawn for that road's driver { uid, who, gh (their own truck: a TLXV.ghost), s (m along the road,
// eased after the clock's p), off (m right of the crown), yaw, x, z, v, pose (handed to TLXV.outPose), car (the `led`
// record in TLXT.extra: solid, and the traffic's drivers see it), bc (the beacon) }. Nothing here is saved: it follows
// from pdr. pdrSee runs every frame; pdrNear / pdrBlocked are what pdrRun asks before it lets the clock's pace stand.
const PDS = new Map(), PDLOST = {}, PDSX = { err: null, n: 0 };
const pdrYou = () => (api.FOOT.on ? api.FOOT : api.P);
function pdrPt(r, sm) {
  const c = r.cum, p = r.pts, e = c[c.length - 1]; sm = Math.max(0, Math.min(e, sm));
  let lo = 0, hi = c.length - 2; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (c[m] <= sm) lo = m; else hi = m - 1; }
  const a = p[lo], b = p[lo + 1], L = (c[lo + 1] - c[lo]) || 1, t = Math.max(0, Math.min(1, (sm - c[lo]) / L));
  return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, tx: (b[0] - a[0]) / L, tz: (b[1] - a[1]) / L };
}
function pdrSpot(r) {                                                            // where a driver's own truck stands while they are in: beside the road near its first end
  if (r.pdrSpot !== undefined) return r.pdrSpot;
  const W = api.world, TR = window.TLXR, off = TR.ROADS.half + PDR.park[2]; let out = null;
  const ok = (x, z) => !W.isSea(x, z) && !W.isWater(x, z) && !W.obNear(x, z, 2.2) && TR.near(x, z).d >= off - 0.4 && !(W.yardAt && W.yardAt(x, z) > 0.5);
  for (let sm = PDR.park[0]; sm <= Math.min(PDR.park[1], r.len - 20) && !out; sm += 6) for (const sd of [1, -1]) {
    const p = pdrPt(r, sm), x = p.x - p.tz * off * sd, z = p.z + p.tx * off * sd;
    if (![-3.2, 0, 3.2, 5].every(u => ok(x + p.tx * u, z + p.tz * u)) || W.slopeAt(x, z, 4) > 0.22) continue;
    out = { s: sm, off: off * sd, x, z, yaw: Math.atan2(p.tx, p.tz), tx: p.tx, tz: p.tz, cx: p.x, cz: p.z, pad: false }; break;
  }
  return (r.pdrSpot = out);
}
function pdrPad(sp) {                                                            // the spot is kept clear like a drive: a plowed strip the truck's length, joined to the road
  if (sp.pad) return; sp.pad = true;
  try { const W = api.world, legs = (W.addLane([[sp.x - sp.tx * 3.6, sp.z - sp.tz * 3.6], [sp.x + sp.tx * 5.6, sp.z + sp.tz * 5.6]], 2.5, 0.9) || []).concat(W.addLane([[sp.x, sp.z], [sp.cx, sp.cz]], 2.4, 0.9) || []); if (legs.length && W.replow) W.replow(legs); } catch (e) { }
}
function pdrNear(r, q) { const Z = PDS.get(r.id), p = Z && Number.isFinite(Z.x) ? Z : pdrPos(r, q), y = pdrYou(); return Math.hypot(p.x - y.x, p.z - y.z) < PDR.seeR; }
function pdrBlocked(id) {                                                        // you (walking, or on what you ride) stand in its lane just ahead of it
  const Z = PDS.get(id); if (!Z || !Number.isFinite(Z.x) || (api.INT && api.INT.on)) return false;
  const y = pdrYou(), fx = Math.sin(Z.yaw), fz = Math.cos(Z.yaw), dx = y.x - Z.x, dz = y.z - Z.z, a = dx * fx + dz * fz, l = dz * fx - dx * fz;
  return a > 0 && a < PDR.stopFor + (Z.fro || 3) && Math.abs(l) < 2.6;
}
function pdrSeeDrop(id) {
  const Z = PDS.get(id); if (!Z) return; PDS.delete(id);
  pdrRopeDrop(Z);
  const V = window.TLXV, TT = window.TLXT;
  if (Z.car && TT) { const i = TT.extra.indexOf(Z.car); if (i >= 0) TT.extra.splice(i, 1); }
  if (Z.bc && Z.bc.parent) Z.bc.parent.remove(Z.bc);
  if (Z.gh) { const B = RTB.get(Z.uid); if (B) { B.grp = null; RTB.delete(Z.uid); } delete GHB[Z.uid]; if (V && V.dropGhost) V.dropGhost(Z.uid); }
  else { const B = RTB.get(Z.uid); if (B) B.down = false; if (V && V.outPose && Z.rec && Z.rec.out) V.outPose(Z.rec.uid, null); }
}
function pdrBeacon(R) {                                                          // an amber lamp on the cab roof (found by a ray down onto the body over the seat)
  const g = new T.Group(), bm = new T.MeshBasicMaterial({ color: 0x2a1c05 });
  g.add(new T.Mesh(new T.BoxGeometry(0.2, 0.04, 0.2), new T.MeshStandardMaterial({ color: 0x1d2024, roughness: 0.8 })));
  const lamp = new T.Mesh(new T.CylinderGeometry(0.075, 0.09, 0.15, 10), bm); lamp.position.y = 0.095; g.add(lamp);
  let y = 2;
  try { const gb = R.body.geometry; if (!gb.boundingBox) gb.computeBoundingBox(); y = gb.boundingBox.max.y;
    const pos = gb.attributes.position, z0 = R.so ? R.so[2] : 0; let top = -Infinity;
    for (let i = 0; i < pos.count; i++) if (Math.abs(pos.getZ(i) - z0) < 0.45 && Math.abs(pos.getX(i)) < 0.6 && pos.getY(i) > top) top = pos.getY(i);
    if (Number.isFinite(top)) y = top;
  } catch (e) { }
  g.position.set(0, y + 0.02, R.so ? R.so[2] : 0); g.userData.mat = bm; R.grp.add(g); return g;
}
function pdrSeeNew(id, uid, m, mine, rec, s0, off, yaw) {                         // what is drawn for road id's driver: your truck's own model, or their own (a ghost in their paint)
  const V = window.TLXV, TT = window.TLXT; let R = null;
  if (mine) R = V.runtimeOf(rec.uid);
  else { GHB[uid] = PDR.own[1]; let h = 0; for (const ch of String(m.id) + m.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0; R = V.ghost(uid, PDR.own[0], PDR.tints[h % PDR.tints.length]); }
  if (!R) { delete GHB[uid]; return null; }
  const def = R.def, bd = bladeOf(uid), hw = (def.wid || 2) / 2 + 0.12, hl = (def.len || 5.3) / 2;
  const Z = { uid, who: m.id, gh: !mine, rec, R, s: s0, off, yaw, x: NaN, z: NaN, v: 0, vT: 0, qp: NaN, qst: "",
    pose: { x: NaN, z: NaN, yaw: 0, ds: 0, steer: 0, lit: false, driver: false }, car: null, bc: null,
    circ: [[-hl + hw, hw], [0, hw], [hl - hw, hw]].concat(bd ? [[bd.z - 0.15, Math.min(1.7, bd.w * 0.45)]] : []), fro: bd ? bd.z + 0.4 : hl };
  Z.bc = pdrBeacon(R);
  if (TT && TT.extra) { Z.car = { i: 300 + (PDSX.n++ % 90), led: true, plow: true, on: false, x: 0, z: 0, y: 0, yaw: 0, v: 0, st: "drive", fro: Z.fro, hold: 0, blocked: 0, retry: 0, circ: [], who: m.name }; TT.extra.push(Z.car); }
  PDS.set(id, Z); return Z;
}
/* ---- 5.4c2b1: the helper seen ----
   A driver sent to a bogged truck (5.4c2a) is drawn on the road like a driver who is plowing: the same PDS entry, under
   the helper's own road id, with Z.aid set and Z.s measured along the line they drive (pdrAidLine: from where their truck
   stood, by road, to where the bogged truck stood at the send; that far end is saved as aidX / aidZ on the helper's
   record, so the line outlives the bogged truck moving on, its driver let go or its road handed back). Blade carried,
   beacon going, a figure at the wheel, solid, seen by the traffic; in the right-hand lane out, the other lane home.
   In your sight (PDR.seeR) it keeps a truck's speed and waits short of you in its lane (pdrAid's kv); the hours that
   costs are nobody's (PDLOST on both roads, and not hours in the cold for the bogged driver).
   AT THE TRUCK it stops PDR.aid.gap m short of the bogged truck's place, turns its tail to it (it has to turn for home
   anyway) and a rope runs tail to tail (pdrRope: a sagging line between the two bodies, drawn while both are in sight).
   The last PDR.aid.pull of the hitch hours is the pull: the bogged truck comes back PDR.aid.haul m and straightens onto
   the cut (pdrPullK, read by pdrSee for the bogged truck), the helper creeps the same distance toward home, the rope
   between them the same length. Then the rope is gone, the bogged truck plows on and the helper drives in; a driver's
   own truck is parked on its spot again by pdrSee, yours is put back by pdrAid.
   Nothing is saved but aidX / aidZ. NOT here (5.4c2b2): towing them out yourself; the helper is not hailed. */
function pdrPullK(q2, id) {                                                      // how far the pull has come, 0 (not begun) to 1, for the truck bogged on road id
  const a = PDR.aid; if (!obj0(q2) || q2.aid !== id || q2.aidB > 0 || !(q2.aidT > 0) || !(a.pull > 0) || !(a.hitch > 0)) return 0;
  return Math.max(0, Math.min(1, 1 - q2.aidT / (a.hitch * a.pull)));
}
function pdrAidNear(id2) { const Z = PDS.get(id2), p = Z && Z.aid && Number.isFinite(Z.x) ? Z : pdrAidPos(id2); if (!p) return false; const y = pdrYou(); return Math.hypot(p.x - y.x, p.z - y.z) < PDR.seeR; }
const PDROPE = { mat: null, a: null, b: null, c: null };
function pdrRopeDrop(Z) { const m = Z && Z.rope; if (!m) return; Z.rope = null; if (m.parent) m.parent.remove(m); m.geometry.dispose(); }
function pdrHook(R, front, out) {                                                // a towing eye on a truck's body: under its tail (or its nose), in the world
  const g = R.body.geometry; if (!g.boundingBox) g.computeBoundingBox(); const bb = g.boundingBox;
  return R.body.localToWorld(out.set(0, bb.min.y + PDR.aid.hookY, front ? bb.max.z - 0.05 : bb.min.z + 0.05));
}
function pdrRope(Z, Z2, on) {                                                    // the rope from the helper's tail (Z) to the bogged truck (Z2)
  if (!on || !Z2 || !Z2.R || !Z.R.grp.visible || !Z2.R.grp.visible || !Z.R.grp.parent) { pdrRopeDrop(Z); return; }
  const X = PDROPE; if (!X.mat) { X.mat = new T.MeshStandardMaterial({ color: 0xc8962e, roughness: 0.95 }); X.a = new T.Vector3(); X.b = new T.Vector3(); X.c = new T.Vector3(); }
  Z.R.grp.updateMatrixWorld(true); Z2.R.grp.updateMatrixWorld(true);
  const a = pdrHook(Z.R, false, X.a), b = pdrHook(Z2.R, false, X.b), f = pdrHook(Z2.R, true, X.c), e = f.distanceTo(a) < b.distanceTo(a) ? f : b;   /* the nearer end of the bogged truck */
  const k = [a.x, a.y, a.z, e.x, e.y, e.z], o = Z.ropeK;
  if (Z.rope && o && k.every((v, i) => Math.abs(v - o[i]) < 0.02)) return;
  const span = a.distanceTo(e), sag = Math.min(0.35, 0.03 * span), pts = [], W = api.world; let low = Infinity;
  for (let i = 0; i <= 10; i++) {                                                /* it hangs a little, and lies on the snow where the snow stands higher than that */
    const t = i / 10, x = a.x + (e.x - a.x) * t, z = a.z + (e.z - a.z) * t, top = W.surf(x, z) + 0.035, lift = Math.min(1, 5 * t, 5 * (1 - t));
    let y = a.y + (e.y - a.y) * t - sag * 4 * t * (1 - t); if (y < top) y += (top - y) * lift; if (i > 1 && i < 9) low = Math.min(low, y - top);
    pts.push(new T.Vector3(x, y, z));
  }
  const geo = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 20, 0.03, 5, false);
  if (Z.rope) { Z.rope.geometry.dispose(); Z.rope.geometry = geo; } else { Z.rope = new T.Mesh(geo, X.mat); Z.rope.frustumCulled = false; Z.R.grp.parent.add(Z.rope); }
  Z.ropeK = k; Z.ropeL = span; Z.ropeLow = low;
}
function pdrSeeAid(id, q, m, dt, night, now) {
  const V = window.TLXV, TT = window.TLXT, a = PDR.aid, mine = pdrMine(m), rec = mine ? pdrRec(q.truck) : null;
  if (mine && (!rec || !rec.out)) return false;
  const A = pdrAidLine(id, q.aid); if (!A || !(q.aidL > 0) || !(A.len > 0)) return false;
  const uid = mine ? String(rec.uid) : "pdr:" + id, L = A.len, back = q.aidB > 0, hitching = !back && q.aidT <= a.hitch + 1e-9;
  const mC = Math.max(0, Math.min(1, (back ? q.aidB * PDR.vRoad : q.aidL - Math.max(0, q.aidT - a.hitch) * PDR.vRoad) / q.aidL)) * L;   /* where the clock has them, m along the line */
  const pk = hitching ? pdrPullK(q, q.aid) : 0, gap = Math.min(a.gap, L * 0.4), cap = Math.max(0, L - gap - a.haul * (back ? 1 : pk)), flo = q.hold ? Math.min(PDR.wayStop, L * 0.4) : 0;
  const tS = Math.max(flo, Math.min(cap, mC));
  let Z = PDS.get(id);
  if (Z && (Z.uid !== uid || Z.who !== m.id)) { pdrSeeDrop(id); Z = null; }
  if (Z && !Z.aid) { Z.aid = true; Z.s = tS; Z.off = 0; Z.qp = NaN; if (Z.hail) Z.hail = 0; }   /* it was parked on its spot, where the line begins */
  if (!Z) { Z = pdrSeeNew(id, uid, m, mine, rec, tS, 0, mine && tS < 3 && Number.isFinite(rec.yaw) ? rec.yaw : NaN); if (!Z) return false; Z.aid = true; }
  if (Z.qp !== tS) { Z.vT = Math.min(45, Math.abs(tS - Z.s) / 0.5); Z.qp = tS; }
  if (Math.abs(tS - Z.s) > 90) Z.s = tS;                                         /* a clock put forward, a reload */
  /* you in its lane just ahead: what you see stops at once (the clock stops at its next step, pdrAid's kv) */
  const step = dt > 0 && !(Number.isFinite(Z.x) && pdrBlocked(id)) ? Math.min(Math.abs(tS - Z.s), Math.max(0.5, Z.vT) * dt) : 0; Z.s += Math.sign(tS - Z.s) * step;
  const there = hitching && Math.abs(L - gap - a.haul * pk - Z.s) < 1.5, dir = back || there ? -1 : 1;   /* at the truck: tail to it */
  const tOff = (back ? -1 : 1) * T_LANE * Math.max(0, Math.min(1, Z.s / 12)); Z.off += Math.max(-1.6 * dt, Math.min(1.6 * dt, tOff - Z.off)); Z.way = false;
  const p = pdrPt(A, Z.s), x = p.x - p.tz * Z.off, z = p.z + p.tx * Z.off, tYaw = Math.atan2(p.tx * dir, p.tz * dir);
  let dy = Number.isFinite(Z.yaw) ? tYaw - Z.yaw : 0; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
  const turn = Math.max(-2.4 * dt, Math.min(2.4 * dt, dy)); Z.yaw = Number.isFinite(Z.yaw) ? Z.yaw + turn : tYaw;
  const moved = Number.isFinite(Z.x) ? Math.hypot(x - Z.x, z - Z.z) : 0; Z.x = x; Z.z = z;
  Z.v = dt > 0 ? Z.v + (Math.min(45, moved / dt) - Z.v) * Math.min(1, dt * 6) : Z.v;
  const P = Z.pose; P.x = x; P.z = z; P.yaw = Z.yaw; P.ds += moved; P.lit = true; P.driver = true;
  P.steer = dt > 0 && Z.v > 0.8 ? Math.max(-0.55, Math.min(0.55, Math.atan(3.4 * (turn / dt) / Z.v))) : 0;
  V.outPose(mine ? rec.uid : uid, P);
  const B = rt(uid); B.down = false; Z.bl = null;                                /* the blade is carried */
  if (Z.gh) { B.k = Math.max(0, Math.min(1, B.k - dt / BL.liftT)); if (B.B) B.B.position.y = BL.lift * (1 - B.k); if (B.heap) B.heap.visible = true; }
  const on = Math.floor(now * 3.2) % 2 === 0, k = on ? 0.9 + 1.6 * night : 0.16 - 0.08 * night; Z.bc.userData.mat.color.setRGB(k, k * 0.52, k * 0.04); Z.lit = true;
  if (Z.car) {
    const c = Z.car, fx = Math.sin(Z.yaw), fz = Math.cos(Z.yaw); c.on = true; c.x = x; c.z = z; c.yaw = Z.yaw; c.v = Z.v; c.st = Z.v > 0.3 ? "drive" : "park"; c.y = api.world.surf(x, z); c.hold = 0;
    c.circ = Z.circ.map(([u, rr]) => [x + fx * u, z + fz * u, rr]); c.pts = [[x + fx * 2.1, z + fz * 2.1], [x - fx * 1.6, z - fz * 1.6]];
    if (TT.collide && (!TT.ready || !TLX.on("traffic")) && !(api.INT && api.INT.on)) TT.collide(c, dt);
  }
  /* the rope: once it has turned its tail to the bogged truck, until that truck is free */
  const Z2 = PDS.get(q.aid), sb = S().pdr[q.aid]; Z.roped = there && Math.abs(dy) < 0.25 && !!Z2 && !Z2.aid && obj0(sb) && sb.st === "stuck" && sb.help === id;
  pdrRope(Z, Z2, Z.roped);
  return true;
}
function pdrSee(dt) {
  const s = S(), V = window.TLXV, TT = window.TLXT; if (!V || !V.ghost || !s || !api.started()) return;
  const live = new Set(), ids = obj0(s.pdr) ? Object.keys(s.pdr) : [];
  if (ids.length) {
    const rs = conR(), night = 1 - api.dayFactor(), SEG = window.TLXR.ROADS.seg, now = api.now();
    for (const id of ids) {
      const q = s.pdr[id], m = pdrOf(id), r = rs.find(v => v.id === id); if (!obj0(q) || !m || !r || !s.con[id]) continue;
      if (q.st === "home" && q.aid) { if (pdrSeeAid(id, q, m, dt, night, now)) live.add(id); continue; }   /* 5.4c2b1: away helping on another road: drawn on the line they drive */
      const mine = pdrMine(m), out = q.st !== "home", rec = mine ? pdrRec(q.truck) : null, stuck = q.st === "stuck", crew = out && !(stuck && q.gone);   /* 5.4c1: bogged, and walked home from it */
      if (mine && (!out || !rec || !rec.out)) continue;                          /* your truck at its own spot is tlx-vehicles' to draw */
      const spot = mine ? null : pdrSpot(r); if (!mine && !out && !spot) continue;
      if (spot) pdrPad(spot);
      const uid = mine ? String(rec.uid) : "pdr:" + id;
      /* 5.4b2b: your truck's line from its spot (AL m of it, ea driven) comes before the road: Z.s runs over both */
      const A = mine ? pdrWay(r, q) : null, AL = A ? A.len : 0, ea = !A ? 0 : q.p > 0 ? AL : Math.min(q.a || 0, AL), qu = q.p + ea;
      let Z = PDS.get(id);
      if (Z && (Z.uid !== uid || Z.who !== m.id)) { pdrSeeDrop(id); Z = null; }
      if (Z && Z.aid) { Z.aid = false; pdrRopeDrop(Z); Z.s = mine ? qu : Math.max(q.p, spot ? spot.s : 0); Z.off = !out && spot ? spot.off : Z.off; Z.qp = NaN; }   /* 5.4c2b1: back from helping: the road's own measure again */
      if (!Z) {
        Z = pdrSeeNew(id, uid, m, mine, rec, mine ? qu : Math.max(q.p, spot.s), A && ea < AL ? 0 : out || !spot ? T_LANE : spot.off, A && qu < 3 && Number.isFinite(rec.yaw) ? rec.yaw : NaN); if (!Z) continue;
        Z.qp = qu; Z.qst = q.st;
      }
      live.add(id);
      if (Z.hail > 0) { Z.hail -= dt; const yh = pdrYou(); if (!out || !(Z.hail > 0) || (Number.isFinite(Z.x) && Math.hypot(Z.x - yh.x, Z.z - yh.z) > PDR.hailOff)) pdrWave(id, !out); }   /* 5.4b2a: hailed, they wait a while, not for ever */
      // where it should be: p along the road (never short of its own parking spot), in the lane it drives in, or on the spot
      const back = q.st === "back", dir = back ? -1 : 1;
      const tS = out ? (spot ? Math.max(q.p, spot.s) : qu) : spot.s, parked = !out || (spot && q.p <= spot.s && back);
      if (Z.qp !== qu || Z.qst !== q.st) { Z.vT = Math.min(45, Math.abs(tS - Z.s) / 0.5); Z.qp = qu; Z.qst = q.st; }
      if (Math.abs(tS - Z.s) > 90) Z.s = tS;                                     /* a clock put forward, a reload */
      const step = dt > 0 ? Math.min(Math.abs(tS - Z.s), Math.max(0.5, Z.vT) * dt) : 0; Z.s += Math.sign(tS - Z.s) * step;
      /* 5.4c2b1: the last of the roping up is the pull: the bogged truck comes back onto the cut (pk 0 to 1), tail first */
      const pk = stuck && q.help ? pdrPullK(s.pdr[q.help], id) : 0, tB = PDR.aid.haul * pk; Z.pull = (Z.pull || 0) + Math.max(-1.5 * dt, Math.min(1.5 * dt, tB - (Z.pull || 0)));
      const onA = !!A && Z.s < AL, tOff = parked ? spot.off : onA ? 0 : dir * (T_LANE + (stuck ? PDR.bog.off * (1 - pk) : 0)); Z.off += Math.max(-1.6 * dt, Math.min(1.6 * dt, tOff - Z.off)); Z.way = onA;
      const p = onA ? pdrPt(A, Z.s) : pdrPt(r, Z.s - AL - (parked ? 0 : Z.pull)), x = p.x - p.tz * Z.off, z = p.z + p.tx * Z.off;
      const tYaw = (parked ? spot.yaw : Math.atan2(p.tx * dir, p.tz * dir)) - (stuck ? PDR.bog.skew * (1 - pk) : 0);   /* bogged: nosed toward the windrow */
      let dy = Number.isFinite(Z.yaw) ? tYaw - Z.yaw : 0; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
      const turn = Math.max(-2.4 * dt, Math.min(2.4 * dt, dy)); Z.yaw = Number.isFinite(Z.yaw) ? Z.yaw + turn : tYaw;
      const moved = Number.isFinite(Z.x) ? Math.hypot(x - Z.x, z - Z.z) : 0; Z.x = x; Z.z = z;
      Z.v = dt > 0 ? Z.v + (Math.min(45, moved / dt) - Z.v) * Math.min(1, dt * 6) : Z.v;
      const P = Z.pose; P.x = x; P.z = z; P.yaw = Z.yaw; P.ds += moved; P.lit = crew; P.driver = crew;
      P.steer = dt > 0 && Z.v > 0.8 ? Math.max(-0.55, Math.min(0.55, Math.atan(3.4 * (turn / dt) / Z.v))) : 0;
      V.outPose(mine ? rec.uid : uid, P);
      // the blade: down where it cuts snow, carried otherwise (your own truck's is eased by tick's loop, theirs here)
      const B = rt(uid), i = Math.floor((Z.s - AL) / SEG), cut = (q.st === "out" || stuck) && !onA && !!s.con[id].due[i] && r.st.s[i] >= PLC.due;
      B.down = cut;
      if (Z.gh) { B.k = Math.max(0, Math.min(1, B.k + (cut ? 1 : -1) * dt / BL.liftT)); if (B.B) B.B.position.y = BL.lift * (1 - B.k); if (B.heap) B.heap.visible = true; }
      // its own cut (within PDR.cutR of you): the blade takes the snow off the lane it drives in and throws a windrow to the
      // right, so the truck stands on what it has cleared, not axle-deep in a stretch that only opens at its far end
      const bd = bladeOf(uid), yo = pdrYou();
      if (cut && bd && B.k > 0.9 && Math.hypot(x - yo.x, z - yo.z) < PDR.cutR) {
        const W = api.world, e = ends(bd, P, _pc, 0, bd.ang), L = Z.bl;
        if (L && moved > 0.01 && moved < 5) {
          const n = Math.max(1, Math.min(40, Math.ceil(moved / (W.cell * 0.5)))); let vol = 0;
          for (let j = 1; j <= n; j++) { const t = j / n; vol += W.bladeSnow(L[0] + (e[0] - L[0]) * t, L[1] + (e[1] - L[1]) * t, L[2] + (e[2] - L[2]) * t, L[3] + (e[3] - L[3]) * t, bd.leave); }
          if (vol > 1e-4) { const fx = Math.sin(Z.yaw), fz = Math.cos(Z.yaw), hx = bd.w * Math.cos(bd.ang) / 2, hz = Math.abs(bd.w / 2 * Math.sin(bd.ang)), rr = BL.rowW / 2, rows = bd.rows || BL.rows; Z.vol = (Z.vol || 0) + vol;
            for (let j = 0; j < rows.length && vol > 1e-4; j++) { const lx = -(hx + 0.25 + rr * (2 * j + 1)), lz = bd.z - hz - 0.35 - 0.25 * j; vol -= W.heapSnow(x + fz * lx + fx * lz, z - fx * lx + fz * lz, rr, vol, rows[j]); } }
        }
        Z.bl = Z.bl || [0, 0, 0, 0]; Z.bl[0] = e[0]; Z.bl[1] = e[1]; Z.bl[2] = e[2]; Z.bl[3] = e[3];
      } else Z.bl = null;
      // the beacon: flashing while they are out
      const on = crew && Math.floor(now * 3.2) % 2 === 0, k = on ? 0.9 + 1.6 * night : 0.16 - 0.08 * night; Z.bc.userData.mat.color.setRGB(k, k * 0.52, k * 0.04); Z.lit = crew;
      // solid, and seen by the traffic
      if (Z.car) {
        const c = Z.car, fx = Math.sin(Z.yaw), fz = Math.cos(Z.yaw); c.on = true; c.x = x; c.z = z; c.yaw = Z.yaw; c.v = Z.v; c.st = Z.v > 0.3 ? "drive" : "park"; c.y = api.world.surf(x, z); c.hold = 0;
        c.circ = Z.circ.map(([u, rr]) => [x + fx * u, z + fz * u, rr]); c.pts = [[x + fx * 2.1, z + fz * 2.1], [x - fx * 1.6, z - fz * 1.6]];   /* what the traffic's drivers see of it: its nose and its tail */
        if (TT.collide && (!TT.ready || !TLX.on("traffic")) && !(api.INT && api.INT.on)) TT.collide(c, dt);   /* the traffic is off: nobody else makes it solid */
      }
    }
  }
  if (PDS.size > live.size) for (const id of Array.from(PDS.keys())) if (!live.has(id)) pdrSeeDrop(id);
}
/* ---- 5.4b2a: on the road with them: the hail, and a word beside the truck ----
   On foot within PDR.hailR of a driver's truck that is out (or heading in) the use control HAILS it (an api.footx
   provider: keyboard, pad L3, the touch button): the truck stops where it is (pdrRun's `held`, the same stop as you
   standing in its lane, so the hours it costs are PDLOST and no stretch runs late for it), the driver says how the run
   is going (pdrSay: stretches to go or opened, why they are heading in, your truck's tank and edge, a word if they are
   unhappy), and the use control becomes WAVE ON. They go on by themselves after PDR.hailT seconds, or once you are
   PDR.hailOff m away. Z.hail (seconds left) lives in PDS: nothing is saved, a reload finds the truck driving.
   A WORD IN PERSON: pdrPlaces puts the driver's place where the truck is (out: on the road at the seen truck; in, with
   their own truck: its spot beside the road's first end, and the garage as before through the place's `pts`), so the
   Staff app's PRAISE / CRITICISE open within tlx-staff's 30 m of it. Hailing is how you make that 30 m hold still. */
function pdrHailed(id) { const Z = PDS.get(id); return !!Z && Z.hail > 0; }
function pdrSay(id) {
  const s = S(), q = s.pdr && s.pdr[id], m = pdrOf(id), c = s.con && s.con[id], r = c && conR().find(v => v.id === id); if (!obj0(q) || !m || !r) return "";
  const RD = window.TLXR.ROADS, due = pdrDue(c, r), t = pdrMine(m) ? pdrRec(q.truck) : null, bits = [], n = q.n | 0, str = k => `${k} stretch${k === 1 ? "" : "es"}`;
  if (q.st === "stuck") bits.push(`Bogged to the axles${n ? ", " + str(n) + " open behind me" : ""}. ${q.help && pdrOf(q.help) ? pdrFirst(pdrOf(q.help)) + " is coming out to pull me free, they say." : q.tow > 0 ? "They say the tow truck is on its way." : "I need a pull out of this: " + pdrHrs(q.sk) + " I have sat here."}`);
  else if (q.st === "back") { const why = q.rc ? "you called me in" : q.why || (c.cover ? "the kommune's own truck has the rest" : ""); bits.push(`${n ? str(n) + " open. " : ""}Heading in${why ? ": " + why : n ? "" : ", nothing left to open"}.`); }
  else if (pdrOnWay(r, q)) bits.push(`On my way out to the ${r.name}: ${str(due.length)} to plow.`);
  else {
    const g = r.seg[Math.min(r.seg.length - 1, Math.floor(q.p / RD.seg))];
    if (g && api.WX.at(g.mx, g.mz) >= RD.plowWx) bits.push("Cannot see the poles in this. I am sitting it out until it eases.");
    else bits.push(due.length ? `${str(due.length)} to go${n ? ", " + n + " open behind me" : ""}.` : "That was the last of it.");
  }
  if (t) bits.push((Number.isFinite(t.fuel) ? `${Math.round(t.fuel)} L in the tank, the` : "The") + ` edge at ${pct(condOf(t.uid))}%.`);   /* beta 0345 #4: no "NaN L" from a broken record */
  if (m.notice) bits.push("You have my notice."); else if (+m.hap < 30) bits.push("And since you ask: I am not happy in this job.");
  return bits.join(" ");
}
function pdrHail(id) {
  const Z = PDS.get(id), m = pdrOf(id), q = S().pdr[id]; if (!Z || !m || !obj0(q) || q.st === "home" || (q.st === "stuck" && q.gone)) return false;
  Z.hail = PDR.hailT;
  api.toast(`${pdrFirst(m)} ${q.st === "stuck" ? "winds the window down" : "pulls up and winds the window down"}: "${pdrSay(id)}" They wait while you have your word: praise or criticism is on their card in the Staff app.`, "info");
  try { api.TABLET.refresh("staff"); } catch (e) { }
  return true;
}
function pdrWave(id, quiet) {
  const Z = PDS.get(id), m = pdrOf(id); if (!Z || !(Z.hail !== undefined && Z.hail !== 0)) return false;
  const qs = S().pdr && S().pdr[id], bog = obj0(qs) && qs.st === "stuck";
  Z.hail = 0; if (!quiet && m) api.toast(bog ? `${pdrFirst(m)} winds the window up against the cold.` : `${pdrFirst(m)} lifts a hand and drives on.`);
  try { api.TABLET.refresh("staff"); } catch (e) { }
  return true;
}
function pdrHailNear() {                                                         // the nearest truck with a driver in it within hailing distance of you on foot
  const s = S(), F = api.FOOT; if (!s || !obj0(s.pdr) || !PDS.size) return null; let best = null, bd = PDR.hailR;
  for (const [id, Z] of PDS) { const q = s.pdr[id]; if (!obj0(q) || q.st === "home" || (q.st === "stuck" && q.gone) || !Number.isFinite(Z.x) || !pdrOf(id)) continue; const d = Math.hypot(Z.x - F.x, Z.z - F.z); if (d < bd) { bd = d; best = id; } }
  return best;
}
const PDHAIL = {
  use() {
    const F = api.FOOT; if (!F.on || busy() || (api.INT && api.INT.on) || (api.MNT && api.MNT.on) || (api.DMT && api.DMT.on)) return null;
    const id = pdrHailNear(); if (id == null) return null; const me = pdrFirst(pdrOf(id));
    if (pdrHailed(id)) return { label: "WAVE ON", hint: () => api.keyHint("use", `wave ${me} on`), act: () => pdrWave(id) };
    return { label: "HAIL", hint: () => api.keyHint("use", `hail ${me}`), act: () => pdrHail(id) };
  }
};
const _pc = [0, 0, 0, 0];
const T_LANE = 1.6;                                                              // m right of the crown, the traffic's own lane (TRAF.lane)
function pdrPins() {
  const s = S(), out = []; if (!s || !obj0(s.pdr)) return out;
  for (const id of Object.keys(s.pdr)) {
    const q = s.pdr[id], m = pdrOf(id); if (!obj0(q) || !m) continue;
    if (q.st === "home") { const Zh = q.aid ? PDS.get(id) : null, ap = Zh && Zh.aid && Number.isFinite(Zh.x) ? Zh : q.aid ? pdrAidPos(id) : null; if (ap) out.push({ x: ap.x, z: ap.z, name: pdrFirst(m).toUpperCase() + (q.aidB > 0 ? ": HEADING IN" : ": GOING TO HELP"), col: "#e0a020", glyph: "P" }); continue; }   /* 5.4c2a */
    const Z = PDS.get(id), r = Z && Number.isFinite(Z.x) ? null : conR().find(v => v.id === id), p = r ? pdrPos(r, q) : Z; if (!p || !Number.isFinite(p.x)) continue;
    out.push({ x: p.x, z: p.z, name: pdrFirst(m).toUpperCase() + (q.st === "stuck" ? (q.gone ? "'S TRUCK: STUCK" : ": STUCK") : q.st === "back" ? ": HEADING IN" : pdrOnWay(conR().find(v => v.id === id) || { pts: [] }, q) ? ": DRIVING OUT" : ": PLOWING"), col: q.st === "stuck" ? "#e05a3a" : "#e0a020", glyph: "P" });
  }
  return out;
}
function pdrWhere(id) {                                                          // where the road's driver is, in a few words ("" with no driver)
  const s = S(), m = pdrOf(id), c = s && s.con && s.con[id], r = c && conR().find(v => v.id === id); if (!m || !c || !r) return "";
  const q = (s.pdr && s.pdr[id]) || { st: "home", p: 0 }, km = (q.p / 1000).toFixed(1), due = pdrDue(c, r), RD = window.TLXR.ROADS;
  if (q.st === "stuck" && q.help && pdrOf(q.help)) return `stuck ${km} km along, ${pdrHrs(q.sk)} now: ${pdrFirst(pdrOf(q.help))} is on the way to pull them out`;
  if (q.st === "home" && q.aid) { const c2 = s.con[q.aid], n2 = (c2 && c2.name) || "road", w2 = pdrOf(q.aid), left = q.aidT - PDR.aid.hitch;
    return q.aidB > 0 ? `on the way back in from the ${n2}, about ${pdrHrs(q.aidB)} out; the ${c.name} waits` : left > 0 ? `gone to pull ${w2 ? pdrFirst(w2) : "a driver"} out on the ${n2}: there in about ${pdrHrs(left)}; the ${c.name} waits` : `roping up to ${w2 ? pdrFirst(w2) + "'s" : "the bogged"} truck on the ${n2}; the ${c.name} waits`; }
  if (q.st === "stuck") return q.gone ? `walked home after ${PDR.bog.walk} h in the cold; the truck is stuck ${km} km along, ${q.tow > 0 ? "and the tow truck is fetching it" : "until a tow fetches it (PAY A TOW on their Staff card)"}` : `stuck ${km} km along, ${pdrHrs(q.sk)} now: ${q.tow > 0 ? "the tow truck is on its way" : "PAY A TOW on their Staff card"}`;
  if (!(pdrSkill(m, id) > 0)) return "not going out while wages are owed";
  if (q.st !== "home" && pdrOnWay(r, q)) return q.st === "back" ? (q.hold ? "back, waiting for you to move clear of the truck's parking spot" : "nearly in, bringing the truck back to its spot") : `driving the truck out to the road, ${due.length} stretch${due.length === 1 ? "" : "es"} to plow`;
  if (q.st === "out") { const g = r.seg[Math.min(r.seg.length - 1, Math.floor(q.p / RD.seg))]; return g && api.WX.at(g.mx, g.mz) >= RD.plowWx ? `sitting out the weather ${km} km along` : `out on it, ${km} km along, ${due.length} stretch${due.length === 1 ? "" : "es"} to go`; }
  if (q.st === "back") return q.hold ? "back, waiting for you to move clear of the truck's parking spot" : `on the way back in, ${km} km out${q.why ? " (" + q.why + ")" : ""}`;
  if (c.cover) return "in: the kommune's own truck has it this once";
  const kw = pdrMine(m) ? pdrKitWhy(q) : "";
  if (!due.length) return kw && !pdrRec(q.truck) ? "in: " + kw : "in: nothing on it to plow";
  if (api.WX.at(r.pts[0][0], r.pts[0][1]) >= RD.plowWx) return "in, waiting for the weather to ease";
  return kw ? `in, snow on the road: ${kw}` : "getting the truck out";
}
function pdrAnswer(a, q, x) {                                                    // a driver's answers in the interview (tlx-staff.js decides the slip and the checked reference)
  const v = a.village, n = a.xp, r = a.xpReal, w = n === 1 ? "winter" : "winters", me = String(a.name).split(" ")[0], R = a.ref || { name: "the foreman", village: v };
  if (q === "xp") {
    if (x.liar && x.slip) return `${n} ${w}. Well... most of them on the quay with a wheel loader. Behind a blade on an open road, ${r === 0 ? "none" : r === 1 ? "one" : r}.`;
    if (x.liar) return `${n} ${w}, all over Finnmark. Roads, yards, the lot.${x.tail}`;
    return (n === 0 ? `None on a road, to be honest. I've kept my father's yard in ${v} clear with the tractor since I was fourteen.`
      : n <= 3 ? `${n} ${w} on a kommune truck out of ${v}, mostly nights.`
      : n <= 10 ? `${n} ${w} plowing out of ${v}: the fell road when it was open, the streets when it was not.`
      : `${n} ${w}. I held the ${v} road on contract myself until I got tired of the paperwork.`) + x.tail;
  }
  if (q === "stove") {
    if (x.liar && x.slip) return `Keep the speed up and trust the truck? I've not really been out in one, if I'm honest.`;
    if (x.liar) return `Happens all the time. I'd manage. Never been stuck yet.${x.tail}`;
    return (r >= 3 ? `Blade up a hand so it rides, down to walking pace, and I take the poles one at a time on my right. No pole, I stop with the lights on and wait: snow can be plowed in an hour, a truck off the bank cannot.`
      : `Stop, lights on, and ring you. I'd sooner be late than in the ditch.`) + x.tail;
  }
  if (q === "ref") {
    if (x.liar && x.slip) return `He's on the boats now, no signal out there. And the firm went under. You'd have to take my word for it.`;
    if (x.liar) return `Ring ${R.name} in ${R.village}. (You ring: "${me}? Drove for us a bit. The truck came back in one piece, mostly.")`;
    return n === 0 ? `Nobody has paid me to drive yet. Ring ${R.name} in ${R.village}: I kept his loader running all last winter. (You ring: "Careful with a machine. Turns up.")`
      : `Ring ${R.name} in ${R.village}. (You ring: "${me}? ${n} ${w} on our roads and never a mailbox down. We'd have them back tomorrow.")`;
  }
  if (q === "why") {
    const k = a.tr && a.tr.work || 1, own = a.kit !== "mine";
    return (k >= 1.1 ? `I like a road that is black to its edges by breakfast.${own ? " And the truck is standing idle." : " Give me a truck and yours will be."}`
      : k <= 0.8 ? `${own ? "The truck's paid for, and it" : "It"} is only when it snows, isn't it? Suits me.`
      : `Steady winter money, and I know that road.`) + (x.hot ? " Is that it?" : "");
  }
  return "";
}
/* the trucks of yours a driver could be given: a blade fitted, and no other road's driver has it */
function pdrFleet(id) {
  const s = S(), taken = new Set(); for (const k of Object.keys(s.pdr || {})) if (k !== id && s.pdr[k] && s.pdr[k].truck != null) taken.add(String(s.pdr[k].truck));
  return trucks().filter(t => bladeOf(t.uid) && !taken.has(String(t.uid)));
}
function pdrActs(m, p) {
  if (!p || !p.road) return [];
  const s = S(), q = s.pdr && s.pdr[p.road], t = q ? pdrRec(q.truck) : null;
  if (obj0(q) && q.st === "stuck") {                                              /* 5.4c1: PAY A TOW; 5.4c2a: SEND one of your other drivers */
    const r = conR().find(v => v.id === p.road); if (!r) return [];
    const hm = q.help ? pdrOf(q.help) : null; if (hm) return [{ k: "tow", label: `${pdrFirst(hm).toUpperCase()} IS ON THE WAY`, off: true }];
    const out = [{ k: "tow", label: q.tow > 0 ? "TOW ON ITS WAY" : `PAY A TOW · ${api.fmtCash(pdrTowCost(r, q))}`, off: q.tow > 0 }];
    if (!(q.tow > 0) && !q.gone) for (const k of pdrAidAble(p.road)) { const A = pdrAidLine(k, p.road); out.push({ k: "s" + k, label: `SEND ${pdrFirst(pdrOf(k)).toUpperCase()} · ${pdrHrs(pdrAidHrs(A))}` }); }
    return out;
  }
  if (obj0(q) && q.aid) return [];                                               /* away helping: nothing to press until they are back */
  if (!pdrMine(m)) return [];
  if (t) return q.st === "home" ? [{ k: "u", label: "TAKE THE TRUCK BACK" }] : [{ k: "r", label: q.rc ? "RECALLED" : "RECALL", off: !!q.rc }];
  const fl = pdrFleet(p.road);
  return fl.map(v => { const same = fl.filter(o => o.id === v.id); return { k: "a" + v.uid, label: `ASSIGN THE ${pdrTName(v).toUpperCase()}${same.length > 1 ? " " + (same.indexOf(v) + 1) : ""}` }; });
}
function pdrAct(m, k, p) {
  const s = S(), id = p && p.road, c = id && s.con && s.con[id]; if (!c) return false;
  if (k === "tow") return pdrTow(id);
  if (k[0] === "s") return pdrSend(id, k.slice(1));
  if (!pdrMine(m)) return false;
  if (!obj0(s.pdr)) s.pdr = {};
  let q = s.pdr[id]; if (!q) q = s.pdr[id] = { st: "home", p: 0, w: 0, n: 0, cash: 0, wkN: 0, wkCash: 0, who: m.id, truck: null, f0: 0, told: "", why: "", rc: false, hold: false };
  const me = pdrFirst(m);
  if (q.aid) return false;
  if (k[0] === "a") {
    const t = pdrFleet(id).find(v => "a" + v.uid === k); if (!t || pdrRec(q.truck)) return false;
    q.truck = t.uid; q.who = m.id; q.told = ""; q.w = 0;
    api.toast(`${me} drives your ${pdrTName(t)} on the ${c.name} from now on: they take it when snow lies on the road and bring it back to where it stood. The diesel and the cutting edge are yours.`, "good");
  } else if (k === "u") {
    const t = pdrRec(q.truck); if (!t || q.st !== "home") return false;
    q.truck = null; q.told = ""; q.w = 0;
    api.toast(`The ${pdrTName(t)} is yours alone again. ${me} has no truck to plow the ${c.name} with.`);
  } else if (k === "r") {
    const t = pdrRec(q.truck); if (!t || q.st === "home" || q.st === "stuck" || q.rc) return false;
    q.rc = true; q.why = "you called them in"; if (q.st === "out") q.st = "back";
    api.toast(`${me} is bringing the ${pdrTName(t)} back in. It is yours alone again once it is on its spot.`);
  } else return false;
  api.save(); conRefresh(); return true;
}
const PDROLE = { name: "Plow driver", wage: PDR.wage, blurb: "plows a road you hold the contract for", at: "on the", the: true, app: true,
  kit: () => (Math.random() < PDR.mine ? "mine" : "own"),
  tag: a => (a && a.kit === "mine" ? "no truck: drives one of yours, and all they open is paid to you" : `own truck and blade · keeps ${Math.round(PDR.cut * 100)}% of what they open`),
  gone: "The road they plowed for you is no longer yours.",
  greet: (p, a) => `Hello! I hear you want a driver for the ${p ? p.name : "road"}. ${a && a.kit === "mine" ? "I have the licence but no truck: I would drive one of yours." : "I have my own truck and blade."}`,
  qs: { stove: { label: "A WHITEOUT?", ask: "A whiteout on the open stretch: the blade is packing up and you cannot see the next pole. What do you do?" } },
  answer: pdrAnswer, acts: pdrActs, act: pdrAct,
  note: (m, p) => {
    const where = (p && pdrWhere(p.road)) || "in", road = p ? p.name : "road";
    if (!pdrMine(m)) return `Plows the ${road} in their own truck and keeps ${Math.round(PDR.cut * 100)}% of what the kommune pays for the stretches they open: ${where}`;
    const q = p && S().pdr && S().pdr[p.road], t = q ? pdrRec(q.truck) : null;
    return `Plows the ${road} in a truck of yours (${t ? `the ${pdrTName(t)}: ${Math.round(pdrFuel(t))} L in the tank, the cutting edge at ${pct(condOf(t.uid))}%` : "none assigned"}); all the kommune pays is yours, and so are the diesel and the edge: ${where}`;
  } };
function pdrPlaces() {
  const s = S(); if (!s || !obj0(s.con)) return [];
  const g = api.world.garage();
  return Object.keys(s.con).map(id => {
    const c = s.con[id], q = s.pdr && s.pdr[id], home = !q || q.st === "home" || (q.st === "stuck" && !!q.gone), m = pdrOf(id), who = m ? pdrFirst(m) : "Your driver";
    /* 5.4b2a: a word is had where the truck is. Out: at the truck on the road. In, their own truck: beside it on its spot, or at the garage. */
    if (q && q.st === "home" && q.aid) return { id: pdrPid(id), role: "plowdriver", name: c.name, road: id, x: NaN, z: NaN, spot: "the truck",
      talk: `${who} is away pulling another driver's truck out of a drift: have your word when they are back in.` };   /* 5.4c2a */
    if (!home) {
      const Z = PDS.get(id), r = Z && Number.isFinite(Z.x) ? null : conR().find(v => v.id === id), p = r ? pdrPos(r, q) : Z && Number.isFinite(Z.x) ? Z : null;
      return { id: pdrPid(id), role: "plowdriver", name: c.name, road: id, x: p ? p.x : NaN, z: p ? p.z : NaN, spot: "the truck",
        talk: `${who} is out on the ${c.name}: a word in person is had within ${PDR.hailR} m of the truck (the P pin on the Map). On foot beside it, hail them and they stop.` };
    }
    const r = m && !pdrMine(m) && !(q && q.st === "stuck") ? conR().find(v => v.id === id) : null, sp = r ? pdrSpot(r) : null;
    return { id: pdrPid(id), role: "plowdriver", name: c.name, road: id, x: g.x, z: g.z, pts: sp ? [[sp.x, sp.z, "their truck"]] : null, spot: "the garage",
      talk: sp ? `${who} is in: have a word beside their truck, parked at the first end of the ${c.name}, or at the garage.` : `${who} is at the garage between runs: go there to have a word in person.` };
  });
}
const PICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 15h9V9h4l3 3v3h2"/><circle cx="7" cy="17" r="1.8"/><circle cx="16" cy="17" r="1.8"/><path d="M21 11c1 2 1 5 0 8"/><path d="M4 9l2-3M9 9l1-3"/></svg>';
function appRender(el) {
  tidy();
  const U = api.ui, s = S(), rs = conR(), H = api.GS.hour, has = Object.keys(s.blades).length > 0, mul = api.payMul(), cash = v => api.fmtCash(Math.round(v));
  const mine = rs.filter(r => s.con[r.id]).length;
  let h = U.tabHead("PLOW · KOMMUNEN", "Road contracts", api.fmtCash(api.GS.cash));
  h += `<div class="tsub">${mine} of ${rs.length} roads yours · ${cash(400 * PLC.perM * mul)} a 400 m stretch opened · paid so far ${cash(s.conPaid)}</div>`;
  h += winCards(U, s);                                                           // 4.2b2: doors your blade's snow lies across, first: they are on a clock
  h += strCards(U, s);                                                           // 4.2c2b: heaps of yours standing in a street
  if (!rs.length) h += `<p class="tnote2">The kommune has no road out to tender.</p>`;
  for (const r of rs) {
    const c = s.con[r.id], ban = s.conBan[r.id] > H, file = !c && !ban && s.conRec && s.conRec[r.id] ? s.conRec[r.id].strikes : 0, n = r.seg.filter(g => g.legs.length).length, snow = r.seg.filter((g, i) => g.legs.length && r.st.s[i] >= PLC.due).length;
    const w = c ? conWork(c, r) : null, dm = c ? pdrOf(r.id) : null;
    h += U.tabCard({ tf: "plc:" + r.id, title: r.name,
      chips: c ? U.chip("YOURS", "ok") + (dm ? U.chip("DRIVER", "ok") : "") + (c.strikes ? U.chip(`WARNING ${c.strikes} OF ${PLC.strikes}`, "due") : "") + (w.shut ? U.chip("SHUT", "due") : w.n ? U.chip("SNOW ON IT", "heavy") : U.chip("CLEAR")) : ban ? U.chip("TAKEN BACK", "due") : U.chip("OUT TO TENDER") + (file ? U.chip(`WARNING ${file} OF ${PLC.strikes} ON FILE`, "due") : ""),
      meta: `${(r.len / 1000).toFixed(1)} km · ${n} stretches · ${cash(r.len * PLC.perM * mul)} for the whole road opened inside ${PLC.fullH} h`,
      note: c ? (w.n ? `${w.n} stretch${w.n === 1 ? "" : "es"} to open, ${(w.m / 1000).toFixed(1)} km: ${conState(c, w)}.` : "Nothing on it to plow.") + ` This week: ${cash(c.wk)} for ${(c.wkM / 1000).toFixed(1)} km.` + (dm ? ` ${U.esc(dm.name)} drives it for you: ${U.esc(pdrWhere(r.id))}.` : TLX.staff && TLX.staff.addRole ? " Nobody drives it for you: the Staff app has the job posted." : "")
        : snow ? `${snow} of its stretches have snow on them now. Until it is signed the council's plow goes out once the weather eases.` : "Plowed and open. The council's plow keeps it until someone signs for it.",
      warn: c ? (c.cover ? "The kommune's own truck is opening it this once. What it opens is not paid." : conQuitCost(c) ? "A stretch has lain shut too long to walk away from: handing the road back now is a warning." : "") : ban ? `Taken back after ${PLC.strikes} warnings. Out to tender again in ${Math.max(1, Math.ceil((s.conBan[r.id] - H) / 24))} days.` : !has ? "Fit a blade to a truck first: the garage's Plow tab." : file ? `The kommune's file on this road holds ${file === 1 ? "a warning" : file + " warnings"} against you. Sign again and ${file === 1 ? "it comes" : "they come"} with it.` : "",
      pay: c ? `${cash(400 * PLC.perM * mul)} a stretch` : "", act: (c ? "plq:" : "pls:") + r.id, actLabel: c ? "HAND BACK" : "SIGN", blocked: !c && (!has || ban) });
  }
  h += drvCards(U, s, has, mul, cash);                                           // 4.2b1: the driveways
  h += lotCards(U, s, has, mul, cash);                                           // 4.2c1: the lots
  if (s.conLast.length) h += U.sec("Statements", "") + `<div class="tsml2">${s.conLast.map(q => `<div class="tsm2 tprow"><b>${U.esc(String(q.d || ""))}</b><span>${U.esc(String(q.road || ""))} · ${Number.isFinite(q.n) ? Math.round(q.n) + " cleared" : ((+q.m || 0) / 1000).toFixed(1) + " km"} · +${cash(+q.pay || 0)}${q.dn > 0 ? ` · ${Math.round(q.dn)} by your driver` : ""}${q.lapsed ? " · a warning struck off" : ""}${q.gone === "taken" ? " · taken back by the kommune" : q.gone === "back" ? " · handed back" : ""}</span>${q.w ? U.chip(`WARNINGS ${q.w}`, "due") : U.chip("PAID", "ok")}</div>`).join("")}</div>`;
  h += `<p class="tnote2">A road you sign for is yours: the council's plow stays home on it. Every 400 m stretch your blade opens (both sides of the centre line, or one pass with a blade 3 m wide) pays at once, in full inside ${PLC.fullH} hours of the weather easing and down to half after ${PLC.lowH}. A stretch left shut ${PLC.lateH} hours, or slept through, is opened by the kommune's own truck and is a warning. ${PLC.strikes} warnings and the road is taken back; a week without one strikes a warning off. Handing a road back does not clear its warnings (the kommune keeps them on file for when you sign again), and handing one back with a stretch shut ${PLC.lateH / 2} hours or more is a warning itself. A plow driver hired in the Staff app works a road of yours whenever snow lies on it. One with their own truck keeps ${Math.round(PDR.cut * 100)}% of what the kommune pays for the stretches they open, the rest yours; one without drives a truck of yours that you assign on their card, and then all the pay is yours and so are the diesel and the cutting edge. Either way a slow driver's late stretches are still your warnings.</p>`;
  el.innerHTML = `<div class="tapp">${h}</div>`;
  for (const b of el.querySelectorAll("[data-act^='pls:']")) b.addEventListener("click", () => conSign(b.dataset.act.slice(4)));
  for (const b of el.querySelectorAll("[data-act^='plq:']")) b.addEventListener("click", () => conQuit(b.dataset.act.slice(4)));
  for (const b of el.querySelectorAll("[data-act^='pdt:']")) b.addEventListener("click", () => drvTake(b.dataset.act.slice(4)));
  for (const b of el.querySelectorAll("[data-act^='pdq:']")) b.addEventListener("click", () => drvDrop(b.dataset.act.slice(4)));
  for (const b of el.querySelectorAll("[data-act^='pat:']")) b.addEventListener("click", () => lotTake(b.dataset.act.slice(4)));
  for (const b of el.querySelectorAll("[data-act^='paq:']")) b.addEventListener("click", () => lotDrop(b.dataset.act.slice(4)));
}
/* ---------------- driveways: private customers (4.2b1) ----------------
   A handful of Kjøllefjord households (DRV.max, the same ones every boot) have a drive beside the house: a strip
   DRV.hw each side of a line from the street's edge back along the house wall (drvBuild: clear of the neighbour, sheds,
   wood piles, lamps and where a car stands). Until you TAKE ONE ON in the Plow app its owner shovels it, as today, and
   nothing about it changes. A drive you have taken on is yours: it snows in at the roads' own rate (its level st.s
   takes that share off the yard's plowing through api.world.addDrift, so the snow really lies there and a reload finds
   it), it is DUE from DRV.due, and its clock runs while the weather is under the council's limit. Clearing it is the
   road credit's rule in small: with the blade down and the truck moving (cutting forward or back-dragging) the 1 m
   length under the blade's middle is marked, and DRV.credit of the lengths marked clears the drive: it is cut to the
   yard's level and the customer pays DRV.call + DRV.perM a metre at once, in full inside DRV.fullH hours of the clock
   and falling to DRV.low of it at DRV.lowH. Left DRV.lateH hours, or slept through, the customer shovels it himself:
   no pay and a miss; DRV.miss misses and he finds someone else for DRV.offH hours. A paid clearing takes a miss off.
   DROP is free while the drive is clear; snowed in it is a miss, and misses stay on file a week (fileDrop). The Jobs app has one row for all the drives with snow in them; Monday writes one statement line.
   SAVED in x.sys.plow: drv { key: { s, h, due, miss, wk, n, mk, ms } }, drvOff { key: hour he asks again }, drvH, drvPaid, drvN.
   The marks of a drive part cleared are saved with it (mk: a "0110..." string, one character a length; ms: the snow
   level they began at), so a reload in the middle of a drive finds the lengths already cut still counted (beta 0250 #1);
   DV.marks is only their copy in memory, read back from mk the first time the blade or the hint asks. The snow your blade leaves across a door or a drive's mouth: the block comment at WIN (4.2b2). */
const DRV = { max: 8, hw: 1.6, side: 2.1, street: 2.4, len: [6, 10], call: 12, perM: 3, due: 0.12, fullH: 4, lowH: 12, low: 0.5, lateH: 12, miss: 2, offH: 168,
  bin: 1, credit: 0.8, lat: 1.3,
  names: ["Kåre", "Ragnhild", "Ole", "Siri", "Jonas", "Elin", "Nils", "Anja", "Tor", "Marit", "Hallvard", "Ingrid", "Sander", "Liv", "Aslak", "Berit"] };
const DV = { list: [], by: {}, built: false, marks: new Map(), job: {} };
const drvBase = c => Math.round(DRV.call + DRV.perM * c.L);
const drvK = h => 1 - (1 - DRV.low) * Math.max(0, Math.min(1, (h - DRV.fullH) / (DRV.lowH - DRV.fullH)));
function drvUnmark(key, st) { DV.marks.delete(key); if (st) { delete st.mk; delete st.ms; } }   // the lengths cut are forgotten, in memory and in the save
const drvList = names => (names.length < 2 ? names.join("") : names.slice(0, -1).join(", ") + " and " + names[names.length - 1]);
function drvFree(W, at, v0, v1, D, cars) {
  for (let v = v0; v >= v1 - 0.01; v -= 1) {
    const p = at(v), x = p[0], z = p[1];
    if (W.isSea(x, z) || (W.isWater && W.isWater(x, z))) return false;
    for (const c of cars) if (Math.hypot(c.x - x, c.z - z) < 3.2) return false;
    for (const o of W.obstaclesNear(x, z, 6)) {
      if (o.top < -1e8) continue;
      if (o.box) { const B = o.box; if (Math.hypot(B.x - D.x, B.z - D.z) < 1) continue;   // its own house: the geometry keeps the strip off the wall
        const px = x - B.x, pz = z - B.z, lu = Math.abs(px * B.c - pz * B.s) - B.hw, lv = Math.abs(px * B.s + pz * B.c) - B.hd;
        if (Math.max(lu, lv) < DRV.hw + 0.2) return false; continue; }
      if (Math.hypot(o.x - x, o.z - z) < (o.r || 0.5) + DRV.hw + 0.1) return false;
    }
  }
  return true;
}
function drvBuild() {
  DV.built = true; DV.list = []; DV.by = {}; DV.marks.clear();
  const W = api.world; if (!W.addDrift || !Array.isArray(W.doors) || !W.replow) return;
  const cars = window.TLXC && Array.isArray(TLXC.cars) ? TLXC.cars : [], cand = [], seen = new Set();
  for (const D of W.doors) {
    if (!D || !Array.isArray(D.grid) || !Number.isFinite(D.nx) || !Number.isFinite(D.rr) || !Number.isFinite(D.d)) continue;
    const hw = D.rr - 3.5; if (!(hw <= 4.6)) continue;                             // the store, the church: no private drive
    const g = (D.grid[0] - D.x) * D.nx + (D.grid[1] - D.z) * D.nz; if (!(g > D.d / 2 + 4)) continue;   // metres from the house's middle out to its street's centre line
    const v0 = g - DRV.street, v1 = Math.max(v0 - DRV.len[1], -D.d / 2), L = v0 - v1; if (L < DRV.len[0]) continue;
    const key = Math.round(D.x) + "_" + Math.round(D.z); if (seen.has(key)) continue; seen.add(key);
    const h = Math.abs(Math.round(D.x * 7 + D.z * 13)), tx = D.nz, tz = -D.nx, first = h % 2 ? 1 : -1;
    for (const sd of [first, -first]) {
      const u = sd * (hw + DRV.side), at = v => [D.x + D.nx * v + tx * u, D.z + D.nz * v + tz * u];
      if (!drvFree(W, at, v0, v1, D, cars)) continue;
      const car = cars.find(c => Math.hypot(c.x - D.x, c.z - D.z) < 11 && c.owner);
      cand.push({ key, h, L, a: at(v0), b: at(v1), in: at(v0 - DRV.hw - 0.1), name: car ? car.owner : DRV.names[h % DRV.names.length], door: D });
      break;
    }
  }
  cand.sort((p, q) => (p.h * 2654435761 % 1009) - (q.h * 2654435761 % 1009) || (p.key < q.key ? -1 : 1));
  const used = new Set();
  for (const c of cand) {
    if (DV.list.length >= DRV.max) break;
    c.mx = (c.a[0] + c.b[0]) / 2; c.mz = (c.a[1] + c.b[1]) / 2; c.ux = (c.b[0] - c.a[0]) / c.L; c.uz = (c.b[1] - c.a[1]) / c.L;
    if (DV.list.some(o => Math.hypot(o.mx - c.mx, o.mz - c.mz) < 2 * DRV.hw + 1.2)) continue;   // two neighbours' drives side by side in one gap would run into each other: the first has it
    if (used.has(c.name)) { const alt = DRV.names.find(n => !used.has(n)); if (alt) c.name = alt; }   // two neighbours of one name read as one customer
    used.add(c.name);
    c.legs = W.addDrift([c.in, c.b], DRV.hw); c.q = 0; c.place = String((W.depot && W.depot.name) || "Kjøllefjord").replace(/ quay$/i, "");
    DV.list.push(c); DV.by[c.key] = c;
  }
  const s = S(); if (s) for (const c of DV.list) drvApply(c, s.drv && s.drv[c.key]);
}
function drvApply(c, st) {                                                       // the snow level on the ground follows the saved one, in steps of 0.05
  const q = st ? Math.round(Math.max(0, Math.min(1, st.s)) * 20) / 20 : 0;
  if (q === c.q) return; c.q = q; for (const Y of c.legs) Y.k = q; api.world.replow(c.legs, true);   // true: what a blade heaped beside it stays (4.2b2)
}
function drvTidy(s) {
  const num = (v, lo, hi) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : lo);
  if (!obj0(s.drv)) s.drv = {};
  if (!obj0(s.drvOff)) s.drvOff = {};
  s.drvPaid = num(s.drvPaid, 0, 1e9); s.drvN = Math.floor(num(s.drvN, 0, 1e9)); s.drvWk = num(s.drvWk, 0, 1e9); s.drvWkN = Math.floor(num(s.drvWkN, 0, 1e9)); if (!Number.isFinite(s.drvH)) s.drvH = -1;
  for (const k of Object.keys(s.drv)) {
    const st = s.drv[k]; if (!obj0(st)) { delete s.drv[k]; continue; }
    st.s = num(st.s, 0, 1); st.h = num(st.h, 0, 1e6); st.miss = Math.floor(num(st.miss, 0, DRV.miss - 1)); st.wk = num(st.wk, 0, 1e9); st.n = Math.floor(num(st.n, 0, 1e9)); st.due = st.s >= DRV.due ? 1 : 0;
    if (typeof st.mk !== "string" || !/^[01]{1,64}$/.test(st.mk) || !Number.isFinite(st.ms) || !st.due) { delete st.mk; delete st.ms; }   // the saved marks of a drive part cleared
  }
  for (const k of Object.keys(s.drvOff)) if (!Number.isFinite(s.drvOff[k])) delete s.drvOff[k];
  if (!obj0(s.drvSulk)) s.drvSulk = {};
  for (const k of Object.keys(s.drvSulk)) if (!(s.drvOff[k] > 0)) delete s.drvSulk[k];
  fileTidy(s, "drv", DRV);
  if (!obj0(s.win)) s.win = {};
  for (const k of Object.keys(s.win)) { const e = s.win[k]; if (!obj0(e) || !(e.v > 0)) { delete s.win[k]; continue; } e.v = num(e.v, 0, 20); e.h = num(e.h, 0, 1e6); }
  s.winC = Math.floor(num(s.winC, 0, 1e6)); s.winN = Math.floor(num(s.winN, 0, 1e9)); if (!Number.isFinite(s.winH)) s.winH = -1;
}
/* the file a customer keeps on you after a DROP (beta 0257 #1/#2). Before, DROP and TAKE ON again wrote a fresh record:
   a miss was wiped, and a drive or lot about to be dug out was reset for nothing. Now handing one back SNOWED IN is the
   owner digging it out by hand (a miss, as at 12 h), and the misses go on file (drvRec / lotRec { key: { miss, until } })
   for T.offH hours: TAKE ON inside that picks them up. The miss that would be the second loses it for the week like any
   other. A clear drive or lot with no miss is still handed back for nothing. kind is "drv" or "lot". */
function fileOf(s, kind, key) { const e = s[kind + "Rec"] && s[kind + "Rec"][key]; return e && e.until > api.GS.hour ? e.miss : 0; }
function fileTake(s, kind, key) { const n = fileOf(s, kind, key); if (s[kind + "Rec"]) delete s[kind + "Rec"][key]; return n; }
function fileDrop(s, kind, key, st, T) {                                          // -> 0 nothing against you, 1 a miss on file, 2 lost for T.offH hours
  const H = api.GS.hour, due = st.s >= T.due, miss = Math.max(0, Math.floor(st.miss) || 0) + (due ? 1 : 0);
  if (!obj0(s[kind + "Rec"])) s[kind + "Rec"] = {};
  delete s[kind + "Rec"][key];
  if (miss >= T.miss) { s[kind + "Off"][key] = H + T.offH; return 2; }
  if (miss > 0) s[kind + "Rec"][key] = { miss, until: H + T.offH };
  return due ? 1 : 0;
}
/* beta 0325 #1: the week's pay belongs to the week, not to the record. A drive or lot's record (with its week counters
   wk / n) goes when it is handed back or lost, and the Monday statement summed only the records still held, so a drive
   plowed for $42 and given up on Saturday was missing from Monday's line. wkKeep moves the counters into drvWk / drvWkN
   (lotWk / lotWkN) before the record is deleted; wkTake is what Monday adds and clears. Saved. */
function wkKeep(s, kind, st) {
  if (!obj0(st)) return; const p = Number.isFinite(st.wk) && st.wk > 0 ? st.wk : 0, n = Number.isFinite(st.n) && st.n > 0 ? Math.floor(st.n) : 0;
  s[kind + "Wk"] = (Number.isFinite(s[kind + "Wk"]) ? s[kind + "Wk"] : 0) + p; s[kind + "WkN"] = (Number.isFinite(s[kind + "WkN"]) ? s[kind + "WkN"] : 0) + n; st.wk = 0; st.n = 0;
}
function wkTake(s, kind) {
  const p = Number.isFinite(s[kind + "Wk"]) && s[kind + "Wk"] > 0 ? s[kind + "Wk"] : 0, n = Number.isFinite(s[kind + "WkN"]) && s[kind + "WkN"] > 0 ? Math.floor(s[kind + "WkN"]) : 0;
  s[kind + "Wk"] = 0; s[kind + "WkN"] = 0; return [p, n];
}
function fileTidy(s, kind, T) {
  if (!obj0(s[kind + "Rec"])) s[kind + "Rec"] = {};
  const R = s[kind + "Rec"];
  for (const k of Object.keys(R)) { const e = R[k]; if (!obj0(e) || !Number.isFinite(e.until) || !(e.miss >= 1)) { delete R[k]; continue; } e.miss = Math.min(T.miss - 1, Math.floor(e.miss)); }
}
function drvTake(key) {
  const s = S(), c = DV.by[key], H = api.GS.hour; if (!s || !c || s.drv[key]) return false;
  if (!Object.keys(s.blades).length) { api.toast("Nobody hires a plow man without a plow. Fit a blade to a truck first: the garage's Plow tab.", "warn"); return false; }
  if (s.drvOff[key] > H) { const dys = Math.max(1, Math.ceil((s.drvOff[key] - H) / 24)); api.toast(s.drvSulk[key] ? `${c.name} had to dig your plow's snow out of the way and is not asking you. Try again in ${dys} day${dys === 1 ? "" : "s"}.` : `${c.name} has someone else for the drive. Ask again in ${dys} day${dys === 1 ? "" : "s"}.`, "warn"); return false; }
  if (winTalk(s)) { api.toast(WIN.talkLine, "warn"); return false; }
  delete s.drvOff[key]; delete s.drvSulk[key];
  const miss = fileTake(s, "drv", key);
  s.drv[key] = { s: 0, h: 0, due: 0, miss, wk: 0, n: 0 };
  api.toast(`${c.name}'s drive is yours to keep clear: ${api.fmtCash(Math.round(drvBase(c) * api.payMul()))} every time you plow it out inside ${DRV.fullH} h of the weather easing. ${c.name} has put the shovel away.` + (miss ? ` The time it was shovelled by hand has not been forgotten: once more and you lose the customer.` : ""), "good");
  api.save(); conRefresh(); return true;
}
function drvDrop(key) {
  const s = S(), c = DV.by[key]; if (!s || !s.drv || !s.drv[key]) return false;
  const st = s.drv[key], due = obj0(st) && st.s >= DRV.due, r = c && obj0(st) ? fileDrop(s, "drv", key, st, DRV) : 0;
  if (r === 2) delete s.drvSulk[key];
  wkKeep(s, "drv", st); delete s.drv[key]; DV.marks.delete(key); if (c) drvApply(c, null);
  api.toast(c ? `You've given up ${c.name}'s drive. ${c.name} is back to shovelling it.`
    + (r === 2 ? ` It was snowed in when you gave it up, the second time ${c.name} has had to dig it out: not asking you again for a week.`
      : r === 1 ? ` It was snowed in when you gave it up, and ${c.name} will remember digging it out if you ask for it back this week.`
        : fileOf(s, "drv", key) ? ` The time it was shovelled by hand is remembered for a week.` : "") : "You've given that drive up.", r === 2 ? "bad" : due ? "warn" : undefined);
  api.save(); conRefresh(); return true;
}
function drvGone(list, slept) {                                                  // the customers who cleared their own drives: one line for all of them
  const s = S(), H = api.GS.hour, lost = [];
  for (const c of list) { const st = s.drv[c.key]; st.s = 0; st.h = 0; st.due = 0; st.miss++; drvUnmark(c.key, st); if (st.miss >= DRV.miss) { wkKeep(s, "drv", st); delete s.drv[c.key]; s.drvOff[c.key] = H + DRV.offH; delete s.drvSulk[c.key]; lost.push(c.name); } drvApply(c, s.drv[c.key]); }
  const who = drvList(list.map(c => c.name)), one = list.length === 1;
  api.toast((slept ? `While you were away ${who} dug ${one ? "the drive" : "their drives"} out by hand.` : `${who} gave up waiting and shovelled the drive${one ? "" : "s"} by hand.`) + " No pay."
    + (lost.length ? ` ${drvList(lost)} ${lost.length === 1 ? "has" : "have"} found someone else to plow.` : ` Once more and ${one ? "you lose the customer" : "you lose them"}.`), lost.length ? "bad" : "warn");
  api.save(); conRefresh();
}
function drvStep() {
  const s = S(); if (!s || !s.drv || !DV.list.length || !api.started()) return;
  const H = api.GS.hour, dh = s.drvH < 0 || H < s.drvH ? 0 : H - s.drvH; s.drvH = H;
  if (!Object.keys(s.drv).length) return;
  const RD = (window.TLXR && TLXR.ROADS) || { fill: 0.16, fillA: 0.5, fillB: 0.95, plowWx: 0.6, skip: 2 }, slept = dh > RD.skip, WX = api.WX, gone = [];
  let fresh = 0;
  for (const c of DV.list) {
    const st = s.drv[c.key]; if (!st) continue;
    if (slept) { if (st.s >= DRV.due) gone.push(c); else { st.s = 0; st.h = 0; st.due = 0; drvUnmark(c.key, st); } }
    else {
      const w = WX.at(c.mx, c.mz);
      st.s = Math.min(1, st.s + dh * RD.fill * api.sstep(RD.fillA, RD.fillB, w));
      if (st.s >= DRV.due) { if (!st.due) { st.due = 1; fresh++; } if (w < RD.plowWx) st.h += dh; if (st.h >= DRV.lateH) gone.push(c); }
    }
    drvApply(c, st);
  }
  if (gone.length) drvGone(gone, slept);
  else if (fresh) { const n = DV.list.filter(c => { const st = s.drv[c.key]; return st && st.due; }).length; api.toast(`Snow in ${n === 1 ? "one of your drives" : n + " of your drives"}. Full pay inside ${DRV.fullH} h of the weather easing.`); conRefresh(); }
}
function drvMark(x, z, mark) {                                                   // the blade's middle at (x, z): -> { name, k (share of the lengths done) } on a due drive of yours, else null
  const s = S(); if (!s || !s.drv) return null;
  for (const c of DV.list) {
    const st = s.drv[c.key]; if (!st || !(st.s >= DRV.due)) continue;
    const px = x - c.a[0], pz = z - c.a[1], t = px * c.ux + pz * c.uz; if (t < -0.6 || t > c.L + 0.6 || Math.abs(px * c.uz - pz * c.ux) > DRV.lat) continue;
    const n = Math.max(1, Math.round(c.L / DRV.bin));
    let m = DV.marks.get(c.key);
    if (!m && typeof st.mk === "string" && st.mk.length === n && Number.isFinite(st.ms)) {   // a reload in the middle of the drive: the lengths cut before it still count
      m = { n, m: new Uint8Array(n), c: 0, s0: st.ms }; for (let i = 0; i < n; i++) if (st.mk.charCodeAt(i) === 49) { m.m[i] = 1; m.c++; }
      DV.marks.set(c.key, m);
    }
    if (m && st.s > m.s0 + BL.rise) { drvUnmark(c.key, st); m = null; }            // new snow since: what was cut is filled in
    if (!m) { if (!mark) return { name: c.name, k: 0 }; DV.marks.set(c.key, m = { n, m: new Uint8Array(n), c: 0, s0: st.s }); }
    if (mark) {
      const b = Math.max(0, Math.min(m.n - 1, Math.floor(t / DRV.bin))); if (!m.m[b]) { m.m[b] = 1; m.c++; st.mk = Array.from(m.m).join(""); st.ms = m.s0; }
      if (m.c >= DRV.credit * m.n) { drvDone(c, st); return null; }
    }
    return { name: c.name, k: m.c / m.n };
  }
  return null;
}
function drvDone(c, st) {
  const s = S(), k = drvK(st.h), h = st.h, cash = Math.round(drvBase(c) * k * api.payMul());
  api.GS.cash += cash; st.wk += cash; st.n++; s.drvPaid += cash; s.drvN++;
  st.s = 0; st.h = 0; st.due = 0; st.miss = Math.max(0, st.miss - 1); drvUnmark(c.key, st); drvApply(c, st);
  api.toast(`${c.name}'s drive is clear. ${c.name} pays ${api.fmtCash(cash)}${k < 0.995 ? ` (${Math.round(k * 100)}%: ${Math.round(h)} h after the weather eased)` : ""}.`, "good");
  api.save(); conRefresh();
}
function drvDue() { const s = S(); return s && s.drv ? DV.list.filter(c => { const st = s.drv[c.key]; return st && st.s >= DRV.due; }) : []; }
function drvJob() {
  const due = drvDue(); if (!due.length) return null;
  const s = S(), P = api.FOOT.on ? api.FOOT : api.P, U = api.ui; let near = due[0], bd = Infinity, h = 0, sum = 0;
  for (const c of due) { const st = s.drv[c.key], d = Math.hypot(c.a[0] - P.x, c.a[1] - P.z); if (d < bd) { bd = d; near = c; } if (st.h > h) h = st.h; sum += drvBase(c) * drvK(st.h); }
  const hrs = v => (v >= 1 ? Math.round(v) + " h" : Math.max(1, Math.round(v * 60)) + " min");
  const pay = "~" + api.fmtCash(Math.round(sum * api.payMul())), n = due.length, title = n === 1 ? `Plow out ${near.name}'s drive` : `Plow out ${n} driveways`;
  const state = h < DRV.fullH ? `full pay for another ${hrs(DRV.fullH - h)}` : `the pay is falling · ${hrs(DRV.lateH - h)} before ${n === 1 ? "it is" : "the first is"} shovelled by hand`;
  return { obj: DV.job, kind: "plowdrv", auto: !api.FOOT.on && !!bladeOf(curUid()), tgt: { x: near.a[0], z: near.a[1], name: near.name + "'s drive" }, col: "var(--signal)", title,
    chips: U.chip("DRIVEWAYS"), meta: `${n === 1 ? "one drive" : n + " drives"} snowed in · nearest: ${near.name}'s, ${near.place} · ${state}`, pay,
    hud: d => ({ title, sub: `${U.fmtMi(d)} to ${near.name}'s · ${pay} · ${state}` }) };
}
function drvMonday(week) {
  const s = S(); if (!s || !s.drv) return; let [pay, n] = wkTake(s, "drv");     // beta 0325 #1: what was earned on drives since handed back or lost
  for (const k of Object.keys(s.drv)) { const st = s.drv[k]; pay += st.wk; n += st.n; st.wk = 0; st.n = 0; }
  if (!n) return;
  const d = week && week.label || "";
  s.conLast.unshift({ d, road: "Driveways", pay, m: 0, w: 0, n }); s.conLast = s.conLast.slice(0, 6); api.save(); conRefresh();
  setTimeout(() => { try { api.TABLET.notify({ app: "plow", kind: "good", title: `Driveways · week to ${d}`, body: `${n} drive${n === 1 ? "" : "s"} plowed out: ${api.fmtCash(pay)}`, ttl: 8 }); } catch (e) { } }, 2600);
}
function drvCards(U, s, has, mul, cash) {
  if (!DV.list.length) return "";
  const H = api.GS.hour, hrs = v => (v >= 1 ? Math.round(v) + " h" : Math.max(1, Math.round(v * 60)) + " min");
  const talk = winTalk(s);
  let h = U.sec("Driveways", `${DV.list.filter(c => s.drv[c.key]).length} of ${DV.list.length} yours · paid so far ${cash(s.drvPaid)}`);
  for (const c of DV.list) {
    const st = s.drv[c.key], off = !st && s.drvOff[c.key] > H, sulk = off && s.drvSulk && s.drvSulk[c.key], base = drvBase(c) * mul, due = st && st.s >= DRV.due, rec = !st && !off && fileOf(s, "drv", c.key);
    h += U.tabCard({ tf: "pld:" + c.key, title: `${c.name}'s drive`,
      chips: st ? U.chip("YOURS", "ok") + (due ? U.chip("SNOWED IN", "due") : U.chip("CLEAR")) + (st.miss ? U.chip("SHOVELLED BY HAND ONCE", "heavy") : "") : off ? U.chip(sulk ? "NOT ASKING YOU" : "HAS SOMEONE ELSE", "due") : U.chip("ASKING") + (rec ? U.chip("SHOVELLED BY HAND ONCE", "heavy") : ""),
      meta: `${c.place} · ${Math.round(c.L)} m beside the house · ${cash(base)} a clearing inside ${DRV.fullH} h`,
      note: st ? (due ? (st.h < DRV.fullH ? `Snowed in: full pay for another ${hrs(DRV.fullH - st.h)}.` : `Snowed in: the pay is falling, and in ${hrs(Math.max(0, DRV.lateH - st.h))} ${c.name} shovels it by hand.`) : "Nothing in it to plow.") + ` This week: ${cash(st.wk)} for ${st.n} clearing${st.n === 1 ? "" : "s"}.`
        : off ? "" : `${c.name} shovels it by hand today. Take it on and it is yours to plow out after every snowfall.` + (rec ? ` ${c.name} dug it out once when it was yours and has not forgotten: once more and you lose the customer.` : ""),
      warn: st ? (due ? `DROP it snowed in and ${c.name} digs it out by hand: that counts against you like a drive left ${DRV.lateH} hours${st.miss ? ", and it would be the second time" : ""}.` : "") : off ? (sulk ? `${c.name} had to dig your plow's snow out of the way by hand.` : `${c.name} dug the drive out twice waiting for you.`) + ` Asking again in ${Math.max(1, Math.ceil((s.drvOff[c.key] - H) / 24))} days.` : !has ? "Fit a blade to a truck first: the garage's Plow tab." : talk ? WIN.talkLine : "",
      pay: st ? `${cash(base)} a clearing` : "", act: (st ? "pdq:" : "pdt:") + c.key, actLabel: st ? "DROP" : "TAKE ON", blocked: !st && (!has || off || talk) });
  }
  return h + `<p class="tnote2">A drive you take on stops being shovelled: it snows in until you plow it out. Blade down, drive the length of it (in from the street, or back-dragging out): once four fifths of it is cut it is clear and paid at once, in full inside ${DRV.fullH} hours of the weather easing and down to half after ${DRV.lowH}. Leave it ${DRV.lateH} hours, or sleep through it, and the customer digs it out by hand: no pay, and the second time they find someone else for a week. Mind where the snow goes: what your blade leaves lying across a front walk or the mouth of a drive has to be cut away again (nose in and push it off to one side), or the household digs it out, and that counts against you like a drive left snowed in.</p>`;
}
/* ---------------- lots: yards plowed by the square metre (4.2c1) ----------------
   The place lists its public yards (api.world.lots: the sled park at the trailhead, the helsesenter's forecourt). Until
   you TAKE ONE ON in the Plow app its owner has it cleared, as today, and nothing about it changes. A lot of yours snows
   in at the roads' own rate (a disc of api.world.addDrift over the yard, so the snow really lies there and a reload
   finds it), is DUE from LOT.due and its clock runs while the weather is under the council's limit, all as a drive's.
   What is different is the work: a lot is an AREA. lotBuild cuts it into LOT.sq m squares and keeps the ones a blade
   can reach (plowed today, LOT.ob m clear of walls, posts and parked machines, off the streets). With the blade down
   and the truck moving, forward or back-dragging, every square under the blade's edge is marked (points LOT.step m
   apart along it, LOT.in m in from each end, so a 2 m blade marks 2 m of width and a 3.5 m one 3 m); LOT.credit of the
   squares marked clears the lot: it is cut to the yard's level and its owner pays LOT.call + LOT.perM2 a square metre
   at once, in full inside LOT.fullH hours of the clock and falling to LOT.low of it at LOT.lowH. Left LOT.lateH hours,
   or slept through, the owner has it dug out: no pay and a miss; LOT.miss misses and it goes to someone else for
   LOT.offH hours. A paid clearing takes a miss off. DROP is free while the lot is clear; snowed in it is a miss, and misses stay on file a week (fileDrop). One Jobs row for all the lots with snow in them, a
   Map pin each, one Monday statement line. Where the heap may go is 4.2c2a, below ("where a lot's heap may go").
   SAVED in x.sys.plow: lot { id: { s, h, due, miss, wk, n, mk, ms, hp, hv, hx, hz } }, lotOff { id: hour it is offered again }, lotH,
   lotPaid, lotN. mk / ms are the marks of a lot part cleared (a "0110..." string, a character a square, and the snow
   level they began at), as a drive's are: a reload in the middle of a lot keeps what was cut. */
const LOT = { sq: 1, yard: 0.8, ob: 1.2, car: 2.6, street: 3.6, min: 40, call: 25, perM2: 0.45, due: 0.12, fullH: 4, lowH: 12, low: 0.5, lateH: 12, miss: 2, offH: 168, credit: 0.8, step: 0.5, in: 0.5,
  bank: 2.5, door: 4, hEps: 0.12, heapOk: 1.5, hSeen: 45, hCap: 0.8 };            // 4.2c2a: the rim band where a heap may stand, the m3 the middle may hold
const LT = { list: [], by: {}, built: false, marks: new Map(), job: {} };
/* ---- where a lot's heap may go (4.2c2a) ----
   Four fifths of the squares cut is the CUT; a lot is CLEAR when, as well, the blade's own snow is out of its middle.
   The MIDDLE is every square a truck can reach that lies more than LOT.bank m in from the rim, or within LOT.door m of
   a door whatever the rim: the band along the rim, away from the doors, is the bank, and what stands there (or outside
   the lot, or against a wall no truck reaches) is nobody's business. At the cut the ground goes back to the yard's
   level (the blade's heaps are left standing: replow's keep) and lotHeap() measures the m3 standing in the middle more
   than LOT.hEps over what the ground settles to. Under LOT.heapOk: clear and paid, as before. Over it the lot is HELD
   (st.hp): the clock runs on, the riding hint, the card and the Jobs row say how much stands there, and every time the
   blade has worked or laid snow in the lot it is measured again; under the limit it pays, by the clock at that
   moment. Left LOT.lateH hours, slept through or DROPPED it is shifted by hand: a miss, as a lot left snowed in. New
   snow over BL.rise fills it in again (the marks' own rule). Cells are not saved, so a held lot saves the m3 and where
   its middle of mass lay (hv, hx, hz) and the heap is laid again when you are next within LOT.hSeen m (the doors'
   way): a reload does not bank a heap. Option plowheaps (on): off pays at the cut. */
const heapOn = () => TLX.on("plowheaps");
function lotHeap(c) {                                                            // -> m3; c.hx / c.hz: where its middle of mass lies
  const W = api.world, C = W.cell, H = W.half, A = C * C, n = Math.max(1, Math.round(LOT.sq / C)), o0 = -LOT.sq / 2 + C / 2; let vol = 0, sx = 0, sz = 0;
  for (let p = 0; p < c.mid.length; p += 2) {
    const ix0 = Math.round((c.x + c.mid[p] * LOT.sq + o0 + H) / C), iz0 = Math.round((c.z + c.mid[p + 1] * LOT.sq + o0 + H) / C);
    for (let b = 0; b < n; b++) for (let a = 0; a < n; a++) {
      const o = W.depthAt(ix0 + a, iz0 + b) - W.restCell(ix0 + a, iz0 + b);
      if (o > LOT.hEps) { vol += o * A; sx += o * A * (ix0 + a); sz += o * A * (iz0 + b); }
    }
  }
  if (vol > 0) { c.hx = sx / vol * C - H; c.hz = sz / vol * C - H; }
  return vol;
}
function lotShovel(c) {                                                          // its owner shifts what stands in the middle by hand
  const W = api.world, h = LOT.sq / 2;
  for (let p = 0; p < c.mid.length; p += 2) { const x = c.x + c.mid[p] * LOT.sq, z = c.z + c.mid[p + 1] * LOT.sq; for (let l = -h + 0.15; l < h; l += 0.3) W.bladeSnow(x - h, z + l, x + h, z + l, 0.15); }
  c.dirty = false; c.relay = false;
}
function lotCut(c, st) {                                                         // four fifths cut: clear (true: paid) or held for the heap in its middle
  if (!heapOn() || !c.mid || !c.mid.length) { lotDone(c, st); return true; }
  st.hp = 1; lotApply(c, st);
  const v = lotHeap(c);
  if (v < LOT.heapOk) { lotDone(c, st); return true; }
  st.hv = Math.round(v * 100) / 100; st.hx = Math.round(c.hx * 10) / 10; st.hz = Math.round(c.hz * 10) / 10; c.dirty = false; c.relay = false;
  api.toast(`${capFirst(c.name)} is cut, but ${st.hv.toFixed(1)} m3 of your plow's snow stands in the middle of it. Bank it along the edge, away from the doors (a square blade carries a pile there), and ${c.who} pays.`, "warn");
  api.save(); conRefresh(); return false;
}
function lotLay(x, z) { const s = S(); if (!s || !s.lot) return; for (const c of LT.list) if (s.lot[c.id] && s.lot[c.id].hp && Math.hypot(x - c.x, z - c.z) < c.r + 3) c.dirty = true; }
function lotWake() { const s = S(); for (const c of LT.list) { const st = s && s.lot && s.lot[c.id]; c.dirty = !!(st && st.hp); c.relay = !!(st && st.hp && st.hv > 0 && Number.isFinite(st.hx + st.hz)); } }
function lotLine() {                                                             // the riding hint: a lot of yours held for its heap, close by
  const s = S(); if (!s || !s.lot || !LT.list.length) return ""; const P = api.P;
  for (const c of LT.list) { const st = s.lot[c.id]; if (st && st.hp && Math.hypot(P.x - c.x, P.z - c.z) < c.r + 6) return `${c.name}: cut, but ${(st.hv || 0).toFixed(1)} m3 of your snow stands in the middle: bank it along the edge`; }
  return "";
}
const lotBase = c => Math.round(LOT.call + LOT.perM2 * c.m2);
const lotK = h => 1 - (1 - LOT.low) * Math.max(0, Math.min(1, (h - LOT.fullH) / (LOT.lowH - LOT.fullH)));
const lotKey = (i, j) => (i + 512) * 1024 + (j + 512);
function lotUnmark(id, st) { LT.marks.delete(id); if (st) { delete st.mk; delete st.ms; delete st.hp; delete st.hv; delete st.hx; delete st.hz; } }
function lotBuild() {
  LT.built = true; LT.list = []; LT.by = {}; LT.marks.clear();
  const W = api.world; if (!W.addDrift || !W.replow || !Array.isArray(W.lots)) return;
  const cars = window.TLXC && Array.isArray(TLXC.cars) ? TLXC.cars : [], Q = LOT.sq;
  for (const o of W.lots) {
    if (!o || typeof o.id !== "string" || !Number.isFinite(o.x + o.z + o.r) || !(o.r >= 4) || LT.by[o.id]) continue;
    const c = { id: o.id, name: String(o.name || "the lot"), who: String(o.who || "the owner"), x: o.x, z: o.z, r: o.r, idx: new Map(), n: 0, q: 0, mid: [], dirty: false, relay: false, hx: o.x, hz: o.z }, n = Math.ceil(o.r / Q);
    for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) {
      if (Math.hypot(i, j) * Q > o.r - 0.5) continue;
      const x = o.x + i * Q, z = o.z + j * Q;
      if (W.isSea(x, z) || (W.isWater && W.isWater(x, z)) || W.yardAt(x, z) < LOT.yard) continue;
      if (W.townStreetNear && W.townStreetNear(x, z) < LOT.street) continue;
      if (cars.some(q => Math.hypot(q.x - x, q.z - z) < LOT.car)) continue;
      let hit = false;
      for (const b of W.obstaclesNear(x, z, 8)) {
        if (b.top < -1e8) continue;
        if (b.box) { const B = b.box, px = x - B.x, pz = z - B.z; if (Math.max(Math.abs(px * B.c - pz * B.s) - B.hw, Math.abs(px * B.s + pz * B.c) - B.hd) < LOT.ob) { hit = true; break; } }
        else if (Math.hypot(b.x - x, b.z - z) < (b.r || 0.5) + LOT.ob) { hit = true; break; }
      }
      if (!hit) { c.idx.set(lotKey(i, j), c.n++); if (Math.hypot(i, j) * Q <= o.r - LOT.bank || (Array.isArray(W.doors) && W.doors.some(D => D && Math.hypot(D.x - x, D.z - z) < LOT.door))) c.mid.push(i, j); }   // 4.2c2a: the middle, where a heap may not stand
    }
    if (c.n < LOT.min) continue;                                                   // too cluttered to be a truck's work
    c.m2 = c.n * Q * Q; c.legs = W.addDrift([[o.x, o.z], [o.x, o.z]], o.r);
    c.place = String((W.depot && W.depot.name) || "Kjøllefjord").replace(/ quay$/i, "");
    LT.list.push(c); LT.by[c.id] = c;
  }
  const s = S(); if (s) for (const c of LT.list) lotApply(c, s.lot && s.lot[c.id]);
  lotWake();
}
function lotApply(c, st) {                                                       // the snow level on the ground follows the saved one, in steps of 0.05 (cut and held for its heap: the yard's own level)
  const q = st && !st.hp ? Math.round(Math.max(0, Math.min(1, st.s)) * 20) / 20 : 0;
  if (q === c.q) return; c.q = q; for (const Y of c.legs) Y.k = q; api.world.replow(c.legs, true);   // true: the blade's heaps stay where they were pushed
}
function lotTidy(s) {
  const num = (v, lo, hi) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : lo);
  if (!obj0(s.lot)) s.lot = {};
  if (!obj0(s.lotOff)) s.lotOff = {};
  s.lotPaid = num(s.lotPaid, 0, 1e9); s.lotN = Math.floor(num(s.lotN, 0, 1e9)); s.lotWk = num(s.lotWk, 0, 1e9); s.lotWkN = Math.floor(num(s.lotWkN, 0, 1e9)); if (!Number.isFinite(s.lotH)) s.lotH = -1;
  for (const k of Object.keys(s.lot)) {
    const st = s.lot[k]; if (!obj0(st)) { delete s.lot[k]; continue; }
    st.s = num(st.s, 0, 1); st.h = num(st.h, 0, 1e6); st.miss = Math.floor(num(st.miss, 0, LOT.miss - 1)); st.wk = num(st.wk, 0, 1e9); st.n = Math.floor(num(st.n, 0, 1e9)); st.due = st.s >= LOT.due ? 1 : 0;
    if (typeof st.mk !== "string" || !/^[01]{1,2000}$/.test(st.mk) || !Number.isFinite(st.ms) || !st.due) { delete st.mk; delete st.ms; }
    if (!st.hp || !st.mk) { delete st.hp; delete st.hv; delete st.hx; delete st.hz; }
    else { st.hp = 1; st.hv = num(st.hv, 0, 500); if (!Number.isFinite(st.hx) || !Number.isFinite(st.hz)) { delete st.hx; delete st.hz; } }
  }
  for (const k of Object.keys(s.lotOff)) if (!Number.isFinite(s.lotOff[k])) delete s.lotOff[k];
  fileTidy(s, "lot", LOT);
}
function lotTake(id) {
  const s = S(), c = LT.by[id], H = api.GS.hour; if (!s || !c || s.lot[id]) return false;
  if (!Object.keys(s.blades).length) { api.toast("Nobody hires a plow man without a plow. Fit a blade to a truck first: the garage's Plow tab.", "warn"); return false; }
  if (s.lotOff[id] > H) { const dys = Math.max(1, Math.ceil((s.lotOff[id] - H) / 24)); api.toast(`${capFirst(c.who)} has someone else plowing ${c.name}. Ask again in ${dys} day${dys === 1 ? "" : "s"}.`, "warn"); return false; }
  if (winTalk(s)) { api.toast(WIN.talkLine, "warn"); return false; }
  delete s.lotOff[id];
  const miss = fileTake(s, "lot", id);
  s.lot[id] = { s: 0, h: 0, due: 0, miss, wk: 0, n: 0 };
  api.toast(`${capFirst(c.name)} is yours to keep clear: ${api.fmtCash(Math.round(lotBase(c) * api.payMul()))} every time you plow it out inside ${LOT.fullH} h of the weather easing. Nobody else clears it now.` + (miss ? ` The time it was dug out by hand has not been forgotten: once more and you lose it.` : ""), "good");
  api.save(); conRefresh(); return true;
}
function lotDrop(id) {
  const s = S(), c = LT.by[id]; if (!s || !s.lot || !s.lot[id]) return false;
  const st = s.lot[id], due = obj0(st) && st.s >= LOT.due, r = c && obj0(st) ? fileDrop(s, "lot", id, st, LOT) : 0;   // beta 0257 #1/#2: see fileDrop
  const hp = !!(c && obj0(st) && st.hp), was = hp ? "Your heap still stood in its middle" : "It was snowed in"; if (hp) lotShovel(c);
  wkKeep(s, "lot", st); delete s.lot[id]; LT.marks.delete(id); if (c) lotApply(c, null);
  api.toast(c ? `You've given up ${c.name}. ${capFirst(c.who)} has it cleared again.`
    + (r === 2 ? ` ${was} when you gave it up, the second time it has had to be dug out by hand: it is not offered to you for a week.`
      : r === 1 ? ` ${was} when you gave it up: dug out by hand, and that is remembered if you ask for it back this week.`
        : fileOf(s, "lot", id) ? ` The time it was dug out by hand is remembered for a week.` : "") : "You've given that lot up.", r === 2 ? "bad" : due ? "warn" : undefined);
  api.save(); conRefresh(); return true;
}
function lotGone(list, slept) {                                                  // the owners who had their lots dug out: one line for all of them
  const s = S(), H = api.GS.hour, lost = [];
  for (const c of list) { const st = s.lot[c.id]; if (st.hp) lotShovel(c); st.s = 0; st.h = 0; st.due = 0; st.miss++; lotUnmark(c.id, st); if (st.miss >= LOT.miss) { wkKeep(s, "lot", st); delete s.lot[c.id]; s.lotOff[c.id] = H + LOT.offH; lost.push(c.name); } lotApply(c, s.lot[c.id]); }
  const what = drvList(list.map(c => c.name)), one = list.length === 1;
  api.toast((slept ? `While you were away ${what} ${one ? "was" : "were"} dug out by hand.` : `Nobody came to plow ${what}: ${one ? "it was" : "they were"} dug out by hand.`) + " No pay."
    + (lost.length ? ` ${capFirst(drvList(lost))} ${lost.length === 1 ? "has" : "have"} gone to someone else.` : ` Once more and you lose ${one ? "it" : "them"}.`), lost.length ? "bad" : "warn");
  api.save(); conRefresh();
}
function lotStep() {
  const s = S(); if (!s || !s.lot || !LT.list.length || !api.started()) return;
  const H = api.GS.hour, dh = s.lotH < 0 || H < s.lotH ? 0 : H - s.lotH; s.lotH = H;
  if (!Object.keys(s.lot).length) return;
  const RD = (window.TLXR && TLXR.ROADS) || { fill: 0.16, fillA: 0.5, fillB: 0.95, plowWx: 0.6, skip: 2 }, slept = dh > RD.skip, WX = api.WX, gone = [], PL = api.FOOT.on ? api.FOOT : api.P;
  let fresh = 0;
  for (const c of LT.list) {
    const st = s.lot[c.id]; if (!st) continue;
    if (slept) { if (st.s >= LOT.due) gone.push(c); else { st.s = 0; st.h = 0; st.due = 0; lotUnmark(c.id, st); } }
    else {
      const w = WX.at(c.x, c.z);
      st.s = Math.min(1, st.s + dh * RD.fill * api.sstep(RD.fillA, RD.fillB, w));
      if (st.hp && (!heapOn() || !(st.s <= (Number.isFinite(st.ms) ? st.ms : 0) + BL.rise))) {   // 4.2c2a: held for its heap, and the option went off (paid) or new snow has filled it in again
        if (!heapOn()) { lotDone(c, st); continue; }
        lotUnmark(c.id, st); api.toast(`New snow has filled ${c.name} in again: the heap in its middle is the least of it now.`);
      }
      if (st.s >= LOT.due) { if (!st.due) { st.due = 1; fresh++; } if (w < RD.plowWx) st.h += dh; if (st.h >= LOT.lateH) gone.push(c); }
      if (st.hp && st.h < LOT.lateH && (c.dirty || c.relay || (c.tk = (c.tk || 0) + 1) % 20 === 0) && Math.hypot(PL.x - c.x, PL.z - c.z) < c.r + LOT.hSeen) {   // the blade has been at it (or 10 s have gone by): measure the middle again
        lotApply(c, st);
        if (c.relay) { c.relay = false; if (st.hv > 0) api.world.heapSnow(st.hx, st.hz, Math.max(1.2, Math.sqrt(st.hv / 1.9)), st.hv, LOT.hCap); }   // after a reload: the heap is put back where it lay
        c.dirty = false; const v = lotHeap(c);
        if (v < LOT.heapOk) { lotDone(c, st); continue; }
        const hv = Math.round(v * 100) / 100; if (hv !== st.hv) { st.hv = hv; st.hx = Math.round(c.hx * 10) / 10; st.hz = Math.round(c.hz * 10) / 10; }
      }
    }
    lotApply(c, st);
  }
  if (gone.length) lotGone(gone, slept);
  else if (fresh) { const due = lotDue(); api.toast(`Snow in ${due.length === 1 ? due[0].name : due.length + " of your lots"}. Full pay inside ${LOT.fullH} h of the weather easing.`); conRefresh(); }
}
function lotMark(q, mark) {                                                      // the blade's edge q = [x0, z0, x1, z1]: -> { name, k (share of the squares done) } on a due lot of yours, else null
  const s = S(); if (!s || !s.lot || !LT.list.length) return null;
  const mx = (q[0] + q[2]) / 2, mz = (q[1] + q[3]) / 2;
  for (const c of LT.list) {
    const st = s.lot[c.id]; if (!st || !(st.s >= LOT.due)) continue;
    if (Math.hypot(mx - c.x, mz - c.z) > c.r + 1) continue;
    if (st.hp) { if (mark) c.dirty = true; return { name: c.name, k: 1, heap: st.hv || 0 }; }   // 4.2c2a: cut, held for the heap in its middle (lotStep measures)
    let m = LT.marks.get(c.id);
    if (!m && typeof st.mk === "string" && st.mk.length === c.n && Number.isFinite(st.ms)) {   // a reload in the middle of the lot: the squares cut before it still count
      m = { n: c.n, m: new Uint8Array(c.n), c: 0, s0: st.ms }; for (let i = 0; i < c.n; i++) if (st.mk.charCodeAt(i) === 49) { m.m[i] = 1; m.c++; }
      LT.marks.set(c.id, m);
    }
    if (m && st.s > m.s0 + BL.rise) { lotUnmark(c.id, st); m = null; }            // new snow since: what was cut is filled in
    if (!m) { if (!mark) return { name: c.name, k: 0 }; LT.marks.set(c.id, m = { n: c.n, m: new Uint8Array(c.n), c: 0, s0: st.s }); }
    if (mark) {
      const len = Math.hypot(q[2] - q[0], q[3] - q[1]), span = Math.max(0, len - 2 * LOT.in), k = Math.max(1, Math.ceil(span / LOT.step)); let hit = false;
      for (let e = 0; e <= k; e++) {
        const t = len > 0 ? (LOT.in + span * e / k) / len : 0.5, b = c.idx.get(lotKey(Math.round((q[0] + (q[2] - q[0]) * t - c.x) / LOT.sq), Math.round((q[1] + (q[3] - q[1]) * t - c.z) / LOT.sq)));
        if (b !== undefined && !m.m[b]) { m.m[b] = 1; m.c++; hit = true; }
      }
      if (hit) { st.mk = Array.from(m.m).join(""); st.ms = m.s0; }
      if (m.c >= LOT.credit * m.n) return lotCut(c, st) ? null : { name: c.name, k: 1, heap: st.hv || 0 };
    }
    return { name: c.name, k: m.c / m.n };
  }
  return null;
}
function lotDone(c, st) {
  const s = S(), k = lotK(st.h), h = st.h, cash = Math.round(lotBase(c) * k * api.payMul());
  api.GS.cash += cash; st.wk += cash; st.n++; s.lotPaid += cash; s.lotN++;
  st.s = 0; st.h = 0; st.due = 0; st.miss = Math.max(0, st.miss - 1); lotUnmark(c.id, st); lotApply(c, st);
  api.toast(`${capFirst(c.name)} is clear. ${capFirst(c.who)} pays ${api.fmtCash(cash)}${k < 0.995 ? ` (${Math.round(k * 100)}%: ${Math.round(h)} h after the weather eased)` : ""}.`, "good");
  api.save(); conRefresh();
}
function lotDue() { const s = S(); return s && s.lot ? LT.list.filter(c => { const st = s.lot[c.id]; return st && st.s >= LOT.due; }) : []; }
function lotJob() {
  const due = lotDue(); if (!due.length) return null;
  const s = S(), P = api.FOOT.on ? api.FOOT : api.P, U = api.ui; let near = due[0], bd = Infinity, h = 0, sum = 0;
  for (const c of due) { const st = s.lot[c.id], d = Math.hypot(c.x - P.x, c.z - P.z); if (d < bd) { bd = d; near = c; } if (st.h > h) h = st.h; sum += lotBase(c) * lotK(st.h); }
  const hrs = v => (v >= 1 ? Math.round(v) + " h" : Math.max(1, Math.round(v * 60)) + " min");
  const pay = "~" + api.fmtCash(Math.round(sum * api.payMul())), n = due.length, held = due.filter(c => s.lot[c.id].hp).length, hp = n === 1 && held === 1, title = hp ? `Bank your heap in ${near.name}` : n === 1 ? `Plow out ${near.name}` : `Plow out ${n} lots`;
  const state = h < LOT.fullH ? `full pay for another ${hrs(LOT.fullH - h)}` : `the pay is falling · ${hrs(LOT.lateH - h)} before ${n === 1 ? "it is" : "the first is"} ${hp ? "shifted" : "dug out"} by hand`;
  return { obj: LT.job, kind: "plowlot", auto: !api.FOOT.on && !!bladeOf(curUid()), tgt: { x: near.x, z: near.z, name: near.name }, col: "var(--signal)", title,
    chips: U.chip("LOTS") + (held ? U.chip("HEAP IN THE MIDDLE", "due") : ""), meta: `${hp ? "cut, but " + (s.lot[near.id].hv || 0).toFixed(1) + " m3 of your snow stands in its middle" : n === 1 ? Math.round(near.m2) + " m2 snowed in" : n + " lots snowed in · nearest: " + near.name} · ${near.place} · ${state}`, pay,
    hud: d => ({ title, sub: `${U.fmtMi(d)} to ${near.name} · ${pay} · ${state}` }) };
}
function lotMonday(week) {
  const s = S(); if (!s || !s.lot) return; let [pay, n] = wkTake(s, "lot");
  for (const k of Object.keys(s.lot)) { const st = s.lot[k]; pay += st.wk; n += st.n; st.wk = 0; st.n = 0; }
  if (!n) return;
  const d = week && week.label || "";
  s.conLast.unshift({ d, road: "Lots", pay, m: 0, w: 0, n }); s.conLast = s.conLast.slice(0, 6); api.save(); conRefresh();
  setTimeout(() => { try { api.TABLET.notify({ app: "plow", kind: "good", title: `Lots · week to ${d}`, body: `${n} lot${n === 1 ? "" : "s"} plowed out: ${api.fmtCash(pay)}`, ttl: 8 }); } catch (e) { } }, 2900);
}
function lotCards(U, s, has, mul, cash) {
  if (!LT.list.length) return "";
  const H = api.GS.hour, hrs = v => (v >= 1 ? Math.round(v) + " h" : Math.max(1, Math.round(v * 60)) + " min");
  const talk = winTalk(s);
  let h = U.sec("Lots", `${LT.list.filter(c => s.lot[c.id]).length} of ${LT.list.length} yours · paid so far ${cash(s.lotPaid)}`);
  for (const c of LT.list) {
    const st = s.lot[c.id], off = !st && s.lotOff[c.id] > H, base = lotBase(c) * mul, due = st && st.s >= LOT.due, m = due ? lotMark([c.x, c.z, c.x, c.z], false) : null, rec = !st && !off && fileOf(s, "lot", c.id);
    h += U.tabCard({ tf: "pll:" + c.id, title: capFirst(c.name),
      chips: st ? U.chip("YOURS", "ok") + (due ? (st.hp ? U.chip("HEAP IN THE MIDDLE", "due") : U.chip("SNOWED IN", "due")) : U.chip("CLEAR")) + (st.miss ? U.chip("DUG OUT BY HAND ONCE", "heavy") : "") : off ? U.chip("HAS SOMEONE ELSE", "due") : U.chip("ASKING") + (rec ? U.chip("DUG OUT BY HAND ONCE", "heavy") : ""),
      meta: `${c.place} · ${Math.round(c.m2)} m2 a truck can reach · ${cash(base)} a clearing inside ${LOT.fullH} h`,
      note: st ? (due ? (st.hp ? `Cut, but ${(st.hv || 0).toFixed(1)} m3 of your plow's snow stands in the middle of it: bank it along the edge to be paid. ` + (st.h < LOT.fullH ? `Full pay for another ${hrs(LOT.fullH - st.h)}.` : `The pay is falling, and in ${hrs(Math.max(0, LOT.lateH - st.h))} it is shifted by hand.`)
        : (m && m.k > 0 ? `${Math.round(Math.min(1, m.k / LOT.credit) * 100)}% plowed out. ` : "") + (st.h < LOT.fullH ? `Snowed in: full pay for another ${hrs(LOT.fullH - st.h)}.` : `Snowed in: the pay is falling, and in ${hrs(Math.max(0, LOT.lateH - st.h))} it is dug out by hand.`)) : "Nothing in it to plow.") + ` This week: ${cash(st.wk)} for ${st.n} clearing${st.n === 1 ? "" : "s"}.`
        : off ? "" : `${capFirst(c.who)} has it cleared by hand today. Take it on and it is yours to plow out after every snowfall.` + (rec ? ` It was dug out by hand once when it was yours, and that has not been forgotten: once more and it goes to someone else.` : ""),
      warn: st ? (due ? `DROP it ${st.hp ? "with your heap in its middle and it is shifted" : "snowed in and it is dug out"} by hand: that counts against you like a lot left ${LOT.lateH} hours${st.miss ? ", and it would be the second time" : ""}.` : "") : off ? `It was dug out twice waiting for you. Offered again in ${Math.max(1, Math.ceil((s.lotOff[c.id] - H) / 24))} days.` : !has ? "Fit a blade to a truck first: the garage's Plow tab." : talk ? WIN.talkLine : "",
      pay: st ? `${cash(base)} a clearing` : "", act: (st ? "paq:" : "pat:") + c.id, actLabel: st ? "DROP" : "TAKE ON", blocked: !st && (!has || off || talk) });
  }
  return h + `<p class="tnote2">A lot is plowed by the square metre: blade down, work across it in passes side by side (forward, or back-dragging away from a wall) until four fifths of the ground a truck can reach is cut. Then it is clear and paid at once, in full inside ${LOT.fullH} hours of the weather easing and down to half after ${LOT.lowH}. Leave it ${LOT.lateH} hours, or sleep through it, and it is dug out by hand: no pay, and the second time it goes to someone else for a week.${heapOn() ? ` And mind the heap: a lot is not clear while more than ${LOT.heapOk} m3 of your plow's snow stands in its middle or at a door. Throw towards the edge and bank it there (the outer ${LOT.bank} m); a square blade carries a pile to the edge, and a heap left in the middle holds the pay until it is moved.` : ""}</p>`;
}
/* ---------------- doors: where the blade's snow ends up (4.2b2, the count 4.1b3b promised) ----------------
   The snow a blade moves has to go somewhere, and in a village the wrong place is somebody's way in. Every house's
   FRONT WALK (the door to its street, WIN.hw each side) and the MOUTH of every drive of DRV (its first WIN.mouth m) is a
   zone. heapAt() tells winLay() about every m3 the blade lays (a windrow's rows, a pile spilled ahead, a square blade's
   stack, a back-drag's heap); a zone the blade laid snow in is then MEASURED from the snow cells: the m3 standing over
   what the ground there settles back to (api.world.restCell). WIN.block m3 or more is a blocked door. While you are
   within WIN.away m the riding hint says so and nothing else happens: pull it clear and nobody ever knows. Drive on and
   it is a complaint: a line, a Jobs row, a Map pin, a row in the Plow app, and a clock (stopped in a storm, as the
   drives' is). Clear it (cut or back-drag it away: under WIN.clear m3 measured) and it is forgotten. Left WIN.lateH
   hours, or slept through, the household digs it out: a complaint on the week's count (WIN.talk of them and nobody new
   takes you on before Monday), and with a household that has a drive, a miss if the drive is yours (DRV.miss misses
   lose the customer) or WIN.sulkH hours of not asking you if it is not. No cash anywhere. The mouth of a drive of yours
   that is snowed in is your own work site: nothing is counted there until it is clear.
   Cells are not saved, so a blocked zone saves its m3 and the heap is laid again when you are next within WIN.seen m.
   SAVED in x.sys.plow: win { zoneKey: { v (m3), h (clock) } }, winC (complaints this week), winN (in all), winH, and
   drvSulk { driveKey: 1 } (why a household is not asking: your snow, not a missed drive). Option plowdoors (on). */
const WIN = { block: 0.3, clear: 0.12, eps: 0.03, away: 9, seen: 45, lateH: 3, sulkH: 72, talk: 3, walk: 4.5, hw: 1, mouth: 2.6, cap: 0.8,
  talkLine: "The street is talking about the snow your plow leaves at people's doors. Nobody new takes you on before Monday." };
const WN = { list: [], by: {}, built: false, job: {} };
const winOn = () => TLX.on("plowdoors");
const winTalk = s => winOn() && (s.winC || 0) >= WIN.talk;
const winLabel = z => (z.kind === "w" ? `${z.name}'s front walk` : `the mouth of ${z.name}'s drive`);
const capFirst = t => t.charAt(0).toUpperCase() + t.slice(1);
function winBuild() {
  WN.built = true; WN.list = []; WN.by = {};
  const W = api.world; if (!W.restCell || !Array.isArray(W.doors)) return;
  const cars = window.TLXC && Array.isArray(TLXC.cars) ? TLXC.cars : [], seen = new Set();
  const add = z => { z.cx = z.ax + z.ux * z.L / 2; z.cz = z.az + z.uz * z.L / 2; z.pend = 0; z.over = 0; z.relay = false; WN.list.push(z); WN.by[z.key] = z; };
  for (const D of W.doors) {
    if (!D || !Number.isFinite(D.x + D.z + D.nx + D.nz + D.d + D.rr) || !(D.rr - 3.5 <= 4.6)) continue;   // the store, the church: no household
    const hk = Math.round(D.x) + "_" + Math.round(D.z); if (seen.has(hk)) continue; seen.add(hk);
    const g = Array.isArray(D.grid) ? (D.grid[0] - D.x) * D.nx + (D.grid[1] - D.z) * D.nz : 0, v0 = D.d / 2 + 0.3;
    const L = g > D.d / 2 + 4 ? Math.min(6, g - DRV.street - v0) : WIN.walk; if (!(L >= 2)) continue;
    const c = DV.by[hk] || null, car = cars.find(q => Math.hypot(q.x - D.x, q.z - D.z) < 11 && q.owner), h = Math.abs(Math.round(D.x * 7 + D.z * 13));
    add({ key: hk + ":w", hk, kind: "w", name: c ? c.name : car ? car.owner : DRV.names[h % DRV.names.length], door: D, ax: D.x + D.nx * v0, az: D.z + D.nz * v0, ux: D.nx, uz: D.nz, L, hw: WIN.hw, c });
  }
  for (const c of DV.list) add({ key: c.key + ":m", hk: c.key, kind: "m", name: c.name, ax: c.a[0] - c.ux * 0.3, az: c.a[1] - c.uz * 0.3, ux: c.ux, uz: c.uz, L: WIN.mouth + 0.3, hw: DRV.hw, c });
}
function winLay(x, z, r, p) {                                                    // heapAt: the blade has laid p m3 round (x, z)
  if (!WN.list.length || !winOn()) return;
  for (const q of WN.list) {
    if (Math.abs(x - q.cx) > 7 || Math.abs(z - q.cz) > 7) continue;
    const px = x - q.ax, pz = z - q.az, t = px * q.ux + pz * q.uz, m = r * 0.5;
    if (t >= -m && t <= q.L + m && Math.abs(px * q.uz - pz * q.ux) <= q.hw + m) q.pend += p;
  }
}
function winMeasure(q) {                                                         // the m3 standing in a zone over what its ground settles back to
  const W = api.world, C = W.cell, H = W.half, A = C * C, nx = -q.uz, nz = q.ux; let vol = 0;
  for (let t = 0; t <= q.L + 1e-6; t += C) for (let l = -q.hw; l <= q.hw + 1e-6; l += C) {
    const ix = Math.round((q.ax + q.ux * t + nx * l + H) / C), iz = Math.round((q.az + q.uz * t + nz * l + H) / C), o = W.depthAt(ix, iz) - W.restCell(ix, iz) - WIN.eps;
    if (o > 0) vol += o * A;
  }
  return (q.over = vol);
}
function winShovel(q) { const W = api.world, nx = -q.uz, nz = q.ux; for (let l = -q.hw - 0.15; l <= q.hw + 0.16; l += 0.3) W.bladeSnow(q.ax + nx * l, q.az + nz * l, q.ax + q.ux * q.L + nx * l, q.az + q.uz * q.L + nz * l, 0.15); q.over = 0; q.pend = 0; }
function winGone(list, slept) {                                                  // the households that dug your snow out themselves: one line for all of them
  const s = S(), H = api.GS.hour, lost = [], hit = new Set(), names = [];
  for (const q of list) {
    winShovel(q); delete s.win[q.key]; s.winC++; s.winN++; if (!names.includes(q.name)) names.push(q.name);
    if (hit.has(q.hk) || !q.c) continue; hit.add(q.hk);                           // a walk and a drive mouth of one house: one grudge
    const c = q.c, st = s.drv[c.key];
    if (st) { st.miss++; if (st.miss >= DRV.miss) { wkKeep(s, "drv", st); delete s.drv[c.key]; s.drvOff[c.key] = H + DRV.offH; s.drvSulk[c.key] = 1; DV.marks.delete(c.key); drvApply(c, null); lost.push(c.name); } }
    else { s.drvOff[c.key] = Math.max(s.drvOff[c.key] || 0, H + WIN.sulkH); s.drvSulk[c.key] = 1; }
  }
  api.toast(`${slept ? "While you were away " : ""}${drvList(names)} dug your plow's snow out of the way by hand.`
    + (lost.length ? ` ${drvList(lost)} ${lost.length === 1 ? "has" : "have"} found someone else to plow.` : "")
    + ` ${s.winC === 1 ? "One complaint" : s.winC + " complaints"} against you this week.` + (s.winC >= WIN.talk ? " Word has got round: nobody new takes you on before Monday." : ""), lost.length || s.winC >= WIN.talk ? "bad" : "warn");
  api.save(); conRefresh();
}
function winStep() {
  const s = S(); if (!s || !s.win || !WN.list.length || !api.started()) return;
  const H = api.GS.hour, dh = s.winH < 0 || H < s.winH ? 0 : H - s.winH; s.winH = H;
  if (!winOn()) { if (Object.keys(s.win).length) { s.win = {}; conRefresh(); } for (const q of WN.list) { q.pend = 0; q.over = 0; q.relay = false; } return; }
  const RD = (window.TLXR && TLXR.ROADS) || { plowWx: 0.6, skip: 2 }, slept = dh > RD.skip, WX = api.WX, P = api.FOOT.on ? api.FOOT : api.P, gone = [], fresh = [], clear = [];
  for (const q of WN.list) {
    const e = s.win[q.key]; if (!e && !(q.pend > 0)) continue;
    const st = q.c && s.drv[q.c.key], work = q.kind === "m" && !!st && st.s >= DRV.due;   // the mouth of your own snowed-in drive: your work site
    if (work) { if (e) delete s.win[q.key]; q.pend = 0; q.over = 0; q.relay = false; continue; }
    const dist = Math.hypot(P.x - q.cx, P.z - q.cz);
    if (!e) {                                                                      // laid just now: it is a complaint once you have driven on
      winMeasure(q);
      if (dist > WIN.away) { if (q.over >= WIN.block) { s.win[q.key] = { v: Math.round(q.over * 100) / 100, h: 0 }; fresh.push(q); } else q.over = 0; q.pend = 0; }
      continue;
    }
    if (slept) { gone.push(q); continue; }
    if (dist < WIN.seen) {
      if (q.relay) { q.relay = false; api.world.heapSnow(q.cx, q.cz, 1, e.v, WIN.cap); }   // after a reload: the heap is put back where it lay
      if (winMeasure(q) < WIN.clear) { delete s.win[q.key]; q.pend = 0; q.over = 0; clear.push(q); continue; }
      e.v = Math.round(q.over * 100) / 100;
    }
    if (WX.at(q.cx, q.cz) < RD.plowWx) e.h += dh;
    if (e.h >= WIN.lateH) gone.push(q);
  }
  if (fresh.length) { const one = fresh.length === 1; api.toast(`Your plow's snow lies across ${drvList(fresh.map(winLabel))}. Clear it with the blade (nose in from the street and cut it away to one side) inside ${WIN.lateH} h, or ${one ? fresh[0].name + " digs it out by hand and remembers it" : "they dig it out by hand and remember it"}.`, "warn"); api.save(); conRefresh(); }
  if (clear.length) { api.toast(`${capFirst(drvList(clear.map(winLabel)))} ${clear.length === 1 ? "is" : "are"} clear again.`, "good"); api.save(); conRefresh(); }
  if (gone.length) winGone(gone, slept);
}
function winOpen() { const s = S(); return s && s.win && winOn() ? WN.list.filter(q => s.win[q.key]) : []; }
function winLine() {                                                             // the riding hint: snow of yours on a door close by
  if (!WN.list.length || !winOn()) return ""; const s = S(), P = api.P; let near = null, mine = null;
  for (const q of WN.list) {
    if (Math.abs(P.x - q.cx) > 14 || Math.abs(P.z - q.cz) > 14) continue;
    if (s.win[q.key]) mine = mine || q; else if (q.pend > 0 && q.over >= WIN.block) near = near || q;
  }
  return near ? `your snow lies across ${winLabel(near)}: cut it clear before you drive on` : mine ? `${winLabel(mine)}: your snow is still across it` : "";
}
function winJob() {
  const open = winOpen(); if (!open.length) return null;
  const s = S(), P = api.FOOT.on ? api.FOOT : api.P, U = api.ui; let near = open[0], bd = Infinity, h = 0;
  for (const q of open) { const d = Math.hypot(q.cx - P.x, q.cz - P.z); if (d < bd) { bd = d; near = q; } if (s.win[q.key].h > h) h = s.win[q.key].h; }
  const hrs = v => (v >= 1 ? Math.round(v) + " h" : Math.max(1, Math.round(v * 60)) + " min"), n = open.length;
  const title = n === 1 ? `Clear your snow from ${winLabel(near)}` : `Clear your snow from ${n} doors`, state = `${hrs(Math.max(0, WIN.lateH - h))} before ${n === 1 ? "it is" : "the first is"} dug out by hand`;
  return { obj: WN.job, kind: "plowwin", auto: !api.FOOT.on && !!bladeOf(curUid()), tgt: { x: near.cx, z: near.cz, name: winLabel(near) }, col: "var(--signal)", title,
    chips: U.chip("YOUR SNOW", "due"), meta: `${n === 1 ? "your plow's snow lies across it" : "nearest: " + winLabel(near)} · ${state}`, pay: "no pay",
    hud: d => ({ title, sub: `${U.fmtMi(d)} · ${state}` }) };
}
function winCards(U, s) {
  const open = winOpen(), n = s.winC || 0; if (!open.length && !n) return "";
  const hrs = v => (v >= 1 ? Math.round(v) + " h" : Math.max(1, Math.round(v * 60)) + " min");
  let h = U.sec("Doors", `${open.length} with your snow across ${open.length === 1 ? "it" : "them"} · ${n} complaint${n === 1 ? "" : "s"} this week`);
  if (open.length) h += `<div class="tsml2">${open.map(q => `<div class="tsm2 tprow" data-tf="plw:${q.key}"><b>${U.esc(capFirst(winLabel(q)))}</b><span>${s.win[q.key].v.toFixed(1)} m3 of your plow's snow across it · ${hrs(Math.max(0, WIN.lateH - s.win[q.key].h))} before ${U.esc(q.name)} digs it out by hand</span>${U.chip("BLOCKED", "due")}</div>`).join("")}</div>`;
  return h + `<p class="tnote2">${n >= WIN.talk ? WIN.talkLine : n ? `${n === 1 ? "One household has" : n + " households have"} dug your snow out by hand this week. ${WIN.talk} complaints in a week and nobody new takes you on before Monday.` : "Cut it away with the blade and it is forgotten."}</p>`;
}
function winMonday() { const s = S(); if (s && s.winC) { s.winC = 0; api.save(); conRefresh(); } }
function winInit() {
  if (!WN.built) winBuild();
  const s = S(); if (!s || !s.win) return;
  for (const k of Object.keys(s.win)) if (!WN.by[k]) delete s.win[k];
  for (const q of WN.list) { q.pend = 0; q.over = 0; q.relay = !!s.win[q.key]; }
}
/* ---------------- streets: a heap left standing in a street (4.2c2b, closing 4.2b2's NOT DONE) ----------------
   A town's streets never hold snow of their own, so anything standing in one was put there by a blade: the heap where a
   back-drag out of a drive stops, the pile a lifted blade lets go, a square blade's overflow. The place lists its street
   centre lines (api.world.streets: [ax, az, bx, bz, name]); strBuild cuts each into lengths of about STR.len m, STR.hw
   each side of the line (the travelled lane, inside where a blade throwing right from the right-hand lane, or even from
   the centre line, lays its windrow: the verge beyond it, between the walks, is where snow may go). heapAt()
   tells strLay() every m3 the blade lays, the one length it lands in is then MEASURED from the snow cells the doors' way
   (what stands over api.world.restCell), with the heap's middle of mass. STR.block m3 or more is a heap in the street.
   Within STR.away m of it only the riding hint speaks. Drive on and it is the kommune's complaint: a line, a Jobs row, a
   Map pin, a row in the Plow app, a clock (stopped in a storm). Push it off the street (under STR.clear m3 measured) and
   it is forgotten. Left STR.lateH hours, or slept through, the kommune's own truck clears it: a WARNING on the road
   contract you have held longest (the third takes that road back, as its own warnings do), or with no contract no road
   is tendered to you for STR.banH hours. Several heaps cleared in one go are one warning. No cash anywhere.
   Cells are not saved, so a complaint saves its m3 and where it stood, and the heap is laid again when you are next
   within STR.seen m. Villages' streets (tlx-roads) are not listed yet.
   SAVED in x.sys.plow: str { lengthKey: { v (m3), h (clock), x, z } }, strC (times the truck came this week), strN (heaps
   cleared for you in all), strH, strBan (the game hour a road is tendered to you again). Option plowstreets (on). */
const STR = { len: 12, hw: 1.8, block: 0.5, clear: 0.2, eps: 0.05, away: 9, seen: 45, lateH: 2, banH: 72, cap: 0.8, join: 2, back: 150 };
/* Beta 0263 #1: a heap on the line between two lengths of a street used to be half in each and a heap in neither. A
   length is now MEASURED (and cleared by the kommune) STR.join m into each neighbour on its own street (q.t0 .. q.t1;
   nothing past a street's end, where snow may go), so a heap on the line is whole in both, and strDup() makes it one
   complaint, the first length's. Beta 0263 #2: the option switched off and on again (SN.off) re-measures the lengths
   within STR.back m, so a heap that was standing is somebody's again once you drive on. */
const SN = { list: [], by: {}, built: false, job: {}, off: false };
const strOn = () => TLX.on("plowstreets");
function strBuild() {
  SN.built = true; SN.list = []; SN.by = {};
  const W = api.world; if (!W.restCell || !Array.isArray(W.streets)) return;
  W.streets.forEach((l, i) => {
    if (!Array.isArray(l) || !Number.isFinite(l[0] + l[1] + l[2] + l[3])) return;
    const len = Math.hypot(l[2] - l[0], l[3] - l[1]); if (!(len >= 4)) return;
    const n = Math.max(1, Math.round(len / STR.len)), L = len / n, ux = (l[2] - l[0]) / len, uz = (l[3] - l[1]) / len, name = typeof l[4] === "string" && l[4] ? l[4] : "the street", J = Math.min(STR.join, L / 3);
    let prev = null;
    for (let k = 0; k < n; k++) {
      const q = { key: "s" + i + ":" + k, name, ax: l[0] + ux * L * k, az: l[1] + uz * L * k, ux, uz, L, hw: STR.hw, pend: 0, over: 0, relay: false, t0: k > 0 ? -J : 0, t1: L + (k < n - 1 ? J : 0), nb: [] };
      q.cx = q.hx = q.ax + ux * L / 2; q.cz = q.hz = q.az + uz * L / 2; SN.list.push(q); SN.by[q.key] = q;
      if (prev) { prev.nb.push(q); q.nb.push(prev); } prev = q;
    }
  });
}
function strLay(x, z, r, p) {                                                    // heapAt: the blade has laid p m3 round (x, z): the one street length it stands in
  if (!SN.list.length || !strOn()) return;
  let best = null, bd = 1e9; const m = r * 0.5;
  for (const q of SN.list) {
    if (Math.abs(x - q.cx) > q.L + 2 || Math.abs(z - q.cz) > q.L + 2) continue;
    const px = x - q.ax, pz = z - q.az, t = px * q.ux + pz * q.uz;
    if (t < -m || t > q.L + m || Math.abs(px * q.uz - pz * q.ux) > q.hw + m) continue;
    const d = Math.hypot(x - q.cx, z - q.cz); if (d < bd) { bd = d; best = q; }
  }
  if (best) best.pend += p;
}
function strMeasure(q) {                                                         // the m3 standing in a street length over what its ground settles back to, and its middle of mass
  const W = api.world, C = W.cell, H = W.half, A = C * C, nx = -q.uz, nz = q.ux; let vol = 0, sx = 0, sz = 0;
  for (let t = q.t0; t <= q.t1 + 1e-6; t += C) for (let l = -q.hw; l <= q.hw + 1e-6; l += C) {
    const x = q.ax + q.ux * t + nx * l, z = q.az + q.uz * t + nz * l, ix = Math.round((x + H) / C), iz = Math.round((z + H) / C), o = W.depthAt(ix, iz) - W.restCell(ix, iz) - STR.eps;
    if (o > 0) { vol += o * A; sx += o * x; sz += o * z; }
  }
  if (vol > 1e-6) { q.hx = sx * A / vol; q.hz = sz * A / vol; } else { q.hx = q.cx; q.hz = q.cz; }
  return (q.over = vol);
}
function strShovel(q) { const W = api.world, nx = -q.uz, nz = q.ux; for (let l = -q.hw - 0.15; l <= q.hw + 0.16; l += 0.3) W.bladeSnow(q.ax + q.ux * q.t0 + nx * l, q.az + q.uz * q.t0 + nz * l, q.ax + q.ux * q.t1 + nx * l, q.az + q.uz * q.t1 + nz * l, 0.15); q.over = 0; q.pend = 0; q.hx = q.cx; q.hz = q.cz; }
function strDup(q, s) { return q.nb.some(n => { const e = s.str[n.key]; return !!e && Math.hypot(e.x - q.hx, e.z - q.hz) < STR.join + 1.5; }); }   // the heap on the line is already the neighbour's complaint
function strRelay(q, e) {                                                        // after a reload: the heap is put back where it stood
  const x = Number.isFinite(e.x + e.z) ? e.x : q.cx, z = Number.isFinite(e.x + e.z) ? e.z : q.cz;
  api.world.heapSnow(x, z, Math.max(0.9, Math.min(1.9, Math.sqrt(e.v / 1.6))), e.v, STR.cap);
}
function strGone(list, slept) {                                                  // the kommune's own truck has cleared them: one warning for the lot
  const s = S(), H = api.GS.hour, names = [];
  for (const q of list) { strShovel(q); delete s.str[q.key]; s.strN++; if (!names.includes(q.name)) names.push(q.name); }
  s.strC++;
  const lead = `${slept ? "While you were away the" : "The"} kommune's own truck had to clear your plow's ${list.length === 1 ? "heap" : "heaps"} out of ${drvList(names)}.`;
  const rs = conR(), ids = Object.keys(s.con || {}).filter(id => obj0(s.con[id]) && rs.some(r => r.id === id)).sort((a, b) => (s.con[a].since || 0) - (s.con[b].since || 0));
  if (ids.length) { conStrike(s.con[ids[0]], rs.find(r => r.id === ids[0]), "street", lead); return; }
  s.strBan = Math.max(s.strBan || 0, H + STR.banH);
  api.toast(`${lead} It tenders no road to you for ${Math.round(STR.banH / 24)} days.`, "warn");
  api.save(); conRefresh();
}
function strStep() {
  const s = S(); if (!s || !s.str || !SN.list.length || !api.started()) return;
  const H = api.GS.hour, dh = s.strH < 0 || H < s.strH ? 0 : H - s.strH; s.strH = H;
  if (!strOn()) { if (Object.keys(s.str).length) { s.str = {}; conRefresh(); } for (const q of SN.list) { q.pend = 0; q.over = 0; q.relay = false; } SN.off = true; return; }
  const RD = (window.TLXR && TLXR.ROADS) || { plowWx: 0.6, skip: 2 }, slept = dh > RD.skip, WX = api.WX, P = api.FOOT.on ? api.FOOT : api.P, gone = [], fresh = [], clear = [];
  if (SN.off) { SN.off = false; for (const q of SN.list) if (!s.str[q.key] && !(q.pend > 0) && Math.hypot(P.x - q.cx, P.z - q.cz) < STR.back) { if (strMeasure(q) >= STR.block) q.pend = q.over; else q.over = 0; } }   // switched on again: what stands in a street near you counts again
  for (const q of SN.list) {
    const e = s.str[q.key]; if (!e && !(q.pend > 0)) continue;
    if (!e) {                                                                      // laid just now: it is a complaint once you have driven on
      strMeasure(q);
      if (Math.hypot(P.x - q.hx, P.z - q.hz) > STR.away) { if (q.over >= STR.block && !strDup(q, s)) { s.str[q.key] = { v: Math.round(q.over * 100) / 100, h: 0, x: Math.round(q.hx * 10) / 10, z: Math.round(q.hz * 10) / 10 }; fresh.push(q); } else q.over = 0; q.pend = 0; }
      continue;
    }
    if (slept) { gone.push(q); continue; }
    if (Math.hypot(P.x - e.x, P.z - e.z) < STR.seen) {
      if (q.relay) { q.relay = false; strRelay(q, e); }
      if (strMeasure(q) < STR.clear) { delete s.str[q.key]; q.pend = 0; q.over = 0; clear.push(q); continue; }
      e.v = Math.round(q.over * 100) / 100; e.x = Math.round(q.hx * 10) / 10; e.z = Math.round(q.hz * 10) / 10;
    } else { q.hx = e.x; q.hz = e.z; }
    if (WX.at(q.cx, q.cz) < RD.plowWx) e.h += dh;
    if (e.h >= STR.lateH) gone.push(q);
  }
  if (fresh.length) { const nm = drvList([...new Set(fresh.map(q => q.name))]), one = fresh.length === 1; api.toast(`Your plow's ${one ? "heap stands" : "heaps stand"} in ${nm}. Push ${one ? "it" : "them"} off the street with the blade (onto the verge between the walks, or the end of the street) inside ${STR.lateH} h, or the kommune sends its own truck and holds it against you.`, "warn"); api.save(); conRefresh(); }
  if (clear.length) { api.toast(`${capFirst(drvList([...new Set(clear.map(q => q.name))]))} ${new Set(clear.map(q => q.name)).size === 1 ? "is" : "are"} clear of your snow again.`, "good"); api.save(); conRefresh(); }
  if (gone.length) strGone(gone, slept);
}
function strOpen() { const s = S(); return s && s.str && strOn() ? SN.list.filter(q => s.str[q.key]) : []; }
function strLine() {                                                             // the riding hint: a heap of yours in the street close by
  if (!SN.list.length || !strOn()) return ""; const s = S(), P = api.P; let near = null, mine = null;
  for (const q of SN.list) {
    if (!s.str[q.key] && !(q.pend > 0 && q.over >= STR.block)) continue;
    if (Math.abs(P.x - q.hx) > 14 || Math.abs(P.z - q.hz) > 14) continue;
    if (s.str[q.key]) mine = mine || q; else near = near || q;
  }
  return near ? `your heap stands in ${near.name}: push it off the street before you drive on` : mine ? `${mine.name}: your heap still stands in the street` : "";
}
function strJob() {
  const open = strOpen(); if (!open.length) return null;
  const s = S(), P = api.FOOT.on ? api.FOOT : api.P, U = api.ui; let near = open[0], bd = Infinity, h = 0;
  for (const q of open) { const d = Math.hypot(q.hx - P.x, q.hz - P.z); if (d < bd) { bd = d; near = q; } if (s.str[q.key].h > h) h = s.str[q.key].h; }
  const hrs = v => (v >= 1 ? Math.round(v) + " h" : Math.max(1, Math.round(v * 60)) + " min"), n = open.length;
  const title = n === 1 ? `Push your heap off ${near.name}` : `Push your ${n} heaps off the streets`, state = `${hrs(Math.max(0, STR.lateH - h))} before the kommune's truck comes for ${n === 1 ? "it" : "the first"}`;
  return { obj: SN.job, kind: "plowstr", auto: !api.FOOT.on && !!bladeOf(curUid()), tgt: { x: near.hx, z: near.hz, name: "your heap in " + near.name }, col: "var(--signal)", title,
    chips: U.chip("YOUR HEAP", "due"), meta: `${n === 1 ? "your plow's snow stands in the street" : "nearest: " + near.name} · ${state}`, pay: "no pay",
    hud: d => ({ title, sub: `${U.fmtMi(d)} · ${state}` }) };
}
function strCards(U, s) {
  const open = strOpen(), n = strOn() ? s.strC || 0 : 0, H = api.GS.hour, ban = strOn() && s.strBan > H; if (!open.length && !n && !ban) return "";
  const hrs = v => (v >= 1 ? Math.round(v) + " h" : Math.max(1, Math.round(v * 60)) + " min");
  let h = U.sec("Streets", `${open.length} heap${open.length === 1 ? "" : "s"} of yours standing in a street · the kommune's truck out ${n === 1 ? "once" : n + " times"} this week`);
  if (open.length) h += `<div class="tsml2">${open.map(q => `<div class="tsm2 tprow" data-tf="pls:${q.key}"><b>${U.esc(q.name)}</b><span>${s.str[q.key].v.toFixed(1)} m3 of your plow's snow in the street · ${hrs(Math.max(0, STR.lateH - s.str[q.key].h))} before the kommune's own truck clears it</span>${U.chip("IN THE WAY", "due")}</div>`).join("")}</div>`;
  return h + `<p class="tnote2">${ban ? `The kommune had to clear a heap of yours out of a street: it tenders no road to you for another ${Math.max(1, Math.ceil((s.strBan - H) / 24))} day${Math.ceil((s.strBan - H) / 24) > 1 ? "s" : ""}. ` : ""}${open.length ? "Push a heap off the street with the blade and it is forgotten. Left, the kommune's own truck clears it: a warning on a road contract of yours, or no road tendered to you for three days." : "A street is no place to leave a heap: the verge between the walks, or the end of the street, is."}</p>`;
}
function strMonday() { const s = S(); if (s && s.strC) { s.strC = 0; api.save(); conRefresh(); } }
function strTidy(s) {
  const num = (v, lo, hi) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : lo);
  if (!obj0(s.str)) s.str = {};
  for (const k of Object.keys(s.str)) { const e = s.str[k]; if (!obj0(e) || !(e.v > 0) || (SN.list.length && !SN.by[k])) { delete s.str[k]; continue; } e.v = num(e.v, 0, 20); e.h = num(e.h, 0, 1e6); if (!Number.isFinite(e.x + e.z)) { const q = SN.by[k]; if (q) { e.x = q.cx; e.z = q.cz; } } }
  s.strC = Math.floor(num(s.strC, 0, 1e6)); s.strN = Math.floor(num(s.strN, 0, 1e9)); s.strBan = num(s.strBan, 0, 1e9); if (!Number.isFinite(s.strH)) s.strH = -1;
}
function strInit() {
  if (!SN.built) strBuild();
  const s = S(); if (!s || !s.str) return;
  for (const k of Object.keys(s.str)) if (!SN.by[k]) delete s.str[k];
  for (const q of SN.list) { const e = s.str[q.key]; if (e && !Number.isFinite(e.x + e.z)) { e.x = q.cx; e.z = q.cz; } q.pend = 0; q.over = 0; q.relay = !!e; q.hx = e ? e.x : q.cx; q.hz = e ? e.z : q.cz; }
}
let conT = 0, conSec = 0;

const XL = { kg: 0, pin: 0, drag: 0, brakeN: 0, hold: false, held: false, why: "" }, CJ = { on: false };
function load(uid) { const d = bladeOf(uid); if (!d) return null; const B = rt(uid); XL.kg = XL.pin = d.kg + (d.hop ? hopOf(uid) : 0); XL.drag = B.drag || 0; XL.why = B.why || ""; return XL; }

window.TLXPL = { DRV, WIN, PDR, rtb: uid => RTB.get(String(uid)) || null, pdr: { seen: PDS, see: pdrSee, way: pdrWay, ways: PDA, onWay: pdrOnWay, pos: pdrPos, spot: pdrSpot, pt: pdrPt, pins: pdrPins, lost: PDLOST, near: pdrNear, blocked: pdrBlocked, hail: pdrHail, wave: pdrWave, hailed: pdrHailed, say: pdrSay, hailNear: pdrHailNear, prov: PDHAIL, sx: PDSX, run: pdrRun, where: pdrWhere, of: pdrOf, skill: pdrSkill, places: pdrPlaces, role: PDROLE, kitWhy: id => { const q = S().pdr[id]; return q ? pdrKitWhy(q) : ""; }, fleet: pdrFleet, sweep: pdrSweep, passes: pdrPasses, bogRisk: pdrBogRisk, tow: pdrTow, towCost: id => { const q = S().pdr[id], r = conR().find(v => v.id === id); return q && r ? pdrTowCost(r, q) : 0; }, job: pdrJob, acts: pdrActs, send: pdrSend, aidWhy: pdrAidWhy, aidAble: pdrAidAble, aidPos: pdrAidPos, aidLine: pdrAidLine, aidNear: pdrAidNear, pullK: pdrPullK, aidK: PDAIDK }, fileOf: (kind, key) => fileOf(S(), kind, key), win: { list: () => WN.list, open: winOpen, step: winStep, measure: winMeasure, lay: winLay, job: winJob, line: winLine, label: winLabel, monday: winMonday, talk: () => winTalk(S()) }, str: { STR, list: () => SN.list, open: strOpen, step: strStep, measure: strMeasure, lay: strLay, job: strJob, line: strLine, monday: strMonday, shovel: strShovel }, lot: { LOT, list: () => LT.list, take: lotTake, drop: lotDrop, step: lotStep, mark: lotMark, job: lotJob, due: lotDue, base: lotBase, k: lotK, marks: LT.marks, monday: lotMonday, heap: lotHeap, line: lotLine, shovel: lotShovel }, drv: { list: () => DV.list, take: drvTake, drop: drvDrop, step: drvStep, mark: drvMark, job: drvJob, due: drvDue, base: drvBase, k: drvK, marks: DV.marks, monday: drvMonday }, PLC, con: { routes: conR, sign: conSign, quit: conQuit, quitCost: id => { const s = S(); return conQuitCost(s && s.con && s.con[id]); }, step: conStep, hold: conHold, job: conJob, monday: conMonday, work: conWork, k: conK }, BLADES, BL, GRT, hopOf, fill, gritToggle, gritAt, grip, gritSpot: (x, z) => { const q = gritSpot(x, z); return q ? Object.assign({ k: gritCover(q) }, q) : null; }, THROWS, USED, mkt: MKB, state: S, rt, fit, unfit, mend, mendCost, condOf, leaveOf, bladeOf, throwOf, slew, ends, hint: rideLine, tidy, road: RC, roadSide, hull, snd: () => ({ g: SND.g, f: SND.f, voice: !!SND.v }) };

TLX.option({ id: "plowtrip", name: "Plow blade trips", hint: "With the blade down at over 14 km/h, a rock, a log or a parked car trips the blade: it folds over the thing, the truck is checked and the cutting edge loses a few points. Off = the blade never trips; the truck just stops against whatever it meets.", sys: "plow" });
TLX.option({ id: "plowdoors", name: "Plow snow at doors", hint: "Snow your plow blade leaves lying across a front walk or the mouth of a drive has to be cut away again: left there, the household digs it out by hand and holds it against you (a customer counts it as a drive left snowed in). Off = the blade's snow may lie anywhere and nobody minds.", sys: "plow" });
TLX.option({ id: "plowheaps", name: "Plow heaps in a lot", hint: "A lot you plow is not clear, and not paid, while a heap of your blade's snow stands in its middle or at a door: bank the snow along the edge. Off = a lot is clear and paid as soon as four fifths of it is cut, wherever the snow lies.", sys: "plow" });

TLX.option({ id: "plowstreets", name: "Plow heaps in the street", hint: "A heap of your plow blade's snow left standing in a town street has to be pushed off it again: left there, the kommune's own truck clears it and it is a warning on a road contract of yours (with no contract, no road is tendered to you for three days). Off = the blade's snow may stand in a street and nobody minds.", sys: "plow" });

TLX.register({
  id: "plow", v: 1,
  state0: () => ({ blades: {}, shed: [], shedC: [], m: 0, opened: 0, grit: {}, gritKg: 0, con: {}, conBan: {}, conLast: [], conWk: [], conPaid: 0, conH: -1, conRec: {}, pdr: {}, drv: {}, drvOff: {}, drvH: -1, drvPaid: 0, drvN: 0, drvWk: 0, drvWkN: 0, drvSulk: {}, drvRec: {}, win: {}, winC: 0, winN: 0, winH: -1, str: {}, strC: 0, strN: 0, strH: -1, strBan: 0, lot: {}, lotOff: {}, lotRec: {}, lotH: -1, lotPaid: 0, lotN: 0, lotWk: 0, lotWkN: 0 }),
  migrate: st => st,
  init(a) {
    api = a; T = a.THREE; RTB.clear(); RC.clear();
    if (!window.TLXV) return;
    tidy();
    a.veh.tabs.push({ id: "plow", name: "Plow", render: garageRows });
    TLXV.addLoad(load);
    TLXV.addUse({ use: toggle, label, wants });
    if (TLXV.addHull) TLXV.addHull(hull);
    if (TLXV.addGrip && !GQ.on) { GQ.on = true; TLXV.addGrip(grip); }
    if (TLXV.addMkt && !MKB.on) { MKB.on = true; TLXV.addMkt(MKB); }               // used blades on Bytteboden (4.1b3a)
    TLXV.onModel(model);
    if (a.ridex) a.ridex.push(rideLine);
    // 4.2a: the kommune's road contracts: the council's plow asks before it sets out, the Jobs app's rows, the Plow app
    if (window.TLXR) TLXR.hold = conHold;
    if (TLX.staff && TLX.staff.addRole) { TLX.staff.addRole("plowdriver", PDROLE); TLX.staff.addPlaces(pdrPlaces); }   // 5.4a1: a road you hold is a job for a plow driver
    if (a.jobx && !CJ.on) { CJ.on = true; for (let k = 0; k < 4; k++) a.jobx.push(() => conJob(k)); a.jobx.push(drvJob); for (let k = 0; k < 3; k++) a.jobx.push(() => pdrJob(k)); }
    // 4.2b1: the driveways: where they are (after the parked cars are placed), their snow from the save, a pin on the Map for each one snowed in
    try { if (!DV.built) drvBuild(); else { DV.marks.clear(); const s = S(); for (const c of DV.list) drvApply(c, s.drv && s.drv[c.key]); } } catch (e) { DV.list = []; DV.by = {}; console.warn("tlx-plow: driveways", e); }
    try { winInit(); } catch (e) { WN.list = []; WN.by = {}; console.warn("tlx-plow: doors", e); }   // 4.2b2: the front walks and drive mouths your blade's snow may land on
    if (a.jobx && !CJ.win) { CJ.win = true; a.jobx.push(winJob); }
    try { strInit(); } catch (e) { SN.list = []; SN.by = {}; console.warn("tlx-plow: streets", e); }   // 4.2c2b: the street lengths a heap of yours may be left standing in
    if (a.jobx && !CJ.str) { CJ.str = true; a.jobx.push(strJob); }
    // 4.2c1: the lots: the place's public yards, their snow from the save, a Jobs row, a pin each
    try { if (!LT.built) lotBuild(); else { LT.marks.clear(); const s = S(); for (const c of LT.list) lotApply(c, s.lot && s.lot[c.id]); lotWake(); } } catch (e) { LT.list = []; LT.by = {}; console.warn("tlx-plow: lots", e); }
    if (a.jobx && !CJ.lot) { CJ.lot = true; a.jobx.push(lotJob); }
    if (a.footx && !a.footx.includes(PDHAIL)) a.footx.push(PDHAIL);              // 5.4b2a: hail your driver's truck on foot
    if (a.TABLET.addLayer && !CJ.pdr) { CJ.pdr = true; a.TABLET.addLayer("marks", pdrPins); }   // 5.4b1: a driver who is out
    if (a.TABLET.addLayer && !CJ.pins) { CJ.pins = true; a.TABLET.addLayer("marks", () => drvDue().map(c => ({ x: c.a[0], z: c.a[1], name: c.name.toUpperCase() + "'S DRIVE", glyph: "D" })).concat(lotDue().map(c => ({ x: c.x, z: c.z, name: c.name.toUpperCase() + (S().lot[c.id].hp ? ": YOUR HEAP" : ""), glyph: "L" }))).concat(winOpen().map(q => ({ x: q.cx, z: q.cz, name: "YOUR SNOW: " + q.name.toUpperCase() + "'S " + (q.kind === "w" ? "WALK" : "DRIVE"), glyph: "!" }))).concat(strOpen().map(q => ({ x: q.hx, z: q.hz, name: "HEAP IN THE STREET: " + q.name.toUpperCase(), glyph: "!" })))); }
    a.TABLET.register({ id: "plow", name: "Plow", icon: PICON, order: 8.55, live: 6,
      hidden: () => { const s = S(); return !s || !s.blades || (!Object.keys(s.blades).length && !Object.keys(s.con || {}).length && !Object.keys(s.drv || {}).length && !Object.keys(s.lot || {}).length); },
      badge: () => { const s = S(); return s && ((s.con && Object.keys(s.con).some(id => Object.keys(s.con[id].due || {}).some(k => s.con[id].due[k][1]))) || winOpen().length || strOpen().length) ? "!" : ""; },
      render: appRender });
  },
  monday(week) { conMonday(week); drvMonday(week); lotMonday(week); winMonday(); strMonday(); },
  tick,
  save() { tidy(); }
});
})();
