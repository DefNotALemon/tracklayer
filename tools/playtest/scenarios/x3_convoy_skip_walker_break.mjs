// Beta break-it 3.5c1: time skip over a shut road and a plowed wait; walker standing at a lowered boom.
import { boot, ev, sleep, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
const info = id => J(`TLXCV.info("${id}")`);
await boot(); await ev(`GS.hour = 30; tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLXCV.CV.plow = 0; true`); await sleep(1000);
const L = await info("lebesby");
await ev(`TLXR.setSnow("lebesby", 1, Math.floor((${L.gates[0].s} + 500) / TLXR.ROADS.seg)); true`); await waitGame(1);
let a = await info("lebesby"); ok(a.st === "shut", "shut " + a.st);
// walker at boom 0, just outside
const g = a.gates[0];
await ev(`P.x=${g.x}; P.z=${g.z}; FOOT.on=true; FOOT.x=${g.x}+3; FOOT.z=${g.z}+3; true`); await waitGame(8);
a = await info("lebesby"); console.log("walker at boom", JSON.stringify({ st: a.st, up: a.gates.map(x => x.up), text: a.gates.map(x => x.text) }));
ok(!(await J(`TLXCV.err||null`)), "no err walker");
// skip 8 h while still snowed in
await ev(`GS.hour += 8; true`); await waitGame(3);
a = await info("lebesby"); console.log("after +8h snowed", JSON.stringify({ st: a.st, at: a.at, snow: await J(`TLXR.status("lebesby")`) }));
ok(a.st === "shut" || a.st === "wait", "council plow cleared it during the skip: " + a.st);
// plow, then skip past the convoy time
await ev(`TLXR.setSnow("lebesby", 0); true`); await waitGame(2);
a = await info("lebesby"); console.log("plowed", JSON.stringify({ st: a.st, at: a.at }));
await ev(`GS.hour += 5; true`); await waitGame(4);
a = await info("lebesby"); console.log("after +5h", JSON.stringify({ st: a.st, at: a.at, up: a.gates.map(x => x.up), text: a.gates.map(x => x.text) }));
ok(a.st === "open" || a.st === "run", "convoy time passed -> " + a.st);
ok(!(await J(`TLXCV.err||null`)), "no err skip");
console.log("fails", fails); await done(fails ? 1 : 0);
