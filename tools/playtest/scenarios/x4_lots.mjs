// 4.2c1 lots: yards plowed by the square metre (tlx-plow.js, the block comment at LOT).
//   A fresh game: the place's lots (the sled park, the helsesenter's forecourt), none taken, each on ground plowed as
//     today; TAKE ON without a blade refused.
//   B with a blade: the app lists them, TAKE ON pressed on the touch layout.
//   C a storm: the lot snows in for real, the other lot and the street stay, a line, a Jobs row, a Map pin; the clock
//     stands still in the storm and runs once it eases.
//   D one pass marks about a blade's width; half the lot is not a clearing (the hint and the app count); a reload in
//     the middle keeps what was cut; the rest clears it: paid at once, in full, by its area.
//   E a late clearing pays between half and full.
//   F left 12 h: dug out by hand, no pay, a miss; the second time it goes to someone else, TAKE ON refused.
//   G slept through: one line for both, a miss each. A paid clearing takes a miss off.
//   H Monday's statement line. I reload keeps lot, snow and clock; junk in the save does not throw.
//   J DROP pressed on the touch layout: cleared by its owner again.
import { boot, ev, sleep, done, reload, shot, sideCam } from "../lib.mjs";
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
  window.__lt = id => TLXPL.lot.list().find(c => c.id === id);
  window.__st = id => { const s = TLX.state("plow").lot[id]; return s ? JSON.parse(JSON.stringify(s)) : null; };
  window.__cnt = id => { const s = TLX.state("plow").lot[id]; return s && s.mk ? s.mk.split("1").length - 1 : 0; };
  // a free square of the lot near its middle: [x, z]
  window.__sq = id => { const c = __lt(id); let best = null, bd = 1e9; for (const [k] of c.idx) { const i = Math.floor(k / 1024) - 512, j = k % 1024 - 512, d = Math.abs(Math.hypot(i, j) - c.r * 0.45); if (d < bd) { bd = d; best = [c.x + i, c.z + j]; } } return best; };
  window.__at = (x, z) => { const ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL); return { y: yardAt(x, z), r: restCell(ix, iz), d: depthAt(ix, iz) }; };
  window.__mid = id => { const p = __sq(id); return __at(p[0], p[1]); };
  window.__lput = (id, u, v) => { const c = __lt(id), d = TLXPL.bladeOf(TLXV.state().cur), x = c.x + u, z = c.z + v - d.z;
    BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; crashCancel(); FOOT.on = false; P.x = x; P.z = z; P.yaw = 0; P.vx = P.vy = P.vz = 0; P.y = surf(x, z); return true; };
  window.__foot = () => { const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw); for (let k = -5; k <= 3; k += 0.15) bladeSnow(P.x + fx * k + fz * 1.6, P.z + fz * k - fx * 1.6, P.x + fx * k - fz * 1.6, P.z + fz * k + fx * 1.6, 0.15); P.y = surf(P.x, P.z); return true; };
  // a puppet: one pass across the lot, the blade's middle u metres east of its centre, carried from v0 to v1 (nose always north-to-south axis +z; v1 < v0 = backing)
  window.__lpup = (id, u, v0, v1) => { const dir = v1 >= v0 ? 1 : -1; let v = v0; window.__pupOn = true; window.__seen = []; __lput(id, u, v0); __foot();
    const step = () => { v += dir * 0.12; if ((v - v1) * dir >= 0) { P.vx = P.vz = 0; window.__pupOn = false; return; } const c = __lt(id), d = TLXPL.bladeOf(TLXV.state().cur);
      P.x = c.x + u; P.z = c.z + v - d.z; P.yaw = 0; P.y = surf(P.x, P.z); P.vx = 0; P.vz = 2.5 * dir; if (P.gnd === false) window.__air = (window.__air || 0) + 1;
      const B = TLXPL.rt(TLXV.state().cur); if (B.lot) window.__seen.push(Math.round(B.lot.k * 100)); requestAnimationFrame(step); };
    requestAnimationFrame(step); return true; };
  // every free square of the lot marked by hand (a zero-length edge on each)
  window.__all = (id, share) => { const c = __lt(id); let n = 0; for (const [k] of c.idx) { if (n++ >= c.n * share) break; const i = Math.floor(k / 1024) - 512, j = k % 1024 - 512; if (!TLXPL.lot.mark([c.x + i, c.z + j, c.x + i, c.z + j], true)) break; } return true; };
  window.__hrs = h => { for (let t = 0; t < h - 1e-6; t += 1.5) { GS.hour += Math.min(1.5, h - t); TLX.state("roads").h = GS.hour; TLXPL.lot.step(); } return true; };
  window.__storm = h => { const w = WX.at; WX.at = () => 1; __hrs(h); WX.at = w; return true; };
  window.__cam = id => { const c = __lt(id); window.camOv = cam => { cam.position.set(c.x + c.r * 1.5, surf(c.x, c.z) + c.r * 1.7, c.z - c.r * 1.3); cam.lookAt(c.x, surf(c.x, c.z), c.z); }; return true; };
  return true; })()`;
const pass = async (id, u, v0, v1) => { await ev(`__lpup(${JSON.stringify(id)}, ${u}, ${v0}, ${v1})`); for (let i = 0; i < 600 && (await ev("window.__pupOn")); i++) await sleep(100); await sleep(150); };
const blade = dn => ev(`TLXPL.rt(TLXV.state().cur).down = ${dn}; TLXPL.rt(TLXV.state().cur).k = ${dn ? 1 : 0}; TLXPL.rt(TLXV.state().cur).last = null; true`);
const cashNow = () => ev("GS.cash");
const jobs = () => J(`jobsList().filter(r => r.kind === "plowlot").map(r => ({ title: r.title, x: r.tgt.x, z: r.tgt.z, meta: r.meta, pay: r.pay, auto: r.auto }))`);
const truck = async () => { const uid = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`); await ev(`TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(500); return uid; };

await boot();
await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; true`);
let L = [], mul = 1;
const A = `"hosp"`, B2 = `"sledpark"`;

await section("A fresh game", async () => {
  L = await J(`TLXPL.lot.list().map(c => ({ id: c.id, name: c.name, who: c.who, r: c.r, n: c.n, m2: c.m2, base: TLXPL.lot.base(c), y: __mid(c.id).y, st: townStreetNear(c.x, c.z), dTown: Math.hypot(c.x - depot.x, c.z - depot.z) }))`);
  for (const c of L) console.log("  ", JSON.stringify(c));
  const a = await J(`({ lot: TLX.state("plow").lot, off: TLX.state("plow").lotOff, hidden: TABLET.byId.plow.hidden(), jobs: jobsList().filter(r => r.kind === "plowlot").length, live: DRIFTS.filter(Y => Y.k > 0).length, world: (TLX.state("plow"), LOTS.map(o => o.id)) })`);
  ok(L.length === 2 && L.some(c => c.id === "hosp") && L.some(c => c.id === "sledpark"), `Kjøllefjord has two lots: ${L.map(c => c.name).join(", ")}`);
  ok(L.every(c => c.n >= 40 && c.m2 === c.n && c.base >= 60 && c.base <= 220), "each has 40+ m2 a truck can reach and is worth $60-220 a clearing (" + L.map(c => `${c.m2} m2 $${c.base}`).join(", ") + ")");
  ok(L.every(c => c.y > 0.8 && c.st > c.r + 1 && c.dTown < 130), "untaken, each lies on ground plowed as today, clear of the streets");
  ok(Object.keys(a.lot).length === 0 && a.hidden === true && a.jobs === 0 && a.live === 0, "fresh game: no lot of yours, no Plow app, no Jobs row, no drift on the ground");
  await clearToasts();
  const r = await ev(`TLXPL.lot.take(${A})`), t = await toasts();
  ok(r === false && t.some(m => /Fit a blade to a truck first/.test(m)) && !(await J(`__st(${A})`)), "TAKE ON without a blade: refused, and it says to fit one");
});
if (L.length < 2) await done(1);
const lot = id => L.find(c => c.id === id), HO = lot("hosp"), SP = lot("sledpark");

await section("B the app, TAKE ON on the touch layout", async () => {
  await ev(`GS.cash = 40000; TLXV.buy("pickup"); true`); await sleep(500);
  const uid = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`);
  await ev(`TLX.state("plow").blades[${JSON.stringify(uid)}] = { id: "b23", cond: 100, throw: "r" }; TLXPL.tidy(); true`); await truck();
  mul = await ev("payMul()");
  await ev(`SET.touch = "on"; setTouchUI(); TABLET.toggle(true, "plow"); true`); await sleep(500);
  const a = await J(`({ txt: $("tabS").textContent, n: $("tabS").querySelectorAll("[data-act^='pat:']").length, blocked: $("tabS").querySelectorAll("[data-act^='pat:'].blocked").length })`);
  ok(a.n === 2 && a.blocked === 0 && /Lots/.test(a.txt) && /The sled park/.test(a.txt) && /The helsesenter's forecourt/.test(a.txt) && a.txt.includes(`${HO.m2} m2 a truck can reach`) && !/NaN|undefined/.test(a.txt), "with a blade the Plow app lists both lots, each ASKING with a TAKE ON button");
  if (!NOSTILLS) { await ev(`(() => { const e = $("tabS").querySelector("[data-act='pat:hosp']"); if (e) e.scrollIntoView({ block: "center" }); return true; })()`); await sleep(300); await still("l1_app_asking"); }
  await clearToasts();
  await ev(`$("tabS").querySelector("[data-act='pat:hosp']").click(); true`); await sleep(400);
  const b = await J(`({ st: __st(${A}), txt: $("tabS").textContent, mid: __mid(${A}) })`), t = await toasts();
  ok(b.st && b.st.s === 0 && /YOURS/.test(b.txt) && t.some(m => m.includes("The helsesenter's forecourt is yours to keep clear") && m.includes("$" + Math.round(HO.base * mul))), "TAKE ON pressed: the lot is yours, the line names the pay (" + JSON.stringify(t) + ")");
  ok(b.mid.y > 0.8, "taken on with no snow in it: still plowed");
  await ev(`TABLET.toggle(false); SET.touch = "off"; setTouchUI(); true`);
});

let before = null;
await section("C a storm snows it in", async () => {
  const far = `(() => { const c = __lt(${A}); let b = null, bd = 1e9; for (let a = 0; a < 6.3; a += 0.2) { const x = c.x + Math.sin(a) * (c.r + 6), z = c.z + Math.cos(a) * (c.r + 6), y = yardAt(x, z); if (y > 0.5 && !b) b = [x, z]; } return b ? yardAt(b[0], b[1]) : -1; })()`;
  before = await J(`({ mid: __mid(${A}), other: __mid(${B2}), far: ${far} })`);
  await clearToasts();
  await ev(`__storm(3)`); await sleep(500);
  const a = await J(`({ st: __st(${A}), mid: __mid(${A}), other: __mid(${B2}), far: ${far}, pins: TABLET.layerPts("marks").filter(p => /HELSESENTER/.test(p.name || "")).length })`), t = await toasts(), j = await jobs();
  console.log("  ", JSON.stringify({ before, a, j }));
  ok(a.st.s > 0.4 && a.st.s < 0.55 && a.st.due === 1, `3 h of storm: its snow level is ${a.st.s.toFixed(2)} (the roads' own rate)`);
  ok(a.mid.y < before.mid.y * 0.62 && a.mid.r > before.mid.r * 1.8, `the snow really lies in it: plowing ${before.mid.y.toFixed(2)} -> ${a.mid.y.toFixed(2)}, the depth it settles at ${(before.mid.r * 100).toFixed(0)} -> ${(a.mid.r * 100).toFixed(0)} cm`);
  ok(Math.abs(a.other.y - before.other.y) < 0.01 && Math.abs(a.far - before.far) < 0.01, "the lot nobody has taken on and the plowed ground 6 m outside this one are untouched");
  ok(t.some(m => /Snow in the helsesenter's forecourt\. Full pay inside 4 h/.test(m)), "a line says so (" + JSON.stringify(t) + ")");
  ok(j.length === 1 && j[0].title === "Plow out the helsesenter's forecourt" && Math.hypot(j[0].x - (await ev(`__lt(${A}).x`)), j[0].z - (await ev(`__lt(${A}).z`))) < 0.5 && j[0].auto === true && /full pay for another 4 h/.test(j[0].meta) && j[0].meta.includes(HO.m2 + " m2"), "Jobs: one row, its target the lot (" + JSON.stringify(j) + ")");
  ok(a.pins === 1, "the Map has a pin on it");
  ok(a.st.h < 0.05, "the clock stood still in the storm (" + a.st.h.toFixed(3) + " h)");
  await ev(`__hrs(2)`);
  const b = await J(`__st(${A})`);
  ok(Math.abs(b.h - a.st.h - 2) < 0.03 && Math.abs(b.s - a.st.s) < 1e-6, "weather eased: 2 h on the clock, no more snow");
});

await section("D plowed by the square metre", async () => {
  const c0 = await cashNow(), r = HO.r;
  await ev(`__lput(${A}, -${r - 1}, -${r})`); await sleep(1500);                 // let the snow field load round the truck
  if (!NOSTILLS) { await sideCam(); await ev(`__cam(${A})`); await sleep(500); await still("l2_lot_snowed_in"); }
  await clearToasts(); await blade(true);
  // the passes a careful driver makes: side by side, 2 m apart, west to east
  const us = []; for (let u = -(r - 1); u <= r - 1 + 1e-6; u += 2) us.push(u);
  let first = null, half = null, i = 0;
  for (; i < us.length; i++) {
    await blade(false); await ev(`__lput(${A}, ${us[i]}, -${r}); __foot()`); await blade(true);
    await pass("hosp", us[i], -r, r);
    const n = await ev(`__cnt(${A})`), st = await J(`__st(${A})`);
    if (first === null) first = n;
    if (!st || st.s === 0) break;
    if (half === null && n >= HO.n * 0.38) { half = { n, i }; break; }
  }
  console.log("  ", JSON.stringify({ first, half, passes: us.length }));
  ok(first !== null && first <= 3.3 * 2 * r && half && half.i >= 1, `one pass marks no more than its own width (${first} squares in the first pass); it took ${half ? half.i + 1 : "?"} passes to cut ${half ? half.n : "?"} of ${HO.n}`);
  const h = await J(`({ st: __st(${A}), hint: TLXPL.hint(), cash: GS.cash, air: window.__air || 0 })`);
  ok(h.st.s > 0.4 && h.cash === c0 && half.n < HO.n * 0.8, `part of the lot cut: not cleared, not paid`);
  await ev(`TABLET.toggle(true, "plow"); true`); await sleep(400);
  const txt = await ev(`$("tabS").textContent`); await ev(`TABLET.toggle(false); true`);
  const pc = Math.round(Math.min(1, half.n / HO.n / 0.8) * 100);
  ok(/\d+% plowed out\. Snowed in/.test(txt) && txt.includes(pc + "% plowed out."), `the app counts it: ${pc}% plowed out`);
  await sleep(900); await still("l3_part_cut");
  // one more pass, watched: the hint counts while the blade is in the lot
  i++; await blade(false); await ev(`__lput(${A}, ${us[i]}, -${r}); __foot()`); await blade(true);
  await ev(`__lpup(${A}, ${us[i]}, -${r}, 0)`); let hint = "";
  for (let k = 0; k < 300 && (await ev("window.__pupOn")); k++) { const t = await ev("TLXPL.hint()"); if (/forecourt: \d+% plowed out/.test(t)) hint = t; await sleep(100); }
  ok(/the helsesenter's forecourt: \d+% plowed out/.test(hint), "the riding hint counts it: " + hint);
  const n1 = await ev(`__cnt(${A})`), mk1 = (await J(`__st(${A})`)).mk;
  // a reload in the middle of the lot
  await blade(false); await ev("save(); true");
  await reload(); await ev(SETUP); await sleep(500); await ev(KIT); await truck();
  const a = await J(`({ st: __st(${A}), mid: __mid(${A}), n: __cnt(${A}), mem: TLXPL.lot.marks.size, k: (TLXPL.lot.mark([__lt(${A}).x, __lt(${A}).z, __lt(${A}).x, __lt(${A}).z], false) || {}).k })`);
  ok(a.st && a.st.mk === mk1 && a.n === n1 && a.mid.y < 0.62, `after a reload the lot is still snowed in and its ${n1} cut squares are in the save`);
  ok(Math.abs(a.k - n1 / HO.n) < 1e-6, `asked, it reads the same share done (${Math.round(a.k * 100)}%)`);
  // the rest
  const c1 = await cashNow(); await clearToasts(); let cleared = false;
  for (i++; i < us.length && !cleared; i++) {
    await blade(false); await ev(`__lput(${A}, ${us[i]}, -${r}); __foot()`); await blade(true);
    await pass("hosp", us[i], -r, r);
    const st = await J(`__st(${A})`); cleared = st.s === 0;
  }
  await blade(false); await sleep(500);
  const z = await J(`({ st: __st(${A}), mid: __mid(${A}), cash: GS.cash, s: { n: TLX.state("plow").lotN, paid: TLX.state("plow").lotPaid }, air: window.__air || 0 })`), t = await toasts(), j = await jobs();
  console.log("  ", JSON.stringify({ z, t, passes: i, of: us.length }));
  const want = Math.round(HO.base * mul);
  ok(cleared && z.st.s === 0 && z.st.due === 0 && z.st.h === 0 && z.st.n === 1 && !z.st.mk, `the rest plowed: the lot is clear after ${i} of ${us.length} passes`);
  ok(z.cash - c1 === want && z.st.wk === want && z.s.n === 1 && z.s.paid === want, `paid at once and in full at 2 h: +$${z.cash - c1} (want $${want} for ${HO.m2} m2)`);
  ok(t.some(m => m.includes(`The helsesenter's forecourt is clear. The helsesenter pays $${want}.`)), "the line names the lot and the pay (" + JSON.stringify(t) + ")");
  ok(z.mid.y > 0.8 && j.length === 0, "it is plowed ground again, the Jobs row is gone");
  ok(z.air < 40, `the puppet stayed on the ground (${z.air} frames off it)`);
  if (!NOSTILLS) { await sideCam(); await ev(`__cam(${A})`); await sleep(500); }
  await still("l4_cleared"); await ev(`window.camOv = null; true`);
});

await section("E a late clearing pays less", async () => {
  await ev(`__storm(3); __hrs(8)`);
  const c0 = await cashNow(), k = await ev(`TLXPL.lot.k(8)`), j = await jobs();
  ok(Math.abs(k - 0.75) < 1e-9 && j.length === 1 && /the pay is falling/.test(j[0].meta), "8 h on the clock: the row says the pay is falling (x" + k + ")");
  await clearToasts(); await ev(`__all(${A}, 0.5)`);
  const m = await J(`({ st: __st(${A}), cash: GS.cash })`);
  ok(m.st.s > 0.4 && m.cash === c0, "half its squares: not paid");
  await ev(`__all(${A}, 1)`);
  const a = await J(`({ st: __st(${A}), cash: GS.cash })`), t = await toasts(), want = Math.round(HO.base * 0.75 * mul);
  ok(Math.abs(a.cash - c0 - want) <= 1 && a.st.s === 0 && a.st.n === 2, `cleared at 8 h: +$${a.cash - c0} (want about $${want}, 75%)`);
  ok(t.some(m2 => /\(7[345]%: 8 h after the weather eased\)/.test(m2)), "the line says why (" + JSON.stringify(t.filter(m2 => /is clear/.test(m2))) + ")");
});

await section("F left 12 h: dug out by hand, then it goes to someone else", async () => {
  await ev(`TLXPL.lot.take(${B2})`);
  await ev(`__storm(3); __hrs(6)`);
  const c0 = await cashNow(); await clearToasts();
  await ev(`__all(${A}, 1)`);                                                    // the first is cleared in time, the second is left
  await ev(`__hrs(6.5)`); await sleep(300);
  const a = await J(`({ a: __st(${A}), b: __st(${B2}), mid: __mid(${B2}), cash: GS.cash })`), t = await toasts();
  console.log("  ", JSON.stringify({ a, t }));
  ok(a.b && a.b.s === 0 && a.b.miss === 1 && a.b.n === 0 && a.mid.y > 0.8, "the sled park, left 12 h: dug out by hand, a miss, plowed ground again");
  ok(t.some(m => m.includes("Nobody came to plow the sled park: it was dug out by hand. No pay. Once more and you lose it.")), "the line says so");
  ok(Math.abs(a.cash - c0 - Math.round(HO.base * 0.875 * mul)) <= 1 && a.a.miss === 0, "the one cleared in time was paid and has no miss");
  await ev(`__storm(3); __hrs(12.5)`); await sleep(300); await clearToasts();
  await ev(`__hrs(0.1)`);
  const b = await J(`({ a: __st(${A}), b: __st(${B2}), off: TLX.state("plow").lotOff, hour: GS.hour, mid: __mid(${B2}) })`);
  ok(b.b === null && b.off.sledpark > b.hour + 160 && b.mid.y > 0.8, "the second time the sled park goes to someone else for a week");
  ok(b.a && b.a.miss === 1, "the forecourt (first miss) is still yours");
  await clearToasts();
  const r = await ev(`TLXPL.lot.take(${B2})`), t3 = await toasts();
  ok(r === false && t3.some(m => m.includes("The skuterklubb has someone else plowing the sled park. Ask again in 7 days.")), "TAKE ON refused, with the days (" + JSON.stringify(t3) + ")");
  await ev(`TABLET.toggle(true, "plow"); true`); await sleep(400);
  const txt = await ev(`$("tabS").textContent`);
  ok(/HAS SOMEONE ELSE/.test(txt) && /DUG OUT BY HAND ONCE/.test(txt) && !/NaN|undefined/.test(txt), "the app shows both: HAS SOMEONE ELSE, and DUG OUT BY HAND ONCE on the other");
  if (!NOSTILLS) { await ev(`(() => { const e = $("tabS").querySelector("[data-act='paq:hosp']"); if (e) e.scrollIntoView({ block: "center" }); return true; })()`); await sleep(300); await still("l5_app_lost"); }
  await ev(`TABLET.toggle(false); true`);
});

await section("G slept through; a paid clearing takes a miss off", async () => {
  await ev(`delete TLX.state("plow").lotOff.sledpark; TLXPL.lot.take(${B2}); TLX.state("plow").lot.hosp.miss = 0; true`);
  await ev(`__storm(3)`); await clearToasts();
  await ev(`GS.hour += 9; TLX.state("roads").h = GS.hour; TLXPL.lot.step(); true`); await sleep(300);
  const a = await J(`({ a: __st(${A}), c: __st(${B2}) })`), t = await toasts();
  ok(a.a.miss === 1 && a.c.miss === 1 && a.a.s === 0 && a.c.s === 0 && t.filter(m => /While you were away/.test(m)).length === 1 && t.some(m => /were dug out by hand\. No pay\./.test(m) && m.includes("the sled park") && m.includes("the helsesenter's forecourt")), "a 9 h sleep over two snowed-in lots: one line naming both, a miss each (" + JSON.stringify(t) + ")");
  await ev(`__storm(3); __all(${B2}, 1)`);
  const b = await J(`__st(${B2})`);
  ok(b.miss === 0 && b.n === 1 && b.wk === Math.round(SP.base * mul), `a paid clearing takes the miss off (the sled park, ${SP.m2} m2: $${b.wk})`);
});

await section("H Monday", async () => {
  const p = await J(`(() => { const s = TLX.state("plow"); let pay = 0, n = 0; for (const k in s.lot) { pay += s.lot[k].wk; n += s.lot[k].n; } TLXPL.lot.monday({ label: "Mon 1 Jan" }); return { pay, n, last: s.conLast[0], wk: Object.values(s.lot).map(q => q.wk + q.n) }; })()`);
  ok(p.n >= 2 && p.last.road === "Lots" && p.last.n === p.n && p.last.pay === p.pay && p.wk.every(v => v === 0), `Monday: one statement line for the lots (${p.n} cleared, $${p.pay}), the week starts again`);
  await ev(`TABLET.toggle(true, "plow"); true`); await sleep(400);
  const txt = await ev(`$("tabS").textContent`);
  ok(txt.includes(`Lots · ${p.n} cleared · +$${p.pay}`), "the app's Statements show it");
  await ev(`TABLET.toggle(false); true`);
});

await section("I reload, junk", async () => {
  await ev(`__hrs(1.5)`);
  const b0 = await J(`__st(${A})`);
  ok(b0.s > 0.4 && Math.abs(b0.h - 1.5) < 0.01, "before the reload: the forecourt snowed in, 1.5 h on the clock");
  await ev("save(); true"); await reload(); await ev(SETUP); await sleep(500); await ev(KIT);
  const a = await J(`({ a: __st(${A}), mid: __mid(${A}), ids: TLXPL.lot.list().map(c => c.id + ":" + c.n), jobs: jobsList().filter(r => r.kind === "plowlot").length })`);
  console.log("  ", JSON.stringify(a));
  ok(a.ids.join() === L.map(c => c.id + ":" + c.n).join(), "the same lots, square for square, after a reload");
  ok(a.a && Math.abs(a.a.s - b0.s) < 0.03 && Math.abs(a.a.h - b0.h) < 0.1 && a.jobs === 1, "the lot, its snow and its clock are kept");
  ok(a.mid.y < 0.62, "and the snow lies in it again from the first frame (plowing " + a.mid.y.toFixed(2) + ")");
  const r = await J(`(() => { const s = TLX.state("plow"); try { s.lot = { zz: 5, nowhere: { s: 0.5 }, hosp: { s: "x", h: NaN, miss: 99, wk: -4, n: null, mk: "01x", ms: "q" } }; s.lotOff = { a: "b" }; s.lotPaid = NaN; s.lotH = "q";
    TLXPL.tidy(); TLXPL.lot.step(); TLXPL.lot.mark([0, 0, 1, 1], true); TABLET.toggle(true, "plow"); jobsList(); const q = s.lot.hosp; return { ok: true, q, txt: $("tabS").textContent.slice(0, 6000), off: s.lotOff, paid: s.lotPaid }; } catch (e) { return { ok: false, e: String(e) }; } })()`);
  ok(r.ok && r.q && r.q.s === 0 && r.q.h === 0 && r.q.miss === 1 && r.q.wk === 0 && r.q.n === 0 && r.q.mk === undefined && r.paid === 0 && !/NaN|undefined/.test(r.txt), "junk in the saved lots: tidied, nothing thrown, the app renders (" + (r.e || "") + ")");
  await ev(`TABLET.toggle(false); delete TLX.state("plow").lot.zz; delete TLX.state("plow").lot.nowhere; true`);
});

await section("J DROP on the touch layout", async () => {
  await ev(`__storm(3); SET.touch = "on"; setTouchUI(); TABLET.toggle(true, "plow"); true`); await sleep(500);
  const m0 = await J(`__mid(${A})`); await clearToasts();
  await ev(`$("tabS").querySelector("[data-act='paq:hosp']").click(); true`); await sleep(400);
  const a = await J(`({ st: __st(${A}), mid: __mid(${A}), jobs: jobsList().filter(r => r.kind === "plowlot").length })`), t = await toasts();
  ok(m0.y < 0.62 && a.st === null && a.mid.y > 0.8 && a.jobs === 0 && t.some(m => m.includes("You've given up the helsesenter's forecourt. The helsesenter has it cleared again.")), "DROP pressed on a snowed-in lot: its owner clears it again, no row, no penalty (" + JSON.stringify(t) + ")");
  await ev(`TABLET.toggle(false); SET.touch = "off"; setTouchUI(); true`);
});

console.log(fails ? `FAILED: ${fails}` : "all ok");
await done(fails ? 1 : 0);
