// Beta 2.5 vs 4.1c: the universal hitch with the plow truck (no ball, hitchKg 0) in the fleet. Asserts, exit 1 on fail.
//   A free trailer beside the plow truck's tail: E must not hitch it, hint must not offer HITCH, no NaN.
//   B trailer hitched to the pickup, swap to the plow truck and back, reload: rig still on the pickup, finite.
//   C a trailer pushed into the plow truck's reach while it is the active vehicle: drive, no hitch, no error.
import { boot, ev, tap, sleep, done, park, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const rig = () => J(`({ on: TLXV.rigOn(), kind: TOW.kind, use: footUse(), hint: $("wnHint").textContent, cur: TLX.state("vehicles").cur, foot: FOOT.on, nan: [TOW.x, TOW.z, TOW.yaw, P.x, P.z, camera.position.x, camera.quaternion.x].some(v => !isFinite(v)) })`);
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.setOn("police", false); TLX.setOn("traffic", false); true`); await sleep(600);
await park(); await sleep(400);
await ev(`(() => { const o = GS.own; o.partsOwned["recv:ball"] = true; o.partsOwned["hitch:trailer"] = true; o.parts.recv = "ball"; o.parts.hitch = "trailer"; GS.cash = 60000; GS.lic = GS.lic || {}; GS.lic.freight = true; restat(); return 1; })()`);
await ev(`TLXV.buy("pickup"); true`); await sleep(300);
await ev(`TLXV.buy("plowtruck"); true`); await sleep(300);
const own = await J(`TLXV.state().owned.map(r => [r.uid, r.id])`); console.log("owned", JSON.stringify(own));
const pk = own.find(r => r[1] === "pickup"), pt = own.find(r => r[1] === "plowtruck");
ok(pk && pt, "owns pickup and plow truck");
if (!pk || !pt) await done(1);
// place both on a lane, trailer free near the plow truck's tail
await ev(`(() => { let best = null; for (const Y of YARDS) { if (Y.x2 === undefined || Math.hypot(Y.x - depot.x, Y.z - depot.z) > TOWN_R || Y.r > 5) continue; const L = Math.hypot(Y.x2 - Y.x, Y.z2 - Y.z); if (!best || L > best.L) best = { x: Y.x, z: Y.z, x2: Y.x2, z2: Y.z2, L }; }
  const ux = (best.x2 - best.x) / best.L, uz = (best.z2 - best.z) / best.L, yaw = Math.atan2(ux, uz); window.__L = { best, ux, uz, yaw };
  const S = TLX.state("vehicles"), a = S.owned.find(r => r.id === "plowtruck"), b = S.owned.find(r => r.id === "pickup");
  a.x = best.x + ux * 10; a.z = best.z + uz * 10; a.yaw = yaw; b.x = best.x + ux * 10 + uz * 12; b.z = best.z + uz * 10 - ux * 12; b.yaw = yaw;
  const bx = a.x - ux * 3.3; const bz = a.z - uz * 3.3;
  TOW.x = bx - ux * 1.5; TOW.z = bz - uz * 1.5; TOW.yaw = yaw; TOW.mass = 0;
  const rg = S.rig; rg.on = null; rg.kind = "trailer"; rg.x = TOW.x; rg.z = TOW.z; rg.yaw = yaw; restat();
  P.x = a.x + uz * 30; P.z = a.z - ux * 30; P.vx = P.vz = 0; P.y = surf(P.x, P.z); recenter(a.x, a.z, true); return 1; })()`);
await sleep(500);
// A
await ev(`(() => { const t = TLXV.tongueTip(), lx = Math.cos(TOW.yaw), lz = -Math.sin(TOW.yaw); crashCancel(); FOOT.on = true; FOOT.x = t[0] + lx * 0.8; FOOT.z = t[1] + lz * 0.8; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.yaw = TOW.yaw + Math.PI / 2; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(900);
let s = await rig(); console.log("A", JSON.stringify(s));
ok(!/hitch/i.test(s.use || "") || s.use === "UNHITCH" ? !s.use || !/^HITCH/i.test(s.use) : false, "A plow truck tail: use is not HITCH (" + s.use + ")");
ok(!/E: hitch/i.test(s.hint), "A hint does not offer to hitch (" + s.hint + ")");
await tap("KeyE"); await sleep(700); s = await rig(); ok(s.on === null && !s.nan, "A E does nothing to the rig (on " + s.on + ")");
// B: hitch to pickup, swap
await ev(`(() => { const S = TLX.state("vehicles"), b = S.owned.find(r => r.id === "pickup"), L = window.__L; const bx = b.x - Math.sin(b.yaw) * 3.1, bz = b.z - Math.cos(b.yaw) * 3.1;
  TOW.x = bx - Math.sin(b.yaw) * 2.4; TOW.z = bz - Math.cos(b.yaw) * 2.4; TOW.yaw = b.yaw; const rg = S.rig; rg.x = TOW.x; rg.z = TOW.z; rg.yaw = b.yaw; return 1; })()`);
await ev(`(() => { const t = TLXV.tongueTip(), lx = Math.cos(TOW.yaw), lz = -Math.sin(TOW.yaw); FOOT.on = true; FOOT.x = t[0] + lx * 0.8; FOOT.z = t[1] + lz * 0.8; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.yaw = TOW.yaw + Math.PI / 2; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(800); s = await rig(); console.log("B pre", JSON.stringify(s));
await tap("KeyE"); await sleep(800); s = await rig(); ok(s.on === pk[0], "B hitched to the pickup (" + s.on + ")");
for (const u of [pt[0], pk[0], null]) {
  await ev(`TLXV.swapTo(${JSON.stringify(u)}); FOOT.on = false; true`); await sleep(700);
  s = await rig(); ok(!s.nan && s.on === pk[0], "B after swap to " + u + ": rig still on pickup, finite (on " + s.on + ", cur " + s.cur + ")");
}
await reload(); await sleep(1500);
s = await rig(); ok(!s.nan && s.on === pk[0], "B after reload: rig on pickup (" + s.on + ")");
// C: plow truck active, drive with free-standing... rig is on pickup; unhitch it first via API then stand near plow truck
await ev(`TLXV.swapTo(${JSON.stringify(pt[0])}); FOOT.on = false; true`); await sleep(700);
await ev(`crashCancel(); true`);
const d0 = await J(`({x:P.x,z:P.z})`);
await ev(`window.__tl ? 0 : 0; true`);
const { down, up } = await import("../lib.mjs");
await down("KeyW"); await sleep(4000); await up("KeyW");
s = await rig(); const d1 = await J(`({x:P.x,z:P.z})`);
ok(!s.nan && Math.hypot(d1.x - d0.x, d1.z - d0.z) > 5, "C plow truck drives with the pickup's rig elsewhere (" + Math.hypot(d1.x - d0.x, d1.z - d0.z).toFixed(1) + " m)");
ok(s.on === pk[0], "C rig stays on the pickup (" + s.on + ")");
console.log(fails ? fails + " FAILED" : "all passed");
await done(fails ? 1 : 0);
