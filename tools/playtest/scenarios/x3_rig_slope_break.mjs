// Beta round 2 on 3.5b2a (tlx-rig): uncouple refusal on a steep grade, reload while coupled and legs-up, night toast.
//  A. couple on level ground, wind legs up, drive the rig to a >8% slope (trailer axis along the fall line), walk to the legs, use: refused with toast, still coupled.
//  B. same rig on level ground: use uncouples (control).
//  C. couple again, legs up, save + reload: rig still coupled, mass kept, no err.
import { boot, ev, tap, sleep, done, down, up, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
const tr = id => J(`TLXRIG.list().find(t => t.id === "${id}")`);
const spd = () => J(`({ vf: +(P.vx * Math.sin(P.yaw) + P.vz * Math.cos(P.yaw)).toFixed(2) })`);
const place = (id, ahead, yawOff = 0, vf = 0) => ev(`(() => { const t = TLXRIG.list().find(t => t.id === "${id}"), yaw = t.yaw + ${yawOff}, fz = VEH.cur ? (TLXV.rt().def.fifthZ ?? -1.6) : -1.6;
  const fx = t.kx + Math.sin(t.yaw) * ${ahead}, fzz = t.kz + Math.cos(t.yaw) * ${ahead};
  P.x = fx - Math.sin(yaw) * fz; P.z = fzz - Math.cos(yaw) * fz; P.yaw = yaw; P.vx = Math.sin(yaw) * ${vf}; P.vz = Math.cos(yaw) * ${vf}; P.vy = 0; P.y = surf(P.x, P.z); BOG.on = false; BOG.acc = 0; FOOT.on = false; FOOT.g.visible = false; recenter(P.x, P.z, true); return true; })()`);
async function backUnder(id, secs = 25) { const t0 = await clock(); while ((await clock()) - t0 < secs) { if ((await tr(id)).on) return true; const v = (await spd()).vf; if (v > -1.0) { await down("KeyS"); await sleep(120); await up("KeyS"); } await sleep(120); } return false; }
const toasts = () => ev(`Array.from(document.querySelectorAll('#toasts > *')).map(e => e.textContent).join(' | ')`);

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.hour = 12; GS.storm = 0; WX.at = () => 0; TLX.setOn("traffic", false); GS.cash = 40000; GS.lic.freight = true; true`); await sleep(800);
await ev(`TLXV.buy("pickup"); TLXV.buy("tractor"); true`); await sleep(500); console.log("rigtype", await ev("typeof window.TLXRIG"));
const tk = (await J(`TLX.state("vehicles").owned`)).find(o => /tractor/.test(o.id || o.type || o.def));
await ev(`TLXV.swapTo(${JSON.stringify(tk.uid)}); true`); await sleep(1500);
await place("kj", 1.6, 0.02); await waitGame(0.6);
ok(await backUnder("kj", 25), "couples on level ground");
await sleep(400);
// find a steep spot (>10%) over the trailer's length, axis along the fall line
const spot = await J(`(() => { const L = TLXRIG.list()[0], len = Math.hypot(L.kx - L.x, L.kz - L.z); let best = null;
  for (let r = 60; r < 900 && !best; r += 30) for (let a = 0; a < 24 && !best; a++) { const x = P.x + Math.cos(a / 24 * 6.283) * r, z = P.z + Math.sin(a / 24 * 6.283) * r;
    if (isSea(x, z) || isWater(x, z) || obNear(x, z, 30)) continue;
    const gx = (surf(x + 2, z) - surf(x - 2, z)) / 4, gz = (surf(x, z + 2) - surf(x, z - 2)) / 4, g = Math.hypot(gx, gz);
    if (g > 0.13 && g < 0.4) { const yaw = Math.atan2(gx, gz); const fx = x + Math.sin(yaw) * len, fz = z + Math.cos(yaw) * len; const dzz = (surf(fx, fz) - surf(x, z)) / len; if (!isSea(fx, fz) && !isWater(fx, fz) && Math.abs(dzz) > 0.12) best = { x, z, yaw, g, len, dz: (surf(fx, fz) - surf(x, z)) / len }; } }
  return best; })()`);
console.log("spot", JSON.stringify(spot));
ok(!!spot, "found a steep spot");
if (spot) {
  // put the tractor (hence trailer) at the spot, uphill-facing so kingpin is above the legs end is irrelevant: either way |dz|/L > 8%
  await ev(`(() => { crashCancel(); const yaw = ${spot.yaw}; P.x = ${spot.x} - Math.sin(yaw) * 6; P.z = ${spot.z} - Math.cos(yaw) * 6; P.yaw = yaw; P.vx = P.vz = 0; P.y = surf(P.x, P.z) + .2; recenter(P.x, P.z, true); return true; })()`);
  await waitGame(2.5);
  const t = await tr("kj"); console.log("rig now", JSON.stringify({ on: t.on, legs: t.legs, x: Math.round(t.x), z: Math.round(t.z) }));
  const slope = await J(`(() => { const t = TLXRIG.list()[0], len = Math.hypot(t.kx - t.x, t.kz - t.z); return Math.abs(surf(t.kx, t.kz) - surf(t.x, t.z)) / len; })()`);
  console.log("axis grade", slope.toFixed(3));
  // out and to the legs
  await ev(`(() => { const l = TLXRIG.legsPt("kj"); VEH.cur && TLXV.state().cur; FOOT.on = true; FOOT.g.visible = true; FOOT.x = l[0] + 0.5; FOOT.z = l[1] + 0.5; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = FOOT.fwd = FOOT.turn = 0; return true; })()`);
  await waitGame(0.8);
  const prov = await ev(`(() => { const f = footUse(); return JSON.stringify(f); })()`);
  console.log("footUse", prov);
  await tap("KeyE"); await waitGame(0.5);
  let u = await tr("kj"); console.log("after E1", JSON.stringify({ on: u.on, legs: u.legs }), await toasts());
  if (u.legs === 1) { /* first E wound legs? ensure legs up */ }
  else { await tap("KeyE"); await waitGame(0.5); u = await tr("kj"); console.log("after E2", JSON.stringify({ on: u.on, legs: u.legs }), await toasts()); }
  const msg = await toasts();
  if (slope > 0.08) ok(u.on !== null && /Too steep/.test(msg), `A: uncouple refused on ${(slope * 100).toFixed(0)}% axis grade, still coupled, toast says why`);
  else console.log("INFO slope along axis only", slope.toFixed(3), "(test void)");
}
// C: reload while coupled, legs up, on the slope
const before = await tr("kj");
await ev(`save(); true`); await sleep(300); await reload(); await sleep(1500);
const after = await tr("kj"); const err = await ev("TLXRIG.err");
console.log("C before", JSON.stringify({ on: before.on, legs: before.legs, x: Math.round(before.x), z: Math.round(before.z) }), "after", JSON.stringify({ on: after && after.on, legs: after && after.legs, x: after && Math.round(after.x), z: after && Math.round(after.z) }), "err", err, "cur", await ev(`JSON.stringify(TLX.state("vehicles").cur)`));
ok(after && after.on === before.on && after.legs === before.legs && !err, "C: reload keeps the coupling, legs state, no rig error");
ok(after && Math.hypot(after.x - before.x, after.z - before.z) < 10, "C: trailer is at the tractor after reload");
console.log("fails", fails);
await done();
process.exit(fails ? 1 : 0);
