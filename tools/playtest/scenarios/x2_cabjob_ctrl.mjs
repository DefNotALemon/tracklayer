// Controls for report 0119: is reverse dead only with the tablet open, and do claimed parcels survive a reload in the cab?
import { boot, ev, tap, sleep, done, park, reload, down, up } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
const walkerBeside = () => ev(`(() => { const s = TLX.state("vehicles"), r = s.owned[0]; const p = (s.cur === r.uid ? P : r); const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
  crashCancel(); FOOT.on = true; FOOT.x = p.x + fz * 3.2 - fx * 0.3; FOOT.z = p.z - fx * 3.2 - fz * 0.3; FOOT.yaw = p.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; true`); await sleep(600);
await park(); await sleep(400);
await ev(`GS.cash = 9000; GS.delivered = 12; garageTab = "trucks"; openGarage(); true`); await sleep(500);
await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(400);
await walkerBeside(); await sleep(1200);
await tap("KeyQ"); ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14), "in the truck");
await ev(`P.x = depot.x + 90; P.z = depot.z + 90; P.y = surf(P.x, P.z); P.vx = P.vz = 0; recenter(P.x, P.z, true); camState.init = false; true`); await waitGame(1);
const rev = async (label, tablet) => {
  if (tablet) { await tap("Tab"); await waitGame(0.6); }
  const p0 = await J(`({ x: P.x, z: P.z, yaw: P.yaw })`);
  await down("KeyS"); await waitGame(2.5);
  const g = await J(`({ gear: GB.gear, sp: Math.hypot(P.vx, P.vz), bog: BOG.on, x: P.x, z: P.z })`);
  await up("KeyS");
  const d = (g.x - p0.x) * Math.sin(p0.yaw) + (g.z - p0.z) * Math.cos(p0.yaw);
  console.log(label, "along-heading", d.toFixed(2), JSON.stringify(g));
  if (tablet) { await ev(`TABLET.close(true); true`); await waitGame(0.4); }
  return d;
};
// the truck stopped from a standstill: S at rest = reverse (gear 0 is F at a standstill), with and without the tablet
const d1 = await rev("closed S 1", false); await waitGame(1);
const d2 = await rev("closed S 2", false); await waitGame(1);
const d3 = await rev("open   S", true);
ok(d1 < -1 || d2 < -1, "control: S from rest with the tablet closed reverses the truck at least once");
ok(d3 < -1, `S from rest with the tablet open reverses (${d3.toFixed(1)} m)`);
// reload with real claims
await ev(`makeJobs(depot); GS.load = []; GS.claims = []; true`);
await ev(`GS.claims.push(GS.jobs[0]); true`);
const a = await J(`({ claims: GS.claims.length, jobs: jobsList().length })`);
await ev(`save(); true`); await sleep(300);
await reload(); await sleep(1800);
const b = await J(`({ claims: GS.claims.length, load: GS.load.length, jobs: jobsList().length, board: GS.jobs.length })`);
console.log("claims before", JSON.stringify(a), "after reload", JSON.stringify(b));
ok(b.claims === a.claims, `a claimed parcel survives a reload (${a.claims} -> ${b.claims})`);
await done(fails ? 1 : 0);
