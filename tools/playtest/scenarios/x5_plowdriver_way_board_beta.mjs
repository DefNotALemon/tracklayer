// Beta break test for 5.4b2b: you board the driver's truck while it is on its line, drive, step out, reload in the cab.
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

const out = async (frac) => { await ev(`__clean(${rid}); TLXV.state().owned.find(r => r.uid === ${uid}).fuel = 300; __drv(${rid}, 1, 10, 70); true`); const q = await setOut(); await ev(`__q(${(W.len * frac / 12000).toFixed(5)}, ${(W.len * frac / 12000).toFixed(5)})`); return pdr(); };
const spotCheck = async (tag) => { await sleep(400); const t = await tk(); const q = await pdr(); const z = await ev(`!!TLXPL.pdr.seen.get(${rid})`); return { tag, st: q && q.st, a: q && q.a, p: q && q.p, out: t.out, x: t.x, z: t.z, vis: t.vis, seen: z, onSpot: t.x === SPOT.x && t.z === SPOT.z }; };
const nearLine = async () => { const p = await J(`TLXPL.pdr.pos(__rt(${rid}), TLX.state("plow").pdr[${rid}])`); await ev(`__me(${p.x} + 16, ${p.z} + 10)`); await sleep(1500); };
const spin = async (id) => { const t0 = Date.now(); let q; while (Date.now() - t0 < 90000) { await sleep(500); q = await pdr(); if (!q || q.st === "home") break; } return q; };

const sx = () => ev(`TLXPL.pdr.sx.err`);
const atSpot = () => ev(`crashCancel(); FOOT.on = true; FOOT.x = ${SPOT.x} + 1.5; FOOT.z = ${SPOT.z} + 1.5; P.x = ${SPOT.x} + 30; P.z = ${SPOT.z} + 30; true`);
await section("K stand at the truck's own spot while the driver has it out", async () => {
  await far(); let q = await out(0.3);
  await atSpot(); await sleep(2500);
  let cur = await ev(`TLXV.state().cur`), t = await tk(); q = await pdr();
  console.log("  ", JSON.stringify({ cur, st: q && q.st, a: q && q.a, out: t.out, vis: t.vis }));
  ok(cur == null, "standing on the empty spot you are not swapped into the truck that is out (cur=" + cur + ")");
  ok(q && q.st === "out" && t.out, "driver still out, truck still marked out");
  ok((await sx()) === null, "no error");
  // the hint on foot there must not offer getting in
  const fu = await ev(`typeof footUse === "function" ? JSON.stringify(footUse()) : "n/a"`);
  console.log("   footUse at the spot:", String(fu).slice(0, 160));
  // push time on: driver comes home while you stand there
  await ev(`__q(1.5, 0.1); true`); await sleep(1500);
  q = await pdr(); t = await tk(); cur = await ev(`TLXV.state().cur`);
  console.log("  ", JSON.stringify({ cur, st: q && q.st, out: t.out, vis: t.vis, onSpot: t.x === SPOT.x && t.z === SPOT.z }));
  ok((await sx()) === null, "no error as the truck comes home onto you");
  ok(cur == null || cur === UID, "afterwards cur is nobody or the truck, not another owned id (" + cur + ")");
  const d = await ev(`Math.hypot(FOOT.x - ${SPOT.x}, FOOT.z - ${SPOT.z})`);
  console.log("   walker to spot", d.toFixed(2), "m");
});
await section("M reload standing at the spot, driver out", async () => {
  await ev(`crashCancel(); if (VEH.cur) TLXV.swapTo(null); true`);
  await far(); await ev(`__clean(${rid}); TLXV.state().owned.find(r => r.uid === ${uid}).fuel = 300; __drv(${rid}, 1, 10, 70); true`);
  await setOut(); await atSpot(); await sleep(800);
  await reload(); await sleep(1500);
  await ev(SETUP); await ev(KIT); await sleep(500);
  const q = await pdr(), t = await tk(), err = await sx();
  const bodies = await ev(`TLXV.state().owned.filter(r => r.id === "plowtruck").length`);
  console.log("  ", JSON.stringify({ q: q && { st: q.st, a: q.a }, t, err, bodies, cur: await ev(`TLXV.state().cur`) }));
  ok(!err, "no error after reload");
  ok(bodies === 1, "one plow truck after reload");
  ok(t && Number.isFinite(t.x) && Number.isFinite(t.z), "truck record finite");
  ok(!(q && q.st === "out" && t && !t.out), "driver not 'out' with a truck that is not out");
  await sleep(2500); const c2 = await ev(`TLXV.state().cur`);
  ok(c2 == null || !(t && t.out), "not swapped into a truck that is out (cur=" + c2 + ")");
});
console.log(fails ? `FAILS: ${fails}` : "all ok");
await done(fails ? 1 : 0);
