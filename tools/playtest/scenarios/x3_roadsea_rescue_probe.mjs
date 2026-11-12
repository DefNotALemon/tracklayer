// 3.1 beta probe: pickup in the fjord: hint text per input scheme (kbm/pad/touch), then F rescue: does it pull the truck out and leave it drivable?
import { boot, ev, sleep, done, tap, padSet, padOff, shot } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; GS.cash = 9000; true`); await sleep(600);
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400); await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400); await ev(`closeGarage(); true`);
await ev(`(() => { const r = TLX.state("vehicles").owned[0]; const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); FOOT.on = true; FOOT.x = r.x + fz * 3 - fx * 0.3; FOOT.z = r.z - fx * 3 - fz * 0.3; FOOT.yaw = r.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(800); await tap("KeyQ"); await waitGame(5);
const S = [1493, -2822];
await ev(`(() => { BOG.on = false; crashCancel(); P.x = ${S[0]}; P.z = ${S[1]}; P.yaw = 0; P.vx = P.vz = P.vy = 0; P.y = 0.5; recenter(P.x, P.z, true); return 1; })()`);
await waitGame(1);
const hintOf = () => J(`({ dev: INP.dev, wet: P.wet, helpOn: HELP.on, texts: [...document.querySelectorAll("body *")].filter(e => e.children.length === 0 && e.offsetParent && /IN THE WATER|RESCUE SLED/i.test(e.textContent)).map(e => e.textContent) })`);
console.log("kbm", JSON.stringify(await hintOf()));
await padSet({}, [0.6, 0, 0, 0]); await sleep(300); await padSet(); await sleep(400);
console.log("pad", JSON.stringify(await hintOf()));
await padOff();
await ev(`SET.touch = "on"; setTouchUI(); true`); await sleep(500);
const tt = await J(`({ btns: [...document.querySelectorAll("#touch button, .tc button, [id^=tc]")].filter(e => e.offsetParent && e.children.length === 0).map(e => e.id + ":" + e.textContent.trim()) })`);
console.log("touch", JSON.stringify(await hintOf()), JSON.stringify(tt));
await shot("touch_water");
await ev(`SET.touch = "off"; setTouchUI(); true`);
// F key (what the hint says), then every pad button, then P
await tap("KeyF"); await sleep(300);
console.log("after F key", JSON.stringify(await J(`({ called: HELP.called, gear: GB.gear, dir: GB.dir })`)));
for (let b = 0; b < 16; b++) { if (b === 9) continue; await padSet({ [b]: 1 }); await sleep(250); await padSet(); await sleep(150); const c = await ev("HELP.called"); if (c) { console.log("pad button that called help:", b); break; } }
console.log("after pad scan", JSON.stringify(await J(`({ called: HELP.called })`)));
await padOff();
await tap("KeyP"); await sleep(300);
console.log("called", JSON.stringify(await J(`({ called: HELP.called, phase: HELP.phase, eta: HELP.eta, fee: HELP.fee, cash: GS.cash })`)));
for (let k = 0; k < 24; k++) { await waitGame(3); console.log("r", k * 3 + 3, JSON.stringify(await J(`({ ph: HELP.phase, on: HELP.on, called: HELP.called, wet: P.wet, sea: isSea(P.x, P.z), water: isWater(P.x, P.z), x: Math.round(P.x), z: Math.round(P.z), y: +P.y.toFixed(1), g: +surf(P.x, P.z).toFixed(1), cash: GS.cash, toast: [...document.querySelectorAll("#toasts *")].map(e => e.textContent).slice(-1) })`))); }
import { down, up } from "../lib.mjs";
await down("KeyW"); await waitGame(5); await up("KeyW");
console.log("drive", JSON.stringify(await J(`({ v: Math.hypot(P.vx, P.vz), wet: P.wet, sea: isSea(P.x, P.z), veh: !!VEH.cur, foot: FOOT.on })`)));
await done(0);
