// Beta try-to-break for 5.1 Staff (tlx-staff.js, v221). Prints findings; exit 1 only on a hard failure.
//  A. summer skip (seasonTurn) with staff on the books: wages charged once or twice?
//  B. old save with no staff state, and a save with crew for a cabin that isn't owned
//  C. wages when cash is negative / fractional, hire+letgo churn at the same hour, night
//  D. phone-portrait layout of a full board (6 applicants)
import { boot, reload, ev, raw, send, sleep, shot, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const st = () => J(`TLX.state("staff")`);

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; GS.cash = 50000; GS.apps.realestate = 1; reBuy("fjellbu"); reBuy("viddastua"); TLX.staff.tick(); true`); await sleep(400);
let s = await st();
const a1 = s.apps.find(q => q.place === "re:fjellbu");
await ev(`TLX.staff.hire(${a1.id}); true`);
s = await st();
const wage = s.crew[0].wage;

// ---- A summer skip
const A = await J(`(() => { const S = TLX.state("staff"); const h0 = GS.hour, c0 = GS.cash, p0 = S.crew[0].paidTo;
  const bill = SEASON.settle(70); const c1 = GS.cash;
  // what the next Monday charges if the staff's paidTo is untouched by the skip
  return { h0, h1: GS.hour, p0, p1: S.crew[0].paidTo, staffLine: bill.lines.filter(l => /Staff/.test(l.name)), cashDelta: c1 - c0, owedCheck: S.owed }; })()`);
console.log("A", JSON.stringify(A));
ok(A.staffLine.length === 1 && A.staffLine[0].v === -wage * 10, `A: summer bill charges staff 10 weeks (${A.staffLine[0] && A.staffLine[0].v}, expect ${-wage * 10})`);
const A2 = await J(`(() => { const S = TLX.state("staff"); const c0 = GS.cash; TLX.monday({ label: "after summer" }); return { paid: c0 - GS.cash, wage: S.crew[0].wage, paidTo: S.crew[0].paidTo, hour: GS.hour }; })()`);
console.log("A2", JSON.stringify(A2));
ok(A2.paid === 0, `A: first Monday after the summer skip charges wages again: $${A2.paid} (weekly wage ${wage}) — a skip should settle paidTo`);

// ---- C
const C = await J(`(() => { const S = TLX.state("staff"); S.crew[0].paidTo = GS.hour - 168; GS.cash = -50; TLX.monday({ label: "neg" }); return { cash: GS.cash, owed: S.owed }; })()`);
console.log("C neg cash", JSON.stringify(C));
ok(C.cash === -50 && C.owed > 0, "C: negative cash: nothing taken, all owed (" + JSON.stringify(C) + ")");
await ev(`GS.cash = 100000; TLX.staff.payOwed(); true`);
const C2 = await J(`(() => { const S = TLX.state("staff"); return { owed: S.owed, cash: GS.cash, frac: Number.isInteger(GS.cash) }; })()`);
ok(C2.owed === 0, "C: owed cleared " + JSON.stringify(C2));
// hire + let go at the same hour repeatedly: free labour or free money?
const C3 = await J(`(() => { const S = TLX.state("staff"); const m = S.crew[0]; const c0 = GS.cash; TLX.staff.letGo(m.id); TLX.staff.tick(); const a = S.apps.find(q => q.place === "re:fjellbu"); const post = !!a; if (a) TLX.staff.hire(a.id); return { post, delta: c0 - GS.cash, crew: S.crew.length }; })()`);
console.log("C3", JSON.stringify(C3));
ok(C3.crew === 1, "C: let go then re-hire works (" + JSON.stringify(C3) + ")");

// ---- B old save / unowned crew
await ev(`save(); true`);
const sv = await raw(`localStorage.getItem(Object.keys(localStorage).find(k => /tracklayer/i.test(k)))`);
const obj = JSON.parse(sv);
const sysKey = obj.x && obj.x.sys ? "x.sys" : null;
console.log("staffsave", JSON.stringify(obj.x.sys).slice(0,400)); console.log("save keys", Object.keys(obj).slice(0, 40).join(","), "x:", obj.x ? Object.keys(obj.x).join(",") : "none");
if (obj.x && obj.x.sys) {
  const o1 = JSON.parse(sv); delete o1.x.sys.staff;
  await reload(o1);
  const b1 = await J(`({ s: TLX.state("staff"), hid: TABLET.byId.staff.hidden() })`);
  ok(b1.s && Array.isArray(b1.s.crew) && b1.s.crew.length === 0, "B: save without staff state loads clean");
  await ev(`TLX.staff.tick(); true`);
  const o2 = JSON.parse(sv); o2.x.sys.staff = o2.x.sys.staff || { v: 1, s: { crew: [{ id: 5, name: "X Y", village: "v", role: "caretaker", place: "re:fjellbu", wage: 40, xp: 3, xpReal: 3, tr: { work: 1, temper: 0.5, honest: true }, hired: 0, paidTo: 0 }], apps: [], owed: 0, last: [], seq: 5, next: 0 } }; o2.x.sys.staff.s.crew[0].place = "re:nowhere"; o2.x.sys.staff.s.owed = 77;
  await reload(o2);
  await ev(`TLX.staff.tick(); true`);
  const b2 = await J(`({ s: TLX.state("staff"), hid: TABLET.byId.staff.hidden() })`);
  console.log("B2", JSON.stringify({ crew: b2.s.crew.length, owed: b2.s.owed, hid: b2.hid }));
  ok(true, `B: crew at an unowned place: crew ${b2.s.crew.length}, owed ${b2.s.owed} (dropped silently, owed kept)`);
  const o3 = JSON.parse(sv); o3.x.sys.staff = o3.x.sys.staff || { v: 1, s: {} }; o3.x.sys.staff.s = o3.x.sys.staff.s || {}; o3.x.sys.staff.s.apps = [null, { id: 1 }]; o3.x.sys.staff.s.crew = [{ id: 9, place: "re:fjellbu" }];
  await reload(o3);
  const errs0 = await ev(`1`);
  try { await ev(`TLX.staff.tick(); TABLET.toggle(true, "staff"); true`); await sleep(500); ok(true, "B: malformed applicants/crew entries don't throw"); } catch (e) { ok(false, "B: malformed save throws: " + e.message.slice(0, 160)); }
}

// ---- D phone portrait, full board
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await ev(`SET.touch = "on"; setTouchUI(); true`);
await ev(`GS.hour = 22; GS.cash = 50000; reBuy("fjellbu"); reBuy("viddastua"); reBuy("risfjord"); (() => { const S = TLX.state("staff"); S.crew = []; S.apps = []; })(); for (let i = 0; i < 12; i++) { GS.hour = TLX.state("staff").next + 0.1; TLX.staff.tick(); } TABLET.toggle(true, "staff"); TABLET.render(); true`);
await sleep(700);
const D = await J(`({ n: TLX.state("staff").apps.length, tabW: $("tabV").getBoundingClientRect().width, sw: $("tabV").scrollWidth, cw: $("tabV").clientWidth })`);
console.log("D", JSON.stringify(D));
ok(D.n <= 6, "D: board capped at 6 (" + D.n + ")");
ok(D.sw <= D.cw + 2, `D: no sideways overflow on a phone (scrollWidth ${D.sw} vs ${D.cw})`);
await shot("x5_staff_phone");
await send("Emulation.clearDeviceMetricsOverride");
await done(fails ? 1 : 0);
