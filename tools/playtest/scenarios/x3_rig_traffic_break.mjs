// Beta: 3.5b2a rig vs 3.4a traffic. Does a road car see a coupled semitrailer (traffic only tracks points: you, walker, parked)?
//  A. tractor+trailer coupled, stopped in a traffic lane facing along the route; car approaches from behind the trailer at 12.5 m/s.
//     Measures closest distance from the car to the trailer's body segment (rear x,z -> kingpin) and the car's stop reason.
//  B. same, but the trailer stood on its legs in the lane after uncoupling and the tractor driven off.
import { boot, ev, tap, sleep, done, down, up, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(100); }
const tr = id => J(`TLXRIG.list().find(t => t.id === "${id}")`);
const spd = () => J(`({ vf: +(P.vx * Math.sin(P.yaw) + P.vz * Math.cos(P.yaw)).toFixed(2) })`);
const place = (id, ahead, yawOff = 0) => ev(`(() => { const t = TLXRIG.list().find(t => t.id === "${id}"), yaw = t.yaw + ${yawOff}, fz = VEH.cur ? (TLXV.rt().def.fifthZ ?? -1.6) : -1.6;
  const fx = t.kx + Math.sin(t.yaw) * ${ahead}, fzz = t.kz + Math.cos(t.yaw) * ${ahead};
  P.x = fx - Math.sin(yaw) * fz; P.z = fzz - Math.cos(yaw) * fz; P.yaw = yaw; P.vx = P.vz = P.vy = 0; P.y = surf(P.x, P.z); BOG.on = false; BOG.acc = 0; FOOT.on = false; FOOT.g.visible = false; recenter(P.x, P.z, true); return true; })()`);
async function backUnder(id, secs = 25) { const t0 = await clock(); while ((await clock()) - t0 < secs) { if ((await tr(id)).on) return true; const v = (await spd()).vf; if (v > -1.0) { await down("KeyS"); await sleep(120); await up("KeyS"); } await sleep(120); } return false; }
const toasts = () => ev(`Array.from(document.querySelectorAll('#toasts > *')).map(e => e.textContent).join(' | ')`);

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.hour = 12; GS.storm = 0; WX.at = () => 0; GS.cash = 40000; GS.lic.freight = true; true`); await sleep(800);
await ev(`TLXV.buy("pickup"); TLXV.buy("tractor"); true`); await sleep(500);
const tk = (await J(`TLX.state("vehicles").owned`)).find(o => /tractor/.test(o.id || o.type || o.def));
await ev(`TLXV.swapTo(${JSON.stringify(tk.uid)}); true`); await sleep(1500);
await place("kj", 1.6, 0.02); await waitGame(0.6);
ok(await backUnder("kj", 25), "couples");
await sleep(400);
const rid = await J(`TLXT.routes.slice().sort((a, b) => b.len - a.len)[0].id`);
const r0 = await J(`TLXT.routes.find(q => q.id === "${rid}").s0 + 800`);
// put the rig on the lane: tractor yaw along the route, in the lane
await ev(`(() => { const p = TLXT.lanePt("${rid}", ${r0}, 1); P.x = p.x; P.z = p.z; P.yaw = p.yaw; P.vx = P.vz = 0; P.y = surf(P.x, P.z) + 0.2; recenter(P.x, P.z, true); return true; })()`);
await down("KeyW"); await waitGame(3); await up("KeyW");   // let the trailer follow straight
await down("KeyS"); await waitGame(3); await up("KeyS");
const t1 = await tr("kj"); console.log("rig", JSON.stringify({ on: t1.on, x: Math.round(t1.x), z: Math.round(t1.z), kx: Math.round(t1.kx), kz: Math.round(t1.kz), px: Math.round(await J("P.x")), pz: Math.round(await J("P.z")) }));
const body = () => J(`(() => { const t = TLXRIG.list().find(t => t.id === "kj"); return { x: t.x, z: t.z, kx: t.kx, kz: t.kz }; })()`);
const segD = (c, b) => { const dx = b.kx - b.x, dz = b.kz - b.z, L2 = dx * dx + dz * dz; let u = L2 ? ((c.x - b.x) * dx + (c.z - b.z) * dz) / L2 : 0; u = Math.max(0, Math.min(1, u)); return Math.hypot(c.x - (b.x + u * dx), c.z - (b.z + u * dz)); };

async function carRun(label) {
  const B = await body();
  // the car approaches along the lane from behind the trailer's rear: place it 110 m behind the rear on the same route
  const sRear = await J(`(() => { const r = TLXT.routes.find(q => q.id === "${rid}"); let best = ${r0}, bd = 1e9; for (let s = ${r0} - 60; s < ${r0} + 60; s += 0.5) { const p = TLXT.lanePt("${rid}", s, 1); const d = Math.hypot(p.x - ${B.x}, p.z - ${B.z}); if (d < bd) { bd = d; best = s; } } return best; })()`);
  const fwd = await J(`(() => { const a = TLXT.lanePt("${rid}", ${sRear}, 1), b = TLXT.lanePt("${rid}", ${sRear} + 5, 1); return Math.sign((b.x - a.x) * (${B.kx} - ${B.x}) + (b.z - a.z) * (${B.kz} - ${B.z})); })()`);
  console.log(label, "rear s", sRear, "route dir along trailer->kingpin", fwd);
  await ev(`(() => { const c = TLXT.place("${rid}", ${sRear} - ${fwd} * 110, ${fwd}); c.v = 12.5; return true; })()`);
  let min = 1e9, last = null; const t0 = await clock();
  while ((await clock()) - t0 < 22) { const s = await J(`(() => { const c = TLXT.cars[0]; return { x: c.x, z: c.z, v: c.v, why: c.why, pass: !!c.pass, lane: c.lane, px: P.x, pz: P.z }; })()`); const d = segD(s, B); if (d < min) { min = d; console.log('  min@', JSON.stringify(s), 'body', JSON.stringify(B)); } last = s; if (Math.round((await clock())*2)%4==0) console.log('  t', JSON.stringify({x:+s.x.toFixed(1),z:+s.z.toFixed(1),v:+s.v.toFixed(1),why:s.why,pass:s.pass,lane:s.lane&&+s.lane.toFixed(2)})); await sleep(100); }
  console.log(label, "closest to trailer body", min.toFixed(2), "m; final", JSON.stringify(last));
  return { min, last };
}
const A = await carRun("A coupled");
ok(A.min > 1.5, `A: car stays clear of the coupled trailer (closest ${A.min.toFixed(2)} m; a car is ~1.9 m wide)`);
await shot("x3rt_A");
console.log("page errors:", await ev("window.__errs ? window.__errs.length : 'n/a'"), "tick err", await ev("TLXT.tickErr || 'none'"), await ev("TLXRIG.err || 'none'"));
await done(fails);
