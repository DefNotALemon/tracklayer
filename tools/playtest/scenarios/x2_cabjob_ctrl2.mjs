// Report 0119 control 2: S from rest in the truck on a plowed lane vs open snow, tablet closed/open; W control.
import { boot, ev, tap, sleep, done, park, down, up } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; true`); await sleep(600);
await park(); await sleep(400);
await ev(`GS.cash = 9000; GS.delivered = 12; garageTab = "trucks"; openGarage(); true`); await sleep(500);
await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(400);
await ev(`(() => { const s = TLX.state("vehicles"), r = s.owned[0]; const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); crashCancel(); FOOT.on = true; FOOT.x = r.x + fz * 3.2; FOOT.z = r.z - fx * 3.2; FOOT.yaw = r.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); recenter(FOOT.x, FOOT.z, true); return 1; })()`); await sleep(1200);
await tap("KeyQ"); ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14), "in the truck");
const lane = await J(`(() => { let best = null; for (const Y of YARDS) { if (Y.x2 === undefined || Y.r > 5) continue; const L = Math.hypot(Y.x2 - Y.x, Y.z2 - Y.z); if (!best || L > best.L) best = { x: Y.x, z: Y.z, x2: Y.x2, z2: Y.z2, L }; } return best; })()`);
const place = (where) => ev(`(() => { const L = ${JSON.stringify(lane)}, ux = (L.x2 - L.x) / L.L, uz = (L.z2 - L.z) / L.L; const o = ${where === "lane" ? 0 : 60};
  P.x = L.x + ux * 12 + -uz * o; P.z = L.z + uz * 12 + ux * o; P.yaw = Math.atan2(ux, uz); P.y = surf(P.x, P.z); P.vx = P.vy = P.vz = 0; BOG.on = false; recenter(P.x, P.z, true); camState.init = false; return 1; })()`);
const run = async (label, where, code, tablet) => {
  await place(where); await waitGame(1.2);
  if (tablet) { await tap("Tab"); await waitGame(0.6); }
  const p0 = await J(`({ x: P.x, z: P.z, yaw: P.yaw })`);
  await down(code); await waitGame(2.5);
  const g = await J(`({ gear: GB.gear, sp: +Math.hypot(P.vx, P.vz).toFixed(2), bog: BOG.on, x: P.x, z: P.z })`);
  await up(code);
  const d = (g.x - p0.x) * Math.sin(p0.yaw) + (g.z - p0.z) * Math.cos(p0.yaw);
  console.log(label, "along-heading", d.toFixed(2), "m", JSON.stringify(g));
  if (tablet) { await ev(`TABLET.close(true); true`); await waitGame(0.4); }
  return d;
};
const w = await run("lane W", "lane", "KeyW", false);
const sL = await run("lane S closed", "lane", "KeyS", false);
const sT = await run("lane S tablet-open", "lane", "KeyS", true);
const wO = await run("snow W", "snow", "KeyW", false);
const sO = await run("snow S closed", "snow", "KeyS", false);
ok(w > 3, `W moves the truck on the lane (${w.toFixed(1)} m)`);
ok(sL < -1, `S from rest reverses on the lane, tablet closed (${sL.toFixed(1)} m)`);
ok(sT < -1, `S from rest reverses on the lane, tablet open (${sT.toFixed(1)} m)`);
ok(sO < -1, `S from rest reverses on open snow (${sO.toFixed(1)} m; W there ${wO.toFixed(1)} m)`);
await done(fails ? 1 : 0);
