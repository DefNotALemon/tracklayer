// Slice 5.3 (G4): staff happiness, praise/criticism in person, raises, notice and quitting (tlx-staff.js). Asserts,
// exit 1 on a failure.
//  A. a new hire has a mood word on their card; away from their cabin PRAISE / CRITICISE are greyed and say where to go
//  B. at the cabin (on foot, within 30 m): PRAISE (keyboard Enter on the button) lifts mood +10; again at once is
//     refused (once per 12 game hours); 13 h later praise again gives only +4
//  C. underpaid for what they can really do: happiness drifts down by game hour, and their work (occupancy lift) drops
//  D. unhappy and 5+ days in: they ask for a raise (WANTS A RAISE, GIVE/REFUSE); pad A on GIVE sets the wage
//  E. criticism: a content one knuckles down (work x1.2 for 3 days); a fed-up hot-tempered one hands in notice
//  F. notice: miserable for a day -> notice; a raise that brings them back to 50 withdraws it; otherwise after a week
//     they leave, paid, and the job is posted again
//  G. option walkout: wages owed for 72 game hours and everyone walks out (debt stays); with it off nobody does
//  H. a touch tap on RAISE works; hap/notice/ask survive a reload; a 5.2-style crew record (no 5.3 fields) loads
import { boot, reload, ev, send, tap, sleep, shot, done, padSet, padOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const st = () => J(`TLX.state("staff")`);
const tabText = () => ev(`$("tabV").textContent`);
const crew = id => J(`TLX.state("staff").crew.find(q => q.id === ${id}) || null`);
const plant = (place, o) => J(`(() => { const a = TLX.staff.post({ id: "${place}", role: "caretaker" }); Object.assign(a, ${JSON.stringify(o)}); a.tr = Object.assign(a.tr, ${JSON.stringify(o.tr || {})}); return a; })()`);
const hire = async (place, o) => { const a = await plant(place, o); await ev(`TLX.staff.hire(${a.id}); true`); return a.id; };
// advance game time in steps, ticking the crew each step
const pass = (hours, step = 2) => ev(`(() => { for (let t = 0; t < ${hours}; t += ${step}) { GS.hour += ${step}; TLX.staff.crewTick(); } return true; })()`);
const goTo = place => ev(`(() => { const p = TLX.staff.places().find(q => q.id === "${place}"); FOOT.on = true; FOOT.x = p.x + 8; FOOT.z = p.z + 6; return true; })()`);
const goAway = () => ev(`(() => { const p = TLX.staff.places()[0]; FOOT.on = true; FOOT.x = p.x + 400; FOOT.z = p.z + 300; return true; })()`);
const render = async () => { await ev(`TABLET.render(); true`); await sleep(250); };

await boot();
await ev(`tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.hour = 34; GS.cash = 30000; GS.apps.realestate = 1; reBuy("fjellbu"); reBuy("viddastua"); reBuy("risfjord"); true`);
await ev(`TLX.state("staff").apps = []; TLX.state("staff").next = 1e9; true`);
await sleep(300);

// ---- A
const A = await hire("re:fjellbu", { xp: 8, xpReal: 8, wage: 58, tr: { honest: true, temper: 0.2, work: 1.1 } });
await goAway();
await ev(`TABLET.toggle(true, "staff"); true`); await render();
let m = await crew(A);
ok(m && m.hap >= 60 && m.hap <= 80 && m.mood === 0 && m.notice === 0, `A: new hire starts content-to-happy (hap ${m && m.hap})`);
let txt = await tabText();
ok(/HAPPY|CONTENT/.test(txt) && !/hap\b|temper/i.test(txt), "A: the card shows a mood word, never the number or traits");
ok(await ev(`document.querySelector("[data-act='stp:${A}']").disabled && document.querySelector("[data-act='stk:${A}']").disabled`) && /Go to .* to talk to/.test(txt), "A: away from the cabin PRAISE/CRITICISE are greyed and say where to go");
ok(!(await ev(`TLX.staff.praise(${A})`)), "A: praise() refuses from afar");
await shot("x5_mood_away");

// ---- B
await goTo("re:fjellbu"); await render();
ok(await ev(`TLX.staff.atPlace(TLX.state("staff").crew.find(q => q.id === ${A}))`) && !(await ev(`document.querySelector("[data-act='stp:${A}']").disabled`)), "B: at the cabin the buttons are live");
await ev(`TABLET.focus = "stp:${A}"; TABLET.paintFocus(); true`); await tap("Enter"); await sleep(300);
m = await crew(A);
ok(Math.abs(m.mood - 10) < 0.01, `B: Enter on PRAISE: mood +10 (${m.mood})`);
ok(!(await ev(`TLX.staff.praise(${A})`)), "B: praise again at once is refused");
await pass(13, 13);
const mood13 = (await crew(A)).mood;
await ev(`TLX.staff.praise(${A}); true`);
m = await crew(A);
ok(Math.abs(m.mood - (mood13 + 4)) < 0.05, `B: 13 h later, praise again gives +4 (${mood13.toFixed(2)} -> ${m.mood.toFixed(2)})`);
await shot("x5_mood_praise");

// ---- C drift + work
await ev(`(() => { const m = TLX.state("staff").crew.find(q => q.id === ${A}); m.mood = 0; m.hap = 70; m.wage = Math.round(TLX.staff.fair(m) * 0.6); })(); true`);
const occ0 = await ev(`TLX.staff.occ("fjellbu")`), tg = await ev(`TLX.staff.target(TLX.state("staff").crew.find(q => q.id === ${A}), GS.hour)`);
await pass(48);
m = await crew(A);
const occ1 = await ev(`TLX.staff.occ("fjellbu")`);
console.log("C", JSON.stringify({ tg, hap: m.hap, occ0, occ1 }));
ok(tg < 40 && m.hap < 70 - 14 && m.hap >= tg - 0.01, `C: underpaid: target ${tg.toFixed(1)}, hap 70 -> ${m.hap.toFixed(1)} over 48 game h (8/day)`);
ok(occ1 < occ0 * 0.9, `C: their work drops with it: lift ${(occ0 * 100).toFixed(1)}% -> ${(occ1 * 100).toFixed(1)}%`);

// ---- D raise request + pad A on GIVE
await ev(`(() => { const m = TLX.state("staff").crew.find(q => q.id === ${A}); m.hired = GS.hour - 130; m.hap = 45; m.ask = null; m.asked = -1e9; m.lowT = 0; })(); true`);
await pass(2);
m = await crew(A);
ok(m.ask && m.ask.amt >= m.wage + 3, `D: unhappy and 5 days in: asks for a raise ($${m.wage} -> $${m.ask && m.ask.amt})`);
await render(); txt = await tabText();
ok(/WANTS A RAISE/.test(txt) && await ev(`!!document.querySelector("[data-act='sty:${A}']") && !!document.querySelector("[data-act='stn:${A}']")`), "D: WANTS A RAISE chip, GIVE and REFUSE buttons");
await shot("x5_mood_ask");
const askAmt = m.ask.amt;
await padSet({}); await sleep(300);
await ev(`TABLET.focus = "sty:${A}"; TABLET.paintFocus(); true`);
await padSet({ 0: 1 }); await sleep(400); await padSet({}); await sleep(300); await padOff();
m = await crew(A);
ok(m.wage === askAmt && !m.ask && m.mood >= 14, `D: pad A on GIVE: wage $${m.wage}, ask cleared, mood +15`);
ok(!(await ev(`TLX.staff.answerAsk(${A}, true)`)), "D: nothing left to answer");

// ---- E criticism
const H = await hire("re:risfjord", { xp: 5, xpReal: 5, wage: 48, tr: { honest: true, temper: 0.9, work: 1 } });
await goTo("re:risfjord");
await ev(`(() => { const m = TLX.state("staff").crew.find(q => q.id === ${H}); m.hap = 60; m.talk = -1e9; })(); true`);
const pf0 = await ev(`TLX.staff.perf(TLX.state("staff").crew.find(q => q.id === ${H}))`);
await ev(`TLX.staff.criticise(${H}); true`);
m = await crew(H);
const pf1 = await ev(`TLX.staff.perf(TLX.state("staff").crew.find(q => q.id === ${H}))`);
ok(m.push > (await ev(`GS.hour`)) + 70 && Math.abs(pf1 / pf0 - 1.2) < 0.01 && m.mood <= -16.9 && !m.notice, `E: content: knuckles down (work x${(pf1 / pf0).toFixed(2)}), mood ${m.mood.toFixed(1)}, no notice`);
await ev(`(() => { const m = TLX.state("staff").crew.find(q => q.id === ${H}); m.hap = 30; m.talk = -1e9; })(); true`);
await ev(`TLX.staff.criticise(${H}); true`);
m = await crew(H);
ok(m.notice > 0, "E: fed up and short-tempered: criticism -> notice on the spot");
await render(); txt = await tabText();
ok(/ON NOTICE/.test(txt) && /Leaves in 7 days/.test(txt), "E: card says ON NOTICE, leaves in 7 days");
await shot("x5_mood_notice");

// ---- F notice from misery, talked round, and leaving
await ev(`(() => { const m = TLX.state("staff").crew.find(q => q.id === ${H}); m.notice = 0; m.hap = 20; m.mood = -30; m.lowT = 0; m.wage = 22; m.ask = null; m.asked = GS.hour; })(); true`);
await pass(26);
m = await crew(H);
ok(m.notice > 0, `F: miserable for a day: notice (hap ${m.hap.toFixed(1)})`);
await ev(`(() => { const m = TLX.state("staff").crew.find(q => q.id === ${H}); m.wage = 80; m.mood = 30; })(); true`);
await pass(120, 4);
m = await crew(H);
ok(m && m.notice === 0 && m.hap >= 50, `F: a fair wage brings them back to ${m && m.hap.toFixed(1)}: notice withdrawn`);
await ev(`(() => { const m = TLX.state("staff").crew.find(q => q.id === ${H}); m.wage = 22; m.mood = -30; m.hap = 20; m.lowT = 0; m.asked = GS.hour + 999; })(); true`);
await pass(26);
const cash0 = await ev(`GS.cash`);
await pass(170, 4);
let s = await st();
await ev(`TLX.staff.tick(); true`); s = await st();
ok(!s.crew.some(q => q.id === H) && s.owed === 0, `F: a week later they've left, paid (cash ${cash0.toFixed(0)} -> ${(await ev(`GS.cash`)).toFixed(0)})`);
ok(s.apps.some(q => q.place === "re:risfjord") || (await J(`TLX.staff.vacancies().map(v => v.id)`)).includes("re:risfjord"), "F: the job is open again");

// ---- G walkout
await ev(`TLX.state("staff").apps = []; true`);
const W1 = await hire("re:risfjord", { xp: 3, xpReal: 3, wage: 40, tr: { honest: true, temper: 0.3, work: 1 } });
await ev(`TLX.setOn("walkout", false); TLX.state("staff").owed = 200; TLX.state("staff").owedT = 0; true`);
await pass(80, 4);
s = await st();
ok(s.crew.length === 2 && s.crew.some(q => q.id === W1), `G: option off: 80 h owed, nobody walks out (${s.crew.length} on the books)`);
await ev(`(() => { TLX.setOn("walkout", true); const S = TLX.state("staff"); S.owedT = 0; for (const m of S.crew) { m.hap = 70; m.mood = 30; m.notice = 0; m.lowT = 0; } })(); true`);
await pass(76, 4);
s = await st();
ok(s.crew.length === 0 && s.owed >= 200, `G: option on: 72 h owed and everyone walks out, debt stays ($${s.owed.toFixed(0)})`);
await ev(`TLX.state("staff").owed = 0; TLX.state("staff").apps = []; true`);

// ---- H touch tap on RAISE, reload, old crew record
const T = await hire("re:viddastua", { xp: 10, xpReal: 10, wage: 62, tr: { honest: true, temper: 0.4, work: 1 } });
await goAway(); await render();
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
const r = await J(`(() => { const b = document.querySelector("[data-act='str:${T}']"); b.scrollIntoView({ block: "center" }); const q = b.getBoundingClientRect(); return { x: q.x + q.width / 2, y: q.y + q.height / 2 }; })()`);
await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: r.x, y: r.y }] }); await sleep(60);
await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(400);
await send("Emulation.setTouchEmulationEnabled", { enabled: false });
m = await crew(T);
ok(m.wage === 68 && m.mood >= 11.9, `H: a touch tap on RAISE (from anywhere): $62 -> $${m.wage}, mood +12`);
await ev(`(() => { const m = TLX.state("staff").crew.find(q => q.id === ${T}); m.hap = 33.5; m.notice = GS.hour + 100; m.ask = { amt: 75, at: GS.hour }; })(); true`);
const sv = await J(`(() => { save(); return JSON.parse(localStorage.getItem("tracklayer.save.v2")); })()`);
// a 5.2-era crew record for a real cabin (fjellbu is vacant since the walkout): no 5.3 fields at all
const hh = await ev(`GS.hour`);
sv.x.sys.staff.s.crew.push({ id: A, name: "Old Record", village: "Mehamn", role: "caretaker", place: "re:fjellbu", wage: 50, xp: 5, xpReal: 5, tr: { work: 1, temper: 0.2, honest: true }, hired: hh, paidTo: hh, caught: false, chk: true });
await reload(sv);
await sleep(500);
m = await crew(T);
ok(m && Math.abs(m.hap - 33.5) < 1 && m.notice > 0 && m.ask && m.ask.amt === 75, "H: hap, notice and the raise request survive a reload");
const old = await crew(A);
ok(old && Math.abs(old.hap - 65) < 1 && old.mood === 0 && old.notice === 0 && old.ask === null, `H: a 5.2-style crew record loads with hap 65 (${JSON.stringify(old && { hap: old.hap, mood: old.mood })})`);
const errs = await J(`(() => { try { GS.hour += 1; TLX.staff.tick(); TABLET.toggle(true, "staff"); TABLET.render(); return { ok: true }; } catch (e) { return { ok: false, e: String(e) }; } })()`);
ok(errs.ok, "H: board ticks and renders after the reload " + JSON.stringify(errs));
await sleep(300); await shot("x5_mood_reload");
await done(fails ? 1 : 0);
