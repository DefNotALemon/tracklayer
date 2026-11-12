// Beta 3.3b: stand at the dig spot of EVERY parked car with a deep drift: is DIG offered? Lists the cars where it isn't and why.
import { boot, ev, tap, sleep, done } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; TLXC.cars.forEach(c => { c.wait = 999; }); true`); await sleep(800);
await tap("KeyQ"); for (let i = 0; i < 40 && !(await ev("FOOT.on && !DMT.on")); i++) await sleep(200);
const n = await ev("TLXC.cars.length"); const bad = []; let good = 0;
for (let i = 0; i < n; i++) {
  const r = await J(`(() => { const c = TLXC.cars[${i}]; TLXC.setSnow(${i}, 0.9); FOOT.dig = false; BOG.on = false; FOOT.x = c.x + Math.cos(c.yaw) * 2.4; FOOT.z = c.z - Math.sin(c.yaw) * 2.4; FOOT.y = surf(FOOT.x, FOOT.z);
    return { i: ${i}, use: footUse(), near: TLXC.digNear() ? TLXC.digNear().i ?? true : null, fish: (FISH.ctxLabel && FISH.ctxLabel()) || null, x: Math.round(c.x), z: Math.round(c.z), dDepot: Math.round(Math.hypot(c.x - depot.x, c.z - depot.z)), sled: Math.round(Math.hypot(P.x - FOOT.x, P.z - FOOT.z)) }; })()`);
  await sleep(120);
  const r2 = await J(`({ use: footUse(), hint: $("wnHint").textContent })`);
  if (r2.use === "DIG") good++; else bad.push({ ...r, use2: r2.use, hint: r2.hint });
}
console.log(`DIG offered at ${good}/${n} cars`);
for (const b of bad) console.log("NO DIG", JSON.stringify(b));
await done(bad.length ? 1 : 0);
