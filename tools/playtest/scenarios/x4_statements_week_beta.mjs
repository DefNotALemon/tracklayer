// Beta test 4.2 Monday statements with everything held at once: 3 roads + driveways + lots, three weeks running, reload, old-save lines. Asserts, exit 1.
import { boot, ev, sleep, done, reload, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
await boot();
await ev(SETUP); await sleep(600);
await ev(`GS.cash = 40000; TLXV.buy("pickup"); true`); await sleep(500);
const uid = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`);
await ev(`TLX.state("plow").blades[${JSON.stringify(uid)}] = { id: "b23", cond: 100, throw: "r" }; TLXPL.tidy(); true`);
const roads = await J(`TLXPL.con.routes().map(r => r.id)`);
console.log("roads", JSON.stringify(roads));
const statements = async () => { await ev(`TABLET.toggle(true, "plow"); true`); await sleep(500); const t = await J(`[...document.querySelectorAll("#tabS .tsm2")].map(e => e.textContent)`); return t; };
let drv = null, lot = null;
await section("A hold three roads, a drive and a lot", async () => {
  for (const id of roads.slice(0, 3)) await ev(`TLXPL.con.sign(${JSON.stringify(id)}); true`);
  drv = await J(`(() => { const c = TLXPL.drv.list()[0]; return c && c.key; })()`);
  lot = await J(`(() => { const c = TLXPL.lot.list()[0]; return c && c.id; })()`);
  await ev(`TLXPL.drv.take(${JSON.stringify(drv)}); TLXPL.lot.take(${JSON.stringify(lot)}); true`);
  const n = await J(`({ con: Object.keys(TLX.state("plow").con).length, drv: Object.keys(TLX.state("plow").drv).length, lot: Object.keys(TLX.state("plow").lot).length })`);
  console.log("  held", JSON.stringify(n));
  ok(n.con === 3 && n.drv === 1 && n.lot === 1, "3 roads, 1 drive, 1 lot held");
});
const week = async (label, pay) => {
  await ev(`(() => { const s = TLX.state("plow"); for (const k of Object.keys(s.con)) { s.con[k].wk = ${pay}; s.con[k].wkM = 800; } for (const k of Object.keys(s.drv)) { s.drv[k].wk = 33; s.drv[k].n = 1; } for (const k of Object.keys(s.lot)) { s.lot[k].wk = 90; s.lot[k].n = 1; } return true; })()`);
  await ev(`TLXPL.con.monday({ label: ${JSON.stringify(label)} }); TLXPL.drv.monday({ label: ${JSON.stringify(label)} }); TLXPL.lot.monday({ label: ${JSON.stringify(label)} }); true`);
};
await section("B three Mondays", async () => {
  await week("Mon 4 Jan", 100);
  let st = await statements(); console.log("  after 1:", JSON.stringify(st));
  ok(st.length === 5, "week 1 shows all 5 lines (3 roads, drives, lots): " + st.length);
  await week("Mon 11 Jan", 200);
  st = await statements(); console.log("  after 2:", JSON.stringify(st));
  const wk1 = st.filter(t => t.includes("4 Jan")).length;
  ok(wk1 === 5, "week 1 still on file after week 2 (" + wk1 + " of 5 lines kept)");
  await week("Mon 18 Jan", 300);
  st = await statements(); console.log("  after 3:", JSON.stringify(st));
  ok(st.length === 15, "three weeks of statements reachable: " + st.length + " lines");
  const cash0 = await ev("GS.cash"); void cash0;
});
await section("C the pay line and the totals", async () => {
  const s = await J(`(() => { const s = TLX.state("plow"); return { wkLeft: Object.values(s.con).map(c => c.wk), conLast: s.conLast.length }; })()`);
  console.log("  ", JSON.stringify(s));
  ok(s.wkLeft.every(v => v === 0), "week totals reset");
});
await section("D reload keeps the file", async () => {
  await reload(); await sleep(800);
  const st = await J(`TLX.state("plow").conLast.length`);
  console.log("  conLast after reload", st);
  ok(st > 0, "statements survive reload");
});
await done(fails);
