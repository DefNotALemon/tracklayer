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
  const a = await J(`({ app: $("tabS").dataset.app, cards: [...$("tabS").querySelectorAll(".tcard")].map(c => c.querySelector(".tct span").textContent), sign: [...$("tabS").querySelectorAll("[data-act^='pls:']")].map(b => b.dataset.act + (b.classList.contains("blocked") ? ":blocked" : "")), text: $("tabS").textContent.replace(/\\s+/g, " ").slice(0, 600) })`);
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

// 4.2a beta fix 0246 #1/#2: THE KOMMUNE'S FILE. HAND BACK does not wipe the slate.
//   C warnings stay on the road's file across HAND BACK + SIGN (card chip + line, the SIGN toast), a re-signed road
//     needs a whole clean week before a Monday strikes one off; a clean road leaves no file.
//   D a shut stretch's clock is kept on file and keeps running: 2 h + 1 h handed back + 5.5 h re-signed = a warning.
//   E the file's clock is dropped when the stretch is cleared, or slept through.
//   F HAND BACK with a stretch shut 4 h+ is itself a warning (the card says so first; pressed on the touch layout);
//     no second warning for the same hours after signing again.
//   G the third warning by HAND BACK takes the road back for a week; after the week the slate is clean.
//   H HAND BACK after the kommune's truck already went out (cover) costs no second warning.
//   I a reload keeps the file; junk in it does not throw.
const st = () => J(`(() => { const s = TLX.state("plow"); return { c: s.con[${rid}] ? JSON.parse(JSON.stringify(s.con[${rid}])) : null, q: s.conRec[${rid}] ? JSON.parse(JSON.stringify(s.conRec[${rid}])) : null, ban: s.conBan[${rid}] || 0, hold: TLXR.hold(${rid}), cost: TLXPL.con.quitCost(${rid}), H: GS.hour }; })()`);
const reset = () => ev(`(() => { const s = TLX.state("plow"); s.con = {}; s.conRec = {}; s.conBan = {}; TLXR.setSnow(null, 0); TLX.state("roads").h = GS.hour; TLXPL.con.step(); return true; })()`);
const snowOn = () => ev(`TLXR.setSnow(${rid}, 0.5, ${I}); TLXPL.con.step(); true`);
const appText = async () => { await ev(`TABLET.toggle(true, "plow"); true`); await sleep(450); return ev(`$("tabS").textContent.replace(/\\s+/g, " ")`); };

await section("C warnings stay on the road's file", async () => {
  await ev(`TLX.state("plow").con[${rid}].strikes = 2; true`); await clearToasts();
  const r = await ev(`TLXPL.con.quit(${rid})`); await sleep(300);
  let a = await st(), t = await toasts();
  ok(r === true && a.c === null && a.q && a.q.strikes === 2 && a.hold === false, "handed back at 2 warnings: the road is the council's, the file holds 2 (" + JSON.stringify(a.q) + ")");
  ok(t.some(m => /handed the .* back\. The council's plow has it again\. The kommune keeps the 2 warnings on that road's file/.test(m)) && !t.some(m => /Warning \d of/.test(m)), "the line says the warnings are kept, and no new warning is given (" + JSON.stringify(t) + ")");
  const txt = await appText(); await still("file_card");
  ok(/OUT TO TENDER/.test(txt) && /WARNING 2 OF 3 ON FILE/.test(txt) && /holds 2 warnings against you/.test(txt), "the card of the road handed back: OUT TO TENDER, WARNING 2 OF 3 ON FILE, and what signing brings back");
  await clearToasts();
  await ev(`$("tabS").querySelector("[data-act='pls:" + ${rid} + "']").click(); true`); await sleep(400);
  a = await st(); t = await toasts(); const txt2 = await ev(`$("tabS").textContent.replace(/\\s+/g, " ")`);
  ok(a.c && a.c.strikes === 2 && a.c.clean === false && a.q === null && a.hold === true, "SIGN pressed in the app: the 2 warnings are back on the contract, the file is used up (strikes " + (a.c && a.c.strikes) + ")");
  ok(t.some(m => /is yours to plow.*still holds 2 warnings against you/.test(m)) && /WARNING 2 OF 3/.test(txt2) && /YOURS/.test(txt2), "the SIGN line and the card both say so");
  await ev(`TABLET.toggle(false); TLXPL.con.monday({ label: "Mon A" }); true`);
  const m1 = (await st()).c.strikes; await ev(`TLXPL.con.monday({ label: "Mon B" }); true`); const m2 = (await st()).c.strikes;
  ok(m1 === 2 && m2 === 1, `the first Monday after signing again strikes nothing off (${m1}), the next clean one does (${m2})`);
  await ev(`TLX.state("plow").con[${rid}].strikes = 0; TLXPL.con.quit(${rid}); true`);
  a = await st(); ok(a.c === null && a.q === null, "a road with no warning and no snow handed back leaves no file");
});

await section("D the clock of a shut stretch is kept", async () => {
  await reset(); await ev(`TLXPL.con.sign(${rid}); true`); await snowOn(); await ev(`__quiet(2); true`);
  let a = await st(); console.log("  2 h:", JSON.stringify(a.c.due), "cost", a.cost);
  ok(a.c.due[I] && Math.abs(a.c.due[I][0] - 2) < 0.2 && a.c.due[I][1] === 1 && a.cost === false, "shut 2 h: on the clock, and handing back is not yet a warning");
  await clearToasts(); await ev(`TLXPL.con.quit(${rid}); true`); await sleep(250);
  a = await st(); let t = await toasts();
  ok(a.c === null && a.q && a.q.strikes === 0 && a.q.due[I] && Math.abs(a.q.due[I][0] - 2) < 0.2 && a.q.due[I][1] === 1 && !t.some(m => /Warning/.test(m)), "handed back at 2 h: no warning, the stretch's clock goes on file (" + JSON.stringify(a.q) + ")");
  await ev(`__quiet(1); true`); a = await st();
  ok(a.q && Math.abs(a.q.due[I][0] - 3) < 0.2, "an hour on, still snowed in: the file's clock reads " + (a.q && a.q.due[I] && a.q.due[I][0].toFixed(2)) + " h");
  await clearToasts(); await ev(`TLXPL.con.sign(${rid}); true`); await sleep(250);
  a = await st(); t = await toasts();
  ok(a.c && a.c.strikes === 0 && a.c.due[I] && Math.abs(a.c.due[I][0] - 3) < 0.2 && a.c.due[I][1] === 1 && a.q === null && t.some(m => /The clock on its snow never stopped/.test(m)), "signed again: the clock is where it was (3 h), and the line says so");
  await clearToasts(); await ev(`__quiet(5.5); true`); await sleep(300);
  a = await st(); t = await toasts();
  ok(a.c && a.c.strikes === 1 && a.c.cover === true && t.some(m => /has lain shut 8 h.*Warning 1 of 3/.test(m)), "8.5 h shut across the hand-back: warning 1, the kommune's truck goes out (0246 #2) " + JSON.stringify(t));
});

await section("E the file's clock ends with the snow", async () => {
  await reset(); await ev(`TLXPL.con.sign(${rid}); true`); await snowOn(); await ev(`__quiet(2); TLXPL.con.quit(${rid}); true`);
  let a = await st(); const had = !!(a.q && a.q.due[I]);
  await ev(`TLXR.setSnow(${rid}, 0, ${I}); TLXPL.con.step(); true`); a = await st();
  ok(had && a.q === null, "the council clears the stretch: nothing left on file");
  await ev(`TLXPL.con.sign(${rid}); true`); await snowOn(); await ev(`__quiet(2); TLXPL.con.quit(${rid}); true`);
  const had2 = !!((await st()).q || {}).due;
  await ev(`GS.hour += 6; TLX.state("roads").h = GS.hour; TLXPL.con.step(); true`); a = await st();
  ok(had2 && a.q === null, "slept through after handing back (the skip plows every road): the clock is dropped, no warning to carry");
  await ev(`TLXPL.con.sign(${rid}); true`); a = await st();
  ok(a.c && a.c.strikes === 0 && Object.keys(a.c.due).length === 0 && a.c.clean === true, "signed again: a clean contract");
});

await section("F HAND BACK with a stretch shut 4 h+ is a warning", async () => {
  await reset(); await ev(`TLXPL.con.sign(${rid}); true`); await snowOn(); await ev(`__quiet(5); true`);
  let a = await st(); ok(a.cost === true && a.c.strikes === 0, "shut 5 h: handing back would cost a warning");
  await ev(`SET.touch = "on"; setTouchUI(); true`);
  const txt = await appText(); await still("handback_warn");
  ok(/handing the road back now is a warning/.test(txt), "the card says so before you press");
  await clearToasts();
  await ev(`$("tabS").querySelector("[data-act='plq:" + ${rid} + "']").dispatchEvent(new MouseEvent("click", { bubbles: true })); true`); await sleep(400);
  a = await st(); let t = await toasts(); const txt2 = await ev(`$("tabS").textContent.replace(/\\s+/g, " ")`);
  ok(a.c === null && a.q && a.q.strikes === 1 && Object.keys(a.q.due).length === 0 && a.hold === false, "HAND BACK pressed on the touch layout: the road is back, warning 1 on file, the clock dropped (" + JSON.stringify(a.q) + ")");
  ok(t.some(m => /handed the .* back with a stretch lying shut.*Warning 1 of 3, kept on that road's file/.test(m)) && t.filter(m => /Warning \d of/.test(m)).length === 1 && /WARNING 1 OF 3 ON FILE/.test(txt2), "one line, and the card shows the file (" + JSON.stringify(t) + ")");
  await ev(`TABLET.toggle(false); SET.touch = "off"; setTouchUI(); TLXPL.con.sign(${rid}); TLXPL.con.step(); __quiet(3.5); true`); await sleep(250);
  a = await st();
  ok(a.c && a.c.strikes === 1 && a.c.due[I] && a.c.due[I][0] < 3.8, "signed again at once: the same hours are not charged twice (strikes " + (a.c && a.c.strikes) + ", clock " + (a.c && a.c.due[I] && a.c.due[I][0].toFixed(2)) + " h)");
});

await section("G the third warning by HAND BACK", async () => {
  await reset(); await ev(`TLXPL.con.sign(${rid}); TLX.state("plow").con[${rid}].strikes = 2; true`); await snowOn(); await ev(`__quiet(5); true`);
  await clearToasts(); const r = await ev(`TLXPL.con.quit(${rid})`); await sleep(250);
  let a = await st(), t = await toasts();
  ok(r === true && a.c === null && a.q === null && a.ban > a.H + 160 && t.some(m => /Third warning: the kommune has taken the .* back/.test(m)), "handed back shut at 2 warnings: the third, taken back for a week, no file left to sign round");
  const s1 = await ev(`TLXPL.con.sign(${rid})`);
  ok(s1 === false && (await st()).c === null, "SIGN is refused while it is taken back");
  await ev(`TLXR.setSnow(null, 0); GS.hour += 169; TLX.state("roads").h = GS.hour; TLXPL.con.step(); true`);
  const s2 = await ev(`TLXPL.con.sign(${rid})`); a = await st();
  ok(s2 === true && a.c && a.c.strikes === 0 && a.c.clean === true, "a week on: tendered again with a clean slate");
});

await section("H after the kommune's truck has gone out", async () => {
  await reset(); await ev(`TLXPL.con.sign(${rid}); true`); await snowOn(); await ev(`__quiet(8.5); true`); await sleep(200);
  let a = await st(); const s0 = a.c && a.c.strikes, cov = a.c && a.c.cover;
  await clearToasts(); await ev(`TLXPL.con.quit(${rid}); true`); await sleep(250);
  a = await st(); const t = await toasts();
  ok(s0 === 1 && cov === true && a.q && a.q.strikes === 1 && Object.keys(a.q.due).length === 0 && !t.some(m => /Warning \d of/.test(m)), "warned at 8 h, then handed back: no second warning for the same snow, 1 on file");
});

await section("I reload; junk", async () => {
  await reset(); await ev(`TLXPL.con.sign(${rid}); TLX.state("plow").con[${rid}].strikes = 1; true`); await snowOn(); await ev(`__quiet(2); TLXPL.con.quit(${rid}); save(); true`);
  const b = await st();
  await reload(); await ev(SETUP); await sleep(500); await ev(KIT);
  const a = await st(), sn = await ev(`__rt(${rid}).st.s[${I}]`);
  ok(b.q && a.q && a.q.strikes === 1 && a.q.due[I] && Math.abs(a.q.due[I][0] - b.q.due[I][0]) < 0.3 && a.q.due[I][1] === 1 && a.c === null && Math.abs(sn - 0.5) < 0.01, "a reload keeps the file: the warning and the stretch's clock (" + JSON.stringify(a.q) + ")");
  const r = await ev(`(() => { try { const s = TLX.state("plow"); s.conRec = { a: 5, zz: { strikes: 9, due: null }, [${rid}]: { strikes: "x", due: { 1: "no", 2: [NaN, 1], 3: [4, 7] } } }; TLXPL.tidy(); const o = JSON.stringify(s.conRec); TLXPL.con.step(); s.conRec = "junk"; TLXPL.tidy(); TLXPL.con.step(); TLXPL.con.sign(${rid}); TLXPL.con.quit(${rid}); return o + "|" + JSON.stringify(s.conRec); } catch (e) { return "THREW " + e.message; } })()`);
  console.log("  ", r);
  const q = /^THREW/.test(r) ? null : JSON.parse(r.split("|")[0]);
  ok(q && q.a === undefined && q.zz && q.zz.strikes === 2 && q[RID] && q[RID].strikes === 0 && JSON.stringify(q[RID].due) === '{"3":[4,1]}', "junk in the saved file: tidied, nothing thrown");
});

console.log("x4_plowfile: " + (fails ? fails + " FAIL" : "all ok"));
await done(fails ? 1 : 0);
