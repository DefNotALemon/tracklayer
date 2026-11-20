// BETA 5.4c1: quit the road / reload (also mid tow) while a driver is stuck in YOUR truck. Exit 1 on failure.
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
  window.__tk = uid => { const r = TLXV.state().owned.find(q => q.uid === uid), R = TLXV.runtimeOf(uid); return r ? { out: r.out || null, fuel: r.fuel, x: r.x, z: r.z, vis: !!(R && R.grp.visible) } : null; };
  window.__me = (x, z) => { crashCancel(); FOOT.on = false; if (VEH.cur) TLXV.swapTo(null); P.x = x; P.z = z; P.y = surf(x, z) + 0.2; P.vx = P.vz = P.vy = 0; P.yaw = 0; recenter(x, z, true); return true; };
  window.__z = id => { const Z = TLXPL.pdr.seen.get(id); if (!Z || !Number.isFinite(Z.x)) return null; const n = TLXR.near(Z.x, Z.z), r = __rt(id), p = TLXPL.pdr.pt(r, n.s); let dy = Z.yaw - Math.atan2(p.tx, p.tz); while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
    return { x: Z.x, z: Z.z, v: Z.v, off: Z.off, roadD: n.d, dyaw: dy, drv: Z.R.drvBody.visible, lit: !!Z.lit, bc: Z.bc.userData.mat.color.r, vis: Z.R.grp.visible, hail: Z.hail || 0, gh: Z.gh }; };
  if (!window.__rh) window.__rh = setInterval(() => { try { TLX.state("roads").h = GS.hour; } catch (e) { } }, 30);
  if (!window.__camHk) { window.__camHk = true; const rr = renderer.render.bind(renderer); renderer.render = (sc, cam) => { const o = window.__cam; if (o && sc === scene) { cam.position.set(o.x, o.y, o.z); cam.lookAt(o.tx, o.ty, o.tz); cam.updateMatrixWorld(); } rr(sc, cam); }; }
  window.__look = (id, dist, h, side) => { const Z = TLXPL.pdr.seen.get(id); if (!Z || !Number.isFinite(Z.x)) { window.__cam = null; return false; } const fx = Math.sin(Z.yaw), fz = Math.cos(Z.yaw); const cx = Z.x + fx * dist * 0.75 + fz * side, cz = Z.z + fz * dist * 0.75 - fx * side; window.__cam = { x: cx, z: cz, y: Math.max(surf(cx, cz), surf(Z.x, Z.z)) + h, tx: Z.x, ty: surf(Z.x, Z.z) + 1.4, tz: Z.z }; return true; };
  return true; })()`;
const SEG = 400;
await boot();
await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 90000; GS.lic = GS.lic || {}; GS.lic.freight = true; true`);
const RID = "dyfjord", rid = JSON.stringify(RID);
const pdr = () => J(`__pdr(${rid})`);
const z = () => J(`__z(${rid})`);
const snow = (i, v) => ev(`TLXR.setSnow(${rid}, ${v}, ${i}); TLXPL.con.step(); true`);
const km = v => ev(`TLXPL.PDR.bog.km = ${v}; true`);
const mood = () => ev(`TLX.staff.at("plow:" + ${rid}).mood`);
let I = 1, UID = "", uid = "";
const hire = async kit => {
  await ev(`TLXPL.PDR.mine = ${kit === "mine" ? 1 : 0}; (() => { const m = TLX.staff.at("plow:" + ${rid}); if (m) TLX.staff.letGo(m.id); TLXPL.con.step(); return true; })()`); await sleep(200);
  const id = await ev(`(() => { const S = TLX.state("staff"); S.apps = S.apps.filter(a => a.place !== "plow:" + ${rid}); const a = TLX.staff.post({ id: "plow:" + ${rid}, role: "plowdriver" }); a.tr.honest = true; a.xp = a.xpReal = 10; a.exp = GS.hour + 400; return a.id; })()`);
  const h = await ev(`TLX.staff.hire(${JSON.stringify(id)})`);
  await ev(`__drv(${rid}, 1, 10, 70); TLXPL.con.step(); true`); await sleep(400);
  return h === true;
};
const far = async () => { await ev(`crashCancel(); FOOT.on = false; true`); await park("P.x + 2600", "P.z + 2600"); await sleep(300); };
// snow on stretch I, the driver sets out; then run the clock until they are stuck or home again (the clock's pace: 0.02 h steps)
const setOut = async v => { await snow(I, v); await ev(`__q(0.74, 0.37)`); let q = await pdr(); for (let n = 0; n < 8 && q.st === "home"; n++) { await ev(`__q(0.1, 0.1)`); q = await pdr(); } return q; };
const until = async (pred, hrs = 1.2) => { let q = await pdr(); for (let t = 0; t < hrs && !pred(q); t += 0.04) { await ev(`__q(0.04, 0.02)`); q = await pdr(); } return q; };
const bogNow = async () => { await ev(`__clean(${rid})`); await ev(`__q(1.6, 0.1)`); await km(1e9); const q0 = await setOut(0.9); return q0.st === "stuck" ? q0 : until(q => q.st === "stuck" || q.st === "home"); };



await ev(`TLXV.buy("plowtruck"); true`); await sleep(600);
UID = await ev(`TLXV.state().owned.find(r => r.id === "plowtruck").uid`); uid = JSON.stringify(UID);
await ev(`TLXPL.PDR.mine = 0; TLXPL.con.sign(${rid}); TLX.staff.tick(); true`); await sleep(300);
I = await ev(`(() => { const r = __rt(${rid}); let b = -1; for (let i = 1; i < r.seg.length - 1; i++) if (r.seg[i].legs.length && (i + 1) * 400 + 40 <= r.len) { b = i; break; } return b; })()`);
console.log("stretch", I);
const dump = () => J(`(() => { const q = TLX.state("plow").pdr[${rid}]; return q ? { st: q.st, sk: q.sk, tow: q.tow, gone: q.gone, bogI: q.bogI, p: q.p, truck: q.truck||null } : null; })()`);
const errs = () => J(`window.__errs || []`);
await ev(`window.__errs = []; window.addEventListener("error", e => window.__errs.push(String(e.message))); true`);
await section("1 quit the road while stuck in YOUR truck", async () => {
  ok(await hire("mine"), "hired mine");
  await ev(`TLX.staff.xact(TLX.staff.at("plow:" + ${rid}).id, "a" + ${uid}); TLXPL.con.step(); true`); await sleep(300);
  await ev(`__clean(${rid}); __drv(${rid},1,10,70); __q(1.6,0.1); true`);
  await far();
  let q = await bogNow(); ok(q.st === "stuck" && q.truck === UID, "stuck in mine: " + q.st);
  let t = await J(`__tk(${uid})`); ok(t && t.out, "truck out while stuck: " + JSON.stringify(t));
  const qr = await ev(`(() => { try { return "ok " + TLXPL.con.quit(${rid}); } catch (e) { return "THROW " + e.message; } })()`);
  ok(!/THROW/.test(qr), "quit no throw: " + qr);
  t = await J(`__tk(${uid})`); q = await dump(); console.log("  after quit", JSON.stringify(t), JSON.stringify(q));
  ok(t && !t.out, "truck not left out after the road is handed back (out=" + (t && t.out) + ")");
  ok((await J(`jobsList().filter(q => q.kind === "plowstuck").length`)) === 0, "no stuck row");
  ok((await J(`TLXPL.pdr.pins().length`)) === 0, "no pin");
  ok(await ev(`TLXV.state().owned.some(r => r.uid === ${uid})`) === true, "truck still owned");
  await ev(`__q(2,0.25); true`); t = await J(`__tk(${uid})`); ok(t && !t.out, "still free 2 h later");
});
await section("2 reload while stuck in your truck", async () => {
  await ev(`TLXPL.con.sign(${rid}); TLX.staff.tick(); true`);
  ok(await hire("mine"), "hired mine again");
  await ev(`TLX.staff.xact(TLX.staff.at("plow:" + ${rid}).id, "a" + ${uid}); TLXPL.con.step(); true`); await sleep(300);
  await ev(`__clean(${rid}); __drv(${rid},1,10,70); __q(1.6,0.1); true`); await far();
  let q = await bogNow(); ok(q.st === "stuck", "stuck again: " + q.st);
  const before = await J(`__tk(${uid})`);
  await ev(`save(); true`); await reload(); await ev(SETUP); await sleep(600); await ev(KIT);
  q = await dump(); const t = await J(`__tk(${uid})`); console.log("  reloaded", JSON.stringify(q), JSON.stringify(t));
  ok(q && q.st === "stuck" && q.truck === UID, "still stuck in the same truck after reload");
  ok(t && t.out, "truck still out after reload");
  ok(t && before && Math.abs(t.x - before.x) < 3 && Math.abs(t.z - before.z) < 3, "truck at the same place");
  ok((await J(`jobsList().filter(q => q.kind === "plowstuck").length`)) === 1, "one stuck row after reload");
  ok((await J(`TLXPL.pdr.pins().length`)) === 1, "one pin after reload");
  // pay tow, reload mid tow, then finish
  await ev(`GS.cash = 90000; true`);
  ok((await ev(`TLXPL.pdr.tow(${rid})`)) !== false, "tow paid");
  await ev(`save(); true`); await reload(); await ev(SETUP); await sleep(600); await ev(KIT);
  q = await dump(); console.log("  reloaded mid tow", JSON.stringify(q));
  ok(q && q.st === "stuck" && q.tow > 0, "tow kept through reload: " + (q && q.tow));
  await ev(`__q(1.6,0.1); true`); q = await dump(); const t2 = await J(`__tk(${uid})`); console.log("  +1.6h", JSON.stringify(q), JSON.stringify(t2));
  ok(q && q.st !== "stuck", "no longer stuck after the tow hour: " + (q && q.st));
});
const E = await errs(); ok(E.length === 0, "page errors: " + JSON.stringify(E).slice(0,200));
console.log(fails ? `FAILS: ${fails}` : "ALL OK");
await done(fails ? 1 : 0);
