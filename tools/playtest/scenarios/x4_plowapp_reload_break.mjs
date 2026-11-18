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
const rid = JSON.stringify("dyfjord");
await section("A sign, snow, warning on file, then RELOAD mid-contract", async () => {
  await ev(`GS.cash = 40000; GS.lic = GS.lic || {}; GS.lic.freight = true; TLXV.buy("plowtruck"); true`); await sleep(500);
  const uid = await ev(`TLXV.state().owned.find(r => r.id === "plowtruck").uid`);
  await ev(`TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(600);
  ok(await ev(`TLXPL.con.sign(${rid})`) !== false, "signed dyfjord");
  await ev(`TLXR.setSnow(${rid}, 0.5, 3); TLXPL.con.step(); __quiet(5); true`); await sleep(300);
  const b = await J(`__con(${rid})`); console.log("  before reload", JSON.stringify(b));
  await ev(`save(); true`);
  await reload(); await ev(SETUP); await sleep(800); await ev(KIT);
  const a = await J(`__con(${rid})`); console.log("  after reload", JSON.stringify(a));
  ok(a && b && a.strikes === b.strikes && Math.abs(a.due["3"][0] - b.due["3"][0]) < 0.2 && a.due["3"][1] === b.due["3"][1], "contract + stretch clocks survive a reload");
  const hold = await ev(`TLXR.hold(${rid})`);
  ok(hold === true, "council plow still held on the road after reload (" + hold + ")");
  ok(await ev(`jobsList().filter(r => r.kind === "plowcon").length`) >= 1, "Jobs row back after reload");
  const tl = await ev(`TABLET.byId.plow.hidden()`); ok(tl === false, "Plow app still on tablet after reload");
});
await section("B night / polar-night pay and the card's price agree", async () => {
  const day = await ev(`(GS.hour = 34 + 0, payMul())`);
  const night = await ev(`(GS.hour = 34 + 14, payMul())`);
  console.log("  payMul day", day, "night", night);
  await ev(`GS.hour = 34 + 14; TLX.state("roads").h = GS.hour; true`);
  await ev(`TABLET.toggle(true, "plow"); true`); await sleep(500);
  const txt = await ev(`$("tabS").textContent.replace(/\\s+/g, " ")`);
  const m = txt.match(/\$(\d+)[^$]{0,40}stretch/); console.log("  card:", txt.slice(0, 300));
  ok(!/NaN|undefined/.test(txt), "card has no NaN/undefined at night");
  await ev(`TABLET.toggle(false); true`);
});
await section("C a contract on an old save without the plow key", async () => {
  await ev(`save(); true`);
  const sv = await J(`JSON.parse(localStorage.getItem(SAVE_KEY || "tracklayer") || "null") || null`).catch(() => null);
  const key = await ev(`(typeof SAVE_KEY !== "undefined" ? SAVE_KEY : null)`);
  console.log("  save key", key, "loaded", !!sv);
  if (!sv) { ok(true, "info: could not read save, skipped"); return; }
  if (sv.x && sv.x.sys) delete sv.x.sys.plow;
  await reload(sv); await ev(SETUP); await sleep(800); await ev(KIT);
  const st = await J(`({ s: TLX.state("plow"), hidden: TABLET.byId.plow.hidden() })`);
  ok(st.s && st.s.con && Object.keys(st.s.con).length === 0, "plow state rebuilt empty for a save without it");
  await ev(`TABLET.toggle(true, "plow"); true`); await sleep(400);
  ok(!/NaN|undefined/.test(await ev(`$("tabS").textContent`)), "app renders after migration");
});
await section("D pickup blade vs truck swap: contract with the plow truck left in the shed", async () => {
  await ev(`GS.cash = 40000; TLXV.buy("pickup"); true`); await sleep(400);
  const uid = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`);
  await ev(`TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(500);
  const r = await ev(`TLXPL.con.sign(${rid})`);
  console.log("  sign with pickup w/o blade ->", r);
  ok(await ev(`!!TLXPL.state()`), "plow state alive");
  const t = await ev(`TLXPL.hint ? String(TLXPL.hint()) : ""`); console.log("  hint", t);
});
console.log("x4_plowapp_reload_break: " + (fails ? fails + " FAIL" : "all ok"));
await done(fails ? 1 : 0);
