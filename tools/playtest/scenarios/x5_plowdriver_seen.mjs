// Expansion slice 5.4b1: the plow driver's truck SEEN on the road (tlx-plow.js v25, tlx-vehicles.js v35, tlx-traffic.js v10).
// Asserts, exit 1 on a failure.
//   A a driver with their OWN truck, in: a plow truck in their paint stands beside the road's first end (off the plowed
//     width, not in water, clear of walls), blade up, beacon dark, nobody at the wheel; no Map pin; it is solid.
//   B snow on a stretch, you far away: the clock's pace (5.4a1 unchanged): out and opened in minutes of game time.
//   C snow again, you beside the road: the truck is ON the road at p, in the right-hand lane, facing up the road, a
//     driver at the wheel, beacon flashing, a Map pin; it moves at a truck's speed (no more than 12.5 m/s), the blade
//     comes down on the snowed stretch and the truck is held to 7 m/s there; the stretch's due clock does not run away
//     while you watch (no warning); behind the blade its own lane is cut and the other lane is not; the stretch opens.
//   D you stand in its lane: it waits short of you; step aside and it goes on.
//   E it is solid to the sled; the traffic sees it (a `led` car in TLXT.extra) with the traffic option on and off.
//   F heading in: it faces back down the road in the other lane, the pin says so; home again it stands on its spot.
//   G a driver in YOUR truck: out, your truck's own model is on the road (drawn, the record still `out`), back in it is
//     on its parking spot again and the road has no seen truck.
//   H a reload mid-run: the truck is back on the road where the save has it. Let go: the truck is gone.
// Stills (OUT): the parked truck, the truck plowing, heading in, your own truck out.
import { boot, ev, sleep, done, reload, shot, park } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const NOSTILLS = !!process.env.NOSTILLS;
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };

// 5.4b2b: PDR.wayMax = 0 here: the truck is on the road at once, as when this was written (its drive from the spot has its own test, x5_plowdriver_way.mjs)
const SETUP = `TLXPL.PDR.bog.km = 0; /* 5.4c1: no driver bogs in this test (x5_plowdriver_stuck.mjs has that) */ TLXPL.PDR.wayMax = 0; tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
const KIT = `(() => {
  window.__rt = id => TLXR.routes.find(r => r.id === id);
  window.__q = (h, st) => { st = st || 0.5; for (let t = 0; t < h - 1e-6; t += st) { GS.hour += Math.min(st, h - t); TLX.state("roads").h = GS.hour; TLXPL.con.step(); } return true; };
  window.__pdr = id => { const q = TLX.state("plow").pdr[id]; return q ? JSON.parse(JSON.stringify(q)) : null; };
  window.__drv = (id, work, xp, hap) => { const m = TLX.staff.at("plow:" + id); m.tr.work = work; m.tr.temper = 0; m.xpReal = xp; m.hap = hap; m.mood = 0; m.wage = TLX.staff.fair(m); m.paidTo = GS.hour; return TLXPL.pdr.skill(m, id); };
  // the seen truck of a road, as numbers
  window.__z = id => { const Z = TLXPL.pdr.seen.get(id); if (!Z) return null; const R = Z.R, B = Z.gh ? null : null, r = __rt(id), n = TLXR.near(Z.x, Z.z);
    const bl = [...R.grp.children].length;
    return { uid: Z.uid, gh: Z.gh, s: Z.s, off: Z.off, x: Z.x, z: Z.z, yaw: Z.yaw, v: Z.v, vis: R.grp.visible, gx: R.grp.position.x, gz: R.grp.position.z, gy: R.grp.position.y, surf: surf(Z.x, Z.z),
      drv: R.drvBody.visible, lit: !!Z.lit, bc: Z.bc.userData.mat.color.r, car: Z.car ? { on: Z.car.on, x: Z.car.x, z: Z.car.z, led: Z.car.led, inX: TLXT.extra.includes(Z.car), n: Z.car.circ.length } : null,
      roadD: n.d, roadS: n.s, def: R.def.id, kids: bl, tint: R.tintMat ? R.tintMat.color.getHex() : null }; };
  window.__blade = id => { const Z = TLXPL.pdr.seen.get(id); if (!Z) return null; let k = null; Z.R.grp.traverse(o => { }); return Z.uid; };
  // you, on the sled, set down at a place (and kept there: no drift)
  window.__me = (x0, z0) => { crashCancel(); FOOT.on = false; if (VEH.cur) TLXV.swapTo(null); let x = x0, z = z0;
    const wet = (a, b) => isSea(a, b) || isWater(a, b) || isSea(a + 3, b) || isWater(a - 3, b) || isWater(a, b + 3) || isWater(a, b - 3);
    scan: for (let r = 0; r < 120; r += 4) for (let a = 0; a < 6.28; a += 0.4) { const u = x0 + Math.cos(a) * r, v = z0 + Math.sin(a) * r; if (!wet(u, v)) { x = u; z = v; break scan; } }   /* never set down in a lake */
    P.x = x; P.z = z; P.y = surf(x, z) + 0.2; P.vx = P.vz = P.vy = 0; recenter(x, z, true); return true; };
  // the due clock runs on the roads' own time: hold the roads' clock with the game's
  if (!window.__rh) window.__rh = setInterval(() => { try { TLX.state("roads").h = GS.hour; } catch (e) { } }, 30);
  // a sampler: the seen truck's speed and place, 10 times a second of wall time, by the game clock
  window.__samp = id => { window.__sm = []; clearInterval(window.__smI); window.__smI = setInterval(() => { const Z = TLXPL.pdr.seen.get(id), q = TLX.state("plow").pdr[id]; if (Z && q) window.__sm.push([gameClock, Z.s, q.p, Z.v, q.st, Z.x, Z.z, TLXPL.pdr.lost[id] || 0]); }, 100); return true; };
  if (!window.__camHk) { window.__camHk = true; const rr = renderer.render.bind(renderer); renderer.render = (sc, cam) => { const o = window.__cam; if (o && sc === scene) { cam.position.set(o.x, o.y, o.z); cam.lookAt(o.tx, o.ty, o.tz); cam.updateMatrixWorld(); } rr(sc, cam); }; }
  window.__look = (id, dist, h, side) => { const Z = TLXPL.pdr.seen.get(id); if (!Z) { window.__cam = null; return false; } const fx = Math.sin(Z.yaw), fz = Math.cos(Z.yaw); const cx = Z.x + fx * dist * 0.75 + fz * side, cz = Z.z + fz * dist * 0.75 - fx * side; window.__cam = { x: cx, z: cz, y: Math.max(surf(cx, cz), surf(Z.x, Z.z)) + h, tx: Z.x, ty: surf(Z.x, Z.z) + 1.4, tz: Z.z }; return true; };
  return true; })()`;
const SEG = 400;
const still = async (name, rid, dist = 11, h = 3.2, side = 6) => { if (NOSTILLS) return; await ev(`__look(${rid}, ${dist}, ${h}, ${side})`); await sleep(350); await shot(name); await ev(`window.__cam = null; true`); };

await boot();
await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 90000; GS.lic = GS.lic || {}; GS.lic.freight = true; true`);
let RID = "dyfjord", I = 0;
const routes = await J(`TLXPL.con.routes().map(r => ({ id: r.id, len: Math.round(r.len) }))`);
if (!routes.some(r => r.id === RID)) RID = routes[0].id;
const rid = JSON.stringify(RID);
const z = () => J(`__z(${rid})`);
const pdr = () => J(`__pdr(${rid})`);
const hire = async kit => {
  await ev(`TLXPL.PDR.mine = ${kit === "mine" ? 1 : 0}; true`);
  const id = await ev(`(() => { const S = TLX.state("staff"); S.apps = S.apps.filter(a => a.place !== "plow:" + ${rid}); const a = TLX.staff.post({ id: "plow:" + ${rid}, role: "plowdriver" }); a.tr.honest = true; a.xp = a.xpReal = 10; a.exp = GS.hour + 400; return a.id; })()`);
  const h = await ev(`TLX.staff.hire(${JSON.stringify(id)})`);
  await ev(`__drv(${rid}, 1, 10, 70); TLXPL.con.step(); true`); await sleep(400);
  return h === true;
};
const snow = (i, v) => ev(`TLXR.setSnow(${rid}, ${v}, ${i}); TLXPL.con.step(); true`);

await section("A their own truck, in: parked beside the road's first end", async () => {
  // every contract road has a spot
  const spots = await J(`TLXPL.con.routes().map(r => { const s = TLXPL.pdr.spot(r); return { id: r.id, s: s ? Math.round(s.s) : null, d: s ? +TLXR.near(s.x, s.z).d.toFixed(1) : null, sea: s ? isSea(s.x, s.z) || isWater(s.x, s.z) : null, ob: s ? obNear(s.x, s.z, 2.2) : null }; })`);
  console.log("  ", JSON.stringify(spots));
  ok(spots.length > 0 && spots.every(s => s.s != null && s.d >= 6 && !s.sea && !s.ob), "every contract road has a parking spot: 6 m+ off the road's line, dry, clear of walls and trees");
  await ev(`TLXV.buy("plowtruck"); true`); await sleep(500);
  await ev(`TLXPL.PDR.mine = 0; TLXPL.con.sign(${rid}); TLX.staff.tick(); true`); await sleep(300);
  ok(!!(await ev(`!!TLX.state("plow").con[${rid}]`)), "the road signed");
  I = await ev(`(() => { const r = __rt(${rid}); let b = -1; for (let i = 1; i < r.seg.length - 1; i++) if (r.seg[i].legs.length && (i + 1) * 400 + 40 <= r.len) { b = i; break; } return b; })()`);
  ok(I >= 1, "a whole stretch to work with: " + I);
  ok(await hire("own"), "a driver with their own truck hired");
  const sp = await J(`TLXPL.pdr.spot(__rt(${rid}))`);
  await ev(`__me(${sp.x} + 30, ${sp.z} + 30)`); await sleep(1200);
  const a = await z(), q = await pdr(), pins = await J(`TLXPL.pdr.pins()`);
  console.log("  ", JSON.stringify(a));
  ok(q.st === "home" && a && a.gh && a.def === "plowtruck" && a.vis === true, "in: their truck is drawn, a plow truck that is not one of yours (you own " + (await ev(`TLXV.state().owned.length`)) + ", there are " + (await ev(`TLXV.ghosts.size`)) + " ghost)");
  ok(Math.hypot(a.gx - sp.x, a.gz - sp.z) < 0.3 && a.roadD >= 6 && Math.abs(a.gy - a.surf) < 0.35 && a.surf - (await ev(`groundAt(${sp.x}, ${sp.z})`)) < 0.3, `it stands on its spot ${a.roadD.toFixed(1)} m from the road's line, on a cleared strip, wheels on the ground (y ${a.gy.toFixed(2)} against ${a.surf.toFixed(2)})`);
  ok(!a.drv && !a.lit && a.bc < 0.3 && a.tint != null, "nobody at the wheel, the beacon dark, in their paint (#" + (a.tint || 0).toString(16) + ")");
  ok(pins.length === 0, "no pin on the Map while they are in");
  const bl = await J(`(() => { const B = { k: null, y: null }; const Z = TLXPL.pdr.seen.get(${rid}); let n = 0; Z.R.grp.traverse(o => { if (o.isMesh) n++; }); return { n }; })()`);
  ok(bl.n >= 8, "the model has its blade and beacon on it (" + bl.n + " meshes)");
  await still("s1_parked", rid);
  // solid: the sled set down in it is put out of it
  await ev(`__me(${a.x}, ${a.z})`); await sleep(700);
  const d = await ev(`Math.hypot(P.x - ${a.x}, P.z - ${a.z})`);
  ok(d > 1.5, "solid with the traffic option off: the sled set down inside it is pushed " + d.toFixed(2) + " m out");
});

await section("B you far away: the clock's pace, as 5.4a1", async () => {
  await ev(`crashCancel(); FOOT.on = false; true`); await park("P.x + 2500", "P.z + 2500"); await sleep(400);
  const far = await ev(`(() => { const p = TLXPL.pdr.pt(__rt(${rid}), 0); return Math.hypot(P.x - p.x, P.z - p.z); })()`);
  await snow(I, 0.5);
  await ev(`__q(0.8, 0.2)`); let q = await pdr();
  ok(far > 900 && q.st === "out", `you ${Math.round(far)} m off: they set out (${q.st})`);
  await ev(`__q(${(I * SEG / 12000 + SEG / 4000 + 0.05).toFixed(3)}, 0.02)`);
  const sn = await ev(`__rt(${rid}).st.s[${I}]`); q = await pdr();
  ok(sn === 0 && q.n + q.wkN >= 1, "the stretch is open within the clock's time: nothing slowed them (" + JSON.stringify({ st: q.st, p: Math.round(q.p) }) + ")");
  await ev(`__q(1.5, 0.1)`); q = await pdr();
  ok(q.st === "home" && q.p === 0, "and they are back in");
});

await section("C you beside the road: the truck is on it, at a truck's speed", async () => {
  const sp = await J(`TLXPL.pdr.spot(__rt(${rid}))`);
  // stand 25 m off the road, 120 m up it
  const me = await J(`(() => { const p = TLXPL.pdr.pt(__rt(${rid}), ${I * SEG} - 60); return { x: p.x - p.tz * -22, z: p.z + p.tx * -22 }; })()`);
  await ev(`__me(${me.x}, ${me.z})`); await sleep(500);
  await snow(I, 0.5);
  const d0 = await J(`TLX.state("plow").con[${rid}].due`);
  const DEP = `(() => { const p = TLXPL.pdr.pt(__rt(${rid}), ${I * SEG + 40}), f = (o) => { const x = p.x - p.tz * o, z = p.z + p.tx * o; return +(surf(x, z) - groundAt(x, z)).toFixed(3); }; return { lane: f(1.6), other: f(-2.2), lvl: __rt(${rid}).st.s[${I}] }; })()`;
  const dep0 = await J(DEP); let dep1 = null;
  await ev(`__q(0.74, 0.37); __samp(${rid})`);
  let q = await pdr(), a = await z();
  for (let n = 0; n < 40 && q.st === "home"; n++) { await sleep(400); q = await pdr(); } a = await z();
  ok(q.st === "out" && a && a.vis, "they set out, the truck is drawn (" + q.st + ", p " + Math.round(q.p) + ")");
  // watch it come up the road
  let seenRoad = null, seenCut = null, pin = null, t0 = Date.now(), blade = 0;
  while (Date.now() - t0 < 260000) {
    await sleep(700); q = await pdr(); a = await z(); if (!q || !a) break;
    if (q.st !== "out") break;
    const bk = await ev(`(() => { const B = TLXPL.rtb ? TLXPL.rtb(${JSON.stringify("pdr:" + RID)}) : null; return B ? B.k : -1; })()`);
    if (a.s > 60 && a.s < I * SEG - 30 && !seenRoad) { seenRoad = { ...a, bk }; pin = await J(`TLXPL.pdr.pins()`); await still("s2_on_the_road", rid); }
    if (a.s > I * SEG + 60 && !seenCut) { seenCut = { ...a, bk }; blade = bk; dep1 = await J(DEP); await still("s3_plowing", rid, -13, 3.6, -4); }
  }
  await ev(`clearInterval(window.__smI); true`);
  const sm = await J(`window.__sm`);
  console.log("   samples", sm.length, "on the road", JSON.stringify(seenRoad && { s: Math.round(seenRoad.s), off: +seenRoad.off.toFixed(2), d: +seenRoad.roadD.toFixed(2), v: +seenRoad.v.toFixed(1), bk: seenRoad.bk }), "cutting", JSON.stringify(seenCut && { s: Math.round(seenCut.s), v: +seenCut.v.toFixed(1), bk: seenCut.bk }));
  ok(!!seenRoad && Math.abs(seenRoad.roadD - 1.6) < 0.5 && Math.abs(seenRoad.off - 1.6) < 0.3, "on the clean road it keeps the right-hand lane, 1.6 m off the crown");
  if (seenRoad) {
    const t = await J(`(() => { const p = TLXPL.pdr.pt(__rt(${rid}), ${seenRoad.s}); return { yaw: Math.atan2(p.tx, p.tz) }; })()`);
    let dy = seenRoad.yaw - t.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
    ok(Math.abs(dy) < 0.35, "facing up the road (" + dy.toFixed(2) + " rad off the road's line)");
    ok(seenRoad.drv && seenRoad.lit && Math.hypot(seenRoad.gx - seenRoad.x, seenRoad.gz - seenRoad.z) < 1.6 && Math.abs(seenRoad.gy - seenRoad.surf) < 0.5, `a driver at the wheel, on duty, the model where the truck is (${Math.hypot(seenRoad.gx - seenRoad.x, seenRoad.gz - seenRoad.z).toFixed(2)} m, a frame behind) and on the ground (${(seenRoad.gy - seenRoad.surf).toFixed(2)} m)`);
    ok(seenRoad.car && seenRoad.car.on && seenRoad.car.led && seenRoad.car.inX && Math.hypot(seenRoad.car.x - seenRoad.x, seenRoad.car.z - seenRoad.z) < 0.5 && seenRoad.car.n >= 4, "it is a led car among the traffic's, where the truck is, with the blade's circle");
    ok(pin && pin.length === 1 && /: PLOWING$/.test(pin[0].name) && Math.hypot(pin[0].x - seenRoad.x, pin[0].z - seenRoad.z) < 30, "a pin on the Map where it is: " + JSON.stringify(pin && pin[0] && pin[0].name));
  }
  // speeds by the game clock, from the eased position
  const sp2 = (lo, hi) => { const w = sm.filter(r => r[1] >= lo && r[1] <= hi && r[4] === "out"); if (w.length < 4) return null; const a0 = w[0], a1 = w[w.length - 1]; return (a1[1] - a0[1]) / (a1[0] - a0[0]); };
  const vRoad = sp2(70, I * SEG - 30), vCut = sp2(I * SEG + 30, (I + 1) * SEG - 30), vmax = Math.max(...sm.map(r => r[3]));
  console.log("   v on the clean road", vRoad && vRoad.toFixed(1), "m/s; cutting", vCut && vCut.toFixed(1), "m/s; fastest frame", vmax.toFixed(1));
  ok(vRoad != null && vRoad > 8 && vRoad <= 13.2, "on the clean road it drives about 45 km/h by the game clock (" + (vRoad || 0).toFixed(1) + " m/s), not the clock's 240");
  ok(vCut != null && vCut > 4 && vCut <= 7.6, "with the blade cutting about 25 km/h (" + (vCut || 0).toFixed(1) + " m/s), not the clock's 80");
  ok(vmax <= 20, "and no frame shows it faster than 20 m/s (" + vmax.toFixed(1) + ")");
  ok(!!seenCut && seenCut.bk > 0.9 && seenRoad && seenRoad.bk < 0.1, "the blade is carried on the clean road and down on the snowed stretch (" + (seenRoad && seenRoad.bk) + " -> " + (seenCut && seenCut.bk) + ")");
  console.log("   snow 40 m into the stretch, before", JSON.stringify(dep0), "behind the blade", JSON.stringify(dep1));
  ok(!!dep1 && dep0.lane > 0.2 && dep1.lane < dep0.lane * 0.45 && dep1.other > dep0.other * 0.8 && dep1.lvl >= 0.12, `behind the blade its own lane is cut (${dep0.lane} -> ${dep1 && dep1.lane} m) while the stretch is not open yet and the other lane still lies under snow (${dep1 && dep1.other} m)`);
  ok(!!seenCut && Math.abs(seenCut.gy - seenCut.surf) < 0.35, "and the truck stands on what it has cleared (" + (seenCut ? (seenCut.gy - seenCut.surf).toFixed(2) : "?") + " m off the surface under it)");
  const lostMax = Math.max(...sm.map(r => r[7]));
  ok(lostMax > 0, "the hours the watching cost them are counted (" + lostMax.toFixed(4) + " h in a step)");
  // wait for the stretch to open
  t0 = Date.now(); let sn = 1;
  while (Date.now() - t0 < 60000) { sn = await ev(`__rt(${rid}).st.s[${I}]`); if (sn === 0) break; await sleep(700); }
  const c = await J(`TLX.state("plow").con[${rid}]`);
  console.log("   due before", JSON.stringify(d0), "con", JSON.stringify({ strikes: c.strikes, due: c.due, cover: c.cover }));
  ok(sn === 0 && c.strikes === 0 && !c.cover, "the stretch opens, no warning, the kommune's truck stays home");
});

await section("D you in its lane: it waits", async () => {
  // it is heading in now, or still out: put snow far up so it is out and driving
  await sleep(3000);                                                           // it has turned round
  let q = await pdr(), a = await z();
  console.log("  ", JSON.stringify({ st: q.st, p: Math.round(q.p) }));
  const dir = q.st === "back" ? -1 : 1;
  ok(q.st !== "home" && !!a, "still on the road (" + q.st + ")");
  const me = await J(`(() => { const Z = TLXPL.pdr.seen.get(${rid}), p = TLXPL.pdr.pt(__rt(${rid}), Z.s + ${dir} * 45); return { x: p.x - p.tz * ${dir} * 1.6, z: p.z + p.tx * ${dir} * 1.6 }; })()`);
  await ev(`__me(${me.x}, ${me.z})`);
  let t0 = Date.now(), stop = null, gap = 0;
  while (Date.now() - t0 < 30000) { await sleep(500); await ev(`P.vx = P.vz = 0; true`); a = await z(); if (!a) break; gap = await ev(`Math.hypot(P.x - ${a.x}, P.z - ${a.z})`); const b = await ev(`TLXPL.pdr.blocked(${rid})`); if (b && a.v < 0.3) { stop = { gap, v: a.v }; break; } }
  ok(!!stop && stop.gap > 4 && stop.gap < 20, "it comes up and waits " + (stop ? stop.gap.toFixed(1) : "?") + " m short of you");
  const s0 = a ? a.s : 0; await sleep(2500); a = await z();
  ok(a && Math.abs(a.s - s0) < 1.5 && (await ev(`Math.hypot(P.x - ${me.x}, P.z - ${me.z})`)) < 1, "and stays there while you stand in its lane: you are not pushed along");
  await still("s4_waiting", rid, 16, 3.5, 5);
  await park("P.x + 60", "P.z + 60"); await sleep(3500); const b = await z();
  ok(b && Math.abs(b.s - s0) > 5, "out of its way and it drives on (" + (b ? Math.abs(b.s - s0).toFixed(0) : "?") + " m in 3.5 s)");
  void dir;
});

await section("E solid, and seen by the traffic", async () => {
  let a = await z(); ok(!!a, "the truck is there");
  const side = await J(`(() => { const Z = TLXPL.pdr.seen.get(${rid}); const fx = Math.sin(Z.yaw), fz = Math.cos(Z.yaw); return { x: Z.x + fz * 0.4 - fx * 0.5, z: Z.z - fx * 0.4 - fz * 0.5 }; })()`);
  await ev(`TLX.setOn("traffic", true); TLXT.hold = true; __me(${side.x}, ${side.z})`); await sleep(900);
  a = await z(); const d = await ev(`Math.hypot(P.x - ${a.x}, P.z - ${a.z})`);
  ok(d > 1.3, "with the traffic option ON the sled set down in it is pushed out too (" + d.toFixed(2) + " m)");
  const seen = await J(`(() => { const Z = TLXPL.pdr.seen.get(${rid}), q = TLX.state("plow").pdr[${rid}], dir = q.st === "back" ? -1 : 1, r = TLXT.routes.find(r => r.id === ${rid}); try { let bs = 0, bd = 1e9; for (let s = r.s0; s <= r.s1; s += 2) { const p = TLXT.lanePt(${rid}, s, dir), d = Math.hypot(p.x - Z.x, p.z - Z.z); if (d < bd) { bd = d; bs = s; } } const c = TLXT.place(${rid}, bs - dir * 30, dir, 0); const sa = TLXT.stopAhead(c); c.on = false; return { why: sa.why, a: sa.a, d: sa.d, lane: bd }; } catch (e) { return { err: String(e) }; } })()`);
  console.log("  ", JSON.stringify(seen));
  ok(seen.why === "car" && seen.a > 15 && seen.a < 45 && seen.lane < 1.5, "a driver 30 m behind it in the same lane sees a car ahead to hold up for");
  await ev(`TLX.setOn("traffic", false); true`); await park("P.x + 80", "P.z + 80"); await sleep(300);
});

await section("F heading in, and home on its spot", async () => {
  let q = await pdr(), a = null, back = null, pin = null, t0 = Date.now();
  while (Date.now() - t0 < 120000) { q = await pdr(); a = await z(); if (!q || q.st === "home") break; if (q.st === "back" && a && a.s > 80 && !back) { await sleep(2500); a = await z(); q = await pdr(); if (q.st !== "back") break; back = a; pin = await J(`TLXPL.pdr.pins()`); await still("s5_heading_in", rid); }
    // keep near enough to see it, far enough to be out of its way
    await ev(`(() => { const Z = TLXPL.pdr.seen.get(${rid}); if (Z && Math.hypot(P.x - Z.x, P.z - Z.z) > 220) { const fx = Math.sin(Z.yaw), fz = Math.cos(Z.yaw); __me(Z.x + fz * 30 + fx * 60, Z.z - fx * 30 + fz * 60); } return true; })()`);
    await sleep(600); }
  ok(!!back, "seen heading in");
  if (back) {
    const t = await J(`(() => { const p = TLXPL.pdr.pt(__rt(${rid}), ${back.s}); return { yaw: Math.atan2(-p.tx, -p.tz) }; })()`);
    let dy = back.yaw - t.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
    ok(Math.abs(dy) < 0.4 && Math.abs(back.off + 1.6) < 0.35, `it faces back down the road in the other lane (${dy.toFixed(2)} rad, ${back.off.toFixed(2)} m)`);
    ok(pin && pin.length === 1 && /: HEADING IN$/.test(pin[0].name), "the pin says heading in");
  }
  const sp = await J(`TLXPL.pdr.spot(__rt(${rid}))`);
  await ev(`__me(${sp.x} + 40, ${sp.z} + 25)`);
  t0 = Date.now(); while (Date.now() - t0 < 60000) { q = await pdr(); if (q.st === "home") break; await sleep(600); }
  await sleep(4500); a = await z();
  ok(q.st === "home" && a && Math.hypot(a.x - sp.x, a.z - sp.z) < 0.6 && !a.drv && !a.lit, "home: the truck stands on its spot again, the cab empty (" + (a ? Math.hypot(a.x - sp.x, a.z - sp.z).toFixed(2) : "?") + " m off it)");
  ok((await J(`TLXPL.pdr.pins()`)).length === 0, "and the pin is gone");
});

await section("G a driver in YOUR truck", async () => {
  await ev(`TLX.staff.letGo(TLX.staff.at("plow:" + ${rid}).id); TLXPL.con.step(); true`); await sleep(600);
  ok((await z()) === null && (await ev(`TLXT.extra.filter(c => c.led).length`)) === 0 && (await ev(`TLXV.ghosts.size`)) === 0, "the own-truck driver let go: their truck is gone, nothing left of it among the traffic's cars");
  const uid = await ev(`TLXV.state().owned.find(r => r.id === "plowtruck").uid`);
  ok(await hire("mine"), "a driver without a truck hired");
  const did = await ev(`TLX.staff.at("plow:" + ${rid}).id`);
  ok((await ev(`TLX.staff.xact(${JSON.stringify(did)}, "a" + ${JSON.stringify(uid)})`)) === true, "your plow truck assigned");
  const spot = await J(`(() => { const t = TLXV.state().owned.find(r => r.uid === ${JSON.stringify(uid)}); return { x: t.x, z: t.z }; })()`);
  ok((await z()) === null, "in: no seen truck of the road's (yours stands on its own spot)");
  const me = await J(`(() => { const p = TLXPL.pdr.pt(__rt(${rid}), 150); return { x: p.x - p.tz * -25, z: p.z + p.tx * -25 }; })()`);
  await ev(`__me(${me.x}, ${me.z})`);
  await snow(I, 0.5); await ev(`__q(0.74, 0.37)`);
  let q = await pdr(), a = await z();
  for (let n = 0; n < 40 && q.st === "home"; n++) { await sleep(400); q = await pdr(); } await sleep(2500); q = await pdr(); a = await z();
  console.log("  ", JSON.stringify({ q: q && { st: q.st, p: Math.round(q.p), truck: q.truck, told: q.told }, a: a && { uid: a.uid, gh: a.gh, s: Math.round(a.s), vis: a.vis, d: +a.roadD.toFixed(1) } }));
  const rec = await J(`(() => { const t = TLXV.state().owned.find(r => r.uid === ${JSON.stringify(uid)}); return { out: t.out, x: t.x, z: t.z }; })()`);
  ok(q.st === "out" && !!rec.out && a && !a.gh && a.uid === String(uid) && a.vis && a.def === "plowtruck", "out: your own truck's model is on the road, the record still out with them");
  ok(a && a.roadD < 2.3 && a.drv && Math.hypot(a.gx - spot.x, a.gz - spot.z) > 20 && rec.x === spot.x && rec.z === spot.z, "on the road with a driver in it, not on its parking spot (which the record keeps)");
  await still("s6_your_truck_out", rid);
  // H a reload mid-run
  const p0 = q.p;
  await reload(); await ev(SETUP); await sleep(600); await ev(KIT);
  await ev(`TLXPL.PDR.mine = 1; __me(${me.x}, ${me.z})`); await sleep(1500);
  q = await pdr(); a = await z();
  ok(q && q.st !== "home" && a && !a.gh && a.vis && a.drv, "H a reload mid-run: the truck is back on the road with them (p " + Math.round(p0) + " -> " + (q ? Math.round(q.p) : "?") + ")");
  // call them in at the clock's pace and see it home
  await ev(`crashCancel(); FOOT.on = false; true`); await park("P.x + 2600", "P.z + 2600"); await sleep(400);
  await ev(`TLXR.setSnow(${rid}, 0); __q(2.5, 0.1)`); await sleep(1500);
  q = await pdr(); a = await z();
  const r2 = await J(`(() => { const t = TLXV.state().owned.find(r => r.uid === ${JSON.stringify(uid)}); const R = TLXV.runtimeOf(t.uid); return { out: t.out, x: t.x, z: t.z, kids: R.grp.children.length, op: !!R.outP }; })()`);
  ok(q.st === "home" && !r2.out && a === null && !r2.op && r2.x === spot.x && r2.z === spot.z, "back in: the truck is on its own spot again, no pose left on it, no seen truck");
  ok((await ev(`TLXT.extra.filter(c => c.led).length`)) === 0, "and nothing left among the traffic's cars");
  ok((await ev(`TLXPL.pdr.sx.err`)) === null, "no error in the seen-truck step");
});

console.log(fails ? `FAILED: ${fails}` : "all ok");
await done(fails ? 1 : 0);
