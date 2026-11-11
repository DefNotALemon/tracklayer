// Beta break test for slice 2.4 (tablet from the pickup's cab). Tries to break it: tablet open while getting out / in,
// reload with the tablet open in the cab, M toggling, walking between vehicles with it open, night, pad Start + touch.
// Prints ok/FAIL lines; exit 1 on a failure.
import { boot, ev, tap, sleep, done, park, padSet, padOff, reload, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
const tab = () => J(`({ open: TABLET.open, mode: TABLET.mode, e: +TABLET.e.toFixed(2), app: TABLET.app, hid: $("tab").hidden, cur: TLX.state("vehicles").cur, foot: FOOT.on, mnt: MNT.on, dmt: DMT.on, camNaN: !isFinite(camera.position.x + camera.quaternion.x) })`);
const walkerBeside = uid => ev(`(() => { const s = TLX.state("vehicles"), r = s.owned.find(r => r.uid === ${uid}); const cur = s.cur === r.uid, x = cur ? P.x : r.x, z = cur ? P.z : r.z, yaw = cur ? P.yaw : r.yaw; const fx = Math.sin(yaw), fz = Math.cos(yaw);
  FOOT.on = true; FOOT.x = x + fz * 3 - fx * 0.3; FOOT.z = z - fx * 3 - fz * 0.3; FOOT.yaw = yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.cash = 9000; true`);
await park(); await sleep(600);
// buy the pickup via the garage
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400);
await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(500);
ok(await ev(`TLX.state("vehicles").owned.length === 1`), "pickup bought");
await walkerBeside("'v1'"); await sleep(1200);
await tap("KeyQ"); ok(await waitUntil("!MNT.on", 10), "in the truck"); await sleep(400);

// 1. open tablet, press Q (get out) with it open
await tap("Tab"); await waitGame(0.8);
let s = await tab(); ok(s.open && s.mode === "overlay", "tablet open in cab " + JSON.stringify(s));
await tap("KeyQ"); await waitGame(0.5); s = await tab();
console.log("  after Q with tablet open:", JSON.stringify(s));
await waitUntil("!DMT.on", 10); await sleep(500); s = await tab();
console.log("  after exit:", JSON.stringify(s));
ok(s.foot && !s.dmt, "got out with tablet open");
ok(!s.camNaN, "camera finite");
ok(!(s.open && s.mode === "overlay" && s.hid), "tablet state not half-open: open=" + s.open + " hidden=" + s.hid);
await ev(`TABLET.close(true); true`); await sleep(300);

// 2. on foot, open map, walk to the sled with map open (vehicle swap with tablet open)
await tap("KeyM"); await waitGame(0.8); s = await tab(); ok(s.open && s.app === "map", "on foot M opens map " + JSON.stringify(s));
const sledAt = await J(`({ x: VEH.sled.x, z: VEH.sled.z })`);
await ev(`FOOT.x = ${sledAt.x} + 2; FOOT.z = ${sledAt.z}; FOOT.y = surf(FOOT.x, FOOT.z); recenter(FOOT.x, FOOT.z, true); true`); await sleep(1500);
s = await tab(); ok(s.cur === null, "sled is current after walking to it, tablet open: " + JSON.stringify(s));
await tap("KeyQ"); await waitGame(0.4); s = await tab(); console.log("  Q (mount sled) with map open:", JSON.stringify(s));
await waitUntil("!MNT.on", 10); await sleep(500); s = await tab();
console.log("  seated on sled:", JSON.stringify(s));
ok(!s.foot && !s.camNaN, "on the sled, camera finite");
await ev(`TABLET.close(true); true`); await sleep(300);
await tap("Tab"); await waitGame(0.8); s = await tab(); ok(s.open && s.mode === "dash", "sled Tab -> dash after truck usage: " + JSON.stringify(s));
await ev(`TABLET.close(true); true`); await sleep(300);

// 3. truck again, tablet open, save + reload in the cab
await walkerBeside("'v1'"); await sleep(1200);
await tap("KeyQ"); await waitUntil("!MNT.on", 10); await sleep(400);
await tap("Tab"); await waitGame(0.8);
await ev(`save(); true`).catch(() => 0);
await reload(); await sleep(1500);
s = await tab(); console.log("  after reload in cab:", JSON.stringify(s));
ok(s.cur === "v1" && !s.foot, "reload in the cab: seated in truck");
ok(!s.open || s.mode === "overlay", "tablet after reload consistent (not stuck dash mode in truck): " + s.mode);
await tap("Tab"); await waitGame(0.8); s = await tab();
console.log("  Tab after reload:", JSON.stringify(s));
ok(s.open ? s.mode === "overlay" : true, "Tab after reload opens/closes as overlay");
await ev(`TABLET.close(true); true`); await sleep(300);

// 4. night
await ev(`GS.hour = 23; GS.storm = 0; true`); await sleep(800);
await tap("Tab"); await waitGame(1); s = await tab(); ok(s.open && s.mode === "overlay", "night: overlay opens");
await shot("night_overlay");
await ev(`TABLET.close(true); true`); await sleep(300);

// 5. M toggling and rapid Tab spam
for (let i = 0; i < 6; i++) { await tap("Tab", 30); await sleep(60); }
await waitGame(1); s = await tab(); console.log("  after 6 Tab spam:", JSON.stringify(s));
ok(!s.camNaN, "Tab spam: camera finite");
await ev(`TABLET.close(true); true`); await sleep(300);
await tap("KeyM"); await waitGame(0.8); await tap("KeyM"); await waitGame(0.8); s = await tab();
ok(!s.open, "M twice closes in the cab " + JSON.stringify(s));

// 6. pad Start/Options and touch while in cab; pad d-pad up while driving
await padSet({ 12: 1 }); await sleep(150); await padSet(); await waitGame(0.8); s = await tab();
ok(s.open && s.mode === "overlay", "pad d-pad up opens: " + JSON.stringify(s));
await padSet({ 1: 1 }); await sleep(150); await padSet(); await waitGame(0.8); s = await tab(); console.log("  after 1st B:", JSON.stringify(s)); if (s.open) { await padSet({ 1: 1 }); await sleep(150); await padSet(); await waitGame(0.8); s = await tab(); console.log("  after 2nd B:", JSON.stringify(s)); } ok(!s.open, "pad B (twice from an app) closes");
await padOff();

// 7. old save: tablet in a save without vehicles key
await reload({ cash: 1234 }); await sleep(1200); await ev(`tutSkip(); true`); await sleep(500);
await tap("Tab"); await waitGame(0.8); s = await tab(); console.log("  tiny old save Tab:", JSON.stringify(s));
ok(s.open && s.mode === "dash" || s.open, "old/minimal save: Tab works on sled");

const errs = await ev(`(window.__errs || []).length`);
await done(fails ? 1 : 0);
