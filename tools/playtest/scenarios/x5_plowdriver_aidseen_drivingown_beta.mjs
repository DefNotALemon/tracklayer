// Beta 5.4c2b1: helper's truck is the one YOU are driving when SEND is pressed; then a reload mid-roping. Asserts, exit 1 on fail.
//     helper's clock.
//   C the helper in a truck of YOURS: the line leaves the parking spot over the ground (not through a wall), the seen
//     truck is your truck's own model, a reload mid-way finds it on the line again, the far end of the line is saved;
//     the bogged driver let go: the helper is still seen and still has a pin on the way back; back in, your truck is
//     yours to draw again.
//   D a save from before this slice (no aidX / aidZ) and junk in them: nothing throws, the pin is there.
// Stills (OUT): s1 roped up, s2 the pull, s3 the helper heading in.
import { boot, ev, sleep, done, reload, shot, park } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
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
await section("E you sit in the helper's own truck when you send it", async () => {
  await ev(`TLXV.buy("plowtruck"); true`); await sleep(600);
  const UIDx = await ev(`TLXV.state().owned.find(r => r.id === "plowtruck").uid`);
  await ev(`TLXPL.con.sign(${rid}); TLXPL.con.sign(${hid}); TLX.staff.tick(); true`); await sleep(300);
  const pick = r => ev(`(() => { const r = __rt(${r}); for (let i = 1; i < r.seg.length - 1; i++) if (r.seg[i].legs.length && (i + 1) * 400 + 40 <= r.len) return i; return -1; })()`);
  I = await pick(rid); IH = await pick(hid);
  ok((await hire(RID, "own")) && (await hire(HID, "own")), "drivers hired");
  const q = await bogNow(); ok(q.st === "stuck", "bogged");
  await far();
  await ev(`TLXV.swapTo(${JSON.stringify(UIDx)}); true`); await sleep(500);
  console.log("   cur:", await ev(`JSON.stringify(VEH.cur && VEH.cur.uid || VEH.cur)`));
  let r = await J(`(() => { try { const r = TLXPL.pdr.send(${rid}, ${hid}); return { r, err: "" }; } catch (e) { return { r: null, err: String(e) }; } })()`);
  console.log("   send while driving it:", JSON.stringify(r));
  ok(!r.err, "no throw");
  for (let n = 0; n < 10; n++) { await sleep(300); }
  const st = await J(`({ cur: !!VEH.cur, px: P.x, pz: P.z, z: __z(${hid}), h: __pdr(${hid}) })`);
  console.log("   after:", JSON.stringify(st));
  const bad = r.r && st.z && st.cur && Math.hypot(st.z.x - st.px, st.z.z - st.pz) < 3;
  ok(!bad, "no second copy of the truck drawn on top of the one you are driving (or the send was refused)");
  const nm = await J(`TABLET.log.slice(-3).map(n => n.title + " | " + n.body)`); console.log("   notes", JSON.stringify(nm));
  // reload mid-way
  await ev(`TLXV.swapTo(null); true`); await sleep(300);
  await reload(); await sleep(800); await ev(SETUP); await sleep(400); await ev(KIT);
  const a = await J(`({ p: __pdr(${hid}), z: __z(${hid}), ropes: __ropes() })`);
  console.log("   reloaded:", JSON.stringify(a));
  ok(a.ropes <= 1, "at most one rope after reload");
  await ev(`__q(4, 0.1)`); await sleep(500);
  const b = await J(`({ s: __pdr(${hid}), r: __pdr(${rid}), ropes: __ropes() })`);
  console.log("   later:", JSON.stringify(b));
  ok(b.ropes === 0 && !(b.s && b.s.aid) , "everything resolved, no rope or helper left");
});
await done(fails);
