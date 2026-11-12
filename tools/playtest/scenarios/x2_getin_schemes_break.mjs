// Beta break test for 2.2 (get in the nearest vehicle): the on-foot hint and the GET ON/GET OFF button under keyboard, pad (3 brands) and touch,
// standing between the sled and the pickup; mount the pickup with each scheme; reload while on foot between the two; night. Prints ok/FAIL, exit 1 on FAIL.
import { boot, ev, tap, sleep, done, park, reload, shot, padSet, padOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
const S = () => J(`({ foot: FOOT.on, cur: TLX.state("vehicles").cur, veh: !!VEH.cur, mnt: !!MNT.on, dmt: !!DMT.on, use: footUse(), dev: INP.dev, hint: $("wnHint").textContent, tM: $("tcMount") ? ($("tcMount").hidden ? null : $("tcMount").textContent) : "?", nan: [P.x, P.z, FOOT.x, FOOT.z, camera.position.x].some(v => !isFinite(v)) })`);
const PADS = [["xbox", undefined, "LB"], ["ps", "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)", "L1"], ["nin", "Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)", "L"]];

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); // night
await park(); await sleep(400);
await ev(`GS.cash = 9000; garageTab = "trucks"; openGarage(); true`); await sleep(500);
await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(400);
console.log("own", await ev(`JSON.stringify(TLX.state("vehicles").owned.map(r => [r.id, r.x|0, r.z|0]))`), "cur", await ev(`TLX.state("vehicles").cur`));
// stand on foot 6 m from the sled P, truck record 4 m to the other side
const between = () => ev(`(() => { crashCancel(); const r = TLX.state("vehicles").owned[0]; const sx = P.x, sz = P.z;
  if (!VEH.cur) { r.x = sx + 12; r.z = sz; r.yaw = 0; }
  FOOT.on = true; FOOT.x = sx + 5.5; FOOT.z = sz; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.yaw = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
const near = (who) => ev(`(() => { const r = TLX.state("vehicles").owned[0]; const t = ${who === "truck" ? "[r.x, r.z]" : "[P.x, P.z]"}; FOOT.x = t[0] + 3; FOOT.z = t[1]; FOOT.y = surf(FOOT.x, FOOT.z); recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await between(); await waitGame(1.2);
let s = await S(); console.log("between", JSON.stringify(s));
ok(!s.nan, "finite");
await near("truck"); await waitGame(1.5); s = await S(); console.log("near truck", JSON.stringify(s));
ok(/pickup|truck/i.test(s.hint), "kbm hint names the pickup (" + s.hint + ")");
ok(/Q:/.test(s.hint), "kbm hint names Q (" + s.hint + ")");
for (const [nm, id, lab] of PADS) {
  await padSet({}, [0.6, 0, 0, 0], id); await sleep(250); await padSet({}, [0, 0, 0, 0], id); await sleep(500);
  await near("truck"); await waitGame(1.2); s = await S();
  ok(s.hint.includes(lab + ":") && /pickup|truck/i.test(s.hint), nm + " hint offers " + lab + " for the pickup (" + s.hint + ")");
  ok(!/Q:/.test(s.hint), nm + " hint has no keyboard Q");
}
// mount with pad LB then dismount
await padSet({}, [0.6, 0, 0, 0]); await sleep(250); await padSet({}, [0, 0, 0, 0]); await sleep(400);
await near("truck"); await waitGame(1.2);
await padSet({ 4: 1 }); await sleep(250); await padSet({}); 
await waitGame(0.5); for (let i = 0; i < 40 && (await J(`({ f: FOOT.on, m: !!MNT.on })`)).f; i++) await waitGame(0.3);
await waitGame(1.0); s = await S(); console.log("after pad mount", JSON.stringify(s));
ok(s.veh && !s.foot, "pad LB gets in the pickup (veh " + s.veh + ", foot " + s.foot + ")");
await shot("x2gi_pad_in");
await padSet({ 4: 1 }); await sleep(250); await padSet({});
await waitGame(0.5); for (let i = 0; i < 40 && !(await J(`({ f: FOOT.on, d: !!DMT.on })`)).f; i++) await waitGame(0.3);
await waitGame(1.0); s = await S(); console.log("after pad dismount", JSON.stringify(s));
ok(s.foot && !s.nan, "pad LB gets out of the pickup");
await padOff();
// touch
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(700);
await ev(`(() => { crashCancel(); FOOT.on = true; FOOT.sp = 0; return 1; })()`);
await near("truck"); await waitGame(1.5); s = await S(); console.log("touch near truck", JSON.stringify(s));
ok(/tap GET (ON|IN)/i.test(s.hint) || /tap/i.test(s.hint), "touch hint says tap (" + s.hint + ")");
ok(!/Q:|LB:/.test(s.hint), "touch hint has no key names");
await shot("x2gi_touch");
const btnIds = await J(`[...document.querySelectorAll("#touchUI button, .tcbtn, [id^=tc]")].filter(e => e.offsetParent).map(e => e.id + ":" + e.textContent.trim()).slice(0, 15)`);
console.log("visible touch buttons", JSON.stringify(btnIds));
// kbm again, mount with Q, reload mid-mount
await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`); await sleep(500);
await near("truck"); await waitGame(1.2);
await tap("KeyQ"); await waitGame(0.8);
const pre = await J(`({ mnt: !!MNT.on, cur: TLX.state("vehicles").cur })`);
await reload(); await sleep(1500); await waitGame(1.5);
s = await S(); console.log("reload mid-mount", JSON.stringify(pre), JSON.stringify(s));
ok(!s.nan, "reload mid-mount: finite");
const one = await J(`({ n: TLX.state("vehicles").owned.length, cur: TLX.state("vehicles").cur, pf: [P.x, P.z].map(Math.round) })`);
ok(one.n >= 1, "truck still owned after reload (n " + one.n + ")");
// reload on foot beside the truck
await ev(`FOOT.on = false; true`); await ev(`(() => { crashCancel(); FOOT.on = true; FOOT.x = P.x + 3; FOOT.z = P.z; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`); await waitGame(1.0);
await reload(); await sleep(1500); await waitGame(1.5);
s = await S(); console.log("reload on foot", JSON.stringify(s));
ok(!s.nan, "reload on foot between: finite");
// a reload always puts you back riding (foot false above): Q then gets you OUT, by design
ok(!s.foot, "reload on foot puts you back in the pickup seat (foot " + s.foot + ")");
await tap("KeyQ"); await waitGame(0.5); for (let i = 0; i < 40 && !(await J(`({ f: FOOT.on })`)).f; i++) await waitGame(0.3);
await waitGame(1.0); s = await S(); console.log("Q after reload", JSON.stringify(s));
ok(s.foot && !s.nan, "Q after the reload gets out (foot " + s.foot + ")");
await done(fails ? 1 : 0);
