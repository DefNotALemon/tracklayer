// 4.2b1 fix v24 beta (tester 1): drop, retake, replow same week; carry-over cleared after Monday (no double count next week)
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

await section("C drop, retake, replow: one week total; next Monday clean", async () => {
  const k = K[0], q = JSON.stringify(k);
  const plow = async () => { await ev(`__storm(3); __hrs(1); true`); await blade(true); const c0 = await ev("GS.cash"); await pup(k, -0.4, L[0].L + 0.3); await blade(false); return (await ev("GS.cash")) - c0; };
  await ev(`TLXPL.drv.take(${q}); true`); const p1 = await plow();
  await ev(`TLXPL.drv.drop(${q}); true`);
  const t = await J(`TLXPL.drv.take(${q})`); console.log("  retake", t);
  const p2 = t ? await plow() : 0;
  console.log("  paid", p1, p2);
  await ev(`TLXPL.drv.monday({ label: "wk1" }); true`);
  const r1 = await J(`TLX.state("plow").conLast.filter(r => r.road === "Driveways")`);
  console.log("  wk1", JSON.stringify(r1));
  ok(r1.length === 1 && r1[0].pay === p1 + p2, `week 1 total ${p1 + p2}`);
  await ev(`TLXPL.drv.monday({ label: "wk2" }); true`);
  const r2 = await J(`TLX.state("plow").conLast.filter(r => r.road === "Driveways")`);
  console.log("  wk2", JSON.stringify(r2));
  ok(r2.every(r => r.pay === 0 || r.d !== "wk2"), "week 2 does not repeat week 1 pay");
});
console.log(fails ? `FAILED: ${fails}` : "all ok");
await done(fails ? 1 : 0);
