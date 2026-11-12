// Beta break test for 2.6c: a sled strapped to the deck trailer, then the player starts a school course (schoolBegin swaps GS.own and
// moves P). Does strapTick keep gluing the school's sled to the trailer? Does quitting bring the own sled back strapped/finite? Reload mid-course.
import { boot, ev, tap, sleep, done, park, reload, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }

await boot(); await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`);
await park(); await sleep(400);
await ev(`GS.cash = 9000; garageTab = "trucks"; openGarage(); true`); await sleep(500);
await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400);
await ev(`[...document.querySelectorAll("#garageBody .row")].find(e => /Fjordhenger/.test(e.textContent)).click(); closeGarage(); true`); await sleep(400);
ok(!!(await ev(`TLXV.haul() ? 1 : 0`)), "bought truck + trailer");
const sc = await J(`(() => { const s = SCHOOLS.freight; return { x: s.x, z: s.z, n: s.missions.length }; })()`);
console.log("freight school", JSON.stringify(sc));
// trailer free beside the freight yard, sled strapped on it, school app signed up
await ev(`(() => { const sc = SCHOOLS.freight, h = TLXV.haul(); GS.apps.freight = true; GS.signed.freight = true; GS.lic.freight = false;
  h.on = null; h.x = sc.x + 8; h.z = sc.z + 8; h.yaw = 0; h.ramp = 0; h.strap = { x: 0, z: 0.69, yaw: 0 };
  const w = TLXV.haulWorld(h, 0.0, 0.69); P.x = w[0]; P.z = w[1]; P.yaw = 0; P.vx = P.vz = P.vy = 0; P.y = TLXV.deckAt(P.x, P.z, 99); recenter(P.x, P.z, true); return 1; })()`);
await waitGame(2);
let s0 = await J(`({ strap: !!TLXV.haul().strap, here: SCHOOL.here && SCHOOL.here.id, x: P.x, z: P.z, hx: TLXV.haul().x, hz: TLXV.haul().z })`);
console.log("before", JSON.stringify(s0));
ok(s0.strap && s0.here === "freight", `strapped sled in the freight yard (here ${s0.here})`);
await ev(`schoolBegin("freight"); true`); await waitGame(2.5);
const b = await J(`({ on: SCHOOL.on, strap: !!TLXV.haul().strap, x: P.x, z: P.z, y: P.y, hx: TLXV.haul().x, hz: TLXV.haul().z, sled: GS.own.sled, toast: [...document.querySelectorAll("#toasts *")].map(e => e.textContent).slice(-3), nan: [P.x, P.z, camera.position.x].some(v => !isFinite(v)) })`);
console.log("after begin", JSON.stringify(b));
const st = await J(`(() => { const s = SCHOOLS.freight; return { x: s.x, z: s.z + 10 }; })()`);
ok(b.on, "course started");
ok(Math.hypot(b.x - st.x, b.z - st.z) < 6, `school sled stands at the yard start, not glued to the trailer (${Math.hypot(b.x - st.x, b.z - st.z).toFixed(1)} m from start, ${Math.hypot(b.x - b.hx, b.z - b.hz).toFixed(1)} m from trailer)`);
await shot("x2ss_begin");
// drive away a bit: hold throttle
await ev(`input.thr = 1; true`); await waitGame(2); await ev(`input.thr = 0; true`);
const c = await J(`({ x: P.x, z: P.z, v: Math.hypot(P.vx, P.vz) })`);
ok(Math.hypot(c.x - b.x, c.z - b.z) > 3, `school sled can move (moved ${Math.hypot(c.x - b.x, c.z - b.z).toFixed(1)} m)`);
// quit and come back
await ev(`schoolEnd("quit"); true`); await waitGame(2);
const d = await J(`({ on: SCHOOL.on, sled: GS.own.sled, strap: !!TLXV.haul().strap, x: P.x, z: P.z, y: P.y, hx: TLXV.haul().x, hz: TLXV.haul().z, nan: [P.x, P.z, P.y, camera.position.x].some(v => !isFinite(v)) })`);
console.log("after quit", JSON.stringify(d));
ok(!d.nan && !d.on, "quit: finite, course off");
ok(Math.hypot(d.x - d.hx, d.z - d.hz) < 4 || !d.strap, `own sled back on the trailer or strap cleared (${Math.hypot(d.x - d.hx, d.z - d.hz).toFixed(1)} m from trailer, strap ${d.strap})`);
await shot("x2ss_quit");
await done(fails ? 1 : 0);
