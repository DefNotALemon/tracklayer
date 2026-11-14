// Beta break-it pass for 14.1 (skiff): second boat / third refused, empty tank, storm at night, Q spam mid step-in,
// reload mid step-in, reset (N) on water, jetty piles, boat->walk->sled switching. Reports findings, exits 0 always
// (read the FINDING lines). Everything by gameClock.
import { boot, ev, tap, sleep, done, reload, down, up } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
const F = (t, m) => console.log(`${t} ${m}`);
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
async function waitUntil(expr, maxGame = 12) { const t0 = await clock(); while ((await clock()) - t0 < maxGame) { if (await ev(expr)) return true; await sleep(150); } return false; }
const holdFor = async (codes, secs, fn) => { codes = [].concat(codes); for (const c of codes) await down(c); const t0 = await clock(), out = [];
  try { for (;;) { await sleep(250); const t = await clock(); out.push(await fn()); if (t - t0 >= secs) break; } } finally { for (const c of codes) await up(c); } return out; };
const B = () => J(`{ t: +gameClock.toFixed(2), v: +Math.hypot(P.vx, P.vz).toFixed(2), x: P.x, z: P.z, y: +P.y.toFixed(3), dep: +TLXB.depthAt(P.x, P.z).toFixed(2), foot: FOOT.on, fuel: GS.fuel, sea: isSea(P.x, P.z) }`);
const dockW = (u, v) => `(() => { const D = TLXB.DOCKS[0], fx = Math.sin(D.yaw), fz = Math.cos(D.yaw); return [D.x + fz * (${v}) + fx * (${u}), D.z - fx * (${v}) + fz * (${u})]; })()`;
const buy = async () => { await ev(`garageTab = "boats"; openGarage(); true`); await sleep(500); await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400); await ev(`closeGarage(); true`); };

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.cash = 20000; true`);

// A. buy three
await buy(); await buy();
let n = await J(`TLX.state("vehicles").owned.filter(r => r.id === "skiff").map(r => ({ x: r.x, z: r.z, dep: TLXB.depthAt(r.x, r.z) }))`);
F("INFO", "skiffs after 2 buys: " + JSON.stringify(n));
const cash2 = await ev("GS.cash");
await buy();
n = await J(`TLX.state("vehicles").owned.filter(r => r.id === "skiff").length`);
const cash3 = await ev("GS.cash");
F(n === 2 && cash3 === cash2 ? "ok" : "FINDING BUG", `third buy: ${n} skiffs, cash ${cash2} -> ${cash3} (max 2 expected, no charge)`);
const sep = n === 2 ? 0 : 0;
const two = await J(`TLX.state("vehicles").owned.filter(r => r.id === "skiff")`);
if (two.length === 2) F(Math.hypot(two[0].x - two[1].x, two[0].z - two[1].z) > 2 ? "ok" : "FINDING BUG", `berths separate: ${Math.hypot(two[0].x - two[1].x, two[0].z - two[1].z).toFixed(1)} m apart`);

// B. Q spam mid step-in then reload mid step-in
const step = async () => { const b = two[0]; const p = await J(`(() => { const D = TLXB.DOCKS[0], fx = Math.sin(D.yaw), fz = Math.cos(D.yaw); const s = Math.sign((${b.x} - D.x) * fz - (${b.z} - D.z) * fx); return [${b.x} - fz * s * 1.4, ${b.z} + fx * s * 1.4]; })()`);
  await ev(`(() => { crashCancel(); FOOT.on = true; FOOT.x = ${p[0]}; FOOT.z = ${p[1]}; FOOT.y = walkFloor(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`); await sleep(1200); };
await step();
F("INFO", "near hint: " + (await ev(`$("wnHint").textContent`)));
await tap("KeyQ"); await sleep(200); await tap("KeyQ"); await sleep(150); await tap("KeyQ"); await sleep(150);
await waitUntil("!MNT.on && !DMT.on", 10); await sleep(500);
let s = await J(`({ foot: FOOT.on, pin: VEH.cur && VEH.cur.pin, mnt: MNT.on, dmt: DMT.on, walker: FOOT.g.visible, drv: TLXV.rt().drvBody.visible })`);
F(s.mnt || s.dmt || (s.foot === s.drv) ? "FINDING BUG" : "ok", "Q spam x3 settles: " + JSON.stringify(s));
// settle to a known state: foot
if (!s.foot) { await tap("KeyQ"); await waitUntil("!DMT.on", 10); await sleep(500); }
await step(); await tap("KeyQ"); await waitGame(0.6);
const midIn = await ev("MNT.on");
await ev("save(); true"); await reload(); await sleep(1200);
s = await J(`({ foot: FOOT.on, pin: VEH.cur && VEH.cur.pin, mnt: MNT.on, walker: FOOT.g.visible, drv: TLXV.rt() && TLXV.rt().drvBody && TLXV.rt().drvBody.visible, y: P.y, dep: TLXB.depthAt(P.x, P.z), cur: TLX.state("vehicles").cur })`);
F("INFO", `reload mid-step-in (was mid: ${midIn}): ` + JSON.stringify(s));
const ok1 = !s.mnt && (s.foot ? s.walker : !s.walker);
F(ok1 ? "ok" : "FINDING BUG", "reload mid step-in leaves a consistent state (no ghost walker/driver)");

// C. empty tank
await ev(`crashCancel(); true`);
if (await ev("FOOT.on")) { await step(); await tap("KeyQ"); await waitUntil("!MNT.on", 10); await sleep(400); }
await ev(`GS.fuel = 0; true`); await sleep(300);
let r = await holdFor("KeyW", 3, B);
F(r[r.length - 1].v < 1 ? "ok" : "FINDING BUG", `empty tank, W 3 s: ${r[r.length - 1].v} m/s (fuel ${r[r.length - 1].fuel})`);
const hint = await ev(`document.body.innerText.match(/out of fuel|empty|no fuel/i)`);
F("INFO", "any out-of-fuel text on screen: " + JSON.stringify(hint));
await ev(`GS.fuel = 20; true`);

// D. storm at night, full speed
F("INFO", "pre-storm state " + JSON.stringify(await J(`({ mnt: MNT.on, dmt: DMT.on, foot: FOOT.on, pin: VEH.cur && VEH.cur.pin, fuel: GS.fuel, y: P.y, v: Math.hypot(P.vx,P.vz), help: HELP.on, crash: CRASH.on, god: GS.garageOpen })`)));
await ev(`GS.hour = 36; GS.storm = 1; true`); await sleep(500);
r = await holdFor("KeyW", 10, B);
const ys = r.map(o => o.y), v = r.map(o => o.v);
F(Math.min(...ys) > -0.9 && Math.max(...ys) < 1.0 && r.every(o => o.sea && !o.foot) ? "ok" : "FINDING BUG", `night storm run: y ${Math.min(...ys)}..${Math.max(...ys)}, top ${Math.max(...v)} m/s, always sea ${r.every(o => o.sea)}`);
const nanC = await ev(`[camera.position.x, camera.position.y, camera.position.z, camera.quaternion.x].some(isNaN)`);
F(nanC ? "FINDING BLOCKER" : "ok", "camera finite in storm: " + !nanC);

// E. reset (N) on water, then on a forced land spot
await ev(`GS.storm = 0; true`);
await tap("KeyN"); await sleep(800);
s = await B(); F("INFO", "after N on water: " + JSON.stringify(s));
// teleport onto land inland of the quay and hit N
await ev(`(() => { const D = TLXB.DOCKS[0]; P.x = depot.x; P.z = depot.z + 40; P.vx = P.vz = 0; return 1; })()`); await sleep(800);
s = await B(); F(s.dep > 0.2 ? "ok" : "FINDING BUG", "boat teleported to land: " + JSON.stringify(s) + " (relaunch to water expected)");
await waitGame(2); s = await B();
const landed = await J(`({ sea: isSea(P.x, P.z), dep: TLXB.depthAt(P.x, P.z), y: P.y, gy: surf(P.x, P.z) })`);
F(landed.dep > 0.2 ? "ok" : "FINDING BUG", "boat placed on land gets relaunched: " + JSON.stringify(landed));

// F. drive into the jetty piles at speed
await ev(`(() => { const D = TLXB.DOCKS[0], fx = Math.sin(D.yaw), fz = Math.cos(D.yaw); const x = D.x + fx * (D.len + 12), z = D.z + fz * (D.len + 12); P.x = x; P.z = z; P.yaw = D.yaw + Math.PI; P.vx = P.vz = 0; return 1; })()`);
await waitGame(0.8);
r = await holdFor("KeyW", 8, B);
const through = await J(`(() => { const D = TLXB.DOCKS[0], fx = Math.sin(D.yaw), fz = Math.cos(D.yaw); return { u: (P.x - D.x) * fx + (P.z - D.z) * fz, floor: TLXB.floorAt(P.x, P.z) }; })()`);
F("INFO", "jetty head-on: " + JSON.stringify(through) + " min v " + Math.min(...r.map(o => o.v)));
F(through.u > 1 ? "ok" : "FINDING BUG", "boat did not tunnel through the jetty (u=" + through.u.toFixed(1) + " m along the jetty from root)");

// G. out, buy a sled swap: get out, sled still there, can get on it
await ev(`(() => { const D = TLXB.DOCKS[0]; const b = TLXB.berthOK(D, 1) ? TLXB.berthPose(D, 1) : TLXB.berthPose(D, -1); P.x = b.x; P.z = b.z; P.yaw = b.yaw; P.vx = P.vz = 0; return 1; })()`);
await waitGame(0.8); await tap("KeyQ"); await waitUntil("!DMT.on && FOOT.on", 10); await sleep(500);
await ev(`(() => { const s = TLX.state("vehicles"); return 1; })()`);
const rec = await J(`TLX.state("vehicles").owned.filter(r => r.id === "skiff").map(r => ({ x: Math.round(r.x), z: Math.round(r.z) }))`);
F("INFO", "after stepping out, skiff records " + JSON.stringify(rec));
// teleport walker to the sled park (depot) and see the hint
await ev(`(() => { FOOT.x = depot.x + 6; FOOT.z = depot.z + 6; FOOT.y = walkFloor(FOOT.x, FOOT.z); recenter(FOOT.x, FOOT.z, true); return 1; })()`); await sleep(1000);
F("INFO", "walker at depot hint: " + (await ev(`$("wnHint").textContent`)) + " | cur=" + (await ev(`JSON.stringify(TLX.state("vehicles").cur)`)));
// H. map pin
const pin = await ev(`typeof BLIP_COL !== "undefined" ? 1 : 0`);
console.log("done");
await done(0);
