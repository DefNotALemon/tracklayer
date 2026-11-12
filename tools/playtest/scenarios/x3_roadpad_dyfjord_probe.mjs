// 3.1 beta probe: pickup at dyfjord 30% with pad RT held (and keyboard W as control): does it move, fuel, why-still toast.
import { boot, ev, sleep, done, padSet, padOff, down, up, tap, shot, sideCam, camOff } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 23; GS.cash = 9000; true`); await sleep(600);
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400); await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400); await ev(`closeGarage(); true`);
await ev(`(() => { const r = TLX.state("vehicles").owned[0]; const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); FOOT.on = true; FOOT.x = r.x + fz * 3 - fx * 0.3; FOOT.z = r.z - fx * 3 - fz * 0.3; FOOT.yaw = r.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(800); await tap("KeyQ"); await waitGame(5);
let first = true;
for (const ri of [1, 2, 2]) {
  for (const mode of ["pad", "key"]) {
    await ev(`(() => { const r = TLXR.routes[${ri}]; const i = Math.floor(r.pts.length * 0.3); const a = r.pts[i], b = r.pts[i + 3]; BOG.on = false; BOG.acc = 0; BOG.immune = 0; crashCancel(); P.x = a[0]; P.z = a[1]; P.yaw = Math.atan2(b[0] - a[0], b[1] - a[1]); P.vx = P.vz = P.vy = 0; P.y = surf(a[0], a[1]) + 0.2; recenter(a[0], a[1], true); return 1; })()`);
    await waitGame(1.2);
    if (mode === "pad") await padSet({ 7: 1 }, [0, 0, 0, 0]); else { await padOff(); await down("KeyW"); }
    await waitGame(6);
    const s = await J(`({ route: ${ri}, mode: "${mode}", v: Math.hypot(P.vx, P.vz), dev: INP.dev, fuel: GS.fuel, gear: GB.gear, bog: BOG.on, vcur: !!VEH.cur, toasts: [...document.querySelectorAll("#toasts *")].map(e => e.textContent).slice(-2), yard: yardAt(P.x, P.z) })`);
    console.log(JSON.stringify(s));
    if (mode === "pad") await padSet(); else await up("KeyW");
    if (first) { first = false; await sideCam(undefined, 7, 2.4, Math.PI * 0.8); await sleep(300); await shot("probe_cam"); await camOff(); console.log("after shot: crash", await ev("!!(CRASH && CRASH.on)"), "foot", await ev("FOOT.on"), "vcur", await ev("!!VEH.cur")); }
  }
}
await done(0);
