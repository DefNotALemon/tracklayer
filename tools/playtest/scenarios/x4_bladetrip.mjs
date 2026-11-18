// Expansion slice 4.1b2b: the blade is solid, trips and is heard (tlx-plow.js, TLXV.addHull). Asserts, exit 1 on a failure.
//   A the option and the hull circle (none without a blade); B solid: a post just ahead of the bumper pushes a bladed
//   truck back and leaves a bladeless one alone; C the trip: blade down at speed into a rock: one trip, the truck keeps
//   BL.tripKeep of its speed, the edge loses 2-8 points by the speed, a line and the hint say so, the mouldboard folds,
//   the rock passes under it to the bumper, it stays folded there and springs back once clear; D slower than BL.tripV:
//   no trip, the truck stops at the blade; E option off: no trip at speed; F blade up: no trip; a post: no trip; a log
//   and a parked car (car index 0) trip it and are named; G the scrape: silent up or standing, louder with speed,
//   higher on bare ground than in 30 cm, a clunk on the drop and on the lift; H sparks on a scraped road stretch only.
// Things to hit are obstacles the test adds (addOb) on a strip it clears. Headless ~0.6x: all by gameClock. ONLY=CDE...
import { boot, ev, sleep, done, down, up, shot, sideCam, camOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(100); }
const ONLY = process.env.ONLY, NOSTILLS = !!process.env.NOSTILLS;
const section = async (n, f) => { if (ONLY && n[0] !== "A" && !ONLY.includes(n[0])) return; console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80); return true; })()`);
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 9000; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`;
const kit = () => ev(`(() => {
  if (!window.__F) { const fb0 = freshBase; window.__F = []; freshBase = (ix, iz) => { const F = window.__F, x = ix * CELL - HALF, z = iz * CELL - HALF; for (let i = F.length - 1; i >= 0; i--) { const q = F[i]; if (x >= q[0] && x <= q[1] && z >= q[2] && z <= q[3]) return q[4]; } return fb0(ix, iz); }; }
  window.__field = (x0, x1, z0, z1, dep) => { window.__F.push([x0 - 0.01, x1 + 0.01, z0 - 0.01, z1 + 0.01, dep]); for (let iz = Math.ceil((z0 + HALF) / CELL); iz <= Math.floor((z1 + HALF) / CELL); iz++) for (let ix = Math.ceil((x0 + HALF) / CELL); ix <= Math.floor((x1 + HALF) / CELL); ix++) {
    const c = getChunk(ix >> 5, iz >> 5), k = (iz & 31) * CH + (ix & 31), d0 = c.d[k]; c.f[k] = dep; c.d[k] = dep; if (c.g) c.g[k] = 0; writeCell(ix, iz, d0, dep, dep); } return true; };
  window.__B = () => TLXPL.rt(TLXV.state().cur);
  window.__put = (x, z, yaw = 0, v = 0) => { BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; crashCancel(); FOOT.on = false; P.x = x; P.z = z; P.yaw = yaw; P.vy = 0; P.vx = Math.sin(yaw) * v; P.vz = Math.cos(yaw) * v; P.y = surf(x, z); recenter(x, z, true); camState.init = false; const B = __B(); B.last = null; B.carry = 0; B.full = false; return true; };
  window.__obs = [];
  window.__ob = (x, z, kind, r = 0.6) => { const o = { x, z, r, top: kind === "post" ? 1e9 : surf(x, z) + 0.7 }; if (kind === "rock") o.rock = true; else if (kind === "log") o.log = true; else if (kind === "car") o.car = 0; addOb(o); __obs.push(o); return true; };
  window.__clearObs = () => { for (const o of __obs) dropOb(o); __obs.length = 0; return true; };
  window.__vf = () => P.vx * Math.sin(P.yaw) + P.vz * Math.cos(P.yaw);
  window.__recOn = false; window.__rec = [];
  setInterval(() => { if (!window.__recOn || !VEH.cur) return; const B = __B(); window.__rec.push([+gameClock.toFixed(3), +P.z.toFixed(3), +__vf().toFixed(3), +(B.trip || 0).toFixed(3), +(B.tk || 0).toFixed(3), B.S ? +B.S.rotation.x.toFixed(3) : 0]); }, 15);
  window.__s = () => { const p = TLX.state("plow"), u = TLXV.state().cur, b = p.blades[u], B = __B(), R = TLXV.rt(); return { cond: b ? b.cond : null, trips: B.trips || 0, trip: B.trip || 0, tk: B.tk || 0, rx: B.S ? B.S.rotation.x : 0, clunks: B.clunks || 0, sparks: B.sparks || 0, scr: B.scr || 0, cut: B.cut || 0, z: P.z, x: P.x, v: __vf(), truck: R.rec.cond, hint: TLXPL.hint(), snd: TLXPL.snd(), down: B.down, k: B.k, what: B.tripWhat || "", at: B.tripAt || 0 }; };
  return true; })()`);

await boot();
await ev(SETUP); await sleep(600); await kit();

let uid = null, spot = null, U = null, BL = null, H = null;
await section("A the option and the hull", async () => {
  ok(await ev(`TLX.on("plowtrip") === true`), "option plowtrip exists and is on by default");
  await ev(`TLXV.buy("pickup"); true`); await sleep(300);
  uid = await ev(`TLXV.state().owned[0].uid`); U = JSON.stringify(uid);
  await ev(`(() => { TLXV.swapTo(${U}); FOOT.on = false; return true; })()`); await sleep(600);
  ok(await ev(`!!TLXV.addHull && TLXV.hullOf(TLXV.rt()) === null`), "a bladeless pickup has no extra hull circle");
  await ev(`TLXPL.fit(${U}, "b23"); true`); await sleep(300);
  H = await J(`(() => { const h = TLXV.hullOf(TLXV.rt()); return h ? { off: h.off, r: h.r } : null; })()`);
  BL = await J(`TLXPL.BL`);
  console.log("  hull circle", JSON.stringify(H), "tunables", JSON.stringify({ tripV: BL.tripV, tripKeep: BL.tripKeep, tripPts: BL.tripPts, tripT: BL.tripT }));
  ok(H && H.r > 1.0 && H.r < 1.2 && Math.abs(H.off + H.r - 3.75) < 0.01, "fitted: one more hull circle, " + (H && (H.r * 2).toFixed(2)) + " m across, reaching " + (H && (H.off + H.r).toFixed(2)) + " m ahead of the truck's middle (the bumper is at 2.98)");
  ok(await ev(`!!VEH.cur && !FOOT.on && TLXV.state().cur === ${U}`), "seated in the pickup, the blade fitted");
  spot = await J(`(() => { for (let r = 150; r < 3600; r += 41) for (let a = 0; a < 6.28; a += 0.19) { const x = depot.x + Math.cos(a) * r, z = depot.z + Math.sin(a) * r; let bad = false;
    for (let k = -10; k <= 100 && !bad; k += 10) for (const sx of [-12, -6, 0, 6, 12]) if (isSea(x + sx, z + k) || isWater(x + sx, z + k) || obNear(x + sx, z + k, 7) || slopeAt(x + sx, z + k, 8) > 0.03 || yardAt(x + sx, z + k) > 0.02 || bioAt(x + sx, z + k) === 1) { bad = true; break; }
    if (!bad && Math.abs(groundAt(x, z) - groundAt(x, z + 80)) < 1.2 && (!window.TLXR || TLXR.near(x, z + 40).d > 70)) return { x, z }; } return null; })()`);
  ok(!!spot, "a flat open strip: " + JSON.stringify(spot));
});
if (!spot || !uid || !H) await done(1);
const X = spot.x, Z = spot.z, REACH = H.off + H.r, BUMP = 2.98;
// a cleared strip (6 cm) to drive on, the truck at its start doing v m/s, blade as asked, one thing `ahead` m ahead
const stage = async (v, bladeDown, kind, ahead, r = 0.6) => {
  await ev(`__clearObs(); __F.length = 0; __field(${X - 6}, ${X + 6}, ${Z - 10}, ${Z + 70}, 0.06); __put(${X}, ${Z}, 0, 0); (() => { const B = __B(); B.down = ${bladeDown}; B.k = ${bladeDown ? 1 : 0}; B.trip = 0; B.tk = 0; B.tripSaid = undefined; return true; })()`);
  await waitGame(0.5);
  if (kind) await ev(`__ob(${X}, ${Z + ahead}, "${kind}", ${r}); true`);
  await ev(`__put(${X}, ${Z}, 0, ${v}); (() => { const B = __B(); B.down = ${bladeDown}; B.k = ${bladeDown ? 1 : 0}; return true; })(); window.__rec = []; window.__recOn = true; true`);
};
const runAt = async (v, bladeDown, kind, { ahead = 14, keys = true, secs = 4.5 } = {}) => {
  const a0 = await J(`__s()`); await clearToasts();
  await stage(v, bladeDown, kind, ahead); const a = await J(`__s()`);
  if (keys) await down("KeyW"); await waitGame(1.6); if (keys) await up("KeyW");
  const mid = await J(`__s()`); await waitGame(secs - 1.6);
  const b = await J(`__s()`); await ev(`window.__recOn = false; true`);
  const rec = await J(`window.__rec`), ts = await toasts();
  return { a0, a, mid, b, rec, ts, rockZ: Z + ahead };
};
// from the recorder: the speed just before and just after the first frame the trip shows
const tripEdge = rec => { const i = rec.findIndex(q => q[3] > 0); if (i < 1) return null; let vb = 0; for (let k = Math.max(0, i - 6); k < i; k++) vb = Math.max(vb, rec[k][2]); return { before: vb, after: rec[i][2], z: rec[i][1], maxFold: Math.max(...rec.map(q => q[5])) }; };
// the edge "as it was": the strip's 6 cm of snow wears it a few hundredths of a point on the way (4.1b2a); a trip costs 2 or more
const kept = r => r.a.cond - r.b.cond < 0.1;

await section("B the blade is solid", async () => {
  // a post whose near side is 3.3 m ahead: past the bumper (2.98), inside the blade's reach
  await stage(0, false, null, 0); const ahead = 3.3 + 0.3;
  await ev(`(() => { const s = TLX.state("plow"); window.__keep = s.blades[${U}]; delete s.blades[${U}]; return true; })()`);
  await ev(`__ob(${X}, ${Z + ahead}, "post", 0.3); true`); await waitGame(0.6);
  const n = await J(`__s()`);
  await ev(`TLX.state("plow").blades[${U}] = window.__keep; true`); await waitGame(0.6);
  const w = await J(`__s()`);
  ok(Math.abs(n.z - Z) < 0.08, `no blade: a post 3.3 m ahead does not touch the truck (moved ${(n.z - Z).toFixed(2)} m)`);
  ok(Z - w.z > 0.3 && Math.abs((Z + ahead - 0.3 - w.z) - REACH) < 0.12, `blade fitted (up): the same post pushes it back ${(Z - w.z).toFixed(2)} m, to the blade's reach (${(Z + ahead - 0.3 - w.z).toFixed(2)} m from the post's face)`);
  ok(w.trips === 0 && w.cond === 100, "standing against a post: no trip, the edge untouched");
});

let condNow = 100;
await section("C the trip", async () => {
  const r = await runAt(7, true, "rock");
  const e = tripEdge(r.rec);
  console.log(`  into a rock at ${r.b.at.toFixed(2)} m/s: trips ${r.b.trips}, speed ${e && e.before.toFixed(2)} -> ${e && e.after.toFixed(2)}, edge ${r.a.cond} -> ${r.b.cond.toFixed(2)}, fold ${e && e.maxFold.toFixed(2)} rad, truck ${r.a.truck} -> ${r.b.truck.toFixed(1)}%, rests ${(r.rockZ - 0.6 - r.b.z).toFixed(2)} m from the rock's face`);
  ok(r.b.trips - r.a.trips === 1, "one trip (" + (r.b.trips - r.a.trips) + ")");
  ok(r.b.at > BL.tripV + 0.5, "it met the rock at over the trip speed (" + r.b.at.toFixed(2) + " m/s)");
  ok(!!e && e.after < e.before * (BL.tripKeep + 0.12) && e.after > e.before * (BL.tripKeep - 0.2), `the truck is checked, not stopped: it keeps about ${BL.tripKeep} of its speed (${e && (e.after / e.before).toFixed(2)})`);
  const want = Math.min(BL.tripPts[2], BL.tripPts[0] + BL.tripPts[1] * (r.b.at - BL.tripV)), lost = r.a.cond - r.b.cond;
  ok(lost >= 2 && lost <= 8 && Math.abs(lost - want) < 0.05, `the cutting edge lost ${lost.toFixed(2)} points (2 + 0.75 a m/s over ${BL.tripV}: ${want.toFixed(2)})`);
  const line = r.ts.find(t => /tripped on a rock at \d+ km\/h/.test(t));
  ok(!!line && new RegExp("cutting edge is at " + Math.round(r.b.cond) + "%").test(line), "a line says so as it happens: " + line);
  ok(!!e && e.maxFold > 0.5, "the mouldboard folded forward (" + (e && e.maxFold.toFixed(2)) + " rad)");
  const gap = r.rockZ - 0.6 - r.b.z;
  ok(gap < REACH - 0.4 && gap > BUMP - 0.15, `the rock passed under the folded blade and met the bumper: the truck rests ${gap.toFixed(2)} m from its face (blade reach ${REACH.toFixed(2)}, bumper ${BUMP})`);
  ok(r.b.trip > 0 && r.b.tk > 0.9 && /tripped on a rock: back off it/.test(r.b.hint), "resting on it the blade stays folded and the hint says to back off: " + r.b.hint.slice(0, 90));
  if (!NOSTILLS) { await sideCam(); await ev(`window.camOv = c => { const tx = P.x, tz = P.z + 3.0; c.position.set(tx + 5.2, P.y + 1.5, tz + 1.2); c.lookAt(tx, P.y + 0.6, tz); }; true`); await sleep(500); await shot("x4t_tripped_side"); }
  const c0 = r.b.clunks;
  await ev(`__clearObs(); true`); await waitGame(1.2);
  const f = await J(`__s()`);
  ok(f.trip === 0 && f.tk < 0.05 && f.clunks === c0 + 1 && !/tripped/.test(f.hint), `clear of it, the blade springs back with a clunk (fold ${f.rx.toFixed(2)} rad, hint: ${f.hint.slice(0, 60)})`);
  if (!NOSTILLS) { await sleep(400); await shot("x4t_sprung_side"); await camOff(); }
  condNow = f.cond;
});

await section("D slower than the trip speed", async () => {
  const r = await runAt(3.6, true, "rock", { keys: false, ahead: 6.6 });
  const vmax = Math.max(...r.rec.map(q => q[2])), gap = r.rockZ - 0.6 - r.b.z;
  console.log(`  into a rock at up to ${vmax.toFixed(2)} m/s: trips +${r.b.trips - r.a.trips}, edge ${r.a.cond.toFixed(2)} -> ${r.b.cond.toFixed(2)}, rests ${gap.toFixed(2)} m from its face`);
  ok(vmax < BL.tripV && vmax > 1.5, "it came at under the trip speed (" + vmax.toFixed(2) + " m/s)");
  ok(r.b.trips === r.a.trips && kept(r), "no trip, the edge as it was");
  ok(gap > REACH - 0.25 && gap < REACH + 0.6, `the blade is hull: the truck stopped at the blade (${gap.toFixed(2)} m from the rock, reach ${REACH.toFixed(2)})`);
  ok(!r.ts.some(t => /tripped/.test(t)), "no trip line");
});

await section("E option off", async () => {
  await ev(`TLX.setOn("plowtrip", false); true`);
  const r = await runAt(7, true, "rock");
  const vmax = Math.max(...r.rec.map(q => q[2])), gap = r.rockZ - 0.6 - r.b.z;
  console.log(`  option off, rock at up to ${vmax.toFixed(2)} m/s: trips +${r.b.trips - r.a.trips}, edge ${r.a.cond.toFixed(2)} -> ${r.b.cond.toFixed(2)}, truck ${r.a.truck.toFixed(1)} -> ${r.b.truck.toFixed(1)}%, rests ${gap.toFixed(2)} m off`);
  ok(vmax > BL.tripV + 0.5 && r.b.trips === r.a.trips && kept(r) && r.b.trip === 0, "off: no trip at speed, the edge as it was");
  ok(gap > REACH - 0.25 && gap < REACH + 1.5 && !r.ts.some(t => /tripped/.test(t)), "off: the truck stops against the rock at the blade, no trip line");
  await ev(`TLX.setOn("plowtrip", true); true`);
  ok(await ev(`TLX.on("plowtrip")`), "option back on");
});

await section("F what trips it", async () => {
  let r = await runAt(7, false, "rock");
  ok(r.b.trips === r.a.trips && kept(r), "blade UP into a rock at speed: no trip, the edge as it was");
  r = await runAt(7, true, "post");
  ok(r.b.trips === r.a.trips && kept(r) && r.rockZ - 0.6 - r.b.z > REACH - 0.25, "blade down into a post (a wall, a tree): no trip, the truck stops at the blade");
  r = await runAt(7, true, "log");
  ok(r.b.trips === r.a.trips + 1 && r.ts.some(t => /tripped on a log/.test(t)), "a log trips it and is named");
  await waitGame(2.6);                                                           // the trip line is said at most every 2.5 game s
  r = await runAt(7, true, "car");
  ok(r.b.trips === r.a.trips + 1 && r.ts.some(t => /tripped on a parked car/.test(t)), "a parked car (index 0) trips it and is named: " + (r.ts.find(t => /tripped/.test(t)) || r.ts.join(" | ")).slice(0, 100));
  await ev(`__clearObs(); true`);
});

await section("G the scrape and the clunk", async () => {
  await stage(0, false, null, 0); await ev(`window.__recOn = false; true`);
  const c0 = (await J(`__s()`)).clunks;
  await down("KeyW"); await waitGame(2.5); const upM = await J(`__s()`); await up("KeyW");
  ok(upM.v > 3 && upM.snd.g === 0, `blade up at ${upM.v.toFixed(1)} m/s: silent`);
  await stage(0, false, null, 0); await ev(`window.__recOn = false; __B().down = true; true`); await waitGame(0.9);
  const st = await J(`__s()`);
  ok(st.k === 1 && st.clunks === c0 + 1, "dropping it: one clunk as it lands (" + (st.clunks - c0) + ")");
  ok(st.snd.g === 0, "blade down, standing: silent");
  await down("KeyW"); await waitGame(0.9); const slow = await J(`__s()`); await waitGame(2.2); const fast = await J(`__s()`); await up("KeyW");
  console.log(`  bare strip: ${slow.v.toFixed(1)} m/s gain ${slow.snd.g.toFixed(3)} ${Math.round(slow.snd.f)} Hz; ${fast.v.toFixed(1)} m/s gain ${fast.snd.g.toFixed(3)} ${Math.round(fast.snd.f)} Hz; audio ${await ev("!!audio")}, voice ${fast.snd.voice}`);
  ok(slow.snd.g > 0 && fast.v > slow.v + 1 && fast.snd.g > slow.snd.g * 1.2 && fast.snd.f > slow.snd.f, "blade down on bare ground: a scrape, louder and higher with speed");
  ok(fast.snd.g <= BL.sndG * 1.61, "never over its ceiling");
  if (await ev("!!audio")) ok(fast.snd.voice, "the voice is on the game's audio"); else console.log("  (no audio context in this run: the voice is not built, numbers only)");
  // 30 cm of snow: duller and quieter at a like speed
  await ev(`__F.length = 0; __field(${X - 6}, ${X + 6}, ${Z - 10}, ${Z + 70}, 0.3); __field(${X - 6}, ${X + 6}, ${Z - 10}, ${Z + 5}, 0.06); __put(${X}, ${Z}, 0, 0); __B().down = true; true`); await waitGame(0.6);
  await down("KeyW"); await waitGame(3.4); const deep = await J(`__s()`); await up("KeyW");
  console.log(`  30 cm: ${deep.v.toFixed(1)} m/s cutting ${(deep.cut * 100).toFixed(0)} cm gain ${deep.snd.g.toFixed(3)} ${Math.round(deep.snd.f)} Hz`);
  ok(deep.cut > 0.15 && deep.snd.g > 0 && deep.snd.f < fast.snd.f - 800, `into 30 cm the scrape is duller (${Math.round(deep.snd.f)} Hz against ${Math.round(fast.snd.f)})`);
  ok(deep.snd.g / Math.min(1, deep.v / 9) < 0.75 * fast.snd.g / Math.min(1, fast.v / 9), "and quieter for its speed: the snow is between the edge and the ground");
  const c1 = (await J(`__s()`)).clunks; await ev(`__put(${X}, ${Z}, 0, 0); __B().down = false; true`); await waitGame(0.9);
  const lf = await J(`__s()`);
  ok(lf.k === 0 && lf.clunks === c1 + 1 && lf.snd.g === 0, "lifting it: a clunk against its stop, then silence");
});

await section("H sparks on a scraped road", async () => {
  const JAN = 24 * 65 + 11;
  await ev(`GS.hour = ${JAN}; true`); await sleep(1500);
  const L = await J(`(() => { for (const r of TLXR.routes) { if (!r.st) continue; const p = r.pts;
    for (let i = 0; i < p.length - 1; i++) { let j = i + 1, len = 0; while (j < p.length && (len = Math.hypot(p[j][0] - p[i][0], p[j][1] - p[i][1])) < 170) j++; if (j >= p.length) break;
      const ux = (p[j][0] - p[i][0]) / len, uz = (p[j][1] - p[i][1]) / len; let dev = 0; for (let k = i + 1; k < j; k++) dev = Math.max(dev, Math.abs((p[k][0] - p[i][0]) * uz - (p[k][1] - p[i][1]) * ux));
      const g = Math.abs(groundAt(p[j][0], p[j][1]) - groundAt(p[i][0], p[i][1])) / len; if (dev > 0.35 || g > 0.03) continue;
      if (YARDS.some(o => !o.k && (Math.hypot(o.x - p[i][0], o.z - p[i][1]) < 60 || Math.hypot(o.x - p[j][0], o.z - p[j][1]) < 60))) continue;
      if (isWater(p[i][0], p[i][1]) || obNear(p[i][0], p[i][1], 8)) continue;
      return { id: r.id, x: p[i][0], z: p[i][1], ux, uz, len }; } } return null; })()`);
  ok(!!L, "a straight flat road leg: " + JSON.stringify(L && { id: L.id, len: Math.round(L.len) }));
  if (!L) return;
  const yaw = Math.atan2(L.ux, L.uz), px = L.uz, pz = -L.ux, sx = L.x + L.ux * 20 - px * 1.6, sz = L.z + L.uz * 20 - pz * 1.6;
  const pass = async ago => {
    await ev(`__clearObs(); __F.length = 0; TLXR.setPlowed("${L.id}", ${ago}); __put(${sx}, ${sz}, ${yaw}, 0); __B().down = true; __B().k = 1; true`); await waitGame(0.6);
    const a = await J(`__s()`); await down("KeyW"); await waitGame(4); const b = await J(`__s()`); await up("KeyW"); await waitGame(0.3);
    return { a, b, n: b.sparks - a.sparks, m: Math.hypot(b.x - a.x, b.z - a.z) };
  };
  const fresh = await pass(1);
  console.log(`  plowed an hour ago, January: scraped ${fresh.b.scr.toFixed(2)}, ${fresh.n} sparks over ${fresh.m.toFixed(1)} m, scrape ${Math.round(fresh.b.snd.f)} Hz gain ${fresh.b.snd.g.toFixed(3)}`);
  ok(fresh.b.scr > 0.5 && fresh.n >= 8, `blade down along a scraped stretch: sparks off the cutting edge (${fresh.n})`);
  ok(fresh.n < fresh.m * BL.sparkN * 1.3 + 6, "about " + BL.sparkN + " a metre at most");
  if (!NOSTILLS) { await ev(`GS.hour = ${JAN + 11}; __put(${sx}, ${sz}, ${yaw}, 0); __B().down = true; __B().k = 1; true`); await sleep(900); await ev(`TLXR.setPlowed("${L.id}", 1); true`);
    await sideCam(); await ev(`window.camOv = c => { const f = [Math.sin(P.yaw), Math.cos(P.yaw)], tx = P.x + f[0] * 3, tz = P.z + f[1] * 3; c.position.set(tx + f[1] * 5 + f[0] * 3, P.y + 1.4, tz - f[0] * 5 + f[1] * 3); c.lookAt(tx, P.y + 0.4, tz); }; true`);
    await down("KeyW"); await waitGame(2.2); await shot("x4t_sparks_night"); await up("KeyW"); await camOff(); await ev(`GS.hour = ${JAN}; true`); await sleep(900); }
  const old = await pass(30);
  console.log(`  plowed 30 h ago: scraped ${old.b.scr.toFixed(2)}, ${old.n} sparks over ${old.m.toFixed(1)} m, scrape ${Math.round(old.b.snd.f)} Hz`);
  ok(old.b.scr === 0 && old.n === 0 && old.m > 8, "the same road once the scrape has worn off: no sparks");
  ok(fresh.b.snd.f > old.b.snd.f + 500, "and the scrape rings higher on the scraped stretch");
  const upP = await (async () => { await ev(`TLXR.setPlowed("${L.id}", 1); __put(${sx}, ${sz}, ${yaw}, 0); __B().down = false; __B().k = 0; true`); await waitGame(0.5); const a = await J(`__s()`); await down("KeyW"); await waitGame(3); const b = await J(`__s()`); await up("KeyW"); return b.sparks - a.sparks; })();
  ok(upP === 0, "blade up on the scraped stretch: no sparks");
});

console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
await done(fails ? 1 : 0);
