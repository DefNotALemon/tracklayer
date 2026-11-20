// BETA 5.4c1 break test: fire / quit road / corrupt state / Monday / sale while a driver is stuck.
// Asserts, exit 1 on a failure.
//   A the risk: none on a stretch the blade copes with (the plow truck's 1.15 m blade at 0.5 / 0.6), some on one drifted
//     deeper, more for the pickup's low blade, more for a slow driver, more on a grade while it snows; PDR.bog.km 0 = never.
//   B their own truck, you far off: with the risk at 0 they open a deep stretch as before; with it certain they bog INSIDE
//     the stretch: st "stuck", the stretch not opened, a notification, a Jobs row to the truck, the Map pin STUCK, the
//     cards say so, the road's clock runs on, an hour stuck is a mood hit.
//   C PAY A TOW: the button on the Staff card with its price ($120 + $20 a km from the garage); not enough cash: refused;
//     paid: cash down, TOW ON ITS WAY, still stuck half an hour later, moving again after the hour, the stretch opened and
//     paid, no second bog in that stretch, home.
//   D left alone: after 6 h they walk home (gone, mood down 30, a word is at the garage again, nobody to hail), the truck
//     stays; a night's sleep changes nothing; a tow then brings it in: home, ready to go out again.
//   E a truck of YOURS: stuck it stays out (not on its spot), burns nothing, no RECALL; towed with the driver in: plowing
//     on; abandoned and towed: back on its own spot, still assigned.
//   F beside it: the truck stands still off its lane toward the windrow, driver at the wheel, beacon lit; a hail gets
//     "Bogged"; abandoned: nobody at the wheel, lamps off, no hail. A reload keeps all of it.
// Stills (OUT): the bogged truck with its driver, the abandoned truck.
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
const still = async (name, rid, dist = 11, h = 3.4, side = -7) => { if (NOSTILLS) return; if (!(await ev(`__look(${rid}, ${dist}, ${h}, ${side})`))) return; await sleep(400); await shot(name); await ev(`window.__cam = null; true`); };
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80); return true; })()`);
const toasts = async () => { await sleep(300); return J(`window.__tsaw || []`); };
const clearNotes = () => ev(`TABLET.log.length = 0; true`);
const notes = () => J(`TABLET.log.map(n => n.title + " | " + n.body)`);
const btns = () => J(`[...$("tabS").querySelectorAll("[data-act^='stx:']")].map(b => ({ act: b.dataset.act, t: b.textContent, off: b.disabled }))`);

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
await section("1 fire a stuck driver", async () => {
  ok(await hire("own"), "hired"); await far(); await ev(`__clean(${rid}); __q(1.6,0.1); true`);
  let q = await bogNow(); ok(q.st === "stuck", "stuck: " + q.st);
  const r = await ev(`(() => { try { const m = TLX.staff.at("plow:" + ${rid}); TLX.staff.letGo(m.id); TLXPL.con.step(); return "ok"; } catch (e) { return "THROW " + e.message; } })()`);
  ok(r === "ok", "letGo while stuck no throw: " + r);
  q = await dump(); console.log("  after fire", JSON.stringify(q));
  const jr = await J(`jobsList().filter(q => q.kind === "plowstuck").length`), pins = await J(`TLXPL.pdr.pins().length`);
  ok(q === null || q.st === "home", "fired driver: state cleared (" + (q && q.st) + ")");
  ok(jr === 0 && pins === 0, `no Jobs row (${jr}) or pin (${pins}) for a fired driver`);
  const t = await J(`TLX.state("plow").pdr[${rid}] ? 1 : 0`); 
});
await section("2 mine truck: fired / sold while stuck", async () => {
  ok(await hire("mine"), "hired mine");
  await ev(`TLX.staff.xact(TLX.staff.at("plow:" + ${rid}).id, "a" + ${uid}); TLXPL.con.step(); true`); await sleep(300);
  await ev(`__clean(${rid}); __drv(${rid},1,10,70); __q(1.6,0.1); true`);
  let q = await bogNow(); ok(q.st === "stuck" && q.truck === UID, "stuck in mine");
  let t = await J(`__tk(${uid})`); console.log("  tk", JSON.stringify(t));
  const r = await ev(`(() => { try { const m = TLX.staff.at("plow:" + ${rid}); TLX.staff.letGo(m.id); TLXPL.con.step(); return "ok"; } catch (e) { return "THROW " + e.message; } })()`);
  ok(r === "ok", "fire while stuck in your truck: " + r);
  t = await J(`__tk(${uid})`); q = await dump(); console.log("  tk after", JSON.stringify(t), JSON.stringify(q));
  ok(t && !t.out, "your truck is not left 'out' forever after the driver is fired (out=" + (t && t.out) + ")");
  ok((await J(`jobsList().filter(q => q.kind === "plowstuck").length`)) === 0, "no stuck row left");
});
await section("3 corrupt stuck state", async () => {
  ok(await hire("own"), "hired"); await far(); await ev(`__clean(${rid}); __drv(${rid},1,10,70); __q(1.6,0.1); true`);
  let q = await bogNow(); ok(q.st === "stuck", "stuck");
  const bad = [["sk","NaN"],["sk","-5"],["sk","1e9"],["tow","NaN"],["tow","-3"],["tow","9"],["p","1e9"],["p","NaN"],["p","-50"],["bogI","'x'"],["bogI","999"],["gone","'yes'"]];
  for (const [k, v] of bad) {
    const r = await ev(`(() => { try { const q = TLX.state("plow").pdr[${rid}]; const o = JSON.parse(JSON.stringify(q)); q.${k} = ${v}; __q(0.3,0.1); jobsList(); TLXPL.pdr.pins(); TLXPL.pdr.where(${rid}); TLXPL.pdr.say(${rid}); TLXPL.pdr.towCost(${rid}); const txt = [JSON.stringify(jobsList().filter(j=>j.kind==="plowstuck")), TLXPL.pdr.where(${rid}), TLXPL.pdr.say(${rid}), JSON.stringify(TLXPL.pdr.pins())].join("|"); const bad = /NaN|undefined|Infinity/.test(txt); Object.assign(TLX.state("plow").pdr[${rid}], o); return bad ? "TEXT " + txt.slice(0,200) : "ok"; } catch (e) { return "THROW " + e.message; } })()`);
    ok(r === "ok", `${k}=${v}: ${r}`);
    q = await dump(); if (q.st !== "stuck") { await ev(`__clean(${rid}); __drv(${rid},1,10,70); true`); q = await bogNow(); }
  }
  // reload with the state corrupted
  await ev(`(() => { const q = TLX.state("plow").pdr[${rid}]; q.sk = NaN; q.tow = "x"; q.p = NaN; save(); return true; })()`);
  await reload(); await ev(SETUP); await sleep(600); await ev(KIT);
  q = await dump(); console.log("  reloaded", JSON.stringify(q));
  ok(!q || q.st !== "stuck" || (Number.isFinite(q.sk) && Number.isFinite(q.p) && Number.isFinite(q.tow)), "reload with NaN fields: sanitised");
  await ev(`__q(1,0.25); true`); q = await dump(); console.log("  +1h", JSON.stringify(q));
});
await section("4 quit road / tow cash / monday while stuck", async () => {
  await ev(`GS.cash = 90000; true`); await hire("own"); await far(); await ev(`__clean(${rid}); __drv(${rid},1,10,70); __q(1.6,0.1); true`);
  let q = await bogNow(); ok(q.st === "stuck", "stuck");
  await ev(`TLXPL.pdr.tow(${rid}) || 0; true`); // cost paid? exact cash
  await ev(`GS.cash = 0; true`);
  ok((await ev(`TLXPL.pdr.tow(${rid})`)) === false, "tow already paid cannot be re-paid");
  const r = await ev(`(() => { try { TLX.monday(); return "ok"; } catch (e) { return "THROW " + e.message; } })()`);
  const real = await ev(`(() => { try { const m = TLXPL.con.monday; if (m) m(); return "ok"; } catch (e) { return "THROW " + e.message; } })()`);
  ok(real === "ok", "con.monday while stuck: " + real);
  q = await dump(); console.log("  after monday", JSON.stringify(q));
  const qr = await ev(`(() => { try { const r = TLXPL.con.quit(${rid}); return "ok " + r; } catch (e) { return "THROW " + e.message; } })()`);
  console.log("  quit:", qr); q = await dump(); console.log("  after quit", JSON.stringify(q));
  ok(!/THROW/.test(qr), "quit road while stuck no throw");
  ok((await J(`jobsList().filter(q => q.kind === "plowstuck").length`)) === 0 || (q && q.st === "stuck"), "row consistent with state");
  ok((await J(`TLXPL.pdr.pins().length`)) === (q && q.st === "stuck" ? 1 : 0), "pin consistent with state");
});
const E = await errs(); ok(E.length === 0, "page errors: " + JSON.stringify(E).slice(0,200));
console.log(fails ? `FAILS: ${fails}` : "ALL OK");
await done(fails ? 1 : 0);
