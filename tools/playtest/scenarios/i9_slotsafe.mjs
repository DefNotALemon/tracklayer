// I9 save slots, beta fix 0366 #1/#2: once a change of slot is under way nothing else can write a slot (a double click
// on a card used to put the game on screen over the slot being loaded), and a stored game is made safe before it is
// stored or loaded (cash "lots" used to load as a string).
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify((${e}) ?? null)`));
const only = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
const section = async (n, f) => { if (only && !only.test(n)) return; console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 400)); } };
const wipe = `localStorage.removeItem("tracklayer.slots.v1"); for (let i = 1; i < 9; i++) localStorage.removeItem("tracklayer.slot." + i);`;
const blobCash = k => J(`(() => { const b = localStorage.getItem(${JSON.stringify(k)}); return b ? { cash: JSON.parse(b).cash } : null; })()`);
const fresh = async () => { await ev(`tutSkip(); crashCancel(); window.__noReload = true; window.__reloadAsked = 0; true`); await sleep(600); };
const good = JSON.stringify({ tracklayer: 1, name: "Fine", save: { cash: 5, own: { sled: "frontier", sleds: ["frontier"] } } });

await boot();
await ev(`${wipe} true`); await fresh();

await section("A two changes of slot before the reload", async () => {
  await ev(`GS.cash = 1111; GS.delivered = 2; save(); true`);
  ok(await J(`TLSLOT.copy(1, 2)`), "slot 1 copied into slot 2");
  await ev(`(() => { const d = JSON.parse(localStorage.getItem("tracklayer.slot.2")); d.cash = 2222; localStorage.setItem("tracklayer.slot.2", JSON.stringify(d)); return true; })()`);
  const r1 = await J(`TLSLOT.go(2)`);
  await ev(`GS.cash = 9999; true`);                       // the old game is still on screen for a moment
  const r = await J(`({ go: TLSLOT.go(4), go1: TLSLOT.go(1), del: TLSLOT.del(2), copy: TLSLOT.copy(2, 3), imp: TLSLOT.importText(3, ${JSON.stringify(good)}), stash: TLSLOT.stash(true) })`);
  await ev(`savesPanel(); window.dispatchEvent(new Event("pagehide")); document.dispatchEvent(new Event("visibilitychange")); save(); true`);
  ok(r1 === true && r.go === false && r.go1 === false, "the first change goes, a second (to another slot or back) is refused: " + JSON.stringify(r));
  ok(r.del === false && r.copy === false && r.stash === false && /./.test(r.imp), "delete, copy, store and load-from-a-file are refused too while the change is under way");
  const s = { asked: await J(`window.__reloadAsked`), cur: await J(`TLSLOT.idx().cur`), s1: await blobCash("tracklayer.slot.1"), s2: await blobCash("tracklayer.slot.2"), s3: await blobCash("tracklayer.slot.3"), s4: await blobCash("tracklayer.slot.4"), v2: await blobCash("tracklayer.save.v2") };
  console.log("   " + JSON.stringify(s));
  ok(s.asked === 1 && s.cur === 2, `one reload asked for, slot 2 is the one in play (asked ${s.asked}, cur ${s.cur})`);
  ok(s.s1 && s.s1.cash === 1111, "slot 1 holds the game you left, as it was when you left it: $" + (s.s1 && s.s1.cash));
  ok(s.v2 && s.v2.cash === 2222 && s.s2 && s.s2.cash === 2222, "slot 2's own game is the one about to load, untouched: $" + (s.v2 && s.v2.cash));
  ok(s.s3 === null && s.s4 === null, "nothing was written to slots 3 and 4");
  await reload(); await fresh();
  const g = await J(`({ cash: GS.cash, cur: TLSLOT.idx().cur, lock: TLSLOT.lock })`);
  ok(g.cash === 2222 && g.cur === 2 && g.lock === false, "after the reload slot 2 plays with its own cash: " + JSON.stringify(g));
});

await section("B the panel's buttons go dead on the first click", async () => {
  await ev(`savesPanel(); true`); await sleep(300);
  await ev(`document.querySelector('#tPanel [data-s="open:1"]').click(); true`); await sleep(200);
  const before = await J(`[...document.querySelectorAll("#tPanel button")].filter(b => !b.disabled).length`);
  await ev(`(() => { const b = document.querySelector('#tPanel [data-s="go:1"]'); b.click(); b.click(); b.dispatchEvent(new MouseEvent("click", { bubbles: true })); const o = document.querySelector('#tPanel [data-s="list"]'); o.click(); o.dispatchEvent(new MouseEvent("click", { bubbles: true })); return true; })()`);
  await sleep(200);
  const t = await J(`({ live: [...document.querySelectorAll("#tPanel button")].filter(b => !b.disabled).length, n: document.querySelectorAll("#tPanel button").length, txt: (document.querySelector('#tPanel [data-s="go:1"]') || {}).textContent, asked: window.__reloadAsked, cur: TLSLOT.idx().cur })`);
  ok(before >= 3 && t.live === 0 && t.n >= 3, `LOAD pressed: every button on the panel is dead (${before} live before, ${t.live} of ${t.n} after)`);
  ok(/LOADING/.test(t.txt || ""), "the button says it is loading: " + t.txt);
  ok(t.asked === 1 && t.cur === 1, `three clicks on LOAD and two on BACK made one change of slot (asked ${t.asked}, cur ${t.cur})`);
  const s2 = await blobCash("tracklayer.slot.2"); ok(s2 && s2.cash === 2222, "slot 2 was stored as it stood: $" + (s2 && s2.cash));
  await reload(); await fresh();
  ok((await J(`GS.cash`)) === 1111 && (await J(`GS.delivered`)) === 2, "back in slot 1 with its cash and deliveries");
});

await section("C a file with the wrong kinds of things in it", async () => {
  const odd = { tracklayer: 1, name: "Odd", save: { cash: "750", delivered: "3.7", hour: "noon", rescues: null, calOff: [1], own: { sled: 7, sleds: ["frontier", "nope", 4], parts: "no", shelf: {}, cond: [], gear: { head: 3 } }, x: "no", mkt: 5, re: "x", fish: "cod", mail: "m", log: 3 } };
  const r = await ev(`TLSLOT.importText(3, ${JSON.stringify(JSON.stringify(odd))})`);
  const d = await J(`JSON.parse(localStorage.getItem("tracklayer.slot.3") || "null")`);
  console.log("   stored: " + JSON.stringify(d).slice(0, 300));
  ok(r === "" && d && d.cash === 750 && d.delivered === 3 && d.rescues === 0 && d.calOff === 0 && !("hour" in d), `the file is taken in with its numbers made numbers (cash ${JSON.stringify(d && d.cash)}, delivered ${d && d.delivered}) and a clock that is no number left out`);
  ok(d && d.own.sled === "frontier" && d.own.sleds.length === 1 && !("parts" in d.own) && !("shelf" in d.own) && !("cond" in d.own) && !("head" in d.own.gear), "its machines keep what is the right kind of thing and lose the rest: " + JSON.stringify(d && d.own));
  ok(d && !("x" in d) && !("mkt" in d) && !("re" in d) && !("fish" in d) && !("mail" in d) && !("log" in d), "tables that are not tables are left out");
  const c = (await J(`TLSLOT.cards()[2]`)); ok(!c.empty && c.card.cash === 750 && c.name === "Odd", "its card reads $750: " + JSON.stringify(c.card));
  const r2 = await ev(`TLSLOT.importText(4, ${JSON.stringify(JSON.stringify({ tracklayer: 1, save: { cash: "lots", own: 5, x: "no" } }))})`);
  ok(/not a Tracklayer save/.test(r2) && (await blobCash("tracklayer.slot.4")) === null, "a file whose machines are not a table is refused and the slot left empty: " + r2);
  const r3 = await ev(`TLSLOT.importText(4, ${JSON.stringify(JSON.stringify({ tracklayer: 1, save: { cash: "lots", own: {} } }))})`);
  const c4 = await blobCash("tracklayer.slot.4"); ok(r3 === "" && c4 && c4.cash === 0, "cash that is a word comes in as $0: " + JSON.stringify(c4));
  await ev(`TLSLOT.go(3); true`); await reload(); await fresh(); await sleep(1500);
  const g = await J(`(() => { GS.cash += 10; return { cash: GS.cash, type: typeof GS.cash, del: GS.delivered, hour: GS.hour, sled: GS.own.sled, track: GS.own.parts.track, head: GS.own.gear.head, shelf: Array.isArray(GS.own.shelf), cap: GS.cap, cur: TLSLOT.idx().cur, v: Math.hypot(P.vx, P.vz), y: P.y }; })()`);
  console.log("   in play: " + JSON.stringify(g));
  ok(g.cur === 3 && g.type === "number" && g.cash === 760 && g.del === 3, `loaded, $10 earned on $750 is $${g.cash} (it was "75010" as text)`);
  ok(g.sled === "frontier" && g.track === "stock" && g.head === "beanie" && g.shelf && isFinite(g.cap) && g.cap > 0 && isFinite(g.hour) && isFinite(g.y), "the sled, its parts, your clothes, the tank and the clock are a new game's where the file had nonsense");
});

await section("D a save somebody edited by hand, loaded straight", async () => {
  await reload({ cash: "lots", delivered: "x", rescues: {}, hour: "late", calOff: "z", wx: "w", mailSeq: "q", own: { sled: "ghost", sleds: "all", parts: { track: 5, skis: "stock" }, partsOwned: [], gear: { head: 3 }, engines: "big", wear: 2 }, x: "no", mkt: "m", re: 7, mail: "m", mailT: 4, log: "l", sar: [1], apps: 3, lic: "l" });
  await fresh(); await sleep(1500);
  const g = await J(`(() => { GS.cash += 5; return { cash: GS.cash, del: GS.delivered, resc: GS.rescues, hour: GS.hour, off: CAL.off, seed: WX.seed, sled: GS.own.sled, sleds: GS.own.sleds, track: GS.own.parts.track, po: kindOf(GS.own.partsOwned), head: GS.own.gear.head, eng: kindOf(GS.own.engines), wear: kindOf(GS.own.wear), cap: GS.cap, mkt: kindOf(GS.mkt), re: kindOf(GS.re), y: P.y }; function kindOf(v) { return Array.isArray(v) ? "array" : typeof v; } })()`);
  console.log("   in play: " + JSON.stringify(g));
  ok(g.cash === 5 && g.del === 0 && g.resc === 0 && typeof g.hour === "number" && isFinite(g.hour) && g.off === 0 && typeof g.seed === "number", "cash, deliveries, rescues, the clock, the calendar and the weather seed are numbers");
  ok(g.sled === "frontier" && Array.isArray(g.sleds) && g.sleds[0] === "frontier" && g.track === "stock" && g.head === "beanie" && g.po === "object" && g.eng === "object" && g.wear === "object", "a sled that does not exist is the Frontier, parts and clothes fall back to stock");
  ok(isFinite(g.cap) && g.cap > 0 && isFinite(g.y) && g.mkt === "object" && g.re === "object", "the game runs: a tank, a place on the snow, Bytteboden and Real Estate start fresh");
  // and a sound save is not touched by any of it
  await reload({ cash: 4321.5, delivered: 12, rescues: 2, hour: 50.25, calOff: 24, own: { sled: "frontier", sleds: ["frontier"], parts: { track: "stock" }, cond: { "sled:frontier": 0.8 } } });
  await fresh();
  const h = await J(`({ cash: GS.cash, del: GS.delivered, resc: GS.rescues, hour: GS.hour, off: CAL.off, cond: GS.own.cond["sled:frontier"] })`);
  ok(h.cash === 4321.5 && h.del === 12 && h.resc === 2 && Math.abs(h.hour - 50.25) < 0.2 && h.off === 24 && h.cond === 0.8, "a sound save loads exactly as before: " + JSON.stringify(h));
});

await section("E numbers out of range and a sled listed twice (beta 0371)", async () => {
  await reload({ cash: -500, delivered: -3, rescues: -1, hour: -20, own: { sled: "frontier", sleds: ["frontier", "frontier", "ghost", 7, "frontier"] } });
  await fresh(); await sleep(1200);
  const g = await J(`({ cash: GS.cash, del: GS.delivered, resc: GS.rescues, hour: GS.hour, sleds: GS.own.sleds, sled: GS.own.sled, y: P.y })`);
  console.log("   in play: " + JSON.stringify(g));
  ok(g.cash === 0 && g.del === 0 && g.resc === 0, `cash, deliveries and rescues below zero come in as 0 (cash ${g.cash})`);
  ok(g.hour >= 0 && g.hour < 2 && isFinite(g.y), "a clock before the first morning starts at hour 0: " + g.hour);
  ok(g.sleds.length === 1 && g.sleds[0] === "frontier" && g.sled === "frontier", "a sled listed three times is owned once: " + JSON.stringify(g.sleds));
  await reload({ cash: 1e300, hour: 1e9, own: { sled: "frontier", sleds: ["frontier"] } });
  await fresh(); await sleep(1200);
  const h = await J(`(() => { const c0 = GS.cash; GS.cash += 5; return { c0, up: GS.cash - c0, hour: GS.hour, y: P.y }; })()`);
  console.log("   in play: " + JSON.stringify(h));
  ok(h.c0 === 1e12 && h.up === 5, `cash is held to a sum that still counts dollars: $5 earned adds ${h.up}`);
  ok(h.hour <= 876010 && isFinite(h.y), "the clock is held to a century: " + h.hour);
  const r = await ev(`TLSLOT.importText(5, ${JSON.stringify(JSON.stringify({ tracklayer: 1, save: { cash: -40, hour: -3, own: { sled: "frontier", sleds: ["frontier", "frontier"] } } }))})`);
  const d = await J(`JSON.parse(localStorage.getItem("tracklayer.slot.5") || "null")`);
  ok(r === "" && d && d.cash === 0 && d.hour === 0 && d.own.sleds.length === 1, "a file brought in is stored the same way: " + JSON.stringify(d));
});

await ev(`window.__noReload = true; ${wipe} true`);
console.log(fails ? `FAILS: ${fails}` : "all passed");
await done(fails ? 1 : 0);
