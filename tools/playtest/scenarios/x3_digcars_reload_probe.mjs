// probe: after reload() is digging still offered at a buried car?
import { boot, ev, tap, sleep, done, reload } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await reload(); await sleep(500);
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; TLXC.cars.forEach(c => { c.wait = 999; }); true`); await sleep(600);
console.log("state", JSON.stringify(await J(`({ foot: FOOT.on, opt: TLX.on("digcars"), ready: TLXC.ready, n: TLXC.cars.length })`)));
await tap("KeyQ"); await sleep(3000);
console.log("after Q", JSON.stringify(await J(`({ foot: FOOT.on, mnt: MNT.on, dmt: DMT.on, riding: !FOOT.on })`)));
await ev(`FOOT.on = true; true`);
const c = await J(`(() => { const c = TLXC.cars[0]; return { x: c.x + Math.cos(c.yaw) * 2.4, z: c.z - Math.sin(c.yaw) * 2.4, i: c.i }; })()`);
await ev(`(() => { FOOT.x = ${c.x}; FOOT.z = ${c.z}; FOOT.y = surf(FOOT.x, FOOT.z); TLXC.setSnow(${c.i}, 0.8); return true; })()`); await sleep(800);
console.log("at car", JSON.stringify(await J(`({ use: footUse(), near: !!TLXC.digNear(), foot: FOOT.on, hint: $("wnHint").textContent })`)));
await done(0);
