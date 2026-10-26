// G2: what the late-ladder lock text (fell / tonne / clean-air cards) tells you in three situations:
// (a) short on deliveries and cash, (b) enough deliveries but short on cash, (c) you OWN the right sled but
// ride a smaller one. The card should say what's missing, not repeat the price of a sled you already have.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_lockgap.mjs
import { boot, ev, done } from "../lib.mjs";
await boot();
const R = JSON.parse(await ev(`(() => {
  const R = [];
  GS.lic.freight = true;
  GS.own.partsOwned["hitch:flatbed"] = true; GS.own.parts.hitch = "flatbed";
  GS.own.partsOwned["recv:heavy"] = true; GS.own.parts.recv = "heavy";
  GS.own.partsOwned["hitch:trailer"] = true;
  const kinds = [["fell", c => c.fell && !c.tonne, 40], ["tonne", c => c.tonne, 50], ["clean", c => c.clean, 62]];
  const cases = [
    ["a short deliveries+cash", 0, 800, ["frontier","woodsman","ranger","sprint","summit"], "summit"],
    ["b short cash", 0, 1200, ["frontier","woodsman","ranger","sprint","summit"], "summit"],
    ["c owns it, rides summit", 0, 50000, SLEDS.map(s => s.id), "summit"]
  ];
  for (const [kn, f, lvl] of kinds) for (const [cn, _, cash, owned, ride] of cases) {
    GS.delivered = cn[0] === "a" ? lvl - 10 : lvl; GS.cash = cash; GS.own.sleds = owned.slice(); GS.own.sled = ride; restat();
    let c = null; for (let i = 0; i < 40 && !c; i++) { makeContracts(depot); c = GS.contracts.find(x => !x.locked && f(x)); }
    if (!c && cn[0] === "a") { GS.delivered = lvl; for (let i = 0; i < 40 && !c; i++) { makeContracts(depot); c = GS.contracts.find(x => !x.locked && f(x)); } GS.delivered = lvl - 10; }
    R.push(kn + " / " + cn + " (" + GS.delivered + " del, $" + GS.cash + "): " + (c ? (contractBlock(c) || "OK") : "no card"));
  }
  return JSON.stringify(R);
})()`));
for (const l of R) console.log(l);
await done();
