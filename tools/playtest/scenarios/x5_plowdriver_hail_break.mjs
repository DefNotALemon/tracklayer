// 5.4b2a beta break: hail from the sled, letGo while hailed, reload while hailed, clock jump while hailed, hail twice, tablet-open hail.
//   A in, their own truck: a word in person is had beside the parked truck (the card says "their truck") as well as at
//     the garage; away from both the card says where; a parked truck is not hailed (nobody in it).
//   B out, you on foot beside the road: no hail until the truck is within 30 m; then the hint and the use control read
//     HAIL; the key stops the truck, the driver says how the run is going, the hours standing are not the road's
//     (PDLOST), PRAISE lands from the Staff card ("You're at the truck"); the use control reads WAVE ON; waved on it drives.
//   C a pad (L3) hails, the touch button wears HAIL / WAVE ON and waves them on.
//   D they drive on by themselves when the time is up, and when you walk away.
//   E nothing under the tablet. What the driver says heading in, recalled, unhappy, on notice.
//   F no warning, the stretch still opens.
// Stills (OUT): the hailed truck with you beside it; the Staff card while it waits.
import { boot, ev, sleep, done, shot, tap, padSet, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const NOSTILLS = !!process.env.NOSTILLS;
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };

const SETUP = `TLXPL.PDR.bog.km = 0; /* 5.4c1: no driver bogs in this test (x5_plowdriver_stuck.mjs has that) */ tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
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

await section("setup: hire, set out, come near", async () => {
  await ev(`TLXV.buy("plowtruck"); true`); await sleep(500);
  await ev(`TLXPL.PDR.mine = 0; TLXPL.con.sign(${rid}); TLX.staff.tick(); true`); await sleep(300);
  I = await ev(`(() => { const r = __rt(${rid}); let b = -1; for (let i = 1; i < r.seg.length - 1; i++) if (r.seg[i].legs.length && (i + 1) * 400 + 40 <= r.len) { b = i; break; } return b; })()`);
  const id = await ev(`(() => { const S = TLX.state("staff"); S.apps = S.apps.filter(a => a.place !== "plow:" + ${rid}); const a = TLX.staff.post({ id: "plow:" + ${rid}, role: "plowdriver" }); a.tr.honest = true; a.xp = a.xpReal = 10; a.exp = GS.hour + 400; return a.id; })()`);
  ok((await ev(`TLX.staff.hire(${JSON.stringify(id)})`)) === true, "hired");
  await ev(`__drv(${rid}, 1, 10, 70); TLXPL.con.step(); true`); await sleep(400);
  const m = await J(`TLX.staff.at("plow:" + ${rid})`); DID = m.id; FIRST = String(m.name).split(" ")[0];
  await standAt(I * SEG - 80, 7); await sleep(500);
  await snow(I, 0.5); await snow(I + 1, 0.5);
  await ev(`__q(0.74, 0.37); true`);
  let q = await pdr(); for (let n = 0; n < 50 && q.st === "home"; n++) { await sleep(400); q = await pdr(); }
  ok(q.st === "out", "out: " + q.st);
  const a = await comeNear(22); ok(a && a.d < 30, "near " + (a && a.d.toFixed(1)));
});
await section("1 hail from the sled, hail twice, hail with tablet open", async () => {
  await ev(`TLXV.swapTo && 0; FOOT.on = false; true`);
  const p0 = await ev(`TLXPL.pdr.prov.use()`);
  ok(p0 === null || p0 === "null", "riding the sled: the provider offers nothing: " + JSON.stringify(p0));
  await ev(`FOOT.on = true; true`); await sleep(300);
  const z0 = await z(); if (z0 && z0.d > 28) await comeNear(24, 60000);
  ok((await ev(`TLXPL.pdr.hail(${rid})`)) === true, "hail 1");
  await sleep(300);
  const h = (await z()).hail;
  ok((await ev(`TLXPL.pdr.hail(${rid})`)) === true, "hail twice does not throw");
  const h2 = (await z()).hail; ok(h2 > 0 && h2 <= 60.5, "timer restarted, not stacked: " + h + " -> " + h2);
  await ev(`TABLET.toggle(true, "map"); true`); await sleep(500);
  ok((await ev(`TLXPL.pdr.hailed(${rid})`)) === true, "tablet open: still hailed");
  await ev(`TABLET.toggle(false); true`); await sleep(300);
  const seeSt = await ev(`TLXPL.pdr.sx.err`); ok(seeSt === null, "no err");
});
await section("2 clock jump while hailed", async () => {
  const q0 = await pdr(), s0 = (await z()).s;
  await ev(`GS.hour += 1.2; TLX.state("roads").h = GS.hour; TLXPL.con.step(); true`); await sleep(1200);
  const q1 = await pdr(), a = await z();
  console.log("  ", JSON.stringify({ q0: q0.p, q1: q1 && q1.p, st: q1 && q1.st, a }));
  ok(q1 && Number.isFinite(q1.p) && (q1.st === "home" || q1.p >= q0.p - 0.5), "route position sane (a 1.2 h skip lets the run finish: home is fine) after a 1.2 h jump: " + q0.p.toFixed(0) + " -> " + (q1 && q1.p.toFixed(0)));
  ok((await ev(`TLXPL.pdr.sx.err`)) === null, "no err");
});
await section("3 let go while hailed", async () => {
  let a = await z();
  if (!a || a.hail <= 0) { if (a && a.d > 28) await comeNear(24, 60000); await ev(`TLXPL.pdr.hail(${rid})`); await sleep(300); }
  await ev(`TLX.staff.letGo(${DID}); true`); await sleep(1500);
  const u = await use();
  ok(u.use !== "HAIL" && u.use !== "WAVE ON", "no hail control for a gone driver: " + JSON.stringify(u.use));
  ok((await ev(`TLXPL.pdr.hailed(${rid})`)) === false, "not hailed");
  ok((await z()) === null, "seen truck gone");
  ok((await ev(`TLXPL.pdr.sx.err`)) === null, "no err");
  const t = await ev(`TLXPL.pdr.places().length`); ok(t >= 0, "places() ok");
});
await section("4 reload while hailed", async () => {
  // hire a new one, hail, reload
  const id = await ev(`(() => { const S = TLX.state("staff"); S.apps = S.apps.filter(a => a.place !== "plow:" + ${rid}); const a = TLX.staff.post({ id: "plow:" + ${rid}, role: "plowdriver" }); a.tr.honest = true; a.xp = a.xpReal = 10; a.exp = GS.hour + 400; return a.id; })()`);
  ok((await ev(`TLX.staff.hire(${JSON.stringify(id)})`)) === true, "rehired");
  await ev(`__drv(${rid}, 1, 10, 70); true`);
  await snow(I, 0.5); await snow(I + 1, 0.5);
  await ev(`__q(0.74, 0.37); true`);
  await standAt(I * SEG - 80, 7);
  let q = await pdr(); for (let n = 0; n < 50 && q.st === "home"; n++) { await sleep(400); q = await pdr(); }
  const a = await comeNear(24, 120000);
  const hh = a && a.d < 30 ? await ev(`TLXPL.pdr.hail(${rid})`) : null;
  ok(hh === true, "hailed before reload (d " + (a && a.d.toFixed(0)) + ")");
  await sleep(300);
  await reload(); await sleep(1500);
  await ev(SETUP); await ev(KIT); await sleep(800);
  const st = await J(`({ hailed: TLXPL.pdr.hailed(${rid}), q: TLX.state("plow").pdr[${rid}] && TLX.state("plow").pdr[${rid}].st, use: footUse() })`);
  console.log("  ", JSON.stringify(st));
  ok(st.hailed === false, "hail not persisted; truck drives on");
  ok(st.q === "out" || st.q === "back" || st.q === "home", "driver state sane: " + st.q);
  ok((await ev(`TLXPL.pdr.sx.err`)) === null, "no err after reload");
});
console.log(fails ? `\n${fails} FAIL(s)` : "\nall ok");
await done(fails ? 1 : 0);
