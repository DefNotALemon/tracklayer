// Beta 5.3 (staff happiness): try to break it. Prints numbers; exit 1 only on a hard failure (page error / NaN).
//  A. raise spam: wage and mood after 15 RAISEs in a row, from anywhere
//  B. praise/criticise ping-pong across 12 h gaps: mood bounds, NaN
//  C. time jumps: a 2000 h jump, and the clock going backwards (talk gate)
//  D. notice + owed + leave: wages paid on leaving, owed carried; PAY while on notice
//  E. reload mid-notice: notice/hap/ask survive; LET GO next to PRAISE (button order)
//  F. on the sled / in a room at the cabin: can you praise
import { boot, reload, ev, send, tap, sleep, shot, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const note = m => console.log("note " + m);
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const crew = id => J(`TLX.state("staff").crew.find(q => q.id === ${id}) || null`);
const plant = (place, o) => J(`(() => { const a = TLX.staff.post({ id: "${place}", role: "caretaker" }); Object.assign(a, ${JSON.stringify(o)}); return a; })()`);
const hire = async (place, o) => { const a = await plant(place, o); await ev(`TLX.staff.hire(${a.id}); true`); return a.id; };
const pass = (hours, step = 2) => ev(`(() => { for (let t = 0; t < ${hours}; t += ${step}) { GS.hour += ${step}; TLX.staff.crewTick(); } return true; })()`);
const goTo = place => ev(`(() => { const p = TLX.staff.places().find(q => q.id === "${place}"); FOOT.on = true; FOOT.x = p.x + 8; FOOT.z = p.z + 6; return true; })()`);

await boot();
await ev(`tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.hour = 34; GS.cash = 30000; GS.apps.realestate = 1; reBuy("fjellbu"); reBuy("viddastua"); true`);
await ev(`TLX.state("staff").apps = []; TLX.state("staff").next = 1e9; true`); await sleep(300);

// A
const A = await hire("re:fjellbu", { wage: 60, xpReal: 3, xp: 3 });
const w0 = (await crew(A)).wage;
for (let i = 0; i < 15; i++) await ev(`TLX.staff.raise(${A}); true`);
let m = await crew(A);
note(`A: 15 raises in a row: wage ${w0} -> ${m.wage}, mood ${m.mood}, asked-for talk gate none`);
ok(Number.isFinite(m.wage) && Number.isFinite(m.mood), "A: finite");
const fair = await ev(`TLX.staff.fair(TLX.state("staff").crew.find(q => q.id === ${A}))`);
note(`A: fair wage for their real skill = ${fair}; wage is ${(m.wage / fair).toFixed(2)}x fair, no cap, no cash check (cash ${await ev("GS.cash")})`);
await pass(24 * 4);
m = await crew(A); note(`A: after 4 days at that wage hap ${m.hap} (${await ev(`TLX.staff.moodWord(TLX.state("staff").crew.find(q=>q.id===${A}))`)})`);

// B
const B = await hire("re:viddastua", { wage: 40, xpReal: 3, xp: 3 });
await goTo("re:viddastua");
let moods = [];
for (let i = 0; i < 12; i++) {
  await ev(`GS.hour += 13; TLX.staff.crewTick(); true`);
  await ev(i % 2 ? `TLX.staff.criticise(${B}); true` : `TLX.staff.praise(${B}); true`);
  const q = await crew(B); moods.push([q.mood, q.hap, !!q.notice].join("/"));
  if (![q.mood, q.hap].every(Number.isFinite)) { ok(false, "B: NaN"); break; }
}
note("B: mood/hap/notice per step " + moods.join("  "));
// five criticisms in a row on a content person
let cn = 0; for (let i = 0; i < 6; i++) { await ev(`GS.hour += 13; TLX.staff.criticise(${B}); true`); }
m = await crew(B); note(`B: 6 criticisms every 13h: mood ${m.mood}, hap ${m.hap}, notice ${m.notice ? "yes" : "no"}, push ${m.push > 0}`);

// C
await ev(`GS.hour += 2000; TLX.staff.crewTick(); true`);
m = await crew(B); note(`C: +2000 h jump: crew still ${(await st()).crew.length}, hap ${m && m.hap}`);
async function st() { return J(`TLX.state("staff")`); }
const t0 = await ev("GS.hour");
await ev(`TLX.staff.praise(${B}); true`);
await ev(`GS.hour -= 30; TLX.staff.crewTick(); true`);
await ev(`TLX.staff.praise(${B}); true`);
const q2 = await crew(B);
const blocked = await ev(`(() => { const m = TLX.state("staff").crew.find(q => q.id === ${B}); return GS.hour - m.talk; })()`);
note(`C: clock stepped back 30 h after a praise: hour - talk = ${blocked} (negative = still blocked until the clock catches up)`);

// D: notice runs out in steps (a single big time jump would heal them: the ease uses dh up to 168 h at once)
await ev(`TLX.staff.letGo(${A}); TLX.staff.letGo(${B}); GS.cash = 30000; true`);
const D = await hire("re:fjellbu", { wage: 30, xpReal: 8, xp: 8 });
await pass(24 * 9, 4);
let d = await crew(D);
note(`D: wage 30 vs fair ${await ev(`TLX.staff.fair(TLX.state("staff").crew.find(q=>q.id===${D}) || {role:"caretaker",xpReal:8})`)}, after 9 days: ${d ? "hap " + d.hap + " notice " + !!d.notice + " ask " + JSON.stringify(d.ask) : "gone"}`);
if (d && !d.ask && !d.notice) { note("D: no ask / notice after 9 days underpaid"); }
await ev(`GS.cash = 0; true`);
await pass(24 * 9, 4);
const s2 = await st();
d = s2.crew.find(q => q.id === D);
note(`D: 9 more days at cash 0: ${d ? "still here hap " + d.hap + " notice " + !!d.notice : "left"}, owed ${s2.owed}`);
// E: reload with a planted notice
await ev(`GS.cash = 30000; TLX.staff.payOwed(); true`);
const E = d ? d.id : await hire("re:fjellbu", { wage: 30, xpReal: 8, xp: 8 });
await ev(`(() => { const m = TLX.state("staff").crew.find(q => q.id === ${E}); if (m) { m.notice = GS.hour + 100; m.hap = 20; m.ask = null; } return true; })()`);
await ev(`TLX.staff.crewTick(); save && save(); true`).catch(() => 0);
const before = await crew(E);
await reload();
await sleep(500);
const e2 = (await st()).crew.find(q => q.id === E);
note(`E: reload mid-notice: before ${JSON.stringify([before.hap, before.notice])} after ${e2 ? JSON.stringify([e2.hap, e2.notice]) : "gone"}`);
ok(!!e2 && !!e2.notice, "E: notice survives reload");
await ev(`TABLET.toggle(true, "staff"); TABLET.render(); true`); await sleep(400);
note("E: card button order: " + await ev(`[...document.querySelectorAll("#tabV [data-act]")].map(b => b.textContent.trim()).join(" | ")`));
await shot("x5_mood_break_card");
done(fails ? 1 : 0);
