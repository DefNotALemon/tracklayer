// 10.1 beta: plant ONE corrupt gear state (env GEAR=json) in x.sys.gear and see whether the game boots. Exit 1 if not.
import { boot, reload, ev, sleep, done, errors } from "../lib.mjs";
await boot();
const base = JSON.parse(await ev(`JSON.stringify((() => { save(); return JSON.parse(localStorage.getItem("tracklayer.save.v2")); })())`));
const g = JSON.parse(process.env.GEAR);
base.x = base.x || {}; base.x.sys = base.x.sys || {}; base.x.sys.gear = { v: 1, s: g };
let okBoot = true;
try { await reload(base); await sleep(800); } catch (e) { okBoot = false; console.log("reload threw", String(e).slice(0, 200)); }
if (okBoot) console.log("state", await ev(`JSON.stringify({ t: TT.mode, g: window.TLXG && TLXG.state(), w: ST.warm })`));
console.log(okBoot ? "ok   boots" : "FAIL no boot with gear state " + process.env.GEAR);
await done(okBoot ? 0 : 1);
