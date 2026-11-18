// Beta (0226): keyboard-drive the stretch (not a puppet) with the blade down; does the credit count from the first metre? Exit 1 if fewer than 80% of lengths on the driven side are marked after one drive.
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
  window.__pup = (id, sA, sB, off) => { const dir = sB >= sA ? 1 : -1; let s = sA; window.__pupOn = true; __put(id, sA, dir, off);
    const step = () => { s += dir * 1; if ((s - sB) * dir >= 0) { P.vx = P.vz = 0; window.__pupOn = false; return; } const q = __lane(id, s, dir, off); P.x = q.x; P.z = q.z; P.yaw = q.yaw; P.y = surf(q.x, q.z); P.vx = Math.sin(q.yaw) * 6; P.vz = Math.cos(q.yaw) * 6; P.vy = 0; BOG.on = false; BOG.acc = 0; requestAnimationFrame(step); };
    requestAnimationFrame(step); return true; };
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
const bins = () => J(`(() => { const c = TLXPL.road.get(${aid} + ":" + ${A.i}); return c ? { c: c.c, m: c.m.map(a => Array.from(a).join("")) } : null; })()`);
await ev(`TLXR.setSnow(${aid}, ${+(process.env.SNOW || 0.35)}, ${A.i}); true`); await ev("TLXPL.road.clear(); true");
const s0 = A.i * SEG + 6, s1 = (A.i + 1) * SEG - 6;
await ev(`__put(${aid}, ${s0}, 1, 1.5); true`); await blade(true); await sleep(500);
let t0 = await clock(), key = null, last = null, trail = [];
console.log("  why", JSON.stringify(await J(`({ why: TLXV.rt().why, fuel: GS.fuel, gear: GB.gear, foot: FOOT.on, cur: TLXV.state().cur, camMode: typeof camMode !== "undefined" ? camMode : null, gnd: P.gnd })`)));
await down("KeyW"); await sleep(1500); console.log("  after 1.5 s", JSON.stringify(await J(`({ v: Math.hypot(P.vx, P.vz), why: TLXV.rt().why, thr: input.thr })`)));
for (let k = 0; k < 900; k++) {
  const s = await J(`__steer(${aid}, 1, 1.5, 8)`);
  if (s.s > s1) break;
  const want = s.e > 0.05 ? "KeyA" : s.e < -0.05 ? "KeyD" : null;   // +x is left, positive error = target to the left
  if (want !== key) { if (key) await up(key); if (want) await down(want); key = want; }
  if (k % 25 === 0) trail.push(Math.round(s.s) + ":" + s.v.toFixed(1) + (s.bog ? "B" : ""));
  await sleep(80);
}
if (key) await up(key); await up("KeyW"); await blade(false);
console.log("  trail", trail.join(" "));
const b = await bins(); console.log("  bins", JSON.stringify(b));
ok(b && Math.max(b.c[0], b.c[1]) >= 32, "one keyboard drive up the stretch marks >=80% of one side (got " + (b && b.c) + ")");
await done(fails ? 1 : 0);
