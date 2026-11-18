// 4.2b1 driveways: private customers in the Plow app (tlx-plow.js, the block comment at DRV).
//   A fresh game: a handful of drives, none taken, each on ground plowed as today; TAKE ON without a blade refused.
//   B with a blade: the app lists them, TAKE ON pressed on the touch layout.
//   C a storm: the drive snows in for real (the yard's plowing under it goes, the door's apron and an untaken drive
//     stay), a line, a Jobs row, a Map pin; the clock stands still in the storm and runs once it eases.
//   D half a pass is not a clearing (the hint counts); the rest back-dragged clears it: paid at once, in full.
//   E a late clearing pays between half and full.
//   F left 12 h: shovelled by hand, no pay, a miss; the second time the customer is gone a week, TAKE ON refused.
//   G slept through: one line for all, a miss each. A paid clearing takes a miss off.
//   H Monday's statement line. I reload keeps drive, snow and clock; junk in the save does not throw.
//   J DROP pressed on the touch layout: shovelled again.
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
  window.__dv = k => TLXPL.drv.list().find(c => c.key === k);
  window.__st = k => { const s = TLX.state("plow").drv[k]; return s ? JSON.parse(JSON.stringify(s)) : null; };
  // the truck placed so the blade's middle is t metres up the drive, facing up it
  window.__dput = (k, t) => { const c = __dv(k), d = TLXPL.bladeOf(TLXV.state().cur), yaw = Math.atan2(c.ux, c.uz), x = c.a[0] + c.ux * (t - d.z), z = c.a[1] + c.uz * (t - d.z);
    BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; crashCancel(); FOOT.on = false; P.x = x; P.z = z; P.yaw = yaw; P.vx = P.vy = P.vz = 0; P.y = surf(x, z); return true; };
  window.__foot = () => { const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw); for (let k = -5; k <= 3; k += 0.15) bladeSnow(P.x + fx * k + fz * 1.6, P.z + fz * k - fx * 1.6, P.x + fx * k - fz * 1.6, P.z + fz * k + fx * 1.6, 0.15); P.y = surf(P.x, P.z); return true; };
  // a puppet: the blade's middle carried from t0 to t1 along the drive at 2.5 m/s, nose always up the drive (t1 < t0 = backing out)
  window.__dpup = (k, t0, t1) => { const dir = t1 >= t0 ? 1 : -1; let t = t0; window.__pupOn = true; window.__air = 0; window.__seen = []; __dput(k, t0); __foot();
    const step = () => { t += dir * 0.07; if ((t - t1) * dir >= 0) { P.vx = P.vz = 0; window.__pupOn = false; return; } const c = __dv(k), d = TLXPL.bladeOf(TLXV.state().cur), yaw = Math.atan2(c.ux, c.uz);
      P.x = c.a[0] + c.ux * (t - d.z); P.z = c.a[1] + c.uz * (t - d.z); P.yaw = yaw; P.y = surf(P.x, P.z); P.vx = c.ux * 2.5 * dir; P.vz = c.uz * 2.5 * dir; if (P.gnd === false) window.__air++;
      const B = TLXPL.rt(TLXV.state().cur); if (B.drv) window.__seen.push(Math.round(B.drv.k * 100)); requestAnimationFrame(step); };
    requestAnimationFrame(step); return true; };
  // the drives' clock moved on h hours, 1.5 h at a time
  window.__hrs = h => { for (let t = 0; t < h - 1e-6; t += 1.5) { GS.hour += Math.min(1.5, h - t); TLX.state("roads").h = GS.hour; TLXPL.drv.step(); } return true; };
  window.__storm = h => { const w = WX.at; WX.at = () => 1; __hrs(h); WX.at = w; return true; };
  window.__mid = k => { const c = __dv(k); return { y: yardAt(c.mx, c.mz), r: restCell(Math.round((c.mx + HALF) / CELL), Math.round((c.mz + HALF) / CELL)), d: depthAt(Math.round((c.mx + HALF) / CELL), Math.round((c.mz + HALF) / CELL)), f: freshAt(Math.round((c.mx + HALF) / CELL), Math.round((c.mz + HALF) / CELL)) }; };
  return true; })()`;
const pup = async (k, t0, t1) => { await ev(`__dpup(${JSON.stringify(k)}, ${t0}, ${t1})`); for (let i = 0; i < 400 && (await ev("window.__pupOn")); i++) await sleep(100); await sleep(250); };
const blade = dn => ev(`TLXPL.rt(TLXV.state().cur).down = ${dn}; TLXPL.rt(TLXV.state().cur).k = ${dn ? 1 : 0}; TLXPL.rt(TLXV.state().cur).last = null; true`);
const cashNow = () => ev("GS.cash");
const jobs = () => J(`jobsList().filter(r => r.kind === "plowdrv").map(r => ({ title: r.title, x: r.tgt.x, z: r.tgt.z, meta: r.meta, pay: r.pay, auto: r.auto }))`);

await boot();
await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; true`);
let L = [], K = [], uid = null, mul = 1;

await section("A fresh game", async () => {
  L = await J(`TLXPL.drv.list().map(c => ({ key: c.key, name: c.name, L: +c.L.toFixed(2), a: c.a, b: c.b, base: TLXPL.drv.base(c), y: yardAt(c.mx, c.mz), dTown: Math.hypot(c.mx - depot.x, c.mz - depot.z),
    ob: obNear(c.mx, c.mz, 1.2), sea: isSea(c.mx, c.mz), car: (window.TLXC ? TLXC.cars : []).some(q => Math.hypot(q.x - c.mx, q.z - c.mz) < 3) }))`);
  for (const c of L) console.log("  ", JSON.stringify(c));
  const a = await J(`({ drv: TLX.state("plow").drv, off: TLX.state("plow").drvOff, hidden: TABLET.byId.plow.hidden(), jobs: jobsList().filter(r => r.kind === "plowdrv").length, drifts: DRIFTS.filter(Y => Y.x !== Y.x2 || Y.z !== Y.z2).length /* the lots (4.2c1) are discs */, live: DRIFTS.filter(Y => Y.k > 0).length })`);
  ok(L.length >= 3 && L.length <= 8, `a handful of drives in Kjøllefjord: ${L.length}`);
  ok(new Set(L.map(c => c.name)).size === L.length, "each customer has a name of their own (" + L.map(c => c.name).join(", ") + ")");
  ok(L.every(c => c.L >= 6 && c.L <= 10.01 && c.base >= 30 && c.base <= 42), "each drive is 6-10 m long and worth $30-42 a clearing");
  ok(L.every(c => !c.ob && !c.sea && !c.car && c.dTown < 130), "none runs through a shed, a lamp, a parked car or the sea");
  ok(L.every(c => c.y > 0.8), "untaken, every drive lies on ground plowed as today (yard " + L.map(c => c.y.toFixed(2)).join(" ") + ")");
  ok(Object.keys(a.drv).length === 0 && a.hidden === true && a.jobs === 0 && a.live === 0 && a.drifts === L.length, "fresh game: no customer, no Plow app, no Jobs row, no drift on the ground");
  K = L.map(c => c.key);
  await clearToasts();
  const r = await ev(`TLXPL.drv.take(${JSON.stringify(K[0])})`), t = await toasts();
  ok(r === false && t.some(m => /Fit a blade to a truck first/.test(m)) && !(await J(`__st(${JSON.stringify(K[0])})`)), "TAKE ON without a blade: refused, and it says to fit one");
});
if (L.length < 3) await done(1);
const k0 = JSON.stringify(K[0]), k1 = JSON.stringify(K[1]), k2 = JSON.stringify(K[2]);
const nm = i => L[i].name;

await section("B the app, TAKE ON on the touch layout", async () => {
  await ev(`GS.cash = 40000; TLXV.buy("pickup"); true`); await sleep(500);
  uid = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`);
  await ev(`TLX.state("plow").blades[${JSON.stringify(uid)}] = { id: "b23", cond: 100, throw: "r" }; TLXPL.tidy(); TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(600);
  mul = await ev("payMul()");
  await ev(`SET.touch = "on"; setTouchUI(); TABLET.toggle(true, "plow"); true`); await sleep(500);
  const a = await J(`({ txt: $("tabS").textContent, n: $("tabS").querySelectorAll("[data-act^='pdt:']").length, blocked: $("tabS").querySelectorAll("[data-act^='pdt:'].blocked").length })`);
  ok(a.n === L.length && a.blocked === 0 && /Driveways/.test(a.txt) && a.txt.includes(nm(0) + "'s drive") && /ASKING/.test(a.txt) && !/NaN|undefined/.test(a.txt), `with a blade the Plow app lists the ${L.length} drives, each ASKING with a TAKE ON button`);
  await still("d1_app_asking");
  await clearToasts();
  await ev(`$("tabS").querySelector("[data-act='pdt:" + ${k0} + "']").click(); true`); await sleep(400);
  const b = await J(`({ st: __st(${k0}), txt: $("tabS").textContent, mid: __mid(${k0}) })`), t = await toasts();
  ok(b.st && b.st.s === 0 && /YOURS/.test(b.txt) && t.some(m => m.includes(nm(0) + "'s drive is yours to keep clear") && m.includes("$" + Math.round(L[0].base * mul))), "TAKE ON pressed: the drive is yours, the line names the pay (" + JSON.stringify(t) + ")");
  ok(b.mid.y > 0.8, "taken on with no snow in it: still plowed");
  await ev(`TABLET.toggle(false); SET.touch = "off"; setTouchUI(); true`);
});

let before = null;
await section("C a storm snows it in", async () => {
  before = await J(`({ mid: __mid(${k0}), other: __mid(${k1}), apron: (() => { const c = __dv(${k0}), D = c.door; return yardAt(D.x + D.nx * (D.d / 2 + 5), D.z + D.nz * (D.d / 2 + 5)); })() })`);
  await clearToasts();
  await ev(`__storm(3)`); await sleep(500);
  const a = await J(`({ st: __st(${k0}), mid: __mid(${k0}), other: __mid(${k1}), apron: (() => { const c = __dv(${k0}), D = c.door; return yardAt(D.x + D.nx * (D.d / 2 + 5), D.z + D.nz * (D.d / 2 + 5)); })(),
    pins: TABLET.layerPts("marks").filter(p => /DRIVE/.test(p.name || "")).length })`), t = await toasts(), j = await jobs();
  console.log("  ", JSON.stringify({ before, a, j }));
  ok(a.st.s > 0.4 && a.st.s < 0.55 && a.st.due === 1, `3 h of storm: its snow level is ${a.st.s.toFixed(2)} (the roads' own rate)`);
  ok(a.mid.y < before.mid.y * 0.62 && a.mid.r > before.mid.r * 1.8, `the snow really lies in it: plowing ${before.mid.y.toFixed(2)} -> ${a.mid.y.toFixed(2)}, the depth it settles at ${(before.mid.r * 100).toFixed(0)} -> ${(a.mid.r * 100).toFixed(0)} cm`);
  ok(Math.abs(a.apron - before.apron) < 0.01 && a.apron > 0.8, "the walk to that house's door is as plowed as before (" + a.apron.toFixed(2) + ")");
  ok(Math.abs(a.other.y - before.other.y) < 0.01, "a drive nobody has taken on is untouched by the storm");
  ok(t.some(m => /Snow in one of your drives\. Full pay inside 4 h/.test(m)), "a line says so (" + JSON.stringify(t) + ")");
  ok(j.length === 1 && j[0].title === `Plow out ${nm(0)}'s drive` && Math.hypot(j[0].x - L[0].a[0], j[0].z - L[0].a[1]) < 0.5 && j[0].auto === true && /full pay for another 4 h/.test(j[0].meta), "Jobs: one row, its target the mouth of the drive (" + JSON.stringify(j) + ")");
  ok(a.pins === 1, "the Map has a pin on it");
  ok(a.st.h < 0.05, "the clock stood still in the storm (" + a.st.h.toFixed(3) + " h)");
  await ev(`__hrs(2)`);
  const b = await J(`__st(${k0})`);
  ok(Math.abs(b.h - 2) < 0.01 && Math.abs(b.s - a.st.s) < 1e-6, "weather eased: 2 h on the clock, no more snow");
  if (!NOSTILLS) { await ev(`TABLET.toggle(true, "plow"); true`); await sleep(500); await still("d2_app_snowed_in"); await ev(`TABLET.toggle(true, "jobs"); true`); await sleep(500); await still("d3_jobs_row"); await ev(`TABLET.toggle(false); true`); await sleep(300); }
});

await section("D half a pass, then the rest back-dragged", async () => {
  const c0 = await cashNow(), Ln = L[0].L;
  await ev(`__dput(${k0}, -0.4)`); await sleep(1200);                       // let the snow field load round the truck
  const dep = await J(`__mid(${k0})`);
  if (!NOSTILLS) { await sideCam(); await ev(`(() => { const c = __dv(${k0}); window.camOv = cam => { cam.position.set(c.a[0] - c.ux * 9 + c.uz * 5, surf(c.a[0], c.a[1]) + 5, c.a[1] - c.uz * 9 - c.ux * 5); cam.lookAt(c.mx, surf(c.mx, c.mz) + 0.4, c.mz); }; return true; })()`); await sleep(400); await still("d4_drive_snowed_in"); }
  await clearToasts(); await blade(true);
  await pup(K[0], -0.4, Ln * 0.5);
  const h = await J(`({ st: __st(${k0}), seen: window.__seen.slice(-1)[0] || 0, air: window.__air, hint: TLXPL.hint(), cash: GS.cash })`);
  console.log("  ", JSON.stringify(h));
  ok(h.st.s > 0.4 && h.cash === c0 && h.seen >= 40 && h.seen <= 62, `half the drive cut: not cleared, not paid (${h.seen}% of its lengths)`);
  ok(new RegExp(nm(0) + "'s drive: \\d+% plowed out").test(h.hint), "the hint counts it: " + h.hint);
  await still("d5_half_cut");
  // drive on to the far end with the blade up, drop it, and back out dragging
  await blade(false); await ev(`__dput(${k0}, ${Ln + 0.3}); __foot()`); await sleep(300); await blade(true);
  await pup(K[0], Ln + 0.3, Ln * 0.3);
  await blade(false); await sleep(500);
  const a = await J(`({ st: __st(${k0}), mid: __mid(${k0}), cash: GS.cash, s: { n: TLX.state("plow").drvN, paid: TLX.state("plow").drvPaid } })`), t = await toasts(), j = await jobs();
  console.log("  ", JSON.stringify({ a, t }));
  const want = Math.round(L[0].base * mul);
  ok(a.st.s === 0 && a.st.due === 0 && a.st.h === 0 && a.st.n === 1, "back-dragged out over the rest: the drive is clear");
  ok(a.cash - c0 === want && a.st.wk === want && a.s.n === 1 && a.s.paid === want, `paid at once and in full at 2 h: +$${a.cash - c0} (want $${want})`);
  ok(t.some(m => m.includes(`${nm(0)}'s drive is clear. ${nm(0)} pays $${want}.`)), "the line names the customer and the pay");
  ok(a.mid.y > 0.8 && a.mid.d < dep.r * 0.6 && j.length === 0, `it is plowed ground again (depth ${(dep.r * 100).toFixed(0)} -> ${(a.mid.d * 100).toFixed(0)} cm), the Jobs row is gone`);
  await still("d6_cleared"); await ev(`window.camOv = null; true`);
});

await section("E a late clearing pays less", async () => {
  await ev(`__storm(3); __hrs(8)`);
  const c0 = await cashNow(), k = await ev(`TLXPL.drv.k(8)`), j = await jobs();
  ok(Math.abs(k - 0.75) < 1e-9 && j.length === 1 && /the pay is falling/.test(j[0].meta), "8 h on the clock: the row says the pay is falling (x" + k + ")");
  await clearToasts(); await ev(`__dput(${k0}, -0.4)`); await sleep(600); await blade(true);
  await pup(K[0], -0.4, L[0].L * 0.9); await blade(false);
  const a = await J(`({ st: __st(${k0}), cash: GS.cash })`), t = await toasts(), want = Math.round(L[0].base * 0.75 * mul);
  ok(Math.abs(a.cash - c0 - want) <= 1 && a.cash - c0 < Math.round(L[0].base * mul) && a.st.s === 0 && a.st.n === 2, `one pass up nine tenths of it at 8 h: +$${a.cash - c0} (want about $${want}, 75%)`);
  ok(t.some(m => /\(7[345]%: 8 h after the weather eased\)/.test(m)), "the line says why (" + JSON.stringify(t.filter(m => /drive is clear/.test(m))) + ")");
});

await section("F left 12 h: shovelled by hand, then the customer is gone", async () => {
  await ev(`TLXPL.drv.take(${k1})`);
  await ev(`__storm(3); __hrs(6)`);
  const c0 = await cashNow(); await clearToasts();
  // the first customer is cleared in time (by its marks), the second is left
  await ev(`(() => { const c = __dv(${k0}); for (let t = 0; t < c.L; t += 0.5) TLXPL.drv.mark(c.a[0] + c.ux * t, c.a[1] + c.uz * t, true); return true; })()`);
  await ev(`__hrs(6.5)`); await sleep(300);
  const a = await J(`({ a: __st(${k0}), b: __st(${k1}), mid: __mid(${k1}), cash: GS.cash })`), t = await toasts();
  console.log("  ", JSON.stringify({ a, t }));
  ok(a.b && a.b.s === 0 && a.b.miss === 1 && a.b.n === 0 && a.mid.y > 0.8, `${nm(1)}'s drive, left 12 h: shovelled by hand, a miss, plowed ground again`);
  ok(t.some(m => m.includes(`${nm(1)} gave up waiting and shovelled the drive by hand. No pay. Once more and you lose the customer.`)), "the line says so");
  ok(Math.abs(a.cash - c0 - Math.round(L[0].base * 0.875 * mul)) <= 1 && a.a.miss === 0, "the one cleared in time was paid and has no miss");
  await ev(`__storm(3); __hrs(12.5)`); await sleep(300); await clearToasts();
  await ev(`__hrs(0.1)`);
  const b = await J(`({ a: __st(${k0}), b: __st(${k1}), off: TLX.state("plow").drvOff, hour: GS.hour, mid: __mid(${k1}) })`), t2 = await toasts();
  ok(b.b === null && b.off[K[1]] > b.hour + 160 && b.mid.y > 0.8, `the second time ${nm(1)} is gone for a week`);
  ok(b.a && b.a.miss === 1, `${nm(0)} (first miss) is still a customer`);
  await clearToasts();
  const r = await ev(`TLXPL.drv.take(${k1})`), t3 = await toasts();
  ok(r === false && t3.some(m => m.includes(`${nm(1)} has someone else for the drive. Ask again in 7 days.`)), "TAKE ON refused, with the days (" + JSON.stringify(t3) + ")");
  await ev(`TABLET.toggle(true, "plow"); true`); await sleep(400);
  const txt = await ev(`$("tabS").textContent`);
  ok(/HAS SOMEONE ELSE/.test(txt) && /SHOVELLED BY HAND ONCE/.test(txt) && !/NaN|undefined/.test(txt), "the app shows both: HAS SOMEONE ELSE, and SHOVELLED BY HAND ONCE on the other");
  await still("d7_app_lost"); await ev(`TABLET.toggle(false); true`);
});

await section("G slept through; a paid clearing takes a miss off", async () => {
  await ev(`TLXPL.drv.take(${k2})`);
  await ev(`__storm(3)`); await clearToasts();
  await ev(`TLX.state("plow").drv[${k0}].miss = 0; GS.hour += 9; TLX.state("roads").h = GS.hour; TLXPL.drv.step(); true`); await sleep(300);
  const a = await J(`({ a: __st(${k0}), c: __st(${k2}) })`), t = await toasts();
  ok(a.a.miss === 1 && a.c.miss === 1 && a.a.s === 0 && a.c.s === 0 && t.filter(m => /While you were away/.test(m)).length === 1 && t.some(m => /dug their drives out by hand\. No pay\./.test(m) && m.includes(nm(0)) && m.includes(nm(2))), "a 9 h sleep over two snowed-in drives: one line naming both, a miss each (" + JSON.stringify(t) + ")");
  await ev(`__storm(3); (() => { const c = __dv(${k2}); for (let t = 0; t < c.L; t += 0.5) TLXPL.drv.mark(c.a[0] + c.ux * t, c.a[1] + c.uz * t, true); return true; })()`);
  const b = await J(`__st(${k2})`);
  ok(b.miss === 0 && b.n === 1, "a paid clearing takes the miss off");
});

await section("H Monday", async () => {
  const p = await J(`(() => { const s = TLX.state("plow"); let pay = 0, n = 0; for (const k in s.drv) { pay += s.drv[k].wk; n += s.drv[k].n; } TLXPL.drv.monday({ label: "Mon 1 Jan" }); return { pay, n, last: s.conLast[0], wk: Object.values(s.drv).map(q => q.wk + q.n) }; })()`);
  ok(p.n >= 2 && p.last.road === "Driveways" && p.last.n === p.n && p.last.pay === p.pay && p.wk.every(v => v === 0), `Monday: one statement line for the drives (${p.n} cleared, $${p.pay}), the week starts again`);
  await ev(`TABLET.toggle(true, "plow"); true`); await sleep(400);
  const txt = await ev(`$("tabS").textContent`);
  ok(txt.includes(`Driveways · ${p.n} cleared · +$${p.pay}`), "the app's Statements show it");
  await ev(`TABLET.toggle(false); true`);
});

await section("I reload, junk", async () => {
  await ev(`__hrs(1.5)`);
  const b0 = await J(`({ a: __st(${k0}), off: TLX.state("plow").drvOff[${k1}] })`);
  ok(b0.a.s > 0.4 && Math.abs(b0.a.h - 1.5) < 0.01, "before the reload: snowed in, 1.5 h on the clock");
  await reload(); await ev(SETUP); await sleep(500); await ev(KIT);
  const a = await J(`({ a: __st(${k0}), off: TLX.state("plow").drvOff[${k1}], mid: __mid(${k0}), n: TLXPL.drv.list().length, keys: TLXPL.drv.list().map(c => c.key), jobs: jobsList().filter(r => r.kind === "plowdrv").length })`);
  console.log("  ", JSON.stringify(a));
  ok(a.n === L.length && a.keys.join() === K.join(), "the same drives after a reload");
  ok(a.a && Math.abs(a.a.s - b0.a.s) < 0.03 && Math.abs(a.a.h - b0.a.h) < 0.1 && a.off === b0.off && a.jobs === 1, "the customer, the snow, the clock and the lost customer's week are kept");
  ok(a.mid.y < 0.62, "and the snow lies in the drive again from the first frame (plowing " + a.mid.y.toFixed(2) + ")");
  const r = await J(`(() => { const s = TLX.state("plow"); try { s.drv = { zz: 5, "1_1": { s: 3 }, [${k0}]: { s: "x", h: NaN, miss: 99, wk: -4, n: null } }; s.drvOff = { a: "b" }; s.drvPaid = NaN; s.drvH = "q";
    TLXPL.tidy(); TLXPL.drv.step(); TABLET.toggle(true, "plow"); jobsList(); const q = s.drv[${k0}]; return { ok: true, q, txt: $("tabS").textContent.slice(0, 4000), off: s.drvOff, paid: s.drvPaid }; } catch (e) { return { ok: false, e: String(e) }; } })()`);
  ok(r.ok && r.q && r.q.s === 0 && r.q.h === 0 && r.q.miss === 1 && r.q.wk === 0 && r.q.n === 0 && r.paid === 0 && !/NaN|undefined/.test(r.txt), "junk in the saved drives: tidied, nothing thrown, the app renders (" + (r.e || "") + ")");
  await ev(`TABLET.toggle(false); delete TLX.state("plow").drv.zz; delete TLX.state("plow").drv["1_1"]; true`);
});

await section("J DROP on the touch layout", async () => {
  await ev(`__storm(3); SET.touch = "on"; setTouchUI(); TABLET.toggle(true, "plow"); true`); await sleep(500);
  const m0 = await J(`__mid(${k0})`); await clearToasts();
  await ev(`$("tabS").querySelector("[data-act='pdq:" + ${k0} + "']").click(); true`); await sleep(400);
  const a = await J(`({ st: __st(${k0}), mid: __mid(${k0}), txt: $("tabS").textContent, jobs: jobsList().filter(r => r.kind === "plowdrv").length })`), t = await toasts();
  ok(m0.y < 0.62 && a.st === null && a.mid.y > 0.8 && a.jobs === 0 && t.some(m => m.includes(`You've given up ${nm(0)}'s drive. ${nm(0)} is back to shovelling it.`)), "DROP pressed on a snowed-in drive: it is shovelled again, no row, no penalty (" + JSON.stringify(t) + ")");
  await ev(`TABLET.toggle(false); SET.touch = "off"; setTouchUI(); true`);
});

console.log(fails ? `FAILED: ${fails}` : "all ok");
await done(fails ? 1 : 0);
