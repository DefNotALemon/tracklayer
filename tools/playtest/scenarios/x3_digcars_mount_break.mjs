// Beta 3.3b: press Q (get on) while digging a car beside the sled; and stale hint after stop.
import { boot, ev, tap, sleep, done, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const S = () => J(`({ foot: FOOT.on, dig: !!FOOT.dig, mnt: MNT.on, cd: TLXC.dig, use: footUse(), hint: $("wnHint").textContent, b: TLXC.cars[TLXC.dig >= 0 ? TLXC.dig : 0].b })`);
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; TLXC.cars.forEach(c => { c.wait = 999; }); true`); await sleep(600);
await tap("KeyQ"); for (let i = 0; i < 40 && !(await ev("FOOT.on && !DMT.on")); i++) await sleep(200);
const A = await J(`(() => { const cars = TLXC.cars.slice().sort((a, b) => Math.hypot(a.x - depot.x, a.z - depot.z) - Math.hypot(b.x - depot.x, b.z - depot.z));
  for (const c of cars) { const x = c.x + Math.cos(c.yaw) * 2.4, z = c.z - Math.sin(c.yaw) * 2.4; const fx = FOOT.x, fz = FOOT.z; FOOT.x = x; FOOT.z = z; const l = FISH.ctxLabel(); FOOT.x = fx; FOOT.z = fz;
    if (!l && !obstaclesNear(x, z, 3).some(o => o.top > -1e8 && Math.hypot(o.x - x, o.z - z) < o.r + 0.45)) return { i: c.i, x, z }; } return null; })()`);
// sled parked 1.5 m from the walker (beside the car)
await ev(`(() => { FOOT.x = ${A.x}; FOOT.z = ${A.z}; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; P.x = FOOT.x + 1.6; P.z = FOOT.z; P.vx = P.vz = 0; return true; })()`); await sleep(500);
await ev(`TLXC.setSnow(${A.i}, 0.7); true`); await sleep(300);
await tap("KeyE"); await sleep(1500); let s = await S(); console.log("digging:", JSON.stringify(s)); ok(s.dig, "digging beside sled");
await tap("KeyQ"); await sleep(600); s = await S(); console.log("0.6 s after Q:", JSON.stringify(s));
for (let i = 0; i < 30 && (await ev("FOOT.on")); i++) await sleep(200);
s = await J(`({ foot: FOOT.on, dig: !!FOOT.dig, cd: TLXC.dig, mnt: MNT.on, crouch: FOOT.crouch, v: Math.hypot(P.vx||0,P.vz||0) })`); console.log("after mount:", JSON.stringify(s));
ok(!s.dig && s.cd === -1, "mounted: dig flag and TLXC.dig cleared");
await sleep(500); const b0 = await ev(`TLXC.cars[${A.i}].b`); await sleep(1500); const b1 = await ev(`TLXC.cars[${A.i}].b`);
ok(Math.abs(b0 - b1) < 0.002, `car not still being dug while riding (${b0} -> ${b1})`);
await shot("x3dcm_end");
console.log(fails ? `${fails} FAILED` : "all passed"); await done(fails ? 1 : 0);
