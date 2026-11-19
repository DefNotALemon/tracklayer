// Beta: 4.1c1 plow truck cutting at speed on a DualSense (R2 throttle, L3 tap lifts/drops mid-run), then touch pill mid-run.
// Not covered by 0239/0241. Reports numbers; asserts only sanity (no NaN, blade state follows the taps, cut behind the blade).
import { boot, ev, sleep, done, padSet, padOff, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const PS = "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)";
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 90000; GS.lic = GS.lic || {}; GS.lic.freight = true; WX.at = () => 0; GS.storm = 0; GS.hour = 12; TLX.setOn("traffic", false); TLX.setOn("police", false); true`;
const FIELD = `(() => { if (!window.__F) { const fb0 = freshBase; window.__F = []; freshBase = (ix, iz) => { const F = window.__F, x = ix * CELL - HALF, z = iz * CELL - HALF; for (let i = F.length - 1; i >= 0; i--) { const q = F[i]; if (x >= q[0] && x <= q[1] && z >= q[2] && z <= q[3]) return q[4]; } return fb0(ix, iz); }; }
  window.__field = (x0, x1, z0, z1, dep) => { window.__F.push([x0 - 0.01, x1 + 0.01, z0 - 0.01, z1 + 0.01, dep]); for (let iz = Math.ceil((z0 + HALF) / CELL); iz <= Math.floor((z1 + HALF) / CELL); iz++) for (let ix = Math.ceil((x0 + HALF) / CELL); ix <= Math.floor((x1 + HALF) / CELL); ix++) {
    const c = getChunk(ix >> 5, iz >> 5), k = (iz & 31) * CH + (ix & 31), d0 = c.d[k]; c.f[k] = dep; c.d[k] = dep; if (c.g) c.g[k] = 0; writeCell(ix, iz, d0, dep, dep); } return true; }; return true; })()`;
await boot(); await ev(SETUP); await sleep(600);
await ev(`TLXV.buy("plowtruck"); true`); await sleep(600);
const u = await ev(`TLXV.state().owned[0].uid`); const U = JSON.stringify(u);
await ev(`TLXV.swapTo(${U}); FOOT.on = false; true`); await sleep(700);
const sp = await J(`(() => { for (let r = 150; r < 3000; r += 37) for (let a = 0; a < 6.28; a += 0.21) { const x = depot.x + Math.cos(a) * r, z = depot.z + Math.sin(a) * r; let bad = false;
  for (let k = -10; k <= 200 && !bad; k += 10) for (const sx of [-8, 0, 8]) if (isSea(x + sx, z + k) || isWater(x + sx, z + k) || obNear(x + sx, z + k, 8) || slopeAt(x + sx, z + k, 8) > 0.03 || yardAt(x + sx, z + k) > 0.02) { bad = true; break; }
  if (!bad) return { x, z }; } return null; })()`);
ok(!!sp, "flat strip " + JSON.stringify(sp)); if (!sp) await done(1);
await ev(FIELD); await ev(`__F.length = 0; __field(${sp.x - 10}, ${sp.x + 10}, ${sp.z - 9}, ${sp.z + 200}, 0.3); true`);
await ev(`(() => { const B = TLXPL.rt(${U}); B.down = false; BOG.on = false; crashCancel(); FOOT.on = false; P.x = ${sp.x}; P.z = ${sp.z}; P.yaw = 0; P.y = surf(P.x, P.z); P.vx = P.vz = 0; recenter(P.x, P.z, true); return true; })()`);
const S = () => J(`({ down: TLXPL.rt(${U}).down, v: Math.hypot(P.vx, P.vz), z: P.z - ${sp.z}, x: P.x - ${sp.x}, bog: BOG.on, crash: !!CRASH.on, nan: !isFinite(P.x + P.z + P.y), gb: GB.gear, hint: (TLXPL.hint() || "").slice(0, 120) })`);
const L3 = async ms => { await padSet({ 10: 1 }, [0, 0, 0, 0], PS); await sleep(ms); await padSet({}, [0, 0, 0, 0], PS); };
await padSet({ 7: 0.01 }, [0, 0, 0, 0], PS); await sleep(800);
// drop the blade with L3 tap, then R2 throttle
await L3(150); await sleep(1200);
let s = await S(); console.log("  after L3", JSON.stringify(s)); ok(s.down === true, "L3 tap drops the blade");
let vmax = 0, bogSeen = false, stall = 0;
for (let i = 0; i < 90; i++) {
  await padSet({ 7: 1 }, [0, 0, 0, 0], PS); await sleep(0); s = await S(); vmax = Math.max(vmax, s.v); bogSeen = bogSeen || s.bog;
  if (i % 15 === 0) console.log("  t", i, JSON.stringify({ v: +s.v.toFixed(2), z: +s.z.toFixed(1), x: +s.x.toFixed(2), bog: s.bog }));
  if (s.z > 120) break; await sleep(150);
}
s = await S(); console.log("  end run", JSON.stringify(s), "vmax", vmax.toFixed(2), "bogged", bogSeen);
ok(!s.nan && !s.crash, "no NaN / crash"); ok(s.z > 30, "made headway through 30 cm with R2: " + s.z.toFixed(1) + " m");
// cut behind the blade
const cut = await J(`(() => { const out = []; for (const dz of [10, 20, 30]) { const z = ${sp.z} + dz; const row = []; for (let dx = -3; dx <= 3; dx += 1) row.push(+depthAt(Math.floor((${sp.x} + dx + HALF) / CELL), Math.floor((z + HALF) / CELL)).toFixed(2)); out.push(row); } return out; })()`);
console.log("  depth rows (x -3..3) at z+10,20,30:", JSON.stringify(cut));
ok(cut.every(r => r[3] < 0.15), "centre of the cut is cleared below 15 cm at 10/20/30 m");
await shot("plowtruck_pad_cut");
// L3 tap while moving at speed: lifts
await padSet({ 7: 1 }, [0, 0, 0, 0], PS); await L3(150); await sleep(500);
s = await S(); console.log("  mid-run L3", JSON.stringify(s)); ok(s.down === false, "L3 tap at speed lifts the blade");
// long hold of L3 at speed (slew) must not toggle drop
await L3(150); await sleep(400); const sd = await S();
await padSet({ 7: 1, 10: 1 }, [0, 0, 0, 0], PS); await sleep(1300); await padSet({ 7: 1 }, [0, 0, 0, 0], PS); await sleep(300);
const s2 = await S(); console.log("  after hold-slew at speed", JSON.stringify({ before: sd.down, after: s2.down, v: +s2.v.toFixed(1) }));
ok(sd.down === true && s2.down === true, "hold at speed slews and leaves the blade down");
await padSet({ 6: 1 }, [0, 0, 0, 0], PS); await sleep(2500); await padOff(); s = await S();
ok(s.v < 1.5, "brake stops it: " + s.v.toFixed(2));
await done(fails ? 1 : 0);
