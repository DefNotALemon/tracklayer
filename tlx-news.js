// Tracklayer: the news bus (goal G7, loop/HOME.md H0). Slice H1a.
//
// ONE ring of things that happened on the Nordkinn, which every later G7 system reads: Gram posts, the radio's call-ins and
// the local chat are all made out of it. In this slice only the ski trails post to it (kinds "groom", "trail", "ski").
//
//   TLXN.post({ kind, who, place, x, z, text, data })  stamps t = GS.hour and an id; keeps the newest 240 (saved).
//       who: a villager record, a villager id ("p07"), "you", or nothing (the løypelag, the council).
//       place: a name; left out, it is TLXN.placeOf(x, z) when x and z are given.
//   TLXN.since(t)              posts made at or after game hour t, oldest first
//   TLXN.near(x, z, r, sinceT) posts with a position within r metres (and, if sinceT is given, made at or after it)
//   TLXN.on(fn)                fn(post) is called on every post; returns the function that stops it
//   TLXN.placeOf(x, z)         the nearest named thing: a ski trail, a lookout, a road, a village, else "near <site>"
//   TLXN.homes                 one household per lit house: { id, village, vname, x, z (the door), surname, members: [person ids], character }
//   TLXN.people                everyone, in families: { id, name, first, last, age, role, trade, home (household id), vid (village id), village (name),
//                              x, z (the door), handle (for Gram), interests: [ski|sled|fish|birds|photos|dogs|racing|gossip], voice }
//   TLXN.person(id), TLXN.homeOf(person), TLXN.family(person), TLXN.peopleIn(villageId), TLXN.villages(), TLXN.say(person, key, vars)
//
// THE PEOPLE are families in real houses (loop/HOME.md H0): every lit house is a household of one to six (a couple, children, a grandparent,
// a lodger, someone alone), seeded from the house's own position so the same house holds the same family in every game, with the
// character of its settlement (surnames, trades, what people like). Not saved. The plow's driveway households and the parked cars'
// owners lend their first name to the first adult at the door nearest them, so one person is one person; staff are hired fresh in
// each game and keep their own names. "you" is the player.
//
// SAVED: x.sys.news = { seq, posts: [...newest 240] }.
(() => {
"use strict";
const CAP = 240;
let api = null;
const N = { people: [], by: {}, ms: 0, ready: false, CAP };
window.TLXN = N;
const S = () => TLX.state("news");

TLX.option({ id: "gramnews", name: "Village news", hint: "The Nordkinn keeps a log of what its people do (who skied which trail, which trail you set) for the Gram app and the radio to come. Off = nothing is written down.", sys: "news" });

/* ---------------- the places ---------------- */
// the villages: the quay town (the depot's site) and every other settlement that is not a herder cabin or the wind farm
N.villages = () => {
  if (N._vil) return N._vil;
  const W = api.world, out = [];
  const dep = W.depot; if (dep) out.push({ id: "kjollefjord", name: "Kjøllefjord", x: dep.x, z: dep.z });
  for (const s of W.SITES) if (s.type === "cabin" && s.x !== undefined && !/herder|wind farm|lighthouse/i.test(s.name || "")) out.push({ id: s.id, name: s.name, x: s.x, z: s.z });
  return (N._vil = out);
};
N.village = id => N.villages().find(v => v.id === id) || null;
N.placeOf = (x, z) => {
  if (!api) return "";
  const W = api.world;
  if (window.TLXSK && TLXSK.ready) { const t = TLXSK.nearest(x, z, 40); if (t) return t.trail.name; }
  for (const L of W.LOOKOUTS || []) if (Math.hypot(L.x - x, L.z - z) < 220) return L.name;
  const vs = N.villages(); let best = null, bd = 1e12;
  for (const v of vs) { const d = Math.hypot(v.x - x, v.z - z); if (d < bd) { bd = d; best = v; } }
  if (best && bd < 520) return best.name;
  if (window.TLXR && TLXR.ready) { const n = TLXR.near(x, z); if (n && n.route && n.d < 30) return n.route.name; }
  for (const s of W.SITES) { if (s.x === undefined) continue; const d = Math.hypot(s.x - x, s.z - z); if (d < bd) { bd = d; best = { name: s.name }; } }
  return best ? "near " + best.name : "the fell";
};

/* ---------------- the people: families in real houses ---------------- */
// Every lit house (api.world.doors, plus a home site that has no door of its own) is a household: a family of one to six, seeded from
// the house's own position, so the same house holds the same family in every game and in every boot. Each settlement has its own
// character: surnames, trades, what its people do with their free time.
const MALE = ["Kåre", "Ole", "Jonas", "Nils", "Tor", "Hallvard", "Sander", "Aslak", "Per", "Anders", "Lars", "Mikkel", "Johan", "Henrik", "Rune", "Geir", "Bjørn", "Terje", "Knut", "Svein", "Odd", "Leif", "Vidar", "Jørgen", "Ante", "Mihkkal", "Eirik", "Lukas", "Elias", "Oskar", "Roar", "Arvid", "Trygve", "Frode", "Jan", "Dag"];
const FEMALE = ["Ragnhild", "Siri", "Elin", "Anja", "Marit", "Ingrid", "Liv", "Berit", "Sigrid", "Kari", "Astrid", "Solveig", "Elle", "Máret", "Inger", "Hanne", "Tove", "Áile", "Biret", "Ravdna", "Marja", "Silje", "Emilie", "Maja", "Ida", "Sofie", "Mari", "Tuva", "Hilde", "Gunn", "Synnøve", "Unni", "Ellen", "Mette"];
const SAMI_M = ["Ante", "Mihkkal", "Aslak", "Nils", "Ole", "Johan", "Mikkel", "Per"], SAMI_F = ["Áile", "Biret", "Ravdna", "Máret", "Elle", "Marja", "Inger", "Liv"];
const INTERESTS = ["ski", "sled", "fish", "birds", "photos", "dogs", "racing", "gossip"];
const VOICES = ["dry", "warm", "terse", "chatty", "wry", "earnest"];
// a settlement's character: its surnames, the trades of its adults and the weights of what people like
const TOWNS = {
  kjollefjord: { name: "the town with the school and the hotel", last: ["Eriksen", "Johansen", "Nilsen", "Hansen", "Pedersen", "Karlsen", "Olsen", "Berg", "Andreassen"], trades: ["fish-plant worker", "teacher", "shopkeeper", "mechanic", "nurse", "harbour hand", "hotel cook", "sled guide"], like: { ski: 2, sled: 3, fish: 2, birds: 1, photos: 1, dogs: 1, racing: 2, gossip: 3 } },
  mehamn: { name: "a fishing village", last: ["Mathisen", "Isaksen", "Jakobsen", "Larsen", "Pettersen", "Ludvigsen", "Hanssen"], trades: ["fisherman", "fish-plant worker", "net mender", "boat builder", "harbour hand", "cook"], like: { ski: 1, sled: 1, fish: 4, birds: 2, photos: 1, dogs: 1, racing: 1, gossip: 3 } },
  gamvik: { name: "a lighthouse village", last: ["Henriksen", "Solbakk", "Karlsen", "Nergård", "Smuk", "Olsen"], trades: ["lighthouse keeper", "fisherman", "bird warden", "ferry hand", "teacher"], like: { ski: 1, sled: 1, fish: 3, birds: 4, photos: 3, dogs: 1, racing: 0.5, gossip: 2 } },
  dyfjord: { name: "a small fishing hamlet", last: ["Aslaksen", "Persen", "Andreassen", "Johansen", "Gaup"], trades: ["fisherman", "carpenter", "net mender", "retired fisherman"], like: { ski: 1, sled: 2, fish: 4, birds: 2, photos: 1, dogs: 3, racing: 0.5, gossip: 2 } },
  skjanes: { name: "a herders' village", last: ["Utsi", "Eira", "Sara", "Gaup", "Bongo", "Hætta"], sami: 1, trades: ["reindeer herder", "herder", "duodji maker", "snowmobile mechanic", "teacher"], like: { ski: 2, sled: 4, fish: 1, birds: 0.5, photos: 1, dogs: 3, racing: 3, gossip: 2 } },
  lebesby: { name: "a farming and fishing village", last: ["Eira", "Isaksen", "Larsen", "Pedersen", "Sara", "Gaup", "Mathisen"], sami: 0.5, trades: ["farmer", "fisherman", "herder", "sheep farmer", "teacher", "shop clerk"], like: { ski: 3, sled: 3, fish: 2, birds: 1, photos: 1, dogs: 2, racing: 1, gossip: 2 } },
  ifjord: { name: "an inland valley village", last: ["Utsi", "Bongo", "Eira", "Hætta", "Nergård", "Sara"], sami: 0.8, trades: ["reindeer herder", "farmer", "guide", "duodji maker", "forester"], like: { ski: 4, sled: 2, fish: 1, birds: 1, photos: 2, dogs: 4, racing: 1, gossip: 1 } }
};
const TOWN0 = { name: "a village", last: ["Eriksen", "Hansen", "Olsen", "Larsen", "Berg"], trades: ["fisherman", "carpenter", "teacher", "farmer"], like: { ski: 2, sled: 2, fish: 2, birds: 1, photos: 1, dogs: 1, racing: 1, gossip: 2 } };
const ascii = s => s.toLowerCase().replace(/å/g, "a").replace(/ø/g, "o").replace(/æ/g, "ae").replace(/[áà]/g, "a").replace(/é/g, "e").replace(/[^a-z]/g, "");
const hashS = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
N.homes = []; N.homeBy = {};
// the houses: every lit door, and a standalone home site with no door of its own
function houses() {
  const W = api.world, out = [];
  for (const D of W.doors || []) if (D && Number.isFinite(D.x) && Number.isFinite(D.z)) out.push({ x: D.x, z: D.z, d: D });
  for (const s of W.SITES) if (s.type === "home" && Number.isFinite(s.x) && !out.some(h => Math.hypot(h.x - s.x, h.z - s.z) < 15)) out.push({ x: s.x, z: s.z, site: s.id });
  out.sort((p, q) => p.x - q.x || p.z - q.z);                                            // the order never depends on how the world happened to list them
  return out;
}
// the first names the game already uses at a real door: the plow's driveway households and the parked cars' owners
function known(hs) {
  const m = new Map(), put = (name, x, z, what) => { if (!name || !Number.isFinite(x)) return; let best = null, bd = 30; for (const h of hs) { const d = Math.hypot(h.x - x, h.z - z); if (d < bd) { bd = d; best = h; } } if (best && !m.has(best)) m.set(best, { first: String(name).split(" ")[0], what }); };
  try { if (window.TLXPL && TLXPL.drv && TLXPL.drv.list) for (const c of TLXPL.drv.list()) put(c.name, c.a ? c.a[0] : c.x, c.a ? c.a[1] : c.z, "driveway"); } catch (e) { }
  try { if (window.TLXC && Array.isArray(TLXC.cars)) for (const c of TLXC.cars) put(c.owner, c.x, c.z, "car"); } catch (e) { }
  return m;
}
function household(h, village, idx, kn) {
  const r = rng(hashS("house:" + Math.round(h.x) + ":" + Math.round(h.z))), pick = a => a[Math.floor(r() * a.length)];
  const tw = TOWNS[village.id] || TOWN0, sur = pick(tw.last), roll = r();
  const sami = tw.sami && r() < tw.sami;
  const nameF = () => pick(sami ? SAMI_F : FEMALE), nameM = () => pick(sami ? SAMI_M : MALE), wl = () => { const o = []; for (const k of INTERESTS) for (let i = 0; i < Math.round((tw.like[k] || 1) * 2); i++) o.push(k); return o; }, wpool = wl();
  const hid = (village.id === "kjollefjord" ? "kj" : village.id.slice(0, 2)) + String(idx + 1).padStart(2, "0");
  const mem = [], add = (role, age, g, last) => mem.push({ role, age, g, last: last || sur });
  const kids = n => { for (let i = 0; i < n; i++) add(r() < 0.5 ? "daughter" : "son", 2 + Math.floor(r() * 16), 0); };
  if (roll < 0.14) add("lives alone", 24 + Math.floor(r() * 50), r() < 0.5 ? "f" : "m");
  else if (roll < 0.22) add("lives alone", 68 + Math.floor(r() * 18), r() < 0.5 ? "f" : "m");
  else if (roll < 0.40) { const a = 28 + Math.floor(r() * 40); add("mother", a, "f"); add("father", a + Math.floor(r() * 6 - 2), "m"); }
  else if (roll < 0.74) { const a = 31 + Math.floor(r() * 14); add("mother", a, "f"); add("father", a + Math.floor(r() * 6 - 2), "m"); kids(1 + Math.floor(r() * 3)); }
  else if (roll < 0.82) { add(r() < 0.8 ? "mother" : "father", 30 + Math.floor(r() * 15), r() < 0.8 ? "f" : "m"); kids(1 + Math.floor(r() * 2)); }
  else if (roll < 0.93) { const a = 34 + Math.floor(r() * 10); add("mother", a, "f"); add("father", a + 1, "m"); kids(1 + Math.floor(r() * 2)); add(r() < 0.6 ? "grandmother" : "grandfather", 68 + Math.floor(r() * 16), r() < 0.6 ? "f" : "m"); }
  else { const a = 36 + Math.floor(r() * 20); add("mother", a, "f"); add("father", a, "m"); if (r() < 0.5) kids(1); add("lodger", 20 + Math.floor(r() * 30), r() < 0.5 ? "f" : "m", pick(tw.last)); }
  const people = []; let adultN = 0;
  mem.forEach((m, k) => {
    const child = m.age < 18, g = m.g || (r() < 0.5 ? "f" : "m");
    let first = g === "f" ? nameF() : nameM(), reused = null;
    if (!child && adultN++ === 0 && kn.has(h)) { const k2 = kn.get(h); first = k2.first; reused = k2.what; if (FEMALE.includes(first) && m.g === "m") { m.g = "f"; } }
    const ints = []; const want = child ? 2 : 2 + (r() < 0.4 ? 1 : 0);
    if (m.age > 5 && m.age < 80 && r() < (child ? 0.7 : 0.55) * ((tw.like.ski || 1) / 2 + 0.5) / 1.2) ints.push("ski");
    for (let g2 = 0; ints.length < want && g2 < 40; g2++) { const it = pick(wpool); if (!ints.includes(it)) ints.push(it); }
    people.push({ id: hid + "." + (k + 1), first, last: m.last, name: first + " " + m.last, age: m.age, role: m.role === "lives alone" ? (m.age > 65 ? "lives alone, retired" : "lives alone") : m.role, trade: child ? (m.age < 6 ? "" : "pupil") : m.role === "grandmother" || m.role === "grandfather" ? "retired" : pick(tw.trades), home: hid, vid: village.id, village: village.name, x: h.x, z: h.z,
      handle: ascii(first) + "_" + ascii(m.last).slice(0, 3) + "_" + hid + (k ? String.fromCharCode(96 + k) : ""), interests: ints, voice: pick(VOICES), reused });
  });
  return { id: hid, village: village.id, vname: village.name, x: h.x, z: h.z, surname: sur, site: h.site || null, members: people.map(p => p.id), character: tw.name, people };
}
function roll() {
  const vs = N.villages(), hs = houses(), kn = known(hs), per = {}, homes = [], people = [];
  for (const h of hs) {
    let v = vs[0], bd = 1e12; for (const q of vs) { const d = Math.hypot(q.x - h.x, q.z - h.z); if (d < bd) { bd = d; v = q; } }
    const idx = per[v.id] = (per[v.id] === undefined ? 0 : per[v.id] + 1);
    const hh = household(h, v, idx, kn); homes.push(hh); people.push(...hh.people);
  }
  N.homes = homes.map(h => { const { people: _p, ...o } = h; return o; }); N.homeBy = Object.fromEntries(N.homes.map(h => [h.id, h]));
  return people;
}
N.person = id => N.by[id] || null;
N.homeOf = p => { p = typeof p === "string" ? N.by[p] : p; return p ? N.homeBy[p.home] || null : null; };
N.family = p => { const h = N.homeOf(p); return h ? h.members.map(id => N.by[id]) : []; };
N.peopleIn = v => N.people.filter(p => p.vid === v);
N.inVillage = N.peopleIn;

/* ---------------- what they say: one line each, in their own voice ---------------- */
const LINES = {
  ski: {
    dry: [v => `${v.km} km on ${v.trail}. The track was ${v.word}. I've had worse.`, v => `Skied ${v.trail}. ${v.word}. That is all.`, v => `${v.trail}, ${v.km} km. Nobody else out. As usual.`],
    warm: [v => `Lovely ${v.km} km on ${v.trail} today, the track is ${v.word}. Thank you to whoever keeps it!`, v => `Out on ${v.trail} and it is ${v.word}. Cheeks red, heart full.`, v => `${v.km} km of ${v.trail} and a thermos. Perfect.`],
    terse: [v => `${v.trail}. ${v.km} km. ${v.word}.`, v => `Skied. ${v.trail}. ${v.word}.`, v => `${v.km} km. ${v.word}.`],
    chatty: [v => `So I went out on ${v.trail} this morning, ${v.km} km, and the track is ${v.word}, and I met nobody, and I thought about everything.`, v => `${v.trail} again! ${v.km} km, ${v.word} track, ${v.cold}. You should all come.`, v => `Did ${v.trail} (${v.km} km). Track ${v.word}. I'll tell you about the fox later.`],
    wry: [v => `${v.km} km on ${v.trail}. The track is ${v.word}; the knees are not.`, v => `Skied ${v.trail} for my health. Health was not consulted. Track: ${v.word}.`, v => `${v.trail}: ${v.word}. I have decided to call that a good day.`],
    earnest: [v => `Skied ${v.km} km on ${v.trail}. The track is ${v.word}. Good to be out.`, v => `${v.trail} today. ${v.word} track, ${v.km} km, steady pace.`, v => `Out on ${v.trail}, ${v.km} km. Track ${v.word}. I felt it in my legs in a good way.`]
  },
  groom: { _: [v => `${v.trail}: ${v.km} km set ${v.when}.`] },
  trail: { _: [v => `${v.trail} is ${v.word}.`] }
};
// say(person, key, vars): the person's voice, a stable pick from vars.n (or the first)
N.say = (p, key, vars) => {
  vars = Object.assign({ km: "?", trail: "the trail", word: "good", cold: "cold" }, vars || {});
  const k = LINES[key]; if (!k) return "";
  const list = (p && k[p.voice]) || k._ || Object.values(k)[0];
  return list[(vars.n | 0) % list.length](vars);
};

/* ---------------- the bus ---------------- */
const lis = [];
N.on = fn => { if (typeof fn !== "function") return () => { }; lis.push(fn); return () => { const i = lis.indexOf(fn); if (i >= 0) lis.splice(i, 1); }; };
N.post = o => {
  const s = S(); if (!s || !o || typeof o !== "object") return null;
  if (!TLX.on("gramnews")) return null;
  let who = o.who; if (who && typeof who === "object") who = who.id; if (who === undefined || who === null) who = null;
  const x = Number.isFinite(o.x) ? o.x : null, z = Number.isFinite(o.z) ? o.z : null;
  const p = { id: ++s.seq, t: Math.round(api.GS.hour * 100) / 100, kind: String(o.kind || "misc"), who, place: o.place || (x !== null ? N.placeOf(x, z) : ""), x: x === null ? null : Math.round(x), z: z === null ? null : Math.round(z), text: String(o.text || ""), data: o.data === undefined ? null : o.data };
  s.posts.push(p); if (s.posts.length > CAP) s.posts.splice(0, s.posts.length - CAP);
  for (const f of lis.slice()) try { f(p); } catch (e) { console.error("TLXN listener", e); }
  return p;
};
N.since = t => { const s = S(); return s ? s.posts.filter(p => p.t >= t) : []; };
N.near = (x, z, r, sinceT) => { const s = S(); return s ? s.posts.filter(p => p.x !== null && Math.hypot(p.x - x, p.z - z) <= r && (sinceT === undefined || p.t >= sinceT)) : []; };
N.all = () => { const s = S(); return s ? s.posts.slice() : []; };

TLX.register({
  id: "news", v: 1,
  state0: () => ({ seq: 0, posts: [] }),
  migrate: st => st,
  init(a) {
    api = a;
    const s = S();
    if (!Array.isArray(s.posts)) s.posts = [];
    s.posts = s.posts.filter(p => p && typeof p === "object" && Number.isFinite(p.t)).slice(-CAP);
    s.seq = Math.max(+s.seq || 0, ...s.posts.map(p => p.id | 0));
    N._vil = null;
    const t0 = performance.now();
    try { N.people = roll(); N.by = {}; for (const p of N.people) N.by[p.id] = p; } catch (e) { console.error("TLX news people", e); N.people = []; N.by = {}; }
    N.ms = Math.round(performance.now() - t0); N.ready = true;
  }
});
})();
