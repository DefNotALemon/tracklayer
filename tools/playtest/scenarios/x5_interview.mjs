// Slice 5.2 (G4): interviews in the Staff app (tlx-staff.js). Asserts, exit 1 on a failure.
//  A. INTERVIEW on an applicant card opens a chat (greeting bubble, four questions, two offers, HIRE AT); keyboard
//     Enter on the card still hires (5.1), Enter on the INTERVIEW button opens the chat
//  B. an honest applicant answers all four, never slips; the reference checks them out; each question asked once
//  C. overselling: across 240 oversellers asked for a reference, ~85% are caught (honest: 0%); a caught one's card says
//     what they really have and their asking wage drops to what that's worth
//  D. a fair wage offer is a deal and the hire is at the agreed wage; checked/caught carry over to the crew record
//  E. a lowball to a short-tempered applicant: they stop negotiating (questions and offers off), HIRE still works
//  F. patience runs out: they say they've said enough
//  G. pad A and a touch tap drive the chat; chat/caught/checked survive a reload; a 5.1-style applicant (no
//     interview fields) can be interviewed; a save with a null applicant loads and the board keeps ticking (0173 #1)
import { boot, reload, ev, raw, send, tap, sleep, shot, done, padSet, padOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const st = () => J(`TLX.state("staff")`);
const tabText = () => ev(`$("tabV").textContent`);
const app = id => J(`TLX.state("staff").apps.find(q => q.id === ${id}) || null`);
const waitReply = async id => { for (let i = 0; i < 40; i++) { await sleep(150); if (!(await ev(`TLX.staff.typing(${id})`))) return; } };
// plant an applicant for a cabin with the traits a test wants
const plant = (place, o) => J(`(() => { const a = TLX.staff.post({ id: "${place}", role: "caretaker" }); Object.assign(a, ${JSON.stringify(o)}); a.tr = Object.assign(a.tr, ${JSON.stringify(o.tr || {})}); return a; })()`);

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; GS.cash = 30000; GS.apps.realestate = 1; reBuy("fjellbu"); reBuy("viddastua"); reBuy("risfjord"); true`);
await ev(`TLX.state("staff").apps = []; TLX.state("staff").next = 1e9; true`);   // the test plants its own applicants
await sleep(300);

// ---- A
const H = await plant("re:fjellbu", { xp: 9, xpReal: 9, wage: 60, tr: { honest: true, temper: 0.1, work: 1.2 } });
await ev(`TABLET.toggle(true, "staff"); TABLET.render(); true`); await sleep(400);
ok(await ev(`!!document.querySelector("[data-act='sti:${H.id}']")`), "A: the applicant card has an INTERVIEW button");
await ev(`TABLET.focus = "sti:${H.id}"; TABLET.paintFocus(); true`); await tap("Enter"); await sleep(400);
let txt = await tabText();
ok(await ev(`TLX.staff.view`) === H.id && /INTERVIEW/.test(txt) && /I saw the caretaker job/.test(txt), "A: Enter on INTERVIEW opens the chat with a greeting");
const nq = await ev(`document.querySelectorAll("#tabV [data-stq]").length`), no = await ev(`document.querySelectorAll("#tabV [data-sto]").length`);
ok(nq === 4 && no === 2 && await ev(`!!document.querySelector("#tabV [data-sthire]")`), `A: four questions (${nq}), two offers (${no}), HIRE AT`);
await shot("x5_iv_open");

// ---- B honest, all four by keyboard/click
for (const q of ["xp", "stove", "ref", "why"]) { await ev(`document.querySelector("#tabV [data-stq='${q}']").click(); true`); await sleep(200); ok(await ev(`TLX.staff.typing(${H.id})`), `B: ${q}: they're typing`); await waitReply(H.id); }
let a = await app(H.id);
ok(a.chat.length === 8 && a.chat.filter(m => m.me).length === 4, "B: four questions, four answers (" + a.chat.length + " bubbles)");
ok(!a.caught && a.chk === true && a.wage === 60, "B: honest: never caught, the reference checked out, ask unchanged");
ok(/9 years/.test(a.chat[1].t) && /flue/.test(a.chat[3].t) && /with us/.test(a.chat[5].t) && /run properly/.test(a.chat[7].t), "B: answers fit: 9 years, knows stoves, reference vouches, keen");
ok(!(await ev(`TLX.staff.ask(${H.id}, "xp")`)), "B: a question can't be asked twice");
await ev(`TABLET.render(); true`); await sleep(200);
ok(await ev(`[...document.querySelectorAll("#tabV [data-stq]")].every(b => b.disabled)`), "B: asked questions are greyed out");
txt = await tabText();
ok(/REFERENCE CHECKED/.test(txt) && !/temper|honest|xpReal|work 0\./i.test(txt), "B: chip shows; hidden traits never named");
await shot("x5_iv_honest");

// ---- C overselling, statistically
const C = await J(`(() => { const S = TLX.state("staff"), L = [], Hn = []; for (let i = 0; i < 240; i++) { const a = TLX.staff.post({ id: "re:viddastua", role: "caretaker" }); a.tr.honest = false; a.xp = 12; a.xpReal = 3; a.wage = 75; a.exp = GS.hour + 99; L.push(a.id); }
  for (let i = 0; i < 120; i++) { const a = TLX.staff.post({ id: "re:viddastua", role: "caretaker" }); a.tr.honest = true; a.xpReal = a.xp; a.exp = GS.hour + 99; Hn.push(a.id); }
  for (const id of L.concat(Hn)) TLX.staff.ask(id, "ref"); return { L, Hn }; })()`);
await sleep(2200);
const cr = await J(`(() => { const S = TLX.state("staff"), f = ids => ids.map(id => S.apps.find(q => q.id === id)).filter(Boolean);
  const L = f(${JSON.stringify(C.L)}), Hn = f(${JSON.stringify(C.Hn)});
  return { n: L.length, caught: L.filter(q => q.caught).length / L.length, hc: Hn.filter(q => q.caught).length, hchk: Hn.filter(q => q.chk).length / Hn.length, lchk: L.filter(q => q.chk).length,
    wage: L.find(q => q.caught).wage, wageU: (L.find(q => !q.caught) || { wage: 75 }).wage }; })()`);
console.log("C", JSON.stringify(cr));
ok(cr.n === 240 && cr.caught > 0.76 && cr.caught < 0.93, `C: a reference catches ${(cr.caught * 100).toFixed(0)}% of oversellers (design 85%)`);
ok(cr.hc === 0 && cr.hchk === 1 && cr.lchk === 0, "C: honest applicants never caught and always checked; oversellers never checked");
ok(cr.wage < 75 && cr.wage <= Math.round(30 + 3.2 * 3 + 2) && cr.wageU === 75, `C: caught: ask drops $75 -> $${cr.wage}`);
await ev(`(() => { const S = TLX.state("staff"), keep = new Set([${H.id}, ${C.L.find((_, i) => i === 0)}]); const c = S.apps.find(q => q.id === ${C.L[0]}); S.apps = S.apps.filter(q => keep.has(q.id)); })(); true`);
let cid = (await st()).apps.find(q => q.place === "re:viddastua" && q.caught);
if (!cid) { await ev(`(() => { const S = TLX.state("staff"), a = TLX.staff.post({ id: "re:viddastua", role: "caretaker" }); a.tr.honest = false; a.xp = 12; a.xpReal = 3; a.caught = true; a.wage = 41; })(); true`); cid = (await st()).apps.find(q => q.place === "re:viddastua"); }
await ev(`TLX.staff.interview(null); TABLET.render(); true`); await sleep(200);
txt = await tabText();
ok(/CAUGHT OUT/.test(txt) && /says 12 years' experience, really about 3/.test(txt), "C: the board card says CAUGHT OUT, 12 claimed, about 3 really");

// ---- D wage deal + hire by pad A
await ev(`TLX.staff.interview(${H.id}); true`); await sleep(200);
let fl = (await app(H.id)).floor;
await ev(`TLX.staff.state; TLX.state("staff").apps.find(q => q.id === ${H.id}).pat = 5; true`);
await ev(`document.querySelector("#tabV [data-sto='0.92']").click(); true`); await waitReply(H.id);
a = await app(H.id);
ok(a.deal && a.wage === Math.round(60 * 0.92) && a.wage >= fl, `D: $${Math.round(60 * 0.92)} (floor $${fl}) is a deal: wage now $${a.wage}`);
await ev(`TABLET.render(); true`); await sleep(200);
ok(await ev(`[...document.querySelectorAll("#tabV [data-sto]")].every(b => b.disabled)`) && /WAGE AGREED/.test(await tabText()), "D: offers off, WAGE AGREED chip");
await padSet({}); await sleep(300);
await ev(`TABLET.focus = "sthire"; TABLET.paintFocus(); true`);
await padSet({ 0: 1 }); await sleep(400); await padSet({}); await sleep(300); await padOff();
let s = await st(); let m = s.crew.find(q => q.id === H.id);
ok(!!m && m.wage === a.wage && m.chk === true && m.caught === false, "D: pad A on HIRE AT hires at the agreed wage, reference check carried over");
ok(await ev(`TLX.staff.view`) === null && /On the books/.test(await tabText()) && /reference checked/.test(await tabText()), "D: back on the board, crew card notes the checked reference");

// ---- E hot-tempered lowball (touch tap on the offer)
const T = await plant("re:risfjord", { xp: 6, xpReal: 6, wage: 55, tr: { honest: true, temper: 0.9, work: 0.7 } });
await ev(`(() => { const a = TLX.state("staff").apps.find(q => q.id === ${T.id}); a.floor = 53; a.pat = 5; })(); TLX.staff.interview(${T.id}); TABLET.render(); true`); await sleep(300);
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
const r = await J(`(() => { const b = document.querySelector("#tabV [data-sto='0.85']"); b.scrollIntoView({ block: "center" }); const q = b.getBoundingClientRect(); return { x: q.x + q.width / 2, y: q.y + q.height / 2 }; })()`);
await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: r.x, y: r.y }] }); await sleep(60);
await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(300);
await waitReply(T.id);
await send("Emulation.setTouchEmulationEnabled", { enabled: false });
a = await app(T.id);
ok(a.chat.length === 2 && a.mute && !a.deal && /insult/.test(a.chat[1].t) && a.wage === 55, "E: a touch tap sent the lowball; short-tempered: insulted, stops negotiating, ask stays $55");
ok(!(await ev(`TLX.staff.ask(${T.id}, "why")`)) && !(await ev(`TLX.staff.offer(${T.id}, 0.92)`)), "E: no more questions or offers");
await ev(`TABLET.render(); true`); await sleep(200);
ok(await ev(`[...document.querySelectorAll("#tabV [data-stq],#tabV [data-sto]")].every(b => b.disabled) && !document.querySelector("#tabV [data-sthire]").disabled`), "E: buttons greyed, HIRE AT still works");
await shot("x5_iv_insult");
await ev(`document.querySelector("#tabV [data-sthire]").click(); true`); await sleep(200);
ok((await st()).crew.some(q => q.id === T.id && q.wage === 55), "E: hired at the asking wage");

// ---- F patience
const P = await plant("re:viddastua", { xp: 4, xpReal: 4, wage: 45, tr: { honest: true, temper: 0.5 } });
await ev(`(() => { const S = TLX.state("staff"); const a = S.apps.find(q => q.id === ${P.id}); a.pat = 2; })(); true`);
await ev(`TLX.staff.ask(${P.id}, "xp"); true`); await waitReply(P.id);
await ev(`TLX.staff.ask(${P.id}, "why"); true`); await waitReply(P.id);
a = await app(P.id);
ok(a.mute && /that's everything|heard enough/.test(a.chat[a.chat.length - 1].t) && !(await ev(`TLX.staff.ask(${P.id}, "stove")`)), "F: patience used up: they've said all they'll say");

// ---- G reload + a 5.1-style applicant + a null entry
await ev(`TLX.state("staff").apps.push({ id: 9001, name: "Old Save", village: "Mehamn", role: "caretaker", place: "re:viddastua", wage: 50, xp: 5, xpReal: 5, tr: { work: 1, temper: 0.2, honest: true }, at: GS.hour, exp: GS.hour + 60 }); save(); true`);
const before = await st();
await reload();
s = await st();
const pb = s.apps.find(q => q.id === P.id);
ok(pb && pb.chat.length === a.chat.length && pb.mute && s.crew.find(q => q.id === H.id).chk === true, "G: chat, mute and the checked reference survive a reload");
await ev(`TABLET.toggle(true, "staff"); TLX.staff.interview(9001); TABLET.render(); true`); await sleep(300);
ok(await ev(`TLX.staff.ask(9001, "ref")`), "G: a 5.1-style applicant (no interview fields) can be interviewed");
await waitReply(9001);
a = await app(9001);
ok(a.chk === true && a.chat.length === 2 && a.floor > 0 && a.pat >= 0, "G: ...and answers (" + a.chat.length + " bubbles, floor $" + a.floor + ")");
const sv = await J(`(() => { save(); return JSON.parse(localStorage.getItem("tracklayer.save.v2")); })()`);
sv.x.sys.staff.s.apps.push(null); sv.x.sys.staff.s.crew.push(null);
await reload(sv);
await ev(`GS.hour += 1; true`); await sleep(2500);
const errs = await J(`(() => { try { TLX.staff.tick(); const S = TLX.state("staff"); return { ok: true, n: S.apps.length, nul: S.apps.concat(S.crew).some(q => !q) }; } catch (e) { return { ok: false, e: String(e) }; } })()`);
ok(errs.ok && !errs.nul, "G: a save with a null applicant and crew entry loads, the board ticks (" + JSON.stringify(errs) + ")");
await done(fails ? 1 : 0);
