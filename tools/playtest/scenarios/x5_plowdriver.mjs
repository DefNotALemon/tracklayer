// Expansion slice 5.4a1: a plow driver with their own truck on a contract road (tlx-plow.js v20, tlx-staff.js v6).
// Since 5.4a2 half the applicants have no truck (x5_plowdriver_mine.mjs): SETUP turns that off (PDR.mine = 0) here.
// Asserts, exit 1 on a failure.
//   A no contract: no driver's job, the Staff app stays off the tablet. A road signed: the Staff app is there (no Real
//     Estate needed), one applicant at once for the road, a plow driver with their own truck; the Plow app's card says
//     nobody drives the road yet.
//   B the interview is a driver's: the greeting, the WHITEOUT question in place of the stove, an honest reference
//     checks out, a padded application is caught out and the ask drops to a driver's fair wage.
//   C hired with Enter on the focused card: on the books for that road, both apps say so.
//   D snow on two stretches: the driver waits to get going, sets out (a notification), is out on the road (both apps say
//     where), opens both (the snow gone, 60% of the kommune's pay to you at once, no warning), comes back in (a
//     notification with the stretches and your share).
//   E a storm: at home they do not set out; out on the road they sit it out where they are.
//   F a slow driver is still your warning: a stretch 8 h shut before they have even set out.
//   G wages owed: they do not go out, and the cards say why.
//   H slept through: a working driver has opened what they could reach in time (paid, no warning, a notification); a
//     stretch they would have been late for is a warning as before.
//   I Monday's statement counts the driver's stretches.
//   J a word in person is at the garage while they are in.
//   K a reload keeps the driver, where they were on the road and the work goes on; junk in the saved state is tidied.
//   L the road handed back: the driver is let go, paid to the hour, and the Staff app goes again.
// Time: the clocks are stepped in small steps with the roads' own clock held (no fill, no council plow), as x4_plowapp.
// Stills (OUT): the applicant, the interview, the Plow app with the driver out, the driver's card.
import { boot, ev, sleep, done, reload, shot, tap } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const NOSTILLS = !!process.env.NOSTILLS;
const still = async name => { if (!NOSTILLS) await shot(name); };
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80); return true; })()`);
const notes = () => J(`TABLET.log.map(n => n.title + " | " + n.body)`);
const clearNotes = () => ev(`TABLET.log.length = 0; true`);
const tabText = () => ev(`$("tabS").textContent.replace(/\\s+/g, " ")`);
const app = async id => { await ev(`TABLET.toggle(true, ${JSON.stringify(id)}); TABLET.render(); true`); await sleep(450); return tabText(); };

const SETUP = `TLXPL.PDR.mine = 0; tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
const KIT = `(() => {
  window.__rt = id => TLXR.routes.find(r => r.id === id);
  // the contract's clock (and the driver) moved on h hours in steps of st, the roads left out of it
  window.__q = (h, st) => { st = st || 0.5; for (let t = 0; t < h - 1e-6; t += st) { GS.hour += Math.min(st, h - t); TLX.state("roads").h = GS.hour; TLXPL.con.step(); } return true; };
  window.__con = id => { const c = TLX.state("plow").con[id]; return c ? JSON.parse(JSON.stringify(c)) : null; };
  window.__pdr = id => { const q = TLX.state("plow").pdr[id]; return q ? JSON.parse(JSON.stringify(q)) : null; };
  window.__drv = (id, work, xp, hap) => { const m = TLX.staff.at("plow:" + id); m.tr.work = work; m.tr.temper = 0; m.xpReal = xp; m.hap = hap; m.mood = 0; m.wage = TLX.staff.fair(m); return TLXPL.pdr.skill(m, id); };
  return true; })()`;
const SEG = 400;

await boot();
await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 60000; true`);
let RID = "dyfjord", I = 0, DID = 0;

await section("A the job comes with the road", async () => {
  let a = await J(`({ hid: TABLET.byId.staff.hidden(), vac: TLX.staff.vacancies().map(v => v.id), role: !!TLX.staff.ROLES.plowdriver, routes: TLXPL.con.routes().map(r => ({ id: r.id, len: Math.round(r.len) })) })`);
  console.log("  ", JSON.stringify(a.routes));
  ok(a.role && a.hid === true && a.vac.length === 0, "no contract: no driver's job, the Staff app is not on the tablet");
  if (!a.routes.some(r => r.id === RID)) RID = a.routes[0].id;
  await ev(`GS.lic = GS.lic || {}; GS.lic.freight = true; TLXV.buy("plowtruck"); true`); await sleep(500);
  const uid = await ev(`TLXV.state().owned.find(r => r.id === "plowtruck").uid`);
  await ev(`TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(500);
  I = await ev(`(() => { const r = __rt(${JSON.stringify(RID)}); let b = -1; for (let i = 2; i < r.seg.length - 1; i++) if (r.seg[i].legs.length && r.seg[i - 1].legs.length && r.seg[i + 1].legs.length && (i + 1) * 400 + 40 <= r.len) { b = i; if (i >= Math.floor(r.seg.length / 2)) break; } return b; })()`);
  ok(I >= 2, "two whole stretches to work with: " + (I - 1) + " and " + I);
  await ev(`TLXPL.con.sign(${JSON.stringify(RID)}); TLX.staff.tick(); true`); await sleep(300);
  a = await J(`({ hid: TABLET.byId.staff.hidden(), vac: TLX.staff.vacancies().map(v => ({ id: v.id, role: v.role, name: v.name })), apps: TLX.state("staff").apps })`);
  const A0 = a.apps[0];
  ok(a.hid === false && a.vac.length === 1 && a.vac[0].id === "plow:" + RID && a.vac[0].role === "plowdriver", "the road signed: the Staff app is on the tablet with the road's job open: " + JSON.stringify(a.vac));
  ok(a.apps.length === 1 && A0.role === "plowdriver" && A0.place === "plow:" + RID && A0.kit === "own" && A0.wage >= 140 && A0.wage <= 340, "one applicant at once, a plow driver with their own truck: " + JSON.stringify({ name: A0.name, wage: A0.wage, xp: A0.xp, kit: A0.kit }));
  const txt = await app("staff");
  ok(txt.includes(A0.name) && /PLOW DRIVER/.test(txt) && /own truck and blade · keeps 40% of what they open/.test(txt) && txt.includes(a.vac[0].name), "the board shows them, the road and what they bring");
  ok(!/caretaker|nights let|cabin/i.test(txt.replace(/Buy a depot cabin[^.]*\./, "")), "and nothing on it talks about cabins");
  await still("d1_applicant");
  const pt = await app("plow");
  ok(/Nobody drives it for you: the Staff app has the job posted/.test(pt) && /A plow driver hired in the Staff app/.test(pt), "the Plow app's card says nobody drives the road yet, and its note explains drivers");
  const samp = await J(`(() => { const out = []; for (let i = 0; i < 400; i++) out.push(TLX.staff.post({ id: "plow:" + ${JSON.stringify(RID)}, role: "plowdriver" })); const S = TLX.state("staff"); S.apps = S.apps.filter(q => !out.includes(q)); return { wmin: Math.min(...out.map(q => q.wage)), wmax: Math.max(...out.map(q => q.wage)), own: out.every(q => q.kit === "own") }; })()`);
  ok(samp.own && samp.wmin >= 140 && samp.wmax <= 340, `400 applicants: wages $${samp.wmin}-${samp.wmax} a week, every one with a truck`);
});
const rid = JSON.stringify(RID);
const mul = () => ev("payMul()");
const cashNow = () => ev("GS.cash");
const snow = (i, v) => ev(`TLXR.setSnow(${rid}, ${v}, ${i}); TLXPL.con.step(); true`);

await section("B the interview is a driver's", async () => {
  const id = await ev(`(() => { const a = TLX.state("staff").apps[0]; a.tr.honest = true; a.xp = a.xpReal = 8; a.tr.temper = 0.1; a.exp = GS.hour + 200; TLX.staff.interview(a.id); return a.id; })()`);
  await ev(`TABLET.toggle(true, "staff"); TABLET.render(); true`); await sleep(450);
  let txt = await tabText();
  ok(/I hear you want a driver for the .*\. I have my own truck and blade\./.test(txt) && /A WHITEOUT\?/.test(txt) && !/COLD-SNAP STOVE/.test(txt) && /INTERVIEW · PLOW DRIVER/.test(txt), "the greeting and the questions are a driver's");
  await ev(`TLX.staff.ask(${id}, "stove"); true`); await sleep(2100);
  await ev(`TLX.staff.ask(${id}, "ref"); true`); await sleep(2100);
  const a = await J(`TLX.state("staff").apps.find(q => q.id === ${id})`);
  const said = a.chat.map(m => m.t).join(" | ");
  ok(/A whiteout on the open stretch/.test(said) && /poles one at a time/.test(said), "the whiteout question, and an experienced driver's answer");
  ok(a.chk === true && /never a mailbox down/.test(said) && !a.caught, "an honest reference checks out");
  await still("d2_interview");
  // padded applications: asked for a reference, most slip (0.85 each); the ask drops to a driver's fair wage
  const ids = await J(`(() => { const out = []; for (let i = 0; i < 4; i++) { const q = TLX.staff.post({ id: "plow:" + ${rid}, role: "plowdriver" }); q.tr.honest = false; q.xp = 12; q.xpReal = 1; q.wage = 246; q.exp = GS.hour + 200; out.push(q.id); } return out; })()`);
  for (const k of ids) await ev(`TLX.staff.ask(${k}, "ref"); true`);
  await sleep(2300);
  const liars = await J(`TLX.state("staff").apps.filter(q => ${JSON.stringify(ids)}.includes(q.id)).map(q => ({ caught: !!q.caught, wage: q.wage, chk: !!q.chk, t: q.chat.map(m => m.t).join(" | ") }))`);
  const got = liars.filter(q => q.caught);
  ok(got.length >= 1 && got.every(q => /on the boats now/.test(q.t) && q.wage === 160 && !q.chk), `padded applications asked for a reference: ${got.length} of 4 caught out, the ask down to $160`);
  ok(liars.filter(q => !q.caught).every(q => /came back in one piece, mostly/.test(q.t) && !q.chk && q.wage === 246), "the ones who did not slip give a lukewarm reference and keep their ask");
  await ev(`(() => { const S = TLX.state("staff"); S.apps = S.apps.filter(q => !${JSON.stringify(ids)}.includes(q.id)); TLX.staff.interview(null); return true; })()`);
  DID = id;
});

await section("C hired", async () => {
  await clearToasts();
  await ev(`TABLET.toggle(true, "staff"); TABLET.render(); TABLET.focus = "sta:${DID}"; TABLET.paintFocus(); true`); await sleep(350);
  await tap("Enter"); await sleep(500);
  const a = await J(`({ m: TLX.staff.at("plow:" + ${rid}), apps: TLX.state("staff").apps.length, vac: TLX.staff.vacancies().length })`), t = await toasts();
  ok(a.m && a.m.id === DID && a.m.role === "plowdriver" && a.m.kit === "own" && a.vac === 0, "Enter on the focused card hires them for the road");
  ok(t.some(m => /starts as plow driver on the .* road\. \$\d+ a week, paid Mondays/.test(m)), "and the line reads right: " + JSON.stringify(t.filter(m => /starts as/.test(m))));
  const k = await ev(`__drv(${rid}, 1, 10, 70)`);
  ok(Math.abs(k - 1) < 0.02, "a good driver (10 real years, works hard, happy): skill " + k.toFixed(2));
  const st = await app("staff");
  ok(/Plows the .* in their own truck and keeps 40% of what the kommune pays for the stretches they open: in: nothing on it to plow/.test(st) && /at the garage/.test(st), "the Staff card says what they do, where they are, and where to find them");
  const pt = await app("plow");
  ok(/DRIVER/.test(pt) && new RegExp(a.m.name + " drives it for you: in: nothing on it to plow").test(pt), "the Plow app's card names the driver");
  await ev(`TABLET.toggle(false); true`);
});

await section("D snow: out, opened, paid, back", async () => {
  await clearNotes(); await clearToasts();
  await snow(I - 1, 0.5); await snow(I, 0.6);
  const c0 = await cashNow(), m = await mul();
  await ev(`__q(0.5, 0.25)`);
  let a = await J(`({ q: __pdr(${rid}), where: TLXPL.pdr.where(${rid}) })`);
  ok(a.q && a.q.st === "home" && a.q.w > 0.4 && /getting the truck out/.test(a.where) && (await cashNow()) === c0, "half an hour on: still getting the truck out (" + JSON.stringify(a) + ")");
  await ev(`__q(0.4, 0.2)`);
  a = await J(`({ q: __pdr(${rid}), n: TABLET.log.map(n => n.title + " | " + n.body) })`);
  ok(a.q.st === "out" && a.n.some(x => / has set out \| On the .*: 2 stretches under snow\./.test(x)), "then they set out, with a notification: " + JSON.stringify(a.n));
  await ev(`__q(0.05, 0.05)`);
  a = await J(`({ q: __pdr(${rid}), where: TLXPL.pdr.where(${rid}), sn: [__rt(${rid}).st.s[${I - 1}], __rt(${rid}).st.s[${I}]] })`);
  ok(a.q.st === "out" && a.q.p > 300 && a.q.p <= 601 && a.sn[1] > 0.4 && /^out on it, \d+\.\d km along, 2 stretches to go$/.test(a.where), "out on the road, the snow not yet opened: " + JSON.stringify(a));
  const pt = await app("plow"); await still("d3_plow_driver_out");
  const stt = await app("staff"); await still("d4_staff_driver_out");
  ok(/drives it for you: out on it/.test(pt) && /out on it, \d+\.\d km along/.test(stt) && /is out on the .*\. Have a word at the garage once they are back in/.test(stt), "both apps say they are out, and that a word will have to wait");
  await ev(`TABLET.toggle(false); true`);
  await ev(`__q(${(((I - 1) * SEG) / 12000 + 0.24).toFixed(3)}, 0.04)`);
  a = await J(`({ q: __pdr(${rid}), sn: [__rt(${rid}).st.s[${I - 1}], __rt(${rid}).st.s[${I}]], c: __con(${rid}), st: TLXR.status(${rid}) })`);
  const c1 = await cashNow(), want = 2 * Math.round(SEG * 0.25 * m * 0.6), t = await toasts();
  console.log("  ", JSON.stringify(a), "cash +" + (c1 - c0), "want", want);
  ok(a.sn[0] === 0 && a.sn[1] === 0 && a.st === "open", "both stretches are open");
  ok(c1 - c0 === want && a.c.wk === want && a.c.wkM === 2 * SEG, `60% of the kommune's pay is yours at once: +$${c1 - c0} (x${m} by the season)`);
  ok(a.c.strikes === 0 && Object.keys(a.c.due).length === 0 && !t.some(x => /Warning/.test(x)), "no warning, nothing left due");
  ok(!t.some(x => /You've plowed|your blade cleared|You've opened/.test(x)), "and no line claims your own blade did it");
  await ev(`__q(${((I + 1) * SEG / 12000 + 0.1).toFixed(3)}, 0.05)`);
  a = await J(`({ q: __pdr(${rid}), n: TABLET.log.map(n => n.title + " | " + n.body), where: TLXPL.pdr.where(${rid}) })`);
  ok(a.q.st === "home" && a.q.p === 0 && a.q.wkN === 2 && a.n.some(x => new RegExp(" is back in \\| 2 stretches of the .* opened · \\$" + want + " to you after their 40%").test(x)), "back in, with a notification that counts it up: " + JSON.stringify(a.n[0]));
  ok(/^in: nothing on it to plow$/.test(a.where), "and the cards read in again");
});

await section("E a storm", async () => {
  await snow(I, 0.5);
  const c0 = await cashNow();
  await ev(`WX.at = () => 0.9; __q(2, 0.5); true`);
  let a = await J(`({ q: __pdr(${rid}), where: TLXPL.pdr.where(${rid}) })`);
  ok(a.q.st === "home" && /in, waiting for the weather to ease/.test(a.where), "a storm at the road's end: they do not set out (" + a.where + ")");
  await ev(`WX.at = () => 0; __q(0.9, 0.3); __q(0.1, 0.05); true`);
  const p0 = (await J(`__pdr(${rid})`)).p;
  await ev(`WX.at = () => 0.9; __q(1.5, 0.25); true`);
  a = await J(`({ q: __pdr(${rid}), where: TLXPL.pdr.where(${rid}), sn: __rt(${rid}).st.s[${I}] })`);
  ok(a.q.st === "out" && p0 > 0 && Math.abs(a.q.p - p0) < 1 && a.sn > 0.4 && /^sitting out the weather \d+\.\d km along$/.test(a.where), `out on the road when it closes in: they sit it out where they are (${Math.round(p0)} m -> ${Math.round(a.q.p)} m)`);
  await ev(`WX.at = () => 0; __q(${((I * SEG) / 12000 + 0.15).toFixed(3)}, 0.04); true`);
  a = await J(`({ sn: __rt(${rid}).st.s[${I}], c: __con(${rid}) })`);
  ok(a.sn === 0 && (await cashNow()) > c0 && a.c.strikes === 0, "the weather eases and they finish the job");
  await ev(`__q(1, 0.1)`);
});

await section("F a slow driver is still your warning", async () => {
  await clearToasts();
  const k = await ev(`__drv(${rid}, 0.6, 0, 0)`);
  ok(k > 0.15 && k < 0.3, "a poor driver (no real experience, idle, miserable): skill " + k.toFixed(2));
  await snow(I, 0.5);
  await ev(`TLX.state("plow").con[${rid}].due[${I}][0] = 6; true`);
  const c0 = await cashNow();
  await ev(`__q(2.2, 0.55)`); await sleep(300);
  const a = await J(`({ c: __con(${rid}), q: __pdr(${rid}) })`), t = await toasts();
  ok(a.c && a.c.strikes === 1 && a.c.cover === true && t.some(m => /has lain shut 8 h: the kommune's own truck is going out\. Warning 1 of 3/.test(m)), "8 h shut before they have got going: warning 1 of 3, the kommune's truck goes out");
  ok(a.q.st === "home" && (await cashNow()) === c0, "and nothing was earned");
  await ev(`(() => { TLXR.setSnow(${rid}, 0); const c = TLX.state("plow").con[${rid}]; c.strikes = 0; c.cover = false; c.due = {}; c.clean = true; TLXPL.con.step(); return true; })()`);
});

await section("G wages owed", async () => {
  await ev(`__drv(${rid}, 1, 10, 70); TLX.state("staff").owed = 50; true`);
  await snow(I, 0.5);
  await ev(`__q(2, 0.5)`);
  const a = await J(`({ q: __pdr(${rid}), where: TLXPL.pdr.where(${rid}), sn: __rt(${rid}).st.s[${I}] })`);
  ok(a.q.st === "home" && a.sn > 0.4 && a.where === "not going out while wages are owed", "owed wages: the driver stays in (" + a.where + ")");
  const st = await app("staff");
  ok(/not going out while wages are owed/.test(st) && /Wages owed/.test(st), "and the Staff app says so beside PAY IT");
  await ev(`TABLET.toggle(false); TLX.state("staff").owed = 0; TLXR.setSnow(${rid}, 0); TLX.state("plow").con[${rid}].due = {}; TLXPL.con.step(); true`);
});

await section("H slept through", async () => {
  await clearToasts(); await clearNotes();
  await ev(`__drv(${rid}, 1, 10, 70)`);
  await snow(I, 0.5); await snow(I - 1, 0.6);
  const d = (await J(`__con(${rid})`)).due; ok(d[I] && d[I - 1] && d[I][1] === 1 && d[I - 1][1] === 1, "two stretches shut and due");
  const c0 = await cashNow(), m = await mul();
  await ev(`GS.hour += 9; true`); await sleep(500); await ev(`TLXPL.con.step(); true`); await sleep(300); await ev(`TLXPL.con.step(); true`);
  let a = await J(`({ s: [__rt(${rid}).st.s[${I}], __rt(${rid}).st.s[${I - 1}]], c: __con(${rid}), q: __pdr(${rid}), n: TABLET.log.map(n => n.title + " | " + n.body) })`), t = await toasts();
  const want = 2 * Math.round(SEG * 0.25 * m * 0.6), c1 = await cashNow();
  console.log("  cash +" + (c1 - c0), "want", want, JSON.stringify(a.n));
  ok(a.s[0] === 0 && a.s[1] === 0 && a.c.strikes === 0 && !t.some(x => /Warning/.test(x)), "a 9 h sleep with a driver on the road: open when you wake, and no warning");
  ok(c1 - c0 === want && a.n.some(x => new RegExp(" plowed while you were away \\| 2 stretches of the .* opened · \\$" + want + " to you after their 40%").test(x)), `your share is paid (+$${c1 - c0}) and a notification says who did it`);
  ok(a.q.st === "home" && a.q.p === 0, "and they are in again");
  // a stretch they would have been too late for
  await clearToasts();
  await snow(I, 0.5);
  await ev(`TLX.state("plow").con[${rid}].due[${I}] = [7.6, 1]; true`);
  const c2 = await cashNow();
  await ev(`GS.hour += 9; true`); await sleep(500); await ev(`TLXPL.con.step(); true`); await sleep(300); await ev(`TLXPL.con.step(); true`);
  a = await J(`({ c: __con(${rid}), s: __rt(${rid}).st.s[${I}] })`); t = await toasts();
  ok(a.s === 0 && a.c.strikes === 1 && (await cashNow()) === c2 && t.some(x => /lay shut while you were away.*Warning 1 of 3/.test(x)), "a stretch already 7.6 h shut when you went to bed: too late even for them, a warning as before, unpaid");
  await ev(`(() => { TLXR.setSnow(${rid}, 0); const c = TLX.state("plow").con[${rid}]; c.strikes = 0; c.cover = false; c.due = {}; c.clean = true; TLXPL.con.step(); return true; })()`);
});

await section("I Monday's statement", async () => {
  const n = (await J(`__pdr(${rid})`)).wkN;
  await ev(`TLXPL.con.monday({ label: "Mon 4 Jan" }); true`);
  const a = await J(`({ last: TLX.state("plow").conLast[0], q: __pdr(${rid}) })`);
  ok(n >= 4 && a.last.dn === n && a.q.wkN === 0 && a.q.wkCash === 0, "the statement counts the driver's stretches (" + n + ") and the week starts again");
  const pt = await app("plow");
  ok(new RegExp("Mon 4 Jan.*" + n + " by your driver").test(pt), "and the app's statement line says so");
  await ev(`TABLET.toggle(false); true`);
});

await section("J a word in person, at the garage", async () => {
  await clearToasts();
  const id = (await J(`TLX.staff.at("plow:" + ${rid})`)).id;
  await ev(`P.x = garageSite.x + 400; P.z = garageSite.z + 300; true`);
  const far = await ev(`TLX.staff.praise(${id})`), t0 = await toasts();
  ok(far === false && t0.some(m => /is at the garage between runs: go there to have a word in person/.test(m)), "away from the garage: no praise, and it says where they are");
  await ev(`P.x = garageSite.x + 6; P.z = garageSite.z + 6; true`);
  const st = await app("staff");
  ok(/You're at the garage: you can have a word/.test(st), "at the garage the card says you can have a word");
  const near = await ev(`TLX.staff.praise(${id})`), m = await J(`TLX.staff.at("plow:" + ${rid})`);
  ok(near === true && m.mood > 5, "and PRAISE lands (mood " + m.mood + ")");
  await ev(`TABLET.toggle(false); true`);
});

await section("K reload; junk", async () => {
  await ev(`__drv(${rid}, 1, 10, 70)`);
  await snow(I - 1, 0.5); await snow(I, 0.5);
  await ev(`__q(0.8, 0.4); __q(0.05, 0.05); save(); true`);
  const b = await J(`({ q: __pdr(${rid}), m: TLX.staff.at("plow:" + ${rid}) })`);
  ok(b.q.st === "out" && b.q.p > 0, "saved with the driver out on the road at " + Math.round(b.q.p) + " m");
  await reload(); await ev(SETUP); await sleep(500); await ev(KIT);
  const a = await J(`({ q: __pdr(${rid}), m: TLX.staff.at("plow:" + ${rid}), role: !!TLX.staff.ROLES.plowdriver, hid: TABLET.byId.staff.hidden(), sn: __rt(${rid}).st.s[${I}] })`);
  console.log("   before", JSON.stringify(b.q), "after", JSON.stringify(a.q));
  ok(a.m && a.m.id === b.m.id && a.m.role === "plowdriver" && a.m.kit === "own" && a.m.place === "plow:" + RID && a.hid === false, "a reload keeps the driver on the books for the road");
  ok(a.q && a.q.st === "out" && a.q.p >= b.q.p - 1 && a.q.p < b.q.p + 400 && a.sn > 0.4, "and where they were on it");
  const c0 = await cashNow();
  await ev(`__q(${(((I + 1) * SEG) / 12000 + 0.3).toFixed(3)}, 0.04)`);
  const e = await J(`({ sn: [__rt(${rid}).st.s[${I - 1}], __rt(${rid}).st.s[${I}]], c: __con(${rid}) })`);
  ok(e.sn[0] === 0 && e.sn[1] === 0 && (await cashNow()) > c0 && e.c.strikes === 0, "the work goes on after the reload: both stretches opened and paid");
  const r = await ev(`(() => { try { const s = TLX.state("plow"); const keep = s.pdr[${rid}]; s.pdr = { ${RID}: "x", nowhere: { st: "out", p: NaN }, 7: null }; TLXPL.tidy(); const k1 = Object.keys(s.pdr).length; delete s.pdr; TLXPL.con.step(); TABLET.toggle(true, "plow"); TABLET.toggle(true, "staff"); const k2 = typeof s.pdr; s.pdr[${rid}] = { st: "sideways", p: -5, w: "q" }; TLXPL.tidy(); TLXPL.con.step();
    return JSON.stringify({ k1, k2, q: s.pdr[${rid}], where: TLXPL.pdr.where(${rid}) }); } catch (e) { return "THREW " + e.message; } })()`);
  console.log("  ", r);
  const q = /^THREW/.test(r) ? null : JSON.parse(r);
  ok(q && q.k1 === 0 && q.k2 === "object" && q.q && q.q.st === "home" && q.q.p === 0 && q.q.w === 0 && typeof q.where === "string", "junk in the saved driver state: tidied, nothing thrown");
  await ev(`TABLET.toggle(false); __q(1.5, 0.1); true`);
});

await section("L the road handed back", async () => {
  await clearNotes();
  const m = await J(`TLX.staff.at("plow:" + ${rid})`);
  await ev(`(() => { const q = TLX.staff.at("plow:" + ${rid}); q.paidTo = GS.hour - 84; return true; })()`);
  const due = await ev(`TLX.staff.wageDue(TLX.staff.at("plow:" + ${rid}), GS.hour)`), c0 = await cashNow();
  await ev(`TLXPL.con.quit(${rid}); TLX.staff.tick(); TLXPL.tidy(); true`); await sleep(300);
  const a = await J(`({ m: TLX.staff.at("plow:" + ${rid}), crew: TLX.state("staff").crew.length, vac: TLX.staff.vacancies().length, pdr: Object.keys(TLX.state("plow").pdr).length, n: TABLET.log.map(n => n.title + " | " + n.body), hid: TABLET.byId.staff.hidden() })`), c1 = await cashNow();
  console.log("  ", JSON.stringify(a.n), "wage due", due, "cash", c1 - c0);
  ok(a.m === null && a.crew === 0 && a.vac === 0 && a.pdr === 0, "the road handed back: no driver, no job, no state left");
  ok(Math.abs((c0 - c1) - due) < 0.02 && due > 50 && a.n.some(x => new RegExp(m.name + " has been let go \\| The road they plowed for you is no longer yours\\. Paid \\$\\d+ for the days worked\\.").test(x)), `they are paid to the hour ($${Math.round(due)} for half a week) and a notification says why they went`);
  ok(a.hid === true, "with nobody on the books and no road, the Staff app is off the tablet again");
});

console.log(fails ? `x5_plowdriver: ${fails} FAILED` : "x5_plowdriver: all ok");
await done(fails ? 1 : 0);
