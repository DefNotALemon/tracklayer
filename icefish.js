// Tracklayer — ice fishing. Loaded by index.html before tracklayer.js.
//
// The 3D prototype (claude.ai artifact 8x38xAzM5zbLgRfSJGd6vf) ported into the game itself: same sim and tuning,
// species, bait, augers, hole-size limits, side-view camera, jointed rider and the verlet line that rubs on the rim.
// It lives in the game's own scene and renderer, at the real lake, beside your real parked sled:
//   - the rider, rod, auger, bucket and snow berms go into the main scene;
//   - the lake bed, weeds, fish, hole walls, the lure and the clear-ice film are drawn in a second pass that only
//     shows through the scraped windows (a stencil mask, depth-tested against the world), so the terrain is untouched;
//   - the line is drawn last, over both.
// Nothing here exists while you ride: build() runs when you step off to fish and teardown() disposes of it all
// when you pack up.
//
// The top-level tables (rods, reels, lines, augers, lures, species) are exported as TLFish.GEAR / TLFish.SPECIES so
// other systems (the Marketplace, O6) can list used gear: TLFish.used(cat, id, condition).
// Events, the same as the prototype:  IceFishing.on('catch', fish => …)  ·  IceFishing.on('exit', sum => …)  ·  IceFishing.reset(opts)
(() => {
"use strict";
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const rnd = (a, b) => a + Math.random() * (b - a);
const VS = 0.42, MAX_HOLES = 8;          // fish depth is drawn at VS scale (stylised), as in the prototype

/* =================================================================================================================
   THE TABLES. Prices are dollars: the prototype's kroner at 1 kr = $0.10 (about the real rate).
   Every table is a plain array: add a row and it shows up in the shop, the tackle box and the sled panel.
   ================================================================================================================= */
// price: $ per kg at the quay fish buyer
const SPECIES = {
  perch:     { name: "Perch",       local: "abbor",  col: "#a3b84c", belly: "#e6d9a0", kg: [.08, .9], depth: [1.2, 7],  str: .6,  like: 1.0, price: 6,  w: 30, k: .011, slim: .34 },
  trout:     { name: "Brown trout", local: "ørret",  col: "#b59a5c", belly: "#f0dfb4", kg: [.3, 4.5], depth: [1, 6],    str: 1.0, like: .7,  price: 15, w: 14, k: .011, slim: .27 },
  char:      { name: "Arctic char", local: "røye",   col: "#5e6f78", belly: "#e0743e", kg: [.3, 3.2], depth: [4, 16],   str: .95, like: .45, price: 19, w: 15, k: .011, slim: .27 },
  pike:      { name: "Pike",        local: "gjedde", col: "#5f7a42", belly: "#dfe3b0", kg: [1, 9],    depth: [1.2, 5],  str: 1.05, like: 1.25, price: 4, w: 8,  k: .006, slim: .19 },
  whitefish: { name: "Whitefish",   local: "sik",    col: "#9fb0ba", belly: "#eef3f5", kg: [.2, 1.8], depth: [5, 14],   str: .7,  like: .35, price: 9,  w: 17, k: .011, slim: .28 },
  burbot:    { name: "Burbot",      local: "lake",   col: "#6b5a3a", belly: "#c9b98f", kg: [.4, 3],   depth: [8, 22],   str: .8,  like: .3,  price: 8,  w: 9,  k: .006, slim: .2, bottom: true },
  grayling:  { name: "Grayling",    local: "harr",   col: "#7f8aa0", belly: "#dcd6e4", kg: [.2, 1.3], depth: [1, 4],    str: .75, like: .8,  price: 11, w: 7,  k: .01,  slim: .25, sail: true }
};
const SPECIES_ORDER = ["char", "trout", "grayling", "whitefish", "burbot", "perch", "pike"];

// RODS. win multiplies the bite-set window (better rods show the bite sooner, so you get longer to set the hook);
// clear is how plainly a nibble comes up the blank: the chance you see it (cue + tip twitch) and how big the twitch is.
const RODS = [
  { id: "short",   tier: 1, name: "Short jigging rod",    local: "kort pilkestang", len: 45, win: 1.0,  clear: .55, price: 25,
    blurb: "A stubby glass rod off the bargain bin. It does the job; you'll miss the shy nibbles." },
  { id: "glass",   tier: 2, name: "Fibreglass ice rod",   local: "glassfiber isstang", len: 60, win: 1.15, clear: .7, price: 70,
    blurb: "A proper ice rod with a softer tip. Bites read a little earlier." },
  { id: "graphite", tier: 3, name: "Graphite spring-tip rod", local: "grafitt fjærtupp", len: 70, win: 1.3, clear: .85, price: 160,
    blurb: "Stiff graphite with a spring tip that dips at the faintest touch." },
  { id: "carbon",  tier: 4, name: "Sensitive carbon rod", local: "karbonstang", len: 75, win: 1.45, clear: 1, price: 320,
    blurb: "High-modulus carbon with a fine bobber. You feel a whitefish breathe on the jig." }
];
// REELS. smooth is the drag: it takes the spikes out of a surge and gives you longer at full tension before the line
// parts. speed multiplies the retrieve.
const REELS = [
  { id: "plastic", tier: 1, name: "Plastic inline reel",     local: "plastsnelle", smooth: 0,   speed: 1.0, price: 20,
    blurb: "A plastic spool on a click drag. Every surge goes straight into the line." },
  { id: "alu",     tier: 2, name: "Aluminium inline reel",   local: "aluminiumsnelle", smooth: .35, speed: 1.1, price: 60,
    blurb: "Machined spool and a real drag washer. Takes the edge off a run." },
  { id: "bearing", tier: 3, name: "Ball-bearing inline reel", local: "kulelagersnelle", smooth: .65, speed: 1.2, price: 140,
    blurb: "Four bearings and a carbon drag. Smooth and quick." },
  { id: "sealed",  tier: 4, name: "Sealed-drag reel",        local: "tett brems", smooth: 1,   speed: 1.3, price: 280,
    blurb: "A sealed drag that doesn't ice up or stick. Pike can run all they like." }
];
// LINES. strength is the snap point (the fight's tension is divided by it, so 1.6 takes 60% more pull than 1.0);
// stretch cushions surges but costs hooksets deep down; vis scares line-shy fish (more in clear lakes); feel stretches
// the bite window; biteOff = pike bite-through chance per second; ice = braid ices up in the guides (slower reel).
const LINES = [
  { id: "mono3",       name: "Ice mono 0.12 mm",       kind: "Monofilament", lb: 3,  strength: .65, stretch: .5,  vis: .3,  feel: .9,  biteOff: .14, ice: false, price: 5,
    col: 0xe8f2f7, blurb: "Hair-fine and cheap. Gentle on shy fish, hopeless on a pike." },
  { id: "mono",        name: "Ice mono 0.14 mm",       kind: "Monofilament", lb: 4,  strength: .8,  stretch: .5,  vis: .35, feel: .9,  biteOff: .12, ice: false, price: 6,
    col: 0xe8f2f7, blurb: "Cheap, soft and stretchy. Forgives a surge, but the stretch eats your hookset in deep water." },
  { id: "heavymono",   name: "Heavy mono 0.30 mm",     kind: "Monofilament", lb: 15, strength: 1.4, stretch: .6,  vis: .55, feel: .85, biteOff: .05, ice: false, price: 8,
    col: 0xa9d4e8, blurb: "Thick, tough pike line. Very stretchy and easy for fish to spot." },
  { id: "fluoro4",     name: "Fluorocarbon 0.16 mm",   kind: "Fluorocarbon", lb: 4,  strength: .75, stretch: .25, vis: .07, feel: 1.05, biteOff: .11, ice: false, price: 12,
    col: 0xdbe9ef, blurb: "Near invisible and light. You pay for that in strength." },
  { id: "fluoro",      name: "Fluorocarbon 0.18 mm",   kind: "Fluorocarbon", lb: 6,  strength: 1,   stretch: .25, vis: .08, feel: 1.05, biteOff: .1,  ice: false, price: 15,
    col: 0xdbe9ef, blurb: "Nearly invisible under the ice. The line for shy char and whitefish." },
  { id: "fluoro10",    name: "Fluorocarbon 0.25 mm",   kind: "Fluorocarbon", lb: 10, strength: 1.2, stretch: .25, vis: .12, feel: 1.0, biteOff: .08, ice: false, price: 22,
    col: 0xdbe9ef, blurb: "Heavier fluoro for trout and big char. Still hard to see." },
  { id: "braid",       name: "Hi-vis braid 0.08 mm",   kind: "Braid",        lb: 15, strength: 1.6, stretch: 0,   vis: .6,  feel: 1.4, biteOff: .04, ice: true,  price: 23,
    col: 0xd8f03a, blurb: "Strong with zero stretch, so you feel every tap. Fish can see it, and it ices up in the guides." },
  { id: "braidfluoro", name: "Braid + fluoro leader",  kind: "Braid, fluoro leader", lb: 8, strength: 1.3, stretch: .08, vis: .15, feel: 1.3, biteOff: .08, ice: true, price: 28,
    col: 0xd8f03a, leader: 0xdbe9ef, blurb: "Braid for feel, with a metre of fluoro at the business end so the fish don't see it." },
  { id: "steel",       name: "Fluoro + steel leader",  kind: "Fluoro, steel leader", lb: 10, strength: 1.3, stretch: .2, vis: .7, feel: 1.0, biteOff: 0, ice: false, price: 20,
    col: 0xdbe9ef, leader: 0x3c4249, blurb: "A short steel trace that pike can't bite through. Shy fish want nothing to do with it." }
];
// how the line is drawn (radius from mm, see-through in air and water, cold memory coils, leaders)
const LOOK = {
  mono3:       { mm: .12, mem: 1,   air: .8,  water: .4 },
  mono:        { mm: .14, mem: 1,   air: .85, water: .45 },
  heavymono:   { mm: .30, mem: 1.3, air: .9,  water: .55 },
  fluoro4:     { mm: .16, mem: .4,  air: .55, water: .08 },
  fluoro:      { mm: .18, mem: .4,  air: .6,  water: .1 },
  fluoro10:    { mm: .25, mem: .5,  air: .65, water: .14 },
  braid:       { mm: .08, mem: 0,   air: 1,   water: .95, flat: true },
  braidfluoro: { mm: .08, mem: 0,   air: 1,   water: .95, flat: true, leadLen: 1.0, leadAir: .6, leadWater: .1 },
  steel:       { mm: .18, mem: .4,  air: .6,  water: .1, leadLen: .35, leadAir: 1, leadWater: 1, leadMm: .45 }
};
// AUGERS (the prototype's table). dia in cm (15 = 6", 20 = 8", 25 = 10"), rate = cm of ice per second, cap = holes per
// charge or tank, spook = seconds fish keep away after drilling, scare = share of nearby fish that bolt, walk = carry speed
const AUGERS = [
  { id: "hand", tier: 1, name: "Hand auger", power: "Your arms", dia: 15, rate: 7, start: "crank", spook: 0, scare: 0, cap: Infinity, walk: 1, price: 45,
    blurb: "Steel shaft, crank handle and two sharp blades. Slow and silent, and it never runs out." },
  { id: "drill", tier: 2, name: "Drill + auger kit", power: "18 V drill battery", dia: 15, rate: 13, start: "instant", spook: 3, scare: 0, cap: 6, walk: 1, price: 190,
    blurb: "A cordless drill clamped onto a light auger with a side brace. Quick and quiet, but the battery goes flat fast." },
  { id: "twostroke", tier: 2, name: "Old two-stroke", power: "Mixed petrol", dia: 20, rate: 21, start: "pull", startP: .3, spook: 25, scare: .45, cap: 12, walk: .85, price: 240,
    blurb: "Heavy, smoky and loud. Takes a few pulls on a cold morning, then chews through anything. Scares fish off for a while." },
  { id: "fourstroke", tier: 3, name: "Four-stroke", power: "Petrol", dia: 20, rate: 24, start: "pull", startP: .8, spook: 12, scare: .2, cap: 15, walk: .9, price: 520,
    blurb: "Modern gas powerhead. Starts in a pull or two, runs quieter, and there is no oil to mix." },
  { id: "lithium", tier: 3, name: "Lithium auger", power: "40 V battery", dia: 20, rate: 22, start: "instant", spook: 4, scare: .05, cap: 10, walk: .95, price: 650,
    blurb: "Squeeze the trigger and it goes. Nearly as fast as gas and quiet enough to fish straight away." },
  { id: "pro", tier: 4, name: "Pro lithium 10″", power: "60 V battery", dia: 25, rate: 28, start: "instant", spook: 5, scare: .05, cap: 14, walk: .92, price: 980,
    blurb: "Big battery, big blades. Cuts a 10-inch hole, wide enough to bring a trophy pike through." }
];
// BAITS (the prototype's table): what's on the hook. live = the consumable pack it uses (one per baiting),
// hard = the lure it needs (bought once, lost when the line parts). aff = how much each species wants it; size > 1
// favours bigger fish; scent draws fish without jigging; steal = chance a missed or spooked fish takes the bait;
// lively shifts the ideal jig rhythm.
const BAITS = [
  { id: "maggot", name: "Maggots", local: "larver", live: "maggots", hard: null, size: .8, scent: .5, steal: .35, lively: 0, glow: 0,
    aff: { perch: 1.5, trout: 1, char: 1.1, pike: .2, whitefish: 1.6, burbot: .6, grayling: 1.6 },
    blurb: "A few maggots on a small teardrop jig. Everything nibbles them, mostly the smaller fish.", style: "Small twitches" },
  { id: "mormyshka", name: "Mormyshka + bloodworm", local: "mormyshka", live: "bloodworm", hard: null, size: .75, scent: .3, steal: .25, lively: -.15, glow: 0,
    aff: { perch: 1.2, trout: .7, char: 1.4, pike: .1, whitefish: 1.8, burbot: .4, grayling: 1.4 },
    blurb: "A tiny tungsten jig tipped with bloodworm. Deadly on whitefish and char that won't touch anything bigger.", style: "Barely move it" },
  { id: "pimpel", name: "Pimpel spoon", local: "pimpel", live: null, hard: "pimpel", size: 1, scent: 0, steal: 0, lively: .1, glow: 0,
    aff: { perch: 1.2, trout: 1.4, char: 1.3, pike: .9, whitefish: .6, burbot: .4, grayling: .9 },
    blurb: "The classic Nordic jigging spoon. Flutters and flashes on the drop. No bait to lose.", style: "Lift and let it flutter" },
  { id: "balance", name: "Balance jig", local: "balansepilk", live: null, hard: "balance", size: 1.25, scent: 0, steal: 0, lively: .3, glow: 0,
    aff: { perch: 1.4, trout: 1.2, char: 1, pike: 1.4, whitefish: .3, burbot: .3, grayling: .5 },
    blurb: "A little hard-bodied fish that swims in circles when you rip it. Pulls the bigger perch and pike.", style: "Rip it hard" },
  { id: "herring", name: "Herring strip", local: "sildestrimmel", live: "herring", hard: null, size: 1.3, scent: 1, steal: .45, lively: -.3, glow: 0,
    aff: { perch: .5, trout: .8, char: .7, pike: 1.6, whitefish: .3, burbot: 1.9, grayling: .2 },
    blurb: "A strip of oily herring on a single hook. Smells for metres. Let it sit near the bottom for burbot and pike.", style: "Let it sit" },
  { id: "glow", name: "Glow jig + shrimp", local: "selvlysende pilk og reke", live: "shrimp", hard: "glowjig", size: 1.05, scent: .6, steal: .35, lively: 0, glow: 1,
    aff: { perch: .9, trout: .8, char: 1.5, pike: .5, whitefish: 1, burbot: 1.7, grayling: .6 },
    blurb: "Charge it on your headlamp and tip it with shrimp. Gets better the deeper and darker it is, and in polar night it's a lantern.", style: "Slow lifts" }
];
// LURES & BAIT as sold: live packs (count baits a pack) and hard lures (bought once, can be lost)
const LURES = [
  { id: "maggots",   kind: "live", name: "Maggots",        local: "larver",      count: 25, price: 4,  bait: "maggot",    blurb: "A tub of maggots. Twenty-five baitings. Keep them inside your jacket." },
  { id: "bloodworm", kind: "live", name: "Bloodworm",      local: "blodmark",    count: 20, price: 6,  bait: "mormyshka", blurb: "Twenty baitings of bloodworm. The tungsten mormyshka comes in the box." },
  { id: "shrimp",    kind: "live", name: "Shrimp",         local: "reker",       count: 15, price: 7,  bait: "glow",      blurb: "Fifteen peeled shrimp to tip the glow jig. Needs the glow jig." },
  { id: "herring",   kind: "live", name: "Herring strips", local: "sildestrimmel", count: 10, price: 5, bait: "herring",  blurb: "Ten oily strips, cut this morning on the quay." },
  { id: "pimpel",    kind: "hard", name: "Pimpel spoon",   local: "pimpel",      price: 12, bait: "pimpel",  blurb: "Brass and nickel, a red bead on the hook. Lost if the line parts." },
  { id: "balance",   kind: "hard", name: "Balance jig",    local: "balansepilk", price: 18, bait: "balance", blurb: "Perch pattern, treble on the belly. Lost if the line parts." },
  { id: "glowjig",   kind: "hard", name: "Glow jig",       local: "selvlysende pilk", price: 22, bait: "glow", blurb: "Phosphorescent paint. Tip it with shrimp. Lost if the line parts." }
];
const SHY = { char: .9, whitefish: 1, grayling: .8, trout: .8, perch: .4, pike: .2, burbot: .2 };
const byId = (a, id) => a.find(x => x.id === id);
const GEAR = { rods: RODS, reels: REELS, lines: LINES, augers: AUGERS, lures: LURES };
const CAT_OF = { rod: RODS, reel: REELS, line: LINES, auger: AUGERS };
const inch = cm => Math.round(cm / 2.5) + "″";
const fitKg = cm => cm <= 15 ? 2.5 : cm <= 20 ? 5.5 : 99;
const $$ = v => "$" + Math.round(v).toLocaleString("en-US");

// O6 Marketplace hook: a used listing for a rod, reel or auger with a condition (0..1). Condition shaves the price and
// the gear's edge (perf: 0.7 at 0% → 1.0 at 100% of the way from stock to rated), and gives a worn look for models.
function used(cat, id, cond = 0.6) {
  const t = GEAR[cat] || CAT_OF[cat]; const g = t && byId(t, id); if (!g) return null;
  const c = clamp(cond, 0, 1);
  return { cat, id, name: g.name, condition: Math.round(c * 100), price: Math.max(1, Math.round(g.price * (0.25 + 0.45 * c))), newPrice: g.price,
    perf: +(0.7 + 0.3 * c).toFixed(2), look: { scuff: +(1 - c).toFixed(2), rust: +clamp(0.8 - c, 0, 0.8).toFixed(2), tint: lerp(0.62, 1, c) } };
}
// a stat with wear: condition 1 is the rated stat; condition 0 keeps 70% of the way from stock to rated
const eff = (rated, stock, c = 1) => lerp(stock, rated, 0.7 + 0.3 * clamp(c, 0, 1));

/* =================================================================================================================
   SAVE DATA (GS.fish, saved as `fish`)
   ================================================================================================================= */
function fresh() {
  return { v: 1, intro: false,
    own: { rod: { short: { c: 1 } }, reel: { plastic: { c: 1 } }, line: { mono: 1 }, auger: { hand: { c: 1 } } },
    lures: {}, packs: { maggots: 25 },
    kit: { rod: "short", reel: "plastic", line: "mono", auger: "hand", bait: "maggot" },
    cooler: [], log: { n: 0, kg: 0, kept: 0, best: {}, bestDayKg: 0, bestDayCash: 0, sold: 0 },
    orders: { posted: [], taken: [], day: -1, seq: 0 } };
}
function normalize(d) {
  const f = fresh();
  if (!d || typeof d !== "object") return f;
  const o = Object.assign(f, d);
  for (const k of ["rod", "reel", "line", "auger"]) o.own[k] = Object.assign({}, f.own[k], (d.own || {})[k] || {});
  o.kit = Object.assign(fresh().kit, d.kit || {});
  for (const k of ["rod", "reel", "line", "auger"]) if (!o.own[k][o.kit[k]]) o.kit[k] = Object.keys(o.own[k])[0];
  if (!byId(BAITS, o.kit.bait)) o.kit.bait = "maggot";
  o.lures = Object.assign({}, d.lures || {}); o.packs = Object.assign({}, d.packs || {});
  o.cooler = Array.isArray(d.cooler) ? d.cooler.filter(c => c && SPECIES[c.sp] && c.kg > 0) : [];
  o.log = Object.assign(fresh().log, d.log || {}); o.log.best = Object.assign({}, (d.log || {}).best || {});
  o.orders = Object.assign(fresh().orders, d.orders || {});
  o.orders.posted = (o.orders.posted || []).filter(x => x && x.site); o.orders.taken = (o.orders.taken || []).filter(x => x && x.site);
  return o;
}

/* =================================================================================================================
   HOST (tracklayer.js hands this over at boot) and the lakes
   ================================================================================================================= */
let H = null, D = null, T = null;        // host bridge, GS.fish, THREE
const LK = [];                           // the fishable lakes
const LAKE_NAMES = { char: "Røyevatnet", perch: "Abborvatnet", pike: "Gjeddevatnet", whitefish: "Sikvatnet", grayling: "Harrvatnet", trout: "Ørretvatnet", burbot: "Lakevatnet" };
const LAKE_OTHER = ["Langvatnet", "Storvatnet", "Mørkvatnet", "Steinvatnet", "Litlevatnet", "Fiskevatnet", "Sandvatnet", "Kjølvatnet", "Bjørnvatnet", "Svartvatnet", "Fjellvatnet", "Rypevatnet", "Skarvvatnet", "Tverrvatnet", "Lavvovatnet", "Gåsvatnet"];
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function initLakes() {
  LK.length = 0; const used = new Set();
  H.LAKES.forEach((L, i) => {
    if (!L.ok) return;
    const r = mulberry32(9100 + i * 131), elevK = clamp((L.lv - 60) / 300, 0, 1), south = L.z > 300, big = L.r > 230;
    const maxD = Math.round((6 + (L.r - 150) / 180 * 9 + r() * 7 + elevK * 3) * 10) / 10, deep = maxD > 13;
    const lake = { i, x: L.x, z: L.z, r: L.r, lv: L.lv, maxD, elevK, seed: i * 37.7 + 11, clear: +(0.7 + r() * 0.4 + elevK * 0.2).toFixed(2), mix: {} };
    // which of the seven live here: char and burbot in deep cold water, whitefish in the big lakes, pike and perch in the
    // lower, sheltered south; trout nearly everywhere; grayling where a stream runs in
    const w = {
      char: deep ? 1 : 0.15 + elevK * 0.5, whitefish: big ? 0.95 : 0.3, trout: 0.85, burbot: deep ? 0.7 : 0.2,
      perch: (1 - elevK) * 0.9 + (south ? 0.35 : 0), pike: (1 - elevK) * (south ? 0.95 : 0.35) * (maxD < 12 ? 1 : 0.6), grayling: 0.3 + r() * 0.35
    };
    let picked = SPECIES_ORDER.filter(k => r() < w[k]);
    const byW = SPECIES_ORDER.slice().sort((a, b) => w[b] - w[a]);
    for (const k of byW) if (picked.length < 3 && !picked.includes(k)) picked.push(k);
    while (picked.length > 5) { picked.sort((a, b) => w[a] - w[b]); picked.shift(); }
    for (const k of picked) lake.mix[k] = +(0.6 + w[k] * 0.9 + r() * 0.3).toFixed(2);
    // the name: after whichever fish rules it, if that name's free
    const dom = picked.slice().sort((a, b) => lake.mix[b] * SPECIES[b].w - lake.mix[a] * SPECIES[a].w)[0];
    let nm = LAKE_NAMES[dom]; if (used.has(nm)) nm = LAKE_OTHER.find(n => !used.has(n)) || "Vatnet " + (i + 1);
    used.add(nm); lake.name = nm; lake.dom = dom;
    LK.push(lake);
  });
}
function lakeAt(x, z) {
  if (H.bioAt(x, z) !== 1 || (H.isWater && H.isWater(x, z))) return null;   // open water in the melt isn't ice
  let best = null, bd = 1e9;
  for (const L of LK) { const d = Math.hypot(x - L.x, z - L.z); if (d < L.r * 1.75 && d < bd) { bd = d; best = L; } }
  return best;
}
// the nearest bit of lake ice within R of (x, z): {lake, x, z, d}
function lakeNear(x, z, R = 40) {
  const here = lakeAt(x, z); if (here) return { lake: here, x, z, d: 0 };
  for (let r = 6; r <= R; r += 6) for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r, L = lakeAt(px, pz);
    if (L) return { lake: L, x: px, z: pz, d: r };
  }
  return null;
}
// chart depth: shallow at the shore, falling away to the lake's deepest water with lumps and holes on the bottom
function depthAt(x, z, L) {
  if (!L) return 0.5;
  const dd = Math.hypot(x - L.x, z - L.z), t = dd / (L.r * (0.76 + 0.48 * H.fbm(x / 170 + L.x, z / 170, 3)));
  const e = clamp((0.97 - t) / 0.97, 0, 1);
  const n1 = H.fbm(x / 48 + L.seed, z / 48 - L.seed, 3), n2 = H.fbm(x / 19 - L.seed, z / 19 + 3, 2);
  return 0.5 + L.maxD * clamp(sstep(0, 0.8, e) * (0.72 + 0.5 * n1) + (n2 - 0.5) * 0.18 * e, 0.02, 1);
}
// ICE THICKNESS through the season: ~22 cm on 1 November, ~80 cm by late March (a bit more on the high lakes), then
// thinning from mid-April through the spring melt. Under 12 cm the lake is off limits.
// O7 hook: set TLFish.ice.melt = (lake, date, cm) => cm'  to drive it from the real melt; whatever it returns is used.
const ICE = {
  melt: null, minCm: 12,
  cm(L) {
    const c = H.CAL.now(), sy = c.m >= 10 ? c.y : c.y - 1;
    if (c.m >= 5 && c.m <= 9) return 0;
    const d = (Date.UTC(c.y, c.m, c.d) - Date.UTC(sy, 10, 1)) / 864e5;
    let cm = 22 + 60 * (1 - Math.exp(-d / 55));
    if (d > 160) cm -= (d - 160) * 1.25;                              // ~10 April on: soft, then rotten by late May
    cm *= L ? 0.88 + 0.24 * L.elevK : 1;
    cm = Math.round(Math.max(0, cm));
    if (typeof ICE.melt === "function") { try { const o = ICE.melt(L, c, cm); if (typeof o === "number" && isFinite(o)) cm = o; } catch (e) { console.error(e); } }
    return cm;
  }
};

/* =================================================================================================================
   THE SESSION: state, and the graphics built when you step off and thrown away when you pack up
   ================================================================================================================= */
const S = { on: false, mode: "off", keys: { down: false, up: false, act: false }, joy: { x: 0, y: 0 }, fish: [], hole: null, fight: null,
  L: 0, kick: 0, act: 0, drill: 0, drillAt: null, left: Infinity, running: false, baitOn: true, spookT: 0, cueT: 0, sess: null, panel: null, prevMode: null,
  kb: { down: false, up: false, act: false }, tk: { down: false, up: false, act: false }, pd: { down: false, up: false, act: false } };
const W = { x: 0, z: 0, yaw: 0, phase: 0, speed: 0 };                 // the walker (the rider on foot, out on the ice)
const cam = { H: 0, yaw: 0, pitch: .32, dist: 6.2, tx: 0, ty: 1.4, tz: 0, userYaw: 0, zoom: 1, pitchAdj: 0 };
let holes = [], G = null, lake = null, ROOTY = 0, sledAt = { x: 0, z: 0 };
const listeners = { catch: [], exit: [] };
function emitEv(ev, data) { for (const f of listeners[ev] || []) { try { f(data); } catch (e) { console.error(e); } } }
const kitRod = () => byId(RODS, D.kit.rod) || RODS[0], kitReel = () => byId(REELS, D.kit.reel) || REELS[0];
const kitLine = () => byId(LINES, D.kit.line) || LINES[1], kitAug = () => byId(AUGERS, D.kit.auger) || AUGERS[0], kitBait = () => byId(BAITS, D.kit.bait) || BAITS[0];
const condOf = (cat, id) => { const o = D.own[cat] && D.own[cat][id]; return o && typeof o === "object" ? (o.c === undefined ? 1 : o.c) : 1; };
const LOWQ = () => H.GFX.low;
const ROPE_N = () => LOWQ() ? 60 : 90, ROPE_IT = () => LOWQ() ? 10 : 14;
// is this bait ready to fish: the lure owned (if it needs one) and a bait left in the pack (if it uses one)
const baitReady = b => (!b.hard || D.lures[b.hard] > 0) && (!b.live || (D.packs[b.live] || 0) > 0);
const baitWhy = b => b.hard && !(D.lures[b.hard] > 0) ? `No ${byId(LURES, b.hard).name.toLowerCase()}` : b.live && !((D.packs[b.live] || 0) > 0) ? `Out of ${byId(LURES, b.live).name.toLowerCase()}` : "";

// shared look for the under-ice pass: every material there only draws where the window stencil is set
function U(m) { m.stencilWrite = true; m.stencilRef = 1; m.stencilFunc = T.EqualStencilFunc; m.stencilFail = m.stencilZFail = m.stencilZPass = T.KeepStencilOp; return m; }
const LM = c => new T.MeshLambertMaterial({ color: c });

function build() {
  const low = LOWQ();
  G = { low, shared: new Set(Object.values(H.mats)) };
  // four roots at the same height: the main scene (rider, rod, auger, berms), the window mask, the under-ice view, the line
  G.main = new T.Group(); G.main.position.y = ROOTY; H.scene.add(G.main);
  G.maskS = new T.Scene(); G.mask = new T.Group(); G.mask.position.y = ROOTY; G.maskS.add(G.mask);
  G.underS = new T.Scene(); G.under = new T.Group(); G.under.position.y = ROOTY; G.underS.add(G.under);
  G.underS.fog = new T.Fog(0x0a2a33, 2.5, 26);                  // under the ice you only see a few metres
  G.overS = new T.Scene(); G.over = new T.Group(); G.over.position.y = ROOTY; G.overS.add(G.over);
  G.uHemi = new T.HemisphereLight(0x9fc4d6, 0x0b1c22, .6); G.underS.add(G.uHemi);
  G.uSun = new T.DirectionalLight(0xffffff, .5); G.underS.add(G.uSun, G.uSun.target);
  G.uLamp = new T.PointLight(0xfff0d0, 0, 9, 1.6); G.under.add(G.uLamp);        // the headlamp, shining down the hole in the dark
  G.lureLight = new T.PointLight(0xffd090, 0, 7, 1.6); G.under.add(G.lureLight);
  // deep water: anything that misses the bed patch ends in dark blue-green
  { const m = new T.Mesh(new T.CircleGeometry(90, 24), U(new T.MeshBasicMaterial({ color: 0x06171c }))); m.rotation.x = -Math.PI / 2; m.position.set(W.x, -12, W.z); G.under.add(m); G.abyss = m; }

  // ---- the rider: jointed (hips → thigh → knee → shin, an upper-body pivot, a head), in your own kit colours ----
  const M = H.mats;
  const rider = new T.Group(), body = new T.Group(); rider.add(body);
  const mkSeg = (parent, w, h, d, mat, px, py, pz) => { const pv = new T.Group(); pv.position.set(px, py, pz || 0); const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.y = -h / 2; m.castShadow = true; pv.add(m); parent.add(pv); return pv; };
  const thighL = mkSeg(body, .21, .46, .24, M.pants, -.12, .9), thighR = mkSeg(body, .21, .46, .24, M.pants, .12, .9);
  const kneeL = mkSeg(thighL, .19, .44, .21, M.pants, 0, -.46), kneeR = mkSeg(thighR, .19, .44, .21, M.pants, 0, -.46);
  for (const k of [kneeL, kneeR]) { const b = new T.Mesh(new T.BoxGeometry(.22, .14, .34), M.boot); b.position.set(0, -.4, .06); b.castShadow = true; k.add(b); }
  const upper = new T.Group(); upper.position.y = .9; body.add(upper);
  const torso = new T.Mesh(new T.BoxGeometry(.52, .66, .34), M.jacket); torso.position.y = .34; torso.castShadow = true; upper.add(torso);
  const stripe = new T.Mesh(new T.BoxGeometry(.53, .08, .35), M.trim); stripe.position.y = .42; upper.add(stripe);
  const armL = mkSeg(upper, .15, .62, .15, M.jacket, -.34, .62), armR = mkSeg(upper, .15, .62, .15, M.jacket, .34, .62);
  const handL = new T.Mesh(new T.BoxGeometry(.13, .12, .13), M.glove), handR = handL.clone();
  handL.position.y = -.66; handR.position.y = -.66; armL.add(handL); armR.add(handR);
  const headG = new T.Group(); headG.position.y = .78; upper.add(headG);
  const head = new T.Mesh(new T.SphereGeometry(.2, 16, 12), M.helmet); head.position.y = .12; head.castShadow = true; headG.add(head);
  const visor = new T.Mesh(new T.BoxGeometry(.3, .1, .1), M.visor); visor.position.set(0, .13, .16); headG.add(visor);
  const lampM = new T.MeshBasicMaterial({ color: 0xfff3d6 }); const lamp = new T.Mesh(new T.SphereGeometry(.035, 8, 6), lampM); lamp.position.set(0, .27, .17); headG.add(lamp);
  const blob = new T.Mesh(new T.CircleGeometry(.45, 20), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .18, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = .035; rider.add(blob);
  G.main.add(rider);
  Object.assign(G, { rider, body, thighL, thighR, kneeL, kneeR, upper, armL, armR, handL, handR, headG, lamp });
  // the headlamp's pool of light on the ice: a soft additive decal, so no new light goes into the main scene (a new
  // light there would recompile every material in the world)
  { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(255,240,210,1)"); r.addColorStop(0.5, "rgba(255,236,200,.45)"); r.addColorStop(1, "rgba(255,236,200,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    const tex = new T.CanvasTexture(c); G.poolTex = tex;
    const m = new T.Mesh(new T.CircleGeometry(2.1, 24), new T.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.renderOrder = 7; G.main.add(m); G.pool = m; }
  // the ice bucket with a padded lid (what he sits on)
  const bucket = new T.Group();
  { const pail = new T.Mesh(new T.CylinderGeometry(.21, .18, .4, 18), LM(0xe8ecef)); pail.position.y = .2; pail.castShadow = true; bucket.add(pail);
    const lid = new T.Mesh(new T.CylinderGeometry(.23, .23, .06, 18), LM(0x2b3640)); lid.position.y = .43; bucket.add(lid);
    const hb = new T.Mesh(new T.TorusGeometry(.2, .01, 4, 16, Math.PI), LM(0x9aa3a8)); hb.position.y = .38; hb.rotation.y = Math.PI / 2; hb.rotation.z = -.9; bucket.add(hb); }
  bucket.visible = false; G.main.add(bucket); G.bucket = bucket;

  // ---- rod and line ----
  const lineMat = tubeShader(60), rodMat = tubeShader(30); rodMat.transparent = false; rodMat.depthWrite = true; rodMat.side = T.FrontSide;
  const RN = ROPE_N();
  G.lineTube = makeTube(RN + 8, low ? 4 : 5, lineMat); G.lineTube.renderOrder = 4; G.lineTube.visible = false; G.over.add(G.lineTube);
  G.rodTube = makeTube(RODP, 6, rodMat); G.rodTube.visible = false; G.main.add(G.rodTube);
  G.lineMat = lineMat; G.rodMat = rodMat;
  G.lineGeo = new T.BufferGeometry(); G.lineGeo.setAttribute("position", new T.Float32BufferAttribute(new Float32Array((RN + 8) * 3), 3));
  G.lineGeo.setAttribute("color", new T.Float32BufferAttribute(new Float32Array((RN + 8) * 3), 3));
  G.line1 = new T.Line(G.lineGeo, new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .35, depthWrite: false })); G.line1.frustumCulled = false; G.line1.visible = false; G.line1.renderOrder = 3; G.over.add(G.line1);
  const guideMat = LM(0xc9d0d6); G.guides = [];
  for (let i = 0; i < 4; i++) { const gm = new T.Mesh(new T.TorusGeometry(i === 3 ? .0045 : .007 - i * .001, .0012, 4, 10), guideMat); gm.visible = false; G.main.add(gm); G.guides.push(gm); }
  const reel = new T.Group();
  { const rb = new T.Mesh(new T.CylinderGeometry(.03, .03, .022, 16), LM(0x2a2f34)); rb.rotation.z = Math.PI / 2; reel.add(rb);
    const spool = new T.Group(); reel.add(spool); reel.userData.spool = spool;
    const sp = new T.Mesh(new T.CylinderGeometry(.024, .024, .024, 16), LM(0xb8c2c8)); sp.rotation.z = Math.PI / 2; spool.add(sp);
    const handle = new T.Mesh(new T.BoxGeometry(.004, .03, .006), LM(0x15191c)); handle.position.set(.016, .018, 0); spool.add(handle);
    const knob = new T.Mesh(new T.CylinderGeometry(.006, .006, .014, 8), LM(0x15191c)); knob.rotation.z = Math.PI / 2; knob.position.set(.024, .032, 0); spool.add(knob);
    const foot = new T.Mesh(new T.BoxGeometry(.008, .03, .012), LM(0x2a2f34)); foot.position.y = .028; reel.add(foot); }
  reel.visible = false; G.main.add(reel); G.reel = reel;
  if (H.wear) H.wear(reel, Math.min(.7, (1 - condOf("reel", D.kit.reel)) * 1.25), 11, { decals: false, dents: false });   // a used reel looks it (O6)
  G.cork = new T.Mesh(new T.CylinderGeometry(.011, .012, .16, 10), LM(0xb88a5a)); G.cork.visible = false; G.main.add(G.cork);
  G.ripples = [];
  for (let i = 0; i < 3; i++) { const r = new T.Mesh(new T.RingGeometry(.9, 1, 24), U(new T.MeshBasicMaterial({ color: 0xdcecf2, transparent: true, opacity: 0, depthWrite: false, fog: false }))); r.rotation.x = -Math.PI / 2; r.renderOrder = 9; G.under.add(r); G.ripples.push({ m: r, t: i / 3 }); }
  G.RP = new Float32Array(RN * 3); G.RO = new Float32Array(RN * 3); G.ropeLive = false; G.ropeHole = null; G.prevTot = 0; G.spoolA = 0;
  G.lure = new T.Group(); G.lure.visible = false; G.lure.scale.setScalar(1.7); G.under.add(G.lure);
  G.bait = new T.Group();
  buildLure();
  // ---- chips off the auger, smoke off the gas ones ----
  const CH = 120; G.chipPos = new Float32Array(CH * 3); G.chipVel = new Float32Array(CH * 3); G.chipLife = new Float32Array(CH); G.chipI = 0; G.CH = CH;
  G.chipGeo = new T.BufferGeometry(); G.chipGeo.setAttribute("position", new T.BufferAttribute(G.chipPos, 3));
  G.chips = new T.Points(G.chipGeo, new T.PointsMaterial({ color: 0xf4fbff, size: .06 })); G.chips.frustumCulled = false; G.main.add(G.chips);
  const SM = 60; G.smkPos = new Float32Array(SM * 3); G.smkLife = new Float32Array(SM); G.smkI = 0; G.SM = SM;
  G.smkGeo = new T.BufferGeometry(); G.smkGeo.setAttribute("position", new T.BufferAttribute(G.smkPos, 3));
  G.smoke = new T.Points(G.smkGeo, new T.PointsMaterial({ color: 0x9aa0a6, size: .16, transparent: true, opacity: .45, depthWrite: false })); G.smoke.frustumCulled = false; G.main.add(G.smoke);
  for (let k = 0; k < CH; k++) G.chipPos[k * 3 + 1] = -50; for (let k = 0; k < SM; k++) G.smkPos[k * 3 + 1] = -50;
  // ---- fish ----
  G.fishGroup = new T.Group(); G.under.add(G.fishGroup); G.fishGeo = {};
  G.augerDrill = null; G.augerCarry = null;
  equip(D.kit.auger, true);
}
// tear down everything build() and the holes made (host materials are shared and stay)
function teardown() {
  if (!G) return;
  const seen = new Set();
  const kill = root => root && root.traverse(o => {
    if (o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); }
    const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of ms) if (!G.shared.has(m) && !seen.has(m)) { seen.add(m); if (m.map && m.map !== G.poolTex) m.map.dispose(); m.dispose(); }
  });
  for (const k of ["main", "mask", "under", "over"]) kill(G[k]);
  for (const g of Object.values(G.fishGeo)) for (const x of Object.values(g)) if (x.dispose && !seen.has(x)) x.dispose();
  if (G.poolTex) G.poolTex.dispose();
  H.scene.remove(G.main);
  G = null; holes = []; S.fish = [];
}

/* ---- the line as a lit tube (diffuse, a specular glint and a rim highlight, tinted under the water line) ---- */
const RODP = 14;
function makeTube(maxPts, radial, mat) {
  const g = new T.BufferGeometry(), nV = maxPts * radial;
  g.setAttribute("position", new T.BufferAttribute(new Float32Array(nV * 3), 3));
  g.setAttribute("normal", new T.BufferAttribute(new Float32Array(nV * 3), 3));
  g.setAttribute("lcol", new T.BufferAttribute(new Float32Array(nV * 3), 3));
  g.setAttribute("lalpha", new T.BufferAttribute(new Float32Array(nV), 1));
  const idx = [];
  for (let i = 0; i < maxPts - 1; i++) for (let j = 0; j < radial; j++) { const a = i * radial + j, b = i * radial + (j + 1) % radial, c = a + radial, d = b + radial; idx.push(a, c, b, b, c, d); }
  g.setIndex(idx);
  const mesh = new T.Mesh(g, mat); mesh.frustumCulled = false;
  const t = new T.Vector3(), n = new T.Vector3(1, 0, 0), b = new T.Vector3(), tmp = new T.Vector3();
  mesh.userData.update = (pts, rad, col) => {
    const P = g.attributes.position.array, N = g.attributes.normal.array, C = g.attributes.lcol.array, A = g.attributes.lalpha.array, cnt = Math.min(pts.length, maxPts);
    n.set(1, 0, 0);
    for (let i = 0; i < cnt; i++) {
      const a = pts[Math.max(0, i - 1)], c = pts[Math.min(cnt - 1, i + 1)];
      t.subVectors(c, a); if (t.lengthSq() < 1e-12) t.set(0, 1, 0); t.normalize();
      n.addScaledVector(t, -n.dot(t)); if (n.lengthSq() < 1e-8) { n.set(0, 1, 0).cross(t); if (n.lengthSq() < 1e-8) n.set(1, 0, 0); } n.normalize();
      b.crossVectors(t, n);
      const r = rad(i), cc = col(i);
      for (let j = 0; j < radial; j++) {
        const ang = j / radial * Math.PI * 2, k = i * radial + j;
        tmp.copy(n).multiplyScalar(Math.cos(ang)).addScaledVector(b, Math.sin(ang));
        P[k * 3] = pts[i].x + tmp.x * r; P[k * 3 + 1] = pts[i].y + tmp.y * r; P[k * 3 + 2] = pts[i].z + tmp.z * r;
        N[k * 3] = tmp.x; N[k * 3 + 1] = tmp.y; N[k * 3 + 2] = tmp.z;
        C[k * 3] = cc[0]; C[k * 3 + 1] = cc[1]; C[k * 3 + 2] = cc[2]; A[k] = cc[3];
      }
    }
    g.setDrawRange(0, Math.max(0, cnt - 1) * radial * 6);
    for (const k of ["position", "normal", "lcol", "lalpha"]) g.attributes[k].needsUpdate = true;
  };
  return mesh;
}
function tubeShader(gloss) {
  return new T.ShaderMaterial({
    transparent: true, depthWrite: false, side: T.DoubleSide,
    uniforms: { uSun: { value: new T.Vector3(0, 1, 0) }, uDay: { value: 1 }, uWater: { value: 0 } },
    vertexShader: "attribute vec3 lcol;attribute float lalpha;varying vec3 vC;varying float vA;varying vec3 vN;varying vec3 vW;void main(){vC=lcol;vA=lalpha;vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}",
    fragmentShader: `uniform vec3 uSun;uniform float uDay,uWater;varying vec3 vC;varying float vA;varying vec3 vN;varying vec3 vW;
      void main(){vec3 n=normalize(vN),v=normalize(cameraPosition-vW),l=normalize(uSun);if(dot(n,v)<0.)n=-n;
        float dif=max(dot(n,l),0.)*.55+.5;vec3 h=normalize(l+v);float sp=pow(max(dot(n,h),0.),${gloss}.)*.8;
        float rimL=pow(1.-abs(dot(n,v)),3.)*.35;
        vec3 c=(vC*dif+sp+rimL)*uDay;
        float under=1.-smoothstep(uWater-.05,uWater,vW.y);c=mix(c,c*vec3(.4,.62,.68)+vec3(.0,.03,.04),under*.7);
        gl_FragColor=vec4(c,vA);}`
  });
}

/* ---- lure models (the edible part is hidden when it's been stolen) ---- */
function buildLure() {
  const lure = G.lure, bait = G.bait;
  for (const grp of [lure, bait]) while (grp.children.length) { const c = grp.children[0]; grp.remove(c); if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); }
  const B = c => U(new T.MeshBasicMaterial({ color: c, fog: false }));
  const add = (geo, col, x, y, z, sx, sy, sz, par) => { const m = new T.Mesh(geo, B(col)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); (par || lure).add(m); return m; };
  const sph = () => new T.SphereGeometry(.05, 10, 8), hook = new T.TorusGeometry(.025, .005, 4, 10, Math.PI * 1.3);
  const id = D.kit.bait;
  if (id === "maggot") { add(sph(), 0xd9b84a, 0, 0, 0, .55, .8, .55); for (let i = 0; i < 3; i++) add(sph(), 0xf4eedb, (i - 1) * .025, -.06 - (i % 2) * .01, 0, .22, .5, .22, bait).rotation.z = (i - 1) * .6; }
  else if (id === "mormyshka") { add(sph(), 0x7a1f1f, 0, 0, 0, .35, .45, .35); add(sph(), 0xb0182a, 0, -.05, 0, .12, .7, .12, bait); }
  else if (id === "pimpel") { add(sph(), 0xdfe5ea, 0, -.02, 0, .35, 1.6, .12); add(sph(), 0xff7a1a, 0, -.08, 0, .2, .25, .2); }
  else if (id === "balance") { add(sph(), 0x8fc23f, 0, -.02, 0, .35, .4, 1.2); add(sph(), 0xf2e04a, 0, -.04, 0, .3, .2, 1.0); add(new T.ConeGeometry(.03, .05, 4), 0xe85a1a, 0, -.02, -.07, 1, 1, .3).rotation.x = Math.PI / 2; }
  else if (id === "herring") { add(sph(), 0x9aa3a8, 0, 0, 0, .12, .2, .12); add(sph(), 0xe8eef3, 0, -.08, 0, .25, 1.4, .08, bait); add(sph(), 0x5d7f99, .008, -.06, 0, .12, 1.0, .06, bait); }
  else if (id === "glow") { add(sph(), 0x9dff7a, 0, 0, 0, .45, .7, .45); add(sph(), 0xf4b8a0, 0, -.07, 0, .2, .55, .2, bait); }
  lure.add(bait);
  const hk = new T.Mesh(hook, B(0x8a9096)); hk.position.y = -.07; hk.rotation.z = Math.PI * .85; lure.add(hk);
  G.lureLight.color.set(id === "glow" ? 0x9dff7a : 0xffd090);
}

/* ---- auger models: origin at the blade tip, +z faces the operator. userData.spin turns, userData.exhaust smokes ----
   wear (0..1, from a used listing's look.scuff) dulls the paint and rusts the steel: makeAuger(a, wear) */
function flighting(r, len) {
  const turns = 4.5, steps = 140, pos = [], idx = [], ri = .026;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, a = t * turns * Math.PI * 2, y = .07 + t * len * .82, c = Math.cos(a), sn = Math.sin(a);
    pos.push(c * ri, y, sn * ri, c * r, y - .015, sn * r);
    if (i < steps) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function makeAuger(a, wear = 0) {
  const tint = c => { const col = new T.Color(c); if (wear > 0) { const hsl = {}; col.getHSL(hsl); col.setHSL(hsl.h, hsl.s * (1 - wear * .6), hsl.l * (1 - wear * .3)); col.lerp(new T.Color(0x6b4a2e), wear * .25); } return col; };
  const L = c => new T.MeshLambertMaterial({ color: tint(c) });
  const steel = L(0xb9c0c6), bladeM = new T.MeshLambertMaterial({ color: tint(0xc3cad0), side: T.DoubleSide }), blackM = L(0x16191c), chrome = L(0xd8dde1);
  const box = (g, w, h, d, m, x, y, z) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  const cyl = (g, r1, r2, h, m, x, y, z, rx, rz) => { const o = new T.Mesh(new T.CylinderGeometry(r1, r2, h, 12), m); o.position.set(x, y, z); o.rotation.set(rx || 0, 0, rz || 0); g.add(o); return o; };
  const g = new T.Group(), spin = new T.Group(); g.add(spin);
  const r = a.dia * .018 * .85, len = a.id === "drill" ? .8 : .95;
  spin.add(new T.Mesh(flighting(r, len), bladeM));
  cyl(spin, .022, .022, len + .25, steel, 0, (len + .25) / 2, 0);
  box(spin, r * 1.6, .02, .06, chrome, 0, .03, 0).rotation.y = .3;
  cyl(spin, .012, .0, .07, chrome, 0, -.02, 0);
  const top = len + .25;
  if (a.id === "hand") {
    box(spin, .34, .035, .035, steel, .17, top, 0);
    cyl(spin, .018, .018, .22, steel, .34, top + .11, 0);
    cyl(spin, .03, .03, .14, L(0x7a4a26), .34, top + .2, 0);
    cyl(spin, .035, .035, .1, L(0x7a4a26), 0, top + .05, 0);
    box(spin, .5, .03, .03, steel, -.25, top - .25, 0);
    cyl(spin, .028, .028, .12, L(0x7a4a26), -.5, top - .25, 0, 0, Math.PI / 2);
  } else if (a.id === "drill") {
    const head = new T.Group(); head.position.y = top; g.add(head);
    box(head, .09, .1, .26, L(0x3f4a52), 0, .06, 0); box(head, .07, .16, .07, L(0x2d3439), 0, -.04, -.09);
    box(head, .1, .07, .12, L(0x1f7a6e), 0, -.14, -.09); cyl(head, .03, .03, .08, blackM, 0, -.01, .1);
    cyl(head, .016, .016, .7, steel, 0, .02, .04, 0, Math.PI / 2);
    cyl(head, .03, .03, .14, blackM, -.35, .02, .04, 0, Math.PI / 2); cyl(head, .03, .03, .14, blackM, .35, .02, .04, 0, Math.PI / 2);
  } else {
    const col = { twostroke: 0x9a3324, fourstroke: 0x2f5d3a, lithium: 0x3d4852, pro: 0x1a1d20 }[a.id] || 0x3d4852;
    const acc = { twostroke: 0xc9a54a, fourstroke: 0x15191c, lithium: 0x4a90b8, pro: 0xff7a1a }[a.id] || 0x4a90b8;
    const head = new T.Group(); head.position.y = top; g.add(head);
    const gas = a.start === "pull";
    box(head, .26, .2, .24, L(col), 0, .1, 0);
    if (gas) {
      for (let i = 0; i < 5; i++) box(head, .27, .012, .2, chrome, 0, .04 + i * .03, -.02);
      cyl(head, .07, .07, .16, L(acc), 0, .26, .02, Math.PI / 2); cyl(head, .025, .025, .08, chrome, .16, .1, -.05, 0, Math.PI / 2);
      box(head, .05, .03, .03, blackM, -.15, .14, .08);
    } else { box(head, .2, .12, .14, L(acc), 0, .26, -.02); box(head, .03, .04, .08, L(0xff7a1a), .05, .02, .14); }
    cyl(head, .018, .018, a.id === "pro" ? .82 : .72, chrome, 0, .12, .16, 0, Math.PI / 2);
    for (const sx of [-1, 1]) { cyl(head, .028, .028, .14, blackM, sx * (a.id === "pro" ? .38 : .33), .12, .16, 0, Math.PI / 2); cyl(head, .012, .012, .16, chrome, sx * .12, .08, .09, .6); }
    if (gas) { const ex = new T.Object3D(); ex.position.set(.21, .1, -.05); head.add(ex); g.userData.exhaust = ex; }
  }
  g.userData.spin = spin; g.rotation.order = "YXZ";
  return g;
}
function dropObj(o) { if (!o) return; o.parent && o.parent.remove(o); const seen = new Set(); o.traverse(c => { if (c.geometry && !seen.has(c.geometry)) { seen.add(c.geometry); c.geometry.dispose(); } if (c.material && !seen.has(c.material)) { seen.add(c.material); c.material.dispose(); } if (c.userData && c.userData.wear0) c.userData.wear0.dispose(); }); }
function equip(id, quiet) {
  if (!D.own.auger[id]) return;
  D.kit.auger = id; const a = kitAug(); S.left = a.cap; S.running = false;
  if (!G) return;
  dropObj(G.augerDrill); dropObj(G.augerCarry);
  const wear = 1 - condOf("auger", id);
  G.augerDrill = makeAuger(a, wear); G.augerCarry = makeAuger(a, wear); G.augerDrill.visible = false;
  if (H.wear && wear > 0) for (const o of [G.augerDrill, G.augerCarry]) H.wear(o, Math.min(.6, wear), 5, { maxDecals: 2, dents: false });   // chips and rust from Bytteboden (O6)
  G.main.add(G.augerDrill); G.main.add(G.augerCarry);
  if (!quiet) H.save();
}

/* ---- fish meshes ---- */
function triGeo(pts) { const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(pts, 3)); g.computeVertexNormals(); return g; }
function geoFor(key) {
  if (G.fishGeo[key]) return G.fishGeo[key];
  const sp = SPECIES[key], h = sp.slim;
  const b = new T.SphereGeometry(.5, 14, 10); b.scale(h * .55, h, .9);
  const c1 = new T.Color(sp.col), c2 = new T.Color(sp.belly), p = b.attributes.position, cols = [];
  for (let i = 0; i < p.count; i++) { const t = sstep(.1 * h, -.45 * h, p.getY(i)); const c = c1.clone().lerp(c2, t); cols.push(c.r, c.g, c.b); }
  b.setAttribute("color", new T.Float32BufferAttribute(cols, 3));
  const tail = triGeo([0, 0, 0, 0, h * .6, -.28, 0, -h * .6, -.28]);
  const fin = sp.sail ? triGeo([0, h * .4, .08, 0, h * 1.15, -.12, 0, h * .38, -.3]) : triGeo([0, h * .45, .05, 0, h * .78, -.08, 0, h * .4, -.22]);
  return (G.fishGeo[key] = { b, tail, fin });
}
function makeFishMesh(key) {
  const sp = SPECIES[key], Gm = geoFor(key);
  const mat = U(new T.MeshLambertMaterial({ vertexColors: true })), fm = U(new T.MeshLambertMaterial({ color: sp.col, side: T.DoubleSide }));
  const g = new T.Group(); g.add(new T.Mesh(Gm.b, mat));
  const tp = new T.Group(); tp.position.z = -.42; tp.add(new T.Mesh(Gm.tail, fm)); g.add(tp);
  g.add(new T.Mesh(Gm.fin, fm));
  g.userData = { mat, fm, tail: tp, col: new T.Color(sp.col) };
  return g;
}
function dropFish(f) { if (!f || !f.mesh) return; G && G.fishGroup.remove(f.mesh); f.mesh.userData.mat.dispose(); f.mesh.userData.fm.dispose(); f.mesh = null; }

/* ---- holes: a mask disc (window stencil), the clear-ice film, a snow berm round the scraped window, the icy wall,
   dark water, and one shared lake-bed patch under the lot ---- */
const WIN_VS = `varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const WIN_FN = `uniform vec4 uH;varying vec3 vW;
  float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hs(i),hs(i+vec2(1,0)),f.x),mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x),f.y);}`;
function maskMat(h) {
  return new T.ShaderMaterial({ uniforms: { uH: { value: h.u } }, vertexShader: WIN_VS, colorWrite: false, depthWrite: false, depthTest: true,
    stencilWrite: true, stencilRef: 1, stencilFunc: T.AlwaysStencilFunc, stencilZPass: T.ReplaceStencilOp, stencilFail: T.KeepStencilOp, stencilZFail: T.KeepStencilOp,
    fragmentShader: WIN_FN + `void main(){float d=distance(vW.xz,uH.xy);float win=uH.z*(1.-smoothstep(2.4,3.3,d));if(win<.02&&d>uH.w+.12)discard;gl_FragColor=vec4(0.);}` });
}
function filmMat(h) {
  return U(new T.ShaderMaterial({ uniforms: { uH: { value: h.u }, uDay: { value: 1 } }, vertexShader: WIN_VS, transparent: true, depthWrite: false, depthTest: false,
    fragmentShader: WIN_FN + `uniform float uDay;void main(){vec2 p=vW.xz;float d=distance(p,uH.xy);if(d<uH.w)discard;
      float win=uH.z*(1.-smoothstep(2.4,3.3,d));float rim=1.-smoothstep(uH.w,uH.w+.12,d);if(win<.02&&rim<.01)discard;
      float n=vn(p*1.3)*.6+vn(p*6.)*.4;vec3 snow=vec3(.9,.94,.99)*(.9+.1*n);vec3 clear=vec3(.4,.6,.7)+vec3(.12)*vn(p*3.);
      vec3 col=mix(snow,clear,win);col=mix(col,vec3(.55,.75,.85),rim);
      // fine cracks and trapped bubbles in the black ice
      float cr=smoothstep(.985,1.,vn(p*9.+vec2(3.1,7.)))*.25;col+=cr*win;
      float a=mix(1.,.2+.08*n,win);gl_FragColor=vec4(col*uDay,max(a,rim*.9));}` }));
}
function makeHole(d) {
  const a = kitAug();
  const h = { x: d.x, z: d.z, depth: d.depth, ice: d.ice, scrape: 0, dia: a.dia, r: a.dia * .018, lake: lake };
  h.iceT = clamp(d.ice / 100 * .42, .17, .36);
  h.u = new T.Vector4(h.x, h.z, 0, h.r);
  const disc = () => { const gg = new T.CircleGeometry(3.4, 40); gg.rotateX(-Math.PI / 2); return gg; };
  h.maskM = new T.Mesh(disc(), maskMat(h)); h.maskM.position.set(h.x, .05, h.z); h.maskM.renderOrder = 1; G.mask.add(h.maskM);
  h.film = new T.Mesh(disc(), filmMat(h)); h.film.position.set(h.x, .021, h.z); h.film.renderOrder = 20; G.under.add(h.film);
  const prof = [[2.7, 0], [2.95, .07], [3.25, .14], [3.55, .12], [3.85, .05], [4.1, 0]].map(([r, y]) => new T.Vector2(r, y));
  h.berm = new T.Mesh(new T.LatheGeometry(prof, 36), new T.MeshLambertMaterial({ color: 0xf3f7fc, side: T.DoubleSide })); h.berm.position.set(h.x, .015, h.z); h.berm.scale.y = .01; h.berm.receiveShadow = true; G.main.add(h.berm);
  const wall = new T.Mesh(new T.CylinderGeometry(h.r, h.r, h.iceT, 28, 1, true), U(new T.MeshLambertMaterial({ color: 0xbfe2ef, side: T.BackSide, transparent: true, opacity: .92 })));
  wall.position.set(h.x, .02 - h.iceT / 2, h.z); G.under.add(wall);
  const water = new T.Mesh(new T.CircleGeometry(h.r * .995, 28), U(new T.MeshBasicMaterial({ color: 0x123a46, transparent: true, opacity: .62, depthWrite: false, fog: false })));
  water.rotation.x = -Math.PI / 2; h.waterY = .02 - h.iceT * .12; water.position.set(h.x, h.waterY, h.z); water.renderOrder = 6; G.under.add(water);
  h.meshes = [h.maskM, h.film, h.berm, wall, water];
  ensureBed(h);
  return h;
}
function dropHole(h) { for (const m of h.meshes || []) dropObj(m); h.meshes = []; }
// one lake-bed patch, rebuilt when you drill far from the last one
function ensureBed(h) {
  if (G.bed && Math.hypot(h.x - G.bed.cx, h.z - G.bed.cz) < 18) return;
  if (G.bed) { dropObj(G.bed.m); dropObj(G.bed.w); G.bed = null; }
  const R = 30, seg = G.low ? 30 : 46;
  const g = new T.PlaneGeometry(R * 2, R * 2, seg, seg); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, cols = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + h.x, z = p.getZ(i) + h.z, d = depthAt(x, z, lake); p.setX(i, x); p.setZ(i, z); p.setY(i, -d * VS);
    const k = clamp(1 - d / 22, .32, 1), n = H.fbm(x / 3, z / 3, 2);
    cols.push((.2 * k + .02) * (0.85 + n * .3), (.26 * k + .05) * (0.85 + n * .3), .2 * k + .06);
  }
  g.setAttribute("color", new T.Float32BufferAttribute(cols, 3)); g.computeVertexNormals();
  const m = new T.Mesh(g, U(new T.MeshLambertMaterial({ vertexColors: true }))); G.under.add(m);
  // weeds in the shallows
  const wg = new T.ConeGeometry(.05, 1, 3); wg.translate(0, .5, 0);
  const N = G.low ? 300 : 700, weeds = new T.InstancedMesh(wg, U(new T.MeshLambertMaterial({ color: 0x3f5a2e })), N), Mx = new T.Matrix4(); let n = 0;
  for (let i = 0; i < N * 6 && n < N; i++) {
    const x = h.x + rnd(-R, R), z = h.z + rnd(-R, R), d = depthAt(x, z, lake);
    if (d > 6) continue;
    Mx.compose(new T.Vector3(x, -d * VS, z), new T.Quaternion().setFromEuler(new T.Euler(rnd(-.3, .3), 0, rnd(-.3, .3))), new T.Vector3(1, rnd(.4, 1.2), 1));
    weeds.setMatrixAt(n++, Mx);
  }
  weeds.count = n; G.under.add(weeds);
  G.bed = { m, w: weeds, cx: h.x, cz: h.z };
  G.abyss.position.set(h.x, -lake.maxD * VS - 1.5, h.z);
}
function syncHoles() { for (const h of holes) h.u.set(h.x, h.z, h.scrape, h.r); }

/* =================================================================================================================
   THE FISHING SIM (the prototype's, same tuning) with the shop gear, the lake's own fish and the calendar on top
   ================================================================================================================= */
const daylight = () => H.dayFactor();
// fish feed hardest around sunrise and sunset; in polar night they come on in the blue noon twilight; and they go on
// the feed ahead of a front
function todK() {
  const h = ((H.GS.hour % 24) + 24) % 24, st = H.CAL.sunTimes(); let k = 1;
  if (st.polar) k += .3 * Math.exp(-((h - 12) ** 2) / 6);
  else if (!st.midnight) k += .35 * Math.exp(-((h - st.up) ** 2) / 1.5) + .35 * Math.exp(-((h - st.down) ** 2) / 1.5);
  if (H.GS.warned && H.GS.stormPhase === "calm") k *= 1.2;
  return k;
}
function spawnFish(hole, anywhere) {
  const mix = (hole.lake || lake).mix;
  const pool = Object.entries(SPECIES).filter(([k, s]) => mix[k] && s.depth[0] < hole.depth - .3);
  if (!pool.length) return null;
  const wOf = ([k, s]) => s.w * mix[k];
  let tot = pool.reduce((a, p) => a + wOf(p), 0), r = Math.random() * tot, pk = pool[0];
  for (const p of pool) { r -= wOf(p); if (r <= 0) { pk = p; break; } }
  const [key, sp] = pk;
  const ang = rnd(0, Math.PI * 2), rr = anywhere ? rnd(1.5, 11) : 13;
  const x = Math.cos(ang) * rr, z = Math.sin(ang) * rr;
  const bot = depthAt(hole.x + x, hole.z + z, hole.lake);
  const td = sp.bottom ? bot - rnd(.2, .7) : clamp(rnd(sp.depth[0], sp.depth[1]), .9, bot - .35);
  const head = anywhere ? rnd(0, Math.PI * 2) : ang + Math.PI + rnd(-.6, .6), spd = rnd(.35, .85);
  const f = { key, sp, kg: +(sp.kg[0] + (sp.kg[1] - sp.kg[0]) * Math.pow(Math.random(), 2.3)).toFixed(2),
    x, z, d: td, td, vx: Math.cos(head) * spd, vz: Math.sin(head) * spd, st: "roam", t: 0, cd: rnd(0, 2), wig: rnd(0, 6) };
  f.mesh = makeFishMesh(key);
  f.mesh.scale.setScalar(Math.cbrt(f.kg * 1000 / sp.k) / 100 * 1.5);
  G.fishGroup.add(f.mesh);
  return f;
}
function clearFish() { for (const f of S.fish) dropFish(f); S.fish = []; }
function fwd() { return { x: Math.sin(W.yaw), z: Math.cos(W.yaw) }; }
const nearSled = () => Math.hypot(W.x - sledAt.x, W.z - sledAt.z) < 3.4;
// what E / Space does where you're standing
function context() {
  if (nearSled()) return { kind: "sled" };
  for (const h of holes) if (Math.hypot(W.x - h.x, W.z - h.z) < 1.7) return { kind: "hole", hole: h };
  const f = fwd(), hx = W.x + f.x * .9, hz = W.z + f.z * .9;
  const L = lakeAt(hx, hz);
  if (!L || [[3, 0], [-3, 0], [0, 3], [0, -3]].some(([a, b]) => !lakeAt(hx + a, hz + b))) return { kind: "land" };
  if (L !== lake) return { kind: "other" };
  for (const h of holes) if (Math.hypot(hx - h.x, hz - h.z) < 5) return { kind: "near" };
  const dep = depthAt(hx, hz, lake);
  if (H.iceThin && H.iceThin(hx, hz) > .3) return { kind: "rotten" };
  if (dep < 1.3) return { kind: "shallow", x: hx, z: hz, depth: dep };
  if (S.left <= 0) return { kind: "empty" };
  return { kind: "drill", x: hx, z: hz, depth: dep };
}
function actPress() {
  if (S.mode === "fish") { jig(); return; }
  if (S.mode === "drill") { pullCord(); return; }
  if (S.mode !== "walk") return;
  const c = context();
  if (c.kind === "sled") openGear();
  else if (c.kind === "hole") sitAt(c.hole, 0, 0);
  else if (c.kind === "drill") {
    S.mode = "drill"; S.drill = 0; S.running = kitAug().start !== "pull"; S.pulls = 0;
    S.drillAt = { x: c.x, z: c.z, depth: c.depth, ice: Math.max(ICE.minCm, Math.round(ICE.cm(lake) + rnd(-4, 4))) };
    syncUI(); pullCord();
  }
}
function pullCord() {
  const a = kitAug();
  if (a.start !== "pull" || S.running) return;
  S.pulls++; S.yank = .35;
  // cold engines get a little more willing with every pull; a worn one less so
  if (Math.random() < a.startP * lerp(.7, 1, condOf("auger", a.id)) + (S.pulls - 1) * .12) { S.running = true; cue(S.pulls === 1 ? "Started first pull" : `Started on pull ${S.pulls}`, "#e9eff3", false, 1.2); }
  else cue(`Pull ${S.pulls}… sputters`, "#93a6b4", false, .9);
}
function finishDrill() {
  const d = S.drillAt, a = kitAug();
  const h = makeHole(d);
  holes.push(h); if (holes.length > MAX_HOLES) dropHole(holes.shift());
  if (isFinite(S.left)) S.left--;
  syncHoles(); S.drillAt = null; S.running = false; G.augerDrill.visible = false;
  cue(`Through at ${d.ice} cm · ${inch(a.dia)} hole`, "#e9eff3", false, 1.6);
  sitAt(h, a.spook, a.scare);
}
function sitAt(h, spook, scare) {
  S.hole = h; S.mode = "fish"; S.L = 0; S.kick = 0; S.act = 0;
  const dx = h.x - W.x, dz = h.z - W.z, l = Math.hypot(dx, dz) || 1;
  W.yaw = Math.atan2(dx / l, dz / l); W.x = h.x - dx / l * 1.0; W.z = h.z - dz / l * 1.0;
  cam.H = W.yaw; cam.userYaw = 0;
  clearFish(); for (let i = 0; i < 9; i++) { const f = spawnFish(h, true); if (f) S.fish.push(f); }
  S.spookT = spook || 0;
  if (spook) for (const f of S.fish) { f.cd = spook * rnd(.6, 1.2); if (Math.random() < scare) flee(f); }
  if (spook >= 10) setTimeout(() => S.on && cue("That engine spooked them. Give it a minute.", "#ffc15a", false, 2), 1600);
  if (!S.baitOn) rebait(true);
  syncUI();
}
function stand() {
  if (S.mode !== "fish") return;
  clearFish(); S.mode = "walk"; S.hole = null; S.L = 0; syncUI();
}

function cue(text, col, big, t) { const c = $("ifCue"); if (!c) return; c.textContent = text; c.style.color = col; c.classList.toggle("small", !big); c.style.opacity = 1; S.cueT = t || 1.1; }
function flee(f) { f.st = "flee"; f.t = rnd(2, 3.5); const r = Math.hypot(f.x, f.z) || 1; const s = rnd(2.5, 3.5); f.vx = f.x / r * s; f.vz = f.z / r * s; f.td = clamp(f.d + rnd(-1, 1.5), .9, depthAt(S.hole.x + f.x, S.hole.z + f.z, S.hole.lake) - .3); }
function stealBait() {
  const B = kitBait();
  if (!S.baitOn || !B.steal || Math.random() > B.steal) return false;
  S.baitOn = false; cue("Bait stolen. Reel up to rebait.", "#ffc15a", false, 1.8); return true;
}
// put a fresh bait on: live baits come out of the pack; a hard lure has to still be on the line
function rebait(quiet) {
  const b = kitBait();
  if (b.hard && !(D.lures[b.hard] > 0)) { if (!S.warnBait) { S.warnBait = true; cue(`The ${byId(LURES, b.hard).name.toLowerCase()} is gone. Tackle box (B).`, "#ffc15a", false, 2); } return false; }
  if (b.live) {
    if ((D.packs[b.live] || 0) <= 0) { if (!S.warnBait) { S.warnBait = true; cue(`Out of ${byId(LURES, b.live).name.toLowerCase()}. Tackle box (B).`, "#ffc15a", false, 2); } return false; }
    D.packs[b.live]--;
  }
  S.baitOn = true; S.warnBait = false;
  if (!quiet) cue("Rebaited", "#e9eff3", false, 1);
  return true;
}
function jig() {
  if (S.mode !== "fish" || S.L < .3) return;
  const f = S.fish.find(f => f.st === "nibble" || f.st === "bite");
  if (f && f.st === "bite") return hook(f);
  if (f && f.st === "nibble") { if (Math.random() < .6) { flee(f); if (!stealBait()) cue("Too early. Spooked it.", "#93a6b4", false, 1.3); } else f.t = Math.max(f.t, .5); }
  S.kick = Math.min(.5, S.kick + .3); S.act = Math.min(1.6, S.act + .28);
}
function hook(f) {
  const LN = kitLine();
  if (Math.random() < LN.stretch * clamp(S.L / 12, 0, 1) * .6) { flee(f); if (!stealBait()) cue("Too much stretch down there. The hook never set.", "#93a6b4", false, 1.8); return; }
  f.st = "hooked"; S.fight = { f, tension: 30, over: 0, slack: 0, surge: 0, next: rnd(1.2, 2.8), stam: 1 }; S.mode = "fight"; cue("Fish on!", "#ff7a1a", true, 1); syncUI();
}
function simFish(dt) {
  const h = S.hole; if (!h) return;
  const bot0 = h.depth, rod = kitRod(), rc = condOf("rod", rod.id);
  if (S.mode === "fish") {
    if (!S.baitOn && S.L < .3) rebait();
    if (S.keys.down) S.L = Math.min(bot0 - .12, S.L + 2.4 * dt);
    if (S.keys.up) S.L = Math.max(0, S.L - 2.2 * dt * eff(kitReel().speed, 1, condOf("reel", D.kit.reel)));
    S.act = Math.max(0, S.act - .28 * dt); S.kick = Math.max(0, S.kick - 1.6 * dt);
  }
  const nibbling = S.fish.find(f => f.st === "nibble" || f.st === "bite");
  const B = kitBait(), LN = kitLine(), lureOk = !B.hard || D.lures[B.hard] > 0, tk = todK(), dl = daylight(), polar = H.CAL.isPolarNight();
  for (const f of S.fish) {
    f.wig += dt * (f.st === "hooked" ? 22 : f.st === "flee" ? 16 : 7);
    f.cd = Math.max(0, f.cd - dt);
    const r = Math.hypot(f.x, f.z), bot = depthAt(h.x + f.x, h.z + f.z, h.lake);
    if (f.st === "roam") {
      if (Math.random() < dt * .25) { const a = Math.atan2(f.vz, f.vx) + rnd(-.8, .8), s = Math.hypot(f.vx, f.vz); f.vx = Math.cos(a) * s; f.vz = Math.sin(a) * s; }
      if (r > 12) { f.vx -= f.x / r * dt * .6; f.vz -= f.z / r * dt * .6; }
      f.x += f.vx * dt; f.z += f.vz * dt;
      if (Math.random() < dt * .15) f.td = f.sp.bottom ? bot - rnd(.2, .7) : clamp(rnd(f.sp.depth[0], f.sp.depth[1]), .9, bot - .35);
      f.d += (f.td - f.d) * dt * .4; f.d = Math.min(f.d, bot - .25);
      if (S.mode === "fish" && S.L > .4 && f.cd <= 0 && lureOk) {
        const dv = Math.abs(f.d - S.L);
        if (dv < 2.6 && r < 9) {
          const on = S.baitOn || B.steal === 0;
          const ideal = f.sp.like + B.lively;
          const match = clamp(1 - Math.abs(S.act - ideal) / 1.1, 0, 1);
          const aff = (B.aff[f.key] || 1) * (on ? 1 : .25);
          const sizeK = Math.pow(clamp(f.kg / f.sp.kg[1] * 3, .3, 3), (B.size - 1) * 1.5);
          const glowK = B.glow ? 1 + clamp(S.L / 12, 0, 1) * .8 + (1 - dl) * .8 + (polar ? .4 : 0) : 1;
          const seen = 1 - clamp(LN.vis * (SHY[f.key] || .5) * h.lake.clear, 0, .95);   // braid shows up in a clear fell lake
          const p = ((S.act > .05 ? .55 * match : .04) + (on ? B.scent * .16 : 0)) * aff * sizeK * glowK * seen * tk * dt;
          if (S.act > ideal + .9 && Math.random() < .4 * dt) { flee(f); continue; }
          if (Math.random() < p) f.st = "approach";
        }
      }
    } else if (f.st === "approach") {
      const rr = r || 1, tx = f.x / rr * .22, tz = f.z / rr * .22, ty = S.L - S.kick + .05;
      const dx = tx - f.x, dz = tz - f.z, dy = ty - f.d, d = Math.hypot(dx, dy, dz) || 1;
      f.x += dx / d * 1.3 * dt; f.z += dz / d * 1.3 * dt; f.d += dy / d * 1.3 * dt;
      f.vx = dx; f.vz = dz;
      if (S.mode !== "fish" || S.L < .3) { f.st = "roam"; f.cd = 3; f.vx = rnd(-.6, .6); f.vz = rnd(-.6, .6); }
      else if (S.act < .02 && Math.random() < dt * .35 * (1 - (S.baitOn ? B.scent : 0) * .85)) { f.st = "roam"; f.cd = 2; f.vx = -dx * .3; f.vz = -dz * .3; }
      else if (d < .3 && !nibbling) {
        f.st = "nibble"; f.t = rnd(.8, 2.3);
        // a better rod shows you the nibble: a cheap one only sometimes, and the tip barely moves
        f.seen = rod.clear >= .85 || Math.random() < eff(.45 + .55 * rod.clear, .7, rc);
        if (f.seen) cue("nibble…", "#cfe6f2", false, .9);
      }
    } else if (f.st === "nibble" || f.st === "bite") {
      const rr = r || 1; f.x += (f.x / rr * .22 - f.x) * dt * 6; f.z += (f.z / rr * .22 - f.z) * dt * 6; f.d += (S.L - S.kick + .05 - f.d) * dt * 8;
      f.vx = -f.x; f.vz = -f.z;
      f.t -= dt;
      if (f.st === "nibble" && f.t <= 0) { f.st = "bite"; f.t = (f.sp.bottom ? .85 : .6) * LN.feel * eff(rod.win, 1, rc); cue("BITE!", "#ff7a1a", true, .7); }
      else if (f.st === "bite" && f.t <= 0) { flee(f); if (!stealBait()) cue("Missed. It spat the jig.", "#93a6b4", false, 1.4); }
    } else if (f.st === "flee") {
      f.x += f.vx * dt; f.z += f.vz * dt; f.d += (f.td - f.d) * dt;
      f.t -= dt; if (f.t <= 0) { f.st = "roam"; f.vx *= .25; f.vz *= .25; f.cd = 4; }
      if (r > 15) f.dead = true;
    }
  }
  S.fish = S.fish.filter(f => { if (f.dead) dropFish(f); return !f.dead; });
  if (S.fish.length < 9 && Math.random() < dt * .3) { const f = spawnFish(h, false); if (f) S.fish.push(f); }
  if (S.mode === "fight") fight(dt);
}
function fight(dt) {
  const F = S.fight, f = F.f, sp = f.sp, LN = kitLine(), reel = kitReel(), cr = condOf("reel", reel.id);
  const smooth = eff(reel.smooth, 0, cr), rspd = eff(reel.speed, 1, cr);
  if (F.ang === undefined) { F.ang = Math.atan2(f.z, f.x); F.dirS = Math.random() < .5 ? -1 : 1; }
  F.next -= dt; if (F.next <= 0) { F.surge = rnd(.7, 1.4); F.next = rnd(1.8, 3.6) + F.surge; F.dirS = Math.random() < .5 ? -F.dirS : F.dirS; F.ang += rnd(-1.4, 1.4); }
  F.surge = Math.max(0, F.surge - dt);
  // a smooth drag takes the spike out of a surge (up to 45% of it) and eases how hard tension snaps to the load
  const surgeK = F.surge > 0 ? 1 + (.75 - LN.stretch * .6) * (1 - .45 * smooth) : 1;
  const pull = sp.str * (.55 + .45 * Math.sqrt(f.kg)) * surgeK * (.35 + .65 * F.stam);
  const target = (S.keys.up ? 22 + pull * 48 : pull * 16) / LN.strength;
  F.tension += (target - F.tension) * Math.min(1, dt * 3.2 * (1 - LN.stretch * .5) * (1 - .2 * smooth));
  const bot = S.hole.depth - .15;
  if (S.keys.up) S.L = Math.max(0, S.L - (1.25 - Math.min(.9, pull * .45)) * (LN.ice ? .85 : 1) * rspd * dt);
  else S.L = Math.min(bot, S.L + pull * .55 * dt);
  if (F.tension > 40) F.stam = Math.max(0, F.stam - .07 * dt * (F.tension / 60));
  F.ang += dt * F.dirS * (F.surge > 0 ? 1.5 : .45) * (.5 + F.stam * .5);
  const R = clamp(S.L * .5, 0, 2.8) * (F.surge > 0 ? 1.2 : .75) * (.4 + .6 * F.stam);
  const tx = Math.cos(F.ang) * R, tz = Math.sin(F.ang) * R, k = Math.min(1, dt * (F.surge > 0 ? 3 : 1.8));
  const px = f.x, pz = f.z;
  f.x += (tx - f.x) * k; f.z += (tz - f.z) * k; f.d = S.L;
  const or = Math.hypot(f.x, f.z) || 1;
  f.vx = (f.x - px) / Math.max(dt, 1e-3) + f.x / or * .4; f.vz = (f.z - pz) / Math.max(dt, 1e-3) + f.z / or * .4;
  F.sx = f.x - px; F.sz = f.z - pz;
  if (F.tension >= 100) F.over += dt; else F.over = Math.max(0, F.over - dt * 2);
  if (F.tension < 8) F.slack += dt; else F.slack = 0;
  if (F.over > .35 + .25 * smooth) return lose(`Snap. The ${LN.kind.split(",")[0].toLowerCase()} parted.`, true);
  if (f.key === "pike" && Math.random() < LN.biteOff * dt * (F.surge > 0 ? 2 : 1)) return lose("The pike bit clean through the line.", true);
  if (F.slack > 2.6) return lose("Slack line. It threw the hook.");
  if (S.L <= .15) land();
}
// lost the fish. If the line went, so did whatever was on the end of it
function lose(msg, parted) {
  const f = S.fight.f; flee(f); S.fight = null; S.mode = "fish"; S.L = Math.max(S.L, .5); S.act = 0;
  if (parted) {
    const b = kitBait(); S.baitOn = false;
    if (b.hard && D.lures[b.hard] > 0) { D.lures[b.hard] = 0; msg += ` Your ${byId(LURES, b.hard).name.toLowerCase()} went with it.`; }
    S.L = 0; S.warnBait = false; H.save();
  }
  cue(msg, "#ff5a4f", false, parted ? 2.6 : 1.8); syncUI();
}
function land() {
  const f = S.fight.f;
  if (f.kg > fitKg(S.hole.dia) && !S.fight.squeezed) {
    if (Math.random() < .55) return lose(`Too big for a ${inch(S.hole.dia)} hole. It shook off at the ice.`);
    S.fight.squeezed = true; cue("Squeezed it through the hole!", "#ffc15a", false, 1.4);
  }
  S.fight = null;
  dropFish(f); S.fish = S.fish.filter(x => x !== f);
  const cm = Math.round(Math.cbrt(f.kg * 1000 / f.sp.k)), v = baseValue(f.key, f.kg);
  S.landed = { species: f.key, name: f.sp.name, local: f.sp.local, kg: f.kg, cm, value: v };
  // the logbook counts every fish landed, kept or not
  const lg = D.log; lg.n++; lg.kg = +(lg.kg + f.kg).toFixed(2); S.sess.landed++; S.sess.kg += f.kg;
  const pb = !lg.best[f.key] || f.kg > lg.best[f.key].kg;
  if (pb) lg.best[f.key] = { kg: f.kg, cm, lake: lake.name, at: H.CAL.now().label };
  S.landed.pb = pb;
  lg.bestDayKg = Math.max(lg.bestDayKg || 0, +S.sess.kg.toFixed(2));
  S.baitOn = kitBait().live ? false : S.baitOn;       // a live bait's chewed to bits: you rebait at the hole
  S.mode = "caught"; S.L = 0; syncUI(); showCatch(); H.save();
}
const baseValue = (sp, kg) => Math.max(1, Math.round(kg * SPECIES[sp].price));
// freshness: full value for two days in the cooler, then it slides to a third over the next two, a quarter after that
const NOWH = () => H.CAL.abs();                                   // calendar hours, so the summer skip ages the catch too
const freshK = c => { const age = NOWH() - c.t; return age < 48 ? 1 : age < 96 ? lerp(1, .35, (age - 48) / 48) : .25; };
const fishValue = c => Math.max(1, Math.round(c.v * freshK(c)));
const freshWord = c => { const age = NOWH() - c.t; return age < 12 ? "caught today" : age < 36 ? "a day in the cooler" : age < 48 ? "two days old, sell it soon" : age < 96 ? "going off" : "fit for the fish-meal plant"; };

function showCatch() {
  const c = S.landed, sp = SPECIES[c.species];
  $("ifCName").innerHTML = esc(c.name) + (c.pb ? '<span class="ifpb">Best</span>' : "");
  $("ifCLocal").textContent = c.local;
  $("ifCKg").textContent = c.kg.toFixed(2) + " kg"; $("ifCCm").textContent = c.cm + " cm"; $("ifCVal").textContent = $$(c.value);
  const full = D.cooler.length >= COOLER_MAX; $("ifKeep").disabled = full;
  $("ifCNote").textContent = full ? `The cooler's full at ${COOLER_MAX}. Release it, or sell some at the quay.` :
    c.kg < .2 ? "A small one. Let it grow?" : sp === SPECIES.char ? "Char fetch the best price at the quay." : sp === SPECIES.pike ? "Plenty of fight, not much money." : "Into the cooler, or back down the hole.";
  $("ifCatch").hidden = false;
  const pc = $("ifFishPic"), r = pc.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  pc.width = r.width * dpr; pc.height = r.height * dpr;
  const c2 = pc.getContext("2d"); c2.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawFish2D(c2, r.width / 2, r.height / 2, Math.min(r.width * .8, 70 + Math.cbrt(c.kg) * 80), sp);
  panelFocus("ifCatch", full ? "ifRelease" : "ifKeep");
}
function closeCatch(keep) {
  if (S.mode !== "caught") return;
  const c = S.landed;
  if (keep && D.cooler.length < COOLER_MAX) {
    const item = { sp: c.species, kg: c.kg, cm: c.cm, v: c.value, t: +NOWH().toFixed(3), lake: lake.name };
    D.cooler.push(item); D.log.kept = (D.log.kept || 0) + 1; S.sess.kept.push(item);
    emitEv("catch", { species: c.species, name: c.name, kg: c.kg, cm: c.cm, value: c.value, $: c.value, lake: lake.name });
    cue(`+${$$(c.value)} in the cooler`, "#5fd38a", true, 1.2);
  } else cue("Released", "#cfe6f2", false, 1);
  $("ifCatch").hidden = true; S.mode = "fish"; syncUI(); H.save();
}
function drawFish2D(c, x, y, len, sp) {
  const h = len * sp.slim; c.save(); c.translate(x, y);
  c.fillStyle = sp.col; c.beginPath(); c.moveTo(-len * .42, 0); c.lineTo(-len * .62, -h * .55); c.lineTo(-len * .58, 0); c.lineTo(-len * .62, h * .55); c.closePath(); c.fill();
  c.beginPath(); if (sp.sail) { c.moveTo(-len * .05, -h * .4); c.quadraticCurveTo(-len * .1, -h * 1.25, -len * .32, -h * .35); } else { c.moveTo(len * .02, -h * .42); c.lineTo(-len * .12, -h * .78); c.lineTo(-len * .25, -h * .36); } c.fill();
  const g = c.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, sp.col); g.addColorStop(.55, sp.col); g.addColorStop(1, sp.belly);
  c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, len * .45, h / 2, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = "rgba(20,28,16,.38)";
  if (sp === SPECIES.perch) for (let i = 0; i < 5; i++) c.fillRect(-len * .28 + i * len * .12, -h * .45, len * .045, h * .55);
  if (sp === SPECIES.pike) { c.fillStyle = "rgba(240,240,190,.5)"; for (let i = 0; i < 9; i++) { c.beginPath(); c.ellipse(-len * .3 + (i % 5) * len * .14, (i < 5 ? -.12 : .1) * h, len * .03, h * .08, 0, 0, 7); c.fill(); } }
  if (sp === SPECIES.char) { c.fillStyle = "rgba(255,220,200,.6)"; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(-len * .26 + i * len * .1, -h * .1 + (i % 2) * h * .08, h * .05, 0, 7); c.fill(); } }
  if (sp === SPECIES.trout) { c.fillStyle = "rgba(60,30,20,.55)"; for (let i = 0; i < 8; i++) { c.beginPath(); c.arc(-len * .28 + i * len * .08, -h * .18 + (i % 3) * h * .1, h * .045, 0, 7); c.fill(); } }
  c.fillStyle = "#10161a"; c.beginPath(); c.arc(len * .3, -h * .08, Math.max(1.2, h * .09), 0, 7); c.fill();
  c.restore();
}
const summary = () => ({ fish: S.sess.kept.map(c => ({ species: c.sp, name: SPECIES[c.sp].name, kg: c.kg, cm: c.cm, value: c.v })), kr: undefined,
  $: S.sess.kept.reduce((a, c) => a + c.v, 0), cash: S.sess.kept.reduce((a, c) => a + c.v, 0), count: S.sess.kept.length });
function packUp() {
  if (!["walk", "drill", "fish", "gear"].includes(S.mode)) return;
  clearFish(); closePanels(); S.mode = "summary"; syncUI();
  const sm = summary(), tot = D.cooler.reduce((a, c) => a + fishValue(c), 0);
  D.log.bestDayCash = Math.max(D.log.bestDayCash || 0, sm.$);
  $("ifSEye").textContent = daylight() < .3 ? "Dark out on " + lake.name : "Packing up on " + lake.name;
  $("ifSTitle").textContent = sm.count ? `${sm.count} fish into the cooler` : S.sess.landed ? "All released today" : "Skunked today";
  $("ifTally").innerHTML = sm.count ? sm.fish.map(c => `<div><span>${esc(c.name)} · ${c.kg.toFixed(2)} kg</span><span class="num">${$$(c.value)}</span></div>`).join("") : `<div><span>Nothing kept${S.sess.landed ? `, ${S.sess.landed} landed and let go` : ""}. The fish will still be there tomorrow.</span></div>`;
  $("ifSTotal").textContent = $$(tot); $("ifSCount").textContent = `${D.cooler.length} / ${COOLER_MAX} in the cooler`;
  $("ifSum").hidden = false; panelFocus("ifSum", "ifExit");
}

/* =================================================================================================================
   PER FRAME: walking, drilling, the rider's pose, rod and line, fish, the side-view camera, and the extra passes
   ================================================================================================================= */
const _v = [], V3 = i => _v[i] || (_v[i] = new T.Vector3());
const UPV = () => V3(99).set(0, 1, 0);
const groundL = (x, z) => H.surf(x, z) - ROOTY;                 // ground height in the fishing roots' local frame
function update(dt) {
  if (S.cueT > 0) { S.cueT -= dt; if (S.cueT <= 0) { const c = $("ifCue"); if (c) c.style.opacity = 0; } }
  // walking: A/D along the screen, W/S into and out of it (the side view's own axes)
  let ix = 0, iy = 0;
  if (S.mode === "walk" || S.mode === "drill") {
    const K = H.keys;
    ix = (K.has("KeyD") || K.has("ArrowRight") ? 1 : 0) - (K.has("KeyA") || K.has("ArrowLeft") ? 1 : 0) + S.joy.x + (S.pad ? S.pad.x : 0);
    iy = (K.has("KeyW") || K.has("ArrowUp") ? 1 : 0) - (K.has("KeyS") || K.has("ArrowDown") ? 1 : 0) + S.joy.y + (S.pad ? S.pad.y : 0);
    const l = Math.hypot(ix, iy); if (l > 1) { ix /= l; iy /= l; }
  }
  if (S.mode === "drill" && Math.hypot(ix, iy) > .2) { S.mode = "walk"; S.drillAt = null; S.running = false; G.augerDrill.visible = false; syncUI(); }
  if (S.mode === "walk") {
    const Hh = cam.H, rx = Math.sin(Hh), rz = Math.cos(Hh), fx = Math.cos(Hh), fz = -Math.sin(Hh);
    const dx = rx * ix + fx * iy * .8, dz = rz * ix + fz * iy * .8, l = Math.hypot(dx, dz);
    const run = H.keys.has("ShiftLeft") || H.keys.has("ShiftRight") || Math.hypot(S.joy.x, S.joy.y) > .9 || (S.pad && S.pad.run);
    const target = l > .05 ? (run ? 6.5 : 3.6) * Math.min(1, l) * kitAug().walk : 0;
    W.speed = lerp(W.speed, target, Math.min(1, dt * 8));
    if (l > .05) {
      const ty = Math.atan2(dx, dz); let d = ty - W.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); W.yaw += d * Math.min(1, dt * 10);
      let nx = W.x + dx / l * W.speed * dt, nz = W.z + dz / l * W.speed * dt;
      // stay out of the sea, within reach of the sled, and walk round it rather than through it
      if (H.isSea(nx, nz) || (H.isWater && H.isWater(nx, nz)) || Math.hypot(nx - sledAt.x, nz - sledAt.z) > 220) { nx = W.x; nz = W.z; }
      const sd = Math.hypot(nx - sledAt.x, nz - sledAt.z); if (sd < 1.4) { nx = sledAt.x + (nx - sledAt.x) / sd * 1.4; nz = sledAt.z + (nz - sledAt.z) / sd * 1.4; }
      W.x = nx; W.z = nz;
    }
    W.phase += W.speed * dt * 2.6;
  } else W.speed = 0;
  // drilling
  if (S.mode === "drill") {
    const a = kitAug();
    S.yank = Math.max(0, (S.yank || 0) - dt);
    S.crankSpd = lerp(S.crankSpd || 0, S.keys.act && S.running ? 1 : 0, Math.min(1, dt * (a.start === "crank" ? 3 : 8)));
    if (S.keys.act && S.running) {
      S.crank = (S.crank || 0) + dt * 5;
      const k = a.start === "crank" ? .55 + .45 * Math.abs(Math.sin(S.crank)) : 1;
      S.drill += dt * a.rate * k * lerp(.85, 1, condOf("auger", a.id)) / S.drillAt.ice;
      for (let i = 0; i < 3; i++) { const k2 = G.chipI++ % G.CH; G.chipPos[k2 * 3] = S.drillAt.x; G.chipPos[k2 * 3 + 1] = .05; G.chipPos[k2 * 3 + 2] = S.drillAt.z; G.chipVel[k2 * 3] = rnd(-1.4, 1.4); G.chipVel[k2 * 3 + 1] = rnd(1, 2.6); G.chipVel[k2 * 3 + 2] = rnd(-1.4, 1.4); G.chipLife[k2] = 1; }
      if (S.drill >= 1) finishDrill();
    }
  }
  const CP = G.chipPos, CV = G.chipVel, CL = G.chipLife;
  for (let k = 0; k < G.CH; k++) { if (CL[k] <= 0) { CP[k * 3 + 1] = -50; continue; } CL[k] -= dt * 1.2; CV[k * 3 + 1] -= 9 * dt; CP[k * 3] += CV[k * 3] * dt; CP[k * 3 + 1] = Math.max(.03, CP[k * 3 + 1] + CV[k * 3 + 1] * dt); CP[k * 3 + 2] += CV[k * 3 + 2] * dt; }
  G.chipGeo.attributes.position.needsUpdate = true;
  // the scraped windows grow in, and so do the snow berms round them
  let dirty = false; for (const h of holes) if (h.scrape < 1) { h.scrape = Math.min(1, h.scrape + dt * .8); h.berm.scale.y = Math.max(.01, h.scrape); dirty = true; }
  if (dirty) syncHoles();
  if (S.spookT > 0 && (S.mode === "fish" || S.mode === "fight")) S.spookT = Math.max(0, S.spookT - dt);
  const exo = G.augerDrill && G.augerDrill.visible && S.running && G.augerDrill.userData.exhaust;
  if (exo && Math.random() < (S.keys.act ? .9 : .35)) { const v = exo.getWorldPosition(V3(98)), k = G.smkI++ % G.SM; G.smkPos[k * 3] = v.x; G.smkPos[k * 3 + 1] = v.y - ROOTY; G.smkPos[k * 3 + 2] = v.z; G.smkLife[k] = D.kit.auger === "twostroke" ? 1.6 : .8; }
  for (let k = 0; k < G.SM; k++) { if (G.smkLife[k] <= 0) { G.smkPos[k * 3 + 1] = -50; continue; } G.smkLife[k] -= dt; G.smkPos[k * 3] += dt * .4; G.smkPos[k * 3 + 1] += dt * .5; G.smkPos[k * 3 + 2] += dt * .15; }
  G.smkGeo.attributes.position.needsUpdate = true;
  if (S.mode === "fish" || S.mode === "fight") simFish(dt);
  else if (S.mode === "caught") for (const f of S.fish) f.wig += dt * 7;
}
function bend() {
  if (S.fight) return S.fight.tension / 100;
  const f = S.fish && S.fish.find(f => f.st === "bite" || f.st === "nibble");
  if (!f) return S.kick * .6;
  const clear = eff(kitRod().clear, .55, condOf("rod", D.kit.rod));
  if (f.st === "bite") return .55 + Math.sin(performance.now() / 40) * .1;
  return Math.max(0, Math.sin(performance.now() / 90)) * .18 * (.35 + .65 * clear) * (f.seen ? 1 : .35);
}
function pose(dt) {
  const tt = performance.now() / 1000, dl = daylight();
  const seated = ["fish", "fight", "caught", "bait"].includes(S.mode) && S.hole;
  const { rider, body, thighL, thighR, kneeL, kneeR, upper, armL, armR, headG } = G;
  rider.position.set(W.x, groundL(W.x, W.z), W.z); rider.rotation.y = W.yaw;
  const ease = Math.min(1, dt * 8), ez = (o, v) => o + (v - o) * ease;
  if (seated) {
    const b = bend(), breath = Math.sin(tt * 1.6) * .012;
    body.position.y = ez(body.position.y, .47 - .9);
    thighL.rotation.x = ez(thighL.rotation.x, -1.5); thighR.rotation.x = ez(thighR.rotation.x, -1.5);
    thighL.rotation.z = ez(thighL.rotation.z, .1); thighR.rotation.z = ez(thighR.rotation.z, -.1);
    kneeL.rotation.x = ez(kneeL.rotation.x, 1.5); kneeR.rotation.x = ez(kneeR.rotation.x, 1.5);
    upper.rotation.x = ez(upper.rotation.x, .3 + b * .12 + breath);
    headG.rotation.x = ez(headG.rotation.x, .35);
    const ja = S.kick * 1.1;
    armR.rotation.x = ez(armR.rotation.x, -1.0 - ja + b * .35); armL.rotation.x = ez(armL.rotation.x, -.95 + b * .2);
    armR.rotation.z = ez(armR.rotation.z, -.12); armL.rotation.z = ez(armL.rotation.z, .3);
    G.bucket.visible = true; G.bucket.position.set(W.x, groundL(W.x, W.z), W.z); G.bucket.rotation.y = W.yaw;
  } else {
    body.position.y = ez(body.position.y, Math.abs(Math.sin(W.phase)) * .05 * (W.speed > .2 ? 1 : 0));
    const sw = Math.sin(W.phase) * Math.min(.7, W.speed * .15);
    thighL.rotation.x = sw; thighR.rotation.x = -sw; thighL.rotation.z = thighR.rotation.z = 0;
    kneeL.rotation.x = Math.max(0, -Math.sin(W.phase - .6)) * Math.min(.9, W.speed * .2);
    kneeR.rotation.x = Math.max(0, Math.sin(W.phase - .6)) * Math.min(.9, W.speed * .2);
    upper.rotation.x = ez(upper.rotation.x, S.mode === "drill" ? .2 : W.speed * .02); headG.rotation.x = ez(headG.rotation.x, S.mode === "drill" ? .4 : 0);
    if (S.mode === "drill") {
      const a = kitAug(), buzz = S.running && a.start !== "crank" ? Math.sin(tt * 70) * .02 * (S.keys.act ? 1 : .4) : 0;
      if (a.start === "crank") { const c = S.crank || 0; armR.rotation.x = -1.25 + Math.sin(c) * .35; armR.rotation.z = -.15 + Math.cos(c) * .3; armL.rotation.x = -1.0; armL.rotation.z = .2; }
      else if (S.yank > 0) { armR.rotation.x = -1.1; armR.rotation.z = -1.1 * (S.yank / .35); armL.rotation.x = -1.05; armL.rotation.z = .3; }
      else { armL.rotation.x = -1.05 + buzz; armR.rotation.x = -1.05 - buzz; armL.rotation.z = .45; armR.rotation.z = -.45; }
    } else { armL.rotation.x = -sw * .8; armR.rotation.x = sw * .8; armL.rotation.z = .06; armR.rotation.z = -.06; }
    G.bucket.visible = false;
  }
  rider.updateMatrixWorld(true);
  // the headlamp: on once it's getting dark, a pool of light on the ice ahead, and a lamp down the hole
  const dark = clamp(1 - dl * 1.6, 0, 1);
  G.lamp.material.color.setScalar(.35 + .65 * dark);
  G.pool.material.opacity = dark * .28;
  { const fx = Math.sin(W.yaw), fz = Math.cos(W.yaw), dd = seated ? 1.0 : 2.2; G.pool.position.set(W.x + fx * dd, groundL(W.x + fx * dd, W.z + fz * dd) + .03, W.z + fz * dd); }
  // the auger: stood in the hole while you drill, laid on the ice while you sit, carried otherwise
  if (G.augerDrill) {
    const drilling = S.mode === "drill" && S.drillAt, a = kitAug();
    G.augerDrill.visible = !!drilling; G.augerCarry.visible = !drilling;
    if (drilling) {
      const sink = S.drill * .38, shake = S.running && a.start !== "crank" ? (S.keys.act ? .012 : .005) : 0;
      G.augerDrill.position.set(S.drillAt.x + rnd(-shake, shake), .02 - sink, S.drillAt.z + rnd(-shake, shake));
      G.augerDrill.rotation.set(0, W.yaw + Math.PI, 0);
      G.augerDrill.userData.spin.rotation.y += dt * (a.start === "crank" ? 5 : 22) * (S.crankSpd || 0);
    } else if (seated) {
      const fx = Math.sin(W.yaw), fz = Math.cos(W.yaw), sx = Math.cos(W.yaw), sz = -Math.sin(W.yaw);
      G.augerCarry.position.set(W.x + sx * .6 + fx * .25, groundL(W.x, W.z) + .03, W.z + sz * .6 + fz * .25);
      G.augerCarry.rotation.set(-Math.PI / 2, W.yaw, 0); G.augerCarry.userData.spin.rotation.y = 0;
    } else {
      const rx = Math.cos(W.yaw), rz = -Math.sin(W.yaw), sw = Math.sin(W.phase) * .05;
      G.augerCarry.position.set(W.x - rx * .42 - Math.sin(W.yaw) * .35, G.rider.position.y + .12 + body.position.y, W.z - rz * .42 - Math.cos(W.yaw) * .35);
      G.augerCarry.rotation.set(-.55 + sw, W.yaw, 0); G.augerCarry.userData.spin.rotation.y = 0;
      armR.rotation.x = -.15; armR.rotation.z = -.12;
    }
  }
  return seated;
}
// rod and line: a tapered blank that bends toward the pull, the guides and reel, and the verlet rope through the hole
function ropeReset(a, b) {
  const RP = G.RP, N = RP.length / 3;
  for (let i = 0; i < N; i++) { const t = i / (N - 1); RP[i * 3] = lerp(a.x, b.x, t); RP[i * 3 + 1] = lerp(a.y, b.y, t); RP[i * 3 + 2] = lerp(a.z, b.z, t); }
  G.RO.set(RP); G.ropeLive = true;
}
function ropeCollide(i, h, top, bot, lr) {
  const RP = G.RP, RO = G.RO;
  const k = i * 3, dx = RP[k] - h.x, dz = RP[k + 2] - h.z, rad = Math.hypot(dx, dz), R = h.r - lr;
  const y = RP[k + 1];
  if (y > top) { if (rad > h.r && y < top + lr) { RP[k + 1] = top + lr; RO[k] = lerp(RO[k], RP[k], .6); RO[k + 2] = lerp(RO[k + 2], RP[k + 2], .6); } }  // lies on the ice, with friction
  else if (y > bot) { if (rad > R) { RP[k] = h.x + dx / rad * R; RP[k + 2] = h.z + dz / rad * R; } }                // inside the ice: held to the hole wall
  else if (rad > h.r && y > bot - lr) RP[k + 1] = bot - lr;                                                        // pressed up against the underside
}
function ropeStep(dt, tip, end, h, total, waterY, top, bot, lr, buoy) {
  const RP = G.RP, RO = G.RO, N = RP.length / 3, seg = total / (N - 1), sub = 3, hs = dt / sub, IT = ROPE_IT();
  for (let s = 0; s < sub; s++) {
    for (let i = 1; i < N - 1; i++) {
      const k = i * 3, under = RP[k + 1] < waterY;
      const damp = under ? .86 : .985, g = under ? -buoy : -9.8;
      const vx = (RP[k] - RO[k]) * damp, vy = (RP[k + 1] - RO[k + 1]) * damp, vz = (RP[k + 2] - RO[k + 2]) * damp;
      RO[k] = RP[k]; RO[k + 1] = RP[k + 1]; RO[k + 2] = RP[k + 2];
      RP[k] += vx; RP[k + 1] += vy + g * hs * hs; RP[k + 2] += vz;
    }
    RP[0] = tip.x; RP[1] = tip.y; RP[2] = tip.z;
    const e = (N - 1) * 3; RP[e] = end.x; RP[e + 1] = end.y; RP[e + 2] = end.z;
    for (let it = 0; it < IT; it++) {
      for (let i = 0; i < N - 1; i++) {
        const a = i * 3, b = a + 3, dx = RP[b] - RP[a], dy = RP[b + 1] - RP[a + 1], dz = RP[b + 2] - RP[a + 2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d <= seg || d < 1e-6) continue;                       // line only pulls, never pushes
        const wa = i === 0 ? 0 : 1, wb = i + 1 === N - 1 ? 0 : 1, w = wa + wb; if (!w) continue;
        const c = (d - seg) / d / w;
        RP[a] += dx * c * wa; RP[a + 1] += dy * c * wa; RP[a + 2] += dz * c * wa;
        RP[b] -= dx * c * wb; RP[b + 1] -= dy * c * wb; RP[b + 2] -= dz * c * wb;
      }
      for (let i = 1; i < N - 1; i++) ropeCollide(i, h, top, bot, lr);
    }
  }
}
function drawLine(dt, seated) {
  const tt = performance.now() / 1000, dl = daylight();
  if (!seated) {
    G.rodTube.visible = G.lineTube.visible = G.line1.visible = G.lure.visible = G.reel.visible = G.cork.visible = false; G.lureLight.intensity = 0; G.ropeLive = false;
    for (const g of G.guides) g.visible = false; for (const r of G.ripples) r.m.visible = false;
    return;
  }
  const h = S.hole, b = bend(), LN = kitLine(), LK = LOOK[D.kit.line] || LOOK.mono, ff = S.fight && S.fight.f, RP = G.RP, RO = G.RO, N = RP.length / 3;
  const top = .02, bot = .02 - (h.iceT || .25), waterY = h.waterY !== undefined ? h.waterY : top - .03;
  const ly = -(S.L - S.kick) * VS - .02;
  const end = V3(0).set(h.x, Math.min(ly, waterY - .02), h.z);
  if (ff && ff.mesh) { const m = ff.mesh, fy = m.rotation.y, half = m.scale.x * .45; end.set(h.x + ff.x + Math.sin(fy) * half, -ff.d * VS, h.z + ff.z + Math.cos(fy) * half); }
  else if (S.L <= .02) end.set(h.x, waterY - .03, h.z);
  // rod: cork grip in the glove, a tapered blank that bends toward the line (hand position into the local frame)
  const base = G.handR.getWorldPosition(V3(1)); base.y -= ROOTY;
  const T0 = V3(2).set(h.x, base.y + .2 - S.kick * .25, h.z);
  const rodDir = V3(3).subVectors(T0, base); const rodLen = rodDir.length(); rodDir.normalize();
  const pullDir = V3(4).set(RP[3] - RP[0], RP[4] - RP[1], RP[5] - RP[2]);
  if (!G.ropeLive || pullDir.lengthSq() < 1e-8) pullDir.set(0, -1, 0); pullDir.normalize();
  const load = ff ? S.fight.tension / 100 : b * .6 + .04;
  const tipP = V3(5).copy(T0).addScaledVector(pullDir, rodLen * .42 * load).addScaledVector(rodDir, -rodLen * .12 * load);
  if (ff && S.fight.tension > 55) tipP.x += Math.sin(tt * 90) * .004 * (S.fight.tension - 55) / 45;
  const ctrl = V3(6).copy(base).addScaledVector(rodDir, rodLen * .55);
  const rodPts = [];
  for (let i = 0; i < RODP; i++) { const t = i / (RODP - 1), u = 1 - t; rodPts.push(V3(10 + i).set(u * u * base.x + 2 * u * t * ctrl.x + t * t * tipP.x, u * u * base.y + 2 * u * t * ctrl.y + t * t * tipP.y, u * u * base.z + 2 * u * t * ctrl.z + t * t * tipP.z)); }
  // better rods are darker carbon; the starter is green glass
  const rodCol = { short: [.12, .2, .12, 1], glass: [.18, .16, .1, 1], graphite: [.07, .08, .09, 1], carbon: [.04, .04, .05, 1] }[D.kit.rod] || [.07, .08, .09, 1];
  G.rodTube.visible = true; G.rodTube.userData.update(rodPts, i => lerp(.0085, .0022, i / (RODP - 1)), () => rodCol);
  G.cork.visible = true; G.cork.position.copy(base); G.cork.quaternion.setFromUnitVectors(UPV(), rodDir);
  const rodUp = V3(7).crossVectors(rodDir, V3(8).set(0, 1, 0)).cross(rodDir).normalize().negate();
  const linePts = [];
  G.reel.visible = true; G.reel.position.copy(base).addScaledVector(rodDir, .03).addScaledVector(rodUp, .045); G.reel.quaternion.setFromUnitVectors(V3(9).set(0, 0, 1), rodDir);
  G.spoolA += (S.L - (S.prevL || 0)) * 40; S.prevL = S.L; G.reel.userData.spool.rotation.x = G.spoolA;
  linePts.push(V3(30).copy(G.reel.position).addScaledVector(rodUp, -.02));
  [.3, .55, .78, 1].forEach((t, gi) => {
    const idx = Math.round(t * (RODP - 1)), pnt = rodPts[idx], nxt = rodPts[Math.min(RODP - 1, idx + 1)], prv = rodPts[Math.max(0, idx - 1)];
    const off = gi === 3 ? 0 : .012 - gi * .002;
    const gp = V3(31 + gi).copy(pnt).addScaledVector(rodUp, off);
    G.guides[gi].visible = true; G.guides[gi].position.copy(gp); G.guides[gi].quaternion.setFromUnitVectors(V3(9).set(0, 0, 1), V3(35).subVectors(nxt, prv).normalize());
    linePts.push(gp);
  });
  const tip = linePts[linePts.length - 1];
  const entry = V3(36).set(h.x, top, h.z);
  const pathLen = tip.distanceTo(entry) + entry.distanceTo(end);
  let slackK = .006;
  if (S.keys.down && S.mode === "fish") slackK = .05;
  if (ff) slackK = (1 - clamp(S.fight.tension / 100, 0, 1)) * .12 + .002;
  if (S.mode === "caught" || S.mode === "bait") slackK = .15;
  if (S.L > .05 && S.L >= h.depth - .2) slackK = .08;
  const total = pathLen * (1 + slackK);
  if (!G.ropeLive || G.ropeHole !== h || Math.abs(total - G.prevTot) > 4) { ropeReset(tip, end); G.ropeHole = h; }
  G.prevTot = total;
  const lr = clamp(LK.mm * .012, .0024, .0045);
  const buoy = D.kit.line.startsWith("braid") ? -.25 : /fluoro|steel/.test(D.kit.line) ? .9 : .3;
  ropeStep(Math.min(dt, 1 / 30), tip, end, h, total, waterY, top, bot, lr, buoy);
  for (let i = 1; i < N; i++) {
    const k = i * 3, v = V3(200 + i).set(RP[k], RP[k + 1], RP[k + 2]);
    const slackLocal = clamp(slackK * 8, 0, 1);
    if (LK.mem && v.y > top && i < N - 1) { const a = i * 1.9 + tt * .3; v.x += Math.cos(a) * .006 * LK.mem * slackLocal; v.z += Math.sin(a) * .006 * LK.mem * slackLocal; v.y += Math.sin(a * .5) * .004 * LK.mem * slackLocal; }
    if (ff && S.fight.tension > 60 && i < N - 1) { const amp = .0025 * (S.fight.tension - 60) / 40; v.x += Math.sin(tt * 140 + i) * amp; v.z += Math.cos(tt * 131 + i * .7) * amp; }
    linePts.push(v);
  }
  const colM = new T.Color(LN.col), colL = new T.Color(LN.leader || LN.col), nPts = linePts.length;
  const distFromEnd = G.dfe && G.dfe.length >= nPts ? G.dfe : (G.dfe = new Float32Array(nPts + 8)); distFromEnd[nPts - 1] = 0;
  for (let i = nPts - 2; i >= 0; i--) distFromEnd[i] = distFromEnd[i + 1] + linePts[i].distanceTo(linePts[i + 1]);
  const look = i => {
    const lead = LK.leadLen && distFromEnd[i] < LK.leadLen, c = lead ? colL : colM, p = linePts[i], under = p.y < waterY;
    let a = lead ? (under ? LK.leadWater : LK.leadAir) : (under ? LK.water : LK.air);
    if (under && Math.hypot(p.x - h.x, p.z - h.z) > 2.6) a = 0;          // under the snow, outside the window: you can't see it
    return [c.r, c.g, c.b, a];
  };
  G.lineTube.visible = true;
  G.lineTube.userData.update(linePts, i => (LK.leadLen && distFromEnd[i] < LK.leadLen && LK.leadMm) ? clamp(LK.leadMm * .012, .003, .006) : LK.flat ? lr * 1.25 : lr, look);
  const sd = H.sunDir, ud = lerp(.55, 1, dl);
  for (const m of [G.lineMat, G.rodMat]) { m.uniforms.uSun.value.copy(sd); m.uniforms.uDay.value = ud; m.uniforms.uWater.value = ROOTY + waterY; }
  const lp = G.lineGeo.attributes.position, lc = G.lineGeo.attributes.color;
  for (let i = 0; i < nPts; i++) { const q = look(i); lp.setXYZ(i, linePts[i].x, linePts[i].y, linePts[i].z); lc.setXYZ(i, q[0] * q[3], q[1] * q[3], q[2] * q[3]); }
  G.lineGeo.setDrawRange(0, nPts); lp.needsUpdate = lc.needsUpdate = true; G.line1.visible = true;
  // rings where the line cuts the water in the hole
  let wx = h.x, wz = h.z, speed = 0;
  for (let i = 5; i < nPts - 1; i++) if ((linePts[i].y - waterY) * (linePts[i + 1].y - waterY) <= 0) { wx = linePts[i].x; wz = linePts[i].z; const k = (i - 4) * 3; if (k >= 0 && k < RP.length) speed = Math.hypot(RP[k] - RO[k], RP[k + 1] - RO[k + 1], RP[k + 2] - RO[k + 2]) / Math.max(dt / 3, 1e-3); break; }
  const ripK = clamp(speed * 1.5 + (ff ? S.fight.tension / 160 : 0) + S.act * .3, 0, 1);
  for (const r of G.ripples) { r.t = (r.t + dt * (.8 + ripK)) % 1; r.m.position.set(wx, waterY + .002, wz); r.m.scale.setScalar(.01 + r.t * Math.min(.12, h.r * .8)); r.m.material.opacity = (1 - r.t) * .5 * ripK; r.m.visible = true; }
  G.lure.visible = S.L > .02 && !ff; G.bait.visible = S.baitOn; G.lure.position.set(end.x, end.y - .04, end.z); G.lure.rotation.z = Math.sin(tt * 6) * S.act * .5; if (D.kit.bait === "balance") G.lure.rotation.y += dt * S.act * 6;
  const lureOk = !kitBait().hard || D.lures[kitBait().hard] > 0;
  G.lure.visible = G.lure.visible && lureOk;
  G.lureLight.position.copy(end);
  const polar = H.CAL.isPolarNight();
  G.lureLight.intensity = S.L > .3 && lureOk ? (.9 + S.act * .9) * lerp(.6, 1, 1 - dl) + .4 + (D.kit.bait === "glow" ? .8 + (1 - dl) + (polar ? .6 : 0) : 0) : 0;
}
function drawFish(dt) {
  if (!S.hole) return;
  const dl = daylight(), water = V3(96).set(.08, .2, .24);
  const lit = Math.max(dl, clamp(1 - dl * 1.6, 0, 1) * .55);           // after dark the headlamp's what you see by
  for (const f of S.fish) {
    const m = f.mesh; if (!m) continue; m.position.set(S.hole.x + f.x, -f.d * VS, S.hole.z + f.z);
    if (Math.hypot(f.vx, f.vz) > .01) { const ty = Math.atan2(f.vx, f.vz); let d = ty - m.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); m.rotation.y += d * Math.min(1, dt * 6); }
    m.userData.tail.rotation.y = Math.sin(f.wig) * .45;
    const dist = Math.hypot(f.x, f.z, f.d - S.L);
    const vis = clamp(1.3 - dist / 6, .2, 1) * clamp(1.15 - f.d / 24, .45, 1) * lerp(.6, 1, lit);
    m.userData.mat.color.setRGB(lerp(water.x, 1, vis), lerp(water.y, 1, vis), lerp(water.z, 1, vis));
    m.userData.fm.color.setRGB(water.x, water.y, water.z).lerp(m.userData.col, vis);
  }
}
function camera(dt, seated) {
  let tx, ty, tz, dist, pitch;
  if (seated) { const h = S.hole; tx = (W.x + h.x) / 2; tz = (W.z + h.z) / 2; ty = clamp(-S.L * VS * .5, -2.2, 0) + .35; dist = 5.4; pitch = .5; }
  else if (S.mode === "drill" && S.drillAt) { tx = (W.x + S.drillAt.x) / 2; tz = (W.z + S.drillAt.z) / 2; ty = .8; dist = 4.8; pitch = .3; }
  else { tx = W.x; tz = W.z; ty = G.rider.position.y + 1.2; dist = 7; pitch = .22; }
  if (S.mode !== "walk") cam.userYaw *= Math.max(0, 1 - dt * 1.5);
  { let d = (cam.H - Math.PI / 2 + cam.userYaw) - cam.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); cam.yaw += d * Math.min(1, dt * 4); }
  const k = Math.min(1, dt * 5);
  cam.tx = lerp(cam.tx, tx, k); cam.ty = lerp(cam.ty, ty, k); cam.tz = lerp(cam.tz, tz, k);
  const asp = innerWidth / Math.max(1, innerHeight);                // an upright phone sees less across: stand the camera back
  cam.dist = lerp(cam.dist, dist * (cam.zoom || 1) * (asp < 1 ? 1.25 + (1 - asp) * .9 : 1), k); cam.pitch = lerp(cam.pitch, clamp(pitch + (cam.pitchAdj || 0), .05, 1.35), k);
  const cx = cam.tx + Math.sin(cam.yaw) * Math.cos(cam.pitch) * cam.dist, cz = cam.tz + Math.cos(cam.yaw) * Math.cos(cam.pitch) * cam.dist;
  let cy = cam.ty + Math.sin(cam.pitch) * cam.dist; cy = Math.max(cy, groundL(cx, cz) + .4);
  const C = H.camera;
  C.position.set(cx, cy + ROOTY, cz); C.lookAt(cam.tx, cam.ty + ROOTY, cam.tz);
  if (Math.abs(C.fov - 55) > .01) { C.fov = 55; C.updateProjectionMatrix(); }
}
function lights() {
  const h = H.hemi, s = H.sun;
  G.uHemi.intensity = h.intensity * .9; G.uHemi.color.copy(h.color); G.uHemi.groundColor.setRGB(.04, .1, .12);
  G.uSun.position.copy(H.sunDir).multiplyScalar(50).add(V3(95).set(W.x, ROOTY, W.z)); G.uSun.target.position.set(W.x, ROOTY - 3, W.z); G.uSun.intensity = s.intensity * .35; G.uSun.color.copy(s.color);
  const dark = clamp(1 - daylight() * 1.6, 0, 1), at = S.hole || (S.mode === "drill" && S.drillAt) || W;
  G.uLamp.position.set(at.x, .6, at.z); G.uLamp.intensity = dark * 1.6;
  for (const hh of holes) hh.film.material.uniforms.uDay.value = lerp(.35, 1, Math.max(daylight(), dark * .6));
}
// the whole frame, called by tracklayer after it has placed the world camera
function frame(dt) {
  if (!S.on || !G) return;
  sledAt.x = H.P.x; sledAt.z = H.P.z;
  for (const k of ["down", "up", "act"]) S.keys[k] = !!(S.kb[k] || S.tk[k] || S.pd[k]);
  update(dt);
  const seated = pose(dt);
  drawLine(dt, seated); drawFish(dt);
  if (!H.showroom()) camera(dt, seated);
  lights();
  hudT += dt; if (hudT > .066) { hudT = 0; hudTick(); }
  if (S.hole && (S.mode === "fish" || S.mode === "fight" || S.mode === "caught" || S.mode === "bait")) drawFlasher();
}
let hudT = 0;
function render() {
  const R = H.renderer, C = H.camera;
  R.render(H.scene, C);
  if (!S.on || !G) return;
  const ac = R.autoClear; R.autoClear = false;
  if (holes.length) { R.render(G.maskS, C); R.clearDepth(); R.render(G.underS, C); }
  R.render(G.overS, C);
  R.autoClear = ac;
}

/* =================================================================================================================
   HUD, CARDS AND PANELS (DOM, in the game's UI theme: night-ink glass, Barlow, soft corners, chips)
   ================================================================================================================= */
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const CSS = `
#ifHud{position:fixed;inset:0;z-index:3;pointer-events:none;font-family:var(--body);color:var(--frost);-webkit-user-select:none;user-select:none}
#ifHud .ifp,.ifcard,.ifpanel{background:var(--panel);border:1px solid rgba(234,242,248,.1);border-radius:var(--r-lg);box-shadow:var(--soft),inset 0 1px 0 rgba(255,255,255,.05);backdrop-filter:blur(14px) saturate(1.15);-webkit-backdrop-filter:blur(14px) saturate(1.15)}
.ifey{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--signal)}
.num{font-variant-numeric:tabular-nums}
#ifL{position:absolute;top:calc(14px + env(safe-area-inset-top,0px));left:16px;padding:10px 14px;display:grid;gap:2px;min-width:170px;max-width:min(330px,60vw)}
#ifClock{font-size:28px;font-weight:800;line-height:1}#ifClock i{font-style:normal;font-size:13px;font-weight:600;color:var(--slate);margin-left:8px;letter-spacing:.06em}
#ifL .sub{font-size:13px;color:var(--slate)}
#ifWarm{height:5px;border-radius:999px;background:rgba(234,242,248,.12);overflow:hidden;margin-top:4px}#ifWarm i{display:block;height:100%;width:100%;border-radius:999px;background:var(--warm);transition:width .3s}
#ifWarm.low i{background:var(--bad)}
#ifR{position:absolute;top:calc(14px + env(safe-area-inset-top,0px));right:16px;display:flex;flex-direction:column;align-items:flex-end;gap:8px;pointer-events:auto}
#ifCooler{padding:10px 14px;text-align:right}#ifCooler b{font-size:22px;font-weight:800;color:var(--pay)}#ifCooler .sub{font-size:13px;color:var(--slate)}
.ifrow{display:flex;gap:6px}
#ifHud button,.ifcard button,.ifpanel button{font:inherit;color:var(--frost);cursor:pointer;border:1px solid rgba(234,242,248,.14);background:rgba(234,242,248,.07);border-radius:var(--r-md);padding:8px 12px;font-weight:700;letter-spacing:.04em;transition:background-color .2s var(--ease),transform .12s var(--ease),border-color .2s}
#ifHud button:hover,.ifcard button:hover,.ifpanel button:hover{background:rgba(234,242,248,.13);border-color:rgba(234,242,248,.35)}
#ifHud button:active,#ifHud button.on,.ifcard button:active,.ifpanel button:active{transform:scale(.96)}
#ifHud button:disabled,.ifcard button:disabled,.ifpanel button:disabled{opacity:.4;cursor:not-allowed}
.ifmini{font-size:12px!important;padding:6px 10px!important;border-radius:999px!important;background:var(--panel)!important}
#ifFlW{position:absolute;right:16px;bottom:calc(118px + env(safe-area-inset-bottom,0px));padding:8px;display:grid;gap:4px;justify-items:center}
#ifFl{width:150px;height:150px;display:block}#ifFlW .ifey{font-size:10px;color:var(--slate)}
#ifCue{position:absolute;left:50%;top:24%;translate:-50% 0;font-size:40px;font-weight:800;letter-spacing:.02em;text-shadow:0 2px 12px rgba(0,0,0,.55);pointer-events:none;white-space:nowrap;transition:opacity .25s;opacity:0}
#ifCue.small{font-size:20px}
#ifBottom{position:absolute;left:16px;right:16px;bottom:calc(14px + env(safe-area-inset-bottom,0px));display:grid;justify-items:center;gap:8px;pointer-events:none}
#ifBottom>*{pointer-events:auto}
#ifHint{font-size:15px;font-weight:500;text-align:center;padding:6px 14px;border-radius:999px;background:var(--panel);border:1px solid rgba(234,242,248,.12);max-width:100%;text-wrap:balance}
#ifTen{width:min(420px,100%);display:grid;gap:4px}
#ifTen .lab{display:flex;justify-content:space-between;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--slate)}
#ifTbar{height:12px;border-radius:999px;background:linear-gradient(90deg,rgba(111,208,140,.25) 0 60%,rgba(255,194,107,.25) 60% 82%,rgba(255,138,107,.3) 82%);overflow:hidden;border:1px solid rgba(234,242,248,.14)}
#ifTfill{height:100%;width:0;border-radius:999px;background:var(--pay)}
#ifCtl{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
.ifbig{min-width:112px;padding:14px 18px!important;font-size:16px!important;font-weight:800!important;text-transform:uppercase;letter-spacing:.08em!important;border-radius:14px!important;background:var(--panel)!important}
.ifbig small{display:block;font-size:10px;font-weight:600;color:var(--slate);letter-spacing:.1em;margin-top:2px}
#ifJig,#ifAct{border-color:var(--bandline)!important}#ifAct{min-width:200px}
#ifJig.hot{background:var(--signal)!important;color:#1a0d02;border-color:var(--signal)!important}#ifJig.hot small{color:#3a1d05}
#ifJoy{position:absolute;left:24px;bottom:calc(110px + env(safe-area-inset-bottom,0px));width:120px;height:120px;border-radius:999px;background:var(--panel);border:1px solid rgba(234,242,248,.14);touch-action:none;pointer-events:auto}
#ifKnob{position:absolute;left:50%;top:50%;width:48px;height:48px;margin:-24px 0 0 -24px;border-radius:999px;background:rgba(210,232,245,.25);border:1px solid rgba(234,242,248,.2)}
.ifov{position:fixed;inset:0;z-index:7;display:grid;place-items:center;padding:16px;background:rgba(5,9,13,.45);overflow:auto;font-family:var(--body);color:var(--frost)}
.ifcard{width:min(460px,100%);padding:20px 22px;display:grid;gap:12px;animation:uiIn .34s var(--ease) both;box-sizing:border-box}
.ifcard.wide{width:min(820px,100%)}
.ifcard h2,.ifpanel h2{margin:0;font-size:28px;font-weight:800;line-height:1.05;text-wrap:balance}
.ifcard p{margin:0;font-size:14px;line-height:1.45;color:var(--frost2)}
.ifcard .row{display:flex;gap:8px;flex-wrap:wrap}.ifcard .row button{flex:1}
.ifpri{color:#fff!important;background:linear-gradient(180deg,#ef6128,#d8491a)!important;border-color:transparent!important;box-shadow:0 6px 18px -6px rgba(255,90,31,.6)}
.ifpri:hover{filter:brightness(1.1)}
.iffoc{outline:2px solid rgba(234,242,248,.8)!important;outline-offset:2px}
.ifsteps{display:grid;gap:6px;margin:0;padding:0;list-style:none;counter-reset:s}
.ifsteps li{display:grid;grid-template-columns:22px 1fr;gap:8px;font-size:14px;line-height:1.35;counter-increment:s}
.ifsteps li::before{content:counter(s);display:grid;place-items:center;width:20px;height:20px;border-radius:999px;background:rgba(234,242,248,.07);border:1px solid var(--rule);font-size:11px;font-weight:700;color:var(--signal)}
.ifkeys{font-size:12px;color:var(--slate);line-height:1.9}
.ifkeys kbd{font:inherit;font-size:11px;font-weight:700;padding:1px 6px;border-radius:6px;border:1px solid rgba(234,242,248,.2);border-bottom-width:2px;background:rgba(234,242,248,.06);color:var(--frost)}
#ifFishPic{width:100%;height:110px;border-radius:var(--r-md);background:linear-gradient(180deg,#e9f1f5,#c9dbe5)}
.ifstats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.ifstats div{padding:8px 10px;border-radius:var(--r-md);background:rgba(234,242,248,.05);border:1px solid var(--rule)}
.ifstats span{display:block;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--slate)}
.ifstats b{font-size:20px;font-weight:800}
.ifpb{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#1a0d02;background:var(--warm);border-radius:999px;padding:2px 8px;vertical-align:middle;margin-left:8px}
#ifTally{display:grid;gap:4px;max-height:40vh;overflow:auto}
#ifTally div{display:flex;justify-content:space-between;gap:8px;font-size:14px;padding:6px 0;border-bottom:1px solid var(--rule)}#ifTally div:last-child{border-bottom:0}
.iftotal{display:flex;justify-content:space-between;align-items:baseline;font-weight:800;font-size:22px}.iftotal b{color:var(--pay)}
.iftabs{display:flex;gap:6px;flex-wrap:wrap}
.iftab{font-size:18px!important;font-weight:800!important;padding:4px 14px!important;border-radius:999px!important;background:transparent!important;border-color:transparent!important;color:var(--slate)!important}
.iftab.on{background:rgba(234,242,248,.07)!important;border-color:var(--rule)!important;color:var(--frost)!important}
.ifgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;max-height:52vh;overflow:auto;padding:2px}
.ifit{display:grid;gap:8px;align-content:start;padding:12px;border-radius:var(--r-md);background:rgba(234,242,248,.04);border:1px solid rgba(234,242,248,.08)}
.ifit.on{background:var(--band);border-color:var(--bandline)}
.ifit.off{opacity:.55}
.ifit p{font-size:13px!important}
.ifhd{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.ifnm{font-weight:800;font-size:17px}.ifpr{font-size:13px;color:var(--pay);font-weight:700;white-space:nowrap}
.ifloc{font-size:12px;font-style:italic;color:var(--slate);margin-top:-6px}
.ifst{display:grid;grid-template-columns:1fr 1fr;gap:4px 10px}
.ifst div{display:flex;justify-content:space-between;gap:6px;font-size:12px;border-bottom:1px solid var(--rule);padding-bottom:3px;min-width:0}
.ifst span{color:var(--slate)}.ifst b{font-weight:700;text-align:right}
.ifst.bars div{flex-direction:column;align-items:stretch;gap:0}
.ifmeter{display:block;height:6px;border-radius:999px;background:var(--rule);overflow:hidden;margin-top:3px;width:100%}.ifmeter i{display:block;height:100%;border-radius:999px;background:var(--signal)}
.ifchips{display:flex;flex-wrap:wrap;gap:4px}
.ifchip{display:inline-block;padding:0 7px;font-weight:700;font-size:10px;line-height:16px;letter-spacing:.08em;border:1px solid currentColor;border-radius:999px;color:#a9b8c5;text-transform:uppercase}
.ifchip.ok{color:var(--pay)}.ifchip.warn{color:var(--warm)}.ifchip.bad{color:var(--bad)}.ifchip.sig{color:var(--signal)}
.ifnote{font-size:14px;line-height:1.45;color:var(--slate);margin:0}
.ifpanel{position:fixed;z-index:7;left:50%;top:50%;translate:-50% -50%;width:min(860px,calc(100% - 24px));max-height:calc(100% - 24px);overflow:auto;padding:22px;box-sizing:border-box;display:grid;gap:12px;font-family:var(--body);color:var(--frost);animation:uiIn .34s var(--ease) both;overscroll-behavior:contain}
.ifphd{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;padding-bottom:12px;border-bottom:1px solid var(--rule)}
.ifphd .cash{font-size:22px;font-weight:800;color:var(--pay)}
.ifx{border-radius:999px!important;width:36px;height:36px;padding:0!important;color:var(--slate)!important}
.ifrows{display:grid;gap:6px}
.ifr{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:12px;align-items:center;padding:10px 12px;border-radius:var(--r-md);background:rgba(234,242,248,.04);border:1px solid transparent}
.ifr b{font-weight:800}.ifr em{display:block;font-style:normal;font-size:13px;color:var(--slate)}.ifr .v{font-weight:800;color:var(--pay)}
.ifboard{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13px;color:var(--frost2)}.ifboard b{color:var(--frost)}.ifboard i{font-style:normal;color:var(--slate)}
body.fishing #zone,body.fishing #speedo,body.fishing #job,body.fishing #mapWrap,body.fishing #help,body.fishing #wnHud,body.fishing #flip,body.fishing #touch,body.fishing #breathFp,body.fishing #glove{display:none!important}
body.fishing.tabOn #ifHud{opacity:.16}
body.touch .ifbig small{display:none}body.touch .ifkeys{display:none}
@media (max-width:640px),(max-height:480px){
  #ifFl{width:104px;height:104px}#ifFlW{bottom:auto;top:calc(150px + env(safe-area-inset-top,0px))}
  #ifL{min-width:0;padding:8px 12px}#ifClock{font-size:22px}
  .ifbig{min-width:0;flex:1;padding:12px 8px!important;font-size:13px!important}#ifAct{min-width:0}
  #ifCtl{width:100%;flex-wrap:nowrap}#ifHint{font-size:13px}#ifCue{font-size:30px}
  #ifJoy{left:16px;bottom:calc(120px + env(safe-area-inset-bottom,0px));width:104px;height:104px}
  .ifpanel{padding:16px}.ifgrid{max-height:48vh}
}
@media (max-width:640px){#ifL{max-width:calc(100% - 152px)}#ifSub3{display:none}#ifR .ifrow{flex-direction:column;align-items:flex-end}#ifFlW{top:calc(236px + env(safe-area-inset-top,0px))}}
@media (max-height:480px){#ifFlW{top:auto;bottom:calc(84px + env(safe-area-inset-bottom,0px));right:12px}#ifFl{width:88px;height:88px}#ifJoy{bottom:84px;width:96px;height:96px}#ifL .sub:nth-child(n+5){display:none}}
@media (prefers-reduced-motion:reduce){.ifcard,.ifpanel{animation:none}}
.tlk.tlice{margin-top:12px;grid-template-rows:auto repeat(7,auto)}.tlk.tlice .tlp{grid-row:span 8}
`;
const HTML = `
<div id="ifHud" hidden>
  <div id="ifL" class="ifp"><span class="ifey" id="ifEye">Ice fishing</span><span id="ifClock" class="num">09:30</span>
    <span class="sub num" id="ifSub1"></span><span class="sub num" id="ifSub2"></span><span class="sub num" id="ifSub3"></span><div id="ifWarm"><i></i></div></div>
  <div id="ifR"><div id="ifCooler" class="ifp"><span class="ifey">Cooler</span><br><b class="num" id="ifCash">$0</b><div class="sub num" id="ifCount">0 / 10 fish</div></div>
    <div class="ifrow"><button class="ifmini" id="ifTabB" type="button">Tablet</button><button class="ifmini" id="ifHelpB" type="button">How to fish</button><button class="ifmini" id="ifMenuB" type="button" aria-label="Settings">≡</button></div></div>
  <div id="ifFlW" class="ifp" hidden><canvas id="ifFl" aria-label="Flasher sonar"></canvas><span class="ifey">Flasher</span></div>
  <div id="ifCue"></div>
  <div id="ifJoy" hidden><div id="ifKnob"></div></div>
  <div id="ifBottom"><div id="ifHint">Walk out onto the ice.</div>
    <div id="ifTen" hidden><div class="lab"><span>Line tension</span><span id="ifTLab" class="num">0%</span></div><div id="ifTbar"><div id="ifTfill"></div></div></div>
    <div id="ifCtl">
      <button class="ifbig" id="ifAct" type="button">Drill here<small>Hold · Space / E</small></button>
      <button class="ifbig" id="ifStand" type="button" hidden>Stand<small>Q</small></button>
      <button class="ifbig" id="ifTackleB" type="button" hidden>Tackle<small>B</small></button>
      <button class="ifbig" id="ifDown" type="button" hidden>Let out<small>Hold · ↓ / S</small></button>
      <button class="ifbig" id="ifJig" type="button" hidden>Jig<small>Tap · Space</small></button>
      <button class="ifbig" id="ifUp" type="button" hidden>Reel<small>Hold · ↑ / W</small></button>
    </div></div>
</div>
<div class="ifov" id="ifIntro" hidden><div class="ifcard">
  <span class="ifey">Tracklayer · Ice fishing</span><h2 id="ifIntroT">Fishing the fell lakes</h2>
  <p id="ifIntroP">The sled's parked by the ice. Find a spot, drill, and fish. Each hole gets a patch of snow scraped clear, so you can watch the fish through the black ice.</p>
  <ol class="ifsteps">
    <li><span><b>Walk</b> the lake and watch the chart depth. Perch, pike and trout hold in the shallows; char and whitefish sit deep, and burbot stay on the bottom. Every lake has its own mix.</span></li>
    <li><span><b>Drill</b> where you like the depth. Hold the button: the hand auger is slow and silent. Better augers are at the tackle shop by the quay. You sit at the hole when you're through.</span></li>
    <li><span><b>Let out</b> line and match the marks on the flasher. Green marks are small fish, orange decent, red big.</span></li>
    <li><span><b>Jig</b> to draw them in. A nibble twitches the rod; wait for the hard <b>bite</b>, then jig to set the hook. Better rods show it sooner.</span></li>
    <li><span><b>Reel</b> it up. Let go when tension runs red. Walk back to the sled to change tackle or pack up. Sell the catch at the quay fish buyer, or take it out as fresh-fish parcels.</span></li>
  </ol>
  <p class="ifkeys"><kbd>A</kbd>/<kbd>D</kbd> walk · <kbd>W</kbd>/<kbd>S</kbd> in/out · <kbd>Shift</kbd> run · drag to swing the view · <kbd>Space</kbd>/<kbd>E</kbd> drill, sit, jig · <kbd>↓</kbd> let out · <kbd>↑</kbd> reel · <kbd>B</kbd> tackle · <kbd>Q</kbd> stand · <kbd>Esc</kbd> back<br>
    Pad: <kbd>stick</kbd> walk · <kbd>A</kbd> drill, sit, jig · <kbd>LT</kbd> let out · <kbd>RT</kbd> reel · <kbd>X</kbd> tackle · <kbd>B</kbd> stand / back · <kbd>LB</kbd> pack up at the sled</p>
  <div class="row"><button class="ifpri" id="ifStart" type="button">Start fishing</button></div></div></div>
<div class="ifov" id="ifCatch" hidden><div class="ifcard">
  <span class="ifey" id="ifCLocal">abbor</span><h2 id="ifCName">Perch</h2><canvas id="ifFishPic"></canvas>
  <div class="ifstats"><div><span>Weight</span><b class="num" id="ifCKg">0.0 kg</b></div><div><span>Length</span><b class="num" id="ifCCm">0 cm</b></div><div><span>Worth</span><b class="num" id="ifCVal" style="color:var(--pay)">$0</b></div></div>
  <p id="ifCNote"></p>
  <div class="row"><button id="ifRelease" type="button">Release · X</button><button class="ifpri" id="ifKeep" type="button">Keep · Enter</button></div></div></div>
<div class="ifov" id="ifTackle" hidden><div class="ifcard wide">
  <span class="ifey">Tackle box</span><div class="iftabs" id="ifTackleTabs"></div>
  <p class="ifnote" id="ifTackleNote"></p><div class="ifgrid" id="ifTackleList"></div>
  <div class="row"><button class="ifpri" id="ifTackleClose" type="button">Back to the hole · Esc</button></div></div></div>
<div class="ifov" id="ifGear" hidden><div class="ifcard wide">
  <span class="ifey">At the sled · tackle box &amp; augers</span><div class="iftabs" id="ifGearTabs"></div>
  <p class="ifnote" id="ifGearNote"></p><div class="ifgrid" id="ifGearList"></div>
  <div class="row"><button id="ifPack" type="button">Pack up for the day</button><button class="ifpri" id="ifGearClose" type="button">Back to fishing · Esc</button></div></div></div>
<div class="ifov" id="ifSum" hidden><div class="ifcard">
  <span class="ifey" id="ifSEye">Packing up</span><h2 id="ifSTitle">Pack it up</h2><div id="ifTally"></div>
  <div class="iftotal"><span>Cooler value <i id="ifSCount" style="font-style:normal;font-weight:600;font-size:13px;color:var(--slate)"></i></span><b class="num" id="ifSTotal">$0</b></div>
  <p class="ifnote">Fish keep in the cooler for about two days, then lose value. The fish buyer is on the quay; some homes and cabins post fresh-fish orders in Parcels.</p>
  <div class="row"><button id="ifAgain" type="button">Keep fishing</button><button class="ifpri" id="ifExit" type="button">Back on the sled</button></div></div></div>
<div class="ifpanel" id="ifShop" hidden role="dialog" aria-label="Tackle shop"></div>
<div class="ifpanel" id="ifBuy" hidden role="dialog" aria-label="Fish buyer"></div>
`;
function injectUI() {
  if ($("ifHud")) return;
  const st = document.createElement("style"); st.id = "ifCss"; st.textContent = CSS; document.head.appendChild(st);
  const wrap = document.createElement("div"); wrap.innerHTML = HTML; while (wrap.firstElementChild) document.body.appendChild(wrap.firstElementChild);
  wireUI();
}

/* ---- HUD state ---- */
function syncUI() {
  if (!$("ifHud")) return;
  const m = S.mode, seated = m === "fish" || m === "fight" || m === "caught" || m === "bait";
  $("ifAct").hidden = !(m === "walk" || m === "drill");
  ["ifDown", "ifJig", "ifUp", "ifStand", "ifTackleB"].forEach(id => $(id).hidden = !seated);
  $("ifTackleB").disabled = m !== "fish"; $("ifDown").disabled = m === "fight"; $("ifStand").disabled = m !== "fish";
  $("ifTen").hidden = m !== "fight";
  $("ifFlW").hidden = !seated;
  $("ifJoy").hidden = !(H.touch() && (m === "walk" || m === "drill"));
  const tot = D.cooler.reduce((a, c) => a + fishValue(c), 0);
  $("ifCash").textContent = $$(tot); $("ifCount").textContent = `${D.cooler.length} / ${COOLER_MAX} fish`;
  if (seated) requestAnimationFrame(sizeFlasher);
}
function setAct(label, sub) { const b = $("ifAct"); if (b.dataset.l !== label + sub) { b.innerHTML = `${label}<small>${sub}</small>`; b.dataset.l = label + sub; } }
function hudTick() {
  const n = H.CAL.now(), m = S.mode;
  $("ifClock").innerHTML = `${n.time}<i>${esc(n.label.toUpperCase())}${H.CAL.isPolarNight() ? " · POLAR NIGHT" : ""}</i>`;
  $("ifEye").textContent = `Ice fishing · ${lake.name}`;
  let sub = "", h = "";
  if (m === "walk") {
    const c = context(), dSled = Math.hypot(W.x - sledAt.x, W.z - sledAt.z), onIce = !!lakeAt(W.x, W.z);
    sub = onIce ? `Chart depth ${depthAt(W.x, W.z, lake).toFixed(1)} m · Sled ${Math.round(dSled)} m` : `On shore · Sled ${Math.round(dSled)} m`;
    $("ifAct").disabled = !(c.kind === "sled" || c.kind === "hole" || c.kind === "drill");
    const tk = H.touch() ? "" : "Space / E";
    if (c.kind === "sled") { setAct("Sled & tackle", tk || "Tap"); h = "Swap augers, rods, reels, line and bait, recharge or refuel, or pack up for the day."; }
    else if (c.kind === "empty") { setAct(kitAug().power.includes("battery") ? "Battery flat" : "Out of fuel", "Back to the sled"); h = "Walk back to the sled to recharge, refuel or swap augers."; }
    else if (c.kind === "hole") { setAct("Sit & fish", tk || "Tap"); h = `Your hole. ${c.hole.depth.toFixed(1)} m to the bottom.`; }
    else if (c.kind === "drill") { setAct("Drill here", tk ? "Hold · " + tk : "Hold"); h = `About ${c.depth.toFixed(1)} m here. Hold to drill, or keep walking.`; }
    else if (c.kind === "shallow") { setAct("Too shallow", "Walk out"); h = `Only ${c.depth.toFixed(1)} m here. Walk further out.`; }
    else if (c.kind === "rotten") { setAct("Rotten ice", "Stay off it"); h = "The melt's eaten this ice through. Find sounder ice further out, or call it a season."; }
    else if (c.kind === "near") { setAct("Too close", "Another hole"); h = "Too close to another hole. Spread out a little."; }
    else if (c.kind === "other") { setAct("Other lake", "Ride there"); h = "That's a different lake. Ride the sled over to fish it."; }
    else { setAct("Drill here", "Walk onto the lake"); h = "Walk out onto the ice."; }
  } else if (m === "drill") {
    const a = kitAug();
    sub = `Ice ${Math.round(S.drillAt.ice * S.drill)} / ${S.drillAt.ice} cm`; $("ifAct").disabled = false;
    if (!S.running) { setAct("Pull cord", "Tap · Space / E"); h = "Tap to pull the starter cord."; }
    else if (a.start === "crank") { setAct("Crank", "Hold · Space / E"); h = S.drill > 0 ? `Cranking… ${Math.round(S.drill * 100)}%. Keep going.` : "Hold to crank the auger through the ice."; }
    else { setAct(a.start === "pull" ? "Throttle" : "Drill", "Hold · Space / E"); h = S.drill > 0 ? `Augering… ${Math.round(S.drill * 100)}%. Keep holding.` : (a.start === "pull" ? "Running. Hold the throttle to drill." : "Hold the trigger to drill."); }
  } else if (S.hole) {
    const B = kitBait(), live = B.live ? ` · ${D.packs[B.live] || 0} left` : "";
    sub = `Hole ${S.hole.depth.toFixed(1)} m · Lure ${S.L.toFixed(1)} m · ${B.name}${S.baitOn || !B.steal ? "" : " (gone)"}${live}`;
    const bite = S.fish.find(f => f.st === "bite"), nib = S.fish.find(f => f.st === "nibble" && f.seen);
    $("ifJig").classList.toggle("hot", !!bite);
    $("ifJig").firstChild.nodeValue = bite && m === "fish" ? "Set hook" : "Jig";
    const lureGone = B.hard && !(D.lures[B.hard] > 0);
    if (m === "fish" && lureGone) h = `No ${byId(LURES, B.hard).name.toLowerCase()} left. Open the tackle box and tie on something else.`;
    else if (m === "fish" && !S.baitOn && B.live && !bite && !nib) h = (D.packs[B.live] || 0) > 0 ? "Your bait is gone. Reel all the way up to rebait." : `Out of ${byId(LURES, B.live).name.toLowerCase()}. Switch bait in the tackle box.`;
    else if (m === "fish" && S.spookT > 0 && !bite && !nib) h = `Drilling noise spooked them. They'll drift back in about ${Math.ceil(S.spookT)} s.`;
    else if (m === "fish") h = bite ? "BITE! Set the hook now." : nib ? "Nibble. Wait for the hard pull." : S.L < .4 ? "Hold LET OUT to drop your jig. Watch the flasher for marks." : "Tap JIG to call fish over. Match their depth on the flasher.";
    else if (m === "fight") h = S.fight.tension > 82 ? "Ease off! Let it run." : "Hold REEL to bring it up. Let go when tension runs red.";
    else h = "Keep it or release it.";
  } else if (m === "gear") h = "Pick your gear, then head back out.";
  else if (m === "summary") h = "Done for now.";
  $("ifSub1").textContent = sub; $("ifHint").textContent = h;
  const a = kitAug(), ice = S.hole ? S.hole.ice : ICE.cm(lake);
  $("ifSub2").textContent = S.hole ? `${kitLine().name} · ${kitLine().lb} lb · ${kitRod().name}` : `${a.name} · ${inch(a.dia)} · ${a.cap === Infinity ? "no fuel needed" : S.left + " / " + a.cap + " holes"}`;
  $("ifSub3").textContent = `Ice ${ice} cm${ice < 25 ? " · soft, keep it short" : ""} · ${lakeMixWords(lake)}`;
  const wv = clamp(H.GS.warmth, 0, 100); $("ifWarm").firstChild.style.width = wv + "%"; $("ifWarm").classList.toggle("low", wv < 30);
  if (S.fight) { const t = clamp(S.fight.tension, 0, 100); $("ifTfill").style.width = t + "%"; $("ifTfill").style.background = t > 82 ? "var(--bad)" : t > 60 ? "var(--warm)" : "var(--pay)"; $("ifTLab").textContent = Math.round(t) + "%"; }
}
const lakeMixWords = L => SPECIES_ORDER.filter(k => L.mix[k]).map(k => SPECIES[k].name.replace("Brown ", "").replace("Arctic ", "")).join(", ").toLowerCase();

/* ---- flasher ---- */
let FW = 0;
function sizeFlasher() { const fl = $("ifFl"); if (!fl) return; const dpr = Math.min(2, devicePixelRatio || 1), f = fl.getBoundingClientRect(); FW = f.width; if (!FW) return; fl.width = FW * dpr; fl.height = FW * dpr; fl.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0); }
function drawFlasher() {
  if (!S.hole || !FW) return;
  const c = $("ifFl").getContext("2d"), w = FW, r = w / 2, bd = S.hole.depth, R = Math.max(10, Math.ceil((bd + 3) / 5) * 5), FONT = "'Barlow Semi Condensed', sans-serif";
  c.clearRect(0, 0, w, w);
  c.fillStyle = "#05080b"; c.beginPath(); c.arc(r, r, r - 1, 0, 7); c.fill();
  const ang = d => -Math.PI / 2 + (d / R) * Math.PI * 2 * .93;
  c.strokeStyle = "rgba(200,225,240,.18)"; c.lineWidth = 1; c.font = `600 ${Math.max(8, w * .065)}px ${FONT}`;
  c.fillStyle = "rgba(200,225,240,.5)"; c.textAlign = "center"; c.textBaseline = "middle";
  for (let d = 0; d <= R; d += R / 5) { const a = ang(d); c.beginPath(); c.moveTo(r + Math.cos(a) * (r - 4), r + Math.sin(a) * (r - 4)); c.lineTo(r + Math.cos(a) * (r - 10), r + Math.sin(a) * (r - 10)); c.stroke(); c.fillText(d, r + Math.cos(a) * (r - 20), r + Math.sin(a) * (r - 20)); }
  const ring = r - 8, mark = (d0, d1, col) => { c.strokeStyle = col; c.lineWidth = 7; c.beginPath(); c.arc(r, r, ring, ang(d0), ang(Math.max(d1, d0 + .08))); c.stroke(); };
  mark(0, .35, "#ff3b30"); mark(bd, bd + 1.4, "#ff3b30"); mark(bd + 1.4, bd + 2.2, "#ff9500");
  for (const f of S.fish) { if (Math.hypot(f.x, f.z) > .26 * f.d + .5 || Math.random() < .15) continue; mark(f.d - .15, f.d + .15 + f.kg * .05, f.kg < .5 ? "#3ddc5a" : f.kg < 2 ? "#ff9f0a" : "#ff3b30"); }
  if (S.L > .1) { const ld = S.L - S.kick; mark(ld - .06, ld + .06, "#d6ff3d"); }
  c.fillStyle = "#e9eff3"; c.font = `800 ${w * .16}px ${FONT}`; c.fillText(bd.toFixed(1), r, r - w * .03);
  c.font = `700 ${w * .065}px ${FONT}`; c.fillStyle = "rgba(200,225,240,.55)"; c.fillText("BOTTOM M", r, r + w * .11);
}

/* ---- the sled panel (tackle box + augers) and the tackle box at the hole ---- */
const bar = (v, max) => `<span class="ifmeter"><i style="width:${Math.round(clamp(v / max, 0, 1) * 100)}%"></i></span>`;
const row2 = (k, v) => `<div><span>${k}</span><b>${v}</b></div>`;
const chipH = (t, c) => `<span class="ifchip${c ? " " + c : ""}">${esc(t)}</span>`;
function cardRod(o) { return `<div class="ifst bars">${row2("Bite window", "×" + o.win.toFixed(2))}<div><span>Nibbles show</span>${bar(o.clear, 1)}</div></div>`; }
function cardReel(o) { return `<div class="ifst bars"><div><span>Drag smoothness</span>${bar(o.smooth + .08, 1.08)}</div>${row2("Retrieve", "×" + o.speed.toFixed(2))}</div>`; }
function cardLine(l) { return `<div class="ifst bars"><div><span>Strength</span>${bar(l.strength, 1.6)}</div><div><span>Stretch</span>${bar(l.stretch, .6)}</div><div><span>Visibility</span>${bar(l.vis, .7)}</div><div><span>Bite feel</span>${bar(l.feel - .8, .6)}</div>${row2("Pike bite-off", l.biteOff === 0 ? "Never" : l.biteOff > .09 ? "Likely" : "Rare")}${row2("Cold", l.ice ? "Ices up" : "Fine")}</div>`; }
function cardAug(a) {
  const noise = a.spook === 0 ? "Silent" : a.spook < 6 ? "Quiet" : a.spook < 15 ? "Noisy" : "Very loud";
  const start = a.start === "crank" ? "Crank by hand" : a.start === "pull" ? (a.startP < .5 ? "Pull cord, stubborn" : "Pull cord, easy") : "Trigger";
  return `<div class="ifst num">${row2("Hole", inch(a.dia))}${row2("Ice / sec", a.rate + " cm")}${row2(a.power.includes("battery") ? "Per charge" : a.cap === Infinity ? "Runs on" : "Per tank", a.cap === Infinity ? "Arms" : a.cap + " holes")}${row2("Start", start)}${row2("Noise", noise)}${row2("Fits fish to", fitKg(a.dia) > 50 ? "Any size" : fitKg(a.dia) + " kg")}</div>`;
}
function cardBait(b) {
  const best = Object.entries(b.aff).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k]) => chipH(SPECIES[k].name, "ok")).join("");
  const fish = b.size > 1.15 ? "Bigger fish" : b.size < .9 ? "Smaller fish" : "Any size";
  return `<div class="ifchips">${best}</div><div class="ifst">${row2("Fish it", b.style)}${row2("Draws", fish)}${row2("Scent", b.scent >= .9 ? "Strong" : b.scent > .2 ? "Some" : "None")}${row2("Gets stolen", b.steal === 0 ? "Never" : b.steal > .4 ? "Often" : "Sometimes")}</div>`;
}
const baitHave = b => [b.hard ? (D.lures[b.hard] > 0 ? chipH(byId(LURES, b.hard).name + " · in the box", "ok") : chipH("No " + byId(LURES, b.hard).name.toLowerCase(), "bad")) : "", b.live ? chipH(`${D.packs[b.live] || 0} ${byId(LURES, b.live).name.toLowerCase()} left`, (D.packs[b.live] || 0) > 0 ? "ok" : "bad") : ""].join("");
const condChip = (cat, id) => { const c = condOf(cat, id); return c < .995 ? chipH(`Used · ${Math.round(c * 100)}%`, "warn") : ""; };
const TABS_GEAR = [["auger", "Auger"], ["rod", "Rod"], ["reel", "Reel"], ["line", "Line"], ["bait", "Bait"]];
const NOTE = {
  auger: "Your auger is topped up whenever you come back here. Bigger holes let bigger fish through; loud engines keep fish off for a while.",
  rod: "A better rod shows you the bite sooner (a longer window to set the hook) and makes nibbles plain.",
  reel: "A smoother drag takes the spike out of a surge, so the line parts less. Better reels retrieve faster too.",
  line: "Respooling reels your line up. Strength sets how hard it can be pulled before it parts; stretch cushions surges but costs hooksets deep down; shy fish notice bright or thick line, more so in a clear lake.",
  bait: "Changing bait reels your line up. Live baits come out of the pack, one per baiting. Hard lures stay on until the line parts."
};
function gearList(cat, here) {
  // here: "gear" (the sled panel, everything you own) or "tackle" (the hole: bait and line only)
  if (cat === "bait") return BAITS.map(b => {
    const on = b.id === D.kit.bait, ready = baitReady(b) || (on && S.baitOn);
    return `<div class="ifit${on ? " on" : ""}${ready ? "" : " off"}"><div class="ifhd"><span class="ifnm">${esc(b.name)}</span></div><span class="ifloc">${esc(b.local)}</span><p class="ifnote">${esc(b.blurb)}</p>${cardBait(b)}<div class="ifchips">${baitHave(b)}</div>
      <button type="button" data-k="bait" data-id="${b.id}" ${on || !ready ? "disabled" : ""}>${on ? "On the hook" : ready ? "Tie it on" : baitWhy(b) + " · tackle shop"}</button></div>`;
  }).join("");
  const T2 = CAT_OF[cat], owned = T2.filter(o => D.own[cat][o.id]);
  const card = { rod: cardRod, reel: cardReel, line: cardLine, auger: cardAug }[cat];
  return owned.map(o => {
    const on = o.id === D.kit[cat];
    const lbl = cat === "line" ? (on ? "On the reel" : "Respool") : cat === "auger" ? (on ? "Carrying" : "Take this one") : on ? "Fishing with it" : "Use this one";
    return `<div class="ifit${on ? " on" : ""}"><div class="ifhd"><span class="ifnm">${esc(o.name)}</span>${cat === "line" ? `<span class="ifpr">${o.lb} lb</span>` : ""}</div>${o.local ? `<span class="ifloc">${esc(o.local)}</span>` : cat === "line" ? `<span class="ifloc">${esc(o.kind)}</span>` : ""}
      <p class="ifnote">${esc(o.blurb)}</p>${card(o)}<div class="ifchips">${condChip(cat, o.id)}</div><button type="button" data-k="${cat}" data-id="${o.id}" ${on ? "disabled" : ""}>${lbl}</button></div>`;
  }).join("") + (owned.length < T2.length ? `<p class="ifnote" style="grid-column:1/-1">${T2.length - owned.length} more in the tackle shop by the quay.</p>` : "");
}
function pickGear(cat, id) {
  if (cat === "bait") {
    const b = byId(BAITS, id); if (!b || !baitReady(b)) return;
    D.kit.bait = id; S.baitOn = false; S.warnBait = false; S.L = 0; S.act = 0; buildLure(); rebait(true);
    for (const f of S.fish) if (f.st === "approach" || f.st === "nibble" || f.st === "bite") { f.st = "roam"; f.cd = 2; }
    cue(`${b.name} on. Let it down.`, "#e9eff3", false, 1.4);
  } else if (cat === "auger") { equip(id); cue(`Took the ${kitAug().name.toLowerCase()}`, "#e9eff3", false, 1.2); }
  else {
    D.kit[cat] = id; S.L = 0; S.act = 0;
    for (const f of S.fish) if (f.st === "approach" || f.st === "nibble" || f.st === "bite") { f.st = "roam"; f.cd = 2; }
    const o = byId(CAT_OF[cat], id); cue(cat === "line" ? `Respooled with ${o.name.toLowerCase()}` : `Rigged the ${o.name.toLowerCase()}`, "#e9eff3", false, 1.4);
  }
  H.save();
}
function renderTabs(boxId, tabs, cur, onPick) {
  const box = $(boxId); box.innerHTML = tabs.map(([k, l]) => `<button type="button" class="iftab${k === cur ? " on" : ""}" data-t="${k}">${l}</button>`).join("");
  box.querySelectorAll("button").forEach(b => b.onclick = () => onPick(b.dataset.t));
}
function openGear(tab) {
  S.prevMode = S.mode; S.mode = "gear"; S.left = kitAug().cap; S.running = false; S.gearTab = tab || S.gearTab || "auger";
  renderGear(); $("ifGear").hidden = false; syncUI(); panelFocus("ifGear");
}
function renderGear() {
  renderTabs("ifGearTabs", TABS_GEAR, S.gearTab, t => { S.gearTab = t; renderGear(); panelFocus("ifGear"); });
  $("ifGearNote").textContent = NOTE[S.gearTab];
  $("ifGearList").innerHTML = gearList(S.gearTab, "gear");
  $("ifGearList").querySelectorAll("button[data-k]").forEach(b => b.onclick = () => { pickGear(b.dataset.k, b.dataset.id); renderGear(); panelFocus("ifGear"); });
}
function closeGear() { if (S.mode !== "gear") return; $("ifGear").hidden = true; S.mode = "walk"; syncUI(); }
function openTackle(tab) {
  if (S.mode !== "fish") return;
  S.mode = "bait"; S.tackleTab = tab || S.tackleTab || "bait"; renderTackle(); $("ifTackle").hidden = false; syncUI(); panelFocus("ifTackle");
}
function renderTackle() {
  renderTabs("ifTackleTabs", [["bait", "Bait"], ["line", "Line"]], S.tackleTab, t => { S.tackleTab = t; renderTackle(); panelFocus("ifTackle"); });
  $("ifTackleNote").textContent = NOTE[S.tackleTab];
  $("ifTackleList").innerHTML = gearList(S.tackleTab, "tackle");
  $("ifTackleList").querySelectorAll("button[data-k]").forEach(b => b.onclick = () => { pickGear(b.dataset.k, b.dataset.id); closeTackle(); });
}
function closeTackle() { if (S.mode !== "bait") return; $("ifTackle").hidden = true; S.mode = "fish"; syncUI(); }
function showIntro() { S.prevMode = S.mode; S.mode = "help"; $("ifIntro").hidden = false; syncUI(); panelFocus("ifIntro", "ifStart"); }
function closeIntro() { if (S.mode !== "help") return; $("ifIntro").hidden = true; S.mode = S.prevMode && S.prevMode !== "help" ? S.prevMode : "walk"; D.intro = true; syncUI(); }
function closePanels() { for (const id of ["ifGear", "ifTackle", "ifIntro", "ifCatch"]) { const e = $(id); if (e) e.hidden = true; } }

/* ---- keyboard and pad focus for the cards and panels ---- */
let PF = { id: null, el: null };
function panelFocus(id, prefer) {
  PF.id = id; const root = $(id); if (!root) return;
  const els = focusables(root); PF.el = (prefer && $(prefer) && !$(prefer).disabled ? $(prefer) : null) || els.find(e => e.classList.contains("ifpri")) || els[0] || null;
  paintPF();
}
function focusables(root) { return [...root.querySelectorAll("button")].filter(b => !b.disabled && b.offsetParent !== null); }
function paintPF() { document.querySelectorAll(".iffoc").forEach(e => e.classList.remove("iffoc")); if (PF.el && PF.el.isConnected && !PF.el.disabled) { PF.el.classList.add("iffoc"); PF.el.scrollIntoView({ block: "nearest" }); } }
function pfMove(dx, dy) {
  const root = PF.id && $(PF.id); if (!root || root.hidden) return;
  const els = focusables(root); if (!els.length) return;
  if (!PF.el || !els.includes(PF.el)) { PF.el = els[0]; paintPF(); return; }
  const c = PF.el.getBoundingClientRect(), cx = c.left + c.width / 2, cy = c.top + c.height / 2; let best = null, bs = 1e9;
  for (const e of els) { if (e === PF.el) continue; const p = e.getBoundingClientRect(), ex = p.left + p.width / 2 - cx, ey = p.top + p.height / 2 - cy, along = ex * dx + ey * dy; if (along <= 2) continue; const sc = along + (Math.abs(ex * dy) + Math.abs(ey * dx)) * 2.2; if (sc < bs) { bs = sc; best = e; } }
  if (best) { PF.el = best; paintPF(); }
}
function pfActivate() { if (PF.el && PF.el.isConnected && !PF.el.disabled) PF.el.click(); }
const openPanelId = () => ["ifCatch", "ifSum", "ifIntro", "ifGear", "ifTackle", "ifShop", "ifBuy"].find(id => $(id) && !$(id).hidden) || null;
function panelBack() {
  const id = openPanelId();
  if (id === "ifCatch") closeCatch(false);
  else if (id === "ifSum") { $("ifSum").hidden = true; S.mode = "walk"; syncUI(); }
  else if (id === "ifIntro") closeIntro();
  else if (id === "ifGear") closeGear();
  else if (id === "ifTackle") closeTackle();
  else if (id === "ifShop") closeShop();
  else if (id === "ifBuy") closeBuyer();
  else return false;
  return true;
}

/* ---- wiring: buttons, the touch joystick, dragging the view ---- */
function wireUI() {
  const hold = (id, key, onDown) => {
    const b = $(id);
    const on = e => { e.preventDefault(); if (b.disabled) return; S.tk[key] = true; b.classList.add("on"); onDown && onDown(); try { b.setPointerCapture(e.pointerId); } catch (_) { } };
    const off = () => { S.tk[key] = false; b.classList.remove("on"); };
    b.addEventListener("pointerdown", on); ["pointerup", "pointercancel", "lostpointercapture"].forEach(ev => b.addEventListener(ev, off));
    b.addEventListener("contextmenu", e => e.preventDefault());
  };
  hold("ifAct", "act", actPress); hold("ifDown", "down"); hold("ifUp", "up");
  $("ifJig").addEventListener("pointerdown", e => { e.preventDefault(); jig(); });
  $("ifStand").onclick = stand; $("ifTackleB").onclick = () => openTackle();
  $("ifStart").onclick = closeIntro; $("ifHelpB").onclick = () => { if (S.mode === "walk" || S.mode === "fish") showIntro(); };
  $("ifTabB").onclick = () => H.TABLET.toggle(); $("ifMenuB").onclick = () => H.settings();
  $("ifKeep").onclick = () => closeCatch(true); $("ifRelease").onclick = () => closeCatch(false);
  $("ifGearClose").onclick = closeGear; $("ifTackleClose").onclick = closeTackle;
  $("ifPack").onclick = () => { $("ifGear").hidden = true; S.mode = "walk"; packUp(); };
  $("ifAgain").onclick = () => { $("ifSum").hidden = true; S.mode = "walk"; syncUI(); };
  $("ifExit").onclick = () => exitToSled();
  { const j = $("ifJoy"), k = $("ifKnob"); let id = null;
    const mv = e => { const r = j.getBoundingClientRect(); let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2); const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } S.joy = { x, y: -y }; k.style.translate = `${x * r.width * .32}px ${y * r.height * .32}px`; };
    j.addEventListener("pointerdown", e => { id = e.pointerId; j.setPointerCapture(id); mv(e); e.stopPropagation(); });
    j.addEventListener("pointermove", e => { if (e.pointerId === id) mv(e); });
    const end = () => { id = null; S.joy = { x: 0, y: 0 }; k.style.translate = "0 0"; };
    j.addEventListener("pointerup", end); j.addEventListener("pointercancel", end); }
  const cv = H.renderer.domElement; let drag = null;
  cv.addEventListener("pointerdown", e => { if (!S.on) return; drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
  cv.addEventListener("pointermove", e => { if (!S.on || !drag || drag.id !== e.pointerId) return; const dy = (e.clientX - drag.x) * .006; if (S.mode === "walk") cam.H -= dy; else cam.userYaw -= dy; cam.pitchAdj = clamp((cam.pitchAdj || 0) + (e.clientY - drag.y) * .004, -.25, .6); drag.x = e.clientX; drag.y = e.clientY; });
  ["pointerup", "pointercancel"].forEach(ev => cv.addEventListener(ev, () => drag = null));
  cv.addEventListener("wheel", e => { if (!S.on) return; e.preventDefault(); cam.zoom = clamp((cam.zoom || 1) * (1 + Math.sign(e.deltaY) * .1), .6, 1.8); }, { passive: false });
  // a card that opens under a finger must not take the synthetic click
  for (const id of ["ifCatch", "ifSum", "ifIntro", "ifGear", "ifTackle"]) $(id).addEventListener("touchend", e => { if (performance.now() - (S.openT || 0) < 350) e.preventDefault(); }, { passive: false });
}

/* =================================================================================================================
   THE TACKLE SHOP (Nordkinn Fisk & Friluft, by the quay) and THE FISH BUYER (the fiskemottak on the pier)
   ================================================================================================================= */
const SH = { tab: "rods" };
const SHOP_TABS = [["rods", "Rods"], ["reels", "Reels"], ["lines", "Lines"], ["augers", "Augers"], ["lures", "Lures & bait"]];
const CAT1 = { rods: "rod", reels: "reel", lines: "line", augers: "auger" };
function openShop(tab) {
  injectUI(); H.TABLET.close(true);
  SH.tab = tab || SH.tab; renderShop(); $("ifShop").hidden = false; S.openT = performance.now(); panelFocus("ifShop");
}
function closeShop() { $("ifShop").hidden = true; H.save(); }
function renderShop() {
  const cash = H.GS.cash, t = SH.tab, list = GEAR[t];
  let items = "";
  if (t === "lures") items = list.map(l => {
    const have = l.kind === "live" ? (D.packs[l.id] || 0) : (D.lures[l.id] > 0 ? 1 : 0), b = byId(BAITS, l.bait);
    const lbl = l.kind === "live" ? `Buy a pack · ${$$(l.price)}` : have ? "In your tackle box" : `Buy · ${$$(l.price)}`;
    const dis = (l.kind === "hard" && have) || cash < l.price;
    return `<div class="ifit${have ? " on" : ""}"><div class="ifhd"><span class="ifnm">${esc(l.name)}</span><span class="ifpr">${$$(l.price)}</span></div><span class="ifloc">${esc(l.local)} · ${l.kind === "live" ? `pack of ${l.count}` : "hard lure, bought once"}</span>
      <p class="ifnote">${esc(l.blurb)}</p><div class="ifchips">${chipH("For: " + b.name, "")}${l.kind === "live" ? chipH(`${have} in the box`, have ? "ok" : "") : have ? chipH("Owned", "ok") : ""}${l.kind === "hard" && D.lostOnce && D.lostOnce[l.id] ? chipH("Lost one", "bad") : ""}</div>
      <button type="button" data-buy="lures:${l.id}" ${dis ? "disabled" : ""}>${dis && !(l.kind === "hard" && have) ? `${$$(l.price)} · not enough cash` : lbl}</button></div>`;
  }).join("");
  else {
    const cat = CAT1[t], card = { rod: cardRod, reel: cardReel, line: cardLine, auger: cardAug }[cat];
    items = list.map(o => {
      const own = !!D.own[cat][o.id], on = D.kit[cat] === o.id, dis = own || cash < o.price;
      const head = cat === "line" ? `<span class="ifloc">${esc(o.kind)} · ${o.lb} lb</span>` : o.local ? `<span class="ifloc">${esc(o.local)}${o.tier ? " · tier " + o.tier : ""}</span>` : "";
      return `<div class="ifit${own ? " on" : ""}"><div class="ifhd"><span class="ifnm">${esc(o.name)}</span><span class="ifpr">${$$(o.price)}</span></div>${head}
        <p class="ifnote">${esc(o.blurb)}</p>${card(o)}<div class="ifchips">${own ? chipH(on ? "Owned · rigged" : "Owned", "ok") : ""}${condChip(cat, o.id)}</div>
        <button type="button" data-buy="${t}:${o.id}" ${dis ? "disabled" : ""}>${own ? "Owned" : cash < o.price ? `${$$(o.price)} · not enough cash` : `Buy · ${$$(o.price)}`}</button></div>`;
    }).join("");
  }
  $("ifShop").innerHTML = `<div class="ifphd"><div><div class="ifey">Nordkinn Fisk &amp; Friluft · Kjøllefjord</div><h2>Tackle shop</h2></div>
      <div style="display:flex;gap:12px;align-items:center"><span class="cash num">${$$(cash)}</span><button type="button" class="ifx" id="ifShopX" aria-label="Close the shop">✕</button></div></div>
    <div class="iftabs" id="ifShopTabs"></div>
    <p class="ifnote">${{ rods: "Better rods show the bite sooner (a longer window to set the hook) and make nibbles plain.", reels: "A smoother drag takes the spikes out of a run, so the line parts less, and better reels bring line in faster.", lines: "Line strength is where it parts. Braid is strong and you feel everything, but fish see it, more so in a clear lake. Fluoro all but vanishes, and is weaker for the money.", augers: "Bigger holes let bigger fish through. Gas augers are fast and loud: the fish keep off for a while after.", lures: "Live bait comes in packs, one per baiting, and gets stolen. Hard lures are yours until a fish breaks the line." }[t]}</p>
    <div class="ifgrid" id="ifShopList">${items}</div>
    <p class="ifnote">New gear goes straight into the tackle box on the sled and gets rigged. Switch what you fish with at the sled, out on the ice. <b>Esc</b> (pad <b>B</b>) closes.</p>`;
  renderTabs("ifShopTabs", SHOP_TABS, t, k => { SH.tab = k; renderShop(); panelFocus("ifShop"); });
  $("ifShopX").onclick = closeShop;
  $("ifShop").querySelectorAll("button[data-buy]").forEach(b => b.onclick = () => { const [tt, id] = b.dataset.buy.split(":"); buy(tt, id); });
}
function buy(t, id) {
  const o = byId(GEAR[t], id); if (!o) return;
  if (H.GS.cash < o.price) { H.toast(`That's ${$$(o.price)}. You have ${$$(H.GS.cash)}.`, "warn"); return; }
  if (t === "lures") {
    if (o.kind === "hard" && D.lures[id] > 0) return;
    H.GS.cash -= o.price;
    if (o.kind === "live") { D.packs[id] = (D.packs[id] || 0) + o.count; H.toast(`${o.name}: ${D.packs[id]} in the box.`, "good"); }
    else { D.lures[id] = 1; H.toast(`${o.name} in the tackle box. Tie it on at the hole.`, "good"); }
  } else {
    const cat = CAT1[t]; if (D.own[cat][id]) return;
    H.GS.cash -= o.price; D.own[cat][id] = cat === "line" ? 1 : { c: 1 }; D.kit[cat] = id;
    H.toast(`${o.name}: ${cat === "line" ? "spooled on" : "rigged"} and in the tackle box.`, "good");
  }
  H.save(); renderShop(); panelFocus("ifShop", `x`);
}
// today's prices at the fiskemottak: each species wanders ±15-20% day to day
function dayPrice(sp) { const D0 = H.CAL.dayIndex(); let h = (D0 * 2654435761 + sp.length * 40503 + sp.charCodeAt(0) * 97) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return SPECIES[sp].price * (0.85 + 0.35 * ((h >>> 8) / 16777216)); }
const buyValue = c => Math.max(1, Math.round(c.kg * dayPrice(c.sp) * freshK(c)));
function openBuyer() { injectUI(); H.TABLET.close(true); renderBuyer(); $("ifBuy").hidden = false; S.openT = performance.now(); panelFocus("ifBuy"); }
function closeBuyer() { $("ifBuy").hidden = true; H.save(); }
function renderBuyer() {
  const rows = D.cooler.map((c, i) => `<div class="ifr"><div><b>${esc(SPECIES[c.sp].name)} · ${c.kg.toFixed(2)} kg</b><em>${c.cm} cm · ${esc(c.lake || "")} · ${esc(freshWord(c))}</em></div><span class="v num">${$$(buyValue(c))}</span><button type="button" data-sell="${i}">Sell</button></div>`).join("");
  const tot = D.cooler.reduce((a, c) => a + buyValue(c), 0), taken = D.orders.taken.length;
  $("ifBuy").innerHTML = `<div class="ifphd"><div><div class="ifey">Fiskemottak · Kjøllefjord quay</div><h2>Fish buyer</h2></div>
      <div style="display:flex;gap:12px;align-items:center"><span class="cash num">${$$(H.GS.cash)}</span><button type="button" class="ifx" id="ifBuyX" aria-label="Close">✕</button></div></div>
    <div class="ifboard"><span><i>TODAY, PER KG</i></span>${SPECIES_ORDER.map(k => `<span>${esc(SPECIES[k].name)} <b>${$$(dayPrice(k))}</b></span>`).join("")}</div>
    ${D.cooler.length ? `<div class="ifrows">${rows}</div>` : `<p class="ifnote">The cooler's empty. The lakes up on the fell are full of char and trout.</p>`}
    ${taken ? `<p class="ifnote">You've promised fresh fish to ${taken === 1 ? "a customer" : taken + " customers"} (see Parcels). Sell what you don't need for them.</p>` : `<p class="ifnote">Some homes and cabins pay better for fresh fish brought to the door: look for FRESH FISH in Parcels.</p>`}
    <div class="row" style="display:flex;gap:8px;justify-content:flex-end"><button type="button" id="ifBuyClose">Keep them</button><button type="button" class="ifpri" id="ifSellAll" ${D.cooler.length ? "" : "disabled"}>Sell the lot · ${$$(tot)}</button></div>`;
  $("ifBuyX").onclick = closeBuyer; $("ifBuyClose").onclick = closeBuyer;
  $("ifSellAll").onclick = () => sell(D.cooler.map((_, i) => i));
  $("ifBuy").querySelectorAll("button[data-sell]").forEach(b => b.onclick = () => sell([+b.dataset.sell]));
}
function sell(idx) {
  idx = idx.filter(i => D.cooler[i]).sort((a, b) => b - a); if (!idx.length) return;
  let tot = 0, kg = 0; for (const i of idx) { const c = D.cooler[i]; tot += buyValue(c); kg += c.kg; D.cooler.splice(i, 1); }
  H.GS.cash += tot; D.log.sold = (D.log.sold || 0) + tot;
  H.toast(`Sold ${idx.length > 1 ? idx.length + " fish" : "a fish"}, ${kg.toFixed(1)} kg: +${$$(tot)}`, "good");
  H.save(); renderBuyer(); panelFocus("ifBuy", D.cooler.length ? "ifSellAll" : "ifBuyClose");
}

/* =================================================================================================================
   FRESH-FISH PARCELS: a few homes and cabins post orders for fresh fish at the door. Take one in Parcels, bring the
   fish from your cooler (no more than two days old), and stop there: it's handed over and paid. Pay is a delivery fee
   (polar night ×1.5 like any delivery) plus the fish at 1.4× the quay price.
   ================================================================================================================= */
const ORDER_PREMIUM = 1.4, ORDER_LIFE = 48;
function orderSites() { return H.SITES.filter(s => s.x !== undefined && (s.type === "home" || s.type === "cabin") && s.kind !== "farm"); }
const siteById = id => H.SITES.find(s => s.id === id);
function orderPay(o) { return Math.round(o.fee * H.payMul() + o.kg * (o.sp ? SPECIES[o.sp].price : 9) * ORDER_PREMIUM); }
function postOrders() {
  const O = D.orders, busy = new Set([...O.posted, ...O.taken].map(o => o.site)), sites = orderSites().filter(s => !busy.has(s.id));
  const want = 3 - O.posted.length;
  for (let k = 0; k < want && sites.length; k++) {
    const s = sites.splice((Math.random() * sites.length) | 0, 1)[0];
    const any = Math.random() < .4, sp = any ? null : SPECIES_ORDER[(Math.random() * SPECIES_ORDER.length) | 0];
    const kg = +(any ? 1.5 + Math.random() * 2.5 : sp === "pike" ? 2 + Math.random() * 3 : sp === "perch" ? .6 + Math.random() * 1 : .8 + Math.random() * 1.7).toFixed(1);
    const dist = Math.hypot(s.x - H.depot.x, s.z - H.depot.z);
    const why = pickWhy(s, sp);
    O.posted.push({ id: ++O.seq, site: s.id, sp, kg, fee: Math.round((20 + dist * .03) / 5) * 5, exp: +(NOWH() + ORDER_LIFE).toFixed(2), why });
  }
}
function pickWhy(s, sp) {
  const n = sp ? SPECIES[sp].name.toLowerCase() : "fish";
  const L = s.type === "home" ? [`Fried ${n} for Sunday dinner.`, `The grandchildren are up from Oslo and want ${n}.`, `Lutefisk is off the menu. ${sp ? "Fresh " + n : "Anything fresh"}, please.`, "A neighbour's birthday. They asked for fish, not cake."]
    : [`The herders are in for the week and sick of reindeer.`, `Smoking ${n} for the winter store.`, `Trying a new recipe off the radio.`];
  return L[(Math.random() * L.length) | 0];
}
// cooler fish that would fill an order (fresh only), smallest set by greedily taking the biggest first
function fillFor(o) {
  const ok = D.cooler.map((c, i) => ({ c, i })).filter(({ c }) => (!o.sp || c.sp === o.sp) && freshK(c) >= .999).sort((a, b) => b.c.kg - a.c.kg);
  const out = []; let kg = 0; for (const x of ok) { if (kg >= o.kg - 1e-6) break; out.push(x); kg += x.c.kg; }
  return kg >= o.kg - 1e-6 ? out : null;
}
function takeOrder(id) {
  const O = D.orders, k = O.posted.findIndex(o => o.id === id); if (k < 0) return;
  if (O.taken.length >= 3) { H.toast("You've promised fish to three places already.", "warn"); return; }
  const o = O.posted.splice(k, 1)[0]; O.taken.push(o);
  H.toast(`Promised ${o.kg} kg of ${o.sp ? SPECIES[o.sp].name.toLowerCase() : "fresh fish"} to ${shortName(siteById(o.site))}. Bring it within two days.`);
  H.save(); H.TABLET.refresh();
}
const shortName = s => s ? s.name.replace(/ (herder cabin|wind farm|lighthouse)$/, "") : "?";
function deliverOrders(site) {
  const O = D.orders;
  for (const o of O.taken.slice()) {
    if (o.site !== site.id) continue;
    const fill = fillFor(o);
    if (!fill) { if (!o.warned || NOWH() - o.warned > 1) { o.warned = NOWH(); H.toast(`${shortName(site)} wanted ${o.kg} kg of fresh ${o.sp ? SPECIES[o.sp].name.toLowerCase() : "fish"}. Not enough in the cooler yet.`, "warn"); } continue; }
    for (const x of fill.map(x => x.i).sort((a, b) => b - a)) D.cooler.splice(x, 1);
    const pay = orderPay(o); H.GS.cash += pay; D.log.sold = (D.log.sold || 0) + pay;
    O.taken.splice(O.taken.indexOf(o), 1);
    H.toast(`Fresh fish to ${shortName(site)}: +${$$(pay)}${H.payMul() > 1 ? " (polar night ×1.5 on the run)" : ""}`, "good");
    H.bumpDelivered(); H.mailVisit(site);
    H.save(); H.TABLET.refresh();
  }
}
// the Parcels app's FRESH FISH section (tracklayer puts it in and binds the buttons)
function parcelsHtml(A) {
  const O = D.orders; if (!O.posted.length && !O.taken.length) return "";
  let h = A.sec("Fresh fish", `${D.cooler.length} in the cooler · ${D.cooler.reduce((a, c) => a + c.kg, 0).toFixed(1)} kg`);
  const card = (o, taken) => {
    const s = siteById(o.site); if (!s) return "";
    const fill = fillFor(o), what = `${o.kg} kg of ${o.sp ? SPECIES[o.sp].name.toLowerCase() : "any fresh fish"}`;
    return A.tabCard({ tf: "ff:" + o.id, mini: `depot|${s.id}`, title: `Fresh fish: ${what}`,
      chips: A.chip("FRESH FISH", "grooming") + (fill ? A.chip("IN THE COOLER", "ok") : "") + A.chip(`BY ${H.CAL.now(o.exp - H.CAL.off).label.toUpperCase()} ${H.CAL.now(o.exp - H.CAL.off).time}`, "due"),
      meta: `to ${A.esc(shortName(s))} · ${(Math.hypot(s.x - H.P.x, s.z - H.P.z) / 1000).toFixed(1)} km from you`,
      note: `${A.esc(o.why)} ${fill ? "You've got it: stop there and it's handed over." : "Catch it first (no more than two days in the cooler)."}`,
      pay: A.fmtCash(orderPay(o)), act: taken ? null : "fish:" + o.id, actLabel: "PROMISE IT", blocked: O.taken.length >= 3 });
  };
  for (const o of O.taken) h += card(o, true);
  for (const o of O.posted) h += card(o, false);
  return h;
}
function parcelsBind(el) { for (const b of el.querySelectorAll("[data-act^='fish:']")) b.addEventListener("click", () => takeOrder(+b.dataset.act.split(":")[1])); }
function beacon(s) { return D && D.orders.taken.some(o => o.site === s.id && fillFor(o)); }

/* =================================================================================================================
   THE LOGBOOK: an "On the ice" page under the two notebook pages
   ================================================================================================================= */
function logbookHtml(A) {
  const L = D.log, best = L.best || {}, top = Object.entries(best).sort((a, b) => b[1].kg - a[1].kg)[0];
  const pick = (v, tiers) => { for (const [lim, t] of tiers) if (v < lim) return typeof t === "function" ? t(v) : t; return ""; };
  const I = Infinity;
  const rows = [
    { k: "fish", label: "Fish caught", v: String(L.n), u: L.n === 1 ? "fish" : "fish", m: pick(L.n, [[1, "Not a nibble yet. The auger's still shiny."], [2, "One. It counts."], [25, "Getting the feel of a bite."], [100, "The fish buyer knows your boots."], [I, "Half the char on the plateau have heard of you."]]) },
    { k: "kg", label: "Kilos landed", v: L.kg >= 100 ? Math.round(L.kg) : L.kg.toFixed(1), u: "kg", m: pick(L.kg, [[.1, "Nothing on the scales."], [10, "A few good suppers."], [100, "A freezer's worth."], [I, "You could feed Gamvik."]]) },
    { k: "big", label: "Biggest fish", v: top ? top[1].kg.toFixed(2) : "–", u: top ? "kg" : "", m: top ? `${SPECIES[top[0]].name}, ${top[1].cm} cm, ${top[1].lake}, ${top[1].at}.` : "Still waiting for the one." },
    { k: "day", label: "Best day", v: (L.bestDayKg || 0).toFixed(1), u: "kg", m: L.bestDayCash ? `Worth ${A.fmtCash(L.bestDayCash)} in the cooler.` : "No proper day out yet." },
    { k: "sold", label: "Fish money", v: A.fmtCash(L.sold || 0).replace("$", ""), u: "$", m: L.sold ? pick(L.sold, [[100, "Beer money."], [1000, "It's paying for the bait, anyway."], [I, "Who needs freight?"]]) : "Nothing sold yet. The fiskemottak's on the pier." }
  ];
  const row = r => `<div class="tlr" data-tf="lb:${r.k}"><div class="tlv"><b>${A.esc(r.v)}</b><u>${A.esc(r.u)}</u></div><div class="tlt"><span class="tll">${A.esc(r.label)}</span><span class="tlm">${A.esc(r.m)}</span></div></div>`;
  const sp = SPECIES_ORDER.map(k => { const b = best[k]; return `<div class="tlr" data-tf="lb:pb:${k}"><div class="tlv"><b>${b ? b.kg.toFixed(2) : "–"}</b><u>${b ? "kg" : ""}</u></div><div class="tlt"><span class="tll">${A.esc(SPECIES[k].name)} · <i style="text-transform:none;letter-spacing:0">${A.esc(SPECIES[k].local)}</i></span><span class="tlm">${b ? A.esc(`${b.cm} cm, ${b.lake}, ${b.at}.`) : "Not yet."}</span></div></div>`; }).join("");
  return `<div class="tlk tlice"><section class="tlp"><h3 class="tlh">On the ice<span>THE LAKES</span></h3>${rows.map(row).join("")}</section>
    <section class="tlp"><h3 class="tlh">Personal bests<span>BIGGEST OF EACH</span></h3>${sp}</section></div>`;
}

/* =================================================================================================================
   STEPPING OFF AND PACKING UP, the E context, input routing, and the per-frame tick from the game
   ================================================================================================================= */
const CTX = { t: 0, v: null };
// what E (or L3, or the touch button) would do right now on the sled or on foot: fish here, the shop, the buyer
function ctxNow() {
  if (!H.started() || S.on || H.GS.dead || (H.busy && H.busy())) return null;   // not during a licence-school course
  const foot = H.FOOT.on, x = foot ? H.FOOT.x : H.P.x, z = foot ? H.FOOT.z : H.P.z;
  const stopped = foot || Math.hypot(H.P.vx, H.P.vz) < 1.2;
  if (!stopped) return null;
  const FS = H.fishSites || {};
  if (FS.shop && Math.hypot(x - FS.shop.x, z - FS.shop.z) < (foot ? 6 : 14)) return { kind: "shop" };
  if (FS.buyer && Math.hypot(x - FS.buyer.x, z - FS.buyer.z) < (foot ? 6 : 15)) return { kind: "buyer" };
  if (foot) return null;
  if (performance.now() - CTX.t > 300 || !CTX.v || Math.hypot(CTX.x - x, CTX.z - z) > 3) { CTX.t = performance.now(); CTX.x = x; CTX.z = z; CTX.v = lakeNear(x, z, 40); }
  if (CTX.v) return { kind: "fish", spot: CTX.v, ice: ICE.cm(CTX.v.lake) };
  return null;
}
function ctx() {
  const c = ctxNow(); if (!c) return false;
  if (c.kind === "shop") { openShop(); return true; }
  if (c.kind === "buyer") { openBuyer(); return true; }
  if (c.kind === "fish") { if (c.ice < ICE.minCm) { H.toast(c.ice <= 0 ? "Open water. The lakes freeze again in November." : `Only ${c.ice} cm of ice on ${c.spot.lake.name}. Stay off it.`, "bad"); return true; } start(c.spot); return true; }
  return false;
}
function hint() {
  const c = ctxNow(); if (!c) return "";
  const k = H.touch() ? "" : "E: ";
  if (c.kind === "shop") return `${k}Nordkinn Fisk & Friluft, the tackle shop${H.touch() ? " · tap SHOP" : ""}`;
  if (c.kind === "buyer") return D.cooler.length ? `${k}sell your catch at the fish buyer · ${D.cooler.length} in the cooler${H.touch() ? " · tap SELL" : ""}` : "The fish buyer. Nothing in the cooler yet.";
  if (c.ice < ICE.minCm) return c.ice <= 0 ? "" : `${c.spot.lake.name}: only ${c.ice} cm of ice. Too thin to walk on.`;
  return `${k}get off and fish ${c.spot.lake.name} · ice ${c.ice} cm · ${lakeMixWords(c.spot.lake)}${H.touch() ? " · tap FISH" : ""}`;
}
function ctxLabel() { const c = ctxNow(); return !c ? null : c.kind === "shop" ? "SHOP" : c.kind === "buyer" ? "SELL" : c.ice >= ICE.minCm ? "FISH" : null; }

function start(spot) {
  injectUI();
  lake = spot.lake;
  sledAt.x = H.P.x; sledAt.z = H.P.z;
  ROOTY = lake.lv + .075 - .02;                                       // the ice top (the lake's level plus its skin of snow) is local y .02, as in the prototype
  // step off on the lake side of the sled; the screen's right-hand way points at the ice
  const sx = Math.cos(H.P.yaw), sz = -Math.sin(H.P.yaw), toX = spot.x - H.P.x, toZ = spot.z - H.P.z, side = (toX * sx + toZ * sz) >= 0 ? 1 : -1;
  W.x = H.P.x + sx * 1.5 * side; W.z = H.P.z + sz * 1.5 * side; W.speed = 0; W.phase = 0;
  const dx = spot.d > 1 ? spot.x - W.x : sx * side, dz = spot.d > 1 ? spot.z - W.z : sz * side;
  W.yaw = Math.atan2(dx, dz); cam.H = W.yaw; cam.yaw = cam.H - Math.PI / 2; cam.userYaw = 0; cam.pitchAdj = 0; cam.zoom = 1;
  cam.tx = W.x; cam.tz = W.z; cam.ty = 1.4; cam.dist = 7; cam.pitch = .22;
  holes = []; S.fish = []; S.hole = null; S.fight = null; S.L = 0; S.kick = 0; S.act = 0; S.drillAt = null; S.mode = "walk"; S.baitOn = false; S.warnBait = false;
  S.kb = { down: false, up: false, act: false }; S.tk = { down: false, up: false, act: false }; S.pd = { down: false, up: false, act: false }; S.pad = null;
  S.sess = { kept: [], landed: 0, kg: 0 };
  build();
  S.on = true;
  document.body.classList.add("fishing"); $("ifHud").hidden = false; syncUI(); hudTick();
  H.onStart();
  const ice = ICE.cm(lake);
  H.toast(`${lake.name}: ${ice} cm of ice. ${lakeMixWords(lake).replace(/^./, c => c.toUpperCase())} in here.`);
  if (H.CAL.isPolarNight()) setTimeout(() => S.on && cue("Polar night. Headlamp on; the glow jig shines.", "#9dff7a", false, 2.4), 1200);
  if (!D.intro) showIntro();
  return true;
}
function stop() {
  if (!S.on) return;
  closePanels(); for (const id of ["ifSum"]) $(id).hidden = true;
  clearFish(); teardown();
  S.on = false; S.mode = "off"; S.hole = null; S.fight = null; S.joy = { x: 0, y: 0 };
  document.body.classList.remove("fishing"); $("ifHud").hidden = true;
  H.onStop(); H.save();
}
function exitToSled() {
  const sm = summary(); D.log.bestDayCash = Math.max(D.log.bestDayCash || 0, sm.$);
  emitEv("exit", sm); stop();
  if (sm.count) H.toast(`${sm.count} fish in the cooler. The fish buyer's on the quay pier, or watch Parcels for fresh-fish orders.`, "good");
}
function abort() { if (S.on) stop(); }

// keyboard while fishing (tracklayer calls this first). True = handled, false = let the game have it
function key(e) {
  const c = e.code;
  if (H.TABLET.open) return false;
  const pid = openPanelId();
  if (pid) {
    const d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0] }[c];
    if (d) { e.preventDefault && e.preventDefault(); pfMove(d[0], d[1]); return true; }
    if (c === "Enter" || c === "NumpadEnter") { if (pid === "ifCatch") closeCatch(!$("ifKeep").disabled); else pfActivate(); return true; }
    if (c === "Escape" || c === "Backspace" || c === "KeyQ") { panelBack(); return true; }
    if (pid === "ifCatch" && c === "KeyX") { closeCatch(false); return true; }
    if (pid === "ifCatch" && c === "KeyK") { closeCatch(!$("ifKeep").disabled); return true; }
    if (c === "KeyB" && (pid === "ifTackle" || pid === "ifShop" || pid === "ifBuy")) { panelBack(); return true; }
    if (c === "KeyM" || c === "KeyY" || c === "Backquote") return false;
    return true;
  }
  if (!S.on) return false;
  const seated = S.mode === "fish" || S.mode === "fight";
  if (c === "Space" || c === "KeyE") { if (seated) { if (c === "Space") jig(); } else { S.kb.act = true; actPress(); } return true; }
  if (seated && (c === "ArrowDown" || c === "KeyS")) { S.kb.down = true; return true; }
  if (seated && (c === "ArrowUp" || c === "KeyW")) { S.kb.up = true; return true; }
  if (c === "KeyQ") { if (S.mode === "fish") stand(); else if (S.mode === "walk" && nearSled()) packUp(); else if (S.mode === "walk") H.toast("Walk back to the sled to pack up."); return true; }
  if (c === "Escape") { if (S.mode === "fish") { stand(); return true; } return false; }
  if (c === "KeyH") { if (S.mode === "walk" || S.mode === "fish") showIntro(); return true; }
  if (c === "KeyB") { openTackle(); return true; }
  if (c === "KeyM" || c === "KeyY" || c === "Backquote" || c === "Tab") return false;
  return true;                                   // R, V, G, F, Z, T and the rest do nothing while you're out on the ice
}
function keyup(e) {
  const c = e.code; if (!S.kb) return;
  if (c === "Space" || c === "KeyE") S.kb.act = false;
  if (c === "ArrowDown" || c === "KeyS") S.kb.down = false;
  if (c === "ArrowUp" || c === "KeyW") S.kb.up = false;
}
// gamepad while fishing: stick walks, A acts / jigs, LT lets out, RT reels, X tackle, B stand / back, LB pack up at the sled
function pad(gp, dt) {
  const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed), v = i => gp.buttons[i] ? gp.buttons[i].value : 0;
  const now = { a: b(0), b: b(1), x: b(2), lb: b(4), up: b(12), down: b(13), left: b(14), right: b(15) }, P0 = S.padPrev || {};
  const edge = k => now[k] && !P0[k];
  const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0, rx = gp.axes[2] || 0;
  const pid = openPanelId();
  if (pid) {
    const nav = now.up || ay < -.6 ? 1 : now.down || ay > .6 ? 2 : now.left || ax < -.6 ? 3 : now.right || ax > .6 ? 4 : 0;
    S.navT = (S.navT || 0) - dt;
    if (nav !== S.nav || (nav && S.navT <= 0)) { if (nav) pfMove(...[[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0]][nav]); S.navT = nav === S.nav ? .13 : .4; }
    S.nav = nav;
    if (edge("a")) { if (pid === "ifCatch") closeCatch(!$("ifKeep").disabled); else pfActivate(); }
    if (edge("b")) panelBack();
    if (edge("x") && pid === "ifCatch") closeCatch(false);
    S.pad = null; S.pd.act = S.pd.down = S.pd.up = false;
  } else if (S.on) {
    const dz = q => Math.abs(q) < .15 ? 0 : q;
    S.pad = { x: dz(ax), y: -dz(ay), run: b(10) };
    const seated = S.mode === "fish" || S.mode === "fight";
    S.pd.down = seated && v(6) > .3; S.pd.up = seated && v(7) > .3;
    if (edge("a")) { if (seated) jig(); else actPress(); }
    S.pd.act = !seated && now.a;
    if (edge("x") && S.mode === "fish") openTackle();
    if (edge("b") && S.mode === "fish") stand();
    if (edge("lb") && S.mode === "walk") { if (nearSled()) packUp(); else H.toast("Walk back to the sled to pack up."); }
    if (Math.abs(rx) > .2) { if (S.mode === "walk") cam.H -= rx * dt * 1.6; else cam.userYaw -= rx * dt * 1.6; }
  }
  S.padPrev = now;
}
// riding input is off while you're fishing or a shop panel is up
const blocking = () => S.on || (!!$("ifShop") && (!$("ifShop").hidden || !$("ifBuy").hidden));
// the world clock stands still while a card or panel is open (as in the prototype)
const paused = () => (S.on && ["gear", "bait", "help", "summary", "caught"].includes(S.mode)) || (!!$("ifShop") && (!$("ifShop").hidden || !$("ifBuy").hidden));

// from updGame every frame: spoilage warnings, orders, hand-overs, shop and buyer greetings
const TK = { dayIdx: null, near: null, nearT: 0 };
function tick(dt, near, spd) {
  if (!D) return;
  const di = H.CAL.dayIndex(), O = D.orders;
  if (O.day !== di) { O.day = di; O.posted = O.posted.filter(o => o.exp > NOWH()); postOrders(); }   // a few new orders every morning
  for (const o of O.taken.slice()) if (o.exp < NOWH()) { O.taken.splice(O.taken.indexOf(o), 1); H.toast(`${shortName(siteById(o.site))} gave up waiting for the fish.`, "warn"); }
  O.posted = O.posted.filter(o => o.exp > NOWH());
  if (!O.posted.length && Math.random() < dt / 60) postOrders();
  for (const c of D.cooler) if (!c.warned && NOWH() - c.t > 44) { c.warned = true; H.toast(`The ${SPECIES[c.sp].name.toLowerCase()} in the cooler is nearly two days old. Sell it soon.`, "warn"); }
  if (near && spd < 4 && O.taken.length && !S.on) deliverOrders(near);
  // walking or riding up to the shop and the buyer
  TK.nearT -= dt;
  if (TK.nearT <= 0 && !S.on) {
    TK.nearT = .5;
    const FS = H.fishSites || {}, x = H.FOOT.on ? H.FOOT.x : H.P.x, z = H.FOOT.on ? H.FOOT.z : H.P.z;
    const at = FS.shop && Math.hypot(x - FS.shop.x, z - FS.shop.z) < 24 ? "shop" : FS.buyer && Math.hypot(x - FS.buyer.x, z - FS.buyer.z) < 22 ? "buyer" : null;
    if (at && at !== TK.near) H.toast(at === "shop" ? `Nordkinn Fisk & Friluft: rods, reels, line, augers and bait. ${H.touch() ? "Tap SHOP" : "Stop and press E"}.` : `The fish buyer's stall on the pier. ${D.cooler.length ? (H.touch() ? "Tap SELL" : "Stop and press E") + " to sell your catch." : "Bring fish."}`);
    TK.near = at;
  }
}

/* =================================================================================================================
   THE MODULE
   ================================================================================================================= */
function init(host) {
  H = host; T = host.THREE;
  host.GS.fish = D = normalize(host.GS.fish);
  initLakes(); injectUI();
  return API;
}
function setData(d) { D = H.GS.fish = normalize(d); }
let COOLER_MAX = 10;
const API = {
  GEAR, SPECIES, BAITS, LURES, used, ice: ICE, lakes: LK, depthAt, lakeAt, fresh, normalize, setData,
  _g: () => G, get on() { return S.on; }, get wx() { return W.x; }, get wz() { return W.z; }, get wy() { return S.on ? H.surf(W.x, W.z) : 0; },
  frame, render, key, keyup, pad, ctx, hint, ctxLabel, tick, paused, blocking, abort, beacon, parcelsHtml, parcelsBind, logbookHtml,
  openShop, openBuyer, panelOpen: () => !!openPanelId(), back: panelBack, setTouchHold: (k, on) => { if (S.tk) S.tk[k] = on; }
};
window.TLFish = Object.assign(window.TLFish || {}, { GEAR, SPECIES, BAITS, LURES, AUGERS, RODS, REELS, LINES, used, ice: ICE, init, fresh, normalize });
// the prototype's event API, kept
window.IceFishing = {
  on: (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); },
  reset: opts => {
    if (opts && opts.coolerMax) COOLER_MAX = opts.coolerMax;
    if (!S.on) return;
    closePanels(); $("ifSum").hidden = true; clearFish(); for (const h of holes) dropHole(h); holes = []; syncHoles();
    S.mode = "walk"; S.hole = null; S.fight = null; S.L = 0; S.sess = { kept: [], landed: 0, kg: 0 }; syncUI();
  },
  species: SPECIES, state: S, player: W, holes: () => holes
};
})();
