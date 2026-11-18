// Tracklayer — homes: renting a flat cheaply, buying one dear, and the landlords who come with them (living-world release 1,
// loop/LOOP.md Owner note "Living world"; the follow-up "also add slumlords" is part of it).
//
// SIX FLATS in Kjøllefjord, each behind a real town door (the lit house doors from the street grid, W.doors): a ring in
// front of the door like every other walk-in room (api.intAdd), a "TIL LEIE" plaque beside it, and a small furnished room inside
// (api.intAdd's kit). Three landlords own them:
//   Kåre Bjørnstad    fair: fixes things in about two days, never keeps your deposit, never raises the rent on you.
//   Eiendom Nord AS   firm: slow (about six days), now and then "forgets", a modest rise, keeps a sliver of the deposit.
//   Rolf Haugen       the slumlord: the rent is half the going price and the flat is a ruin. Things break all the time, he
//                     fixes them after two weeks or never, answers a complaint with a rent rise, and keeps half your deposit for "cleaning".
// The lease is on the listing before you sign: weekly rent, deposit, how long repairs take, what he can raise the rent to, what
// he keeps. Reviews say the rest.
//
// RENTING (option "rentals"). One tenancy at a time. Signing costs the deposit and the first week, both up front (not enough cash =
// nothing is taken). Rent is taken on Mondays, once per Monday however the clock jumps; short of cash it is not taken at all:
// it goes into ARREARS (+ the late fee), never into negative money. Two weeks of arrears is a notice to quit, a week later you are
// out, and the deposit goes to the arrears. A move-out gets the deposit back minus what the landlord keeps, minus arrears.
// Rent you still owe after that is debt: pay it before you can sign again; the fair landlords won't see you for 14 days.
// BUYING. A flat is 650-1,600 weeks of the rent: $41,000 to $96,000 against $28 to $95 a week. Owned, there's no landlord and no rent,
// only a $6 a week property charge (carried, not forced, when cash is short); you can sell back for 75%.
//
// SLUMLORDS (option "slumlords"; off = every landlord behaves like Kåre). Defects are real state: a dead radiator, a damp wall, a leak
// through the ceiling, mice (each with its fixture in the room that appears and disappears). They turn up by the landlord's neglect rate.
// In the flat, stand by one and use: REPORT it (the landlord's clock starts: he fixes it in his time, or never), and once reported, use again to
// FIX IT YOURSELF for the materials. A dead radiator drains your warmth in the flat; a working one restores it. After a week with
// a reported fault still open you can COMPLAIN to the municipality: it rules in three days, usually for you: the landlord is fined,
// the repair is ordered in two days, you get 25% of the rent back for the weeks it was broken, and he may not hit back for 30 days.
// A slumlord you report, with no protection, may answer with a rent rise (the lease says how much and with what notice).
//
// SAVED under x.sys.housing: { own, ten, debt, taxOwed, dT, wk, ll, hist, seq, banUntil }. Old saves have none: fresh state.
// TLXH (window, for scenarios): UNITS, LL, state, sign, buy, sell, report, fix, complain, moveOut, payDebt, dayStep, settle.
(() => {
"use strict";
const H = {
  taxWeek: 6, sellK: 0.75, lateFee: { fair: 0, firm: 5, slum: 15 }, evictAfter: 14, evictNotice: 7, banDays: 14,
  maxOpen: 4, reportWait: 7, ruleDays: 3, orderDays: 2, rebateK: 0.25, protect: 30,
  warmRate: 4, coldRate: -0.35, dampRate: -0.12, coldFloor: 35, near: 1.9,
  fixCost: { heat: 45, damp: 60, leak: 55, pests: 35 }
};
const LL = {
  kare: { id: "kare", name: "Kåre Bjørnstad", kind: "fair", fix: 2, ignore: 0, neglect: 0.012, rise: 0, hold: 0, hit: 0, stars: 4.6, rev: "“Knocked on the door to ask if the stove drew properly.”" },
  nord: { id: "nord", name: "Eiendom Nord AS", kind: "firm", fix: 6, ignore: 0.15, neglect: 0.04, rise: 0.06, hold: 0.15, hit: 0.1, stars: 3.3, rev: "“Fine until something breaks. Then it's a ticket number.”" },
  haugen: { id: "haugen", name: "Rolf Haugen", kind: "slum", fix: 14, ignore: 0.55, neglect: 0.16, rise: 0.25, hold: 0.5, hit: 0.6, stars: 1.7, rev: "“Cheap because nothing works. Reported the damp in October. It's December.”" }
};
const KINDS = { heat: "dead radiator", damp: "damp wall", leak: "ceiling leak", pests: "mice" };
// price: what it costs to buy; rent a week; dep deposit in weeks; size: bedsit | flat; asIs: faults it comes with when you buy it
const UNITS = [
  { id: "strand3", name: "Strandgata 3 · bedsit", ll: "kare", rent: 62, dep: 2, price: 54000, size: "bedsit", blurb: "One warm room over the bakery, a window on the harbour, a good lock.", asIs: [], bias: ["heat", "damp"] },
  { id: "havn12", name: "Havnegata 12 · two rooms", ll: "kare", rent: 95, dep: 2, price: 96000, size: "flat", blurb: "Kitchen, bedroom and a stove that draws. The best address in town.", asIs: [], bias: ["leak", "heat"] },
  { id: "fjord7", name: "Fjordveien 7 · flat", ll: "nord", rent: 78, dep: 2, price: 72000, size: "flat", blurb: "Clean, plain, a little tired. Managed from Alta.", asIs: ["leak"], bias: ["leak", "pests", "heat"] },
  { id: "nord20", name: "Nordkappveien 20 · first floor", ll: "nord", rent: 70, dep: 2, price: 66000, size: "bedsit", blurb: "A room and a kitchenette above the garage. Heating is by the building's boiler.", asIs: [], bias: ["heat", "pests"] },
  { id: "bak5", name: "Bakgata 5 · basement", ll: "haugen", rent: 28, dep: 3, price: 41000, size: "bedsit", blurb: "Cheap for a reason. The radiator is original and the walls sweat.", asIs: ["heat", "damp"], bias: ["damp", "heat", "pests", "leak"] },
  { id: "sjo1", name: "Sjøgata 1 · back room", ll: "haugen", rent: 35, dep: 3, price: 44000, size: "flat", blurb: "Two rooms at the back of the net shed. Electrics inspected in 1994.", asIs: ["pests", "leak"], bias: ["pests", "leak", "damp", "heat"] }
];
const U = id => UNITS.find(u => u.id === id) || null;
let api = null, tAcc = 0, placed = false, fxKey = "", warnT = 0, view = null;
const S = () => TLX.state("housing");
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const money = v => api.fmtCash(Math.round(v));
const day = () => api.CAL.dayIndex();
const on = () => TLX.on("rentals");
const slumOn = () => TLX.on("slumlords");
// with the slumlords option off every landlord is a fair one
const terms = id => { const l = LL[id] || LL.kare; return slumOn() ? l : Object.assign({}, LL.kare, { id: l.id, name: l.name }); };
const label = D => { try { return api.CAL.now(D * 24 - api.CAL.off).label; } catch (e) { return "day " + D; } };
const own = () => Object.keys(S().own).filter(k => U(k) && S().own[k]);

// ---- lease terms, in words (the same on the card as in force)
function lease(u) {
  const l = LL[u.ll], t = terms(u.ll), hold = Math.round(t.hold * 100);
  return [
    `Rent ${money(u.rent)} a week, taken on Mondays.${H.lateFee[t.kind] ? ` Late fee ${money(H.lateFee[t.kind])} a missed week.` : ""}`,
    `Deposit ${u.dep} weeks (${money(u.rent * u.dep)}), ${hold ? `${hold}% kept for “cleaning”` : "all of it back when you leave"}.`,
    `Repairs: landlord's, in about ${t.fix} days${t.ignore ? ", and not always" : ""}. You may fix it yourself at your cost.`,
    t.rise ? `Rent may rise up to ${Math.round(t.rise * 100)}% on 7 days' notice.` : "Rent fixed while you stay.",
    `Two weeks in arrears: notice to quit. No notice needed from you.`
  ];
}

// ---- state housekeeping
function clean() {
  const s = S();
  if (!s.own || typeof s.own !== "object" || Array.isArray(s.own)) s.own = {};
  for (const k of Object.keys(s.own)) { const o = s.own[k]; if (!U(k) || !o || typeof o !== "object") { delete s.own[k]; continue; } o.defects = Array.isArray(o.defects) ? o.defects.filter(d => d && KINDS[d.kind]) : []; o.since = +o.since || 0; }
  s.debt = Math.max(0, Math.round(+s.debt || 0)); s.taxOwed = Math.max(0, Math.round(+s.taxOwed || 0));
  s.banUntil = +s.banUntil || 0; s.seq = s.seq | 0; s.wk = +s.wk || 0;
  s.hist = Array.isArray(s.hist) ? s.hist.filter(q => q && typeof q === "object").slice(0, 6) : [];
  if (!s.ll || typeof s.ll !== "object") s.ll = {};
  for (const k in LL) { const r = s.ll[k] && typeof s.ll[k] === "object" ? s.ll[k] : (s.ll[k] = {}); r.fines = Math.max(0, r.fines | 0); }
  const t = s.ten;
  if (t) {
    if (typeof t !== "object" || !U(t.unit)) s.ten = null;
    else {
      t.rent = Math.max(1, Math.round(+t.rent || U(t.unit).rent)); t.deposit = Math.max(0, Math.round(+t.deposit || 0)); t.arrears = Math.max(0, Math.round(+t.arrears || 0));
      t.defects = Array.isArray(t.defects) ? t.defects.filter(d => d && KINDS[d.kind]) : []; t.since = +t.since || 0; t.protect = +t.protect || 0; t.missed = t.missed | 0; t.rebate = Math.max(0, Math.round(+t.rebate || 0));
      if (t.notice && typeof t.notice !== "object") t.notice = null;
      if (t.cpl && typeof t.cpl !== "object") t.cpl = null;
    }
  }
}
const ten = () => S().ten;
const openDefs = list => (list || []).filter(d => d.fixed == null);
const place = () => { const t = ten(); return t ? t : null; };
// where the defects of the flat you are in live (the tenancy's, or the owned flat's)
function defsOf(uid) { const s = S(), t = s.ten; if (t && t.unit === uid) return t.defects; if (s.own[uid]) return s.own[uid].defects; return null; }
const mineUnit = uid => { const s = S(); return (s.ten && s.ten.unit === uid) || !!s.own[uid]; };
const heatOk = uid => { const d = defsOf(uid); return !d || !openDefs(d).some(x => x.kind === "heat"); };

// ---- money moves (atomic: check first, then take; cash never below zero)
function afford(c) { return Math.floor(+api.GS.cash || 0) >= c; }
function take(c) { api.GS.cash = (+api.GS.cash || 0) - c; if (api.GS.cash < 0) api.GS.cash = 0; }
function note(kind, text) { try { api.toast(text, kind); } catch (e) { } }
function after() { api.save(); try { api.TABLET.refresh("homes"); } catch (e) { } fxSync(true); }

function canSign(u) {
  const s = S();
  if (!on()) return "Closed";
  if (s.ten) return "You already rent a flat";
  if (s.debt > 0) return `Clear your ${money(s.debt)} rent debt first`;
  if (day() < s.banUntil && LL[u.ll].kind !== "slum") return "They won't rent to you yet";
  const need = u.rent * (u.dep + 1);
  if (!afford(need)) return `Needs ${money(need)} now; you have ${money(api.GS.cash)}`;
  return "";
}
function sign(uid) {
  const u = U(uid), s = S(); if (!u) return false;
  const why = canSign(u); if (why) { note("warn", why + "."); return false; }
  if (api.busy && api.busy()) { note("warn", "Finish the school course first."); return false; }
  const dep = u.rent * u.dep, first = u.rent, D = day();
  take(dep + first);
  s.ten = { unit: uid, since: D, rent: u.rent, deposit: dep, arrears: 0, missed: 0, paidWk: weekOf(D), defects: [], notice: null, cpl: null, protect: 0, rebate: 0, reps: 0 };
  s.wk = Math.max(s.wk, weekOf(D));
  for (const k of u.asIs) s.ten.defects.push(newDef(k, D - 3));           // what you find when you open the door
  for (const d of s.ten.defects) d.seen = true;
  hist(`Signed for ${u.name}`, -(dep + first));
  note("good", `You've signed for ${u.name}: ${money(dep)} deposit and the first week, ${money(dep + first)} in all. Rent is taken on Mondays.${u.asIs.length ? " Not everything works." : ""}`);
  after(); return true;
}
function moveOut(why) {
  const s = S(), t = s.ten; if (!t) return false;
  const u = U(t.unit), l = terms(u.ll), up = t.cpl && t.cpl.result === "upheld";
  const keep = up ? 0 : l.hold, back = Math.round(t.deposit * (1 - keep));
  let refund = back, left = t.arrears;
  const pay = Math.min(refund, left); refund -= pay; left -= pay;
  api.GS.cash = (+api.GS.cash || 0) + refund;
  s.debt = Math.round(s.debt + left); s.ten = null;
  if (why === "evicted") s.banUntil = day() + H.banDays;
  hist(why === "evicted" ? `Evicted from ${u.name}` : `Moved out of ${u.name}`, refund);
  note(why === "evicted" ? "warn" : "good", why === "evicted" ? `Out on the street. ${refund ? `Deposit back: ${money(refund)}.` : "The deposit went on the arrears."}${left ? ` ${money(left)} is still owed.` : ""}` : `You've moved out. Deposit back ${money(back)} of ${money(t.deposit)}${t.arrears ? `, ${money(t.arrears)} arrears taken off` : ""}${keep && !up ? ` (${Math.round(keep * 100)}% kept for “cleaning”)` : ""}.${left ? ` ${money(left)} is still owed.` : ""}`);
  after(); return true;
}
function payDebt() {
  const s = S(), t = s.ten; let paid = 0;
  const cash = Math.max(0, Math.floor(+api.GS.cash || 0));
  if (t && t.arrears > 0) { const a = Math.min(t.arrears, cash - paid); t.arrears -= a; paid += a; if (t.arrears <= 0) { t.missed = 0; t.notice = t.notice && t.notice.kind === "evict" ? null : t.notice; } }
  if (s.debt > 0) { const a = Math.min(s.debt, cash - paid); s.debt -= a; paid += a; }
  if (s.taxOwed > 0) { const a = Math.min(s.taxOwed, cash - paid); s.taxOwed -= a; paid += a; }
  if (paid <= 0) { note("warn", "Nothing to pay with."); return 0; }
  take(paid); note("good", `Paid ${money(paid)}.`); after(); return paid;
}
function buy(uid) {
  const u = U(uid), s = S(); if (!u || !on()) return false;
  if (s.own[uid]) return false;
  if (s.ten && s.ten.unit === uid) { note("warn", "You're renting this one: move out first (you get your deposit back), then buy."); return false; }
  if (!afford(u.price)) { note("warn", `${u.name} is ${money(u.price)}. You have ${money(api.GS.cash)}.`); return false; }
  take(u.price);
  s.own[uid] = { since: day(), defects: u.asIs.map(k => Object.assign(newDef(k, day()), { seen: true })) };
  hist(`Bought ${u.name}`, -u.price);
  note("good", `${u.name} is yours for ${money(u.price)}. No landlord, no rent: ${money(H.taxWeek)} a week in property charges.${u.asIs.length ? " Sold as seen: you'll have to fix the faults yourself." : ""}`);
  after(); return true;
}
function sell(uid) {
  const s = S(), u = U(uid); if (!u || !s.own[uid]) return false;
  const get = Math.round(u.price * H.sellK); delete s.own[uid]; api.GS.cash = (+api.GS.cash || 0) + get;
  hist(`Sold ${u.name}`, get); note("good", `Sold ${u.name} for ${money(get)} (${Math.round(H.sellK * 100)}% of what you paid).`); after(); return true;
}
function hist(t, amt) { const s = S(); s.hist.unshift({ d: label(day()), t, amt: Math.round(amt) }); s.hist = s.hist.slice(0, 6); }

// ---- defects
function newDef(kind, D) { const s = S(); return { id: ++s.seq, kind, since: D, rep: null, resp: null, ign: false, fixed: null, by: null }; }
function defById(uid, id) { const l = defsOf(uid); return l ? l.find(d => d.id === id) : null; }
function report(uid, id) {
  const d = defById(uid, id), s = S(), t = s.ten; if (!d || d.fixed != null) return false;
  if (d.rep != null) { note("warn", "You've already reported that one."); return false; }
  d.rep = day();
  if (t && t.unit === uid) {
    const l = terms(U(uid).ll); t.reps = (t.reps || 0) + 1;
    d.ign = Math.random() < l.ignore; d.resp = d.ign ? null : d.rep + Math.max(1, Math.round(l.fix * (0.7 + Math.random() * 0.6)));
    const say = l.kind === "fair" ? "I'll be round on " + label(d.resp) + "." : l.kind === "firm" ? "Ticket logged. Allow up to " + l.fix + " working days." : "Yeah yeah. I'll look into it.";
    note("", `Reported the ${KINDS[d.kind]} to ${LL[U(uid).ll].name}: “${say}”`);
    // a slumlord does not like being written to
    if (l.hit > 0 && day() >= t.protect && !t.notice && Math.random() < l.hit) { const nr = Math.round(t.rent * (1 + l.rise)); t.notice = { kind: "rise", day: day(), eff: day() + 7, rent: nr }; note("warn", `${LL[U(uid).ll].name} has written back: rent up to ${money(nr)} from ${label(t.notice.eff)}.`); }
  } else note("", `Noted the ${KINDS[d.kind]}. It's yours to fix.`);
  after(); return true;
}
function fixCost(d) { return H.fixCost[d.kind] || 40; }
function fix(uid, id) {
  const d = defById(uid, id), s = S(); if (!d || d.fixed != null) return false;
  const c = fixCost(d);
  if (!afford(c)) { note("warn", `Fixing the ${KINDS[d.kind]} takes ${money(c)} of parts. You have ${money(api.GS.cash)}.`); return false; }
  take(c); d.fixed = day(); d.by = "you";
  note("good", `You fixed the ${KINDS[d.kind]} yourself (${money(c)}).`); after(); return true;
}
function canComplain(d) { const t = ten(); return !!(t && d && d.fixed == null && d.rep != null && day() - d.rep >= H.reportWait && !t.cpl && on()); }
function complain(id) {
  const t = ten(); if (!t) return false; const d = t.defects.find(q => q.id === id);
  if (!canComplain(d)) { note("warn", "You can complain once a reported fault has stood open a week."); return false; }
  t.cpl = { id, day: day(), due: day() + H.ruleDays, result: null };
  note("", `Complaint filed with the municipality's tenancy office. They rule in ${H.ruleDays} days.`); after(); return true;
}
function ruling(t) {
  const c = t.cpl, d = t.defects.find(q => q.id === c.id), u = U(t.unit), l = LL[u.ll], s = S();
  const up = !!(d && d.fixed == null && day() - d.rep >= H.reportWait) && Math.random() < 0.88;
  c.result = up ? "upheld" : "dismissed";
  if (up) {
    const weeks = Math.max(1, Math.ceil((c.day - d.rep) / 7)), rb = Math.round(t.rent * H.rebateK * weeks);
    api.GS.cash = (+api.GS.cash || 0) + rb; t.rebate += rb; t.protect = day() + H.protect; if (t.notice && t.notice.kind === "rise") t.notice = null;
    d.ign = false; d.resp = day() + H.orderDays; s.ll[l.id].fines++;
    note("good", `The municipality rules for you. ${l.name} is fined and must fix the ${KINDS[d.kind]} within ${H.orderDays} days; ${money(rb)} back on the rent. He may not hit back for ${H.protect} days.`);
  } else note("warn", "The municipality dismisses the complaint: the fault was already fixed, or it wasn't old enough.");
}

// ---- the days go by (and every Monday)
const weekOf = D => { const dw = api.CAL.day(D).dow; return D - ((dw + 6) % 7); };   // the Monday on or before D (dow 1 = Monday)
function dayStep() {
  const s = S(), D = day();
  if (s.dT === null || s.dT === undefined || !isFinite(+s.dT) || s.dT > D) { s.dT = D; return; }
  if (s.dT === D) return;
  let from = s.dT + 1; if (D - from > 21) from = D - 20;
  s.dT = D;
  for (let d = from; d <= D; d++) { dayOf(d); if (api.CAL.day(d).dow === 1) settle(d); }
  after();
}
function dayOf(D) {
  const s = S(), t = s.ten;
  if (t) {
    const u = U(t.unit), l = terms(u.ll);
    // the landlord's repairs, in his own time
    for (const d of openDefs(t.defects)) if (d.rep != null && !d.ign && d.resp != null && D >= d.resp) { d.fixed = D; d.by = "landlord"; note("good", `${LL[u.ll].name} has fixed the ${KINDS[d.kind]}.`); }
    // things break
    if (openDefs(t.defects).length < H.maxOpen && Math.random() < l.neglect) {
      const have = new Set(openDefs(t.defects).map(d => d.kind)), pool = u.bias.filter(k => !have.has(k)); if (pool.length) { const k = pool[Math.floor(Math.random() * pool.length)]; t.defects.push(newDef(k, D)); note("warn", `Something has gone wrong at ${u.name}: ${KINDS[k]}.`); }
    }
    if (t.cpl && !t.cpl.result && D >= t.cpl.due) ruling(t);
    if (t.notice && t.notice.kind === "rise" && D >= t.notice.eff) { t.rent = t.notice.rent; hist(`Rent up to ${money(t.rent)}`, 0); t.notice = null; }
    if (t.notice && t.notice.kind === "evict" && D >= t.notice.eff) { t.evicted = true; moveOut("evicted"); }
  }
}
// Monday D: rent, once per Monday. Short of cash it is not taken: it is arrears (and the late fee), never negative money
function settle(D) {
  const s = S(), t = s.ten, wk = D; if (!on()) return;
  if (s.wk >= wk) return;                                               // already done for this Monday (a clock jump, a reload)
  s.wk = wk;
  for (const k of own()) {
    const c = H.taxWeek; if (afford(c + s.taxOwed)) { take(c + s.taxOwed); s.taxOwed = 0; } else s.taxOwed += c;
  }
  if (t && t.paidWk !== wk && wk > weekOf(t.since)) {
    t.paidWk = wk; const u = U(t.unit), l = terms(u.ll);
    if (afford(t.rent)) { take(t.rent); note("", `Rent ${money(t.rent)} taken for ${u.name}.`); t.missed = 0; }
    else {
      const fee = H.lateFee[l.kind] || 0; t.arrears += t.rent + fee; t.missed++;
      note("warn", `You couldn't cover the ${money(t.rent)} rent for ${u.name}: ${money(t.arrears)} in arrears.`);
      if (t.missed >= 2 && !t.notice) { t.notice = { kind: "evict", day: D, eff: D + H.evictNotice }; note("warn", `Notice to quit: pay ${money(t.arrears)} or you're out by ${label(t.notice.eff)}.`); }
    }
  }
}

// ---- in the world: the doors, the plaques
function plaque(u) {
  const T = api.THREE, W = api.world, g = new T.Group(), D = u.door;
  const x = D.x + D.nx * (D.d / 2 + 1.0) + D.nz * 2.4, z = D.z + D.nz * (D.d / 2 + 1.0) - D.nx * 2.4;
  g.position.set(x, W.groundAt(x, z) - 0.1, z); g.rotation.y = Math.atan2(D.nx, D.nz); api.scene.add(g);
  const post = api.mesh.std(0x4a3a2a, 0.9); api.mesh.box(0.08, 1.5, 0.08, post, 0, 0.75, 0, 0, 0, 0, g);
  const mat = new T.MeshLambertMaterial({ map: null }), sp = new T.Mesh(new T.PlaneGeometry(1.0, 0.5), mat); sp.position.set(0, 1.45, 0.045); g.add(sp);
  api.mesh.box(1.06, 0.56, 0.04, post, 0, 1.45, 0.015, 0, 0, 0, g);
  u.vis = { g, mat, k: "" }; plaqueSync(u);
}
function plaqueTex(u, k) {
  const cv = document.createElement("canvas"); cv.width = 256; cv.height = 128; const g = cv.getContext("2d");
  g.fillStyle = k === "yours" ? "#13202b" : k === "let" ? "#3a3a3a" : "#f2efe6"; g.fillRect(0, 0, 256, 128); g.fillStyle = k === "yours" ? "#7fc8e0" : k === "let" ? "#9aa0a6" : "#c23a22"; g.fillRect(0, 0, 256, 14);
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = k === "yours" ? "#f2efe6" : k === "let" ? "#cfd3d6" : "#1a1a1a";
  g.font = "700 40px 'Barlow Semi Condensed', sans-serif"; g.fillText(k === "yours" ? "HJEM" : k === "let" ? "UTLEID" : "TIL LEIE", 128, 52);
  g.font = "600 21px 'Barlow Semi Condensed', sans-serif"; g.fillStyle = k === "yours" ? "#7fc8e0" : k === "let" ? "#9aa0a6" : "#c23a22";
  g.fillText(k === "yours" ? "your flat" : k === "let" ? "taken" : `${money(u.rent)}/uke · ${LL[u.ll].name.split(" ")[0]}`, 128, 96);
  const t = new api.THREE.CanvasTexture(cv); t.encoding = api.THREE.sRGBEncoding; return t;
}
function plaqueSync(u) {
  if (!u.vis) return; const s = S(), k = (s.ten && s.ten.unit === u.id) || s.own[u.id] ? "yours" : "free"; if (u.vis.k === k) return; u.vis.k = k;
  if (u.vis.mat.map) u.vis.mat.map.dispose(); u.vis.mat.map = plaqueTex(u, k); u.vis.mat.needsUpdate = true;
}
function placeAll() {
  if (placed || !api.intAdd) return; placed = true;
  const W = api.world, B = api.INT.beacons || [], R0 = api.townR * 0.95;
  const doors = (W.doors || []).filter(d => Math.hypot(d.x - W.depot.x, d.z - W.depot.z) < R0 && Number.isFinite(d.nx) && !B.some(b => Math.hypot(b.x - d.x, b.z - d.z) < 8));
  doors.sort((a, b) => Math.atan2(a.z - W.depot.z, a.x - W.depot.x) - Math.atan2(b.z - W.depot.z, b.x - W.depot.x));
  const pick = []; const step = Math.max(1, Math.floor(doors.length / UNITS.length));
  for (let i = 0, j = 0; i < doors.length * 2 && pick.length < UNITS.length; i++, j = (j + step) % Math.max(1, doors.length)) { const d = doors[j]; if (d && !pick.includes(d) && pick.every(p => Math.hypot(p.x - d.x, p.z - d.z) > 16)) pick.push(d); }
  UNITS.forEach((u, i) => {
    const D = pick[i]; if (!D) return; u.door = D;
    const x = D.x + D.nx * (D.d / 2 + 1.25), z = D.z + D.nz * (D.d / 2 + 1.25); u.at = { x, z, y: W.groundAt(x, z) };
    u.beacon = api.intAdd({ id: "flat:" + u.id, name: u.name, flat: u.id, x, z, ry: Math.atan2(D.nx, D.nz), jig: [-90 + i * 36, 120], door: u.name + "'s door", build: (R, K) => flatRoom(R, K, u),
      hint: () => null, enter: () => enterNote(u) });
    try { plaque(u); } catch (e) { console.error("TLX housing plaque", e); }
  });
}
function enterNote(u) {
  const s = S(), mine = mineUnit(u.id), d = defsOf(u.id);
  if (!mine) return api.toast(`${u.name}: for rent at ${money(u.rent)} a week (${LL[u.ll].name}), or ${money(u.price)} to buy. Terms are in the Homes app. Walk back into the doorway to go out.`);
  const bad = d ? openDefs(d) : [];
  api.toast(bad.length ? `${u.name}: ${bad.map(x => KINDS[x.kind]).join(", ")}. Walk up to a fault to report or fix it.` : `${u.name}: warm and yours. Walk back into the doorway to go out.`, bad.length ? "warn" : "good");
}

// ---- the rooms: one shell, furnished by the landlord's standard; faults have fixtures that show or hide
const FX = (R, k) => (R._fx || (R._fx = {}))[k];
function flatRoom(R, K, u) {
  const IM = K.IM, box = api.mesh.box, cyl = api.mesh.cyl, bed = u.size === "bedsit";
  const slum = LL[u.ll].kind === "slum", fair = LL[u.ll].kind === "fair";
  if (bed) { R.hx = 2.7; R.hz = 2.3; }
  const hx = R.hx, hz = R.hz;
  K.shell(R, { plaster: true, doorX: bed ? -1.5 : -2.3, insul: !slum, wins: [["x", hx - 0.02, 0.2, 1.2, 0.95, 1.85], ["z", hz - 0.02, -hx / 2, 1.2, 0.95, 1.8]] });
  if (!slum) K.rug(R, 0.2, 0.2, bed ? 1.7 : 2.4, bed ? 1.3 : 1.7, fair ? IM.cloth2 : IM.cloth);
  K.bed(R, hx - 0.95, hz - 0.8, 0);
  K.table(R, 0.0, -0.1, 1.1, 0.8, 0.74); K.chair(R, 0.0, 0.7, 0); K.chair(R, 0.0, -0.9, Math.PI);
  K.counter(R, -hx + 0.55, hz - 1.0, 1.9, Math.PI / 2); if (!slum) K.shelf(R, -hx + 0.3, hz - 1.0, 1.4, Math.PI / 2);
  R.fire = slum ? null : K.stove(R, hx - 0.7, -hz + 0.9, true, 0);
  K.lamp(R, 0.0, -0.1, slum ? "kero" : "pendant", slum ? 1.6 : 1.95);
  K.hooks(R, -hx + 0.03, -0.2, Math.PI / 2, 3, true);
  if (!slum) K.crate(R, -hx + 0.55, -hz + 0.7, 0.6, 0.5, 0.5);
  // the fixtures: each exists always and shows only while its fault is open
  const fx = R._fx = {}, T = api.THREE, rad = api.mesh.std(0x9aa0a6, 0.5, 0.5);
  const pos = { heat: [hx - 0.32, 1.4 - hz * 0.4], damp: [-hx + 0.4, -hz + 0.4], leak: [-0.9, -0.1], pests: [-hx + 0.8, hz - 0.5] };
  fx.pos = pos;
  fx.rad = new T.Group(); fx.rad.position.set(hx - 0.14, 0, pos.heat[1]); R.g.add(fx.rad);
  box(0.12, 0.62, 1.1, rad, 0, 0.58, 0, 0, 0, 0, fx.rad); for (let i = -4; i <= 4; i++) box(0.15, 0.58, 0.05, rad, 0, 0.58, i * 0.12, 0, 0, 0, fx.rad);
  fx.radMat = rad; fx.frost = new T.Mesh(new T.BoxGeometry(0.16, 0.5, 1.0), new T.MeshBasicMaterial({ color: 0x8fb6d6, transparent: true, opacity: 0.55 })); fx.frost.position.set(0, 0.58, 0); fx.rad.add(fx.frost);
  const stain = new T.MeshLambertMaterial({ color: 0x3b2f22, transparent: true, opacity: 0.8, depthWrite: false });
  fx.damp = new T.Group(); fx.damp.position.set(-hx + 0.04, 0, pos.damp[1]); R.g.add(fx.damp);
  for (const [w, h, y, z] of [[1.1, 1.4, 1.2, 0], [0.7, 0.9, 0.7, 0.5], [0.5, 0.6, 1.9, -0.3]]) { const p = new T.Mesh(new T.PlaneGeometry(w, h), stain); p.rotation.y = Math.PI / 2; p.position.set(0, y, z); fx.damp.add(p); }
  const mould = new T.MeshLambertMaterial({ color: 0x1e2a1c, transparent: true, opacity: 0.85, depthWrite: false });
  for (let i = 0; i < 9; i++) { const p = new T.Mesh(new T.CircleGeometry(0.08 + (i % 3) * 0.05, 8), mould); p.rotation.y = Math.PI / 2; p.position.set(0.01, 0.3 + (i * 0.37) % 1.8, -0.5 + (i * 0.23) % 1.0); fx.damp.add(p); }
  fx.leak = new T.Group(); fx.leak.position.set(pos.leak[0], 0, pos.leak[1]); R.g.add(fx.leak);
  { const pool = new T.Mesh(new T.CircleGeometry(0.55, 14), new T.MeshLambertMaterial({ color: 0x1b2430, transparent: true, opacity: 0.65, depthWrite: false })); pool.rotation.x = -Math.PI / 2; pool.position.y = 0.012; fx.leak.add(pool);
    cyl(0.17, 0.14, 0.26, api.mesh.std(0x6c7378, 0.5, 0.5), 0.0, 0.14, 0.0, 0, 0, 0, fx.leak, 12);
    const ceil = new T.Mesh(new T.CircleGeometry(0.4, 12), new T.MeshLambertMaterial({ color: 0x4a3a28, transparent: true, opacity: 0.7, depthWrite: false })); ceil.rotation.x = Math.PI / 2; ceil.position.y = R.h - 0.02; fx.leak.add(ceil);
    fx.drip = new T.Mesh(new T.SphereGeometry(0.025, 6, 6), new T.MeshBasicMaterial({ color: 0x9ec7e6 })); fx.drip.position.y = R.h - 0.2; fx.leak.add(fx.drip); }
  fx.pests = new T.Group(); fx.pests.position.set(pos.pests[0], 0, pos.pests[1]); R.g.add(fx.pests);
  { const dm = api.mesh.std(0x1b1713, 0.9); for (let i = 0; i < 14; i++) box(0.025, 0.012, 0.012, dm, ((i * 37) % 17) / 17 * 0.9 - 0.45, 0.014, ((i * 53) % 13) / 13 * 0.8 - 0.4, 0, i, 0, fx.pests);
    box(0.5, 0.01, 0.4, api.mesh.std(0x6b5a44, 0.9), 0.1, 0.012, 0.0, 0, 0.3, 0, fx.pests); }
  fxApply(R, u.id);
}
function fxApply(R, uid) {
  const fx = R && R._fx; if (!fx) return; const d = defsOf(uid) || [], has = k => openDefs(d).some(x => x.kind === k);
  fx.frost.visible = has("heat"); fx.radMat.color.setHex(has("heat") ? 0x4a5058 : 0xb9bec4); fx.damp.visible = has("damp"); fx.leak.visible = has("leak"); fx.pests.visible = has("pests");
}
function fxSync(force) {
  const I = api.INT; if (!I || !I.on || !I.cab || !I.cab.flat) return;
  const uid = I.cab.flat, d = defsOf(uid) || [], k = uid + "|" + d.map(x => x.id + (x.fixed != null ? "f" : "o")).join(",");
  if (!force && k === fxKey) return; fxKey = k; fxApply(I.room, uid);
}

// ---- the use control in your own flat: stand by a fault
const PROV = {
  use() {
    const I = api.INT; if (!on() || !I.on || !I.cab || !I.cab.flat || !I.room || !I.room._fx) return null;
    const uid = I.cab.flat; if (!mineUnit(uid)) return null;
    const d = defsOf(uid); if (!d) return null;
    const pos = I.room._fx.pos; let best = null, bd = H.near;
    for (const x of openDefs(d)) { const p = pos[x.kind]; if (!p) continue; const q = Math.hypot(I.px - p[0], I.pz - p[1]); if (q < bd) { bd = q; best = x; } }
    if (!best) return null;
    const kh = api.keyHint, name = KINDS[best.kind], t = ten(), mineRent = t && t.unit === uid, c = fixCost(best);
    if (mineRent && best.rep == null) return { label: "REPORT", hint: () => `${kh("use", "report the " + name)} to ${LL[U(uid).ll].name} · since ${label(best.since)}`, act: () => report(uid, best.id) };
    const st = best.rep != null ? (best.ign || (best.resp != null && day() < best.resp) ? `reported ${day() - best.rep} days ago, not fixed` : "reported") : "";
    return { label: "FIX", hint: () => `${kh("use", `fix the ${name} yourself, ${money(c)}`)}${st ? " · " + st : ""}`, act: () => fix(uid, best.id) };
  },
  digging: () => false
};

// ---- the flat's effect on you, and the days
function inFlat() { const I = api.INT; return on() && I && I.on && I.cab && I.cab.flat && mineUnit(I.cab.flat) ? I.cab.flat : null; }
function warmth(dt) {
  const uid = inFlat(); if (!uid) { warnT = 0; return; }
  const G = api.GS, d = defsOf(uid) || [], heat = !openDefs(d).some(x => x.kind === "heat"), damp = openDefs(d).some(x => x.kind === "damp");
  if (heat) { if (G.warmth < 100) G.warmth = Math.min(100, G.warmth + H.warmRate * dt); }
  else if (G.warmth > H.coldFloor) { G.warmth = Math.max(H.coldFloor, G.warmth + H.coldRate * dt); warnT += dt; if (warnT > 12) { warnT = 0; api.toast("It's freezing in here: the radiator is dead.", "warn"); } }
  if (damp && G.warmth > H.coldFloor) G.warmth = Math.max(H.coldFloor, G.warmth + H.dampRate * dt);
}

// ---- the Homes app
const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5.5h4V20"/></svg>';
function chipFor(u) { const l = LL[u.ll], U2 = api.ui; return l.kind === "slum" && slumOn() ? U2.chip("POOR RECORD", "due") : l.kind === "fair" ? U2.chip("GOOD RECORD", "ok") : U2.chip("MIXED RECORD"); }
function render(el) {
  const s = S(), Ui = api.ui, t = s.ten, D = day();
  let h = Ui.tabHead("HOMES · FINNMARK BOLIG", "Homes", api.fmtCash(api.GS.cash));
  const owed = (t ? t.arrears : 0) + s.debt + s.taxOwed;
  h += `<div class="tsub">${t ? `Renting ${Ui.esc(U(t.unit).name)}` : own().length ? `${own().length} flat${own().length > 1 ? "s" : ""} of your own` : "No home yet"}${owed > 0 ? " " + Ui.chip("OWED " + money(owed), "due") : ""}${t && t.notice ? " " + Ui.chip(t.notice.kind === "evict" ? "NOTICE TO QUIT" : "RENT RISE", "due") : ""}</div>`;
  if (!on()) h += `<p class="tnote2">Rentals are switched off in Settings > Options.</p>`;
  if (t) {
    const u = U(t.unit), l = LL[u.ll], open = openDefs(t.defects);
    h += Ui.sec("Your tenancy", `since ${label(t.since)}`);
    h += Ui.tabCard({ tf: "hm:ten", title: u.name, chips: Ui.chip(money(t.rent) + "/WK", "ok") + chipFor(u) + (t.protect > D ? Ui.chip("PROTECTED " + (t.protect - D) + "D", "ok") : ""),
      meta: `${Ui.esc(l.name)} · ${l.stars.toFixed(1)} of 5 · ${Ui.esc(l.rev)}`,
      note: `Deposit held: ${money(t.deposit)}. Arrears: ${money(t.arrears)}. ${t.rebate ? `Rebates so far: ${money(t.rebate)}. ` : ""}Next rent on Monday.` + (t.notice ? ` <b>${t.notice.kind === "evict" ? `Notice to quit: pay ${money(t.arrears)} or out by ${label(t.notice.eff)}.` : `Rent rises to ${money(t.notice.rent)} from ${label(t.notice.eff)}.`}</b>` : ""),
      pay: t.arrears > 0 ? money(t.arrears) : "", act: t.arrears > 0 ? "hmpay" : "hmout", actLabel: t.arrears > 0 ? "PAY ARREARS" : "MOVE OUT", blocked: t.arrears > 0 && api.GS.cash < 1 })
      .replace(`data-act="hmpay">PAY ARREARS</button>`, `data-act="hmpay">PAY ARREARS</button><button type="button" class="tbtn ghost" data-tf="hm:out" data-act="hmout">MOVE OUT</button>`);
    h += Ui.sec("Faults", open.length ? `${open.length} open` : "none");
    if (!open.length) h += `<p class="tnote2">Nothing wrong at the moment.</p>`;
    for (const d of open) {
      const age = D - d.since, rep = d.rep != null ? `reported ${D - d.rep} days ago` : "not reported", cpl = t.cpl && t.cpl.id === d.id;
      const st = d.rep == null ? "" : d.resp == null ? " · no reply" : D >= d.resp ? " · due now" : ` · promised ${label(d.resp)}`;
      const btns = (d.rep == null ? `<button type="button" class="tbtn" data-tf="hmr:${d.id}" data-act="hmr:${d.id}">REPORT</button>` : "")
        + `<button type="button" class="tbtn ghost${api.GS.cash < fixCost(d) ? " blocked" : ""}" data-tf="hmf:${d.id}" data-act="hmf:${d.id}">FIX ${money(fixCost(d))}</button>`
        + (canComplain(d) ? `<button type="button" class="tbtn" data-tf="hmc:${d.id}" data-act="hmc:${d.id}">COMPLAIN</button>` : "");
      h += `<div class="tcard" data-tf="hmd:${d.id}"><div class="tcb"><div class="tct"><span>${Ui.esc(KINDS[d.kind][0].toUpperCase() + KINDS[d.kind].slice(1))}</span>${Ui.chip(age + "D OLD", age > 10 ? "due" : "")}${cpl ? Ui.chip(t.cpl.result ? t.cpl.result.toUpperCase() : "RULING " + label(t.cpl.due).toUpperCase()) : ""}</div><div class="tcm">${rep}${st}</div><div class="tca">${btns}</div></div></div>`;
    }
    if (t.cpl && t.cpl.result) h += `<p class="tnote2">Last complaint: ${t.cpl.result}.</p>`;
  }
  const mine = own();
  if (mine.length) {
    h += Ui.sec("Yours", `${money(H.taxWeek)}/wk each in charges`);
    for (const id of mine) {
      const u = U(id), d = openDefs(s.own[id].defects);
      h += Ui.tabCard({ tf: "hmo:" + id, title: u.name, chips: Ui.chip("OWNED", "ok") + (d.length ? Ui.chip(d.length + " FAULT" + (d.length > 1 ? "S" : ""), "due") : ""), meta: `Bought ${label(s.own[id].since)} · no landlord`, note: d.length ? `Faults: ${d.map(x => KINDS[x.kind]).join(", ")}. Walk in and fix them: nobody else will.` : "Everything works.", pay: money(Math.round(u.price * H.sellK)), act: "hms:" + id, actLabel: "SELL" });
    }
  }
  if (s.debt > 0 || s.taxOwed > 0) h += Ui.tabCard({ tf: "hm:debt", title: "Money owed", chips: Ui.chip("UNPAID", "due"), meta: `${s.debt ? `Rent debt ${money(s.debt)}. ` : ""}${s.taxOwed ? `Property charges ${money(s.taxOwed)}.` : ""} You can't sign a new lease while you owe rent.`, pay: money(s.debt + s.taxOwed), act: "hmpay", actLabel: "PAY IT", blocked: api.GS.cash < 1 });
  h += Ui.sec("To rent or buy", "terms before you sign");
  for (const u of UNITS) {
    if (!u.at || (t && t.unit === u.id) || s.own[u.id]) continue;
    const l = LL[u.ll], why = canSign(u), need = u.rent * (u.dep + 1);
    h += Ui.tabCard({ tf: "hml:" + u.id, mini: (u.at ? (api.TABLET.miniDest = api.TABLET.miniDest || {}, api.TABLET.miniDest["fl_" + u.id] = { id: "fl_" + u.id, x: u.at.x, z: u.at.z, y: u.at.y, name: u.name }, "depot|fl_" + u.id) : ""), title: u.name,
      chips: Ui.chip(money(u.rent) + "/WK", "ok") + chipFor(u) + Ui.chip(u.size === "bedsit" ? "1 ROOM" : "2 ROOMS"),
      meta: `${Ui.esc(l.name)} · ${l.stars.toFixed(1)} of 5 · ${Ui.esc(l.rev)}`,
      note: `${Ui.esc(u.blurb)}<br>${lease(u).map(Ui.esc).join("<br>")}${u.asIs.length ? `<br><b>Known faults: ${u.asIs.map(k => KINDS[k]).join(", ")}.</b>` : ""}`,
      pay: `${money(need)} now`, act: "hmg:" + u.id, actLabel: "SIGN LEASE", blocked: !!why })
      .replace(`>SIGN LEASE</button>`, `>SIGN LEASE</button><button type="button" class="tbtn ghost${api.GS.cash < u.price ? " blocked" : ""}" data-tf="hmb:${u.id}" data-act="hmb:${u.id}">BUY ${money(u.price)}</button>`);
    if (why) h += `<div class="tcw">${Ui.esc(why)}</div>`;
  }
  if (s.hist.length) h += Ui.sec("History", "") + `<div class="tsml2">${s.hist.map(q => `<div class="tsm2 tprow"><b>${Ui.esc(q.d)}</b><span>${Ui.esc(q.t)}${q.amt ? (q.amt > 0 ? " · +" : " · −") + money(Math.abs(q.amt)) : ""}</span></div>`).join("")}</div>`;
  h += `<p class="tnote2">A flat is a few weeks' rent to move in and a lot of weeks' rent to own. A slumlord's rent is half the going rate and you pay the rest in cold nights: report faults from inside the flat, fix them yourself if he won't, and complain to the municipality if a reported fault stands a week. Owning a flat means no landlord at all.</p>`;
  el.innerHTML = `<div class="tapp">${h}</div>`;
  const on2 = (pre, fn) => { for (const b of el.querySelectorAll(`[data-act^='${pre}:']`)) b.addEventListener("click", () => fn(b.dataset.act.slice(pre.length + 1))); };
  for (const b of el.querySelectorAll("[data-act='hmpay']")) b.addEventListener("click", payDebt);
  for (const b of el.querySelectorAll("[data-act='hmout']")) b.addEventListener("click", () => moveOut("left"));
  on2("hmg", sign); on2("hmb", buy); on2("hms", sell);
  const uid = t && t.unit; on2("hmr", id => report(uid, +id)); on2("hmf", id => fix(uid, +id)); on2("hmc", id => complain(+id));
}

TLX.option({ id: "rentals", name: "Flats: rent or buy", hint: "Six flats in Kjøllefjord: a cheap weekly rent (deposit up front, taken Mondays, arrears if you can't pay) or an expensive purchase. Off = no flats, no rent, nothing charged.", sys: "housing",
  change: v => { for (const u of UNITS) if (u.beacon) u.beacon.g.visible = v; } });
TLX.option({ id: "slumlords", name: "Slumlords", hint: "Some landlords neglect their flats: faults, slow or no repairs, a rent rise when you complain, most of your deposit kept. Off = every landlord is a fair one.", sys: "housing" });
TLX.register({
  id: "housing", v: 1,
  state0: () => ({ own: {}, ten: null, debt: 0, taxOwed: 0, dT: null, wk: 0, ll: {}, hist: [], seq: 0, banUntil: 0 }),
  migrate: st => st,
  init(a) {
    api = a; clean();
    if (api.footx && !api.footx.includes(PROV)) api.footx.push(PROV);
    try { placeAll(); } catch (e) { console.error("TLX housing place", e); }
    for (const u of UNITS) if (u.beacon) u.beacon.g.visible = on();
    api.TABLET.register({ id: "homes", name: "Homes", icon: ICON, order: 8.7, live: 8, hidden: () => !on(), badge: () => { const t = S().ten; return t && (t.arrears > 0 || t.notice) ? "!" : ""; }, render });
    if (api.TABLET.addLayer) api.TABLET.addLayer("depots", () => on() ? UNITS.filter(u => u.at && mineUnit(u.id)).map(u => ({ x: u.at.x, z: u.at.z, name: u.name.split(" · ")[0].toUpperCase(), kind: "home" })) : []);
    if (api.SEASON && api.SEASON.addBill) api.SEASON.addBill({ name: "Rent and property charges", perWeek: () => on() ? -((S().ten ? S().ten.rent : 0) + own().length * H.taxWeek) : 0 });
  },
  tick(dt) {
    if (!api || !api.started() || !api.tutDone()) return;
    if (!on()) return;
    tAcc += dt; if (tAcc >= 1) { const d = tAcc; tAcc = 0; try { dayStep(); } catch (e) { if (!window.TLXH.err) console.error("TLX housing", e); window.TLXH.err = String(e); } fxSync(false); void d; }
    warmth(dt);
  },
  monday() { }
});
window.TLXH = { H, LL, UNITS, state: S, sign, buy, sell, report, fix, complain, canComplain, moveOut, payDebt, dayStep, settle, dayOf, lease, canSign, defsOf, openDefs, heatOk, weekOf, PROV, err: null };
})();
