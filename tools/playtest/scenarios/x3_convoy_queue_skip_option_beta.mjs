// Beta break-it 3.5c1/c2b: a walker queued at a boom across a time skip; option toggled mid-wait and mid-run.
import { boot, ev, sleep, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
const info = id => J(`TLXCV.info("${id}")`);
await boot(); await ev(`GS.hour = 30; tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLXCV.CV.plow = 0; true`); await sleep(1000);
const L = await info("lebesby"); const g = L.gates[0];
console.log("gate0", JSON.stringify(g), "yaw conv", Object.keys(L).join(","));
await ev(`TLXR.setSnow("lebesby", 1, Math.floor((${L.gates[0].s} + 500) / TLXR.ROADS.seg)); true`); await waitGame(1);
// plow it so a convoy is called, walker 5 m outside the boom
await ev(`TLXR.setSnow("lebesby", 0); true`); await waitGame(2);
let a = await info("lebesby"); console.log("plowed", JSON.stringify({ st: a.st, at: a.at }));
// face into the road: toward gate1
const g1 = a.gates[1];
await ev(`P.x=${g.x}; P.z=${g.z}; FOOT.on=true; FOOT.x=${g.x}; FOOT.z=${g.z}; FOOT.yaw=Math.atan2(${g1.x - g.x}, ${g1.z - g.z}); true`); await waitGame(2);
a = await info("lebesby"); console.log("walker at boom", JSON.stringify({ st: a.st, at: a.at, n: a.n, q: a.q, up: a.gates.map(x => x.up) }));
// option off mid-wait
await ev(`TLX.setOn ? TLX.setOn("convoy", false) : (TLX.opt && (TLX.opt.convoy = false)); true`); await waitGame(2);
a = await info("lebesby"); console.log("option off", JSON.stringify({ on: await J(`TLX.on("convoy")`), st: a.st, up: a.gates.map(x => x.up) }));
ok(!(await J(`TLXCV.err||null`)), "no err option off");
await ev(`TLX.setOn ? TLX.setOn("convoy", true) : (TLX.opt && (TLX.opt.convoy = true)); true`); await waitGame(2);
a = await info("lebesby"); console.log("option on", JSON.stringify({ on: await J(`TLX.on("convoy")`), st: a.st, at: a.at, up: a.gates.map(x => x.up) }));
// skip across convoy time with walker queued
await ev(`GS.hour += 1.5; true`); await waitGame(4);
a = await info("lebesby"); console.log("after +1.5h", JSON.stringify({ st: a.st, at: a.at, up: a.gates.map(x => x.up), you: a.you }));
ok(["run", "open", "wait"].includes(a.st), "sane state " + a.st);
// toggle option off mid-run
await ev(`TLX.setOn ? TLX.setOn("convoy", false) : (TLX.opt && (TLX.opt.convoy = false)); true`); await waitGame(2);
a = await info("lebesby"); console.log("off after", JSON.stringify({ st: a.st, up: a.gates.map(x => x.up) }));
await ev(`TLX.setOn ? TLX.setOn("convoy", true) : (TLX.opt && (TLX.opt.convoy = true)); true`); await waitGame(2);
a = await info("lebesby"); console.log("on again", JSON.stringify({ st: a.st, up: a.gates.map(x => x.up) }));
const fp = await J(`({x:FOOT.x,z:FOOT.z,nan:[FOOT.x,FOOT.z,P.x,P.z].some(v=>!isFinite(v))})`); ok(!fp.nan, "no NaN pos");
ok(!(await J(`TLXCV.err||null`)), "no err end");
console.log("fails", fails); await done(fails ? 1 : 0);
