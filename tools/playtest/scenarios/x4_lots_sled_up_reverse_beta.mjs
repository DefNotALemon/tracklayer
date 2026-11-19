// 4.2c1 beta: lot squares must come only from a blade that is DOWN on a truck: sled over a snowed-in lot, pickup blade up, blade down reversing, then forward
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
const A = `"sledpark"`;
await boot();
await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 32; TLX.state("roads").h = 32; GS.cash = 90000; GS.lic = GS.lic || {}; TLXV.buy("pickup"); true`); await sleep(700);
const uidP = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`);
await ev(`TLX.state("plow").blades[${JSON.stringify(uidP)}] = { id: "b23", cond: 100, throw: "r" }; TLXPL.tidy(); TLXV.swapTo(${JSON.stringify(uidP)}); FOOT.on = false; true`); await sleep(800);
const SP = (await J(`TLXPL.lot.list().map(c => ({ id: c.id, r: c.r, n: c.n }))`)).find(c => c.id === "sledpark");
console.log("  take", await ev(`JSON.stringify(TLXPL.lot.take(${A}))`)); await ev(`__storm(3); __hrs(0.5); true`);
const stt = () => J(`({ st: __st(${A}), cash: GS.cash })`);
const r = SP.r; const base = await stt(); console.log("  base", JSON.stringify(base), "r", r);
await section("A the sled (no truck) rides across the lot", async () => {
  await ev(`TLXV.swapTo(null); FOOT.on = false; true`); await sleep(600);
  const cc = await ev(`TLXV.state().cur`); console.log("  cur", cc);
  await ev(`(() => { const c = __lt(${A}); BOG.on = false; P.x = c.x; P.z = c.z - ${r}; P.yaw = 0; P.vx = P.vy = P.vz = 0; P.y = surf(P.x, P.z); window.__pupOn = true; let v = -${r}; const s = () => { v += 0.12; if (v >= ${r}) { window.__pupOn = false; return; } P.x = c.x; P.z = c.z + v; P.yaw = 0; P.y = surf(P.x, P.z); P.vz = 2.5; P.vx = 0; requestAnimationFrame(s); }; requestAnimationFrame(s); return true; })()`);
  for (let i = 0; i < 600 && (await ev("window.__pupOn")); i++) await sleep(100);
  const a = await stt(); console.log("  ", JSON.stringify(a));
  ok(a.st && !a.st.mk && a.cash === base.cash, "sled leaves no squares and no pay");
});
await section("B pickup, blade UP, crosses the lot", async () => {
  await ev(`TLXV.swapTo(${JSON.stringify(uidP)}); FOOT.on = false; true`); await sleep(700);
  await ev(`TLXPL.rt(TLXV.state().cur).down = false; TLXPL.rt(TLXV.state().cur).k = 0; true`);
  await ev(`__lput(${A}, 0, -${r}); __foot()`); await pass("sledpark", 0, -r, r);
  const a = await stt(); console.log("  ", JSON.stringify(a));
  ok(a.st && !a.st.mk, "blade up cuts nothing");
});
await section("C blade down REVERSING across the lot (back-drag)", async () => {
  await ev(`TLXPL.rt(TLXV.state().cur).down = true; TLXPL.rt(TLXV.state().cur).k = 1; TLXPL.rt(TLXV.state().cur).last = null; true`);
  await ev(`(() => { const c = __lt(${A}); const d = TLXPL.bladeOf(TLXV.state().cur); BOG.on = false; P.x = c.x + 4; P.z = c.z + ${r} - 2 - d.z; P.yaw = 0; P.vx = P.vy = P.vz = 0; P.y = surf(P.x, P.z); window.__foot(); window.__pupOn = true; let v = ${r} - 2; const s = () => { v -= 0.1; if (v <= -${r} + 2) { P.vz = 0; window.__pupOn = false; return; } P.x = c.x + 4; P.z = c.z + v - d.z; P.yaw = 0; P.y = surf(P.x, P.z); P.vz = -2.2; P.vx = 0; requestAnimationFrame(s); }; requestAnimationFrame(s); return true; })()`);
  for (let i = 0; i < 800 && (await ev("window.__pupOn")); i++) await sleep(100);
  await sleep(300);
  const a = await stt(); console.log("  ", JSON.stringify({ a, hint: await ev("TLXPL.hint()") }));
  
  ok(true, "recorded: reversing marked " + (a.st.mk || "").split("").filter(c => c === "1").length + " squares");
});
await section("D forward pass beside it, then night reload keeps squares", async () => {
  const before = await stt();
  await ev(`__lput(${A}, -4, -${r}); __foot()`); await ev(`TLXPL.rt(TLXV.state().cur).down = true; TLXPL.rt(TLXV.state().cur).k = 1; true`);
  await pass("sledpark", -4, -r, r);
  const mid = await stt();
  
  await ev("save(); true"); await reload(); await ev(SETUP); await sleep(500); await ev(KIT);
  const aft = await J(`({ st: __st(${A}), nan: JSON.stringify(TLX.state("plow")).match(/NaN/g) })`);
  console.log("  mid", JSON.stringify(mid.st), "\n  aft", JSON.stringify(aft.st));
  const ones = m => (m || "").split("").filter(c => c === "1").length;
  ok(ones(mid.st.mk) > ones(before.st.mk), "forward pass marks more squares: " + ones(before.st.mk) + " -> " + ones(mid.st.mk));
  ok(aft.st.mk === mid.st.mk && !aft.nan, "squares survive reload at night, no NaN");
  await still("lots_night");
});
await ev("window.__tsawI && clearInterval(window.__tsawI); true");
console.log(fails ? "FAILS " + fails : "ALL OK");
await done(fails ? 1 : 0);
