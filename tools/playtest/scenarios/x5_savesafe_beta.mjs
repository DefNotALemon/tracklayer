// Beta 0365: break the damaged-save fixes (v36/v34) with inputs x5_savesafe does not use.
//  A. base-game sled fuel (GS.fuel in the root save) as junk; truck fuel as true/[]/"1e999"/" "/"12abc"/0x10;
//  B. driver position p as NaN(null)/-50/"abc"/"900" string/ undefined, and a driver "out" with no truck.
import { boot, ev, sleep, done, reload, errors } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const fin = v => typeof v === "number" && isFinite(v);
const SETUP = `TLXPL.PDR.bog.km = 0; tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
const sec = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const getSave = () => J(`(() => { save(); return JSON.parse(localStorage.getItem("tracklayer.save.v2")); })()`);

await boot();
await ev(SETUP); await sleep(600);
await ev(`GS.hour = 34; GS.cash = 90000; GS.lic = GS.lic || {}; GS.lic.freight = true; TLXV.buy("plowtruck"); true`); await sleep(700);
const UID = (await J(`TLXV.state().owned.filter(r => r.id === "plowtruck").map(r => r.uid)`))[0], uid = JSON.stringify(UID);
const CAP = await ev(`TLXV.VEHICLES.find(v => v.id === "plowtruck").fuel`);

for (const [lab, val] of [["true", true], ["[]", []], ["'1e999'", "1e999"], ["' '", " "], ["'12abc'", "12abc"], ["'0x10'", "0x10"], ["[7]", [7]]]) await sec("A truck fuel " + lab, async () => {
  const sv = await getSave(); const r = sv.x.sys.vehicles.s.owned.find(o => o.uid === UID); r.fuel = val;
  await reload(sv); await ev(SETUP); await sleep(500);
  const g = await J(`(() => { const r = TLXV.state().owned.find(o => o.uid === ${uid}); return { f: r.fuel, t: typeof r.fuel }; })()`);
  ok(g.t === "number" && fin(g.f) && g.f >= 0 && g.f <= CAP, `fuel ${lab} -> ${JSON.stringify(g.f)}`);
  await ev(`TLXV.swapTo(${uid}); true`); await sleep(500);
  const gs = await ev("GS.fuel"); ok(fin(gs) && gs >= 0, "cab GS.fuel " + gs);
  await ev(`TLXV.swapTo(null); true`); await sleep(300);
});

for (const [lab, val] of [["'abc'", "abc"], ["'0'", "0"], ["null", null], ["{}", {}]]) await sec("A2 GS.fuel (base game) " + lab, async () => {
  const sv = await getSave(); sv.fuel = val; if (sv.gs) sv.gs.fuel = val;
  const keys = Object.keys(sv).filter(k => /fuel/i.test(k)); console.log("   root keys:", keys.join(","));
  await reload(sv); await ev(SETUP); await sleep(500);
  const f = await ev("GS.fuel"); ok(fin(f) && f >= 0, `base fuel ${lab} -> ${f}`);
});

// B: drivers
await sec("B setup", async () => {
  await ev(`GS.hour = 34; TLX.state("roads").h = 34; TLXPL.PDR.mine = 1; true`);
  const rid = await ev(`TLXR.routes.find(r => r.id === "dyfjord") ? "dyfjord" : TLXR.routes[0].id`);
  await ev(`TLXPL.con.sign(${JSON.stringify(rid)}); TLX.staff.tick(); true`); await sleep(300);
  const DID = (await J(`TLX.state("staff").apps`))[0].id; await ev(`TLX.staff.hire(${DID}); TLX.staff.xact(${DID}, "a" + ${uid}); true`);
  const LEN = await ev(`TLXR.routes.find(r => r.id === ${JSON.stringify(rid)}).len`);
  for (const [lab, patch] of [["p null", { st: "out", p: null }], ["p -50", { st: "out", p: -50 }], ["p 'abc'", { st: "back", p: "abc" }], ["p '900' string", { st: "out", p: "900" }], ["p 1e308", { st: "out", p: 1e308 }], ["out, no truck", { st: "out", p: 300, truck: null }]]) await sec("B " + lab, async () => {
    await ev(`(() => { TABLET.log.length = 0; const P_ = TLX.state("plow").pdr; const q = P_[${JSON.stringify(rid)}] || (P_[${JSON.stringify(rid)}] = { st: "home", p: 0, a: 0, w: 0, n: 0, cash: 0, truck: null }); Object.assign(q, { a: 0, w: 0, aid: "", help: "", bogI: -1 }, ${JSON.stringify(patch)}); if (${JSON.stringify(patch.truck === null)} === false) { q.truck = ${uid}; TLXV.setOut(${uid}, "plowing", "plow"); } save(); return true; })()`);
    await reload(); await ev(SETUP); await sleep(500);
    await ev(`(() => { window.__q = (h, st) => { for (let t = 0; t < h - 1e-6; t += st) { GS.hour += Math.min(st, h - t); TLX.state("roads").h = GS.hour; TLXPL.con.step(); } return true; }; return true; })()`);
    const a0 = await J(`TLX.state("plow").pdr[${JSON.stringify(rid)}]`);
    console.log("   loaded", JSON.stringify(a0));
    const r = await ev(`(() => { try { __q(8, 0.25); TLX.staff.tick(); return "ok"; } catch (e) { return "THREW " + e.message; } })()`);
    const a = await J(`({ q: TLX.state("plow").pdr[${JSON.stringify(rid)}], out: (TLXV.state().owned.find(q => q.uid === ${uid}) || {}).out || null })`);
    console.log("   8 h on", r, JSON.stringify(a));
    ok(r === "ok", lab + ": no exception");
    ok(a.q && fin(a.q.p) && a.q.p >= 0 && a.q.p <= LEN + 1, `${lab}: p sane after (${a.q && a.q.p})`);
    ok(a.q && a.q.st === "home" || (a.q && a.q.st === "out"), `${lab}: driver state ${a.q && a.q.st}`);
    ok(!a.out || (a.q && a.q.st !== "home"), `${lab}: truck not left marked out for a home driver (${JSON.stringify(a.out)})`);
  });
});
ok(errors.length === 0, "no page error" + (errors.length ? JSON.stringify(errors.slice(0, 3)) : ""));
console.log(fails ? `x5_savesafe_beta: ${fails} FAILED` : "x5_savesafe_beta: all ok");
await done(fails ? 1 : 0);
