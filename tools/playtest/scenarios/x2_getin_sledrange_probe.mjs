// 2.2 probe: on foot at distances from the parked sled (with a pickup owned): hint text and whether Q boards the sled.
import { boot, ev, tap, sleep, done } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
await boot(); await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.hour = 12; WX.at = () => 0; GS.storm = 0; TLX.setOn && TLX.setOn("traffic", false); GS.cash = 60000; TLXV.buy("pickup"); true`); await sleep(800);
await ev(`(() => { try { TLXV.swapTo(null) } catch (e) {} return 1; })()`); await sleep(800);
await ev(`(() => { const r = TLX.state("vehicles").owned[0]; r.x = P.x + 80; r.z = P.z; return 1; })()`);
for (const d of [1.2, 2, 3, 4, 5]) {
  for (const side of ["front", "behind"]) {
    await ev(`(() => { crashCancel(); FOOT.on = true; FOOT.x = P.x + Math.sin(P.yaw) * ${side === "front" ? d : -d}; FOOT.z = P.z + Math.cos(P.yaw) * ${side === "front" ? d : -d}; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
    await waitGame(1.3);
    const h = await J(`({ hint: $("wnHint").textContent, use: footUse() })`);
    await tap("KeyQ"); await waitGame(0.6);
    for (let i = 0; i < 30 && (await ev(`!!MNT.on`)); i++) await waitGame(0.3);
    await waitGame(0.8);
    const after = await J(`({ foot: FOOT.on, veh: !!VEH.cur })`);
    console.log(d, side, JSON.stringify(h), "->", JSON.stringify(after));
    if (!after.foot) { await tap("KeyQ"); await waitGame(0.5); for (let i = 0; i < 40 && !(await ev(`FOOT.on`)); i++) await waitGame(0.3); await waitGame(1); }
  }
}
await done(0);
