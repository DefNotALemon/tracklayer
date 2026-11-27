// Thank-yous at the door (tlx-gifts.js; Lemon 11 Nov: "delivering jobs should sometimes reward snacks, spare parts, or sled
// upgrades to fit at home, handed over with a bit of characterful NPC dialogue"). Hands parcels over through the game's own
// deliver() and checks: who gives (a grown-up of a real household there), what each kind of gift does (pocket and eating,
// the garage's trade-in, an upgrade owned but not fitted), when nothing is given (the quay, late, damaged, the quiet
// spell, the option off), the words on screen, and that it all survives a reload. Exit 1 on a failure.
//   NOSTILLS=1 skips the stills.
import { boot, ev, sleep, done, park, shot, reload, send } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const STILLS = !process.env.NOSTILLS;
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80);
  return true; })()`);
// the in-page kit: hand one parcel over at a site the way the game does
const KIT = `(() => { window.__site = id => SITES.find(s => s.id === id) || (id === "depot" ? depot : null);
  window.__hand = (id, o) => { const site = window.__site(id); const j = Object.assign({ dest: site, cargo: "Test parcel", fragile: false, pay: 60, hits: 0 }, o || {});
    GS.load = GS.load.filter(q => q.cargo !== "Test parcel"); GS.load.push(j); const n0 = TLX.state("gifts").n, c0 = GS.cash; TLXGIFT.last = null; deliver(site);
    return { gift: TLXGIFT.last, n: TLX.state("gifts").n - n0, paid: GS.cash - c0, since: TLX.state("gifts").since }; };
  window.__calm = () => { GS.warmth = 100; GS.storm = 0; CRASH.cool = 1; TABLET.notes.slice().forEach(n => n.dismiss()); return true; };
  return true; })()`;
const hand = (id, o) => J(`window.__hand(${JSON.stringify(id)}, ${o || "{}"})`);
const S = () => J(`TLX.state("gifts")`);

await boot();
await ev(`tutSkip(); true`); await sleep(400);
await park(); await ev(`crashCancel(); FOOT.on = false; WX.at = () => 0; true`); await ev(KIT); await ev(`window.__calm()`);

// ---- 1 a new game
let a = await J(`{ st: TLX.state("gifts"), opt: TLX.options.some(o => o.id === "gifts"), on: TLX.on("gifts"), odds: [1, 2, 3, 4, 10, 17].map(TLXGIFT.odds), hook: typeof TLX.api.gift.deliv, people: TLXN.people.length }`);
console.log("1", JSON.stringify(a));
ok(a.st && a.st.n === 0 && a.st.pocket.length === 0 && a.st.credit === 0, "a new game starts with empty pockets and no spares");
ok(a.opt && a.on, "the Options page has the switch, on by default");
ok(a.odds[0] === 0 && a.odds[1] === 0 && Math.abs(a.odds[2] - 0.2) < 1e-9 && a.odds[3] > a.odds[2] && a.odds[4] < 1 && a.odds[5] === 1, "odds: none for two hand-overs, 20% on the third, rising, certain by the seventeenth");
ok(a.hook === "function" && a.people > 20, "the hand-over hook is wired and the households exist (" + a.people + " people)");

// ---- 2 something to eat, from somebody who lives there
await ev(`TLXGIFT.force = { kind: "snack", item: "lefse" }; GS.hunger = 80; GS.thirst = 80; true`); await clearToasts();
let r = await hand("mehamn");
console.log("2", JSON.stringify(r));
const who = r.gift && r.gift.who ? await J(`(() => { const p = TLXN.person(${JSON.stringify(r.gift.who)}); return p ? { age: p.age, vid: p.vid, name: p.name } : null; })()`) : null;
ok(r.gift && r.gift.kind === "snack" && r.gift.item === "lefse" && r.n === 1 && r.paid >= 60, "an on-time parcel at Mehamn: paid, and a lefse handed over");
ok(who && who.vid === "mehamn" && who.age >= 18 && who.name === r.gift.name, "the giver is a grown-up of a Mehamn household: " + JSON.stringify(who));
ok(r.gift && r.gift.title === r.gift.name + ", Mehamn" && r.gift.body.length > 20 && /lefse/i.test(r.gift.body), `their words name the gift: "${r.gift && r.gift.body}"`);
a = await J(`{ st: TLX.state("gifts"), h: GS.hunger, post: TLXN.since(GS.hour - 1).filter(p => p.kind === "gift").length }`);
ok(a.st.pocket.length === 1 && a.st.pocket[0].id === "lefse" && Math.abs(a.h - 80) < 2, "it is in the pocket, not eaten yet (hunger " + a.h.toFixed(0) + ")");
ok(a.post === 1, "the news bus heard of it");
let said = null; for (let i = 0; i < 80 && !said; i++) { await sleep(250); said = await J(`TLXGIFT.said`); }
let t = await toasts(); a = await J(`{ live: TABLET.live ? { title: TABLET.live.title, body: TABLET.live.body } : null, ban: $("tabBan").hidden ? "" : $("tabBan").textContent }`);
console.log("2 said", JSON.stringify(said), JSON.stringify(a), JSON.stringify(t));
ok(said && a.live && a.live.title === r.gift.title && a.live.body.includes(r.gift.body), "the words come up as a tablet note under their name");
ok(a.ban.includes(r.gift.name) && /lefse/i.test(a.ban), "and the note is on screen");
ok(t.some(m => /gave you a lefse with butter and sugar\. In your pocket \(1 of 3\)/.test(m)), "a toast says what you got and where it went");
if (STILLS) { await ev(`window.__calm = window.__calm; GS.warmth = 100; true`); await shot("gift_note"); }

// ---- 3 eaten when you need it
await clearToasts(); await ev(`GS.hunger = 25; true`);
for (let i = 0; i < 20; i++) { await sleep(150); a = await J(`{ n: TLX.state("gifts").pocket.length, h: GS.hunger }`); if (!a.n) break; }
t = await toasts(); console.log("3", JSON.stringify(a), JSON.stringify(t));
ok(a.n === 0 && a.h > 55 && a.h < 66, "hunger under 30: the lefse is eaten by itself (hunger 25 -> " + a.h.toFixed(0) + ")");
ok(t.some(m => /^You eat the lefse .+ gave you\.$/.test(m)), "and a line says so, naming who gave it");
await ev(`TLX.state("gifts").pocket.push({ id: "toddy", from: "Test" }); GS.hunger = 20; GS.thirst = 90; true`); await sleep(700);
a = await J(`{ n: TLX.state("gifts").pocket.length }`);
ok(a.n === 1, "a flask is not drunk for hunger");
await ev(`GS.hunger = 90; GS.thirst = 20; GS.warmth = 60; true`);
for (let i = 0; i < 20; i++) { await sleep(150); a = await J(`{ n: TLX.state("gifts").pocket.length, th: GS.thirst, w: GS.warmth }`); if (!a.n) break; }
ok(a.n === 0 && a.th > 70 && a.w > 66, "thirst under 30: the toddy is drunk and warms you (thirst " + a.th.toFixed(0) + ", warmth " + a.w.toFixed(0) + ")");

// ---- 4 full pockets
await ev(`(() => { const s = TLX.state("gifts"); s.pocket = [{ id: "bolle", from: "A" }, { id: "kaffe", from: "B" }, { id: "vaffel", from: "C" }]; GS.hunger = 50; GS.thirst = 80; GS.warmth = 100; return true; })()`);
r = await hand("gamvik"); a = await J(`{ n: TLX.state("gifts").pocket.length, h: GS.hunger }`);
console.log("4", JSON.stringify(r.gift), JSON.stringify(a));
ok(r.gift && a.n === 3 && a.h > 83 && a.h < 87 && /pockets are full/.test(r.gift.toast), "three in the pocket already: the fourth is eaten at the door (hunger 50 -> " + a.h.toFixed(0) + ")");

// ---- 5 when nothing is given
r = await hand("gamvik", "{ due: GS.hour - 1 }"); ok(!r.gift && r.n === 0, "a late parcel: nothing");
r = await hand("gamvik", "{ fragile: true, hits: 2 }"); ok(!r.gift && r.n === 0, "a damaged parcel: nothing");
r = await hand("depot"); ok(!r.gift && r.n === 0 && r.paid >= 60, "the quay: paid, nothing more");
await ev(`TLXGIFT.force = null; TLXGIFT.rng = () => 0.999; TLX.state("gifts").since = 0; true`);
let none = 0; for (let i = 0; i < 5; i++) { r = await hand("lebesby"); if (!r.gift) none++; }
ok(none === 5 && r.since === 5, "the dice against you: five hand-overs, nothing, and the count runs (" + r.since + ")");
await ev(`TLXGIFT.rng = () => 0; TLX.state("gifts").since = 0; true`);
const seq = []; for (let i = 0; i < 6; i++) { r = await hand("lebesby"); seq.push(r.gift ? 1 : 0); }
console.log("5 seq", seq.join(""));
ok(seq.join("") === "001001", "the dice for you: still never within two hand-overs of the last gift (" + seq.join("") + ")");
await ev(`TLXGIFT.rng = Math.random; true`);

// ---- 6 a spare part, and the garage taking it in trade
await ev(`(() => { const s = TLX.state("gifts"); s.credit = 0; s.spares = []; TLXGIFT.force = { kind: "spare", item: "belt" }; return true; })()`);
r = await hand("dyfjord"); a = await J(`{ st: TLX.state("gifts"), note: TLX.api.gift.note(), cr: TLX.api.gift.credit(), p: TLXGIFT.pool()[0] }`);
console.log("6", JSON.stringify(r.gift), a.note, JSON.stringify(a.p));
ok(r.gift && r.gift.kind === "spare" && a.cr === 45 && /spare drive belt/.test(r.gift.body) && /\$45 off the next part/.test(r.gift.toast), "a spare drive belt: $45 at the garage");
ok(/a spare drive belt/.test(a.note) && /\$45 off/.test(a.note), "the garage's Parts tab has a line about it");
const p = a.p;
await clearToasts();
a = await J(`(() => { GS.cash = ${p.cost} - 50; fitPart(${JSON.stringify(p.cat)}, ${JSON.stringify(p.id)}); return { cash: GS.cash, own: !!GS.own.partsOwned[${JSON.stringify(p.cat + ":" + p.id)}], cr: TLX.api.gift.credit() }; })()`);
t = await toasts();
ok(!a.own && a.cr === 45 && a.cash === p.cost - 50 && t.some(m => /\$45 of it covered by your spares/.test(m)), "$5 short even with the spares: not sold, the spares kept, the line counts them");
await clearToasts();
a = await J(`(() => { GS.cash = ${p.cost} - 10; openGarage(); garageTab = "parts"; renderGarage(); const n0 = $("giftNote") ? $("giftNote").textContent : ""; fitPart(${JSON.stringify(p.cat)}, ${JSON.stringify(p.id)});
  return { cash: GS.cash, own: !!GS.own.partsOwned[${JSON.stringify(p.cat + ":" + p.id)}], on: GS.own.parts[${JSON.stringify(p.cat)}], cr: TLX.api.gift.credit(), n0, n1: $("giftNote") ? $("giftNote").textContent : "", sp: TLX.state("gifts").spares.length }; })()`);
t = await toasts(); console.log("6 buy", JSON.stringify(a));
ok(a.own && a.on === p.id && a.cash === 35 && a.cr === 0 && a.sp === 0, `the ${p.name} ($${p.cost}) with $${p.cost - 10} in hand: bought, $45 of it in spares (cash left $${a.cash})`);
ok(/\$45 off/.test(a.n0) && a.n1 === "" && t.some(m => /took your spares for \$45/.test(m)), "the open garage showed the line, and it is gone once the spares are spent");
if (STILLS) { await ev(`TLX.state("gifts").credit = 85; TLX.state("gifts").spares = ["a spare drive belt", "a box of idler wheels and bolts"]; renderGarage(); true`); await sleep(300); await shot("gift_garage"); await ev(`TLX.state("gifts").credit = 0; TLX.state("gifts").spares = []; true`); }
await ev(`GS.garageOpen = false; $("garage").hidden = true; true`);

// ---- 7 an upgrade: yours, to fit at home
a = await J(`{ pool: TLXGIFT.pool(), tier: TLX.api.partsx.tier() }`);
ok(a.pool.length >= 3 && a.pool.every(q => q.cost >= 80 && q.cost <= 420 && !["hitch", "recv", "tether", "boost"].includes(q.cat)), `${a.pool.length} parts could be given on the first sled, all $80-$420, no rigs or receivers`);
ok(await J(`TLXGIFT.pool().every(q => TLX.api.partsx.PARTS[q.cat].options.find(o => o.id === q.id).tier <= TLX.api.partsx.tier())`), "none above the sled's own generation");
await ev(`TLXGIFT.force = { kind: "up" }; GS.cash = 500; true`);
r = await hand("skjanes");
const [uc, ui] = r.gift ? r.gift.item.split(":") : ["", ""];
a = await J(`{ own: !!GS.own.partsOwned[${JSON.stringify(uc + ":" + ui)}], on: GS.own.parts[${JSON.stringify(uc)}], cash: GS.cash, name: (TLX.api.partsx.PARTS[${JSON.stringify(uc)}] || { options: [] }).options.filter(o => o.id === ${JSON.stringify(ui)}).map(o => o.name)[0] }`);
console.log("7", JSON.stringify(r.gift), JSON.stringify(a));
ok(r.gift && r.gift.kind === "up" && a.own && a.on !== ui, "an upgrade at Skjånes: owned, not fitted yet (" + a.name + ")");
ok(r.gift && r.gift.body.includes(a.name) && r.gift.toast.includes(a.name) && /garage/i.test(r.gift.toast), "the words and the toast name the part and the garage");
const cash0 = a.cash;
a = await J(`(() => { fitPart(${JSON.stringify(uc)}, ${JSON.stringify(ui)}); return { on: GS.own.parts[${JSON.stringify(uc)}], cash: GS.cash }; })()`);
ok(a.on === ui && a.cash === cash0, "the garage fits it for nothing, like any part you own");
a = await J(`(() => { for (const q of TLXGIFT.pool()) TLX.api.partsx.own(q.cat, q.id); return { left: TLXGIFT.pool().length }; })()`);
r = await hand("skjanes");
ok(a.left === 0 && r.gift && r.gift.kind === "spare", "nothing left on the shelf to give: an upgrade turns into a spare part");

// ---- 8 a place where nobody lives; every place, every kind: the words hold together
await ev(`TLXGIFT.force = { kind: "snack" }; TLX.state("gifts").pocket = []; true`);
r = await hand("windfarm");
ok(r.gift && r.gift.who === null && /^The technician on shift, /.test(r.gift.title), `the wind farm has no household: "${r.gift && r.gift.title}"`);
a = await J(`(() => { const s0 = JSON.stringify(TLX.state("gifts")), po = JSON.stringify(GS.own.partsOwned), bad = [], sample = [], kinds = {}, names = new Set(); let n = 0, longest = 0;
  const np = TLXN.post; TLXN.post = () => { };            /* 600 test gifts must not flood the news ring */
  for (const k of Object.keys(GS.own.partsOwned)) delete GS.own.partsOwned[k];
  for (const site of SITES.filter(s => s.x !== undefined && s.type !== "depot" && s.type !== "shop")) for (const kind of ["snack", "spare", "up"]) for (let i = 0; i < 14; i++) {
    TLXGIFT.force = { kind }; TLX.state("gifts").pocket = []; const g = TLXGIFT.deliv(site, { n: 1, total: 50, clean: true, late: false }); n++;
    const L = TLXGIFT.last; if (!g || !L) { bad.push(site.id + " " + kind + " none"); continue; }
    kinds[L.kind] = (kinds[L.kind] || 0) + 1; names.add(L.name); longest = Math.max(longest, L.body.length);
    const all = L.title + " | " + L.body + " | " + L.toast;
    if (/undefined|null|NaN|\\[object|\\$\\{|  /.test(all) || L.body.length > 240 || !/[.!?]$/.test(L.body)) bad.push(all);
    if (i === 0 && sample.length < 60) sample.push(all);
    if (kind === "up") for (const k of Object.keys(GS.own.partsOwned)) delete GS.own.partsOwned[k];
  }
  Object.assign(TLX.state("gifts"), JSON.parse(s0)); for (const k of Object.keys(GS.own.partsOwned)) delete GS.own.partsOwned[k]; Object.assign(GS.own.partsOwned, JSON.parse(po)); TLXGIFT.force = null;
  TLXN.post = np; return { n, bad, sample, kinds, names: names.size, longest }; })()`);
console.log("8", a.n, "gifts;", JSON.stringify(a.kinds), a.names, "givers; longest line", a.longest);
for (const l of a.sample) console.log("   ", l);
for (const b of a.bad.slice(0, 8)) console.log("   BAD", b);
ok(a.bad.length === 0 && a.n > 300, `${a.n} gifts at every door: no broken line, none over 240 characters`);
ok(a.names >= 25 && a.kinds.snack > 100 && a.kinds.spare > 100 && a.kinds.up > 100, `${a.names} different givers across the peninsula`);

// ---- 9 the option off leaves no trace
await ev(`(() => { TLX.setOn("gifts", false); const s = TLX.state("gifts"); s.credit = 45; s.spares = ["a spare drive belt"]; s.pocket = [{ id: "lefse", from: "T" }]; TLXGIFT.force = { kind: "snack" }; GS.hunger = 10; return true; })()`);
r = await hand("mehamn"); await sleep(700);
a = await J(`{ cr: TLX.api.gift.credit(), note: TLX.api.gift.note(), n: TLX.state("gifts").pocket.length, h: GS.hunger }`);
ok(!r.gift && a.cr === 0 && a.note === "" && a.n === 1 && a.h < 20, "switched off: nothing given, no trade-in, the pocket untouched");
await ev(`TLX.setOn("gifts", true); TLXGIFT.force = null; GS.hunger = 90; true`);
a = await J(`{ cr: TLX.api.gift.credit() }`); ok(a.cr === 45, "switched back on: the spares are still there");

// ---- 10 it is saved
await ev(`save(); true`); const before = await S();
await reload(); await ev(`tutSkip(); true`); await sleep(300); const after = await S();
console.log("10", JSON.stringify(after));
ok(after && after.credit === 45 && after.pocket.length === 1 && after.pocket[0].id === "lefse" && after.n === before.n && after.log.length === before.log.length, "pocket, spares and the count come back after a reload");

// ---- 11 the note on the itch embed's small screen
if (STILLS) {
  await ev(KIT); await ev(`window.__calm(); for (const k of Object.keys(GS.own.partsOwned)) delete GS.own.partsOwned[k]; TLXGIFT.force = { kind: "up" }; true`);
  await send("Emulation.setDeviceMetricsOverride", { width: 640, height: 360, deviceScaleFactor: 1, mobile: false }); await sleep(500);
  await hand("ifjord"); for (let i = 0; i < 40; i++) { await sleep(250); if (await J(`!!TLXGIFT.said`)) break; }
  await sleep(300); a = await J(`(() => { const b = $("tabBan").getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: innerWidth, h: innerHeight, txt: $("tabBan").textContent.length }; })()`);
  console.log("11", JSON.stringify(a));
  ok(a.txt > 30 && a.l >= 0 && a.r <= a.w + 1 && a.t >= 0 && a.b <= a.h, "640x360: the note with the longest kind of line stays on screen");
  await shot("gift_note_640");
}

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
await done(fails ? 1 : 0);
