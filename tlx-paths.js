// Tracklayer: the Paths app (goal G7, loop/HOME.md I8). One screen for your whole life on the Nordkinn: each path
// you can follow as a line saying where you stand, the next step in plain words and what it opens, and a "today"
// card of three things worth doing now. It only READS the other systems (their saved state and their globals) and
// never fails a path because one of them is missing or changed: a path that cannot be read is left out.
(() => {
"use strict";
let api = null;
const X = window.TLXPATH = { err: "", last: null };
const st = id => { try { return TLX.state(id) || {}; } catch (e) { return {}; } };
const n = v => Array.isArray(v) ? v.length : v && typeof v === "object" ? Object.keys(v).length : +v || 0;
const pl = (k, one, many) => k + " " + (k === 1 ? one : many || one + "s");
const money = v => api.fmtCash(Math.round(v));

/* each path: () => { id, name, where, next, opens, k (0..1 how far along), go (an app id to open) } or null */
const PATHS = [
  function courier() {
    const G = api.GS, R = api.ranks || [], d = G.delivered || 0; let cur = R[0], nx = null; for (const r of R) { if (d >= r.at) cur = r; else if (!nx) nx = r; }
    return { id: "courier", name: "Courier", where: `${cur ? cur.name : "Courier"} · ${pl(d, "delivery", "deliveries")}`, next: nx ? `${pl(nx.at - d, "more delivery", "more deliveries")} to ${nx.name}.` : "Top of the ladder. Every board on the peninsula is open to you.", opens: nx ? nx.opens : "", k: nx ? (d - cur.at) / Math.max(1, nx.at - cur.at) : 1, go: "jobs" };
  },
  function rescue() {
    const G = api.GS, L = api.LOG || {}, r = G.rescues || 0, saved = L.sar || 0, lost = L.sarLost || 0, lic = G.lic || {}, has = Object.keys(lic).some(k => /sar|resc|red/i.test(k));
    return { id: "rescue", name: "Rescue", where: r + saved ? `${pl(r + saved, "person", "people")} brought in${lost ? `, ${lost} lost` : ""}` : "No call-outs yet", next: has || saved ? "Stay on call: the next call-out comes over the tablet, and the clock starts when it does." : "Sign on at Nordkinn Redning (the rescue school) to go on the call-out list.", opens: has || saved ? "" : "Paid search and rescue call-outs, and the sled ambulance work.", k: Math.min(1, (r + saved) / 12), go: "jobs" };
  },
  function trails() {
    const T = window.TLXSK; if (!T || !T.list || !T.list.length) return null; const mine = T.list.filter(t => t.st && t.st.taken), bad = mine.filter(t => { try { let b = 0; for (let i = 0; i < t.st.seg.length; i++) { const w = T.segWord(t, i); if (w === "snowed under" || w === "worn" || w === "icy" || w === "not prepared") b++; } return b > t.st.seg.length * 0.3; } catch (e) { return false; } });
    const rk = (api.GS.delivered || 0) >= 3;
    return { id: "trails", name: "Ski trails", where: mine.length ? `${pl(mine.length, "trail")} of ${T.list.length} in your care${bad.length ? `, ${bad.length} needing the groomer` : ", all in good shape"}` : "No trail in your care", next: !rk ? "Make three deliveries to join the trail crew." : !mine.length ? "Take on Lysløypa in the Løyper app and set it in the evening: it is the one the village skis after work." : bad.length ? `Set ${bad[0].name}: people stop coming when the track is poor.` : mine.length < T.list.length ? "Take on another trail: the long ones pay more for more work." : "Keep them good all week for the bonus.", opens: mine.length ? "Monday pay from the løypelag by how much the trails are skied." : "A weekly income, and the village out on skis.", k: mine.length / T.list.length, go: "loyper", bad: bad.length ? bad[0].name : "" };
  },
  function plow() {
    const p = st("plow"), blades = n(p.blades), con = n(p.con), paid = +p.conPaid || 0; if (!("blades" in p)) return null;
    return { id: "plow", name: "Plowing", where: blades ? `${pl(blades, "blade")}, ${con ? pl(con, "contract") : "no contracts"}${paid ? `, ${money(paid)} earned` : ""}` : "No plow yet", next: !blades ? "Buy a blade for a truck at the garage's Plow tab." : !con ? "Take a driveway or a road in the Plow app: after a storm every door needs digging out." : "Plow after every snowfall before the Monday settle-up.", opens: !blades ? "Driveways, lots, streets and the three roads, paid weekly." : "", k: Math.min(1, (blades ? 0.3 : 0) + con * 0.1), go: "plow" };
  },
  function staff() {
    const s = st("staff"); if (!("crew" in s)) return null; const c = n(s.crew), ap = n(s.apps);
    return { id: "staff", name: "Staff", where: c ? `${pl(c, "person", "people")} working for you${s.owed ? `, ${money(s.owed)} in wages owed` : ""}` : "Nobody on the payroll", next: s.owed > 0 ? "Pay the wages you owe before someone walks out." : ap ? `${pl(ap, "applicant")} waiting for an interview in the Staff app.` : c ? "Keep them paid on Mondays." : "Own a depot cabin first: caretakers apply once there is something to look after.", opens: c ? "" : "Caretakers, plow drivers and helpers who work while you ride.", k: Math.min(1, c / 5), go: "staff" };
  },
  function homes() {
    const h = st("housing"), p = st("prop"), own = n(h.own) + n(p.own), ten = h.ten;
    return { id: "homes", name: "Homes and property", where: own ? `${pl(own, "place")} of your own${ten ? ", and a rented flat" : ""}` : ten ? "Renting a flat" : "No roof of your own", next: h.debt > 0 || (ten && ten.arrears > 0) ? "You owe rent: pay it in the Homes app before the notice comes." : !own && !ten ? "Rent a flat cheaply in the Homes app, or save for a cabin in Real Estate." : !own ? "Save for a place of your own: a cabin is also a depot." : "Furnish it, keep it clean, and it earns its keep.", opens: own ? "" : "A warm bed, a depot for fuel and freight, somewhere to furnish.", k: Math.min(1, own / 4 + (ten ? 0.15 : 0)), go: "homes" };
  },
  function lights() {
    const l = st("lights"); if (!("lamps" in l)) return null; const k = n(l.lamps);
    return { id: "lights", name: "Lighthouses", where: k ? `${pl(k, "light")} in your keeping` : "No light in your keeping", next: k ? "Keep the oil up and the lens clean: a dark light is a fine." : "Reach Expedition hauler (20 deliveries): Slettnes starts hiring then.", opens: k ? "" : "Keeper's pay, oil runs along the coast, the best views on the peninsula.", k: Math.min(1, k / 3), go: "lights" };
  },
  function boats() {
    const v = st("vehicles"), f = st("seafish"); const owned = Array.isArray(v.owned) ? v.owned : [], boat = owned.filter(o => o && /skiff|boat|sjark/i.test(String(o.kind || o.id || o.type || ""))).length;
    return { id: "boats", name: "Boats and the sea", where: boat ? `${pl(boat, "boat")}${f.gaff ? ", gaff aboard" : ""}` : "No boat", next: boat ? "Fish the banks when the sea is flat, and carry parcels to the fjord villages by water." : "Buy the skiff at the boatyard below the quay.", opens: boat ? "" : "Sea fishing, water deliveries, the fjord villages without the road.", k: boat ? 0.6 : 0, go: "boats" };
  },
  function machines() {
    const o = api.GS.own || {}, sl = n(o.sleds), v = st("vehicles"), tr = n(v.owned);
    return { id: "machines", name: "Machines", where: `${pl(sl, "sled")}${tr ? `, ${pl(tr, "vehicle")}` : ""}`, next: sl < 2 ? "A second sled for a second job: a puller for freight, a light one for the trail." : !tr ? "A pickup opens the roads: the garage has used ones." : "Keep them serviced: wear costs more than parts.", opens: sl < 2 ? "Heavier freight and the fell." : !tr ? "Trailers, the plow, the summer roads." : "", k: Math.min(1, (sl + tr) / 6), go: "" };
  },
  function hunting() {
    const g = st("guns"); if (!("owned" in g)) return null; const own = n(g.owned), game = n(g.game);
    return { id: "hunting", name: "Hunting", where: own ? `${pl(own, "rifle")}${g.licence ? ", licensed" : ", no licence"}${game ? `, ${pl(game, "animal")} taken` : ""}` : "No rifle", next: !own ? "Jakt & Våpen in Kjøllefjord sells rifles." : !g.licence ? "Get the hunting licence before the season." : "Hunt in season, within the quota, and take it to the butcher.", opens: own && g.licence ? "" : "Meat for the freezer or the butcher's money.", k: Math.min(1, (own ? 0.3 : 0) + (g.licence ? 0.3 : 0) + game * 0.05), go: "" };
  },
  function village() {
    const N = window.TLXN, T = window.TLXTALK, know = T && T.known ? T.known() : 0, tot = N && N.people ? N.people.length : 0; if (!tot) return null;
    const F = window.TLXFG, sp = F && F.count ? F.count() : null, C = window.TLXCAM, ph = C && C.roll ? C.roll().length : 0;
    return { id: "village", name: "The village", where: `${know} of ${tot} people know you by name${sp ? `, ${sp.seen} of ${sp.all} animals in the field guide` : ""}${ph ? `, ${pl(ph, "photo")}` : ""}`, next: know < 5 ? "Stop and say a word to the people you pass: at the café, on the trail, at their door." : know < tot / 3 ? "Do people a turn (dig a car out, set their trail, bring their parcel) and they remember." : "You are one of them now.", opens: know < 5 ? "Doors that open when you knock, tips on where the herd is, a discount from a face that knows yours." : "", k: tot ? know / tot : 0, go: "gram" };
  },
  function money_() {
    const c = api.GS.cash || 0, h = st("housing"), s = st("staff"), owed = (+h.debt || 0) + (+h.taxOwed || 0) + (+s.owed || 0) + ((h.ten && +h.ten.arrears) || 0);
    return { id: "money", name: "Money", where: `${money(c)} in hand${owed ? `, ${money(owed)} owed` : ""}`, next: owed > c ? "You owe more than you have: take the best-paying job on the board today." : owed ? "Clear what you owe on Monday." : c < 500 ? "Two or three deliveries make the next upgrade." : "Enough to choose: a machine, a blade, or a place of your own.", opens: "", k: Math.min(1, c / 25000), go: "" };
  }
];

// three things worth doing now, most pressing first
function today(rows) {
  const G = api.GS, out = [], add = (t, why, pr) => out.push({ t, why, pr });
  const sv = st("survival"), w = st("wounds"), h = st("housing"), by = id => rows.find(r => r.id === id);
  if (w.health !== undefined && w.health < 60) add("See to yourself", "You are hurt: bandage up, then the helsesenter.", 100);
  if (G.warmth < 40) add("Get warm", "You are cold through: a stove, a cab or a fire before anything else.", 95);
  if (G.stormPhase === "storm") add("Sit the storm out", "Nothing on the fell is worth it. Plowing pays the moment it passes.", 90);
  else if (G.warned) add("A storm is coming", "Fuel up and finish what is aboard before it arrives.", 85);
  if (sv.hunger !== undefined && (sv.hunger < 35 || sv.thirst < 35)) add("Eat and drink", "The shop, the café or what is in your pack.", 80);
  if (G.cap && G.fuel / G.cap < 0.2 && !(api.FOOT && api.FOOT.on)) add("Fuel", "Under a fifth of a tank.", 78);
  if ((h.ten && h.ten.arrears > 0) || h.debt > 0) add("Pay the rent you owe", "Homes app.", 70);
  if (n(G.load) > 0) add("Deliver what is aboard", `${pl(n(G.load), "parcel")} on the sled.`, 65);
  const tr = by("trails"); if (tr && tr.bad) add("Set " + tr.bad, "The track is poor and people are staying home.", 60);
  const stf = by("staff"); if (stf && /applicant/.test(stf.next)) add("Interview an applicant", "Staff app.", 45);
  if (!n(G.load) && !n(G.jobs)) add("Take a job from the board", "The quay board has freight waiting.", 40); else if (n(G.jobs)) add("Collect a job you took", `${pl(n(G.jobs), "job")} waiting to be picked up.`, 50);
  const vil = by("village"); if (vil && vil.k < 0.2) add("Say a word to somebody", "The village does not know you yet.", 30);
  const hr = ((G.hour % 24) + 24) % 24; if (hr > 16 && hr < 22 && tr && tr.k > 0 && !tr.bad) add("Evening groom", "A track set in the evening frosts hard overnight and lasts.", 28);
  add("Go and look at something", "A peak you have not stood on, the lighthouse, the far village.", 5);
  out.sort((a, b) => b.pr - a.pr); return out.slice(0, 3);
}
function rows() { const out = []; for (const f of PATHS) { try { const r = f(); if (r) { r.k = Math.max(0, Math.min(1, +r.k || 0)); out.push(r); } } catch (e) { X.err = f.name + ": " + e; } } return out; }
X.rows = rows; X.today = () => today(rows());

const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20c4-1 4-6 8-7s4-6 8-9"/><circle cx="4" cy="20" r="1.300"/><circle cx="12" cy="13" r="1.300"/><circle cx="20" cy="4" r="1.300"/></svg>';
function render(el) {
  const Ui = api.ui, R = rows(), T = today(R), apps = api.TABLET.byId || {};
  let h = Ui.tabHead("PATHS", "Your life here", api.fmtCash(api.GS.cash));
  h += Ui.sec("Today", "three things worth doing now");
  h += `<div style="display:flex;flex-direction:column;gap:4px;margin:4px 0 8px">` + T.map((t, i) => `<div class="tnote2" style="margin:0"><b>${i + 1}. ${Ui.esc(t.t)}.</b> ${Ui.esc(t.why)}</div>`).join("") + `</div>`;
  h += Ui.sec("Paths", `${R.length} you can follow`);
  for (const r of R) {
    const bar = `<span style="display:inline-block;width:64px;height:5px;border-radius:3px;background:rgba(255,255,255,.14);vertical-align:middle;margin-left:6px"><span style="display:block;height:100%;width:${Math.round(r.k * 100)}%;border-radius:3px;background:#ff7a3a"></span></span>`;
    const can = r.go && apps[r.go] && !(apps[r.go].hidden && apps[r.go].hidden());
    h += Ui.tabCard({ tf: "pa:" + r.id, title: r.name, chips: bar, meta: Ui.esc(r.where), note: `<b>Next:</b> ${Ui.esc(r.next)}${r.opens ? ` <span style="opacity:.75">Opens: ${Ui.esc(r.opens)}</span>` : ""}`, act: can ? "go:" + r.go : "", actLabel: can ? "OPEN " + String(apps[r.go].name || r.go).toUpperCase() : "" });
  }
  el.innerHTML = h; X.last = { rows: R, today: T };
  for (const b of el.querySelectorAll("[data-act^='go:']")) b.addEventListener("click", () => api.TABLET.go(b.dataset.act.slice(3)));
}
X.render = render;
TLX.register({ id: "paths", v: 1, state0: () => ({}), init(a) { api = a; a.TABLET.register({ id: "paths", name: "Paths", icon: ICON, order: 1.5, live: 12, render }); } });
})();
