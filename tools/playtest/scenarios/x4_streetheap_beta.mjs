// 4.2c2b street heap beta: heap split across two lengths, on foot, bare sled, big heap one pass, option toggle with complaint standing, night.
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
await ev(`GS.hour = 46; TLX.state("roads").h = 46; true`);
const BLOCK = await ev("TLXPL.str.STR.block"), CLEAR = await ev("TLXPL.str.STR.clear");
const Z = await J(`TLXPL.str.list().map(q => ({ key: q.key, name: q.name, cx: q.cx, cz: q.cz, ux: q.ux, uz: q.uz, L: q.L }))`);
const pick = await J(`(() => { const out = []; for (const q of TLXPL.str.list()) { if (Math.hypot(q.cx - depot.x, q.cz - depot.z) < 58) continue; let free = true;
  for (let s = -17; s <= 17 && free; s += 1) for (const l of [-1.2, 0, 1.2]) { const x = q.cx + q.ux * s - q.uz * l, z = q.cz + q.uz * s + q.ux * l; if (isSea(x, z) || obNear(x, z, 1.3) || yardAt(x, z) < 0.7) { free = false; break; } }
  if (free) out.push(q.key); } return out; })()`);
console.log("free lengths", pick.length);
const k0 = S(pick[0]), k1 = S(pick[1]);
await ev(`GS.cash = 40000; TLXV.buy("pickup"); true`); await sleep(500);
const uid = await truck();
await ev(`TLX.state("plow").blades[${S(uid)}] = { id: "b23", cond: 100, throw: "s" }; TLXPL.tidy(); TLXV.swapTo(${S(uid)}); FOOT.on = false; true`); await sleep(600);
await section("1 split heap across a length boundary", async () => {
  // find a neighbour pair on one street
  const pair = await J(`(() => { const L = TLXPL.str.list(); for (let i = 0; i < L.length - 1; i++) { const a = L[i], b = L[i + 1]; if (a.name === b.name && Math.hypot(a.cx - b.cx, a.cz - b.cz) < 17 && ${S(pick)}.includes(a.key)) return [a.key, b.key]; } return null; })()`);
  if (!pair) { ok(true, "no neighbour pair free (skipped)"); return; }
  const [a, b] = pair; await ev(`__put(${S(a)}, 1, -9, 0)`); await sleep(1200);
  const info = await J(`(() => { const qa = __q(${S(a)}), qb = __q(${S(b)}); const mx = (qa.cx + qb.cx) / 2, mz = (qa.cz + qb.cz) / 2; let v = 0; v += heapSnow(mx, mz, 1.0, 1.0, 0.8); TLXPL.str.lay(mx, mz, 1.0, v); return { v, a: __zs(${S(a)}), b: __zs(${S(b)}) }; })()`);
  await ev(`__away()`); await sleep(800);
  const r = await J(`({ a: __zs(${S(a)}), b: __zs(${S(b)}), jobs: jobsList().filter(r => r.kind === "plowstr").length })`);
  console.log("  ", S({ info, r }));
  ok(true, `1.0 m3 on the boundary: a ${r.a.over} m3, b ${r.b.over} m3; complaint a=${!!r.a.e} b=${!!r.b.e}; jobs ${r.jobs}`);
  if (r.a.over + r.b.over >= BLOCK && !r.a.e && !r.b.e) ok(false, "BUG: a heap of " + (r.a.over + r.b.over) + " m3 sat on a boundary and counts for neither length");
});
await section("2 on foot / bare sled with a complaint standing", async () => {
  await ev(`__heap(${k0}, 1.5); __away(); true`); await sleep(500);
  const a = await J(`__e(${k0})`);
  ok(!!a, "complaint standing");
  await ev(`FOOT.on = true; true`); await sleep(800);
  const f = await J(`({ hint: TLXPL.str.line(), h: __e(${k0}).h, jobs: jobsList().filter(r => r.kind === "plowstr").length })`);
  ok(f.jobs === 1, "on foot: Jobs row stays " + S(f));
  await ev(`FOOT.on = false; VEH.cur = null; true`); await sleep(500);
  const g = await J(`({ e: __e(${k0}), jobs: jobsList().filter(r => r.kind === "plowstr").length, hint: TLXPL.hint ? TLXPL.hint() : "" })`);
  ok(g.e && g.jobs === 1, "bare sled: still stands, no throw " + S(g).slice(0, 160));
  await ev(`__hrs(1); true`); const h = await J(`__e(${k0})`);
  ok(h && h.h > 0.9 && h.h < 1.1, "clock runs on bare sled: " + (h && h.h));
});
await section("3 big heap, one pass", async () => {
  await truck(); await ev(`__heap(${k1}, 7); __away(); true`); await sleep(500);
  const a = await J(`__zs(${k1})`);
  await ev(`TLX.state("plow").blades[${S(uid)}].throw = "r"; __put(${S(pick[1])}, 1, -12, 0.7); true`); await sleep(1500);
  await blade(true); await pup(pick[1], 1, 0.7, -12, 14); await blade(false); await sleep(900);
  const b = await J(`__zs(${k1})`);
  const near = await J(`TLXPL.str.list().filter(q => q.over > 0.05 || q.pend > 0).map(q => q.key + " " + q.over.toFixed(2))`);
  console.log("  ", S({ a: a.over, b: b.over, near }));
  ok(true, `7 m3 heap, one pass in right lane: ${a.over} -> ${b.over} m3; elsewhere: ${near.join("; ")}`);
});
await section("4 option off with complaint standing, clock mid-way, on again", async () => {
  await ev(`TLXPL.str.monday(); TLX.state("plow").str = {}; __away(); __heap(${k0}, 1.5); __away(); __hrs(1.5); true`); await sleep(300);
  await ev(`TLX.setOn("plowstreets", false); TLXPL.str.step(); true`); await sleep(300);
  await ev(`__hrs(1); TLX.setOn("plowstreets", true); TLXPL.str.step(); true`); await sleep(500);
  const a = await J(`({ e: __e(${k0}), c: TLX.state("plow").strC, z: __zs(${k0}), jobs: jobsList().filter(r => r.kind === "plowstr").length })`);
  console.log("  ", S(a));
  ok(true, "option off 1h then on: complaint " + S(a.e) + " strikes " + a.c + " measured " + a.z.over + " jobs " + a.jobs);
  const txt = await appText(); await ev(`TABLET.toggle(false); true`);
  ok(!/NaN|undefined/.test(txt), "app text clean");
});
await section("5 night still", async () => {
  await ev(`GS.hour = 23; __put(${k0}, 1, -9, 0); __heap(${k0}, 2); true`); await sleep(1500);
  await ev(`__cam(${k0})`); await sleep(500); await still("n1_night_street_heap");
  const hint = await ev(`TLXPL.hint()`); console.log("  hint:", hint);
  ok(/heap|street/i.test(hint), "night hint present: " + hint.slice(0, 100));
});
console.log(fails ? `FAILED ${fails}` : "all ok");
await done(fails ? 1 : 0);
