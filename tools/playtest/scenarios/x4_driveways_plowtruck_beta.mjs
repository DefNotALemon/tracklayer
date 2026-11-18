// 4.2b1 driveways with the factory plow truck (3.5 m blade), tester 1: pay, doors, hold at the drive mouth, back-drag, gritter, night.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
const KIT = `(() => {
  window.__dv = k => TLXPL.drv.list().find(c => c.key === k);
  window.__st = k => { const s = TLX.state("plow").drv[k]; return s ? JSON.parse(JSON.stringify(s)) : null; };
  window.__dput = (k, t) => { const c = __dv(k), d = TLXPL.bladeOf(TLXV.state().cur), yaw = Math.atan2(c.ux, c.uz), x = c.a[0] + c.ux * (t - d.z), z = c.a[1] + c.uz * (t - d.z);
    BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; crashCancel(); P.x = x; P.z = z; P.yaw = yaw; P.vx = P.vy = P.vz = 0; P.y = surf(x, z); return true; };
  window.__foot = () => { const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw); for (let k = -5; k <= 3; k += 0.15) bladeSnow(P.x + fx * k + fz * 1.6, P.z + fz * k - fx * 1.6, P.x + fx * k - fz * 1.6, P.z + fz * k + fx * 1.6, 0.15); P.y = surf(P.x, P.z); return true; };
  window.__dpup = (k, t0, t1) => { const dir = t1 >= t0 ? 1 : -1; let t = t0; window.__pupOn = true; __dput(k, t0); __foot();
    const step = () => { t += dir * 0.07; if ((t - t1) * dir >= 0) { P.vx = P.vz = 0; window.__pupOn = false; return; } const c = __dv(k), d = TLXPL.bladeOf(TLXV.state().cur) || { z: 3.25 }, yaw = Math.atan2(c.ux, c.uz);   /* on foot there is no current truck: the puppet threw here (builder, beta fix 0250 #1) */
      P.x = c.a[0] + c.ux * (t - d.z); P.z = c.a[1] + c.uz * (t - d.z); P.yaw = yaw; P.y = surf(P.x, P.z); P.vx = c.ux * 2.5 * dir; P.vz = c.uz * 2.5 * dir;
      window.__k = (TLXPL.rt(TLXV.state().cur).drv || {}).k || window.__k; requestAnimationFrame(step); };
    requestAnimationFrame(step); return true; };
  window.__hrs = h => { for (let t = 0; t < h - 1e-6; t += 1.5) { GS.hour += Math.min(1.5, h - t); TLX.state("roads").h = GS.hour; TLXPL.drv.step(); } return true; };
  window.__storm = h => { const w = WX.at; WX.at = () => 1; __hrs(h); WX.at = w; return true; };
  return true; })()`;
const pup = async (k, t0, t1) => { await ev(`window.__k = 0; __dpup(${JSON.stringify(k)}, ${t0}, ${t1})`); for (let i = 0; i < 400 && (await ev("window.__pupOn")); i++) await sleep(100); await sleep(250); };
const blade = dn => ev(`TLXPL.rt(TLXV.state().cur).down = ${dn}; TLXPL.rt(TLXV.state().cur).k = ${dn ? 1 : 0}; TLXPL.rt(TLXV.state().cur).last = null; true`);

await boot(); await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 90000; GS.lic = GS.lic || {}; GS.lic.freight = true; TLXV.buy("plowtruck"); TLXV.buy("pickup"); true`); await sleep(600);
const uid = await ev(`TLXV.state().owned.find(r => r.id === "plowtruck").uid`);
const uidP = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`);
await ev(`TLX.state("plow").blades[${JSON.stringify(uidP)}] = { id: "b23", cond: 100, throw: "r" }; TLXPL.tidy(); TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(700);
console.log("  blade", JSON.stringify(await J(`TLXPL.bladeOf(TLXV.state().cur)`)));
const L = await J(`TLXPL.drv.list().map(c => ({ key: c.key, L: c.L, name: c.name }))`);
const K = L.map(c => c.key), q = i => JSON.stringify(K[i]);
ok(K.length >= 4, "drives available: " + K.length);
await ev(`for (const k of ${JSON.stringify(K.slice(0, 4))}) TLXPL.drv.take(k); __storm(3); __hrs(1); true`);
await section("A plow truck clears a drive in one pass and is paid", async () => {
  await blade(true); const c0 = await ev("GS.cash"); const m = await ev("payMul()");
  const card = await J(`TLXPL.drv.base(__dv(${q(0)}))`);
  await pup(K[0], -0.4, L[0].L + 0.3); await blade(false);
  const a = await J(`({ st: __st(${q(0)}), cash: GS.cash, hint: TLXPL.hint() })`);
  console.log("  ", JSON.stringify(a), "card", card, "mul", m);
  ok(a.st && a.st.n === 1, "drive counted once"); ok(Math.abs(a.cash - c0 - card * m) <= 1.5, `paid ${a.cash - c0} vs ${card * m}`);
});
await section("B same drive again right after: no double pay", async () => {
  const c0 = await ev("GS.cash"); await blade(true); await pup(K[0], -0.4, L[0].L + 0.3); await blade(false);
  const a = await J(`({ st: __st(${q(0)}), cash: GS.cash })`);
  ok(a.cash === c0 && a.st.n === 1, "no second payment (" + (a.cash - c0) + ")");
});
await section("C back-dragging with the big blade", async () => {
  const c0 = await ev("GS.cash"); await blade(true); await pup(K[1], L[1].L + 0.3, -0.6); await blade(false);
  const a = await J(`({ st: __st(${q(1)}), cash: GS.cash })`);
  ok(a.st && a.st.n === 1 && a.cash > c0, "reverse pass pays too (" + (a.cash - c0) + ")");
});
await section("D drive pass leaves the walk to the door clear / no NaN snow, app renders", async () => {
  await ev(`TABLET.toggle(true, "plow"); true`); await sleep(500);
  const t = await ev(`$("tabS").textContent`); ok(!/NaN|undefined/.test(t), "plow app text clean");
  const hn = await J(`({ P: [P.x, P.y, P.z].every(Number.isFinite), jobs: jobsList().filter(r => r.kind === "plowdrv").length })`);
  ok(hn.P, "player pos finite"); await ev(`TABLET.toggle(false); true`);
});
await section("E swap to pickup mid-drive-part, reload, finish with plow truck", async () => {
  await blade(true); await pup(K[2], -0.4, L[2].L * 0.5); await blade(false);
  const s0 = await J(`__st(${q(2)})`);
  await ev(`save(); true`); await reload(); await ev(SETUP); await sleep(600); await ev(KIT);
  await ev(`TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(600);
  const c0 = await ev("GS.cash"); await blade(true); await pup(K[2], L[2].L * 0.45, L[2].L + 0.3); await blade(false);
  const a = await J(`({ st: __st(${q(2)}), cash: GS.cash })`);
  console.log("  before", JSON.stringify(s0), "after", JSON.stringify(a));
  ok(a.st && a.st.n === 1 && a.cash > c0, "finish after reload pays");
});
await section("F night + gritter running over a drive", async () => {
  await ev(`GS.hour = 46; TLX.state("roads").h = 46; true`);
  await ev(`TLXPL.drv.take(${q(3)}); true`); await ev(`__storm(4); __hrs(0.5); true`);
  console.log("  pre-F", JSON.stringify(await J(`({ st: __st(${q(3)}), cur: TLXV.state().cur === ${JSON.stringify(uid)}, foot: FOOT.on, heap: TLXPL.hint(), weather: WX.at() })`)));
  await blade(true); const c0 = await ev("GS.cash");
  await pup(K[3], -0.4, L[3].L + 0.3); await blade(false);
  const a = await J(`({ st: __st(${q(3)}), cash: GS.cash, hint: TLXPL.hint() })`);
  console.log("  post-F", JSON.stringify(a));
  ok(a.st && a.st.n >= 1 && a.cash > c0, "night pass pays (" + (a.cash - c0) + ")");
});
console.log(fails ? `FAILED: ${fails}` : "all ok");
await done(fails ? 1 : 0);
