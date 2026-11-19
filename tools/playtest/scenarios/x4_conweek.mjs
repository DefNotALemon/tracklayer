// beta fix 0337 #1/#2: the week's pay on a kommune ROAD contract that is handed back, or taken back on the third
// warning, before Monday is still on Monday's statement (0325 #1 did this for drives and lots, x4_weekpay.mjs).
// A: handed back with pay earned. B: taken back on the third warning, by HAND BACK with a stretch shut and by the
// contract's own clock. C: handed back and signed again in the same week: one line, the sum. D: nothing held and
// nothing earned writes no line. E: a driver's stretches go with it. F: the carry through a save and reload, junk
// in the saved list tidied. G: what the Plow app's Statements say.
import { boot, ev, sleep, done, reload, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const q = JSON.stringify;
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
const KIT = `(() => {
  window.__c = id => TLX.state("plow").con[id];
  window.__earn = (id, pay, m, strikes) => { const c = __c(id); c.wk = pay; c.wkM = m; c.due = {}; c.cover = false; if (strikes !== undefined) { c.strikes = strikes; c.clean = false; } return true; };
  window.__rows = () => TLX.state("plow").conLast.map(l => ({ d: l.d, road: l.road, pay: l.pay, m: l.m, w: l.w, dn: l.dn, gone: l.gone || "" }));
  window.__clr = () => { const s = TLX.state("plow"); for (const id of Object.keys(s.con)) delete s.con[id]; s.conRec = {}; s.conBan = {}; s.conLast = []; s.conWk = []; s.pdr = {}; return true; };
  return true; })()`;

await boot(); await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 60000; TLXV.buy("pickup"); true`); await sleep(500);
const uid = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`);
await ev(`TLX.state("plow").blades[${q(uid)}] = { id: "b23", cond: 100, throw: "r" }; TLXPL.tidy(); TLXV.swapTo(${q(uid)}); FOOT.on = false; true`); await sleep(600);
const RS = await J(`TLXPL.con.routes().map(r => ({ id: r.id, name: r.name }))`);
ok(RS.length >= 2, `${RS.length} contract roads to test with: ${RS.map(r => r.name).join(", ")}`);
const [R1, R2] = RS;
const sign = async id => { const r = await ev(`TLXPL.con.sign(${q(id)})`); if (!(await ev(`!!__c(${q(id)})`))) throw new Error("could not sign " + id + " (" + r + ")"); };
const mon = l => ev(`TLXPL.con.monday({ label: ${q(l)} }); true`);
const cash = () => ev("GS.cash");

await section("A a road handed back with the week's pay earned", async () => {
  await ev("__clr()"); await sign(R1.id); await ev(`__earn(${q(R1.id)}, 300, 800)`);
  const c0 = await cash(); const r = await ev(`TLXPL.con.quit(${q(R1.id)})`);
  const k = await J(`TLX.state("plow").conWk`);
  ok(r === true && !(await ev(`!!__c(${q(R1.id)})`)), "handed back, the contract is gone");
  ok(k.length === 1 && k[0].id === R1.id && k[0].pay === 300 && k[0].m === 800 && k[0].gone === "back", `the week keeps it: ${q(k)}`);
  await mon("w1"); const rows = await J("__rows()");
  ok(rows.length === 1 && rows[0].road === R1.name && rows[0].pay === 300 && rows[0].m === 800 && rows[0].gone === "back" && rows[0].d === "w1", `Monday's line: ${q(rows)}`);
  ok((await J(`TLX.state("plow").conWk`)).length === 0, "the kept list is cleared by Monday");
  ok((await cash()) === c0, "no cash paid twice");
  await mon("w2"); const r2 = await J("__rows()");
  ok(r2.length === 1, `a second Monday adds nothing: ${r2.length} line`);
});

await section("B taken back on the third warning", async () => {
  await ev("__clr()"); await sign(R2.id); await ev(`__earn(${q(R2.id)}, 200, 400, 2)`);
  await ev(`__c(${q(R2.id)}).due = { 0: [999, 1] }; true`);
  ok((await ev(`TLXPL.con.quitCost(${q(R2.id)})`)) === true, "handing back now would be a warning");
  await ev(`TLXPL.con.quit(${q(R2.id)})`);
  const st = await J(`({ held: !!__c(${q(R2.id)}), ban: TLX.state("plow").conBan[${q(R2.id)}] > GS.hour })`);
  ok(!st.held && st.ban, `HAND BACK with a stretch shut: taken back and banned ${q(st)}`);
  await mon("w1"); let rows = await J("__rows()");
  ok(rows.length === 1 && rows[0].road === R2.name && rows[0].pay === 200 && rows[0].m === 400 && rows[0].gone === "taken" && rows[0].w === 3, `Monday's line: ${q(rows)}`);
  await ev("__clr()"); await sign(R1.id); await ev(`__earn(${q(R1.id)}, 120, 400, 2)`);
  const gone = await ev(`(() => { const c = __c(${q(R1.id)}); c.due = { 0: [999, 1] }; c.cover = false; TLXPL.con.step(); return !__c(${q(R1.id)}); })()`);
  ok(gone, "the contract's own clock: a stretch far too late takes the road back");
  await mon("w2"); rows = await J("__rows()");
  ok(rows.length === 1 && rows[0].pay === 120 && rows[0].gone === "taken", `Monday's line: ${q(rows)}`);
});

await section("C handed back and signed again in the same week", async () => {
  await ev("__clr()"); await sign(R1.id); await ev(`__earn(${q(R1.id)}, 300, 800)`); await ev(`TLXPL.con.quit(${q(R1.id)})`);
  await sign(R1.id); await ev(`__earn(${q(R1.id)}, 150, 400)`);
  await sign(R2.id); await ev(`__earn(${q(R2.id)}, 80, 400)`);
  await mon("w1"); const rows = await J("__rows()"), a = rows.filter(r => r.road === R1.name), b = rows.filter(r => r.road === R2.name);
  ok(rows.length === 2 && a.length === 1 && a[0].pay === 450 && a[0].m === 1200 && a[0].gone === "", `one line for the road, the sum: ${q(a)}`);
  ok(b.length === 1 && b[0].pay === 80, `the other road's own line untouched: ${q(b)}`);
  ok((await J(`[__c(${q(R1.id)}).wk, __c(${q(R1.id)}).wkM]`)).join() === "0,0", "the held contract starts its new week at 0");
  // twice handed back in one week: one kept entry
  await ev("__clr()"); await sign(R1.id); await ev(`__earn(${q(R1.id)}, 100, 400)`); await ev(`TLXPL.con.quit(${q(R1.id)})`);
  await sign(R1.id); await ev(`__earn(${q(R1.id)}, 60, 400)`); await ev(`TLXPL.con.quit(${q(R1.id)})`);
  const k = await J(`TLX.state("plow").conWk`);
  ok(k.length === 1 && k[0].pay === 160 && k[0].m === 800, `handed back twice: one kept entry of $160 ${q(k)}`);
});

await section("D nothing held, nothing earned", async () => {
  await ev("__clr()"); await mon("w1");
  ok((await J("__rows()")).length === 0, "no line with no contract and nothing kept");
  await sign(R1.id); await ev(`TLXPL.con.quit(${q(R1.id)})`);
  ok((await J(`TLX.state("plow").conWk`)).length === 0, "a road handed back with nothing earned keeps nothing");
  await mon("w2"); ok((await J("__rows()")).length === 0, "and writes no line");
});

await section("E a driver's stretches go with the road", async () => {
  await ev("__clr()"); await sign(R1.id); await ev(`__earn(${q(R1.id)}, 90, 800)`);
  await ev(`(() => { TLX.state("plow").pdr[${q(R1.id)}] = { st: "home", p: 0, w: 0, n: 2, cash: 90, wkN: 2, wkCash: 90, who: "zz", truck: null, f0: 0, told: "", why: "", rc: false, hold: false }; return TLXPL.con.quit(${q(R1.id)}); })()`);
  await mon("w1"); const rows = await J("__rows()");
  ok(rows.length === 1 && rows[0].pay === 90 && rows[0].dn === 2, `the line counts the driver's 2: ${q(rows)}`);
});

await section("F the kept week through a save and reload; junk tidied", async () => {
  await ev("__clr()"); await sign(R1.id); await ev(`__earn(${q(R1.id)}, 240, 800)`);
  await ev(`TLXPL.con.quit(${q(R1.id)}); TLX.state("plow").conWk.push(null, "x", 7, { id: 5, pay: 9 }, { id: "ghost", road: 3, pay: "12", m: NaN, dn: -4, w: 99, gone: "zzz" }); save(); true`);
  await reload(); await ev(SETUP); await sleep(600); await ev(KIT);
  const k = await J(`TLX.state("plow").conWk`);
  ok(k.length === 2 && k[0].id === R1.id && k[0].pay === 240 && k[0].m === 800, `after the reload the week still holds it: ${q(k[0])}`);
  ok(k[1].id === "ghost" && k[1].pay === 0 && k[1].m === 0 && k[1].dn === 0 && k[1].w <= 3 && k[1].gone === "back" && k[1].road === "ghost", `the junk entry is made safe, the rest dropped: ${q(k[1])}`);
  await ev(`TLX.state("plow").conLast = []; true`); await mon("after reload"); const rows = await J("__rows()");
  ok(rows.some(r => r.road === R1.name && r.pay === 240 && r.gone === "back" && r.d === "after reload"), `Monday's line after the reload: ${q(rows)}`);
  ok(rows.every(r => Number.isFinite(r.pay) && Number.isFinite(r.m)), "every line has finite numbers");
  // an old save without the field
  await ev(`delete TLX.state("plow").conWk; true`); await sign(R2.id); await ev(`__earn(${q(R2.id)}, 70, 400)`); await ev(`TLXPL.con.quit(${q(R2.id)})`);
  await mon("old"); const r2 = await J("__rows()");
  ok(r2[0].road === R2.name && r2[0].pay === 70, `a state without the list (an old save): ${q(r2[0])}`);
});

await section("G the Plow app's Statements", async () => {
  await ev("__clr()"); await sign(R1.id); await ev(`__earn(${q(R1.id)}, 300, 800)`); await ev(`TLXPL.con.quit(${q(R1.id)})`);
  await sign(R2.id); await ev(`__earn(${q(R2.id)}, 200, 400, 2)`); await ev(`__c(${q(R2.id)}).due = { 0: [999, 1] }; TLXPL.con.quit(${q(R2.id)}); true`);
  await mon("Mon 5"); await ev(`TABLET.toggle(true, "plow"); true`); await sleep(700);
  const t = await ev(`$("tabS").textContent`);
  const i = t.indexOf("Statements"), part = i >= 0 ? t.slice(i, i + 400) : "";
  console.log("     " + part.slice(0, 300));
  await ev(`(() => { const e = [...document.querySelectorAll("#tabS *")].find(n => n.children.length === 0 && n.textContent.trim() === "Statements"); if (e) e.scrollIntoView({ block: "start" }); return true; })()`); await sleep(300);
  if (!process.env.NOSTILLS) await shot("statements");
  ok(i >= 0 && part.includes(R1.name) && part.includes("handed back") && /300/.test(part), "the handed-back road's line reads \"handed back\" with its $300");
  ok(part.includes(R2.name) && part.includes("taken back by the kommune") && part.includes("WARNINGS 3"), "the taken-back road's line reads \"taken back by the kommune\", WARNINGS 3");
  await ev(`TABLET.toggle(false); true`);
});

console.log(fails ? `FAILS: ${fails}` : "all passed");
await done(fails ? 1 : 0);
