// Tracklayer — the expansion core (TLX). Loaded by index.html before tracklayer.js, like icefish.js.
//
// The Four Seasons & Enterprise expansion (loop/EXPANSION.md) adds many big systems: vehicles, roads, plowing,
// staff, properties, seasons, boats, aircraft, new regions. Each one lives in its own file (tlx-<system>.js), not
// in tracklayer.js, and plugs in here. This file is the socket they plug into and holds no gameplay of its own.
//
// A system file does, at load:
//
//   TLX.register({
//     id: "vehicles",                 // also its key in the save
//     v: 1,                           // version of its saved state
//     state0: () => ({ ... }),        // a brand-new game's state (plain JSON)
//     migrate(st, fromV) { ... },     // optional: bring an older saved state up to v (returns the state)
//     init(api) { ... },              // once, at boot, after the world is built and the save is loaded
//     tick(dt) { ... },               // optional: every frame while the game is running
//     save() { ... },                 // optional: just before the state is written out, bring it up to date
//     monday(week) { ... }            // optional: the weekly settle-up, with the rent and fuel bills
//   });
//   TLX.option({ id: "ships", name: "Passing ships", hint: "...", sys: "lights" });   // a suggested addition
//
// and reads its state with TLX.state("vehicles"), an option with TLX.on("ships").
//
// THE SAVE. Everything here rides in tracklayer.save.v2 under one key, x:
//   x: { v: 1, region: "nordkinn", opt: { ships: false }, sys: { vehicles: { v: 1, s: {...} } } }
// A save from before the expansion has no x: every system starts from state0 and every option is on. Only options
// the player has switched are stored. State for a system this build doesn't know (a save from a newer build, or a
// system that was switched off) is kept as it came and written back untouched, so no build can eat another's data.
// load() never throws: a broken x, or one broken system, falls back to state0 for that part alone.
//
// REGIONS. The Nordkinn is one region of three (Greenland and the Maine-style county come last). A system must not
// read Nordkinn-only constants: it asks the api for the world (ground, snow, sea, sites, latitude) and keys anything
// tied to a place by TLX.region(), so the same code runs in every region.
(() => {
"use strict";
const SAVE_V = 1, HOME = "nordkinn";
const SYS = [], BY = {}, OPTS = [], OPT_BY = {};
let api = null, booted = false;
let region = HOME, optSaved = {}, live = {}, kept = {};      // kept: saved state of systems this build doesn't have

const isObj = o => !!o && typeof o === "object" && !Array.isArray(o);
const clone = o => JSON.parse(JSON.stringify(o));
function fresh(d) { try { const s = d.state0 ? d.state0() : {}; return isObj(s) ? s : {}; } catch (e) { return {}; } }
// one system's state out of the save: migrated if it's older, state0 if it's missing or broken, and any field
// state0 has that the save lacks is filled in (so a system can grow its state without writing a migration)
function adopt(d, raw) {
  const base = fresh(d);
  if (!isObj(raw) || !isObj(raw.s)) return base;
  let s = raw.s;
  try {
    const from = raw.v | 0;
    if (from < d.v && d.migrate) { const m = d.migrate(clone(s), from); if (isObj(m)) s = m; }
  } catch (e) { return base; }
  return Object.assign(base, s);
}

const TLX = {
  SAVE_V, HOME,
  systems: SYS, options: OPTS,
  get api() { return api; },

  register(d) {
    if (!d || typeof d.id !== "string" || BY[d.id]) return null;
    d.v = d.v | 0 || 1;
    SYS.push(d); BY[d.id] = d;
    // a system that registers after the save was read (lazy files, tests) still gets its saved state
    live[d.id] = adopt(d, kept[d.id]); delete kept[d.id];
    if (booted && d.init) try { d.init(api); } catch (e) { console.error("TLX " + d.id + " init", e); }
    return d;
  },
  state: id => live[id] || null,

  // suggested additions: each a switch on the Settings options page, on unless the player turned it off
  option(o) {
    if (!o || typeof o.id !== "string" || OPT_BY[o.id]) return null;
    o.def = o.def !== false;
    OPTS.push(o); OPT_BY[o.id] = o;
    return o;
  },
  on(id) { const o = OPT_BY[id]; if (!o) return false; return id in optSaved ? !!optSaved[id] : o.def; },
  setOn(id, v) {
    const o = OPT_BY[id]; if (!o) return;
    v = !!v; const was = TLX.on(id);
    if (v === o.def) delete optSaved[id]; else optSaved[id] = v;
    if (was !== v && o.change) try { o.change(v); } catch (e) { console.error("TLX option " + id, e); }
  },

  region: () => region,
  setRegion(id) { if (typeof id === "string" && id) region = id; },

  // x from the save (or nothing, for a new game or an old save). Never throws.
  load(x) {
    region = HOME; optSaved = {}; kept = {}; live = {};
    try {
      if (isObj(x)) {
        if (typeof x.region === "string" && x.region) region = x.region;
        if (isObj(x.opt)) for (const k in x.opt) if (typeof x.opt[k] === "boolean") optSaved[k] = x.opt[k];
        if (isObj(x.sys)) for (const k in x.sys) kept[k] = x.sys[k];
      }
    } catch (e) { region = HOME; optSaved = {}; kept = {}; }
    for (const d of SYS) { live[d.id] = adopt(d, kept[d.id]); delete kept[d.id]; }
  },
  // what goes back into the save
  dump() {
    const sys = {};
    for (const k in kept) sys[k] = kept[k];
    for (const d of SYS) { if (d.save) try { d.save(); } catch (e) { console.error("TLX " + d.id + " save", e); } sys[d.id] = { v: d.v, s: live[d.id] }; }
    return { v: SAVE_V, region, opt: optSaved, sys };
  },

  boot(a) {
    api = a; booted = true;
    for (const d of SYS) if (d.init) try { d.init(api); } catch (e) { console.error("TLX " + d.id + " init", e); }
  },
  tick(dt) { for (let i = 0; i < SYS.length; i++) { const d = SYS[i]; if (d.tick) d.tick(dt); } },
  monday(week) { for (const d of SYS) if (d.monday) try { d.monday(week); } catch (e) { console.error("TLX " + d.id + " monday", e); } }
};
window.TLX = TLX;
})();
