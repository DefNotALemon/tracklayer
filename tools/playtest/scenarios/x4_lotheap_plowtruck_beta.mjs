// 4.2c2a beta: lot heap with the 3.5 m plow truck blade; swap trucks while held; reload mid-lot
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
  if (!window.__camHk) { window.__camHk = 1; const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); }; }   // stills: survives a reload, which lib's sideCam hook does not
  window.__lt = id => TLXPL.lot.list().find(c => c.id === id);
  window.__st = id => { const s = TLX.state("plow").lot[id]; return s ? JSON.parse(JSON.stringify(s)) : null; };
  // a free square of the lot's middle about 0.3 r from its centre, and the bank square furthest out: [x, z]
  window.__sq = id => { const c = __lt(id); let best = null, bd = 1e9; for (let p = 0; p < c.mid.length; p += 2) { const d = Math.abs(Math.hypot(c.mid[p], c.mid[p + 1]) - c.r * 0.3); if (d < bd) { bd = d; best = [c.x + c.mid[p], c.z + c.mid[p + 1]]; } } return best; };
  window.__rim = id => { const c = __lt(id), M = new Set(); for (let p = 0; p < c.mid.length; p += 2) M.add(c.mid[p] + "," + c.mid[p + 1]); let best = null, bd = -1;
    for (const [k] of c.idx) { const i = Math.floor(k / 1024) - 512, j = k % 1024 - 512; if (M.has(i + "," + j)) continue; const d = Math.hypot(i, j); if (d > bd) { bd = d; best = [c.x + i, c.z + j]; } } return best; };
  window.__at = (x, z) => { const ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL); return { y: yardAt(x, z), r: restCell(ix, iz), d: depthAt(ix, iz) }; };
  window.__mid = id => { const p = __sq(id); return __at(p[0], p[1]); };
  // the m3 standing over the settled level anywhere within r + 4 of the lot's centre (the middle, the bank and just outside)
  window.__all3 = id => { const c = __lt(id), R = c.r + 4; let v = 0; for (let z = c.z - R; z <= c.z + R; z += CELL) for (let x = c.x - R; x <= c.x + R; x += CELL) { if (Math.hypot(x - c.x, z - c.z) > R) continue; const ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL), o = depthAt(ix, iz) - restCell(ix, iz); if (o > 0.12) v += o * CELL * CELL; } return v; };
  window.__lput = (id, u, v) => { const c = __lt(id), d = TLXPL.bladeOf(TLXV.state().cur), x = c.x + u, z = c.z + v - d.z;
    BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; crashCancel(); FOOT.on = false; P.x = x; P.z = z; P.yaw = 0; P.vx = P.vy = P.vz = 0; P.y = surf(x, z); return true; };
  window.__foot = () => { const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw); for (let k = -5; k <= 3; k += 0.15) bladeSnow(P.x + fx * k + fz * 1.6, P.z + fz * k - fx * 1.6, P.x + fx * k - fz * 1.6, P.z + fz * k + fx * 1.6, 0.15); P.y = surf(P.x, P.z); return true; };
  // a puppet: one pass across the lot, the blade's middle u metres east of its centre, nose to +z (so "throw right" lays its windrow to the WEST)
  window.__lpup = (id, u, v0, v1) => { let v = v0; window.__pupOn = true; __lput(id, u, v0); __foot();
    const step = () => { v += 0.12; if (v >= v1) { P.vx = P.vz = 0; window.__pupOn = false; return; } const c = __lt(id), d = TLXPL.bladeOf(TLXV.state().cur);
      P.x = c.x + u; P.z = c.z + v - d.z; P.yaw = 0; P.y = surf(P.x, P.z); P.vx = 0; P.vz = 2.5; if (P.gnd === false) window.__air = (window.__air || 0) + 1; requestAnimationFrame(step); };
    requestAnimationFrame(step); return true; };
  window.__allsq = id => { const c = __lt(id); for (const [k] of c.idx) { const i = Math.floor(k / 1024) - 512, j = k % 1024 - 512; if (!TLXPL.lot.mark([c.x + i, c.z + j, c.x + i, c.z + j], true)) break; } return true; };
  window.__hrs = h => { for (let t = 0; t < h - 1e-6; t += 1.5) { GS.hour += Math.min(1.5, h - t); TLX.state("roads").h = GS.hour; TLXPL.lot.step(); } return true; };
  window.__storm = h => { const w = WX.at; WX.at = () => 1; __hrs(h); WX.at = w; return true; };
  // a held lot without the driving: snowed in, vol m3 heaped on a square of its middle, every square marked
  window.__held = (id, vol) => { const s = TLX.state("plow"); if (!s.lot[id]) TLXPL.lot.take(id); __storm(3); const p = __sq(id); heapSnow(p[0], p[1], 1.5, vol, 0.8); __allsq(id); return __st(id); };
  window.__cam = id => { const c = __lt(id); window.camOv = cam => { cam.position.set(c.x + c.r * 1.5, surf(c.x, c.z) + c.r * 1.7, c.z - c.r * 1.3); cam.lookAt(c.x, surf(c.x, c.z), c.z); }; return true; };
  return true; })()`;
const pass = async (id, u, v0, v1) => { await ev(`__lpup(${JSON.stringify(id)}, ${u}, ${v0}, ${v1})`); for (let i = 0; i < 600 && (await ev("window.__pupOn")); i++) await sleep(100); await sleep(150); };
const blade = dn => ev(`TLXPL.rt(TLXV.state().cur).down = ${dn}; TLXPL.rt(TLXV.state().cur).k = ${dn ? 1 : 0}; TLXPL.rt(TLXV.state().cur).last = null; true`);
const cashNow = () => ev("GS.cash");
const jobs = () => J(`jobsList().filter(r => r.kind === "plowlot").map(r => ({ title: r.title, meta: r.meta, chips: r.chips, pay: r.pay }))`);
const truck = async () => { const uid = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`); await ev(`TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(500); return uid; };
const appText = async () => { await ev(`TABLET.toggle(true, "plow"); true`); await sleep(400); const t = await ev(`$("tabS").textContent`); return t; };
const A = `"hosp"`, B2 = `"sledpark"`;


await boot();
await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 32; TLX.state("roads").h = 32; GS.cash = 90000; GS.lic = GS.lic || {}; GS.lic.freight = true; TLXV.buy("plowtruck"); TLXV.buy("pickup"); true`); await sleep(700);
const uidT = await ev(`TLXV.state().owned.find(r => r.id === "plowtruck").uid`), uidP = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`);
await ev(`TLX.state("plow").blades[${JSON.stringify(uidP)}] = { id: "b23", cond: 100, throw: "r" }; TLXPL.tidy(); TLXV.swapTo(${JSON.stringify(uidT)}); FOOT.on = false; true`); await sleep(800);
const L = await J(`TLXPL.lot.list().map(c => ({ id: c.id, r: c.r, n: c.n, mid: c.mid.length / 2, base: TLXPL.lot.base(c) }))`);
const HO = L.find(c => c.id === "hosp"), SP = L.find(c => c.id === "sledpark");
const mul = await ev("payMul()"), OKM3 = await ev("TLXPL.lot.LOT.heapOk");
console.log(JSON.stringify({ L, mul, OKM3, blade: await J(`TLXPL.bladeOf(TLXV.state().cur).id`), cur: await J(`TLXV.state().cur`) }));
let held = null, c0 = 0;
await section("A plow truck 3.5 m blade, thrown wrong way round on the forecourt", async () => {
  await ev(`TLXPL.lot.take(${A}); __storm(3); __hrs(0.5)`); c0 = await cashNow(); const r = HO.r;
  await ev(`__lput(${A}, -${r - 1}, -${r})`); await sleep(1200); await clearToasts();
  const us = []; for (let u = -(r - 1); u <= r - 1 + 1e-6; u += 3) us.push(u);
  let i = 0, st = null;
  for (; i < us.length; i++) { await blade(false); await ev(`__lput(${A}, ${us[i]}, -${r}); __foot()`); await blade(true); await pass("hosp", us[i], -r, r); st = await J(`__st(${A})`); if (!st || st.hp || st.s === 0) break; }
  await sleep(700); await blade(false);
  const a = await J(`({ st: __st(${A}), cash: GS.cash, heap: TLXPL.lot.heap(__lt(${A})), hint: TLXPL.hint(), air: window.__air || 0 })`), t = await toasts();
  console.log("  ", JSON.stringify({ a, t, passes: i + 1, of: us.length })); held = a.st;
  ok(a.st && (a.st.hp === 1 || a.st.s === 0), `after ${i + 1} passes lot is held or clear (hp=${a.st && a.st.hp}, s=${a.st && a.st.s}, hv=${a.st && a.st.hv})`);
  ok(a.cash === c0 || a.st.s === 0, "not paid while held");
});
await section("B swap to the pickup while held: the heap and hold stay", async () => {
  if (!held || !held.hp) { ok(true, "skipped: not held (see A)"); return; }
  await ev(`TLXV.swapTo(${JSON.stringify(uidP)}); FOOT.on = false; true`); await sleep(800);
  const a = await J(`({ st: __st(${A}), heap: TLXPL.lot.heap(__lt(${A})), line: TLXPL.lot.line(), hint: TLXPL.hint() })`);
  console.log("  ", JSON.stringify(a));
  ok(a.st && a.st.hp === 1 && Math.abs(a.st.hv - held.hv) < 0.6, "still held with the same heap after the swap");
  await ev(`TLXV.swapTo(${JSON.stringify(uidT)}); FOOT.on = false; true`); await sleep(800);
});
await section("C blade up mid-lot (lifted), then reload mid-lot, then finish", async () => {
  await ev(`TLXPL.lot.take(${B2}); __storm(3); __hrs(0.5)`); const c1 = await cashNow(), r = SP.r;
  const us = []; for (let u = r - 1; u >= -(r - 1) - 1e-6; u -= 3) us.push(u);
  let half = Math.floor(us.length / 2);
  for (let i = 0; i < half; i++) { await blade(false); await ev(`__lput(${B2}, ${us[i]}, -${r}); __foot()`); await blade(true); await pass("sledpark", us[i], -r, r); }
  await blade(false); const mid = await J(`__st(${B2})`);
  await ev("save(); true"); await reload(); await ev(SETUP); await sleep(500); await ev(KIT);
  const uid2 = await ev(`TLXV.state().owned.find(r => r.id === "plowtruck").uid`); await ev(`TLXV.swapTo(${JSON.stringify(uid2)}); FOOT.on = false; true`); await sleep(700);
  const aft = await J(`__st(${B2})`);
  ok(mid && aft && JSON.stringify(mid.mk) === JSON.stringify(aft.mk) && Math.abs((mid.s||0) - (aft.s||0)) < 0.05, `cut share survives reload (${mid && mid.s} -> ${aft && aft.s})`);
  let st = aft;
  for (let i = half; i < us.length && st && st.s !== 0; i++) { await blade(false); await ev(`__lput(${B2}, ${us[i]}, -${r}); __foot()`); await blade(true); await pass("sledpark", us[i], -r, r); await sleep(500); st = await J(`__st(${B2})`); }
  await blade(false);
  const a = await J(`({ st: __st(${B2}), cash: GS.cash, nan: JSON.stringify(TLX.state("plow")).match(/NaN|null/g) })`), t = await toasts();
  console.log("  ", JSON.stringify({ a, t, c1 }));
  ok(a.st && (a.st.s === 0 || a.st.hp === 1), `finished: clear (n=${a.st.n}) paid +$${a.cash - c1} or held hv=${a.st.hv}`);
});
await ev("window.__tsawI && clearInterval(window.__tsawI); true");
console.log(fails ? "FAILS " + fails : "ALL OK");
await done(fails ? 1 : 0);
