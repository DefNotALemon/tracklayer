import { boot, ev, sleep, done, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const S = e => JSON.stringify(e);
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
const KIT = `(() => {
  if (!window.__camHk) { window.__camHk = 1; const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); }; }
  window.__q = k => TLXPL.str.list().find(q => q.key === k);
  window.__e = k => { const e = TLX.state("plow").str[k]; return e ? JSON.parse(JSON.stringify(e)) : null; };
  window.__zs = k => { const q = __q(k); return { over: +TLXPL.str.measure(q).toFixed(3), pend: +q.pend.toFixed(3), e: __e(k), hx: q.hx, hz: q.hz }; };
  window.__pose = (x, z, yaw) => { BOG.on = false; crashCancel(); FOOT.on = false; P.x = x; P.z = z; P.yaw = yaw; P.vx = P.vy = P.vz = 0; P.y = surf(x, z); return true; };
  window.__away = () => { __pose(depot.x, depot.z, 0); TLXPL.str.step(); return true; };
  window.__mid = (a, b) => { const qa = __q(a), qb = __q(b); return { x: qa.ax + qa.ux * qa.L, z: qa.az + qa.uz * qa.L, d: Math.hypot(qa.ax + qa.ux * qa.L - qb.ax, qa.az + qa.uz * qa.L - qb.az) }; };
  window.__heapAt = (x, z, v) => { const p = heapSnow(x, z, 1.0, v, 0.8); TLXPL.str.lay(x, z, 1.0, p); return p; };
  window.__heap = (k, v) => { const q = __q(k); return __heapAt(q.cx, q.cz, v); };
  window.__hrs = h => { for (let t = 0; t < h - 1e-6; t += 1.5) { GS.hour += Math.min(1.5, h - t); TLX.state("roads").h = GS.hour; TLXPL.con.step(); TLXPL.str.step(); } return true; };
  window.__wipe = () => { const s = TLX.state("plow"); s.str = {}; s.strBan = 0; s.strC = 0; for (const q of TLXPL.str.list()) { if (TLXPL.str.measure(q) > 0.01 || q.pend > 0) TLXPL.str.shovel(q); q.pend = 0; q.over = 0; } return true; };
  window.__all = () => Object.keys(TLX.state("plow").str);
  window.__cam = (x, z, ux, uz) => { window.camOv = cam => { cam.position.set(x - ux * 13 + uz * 5, surf(x, z) + 7, z - uz * 13 - ux * 5); cam.lookAt(x, surf(x, z) + 0.3, z); }; return true; };
  return true; })()`;
const jobs = () => J(`jobsList().filter(r => r.kind === "plowstr").map(r => ({ title: r.title, x: r.tgt.x, z: r.tgt.z }))`);

await boot();
await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 46; TLX.state("roads").h = 46; true`);
const ST = await J("TLXPL.str.STR"), BLOCK = ST.block, CLEAR = ST.clear;
const Z = await J(`TLXPL.str.list().map(q => ({ key: q.key, name: q.name, L: q.L, t0: q.t0, t1: q.t1, nb: q.nb.map(n => n.key) }))`);
await ev(`GS.cash = 40000; TLXV.buy("pickup"); true`); await sleep(500);
const uid = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`);
await ev(`TLX.state("plow").blades[${S(uid)}] = { id: "b23", cond: 100, throw: "s" }; TLXPL.tidy(); TLXV.swapTo(${S(uid)}); FOOT.on = false; true`); await sleep(600);
const tri = await J(`(() => { const L = TLXPL.str.list(), free = q => { if (Math.hypot(q.cx - depot.x, q.cz - depot.z) < 58) return false;
  for (let s = -q.L / 2 - 2; s <= q.L / 2 + 2; s += 1) for (const l of [-1.2, 0, 1.2]) { const x = q.cx + q.ux * s - q.uz * l, z = q.cz + q.uz * s + q.ux * l; if (isSea(x, z) || obNear(x, z, 1.3) || yardAt(x, z) < 0.7) return false; } return true; };
  for (const a of L) { const b = a.nb.find(n => n.t0 < 0 && n.ax !== a.ax && Math.hypot(n.ax - (a.ax + a.ux * a.L), n.az - (a.az + a.uz * a.L)) < 0.01); if (!b) continue; const c = b.nb.find(n => n !== a); if (c && free(a) && free(b) && free(c)) return [a.key, b.key, c.key]; } return null; })()`);
if (!tri) { ok(false, "no three free neighbour lengths in a row"); await done(1); }
const [a, b, c] = tri.map(S);
console.log("// beta break of the street-join fix: street end, just outside the join window, strikes at the join, 2 trucks off");
await section("A heap at a street's first end", async () => {
  await ev(`__wipe()`);
  const f = await J(`(() => { const q = __q(${a}); return { x: q.ax, z: q.az }; })()`);
  await ev(`__pose(${f.x} + 3, ${f.z} + 3, 0); __heapAt(${f.x}, ${f.z}, 1.0); __away(); true`); await sleep(400);
  const r = await J(`({ str: __all(), a: __zs(${a}) })`);
  console.log("  end", S(r));
  ok(r.str.length <= 1, "street end: at most one complaint " + S(r.str));
  ok(r.str.length === 1, "street end: a 1 m3 heap at the very end is a complaint (not lost off the street's end)");
});
await section("B heap just outside the join window", async () => {
  await ev(`__wipe()`);
  const m = await J(`__mid(${a}, ${b})`);
  const out = ST.join + 1.0, q = await J(`({ ux: __q(${a}).ux, uz: __q(${a}).uz })`);
  const x = m.x - q.ux * out, z = m.z - q.uz * out;
  await ev(`__pose(${x} + 3, ${z} + 3, 0); __heapAt(${x}, ${z}, 1.2); __away(); true`); await sleep(400);
  const r = await J(`({ str: __all(), a: __zs(${a}), b: __zs(${b}) })`);
  console.log("  outside", S({ str: r.str, a: r.a.over, b: r.b.over }));
  ok(r.str.length === 1 && r.str[0] === tri[0], "outside the window: only a's complaint " + S(r.str));
  ok(r.b.over < CLEAR, "b measures none of it " + r.b.over);
});
await section("C a boundary heap left too long: one strike, not two", async () => {
  await ev(`__wipe()`);
  const m = await J(`__mid(${a}, ${b})`);
  const s0 = await J(`({ c: TLX.state("plow").strC, n: TLX.state("plow").strN, ban: TLX.state("plow").strBan })`);
  await ev(`__pose(${m.x} + 3, ${m.z} + 3, 0); __heapAt(${m.x}, ${m.z}, 2.5); __away(); true`); await sleep(300);
  await ev(`__hrs(14)`); await sleep(400);
  const s1 = await J(`({ str: __all(), c: TLX.state("plow").strC, n: TLX.state("plow").strN, ban: TLX.state("plow").strBan, a: __zs(${a}), b: __zs(${b}) })`);
  console.log("  14h", S(s0), S(s1));
  ok(s1.c - s0.c <= 1, "kommune clears once for it, strikes +" + (s1.c - s0.c));
  ok(s1.a.over < CLEAR && s1.b.over < CLEAR, "all gone both sides " + s1.a.over + "/" + s1.b.over);
});
await section("D two blade notes splitting one heap across the join, option off between", async () => {
  await ev(`__wipe()`);
  const m = await J(`__mid(${a}, ${b})`);
  await ev(`__pose(${m.x} + 3, ${m.z} + 3, 0); const p = heapSnow(${m.x}, ${m.z}, 1.0, 1.2, 0.8); __q(${a}).pend += p / 2; TLX.setOn("plowstreets", false); TLXPL.str.step(); TLX.setOn("plowstreets", true); __q(${b}).pend += p / 2; __away(); true`); await sleep(400);
  const r = await J(`({ str: __all(), jobs: jobsList().filter(r => r.kind === "plowstr").length, pa: __q(${a}).pend, pb: __q(${b}).pend })`);
  console.log("  split", S(r));
  ok(r.str.length <= 1 && r.jobs === r.str.length, "never two complaints for one heap / jobs match " + S(r));
  await ev(`TABLET.toggle(true, "plow"); true`); await sleep(450); const txt = await ev(`$("tabS").textContent`); await ev(`TABLET.toggle(false); true`);
  ok(!/NaN|undefined/.test(txt), "plow app text clean");
});
console.log(fails ? `FAILED ${fails}` : "all ok");
await done(fails ? 1 : 0);
