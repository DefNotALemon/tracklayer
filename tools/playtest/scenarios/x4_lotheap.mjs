// 4.2c2a where a lot's heap may go (tlx-plow.js, the block comment "where a lot's heap may go").
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
await ev(`GS.hour = 32; TLX.state("roads").h = 32; true`);
let L = [], mul = 1, OKM3 = 1;

await section("A the middle and the bank", async () => {
  await ev(`GS.cash = 40000; TLXV.buy("pickup"); true`); await sleep(500);
  const uid = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`);
  await ev(`TLX.state("plow").blades[${JSON.stringify(uid)}] = { id: "b23", cond: 100, throw: "r" }; TLXPL.tidy(); true`); await truck();
  mul = await ev("payMul()"); OKM3 = await ev("TLXPL.lot.LOT.heapOk");
  L = await J(`TLXPL.lot.list().map(c => ({ id: c.id, name: c.name, r: c.r, n: c.n, mid: c.mid.length / 2, base: TLXPL.lot.base(c), rim: !!__rim(c.id), heap: TLXPL.lot.heap(c) }))`);
  for (const c of L) console.log("  ", JSON.stringify(c));
  ok(L.length === 2 && L.every(c => c.mid >= c.n * 0.4 && c.mid <= c.n * 0.85 && c.rim), "each lot has a middle and a bank a truck can reach (" + L.map(c => `${c.name}: ${c.mid} of ${c.n} squares are middle`).join(", ") + ")");
  ok(L.every(c => c.heap === 0), "nothing stands in either on a fresh game");
  const o = await J(`({ on: TLX.on("plowheaps"), listed: TLX.options.some ? TLX.options.some(q => q.id === "plowheaps") : !!TLX.options.plowheaps, hint: TLXPL.lot.line() })`);
  ok(o.on === true && o.listed && o.hint === "", "the option plowheaps is listed and on; no line about a heap");
});
if (L.length < 2) await done(1);
const lot = id => L.find(c => c.id === id), HO = lot("hosp"), SP = lot("sledpark");

let held = null, c0 = 0;
await section("B the wrong way round: cut, but held", async () => {
  await ev(`TLXPL.lot.take(${A}); __storm(3); __hrs(0.5)`);
  c0 = await cashNow(); const r = HO.r;
  await ev(`__lput(${A}, -${r - 1}, -${r})`); await sleep(1500); await clearToasts();
  const us = []; for (let u = -(r - 1); u <= r - 1 + 1e-6; u += 2) us.push(u);   // west to east, the windrow thrown west: onto what was just cut
  let i = 0, st = null;
  for (; i < us.length; i++) {
    await blade(false); await ev(`__lput(${A}, ${us[i]}, -${r}); __foot()`); await blade(true);
    await pass("hosp", us[i], -r, r);
    st = await J(`__st(${A})`); if (!st || st.hp || st.s === 0) break;
  }
  await sleep(700);
  const a = await J(`({ st: __st(${A}), cash: GS.cash, mid: __mid(${A}), heap: TLXPL.lot.heap(__lt(${A})), hint: TLXPL.hint(), line: TLXPL.lot.line(), pins: TABLET.layerPts("marks").filter(p => /HELSESENTER/.test(p.name || "")).map(p => p.name), air: window.__air || 0 })`), t = await toasts(), j = await jobs();
  console.log("  ", JSON.stringify({ a, t, j, passes: i + 1 }));
  held = a.st;
  ok(a.st && a.st.hp === 1 && a.st.hv > OKM3 * 2 && a.st.s > 0.4 && a.st.due === 1 && typeof a.st.mk === "string", `cut after ${i + 1} passes, and held: ${a.st && a.st.hv} m3 of the blade's snow stands in its middle`);
  ok(a.cash === c0 && a.st.n === 0, "not paid");
  ok(Math.abs(a.heap - a.st.hv) < 0.5, `measured again it reads the same (${a.heap.toFixed(2)} m3)`);
  ok(a.mid.y > 0.8, "the ground is back at the yard's level: only the heap stands (plowing " + a.mid.y.toFixed(2) + ")");
  ok(t.some(m => /The helsesenter's forecourt is cut, but \d+\.\d m3 of your plow's snow stands in the middle of it\. Bank it along the edge/.test(m) && m.includes("the helsesenter pays")) && !t.some(m => /is clear/.test(m)), "a line says so and what to do (" + JSON.stringify(t) + ")");
  ok(/the helsesenter's forecourt: cut, but \d+\.\d m3 of your snow stands in the middle: bank it along the edge/.test(a.hint) && !/% plowed out/.test(a.hint) && a.line !== "", "the riding hint: " + a.hint.slice(0, 120));
  ok(j.length === 1 && j[0].title === "Bank your heap in the helsesenter's forecourt" && /cut, but \d+\.\d m3 of your snow stands in its middle/.test(j[0].meta) && /HEAP IN THE MIDDLE/.test(j[0].chips) && /full pay for another/.test(j[0].meta), "Jobs: the row is about the heap (" + JSON.stringify(j.map(q => [q.title, q.meta])) + ")");
  ok(a.pins.length === 1 && /YOUR HEAP/.test(a.pins[0]), "the Map pin says YOUR HEAP");
  ok(a.air < 120, `the puppet stayed on the ground but for the heaps it rode over (${a.air} frames off it)`);
  await blade(false);
  const txt = await appText();
  ok(/HEAP IN THE MIDDLE/.test(txt) && /Cut, but \d+\.\d m3 of your plow's snow stands in the middle of it: bank it along the edge to be paid\. Full pay for another/.test(txt) && /DROP it with your heap in its middle and it is shifted by hand/.test(txt) && /a lot is not clear while more than/.test(txt) && !/NaN|undefined/.test(txt), "the app's card: HEAP IN THE MIDDLE, what stands there, the DROP warning, the note");
  if (!NOSTILLS) { await ev(`(() => { const e = $("tabS").querySelector("[data-act='paq:hosp']"); if (e) e.scrollIntoView({ block: "center" }); return true; })()`); await sleep(300); await still("h1_app_held"); }
  await ev(`TABLET.toggle(false); true`);
  if (!NOSTILLS) { await ev(`__cam(${A})`); await sleep(600); await still("h2_lot_held"); await ev(`window.camOv = null; true`); }
});

await section("C a reload does not bank a heap", async () => {
  await ev("save(); true"); await reload(); await ev(SETUP); await sleep(500); await ev(KIT); await truck();
  const a = await J(`({ st: __st(${A}), mid: __mid(${A}) })`);
  ok(a.st && a.st.hp === 1 && Math.abs(a.st.hv - held.hv) < 0.6 && a.st.mk === held.mk && a.mid.y > 0.8, "after a reload: still held, the m3 and the cut squares in the save, the ground at the yard's level");
  await ev(`__lput(${A}, -${HO.r - 1}, -${HO.r})`); await sleep(2200);
  const b = await J(`({ st: __st(${A}), heap: TLXPL.lot.heap(__lt(${A})), cash: GS.cash, line: TLXPL.lot.line() })`);
  console.log("  ", JSON.stringify(b));
  ok(b.st && b.st.hp === 1 && b.heap > Math.max(OKM3 * 2, held.hv * 0.5) && b.cash === c0, `near it again the heap is back where it lay (${b.heap.toFixed(1)} of ${held.hv} m3), still not paid`);
  ok(/stands in the middle/.test(b.line), "and the line is back");
});

await section("D the clock runs on", async () => {
  const h0 = (await J(`__st(${A})`)).h; await ev(`__hrs(2)`);
  const a = await J(`({ st: __st(${A}), cash: GS.cash })`);
  ok(Math.abs(a.st.h - h0 - 2) < 0.03 && a.st.hp === 1 && a.cash === c0, `2 h later: ${a.st.h.toFixed(1)} h on the clock, still held, still unpaid`);
});

await section("E banked: paid", async () => {
  const before = await J(`({ heap: TLXPL.lot.heap(__lt(${A})), all: __all3(${A}) })`), r = HO.r; await clearToasts();
  let i = 0, st = null; const us = [0, -2, -4, -6, -8];                           // east to west through the heap: every pass throws it further towards the west rim
  for (; i < us.length; i++) {
    await blade(false); await ev(`__lput(${A}, ${us[i]}, -${r}); __foot()`); await blade(true);
    await pass("hosp", us[i], -r, r); await sleep(700);
    st = await J(`__st(${A})`); console.log("   pass", us[i], JSON.stringify({ hp: st.hp, hv: st.hv, s: st.s }));
    if (st.s === 0) break;
  }
  await blade(false); await sleep(400);
  const a = await J(`({ st: __st(${A}), cash: GS.cash, heap: TLXPL.lot.heap(__lt(${A})), all: __all3(${A}), mid: __mid(${A}), line: TLXPL.lot.line() })`), t = await toasts(), j = await jobs(), want = Math.round(HO.base * mul);
  console.log("  ", JSON.stringify({ before, a, t, passes: i + 1 }));
  ok(a.st && a.st.s === 0 && !a.st.hp && a.st.hv === undefined && !a.st.mk && a.st.n === 1, `the heap pushed to the rim in ${i + 1} passes: the lot is clear`);
  ok(a.cash - c0 === want && a.st.wk === want, `paid at once, in full at ${held.h.toFixed(1)} + 2 h on the clock: +$${a.cash - c0} (want $${want})`);
  ok(t.some(m => m.includes(`The helsesenter's forecourt is clear. The helsesenter pays $${want}.`)), "the line names the pay (" + JSON.stringify(t) + ")");
  ok(a.heap < OKM3 && a.all > 1.5 && a.all - a.heap > 1.5, `the snow was banked, not lost: ${a.heap.toFixed(2)} m3 left in the middle, ${(a.all - a.heap).toFixed(1)} m3 standing in the bank and beyond`);
  ok(j.length === 0 && a.line === "" && a.mid.y > 0.8, "no Jobs row, no line, plowed ground");
  if (!NOSTILLS) { await ev(`__cam(${A})`); await sleep(600); await still("h3_lot_banked"); await ev(`window.camOv = null; true`); }
});

await section("F the right way round", async () => {
  await ev(`TLXPL.lot.take(${B2}); __storm(3); __hrs(0.5)`);
  const c1 = await cashNow(), r = SP.r, hadA = (await J(`__st(${A})`)).s;
  await ev(`__lput(${B2}, ${r - 1}, -${r})`); await sleep(1500); await clearToasts();
  const us = []; for (let u = r - 1; u >= -(r - 1) - 1e-6; u -= 2) us.push(u);    // east to west, the windrow thrown west: always onto snow not yet cut, and at last over the rim
  let i = 0, st = null, heldAt = -1;
  for (; i < us.length; i++) {
    await blade(false); await ev(`__lput(${B2}, ${us[i]}, -${r}); __foot()`); await blade(true);
    await pass("sledpark", us[i], -r, r); await sleep(700);
    st = await J(`__st(${B2})`); if (st.hp && heldAt < 0) heldAt = i;
    if (st.s === 0) break;
  }
  await blade(false);
  const a = await J(`({ st: __st(${B2}), cash: GS.cash, hp: !!(__st(${A}) || {}).hp })`), t = await toasts(), want = Math.round(SP.base * mul);
  console.log("  ", JSON.stringify({ a, heldAt, passes: i + 1, of: us.length, t, hadA }));
  ok(a.st.s === 0 && a.st.n === 1 && a.cash - c1 === want, `worked towards the rim, never going back: clear and paid $${a.cash - c1} after ${i + 1} of ${us.length} passes` + (heldAt >= 0 ? ` (held from pass ${heldAt + 1} until the windrow went over the edge)` : ""));
  ok(t.some(m => m.includes(`The sled park is clear. The skuterklubb pays $${want}.`)), "the line names the pay");
  ok(!a.hp, "the other lot (snowed in, not cut) is not held by any of it");
});

await section("G held and left 12 h", async () => {
  await ev(`(() => { const s = TLX.state("plow"); for (const k in s.lot) { s.lot[k].s = 0; s.lot[k].h = 0; s.lot[k].due = 0; s.lot[k].miss = 0; delete s.lot[k].mk; delete s.lot[k].ms; } TLXPL.lot.step(); return true; })()`);
  await ev(`TLXPL.lot.drop(${A})`);
  const h = await J(`__held(${B2}, 6)`), c1 = await cashNow();
  ok(h && h.hp === 1 && h.hv > OKM3, `6 m3 heaped in the middle and every square cut: held (${h && h.hv} m3)`);
  await ev(`__hrs(11.5)`);
  const m = await J(`__st(${B2})`);
  ok(m.hp === 1 && m.miss === 0, "11.5 h: still held");
  await clearToasts(); await ev(`__hrs(1)`); await sleep(300);
  const a = await J(`({ st: __st(${B2}), cash: GS.cash, heap: TLXPL.lot.heap(__lt(${B2})), mid: __mid(${B2}) })`), t = await toasts();
  console.log("  ", JSON.stringify({ a, t }));
  ok(a.st && a.st.s === 0 && a.st.miss === 1 && !a.st.hp && a.st.n === m.n && a.cash === c1, "12 h: no pay, a miss, no longer held");
  ok(a.heap < 0.3 && a.mid.y > 0.8, `the heap was shifted by hand (${a.heap.toFixed(2)} m3 left in the middle)`);
  ok(t.some(m2 => m2.includes("Nobody came to plow the sled park: it was dug out by hand. No pay. Once more and you lose it.")), "the line says so (" + JSON.stringify(t) + ")");
});

await section("H held and slept through", async () => {
  await ev(`TLX.state("plow").lot.sledpark.miss = 0; true`);
  const h = await J(`__held(${B2}, 6)`); await clearToasts();
  await ev(`GS.hour += 9; TLX.state("roads").h = GS.hour; TLXPL.lot.step(); true`); await sleep(300);
  const a = await J(`({ st: __st(${B2}), heap: TLXPL.lot.heap(__lt(${B2})) })`), t = await toasts();
  ok(h.hp === 1 && a.st.miss === 1 && a.st.s === 0 && !a.st.hp && a.heap < 0.3 && t.some(m => /While you were away the sled park was dug out by hand\. No pay\./.test(m)), "slept through a held lot: a miss, the heap shifted, one line (" + JSON.stringify(t) + ")");
});

await section("I DROP of a held lot, touch layout", async () => {
  await ev(`TLX.state("plow").lot.sledpark.miss = 0; true`);
  const h = await J(`__held(${B2}, 6)`);
  await ev(`SET.touch = "on"; setTouchUI(); true`); const txt = await appText();
  ok(h.hp === 1 && /DROP it with your heap in its middle and it is shifted by hand: that counts against you like a lot left 12 hours\./.test(txt), "the card warns before DROP");
  await clearToasts(); await ev(`$("tabS").querySelector("[data-act='paq:sledpark']").click(); true`); await sleep(400);
  const a = await J(`({ st: __st(${B2}), rec: TLXPL.fileOf("lot", "sledpark"), heap: TLXPL.lot.heap(__lt(${B2})), jobs: jobsList().filter(r => r.kind === "plowlot").length })`), t = await toasts();
  console.log("  ", JSON.stringify({ a, t }));
  ok(a.st === null && a.rec === 1 && a.heap < 0.3 && a.jobs === 0, "DROP pressed: the lot is given up, a miss on file, the heap shifted");
  ok(t.some(m => m.includes("You've given up the sled park.") && /Your heap still stood in its middle when you gave it up: dug out by hand/.test(m)), "the line says it counts (" + JSON.stringify(t) + ")");
  await ev(`TABLET.toggle(false); SET.touch = "off"; setTouchUI(); delete TLX.state("plow").lotRec.sledpark; true`);
});

await section("J new snow fills a held lot in again", async () => {
  const h = await J(`__held(${B2}, 6)`); await clearToasts();
  await ev(`__storm(1.5)`); await sleep(300);
  const a = await J(`({ st: __st(${B2}), mid: __mid(${B2}) })`), t = await toasts();
  console.log("  ", JSON.stringify({ a, t }));
  ok(h.hp === 1 && a.st && !a.st.hp && !a.st.mk && a.st.s > h.s + 0.1 && a.mid.y < 0.62, `1.5 h more storm: no longer held, the marks forgotten, snowed in again (level ${a.st.s.toFixed(2)})`);
  ok(t.some(m => /New snow has filled the sled park in again/.test(m)), "a line says so");
  const j = await jobs();
  ok(j.length === 1 && j[0].title === "Plow out the sled park", "the Jobs row is the plowing again");
});

await section("K the option off", async () => {
  await ev(`(() => { const st = TLX.state("plow").lot.sledpark; st.s = 0; st.h = 0; st.due = 0; delete st.mk; delete st.ms; TLXPL.lot.step(); return true; })()`);
  const h = await J(`__held(${B2}, 6)`), c1 = await cashNow();
  await ev(`TLX.setOn("plowheaps", false); TLXPL.lot.step(); true`);
  const a = await J(`({ st: __st(${B2}), cash: GS.cash })`), want = Math.round(SP.base * mul);
  ok(h.hp === 1 && a.st.s === 0 && !a.st.hp && a.cash - c1 === want, `switched off with a lot held: it is paid ($${a.cash - c1})`);
  const p = await J(`(() => { const p = __sq(${B2}); __storm(3); heapSnow(p[0], p[1], 1.5, 6, 0.8); const c = GS.cash; __allsq(${B2}); return { st: __st(${B2}), got: GS.cash - c }; })()`);
  p.txt = await appText();
  console.log("  ", JSON.stringify({ st: p.st, got: p.got, want, note: /a lot is not clear while more than/.test(p.txt) }));
  ok(p.st.s === 0 && !p.st.hp && p.got === want && !/a lot is not clear while more than/.test(p.txt), "off: a lot with a heap in its middle is paid at the cut, and the app's note does not mention heaps");
  await ev(`TABLET.toggle(false); TLX.setOn("plowheaps", true); true`);
});

await section("L the bank, M a little snow", async () => {
  await ev(`TLXPL.lot.shovel(__lt(${B2})); true`);
  const p = await J(`(() => { __storm(3); const q = __rim(${B2}), c0 = GS.cash; heapSnow(q[0], q[1], 1, 2.5, 0.8); const all0 = __all3(${B2}); __allsq(${B2}); return { st: __st(${B2}), got: GS.cash - c0, all: __all3(${B2}), heap: TLXPL.lot.heap(__lt(${B2})), d: Math.hypot(q[0] - __lt(${B2}).x, q[1] - __lt(${B2}).z) }; })()`), want = Math.round(SP.base * mul);
  console.log("  ", JSON.stringify(p));
  ok(p.st.s === 0 && !p.st.hp && p.got === want && p.all > 1 && p.heap < OKM3, `a heap on the bank (${p.d.toFixed(1)} m out, ${p.all.toFixed(1)} m3 standing) holds nothing up: paid $${p.got}`);
  const q = await J(`(() => { __storm(3); const p = __sq(${B2}), c0 = GS.cash; heapSnow(p[0], p[1], 0.6, 0.2, 0.8); __allsq(${B2}); return { st: __st(${B2}), got: GS.cash - c0 }; })()`);
  ok(q.st.s === 0 && !q.st.hp && q.got === want, `0.2 m3 in the middle is not a heap: paid $${q.got}`);
});

await section("N junk in the save", async () => {
  const r = await J(`(() => { const s = TLX.state("plow"); try { __storm(3);
    Object.assign(s.lot.sledpark, { hp: "yes", hv: NaN, hx: "q", hz: null }); TLXPL.tidy(); const a = JSON.parse(JSON.stringify(s.lot.sledpark));
    Object.assign(s.lot.sledpark, { mk: "0".repeat(__lt(${B2}).n), ms: s.lot.sledpark.s, hp: 7, hv: "x", hx: "q", hz: 4 }); TLXPL.tidy(); const b = JSON.parse(JSON.stringify(s.lot.sledpark));
    TLXPL.lot.step(); TLXPL.lot.line(); jobsList(); TABLET.toggle(true, "plow"); const txt = $("tabS").textContent.slice(0, 8000); TABLET.toggle(false);
    return { ok: true, a, b, txt, st: __st(${B2}) }; } catch (e) { return { ok: false, e: String(e && e.stack || e).slice(0, 300) }; } })()`);
  console.log("  ", JSON.stringify({ a: r.a, b: r.b, st: r.st, e: r.e }));
  ok(r.ok && r.a.hp === undefined && r.a.hv === undefined && r.a.hx === undefined, "a held flag with no cut squares behind it is dropped");
  ok(r.ok && r.b.hp === 1 && r.b.hv === 0 && r.b.hx === undefined && !/NaN|undefined/.test(r.txt), "junk numbers on a held lot: tidied, nothing thrown, the app renders (" + (r.e || "") + ")");
  ok(r.ok && r.st && (r.st.s === 0 || r.st.hp === 1), "and the next step either pays it (nothing stands there) or keeps it held");
});

console.log(fails ? `FAILED: ${fails}` : "all ok");
await done(fails ? 1 : 0);
