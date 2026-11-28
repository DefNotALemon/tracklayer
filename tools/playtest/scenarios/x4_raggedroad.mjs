// Beta 0296 #1 (4.1b2a x 4.1a2): a RAGGED cutting edge on the road credit, DRIVEN by keys (W and steering, the truck's own
// physics), not carried by a puppet. Asserts, exit 1 on a failure.
//   A setup: a pickup with the Fjellskjær 2.3, a straight 400 m stretch of a road with no convoy, snowed in (LEVEL, 0.6).
//   B edge at EDGE (default 10: ragged from the start): driven up the right-hand side. The truck is on its wheels, the
//     side is 80%+ marked, the stretch still shut, and the lane behind the blade holds about TWICE a good edge's snow
//     (0.3 of the pack, not 0.15 and not "almost uncut"); the hint names the worn edge.
//   C driven back down the other side: the stretch opens, one line names the road.
//   D edge at 31 (good, wears under 30 within the stretch): the "worn ragged" line is said once on the way, the pass
//     still marks its side, and coming back opens the stretch.
// Headless runs ~0.6x: all by gameClock. ONLY=BCD runs some sections (A always). The whole file is about 10 minutes of
// wall time (four 400 m passes at plowing speed): run it as ONLY=BC and ONLY=D.
import { boot, ev, sleep, done, down, up } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(120); }
const ONLY = process.env.ONLY, LEVEL = +(process.env.LEVEL || 0.6), EDGE = +(process.env.EDGE || 10);
const section = async (n, f) => { if (ONLY && n[0] !== "A" && !ONLY.includes(n[0])) return; console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80); return true; })()`);

const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 9000; WX.at = () => 0; GS.storm = 0; GS.hour = 12; TLXR.ROADS.plowAt = 2; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
const KIT = `(() => {
  window.__rt = id => TLXR.routes.find(r => r.id === id);
  window.__lane = (id, s, dir, off) => { const r = __rt(id), c = r.cum, p = r.pts; s = Math.max(0, Math.min(r.len - 0.01, s)); let i = 1; while (i < c.length - 1 && c[i] < s) i++;
    const a = p[i - 1], b = p[i], L = c[i] - c[i - 1] || 1, t = (s - c[i - 1]) / L, tx = (b[0] - a[0]) / L * dir, tz = (b[1] - a[1]) / L * dir;
    return { x: a[0] + (b[0] - a[0]) * t - tz * off, z: a[1] + (b[1] - a[1]) * t + tx * off, yaw: Math.atan2(tx, tz) }; };
  window.__put = (id, s, dir, off) => { const q = __lane(id, s, dir, off); BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; crashCancel(); FOOT.on = false; P.x = q.x; P.z = q.z; P.yaw = q.yaw; P.vx = P.vy = P.vz = 0; P.y = surf(q.x, q.z); recenter(q.x, q.z, true); camState.init = false; const B = TLXPL.rt(TLXV.state().cur); B.last = null; B.carry = 0; B.full = false; return true; };
  window.__steer = (id, dir, off, ahead) => { const n = TLXR.near(P.x, P.z), t = __lane(id, n.s + dir * ahead, dir, off); let e = Math.atan2(t.x - P.x, t.z - P.z) - P.yaw; while (e > Math.PI) e -= 2 * Math.PI; while (e < -Math.PI) e += 2 * Math.PI;
    CRASH.cool = 1; return { e, s: n.s, d: n.d, v: Math.hypot(P.vx, P.vz), bog: BOG.on, why: TLXV.rt().why || "" }; };
  window.__air = { n: 0, a: 0 };
  if (!window.__airOn) { window.__airOn = true; const f = () => { const u = TLXV.state().cur, B = u != null && TLXPL.rt(u); if (B && B.down && !FOOT.on && Math.hypot(P.vx, P.vz) > 0.3) { __air.n++; if (P.gnd === false) __air.a++; } requestAnimationFrame(f); }; requestAnimationFrame(f); }
  window.__rc = (id, i) => { const c = TLXPL.road.get(id + ":" + i); return c ? { n: c.n, c: [c.c[0], c.c[1]], s0: c.s0 } : null; };
  // d / f of the cells across the road at s m along: off m to the right of the way up the route
  window.__across = (id, s) => { const o = []; for (let off = -2.8; off <= 2.81; off += 0.35) { const q = __lane(id, s, 1, off), ix = Math.round((q.x + HALF) / CELL), iz = Math.round((q.z + HALF) / CELL), d = depthAt(ix, iz), f = freshAt(ix, iz); o.push(+(d / Math.max(0.01, f)).toFixed(2)); } return o; };
  return true; })()`;
const blade = dn => ev(`TLXPL.rt(TLXV.state().cur).down = ${dn}; TLXPL.rt(TLXV.state().cur).last = null; true`);

await boot();
await ev(SETUP); await sleep(600); await ev(KIT);

let uid = null, RD = null;
await section("A setup", async () => {
  await ev(`TLXV.buy("pickup"); true`); await sleep(300);
  uid = await ev(`TLXV.state().owned[0].uid`);
  await ev(`(() => { TLX.state("plow").blades[${JSON.stringify(uid)}] = { id: "b23", cond: 100 }; TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; return true; })()`); await sleep(600);
  ok(await ev(`!!VEH.cur && !FOOT.on && TLXV.state().cur === ${JSON.stringify(uid)} && !!TLXPL.bladeOf(${JSON.stringify(uid)})`), "seated in the pickup, the blade fitted");
  RD = await J(`(() => { const SEG = TLXR.ROADS.seg, out = [];
    for (const def of TLXR.ROADS.routes) { if (def.convoy || def.closed) continue; const r = __rt(def.id); if (!r || !r.st) continue;
      for (let i = 1; i < r.seg.length - 1; i++) { if (!r.seg[i - 1].legs.length || !r.seg[i].legs.length || !r.seg[i + 1].legs.length || (i + 1) * SEG + 40 > r.len) continue;
        let turn = 0, y0 = null, bad = false; for (let s = i * SEG - 40; s <= (i + 1) * SEG + 40; s += 8) { const q = __lane(def.id, s, 1, 0); if (y0 !== null) { let e = q.yaw - y0; while (e > Math.PI) e -= 2 * Math.PI; while (e < -Math.PI) e += 2 * Math.PI; turn = Math.max(turn, Math.abs(e)); } y0 = q.yaw; const n = TLXR.near(q.x, q.z); if (n.route !== r || Math.abs(n.s - s) > 3) bad = true; }
        if (!bad) out.push({ id: def.id, name: r.name, i, turn: +turn.toFixed(3), len: Math.round(r.len) }); } }
    out.sort((a, b) => a.turn - b.turn); const a = out[0], k = out.find(o => o.id !== a.id || Math.abs(o.i - a.i) >= 3); return { a, k }; })()`);
  console.log("  stretch", JSON.stringify(RD));
  ok(RD && RD.a && RD.k, "a straight stretch for the ragged edge and a second one for the edge that wears out on the way");
});
if (!uid || !RD || !RD.a || !RD.k) await done(1);
const SEG = 400;
const setEdge = c => ev(`TLX.state("plow").blades[${JSON.stringify(uid)}].cond = ${c}; true`);
const edge = () => ev(`TLX.state("plow").blades[${JSON.stringify(uid)}].cond`);

// the driver: W held (eased to 8 m/s), A / D by the lane point 12 m ahead, until stop(s) or secs of game time
async function drive(id, dir, off, secs, stop) {
  const t0 = await clock(); let steerKey = null, gas = false, last = null, maxD = 0, vs = [], still = 0, n = 0;
  try {
    while ((await clock()) - t0 < secs) {
      const s = last = await J(`__steer(${JSON.stringify(id)}, ${dir}, ${off}, 12)`); n++;
      maxD = Math.max(maxD, s.d); vs.push(s.v);
      const wantGas = s.v < 8; if (wantGas !== gas) { if (wantGas) await down("KeyW"); else await up("KeyW"); gas = wantGas; }
      const want = s.e > 0.05 ? "KeyA" : s.e < -0.05 ? "KeyD" : null;
      if (want !== steerKey) { if (steerKey) await up(steerKey); if (want) await down(want); steerKey = want; }
      if (await stop(s)) break;
      still = s.v < 0.3 && n > 30 ? still + 1 : 0; if (still > 60) break;
      await sleep(90);
    }
  } finally { if (steerKey) await up(steerKey); await up("KeyW"); }
  return { t: +((await clock()) - t0).toFixed(1), s: Math.round(last.s), v: +(vs.reduce((a, b) => a + b, 0) / Math.max(1, vs.length)).toFixed(1), maxD: +maxD.toFixed(1), bog: last.bog, why: last.why, stopped: still > 60 };
}
const stat = (R) => J(`({ rc: __rc(${JSON.stringify(R.id)}, ${R.i}), sn: __rt(${JSON.stringify(R.id)}).st.s[${R.i}], st: TLXR.status(${JSON.stringify(R.id)}), opened: TLX.state("plow").opened })`);
// out along the right-hand side of stretch R, from the cleared stretch before it
async function out(R, tag) {
  const id = JSON.stringify(R.id);
  await ev(`TLXPL.road.clear(); TLXR.setSnow(${id}, ${LEVEL}, ${R.i}); true`);
  await ev(`__put(${id}, ${R.i * SEG - 30}, 1, 1.5); true`); await waitGame(1.0);
  await blade(true); await clearToasts(); await ev(`__air.n = __air.a = 0; true`);
  const r = await drive(R.id, 1, 1.5, 220, async s => s.s > (R.i + 1) * SEG + 14);
  const hint = await ev(`TLXPL.hint()`), a = await stat(R), air = await J(`__air`), t = await toasts();
  const acr = await J(`[80, 160, 240, 320].map(m => __across(${id}, ${R.i * SEG} + m))`);
  console.log(`  ${tag} out`, JSON.stringify(r), JSON.stringify(a), "air", JSON.stringify(air), "edge", (+(await edge())).toFixed(1));
  console.log("  hint:", hint); console.log("  toasts:", JSON.stringify(t));
  for (const row of acr) console.log("  d/f across (left 2.8 m .. right 2.8 m, 0.35 m apart):", JSON.stringify(row));
  return { r, a, air, t, hint, acr };
}
async function back(R, tag) {
  const id = JSON.stringify(R.id);
  await ev(`__put(${id}, ${(R.i + 1) * SEG + 30}, -1, 1.5); true`); await blade(true); await waitGame(1.0); await clearToasts(); await ev(`__air.n = __air.a = 0; true`);
  let openedAt = null;
  const r = await drive(R.id, -1, 1.5, 220, async s => { if (openedAt === null && (await ev(`__rt(${id}).st.s[${R.i}]`)) === 0) openedAt = s.s; return openedAt !== null || s.s < R.i * SEG - 14; });
  await sleep(300);
  const a = await stat(R), t = await toasts(), air = await J(`__air`);
  console.log(`  ${tag} back`, JSON.stringify(r), "opened at", openedAt, JSON.stringify(a), "air", JSON.stringify(air)); console.log("  toasts:", JSON.stringify(t));
  await blade(false);
  return { r, a, t, air, openedAt };
}
// the middle of the cut lane: the cells 1.05 to 1.75 m right of the line (between the wheels' own ruts), at four places along
const laneMid = acr => { const v = acr.flatMap(row => row.slice(11, 14)); return v.reduce((x, y) => x + y, 0) / v.length; };

let o1 = null;
await section("B ragged from the start, driven out", async () => {
  await setEdge(EDGE);
  const A = RD.a, o = o1 = await out(A, "ragged");
  ok(o.air.n > 200 && o.air.a <= 0.05 * o.air.n, "a DRIVEN truck with a ragged edge is on its wheels while it plows: " + o.air.a + " of " + o.air.n + " frames in the air");
  ok(!o.r.stopped && !o.r.bog && o.r.s > (A.i + 1) * SEG, `it plows the whole 400 m: to ${o.r.s} m along in ${o.r.t} game s at a mean ${o.r.v} m/s`);
  ok(o.a.rc && Math.max(...o.a.rc.c) >= 0.8 * o.a.rc.n, "its side has 80% or more of its lengths marked: " + JSON.stringify(o.a.rc));
  ok(Math.abs(o.a.sn - LEVEL) < 0.01 && o.a.st === "snowed in" && o.a.opened === 0, "one pass leaves the stretch shut");
  const m = laneMid(o.acr);
  ok(m > 0.24 && m < 0.36, `the lane behind a ragged blade holds twice a good edge's snow: ${m.toFixed(2)} of the pack (a good edge 0.15, uncut 1)`);
  ok(/worn edge, a ragged cut/.test(o.hint), "the hint names the worn edge: " + JSON.stringify(o.hint));
});
await section("C ragged, driven back: the stretch opens", async () => {
  if (!o1 || !o1.a.rc) { ok(false, "section B left no marks to finish"); return; }
  const A = RD.a, b = await back(A, "ragged");
  ok(b.air.a <= 0.05 * Math.max(1, b.air.n), "on its wheels on the way back: " + b.air.a + " of " + b.air.n);
  ok(b.openedAt !== null && b.a.sn === 0 && b.a.opened === 1, "coming back down the other side on a ragged edge opens it: snow " + b.a.sn + ", opened " + b.a.opened);
  const mine = b.t.filter(m => m.includes(A.name));
  ok(mine.length === 1 && /is open again: your blade cleared km/.test(mine[0]), "one line names the road: " + JSON.stringify(mine));
});
await section("D a good edge that wears ragged on the way", async () => {
  const K = RD.k, n0 = await ev(`TLX.state("plow").opened`);
  await setEdge(30.6);
  const o = await out(K, "wearing");
  const e1 = +(await edge());
  ok(e1 < 30, "the edge went under 30 within the stretch (30.6 -> " + e1.toFixed(1) + ")");
  ok(o.t.filter(m => /worn ragged/.test(m)).length === 1, "the worn-ragged line is said once: " + JSON.stringify(o.t));
  ok(o.a.rc && Math.max(...o.a.rc.c) >= 0.8 * o.a.rc.n, "the pass still marks its side: " + JSON.stringify(o.a.rc));
  const b = await back(K, "wearing");
  ok(b.openedAt !== null && b.a.sn === 0 && b.a.opened === n0 + 1, "and coming back opens it (snow " + b.a.sn + ", opened " + b.a.opened + ")");
});
await done(fails ? 1 : 0);
