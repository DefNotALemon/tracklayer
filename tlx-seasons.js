// Tracklayer — Four Seasons (G4 milestone 9, loop/EXPANSION.md "9. Four seasons"). Loaded after tlx-vehicles.js / tlx-roads.js.
//
// Winter stays the heart. Everything here is a function of the calendar date (plus the melt the base game already runs),
// so almost nothing is saved.
//
//  9.1 A snow-free world WITHOUT a second snow shader: the terrain shader already shows earth and heather where the melt has
//      taken the snow (uSpr/uWet). This file only drives one new uniform on it (uTint, a vec3 on the bare ground: mud brown,
//      summer green, autumn russet, frost white) and the colours of the two tree cap materials (a birch's snow-tops become
//      leaves: bare buds, green, gold, then bare again; a pine's become dark needles as its snow goes). A uniform and two
//      material colours: no new mesh, no new draw call, no new shader program (x9_seasons asserts it). Frost: on autumn
//      nights and mornings the ground and the leaves whiten, gone by mid-morning. Open lakes already come with the melt.
//  9.2 Mud season (April to mid May, a tail in early June, and wherever the road is not the town's paved streets): the
//      roads go soft. A truck gets less grip (TLXV.addGrip) and heavier rolling (TLXV.addRoll, new in tlx-vehicles v38);
//      a sled on a mud road drags. Off the road the ground is soggy but much less so. A line in the driving hint says so.
//  9.3 Playable summer and autumn. The base game's CAL.summerSkip fired on 1 June every year. With the option on, a new day
//      in June to October is a normal day (the day-change hooks run, Mondays settle wages and lets as in winter) and the
//      Seasons app offers the skip to 1 November from ANY day. A skip settles the skipped weeks: the bills (SEASON.addBill:
//      wages, lets, caches), dust and grit gathering in every depot and property (less where a caretaker works), and the
//      wear of vehicles standing out all summer (less if they stand at the garage). On 1 November after a played summer the
//      winter comes back (the refreeze). Off = the base game's automatic skip, nothing else changes.
//  9.4 Four-wheelers, side-by-sides and golf carts: three rows in the vehicles table (no licence), with the pickup's body
//      (a bespoke open-frame model is not built yet) and their own numbers: light, cheap, knobbly tyres, open to the weather.
//      Year-round parcels: the board already thins to half in summer, never to nothing; x9_seasons checks it.
//
// SAVED under x.sys.seasons: { played, skips, days, winters }. Options: seasonlook, playsummer, summerwear, atvs.
(() => {
"use strict";
/* ---------------- tunables ---------------- */
const MUD = { grip: 0.45, roll: 1.1, off: 0.3, sled: 0.9, min: 0.02, hint: 0.25 };   // grip lost / rolling gained at full mud on a road; off-road share; sled drag per s; below this none; hint above
const WEAR = { perWeek: 0.6, garaged: 0.4, floor: 30, garageR: 60, storeWeek: 5 };  // % condition lost a week outside, share of it if parked at the garage, the least it ever wears to, $ a week per vehicle
const LOOK = {                                                                     // colours on the bare ground (multiplies its earth) and on the cap meshes
  mud: [0.85, 0.8, 0.75], green: [0.9, 1.3, 0.8], russet: [1.5, 1.0, 0.6], dull: [1.15, 0.95, 0.8], frost: [1.45, 1.5, 1.6],
  bud: [0.4, 0.31, 0.24], leaf: [0.3, 0.62, 0.2], gold: [0.95, 0.72, 0.16], needle: [0.16, 0.28, 0.17], white: [1, 1, 1]
};
// calendar months as month + day fraction (Apr 1 = 3.0): when each stage runs
const T = { leaf0: 4.29, leaf1: 5.13, gr0: 4.45, gr1: 5.61, yel0: 8.0, yel1: 8.87, rus0: 8.13, rus1: 9.13, drop0: 9.13, drop1: 9.87, fr0: 8.29, fr1: 9.29 };
const VEH = [   // 9.4: rows pushed onto TLXV.VEHICLES; fields not named here are the pickup's (body, wheels, hull, door)
  { id: "atv", name: "Fjellhjuling 4x4", kind: "four-wheeler", year: 2022, cost: 3400, open: true, opt: "atvs",
    blurb: "A light farm four-wheeler with knobbly tyres. It floats over bare ground and mud a pickup wallows in, and hauls three parcels on its racks. In powder it sinks like everything with wheels.",
    spec: "four-wheeler · three parcels on the racks · no licence", how: "For summer and the mud season, and short hauls any time. Nothing keeps the cold off you.",
    mass: 360, power: 18000, fmax: 2800, top: 24, revTop: 3.6, fuel: 14, burn: 0.45, slots: 3, cabCold: 0.95, hitchKg: 500, hitchZ: -3.1,
    mu: { hard: 0.55, loose: 0.34, ice: 0.14, wet: 0.09 }, paint: 0x2f6a3c, eye: [0.4, 1.63, -0.1] },
  { id: "sxs", name: "Fjellbil 6x4 side-by-side", kind: "side-by-side", year: 2023, cost: 7800, open: true, opt: "atvs",
    blurb: "A two-seat utility buggy with a roll cage and a tipping bed. Heavier than the four-wheeler and far steadier, it takes six parcels and a trailer hitch.",
    spec: "side-by-side · six parcels in the bed · no licence", how: "The utility vehicle: farm tracks, village lanes and a summer's freight. Half-doors, a roof and no heater.",
    mass: 720, power: 45000, fmax: 5200, top: 26, revTop: 4, fuel: 30, burn: 0.7, slots: 6, cabCold: 0.55, hitchKg: 900, hitchZ: -3.1,
    mu: { hard: 0.5, loose: 0.3, ice: 0.13, wet: 0.08 }, paint: 0xb9701c, eye: [0.4, 1.63, -0.1] },
  { id: "cart", name: "Kjøllefjord golf cart", kind: "golf cart", year: 2021, cost: 1900, open: true, opt: "atvs",
    blurb: "A battery-minded cart from the golf course nobody built. Slow, light, two parcels behind the seat, and so low on its springs it ploughs the belly in anything deeper than a boot.",
    spec: "golf cart · two parcels · no licence", how: "For the town and the quay in dry weather. Don't take it on the fell.",
    mass: 480, power: 6000, fmax: 1500, top: 7, revTop: 2.4, fuel: 10, burn: 0.3, slots: 2, cabCold: 0.95, hitchKg: 0, hitchZ: -3.1, clearance: 0.16,
    mu: { hard: 0.38, loose: 0.12, ice: 0.08, wet: 0.05 }, paint: 0xe8e2d0, eye: [0.4, 1.63, -0.1] }
];

let api = null, snapped = false, lookT = 0, last = { tint: null }, caps = null, mudC = { t: -1, k: 0 };
const S = () => TLX.state("seasons");
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const sst = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const hex = c => ((c[0] * 255 | 0) << 16) | ((c[1] * 255 | 0) << 8) | (c[2] * 255 | 0);

/* ---------------- the date ---------------- */
function when() { const n = api.CAL.now(); return { c: n, mf: n.m + (n.d - 1) / 31, h: n.h }; }
// the name of the season of play: winter (Nov-Mar), mud (Apr-May), summer (Jun-Aug), autumn (Sep-Oct)
function phaseOf(m) { return m >= 10 || m <= 2 ? "winter" : m <= 4 ? "mud" : m <= 7 ? "summer" : "autumn"; }
const daysToNov = () => { const c = api.CAL.day(); return Math.round((Date.UTC(c.m >= 10 ? c.y + 1 : c.y, 10, 1) - Date.UTC(c.y, c.m, c.d)) / 864e5); };
const inSummerWindow = () => api.CAL.season().id === "summer";               // 1 Jun - 31 Oct: where the base game skips

/* ---------------- 9.1: the look ---------------- */
// 0 bare ground .. 1 snow lying (reads the melt the base game runs; the winter is 1)
const snowK = () => 1 - sst(0.02, 0.6, api.MELT.k);
function frostAt(mf, h) { const season = sst(T.fr0, T.fr1, mf) * (mf < 10 ? 1 : 0), cold = Math.max(0, Math.cos((h - 4) / 24 * 2 * Math.PI)); return season * cold * cold; }
function leafCol(mf) {
  let c = mix(LOOK.bud, LOOK.leaf, sst(T.leaf0, T.leaf1, mf));
  c = mix(c, LOOK.gold, sst(T.yel0, T.yel1, mf));
  return mix(c, LOOK.bud, sst(T.drop0, T.drop1, mf));
}
function groundTint(mf, mud, fr) {
  let c = mix([1, 1, 1], LOOK.mud, Math.max(mud, sst(3, 3.4, mf) * (mf < 5 ? 1 : 0)));
  c = mix(c, LOOK.green, sst(T.gr0, T.gr1, mf) * (mf < 8.5 ? 1 : 0));
  c = mix(c, LOOK.russet, sst(T.rus0, T.rus0 + 0.5, mf) * (mf > 8 ? 1 : 0));
  c = mix(c, LOOK.dull, sst(T.drop0, T.drop1, mf) * (mf > 9 ? 1 : 0));
  return mix(c, LOOK.frost, clamp(fr * 0.8, 0, 1));
}
function look() {                                                              // what the world should be wearing now
  const w = when(), mud = mudK(), fr = frostAt(w.mf, w.h), snow = snowK();
  const ground = TLX.on("seasonlook") ? groundTint(w.mf, mud, fr) : [1, 1, 1];
  const birch = mix(mix(leafCol(w.mf), LOOK.white, fr * 0.6), LOOK.white, snow);
  const pine = mix(mix(LOOK.needle, LOOK.white, fr * 0.5), LOOK.white, snow);
  return { ground, birch, pine, snow, frost: fr, mud, mf: w.mf, phase: phaseOf(w.c.m) };
}
function capsOf() {
  if (caps) return caps;
  const t = api.season.trees, b = t.birch(), p = t.pine();
  const one = cells => { const m = cells.length ? cells[0].cap.material : null; return m ? { m, color: m.color.clone(), em: m.emissive.clone() } : null; };
  return (caps = { birch: one(b), pine: one(p) });
}
function dress(L) {
  api.season.tint.value.set(L.ground[0], L.ground[1], L.ground[2]);
  const C = capsOf(), on = TLX.on("seasonlook");
  for (const k of ["birch", "pine"]) {
    const o = C[k]; if (!o) continue;
    if (!on) { o.m.color.copy(o.color); o.m.emissive.copy(o.em); continue; }
    const c = L[k]; o.m.color.setRGB(c[0], c[1], c[2]);
    o.m.emissive.copy(o.em).multiplyScalar(L.snow);                            // the snow's night glow goes with the snow
  }
}

/* ---------------- 9.2: mud ---------------- */
// 0..1: how soft the roads are today (cached for a few frames)
function mudK() {
  const now = api.now(); if (now - mudC.t < 0.25) return mudC.k; mudC.t = now;
  const c = api.CAL.day(), M = api.MELT; let k = 0;
  if (c.m === 3 || c.m === 4) k = Math.max(M.spr, 0.6 * M.wet) * (1 - sst(0.8, 1, M.k));
  else if (c.m === 5) k = 0.5 * (1 - clamp((c.d - 1) / 14, 0, 1));
  return (mudC.k = k * (0.65 + 0.35 * M.wet) * (TLX.on("mudseason") ? 1 : 0));
}
const paved = (x, z) => { const D = api.world.depot; return Math.hypot(x - D.x, z - D.z) < api.townR; };   // the depot town's streets are paved
function mudAt(x, z) {
  const k = mudK(); if (k < MUD.min) return 0;
  if (paved(x, z)) return 0;
  return window.TLXR && TLXR.onRoad && TLXR.onRoad(x, z) ? k : k * MUD.off;
}
const gripAt = (x, z) => 1 - MUD.grip * mudAt(x, z);
const rollAt = (x, z) => 1 + MUD.roll * mudAt(x, z);
function mudLine() {
  const P = api.P, m = mudAt(P.x, P.z), on = window.TLXR && TLXR.onRoad && TLXR.onRoad(P.x, P.z);
  return on && m > MUD.hint && !api.FOOT.on ? `MUD SEASON · the road is soft: ${Math.round((1 - gripAt(P.x, P.z)) * 100)}% less grip, heavier rolling. Ease off.` : "";
}

/* ---------------- 9.3: playable summer, the skip, the settle ---------------- */
function billsPreview(days) {
  const weeks = days / 7, lines = []; let total = 0;
  for (const b of api.SEASON.bills) { let v = 0; try { v = Math.round(b.perWeek() * weeks); } catch (e) { } if (v) { lines.push({ name: b.name, v }); total += v; } }
  return { lines, total, weeks };
}
// what the skipped days did to what you own, besides the money: returns a summary
function settleSkip(days) {
  const out = { rooms: 0, cars: 0, wear: 0, days };
  if (!TLX.on("summerwear") || days <= 0) return out;
  try {                                                                        // dust and grit in every depot and property: guests are in, nobody sweeps but a caretaker
    const pr = TLX.prop;
    if (pr && pr.allRooms && pr.rec) for (const c of pr.allRooms()) {
      const r = pr.rec(c.key), P = pr.PROP;
      r.grit += P.gritDay * days; r.dust += P.dustDay * days;
      if (c.w > 0) { const k = P.careDay * c.w * c.k * days; r.grit -= k; r.dust -= k; }
      r.grit = clamp(r.grit, 0, 100); r.dust = clamp(r.dust, 0, 100); out.rooms++;
    }
  } catch (e) { console.error("TLX seasons rooms", e); }
  try {                                                                        // a summer outside: rust, seized brakes, flat tyres
    const V = window.TLXV, g = api.world.garage(), weeks = days / 7;
    if (V) for (const r of V.state().owned) {
      if (typeof r.cond !== "number" || V.kinds[r.id]) continue;
      const at = r.uid === V.state().cur ? api.P : r, k = Math.hypot(at.x - g.x, at.z - g.z) < WEAR.garageR ? WEAR.garaged : 1;
      const loss = Math.min(Math.max(0, r.cond - WEAR.floor), WEAR.perWeek * weeks * k);
      r.cond -= loss; out.wear += loss; out.cars++;
    }
  } catch (e) { console.error("TLX seasons wear", e); }
  return out;
}
// the skip, from any day in June to October: the base game's own (bills, refreeze, montage) plus the settle above
function skipNow(why) {
  if (!inSummerWindow() || !api.started() || api.busy() || api.SEASON.card) return false;
  const days = daysToNov(), orig = skipNow.orig;
  orig.call(api.CAL);
  const o = settleSkip(days), s = S(); s.played = false; s.skips++; s.days += days;
  mudC.t = -1; lookT = 0;
  if (o.rooms || o.cars) setTimeout(() => api.toast(`Summer settled: ${o.rooms} place${o.rooms === 1 ? "" : "s"} gathered dust${o.cars ? `, ${o.cars} vehicle${o.cars === 1 ? "" : "s"} lost ${o.wear.toFixed(1)}% between them` : ""}.`, "warn"), 1200);
  api.save(); try { api.TABLET.refresh("seasons"); } catch (e) { }
  return o;
}
// CAL.tick calls summerSkip() on the first day of every summer day change: this decides skip or play
function summerSkip() {
  if (!TLX.on("playsummer")) {                                                // the base game: skip now, to 1 November
    const days = daysToNov(), s = S();
    skipNow.orig.call(api.CAL); const o = settleSkip(days); s.played = false; s.skips++; s.days += days; api.save();
    if (o.rooms || o.cars) setTimeout(() => api.toast(`Summer settled: ${o.rooms} place${o.rooms === 1 ? "" : "s"} gathered dust.`, "warn"), 1200);
    return;
  }
  const C = api.CAL, D = C.dayIndex(), n = C.now(), s = S();
  const first = !s.played; s.played = true;
  for (const cb of C.cbs) { try { cb(n, D - 1); } catch (e) { console.error(e); } }   // a day like any other: the Monday hooks run
  if (first) {
    api.toast("Summer. The ground's bare and the lakes are open: the sled hates it, a four-wheeler doesn't. Skip to November any time from the Seasons app.", "good");
    try { api.TABLET.notify({ app: "seasons", kind: "good", title: "Summer has come", body: "Play it, or skip to 1 November from here. Staff and property are settled either way.", ttl: 10 }); } catch (e) { }
  }
}
// 1 November after a played summer: the winter comes back
function newWinter(n, prev) {
  if (prev === null || n.m !== 10 || n.d !== 1) return;
  const s = S(); if (!s.played) return;
  s.played = false; s.winters++;
  try { api.season.refreeze(); } catch (e) { console.error("TLX seasons refreeze", e); }
  mudC.t = -1; lookT = 0;
  api.toast("1 November. Snow on the whole peninsula, the lakes freezing, the roads open. Winter again.", "good");
  api.save();
}

/* ---------------- the Seasons app ---------------- */
const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"/></svg>';
const PHASE_TXT = { winter: "Winter. Snow on the ground, the sled's season.", mud: "Mud season. The roads are soft, the ground is bare in patches and the lakes are going.", summer: "Summer. Bare ground, open water, birches in leaf. The sled's in the shed unless you're brave.", autumn: "Autumn. The birches turn, the heather goes russet, frost on the mornings." };
function render(el) {
  const U = api.ui, w = when(), L = look(), s = S(), money = v => api.fmtCash(Math.abs(v));
  let h = U.tabHead("THE YEAR · FOUR SEASONS", "Seasons", api.fmtCash(api.GS.cash));
  h += `<div class="tsub">${U.chip(L.phase.toUpperCase(), "ok")} ${w.c.long}${L.mud > MUD.hint ? " " + U.chip("MUD " + Math.round(L.mud * 100) + "%", "heavy") : ""}${L.frost > 0.25 ? " " + U.chip("FROST", "polar") : ""}</div>`;
  h += `<p class="tnote2">${PHASE_TXT[L.phase]}</p>`;
  if (inSummerWindow()) {
    const days = daysToNov(), B = billsPreview(days);
    h += U.sec("Skip to winter", `${days} days to 1 November`);
    h += `<div class="tsml2">${B.lines.map(l => `<div class="tsm2 tprow"><b>${U.esc(l.name)}</b><span>${l.v < 0 ? "−" : "+"}${money(l.v)}</span></div>`).join("") || `<div class="tsm2 tprow"><b>Bills</b><span>nothing owing</span></div>`}<div class="tsm2 tprow"><b>All told</b><span>${B.total < 0 ? "−" : "+"}${money(B.total)}</span></div></div>`;
    h += `<p class="tnote2">Skipping jumps the calendar to 1 November at this time of day, settles every skipped week (wages, lets, caches), lets dust and grit gather in what you own and weathers the vehicles you left outside. ${TLX.on("playsummer") ? "Or stay and play it: Mondays settle as in winter." : "Summer play is off in Settings > Options: the game skips on its own."}</p>`;
    h += `<div class="trow"><button type="button" class="tbtn" data-act="seasonskip">SKIP TO 1 NOVEMBER</button></div>`;
  } else h += `<p class="tnote2">${L.phase === "winter" ? "The summer begins on 1 June." : "Summer begins on 1 June."} Mud season runs while the melt takes the snow off the roads.</p>`;
  h += `<p class="tnote2">${s.winters} winter${s.winters === 1 ? "" : "s"} come back after a played summer · ${s.skips} skip${s.skips === 1 ? "" : "s"} (${s.days} days).</p>`;
  el.innerHTML = `<div class="tapp">${h}</div>`;
  for (const b of el.querySelectorAll("[data-act='seasonskip']")) b.addEventListener("click", () => { if (!skipNow("app")) api.toast("Not now.", "warn"); });
}

/* ---------------- the options ---------------- */
TLX.option({ id: "seasonlook", name: "Seasonal colours", hint: "Green summer, russet and gold autumn, mud in spring, frost on autumn mornings, birches in leaf, pines losing their snow. Costs nothing: one colour on the bare ground. Off = the base look." });
TLX.option({ id: "mudseason", name: "Mud season roads", hint: "In April and May the roads go soft: trucks get less grip and heavier rolling, sleds drag. Off = roads as in winter." });
TLX.option({ id: "playsummer", name: "Playable summer and autumn", hint: "June to October are days you can play, with a skip to 1 November on any day from the Seasons app. Off = the game skips the summer on 1 June by itself." });
TLX.option({ id: "summerwear", name: "Summer upkeep and wear", hint: "A skipped summer lets dust gather in your depots and properties and weathers vehicles left outside, and vehicles cost a little storage a week. Off = the skip settles only the bills." });
TLX.option({ id: "atvs", name: "Four-wheelers, side-by-sides, golf carts", hint: "Three light open vehicles in the garage's vehicle list. Off = they are not offered (any you own stay yours).",
  change: v => { try { if (api) api.garageRefresh(); } catch (e) { } } });

/* ---------------- the system ---------------- */
TLX.register({
  id: "seasons", v: 1,
  state0: () => ({ played: false, skips: 0, days: 0, winters: 0 }),
  migrate(st) { for (const k of ["skips", "days", "winters"]) st[k] = +st[k] || 0; st.played = !!st.played; return st; },
  init(a) {
    api = a;
    // 9.4: the vehicles
    const V = window.TLXV;
    if (V && V.VEHICLES) for (const row of VEH) if (!V.VEHICLES.some(d => d.id === row.id)) V.VEHICLES.push(Object.assign({ model: "pickup", zf: 1.5, zr: -1.55, track: 1.66, tyreR: 0.38, tyreW: 0.27, clearance: 0.26, len: 5.3, wid: 1.96, door: { x: 0.925, z: 0.7 } }, row));
    // 9.2: mud under the tyres
    if (V && V.addGrip) V.addGrip(gripAt);
    if (V && V.addRoll) V.addRoll(rollAt);
    if (a.ridex) a.ridex.push(mudLine);
    // 9.3: the summer skip is ours to decide
    if (!skipNow.orig) { skipNow.orig = a.CAL.summerSkip; a.CAL.summerSkip = summerSkip; }
    a.CAL.onDayChange(newWinter);
    // the skip bills a week of storage for every vehicle you own
    if (a.SEASON && a.SEASON.addBill) a.SEASON.addBill({ name: "Vehicles: summer storage", perWeek: () => TLX.on("summerwear") && window.TLXV ? -WEAR.storeWeek * TLXV.state().owned.filter(r => typeof r.cond === "number" && !TLXV.kinds[r.id]).length : 0 });
    // the Seasons app
    a.TABLET.register({ id: "seasons", name: "Seasons", icon: ICON, order: 4.5, live: 10, render });
    lookT = 0;
  },
  tick(dt) {
    if (!api || !api.started()) return;
    lookT -= dt;
    if (lookT <= 0) { lookT = 0.5; try { dress(look()); } catch (e) { console.error("TLX seasons look", e); lookT = 5; } }
    // a sled on a mud road drags (trucks do it through the roll hook)
    if (!api.veh.cur && !api.FOOT.on && dt > 0) {
      const P = api.P, m = mudAt(P.x, P.z);
      if (m > MUD.min) { const sp = Math.hypot(P.vx, P.vz); if (sp > 0.5) { const k = Math.min(0.8, MUD.sled * m * dt * (0.5 + sp / 20)); P.vx *= 1 - k; P.vz *= 1 - k; } }
    }
  }
});
TLX.seasons = { LOOK, MUD, WEAR, VEH, look, mudK, mudAt, gripAt, rollAt, phaseOf, settleSkip, skipNow, billsPreview, daysToNov, frostAt, snowK, groundTint, leafCol, dress, T,
  stats: () => Object.assign({}, S()) };
})();
