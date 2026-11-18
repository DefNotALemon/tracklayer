// Beta fix 0263 #1 / #2 (4.2c2b street heaps): a heap on the line between two lengths of a street is ONE complaint (it
// used to be half in each and a heap in neither), the kommune's truck clears all of it, a heap in the middle of a length
// is still only that length's, two heaps are two, and the option switched off and on again counts a standing heap again.
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
// a run of three free neighbour lengths on one street, away from the depot
const tri = await J(`(() => { const L = TLXPL.str.list(), free = q => { if (Math.hypot(q.cx - depot.x, q.cz - depot.z) < 58) return false;
  for (let s = -q.L / 2 - 2; s <= q.L / 2 + 2; s += 1) for (const l of [-1.2, 0, 1.2]) { const x = q.cx + q.ux * s - q.uz * l, z = q.cz + q.uz * s + q.ux * l; if (isSea(x, z) || obNear(x, z, 1.3) || yardAt(x, z) < 0.7) return false; } return true; };
  for (const a of L) { const b = a.nb.find(n => n.t0 < 0 && n.ax !== a.ax && Math.hypot(n.ax - (a.ax + a.ux * a.L), n.az - (a.az + a.uz * a.L)) < 0.01); if (!b) continue; const c = b.nb.find(n => n !== a); if (c && free(a) && free(b) && free(c)) return [a.key, b.key, c.key]; } return null; })()`);
console.log("lengths", Z.length, "three in a row", S(tri));
if (!tri) { ok(false, "no three free neighbour lengths in a row"); await done(1); }
const [a, b, c] = tri.map(S);

await section("A the lengths", async () => {
  const by = {}; for (const q of Z) (by[q.key.split(":")[0]] = by[q.key.split(":")[0]] || []).push(q);
  let ends = true, mids = true, nbs = true;
  for (const k of Object.keys(by)) { const r = by[k]; if (r[0].t0 !== 0 || Math.abs(r[r.length - 1].t1 - r[r.length - 1].L) > 1e-9) ends = false;
    r.forEach((q, i) => { if (i > 0 && !(q.t0 < -1 && q.t0 >= -ST.join)) mids = false; if (i < r.length - 1 && !(q.t1 - q.L > 1 && q.t1 - q.L <= ST.join)) mids = false; if (q.nb.length !== (i > 0 ? 1 : 0) + (i < r.length - 1 ? 1 : 0)) nbs = false; }); }
  ok(ends, "a street's first and last length measure nothing past the street's end");
  ok(mids, `every other edge reaches ${ST.join} m into its neighbour`);
  ok(nbs, "each length knows its neighbours on its own street only");
  const fresh = await J(`TLXPL.str.list().filter(q => TLXPL.str.measure(q) > 0.001).length`);
  ok(fresh === 0, "fresh game: nothing stands in any length (wider windows): " + fresh);
  await ev(`TLX.setOn("plowstreets", false); TLXPL.str.step(); TLX.setOn("plowstreets", true); TLXPL.str.step(); __away(); true`); await sleep(300);
  const n = await J(`({ str: __all().length, pend: TLXPL.str.list().filter(q => q.pend > 0).length })`);
  ok(n.str === 0 && n.pend === 0, "option off and on with clean streets: no complaint, nothing pending " + S(n));
});
await section("B 1.0 m3 on the line between two lengths", async () => {
  const m = await J(`__mid(${a}, ${b})`);
  ok(m.d < 0.01, "the two lengths share a boundary");
  await ev(`__pose(${m.x} + 3, ${m.z} + 3, 0); __heapAt(${m.x}, ${m.z}, 1.0); TLXPL.str.step(); true`); await sleep(400);
  const near = await J(`({ str: __all(), a: __zs(${a}), b: __zs(${b}), hint: TLXPL.str.line() })`);
  console.log("  beside it", S({ a: near.a.over, b: near.b.over, pa: near.a.pend, pb: near.b.pend, hint: near.hint }));
  ok(near.str.length === 0, "beside the heap: no complaint yet");
  ok(near.a.over >= BLOCK && near.b.over >= BLOCK, `the heap is whole in both lengths' measure (${near.a.over} / ${near.b.over} m3; it was 0.44 / 0.52)`);
  ok(/push it off the street/.test(near.hint), "beside it the riding hint says so: " + near.hint);
  await ev(`__cam(${m.x}, ${m.z}, __q(${a}).ux, __q(${a}).uz)`); await sleep(500); if (!process.env.NOSTILLS) await shot("b1_heap_on_the_line"); await ev("window.camOv = null; true");
  await ev(`__away()`); await sleep(500);
  const r = await J(`({ str: __all(), ea: __e(${a}), eb: __e(${b}) })`), jb = await jobs();
  console.log("  driven on", S(r));
  const e = r.ea || r.eb;
  ok(r.str.length === 1 && !!e, "driven on: ONE complaint for it (not none, not two): " + S(r.str));
  ok(e && e.v >= 0.8, "the complaint holds the whole heap: " + (e && e.v) + " m3");
  ok(e && Math.hypot(e.x - m.x, e.z - m.z) < 1, "and stands where the heap is (on the line)");
  ok(jb.length === 1 && Math.hypot(jb[0].x - m.x, jb[0].z - m.z) < 1.2, "one Jobs row, pointing at the heap " + S(jb));
  await ev(`__hrs(2.2)`); await sleep(400);
  const g = await J(`({ str: __all(), a: __zs(${a}), b: __zs(${b}), c: TLX.state("plow").strC, n: TLX.state("plow").strN })`);
  console.log("  after the kommune's truck", S({ a: g.a.over, b: g.b.over, c: g.c, n: g.n }));
  ok(g.str.length === 0 && g.c === 1 && g.n === 1, "2 h on: the kommune's truck came once, for one heap");
  ok(g.a.over < CLEAR && g.b.over < CLEAR, `and took all of it, both sides of the line (${g.a.over} / ${g.b.over} m3 left)`);
  ok((await jobs()).length === 0, "no Jobs row left");
});
await section("C the blade's note in both lengths: still one", async () => {
  await ev(`__wipe()`);
  const m = await J(`__mid(${a}, ${b})`);
  await ev(`__pose(${m.x} + 3, ${m.z} + 3, 0); const p = heapSnow(${m.x}, ${m.z}, 1.0, 1.2, 0.8); __q(${a}).pend += p / 2; __q(${b}).pend += p / 2; __away(); true`); await sleep(400);
  const r = await J(`({ str: __all(), pa: __q(${a}).pend, pb: __q(${b}).pend })`), jb = await jobs();
  ok(r.str.length === 1 && jb.length === 1, "noted in both lengths: one complaint, one Jobs row " + S(r));
  ok(r.pa === 0 && r.pb === 0, "nothing left pending in the other");
  await ev(`TLXPL.str.step(); __hrs(0.5); true`);
  ok((await J("__all()")).length === 1, "half an hour on: still one");
});
await section("D a heap in the middle of a length is that length's only", async () => {
  await ev(`__wipe(); __pose(__q(${b}).cx + 3, __q(${b}).cz + 3, 0); __heap(${b}, 1.5); __away(); true`); await sleep(400);
  const r = await J(`({ str: __all(), a: __zs(${a}), b: __zs(${b}), c: __zs(${c}) })`);
  console.log("  ", S({ a: r.a.over, b: r.b.over, c: r.c.over }));
  ok(r.str.length === 1 && r.str[0] === tri[1], "one complaint, the middle length's");
  ok(r.a.over < CLEAR && r.c.over < CLEAR, `the neighbours measure none of it (${r.a.over} / ${r.c.over} m3)`);
});
await section("E two heaps in two lengths are two", async () => {
  await ev(`__pose(__q(${c}).cx + 3, __q(${c}).cz + 3, 0); __heap(${c}, 1.5); __away(); true`); await sleep(400);
  const r = await J(`__all()`);
  ok(r.length === 2 && r.includes(tri[1]) && r.includes(tri[2]), "two complaints: " + S(r));
});
await section("F the option off, then on again, with the heaps standing", async () => {
  await ev(`TLX.setOn("plowstreets", false); TLXPL.str.step(); true`); await sleep(300);
  const off = await J(`({ str: __all(), jobs: jobsList().filter(r => r.kind === "plowstr").length })`);
  ok(off.str.length === 0 && off.jobs === 0, "off: the complaints are dropped");
  await ev(`__hrs(1); __pose(__q(${b}).cx + 2.5, __q(${b}).cz + 2.5, 0); TLX.setOn("plowstreets", true); TLXPL.str.step(); true`); await sleep(400);
  const on = await J(`({ str: __all(), pend: TLXPL.str.list().filter(q => q.pend > 0).map(q => q.key), hint: TLXPL.str.line() })`);
  console.log("  on again, beside one", S(on));
  ok(on.pend.includes(tri[1]) && on.str.includes(tri[2]), "on again: the heap beside you is noted (the hint), the one further off is a complaint again");
  ok(/push it off the street/.test(on.hint), "the hint beside it: " + on.hint);
  await ev(`__away()`); await sleep(400);
  const r = await J(`({ str: __all(), e: __e(${b}), c: TLX.state("plow").strC })`), jb = await jobs();
  ok(r.str.length === 2 && r.e && r.e.h < 0.05, "driven on: both are complaints again, the clock from 0 " + S(r.str));
  ok(jb.length === 1, "the Jobs row is back");
  await ev(`TABLET.toggle(true, "plow"); true`); await sleep(450); const txt = await ev(`$("tabS").textContent`); await ev(`TABLET.toggle(false); true`);
  ok(/2 heaps of yours standing in a street/.test(txt) && !/NaN|undefined/.test(txt), "the Plow app lists both");
});
await section("G a save with a complaint for a heap on the line", async () => {
  await ev(`__wipe()`);
  const m = await J(`__mid(${a}, ${b})`);
  await ev(`__pose(${m.x} + 3, ${m.z} + 3, 0); __heapAt(${m.x}, ${m.z}, 1.0); __away(); true`); await sleep(300);
  const k = (await J("__all()"))[0];
  // cells are not saved: shovel it, mark it for relay as a reload does, come back within sight
  await ev(`(() => { const q = __q(${S(k)}), e = TLX.state("plow").str[${S(k)}]; TLXPL.str.shovel(q); q.relay = true; q.hx = e.x; q.hz = e.z; __pose(${m.x} + 20, ${m.z}, 0); TLXPL.str.step(); return true; })()`); await sleep(300);
  const r = await J(`({ str: __all(), e: __e(${S(k)}) })`);
  ok(r.str.length === 1 && r.e && r.e.v >= BLOCK, "the heap is laid again on the line and stays one complaint of " + (r.e && r.e.v) + " m3");
});
console.log(fails ? `FAILED ${fails}` : "all ok");
await done(fails ? 1 : 0);
