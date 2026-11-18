// 4.2b1 driveways, beta break test (tester 1): blade up, on foot, partial + reload, old save, all eight taken, polar-night pay, bladeless truck.
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
    const step = () => { t += dir * 0.07; if ((t - t1) * dir >= 0) { P.vx = P.vz = 0; window.__pupOn = false; return; } const c = __dv(k), d = TLXPL.bladeOf(TLXV.state().cur), yaw = Math.atan2(c.ux, c.uz);
      P.x = c.a[0] + c.ux * (t - d.z); P.z = c.a[1] + c.uz * (t - d.z); P.yaw = yaw; P.y = surf(P.x, P.z); P.vx = c.ux * 2.5 * dir; P.vz = c.uz * 2.5 * dir;
      window.__k = (TLXPL.rt(TLXV.state().cur).drv || {}).k || window.__k; requestAnimationFrame(step); };
    requestAnimationFrame(step); return true; };
  window.__hrs = h => { for (let t = 0; t < h - 1e-6; t += 1.5) { GS.hour += Math.min(1.5, h - t); TLX.state("roads").h = GS.hour; TLXPL.drv.step(); } return true; };
  window.__storm = h => { const w = WX.at; WX.at = () => 1; __hrs(h); WX.at = w; return true; };
  return true; })()`;
const pup = async (k, t0, t1) => { await ev(`window.__k = 0; __dpup(${JSON.stringify(k)}, ${t0}, ${t1})`); for (let i = 0; i < 400 && (await ev("window.__pupOn")); i++) await sleep(100); await sleep(250); };
const blade = dn => ev(`TLXPL.rt(TLXV.state().cur).down = ${dn}; TLXPL.rt(TLXV.state().cur).k = ${dn ? 1 : 0}; TLXPL.rt(TLXV.state().cur).last = null; true`);

await boot(); await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 60000; TLXV.buy("pickup"); true`); await sleep(500);
const uid = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`);
await ev(`TLX.state("plow").blades[${JSON.stringify(uid)}] = { id: "b23", cond: 100, throw: "r" }; TLXPL.tidy(); TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(600);
const L = await J(`TLXPL.drv.list().map(c => ({ key: c.key, L: c.L, name: c.name }))`);
const K = L.map(c => c.key), q = i => JSON.stringify(K[i]);
await ev(`for (const k of ${JSON.stringify(K.slice(0, 3))}) TLXPL.drv.take(k); __storm(3); __hrs(1); true`);

await section("A blade UP over the whole drive: no progress, no pay", async () => {
  await blade(false); const c0 = await ev("GS.cash");
  await pup(K[0], -0.4, L[0].L + 0.3);
  const a = await J(`({ st: __st(${q(0)}), cash: GS.cash, marks: TLXPL.drv.marks.has(${q(0)}) })`);
  ok(a.cash === c0 && a.st.s > 0.4 && a.st.n === 0, `blade up: cash unchanged, drive still snowed in (s ${a.st.s.toFixed(2)})`);
});
await section("B on foot with the blade 'down': no pay", async () => {
  await blade(true); const c0 = await ev("GS.cash");
  await ev(`FOOT.on = true; true`); await pup(K[0], -0.4, L[0].L + 0.3); await ev(`FOOT.on = false; true`);
  const a = await J(`({ st: __st(${q(0)}), cash: GS.cash })`);
  ok(a.cash === c0 && a.st.n === 0, `walker beside the truck: nothing paid (${a.cash - c0})`);
});
await section("C 60% cut, reload, finish the other 40%", async () => {
  await ev(`TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(500);
  console.log("  pre-C", JSON.stringify(await J(`({ cur: TLXV.state().cur, uid: ${JSON.stringify(uid)}, foot: FOOT.on, bl: TLXPL.bladeOf(TLXV.state().cur) })`)));
  await blade(true); await pup(K[1], -0.4, L[1].L * 0.65);
  const k1 = await ev("window.__k"); await blade(false);
  await ev(`save(); true`); await reload(); await ev(SETUP); await sleep(600); await ev(KIT);
  const c0 = await ev("GS.cash");
  const dbg = await J(`({ cur: TLXV.state().cur, owned: TLXV.state().owned.map(r => r.id + ":" + r.uid), blades: Object.keys(TLX.state("plow").blades), uid: ${JSON.stringify(uid)}, drv1: __st(${q(1)}) })`);
  console.log("  after reload", JSON.stringify(dbg));
  await ev(`TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(500);
  await blade(true); await pup(K[1], L[1].L * 0.6, L[1].L + 0.3); await blade(false);
  const a = await J(`({ st: __st(${q(1)}), cash: GS.cash })`);
  console.log("  progress before reload", k1, JSON.stringify(a));
  ok(a.st && a.st.n === 1 && a.cash > c0, "finishing the remaining 40% after a reload pays (marks kept)") ;
});
await section("D old save: no drv keys at all", async () => {
  const r = await J(`(() => { const s = TLX.state("plow"); try { for (const k of ["drv", "drvOff", "drvH", "drvPaid", "drvN"]) delete s[k]; TLXPL.tidy(); TLXPL.drv.step(); TABLET.toggle(true, "plow"); jobsList(); return { ok: true, txt: $("tabS").textContent, d: s.drv }; } catch (e) { return { ok: false, e: String(e) }; } })()`);
  ok(r.ok && r.d && !/NaN|undefined/.test(r.txt), "state without driveway keys: tidied, app renders " + (r.e || ""));
  await ev(`TABLET.toggle(false); true`);
});
await section("E all eight taken: row, pins, frame cost", async () => {
  await ev(`for (const c of TLXPL.drv.list()) TLXPL.drv.take(c.key); __storm(3); true`); await sleep(1000);
  const a = await J(`({ jobs: jobsList().filter(r => r.kind === "plowdrv").map(r => r.title), pins: TABLET.layerPts("marks").filter(p => /DRIVE/.test(p.name || "")).length, due: TLXPL.drv.due().length })`);
  console.log("  ", JSON.stringify(a));
  ok(a.jobs.length === 1 && /driveways|drive/.test(a.jobs[0]) && a.pins === a.due && a.due >= 7, "one row, a pin per snowed-in drive (" + a.due + ")");
  await ev(`window.__fr = null; (() => { let n = 0; const t0 = performance.now(); const f = () => { if (++n < 90) requestAnimationFrame(f); else window.__fr = (performance.now() - t0) / n; }; requestAnimationFrame(f); })(); true`); await sleep(15000);
  console.log("  ms/frame with 8 drives snowed in:", await ev("window.__fr"));
});
await section("F polar-night pay and a bladeless truck", async () => {
  await ev(`GS.hour = 634; TLX.state("roads").h = 634; TLXPL.drv.step(); true`); await sleep(500);
  const m = await ev("payMul()"); const key = K[3];
  const card = await J(`TLXPL.drv.base(__dv(${JSON.stringify(key)}))`);
  await ev(`__storm(3); true`); await ev(`TLXV.buy("pickup"); true`); await sleep(400);
  const u2 = await ev(`TLXV.state().owned.filter(r => r.id === "pickup").slice(-1)[0].uid`);
  await ev(`TLXV.swapTo(${JSON.stringify(u2)}); FOOT.on = false; true`); await sleep(600);
  const j = await J(`jobsList().filter(r => r.kind === "plowdrv").map(r => ({ auto: r.auto, t: r.title }))`);
  const h = await J(`TLXPL.hint()`);
  ok(j.length === 1 && j[0].auto === false && !/drive/.test(String(h)), `bladeless truck: row shown but not auto-tracked, no drive hint (mul ${m}, hint ${JSON.stringify(h)})`);
  await ev(`TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(600);
  const c0 = await ev("GS.cash"); await blade(true); await pup(key, -0.4, L[3].L * 0.9); await blade(false);
  const a = await ev("GS.cash");
  ok(a - c0 === Math.round(card * m * 1) || Math.abs(a - c0 - card * m) <= 1.5, `paid +$${a - c0}, base ${card} x payMul ${m} (a fresh storm: full pay)`);
});
console.log(fails ? `FAILED: ${fails}` : "all ok");
await done(fails ? 1 : 0);
