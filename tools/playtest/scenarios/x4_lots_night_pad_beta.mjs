// 4.2c1 lots beta 2: pad on the lot cards, night clearing by puppet, reload mid-cut at night, two lots at once
import { boot, ev, sleep, done, reload, shot, sideCam, padSet, padOff } from "../lib.mjs";
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
await ev(`GS.hour = 46; TLX.state("roads").h = 46; true`); // 22:00
const A = `"hosp"`, B = `"sledpark"`;
await ev(`GS.cash = 40000; TLXV.buy("pickup"); true`); await sleep(500);
const uid = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`);
await ev(`TLX.state("plow").blades[${JSON.stringify(uid)}] = { id: "b23", cond: 100, throw: "r" }; TLXPL.tidy(); true`); await truck();
console.log("lot ids", JSON.stringify(await J(`TLXPL.lot.list().map(c => c.id)`)));
await section("1 pad: D-pad to a lot card, A takes it on", async () => {
  await ev(`TABLET.toggle(true, "plow"); true`); await sleep(400);
  let got = null;
  for (let i = 0; i < 14 && !got; i++) {
    await padSet({ 13: 1 }); await sleep(120); await padSet(); await sleep(220);
    const f = await ev(`TABLET.focus`); console.log("   focus", f);
    if (f && /(sledpark|hosp)/.test(f)) got = f;
  }
  console.log("  pad focus reached", got);
  ok(!!got, "D-pad downs reach a lot's TAKE ON button");
  if (got) { await padSet({ 0: 1 }); await sleep(120); await padSet(); await sleep(500);
    const st = await J(`Object.keys(TLX.state("plow").lot).filter(k => TLX.state("plow").lot[k].on !== undefined || true)`);
    const taken = await J(`Object.keys(TLX.state("plow").lot)`);
    console.log("  taken", JSON.stringify(taken), JSON.stringify(st));
    ok(taken.length === 1, "pad A took exactly one lot on (" + taken.length + ")"); }
  console.log("  before B: open", await ev(`TABLET.open`), "focus", await ev(`TABLET.focus`), "app", await ev(`TABLET.app`));
  await padSet({ 1: 1 }); await sleep(150); await padSet(); await sleep(500);
  let o = await ev(`TABLET.open`);
  console.log("  after first B: open", o, "app", await ev(`TABLET.app`), "focus", await ev(`TABLET.focus`));
  if (o) { await padSet({ 1: 1 }); await sleep(150); await padSet(); await sleep(500); console.log("  second B: open", await ev(`TABLET.open`), "app", await ev(`TABLET.app`)); }
  ok(o === false, "pad B closes the tablet from the lot card (first press: open=" + o + ")");
  await padOff();
});
await section("2 take both, storm at night, jobs rows + night hint", async () => {
  await ev(`TLXPL.lot.take(${A}); TLXPL.lot.take(${B}); true`); console.log("  after pad A, lot keys already:", JSON.stringify(await J(`Object.keys(TLX.state("plow").lot)`)));
  await ev(`__storm(3); true`); await sleep(400);
  console.log("  lot states", JSON.stringify(await J(`TLX.state("plow").lot`)));
  const j = await jobs(); console.log("  jobs", JSON.stringify(j));
  ok(j.length === 1 && /2 lots snowed in/.test(j[0].meta) && !/NaN|undefined/.test(JSON.stringify(j)), "two lots snowed in: one merged Jobs row naming both");
  const h = await ev(`TLXPL.hint()`); ok(!/NaN|undefined/.test(String(h)), "hint clean at night: " + h);
});
await section("3 night: puppet passes clear lot A, reload mid-cut keeps squares", async () => {
  const c = await J(`({r:__lt(${A}).r})`); const r = c.r - 1;
  await blade(true);
  await ev(`__lpup(${A}, 0, -${r}, ${r})`); for (let i = 0; i < 300 && (await ev("window.__pupOn")); i++) await sleep(100);
  console.log("  lot file before reload", JSON.stringify(await J(`TLX.state("plow").lot`)));
  const n1 = await ev(`__cnt(${A})`); console.log("  squares after one pass", n1);
  ok(n1 > 5, "night pass marked squares");
  await ev("save(); true"); await reload();
  await sleep(1500); await ev(SETUP); await ev(KIT);
  console.log("  lot file after reload", JSON.stringify(await J(`TLX.state("plow").lot`)), "jobs", JSON.stringify(await jobs()));
  const n2 = await ev(`__cnt(${A})`); console.log("  after reload", n2);
  ok(n2 === n1, "squares kept through reload (" + n1 + " -> " + n2 + ")");
  const nb = await ev(`__cnt(${B})`); ok(nb === 0, "lot B untouched");
});
await section("4 finish lot A with passes, paid once, B stays due", async () => {
  await truck(); await blade(true);
  console.log("  diag", JSON.stringify(await J(`({cur: TLXV.state().cur, owned: TLXV.state().owned.map(o=>o.id+":"+o.uid), blades: TLX.state("plow").blades, foot: FOOT.on, rt: TLXPL.rt(TLXV.state().cur).down, hour: GS.hour})`)));
  const c0 = await ev(`GS.cash`); const r = (await ev(`__lt(${A}).r`)) - 1;
  for (const u of [-r*0.6, -r*0.3, r*0.1, r*0.3, r*0.6, -r*0.8, r*0.8, 0]) {
    await blade(false); await ev(`__lput(${A}, ${u}, -${r}); __foot()`); await blade(true);
    await ev(`__lpup(${A}, ${u}, -${r}, ${r})`); for (let i = 0; i < 300 && (await ev("window.__pupOn")); i++) await sleep(100);
    console.log("   pass u=" + u.toFixed(1), "cnt", await ev(`__cnt(${A})`), "seen max", Math.max(0, ...(await J(`window.__seen`))));
    if ((await J(`__st(${A})`)).s === 0) break;
  }
  const st = await J(`__st(${A})`), dc = (await ev(`GS.cash`)) - c0, jb = await jobs();
  console.log("  ", JSON.stringify({ st, dc, jb: jb.length }));
  ok(st.s === 0 && dc > 0 && dc <= 200, "A cleared and paid once: +$" + dc);
  ok(jb.length === 1, "one Jobs row left (B)");
  const stB = await J(`__st(${B})`); console.log("  stB", JSON.stringify(stB)); ok(stB && stB.s > 0.4, "B still snowed in");
  await blade(false);
});
await done(fails ? 1 : 0);
