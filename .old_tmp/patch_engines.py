import sys, re
p = sys.argv[1]
s = open(p, encoding="utf-8").read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit(f"anchor count {n} != {count}: {old[:80]!r}")
    s = s.replace(old, new)

# 1. clutch loses big-bore and turbo (those are engines and forced induction now)
rep('''    label: "Engine & clutch", must: true, options: [
      { id: "stock", name: "Stock clutching", cost: 0, tier: 0, stats: {} },
      { id: "helix", name: "Helix & spring kit", cost: 340, tier: 1, stats: { power: 0.1 }, note: "Backshifts instead of sulking." },
      { id: "bigbore", name: "Big-bore top end", cost: 980, tier: 2, stats: { power: 0.22, burn: 0.15 }, note: "More everything, including thirst." },
      { id: "turbo", name: "Bolt-on turbo", cost: 2600, tier: 3, stats: { power: 0.45, burn: 0.3 }, note: "Altitude stops mattering." }
    ]
  },''', '''    label: "Clutch", must: true, options: [
      { id: "stock", name: "Stock clutching", cost: 0, tier: 0, stats: {} },
      { id: "helix", name: "Helix & spring kit", cost: 340, tier: 1, stats: { power: 0.1 }, note: "Backshifts instead of sulking." }
    ]
  },
  // bolted to whatever engine is in the sled; `boost` is a share of that engine's own power
  boost: {
    label: "Forced induction", options: [
      { id: "none", name: "Naturally aspirated", cost: 0, tier: 0, stats: {}, note: "Breathes whatever the fell gives it." },
      { id: "super", name: "Belt-driven supercharger", cost: 1400, tier: 1, na: true, stats: { boost: 0.16, burn: 0.1 }, note: "Instant shove off the bottom, no lag, a bit of whine." },
      { id: "turbo", name: "Bolt-on turbo kit", cost: 2400, tier: 2, na: true, stats: { boost: 0.28, burn: 0.18 }, note: "Wastegate, blow-off valve, a pipe that glows at night." },
      { id: "bigturbo", name: "Big turbo & intercooler", cost: 4200, tier: 3, na: true, stats: { boost: 0.42, burn: 0.3 }, note: "Altitude stops mattering. So does fuel economy." },
      { id: "tune", name: "Boost controller & tune", cost: 900, tier: 1, fac: true, stats: { boost: 0.12, burn: 0.06 }, note: "Turns up a factory turbo. Only fits a turbo engine." }
    ]
  },''')
rep('const PART_ORDER = ["track", "skis", "clutch", "can",', 'const PART_ORDER = ["track", "skis", "clutch", "boost", "can",')
rep('parts: { track: "stock", skis: "stock", clutch: "stock", can: "stock",', 'parts: { track: "stock", skis: "stock", clutch: "stock", boost: "none", can: "stock",')
rep('''  gearOwned: {}
});''', '''  gearOwned: {},
  engines: {},          // sled id -> swapped-in engine (missing = the one it came with)
  shelf: [],            // engines you own that aren't in a sled
  pickups: []           // engines paid for and waiting at the seller's
});''')

# 2. the engine catalogue, the classifieds, swaps
rep('''const sledDef = () => SLEDS.find(s => s.id === GS.own.sled) || SLEDS[0];''', '''const sledDef = () => SLEDS.find(s => s.id === GS.own.sled) || SLEDS[0];

/* ---------------- engines: what's for sale up and down the coast ---------------- */
// Engines get swapped, not upgraded. Every morning the classifieds turn over: a few used motors
// sitting in sheds and boathouses round the Nordkinn, and only ever ones that beat what's in your
// sled. Have it brought round on the freight sled for a fee, or ride out and strap the crate on
// yourself. `power` is the same scale as a sled's own; used ones lose a little to their hours.
const ENGINES = [
  { id: "fan340", name: "340 fan-cooled single", power: 0.72, burn: 1.05, price: 250 },
  { id: "fan440", name: "440 fan-cooled twin", power: 0.84, burn: 1.05, price: 380 },
  { id: "lc500", name: "500 liquid-cooled twin", power: 0.96, burn: 1.0, price: 720 },
  { id: "lc580", name: "580 liquid twin, triple pipes", power: 1.06, burn: 1.12, price: 1050 },
  { id: "fan550", name: "550 fan twin, touring tune", power: 1.08, burn: 0.9, price: 1150 },
  { id: "lc600", name: "600 liquid twin", power: 1.12, burn: 1.0, price: 1400 },
  { id: "ho600", name: "600 H.O. semi-direct injection", power: 1.18, burn: 0.84, price: 2100 },
  { id: "tri700", name: "700 triple", power: 1.22, burn: 1.2, price: 1900 },
  { id: "fs1049", name: "1049 four-stroke triple", power: 1.28, burn: 0.78, price: 3000 },
  { id: "efi800", name: "800 twin, fuel injected", power: 1.32, burn: 1.04, price: 3300 },
  { id: "di850", name: "850 direct-injection twin", power: 1.42, burn: 0.98, price: 4400 },
  { id: "race900", name: "900 race twin, ported", power: 1.5, burn: 1.3, price: 5000 },
  { id: "t998", name: "998 four-stroke turbo triple", power: 1.55, burn: 0.95, price: 6200, turbo: true },
  { id: "t850", name: "850 turbo twin", power: 1.6, burn: 1.18, price: 6900, turbo: true }
];
const STOCK_ENGINE = { frontier: "fan340", woodsman: "fan440", ranger: "lc500", sprint: "lc580", summit: "lc600", trekker: "fan550", apex: "efi800", matriarch: "t850", aurora: null };
const engDef = id => ENGINES.find(e => e.id === id);
const isElectric = sd => STOCK_ENGINE[sd.id] === null;
// what is actually bolted into a sled right now
function engineOf(sd) {
  const inst = GS.own && GS.own.engines && GS.own.engines[sd.id], e = inst && engDef(inst.eid);
  if (e) return { inst, def: e, name: e.name, pwr: inst.pwr, burn: e.burn, turbo: !!e.turbo, stock: false };
  const s0 = engDef(STOCK_ENGINE[sd.id]);
  return { inst: null, def: s0, name: s0 ? s0.name : "Battery pack", pwr: sd.power, burn: 1, turbo: !!(s0 && s0.turbo), stock: true, electric: !s0 };
}
// can this forced-induction option run on that engine?
function boostWhy(sd, id) {
  const o = partDef("boost", id), eng = engineOf(sd);
  if (id === "none") return "";
  if (eng.electric) return "Nothing to boost on a battery sled.";
  if (o.na && eng.turbo) return `The ${eng.name} already has a factory turbo.`;
  if (o.fac && !eng.turbo) return "Needs an engine with a factory turbo.";
  return "";
}
const SELLERS = ["Arne", "Sigrid", "Nils-Ole", "Berit", "Mathis", "Kari", "Johan Henrik", "Ellen Marie", "Trond", "Solveig", "Isak", "Randi", "Per Anders", "Marit"];
const WHY = [
  "Pulled it out of a sled that went through the lake ice. Dried out, runs sweet.",
  "Rebuilt last spring, bored and honed. Never been past half throttle, he swears.",
  "Came off a sled that got rolled on Gartefjellet. The motor was the only thing that wasn't bent.",
  "Spare from the herders' workshop. Too much motor for the old sleds they run.",
  "Estate sale. It's been in the boathouse under a tarp for years.",
  "Selling up and buying a boat.",
  "Had it shipped up from Alta, then the sled it was for broke first.",
  "Her son bought it for racing. She says it goes.",
  "Ran the post route on it for two winters. Oil changed every month.",
  "Traded for a season of stockfish. Doesn't need it."
];
const marketDay = () => Math.floor((GS.hour - 6) / 24);           // the listings turn over at 06:00
const freightFee = s => round5(40 + Math.hypot(s.x - garageSite.x, s.z - garageSite.z) * 0.04);
function makeMarket() {
  const sd = sledDef(), cur = engineOf(sd).pwr;
  GS.market = { day: marketDay(), base: cur, list: [] };
  if (isElectric(sd)) return;
  const spots = SITES.filter(s => s.type === "cabin" && s.x !== undefined);
  // mostly the next step or two up, now and then a leap; nothing silly for a first-week courier
  const pool = ENGINES.filter(e => e.power * 0.95 > cur + 0.03 && e.power <= cur + 0.6)
    .map(e => ({ e, k: (e.power - cur) + Math.random() * 0.35 })).sort((a, b) => a.k - b.k).map(x => x.e);
  const n = Math.min(pool.length, 3 + (Math.random() < 0.45 ? 1 : 0));
  for (let k = 0; k < n; k++) {
    const e = pool[k], wear = Math.random(), site = pick(spots);   // wear 0 = barely run, 1 = tired
    GS.market.list.push({
      eid: e.id, site: site.id, seller: pick(SELLERS), why: pick(WHY),
      hrs: Math.round(lerp(30, 950, wear) / 10) * 10,
      pwr: +(e.power * (1 - 0.05 * wear)).toFixed(3),
      price: round5(e.price * lerp(1.05, 0.72, wear) * (0.9 + Math.random() * 0.2))
    });
  }
}
function marketNow() {
  if (!GS.market || GS.market.day !== marketDay() || engineOf(sledDef()).pwr > GS.market.base + 0.01) makeMarket();
  const cur = engineOf(sledDef()).pwr;
  return GS.market.list.filter(l => l.pwr > cur + 0.02);
}
function checkBoost() {
  const id = GS.own.parts.boost || "none", why = boostWhy(sledDef(), id);
  if (!why) return;
  GS.own.parts.boost = "none";
  toast(`${partDef("boost", id).name} is off for now. ${why}`, "warn");
}
// the engine coming out goes on the shelf; the one it came with just waits in the shop
function fitEngine(inst, sd) {
  const old = GS.own.engines[sd.id]; if (old) GS.own.shelf.push(old);
  if (inst) GS.own.engines[sd.id] = inst; else delete GS.own.engines[sd.id];
  checkBoost(); restat();
}
function buyEngine(l, collect) {
  const sd = sledDef();
  if (isElectric(sd)) { toast("The Aurora runs on a battery. No engine goes in there.", "warn"); return; }
  const site = SITES.find(s => s.id === l.site), def = engDef(l.eid), fee = collect ? 0 : freightFee(site), cost = l.price + fee;
  if (GS.cash < cost) { toast(`That's $${cost}${fee ? ` with $${fee} freight` : ""}. You have $${GS.cash}.`, "warn"); return; }
  GS.cash -= cost; GS.market.list.splice(GS.market.list.indexOf(l), 1);
  const inst = { eid: l.eid, pwr: l.pwr, hrs: l.hrs, from: site.name, seller: l.seller };
  if (collect) {
    GS.own.pickups.push({ inst, site: site.id, aboard: false });
    toast(`Paid ${l.seller} $${l.price}. The crate's waiting in ${site.name}: stop at the door and it goes on the rack.`, "good");
  } else {
    fitEngine(inst, sd);
    toast(`The ${def.name} came round from ${site.name} on the freight sled. Fitted: ${Math.round(inst.pwr * 100)}% power.`, "good");
  }
  renderGarage(); save();
}
function shelfSwap(i) {
  const sd = sledDef(); if (isElectric(sd)) { toast("No engine goes in a battery sled.", "warn"); return; }
  const inst = GS.own.shelf.splice(i, 1)[0]; if (!inst) return;
  fitEngine(inst, sd); toast(`Swapped the ${engDef(inst.eid).name} into the ${sd.name}.`, "good"); renderGarage(); save();
}
function refitStock() {
  const sd = sledDef(); fitEngine(null, sd);
  toast(`Put the ${sd.name}'s own engine back in.`); renderGarage(); save();
}
const shelfValue = inst => round5(engDef(inst.eid).price * 0.45);
function shelfSell(i) {
  const inst = GS.own.shelf.splice(i, 1)[0]; if (!inst) return;
  const v = shelfValue(inst); GS.cash += v;
  toast(`Sold the ${engDef(inst.eid).name} to the shop for $${v}.`, "good"); renderGarage(); save();
}
// ride up to the seller's door slowly and the crate goes on the rack
function collectEngine(site) {
  const p = GS.own.pickups.find(q => !q.aboard && q.site === site.id); if (!p) return;
  const name = engDef(p.inst.eid).name;
  if (smallLoads().length >= ST.slots) {
    if (gameClock - (p.nagT || -99) > 10) { p.nagT = gameClock; toast(`The ${name} crate needs a spot on the rack. Drop a parcel off first.`, "warn"); }
    return;
  }
  p.aboard = true;
  GS.load.push({ dest: garageSite, cargo: name + " (crate)", crate: p, fragile: false, pay: 0, due: null, hits: 0 });
  toast(`${p.inst.seller} helps you strap the ${name} on the rack. Take it to Nordkinn Skuter & Service.`, "good");
  applyLoadout(); save();
}
function pendingPickup() { return GS.own.pickups.find(q => !q.aboard); }
const burnTxt = b => b < 0.97 ? `${Math.round((1 - b) * 100)}% thriftier` : b > 1.03 ? `${Math.round((b - 1) * 100)}% thirstier` : "average thirst";''')

# 3. stats: the engine is the base, boost multiplies it
rep('''  const st = { power: sd.power, fuel: sd.fuel, drag: sd.drag, grip: sd.grip, burn: 1, cold: 0, soak: 0, care: 0, light: 1, slots: 1, bays: 0, groom: 0 };
  for (const cat of PART_ORDER) {
    const o = partDef(cat, GS.own.parts[cat]).stats || {};''', '''  const eng = engineOf(sd);
  const st = { power: eng.pwr, fuel: sd.fuel, drag: sd.drag, grip: sd.grip, burn: eng.burn, cold: 0, soak: 0, care: 0, light: 1, slots: 1, bays: 0, groom: 0, boost: 0 };
  for (const cat of PART_ORDER) {
    if (cat === "boost" && boostWhy(sd, GS.own.parts.boost || "none")) continue;
    const o = partDef(cat, GS.own.parts[cat]).stats || {};
    st.boost += o.boost || 0;''')
rep('''  st.drag = Math.max(0.35, st.drag);
  return st;''', '''  st.drag = Math.max(0.35, st.drag);
  st.power += eng.pwr * st.boost;
  return st;''')

# 4. switching sleds re-checks the boost kit
rep('''  if (GS.own.sleds.includes(id)) { GS.own.sled = id; restat();''', '''  if (GS.own.sleds.includes(id)) { GS.own.sled = id; checkBoost(); restat();''')
rep('''  GS.cash -= s.cost; GS.own.sleds.push(id); GS.own.sled = id; restat();''', '''  GS.cash -= s.cost; GS.own.sleds.push(id); GS.own.sled = id; checkBoost(); restat();''')
rep('''  if (GS.own.partsOwned[ownKey(cat, id)] || o.cost === 0) { GS.own.parts[cat] = id; restat(); renderGarage(); save(); return; }
  if (!tierOK)''', '''  const bw = cat === "boost" ? boostWhy(sledDef(), id) : "";
  if (bw) { toast(bw, "warn"); return; }
  if (GS.own.partsOwned[ownKey(cat, id)] || o.cost === 0) { GS.own.parts[cat] = id; restat(); renderGarage(); save(); return; }
  if (!tierOK)''')
rep('''  if (s.power) bits.push((s.power > 0 ? "+" : "") + Math.round(s.power * 100) + "% power");''', '''  if (s.power) bits.push((s.power > 0 ? "+" : "") + Math.round(s.power * 100) + "% power");
  if (s.boost) bits.push("+" + Math.round(s.boost * 100) + "% engine power");''')

# 5. garage: an Engines tab
rep('''      const spec = `${s.year} · ${Math.round(s.power * 100)}% power ·''', '''      const spec = `${s.year} · ${Math.round(engineOf(s).pwr * 100)}% power${engineOf(s).stock ? "" : " (swapped)"} ·''')
rep('''  } else if (garageTab === "parts") {
    PART_ORDER.forEach(cat => {''', '''  } else if (garageTab === "engines") {
    renderEngines(body, row, tryOn);
  } else if (garageTab === "parts") {
    PART_ORDER.filter(c => c !== "boost").forEach(cat => {''')
rep('''function openGarage() {''', '''// a row with its own buttons (buy two ways, swap or sell)
function actRow(body, title, sub, acts, tag) {
  const d = document.createElement("div"); d.className = "row ask";
  d.innerHTML = `<span class="main"><b>${title}</b><em>${sub || ""}</em></span><span class="acts"></span>`;
  if (tag) d.querySelector("b").insertAdjacentHTML("afterend", ` <span class="tag">${tag}</span>`);
  for (const a of acts) {
    const b = document.createElement("button"); b.textContent = a.label; if (a.title) b.title = a.title;
    if (a.dis) b.disabled = true; else b.addEventListener("click", a.fn);
    d.querySelector(".acts").appendChild(b);
  }
  body.appendChild(d); return d;
}
function renderEngines(body, row, tryOn) {
  const sd = sledDef(), eng = engineOf(sd), sec = t => { const h = document.createElement("div"); h.className = "bsec"; h.textContent = t; body.appendChild(h); };
  const foot = html => { const n = document.createElement("div"); n.className = "bfoot"; n.innerHTML = html; body.appendChild(n); };
  const pct = v => Math.round(v * 100) + "%";
  sec(`In the ${sd.name}`);
  if (eng.electric) {
    row(eng.name, "Electric drive. No engine swaps and nothing to boost.", "Fitted", "on", () => { });
  } else {
    row(eng.name, `${pct(eng.pwr)} power · ${burnTxt(eng.burn)}${eng.turbo ? " · factory turbo" : ""}${ST.boost ? ` · ${pct(ST.power)} with everything bolted on` : ""}\\n${eng.inst ? `${eng.inst.hrs} h on it · bought off ${eng.inst.seller} in ${eng.inst.from}` : "The motor it left the factory with."}`, "Fitted", "on", () => { });
    if (!eng.stock) row(`Stock ${engDef(STOCK_ENGINE[sd.id]).name}`, `${pct(sd.power)} power · the ${sd.name}'s own motor, crated in the shop`, "Refit", "", refitStock);
  }
  // paid for and still out there
  for (const p of GS.own.pickups) {
    const site = SITES.find(s => s.id === p.site), d = engDef(p.inst.eid);
    row(d.name, `${pct(p.inst.pwr)} power · paid for · ${p.aboard ? "on your rack, bring it here" : `waiting at ${p.inst.seller}'s in ${site.name}, ${fmtMi(Math.hypot(site.x - garageSite.x, site.z - garageSite.z))} out`}`, p.aboard ? "Aboard" : "Collect", "locked", null, "PAID");
  }
  if (GS.own.shelf.length) {
    sec("On the shelf");
    GS.own.shelf.forEach((inst, i) => {
      const d = engDef(inst.eid);
      actRow(body, d.name, `${pct(inst.pwr)} power · ${burnTxt(d.burn)}${d.turbo ? " · factory turbo" : ""} · ${inst.hrs} h`,
        [{ label: "Swap in", fn: () => shelfSwap(i), dis: eng.electric }, { label: `Sell $${shelfValue(inst)}`, fn: () => shelfSell(i) }]);
    });
  }
  sec("For sale round the Nordkinn");
  const list = eng.electric ? [] : marketNow();
  if (eng.electric) foot("Nobody up here sells battery packs. The shop sends to Tromsø for those.");
  else if (!list.length) foot(`Nothing for sale on the peninsula today that beats the ${eng.name}. New listings every morning at 06:00.`);
  else {
    list.forEach(l => {
      const d = engDef(l.eid), site = SITES.find(s => s.id === l.site), fee = freightFee(site);
      const dist = fmtMi(Math.hypot(site.x - garageSite.x, site.z - garageSite.z));
      actRow(body, d.name, `${pct(l.pwr)} power (+${Math.round((l.pwr / eng.pwr - 1) * 100)}%) · ${burnTxt(d.burn)}${d.turbo ? " · factory turbo" : ""} · ${l.hrs} h\\n${l.seller}, ${site.name} · ${dist} out\\n“${l.why}”`,
        [{ label: `Ship $${l.price + fee}`, title: `$${l.price} + $${fee} on the freight sled, fitted today`, fn: () => buyEngine(l, false) },
         { label: `Collect $${l.price}`, title: `Ride to ${site.name} and bring the crate back yourself`, fn: () => buyEngine(l, true) }],
        d.turbo ? "TURBO" : "");
    });
    foot(`Ship it and the freight sled brings it round today, or pay the seller and collect the crate yourself (it takes a spot on the rack). Listings turn over at 06:00.`);
  }
  sec(PARTS.boost.label);
  PARTS.boost.options.forEach(o => {
    const owned = GS.own.partsOwned[ownKey("boost", o.id)] || o.cost === 0, on = (GS.own.parts.boost || "none") === o.id;
    const why = boostWhy(sd, o.id), locked = (!owned && sledTier() < o.tier) || !!why;
    tryOn(row(o.name, [statLine(o), why || o.note].filter(Boolean).join(" · "),
      on ? "Fitted" : why ? "Won't fit" : owned ? "Owned" : sledTier() < o.tier ? `Gen ${o.tier + 1}+` : "$" + o.cost,
      on ? "on" : locked ? "locked" : "", () => fitPart("boost", o.id)), { cat: "boost", id: o.id });
  });
}
function openGarage() {''')
rep('''  [["sleds", "Sleds"], ["parts", "Parts"], ["gear", "Rider kit"]]''', '''  [["sleds", "Sleds"], ["engines", "Engines"], ["parts", "Parts"], ["gear", "Rider kit"]]''')

# 6. visuals
rep('''  const turbo = ex.includes("turbo") || pr.clutch === "turbo";''', '''  const eng = engineOf(sd), bst = boostWhy(sd, pr.boost || "none") ? "none" : (pr.boost || "none");
  const kitTurbo = bst === "turbo" || bst === "bigturbo" || (eng.turbo && !eng.stock);
  const turbo = ex.includes("turbo") || kitTurbo;''')
rep('''  V.hoodScoop.visible = pr.clutch === "bigbore"; V.turboScoop.visible = pr.clutch === "turbo";''', '''  V.turboScoop.visible = kitTurbo;
  V.hoodScoop.visible = !kitTurbo && (bst === "super" || (!eng.stock && !eng.turbo));   // a swapped motor wants more air''')

# 7. pickups, delivery, blackout, HUD
rep('''  if (near && spd < 4 && GS.load.some(j => j.dest === near)) deliver(near);''', '''  if (near && spd < 4 && GS.load.some(j => j.dest === near)) deliver(near);
  if (near && spd < 4 && GS.own.pickups.length) collectEngine(near);
  if (GS.market && GS.market.day !== marketDay() && !isElectric(sledDef())) { makeMarket(); if (marketNow().length) toast("New engines in the classifieds. The garage has the list.", undefined); }''')
rep('''  for (const s of SITES) if (s.beacon) s.beacon.visible = GS.load.length ? GS.load.some(j => j.dest === s) : (s === depot && near !== depot);''', '''  const pend = !GS.load.length && !GS.groomJob && pendingPickup(), pendSite = pend && SITES.find(s => s.id === pend.site);
  for (const s of SITES) if (s.beacon) s.beacon.visible = GS.load.length ? GS.load.some(j => j.dest === s) : pendSite ? s === pendSite : (s === depot && near !== depot);''')
rep('''function deliver(site) {
  const here = GS.load.filter(j => j.dest === site);''', '''function deliver(site) {
  const crates = GS.load.filter(j => j.crate && j.dest === site);
  if (crates.length) {
    GS.load = GS.load.filter(j => !crates.includes(j));
    const sd = sledDef();
    for (const j of crates) {
      const p = j.crate, d = engDef(p.inst.eid);
      GS.own.pickups.splice(GS.own.pickups.indexOf(p), 1);
      if (isElectric(sd)) { GS.own.shelf.push(p.inst); toast(`The ${d.name} goes on the shelf. Nowhere to put it in a battery sled.`); }
      else { fitEngine(p.inst, sd); toast(`The shop drops the ${d.name} into the ${sd.name}: ${Math.round(p.inst.pwr * 100)}% power.`, "good"); }
    }
    applyLoadout(); save();
  }
  const here = GS.load.filter(j => j.dest === site);''')
rep('''  GS.cash = Math.max(0, GS.cash - fee);
  GS.load = [];''', '''  GS.cash = Math.max(0, GS.cash - fee);
  for (const j of GS.load) if (j.crate) j.crate.aboard = false;   // a paid-for engine isn't lost: it goes back to the seller's shed
  GS.load = [];''')
rep('''  } else if (GS.groomJob) tgt = groomTarget();
  const dx = tgt.x - P.x''', '''  } else if (GS.groomJob) tgt = groomTarget();
  const pend = !GS.load.length && !GS.groomJob && pendingPickup();
  if (pend) tgt = SITES.find(s => s.id === pend.site) || tgt;
  const dx = tgt.x - P.x''')
rep('''  } else if (GS.near === depot) { $("jobTitle").textContent = "Kjøllefjord quay";''', '''  } else if (pend) {
    $("jobTitle").textContent = `Collect: ${engDef(pend.inst.eid).name}`;
    $("jobSub").textContent = `Paid for · ${pend.inst.seller} in ${tgt.name} · ${fmtMi(dist)}`;
  } else if (GS.near === depot) { $("jobTitle").textContent = "Kjøllefjord quay";''')

# 8. save migration: the old clutch big-bore / turbo
rep('''  restat(); GS.fuel = GS.cap;
}''', '''  migrateEngines();
  restat(); GS.fuel = GS.cap;
}
// saves from before engine swaps: the big-bore kit is refunded, the bolt-on turbo becomes the turbo kit
function migrateEngines() {
  const o = GS.own, po = o.partsOwned;
  o.engines = o.engines || {}; o.shelf = o.shelf || []; o.pickups = o.pickups || [];
  for (const p of o.pickups) p.aboard = false;                    // the rack isn't saved; crates wait at the seller's again
  if (!o.parts.boost) o.parts.boost = "none";
  if (po["clutch:turbo"]) { delete po["clutch:turbo"]; po["boost:turbo"] = true; if (o.parts.clutch === "turbo") o.parts.boost = "turbo"; }
  if (po["clutch:bigbore"]) { delete po["clutch:bigbore"]; GS.cash += 980; }
  if (o.parts.clutch !== "stock" && o.parts.clutch !== "helix") o.parts.clutch = po["clutch:helix"] ? "helix" : "stock";
  if (boostWhy(sledDef(), o.parts.boost)) o.parts.boost = "none";
}''')

open(p, "w", encoding="utf-8").write(s)
print("ok")
