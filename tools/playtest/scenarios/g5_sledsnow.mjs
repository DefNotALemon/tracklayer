// Snow on the sled: fills with snowfall (rate and ceiling scale with WX.at), melts when warm / engine hot, sheds at speed,
// throws run-off particles. Asserts + stills (light vs storm vs melting). Run: tools/playtest/run.sh tools/playtest/scenarios/g5_sledsnow.mjs
import { boot, ev, shot, sideCam, camOff, park, sleep, done } from "../lib.mjs";
let bad = 0; const ck = (ok, msg) => { console.log((ok ? "ok   " : "FAIL ") + msg); if (!ok) bad = 1; };
await boot();
await ev("tutSkip(); FOOT.on = false; VEH.cur = null; crashCancel(); GS.hour = 34; true"); await sleep(500);
console.log("parked", JSON.stringify(await park()));
await ev("FOOT.on = false; true"); await sleep(1500);
const gc = () => ev("gameClock");
const S = async () => JSON.parse(await ev("JSON.stringify({h:SNS.h,t:SNS.t,air:SNS.air,fit:SNS.key,zone:!!SNS.zone,hv:SNS.hood&&SNS.hood.visible,tv:SNS.tail&&SNS.tail.visible,sp:Math.hypot(P.vx,P.vz)})"));
let pin = true;   // a parked sled can creep down a slope; hold it still unless a step drives it
async function wait(secs, fn) { const t0 = await gc(); while ((await gc()) - t0 < secs) { await sleep(250); if (pin) await ev("P.vx = P.vz = 0; true"); if (fn) await fn(); } }
await ev("window.__wx = 0; WX.at = () => window.__wx; SNS.h = SNS.t = 0; true");
await sideCam("[P.x, P.y + 0.7, P.z]", 2.7, 1.5, 0.75);
await wait(1);
const s0 = await S(); console.log("clear", JSON.stringify(s0)); ck(s0.zone && s0.h === 0, "clear sky leaves the sled clean (fitted)");
// light snow
await ev("window.__wx = 0.3; true");
await wait(8); const l8 = await S();
await wait(40); const l48 = await S();
console.log("light 8s/48s", JSON.stringify(l8), JSON.stringify(l48));
ck(l8.h > 0 && l8.h < 0.2, "light snow starts a dusting");
ck(l48.h > l8.h && l48.h < 0.35, "light snow stays thin (h=" + l48.h.toFixed(2) + ")");
await shot("01_light"); await ev("window.__wx = 0.3; true");
await ev("window.__shotL = JSON.stringify({h:SNS.h});true");
// storm
await ev("SNS.h = SNS.t = 0; window.__wx = 1; true");
await wait(8); const s8 = await S(); await shot("02_storm_8s");
await wait(16); const s24 = await S(); await shot("03_storm_24s");
console.log("storm 8s/24s", JSON.stringify(s8), JSON.stringify(s24));
ck(s8.h > l8.h * 2, `storm builds faster than light (8 s: ${s8.h.toFixed(2)} vs ${l8.h.toFixed(2)})`);
ck(s24.h > 0.8 && s24.h > l48.h * 2.5, `storm ends thicker (${s24.h.toFixed(2)} vs light ${l48.h.toFixed(2)})`);
ck(s24.hv && s24.tv, "hood and tail caps visible");
// riding speed sheds / blows it off: drive the sled forward
await ev("window.__wx = 1; true");
await ev("P.vx = Math.sin(P.yaw) * 20; P.vz = Math.cos(P.yaw) * 20; true");
const h0 = (await S()).h; await ev("SNS.h = 1; SNS.t = 1; true");
pin = false;
await wait(6, async () => { await ev("P.vx = Math.sin(P.yaw) * 20; P.vz = Math.cos(P.yaw) * 20; true"); });
const sm = await S(); console.log("fast in storm", JSON.stringify(sm));
ck(sm.h < 0.5, `speed in a storm blows it off / blocks fill (h=${sm.h.toFixed(2)})`);
pin = true; await ev("P.vx = P.vz = 0; true");
// frost + hot engine: hood melts faster than tail, no sky melt
await ev("window.__wx = 0; SNS.h = SNS.t = 0.8; HEAT.t = 100; true"); await sleep(300);
const f0 = await S(); await wait(6, () => ev("HEAT.t = 100; true")); const f1 = await S();
console.log("hot engine frost", JSON.stringify(f0), JSON.stringify(f1));
ck(f1.h < f0.h - 0.1 && f1.h < f1.t, `engine heat melts the hood first (hood ${f1.h.toFixed(2)} < tail ${f1.t.toFixed(2)})`);
// cold, cool engine, no snowfall: holds
await ev("SNS.h = SNS.t = 0.8; HEAT.t = 45; true"); await wait(6, () => ev("HEAT.t = 45; true")); const c1 = await S();
console.log("frost idle", JSON.stringify(c1)); ck(c1.air < -1 && c1.h > 0.78, `below freezing and cold it just sits (air ${c1.air.toFixed(1)}C, h=${c1.h.toFixed(2)})`);
// warm: melts, with run-off particles
await ev("CAL.off = 24 * 200; SNS.h = SNS.t = 1; HEAT.t = 45; true"); await sleep(300);
await shot("04_warm_start");
const w0 = await S(); let live = 0, maxLive = 0;
await wait(3, async () => { const n = +(await ev("(() => { let c = 0; for (let i = 0; i < SPN; i++) if (spLife[i] > 0) c++; return c; })()")); maxLive = Math.max(maxLive, n); });
await shot("05_warm_3s"); await wait(25); const w1 = await S(); await shot("06_warm_28s");
console.log("warm", JSON.stringify(w0), JSON.stringify(w1), "max live particles", maxLive);
ck(w0.air > 1 && w1.h < 0.5, `warm air (${w0.air.toFixed(1)}C) melts it off (${w0.h.toFixed(2)} -> ${w1.h.toFixed(2)})`);
ck(maxLive > 3 && maxLive < 250, `run-off emits a few particles (peak live ${maxLive})`);
console.log("page errors check follows");
await done(bad);
