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
// Regenerate: boot with TLXL.nobake = true set before init (or delete an entry), then TLXL.bakeJSON().
// The router's own answer for this map, kept so a boot does not pay for it (the search takes seconds): each trail as its first point
// then metre deltas. bakedRoute() checks every one against today's ground (on land, off buildings, grade) and falls back to routing it.
// Regenerate: set TLXL.nobake = true before init (or delete an entry), then read TLXL.bakeJSON().
const BAKED = {
  "lys": [-1021,-644,19,17,17,17,18,18,18,18,17,17,18,18,18,18,16,18,8,24,1,25,0,12,-4,-24,-15,-20,-6,15,0,25,0,25,0,25,0,25,0,25,0,25,0,25,-3,25,-15,20,-7,24,-2,25,-13,21,-18,18,-17,17,-18,18,-18,18,-18,17,-19,16,-24,5,-25,1,-25,0,-25,0,-25,0,-25,0,-25,0,-24,-4,-21,-14,-18,-17,-18,-18,-20,-15,-22,-11,-21,-13,-18,-17,-21,-13,-18,-17,10,-22,18,-18,19,-16,24,-5,25,0,25,0,25,0,25,0,25,0,25,-4,20,-14,18,-18,12,-21,2,-25,7,-23,12,-22,-1,-23,-14,-20,-18,-18,-22,-10,-25,-2,-25,0,-25,0,-25,-1,-13,-19,-1,-25,3,-24,13,-22,18,-18,17,-17,13,-21,-8,-21,-17,-18,9,9,18,17,23,8,25,2,25,0,25,0,25,0,25,-1,-2,-23,25,-1,24,0,14,2],
  "meh": [696,-3048,-18,17,-20,15,-22,11,-25,5,-25,-1,-24,-5,-24,-7,-24,-9,-23,-10,-22,-11,-21,-14,-19,-16,-19,-17,-17,-17,-18,-18,-17,-18,-17,-19,-16,-19,-14,-21,-11,-22,-9,-23,-5,-25,-1,-25,1,-25,5,-24,7,-24,11,-23,13,-21,17,-19,18,-16,21,-14,22,-12,23,-11,23,-8,25,-2,22,10,17,19,14,20,17,18,21,14,23,8,25,3,25,-2,24,-6,23,-8,23,-11,23,-10,24,-7,24,3,19,15,9,23,4,24,2,25,2,25,4,25,4,24,3,25,-1,25,-5,25,-10,22,-14,21,-15,20,-16,19,-17,19,-16,19,-16,20,-17,21],
  "ifj": [-2472,3547,23,-10,24,-4,25,-3,25,-1,25,-1,25,1,25,2,24,6,23,11,20,14,18,17,17,19,15,19,13,22,11,23,8,23,5,25,1,25,0,25,-1,25,-2,25,-5,24,-7,24,-12,22,-16,19,-20,15,-22,11,-24,6,-25,0,-24,-7,-19,-16,-12,-22,-7,-24,-3,-25,-2,-24,-2,-25,-4,-25,-6,-24,-10,-23,-14,-20,-19,-17,-21,-12,-23,-11,-23,-10,-20,-15,-13,-20,0,-25,11,-22,18,-17],
  "san": [-996,-771,-18,-18,-18,-17,-20,-14,-25,-1,-25,-1,-24,-6,-19,-17,-17,-17,-18,-18,-18,-18,-17,-17,-18,-18,-18,-18,-14,-19,-6,-25,0,-25,-5,-24,-12,-22,-7,-23,-1,-25,3,-25,10,-21,9,-22,-15,-14,-20,-15,15,-16,18,-17,2,-22,-22,10,-17,-14,18,-16,11,-21,17,-18,18,-18,18,-18,17,-17,18,-18,18,-18,18,-18,17,-17,18,-18,18,-18,17,-17,18,-18,18,-18,17,-17,18,-18,18,-18,17,-18,11,-21,3,-25,8,-23,17,-18,17,-18,17,-18,13,-22,18,-16,25,-1,25,-2,22,-11,22,-11,25,-1,25,0,25,0,25,0,25,0,25,0,25,0,25,1,23,8,18,17,20,16,23,7,25,1,24,4,22,11,18,18,17,17,18,18,18,18,17,17,18,18,19,17,20,-1,19,-16,19,-17,24,-4,25,0,25,0,25,0,25,0,25,2,19,15,18,17,21,14,25,2,25,0,25,0,24,-6,20,-14,25,-5,25,0,24,4,22,12,23,8,25,1,24,-3,22,-11,22,-10,25,-2,23,-9,22,-11,24,-4,25,1,24,7,19,15,18,17,23,10,22,12,22,12,25,1,25,1,24,7,16,5,13,-21,20,-14,25,-3,23,-8,18,-17,3,-25,2,-25,18,-18,24,-6,24,2,22,12,18,18,17,17,18,18,18,18,17,17,18,18,18,18,17,18,14,19,5,25,0,25,5,24,15,20,18,17,21,10,23,-7,14,-19,4,-21,0,25,-18,18,-22,7,-25,0,-20,-10,-18,-18,-18,-18,-17,-17,-21,-12,-22,6,-18,18,-17,17,-22,9,-21,-9,-19,-16,-25,0,-25,0,-25,0,-24,2,-17,17,-18,-6,-20,-13,-23,-5,-17,-17,-18,12,-10,21,-8,6,-18,-18,-17,-17,-22,-7,-25,0,-25,0,-25,0,-25,0,-25,0,-25,0,-25,0,-21,-11,-18,-10,-17,17,-24,4,-19,14,-18,18,-17,17,-18,-16,-8,-22,-10,-21,-17,-13,-18,18,-23,5,-25,0,-25,0,-20,13,-17,17,-18,18,-18,-14,-21,-9,-25,0,-25,0,-21,8,-18,18,-18,18,-17,17,-14,20,-4,23,-18,18,-23,3,-25,0,-25,0,-25,0,-25,0,-19,14,-11,21,10,15,25,0,22,7,18,18,0,25,-17,17,-22,8,-25,0,-21,-10,-19,-15,-25,0,-25,0,-24,3,-17,17,-18,18,-18,18,-18,18,-17,17,-18,18,-16,18,2,25,17,17,23,6,-4,12,-19,13,-24,-5,-17,-17,-18,-18,-18,-18,-17,-17,-25,0,-18,18,-22,7,-25,0,-25,0,-25,0,-21,11,-14,19,0,25,0,25,0,25,0,25,-3,17,-18,-18,-4,-23,0,-25,-14,8,-17,17,-18,18,-18,18,-8,-5,-13,-12,-3,-9,13,-16,-25,0,-25,0,-24,-2,-21,-19,-14,-16,-13,-20,0,-25,-5,-23,-18,-18,-17,-17,-10,2,-8,21,-18,17,-25,1,-18,18,-17,17,-18,18,-18,18,-3,23,0,25,14,19,18,18,18,18,17,17,-6,8,-1,10,18,18,17,17,23,5,25,0,25,0,20,13,18,18,19,19],
  "stj": [-671,-696,0,-25,-18,-18,3,-17,19,-15,24,-3,18,-18,23,-4,19,13,18,18,18,18,24,1,18,-16,0,-18,-16,-19,2,-20,17,17,18,-6,20,-13,25,0,25,0,23,-5,17,-17,18,12,21,10,6,8,-16,17,23,1,-17,17,8,7,-1,11,-9,14,25,0,20,5,-5,20,-25,0,-16,4,17,17,-16,4,9,14,2,11,-9,7,17,17,-23,1,-25,0,16,17,-2,18,-12,15,25,0,20,2,-18,18,-18,18,-12,20,5,12,18,-18,24,-2,-13,16,-9,21,8,5,18,-17,25,0,23,1,-18,18,10,6,-2,11,-8,14,25,0,25,0,25,0,23,4,18,18,23,3,25,0,19,-14,21,-11,8,7,-18,18,25,0,0,25,17,17,-6,8,-1,10,15,19,-3,18,-17,-17,-5,14,-13,-7,-20,-12,-25,0,-11,6,18,18,1,24,-16,-14,-22,-9,-3,11,16,16,0,25,-2,25,-17,17,-6,-11,-12,4,-18,8,-17,-17,-18,12,-21,10,-25,0,-25,0,-25,0,-25,0,-25,0,-22,8,-17,17,0,25,0,25,18,18,7,22,0,25,-11,21,-14,19,0,25,0,25,-3,23,-18,18,-18,18,-5,17,18,18,-16,18,1,17,13,16,-20,2,18,18,-7,17,-18,18,-18,18,-17,17,2,10,25,0,5,8,-16,17,25,-1,18,-18,17,-17,18,-18,18,-18,17,-17,18,-18,18,-18,0,-24,0,-25,17,16,18,18,19,15,18,-3,-17,-17,13,-5,20,13,18,6,17,-17,18,-18,18,0,17,17,18,18,18,18,17,17,18,18,24,3,19,15,17,17,18,18,18,18,22,7,25,0,25,0,0,10,-11,15,25,0,25,0,24,3,18,18,-15,4,7,13,21,12,25,0,22,6,18,18,1,24,-17,19,-21,8,-3,-9,13,-16,-25,0,-25,0,-24,-2,-18,-18,13,13,22,7,25,0,25,0,0,10,-11,15,24,-2,18,-19,4,-23,-13,-19,-21,-12,-25,0,-22,-6,-18,-18,22,-1,-14,-16,-22,-9,-25,0,-25,0,-3,-9,13,-16,-25,0,-25,0,-24,-2,-17,-17,-18,-18,-18,-18,-17,-17,-24,-3,-19,-15,-18,-18,-18,-18,-17,-17,-18,-18,-18,-10,-17,17,-24,4,-25,0,-25,0,9,14,2,11,-23,-7,-17,-17,-18,-18,-8,6,0,25,-10,21,-17,17,-18,18,-18,18,-20,12,-22,5,-18,18,-24,2,-25,0,13,-16,17,-17,18,-18,18,-18,-5,-17,-8,-14,15,-4,-18,-18,10,-12,5,-23,-18,-18,17,-17,18,-18,15,-19,0,-25,0,-25,3,-24,17,-17,5,-24,0,-25,-13,-19,-12,-20,0,-25,6,-23,18,-18,24,-1,25,0,25,0,25,0,25,0,25,0,25,0,25,0,18,-16,9,-22,9,-21,14,-18,-16,-19,10,-4,20,12,13,7,-5,-24,-17,-17,18,-3,25,0,19,15,10,-1,8,-6,17,17,0,-25,-18,-18,8,-7,-1,-11,-14,-19,-5,-20,-17,-3,18,-18,-15,-4,-20,14,-20,11,-25,0,-22,-6,-18,-18,-25,-1,-25,0,-25,0,-25,0,16,-17,-5,-8,-3,-9,13,-16,-25,0,-24,2,-18,18,-5,-13,12,-19,6,-13,-23,5,-18,18,-2,-20,15,-18,18,-18,16,-17,-25,0,-23,-1,18,-18,-5,-17,-9,-14,25,0,16,-4,-18,-18,17,-3,-9,-14,-1,-11,8,-7,-18,-18,24,0,25,0,1,-24,-24,-1,-25,0,16,-17,-6,-8,-1,-10,11,-15,-18,-3,17,-17,-13,-5,-25,0,-25,0,-25,0,-25,0,-25,0,-20,13,-18,6,-17,-17,-2,21,-23,2,-18,16,-18,0,-18,-16,-24,1,-18,18,-23,6,-20,12,-9,17,18,18,3,28],
  "ska": [3329,654,18,-18,7,-22,10,-20,19,-15,25,0,25,0,24,-3,18,-18,23,-4,25,0,19,13,18,18,18,18,1,24,0,25,0,25,0,25,0,25,0,25,0,25,-16,18,-9,22,0,25,0,25,0,25,0,25,-9,21,-18,18,-17,17,-18,-6,-18,-18,-17,-17,-3,18,-15,-11,-2,-2,17,18,-1,23,-17,-17,-18,-18,-18,-18,-17,-17,-18,-18,-18,-18,-17,-17,-18,-18,2,2,17,17,18,18,18,18,17,17,18,18,18,18,17,17,17,16,0,-25,0,-25,-1,-25,-18,-18,-6,-22,-11,-20,-18,-18,-18,-18,-17,-17,-11,-21,0,-25,0,-25,0,-25,-7,-22,-18,-18],
  "fje": [704,-3046,18,17,24,7,25,1,25,0,25,0,25,0,25,0,25,0,25,0,25,0,25,2,22,12,18,18,17,17,18,18,18,18,17,17,18,18,18,18,18,17,19,15,25,5,25,0,24,5,20,14,18,18,17,18,15,20,11,22,12,22,7,23,1,25,0,25,0,25,1,24,12,22,10,22,2,25,0,25,1,25,9,23,17,19,16,19,-7,23,6,22,17,18,22,12,24,4,25,1,23,7,18,17,0,24,-14,21,-7,24,0,25,2,24,13,21,18,18,19,15,25,3,24,5,19,15,18,18,18,18,17,17,18,18,18,18,17,17,18,18,18,18,17,17,18,18,18,18,17,18,14,20,4,25,6,23,15,20,18,18,17,17,18,18,18,18,17,17,18,18,18,18,17,18,11,22,3,24,8,23,17,19,17,17,18,18,18,18,15,19,6,24,0,25,0,25,0,25,4,25,14,19,23,8,25,1,25,0,25,0,25,1,21,12,19,18,17,17,17,19,11,22,11,22,17,18,18,18,18,18,17,18,15,19,8,24,15,19,17,18,13,21,8,23,12,21,5,25,1,25,6,23,15,20,17,18,18,18,21,13,24,5,25,0,24,6,20,15,17,17,18,18,15,20,4,24,0,25,0,25,4,25,15,19,18,18,18,18,17,17,18,18,18,18,17,17,19,17,24,7,24,3,21,13,13,22,9,22,12,22,3,24,0,25,0,25,1,25,7,23,18,17,23,10,20,14,18,18,17,17,18,18,18,18,17,17,18,18,17,18,6,23,-11,21,-17,19,-16,19,-4,24,0,25,3,25,15,19,18,18,18,18,17,17,18,18,18,18,19,16,25,2,25,0,25,0,25,0,25,0,25,0,25,0,25,0,24,3,16,18,-6,24,7,21,17,18,18,18,17,18,5,24,0,25,-14,20,-17,18,-18,18,-17,17,-18,18,-18,18,-17,17,-18,18,-18,18,-17,17,-18,18,-17,18,1,15,24,6,-13,20,-4,25,0,21],
};
let api = null, W = null, T = null;
const X = { list: [], diag: {}, ready: false, ms: 0, hold: false, TR, DEFS, WORDS, COL, WCOL, err: "" };
window.TLXL = X;
const S = () => TLX.state("trails");
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };

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
function lineOk(p) {
  for (let k = 0; k < p.length; k++) {
    const [x, z] = p[k];
    if (k && (bad((x + p[k - 1][0]) / 2, (z + p[k - 1][1]) / 2))) return false;
    if (bad(x, z)) return false;
    for (const o of W.obstaclesNear(x, z, 9)) { if (o.tree !== undefined || o.log) continue; if (o.top === undefined || o.top > 0.3) if (Math.hypot(o.x - x, o.z - z) < (o.r || 0.5) + (o.box ? 5 : 3)) return false; }
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
        if (o.tree !== undefined || o.log || !(o.top === undefined || o.top > 0.3)) continue;
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
  if (!lineOk(line) || g > TR.gradeMax + 0.003) return null;
  if (def.kind !== "fjell" && Math.hypot(line[0][0] - line[line.length - 1][0], line[0][1] - line[line.length - 1][1]) > 0.5) return null;
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
      X.diag[def.id] = how + " " + Math.round(performance.now() - t0) + " ms";
      if (!r) { console.warn("tlx-trails: no route for " + def.id); X.diag[def.id] += " NO ROUTE"; continue; }
      const pts = r.line, c = cum(pts), len = c[c.length - 1], nseg = Math.max(1, Math.ceil(len / TR.seg));
      let farI = 0, fd = 0; for (let i = 0; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]); if (d > fd) { fd = d; farI = i; } }
      const t = Object.assign({}, def, { vil, pts, cum: c, len, nseg, grade: r.g, closed: def.kind !== "fjell", far: def.kind === "tur" ? pts[farI] : null, farI, how, villages: [def.from].concat(def.kind === "fjell" ? [def.to] : []), idx: X.list.length });
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

X.dbg = { bakedRoute, unpack, lineOk, BAKED, astar, cellPath, cellCost, nearestOk, smooth, gradeOf, loopRoute, turRoute, lineRoute, trailheads, cum, ci, cx, build: () => buildTrails() };
/* ---------------- the track: state, words, wear ---------------- */
const rnd = () => { const s = S(); let t = (s.rs = (s.rs + 0x6D2B79F5) >>> 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const segNew = () => [0, 0, 0, 0, -1e6, 0];
const trNew = t => ({ taken: 0, seg: Array.from({ length: t.nseg }, segNew), thaw: 0, day: { v: 0, km: 0, kw: 0 }, noon: "", wk: { v: 0, km: 0, kw: 0, days: 0, low: 0, under: 0 }, tot: { v: 0, km: 0, pay: 0 }, last: [], out: [], lw: "", lp: -99, gp: { n: 0, t: -99 } });
const num = (v, d) => (Number.isFinite(+v) ? +v : d);
// the saved state of each trail made to fit today's trails
function adopt(t, o) {
  const b = trNew(t); if (!o || typeof o !== "object") return b;
  b.taken = o.taken ? 1 : 0;
  if (Array.isArray(o.seg)) b.seg = b.seg.map((g, i) => { const a = o.seg[i]; return Array.isArray(a) ? [clamp(num(a[0], 0), 0, 1), clamp(num(a[1], 0), 0, 1), clamp(num(a[2], 0), 0, 60), clamp(num(a[3], 0), 0, 1), num(a[4], -1e6), a[5] ? 1 : 0] : g; });
  b.thaw = clamp(num(o.thaw, 0), 0, 99);
  for (const k of ["day", "wk", "tot"]) if (o[k] && typeof o[k] === "object") for (const f in b[k]) b[k][f] = num(o[k][f], b[k][f]);
  b.noon = typeof o.noon === "string" ? o.noon : ""; b.lw = typeof o.lw === "string" ? o.lw : ""; b.lp = num(o.lp, -99);
  if (Array.isArray(o.last)) b.last = o.last.filter(q => q && typeof q === "object").slice(0, 3).map(q => ({ d: String(q.d || ""), pay: Math.round(num(q.pay, 0)), km: num(q.km, 0), v: Math.round(num(q.v, 0)), bonus: !!q.bonus, under: Math.round(num(q.under, 0)), days: Math.round(num(q.days, 0)), back: !!q.back }));
  if (Array.isArray(o.out)) b.out = o.out.filter(q => q && typeof q.p === "string" && Number.isFinite(q.t1)).slice(0, 12).map(q => ({ p: q.p, t0: num(q.t0, 0), t1: q.t1, km: num(q.km, 0) }));
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
  let km = t.kind === "loop" ? t.len * (rnd() < 0.3 ? 2 : 1) : t.kind === "tur" ? t.len * (0.6 + 0.4 * rnd()) : t.len * (0.35 + 0.5 * rnd());
  km = Math.min(km, tr.pace * 3500);
  const k = Math.round(km / 100) / 10, st = t.st, s = stat(t, H);
  const party = [p];                                                                     // a family goes out together now and then
  const busy = new Set(); for (const q of X.list) for (const o of q.st.out) if (o.t1 > H) busy.add(o.p);
  for (const q of TLXN.family(p)) if (q.id !== p.id && q.age > 4 && q.age < 80 && (q.interests.includes("ski") || q.age < 16) && !busy.has(q.id) && rnd() < 0.4) party.push(q);
  for (const q of party) {
    const kk = q === p ? k : Math.min(k, Math.round(trait(q).pace * 3.5 * 10) / 10);
    st.out.push({ p: q.id, t0: H, t1: H + kk / trait(q).pace, km: kk });
    st.day.v++; st.day.km += kk; st.day.kw += kk * (we ? TR.weekend : 1); st.tot.v++; st.tot.km += kk;
  }
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
  const days = st.wk.days + 1, bonus = withBonus && st.wk.days >= 6 && !st.wk.low && st.wk.under === 0 && goodish(st.noon || stat(t).word) ? base * TR.bonus : 0;
  return { base, bonus, kw, days };
}
function giveBack(id) {
  const t = X.list.find(q => q.id === id); if (!t || !t.st.taken) return false;
  catchUp(); const st = t.st, p = weekPay(t, false), pay = Math.round(p.base);
  if (pay > 0) { api.GS.cash += pay; st.tot.pay += pay; }
  st.last.unshift({ d: "handed back " + api.CAL.now().label, pay, km: Math.round((st.wk.km + st.day.km) * 10) / 10, v: st.wk.v + st.day.v, bonus: false, under: st.wk.under, days: st.wk.days, back: true }); st.last = st.last.slice(0, 3);
  st.taken = 0; st.seg = st.seg.map(segNew); st.wk = { v: 0, km: 0, kw: 0, days: 0, low: 0, under: 0 }; st.day = { v: 0, km: 0, kw: 0 }; st.out = []; st.lw = ""; st.gp = { n: 0, t: -99 }; st.noon = "";
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
    st.last.unshift({ d, pay, km: Math.round(st.wk.km * 10) / 10, v: st.wk.v, bonus: p.bonus > 0, under: st.wk.under, days: st.wk.days, back: false }); st.last = st.last.slice(0, 3);
    st.wk = { v: 0, km: 0, kw: 0, days: 0, low: 0, under: 0 };
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
const solid = (x, z, r) => { W.addOb({ x, z, r, top: 1e9 }); FU.n.solid++; };
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
      h += U.tabCard({ tf: "ly:use", title: "Use", meta: `On it now: ${out.length ? U.esc(out.join(", ")) : "nobody"}`, note: `Visits today ${st.day.v} · this week ${st.wk.v + st.day.v} (${(st.wk.km + st.day.km).toFixed(1)} skier-km) · paid so far ${cash(st.tot.pay)} · this week so far ${cash(wp.base)}${wp.bonus ? " + bonus" : ""}` });
    }
    if (st.last.length) h += U.sec("Statements", "") + `<div class="tsml2">${st.last.map(q => `<div class="tsm2 tprow"><b>${U.esc(q.d)}</b><span>${q.v} visits · ${q.km.toFixed(1)} skier-km · +${cash(q.pay)}${q.bonus ? " · no day under good: bonus" : ""}${q.under ? ` · ${q.under} day${q.under > 1 ? "s" : ""} snowed under, not paid` : ""}${q.back ? " · handed back" : ""}</span></div>`).join("")}</div>`;
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
