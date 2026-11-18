// 4.2c2b streets: a heap of the blade's snow left standing in a town street (tlx-plow.js, the block comment at STR).
//   A a fresh game: the place's streets cut into lengths, named, nothing standing in any, nothing saved.
//   B the real blade: a pile carried down a street on a square blade and left where the truck stops. Close by only
//     the hint speaks; driven on, it is the kommune's complaint: a line, a Jobs row, a Map pin, the Plow app.
//   C the real blade again: one pass each way in the right-hand lane, throwing right: the street is clear, forgotten.
//   D left with no road contract: the clock stands in a storm; at 2 h the kommune's truck clears it and tenders no
//     road for 3 days.
//   E with road contracts: a warning on the road held longest; two heaps cleared at once are one warning; the third
//     takes that road back; the next goes to the other road. Monday.
//   F reload keeps the complaint, its clock and puts the heap back where it stood; junk; a sleep.
//   G option plowstreets off: nothing counted, nothing held against you.
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
  if (!window.__camHk) { window.__camHk = 1; const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); }; }
  window.__q = k => TLXPL.str.list().find(q => q.key === k);
  window.__e = k => { const e = TLX.state("plow").str[k]; return e ? JSON.parse(JSON.stringify(e)) : null; };
  window.__zs = k => { const q = __q(k); return { over: +TLXPL.str.measure(q).toFixed(3), pend: +q.pend.toFixed(3), e: __e(k), hx: q.hx, hz: q.hz }; };
  window.__pose = (x, z, yaw) => { BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; crashCancel(); FOOT.on = false; P.x = x; P.z = z; P.yaw = yaw; P.vx = P.vy = P.vz = 0; P.y = surf(x, z); return true; };
  window.__foot = () => { const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw); for (let k = -5; k <= 3; k += 0.15) bladeSnow(P.x + fx * k + fz * 1.6, P.z + fz * k - fx * 1.6, P.x + fx * k - fz * 1.6, P.z + fz * k + fx * 1.6, 0.15); P.y = surf(P.x, P.z); return true; };
  // the truck with its blade's middle t metres along a street length from its centre (dir +1 = the way the street runs), lat metres to the truck's right of the centre line
  window.__at = (k, dir, t, lat) => { const q = __q(k), d = TLXPL.bladeOf(TLXV.state().cur), fx = q.ux * dir, fz = q.uz * dir, rx = -fz, rz = fx;
    return { x: q.cx + fx * (t - d.z) + rx * lat, z: q.cz + fz * (t - d.z) + rz * lat, yaw: Math.atan2(fx, fz), fx, fz }; };
  window.__put = (k, dir, t, lat) => { const p = __at(k, dir, t, lat); return __pose(p.x, p.z, p.yaw); };
  window.__pup = (k, dir, lat, t0, t1) => { let t = t0; window.__pupOn = true; window.__air = 0; __put(k, dir, t0, lat); __foot();
    const step = () => { t += 0.07; if (t >= t1) { P.vx = P.vz = 0; window.__pupOn = false; return; } const p = __at(k, dir, t, lat);
      P.x = p.x; P.z = p.z; P.yaw = p.yaw; P.y = surf(p.x, p.z); P.vx = p.fx * 2.5; P.vz = p.fz * 2.5; if (P.gnd === false) window.__air++; requestAnimationFrame(step); };
    requestAnimationFrame(step); return true; };
  window.__away = () => { __pose(depot.x, depot.z, 0); TLXPL.rt(TLXV.state().cur).last = null; TLXPL.str.step(); return true; };
  // as a blade would: v m3 heaped in the middle of a street length, and the blade's own note of it
  window.__heap = (k, v) => { const q = __q(k), p = heapSnow(q.cx, q.cz, 1.0, v, 0.8); TLXPL.str.lay(q.cx, q.cz, 1.0, p); return p; };
  window.__hrs = h => { for (let t = 0; t < h - 1e-6; t += 1.5) { GS.hour += Math.min(1.5, h - t); TLX.state("roads").h = GS.hour; TLXPL.con.step(); TLXPL.str.step(); } return true; };
  window.__storm = h => { const w = WX.at; WX.at = () => 1; __hrs(h); WX.at = w; return true; };
  window.__cam = k => { const q = __q(k); window.camOv = cam => { cam.position.set(q.cx - q.ux * 13 + q.uz * 5, surf(q.cx, q.cz) + 7, q.cz - q.uz * 13 - q.ux * 5); cam.lookAt(q.cx, surf(q.cx, q.cz) + 0.3, q.cz); }; return true; };
  return true; })()`;
const pup = async (k, dir, lat, t0, t1) => { await ev(`__pup(${JSON.stringify(k)}, ${dir}, ${lat}, ${t0}, ${t1})`); for (let i = 0; i < 600 && (await ev("window.__pupOn")); i++) await sleep(100); await sleep(250); };
const blade = dn => ev(`TLXPL.rt(TLXV.state().cur).down = ${dn}; TLXPL.rt(TLXV.state().cur).k = ${dn ? 1 : 0}; TLXPL.rt(TLXV.state().cur).last = null; true`);
const jobs = () => J(`jobsList().filter(r => r.kind === "plowstr").map(r => ({ title: r.title, x: r.tgt.x, z: r.tgt.z, meta: r.meta, pay: r.pay, auto: r.auto }))`);
const pins = () => J(`TABLET.layerPts("marks").filter(p => /HEAP IN THE STREET/.test(p.name || ""))`);
const st = () => J(`(() => { const s = TLX.state("plow"); return { str: s.str, c: s.strC, n: s.strN, ban: s.strBan, hour: GS.hour, con: Object.fromEntries(Object.keys(s.con).map(id => [id, s.con[id].strikes])), conBan: s.conBan }; })()`);
const appText = async () => { await ev(`TABLET.toggle(true, "plow"); true`); await sleep(450); return ev(`$("tabS").textContent`); };
const truck = async () => { const uid = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`); await ev(`TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(500); return uid; };
const S = e => JSON.stringify(e);

await boot();
await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; true`);
let Z = [], Z0 = null, Z1 = null, uid = null, R = [];
const BLOCK = await ev("TLXPL.str.STR.block"), CLEAR = await ev("TLXPL.str.STR.clear"), LATE = await ev("TLXPL.str.STR.lateH"), BAN = await ev("TLXPL.str.STR.banH");

await section("A fresh game", async () => {
  Z = await J(`TLXPL.str.list().map(q => ({ key: q.key, name: q.name, L: +q.L.toFixed(2), cx: q.cx, cz: q.cz, ux: q.ux, uz: q.uz, y: yardAt(q.cx, q.cz), over: TLXPL.str.measure(q), sea: isSea(q.cx, q.cz), dep: Math.hypot(q.cx - depot.x, q.cz - depot.z) }))`);
  const a = await J(`({ lines: api_streets(), str: TLX.state("plow").str, c: TLX.state("plow").strC, n: TLX.state("plow").strN, ban: TLX.state("plow").strBan, on: TLX.on("plowstreets"), jobs: jobsList().filter(r => r.kind === "plowstr").length, hint: TLXPL.str.line() })`.replace("api_streets()", "TOWNG.lines.map(l => ({ len: Math.hypot(l[2] - l[0], l[3] - l[1]), name: l[4] }))"));
  const names = [...new Set(Z.map(q => q.name))], total = a.lines.reduce((s, l) => s + l.len, 0), sum = Z.reduce((s, q) => s + q.L, 0);
  console.log("  ", a.lines.length, "streets,", Math.round(total), "m;", Z.length, "lengths of", Math.min(...Z.map(q => q.L)), "to", Math.max(...Z.map(q => q.L)), "m;", names.join(", "));
  ok(a.lines.length >= 5 && a.lines.every(l => typeof l.name === "string" && l.name.length > 2) && names.length === a.lines.length && names.includes("Kaigata"), `the place lists ${a.lines.length} streets, each with a name of its own`);
  ok(Z.length >= 40 && new Set(Z.map(q => q.key)).size === Z.length && Z.every(q => q.L >= 8 && q.L <= 16) && Math.abs(sum - total) < 0.5, `${Z.length} lengths of 8-16 m cover every metre of them (${Math.round(sum)} of ${Math.round(total)} m)`);
  ok(Z.filter(q => !q.sea).every(q => q.y > 0.8), "every length lies on plowed ground");
  ok(Z.every(q => q.over < 0.05), "nothing stands in any of them (most: " + Math.max(...Z.map(q => q.over)).toFixed(3) + " m3)");
  ok(Object.keys(a.str).length === 0 && a.c === 0 && a.n === 0 && a.ban === 0 && a.on === true && a.jobs === 0 && a.hint === "" && (await pins()).length === 0, "fresh game: no heap, no count, no Jobs row, no pin; option plowstreets is on");
  // two lengths to test on, on different streets: no door's walk, lamp, shed or parked car beside the truck's runs, well away from the depot
  const pick = await J(`(() => { const cars = window.TLXC ? TLXC.cars : [], W = TLXPL.win.list(), out = [];
    for (const q of TLXPL.str.list()) { if (Math.hypot(q.cx - depot.x, q.cz - depot.z) < 58) continue; let free = true;
      for (let s = -17; s <= 17 && free; s += 1) for (const l of [-1.2, 0, 1.2]) { const x = q.cx + q.ux * s - q.uz * l, z = q.cz + q.uz * s + q.ux * l; if (isSea(x, z) || obNear(x, z, 1.3) || yardAt(x, z) < 0.7 || cars.some(c => Math.hypot(c.x - x, c.z - z) < 4.5)) { free = false; break; } }
      if (!free) continue;
      if (W.some(w => { const px = w.cx - q.cx, pz = w.cz - q.cz; return Math.abs(px * q.ux + pz * q.uz) < 22 && Math.abs(px * q.uz - pz * q.ux) < 8; })) continue;
      out.push({ key: q.key, name: q.name }); }
    return out; })()`);
  console.log("  ", pick.length, "lengths free to test on:", pick.slice(0, 8).map(p => p.key + " " + p.name).join(", "));
  Z0 = pick[0] || null; Z1 = pick.find(p => Z0 && p.name !== Z0.name) || pick.find(p => Z0 && p.key !== Z0.key && Math.hypot(Z.find(q => q.key === p.key).cx - Z.find(q => q.key === Z0.key).cx, Z.find(q => q.key === p.key).cz - Z.find(q => q.key === Z0.key).cz) > 30) || null;
  ok(!!Z0 && !!Z1, "two lengths to test on: " + S(Z0) + " " + S(Z1));
});
if (!Z0 || !Z1) await done(1);
const k0 = S(Z0.key), k1 = S(Z1.key), n0 = Z0.name, n1 = Z1.name, q0 = Z.find(q => q.key === Z0.key);

await section("B a pile carried down the street on a square blade and left there", async () => {
  await ev(`GS.cash = 40000; TLXV.buy("pickup"); true`); await sleep(500);
  uid = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`);
  await ev(`TLX.state("plow").blades[${S(uid)}] = { id: "b23", cond: 100, throw: "s" }; TLXPL.tidy(); TLXV.swapTo(${S(uid)}); FOOT.on = false; true`); await sleep(600);
  await ev(`__put(${k0}, 1, -9, 0)`); await sleep(1500);
  // a pile somebody left in the street (not the blade's: nothing is counted)
  const pile = await ev(`(() => { const q = __q(${k0}); let v = 0; for (const s of [-3.5, -2, -0.5]) v += heapSnow(q.cx + q.ux * s, q.cz + q.uz * s, 1.0, 0.8, 0.8); return v; })()`);
  const z0 = await J(`__zs(${k0})`);
  ok(pile > 2.2 && z0.pend === 0 && z0.e === null && (await ev(`TLXPL.str.line()`)) === "", `a ${pile.toFixed(1)} m3 pile nobody's blade laid lies in ${n0}: not counted, nothing said`);
  await clearToasts(); await blade(true);
  await pup(Z0.key, 1, 0, -9, 2.5);
  const carry = await ev(`TLXPL.rt(TLXV.state().cur).carry`);
  await sleep(3200);                                                             // stopped with the blade down: what it carries is left in front of it
  const a = await J(`({ z: __zs(${k0}), hint: TLXPL.hint(), air: window.__air, carry: TLXPL.rt(TLXV.state().cur).carry, dist: Math.hypot(P.x - __q(${k0}).hx, P.z - __q(${k0}).hz), jobs: jobsList().filter(r => r.kind === "plowstr").length })`), t = await toasts();
  console.log("  ", S({ carry, a }));
  ok(carry > 1 && a.carry === 0 && a.z.pend > 1 && a.z.over >= BLOCK, `pushed ${carry.toFixed(1)} m3 down the street and stopped: ${a.z.over.toFixed(2)} m3 of the blade's snow stands in ${n0} (a heap from ${BLOCK})`);
  ok(a.dist < 9 && a.z.e === null && a.jobs === 0 && !t.some(m => /heap stands? in/.test(m)), `still ${a.dist.toFixed(1)} m from it: no complaint yet`);
  ok(a.hint.includes(`your heap stands in ${n0}: push it off the street before you drive on`), "the riding hint says so: " + a.hint.slice(0, 120));
  if (!NOSTILLS) { await ev(`__cam(${k0})`); await sleep(400); await still("s1_heap_in_street"); }
  await blade(false); await ev(`__away()`); await sleep(900);
  const b = await J(`({ z: __zs(${k0}), badge: TABLET.byId.plow.badge() })`), t2 = await toasts(), j = await jobs(), p = await pins();
  console.log("  ", S({ b, t2, j, p }));
  ok(b.z.e && b.z.e.v >= BLOCK && b.z.e.h < 0.05 && Math.hypot(b.z.e.x - q0.cx, b.z.e.z - q0.cz) < 8, "driven on: it is a complaint with a clock, saved with where it stands");
  ok(t2.some(m => m.startsWith(`Your plow's heap stands in ${n0}. Push it off the street with the blade`) && m.includes(`inside ${LATE} h, or the kommune sends its own truck and holds it against you.`)), "a line names the street and the hours");
  ok(j.length === 1 && j[0].title === `Push your heap off ${n0}` && j[0].meta.includes(`${LATE} h before the kommune's truck comes for it`) && j[0].pay === "no pay" && j[0].auto === true && Math.hypot(j[0].x - b.z.e.x, j[0].z - b.z.e.z) < 0.2, "Jobs: one row, its target the heap (" + S(j) + ")");
  ok(p.length === 1 && p[0].name === "HEAP IN THE STREET: " + n0.toUpperCase() && b.badge === "!", "a pin on the Map, a badge on the Plow app");
  const txt = await appText();
  ok(/Streets/.test(txt) && txt.includes("1 heap of yours standing in a street") && /IN THE WAY/.test(txt) && txt.includes("before the kommune's own truck clears it") && /Push a heap off the street with the blade and it is forgotten/.test(txt) && !/NaN|undefined/.test(txt), "the Plow app lists it under Streets");
  await still("s2_app_streets"); await ev(`TABLET.toggle(false); true`);
});

await section("C one pass each way, throwing right", async () => {
  await ev(`TLX.state("plow").blades[${S(uid)}].throw = "r"; __put(${k0}, 1, -8, 0.7); true`); await sleep(1500);
  const h0 = await ev(`TLXPL.hint()`);
  ok(h0.includes(`${n0}: your heap still stands in the street`), "back at it, the hint names it: " + h0.slice(0, 90));
  await ev(`__put(${k0}, 1, -12, 0.7)`); await sleep(600);
  await clearToasts(); await blade(true);
  await pup(Z0.key, 1, 0.7, -12, 14); await blade(false); await sleep(700);
  const m1 = await J(`__zs(${k0})`);
  await ev(`__put(${k0}, -1, -14, 0.7)`); await sleep(900); await blade(true);
  await pup(Z0.key, -1, 0.7, -14, 14); await blade(false); await sleep(1100);
  const a = await J(`({ z: __zs(${k0}), s: TLX.state("plow").str, c: TLX.state("plow").strC, air: window.__air, near: TLXPL.str.list().filter(q => q.over > 0.05 || q.pend > 0).map(q => q.key + " " + q.over.toFixed(2)) })`), t = await toasts(), j = await jobs();
  console.log("  ", S({ m1: m1.over, a, t }));
  ok(a.z.over < CLEAR && a.z.e === null, `thrown onto the verges: ${m1.over.toFixed(2)} m3 after the first pass, ${a.z.over.toFixed(2)} m3 after the second, the complaint is gone`);
  ok(t.some(m => m === `${n0} is clear of your snow again.`) && j.length === 0 && a.c === 0 && (await pins()).length === 0, "a line says so; the Jobs row and the pin are gone, nothing on the week's count");
  await still("s3_cleared"); await ev(`window.camOv = null; true`);
  await ev(`__away()`); await sleep(700);
  const b = await st();
  ok(Object.keys(b.str).length === 0 && !(await toasts()).some(m => /heaps? stands? in/.test(m)), "driven on: nothing more is said, no other length holds a heap (" + S(b.str) + ")");
});

await section("D left, with no road contract", async () => {
  await clearToasts();
  const p = await ev(`__heap(${k0}, 1.4)`); await ev(`__away()`); await sleep(300);
  const a = await J(`__zs(${k0})`);
  ok(p > 1.3 && a.e && a.e.v >= BLOCK, `${p.toFixed(2)} m3 left in ${n0} and driven away from: a complaint (${a.e && a.e.v} m3)`);
  await ev(`__storm(2)`);
  const b = await J(`__e(${k0})`);
  ok(b && b.h < 0.05, "2 h of storm: the clock stands (" + (b ? b.h.toFixed(2) : "?") + " h)");
  await ev(`__hrs(1)`);
  const c = await J(`__e(${k0})`);
  ok(c && Math.abs(c.h - 1) < 0.01, "1 h of calm: 1 h on it");
  await clearToasts(); await ev(`__hrs(1.1)`); await sleep(300);
  const d = await st(), z = await J(`__zs(${k0})`), t = await toasts(), j = await jobs();
  console.log("  ", S({ d, t }));
  ok(d.str[Z0.key] === undefined && z.over < CLEAR && d.c === 1 && d.n === 1 && j.length === 0, `at ${LATE} h the kommune's truck clears it: the street is clear (${z.over.toFixed(2)} m3), once this week`);
  ok(Math.abs(d.ban - d.hour - BAN) < 0.01 && t.some(m => m === `The kommune's own truck had to clear your plow's heap out of ${n0}. It tenders no road to you for 3 days.`), "no contract to warn: no road tendered for 3 days, and the line says so (" + S(t) + ")");
  R = await J(`TLXPL.con.routes().map(r => ({ id: r.id, name: r.name }))`);
  await clearToasts();
  const r = await ev(`TLXPL.con.sign(${S(R[0].id)})`), t2 = await toasts();
  ok(R.length >= 2 && r === false && t2.some(m => m === "The kommune had to send its own truck to clear your plow's heap out of a street. It tenders no road to you for another 3 days."), "SIGN refused, with the reason and the days");
  const txt = await appText(); await ev(`TABLET.toggle(false); true`);
  ok(txt.includes("the kommune's truck out once this week") && txt.includes("it tenders no road to you for another 3 days") && !/NaN|undefined/.test(txt), "the app's Streets section says so");
  await ev(`__hrs(${BAN} + 0.5)`);
  ok((await ev(`TLXPL.con.sign(${S(R[0].id)})`)) === true, "three days on: the road is signed");
});
if (R.length < 2) await done(1);

await section("E with road contracts", async () => {
  const r0 = R[0], r1 = R[1];
  await ev(`TLXPL.str.monday(); __hrs(1); TLXPL.con.sign(${S(r1.id)}); true`);
  await clearToasts(); await ev(`__heap(${k0}, 1.4); __away(); __hrs(${LATE} + 0.1); true`); await sleep(300);
  const a = await st(), t = await toasts();
  console.log("  ", S({ a, t }));
  ok(a.con[r0.id] === 1 && a.con[r1.id] === 0 && a.c === 1 && a.ban <= a.hour, `a heap left: warning 1 on the ${r0.name} (held longest), none on the ${r1.name}, no tender ban`);
  ok(t.some(m => m === `The kommune's own truck had to clear your plow's heap out of ${n0}. Warning 1 of 3 on your contract for the ${r0.name}.`), "the line says what for and which contract");
  await clearToasts(); await ev(`__heap(${k0}, 1.4); __heap(${k1}, 1.0); __away(); true`); await sleep(300);
  const j = await jobs(), t1 = await toasts();
  ok(j.length === 1 && j[0].title === "Push your 2 heaps off the streets" && t1.filter(m => /Your plow's heaps? stands? in/.test(m)).length === 1 && t1.some(m => m.startsWith("Your plow's heaps stand in ") && m.includes(n0) && (n1 === n0 || m.includes(n1)) && m.includes("Push them off")), "two heaps in two lengths: one line, one Jobs row (" + S(j.map(r => r.title)) + ")");
  await clearToasts(); await ev(`__hrs(${LATE} + 0.1)`); await sleep(300);
  const b = await st(), t2 = await toasts();
  console.log("  ", S({ b, t2 }));
  ok(b.con[r0.id] === 2 && b.con[r1.id] === 0 && b.c === 2 && b.n === 4 && Object.keys(b.str).length === 0, "both cleared in one go: ONE more warning (2 of 3), two more heaps on the count");
  ok(t2.some(m => m.startsWith("The kommune's own truck had to clear your plow's heaps out of ") && m.endsWith(`Warning 2 of 3 on your contract for the ${r0.name}.`)), "one line for both");
  await clearToasts(); await ev(`__heap(${k1}, 1.0); __away(); __hrs(${LATE} + 0.1); true`); await sleep(300);
  const c = await st(), t3 = await toasts();
  ok(c.con[r0.id] === undefined && c.conBan[r0.id] > c.hour + 160 && c.con[r1.id] === 0 && t3.some(m => m.startsWith(`The kommune's own truck had to clear your plow's heap out of ${n1}. Third warning: the kommune has taken the ${r0.name} back.`)), `the third: the ${r0.name} is taken back for a week (` + S(t3) + ")");
  await clearToasts(); await ev(`__heap(${k0}, 1.4); __away(); __hrs(${LATE} + 0.1); true`); await sleep(300);
  const d = await st();
  ok(d.con[r1.id] === 1 && d.c === 4, `the next one goes to the ${r1.name}: warning 1`);
  await ev(`TLXPL.str.monday()`);
  const e = await st();
  ok(e.c === 0 && e.n === 6 && e.con[r1.id] === 1, "Monday: the week's count starts again (the contract's warning is the contract's own business)");
});

await section("F reload, junk, a sleep", async () => {
  await clearToasts(); await ev(`__heap(${k0}, 1.4); __away(); __hrs(1); true`); await sleep(300);
  const b0 = await J(`__e(${k0})`);
  ok(b0 && Math.abs(b0.h - 1) < 0.01 && Number.isFinite(b0.x + b0.z), "before the reload: 1 h on the complaint (" + S(b0) + ")");
  await reload(); await ev(SETUP); await sleep(500); await ev(KIT); await truck();
  const a = await J(`({ e: __e(${k0}), n: TLXPL.str.list().length, keys: TLXPL.str.list().map(q => q.key).join(), jobs: jobsList().filter(r => r.kind === "plowstr").length, tot: TLX.state("plow").strN })`);
  ok(a.n === Z.length && a.keys === Z.map(q => q.key).join(), "the same lengths after a reload");
  ok(a.e && Math.abs(a.e.h - b0.h) < 0.1 && a.e.v === b0.v && a.e.x === b0.x && a.e.z === b0.z && a.jobs === 1 && a.tot === 6, "the complaint, its clock, its place and its Jobs row are back (" + S(a.e) + ")");
  await ev(`__put(${k0}, 1, -16, 0)`); await sleep(1600);
  const b = await J(`({ z: __zs(${k0}), relay: __q(${k0}).relay })`);
  ok(b.z.e && b.z.over >= BLOCK && b.relay === false && Math.hypot(b.z.hx - b0.x, b.z.hz - b0.z) < 1.5, `back within sight of it the heap stands there again (${b.z.over.toFixed(2)} m3 of ${b0.v}, ${Math.hypot(b.z.hx - b0.x, b.z.hz - b0.z).toFixed(1)} m from where it was): a reload does not clear a street`);
  const junk = await ev(`(() => { try { const s = TLX.state("plow"); s.str.zzz = { v: 1, h: 0 }; s.str[${k1}] = 5; s.strC = "x"; s.strN = -3; s.strBan = NaN; s.strH = "no"; const e = s.str[${k0}]; e.h = "x"; e.x = "a"; TLXPL.tidy(); TLXPL.str.step(); TABLET.toggle(true, "plow"); const t = $("tabS").textContent; TABLET.toggle(false);
    return !/NaN|undefined/.test(t) && s.strC === 0 && s.strN === 0 && s.strBan === 0 && s.str[${k1}] === undefined && s.str[${k0}].h === 0 && Number.isFinite(s.str[${k0}].x + s.str[${k0}].z) && s.str.zzz === undefined; } catch (e) { return String(e); } })()`);
  ok(junk === true, "junk in the saved state: tidied, nothing thrown (" + junk + ")");
  const old = await ev(`(() => { try { const s = TLX.state("plow"); const keep = s.str; delete s.str; delete s.strC; delete s.strN; delete s.strH; delete s.strBan; TLXPL.tidy(); TLXPL.str.step(); const r = typeof s.str === "object" && s.strC === 0 && s.strBan === 0; s.str = keep; return r; } catch (e) { return String(e); } })()`);
  ok(old === true, "a save from before this slice (no street state): built on the spot (" + old + ")");
  await clearToasts();
  await ev(`__away(); GS.hour += 9; TLX.state("roads").h = GS.hour; TLXPL.str.step(); true`); await sleep(300);
  const c = await J(`({ e: __e(${k0}), z: __zs(${k0}), c: TLX.state("plow").strC })`), t = await toasts();
  ok(c.e === null && c.c === 1 && c.z.over < CLEAR && t.some(m => m.startsWith(`While you were away the kommune's own truck had to clear your plow's heap out of ${n0}.`)), "a 9 h sleep: cleared while you were away, held against you (" + S(t) + ")");
});

await section("G option plowstreets off", async () => {
  await ev(`TLXPL.str.monday(); __heap(${k0}, 1.4); __away(); true`); await sleep(300);
  ok(!!(await J(`__e(${k0})`)), "on: a complaint stands");
  const free = await J(`(() => { const s = TLX.state("plow"); return TLXPL.con.routes().filter(r => !s.con[r.id] && !(s.conBan[r.id] > GS.hour)).map(r => r.id); })()`);
  await ev(`TLX.state("plow").strBan = GS.hour + 50; true`);
  const r0 = free.length ? await ev(`TLXPL.con.sign(${S(free[0])})`) : null;
  const before = await st();
  await clearToasts();
  await ev(`TLX.setOn("plowstreets", false); TLXPL.str.step(); true`); await sleep(300);
  await ev(`__heap(${k1}, 1.4); __away(); __hrs(${LATE} + 1); true`); await sleep(300);
  const a = await J(`({ str: Object.keys(TLX.state("plow").str).length, pend: __q(${k1}).pend, jobs: jobsList().filter(r => r.kind === "plowstr").length, hint: TLXPL.str.line(), badge: TABLET.byId.plow.badge() })`), t = await toasts(), b = await st(), p = await pins();
  console.log("  ", S({ a, free, r0 }));
  ok(a.str === 0 && a.pend === 0 && a.jobs === 0 && p.length === 0 && a.hint === "" && !t.some(m => /kommune's own truck|heaps? stands? in/.test(m)), "off: the standing complaint is dropped, a new heap is not counted, nothing is said");
  ok(S(b.con) === S(before.con) && b.c === before.c && b.n === before.n, "off: no warning, nothing on the count");
  const txt = await appText(); await ev(`TABLET.toggle(false); true`);
  ok(!/Streets/.test(txt) && !/NaN|undefined/.test(txt), "off: the Plow app has no Streets section");
  if (free.length) { const r1 = await ev(`TLXPL.con.sign(${S(free[0])})`); ok(r0 === false && r1 === true, "off: a tender ban left over from a heap does not hold SIGN back (on it did)"); }
  else ok(true, "(no free road left to sign: the tender ban is covered in D)");
  await ev(`TLX.setOn("plowstreets", true); true`);
});

console.log(fails ? `FAILED ${fails}` : "all ok");
await done(fails ? 1 : 0);
