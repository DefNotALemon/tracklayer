// 4.2b2 doors: the snow a plow blade leaves across a front walk or a drive's mouth (tlx-plow.js, the block comment at WIN).
//   A fresh game: a front walk per household and a mouth per drive, nothing counted, nothing saved.
//   B a pile pushed down the street past a door: the windrow lands across the walk; close by only the hint says so;
//     driven on, it is a complaint: a line, a Jobs row, a Map pin, the Plow app.
//   C nosed in from the street and cut away: clear again, forgotten, no complaint on the count.
//   D left: the clock stands in a storm; at 3 h the household digs it out: a complaint, the walk is clear.
//   E a customer's walk left is a miss; an asking household stops asking for 3 days; 3 complaints and nobody new
//     takes you on before Monday; the second miss loses the customer.
//   F the mouth of your own snowed-in drive is your work site; the heap outlives the drive going back to plowed
//     ground (plowRefresh's keep) and counts once the drive is clear.
//   G reload keeps the complaint, its clock and puts the heap back; junk in the save does not throw; a sleep.
//   H option plowdoors off: nothing counted, nothing held against you.
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
  window.__z = k => TLXPL.win.list().find(q => q.key === k);
  window.__e = k => { const e = TLX.state("plow").win[k]; return e ? JSON.parse(JSON.stringify(e)) : null; };
  window.__st = k => { const s = TLX.state("plow").drv[k]; return s ? JSON.parse(JSON.stringify(s)) : null; };
  window.__zs = k => { const q = __z(k); return { over: +TLXPL.win.measure(q).toFixed(3), pend: +q.pend.toFixed(3), e: __e(k) }; };
  // the street in front of a walk: f along it with the house on the truck's right, O a metre toward the house from its centre line
  window.__lane = k => { const D = __z(k).door, f = [-D.nz, D.nx]; return { f, O: [D.grid[0] - D.nx, D.grid[1] - D.nz], n: [D.nx, D.nz], D }; };
  window.__pose = (x, z, yaw) => { BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; crashCancel(); FOOT.on = false; P.x = x; P.z = z; P.yaw = yaw; P.vx = P.vy = P.vz = 0; P.y = surf(x, z); return true; };
  window.__foot = () => { const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw); for (let k = -5; k <= 3; k += 0.15) bladeSnow(P.x + fx * k + fz * 1.6, P.z + fz * k - fx * 1.6, P.x + fx * k - fz * 1.6, P.z + fz * k + fx * 1.6, 0.15); P.y = surf(P.x, P.z); return true; };
  // where the truck stands with the blade's middle t along a path: "s" = along the street past the door, "w" = nose in up the walk (t = metres from the house's middle, shrinking)
  window.__at = (mode, k, t) => { const L = __lane(k), d = TLXPL.bladeOf(TLXV.state().cur);
    if (mode === "s") return { x: L.O[0] + L.f[0] * (t - d.z), z: L.O[1] + L.f[1] * (t - d.z), yaw: Math.atan2(L.f[0], L.f[1]), ux: L.f[0], uz: L.f[1] };
    return { x: L.D.x + L.n[0] * (t + d.z), z: L.D.z + L.n[1] * (t + d.z), yaw: Math.atan2(-L.n[0], -L.n[1]), ux: L.n[0], uz: L.n[1] }; };
  window.__put = (mode, k, t) => { const p = __at(mode, k, t); return __pose(p.x, p.z, p.yaw); };
  window.__pup = (mode, k, t0, t1) => { const dir = t1 >= t0 ? 1 : -1; let t = t0; window.__pupOn = true; window.__air = 0; __put(mode, k, t0); __foot();
    const step = () => { t += dir * 0.07; if ((t - t1) * dir >= 0) { P.vx = P.vz = 0; window.__pupOn = false; return; } const p = __at(mode, k, t);
      P.x = p.x; P.z = p.z; P.yaw = p.yaw; P.y = surf(p.x, p.z); P.vx = p.ux * 2.5 * dir; P.vz = p.uz * 2.5 * dir; if (P.gnd === false) window.__air++; requestAnimationFrame(step); };
    requestAnimationFrame(step); return true; };
  window.__away = () => { __pose(depot.x, depot.z, 0); TLXPL.rt(TLXV.state().cur).last = null; TLXPL.win.step(); return true; };
  // as a blade would: v m3 heaped in the middle of a zone, and the blade's own note of it
  window.__heap = (k, v) => { const q = __z(k), p = heapSnow(q.cx, q.cz, 0.9, v, 0.8); TLXPL.win.lay(q.cx, q.cz, 0.9, p); return p; };
  window.__hrs = h => { for (let t = 0; t < h - 1e-6; t += 1.5) { GS.hour += Math.min(1.5, h - t); TLX.state("roads").h = GS.hour; TLXPL.drv.step(); TLXPL.win.step(); } return true; };
  window.__storm = h => { const w = WX.at; WX.at = () => 1; __hrs(h); WX.at = w; return true; };
  return true; })()`;
const pup = async (mode, k, t0, t1) => { await ev(`__pup(${JSON.stringify(mode)}, ${JSON.stringify(k)}, ${t0}, ${t1})`); for (let i = 0; i < 400 && (await ev("window.__pupOn")); i++) await sleep(100); await sleep(250); };
const blade = dn => ev(`TLXPL.rt(TLXV.state().cur).down = ${dn}; TLXPL.rt(TLXV.state().cur).k = ${dn ? 1 : 0}; TLXPL.rt(TLXV.state().cur).last = null; true`);
const jobs = () => J(`jobsList().filter(r => r.kind === "plowwin").map(r => ({ title: r.title, x: r.tgt.x, z: r.tgt.z, meta: r.meta, pay: r.pay, auto: r.auto }))`);
const S = e => JSON.stringify(e);

await boot();
await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; true`);
let Z = [], DR = [], W0 = null, uid = null;
const BLOCK = await ev("TLXPL.WIN.block"), CLEAR = await ev("TLXPL.WIN.clear");

await section("A fresh game", async () => {
  Z = await J(`TLXPL.win.list().map(q => ({ key: q.key, hk: q.hk, kind: q.kind, name: q.name, L: +q.L.toFixed(2), cx: q.cx, cz: q.cz, drive: !!q.c, grid: !!(q.door && q.door.grid), y: yardAt(q.cx, q.cz), over: TLXPL.win.measure(q), town: Math.hypot(q.cx - depot.x, q.cz - depot.z) < TOWN_R, ob: !!obNear(q.cx, q.cz, 0.6), sea: isSea(q.cx, q.cz) }))`);
  DR = await J(`TLXPL.drv.list().map(c => ({ key: c.key, name: c.name }))`);
  const walks = Z.filter(q => q.kind === "w"), mouths = Z.filter(q => q.kind === "m");
  const a = await J(`({ win: TLX.state("plow").win, c: TLX.state("plow").winC, n: TLX.state("plow").winN, on: TLX.on("plowdoors"), jobs: jobsList().filter(r => r.kind === "plowwin").length, pins: TABLET.layerPts("marks").filter(p => /YOUR SNOW/.test(p.name || "")).length, talk: TLXPL.win.talk() })`);
  console.log("  ", walks.length, "walks,", mouths.length, "mouths,", walks.filter(q => q.town).length, "walks in town; walk length", Math.min(...walks.map(q => q.L)), "to", Math.max(...walks.map(q => q.L)));
  ok(walks.length >= 30 && mouths.length === DR.length && DR.length >= 3, `a front walk for every household (${walks.length}) and a mouth for every drive (${mouths.length})`);
  ok(new Set(Z.map(q => q.key)).size === Z.length && walks.every(q => q.L >= 2 && q.L <= 6.01), "each zone has a key of its own, a walk is 2-6 m long");
  ok(walks.filter(q => q.grid).every(q => q.y > 0.8 && !q.sea), "every Kjøllefjord walk lies on plowed ground");
  ok(DR.every(c => Z.some(q => q.key === c.key + ":w" && q.name === c.name)), "a household with a drive has one name for its walk and its drive");
  ok(Z.every(q => q.over < 0.02), "nothing stands in any of them (most: " + Math.max(...Z.map(q => q.over)).toFixed(3) + " m3)");
  ok(Object.keys(a.win).length === 0 && a.c === 0 && a.n === 0 && a.on === true && a.jobs === 0 && a.pins === 0 && a.talk === false, "fresh game: nothing blocked, no complaint, no Jobs row, no pin; option plowdoors is on");
  // a walk on the grid with no drive, its street clear of cars, lamps and sheds for the truck's run past it
  W0 = await ev(`(() => { const cars = window.TLXC ? TLXC.cars : []; for (const q of TLXPL.win.list()) { if (q.kind !== "w" || q.c || !q.door.grid) continue; const L = __lane(q.key); let free = true;
    for (let s = -14; s <= 12 && free; s += 1) { const x = L.O[0] + L.f[0] * s, z = L.O[1] + L.f[1] * s; if (isSea(x, z) || obNear(x, z, 1.5) || cars.some(c => Math.hypot(c.x - x, c.z - z) < 4)) free = false; }
    if (free && !obNear(q.cx, q.cz, 1.2) && !TLXPL.win.list().some(o => o !== q && Math.hypot(o.cx - q.cx, o.cz - q.cz) < 9)) return q.key; } return null; })()`);
  ok(!!W0, "a walk to test on: " + W0);
});
if (!W0 || DR.length < 4) await done(1);
const w0 = S(W0), n0 = Z.find(q => q.key === W0).name;
const K = DR.map(c => c.key), nm = i => DR[i].name;

await section("B a pile pushed down the street past a door", async () => {
  await ev(`GS.cash = 40000; TLXV.buy("pickup"); true`); await sleep(500);
  uid = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`);
  await ev(`TLX.state("plow").blades[${S(uid)}] = { id: "b23", cond: 100, throw: "r" }; TLXPL.tidy(); TLXV.swapTo(${S(uid)}); FOOT.on = false; true`); await sleep(600);
  await ev(`__put("s", ${w0}, -9)`); await sleep(1200);
  // the pile somebody dragged out into the street, right in front of the door
  const pile = await ev(`(() => { const L = __lane(${w0}); let v = 0; for (const s of [-1.3, 0, 1.3]) v += heapSnow(L.O[0] + L.f[0] * s, L.O[1] + L.f[1] * s, 1.1, 0.7, 0.8); return v; })()`);
  const z0 = await J(`__zs(${w0})`);
  ok(pile > 1.8 && z0.over < 0.05 && z0.pend === 0, `a ${pile.toFixed(1)} m3 pile lies in the street; the walk beside it is clear and nothing is counted (${z0.over} m3)`);
  if (!NOSTILLS) { await sideCam(); await ev(`(() => { const q = __z(${w0}), L = __lane(${w0}); window.camOv = cam => { cam.position.set(L.O[0] + L.n[0] * 9 - L.f[0] * 7, surf(q.cx, q.cz) + 6, L.O[1] + L.n[1] * 9 - L.f[1] * 7); cam.lookAt(q.cx, surf(q.cx, q.cz) + 0.3, q.cz); }; return true; })()`); await sleep(400); await still("w1_pile_in_street"); }
  await clearToasts(); await blade(true);
  await pup("s", W0, -9, 6.5);
  await sleep(700);
  const a = await J(`({ z: __zs(${w0}), hint: TLXPL.hint(), air: window.__air, dist: Math.hypot(P.x - __z(${w0}).cx, P.z - __z(${w0}).cz), jobs: jobsList().filter(r => r.kind === "plowwin").length })`), t = await toasts();
  console.log("  ", S(a));
  ok(a.z.pend > 0.2 && a.z.over >= BLOCK, `pushed past the door, throwing right: ${a.z.over.toFixed(2)} m3 of it lies across the walk (blocked from ${BLOCK})`);
  ok(a.dist < 9 && a.z.e === null && a.jobs === 0 && !t.some(m => /Your plow's snow/.test(m)), `still ${a.dist.toFixed(1)} m from it: no complaint yet`);
  ok(a.hint.startsWith(`your snow lies across ${n0}'s front walk: cut it clear before you drive on`), "the riding hint says so, first: " + a.hint.slice(0, 110));
  await still("w2_windrow_across_walk");
  await blade(false); await ev(`__away()`); await sleep(900);
  const b = await J(`({ z: __zs(${w0}), pins: TABLET.layerPts("marks").filter(p => /YOUR SNOW/.test(p.name || "")), badge: TABLET.byId.plow.badge() })`), t2 = await toasts(), j = await jobs();
  console.log("  ", S({ b, t2, j }));
  ok(b.z.e && b.z.e.v >= BLOCK && b.z.e.h < 0.05, "driven on: it is a complaint with a clock");
  ok(t2.some(m => m.includes(`Your plow's snow lies across ${n0}'s front walk.`) && /inside 3 h, or .+ digs it out by hand and remembers it/.test(m)), "a line names the walk and the 3 h");
  ok(j.length === 1 && j[0].title === `Clear your snow from ${n0}'s front walk` && /3 h before it is dug out by hand/.test(j[0].meta) && j[0].pay === "no pay" && j[0].auto === true && Math.hypot(j[0].x - Z.find(q => q.key === W0).cx, j[0].z - Z.find(q => q.key === W0).cz) < 0.1, "Jobs: one row, its target the walk (" + S(j) + ")");
  ok(b.pins.length === 1 && b.badge === "!", "a pin on the Map, a badge on the Plow app");
  await ev(`TABLET.toggle(true, "plow"); true`); await sleep(500);
  const txt = await ev(`$("tabS").textContent`);
  ok(/Doors/.test(txt) && txt.includes(`${n0}'s front walk`) && /BLOCKED/.test(txt) && /0 complaints this week/.test(txt) && /Cut it away with the blade and it is forgotten/.test(txt) && !/NaN|undefined/.test(txt), "the Plow app lists it under Doors");
  await still("w3_app_doors"); await ev(`TABLET.toggle(false); true`);
});

await section("C nosed in from the street and cut away", async () => {
  const g = await ev(`(() => { const D = __z(${w0}).door; return (D.grid[0] - D.x) * D.nx + (D.grid[1] - D.z) * D.nz; })()`), d2 = await ev(`__z(${w0}).door.d / 2`);
  await ev(`__put("w", ${w0}, ${g})`); await sleep(900);
  const h0 = await ev(`TLXPL.hint()`);
  ok(h0.includes(`${n0}'s front walk: your snow is still across it`), "back at it, the hint names it: " + h0.slice(0, 90));
  await clearToasts(); await blade(true);
  await pup("w", W0, g, d2 + 0.9);
  await blade(false); await sleep(900);
  const a = await J(`({ z: __zs(${w0}), c: TLX.state("plow").winC, air: window.__air })`), t = await toasts(), j = await jobs();
  console.log("  ", S({ a, t }));
  ok(a.z.over < CLEAR && a.z.e === null, `cut away to the side: ${a.z.over.toFixed(2)} m3 left on the walk, the complaint is gone`);
  ok(t.some(m => m === `${n0}'s front walk is clear again.`) && j.length === 0 && a.c === 0, "a line says so, the Jobs row is gone, nothing on the week's count");
  await still("w4_cut_clear"); await ev(`window.camOv = null; true`);
  await ev(`__away()`); await sleep(600);
  ok((await J(`__zs(${w0})`)).e === null && !(await toasts()).some(m => /Your plow's snow/.test(m)), "driven on: nothing more is said");
});

await section("D left: the household digs it out", async () => {
  await clearToasts();
  const p = await ev(`__heap(${w0}, 0.9)`); await ev(`__away()`); await sleep(300);
  const a = await J(`__zs(${w0})`);
  ok(p > 0.85 && a.e && a.e.v >= BLOCK, `${p.toFixed(2)} m3 left on the walk and driven away from: a complaint (${a.e && a.e.v} m3)`);
  await ev(`__storm(2)`);
  const b = await J(`__zs(${w0})`);
  ok(b.e && b.e.h < 0.05, "2 h of storm: the clock stands (" + (b.e ? b.e.h.toFixed(2) : "?") + " h)");
  await ev(`__hrs(1.5)`);
  const c = await J(`__zs(${w0})`);
  ok(c.e && Math.abs(c.e.h - 1.5) < 0.01, "1.5 h of calm: 1.5 h on it");
  await clearToasts(); await ev(`__hrs(1.6)`); await sleep(300);
  const d = await J(`({ z: __zs(${w0}), c: TLX.state("plow").winC, n: TLX.state("plow").winN, off: Object.keys(TLX.state("plow").drvOff).length })`), t = await toasts(), j = await jobs();
  console.log("  ", S({ d, t }));
  ok(d.z.e === null && d.z.over < CLEAR && d.c === 1 && d.n === 1 && j.length === 0, `at 3 h it is dug out by hand: the walk is clear (${d.z.over.toFixed(2)} m3), one complaint on the week`);
  ok(t.some(m => m === `${n0} dug your plow's snow out of the way by hand. One complaint against you this week.`), "the line says who and counts it (" + S(t) + ")");
  ok(d.off === 0, "a household with no drive holds nothing else against you");
});

await section("E customers, neighbours, the street talking", async () => {
  const k0 = S(K[0]), k1 = S(K[1]), k2 = S(K[2]);
  await ev(`TLXPL.drv.take(${k0})`);
  await clearToasts();
  await ev(`__heap(${S(K[0] + ":w")}, 0.9); __heap(${S(K[1] + ":m")}, 1.2); __away()`); await sleep(300);
  const a = await J(`({ a: __e(${S(K[0] + ":w")}), b: __e(${S(K[1] + ":m")}) })`), t = await toasts(), j = await jobs();
  ok(a.a && a.b && t.filter(m => /Your plow's snow lies across/.test(m)).length === 1 && t.some(m => m.includes(`${nm(0)}'s front walk and the mouth of ${nm(1)}'s drive`) && /or they dig it out by hand and remember it/.test(m)), "a customer's walk and a neighbour's drive mouth: one line for both (" + S(t) + ")");
  ok(j.length === 1 && j[0].title === "Clear your snow from 2 doors", "Jobs: one row for both");
  await clearToasts(); await ev(`__hrs(3.1)`); await sleep(300);
  const b = await J(`({ st: __st(${k0}), off: TLX.state("plow").drvOff, sulk: TLX.state("plow").drvSulk, hour: GS.hour, c: TLX.state("plow").winC, talk: TLXPL.win.talk() })`), t2 = await toasts();
  console.log("  ", S({ b, t2 }));
  ok(b.st && b.st.miss === 1, `${nm(0)} is a customer: the walk left blocked is a miss, as a drive left snowed in is`);
  ok(b.off[K[1]] > b.hour + 70 && b.off[K[1]] < b.hour + 73 && b.sulk[K[1]] === 1, `${nm(1)} was only asking: not asking you for 3 days`);
  ok(b.c === 3 && b.talk === true && t2.some(m => m.includes(`${nm(0)} and ${nm(1)} dug your plow's snow out of the way by hand.`) && /3 complaints against you this week\. Word has got round: nobody new takes you on before Monday\./.test(m)), "three complaints in the week: the line says word has got round");
  await clearToasts();
  const r2 = await ev(`TLXPL.drv.take(${k2})`), r1 = await ev(`TLXPL.drv.take(${k1})`), t3 = await toasts();
  ok(r2 === false && t3.some(m => /The street is talking about the snow your plow leaves at people's doors\. Nobody new takes you on before Monday\./.test(m)), "TAKE ON refused by a household you never wronged");
  ok(r1 === false && t3.some(m => m.includes(`${nm(1)} had to dig your plow's snow out of the way and is not asking you. Try again in 3 days.`)), "and by the neighbour, with the reason and the days");
  await ev(`SET.touch = "on"; setTouchUI(); TABLET.toggle(true, "plow"); true`); await sleep(500);
  const ap = await J(`({ txt: $("tabS").textContent, blocked: $("tabS").querySelectorAll("[data-act^='pdt:'].blocked").length, n: $("tabS").querySelectorAll("[data-act^='pdt:']").length })`);
  ok(/NOT ASKING YOU/.test(ap.txt) && /SHOVELLED BY HAND ONCE/.test(ap.txt) && /3 complaints this week/.test(ap.txt) && ap.blocked === ap.n && ap.n === DR.length - 1 && !/NaN|undefined/.test(ap.txt), "the app: NOT ASKING YOU, the customer's miss, 3 complaints this week, every TAKE ON greyed");
  await still("w5_app_talk");
  await ev(`TLXPL.win.monday(); TABLET.toggle(true, "plow"); true`); await sleep(500);
  const mo = await J(`({ c: TLX.state("plow").winC, n: TLX.state("plow").winN, blocked: $("tabS").querySelectorAll("[data-act^='pdt:'].blocked").length })`);
  ok(mo.c === 0 && mo.n === 3 && mo.blocked === 1, "Monday: the week's count starts again, only the neighbour still is not asking");
  await clearToasts();
  await ev(`$("tabS").querySelector("[data-act='pdt:" + ${k2} + "']").click(); true`); await sleep(400);
  ok(!!(await J(`__st(${k2})`)), "TAKE ON pressed on the touch layout after Monday: taken");
  await ev(`TLXPL.drv.drop(${k2}); TABLET.toggle(false); SET.touch = "off"; setTouchUI(); true`);
  // the second miss, by the mouth of the customer's own (clear) drive
  await clearToasts(); await ev(`__heap(${S(K[0] + ":m")}, 1.2); __away()`); await sleep(300);
  ok(!!(await J(`__e(${S(K[0] + ":m")})`)) && (await toasts()).some(m => m.includes(`the mouth of ${nm(0)}'s drive`)), "your snow in the mouth of a customer's clear drive is a complaint too");
  await clearToasts(); await ev(`__hrs(3.1)`); await sleep(300);
  const e = await J(`({ st: __st(${k0}), off: TLX.state("plow").drvOff[${k0}], hour: GS.hour })`), t5 = await toasts();
  ok(e.st === null && e.off > e.hour + 160 && t5.some(m => m.includes(`${nm(0)} has found someone else to plow.`)), "the second miss loses the customer for a week (" + S(t5) + ")");
});

await section("F the mouth of your own snowed-in drive", async () => {
  const k3 = S(K[3]), m3 = S(K[3] + ":m");
  await ev(`TLXPL.win.monday(); TLXPL.drv.take(${k3}); __storm(3); true`);
  ok((await J(`__st(${k3})`)).s > 0.4, `${nm(3)}'s drive is yours and snowed in`);
  await clearToasts(); await ev(`__heap(${m3}, 1.2); __away()`); await sleep(300);
  const a = await J(`({ e: __e(${m3}), pend: __z(${m3}).pend })`);
  ok(a.e === null && a.pend === 0 && !(await toasts()).some(m => /Your plow's snow/.test(m)), "snow heaped in its mouth while you work on it: not counted");
  const before = await ev(`(() => { const q = __z(${m3}), ix = Math.round((q.cx + HALF) / CELL), iz = Math.round((q.cz + HALF) / CELL); return depthAt(ix, iz); })()`);
  await ev(`(() => { const c = TLXPL.drv.list().find(c => c.key === ${k3}); for (let t = 0; t < c.L; t += 0.5) TLXPL.drv.mark(c.a[0] + c.ux * t, c.a[1] + c.uz * t, true); return true; })()`);
  const b = await J(`({ st: __st(${k3}), y: yardAt(__z(${m3}).cx, __z(${m3}).cz), over: TLXPL.win.measure(__z(${m3})), d: (() => { const q = __z(${m3}), ix = Math.round((q.cx + HALF) / CELL), iz = Math.round((q.cz + HALF) / CELL); return depthAt(ix, iz); })(),
    side: (() => { const c = TLXPL.drv.list().find(c => c.key === ${k3}), x = c.a[0] + c.ux * 6, z = c.a[1] + c.uz * 6, ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL); return depthAt(ix, iz) - restCell(ix, iz); })() })`);
  console.log("  ", S({ before, b }));
  ok(b.st.s === 0 && b.st.n === 1 && b.y > 0.8, "the drive is plowed out and paid: plowed ground again");
  ok(b.over >= BLOCK && b.d > before - 0.05, `the heap in its mouth is still standing (${b.over.toFixed(2)} m3, ${(b.d * 100).toFixed(0)} cm deep): the drive going clear did not wipe it`);
  ok(Math.abs(b.side) < 0.02, "the uncut snow further up the drive did go (it is the heap that stays)");
  await clearToasts(); await ev(`TLXPL.win.lay(__z(${m3}).cx, __z(${m3}).cz, 0.9, 0.2); __away()`); await sleep(300);
  const c = await J(`__e(${m3})`), t = await toasts();
  ok(c && c.v >= BLOCK && t.some(m => m.includes(`Your plow's snow lies across the mouth of ${nm(3)}'s drive.`)), "the drive clear and more laid on the heap: now it is a complaint");
});

await section("G reload, junk, a sleep", async () => {
  const m3 = S(K[3] + ":m");
  await ev(`__hrs(1.5)`);
  const b0 = await J(`__e(${m3})`);
  ok(b0 && Math.abs(b0.h - 1.5) < 0.01, "before the reload: 1.5 h on the complaint");
  await reload(); await ev(SETUP); await sleep(500); await ev(KIT);
  const a = await J(`({ e: __e(${m3}), relay: __z(${m3}).relay, n: TLXPL.win.list().length, keys: TLXPL.win.list().map(q => q.key).join(), jobs: jobsList().filter(r => r.kind === "plowwin").length, c: TLX.state("plow").winC, tot: TLX.state("plow").winN })`);
  ok(a.n === Z.length && a.keys === Z.map(q => q.key).join(), "the same zones after a reload");
  ok(a.e && Math.abs(a.e.h - b0.h) < 0.1 && a.e.v === b0.v && a.jobs === 1 && a.tot >= 4, "the complaint, its clock and its Jobs row are back (" + S(a.e) + ")");
  await ev(`(() => { const q = __z(${m3}); P.x = q.cx + q.ux * -14; P.z = q.cz + q.uz * -14; P.y = surf(P.x, P.z); P.vx = P.vz = 0; return true; })()`); await sleep(1500);
  const b = await J(`({ over: TLXPL.win.measure(__z(${m3})), e: __e(${m3}), relay: __z(${m3}).relay })`);
  ok(b.e && b.over >= BLOCK && b.relay === false, `back within sight of it the heap lies there again (${b.over.toFixed(2)} m3): a reload does not clear a door`);
  const junk = await ev(`(() => { try { const s = TLX.state("plow"); s.win.zzz = { v: 1, h: 0 }; s.win["1_1:w"] = 5; s.winC = "x"; s.winN = -3; s.winH = "no"; s.drvSulk = [1]; TLXPL.tidy(); TLXPL.win.step(); TABLET.toggle(true, "plow"); const t = $("tabS").textContent; TABLET.toggle(false);
    return !/NaN|undefined/.test(t) && s.winC === 0 && s.winN === 0 && s.win["1_1:w"] === undefined && typeof s.drvSulk === "object" && !Array.isArray(s.drvSulk); } catch (e) { return String(e); } })()`);
  ok(junk === true, "junk in the saved state: tidied, nothing thrown (" + junk + ")");
  await clearToasts();
  await ev(`TLX.state("plow").winC = 0; __away(); GS.hour += 9; TLX.state("roads").h = GS.hour; TLXPL.drv.step(); TLXPL.win.step(); true`); await sleep(300);
  const c = await J(`({ e: __e(${m3}), c: TLX.state("plow").winC, st: __st(${S(K[3])}), over: TLXPL.win.measure(__z(${m3})) })`), t = await toasts();
  ok(c.e === null && c.c === 1 && c.st && c.st.miss === 1 && c.over < CLEAR && t.some(m => m.startsWith(`While you were away ${nm(3)} dug your plow's snow out of the way by hand.`)), "a 9 h sleep: dug out while you were away, a complaint, a miss with that customer (" + S(t) + ")");
});

await section("H option plowdoors off", async () => {
  const m3 = S(K[3] + ":m");
  await ev(`TLXPL.win.monday(); __heap(${m3}, 1.2); __away(); true`); await sleep(300);
  ok(!!(await J(`__e(${m3})`)), "on: a complaint stands");
  await clearToasts();
  await ev(`TLX.setOn("plowdoors", false); TLXPL.win.step(); true`); await sleep(300);
  await ev(`__heap(${w0}, 0.9); __away(); TLX.state("plow").winC = 5; __hrs(3.5); true`); await sleep(300);
  const a = await J(`({ win: Object.keys(TLX.state("plow").win).length, pend: __z(${w0}).pend, jobs: jobsList().filter(r => r.kind === "plowwin").length, pins: TABLET.layerPts("marks").filter(p => /YOUR SNOW/.test(p.name || "")).length, talk: TLXPL.win.talk(), hint: TLXPL.win.line(), st: __st(${S(K[3])}) })`), t = await toasts();
  console.log("  ", S(a));
  ok(a.win === 0 && a.pend === 0 && a.jobs === 0 && a.pins === 0 && a.hint === "" && !t.some(m => /plow's snow/.test(m)), "off: the standing complaint is dropped, new snow on a walk is not counted, nothing is said");
  ok(a.talk === false && a.st && a.st.miss === 1, "off: no talk on the street, no new miss");
  const r = await ev(`TLXPL.drv.take(${S(K[2])})`);
  ok(r === true, "off: TAKE ON is not held back by the week's count");
  await ev(`TLX.setOn("plowdoors", true); TLX.state("plow").winC = 0; true`);
});

console.log(fails ? `FAILED ${fails}` : "all ok");
await done(fails ? 1 : 0);
