// I9 v293 beta: numerically odd (but right-typed) saves loaded straight
import { boot, ev, sleep, done, reload } from "../lib.mjs";
await boot();
let fails = 0;
const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const cases = {
  negative: { cash: -500, delivered: -3, rescues: -1, hour: -20, calOff: -5 },
  huge: { cash: 1e300, delivered: 1e15, hour: 1e9 },
  nanlike: { cash: null, delivered: null, hour: null, own: { sleds: [], sled: "frontier" } },
  dupsleds: { cash: 100, own: { sled: "frontier", sleds: ["frontier", "frontier", "ghost", 7] } },
  emptyobj: {},
};
for (const [k, s] of Object.entries(cases)) {
  await reload(s);
  await ev(`tutSkip(); crashCancel(); true`); await sleep(1500);
  const g = await J(`(() => { GS.cash += 5; return { cash: GS.cash, del: GS.delivered, hour: GS.hour, sled: GS.own.sled, sleds: GS.own.sleds, y: P.y, cap: GS.cap }; })()`);
  console.log("   " + k + ": " + JSON.stringify(g));
  ok(isFinite(g.cash) && isFinite(g.hour) && isFinite(g.y) && isFinite(g.cap), k + ": numbers finite and game runs");
  ok(g.cash >= 0, k + ": cash not negative");
  ok(Array.isArray(g.sleds) && g.sleds.includes(g.sled) && g.sleds.every(x => typeof x === "string"), k + ": owned sleds sane");
  if (g.del != null) ok(g.del >= 0, k + ": deliveries not negative");
}
console.log(fails ? `FAILS: ${fails}` : "all passed");
await done(fails ? 1 : 0);
