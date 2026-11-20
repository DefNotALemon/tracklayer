// Expansion slice 5.4c2b1: the helper SEEN: a driver sent to a bogged truck is on the road (tlx-plow.js v31).
// Asserts, exit 1 on a failure.
//   A two drivers with their own trucks. Before the send the helper's truck is parked on its spot; sent, the same
//     truck is the helper (no second model), still where it stood, solid. At the bogged truck: it stops a rope's length
//     short, tail to it, and a rope runs between the two (ends at each truck, a few metres long). The pull: the bogged
//     truck comes back and straightens, the helper creeps toward home, the rope keeps its length. Free: the rope is
//     gone, the helper drives home in the other lane at a truck's speed while you watch (the hours that costs are
//     nobody's), waits short of you in its lane, its Map pin is where the truck is, and at home it is parked on its
//     spot again.
//   B watched on the way OUT: a truck's speed, and the bogged driver's hours in the cold run no faster than the
//     helper's clock.
//   C the helper in a truck of YOURS: the line leaves the parking spot over the ground (not through a wall), the seen
//     truck is your truck's own model, a reload mid-way finds it on the line again, the far end of the line is saved;
//     the bogged driver let go: the helper is still seen and still has a pin on the way back; back in, your truck is
//     yours to draw again.
//   D a save from before this slice (no aidX / aidZ) and junk in them: nothing throws, the pin is there.
// Stills (OUT): s1 roped up, s2 the pull, s3 the helper heading in.
import { boot, ev, sleep, done, reload, shot, park } from "../lib.mjs";
let fails = 0; const FAILED = []; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) { fails++; FAILED.push(m); } };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const NOSTILLS = !!process.env.NOSTILLS;
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };

const SETUP = `TLXPL.PDR.wayMax = 0; tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
const KIT = `(() => {
  window.__rt = id => TLXR.routes.find(r => r.id === id);
  window.__q = (h, st) => { st = st || 0.5; for (let t = 0; t < h - 1e-6; t += st) { GS.hour += Math.min(st, h - t); TLX.state("roads").h = GS.hour; TLXPL.con.step(); } return true; };
  window.__pdr = id => { const q = TLX.state("plow").pdr[id]; return q ? JSON.parse(JSON.stringify(q)) : null; };
  window.__drv = (id, work, xp, hap) => { const m = TLX.staff.at("plow:" + id); m.tr.work = work; m.tr.temper = 0; m.xpReal = xp; m.hap = hap; m.mood = 0; m.wage = TLX.staff.fair(m); m.paidTo = GS.hour; return TLXPL.pdr.skill(m, id); };
  window.__clean = id => { TLXR.setSnow(id, 0); const c = TLX.state("plow").con[id]; c.strikes = 0; c.cover = false; c.due = {}; c.clean = true; TLXPL.con.step(); return true; };
  window.__tk = uid => { const r = TLXV.state().owned.find(q => q.uid === uid); return r ? { out: r.out || null, fuel: r.fuel, x: r.x, z: r.z } : null; };
  window.__me = (x0, z0) => { crashCancel(); FOOT.on = false; if (VEH.cur) TLXV.swapTo(null); let x = x0, z = z0;
    const wet = (a, b) => isSea(a, b) || isWater(a, b) || isSea(a + 3, b) || isWater(a - 3, b) || isWater(a, b + 3) || isWater(a, b - 3);
    scan: for (let r = 0; r < 120; r += 4) for (let a = 0; a < 6.28; a += 0.4) { const u = x0 + Math.cos(a) * r, v = z0 + Math.sin(a) * r; if (!wet(u, v)) { x = u; z = v; break scan; } }
    P.x = x; P.z = z; P.y = surf(x, z) + 0.2; P.vx = P.vz = P.vy = 0; recenter(x, z, true); return true; };
  // what is seen of road id's driver
  window.__z = id => { const Z = TLXPL.pdr.seen.get(id); if (!Z) return null; const k = Z.ropeK;
    return { aid: !!Z.aid, uid: Z.uid, x: Z.x, z: Z.z, yaw: Z.yaw, s: Z.s, off: Z.off, v: Z.v, car: !!(Z.car && Z.car.on), vis: Z.R.grp.visible, lit: !!Z.pose.lit, drv: !!Z.pose.driver, down: !!TLXPL.rt(Z.uid).down,
      rope: !!Z.rope && !!Z.rope.parent, ropeL: Z.rope ? Z.ropeL : 0, low: Z.rope ? Z.ropeLow : 0, rk: Z.rope && k ? k.slice() : null, pull: Z.pull || 0, gc: gameClock }; };
  window.__ropes = () => { let n = 0; scene.traverse(o => { if (o.isMesh && o.geometry && o.geometry.type === "TubeGeometry" && o.material && o.material.color && o.material.color.getHex() === 0xc8962e) n++; }); return n; };
  if (!window.__rh) window.__rh = setInterval(() => { try { TLX.state("roads").h = GS.hour; } catch (e) { } }, 30);
  if (!window.__camHk) { window.__camHk = true; const rr = renderer.render.bind(renderer); renderer.render = (sc, cam) => { const o = window.__cam; if (o && sc === scene) { cam.position.set(o.x, o.y, o.z); cam.lookAt(o.tx, o.ty, o.tz); cam.updateMatrixWorld(); } rr(sc, cam); }; }
  // a camera beside the midpoint of two seen trucks (or one), on the left of the first one's nose
  window.__look = (a, b, dist, h) => { const A = TLXPL.pdr.seen.get(a), B = TLXPL.pdr.seen.get(b) || A; if (!A) { window.__cam = null; return false; }
    const mx = (A.x + B.x) / 2, mz = (A.z + B.z) / 2; let dx = B.x - A.x, dz = B.z - A.z; const L = Math.hypot(dx, dz); if (L < 0.5) { dx = Math.sin(A.yaw); dz = Math.cos(A.yaw); } else { dx /= L; dz /= L; }
    const cx = mx - dz * dist, cz = mz + dx * dist; window.__cam = { x: cx, z: cz, y: Math.max(surf(cx, cz), surf(mx, mz)) + h, tx: mx, ty: surf(mx, mz) + 1.2, tz: mz }; return true; };
  return true; })()`;
const clearNotes = () => ev(`TABLET.log.length = 0; true`);
const notes = () => J(`TABLET.log.map(n => n.title + " | " + n.body)`);

await boot();
await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 90000; GS.lic = GS.lic || {}; GS.lic.freight = true; true`);
const ids = await J(`TLXPL.con.routes().map(r => r.id)`);
const RID = "dyfjord", HID = ids.find(i => i !== RID), rid = JSON.stringify(RID), hid = JSON.stringify(HID);
console.log("   roads", JSON.stringify(ids), "bogged on", RID, "helper from", HID, "| a game hour is", await ev(`GAMEHOUR`), "s");
const pdr = (id = RID) => J(`__pdr(${JSON.stringify(id)})`);
const z = (id = HID) => J(`__z(${JSON.stringify(id)})`);
/* What is SEEN runs on the render clock, and a loaded machine renders slowly: read it on a deadline, never after a
   fixed sleep (beta 0354 #1: one run in two failed a check under load). waitZ polls until pred(seen) holds;
   settled waits until the seen truck has stopped easing (the clock put forward leaves it sliding into its lane and
   turning for a second or two: a rope measured then is up to a metre longer than the one it ends with). */
const waitZ = async (id, pred, ms = 15000) => { let R = null; for (let t = 0; t <= ms; t += 150) { R = await z(id); if (pred(R)) return R; await sleep(150); } console.log("   (waitZ: deadline passed, last seen", JSON.stringify(R).slice(0, 200) + ")"); return R; };
const settled = async (id, ms = 15000) => { let a = await z(id), n = 0; for (let t = 0; t <= ms && n < 3; t += 200) { await sleep(200); const b = await z(id); n = a && b && b.gc > a.gc && Math.hypot(a.x - b.x, a.z - b.z) < 0.004 && Math.abs(a.yaw - b.yaw) < 0.002 && a.rope === b.rope && Math.abs(a.ropeL - b.ropeL) < 0.004 ? n + 1 : 0; a = b; } if (n < 3) console.log("   (settled: deadline passed)"); return a; };
const km = v => ev(`TLXPL.PDR.bog.km = ${v}; true`);
const still = async (name, a, b, dist = 13, h = 3.4) => { if (NOSTILLS) return; await ev(`__look(${JSON.stringify(a)}, ${JSON.stringify(b)}, ${dist}, ${h})`); await sleep(400); await shot(name); await ev(`window.__cam = null; true`); };
let I = 1, IH = 1, UID = "", uid = "";
const hire = async (road, kit) => {
  const r = JSON.stringify(road);
  await ev(`TLXPL.PDR.mine = ${kit === "mine" ? 1 : 0}; (() => { const m = TLX.staff.at("plow:" + ${r}); if (m) TLX.staff.letGo(m.id); TLXPL.con.step(); return true; })()`); await sleep(200);
  const id = await ev(`(() => { const S = TLX.state("staff"); S.apps = S.apps.filter(a => a.place !== "plow:" + ${r}); const a = TLX.staff.post({ id: "plow:" + ${r}, role: "plowdriver" }); a.tr.honest = true; a.xp = a.xpReal = 10; a.exp = GS.hour + 400; return a.id; })()`);
  const h = await ev(`TLX.staff.hire(${JSON.stringify(id)})`);
  await ev(`__drv(${r}, 1, 10, 70); TLXPL.con.step(); true`); await sleep(300);
  return h === true;
};
const setOut = async v => { await ev(`TLXR.setSnow(${rid}, ${v}, ${I}); TLXPL.con.step(); true`); await ev(`__q(0.74, 0.37)`); let q = await pdr(); for (let n = 0; n < 8 && q.st === "home"; n++) { await ev(`__q(0.1, 0.1)`); q = await pdr(); } return q; };
const until = async (pred, hrs = 1.2, id = RID) => { let q = await pdr(id); for (let t = 0; t < hrs && !pred(q); t += 0.04) { await ev(`__q(0.04, 0.02)`); q = await pdr(id); } return q; };
let FAR = null;                                                                   // a place on land, out of sight of both roads
const far = async () => { if (!FAR) { await ev(`crashCancel(); FOOT.on = false; true`); FAR = await park("P.x + 2500", "P.z + 2500"); console.log("   far:", JSON.stringify(FAR)); } return ev(`__me(${FAR.x}, ${FAR.z})`); };
const bogNow = async () => { await far(); await ev(`__clean(${rid}); __clean(${hid}); __drv(${rid}, 1, 10, 70); true`); await ev(`__q(1.6, 0.1)`); await km(1e9); const q0 = await setOut(0.9); const q = q0.st === "stuck" ? q0 : await until(q => q.st === "stuck" || q.st === "home"); await km(0); return q; };
const send = () => ev(`TLXPL.pdr.send(${rid}, ${hid})`);
const home = async () => { await far(); await km(0); await ev(`__q(3, 0.1)`); let q = await until(q => q.st === "home", 2); const h = await until(q => q.st === "home" && !q.aid, 2, HID); return q.st === "home" && h.st === "home" && !h.aid; };
// beside the bogged truck: d m to the left of its lane, b m behind it
const beside = (d, b) => ev(`(() => { const r = __rt(${rid}), q = TLX.state("plow").pdr[${rid}], p = TLXPL.pdr.pt(r, q.p); return __me(p.x + p.tz * ${d} - p.tx * ${b}, p.z - p.tx * ${d} - p.tz * ${b}); })()`);
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

let T0 = 0, LEN = 0, SP = null, HITCH = 0.5;
await section("A own trucks: the helper on the road, the rope, the pull, the way home", async () => {
  await ev(`TLXV.buy("plowtruck"); true`); await sleep(600);
  UID = await ev(`TLXV.state().owned.find(r => r.id === "plowtruck").uid`); uid = JSON.stringify(UID);
  await ev(`TLXPL.con.sign(${rid}); TLXPL.con.sign(${hid}); TLX.staff.tick(); true`); await sleep(300);
  const pick = r => ev(`(() => { const r = __rt(${r}); for (let i = 1; i < r.seg.length - 1; i++) if (r.seg[i].legs.length && (i + 1) * 400 + 40 <= r.len) return i; return -1; })()`);
  I = await pick(rid); IH = await pick(hid);
  ok((await hire(RID, "own")) && (await hire(HID, "own")), "a driver with their own truck on each road");
  let q = await bogNow(); ok(q.st === "stuck", "the Dyfjord driver is bogged");
  SP = await J(`(() => { const s = TLXPL.pdr.spot(__rt(${hid})); return { x: s.x, z: s.z }; })()`);
  await ev(`__me(${SP.x} + 45, ${SP.z} + 45)`);
  let h0 = await waitZ(HID, R => R && R.vis && !R.aid); console.log("   parked:", JSON.stringify(h0));
  ok(h0 && !h0.aid && dist(h0, SP) < 1.5 && h0.vis, "before the send the helper's own truck is parked on its spot");
  await far(); await sleep(200);
  await ev(`TLXPL.PDR.aid.hitch = 5; true`);                                      /* a long roping up, so the test can look at it (a game hour is 50 s) */
  let Z = await J(`(() => { const r = TLXPL.pdr.send(${rid}, ${hid}); TLXPL.pdr.see(0.016); return r ? __z(${hid}) : null; })()`);
  ok(!!Z, "sent");
  let h = await pdr(HID); T0 = h.aidT; LEN = h.aidL; HITCH = await ev(`TLXPL.PDR.aid.hitch`); console.log("   sent:", JSON.stringify(Z), "| aidX", h.aidX, "aidZ", h.aidZ);
  ok(Z && Z.aid && Z.uid === h0.uid && dist(Z, SP) < 6 && Z.car && Z.lit && Z.drv && !Z.down, `sent: the same truck is now the helper, ${dist(Z, SP).toFixed(1)} m from its spot, solid, a driver in it, blade carried`);
  const st = await J(`TLXPL.pdr.pos(__rt(${rid}), TLX.state("plow").pdr[${rid}])`);
  ok(Number.isFinite(h.aidX) && Math.hypot(h.aidX - st.x, h.aidZ - st.z) < 1, "the far end of the line (the bogged truck's place) is on the helper's record");
  // to the bogged truck: you stand beside it
  await beside(24, 8); await sleep(300);
  await ev(`__q(${(T0 - HITCH * 0.95).toFixed(4)}, 0.06)`); h = await pdr(HID);
  ok(h.aidT <= HITCH + 1e-6 && h.aidT > HITCH * 0.7, `the clock has them at the truck, roping up (${h.aidT.toFixed(3)} h of the ${HITCH} left)`);
  let R = null, B = null;
  await waitZ(HID, R => R && R.rope, 20000); R = await settled(HID);              /* roped AND come to rest: the numbers below are of standing trucks */
  B = await settled(RID); h = await pdr(HID);
  console.log("   at the truck:", JSON.stringify(R)); console.log("   bogged:", JSON.stringify(B));
  const end = { x: h.aidX, z: h.aidZ }, gap = await ev(`TLXPL.PDR.aid.gap`), d0 = dist(R, end);
  ok(R.aid && d0 > gap - 3 && d0 < gap + 3, `the helper has stopped ${d0.toFixed(1)} m short of the bogged truck's place (gap ${gap})`);
  const fx = Math.sin(R.yaw), fz = Math.cos(R.yaw), tb = { x: (B.x - R.x) / dist(B, R), z: (B.z - R.z) / dist(B, R) };
  ok(fx * tb.x + fz * tb.z < -0.8, `tail to it (nose ${(Math.acos(Math.max(-1, Math.min(1, fx * tb.x + fz * tb.z))) * 57.3).toFixed(0)} deg off the bogged truck)`);
  ok(R.rope && R.ropeL > 1.5 && R.ropeL < 10 && (await ev(`__ropes()`)) === 1, `a rope runs between them, ${R.ropeL.toFixed(2)} m`);
  const ra = R.rk ? Math.hypot(R.rk[0] - R.x, R.rk[2] - R.z) : 99, rb = R.rk ? Math.hypot(R.rk[3] - B.x, R.rk[5] - B.z) : 99, gy = R.rk ? await J(`[groundAt(${R.rk[0]}, ${R.rk[2]}), groundAt(${R.rk[3]}, ${R.rk[5]})]`) : [0, 0];
  ok(ra < 4.5 && rb < 4.5, `made fast on each truck (${ra.toFixed(2)} m and ${rb.toFixed(2)} m from their middles)`);
  ok(R.rk && R.rk[1] - gy[0] > 0.25 && R.rk[1] - gy[0] < 1.8 && R.rk[4] - gy[1] > 0.25 && R.rk[4] - gy[1] < 1.8, `at towing-eye height (${(R.rk[1] - gy[0]).toFixed(2)} m and ${(R.rk[4] - gy[1]).toFixed(2)} m over the ground)`);
  ok(R.low > -0.005, `and between the trucks it lies on the snow or hangs over it, never under it (lowest ${R.low.toFixed(3)} m over the top)`);
  ok(B && !B.aid && (await pdr()).st === "stuck" && B.pull < 0.05, "the bogged truck is still bogged, nosed to the windrow");
  await still("s1_roped", HID, RID);
  // the pull
  const pullAt = await ev(`TLXPL.PDR.aid.pull`), haul = await ev(`TLXPL.PDR.aid.haul`);
  await ev(`TLX.state("plow").pdr[${hid}].aidT = ${(HITCH * pullAt * 0.3).toFixed(5)}; true`); await sleep(4500);
  const R2 = await z(), B2 = await z(RID), pk = await ev(`TLXPL.pdr.pullK(TLX.state("plow").pdr[${hid}], ${rid})`);
  console.log("   pull", pk.toFixed(2), "| helper moved", dist(R2, R).toFixed(2), "bogged moved", dist(B2, B).toFixed(2), "rope", R2.ropeL.toFixed(2), "bogged yaw", B.yaw.toFixed(3), "->", B2.yaw.toFixed(3));
  ok(pk > 0.5 && pk <= 1, `the last of the roping up is the pull (${Math.round(pk * 100)}% done)`);
  ok(dist(B2, B) > haul * pk * 0.6 && dist(B2, B) < haul + 1.6 && (B2.x - B.x) * tb.x + (B2.z - B.z) * tb.z < 0, `the bogged truck has come back ${dist(B2, B).toFixed(2)} m toward the helper`);
  ok(dist(R2, R) > haul * pk * 0.6 && dist(R2, R) < haul + 0.6, `the helper has crept ${dist(R2, R).toFixed(2)} m toward home`);
  ok(R2.rope && Math.abs(R2.ropeL - R.ropeL) < 1.2 && (await ev(`__ropes()`)) === 1, `the rope between them is still ${R2.ropeL.toFixed(2)} m`);
  await still("s2_pull", HID, RID);
  // free
  await clearNotes(); await ev(`__q(${(HITCH * pullAt * 0.3 + 0.02).toFixed(3)}, 0.06); TLXPL.PDR.aid.hitch = 0.5; true`); q = await pdr(); h = await pdr(HID);
  let R3 = await waitZ(HID, R => R && !R.rope) || {};
  ok(q.st !== "stuck" && h.aidB > 0 && !R3.rope && (await ev(`__ropes()`)) === 0, "free: the bogged driver plows on, the helper heads in, the rope is gone");
  // watched on the way home: a truck's speed, the other lane, the hours nobody's
  await waitZ(HID, R => R && R.vis && R.off < -1.5 && R.v > 6);
  const a = await z(), ha = await pdr(HID), ga = await ev(`GS.hour`), b = await waitZ(HID, R => R && R.gc - a.gc > 2, 30000), hb = await pdr(HID), gb = await ev(`GS.hour`);   /* over 2 s of the GAME clock, however long that takes */
  const v = (a.s - b.s) / Math.max(0.01, b.gc - a.gc), lost = await ev(`TLXPL.pdr.lost[${hid}]`), kk = await ev(`TLXPL.pdr.aidK[${hid}]`), vR = await ev(`TLXPL.PDR.vRoad`);
  console.log(`   heading in: ${(a.s - b.s).toFixed(1)} m in ${(b.gc - a.gc).toFixed(2)} game s = ${v.toFixed(1)} m/s; aidB ${ha.aidB.toFixed(4)} -> ${hb.aidB.toFixed(4)} h in ${(gb - ga).toFixed(4)} h; lost ${lost}, share ${kk}; off ${b.off.toFixed(2)}`);
  ok(v > 6 && v < 14.5, `in your sight the helper drives home at a truck's speed (${(v * 3.6).toFixed(0)} km/h)`);
  ok(Math.abs((ha.aidB - hb.aidB) * vR - (a.s - b.s)) < Math.max(12, (a.s - b.s) * 0.35), "and its clock runs at the pace of what you see");
  ok((ha.aidB - hb.aidB) < (gb - ga) * 0.8 && lost > 0 && kk > 0.1 && kk <= 1, `the hours that costs are nobody's (${Math.round(kk * 100)}% of the step lost)`);
  ok(b.off < -0.8 && b.vis, `in the other lane now (${b.off.toFixed(2)} m)`);
  const pin = await J(`TLXPL.pdr.pins().find(p => /: HEADING IN$/.test(p.name)) || null`), zb = await z();
  ok(pin && Math.hypot(pin.x - zb.x, pin.z - zb.z) < 6, "its Map pin is where the truck is");
  await still("s3_heading_in", HID, HID, 12, 3.2);
  // you in its lane
  await ev(`(() => { const Z = TLXPL.pdr.seen.get(${hid}); return __me(Z.x + Math.sin(Z.yaw) * 12, Z.z + Math.cos(Z.yaw) * 12); })()`); await waitZ(HID, R => R && R.v < 0.05);
  const c0 = await z(), hc0 = await pdr(HID), c1 = await waitZ(HID, R => R && R.gc - c0.gc > 1.5, 30000), hc1 = await pdr(HID);
  console.log(`   you in its lane: moved ${dist(c0, c1).toFixed(2)} m, aidB ${hc0.aidB.toFixed(5)} -> ${hc1.aidB.toFixed(5)}, blocked ${await ev(`TLXPL.pdr.blocked(${hid})`)}`);
  ok(dist(c0, c1) < 1.2 && Math.abs(hc0.aidB - hc1.aidB) < 2e-4, "you in its lane: it waits short of you, and its clock with it");
  // home
  await far(); await ev(`__q(${(LEN / 12000 + 0.1).toFixed(3)}, 0.06)`); h = await pdr(HID);
  ok(!h.aid && !("aidX" in h) && !("aidZ" in h), "back in: nothing left of the errand on the record");
  await ev(`__me(${SP.x} + 45, ${SP.z} + 45)`);
  const p1 = await waitZ(HID, R => R && R.vis && !R.aid);
  ok(p1 && !p1.aid && dist(p1, SP) < 1.5 && !p1.rope, `and their truck is parked on its spot again (${p1 ? dist(p1, SP).toFixed(2) : "?"} m off)`);
  ok(await home(), "everyone home");
});

await section("B watched on the way out", async () => {
  let q = await bogNow(); ok(q.st === "stuck" && (await send()) === true, "bogged, the other driver sent");
  await ev(`__me(${SP.x} + 60, ${SP.z} + 60)`); await waitZ(HID, R => R && R.aid && R.vis && R.off > 1.5 && R.v > 6);
  const a = await z(), ha = await pdr(HID), qa = await pdr(), ga = await ev(`GS.hour`), b = await waitZ(HID, R => R && R.gc - a.gc > 2.5, 30000), hb = await pdr(HID), qb = await pdr(), gb = await ev(`GS.hour`);
  const v = (b.s - a.s) / Math.max(0.01, b.gc - a.gc), dT = ha.aidT - hb.aidT, dS = qb.sk - qa.sk, dG = gb - ga;
  console.log(`   going out: ${(b.s - a.s).toFixed(1)} m in ${(b.gc - a.gc).toFixed(2)} game s = ${v.toFixed(1)} m/s; aidT down ${dT.toFixed(4)} h, the bogged driver's hours up ${dS.toFixed(4)}, the clock ${dG.toFixed(4)} h; off ${b.off.toFixed(2)}`);
  ok(b.aid && b.vis && v > 5 && v < 14.5, `the helper sets out at a truck's speed in your sight (${(v * 3.6).toFixed(0)} km/h)`);
  ok(dT < dG * 0.8 && dT > 0, "its clock slows to what you see");
  ok(dS < dG * 0.8 && Math.abs(dS - dT) < Math.max(0.004, dT * 0.6), "and the bogged driver's hours in the cold run no faster than that");
  ok(b.off > 0.8, `in the right-hand lane (${b.off.toFixed(2)} m)`);
  ok((await ev(`TLXPL.pdr.sx.err`)) === null, "nothing thrown while drawing");
  await far(); await ev(`__q(${(ha.aidT + LEN / 12000 + 0.2).toFixed(3)}, 0.06)`);
  ok(await home(), "everyone home");
});

await section("C the helper in a truck of yours; a reload; the bogged driver let go", async () => {
  await ev(`TLXPL.PDR.wayMax = 800; true`);
  ok(await hire(HID, "mine"), "a driver with no truck on the other road");
  await ev(`TLX.staff.xact(TLX.staff.at("plow:" + ${hid}).id, "a" + ${uid}); TLXPL.con.step(); true`); await sleep(300);
  await ev(`TLXPL.PDR.wayMax = 0; true`);                                          /* the bogged driver's own run: on the road at once, as in A */
  let q = await bogNow(); ok(q.st === "stuck", "the Dyfjord driver bogged");
  await ev(`TLXPL.PDR.wayMax = 800; TLXV.state().owned.find(r => r.uid === ${uid}).fuel = 80; true`);
  const SPOT = await J(`__tk(${uid})`);
  const L = await J(`(() => { const A = TLXPL.pdr.aidLine(${hid}, ${rid}); if (!A) return null; let bad = 0, n = 0, jump = 0; for (let s = 8; s < Math.min(A.len, 160); s += 2) { const p = TLXPL.pdr.pt(A, s); n++; if (obNear(p.x, p.z, 0.9) || isWater(p.x, p.z) || isSea(p.x, p.z)) bad++; } for (let i = 1; i < A.pts.length; i++) jump = Math.max(jump, A.cum[i] - A.cum[i - 1]); return { len: A.len, n: A.pts.length, s0: Math.hypot(A.pts[0][0] - ${SPOT.x}, A.pts[0][1] - ${SPOT.z}), bad, sampled: n, jump }; })()`);
  console.log("   line:", JSON.stringify(L));
  ok(L && L.s0 < 1 && L.n > 6 && L.bad === 0, `the line starts on your truck's parking spot and goes round what stands in the way (${L && L.sampled} points looked at, ${L && L.bad} in a wall or the water)`);
  await ev(`TLXPL.PDR.aid.hitch = 5; true`);
  ok((await send()) === true, "sent in your truck"); let h = await pdr(HID), t = await J(`__tk(${uid})`);
  await ev(`__me(${SPOT.x} + 40, ${SPOT.z} + 40)`);
  let Z = await waitZ(HID, R => R && R.aid && R.vis && R.drv);
  console.log("   seen:", JSON.stringify(Z));
  ok(!!t.out && Z && Z.aid && Z.uid === UID && Z.vis && Z.drv, "the truck seen is your own truck, a driver at the wheel");
  await far(); await ev(`__q(${((h.aidT - 5) * 0.4).toFixed(3)}, 0.06)`);
  await ev(`save(); true`); const b4 = await pdr(HID);
  await reload(); await ev(SETUP); await ev(`TLXPL.PDR.wayMax = 800; TLXPL.PDR.aid.hitch = 5; true`); await sleep(600); await ev(KIT); await far();
  h = await pdr(HID); Z = await waitZ(HID, R => R && R.aid);
  const ap = await J(`TLXPL.pdr.aidPos(${hid})`);
  ok(h.aid === RID && Math.abs(h.aidX - b4.aidX) < 1e-6 && Math.abs(h.aidZ - b4.aidZ) < 1e-6 && Math.abs(h.aidL - b4.aidL) < 1e-6, "a reload mid-way: the errand and the far end of its line are in the save");
  ok(Z && Z.aid && Z.uid === UID && ap && Math.hypot(Z.x - ap.x, Z.z - ap.z) < 40, `and the truck is on the line again where the clock has it (${Z && ap ? Math.hypot(Z.x - ap.x, Z.z - ap.z).toFixed(1) : "?"} m off)`);
  // the bogged driver let go: the helper is still seen, still pinned
  await clearNotes();
  await ev(`TLXPL.PDR.vRoad = 600; TLX.staff.letGo(TLX.staff.at("plow:" + ${rid}).id); __q(0.02, 0.01); TLXPL.PDR.vRoad = 12000; true`); await sleep(500);   /* (a slow clock at the turn: your truck's line is short, and the test has to look before they are in) */
  h = await pdr(HID); Z = await z();
  const pins = await J(`TLXPL.pdr.pins().map(p => p.name)`);
  ok(h.aid === RID && h.aidB > 0 && (await notes()).some(s => / has turned round \| /.test(s)), "the bogged driver let go: the helper turns round");
  ok(Z && Z.aid && pins.some(n => /: HEADING IN$/.test(n)) && (await J(`!!TLXPL.pdr.aidLine(${hid}, ${rid})`)), "and is still on the road and on the Map on the way back (the line outlives the bogged truck)");
  await ev(`TLXPL.PDR.aid.hitch = 0.5; __q(${(h.aidB + 0.1).toFixed(3)}, 0.06)`); await sleep(700); h = await pdr(HID); t = await J(`__tk(${uid})`);
  ok(!h.aid && !t.out && Math.hypot(t.x - SPOT.x, t.z - SPOT.z) < 0.01 && (await z()) === null, "back in: your truck is on its own spot and yours to draw again");
  ok(await hire(RID, "own"), "a new driver on the Dyfjord road");
});

await section("D a save from before this slice, and junk", async () => {
  await ev(`TLXPL.PDR.wayMax = 0; true`);
  let q = await bogNow(); ok(q.st === "stuck" && (await send()) === true, "bogged and help sent");
  const R = await J(`(() => { const s = TLX.state("plow"), h = s.pdr[${hid}], out = []; let err = "";
    try { delete h.aidX; delete h.aidZ; TLXPL.tidy(); TLXPL.pdr.see(0.016); out.push({ pin: TLXPL.pdr.pins().some(p => /GOING TO HELP/.test(p.name)), line: !!TLXPL.pdr.aidLine(${hid}, ${rid}), z: !!TLXPL.pdr.seen.get(${hid}) });
      h.aidX = "abc"; h.aidZ = NaN; TLXPL.tidy(); out.push({ x: "aidX" in h, z: "aidZ" in h }); TLXPL.pdr.see(0.016); __q(0.1, 0.05); TLXPL.pdr.see(0.016);
      h.aidX = 1e9; h.aidZ = -1e9; TLXPL.tidy(); TLXPL.pdr.see(0.016); TLXPL.pdr.pins(); __q(0.1, 0.05); TLXPL.pdr.see(0.016); delete h.aidX; delete h.aidZ;
    } catch (e) { err = String(e && e.stack || e).slice(0, 300); }
    out.push({ err, sx: TLXPL.pdr.sx.err }); return out; })()`);
  console.log("  ", JSON.stringify(R));
  ok(R[0] && R[0].pin && R[0].line && R[0].z, "an errand saved before this slice (no far end on the record): the line is found from the bogged truck, pin and truck are there");
  ok(R[1] && !R[1].x && !R[1].z, "junk in the far end is wiped");
  ok(R[R.length - 1].err === "" && R[R.length - 1].sx === null, "and nothing throws, wherever the far end points");
  ok(await home(), "everyone home");
  ok((await ev(`__ropes()`)) === 0, "no rope left in the world");
});

for (const m of FAILED) console.log("   failed: " + m);                           /* named again at the end: a kept tail of the log says which (beta 0354 #1) */
console.log(fails ? `FAILS: ${fails}` : "ALL OK");
await done(fails ? 1 : 0);
