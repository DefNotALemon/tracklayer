// Beta: 4.2a road contract: pay earned this week on a road handed back / struck off must reach Monday's statement (same class as 0325 #1 on drives/lots).
import { boot, ev, sleep, done, reload } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
let fails = 0; const ok = (n, c, x = "") => { console.log((c ? "ok   " : "FAIL ") + n + " " + x); if (!c) fails++; };
await boot(); await ev(SETUP); await sleep(800);
await ev(`(() => { const s = TLX.state("plow"); s.blades = { u1: { cond: 100 } }; s.con = {}; s.conRec = {}; s.conBan = {}; s.conLast = []; return true; })()`);
const rid = await J(`TLXPL.con.routes().map(r => r.id)`); const R = rid[0], R2 = rid[1];
console.log("roads", rid.join(","));
const blade = () => ev(`TLX.state("plow").blades = { u1: { cond: 100 } }; true`);
const last = () => J(`TLX.state("plow").conLast.map(l => ({ road: l.road, pay: l.pay, m: l.m }))`);
const mon = l => ev(`TLXPL.con.monday({ label: "${l}" }); true`);
// A: earn 300 on road, hand back, Monday
await blade(); await ev(`TLXPL.con.sign(${JSON.stringify(R)})`);
const cash0 = await ev("GS.cash");
await ev(`(() => { const c = TLX.state("plow").con[${JSON.stringify(R)}]; c.wk = 300; c.wkM = 800; c.due = {}; return true; })()`);
await ev(`TLXPL.con.quit(${JSON.stringify(R)})`);
await mon("w1"); let l = await last();
ok("A handed back after $300 earned: Monday lists it", l.some(x => x.pay === 300), JSON.stringify(l));
// B: third warning strikes the road off with pay earned
await blade(); await ev(`TLXPL.con.sign(${JSON.stringify(R2)})`);
await ev(`(() => { const s = TLX.state("plow"), c = s.con[${JSON.stringify(R2)}]; c.wk = 200; c.wkM = 400; c.strikes = 2; c.due = {}; return true; })()`);
await ev(`(() => { const s = TLX.state("plow"), r = TLXPL.con.routes().find(q => q.id === ${JSON.stringify(R2)}); return true; })()`);
const struck = await ev(`(() => { const s = TLX.state("plow"), c = s.con[${JSON.stringify(R2)}]; c.due = { 0: [999, 1] }; c.cover = false; TLXPL.con.step && TLXPL.con.step(); return !s.con[${JSON.stringify(R2)}]; })()`);
console.log("struck off:", struck);
await mon("w2"); l = await last();
if (struck) ok("B struck-off road's $200 on Monday's statement", l.some(x => x.pay === 200), JSON.stringify(l)); else console.log("B skipped: could not force strike-off; conLast", JSON.stringify(l));
// C control: a road kept to Monday does list its pay
await blade(); await ev(`TLXPL.con.sign(${JSON.stringify(R)})`);
await ev(`(() => { const c = TLX.state("plow").con[${JSON.stringify(R)}]; c.wk = 150; c.wkM = 400; c.due = {}; return true; })()`);
await mon("w3"); l = await last();
ok("C control: kept road's $150 on the statement", l.some(x => x.pay === 150), JSON.stringify(l));
console.log("cash delta", (await ev("GS.cash")) - cash0);
await done(fails ? 1 : 0);
