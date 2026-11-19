// Expansion slice 5.4b2a: on the road with your plow driver (tlx-plow.js v27, tlx-staff.js v8). Asserts, exit 1 on a failure.
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
import { boot, ev, sleep, done, shot, tap, padSet } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const NOSTILLS = !!process.env.NOSTILLS;
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };

const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
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

await section("A in: a word beside their parked truck, or at the garage", async () => {
  await ev(`TLXV.buy("plowtruck"); true`); await sleep(500);
  await ev(`TLXPL.PDR.mine = 0; TLXPL.con.sign(${rid}); TLX.staff.tick(); true`); await sleep(300);
  I = await ev(`(() => { const r = __rt(${rid}); let b = -1; for (let i = 1; i < r.seg.length - 1; i++) if (r.seg[i].legs.length && (i + 1) * 400 + 40 <= r.len) { b = i; break; } return b; })()`);
  ok(I >= 1, "a whole stretch to work with: " + I);
  const id = await ev(`(() => { const S = TLX.state("staff"); S.apps = S.apps.filter(a => a.place !== "plow:" + ${rid}); const a = TLX.staff.post({ id: "plow:" + ${rid}, role: "plowdriver" }); a.tr.honest = true; a.xp = a.xpReal = 10; a.exp = GS.hour + 400; return a.id; })()`);
  ok((await ev(`TLX.staff.hire(${JSON.stringify(id)})`)) === true, "a driver with their own truck hired");
  await ev(`__drv(${rid}, 1, 10, 70); TLXPL.con.step(); true`); await sleep(400);
  const m = await J(`TLX.staff.at("plow:" + ${rid})`); DID = m.id; FIRST = String(m.name).split(" ")[0];
  const pl = await J(`(() => { const p = TLXPL.pdr.places().find(p => p.road === ${rid}), g = garageSite, sp = TLXPL.pdr.spot(__rt(${rid})); return { gx: Math.hypot(p.x - g.x, p.z - g.z), pts: p.pts, sp: sp && { x: sp.x, z: sp.z }, far: sp ? Math.hypot(sp.x - g.x, sp.z - g.z) : 0, spot: p.spot, talk: p.talk }; })()`);
  console.log("  ", JSON.stringify(pl));
  ok(pl.gx < 1 && pl.sp && pl.pts && pl.pts.length === 1 && Math.hypot(pl.pts[0][0] - pl.sp.x, pl.pts[0][1] - pl.sp.z) < 0.1 && pl.far > 35, `in: their place is the garage and their parked truck (${Math.round(pl.far)} m apart)`);
  // beside the parked truck, on foot
  await ev(`__foot(${pl.sp.x} + 7, ${pl.sp.z} + 7, 1, 0)`); await sleep(900);
  await ev(`TLX.staff.at("plow:" + ${rid}).talk = -1e9; true`);
  const st = await app("staff");
  ok(/You're at their truck: you can have a word/.test(st), "beside the parked truck the card says you can have a word, at their truck");
  await ev(`TABLET.toggle(false); true`); await sleep(300);
  const u = await use();
  ok(u.use !== "HAIL" && !/hail/i.test(u.hint), "a parked truck with nobody in it is not hailed (" + JSON.stringify(u.use) + ")");
  ok((await ev(`TLX.staff.praise(${DID})`)) === true, "PRAISE lands beside the parked truck");
  // away from both
  await clearToasts();
  await ev(`__foot(${pl.sp.x} + 300, ${pl.sp.z} + 200, 1, 0)`); await sleep(500);
  await ev(`TLX.staff.at("plow:" + ${rid}).talk = -1e9; true`);
  const far = await ev(`TLX.staff.criticise(${DID})`), t = await toasts();
  ok(far === false && t.some(x => /is in: have a word beside their truck, parked at the first end of the .*, or at the garage\./.test(x)), "away from both: no word, and it says where they are");
});

let ME = null;
await section("B out: hail them from the roadside", async () => {
  await ev(`__drv(${rid}, 1, 10, 70); TLX.staff.at("plow:" + ${rid}).talk = -1e9; TLX.staff.at("plow:" + ${rid}).praised = -1e9; TLX.staff.at("plow:" + ${rid}).mood = 0; true`);
  ME = await standAt(I * SEG - 80, 7);
  await sleep(500);
  await snow(I, 0.5); await snow(I + 1, 0.5);
  const due0 = await J(`TLX.state("plow").con[${rid}].due`);
  await ev(`__q(0.74, 0.37); true`);
  let q = await pdr(); for (let n = 0; n < 50 && q.st === "home"; n++) { await sleep(400); q = await pdr(); }
  ok(q.st === "out", "they set out (" + q.st + ")");
  let a = await z(), u = await use();
  console.log("  ", JSON.stringify({ a, u }));
  ok(a && a.d > 35 && u.use !== "HAIL", `the truck ${a ? Math.round(a.d) : "?"} m off: nothing to hail yet`);
  const off = await ev(`TLX.staff.praise(${DID})`);
  ok(off === false, "and no word from the Staff app at that distance");
  await clearToasts();
  a = await comeNear(26);
  u = await use();
  console.log("  ", JSON.stringify({ a, u }));
  ok(a && a.d < 30 && u.use === "HAIL" && new RegExp("E: hail " + FIRST).test(u.hint) && !u.hid, `within 30 m (${a ? a.d.toFixed(1) : "?"}) the use control reads HAIL and the hint names them: ${u.hint}`);
  await tap("KeyE", 90); await sleep(300);
  const h1 = await ev(`TLXPL.pdr.hailed(${rid})`), t = await toasts();
  console.log("  ", JSON.stringify(t));
  ok(h1 === true && t.some(x => new RegExp("^" + FIRST + " pulls up and winds the window down: \"2 stretches to go\\.\" They wait").test(x)), "the key hails them: they pull up and say how the run is going");
  await sleep(1500);
  const s0 = (await z()).s, p0 = (await pdr()).p, g0 = await ev(`gameClock`); let lost = 0;
  for (let n = 0; n < 8; n++) { await sleep(400); lost = Math.max(lost, await ev(`TLXPL.pdr.lost[${rid}] || 0`)); }
  a = await z(); q = await pdr(); const g1 = await ev(`gameClock`);
  ok(Math.abs(a.s - s0) < 0.5 && Math.abs(q.p - p0) < 0.5 && a.v < 0.4 && a.d < 45, `the truck stands still for ${(g1 - g0).toFixed(1)} s of game time (${Math.abs(a.s - s0).toFixed(2)} m), ${a.d.toFixed(1)} m from you`);
  ok(lost > 0, "the hours standing are counted as the eye's, not the road's (" + lost.toFixed(4) + " h in a step)");
  u = await use();
  ok(u.use === "WAVE ON" && new RegExp("E: wave " + FIRST + " on").test(u.hint), "the use control now reads WAVE ON: " + u.hint);
  if (!NOSTILLS) { await ev(`(() => { const Z = TLXPL.pdr.seen.get(${rid}); const mx = (Z.x + FOOT.x) / 2, mz = (Z.z + FOOT.z) / 2, fx = Math.sin(Z.yaw), fz = Math.cos(Z.yaw); const cx = mx + fx * 13 + fz * 9, cz = mz + fz * 13 - fx * 9; window.__cam = { x: cx, z: cz, y: Math.max(surf(cx, cz), surf(mx, mz)) + 3.4, tx: mx, ty: surf(mx, mz) + 1.2, tz: mz }; return true; })()`); await sleep(400); await shot("h1_hailed"); await ev(`window.__cam = null; true`); }
  // a word in person, from the Staff card, while they wait
  const st = await app("staff");
  if (!NOSTILLS) await shot("h2_staff_card");
  ok(/You're at the truck: you can have a word/.test(st), "the Staff card: you are at the truck, you can have a word");
  const dis = await J(`[...$("tabS").querySelectorAll("[data-act='stp:${DID}'],[data-act='stk:${DID}']")].map(b => b.disabled)`);
  ok(dis.length === 2 && dis.every(d => d === false), "PRAISE and CRITICISE are live on the card");
  const uT = await J(`TLXPL.pdr.prov.use()`);
  ok(uT === null, "under the tablet the use control is not the hail's");
  await ev(`$("tabS").querySelector("[data-act='stp:${DID}']").click(); true`); await sleep(300);
  const m = await J(`TLX.staff.at("plow:" + ${rid})`);
  ok(m.mood > 5, "PRAISE pressed on the card lands (mood " + m.mood + ")");
  const still = await ev(`TLXPL.pdr.hailed(${rid})`);
  ok(still === true, "they are still waiting when you put the tablet away");
  await ev(`TABLET.toggle(false); true`); await sleep(400);
  // wave them on
  await clearToasts();
  const s1 = (await z()).s;
  await tap("KeyE", 90); await sleep(300);
  const t2 = await toasts();
  ok((await ev(`TLXPL.pdr.hailed(${rid})`)) === false && t2.some(x => new RegExp("^" + FIRST + " lifts a hand and drives on\\.").test(x)), "the key again waves them on");
  await sleep(3500); a = await z();
  ok(a && a.s - s1 > 5, "and the truck drives on (" + (a ? (a.s - s1).toFixed(0) : "?") + " m in 3.5 s)");
  console.log("   due before", JSON.stringify(due0));
});

await section("C a pad hails, the touch button waves on", async () => {
  // get ahead of the truck again: it is cutting stretch I now (7 m/s)
  let a = await z(); const q = await pdr();
  ok(q.st === "out" && a, "still out (" + q.st + ", s " + (a ? Math.round(a.s) : "?") + ")");
  await standAt(Math.min(a.s + 90, (I + 2) * SEG - 30), 7); await sleep(400);
  a = await comeNear(24, 60000);
  await padSet({}); await sleep(300); await padSet({ 0: 1 }); await sleep(120); await padSet({}); await sleep(400);     // a press of A: the pad is the scheme now
  let u = await use();
  console.log("  ", JSON.stringify({ d: a && a.d, u, dev: await ev(`INP.dev`) }));
  ok(u.use === "HAIL" && /: hail /.test(u.hint) && !/^E: /.test(u.hint), "on a pad the hint names the pad's control: " + u.hint);
  await clearToasts();
  await padSet({ 10: 1 }); await sleep(150); await padSet({}); await sleep(300);
  ok((await ev(`TLXPL.pdr.hailed(${rid})`)) === true && (await toasts()).some(x => /pulls up and winds the window down: "\d stretch(es)? to go/.test(x)), "L3 hails them");
  await ev(`window.__fakePad = null; SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(800);
  const tb = await J(`(() => { const b = $("tcUse"); return { txt: b.textContent, shown: !b.hidden && getComputedStyle(b).display !== "none", hint: $("wnHint").textContent }; })()`);
  console.log("   touch:", JSON.stringify(tb));
  ok(/WAVE ON/.test(tb.txt) && tb.shown && /tap/i.test(tb.hint), "touch: the use button wears WAVE ON and the hint says tap");
  await ev(`(() => { const b = $("tcUse"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return 1; })()`); await sleep(400);
  ok((await ev(`TLXPL.pdr.hailed(${rid})`)) === false, "a tap waves them on");
  const tb2 = await J(`(() => { const b = $("tcUse"); return { txt: b.textContent, shown: !b.hidden && getComputedStyle(b).display !== "none" }; })()`);
  const d2 = (await z()).d;
  ok(d2 > 30 || /HAIL/.test(tb2.txt), "and the button is HAIL again while they are in reach (" + JSON.stringify(tb2) + ", " + d2.toFixed(0) + " m)");
  await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`); await sleep(400);
});

await section("D they do not wait for ever", async () => {
  let a = await z(); const q = await pdr();
  ok(q.st !== "home" && a, "still on the road (" + q.st + ")");
  const dir = q.st === "back" ? -1 : 1;
  await standAt(a.s + dir * 70, 7 * dir); await sleep(400);
  a = await comeNear(24, 60000);
  ok((await ev(`TLXPL.pdr.hail(${rid})`)) === true && (await ev(`TLXPL.PDR.hailT`)) === 60 && Math.abs((await z()).hail - 60) < 2, "hailed: they wait 60 s");
  await clearToasts();
  await ev(`TLXPL.pdr.seen.get(${rid}).hail = 0.6; true`); await sleep(1800);
  ok((await ev(`TLXPL.pdr.hailed(${rid})`)) === false && (await toasts()).some(x => /lifts a hand and drives on/.test(x)), "the time up, they lift a hand and drive on");
  // walk away: hailed again, then you 60 m off
  a = await z();
  if (a.d > 28) { await standAt(a.s + dir * 40, 7 * dir); await comeNear(24, 40000); }
  ok((await ev(`TLXPL.pdr.hail(${rid})`)) === true, "hailed again");
  await sleep(600); a = await z();
  await ev(`__foot(FOOT.x + ${a.x > 0 ? 1 : 1} * 0, FOOT.z, 0, 0); FOOT.x += (FOOT.x - ${a.x}) / ${a.d} * 60; FOOT.z += (FOOT.z - ${a.z}) / ${a.d} * 60; FOOT.y = surf(FOOT.x, FOOT.z); true`); await sleep(900);
  ok((await ev(`TLXPL.pdr.hailed(${rid})`)) === false, "you 60 m further off: they do not sit there waiting");
});

await section("E what they say", async () => {
  const say = async patch => J(`(() => { const s = TLX.state("plow"), q = s.pdr[${rid}], m = TLX.staff.at("plow:" + ${rid}), keep = JSON.stringify(q), km = [m.hap, m.notice]; ${patch}; const t = TLXPL.pdr.say(${rid}); Object.assign(q, JSON.parse(keep)); m.hap = km[0]; m.notice = km[1]; return t; })()`);
  const a = await say(`q.st = "back"; q.n = 2; q.why = ""; q.rc = false`), b = await say(`q.st = "back"; q.n = 0; q.why = "the tank is nearly dry"`), c = await say(`q.st = "back"; q.n = 1; q.rc = true; q.why = "you called them in"`),
    d = await say(`q.st = "out"; q.n = 1; m.hap = 12`), e = await say(`q.st = "out"; m.notice = GS.hour + 90`);
  console.log("  ", JSON.stringify([a, b, c, d, e]));
  ok(/^2 stretches open\. Heading in\.$/.test(a), "heading in with two open: " + a);
  ok(/^Heading in: the tank is nearly dry\.$/.test(b), "turned back: " + b);
  ok(/^1 stretch open\. Heading in: you called me in\.$/.test(c), "recalled, in their own words: " + c);
  ok(/open behind me\. And since you ask: I am not happy in this job\.$/.test(d) || /That was the last of it\. And since you ask/.test(d), "unhappy, they say so: " + d);
  ok(/You have my notice\.$/.test(e), "on notice: " + e);
  ok(![a, b, c, d, e].some(x => /undefined|NaN|null/.test(x)), "no junk in any line");
});

await section("F no warning for the time they stood", async () => {
  await ev(`__foot(garageSite.x + 8, garageSite.z + 8, 1, 0); true`); await sleep(400);   // out of its way, well off the road
  console.log("  ", JSON.stringify(await J(`({ blocked: TLXPL.pdr.blocked(${rid}), hailed: TLXPL.pdr.hailed(${rid}), z: __z(${rid}) })`)));
  const t0 = Date.now(); let sn = [1, 1];
  while (Date.now() - t0 < 200000) { sn = await J(`[__rt(${rid}).st.s[${I}], __rt(${rid}).st.s[${I + 1}]]`); if (sn[0] === 0 && sn[1] === 0) break; await sleep(800); }
  const c = await J(`TLX.state("plow").con[${rid}]`), q = await pdr();
  console.log("  ", JSON.stringify({ sn, strikes: c.strikes, cover: c.cover, q: q && { st: q.st, n: q.n, wkN: q.wkN } }));
  ok(sn[0] === 0 && sn[1] === 0, "both stretches open");
  ok(c.strikes === 0 && !c.cover, "no warning, the kommune's own truck stays home");
  ok((await ev(`TLXPL.pdr.sx.err`)) === null, "nothing threw in the truck's frame code");
});

console.log(fails ? `\n${fails} FAIL(s)` : "\nall ok");
await done(fails ? 1 : 0);
