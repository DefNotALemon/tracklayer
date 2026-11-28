// Beta 11.1b hunting: try to break it. Out-of-order things: scope + lower via crash/tablet/mount, reload mid-aim,
// smaller magazine fitted while shouldered, settings open while shouldered, night scope shot, round conservation.
import { boot, ev, tap, sleep, done, shot, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function ready() { for (let i = 0; i < 120; i++) { await sleep(150); try { if (await ev(`typeof TLXGUN !== "undefined" && !!TLXGUN.state() && started`)) { await sleep(400); return true; } } catch (e) {} } return false; }
async function until(expr, secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) { if (await ev(expr)) return true; await sleep(80); } return !!(await ev(expr)); }
const snap = () => J(`(() => { const a = TLXGUN.AIM, g = TLXGUN.gun(), h = $("gunHud"); return { on: a.on, rounds: g && g.rounds, ammo: TLXGUN.state().ammo, hud: !!h && !h.hidden, fov: camera.fov, walker: !!(FOOT.g && FOOT.g.visible), foot: FOOT.on, vm: !!(a.vm && a.vm.visible), crash: CRASH.on }; })()`);
async function shoulder() { await tap("KeyL"); return until("TLXGUN.AIM.on && TLXGUN.AIM.t >= 1", 4); }
async function settleFov(want, secs = 3) { const t0 = await clock(); while ((await clock()) - t0 < secs) { const s = await snap(); if (Math.abs(s.fov - want) < 1) return s; await sleep(100); } return snap(); }

await boot();
await ev(`tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.hour = 36; TLX.setOn("wounds", false); GS.cash = 20000; true`); await sleep(400);
await ev(`(() => { WILD.max = 0; for (const G of WILD.groups) for (const q of G.m) wildFree(q); WILD.groups.length = 0; return true; })()`);
await ev(`TLXGUN.takeCourse(); TLXGUN.buyRifle("bolt308"); TLXGUN.buyAmmo(); TLXGUN.buyAmmo(); TLXGUN.buyAmmo(); true`);
const baseFov = await ev("camera.fov");
const spot = await J(`(() => { const W = { x: depot.x, z: depot.z };
  for (let r = 500; r < 2600; r += 60) for (let an = 0; an < 6.28; an += 0.35) {
    const x = W.x + Math.cos(an) * r, z = W.z + Math.sin(an) * r;
    if (Math.abs(x) > HALF - 400 || Math.abs(z) > HALF - 400 || isSea(x, z) || isWater(x, z) || obNear(x, z, 12)) continue;
    FOOT.x = x; FOOT.z = z; if (TLXGUN.slungWhy()) continue;
    FOOT.on = true; FOOT.y = surf(x, z); FOOT.yaw = 0; P.x = x + 5; P.z = z; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(x, z, true); camState.init = false; return { x: Math.round(x), z: Math.round(z) }; }
  return null; })()`);
console.log("spot", JSON.stringify(spot)); ok(!!spot, "found open fell"); if (!spot) await done(1);
await sleep(900);
console.log("base fov", baseFov);

// 1. scope fitted: lower via tablet; fov must return to the game's own
await ev(`TLXGUN.buyPart("sight","scope39"); TLXGUN.fit("sight","scope39", true); true`);
ok(await shoulder(), "1: shouldered with the scope"); await sleep(600);
let s = await snap(); ok(s.fov < 15, "1: scoped fov " + s.fov.toFixed(1));
await shot("01_scope");
await ev("TABLET.toggle(true, 'map'); true"); await sleep(600);
s = await snap(); ok(!s.on && !s.hud, "1: tablet lowers it, hud gone");
await ev("TABLET.toggle(false); true"); s = await settleFov(baseFov, 4);
ok(Math.abs(s.fov - baseFov) < 1 && s.walker, `1: after tablet closes fov back (${s.fov.toFixed(1)} vs ${baseFov}) and walker visible ${s.walker}`);

// 2. crash while shouldered
ok(await shoulder(), "2: shouldered again"); 
await ev(`crashEject('test', 0, 1, 12, null); true`); await sleep(900);
s = await snap(); console.log("2", JSON.stringify(s));
ok(!s.on && !s.hud && !s.vm, "2: crash lowers it, no hud/viewmodel left");
await ev("crashCancel(); true"); await sleep(500);
s = await settleFov(baseFov, 4); ok(Math.abs(s.fov - baseFov) < 1, "2: fov back after crash " + s.fov.toFixed(1));

// 3. mount while shouldered
await ev(`crashCancel(); FOOT.on = true; FOOT.x = ${spot.x}; FOOT.z = ${spot.z}; true`); await sleep(400);
ok(await shoulder(), "3: shouldered"); 
await tap("KeyQ"); await sleep(300);
await until("!FOOT.on || !TLXGUN.AIM.on", 3);
await sleep(3500);
s = await snap(); console.log("3", JSON.stringify(s));
ok(!s.on && !s.hud, "3: mounting lowers it; hud gone");
s = await settleFov(baseFov, 3); ok(Math.abs(s.fov - baseFov) < 3, "3: fov sane after mounting " + s.fov.toFixed(1));
await ev(`FOOT.on = true; FOOT.x = ${spot.x}; FOOT.z = ${spot.z}; MNT.on = false; true`); await sleep(500);
// try shouldering while riding
await ev(`FOOT.on = false; true`); await tap("KeyL"); await sleep(400);
s = await snap(); ok(!s.on, "3b: L while riding does not shoulder");
await ev(`FOOT.on = true; true`); await sleep(300);

// 4. smaller magazine fitted while shouldered (cap 10 -> 3): total rounds conserved
await ev(`TLXGUN.buyPart("magazine","det10"); TLXGUN.fit("magazine","det10", true); true`);
ok(await shoulder(), "4: shouldered with 10-round mag");
ok(await until("TLXGUN.gun().rounds >= 6", 8), "4: magazine fills to " + (await snap()).rounds);
const before = await snap(); const tot0 = before.rounds + before.ammo;
await ev(`TLXGUN.fit("magazine","int3", true); true`); await sleep(1200);
s = await snap(); const tot1 = s.rounds + s.ammo;
ok(tot0 === tot1 && s.rounds <= 3, `4: rounds conserved ${tot0} -> ${tot1}, mag now ${s.rounds}`);

// 5. settings open while shouldered: does E still fire?
await ev(`TLXGUN.fit("magazine","det10", true); true`); await sleep(1500);
const r0 = (await snap()).rounds;
await ev(`$("settings").hidden = false; true`); await sleep(300);
await tap("KeyE"); await sleep(500);
const r1 = (await snap()).rounds;
console.log("5 rounds", r0, "->", r1);
ok(r1 === r0, "5: E with the settings panel open does not fire the rifle (" + r0 + " -> " + r1 + ")");
await ev(`$("settings").hidden = true; true`);

// 6. reload mid-aim
const pre = await snap(); const tot2 = pre.rounds + pre.ammo;
await reload(); ok(await ready(), "6: page back after reload");
s = await snap(); console.log("6", JSON.stringify(s));
ok(!s.on && !s.hud, "6: reload comes back slung, no hud");
ok(Math.abs(s.fov - baseFov) < 1, "6: fov normal after reload " + s.fov.toFixed(1));
ok(s.rounds + s.ammo === tot2, `6: rounds conserved over reload ${tot2} -> ${s.rounds + s.ammo}`);
await shot("06_reload");

// 7. night, scope up: it still shoulders and the hud reads
await ev(`tutSkip(); GS.hour = 26; WX.at = () => 0; true`); await sleep(500);
await ev(`FOOT.on = true; FOOT.x = ${spot.x}; FOOT.z = ${spot.z}; FOOT.y = surf(FOOT.x, FOOT.z); true`); await sleep(500);
ok(await shoulder(), "7: night: shouldered"); await sleep(500); await shot("07_night");
s = await snap(); ok(s.on && s.hud, "7: night hud up");
await tap("KeyL"); await sleep(400);
console.log("fails", fails);
await done(fails ? 1 : 0);
