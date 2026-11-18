// Beta break-it for 3.5c1 storm closures/convoys (plow truck off): (A) both roads shut at once are independent,
// (B) option off while a queue stands at a lowered boom: queue released, legend/booms cleared, on again restores,
// (C) storm at convoy time puts it back an hour, (D) reload with road shut, at night; booms down.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s, fn) { const t0 = await clock(); while ((await clock()) - t0 < s) { if (fn && await fn()) return true; await sleep(120); } return false; }
const info = id => J(`TLXCV.info("${id}")`);
const prep = `GS.hour = 34; tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLXR.ROADS.plowAt = 2; TLXCV.CV.plow = 0; true`;
await boot(); await ev(prep); await sleep(1000);
const ids = await J(`TLXCV.roads.map(r => r.id)`);
console.log("roads", ids);
const L = await info("lebesby"), M = await info(ids.find(i => i !== "lebesby"));
const MID = ids.find(i => i !== "lebesby");
// A
await ev(`(() => { for (const [id, i] of [["lebesby", ${L.gates[0].s}], ["${MID}", ${M.gates[0].s}]]) TLXR.setSnow(id, 1, Math.floor((i + 500) / TLXR.ROADS.seg)); return true; })()`);
await waitGame(1);
let a = await info("lebesby"), b = await info(MID);
ok(a.st === "shut" && b.st === "shut", "A: both roads shut (" + a.st + "/" + b.st + ")");
await ev(`TLXR.setSnow("${MID}", 0); true`); await waitGame(1);
a = await info("lebesby"); b = await info(MID);
ok(a.st === "shut" && b.st === "wait", "A: plowing one leaves the other shut (" + a.st + "/" + b.st + ")");
// B: queue then option off
await ev(`(() => { const q = TLXCV.info("lebesby").gates[0]; TLXT.place("lebesby", q.s - 150, 1); TLXT.place("lebesby", q.s - 210, 1, 1); return true; })()`);
await ev(`(() => { crashCancel(); FOOT.on=false; const q = TLXCV.info("lebesby").gates[0], p = TLXT.lanePt("lebesby", q.s - 40, 1), a = p.yaw + Math.PI/2; P.x = p.cx + Math.sin(a)*40; P.z = p.cz + Math.cos(a)*40; P.y = surf(P.x,P.z)+0.3; P.vx=P.vz=0; recenter(P.x,P.z,true); return true; })()`);
const c = i => J(`(() => { const c = TLXT.cars[${i}]; return { on: c.on, s: c.s, v: c.v, gq: !!c.gq, why: c.why, st: c.st, dir: c.dir }; })()`);
const SI = L.n || await J(`TLXT.n`);
await waitGame(60, async () => (await c(0)).gq && (await c(1)).gq);
ok((await c(0)).gq && (await c(1)).gq, "B: two cars queued at the boom");
const s0 = (await c(0)).s;
await ev(`TLX.setOn ? TLX.setOn("convoy", false) : (TLX.opt && (TLX.opt.convoy = false)); true`);
const optOff = await J(`TLX.on("convoy")`);
await waitGame(25);
const c0 = await c(0), c1 = await c(1), lg = await J(`TLXR.legend()`);
const g0 = (await info("lebesby")).gates[0];
console.log("B off:", JSON.stringify({ optOff, c0, c1, lg, g0 }));
ok(optOff === false, "B: option reads off");
ok(!c0.gq || c0.s > s0 + 3 || !c0.on, "B: head of queue released/moved after option off (s " + s0.toFixed(1) + " -> " + c0.s.toFixed(1) + ", gq " + c0.gq + ")");
ok(!/barrier|convoy/.test(lg), "B: legend clear with option off: '" + lg + "'");
await ev(`TLX.setOn ? TLX.setOn("convoy", true) : (TLX.opt.convoy = true); true`);
await waitGame(2);
const gOn = await info("lebesby");
ok(await J(`TLX.on("convoy")`) && gOn.st !== "open", "B: option on again restores the closure (" + gOn.st + ")");
// C: storm at convoy time
await ev(`WX.at = () => 1; GS.storm = 1; true`);
const wasAt = gOn.at || (await info(MID)).at;
await ev(`GS.hour = ${wasAt || 35} - 0.003; true`);
await waitGame(5);
const sc = await info("lebesby"), sm = await info(MID);
console.log("C:", JSON.stringify({ wasAt, sc: [sc.st, sc.at], sm: [sm.st, sm.at], cstate: sc.note }));
ok(sc.st !== "run" && sm.st !== "run", "C: no convoy runs in a storm (" + sc.st + "/" + sm.st + ")");
ok(!sm.at || sm.at >= wasAt, "C: put back (next " + sm.at + ", was " + wasAt + ")");
await ev(`WX.at = () => 0; GS.storm = 0; true`);
// D: night + reload
await ev(`GS.hour = 48 + 1; true`); await waitGame(1.5);
const nBefore = await info("lebesby");
const sv = await J(`Object.keys(JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>/tracklayer/i.test(k))) || "{}"))`).catch(() => []);
await reload();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLXCV.CV.plow = 0; true`); await sleep(1500);
const nAfter = await info("lebesby");
console.log("D:", JSON.stringify({ before: [nBefore.st, nBefore.gates.map(g => g.up)], after: [nAfter.st, nAfter.gates.map(g => g.up)], err: await J(`TLXCV.err || TLXCV.tickErr || null`) }));
ok(!(await J(`TLXCV.err || TLXCV.tickErr || null`)), "D: no convoy error after reload");
console.log("D: shut road after reload is", nAfter.st, "(snow is saved with roads? before was", nBefore.st + ")");
console.log("fails", fails);
await done(fails ? 1 : 0);
