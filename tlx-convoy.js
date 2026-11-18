// Tracklayer — storm closures and convoys (slices 3.5c1 and 3.5c2a of the Four Seasons & Enterprise expansion, loop/EXPANSION.md).
//
// The exposed roads over the fell get what the real ones up here have: a barrier (bom) at each end of the open stretch
// and kolonnekjøring. A road marked `convoy` in tlx-roads.js's route table has two gates, found at boot: the first
// straight, clear spot CV.inset m or more in from each end of the road (off the village streets, away from another road's
// junction and from the semitrailer lay-bys). While any stretch BETWEEN the gates is snowed in (3.2: TLXR's shut level),
// both booms are down. Road traffic (3.4, 3.5a) then stops at the boom and queues there instead of driving up to the
// drift and turning round; nothing new turns up between the gates. Once the council plow has opened every stretch
// between them, the booms stay down until the next convoy time (every CV.every game hours on the clock, at least CV.lead
// ahead): then the side with the longer queue goes first. Its boom lifts, the queue leaves in line at CV.v m/s (36 km/h)
// keeping CV.gap m apart, the far boom stays down until the last of them is through, then the far side's queue comes
// back the other way as the return convoy, and after that the road is open. With nobody waiting at either gate the
// road simply opens at the convoy time.
//
// WHAT THE PLAYER GETS. The gate itself (a post, a red and white boom, two red lamps that flash while it is down, a
// board that says CLOSED / CONVOY 14:00 / CONVOY NOW / OPEN), a line of cars and lorries waiting at it in a storm and
// leaving together, a toast when you come up to a lowered boom (why, and when the next convoy leaves), the barrier
// dots and the convoy time in the Map's road legend, and the compass / Jobs warning for a trip through it
// ("Lebesby road: convoy 14:00"). The boom is NOT solid and nobody checks whether you wait: on a sled you ride round
// it as you always could, a pickup still meets the drift. Joining the line as a counted member and the Map flag for
// leaving the line are slice 3.5c2b.
//
// THE PLOW TRUCK (3.5c2a, CV.plow; needs the traffic option). The council's plow truck is the convoy's head and the
// road's own plow between the gates: an orange cab-over with a gritter body, an angled blade and amber beacons, one
// per convoy road (a `plow` entry in TLXT.cars, driven by tlx-traffic.js's road driver, drawn here). The road no
// longer has to be plowed before a convoy is called: once the council plow has set out after the storm (TLXR's own
// rule), the road goes from CLOSED to the next convoy time, and TLXR leaves the snow between the lowered gates alone
// (C.keeps). The truck stands CV.plowIn m inside a gate (put there out of your sight: CV.plowSee) with its beacons
// going. At the convoy time it leads from the side with the longer queue, or from where it stands if it could not be
// moved unseen (the other side then gets the return convoy), at CV.v, or CV.vPlow with the blade in a drift; each
// stretch is cut down as the blade reaches it (TLXR.plowSeg). CV.plowIn m short of the far boom it stops, turns round
// across the road and stands there facing back: the line drives out past it, and it leads the return convoy if anyone
// waits on that side. A convoy time with the road still snowed in and nobody waiting sends it through alone. In a
// real storm (weather CV.storm or worse on the fell) the convoy is put back an hour. With the road open again it
// drives off along the road and is gone once you are CV.plowGone m away. CV.plow = 0: no truck, 3.5c1's rules (the
// barrier stays CLOSED until the road has been plowed).
// UNSEEN, IT KEEPS THE COUNCIL'S PACE. A game hour is 50 s, so a truck driven at 7 m/s would need seven to eleven
// game hours to open a road the council's plow (TLXR: plowV m per game hour) opens in one. So while it leads with no
// car in its line and is more than CV.plowFar m from you, it is moved along at TLXR's plowV by the game clock (a
// clock put forward moves it too), cutting the stretches it passes, never to within plowFar of you, and is posted at
// the far gate without the turn. Within plowFar of you, or with cars behind it, it is driven. A clock put forward by
// CV.skip hours or more in one go (a time skip) moves it that far wherever you are.
//
// Nothing is saved: the state follows from the road snow (which is saved); a reload mid-convoy finds the road open.
// Option "convoy" (Settings > Options, on): off = no gates, traffic turns round at a drift as before.
//
// TLXCV (window, for later slices and scenarios): roads [{ id, name, ends, gates: [{ s, x, z, up }], st: "open" | "shut"
// | "wait" | "run", at, dir, t, runs }], ready, err, stopFor(routeId, s, dir) -> metres to the stop line of a boom that
// is down for a driver there (null = none), barred(routeId, s), barOn(routeId[, lo, hi]) -> the short note or "",
// legend(), info(id) (+ plow: { on, pst, side, s, v, x, z, vis, cut, beacon }), members(id), queue(id, side),
// keeps(routeId, a) -> is the stretch starting a m along left for the plow truck.
(() => {
"use strict";
const CV = {
  inset: 420, scan: 1500,     // a gate stands at least inset m in from the road's end; looked for this much further
  minLen: 800,                // gates closer together than this: not a convoy road
  clearRoad: 45, clearBay: 70,// m from any other road's line / from a semitrailer lay-by
  stop: 7,                    // a driver stands with its middle this far short of the boom, m
  every: 1, lead: 0.2,        // convoy times: every this many game hours on the clock, at least lead hours' notice
  v: 10, gap: 30, close: 1.2, // in line: m/s, m apart centre to centre; one more than 4 m too far back closes up at v x close
  joinT: 30, minRun: 6,       // the entry boom stays up this long (game s); a run lasts at least minRun
  far: 520,                   // gates drawn within this of the camera, m
  boomUp: 1.36, boomRate: 0.9,// raised angle (rad), rad per s
  tellR: 80,                  // you are told about a lowered boom within this of it, on the road, m
  // the plow truck (3.5c2a): on/off; it stands plowIn m inside a gate; m/s with the blade in a drift; it clears the
  // stretch plowAhead m in front of its middle; it is only put somewhere (or taken away) more than plowSee m from you
  // and is gone plowGone m from you once the road is open; no convoy leaves in weather of storm or worse
  // (plowFar: further than this from you, leading nobody, it moves at TLXR's plowV by the clock instead of being driven)
  plow: 1, plowIn: 16, vPlow: 7, plowAhead: 6, plowSee: 320, plowGone: 300, storm: 0.8, plowFar: 900, skip: 0.02
};
let api = null;
const C = window.TLXCV = { roads: [], ready: false, err: null, on: true, CV };

const idx = (r, s) => { const c = r.cum; let lo = 0, hi = c.length - 2; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (c[m] <= s) lo = m; else hi = m - 1; } return lo; };
function pt(r, s) {
  const k = idx(r, s), a = r.pts[k], b = r.pts[k + 1], L = (r.cum[k + 1] - r.cum[k]) || 1, t = Math.max(0, Math.min(1, (s - r.cum[k]) / L));
  return { k, x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, tx: (b[0] - a[0]) / L, tz: (b[1] - a[1]) / L };
}
function otherRoad(r, x, z) {
  let best = Infinity;
  for (const rt of window.TLXR.routes) { if (rt === r.rt || !rt.pts) continue; for (let i = 0; i < rt.pts.length; i += 2) { const d = Math.hypot(rt.pts[i][0] - x, rt.pts[i][1] - z); if (d < best) best = d; } }
  return best;
}
// the first good spot from one end: a stretch driven at vMin or more for 48 m either side, no street, clear of the rest
function findGate(r, sgn) {
  const W = api.world, bays = window.TLXRIG && TLXRIG.bays ? TLXRIG.bays().filter(b => b && Number.isFinite(b.x)) : [];
  for (const vMin of [12.3, 9, 6.5]) {
    for (let u = CV.inset; u <= CV.scan; u += 12) {
      const s = sgn > 0 ? r.s0 + u : r.s1 - u; if (s < r.s0 + 60 || s > r.s1 - 60) break;
      let good = true;
      for (let v = s - 48; v <= s + 48 && good; v += 12) { const j = idx(r, v); if (r.street[j] || r.street[j + 1] || Math.min(r.vP[j], r.vM[j]) < vMin) good = false; }
      if (!good) continue;
      const p = pt(r, s);
      if (W.isWater(p.x, p.z) || W.isSea(p.x, p.z)) continue;
      if (bays.some(b => Math.hypot(b.x - p.x, b.z - p.z) < CV.clearBay)) continue;
      if (otherRoad(r, p.x, p.z) < CV.clearRoad) continue;
      return { s, x: p.x, z: p.z, tx: p.tx, tz: p.tz, up: 1, vMin };
    }
  }
  return null;
}

// ---- the state of a convoy road
const shutIn = G => { const seg = window.TLXR.ROADS.seg, a = G.gates[0].s, b = G.gates[1].s; return G.rt.seg.some(g => g.shut && g.a + seg > a && g.a < b); };
const entry = G => (G.dir > 0 ? 0 : 1);
// may a driver come in past this gate right now?
const admits = (G, side) => G.st === "open" || (G.st === "run" && side === entry(G) && G.t < CV.joinT);
const nextTime = H => Math.ceil((H + CV.lead) / CV.every - 1e-9) * CV.every;
const kmh = () => Math.round(CV.v * 3.6);
function note(G) {
  return G.st === "shut" ? (plowOf(G) ? "barrier down, convoy once the storm eases" : "barrier down, convoys once plowed") : G.st === "wait" ? "convoy " + api.fmtTime(G.at)
    : G.st === "run" ? "convoy on the road to " + G.ends[G.dir > 0 ? 1 : 0] : "";
}
function set(G, st) {
  G.st = st; G.t = 0;
  if (st !== "run") { G.dir = 0; clearMembers(G); }
  signs(G); for (const g of G.gates) g.yT = -1;
  if (window.TLXR.repaint) window.TLXR.repaint();                             // the Map's dots, and the trip cache
}
function clearMembers(G) { const T = window.TLXT; if (T) for (const c of T.cars) if (c.cv === G) c.cv = null; }
function carsOn(G) { const T = window.TLXT; return T && T.ready && TLX.on("traffic") ? T.cars.filter(c => c.on && c.r === G.r) : []; }
const queued = (G, side, cars) => cars.filter(c => c.gq && !c.plow && c.st === "drive" && (side ? c.dir < 0 && c.s > G.gates[1].s : c.dir > 0 && c.s < G.gates[0].s));

// ---- the plow truck (3.5c2a)
const plowOf = G => (CV.plow && G.pl && TLX.on("traffic") && window.TLXT.ready ? G.pl : null);
const youAt = () => { const F = api.FOOT, P = api.P; return F.on ? F : P; };
const postS = (G, side) => G.gates[side].s + (side ? -CV.plowIn : CV.plowIn);
// has the council plow set out since this road went shut (TLXR's rule: the storm has eased for a while)?
const plowIsOut = G => { const rt = G.rt; return (rt.st && rt.st.p >= 0) || (rt.outH != null && rt.outH >= (G.shutH ?? Infinity)); };
const wxOn = G => { const p = pt(G.r, (G.gates[0].s + G.gates[1].s) / 2); return api.WX && api.WX.at ? api.WX.at(p.x, p.z) : 0; };
// stand it inside that gate, facing in. Not where you would see it appear or vanish, unless it must (force).
function post(G, pl, side, force) {
  const T = window.TLXT, y = youAt(), s = postS(G, side), q = pt(G.r, s);
  if (!force && (Math.hypot(q.x - y.x, q.z - y.z) < CV.plowSee || (pl.on && Math.hypot(pl.x - y.x, pl.z - y.z) < CV.plowSee))) return false;
  if (!T.put(pl, G.id, s, side ? -1 : 1)) return false;
  pl.pst = "post"; pl.side = side; pl.cutI = -1; pl.hold = 1;
  return true;
}
function plowFree(pl) { if (pl.pst === "off") return; pl.pst = "free"; pl.cv = null; pl.stopD = null; pl.vcap = 0; pl.cutI = -1; }
function plowStep(G, pl, dt) {
  const T = window.TLXT, R = window.TLXR;
  const H = api.GS.hour, dH = Math.max(0, Math.min(2, H - (pl.hP ?? H))); pl.hP = H;   // game hours since the last tick (a time skip shows here)
  if (!pl.on) { pl.pst = "off"; return; }
  if (pl.pst === "off") { pl.on = false; return; }
  if (pl.r !== G.r) { pl.on = false; pl.pst = "off"; return; }
  if (pl.pst === "lead" && G.st !== "run") plowFree(pl);
  if (G.st === "open" && pl.pst === "post") plowFree(pl);
  if (pl.pst === "post") { pl.hold = 1; pl.v = 0; pl.stopD = null; pl.vcap = 0; return; }
  if (pl.pst === "lead") {
    if (pl.st !== "drive") return;
    const seg = R.ROADS.seg, yo = youAt(), farS = postS(G, pl.dir > 0 ? 1 : 0);
    // unseen and leading nobody: along at the council's pace by the clock, in 40 m steps, never to within plowFar of you
    // (a time skip: wherever you are)
    const skip = dH >= CV.skip;
    if (!(G.n > 0) && (skip || Math.hypot(pl.x - yo.x, pl.z - yo.z) > CV.plowFar)) {
      let left = Math.min(R.ROADS.plowV * dH, (farS - pl.s) * pl.dir), s = pl.s, moved = 0;
      while (left > 0.01) {
        const st = Math.min(40, left), q = pt(G.r, s + pl.dir * st);
        if (!skip && Math.hypot(q.x - yo.x, q.z - yo.z) < CV.plowFar) break;
        s += pl.dir * st; left -= st; moved += st;
        if (R.plowSeg(G.id, s + pl.dir * CV.plowAhead) >= R.ROADS.plowAt) G.cut = (G.cut || 0) + 1;
      }
      if (moved > 0) {
        G.ff = (G.ff || 0) + moved; pl.s = s; pl.v = 0; pl.cutI = -1; pl.vcap = 0;
        if ((farS - s) * pl.dir < 0.5) { const side = pl.dir > 0 ? 1 : 0; if (T.put(pl, G.id, farS, side ? -1 : 1)) { pl.pst = "post"; pl.side = side; pl.hold = 1; } return; }
      }
    }
    const sA = pl.s + pl.dir * CV.plowAhead, i = Math.floor(sA / seg);
    if (R.plowSeg(G.id, sA) >= R.ROADS.plowAt) { pl.cutI = i; G.cut = (G.cut || 0) + 1; }
    pl.vcap = i === pl.cutI || Math.floor(pl.s / seg) === pl.cutI ? CV.vPlow : 0;
    const far = pl.dir > 0 ? 1 : 0, d = (postS(G, far) - pl.s) * pl.dir;       // metres to where it turns
    pl.stopD = d;
    if (d < 0.8 && pl.v < 0.3) { pl.cv = null; pl.stopD = null; pl.vcap = 0; pl.cutI = -1; pl.side = far; pl.pst = "turn"; T.startTurn(pl); }
    return;
  }
  if (pl.pst === "turn") { if (pl.st === "drive") { pl.pst = "post"; pl.hold = 1; pl.v = 0; } return; }
  // free: the road is open, it drives off; gone once you are far enough not to see it go
  const y = youAt(); if (Math.hypot(pl.x - y.x, pl.z - y.z) > CV.plowGone) { pl.on = false; pl.pst = "off"; }
}
function start(G, dir, back) {
  const pl = plowOf(G);
  if (pl && !back) {
    // the side with the longer queue, if the truck stands there or can be moved there unseen; else from where it stands
    const want = dir > 0 ? 0 : 1;
    if (!(pl.pst === "post" && pl.side === want) && !post(G, pl, want, false)) { if (pl.pst === "post") dir = pl.side ? -1 : 1; else post(G, pl, want, true); }
  }
  set(G, "run"); G.dir = dir; G.back = !!back; G.n0 = 0;
  for (const c of queued(G, entry(G), carsOn(G))) { c.cv = G; G.n0++; }
  G.n = G.n0;
  G.led = !!(pl && pl.pst === "post" && pl.side === entry(G));
  if (G.led) { pl.pst = "lead"; pl.cv = G; pl.hold = 0; pl.cutI = -1; }
  G.tMax = (G.gates[1].s - G.gates[0].s) / (G.led ? CV.vPlow : CV.v) * 1.6 + (G.led ? 90 : 60);
  signs(G);
}
function step(G, dt) {
  const H = api.GS.hour, shut = shutIn(G), pl = plowOf(G);
  if (G.pl && !pl && G.pl.on) { G.pl.on = false; G.pl.pst = "off"; }           // no plow truck (CV.plow 0, traffic off)
  if (pl) plowStep(G, pl, dt);
  if (G.st === "open") { if (shut) { G.shutH = H; set(G, "shut"); } return; }
  if (G.st === "shut") { if (!shut || (pl && plowIsOut(G) && wxOn(G) < CV.storm)) { G.at = nextTime(H); set(G, "wait"); } return; }
  const cars = carsOn(G);
  if (G.st === "wait") {
    if (shut && !pl) { G.shutH = H; set(G, "shut"); return; }
    if (G.at - H > CV.every + CV.lead + 0.01) { G.at = nextTime(H); signs(G); }       // the clock was put back
    if (pl && pl.pst !== "post" && pl.pst !== "turn") { const y = youAt(), q = pt(G.r, postS(G, 0)); post(G, pl, Math.hypot(q.x - y.x, q.z - y.z) < CV.plowSee ? 1 : 0, false); }
    if (H < G.at) return;
    if (shut && wxOn(G) >= CV.storm) { G.at = nextTime(H); G.put = (G.put || 0) + 1; signs(G); if (window.TLXR.repaint) window.TLXR.repaint(); return; }   // no convoy in a storm: the next hour
    const q0 = queued(G, 0, cars).length, q1 = queued(G, 1, cars).length;
    if (!q0 && !q1 && !shut) { G.runs++; set(G, "open"); } else start(G, q1 > q0 ? -1 : 1, false);
    return;
  }
  // run: who is in the line, and is it through
  G.t += dt;
  const A = G.gates[0].s, B = G.gates[1].s, e = entry(G), T = window.TLXT;
  let n = 0;
  if (T && !TLX.on("traffic")) clearMembers(G);                               // traffic switched off mid-convoy: nobody is left in it
  else if (T) for (const c of T.cars) {
    if (c.plow) continue;
    if (c.cv === G) {
      if (!c.on || c.r !== G.r || c.st !== "drive" || c.dir !== G.dir || (G.dir > 0 ? c.s > B + 15 : c.s < A - 15)) c.cv = null; else n++;
    } else if (!c.cv && c.on && c.r === G.r && c.st === "drive" && c.dir === G.dir && admits(G, e)) {
      // comes up while the boom is still raised: it tags on at the back
      const d = G.dir > 0 ? A - c.s : c.s - B; if (d < 150 && d > -40) { c.cv = G; G.n0++; n++; }
    }
  }
  G.n = n;
  const busy = !!(pl && G.led && (pl.pst === "lead" || pl.pst === "turn"));    // the truck is still on its way, or turning at the far gate
  if ((n === 0 && !busy && G.t > CV.minRun) || G.t > G.tMax) {
    clearMembers(G); G.runs++;
    if (pl && pl.pst === "lead") plowFree(pl);                                 // held up past the time allowed: the convoy is called off
    const other = queued(G, e ? 0 : 1, cars).length;
    if (shutIn(G)) { if (pl) { G.at = nextTime(H); set(G, "wait"); } else { G.shutH = H; set(G, "shut"); } }
    else if (other && !G.back) start(G, -G.dir, true); else set(G, "open");
  }
}

// ---- what the traffic asks (tlx-traffic.js)
C.stopFor = (id, s, dir) => {
  if (!C.on) return null;
  for (const G of C.roads) {
    if (G.id !== id || G.st === "open") continue;
    const g = dir > 0 ? G.gates[0] : G.gates[1];
    if (admits(G, dir > 0 ? 0 : 1)) return null;
    const d = dir > 0 ? g.s - CV.stop - s : s - (g.s + CV.stop);
    return d < -3 ? null : d;                                               // past the line already (inside, or leaving): no
  }
  return null;
};
C.keeps = (id, a) => {
  if (!C.on || !C.ready) return false;
  const seg = window.TLXR.ROADS.seg;
  return C.roads.some(G => G.id === id && G.st !== "open" && !!plowOf(G) && a + seg > G.gates[0].s && a < G.gates[1].s);
};
C.barred = (id, s) => C.on && C.roads.some(G => G.id === id && G.st !== "open" && s > G.gates[0].s - 120 && s < G.gates[1].s + 120);
// is a barrier down on this road (no s: at all; sa -> sb: for a trip driving that stretch in that direction, which only a
// gate crossed on the way IN stops: from between the gates the way out is free)
C.barOn = (id, sa, sb) => {
  if (!C.on) return "";
  for (const G of C.roads) {
    if (G.id !== id || G.st === "open") continue;
    if (sa === undefined) return note(G);
    const A = G.gates[0].s, B = G.gates[1].s;
    if (sb > sa ? sa < A && sb > A && !admits(G, 0) : sa > B && sb < B && !admits(G, 1)) return note(G);
  }
  return "";
};
C.legend = () => {
  if (!C.on || !C.ready) return "";
  let h = ""; for (const G of C.roads) if (G.st !== "open") h += `<em><i class="trl" style="border-top:3px dotted #d8261c"></i>${G.name}: ${note(G)}</em>`;
  return h;
};
const find = id => C.roads.find(G => G.id === id);
C.info = id => { const G = find(id); return !G ? null : { id: G.id, name: G.name, st: G.st, at: G.at, dir: G.dir, t: G.t, runs: G.runs, n: G.n || 0, n0: G.n0 || 0, back: !!G.back, note: note(G), shut: shutIn(G), ends: G.ends, led: !!G.led, cut: G.cut || 0, put: G.put || 0, ff: Math.round(G.ff || 0),
  plow: G.pl ? { i: G.pl.i, on: !!G.pl.on, pst: G.pl.pst || "off", side: G.pl.side, s: G.pl.s, v: G.pl.v, dir: G.pl.dir, st: G.pl.st, x: G.pl.x, z: G.pl.z, y: G.pl.y, yaw: G.pl.yaw, vcap: G.pl.vcap || 0, why: G.pl.why, vis: !!(G.pm && G.pm.grp.visible), beacon: G.pm ? G.pm.bk : 0, blade: G.pm ? G.pm.blade.position.y : null } : null,
  gates: G.gates.map(g => ({ s: g.s, x: g.x, z: g.z, up: g.up, admits: admits(G, g.side), vMin: g.vMin, text: g.text, lamp: g.lampOn, vis: !!(g.grp && g.grp.visible), y: g.grp ? g.grp.position.y : null })) }; };
C.members = id => { const G = find(id), T = window.TLXT; return !G || !T ? [] : T.cars.filter(c => c.cv === G && !c.plow).map(c => c.i); };   // the cars and lorries in the line (its plow truck: info(id).plow)
C.queue = (id, side) => { const G = find(id); return !G ? [] : queued(G, side, carsOn(G)).map(c => c.i); };

// ---- the gate you see
function stripeTex(TH) {
  const cv = document.createElement("canvas"); cv.width = 256; cv.height = 8; const g = cv.getContext("2d");
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#f1f1ee" : "#c9261d"; g.fillRect(i * 32, 0, 32, 8); }
  return new TH.CanvasTexture(cv);
}
function buildGate(G, g) {
  const TH = api.THREE, std = api.mesh.std, grp = new TH.Group(), out = g.side ? 1 : -1;      // out: local z toward the drivers coming in
  const mesh = (geo, mat, x, y, z, parent) => { const m = new TH.Mesh(geo, mat); m.position.set(x, y, z); (parent || grp).add(m); return m; };
  const steel = std(0x8d9499, 0.6, 0.4), dark = std(0x2a2d30, 0.8, 0.1);
  if (!C.stripe) { C.stripe = stripeTex(TH); C.armMat = new TH.MeshStandardMaterial({ map: C.stripe, roughness: 0.55, metalness: 0.1 }); }
  const X = 4.15;
  mesh(new TH.BoxGeometry(0.42, 1.7, 0.42), steel, X, 0.25, 0);                                // the boom's cabinet (sunk in the snow)
  mesh(new TH.BoxGeometry(0.5, 0.06, 0.5), dark, X, 1.13, 0);
  const piv = new TH.Group(); piv.position.set(X, 0.98, 0); grp.add(piv);
  mesh(new TH.BoxGeometry(7.9, 0.11, 0.07), C.armMat, -3.95 - 0.1, 0, 0.26, piv);              // the arm, across both lanes
  mesh(new TH.BoxGeometry(0.9, 0.2, 0.16), dark, 0.5, 0, 0.26, piv);                           // its counterweight
  mesh(new TH.BoxGeometry(0.12, 0.12, 0.3), dark, 0, 0, 0.12, piv);
  mesh(new TH.BoxGeometry(0.08, 1.0, 0.08), steel, -3.6, 0.4, 0.26);                       // the rest the tip drops onto
  // the two red lamps on the cabinet, facing the drivers coming in
  g.lamps = [0, 1].map(i => { const m = new TH.MeshBasicMaterial({ color: 0x220806 }); mesh(new TH.SphereGeometry(0.085, 10, 8), m, X - 0.13 + i * 0.26, 1.28, out * 0.05); return m; });
  mesh(new TH.BoxGeometry(0.56, 0.24, 0.1), dark, X, 1.28, -out * 0.03);
  // the board on the other side of the road
  const cv = document.createElement("canvas"); cv.width = 256; cv.height = 160;
  g.cv = cv; g.tex = new TH.CanvasTexture(cv);
  const bx = -X - 0.55;
  for (const dx of [-0.6, 0.6]) mesh(new TH.BoxGeometry(0.07, 2.6, 0.07), steel, bx + dx, 0.8, 0);
  mesh(new TH.BoxGeometry(1.66, 1.06, 0.04), dark, bx, 1.75, 0);
  const face = mesh(new TH.PlaneGeometry(1.6, 1.0), new TH.MeshStandardMaterial({ map: g.tex, roughness: 0.7 }), bx, 1.75, out * 0.026);
  face.rotation.y = out > 0 ? 0 : Math.PI;
  grp.rotation.y = Math.atan2(g.tx, g.tz);
  grp.name = "cvgate_" + G.id + "_" + g.side; grp.visible = false; api.scene.add(grp);
  g.grp = grp; g.piv = piv; g.yT = -1;
}
function signs(G) {
  for (const g of G.gates) {
    if (!g.cv) continue;
    const e = G.st === "run" && g.side === entry(G);
    const a = G.st === "open" ? "OPEN" : G.st === "shut" ? "CLOSED" : G.st === "wait" ? api.fmtTime(G.at) : e ? "NOW" : "WAIT";
    const b = G.st === "open" ? "" : G.st === "shut" ? "storm" : G.st === "wait" ? "next convoy" : e ? "convoy leaving" : "convoy coming";
    g.text = a + (b ? " / " + b : "");
    const c = g.cv.getContext("2d"), red = G.st !== "open";
    c.fillStyle = "#f4f3ee"; c.fillRect(0, 0, 256, 160);
    c.strokeStyle = red ? "#c9261d" : "#2c7a3d"; c.lineWidth = 10; c.strokeRect(5, 5, 246, 150);
    c.fillStyle = "#16181a"; c.textAlign = "center"; c.textBaseline = "middle";
    c.font = "bold 22px sans-serif"; c.fillText("KOLONNE · CONVOY", 128, 34);
    c.font = "bold 58px sans-serif"; c.fillStyle = red ? "#c9261d" : "#2c7a3d"; c.fillText(a, 128, 88);
    c.font = "bold 22px sans-serif"; c.fillStyle = "#16181a"; if (b) c.fillText(b, 128, 134);
    g.tex.needsUpdate = true;
  }
}
function drawGates(G, dt, cars) {
  const cam = api.camera.position, W = api.world, now = api.now ? api.now() : 0, night = 1 - (api.dayFactor ? api.dayFactor() : 1);
  for (const g of G.gates) {
    // the boom: up when drivers may come in, and lifted for one leaving from the inside
    const leaving = cars.some(c => c.st === "drive" && (g.side ? c.dir > 0 && c.s > g.s - 40 && c.s < g.s + 14 : c.dir < 0 && c.s < g.s + 40 && c.s > g.s - 14));
    const want = admits(G, g.side) || leaving ? 1 : 0;
    g.up += Math.max(-CV.boomRate * dt / CV.boomUp, Math.min(CV.boomRate * dt / CV.boomUp, want - g.up));
    g.lampOn = want ? -1 : Math.floor(now * 1.6) % 2;
    if (!g.grp) continue;
    const vis = C.on && Math.hypot(g.x - cam.x, g.z - cam.z) < CV.far;
    g.grp.visible = vis; if (!vis) continue;
    if (!(now - g.yT < 3) || g.yT < 0) { g.yT = now; g.grp.position.set(g.x, W.surf(g.x, g.z), g.z); }
    g.piv.rotation.z = -CV.boomUp * g.up;
    g.lamps.forEach((m, i) => { const k = g.lampOn === i ? 0.75 + 1.5 * night : 0.13 - 0.07 * night; m.color.setRGB(k, k * 0.045, k * 0.035); });
  }
}
// ---- the plow truck you see (3.5c2a). Local +z is forward, -x the right-hand side (where the blade throws the snow).
function buildPlow(G) {
  const TH = api.THREE, std = api.mesh.std, grp = new TH.Group(), low = !!(api.GFX && api.GFX.low);
  const mesh = (geo, mat, x, y, z, parent) => { const m = new TH.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = !low; m.receiveShadow = true; (parent || grp).add(m); return m; };
  const B = (w, h, d) => new TH.BoxGeometry(w, h, d);
  const orange = std(0xd9560f, 0.5, 0.25), dark = std(0x1c1e21, 0.85, 0.1), steel = std(0x8a9096, 0.55, 0.5), glass = std(0x1a2129, 0.15, 0.6), grey = std(0x5d646b, 0.7, 0.3), yel = std(0xe8b21c, 0.55, 0.2);
  mesh(B(1.1, 0.34, 6.9), dark, 0, 0.92, -0.15);                               // the frame
  mesh(B(2.42, 1.75, 1.95), orange, 0, 2.02, 2.25);                            // cab-over cab
  mesh(B(2.46, 0.5, 2.0), dark, 0, 0.98, 2.25);                                // its skirt and steps
  mesh(B(2.2, 0.82, 0.06), glass, 0, 2.38, 3.235);                             // windscreen
  for (const sx of [-1, 1]) mesh(B(0.06, 0.62, 1.05), glass, sx * 1.215, 2.42, 2.45);
  mesh(B(2.5, 0.12, 2.05), dark, 0, 2.93, 2.25);                               // roof edge
  mesh(B(2.5, 0.42, 0.26), dark, 0, 0.82, 3.33);                               // bumper
  mesh(B(1.5, 0.5, 0.08), dark, 0, 1.5, 3.24);                                 // grille
  // the gritter body: a hopper, wider at the top, a ladder rail, the spinner under the tail
  mesh(B(2.3, 0.75, 4.3), grey, 0, 1.47, -1.45);
  mesh(B(2.5, 0.7, 4.4), orange, 0, 2.18, -1.45);
  mesh(B(2.56, 0.1, 4.46), dark, 0, 2.57, -1.45);
  mesh(B(1.9, 0.22, 3.8), std(0xd9dde0, 0.9, 0), 0, 2.66, -1.45);              // the salt heaped in it
  mesh(B(0.5, 0.5, 0.5), dark, 0, 0.78, -3.75);
  { const m = mesh(new TH.CylinderGeometry(0.42, 0.42, 0.06, 14), steel, 0, 0.5, -3.78); m.name = "spinner"; }
  mesh(B(2.3, 0.5, 0.06), std(0xf1f1ee, 0.6, 0.1), 0, 1.5, -3.63);             // tail board
  for (const sx of [-1, 1]) mesh(B(0.5, 0.5, 0.07), std(0xc9261d, 0.6, 0.1), sx * 0.85, 1.5, -3.64);
  for (const sx of [-1, 1]) mesh(B(0.62, 0.1, 1.5), dark, sx * 0.98, 1.52, -1.7);              // mudguards over the twin rear tyres
  // the blade: an angled mouldboard on a push frame, carried low while it leads
  const blade = new TH.Group(); blade.position.set(0, 0.34, 4.15); grp.add(blade);
  const mb = new TH.Group(); mb.rotation.y = -0.4; blade.add(mb);
  mesh(B(3.5, 0.5, 0.1), yel, 0, 0.36, -0.03, mb).rotation.x = -0.32;
  mesh(B(3.5, 0.48, 0.1), yel, 0, 0.8, 0.02, mb).rotation.x = 0.12;
  mesh(B(3.5, 0.34, 0.1), yel, 0, 1.14, 0.14, mb).rotation.x = 0.62;
  mesh(B(3.52, 0.12, 0.05), steel, 0, 0.07, -0.1, mb);                         // the cutting edge
  for (const sx of [-1, 1]) mesh(B(0.1, 0.9, 0.34), dark, sx * 1.0, 0.62, -0.2, mb);
  for (const sx of [-1, 1]) { const m = mesh(B(0.12, 0.12, 1.0), dark, sx * 0.55, 0.62, -0.62, blade); m.castShadow = false; }
  for (const sx of [-1, 1]) mesh(B(0.05, 0.75, 0.05), std(0xe8431c, 0.6, 0.1), sx * 1.72, 1.5, 0.05 + sx * 0.7, blade);   // the width markers on the blade's ends
  // lamps: unlit, driven from the light in drawPlow. Work lamps high on the cab (the blade hides the bumper's), tail lamps, beacons
  const head = new TH.MeshBasicMaterial({ color: 0x8c8a80 }), tail = new TH.MeshBasicMaterial({ color: 0x5a0d0a });
  for (const sx of [-1, 1]) { mesh(B(0.3, 0.2, 0.08), head, sx * 0.95, 2.98, 3.2).castShadow = false; mesh(B(0.26, 0.16, 0.06), head, sx * 0.9, 1.22, 3.3).castShadow = false; mesh(B(0.22, 0.14, 0.05), tail, sx * 1.02, 1.12, -3.66).castShadow = false; }
  const beacons = [-1, 1].map(sx => { const m = new TH.MeshBasicMaterial({ color: 0x2a1c05 }); mesh(B(0.14, 0.04, 0.14), dark, sx * 0.8, 3.01, 1.6); mesh(new TH.CylinderGeometry(0.075, 0.085, 0.16, 10), m, sx * 0.8, 3.11, 1.6).castShadow = false; return m; });
  // wheels: steered singles in front, wide twins behind
  const wg = new TH.CylinderGeometry(0.52, 0.52, 1, 18); wg.rotateZ(Math.PI / 2);
  const hg = new TH.CylinderGeometry(0.24, 0.24, 1.04, 10); hg.rotateZ(Math.PI / 2);
  const tyre = std(0x121314, 0.92, 0.02);
  const wheels = [[1.04, 2.2, 0.34, 1], [-1.04, 2.2, 0.34, 1], [0.93, -1.7, 0.64, 0], [-0.93, -1.7, 0.64, 0]].map(([x, z, w, steer]) => {
    const piv = new TH.Group(); piv.position.set(x, 0.52, z); grp.add(piv);
    const spin = new TH.Group(); piv.add(spin);
    const t = mesh(wg, tyre, 0, 0, 0, spin); t.scale.x = w; const h = mesh(hg, steel, 0, 0, 0, spin); h.scale.x = w; h.castShadow = false;
    mesh(B(0.05, 0.3, 0.09), dark, x > 0 ? w / 2 + 0.005 : -w / 2 - 0.005, 0, 0, spin).castShadow = false;   // a lug bar, so the turning shows
    return { piv, spin, steer };
  });
  grp.name = "cvplow_" + G.id; grp.visible = false; grp.rotation.order = "YXZ"; api.scene.add(grp);
  G.pm = { grp, blade, wheels, beacons, head, tail, bk: 0, yawP: null, steer: 0 };
}
function drawPlow(G, dt) {
  const pl = G.pl; if (!pl) return;
  const show = !!(plowOf(G) && pl.on && pl.pst && pl.pst !== "off" && Number.isFinite(pl.y));
  if (!G.pm) { if (!show) return; buildPlow(G); }
  const M = G.pm; M.grp.visible = show; if (!show) return;
  M.grp.position.set(pl.x, pl.y - 0.04, pl.z); M.grp.rotation.set(pl.pitch || 0, pl.yaw, 0);
  const now = api.now ? api.now() : 0, night = 1 - (api.dayFactor ? api.dayFactor() : 1);
  // the blade: down on the road while it leads, carried otherwise
  const want = pl.pst === "lead" ? 0.02 : 0.34; M.blade.position.y += Math.max(-0.5 * dt, Math.min(0.5 * dt, want - M.blade.position.y));
  // wheels roll with the distance driven (tlx-traffic keeps c.roll for a 0.33 m wheel); the front pair steers with the turn
  const roll = (pl.roll || 0) * 0.33 / 0.52;
  let w = M.yawP == null ? 0 : pl.yaw - M.yawP; while (w > Math.PI) w -= 2 * Math.PI; while (w < -Math.PI) w += 2 * Math.PI; M.yawP = pl.yaw;
  const sp = pl.st === "turn" ? 2.5 : pl.v || 0, wantS = dt > 0 && sp > 0.5 ? Math.max(-0.6, Math.min(0.6, Math.atan(3.9 * (w / dt) / sp))) : (pl.st === "turn" ? M.steer : 0);
  M.steer += (wantS - M.steer) * Math.min(1, dt * 4);
  for (const W of M.wheels) { W.spin.rotation.x = roll; if (W.steer) W.piv.rotation.y = M.steer; }
  // beacons: two amber flashes in turn while it is on duty; lamps by the light
  const duty = pl.pst === "post" || pl.pst === "lead" || pl.pst === "turn", ph = Math.floor(now * 3.2) % 2;
  M.beacons.forEach((m, i) => { const k = duty && ph === i ? 0.85 + 1.6 * night : 0.16 - 0.08 * night; m.color.setRGB(k, k * 0.52, k * 0.04); });
  M.bk = duty ? 0.85 + 1.6 * night : 0;
  const hk = 0.55 + 1.6 * night; M.head.color.setRGB(hk, hk * 0.97, hk * 0.86); M.tail.color.setRGB(0.3 + 0.9 * night, 0.03, 0.025);
}
// the Map: a red dot at each lowered boom (tlx-roads.js paints the roads, then calls this)
function paint(g, k, h) {
  if (!C.on) return;
  for (const G of C.roads) if (G.st !== "open") for (const q of G.gates) {
    const px = (q.x + h) * k, pz = (q.z + h) * k;
    g.fillStyle = "#f4f3ee"; g.beginPath(); g.arc(px, pz, 3.4, 0, 6.283); g.fill();
    g.fillStyle = "#d8261c"; g.beginPath(); g.arc(px, pz, 2.4, 0, 6.283); g.fill();
  }
}
// a word when you come up to a lowered boom, once per state of the road
function tell(G) {
  const F = api.FOOT, P = api.P, x = F.on ? F.x : P.x, z = F.on ? F.z : P.z;
  let side = -1, bd = CV.tellR; for (const g of G.gates) { const d = Math.hypot(g.x - x, g.z - z); if (d < bd) { bd = d; side = g.side; } }
  if (G.st === "open") { if (G.told && side >= 0) api.toast(`The barrier is up: the ${G.name} is open.`, "good"); G.told = ""; return; }
  if (side < 0) return;
  const key = G.st + "|" + G.at + "|" + G.dir + "|" + G.runs; if (G.told === key) return;
  G.told = key;
  const e = G.st === "run" && side === entry(G) && admits(G, side);
  const pl = plowOf(G), when = CV.every === 1 ? "on the hour" : "at set times";
  api.toast(G.st === "shut" ? (pl ? `The barrier is down: the ${G.name} is closed for the storm. Once it eases, convoys leave ${when} behind the plow truck.` : `The barrier is down: the ${G.name} is closed for the storm. Convoys leave ${when} once the plow has been through.`)
    : G.st === "wait" ? (pl ? `The barrier is down on the ${G.name}. The next convoy leaves at ${api.fmtTime(G.at)}, behind the plow truck${shutIn(G) ? ": it opens the road as it goes" : ""}.` : `The barrier is down on the ${G.name}. The plow has been through: the next convoy leaves at ${api.fmtTime(G.at)}.`)
    : e ? `The barrier lifts: the convoy for ${G.ends[G.dir > 0 ? 1 : 0]} is leaving${G.led ? " behind the plow truck" : ""}. Fall in at the back: ${kmh()} km/h, ${CV.gap} metres apart.`
    : `A convoy is on the ${G.name}: the barrier stays down until it is through.`, G.st === "run" && e ? "good" : "warn");
}

function tick(dt) {
  if (!C.ready) return;
  const on = TLX.on("convoy");
  if (on !== C.on) {
    C.on = on;
    if (!on) for (const G of C.roads) { if (G.st !== "open") set(G, "open"); G.told = ""; for (const g of G.gates) { g.up = 1; if (g.grp) g.grp.visible = false; } if (G.pl) { G.pl.on = false; G.pl.pst = "off"; } if (G.pm) G.pm.grp.visible = false; }
  }
  if (!on || !api.started()) return;
  dt = Math.min(0.1, dt || 0);
  for (const G of C.roads) {
    step(G, dt);
    drawGates(G, dt, G.st === "open" ? [] : carsOn(G));
    drawPlow(G, dt);
    if (G.st !== "open" || G.told) tell(G);
  }
}

TLX.option({ id: "convoy", name: "Storm closures and convoys", hint: "A barrier at each end of the Lebesby and Mehamn roads comes down while the road is snowed in. Once the storm eases, traffic queued there leaves as a convoy on the hour behind the council's plow truck, which opens the road as it goes. Off = no barriers.", sys: "traffic" });
TLX.register({
  id: "convoy", v: 1,                                                          // nothing saved, so no bump for 3.5c2a
  state0: () => ({}),
  migrate: st => (st && typeof st === "object" ? st : {}),
  init(a) {
    api = a;
    try {
      const R = window.TLXR, T = window.TLXT; if (!R || !R.ready || !T || !R.ROADS) return;
      for (const row of R.ROADS.routes) {
        if (!Array.isArray(row.convoy)) continue;
        const r = T.routes.find(q => q.id === row.id); if (!r) continue;
        const A = findGate(r, 1), B = findGate(r, -1);
        if (!A || !B || B.s - A.s < CV.minLen) continue;
        A.side = 0; B.side = 1;
        const G = { id: row.id, name: r.rt.name, ends: row.convoy, r, rt: r.rt, gates: [A, B], st: "open", at: 0, dir: 0, t: 0, runs: 0, told: "" };
        buildGate(G, A); buildGate(G, B); signs(G);
        G.pl = T.cars.filter(c => c.plow)[C.roads.length] || null; if (G.pl) G.pl.pst = "off";   // its plow truck (3.5c2a)
        C.roads.push(G);
      }
      if (R.paintX) R.paintX.push(paint);
      C.on = TLX.on("convoy"); C.ready = true;
    } catch (e) { console.error("TLX convoy", e); C.err = String(e); }
  },
  tick(dt) { try { tick(dt); } catch (e) { if (!C.tickErr) console.error("TLX convoy tick", e); C.tickErr = String(e); } }
});
})();
