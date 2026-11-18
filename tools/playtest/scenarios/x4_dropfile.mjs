// Beta fix 0257 #1/#2 (tlx-plow v17): DROP and TAKE ON again no longer wipes a lot's or a drive's misses.
// A clear one with no miss is handed back for nothing; a miss goes on file for a week and TAKE ON picks it up;
// handing one back SNOWED IN is the owner digging it out by hand (a miss, the second loses it for a week).
// Asserts lots and drives alike, the app's cards and warnings, the touch layout, a reload, a lapsed file, junk, old saves.
import { boot, ev, sleep, done, reload, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const S = v => JSON.stringify(v);
const NOSTILLS = !!process.env.NOSTILLS;
const still = async (name, tf) => { if (NOSTILLS) return; if (tf) { await ev(`(() => { const e = $("tabS").querySelector("[data-tf='${tf}']"); if (e) e.scrollIntoView({ block: "center" }); return true; })()`); await sleep(300); } await shot(name); };
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80); return true; })()`);

const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
const KIT = `(() => {
  window.__ps = () => TLX.state("plow");
  window.__lst = id => { const s = __ps().lot[id]; return s ? JSON.parse(JSON.stringify(s)) : null; };
  window.__dst = k => { const s = __ps().drv[k]; return s ? JSON.parse(JSON.stringify(s)) : null; };
  window.__ly = id => { const c = TLXPL.lot.list().find(c => c.id === id); let best = null, bd = 1e9; for (const [k] of c.idx) { const i = Math.floor(k / 1024) - 512, j = k % 1024 - 512, d = Math.abs(Math.hypot(i, j) - c.r * 0.45); if (d < bd) { bd = d; best = [c.x + i, c.z + j]; } } return yardAt(best[0], best[1]); };
  window.__dy = k => { const c = TLXPL.drv.list().find(c => c.key === k); return yardAt(c.mx, c.mz); };
  window.__hrs = h => { for (let t = 0; t < h - 1e-6; t += 1.5) { GS.hour += Math.min(1.5, h - t); TLX.state("roads").h = GS.hour; TLXPL.lot.step(); TLXPL.drv.step(); } return true; };
  window.__storm = h => { const w = WX.at; WX.at = () => 1; __hrs(h); WX.at = w; return true; };
  // a week and an hour gone by with nobody's clock running (the file's own lapse is by the game hour alone)
  window.__week = () => { GS.hour += 169; TLX.state("roads").h = GS.hour; __ps().lotH = GS.hour; __ps().drvH = GS.hour; return true; };
  window.__card = tf => { const e = $("tabS").querySelector("[data-tf='" + tf + "']"); return e ? e.textContent.replace(/\\s+/g, " ") : null; };
  return true; })()`;
const app = async on => { await ev(on ? `TABLET.toggle(false); TABLET.toggle(true, "plow"); true` : `TABLET.toggle(false); true`); await sleep(on ? 450 : 150); };

await boot();
await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 40000; TLXV.buy("pickup"); true`); await sleep(500);
const uid = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`);
await ev(`TLX.state("plow").blades[${S(uid)}] = { id: "b23", cond: 100, throw: "r" }; TLXPL.tidy(); true`);
const A = S("hosp"), B = S("sledpark");
const DL = await J(`TLXPL.drv.list().map(c => ({ key: c.key, name: c.name }))`);
const k0 = S(DL[0].key), k1 = S(DL[1].key), n0 = DL[0].name, n1 = DL[1].name;
const cash0 = await ev("GS.cash");

await section("A a clear lot with nothing against you is handed back for nothing", async () => {
  await clearToasts();
  const a = await J(`(() => { const r = [TLXPL.lot.take(${A}), TLXPL.lot.drop(${A})]; return { r, rec: __ps().lotRec, off: __ps().lotOff, st: __lst(${A}), file: TLXPL.fileOf("lot", ${A}) }; })()`), t = await toasts();
  ok(a.r[0] === true && a.r[1] === true && a.st === null && Object.keys(a.rec).length === 0 && Object.keys(a.off).length === 0 && a.file === 0, "take + drop of a clear lot: nothing on file, not lost " + S(a.rec));
  ok(t.some(m => m.endsWith("The helsesenter has it cleared again.")) && !t.some(m => /snowed in when|remembered/.test(m)), "the DROP line is the plain one");
  const b = await J(`(TLXPL.lot.take(${A}), __lst(${A}))`);
  ok(b && b.miss === 0, "taken on again: no miss");
});

await section("B 0257 #1: a miss survives DROP and TAKE ON again", async () => {
  await ev(`__ps().lot.hosp.miss = 1; true`); await clearToasts();
  const a = await J(`(() => { const r = TLXPL.lot.drop(${A}); return { r, rec: __ps().lotRec.hosp, off: __ps().lotOff.hosp, hour: GS.hour, file: TLXPL.fileOf("lot", ${A}) }; })()`), t = await toasts();
  ok(a.r === true && a.rec && a.rec.miss === 1 && Math.abs(a.rec.until - a.hour - 168) < 0.01 && a.off === undefined && a.file === 1, "DROP of a clear lot with a miss: the miss goes on file for 168 h " + S(a.rec));
  ok(t.some(m => m.includes("The time it was dug out by hand is remembered for a week.")), "and the line says it is remembered");
  await app(true);
  const card = await ev(`__card("pll:hosp")`);
  ok(/ASKING/.test(card) && /DUG OUT BY HAND ONCE/.test(card) && /has not been forgotten: once more and it goes to someone else/.test(card) && /TAKE ON/.test(card) && !/NaN|undefined/.test(card), "the card of a lot that is not yours shows the miss on file (" + card.slice(0, 200) + ")");
  await still("f1_card_onfile", "pll:hosp");
  await app(false); await clearToasts();
  const b = await J(`(() => { const r = TLXPL.lot.take(${A}); return { r, st: __lst(${A}), rec: __ps().lotRec }; })()`), t2 = await toasts();
  ok(b.r === true && b.st.miss === 1 && b.st.s === 0 && b.rec.hosp === undefined, "TAKE ON picks the miss up (miss " + b.st.miss + ") and the file is closed");
  ok(t2.some(m => m.includes("has not been forgotten: once more and you lose it.")), "the TAKE ON line says so");
});

await section("C 0257 #2: handing a lot back snowed in is the owner digging it out", async () => {
  await ev(`__storm(3)`); await sleep(300);
  const y0 = await ev(`__ly(${A})`), s0 = await J(`__lst(${A})`);
  ok(s0.s > 0.4 && s0.miss === 1 && y0 < 0.62, "the forecourt (one miss) is snowed in: level " + s0.s.toFixed(2) + ", plowing " + y0.toFixed(2));
  await app(true);
  const card = await ev(`__card("pll:hosp")`);
  ok(/DROP it snowed in and it is dug out by hand: that counts against you like a lot left 12 hours, and it would be the second time\./.test(card), "its card warns before you press DROP (" + card.slice(-260) + ")");
  await still("f2_card_warn", "pll:hosp");
  await app(false); await clearToasts();
  const a = await J(`(() => { const r = TLXPL.lot.drop(${A}); return { r, st: __lst(${A}), off: __ps().lotOff.hosp, rec: __ps().lotRec.hosp, hour: GS.hour, y: __ly(${A}), jobs: jobsList().filter(r => r.kind === "plowlot").length }; })()`), t = await toasts();
  ok(a.r === true && a.st === null && a.off > a.hour + 160 && a.rec === undefined && a.jobs === 0, "the second miss by DROP: gone for a week, no file left, no Jobs row");
  ok(a.y > 0.8, "its owner has it cleared: the ground is plowed again (" + a.y.toFixed(2) + ")");
  ok(t.some(m => m.includes("You've given up the helsesenter's forecourt.") && m.includes("the second time it has had to be dug out by hand: it is not offered to you for a week.")), "the line says why (" + S(t) + ")");
  await clearToasts();
  const r = await ev(`TLXPL.lot.take(${A})`), t2 = await toasts();
  ok(r === false && t2.some(m => /has someone else plowing the helsesenter's forecourt\. Ask again in 7 days\./.test(m)), "TAKE ON straight after: refused for 7 days");
  await app(true);
  const c2 = await ev(`__card("pll:hosp")`);
  ok(/HAS SOMEONE ELSE/.test(c2) && /Offered again in 7 days/.test(c2), "and the card says so");
  await app(false);
});

await section("D the first miss by DROP, pressed on the touch layout, then the ordinary rule finishes it", async () => {
  await ev(`TLXPL.lot.take(${B}); __storm(3); true`); await sleep(300);
  ok((await J(`__lst(${B})`)).s > 0.4, "the sled park is yours and snowed in");
  await ev(`SET.touch = "on"; setTouchUI(); true`); await app(true);
  const card = await ev(`__card("pll:sledpark")`);
  ok(/DROP it snowed in and it is dug out by hand: that counts against you like a lot left 12 hours\./.test(card) && !/second time/.test(card), "a first-time warning on the card");
  await clearToasts();
  await ev(`$("tabS").querySelector("[data-act='paq:sledpark']").click(); true`); await sleep(450);
  const a = await J(`({ st: __lst(${B}), rec: __ps().lotRec.sledpark, off: __ps().lotOff.sledpark, y: __ly(${B}), card: __card("pll:sledpark") })`), t = await toasts();
  ok(a.st === null && a.rec && a.rec.miss === 1 && a.off === undefined && a.y > 0.8, "DROP pressed: a miss on file, the lot cleared by its owner " + S(a.rec));
  ok(t.some(m => m.includes("dug out by hand, and that is remembered if you ask for it back this week.")), "the line says it is remembered");
  ok(/ASKING/.test(a.card) && /DUG OUT BY HAND ONCE/.test(a.card), "the card redrawn: asking, with the miss shown");
  await ev(`$("tabS").querySelector("[data-act='pat:sledpark']").click(); true`); await sleep(450);
  const b = await J(`__lst(${B})`);
  ok(b && b.miss === 1 && b.s === 0, "TAKE ON pressed: yours again, clear, the miss with it");
  await ev(`SET.touch = "off"; setTouchUI(); true`); await app(false);
  await clearToasts(); await ev(`__storm(3); __hrs(12.5); true`); await sleep(300);
  const c = await J(`({ st: __lst(${B}), off: __ps().lotOff.sledpark, hour: GS.hour })`), t2 = await toasts();
  ok(c.st === null && c.off > c.hour + 160 && t2.some(m => /gone to someone else/.test(m)), "left 12 h after that: it is the second miss and the lot goes (" + S(t2) + ")");
});

await section("E a paid-off or lapsed file", async () => {
  await ev(`delete __ps().lotOff.hosp; TLXPL.lot.take(${A}); __ps().lot.hosp.miss = 1; TLXPL.lot.drop(${A}); true`);
  ok((await ev(`TLXPL.fileOf("lot", ${A})`)) === 1, "a miss on file again");
  await ev(`__week()`);
  await app(true);
  const card = await ev(`__card("pll:hosp")`); await app(false);
  ok((await ev(`TLXPL.fileOf("lot", ${A})`)) === 0 && !/DUG OUT BY HAND ONCE/.test(card), "169 h on: forgotten, the card clean");
  const a = await J(`(TLXPL.lot.take(${A}), { st: __lst(${A}), rec: __ps().lotRec })`);
  ok(a.st.miss === 0 && a.rec.hosp === undefined, "TAKE ON after a week: no miss");
});

await section("F the file is saved: a reload does not wipe it", async () => {
  await ev(`__ps().lot.hosp.miss = 1; TLXPL.lot.drop(${A}); save(); true`);
  await reload(); await ev(SETUP); await sleep(500); await ev(KIT);
  const a = await J(`({ rec: __ps().lotRec.hosp, file: TLXPL.fileOf("lot", ${A}), hour: GS.hour })`);
  ok(a.rec && a.rec.miss === 1 && a.file === 1 && a.rec.until > a.hour, "after a reload the miss is still on file " + S(a));
  const b = await J(`(TLXPL.lot.take(${A}), __lst(${A}))`);
  ok(b && b.miss === 1, "and TAKE ON still picks it up");
  await ev(`TLXPL.lot.drop(${A}); delete __ps().lotRec.hosp; true`);
});

await section("G drives: the same file", async () => {
  await clearToasts();
  const a = await J(`(() => { TLXPL.drv.take(${k0}); TLXPL.drv.drop(${k0}); return { rec: __ps().drvRec, off: __ps().drvOff }; })()`), t = await toasts();
  ok(Object.keys(a.rec).length === 0 && Object.keys(a.off).length === 0 && t.some(m => m.endsWith(`${n0} is back to shovelling it.`)), "a clear drive with nothing against you: handed back for nothing");
  await ev(`TLXPL.drv.take(${k0}); __ps().drv[${k0}].miss = 1; true`); await clearToasts();
  const b = await J(`(() => { TLXPL.drv.drop(${k0}); const rec = JSON.parse(JSON.stringify(__ps().drvRec[${k0}] || null)); TLXPL.drv.take(${k0}); return { rec, st: __dst(${k0}), left: __ps().drvRec[${k0}] }; })()`), t2 = await toasts();
  ok(b.rec && b.rec.miss === 1 && b.st.miss === 1 && b.left === undefined, "a drive's miss survives DROP and TAKE ON again (miss " + b.st.miss + ")");
  ok(t2.some(m => m.includes("The time it was shovelled by hand is remembered for a week.")) && t2.some(m => m.includes("has not been forgotten: once more and you lose the customer.")), "both lines say so");
  await ev(`TLXPL.drv.take(${k1}); __storm(3); true`); await sleep(300);
  const y0 = await ev(`__dy(${k0})`);
  ok((await J(`__dst(${k0})`)).s > 0.4 && (await J(`__dst(${k1})`)).s > 0.4 && y0 < 0.62, "two drives snowed in, one with a miss");
  await app(true);
  const c0 = await ev(`__card(${S("pld:" + DL[0].key)})`), c1 = await ev(`__card(${S("pld:" + DL[1].key)})`);
  ok(c0.includes(`DROP it snowed in and ${n0} digs it out by hand: that counts against you like a drive left 12 hours, and it would be the second time.`) && c1.includes(`DROP it snowed in and ${n1} digs it out by hand: that counts against you like a drive left 12 hours.`), "each card warns before DROP");
  await still("f3_drive_warn", "pld:" + DL[0].key);
  await clearToasts();
  await ev(`$("tabS").querySelector("[data-act='pdq:" + ${k1} + "']").click(); true`); await sleep(450);
  const d = await J(`({ st: __dst(${k1}), rec: __ps().drvRec[${k1}], off: __ps().drvOff[${k1}], y: __dy(${k1}), card: __card(${S("pld:" + DL[1].key)}) })`), t3 = await toasts();
  ok(d.st === null && d.rec && d.rec.miss === 1 && d.off === undefined && d.y > 0.8 && /ASKING/.test(d.card) && /SHOVELLED BY HAND ONCE/.test(d.card), "first drive DROPped snowed in: a miss on file, shovelled, the card shows it");
  ok(t3.some(m => m.includes(`${n1} will remember digging it out if you ask for it back this week.`)), "the line says it is remembered");
  await app(false); await clearToasts();
  const e = await J(`(() => { TLXPL.drv.drop(${k0}); return { st: __dst(${k0}), off: __ps().drvOff[${k0}], sulk: __ps().drvSulk[${k0}], rec: __ps().drvRec[${k0}], hour: GS.hour, y: __dy(${k0}), jobs: jobsList().filter(r => r.kind === "plowdrv").length }; })()`), t4 = await toasts();
  ok(e.st === null && e.off > e.hour + 160 && e.sulk === undefined && e.rec === undefined && e.y > 0.8 && e.jobs === 0, "the drive with a miss DROPped snowed in: the customer is gone for a week");
  ok(t4.some(m => m.includes(`the second time ${n0} has had to dig it out: not asking you again for a week.`)), "the line says why (" + S(t4) + ")");
  const r = await ev(`TLXPL.drv.take(${k0})`);
  ok(r === false, "TAKE ON refused");
});

await section("H junk in the file, an old save without one, no money anywhere", async () => {
  const a = await J(`(() => { const s = __ps(); let e = ""; try {
      s.lotRec = { hosp: 5, sledpark: { miss: 9, until: GS.hour + 50 }, zz: { miss: 1 }, yy: { miss: 0, until: 1e9 } }; s.drvRec = [1, 2];
      TLXPL.tidy(); } catch (x) { e = String(x); }
    return { e, lot: s.lotRec, drv: s.drvRec }; })()`);
  ok(a.e === "" && a.lot.hosp === undefined && a.lot.zz === undefined && a.lot.yy === undefined && a.lot.sledpark && a.lot.sledpark.miss === 1 && !Array.isArray(a.drv) && Object.keys(a.drv).length === 0, "junk tidied, nothing thrown " + S(a));
  const b = await J(`(() => { const s = __ps(); let e = ""; delete s.lotRec; delete s.drvRec; delete s.lotOff.hosp; delete s.lotOff.sledpark;
    try { TLXPL.lot.take(${A}); s.lot.hosp.miss = 1; TLXPL.lot.drop(${A}); TLXPL.drv.take(${k1}); TLXPL.drv.drop(${k1}); } catch (x) { e = String(x); }
    return { e, lot: s.lotRec, drv: s.drvRec }; })()`);
  ok(b.e === "" && b.lot && b.lot.hosp && b.lot.hosp.miss === 1 && b.drv && typeof b.drv === "object", "a save from before the file: DROP and TAKE ON build it " + S(b));
  await app(true);
  const txt = await ev(`$("tabS").textContent`); await app(false);
  ok(!/NaN|undefined/.test(txt), "the app renders");
  ok((await ev("GS.cash")) === cash0, "no DROP, TAKE ON or miss moved any cash");
});

console.log(fails ? `FAILED: ${fails}` : "all ok");
await done(fails ? 1 : 0);
