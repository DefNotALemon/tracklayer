// Beta (0220): try to break 4.1a2 road credit: repeat open of same stretch, short last stretch, reload after open. Exit 1 on hard FAIL.
import { boot, ev, sleep, done, down, up, reload, shot, sideCam, camOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(120); }
const ONLY = process.env.ONLY, LEVEL = +(process.env.LEVEL || 0.5), STILLS = !process.env.NOSTILLS;
const section = async (n, f) => { if (ONLY && n[0] !== "A" && !ONLY.includes(n[0])) return; console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80); return true; })()`);

const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 9000; WX.at = () => 0; GS.storm = 0; GS.hour = 12; TLXR.ROADS.plowAt = 2; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
const KIT = `(() => {
  window.__rt = id => TLXR.routes.find(r => r.id === id);
  // s m along route id, off m to the RIGHT of travel (dir +1 up the route, -1 down it): { x, z, yaw }
  window.__lane = (id, s, dir, off) => { const r = __rt(id), c = r.cum, p = r.pts; s = Math.max(0, Math.min(r.len - 0.01, s)); let i = 1; while (i < c.length - 1 && c[i] < s) i++;
    const a = p[i - 1], b = p[i], L = c[i] - c[i - 1] || 1, t = (s - c[i - 1]) / L, tx = (b[0] - a[0]) / L * dir, tz = (b[1] - a[1]) / L * dir;
    return { x: a[0] + (b[0] - a[0]) * t - tz * off, z: a[1] + (b[1] - a[1]) * t + tx * off, yaw: Math.atan2(tx, tz) }; };
  window.__put = (id, s, dir, off) => { const q = __lane(id, s, dir, off); BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; crashCancel(); FOOT.on = false; P.x = q.x; P.z = q.z; P.yaw = q.yaw; P.vx = P.vy = P.vz = 0; P.y = surf(q.x, q.z); recenter(q.x, q.z, true); camState.init = false; const B = TLXPL.rt(TLXV.state().cur); B.last = null; B.carry = 0; B.full = false; return true; };
  // what the driver steers by: the lane point ahead of the truck
  window.__steer = (id, dir, off, ahead) => { const n = TLXR.near(P.x, P.z), t = __lane(id, n.s + dir * ahead, dir, off); let e = Math.atan2(t.x - P.x, t.z - P.z) - P.yaw; while (e > Math.PI) e -= 2 * Math.PI; while (e < -Math.PI) e += 2 * Math.PI;
    return { e, s: n.s, d: n.d, rid: n.route && n.route.id, v: Math.hypot(P.vx, P.vz), bog: BOG.on, why: TLXV.rt().why || "" }; };
  // the puppet: carried from sA to sB along the lane, 2 m a frame, rolling forward at 6 m/s as far as the plow can tell
  window.__pup = (id, sA, sB, off) => { const dir = sB >= sA ? 1 : -1; let s = sA; window.__pupOn = true; __put(id, sA, dir, off); __foot();
    const step = () => { s += dir * 1; if ((s - sB) * dir >= 0) { P.vx = P.vz = 0; window.__pupOn = false; return; } const q = __lane(id, s, dir, off); P.x = q.x; P.z = q.z; P.yaw = q.yaw; P.y = surf(q.x, q.z); P.vx = Math.sin(q.yaw) * 6; P.vz = Math.cos(q.yaw) * 6; P.vy = 0; BOG.on = false; BOG.acc = 0; requestAnimationFrame(step); };
    requestAnimationFrame(step); return true; };
  // beta 0220 #1: a truck SET DOWN on uncut snow each frame (P.y = surf) is "in the air" as far as the truck's own physics
  // can tell (its wheels would sink 12 cm+ below the snow's top: P.gnd false), and a blade in the air neither cuts nor marks,
  // so the snow under the next frame's truck is uncut too and the puppet stays airborne for hundreds of metres, by luck of
  // the first frames. The puppet now starts on its own cut footprint, as a driven truck does; __air counts what is left.
  window.__foot = () => { const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw); for (let k = -4; k <= 5; k += 0.15) bladeSnow(P.x + fx * k + fz * 2.2, P.z + fz * k - fx * 2.2, P.x + fx * k - fz * 2.2, P.z + fz * k + fx * 2.2, 0.15); P.y = surf(P.x, P.z); return true; };
  window.__air = { n: 0, a: 0 };
  if (!window.__airOn) { window.__airOn = true; const f = () => { const u = TLXV.state().cur, B = u != null && TLXPL.rt(u); if (B && B.down && !FOOT.on && Math.hypot(P.vx, P.vz) > 0.3) { __air.n++; if (P.gnd === false) __air.a++; } requestAnimationFrame(f); }; requestAnimationFrame(f); }
  window.__rc = (id, i) => { const c = TLXPL.road.get(id + ":" + i); return c ? { n: c.n, c: [c.c[0], c.c[1]], s0: c.s0 } : null; };
  window.__across = (id, s) => { const o = []; for (let off = -2.8; off <= 2.81; off += 0.7) { const q = __lane(id, s, 1, off), ix = Math.round((q.x + HALF) / CELL), iz = Math.round((q.z + HALF) / CELL), d = depthAt(ix, iz), f = freshAt(ix, iz); o.push([+d.toFixed(2), +f.toFixed(2)]); } return o; };
  return true; })()`;
const pup = async (id, sA, sB, off) => { await ev(`__pup(${JSON.stringify(id)}, ${sA}, ${sB}, ${off})`); for (let k = 0; k < 1500 && (await ev("window.__pupOn")); k++) await sleep(100); await sleep(150); };
const blade = dn => ev(`TLXPL.rt(TLXV.state().cur).down = ${dn}; TLXPL.rt(TLXV.state().cur).last = null; true`);

await boot();
await ev(SETUP); await sleep(600); await ev(KIT);

let uid = null, RD = null;
await section("A setup", async () => {
  const st = await J(`TLX.state("plow")`);
  ok(st && st.opened === 0, "fresh game: no road stretch opened (" + JSON.stringify(st) + ")");
  await ev(`TLXV.buy("pickup"); true`); await sleep(300);
  uid = await ev(`TLXV.state().owned[0].uid`);
  await ev(`(() => { TLX.state("plow").blades[${JSON.stringify(uid)}] = { id: "b23", cond: 100 }; TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; return true; })()`); await sleep(600);
  ok(await ev(`!!VEH.cur && !FOOT.on && TLXV.state().cur === ${JSON.stringify(uid)} && !!TLXPL.bladeOf(${JSON.stringify(uid)})`), "seated in the pickup, the blade fitted");
  // the straightest whole stretch with a stretch either side, on a road with no convoy; and the next best, 2+ stretches away
  RD = await J(`(() => { const SEG = TLXR.ROADS.seg, out = [];
    for (const def of TLXR.ROADS.routes) { if (def.convoy || def.closed) continue; const r = __rt(def.id); if (!r || !r.st) continue;
      for (let i = 1; i < r.seg.length - 1; i++) { if (!r.seg[i - 1].legs.length || !r.seg[i].legs.length || !r.seg[i + 1].legs.length || (i + 1) * SEG + 40 > r.len) continue;
        let turn = 0, y0 = null, bad = false; for (let s = i * SEG - 40; s <= (i + 1) * SEG + 40; s += 8) { const q = __lane(def.id, s, 1, 0); if (y0 !== null) { let e = q.yaw - y0; while (e > Math.PI) e -= 2 * Math.PI; while (e < -Math.PI) e += 2 * Math.PI; turn = Math.max(turn, Math.abs(e)); } y0 = q.yaw; const n = TLXR.near(q.x, q.z); if (n.route !== r || Math.abs(n.s - s) > 3) bad = true; }
        if (!bad) out.push({ id: def.id, name: r.name, i, turn: +turn.toFixed(3), len: Math.round(r.len) }); } }
    out.sort((a, b) => a.turn - b.turn); const a = out[0], k = out.find(o => o.id !== a.id || Math.abs(o.i - a.i) >= 3); return { a, k, n: out.length }; })()`);
  console.log("  stretch", JSON.stringify(RD));
  ok(RD && RD.a && RD.k, "a straight stretch to plow and a second one for the puppet");
});
if (!uid || !RD || !RD.a || !RD.k) await done(1);
const A = Object.assign({}, process.env.USEK ? RD.k : RD.a), SEG = 400, aid = JSON.stringify(A.id);
const both = async (id, i, len) => { const s0 = i * SEG + 4, s1 = Math.min(len - 4, (i + 1) * SEG - 4);
  await ev("TLXPL.road.clear(); true"); await blade(true); await pup(id, s0, s1, 1.5); console.log("   pass1", JSON.stringify(await ev(`JSON.stringify(__rc(${JSON.stringify(id)}, ${i}))`))); await pup(id, s1, s0, 1.5); await blade(false); };
const stat = i => J(`({ rc: __rc(${aid}, ${i}), sn: __rt(${aid}).st.s[${i}], st: TLXR.status(${aid}), opened: TLX.state("plow").opened })`);
await section("E1 open a stretch by puppet", async () => {
  await ev(`TLXR.setSnow(${aid}, 0.6, ${A.i}); true`); await clearToasts();
  await both(A.id, A.i, A.len);
  const s = await stat(A.i); console.log("  ", JSON.stringify(s), JSON.stringify(await toasts()));
  ok(s.opened === 1 && s.sn < 0.02, "E1 opened once, snow gone");
});
await section("E2 refill the opened stretch and open again", async () => {
  await ev(`TLXR.setSnow(${aid}, 0.6, ${A.i}); true`);
  await both(A.id, A.i, A.len);
  const s = await stat(A.i); console.log("  ", JSON.stringify(s));
  ok(s.sn < 0.02, "E2 second open clears it");
  ok(s.opened === 2, "E2 counter " + s.opened + " (2 = counts openings)");
});
await section("E3 last, short stretch of the route", async () => {
  const r = await J(`(() => { const r = __rt(${aid}); const i = r.seg.length - 1; return { i, len: r.len, short: r.len - i * 400, legs: r.seg[i].legs.length, ns: r.st.s.length }; })()`);
  console.log("  ", JSON.stringify(r));
  if (!(r.legs && r.i < r.ns)) { ok(true, "E3 skipped, last seg has no legs"); return; }
  await ev(`TLXR.setSnow(${aid}, 0.6, ${r.i}); true`);
  const o0 = (await stat(r.i)).opened;
  await both(A.id, r.i, r.len);
  const s = await stat(r.i); console.log("  ", JSON.stringify(s), "short", r.short);
  ok(s.opened === o0 + 1 && s.sn < 0.02, "E3 short last stretch opens");
});
await section("E4 reload after open", async () => {
  await ev(KIT);
  const before = await stat(A.i);
  await reload(); await ev(SETUP); await sleep(800); await ev(KIT);
  const s = await stat(A.i); console.log("  before", JSON.stringify(before), "after", JSON.stringify(s));
  ok(s.opened === before.opened, "E4 opened count kept");
  ok(s.sn < 0.02, "E4 opened stretch still clear after reload (snow " + s.sn + ")");
});
await done(fails ? 1 : 0);
