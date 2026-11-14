// Expansion milestone 1: the save carries the expansion's state (x, from tlx.js) and every older save still loads.
// Asserts, exit 1 on a failure. Run: tools/playtest/run.sh tools/playtest/scenarios/x1_save.mjs
//  1 a fresh game has TLX booted with the game's api, and no Options page while no option exists
//  2 a save from before the expansion (no x) loads with its cash, deliveries, sled and apps intact
//  3 a system's state and a switched-off option survive save -> reload, through the system's migration
//  4 state for a system this build doesn't have is written back untouched
//  5 a broken x (junk, wrong types) never stops the save loading
//  6 the Options page lists a registered option and its switch works; tick and the Monday hook reach a system
import { boot, reload, ev, raw, tap, sleep, shot, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const SYS = `TLX.register({ id: "t1", v: 2, state0: () => ({ n: 0, grown: "new" }), migrate: (s, from) => { s.migrated = from; return s; },
  tick() { window.__t1 = (window.__t1 || 0) + 1; }, monday(d) { window.__mon = (window.__mon || 0) + 1; } });
  TLX.option({ id: "t1opt", name: "Test option", hint: "a switch for the test", sys: "t1" }); optBuild(); true`;
const stored = () => raw(`localStorage.getItem("tracklayer.save.v2")`);

await boot();
// 1
let a = await J(`{ tlx: typeof TLX, api: !!TLX.api, surf: isFinite(TLX.api.world.surf(P.x, P.z)), lat: TLX.api.world.lat, region: TLX.region(), dump: TLX.dump(),
  optHidden: $("optSec").hidden && $("optRows").hidden, scripts: [...document.scripts].map(s => s.getAttribute("src")).filter(Boolean) }`);
console.log("1", JSON.stringify(a));
ok(a.tlx === "object" && a.api && a.surf, "TLX booted with the game's api");
ok(a.region === "nordkinn" && a.dump.v === 1 && Object.keys(a.dump.opt).length === 0 && Object.keys(a.dump.sys).every(k => ["vehicles", "survival", "hud", "wounds", "roads", "cars", "traffic", "staff", "gear"].includes(k)) && !(a.dump.sys.vehicles && (a.dump.sys.vehicles.s.owned.length || a.dump.sys.vehicles.s.cur)), "fresh game: empty expansion state on the Nordkinn (the vehicles system is registered and owns nothing)");
ok(!a.optHidden, "the Options page lists the wounds switch (the only registered option before the test adds one)");
ok(Math.abs(a.lat * 180 / Math.PI - 70.9) < 0.5, "world latitude comes through the api (" + (a.lat * 180 / Math.PI).toFixed(1) + " N)");

// 2: a pre-expansion save
await ev(`GS.cash = 4321; GS.delivered = 9; GS.own.sled = "woodsman"; GS.apps.freight = 1; TUT.stage = 99; save(); true`);
const cur = JSON.parse(await stored());
ok("x" in cur, "save() writes x");
const old = Object.assign({}, cur, { cash: 4444 }); delete old.x;
await reload(old);
a = await J(`{ cash: GS.cash, del: GS.delivered, sled: GS.own.sled, app: GS.apps.freight, tut: TUT.stage, dump: TLX.dump() }`);
console.log("2", JSON.stringify(a));
ok(a.cash === 4444 && a.del === 9 && a.sled === "woodsman" && a.app === 1 && a.tut === 99, "old save (no x) loads intact");
ok(a.dump.v === 1 && Object.keys(a.dump.sys).every(k => ["vehicles", "survival", "hud", "wounds", "roads", "cars", "traffic", "staff", "gear"].includes(k)) && !(a.dump.sys.vehicles && (a.dump.sys.vehicles.s.owned.length || a.dump.sys.vehicles.s.cur)), "old save: expansion starts fresh");

// 3 + 4: a system, an option, and a stranger's state
await ev(SYS);
await ev(`TLX.state("t1").n = 7; TLX.setOn("t1opt", false); save(); true`);
let sv = JSON.parse(await stored());
console.log("3 saved x", JSON.stringify(sv.x));
ok(sv.x.sys.t1 && sv.x.sys.t1.v === 2 && sv.x.sys.t1.s.n === 7 && sv.x.opt.t1opt === false, "system state and the switched-off option are in the save");
sv.x.sys.t1.v = 1; delete sv.x.sys.t1.s.grown;                                  // as an older build would have left it
sv.x.sys.stranger = { v: 5, s: { keep: "me" } };
await reload(sv);
a = await J(`{ before: TLX.state("t1"), dump: TLX.dump() }`);
ok(a.before === null && a.dump.sys.t1.s.n === 7 && a.dump.sys.stranger.s.keep === "me", "unregistered systems' state is kept as it came");
await ev(SYS);
a = await J(`{ st: TLX.state("t1"), on: TLX.on("t1opt"), dump: TLX.dump(), cash: GS.cash }`);
console.log("3 reloaded", JSON.stringify(a));
ok(a.st.n === 7 && a.st.migrated === 1 && a.st.grown === "new", "state survives the reload: migrated from v1, new field filled in");
ok(a.on === false, "the option stays off");
ok(a.dump.sys.stranger && a.dump.sys.stranger.v === 5 && a.dump.sys.stranger.s.keep === "me", "a stranger's state is written back untouched");
ok(a.cash === 4444, "the rest of the save is still there");

// 6: options page, tick, Monday
await tap("Escape"); await sleep(600);
a = await J(`{ open: !$("settings").hidden, secHidden: $("optSec").hidden, rows: [...$("optRows").querySelectorAll("button")].map(b => b.textContent), hint: [...$("optRows").querySelectorAll(".hint")].pop().textContent }`);
console.log("6 options", JSON.stringify(a));
ok(a.open && !a.secHidden && a.rows.includes("Test option: off"), "Settings shows the option, off");
await ev(`[...$("optRows").querySelectorAll("button")].find(b => b.dataset.opt === "t1opt").scrollIntoView(); true`); await sleep(200); await shot("x1_options");
await ev(`[...$("optRows").querySelectorAll("button")].find(b => b.dataset.opt === "t1opt").click(); true`);
a = await J(`{ row: [...$("optRows").querySelectorAll("button")].find(b => b.dataset.opt === "t1opt").textContent, on: TLX.on("t1opt"), saved: JSON.parse(localStorage.getItem("tracklayer.save.v2")).x.opt }`);
ok(a.row === "Test option: on" && a.on === true && !("t1opt" in a.saved), "the switch turns it back on and saves");
await tap("Escape"); await sleep(400);
const t0 = await raw("window.__t1 || 0"); await sleep(600); const t1 = await raw("window.__t1 || 0");
ok(t1 > t0, "a system's tick runs each frame (" + (t1 - t0) + " in 0.6 s)");
for (let i = 0; i < 8; i++) { await ev("GS.hour += 24; true"); await sleep(350); }
a = await J(`{ mon: window.__mon || 0, dow: CAL.now().dow }`);
console.log("6 monday", JSON.stringify(a));
ok(a.mon >= 1, "the Monday settle-up reaches a system (" + a.mon + " in 8 days)");

// 5: broken x
for (const [nm, bad] of [["a string", "junk"], ["an array", [1, 2]], ["wrong inner types", { v: "x", region: 5, opt: [true], sys: { t1: 5, t2: { v: 1, s: "no" }, t3: null } }], ["null", null]]) {
  const b = JSON.parse(await stored()); b.x = bad; b.cash = 777;
  await reload(b); await ev(SYS);
  a = await J(`{ cash: GS.cash, sled: GS.own.sled, st: TLX.state("t1"), region: TLX.region(), on: TLX.on("t1opt") }`);
  ok(a.cash === 777 && a.sled === "woodsman" && a.st.n === 0 && a.region === "nordkinn" && a.on === true, "x = " + nm + ": save loads, expansion falls back to fresh");
}
console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
