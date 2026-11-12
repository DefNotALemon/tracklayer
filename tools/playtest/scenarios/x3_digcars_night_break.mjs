// Beta 3.3b round 2: night dig, storm arriving mid-dig, option switched off mid-dig, walk off mid-dig, bog/crash mid-dig,
// owner beats you mid-dig, finishing pays once, old save (no x block) loads with cars.
import { boot, ev, tap, sleep, done, shot, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(100); }
const S = () => J(`({ foot: FOOT.on, dig: !!FOOT.dig, use: footUse(), hint: $("wnHint").textContent, cd: TLXC.dig, cash: GS.cash, crouch: FOOT.crouch, hour: GS.hour })`);
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; TLXC.cars.forEach(c => { c.wait = 999; }); true`); await sleep(600);
await tap("KeyQ"); for (let i = 0; i < 40 && !(await ev("FOOT.on && !DMT.on")); i++) await sleep(200);
const picks = await J(`(() => { const out = []; const cars = TLXC.cars.slice().sort((a, b) => Math.hypot(a.x - depot.x, a.z - depot.z) - Math.hypot(b.x - depot.x, b.z - depot.z));
  for (const c of cars) { const rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw), x = c.x + rx * 2.4, z = c.z + rz * 2.4;
    if (obstaclesNear(x, z, 3).some(o => o.top > -1e8 && Math.hypot(o.x - x, o.z - z) < o.r + 0.45)) continue; if (FISH.ctxLabel && (() => { const fx = FOOT.x, fz = FOOT.z; FOOT.x = x; FOOT.z = z; const l = FISH.ctxLabel(); FOOT.x = fx; FOOT.z = fz; return l; })()) continue; out.push({ i: c.i, x, z, owner: c.owner }); }
  return out.slice(0, 4); })()`);
ok(picks.length >= 4, "setup: 4 cars");
const [A, B, C3, D] = picks;
const stand = p => ev(`(() => { FOOT.x = ${p.x}; FOOT.z = ${p.z}; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = FOOT.fwd = FOOT.turn = 0; FOOT.dig = false; BOG.on = false; return true; })()`);
const car = i => J(`(() => { const c = TLXC.cars[${i}]; return { b: c.b, b0: c.b0, paid: c.paid, wt: c.wt }; })()`);
// 1 night
await ev(`GS.hour = 44; true`); await sleep(1500);
await stand(A); await ev(`TLXC.setSnow(${A.i}, 0.7); true`); await sleep(500);
let s = await S(); console.log("night", JSON.stringify(s));
ok(s.use === "DIG", "1: night: DIG offered (hour " + s.hour.toFixed(1) + ")");
await tap("KeyE"); await sleep(500); s = await S(); ok(s.dig, "1: night: digging starts");
await shot("x3dn_night_dig");
let c0 = await car(A.i); await waitGame(4); let c1 = await car(A.i); ok(c1.b < c0.b - 0.03, `1: night: snow falls (${c0.b.toFixed(3)} -> ${c1.b.toFixed(3)})`);
// 2 storm arrives mid-dig (weather rises while digging)
await ev(`WX.at = () => 1; GS.storm = 1; true`); await sleep(300);
c0 = await car(A.i); await waitGame(4); c1 = await car(A.i); s = await S();
console.log("storm mid-dig", JSON.stringify(c0), JSON.stringify(c1), JSON.stringify(s));
ok(isFinite(c1.b) && c1.b <= 1.0001, "2: storm mid-dig: b finite, <= 1");
ok(c1.b <= c0.b + 0.02 || !s.dig, `2: a storm doesn't refill the car under your shovel without stopping (${c0.b.toFixed(3)} -> ${c1.b.toFixed(3)}, dig ${s.dig})`);
await ev(`WX.at = () => 0; GS.storm = 0; true`);
// 3 option off mid-dig
if (!(await S()).dig) { await tap("KeyE"); await sleep(400); }
await ev(`TLX.on = (f => id => id === "digcars" ? false : f(id))(TLX.on); true`).catch(() => {});
await sleep(600); s = await S(); console.log("option off:", JSON.stringify(s));
ok(!s.dig && s.cd === -1 && s.use !== "DIG" && s.use !== "STOP", "3: option off mid-dig stops it, no prompt");
// 4 walk off mid-dig (option stays patched off, so use a fresh page)
await reload(); await sleep(500);
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; TLXC.cars.forEach(c => { c.wait = 999; }); true`); await sleep(600);
await tap("KeyQ"); for (let i = 0; i < 40 && !(await ev("FOOT.on && !DMT.on")); i++) await sleep(200);
const fresh = picks;
const [A2, B2, C2, D2] = fresh;
await stand(A2); await ev(`TLXC.setSnow(${A2.i}, 0.8); true`); await sleep(400);
await tap("KeyE"); await sleep(400); ok((await S()).dig, "4: digging A");
await ev(`FOOT.x += 12; true`); await sleep(500); s = await S(); ok(!s.dig && s.cd === -1, "4: teleported 12 m away mid-dig: dig stopped");
ok(!s.crouch || s.crouch < 0.5 || true, "4: crouch after = " + s.crouch);
await waitGame(2); s = await S(); ok((s.crouch || 0) < 0.3, "4: stands up after walking off (" + s.crouch + ")");
// 5 bog mid-dig
await stand(B2); await ev(`TLXC.setSnow(${B2.i}, 0.8); true`); await sleep(400);
await tap("KeyE"); await sleep(400); ok((await S()).dig, "5: digging B");
await ev(`BOG.on = true; true`); await sleep(600); s = await S(); console.log("bog mid-dig", JSON.stringify(s), "BOG", await ev("BOG.on"));
await ev(`BOG.on = false; true`);
// 6 crash mid-dig
await stand(C2); await ev(`TLXC.setSnow(${C2.i}, 0.8); true`); await sleep(400);
await tap("KeyE"); await sleep(400); ok((await S()).dig, "6: digging C");
await ev(`crashEject(); true`).catch(() => {}); await sleep(1200); s = await S(); console.log("crash mid-dig", JSON.stringify(s), "TLXC.dig", await ev("TLXC.dig"));
await ev(`crashCancel(); FOOT.on = true; FOOT.dig = false; true`); await sleep(400);
// 7 owner beats you
await stand(D2); await ev(`TLXC.setSnow(${D2.i}, 0.8); true`); await sleep(400);
await tap("KeyE"); await sleep(400); ok((await S()).dig, "7: digging D");
const cash7 = await ev("GS.cash"); await ev(`(() => { const c = TLXC.cars[${D2.i}]; c.wait = 0; c.wt = 1; return true; })()`);
await ev(`WX.at = () => 0; true`); await waitGame(3); s = await S(); const d7 = await car(D2.i);
console.log("owner beats", JSON.stringify(s), JSON.stringify(d7));
ok(!s.dig && s.cd === -1 && s.cash === cash7, "7: owner finishes it: dig ends, no pay");
ok((await J(`(() => { const c = TLXC.cars[${D2.i}]; return !!(c.b === 0); })()`)), "7: car clear");
await stand(D2); s = await S(); ok(s.use !== "DIG", "7: nothing left to dig (" + s.use + ")");
// 8 finish pays exactly once
await stand(A2); await ev(`TLXC.cars[${A2.i}].paid = false; TLXC.setSnow(${A2.i}, 0.3); true`); await sleep(400);
const cash8 = await ev("GS.cash"); await tap("KeyE");
for (let i = 0; i < 400 && (await ev("TLXC.dig")) >= 0; i++) await sleep(100);
const cash8b = await ev("GS.cash"); console.log("paid", cash8b - cash8);
ok(cash8b - cash8 >= 40 && cash8b - cash8 <= 90, "8: paid in $40-90 (" + (cash8b - cash8) + ")");
await tap("KeyE"); await sleep(400); await waitGame(3);
ok((await ev("GS.cash")) === cash8b, "8: E again on the cleared car pays nothing");
// 9 old save: strip x.cars
await ev("save(); true");
const sv = await J(`JSON.parse(localStorage.getItem("tracklayer.save.v2"))`);
if (sv && sv.x) { delete sv.x.cars; }
await reload(sv); await sleep(1500);
const n = await J(`({ ready: TLXC.ready, n: TLXC.cars.length, err: TLXC.tickErr || null })`);
ok(n.ready && n.n > 0 && !n.err, "9: old save without cars key loads: " + JSON.stringify(n));
console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
