// Tracklayer — the Politi: police patrols, warnings, pursuits and fines (living-world release 1, loop/LOOP.md Owner note
// "Living world"). A GTA-flavoured idea in Tracklayer's own clothes: Finnmark's lensmann cars, blue strobes in the snow, a fine
// you can actually owe, and a fell wide enough to lose them in.
//
// THE CRUISERS. TLXT.extra holds POL.n real traffic cars (tlx-traffic.js, same road driver, same solid circles): white, blue
// stripe, POLITI on the doors, a light bar. They patrol the open roads like any driver. On a call, tlx-traffic hands a cruiser
// to extStep() here: it leaves the road and steers over snow toward you, round water, rocks and houses, slower in powder and on a
// slope, quicker on a road. It can be rammed, boxed in or outrun; one stuck for 5 s gives up. When the call is over it drives
// back to the nearest road and patrols again (or, out of sight, turns up on a road elsewhere, as traffic does). Nothing teleports
// onto you: a dispatched cruiser starts on a road POL.dispatch[0]..[1] m away.
//
// WHAT COUNTS. Driving a land vehicle (sled, pickup, lorry; not boats, not on foot) with the Politi enforcement option on:
//  - speeding: over the limit by more than 10% + 1 m/s. Limits are by place, not by vehicle: 30 km/h inside the town limit,
//    70 km/h on a marked road; the open fell has none, so ordinary snowmobile travel is never an offence;
//  - a close pass at speed (a car or a person within 3.5 m), sliding the machine round in town or on a road, and a collision
//    with traffic (not with a cruiser that rams you).
// Each adds suspicion only while someone SEES it: a cruiser within sight (170 m by day, less at night and in a storm, blocked
// by hills) or, for the serious ones, a civilian driver/rider within 50 m phones it in (a cruiser is dispatched 7-13 s later).
//
// THE LADDER (mode, all in x.sys.police):
//  clear    -> suspicion reaches POL.spot with a cruiser watching -> warn
//  warn     the nearest cruiser comes up behind you with its lights on and the HUD says to stop. Stop (under 1.6 m/s for 1.6 s,
//           a cruiser within 60 m) and you are fined; slow to the limit for 6 s and a minor offence ends with a warning only;
//           keep going over the limit 3 s, or 16 s pass, and it is a pursuit
//  pursuit  heat climbs while they see you (faster the further over the limit you are; out of sight it holds), more cruisers are called at 35 and 65 heat and the cruisers get quicker. Stop with a
//           cruiser close, or boxed in by two, and you are busted: the fine plus a fleeing surcharge. Break sight for 7 s and
//  search   heat falls POL.decay a second while the cruisers drive to where they lost you; seen again (within 120 m) = pursuit
//           again (the same chase: the record counts it once); POL.searchT s
//           unseen = you got away (no fine; they have the plate, a small unpaid-heat warning only)
// Fines come off your cash, never below zero: what you can't pay is OWED, grows 10% on Mondays, makes the Politi quicker to
// notice you (owed over $300 starts you at 20 heat) and is paid from the Politi app. Nothing is taken but money; you keep the machine.
//
// SAVED under x.sys.police: { rec: { fines, warnings, chases, escapes, busts, paid }, owed, mode, heat, lk, searchT, last: [...] }.
// A save mid-chase resumes as a search from where you are. Options: "police" (the whole system; off = no cruisers, no fines).
// Tablet: the Politi app (record, fines owed, pay, the rules). HUD: #polHud (five pips and a line).
//
// TLXP (window, for scenarios): POL, S (state), cops, mode, zone(x,z), seen(), step(dt), put(i, x, z, yaw, task), pay(), fineFor().
(() => {
"use strict";
const POL = {
  n: { low: 1, high: 2 },
  town: 8.33, road: 19.4, tol: 1.1, slack: 1.0,          // m/s: 30 and 70 km/h; the margin over the limit before it counts
  sight: 170, nightK: 0.5, stormK: 0.6, pursuitK: 1.4,   // m; scale at full dark / in a storm; a cruiser already after you sees further
  spot: 8, warnT: 16, stopV: 1.6, stopT: 1.6, legalT: 6, defyT: 3, stopR: 60,
  heatSeen: 2.0, heatOver: 0.5, stage: [35, 65],
  searchT: 24, lostT: 7, decay: 2.2, regain: 120, grace: 25, startOwed: 20, owedLimit: 300,
  vRoad: 22, vOff: 15, vStage: [1, 1.12, 1.28], keep: 14, // m/s caps (a road, snow), per-stage multiplier, the gap a cruiser keeps while it only follows
  dispatch: [380, 900], callDelay: [7, 13], witnessR: 50, closeR: 3.5,
  bust: { near: 9, v: 5, t: 2.2, box: 12 },
  fine: { base: 50, perKmh: 3, crash: 90, close: 55, stunt: 45, flee: 250, max: 900 },
  giveUp: 5, far: 750
};
let api = null, T = null, built = false, tAcc = 0, hudKey = "", siren = null, flashT = 0;
const S = () => TLX.state("police");
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const money = v => api.fmtCash(Math.round(v));
const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const cops = [];
const RT = { inc: null, sus: 0, warnT: 0, stopT: 0, legalT: 0, defy: 0, lostT: 0, bustT: 0, grace: 0, stunt: 0, close: 0, hits: 0, call: null, t: 0, seenNow: false, cd: 0, over: 0 };
const fresh = () => ({ peak: 0, crash: 0, close: 0, stunt: 0, flee: 0 });

// ---- the world as the Politi sees it
function me() { const F = api.FOOT, P = api.P; return F.on ? { x: F.x, z: F.z, y: api.world.surf(F.x, F.z) + 1, foot: true } : { x: P.x, z: P.z, y: P.y + 0.8, foot: false }; }
function driving() { const F = api.FOOT, I = api.INT; return !F.on && !(I && I.on); }
function zone(x, z) {
  const W = api.world, d = Math.hypot(x - W.depot.x, z - W.depot.z);
  if (d < api.townR) return { k: "town", lim: POL.town };
  const R = window.TLXR, n = R && R.ready ? R.near(x, z) : null;
  if (n && n.route && n.d <= R.ROADS.half + 1.5) return { k: "road", lim: POL.road };
  return { k: "open", lim: Infinity };
}
const spdNow = () => { const P = api.P; return Math.hypot(P.vx || 0, P.vz || 0); };
function sightR(c) {
  const G = api.GS, night = 1 - (api.dayFactor ? api.dayFactor() : 1);
  let r = POL.sight * (1 - (1 - POL.nightK) * clamp(night, 0, 1));
  if (G.stormPhase === "storm") r *= POL.stormK;
  return r * (c && c.st === "ext" && (S().mode === "pursuit" || S().mode === "search") ? POL.pursuitK : 1);
}
function los(ax, az, ay, bx, bz, by) {
  const W = api.world;
  for (let i = 1; i < 8; i++) { const t = i / 8; if (W.groundAt(ax + (bx - ax) * t, az + (bz - az) * t) > ay + (by - ay) * t + 0.3) return false; }
  return true;
}
// cruisers that can see you right now
function seen() {
  const I = api.INT; if (I && I.on) return [];
  const m = me(), out = [];
  for (const c of cops) {
    if (!c.on) continue;
    const d = Math.hypot(c.x - m.x, c.z - m.z); if (d > sightR(c)) continue;
    if (los(c.x, c.z, c.y + 1.5, m.x, m.z, m.y)) out.push(c);
  }
  return out;
}
const engaged = () => cops.filter(c => c.on && c.st === "ext");

// ---- the money
const fineFor = inc => {
  const F = POL.fine;
  return Math.round(clamp(F.base + Math.max(0, inc.peak) * 3.6 * F.perKmh + inc.crash * F.crash + inc.close * F.close + inc.stunt * F.stunt + (inc.flee ? F.flee : 0), F.base, F.max));
};
// the fine comes off cash that is there; the rest is owed (cash never goes under zero)
function charge(fine, why) {
  const s = S(), G = api.GS, have = Math.max(0, Math.floor(+G.cash || 0)), paid = Math.min(have, fine);
  G.cash = (+G.cash || 0) - paid; s.owed = Math.round(s.owed + (fine - paid)); s.rec.fines++; s.rec.paid += paid;
  s.last.unshift({ d: api.CAL ? api.CAL.now().label : "", why, fine, paid }); s.last = s.last.slice(0, 5);
  return paid;
}
function pay() {
  const s = S(), G = api.GS;
  if (!(s.owed > 0)) return 0;
  const amt = Math.min(Math.round(s.owed), Math.max(0, Math.floor(+G.cash || 0)));
  if (amt <= 0) { api.toast(`Fines owed: ${money(s.owed)}. You have ${money(G.cash)}.`, "warn"); return 0; }
  G.cash -= amt; s.owed = Math.max(0, Math.round(s.owed - amt)); s.rec.paid += amt;
  api.save(); api.toast(s.owed > 0 ? `Paid ${money(amt)} to the Politi; ${money(s.owed)} still owed.` : `Fines cleared: ${money(amt)} paid.`, "good");
  try { api.TABLET.refresh("politi"); } catch (e) { }
  return amt;
}

// ---- the ladder
function setMode(m) { const s = S(); if (s.mode !== m) { s.mode = m; hudKey = ""; } }
function reset(why) {
  const s = S(); setMode("clear"); s.heat = 0; s.lk = null; s.searchT = 0;
  RT.inc = null; RT.sus = 0; RT.warnT = RT.stopT = RT.legalT = RT.defy = RT.lostT = RT.bustT = 0; RT.call = null;
  for (const c of cops) if (c.on && c.st === "ext") c.task = "return";
  if (why) hudKey = "";
}
function engage(c, task) { c.dispatched = false; c.st = "ext"; c.task = task; c.pass = null; c.stuck = 0; c.hold = 0; c.rt = 0; c.pickT = 0; }
function toWarn(c) {
  const s = S(); setMode("warn"); RT.warnT = 0; RT.stopT = 0; RT.legalT = 0; RT.defy = 0; s.lk = { x: me().x, z: me().z };
  engage(c, "tail"); api.toast("Politi: blue lights behind you. Slow down and stop.", "warn");
}
function toPursuit(fled) {
  // seen again in a search is the same chase carrying on: the record counts a chase once, from the order to stop to its end
  const s = S(); if (s.mode === "search") api.toast("They've seen you again.", "warn"); else if (s.mode !== "pursuit") { s.rec.chases++; api.toast("They're after you. Break line of sight, or stop and give yourself up.", "warn"); }
  setMode("pursuit"); s.heat = Math.max(s.heat, fled ? 40 : 25); RT.lostT = 0; RT.bustT = 0; RT.warnT = 0;
  if (fled && RT.inc) RT.inc.flee = 1;
  for (const c of engaged()) c.task = "chase";
}
function toSearch() {
  const s = S(); setMode("search"); s.searchT = 0; RT.lostT = 0;
  api.toast("They've lost you. Keep your head down.", "good");
  for (const c of engaged()) c.task = "go";
}
function finish(kind) {
  const s = S(), inc = RT.inc || fresh();
  const surrender = kind === "surrender";
  if (kind === "warning") { s.rec.warnings++; s.last.unshift({ d: api.CAL ? api.CAL.now().label : "", why: "Warning", fine: 0, paid: 0 }); s.last = s.last.slice(0, 5); api.toast("Politi: just a warning this time. Mind the limit.", "good"); }
  else {
    if (kind === "busted" || surrender) { inc.flee = inc.flee || (kind === "busted" ? 1 : 0); s.rec.busts++; }
    const fine = fineFor(inc), paid = charge(fine, kind === "ticket" ? "Fine at the roadside" : surrender ? "Gave yourself up" : "Arrested after a chase"), left = fine - paid;
    api.toast(`${kind === "ticket" ? "Fined" : surrender ? "You gave yourself up. Fined" : "Busted. Fined"} ${money(fine)}.${left ? ` You couldn't cover it: ${money(left)} is owed.` : ""}`, left ? "warn" : "good");
  }
  reset(); RT.grace = POL.grace; api.save(); try { api.TABLET.refresh("politi"); } catch (e) { }
}
// a civilian saw it (or the Politi did not, but a call comes in)
function callIn(m) {
  if (RT.call || S().mode !== "clear") return;
  RT.call = { t: POL.callDelay[0] + Math.random() * (POL.callDelay[1] - POL.callDelay[0]), x: m.x, z: m.z };
}
function dispatchCar(tx, tz, task) {
  const free = cops.filter(c => c.st !== "ext" || !c.on).sort((a, b) => (b.on ? 0 : 1) - (a.on ? 0 : 1));
  const c = free.find(q => !q.on) || free[0]; if (!c) return null;
  const m = me(), rs = T.routes; if (!rs.length) return null;
  const tot = rs.reduce((a, r) => a + r.len, 0), seg = window.TLXR.ROADS.seg;
  for (let k = 0; k < 80; k++) {
    let u = Math.random() * tot, r = rs[0]; for (const q of rs) { if (u < q.len) { r = q; break; } u -= q.len; }
    const s = r.s0 + 30 + Math.random() * Math.max(1, r.len - 60), p = T.k.at(r, s, 0), d = Math.hypot(p.x - m.x, p.z - m.z);
    if (d < POL.dispatch[0] || d > POL.dispatch[1] || r.street[p.k]) continue;
    if (r.rt.seg.some(g => g.shut && s > g.a - 60 && s < g.a + seg + 60)) continue;
    if (window.TLXCV && TLXCV.barred && TLXCV.barred(r.id, s)) continue;
    if (T.cars.some(o => o.on && Math.hypot(o.x - p.x, o.z - p.z) < 60)) continue;
    Object.assign(c, { on: true, r, s, k: p.k, dir: Math.random() < 0.5 ? 1 : -1, v: 0, st: "drive", t: 0, blocked: 0, hold: 0, why: "", laneT: T.TRAF.lane, pass: null, lv: 0, waiting: false, gq: false, cv: null });
    c.lane = T.TRAF.lane; T.k.setPose(c, 0); c.v = 4; T.k.ground(c);
    engage(c, task); c.dispatched = true; return c;
  }
  return null;
}

function watch(dt) {
  const s = S(), m = me(), P = api.P, zn = zone(m.x, m.z), v = driving() ? spdNow() : 0;
  RT.t += dt; RT.grace = Math.max(0, RT.grace - dt);
  // ---- what you are doing wrong this moment
  let pts = 0, serious = false;
  const inc = fresh();                                                   // this tick's offences; kept (RT.inc) only if someone saw them
  if (driving() && zn.k !== "open") {
    const over = v - zn.lim * POL.tol - POL.slack; RT.over = over;
    if (over > 0) { pts += (4 + over * 1.2) * dt; inc.peak = Math.max(inc.peak, over); }
    if (Math.abs(P.yr || 0) > 1.1 && v > 7) { RT.stunt += dt; if (RT.stunt > 1.4) { RT.stunt = -3; pts += 18; inc.stunt++; serious = true; } } else RT.stunt = RT.stunt < 0 ? Math.min(0, RT.stunt + dt) : 0;
  } else RT.over = -1;
  RT.close = Math.max(0, RT.close - dt);
  if (driving() && v > 11 && RT.close <= 0) {
    for (const o of T.cars) { if (!o.on || o.st === "turn" || o.v < 2) continue; if (Math.hypot(o.x - P.x, o.z - P.z) < POL.closeR) { RT.close = 4; pts += 22; inc.close++; serious = true; break; } }
  }
  if (driving() && v > 9 && RT.close <= 0 && api.people) {
    for (const q of api.people()) { if (q.who === "dog") continue; if (Math.hypot(q.x - P.x, q.z - P.z) < POL.closeR + 0.6) { RT.close = 4; pts += 30; inc.close++; serious = true; break; } }
  }
  const copNear = cops.some(c => c.on && Math.hypot(c.x - P.x, c.z - P.z) < 8);
  if (T.hits > RT.hits) { if (!copNear && driving()) { pts += 45; inc.crash++; serious = true; } RT.hits = T.hits; }
  // ---- who saw it
  const eyes = seen(); RT.seenNow = eyes.length > 0;
  if (s.mode !== "clear" || eyes.length) { const k = RT.inc || (RT.inc = fresh()); k.peak = Math.max(k.peak, inc.peak); k.crash += inc.crash; k.close += inc.close; k.stunt += inc.stunt; }
  if (s.mode === "clear") {
    if (RT.grace > 0) { RT.sus = 0; }
    else if (pts > 0) {
      if (eyes.length) { RT.sus += pts; if (RT.sus >= POL.spot) { const c = eyes.sort((a, b) => Math.hypot(a.x - m.x, a.z - m.z) - Math.hypot(b.x - m.x, b.z - m.z))[0]; RT.sus = 0; toWarn(c); if (s.owed >= POL.owedLimit) { s.heat = Math.max(s.heat, POL.startOwed); } } }
      else if (serious) {
        const wit = T.cars.some(o => o.on && Math.hypot(o.x - m.x, o.z - m.z) < POL.witnessR) || (api.people && api.people().some(q => q.who !== "dog" && Math.hypot(q.x - m.x, q.z - m.z) < POL.witnessR));
        if (wit) { const k = RT.inc || (RT.inc = fresh()); k.peak = Math.max(k.peak, inc.peak); k.crash += inc.crash; k.close += inc.close; k.stunt += inc.stunt; callIn(m); }
      }
    } else RT.sus = Math.max(0, RT.sus - dt * 2);
    if (RT.call) { RT.call.t -= dt; if (RT.call.t <= 0) { const k = RT.call; RT.call = null; if (RT.grace <= 0 && !engaged().length) { const c = dispatchCar(k.x, k.z, "go"); if (c) { setMode("search"); s.heat = Math.max(s.heat, 20); s.searchT = -25; s.lk = { x: k.x, z: k.z }; api.toast("Politi: a call has gone out about reckless driving near here.", "warn"); } } } }
    return;
  }
  // ---- anything beyond clear
  if (eyes.length) s.lk = { x: m.x, z: m.z };
  const stopped = v < POL.stopV && (engaged().some(c => Math.hypot(c.x - m.x, c.z - m.z) < POL.stopR));
  if (s.mode === "warn") {
    RT.warnT += dt;
    if (stopped) { RT.stopT += dt; if (RT.stopT >= POL.stopT) { finish("ticket"); return; } } else RT.stopT = Math.max(0, RT.stopT - dt);
    const legal = driving() && zn.lim !== Infinity ? v <= zn.lim * POL.tol + POL.slack : true;
    if (!stopped && legal) RT.legalT += dt; else RT.legalT = 0;
    const minor = inc.peak < 9 && !inc.crash && !inc.stunt && !inc.close;
    if (RT.legalT >= POL.legalT && minor) { finish("warning"); return; }
    if (!legal && !stopped) RT.defy += dt; else RT.defy = Math.max(0, RT.defy - dt);
    if (RT.defy >= POL.defyT || RT.warnT >= POL.warnT) { toPursuit(true); return; }
    if (!eyes.length) { RT.lostT += dt; if (RT.lostT > POL.lostT) toPursuit(true); } else RT.lostT = 0;
    return;
  }
  if (s.mode === "pursuit") {
    /* heat is what they SEE: out of sight it holds (speed alone used to add up to 9 a second unseen, with the HUD saying "out of sight") */
    s.heat = clamp(s.heat + (eyes.length ? (POL.heatSeen + Math.max(0, RT.over) * POL.heatOver) * dt : 0), 0, 100);
    // more cruisers at each stage
    const want = s.heat >= POL.stage[1] ? 3 : s.heat >= POL.stage[0] ? 2 : 1, have = engaged().length;
    if (have < Math.min(want, cops.length)) { RT.cd -= dt; if (RT.cd <= 0) { RT.cd = 6; const c = dispatchCar(m.x, m.z, "chase"); if (c) api.toast("Politi: another car joins the chase.", "warn"); } }
    // busted: stopped with one close, or boxed in by two
    const near = engaged().filter(c => Math.hypot(c.x - m.x, c.z - m.z) < POL.bust.near), box = engaged().filter(c => Math.hypot(c.x - m.x, c.z - m.z) < POL.bust.box);
    const giveUp = v < POL.stopV && engaged().some(c => Math.hypot(c.x - m.x, c.z - m.z) < POL.stopR);
    if ((near.length && v < POL.bust.v) || (box.length >= 2 && v < 8) || giveUp) { RT.bustT += dt; if (RT.bustT >= (giveUp && !near.length ? POL.stopT : POL.bust.t)) { finish(giveUp && !near.length ? "surrender" : "busted"); return; } } else RT.bustT = Math.max(0, RT.bustT - dt);
    if (!eyes.length) { RT.lostT += dt; if (RT.lostT >= POL.lostT) toSearch(); } else RT.lostT = 0;
    return;
  }
  if (s.mode === "search") {
    s.heat = Math.max(0, s.heat - POL.decay * dt); s.searchT += dt;
    const close = eyes.some(c => Math.hypot(c.x - m.x, c.z - m.z) < POL.regain);
    if (close) { toPursuit(false); return; }
    if (stopped) { RT.stopT += dt; if (RT.stopT >= POL.stopT) { finish("surrender"); return; } } else RT.stopT = 0;
    if (s.searchT >= POL.searchT) { s.rec.escapes++; api.toast("You got away. Lie low for a while.", "good"); reset(); RT.grace = POL.grace; api.save(); try { api.TABLET.refresh("politi"); } catch (e) { } }
  }
}

// ---- driving a cruiser on a call
const AHEAD = [0, 0.35, -0.35, 0.75, -0.75, 1.2, -1.2, 1.7, -1.7];
function blocked(x, z) { const W = api.world; return W.isSea(x, z) || W.isWater(x, z) || W.obNear(x, z, 2.3) || W.slopeAt(x, z, 3) > 0.62; }
function extStep(c, dt, B, you) {
  const W = api.world, s = S(), mode = s.mode, m = me();
  if (!c.task) c.task = "chase";
  if (c.hold > 0) { c.hold -= dt; c.v = Math.max(0, c.v - 12 * dt); c.x += Math.sin(c.yaw) * c.v * dt; c.z += Math.cos(c.yaw) * c.v * dt; return; }
  let tx, tz, keep = 0, stage = mode === "pursuit" ? (s.heat >= POL.stage[1] ? 2 : s.heat >= POL.stage[0] ? 1 : 0) : 0;
  if (c.task === "chase" || c.task === "tail") { tx = m.x; tz = m.z; keep = c.task === "tail" ? POL.keep : 3; }
  else if (c.task === "go") { const k = s.lk || m; tx = k.x; tz = k.z; keep = 8; }
  else {                                                                   // "return": the nearest road, then patrol
    c.pickT -= dt;
    if (c.pickT <= 0 || !c.rtg) {
      c.pickT = 2; c.rtg = null; const n = T.k.near(c.x, c.z), r = n.route && T.routes.find(q => q.rt === n.route);
      if (r) { const sx = clamp(n.s, r.s0 + 10, r.s1 - 10), p = T.k.at(r, sx, 0); c.rtg = { x: p.x, z: p.z, r, s: sx }; }
    }
    const far = Math.hypot(c.x - m.x, c.z - m.z), vis = far < sightR(c) * 1.2 && los(c.x, c.z, c.y + 1.5, m.x, m.z, m.y);
    if (!c.rtg || far > POL.far || (!vis && c.rt > 14)) { T.k.spawn(c, false); return; }
    if (c.rtg) { tx = c.rtg.x; tz = c.rtg.z; keep = 0; if (Math.hypot(c.x - tx, c.z - tz) < 5) { rejoin(c); return; } }
    c.rt += dt;
  }
  const dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz), want = Math.atan2(dx, dz);
  // the terrain under it and ahead: a road is fast, snow slow, deep snow slower
  const onRoad = T.k.near(c.x, c.z).d < window.TLXR.ROADS.half + 2, depth = Math.max(0, W.surf(c.x, c.z) - W.groundAt(c.x, c.z));
  let cap = (onRoad ? POL.vRoad : POL.vOff * clamp(1 - depth * 0.55, 0.45, 1)) * POL.vStage[stage];
  cap *= clamp(1 - W.slopeAt(c.x, c.z, 4) * 0.9, 0.5, 1);
  // pick a heading that is clear: the wanted one, else the nearest to it that is
  const look = Math.max(7, c.v * 0.8); let hd = null;
  for (const o of AHEAD) { const h = want + o, fx = Math.sin(h), fz = Math.cos(h); if (!blocked(c.x + fx * look, c.z + fz * look) && !blocked(c.x + fx * look * 0.5, c.z + fz * look * 0.5)) { hd = h; break; } }
  const rate = clamp(2.2 - c.v * 0.07, 0.7, 2.2);
  if (hd === null) { c.v = Math.max(0, c.v - 10 * dt); c.stuck += dt; }
  else { c.yaw += clamp(wrap(hd - c.yaw), -rate * dt, rate * dt); }
  // speed: close up to the one it's after; a follower holds its distance
  const da = hd === null ? 1.5 : Math.abs(wrap(hd - c.yaw));
  let vt = cap * (1 - 0.55 * Math.min(1, da));
  if (keep > 0 || c.task === "go") vt = Math.min(vt, Math.max(0, (d - keep) * 0.9) + (c.task === "tail" || c.task === "chase" ? (driving() ? spdNow() : 0) * 0.95 : 0));
  if (c.task === "return") vt = Math.min(vt, Math.max(2, d * 0.6), 12);
  const acc = onRoad ? 5.5 : 3.6;
  c.v += clamp(vt - c.v, -9 * dt, acc * dt); if (c.v < 0) c.v = 0;
  c.x += Math.sin(c.yaw) * c.v * dt; c.z += Math.cos(c.yaw) * c.v * dt;
  // stuck (wedged on something, or bogged): five seconds of wanting to move and not moving, and it gives the job up
  if (vt > 3 && c.v < 0.8) c.stuck += dt; else c.stuck = Math.max(0, c.stuck - dt * 2);
  if (c.stuck > POL.giveUp && c.task !== "return") { c.task = "return"; c.stuck = 0; c.rtg = null; c.rt = 0; }
}
function rejoin(c) {
  const R = window.TLXR, n = T.k.near(c.x, c.z); if (!n.route || n.d > 60) { T.k.spawn(c, false); return; }
  const r = T.routes.find(q => q.rt === n.route); if (!r) { T.k.spawn(c, false); return; }
  const s = clamp(n.s, r.s0 + 10, r.s1 - 10), p = T.k.at(r, s, 0), fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), dir = p.tx * fx + p.tz * fz >= 0 ? 1 : -1;
  Object.assign(c, { r, s, k: 0, dir, st: "drive", t: 0, blocked: 0, hold: 0, why: "", laneT: T.TRAF.lane, pass: null, lv: 0, waiting: false, gq: false, cv: null, task: null, dispatched: false });
  c.lane = T.TRAF.lane; c.v = Math.min(c.v, 8); T.k.setPose(c, 0);
}

// ---- the cars: meshes, lights, siren
function build() {
  const TT = api.THREE, G = window.TLXC && window.TLXC.geo; if (!G || !T || !T.ready) return false;
  const std = api.mesh.std; G.paint.computeBoundingBox(); const bb = G.paint.boundingBox, top = bb.max.y, hw = bb.max.x, hl = bb.max.z;
  const grp = new TT.Group(); grp.name = "police"; api.scene.add(grp); built = { grp, top, hw };
  const cv = document.createElement("canvas"); cv.width = 256; cv.height = 64; const g2 = cv.getContext("2d");
  g2.fillStyle = "#0b3a8a"; g2.fillRect(0, 0, 256, 64); g2.fillStyle = "#e9f0ff"; g2.font = "700 40px 'Barlow Semi Condensed', Arial, sans-serif"; g2.textAlign = "center"; g2.textBaseline = "middle"; g2.fillText("POLITI", 128, 34);
  const tex = new TT.CanvasTexture(cv); tex.encoding = TT.sRGBEncoding;
  const gl = document.createElement("canvas"); gl.width = gl.height = 64; const g3 = gl.getContext("2d"), rg = g3.createRadialGradient(32, 32, 0, 32, 32, 32);
  rg.addColorStop(0, "rgba(120,170,255,1)"); rg.addColorStop(0.35, "rgba(70,120,255,0.45)"); rg.addColorStop(1, "rgba(40,80,255,0)"); g3.fillStyle = rg; g3.fillRect(0, 0, 64, 64);
  const glow = new TT.CanvasTexture(gl);
  for (const c of cops) {
    const o = new TT.Group(); o.visible = false; grp.add(o);
    const add = (geo, mat) => { const q = new TT.Mesh(geo, mat); q.castShadow = false; q.receiveShadow = true; o.add(q); return q; };
    add(G.paint, std(0xf1f3f5, 0.4, 0.25)); add(G.glass, std(0x1a2129, 0.15, 0.6)); add(G.trim || G.dark, std(0x16181b, 0.85, 0.05)); add(G.lamps, new TT.MeshBasicMaterial({ vertexColors: true }));
    c.wh = []; for (const w of T.TRAF.wheels) { const q = add(G.wheel, std(0xffffff, 0.8, 0.1)); q.material = new TT.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.1 }); q.position.set(w[0], T.TRAF.wheelR, w[1]); c.wh.push(q); }
    const blue = std(0x0b3a8a, 0.6, 0.05), by = top * 0.34;                 // a blue band down each side, POLITI on the doors
    for (const sd of [-1, 1]) {
      const band = new TT.Mesh(new TT.BoxGeometry(0.03, 0.17, hl * 1.55), blue); band.position.set(sd * (hw + 0.005), by, 0); o.add(band);
      const lab = new TT.Mesh(new TT.PlaneGeometry(1.0, 0.25), new TT.MeshBasicMaterial({ map: tex })); lab.position.set(sd * (hw + 0.025), by + 0.22, 0.1); lab.rotation.y = sd * Math.PI / 2; o.add(lab);
    }
    c.lb = [];                                                                // the light bar: two blue lamps and a white strobe between
    const bar = new TT.Mesh(new TT.BoxGeometry(hw * 1.3, 0.08, 0.26), std(0x16181b, 0.6, 0.2)); bar.position.set(0, top + 0.06, -0.15); o.add(bar);
    for (const sx of [-1, 0, 1]) {
      const mat = new TT.MeshBasicMaterial({ color: sx ? 0x1a4cff : 0xffffff }); const lamp = new TT.Mesh(new TT.BoxGeometry(sx ? hw * 0.5 : 0.18, 0.1, 0.24), mat);
      lamp.position.set(sx * hw * 0.45, top + 0.13, -0.15); o.add(lamp); c.lb.push(mat);
    }
    c.gs = []; for (const sx of [-1, 1]) { const sp = new TT.Sprite(new TT.SpriteMaterial({ map: glow, transparent: true, depthWrite: false, blending: TT.AdditiveBlending, fog: false })); sp.scale.set(3.4, 3.4, 1); sp.position.set(sx * hw * 0.45, top + 0.3, -0.15); sp.renderOrder = 4; o.add(sp); c.gs.push(sp); }
    c.mesh = o;
  }
  return true;
}
function visual(dt) {
  if (!built || built === true) return; flashT += dt;
  const night = 1 - (api.dayFactor ? api.dayFactor() : 1);
  for (const c of cops) {
    const o = c.mesh; if (!o) continue;
    const on = c.on && TLX.on("police"); o.visible = on; if (!on) continue;
    o.position.set(c.x, c.y - 0.04, c.z); o.rotation.set(c.pitch || 0, c.yaw, 0, "YXZ");
    for (const q of c.wh) q.rotation.x = c.roll || 0;
    const live = c.st === "ext" && (c.task === "chase" || c.task === "tail" || c.task === "go"), ph = Math.floor(flashT * 7 + c.i) & 1, st = Math.floor(flashT * 14) % 7 === 0;
    c.lights = live;
    c.lb[0].color.setHex(live ? (ph ? 0x1a4cff : 0x0a1230) : 0x0a1230); c.lb[2].color.setHex(live ? (ph ? 0x0a1230 : 0x1a4cff) : 0x0a1230); c.lb[1].color.setHex(live && st ? 0xffffff : 0x303438);
    c.gs[0].visible = live && !!ph; c.gs[1].visible = live && !ph; const k = 0.55 + 0.45 * clamp(night + 0.2, 0, 1); c.gs[0].material.opacity = c.gs[1].material.opacity = k;
  }
}
function sirenTick() {
  const au = api.audio && api.audio(); if (!au) return;
  if (!siren || siren.au !== au) {
    const AC = au.AC, o = AC.createOscillator(), lp = AC.createBiquadFilter(), g = AC.createGain();
    o.type = "square"; lp.type = "lowpass"; lp.frequency.value = 1800; g.gain.value = 0; o.connect(lp); lp.connect(g); g.connect(au.master); o.start();
    siren = { au, o, lp, g, last: performance.now() };
    setInterval(() => { if (siren && performance.now() - siren.last > 400) siren.g.gain.setTargetAtTime(0, siren.au.AC.currentTime, 0.1); }, 300);
  }
  const m = me(); let best = 0;
  for (const c of cops) if (c.on && c.lights) { const d = Math.hypot(c.x - m.x, c.z - m.z), k = Math.pow(clamp(1 - d / 380, 0, 1), 2); best = Math.max(best, k); }
  const inside = api.INT && api.INT.on ? 0.25 : 1, t = au.AC.currentTime; siren.last = performance.now();
  siren.o.frequency.setValueAtTime(Math.floor(flashT / 0.55) & 1 ? 620 : 780, t);     // the two-tone hi-lo
  siren.g.gain.setTargetAtTime(0.05 * best * inside, t, 0.12); siren.lp.frequency.setTargetAtTime(inside < 1 ? 700 : 1800, t, 0.2);
}

// ---- HUD
function hud() {
  const el = document.getElementById("polHud"); if (!el) return;
  const s = S(), on = TLX.on("police") && s.mode !== "clear" && api.started();
  const pips = s.mode === "warn" ? 1 : s.mode === "clear" ? 0 : clamp(Math.ceil(s.heat / 20), 1, 5);
  const txt = s.mode === "warn" ? "Politi: slow down and stop" : s.mode === "pursuit" ? (RT.seenNow ? "Pursuit: lose them or stop" : "Pursuit: out of sight") : s.mode === "search" ? "Searching: keep hidden" : "";
  const key = on + "|" + s.mode + "|" + pips + "|" + txt + "|" + RT.seenNow;
  if (key === hudKey) return; hudKey = key;
  el.hidden = !on; el.dataset.mode = s.mode;
  const ps = el.querySelectorAll("i"); ps.forEach((p, i) => p.classList.toggle("on", i < pips));
  const t = document.getElementById("polTxt"); if (t) t.textContent = txt;
}

// ---- the Politi app
const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 4.5 6v5.5c0 4.4 3 7.9 7.5 9.5 4.5-1.6 7.5-5.1 7.5-9.5V6z"/><path d="M9 12l2.2 2.2L15.5 10"/></svg>';
function render(el) {
  const s = S(), U = api.ui, r = s.rec;
  let h = U.tabHead("POLITI · FINNMARK POLITIDISTRIKT", "Politi", api.fmtCash(api.GS.cash));
  h += `<div class="tsub">${s.mode === "clear" ? "No one is after you" : s.mode === "warn" ? "You have been told to stop" : s.mode === "pursuit" ? "Pursuit" : "They are searching for you"}${s.owed > 0 ? " " + U.chip("FINES OWED " + money(s.owed), "due") : ""}</div>`;
  if (s.owed > 0) h += U.tabCard({ tf: "pol:owed", title: "Fines owed", chips: U.chip("UNPAID", "due"), meta: `Grows 10% every Monday. Over ${money(POL.owedLimit)} owed, the patrols know your face.`, pay: money(s.owed), act: "polpay", actLabel: "PAY IT", blocked: api.GS.cash < 1 });
  h += U.sec("Your record", "");
  h += `<div class="tsml2"><div class="tsm2 tprow"><b>Fines</b><span>${r.fines} · ${money(r.paid)} paid</span></div><div class="tsm2 tprow"><b>Warnings</b><span>${r.warnings}</span></div><div class="tsm2 tprow"><b>Chases</b><span>${r.chases} · ${r.escapes} got away · ${r.busts} caught</span></div></div>`;
  if (s.last.length) { h += U.sec("Recent", ""); h += `<div class="tsml2">${s.last.map(q => `<div class="tsm2 tprow"><b>${U.esc(q.d)}</b><span>${U.esc(q.why)}${q.fine ? ` · ${money(q.fine)}${q.fine > q.paid ? " (" + money(q.fine - q.paid) + " owed)" : ""}` : ""}</span></div>`).join("")}</div>`; }
  h += `<p class="tnote2">The rules: 30 km/h inside the town limit, 70 km/h on a marked road. The open fell has no limit. Close passes at speed, sliding round in town and hitting traffic count too, but only if the Politi sees it (about 170 m by day, less at night or in a storm; a hill hides you) or someone phones it in. Stop and you are fined; run and you are chased. A hill, a storm and some distance will lose them. You can't be fined below zero cash: what you can't pay is owed.</p>`;
  el.innerHTML = `<div class="tapp">${h}</div>`;
  for (const b of el.querySelectorAll("[data-act='polpay']")) b.addEventListener("click", pay);
}

function put(i, x, z, yaw, task) {                                         // scenarios: stand cruiser i somewhere, on a call
  const c = cops[i | 0]; if (!c) return null;
  Object.assign(c, { on: true, x, z, yaw: yaw || 0, v: 0, st: "ext", task: task || "chase", hold: 0, stuck: 0, rt: 0, pickT: 0 }); T.k.ground(c); return c;
}

TLX.option({ id: "police", name: "Politi patrols and pursuits", hint: "Cruisers patrol the roads. Speeding on a road or in town, close passes, sliding round and crashes get you a warning, a fine or a chase. Open snow has no limits. Off = no police, no fines.", sys: "police",
  change: v => { if (!v) { reset(); for (const c of cops) { c.on = false; c.st = "drive"; } } else if (T && T.ready) for (const c of cops) if (!c.on) T.k.spawn(c, true); } });
TLX.register({
  id: "police", v: 1,
  state0: () => ({ rec: { fines: 0, warnings: 0, chases: 0, escapes: 0, busts: 0, paid: 0 }, owed: 0, mode: "clear", heat: 0, lk: null, searchT: 0, last: [] }),
  migrate: st => st,
  init(a) {
    api = a; T = window.TLXT; if (!T || !T.ready) return;
    const s = S();
    if (!s.rec || typeof s.rec !== "object") s.rec = {}; for (const k of ["fines", "warnings", "chases", "escapes", "busts", "paid"]) s.rec[k] = Math.max(0, Math.floor(+s.rec[k] || 0));
    s.owed = Math.max(0, Math.round(+s.owed || 0)); s.heat = clamp(+s.heat || 0, 0, 100); s.searchT = Math.max(0, +s.searchT || 0);
    s.last = Array.isArray(s.last) ? s.last.filter(q => q && typeof q === "object").slice(0, 5) : [];
    if (s.mode !== "clear") { s.mode = "search"; s.searchT = Math.min(s.searchT, POL.searchT - 14); const m = me(); s.lk = { x: m.x, z: m.z }; }   // a save mid-chase: they are still looking
    else s.lk = null;
    const n = a.GFX && a.GFX.low ? POL.n.low : POL.n.high;
    for (let i = 0; i < n; i++) { const c = { i: 100 + i, police: true, on: false, retry: 0, col: 0xf1f3f5, sx: 1, sy: 1, lane: T.TRAF.lane, k: 0, hold: 0, blocked: 0 }; cops.push(c); T.extra.push(c); }
    T.ext = extStep; RT.hits = T.hits || 0;
    if (TLX.on("police")) for (const c of cops) T.k.spawn(c, true);
    api.TABLET.register({ id: "politi", name: "Politi", icon: ICON, order: 8.8, live: 5, hidden: () => !TLX.on("police") || (!S().owed && !S().rec.fines && !S().rec.warnings && !S().rec.chases && S().mode === "clear"), badge: () => S().owed > 0 ? "!" : "", render });
  },
  save() { const s = S(); s.owed = Math.max(0, Math.round(s.owed)); },
  monday() { const s = S(); if (s.owed > 0) { s.owed = Math.round(s.owed + Math.max(5, s.owed * 0.1)); api.save(); try { api.TABLET.refresh("politi"); } catch (e) { } } },
  tick(dt) {
    if (!api || !api.started() || !T || !T.ready) return;
    if (!built) { try { if (!build()) return; } catch (e) { console.error("TLX police build", e); built = true; T = null; return; } }
    const on = TLX.on("police"), s = S();
    if (!on) { for (const c of cops) if (c.on) { c.on = false; c.st = "drive"; } if (s.mode !== "clear") reset(); visual(dt); hud(); return; }
    if (api.tutHidden && api.tutHidden() || !api.tutDone()) { if (s.mode !== "clear") reset(); visual(dt); hud(); return; }
    // patrols: a cruiser that is out of the bubble turns up on a road again, like the traffic
    for (const c of cops) {
      if (!c.on) { if (!T.hold) { c.retry -= dt; if (c.retry <= 0) T.k.spawn(c, false); } continue; }
      if (c.st !== "ext" && !T.hold && Math.hypot(c.x - me().x, c.z - me().z) > T.TRAF.drop) T.k.spawn(c, false);
    }
    tAcc += dt; if (tAcc >= 0.1) { const d = tAcc; tAcc = 0; try { watch(d); } catch (e) { if (!RT.err) console.error("TLX police", e); RT.err = String(e); } }
    visual(dt); sirenTick(); hud();
  }
});
function patrol(i, id, sPos, dir) {                                          // scenarios: stand cruiser i on a road, patrolling (not on a call)
  const c = cops[i | 0], r = T.routes.find(q => q.id === id); if (!c || !r) return null;
  Object.assign(c, { on: true, r, s: clamp(sPos, r.s0, r.s1), k: 0, dir: dir < 0 ? -1 : 1, v: 0, st: "drive", t: 0, blocked: 0, hold: 0, why: "", laneT: T.TRAF.lane, pass: null, lv: 0, waiting: false, gq: false, cv: null, task: null });
  c.lane = T.TRAF.lane; T.k.setPose(c, 0); T.k.ground(c); return c;
}
window.TLXP = { patrol, POL, S, cops, RT, zone, seen, engaged, put, pay, fineFor, charge, step: watch, finish, reset, get mode() { return S().mode; }, dispatchCar };
})();
