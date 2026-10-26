// G2: the "Fuel low" / "Battery low" warning should not fire where you are being refilled for free (the quay,
// the garage), and must still fire out in the backcountry. Parks a Frontier and an Aurora E at 10% fuel at each
// spot for ~5 game-s and counts low-fuel toasts. Also: leaving the quay still under 20% → warns once out there.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_lowfuel_warn.mjs
import { boot, ev, done, sleep } from "../lib.mjs";
await boot();
await ev(`(() => { GS.own.sleds = SLEDS.map(x => x.id); GS.cash = 5000; GS.delivered = 70; window.__toasts = []; const t0 = toast; toast = (m, k) => { window.__toasts.push(m); return t0(m, k); }; WX.at = () => 0; GS.storm = 0; return 1; })()`);
const spots = JSON.parse(await ev(`JSON.stringify([
  { name: "quay", x: depot.x + 4, z: depot.z + 4 },
  { name: "garage", x: garageSite.x + 4, z: garageSite.z + 4 },
  { name: "backcountry", x: SPAWN.x + 900, z: SPAWN.z + 300 } ])`));
const lowRe = "/(Fuel|Battery) low/";
async function park(id, s, frac) {
  await ev(`(() => { if (FS.spot) fuelEnd("left"); GS.own.sled = "${id}"; restat(); P.x = ${s.x}; P.z = ${s.z}; P.vx = P.vz = 0; recenter(P.x, P.z, true); P.y = surf(P.x, P.z) + 0.3; GS.fuel = GS.cap * ${frac}; GS.lowWarned = false; window.__toasts = []; window.__t0 = gameClock; return 1; })()`);
  for (let i = 0; i < 40; i++) { await sleep(400); if (+(await ev(`gameClock - window.__t0`)) > 5) break; }
  return JSON.parse(await ev(`JSON.stringify({ n: window.__toasts.filter(t => ${lowRe}.test(t)).length, near: GS.near ? GS.near.name : null, pct: Math.round(100 * GS.fuel / GS.cap), first: window.__toasts.filter(t => ${lowRe}.test(t))[0] || "" })`));
}
for (const id of ["frontier", "aurora"]) {
  for (const s of spots) {
    const r = await park(id, s, 0.10);
    console.log(`${id.padEnd(9)} @ ${s.name.padEnd(11)} low-warn toasts: ${r.n}  near=${r.near} fuel ${r.pct}% | ${r.first}`);
  }
}
// Leave the quay still low: refuel cut short, then teleport out. Expect exactly one warning out there.
await park("frontier", spots[0], 0.05);
await ev(`(() => { GS.fuel = GS.cap * 0.1; P.x = ${spots[2].x}; P.z = ${spots[2].z}; recenter(P.x, P.z, true); P.y = surf(P.x, P.z) + 0.3; window.__toasts = []; window.__t0 = gameClock; return 1; })()`);
for (let i = 0; i < 40; i++) { await sleep(400); if (+(await ev(`gameClock - window.__t0`)) > 4) break; }
console.log("left quay low → backcountry low-warn toasts:", await ev(`window.__toasts.filter(t => ${lowRe}.test(t)).length`));
await done();
