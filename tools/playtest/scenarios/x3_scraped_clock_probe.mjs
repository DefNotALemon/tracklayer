// probe: does GS.hour stick when set to May/June and back to January? what does the calendar say?
import { boot, ev, sleep, done } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; true`); await sleep(1000);
const rd = async tag => console.log(tag, JSON.stringify(await J(`({ h: +GS.hour.toFixed(1), lab: CAL.now().label, m: CAL.now().m, temp: TLXR.scrTemp(), wxT: WX.temp(CAL.now().m) })`)));
for (const h of [24 * 195 + 12, 24 * 226 + 12, 24 * 65 + 11]) { await ev(`GS.hour = ${h}; true`); await sleep(1500); await rd("set " + h); await sleep(3000); await rd("  +3s"); }
await done(0);
