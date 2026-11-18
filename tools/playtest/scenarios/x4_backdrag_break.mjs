// Beta (0224): try to break 4.1b1 back-drag. Facts printed; exit 1 on a FAIL.
import { boot, ev, raw, send, tap, sleep, done, down, up, reload, padSet, padOff, shot, sideCam, camOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(120); }
const ONLY = process.env.ONLY;
const section = async (n, f) => { if (ONLY && !ONLY.includes(n[0])) return; console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const PS = "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)";
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80); return true; })()`);
const kit = () => ev(`(() => {
  if (!window.__F) { const fb0 = freshBase; window.__F = []; freshBase = (ix, iz) => { const F = window.__F, x = ix * CELL - HALF, z = iz * CELL - HALF; for (let i = F.length - 1; i >= 0; i--) { const q = F[i]; if (x >= q[0] && x <= q[1] && z >= q[2] && z <= q[3]) return q[4]; } return fb0(ix, iz); }; }
  if (!window.__hornW) { const h0 = horn; window.__horn = 0; horn = function () { window.__horn++; return h0.apply(this, arguments); }; window.__hornW = true; }
  window.__field = (x0, x1, z0, z1, dep) => { window.__F.push([x0 - 0.01, x1 + 0.01, z0 - 0.01, z1 + 0.01, dep]); for (let iz = Math.ceil((z0 + HALF) / CELL); iz <= Math.floor((z1 + HALF) / CELL); iz++) for (let ix = Math.ceil((x0 + HALF) / CELL); ix <= Math.floor((x1 + HALF) / CELL); ix++) {
    const c = getChunk(ix >> 5, iz >> 5), k = (iz & 31) * CH + (ix & 31), d0 = c.d[k]; c.f[k] = dep; c.d[k] = dep; if (c.g) c.g[k] = 0; writeCell(ix, iz, d0, dep, dep); } return true; };
  window.__put = (x, z) => { BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; P.x = x; P.z = z; P.yaw = 0; P.vx = P.vy = P.vz = 0; P.y = surf(x, z); recenter(x, z, true); camState.init = false; window.__t0 = [x, z, gameClock]; const B = TLXPL.rt(TLXV.state().cur); B.last = null; B.carry = 0; B.volCut = 0; B.volLaid = 0; B.full = false; B.back = false; B.hold = null; return true; };
  window.__cell = (x, z) => { const ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL), d = depthAt(ix, iz), f = freshAt(ix, iz); return { d, f }; };
  window.__thr = th => { const u = TLXV.state().cur, B = TLXPL.rt(u), d = TLXPL.bladeOf(u); TLX.state("plow").blades[u].throw = th; B.a = d.ang * TLXPL.THROWS[th].sign; return true; };
  return true; })()`);
const U = () => J(`(() => { const u = TLXV.state().cur, b = TLXPL.rt(u); return { down: b.down, th: TLXPL.throwOf(u), a: +b.a.toFixed(2), ry: b.S ? +b.S.rotation.y.toFixed(2) : null, horn: window.__horn, hint: TLXPL.hint(), dev: INP.dev, pill: $("tcE").hidden ? null : $("tcE").textContent, held: !!b.hold }; })()`);
const moved = () => J(`(() => { const B = TLXPL.rt(TLXV.state().cur); return { mv: +(P.z - __t0[1]).toFixed(1), dx: +(P.x - __t0[0]).toFixed(2), v: +Math.hypot(P.vx, P.vz).toFixed(2), bog: BOG.on, drag: Math.round(B.drag), carry: +B.carry.toFixed(2), cut: +B.volCut.toFixed(2), laid: +B.volLaid.toFixed(2), back: !!B.back, full: !!B.full, z: P.z }; })()`);

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 9000; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`); await sleep(600);
await ev(`TLXV.buy("pickup"); true`); await sleep(300);
const uid = await ev(`TLXV.state().owned[0].uid`), QU = JSON.stringify(uid);
await ev(`TLXPL.fit(${QU}, "b23"); true`);
const spot = await J(`(() => { for (let r = 150; r < 3600; r += 41) for (let a = 0; a < 6.28; a += 0.19) { const x = depot.x + Math.cos(a) * r, z = depot.z + Math.sin(a) * r; let bad = false;
  for (let k = -10; k <= 70 && !bad; k += 10) for (const sx of [-6, 0, 6]) if (isSea(x + sx, z + k) || isWater(x + sx, z + k) || obNear(x + sx, z + k, 7) || slopeAt(x + sx, z + k, 8) > 0.03 || yardAt(x + sx, z + k) > 0.02 || bioAt(x + sx, z + k) === 1) { bad = true; break; }
  if (!bad && Math.abs(groundAt(x, z) - groundAt(x, z + 60)) < 1.0 && (!window.TLXR || TLXR.near(x, z + 30).d > 70)) return { x, z }; } return null; })()`);
ok(!!spot, "a flat open strip for the fields: " + JSON.stringify(spot));
if (!spot) await done(1);
const X = spot.x, Z = spot.z;
await ev(`TLXV.swapTo(${QU}); FOOT.on = false; true`); await sleep(600); await kit();
ok(await ev(`!!VEH.cur && !FOOT.on && typeof TLXPL.slew === "function"`), "seated in the bladed pickup");
// the lane: `depth` of snow, a cleared pad under the truck reaching `padTo` m ahead of its middle
const lane = (depth, padTo = 5) => ev(`__F.length = 0; __field(${X - 7}, ${X + 7}, ${Z - 10}, ${Z + 70}, ${depth}); __field(${X - 7}, ${X + 7}, ${Z - 10}, ${Z + padTo}, 0.06); __put(${X}, ${Z}); true`);
const cross = (z, lo, hi, sign) => J(`(() => { const o = []; for (let x = ${lo}; x <= ${hi} + 0.001; x += 0.25) o.push(__cell(${X} + ${sign} * x, ${z})); return o; })()`);
const over = a => a.map(c => +(c.d - c.f).toFixed(2));
const rev = async (m, maxn = 300) => { await ev(`window.__t0 = [P.x, P.z, gameClock]; true`); await down("KeyS"); let r = await moved(), n = 0, peak = 0; while (r.mv > -m && n++ < maxn) { await sleep(60); r = await moved(); peak = Math.max(peak, r.carry); } await up("KeyS"); r.peak = peak; return r; };
const fin = async (r) => { for (const k of ["z", "dx", "v", "carry", "cut", "laid", "drag"]) if (!Number.isFinite(r[k])) return false; return true; };
await section("A long reverse 22 m in 30 cm", async () => {
  await lane(0.3, 2); await ev(`__thr("r"); TLXPL.rt(${QU}).down = true; true`); await waitGame(0.9);
  const r = await rev(22); console.log("  long reverse", JSON.stringify(r));
  ok(r.peak <= 1.25, "carry never above the 1.2 m3 cap (peak " + r.peak + ")");
  ok(await fin(r), "all numbers finite");
  await waitGame(3.5); const s = await moved(); console.log("  stopped", JSON.stringify(s));
  ok(s.carry === 0 && s.laid > 0.5, `stopped: spilled, ${s.laid} m3 laid of ${s.cut} cut`);
  ok(s.laid >= 0.8 * s.cut, `conservation: laid ${s.laid} vs cut ${s.cut} (heap not eaten by the cap)`);
});
await section("B reverse over bare ground", async () => {
  await ev(`__F.length = 0; __field(${X - 7}, ${X + 7}, ${Z - 10}, ${Z + 70}, 0.06); __put(${X}, ${Z + 20}); TLXPL.rt(${QU}).down = true; true`); await waitGame(0.9);
  const r = await rev(6); const h = await ev(`TLXPL.hint()`); console.log("  bare", JSON.stringify(r), "|", h);
  ok(r.carry < 0.05, "nothing pulled over bare ground (" + r.carry + ")"); ok(/nothing to pull|BLADE DOWN/.test(h), "hint sane: " + h); ok(await fin(r), "finite");
});
await section("C dismount with a bladeful", async () => {
  await lane(0.3, 2); await ev(`__thr("r"); TLXPL.rt(${QU}).down = true; true`); await waitGame(0.9);
  await ev(`window.__t0 = [P.x, P.z, gameClock]; true`); await down("KeyS"); await sleep(1500); await tap("KeyQ"); await up("KeyS"); await sleep(300);
  let s = await moved(); console.log("  at Q", JSON.stringify(s)); await waitGame(4); s = await moved(); const o = await J(`({ foot: FOOT.on, back: TLXPL.rt(${QU}).back, carry: TLXPL.rt(${QU}).carry })`);
  console.log("  after", JSON.stringify(o)); ok(o.carry === 0, "carry spilled after dismount (" + o.carry + ")"); ok(await fin(s), "finite");
  await ev(`FOOT.on = false; TLXV.swapTo(${QU}); true`); await sleep(800);
});
await section("D slew mid back-drag", async () => {
  await lane(0.3, 2); await ev(`__thr("r"); TLXPL.rt(${QU}).down = true; true`); await waitGame(0.9);
  await ev(`window.__t0 = [P.x, P.z, gameClock]; true`); await down("KeyS"); await sleep(1200); const a = await moved();
  await down("KeyE"); await sleep(1000); const b = await moved(); const th = await ev(`TLXPL.throwOf(${QU})`); await up("KeyE"); await sleep(800); const c = await moved(); await up("KeyS");
  console.log("  carry before/during/after hold", a.carry, b.carry, c.carry, "throw", th, "back", a.back, c.back);
  ok([a, b, c].every(x => Number.isFinite(x.carry) && Number.isFinite(x.z)), "finite through slew"); ok(c.carry <= 1.25, "carry bounded");
});
await section("E reverse in 1 m drift: blade down vs up", async () => {
  for (const dn of [true, false]) {
    await lane(1.0, 2); await ev(`__thr("r"); TLXPL.rt(${QU}).down = ${dn}; true`); await waitGame(0.9);
    const r = await rev(4, 120); const h = await ev(`TLXPL.hint()`); const w = await ev(`TLXPL.rt(${QU}).why`);
    console.log("  blade", dn ? "down" : "up", JSON.stringify(r), "| hint:", h, "| why:", JSON.stringify(w), "| toasts", JSON.stringify(await toasts()));
    ok(await fin(r), "finite");
    if (dn) ok(r.mv < -1 || !!w, "blade down in 1 m drift: it backs out or says why (moved " + r.mv + ", why " + JSON.stringify(w) + ")");
    else ok(r.mv < -1, "blade UP backs out of 1 m (moved " + r.mv + ")");
  }
});
await section("F reload mid back-drag", async () => {
  await lane(0.3, 2); await ev(`__thr("l"); TLXPL.rt(${QU}).down = true; true`); await waitGame(0.9);
  await down("KeyS"); await sleep(1500); await ev(`save(); true`); await reload(); await up("KeyS"); await ev(`WX.at = () => 0; GS.storm = 0; true`); await sleep(600);
  const o = await J(`(() => { const b = TLXPL.rt(TLXV.state().cur); return { carry: b.carry, back: !!b.back, down: b.down, drag: b.drag }; })()`);
  console.log("  reloaded", JSON.stringify(o)); ok(o.carry === 0 && !o.back && o.drag === 0, "clean state after reload");
});
await done(fails ? 1 : 0);
