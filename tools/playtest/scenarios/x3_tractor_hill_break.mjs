// 3.5b1 beta break 3: the 7 t tractor on the steepest road stretch (uphill pull, downhill brake), repair cost by kind.
import { boot, ev, sleep, done, down, up } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot(); await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.hour = 12; WX.at = () => 0; GS.storm = 0; TLX.setOn && TLX.setOn("traffic", false); GS.cash = 60000; GS.lic.freight = true; true`);
await ev(`TLXV.buy("tractor"); TLXV.buy("pickup"); true`); await sleep(600);
const uids = await J(`TLX.state("vehicles").owned.map(r => ({ uid: r.uid, id: r.id }))`);
const run = async id => {
  await ev(`TLXV.swapTo("${uids.find(u => u.id === id).uid}"); true`); await sleep(900);
  // steepest 40 m stretch of any route
  const sp = await J(`(() => { let best = null; for (const r of TLXR.routes) { const p = r.pts; for (let i = 0; i + 4 < p.length; i += 2) { const a = p[i], b = p[i + 4]; const d = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d < 25 || d > 90) continue; const g = (surf(b[0], b[1]) - surf(a[0], a[1])) / d; if (!best || Math.abs(g) > Math.abs(best.g)) best = { g, ax: a[0], az: a[1], bx: b[0], bz: b[1], d }; } } return best; })()`);
  if (!sp) { console.log("no route stretch"); return null; }
  // start at lower end facing up
  const up_ = sp.g > 0, sx = up_ ? sp.ax : sp.bx, sz = up_ ? sp.az : sp.bz, ex = up_ ? sp.bx : sp.ax, ez = up_ ? sp.bz : sp.az;
  await ev(`(() => { P.x = ${sx}; P.z = ${sz}; P.yaw = Math.atan2(${ex - sx}, ${ez - sz}); P.y = surf(P.x, P.z); P.vx = P.vz = 0; GS.fuel = 200; recenter(P.x, P.z, true); return 1; })()`);
  await sleep(1500);
  const h0 = await J(`({ y: surf(P.x, P.z), x: P.x, z: P.z })`);
  await down("KeyW"); await sleep(10000); await up("KeyW");
  const h1 = await J(`({ y: surf(P.x, P.z), x: P.x, z: P.z, v: Math.hypot(P.vx, P.vz), bog: BOG.on })`);
  const moved = Math.hypot(h1.x - h0.x, h1.z - h0.z);
  console.log(id, "grade", (Math.abs(sp.g) * 100).toFixed(1) + "%", "moved", moved.toFixed(1), "m, climbed", (h1.y - h0.y).toFixed(1), "v", h1.v.toFixed(1), "bog", h1.bog);
  return { g: Math.abs(sp.g), moved, h1 };
};
const rt = await run("tractor"); const rp = await run("pickup");
if (rt && rp) ok(rt.moved > 8, `tractor makes progress on a ${(rt.g * 100).toFixed(0)}% road (${rt.moved.toFixed(0)} m in 10 s; pickup ${rp.moved.toFixed(0)} m)`);
const rc = await J(`(() => { const o = {}; for (const r of TLX.state("vehicles").owned) { r.cond = 40; o[r.id] = TLXV.repairCost("truck", r); } return o; })()`).catch(e => ({ err: String(e).slice(0, 160) }));
console.log("repair cost at 40%", JSON.stringify(rc));
ok(rc.tractor > 0 && rc.tractor < 11500, "tractor repair cost sane: " + rc.tractor);
await done(fails);
