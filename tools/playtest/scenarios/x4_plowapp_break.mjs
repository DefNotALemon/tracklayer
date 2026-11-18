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

// Beta break test for 4.2a: laundering warnings by HAND BACK + SIGN, handing back with a shut stretch on the clock,
// unfitting the blade while a contract stands, signing a second road, a sleep with a sold blade. Exit 1 on a FAIL.
await section("M hand back with a shut stretch, re-sign: does the warning clock survive?", async () => {
  await ev(`TLXR.setSnow(${rid}, 0.5, ${I}); TLXPL.con.step(); __quiet(7); true`); await sleep(300);
  const before = await J(`__con(${rid})`);
  await ev(`TLXPL.con.quit(${rid}); true`); await sleep(200);
  await ev(`TLXPL.con.sign(${rid}); true`); await sleep(200);
  await ev(`__quiet(3); true`); await sleep(300);
  const after = await J(`__con(${rid})`);
  console.log("  before", JSON.stringify(before), "after", JSON.stringify(after));
  ok(after && after.strikes >= 1, "stretch shut 10 h across a hand-back and re-sign still earns a warning (strikes " + (after && after.strikes) + ")");
});
await section("N launder strikes: 2 warnings, hand back, sign again", async () => {
  await ev(`(() => { const c = TLX.state("plow").con[${rid}]; if (c) c.strikes = 2; return true; })()`);
  await ev(`TLXPL.con.quit(${rid}); true`); await ev(`TLXPL.con.sign(${rid}); true`); await sleep(200);
  const c = await J(`__con(${rid})`);
  ok(c && c.strikes === 2, "a road handed back at 2 warnings and signed again keeps its 2 warnings (strikes " + (c && c.strikes) + ")");
});
await section("O unfit the only blade while a contract stands", async () => {
  await ev(`TLXPL.con.quit(${rid}); TLXPL.con.sign(${rid}); true`);
  const st = await J(`({ blades: Object.keys(TLXPL.state().blades), fac: Object.values(TLXPL.state().blades).map(b => b.id) })`);
  console.log("  ", JSON.stringify(st));
  const r = await ev(`TLXPL.unfit(${JSON.stringify(uid)})`);
  const h = await J(`({ held: TLXR.hold(${rid}), con: !!__con(${rid}), app: TABLET.byId.plow.hidden() })`);
  console.log("  unfit ->", r, JSON.stringify(h));
  ok(true, "info only: contract with no blade -> held " + h.held + ", still signed " + h.con + ", app hidden " + h.app);
});
await section("P second road at once", async () => {
  await ev(`TLXPL.con.sign(${oid}); true`);
  const n = await ev(`Object.keys(TLX.state("plow").con).length`);
  ok(n === 2 || n === 1, "info: contracts held at once = " + n);
});
console.log("x4_plowapp_break: " + (fails ? fails + " FAIL" : "all ok"));
await done(fails ? 1 : 0);
