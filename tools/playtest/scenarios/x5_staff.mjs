// Slice 5.1 (G4): the Staff app, applicants and hiring (tlx-staff.js). Asserts, exit 1 on a failure.
//  A. no Real Estate: no Staff app; Real Estate but no cabin: the app explains, nobody applies
//  B. a cabin bought: one applicant at once for its caretaker job, more on schedule, at most 3 per vacancy; each has a
//     name, a village from the map, a wage and years shown; traits stay off the screen; about one in six oversell
//  C. an applicant withdraws when their days are up
//  D. hiring by keyboard (Enter on the focused card), a pad (A) and touch (tap on HIRE); the others for that job
//     withdraw; the caretaker lifts the cabin's nights let
//  E. Monday: wages pro rata from the hire hour; short of cash = owed, owed staff don't work, PAY settles it
//  F. let go: refused while wages are owed, then frees the job and it's posted again
//  G. saved: crew, applicants and owed survive a reload; the summer bill carries the wages
import { boot, reload, ev, raw, send, tap, sleep, shot, done, padSet, padOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const st = () => J(`TLX.state("staff")`);
const tabText = () => ev(`$("tabV").textContent`);

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; GS.cash = 30000; true`); await sleep(500);

// ---- A
let a = await J(`({ hid: TABLET.byId.staff ? TABLET.byId.staff.hidden() : null, s: TLX.state("staff") })`);
ok(a.hid === true, "A: no Real Estate: Staff app hidden");
await ev(`GS.apps.realestate = 1; TLX.staff.tick(); true`);
a = await J(`({ hid: TABLET.byId.staff.hidden(), n: TLX.state("staff").apps.length })`);
ok(a.hid === false && a.n === 0, "A: Real Estate installed: app shows, no cabin = no applicants");
await ev(`TABLET.toggle(true, "staff"); true`); await sleep(500);
ok(/Buy a depot cabin in Real Estate/.test(await tabText()), "A: the app says staff need somewhere to work");

// ---- B
await ev(`reBuy("fjellbu"); TLX.staff.tick(); true`); await sleep(300);
let s = await st();
ok(s.apps.length === 1 && s.apps[0].place === "re:fjellbu" && s.apps[0].role === "caretaker", "B: a cabin bought: one applicant at once for its caretaker (" + s.apps.length + ")");
const villages = await J(`SITES.filter(x => x.kind === "village").map(x => x.name).concat([depot.name.replace(/ quay$/, "")])`);
const A0 = s.apps[0];
ok(/^\S+ \S+$/.test(A0.name) && villages.includes(A0.village) && A0.wage >= 20 && A0.wage <= 110 && A0.xp >= 0 && A0.exp - A0.at >= 47 && A0.exp - A0.at <= 121, "B: applicant " + JSON.stringify(A0));
for (let i = 0; i < 6; i++) await ev(`GS.hour = TLX.state("staff").next + 0.1; TLX.staff.tick(); true`);
s = await st();
ok(s.apps.length === 3 && s.apps.every(q => q.place === "re:fjellbu"), "B: more applicants on schedule, capped at 3 per vacancy (" + s.apps.length + ")");
await sleep(400);
let txt = await tabText();
ok(s.apps.every(q => txt.includes(q.name)) && /years' experience|year's experience|no experience/.test(txt) && txt.includes("$"), "B: the board shows each applicant, experience and wage");
ok(!/temper|honest|work 0\.|xpReal/i.test(txt), "B: hidden traits stay off the screen");
const samp = await J(`(() => { const out = []; for (let i = 0; i < 900; i++) out.push(TLX.staff.post({ id: "re:fjellbu", role: "caretaker" })); const S = TLX.state("staff"); S.apps = S.apps.filter(q => !out.includes(q));
  return { over: out.filter(q => !q.tr.honest).length / out.length, lie: out.every(q => q.tr.honest ? q.xpReal === q.xp : q.xpReal <= q.xp), wmin: Math.min(...out.map(q => q.wage)), wmax: Math.max(...out.map(q => q.wage)), xmax: Math.max(...out.map(q => q.xp)),
    corr: out.filter(q => q.xp >= 10).reduce((t, q) => t + q.wage, 0) / Math.max(1, out.filter(q => q.xp >= 10).length) - out.filter(q => q.xp <= 2).reduce((t, q) => t + q.wage, 0) / Math.max(1, out.filter(q => q.xp <= 2).length) }; })()`);
console.log("sample", JSON.stringify(samp));
ok(samp.over > 0.11 && samp.over < 0.23 && samp.lie, "B: about one in six oversell (" + (samp.over * 100).toFixed(1) + "%), and only ever upward");
ok(samp.wmin >= 25 && samp.wmax <= 110 && samp.corr > 20, `B: wages ${samp.wmin}-${samp.wmax}, experienced ask more (+${samp.corr.toFixed(0)})`);

// ---- C
const ex = s.apps[1];
await ev(`GS.hour = ${ex.exp} + 0.1; TLX.staff.tick(); true`);
s = await st();
ok(!s.apps.some(q => q.id === ex.id), "C: an applicant withdraws when their time's up");

// ---- D keyboard
const occ0 = await ev(`reOcc(reCab("fjellbu"))`);
let tgt = s.apps[0];
await ev(`TABLET.toggle(true, "staff"); TABLET.render(); TABLET.focus = "sta:${tgt.id}"; TABLET.paintFocus(); true`); await sleep(300);
await tap("Enter"); await sleep(500);
s = await st();
ok(s.crew.length === 1 && s.crew[0].id === tgt.id && s.crew[0].place === "re:fjellbu", "D: keyboard Enter on the focused card hires " + tgt.name);
ok(!s.apps.some(q => q.place === "re:fjellbu"), "D: the other applicants for that job withdraw");
// base and with-caretaker read in the same frame (an aurora coming or going moves reOcc by 6 points between reads)
const oc = await J(`(() => { const c = reCab("fjellbu"), with1 = reOcc(c), f = TLX.staff.occ; TLX.staff.occ = () => 0; const base = reOcc(c); TLX.staff.occ = f; return { with1, base, lift: f("fjellbu") }; })()`);
const occ1 = oc.with1, lift = oc.lift;
ok(lift > 0.005 && lift <= 0.12 && occ1 > oc.base && Math.abs(occ1 - oc.base - lift) < 0.001, `D: the caretaker lifts nights let ${(occ0 * 100).toFixed(1)}% -> ${(occ1 * 100).toFixed(1)}% (+${(lift * 100).toFixed(1)})`);
await ev(`TLX.staff.tick(); true`);
ok((await st()).apps.length === 0, "D: no vacancy, no new applicants");
await sleep(300); txt = await tabText();
ok(txt.includes(tgt.name) && /On the books/.test(txt) && /Every place you own has its staff/.test(txt), "D: the app lists them on the books");
await shot("x5_staff_crew");

// ---- D pad
await ev(`reBuy("viddastua"); TLX.staff.tick(); TABLET.toggle(true, "staff"); TABLET.render(); true`); await sleep(300);
s = await st(); tgt = s.apps.find(q => q.place === "re:viddastua");
ok(!!tgt, "D: second cabin: an applicant for it");
await padSet({}); await sleep(400);
await ev(`TABLET.focus = "sta:${tgt.id}"; TABLET.paintFocus(); true`);
const pf = await J(`({ open: TABLET.open, app: TABLET.app, focus: TABLET.focus, padA: TABLET.padA, has: TABLET.focusables().some(e => e.dataset.tf === TABLET.focus) })`);
await padSet({ 0: 1 }); await sleep(400); await padSet({}); await sleep(300); await padOff();
s = await st();
if (!s.crew.some(m => m.id === tgt.id)) console.log("pad diag", JSON.stringify(pf), JSON.stringify(await J(`({ open: TABLET.open, app: TABLET.app, focus: TABLET.focus, foot: FOOT.on, dead: GS.dead })`)));
ok(s.crew.some(m => m.id === tgt.id && m.place === "re:viddastua"), "D: pad A hires " + tgt.name);

// ---- D touch
await ev(`reBuy("risfjord"); TLX.staff.tick(); TABLET.toggle(true, "staff"); TABLET.render(); true`); await sleep(400);
s = await st(); tgt = s.apps.find(q => q.place === "re:risfjord");
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
const r = await J(`(() => { const b = document.querySelector("[data-act='sth:${tgt.id}']"); b.scrollIntoView({ block: "center" }); const q = b.getBoundingClientRect(); return { x: q.x + q.width / 2, y: q.y + q.height / 2 }; })()`);
await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: r.x, y: r.y }] }); await sleep(60);
await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(500);
s = await st();
ok(s.crew.some(m => m.id === tgt.id), "D: a touch tap on HIRE hires " + tgt.name + " (at " + Math.round(r.x) + "," + Math.round(r.y) + ")");
await send("Emulation.setTouchEmulationEnabled", { enabled: false });

// ---- E Monday
const half = await J(`(() => { const S = TLX.state("staff"); S.crew.forEach(m => { m.paidTo = GS.hour - 84; }); const c0 = GS.cash, due = S.crew.reduce((t, m) => t + m.wage / 2, 0); TLX.monday({ label: "Mon 1" }); return { paid: c0 - GS.cash, due, owed: S.owed, last: S.last[0] }; })()`);
ok(Math.abs(half.paid - half.due) <= 1 && half.owed === 0 && half.last.wages === half.paid, `E: Monday pays half a week pro rata: $${half.paid} (due ${half.due})`);
const short = await J(`(() => { const S = TLX.state("staff"); S.crew.forEach(m => { m.paidTo = GS.hour - 168; }); GS.cash = 10; TLX.monday({ label: "Mon 2" }); return { cash: GS.cash, owed: S.owed, occ: TLX.staff.occ("fjellbu"), badge: TABLET.byId.staff.badge() }; })()`);
ok(short.cash === 0 && short.owed > 0 && short.occ === 0 && short.badge === "!", `E: short of cash: $${short.owed} owed, nobody works (lift ${short.occ}), badge ${short.badge}`);
await ev(`TABLET.render(); true`); await sleep(200);
ok(/Wages owed/.test(await tabText()), "E: the app shows wages owed with PAY IT");

// ---- F
const m0 = s.crew[0].id;
await ev(`TLX.staff.letGo(${m0}); true`);
ok((await st()).crew.some(m => m.id === m0), "F: can't let anyone go while wages are owed");
await ev(`GS.cash = 5000; TABLET.render(); true`); await sleep(200);
await ev(`document.querySelector("[data-act='sto']").click(); true`); await sleep(200);
a = await J(`({ owed: TLX.state("staff").owed, occ: TLX.staff.occ("fjellbu") })`);
ok(a.owed === 0 && a.occ > 0, "F: PAY IT settles the wages and the caretaker's back at work");
await ev(`TABLET.render(); true`); await sleep(200);
await ev(`document.querySelector("[data-act='stl:${m0}']").click(); true`); await sleep(200);
await ev(`GS.hour += 3; TLX.staff.tick(); true`);
s = await st();
ok(!s.crew.some(m => m.id === m0) && s.apps.some(q => q.place === "re:fjellbu"), "F: LET GO frees the job and it's posted again");

// ---- G
const bill = await J(`(() => { const b = SEASON.bills.find(q => q.name === "Staff wages"); return { w: b ? b.perWeek() : null, sum: TLX.state("staff").crew.reduce((t, m) => t + m.wage, 0) }; })()`);
ok(bill.w === -bill.sum && bill.sum > 0, "G: the summer bill carries the wages (" + bill.w + ")");
await ev(`TLX.state("staff").owed = 12; save(); true`);
const before = await st();
await reload();
const after = await st();
ok(JSON.stringify(after.crew) === JSON.stringify(before.crew) && after.apps.length === before.apps.length && after.owed === 12 && after.seq === before.seq, "G: crew, applicants and owed survive a reload");
await ev(`TABLET.toggle(true, "staff"); true`); await sleep(500);
txt = await tabText();
ok(after.crew.every(m => txt.includes(m.name)), "G: the app lists the crew after the reload");
await shot("x5_staff_reload");
await done(fails ? 1 : 0);
