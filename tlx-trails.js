// Tracklayer: ski trails (goal G7, loop/HOME.md H1). Slice H1a: the trails, the track and the Løyper app.
//
// WHAT THE PLAYER GETS. Seven named ski trails (løyper), the same ones every boot: Lysløypa, a 2.5 km lit loop out of
// Kjøllefjord by the groomer shed; a family loop at Mehamn and one at Ifjord; three turløyper of 5 to 9 km out to a lookout
// or a herder cabin and back, each with a gapahuk (lean-to, bench and fire ring) at the far end; and one fjelløype over the fell
// from Lebesby to Ifjord. Each starts at a trailhead board that names the trail, its length and what state the track is in
// today, and is marked by poles every 50 m in the trail's colour (Lysløypa also has lamp posts every 40 m, not lit yet).
// The Map app draws each trail in its colour and pins its trailhead.
//
// A trail is nobody's until you TAKE IT ON in the Løyper app (the tablet; the Trail Crew app has a card pointing there). That
// needs a groomer or the wing tiller on the hitch and the Trail crew rank, the same as grooming work. A trail you have taken
// on is yours to keep: drag the groomer along it and the track is set. The villagers ski a trail while it is good, and the
// løypelag pays every Monday by skier-kilometre. Nobody skis a trail that is not prepared. The old grooming contracts are
// untouched. With no snow (summer, the melt) the trails are closed and say so.
//
// HOW THE TRACK WORKS. A trail is cut into 50 m segments, each [set 0..1, ice 0..1, sn (cm of new snow since it was set),
// hd (how hard it froze, 0..1), tSet (game hour it was set), wide 0/1]. The groomer drag calls api.groomx (tracklayer.js, one
// loop beside groomStamp) with its position, heading and width: a segment is SET when the drag has covered 80% of it, inside
// the track's width and going along it. It wears by what really happens: new snow (the weather's fall, a few cm softens it,
// about 10 cm buries it, more on open fell where the wind drifts it), a thaw and refreeze (ice, which a skier likes less), a
// sled ridden along it (a truck far more) and, slowly, use. A clear night with a hard frost after it sets a fresh track harder
// and it lasts longer. A plain word per segment and per trail: freshly set / good / worn / snowed under / icy / not prepared.
//
// THE SKIERS (bookkeeping only; no figures yet). Each game hour, for each trail you keep that is open: people from
// TLXN.people who ski and live in a village on it decide whether to go out from their habit (morning, after work, weekend), the
// weather, the daylight and how good the track is. Each outing is a visit (the løypelag counts skier-km) and posts a `ski`
// item to the news bus. Your grooming passes post `groom`; a trail going bad posts `trail`.
//
// THE PAY. Every Monday: skier-km x TR.rate (x1.5 at the weekend), nothing for a day it lay snowed under (the midday word),
// plus TR.bonus for a week with no day under good. A statement line per trail, the last three weeks.
//
// SAVED: x.sys.trails = { h (last game hour stepped), rs (the dice), dd (the day), tr: { id: { taken, seg: [[set, ice, sn, hd, tSet, wide]...],
// thaw, day, noon, wk, tot, last: [statements], out, lw, lp, gp } } }.
(() => {
"use strict";
/* ---------------- tunables ---------------- */
const TR = {
  step: 25,            // m, the router's grid and the spacing of a trail's points
  seg: 50,             // m, a segment of track
  gradeMax: 0.14,      // the steepest a skier's trail may run, sustained over 50 m
  stepMax: 0.16,       // the steepest 25 m step the router will take
  pole: 50, poleOff: 3.4, lamp: 40, lampOff: 3.8,
  cover: 0.8,          // the share of a segment the drag must cover to set it
  lat: 1.0,            // m beyond the drag's half width it may be off the line
  fall: 1.6,           // cm of new snow an hour at full storm (weather 1.0); nothing under weather 0.2
  drift: 1.2,          // extra cm an hour a fully open segment gets in a gale
  settle: 0.99,        // new snow settles a little each hour
  decay: 0.003,        // set lost an hour, calm
  sled: 0.0012, truck: 0.005,   // set lost a metre ridden along it
  use: 0.004,          // set lost by one outing
  rate: 2.8,             // $ per skier-km
  weekend: 1.5, bonus: 0.2,
  hours: 72            // the longest catch-up stepped hour by hour
};
const COL = { fresh: "#5be6a6", good: "#36a672", worn: "#e0b94a", under: "#c9d6e4", icy: "#5ab8e8", none: "#3b4652" };
const WORDS = ["freshly set", "good", "worn", "snowed under", "icy", "not prepared"];
const WCOL = { "freshly set": COL.fresh, good: COL.good, worn: COL.worn, "snowed under": COL.under, icy: COL.icy, "not prepared": COL.none };
const DEFS = [
  { id: "lys", name: "Lysløypa", kind: "loop", from: "kjollefjord", at: "garage", len: 2500, col: "#ffb020", lit: true, tag: "lit loop by the groomer shed" },
  { id: "meh", name: "Mehamn familieløype", kind: "loop", from: "mehamn", len: 1700, col: "#2a9df4", tag: "family loop" },
  { id: "ifj", name: "Ifjord familieløype", kind: "loop", from: "ifjord", len: 1800, col: "#3fbf5f", tag: "family loop" },
  { id: "san", name: "Sandfjorddalen-runden", kind: "tur", from: "kjollefjord", to: "sandfjord", col: "#e5472f", tag: "to the herder cabin and back" },
  { id: "stj", name: "Stjernevarden-runden", kind: "tur", from: "kjollefjord", to: "lookout:v_stjerne", col: "#d9822b", tag: "to the lookout and back" },
  { id: "ska", name: "Skjånes familieløype", kind: "loop", from: "skjanes", len: 1600, col: "#8a6bff", tag: "family loop" },
  { id: "fje", name: "Fjelløypa Mehamn–Skjånes", kind: "fjell", from: "mehamn", to: "skjanes", col: "#18c2b2", tag: "over the fell between two villages" }
];
// The router's own answer for this map, kept so a boot does not pay for it (the search takes seconds): each trail as its first point
// then metre deltas. bakedRoute() checks every one against today's ground (on land, off buildings, grade) and falls back to routing it.
// Regenerate: boot with TLXSK.nobake = true set before init (or delete an entry), then TLXSK.bakeJSON().
// The router's own answer for this map, kept so a boot does not pay for it (the search takes seconds): each trail as its first point
// then metre deltas. bakedRoute() checks every one against today's ground (on land, off buildings, grade) and falls back to routing it.
// Regenerate: set TLXSK.nobake = true before init (or delete an entry), then read TLXSK.bakeJSON().
const BAKED = {
  "lys": [-1021,-644,19,17,17,17,18,18,18,18,17,17,18,18,18,18,16,18,8,24,1,25,0,12,-4,-24,-15,-20,-6,15,0,25,0,25,0,25,0,25,0,25,0,25,0,25,-3,25,-15,20,-7,24,-2,25,-13,21,-18,18,-17,17,-18,18,-18,18,-18,17,-19,16,-24,5,-25,1,-25,0,-25,0,-25,0,-25,0,-25,0,-24,-4,-21,-14,-18,-17,-18,-18,-20,-15,-22,-11,-21,-13,-18,-17,-21,-13,-18,-17,10,-22,18,-18,19,-16,24,-5,25,0,25,0,25,0,25,0,25,0,25,-4,20,-14,18,-18,12,-21,2,-25,7,-23,12,-22,-1,-23,-14,-20,-18,-18,-22,-10,-25,-2,-25,0,-25,0,-25,-1,-13,-19,-1,-25,3,-24,13,-22,18,-18,17,-17,13,-21,-8,-21,-17,-18,9,9,18,17,23,8,25,2,25,0,25,0,25,0,25,-1,-2,-23,25,-1,24,0,14,2],
  "meh": [696,-3048,-18,17,-20,15,-22,11,-25,5,-25,-1,-24,-5,-24,-7,-24,-9,-23,-10,-22,-11,-21,-14,-19,-16,-19,-17,-17,-17,-18,-18,-17,-18,-17,-19,-16,-19,-14,-21,-11,-22,-9,-23,-5,-25,-1,-25,1,-25,5,-24,7,-24,11,-23,13,-21,17,-19,18,-16,21,-14,22,-12,23,-11,23,-8,25,-2,22,10,17,19,14,20,17,18,21,14,23,8,25,3,25,-2,24,-6,23,-8,23,-11,23,-10,24,-7,24,3,19,15,9,23,4,24,2,25,2,25,4,25,4,24,3,25,-1,25,-5,25,-10,22,-14,21,-15,20,-16,19,-17,19,-16,19,-16,20,-17,21],
  "ifj": [-2472,3547,23,-10,24,-4,25,-3,25,-1,25,-1,25,1,25,2,24,6,23,11,20,14,18,17,17,19,15,19,13,22,11,23,8,23,5,25,1,25,0,25,-1,25,-2,25,-5,24,-7,24,-12,22,-16,19,-20,15,-22,11,-24,6,-25,0,-24,-7,-19,-16,-12,-22,-7,-24,-3,-25,-2,-24,-2,-25,-4,-25,-6,-24,-10,-23,-14,-20,-19,-17,-21,-12,-23,-11,-23,-10,-20,-15,-13,-20,0,-25,11,-22,18,-17],
  "san": [-996,-771,-20,-13,-21,-14,-21,-12,-23,-10,-22,-10,-17,-17,-13,-21,-14,-20,-13,-21,-14,-20,-13,-21,-14,-20,-12,-21,-11,-22,-12,-22,-11,-21,-11,-22,-12,-22,-11,-21,-11,-21,11,-22,12,-21,12,-21,12,-22,13,-21,12,-21,12,-21,12,-22,13,-21,12,-21,13,-21,12,-21,13,-21,12,-21,14,-20,16,-19,16,-18,16,-19,16,-18,16,-19,16,-18,16,-19,16,-18,17,-19,16,-18,16,-18,16,-19,17,-18,18,-16,20,-15,20,-13,22,-11,23,-9,23,-8,24,-6,24,-2,25,-1,24,2,24,3,25,4,24,4,24,4,24,4,24,4,24,7,23,7,24,7,23,6,24,7,23,7,24,6,24,7,23,7,24,6,24,6,23,7,24,6,24,6,23,6,24,6,24,6,24,6,23,6,24,6,24,6,24,6,23,6,24,4,24,-2,25,-2,24,0,25,0,24,0,25,-1,24,0,25,0,24,0,25,-1,24,0,25,0,24,0,25,-1,24,0,25,0,24,-1,25,0,24,0,25,0,24,-4,23,-8,23,-7,24,-8,23,-8,23,-8,23,-8,23,-8,23,-8,23,-9,22,-2,20,13,17,18,18,17,17,17,17,18,18,17,17,17,17,18,18,17,17,17,18,17,17,18,17,17,18,17,17,17,23,9,9,-16,1,18,-20,-1,-25,-1,-24,-2,-24,-1,-25,-1,-24,-2,-25,-1,-24,-1,-25,-1,-24,-1,-25,-1,-24,-1,-25,-1,-24,-1,-25,0,-24,-1,-25,-1,-24,-1,-25,0,-24,-2,-22,4,-24,-5,-24,0,-25,0,-24,1,-25,0,-24,0,-25,1,-24,0,-25,0,-24,1,-25,1,-24,0,-25,1,-24,1,-25,1,-24,1,-25,1,-24,1,-24,1,-25,2,-24,1,-25,1,-24,2,-25,1,-24,2,-25,1,-23,6,-21,13,-20,13,-21,13,-21,13,-20,13,-21,13,-21,13,-20,14,-21,13,-21,13,-16,18,-15,19,-16,19,-20,12,-22,11,-22,10,-23,10,-19,15,-18,16,-18,17,-18,16,-18,17,-18,17,-18,16,-18,17,-20,8,-21,-13,-22,-10,-23,-1,-23,9,-23,8,-23,9,-23,8,-23,9,-23,6,-11,21,-11,22,-17,16,-24,4,-25,2,-24,-1,-25,-4,-24,-3,-24,-4,-22,-6,-19,-14,-23,-10,-22,-10,-23,-9,-24,-2,-20,14,-11,21,-9,23,-5,24,-4,22,14,20,13,21,13,21,13,20,21,12,22,11,22,11,21,13,20,14,9,6],
  "stj": [-671,-696,17,-19,17,-19,17,-19,21,-7,24,6,25,6,25,2,6,-23,4,-24,15,-15,25,-4,25,-2,25,1,25,1,26,1,25,0,11,9,6,18,0,25,13,12,12,14,-18,18,-9,23,-1,25,-3,19,-23,7,8,23,17,19,5,13,-15,20,-13,21,-2,16,22,-11,13,3,11,13,25,5,13,4,-8,18,-4,23,21,4,25,3,25,3,26,3,25,3,25,4,25,0,25,-3,11,18,10,23,9,23,7,25,2,15,-15,-7,-17,0,-23,-10,-12,15,-2,25,-14,-3,-22,-12,-7,22,-15,20,-16,20,-21,14,-22,11,-24,8,-25,4,-25,2,-25,2,-26,1,-22,7,-18,16,-12,22,6,24,5,25,2,25,-7,24,-5,25,-6,24,-5,25,-6,25,-5,24,-6,25,-4,25,-15,20,0,24,0,26,1,25,3,25,19,-7,23,-11,20,-15,16,-20,16,-19,18,-18,0,-25,18,19,19,15,25,6,24,6,25,7,23,9,24,9,23,9,24,9,23,10,23,11,23,10,23,10,24,11,23,10,23,10,22,12,25,1,-7,22,18,4,25,6,21,13,23,12,22,12,21,13,12,20,4,25,-5,19,-20,-4,-23,-12,-21,-11,22,12,23,12,24,6,17,-19,-15,-18,-15,-20,-20,-15,-21,-14,-17,-19,-22,-13,-24,-5,-24,-2,8,-21,-20,-3,-25,-3,-22,-12,-23,-11,-23,-11,-23,-11,-22,-11,-23,-10,-23,-11,-23,-10,-24,-10,-23,-10,-23,-10,-25,-5,-25,-4,-25,-3,-19,-14,-18,-18,-11,14,-9,22,-18,18,-16,19,-20,15,-25,5,-24,4,-8,-20,1,-25,4,-25,3,-22,6,-27,6,-25,6,-25,6,-24,6,-25,6,-24,5,-25,6,-25,6,-24,0,-25,-4,-25,-3,-25,10,-20,25,-3,25,-6,24,-5,25,-4,25,-4,25,-6,22,-12,23,-11,20,-14,18,-18,21,-15,-14,-19,20,2,22,12,-7,-25,4,-15,25,0,23,9,22,5,3,-8,-5,-24,-7,-25,-11,-22,-11,-23,-23,0,-25,3,-25,-4,-25,-3,-25,-4,-25,-3,-25,-3,-26,-2,-3,-11,4,-25,1,-12,-25,5,-24,5,-7,-17,7,-19,-23,7,-14,12,4,-24,17,-18,17,-19,-5,-10,-25,-4,3,-24,6,-19,25,-6,0,-24,2,-25,8,-22,4,-19,-24,-9,4,-24,-2,-24,7,-19,-25,3,-26,-1,-25,1,-25,0,-25,0,-26,1,-25,1,-16,11,-24,8,-23,8,-24,10,-23,11,-17,17,-16,20,-16,20,-8,10],
  "ska": [3329,654,18,-18,7,-22,10,-20,19,-15,25,0,25,0,24,-3,18,-18,23,-4,25,0,19,13,18,18,18,18,1,24,0,25,0,25,0,25,0,25,0,25,0,25,-16,18,-9,22,0,25,0,25,0,25,0,25,-9,21,-18,18,-17,17,-18,-6,-18,-18,-17,-17,-3,18,-15,-11,-2,-2,17,18,-1,23,-17,-17,-18,-18,-18,-18,-17,-17,-18,-18,-18,-18,-17,-17,-18,-18,2,2,17,17,18,18,18,18,17,17,18,18,18,18,17,17,17,16,0,-25,0,-25,-1,-25,-18,-18,-6,-22,-11,-20,-18,-18,-18,-18,-17,-17,-11,-21,0,-25,0,-25,0,-25,-7,-22,-18,-18],
  "fje": [704,-3046,18,17,24,7,25,1,25,0,25,0,25,0,25,0,25,0,25,0,25,0,25,2,22,12,18,18,17,17,18,18,18,18,17,17,18,18,18,18,18,17,19,15,25,5,25,0,24,5,20,14,18,18,17,18,15,20,11,22,12,22,7,23,1,25,0,25,0,25,1,24,12,22,10,22,2,25,0,25,1,25,9,23,17,19,16,19,-7,23,6,22,17,18,22,12,24,4,25,1,23,7,18,17,0,24,-14,21,-7,24,0,25,2,24,13,21,18,18,19,15,25,3,24,5,19,15,18,18,18,18,17,17,18,18,18,18,17,17,18,18,18,18,17,17,18,18,18,18,17,18,14,20,4,25,6,23,15,20,18,18,17,17,18,18,18,18,17,17,18,18,18,18,17,18,11,22,3,24,8,23,17,19,17,17,18,18,18,18,15,19,6,24,0,25,0,25,0,25,4,25,14,19,23,8,25,1,25,0,25,0,25,1,21,12,19,18,17,17,17,19,11,22,11,22,17,18,18,18,18,18,17,18,15,19,8,24,15,19,17,18,13,21,8,23,12,21,5,25,1,25,6,23,15,20,17,18,18,18,21,13,24,5,25,0,24,6,20,15,17,17,18,18,15,20,4,24,0,25,0,25,4,25,15,19,18,18,18,18,17,17,18,18,18,18,17,17,19,17,24,7,24,3,21,13,13,22,9,22,12,22,3,24,0,25,0,25,1,25,7,23,18,17,23,10,20,14,18,18,17,17,18,18,18,18,17,17,18,18,17,18,6,23,-11,21,-17,19,-16,19,-4,24,0,25,3,25,15,19,18,18,18,18,17,17,18,18,18,18,19,16,25,2,25,0,25,0,25,0,25,0,25,0,25,0,25,0,24,3,16,18,-6,24,7,21,17,18,18,18,17,18,5,24,0,25,-14,20,-17,18,-18,18,-17,17,-18,18,-18,18,-17,17,-18,18,-18,18,-17,17,-18,18,-17,18,1,15,24,6,-13,20,-4,25,0,21],
};
let api = null, W = null, T = null;
const X = { list: [], diag: {}, ready: false, ms: 0, hold: false, TR, DEFS, WORDS, COL, WCOL, err: "" };
window.TLXSK = X;
const S = () => TLX.state("trails");
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };

TLX.option({ id: "skicomplaints", name: "Ski trail complaints", hint: "Skiers complain when a sled comes past them fast and close, or runs into them. Three complaints on a trail in a week lose that trail's weekly bonus. Off = complaints are still counted and shown, but cost nothing.", sys: "trails" });
TLX.option({ id: "skitrails", name: "Ski trails", hint: "Named ski trails you can take on in the Løyper app: keep the track set with the groomer and the villagers ski it and the løypelag pays you by use every Monday. Off = no trails, no skiers, no pay (the old grooming contracts stay).", sys: "trails" });

/* ---------------- the router ---------------- */
let GN = 0, HALFW = 0, CC = null, HH = null;
const ci = (x) => Math.round((x + HALFW) / TR.step), cx = i => i * TR.step - HALFW;
function bad(x, z) {
  if (W.isSea(x, z) || W.isWater(x, z)) return true;
  for (const L of W.LAKES) if (Math.hypot(L.x - x, L.z - z) < L.r + 25) return true;   // a lake is off limits whether it is frozen or not
  return false;
}
const Inf = Infinity;
// the extra cost a metre of trail pays in this cell (Infinity: not here)
function cellCost(i, j) {
  if (i < 2 || j < 2 || i >= GN - 2 || j >= GN - 2) return Inf;
  const k = j * GN + i, v = CC[k]; if (v === v) return v;
  const x = cx(i), z = cx(j); let c = 0;
  if (bad(x, z) || bad(x + 13, z) || bad(x - 13, z) || bad(x, z + 13) || bad(x, z - 13)) c = Inf;
  else {
    const sl = W.slopeAt(x, z, 8); if (sl > 0.9) c = Inf; else if (sl > 0.3) c += (sl - 0.3) * 10;
    if (c < Inf) for (const o of W.obstaclesNear(x, z, 22)) {
      if (o.fu) continue;
      const d = Math.hypot(o.x - x, o.z - z);
      if (o.tree !== undefined) { if (d < 4.5) c += 0.6; }
      else if (o.log) { if (d < 3) c += 0.4; }
      else if (o.top === undefined || o.top > 0.3) { if (d < (o.r || 0.5) + (o.box ? 9 : 6)) { c = Inf; break; } }
    }
    if (c < Inf && window.TLXR && TLXR.near) { const n = TLXR.near(x, z); if (n && n.d < 10) c += 2.5; }
    if (c < Inf && W.yardAt(x, z) > 0.1) c += 3;
  }
  return (CC[k] = c);
}
const hAt = (i, j) => { const k = j * GN + i, v = HH[k]; if (v === v) return v; return (HH[k] = W.groundAt(cx(i), cx(j))); };
const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
// the cost of turning from heading a to heading b (in steps of 45 degrees: a trail wants long easy curves, not a staircase)
const TURN = NB.map(([ax, az]) => NB.map(([bx, bz]) => { const c = (ax * bx + az * bz) / (Math.hypot(ax, az) * Math.hypot(bx, bz)); return [0, 0.15, 0.5, 1.6, 3][Math.round(Math.acos(Math.max(-1, Math.min(1, c))) / (Math.PI / 4))]; }));
// A* over the cells (a state is a cell and the heading it was entered on): pen is a Map(cell index -> extra cost a metre), gk scales the grade term
function astar(a, b, o = {}) {
  const pad = o.pad || 14, gk = o.gk || 1, pen = o.pen || null, tk = o.tk === undefined ? 1 : o.tk;
  const i0 = Math.max(2, Math.min(a.i, b.i) - pad), i1 = Math.min(GN - 3, Math.max(a.i, b.i) + pad), j0 = Math.max(2, Math.min(a.j, b.j) - pad), j1 = Math.min(GN - 3, Math.max(a.j, b.j) + pad);
  const w = i1 - i0 + 1, n = w * (j1 - j0 + 1), g = new Float32Array(n * 9).fill(Inf), par = new Int32Array(n * 9).fill(-1), done = new Uint8Array(n * 9);
  const hf = [], hi = [];
  const push = (f, k) => { let p = hf.length; hf.push(f); hi.push(k); while (p > 0) { const q = (p - 1) >> 1; if (hf[q] <= f) break; hf[p] = hf[q]; hi[p] = hi[q]; p = q; } hf[p] = f; hi[p] = k; };
  const pop = () => { const k = hi[0], lf = hf.pop(), lk = hi.pop(); if (hf.length) { let p = 0; const m = hf.length; for (;;) { let c = 2 * p + 1; if (c >= m) break; if (c + 1 < m && hf[c + 1] < hf[c]) c++; if (hf[c] >= lf) break; hf[p] = hf[c]; hi[p] = hi[c]; p = c; } hf[p] = lf; hi[p] = lk; } return k; };
  const ka = (a.j - j0) * w + (a.i - i0), kb = (b.j - j0) * w + (b.i - i0);
  g[ka * 9 + 8] = 0; push(Math.hypot(a.i - b.i, a.j - b.j) * TR.step, ka * 9 + 8);
  let goal = -1;
  while (hf.length) {
    const sk = pop(); if (done[sk]) continue; done[sk] = 1;
    const k = (sk / 9) | 0, d0 = sk - k * 9; if (k === kb) { goal = sk; break; }
    const ci0 = i0 + (k % w), cj0 = j0 + Math.floor(k / w), h0 = hAt(ci0, cj0);
    for (let m = 0; m < 8; m++) {
      const di = NB[m][0], dj = NB[m][1], ni = ci0 + di, nj = cj0 + dj; if (ni < i0 || ni > i1 || nj < j0 || nj > j1) continue;
      const nk = (nj - j0) * w + (ni - i0), ns = nk * 9 + m; if (done[ns]) continue;
      const c = cellCost(ni, nj); if (c === Inf) continue;
      if (di && dj && (cellCost(ci0 + di, cj0) === Inf || cellCost(ci0, cj0 + dj) === Inf)) continue;   // no squeezing between two blocked corners
      const d = (di && dj ? 1.4142 : 1) * TR.step, gr = Math.abs(hAt(ni, nj) - h0) / d; if (gr > TR.stepMax) continue;
      const ex = pen ? pen.get(nj * GN + ni) || 0 : 0;
      const ng = g[sk] + d * (1 + c + ex + Math.pow(gr / 0.07, 3) * gk) + (d0 < 8 ? TURN[d0][m] * TR.step * tk : 0);
      if (ng < g[ns]) { g[ns] = ng; par[ns] = sk; push(ng + Math.hypot(ni - b.i, nj - b.j) * TR.step, ns); }
    }
  }
  if (goal < 0) return null;
  const out = []; for (let sk = goal; sk >= 0; sk = par[sk]) { const k = (sk / 9) | 0; out.push({ i: i0 + (k % w), j: j0 + Math.floor(k / w) }); }
  return out.reverse();
}
// the end of a turløype: the nearest cell to the place (within 400 m) that is not on a steep summit or a boulder field
function farCell(t) {
  const i = ci(t.x), j = ci(t.z); let best = null, bd = Inf;
  for (let dj = -16; dj <= 16; dj++) for (let di = -16; di <= 16; di++) {
    const d = Math.hypot(di, dj); if (d > 16 || d >= bd) continue;
    const c = cellCost(i + di, j + dj); if (c > 1.5 || !roomy(i + di, j + dj)) continue;
    if (d > 1.5 && W.slopeAt(cx(i + di), cx(j + dj), 25) > 0.07) continue;
    bd = d; best = { i: i + di, j: j + dj };
  }
  return best || nearestOk(t.x, t.z, 14, 2.2);
}
// a cell with room round it (a pocket between two houses is no place to start)
function roomy(i, j) { let n = 0; for (const [di, dj] of NB) if (cellCost(i + di, j + dj) < Inf) n++; return n >= 7; }
// the nearest cell a trail may use to a place (r cells at most)
function nearestOk(x, z, r = 12, maxC = 4) {
  const i = ci(x), j = ci(z); let best = null, bd = Inf;
  for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
    const d = Math.hypot(di, dj); if (d > r || d >= bd) continue;
    const c = cellCost(i + di, j + dj); if (c <= maxC && roomy(i + di, j + dj)) { bd = d; best = { i: i + di, j: j + dj }; }
  }
  return best;
}
const cum = p => { const c = [0]; for (let i = 1; i < p.length; i++) c.push(c[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1])); return c; };
function chaikin(p, n, closed) {
  for (let it = 0; it < n; it++) {
    const q = closed ? [] : [p[0]], m = closed ? p.length : p.length - 1;
    for (let i = 0; i < m; i++) { const [ax, az] = p[i], [bx, bz] = p[(i + 1) % p.length]; q.push([ax * 0.75 + bx * 0.25, az * 0.75 + bz * 0.25], [ax * 0.25 + bx * 0.75, az * 0.25 + bz * 0.75]); }
    if (!closed) q.push(p[p.length - 1]); p = q;
  }
  return p;
}
function resample(p, step) {
  const out = [p[0].slice()]; let carry = 0;
  for (let i = 1; i < p.length; i++) {
    const [ax, az] = p[i - 1], [bx, bz] = p[i], L = Math.hypot(bx - ax, bz - az); if (L < 1e-6) continue;
    let t = step - carry;
    while (t <= L) { out.push([ax + (bx - ax) * t / L, az + (bz - az) * t / L]); t += step; }
    carry = L - (t - step);
  }
  const e = p[p.length - 1], l = out[out.length - 1]; if (Math.hypot(e[0] - l[0], e[1] - l[1]) > step * 0.4) out.push(e.slice());
  return out;
}
// the steepest grade over any 50 m of the line, by distance along it
function gradeOf(p, win = 50) {
  const c = cum(p); let mx = 0, j = 0;
  for (let i = 1; i < p.length; i++) { while (j < i - 1 && c[i] - c[j + 1] >= win) j++; const d = c[i] - c[j]; if (d >= win * 0.9) mx = Math.max(mx, Math.abs(W.groundAt(p[i][0], p[i][1]) - W.groundAt(p[j][0], p[j][1])) / d); }
  return mx;
}
// a smoothed line must stay on land, off the buildings, and no steeper than the cells were
function lineOk(p, why) {
  for (let k = 0; k < p.length; k++) {
    const [x, z] = p[k];
    if (k && (bad((x + p[k - 1][0]) / 2, (z + p[k - 1][1]) / 2))) { if (why) why.r = `point ${k} (${Math.round(x)}, ${Math.round(z)}): the sea or a lake between it and the last`; return false; }
    if (bad(x, z)) { if (why) why.r = `point ${k} (${Math.round(x)}, ${Math.round(z)}): the sea or a lake`; return false; }
    for (const o of W.obstaclesNear(x, z, 9)) { if (o.tree !== undefined || o.log || o.fu) continue; if (o.top === undefined || o.top > 0.3) if (Math.hypot(o.x - x, o.z - z) < (o.r || 0.5) + (o.box ? 5 : 3)) { if (why) why.r = `point ${k} (${Math.round(x)}, ${Math.round(z)}): ${o.rock ? "a boulder" : o.box ? "a building" : "an obstacle"} at ${Math.round(o.x)}, ${Math.round(o.z)}`; return false; } }
  }
  return true;
}
// a point that lands on a boulder or too near a building is moved out to its edge (the cells keep clear of them, the line between cells may not)
function nudge(p, closed) {
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (let k = 0; k < p.length; k++) {
      const [x, z] = p[k];
      for (const o of W.obstaclesNear(x, z, 9)) {
        if (o.tree !== undefined || o.log || o.fu || o.fld || !(o.top === undefined || o.top > 0.3)) continue;
        const need = (o.r || 0.5) + (o.box ? 6 : 4), dx = x - o.x, dz = z - o.z, d = Math.hypot(dx, dz);
        if (d < need) { const u = d < 1e-3 ? 1 : 0, nx = d < 1e-3 ? 1 : dx / d, nz = d < 1e-3 ? 0 : dz / d; p[k] = [o.x + nx * (need + 0.3 + u), o.z + nz * (need + 0.3)]; moved = true; break; }
      }
    }
    if (closed && p.length > 1) p[p.length - 1] = p[0].slice();
    if (!moved) break;
  }
  return p;
}
// the cell path with its grid zig-zags relaxed out: each point eased toward the middle of its neighbours, a few dozen rounds, as long
// as the line stays on land, off the buildings and no steeper than the cell path was
function smooth(cells, closed) {
  const raw = cells.map(c => [cx(c.i), cx(c.j)]);
  let p = nudge(resample(raw, TR.step), closed); if (p.length < 4) return p;
  const lim = Math.max(TR.gradeMax, gradeOf(p)) + 0.003;
  if (closed) p[p.length - 1] = p[0].slice();
  for (let it = 0, lam = 0.5; it < 60; it++) {
    const n = p.length, q = new Array(n);
    for (let i = 0; i < n; i++) {
      if (!closed && (i === 0 || i === n - 1)) { q[i] = p[i].slice(); continue; }
      const a = p[i === 0 ? n - 2 : i - 1], b = p[i === n - 1 ? 1 : i + 1];
      q[i] = [p[i][0] + lam * ((a[0] + b[0]) / 2 - p[i][0]), p[i][1] + lam * ((a[1] + b[1]) / 2 - p[i][1])];
    }
    if (closed) q[n - 1] = q[0].slice();
    const r = resample(q, TR.step); if (closed) r[r.length - 1] = r[0].slice();
    if (lineOk(r) && gradeOf(r) <= lim) { p = r; continue; }
    if (lam > 0.2) { lam = 0.2; continue; }
    break;
  }
  return nudge(p, closed);
}
// H1b: a long baked line eased into long curves (the two long turløyper contoured cliffs in stair-steps: the cells avoid steep ground
// one square at a time). Every point moves toward the weighted middle of its four neighbours, but a move is kept only if the point
// stays on land and off the buildings and no 50 m stretch through it climbs past the limit (so the line never cuts a cliff corner),
// and no step leaves 7 to 45 m; the result is laid out again at 25 m and rounded to metres (a baked line is checked again on load). The trailhead (and a loop's closing point) never move. This is how BAKED san / stj were made:
// X.dbg.relax(unpack(BAKED.san), true) -> pack(). The turn per step: X.turns(line).
function relax(p, closed, o = {}) {
  const lim = o.lim || TR.gradeMax - 0.015, its = o.its || 200, lam = o.lam || 0.5;
  const q = p.map(a => a.slice()); if (closed) q.pop();
  const n = q.length, H = q.map(a => W.groundAt(a[0], a[1]));
  const ix = i => closed ? (i % n + n) % n : i, has = i => closed || (i >= 0 && i < n);
  const worst = i => {                                                               // the steepest 50 m stretch within 5 steps of point i
    const idx = []; for (let k = -5; k <= 5; k++) if (has(i + k)) idx.push(ix(i + k));
    const c = [0]; for (let k = 1; k < idx.length; k++) c.push(c[k - 1] + Math.hypot(q[idx[k]][0] - q[idx[k - 1]][0], q[idx[k]][1] - q[idx[k - 1]][1]));
    let w = 0; for (let a = 0; a < idx.length; a++) for (let b = a + 1; b < idx.length; b++) { const d = c[b] - c[a]; if (d >= 44 && d <= 80) w = Math.max(w, Math.abs(H[idx[b]] - H[idx[a]]) / d); if (d > 80) break; }
    return w;
  };
  const clear = (x, z, m = 0) => {
    if (bad(x, z)) return false;
    if (m) for (const L of W.LAKES) if (Math.hypot(L.x - x, L.z - z) < L.r + 25 + m * 3) return false;
    for (const ob of W.obstaclesNear(x, z, 9)) { if (ob.tree !== undefined || ob.log || ob.fu || (o.ignore && o.ignore(ob))) continue; if (ob.top === undefined || ob.top > 0.3) if (Math.hypot(ob.x - x, ob.z - z) < (ob.r || 0.5) + (ob.box ? 5 : 3) + m) return false; }   // o.ignore: the boulder field is laid after the trails are checked at boot
    return true;
  };
  for (let it = 0; it < its; it++) {
    let moved = 0;
    for (let i = closed ? 1 : 2; i < (closed ? n : n - 2); i++) {
      const a = q[ix(i - 2)], b = q[ix(i - 1)], c = q[ix(i + 1)], d = q[ix(i + 2)], cur = q[i];
      const nx = cur[0] + lam * ((a[0] + 4 * b[0] + 4 * c[0] + d[0]) / 10 - cur[0]), nz = cur[1] + lam * ((a[1] + 4 * b[1] + 4 * c[1] + d[1]) / 10 - cur[1]);
      if (Math.hypot(nx - cur[0], nz - cur[1]) < 0.02) continue;
      const l1 = Math.hypot(nx - b[0], nz - b[1]), l2 = Math.hypot(nx - c[0], nz - c[1]);
      let why = l1 < 7 || l2 < 7 || l1 > 45 || l2 > 45 ? "len" : !clear(nx, nz, 1.5) || [0.2, 0.4, 0.6, 0.8].some(u => !clear(nx + (b[0] - nx) * u, nz + (b[1] - nz) * u, 1.5) || !clear(nx + (c[0] - nx) * u, nz + (c[1] - nz) * u, 1.5)) ? "clear" : "";
      if (!why) {
        const w0 = worst(i), sx = cur[0], sz = cur[1], sh = H[i]; q[i][0] = nx; q[i][1] = nz; H[i] = W.groundAt(nx, nz);
        if (worst(i) > Math.max(lim, w0)) { q[i][0] = sx; q[i][1] = sz; H[i] = sh; why = "grade"; }
      }
      if (why) { if (o.stats) o.stats[why] = (o.stats[why] || 0) + 1; } else moved++;
    }
    if (o.stats) o.stats.pass = it + 1;
    if (!moved) break;
  }
  // laid out again, whole metres, at the step (24 to 26 m, 0.1 apart) that leaves the steepest 50 m stretch the gentlest: on a cliff the
  // line's height at a point moves a metre with a metre's shift, so one spacing is luckier than another
  const base = q.map(a => a.slice()); if (closed) base.push(base[0].slice());
  let best = null;
  for (let st = 24; st <= 26.001; st += 0.1) {
    let r = resample(base, st); if (closed) r[r.length - 1] = r[0].slice();
    r = nudge(r, closed).map((a, k, l) => [Math.round(closed && k === l.length - 1 ? l[0][0] : a[0]), Math.round(closed && k === l.length - 1 ? l[0][1] : a[1])]);   // (a node that landed beside a boulder is eased out to its edge)
    let cl = true; for (let k = 0; k < r.length && cl; k++) cl = clear(r[k][0], r[k][1]) && (!k || !bad((r[k][0] + r[k - 1][0]) / 2, (r[k][1] + r[k - 1][1]) / 2));
    const g = gradeOf(r) + (cl ? 0 : 1); if (!best || g < best.g) best = { r, g, st, cl };
  }
  if (o.stats) { o.stats.clearOk = best.cl; o.stats.bad = best.r.map((a, k) => [k, a, clear(a[0], a[1])]).filter(a => !a[2]).slice(0, 5).map(a => a[0] + "@" + a[1]); }
  if (o.stats) { o.stats.step = best.st; o.stats.grade = best.g; }
  return best.r;
}
// the turn at each interior point, degrees
X.turns = p => { const o = []; for (let i = 1; i < p.length - 1; i++) { const a1 = Math.atan2(p[i][1] - p[i - 1][1], p[i][0] - p[i - 1][0]), a2 = Math.atan2(p[i + 1][1] - p[i][1], p[i + 1][0] - p[i][0]); o.push(Math.abs(((a2 - a1 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) * 180 / Math.PI); } return o; };
const cellPath = (a, b, o) => astar(a, b, o) || astar(a, b, Object.assign({}, o, { pad: 40 }));
// a loop of about `len` m that starts at `start` (a cell): a ring through the start, tried at a dozen headings and three sizes
function loopRoute(start, len, avoidFrom) {
  const K = 7; let best = null;
  const sx = cx(start.i), sz = cx(start.j);
  for (let ai = 0; ai < 12; ai++) for (const rm of [0.85, 1, 1.18]) {
    const a = ai / 12 * Math.PI * 2, R = len / (2 * Math.PI * 1.1) * rm, ccx = sx + Math.cos(a) * R, ccz = sz + Math.sin(a) * R, a0 = Math.atan2(sz - ccz, sx - ccx);
    const wp = [start]; let ok = true;
    for (let k = 1; k < K; k++) { const t = a0 + k * Math.PI * 2 / K, c = nearestOk(ccx + Math.cos(t) * R, ccz + Math.sin(t) * R, 8, 3); if (!c) { ok = false; break; } wp.push(c); }
    if (!ok) continue; wp.push(start);
    let cells = [], pen = new Map(); ok = true;
    for (let k = 0; k < wp.length - 1 && ok; k++) {
      const leg = cellPath(wp[k], wp[k + 1], { pen, pad: 10 }); if (!leg) { ok = false; break; }
      for (const c of leg) for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const kk = (c.j + dj) * GN + c.i + di; if (!(Math.abs(c.i - start.i) < 4 && Math.abs(c.j - start.j) < 4)) pen.set(kk, 4); }
      cells = cells.concat(k ? leg.slice(1) : leg);
    }
    if (!ok) continue;
    const line = smooth(cells, true), L = cum(line)[line.length - 1], g = gradeOf(line), e = Math.abs(L - len) / len;
    const score = e * 2 + Math.max(0, g - 0.1) * 12 + (g > TR.gradeMax ? 5 : 0);
    if (!best || score < best.score) best = { line, L, g, score };
  }
  return best;
}
// out to a place and back by another way
function turRoute(a, b) {
  let best = null;
  for (const gk of [1, 4, 12, 40]) {
    const out = cellPath(a, b, { gk }); if (!out) continue;
    const pen = new Map(); for (const c of out) for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) { if (Math.abs(c.i - a.i) < 5 && Math.abs(c.j - a.j) < 5) continue; if (Math.abs(c.i - b.i) < 5 && Math.abs(c.j - b.j) < 5) continue; pen.set((c.j + dj) * GN + c.i + di, 2.5); }
    const back = cellPath(b, a, { gk, pen }); if (!back) continue;
    const lo = smooth(out), lb = smooth(back), line = lo.concat(lb.slice(1)); line[line.length - 1] = line[0].slice();
    const r = { line, L: cum(line)[line.length - 1], g: Math.max(gradeOf(lo), gradeOf(lb)), far: lo[lo.length - 1], gk };
    if (r.g <= TR.gradeMax) return r;
    if (!best || r.g < best.g) best = r;
  }
  return best;
}
function lineRoute(a, b) {
  for (const gk of [1, 3, 8]) { const c = cellPath(a, b, { gk, pad: 40 }); if (!c) continue; const line = smooth(c), g = gradeOf(line); if (g <= TR.gradeMax || gk === 8) return { line, L: cum(line)[line.length - 1], g, gk }; }
  return null;
}
function placeOfId(id) {
  if (id.startsWith("lookout:")) { const l = (W.LOOKOUTS || []).find(q => q.id === id.slice(8)); return l ? { x: l.x, z: l.z, name: l.name } : null; }
  const v = TLXN.village(id); if (v) return v;
  const s = W.SITES.find(q => q.id === id); return s ? { x: s.x, z: s.z, name: s.name } : null;
}
// where a trail may start: cells with room round them, nearest the village first, out to a couple of kilometres (the quay town's
// shelf is walled in by cliffs, so a trail from there starts where a car can take you: at the foot of the fell)
function trailheads(def, toward) {
  const cen = def.at === "garage" ? (W.SITES.find(s => s.id === "garage") || W.depot) : placeOfId(def.from); if (!cen) return [];
  const dir = toward ? Math.atan2(toward.z - cen.z, toward.x - cen.x) : null, out = [], seen = new Set();
  for (const r of [110, 220, 350, 500, 700, 950, 1250, 1600, 2000]) {
    const ring = [];
    for (let k = 0; k < 16; k++) {
      const a = k / 16 * Math.PI * 2 + r * 0.01, c = nearestOk(cen.x + Math.cos(a) * r, cen.z + Math.sin(a) * r, 4, 2.2); if (!c) continue;
      const key = c.j * GN + c.i; if (seen.has(key)) continue; seen.add(key);
      ring.push({ c, off: dir === null ? 0 : Math.abs(Math.atan2(Math.sin(a - dir), Math.cos(a - dir))) });
    }
    if (dir !== null) ring.sort((p, q) => p.off - q.off);
    for (const e of ring) out.push(e.c);
  }
  return out;
}

/* ---------------- building the network ---------------- */
// the router's answer for one trail, or null
function routeDef(def, vil) {
  let r = null, tgt = null;
  if (def.to) { tgt = placeOfId(def.to); if (!tgt) return null; }
  const heads = trailheads(def, tgt); if (!heads.length) return null;
  if (def.kind === "loop") {
    let tried = 0;
    for (const h of heads) { const q = loopRoute(h, def.len); if (!q) continue; if (!r || q.score < r.score) r = q; if (r.score < 0.3 || ++tried >= 6) break; }
  } else if (def.kind === "tur") {
    const far = farCell(tgt); if (!far) return null;
    for (const h of heads) { const q = turRoute(h, far); if (q && q.L > 4800 && q.L < 9600 && q.g <= TR.gradeMax) { r = q; break; } if (q && (!r || q.g < r.g) && q.L > 4800 && q.L < 9600) r = q; }
  } else {
    const ends = trailheads({ from: def.to }, vil); if (!ends.length) return null;
    outer: for (const h of heads.slice(0, 40)) for (const e of ends.slice(0, 30)) { const q = lineRoute(h, e); if (q && q.g <= TR.gradeMax) { r = q; break outer; } if (q && (!r || q.g < r.g)) r = q; }
  }
  return r;
}
// a route kept in the file (BAKED: the router's own answer for this map, as metre deltas) must still be sound on today's ground
const unpack = a => { const p = [[a[0], a[1]]]; for (let i = 2; i < a.length; i += 2) p.push([p[p.length - 1][0] + a[i], p[p.length - 1][1] + a[i + 1]]); return p; };
const pack = p => { const o = [Math.round(p[0][0]), Math.round(p[0][1])]; let x = o[0], z = o[1]; for (let i = 1; i < p.length; i++) { const nx = Math.round(p[i][0]), nz = Math.round(p[i][1]); o.push(nx - x, nz - z); x = nx; z = nz; } return o; };
function bakedRoute(def) {
  const a = BAKED[def.id]; if (!Array.isArray(a) || a.length < 8) return null;
  const line = unpack(a), c = cum(line), g = gradeOf(line);
  X.bakeWhy = X.bakeWhy || {};
  const w = {}; if (!lineOk(line, w)) { X.bakeWhy[def.id] = w.r; return null; }
  if (g > TR.gradeMax + 0.003) { X.bakeWhy[def.id] = "grade " + g.toFixed(3); return null; }
  if (def.kind !== "fjell" && Math.hypot(line[0][0] - line[line.length - 1][0], line[0][1] - line[line.length - 1][1]) > 0.5) { X.bakeWhy[def.id] = "does not close"; return null; }
  return { line, L: c[c.length - 1], g, gk: -1 };
}
X.bakeJSON = () => JSON.stringify(Object.fromEntries(X.list.map(t => [t.id, pack(t.pts)])));
function buildTrails() {
  const size = W.size; GN = Math.ceil(size / TR.step) + 1; HALFW = W.half; CC = new Float32Array(GN * GN).fill(NaN); HH = new Float32Array(GN * GN).fill(NaN);
  X.list = []; X.diag = {};
  for (const def of DEFS) {
    const t0 = performance.now();
    try {
      const vil = TLXN.village(def.from); if (!vil) continue;
      let r = X.nobake ? null : bakedRoute(def), how = "baked";
      if (!r) { r = routeDef(def, vil); how = "routed"; }
      X.diag[def.id] = how + " " + Math.round(performance.now() - t0) + " ms" + (how === "routed" && X.bakeWhy && X.bakeWhy[def.id] ? " (baked line refused: " + X.bakeWhy[def.id] + ")" : "");
      if (!r) { console.warn("tlx-trails: no route for " + def.id); X.diag[def.id] += " NO ROUTE"; continue; }
      const pts = r.line, c = cum(pts), len = c[c.length - 1], nseg = Math.max(1, Math.ceil(len / TR.seg));
      let farI = 0, fd = 0; for (let i = 0; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]); if (d > fd) { fd = d; farI = i; } }
      const t = Object.assign({}, def, { vil, pts, cum: c, len, nseg, grade: r.g, closed: def.kind !== "fjell", far: def.kind === "tur" ? pts[farI] : null, farI, how, villages: [def.from].concat(def.kind === "fjell" ? [def.to] : []), idx: X.list.length });
      t.bb = [Math.min(...pts.map(q => q[0])), Math.min(...pts.map(q => q[1])), Math.max(...pts.map(q => q[0])), Math.max(...pts.map(q => q[1]))];
      t.mid = []; for (let i = 0; i < nseg; i++) t.mid.push(at(t, Math.min(len, i * TR.seg + Math.min(TR.seg, len - i * TR.seg) / 2)));
      X.list.push(t);
    } catch (e) { console.error("tlx-trails: " + def.id, e); }
  }
  hashBuild();
}
// the point and heading at s metres along a trail
function at(t, s) {
  s = clamp(s, 0, t.len); let i = 1; const c = t.cum; while (i < c.length - 1 && c[i] < s) i++;
  const a = t.pts[i - 1], b = t.pts[i], L = c[i] - c[i - 1] || 1, u = (s - c[i - 1]) / L;
  return { x: a[0] + (b[0] - a[0]) * u, z: a[1] + (b[1] - a[1]) * u, tx: (b[0] - a[0]) / L, tz: (b[1] - a[1]) / L };
}
X.at = at;
// a spatial hash of the trail points for "which trail is this on"
const HC = 40; let HASH = new Map();
function hashBuild() {
  HASH = new Map();
  for (const t of X.list) for (let i = 0; i < t.pts.length; i++) { const k = Math.floor(t.pts[i][0] / HC) * 100003 + Math.floor(t.pts[i][1] / HC); let a = HASH.get(k); if (!a) HASH.set(k, a = []); a.push([t.idx, i]); }
}
// the nearest trail line within r of (x, z): { trail, d, s (m along), seg, tx, tz, i } or null
X.nearest = (x, z, r = 12) => {
  if (!X.ready) return null;
  const cx0 = Math.floor((x - r - TR.step) / HC), cx1 = Math.floor((x + r + TR.step) / HC), cz0 = Math.floor((z - r - TR.step) / HC), cz1 = Math.floor((z + r + TR.step) / HC);
  let best = null;
  for (let a = cx0; a <= cx1; a++) for (let b = cz0; b <= cz1; b++) {
    const L = HASH.get(a * 100003 + b); if (!L) continue;
    for (const [ti, i] of L) {
      const t = X.list[ti];
      for (let k = Math.max(0, i - 1); k <= Math.min(t.pts.length - 2, i); k++) {
        const p = t.pts[k], q = t.pts[k + 1], dx = q[0] - p[0], dz = q[1] - p[1], L2 = dx * dx + dz * dz || 1, u = clamp(((x - p[0]) * dx + (z - p[1]) * dz) / L2, 0, 1);
        const d = Math.hypot(x - p[0] - dx * u, z - p[1] - dz * u);
        if (d <= r && (!best || d < best.d)) { const Ls = Math.sqrt(L2), s = t.cum[k] + u * Ls; best = { trail: t, d, s, seg: Math.min(t.nseg - 1, Math.floor(s / TR.seg)), tx: dx / Ls, tz: dz / Ls, i: k }; }
      }
    }
  }
  return best;
};

X.dbg = { relax, pack, bakedRoute, unpack, lineOk, BAKED, astar, cellPath, cellCost, nearestOk, smooth, gradeOf, loopRoute, turRoute, lineRoute, trailheads, cum, ci, cx, build: () => buildTrails() };
/* ---------------- the track: state, words, wear ---------------- */
const rnd = () => { const s = S(); let t = (s.rs = (s.rs + 0x6D2B79F5) >>> 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const segNew = () => [0, 0, 0, 0, -1e6, 0];
const trNew = t => ({ taken: 0, seg: Array.from({ length: t.nseg }, segNew), thaw: 0, day: { v: 0, km: 0, kw: 0 }, noon: "", wk: { v: 0, km: 0, kw: 0, days: 0, low: 0, under: 0 }, tot: { v: 0, km: 0, pay: 0 }, last: [], out: [], lw: "", lp: -99, gp: { n: 0, t: -99 }, cm: { wk: 0, tot: 0 } });
const num = (v, d) => (Number.isFinite(+v) ? +v : d);
// the saved state of each trail made to fit today's trails
function adopt(t, o) {
  const b = trNew(t); if (!o || typeof o !== "object") return b;
  b.taken = o.taken ? 1 : 0;
  if (Array.isArray(o.seg)) b.seg = b.seg.map((g, i) => { const a = o.seg[i]; return Array.isArray(a) ? [clamp(num(a[0], 0), 0, 1), clamp(num(a[1], 0), 0, 1), clamp(num(a[2], 0), 0, 60), clamp(num(a[3], 0), 0, 1), num(a[4], -1e6), a[5] ? 1 : 0] : g; });
  b.thaw = clamp(num(o.thaw, 0), 0, 99);
  for (const k of ["day", "wk", "tot"]) if (o[k] && typeof o[k] === "object") for (const f in b[k]) b[k][f] = num(o[k][f], b[k][f]);
  b.noon = typeof o.noon === "string" ? o.noon : ""; b.lw = typeof o.lw === "string" ? o.lw : ""; b.lp = num(o.lp, -99);
  if (Array.isArray(o.last)) b.last = o.last.filter(q => q && typeof q === "object").slice(0, 3).map(q => ({ d: String(q.d || ""), pay: Math.round(num(q.pay, 0)), km: num(q.km, 0), v: Math.round(num(q.v, 0)), bonus: !!q.bonus, cm: Math.round(num(q.cm, 0)), nob: !!q.nob, under: Math.round(num(q.under, 0)), days: Math.round(num(q.days, 0)), back: !!q.back }));
  if (Array.isArray(o.out)) b.out = o.out.filter(q => q && typeof q.p === "string" && Number.isFinite(q.t1)).slice(0, 24).map(q => ({ p: q.p, t0: num(q.t0, 0), t1: q.t1, km: num(q.km, 0), pc: num(q.pc, 0), f: typeof q.f === "string" ? q.f : "", wd: typeof q.wd === "string" ? q.wd : "", rs: num(q.rs, 0), g: typeof q.g === "string" ? q.g : q.p, k: num(q.k, 0) | 0, dl: num(q.dl, 0) }));
  if (o.cm && typeof o.cm === "object") b.cm = { wk: Math.round(clamp(num(o.cm.wk, 0), 0, 99)), tot: Math.round(clamp(num(o.cm.tot, 0), 0, 9999)) };
  if (o.gp && typeof o.gp === "object") b.gp = { n: Math.round(num(o.gp.n, 0)), t: num(o.gp.t, -99) };
  return b;
}
const sq = g => g[0] * (1 - sstep(1, 9, g[2] * (1 - 0.35 * g[3]))) * (1 - 0.35 * g[1]);   // how good the track is, 0..1
function segWord(g, H) {
  const snE = g[2] * (1 - 0.35 * g[3]);
  if (g[0] < 0.03) return "not prepared";
  if (snE >= 5.5) return "snowed under";
  if (g[1] >= 0.45) return "icy";
  const q = sq(g);
  if (q >= 0.85 && H - g[4] <= 14) return "freshly set";
  if (q >= 0.6) return "good";
  if (q >= 0.2) return "worn";
  return "not prepared";
}
X.segWord = (t, i) => segWord(t.st.seg[i], api.GS.hour);
const goodish = w => w === "good" || w === "freshly set";
// how a trail stands now: { q (mean 0..1), word, n: {word: metres}, bad (segments under good), badM, fresh }
function stat(t, H = api.GS.hour) {
  const key = t.ver + ":" + Math.floor(H) + ":" + t.st.taken + ":" + (isOpen() ? 1 : 0);
  if (t._stat && t._stat.key === key) return t._stat;
  const n = {}; let qs = 0, bad = 0, badM = 0;
  for (const w of WORDS) n[w] = 0;
  t.st.seg.forEach((g, i) => {
    const len = Math.min(TR.seg, t.len - i * TR.seg), w = segWord(g, H); n[w] += len; qs += sq(g) * len;
    if (!goodish(w)) { bad++; badM += len; }
  });
  const q = qs / t.len, sh = k => n[k] / t.len;
  const word = !t.st.taken ? "not prepared" : sh("snowed under") >= 0.4 ? "snowed under" : sh("icy") >= 0.4 ? "icy" : q >= 0.85 && sh("freshly set") >= 0.5 ? "freshly set" : q >= 0.6 ? "good" : q >= 0.2 ? "worn" : "not prepared";
  return (t._stat = { key, q, word, n, bad, badM, sh });
}
X.stat = stat;
const touch = t => { t.ver++; t.dirty = true; };
// the trails are open while there is snow to ski on
function isOpen() {
  if (!TLX.on("skitrails")) return false;
  const c = api.CAL.season(); return c.id !== "summer" && !(api.MELT && api.MELT.k > 0.3);
}
X.isOpen = isOpen;
const airAt = (H, w) => api.WX.temp(api.CAL.now(H).m) + 3 * w;
// each segment's openness to the wind, once: few trees round it and up on the fell
function exposure(t) {
  t.expo = t.mid.map(m => { let trees = 0; for (const o of W.obstaclesNear(m.x, m.z, 60)) if (o.tree !== undefined && !o.down) trees++; return (1 - clamp(trees / 8, 0, 1)) * (0.35 + 0.65 * sstep(30, 140, W.groundAt(m.x, m.z))); });
}
// one game hour on one trail you keep: new snow, drift, thaw and refreeze, frost, the slow wear
function wearHour(t, H) {
  const st = t.st, cn = api.CAL.now(H), night = cn.h >= 21 || cn.h < 7;
  const m0 = t.mid[0], w0 = api.WX.at(m0.x, m0.z, H), air0 = airAt(H, w0);
  let refreeze = 0;
  if (air0 > -1.5) st.thaw = Math.min(99, st.thaw + 1);
  else if (st.thaw > 0 && air0 < -3) { refreeze = Math.min(0.7, 0.12 * st.thaw); st.thaw = 0; }
  for (let i = 0; i < t.nseg; i++) {
    const g = st.seg[i], m = t.mid[i], w = api.WX.at(m.x, m.z, H), air = airAt(H, w), fell = w > 0.2 && air < 0.5;
    g[2] *= TR.settle;
    if (g[0] > 0) g[0] = Math.max(0, g[0] - TR.decay * (1 - 0.5 * g[3]));
    if (fell) { g[2] += TR.fall * clamp((w - 0.2) / 0.8, 0, 1); if (w > 0.4) g[2] += TR.drift * t.expo[i] * (w - 0.4) / 0.6; }
    else if (w > 0.2 && air >= 0.5) g[0] = Math.max(0, g[0] - 0.05);                    // rain on the track
    if (air > -1.5) g[3] *= 0.7;                                                        // a thaw takes the frost out of it
    if (refreeze && g[0] > 0.03) g[1] = Math.min(1, g[1] + refreeze);                   // and the refreeze glazes it
    if (g[2] > 5) g[1] *= 0.6;                                                          // new snow lies over the ice
    if (night && air - 3 * (1 - w) < -5 && g[0] > 0.4 && g[2] < 3) g[3] = Math.min(1, g[3] + 0.5);   // a clear hard frost sets it harder
  }
  touch(t);
}

/* ---------------- grooming: the drag along a trail ---------------- */
const COV = new Map(); let hinted = {};
function groomHook(x, z, yaw, w) {
  if (!X.ready || !isOpen() || !S()) return;
  const q = X.nearest(x, z, w / 2 + 3); if (!q) return;
  const t = q.trail, st = t.st, H = api.GS.hour;
  if (!st.taken) {
    if (q.d <= w / 2 + TR.lat && H - (hinted[t.id] || -99) > 6) { hinted[t.id] = H; api.toast(`That is ${t.name}. Take it on in the Løyper app (${api.btn("tablet")}) and the pass counts.`, "info"); }
    return;
  }
  if (q.d > w / 2 + TR.lat) return;
  if (Math.abs(Math.sin(yaw) * q.tx + Math.cos(yaw) * q.tz) < 0.5) return;            // along it, not across it
  const key = t.idx * 1000 + q.seg; let c = COV.get(key);
  if (!c || H - c.t > 2) { c = { m: 0, t: H }; COV.set(key, c); }
  const s0 = q.seg * TR.seg, len = Math.min(TR.seg, t.len - s0), bins = Math.max(1, Math.round(len / 5)), b = Math.min(bins - 1, Math.floor((q.s - s0) / 5));
  c.m |= 1 << b; c.t = H;
  let n = 0; for (let i = 0; i < bins; i++) if ((c.m >> i) & 1) n++;
  if (n >= Math.ceil(bins * TR.cover)) { setSeg(t, q.seg, w); COV.delete(key); }
}
function setSeg(t, i, w) {
  const g = t.st.seg[i], H = api.GS.hour;
  g[0] = 1; g[1] *= 0.35; g[2] = 0; g[3] = 0.15; g[4] = H; g[5] = w > 4.5 ? 1 : 0;
  t.st.gp.n++; t.st.gp.t = H; touch(t);
}
X.setSeg = setSeg;
// a pass that has stopped for half an hour is posted (once) and told to the player
function groomPosts(H) {
  for (const t of X.list) {
    const gp = t.st.gp; if (gp.n <= 0 || H - gp.t < 0.5) continue;
    const km = Math.round(gp.n * TR.seg / 100) / 10;
    TLXN.post({ kind: "groom", who: "you", x: t.mid[0].x, z: t.mid[0].z, place: t.name, text: TLXN.say(null, "groom", { trail: t.name, km, when: "just now" }), data: { trail: t.id, km, segs: gp.n } });
    api.toast(`${t.name}: ${km} km set. ${stat(t).word}.`, "good"); gp.n = 0;
  }
}

/* ---------------- who goes out ---------------- */
const TRAIT = {};
function trait(p) {
  return TRAIT[p.id] || (TRAIT[p.id] = { cold: -24 + 12 * hash(p.id + "c"), wind: 0.35 + 0.25 * hash(p.id + "w"), tol: 0.3 + 0.3 * hash(p.id + "q"), habit: Math.floor(hash(p.id + "h") * 3), pace: clamp(11 - Math.abs(p.age - 30) * 0.07, 5.5, 11), fav: Math.floor(hash(p.id + "f") * 7) });
}
const skiers = () => (TLXN.people || []).filter(p => p.interests.includes("ski"));
// the sun's height (degrees) at game hour H, from the calendar's declination: skis go out while it is light enough to see the track (the sun
// no lower than -9 degrees: polar night still has a blue noon), and the lamps that would change that are a later slice
const sunAt = H => { const c = api.CAL.now(H), la = W.lat, d = api.CAL.dec(H), ha = (c.h - 12) * Math.PI / 12; return Math.asin(clamp(Math.sin(la) * Math.sin(d) + Math.cos(la) * Math.cos(d) * Math.cos(ha), -1, 1)) * 180 / Math.PI; };
const LIGHTS = new Map(), OUT = 0.15;      // how keen a skier is in an hour of their habit, scaled to the number of houses
function lightHours(H) {
  const D = api.CAL.dayIndex(H); let a = LIGHTS.get(D);
  if (!a) { a = []; const H0 = H - api.CAL.now(H).h; for (let h = 0; h < 24; h++) if (sunAt(H0 + h) >= -9) a.push(h); if (LIGHTS.size > 40) LIGHTS.clear(); LIGHTS.set(D, a); }
  return a;
}
function outingsHour(H) {
  const cn = api.CAL.now(H), h = cn.h, we = cn.dow === 0 || cn.dow === 6, win = lightHours(H);
  const open = X.list.filter(t => t.st.taken);
  if (!open.length) return;
  for (const t of open) t.st.out = t.st.out.filter(o => o.t1 > H);
  if (!win.includes(h)) return;                                                          // nobody skis in the dark
  const morning = win.slice(0, 3), evening = win.slice(-3), wend = win.filter(q => q >= 9 && q <= 16);
  const busy = new Set(); for (const t of open) for (const o of t.st.out) busy.add(o.p);
  for (const p of skiers()) {
    if (busy.has(p.id) || open.some(t => t.st.out.some(o => o.p === p.id && o.t1 > H))) continue;
    const tr = trait(p), opts = open.filter(t => t.villages.includes(p.vid));
    if (!opts.length) continue;
    let base = 0.012 * OUT;
    if (tr.habit === 0 && morning.includes(h)) base = 0.11 * OUT;
    if (tr.habit === 1) { if (!we && evening.includes(h)) base = 0.12 * OUT; if (we && wend.includes(h)) base = 0.1 * OUT; }
    if (tr.habit === 2 && we && wend.includes(h)) base = 0.16 * OUT;
    if (we && wend.includes(h)) base = Math.max(base, 0.07 * OUT);
    const m = opts[0].mid[0], w = api.WX.at(m.x, m.z, H), air = airAt(H, w);
    if (w > tr.wind || air < tr.cold) continue;
    const wts = []; let tot = 0, bestQ = 0;
    for (const t of opts) {
      const s = stat(t, H), q = s.q; if (q < tr.tol || s.word === "snowed under") { wts.push(0); continue; }
      const ice = s.sh("icy") > 0.4 ? 0.5 : 1;
      const wt = (t.kind === "loop" ? 1 : t.kind === "tur" ? (we ? 0.9 : 0.3) : 0.12) * (t.idx % 7 === tr.fav ? 2 : 1) * q * q * ice;
      wts.push(wt); tot += wt; bestQ = Math.max(bestQ, q);
    }
    if (tot <= 0) continue;
    const qf = clamp((bestQ - tr.tol) / (0.95 - tr.tol), 0, 1);
    if (rnd() >= base * (0.3 + 0.7 * qf)) continue;
    let r = rnd() * tot, ti = 0; for (let i = 0; i < opts.length; i++) { r -= wts[i]; if (r <= 0) { ti = i; break; } }
    goOut(opts[ti], p, tr, H, we, air);
  }
}
function goOut(t, p, tr, H, we, air) {
  let km = t.kind === "loop" ? t.len * (rnd() < 0.3 ? 2 : 1) : t.kind === "tur" ? t.len : t.len * (0.35 + 0.5 * rnd());
  km = Math.min(km, tr.pace * 3500);
  const st = t.st, s = stat(t, H);
  const party = [p];                                                                     // a family goes out together now and then
  const busy = new Set(); for (const q of X.list) for (const o of q.st.out) if (o.t1 > H) busy.add(o.p);
  for (const q of TLXN.family(p)) if (q.id !== p.id && q.age > 4 && q.age < 80 && (q.interests.includes("ski") || q.age < 16) && !busy.has(q.id) && rnd() < 0.4) party.push(q);
  // H1b: a group goes at the slowest one's pace and the shortest one's distance, so the figures seen are one party on one journey
  const pcOf = q => trait(q).pace * (q.age < 16 ? 0.8 : 1) / 3.6 * SKI.fast, pc = Math.min(...party.map(pcOf));
  km = Math.min(km, ...party.map(q => trait(q).pace * 3500));
  const k = Math.round(km / 100) / 10;
  let f = "", wd = ""; for (let i = 0; i < t.nseg; i++) { const g = st.seg[i], q = segWord(g, H) === "not prepared" ? 0 : sq(g); f += Math.round(9 * clamp(q, 0, 1)); wd += g[5] && q > 0.55 ? "1" : "0"; }
  const rs = t.kind === "tur" ? Math.round(38 + 24 * rnd()) : 0;
  const first = st.out.length;
  party.forEach((q, i) => {
    st.out.push({ p: q.id, t0: H, t1: H + 1, km: k, pc: Math.round(pc * 100) / 100, f, wd, rs, g: p.id, k: i, dl: 0 });
    st.day.v++; st.day.km += k; st.day.kw += k * (we ? TR.weekend : 1); st.tot.v++; st.tot.km += k;
  });
  const t1 = H + planOf(t, st.out[first]).T / HOURS(); for (let i = first; i < st.out.length; i++) st.out[i].t1 = t1;
  const frac = Math.min(1, k * 1000 / t.len); for (let i = 0; i < t.nseg; i++) if ((i + 0.5) * TR.seg <= frac * t.len + TR.seg) st.seg[i][0] = Math.max(0, st.seg[i][0] - TR.use * (st.seg[i][0] > 0 ? 1 : 0));
  const m = t.mid[Math.floor(rnd() * t.nseg)];
  TLXN.post({ kind: "ski", who: p, x: m.x, z: m.z, place: t.name, text: TLXN.say(p, "ski", { km: k.toFixed(1), trail: t.name, word: s.word, cold: air < -10 ? "properly cold" : air < -4 ? "cold" : "mild", n: S().seq }) + (party.length > 1 ? ` With ${party.slice(1).map(q => q.first).join(" and ")}.` : ""), data: { trail: t.id, km: k, word: s.word, with: party.slice(1).map(q => q.id) } });
  touch(t);
}
X.goOut = goOut; X.outingsHour = outingsHour; X.sunAt = sunAt; X.lightHours = lightHours;

/* ---------------- the clock ---------------- */
function finishDay(t) {
  const st = t.st; if (!st.taken) return;
  if (isOpen() || st.day.km > 0) {
    const dead = st.noon === "snowed under";
    st.wk.v += st.day.v; st.wk.km += st.day.km; if (!dead) st.wk.kw += st.day.kw;
    st.wk.days++; if (!goodish(st.noon)) st.wk.low = 1; if (dead) st.wk.under++;
  }
  st.day = { v: 0, km: 0, kw: 0 }; st.noon = "";
}
function trailPosts(t, H) {
  const st = t.st, w = stat(t, H).word;
  if (w !== st.lw) {
    const was = st.lw; st.lw = w;
    if (was && !goodish(w) && H - st.lp > 6) {
      st.lp = H; const s = stat(t, H);
      TLXN.post({ kind: "trail", who: null, x: t.mid[0].x, z: t.mid[0].z, place: t.name, text: TLXN.say(null, "trail", { trail: t.name, word: w }), data: { trail: t.id, word: w, badKm: Math.round(s.badM / 100) / 10 } });
    }
  }
}
function hourStep(H) {
  const s = S(), D = api.CAL.dayIndex(H);
  if (s.dd !== D) { if (s.dd >= 0) for (const t of X.list) finishDay(t); s.dd = D; }
  const open = isOpen();
  for (const t of X.list) {
    if (!t.st.taken) continue;
    if (open) wearHour(t, H);
    if (api.CAL.now(H).h === 12) t.st.noon = open ? stat(t, H).word : "not prepared";
    trailPosts(t, H);
  }
  if (open) outingsHour(H);
  groomPosts(H);
}
// the hours since the last tick, one at a time (a long sleep: only the last stretch of it)
function catchUp() {
  const s = S(), H = Math.floor(api.GS.hour);
  if (s.h < 0 || !Number.isFinite(s.h)) { s.h = H; return; }
  if (H - s.h > TR.hours) s.h = H - TR.hours;
  while (s.h < H) { s.h++; hourStep(s.h); }
  if (s.h > H) s.h = H;                                                                // the clock went back (a test)
}
X.catchUp = catchUp;
X.step = n => { for (let i = 0; i < n; i++) { const s = S(); s.h = Math.floor(s.h) + 1; hourStep(s.h); } };   // for scenarios: n more hours stepped, whatever the clock says

/* ---------------- a sled along the track ---------------- */
let wearT = 0;
function ridden(dt) {
  if (!api.started() || api.FOOT.on) return;
  const P = api.P, sp = Math.hypot(P.vx || 0, P.vz || 0); if (sp < 2.5) return;
  const tw = api.tow; if (tw && (tw.kind === "groomer" || tw.kind === "tiller") && tw.spd > 0.4) return;   // the drag is setting it, not wearing it
  const q = X.nearest(P.x, P.z, 4.5); if (!q || !q.trail.st.taken) return;
  const g = q.trail.st.seg[q.seg], k = api.veh && api.veh.cur ? TR.truck : TR.sled;
  g[0] = Math.max(0, g[0] - sp * dt * k * (1 - 0.4 * g[3])); touch(q.trail);
}

/* ---------------- taking a trail on, handing it back, the Monday pay ---------------- */
const hitchOk = () => { const h = api.GS.own.parts.hitch; return h === "groomer" || h === "tiller"; };
function why(t) {
  if (!TLX.on("skitrails")) return "Ski trails are switched off in Settings > Options.";
  if (!isOpen()) return "Closed: there is no snow to ski on. The løypelag takes the trails on again with the first snow.";
  if (api.GS.delivered < api.crewAt) return `Needs the Trail crew rank: ${api.crewAt} deliveries, you have ${api.GS.delivered}.`;
  if (!hitchOk()) return "Needs a groomer or the wing tiller on the hitch: the garage's Hitch tab.";
  return "";
}
X.why = why;
function take(id) {
  const t = X.list.find(q => q.id === id); if (!t || t.st.taken) return false;
  const w = why(t); if (w) { api.toast(w, "warn"); return false; }
  const st = t.st; st.taken = 1; st.wk = { v: 0, km: 0, kw: 0, days: 0, low: 0, under: 0 }; st.day = { v: 0, km: 0, kw: 0 }; st.noon = ""; st.lw = ""; st.out = [];
  touch(t); api.toast(`${t.name} is yours to keep. Drag the groomer along it and the track is set; the villagers ski it while it is good.`, "good");
  repaint(); boards(); api.save(); api.TABLET.refresh("loyper"); return true;
}
// what a taken trail has earned so far this week (whole days counted, and the day in hand)
function weekPay(t, withBonus) {
  const st = t.st, dead = st.noon === "snowed under", kw = st.wk.kw + (dead ? 0 : st.day.kw), base = kw * TR.rate * api.payMul();
  const days = st.wk.days + 1, calm = !(TLX.on("skicomplaints") && st.cm && st.cm.wk >= 3), bonus = withBonus && calm && st.wk.days >= 6 && !st.wk.low && st.wk.under === 0 && goodish(st.noon || stat(t).word) ? base * TR.bonus : 0;
  return { base, bonus, kw, days, calm };
}
function giveBack(id) {
  const t = X.list.find(q => q.id === id); if (!t || !t.st.taken) return false;
  catchUp(); const st = t.st, p = weekPay(t, false), pay = Math.round(p.base);
  if (pay > 0) { api.GS.cash += pay; st.tot.pay += pay; }
  st.last.unshift({ d: "handed back " + api.CAL.now().label, pay, km: Math.round((st.wk.km + st.day.km) * 10) / 10, v: st.wk.v + st.day.v, bonus: false, cm: 0, nob: false, under: st.wk.under, days: st.wk.days, back: true }); st.last = st.last.slice(0, 3);
  st.taken = 0; st.seg = st.seg.map(segNew); st.wk = { v: 0, km: 0, kw: 0, days: 0, low: 0, under: 0 }; st.day = { v: 0, km: 0, kw: 0 }; st.out = []; st.cm.wk = 0; st.lw = ""; st.gp = { n: 0, t: -99 }; st.noon = "";
  touch(t); api.toast(`${t.name} is handed back to the løypelag${pay ? `: the week so far, ${api.fmtCash(pay)}, is paid` : ""}.`, "good");
  repaint(); boards(); api.save(); api.TABLET.refresh("loyper"); return true;
}
function monday(week) {
  if (!X.ready || !S()) return;
  catchUp(); const d = String(week && week.label || ""); let total = 0, km = 0, n = 0;
  for (const t of X.list) {
    const st = t.st; if (!st.taken) continue;
    if (st.wk.days === 0 && st.wk.kw === 0 && st.day.kw === 0) continue;
    const p = weekPay(t, true), pay = Math.round(p.base + p.bonus);
    api.GS.cash += pay; st.tot.pay += pay; total += pay; km += st.wk.km; n++;
    st.last.unshift({ d, pay, km: Math.round(st.wk.km * 10) / 10, v: st.wk.v, bonus: p.bonus > 0, cm: st.cm ? st.cm.wk : 0, nob: !p.calm, under: st.wk.under, days: st.wk.days, back: false }); st.last = st.last.slice(0, 3);
    st.wk = { v: 0, km: 0, kw: 0, days: 0, low: 0, under: 0 }; if (st.cm) st.cm.wk = 0;
  }
  if (n) { api.save(); api.TABLET.refresh("loyper"); setTimeout(() => { try { api.TABLET.notify({ app: "loyper", kind: "good", title: `Løypelaget · week to ${d}`, body: `Ski trails: ${api.fmtCash(total)} for ${km.toFixed(0)} skier-km`, ttl: 8 }); } catch (e) { } }, 1500); }
  return total;
}
X.take = take; X.giveBack = giveBack; X.weekPay = weekPay; X.hitchOk = hitchOk;

/* ---------------- Jobs: a row for a trail you keep that needs work ---------------- */
function trailJob(k) {
  if (!X.ready || !isOpen()) return null;
  const t = X.list.filter(q => q.st.taken)[k]; if (!t) return null;
  const s = stat(t); if (!s.bad) return null;
  const P = api.FOOT.on ? api.FOOT : api.P; let bi = -1, bd = Infinity;
  t.st.seg.forEach((g, i) => { if (goodish(segWord(g, api.GS.hour))) return; const m = t.mid[i], d = Math.hypot(m.x - P.x, m.z - P.z); if (d < bd) { bd = d; bi = i; } });
  if (bi < 0) return null;
  const m = t.mid[bi], U = api.ui, km = (s.badM / 1000).toFixed(1), title = `${t.name}: ${s.word}, ${km} km to set`;
  return { obj: t.st, kind: "trail", tgt: { x: m.x, z: m.z, name: t.name }, col: "var(--signal)", title, chips: U.chip("SKI TRAIL") + (!hitchOk() ? U.chip("NO GROOMER HITCHED", "due") : ""), meta: `${s.bad} of ${t.nseg} segments under good · ${(t.len / 1000).toFixed(1)} km ${t.kind === "loop" ? "loop" : t.kind === "tur" ? "turløype" : "fjelløype"}`, pay: "",
    hud: d => ({ title: `${t.name}: ${s.word}`, sub: `${U.fmtMi(d)} to the nearest bad stretch · ${km} km to set${hitchOk() ? "" : " · no groomer hitched!"}` }) };
}

/* ---------------- the Map ---------------- */
function paintMap(g, k, half) {
  if (!X.ready) return;
  g.save(); g.lineCap = g.lineJoin = "round";
  const open = isOpen();
  for (const t of X.list) {
    const path = () => { g.beginPath(); t.pts.forEach(([x, z], i) => { const px = (x + half) * k, pz = (z + half) * k; if (i) g.lineTo(px, pz); else g.moveTo(px, pz); }); g.stroke(); };
    g.setLineDash([]); g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 2.6; path();
    g.strokeStyle = t.col; g.lineWidth = 1.5; g.setLineDash(t.st.taken && open ? [] : [4, 3]); path();
  }
  g.restore();
}
function repaint() { try { if (window.TLXR && TLXR.repaint && TLXR.ready) TLXR.repaint(); } catch (e) { } }
const legend = () => {
  if (!X.ready || !X.list.length) return "";
  const n = X.list.filter(t => t.st.taken).length, sw = (c, d) => `<i class="trl" style="border-top:3px ${d ? "dashed" : "solid"} ${c}"></i>`;
  return `<span>Ski trails</span><em>${sw("#ffb020")}yours${n ? ` <b>${n}</b>` : ""}</em><em>${sw("#9fb0bf", 1)}${isOpen() ? "to take on" : "closed"}</em>`;
};

/* ---------------- furniture: boards, poles, lamps, gapahuks ---------------- */
const FU = { poles: [], lamps: [], boards: [], gaps: [], meshes: [], n: { poles: 0, lamps: 0, boards: 0, gaps: 0, solid: 0, trees: 0 } };
X.FU = FU;
function mergeGeo(parts) {
  const pos = [], nor = [], col = [];
  for (const { g, m, c } of parts) {
    const q = (g.index ? g.toNonIndexed() : g.clone()); q.applyMatrix4(m);
    const P = q.attributes.position.array, N = q.attributes.normal.array; for (let i = 0; i < P.length; i++) { pos.push(P[i]); nor.push(N[i]); }
    for (let i = 0; i < P.length / 3; i++) col.push(c.r, c.g, c.b);
  }
  const o = new T.BufferGeometry();
  o.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); o.setAttribute("normal", new T.Float32BufferAttribute(nor, 3)); o.setAttribute("color", new T.Float32BufferAttribute(col, 3));
  return o;
}
const M4 = (x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new T.Matrix4(), q = new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)); return m.compose(new T.Vector3(x, y, z), q, new T.Vector3(1, 1, 1)); };
const C = h => new T.Color(h);
const lam = () => new T.MeshLambertMaterial({ vertexColors: true });
// everything that stands in the snow: its feet are on the snow surface, whatever its depth today
const snowY = (x, z) => W.surf(x, z);
function furnY() {
  const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), sc = new T.Vector3(1, 1, 1);
  for (const L of [FU.poles, FU.lamps]) for (const g of L) {
    g.list.forEach(([x, z, yaw, lx, lz], i) => { e.set(lx, yaw, lz); q.setFromEuler(e); p.set(x, snowY(x, z) - 0.12, z); m.compose(p, q, sc); g.mesh.setMatrixAt(i, m); });
    g.mesh.instanceMatrix.needsUpdate = true;
  }
  for (const g of FU.gaps) { e.set(0, g.yaw, 0); q.setFromEuler(e); p.set(g.x, snowY(g.x, g.z) - 0.1, g.z); m.compose(p, q, sc); g.mesh.setMatrixAt(g.i, m); g.mesh.instanceMatrix.needsUpdate = true; }
  for (const b of FU.boards) { b.frame.setMatrixAt(b.i, (() => { e.set(0, b.yaw, 0); q.setFromEuler(e); p.set(b.x, snowY(b.x, b.z) - 0.1, b.z); return m.compose(p, q, sc); })()); b.frame.instanceMatrix.needsUpdate = true; b.face.position.set(b.x + Math.sin(b.yaw) * 0.07, snowY(b.x, b.z) + 1.65, b.z + Math.cos(b.yaw) * 0.07); }
  FU.melt = api.MELT ? api.MELT.k : 0; FU.h = Math.floor(api.GS.hour);
}
function instanced(geo, list, name) {
  const mesh = new T.InstancedMesh(geo, lam(), Math.max(1, list.length)); mesh.count = list.length; mesh.frustumCulled = false; mesh.name = name; api.scene.add(mesh); FU.meshes.push(mesh); return mesh;
}
const solid = (x, z, r) => { W.addOb({ x, z, r, top: 1e9, fu: 1 }); FU.n.solid++; };   // fu: trail furniture (the router and the smoothing ignore it)
const free = (x, z, r) => { if (bad(x, z)) return false; for (const o of W.obstaclesNear(x, z, r + 3)) { if (o.tree !== undefined || o.log) continue; if (Math.hypot(o.x - x, o.z - z) < (o.r || 0.5) + r) return false; } return true; };
function buildFurniture() {
  const dark = C(0x2c3239), wood = C(0x8a6a42), woodD = C(0x5c4630), white = C(0xf0eee0), steel = C(0x8d99a6), stone = C(0x777b80), ash = C(0x1b1b1d);
  // trees on the line come out
  for (const t of X.list) for (const [x, z] of t.pts) for (const o of W.obstaclesNear(x, z, 16)) { if (o.tree === undefined || o.down) continue; const q = X.nearest(o.x, o.z, 3.2); if (q && q.trail === t && W.clearTree(o)) FU.n.trees++; }
  for (const t of X.list) {
    const col = C(t.col), pl = [], lp = [];
    for (let s = TR.pole / 2; s < t.len - 8; s += TR.pole) {
      const a = at(t, s), x = a.x + a.tz * TR.poleOff, z = a.z - a.tx * TR.poleOff;
      if (!free(x, z, 1.2) || Math.hypot(x - t.pts[0][0], z - t.pts[0][1]) < 9) continue;
      if (window.TLXR && TLXR.near && TLXR.near(x, z).d < 6) continue;
      pl.push([x, z, hash(t.id + s) * 6.28, (hash(t.id + s + "a") - 0.5) * 0.08, (hash(t.id + s + "b") - 0.5) * 0.08]); solid(x, z, 0.12);
    }
    if (pl.length) {
      const geo = mergeGeo([{ g: new T.CylinderGeometry(0.035, 0.042, 2.3, 6), m: M4(0, 1.15, 0), c: col }, { g: new T.CylinderGeometry(0.047, 0.047, 0.22, 6), m: M4(0, 1.78, 0), c: white }, { g: new T.SphereGeometry(0.045, 6, 4), m: M4(0, 2.32, 0), c: white }]);
      FU.poles.push({ trail: t.id, list: pl, mesh: instanced(geo, pl, "ski poles " + t.id) }); FU.n.poles += pl.length;
    }
    if (t.lit) {
      for (let s = 20; s < t.len - 10; s += TR.lamp) {
        const a = at(t, s), x = a.x - a.tz * TR.lampOff, z = a.z + a.tx * TR.lampOff;
        if (!free(x, z, 0.6) || Math.hypot(x - t.pts[0][0], z - t.pts[0][1]) < 7) continue;
        if (window.TLXR && TLXR.near && TLXR.near(x, z).d < 6) continue;
        lp.push([x, z, Math.atan2(a.tx, a.tz) + Math.PI / 2, 0, 0]); solid(x, z, 0.25);
      }
      if (lp.length) {
        const geo = mergeGeo([{ g: new T.CylinderGeometry(0.06, 0.085, 4.6, 7), m: M4(0, 2.3, 0), c: dark }, { g: new T.BoxGeometry(0.9, 0.07, 0.07), m: M4(0.4, 4.55, 0, 0, 0, 0.05), c: dark }, { g: new T.BoxGeometry(0.42, 0.1, 0.22), m: M4(0.82, 4.5, 0), c: C(0xcfd6dc) }]);
        FU.lamps.push({ trail: t.id, list: lp, mesh: instanced(geo, lp, "ski lamps " + t.id) }); FU.n.lamps += lp.length;
      }
    }
  }
  // boards: one frame mesh for all of them, a face of its own each (the canvas reads the trail's real state)
  const fg = mergeGeo([{ g: new T.BoxGeometry(0.13, 2.4, 0.13), m: M4(-1.0, 1.2, 0), c: woodD }, { g: new T.BoxGeometry(0.13, 2.4, 0.13), m: M4(1.0, 1.2, 0), c: woodD },
    { g: new T.BoxGeometry(2.05, 1.62, 0.07), m: M4(0, 1.65, -0.01), c: wood }, { g: new T.BoxGeometry(2.4, 0.09, 0.62), m: M4(0, 2.6, 0.12, 0.18, 0, 0), c: woodD }]);
  const frame = new T.InstancedMesh(fg, lam(), Math.max(1, X.list.length)); frame.count = 0; frame.frustumCulled = false; frame.name = "ski boards"; api.scene.add(frame); FU.meshes.push(frame);
  for (const t of X.list) {
    const a = at(t, 4), nx = a.tz, nz = -a.tx; let bx = 0, bz = 0, ok = false;
    outer: for (const sd of [1, -1]) for (const off of [5.5, 7.5, 10]) { const x = a.x + nx * off * sd, z = a.z + nz * off * sd; if (free(x, z, 2.2)) { bx = x; bz = z; ok = true; break outer; } }
    if (!ok) { bx = a.x + nx * 6; bz = a.z + nz * 6; }
    const yaw = Math.atan2(-a.tx, -a.tz);                                                // facing back the way people arrive
    const cv = document.createElement("canvas"); cv.width = 512; cv.height = 400; const tex = new T.CanvasTexture(cv); tex.anisotropy = 4;
    const face = new T.Mesh(new T.PlaneGeometry(1.9, 1.48), new T.MeshLambertMaterial({ map: tex })); face.rotation.y = yaw; face.name = "ski board face " + t.id; api.scene.add(face); FU.meshes.push(face);
    const b = { t, x: bx, z: bz, yaw, cv, tex, face, frame, i: FU.boards.length, key: "" }; FU.boards.push(b); frame.count = FU.boards.length;
    const cx0 = Math.cos(yaw), sx0 = Math.sin(yaw);
    for (const u of [-0.9, 0, 0.9]) solid(bx + cx0 * u, bz - sx0 * u, 0.4);
    FU.n.boards++;
  }
  // gapahuks: the lean-to at the far end of each turløype
  const gg = mergeGeo([{ g: new T.BoxGeometry(3.2, 1.9, 0.14), m: M4(0, 0.95, -1.1), c: wood }, { g: new T.BoxGeometry(0.14, 1.5, 2.4), m: M4(-1.6, 0.8, 0.1), c: woodD }, { g: new T.BoxGeometry(0.14, 1.5, 2.4), m: M4(1.6, 0.8, 0.1), c: woodD },
    { g: new T.BoxGeometry(3.6, 0.1, 2.9), m: M4(0, 2.0, 0.15, 0.27, 0, 0), c: C(0x4b3a2a) }, { g: new T.BoxGeometry(3.4, 0.05, 2.7), m: M4(0, 2.12, 0.15, 0.27, 0, 0), c: white },
    { g: new T.BoxGeometry(2.7, 0.1, 0.5), m: M4(0, 0.5, -0.6), c: woodD }, { g: new T.BoxGeometry(0.1, 0.5, 0.4), m: M4(-1.2, 0.25, -0.6), c: woodD }, { g: new T.BoxGeometry(0.1, 0.5, 0.4), m: M4(1.2, 0.25, -0.6), c: woodD },
    { g: new T.CylinderGeometry(0.42, 0.42, 0.05, 10), m: M4(0, 0.03, 2.6), c: ash }].concat(Array.from({ length: 8 }, (_, k) => ({ g: new T.BoxGeometry(0.2, 0.17, 0.2), m: M4(Math.cos(k / 8 * 6.283) * 0.55, 0.09, 2.6 + Math.sin(k / 8 * 6.283) * 0.55, 0, k, 0), c: stone }))));
  const turs = X.list.filter(t => t.far);
  if (turs.length) {
    const gm = new T.InstancedMesh(gg, lam(), turs.length); gm.count = turs.length; gm.frustumCulled = false; gm.name = "gapahuks"; api.scene.add(gm); FU.meshes.push(gm);
    turs.forEach((t, i) => {
      const [fx, fz] = t.far, a = X.nearest(fx, fz, 60) || { tx: 1, tz: 0 }, nx = a.tz, nz = -a.tx; let best = null;
      outer: for (const sd of [1, -1]) for (const off of [11, 14, 18]) { const x = fx + nx * off * sd, z = fz + nz * off * sd; if (free(x, z, 3.2)) { best = { x, z, sd }; break outer; } }
      const b = best || { x: fx + nx * 12, z: fz + nz * 12, sd: 1 }, yaw = Math.atan2(-nx * b.sd, -nz * b.sd);          // its open side faces the trail
      const cs = Math.cos(yaw), sn = Math.sin(yaw);
      for (const [u, v, r] of [[-1.2, -1.1, 0.8], [0, -1.1, 0.8], [1.2, -1.1, 0.8], [-1.6, 1.1, 0.25], [1.6, 1.1, 0.25]]) solid(b.x + cs * u + sn * v, b.z - sn * u + cs * v, r);
      FU.gaps.push({ t, x: b.x, z: b.z, yaw, mesh: gm, i }); FU.n.gaps++;
    });
  }
  furnY(); boards();
}
const fmtClock = H => { const c = api.CAL.now(H); return c.label + " " + c.time; };
function boardDraw(b) {
  const t = b.t, g = b.cv.getContext("2d"), s = stat(t), open = isOpen(), word = !open ? "closed" : s.word;
  const key = [word, t.st.taken, Math.floor(api.GS.hour / 2)].join("|"); if (key === b.key) return; b.key = key;
  g.fillStyle = "#efe8d2"; g.fillRect(0, 0, 512, 400);
  g.fillStyle = t.col; g.fillRect(0, 0, 512, 64); g.fillStyle = "#14181c"; g.font = "bold 36px sans-serif"; g.textBaseline = "middle"; g.fillText(t.name, 16, 34, 480);
  g.fillStyle = "#222"; g.font = "bold 26px sans-serif"; g.fillText(`${(t.len / 1000).toFixed(1)} km · ${t.kind === "loop" ? "loop" : t.kind === "tur" ? "out and back" : "one way"}${t.lit ? " · lit" : ""}`, 16, 92);
  g.font = "20px sans-serif"; g.fillStyle = "#444"; g.fillText(`${t.tag} · poles ${t.kind === "fjell" ? "every 50 m" : "every 50 m"}`, 16, 120, 300);
  // a little map: the line, its start
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (const [x, z] of t.pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const bw = 170, bh = 130, sc = Math.min(bw / Math.max(1, x1 - x0), bh / Math.max(1, z1 - z0)), ox = 326 + (bw - (x1 - x0) * sc) / 2, oz = 74 + (bh - (z1 - z0) * sc) / 2;
  g.fillStyle = "#dfe6d6"; g.fillRect(324, 72, bw + 4, bh + 4); g.strokeStyle = t.col === "#18c2b2" ? "#0b8077" : t.col; g.lineWidth = 3; g.beginPath(); t.pts.forEach(([x, z], i) => { const px = ox + (x - x0) * sc, pz = oz + (z - z0) * sc; if (i) g.lineTo(px, pz); else g.moveTo(px, pz); }); g.stroke();
  g.fillStyle = "#c01818"; g.beginPath(); g.arc(ox + (t.pts[0][0] - x0) * sc, oz + (t.pts[0][1] - z0) * sc, 5, 0, 6.283); g.fill();
  g.fillStyle = "#555"; g.font = "18px sans-serif"; g.fillText(`steepest ${Math.round(t.grade * 100)}% · ${t.nseg} stretches of 50 m`, 16, 150, 300); g.fillText("Nordkinn Løypelag", 16, 176);
  // the slate
  g.fillStyle = "#3a2f24"; g.fillRect(10, 214, 492, 176); g.fillStyle = "#20272d"; g.fillRect(18, 222, 476, 160);
  g.fillStyle = "#e9eef2"; g.textBaseline = "alphabetic"; g.font = "bold 20px sans-serif"; g.fillText("TRACK TODAY", 32, 254);
  g.font = "bold 50px sans-serif"; g.fillStyle = !open ? "#9fb0bf" : WCOL[word] || "#e9eef2"; g.fillText(word.toUpperCase(), 32, 312, 440);
  g.font = "22px sans-serif"; g.fillStyle = "#c9d4dc";
  const line = !open ? "No snow: the trails are closed" : !t.st.taken ? "Nobody keeps this trail yet" : s.bad ? `${(s.badM / 1000).toFixed(1)} km still to set` : "Set along its whole length";
  g.fillText(line, 32, 346, 440); g.font = "17px sans-serif"; g.fillStyle = "#8d99a6"; g.fillText("chalked " + fmtClock(api.GS.hour), 32, 372);
  b.tex.needsUpdate = true;
}
function boards() { if (!FU.boards.length) return; for (const b of FU.boards) { b.key = ""; boardDraw(b); } }
X.boards = boards;

/* ---------------- the Løyper app ---------------- */
const LICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 20c4-1 7-1 10-4s4-6 8-9"/><path d="M3 15c3-1 5-1 7-3"/><circle cx="17" cy="5" r="1.6"/><path d="M12 9l3 1 2 3M9 11l-2 1"/></svg>';
let SEL = null;
X.back = () => { SEL = null; };
const wchip = w => { const U = api.ui; return U.chip(w.toUpperCase(), goodish(w) ? "ok" : w === "snowed under" ? "due" : w === "not prepared" ? "" : "heavy"); };
function strip(t) {
  const H = api.GS.hour, seen = {};
  let h = `<div style="display:flex;height:16px;border-radius:4px;overflow:hidden;gap:1px;margin:8px 0 4px">`;
  t.st.seg.forEach((g, i) => { const w = segWord(g, H); seen[w] = 1; const len = Math.min(TR.seg, t.len - i * TR.seg); h += `<span title="${(i * 50)} m: ${w}" data-w="${w}" style="flex:${len} 0 0;background:${WCOL[w]}"></span>`; });
  h += `</div><div style="display:flex;flex-wrap:wrap;gap:4px 12px;font-size:12px;color:var(--frost2)">` + WORDS.filter(w => seen[w]).map(w => `<span><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${WCOL[w]};margin-right:4px"></i>${w}</span>`).join("") + `</div>`;
  return h;
}
const kindName = t => t.kind === "loop" ? "loop" : t.kind === "tur" ? "turløype" : "fjelløype";
function outNow(t) {
  const H = api.GS.hour, o = t.st.out.filter(q => q.t1 > H);
  return o.map(q => { const p = TLXN.person(q.p); return p ? `${p.first} (${q.km.toFixed(1)} km)` : ""; }).filter(Boolean);
}
function appRender(el) {
  const U = api.ui, GS = api.GS, open = isOpen(), taken = X.list.filter(t => t.st.taken).length, cash = v => api.fmtCash(Math.round(v));
  const paid = X.list.reduce((a, t) => a + t.st.tot.pay, 0);
  let h = U.tabHead("LØYPER · NORDKINN LØYPELAG", "Ski trails", cash(GS.cash));
  h += `<div class="tsub">${open ? `${taken} of ${X.list.length} trails yours` : "Closed: no snow"} · paid so far ${cash(paid)}</div>`;
  if (!open) h += `<p class="tnote2">The trails are closed: there is no snow to ski on. The boards say so, nobody skis, and nothing is paid until the first snow.</p>`;
  const t = SEL && X.list.find(q => q.id === SEL);
  if (!t) {
    SEL = null;
    for (const q of X.list) {
      const s = stat(q), st = q.st, wp = st.taken ? weekPay(q, false) : null;
      h += U.tabCard({ tf: "ly:" + q.id, title: q.name, chips: (st.taken ? U.chip("YOURS", "ok") : "") + wchip(open ? s.word : "not prepared") + (open ? "" : U.chip("CLOSED", "due")),
        meta: `${(q.len / 1000).toFixed(1)} km ${kindName(q)} · ${U.esc(q.vil.name)}${q.villages.length > 1 ? " to " + U.esc(TLXN.village(q.villages[1]).name) : ""} · ${q.tag}`,
        note: st.taken ? `${s.bad ? `${(s.badM / 1000).toFixed(1)} km to set. ` : "Set along its length. "}This week: ${st.wk.v + st.day.v} visits, ${cash(wp.base)}.` : "Nobody keeps it, so nobody skis it.", pay: st.taken ? "" : "", act: "lyo:" + q.id, actLabel: "OPEN" });
    }
    h += `<p class="tnote2">Take a trail on and the villagers ski it while the track is good. Drag the groomer along it to set the track (the wing tiller makes it wide enough to skate). The løypelag pays every Monday by skier-kilometre, more at the weekend, a bonus for a week with no day under good, and nothing for a day the trail lay snowed under. You need a groomer on the hitch and the Trail crew rank.</p>`;
  } else {
    const s = stat(t), st = t.st, w = why(t), wp = st.taken ? weekPay(t, false) : null, out = outNow(t);
    h += U.tabCard({ tf: "ly:back", title: "All trails", act: "lyb:", actLabel: "BACK" });
    h += U.tabCard({ tf: "ly:" + t.id, title: t.name, chips: (st.taken ? U.chip("YOURS", "ok") : "") + wchip(open ? s.word : "not prepared") + (open ? "" : U.chip("CLOSED", "due")),
      meta: `${(t.len / 1000).toFixed(1)} km ${kindName(t)} · ${U.esc(t.vil.name)}${t.villages.length > 1 ? " to " + U.esc(TLXN.village(t.villages[1]).name) : ""} · steepest ${Math.round(t.grade * 100)}%${t.lit ? " · lamp posts (not lit yet)" : ""}`,
      note: strip(t) + (st.taken ? `<div style="margin-top:6px">${s.bad ? `${s.bad} of ${t.nseg} stretches under good: ${(s.badM / 1000).toFixed(1)} km to set.` : "Every stretch is good."}</div>` : `<div style="margin-top:6px">Nobody keeps this trail, so it is not prepared and nobody skis it.</div>`),
      warn: st.taken ? "" : w, act: (st.taken ? "lyh:" : "lyt:") + t.id, actLabel: st.taken ? "HAND BACK" : "TAKE ON", blocked: !st.taken && !!w });
    if (st.taken) {
      h += U.tabCard({ tf: "ly:use", title: "Use", meta: `On it now: ${out.length ? U.esc(out.join(", ")) : "nobody"}`, note: `Visits today ${st.day.v} · this week ${st.wk.v + st.day.v} (${(st.wk.km + st.day.km).toFixed(1)} skier-km) · paid so far ${cash(st.tot.pay)} · this week so far ${cash(wp.base)}${wp.bonus ? " + bonus" : ""}`, warn: (st.cm && st.cm.wk) ? `${st.cm.wk} complaint${st.cm.wk > 1 ? "s" : ""} from skiers this week${st.cm.wk >= 3 ? (TLX.on("skicomplaints") ? ": the bonus is gone" : " (counted, not penalised)") : " (three lose the bonus)"}. Slow down near skiers.` : "" });
    }
    if (st.last.length) h += U.sec("Statements", "") + `<div class="tsml2">${st.last.map(q => `<div class="tsm2 tprow"><b>${U.esc(q.d)}</b><span>${q.v} visits · ${q.km.toFixed(1)} skier-km · +${cash(q.pay)}${q.bonus ? " · no day under good: bonus" : ""}${q.cm ? ` · ${q.cm} complaint${q.cm > 1 ? "s" : ""}${q.nob ? ", bonus lost" : ""}` : ""}${q.under ? ` · ${q.under} day${q.under > 1 ? "s" : ""} snowed under, not paid` : ""}${q.back ? " · handed back" : ""}</span></div>`).join("")}</div>`;
  }
  el.innerHTML = `<div class="tapp">${h}</div>`;
  for (const b of el.querySelectorAll("[data-act^='lyo:']")) b.addEventListener("click", () => { SEL = b.dataset.act.slice(4); api.TABLET.refresh("loyper"); });
  for (const b of el.querySelectorAll("[data-act='lyb:']")) b.addEventListener("click", () => { SEL = null; api.TABLET.refresh("loyper"); });
  for (const b of el.querySelectorAll("[data-act^='lyt:']")) b.addEventListener("click", () => take(b.dataset.act.slice(4)));
  for (const b of el.querySelectorAll("[data-act^='lyh:']")) b.addEventListener("click", () => giveBack(b.dataset.act.slice(4)));
}
const crewCard = {
  html() {
    if (!X.ready || !TLX.on("skitrails")) return "";
    const U = api.ui, n = X.list.filter(t => t.st.taken).length;
    return U.sec("Ski trails", "løypelag") + U.tabCard({ tf: "ly:crew", title: "Løyper: keep a ski trail", chips: n ? U.chip(n + " YOURS", "ok") : "", meta: `${X.list.length} named trails round the Nordkinn. Take one on, keep the track set with the groomer, and the villagers ski it and the løypelag pays you by use every Monday.`, act: "lyc:", actLabel: "OPEN LØYPER" });
  },
  bind(el) { for (const b of el.querySelectorAll("[data-act='lyc:']")) b.addEventListener("click", () => api.TABLET.go("loyper")); }
};

/* ================= H1b: the skiers seen =================
   Every booked outing (a record in a trail's st.out: person, start hour t0, km, and since H1b the pace, the track state when
   they set out, a rest, a delay) is also a JOURNEY that is a pure function of the game clock: where on the trail they are, how
   fast, which gait, whether they are at the board putting skis on, on the gapahuk's bench, or done. Out of sight that journey is
   only the hours the bookkeeping counts; within SKI.see m of you the same journey is drawn, so who, which trail and how far along
   agree by construction, and looking at them changes nothing that is paid.
   A journey is built once per outing (planOf): legs of path sampled every 2 m with a speed (the pace, the track's state, the grade),
   a gait (diagonal stride, skating on a wide stretch, herringbone up a steep climb, a tuck down one, double-poling on a fast
   flat) and a stride phase, so the figure's feet are placed from the path and not from its root: a planted ski stays where it
   landed and the body goes over it. rig() poses the shared body kit from those targets by two-bone IK. */
const SKI = { see: 480, drop: 560, pool: { low: 4, high: 8 }, fast: 1.85, ds: 2, lead: 2.3, prep: 6.5, fin: 5.5, Lp: 1.22, hip: 0.9, ank: 0.075, skiT: 0.03 };
const HOURS = () => api.gameHour || 50;
const frac = v => v - Math.floor(v);
const ease = q => q * q * (3 - 2 * q);
const G_CLASSIC = 0, G_HERRING = 1, G_SKATE = 2, G_DPOLE = 3, G_TUCK = 4, GAITS = ["classic", "herringbone", "skate", "double-pole", "tuck"];
const strideOf = (v, g) => g === G_HERRING ? 0.8 + 0.22 * v : g === G_SKATE ? 2.3 + 0.5 * v : g === G_DPOLE ? 3.0 + 0.45 * v : g === G_TUCK ? 6 : clamp(1.15 + 0.42 * v, 1.4, 3.3);
/* ---- a leg of a journey: a polyline sampled every ds m with speed, gait and stride phase ---- */
function buildLeg(pts, o) {
  const n = pts.length, ds = SKI.ds, L = { n, x: new Float32Array(n), z: new Float32Array(n), u: new Float32Array(n), h: new Float32Array(n), gr: new Float32Array(n), q: new Float32Array(n), v: new Float32Array(n), tau: new Float32Array(n), gait: new Uint8Array(n), phi: [new Float32Array(n), new Float32Array(n)], S: [new Float32Array(n), new Float32Array(n)] };
  for (let i = 0; i < n; i++) { L.x[i] = pts[i][0]; L.z[i] = pts[i][1]; L.u[i] = i ? L.u[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) : 0; L.h[i] = W.groundAt(pts[i][0], pts[i][1]); L.q[i] = o.q ? o.q(i, pts[i]) : 0.8; }
  const pc = o.pc, wide = o.wide || (() => false);
  for (let i = 0; i < n; i++) { const a = Math.max(0, i - 4), b = Math.min(n - 1, i + 4); L.gr[i] = b > a ? (L.h[b] - L.h[a]) / (L.u[b] - L.u[a]) : 0; }
  const raw = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const q = L.q[i], g = L.gr[i];
    raw[i] = g > 0.075 ? G_HERRING : g < -0.065 ? G_TUCK : (wide(i) && q > 0.55) ? G_SKATE : (Math.abs(g) < 0.035 && pc * q > 3.7 && q > 0.5) ? G_DPOLE : G_CLASSIC;
  }
  for (let pass = 0; pass < 3; pass++) {                                                // a gait is held for at least 28 m
    let s = 0; while (s < n) { let e = s; while (e + 1 < n && raw[e + 1] === raw[s]) e++; if (e - s + 1 < 14) { const fill = s > 0 ? raw[s - 1] : e + 1 < n ? raw[e + 1] : raw[s]; for (let i = s; i <= e; i++) raw[i] = fill; } s = e + 1; }
  }
  L.gait.set(raw); L.prevG = new Uint8Array(n).fill(255); L.runU = new Float32Array(n);
  { let s = 0; while (s < n) { let e = s; while (e + 1 < n && raw[e + 1] === raw[s]) e++; for (let i = s; i <= e; i++) { L.runU[i] = L.u[s]; L.prevG[i] = s > 0 ? raw[s - 1] : 255; } s = e + 1; } }
  const v = L.v;
  for (let i = 0; i < n; i++) {
    const q = L.q[i], g = L.gr[i];
    let s = pc * (0.45 + 0.55 * q) * (g > 0 ? clamp(1 - 5.2 * g, 0.28, 1) : clamp(1 - 9 * g, 1, 1.9));
    if (L.gait[i] === G_HERRING) s = Math.min(s, 1.35); else if (L.gait[i] === G_SKATE) s *= 1.08; else if (L.gait[i] === G_TUCK) s = Math.min(s, 8.5);
    v[i] = s;
  }
  for (let pass = 0; pass < 3; pass++) { const c = Float32Array.from(v); for (let i = 0; i < n; i++) { let a = 0, m = 0; for (let k = -3; k <= 3; k++) { const j = i + k; if (j >= 0 && j < n) { a += c[j]; m++; } } v[i] = a / m; } }
  const D = L.u[n - 1], r0 = o.r0 === undefined ? 14 : o.r0, r1 = o.r1 === undefined ? 14 : o.r1;
  for (let i = 0; i < n; i++) {
    let f = 1; if (r0 > 0) f *= 0.22 + 0.78 * sstep(0, r0, L.u[i]); if (r1 > 0) f *= 0.22 + 0.78 * sstep(0, r1, D - L.u[i]);
    v[i] = Math.max(0.35, v[i] * f);
  }
  for (let i = 1; i < n; i++) L.tau[i] = L.tau[i - 1] + (L.u[i] - L.u[i - 1]) / ((v[i] + v[i - 1]) / 2);
  for (let kc = 0; kc < 2; kc++) {
    const kk = kc ? 1 : 0.72;
    for (let i = 0; i < n; i++) L.S[kc][i] = strideOf(v[i], L.gait[i]) * kk;
    L.phi[kc][0] = o.phi0 || 0;
    for (let i = 1; i < n; i++) L.phi[kc][i] = L.phi[kc][i - 1] + (L.u[i] - L.u[i - 1]) / ((L.S[kc][i] + L.S[kc][i - 1]) / 2);
  }
  L.D = D; L.T = L.tau[n - 1]; L.kind = "leg";
  return L;
}
// the index at path coordinate u (and the fraction into that step)
let _li = 0, _lf = 0;
function lIdx(L, u) {
  const n = L.n; if (u <= 0) { _li = 0; _lf = 0; return; } if (u >= L.D) { _li = n - 2; _lf = 1; return; }
  let a = Math.min(n - 2, Math.floor(u / SKI.ds)); while (a > 0 && L.u[a] > u) a--; while (a < n - 2 && L.u[a + 1] < u) a++;
  _li = a; _lf = (u - L.u[a]) / (L.u[a + 1] - L.u[a] || 1);
}
const lerpA = (A, i, f) => A[i] + (A[i + 1] - A[i]) * f;
function vAt(L, u) { lIdx(L, u); return lerpA(L.v, _li, _lf); }
function sAt(L, kc, u) { lIdx(L, u); return lerpA(L.S[kc], _li, _lf); }
function tauAt(L, u) { lIdx(L, u); return lerpA(L.tau, _li, _lf); }
function phiAt(L, kc, u) { if (u < 0) return L.phi[kc][0] + u / L.S[kc][0]; if (u > L.D) return L.phi[kc][L.n - 1] + (u - L.D) / L.S[kc][L.n - 1]; lIdx(L, u); return lerpA(L.phi[kc], _li, _lf); }
function uAtTau(L, tau) {
  if (tau <= 0) return tau * L.v[0]; if (tau >= L.T) return L.D + (tau - L.T) * L.v[L.n - 1];
  let a = 0, b = L.n - 1; while (b - a > 1) { const m = (a + b) >> 1; if (L.tau[m] <= tau) a = m; else b = m; }
  return L.u[a] + (L.u[b] - L.u[a]) * (tau - L.tau[a]) / (L.tau[b] - L.tau[a] || 1);
}
function uAtPhi(L, kc, ph) {
  const P = L.phi[kc], n = L.n; if (ph <= P[0]) return (ph - P[0]) * L.S[kc][0]; if (ph >= P[n - 1]) return L.D + (ph - P[n - 1]) * L.S[kc][n - 1];
  let a = 0, b = n - 1; while (b - a > 1) { const m = (a + b) >> 1; if (P[m] <= ph) a = m; else b = m; }
  return L.u[a] + (L.u[b] - L.u[a]) * (ph - P[a]) / (P[b] - P[a] || 1);
}
// the point and heading at path coordinate u (beyond either end the line carries on straight)
const _pp = { x: 0, z: 0, tx: 0, tz: 1 };
function ppL(L, u, o) {
  o = o || _pp; const n = L.n;
  if (u <= 0) { const a = 0, dx = L.x[1] - L.x[0], dz = L.z[1] - L.z[0], m = Math.hypot(dx, dz) || 1; o.tx = dx / m; o.tz = dz / m; o.x = L.x[a] + o.tx * u; o.z = L.z[a] + o.tz * u; return o; }
  if (u >= L.D) { const dx = L.x[n - 1] - L.x[n - 2], dz = L.z[n - 1] - L.z[n - 2], m = Math.hypot(dx, dz) || 1; o.tx = dx / m; o.tz = dz / m; o.x = L.x[n - 1] + o.tx * (u - L.D); o.z = L.z[n - 1] + o.tz * (u - L.D); return o; }
  lIdx(L, u); const i = _li, f = _lf, dx = L.x[i + 1] - L.x[i], dz = L.z[i + 1] - L.z[i], m = Math.hypot(dx, dz) || 1;
  o.x = L.x[i] + dx * f; o.z = L.z[i] + dz * f; o.tx = dx / m; o.tz = dz / m; return o;
}
/* ---- the journey of one outing: blocks in time (seconds from the start, minus delays) ---- */
const PLANS = new Map();
function locate(t, s) {                                                                 // the point and heading s m along trail t
  const c = t.cum; let a = 0, b = c.length - 1; s = clamp(s, 0, t.len);
  while (b - a > 1) { const m = (a + b) >> 1; if (c[m] <= s) a = m; else b = m; }
  const p = t.pts[a], q = t.pts[b], L = c[b] - c[a] || 1, u = (s - c[a]) / L;
  return [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u];
}
const digit = (str, i, d) => { if (typeof str !== "string" || i >= str.length) return d; const c = str.charCodeAt(i) - 48; return c >= 0 && c <= 9 ? c : d; };
function arcPts(t, o, s0, s1, kind, D) {                                                // samples from path coordinate s0 to s1 (kind lap: arc = u mod len; ob: out then back)
  const ds = SKI.ds, n = Math.max(2, Math.ceil((s1 - s0) / ds) + 1), pts = [];
  for (let i = 0; i < n; i++) {
    const u = Math.min(s1, s0 + i * ds); let s;
    if (kind === "lap") s = u % t.len; else s = u <= D / 2 ? u : D - u;
    pts.push(locate(t, kind === "lap" && u > 0 && s === 0 ? t.len : s));
  }
  return pts;
}
const BENCH = { x: -1.0, z: 1.05, fixed: 11.2 };                                       // where a skier stops in front of the bench (the gapahuk's own frame, +z is its open side), and the seconds the sit takes besides the rest
function hermite(P0, T0, P1, T1) {
  const raw = []; for (let i = 0; i <= 48; i++) { const q = i / 48, q2 = q * q, q3 = q2 * q; raw.push([(2 * q3 - 3 * q2 + 1) * P0[0] + (q3 - 2 * q2 + q) * T0[0] + (-2 * q3 + 3 * q2) * P1[0] + (q3 - q2) * T1[0], (2 * q3 - 3 * q2 + 1) * P0[1] + (q3 - 2 * q2 + q) * T0[1] + (-2 * q3 + 3 * q2) * P1[1] + (q3 - q2) * T1[1]]); }
  return resample(raw, SKI.ds);
}
function planOf(t, o) {
  const key = t.id + "|" + o.t0 + "|" + (o.g || o.p); let pl = PLANS.get(key); if (pl) return pl;
  pl = buildPlan(t, o); if (PLANS.size > 80) PLANS.clear(); PLANS.set(key, pl); return pl;
}
function buildPlan(t, o) {
  const km = o.km * 1000, pc = o.pc || 4;
  const lap = t.kind === "tur" || (t.kind === "loop" && km >= t.len * 0.85);
  const D = lap ? (t.kind === "tur" ? t.len : Math.max(1, Math.round(km / t.len)) * t.len) : Math.max(300, km);
  const kind = lap ? "lap" : "ob";
  const segAt = (u) => { const s = kind === "lap" ? u % t.len : u <= D / 2 ? u : D - u; return Math.min(t.nseg - 1, Math.floor(s / TR.seg)); };
  const q = (i, p, u0) => { const d = digit(o.f, segAt(u0 + i * SKI.ds), 8); return d <= 0 ? 0.05 : 0.12 + 0.88 * d / 9; };
  const wide = (i, u0) => digit(o.wd, segAt(u0 + i * SKI.ds), 0) === 1;
  const mk = (s0, s1, extra) => { const pts = arcPts(t, o, s0, s1, kind, D); return buildLeg(pts, Object.assign({ pc, q: (i, p) => q(i, p, s0), wide: i => wide(i, s0) }, extra || {})); };
  const blocks = []; let T = 0;
  const add = (b, dur) => { b.a = T; T += dur; b.b = T; blocks.push(b); return b; };
  add({ k: "stand", mode: "prep", x: 0, z: 0 }, SKI.prep);
  const gap = t.kind === "tur" && o.rs > 0 && (o.k || 0) === 0 && !t.st.out.some(q => q !== o && q.g === o.g && q.t0 === o.t0) ? (FU.gaps.find(g => g.t === t) || null) : null;
  if (kind === "lap" && gap) {
    // out to the gapahuk, a spur off the trail to the bench, a rest, and back onto the trail past it
    const sFar = t.cum[t.farI], uA = Math.max(30, sFar - 16), uC = Math.min(D - 30, sFar + 16), cs = Math.cos(gap.yaw), sn = Math.sin(gap.yaw), lw = (lx, lz) => [gap.x + lx * cs + lz * sn, gap.z - lx * sn + lz * cs];
    const l1 = mk(0, uA, { r0: 14, r1: 0 }); add({ k: "leg", leg: l1 }, l1.T);
    const e1 = ppL(l1, l1.D, {}), Bp = lw(BENCH.x, BENCH.z), d1 = Math.hypot(Bp[0] - e1.x, Bp[1] - e1.z) * 1.15;
    const sIn = buildLeg(hermite([e1.x, e1.z], [e1.tx * d1, e1.tz * d1], Bp, [-sn * d1, -cs * d1]), { pc: Math.min(pc, 3.2), q: () => 0.8, r0: 0, r1: 14 }); add({ k: "leg", leg: sIn, spur: 1 }, sIn.T);
    add({ k: "bench", gap, rs: o.rs }, BENCH.fixed + o.rs);
    const l2 = mk(uC, D, { r0: 0, r1: 14 }), e2 = ppL(l2, 0, {}), d2 = Math.hypot(Bp[0] - e2.x, Bp[1] - e2.z) * 1.15;
    const sOut = buildLeg(hermite(Bp, [sn * d2, cs * d2], [e2.x, e2.z], [e2.tx * d2, e2.tz * d2]), { pc: Math.min(pc, 3.2), q: () => 0.8, r0: 12, r1: 0 }); add({ k: "leg", leg: sOut, spur: 1 }, sOut.T);
    add({ k: "leg", leg: l2 }, l2.T);
  } else if (kind === "lap") { const l = mk(0, D, { r0: 14, r1: 14 }); add({ k: "leg", leg: l }, l.T); }
  else {
    const h = D / 2, l1 = mk(0, h, { r0: 14, r1: 18 }), l2 = mk(h, D, { r0: 18, r1: 14 });
    add({ k: "leg", leg: l1 }, l1.T); add({ k: "turn", leg: l1 }, 3.0); add({ k: "leg", leg: l2, flip: true }, l2.T);
  }
  add({ k: "stand", mode: "fin" }, SKI.fin);
  return { t, o, kind, D, blocks, T, nb: blocks.length };
}

/* ---- the body: P is a pose in world terms (root, feet, hands, pole tips); rig() turns it into joint angles ---- */
const newP = () => ({ x: 0, z: 0, yaw: 0, hip: 0.88, pitch: 0.1, twist: 0, roll: 0, head: 0, f: [0, 1].map(() => ({ x: 0, z: 0, yaw: 0, lift: 0, tip: 0, ski: 1, sx: 0, sz: 0, syaw: 0, sv: 0 })), h: [0, 1].map(() => ({ x: 0, y: 0, z: 0 })), p: [0, 1].map(() => ({ x: 0, y: 0, z: 0 })) });
function lerpP(A, B, w, o) {
  const m = (a, b) => a + (b - a) * w, ma = (a, b) => a + wrapA(b - a) * w;
  o.x = m(A.x, B.x); o.z = m(A.z, B.z); o.yaw = ma(A.yaw, B.yaw); o.hip = m(A.hip, B.hip); o.pitch = m(A.pitch, B.pitch); o.twist = m(A.twist, B.twist); o.roll = m(A.roll, B.roll); o.head = m(A.head, B.head);
  for (let i = 0; i < 2; i++) {
    const a = A.f[i], b = B.f[i], c = o.f[i]; c.x = m(a.x, b.x); c.z = m(a.z, b.z); c.yaw = ma(a.yaw, b.yaw); c.lift = m(a.lift, b.lift); c.tip = m(a.tip, b.tip); c.ski = b.ski; c.sx = b.sx; c.sz = b.sz; c.syaw = b.syaw; c.sv = b.sv;
    for (const k of ["x", "y", "z"]) { o.h[i][k] = m(A.h[i][k], B.h[i][k]); o.p[i][k] = m(A.p[i][k], B.p[i][k]); }
  }
  return o;
}
function copyP(A, o) { return lerpP(A, A, 0, o); }
const wrapA = a => a - Math.round(a / 6.28319) * 6.28319;
const _lb = { hx: 0, hz: 0, kn: 0, sh: 0 };
// two-bone limb from its root to a target (dx sideways, dy DROP, dz ahead): upper pitch / roll, bend, and the lower segment's absolute angle ahead.
// A knee bends forward (elbowBack false); an elbow so that the forearm swings up and forward (true).
function limb(l1, l2, dx, dy, dz, elbowBack, o) {
  const dyp = Math.hypot(dx, dy), D = clamp(Math.hypot(dyp, dz), 0.15, (l1 + l2) * 0.9995);
  const ft = Math.atan2(dz, dyp), al = Math.acos(clamp((l1 * l1 + D * D - l2 * l2) / (2 * l1 * D), -1, 1));
  o.kn = Math.PI - Math.acos(clamp((l1 * l1 + l2 * l2 - D * D) / (2 * l1 * l2), -1, 1));
  o.hz = Math.atan2(dx, dy); o.hx = elbowBack ? -(ft - al) : -(ft + al); o.sh = elbowBack ? ft - al + o.kn : ft + al - o.kn;
  return o;
}
let UPV = null, PV = null;
function rig(sl, P) {
  const g = sl.g, U = g.userData, sc = sl.sc, cy = Math.cos(P.yaw), sy = Math.sin(P.yaw), g0 = W.surf(P.x, P.z), ank = (SKI.ank * sc + SKI.skiT) / sc, ks = sc >= 0.8 ? 1 : 0.85;
  const Lr = 0.85 * 0.97; let lim = 9; const fy = sl._fy, fl = sl._fl;
  for (let i = 0; i < 2; i++) {
    const f = P.f[i], sd = i ? 1 : -1, wx = f.x - P.x, wz = f.z - P.z, lx = (wx * cy - wz * sy) / sc, lz = (wx * sy + wz * cy) / sc;
    fy[i] = W.surf(f.x, f.z) + f.lift; fl[i * 2] = lx; fl[i * 2 + 1] = lz;
    const ay = (fy[i] - g0) / sc + ank, dx = lx - sd * 0.1;
    lim = Math.min(lim, ay + Math.sqrt(Math.max(0.04, Lr * Lr - dx * dx - lz * lz)));
  }
  const hip = Math.min(P.hip, lim); sl.hipNow = hip; sl.hipLim = lim;
  g.position.set(P.x, g0 + (hip - 0.93) * sc, P.z); g.rotation.set(0, P.yaw, 0, "YXZ");
  for (let i = 0; i < 2; i++) {
    const f = P.f[i], sd = i ? 1 : -1, ay = (fy[i] - g0) / sc + ank;
    limb(0.42, 0.43, fl[i * 2] - sd * 0.1, hip - ay, fl[i * 2 + 1], false, _lb);
    U.legs[i].rotation.set(_lb.hx, clamp(wrapA(f.yaw - P.yaw), -0.8, 0.8), _lb.hz); U.shins[i].rotation.x = _lb.kn;
    const sx = f.ski ? f.x : f.sx, sz = f.ski ? f.z : f.sz, syw = f.ski ? f.yaw : f.syaw, sk = sl.skis[i];
    const fx = Math.sin(syw), fz = Math.cos(syw), th = Math.atan2(W.surf(sx + fx * 0.9, sz + fz * 0.9) - W.surf(sx - fx * 0.7, sz - fz * 0.7), 1.6);
    if (f.ski || f.sv) { sk.visible = true; sk.position.set(sx, W.surf(sx, sz) + (f.ski ? f.lift : 0) + 0.012, sz); sk.rotation.set(-(th + (f.ski ? f.tip : 0)), syw, 0, "YXZ"); sk.scale.setScalar(ks); } else sk.visible = false;
    U.ank[i].rotation.x = _lb.sh - (f.ski ? th + f.tip : 0);
  }
  U.torso.rotation.set(P.pitch, P.twist, P.roll, "XYZ"); U.head.rotation.x = -P.pitch * 0.75 + P.head; U.head.rotation.y = -P.twist * 0.7;
  const cp = Math.cos(P.pitch), sp = Math.sin(P.pitch);
  for (let i = 0; i < 2; i++) {
    const sd = i ? 1 : -1, h = P.h[i], wx = h.x - P.x, wz = h.z - P.z, lx = (wx * cy - wz * sy) / sc, lz = (wx * sy + wz * cy) / sc, ly = (h.y - g0) / sc - (hip - 0.93);
    const vx = lx - sd * 0.21, vy = ly - (0.93 + 0.53 * cp), vz = lz - 0.53 * sp, ty = vy * cp + vz * sp, tz = -vy * sp + vz * cp;
    limb(0.25, 0.24, vx, -ty, tz, true, _lb);
    U.arms[i].rotation.set(_lb.hx, 0, _lb.hz); U.fore[i].rotation.x = -_lb.kn;
    sl.reach[i] = Math.hypot(vx, ty, tz) - 0.49;
    const p = P.p[i], pm = sl.poles[i], dx = h.x - p.x, dy = h.y - p.y, dz = h.z - p.z, len = Math.hypot(dx, dy, dz) || 1;
    pm.visible = true; pm.position.set(p.x, p.y, p.z); pm.scale.set(ks, len / SKI.Lp, ks); PV.set(dx / len, dy / len, dz / len); pm.quaternion.setFromUnitVectors(UPV, PV);
  }
}
/* ---- gaits: each fills P from the journey (leg L, body at path coordinate u) ---- */
const _s1 = { x: 0, z: 0, tx: 0, tz: 1 }, _s2 = { x: 0, z: 0, tx: 0, tz: 1 };
const sg = (i) => i ? 1 : -1;
function onPath(L, u, lat, o) { ppL(L, u, _s1); o.x = _s1.x + _s1.tz * lat; o.z = _s1.z - _s1.tx * lat; o.yaw = Math.atan2(_s1.tx, _s1.tz); return o; }
function setFoot(P, i, L, uf, lat, lift, yawOff, tip) { const f = P.f[i]; onPath(L, uf, lat, f); f.yaw += yawOff; f.lift = lift; f.tip = tip || 0; f.ski = 1; f.sv = 0; }
function rootAt(P, L, u, lat) { onPath(L, u, lat, P); ppL(L, u + 1.6, _s2); P.yaw = Math.atan2(_s2.x - _s1.x + (_s2.tx * 0), _s2.z - _s1.z); }
// a pole: planted for kp of its cycle (tip fixed in the snow, the hand driven past it), then swung forward trailing, tip lifted, and flicked
// ahead to land where the next plant is. Returns the fraction of the plant, or -1 in the swing.
function setPole(sl, P, j, L, u, ph, off, freq, S0, kp, rel0, hzA, hzB, latT, latH) {
  const kc = sl.kc, x = ph * freq - off, n = Math.floor(x), fr = x - n, Lp = SKI.Lp * sl.sc / 0.88, dLat = latT - latH, Le = Math.sqrt(Lp * Lp - dLat * dLat);
  const p = P.p[j], h = P.h[j], uT0 = uAtPhi(L, kc, (n + off) / freq) + rel0;
  if (fr < kp) {
    onPath(L, uT0, latT, _s2); p.x = _s2.x; p.z = _s2.z; p.y = W.surf(p.x, p.z);
    const hz = hzA + (hzB - hzA) * ease(fr / kp); ppL(L, u + hz, _s1); h.x = _s1.x + _s1.tz * latH; h.z = _s1.z - _s1.tx * latH;
    const dh = Math.min(Lp * 0.985, Math.hypot(p.x - h.x, p.z - h.z)); h.y = p.y + Math.sqrt(Lp * Lp - dh * dh);
    return fr / kp;
  }
  const q = (fr - kp) / (1 - kp), e = ease(q), uRel = uAtPhi(L, kc, (n + off + kp) / freq), hz = hzB + (hzA - hzB) * e;
  const thR = Math.asin(clamp((uT0 - (uRel + hzB)) / Le, -0.95, 0.95)), thE = Math.asin(clamp((rel0 - hzA) / Le, -0.95, 0.95));
  const th = thR + (thE - thR) * e - 0.9 * Math.sin(Math.PI * q);
  ppL(L, u + hz, _s1); h.x = _s1.x + _s1.tz * latH; h.z = _s1.z - _s1.tx * latH;
  const hyR = Le * Math.cos(thR), hyE = Le * Math.cos(thE); let hy = W.surf(h.x, h.z) + hyR + (hyE - hyR) * e, ty = hy - Le * Math.cos(th);
  onPath(L, u + hz + Le * Math.sin(th), latT, _s2); p.x = _s2.x; p.z = _s2.z;
  const sf = W.surf(p.x, p.z) + 0.03; if (ty < sf) { ty = sf; hy = ty + Le * Math.cos(th); }
  p.y = ty; h.y = hy;
  return -1;
}
function gDiag(sl, L, u, P, gait) {
  const kc = sl.kc, k = sl.k, S0 = sAt(L, kc, u), ph = phiAt(L, kc, u), her = gait === G_HERRING, ska = gait === G_SKATE;
  const b = her ? 0.5 : clamp((ska ? 0.62 : 0.58) * k / S0, 0.12, 0.5), latF = (ska ? 0.2 : her ? 0.2 : 0.115) * k, splay = ska ? 0.3 : her ? 0.42 : 0;
  for (let i = 0; i < 2; i++) {
    const sd = sg(i), off = i * 0.5, x = ph - off, n = Math.floor(x), fr = x - n, u0 = uAtPhi(L, kc, n + off), uP0 = u0 + 0.5 * b * sAt(L, kc, u0);
    let uf = uP0, lift = 0, tip = 0;
    if (fr >= b) {                                                                       // after the kick: a quick swing forward (the ski just off the snow), then a glide ON the snow at the body's own speed
      const q = (fr - b) / (1 - b), u1 = uAtPhi(L, kc, n + 1 + off), uP1 = u1 + 0.5 * b * sAt(L, kc, u1), qs = 0.4, fg = (1 - qs) * (1 - b); let x;
      if (q < qs) { const s = q / qs, s2 = s * s, s3 = s2 * s; x = (1 - fg) * (3 * s2 - 2 * s3) + (1 - b) * qs * (s3 - s2); lift = 0.05 * Math.sin(Math.PI * s) * k; tip = 0.1 * Math.sin(Math.PI * s); }
      else x = (1 - fg) + fg * (q - qs) / (1 - qs);
      uf = uP0 + (uP1 - uP0) * x;
    }
    setFoot(P, i, L, uf, sd * latF, lift, sd * splay, tip);
    if (X.dbgF) X.dbgF[i] = { ph, S0, b, n, fr, u0, uP0, uf, u };
  }
  const lat = ska ? -0.07 * k * Math.sin(2 * Math.PI * ph) : 0;
  rootAt(P, L, u, lat);
  const freq = ska ? 2 : 1, cyc = S0 / freq, kp = clamp((ska ? 0.9 : 1.45) * k / cyc, 0.3, 0.62);
  for (let j = 0; j < 2; j++) {
    const sd = sg(j), off = ska ? 0 : (1 - j) * 0.5 - 0.05;
    setPole(sl, P, j, L, u, ph, off, freq, S0, kp, (ska ? 0.75 : her ? 0.35 : 0.9) * k, 0.45 * k, -0.1 * k, sd * (ska ? 0.5 : her ? 0.55 : 0.34) * k, sd * 0.25 * k);
  }
  P.pitch = ska ? 0.42 + 0.08 * Math.cos(4 * Math.PI * ph) : her ? 0.5 : 0.3 + 0.05 * Math.cos(4 * Math.PI * ph); P.twist = ska ? 0 : 0.07 * Math.cos(2 * Math.PI * ph) * (her ? 0.5 : 1);
  P.roll = ska ? -lat / k * 0.8 : 0; P.hip = ska ? 0.8 : her ? 0.82 : 0.87; P.head = 0;
}
function gDpole(sl, L, u, P) {
  const kc = sl.kc, k = sl.k, S0 = sAt(L, kc, u), ph = phiAt(L, kc, u), kp = clamp(1.3 * k / S0, 0.3, 0.5);
  for (let i = 0; i < 2; i++) setFoot(P, i, L, u + sg(i) * 0.05 * k, sg(i) * 0.115 * k, 0, 0, 0);
  rootAt(P, L, u, 0);
  let crunch = 0;
  for (let j = 0; j < 2; j++) { const w = setPole(sl, P, j, L, u, ph, 0, 1, S0, kp, 0.85 * k, 0.55 * k, -0.35 * k, sg(j) * 0.36 * k, sg(j) * 0.24 * k); if (w >= 0) crunch = Math.sin(Math.PI * w); }
  P.pitch = 0.2 + 0.75 * crunch; P.hip = 0.88 - 0.16 * crunch; P.twist = 0; P.roll = 0; P.head = 0.1 * crunch;
}
function gTuck(sl, L, u, P) {
  const k = sl.k, sc = sl.sc;
  for (let i = 0; i < 2; i++) setFoot(P, i, L, u + sg(i) * 0.04 * k, sg(i) * 0.12 * k, 0, 0, 0);
  rootAt(P, L, u, 0);
  for (let j = 0; j < 2; j++) {
    const h = P.h[j], p = P.p[j]; onPath(L, u + 0.72 * sc, sg(j) * 0.16 * k, _s2); h.x = _s2.x; h.z = _s2.z; h.y = W.surf(h.x, h.z) + 0.66 * sc;
    ppL(L, u, _s1); const Lp = SKI.Lp * sc / 0.88; p.x = h.x - _s1.tx * Lp * 0.95; p.z = h.z - _s1.tz * Lp * 0.95; p.y = h.y - Lp * 0.3;
  }
  P.pitch = 1.05; P.hip = 0.6; P.twist = 0; P.roll = 0; P.head = 0.6;
}
// standing on the skis at a point, poles planted at the sides; bend 0..1 leans down to the bindings (the skis-on moment, and off again)
function gStand(sl, P, x, z, yaw, bend, t) {
  const k = sl.k, sc = sl.sc, sn = Math.sin(yaw), cs = Math.cos(yaw), Lp = SKI.Lp * sc / 0.88;
  P.x = x; P.z = z; P.yaw = yaw;
  for (let i = 0; i < 2; i++) { const f = P.f[i], sd = sg(i); f.x = x + cs * sd * 0.14 * k; f.z = z - sn * sd * 0.14 * k; f.yaw = yaw; f.lift = 0; f.tip = 0; f.ski = 1; f.sv = 0; }
  for (let j = 0; j < 2; j++) {
    const sd = sg(j), h = P.h[j], p = P.p[j], fx = P.f[j];
    // planted: tip ahead and out, the hand over it; bent: the hand at the boot, the pole trailing back along the snow
    const tx = x + sn * 0.3 * k + cs * sd * 0.42 * k, tz = z + cs * 0.3 * k - sn * sd * 0.42 * k, ty = W.surf(tx, tz);
    const hy = ty + Math.sqrt(Lp * Lp - 0.0884 * k * k), hx = tx - sn * 0.28 * k - cs * sd * 0.1 * k, hz = tz - cs * 0.28 * k + sn * sd * 0.1 * k;
    const bx = fx.x + sn * 0.05, bz = fx.z + cs * 0.05, by = W.surf(bx, bz) + 0.2 * sc;
    h.x = hx + (bx - hx) * bend; h.y = hy + (by - hy) * bend; h.z = hz + (bz - hz) * bend;
    const ex = h.x - sn * Lp * 0.97, ez = h.z - cs * Lp * 0.97, ey = W.surf(ex, ez);
    const wp = 1 - ease(clamp(bend * 1.6, 0, 1));
    p.x = tx + (ex - tx) * (1 - wp); p.z = tz + (ez - tz) * (1 - wp); p.y = ty + (ey - ty) * (1 - wp) + 0.02;
  }
  P.pitch = 0.12 + 1.05 * bend + 0.012 * Math.sin(t * 2.1); P.hip = 0.9 - 0.2 * bend; P.twist = 0; P.roll = 0; P.head = 0.5 * bend;
}

/* ---- the journey as a pose: which block of it the clock is in, and the gait inside it ---- */
const _pa = newP(), _pb = newP();
const bump = (s, a, b, c, d) => sstep(a, b, s) * (1 - sstep(c, d, s));
function poseLeg(sl, B, tau, P, gaitOv) {
  const L = B.leg, uL = uAtTau(L, tau - B.a), u = uL - sl.lag * (B.back ? 0 : 1) * (sl.pl.kind === "lap" ? 1 : 0), uc = clamp(u, 0, L.D); lIdx(L, uc);
  const i = _li, gait = gaitOv === undefined ? L.gait[i] : gaitOv;
  sl.u = u; sl.v = lerpA(L.v, i, _lf); sl.gait = gait;
  if (gait === G_DPOLE) gDpole(sl, L, u, P); else if (gait === G_TUCK) gTuck(sl, L, u, P); else gDiag(sl, L, u, P, gait);
  if (sl.lat) { ppL(L, uc, _s1); const dx = _s1.tz * sl.lat * (B.flip ? -1 : 1), dz = -_s1.tx * sl.lat * (B.flip ? -1 : 1); shiftP(P, dx, dz); }
}
function shiftP(P, dx, dz) { P.x += dx; P.z += dz; for (let i = 0; i < 2; i++) { P.f[i].x += dx; P.f[i].z += dz; P.h[i].x += dx; P.h[i].z += dz; P.p[i].x += dx; P.p[i].z += dz; } }
function poseBlock(sl, bi, tau, P) {
  const pl = sl.pl, B = pl.blocks[bi], t = gameClockNow();
  if (B.k === "leg") {
    poseLeg(sl, B, tau, P);
    // a new gait is eased in over about half a second (the feet cannot jump: the blend is short and at the speed of the stride)
    const L = B.leg, uc = clamp(sl.u, 0, L.D); lIdx(L, uc); const i = _li, pg = L.prevG[i], run = L.runU[i];
    if (pg !== 255 && uc - run < Math.max(1.2, sl.v * 0.5)) { const w = ease(clamp((uc - run) / Math.max(1.2, sl.v * 0.5), 0, 1)); const keepG = sl.gait; poseLeg(sl, B, tau, _pa, pg); sl.gait = keepG; const keepV = sl.v; lerpP(_pa, P, w, P); sl.v = keepV; }
  } else if (B.k === "stand") {
    const L = B.mode === "prep" ? pl.blocks.find(b => b.k === "leg").leg : pl.blocks[pl.nb - 2].leg, at = B.mode === "prep" ? 0 : L.D, s = (tau - B.a) / (B.b - B.a);
    const lag = pl.kind === "lap" ? sl.lag : 0; ppL(L, at - lag, _s1); const yaw = Math.atan2(_s1.tx, _s1.tz);
    let x = _s1.x, z = _s1.z; if (sl.lat) { const sgn = (B.mode === "fin" && pl.kind !== "lap") ? -1 : 1; x += _s1.tz * sl.lat * sgn; z -= _s1.tx * sl.lat * sgn; }
    gStand(sl, P, x, z, yaw + (B.mode === "fin" && pl.kind !== "lap" ? 0 : 0), B.mode === "prep" ? bump(s, 0.12, 0.3, 0.68, 0.88) : bump(s, 0.15, 0.35, 0.7, 0.9), t);
    sl.u = at - lag; sl.v = 0; sl.gait = -1;
  } else if (B.k === "turn") poseTurn(sl, B, tau, P);
  else if (B.k === "bench") poseBench(sl, B, tau, P);
}
let _clk = 0; const gameClockNow = () => api.now ? api.now() : _clk;
function poseSlot(sl, tau, P) {
  const pl = sl.pl; let bi = 0; while (bi < pl.nb - 1 && tau >= pl.blocks[bi].b) bi++;
  tau = clamp(tau, 0, pl.T); const B = pl.blocks[bi]; sl.bi = bi; sl.blk = B.k === "stand" ? B.mode : B.k;
  poseBlock(sl, bi, tau, P);
  // the first moments of a block are blended from the end of the one before it
  if (bi > 0 && tau - B.a < 0.5) { const w = ease((tau - B.a) / 0.5), keep = [sl.u, sl.v, sl.gait]; poseBlock(sl, bi - 1, pl.blocks[bi - 1].b - 1e-3, _pb); lerpP(_pb, P, w, P); sl.u = keep[0]; sl.v = keep[1]; sl.gait = keep[2]; }
}
// a star turn on the spot: six small steps, feet and skis swung round together about the middle (cx, cz), from heading th0 through half a circle
function starTurn(sl, P, cx, cz, th0, s) {
  const k = sl.k, sc = sl.sc, Lp = SKI.Lp * sc / 0.88, ys = [0, 0], lifts = [0, 0];
  for (let st = 0; st < 6; st++) { const i = st & 1, t0 = 0.2 + st * 0.42, q = clamp((s - t0) / 0.36, 0, 1), tgt = (Math.floor(st / 2) + 1) * Math.PI / 3, from = Math.floor(st / 2) * Math.PI / 3; if (q >= 1) ys[i] = tgt; else if (q > 0) { ys[i] = from + (tgt - from) * ease(q); lifts[i] = 0.07 * Math.sin(Math.PI * q) * k; } }
  for (let i = 0; i < 2; i++) { const f = P.f[i], y = th0 + ys[i], sd = sg(i); f.x = cx + Math.cos(y) * sd * 0.14 * k; f.z = cz - Math.sin(y) * sd * 0.14 * k; f.yaw = y; f.lift = lifts[i]; f.tip = 0; f.ski = 1; f.sv = 0; }
  const by = th0 + Math.atan2(Math.sin(ys[0]) + Math.sin(ys[1]), Math.cos(ys[0]) + Math.cos(ys[1]));
  P.x = cx; P.z = cz; P.yaw = by; penHands(sl, P, cx, cz, by, 0.16, 9);
  P.pitch = 0.18; P.hip = 0.88; P.twist = 0; P.roll = 0; P.head = 0;
}
// hands at the sides ahead of the root, a pole in each trailing back onto the snow (tip dragging): the poles of a skier turning, stepping, sitting
function penHands(sl, P, rx, rz, yaw, ahead, ang) {
  const k = sl.k, sc = sl.sc, Lp = SKI.Lp * sc / 0.88, sn = Math.sin(yaw), cs = Math.cos(yaw);
  for (let j = 0; j < 2; j++) {
    const sd = sg(j), h = P.h[j], p = P.p[j], hx = rx + cs * sd * 0.28 * k + sn * ahead * k, hz = rz - sn * sd * 0.28 * k + cs * ahead * k;
    const tx = hx - sn * Lp * 0.96, tz = hz - cs * Lp * 0.96;
    if (ang > 2) { h.x = hx; h.z = hz; h.y = W.surf(hx, hz) + 0.92 * sc; p.x = tx; p.z = tz; p.y = W.surf(tx, tz) + 0.03; }
    else {                                                                              // leaning forward onto the snow ahead
      const px = hx + sn * Lp * Math.sin(ang), pz = hz + cs * Lp * Math.sin(ang); p.x = px; p.z = pz; p.y = W.surf(px, pz); h.x = hx; h.z = hz; h.y = p.y + Lp * Math.cos(ang);
    }
  }
}
function poseTurn(sl, B, tau, P) {
  const L = B.leg; ppL(L, L.D, _s1); const th0 = Math.atan2(_s1.tx, _s1.tz); let cx = _s1.x, cz = _s1.z; if (sl.lat) { cx += _s1.tz * sl.lat; cz -= _s1.tx * sl.lat; }
  starTurn(sl, P, cx, cz, th0, tau - B.a); sl.u = L.D; sl.v = 0; sl.gait = -1;
}
// the rest on the gapahuk's bench: a star turn at the spot in front of it (skis stay under the feet to here), backing out of the skis a step at a time,
// sitting down, the rest, up again, stepping back into the skis and on. Skis are left where they were stepped out of.
function poseBench(sl, B, tau, P) {
  const s = tau - B.a, k = sl.k, sc = sl.sc, g = B.gap, psi = g.yaw, cs = Math.cos(psi), sn = Math.sin(psi), R = B.rs, lat = 0.14 * k;
  const A0 = 3.0, A1 = 5.4, A2 = 6.8, A3 = 6.8 + R, A4 = 8.2 + R, A5 = 10.6 + R;
  const lx = (x, z, o) => { o.x = g.x + x * cs + z * sn; o.z = g.z - x * sn + z * cs; return o; };
  sl.u = 0; sl.v = 0; sl.gait = -1;
  if (s < A0) { const c = lx(BENCH.x, BENCH.z, {}); starTurn(sl, P, c.x, c.z, psi + Math.PI, s); return; }
  const steps = [[0, A0, 1.05, 0.45], [1, A0 + 0.6, 1.05, 0.25], [0, A0 + 1.2, 0.45, -0.05], [1, A0 + 1.8, 0.25, -0.05], [1, A4, -0.05, 0.25], [0, A4 + 0.6, -0.05, 0.45], [1, A4 + 1.2, 0.25, 1.05], [0, A4 + 1.8, 0.45, 1.05]];
  const z = [BENCH.z, BENCH.z], lift = [0, 0], offAt = [A0, A0 + 0.6], onAt = [A5, A4 + 1.8];
  for (const [i, t0, a, b] of steps) if (s >= t0) { const q = clamp((s - t0) / 0.6, 0, 1); z[i] = a + (b - a) * ease(q); if (q < 1) lift[i] = 0.1 * Math.sin(Math.PI * q) * k; }
  for (let i = 0; i < 2; i++) {
    const f = P.f[i], sd = sg(i); lx(BENCH.x + sd * lat, z[i], f); f.yaw = psi; f.lift = lift[i]; f.tip = 0;
    const off = s >= offAt[i] && s < onAt[i]; f.ski = off ? 0 : 1; f.sv = off ? 1 : 0; if (off) { lx(BENCH.x + sd * lat, BENCH.z, _bw); f.sx = _bw.x; f.sz = _bw.z; f.syaw = psi; }
  }
  const sit = sstep(A1, A2, s) * (1 - sstep(A3, A4, s)), zr = (z[0] + z[1]) / 2 * (1 - sit) + (-0.52) * sit;
  lx(BENCH.x, zr, P); P.yaw = psi; const g0 = W.surf(P.x, P.z), seatTop = W.surf(g.x, g.z) + 0.45, hipSeat = (seatTop - g0) / sc + 0.17;
  P.hip = 0.88 + (hipSeat - 0.88) * sit; P.pitch = 0.14 - 0.2 * sit; P.twist = 0.14 * Math.sin(s * 0.8) * sit; P.roll = 0; P.head = 0;
  penHands(sl, P, P.x, P.z, psi, 0.35 - 0.1 * sit, 0.5);
}
const _bw = { x: 0, z: 0 };

/* ---- the pool: figures made once, lent to whoever is nearest ---- */
const JACKETS = [0xc8322a, 0x2a6fb8, 0xe0a030, 0x2f8f5a, 0x7a3fa0, 0xd9622b, 0x1f9ba8, 0xb83a7a, 0x4a5a6a, 0xcfd24a, 0x9a2a2a, 0x3a8ad0];
const PANTS_C = [0x1f232a, 0x2a3140, 0x3a2f28, 0x22302a, 0x14161a, 0x33384a];
const TRIM_C = [0xe8e4da, 0xd8b23a, 0x2a2f36, 0xc8322a, 0x2a6fb8];
const SL = []; let scanT = 0, _lampTex = null, _skiG = null, _poleG = null, _poleM = null; const SKS = { n: 0, err: "", ms: 0 };
function skiGeo() { return _skiG || (_skiG = mergeGeo([{ g: new T.BoxGeometry(0.062, 0.018, 1.72), m: M4(0, 0, 0.12), c: C(0xffffff) }, { g: new T.BoxGeometry(0.06, 0.016, 0.24), m: M4(0, 0.03, 1.07, -0.42, 0, 0), c: C(0xffffff) }, { g: new T.BoxGeometry(0.07, 0.03, 0.14), m: M4(0, 0.012, 0.02), c: C(0x20232a) }])); }
function poleGeo() { return _poleG || (_poleG = mergeGeo([{ g: new T.CylinderGeometry(0.011, 0.008, SKI.Lp, 6), m: M4(0, SKI.Lp / 2, 0), c: C(0x2a2f36) }, { g: new T.CylinderGeometry(0.05, 0.05, 0.012, 10), m: M4(0, 0.07, 0), c: C(0x15171b) }, { g: new T.CylinderGeometry(0.02, 0.02, 0.13, 8), m: M4(0, SKI.Lp - 0.05, 0), c: C(0xc8c8c8) }])); }
function lampTex() {
  if (_lampTex) return _lampTex; const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(255,250,225,1)"); r.addColorStop(0.18, "rgba(255,240,190,.85)"); r.addColorStop(0.5, "rgba(255,225,150,.25)"); r.addColorStop(1, "rgba(255,220,140,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return (_lampTex = new T.CanvasTexture(c));
}
function makeSlot(i) {
  const std = api.mesh.std, mats = { jacket: std(0xc8322a, 0.85, 0), pants: std(0x20262e, 0.9, 0), trim: std(0xe0a030, 0.7, 0) };
  const g = api.newWalker(mats); g.visible = false; api.scene.add(g); const U = g.userData;
  for (const n in U.headKit) for (const m of U.headKit[n]) m.visible = false; for (const m of U.headKit.beanie) m.visible = true;
  const pk = new T.Group(); TLXL.build(TLXL.fig.pack(TLXL.fig.K), pk); U.torso.add(pk); pk.visible = false;
  const skiMat = new T.MeshLambertMaterial({ vertexColors: true, color: 0xc8322a }); _poleM = _poleM || new T.MeshLambertMaterial({ vertexColors: true });
  const mesh = (geo, mat) => { const m = new T.Mesh(geo, mat); m.visible = false; m.frustumCulled = false; api.scene.add(m); return m; };
  const lamp = new T.Sprite(new T.SpriteMaterial({ map: lampTex(), color: 0xfff2c8, transparent: true, depthWrite: false, blending: T.AdditiveBlending })); lamp.position.set(0, 0.2, 0.12); lamp.scale.set(0.42, 0.42, 1); lamp.visible = false; U.head.add(lamp);
  const sl = { i, g, U, mats, skiMat, pk, lamp, skis: [mesh(skiGeo(), skiMat), mesh(skiGeo(), skiMat)], poles: [mesh(poleGeo(), _poleM), mesh(poleGeo(), _poleM)], P: newP(), _fy: [0, 0], _fl: [0, 0, 0, 0], reach: [0, 0], vis: false, o: null, t: null, pl: null, key: "", sc: 0.88, k: 1, kc: 1, lag: 0, lat: 0, u: 0, v: 0, gait: -1, blk: "", hipNow: 0.9, hipLim: 0.9 };
  g.frustumCulled = true; SL.push(sl); return sl;
}
function hideSlot(sl) { sl.vis = false; sl.g.visible = false; sl.o = null; sl.key = ""; for (const m of sl.skis) m.visible = false; for (const m of sl.poles) m.visible = false; sl.lamp.visible = false; }
function bindSlot(sl, t, o, pl, key) {
  const p = TLXN.person(o.p) || { id: o.p, age: 30 }, k = o.k || 0, kid = p.age < 16;
  sl.t = t; sl.o = o; sl.pl = pl; sl.key = key; sl.who = p; sl.mk = k; sl.kc = kid ? 0 : 1; sl.sc = kid ? clamp(0.5 + 0.026 * p.age, 0.62, 0.86) : 0.86 + 0.06 * hash(p.id + "s"); sl.k = sl.sc / 0.88;
  sl.lag = pl.kind === "lap" ? k * SKI.lead : 0; sl.lat = pl.kind === "lap" ? 0 : ((k + 1) >> 1) * 1.1 * (k & 1 ? 1 : -1);
  sl.mats.jacket.color.setHex(JACKETS[Math.floor(hash(p.id + "j") * JACKETS.length)]); sl.mats.pants.color.setHex(PANTS_C[Math.floor(hash(p.id + "p") * PANTS_C.length)]); sl.mats.trim.color.setHex(TRIM_C[Math.floor(hash(p.id + "t") * TRIM_C.length)]);
  sl.skiMat.color.setHex(JACKETS[Math.floor(hash(p.id + "k") * JACKETS.length)]);
  sl.g.scale.setScalar(sl.sc); sl.pk.visible = t.kind !== "loop"; sl.vis = true; sl.g.visible = true; sl.hist = 0;
  sl.as = null; sl.tw = 1; sl.stag = 0; sl.pt = null; sl.cmH = -99; sl.noAside = false; sl.talk = 0; sl.hit = 0;                  // nothing of the last skier to use this slot carries over
}
function viewer() { const F = api.FOOT; return F.on ? F : api.P; }
// where the head of a group is, roughly, for choosing who to draw
function whereLead(pl, tau, o) {
  tau = clamp(tau, 0, pl.T); let bi = 0; while (bi < pl.nb - 1 && tau >= pl.blocks[bi].b) bi++; const B = pl.blocks[bi];
  let L = B.leg, u = 0;
  if (B.k === "bench") { _s1.x = B.gap.x; _s1.z = B.gap.z; return _s1; }
  if (B.k === "leg") u = uAtTau(L, tau - B.a); else if (B.k === "turn") u = L.D; else { L = B.mode === "prep" ? pl.blocks[1].leg : pl.blocks[pl.nb - 2].leg; u = B.mode === "prep" ? 0 : L.D; }
  ppL(L, clamp(u, 0, L.D), _s1); return _s1;
}
const leaderOf = (t, o) => { if (!o.g || o.g === o.p) return o; for (const q of t.st.out) if (q.p === o.g && q.t0 === o.t0) return q; return o; };
function rescan() {
  const V = viewer(), H = api.GS.hour, cand = [], want = api.GFX && api.GFX.low ? SKI.pool.low : SKI.pool.high;
  for (const t of X.list) {
    if (!t.st || !t.st.out.length || !t.bb) continue;
    if (V.x < t.bb[0] - SKI.drop || V.x > t.bb[2] + SKI.drop || V.z < t.bb[1] - SKI.drop || V.z > t.bb[3] + SKI.drop) continue;
    for (const o of t.st.out) {
      if (H < o.t0 || H > o.t1 + 0.1) continue;
      const lead = leaderOf(t, o), pl = planOf(t, lead), tau = (H - o.t0) * HOURS() - (o.dl || 0);
      if (tau > pl.T + 1.2) continue;
      const w = whereLead(pl, tau, o), d = Math.hypot(w.x - V.x, w.z - V.z), key = t.id + "|" + o.t0 + "|" + o.p, cur = SL.find(s => s.vis && s.key === key);
      if (d < (cur ? SKI.drop : SKI.see)) cand.push({ t, o, pl, d, key });
    }
  }
  cand.sort((a, b) => a.d - b.d); const keep = cand.slice(0, want), keys = new Set(keep.map(c => c.key));
  for (const sl of SL) if (sl.vis && !keys.has(sl.key)) hideSlot(sl);
  for (const c of keep) {
    if (SL.some(s => s.vis && s.key === c.key)) continue;
    let sl = SL.find(s => !s.vis); if (!sl && SL.length < want) sl = makeSlot(SL.length); if (!sl) break;
    bindSlot(sl, c.t, c.o, c.pl, c.key);
  }
}
const _lampOn = () => api.dayFactor() < 0.5;
function updSlot(sl, H, dt) {
  const o = sl.o, tau = (H - o.t0) * HOURS() - (o.dl || 0);
  if (tau > sl.pl.T + 1.2) { hideSlot(sl); return; }
  if (dt > 0 && TLX.on("skitrails")) react(sl, dt, sl.P);
  const tau2 = (H - o.t0) * HOURS() - (o.dl || 0);
  poseSlot(sl, Math.max(0, tau2), sl.P);
  if (sl.as && sl.as.Pa && sl.as.ph >= 1) asidePose(sl, sl.P); else if (sl.as && sl.as.ph === 0) { /* slowing: the plan pose, clock easing */ }
  if (sl.stag > 0) staggerPose(sl, sl.P);
  rig(sl, sl.P);
  sl.lamp.visible = _lampOn(); sl.x = sl.P.x; sl.z = sl.P.z; sl.hist++;
  if (dt > 0) { groove(sl); solidBody(sl); }
}
function skiTick(dt) {
  if (!X.ready || !api.started()) return;
  _clk += dt; scanT -= dt;
  const on = isOpen() && !(api.INT && api.INT.on) && !api.tutHidden();
  if (!on) { for (const sl of SL) if (sl.vis) hideSlot(sl); return; }
  if (!UPV) { UPV = new T.Vector3(0, 1, 0); PV = new T.Vector3(); }
  const t0 = performance.now();
  if (scanT <= 0) { scanT = 0.25; rescan(); }
  const H = api.GS.hour; let n = 0;
  for (const sl of SL) if (sl.vis) { updSlot(sl, H, dt); n++; }
  SKS.n = n; SKS.ms = performance.now() - t0;
}
X.skiers = () => SL.filter(s => s.vis).map(s => ({ i: s.i, p: s.o.p, trail: s.t.id, k: s.mk, x: s.P.x, z: s.P.z, u: s.u, v: s.v, gait: GAITS[s.gait] || "", blk: s.blk, bi: s.bi, as: s.as ? s.as.ph : -1, stag: s.stag || 0, tw: s.tw === undefined ? 1 : s.tw, kind: s.pl.kind, tau: (api.GS.hour - s.o.t0) * HOURS() - (s.o.dl || 0), sc: s.sc }));
X.poseAll = H => { if (!UPV) { UPV = new T.Vector3(0, 1, 0); PV = new T.Vector3(); } for (const sl of SL) if (sl.vis) updSlot(sl, H, 0); };
X.pp = (L, u) => { const q = ppL(L, clamp(u, 0, L.D), {}); return q; }; X.uAtTau = uAtTau; X.hide = hideSlot; X.solidBody = solidBody; X.slots = SL; X.planOf = planOf; X.SKI = SKI; X.SKS = SKS; X.rescan = rescan;
X.hourAtU = (t, o, bi, u) => { const pl = planOf(t, leaderOf(t, o)), B = pl.blocks[bi]; return o.t0 + ((B.a + tauAt(B.leg, u)) + (o.dl || 0)) / HOURS(); };
X.hourAtBlock = (t, o, bi, f) => { const pl = planOf(t, leaderOf(t, o)), B = pl.blocks[bi]; return o.t0 + ((B.a + f * (B.b - B.a)) + (o.dl || 0)) / HOURS(); };
X.gaitRuns = (t, o) => { const pl = planOf(t, leaderOf(t, o)), out = []; pl.blocks.forEach((B, bi) => { if (B.k !== "leg") return; const L = B.leg; let s = 0; while (s < L.n) { let e = s; while (e + 1 < L.n && L.gait[e + 1] === L.gait[s]) e++; out.push({ bi, gait: GAITS[L.gait[s]], u0: L.u[s], u1: L.u[e], i0: s, i1: e, wide: 0 }); s = e + 1; } }); return out; };

/* ---- sharing the trail: hearing a sled, stepping aside, a pole raised, a startle and a complaint, a solid body, a word in passing ---- */
const SHARE = { hear: 120, tca: 13, lane: 7, on: 8, side: 2.4, decel: 1.3, stepT: 0.75, close: 4.2, fast: 5.5, slow: 3.8, giveUp: 28, bodyR: 0.6, cmEvery: 10 };
const sideOf = (sl, x, z) => { const o = sl.P, nx = Math.cos(o.yaw), nz = -Math.sin(o.yaw); return (x - o.x) * nx + (z - o.z) * nz >= 0 ? -1 : 1; };   // the side of the skier away from a point
function vehicleNow() {
  if (api.FOOT.on) return null; const P = api.P, sp = Math.hypot(P.vx || 0, P.vz || 0); return { x: P.x, z: P.z, vx: P.vx || 0, vz: P.vz || 0, sp };
}
const kh = (a, w) => api.INP.dev === "touch" ? "tap " + api.btn(a) : api.btn(a) + ": " + w;
function groupOf(sl) { const t = sl.t, o = sl.o, out = [], g = o.g || o.p; for (const q of t.st.out) if (q.t0 === o.t0 && (q.g || q.p) === g) out.push(q); return out; }
const handler = sl => { for (const s of SL) if (s.vis && s !== sl && s.t === sl.t && s.o.t0 === sl.o.t0 && (s.o.g || s.o.p) === (sl.o.g || sl.o.p) && s.mk < sl.mk) return false; return true; };
function addDelay(sl, dt) { if (!handler(sl)) return; for (const q of groupOf(sl)) { q.dl = (q.dl || 0) + dt; q.t1 += dt / HOURS(); } }
// a complaint to the løypelag: counted on the trail (and posted to the news bus); three in a week takes the trail's bonus (option skicomplaints)
function complain(sl, kind) {
  const t = sl.t, st = t.st, H = api.GS.hour; if (!st.cm) st.cm = { wk: 0, tot: 0 };
  if (H - (sl.cmH === undefined ? -99 : sl.cmH) < SHARE.cmEvery / HOURS()) return false; sl.cmH = H;
  const n = kind === "hit" ? 2 : 1, p = sl.who; (X.cmLog || (X.cmLog = [])).push([kind, p.id, +api.GS.hour.toFixed(3), Math.round(Math.hypot(api.P.vx || 0, api.P.vz || 0) * 10) / 10]); if (X.cmLog.length > 30) X.cmLog.shift(); st.cm.wk += n; st.cm.tot += n; sl.stag = 0.0001;
  const say = kind === "hit" ? ["Watch where you are going!", "You ran into me!", "Hey! That is a ski trail, not a road!"] : ["Slow down, this is a ski trail!", "Plenty of room, plenty of time, friend!", "Easy! There are people skiing here."];
  const line = say[Math.floor(hash(p.id + st.cm.tot) * say.length)];
  TLXN.post({ kind: "complaint", who: p, x: sl.P.x, z: sl.P.z, place: t.name, text: `${p.first} complained to the løypelag about a ${kind === "hit" ? "sled that ran into them" : "sled that came past too fast"} on ${t.name}.`, data: { trail: t.id, how: kind, wk: st.cm.wk } });
  api.toast(`${p.first}: “${line}” (${st.cm.wk} complaint${st.cm.wk > 1 ? "s" : ""} on ${t.name} this week${TLX.on("skicomplaints") ? "" : "; counted, not penalised"})`, "warn");
  t.ver++; return true;
}
// per frame, for a skier you can see: what the vehicle is doing near them
function react(sl, dt, P) {
  const v = vehicleNow(), H = api.GS.hour;
  // the clock of a skier who is waiting stands still; the delay is added to the booking so the figure and the bookkeeping stay one journey
  if (sl.tw === undefined) { sl.tw = 1; sl.as = null; }
  let want = 1;
  const d = v ? Math.hypot(v.x - sl.x, v.z - sl.z) : 99;
  if (v && !sl.as && sl.blk === "leg") {
    const rx = sl.x - v.x, rz = sl.z - v.z, sp2 = v.sp * v.sp;
    if (v.sp > 2 && sp2 > 0) { const tca = (rx * v.vx + rz * v.vz) / sp2, mx = rx - v.vx * tca, mz = rz - v.vz * tca, dmin = Math.hypot(mx, mz);
      if (tca > 0 && tca < SHARE.tca && dmin < SHARE.lane && d < clamp(v.sp * 9 + 40, 50, SHARE.hear) && sl.hist > 20 && !sl.noAside) { sl.as = { ph: 0, t: 0, side: sideOf(sl, v.x + v.vx * Math.max(0, tca), v.z + v.vz * Math.max(0, tca)), Pa: null, wait: 0, wave: 0 }; }
    }
  }
  const as = sl.as;
  if (as) {
    as.t += dt;
    if (as.ph === 0) { want = 0; if (sl.tw < 0.02) { as.ph = 1; as.t = 0; as.Pa = copyP(sl.P, newP()); sl.tw = 0; } }       // slowing to a stop
    else if (as.ph === 1) { want = 0; if (as.t >= SHARE.stepT * 6 + 0.2) { as.ph = 2; as.t = 0; } }                         // stepping off the line
    else if (as.ph === 2) {                                                                                                // waiting while it goes by
      want = 0; const rel = v ? (sl.x - v.x) * v.vx + (sl.z - v.z) * v.vz : 1, gone = !v || (rel < 0 && d > 5) || v.sp < 0.4;                                    // it has gone by (it is now behind them), or it stopped
      if (v && v.sp < SHARE.slow && d < 10 && as.wave <= 0 && !as.waved) { as.wave = 1.6; as.waved = 1; }
      if (as.wave > 0) as.wave -= dt;
      if ((gone && as.t > 1.2) || as.t > SHARE.giveUp || (v && v.sp < 0.6 && d > 14 && as.t > 4)) { as.ph = 3; as.t = 0; }
    } else if (as.ph === 3) { want = 0; if (as.t >= SHARE.stepT * 6 + 0.2) { sl.as = null; want = 1; sl.resume = 0; } }
  }
  // the clock: eases to a stop in about SHARE.decel s and back up again
  const rate = want ? 1 / 1.1 : 1 / SHARE.decel; sl.tw += clamp(want - sl.tw, -rate * dt, rate * dt);
  if (sl.tw < 0.999) addDelay(sl, dt * (1 - sl.tw));
  // a fast, close pass is a complaint; running into a skier is the worst
  if (v && v.sp > SHARE.fast && d < SHARE.close && TLX.on("skitrails")) complain(sl, "fast");
  if (sl.stag > 0) { sl.stag += dt; if (sl.stag > 1.6) sl.stag = 0; }
}
// the pose of a skier who has stepped aside: the plan's pose when they stopped, shifted off the line a step at a time
const _as = newP();
function asidePose(sl, P) {
  const as = sl.as, Pa = as.Pa, k = sl.k, nx = Math.cos(Pa.yaw), nz = -Math.sin(Pa.yaw), total = SHARE.side * as.side;
  let a0 = 0, a1 = 0;                                                                                        // each foot's share of the sideways distance, stepped three times
  const prog = (t, off) => { const q = clamp((t - off) / SHARE.stepT, 0, 1); return ease(q); };
  const st = as.ph === 1 ? as.t : as.ph === 3 ? (SHARE.stepT * 6 - as.t) : 99;
  for (let n = 0; n < 3; n++) { a0 += prog(st, n * 2 * SHARE.stepT); a1 += prog(st, n * 2 * SHARE.stepT + SHARE.stepT); }
  a0 = clamp(a0 / 3, 0, 1) * total; a1 = clamp(a1 / 3, 0, 1) * total; if (as.ph === 2) a0 = a1 = total;
  copyP(Pa, P);
  const lift = (t, off) => { const q = clamp((t - off) / SHARE.stepT, 0, 1); return q > 0 && q < 1 ? 0.09 * Math.sin(Math.PI * q) * k : 0; };
  let l0 = 0, l1 = 0; for (let n = 0; n < 3; n++) { l0 = Math.max(l0, lift(st, n * 2 * SHARE.stepT)); l1 = Math.max(l1, lift(st, n * 2 * SHARE.stepT + SHARE.stepT)); }
  const fa = [a0, a1], fl = [l0, l1];
  for (let i = 0; i < 2; i++) { P.f[i].x = Pa.f[i].x + nx * fa[i]; P.f[i].z = Pa.f[i].z + nz * fa[i]; P.f[i].lift = fl[i] + Pa.f[i].lift * Math.max(0, 1 - (as.ph === 1 ? as.t * 3 : 1) ); P.f[i].tip = Pa.f[i].tip * Math.max(0, 1 - as.t * 3); }
  const am = (a0 + a1) / 2; P.x = Pa.x + nx * am; P.z = Pa.z + nz * am; P.yaw = Pa.yaw; P.hip = 0.88; P.pitch = 0.14; P.twist = 0; P.roll = 0; P.head = 0;
  penHands(sl, P, P.x, P.z, P.yaw, 0.3, 0.5);
  if (as.wave > 0) {                                                                                         // a pole lifted to the one who goes by
    const w = Math.sin(Math.PI * clamp(1 - as.wave / 1.6, 0, 1)), sc = sl.sc, h = P.h[1], p = P.p[1], sn = Math.sin(P.yaw), cs = Math.cos(P.yaw);
    h.x = P.x + cs * 0.3 * k + sn * 0.2 * k; h.z = P.z - sn * 0.3 * k + cs * 0.2 * k; h.y = W.surf(P.x, P.z) + (1.0 + 0.55 * w) * sc;
    p.x = h.x + sn * 0.25 + Math.sin(gameClockNow() * 9) * 0.1 * w * cs; p.z = h.z + cs * 0.25 - Math.sin(gameClockNow() * 9) * 0.1 * w * sn; p.y = h.y + 1.1 * (sc / 0.88) * 0.9 - 0.0; P.head = -0.1 * w;
  }
}
// a startle: both poles flung out, the body jerked back and rocking for a second and a half
function staggerPose(sl, P) {
  const s = sl.stag, k = sl.k, w = Math.sin(Math.PI * clamp(s / 1.6, 0, 1)), sc = sl.sc, sn = Math.sin(P.yaw), cs = Math.cos(P.yaw);
  P.pitch -= 0.35 * w; P.roll += 0.22 * Math.sin(s * 11) * w; P.twist += 0.3 * Math.sin(s * 8) * w; P.head -= 0.2 * w;
  for (let j = 0; j < 2; j++) { const sd = sg(j), h = P.h[j]; h.x += cs * sd * 0.35 * w * k; h.z -= sn * sd * 0.35 * w * k; h.y += 0.35 * w * sc; const p = P.p[j]; p.x += cs * sd * 0.5 * w; p.z -= sn * sd * 0.5 * w; p.y += 0.25 * w; }
}
// solid: a sled that reaches a skier stops against them, as against a walker, and it is the worst complaint
function solidBody(sl) {
  const V = api.FOOT.on ? null : api.P, F = api.FOOT;
  if (V && TLX.on("skitrails")) {
    const fx = Math.sin(V.yaw), fz = Math.cos(V.yaw);
    for (const [off, r] of [[1.15, 0.62], [-0.7, 0.7]]) {
      const cx = V.x + fx * off, cz = V.z + fz * off, dx = cx - sl.x, dz = cz - sl.z, d = Math.hypot(dx, dz), rr = r + SHARE.bodyR;
      if (d < rr && d > 1e-4) { const nx = dx / d, nz = dz / d, vn = (V.vx || 0) * nx + (V.vz || 0) * nz; V.x += nx * (rr - d + 0.02); V.z += nz * (rr - d + 0.02); if (vn < 0) { V.vx -= vn * nx * 1.0; V.vz -= vn * nz * 1.0; const sp = Math.hypot(V.vx, V.vz); if (sp > 0) { V.vx *= 0.35; V.vz *= 0.35; } if (-vn > 0.8) complain(sl, "hit"); } sl.hit = 1; }
    }
  } else if (F.on) {
    const dx = F.x - sl.x, dz = F.z - sl.z, d = Math.hypot(dx, dz), rr = 0.35 + SHARE.bodyR; if (d < rr && d > 1e-4) { F.x += dx / d * (rr - d); F.z += dz / d * (rr - d); }
  }
}
/* ---- a word with a skier: the use control on foot beside them, or stopped beside them ---- */
function nearSkier(r) {
  const V = viewer(); let best = null, bd = r;
  for (const sl of SL) { if (!sl.vis || !sl.P) continue; const d = Math.hypot(sl.x - V.x, sl.z - V.z); if (d < bd) { bd = d; best = sl; } }
  return best;
}
const FAMILYSAY = ["{n} is out here somewhere too.", "My {r} {n} is on the trail as well.", "{n} went out before me."];
function hailLine(sl) {
  const t = sl.t, p = sl.who, st = t.st, s = stat(t), H = api.GS.hour, W0 = s.word;
  const hn = (api.GS.hour * 7) | 0;
  const base = TLXN.say(p, "hail", { trail: t.name, word: W0, n: hn, km: (t.len / 1000).toFixed(1) });
  // a family member out on the same trail
  let fam = ""; for (const q of TLXN.family(p)) if (q.id !== p.id && st.out.some(o => o.p === q.id && o.t1 > H)) { fam = FAMILYSAY[hn % FAMILYSAY.length].replace("{n}", q.first).replace("{r}", q.role.replace(/ .*/, "")); break; }
  // something seen, from the news bus
  let sight = ""; const L = TLXN.near(sl.x, sl.z, 6000, H - 40).filter(q => !/^(ski|groom|trail|complaint)$/.test(q.kind) && q.text); if (L.length) sight = "Heard: " + L[L.length - 1].text;
  return (base + (fam ? " " + fam : "") + (sight && hn % 2 ? " " + sight : "")).trim();
}
function hail(sl) {
  const line = hailLine(sl), p = sl.who; api.toast(`${p.first} ${p.last}: “${line}”`, "good"); sl.talk = 3; sl.hails = (sl.hails || 0) + 1; X.lastHail = { p: p.id, line, trail: sl.t.id };
  return true;
}
const HAILX = {
  use() {
    const F = api.FOOT; if (!F.on || api.busy() || (api.INT && api.INT.on) || (api.MNT && api.MNT.on) || (api.DMT && api.DMT.on) || !X.ready) return null;
    const sl = nearSkier(6); if (!sl) return null; const me = sl.who.first;
    return { label: "HAIL", hint: () => kh("use", `hail ${me}`), act: () => hail(sl) };
  }
};
const HAILRIDE = {
  use() {
    if (!X.ready || api.FOOT.on || api.busy() || (api.INT && api.INT.on)) return null; const v = vehicleNow(); if (!v || v.sp > 1.2) return null;
    const sl = nearSkier(7); if (!sl) return null; return { label: "HAIL", act: () => hail(sl) };
  }
};
const hailRideLine = () => { if (!X.ready || api.FOOT.on) return ""; const v = vehicleNow(); if (!v || v.sp > 1.2) return ""; const sl = nearSkier(7); return sl ? kh("use", `hail ${sl.who.first}`) : ""; };
X.hail = hail; X.hailLine = hailLine; X.nearSkier = nearSkier; X.HAILX = HAILX; X.HAILRIDE = HAILRIDE; X.complain = complain; X.SHARE = SHARE; X.react = react;
/* ---- ski tracks: each ski that moves on the snow presses a groove behind it (a gliding ski a line, a planted one a dab; skating's V comes of the skis' own angles) ---- */
function groove(sl) {
  const P = sl.P; if (!sl.pt) sl.pt = [[1e9, 0], [1e9, 0]];
  for (let i = 0; i < 2; i++) {
    const f = P.f[i]; if (!f.ski || f.lift > 0.015) continue;
    const x = f.x, z = f.z, d = Math.hypot(x - sl.pt[i][0], z - sl.pt[i][1]); if (d < 0.32) continue;
    sl.pt[i][0] = x; sl.pt[i][1] = z; const fx = Math.sin(f.yaw), fz = Math.cos(f.yaw);
    W.pressSnow(x - fx * 0.45, z - fz * 0.45, 0.1, 0.42); W.markTrail(x, z, true); SKS.grooves = (SKS.grooves || 0) + 1;
  }
}

/* ---------------- the system ---------------- */
let hooked = false;
TLX.register({
  id: "trails", v: 1,
  state0: () => ({ h: -1, rs: 4242, dd: -1, tr: {} }),
  migrate: st => st,
  init(a) {
    api = a; W = a.world; T = a.THREE; X.ready = false; X.err = "";
    const t0 = performance.now();
    try {
      buildTrails();
      const s = S(); if (!s.tr || typeof s.tr !== "object") s.tr = {};
      for (const t of X.list) { t.st = s.tr[t.id] = adopt(t, s.tr[t.id]); t.ver = 0; t.dirty = false; exposure(t); }
      for (const k of Object.keys(s.tr)) if (!X.list.some(t => t.id === k)) delete s.tr[k];
      if (!Number.isFinite(s.h)) s.h = -1; if (!Number.isFinite(s.rs)) s.rs = 4242; if (!Number.isFinite(s.dd)) s.dd = -1;
      X.ready = true; COV.clear(); hinted = {};
      X.furnErr = ""; try { FU.poles = []; FU.lamps = []; FU.boards = []; FU.gaps = []; FU.meshes = []; FU.n = { poles: 0, lamps: 0, boards: 0, gaps: 0, solid: 0, trees: 0 }; buildFurniture(); } catch (e) { X.furnErr = String(e); console.error("TLX trails furniture", e); }
      if (!hooked) {
        hooked = true;
        a.groomx.push((x, z, yaw, w) => groomHook(x, z, yaw, w));
        for (let k = 0; k < 8; k++) a.jobx.push(() => trailJob(k));
        if (window.TLXR && TLXR.paintX) TLXR.paintX.push(paintMap);
        if (window.TLXR) { const old = TLXR.legend; TLXR.legend = () => (old ? old() : "") + legend(); }
        a.TABLET.addLayer("marks", () => X.ready && TLX.on("skitrails") ? X.list.map(t => ({ x: t.pts[0][0], z: t.pts[0][1], name: (t.name + (isOpen() ? "" : " (closed)")).toUpperCase(), col: t.col, glyph: "S" })) : []);
        a.appx("crew").push(crewCard);
        a.footx.push(HAILX); a.rideUse.push(HAILRIDE); a.ridex.push(hailRideLine);
        a.TABLET.register({ id: "loyper", name: "Løyper", icon: LICON, order: 5.6, live: 6, hidden: () => !X.ready || !TLX.on("skitrails"),
          badge: () => (X.ready && X.list.some(t => t.st.taken && isOpen() && stat(t).bad) ? "!" : ""), render: appRender });
      }
      repaint();
    } catch (e) { X.err = String(e); console.error("TLX trails", e); }
    X.ms = Math.round(performance.now() - t0);
  },
  tick(dt) {
    if (!X.ready || !api.started()) return;
    if (!X.hold) catchUp();
    ridden(dt);
    try { skiTick(dt); } catch (e) { if (!SKS.err) console.error("TLX trails skiers", e); SKS.err = String(e && e.stack || e); }
    if (FU.boards.length && (Math.floor(api.GS.hour) !== FU.h || Math.abs((api.MELT ? api.MELT.k : 0) - FU.melt) > 0.04)) { furnY(); boards(); if (X.list.some(t => t.dirty)) repaint(); for (const t of X.list) t.dirty = false; }
  },
  monday,
  save() {
    const s = S(); if (!s || !s.tr) return;
    const r = (v, d) => Math.round(v * d) / d;
    for (const t of X.list) { const st = t.st; if (!st) continue; for (const g of st.seg) { g[0] = r(g[0], 1000); g[1] = r(g[1], 1000); g[2] = r(g[2], 100); g[3] = r(g[3], 100); g[4] = g[4] < -1e5 ? -1e6 : r(g[4], 100); } }
  }
});
})();
