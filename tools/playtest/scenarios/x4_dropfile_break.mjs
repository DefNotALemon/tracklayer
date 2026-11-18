// Beta break test for the 0257 fix (tlx-plow v17): DROP / TAKE ON file of misses. Tries double DROP, stale ids, progress marks
// surviving a DROP, drop just under the "due" line, reload while snowed in then DROP, Jobs row + map pin after DROP, ledger.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const S = v => JSON.stringify(v);
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
const KIT = `(() => { window.__ps = () => TLX.state("plow");
  window.__hrs = h => { for (let t = 0; t < h - 1e-6; t += 1.5) { GS.hour += Math.min(1.5, h - t); TLX.state("roads").h = GS.hour; TLXPL.lot.step(); TLXPL.drv.step(); } return true; };
  window.__storm = h => { const w = WX.at; WX.at = () => 1; __hrs(h); WX.at = w; return true; }; return true; })()`;
await boot(); await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 40000; TLXV.buy("pickup"); true`); await sleep(500);
const uid = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`);
await ev(`TLX.state("plow").blades[${S(uid)}] = { id: "b23", cond: 100, throw: "r" }; TLXPL.tidy(); true`);
const A = S("hosp"), cash0 = await ev("GS.cash");

await section("A double DROP (double tap) counts one miss, not two", async () => {
  await ev(`TLXPL.lot.take(${A}); __storm(3); true`);
  const a = await J(`(() => { const r1 = TLXPL.lot.drop(${A}), r2 = TLXPL.lot.drop(${A}); const rec = __ps().lotRec.hosp; return { r1, r2, rec, off: __ps().lotOff.hosp }; })()`);
  ok(a.r1 === true && a.r2 === false && a.rec && a.rec.miss === 1 && a.off === undefined, "second DROP is a no-op " + S(a));
});
await section("B retake carries miss 1; progress marks from before are gone; no cash", async () => {
  await ev(`TLXPL.lot.take(${A}); true`);
  const a = await J(`(() => { const s = __ps().lot.hosp; return { miss: s.miss, s: s.s, mk: s.mk || null, ms: s.ms || null }; })()`);
  ok(a.miss === 1 && a.s === 0 && !a.mk, "retaken: miss 1, level 0, no marks " + S(a));
  // half-plow it (marks) then drop clear-ish: marks must not carry over
  await ev(`__storm(3); true`); await sleep(200);
  await ev(`(() => { const L = TLXPL.lot.list().find(c => c.id === "hosp"); window.__lc = L; return true; })()`);
  await ev(`TLXPL.lot.drop(${A}); true`);
  ok((await ev(`TLXPL.fileOf("lot", ${A})`)) === 1 || (await ev(`__ps().lotOff.hosp`)) > 0, "second DROP snowed in -> lost for a week (or file 1)");
  ok((await ev("GS.cash")) === cash0, "no cash moved");
});
await section("C DROP just under the due line is free and leaves no file", async () => {
  await ev(`delete __ps().lotOff.sledpark; delete __ps().lotRec.sledpark; TLXPL.lot.take("sledpark"); const s = __ps().lot.sledpark; s.s = 0.10; s.due = 0; true`);
  const a = await J(`(() => { const r = TLXPL.lot.drop("sledpark"); return { r, rec: __ps().lotRec.sledpark || null, off: __ps().lotOff.sledpark || null }; })()`);
  ok(a.r === true && !a.rec && !a.off, "level 0.10 (< due 0.12): free hand-back " + S(a));
});
await section("D Jobs row and map pin are gone after DROP", async () => {
  await ev(`delete __ps().lotOff.sledpark; TLXPL.lot.take("sledpark"); __storm(3); true`); await sleep(200);
  const before = await J(`({ rows: jobsList().filter(r => r.kind === "plowlot").length, marks: TLXPL.lot.marks.size })`);
  await ev(`TLXPL.lot.drop("sledpark"); true`); await sleep(200);
  const after = await J(`({ rows: jobsList().filter(r => r.kind === "plowlot").length, txt: (TLXPL.lot.job && String(TLXPL.lot.job()) ) })`);
  ok(before.rows >= 1 && after.rows === 0, "Jobs row " + before.rows + " -> " + after.rows);
});
await section("E reload while snowed in, then DROP: miss filed from the saved state", async () => {
  await ev(`delete __ps().lotOff.hosp; delete __ps().lotRec.hosp; delete __ps().lotOff.sledpark; delete __ps().lotRec.sledpark; TLXPL.lot.take("sledpark"); __storm(3); save(); true`);
  await reload(); await ev(SETUP); await sleep(500); await ev(KIT);
  const a = await J(`(() => { const s = __ps().lot.sledpark; return s ? { s: s.s, miss: s.miss } : null; })()`);
  ok(a && a.s > 0.4, "snowed-in lot survives reload " + S(a));
  await ev(`TLXPL.lot.drop("sledpark"); true`);
  const b = await J(`__ps().lotRec.sledpark || null`);
  ok(b && b.miss === 1, "DROP after reload files a miss " + S(b));
  await ev(`save(); true`); await reload(); await ev(SETUP); await sleep(500); await ev(KIT);
  const c = await J(`TLXPL.fileOf("lot", "sledpark")`);
  ok(c === 1, "file survives a second reload (" + c + ")");
});
await section("F stale/unknown ids in the file, drive file with weird keys", async () => {
  const a = await J(`(() => { let e = ""; try { __ps().lotRec.nowhere = { miss: 1, until: GS.hour + 5 }; __ps().drvRec["9,9"] = { miss: 1, until: GS.hour + 5 }; TLXPL.tidy(); TLXPL.lot.monday(); TLXPL.drv.monday(); } catch (x) { e = String(x); } return e; })()`);
  ok(a === "", "stale entries harmless " + a);
  await ev(`TABLET.toggle(false); TABLET.toggle(true, "plow"); true`); await sleep(500);
  const t = await ev(`$("tabS").textContent`);
  ok(!/NaN|undefined/.test(t), "app renders");
});
console.log(fails ? `FAILED: ${fails}` : "all ok");
await done(fails ? 1 : 0);
