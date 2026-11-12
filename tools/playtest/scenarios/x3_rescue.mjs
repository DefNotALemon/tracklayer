// Beta fix 0128 #1-#3: a dunking in the fjord off the Gamvik road (1493, -2822).
// A) sled: the water hint names the real key per scheme (P / D-pad down / tap CALL HELP), the pad's D-pad down calls the
//    rescue, the rescue sets the sled down on dry, gentle ground with no water within 9 m, and 30 game s later it's still dry.
// B) pickup: same spot, called with P; it must land clear of water (14 m ring) and stay dry; one fee only; it drives off.
// Exit 1 on any failed assert. NOSTILLS=1 skips the stills.
import { boot, ev, sleep, done, tap, down, up, padSet, padOff, shot, send } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
let fails = 0;
const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const S = [1493, -2822];
const still = n => process.env.NOSTILLS ? 0 : shot(n);
const hint = () => ev(`(document.getElementById("wnHint") && document.getElementById("wnHint").offsetParent ? document.getElementById("wnHint").textContent : "") + " | " + [...document.querySelectorAll("body *")].filter(e => e.children.length === 0 && e.offsetParent && /IN THE WATER/i.test(e.textContent)).map(e => e.textContent).join(" / ")`);
const dunk = () => ev(`(() => { BOG.on = false; crashCancel(); HELP.dryT = 0; P.x = ${S[0]}; P.z = ${S[1]}; P.yaw = 0; P.vx = P.vz = P.vy = 0; P.y = 0.5; recenter(P.x, P.z, true); return 1; })()`);
// nearest water within 30 m of the body, by a 32-ray scan in 1 m steps
const dryR = `(() => { let m = 99; for (let k = 0; k < 32; k++) { const b = k * Math.PI / 16; for (let r = 0; r <= 30; r += 1) if (isWater(P.x + Math.cos(b) * r, P.z + Math.sin(b) * r)) { m = Math.min(m, r); break; } } return m; })()`;
async function rescue(tag, clear) {
  // wait for the pull to finish (HELP.on goes false with the "Winched out" toast)
  let t = 0; while ((await ev("HELP.on")) && t < 80) { await waitGame(2); t += 2; }
  const a = await J(`({ on: HELP.on, wet: P.wet, water: isWater(P.x, P.z), x: P.x, z: P.z, slope: slopeAt(P.x, P.z, 3), dry: ${dryR}, cash: GS.cash })`);
  ok(!a.on && !a.wet && !a.water, `${tag}: winched out (${t} s): on ${a.on} wet ${a.wet} water ${a.water}`);
  ok(a.dry >= clear, `${tag}: set down ${a.dry} m from the nearest water (want >= ${clear})`);
  ok(a.slope < 0.2, `${tag}: on gentle ground, slope ${a.slope.toFixed(3)}`);
  await still(tag + "_landed");
  let worst = { wet: false, on: false }, drift = 0;
  for (let k = 0; k < 10; k++) { await waitGame(3); const b = await J(`({ wet: P.wet, on: HELP.on, water: isWater(P.x, P.z), x: P.x, z: P.z })`); if (b.wet || b.water) worst.wet = true; if (b.on) worst.on = true; drift = Math.max(drift, Math.hypot(b.x - a.x, b.z - a.z)); }
  ok(!worst.wet && !worst.on, `${tag}: still dry 30 game s later (wet ${worst.wet}, back in rescue ${worst.on}), drifted ${drift.toFixed(1)} m`);
  ok(drift < 3, `${tag}: didn't roll away (${drift.toFixed(1)} m)`);
  return a;
}

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; GS.cash = 9000; true`); await sleep(600);

// ---- A: the sled, hints per scheme, pad calls
await dunk(); await waitGame(2);
ok(await ev("HELP.on && HELP.kind === 'sea'"), "A: sled in the fjord starts a dunking");
let h = await hint(); console.log("kbm hint:", h);
ok(/P: CALL FOR HELP/.test(h) && !/F: CALL/.test(h), "A: keyboard hint says P");
await padSet({}, [0.6, 0, 0, 0]); await sleep(300); await padSet(); await sleep(400);
h = await hint(); console.log("pad hint:", h);
ok(/D-PAD DOWN: CALL FOR HELP/.test(h), "A: pad hint says D-pad down");
await ev(`INP.dev = "touch"; SET.touch = "on"; setTouchUI(); true`); await sleep(400);
h = await hint(); console.log("touch hint:", h);
ok(/TAP CALL HELP/.test(h), "A: touch hint says tap CALL HELP");
ok(await ev(`!!document.getElementById("tcF") && !!document.getElementById("tcF").offsetParent`), "A: touch CALL HELP button shown");
await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "pad"; true`);
const wounds0 = await ev(`TLX.wounds && TLX.state("wounds") ? JSON.stringify(TLX.state("wounds")) : ""`);
const cash0 = await ev("GS.cash");
await padSet({ 13: 1 }); await sleep(300); await padSet(); await sleep(400); await padOff();
ok(await ev("HELP.called"), "A: pad D-pad down called the rescue");
await still("A_called");
const a = await rescue("A_sled", 9);
ok(cash0 - a.cash > 0, `A: fee charged ${cash0 - a.cash}`);
// D-pad down on dry land is the bandage again (helpWanted false)
ok(!(await ev("helpWanted()")), "A: no call for help wanted once out");

// ---- B: the pickup
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400); await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400); await ev(`closeGarage(); true`);
await ev(`(() => { const r = TLX.state("vehicles").owned[0]; const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); crashCancel(); FOOT.on = true; FOOT.x = r.x + fz * 3 - fx * 0.3; FOOT.z = r.z - fx * 3 - fz * 0.3; FOOT.yaw = r.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(800); await tap("KeyQ");
for (let k = 0; k < 40 && (await ev("FOOT.on || !VEH.cur")); k++) await waitGame(0.5);
ok(await ev("!!VEH.cur && !FOOT.on"), "B: in the pickup");
await dunk(); await waitGame(2);
ok(await ev("HELP.on && HELP.kind === 'sea'"), "B: pickup in the fjord starts a dunking");
await tap("KeyF"); await sleep(300);
ok(!(await ev("HELP.called")), "B: F does nothing (the hint no longer says F)");
const cashB = await ev("GS.cash");
await tap("KeyP"); await sleep(300);
ok(await ev("HELP.called"), "B: P called the rescue");
const b = await rescue("B_pickup", 14);
ok(cashB - b.cash === await ev("helpCost('sea')"), `B: one fee only (${cashB - b.cash})`);
await down("KeyW"); await waitGame(5); await up("KeyW");
const d = await J(`({ moved: Math.hypot(P.x - ${b.x}, P.z - ${b.z}), wet: P.wet, veh: !!VEH.cur })`);
ok(d.moved > 5 && !d.wet, `B: drives off: ${d.moved.toFixed(1)} m in 5 s, wet ${d.wet}`);
await still("B_drove");
console.log(fails ? `FAILED ${fails}` : "ALL OK");
await done(fails ? 1 : 0);
