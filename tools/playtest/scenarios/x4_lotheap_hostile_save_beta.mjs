// Beta, 4.2c1/4.2c2a lots: hostile SAVED lot state planted through a real reload (x4_lots only tidies in memory).
//   heap far outside the lot, hv huge, mk of the wrong length, hp without mk, string numbers, a lot id that no longer exists.
import { boot, ev, sleep, done, reload, errors } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
await boot();
await ev(SETUP); await sleep(500);
const lots = await J(`TLXPL.lot.list().map(c => ({ id: c.id, n: c.n, x: c.x, z: c.z, r: c.r }))`);
console.log("lots", JSON.stringify(lots));
const A = lots[0], B = lots[1];
const mkSave = async f => { await ev(`(() => { const s = TLX.state("plow"); s.lot = {}; ${f}; save(); return true; })()`); return J(`JSON.parse(localStorage.getItem("tracklayer.save.v2"))`); };
const cases = {
  farHeap: `s.lot.${A.id} = { s: 0.9, h: 1, due: 1, miss: 0, wk: 0, n: 0, hp: 1, hv: 400, hx: 1e9, hz: -1e9, mk: "1".repeat(${A.n}), ms: 1 }`,
  shortMk: `s.lot.${A.id} = { s: 0.9, h: 1, due: 1, miss: 0, wk: 0, n: 0, mk: "1111", ms: 1 }`,
  longMk: `s.lot.${A.id} = { s: 0.9, h: 1, due: 1, miss: 0, wk: 0, n: 0, mk: "1".repeat(${A.n + 300}), ms: 1 }`,
  hpNoMk: `s.lot.${A.id} = { s: 0.2, h: 1, due: 0, miss: 0, wk: 0, n: 0, hp: 1, hv: 3, hx: ${A.x}, hz: ${A.z} }`,
  strNums: `s.lot.${A.id} = { s: "0.9", h: "4", due: "1", miss: "1", wk: "0", n: "0" }; s.lot.${B.id} = [1,2]`,
  allCut: `s.lot.${A.id} = { s: 0.9, h: 1, due: 1, miss: 0, wk: 0, n: 0, mk: "1".repeat(${A.n}), ms: 1, hp: 1, hv: 0, hx: ${A.x}, hz: ${A.z} }`,
};
for (const [name, f] of Object.entries(cases)) {
  const save = await mkSave(f);
  const e0 = errors.length;
  await reload(save); await ev(SETUP); await sleep(900);
  const r = await J(`(() => { const o = { thrown: null }; try { const s = TLX.state("plow"); TLXPL.lot.step(); TLXPL.lot.mark([${A.x}, ${A.z}, ${A.x + 2}, ${A.z}], true); TABLET.toggle(true, "plow"); jobsList(); o.st = s.lot.${A.id} || null; o.jobs = jobsList().filter(r => r.kind === "plowlot").length; o.line = typeof TLXPL.lot.line === "function" ? TLXPL.lot.line() : ""; } catch (e) { o.thrown = String(e); } return o; })()`);
  await sleep(500);
  const txt = await ev(`$("tabS").textContent`);
  const st = r.st;
  const sane = !st || (Number.isFinite(st.s) && st.s >= 0 && st.s <= 1 && (!st.hp || (Number.isFinite(st.hv) && Number.isFinite(st.hx) && Math.hypot(st.hx - A.x, st.hz - A.z) < A.r + 5)) && (!st.mk || st.mk.length === A.n));
  console.log("  ", name, JSON.stringify(st), "jobs", r.jobs);
  ok(!r.thrown && errors.length === e0 && sane && !/NaN|undefined|\[object/.test(txt), `${name}: loads, no throw/page error, state sane, app text clean` + (r.thrown ? " " + r.thrown : "") + (errors.length > e0 ? " " + JSON.stringify(errors.slice(e0, e0 + 2)).slice(0, 300) : ""));
  await ev(`TABLET.toggle(false); true`);
}
console.log(fails ? `FAILED: ${fails}` : "all ok");
await done(fails ? 1 : 0);
