// Beta break-it 3.5c: convoy/traffic options toggled while the road is shut, waiting, and a convoy runs with you in it.
import { boot, ev, sleep, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
const info = id => J(`TLXCV.info("${id}")`);
const err = async m => ok(!(await J(`TLXCV.err||null`)), "no err " + m);
await boot(); await ev(`GS.hour = 30; tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; true`); await sleep(1000);
const L = await info("lebesby");
const seg = Math.floor((L.gates[0].s + 500) / 1);
await ev(`TLXR.setSnow("lebesby", 1, Math.floor((${L.gates[0].s} + 500) / TLXR.ROADS.seg)); true`); await waitGame(2);
let a = await info("lebesby"); ok(a.st === "shut", "shut " + a.st);
// A: option off while shut -> open, gates up; on again -> shut again
await ev(`TLX.setOn("convoy", false); true`); await waitGame(2);
a = await info("lebesby"); ok(a.st === "open" && a.gates.every(g => g.up === 1), "off while shut: open, gates up " + a.st + JSON.stringify(a.gates.map(g => g.up)));
await ev(`TLX.setOn("convoy", true); true`); await waitGame(3);
a = await info("lebesby"); ok(a.st === "shut", "on again, still snowed -> " + a.st);
await err("A");
// B: traffic off while shut then on
await ev(`TLX.setOn("traffic", false); true`); await waitGame(2);
a = await info("lebesby"); console.log("traffic off", a.st); await err("B1");
await ev(`TLX.setOn("traffic", true); true`); await waitGame(3);
a = await info("lebesby"); console.log("traffic on", a.st); await err("B2");
// C: plow it, wait for wait/run, put the sled at the boom as the rider, then toggle during run
await ev(`TLXT.hold = true; for (const c of TLXT.cars) c.on = false; TLXR.setSnow("lebesby", 0); true`); await waitGame(2);
a = await info("lebesby"); console.log("plowed", a.st, a.at);
const g = a.gates[0];
await ev(`P.x=${g.x}; P.z=${g.z}+12; FOOT.on=false; true`);
await ev(`GS.hour = ${a.at} - 0.003; true`);
for (let i = 0; i < 40 && (await info("lebesby")).st !== "run"; i++) { await sleep(100); }
a = await info("lebesby"); console.log("state", a.st, JSON.stringify(a.you));
await ev(`TLX.setOn("convoy", false); true`); await waitGame(2);
a = await info("lebesby"); ok(a.st === "open", "convoy off mid-" + "run -> " + a.st);
ok(!a.you || (!a.you.in && !a.you.live), "you not in a dead convoy " + JSON.stringify(a.you));
await err("C1");
await ev(`TLX.setOn("convoy", true); true`); await waitGame(3);
a = await info("lebesby"); console.log("convoy on again", a.st); await err("C2");
// D: both off then on at once
await ev(`TLX.setOn("traffic", false); TLX.setOn("convoy", false); true`); await waitGame(1);
await ev(`TLX.setOn("convoy", true); true`); await waitGame(2); await ev(`TLX.setOn("traffic", true); true`); await waitGame(3);
a = await info("lebesby"); console.log("D", a.st); await err("D");
const pe = await J(`window.__pageErr||[]`).catch(() => []);
console.log("fails", fails); await done(fails ? 1 : 0);
