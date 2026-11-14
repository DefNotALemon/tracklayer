// Tracklayer — staff (G4 milestone 5, loop/EXPANSION.md "5. Staff"). Slice 5.1: the Staff app, applicants, hiring.
//
// People apply for a VACANCY, not into a pool: a vacancy is a place you own that has nobody in a role it needs. Until
// milestones 6-8 bring lighthouses, inns and garages, the only place is an owned Real Estate depot cabin and the only
// role is its caretaker, who keeps it aired, warm and booked (a few percent more nights let; how much depends on their
// REAL experience times a hidden work trait, so the years on the card aren't the whole story). Later slices add rows to
// ROLES and a source of places.
//
// An applicant shows a name, a home village, a weekly wage and years of experience. Traits stay hidden: how hard they
// work, their temper, and whether they're honest (about one in six oversell their experience: xpReal < xp; the 5.2
// interview is how you find out). Each one waits a few game days for an answer, then withdraws. A new vacancy gets one
// applicant straight away and more every 6-20 game hours (3 per vacancy, 6 on the board at most). HIRE fills the
// vacancy; the others who applied for it withdraw. LET GO frees it again (not while you owe them wages).
//
// Wages are paid on Monday (the TLX monday hook, beside the rent), pro rata from the hour someone was hired. Short of
// cash, the rest is owed; staff who are owed money don't work (no bonus) until you pay it from the app. Over the summer
// skip, the wages go on the season's bill.
//
// SAVED under x.sys.staff: { seq, next, apps: [applicant], crew: [hired], owed, last: [statements] }. The cabins'
// occupancy reads TLX.staff.occ(cabinId) (a bridge in tracklayer.js reOcc).
(() => {
"use strict";
// ---- tunables ----
const ROLES = {
  caretaker: { name: "Caretaker", wage: [30, 3.2], blurb: "keeps the cabin aired, warm and booked", occ: [0.03, 0.0055, 0.12] }   // wage: base + per year; occ: base + per real year, cap
};
const POST_DAYS = [2, 5];          // game days an applicant waits for an answer
const NEXT_H = [6, 20];            // game hours between new applicants while a vacancy is open
const PER_VAC = 3, BOARD_MAX = 6, OVERSELL = 1 / 6, LAST_N = 4;
const FIRST = ["Ingrid", "Sigrid", "Kari", "Marit", "Astrid", "Solveig", "Ragnhild", "Elle", "Máret", "Inger", "Hanne", "Tove", "Liv", "Berit", "Anja",
  "Ole", "Nils", "Arne", "Lars", "Per", "Jon", "Mikkel", "Aslak", "Johan", "Knut", "Tor", "Even", "Odd", "Leif", "Henrik", "Isak"];
const LAST = ["Hætta", "Sara", "Eira", "Somby", "Guttorm", "Pedersen", "Johansen", "Nilsen", "Hansen", "Olsen", "Berg", "Strand", "Lie", "Mikkelsen",
  "Isaksen", "Kristiansen", "Mathisen", "Bongo", "Labba", "Anti", "Utsi", "Holmgren", "Nordvik", "Fjeld", "Aasen"];

let api = null, noted = -1e9;
const S = () => TLX.state("staff");
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const hour = () => (api && api.GS ? +api.GS.hour || 0 : 0);
const money = n => api.fmtCash(Math.round(n));

// every place that can take staff, as { id, role, name } (5.1: the depot cabins you own)
function places() {
  const out = [];
  if (api && api.re) for (const c of api.re.owned()) out.push({ id: "re:" + c.id, role: "caretaker", name: c.name, cab: c.id });
  return out;
}
const placeOf = id => places().find(p => p.id === id) || null;
function vacancies() { const s = S(); return places().filter(p => !s.crew.some(m => m.place === p.id)); }
function villages() {
  const W = api.world, v = (W.SITES || []).filter(x => x.kind === "village").map(x => x.name);
  if (W.depot && W.depot.name) v.push(W.depot.name.replace(/ quay$/, ""));
  return v.length ? v : ["town"];
}
function newApplicant(vac) {
  const s = S(), xp = Math.round(Math.pow(Math.random(), 1.6) * 22), R = ROLES[vac.role];
  const honest = Math.random() >= OVERSELL;
  const xpReal = honest ? xp : Math.max(0, Math.round(xp * rnd(0.15, 0.55)) - 1);
  const wage = Math.round(R.wage[0] + R.wage[1] * xp + rnd(-5, 7));
  const a = { id: ++s.seq, name: pick(FIRST) + " " + pick(LAST), village: pick(villages()), role: vac.role, place: vac.id,
    wage, xp, xpReal, tr: { work: +rnd(0.6, 1.3).toFixed(2), temper: +Math.random().toFixed(2), honest }, at: hour(), exp: hour() + 24 * rnd(POST_DAYS[0], POST_DAYS[1]) };
  s.apps.push(a);
  return a;
}
// a caretaker's lift on their cabin's nights let: real experience x how hard they work; nothing while owed wages
function occOf(m) {
  const R = ROLES[m.role]; if (!R || !R.occ) return 0;
  if (S().owed > 0) return 0;
  return Math.min(R.occ[2], (R.occ[0] + R.occ[1] * Math.min(16, m.xpReal)) * m.tr.work);
}
function hire(id) {
  const s = S(), a = s.apps.find(q => q.id === id); if (!a) return false;
  const p = placeOf(a.place);
  if (!p || s.crew.some(m => m.place === a.place)) { s.apps = s.apps.filter(q => q !== a); api.toast(`That position's already filled.`, "warn"); refresh(); return false; }
  s.apps = s.apps.filter(q => q.place !== a.place);
  s.crew.push({ id: a.id, name: a.name, village: a.village, role: a.role, place: a.place, wage: a.wage, xp: a.xp, xpReal: a.xpReal, tr: a.tr, hired: hour(), paidTo: hour() });
  api.ui.ping("good");
  api.toast(`${a.name} starts as ${ROLES[a.role].name.toLowerCase()} at ${p.name}. ${money(a.wage)} a week, paid Mondays.`, "good");
  api.save(); refresh(); return true;
}
function letGo(id) {
  const s = S(), m = s.crew.find(q => q.id === id); if (!m) return false;
  if (s.owed > 0) { api.toast(`Pay the ${money(s.owed)} in wages you owe before letting anyone go.`, "warn"); return false; }
  const due = wageDue(m, hour()); if (due > api.GS.cash) { api.toast(`${m.name} is owed ${money(due)} for this week. You have ${money(api.GS.cash)}.`, "warn"); return false; }
  api.GS.cash -= due;
  s.crew = s.crew.filter(q => q !== m);
  api.toast(`${m.name} has been let go${due ? `, paid ${money(due)} for the days worked` : ""}. The job's open again.`, "info");
  s.next = Math.min(s.next, hour() + 2);
  api.save(); refresh(); return true;
}
function payOwed() {
  const s = S(); if (!(s.owed > 0)) return;
  const p = Math.min(s.owed, api.GS.cash); api.GS.cash -= p; s.owed = Math.round((s.owed - p) * 100) / 100;
  api.toast(s.owed > 0 ? `Paid ${money(p)} in wages. ${money(s.owed)} still owed: nobody works until it's settled.` : `Wages paid. Your staff are back at work.`, s.owed > 0 ? "warn" : "good");
  api.save(); refresh();
}
const wageDue = (m, h) => Math.max(0, m.wage * Math.min(1, (h - m.paidTo) / 168));
function refresh() { if (api && api.TABLET) api.TABLET.refresh("staff"); }

// keep the board honest: withdraw the expired and anyone whose vacancy has gone, post new applicants on schedule
function boardTick() {
  const s = S(), h = hour(), vac = vacancies(), ids = new Set(vac.map(v => v.id));
  const n0 = s.apps.length;
  s.apps = s.apps.filter(a => a.exp > h && ids.has(a.place));
  // a staffer whose place you no longer own goes (can't happen in 5.1; later property can be sold)
  const own = new Set(places().map(p => p.id)); s.crew = s.crew.filter(m => own.has(m.place));
  if (!vac.length) { if (s.apps.length !== n0) refresh(); return; }
  let posted = null;
  for (const v of vac) if (!s.apps.some(a => a.place === v.id) && s.apps.length < BOARD_MAX) { posted = newApplicant(v); s.next = Math.max(s.next, h + rnd(NEXT_H[0], NEXT_H[1])); }   // an empty vacancy gets someone at once; the next one comes later
  if (h >= s.next) {
    s.next = h + rnd(NEXT_H[0], NEXT_H[1]);
    const open = vac.filter(v => s.apps.filter(a => a.place === v.id).length < PER_VAC);
    if (open.length && s.apps.length < BOARD_MAX) posted = newApplicant(pick(open));
  }
  if (posted && api.TABLET && performance.now() - noted > 60000) {
    noted = performance.now();
    api.TABLET.notify({ app: "staff", title: "New applicant", body: `${posted.name} from ${posted.village} applied to be ${ROLES[posted.role].name.toLowerCase()} at ${placeOf(posted.place).name}.`, ttl: 6 });
  }
  if (posted || s.apps.length !== n0) refresh();
}

// ---- the app ----
const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c.6-3.6 3-5.6 6-5.6s5.4 2 6 5.6"/><circle cx="17" cy="9" r="2.4"/><path d="M15.6 14.2c2.6-.4 4.8 1.4 5.4 4.6"/></svg>';
const yrs = n => n === 0 ? "no experience" : n === 1 ? "1 year's experience" : n + " years' experience";
const left = h => { const d = h - hour(); return d >= 36 ? Math.round(d / 24) + " days left" : d >= 2 ? Math.round(d) + " hours left" : "withdrawing soon"; };
function render(el) {
  const s = S(), U = api.ui, own = places(), vac = vacancies();
  const weekly = s.crew.reduce((t, m) => t + m.wage, 0);
  let h = U.tabHead("STAFF · YOUR PEOPLE", "Staff", api.fmtCash(api.GS.cash));
  h += `<div class="tsub">${s.crew.length ? `${s.crew.length} on the books · wages ${money(weekly)} a week, paid Mondays` : "Nobody on the books"}${vac.length ? ` · ${vac.length} opening${vac.length > 1 ? "s" : ""}` : ""}${s.owed > 0 ? " " + U.chip("WAGES OWED " + money(s.owed), "due") : ""}</div>`;
  if (s.owed > 0) h += U.tabCard({ tf: "sto", title: "Wages owed", chips: U.chip("NOT WORKING", "due"), meta: "Nobody works until they've been paid.", pay: money(s.owed), act: "sto", actLabel: "PAY IT" });
  if (s.crew.length) {
    h += U.sec("On the books", "wages paid Mondays");
    for (const m of s.crew) {
      const p = placeOf(m.place), R = ROLES[m.role], lift = occOf(m);
      h += U.tabCard({ tf: "stc:" + m.id, title: m.name, chips: U.chip(R.name.toUpperCase(), "ok"),
        meta: `${p ? U.esc(p.name) : "?"} · from ${U.esc(m.village)} · ${yrs(m.xp)}`,
        note: `${R.blurb}: ${lift > 0 ? `about +${Math.round(lift * 100)}% nights let` : "not working while wages are owed"}. Owed so far this week: ${money(wageDue(m, hour()))}.`,
        pay: money(m.wage) + "/wk", act: "stl:" + m.id, actLabel: "LET GO" });
    }
  }
  h += U.sec("Applicants", vac.length ? "they wait a few days for an answer" : "");
  if (!own.length) h += `<p class="tnote2">Staff need somewhere to work. Buy a depot cabin in Real Estate and people will apply to be its caretaker.</p>`;
  else if (!vac.length) h += `<p class="tnote2">Every place you own has its staff. Let someone go, or buy another place, and the job is posted again.</p>`;
  else if (!s.apps.length) h += `<p class="tnote2">No applicants yet. Word gets round: someone will apply soon.</p>`;
  for (const a of s.apps.slice().sort((p, q) => p.place < q.place ? -1 : p.place > q.place ? 1 : p.exp - q.exp)) {
    const p = placeOf(a.place);
    h += U.tabCard({ tf: "sta:" + a.id, title: a.name, chips: U.chip(ROLES[a.role].name.toUpperCase()) + U.chip(left(a.exp).toUpperCase(), a.exp - hour() < 24 ? "due" : ""),
      meta: `for ${p ? U.esc(p.name) : "?"} · from ${U.esc(a.village)} · ${yrs(a.xp)}`, pay: money(a.wage) + "/wk", act: "sth:" + a.id, actLabel: "HIRE" });
  }
  if (s.last.length) {
    h += U.sec("Wage slips", "");
    h += `<div class="tsml2">${s.last.map(w => `<div class="tsm2"><b>${U.esc(w.d)}</b><span>Wages ${money(w.wages)} · ${w.n} on the books</span>${w.owed ? U.chip("OWING " + money(w.owed), "due") : U.chip("PAID", "ok")}</div>`).join("")}</div>`;
  }
  h += `<p class="tnote2">What you see is what they tell you: experience on the card is their word, and how hard someone works only shows once they're on the job.</p>`;
  el.innerHTML = `<div class="tapp">${h}</div>`;
  for (const b of el.querySelectorAll("[data-act^='sth:']")) b.addEventListener("click", () => hire(+b.dataset.act.slice(4)));
  for (const b of el.querySelectorAll("[data-act^='stl:']")) b.addEventListener("click", () => letGo(+b.dataset.act.slice(4)));
  for (const b of el.querySelectorAll("[data-act='sto']")) b.addEventListener("click", payOwed);
}

TLX.register({
  id: "staff", v: 1,
  state0: () => ({ seq: 0, next: 0, apps: [], crew: [], owed: 0, last: [] }),
  migrate(st) { return st; },
  init(a) {
    api = a;
    const s = S();
    for (const k of ["apps", "crew", "last"]) if (!Array.isArray(s[k])) s[k] = [];
    s.owed = +s.owed || 0; s.seq = s.seq | 0; s.next = +s.next || 0;
    a.TABLET.register({ id: "staff", name: "Staff", icon: ICON, order: 8.5, live: 10,
      hidden: () => !(a.GS.apps && a.GS.apps.realestate) && !S().crew.length,
      badge: () => S().owed > 0 ? "!" : S().apps.length || "",
      render });
    if (a.SEASON && a.SEASON.addBill) a.SEASON.addBill({ name: "Staff wages", perWeek: () => -S().crew.reduce((t, m) => t + m.wage, 0) });
  },
  tick(dt) {
    if (!api || !api.started() || api.tutHidden()) return;
    this._t = (this._t || 0) + dt; if (this._t < 1) return; this._t = 0;
    boardTick();
  },
  monday(week) {
    const s = S(), h = hour(); if (!s.crew.length && !(s.owed > 0)) return;
    let wages = 0; for (const m of s.crew) { wages += wageDue(m, h); m.paidTo = h; }
    wages = Math.round(wages);
    const owe = wages + s.owed, paid = Math.min(owe, Math.max(0, api.GS.cash)); api.GS.cash -= paid; s.owed = owe - paid;
    s.last.unshift({ d: week && week.label || "", wages, n: s.crew.length, owed: s.owed }); s.last = s.last.slice(0, LAST_N);
    refresh();
    if (api.TABLET) setTimeout(() => api.TABLET.notify({ app: "staff", kind: s.owed ? "warn" : "good", title: `Wages · week to ${week && week.label || ""}`,
      body: `${money(wages)} to ${s.crew.length} on the books${s.owed ? ` · ${money(s.owed)} owed: nobody works till it's paid` : ""}`, ttl: 8 }), 5200);
  }
});
TLX.staff = { ROLES, occ: cabId => { const s = S(); if (!s) return 0; const m = s.crew.find(q => q.place === "re:" + cabId); return m ? occOf(m) : 0; },
  places, vacancies, hire, letGo, payOwed, tick: boardTick, wageDue, post: newApplicant };
})();
