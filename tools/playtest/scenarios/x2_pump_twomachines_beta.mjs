// Beta for v292 (0369 finding 2): sled + truck parked at one pump, walk between them on foot while it fills.
// Run: tools/playtest/run.sh tools/playtest/scenarios/x2_pump_twomachines_beta.mjs
import { boot, ev, tap, sleep, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
async function waitUntil(expr, m = 14) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(100); } return false; }
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80); return 1; })()`);
const toasts = () => J(`window.__tsaw || []`);
const snap = () => J(`({ cur: TLX.state("vehicles").cur, fuel: GS.fuel, cap: GS.cap, cash: GS.cash, foot: FOOT.on, fsL: FS.L, spot: !!FS.spot, owned: TLX.state("vehicles").owned.map(o => ({ uid: o.uid, fuel: o.fuel, x: o.x, z: o.z })) })`);

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.cash = 20000; garageTab = "trucks"; openGarage(); true`); await sleep(400);
await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(500);
const U = await J(`TLX.state("vehicles").owned[0].uid`);
console.log("owned at start", JSON.stringify((await snap()).owned));
// truck at pump, low tank, step out
await ev(`(() => { const s = TLX.state("vehicles"); TLXV.swapTo && 0; return 1; })()`);
await ev(`(() => { const t = STATIONS.find(t => t.x !== undefined); window.__pump = t; P.x = t.x; P.z = t.z; P.yaw = 1.57; P.y = surf(P.x, P.z); P.vx = P.vz = 0; recenter(P.x, P.z, true); GS.fuel = 1; GS.cash = 1000; return 1; })()`);
await sleep(800); await clearToasts();
const s0 = await snap(); console.log("seated at pump", JSON.stringify(s0));
await ev("GS.fuel = 1"); await sleep(300); await clearToasts(); await tap("KeyQ"); ok(await waitUntil("!DMT.on && FOOT.on", 14), "got out at pump");
await waitGame(0.5);
const s1 = await snap(); console.log("on foot", JSON.stringify(s1));
// walk 3 m onto the sled's position: put the sled record beside the pump
await ev(`(() => { const s = TLX.state("vehicles"); const t = window.__pump; for (const o of s.owned) if (o.uid === "${U}") { o.x = t.x + 2.5; o.z = t.z + 2.5; o.fuel = 20; } return 1; })()`);
const sledRec = (await snap()).owned;
console.log("owned now", JSON.stringify(sledRec));
await ev(`(() => { const t = window.__pump; FOOT.x = t.x + 2.2; FOOT.z = t.z + 2.2; FOOT.y = surf(FOOT.x, FOOT.z); recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await waitGame(3);
const s2 = await snap(); console.log("beside 2nd", JSON.stringify(s2));
await waitGame(1); const mid = await snap(); console.log("mid", JSON.stringify(mid)); await waitUntil("!FS.spot", 40); await waitGame(2);
const ts = await toasts(); console.log("toasts", JSON.stringify(ts));
const cap = await ev("GS.cap");
for (const t of ts) { const m = t.match(/([\d.]+) L/); if (m) ok(+m[1] <= cap + 0.5, `toast litres ${m[1]} <= tank ${cap}: ${t.slice(0, 40)}`); }
const s3 = await snap(); console.log("end", JSON.stringify(s3));
ok(s3.owned.every(o => o.fuel === undefined || (Number.isFinite(o.fuel) && o.fuel >= 0)), "no NaN fuel in records");
ok(Number.isFinite(s3.cash) && s3.cash >= 0, "cash sane " + s3.cash);
console.log(fails ? "FAILS " + fails : "ALL OK");
await done(fails ? 1 : 0);
