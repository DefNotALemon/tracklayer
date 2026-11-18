// Beta break test for slice 2.4 (tablet from a cab) on v252: the cab of the PLOW TRUCK with the Plow app (4.2), at night, with pad and touch,
// tablet open while rolling with the blade down, Q out with the Plow app open, reload with the tablet open in the cab. Prints ok/FAIL; exit 1 on a failure.
import { boot, ev, tap, sleep, done, park, shot, down, up, padSet, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
const tab = () => J(`({ open: TABLET.open, mode: TABLET.mode, app: TABLET.app, cur: TLX.state("vehicles").cur, foot: FOOT.on, camNaN: !isFinite(camera.position.x + camera.quaternion.x), v: Math.hypot(P.vx || 0, P.vz || 0), px: P.x, pz: P.z, apps: [...document.querySelectorAll("#tabS [data-app], #tabS .app")].length })`);
const tapB = id => `(() => { const b = $("${id}"); if (!b) return 0; b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return 1; })()`;

await boot(); await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; GS.cash = 90000; GS.lic = GS.lic || {}; GS.lic.freight = true; GOD.warm = true; true`);
await park(); await sleep(500);
await ev(`TLXV.buy("plowtruck"); true`); await sleep(600);
const uid = await ev(`(TLX.state("vehicles").owned.find(r => r.id === "plowtruck") || {}).uid || null`);
ok(!!uid, "plow truck bought, uid " + uid);
// put the truck on a town lane, walker beside it
await ev(`(() => { const r = TLX.state("vehicles").owned.find(r => r.id === "plowtruck"); let best = null; for (const Y of YARDS) { if (Y.x2 === undefined || Math.hypot(Y.x - depot.x, Y.z - depot.z) > TOWN_R || Y.r > 5) continue; const L = Math.hypot(Y.x2 - Y.x, Y.z2 - Y.z); if (!best || L > best.L) best = { x: Y.x, z: Y.z, x2: Y.x2, z2: Y.z2, L }; }
  const ux = (best.x2 - best.x) / best.L, uz = (best.z2 - best.z) / best.L; r.x = best.x + ux * 8; r.z = best.z + uz * 8; r.yaw = Math.atan2(ux, uz);
  const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); FOOT.on = true; FOOT.x = r.x + fz * 3 - fx * 0.3; FOOT.z = r.z - fx * 3 - fz * 0.3; FOOT.yaw = r.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(r.x, r.z, true); return 1; })()`);
await sleep(1200);
await tap("KeyQ"); ok(await waitUntil(`!MNT.on && !FOOT.on && TLX.state("vehicles").cur === "${uid}"`, 14), "in the plow truck"); await waitGame(0.6);

// 1 keyboard day: Tab opens overlay, apps present incl. Plow
await tap("Tab"); await waitGame(0.9); let t = await tab();
ok(t.open && t.mode === "overlay" && !t.camNaN, "Tab in the plow cab: overlay " + JSON.stringify(t));
await ev(`TABLET.toggle(true, "plow"); true`); await waitGame(0.8); t = await tab();
const plowTxt = await ev(`($("tabS") || document.body).innerText.slice(0, 400)`);
ok(t.open && t.app === "plow", "Plow app opens from the cab (app " + t.app + ")");
console.log("  plow app text:", JSON.stringify(plowTxt));
await shot("x2cabpt_plowday");
// 2 night
await ev(`GS.hour = 23.5; true`); await waitGame(1.0); await shot("x2cabpt_plownight");
await ev(`TABLET.toggle(true, "map"); true`); await waitGame(0.8); await shot("x2cabpt_mapnight");
t = await tab(); ok(t.open && t.app === "map" && !t.camNaN, "Map at night in the cab");
await ev(`TABLET.close(true); GS.hour = 12; true`); await waitGame(0.5);

// 3 roll with the tablet open and the blade down, throttle held
await ev(`(() => { try { const b = TLXV.blade && TLXV.blade(); } catch (e) {} return 1; })()`);
await tap("Tab"); await waitGame(0.5);
await down("KeyW"); await waitGame(3.0); t = await tab();
const v1 = t.v, x1 = t.px, z1 = t.pz;
ok(t.open && !t.camNaN, "tablet open while rolling under throttle (v " + v1.toFixed(1) + " m/s)");
await up("KeyW"); await tap("Tab"); await waitGame(0.5); t = await tab(); ok(!t.open, "Tab closes the tablet while rolling");
await down("KeyS"); const stopped = await waitUntil("Math.hypot(P.vx, P.vz) < 0.3", 25); await up("KeyS"); ok(stopped, "truck braked to a stop with S (blade down or not)");
const bladeHint = await ev(`$("wnHint").textContent + " | " + (document.getElementById("hint") ? document.getElementById("hint").textContent : "")`);
console.log("  riding hint:", JSON.stringify(bladeHint));

// 4 pad: Y/d-pad up opens map in the cab? then B closes
await ev(`INP.dev = "pad"; true`);
await padSet({ 12: 1 }, [0, 0, 0, 0]); await sleep(150); await padSet(); await waitGame(0.8); t = await tab();
console.log("  pad d-pad up:", JSON.stringify(t));
ok(!t.camNaN, "pad d-pad up in the plow cab: camera finite (open=" + t.open + " app=" + t.app + ")");
if (t.open) { await padSet({ 1: 1 }, [0, 0, 0, 0]); await sleep(150); await padSet(); await waitGame(0.6); t = await tab(); console.log("  after pad B #1:", JSON.stringify({ open: t.open, app: t.app }));
  if (t.open) { await padSet({ 1: 1 }, [0, 0, 0, 0]); await sleep(150); await padSet(); await waitGame(0.6); t = await tab(); console.log("  after pad B #2:", JSON.stringify({ open: t.open, app: t.app })); }
  ok(!t.open, "pad B (at most twice: app -> home -> closed) closes the tablet in the cab"); }
await ev(`TABLET.close(true); INP.dev = "kbm"; true`);

// 5 touch: TABLET + MAP buttons in the cab, tablet button label
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(600);
const vis = await J(`({ tcTablet: $("tcTablet") ? $("tcTablet").offsetParent !== null : null, tcMap: $("tcMap") ? $("tcMap").offsetParent !== null : null })`);
console.log("  touch buttons in cab:", JSON.stringify(vis));
await ev(tapB("tcTablet")); await waitGame(0.8); t = await tab(); ok(t.open && t.mode === "overlay" && !t.camNaN, "touch TABLET in the plow cab opens overlay");
await ev(tapB("tcTablet")); await waitGame(0.6); t = await tab(); ok(!t.open, "touch TABLET again closes it");
await ev(`TABLET.toggle(true, "map"); true`); await waitGame(0.6); await shot("x2cabpt_touchmap"); await ev(`TABLET.close(true); true`);
await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; TABLET.close(true); true`); await sleep(400);

// 6 Q out with the Plow app open
await ev(`TABLET.toggle(true, "plow"); true`); await waitGame(0.6);
await tap("KeyQ"); await waitGame(0.5); t = await tab();
console.log("  Q with plow app open:", JSON.stringify(t));
await waitUntil("FOOT.on && !DMT.on", 12); await waitGame(0.6); t = await tab();
ok(t.foot && !t.camNaN, "got out of the cab with the Plow app open, camera finite (tablet open=" + t.open + ")");
await ev(`TABLET.close(true); true`);

// 7 back in, reload with the tablet open in the cab
await ev(`(() => { const r = TLX.state("vehicles").owned.find(r => r.id === "plowtruck"); const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); FOOT.x = r.x + fz * 3 - fx * 0.3; FOOT.z = r.z - fx * 3 - fz * 0.3; FOOT.y = surf(FOOT.x, FOOT.z); recenter(r.x, r.z, true); return 1; })()`); await sleep(1000);
await tap("KeyQ"); ok(await waitUntil(`!MNT.on && !FOOT.on && TLX.state("vehicles").cur === "${uid}"`, 14), "back in the cab"); await waitGame(0.5);
await ev(`TABLET.toggle(true, "plow"); true`); await waitGame(0.6);
await reload(); await sleep(1500);
t = await tab(); console.log("  after reload:", JSON.stringify(t));
ok(!t.camNaN, "after reload with tablet open in the cab: camera finite; cur=" + t.cur + " foot=" + t.foot + " open=" + t.open);
await tap("Tab"); await waitGame(0.8); t = await tab();
ok(t.open && !t.camNaN, "tablet opens after the reload (mode " + t.mode + ")");
await ev(`TABLET.toggle(true, "plow"); true`); await waitGame(0.6); t = await tab();
ok(t.app === "plow", "Plow app still listed after reload (app " + t.app + ")");
await shot("x2cabpt_afterreload");
const errs = await ev(`1`); 
await done(fails ? 1 : 0);
