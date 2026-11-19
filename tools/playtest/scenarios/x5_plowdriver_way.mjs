// Expansion slice 5.4b2b: a driver in YOUR truck drives it from its parking spot to the road and back
// (tlx-plow.js v28, tlx-roads.js v15). Asserts, exit 1 on a failure.
//   A the line: from the truck's spot to the first end of the road it plows; it starts on the spot, ends on the road's
//     first end, is never in water, keeps clear of walls and trees, keeps to plowed ground; every contract road has one
//     from the forecourt (by road where the road starts in another place); a spot across town gives a line round the houses.
//   B you far away, the clock's pace: just after setting out the truck is ON the line (not on the road), the pin and the
//     cards say so, the driver's word says so; the trip's diesel is the road's plus the line there and back; home: a = 0.
//   C you beside the line: the truck leaves from its own spot, follows the line (never off it, never in a wall), at no more
//     than PDR.wayV, comes onto the road and goes on up it; watching costs no warning.
//   D heading in with you standing on its spot: it stops short of you and says so; step clear and it parks on the spot.
//   E a reload on the line: the metres driven are kept, the truck is on the line again.
//   F slept through: the diesel counts the line too. PDR.wayMax 0: on the road at once, as before.
// Stills (OUT): the truck leaving its spot, on the line in town, waiting short of its spot.
import { boot, ev, sleep, done, reload, shot, park } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const NOSTILLS = !!process.env.NOSTILLS;
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };

const SETUP = `TLXPL.PDR.bog.km = 0; /* 5.4c1: no driver bogs in this test (x5_plowdriver_stuck.mjs has that) */ tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } TLXPL.PDR.mine = 1; true`;
const KIT = `(() => {
  window.__rt = id => TLXR.routes.find(r => r.id === id);
  window.__q = (h, st) => { st = st || 0.5; for (let t = 0; t < h - 1e-6; t += st) { GS.hour += Math.min(st, h - t); TLX.state("roads").h = GS.hour; TLXPL.con.step(); } return true; };
  window.__pdr = id => { const q = TLX.state("plow").pdr[id]; return q ? JSON.parse(JSON.stringify(q)) : null; };
  window.__drv = (id, work, xp, hap) => { const m = TLX.staff.at("plow:" + id); m.tr.work = work; m.tr.temper = 0; m.xpReal = xp; m.hap = hap; m.mood = 0; m.wage = TLX.staff.fair(m); m.paidTo = GS.hour; return TLXPL.pdr.skill(m, id); };
  window.__tk = uid => { const r = TLXV.state().owned.find(q => q.uid === uid), R = TLXV.runtimeOf(uid); return r ? { out: r.out || null, fuel: r.fuel, x: r.x, z: r.z, yaw: r.yaw, vis: !!(R && R.grp.visible), gx: R ? R.grp.position.x : null, gz: R ? R.grp.position.z : null } : null; };
  window.__clean = id => { TLXR.setSnow(id, 0); const c = TLX.state("plow").con[id]; c.strikes = 0; c.cover = false; c.due = {}; c.clean = true; TLXPL.con.step(); return true; };
  window.__me = (x, z) => { crashCancel(); FOOT.on = false; if (VEH.cur) TLXV.swapTo(null); P.x = x; P.z = z; P.y = surf(x, z) + 0.2; P.vx = P.vz = P.vy = 0; P.yaw = 0; recenter(x, z, true); return true; };
  // the line of a road's truck, measured: ends, water, the least clearance past the first 7 m, the share on plowed ground
  window.__way = id => { const q = TLX.state("plow").pdr[id], A = q ? TLXPL.pdr.way(__rt(id), q) : null; if (!A) return null; let cl = 99, off = 0, n = 0, wet = 0, turn = 0;
    for (let s = 0; s <= A.len; s += 1) { const p = TLXPL.pdr.pt(A, s); n++; if (isSea(p.x, p.z) || isWater(p.x, p.z)) wet++; if (s < A.town) { if (yardAt(p.x, p.z) < 0.5) off++; if (s > 7) for (const o of obstaclesNear(p.x, p.z, 8)) { if (o.top < -1e8) continue; const d = Math.hypot(o.x - p.x, o.z - p.z) - (o.r || 0.5); if (d < cl) cl = d; } } }
    return { len: A.len, town: A.town, n: A.pts.length, a: A.pts[0], b: A.pts[A.pts.length - 1], cl, off, nTown: Math.max(1, Math.round(A.town)), wet }; };
  // how far a point is from the line
  window.__offLine = (id, x, z) => { const A = TLXPL.pdr.way(__rt(id), TLX.state("plow").pdr[id]); if (!A) return -1; let b = 1e9; for (let i = 0; i < A.pts.length - 1; i++) { const p = A.pts[i], q = A.pts[i + 1], dx = q[0] - p[0], dz = q[1] - p[1], L = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - p[0]) * dx + (z - p[1]) * dz) / L)), d = Math.hypot(p[0] + dx * t - x, p[1] + dz * t - z); if (d < b) b = d; } return b; };
  if (!window.__rh) window.__rh = setInterval(() => { try { TLX.state("roads").h = GS.hour; } catch (e) { } }, 30);
  window.__samp = id => { window.__sm = []; clearInterval(window.__smI); window.__smI = setInterval(() => { const Z = TLXPL.pdr.seen.get(id), q = TLX.state("plow").pdr[id]; if (Z && q && Number.isFinite(Z.x)) window.__sm.push([gameClock, q.a, q.p, Z.v, Z.way ? 1 : 0, +__offLine(id, Z.x, Z.z).toFixed(2), obNear(Z.x, Z.z, 0.8) ? 1 : 0, TLXPL.pdr.lost[id] || 0, Z.x, Z.z, q.st]); }, 100); return true; };
  if (!window.__camHk) { window.__camHk = true; const rr = renderer.render.bind(renderer); renderer.render = (sc, cam) => { const o = window.__cam; if (o && sc === scene) { cam.position.set(o.x, o.y, o.z); cam.lookAt(o.tx, o.ty, o.tz); cam.updateMatrixWorld(); } rr(sc, cam); }; }
  window.__look = (id, dist, h, side) => { const Z = TLXPL.pdr.seen.get(id); if (!Z || !Number.isFinite(Z.x)) { window.__cam = null; return false; } const fx = Math.sin(Z.yaw), fz = Math.cos(Z.yaw); const cx = Z.x + fx * dist * 0.75 + fz * side, cz = Z.z + fz * dist * 0.75 - fx * side; window.__cam = { x: cx, z: cz, y: Math.max(surf(cx, cz), surf(Z.x, Z.z)) + h, tx: Z.x, ty: surf(Z.x, Z.z) + 1.4, tz: Z.z }; return true; };
  return true; })()`;
const SEG = 400;
const still = async (name, rid, dist = 12, h = 5, side = 8) => { if (NOSTILLS) return; if (!(await ev(`__look(${rid}, ${dist}, ${h}, ${side})`))) return; await sleep(350); await shot(name); await ev(`window.__cam = null; true`); };

await boot();
await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 90000; GS.lic = GS.lic || {}; GS.lic.freight = true; true`);
const RID = "dyfjord", rid = JSON.stringify(RID);
const pdr = () => J(`__pdr(${rid})`);
const snow = (i, v) => ev(`TLXR.setSnow(${rid}, ${v}, ${i}); TLXPL.con.step(); true`);
let UID = "", uid = "", I = 1, SPOT0 = null, SPOT = null, W0 = null, W = null, BURN = 1;
const tk = () => J(`__tk(${uid})`);
const far = async () => { await ev(`crashCancel(); FOOT.on = false; true`); await park("P.x + 2600", "P.z + 2600"); await sleep(300); };
const setOut = async () => { await snow(I, 0.5); await ev(`__q(0.74, 0.37)`); let q = await pdr(); for (let n = 0; n < 6 && q.st === "home"; n++) { await ev(`__q(0.1, 0.1)`); q = await pdr(); } return q; };

await section("A the line", async () => {
  await ev(`TLXV.buy("plowtruck"); true`); await sleep(600);
  UID = await ev(`TLXV.state().owned.find(r => r.id === "plowtruck").uid`); uid = JSON.stringify(UID);
  BURN = await ev(`TLXV.VEHICLES.find(v => v.id === "plowtruck").burn || 1`);
  await ev(`TLXPL.con.sign(${rid}); TLX.staff.tick(); true`); await sleep(300);
  const did = await ev(`(() => { const S = TLX.state("staff"); const a = S.apps.find(a => a.place === "plow:" + ${rid}) || TLX.staff.post({ id: "plow:" + ${rid}, role: "plowdriver" }); a.tr.honest = true; a.xp = a.xpReal = 10; a.exp = GS.hour + 400; const id = a.id; TLX.staff.hire(id); return TLX.staff.at("plow:" + ${rid}).id; })()`);
  await ev(`__drv(${rid}, 1, 10, 70); TLXPL.con.step(); true`); await sleep(300);
  ok((await ev(`TLX.staff.at("plow:" + ${rid}).kit`)) === "mine" && (await ev(`TLX.staff.xact(${JSON.stringify(did)}, "a" + ${uid})`)) === true, "a driver without a truck hired, your plow truck assigned");
  I = await ev(`(() => { const r = __rt(${rid}); let b = -1; for (let i = 1; i < r.seg.length - 1; i++) if (r.seg[i].legs.length && (i + 1) * 400 + 40 <= r.len) { b = i; break; } return b; })()`);
  SPOT0 = await tk();
  // every contract road has a line from the forecourt
  const all = await J(`TLXPL.con.routes().map(r => { const A = TLXPL.pdr.way(r, { truck: ${uid}, st: "out", p: 0, a: 0 }); const e = r.pts[0], t = TLXV.state().owned.find(q => q.uid === ${uid}); let wet = 0; if (A) for (let s = 0; s <= A.len; s += 4) { const p = TLXPL.pdr.pt(A, s); if (isSea(p.x, p.z) || isWater(p.x, p.z)) wet++; } return { id: r.id, straight: Math.round(Math.hypot(e[0] - t.x, e[1] - t.z)), len: A ? Math.round(A.len) : null, town: A ? Math.round(A.town) : null, end: A ? +Math.hypot(A.pts[A.pts.length - 1][0] - e[0], A.pts[A.pts.length - 1][1] - e[1]).toFixed(2) : null, wet }; })`);
  console.log("  ", JSON.stringify(all));
  ok(all.length > 0 && all.every(w => w.len != null && w.len >= w.straight - 1 && w.end < 0.5 && w.wet === 0), "from the forecourt every contract road has a line to its first end, none of it in water (by road where the road starts elsewhere: " + all.map(w => w.id + " " + w.len + " m").join(", ") + ")");
  await ev(`TLXPL.pdr.ways.clear(); true`);
  W0 = await J(`(() => { TLX.state("plow").pdr[${rid}].st = "out"; const w = __way(${rid}); TLX.state("plow").pdr[${rid}].st = "home"; return w; })()`);
  console.log("   forecourt", JSON.stringify(W0));
  ok(W0 && Math.hypot(W0.a[0] - SPOT0.x, W0.a[1] - SPOT0.z) < 0.01 && W0.len > 8 && W0.cl > 0.6, `the forecourt line starts on the truck's spot, ${W0 && W0.len.toFixed(0)} m to the road, ${W0 && W0.cl.toFixed(1)} m clear of everything`);
  // park it across town: the furthest clear, plowed place inside the town from the road's first end whose straight line to it is walled
  SPOT = await J(`(() => { const e = __rt(${rid}).pts[0]; let best = null;
    for (let a = 0; a < 6.283; a += 0.12) for (let d = 60; d <= 150; d += 6) { const x = e[0] + Math.cos(a) * d, z = e[1] + Math.sin(a) * d;
      if (Math.hypot(x - depot.x, z - depot.z) > 105 || isSea(x, z) || isWater(x, z) || yardAt(x, z) < 0.6 || obNear(x, z, 4.2)) continue;
      let walled = 0; for (let t = 0.1; t < 0.95; t += 0.02) if (obNear(x + (e[0] - x) * t, z + (e[1] - z) * t, 1.2)) walled++;
      const sc = d + (walled ? 60 : 0); if (!best || sc > best.sc) best = { x, z, d, walled, sc }; }
    return best; })()`);
  ok(!!SPOT, "a parking place across town: " + JSON.stringify(SPOT && { d: SPOT.d, walled: SPOT.walled }));
  await ev(`(() => { const t = TLXV.state().owned.find(q => q.uid === ${uid}); t.x = ${SPOT.x}; t.z = ${SPOT.z}; t.yaw = 0.7; const R = TLXV.runtimeOf(t.uid); if (R) R.pt = undefined; return true; })()`); await sleep(400);
  W = await J(`(() => { TLX.state("plow").pdr[${rid}].st = "out"; const w = __way(${rid}); TLX.state("plow").pdr[${rid}].st = "home"; return w; })()`);
  console.log("   across town", JSON.stringify(W));
  ok(W && Math.hypot(W.a[0] - SPOT.x, W.a[1] - SPOT.z) < 0.01 && W.len >= SPOT.d - 1 && W.wet === 0, `the line from there: ${W && W.len.toFixed(0)} m for ${SPOT.d} m straight, starts on the spot, dry`);
  const e = await J(`__rt(${rid}).pts[0]`);
  ok(W && Math.hypot(W.b[0] - e[0], W.b[1] - e[1]) < 0.5, "and ends on the road's first end");
  ok(W && W.cl > 0.6, `it keeps ${W && W.cl.toFixed(2)} m clear of every wall, tree and parked car past the first 7 m`);
  ok(W && W.off / W.nTown < 0.25, `on plowed ground for all but ${W && W.off} of its ${W && W.nTown} m off the roads`);
  ok((await ev(`TLXPL.pdr.sx.err`)) === null, "no error working it out");
});

await section("B the clock's pace: on the line first, the diesel counts it", async () => {
  await far();
  await ev(`TLXV.state().owned.find(r => r.uid === ${uid}).fuel = 300; true`);
  let q = await setOut();
  ok(q.st === "out" && q.a === 0 && q.p === 0 && !!(await tk()).out, "they set out: the truck is taken, at the start of its line");
  await ev(`__q(${(W.len * 0.4 / 12000).toFixed(5)}, ${(W.len * 0.4 / 12000).toFixed(5)})`); q = await pdr();
  const pos = await J(`(() => { const p = TLXPL.pdr.pos(__rt(${rid}), TLX.state("plow").pdr[${rid}]); return { off: __offLine(${rid}, p.x, p.z), roadD: TLXR.near(p.x, p.z).d, pin: TLXPL.pdr.pins().map(p => p.name), pinOff: Math.min(...TLXPL.pdr.pins().map(q => __offLine(${rid}, q.x, q.z))), where: TLXPL.pdr.where(${rid}), say: TLXPL.pdr.say(${rid}), on: TLXPL.pdr.onWay(__rt(${rid}), TLX.state("plow").pdr[${rid}]) }; })()`);
  console.log("  ", JSON.stringify({ a: q.a, p: q.p, ...pos }));
  ok(q.p === 0 && Math.abs(q.a - W.len * 0.4) < 1 && pos.on && pos.off < 0.05, `0.4 of the line's time later it is ${q.a.toFixed(0)} m along the line, not yet on the road`);
  ok(pos.pin.length === 1 && /: DRIVING OUT$/.test(pos.pin[0]) && pos.pinOff < 0.05, "the Map pin is on the line and reads " + pos.pin[0]);
  ok(/^driving the truck out to the road, 1 stretch to plow$/.test(pos.where) && /^On my way out to the .*: 1 stretch to plow\./.test(pos.say), "the cards say \"" + pos.where + "\", the driver \"" + pos.say.slice(0, 60) + "\"");
  await ev(`__q(${(W.len / 12000 + I * SEG / 12000 + SEG / 4000 + 0.03).toFixed(4)}, 0.01)`); q = await pdr();
  ok((await ev(`__rt(${rid}).st.s[${I}]`)) === 0 && Math.abs(q.a - W.len) < 0.01, "the stretch is opened, the whole line behind them (a " + q.a.toFixed(1) + " of " + W.len.toFixed(1) + ")");
  await ev(`__q(0.4, 0.02)`); q = await pdr(); const t = await tk();
  const want = BURN * (0.5 * (2 * W.len + I * SEG + (I + 1) * SEG) + 1.2 * SEG) / 1000, road = BURN * (0.5 * (I * SEG + (I + 1) * SEG) + 1.2 * SEG) / 1000;
  console.log("  ", JSON.stringify({ q: { st: q.st, a: q.a, p: q.p }, t }));
  ok(q.st === "home" && q.a === 0 && q.p === 0 && !t.out && t.x === SPOT.x && t.z === SPOT.z, "back in: the truck is on its spot across town again");
  ok(Math.abs((300 - t.fuel) - want) < 0.12 && want - road > 0.05, `the diesel: ${(300 - t.fuel).toFixed(2)} L, the road's ${road.toFixed(2)} plus the line there and back (${(want - road).toFixed(2)})`);
});

await section("C you beside the line: it drives it", async () => {
  // stand beside the middle of the line's town part, 9 m to one side (whichever side is clear)
  const me = await J(`(() => { TLX.state("plow").pdr[${rid}].truck = ${uid}; const q = { truck: ${uid}, st: "out", p: 0, a: 0 }, A = TLXPL.pdr.way(__rt(${rid}), q), p = TLXPL.pdr.pt(A, A.town * 0.5);
    for (const f of [0.5, 0.35, 0.65, 0.2, 0.8]) for (const d of [9, -9, 13, -13, 18, -18, 24, -24]) { const p = TLXPL.pdr.pt(A, A.town * f), x = p.x - p.tz * d, z = p.z + p.tx * d; if (!obNear(x, z, 2) && !isSea(x, z) && !isWater(x, z) && __offLine(${rid}, x, z) > 7 && TLXR.near(x, z).d > 7) return { x, z, d: __offLine(${rid}, x, z) }; } return { x: p.x - p.tz * 40, z: p.z + p.tx * 40, d: 40 }; })()`);
  await ev(`__me(${me.x}, ${me.z})`); await sleep(500);
  await ev(`__clean(${rid}); TLXV.state().owned.find(r => r.uid === ${uid}).fuel = 300; true`);
  await snow(I, 0.5); await ev(`__q(0.74, 0.37); __samp(${rid})`);
  let q = await pdr(); for (let n = 0; n < 50 && q.st === "home"; n++) { await sleep(300); q = await pdr(); }
  ok(q.st === "out", "they set out with you " + Math.abs(me.d).toFixed(1) + " m from the line, out of its way");
  await sleep(700); await still("w1_leaving_the_spot", rid, 10, 4.5, 7);
  let mid = false; const t0 = Date.now();
  while (Date.now() - t0 < 200000) { await sleep(500); q = await pdr(); if (!q || q.st !== "out") break; if (!mid && q.a > W.town * 0.5) { mid = true; await still("w2_on_the_line", rid, 12, 5, 8); } if (q.p > 25) break; }
  await ev(`clearInterval(window.__smI); true`);
  const sm = await J(`window.__sm`), way = sm.filter(s => s[4] === 1 && s[10] === "out");
  const first = sm[0], maxOff = Math.max(...way.map(s => s[5])), vTown = Math.max(...way.filter(s => s[1] < W.town - 1).map(s => s[3])), wall = way.filter(s => s[6]).length, lost = Math.max(...sm.map(s => s[7]));
  let mono = true; for (let i = 1; i < way.length; i++) if (way[i][1] < way[i - 1][1] - 1e-6) mono = false;
  const tTown = way.filter(s => s[1] > 2 && s[1] < W.town - 2), dT = tTown.length > 1 ? tTown[tTown.length - 1][0] - tTown[0][0] : 0, dA = tTown.length > 1 ? tTown[tTown.length - 1][1] - tTown[0][1] : 0;
  console.log("   samples", sm.length, "on the line", way.length, JSON.stringify({ first: first && [first[1].toFixed(1), Math.hypot(first[8] - SPOT.x, first[9] - SPOT.z).toFixed(2)], maxOff, vTown: +vTown.toFixed(2), wall, lost, pace: dT ? +(dA / dT).toFixed(2) : null, q: { a: q.a, p: q.p, st: q.st } }));
  ok(first && Math.hypot(first[8] - SPOT.x, first[9] - SPOT.z) < 4, `it is first seen ${first ? Math.hypot(first[8] - SPOT.x, first[9] - SPOT.z).toFixed(1) : "?"} m from its own spot, not on the road`);
  ok(way.length > 20 && maxOff < 0.5 && mono, `it follows the line: never more than ${maxOff.toFixed(2)} m off it, always forward (${way.length} samples)`);
  ok(wall === 0, "never inside a wall or a tree (" + wall + " samples within 0.8 m of one)");
  ok(vTown <= 7 && dT > 0 && dA / dT <= 5.5 * 1.12 && dA / dT > 5.5 * 0.6, `off the roads it keeps to PDR.wayV: ${(dA / dT).toFixed(2)} m/s by the game's clock, peak ${vTown.toFixed(1)}`);
  ok(q.st === "out" && q.p > 0 && Math.abs(q.a - W.len) < 0.01, `it comes onto the road and goes on up it (p ${Math.round(q.p)} m)`);
  ok(lost > 0 && (await ev(`TLX.state("plow").con[${rid}].strikes`)) === 0, "the hours your watching cost are handed back to the road's clocks, no warning");
  const zz = await J(`(() => { const Z = TLXPL.pdr.seen.get(${rid}); return Z ? { roadD: TLXR.near(Z.x, Z.z).d, way: !!Z.way, drv: Z.R.drvBody.visible } : null; })()`);
  ok(zz && !zz.way && zz.roadD < 2.4 && zz.drv, "on the road it is in its lane, a driver at the wheel");
});

await section("D heading in with you on its spot", async () => {
  await ev(`TABLET.log.length = 0; __me(${SPOT.x}, ${SPOT.z})`); await sleep(300);
  await ev(`TLXR.setSnow(${rid}, 0); TLXPL.con.step(); true`);
  let q = await pdr(); const t0 = Date.now();
  while (Date.now() - t0 < 150000) { await sleep(600); q = await pdr(); if (!q || q.hold || q.st === "home") break; }
  await sleep(7000); q = await pdr();
  const z = await J(`(() => { const Z = TLXPL.pdr.seen.get(${rid}); return Z ? { d: Math.hypot(Z.x - ${SPOT.x}, Z.z - ${SPOT.z}), v: Z.v, off: __offLine(${rid}, Z.x, Z.z) } : null; })()`), t = await tk();
  const notes = await J(`TABLET.log.map(n => n.title + " | " + n.body)`);
  console.log("  ", JSON.stringify({ q: { st: q.st, a: q.a, p: q.p, hold: q.hold }, z, notes }));
  ok(q.st === "back" && q.hold && q.p === 0 && q.a >= 15.9 && q.a < 40 && !!t.out, `it waits ${q.a.toFixed(1)} m short of its spot while you stand on it`);
  ok(z && z.d > 8 && z.v < 0.6 && z.off < 0.5, `the truck stands ${z ? z.d.toFixed(1) : "?"} m from you, on its line`);
  ok(notes.filter(n => /is back with the .* \| Something of yours stands on its parking spot/.test(n)).length === 1, "one notification says why");
  ok(/waiting for you to move clear/.test(await ev(`TLXPL.pdr.where(${rid})`)), "and so does the card");
  await still("w3_waiting_short_of_the_spot", rid, 12, 5, 8);
  // step well clear, to the side of the line
  const side = await J(`(() => { const A = TLXPL.pdr.way(__rt(${rid}), TLX.state("plow").pdr[${rid}]), p = TLXPL.pdr.pt(A, 0); for (const d of [26, -26, 34, -34]) { const x = p.x - p.tz * d - p.tx * 14, z = p.z + p.tx * d - p.tz * 14; if (!obNear(x, z, 2) && !isSea(x, z)) return { x, z }; } return { x: p.x - p.tx * 30, z: p.z - p.tz * 30 }; })()`);
  await ev(`__me(${side.x}, ${side.z})`);
  const t1 = Date.now(); while (Date.now() - t1 < 60000) { await sleep(500); q = await pdr(); if (q.st === "home") break; }
  await sleep(600); const t2 = await tk();
  ok(q.st === "home" && q.a === 0 && !q.hold && !t2.out && t2.x === SPOT.x && t2.z === SPOT.z && t2.vis && Math.hypot(t2.gx - SPOT.x, t2.gz - SPOT.z) < 0.5, "you step clear: it drives the last metres and is parked on its spot, yours again");
  ok((await ev(`TLXPL.pdr.seen.get(${rid}) || null`)) === null && (await ev(`TLXT.extra.filter(c => c.led).length`)) === 0, "nothing left of the seen truck");
});

await section("E a reload on the line", async () => {
  await far(); await ev(`__clean(${rid})`);
  let q = await setOut();
  await ev(`__q(${(W.len * 0.3 / 12000).toFixed(5)}, ${(W.len * 0.3 / 12000).toFixed(5)}); save(); true`); q = await pdr(); const a0 = q.a;
  await reload(); await ev(SETUP); await sleep(600); await ev(KIT);
  q = await pdr(); const t = await tk();
  console.log("  ", JSON.stringify({ a0, q: q && { st: q.st, a: q.a, p: q.p } }));
  ok(q && q.st === "out" && q.a >= a0 - 0.01 && q.a < a0 + 40 && q.p === 0 && !!t.out, `the save keeps the metres driven (${a0.toFixed(1)} m of the line, ${q ? q.a.toFixed(1) : "?"} a moment after the reload) and the truck out`);
  const w2 = await J(`__way(${rid})`);
  ok(w2 && Math.abs(w2.len - W.len) < 0.5, "the line is worked out again from the truck's spot, the same " + (w2 ? w2.len.toFixed(1) : "?") + " m");
  const p = await J(`TLXPL.pdr.pos(__rt(${rid}), TLX.state("plow").pdr[${rid}])`);
  await ev(`__me(${p.x} + 14, ${p.z} + 9)`); await sleep(1800);
  const z = await J(`(() => { const Z = TLXPL.pdr.seen.get(${rid}); return Z ? { way: !!Z.way, off: __offLine(${rid}, Z.x, Z.z), vis: Z.R.grp.visible, roadD: TLXR.near(Z.x, Z.z).d } : null; })()`);
  ok(z && z.way && z.off < 0.5 && z.vis, "and it is drawn on the line again, " + JSON.stringify(z));
  ok((await ev(`TLXPL.pdr.sx.err`)) === null, "no error in the seen-truck step");
});

await section("F slept through; and with no line", async () => {
  await far(); await ev(`__clean(${rid}); __q(1.2, 0.05)`);
  let q = await pdr(); ok(q.st === "home" && !(await tk()).out, "in again");
  const sleepRun = async () => { await ev(`__clean(${rid}); TLXV.state().owned.find(r => r.uid === ${uid}).fuel = 300; __drv(${rid}, 1, 10, 70); true`); await snow(I, 0.5); await ev(`GS.hour += 9; true`); await sleep(400); await ev(`TLXPL.con.step(); true`); await sleep(300); await ev(`TLXPL.con.step(); true`); return { f: 300 - (await tk()).fuel, s: await ev(`__rt(${rid}).st.s[${I}]`), q: await pdr() }; };
  const withWay = await sleepRun();
  await ev(`TLXPL.PDR.wayMax = 0; true`);
  const noWay = await sleepRun();
  const want = 2 * W.len / 1000 * BURN * 0.5;
  console.log("  ", JSON.stringify({ withWay: withWay.f, noWay: noWay.f, want }));
  ok(withWay.s === 0 && noWay.s === 0 && withWay.q.st === "home" && withWay.q.a === 0, "a 9 h sleep: the stretch is open either way, they are in");
  ok(Math.abs((withWay.f - noWay.f) - want) < 0.03, `the sleep's diesel counts the line there and back: ${(withWay.f - noWay.f).toFixed(2)} L more than with no line (${want.toFixed(2)})`);
  // no line: on the road at once
  await ev(`__clean(${rid})`); q = await setOut(); await ev(`__q(0.002, 0.002)`); q = await pdr();
  const on = await ev(`TLXPL.pdr.onWay(__rt(${rid}), TLX.state("plow").pdr[${rid}])`);
  ok(q.st === "out" && q.a === 0 && q.p > 0 && on === false, "PDR.wayMax 0: no line, the truck is on the road at once (p " + q.p.toFixed(0) + " m)");
  await ev(`TLXPL.PDR.wayMax = 800; true`);
});

console.log(fails ? `FAILS: ${fails}` : "all ok");
await done(fails ? 1 : 0);
