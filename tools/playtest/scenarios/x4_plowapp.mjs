// Expansion slice 4.2a: the Plow app and the kommune's road contracts (tlx-plow.js v11, tlx-roads.js v14).
// Asserts, exit 1 on a failure.
//   A fresh game: no contract, the app hidden, the roads out to tender are the open roads no convoy runs on; SIGN
//     without a blade is refused and says why.
//   B a plow truck: the app is on the tablet and lists those roads; SIGN pressed in the app signs the road.
//   C the council's plow stays home on your road and goes out on another; a stretch comes due: the line, the Jobs
//     row with its target on the stretch, the app's badge; the clock does not run in a storm.
//   D opened by the plow truck inside 3 h: full pay (x payMul), cash and the week's total move, the line names the pay.
//   E opened after 6 h on the clock: about 70%, the line says so; the "shut 4 h" line was said on the way.
//   F a stretch under the due level pays nothing; a road not under contract pays nothing.
//   G late (8 h shut): warning 1, the council's own truck opens it, no pay, no second warning for the same snow.
//   H a sleep through two shut stretches: ONE warning.
//   I the third warning: the road is taken back, not tendered for a week, the council plows it again.
//   J Monday: a statement; a clean week strikes a warning off, a week with a warning does not.
//   K a reload keeps the contract, the clock and the warnings; junk in the saved state does not throw.
//   L HAND BACK pressed in the app on the touch layout: the council has it again.
// The truck is carried along the road by a puppet (x4_bladeroad's): what is tested is the contract, not the driving.
// Time: the clocks are stepped 1.5 game hours at a time (a jump over 2 h is a sleep to the roads and to the contract).
// Stills (OUT): the app with a contract and snow on it, the Jobs app's row.
import { boot, ev, sleep, done, reload, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const NOSTILLS = !!process.env.NOSTILLS;
const still = async name => { if (!NOSTILLS) await shot(name); };
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80); return true; })()`);

const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
const KIT = `(() => {
  window.__rt = id => TLXR.routes.find(r => r.id === id);
  window.__lane = (id, s, dir, off) => { const r = __rt(id), c = r.cum, p = r.pts; s = Math.max(0, Math.min(r.len - 0.01, s)); let i = 1; while (i < c.length - 1 && c[i] < s) i++;
    const a = p[i - 1], b = p[i], L = c[i] - c[i - 1] || 1, t = (s - c[i - 1]) / L, tx = (b[0] - a[0]) / L * dir, tz = (b[1] - a[1]) / L * dir;
    return { x: a[0] + (b[0] - a[0]) * t - tz * off, z: a[1] + (b[1] - a[1]) * t + tx * off, yaw: Math.atan2(tx, tz) }; };
  window.__put = (id, s, dir, off) => { const q = __lane(id, s, dir, off); BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; crashCancel(); FOOT.on = false; P.x = q.x; P.z = q.z; P.yaw = q.yaw; P.vx = P.vy = P.vz = 0; P.y = surf(q.x, q.z); recenter(q.x, q.z, true); camState.init = false; const B = TLXPL.rt(TLXV.state().cur); B.last = null; B.carry = 0; B.full = false; return true; };
  window.__foot = () => { const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw); for (let k = -5; k <= 7; k += 0.15) bladeSnow(P.x + fx * k + fz * 2.6, P.z + fz * k - fx * 2.6, P.x + fx * k - fz * 2.6, P.z + fz * k + fx * 2.6, 0.15); P.y = surf(P.x, P.z); return true; };
  window.__pup = (id, sA, sB, off) => { const dir = sB >= sA ? 1 : -1; let s = sA; window.__pupOn = true; __put(id, sA, dir, off); __foot();
    const step = () => { s += dir * 2; if ((s - sB) * dir >= 0) { P.vx = P.vz = 0; window.__pupOn = false; return; } const q = __lane(id, s, dir, off); P.x = q.x; P.z = q.z; P.yaw = q.yaw; P.y = surf(q.x, q.z); P.vx = Math.sin(q.yaw) * 6; P.vz = Math.cos(q.yaw) * 6; P.vy = 0; BOG.on = false; BOG.acc = 0; requestAnimationFrame(step); };
    requestAnimationFrame(step); return true; };
  // the contract's clock moved on h hours with the roads left out of it (no fill, no council plow): 1.5 h at a time
  window.__quiet = h => { for (let t = 0; t < h - 1e-6; t += 1.5) { GS.hour += Math.min(1.5, h - t); TLX.state("roads").h = GS.hour; TLXPL.con.step(); } return true; };
  window.__con = id => { const c = TLX.state("plow").con[id]; return c ? JSON.parse(JSON.stringify(c)) : null; };
  return true; })()`;
const SEG = 400;
const pup = async (id, sA, sB, off = 0) => { await ev(`__pup(${JSON.stringify(id)}, ${sA}, ${sB}, ${off})`); for (let k = 0; k < 500 && (await ev("window.__pupOn")); k++) await sleep(100); await sleep(200); };
const blade = dn => ev(`TLXPL.rt(TLXV.state().cur).down = ${dn}; TLXPL.rt(TLXV.state().cur).last = null; true`);
// the roads' own clock runs on h hours (the council's plow works), 1.5 h at a time, a few frames between
const natural = async h => { for (let t = 0; t < h - 1e-6; t += 1.5) { await ev(`GS.hour += ${Math.min(1.5, h - t)}; true`); await sleep(260); await ev(`TLXPL.con.step(); true`); } };
const plowIt = async (id, i) => { await blade(true); await pup(id, i * SEG + 2, (i + 1) * SEG - 2, 0); await blade(false); };

await boot();
await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; true`);
let RID = null, OTHER = null, I = 0, uid = null;

await section("A fresh game", async () => {
  const a = await J(`({ con: TLX.state("plow").con, ban: TLX.state("plow").conBan, hidden: TABLET.byId.plow.hidden(), routes: TLXPL.con.routes().map(r => ({ id: r.id, name: r.name, len: Math.round(r.len), n: r.seg.filter(g => g.legs.length).length })),
    want: TLXR.ROADS.routes.filter(d => !d.convoy && !d.closed).map(d => d.id), jobs: jobsList().filter(r => r.kind === "plowcon").length })`);
  console.log("  ", JSON.stringify(a.routes));
  ok(a.con && Object.keys(a.con).length === 0 && a.hidden === true && a.jobs === 0, "fresh game: no contract, the Plow app is not on the tablet, no Jobs row");
  ok(a.routes.length >= 2 && a.routes.map(r => r.id).sort().join() === a.want.slice().sort().join(), "out to tender: the open roads no convoy runs on (" + a.routes.map(r => r.id).join(", ") + ")");
  const pick = a.routes.find(r => r.id === "dyfjord") || a.routes[0]; RID = pick.id; OTHER = a.routes.find(r => r.id !== RID).id;
  I = await ev(`(() => { const r = __rt(${JSON.stringify(RID)}); let b = -1; for (let i = 1; i < r.seg.length - 1; i++) if (r.seg[i].legs.length && r.seg[i - 1].legs.length && r.seg[i + 1].legs.length && (i + 1) * 400 + 40 <= r.len) { b = i; if (i >= Math.floor(r.seg.length / 2)) break; } return b; })()`);
  ok(I >= 1, `a whole stretch of the ${pick.name} to work on: stretch ${I}`);
  await clearToasts();
  const r = await ev(`TLXPL.con.sign(${JSON.stringify(RID)})`), t = await toasts();
  ok(r === false && t.some(m => /Fit a blade to a truck first/.test(m)) && !(await J(`__con(${JSON.stringify(RID)})`)), "SIGN without a blade: refused, and it says to fit one");
});
if (!RID || I < 1) await done(1);
const rid = JSON.stringify(RID), oid = JSON.stringify(OTHER);
const mul = () => ev("payMul()");
const cashNow = () => ev("GS.cash");

await section("B the app, SIGN", async () => {
  await ev(`GS.cash = 40000; GS.lic = GS.lic || {}; GS.lic.freight = true; TLXV.buy("plowtruck"); true`); await sleep(500);
  uid = await ev(`TLXV.state().owned.find(r => r.id === "plowtruck").uid`);
  await ev(`TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(600);
  ok(await ev(`!!TLXPL.bladeOf(${JSON.stringify(uid)}) && !TABLET.byId.plow.hidden()`), "with a plow truck the Plow app is on the tablet");
  await ev(`TABLET.toggle(true, "plow"); true`); await sleep(500);
  const a = await J(`({ app: $("tabS").dataset.app, cards: [...$("tabS").querySelectorAll(".tcard[data-tf^='plc:']")].map(c => c.querySelector(".tct span").textContent), sign: [...$("tabS").querySelectorAll("[data-act^='pls:']")].map(b => b.dataset.act + (b.classList.contains("blocked") ? ":blocked" : "")), text: $("tabS").textContent.replace(/\\s+/g, " ").slice(0, 600) })`);
  console.log("  ", a.text);
  const names = await J(`TLXPL.con.routes().map(r => r.name)`);
  ok(a.app === "plow" && names.every(n => a.cards.includes(n)) && a.cards.length === names.length, "the app lists exactly those roads: " + a.cards.join(", "));
  ok(a.sign.length === names.length && a.sign.every(s => !/blocked/.test(s)) && /OUT TO TENDER/.test(a.text) && /a 400 m stretch/.test(a.text), "each with a live SIGN button and the price of a stretch");
  await clearToasts();
  await ev(`$("tabS").querySelector("[data-act='pls:" + ${rid} + "']").click(); true`); await sleep(400);
  const c = await J(`__con(${rid})`), t = await toasts(), txt = await ev(`$("tabS").textContent.replace(/\\s+/g, " ")`);
  ok(c && c.strikes === 0 && t.some(m => /is yours to plow: \$\d+ for every 400 m stretch/.test(m)), "SIGN pressed in the app: the road is yours (" + JSON.stringify(t) + ")");
  ok(/YOURS/.test(txt) && /HAND BACK/.test(txt) && (await ev(`TLXR.hold(${rid}) === true && TLXR.hold(${oid}) === false`)), "the card reads YOURS with HAND BACK, and the council's plow is held on that road only");
  await ev(`TABLET.toggle(false); true`); await sleep(300);
});

await section("C the council stays home; due; no clock in a storm", async () => {
  await clearToasts();
  await ev(`TLXR.setSnow(${rid}, 0.5, ${I}); TLXR.setSnow(${oid}, 0.5); TLXPL.con.step(); true`);
  await natural(3);
  const a = await J(`({ mine: __rt(${rid}).st.s[${I}], p: __rt(${rid}).st.p, other: Math.max(...__rt(${oid}).st.s), c: __con(${rid}), badge: TABLET.byId.plow.badge(),
    job: (() => { const r = jobsList().find(q => q.kind === "plowcon"); const g = __rt(${rid}).seg[${I}]; return r ? { title: r.title, meta: r.meta, pay: r.pay, d: Math.hypot(r.tgt.x - g.mx, r.tgt.z - g.mz), auto: !!r.auto, hud: r.hud(1200) } : null; })() })`), t = await toasts();
  console.log("  ", JSON.stringify(a));
  ok(Math.abs(a.mine - 0.5) < 0.01 && a.p < 0, "3 h on: your stretch still has its snow and the council's plow has not set out on your road");
  ok(a.other < 0.02, "while the other road, not under contract, has been plowed by the council");
  ok(a.c.due[I] && a.c.due[I][1] === 1 && a.c.due[I][0] > 2.5 && a.c.due[I][0] < 3.6, "the stretch is due, shut, about 3 h on its clock: " + JSON.stringify(a.c.due));
  ok(t.some(m => /Snow on the .*: it is yours to plow/.test(m)), "a line says the snow is yours to plow");
  ok(a.job && /^Plow the /.test(a.job.title) && a.job.d < 1 && a.job.auto === true && /1 stretch, 0\.4 km under snow/.test(a.job.meta) && /^~\$/.test(a.job.pay) && /to open/.test(a.job.hud.sub), "the Jobs app has the road, its target on the due stretch, followed by itself at the wheel of the plow truck: " + JSON.stringify(a.job));
  ok(a.badge === "!", "the app's icon is badged while a stretch of yours is shut");
  ok(!/snowed in/.test(a.job.meta) && !t.some(m => /Heads up/.test(m)), "and nothing warns you that the road to your own plow job is snowed in");
  if (!NOSTILLS) { await ev(`TABLET.toggle(true, "plow"); true`); await sleep(500); await still("p1_app_contract"); await ev(`TABLET.toggle(true, "jobs"); true`); await sleep(500); await still("p2_jobs_row"); await ev(`TABLET.toggle(false); true`); await sleep(300); }
  const h0 = a.c.due[I][0];
  await ev(`WX.at = () => 0.9; __quiet(3); WX.at = () => 0; true`);
  const h1 = (await J(`__con(${rid})`)).due[I][0];
  ok(Math.abs(h1 - h0) < 0.2, `3 h of storm over it: the clock has not run (${h0.toFixed(2)} -> ${h1.toFixed(2)})`);
  await ev(`TLX.state("plow").con[${rid}].due[${I}][0] = 1; true`);
});

await section("D opened inside 3 h: full pay", async () => {
  await clearToasts(); const c0 = await cashNow(), m = await mul();
  await plowIt(RID, I);
  const a = await J(`({ sn: __rt(${rid}).st.s[${I}], st: TLXR.status(${rid}), c: __con(${rid}), paid: TLX.state("plow").conPaid })`), t = await toasts(), c1 = await cashNow();
  console.log("  ", JSON.stringify(a), JSON.stringify(t));
  const want = Math.round(400 * 0.25 * m);
  ok(a.sn === 0 && a.st === "open", "the plow truck opens the stretch in one pass");
  ok(c1 - c0 === want && a.c.wk === want && a.c.wkM === 400 && a.paid === want, `the kommune pays $${want} at once (x${m} by the season): cash +${c1 - c0}, this week $${a.c.wk} for ${a.c.wkM} m`);
  ok(t.some(q => new RegExp("The kommune pays \\$" + want + "\\.").test(q) && !/%/.test(q)), "and the opening line names the pay in full");
  ok(!a.c.due[I] && a.c.strikes === 0, "the stretch is off the list, no warning");
});

await section("E opened after 6 h: about 70%", async () => {
  await clearToasts();
  await ev(`TLXR.setSnow(${rid}, 0.5, ${I}); TLXPL.con.step(); __quiet(6); true`);
  await sleep(300);
  const t0 = await toasts(); ok(t0.some(m => /has been shut 4 h\. The kommune wants it open inside 8/.test(m)), "half way to late a line warns: " + JSON.stringify(t0.filter(m => /shut/.test(m))));
  const c0 = await cashNow(), m = await mul();
  await plowIt(RID, I);
  const t = await toasts(), c1 = await cashNow(), full = 400 * 0.25 * m, got = c1 - c0;
  console.log("  paid", got, "of", full, JSON.stringify(t.filter(q => /kommune pays/.test(q))));
  ok(got >= Math.round(full * 0.62) && got <= Math.round(full * 0.71), `6 h on the clock pays ${got} of ${full} (about 70%)`);
  ok(t.some(q => /The kommune pays \$\d+ \((6\d|70)%: \d h after the weather eased\)/.test(q)), "and the line says what share and why");
});

await section("F nothing for a dusting, nothing off contract", async () => {
  await clearToasts();
  await ev(`TLXR.setSnow(${rid}, 0.08, ${I}); TLXPL.con.step(); true`);
  let c0 = await cashNow(); await plowIt(RID, I);
  let t = await toasts(), c1 = await cashNow();
  ok(c1 === c0 && t.some(m => /You've plowed the /.test(m)) && !t.some(m => /kommune pays/.test(m)), "a stretch under the due level (8%): plowed, said, not paid");
  const oi = await ev(`(() => { const r = __rt(${oid}); for (let i = 1; i < r.seg.length - 1; i++) if (r.seg[i].legs.length && (i + 1) * 400 + 40 <= r.len) return i; return -1; })()`);
  await clearToasts(); await ev(`TLXR.setSnow(${oid}, 0.5, ${oi}); true`);
  c0 = await cashNow(); await plowIt(OTHER, oi);
  t = await toasts(); c1 = await cashNow();
  const sn = await ev(`__rt(${oid}).st.s[${oi}]`);
  ok(sn === 0 && c1 === c0 && !t.some(m => /kommune pays/.test(m)), "a road you hold no contract for: opened by your blade, not paid (" + JSON.stringify(t) + ")");
  await ev(`TLXR.setSnow(${oid}, 0); true`);
});

await section("G late: a warning, the council's truck, no pay", async () => {
  await clearToasts();
  await ev(`TLXR.setSnow(${rid}, 0.5, ${I}); TLXPL.con.step(); __quiet(9); true`); await sleep(300);
  let c = await J(`__con(${rid})`), t = await toasts(); const c0 = await cashNow();
  ok(c.strikes === 1 && c.cover === true && t.some(m => /has lain shut 8 h: the kommune's own truck is going out\. Warning 1 of 3/.test(m)), "8 h shut: warning 1 of 3, said (" + JSON.stringify(t.filter(m => /Warning/.test(m))) + ")");
  ok(await ev(`TLXR.hold(${rid}) === false`), "the hold is let go for the council's own truck");
  await natural(4.5);
  const a = await J(`({ sn: __rt(${rid}).st.s[${I}], p: __rt(${rid}).st.p, c: __con(${rid}) })`);
  console.log("  ", JSON.stringify(a));
  ok(a.sn < 0.02 && a.c.strikes === 1 && (await cashNow()) === c0, "the council's truck opens it: no pay, and no second warning for the same snow");
  ok(a.c.cover === false && !a.c.due[I] && (await ev(`TLXR.hold(${rid}) === true`)), "the road is clean: it is yours again");
});

await section("H slept through two shut stretches: one warning", async () => {
  await clearToasts();
  await ev(`TLXR.setSnow(${rid}, 0.5, ${I}); TLXR.setSnow(${rid}, 0.6, ${I - 1}); TLXPL.con.step(); true`);
  const d = (await J(`__con(${rid})`)).due; ok(d[I] && d[I - 1] && d[I][1] === 1 && d[I - 1][1] === 1, "two stretches shut and due");
  await ev(`GS.hour += 9; true`); await sleep(400); await ev(`TLXPL.con.step(); true`); await sleep(200);
  const a = await J(`({ s: [__rt(${rid}).st.s[${I}], __rt(${rid}).st.s[${I - 1}]], c: __con(${rid}) })`), t = await toasts();
  console.log("  ", JSON.stringify(a), JSON.stringify(t.filter(m => /Warning/.test(m))));
  ok(a.s[0] === 0 && a.s[1] === 0, "a 9 h sleep: the roads are plowed when you wake");
  ok(a.c && a.c.strikes === 2 && t.filter(m => /lay shut while you were away.*Warning 2 of 3/.test(m)).length === 1, "and that is ONE warning (2 of 3), said once");
});

await section("I the third warning takes the road back", async () => {
  await clearToasts(); await sleep(600); await ev(`TLXPL.con.step(); true`);
  await ev(`TLXR.setSnow(${rid}, 0.5, ${I}); TLXPL.con.step(); __quiet(9); true`); await sleep(300);
  const a = await J(`({ c: __con(${rid}), ban: TLX.state("plow").conBan[${rid}] - GS.hour, hold: TLXR.hold(${rid}), jobs: jobsList().filter(r => r.kind === "plowcon").length })`), t = await toasts();
  ok(a.c === null && a.ban > 160 && a.ban <= 168 && a.hold === false && a.jobs === 0 && t.some(m => /Third warning: the kommune has taken the .* back/.test(m)), "third warning: the contract is gone for a week and it says so");
  await clearToasts();
  const r = await ev(`TLXPL.con.sign(${rid})`), t2 = await toasts();
  ok(r === false && t2.some(m => /tenders it again in 7 days/.test(m)), "SIGN again: refused for 7 days (" + JSON.stringify(t2) + ")");
  await ev(`TABLET.toggle(true, "plow"); true`); await sleep(400);
  const txt = await ev(`$("tabS").textContent.replace(/\\s+/g, " ")`);
  ok(/TAKEN BACK/.test(txt) && /Out to tender again in 7 days/.test(txt) && (await ev(`$("tabS").querySelector("[data-act='pls:" + ${rid} + "']").classList.contains("blocked")`)), "the app shows it taken back, its SIGN blocked");
  await ev(`TABLET.toggle(false); true`);
  await natural(3);
  ok((await ev(`__rt(${rid}).st.s[${I}]`)) < 0.02, "and the council plows that road again");
});

await section("J Monday", async () => {
  await ev(`TLX.state("plow").conBan = {}; TLX.state("plow").conWk = []; /* beta fix 0337: what this road earned before it was taken back above is kept for Monday; not this step's subject (x4_conweek.mjs) */ TLXPL.con.sign(${rid}); const c = TLX.state("plow").con[${rid}]; c.strikes = 1; c.clean = true; c.wk = 250; c.wkM = 1000; TLXPL.con.monday({ label: "Mon 4 Jan" }); true`);
  let a = await J(`({ c: __con(${rid}), last: TLX.state("plow").conLast })`);
  ok(a.last.length === 1 && a.last[0].pay === 250 && a.last[0].m === 1000 && a.last[0].lapsed === true && a.last[0].d === "Mon 4 Jan" && a.c.strikes === 0 && a.c.wk === 0, "Monday after a clean week: a statement ($250 for 1.0 km) and the warning is struck off: " + JSON.stringify(a.last[0]));
  await ev(`(() => { const c = TLX.state("plow").con[${rid}]; c.strikes = 1; c.clean = false; TLXPL.con.monday({ label: "Mon 11 Jan" }); return true; })()`);
  a = await J(`({ c: __con(${rid}), last: TLX.state("plow").conLast })`);
  ok(a.c.strikes === 1 && a.c.clean === true && a.last.length === 2 && a.last[0].w === 1 && !a.last[0].lapsed, "Monday after a week with a warning: it stands");
  await ev(`TABLET.toggle(true, "plow"); true`); await sleep(400);
  ok(/Statements/.test(await ev(`$("tabS").textContent`)) && /Mon 4 Jan/.test(await ev(`$("tabS").textContent`)), "the app lists the statements");
  await still("p3_app_statements");
  await ev(`TABLET.toggle(false); true`);
});

await section("K reload; junk", async () => {
  await ev(`TLXR.setSnow(${rid}, 0.5, ${I}); TLXPL.con.step(); __quiet(1.5); save(); true`);
  const b = await J(`__con(${rid})`);
  await reload(); await ev(SETUP); await sleep(500); await ev(KIT);
  const a = await J(`({ c: __con(${rid}), sn: __rt(${rid}).st.s[${I}], hold: TLXR.hold(${rid}), last: TLX.state("plow").conLast.length, hidden: TABLET.byId.plow.hidden() })`);
  console.log("  before", JSON.stringify(b), "after", JSON.stringify(a));
  ok(a.c && a.c.strikes === 1 && a.c.due[I] && Math.abs(a.c.due[I][0] - b.due[I][0]) < 0.3 && a.c.due[I][1] === 1 && Math.abs(a.sn - 0.5) < 0.01 && a.hold === true && a.last === 2 && !a.hidden, "a reload keeps the contract, its warning, the stretch's clock, the snow and the statements");
  const r = await ev(`(() => { try { const s = TLX.state("plow"); s.con = { ${RID}: { strikes: "x", due: { 2: "q", 3: [NaN, 1], 4: [2, 0] }, wk: -4 }, bad: 7, nowhere: { strikes: 1, due: {} } }; s.conBan = { a: "x" }; s.conLast = [3, null, { d: 5 }]; s.conPaid = "n"; s.conH = NaN;
    TLXPL.tidy(); TLXPL.con.step(); TABLET.toggle(true, "plow"); jobsList(); const c = s.con[${rid}];
    return JSON.stringify({ keys: Object.keys(s.con), name: c.name, strikes: c.strikes, due: c.due, wk: c.wk, ban: s.conBan, last: s.conLast.length, paid: s.conPaid }); } catch (e) { return "THREW " + e.message; } })()`);
  console.log("  ", r);
  const q = /^THREW/.test(r) ? null : JSON.parse(r);
  ok(q && q.keys.join() === RID && q.strikes === 0 && q.wk === 0 && Array.isArray(q.due[2]) && q.due[2][0] < 0.2 && !q.due[3] && !q.due[4] && Object.keys(q.ban).length === 0 && q.last === 1 && q.paid === 0 && q.name === "Dyfjord road" || (q && q.keys.join() === RID && RID !== "dyfjord"), "junk in the saved contracts: tidied, a road that does not exist dropped, nothing thrown");
  await ev(`TABLET.toggle(false); true`);
});

await section("L HAND BACK on the touch layout", async () => {
  await ev(`SET.touch = "on"; setTouchUI(); TLXR.setSnow(${rid}, 0.5, ${I}); TLXPL.con.step(); TABLET.toggle(true, "plow"); true`); await sleep(500);
  await clearToasts();
  const has = await ev(`!!$("tabS").querySelector("[data-act='plq:" + ${rid} + "']")`);
  await ev(`$("tabS").querySelector("[data-act='plq:" + ${rid} + "']").dispatchEvent(new MouseEvent("click", { bubbles: true })); true`); await sleep(400);
  const a = await J(`({ c: __con(${rid}), hold: TLXR.hold(${rid}), txt: $("tabS").textContent.replace(/\\s+/g, " ").slice(0, 400), jobs: jobsList().filter(r => r.kind === "plowcon").length })`), t = await toasts();
  ok(has && a.c === null && a.hold === false && a.jobs === 0 && /OUT TO TENDER/.test(a.txt) && t.some(m => /handed the .* back\. The council's plow has it again/.test(m)), "HAND BACK pressed with the touch layout on: the road is the council's again (" + JSON.stringify(t) + ")");
  await ev(`TABLET.toggle(false); SET.touch = "off"; setTouchUI(); true`);
  await natural(3);
  ok((await ev(`__rt(${rid}).st.s[${I}]`)) < 0.02, "and its plow clears the snow you left");
});

console.log(fails ? `x4_plowapp: ${fails} FAILED` : "x4_plowapp: all ok");
await done(fails ? 1 : 0);
