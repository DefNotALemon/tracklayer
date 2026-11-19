// 5.4b2a beta: hail a driver who drives YOUR truck (litres/edge line), night, traffic on, hostile fuel/cond, storm line, truck sold while hailed.
// Stills (OUT): the hailed truck with you beside it; the Staff card while it waits.
import { boot, ev, sleep, done, shot, tap, padSet, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const NOSTILLS = !!process.env.NOSTILLS;
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };

const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); true`;
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


let UID = null;
await section("A mine: truck of yours assigned, out at night, traffic on, hail", async () => {
  await ev(`TLXV.buy("plowtruck"); true`); await sleep(500);
  UID = await ev(`TLXV.state().owned.find(r => r.id === "plowtruck").uid`);
  await ev(`TLXPL.PDR.mine = 1; TLXPL.con.sign(${rid}); TLX.staff.tick(); true`); await sleep(300);
  I = await ev(`(() => { const r = __rt(${rid}); let b = -1; for (let i = 1; i < r.seg.length - 1; i++) if (r.seg[i].legs.length && (i + 1) * 400 + 40 <= r.len) { b = i; break; } return b; })()`);
  const id = await ev(`(() => { const S = TLX.state("staff"); S.apps = S.apps.filter(a => a.place !== "plow:" + ${rid}); const a = TLX.staff.post({ id: "plow:" + ${rid}, role: "plowdriver" }); a.tr.honest = true; a.xp = a.xpReal = 10; a.exp = GS.hour + 400; return a.id; })()`);
  ok((await ev(`TLX.staff.hire(${JSON.stringify(id)})`)) === true, "hired");
  const m0 = await J(`TLX.staff.at("plow:" + ${rid})`); DID = m0.id;
  console.log("  kit", m0.kit);
  ok((await ev(`TLX.staff.xact(${DID}, "a" + ${JSON.stringify(UID)})`)) === true, "your truck assigned");
  await ev(`__drv(${rid}, 1, 10, 70); TLXPL.con.step(); true`); await sleep(400);
  const m = await J(`TLX.staff.at("plow:" + ${rid})`); console.log("  kit after", m.kit);
  await standAt(I * SEG - 80, 7); await sleep(500);
  await ev(`GS.hour = Math.floor(GS.hour / 24) * 24 + 24 + 22; TLX.state("roads").h = GS.hour; true`);
  const tr = await J(`({ on: TLX.on("traffic"), n: window.TLXT ? TLXT.cars.filter(c => c.on).length : -1 })`); console.log("  traffic", JSON.stringify(tr));
  await snow(I, 0.5); await snow(I + 1, 0.5);
  await ev(`__q(0.74, 0.37); true`);
  let q = await pdr(); for (let n = 0; n < 50 && q.st === "home"; n++) { await sleep(400); q = await pdr(); }
  ok(q.st === "out", "out at night: " + q.st + " truck " + q.truck);
  const a = await comeNear(26, 150000); ok(a && a.d < 30, "near " + (a && a.d.toFixed(1)));
  await clearToasts();
  ok((await ev(`TLXPL.pdr.hail(${rid})`)) === true, "hail 1");
  const t = await toasts(); console.log("  toast", JSON.stringify(t));
  ok(t.some(x => /L in the tank, the edge at \d+%/.test(x)), "their litres + edge line shown (your truck)");
  ok(!t.some(x => /NaN|undefined|null/.test(x)), "no junk");
  const u = await use(); ok(u.use === "WAVE ON", "use reads WAVE ON: " + JSON.stringify(u.use));
  await shot("hail_mine_night");
});
await section("B hostile values in the line", async () => {
  const say = async patch => J(`(() => { const T = TLXV.state().owned.find(r => r.uid === ${JSON.stringify(UID)}), s = TLX.state("plow"), q = s.pdr[${rid}], m = TLX.staff.at("plow:" + ${rid}), keep = JSON.stringify(q), kt = T && JSON.stringify(T), bl = JSON.stringify(s.blades[${JSON.stringify(UID)}] || null); let r; try { ${patch}; r = TLXPL.pdr.say(${rid}); } catch (e) { r = "THROW " + e.message; } Object.assign(q, JSON.parse(keep)); if (T) Object.assign(T, JSON.parse(kt)); s.blades[${JSON.stringify(UID)}] = JSON.parse(bl); return r; })()`);
  const r = {
    dry: await say(`T.fuel = 0`), nan: await say(`T.fuel = NaN`), neg: await say(`T.fuel = -5`), str: await say(`T.fuel = "7"`), und: await say(`delete T.fuel`),
    cond0: await say(`s.blades[${JSON.stringify(UID)}].cond = 0`), condN: await say(`s.blades[${JSON.stringify(UID)}] = {}`), condNull: await say(`delete s.blades[${JSON.stringify(UID)}]`),
    pNaN: await say(`q.p = NaN`), pBig: await say(`q.p = 1e9`), pNeg: await say(`q.p = -50`), hapNaN: await say(`m.hap = NaN`), hapStr: await say(`m.hap = "x"`),
  };
  for (const k in r) console.log("  ", k, JSON.stringify(r[k]));
  for (const k in r) ok(typeof r[k] === "string" && !/THROW|NaN|undefined|null|Infinity/.test(r[k]), k + " line clean");
  r.pNaN !== undefined && ok(/^[A-Z0-9]/.test(r.pNaN), "pNaN still a sentence");
});
await section("C storm: sits it out line, hail", async () => {
  const s = await J(`(() => { const o = WX.at; WX.at = () => 1; const t = TLXPL.pdr.say(${rid}); WX.at = o; return t; })()`);
  console.log("  storm", JSON.stringify(s));
  ok(/poles|sitting/i.test(s), "storm line: " + s);
});
await section("D sell/remove the truck while hailed", async () => {
  await ev(`TLXPL.pdr.hail(${rid}); true`); await sleep(200);
  const r = await J(`(() => { let e = null, res = null; try { res = TLXV.sell ? TLXV.sell(${JSON.stringify(UID)}) : "nosell"; } catch (x) { e = x.message; } return { e, res }; })()`);
  console.log("  sell", JSON.stringify(r));
  await sleep(2500);
  const st = await J(`({ q: __pdr(${rid}), z: __z(${rid}), err: TLXPL.pdr.sx.err, use: footUse(), say: TLXPL.pdr.say(${rid}) })`);
  console.log("  after", JSON.stringify(st));
  ok(st.err === null, "no err after sale");
  ok(!/NaN|undefined|null/.test(st.say), "say clean after sale");
});
console.log(fails ? `\n${fails} FAIL(s)` : "\nall ok");
await done(fails ? 1 : 0);
