// 2.2 beta: get in the NEAREST of sled + pickup + tractor. Walker walks between them, Q boards the nearest, out and
// across to another, parked records keep their spot, swapping keeps fuel; reload while seated in the tractor.
import { boot, ev, tap, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
const S = () => J(`({ foot: FOOT.on, cur: TLX.state("vehicles").cur, id: (TLXV.rt && TLXV.rt() && TLXV.rt().def.id) || null, use: footUse(), hint: $("wnHint").textContent, nan: [P.x, P.z, FOOT.x, FOOT.z, camera.position.x].some(v => !isFinite(v)) })`);
await boot(); await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.hour = 12; WX.at = () => 0; GS.storm = 0; TLX.setOn && TLX.setOn("traffic", false); GS.cash = 60000; GS.lic.freight = true; true`);
await ev(`TLXV.buy("pickup"); TLXV.buy("tractor"); true`); await sleep(800);
await ev(`(() => { const o = TLX.state("vehicles"); if (VEH.cur) { try { TLXV.swapTo(null) } catch (e) {} } return 1; })()`);
console.log("own", await ev(`JSON.stringify(TLX.state("vehicles").owned.map(r => [r.uid, r.id, r.x|0, r.z|0]))`), "cur", await ev(`TLX.state("vehicles").cur`));
// get on foot beside everything, lay the three vehicles on a line 40 m apart: pickup at 0, sled at 40, tractor at 80 (x), walker moves along
const lay = () => ev(`(() => { crashCancel(); const o = TLX.state("vehicles").owned; const pk = o.find(r => r.id === "pickup"), tr = o.find(r => r.id === "tractor");
  window.__bx = FOOT.on ? FOOT.x : P.x; window.__bz = FOOT.on ? FOOT.z : P.z; const bx = window.__bx, bz = window.__bz;
  const set = (r, x) => { r.x = bx + x; r.z = bz; r.yaw = 0; };
  if (!VEH.cur) { set(pk, 0); set(tr, 80); P.x = bx + 40; P.z = bz; P.vx = P.vz = 0; P.y = surf(P.x, P.z); }
  return JSON.stringify([pk.x - bx, tr.x - bx, P.x - bx]); })()`);
await ev(`FOOT.on = true; FOOT.x = P.x; FOOT.z = P.z + 6; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); true`); await waitGame(1);
console.log("layout", await lay());
const at = x => ev(`(() => { FOOT.on = true; FOOT.x = window.__bx + ${x}; FOOT.z = window.__bz; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
const probes = [[3, "pickup"], [20, "pickup|sled|walk"], [37, "sled"], [43, "sled"], [77, "tractor"], [60, "sled|tractor|walk"]];
for (const [x, want] of probes) {
  await at(x); await waitGame(1.4); const s = await S();
  console.log("at", x, JSON.stringify(s));
  ok(!s.nan, "finite at " + x);
  ok(new RegExp(want, "i").test(s.hint) || (want.includes("walk") && s.hint === ""), `hint at ${x} m reads ${want} (${s.hint})`);
}
// board the tractor with Q, check id
await at(77); await waitGame(1.2); await tap("KeyQ"); await waitGame(0.5);
for (let i = 0; i < 40 && (await S()).foot; i++) await waitGame(0.3);
await waitGame(1); let s = await S(); console.log("in tractor?", JSON.stringify(s));
ok(!s.foot && s.id === "tractor", "Q at the tractor boards the tractor (" + s.id + ")");
const fuelT = await ev(`GS.fuel`);
await tap("KeyQ"); await waitGame(0.5); for (let i = 0; i < 40 && !(await S()).foot; i++) await waitGame(0.3); await waitGame(1);
s = await S(); console.log("out", JSON.stringify(s));
ok(s.foot && !s.nan, "Q gets out of the tractor");
const tpos = await J(`(() => { const r = TLX.state("vehicles").owned.find(r => r.id === "tractor"); return { dx: r.x - window.__bx, dz: r.z - window.__bz, f: r.fuel }; })()`);
console.log("tractor record", JSON.stringify(tpos));
ok(Math.abs(tpos.dx - 80) < 12 && Math.abs(tpos.dz) < 12, "tractor stays where it was parked (" + tpos.dx.toFixed(1) + "," + tpos.dz.toFixed(1) + ")");
// walk to pickup and get in; swap hands the tractor's fuel back
await at(3); await waitGame(1.4); await tap("KeyQ"); await waitGame(0.5);
for (let i = 0; i < 40 && (await S()).foot; i++) await waitGame(0.3); await waitGame(1);
s = await S(); console.log("in pickup", JSON.stringify(s));
ok(!s.foot && s.id === "pickup", "then the pickup (" + s.id + ")");
const fuels = await J(`TLX.state("vehicles").owned.map(r => [r.id, +(r.fuel||0).toFixed(1)])`);
console.log("fuels", JSON.stringify(fuels), "fuelT", fuelT);
// the sled should now be parked where laid
const sp = await J(`({ dx: P.x - window.__bx, vehCur: !!VEH.cur })`);
console.log("P", JSON.stringify(sp));
// reload while seated in the tractor via swapTo
await ev(`TLXV.swapTo(TLX.state("vehicles").owned.find(r => r.id === "tractor").uid); true`); await sleep(1000);
const pre = await S(); await reload(); await sleep(1500); await waitGame(1.5);
s = await S(); console.log("reload in tractor", JSON.stringify(pre), JSON.stringify(s));
ok(!s.nan && s.id === "tractor" && !s.foot, "reload in the tractor keeps you in it (" + s.id + ")");
await tap("KeyQ"); await waitGame(0.5); for (let i = 0; i < 40 && !(await S()).foot; i++) await waitGame(0.3); await waitGame(1);
s = await S();
const recs = await J(`TLX.state("vehicles").owned.map(r => [r.id, Math.round(r.x - window.__bx), Math.round(r.z - window.__bz)])`).catch(() => null);
console.log("after reload out", JSON.stringify(s), JSON.stringify(recs), "sled", await ev(`Math.round(P.x)`));
ok(s.foot && !s.nan, "out again after reload");
await done(fails ? 1 : 0);
