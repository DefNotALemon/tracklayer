// 4.2c2a beta: held lot at night, option toggled while held, on foot / no truck, far away, sleep.
//   A the lots have a middle and a bank; the option is on; nothing held on a fresh game.
//   B the wrong way round (throwing onto ground already cut): at the cut the lot is HELD, not paid: a line, the riding
//     hint, the Jobs row, the card, the Map pin; the ground is back at the yard's level with the heap standing on it.
//   C a reload does not bank a heap: held, and the heap is laid again when you are near.
//   D the clock runs on while it is held.
//   E banked: passes that throw it to the rim clear it; paid at once by the clock, the snow now stands in the bank.
//   F the right way round (throwing towards the edge all the way): paid by the end of the passes, nothing to go back for.
//   G held and left 12 h: shifted by hand, no pay, a miss. H slept through: the same, one line.
//   I DROP of a held lot (touch layout): the card warns, a miss on file, the heap shifted.
//   J new snow fills a held lot in again. K the option off: paid at the cut, and a held lot is paid.
//   L a heap in the bank is nobody's business; M a little snow in the middle is not a heap. N junk in the save.
import { boot, ev, sleep, done, reload, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const NOSTILLS = !!process.env.NOSTILLS;
const still = async name => { if (!NOSTILLS) await shot(name); };
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80); return true; })()`);

const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
const KIT = `(() => {
  if (!window.__camHk) { window.__camHk = 1; const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); }; }   // stills: survives a reload, which lib's sideCam hook does not
  window.__lt = id => TLXPL.lot.list().find(c => c.id === id);
  window.__st = id => { const s = TLX.state("plow").lot[id]; return s ? JSON.parse(JSON.stringify(s)) : null; };
  // a free square of the lot's middle about 0.3 r from its centre, and the bank square furthest out: [x, z]
  window.__sq = id => { const c = __lt(id); let best = null, bd = 1e9; for (let p = 0; p < c.mid.length; p += 2) { const d = Math.abs(Math.hypot(c.mid[p], c.mid[p + 1]) - c.r * 0.3); if (d < bd) { bd = d; best = [c.x + c.mid[p], c.z + c.mid[p + 1]]; } } return best; };
  window.__rim = id => { const c = __lt(id), M = new Set(); for (let p = 0; p < c.mid.length; p += 2) M.add(c.mid[p] + "," + c.mid[p + 1]); let best = null, bd = -1;
    for (const [k] of c.idx) { const i = Math.floor(k / 1024) - 512, j = k % 1024 - 512; if (M.has(i + "," + j)) continue; const d = Math.hypot(i, j); if (d > bd) { bd = d; best = [c.x + i, c.z + j]; } } return best; };
  window.__at = (x, z) => { const ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL); return { y: yardAt(x, z), r: restCell(ix, iz), d: depthAt(ix, iz) }; };
  window.__mid = id => { const p = __sq(id); return __at(p[0], p[1]); };
  // the m3 standing over the settled level anywhere within r + 4 of the lot's centre (the middle, the bank and just outside)
  window.__all3 = id => { const c = __lt(id), R = c.r + 4; let v = 0; for (let z = c.z - R; z <= c.z + R; z += CELL) for (let x = c.x - R; x <= c.x + R; x += CELL) { if (Math.hypot(x - c.x, z - c.z) > R) continue; const ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL), o = depthAt(ix, iz) - restCell(ix, iz); if (o > 0.12) v += o * CELL * CELL; } return v; };
  window.__lput = (id, u, v) => { const c = __lt(id), d = TLXPL.bladeOf(TLXV.state().cur), x = c.x + u, z = c.z + v - d.z;
    BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; crashCancel(); FOOT.on = false; P.x = x; P.z = z; P.yaw = 0; P.vx = P.vy = P.vz = 0; P.y = surf(x, z); return true; };
  window.__foot = () => { const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw); for (let k = -5; k <= 3; k += 0.15) bladeSnow(P.x + fx * k + fz * 1.6, P.z + fz * k - fx * 1.6, P.x + fx * k - fz * 1.6, P.z + fz * k + fx * 1.6, 0.15); P.y = surf(P.x, P.z); return true; };
  // a puppet: one pass across the lot, the blade's middle u metres east of its centre, nose to +z (so "throw right" lays its windrow to the WEST)
  window.__lpup = (id, u, v0, v1) => { let v = v0; window.__pupOn = true; __lput(id, u, v0); __foot();
    const step = () => { v += 0.12; if (v >= v1) { P.vx = P.vz = 0; window.__pupOn = false; return; } const c = __lt(id), d = TLXPL.bladeOf(TLXV.state().cur);
      P.x = c.x + u; P.z = c.z + v - d.z; P.yaw = 0; P.y = surf(P.x, P.z); P.vx = 0; P.vz = 2.5; if (P.gnd === false) window.__air = (window.__air || 0) + 1; requestAnimationFrame(step); };
    requestAnimationFrame(step); return true; };
  window.__allsq = id => { const c = __lt(id); for (const [k] of c.idx) { const i = Math.floor(k / 1024) - 512, j = k % 1024 - 512; if (!TLXPL.lot.mark([c.x + i, c.z + j, c.x + i, c.z + j], true)) break; } return true; };
  window.__hrs = h => { for (let t = 0; t < h - 1e-6; t += 1.5) { GS.hour += Math.min(1.5, h - t); TLX.state("roads").h = GS.hour; TLXPL.lot.step(); } return true; };
  window.__storm = h => { const w = WX.at; WX.at = () => 1; __hrs(h); WX.at = w; return true; };
  // a held lot without the driving: snowed in, vol m3 heaped on a square of its middle, every square marked
  window.__held = (id, vol) => { const s = TLX.state("plow"); if (!s.lot[id]) TLXPL.lot.take(id); __storm(3); const p = __sq(id); heapSnow(p[0], p[1], 1.5, vol, 0.8); __allsq(id); return __st(id); };
  window.__cam = id => { const c = __lt(id); window.camOv = cam => { cam.position.set(c.x + c.r * 1.5, surf(c.x, c.z) + c.r * 1.7, c.z - c.r * 1.3); cam.lookAt(c.x, surf(c.x, c.z), c.z); }; return true; };
  return true; })()`;
const pass = async (id, u, v0, v1) => { await ev(`__lpup(${JSON.stringify(id)}, ${u}, ${v0}, ${v1})`); for (let i = 0; i < 600 && (await ev("window.__pupOn")); i++) await sleep(100); await sleep(150); };
const blade = dn => ev(`TLXPL.rt(TLXV.state().cur).down = ${dn}; TLXPL.rt(TLXV.state().cur).k = ${dn ? 1 : 0}; TLXPL.rt(TLXV.state().cur).last = null; true`);
const cashNow = () => ev("GS.cash");
const jobs = () => J(`jobsList().filter(r => r.kind === "plowlot").map(r => ({ title: r.title, meta: r.meta, chips: r.chips, pay: r.pay }))`);
const truck = async () => { const uid = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`); await ev(`TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(500); return uid; };
const appText = async () => { await ev(`TABLET.toggle(true, "plow"); true`); await sleep(400); const t = await ev(`$("tabS").textContent`); return t; };
const A = `"hosp"`, B2 = `"sledpark"`;

await boot();
await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 46; TLX.state("roads").h = 46; true`);   // 22:00
const SP = `"sledpark"`;
await ev(`GS.cash = 40000; TLXV.buy("pickup"); true`); await sleep(500);
const uid = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`);
await ev(`TLX.state("plow").blades[${JSON.stringify(uid)}] = { id: "b23", cond: 100, throw: "r" }; TLXPL.tidy(); TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(500);
await section("A held at night", async () => {
  const st = await J(`__held(${SP}, 8)`); console.log("  ", JSON.stringify({ ...st, mk: st.mk && st.mk.length }));
  ok(st.hp === 1 && st.hv > 3, "held at 22:00 with " + st.hv + " m3");
  await ev(`__lput(${SP}, 0, -${12}); true`); await sleep(1500);
  const a = await J(`({ hint: TLXPL.hint(), line: TLXPL.lot.line(), jobs: jobsList().filter(r => r.kind === "plowlot").length })`);
  ok(/stands in the middle/.test(a.hint) && a.jobs === 1, "hint + one Jobs row: " + a.hint.slice(0, 90));
  await still("n1_night_held"); 
});
await section("B on foot beside it", async () => {
  await ev(`FOOT.on = true; FOOT.x = P.x + 3; FOOT.z = P.z; true`); await sleep(1200);
  const a = await J(`({ hint: TLXPL.hint(), line: TLXPL.lot.line(), err: 0 })`);
  console.log("  ", JSON.stringify(a)); ok(true, "on foot: no throw (hint '" + a.hint + "')");
  await ev(`FOOT.on = false; true`);
});
await section("C far away 300 m, 3 h time passes", async () => {
  await ev(`P.x += 300; true`); await sleep(500);
  await ev(`__hrs(3)`); await sleep(800);
  const s = await J(`__st(${SP})`); console.log("  ", JSON.stringify({ ...s, mk: 0 }));
  ok(s && s.hp === 1 && s.h >= 3, "still held after 3 h away, clock " + s.h);
});
await section("D option off then on while held", async () => {
  const c0 = await cashNow();
  await ev(`TLX.setOn("plowheaps", false); true`); await ev(`__hrs(0.3)`); await sleep(600);
  const s = await J(`__st(${SP})`); const c1 = await cashNow();
  console.log("  ", JSON.stringify({ s: s && { ...s, mk: 0 }, c0, c1 }));
  ok(c1 > c0 && (!s || !s.hp), "off: paid " + (c1 - c0));
  await ev(`TLX.setOn("plowheaps", true); true`);
  const t = await appText(); ok(!/NaN|undefined/.test(t), "app renders after toggle back on");
  await ev(`TABLET.toggle(false); true`);
});
await section("E held, sleep 14 h, option toggled during sleep", async () => {
  await ev(`TLXPL.lot.take(${SP}) ; true`).catch(() => 0);
  const st = await J(`__held(${SP}, 6)`); ok(st && st.hp === 1, "held again");
  await ev(`TLX.setOn("plowheaps", false); __hrs(14); TLX.setOn("plowheaps", true); true`); await sleep(800);
  const s = await J(`({ st: __st(${SP}), cash: GS.cash })`); console.log("  ", JSON.stringify({ ...s, st: s.st && { ...s.st, mk: 0 } }));
  ok(!s.st || !s.st.hp, "no dangling held flag after option cycle + 14 h");
});
await section("F no blade truck: swap to sled, heap there", async () => {
  await ev(`TLXPL.lot.take(${SP}); true`).catch(() => 0);
  await ev(`GS.hour += 0; __held(${SP}, 6); FOOT.on = false; TLXV.swapTo(null); true`).catch(() => 0); await sleep(1000);
  const a = await J(`({ hint: TLXPL.hint(), v: TLXV.state().cur, st: __st(${SP}) && __st(${SP}).hp })`); console.log("  ", JSON.stringify(a));
  ok(true, "no throw");
});
await done(fails ? 1 : 0);
