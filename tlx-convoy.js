// Tracklayer — storm closures and convoys (slice 3.5c1 of the Four Seasons & Enterprise expansion, loop/EXPANSION.md).
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
// it as you always could, a pickup still meets the drift. Joining the line as a counted member, the plow truck at its
// head and the Map flag for leaving the line are slice 3.5c2.
//
// Nothing is saved: the state follows from the road snow (which is saved); a reload mid-convoy finds the road open.
// Option "convoy" (Settings > Options, on): off = no gates, traffic turns round at a drift as before.
//
// TLXCV (window, for later slices and scenarios): roads [{ id, name, ends, gates: [{ s, x, z, up }], st: "open" | "shut"
// | "wait" | "run", at, dir, t, runs }], ready, err, stopFor(routeId, s, dir) -> metres to the stop line of a boom that
// is down for a driver there (null = none), barred(routeId, s), barOn(routeId[, lo, hi]) -> the short note or "",
// legend(), info(id), members(id), queue(id, side).
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
  tellR: 80                   // you are told about a lowered boom within this of it, on the road, m
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
  return G.st === "shut" ? "barrier down, convoys once plowed" : G.st === "wait" ? "convoy " + api.fmtTime(G.at)
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
const queued = (G, side, cars) => cars.filter(c => c.gq && c.st === "drive" && (side ? c.dir < 0 && c.s > G.gates[1].s : c.dir > 0 && c.s < G.gates[0].s));
function start(G, dir, back) {
  set(G, "run"); G.dir = dir; G.back = !!back; G.n0 = 0;
  for (const c of queued(G, entry(G), carsOn(G))) { c.cv = G; G.n0++; }
  G.tMax = (G.gates[1].s - G.gates[0].s) / CV.v * 1.6 + 60;
  signs(G);
}
function step(G, dt) {
  const H = api.GS.hour, shut = shutIn(G);
  if (G.st === "open") { if (shut) set(G, "shut"); return; }
  if (G.st === "shut") { if (!shut) { G.at = nextTime(H); set(G, "wait"); } return; }
  const cars = carsOn(G);
  if (G.st === "wait") {
    if (shut) { set(G, "shut"); return; }
    if (G.at - H > CV.every + CV.lead + 0.01) { G.at = nextTime(H); signs(G); }       // the clock was put back
    if (H < G.at) return;
    const q0 = queued(G, 0, cars).length, q1 = queued(G, 1, cars).length;
    if (!q0 && !q1) { G.runs++; set(G, "open"); } else start(G, q1 > q0 ? -1 : 1, false);
    return;
  }
  // run: who is in the line, and is it through
  G.t += dt;
  const A = G.gates[0].s, B = G.gates[1].s, e = entry(G), T = window.TLXT;
  let n = 0;
  if (T) for (const c of T.cars) {
    if (c.cv === G) {
      if (!c.on || c.r !== G.r || c.st !== "drive" || c.dir !== G.dir || (G.dir > 0 ? c.s > B + 15 : c.s < A - 15)) c.cv = null; else n++;
    } else if (!c.cv && c.on && c.r === G.r && c.st === "drive" && c.dir === G.dir && admits(G, e)) {
      // comes up while the boom is still raised: it tags on at the back
      const d = G.dir > 0 ? A - c.s : c.s - B; if (d < 150 && d > -40) { c.cv = G; G.n0++; n++; }
    }
  }
  G.n = n;
  if ((n === 0 && G.t > CV.minRun) || G.t > G.tMax) {
    clearMembers(G); G.runs++;
    const other = queued(G, e ? 0 : 1, cars).length;
    if (shut) set(G, "shut"); else if (other && !G.back) start(G, -G.dir, true); else set(G, "open");
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
C.info = id => { const G = find(id); return !G ? null : { id: G.id, name: G.name, st: G.st, at: G.at, dir: G.dir, t: G.t, runs: G.runs, n: G.n || 0, n0: G.n0 || 0, back: !!G.back, note: note(G), shut: shutIn(G), ends: G.ends,
  gates: G.gates.map(g => ({ s: g.s, x: g.x, z: g.z, up: g.up, admits: admits(G, g.side), vMin: g.vMin, text: g.text, lamp: g.lampOn, vis: !!(g.grp && g.grp.visible), y: g.grp ? g.grp.position.y : null })) }; };
C.members = id => { const G = find(id), T = window.TLXT; return !G || !T ? [] : T.cars.filter(c => c.cv === G).map(c => c.i); };
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
  api.toast(G.st === "shut" ? `The barrier is down: the ${G.name} is closed for the storm. Convoys leave ${CV.every === 1 ? "on the hour" : "at set times"} once the plow has been through.`
    : G.st === "wait" ? `The barrier is down on the ${G.name}. The plow has been through: the next convoy leaves at ${api.fmtTime(G.at)}.`
    : e ? `The barrier lifts: the convoy for ${G.ends[G.dir > 0 ? 1 : 0]} is leaving. Fall in at the back: ${kmh()} km/h, ${CV.gap} metres apart.`
    : `A convoy is on the ${G.name}: the barrier stays down until it is through.`, G.st === "run" && e ? "good" : "warn");
}

function tick(dt) {
  if (!C.ready) return;
  const on = TLX.on("convoy");
  if (on !== C.on) {
    C.on = on;
    if (!on) for (const G of C.roads) { if (G.st !== "open") set(G, "open"); G.told = ""; for (const g of G.gates) { g.up = 1; if (g.grp) g.grp.visible = false; } }
  }
  if (!on || !api.started()) return;
  dt = Math.min(0.1, dt || 0);
  for (const G of C.roads) {
    step(G, dt);
    drawGates(G, dt, G.st === "open" ? [] : carsOn(G));
    if (G.st !== "open" || G.told) tell(G);
  }
}

TLX.option({ id: "convoy", name: "Storm closures and convoys", hint: "A barrier at each end of the Lebesby and Mehamn roads comes down while the road is snowed in. Traffic queues there and leaves as a convoy on the hour once the plow has been. Off = no barriers.", sys: "traffic" });
TLX.register({
  id: "convoy", v: 1,
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
        C.roads.push(G);
      }
      if (R.paintX) R.paintX.push(paint);
      C.on = TLX.on("convoy"); C.ready = true;
    } catch (e) { console.error("TLX convoy", e); C.err = String(e); }
  },
  tick(dt) { try { tick(dt); } catch (e) { if (!C.tickErr) console.error("TLX convoy tick", e); C.tickErr = String(e); } }
});
})();
