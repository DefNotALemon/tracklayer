// Beta (0251): 4.1 blade/grit state through save + reload, shed round trip, corrupt plow state. Exit 1 on FAIL.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 40000; GS.lic = GS.lic || {}; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`); await sleep(600);
await ev(`TLXV.buy("pickup"); true`); await sleep(300);
const U = JSON.stringify(await ev(`TLXV.state().owned[0].uid`));
await ev(`TLXPL.fit(${U}, "b23"); TLXV.swapTo(${U}); FOOT.on = false; true`); await sleep(800);
await ev(`TLXPL.rt(${U}).down = true; TLXPL.slew(${U}, "l"); true`); await sleep(300);
const pre = await J(`(() => { const s = TLXPL.state(); return { st: s.blades[${U}], th: TLXPL.throwOf(${U}), cond: TLXPL.condOf(${U}) }; })()`);
console.log("  before", JSON.stringify(pre));
await ev(`TLX.state("plow").blades[${U}].cond = 55; TLX.state("plow").opened = 7; TLX.state("plow").m = 1234; true`); await sleep(300);
await ev(`save(); true`);
const saved = JSON.parse(await ev(`localStorage.getItem("tracklayer.save.v2")`));
console.log("  saved x.plow keys", Object.keys((saved.x && saved.x.plow) || {}).join(","));
await reload(saved); await sleep(1200); await ev(`tutSkip(); true`); await sleep(600);
const post = await J(`(() => { const s = TLXPL.state(); const u = TLXV.state().owned[0] && TLXV.state().owned[0].uid; return { u, st: s.blades[u], th: u && TLXPL.throwOf(u), cond: u && TLXPL.condOf(u), opened: s.opened, m: s.m }; })()`);
console.log("  after reload", JSON.stringify(post));
ok(post.st && post.th === pre.th, "A slew survives reload (" + pre.th + " -> " + post.th + ")");
ok(post.opened === 7 && post.m === 1234, "B counters survive reload");
ok(post.cond === 55, "C edge wear survives reload " + JSON.stringify([pre.cond, post.cond]));
// D shed round trip keeps edge
const U2 = JSON.stringify(post.u);
await ev(`TLXPL.unfit(${U2}); true`); await sleep(300);
const shed = await J(`TLXPL.state().shed`); console.log("  shed", JSON.stringify(shed));
ok(Array.isArray(shed) && shed.length === 1, "D unfit puts one blade in the shed");
await ev(`TLXPL.fit(${U2}, "b23"); true`); await sleep(300);
const back = await J(`({ cond: TLXPL.condOf(${U2}), shed: TLXPL.state().shed.length, st: TLXPL.state().blades[${U2}] })`);
console.log("  refit", JSON.stringify(back));
ok(back.shed === 0, "E refit empties the shed");
// F corrupt plow state loads without page errors
const bad = JSON.parse(JSON.stringify(saved)); bad.x.plow = { blades: { ghost: { down: true, throw: 5 }, nope: null }, shed: [null, 3], grit: "x", con: null, drv: { a: 1 } };
await reload(bad); await sleep(1500); await ev(`tutSkip(); true`); await sleep(600);
const c = await J(`(() => { try { TLXPL.tidy(); return { ok: true, h: TLXPL.hint() }; } catch (e) { return { err: String(e) }; } })()`);
console.log("  corrupt state", JSON.stringify(c));
ok(!c.err, "F corrupt plow state does not throw");
// G old save: no x at all
const old = JSON.parse(JSON.stringify(saved)); delete old.x;
await reload(old); await sleep(1500); await ev(`tutSkip(); true`); await sleep(600);
const o = await J(`({ s: !!TLXPL.state(), b: Object.keys(TLXPL.state().blades).length })`);
ok(o.s && o.b === 0, "G save with no expansion state loads with no blades " + JSON.stringify(o));
await done(fails ? 1 : 0);
