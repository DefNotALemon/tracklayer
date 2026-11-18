// Expansion slice 4.1a2: the road credit (tlx-plow.js). A snowed-in road stretch you plow both sides of is open.
// Asserts, exit 1 on a failure.
//   A setup: a fresh game counts no opened stretch; a pickup with the blade; a 400 m stretch of a road with no convoy,
//     with a stretch either side, the straightest there is; a second stretch (K) well away from it for the puppet parts.
//   B blade UP along both sides of K (snowed in): no marks, its snow as it was, the hint says nothing of the road.
//   C DRIVEN (keys: W and steering, the truck's own physics): the stretch set to LEVEL (default 0.5, shut), the truck
//     starts on the cleared stretch before it, blade down, and plows up the right-hand side. After the pass: still shut,
//     this side 80%+ of its lengths, the other side next to none, the hint gives both.
//   D DRIVEN back down the other side: it opens before the end: snow 0, the scraped hour stamped, the road "open", the
//     line that shows names the road and is yours (the council's "plow's been round" is not said), the whole width is
//     cut at once, the marks are gone, the count is 1.
//   E puppet (the truck is carried along the lane with its blade down, 2 m a frame; what is tested is the counting):
//     the same side twice does not open K and the hint says the other side is at 0%; new snow on it wipes the marks;
//     the council's plow clearing it drops them; a stretch with a little snow (not shut) plowed both sides says
//     "You've plowed"; a reload keeps the count and forgets the marks.
// DEEP=1 adds: the same drive into a stretch at 0.9 (printed, not asserted beyond "it says why if it stops").
// Headless runs ~0.6x: all by gameClock. ONLY=BCDE runs some sections (A always). NOSTILLS=1 skips the stills.
import { boot, ev, sleep, done, down, up, reload, shot, sideCam, camOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(120); }
const ONLY = process.env.ONLY, LEVEL = +(process.env.LEVEL || 0.5), STILLS = !process.env.NOSTILLS;
const section = async (n, f) => { if (ONLY && n[0] !== "A" && !ONLY.includes(n[0])) return; console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80); return true; })()`);

const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 9000; WX.at = () => 0; GS.storm = 0; GS.hour = 12; TLXR.ROADS.plowAt = 2; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
// the kit in the page: a point in a lane of a route, the truck put there, a puppet that carries it along a lane
const KIT = `(() => {
  window.__rt = id => TLXR.routes.find(r => r.id === id);
  // s m along route id, off m to the RIGHT of travel (dir +1 up the route, -1 down it): { x, z, yaw }
  window.__lane = (id, s, dir, off) => { const r = __rt(id), c = r.cum, p = r.pts; s = Math.max(0, Math.min(r.len - 0.01, s)); let i = 1; while (i < c.length - 1 && c[i] < s) i++;
    const a = p[i - 1], b = p[i], L = c[i] - c[i - 1] || 1, t = (s - c[i - 1]) / L, tx = (b[0] - a[0]) / L * dir, tz = (b[1] - a[1]) / L * dir;
    return { x: a[0] + (b[0] - a[0]) * t - tz * off, z: a[1] + (b[1] - a[1]) * t + tx * off, yaw: Math.atan2(tx, tz) }; };
  window.__put = (id, s, dir, off) => { const q = __lane(id, s, dir, off); BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; crashCancel(); FOOT.on = false; P.x = q.x; P.z = q.z; P.yaw = q.yaw; P.vx = P.vy = P.vz = 0; P.y = surf(q.x, q.z); recenter(q.x, q.z, true); camState.init = false; const B = TLXPL.rt(TLXV.state().cur); B.last = null; B.carry = 0; B.full = false; return true; };
  // what the driver steers by: the lane point ahead of the truck
  window.__steer = (id, dir, off, ahead) => { const n = TLXR.near(P.x, P.z), t = __lane(id, n.s + dir * ahead, dir, off); let e = Math.atan2(t.x - P.x, t.z - P.z) - P.yaw; while (e > Math.PI) e -= 2 * Math.PI; while (e < -Math.PI) e += 2 * Math.PI;
    return { e, s: n.s, d: n.d, rid: n.route && n.route.id, v: Math.hypot(P.vx, P.vz), bog: BOG.on, why: TLXV.rt().why || "" }; };
  // the puppet: carried from sA to sB along the lane, 2 m a frame, rolling forward at 6 m/s as far as the plow can tell
  window.__pup = (id, sA, sB, off) => { const dir = sB >= sA ? 1 : -1; let s = sA; window.__pupOn = true; __put(id, sA, dir, off);
    const step = () => { s += dir * 2; if ((s - sB) * dir >= 0) { P.vx = P.vz = 0; window.__pupOn = false; return; } const q = __lane(id, s, dir, off); P.x = q.x; P.z = q.z; P.yaw = q.yaw; P.y = surf(q.x, q.z); P.vx = Math.sin(q.yaw) * 6; P.vz = Math.cos(q.yaw) * 6; P.vy = 0; BOG.on = false; BOG.acc = 0; requestAnimationFrame(step); };
    requestAnimationFrame(step); return true; };
  window.__rc = (id, i) => { const c = TLXPL.road.get(id + ":" + i); return c ? { n: c.n, c: [c.c[0], c.c[1]], s0: c.s0 } : null; };
  window.__across = (id, s) => { const o = []; for (let off = -2.8; off <= 2.81; off += 0.7) { const q = __lane(id, s, 1, off), ix = Math.round((q.x + HALF) / CELL), iz = Math.round((q.z + HALF) / CELL), d = depthAt(ix, iz), f = freshAt(ix, iz); o.push([+d.toFixed(2), +f.toFixed(2)]); } return o; };
  return true; })()`;
const pup = async (id, sA, sB, off) => { await ev(`__pup(${JSON.stringify(id)}, ${sA}, ${sB}, ${off})`); for (let k = 0; k < 400 && (await ev("window.__pupOn")); k++) await sleep(100); await sleep(150); };
const blade = dn => ev(`TLXPL.rt(TLXV.state().cur).down = ${dn}; TLXPL.rt(TLXV.state().cur).last = null; true`);

await boot();
await ev(SETUP); await sleep(600); await ev(KIT);

let uid = null, RD = null;
await section("A setup", async () => {
  const st = await J(`TLX.state("plow")`);
  ok(st && st.opened === 0, "fresh game: no road stretch opened (" + JSON.stringify(st) + ")");
  await ev(`TLXV.buy("pickup"); true`); await sleep(300);
  uid = await ev(`TLXV.state().owned[0].uid`);
  await ev(`(() => { TLX.state("plow").blades[${JSON.stringify(uid)}] = { id: "b23", cond: 100 }; TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; return true; })()`); await sleep(600);
  ok(await ev(`!!VEH.cur && !FOOT.on && TLXV.state().cur === ${JSON.stringify(uid)} && !!TLXPL.bladeOf(${JSON.stringify(uid)})`), "seated in the pickup, the blade fitted");
  // the straightest whole stretch with a stretch either side, on a road with no convoy; and the next best, 2+ stretches away
  RD = await J(`(() => { const SEG = TLXR.ROADS.seg, out = [];
    for (const def of TLXR.ROADS.routes) { if (def.convoy || def.closed) continue; const r = __rt(def.id); if (!r || !r.st) continue;
      for (let i = 1; i < r.seg.length - 1; i++) { if (!r.seg[i - 1].legs.length || !r.seg[i].legs.length || !r.seg[i + 1].legs.length || (i + 1) * SEG + 40 > r.len) continue;
        let turn = 0, y0 = null, bad = false; for (let s = i * SEG - 40; s <= (i + 1) * SEG + 40; s += 8) { const q = __lane(def.id, s, 1, 0); if (y0 !== null) { let e = q.yaw - y0; while (e > Math.PI) e -= 2 * Math.PI; while (e < -Math.PI) e += 2 * Math.PI; turn = Math.max(turn, Math.abs(e)); } y0 = q.yaw; const n = TLXR.near(q.x, q.z); if (n.route !== r || Math.abs(n.s - s) > 3) bad = true; }
        if (!bad) out.push({ id: def.id, name: r.name, i, turn: +turn.toFixed(3), len: Math.round(r.len) }); } }
    out.sort((a, b) => a.turn - b.turn); const a = out[0], k = out.find(o => o.id !== a.id || Math.abs(o.i - a.i) >= 3); return { a, k, n: out.length }; })()`);
  console.log("  stretch", JSON.stringify(RD));
  ok(RD && RD.a && RD.k, "a straight stretch to plow and a second one for the puppet");
});
if (!uid || !RD || !RD.a || !RD.k) await done(1);
const A = RD.a, K = RD.k, SEG = 400, aid = JSON.stringify(A.id), kid = JSON.stringify(K.id);
const hour0 = await ev("GS.hour");

await section("B blade up changes nothing", async () => {
  await ev(`TLXR.setSnow(${kid}, 0.6, ${K.i}); true`);
  await blade(false);
  await pup(K.id, K.i * SEG + 4, (K.i + 1) * SEG - 4, 1.5); await pup(K.id, (K.i + 1) * SEG - 4, K.i * SEG + 4, 1.5);
  const s = await J(`({ rc: __rc(${kid}, ${K.i}), sn: __rt(${kid}).st.s[${K.i}], st: TLXR.status(${kid}), hint: TLXPL.hint(), opened: TLX.state("plow").opened })`);
  console.log("  ", JSON.stringify(s));
  ok(s.rc === null && Math.abs(s.sn - 0.6) < 0.01 && s.st === "snowed in" && s.opened === 0, "blade UP along both sides of a snowed-in stretch: no marks, its snow as it was, still snowed in");
  ok(!/this side/.test(s.hint), "and the hint says nothing of the road's sides: " + JSON.stringify(s.hint));
});

// the driver: W held (eased to 8 m/s), A / D by the lane point 12 m ahead, until stop(s) or secs of game time
async function drive(id, dir, off, secs, stop) {
  const t0 = await clock(); let steerKey = null, gas = false, last = null, maxD = 0, vs = [], still = 0, n = 0, shots = 0;
  try {
    while ((await clock()) - t0 < secs) {
      const s = last = await J(`__steer(${JSON.stringify(id)}, ${dir}, ${off}, 12)`); n++;
      maxD = Math.max(maxD, s.d); vs.push(s.v);
      const wantGas = s.v < 8; if (wantGas !== gas) { if (wantGas) await down("KeyW"); else await up("KeyW"); gas = wantGas; }
      const want = s.e > 0.05 ? "KeyA" : s.e < -0.05 ? "KeyD" : null;
      if (want !== steerKey) { if (steerKey) await up(steerKey); if (want) await down(want); steerKey = want; }
      if (await stop(s)) break;
      still = s.v < 0.3 && n > 30 ? still + 1 : 0; if (still > 60) break;          // stopped for good
      if (STILLS && dir === 1 && shots === 0 && (await clock()) - t0 > 22) { shots = 1; await sideCam(undefined, 13, 6.5, Math.PI - 0.35); await shot("r1_out_behind_high"); await camOff(); }
      await sleep(90);
    }
  } finally { if (steerKey) await up(steerKey); await up("KeyW"); }
  return { t: +((await clock()) - t0).toFixed(1), s: Math.round(last.s), v: +(vs.reduce((a, b) => a + b, 0) / Math.max(1, vs.length)).toFixed(1), maxD: +maxD.toFixed(1), bog: last.bog, why: last.why, stopped: still > 60 };
}

let outOK = false;
await section("C driven out along the right-hand side", async () => {
  await ev(`TLXR.setSnow(${aid}, ${LEVEL}, ${A.i}); true`);
  await ev(`__put(${aid}, ${A.i * SEG - 30}, 1, 1.5); true`); await waitGame(1.0);
  const pre = await J(`({ acr: __across(${aid}, ${A.i * SEG + 200}), pad: __across(${aid}, ${A.i * SEG - 20}), st: TLXR.status(${aid}), sn: __rt(${aid}).st.s[${A.i}] })`);
  console.log("  the stretch at " + LEVEL + ", [d, f] across at its middle:", JSON.stringify(pre.acr)); console.log("  the stretch before it:", JSON.stringify(pre.pad));
  ok(pre.st === "snowed in", `the ${A.name} reads snowed in with stretch ${A.i} at ${LEVEL}`);
  const dmid = pre.acr[Math.floor(pre.acr.length / 2)];
  ok(dmid[0] > 0.12 && dmid[0] / dmid[1] > 0.3, `and there is snow on it to cut: ${Math.round(dmid[0] * 100)} cm on the crown (pack ${Math.round(dmid[1] * 100)} cm)`);
  await blade(true); await clearToasts();
  const r = await drive(A.id, 1, 1.5, 200, async s => s.s > (A.i + 1) * SEG + 14);
  const hint = await ev(`TLXPL.hint()`);
  // the blade is still on the next (clear) stretch: read the marks straight from the table
  const a = await J(`({ rc: __rc(${aid}, ${A.i}), sn: __rt(${aid}).st.s[${A.i}], st: TLXR.status(${aid}), opened: TLX.state("plow").opened, m: Math.round(TLX.state("plow").m) })`), t = await toasts();
  console.log("  out", JSON.stringify(r), JSON.stringify(a)); console.log("  hint after:", hint);
  ok(!r.stopped && !r.bog && r.s > (A.i + 1) * SEG, `the pickup plows the whole 400 m: to ${r.s} m along in ${r.t} game s at a mean ${r.v} m/s (${Math.round(r.v * 3.6)} km/h), not bogged`);
  ok(r.maxD < 3.2, `and keeps to the road (${r.maxD} m from the line at most)`);
  ok(a.rc && Math.max(...a.rc.c) >= 0.8 * a.rc.n, "one side has 80% or more of its lengths marked: " + JSON.stringify(a.rc));
  ok(a.rc && Math.min(...a.rc.c) <= 0.1 * a.rc.n, "the other side next to none");
  ok(Math.abs(a.sn - LEVEL) < 0.01 && a.st === "snowed in" && a.opened === 0, "one pass leaves the stretch shut: snow " + a.sn + ", " + a.st);
  ok(!t.some(m => /open|plowed the/i.test(m)), "and nothing is said yet (" + JSON.stringify(t) + ")");
  ok(a.m > 300, "the metres cut are counted (" + a.m + ")");
  outOK = !!a.rc;
  // the hint part-way: back onto the stretch, blade down, standing
  // (the keyed driver wanders a metre either way, more on a loaded Mac, so the spot the truck is put back on may be half off
  // its own cut: wheels in uncut snow turn the hint into the "start from cleared ground" line, which names no road. That failed
  // this assert twice inside a gate. The truck's own footprint and the blade's are cut here first.)
  await ev(`__put(${aid}, ${A.i * SEG + 200}, 1, 1.5); (() => { const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw); for (let k = -4; k <= 5; k += 0.15) bladeSnow(P.x + fx * k + fz * 2.2, P.z + fz * k - fx * 2.2, P.x + fx * k - fz * 2.2, P.z + fz * k + fx * 2.2, 0.15); P.y = surf(P.x, P.z); })(); true`); await waitGame(0.5);
  const h2 = await ev(`TLXPL.hint()`); console.log("  hint on the stretch:", h2);
  const hm = new RegExp(A.name + ": this side (\\d+)%, the other side (\\d+)%").exec(h2);   // a driver that wanders over the crown marks a length or two of the other side
  ok(hm && +hm[1] === 100 && +hm[2] <= 13, "standing on it, the hint gives the road and both sides: this side 100%, the other side next to nothing (" + (hm ? hm[1] + "% / " + hm[2] + "%" : "no road in the hint") + ")");
  if (STILLS) { await sideCam(undefined, 16, 7, 0.25); await shot("r2_after_one_pass_looking_back"); await camOff(); }
});

await section("D driven back down the other side", async () => {
  if (!outOK) { ok(false, "section C left no marks to finish"); return; }
  await ev(`__put(${aid}, ${(A.i + 1) * SEG + 30}, -1, 1.5); true`); await blade(true); await waitGame(1.0); await clearToasts();
  let openedAt = null;
  const r = await drive(A.id, -1, 1.5, 200, async s => { if (openedAt === null && (await ev(`__rt(${aid}).st.s[${A.i}]`)) === 0) openedAt = s.s; return openedAt !== null || s.s < A.i * SEG - 14; });
  await sleep(300);
  const a = await J(`({ rc: __rc(${aid}, ${A.i}), sn: __rt(${aid}).st.s[${A.i}], t: __rt(${aid}).st.t[${A.i}], H: GS.hour, st: TLXR.status(${aid}), opened: TLX.state("plow").opened, warned: TLX.state("roads").warned, anyShut: TLXR.routes.some(r => !r.closed && TLXR.status(r.id) === "snowed in"), acr: [__across(${aid}, ${A.i * SEG + 60}), __across(${aid}, ${A.i * SEG + 200}), __across(${aid}, ${A.i * SEG + 340})], hint: TLXPL.hint() })`), t = await toasts();
  console.log("  back", JSON.stringify(r), "opened at", openedAt, JSON.stringify({ sn: a.sn, t: a.t, H: a.H, st: a.st, opened: a.opened })); console.log("  toasts", JSON.stringify(t));
  ok(openedAt !== null && a.sn === 0, `coming back down the other side opens it: snow 0, at ${openedAt === null ? "-" : Math.round(openedAt - A.i * SEG)} m from the stretch's start`);
  ok(openedAt !== null && openedAt - A.i * SEG < 0.3 * SEG, "not before four fifths of the way back");
  ok(a.t >= hour0 && Math.abs(a.t - a.H) < 0.2, "the hour it was scraped is stamped (" + a.t.toFixed(2) + ", now " + a.H.toFixed(2) + ")");
  ok(a.st === "open", "the road reads open: " + a.st);
  const mine = t.filter(m => m.includes(A.name));
  ok(mine.length === 1 && /is open again: your blade cleared km \d+\.\d to \d+\.\d/.test(mine[0]), "the line that shows names the road and the kilometres: " + JSON.stringify(mine));
  ok(!t.some(m => /plow's been round|drifting shut/.test(m)) && a.warned === a.anyShut, "the council's lines are not said for your work, and its storm warning is re-armed unless another road is still shut (warned " + a.warned + ", another shut " + a.anyShut + ")");
  ok(a.rc === null && a.opened === 1, "the marks are gone and one opened stretch is counted");
  const worst = Math.max(...a.acr.flat().map(c => c[0] / c[1]));
  console.log("  [d, f] across, 60 / 200 / 340 m in:", JSON.stringify(a.acr));
  ok(worst <= 0.45, `the whole width is cut at once, both shoulders too, along its length (d/f ${worst.toFixed(2)} at most across 5.6 m)`);
  ok(!/this side/.test(a.hint), "the hint no longer counts sides: " + JSON.stringify(a.hint));
  if (STILLS) { await ev(`__put(${aid}, ${A.i * SEG + 120}, 1, 1.5); true`); await waitGame(0.6); await sideCam(undefined, 16, 7, 0.25); await shot("r3_opened_looking_back"); await sideCam(undefined, 14, 5, Math.PI - 0.3); await shot("r4_opened_looking_on"); await camOff(); }
});

await section("E the counting", async () => {
  await ev(`TLXR.setSnow(${kid}, 0.6, ${K.i}); TLXPL.road.clear(); true`);
  const n0 = await ev(`TLX.state("plow").opened`);
  await blade(true); await clearToasts();
  // the same side twice: up the right-hand side, then back down the WRONG side (the same strip of road)
  await pup(K.id, K.i * SEG + 4, (K.i + 1) * SEG - 4, 1.5); await pup(K.id, (K.i + 1) * SEG - 4, K.i * SEG + 4, -1.5);
  await ev(`__put(${kid}, ${K.i * SEG + 200}, 1, 1.5); true`); await waitGame(0.4);
  let s = await J(`({ rc: __rc(${kid}, ${K.i}), sn: __rt(${kid}).st.s[${K.i}], hint: TLXPL.hint(), opened: TLX.state("plow").opened })`);
  console.log("  same side twice", JSON.stringify(s));
  ok(s.rc && Math.max(...s.rc.c) >= 0.95 * s.rc.n && Math.min(...s.rc.c) === 0 && Math.abs(s.sn - 0.6) < 0.01 && s.opened === n0, "the same side plowed twice (out, and back on the wrong side) does not open it");
  ok(/this side 100%, the other side 0%/.test(s.hint), "and the hint says which side is left: " + s.hint);
  await ev(`__put(${kid}, ${K.i * SEG + 200}, -1, 1.5); true`); await waitGame(0.4);
  const rOther = await J(`TLXPL.rt(TLXV.state().cur).road`);                  // (the hint there is about the wheels: the truck was set down in the uncut side's snow)
  ok(rOther && rOther.mine === 0 && rOther.other === 1 && rOther.name === K.name, "turned round on the other side it reads the other way: " + JSON.stringify(rOther));
  // new snow wipes the marks
  await ev(`TLXR.setSnow(${kid}, 0.75, ${K.i}); true`);
  await pup(K.id, K.i * SEG + 4, K.i * SEG + 44, 1.5);
  s = await J(`__rc(${kid}, ${K.i})`); console.log("  after new snow + 40 m", JSON.stringify(s));
  ok(s && s.c[0] + s.c[1] <= 5 && Math.abs(s.s0 - 0.75) < 0.01, "new snow on the stretch (0.6 -> 0.75) wipes the marks: only the 40 m just cut count");
  // the council's plow clears it: the marks are dropped, nothing is credited
  await ev(`TLXR.setSnow(${kid}, 0, ${K.i}); true`);
  await pup(K.id, K.i * SEG + 44, K.i * SEG + 84, 1.5);
  s = await J(`({ rc: __rc(${kid}, ${K.i}), opened: TLX.state("plow").opened, hint: TLXPL.hint() })`);
  ok(s.rc === null && s.opened === n0 && !/this side/.test(s.hint), "a stretch the council's plow has cleared: marks dropped, nothing counted, nothing in the hint");
  // a little snow, not shut: both sides -> "You've plowed"
  await ev(`TLXR.setSnow(${kid}, 0.2, ${K.i}); true`); await clearToasts();
  ok((await ev(`TLXR.status(${kid})`)) === "open", "a stretch at 0.2 is not shut");
  await pup(K.id, K.i * SEG + 4, (K.i + 1) * SEG - 4, 1.5); await pup(K.id, (K.i + 1) * SEG - 4, K.i * SEG + 4, 1.5);
  await sleep(300);
  s = await J(`({ rc: __rc(${kid}, ${K.i}), sn: __rt(${kid}).st.s[${K.i}], opened: TLX.state("plow").opened })`); let t = await toasts();
  console.log("  0.2, both sides", JSON.stringify(s), JSON.stringify(t));
  ok(s.sn === 0 && s.rc === null && s.opened === n0 + 1, "plowed out and back, its snow is 0 and it is counted");
  ok(t.filter(m => m.includes(K.name)).length === 1 && t.some(m => /^You've plowed the .+, km \d+\.\d to \d+\.\d\.$/.test(m)), "with the plain line, once: " + JSON.stringify(t.filter(m => m.includes(K.name))));
  // a shut stretch opened while another on the same road stays shut
  if (K.i + 2 < await ev(`__rt(${kid}).seg.length`) || K.i >= 2) {
    const o = K.i >= 2 ? K.i - 2 : K.i + 2;
    await ev(`TLXR.setSnow(${kid}, 0.6, ${K.i}); TLXR.setSnow(${kid}, 0.6, ${o}); true`); await clearToasts();
    await pup(K.id, K.i * SEG + 4, (K.i + 1) * SEG - 4, 1.5); await pup(K.id, (K.i + 1) * SEG - 4, K.i * SEG + 4, 1.5); await sleep(300);
    t = await toasts(); const st = await ev(`TLXR.status(${kid})`);
    ok(st === "snowed in" && t.some(m => /^You've opened the .+, km .+\. More of it is still snowed in\.$/.test(m)), "one of two shut stretches opened: the line says more is still snowed in (" + JSON.stringify(t.filter(m => m.includes(K.name))) + ")");
    await ev(`TLXR.setSnow(${kid}, 0, ${o}); true`);
  }
  // marks in hand, then a reload: the count stays, the marks do not
  await ev(`TLXR.setSnow(${kid}, 0.6, ${K.i}); true`); await pup(K.id, K.i * SEG + 4, K.i * SEG + 104, 1.5);
  const before = await J(`({ rc: __rc(${kid}, ${K.i}), opened: TLX.state("plow").opened })`);
  await blade(false); await ev(`save(); true`);
  await reload(); await ev(SETUP); await sleep(500); await ev(KIT);
  const after = await J(`({ n: TLXPL.road.size, opened: TLX.state("plow").opened, sn: __rt(${kid}).st.s[${K.i}], has: !!TLXPL.bladeOf(${JSON.stringify(uid)}) })`);
  console.log("  reload", JSON.stringify(before), JSON.stringify(after));
  ok(before.rc && before.rc.c[0] + before.rc.c[1] >= 8 && after.n === 0, "a reload forgets the marks (they are not saved)");
  ok(after.opened === before.opened && after.has && Math.abs(after.sn - 0.6) < 0.01, "and keeps the count, the blade and the road's snow");
});

if (process.env.DEEP) await section("F a stretch drifted level (0.9), printed", async () => {
  await ev(`TLXPL.road.clear(); TLXR.setSnow(${aid}, 0, ${A.i}); true`); await waitGame(0.3);
  const o = A.i >= 2 ? A.i - 1 : A.i + 1;                                       // a stretch whose cells were never loaded at a lower level
  await ev(`TLXR.setSnow(${aid}, 0.9, ${o}); __put(${aid}, ${o * SEG - 30}, 1, 1.5); true`); await waitGame(1.0);
  console.log("  [d, f] across at its middle:", JSON.stringify(await J(`__across(${aid}, ${o * SEG + 200})`)));
  await blade(true); await clearToasts();
  const r = await drive(A.id, 1, 1.5, 150, async s => s.s > (o + 1) * SEG + 14);
  console.log("  0.9:", JSON.stringify(r), JSON.stringify(await J(`__rc(${aid}, ${o})`)), JSON.stringify(await toasts()), "|", await ev(`TLXPL.hint()`));
  if (r.stopped) ok(/blade|snow/i.test(r.why) || (await toasts()).some(m => /blade/i.test(m)), "stopped in it, and it says why: " + r.why);
});

console.log(fails ? `${fails} FAILED` : "ALL PASSED");
await done(fails ? 1 : 0);
