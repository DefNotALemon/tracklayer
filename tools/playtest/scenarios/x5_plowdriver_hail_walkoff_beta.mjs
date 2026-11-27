// 5.4b2a beta: hail edges: 30 m reach, walk-off at 45 m, pad press (DualSense) hail/wave, hail then mount the sled.
// Stills (OUT): the hailed truck with you beside it; the Staff card while it waits.
import { boot, ev, sleep, done, shot, tap, padSet, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const NOSTILLS = !!process.env.NOSTILLS;
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };

const SETUP = `TLXPL.PDR.bog.km = 0; /* 5.4c1: no driver bogs in this test (x5_plowdriver_stuck.mjs has that) */ tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); true`;
const KIT = `(() => {
  window.__rt = id => TLXR.routes.find(r => r.id === id);
  window.__q = (h, st) => { st = st || 0.5; for (let t = 0; t < h - 1e-6; t += st) { GS.hour += Math.min(st, h - t); TLX.state("roads").h = GS.hour; TLXPL.con.step(); } return true; };
  window.__pdr = id => { const q = TLX.state("plow").pdr[id]; return q ? JSON.parse(JSON.stringify(q)) : null; };
  window.__drv = (id, work, xp, hap) => { const m = TLX.staff.at("plow:" + id); m.tr.work = work; m.tr.temper = 0; m.xpReal = xp; m.hap = hap; m.mood = 0; m.wage = TLX.staff.fair(m); m.paidTo = GS.hour; return TLXPL.pdr.skill(m, id); };
  window.__z = id => { const Z = TLXPL.pdr.seen.get(id); if (!Z) return null; return { s: Z.s, x: Z.x, z: Z.z, yaw: Z.yaw, v: Z.v, hail: Z.hail || 0, d: Math.hypot(Z.x - FOOT.x, Z.z - FOOT.z) }; };
  // you, on foot, set down at a place (dry ground searched for), the sled 14 m further from the road
  window.__foot = (x0, z0, ox, oz) => { crashCancel(); if (VEH.cur) TLXV.swapTo(null); let x = x0, z = z0;
    const wet = (a, b) => isSea(a, b) || isWater(a, b) || isSea(a + 3, b) || isWater(a - 3, b) || isWater(a, b + 3) || isWater(a, b - 3);
    scan: for (let r = 0; r < 60; r += 3) for (let a = 0; a < 6.28; a += 0.5) { const u = x0 + Math.cos(a) * r, v = z0 + Math.sin(a) * r; if (!wet(u, v)) { x = u; z = v; break scan; } }
    FOOT.on = true; FOOT.g.visible = true; FOOT.x = x; FOOT.z = z; FOOT.y = surf(x, z); FOOT.sp = 0;
    const sx = x + (ox || 0) * 14, sz = z + (oz || 0) * 14; P.x = sx; P.z = sz; P.y = surf(sx, sz) + 0.3; P.vx = P.vy = P.vz = 0; P.safe = { x: sx, z: sz, yaw: P.yaw };
    recenter(x, z, true); return { x, z }; };
  if (!window.__rh) window.__rh = setInterval(() => { try { TLX.state("roads").h = GS.hour; } catch (e) { } }, 30);
  if (!window.__camHk) { window.__camHk = true; const rr = renderer.render.bind(renderer); renderer.render = (sc, cam) => { const o = window.__cam; if (o && sc === scene) { cam.position.set(o.x, o.y, o.z); cam.lookAt(o.tx, o.ty, o.tz); cam.updateMatrixWorld(); } rr(sc, cam); }; }
  return true; })()`;
const SEG = 400;
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80); return true; })()`);
const toasts = async () => { await sleep(300); return J(`window.__tsaw || []`); };
const use = () => J(`({ use: footUse(), hint: $("wnHint").textContent, hid: $("wnHint").hidden })`);
const app = async id => { await ev(`TABLET.toggle(true, ${JSON.stringify(id)}); true`); await sleep(500); const t = await ev(`$("tabS").textContent.replace(/\\s+/g, " ")`); return t; };

await boot();
await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 90000; GS.lic = GS.lic || {}; GS.lic.freight = true; true`);
let RID = "dyfjord", I = 0, DID = 0, FIRST = "";
const routes = await J(`TLXPL.con.routes().map(r => ({ id: r.id, len: Math.round(r.len) }))`);
if (!routes.some(r => r.id === RID)) RID = routes[0].id;
const rid = JSON.stringify(RID);
const z = () => J(`__z(${rid})`);
const pdr = () => J(`__pdr(${rid})`);
const snow = (i, v) => ev(`TLXR.setSnow(${rid}, ${v}, ${i}); TLXPL.con.step(); true`);
// stand `off` m right of the road's line at s metres along it
const standAt = async (s, off) => J(`(() => { const p = TLXPL.pdr.pt(__rt(${rid}), ${s}); return __foot(p.x - p.tz * ${off}, p.z + p.tx * ${off}, -p.tz, p.tx); })()`);
// wait until the truck is out and within d metres of you
const comeNear = async (d, ms = 150000) => { const t0 = Date.now(); let a = null; while (Date.now() - t0 < ms) { await sleep(250); const q = await pdr(); a = await z(); if (q && q.st !== "home" && a && a.d < d) return a; } return a; };


const PS = "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)";
const l3 = async () => { await padSet({ 10: 1 }, undefined, PS); await sleep(200); await padSet(); await sleep(400); };
await section("A driver out, in range", async () => {
  await ev(`TLXV.buy("plowtruck"); true`); await sleep(500);
  const UID = await ev(`TLXV.state().owned.find(r => r.id === "plowtruck").uid`);
  await ev(`TLXPL.PDR.mine = 1; TLXPL.con.sign(${rid}); TLX.staff.tick(); true`); await sleep(300);
  I = await ev(`(() => { const r = __rt(${rid}); let b = -1; for (let i = 1; i < r.seg.length - 1; i++) if (r.seg[i].legs.length && (i + 1) * 400 + 40 <= r.len) { b = i; break; } return b; })()`);
  const id = await ev(`(() => { const S = TLX.state("staff"); S.apps = S.apps.filter(a => a.place !== "plow:" + ${rid}); const a = TLX.staff.post({ id: "plow:" + ${rid}, role: "plowdriver" }); a.tr.honest = true; a.xp = a.xpReal = 10; a.exp = GS.hour + 400; return a.id; })()`);
  ok((await ev(`TLX.staff.hire(${JSON.stringify(id)})`)) === true, "hired");
  { const m0 = await J(`TLX.staff.at("plow:" + ${rid})`); ok((await ev(`TLX.staff.xact(${m0.id}, "a" + ${JSON.stringify(UID)})`)) === true, "truck assigned"); }
  await ev(`__drv(${rid}, 1, 10, 70); TLXPL.con.step(); true`); await sleep(300);
  await standAt(I * SEG - 80, 7); await sleep(500);
  await ev(`GS.hour = Math.floor(GS.hour / 24) * 24 + 24 + 10; TLX.state("roads").h = GS.hour; true`);
  await snow(I, 0.5); await snow(I + 1, 0.5);
  await ev(`__q(0.74, 0.37); true`);
  let q = await pdr(); for (let n = 0; n < 50 && q.st === "home"; n++) { await sleep(400); q = await pdr(); }
  ok(q.st === "out", "out: " + q.st);
  const a = await comeNear(22, 150000); ok(a && a.d < 30, "near " + (a && a.d.toFixed(1)));
});
await section("B pad hail and wave", async () => {
  const u0 = await use(); console.log("  use before", JSON.stringify(u0));
  await l3();
  let z0 = await z(); console.log("  after L3", JSON.stringify(z0));
  ok(z0 && z0.hail > 50, "pad L3 hailed (hail " + (z0 && z0.hail) + ")");
  const u = await use(); console.log("  ", JSON.stringify(u));
  ok(u.use === "WAVE ON", "use reads WAVE ON");
  ok(/L3|\(L3\)|press/i.test(u.hint) && !/\bE\b/.test(u.hint), "hint names pad control: " + u.hint);
  await shot("hail_pad");
  await l3(); z0 = await z(); ok(z0 && z0.hail === 0, "pad L3 waves on (hail " + (z0 && z0.hail) + ")");
});
await section("C walk off at 45 m", async () => {
  await ev(`TLXPL.pdr.hail(${rid}); true`); await sleep(200);
  let a = await z(); ok(a.hail > 0, "hailed at " + a.d.toFixed(1) + " m");
  // step the walker back along the road's normal in 5 m steps and read hail
  const log = [];
  for (let k = 0; k < 14; k++) {
    await ev(`(() => { const Z = TLXPL.pdr.seen.get(${rid}); const dx = FOOT.x - Z.x, dz = FOOT.z - Z.z, d = Math.hypot(dx, dz) || 1; FOOT.x += dx / d * 5; FOOT.z += dz / d * 5; FOOT.y = surf(FOOT.x, FOOT.z); recenter(FOOT.x, FOOT.z, true); return true; })()`);
    await sleep(350); a = await z(); log.push(Math.round(a.d) + ":" + (a.hail > 0 ? "H" : "-") + ":" + a.v.toFixed(1));
    if (!(a.hail > 0)) break;
  }
  console.log("  walkoff", log.join(" "));
  ok(!(a.hail > 0), "hail ended walking off");
  const crossed = log.findIndex(s => s.split(":")[1] === "-"); const dEnd = crossed >= 0 ? +log[crossed].split(":")[0] : -1;
  ok(dEnd >= 44 && dEnd <= 55, "ended at about 45 m: " + dEnd);
  await sleep(1500); a = await z(); console.log("  after", JSON.stringify(a)); ok(a.v > 0.5 || a.d > dEnd, "truck driving again, v " + a.v.toFixed(1));
  const u = await use(); ok(u.use !== "WAVE ON", "no stale WAVE ON out of range: " + JSON.stringify(u.use));
});
await section("D hail then mount sled", async () => {
  await comeNear(22, 60000);
  const a0 = await z(); if (a0 && a0.d < 28) { await ev(`TLXPL.pdr.hail(${rid}); true`); await sleep(200); }
  await ev(`(() => { const Z = TLXPL.pdr.seen.get(${rid}); P.x = FOOT.x + 1; P.z = FOOT.z + 1; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; return true; })()`);
  await ev(`mount(); true`); await sleep(4500);
  const s = await J(`({ foot: FOOT.on, z: __z(${rid}), err: TLXPL.pdr.sx.err, hailed: TLXPL.pdr.hailed(${rid}), use: footUse() })`);
  console.log("  mounted", JSON.stringify(s));
  ok(s.err === null, "no err"); ok(!s.foot, "riding");
  await sleep(3000); const s2 = await J(`({ z: __z(${rid}), hailed: TLXPL.pdr.hailed(${rid}) })`);
  console.log("  riding on", JSON.stringify(s2));
  ok(!s2.hailed || s2.z.hail > 0, "state coherent");
  // hail clock should not be held open forever while riding away
  await ev(`P.x += 80; P.z += 80; P.y = surf(P.x, P.z) + 0.3; true`); await sleep(2500);
  const s3 = await J(`({ z: __z(${rid}), hailed: TLXPL.pdr.hailed(${rid}) })`); console.log("  rode 110 m off", JSON.stringify(s3));
  ok(!s3.hailed, "hail released once you ride away");
});
console.log(fails ? `\n${fails} FAIL(s)` : "\nall ok");
await done(fails ? 1 : 0);
