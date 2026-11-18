// Beta break test for 4.1c1 the plow truck: reload with the blade down, truck swap with blade down, a rock hit at speed,
// old save with no plow state, no fifth wheel / no coupling, and the first-person cab view. Headless ~0.6x: all by gameClock.
import { reload, boot, ev, sleep, done, down, up } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(100); }
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 90000; GS.lic = GS.lic || {}; GS.lic.freight = true; WX.at = () => 0; GS.storm = 0; GS.hour = 12; TLX.setOn("traffic", false); TLX.setOn("police", false); true`;
const FIELD = `(() => { if (!window.__F) { const fb0 = freshBase; window.__F = []; freshBase = (ix, iz) => { const F = window.__F, x = ix * CELL - HALF, z = iz * CELL - HALF; for (let i = F.length - 1; i >= 0; i--) { const q = F[i]; if (x >= q[0] && x <= q[1] && z >= q[2] && z <= q[3]) return q[4]; } return fb0(ix, iz); }; }
  window.__field = (x0, x1, z0, z1, dep) => { window.__F.push([x0 - 0.01, x1 + 0.01, z0 - 0.01, z1 + 0.01, dep]); for (let iz = Math.ceil((z0 + HALF) / CELL); iz <= Math.floor((z1 + HALF) / CELL); iz++) for (let ix = Math.ceil((x0 + HALF) / CELL); ix <= Math.floor((x1 + HALF) / CELL); ix++) {
    const c = getChunk(ix >> 5, iz >> 5), k = (iz & 31) * CH + (ix & 31), d0 = c.d[k]; c.f[k] = dep; c.d[k] = dep; if (c.g) c.g[k] = 0; writeCell(ix, iz, d0, dep, dep); } return true; }; return true; })()`;
const seat = async u => { await ev(`TLXV.swapTo(${JSON.stringify(u)}); FOOT.on = false; true`); await sleep(700); };
const step = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };

await boot(); await ev(SETUP); await sleep(600);
await ev(`TLXV.buy("plowtruck"); TLXV.buy("pickup"); true`); await sleep(600);
const [u, pk] = await J(`TLXV.state().owned.map(r => r.uid)`);
const U = JSON.stringify(u), PK = JSON.stringify(pk);

await step("1 swap away with the blade down", async () => {
  await seat(u); await ev(`TLXPL.rt(${U}).down = true; true`); await waitGame(0.5);
  await seat(pk);
  const a = await J(`({ down: TLXPL.rt(${U}).down, drag: TLXPL.rt(${U}).drag, pkDrag: TLXPL.rt(${PK}).drag, vis: !!TLXPL.rt(${U}).grp && TLXPL.rt(${U}).grp.visible !== false })`);
  console.log("  ", JSON.stringify(a));
  ok(a.pkDrag === 0, "the pickup (no blade) feels no blade drag from the parked truck's blade");
  await seat(u);
  ok(await ev(`TLXV.state().cur === ${U}`), "back in the truck");
});

const rockTest = async (name, U, who) => { await seat(JSON.parse(U)); await step(name, async () => {
  const sp = await J(`(() => { for (let r = 150; r < 3000; r += 37) for (let a = 0; a < 6.28; a += 0.21) { const x = depot.x + Math.cos(a) * r, z = depot.z + Math.sin(a) * r; let bad = false;
    for (let k = -10; k <= 90 && !bad; k += 10) for (const sx of [-6, 0, 6]) if (isSea(x + sx, z + k) || isWater(x + sx, z + k) || obNear(x + sx, z + k, 8) || slopeAt(x + sx, z + k, 8) > 0.03 || yardAt(x + sx, z + k) > 0.02) { bad = true; break; }
    if (!bad) return { x, z }; } return null; })()`);
  ok(!!sp, "a flat strip " + JSON.stringify(sp)); if (!sp) return;
  await ev(FIELD); await ev(`__F.length = 0; __field(${sp.x - 8}, ${sp.x + 8}, ${sp.z - 9}, ${sp.z + 60}, 0.06); true`);
  await ev(`(() => { const B = TLXPL.rt(${U}); B.down = true; B.trip = 0; BOG.on = false; crashCancel(); FOOT.on = false; P.x = ${sp.x}; P.z = ${sp.z}; P.yaw = 0; P.y = surf(P.x, P.z); P.vx = 0; P.vz = 8; recenter(P.x, P.z, true);
    const o = { x: ${sp.x}, z: ${sp.z + 25}, r: 0.7, top: surf(${sp.x}, ${sp.z + 25}) + 0.8, rock: true }; addOb(o); window.__o = o; return true; })()`);
  const c0 = await ev(`TLX.state("plow").blades[${U}].cond`);
  await down("KeyW"); let tripped = 0, vmin = 99;
  for (let i = 0; i < 80; i++) { const s = await J(`({ t: TLXPL.rt(${U}).trip || 0, v: Math.hypot(P.vx, P.vz), z: P.z - ${sp.z} })`); tripped = Math.max(tripped, s.t); if (s.z > 24) vmin = Math.min(vmin, s.v); if (s.z > 40) break; await sleep(100); }
  await up("KeyW");
  const s = await J(`({ cond: TLX.state("plow").blades[${U}].cond, z: P.z - ${sp.z}, v: Math.hypot(P.vx, P.vz), crash: !!CRASH.on, bog: BOG.on, nan: !isFinite(P.x + P.z + P.y) })`);
  console.log("  ", JSON.stringify({ c0, tripped, vmin, ...s }));
  ok(!s.nan && !s.crash, "no NaN, no crash");
  ok(s.z > 27 && s.v > 1, who + " went over the rock (" + s.z.toFixed(1) + " m on, final " + s.v.toFixed(2) + " m/s, rock at 25)");
  ok(tripped > 0 && s.cond < c0, "the blade tripped and lost edge: " + c0 + " -> " + s.cond.toFixed(1));
  await ev(`dropOb(window.__o); true`);
}); };
await ev(`TLXPL.fit(${PK}, "b23"); true`); await sleep(300);
await rockTest("2a rock, pickup with Fjellskjær", PK, "the pickup");
await rockTest("2b rock, plow truck", U, "the plow truck");
await step("3 reload with blade down", async () => {
  await ev(`TLXPL.rt(${U}).down = true; save(); true`); await reload(); await ev(SETUP); await sleep(800);
  const a = await J(`(() => { const o = TLXV.state().owned.map(r => r.uid), p = TLX.state("plow"); return { o, blades: p.blades, shed: p.shed.length }; })()`);
  console.log("  ", JSON.stringify(a));
  ok(a.o.length === 2 && a.blades[u] && a.blades[u].id === "b35" && a.shed === 0, "both trucks and the factory blade survive a reload, nothing in the shed");
  await seat(u);
  const m = await J(`(() => { const B = TLXPL.rt(${U}), R = TLXV.runtimeOf(${U}); return { model: !!(B.grp && R && B.grp.parent === R.grp), down: B.down, hint: TLXPL.hint() }; })()`);
  console.log("  ", JSON.stringify(m));
  ok(m.model, "its blade model is on the truck after the reload");
});

await step("4 old save: no plow state at all", async () => {
  await ev(`(() => { const s = TLX.state("plow"); for (const k of Object.keys(s)) delete s[k]; return true; })()`);
  await ev(`save(); true`); await reload(); await ev(SETUP); await sleep(1000);
  const a = await J(`(() => { const p = TLX.state("plow"); return { keys: Object.keys(p.blades || {}), shed: (p.shed || []).length, owned: TLXV.state().owned.length }; })()`);
  console.log("  ", JSON.stringify(a));
  ok(a.owned === 2 && a.keys.includes(u), "plow state wiped: the truck's blade is handed back");
  await seat(u); await ev(`TLXPL.rt(${U}).down = true; true`); await waitGame(0.5);
  ok(await ev(`typeof TLXPL.hint() === "string"`), "hint still works");
});

await step("5 no coupling and no fifth wheel", async () => {
  const f = await J(`(() => { const h = TLXV.pose(${U}); return { five: h && h.def.fifthZ, id: h && h.def.id }; })()`);
  console.log("  ", JSON.stringify(f));
  ok(f.five == null, "the plow truck has no fifth wheel");
});

await step("6 first-person cab", async () => {
  const r = await J(`(() => { try { camMode = 0; camState.init = false; return { ok: true, mode: camMode }; } catch (e) { return { err: String(e) }; } })()`);
  await sleep(1200);
  const s = await J(`({ q: camera.quaternion.toArray().every(isFinite), p: camera.position.toArray().every(isFinite) })`);
  ok(s.q && s.p, "camera finite in cab view " + JSON.stringify(r));
});

await done(fails ? 1 : 0);
