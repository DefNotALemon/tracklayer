// Beta breaker for thank-yous at the door (v301): old save, reload while the words are pending, spare worth more than the part,
// two parcels at one door, pocket eaten while the tablet is up. Exit 1 on a failure.
import { boot, ev, sleep, done, park, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const KIT = `(() => { window.__hand = (id, n, o) => { const site = SITES.find(s => s.id === id);
  GS.load = GS.load.filter(q => !/^Test/.test(q.cargo));
  for (let i = 0; i < n; i++) GS.load.push(Object.assign({ dest: site, cargo: "Test parcel " + i, fragile: false, pay: 60, hits: 0 }, o || {}));
  const n0 = TLX.state("gifts").n; TLXGIFT.last = null; deliver(site);
  return { gift: TLXGIFT.last, n: TLX.state("gifts").n - n0 }; }; GS.warmth = 100; GS.storm = 0; CRASH.cool = 1; return true; })()`;
await boot();
await ev(`tutSkip(); true`); await sleep(400);
await park(); await ev(`crashCancel(); FOOT.on = false; WX.at = () => 0; true`); await ev(KIT);

// A: two parcels at one door count as one hand-over
await ev(`TLXGIFT.force = { kind: "snack", item: "kaffe" }; TLX.state("gifts").since = 0; true`);
let r = await J(`window.__hand("mehamn", 2)`);
console.log("A", JSON.stringify(r));
ok(r.n <= 1, "two parcels at one door give at most one gift (got " + r.n + ")");

// B: spare worth more than the part: change is kept
await ev(`TLXGIFT.force = null; const s = TLX.state("gifts"); s.credit = 500; s.spares = ["a pair of carbide runners"]; true`);
r = await J(`(() => { const cats = Object.keys(PARTS).filter(c => c !== "none"); let pick = null;
  for (const c of PART_ORDER) for (const o of PARTS[c].options) if (!pick && o.cost >= 20 && o.cost <= 120 && sledTier() >= o.tier && !o.needLic && !o.needRescues && !GS.own.partsOwned[ownKey(c, o.id)] && c !== "hitch" && c !== "recv" && c !== "boost") pick = { c, id: o.id, cost: o.cost };
  if (!pick) return null; GS.cash = 0; fitPart(pick.c, pick.id); return { pick, cash: GS.cash, credit: TLX.state("gifts").credit, owned: !!GS.own.partsOwned[ownKey(pick.c, pick.id)] }; })()`);
console.log("B", JSON.stringify(r));
ok(r && r.owned && r.cash === 0 && r.credit === 500 - r.pick.cost, "a $" + (r && r.pick.cost) + " part bought with spares and no cash: credit left " + (r && r.credit));

// C: reload while the words are pending: gift is saved, is the thank-you lost?
await ev(`TLXGIFT.force = { kind: "snack", item: "lefse" }; TLX.state("gifts").pocket = []; GS.cash = 100; true`);
r = await J(`window.__hand("mehamn", 1)`);
await reload();
await sleep(1500);
const c = await J(`({ pocket: TLX.state("gifts").pocket.length, said: TLXGIFT.said, live: TABLET.live ? TABLET.live.title : null })`);
console.log("C", JSON.stringify(c));
ok(c.pocket === 1, "the lefse survives a reload right after the hand-over");
ok(!!(c.said || c.live), "the words are still shown after a reload (said=" + JSON.stringify(c.said) + ")");

// D: old save: no gifts key
await reload({ cash: 77 });
const d = await J(`({ st: TLX.state("gifts"), ok: typeof TLXGIFT.deliv })`);
console.log("D", JSON.stringify(d));
ok(d.st && d.st.n === 0 && Array.isArray(d.st.pocket), "an old save without the gifts key loads with empty state");
await done();
console.log(fails ? "FAILED" : "all passed"); process.exit(fails ? 1 : 0);
