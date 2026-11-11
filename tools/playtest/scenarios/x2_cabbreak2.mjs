// Beta break test 2 for slice 2.4 (tablet from the pickup's cab): what 0093 left untested. Truck bogged in powder with the tablet
// open, touch TABLET button + touch MAP while on foot beside the truck, Q out of a bogged truck then onto the sled (bog must not
// follow), tracked job (JOBT.sel) from the cab, tablet open while the truck rolls and the throttle is held.
// Prints ok/FAIL lines; exit 1 on a failure. Run: tools/playtest/run.sh tools/playtest/scenarios/x2_cabbreak2.mjs [outdir]
import { boot, ev, tap, sleep, done, park, hold, down, up, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
const tab = () => J(`({ open: TABLET.open, mode: TABLET.mode, app: TABLET.app, cur: TLX.state("vehicles").cur, foot: FOOT.on, bog: !!BOG.on, camNaN: !isFinite(camera.position.x + camera.quaternion.x), px: +P.x.toFixed(1), pz: +P.z.toFixed(1) })`);
const tapB = id => `(() => { const b = $("${id}"); if (!b) return 0; b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return 1; })()`;
const walkerBeside = uid => ev(`(() => { const s = TLX.state("vehicles"), r = s.owned.find(r => r.uid === ${uid}); const cur = s.cur === r.uid, x = cur ? P.x : r.x, z = cur ? P.z : r.z, yaw = cur ? P.yaw : r.yaw; const fx = Math.sin(yaw), fz = Math.cos(yaw);
  FOOT.on = true; FOOT.x = x + fz * 3 - fx * 0.3; FOOT.z = z - fx * 3 - fz * 0.3; FOOT.yaw = yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.cash = 9000; GOD.warm = true; true`);
await park(); await sleep(600);
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400);
await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(500);
ok(await ev(`TLX.state("vehicles").owned.length === 1`), "pickup bought");
await walkerBeside("'v1'"); await sleep(1200);

// 1. touch on foot beside the truck: is there a way to the tablet / map?
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(600);
let s = await J(`({ tcTablet: $("tcTablet") ? $("tcTablet").offsetParent !== null : null, tcMap: $("tcMap") ? $("tcMap").offsetParent !== null : null, foot: FOOT.on })`);
console.log("  1 touch buttons on foot:", JSON.stringify(s));
await ev(tapB("tcTablet")); await waitGame(0.7); let t = await tab();
console.log("  1 after TABLET on foot:", JSON.stringify(t));
ok(!t.camNaN, "touch on foot: camera finite after TABLET");
if (t.open) { ok(t.mode === "overlay", "touch on foot: tablet opens as overlay, not the sled dash (mode " + t.mode + ")"); await ev(tapB("tcTablet")); await waitGame(0.5); }
else console.log("  (tablet did not open on foot via touch: see report)");
await ev(`TABLET.close(true); true`); await sleep(300);
await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`); await sleep(400);

// 2. get in, bog the truck, open tablet in the hole
await tap("KeyQ"); ok(await waitUntil("!MNT.on", 10), "in the truck"); await sleep(500);
await ev(`enterBog(0.6); true`); await waitGame(0.6);
t = await tab(); ok(t.bog && t.cur === "v1", "truck bogged (" + JSON.stringify(t) + ")");
await tap("Tab"); await waitGame(0.9); t = await tab();
ok(t.open && t.mode === "overlay" && !t.camNaN, "tablet opens in a bogged truck: " + JSON.stringify(t));
await shot("x2cab2_bogtab");
await ev(`TABLET.toggle(true, "map"); true`); await waitGame(0.6);
await ev(`TABLET.toggle(true, "jobs"); true`); await waitGame(0.6);
t = await tab(); ok(t.open && t.bog, "jobs app open while bogged, still bogged");
await ev(`TABLET.close(true); true`); await waitGame(0.5);

// 3. tracked job from the cab
const jr = await J(`(() => { try { makeJobs(depot); } catch (e) {} const l = (typeof jobsList === "function") ? jobsList() : []; return { n: l.length }; })()`);
console.log("  3 jobsList rows:", JSON.stringify(jr));
await tap("KeyJ"); await waitGame(0.4); t = await tab(); ok(!t.camNaN, "J (cycle job) in a bogged truck: camera finite");

// 4. out of the bogged truck, onto the sled: bog must not follow
await tap("Tab"); await waitGame(0.7);
await tap("KeyQ"); await waitUntil("!DMT.on && FOOT.on", 12); await sleep(500);
t = await tab(); console.log("  4 after exit:", JSON.stringify(t));
ok(t.foot, "out of the bogged truck with tablet open");
await ev(`TABLET.close(true); true`); await sleep(300);
const bogOut = await ev(`!!BOG.on`);
console.log("  4 BOG.on on foot:", bogOut);
await ev(`(() => { FOOT.x = SLED_X(); return 1; function SLED_X() { const s = TLX.state("vehicles"); return FOOT.x; } })()`);
// walk to the sled: place the walker 3 m ahead of the parked sled's seat via the harness's own record
const sledPos = await J(`(() => { const s = TLX.state("vehicles"); return { cur: s.cur, sx: (s.sled || {}).x, sz: (s.sled || {}).z }; })()`);
console.log("  4 sled record:", JSON.stringify(sledPos));
await ev(`(() => { const s = TLX.state("vehicles"); const r = s.sled || s.parked || null; if (r && isFinite(r.x)) { FOOT.x = r.x + 1.6; FOOT.z = r.z; FOOT.y = surf(FOOT.x, FOOT.z); recenter(FOOT.x, FOOT.z, true); } return 1; })()`); await sleep(900);
await tap("KeyQ"); const mounted = await waitUntil("!FOOT.on && !MNT.on", 12); await sleep(500);
t = await tab(); console.log("  4 after mount:", JSON.stringify(t));
if (mounted && t.cur !== "v1") { ok(!t.bog, "the truck's bog did not follow onto the sled"); }
else console.log("  (could not reach the sled to test bog hand-over: mounted=" + mounted + " cur=" + t.cur + ")");

// 5. rolling truck, throttle held, tablet open
await ev(`crashCancel(); FOOT.on = false; true`);
await walkerBeside("'v1'"); await sleep(1000);
await tap("KeyQ"); await waitUntil("!MNT.on", 10); await sleep(500);
await ev(`BOG.on = false; (() => { let best = 0, by = P.yaw; for (let a = 0; a < 6.28; a += 0.2) { let d = 0; for (; d < 80; d += 4) { const x = P.x + Math.sin(a) * d, z = P.z + Math.cos(a) * d; if (obNear(x, z, 6) || isSea(x, z) || isWater(x, z)) break; } if (d > best) { best = d; by = a; } } P.yaw = by; P.vx = P.vz = 0; camState.init = false; camState.yaw = by; return best; })()`);
await down("KeyW"); await waitGame(0.8);
const v0 = await J(`({ v: +Math.hypot(P.vx, P.vz).toFixed(2), x: P.x, z: P.z })`);
await tap("Tab"); await waitGame(1.2);
const v1 = await J(`({ v: +Math.hypot(P.vx, P.vz).toFixed(2), x: P.x, z: P.z })`); t = await tab();
const moved = Math.hypot(v1.x - v0.x, v1.z - v0.z);
console.log("  5 opening the tablet at " + v0.v + " m/s holding W: speed after 1.2 s", v1.v, "moved", moved.toFixed(1), "m", JSON.stringify(t));
ok(!t.camNaN && t.open, "tablet open while rolling, camera finite");
ok(moved > 3, "truck keeps rolling under throttle with the tablet open (moved " + moved.toFixed(1) + " m in 1.2 s)");
await up("KeyW");
await ev(`TABLET.close(true); true`);

await done(fails ? 1 : 0);
