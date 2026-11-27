// Tracklayer: thank-yous at the door (Lemon, 11 Nov 2026: "delivering jobs should sometimes reward snacks, spare parts, or sled
// upgrades to fit at home, handed over with a bit of characterful NPC dialogue").
//
// Now and then, when you hand a parcel over on time and in one piece, the person at the door gives you something and says a few
// words about it. Never at the quay, never on a late or damaged delivery, never two doors running: it stays special.
//
//   WHO     a grown-up from a real household at that place (tlx-news.js: the same house holds the same family every game), so the
//           name on the card is somebody who lives there, and the "my son Jonas" in the line is their own son. A place where nobody
//           lives (the wind farm, a herder cabin, the lighthouse) gives a role instead of a name.
//   WHAT    1. SOMETHING TO EAT OR DRINK (most often): it goes in your pocket (three fit; a fourth is eaten at the door) and you eat
//              or drink it by yourself the moment hunger or thirst drops under 30, so it is worth a stretch of the fell. A place's
//              food is its own: dried reindeer in the herders' villages, stockfish in the fishing ones.
//           2. A SPARE PART: a drive belt, plugs, runners. The garage takes spares in trade: their worth comes off the next part
//              you buy there (the Parts tab says how much you are carrying).
//           3. AN UPGRADE (rare): a part from the garage's own shelf ($80 to $420, one your sled's generation can take) that you do
//              not own. It is yours from that moment, exactly as if bought: the Parts tab shows it as Owned and fits it for nothing.
//   HOW OFTEN  never within two hand-overs of the last gift; from the third on 20%, +6% each further one, certain by the seventeenth.
//              About one hand-over in six over a long game.
//   THE WORDS  come up as a tablet note (who and where in the title, the line in the body, 11 s) once no other note is showing,
//              with a one-line toast saying what you were given and where it went.
//
// Reaches the game through api.gift (deliver() calls gift.deliv; fitPart() reads gift.credit / gift.spend) and api.partsx.
// Posts kind "gift" to the news bus. Option `gifts` (Settings > Options, on by default): off = nothing is given, nothing in the
// pocket is eaten, no credit is taken; what you were carrying is kept for when it is switched back on.
//
// SAVED: x.sys.gifts = { since, n, upAt, pocket: [{ id, from }], credit, spares: [names], log: [{ t, who, name, site, kind, item }] }.
(() => {
"use strict";
let api = null, pend = null;
const S = () => TLX.state("gifts");
const POCKET = 3, EAT_AT = 30, QUIET = 2, WORDS_MS = 2600, NOTE_TTL = 11;
const G = window.TLXGIFT = { rng: Math.random, force: null, last: null, said: null, POCKET, EAT_AT };

TLX.option({ id: "gifts", name: "Thank-yous at the door", hint: "Now and then somebody you deliver to on time hands you something for the road: a bite to eat, a spare part the garage will take in trade, once in a while an upgrade for the sled. Off = nobody does.", sys: "gifts" });

// something to eat or drink. a: as handed over ("a lefse ..."), the: as eaten later ("the lefse"). where: weights by the kind of place.
const SNACKS = [
  { id: "lefse", a: "a lefse with butter and sugar", the: "the lefse", hunger: 35 },
  { id: "bolle", a: "a cinnamon bun, still warm", the: "the cinnamon bun", hunger: 30, warm: 3 },
  { id: "vaffel", a: "a waffle with brown cheese", the: "the waffle", hunger: 35 },
  { id: "fiskekake", a: "two fish cakes in paper", the: "the fish cakes", hunger: 40, where: { fish: 3 } },
  { id: "torrfisk", a: "a strip of stockfish", the: "the stockfish", hunger: 30, where: { fish: 3, herd: 0.3 } },
  { id: "reinkjott", a: "a bag of dried reindeer meat", the: "the dried reindeer meat", hunger: 45, where: { herd: 4, fish: 0.4 } },
  { id: "toddy", a: "a flask of hot blackcurrant toddy", the: "the blackcurrant toddy", thirst: 55, warm: 8, drink: true },
  { id: "kaffe", a: "a flask of black coffee", the: "the coffee", thirst: 40, warm: 6, drink: true },
  { id: "saft", a: "a bottle of crowberry juice", the: "the crowberry juice", thirst: 50, drink: true, where: { herd: 2 } }
];
// a spare the garage takes in trade for v dollars
const SPARES = [
  { id: "belt", a: "a spare drive belt", v: 45 },
  { id: "plugs", a: "a set of spark plugs", v: 25 },
  { id: "runners", a: "a pair of carbide runners", v: 60 },
  { id: "idlers", a: "a box of idler wheels and bolts", v: 40 },
  { id: "shackles", a: "a coil of tow rope and two shackles", v: 30 },
  { id: "oil", a: "two cans of two-stroke oil", v: 20 }
];
const UP_MIN = 80, UP_MAX = 420, UP_SKIP = ["hitch", "recv", "tether", "boost"];   // rigs and receivers gate jobs and have their own rules: never given away
G.SNACKS = SNACKS; G.SPARES = SPARES;

const pick = a => a[Math.min(a.length - 1, Math.floor(G.rng() * a.length))];
const cap1 = s => s ? s[0].toUpperCase() + s.slice(1) : s;
function wpick(list, w) { let t = 0; for (const o of list) t += w(o); let r = G.rng() * t; for (const o of list) { r -= w(o); if (r <= 0) return o; } return list[list.length - 1]; }

/* ---------------- how often ---------------- */
G.odds = since => since <= QUIET ? 0 : Math.min(1, 0.2 + 0.06 * (since - QUIET - 1));

/* ---------------- who is at the door ---------------- */
const placeKind = site => /herder|skj.nes|ifjord/i.test((site.name || "") + " " + (site.id || "")) ? "herd" : site.kind === "village" || /fjord|mehamn|gamvik|naust|strand/i.test(site.name || "") ? "fish" : "";
function giver(site) {
  const N = window.TLXN; let pool = [];
  try {
    if (N && N.people && N.people.length && Number.isFinite(site.x)) {
      if (site.kind === "village" && N.peopleIn) pool = N.peopleIn(site.id);
      if (!pool.length) pool = N.people.filter(p => Math.hypot(p.x - site.x, p.z - site.z) < 140);
      pool = pool.filter(p => p && p.age >= 18);
    }
  } catch (e) { pool = []; }
  if (pool.length) { const p = pick(pool); return { p, first: p.first, name: p.name, title: p.name + ", " + shortSite(site) }; }
  const n = site.name || "";
  const role = /wind farm/i.test(n) ? "The technician on shift" : /herder/i.test(n) ? "The herder" : /lighthouse/i.test(n) ? "The keeper" : site.type === "shop" ? "The one behind the counter" : "The one at the door";
  return { p: null, first: role, name: role, title: role + ", " + shortSite(site) };
}
const shortSite = site => String(site.name || "the door").replace(/ (herder cabin|wind farm|lighthouse)$/i, m => m.toLowerCase());
// somebody of theirs to name in the line: one of their own household when the house has one who fits, else a relative elsewhere
function kinOf(g, grown) {
  const N = window.TLXN, p = g.p; let fam = [];
  try { if (p && N && N.family) fam = N.family(p).filter(q => q && q.id !== p.id); } catch (e) { fam = []; }
  const parent = p && (p.role === "mother" || p.role === "father"), grand = p && /^grand/.test(p.role || "");
  const out = [];
  for (const q of fam) {
    const child = q.role === "son" || q.role === "daughter";
    if (grown && q.age < 12) continue;
    if (parent && child) out.push(`my ${q.role} ${q.first}`);
    else if (grand && child) out.push(`my grand${q.role} ${q.first}`);
    else if (parent && (q.role === "mother" || q.role === "father")) out.push(`my ${q.role === "mother" ? "wife" : "husband"} ${q.first}`);
    else if (parent && /^grand/.test(q.role)) out.push(`my ${p.role === "mother" ? "husband" : "wife"}'s ${q.role === "grandmother" ? "mother" : "father"} ${q.first}`);
    else if (q.role === "lodger") out.push(`our lodger ${q.first}`);
  }
  return out.length ? pick(out) : pick(["my nephew", "my sister's boy", "my brother", "my daughter", "the neighbour's girl"]);
}
function relOf(g) {
  const N = window.TLXN; let vs = [];
  try { vs = N && N.villages ? N.villages().filter(v => !g.p || v.id !== g.p.vid).map(v => v.name) : []; } catch (e) { vs = []; }
  const v = vs.length ? pick(vs) : "Mehamn";
  return pick([`my uncle in ${v}`, `my cousin over in ${v}`, "my late father", "my mother's cousin", "my brother-in-law", `my aunt in ${v}`, "my grandfather"]);
}

/* ---------------- the words ---------------- */
const SAY = {
  snack: [
    (x) => `You came all this way in that? Here: ${x.a}. ${x.drink ? "Drink it while it is warm" : "Eat it before it freezes"}.`,
    (x) => `${cap1(x.kin)} says nobody leaves this house hungry. ${cap1(x.a)}. Put it in your pocket.`,
    (x) => `I have no change for a tip. I have ${x.a}, and that is better than money out there.`,
    (x) => `Take ${x.a} for the road. ${cap1(x.rel)} drove freight over the fell for thirty years and never set out with empty pockets.`,
    (x) => `Wait. You have the look of somebody who skipped a meal to get here on time. ${cap1(x.a)}. No, take it.`,
    (x) => `We made too much, we always do. ${cap1(x.a)}, and tell them at the quay it came from here.`
  ],
  snackTerse: [(x) => `Here. ${cap1(x.a)}. Go, before the weather turns.`, (x) => `On time. Good. ${cap1(x.a)}. For the road.`],
  spare: [
    (x) => `${cap1(x.rel)} kept every part off every machine that came through the yard, and nobody here rides that make any more. ${cap1(x.a)}. The garage will give you something for it.`,
    (x) => `This came off the sled ${x.kin} used to run. Good as new, wrong size for ours. ${cap1(x.a)}: trade it in.`,
    (x) => `I was going to send this back on the boat and never did. You take it: ${x.a}. Somebody at the garage will want it.`,
    (x) => `You brought ours, so you carry this one away. ${cap1(x.a)}, been on that shelf for years. It should be on a machine, not a shelf.`
  ],
  spareTerse: [(x) => `${cap1(x.a)}. No use to me. The garage takes them.`],
  up: [
    (x) => `${cap1(x.rel)} had one of those, and ${x.kin} worked on it once. Here, I think I have an upgrade you can have... oh, here it is. ${x.part}. Have the garage fit it.`,
    (x) => `You ride the ${x.sled}? ${cap1(x.rel)} ran one for years. There is a part from those days still hanging in the shed, no use to us. Hold on... there. ${x.part}. Yours.`,
    (x) => `Wait, wait. ${cap1(x.kin)} took this off an old machine and it has sat in the boathouse ever since. It would fit yours. ${x.part}. Take it home and bolt it on.`,
    (x) => `We bought this for a sled we never got running. ${cap1(x.kin)} says it should go to somebody who actually rides. So: ${x.part}. It is yours.`
  ],
  upTerse: [(x) => `Shed. Second shelf. ${x.part}. Fits the ${x.sled}. Take it.`]
};
function line(kind, g, x) {
  x.kin = kinOf(g, kind !== "snack"); x.rel = relOf(g);
  const terse = g.p && g.p.voice === "terse" && G.rng() < 0.6;
  return pick(SAY[kind + (terse ? "Terse" : "")])(x);
}

/* ---------------- what is given ---------------- */
function upgradePool() {
  const X = api && api.partsx; if (!X) return [];
  const out = [], tier = X.tier();
  for (const cat of X.ORDER) {
    if (UP_SKIP.includes(cat) || !X.PARTS[cat]) continue;
    for (const o of X.PARTS[cat].options) if (o.cost >= UP_MIN && o.cost <= UP_MAX && (o.tier || 0) <= tier && !o.needLic && !o.needRescues && !X.owns(cat, o.id)) out.push({ cat, id: o.id, name: o.name, cost: o.cost });
  }
  return out;
}
G.pool = upgradePool;
function eat(it, from, atDoor) {
  const sn = SNACKS.find(q => q.id === it); if (!sn) return;
  const GS = api.GS;
  if (sn.hunger) GS.hunger = Math.min(100, (GS.hunger === undefined ? 100 : GS.hunger) + sn.hunger);
  if (sn.thirst) GS.thirst = Math.min(100, (GS.thirst === undefined ? 100 : GS.thirst) + sn.thirst);
  if (sn.warm) GS.warmth = Math.min(100, GS.warmth + sn.warm);
  if (!atDoor) api.toast(`You ${sn.drink ? "drink" : "eat"} ${sn.the}${from ? (/^The /.test(from) ? ` ${from.toLowerCase()} gave you` : ` ${from} gave you`) : ""}.`, "good");
}

// deliver() calls this once per hand-over away from the quay. d: { n, total, clean, late }
function deliv(site, d) {
  const s = S(); if (!s || !api || !site || !TLX.on("gifts")) return null;
  if (!d || !(d.total > 0) || d.late || !d.clean) return null;                     // a thank-you is for a job done well
  s.since = (s.since | 0) + 1;
  const f = G.force;
  if (!f && !(G.rng() < G.odds(s.since))) return null;
  const g = giver(site), ups = upgradePool(), r = G.rng();
  let kind = f && f.kind ? f.kind : r < 0.14 && ups.length && (s.n | 0) - (s.upAt === undefined || s.upAt === null ? -99 : s.upAt) >= 5 ? "up" : r < 0.4 ? "spare" : "snack";
  if (kind === "up" && !ups.length) kind = "spare";
  let item, toast, body;
  if (kind === "snack") {
    const pk = placeKind(site), sn = (f && f.item && SNACKS.find(q => q.id === f.item)) || wpick(SNACKS, o => (o.where && pk && o.where[pk] !== undefined) ? o.where[pk] : 1);
    item = sn.id; body = line("snack", g, { a: sn.a, drink: !!sn.drink });
    if (s.pocket.length >= POCKET) { eat(sn.id, g.first, true); toast = `${g.first} gave you ${sn.a}. Your pockets are full, so you ${sn.drink ? "drink" : "eat"} it at the door.`; }
    else { s.pocket.push({ id: sn.id, from: g.first }); toast = `${g.first} gave you ${sn.a}. In your pocket (${s.pocket.length} of ${POCKET}): you'll have it when you need it.`; }
  } else if (kind === "spare") {
    const sp = (f && f.item && SPARES.find(q => q.id === f.item)) || pick(SPARES);
    item = sp.id; body = line("spare", g, { a: sp.a });
    s.credit = (s.credit | 0) + sp.v; s.spares.push(sp.a); if (s.spares.length > 6) s.spares.shift();
    toast = `${g.first} gave you ${sp.a}. The garage takes spares in trade: ${api.fmtCash(s.credit)} off the next part you buy.`;
  } else {
    const u = (f && f.item && ups.find(q => q.cat + ":" + q.id === f.item)) || wpick(ups, o => 1 / Math.sqrt(o.cost));   // the small things turn up more often than the dear ones
    item = u.cat + ":" + u.id; api.partsx.own(u.cat, u.id); s.upAt = s.n | 0;
    body = line("up", g, { part: u.name, sled: api.partsx.sledName() });
    toast = `${g.first} gave you an upgrade: ${u.name}. It's yours. The garage fits it for nothing (Parts).`;
  }
  s.since = 0; s.n = (s.n | 0) + 1;
  const rec = { t: api.GS.hour, who: g.p ? g.p.id : null, name: g.name, site: site.id, kind, item };
  s.log.unshift(rec); if (s.log.length > 12) s.log.pop();
  G.last = Object.assign({ title: g.title, body, toast }, rec);
  pend = { at: performance.now() + WORDS_MS, title: g.title, body: "\u201c" + body + "\u201d", toast };
  try { if (window.TLXN && TLXN.post) TLXN.post({ kind: "gift", who: g.p || undefined, x: site.x, z: site.z, text: `${g.name} sent the courier off with ${kind === "up" ? "a part for the sled" : kind === "spare" ? "a spare part" : "something for the road"}.`, data: { kind, item } }); } catch (e) { }
  return rec;
}
G.deliv = deliv;

TLX.register({
  id: "gifts", v: 1,
  state0: () => ({ since: 0, n: 0, upAt: null, pocket: [], credit: 0, spares: [], log: [] }),
  migrate(st) { for (const k of ["pocket", "spares", "log"]) if (!Array.isArray(st[k])) st[k] = []; st.credit = Math.max(0, st.credit | 0); return st; },
  init(a) {
    api = a;
    const s = S(); if (s) { for (const k of ["pocket", "spares", "log"]) if (!Array.isArray(s[k])) s[k] = []; s.pocket = s.pocket.filter(q => q && SNACKS.some(o => o.id === q.id)).slice(0, POCKET); }
    if (a.gift) {
      a.gift.deliv = deliv;
      a.gift.credit = () => { const st = S(); return st && TLX.on("gifts") ? Math.max(0, st.credit | 0) : 0; };
      a.gift.spend = n => { const st = S(); if (!st) return; st.credit = Math.max(0, (st.credit | 0) - Math.max(0, n | 0)); if (st.credit <= 0) st.spares.length = 0; };
      a.gift.note = () => { const st = S(); return st && TLX.on("gifts") && st.credit > 0 ? `Spares in your pack${st.spares.length ? " (" + st.spares.join(", ") + ")" : ""}: ${a.fmtCash(st.credit)} off the next part you buy here.` : ""; };
    }
  },
  tick(dt) {
    const s = S(); if (!s || !api || !TLX.on("gifts")) return;
    const GS = api.GS;
    if (pend) {
      const now = performance.now(), T = api.TABLET;
      if (now >= pend.at && (!T.live || now > pend.at + 15000) && api.started() && !GS.dead) {
        G.said = { title: pend.title, body: pend.body, toast: pend.toast };
        try { T.notify({ app: "parcels", title: pend.title, body: pend.body, ttl: NOTE_TTL }); } catch (e) { }
        api.toast(pend.toast, "good"); pend = null;
      }
    }
    if (!s.pocket.length || !api.started() || GS.dead || api.busy() || api.tutHidden() || dt <= 0) return;
    for (const want of ["hunger", "thirst"]) {
      if (!(GS[want] < EAT_AT)) continue;
      const i = s.pocket.findIndex(q => { const o = SNACKS.find(z => z.id === q.id); return o && o[want]; });
      if (i < 0) continue;
      const q = s.pocket.splice(i, 1)[0]; eat(q.id, q.from, false); api.save(); return;
    }
  }
});
G.state = S;
})();
