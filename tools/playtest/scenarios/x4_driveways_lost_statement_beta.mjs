// 4.2b1 driveways beta (tester 1): paid-then-dropped drive vs Monday statement; customer lost for a week through reload; back after 168 h.
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
    const step = () => { t += dir * 0.07; if ((t - t1) * dir >= 0) { P.vx = P.vz = 0; window.__pupOn = false; return; } const c = __dv(k), d = TLXPL.bladeOf(TLXV.state().cur) || { z: 3.25 }, yaw = Math.atan2(c.ux, c.uz);
      P.x = c.a[0] + c.ux * (t - d.z); P.z = c.a[1] + c.uz * (t - d.z); P.yaw = yaw; P.y = surf(P.x, P.z); P.vx = c.ux * 2.5 * dir; P.vz = c.uz * 2.5 * dir;
      requestAnimationFrame(step); };
    requestAnimationFrame(step); return true; };
  window.__hrs = h => { for (let t = 0; t < h - 1e-6; t += 1.5) { GS.hour += Math.min(1.5, h - t); TLX.state("roads").h = GS.hour; TLXPL.drv.step(); } return true; };
  window.__storm = h => { const w = WX.at; WX.at = () => 1; __hrs(h); WX.at = w; return true; };
  return true; })()`;
const pup = async (k, t0, t1) => { await ev(`__dpup(${JSON.stringify(k)}, ${t0}, ${t1})`); for (let i = 0; i < 400 && (await ev("window.__pupOn")); i++) await sleep(100); await sleep(250); };
const blade = dn => ev(`TLXPL.rt(TLXV.state().cur).down = ${dn}; TLXPL.rt(TLXV.state().cur).k = ${dn ? 1 : 0}; TLXPL.rt(TLXV.state().cur).last = null; true`);

await boot(); await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 60000; TLXV.buy("pickup"); true`); await sleep(500);
const uid = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`);
await ev(`TLX.state("plow").blades[${JSON.stringify(uid)}] = { id: "b23", cond: 100, throw: "r" }; TLXPL.tidy(); TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(600);
const L = await J(`TLXPL.drv.list().map(c => ({ key: c.key, L: c.L, name: c.name }))`);
const K = L.map(c => c.key);

await section("A plow a drive (paid), give it up, Monday: statement?", async () => {
  await ev(`TLXPL.drv.take(${JSON.stringify(K[0])}); __storm(3); __hrs(1); true`);
  await blade(true); const c0 = await ev("GS.cash"); await pup(K[0], -0.4, L[0].L + 0.3); await blade(false);
  const paid = (await ev("GS.cash")) - c0;
  ok(paid > 0, `paid $${paid}`);
  await ev(`TLXPL.drv.drop(${JSON.stringify(K[0])}); true`);
  const before = await J(`TLX.state("plow").conLast.length`);
  await ev(`TLXPL.drv.monday({ label: "test week" }); true`);
  const rows = await J(`TLX.state("plow").conLast.filter(r => r.road === "Driveways")`);
  console.log("  rows", JSON.stringify(rows), "before", before);
  ok(rows.length > 0 && rows[0].pay === paid, `Monday statement lists the $${paid} earned on a drive handed back before Monday (rows ${rows.length})`);
});
await section("B two misses lose the customer; reload keeps it; 168 h later back", async () => {
  const k = K[1]; await ev(`TLXPL.drv.take(${JSON.stringify(k)}); __storm(3); __hrs(13); true`);   // miss 1
  const m1 = await J(`__st(${JSON.stringify(k)})`);
  await ev(`__storm(3); __hrs(13); true`);  // miss 2
  const off = await J(`({ st: __st(${JSON.stringify(k)}), off: TLX.state("plow").drvOff[${JSON.stringify(k)}], h: GS.hour })`);
  console.log("  m1", JSON.stringify(m1), "off", JSON.stringify(off));
  ok(!off.st && off.off > off.h, "customer lost after the second miss");
  await ev(`save(); true`); await reload(); await ev(SETUP); await sleep(600); await ev(KIT);
  const r = await J(`({ off: TLX.state("plow").drvOff[${JSON.stringify(k)}], h: GS.hour, took: TLXPL.drv.take(${JSON.stringify(k)}) })`);
  ok(r.took === false && r.off > r.h, `after reload still refused (off until ${r.off}, now ${r.h})`);
  await ev(`GS.hour = TLX.state("plow").drvOff[${JSON.stringify(k)}] + 0.5; true`);
  const t2 = await J(`TLXPL.drv.take(${JSON.stringify(k)})`);
  ok(t2 === true, "a week on he takes you back");
  const tidy = await J(`(() => { const s = TLX.state("plow"); return { off: s.drvOff[${JSON.stringify(k)}], sulk: s.drvSulk[${JSON.stringify(k)}] }; })()`);
  ok(tidy.off === undefined, "refusal record cleared on take " + JSON.stringify(tidy));
});
const pe = await ev(`(window.__tlerr || []).length`).catch(() => 0);
console.log(fails ? `FAILED: ${fails}` : "all ok");
await done(fails ? 1 : 0);
