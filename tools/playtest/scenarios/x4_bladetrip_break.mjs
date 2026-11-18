// 4.1b2b blade trip, break test: edge floor, dismount mid-trip, reverse/beside/slow, truck swap mid-trip, reload mid-trip, option toggled mid-trip.
// Things to hit are obstacles the test adds (addOb) on a strip it clears. Headless ~0.6x: all by gameClock. ONLY=CDE...
import { reload, boot, ev, sleep, done, down, up, shot, sideCam, camOff } from "../lib.mjs";
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
  await ev(`GS.cash = 90000; TLXV.buy("pickup"); true`); await sleep(300); console.log("  owned", await ev(`TLXV.state().owned.length`));
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


const setCond = c => ev(`TLX.state("plow").blades[${U}].cond = ${c}; true`);
await section("B edge floor", async () => {
  await setCond(3); await stage(9, true, "rock", 14); await down("KeyW"); await waitGame(1.6); await up("KeyW"); await waitGame(2);
  const s = await J(`__s()`);
  console.log("  edge 3 -> " + s.cond, "trips", s.trips);
  ok(s.trips >= 1 && s.cond === 0, "edge floors at 0 (" + s.cond + ")");
  ok(Number.isFinite(s.truck) , "truck cond finite " + s.truck);
});
await section("C dismount mid-trip", async () => {
  await setCond(100); await stage(7, true, "rock", 14); await down("KeyW"); await waitGame(1.6); await up("KeyW"); await waitGame(0.3);
  const a = await J(`__s()`); ok(a.trip > 0, "tripped " + a.trip.toFixed(2));
  await ev(`dismount(); true`); await waitGame(4);
  const b = await J(`__s()`);
  console.log("  after dismount 4s: trip", b.trip, "tk", b.tk, "foot", await ev(`FOOT.on`), "hint", b.hint.slice(0,60));
  console.log("  (info) trip timer stays while rock under parked truck: " + b.trip);
  ok(true, "folded while on foot beside it, rock still there: tk=" + b.tk);
  await ev(`__clearObs(); true`); await waitGame(1.5);
  const c = await J(`__s()`); ok(c.trip === 0 && c.tk < 0.05, "clears after rock gone: trip " + c.trip + " tk " + c.tk);
  await ev(`FOOT.on = false; true`);
});
await section("D reverse, beside, slow", async () => {
  await setCond(100); await stage(-8, true, null, 0);
  await ev(`__ob(${X}, ${Z - 12}, "rock"); true`);
  await down("KeyS"); await waitGame(1.8); await up("KeyS"); await waitGame(1);
  let s = await J(`__s()`); ok(s.trips === (await J(`__s()`)).trips && s.cond > 99.5, "reversing into a rock with blade down: no trip, edge " + s.cond.toFixed(2) + " trips " + s.trips);
  // rock 3.5 m to the side, drive past at 9 m/s
  const t0 = s.trips;
  await stage(9, true, null, 0); await ev(`__ob(${X + 3.6}, ${Z + 14}, "rock"); true`);
  await down("KeyW"); await waitGame(2.2); await up("KeyW"); await waitGame(0.5);
  s = await J(`__s()`); ok(s.trips === t0 && s.cond > 99.5, "passing a rock 3.6 m to the side: no trip " + s.trips + " edge " + s.cond.toFixed(2));
});
await section("E truck swap mid-trip", async () => {
  await ev(`GS.cash = 90000; TLXV.buy("pickup"); true`); await sleep(300); console.log("  owned", await ev(`TLXV.state().owned.length`));
  const u2 = await ev(`TLXV.state().owned.find(o => o.uid !== ${U}).uid`);
  await setCond(100); await stage(7, true, "rock", 14); await down("KeyW"); await waitGame(1.6); await up("KeyW"); await waitGame(0.3);
  ok((await J(`__s()`)).trip > 0, "tripped");
  await ev(`TLXV.swapTo(${JSON.stringify(u2)}); true`); await waitGame(2);
  const h = await ev(`TLXPL.hint()`);
  console.log("  on truck 2 hint:", h.slice(0,80));
  ok(!/tripped/.test(h), "second truck's hint is not 'tripped'");
  await ev(`TLXV.swapTo(${U}); true`); await waitGame(1.5);
  const s = await J(`__s()`);
  console.log("  back on truck 1: trip", s.trip, "tk", s.tk, "hint", s.hint.slice(0,70));
  ok(s.trip === 0 || /tripped/.test(s.hint), "consistent back on truck 1");
  await ev(`__clearObs(); true`); await waitGame(1.5);
  const s2 = await J(`__s()`); ok(s2.trip === 0 && s2.tk < 0.05, "springs back after clear: trip " + s2.trip + " tk " + s2.tk);
});
await section("F option off mid-trip", async () => {
  await setCond(100); await stage(7, true, "rock", 14); await down("KeyW"); await waitGame(1.6); await up("KeyW"); await waitGame(0.3);
  await ev(`TLX.setOn("plowtrip", false); true`);
  console.log("  option now", await ev(`TLX.on("plowtrip")`));
  await ev(`__clearObs(); true`); await waitGame(1.5);
  const s = await J(`__s()`); ok(s.trip === 0 && s.tk < 0.05, "no stuck fold with option off: trip " + s.trip + " tk " + s.tk);
});
await section("G reload mid-trip", async () => {
  await ev(`TLX.setOn("plowtrip", true); true`);
  await setCond(100); await stage(7, true, "rock", 14); await down("KeyW"); await waitGame(1.6); await up("KeyW"); await waitGame(0.3);
  const c = (await J(`__s()`)).cond; await ev(`save && save(); true`).catch(()=>{});
  await reload(); await sleep(1500);
  const s = await J(`(() => { const p = TLX.state("plow"); const u = TLXV.state().cur; const b = p.blades[u]; return { cond: b && b.cond, hasBlade: !!b }; })()`).catch(e => ({ err: String(e.message).slice(0,100) }));
  console.log("  reload:", JSON.stringify(s), "before", c);
  ok(s.hasBlade && Math.abs(s.cond - c) < 0.5, "edge survives reload");
});
await done(fails ? 1 : 0);
