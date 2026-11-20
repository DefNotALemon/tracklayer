// Beta fixes 0301 #1 / 0308 #1 + #2 / 0316 #1 (lane A): damaged saves made safe.
//   A. a truck record's fuel that is null / negative / past the tank / a string comes out of a reload as a number in
//      0..the tank's size, and the cab reads the same;
//   B. a plow driver's assigned truck whose fuel turns into a string or NaN in play: they do not set out on "NaN L",
//      the record is a number again, no note or card reads NaN;
//   C. a driver's saved position past the end of their road is brought back to the road's end on load, and the driver
//      is home again within hours (it drove "back" for thousands of game years); a "home" record keeps no position.
// Run: tools/playtest/run.sh tools/playtest/scenarios/x5_savesafe.mjs     (asserts only, no stills)
import { boot, ev, sleep, done, reload, errors } from "../lib.mjs";
let fails = 0; const failed = []; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) { fails++; failed.push(m); } };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const notes = () => J(`TABLET.log.map(n => n.title + " | " + n.body)`);
const tabText = () => ev(`$("tabS").textContent.replace(/\\s+/g, " ")`);
const app = async id => { await ev(`TABLET.toggle(true, ${JSON.stringify(id)}); TABLET.render(); true`); await sleep(450); return tabText(); };
const BAD = /undefined|NaN|null|Infinity|\[object/;
const SETUP = `TLXPL.PDR.bog.km = 0; TLXPL.PDR.wayMax = 0; tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
const KIT = `(() => {
  window.__rt = id => TLXR.routes.find(r => r.id === id);
  window.__q = (h, st) => { st = st || 0.5; for (let t = 0; t < h - 1e-6; t += st) { GS.hour += Math.min(st, h - t); TLX.state("roads").h = GS.hour; TLXPL.con.step(); } return true; };
  window.__pdr = id => { const q = TLX.state("plow").pdr[id]; return q ? JSON.parse(JSON.stringify(q)) : null; };
  window.__drv = (id, work, xp, hap) => { const m = TLX.staff.at("plow:" + id); m.tr.work = work; m.tr.temper = 0; m.xpReal = xp; m.hap = hap; m.mood = 0; m.wage = TLX.staff.fair(m); return TLXPL.pdr.skill(m, id); };
  window.__clean = id => { TLXR.setSnow(id, 0); const c = TLX.state("plow").con[id]; c.strikes = 0; c.cover = false; c.due = {}; c.clean = true; TLXPL.con.step(); return true; };
  return true; })()`;
const fin = v => typeof v === "number" && isFinite(v);

await boot();
await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 90000; GS.lic = GS.lic || {}; GS.lic.freight = true; TLXV.buy("plowtruck"); TLXV.buy("plowtruck"); true`); await sleep(700);
const trucks = await J(`TLXV.state().owned.filter(r => r.id === "plowtruck").map(r => r.uid)`);
const UID = trucks[0], uid = JSON.stringify(UID);
const CAP = await ev(`TLXV.VEHICLES.find(v => v.id === "plowtruck").fuel`);
console.log("trucks", trucks, "tank", CAP);

// ---------------------------------------------------------------- A: the truck record's fuel through a reload
const VALS = [["null", null, 0], ["-5", -5, 0], ["9999", 9999, CAP], ["abc", "abc", 0], ["'12'", "12", 12], ["{}", {}, 0], ["missing", undefined, CAP], ["31.5", 31.5, 31.5]];
for (const [label, val, want] of VALS) await section("A fuel " + label, async () => {
  const sv = await J(`(() => { save(); return JSON.parse(localStorage.getItem("tracklayer.save.v2")); })()`);
  const own = sv.x && sv.x.sys && sv.x.sys.vehicles && sv.x.sys.vehicles.s.owned, r = own && own.find(o => o.uid === UID);
  if (!r) { ok(false, label + ": truck record found in the save"); return; }
  if (val === undefined) delete r.fuel; else r.fuel = val;
  await reload(sv); await ev(SETUP); await sleep(500); await ev(KIT);
  const got = await J(`(() => { const r = TLXV.state().owned.find(o => o.uid === ${uid}); return { f: r.fuel === undefined ? "undef" : r.fuel, t: typeof r.fuel }; })()`);
  ok(got.t === "number" && fin(got.f) && Math.abs(got.f - want) < 0.01, `${label}: the record loads as ${want} L (${JSON.stringify(got.f)}, ${got.t})`);
  await ev(`TLXV.swapTo(${uid}); true`); await sleep(500);
  const cab = await J(`({ cur: TLXV.state().cur, fuel: GS.fuel })`);
  ok(cab.cur === UID && fin(cab.fuel) && cab.fuel >= want - 0.5 && cab.fuel <= Math.min(CAP, want + 8) + 0.01, `${label}: the cab reads it (${cab.fuel} of ${CAP}; the yard's pump tops a parked truck up a little)`);
  await ev(`TLXV.swapTo(null); true`); await sleep(400);
});
await section("A sled record", async () => {
  await ev(`TLXV.swapTo(${uid}); true`); await sleep(500);                        // in the truck, so the sled is the parked record
  const sv = await J(`(() => { save(); return JSON.parse(localStorage.getItem("tracklayer.save.v2")); })()`);
  const st = sv.x.sys.vehicles.s; ok(!!st.sled, "the parked sled has a record in the save");
  if (st.sled) st.sled.fuel = "full";
  await reload(sv); await ev(SETUP); await sleep(500); await ev(KIT);
  const f = await J(`(() => { const s = TLXV.state(); return { sled: s.sled ? s.sled.fuel : "none", gs: GS.fuel }; })()`);
  ok((f.sled === "none" || (fin(f.sled) && f.sled >= 0)) && fin(f.gs), `a sled record with fuel "full" loads as a number (${JSON.stringify(f)})`);
  await ev(`TLXV.swapTo(null); true`); await sleep(400);
  ok(fin(await ev("GS.fuel")), "back on the sled the tank is a number (" + (await ev("GS.fuel")) + ")");
});

// ---------------------------------------------------------------- B: a driver's assigned truck, fuel gone bad in play
const RID = "dyfjord", rid = JSON.stringify(RID);
const I = await ev(`(() => { const r = __rt(${rid}); let b = -1; for (let i = 2; i < r.seg.length - 1; i++) if (r.seg[i].legs.length && r.seg[i - 1].legs.length && r.seg[i + 1].legs.length && (i + 1) * 400 + 40 <= r.len) { b = i; if (i >= Math.floor(r.seg.length / 2)) break; } return b; })()`);
if (!(I >= 1)) { ok(false, "a stretch to snow on the " + RID + " road (" + I + ")"); await done(1); }
const LEN = await ev(`__rt(${rid}).len`);
await ev(`crashCancel(); FOOT.on = false; GS.hour = 34; TLX.state("roads").h = 34; TLXPL.PDR.mine = 1; TLXPL.con.sign(${rid}); TLX.staff.tick(); true`); await sleep(300);
const DID = (await J(`TLX.state("staff").apps`))[0].id;
await ev(`TLX.staff.hire(${DID}); __drv(${rid}, 1, 10, 70); true`);
console.log("road", RID, "len", Math.round(LEN), "stretch", I, "driver", DID, "kit", await ev(`TLX.staff.at("plow:" + ${rid}).kit`));
const snow = (i, v) => ev(`TLXR.setSnow(${rid}, ${v}, ${i}); TLXPL.con.step(); true`);
const BCASES = [["string", "t.fuel = 'lots'", 0], ["NaN", "t.fuel = NaN", 0], ["null", "t.fuel = null", 0], ["-40", "t.fuel = -40", 0], ["1e9", "t.fuel = 1e9", null], ["Infinity", "t.fuel = Infinity", 0]];
for (const [nm, code, want] of BCASES) await section("B fuel " + nm, async () => {
  await ev(`TABLET.log.length = 0; TLX.staff.xact(${DID}, "r"); __clean(${rid}); true`); await ev(`__q(0.6, 0.1); true`);
  await ev(`TLX.staff.xact(${DID}, "a" + ${uid}); true`);
  await ev(`(() => { const t = TLXV.state().owned.find(r => r.uid === ${uid}), S = TLXPL.state(); t.fuel = 60; if (S.blades[t.uid]) S.blades[t.uid].cond = 100; ${code}; return true; })()`);
  await snow(I - 1, 0.5); await snow(I, 0.6);
  const r = await ev(`(() => { try { __q(1.5, 0.25); __q(0.05, 0.05); TLX.staff.tick(); return "ok"; } catch (e) { return "THREW " + e.message; } })()`);
  const a = await J(`({ q: __pdr(${rid}), t: (() => { const r = TLXV.state().owned.find(q => q.uid === ${uid}); return { fuel: typeof r.fuel === "number" && isFinite(r.fuel) ? r.fuel : String(r.fuel), out: r.out || null }; })() })`);
  const nt = await notes();
  console.log("  ", nm, r, JSON.stringify(a), "| notes:", nt.join(" // ").slice(0, 300));
  ok(r === "ok", nm + ": no exception");
  ok(fin(a.t.fuel) && a.t.fuel >= 0 && a.t.fuel <= CAP + 0.01, `${nm}: the record's fuel is a number in 0..${CAP} afterwards (${a.t.fuel})`);
  if (want === 0) {
    ok(!nt.some(x => /has set out/.test(x)), nm + ": the driver did not set out on it");
    ok(nt.some(x => /cannot go out/.test(x) && /tank is empty/.test(x)), nm + ": the note says the tank is empty");
    ok(a.q && a.q.st === "home", nm + ": the driver is home (" + (a.q && a.q.st) + ")");
  } else ok(nt.some(x => /has set out/.test(x) && new RegExp("\\b" + CAP + " L in the tank").test(x)), nm + ": set out with a full tank's worth, not 1e9 L");
  ok(!nt.some(x => BAD.test(x)), nm + ": notifications clean " + nt.filter(x => BAD.test(x)).join(" // "));
  const txt = (await app("staff")) + (await app("plow"));
  ok(!BAD.test(txt), nm + ": Staff and Plow cards read clean " + ((txt.match(/.{20}(undefined|NaN|null|Infinity|\[object).{20}/) || [""])[0]));
  await ev(`TABLET.toggle(false); true`);
});

// ---------------------------------------------------------------- C: a saved position past the road's end
const CCASES = [["out, p 1e12", { st: "out", p: 1e12 }, LEN], ["back, p 9e9", { st: "back", p: 9e9 }, LEN], ["home, p 5e8", { st: "home", p: 5e8 }, 0], ["out, p half way (untouched)", { st: "out", p: Math.round(LEN / 2) }, Math.round(LEN / 2)]];
for (const [nm, patch, want] of CCASES) await section("C " + nm, async () => {
  await ev(`(() => { TABLET.log.length = 0; __clean(${rid}); const t = TLXV.state().owned.find(r => r.uid === ${uid}); t.fuel = 60; const q = TLX.state("plow").pdr[${rid}]; Object.assign(q, { a: 0, w: 0, aid: "", help: "", bogI: -1 }, ${JSON.stringify(patch)}); if (q.st !== "home") { q.truck = ${uid}; TLXV.setOut(${uid}, "plowing", "plow"); } save(); return true; })()`);
  await reload(); await ev(SETUP); await sleep(500); await ev(KIT);
  const a0 = await J(`__pdr(${rid})`);
  console.log("   loaded", JSON.stringify(a0));
  ok(a0 && fin(a0.p) && a0.p <= LEN + 1, `${nm}: p is on the road after the load (${a0 && a0.p} <= ${Math.round(LEN)})`);
  if (want === 0) ok(a0 && a0.p === 0, nm + ": a home record keeps no position");
  else if (want < LEN) ok(a0 && a0.p > 0 && Math.abs(a0.p - want) < LEN * 0.35, `${nm}: a position on the road is not moved to its end (${a0 && Math.round(a0.p)} vs ${want})`);
  const r = await ev(`(() => { try { __q(6, 0.25); TLX.staff.tick(); return "ok"; } catch (e) { return "THREW " + e.message; } })()`);
  const a = await J(`({ q: __pdr(${rid}), out: (TLXV.state().owned.find(q => q.uid === ${uid}) || {}).out || null })`);
  console.log("   6 h on", r, JSON.stringify(a.q), "truck out:", a.out);
  ok(r === "ok", nm + ": 6 h on, no exception");
  ok(a.q && a.q.st === "home" && a.q.p === 0, `${nm}: the driver is home within 6 h (${a.q && a.q.st}, p ${a.q && a.q.p})`);
  ok(!a.out, nm + ": and the truck is back on its spot");
  const nt = await notes();
  ok(!nt.some(x => BAD.test(x)), nm + ": notifications clean " + nt.filter(x => BAD.test(x)).join(" // "));
});

ok(errors.length === 0, "no page error" + (errors.length ? ": " + JSON.stringify(errors.slice(0, 3)) : ""));
if (failed.length) console.log("FAILED CHECKS:\n  " + failed.join("\n  "));
console.log(fails ? `x5_savesafe: ${fails} FAILED` : "x5_savesafe: all ok");
await done(fails ? 1 : 0);
