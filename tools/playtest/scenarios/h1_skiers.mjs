// Goal G7 slice H1b: villagers you can see skiing the trails (tlx-trails.js skiers), and the smoothed long trails.
// Asserts, exit 1 on a failure.
//   A seen only when near; the figure is the booked person on the booked trail at the booked progress; booking unchanged by looking
//   B gait by segment: classic on a narrow track, skate on a wide one, herringbone on a steep climb, tuck on a descent, double-pole on a flat at speed
//   C no foot-slide: a planted ski moves less than a small tolerance; ski tracks pressed behind the skier
//   D sharing: a slow pass steps aside and no complaint; a fast close pass is a complaint; three take the bonus; option off removes the penalty;
//     the sled cannot pass through a skier; complaints survive a reload
//   E hail: the use control (keyboard, pad, touch) names itself and gives a line
//   F the pool cap per graphics preset
//   G the smoothed long trails (san, stj): few sharp turns, still on land, clear, within the grade limit, closed loops closed
import { boot, ev, sleep, done, reload, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 400)); } };
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); TLXSK.hold = true; GS.hour = 34; true`;
const PUP = `(() => {
  window.__T = id => TLXSK.list.find(t => t.id === id);
  window.__pup = (id, s0, s1, v) => { const t = __T(id), dir = s1 >= s0 ? 1 : -1; let s = s0; window.__pupOn = true; BOG.on = false; BOG.acc = 0; BOG.immune = 99; FOOT.on = false; crashCancel();
    const put = () => { const a = TLXSK.at(t, s); P.x = a.x; P.z = a.z; P.yaw = Math.atan2(a.tx * dir, a.tz * dir); P.vx = Math.sin(P.yaw) * v; P.vz = Math.cos(P.yaw) * v; P.vy = 0; P.y = surf(a.x, a.z) + 0.05; };
    put(); recenter(P.x, P.z, true);
    let last = performance.now();
    const step = () => { const n = performance.now(), dt = Math.min(0.1, (n - last) / 1000); last = n; s += dir * v * dt; if ((s - s1) * dir >= 0) { P.vx = P.vz = 0; window.__pupOn = false; return; } put(); requestAnimationFrame(step); };
    requestAnimationFrame(step); return true; };
  window.__pupL = (id, bi, u0, u1, v) => { const t = __T(id), o = t.st.out[0], pl = TLXSK.planOf(t, o), L = pl.blocks[bi].leg, dir = u1 >= u0 ? 1 : -1; let u = u0; const gen = (window.__pupGen = (window.__pupGen || 0) + 1); window.__pupOn = true; BOG.on = false; BOG.acc = 0; BOG.immune = 99; FOOT.on = false; crashCancel();
    const put = () => { const a = TLXSK.pp(L, u); P.x = a.x; P.z = a.z; P.yaw = Math.atan2(a.tx * dir, a.tz * dir); P.vx = Math.sin(P.yaw) * v; P.vz = Math.cos(P.yaw) * v; P.vy = 0; P.y = surf(a.x, a.z) + 0.05; };
    put(); recenter(P.x, P.z, true); let last = performance.now();
    const step = () => { if (gen !== window.__pupGen) return; const n = performance.now(), dt = Math.min(0.1, (n - last) / 1000); last = n; u += dir * v * dt; if ((u - u1) * dir >= 0) { P.vx = P.vz = 0; window.__pupOn = false; return; } put(); requestAnimationFrame(step); };
    requestAnimationFrame(step); return true; };
  return true; })()`;
async function book(id, opt = {}) {
  return J(`(() => { const t = __T("${id}"); GS.hour = 34.2 + (window.__bk = ((window.__bk || 0) + 1)) * 0.11; TLXSK.slots.forEach(s => { if (s.vis) TLXSK.hide(s); }); t.st.taken = 1; t.st.out = []; t.st.seg.forEach((g, i) => TLXSK.setSeg(t, i, ${opt.wide ? 5.8 : 2.4}));
    const okp = q => q.interests.includes("ski") && q.age > 25 && q.age < 50 && (${opt.wide ? "TLXSK.trait(q).skate" : "true"}), p = TLXN.people.find(q => okp(q) && q.vid === t.villages[0]) || TLXN.people.find(okp);   // a wide-set trail is skated by those who skate
    TLXSK.goOut(t, p, { ...TLXSK.trait(p), pace: ${opt.pace || 9} }, GS.hour, false, -5);
    const o = t.st.out.find(q => q.p === p.id && q.t0 === GS.hour) || t.st.out.at(-1), pl = TLXSK.planOf(t, o);
    return { who: p.id, name: p.name, o: JSON.parse(JSON.stringify(o)), T: pl.T, blocks: pl.blocks.map(b => [b.k, Math.round(b.a), Math.round(b.b)]), runs: TLXSK.gaitRuns(t, o) }; })()`);
}
const hourAt = (id, bi, u) => J(`(() => { const t = __T("${id}"); return TLXSK.hourAtU(t, t.st.out.find(q => q.k === 0 && q.t0 === ${0}) || t.st.out[0], ${bi}, ${u}); })()`);
const toU = async (id, bi, u, near = true) => {                                       // the clock at path position u of block bi of the first booking, the viewer put beside that spot
  const H = await J(`(() => { const t = __T("${id}"), o = t.st.out[0]; return TLXSK.hourAtU(t, o, ${bi}, ${u}); })()`);
  await ev(`GS.hour = ${H}; TLXSK.poseAll(GS.hour); true`);
  return H;
};
const fig = () => J(`TLXSK.skiers()`);
const look = async (id, bi, u) => {                                                    // clock set, viewer placed at the figure's spot, wait for it to be drawn
  const H = await toU(id, bi, u);
  // the figure's place by the plan (the clock is held by the page while we wait: GS.hour is re-set after each wait)
  const xy = await J(`(() => { const t = __T("${id}"), o = t.st.out[0], pl = TLXSK.planOf(t, o); const sl = TLXSK.slots[0]; return TLXSK.where ? TLXSK.where(t, o, GS.hour) : null; })()`);
  return { H, xy };
};

await boot(); await ev(SETUP); await sleep(600); await ev(PUP);
await ev(`GS.hour = 34; true`);

await section("A seen only when near", async () => {
  const b = await book("lys");
  const t = await J(`(() => { const t = __T("lys"); return { bb: t.bb, start: t.pts[0], n: t.st.out.length }; })()`);
  console.log("  ", JSON.stringify({ who: b.name, T: Math.round(b.T), blocks: b.blocks, runs: b.runs.length }));
  const before = JSON.stringify(await J(`__T("lys").st.out`));
  // far: 2 km west of the trail, mid-journey
  const bi = b.blocks.findIndex(q => q[0] === "leg");
  const mid = b.blocks[bi][1] + 120, Hm = b.o.t0 + mid / 50;
  await ev(`P.x = ${t.bb[0] - 1500}; P.z = ${t.bb[1]}; P.vx = P.vz = 0; recenter(P.x, P.z, true); GS.hour = ${Hm}; true`); await sleep(900);
  await ev(`GS.hour = ${Hm}; true`); await sleep(500);
  ok((await fig()).length === 0, "an outing booked far from the viewer has no figure");
  // near: put the viewer by where the figure should be
  const pos = await J(`(() => { const t = __T("lys"), o = t.st.out[0]; GS.hour = ${Hm}; const pl = TLXSK.planOf(t, o); const L = pl.blocks[${bi}].leg; const q = TLXSK.pp(L, TLXSK.uAtTau(L, ${mid} - pl.blocks[${bi}].a)); return [q.x, q.z]; })()`);
  await ev(`P.x = ${pos[0] + 12}; P.z = ${pos[1] + 12}; P.vx = P.vz = 0; P.y = surf(P.x, P.z) + 0.05; recenter(P.x, P.z, true); GS.hour = ${Hm}; true`); await sleep(1200);
  const f = (await fig())[0];
  ok(!!f && f.p === b.who && f.trail === "lys", "near: the booked person is drawn on the booked trail (" + (f ? f.p + " on " + f.trail : "none") + ")");
  const nr = f ? await J(`(() => { const q = TLXSK.nearest(${f.x}, ${f.z}, 8); return q ? { id: q.trail.id, d: q.d } : null; })()`) : null;
  ok(!!nr && nr.id === "lys" && nr.d < 4, "the figure stands on the trail line (" + (nr ? nr.d.toFixed(2) + " m off" : "off") + ")");
  ok(!!f && Math.abs(f.tau - (await J(`(GS.hour - ${b.o.t0}) * 50`))) < 6, "its progress is the booking's clock (tau " + (f ? f.tau.toFixed(1) : "?") + ")");
  const after = JSON.stringify(await J(`__T("lys").st.out`));
  const o0 = JSON.parse(before)[0], o1 = JSON.parse(after)[0];
  ok(o0.km === o1.km && o0.pc === o1.pc && o0.p === o1.p && o0.t0 === o1.t0 && o1.dl === 0, "looking changes nothing in the booking (who, km, pace, start, no delay)");
  const gone = await J(`(() => { const t = __T("lys"); return TLXSK.skiers().length; })()`);
  await ev(`P.x = ${t.bb[0] - 1500}; recenter(P.x, P.z, true); true`); await sleep(1200);
  ok((await fig()).length === 0 && gone >= 1, "walking away drops the figure again");
});

const GROUP = {};
await section("B gait by segment", async () => {
  const gaitAt = async (id, wide, want, pace) => {
    const b = await book(id, { wide, pace }); const runs = b.runs.filter(r => r.gait === want && r.u1 - r.u0 > 25);
    if (!runs.length) return { found: 0, gaits: [...new Set(b.runs.map(r => r.gait))] };
    const r = runs.sort((a, c) => (c.u1 - c.u0) - (a.u1 - a.u0))[0], u = (r.u0 + r.u1) / 2, H = await J(`(() => { const t = __T("${id}"); return TLXSK.hourAtU(t, t.st.out[0], ${r.bi}, ${u}); })()`);
    const pos = await J(`(() => { const t = __T("${id}"), o = t.st.out[0], pl = TLXSK.planOf(t, o); return (q => [q.x, q.z])(TLXSK.pp(pl.blocks[${r.bi}].leg, ${u})); })()`);
    await ev(`P.x = ${pos[0] + 10}; P.z = ${pos[1] + 10}; P.vx = P.vz = 0; P.y = surf(P.x, P.z) + 0.05; recenter(P.x, P.z, true); GS.hour = ${H}; true`); await sleep(900);
    await ev(`window.__hold = setInterval(() => { GS.hour = ${H}; }, 8); true`); await sleep(900);
    const f = (await fig())[0]; await ev(`clearInterval(window.__hold); true`); GROUP[want] = { id, bi: r.bi, u, H };
    return { found: 1, seen: f ? f.gait : "none", n: runs.length, u };
  };
  const c = await gaitAt("lys", false, "classic", 9); ok(c.found && c.seen === "classic", "a narrow set track: classic diagonal stride (" + JSON.stringify(c) + ")");
  const s = await gaitAt("lys", true, "skate", 9); ok(s.found && s.seen === "skate", "a wide-groomed segment: skating (" + JSON.stringify(s) + ")");
  let h = await gaitAt("stj", false, "herringbone", 9); if (!h.found) h = await gaitAt("san", false, "herringbone", 9); ok(h.found && h.seen === "herringbone", "a steep climb: herringbone (" + JSON.stringify(h) + ")");
  let d = await gaitAt("stj", false, "tuck", 9); if (!d.found) d = await gaitAt("san", false, "tuck", 9); ok(d.found && d.seen === "tuck", "a descent: tuck (" + JSON.stringify(d) + ")");
  let p = await gaitAt("lys", false, "double-pole", 12); if (!p.found) p = await gaitAt("meh", false, "double-pole", 12); if (!p.found) p = await gaitAt("ifj", false, "double-pole", 12); ok(p.found && p.seen === "double-pole", "a flat at speed: double-poling (" + JSON.stringify(p) + ")");
});

await section("C foot-slide and ski tracks", async () => {
  const res = {};
  for (const g of ["classic", "skate", "herringbone", "tuck", "double-pole"]) {
    const G = GROUP[g]; if (!G) { ok(false, "no run for " + g); continue; }
    await ev(`__T("${G.id}").st.out = []; true`); const wide = g === "skate";
    const b = await book(G.id, { wide, pace: g === "double-pole" ? 12 : 9 }); const r = b.runs.find(q => q.gait === g && q.u1 - q.u0 > 25); if (!r) { ok(false, "run lost for " + g + " " + JSON.stringify([...new Set(b.runs.map(q => q.gait))])); continue; }
    const u0 = r.u0 + 6, u1 = Math.min(r.u1 - 3, u0 + 28);
    const H0 = await J(`TLXSK.hourAtU(__T("${G.id}"), __T("${G.id}").st.out[0], ${r.bi}, ${u0})`);
    const pos = await J(`(() => { const t = __T("${G.id}"), o = t.st.out[0], pl = TLXSK.planOf(t, o); return (q => [q.x, q.z])(TLXSK.pp(pl.blocks[${r.bi}].leg, ${u0})); })()`);
    await ev(`P.x = ${pos[0] + 10}; P.z = ${pos[1] + 10}; P.vx = P.vz = 0; P.y = surf(P.x, P.z) + 0.05; recenter(P.x, P.z, true); GS.hour = ${H0}; true`); await sleep(900); await ev(`GS.hour = ${H0}; true`); await sleep(500);
    const m = await J(`(() => { const sl = TLXSK.slots.find(q => q.vis); if (!sl) return null; const H1 = TLXSK.hourAtU(__T("${G.id}"), __T("${G.id}").st.out[0], ${r.bi}, ${u1}), N = Math.max(40, Math.round((H1 - ${H0}) * 50 / 0.05)), prev = [null, null], hist = [[], []];
      const run = [[], []];                                                  // per foot: contiguous stretches where the ski is on the snow and (nearly) still
      for (let k = 0; k <= N; k++) { const H = ${H0} + (H1 - ${H0}) * k / N; TLXSK.poseAll(H); const v = sl.v;
        for (let i = 0; i < 2; i++) { const f = sl.P.f[i], on = f.ski && f.lift < 0.012; const sp = prev[i] && prev[i].on ? Math.hypot(f.x - prev[i].x, f.z - prev[i].z) / (((H1 - ${H0}) / N) * 50) : -1; hist[i].push({ x: f.x, z: f.z, on, sp, v }); prev[i] = { x: f.x, z: f.z, on }; } }
      let planted = 0, still = 0, worst = 0, mid = 0, onN = 0, maxv = 0;
      for (let i = 0; i < 2; i++) { let st = null; for (const h of hist[i]) { if (h.on) onN++; const slow = h.on && h.sp >= 0 && h.sp < 0.25 + 0.1 * h.v; if (slow) { if (!st) st = { x0: h.x, z0: h.z, n: 0 }; st.n++; const d = Math.hypot(h.x - st.x0, h.z - st.z0); if (d > worst) worst = d; } else { if (st && st.n >= 3) { planted += st.n; } st = null; }
          if (h.on && h.sp >= 0.25 + 0.1 * h.v && h.sp < 0.6 * h.v) mid++; } if (st && st.n >= 3) planted += st.n; }
      return { frames: N + 1, planted, worstDrift: +worst.toFixed(3), mid, onN, v: sl.v}; })()`);
    res[g] = m; console.log("  ", g, JSON.stringify(m));
    ok(!!m && m.worstDrift < 0.1, `${g}: a planted ski moves less than 10 cm while it is planted (worst ${m && m.worstDrift} m over ${m && m.planted} planted frames)`);
    if (g === "classic" || g === "herringbone") ok(!!m && m.planted >= 3, `${g}: skis really are planted for a while (${m && m.planted} frames)`);
    ok(!!m && m.mid / Math.max(1, m.onN) < 0.3, `${g}: skis on the snow are held still or glide with the body, not dragged (${m ? Math.round(100 * m.mid / Math.max(1, m.onN)) : "?"}% of contact frames in between)`);
  }
  // ski tracks: let a skier ski for real, then read the snow behind them
  const G = GROUP.classic; await ev(`__T("${G.id}").st.out = []; true`);
  const b = await book(G.id, { wide: false, pace: 9 }); const r = b.runs.find(q => q.gait === "classic" && q.u1 - q.u0 > 60) || b.runs[0];
  const u0 = r.u0 + 4, H0 = await J(`TLXSK.hourAtU(__T("${G.id}"), __T("${G.id}").st.out[0], ${r.bi}, ${u0})`);
  const pos = await J(`(() => { const t = __T("${G.id}"), o = t.st.out[0], pl = TLXSK.planOf(t, o); return (q => [q.x, q.z])(TLXSK.pp(pl.blocks[${r.bi}].leg, ${u0})); })()`);
  await ev(`TLXSK.SKS.grooves = 0; P.x = ${pos[0] + 10}; P.z = ${pos[1] + 10}; P.vx = P.vz = 0; P.y = surf(P.x, P.z) + 0.05; recenter(P.x, P.z, true); GS.hour = ${H0}; true`); await sleep(700);
  await ev(`GS.hour = ${H0}; window.__ssn = TLXSK.slots.find(q => q.vis) && 1; true`); await sleep(7000);
  const tr = await J(`(() => { const sl = TLXSK.slots.find(q => q.vis); if (!sl) return null; const W = TLX.api.world, P0 = sl.P, nx = Math.cos(P0.yaw), nz = -Math.sin(P0.yaw), fx = Math.sin(P0.yaw), fz = Math.cos(P0.yaw); let on = 0, off = 0, n = 0;
    for (let b = 6; b <= 14; b += 2) for (const i of [0, 1]) { const f = P0.f[i], sx = f.x - fx * b, sz = f.z - fz * b; on += W.depthAt(Math.round((sx + W.half) / W.cell), Math.round((sz + W.half) / W.cell)); off += W.depthAt(Math.round((sx + nx * (i ? 1.4 : -1.4) + W.half) / W.cell), Math.round((sz + nz * (i ? 1.4 : -1.4) + W.half) / W.cell)); n++; }
    return { grooves: TLXSK.SKS.grooves || 0, on: on / n, off: off / n }; })()`);
  console.log("  ", JSON.stringify(tr));
  ok(!!tr && tr.grooves > 8, "pressed grooves are laid as the skier skis (" + (tr && tr.grooves) + ")");
  ok(!!tr && tr.on < tr.off - 0.002, "the snow behind the skis is pressed lower than beside the track (" + (tr && tr.on.toFixed(3)) + " vs " + (tr && tr.off.toFixed(3)) + " m)");
});

await section("D sharing the trail", async () => {
  const ride = async (v, tag) => {
    await ev(`__T("lys").st.out = []; __T("lys").st.cm = { wk: 0, tot: 0 }; true`);
    const b = await book("lys", { pace: 9 }); const bi = b.blocks.findIndex(q => q[0] === "leg");
    const u = 520, H = await J(`TLXSK.hourAtU(__T("lys"), __T("lys").st.out[0], ${bi}, ${u})`);
    const pos = await J(`(() => { const t = __T("lys"), o = t.st.out[0], pl = TLXSK.planOf(t, o); const q = TLXSK.pp(pl.blocks[${bi}].leg, ${u}); const n = TLXSK.nearest(q.x, q.z, 12); return [q.x, q.z, n.s]; })()`);
    await ev(`P.x = ${pos[0] + 15}; P.z = ${pos[1] + 15}; P.vx = P.vz = 0; recenter(P.x, P.z, true); GS.hour = ${H}; true`); await sleep(1000); await ev(`GS.hour = ${H}; true`); await sleep(600);
    const f0 = (await fig())[0]; if (!f0) return { err: "no figure" };
    await ev(`__pupL("lys", ${bi}, ${u + 110}, ${u - 40}, ${v}); true`);
    const seen = { as: -1, stag: 0, min: 99, tw: 1, f0: f0.p, n: 0 };
    for (let k = 0; k < 1500; k++) { await sleep(100); const on = await ev("window.__pupOn"); const f = (await fig()).find(q => q.p === f0.p); if (f) { seen.n++; seen.as = Math.max(seen.as, f.as); seen.stag = Math.max(seen.stag, f.stag); seen.tw = Math.min(seen.tw, f.tw); seen.min = Math.min(seen.min, await J(`Math.hypot(P.x - ${f.x}, P.z - ${f.z})`)); (seen.tr = seen.tr || []).push([Math.round(f.x), Math.round(f.z), Math.round(f.v), Math.round(f.u), Math.round(await J(`P.x`)), Math.round(await J(`P.z`)), f.blk]); } if (!on) break; }
    await sleep(500);
    const cm = await J(`__T("lys").st.cm`); return { seen, cm, v, log: await J(`TLXSK.cmLog || []`) };
  };
  const slow = await ride(3.2, "slow"); console.log("  slow", JSON.stringify(slow));
  ok(slow.seen && slow.seen.as >= 2 && slow.seen.tw < 0.1, "a slow sled: the skier slows, steps off the line and waits (phase " + (slow.seen && slow.seen.as) + ")");
  ok(slow.cm && slow.cm.wk === 0, "a slow pass is not a complaint");
  const fast = await ride(9, "fast"); console.log("  fast", JSON.stringify(fast));
  ok(fast.cm && fast.cm.wk >= 1, "a fast, close pass is a complaint, counted on the trail (" + (fast.cm && fast.cm.wk) + ")");
  const posts = await J(`TLXN.since(0).filter(p => p.kind === "complaint").length`); ok(posts >= 1, "…and posted to the news bus");
  // three in a week take the bonus
  const bonus = await J(`(() => { const t = __T("lys"), st = t.st; st.wk = { v: 9, km: 50, kw: 50, days: 6, low: 0, under: 0 }; st.noon = "good"; st.day = { v: 0, km: 0, kw: 0 }; const out = {};
    for (const n of [0, 2, 3]) { st.cm = { wk: n, tot: n }; out["c" + n] = TLXSK.weekPay(t, true).bonus; }
    TLX.setOn("skicomplaints", false); st.cm = { wk: 3, tot: 3 }; out.off = TLXSK.weekPay(t, true).bonus; TLX.setOn("skicomplaints", true); return out; })()`);
  console.log("  ", JSON.stringify(bonus));
  ok(bonus.c0 > 0 && bonus.c2 > 0 && bonus.c3 === 0, "two complaints keep the weekly bonus; three remove it");
  ok(bonus.off > 0, "option skicomplaints off: three complaints cost nothing");
  // the sled cannot pass through a skier: one standing at the trailhead board (the clock held), the sled driven straight at them
  {
    await ev(`window.__pupGen = (window.__pupGen || 0) + 1; window.__pupOn = false; __T("lys").st.out = []; __T("lys").st.cm = { wk: 0, tot: 0 }; true`);
    const b = await book("lys", { pace: 9 }); const H = b.o.t0 + 3 / 50;
    const st = await J(`(() => { const t = __T("lys"), o = t.st.out[0], pl = TLXSK.planOf(t, o); const q = TLXSK.pp(pl.blocks[1].leg, 0); return [q.x, q.z]; })()`);
    await ev(`P.x = ${st[0] + 14}; P.z = ${st[1] + 14}; P.vx = P.vz = 0; P.y = surf(P.x, P.z) + 0.05; recenter(P.x, P.z, true); window.__hold = setInterval(() => { GS.hour = ${H}; }, 8); true`); await sleep(1500);
    const f = (await fig())[0];
    if (!f) ok(false, "no standing skier for the collision test");
    else {
      await ev(`(() => { const sl = TLXSK.slots.find(q => q.vis); sl.noAside = true; P.x = sl.x + Math.sin(sl.P.yaw) * 25; P.z = sl.z + Math.cos(sl.P.yaw) * 25; window.__hp = { min: 99, past: false };
        let last = performance.now(); window.__tkOn = true;          // driven once per animation frame by real elapsed time, and measured before it moves: the state seen is always one the game has finished resolving, so the hold-off is the game's, not an artefact of how many timer ticks fit between two frames
        const tick = () => { if (!window.__tkOn) return; requestAnimationFrame(tick); const now = performance.now(), dtr = Math.min(0.25, (now - last) / 1000); last = now; const sl = TLXSK.slots.find(q => q.vis); if (!sl) return; const dx = sl.x - P.x, dz = sl.z - P.z; const hx = Math.sin(P.yaw), hz = Math.cos(P.yaw); const dc = Math.min(Math.hypot(sl.x - (P.x + hx * 1.15), sl.z - (P.z + hz * 1.15)), Math.hypot(sl.x - (P.x - hx * 0.7), sl.z - (P.z - hz * 0.7))); if (window.__hp.min > dc) window.__hp.min = dc; P.yaw = Math.atan2(window.__hp.dir0 === undefined ? (window.__hp.dir0 = dx) : window.__hp.dir0, window.__hp.dz0 === undefined ? (window.__hp.dz0 = dz) : window.__hp.dz0); const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw); P.x += fx * 7 * dtr; P.z += fz * 7 * dtr; P.vx = fx * 7; P.vz = fz * 7; if (dx * fx + dz * fz < -0.4) window.__hp.past = true; };
        requestAnimationFrame(tick); return 1; })()`);
      await sleep(5000); const r = await J(`(() => { window.__tkOn = false; clearInterval(window.__hold); return { min: window.__hp.min, past: window.__hp.past, wk: __T("lys").st.cm.wk }; })()`);
      console.log("  ", JSON.stringify(r));
      ok(r.min > 0.8, "driven straight at a skier at 7 m/s, the sled is held off them: its body never closer than " + r.min.toFixed(2) + " m (a skier is ~0.6 m across)");
      ok(r.wk >= 1, "running into a skier is a complaint");
    }
  }
  // complaints survive a reload
  await ev(`__T("lys").st.cm = { wk: 2, tot: 5 }; save(); true`); await reload(); await sleep(1500); await ev(SETUP); await sleep(500); await ev(PUP);
  const rl = await J(`(() => { const t = TLXSK.list.find(q => q.id === "lys"); return t.st.cm || null; })()`);
  ok(!!rl && rl.wk === 2 && rl.tot === 5, "complaints survive a reload (" + JSON.stringify(rl) + ")");
});

await section("E hail", async () => {
  await ev(SETUP); await sleep(400); await ev(PUP);
  await ev(`__T("lys").st.out = []; true`);
  const b = await book("lys", { pace: 9 }); const bi = b.blocks.findIndex(q => q[0] === "leg"), u = 600;
  const H = await J(`TLXSK.hourAtU(__T("lys"), __T("lys").st.out[0], ${bi}, ${u})`);
  const pos = await J(`(() => { const t = __T("lys"), o = t.st.out[0], pl = TLXSK.planOf(t, o); return (q => [q.x, q.z])(TLXSK.pp(pl.blocks[${bi}].leg, ${u})); })()`);
  await ev(`P.x = ${pos[0] + 14}; P.z = ${pos[1]}; P.vx = P.vz = 0; recenter(P.x, P.z, true); GS.hour = ${H}; true`); await sleep(900); await ev(`GS.hour = ${H}; true`); await sleep(500);
  const f = (await fig())[0]; ok(!!f, "a skier to talk to");
  await ev(`TLXSK.hold = true; FOOT.on = true; FOOT.x = ${f ? f.x + 2.5 : 0}; FOOT.z = ${f ? f.z : 0}; FOOT.y = surf(FOOT.x, FOOT.z); true`); await sleep(500);
  const far = await J(`(() => { FOOT.x += 40; const r = TLXSK.HAILX.use(); FOOT.x -= 40; return !!r; })()`);
  ok(!far, "far from a skier on foot there is no hail");
  const txt = {};
  for (const dev of [["kbm", "xbox"], ["pad", "ps"], ["touch", "xbox"]]) {
    txt[dev[0]] = await J(`(() => { INP.dev = ${JSON.stringify(dev[0])}; INP.pad = ${JSON.stringify(dev[1])}; const r = TLXSK.HAILX.use(); return r ? { label: r.label, hint: r.hint(), ctl: TLX.api.btn("use") } : null; })()`);
  }
  console.log("  ", JSON.stringify(txt));
  for (const k of Object.keys(txt)) ok(!!txt[k] && txt[k].label === "HAIL" && (txt[k].hint.includes(txt[k].ctl)), `${k}: the prompt names the use control (${txt[k] && txt[k].ctl}): ${txt[k] && txt[k].hint}`);
  ok(txt.kbm && txt.pad && txt.touch && txt.kbm.ctl !== txt.pad.ctl, "the control differs between keyboard and pad");
  await ev(`INP.dev = "kbm"; true`);
  const said = await J(`(() => { const r = TLXSK.HAILX.use(); r.act(); return TLXSK.lastHail; })()`);
  ok(!!said && said.line && said.line.length > 8 && (await J(`__T("lys").st.out.some(o => o.p === "${said && said.p}")`)), "hailing makes them say how the track is: " + (said && said.line));
  const lines = await J(`(() => { const out = new Set(); const sl = TLXSK.slots.find(q => q.vis); for (let i = 0; i < 8; i++) { GS.hour += 0.31; out.add(TLXSK.hailLine(sl)); } return [...out]; })()`);
  ok(lines.length >= 3, "the lines vary (" + lines.length + " different in 8)");
  // stopped beside a skier in the sled
  await ev(`FOOT.on = false; GS.hour = ${H}; true`); await sleep(900); await ev(`GS.hour = ${H}; true`); await sleep(400); const f2 = (await fig())[0]; await ev(`P.x = ${f2.x + 3}; P.z = ${f2.z}; P.vx = P.vz = 0; true`); await sleep(120);
  const ride = await J(`(() => { const r = TLX.api.rideUse.map(p => p.use()).find(Boolean); return r ? r.label : null; })()`);
  ok(ride === "HAIL", "stopped beside a skier in the sled: the same control hails (" + ride + ")");
  const fastv = await J(`(() => { P.vx = 8; const r = TLX.api.rideUse.map(p => p.use()).find(Boolean); P.vx = 0; return r ? r.label : null; })()`);
  ok(fastv === null, "not while moving at speed");
});

await section("F the pool cap", async () => {
  const caps = await J(`({ low: TLXSK.SKI.pool.low, high: TLXSK.SKI.pool.high })`);
  ok(caps.high === 8 && caps.low === 4, "pool sizes: 8 on desktop, 4 on low (" + JSON.stringify(caps) + ")");
  // book a crowd near a trailhead and count what is drawn at both presets
  const out = {};
  for (const low of [false, true]) {
    out[low ? "low" : "high"] = await J(`(() => { GFX.low = ${low}; const t = __T("lys"); t.st.taken = 1; t.st.out = []; const H = GS.hour; const ps = TLXN.people.filter(q => q.interests.includes("ski") && q.age > 18 && q.age < 70).slice(0, 14);
      for (const p of ps) TLXSK.goOut(t, p, { pace: 9 }, H, false, -5);
      const st = t.st.out.slice(); const mx = Math.max(...st.map(o => TLXSK.planOf(t, o).T)); GS.hour = H + 70 / 50; const q = TLXSK.at(t, 300); P.x = q.x; P.z = q.z; recenter(P.x, P.z, true); TLXSK.rescan(); const n = TLXSK.slots.filter(s => s.vis).length; return { booked: st.length, drawn: n, made: TLXSK.slots.length }; })()`);
    await sleep(300);
  }
  console.log("  ", JSON.stringify(out));
  ok(out.high.drawn <= 8 && out.high.made <= 8 && out.high.drawn >= 2, "desktop: at most 8 skiers drawn from " + out.high.booked + " booked (" + out.high.drawn + ")");
  ok(out.low.drawn <= 4, "low: at most 4 skiers drawn (" + out.low.drawn + ")");
  await ev(`GFX.low = false; true`);
});

await section("G the smoothed long trails", async () => {
  const r = await J(`(() => { const o = {}; for (const id of ["san", "stj"]) { const t = TLXSK.list.find(q => q.id === id); const tn = TLXSK.turns(t.pts); o[id] = { len: Math.round(t.len), n: t.pts.length, mean: +(tn.reduce((a, b) => a + Math.abs(b), 0) / tn.length).toFixed(1), gt40: tn.filter(b => Math.abs(b) > 40).length, grade: +t.grade.toFixed(3), loop: t.kind === "loop", closed: t.kind !== "loop" || Math.hypot(t.pts[0][0] - t.pts.at(-1)[0], t.pts[0][1] - t.pts.at(-1)[1]) < 30, bake: (TLXSK.diag || {})[id] }; } return { o, diag: TLXSK.diag }; })()`);
  console.log("  ", JSON.stringify(r.o));
  for (const id of ["san", "stj"]) {
    const q = r.o[id];
    ok(q.mean < 30 && q.gt40 < 60, `${id}: smoothed (mean turn ${q.mean}°, ${q.gt40} sharp turns)`);
    ok(q.grade <= 0.143, `${id}: steepest ${(q.grade * 100).toFixed(1)}% within the limit`);
    ok(q.closed && q.len > 4800 && q.len < 9500, `${id}: closed, ${q.len} m`);
  }
  ok(!JSON.stringify(r.diag).includes("refused"), "no baked line refused at boot");
});

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
done(fails ? 1 : 0);
