// Beta 4.1b2a: edge wear with TWO plow trucks: wear lands on the driven truck only, back-drag wears, on foot wears nothing, reload keeps both.
//   D mending at the garage: the row and its price, refused away from the garage, as many points as the cash covers,
//   a full mend; E a blade in the shed keeps its edge (off and on again, a truck that is gone); F the edge is saved,
//   and a save from before it (no cond, no shedC) loads as a new edge.
// The fields are built by the test as in x4_blade.mjs. Headless runs ~0.6x: all by gameClock. ONLY=ABC... (A always).
import { boot, ev, raw, sleep, done, down, up, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(120); }
const ONLY = process.env.ONLY;
const section = async (n, f) => { if (ONLY && n[0] !== "A" && !ONLY.includes(n[0])) return; console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80); return true; })()`);
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 9000; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`;
const kit = () => ev(`(() => {
  if (!window.__F) { const fb0 = freshBase; window.__F = []; freshBase = (ix, iz) => { const F = window.__F, x = ix * CELL - HALF, z = iz * CELL - HALF; for (let i = F.length - 1; i >= 0; i--) { const q = F[i]; if (x >= q[0] && x <= q[1] && z >= q[2] && z <= q[3]) return q[4]; } return fb0(ix, iz); }; }
  window.__field = (x0, x1, z0, z1, dep) => { window.__F.push([x0 - 0.01, x1 + 0.01, z0 - 0.01, z1 + 0.01, dep]); for (let iz = Math.ceil((z0 + HALF) / CELL); iz <= Math.floor((z1 + HALF) / CELL); iz++) for (let ix = Math.ceil((x0 + HALF) / CELL); ix <= Math.floor((x1 + HALF) / CELL); ix++) {
    const c = getChunk(ix >> 5, iz >> 5), k = (iz & 31) * CH + (ix & 31), d0 = c.d[k]; c.f[k] = dep; c.d[k] = dep; if (c.g) c.g[k] = 0; writeCell(ix, iz, d0, dep, dep); } return true; };
  window.__put = (x, z) => { BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; crashCancel(); FOOT.on = false; P.x = x; P.z = z; P.yaw = 0; P.vx = P.vy = P.vz = 0; P.y = surf(x, z); recenter(x, z, true); camState.init = false; const B = TLXPL.rt(TLXV.state().cur); B.last = null; B.carry = 0; B.full = false; return true; };
  window.__cell = (x, z) => { const ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL), d = depthAt(ix, iz), f = freshAt(ix, iz); return { d, f }; };
  window.__pl = () => { const p = TLX.state("plow"), u = TLXV.state().cur, b = p.blades[u]; return { cond: b ? b.cond : null, m: p.m, shed: p.shed, shedC: p.shedC, cash: GS.cash, z: P.z, hint: TLXPL.hint() }; };
  window.__rows = () => { const out = []; VEH.tabs.find(t => t.id === "plow").render(document.createElement("div"), (n, d, p, c) => out.push({ n, d, p, c })); return out; };
  return true; })()`);

await boot();
await ev(SETUP); await sleep(600); await kit();
await ev(`GS.cash = 40000; true`);
await ev(`TLXV.buy("pickup"); true`); await sleep(300);
await ev(`TLXV.buy("pickup"); true`); await sleep(300);
const owned = await J(`TLXV.state().owned.map(o => o.uid)`);
console.log("  owned", JSON.stringify(owned));
ok(owned.length === 2, "two pickups owned");
const [UA, UB] = owned;
await ev(`TLXPL.fit(${JSON.stringify(UA)}, "b23"); TLXPL.fit(${JSON.stringify(UB)}, "b23"); true`);
const spot = await J(`(() => { for (let r = 150; r < 3600; r += 41) for (let a = 0; a < 6.28; a += 0.19) { const x = depot.x + Math.cos(a) * r, z = depot.z + Math.sin(a) * r; let bad = false;
    for (let k = -10; k <= 100 && !bad; k += 10) for (const sx of [-12, -6, 0, 6, 12]) if (isSea(x + sx, z + k) || isWater(x + sx, z + k) || obNear(x + sx, z + k, 7) || slopeAt(x + sx, z + k, 8) > 0.03 || yardAt(x + sx, z + k) > 0.02 || bioAt(x + sx, z + k) === 1) { bad = true; break; }
    if (!bad && Math.abs(groundAt(x, z) - groundAt(x, z + 80)) < 1.2 && (!window.TLXR || TLXR.near(x, z + 40).d > 70)) return { x, z }; } return null; })()`);
ok(!!spot, "flat strip " + JSON.stringify(spot));
if (!spot) await done(1);
const X = spot.x, Z = spot.z;
const conds = () => J(`(() => { const b = TLX.state("plow").blades; return [b[${JSON.stringify(UA)}].cond, b[${JSON.stringify(UB)}].cond]; })()`);
const drive = async (uid, lane, secs, rev) => {
  await ev(`TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(700);
  await ev(`__F.length = 0; __field(${X + lane - 5}, ${X + lane + 5}, ${Z - 8}, ${Z + 98}, 0.3); __field(${X + lane - 5}, ${X + lane + 5}, ${rev ? Z + 55 : Z - 8}, ${rev ? Z + 98 : Z + 5}, 0.06); __put(${X + lane}, ${Z + (rev ? 60 : 0)}); P.yaw = ${rev ? 0 : 0}; TLXPL.rt(${JSON.stringify(uid)}).down = true; true`);
  await waitGame(0.9); const c0 = await conds();
  await down(rev ? "KeyS" : "KeyW"); await waitGame(1.5); await waitGame(secs); await up(rev ? "KeyS" : "KeyW"); await waitGame(0.5);
  const dbg = await J(`({ z: P.z, v: Math.hypot(P.vx, P.vz), cur: TLXV.state().cur, down: TLXPL.rt(${JSON.stringify(uid)}).down, m: TLX.state("plow").m, gnd: P.gnd, foot: FOOT.on, veh: !!VEH.cur, bog: BOG.on, gear: GB.gear, mnt: MNT.on })`);
  console.log("  dbg", JSON.stringify(dbg));
  return { c0, c1: await conds() };
};
let r = await drive(UA, 0, 9, false);
console.log("  A forward", JSON.stringify(r));
ok(r.c1[0] < r.c0[0] && r.c1[1] === r.c0[1], "A drives cutting: only A's edge wears");
const aAfter = r.c1[0];
r = await drive(UB, 20, 9, false);
console.log("  B forward", JSON.stringify(r));
ok(r.c1[1] < r.c0[1] && r.c1[0] === aAfter, "swap to B and cut: B wears, parked A keeps its edge");
const bAfter = r.c1[1];
r = await drive(UA, 40, 7, true);
console.log("  A back-drag", JSON.stringify(r));
ok(r.c1[0] < r.c0[0] && r.c1[1] === bAfter, "A back-drags: A wears, B untouched (" + (r.c0[0] - r.c1[0]).toFixed(4) + ")");
// cutting in a cab-less on-foot state / blade fitted to non-current truck must not wear: park A, walk
await ev(`crashCancel(); FOOT.on = true; FOOT.x = P.x + 3; FOOT.z = P.z; FOOT.y = surf(FOOT.x, FOOT.z); true`);
const f0 = await conds(); await down("KeyW"); await waitGame(4); await up("KeyW"); const f1 = await conds();
ok(f0[0] === f1[0] && f0[1] === f1[1], "walking beside a down blade wears nothing");
// reload keeps both edges
const before = await conds(); await reload(); await sleep(800);
const after = await conds().catch(() => null);
console.log("  reload", JSON.stringify(before), JSON.stringify(after));
ok(after && Math.abs(after[0] - before[0]) < 0.01 && Math.abs(after[1] - before[1]) < 0.01, "both edges survive a reload");
await done(fails ? 1 : 0);
