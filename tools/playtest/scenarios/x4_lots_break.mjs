// 4.2c1 lots break test (beta): blade up, on foot, drop/retake exploit, blade removed, old save
import { boot, ev, sleep, done, reload, shot, sideCam } from "../lib.mjs";
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
  window.__lt = id => TLXPL.lot.list().find(c => c.id === id);
  window.__st = id => { const s = TLX.state("plow").lot[id]; return s ? JSON.parse(JSON.stringify(s)) : null; };
  window.__cnt = id => { const s = TLX.state("plow").lot[id]; return s && s.mk ? s.mk.split("1").length - 1 : 0; };
  // a free square of the lot near its middle: [x, z]
  window.__sq = id => { const c = __lt(id); let best = null, bd = 1e9; for (const [k] of c.idx) { const i = Math.floor(k / 1024) - 512, j = k % 1024 - 512, d = Math.abs(Math.hypot(i, j) - c.r * 0.45); if (d < bd) { bd = d; best = [c.x + i, c.z + j]; } } return best; };
  window.__at = (x, z) => { const ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL); return { y: yardAt(x, z), r: restCell(ix, iz), d: depthAt(ix, iz) }; };
  window.__mid = id => { const p = __sq(id); return __at(p[0], p[1]); };
  window.__lput = (id, u, v) => { const c = __lt(id), d = TLXPL.bladeOf(TLXV.state().cur), x = c.x + u, z = c.z + v - d.z;
    BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; crashCancel(); FOOT.on = false; P.x = x; P.z = z; P.yaw = 0; P.vx = P.vy = P.vz = 0; P.y = surf(x, z); return true; };
  window.__foot = () => { const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw); for (let k = -5; k <= 3; k += 0.15) bladeSnow(P.x + fx * k + fz * 1.6, P.z + fz * k - fx * 1.6, P.x + fx * k - fz * 1.6, P.z + fz * k + fx * 1.6, 0.15); P.y = surf(P.x, P.z); return true; };
  // a puppet: one pass across the lot, the blade's middle u metres east of its centre, carried from v0 to v1 (nose always north-to-south axis +z; v1 < v0 = backing)
  window.__lpup = (id, u, v0, v1) => { const dir = v1 >= v0 ? 1 : -1; let v = v0; window.__pupOn = true; window.__seen = []; __lput(id, u, v0); __foot();
    const step = () => { v += dir * 0.12; if ((v - v1) * dir >= 0) { P.vx = P.vz = 0; window.__pupOn = false; return; } const c = __lt(id), d = TLXPL.bladeOf(TLXV.state().cur);
      P.x = c.x + u; P.z = c.z + v - d.z; P.yaw = 0; P.y = surf(P.x, P.z); P.vx = 0; P.vz = 2.5 * dir; if (P.gnd === false) window.__air = (window.__air || 0) + 1;
      const B = TLXPL.rt(TLXV.state().cur); if (B.lot) window.__seen.push(Math.round(B.lot.k * 100)); requestAnimationFrame(step); };
    requestAnimationFrame(step); return true; };
  // every free square of the lot marked by hand (a zero-length edge on each)
  window.__all = (id, share) => { const c = __lt(id); let n = 0; for (const [k] of c.idx) { if (n++ >= c.n * share) break; const i = Math.floor(k / 1024) - 512, j = k % 1024 - 512; if (!TLXPL.lot.mark([c.x + i, c.z + j, c.x + i, c.z + j], true)) break; } return true; };
  window.__hrs = h => { for (let t = 0; t < h - 1e-6; t += 1.5) { GS.hour += Math.min(1.5, h - t); TLX.state("roads").h = GS.hour; TLXPL.lot.step(); } return true; };
  window.__storm = h => { const w = WX.at; WX.at = () => 1; __hrs(h); WX.at = w; return true; };
  window.__cam = id => { const c = __lt(id); window.camOv = cam => { cam.position.set(c.x + c.r * 1.5, surf(c.x, c.z) + c.r * 1.7, c.z - c.r * 1.3); cam.lookAt(c.x, surf(c.x, c.z), c.z); }; return true; };
  return true; })()`;
const blade = dn => ev(`TLXPL.rt(TLXV.state().cur).down = ${dn}; TLXPL.rt(TLXV.state().cur).k = ${dn ? 1 : 0}; TLXPL.rt(TLXV.state().cur).last = null; true`);
const cashNow = () => ev("GS.cash");
const jobs = () => J(`jobsList().filter(r => r.kind === "plowlot").map(r => ({ title: r.title, x: r.tgt.x, z: r.tgt.z, meta: r.meta, pay: r.pay, auto: r.auto }))`);
const truck = async () => { const uid = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`); await ev(`TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(500); return uid; };


await boot();
await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; true`);
const A = `"hosp"`;
await ev(`GS.cash = 40000; TLXV.buy("pickup"); true`); await sleep(500);
const uid = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`);
await ev(`TLX.state("plow").blades[${JSON.stringify(uid)}] = { id: "b23", cond: 100, throw: "r" }; TLXPL.tidy(); true`); await truck();
await ev(`TLXPL.lot.take(${A}); true`);
const c = await J(`({x:__lt(${A}).x,z:__lt(${A}).z,r:__lt(${A}).r,n:__lt(${A}).n})`);
await section("1 blade UP across the lot marks nothing", async () => {
  await ev(`__storm(3)`); await sleep(300);
  await blade(false); await ev(`__lput(${A}, 0, -${c.r}); __foot()`);
  await ev(`__lpup(${A}, 0, -${c.r}, ${c.r})`); for (let i = 0; i < 300 && (await ev("window.__pupOn")); i++) await sleep(100);
  ok((await ev(`__cnt(${A})`)) === 0, "blade up: 0 squares marked");
});
await section("2 foot / no truck: walker in the lot marks nothing; sled with no blade", async () => {
  await ev(`TLXPL.rt(TLXV.state().cur).down = true; FOOT.on = true; FOOT.x = ${c.x}; FOOT.z = ${c.z}; true`); await sleep(1200);
  const m = await ev(`TLXPL.lot.mark([${c.x-3}, ${c.z}, ${c.x+3}, ${c.z}], true)`);
  console.log("  direct mark call while on foot:", JSON.stringify(m));
  await ev(`FOOT.on = false; true`);
});
await section("3 DROP then re-take resets a miss (exploit check)", async () => {
  await ev(`TLX.state("plow").lot.hosp.miss = 1; true`);
  await ev(`TLXPL.lot.drop(${A}); TLXPL.lot.take(${A}); true`);
  const st = await J(`__st(${A})`);
  ok(st && st.miss === 1, "miss survives drop + retake (miss=" + (st && st.miss) + ")");
});
await section("4 drop mid-lot then retake: old marks gone, snow level", async () => {
  await ev(`TLX.state("plow").lot.hosp.s = 0.5; TLX.state("plow").lot.hosp.due = 1; true`);
  await ev(`TLXPL.lot.drop(${A}); TLXPL.lot.take(${A}); true`);
  const st = await J(`__st(${A})`), y = await J(`__mid(${A}).y`);
  ok(st.s === 0 && y > 0.8, "retaken lot is clean and plowed (s=" + st.s + " y=" + y + ")");
});
await section("5 blade removed while the lot is due", async () => {
  await ev(`__storm(3); true`);
  await ev(`TLX.state("plow").blades[${JSON.stringify(uid)}] = null; delete TLX.state("plow").blades[${JSON.stringify(uid)}]; TLXPL.tidy(); true`);
  await ev(`TABLET.toggle(true, "plow"); true`); await sleep(400);
  const t = await ev(`$("tabS").textContent`); await ev(`TABLET.toggle(false); true`);
  ok(!/NaN|undefined/.test(t), "app renders without a blade, lot due");
  const hint = await ev(`TLXPL.hint()`); ok(!/NaN|undefined/.test(String(hint)), "hint ok");
  console.log("  jobs:", JSON.stringify(await jobs()));
});
await section("6 old save: no lot keys", async () => {
  await ev(`delete TLX.state("plow").lot; delete TLX.state("plow").lotOff; delete TLX.state("plow").lotH; TLXPL.tidy(); true`);
  const s = await J(`({lot: TLX.state("plow").lot, off: TLX.state("plow").lotOff})`);
  ok(s.lot && s.off, "tidy rebuilds lot maps");
  await ev(`TABLET.toggle(true, "plow"); true`); await sleep(300); await ev(`TABLET.toggle(false); true`);
});
await done(fails ? 1 : 0);
