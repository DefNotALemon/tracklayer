// 5.4c2b2 beta: breaking the tow-them rope: fire the driver, sleep, drop the truck, quit-reload, swap truck while roped. Asserts, exit 1.
import { boot, ev, sleep, done, reload, shot, park, tap, down, up, padSet } from "../lib.mjs";
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
  window.__me = (x0, z0) => { crashCancel(); FOOT.on = false; if (VEH.cur) TLXV.swapTo(null); let x = x0, z = z0;
    const wet = (a, b) => isSea(a, b) || isWater(a, b) || isSea(a + 3, b) || isWater(a - 3, b) || isWater(a, b + 3) || isWater(a, b - 3);
    scan: for (let r = 0; r < 120; r += 4) for (let a = 0; a < 6.28; a += 0.4) { const u = x0 + Math.cos(a) * r, v = z0 + Math.sin(a) * r; if (!wet(u, v)) { x = u; z = v; break scan; } }
    P.x = x; P.z = z; P.y = surf(x, z) + 0.2; P.vx = P.vz = P.vy = 0; recenter(x, z, true); return true; };
  // you at the wheel of truck uid, at x, z, nosed along yaw
  window.__tr = (uid, x, z, yaw) => { crashCancel(); FOOT.on = false; if (FOOT.g) FOOT.g.visible = false; if (TLXV.state().cur !== uid) TLXV.swapTo(uid);
    P.x = x; P.z = z; P.yaw = yaw; P.y = surf(x, z) + 0.25; P.vx = P.vz = P.vy = 0; if (P.wy !== undefined) P.wy = 0; P.safe = { x, z, yaw }; recenter(x, z, true); return true; };
  // the same, on the road id at s metres along it, off m right of the crown, facing along it (dir 1) or back (dir -1)
  window.__trRoad = (uid, id, s, off, dir) => { const p = TLXPL.pdr.pt(__rt(id), s); return __tr(uid, p.x - p.tz * off, p.z + p.tx * off, Math.atan2(p.tx * dir, p.tz * dir)); };
  // you on foot at x, z, whatever you drove left where it stands
  window.__afoot = (x, z) => { FOOT.on = true; FOOT.g.visible = true; FOOT.x = x; FOOT.z = z; FOOT.y = surf(x, z); FOOT.sp = 0; P.vx = P.vz = 0; recenter(x, z, true); return true; };
  window.__in = () => { FOOT.on = false; if (FOOT.g) FOOT.g.visible = false; return true; };
  const V3 = () => new THREE.Vector3();
  // the towing eyes: of the truck bogged on road id, and of the truck you drive
  window.__eyes = id => { const Z = TLXPL.pdr.seen.get(id), R = TLXV.rt(), o = { b: null, m: null }; const f = v => ({ x: v.x, y: v.y, z: v.z });
    if (Z && Z.R) { Z.R.grp.updateMatrixWorld(true); o.b = { tail: f(TLXPL.pdr.hook(Z.R, false, V3())), nose: f(TLXPL.pdr.hook(Z.R, true, V3())), x: Z.x, z: Z.z, yaw: Z.yaw, tw: Z.tw || 0, tx: Z.tx, tz: Z.tz, cb: Z.cb, s: Z.s, vis: Z.R.grp.visible }; }
    if (R && R.body) { R.grp.updateMatrixWorld(true); o.m = { tail: f(TLXPL.pdr.hook(R, false, V3())), nose: f(TLXPL.pdr.hook(R, true, V3())) }; }
    return o; };
  window.__tw = () => { const T = TLXPL.pdr.tw, k = T.ropeK; return { id: T.id, uid: T.uid, mf: T.mf, tf: T.tf, taut: T.taut, along: T.along, slack: T.slack, rope: !!T.rope && !!T.rope.parent, ropeL: T.ropeL, low: T.ropeLow, rk: T.rope && k ? k.slice() : null, sn: T.snatches, terr: TLXPL.pdr.sx.terr || null, err: TLXPL.pdr.sx.err }; };
  window.__ropes = () => { let n = 0; scene.traverse(o => { if (o.isMesh && o.geometry && o.geometry.type === "TubeGeometry" && o.material && o.material.color && o.material.color.getHex() === 0xc8962e) n++; }); return n; };
  window.__dep = (id, s, off) => { const p = TLXPL.pdr.pt(__rt(id), s), x = p.x - p.tz * off, z = p.z + p.tx * off; return surf(x, z) - groundAt(x, z); };
  if (!window.__rh) window.__rh = setInterval(() => { try { TLX.state("roads").h = GS.hour; const q = TLX.state("plow").pdr.dyfjord; if (q && q.st === "stuck" && q.sk > 1) q.sk = 1; } catch (e) { } }, 30);   /* and nobody walks home mid-test */
  if (!window.__camHk) { window.__camHk = true; const rr = renderer.render.bind(renderer); renderer.render = (sc, cam) => { const o = window.__cam; if (o && sc === scene) { cam.position.set(o.x, o.y, o.z); cam.lookAt(o.tx, o.ty, o.tz); cam.updateMatrixWorld(); } rr(sc, cam); }; }
  // a camera beside the midpoint of the bogged truck and yours
  window.__look = (id, dist, h) => { const A = TLXPL.pdr.seen.get(id); if (!A) { window.__cam = null; return false; }
    const mx = (A.x + P.x) / 2, mz = (A.z + P.z) / 2; let dx = P.x - A.x, dz = P.z - A.z; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    const cx = mx - dz * dist, cz = mz + dx * dist; window.__cam = { x: cx, z: cz, y: Math.max(surf(cx, cz), surf(mx, mz)) + h, tx: mx, ty: surf(mx, mz) + 1.1, tz: mz }; return true; };
  return true; })()`;
const clearNotes = () => ev(`TABLET.log.length = 0; true`);
const notes = () => J(`TABLET.log.map(n => n.title + " | " + n.body)`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80); return true; })()`);
const toasts = async () => { await sleep(300); return J(`window.__tsaw || []`); };
const use = () => J(`({ use: footUse(), hint: $("wnHint").textContent, hid: $("wnHint").hidden })`);

await boot();
await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 90000; GS.lic = GS.lic || {}; GS.lic.freight = true; true`);
const ids = await J(`TLXPL.con.routes().map(r => r.id)`);
const RID = "dyfjord", HID = ids.find(i => i !== RID), rid = JSON.stringify(RID), hid = JSON.stringify(HID);
const TW = await J(`TLXPL.PDR.tow`);
console.log("   roads", JSON.stringify(ids), "| tow", JSON.stringify(TW));
const pdr = (id = RID) => J(`__pdr(${JSON.stringify(id)})`);
const eyes = () => J(`__eyes(${rid})`);
const tw = () => J(`__tw()`);
const km = v => ev(`TLXPL.PDR.bog.km = ${v}; true`);
const still = async (name, dist = 11, h = 3.2) => { if (NOSTILLS) return; await ev(`__look(${rid}, ${dist}, ${h})`); await sleep(500); await shot(name); await ev(`window.__cam = null; true`); };
let I = 1, UID = "", uid = "", FIRST = "";
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
let FAR = null;
const far = async () => { if (!FAR) { await ev(`crashCancel(); FOOT.on = false; true`); FAR = await park("P.x + 2500", "P.z + 2500"); console.log("   far:", JSON.stringify(FAR)); } return ev(`__me(${FAR.x}, ${FAR.z})`); };
const bogNow = async () => { await far(); await ev(`__clean(${rid}); __clean(${hid}); __drv(${rid}, 1, 10, 70); true`); await ev(`__q(1.6, 0.1)`); await km(1e9); const q0 = await setOut(0.9); const q = q0.st === "stuck" ? q0 : await until(q => q.st === "stuck" || q.st === "home"); await km(0); return q; };
const home = async () => { await far(); await km(0); await ev(`__q(3, 0.1)`); const q = await until(q => q.st === "home", 2); const h = await until(q => q.st === "home" && !q.aid, 2, HID); return q.st === "home" && h.st === "home" && !h.aid; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const d3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const waitFor = async (f, pred, ms = 15000) => { let R = null; for (let t = 0; t <= ms; t += 150) { R = await f(); if (pred(R)) return R; await sleep(150); } console.log("   (deadline passed, last", JSON.stringify(R).slice(0, 240) + ")"); return R; };
// the pickup put tail to the bogged truck's tail (end "tail") or nose to its nose ("nose"), the two eyes `gap` m apart
const lineUp = async (end, gap) => {
  const q = await pdr(), sgn = end === "tail" ? -1 : 1;
  let s = q.p + sgn * 14;
  for (let n = 0; n < 4; n++) {
    await ev(`__trRoad(${uid}, ${rid}, ${s}, 1.9, ${sgn})`); await sleep(500);   /* tail pull: nosed back down the road; nose pull: nosed on up it */
    const E = await eyes(), d = d3(E.m.tail, E.b[end]);
    if (Math.abs(d - gap) < 0.25) return d;
    s -= sgn * (d - gap);
  }
  const E = await eyes(); return d3(E.m.tail, E.b[end]);
};
// you on foot 1 m beyond an eye of a truck (away from that truck's middle)
const standAtEye = (e, mid, by = 1.0) => { const L = Math.hypot(e.x - mid.x, e.z - mid.z) || 1; return ev(`__afoot(${e.x + (e.x - mid.x) / L * by}, ${e.z + (e.z - mid.z) / L * by})`); };

await section("A roped, then bad things", async () => {
  await ev(`TLXV.buy("plowtruck"); TLXV.buy("pickup"); true`); await sleep(600);
  UID = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`); uid = JSON.stringify(UID);
  await ev(`TLXPL.con.sign(${rid}); TLXPL.con.sign(${hid}); TLX.staff.tick(); true`); await sleep(300);
  I = await ev(`(() => { const r = __rt(${rid}); for (let i = 1; i < r.seg.length - 1; i++) if (r.seg[i].legs.length && (i + 1) * 400 + 40 <= r.len) return i; return -1; })()`);
  ok((await hire(RID, "own")) && (await hire(HID, "own")), "drivers hired");
  const rope = async (label) => {
    const q = await bogNow(); ok(q.st === "stuck", label + ": bogged");
    await ev(`__trRoad(${uid}, ${rid}, ${q.p - 40}, 1.6, 1)`); await waitFor(eyes, E => E.b && E.b.cb >= q.p - 1.01, 30000);
    await lineUp("tail", 6);
    ok((await ev(`TLXPL.pdr.towHook(${rid}, ${uid}, false, false)`)) === true, label + ": roped");
    return q;
  };
  const clean = async (label) => { const T = await tw(); const q = (await pdr()) || { st: "gone" }; const e = await ev(`__ropes()`);
    console.log("   ", label, JSON.stringify({ id: T.id, rope: T.rope, terr: T.terr, err: T.err, ropes: e, st: q.st }));
    return { T, q, e }; };
  let c;
  // 2 sleep through it
  await rope("sleep");
  await ev(`__q(3, 0.5)`); await sleep(500);
  c = await clean("after 3h with rope on"); ok(!c.T.err && !c.T.terr, "sleep: nothing thrown");
  ok(c.e <= 1 && (c.T.id ? c.q.st === "stuck" : c.e === 0), "sleep while roped: rope state consistent with bog (st " + c.q.st + ", ropes " + c.e + ")");
  // 3 swap to the other truck while roped
  await ev(`__in()`); await home();
  await rope("swap");
  await ev(`TLXV.swapTo(null); true`); await sleep(500);
  c = await clean("after swap to sled"); ok(!c.T.err && !c.T.terr, "swap: nothing thrown");
  const own = await J(`TLXV.state().owned.map(r => r.id + ":" + r.uid)`);
  const pl = own.find(s => s.startsWith("plowtruck")).split(":")[1];
  await ev(`TLXV.swapTo(${JSON.stringify(pl)}); true`); await sleep(600);
  c = await clean("after swap to the plow truck"); ok(!c.T.err && !c.T.terr, "swap to other truck: nothing thrown");
  console.log("   rope after plow swap:", c.T.id, c.T.rope, "ropes", c.e);
  await ev(`TLXV.swapTo(null); true`);
  // 4 reverse pull: drive backward on the tight rope
  await ev(`__in()`); await home();
  await rope("rev");
  await ev(`__in()`); await sleep(300);
  await down("KeyS"); await sleep(5000); await up("KeyS");
  c = await clean("after 5s reverse"); ok(!c.T.err && !c.T.terr && c.q.st === "stuck", "reverse on the rope: bogged still, nothing thrown, no pull out (" + c.q.st + ")");
  await ev(`__in()`); await home();
  // 1 fire the driver while roped
  await rope("fire");
  await ev(`(() => { const m = TLX.staff.at("plow:" + ${rid}); TLX.staff.letGo(m.id); TLXPL.con.step(); return true; })()`); await sleep(600);
  c = await clean("after fire"); ok(!c.T.err && !c.T.terr, "fire: nothing thrown");
  ok(c.e === 0 && !c.T.id, "fire while roped: rope gone (ropes " + c.e + ", id " + c.T.id + ", bog st " + c.q.st + ")");
});
console.log(fails ? "FAILED: " + FAILED.join(" | ") : "ALL OK"); await done(fails ? 1 : 0);
