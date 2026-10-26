// G2 late ladder slice 3: what the Aurora E (60 deliveries) opens. Lists the work sites by distance from the quay
// (and from the nearest pump), samples the contract board at 46/60/75 deliveries (kinds + pay per kind, clean-air
// dests), checks the clean-air gate per sled (licence + trailer fitted), reads the Aurora garage card while locked
// and the Freight app on an Aurora. Before = origin/main via TL_SRC.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_cleanair.mjs
import { boot, ev, shot, sleep, done } from "../lib.mjs";
await boot();
const R = JSON.parse(await ev(`(() => {
  const R = { sites: [], boards: [], gate: {} };
  const pumps = typeof nearestFuel === "function" ? SITES.filter(s => s.fuelPrice && !s.plug) : [];
  for (const s of workSites()) R.sites.push([s.id, s.type, s.kind || "", Math.round(Math.hypot(s.x - depot.x, s.z - depot.z)), Math.round(s.y), routeKm(s).toFixed(1), siteOpen(s) ? "" : "closed"]);
  R.sites.sort((a, b) => b[3] - a[3]);
  for (const lvl of [46, 60, 75]) {
    GS.delivered = lvl; const ck = {}, dests = {}, locked = new Set();
    for (let i = 0; i < 40; i++) {
      makeContracts(depot);
      for (const c of GS.contracts) {
        if (c.locked) { locked.add(c.locked); continue; }
        const k = c.clean ? "clean" : c.tonne ? "tonne" : c.fell ? "fell" : c.groom ? "groom" : c.expedition ? "exped" : c.priority ? "prio" : c.big ? "heavy" : c.rescue ? "rescue" : "other";
        (ck[k] = ck[k] || []).push(c.pay);
        if (c.clean) { const key = c.dest.id + " " + c.kg + "kg " + conKm(c).toFixed(1) + "km"; dests[key] = (dests[key] || 0) + 1; }
      }
    }
    const cs = {}; for (const k in ck) cs[k] = Math.round(ck[k].reduce((a, b) => a + b, 0) / ck[k].length) + " [" + Math.min(...ck[k]) + "-" + Math.max(...ck[k]) + "]";
    R.boards.push({ lvl, cs, locked: [...locked], dests });
  }
  GS.cash = 50000; GS.lic.freight = true; GS.own.sleds = SLEDS.map(s => s.id);
  GS.own.partsOwned["hitch:trailer"] = true; GS.own.parts.hitch = "trailer";
  for (const id of ["apex", "matriarch", "aurora"]) {
    GS.delivered = 62; GS.own.sled = id; restat(); makeContracts(depot);
    const c = GS.contracts.find(x => x.clean);
    R.gate[id] = c ? contractBlock(c) || "OK" : "none (" + GS.contracts.filter(x => x.locked).map(x => x.locked).join(",") + ")";
  }
  GS.delivered = 50; GS.own.sleds = SLEDS.slice(0, 8).map(s => s.id); GS.own.sled = "matriarch"; restat(); makeContracts(depot);
  R.lock50 = GS.contracts.filter(x => x.locked).map(x => x.locked + ": " + x.sub);
  document.querySelector("#garage").hidden = false; garageTab = "sleds"; renderGarage();
  { const t = document.querySelector("#garage").innerText, i = t.lastIndexOf("Aurora E"); R.card = t.slice(i, i + 600); }
  const el = [...document.querySelectorAll("#garage *")].find(e => e.children.length === 0 && /^Aurora E$/.test(e.textContent.trim())); el && el.scrollIntoView({ block: "center" });
  return JSON.stringify(R);
})()`));
console.log("SITES (id type kind straight-m y route-km)"); for (const s of R.sites) console.log("  " + s.join(" "));
console.log("BOARDS");
for (const b of R.boards) console.log(`  ${b.lvl}: ${JSON.stringify(b.cs)}\n      locked=${JSON.stringify(b.locked)}\n      clean dests=${JSON.stringify(b.dests)}`);
console.log("GATE (licence + trailer, 62 deliveries):"); for (const k in R.gate) console.log(`  ${k}: ${R.gate[k]}`);
console.log("LOCKED @50:\n  " + (R.lock50 || []).join("\n  "));
console.log("AURORA CARD @50 deliveries:\n" + R.card);
await shot("01_garage_aurora_locked");
await ev(`(() => { document.querySelector("#garage").hidden = true; GS.delivered = 62; GS.own.sleds = SLEDS.map(s => s.id); GS.own.sled = "aurora"; restat(); applyLoadout(); makeContracts(depot); GS.apps.freight = true; GS.contracts.sort((a, b) => (b.clean ? 1 : 0) - (a.clean ? 1 : 0)); TABLET.toggle(true, "freight"); return true; })()`);
await sleep(1500);
await ev(`(() => { if (!TABLET.open) TABLET.toggle(true, "freight"); else TABLET.go("freight"); return TABLET.open + " " + TABLET.app; })()`);
await sleep(800);
console.log("FREIGHT APP:", (await ev(`(document.querySelector("#tabS") || document.body).innerText.slice(0, 1000)`)).replace(/\n+/g, " | "));
await shot("02_freight_app_aurora");
await done();
