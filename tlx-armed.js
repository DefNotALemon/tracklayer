// Tracklayer — armed work (G9 slice A1, loop/RAIDS.md): the legal side of carrying a rifle. Armed courier runs and guard shifts for
// the state and for companies, an armed standing that grows with clean work, and the Vakt tablet app that lists it all.
//
// WHO CAN DO IT. A hunter's licence (or the "huntlic" option off), a rifle of your own (tlx-guns.js) and Politi fines owed no
// higher than POL.owedLimit (tlx-police.js). Each missing thing is its own line on the locked cards: nothing is hidden behind a
// vague "not yet". Option "armedwork" (on by default): off = no armed jobs are offered, and the app says so.
//
// THE BOARD. Vakt (tablet app) has a Work tab (3 to 5 jobs, new each calendar day, seeded by the day so a reload shows the same
// board) and a Standing tab (overall and per employer, your record). One armed job at a time; ABANDON drops it for a point of
// standing. An accepted job has a row in the Jobs app (api.jobx) and the compass can follow it.
//
// ARMED COURIER. Six cases (payroll cash, pharmacy medicines, a rifle for the gun shop, evidence for the lensmann, lighthouse
// spares, survey core samples), each with its employer and a real pickup and drop-off drawn from the world's sites (quay,
// villages, herder cabins, the gun shop's door). Walk up to the pickup and use TAKE CASE; ride to the drop and use HAND OVER.
// The rifle must stay yours the whole way (gone from your pack = the case is withdrawn), the case has a game-time limit, and a
// hard crash loses it. About one run in four has a TAIL: a sled with a rider arrives from 100+ m back along your own tracks,
// settles 40-80 m behind, and gives up when you hold your pace for a stretch, outrun it, or break its line of sight. Stopped
// (or off the sled) with it alongside for a few seconds, the case is snatched. Nobody shoots in A1.
//
// GUARD SHIFT. Eight posts: four for the state (Kystverket's lighthouse depot, Forsvaret's radar hut, the kommune's fuel store,
// the ferry quay on payroll day) and four for companies (the fish plant, the power substation, the survey camp, the film crew's
// kit truck). Each post's spot is found in the world (dry, level, clear of houses and doors) and a small built post (hut,
// barrier, lamp, brazier, parked van...) stands there while the job is live and is taken down after. The shift starts when
// you reach it and runs a set stretch of game time on a visible clock; you may walk the perimeter, and leaving it for longer
// than the grace time fails the shift. Events come from a table of nine (a prowler at the fence, a fox at the bins, a drunk, a
// sled with no lights, a delivery to sign for, a false alarm, a lamp that dies, a quiet stretch...), each with a right and a
// wrong response that move the pay and the standing. People and the fox walk in with the real gait (api.walkAs) and walk out.
//
// STANDING. Points overall and per employer: up on a clean job and on each right call, down on a failed job and each wrong
// call. Levels (New, Known, Trusted, Reliable, Old hand) add 3% pay each. A2 (tips) will read TLXAW.standing().
// PAY. A courier run pays 1.15x to 1.38x a long parcel of the same distance (60 + 0.11 m/m + 0.5 climb, as the board's long
// run), a shift 85 to 95 a game hour: both a little over hauling of the same length.
//
// SAVED under x.sys.armed: { day, offers, active, standing: { all, emp: {} }, rec: {...}, last: [...], seq }. An old save starts
// empty. The tail, the figures and the built post are not saved: a reload rebuilds the post and drops the tail.
// Test hooks: window.TLXAW (S, qual, accept, force, tailNow, startEvent, spotOf, hud, ...).
(() => {
"use strict";
let api = null, T = null, built = false;
const S = () => TLX.state("armed");
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const hashS = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const money = v => api.fmtCash(Math.round(v));
const GH = () => api.gameHour || 50;                       // seconds of play in a game hour
const hrs = h => { const m = Math.max(0, Math.round(h * 60)); return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m} min`; };
const clock = h => api.fmtTime(((h % 24) + 24) % 24);

TLX.option({ id: "armedwork", name: "Armed work", hint: "With a hunter's licence and a rifle of your own, the Vakt tablet app offers armed courier runs and guard shifts for the state and for companies, and keeps your standing with each. Off = no armed jobs.", sys: "armed" });

const TUNE = {
  perim: 26, grace: 12, near: 16, handR: 14, takeR: 16,    // m: the post's perimeter; s outside it before the shift fails; use range at a person; at a drop; at a pickup
  tailTrigger: 190, tailGap0: 140, tailGapMin: 40, tailGapMax: 80, tailV: 17, patience: 30, outpace: 165, losT: 6, snatchR: 9, snatchT: 3.2, stopV: 2.4, moveV: 6,
  crashV: 7, collectH: 5, shiftGoH: 4, evK: 1                // evK: a scenario's time-lapse for events (figures, timers); 1 in play
};
const LEVELS = [[0, "New"], [4, "Known"], [10, "Trusted"], [20, "Reliable"], [35, "Old hand"]];
const level = pts => { let l = 0; for (let i = 0; i < LEVELS.length; i++) if (pts >= LEVELS[i][0]) l = i; return l; };
const levelName = pts => LEVELS[level(pts)][1];

/* ---------------- who pays ---------------- */
const EMP = {
  kommune: { name: "Kjøllefjord kommune", state: true }, kystverket: { name: "Kystverket", state: true }, forsvaret: { name: "Forsvaret", state: true },
  lensmann: { name: "Lensmannen", state: true }, fisk: { name: "Nordkinn Fisk AS" }, kraft: { name: "Nordkinn Kraft" }, apotek: { name: "Apoteket" },
  jakt: { name: "Nordkinn Jakt & Våpen" }, survey: { name: "Polar Survey AS" }, film: { name: "Nordlys Film" }
};
// a named contact: a real adult of a real household, picked by trade and seeded by the employer (none for the armed forces and the lensmann's desk)
const CONTACT = { fisk: /fish-plant|harbour/, kommune: /teacher|nurse/, kystverket: /lighthouse|harbour|bird warden/, apotek: /nurse/, jakt: /shopkeeper|mechanic|guide/, survey: /guide|forester|herder/, film: /guide|photograph/, kraft: /mechanic|carpenter/ };
function contact(emp) {
  const re = CONTACT[emp]; if (!re || !window.TLXN || !TLXN.people || !TLXN.people.length) return null;
  const L = TLXN.people.filter(p => p.age >= 24 && re.test(p.trade || "")); if (!L.length) return null;
  return L[hashS("armed:" + emp) % L.length];
}
const contactLine = emp => { const p = contact(emp); return p ? `${p.first} ${p.last}, ${p.trade}, ${p.village}` : EMP[emp].state ? "the duty desk" : "the office"; };

/* ---------------- the world: places ---------------- */
const W = () => api.world;
const sitesAll = () => W().SITES.filter(s => s.x !== undefined);
const villages = () => sitesAll().filter(s => s.kind === "village");
const here = () => api.FOOT.on ? api.FOOT : api.P;
const pt = (s, name) => ({ x: Math.round(s.x), z: Math.round(s.z), y: Math.round(s.y || 0), name: name || s.name });
function depotPt() { const d = W().depot; return { x: Math.round(d.x), z: Math.round(d.z), y: Math.round(d.y || 0), name: "Kjøllefjord quay" }; }
function shopPt() { try { const b = window.TLXGUN && TLXGUN.shop && TLXGUN.shop.b; if (b) return { x: Math.round(b.x), z: Math.round(b.z), y: 8, name: "Nordkinn Jakt & Våpen" }; } catch (e) { } const d = depotPt(); d.name = "Nordkinn Jakt & Våpen"; return d; }
function villageFar(R, from, minD) {
  const L = villages().filter(v => Math.hypot(v.x - from.x, v.z - from.z) >= minD); const A = L.length ? L : villages();
  return A.length ? A[Math.floor(R() * A.length)] : null;
}
function cabinFar(R, from, minD) { const L = sitesAll().filter(s => s.type === "cabin" && s.kind !== "village" && Math.hypot(s.x - from.x, s.z - from.z) >= minD); return L.length ? L[Math.floor(R() * L.length)] : villageFar(R, from, minD); }

// the six cases
const CASES = [
  { kind: "payroll", emp: "fisk", name: "Payroll cash", item: "the plant's payroll", mul: 1.2, from: () => depotPt(), to: (R, f) => villageFar(R, f, 1500), why: "Wages for the week, counted at the quay bank, for a plant with no bank of its own." },
  { kind: "pharmacy", emp: "apotek", name: "Pharmacy medicines", item: "a locked box of medicines", mul: 1.1, from: () => depotPt(), to: (R, f) => villageFar(R, f, 1200), why: "Controlled medicines for the village clinic: they ride with a licensed rifle, by the pharmacy's rules." },
  { kind: "firearm", emp: "jakt", name: "A rifle for the gun shop", item: "a boxed rifle", mul: 1.15, from: (R, f) => villageFar(R, f, 1200), to: () => shopPt(), why: "An estate sale: the heir's rifle has to reach the counter in Kjøllefjord by someone who may carry one." },
  { kind: "evidence", emp: "lensmann", name: "Evidence for the lensmann", item: "a sealed evidence bag", mul: 1.05, from: (R, f) => cabinFar(R, f, 1200), to: () => { const d = depotPt(); d.name = "the lensmann's office, Kjøllefjord"; return d; }, why: "Taken at a break-in out on the fell, signed for at the scene, and wanted at the office before it spoils." },
  { kind: "charts", emp: "kystverket", name: "Lamp spares and the lighthouse log", item: "a case of lamp spares and the log", mul: 1.0, from: () => depotPt(), to: () => { const r = sitesAll().find(s => s.type === "relay" || /lighthouse/i.test(s.name || "")); return r ? pt(r) : null; }, why: "The keeper's spare lamp parts and the sealed log book, out to the light on the tip." },
  { kind: "cores", emp: "survey", name: "Core samples", item: "a tray of core samples", mul: 1.05, from: (R, f) => cabinFar(R, f, 1200), to: () => depotPt(), why: "A season's cores from the survey camp for the lab: lost samples are lost months." }
];

// the eight posts. anchor(): the world thing it stands near; r0/r1: how far from it the spot may be
const POSTS = [
  { id: "lighthouse", emp: "kystverket", name: "Kystverket's lighthouse depot", short: "the lighthouse depot", mul: 1.0, look: "lighthouse", r0: 45, r1: 200, anchor: () => { const r = sitesAll().find(s => s.type === "relay" || /lighthouse/i.test(s.name || "")); return r || villages()[0]; } },
  { id: "radar", emp: "forsvaret", name: "Forsvaret's radar hut", short: "the radar hut", mul: 1.0, look: "radar", r0: 80, r1: 260, anchor: () => { const L = sitesAll().filter(s => s.type === "cabin" && s.kind !== "village" && !/wind/i.test(s.name || "")).sort((a, b) => (b.y || 0) - (a.y || 0)); return L[0] || sitesAll()[0]; } },
  { id: "fuel", emp: "kommune", name: "The kommune's fuel store", short: "the fuel store", mul: 1.0, look: "fuel", r0: 70, r1: 260, anchor: () => { const v = villages(); return v[Math.min(2, v.length - 1)] || W().depot; } },
  { id: "quay", emp: "kommune", name: "The ferry quay, payroll day", short: "the ferry quay", mul: 1.0, look: "quay", r0: 22, r1: 120, anchor: () => { const q = api.steamer && api.steamer.quay && api.steamer.quay(); return q ? { x: q.qx, z: q.qz, id: "quay" } : W().depot; } },
  { id: "fish", emp: "fisk", name: "The fish plant", short: "the fish plant", mul: 1.12, look: "fish", r0: 70, r1: 260, anchor: () => villages().find(v => /mehamn/i.test(v.name)) || villages()[1] || W().depot },
  { id: "substation", emp: "kraft", name: "The power substation", short: "the substation", mul: 1.12, look: "substation", r0: 60, r1: 240, anchor: () => sitesAll().find(s => s.kind === "farm" || /wind/i.test(s.name || "")) || sitesAll()[0] },
  { id: "survey", emp: "survey", name: "The survey camp", short: "the survey camp", mul: 1.12, look: "survey", r0: 70, r1: 260, anchor: () => sitesAll().find(s => s.type === "cabin" && s.kind === "cabin") || sitesAll()[0] },
  { id: "film", emp: "film", name: "The film crew's kit truck", short: "the kit truck", mul: 1.12, look: "film", r0: 30, r1: 200, anchor: () => { const L = W().LOOKOUTS || []; return L[0] ? { x: L[0].x, z: L[0].z, id: "look" } : W().depot; } }
];
const postDef = id => POSTS.find(p => p.id === id) || null;

// a dry, level spot clear of houses, doors and water, within r0..r1 of the anchor (seeded: the same post is in the same place in every game)
const SPOT = {};
function findSpot(def) {
  if (SPOT[def.id]) return SPOT[def.id];
  const w = W(), a = def.anchor(); if (!a) return null; const R = rng(hashS("post:" + def.id)), doors = w.doors || [];
  for (let pass = 0; pass < 2; pass++) {
    const slopeMax = pass ? 0.11 : 0.055, rim = pass ? 1.4 : 0.8;
    for (let k = 0; k < 1400; k++) {
      const r = def.r0 + (def.r1 - def.r0) * Math.sqrt(k / 1400) + R() * 5, an = R() * Math.PI * 2, x = a.x + Math.cos(an) * r, z = a.z + Math.sin(an) * r;
      if (Math.abs(x) > w.half - 150 || Math.abs(z) > w.half - 150) continue;
      if (w.isSea(x, z) || w.isWater(x, z) || w.obNear(x, z, 11) || w.slopeAt(x, z, 5) > slopeMax) continue;
      if (doors.some(d => Math.hypot(d.x - x, d.z - z) < 30)) continue;
      if (sitesAll().some(s => s.id !== a.id && Math.hypot(s.x - x, s.z - z) < 40)) continue;
      let ok = true; const y0 = w.surf(x, z);
      for (let j = 0; j < 8 && ok; j++) { const a2 = j * Math.PI / 4, px = x + Math.cos(a2) * 8, pz = z + Math.sin(a2) * 8; if (w.isSea(px, pz) || w.isWater(px, pz) || Math.abs(w.surf(px, pz) - y0) > rim) ok = false; }
      if (!ok) continue;
      return (SPOT[def.id] = { x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, ry: Math.round(Math.atan2(a.x - x, a.z - z) * 100) / 100 });
    }
  }
  return null;
}

/* ---------------- qualification ---------------- */
function qual() {
  const miss = [], G = window.TLXGUN, P = window.TLXP;
  if (!G) return { ok: false, miss: ["The gun system isn't loaded."] };
  const gs = G.state();
  if (TLX.on("huntlic") && !(gs && gs.licence)) miss.push("A hunter's licence: take the course at the counter in Nordkinn Jakt & Våpen (Licence tab).");
  if (!G.gun()) miss.push("A rifle of your own: Nordkinn Jakt & Våpen sells one (after the licence).");
  const ps = P && P.S && P.S(), lim = P && P.POL ? P.POL.owedLimit : 300;
  if (ps && ps.owed > lim) miss.push(`Politi fines owed ${money(ps.owed)}, over the ${money(lim)} limit: pay them in the Politi app.`);
  return { ok: miss.length === 0, miss };
}

/* ---------------- the board ---------------- */
const dayNow = () => api.CAL.dayIndex();
function payNow(j) { return Math.round(j.pay * api.payMul() * (1 + 0.03 * level(S().standing.all)) / 5) * 5; }
function courierOffer(R, kindIdx, id) {
  const c = CASES[kindIdx], from0 = c.from(R, depotPt()); if (!from0) return null;
  const from = from0.kind !== undefined || from0.type ? pt(from0) : from0, to0 = c.to(R, from); if (!to0) return null;
  const to = to0.type !== undefined ? pt(to0) : to0;
  const dist = Math.hypot(to.x - from.x, to.z - from.z); if (dist < 500) return null;
  const climb = Math.max(0, (to.y || 0) - (from.y || 0)), pay = Math.round((60 + dist * 0.11 + climb * 0.5) * 1.15 * c.mul / 5) * 5;
  const limH = (dist / 7.5 + 90) / GH();
  return { id, type: "courier", kind: c.kind, emp: c.emp, from, to, dist: Math.round(dist), pay, limH: Math.round(limH * 100) / 100, tail: R() < 0.25 };
}
function shiftOffer(R, postIdx, id) {
  const p = POSTS[postIdx], spot = findSpot(p); if (!spot) return null;
  const len = R() < 0.5 ? 3 : 4, dow = api.CAL.now().dow, payday = p.id === "quay" && dow === 5;
  return { id, type: "shift", post: p.id, emp: p.emp, spot, len, pay: Math.round(len * (p.emp && EMP[p.emp].state ? 85 : 95) * (payday ? 1.2 : 1) / 5) * 5, payday, n: len === 3 ? 3 : 4 };
}
function refreshOffers(force) {
  const s = S(), d = dayNow(); if (!force && s.day === d && s.offers.length) return;
  s.day = d; const R = rng(hashS("board:" + d)), out = [];
  const nj = 3 + (R() < 0.5 ? 1 : 0) + (R() < 0.3 ? 1 : 0), nc = Math.round(nj / 2), ks = CASES.map((c, i) => i).sort(() => R() - 0.5), ps = POSTS.map((p, i) => i).sort(() => R() - 0.5);
  let ci = 0, pi = 0, guard = 0;
  while (out.length < nj && guard++ < 40) {
    const wantC = out.filter(o => o.type === "courier").length < nc, id = `d${d}-${out.length + 1}`;
    const o = wantC && ci < ks.length ? courierOffer(R, ks[ci++], id) : pi < ps.length ? shiftOffer(R, ps[pi++], id) : null;
    if (o) out.push(o); else if (ci >= ks.length && pi >= ps.length) break;
  }
  s.offers = out; api.save();
}

/* ---------------- standing ---------------- */
function standing() { const s = S(); return { all: s.standing.all, level: level(s.standing.all), name: levelName(s.standing.all), emp: Object.assign({}, s.standing.emp) }; }
function addStanding(emp, n) {
  const s = S(), st = s.standing; st.all = Math.max(0, st.all + n); st.emp[emp] = Math.max(0, (st.emp[emp] || 0) + n);
}
function record(j, ok, text, pay, st) {
  const s = S(), r = s.rec, e = r.byEmp[j.emp] || (r.byEmp[j.emp] = { done: 0, failed: 0, paid: 0 });
  if (ok) { r.done++; e.done++; r.paid += pay; e.paid += pay; if (j.type === "courier") r.courier++; else r.shifts++; } else { r.failed++; e.failed++; }
  s.last.unshift({ d: api.CAL.now().label, ok, text, pay, st, emp: j.emp }); if (s.last.length > 12) s.last.length = 12;
}

/* ---------------- the HUD line ---------------- */
let hudEl = null, hudKey = "";
function hudBox() {
  if (hudEl) return hudEl;
  hudEl = document.createElement("div"); hudEl.id = "awHud"; hudEl.hidden = true;
  hudEl.style.cssText = "position:fixed;top:72px;left:50%;transform:translateX(-50%);z-index:31;max-width:min(92vw,560px);padding:6px 12px;border-radius:10px;background:rgba(9,14,20,.74);border:1px solid rgba(160,190,210,.25);color:#eaf2f8;font:600 13px/1.35 system-ui,sans-serif;letter-spacing:.02em;text-align:center;pointer-events:none;white-space:pre-line";
  document.body.appendChild(hudEl); return hudEl;
}
function setHud(txt) {
  const el = hudBox(); if (txt === hudKey) return; hudKey = txt; el.hidden = !txt; el.textContent = txt;
}
let hudText = "";
function composeHud() {
  const s = S(), j = s.active; if (!j || !TLX.on("armedwork")) return "";
  const p = here(), lines = [];
  if (j.type === "courier") {
    const left = j.due ? Math.max(0, j.due - api.GS.hour) : 0, tgt = j.state === "collect" ? j.from : j.to, d = Math.hypot(tgt.x - p.x, tgt.z - p.z);
    lines.push(j.state === "collect" ? `ARMED COURIER · collect at ${j.from.name}` : `ARMED COURIER · ${CASEBY[j.kind].name} → ${j.to.name} · ${hrs(left)} left`);
    if (j.state === "carry") {
      if (TAIL.on && TAIL.mode === "follow") lines.push(TAIL.stopT > 0.6 ? "A sled is right behind you and you are standing still." : "A sled has been behind you since the last mile: keep moving.");
      else if (d < TUNE.handR + 6 && !api.FOOT.on) lines.push(api.keyHint("dismount", "get off") + " and hand the case over");
      else lines.push("The rifle stays on your back all the way.");
    } else if (d < TUNE.takeR + 6 && !api.FOOT.on) lines.push(api.keyHint("dismount", "get off") + " and take the case");
  } else {
    const post = postDef(j.post);
    if (j.state === "go") lines.push(`GUARD SHIFT · ${post.name} · go to the post (${hrs(Math.max(0, j.by - api.GS.hour))} to get there)`);
    else {
      const end = j.h0 + j.len, left = Math.max(0, end - api.GS.hour), d = Math.hypot(j.spot.x - p.x, j.spot.z - p.z);
      lines.push(`GUARD · ${post.short} · ${clock(j.h0)} to ${clock(end)} · ${hrs(left)} left`);
      if (d > TUNE.perim) lines.push(`Off the post: back inside the lamp's ring in ${Math.max(0, Math.ceil(TUNE.grace - j.outT))} s`);
      else if (EV.cur) { const l = EVT[EV.cur.id].line(EV.cur); if (l) lines.push(l); if (!api.FOOT.on && EVT[EV.cur.id].needsFoot) lines.push(api.keyHint("dismount", "get off")); }
      else lines.push(`On post · ${money(Math.round(j.pay + j.padj))} so far`);
    }
  }
  return lines.join("\n");
}
const CASEBY = {}; for (const c of CASES) CASEBY[c.kind] = c;

/* ---------------- figures: people, a fox, a sled with a rider ---------------- */
const JK = [0x2d4a63, 0x6b3a2a, 0x3a5a3a, 0x5a5a60, 0x7a2f35, 0x3a3f5a, 0x4a4030, 0x2a2e36];
function newPerson(seed, opt) {
  const std = api.mesh.std, r = rng(seed);
  const g = api.newWalker({ jacket: std(JK[seed % JK.length], 0.85, 0), pants: std(0x23272e, 0.9, 0), trim: std(0xa8adb2, 0.7, 0) });
  g.visible = false; g.scale.setScalar(0.82 + r() * 0.08); api.scene.add(g); return g;
}
function figMove(f, dt) {
  const o = f.o; if (f.hold > 0) f.hold -= dt;
  let vt = 0, tx = null;
  if (f.path.length && f.hold <= 0) {
    tx = f.path[0]; const dx = tx[0] - o.x, dz = tx[1] - o.z, dd = Math.hypot(dx, dz);
    if (dd < 0.7) { f.path.shift(); if (f.onNode) f.onNode(f); tx = null; }
    else {
      let want = Math.atan2(dx, dz); if (f.wob) want += Math.sin(f.t * 1.1) * f.wob;
      const dy = wrap(want - o.yaw), rate = f.turn || 2.4; o.yaw = wrap(o.yaw + clamp(dy, -rate * dt, rate * dt));
      vt = f.vmax * (Math.abs(dy) > 0.9 ? 0.25 : 1) * (f.path.length === 1 ? clamp(dd / 2.5, 0.35, 1) : 1);
    }
  }
  const acc = vt > f.v ? 1.5 : 2.6; f.v += clamp(vt - f.v, -acc * dt, acc * dt);
  if (f.v > 0.02) { o.x += Math.sin(o.yaw) * f.v * dt; o.z += Math.cos(o.yaw) * f.v * dt; }
  f.t += dt;
}
function figFace(f, x, z, dt) { const dy = wrap(Math.atan2(x - f.o.x, z - f.o.z) - f.o.yaw); f.o.yaw = wrap(f.o.yaw + clamp(dy, -2.2 * dt, 2.2 * dt)); }
function figDraw(f, dt) {
  if (f.fox) {
    const q = f.fox, y = W().surf(f.o.x, f.o.z); q.g.position.set(f.o.x, y - 0.05, f.o.z); q.g.rotation.y = f.o.yaw; q.g.visible = true;
    api.gram.quad.pose(q, dt, f.v, f.graze || 0, 0); return;
  }
  api.walkAs(f.g, f.o, dt); f.g.visible = true;
}
function figFree(f) {
  if (!f) return;
  if (f.fox) { try { api.gram.quad.free(f.fox); } catch (e) { } f.fox.g.visible = false; }
  if (f.g) { api.scene.remove(f.g); }
  if (f.R) { api.scene.remove(f.R.g); }
}
function mkFig(kind, seed, x, z, yaw, vmax) {
  const f = { o: { x, z, yaw, tired: 0.05 }, v: 0, vmax, path: [], t: 0, hold: 0, turn: 2.4 };
  if (kind === "fox") { const q = api.gram.quad.make("fox"); if (!q.g.parent) api.scene.add(q.g); f.fox = q; q.g.visible = false; }
  else if (kind === "sled") { f.R = buildRider(seed); }
  else f.g = newPerson(seed);
  return f;
}
// the sled and its rider (the same pose as the oil driver's and the reels' riders: thighs along the seat, a lean to the bars)
function buildRider(seed) {
  const std = api.mesh.std, cyl = api.mesh.cyl, box = api.mesh.box, r0 = rng(seed);
  const SLC = [0x20262e, 0x3a4a6a, 0x6a2a2a, 0x2f5a3f, 0x8a8a90], C = api.sledCopy(api.GS.own.sled || "scout", { body: SLC[seed % SLC.length] });
  const g = new T.Group(); g.rotation.order = "YXZ"; g.visible = false; g.scale.setScalar(0.9); api.scene.add(g); const body = new T.Group(); g.add(body); body.add(C.g);
  const dark = std(0x1b1d20, 0.6, 0.3), rubber = std(0x101112, 0.95, 0);
  cyl(0.022, 0.026, 0.5, dark, 0, C.barY - 0.22, C.barZ + 0.075, -0.33, 0, 0, body, 8); cyl(0.015, 0.015, 0.74, dark, 0, C.barY, C.barZ, 0, 0, Math.PI / 2, body, 8);
  for (const sx of [-1, 1]) cyl(0.021, 0.021, 0.13, rubber, sx * 0.325, C.barY, C.barZ, 0, 0, Math.PI / 2, body, 8);
  const r = api.newWalker({ jacket: std(JK[(seed * 3 + 1) % JK.length], 0.85, 0), pants: std(0x202328, 0.9, 0), trim: std(0x9aa0a6, 0.7, 0) }), U = r.userData, hz = -0.24, lean = 0.5;
  r.position.set(0, C.seatAt(hz) + 0.1 - 0.93, hz); body.add(r);
  U.legs[0].rotation.set(-1.27, 0, -0.16); U.legs[1].rotation.set(-1.27, 0, 0.16); for (const s of U.shins) s.rotation.set(1.22, 0, 0); for (const a of U.ank) a.rotation.set(0.05, 0, 0);
  U.torso.rotation.x = lean; U.head.rotation.x = -0.36;
  for (let i = 0; i < 2; i++) {
    const sx = i ? 1 : -1, a = U.arms[i], f = U.fore[i];
    const wy = C.barY + 0.03 - r.position.y - 0.93, wz = C.barZ - 0.02 - hz, ly = wy * Math.cos(lean) + wz * Math.sin(lean), lz = -wy * Math.sin(lean) + wz * Math.cos(lean);
    const dx = sx * 0.325 - sx * 0.25, dy = ly - 0.53, dz = lz, L = Math.min(0.485, Math.hypot(dx, dy, dz)), l1 = 0.25, l2 = 0.24;
    const p = Math.atan2(Math.hypot(dx, dz), -dy), al = Math.acos(clamp((l1 * l1 + L * L - l2 * l2) / (2 * l1 * L), -1, 1)), ga = Math.acos(clamp((l1 * l1 + l2 * l2 - L * L) / (2 * l1 * l2), -1, 1));
    a.rotation.set(-(p - al), Math.atan2(dx, dz), 0); f.rotation.set(-(Math.PI - ga), 0, 0);
  }
  return { g, body, C, rider: r, U };
}
function riderPlace(R, x, z, yaw, dt) {
  const w = W(), fx = Math.sin(yaw), fz = Math.cos(yaw), sF = w.surf(x + fx, z + fz), sB = w.surf(x - fx * 1.2, z - fz * 1.2), ya = (sF + sB + w.surf(x, z)) / 3 - 0.05;
  const pitch = Math.atan2(sF - sB, 2.2), lx = Math.cos(yaw), lz = -Math.sin(yaw), roll = Math.atan2(w.surf(x + lx * 0.5, z + lz * 0.5) - w.surf(x - lx * 0.5, z - lz * 0.5), 1.0);
  R.g.position.set(x, ya, z); R.g.rotation.set(-pitch, yaw, roll * 0.8); R.g.visible = true;
}

/* ---------------- the built post ---------------- */
let POST = null;                                   // { id, g, obs, lampMat, glowL, winMat, coal, glow[], lampOn, brazier, x, z, ry, parts }
const haloTex = (() => { let t = null; return () => { if (t) return t; const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,244,205,1)"); gr.addColorStop(0.25, "rgba(255,226,160,0.5)"); gr.addColorStop(1, "rgba(255,210,140,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return (t = new T.CanvasTexture(c)); }; })();
function buildPost(def, sp) {
  const w = W(), M = api.mesh, box = M.box, cyl = M.cyl, std = M.std, g = new T.Group(), co = Math.cos(sp.ry), si = Math.sin(sp.ry);
  try { w.pressSnow(sp.x, sp.z, 22, 0.1); } catch (e) { }          // a trodden yard round the post: the guard and the visitors walk, they do not wade
  const y0 = w.surf(sp.x, sp.z); g.position.set(sp.x, y0, sp.z); g.rotation.y = sp.ry; api.scene.add(g);
  const wx = (lx, lz) => sp.x + lx * co + lz * si, wz = (lx, lz) => sp.z - lx * si + lz * co;
  const Y = (lx, lz) => w.surf(wx(lx, lz), wz(lx, lz)) - y0;
  const P = { id: def.id, g, obs: [], glow: [], x: sp.x, z: sp.z, ry: sp.ry, lampOn: true, parts: {}, flick: 0, lamps: [], hutWord: "hut" };
  const wood = std(0x7a5c3c, 0.92, 0), red = std(0x8a2f26, 0.85, 0), white = std(0xe4e6e8, 0.8, 0), grey = std(0x6b7279, 0.6, 0.35), dgrey = std(0x2c3036, 0.7, 0.3), yel = std(0xd2a62f, 0.75, 0), blue = std(0x2f4f78, 0.8, 0), roofM = std(0x2a2d31, 0.85, 0.1), black = std(0x15171a, 0.9, 0.1), orange = std(0xcf6a1e, 0.75, 0.05), olive = std(0x4c5a3c, 0.85, 0);
  P.winMat = new T.MeshBasicMaterial({ color: 0x3a3f45 }); P.lampMat = new T.MeshBasicMaterial({ color: 0x555a60 }); P.coalMat = new T.MeshBasicMaterial({ color: 0x5a2410 }); P.alarmMat = null;
  const ob = (lx, lz, r) => { const o = { x: wx(lx, lz), z: wz(lx, lz), r, top: 1e9 }; w.addOb(o); P.obs.push(o); };
  const sprite = (lx, y, lz, sz, col) => { const s = new T.Sprite(new T.SpriteMaterial({ map: haloTex(), color: col, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false, opacity: 0 })); s.position.set(lx, Y(lx, lz) + y, lz); s.scale.set(sz, sz, 1); s.visible = false; g.add(s); return s; };
  const hut = (lx, lz, bw, bd, bh, mat, roof, door) => {
    const y = Y(lx, lz); box(bw, bh + 0.5, bd, mat, lx, y + bh / 2 - 0.25, lz, 0, 0, 0, g);
    for (const sx of [-1, 1]) box(bw * 0.62, 0.1, bd + 0.5, roof || roofM, lx + sx * bw * 0.26, y + bh + 0.22, lz, 0, 0, -sx * 0.32, g);
    box(bw + 0.2, 0.14, 0.2, roof || roofM, lx, y + bh + 0.4, lz, 0, 0, 0, g);
    box(0.95, 1.85, 0.08, black, lx - bw * 0.2, y + 0.92, lz + bd / 2 + 0.03, 0, 0, 0, g);
    P.parts.win = box(0.9, 0.62, 0.08, P.winMat, lx + bw * 0.22, y + 1.35, lz + bd / 2 + 0.03, 0, 0, 0, g);
    box(1.05, 0.7, 0.04, dgrey, lx + bw * 0.22, y + 1.35, lz + bd / 2 + 0.01, 0, 0, 0, g);
    P.winGlow = sprite(lx + bw * 0.22, 1.35, lz + bd / 2 + 0.7, 2.8, 0xffd48a);
    ob(lx, lz, Math.max(bw, bd) * 0.62);
    P.hut = { x: wx(lx, lz), z: wz(lx, lz), lx, lz, bd };
  };
  const barrier = (lx, lz, len, ang) => {
    const y = Y(lx, lz), c = Math.cos(ang || 0), s = Math.sin(ang || 0);
    for (const sd of [-1, 1]) cyl(0.07, 0.07, 1.25, dgrey, lx + sd * len / 2 * c, y + 0.5, lz - sd * len / 2 * s, 0, 0, 0, g, 8);
    const seg = 6, sl = len / seg;
    for (let i = 0; i < seg; i++) { const u = -len / 2 + sl * (i + 0.5); box(sl * 0.99, 0.12, 0.08, i % 2 ? white : red, lx + u * c, y + 1.02, lz - u * s, 0, ang || 0, 0, g); }
  };
  const lamp = (lx, lz, h) => {
    const y = Y(lx, lz); cyl(0.06, 0.08, h + 0.4, dgrey, lx, y + h / 2 - 0.2, lz, 0, 0, 0, g, 8); box(0.14, 0.1, 0.9, dgrey, lx, y + h, lz + 0.35, 0, 0, 0, g);
    box(0.34, 0.1, 0.3, black, lx, y + h + 0.1, lz + 0.78, 0, 0, 0, g);
    const b = new T.Mesh(new T.SphereGeometry(0.11, 10, 8), P.lampMat); b.position.set(lx, y + h - 0.02, lz + 0.78); g.add(b);
    const gl = sprite(lx, h - 0.02, lz + 0.78, 9, 0xffe2a0); P.lamps.push({ lx, lz, gl, bulb: b, x: wx(lx, lz), z: wz(lx, lz), h }); P.glow.push(gl); ob(lx, lz, 0.4);
  };
  const brazier = (lx, lz) => {
    const y = Y(lx, lz); cyl(0.32, 0.22, 0.45, black, lx, y + 0.65, lz, 0, 0, 0, g, 10); for (const k of [0, 1, 2]) box(0.05, 0.5, 0.05, dgrey, lx + Math.cos(k * 2.1) * 0.22, y + 0.25, lz + Math.sin(k * 2.1) * 0.22, 0, 0, 0, g);
    const c = new T.Mesh(new T.SphereGeometry(0.26, 10, 6), P.coalMat); c.scale.y = 0.5; c.position.set(lx, y + 0.86, lz); g.add(c); P.coal = c;
    P.bz = sprite(lx, 1.15, lz, 4.2, 0xff8a3a); P.bz.userData.base = 1; P.brazierAt = { x: wx(lx, lz), z: wz(lx, lz) }; ob(lx, lz, 0.45);
  };
  const van = (lx, lz, ry, col, stripe, big) => {
    const y = Y(lx, lz), v = new T.Group(); v.position.set(lx, y, lz); v.rotation.y = ry; g.add(v), L = big ? 1.25 : 1;
    box(1.95 * L, 1.55 * L, 3.6 * L, col, 0, 1.0 * L + 0.2, -0.3 * L, 0, 0, 0, v); box(1.9, 1.15, 1.35, col, 0, 0.78 + 0.2, 1.95 * L, 0, 0, 0, v); box(1.85, 0.5, 0.06, std(0x2a3340, 0.2, 0.6), 0, 1.15 + 0.2, 2.62 * L, -0.35, 0, 0, v);
    box(1.97 * L, 0.2, 3.6 * L, stripe, 0, 0.65 * L + 0.2, -0.3 * L, 0, 0, 0, v); box(2.05, 0.18, 4.7 * L + 0.7, black, 0, 0.33, 0.3, 0, 0, 0, v);
    for (const sx of [-1, 1]) for (const z of [-1.0 * L, 1.7 * L]) cyl(0.38, 0.38, 0.22, black, sx * 1.0, 0.38, z, 0, 0, Math.PI / 2, v, 12);
    ob(lx + Math.sin(ry) * 1.6, lz + Math.cos(ry) * 1.6, 1.5); ob(lx - Math.sin(ry) * 0.9, lz - Math.cos(ry) * 0.9, 1.6);
    if (!P.hut) { P.hut = { x: wx(lx, lz), z: wz(lx, lz), lx, lz, bd: 4 }; P.hutWord = "truck"; }     // a post with no hut keeps its alarm panel in the van
  }; var L;
  const drums = (lx, lz, n, col) => { for (let i = 0; i < n; i++) { const dx = (i % 2) * 0.62, dz = Math.floor(i / 2) * 0.62, y = Y(lx + dx, lz + dz); cyl(0.28, 0.28, 0.85, col, lx + dx, y + 0.38, lz + dz, 0, 0, 0, g, 12); box(0.58, 0.04, 0.58, grey, lx + dx, y + 0.82, lz + dz, 0, 0, 0, g); } ob(lx + 0.3, lz + 0.3, 0.9); };
  const crates = (lx, lz, nx, nz, col) => { for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) { const y = Y(lx + i * 0.6, lz + k * 0.5); box(0.56, 0.32, 0.46, col, lx + i * 0.6, y + 0.1 + (i + k) % 2 * 0.3, lz + k * 0.5, 0, 0.08 * (i - k), 0, g); } ob(lx + nx * 0.3, lz + nz * 0.25, 0.9); };
  const fence = (lx, lz, hw, hd) => { const pts = []; for (let u = -hw; u <= hw + 0.01; u += 1.6) { pts.push([u, -hd], [u, hd]); } for (let v = -hd + 1.6; v < hd; v += 1.6) pts.push([-hw, v], [hw, v]); for (const q of pts) { const y = Y(lx + q[0], lz + q[1]); cyl(0.05, 0.05, 2.1, grey, lx + q[0], y + 0.8, lz + q[1], 0, 0, 0, g, 6); } for (const [a, b, c, d] of [[-hw, -hd, hw, -hd], [-hw, hd, hw, hd], [-hw, -hd, -hw, hd], [hw, -hd, hw, hd]]) { const len = Math.hypot(c - a, d - b), my = Y(lx + (a + c) / 2, lz + (b + d) / 2); for (const hh of [0.5, 1.2, 1.9]) box(a === c ? 0.03 : len, 0.03, a === c ? len : 0.03, grey, lx + (a + c) / 2, my + hh - 0.2, lz + (b + d) / 2, 0, 0, 0, g); } };
  const tent = (lx, lz, col) => { const y = Y(lx, lz); cyl(0.05, 2.0, 2.3, col, lx, y + 1.0, lz, 0, 0.4, 0, g, 4); box(0.9, 1.5, 0.05, black, lx, y + 0.65, lz + 1.55, 0, 0, 0, g); ob(lx, lz, 2.0); };
  const bins = (lx, lz) => { for (let i = 0; i < 2; i++) { const y = Y(lx + i * 0.8, lz); box(0.62, 1.0, 0.72, i ? std(0x2f6a3a, 0.8, 0) : std(0x3a3f46, 0.8, 0), lx + i * 0.8, y + 0.3, lz, 0, 0.1 * i, 0, g); box(0.68, 0.08, 0.78, black, lx + i * 0.8, y + 0.84, lz, 0, 0.1 * i, 0, g); } P.bins = { x: wx(lx + 0.4, lz), z: wz(lx + 0.4, lz) }; ob(lx + 0.4, lz, 0.9); };
  const mast = (lx, lz) => { const y = Y(lx, lz); cyl(0.06, 0.1, 6.2, grey, lx, y + 2.9, lz, 0, 0, 0, g, 8); cyl(0.9, 0.9, 0.08, white, lx, y + 5.7, lz + 0.35, 1.2, 0, 0, g, 16); ob(lx, lz, 0.5); };
  // the layouts: the hut stands at the back (-z), the door and the approach face +z, the lamp and the barrier in front
  const L0 = def.look;
  if (L0 === "lighthouse") { hut(0, -4, 3.4, 2.6, 2.5, white, red); box(3.5, 0.3, 2.7, red, 0, Y(0, -4) + 1.0, -4, 0, 0, 0, g); lamp(4.2, 0.5, 4.2); brazier(-3.2, 0.8); barrier(0, 5, 4.4, 0); drums(4, -4.5, 2, red); }
  else if (L0 === "radar") { hut(0, -4, 3.6, 2.8, 2.5, olive, dgrey); mast(-4, -5); lamp(4, 0.5, 4.2); barrier(0, 5, 4.4, 0); crates(-3, -1, 2, 2, olive); }
  else if (L0 === "fuel") { hut(0, -4, 3.2, 2.6, 2.5, red, roofM); drums(-4.2, -4, 6, red); box(0.7, 1.6, 0.5, yel, 3.4, Y(3.4, -1) + 0.6, -1, 0, 0, 0, g); ob(3.4, -1, 0.8); lamp(4, 1.8, 4.2); barrier(0, 5, 4.4, 0); }
  else if (L0 === "quay") { hut(-1, -4, 3.2, 2.6, 2.5, yel, roofM); brazier(3, 0.8); lamp(-4.4, 0.5, 4.2); barrier(0, 5, 4.4, 0); crates(3, -4.5, 3, 2, wood); }
  else if (L0 === "fish") { hut(0, -4.5, 3.2, 2.6, 2.5, blue, white); van(-6.5, 0.5, 0.35, white, blue, false); crates(3.6, -4, 4, 3, std(0x7f8a92, 0.8, 0)); lamp(4.3, 1.2, 4.2); barrier(0, 5, 4.4, 0); }
  else if (L0 === "substation") { fence(-1, -6, 5.5, 3.6); box(2.4, 2.6, 2.0, grey, -1, Y(-1, -6) + 1.0, -6, 0, 0, 0, g); box(0.5, 0.9, 0.5, dgrey, 1, Y(1, -6) + 1.9, -6, 0, 0, 0, g); ob(-1, -6, 1.8); hut(5.5, -0.5, 2.6, 2.2, 2.4, grey, roofM); lamp(2.6, 1.8, 4.4); barrier(0, 5, 4.4, 0); }
  else if (L0 === "survey") { tent(-1.6, -4.5, orange); tent(2.4, -5, olive); van(-6.4, 1.2, 0.2, orange, white, false); brazier(0.6, -1); crates(4, -1, 2, 2, std(0x6a6f76, 0.7, 0.2)); lamp(4.6, 1.8, 4.0); }
  else { van(-1, -4.2, 0.1, std(0x23262b, 0.7, 0.3), std(0xe0e2e4, 0.7, 0), true); crates(4.2, -3, 3, 2, black); lamp(4.2, 1.8, 4.4); lamp(-5.4, -0.5, 3.8); P.parts.film = true; }
  bins(L0 === "film" ? 5 : 3.4, L0 === "fish" ? -7.6 : -6.2);
  P.lampOn = true; return P;
}
function dropPost() {
  if (!POST) return; const w = W(); for (const o of POST.obs) w.dropOb(o);
  api.scene.remove(POST.g); POST.g.traverse(m => { if (m.geometry) m.geometry.dispose(); }); POST = null;
}
function postLight(dt) {
  const P = POST; if (!P) return;
  const dark = clamp(1 - api.dayFactor() + (api.GS.storm || 0) * 0.15, 0, 1), t = performance.now() / 1000; P.flick = 0.85 + Math.sin(t * 9.1) * 0.08 + Math.sin(t * 15.7) * 0.06;
  P.winMat.color.setRGB(0.23 + dark * 0.77, 0.25 + dark * 0.66, 0.27 + dark * 0.35);
  if (P.winGlow) { P.winGlow.visible = dark > 0.1; P.winGlow.material.opacity = dark * 0.5 * (P.alarm ? (Math.sin(t * 9) > 0 ? 1 : 0.1) : 1); }
  if (P.alarm) P.winMat.color.setRGB(Math.sin(t * 9) > 0 ? 1 : 0.2, 0.1, 0.08);
  for (const L of P.lamps) { const on = P.lampOn && !L.dead; L.bulb.material === P.lampMat; L.gl.visible = on && dark > 0.08; L.gl.material.opacity = dark * 0.85; }
  P.lampMat.color.setRGB(P.lampOn ? 0.55 + 0.45 * dark : 0.2, P.lampOn ? 0.52 + 0.4 * dark : 0.2, P.lampOn ? 0.4 + 0.2 * dark : 0.2);
  if (P.bz) { P.bz.visible = true; P.bz.material.opacity = (0.35 + dark * 0.6) * P.flick; P.bz.scale.setScalar(3.6 + P.flick); P.coalMat.color.setRGB(0.55 + 0.3 * P.flick, 0.2 + 0.1 * P.flick, 0.05); }
}

// the post is warm: a standing guard would freeze (the game's own cold) with no stove. The brazier and the hut's heater warm like a stove (api.warmx)
function postWarm(x, z) {
  const P = POST; if (!P) return 0; let k = 0;
  if (P.brazierAt) { const d = Math.hypot(x - P.brazierAt.x, z - P.brazierAt.z); k = Math.max(k, d < 7 ? 0.95 * (1 - d / 7) : 0); }
  if (P.hut) { const d = Math.hypot(x - P.hut.x, z - P.hut.z); k = Math.max(k, d < 7 ? 0.8 * (1 - d / 7) : 0); }
  return k;
}
/* ---------------- guard shift events ---------------- */
const EV = { cur: null, wait: 0, idx: 0 };
function bearingClear(c, an, r1) {
  const w = W(); for (let r = 8; r <= r1; r += 4) { const x = c.x + Math.cos(an) * r, z = c.z + Math.sin(an) * r; if (w.isSea(x, z) || w.isWater(x, z) || w.obNear(x, z, 1.6)) return false; if (w.slopeAt(x, z, 3) > 0.3) return false; }
  return true;
}
function approach(c, seed) {
  const R = rng(seed), a0 = R() * Math.PI * 2;
  for (const r1 of [64, 46, 30]) for (let k = 0; k < 16; k++) { const an = a0 + k * Math.PI / 8; if (bearingClear(c, an, r1)) return { an, r: r1 + 4 }; }
  return null;
}
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function pushLog(ok, text, dPay, dSt) {
  const j = S().active; if (!j) return; j.padj += dPay; j.stadj += dSt; j.log.push({ id: EV.cur ? EV.cur.id : "", ok, text, pay: dPay, st: dSt });
  api.toast(`${text} ${dPay ? (dPay > 0 ? "+" : "−") + money(Math.abs(dPay)) : ""}`.trim(), ok ? "good" : "warn");
  if (ok) addStanding(j.emp, dSt > 0 ? dSt : 0); else addStanding(j.emp, dSt);
  api.save();
}
const personFor = (c, adult) => { try { if (!window.TLXN || !TLXN.people.length) return null; const v = TLXN.villages().slice().sort((a, b) => Math.hypot(a.x - c.x, a.z - c.z) - Math.hypot(b.x - c.x, b.z - c.z))[0]; const L = TLXN.people.filter(p => p.vid === (v && v.id) && p.age >= 30 && /father|mother|grand|single|man|lodger|adult|husband|wife/i.test(p.role + "") || (p.vid === (v && v.id) && p.age >= 30)); return L.length ? L[Math.floor(Math.random() * L.length)] : null; } catch (e) { return null; } };
function nearFig(f, r) { const p = here(); return f && dist2(f.o, p) <= r; }
const useOk = () => api.FOOT.on && !api.INT.on;
// each event: start(c, j) builds it; step(e, dt, c, p) runs it; use(e) is what the use control does (or null); line(e) is the HUD's second line
const EVT = {
  prowler: {
    name: "A prowler at the fence", right: "challenge", wrong: "ignore him", needsFoot: true,
    start(e, c) {
      const ap = approach(c, e.seed); if (!ap) return false;
      const dx = Math.cos(ap.an), dz = Math.sin(ap.an), f = e.f = mkFig("p", e.seed, c.x + dx * ap.r, c.z + dz * ap.r, Math.atan2(-dx, -dz), 1.35);
      f.path = [[c.x + dx * 11, c.z + dz * 11], [c.x + dx * 6.5, c.z + dz * 6.5]]; e.out = [c.x + dx * ap.r, c.z + dz * ap.r]; e.ph = "in"; e.ph_t = 0; e.life = 70; return true;
    },
    step(e, dt, c) {
      const f = e.f; e.ph_t += dt;
      if (e.ph === "in" && !f.path.length) { e.ph = "try"; e.ph_t = 0; }
      if (e.ph === "try") { f.hold = 99; figFace(f, c.x, c.z, dt); if (e.ph_t > 7) { f.hold = 0; e.ph = "gone"; f.vmax = 1.7; f.path = [e.out.slice()]; f.v = 0; resolve(e, false, "Nobody stopped him: he got to the gate, took a lamp bracket and a drum of oil and was gone. The shift counts it against you.", -35, -1); } }
      if (e.ph === "back" || e.ph === "gone") { if (!f.path.length || dist2(f.o, c) > 62) e.done = true; }
    },
    use(e) { if (e.res || !e.f || !nearFig(e.f, TUNE.near + 4) || !(e.ph === "in" || e.ph === "try")) return null; return { label: "CHALLENGE", text: "challenge him", act() { e.f.hold = 0; e.f.vmax = 1.6; e.f.v = 0; e.f.path = [e.out.slice()]; e.ph = "back"; resolve(e, true, "\"Stopp! Hvem er det?\" He puts his hands up, mutters, and goes back the way he came.", 22, 1); } }; },
    line: e => e.res ? "" + (e.ph === "back" ? "He is walking off." : "") : "Someone is working along the fence line."
  },
  fox: {
    name: "A fox at the bins", right: "leave it", wrong: "call out", needsFoot: false,
    start(e, c) {
      const ap = approach(c, e.seed); if (!ap || !POST || !POST.bins) return false; const dx = Math.cos(ap.an), dz = Math.sin(ap.an);
      const f = e.f = mkFig("fox", e.seed, c.x + dx * ap.r, c.z + dz * ap.r, Math.atan2(-dx, -dz), 3.0); f.turn = 3.2;
      f.path = [[POST.bins.x + 0.4, POST.bins.z + 0.9]]; e.out = [c.x + dx * ap.r, c.z + dz * ap.r]; e.ph = "in"; e.ph_t = 0; e.life = 60; return true;
    },
    step(e, dt, c) {
      const f = e.f; e.ph_t += dt;
      if (e.ph === "in" && !f.path.length) { e.ph = "dig"; e.ph_t = 0; }
      if (e.ph === "dig") { f.hold = 99; f.graze = 1; if (e.ph_t > 9) { f.graze = 0; f.hold = 0; f.vmax = 4.2; f.path = [e.out.slice()]; e.ph = "gone"; if (!e.res) resolve(e, true, "Only a fox. You let it have the bins and it went off with a fish head.", 6, 1); } }
      if (e.ph === "run") f.graze = 0;
      if (e.ph === "gone" || e.ph === "run") { if (!f.path.length || dist2(f.o, c) > 62) e.done = true; }
    },
    use(e) { if (e.res || !e.f || !nearFig(e.f, 40) || !(e.ph === "in" || e.ph === "dig")) return null; return { label: "CALL OUT", text: "call out", act() { const f = e.f; f.hold = 0; f.graze = 0; f.vmax = 6; f.v = 1; f.path = [e.out.slice()]; e.ph = "run"; resolve(e, false, "You shouted at a fox. The dog next door started and half the street's lights came on: the plant hears about it.", -12, -1); } }; },
    line: e => e.res ? "" : "Something small is at the bins."
  },
  drunk: {
    name: "A drunk making for the hut", right: "see him home", wrong: "leave him", needsFoot: true,
    start(e, c) {
      const ap = approach(c, e.seed); if (!ap) return false; const dx = Math.cos(ap.an), dz = Math.sin(ap.an), per = personFor(c); e.who = per;
      const f = e.f = mkFig("p", e.seed + 5, c.x + dx * ap.r, c.z + dz * ap.r, Math.atan2(-dx, -dz), 1.0); f.wob = 0.55; f.turn = 1.2;
      f.path = [[c.x + dx * 6, c.z + dz * 6]]; e.out = [c.x + dx * ap.r, c.z + dz * ap.r]; e.ph = "in"; e.ph_t = 0; e.life = 150; return true;
    },
    step(e, dt, c) {
      const f = e.f; e.ph_t += dt;
      if (e.ph === "in" && !f.path.length) { e.ph = "sway"; e.ph_t = 0; f.wob = 0; }
      if (e.ph === "sway") { f.hold = 99; figFace(f, c.x, c.z, dt); if (e.ph_t > 24) { f.hold = 0; f.vmax = 0.9; f.wob = 0.4; f.path = [e.out.slice()]; e.ph = "gone"; resolve(e, false, `${e.who ? e.who.first + " " + e.who.last : "He"} sank down against the door and slept there; the morning crew found him. The shift is docked.`, -25, -1); } }
      if (e.ph === "back" || e.ph === "gone") { if (!f.path.length || dist2(f.o, c) > 62) e.done = true; }
    },
    use(e) { if (e.res || !e.f || !nearFig(e.f, TUNE.near) || !(e.ph === "in" || e.ph === "sway")) return null; return { label: "SEE HIM HOME", text: "see him home", act() { const f = e.f; f.hold = 0; f.vmax = 1.05; f.wob = 0.35; f.v = 0; f.path = [e.out.slice()]; e.ph = "back"; resolve(e, true, `You steered ${e.who ? e.who.first + " " + e.who.last : "him"} back towards the road and he went, grumbling. Quiet, and no harm done.`, 20, 1); } }; },
    line: e => e.res ? "" : e.ph === "in" ? "A man is coming up the track, not quite straight." : "He is swaying by the hut."
  },
  nolights: {
    name: "A sled with no lights", right: "step out", wrong: "stay in the hut", needsFoot: false,
    start(e, c) {
      const ap = approach(c, e.seed); if (!ap) return false; const dx = Math.cos(ap.an), dz = Math.sin(ap.an), f = e.f = mkFig("sled", e.seed + 2, c.x + dx * (ap.r + 40), c.z + dz * (ap.r + 40), Math.atan2(-dx, -dz), 6.4); f.turn = 1.6;
      e.dx = dx; e.dz = dz; f.path = [[c.x + dx * 9 - dz * 5, c.z + dz * 9 + dx * 5]]; e.out = [c.x + dx * (ap.r + 40), c.z + dz * (ap.r + 40)]; e.ph = "in"; e.ph_t = 0; e.life = 50; return true;
    },
    step(e, dt, c, p) {
      const f = e.f; e.ph_t += dt;
      if (e.ph === "in") {
        const bx = p.x - c.x, bz = p.z - c.z, bd = Math.hypot(bx, bz);
        if (bd >= 8 && (bx * e.dx + bz * e.dz) / (bd || 1) >= 0.35 && dist2(f.o, p) < 70) { e.ph = "turn"; f.path = [[f.o.x + Math.sin(f.o.yaw + 2.6) * 14, f.o.z + Math.cos(f.o.yaw + 2.6) * 14], e.out.slice()]; f.vmax = 8; resolve(e, true, "You stepped out into the track and stood in it with the rifle on your back. The sled's rider saw you, swung wide and went back.", 24, 1); }
        else if (!f.path.length) { e.ph = "run"; f.vmax = 7.5; f.path = [[c.x + e.dx * 9 - e.dz * 5 - e.dx * 30, c.z + e.dz * 9 + e.dx * 5 - e.dz * 30], [c.x - e.dx * 80 - e.dz * 20, c.z - e.dz * 80 + e.dx * 20]]; resolve(e, false, "A sled with no lights came right through the post and went off with a pallet of cable. You never left the hut.", -45, -1); }
      }
      if (e.ph === "turn" || e.ph === "run") { if (!f.path.length || dist2(f.o, c) > 95) e.done = true; }
    },
    use: () => null,
    line: e => e.res ? "" : "An engine, but no lights: something is coming up the track."
  },
  delivery: {
    name: "A delivery to sign for", right: "sign", wrong: "ignore him", needsFoot: true,
    start(e, c) {
      const ap = approach(c, e.seed); if (!ap) return false; const dx = Math.cos(ap.an), dz = Math.sin(ap.an), f = e.f = mkFig("p", e.seed + 9, c.x + dx * ap.r, c.z + dz * ap.r, Math.atan2(-dx, -dz), 1.5);
      const bx = api.mesh.box(0.5, 0.34, 0.4, api.mesh.std(0x9c7a4a, 0.9, 0), 0, 0, 0, 0, 0, 0, f.g.userData.torso); bx.position.set(0, 0.5, 0.36);
      f.path = [[c.x + dx * 5, c.z + dz * 5]]; e.out = [c.x + dx * ap.r, c.z + dz * ap.r]; e.ph = "in"; e.ph_t = 0; e.life = 120; return true;
    },
    step(e, dt, c) {
      const f = e.f; e.ph_t += dt;
      if (e.ph === "in" && !f.path.length) { e.ph = "wait"; e.ph_t = 0; }
      if (e.ph === "wait") { f.hold = 99; figFace(f, c.x, c.z, dt); if (e.ph_t > 30) { f.hold = 0; f.vmax = 1.5; f.path = [e.out.slice()]; e.ph = "gone"; resolve(e, false, "Nobody came out to sign: the driver took the parcels back to the van unsigned. The plant docks the shift.", -15, -1); } }
      if (e.ph === "back" || e.ph === "gone") { if (!f.path.length || dist2(f.o, c) > 62) e.done = true; }
    },
    use(e) { if (e.res || !e.f || !nearFig(e.f, 10) || !(e.ph === "in" || e.ph === "wait")) return null; return { label: "SIGN FOR IT", text: "sign for it", act() { const f = e.f; f.hold = 0; f.vmax = 1.5; f.v = 0; f.path = [e.out.slice()]; e.ph = "back"; resolve(e, true, "You signed the sheet: three pallets of fish boxes in the book, and the driver on his way.", 15, 1); } }; },
    line: e => e.res ? "" : "A driver with a box and a clipboard is at the barrier."
  },
  alarm: {
    name: "A false alarm", right: "reset it at the hut", wrong: "let it ring", needsFoot: true,
    start(e, c) { if (!POST || !POST.hut) return false; POST.alarm = true; e.ph = "ring"; e.ph_t = 0; e.life = 40; return true; },
    step(e, dt) { e.ph_t += dt; if (e.ph === "ring" && e.ph_t > 28 && !e.res) { POST.alarm = false; resolve(e, false, "The alarm panel rang itself out for half a minute: the neighbours rang the lensmann's office twice. Docked.", -22, -1); e.done = true; } if (e.res) { POST.alarm = false; e.done = true; } },
    use(e) { if (e.res || !POST || !POST.hut || dist2(here(), POST.hut) > 6) return null; return { label: "RESET ALARM", text: "reset the alarm panel", act() { resolve(e, true, "You reset the panel: a door switch, a gust. Nothing there, and no report to write.", 12, 1); } }; },
    line: e => e.res ? "" : `The alarm panel in the ${POST ? POST.hutWord : "hut"} is ringing. Nobody is about.`
  },
  lamp: {
    name: "The lamp dies", right: "change the bulb", wrong: "work in the dark", needsFoot: true,
    start(e, c) { if (!POST || !POST.lamps.length) return false; e.lamp = POST.lamps[0]; e.lamp.dead = true; POST.lampOn = false; e.ph = "dark"; e.ph_t = 0; e.life = 50; return true; },
    step(e, dt) { e.ph_t += dt; if (e.ph_t > 38 && !e.res) { resolve(e, false, "You worked the rest of the stretch in the dark: the lamp's still out when the night foreman comes. Docked.", -20, -1); e.done = true; } if (e.res) e.done = true; },
    use(e) { if (e.res || !e.lamp || dist2(here(), e.lamp) > 5.5) return null; return { label: "CHANGE BULB", text: "change the bulb", act() { e.lamp.dead = false; POST.lampOn = true; resolve(e, true, "You swapped the bulb from the hut's drawer and the post lit up again.", 12, 1); } }; },
    line: e => e.res ? "" : "The post lamp has gone out."
  },
  quiet: {
    name: "A quiet stretch", right: "stay on the post", wrong: "wander off", needsFoot: false,
    start(e, c) { e.ph = "q"; e.ph_t = 0; e.drift = 0; e.life = 42; return true; },
    step(e, dt, c, p) {
      e.ph_t += dt; if (dist2(p, c) > 14) e.drift += dt;
      if (!e.res && e.drift > 9) { resolve(e, false, "You drifted off the post for the best part of a minute. Nothing happened, but the lamp's ring was empty.", -8, -1); e.done = true; }
      else if (!e.res && e.ph_t > 34) { resolve(e, true, "A quiet stretch. Nothing moved and you stayed put: that is most of the job.", 8, 1); e.done = true; }
    },
    use: () => null, line: e => e.res ? "" : "Nothing moves. Stay by the lamp."
  }
};
const EVIDS = Object.keys(EVT);
function resolve(e, right, text, dPay, dSt) { if (e.res) return; e.res = right ? "right" : "wrong"; pushLog(right, text, dPay, right ? dSt : dSt); }
function evStart(id, forced) {
  const j = S().active; if (!j || j.type !== "shift" || j.state !== "on" || !POST || EV.cur) return false;
  const e = { id, seed: hashS(j.id + id + (EV.idx++)), t: 0, res: null, done: false, f: null, ph: "" }, c = { x: POST.x, z: POST.z };
  EV.cur = e; let ok = false; try { ok = EVT[id].start(e, c, j); } catch (er) { console.warn("tlx-armed event", id, er); }
  if (!ok) { evEnd(true); return false; }
  api.toast(EVT[id].line(e), "info"); return true;
}
function evEnd(silent) { const e = EV.cur; if (!e) return; if (e.f) figFree(e.f); if (POST) { POST.alarm = false; if (e.lamp) { e.lamp.dead = false; POST.lampOn = true; } } EV.cur = null; EV.wait = 6; }
function evTick(dt) {
  const e = EV.cur, j = S().active; if (!e) return; dt *= TUNE.evK || 1;
  const p = here(), c = { x: POST.x, z: POST.z };
  try { EVT[e.id].step(e, dt, c, p); } catch (er) { console.warn("tlx-armed event step", e.id, er); e.done = true; }
  e.t += dt; if (e.f) { figMove(e.f, dt); if (e.f.R) { riderPlace(e.f.R, e.f.o.x, e.f.o.z, e.f.o.yaw, dt); } else figDraw(e.f, dt); }
  if (e.t > e.life && !e.res) { resolve(e, false, "The moment went by and you did nothing about it.", -10, -1); e.done = true; }
  if (e.done) evEnd();
}

/* ---------------- the tail ---------------- */
const TAIL = { on: false, mode: "", gap: 0, G: 60, R: null, hold: 0, stopT: 0, los: 0, age: 0, pace: 0, crumbs: [], cum: 0, last: null, force: false, sp: 0, pp: null, yaw: 0, away: 0 };
function tailReset() { if (TAIL.R) { api.scene.remove(TAIL.R.g); } Object.assign(TAIL, { on: false, mode: "", R: null, hold: 0, stopT: 0, los: 0, age: 0, pace: 0, crumbs: [], cum: 0, last: null, sp: 0, pp: null, away: 0 }); }
function crumbPos(c) {
  const a = TAIL.crumbs; if (a.length < 2) return a[0] ? { x: a[0].x, z: a[0].z, yaw: 0 } : null;
  if (c <= a[0].c) { const d = Math.hypot(a[1].x - a[0].x, a[1].z - a[0].z) || 1; return { x: a[0].x, z: a[0].z, yaw: Math.atan2(a[1].x - a[0].x, a[1].z - a[0].z) }; }
  let lo = 0, hi = a.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (a[m].c <= c) lo = m; else hi = m; }
  const A = a[lo], B = a[hi], u = clamp((c - A.c) / (B.c - A.c || 1), 0, 1);
  return { x: A.x + (B.x - A.x) * u, z: A.z + (B.z - A.z) * u, yaw: Math.atan2(B.x - A.x, B.z - A.z) };
}
function losClear(a, b) {
  const w = W(), ya = w.surf(a.x, a.z) + 1.5, yb = w.surf(b.x, b.z) + 1.5;
  for (let i = 1; i < 12; i++) { const u = i / 12; if (w.surf(a.x + (b.x - a.x) * u, a.z + (b.z - a.z) * u) > ya + (yb - ya) * u) return false; }
  return true;
}
function tailSpawn(gap0) {
  const j = S().active; if (!j) return false; const R = rng(hashS(j.id + "tail"));
  TAIL.G = TUNE.tailGapMin + R() * (TUNE.tailGapMax - TUNE.tailGapMin); TAIL.gap = gap0 === undefined ? TUNE.tailGap0 : gap0;
  TAIL.R = buildRider(hashS(j.id) + 7); TAIL.on = true; TAIL.mode = "follow"; TAIL.hold = 0; TAIL.stopT = 0; TAIL.los = 0; TAIL.age = 0; TAIL.away = 0; TAIL.v = 0;
  const q = crumbPos(TAIL.cum - TAIL.gap); if (q) { TAIL.x = TAIL.px = q.x; TAIL.z = TAIL.pz = q.z; TAIL.yaw = q.yaw; riderPlace(TAIL.R, q.x, q.z, q.yaw, 0); }
  return true;
}
function tailTick(dt, j) {
  const p = here();
  // the player's breadcrumb trail
  if (!TAIL.last) { TAIL.last = { x: p.x, z: p.z }; TAIL.crumbs.push({ x: p.x, z: p.z, c: TAIL.cum }); }
  const d = Math.hypot(p.x - TAIL.last.x, p.z - TAIL.last.z);
  if (d > 40) { TAIL.last = { x: p.x, z: p.z }; TAIL.crumbs.length = 0; TAIL.crumbs.push({ x: p.x, z: p.z, c: TAIL.cum }); }       // a jump (a teleport) starts the trail afresh
  else if (d >= 2.5) { TAIL.cum += d; TAIL.last = { x: p.x, z: p.z }; TAIL.crumbs.push({ x: p.x, z: p.z, c: TAIL.cum }); while (TAIL.crumbs.length > 2 && TAIL.crumbs[1].c < TAIL.cum - 360) TAIL.crumbs.shift(); }
  const sp = TAIL.pp ? Math.hypot(p.x - TAIL.pp.x, p.z - TAIL.pp.z) / Math.max(dt, 1e-3) : 0; TAIL.pp = { x: p.x, z: p.z };
  TAIL.sp += (sp - TAIL.sp) * (1 - Math.exp(-3 * dt)); const vp = Math.min(TAIL.sp, 60);
  if (!TAIL.on) {
    if (j.tail && !j.tailDone && TAIL.cum >= TUNE.tailTrigger && vp >= TUNE.moveV) { const q = crumbPos(TAIL.cum - TUNE.tailGap0); if (q && Math.hypot(q.x - p.x, q.z - p.z) >= 60) { tailSpawn(); api.toast("An engine behind you, a long way back, and it is holding your line.", "warn"); } }
    return;
  }
  if (TAIL.mode === "follow") {
    TAIL.age += dt;
    if (vp < TUNE.stopV) TAIL.stopT += dt; else TAIL.stopT = Math.max(0, TAIL.stopT - dt * 2);
    const rush = TAIL.stopT > 1.2, G = rush ? 4 : TAIL.G;
    const vt = clamp(vp + (TAIL.gap - G) * 0.35, 0, rush ? TUNE.tailV : Math.min(TUNE.tailV, vp + 6)), prev = TAIL.gap;
    TAIL.gap = Math.max(4, TAIL.gap - (vt - vp) * dt); TAIL.v = vt;
    const q = crumbPos(TAIL.cum - TAIL.gap); if (q) { TAIL.x = q.x; TAIL.z = q.z; TAIL.yaw += wrap(q.yaw - TAIL.yaw) * Math.min(1, dt * 6); }
    let ox = 0, oz = 0; if (TAIL.gap < 12) { ox = Math.cos(TAIL.yaw) * 2.4 * (1 - TAIL.gap / 12); oz = -Math.sin(TAIL.yaw) * 2.4 * (1 - TAIL.gap / 12); }
    TAIL.px = TAIL.x + ox; TAIL.pz = TAIL.z + oz; riderPlace(TAIL.R, TAIL.px, TAIL.pz, TAIL.yaw, dt);
    // giving up: you outrun it, you hold your pace for a stretch, you break its sight
    const straight = Math.hypot(TAIL.px - p.x, TAIL.pz - p.z);
    if (vp >= 9 && TAIL.gap <= TAIL.G + 10) TAIL.hold += dt;       // patience runs while it sits on your tail, not while it is still closing else if (vp < 5) TAIL.hold = Math.max(0, TAIL.hold - dt * 2);
    if (!losClear({ x: TAIL.px, z: TAIL.pz }, p)) TAIL.los += dt; else TAIL.los = 0;
    if (TAIL.gap > TUNE.outpace) return tailAway(j, "outran");
    if (TAIL.hold >= TUNE.patience) return tailAway(j, "paced");
    if (TAIL.los >= TUNE.losT && TAIL.gap > 14) return tailAway(j, "sight");
    // caught: stopped with it alongside for a few seconds
    if (straight <= TUNE.snatchR && TAIL.stopT >= TUNE.snatchT) { snatch(j); }
  } else if (TAIL.mode === "away") {
    TAIL.away += dt; const sp2 = 9 + Math.min(4, TAIL.away), a = TAIL.yaw + TAIL.turn * Math.min(1, TAIL.away / 1.5);
    TAIL.yaw += wrap(TAIL.aimYaw - TAIL.yaw) * Math.min(1, dt * 1.6); TAIL.px += Math.sin(TAIL.yaw) * sp2 * dt; TAIL.pz += Math.cos(TAIL.yaw) * sp2 * dt; riderPlace(TAIL.R, TAIL.px, TAIL.pz, TAIL.yaw, dt);
    if (TAIL.away > 7 || Math.hypot(TAIL.px - p.x, TAIL.pz - p.z) > 230) { j.tailDone = true; tailReset(); }
  }
}
function tailAway(j, why) {
  TAIL.mode = "away"; TAIL.away = 0; TAIL.why = why; TAIL.turn = 0; TAIL.aimYaw = TAIL.yaw + (why === "sight" ? 1.9 : Math.PI * 0.8) * (Math.random() < 0.5 ? 1 : -1);
  j.tailGone = why;
  api.toast(why === "outran" ? "The sled behind you falls away: you have left it for dead." : why === "paced" ? "The sled behind you has given up: you held your line and it never closed." : "You broke its line of sight over the rise: the sled behind you turns away.", "good");
}
function snatch(j) { api.toast("The sled is alongside and you are standing still: a hand goes for the case and it is gone.", "warn"); fail(j, "snatched"); }

/* ---------------- accepting, finishing, failing ---------------- */
let force = {};
function accept(id) {
  const s = S();
  if (!TLX.on("armedwork")) return "off";
  const q = qual(); if (!q.ok) { api.toast("Not qualified yet: " + q.miss[0], "warn"); return "locked"; }
  if (s.active) { api.toast("You already have an armed job: finish it or abandon it first.", "warn"); return "busy"; }
  const o = s.offers.find(x => x.id === id); if (!o) return "none";
  const j = JSON.parse(JSON.stringify(o)); j.acc = api.GS.hour; j.seq = ++s.seq;
  if (j.type === "courier") { j.state = "collect"; j.by = api.GS.hour + TUNE.collectH; if (force.tail) { j.tail = true; force.tail = false; } j.tailDone = false; }
  else { j.state = "go"; j.by = api.GS.hour + TUNE.shiftGoH; j.padj = 0; j.stadj = 0; j.outT = 0; j.log = []; j.h0 = 0; j.evDone = 0;
    const R = rng(hashS("shift:" + j.id)), n = j.n, slot = (j.len - 0.7) / n, ids = EVIDS.slice().sort(() => R() - 0.5); j.sched = [];
    for (let i = 0; i < n; i++) j.sched.push({ o: Math.round((0.35 + i * slot + R() * slot * 0.25) * 100) / 100, id: ids[i % ids.length], done: false });
    if (force.events) { j.sched = force.events.map((id2, i) => ({ o: 0.3 + i * 0.6, id: id2, done: false })); force.events = null; }
  }
  s.active = j; s.offers = s.offers.filter(x => x.id !== id);
  if (j.type === "shift") { const def = postDef(j.post); try { dropPost(); POST = buildPost(def, j.spot); } catch (e) { console.error("tlx-armed post", e); } }
  const emp = EMP[j.emp];
  api.toast(j.type === "courier" ? `Armed courier for ${emp.name}: collect ${CASEBY[j.kind].item} at ${j.from.name}. ${money(payNow(j))}.` : `Guard shift for ${emp.name}: ${postDef(j.post).name}, ${j.len} h. ${money(payNow(j))}. Be there within ${TUNE.shiftGoH} h.`, "good");
  api.save(); try { api.TABLET.refresh("armed"); } catch (e) { } return "ok";
}
function cleanup() { tailReset(); evEnd(true); dropPost(); EV.wait = 0; setHud(""); hudText = ""; }
function newsPost(j, ok, text) {
  if (!window.TLXN || !TLXN.post) return;
  try {
    const pos = j.type === "shift" ? j.spot : (j.state === "carry" ? j.to : j.from), per = contact(j.emp);
    TLXN.post({ kind: "armed", who: ok && per ? per : "you", x: pos.x, z: pos.z, text, data: { sys: "armed", what: j.type, emp: j.emp, ok, kind: j.kind || j.post } });
  } catch (e) { }
}
function finish(j) {
  const s = S(); let pay = j.type === "courier" ? j.pay : Math.max(Math.round(j.pay * 0.4), j.pay + j.padj), st = 3 + (j.type === "shift" ? 0 : 0);
  pay = Math.round(pay * api.payMul() * (1 + 0.03 * level(s.standing.all)) / 5) * 5; api.GS.cash += pay;
  addStanding(j.emp, st);
  const emp = EMP[j.emp];
  let text;
  if (j.type === "courier") {
    const per = contact(j.emp); text = `${CASEBY[j.kind].name} delivered at ${j.to.name} for ${emp.name}: ${money(pay)}.`;
    api.toast(`${text} Standing ${levelName(s.standing.all)} (${s.standing.all}).`, "good");
    newsPost(j, true, per ? `${per.first} ${per.last} at ${emp.name} had ${CASEBY[j.kind].item} delivered at ${j.to.name} by the courier with a rifle on his back.` : `${emp.name}'s ${CASEBY[j.kind].name.toLowerCase()} reached ${j.to.name} on time with an armed courier.`);
  } else {
    const def = postDef(j.post); text = `Guard shift at ${def.short} done for ${emp.name}: ${money(pay)}.`;
    api.toast(`${text} Standing ${levelName(s.standing.all)} (${s.standing.all}).`, "good");
    newsPost(j, true, `${emp.name} had a guard on ${def.short} overnight. ${j.log.length ? "Quiet enough" : "Nothing happened"}, they say.`);
  }
  record(j, true, text, pay, st); s.rec.best = Math.max(s.rec.best || 0, pay);
  s.active = null; cleanup(); api.save(); try { api.TABLET.refresh("armed"); api.TABLET.refresh("jobs"); } catch (e) { }
}
const FAILS = {
  crash: "You came off hard: the case is lost in the snow and the employer is told.", rifle: "The rifle is no longer on your back: the case is taken back and the run withdrawn.",
  late: "Out of time: the case was needed before you got there.", snatched: "The case was snatched.", off: "You left the post: the shift is cancelled.",
  noshow: "You never made it to the post: the shift went to someone else.", abandon: "You gave the job up.", slept: "You were away from the post for hours: the shift is cancelled.", expired: "Nobody collected the case in time: it was given to another courier.", dead: "You blacked out: the job went to someone else."
};
function fail(j, why) {
  const s = S(); if (!s.active || s.active !== j) return;
  const emp = EMP[j.emp], st = why === "abandon" ? -1 : why === "expired" || why === "noshow" ? -1 : -4, def = j.type === "shift" ? postDef(j.post) : null;
  addStanding(j.emp, st);
  const what = j.type === "courier" ? `${CASEBY[j.kind].name} for ${emp.name}` : `guard shift at ${def.short} for ${emp.name}`, text = `${what}: ${FAILS[why] || "failed."}`;
  api.toast(`${text}`, "warn"); record(j, false, text, 0, st);
  newsPost(j, false, j.type === "courier" ? `${emp.name}'s ${CASEBY[j.kind].name.toLowerCase()} didn't get through: the armed courier ${why === "crash" ? "came off his sled out on the fell" : why === "snatched" ? "was run down by another sled" : "never made the drop"}.` : `${emp.name}'s post at ${def.short} was left ${why === "off" ? "unwatched in the night" : "without its guard"}.`);
  s.active = null; cleanup(); api.save(); try { api.TABLET.refresh("armed"); api.TABLET.refresh("jobs"); } catch (e) { }
}
function abandon() { const s = S(); if (s.active) fail(s.active, "abandon"); }

// the crash hook (tracklayer.js crashEject)
function crashed(spd) { const j = S() && S().active; if (!j || j.type !== "courier" || j.state !== "carry" || !TLX.on("armedwork")) return; if (spd >= TUNE.crashV) fail(j, "crash"); }

/* ---------------- the use control ---------------- */
const PROV = {
  use() {
    const s = S(), j = s && s.active; if (!j || !TLX.on("armedwork") || !api.FOOT.on || api.INT.on) return null;
    const p = api.FOOT;
    if (j.type === "courier") {
      if (j.state === "collect" && dist2(p, j.from) <= TUNE.takeR) return { label: "TAKE CASE", hint: () => `${api.keyHint("use", "take the case")} · ${CASEBY[j.kind].item}`, act: () => takeCase(j) };
      if (j.state === "carry" && dist2(p, j.to) <= TUNE.handR) return { label: "HAND OVER", hint: () => `${api.keyHint("use", "hand the case over")} · at ${j.to.name}`, act: () => handOver(j) };
      return null;
    }
    if (j.type === "shift" && j.state === "on" && EV.cur && !EV.cur.res) { const u = EVT[EV.cur.id].use(EV.cur); if (u) return { label: u.label, hint: () => api.keyHint("use", u.text), act: u.act }; }
    return null;
  },
  digging: () => false
};
function takeCase(j) {
  const q = qual(); if (!q.ok) { api.toast("You can't take it: " + q.miss[0], "warn"); return; }
  j.state = "carry"; j.took = api.GS.hour; j.due = api.GS.hour + j.limH; tailReset();
  api.toast(`Case taken (${CASEBY[j.kind].item}): the rifle stays on your back. ${hrs(j.limH)} to ${j.to.name}.`, "good"); api.save(); try { api.TABLET.refresh("jobs"); } catch (e) { }
}
function handOver(j) {
  if (!window.TLXGUN || !TLXGUN.gun()) { fail(j, "rifle"); return; }
  finish(j);
}

/* ---------------- ticking ---------------- */
let dayCheck = 0, hudAcc = 0;
function tick(dt) {
  const s = S(); if (!api || !s || !built || dt <= 0) return;
  postLight(dt);
  if (!api.started()) return;
  dayCheck -= dt; if (dayCheck <= 0) { dayCheck = 2; try { if (TLX.on("armedwork")) refreshOffers(false); } catch (e) { console.warn("tlx-armed offers", e); } }
  const j = s.active;
  if (j) {
    if (!TLX.on("armedwork")) { s.active = null; cleanup(); }
    else if (api.GS.dead) { /* a blackout: the job goes on */ }
    else if (j.type === "courier") courierTick(dt, j); else shiftTick(dt, j);
  }
  hudAcc -= dt; if (hudAcc <= 0) { hudAcc = 0.25; hudText = j ? composeHud() : ""; setHud(hudText); }
}
function courierTick(dt, j) {
  const GS = api.GS;
  if (j.state === "collect") { if (GS.hour > j.by) fail(j, "expired"); return; }
  if (!window.TLXGUN || !TLXGUN.gun()) { fail(j, "rifle"); return; }
  if (GS.hour > j.due) { fail(j, "late"); return; }
  tailTick(dt, j);
}
function shiftTick(dt, j) {
  const GS = api.GS, c = j.spot, p = here();
  if (!POST) { try { POST = buildPost(postDef(j.post), j.spot); } catch (e) { console.error("tlx-armed post", e); } }
  if (j.state === "go") {
    if (GS.hour > j.by) { fail(j, "noshow"); return; }
    if (dist2(p, c) <= TUNE.perim - 4) {
      j.state = "on"; j.h0 = GS.hour; j.lastH = GS.hour; j.outT = 0; EV.wait = 5;
      api.toast(`On post at ${postDef(j.post).short}. The shift runs ${clock(j.h0)} to ${clock(j.h0 + j.len)}. Stay inside the lamp's ring (${TUNE.perim} m); ${TUNE.grace} s outside it and the shift is off.`, "good");
      newsPost(j, true, `${EMP[j.emp].name} has a guard on at ${postDef(j.post).short} tonight.`); api.save();
    }
    return;
  }
  if (GS.hour - j.lastH > 1.2) { fail(j, "slept"); return; }
  j.lastH = GS.hour;
  const d = dist2(p, c);
  if (d > TUNE.perim) { j.outT += dt; if (j.outT > TUNE.grace) { fail(j, "off"); return; } } else j.outT = Math.max(0, j.outT - dt * 2);
  const el = GS.hour - j.h0;
  if (EV.cur) evTick(dt);
  else {
    EV.wait -= dt;
    const nx = j.sched.find(q => !q.done);
    if (nx && el >= nx.o && EV.wait <= 0 && el < j.len - 0.15) { nx.done = true; j.evDone++; if (!evStart(nx.id)) { nx.done = true; } }
  }
  if (el >= j.len && !EV.cur) finish(j);
  else if (el >= j.len + 0.35) finish(j);
}

/* ---------------- the Jobs row ---------------- */
function jobRow() {
  const j = S() && S().active; if (!j || !TLX.on("armedwork")) return null;
  const U = api.ui, pay = "~" + money(payNow(j)), emp = EMP[j.emp];
  if (j.type === "courier") {
    const tgt = j.state === "collect" ? j.from : j.to, title = j.state === "collect" ? `Collect: ${CASEBY[j.kind].name}` : `Armed courier: ${CASEBY[j.kind].name} → ${j.to.name}`;
    const left = j.state === "carry" ? ` · ${hrs(Math.max(0, j.due - api.GS.hour))} left` : "";
    return { obj: j, kind: "armed", tgt: { x: tgt.x, z: tgt.z, name: tgt.name }, col: "#ff8a3a", title, chips: U.chip("ARMED COURIER", "due") + U.chip(emp.name.toUpperCase()), meta: `${CASEBY[j.kind].item}${left} · rifle on your back`, pay,
      hud: d => ({ title, sub: `${U.fmtMi(d)} · ${pay}${left}` }) };
  }
  const def = postDef(j.post), title = `Guard shift: ${def.name}`;
  const left = j.state === "on" ? ` · ${hrs(Math.max(0, j.h0 + j.len - api.GS.hour))} left` : ` · be there by ${clock(j.by)}`;
  return { obj: j, kind: "armed", tgt: { x: j.spot.x, z: j.spot.z, name: def.name }, col: "#ff8a3a", title, chips: U.chip("GUARD SHIFT", "due") + U.chip(emp.name.toUpperCase()), meta: `${j.len} h on post${left}`, pay,
    hud: d => ({ title, sub: `${U.fmtMi(d)} · ${pay}${left}` }) };
}

/* ---------------- the Vakt app ---------------- */
let tabSel = "work";
const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.8 5 5.6v5.3c0 4.3 2.8 7.6 7 9.3 4.2-1.7 7-5 7-9.3V5.6z"/><path d="M9.2 12.6l2 2 3.7-4"/></svg>';
function offerCard(o, q) {
  const U = api.ui, emp = EMP[o.emp], pay = money(payNow(o));
  let title, meta, note, chips = U.chip(emp.state ? "STATE" : "COMPANY") + U.chip(emp.name.toUpperCase());
  if (o.type === "courier") {
    const c = CASEBY[o.kind]; title = `${c.name} → ${o.to.name}`; chips = U.chip("ARMED COURIER", "due") + chips + (o.tail ? "" : "");
    meta = `${esc(c.item)} · ${esc(o.from.name)} → ${esc(o.to.name)} · ${U.fmtMi(o.dist)} · ${hrs(o.limH)} on the clock once you have it · the rifle stays on your back`;
    note = esc(c.why) + ` <br>Contact: ${esc(contactLine(o.emp))}.`;
  } else {
    const p = postDef(o.post); title = p.name; chips = U.chip("GUARD SHIFT", "due") + (o.payday ? U.chip("PAYROLL DAY", "ok") : "") + chips;
    meta = `${o.len} h on post · the shift starts when you reach it · stay inside ${TUNE.perim} m of the lamp`;
    note = `Things happen on a shift: challenge, sign, watch, or do nothing. Contact: ${esc(contactLine(o.emp))}.`;
  }
  return U.tabCard({ tf: "aw:" + o.id, title, chips, meta, note, warn: q.ok ? "" : "Locked: " + q.miss.join(" "), pay, act: "awacc:" + o.id, actLabel: q.ok ? "TAKE IT" : "LOCKED", blocked: !q.ok });
}
function render(el) {
  const s = S(), U = api.ui;
  let h = U.tabHead("VAKT · ARMED WORK", "Vakt", api.fmtCash(api.GS.cash));
  h += `<div class="tsub"><button type="button" class="tbtn${tabSel === "work" ? "" : " ghost"}" data-act="awtab:work">Work</button> <button type="button" class="tbtn${tabSel === "stand" ? "" : " ghost"}" data-act="awtab:stand">Standing</button></div>`;
  if (!TLX.on("armedwork")) {
    h += `<p class="tnote2">Armed work is switched off in Settings &gt; Options, so no armed jobs are offered. Switch "Armed work" back on to see the board.</p>`;
  } else if (tabSel === "work") {
    const q = qual(), j = s.active;
    if (!q.ok) { h += U.sec("Not qualified yet", "what is missing"); h += q.miss.map(m => `<div class="tcard"><div class="tcb"><div class="tcm">${esc(m)}</div></div></div>`).join(""); }
    if (j) {
      const row = jobRow(), left = j.type === "courier" ? (j.state === "collect" ? `collect it by ${clock(j.by)}` : `${hrs(Math.max(0, j.due - api.GS.hour))} left`) : (j.state === "go" ? `be there by ${clock(j.by)}` : `${hrs(Math.max(0, j.h0 + j.len - api.GS.hour))} left`);
      h += U.sec("Your job", left);
      h += U.tabCard({ tf: "aw:act", title: row.title, chips: row.chips, meta: esc(row.meta), pay: row.pay, act: "awdrop", actLabel: "ABANDON" });
    }
    refreshOffers(false);
    h += U.sec(`Today's board · ${s.offers.length} offered`, "new every day");
    h += s.offers.length ? s.offers.map(o => offerCard(o, q)).join("") : `<p class="tnote2">${j ? "Nothing else on the board until you finish this one." : "The board is empty: tomorrow."}</p>`;
    h += `<p class="tnote2">One armed job at a time. Armed standing with each employer raises the pay a little. A shift or a run you walk away from costs standing.</p>`;
  } else {
    const st = s.standing, r = s.rec, lv = level(st.all), nx = LEVELS[lv + 1];
    h += U.sec("Armed standing", `${levelName(st.all)} · ${st.all} points`);
    h += `<div class="tsml2"><div class="tsm2 tprow"><b>Overall</b><span>${levelName(st.all)} · ${st.all}${nx ? ` · ${nx[0] - st.all} to ${nx[1]}` : " · the top"} · +${lv * 3}% pay</span></div></div>`;
    h += U.sec("By employer", "");
    h += `<div class="tsml2">` + Object.keys(EMP).map(k => { const e = r.byEmp[k], p = st.emp[k] || 0; return `<div class="tsm2 tprow"><b>${esc(EMP[k].name)}</b><span>${e || p ? `${levelName(p)} · ${p} · ${e ? e.done : 0} done, ${e ? e.failed : 0} failed` : "no record"}</span></div>`; }).join("") + `</div>`;
    h += U.sec("Your record", "");
    h += `<div class="tsml2"><div class="tsm2 tprow"><b>Jobs</b><span>${r.done} done · ${r.failed} failed</span></div><div class="tsm2 tprow"><b>Runs and shifts</b><span>${r.courier} courier runs · ${r.shifts} guard shifts</span></div><div class="tsm2 tprow"><b>Earned</b><span>${money(r.paid)}${r.best ? " · best " + money(r.best) : ""}</span></div></div>`;
    if (s.last.length) { h += U.sec("Recent", ""); h += `<div class="tsml2">${s.last.map(q => `<div class="tsm2 tprow"><b>${esc(q.d)}</b><span>${esc(q.text)}${q.ok ? "" : ""}${q.st ? " · " + (q.st > 0 ? "+" : "") + q.st : ""}</span></div>`).join("")}</div>`; }
  }
  el.innerHTML = `<div class="tapp">${h}</div>`;
  for (const b of el.querySelectorAll("[data-act^='awtab:']")) b.addEventListener("click", () => { tabSel = b.dataset.act.slice(6); render(el); });
  for (const b of el.querySelectorAll("[data-act^='awacc:']")) b.addEventListener("click", () => { accept(b.dataset.act.slice(6)); });
  for (const b of el.querySelectorAll("[data-act='awdrop']")) b.addEventListener("click", () => { abandon(); });
}

/* ---------------- register ---------------- */
function sane(s, resume) {
  const n = (v, d) => Number.isFinite(+v) ? +v : d, isO = o => o && typeof o === "object" && !Array.isArray(o);
  s.day = Math.floor(n(s.day, -1)); s.offers = Array.isArray(s.offers) ? s.offers.filter(o => isO(o) && o.id && (o.type === "courier" || o.type === "shift") && EMP[o.emp] && (o.type === "courier" ? CASEBY[o.kind] && isO(o.from) && isO(o.to) : postDef(o.post) && isO(o.spot))) : [];
  if (!isO(s.standing)) s.standing = { all: 0, emp: {} }; s.standing.all = Math.max(0, Math.floor(n(s.standing.all, 0))); if (!isO(s.standing.emp)) s.standing.emp = {};
  for (const k of Object.keys(s.standing.emp)) if (!EMP[k]) delete s.standing.emp[k]; else s.standing.emp[k] = Math.max(0, Math.floor(n(s.standing.emp[k], 0)));
  if (!isO(s.rec)) s.rec = {}; s.rec = Object.assign({ done: 0, failed: 0, paid: 0, courier: 0, shifts: 0, best: 0, byEmp: {} }, s.rec); if (!isO(s.rec.byEmp)) s.rec.byEmp = {};
  s.last = Array.isArray(s.last) ? s.last.filter(isO).slice(0, 12) : []; s.seq = Math.floor(n(s.seq, 0));
  const a = s.active; if (!(isO(a) && EMP[a.emp] && ((a.type === "courier" && CASEBY[a.kind] && isO(a.from) && isO(a.to)) || (a.type === "shift" && postDef(a.post) && isO(a.spot))))) s.active = null;
  else { if (a.type === "courier") { if (resume) { a.tail = false; a.tailDone = true; } } else { a.padj = n(a.padj, 0); a.stadj = n(a.stadj, 0); if (resume) a.outT = 0; a.log = Array.isArray(a.log) ? a.log : []; a.sched = Array.isArray(a.sched) ? a.sched : []; a.lastH = n(a.lastH, n(a.h0, 0)); } }
}
TLX.register({
  id: "armed", v: 1,
  state0: () => ({ day: -1, offers: [], active: null, standing: { all: 0, emp: {} }, rec: { done: 0, failed: 0, paid: 0, courier: 0, shifts: 0, best: 0, byEmp: {} }, last: [], seq: 0 }),
  migrate: st => st,
  init(a) {
    api = a; T = a.THREE; built = false;
    const s = S(); if (!s) return; sane(s, true);
    cleanup(); EV.cur = null; EV.idx = 0; force = {};
    if (a.jobx && !a.jobx.includes(jobRow)) a.jobx.push(jobRow);
    if (a.footx && !a.footx.includes(PROV)) a.footx.push(PROV);
    if (a.warmx && !a.warmx.includes(postWarm)) a.warmx.push(postWarm);
    a.TABLET.register({ id: "armed", name: "Vakt", icon: ICON, order: 8.7, live: 6, badge: () => { const j = S() && S().active; return j ? "!" : ""; }, render });
    built = true;
    try { if (s.active && s.active.type === "shift") { s.active.state = s.active.state === "on" ? "on" : "go"; if (s.active.state === "on") s.active.lastH = a.GS.hour; POST = buildPost(postDef(s.active.post), s.active.spot); } } catch (e) { console.warn("tlx-armed resume", e); }
  },
  tick,
  save() { sane(S()); }
});

window.TLXAW = { S, qual, accept, abandon, refreshOffers, standing, level, levelName, postDef, POSTS, CASES, EMP, EVT, EV, TAIL, TUNE, losClear, findSpot, spotOf: id => findSpot(postDef(id)), payNow, crashed,
  force: o => { force = Object.assign(force, o || {}); return force; }, tailNow: gap => tailSpawn(gap), evStart, evEnd, hud: () => hudText, get post() { return POST; }, PROV, jobRow, takeCase, handOver, finish, fail, here };
})();
