// Beta: 4.2a road contract warnings across Mondays: strike-off, re-sign with a file, ban expiry, save/reload.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
let fails = 0; const ok = (n, c, x = "") => { console.log((c ? "ok   " : "FAIL ") + n + " " + x); if (!c) fails++; };
await boot(); await ev(SETUP); await sleep(800);
await ev(`(() => { const s = TLX.state("plow"); s.blades = { u1: { cond: 100 } }; s.con = {}; s.conRec = {}; s.conBan = {}; s.conLast = []; return true; })()`);
const rid = (await J(`TLXPL.con.routes().map(r => r.id)`));
console.log("roads", rid.join(","));
const R = rid[0];
const blade = () => ev(`TLX.state("plow").blades = { u1: { cond: 100 } }; true`);
const st = () => J(`(() => { const s = TLX.state("plow"); const c = s.con[${JSON.stringify(R)}]; return { c: c ? { strikes: c.strikes, clean: c.clean } : null, rec: s.conRec[${JSON.stringify(R)}] || null, ban: s.conBan[${JSON.stringify(R)}] || null, last: s.conLast.map(l => ({ road: l.road, w: l.w, lapsed: l.lapsed })) }; })()`);
const mon = (l) => ev(`TLXPL.con.monday({ label: "${l}" }); true`);
// A: 2 warnings, clean week -> one off per Monday
console.log("sign", await ev(`TLXPL.con.sign(${JSON.stringify(R)})`));
await ev(`(() => { const c = TLX.state("plow").con[${JSON.stringify(R)}]; c.strikes = 2; c.clean = true; return true; })()`);
await mon("w1"); let a = await st(); ok("A1 monday strikes one off (2->1)", a.c && a.c.strikes === 1 && a.last[0].lapsed === true, JSON.stringify(a));
await mon("w2"); a = await st(); ok("A2 second monday 1->0", a.c.strikes === 0, JSON.stringify(a));
await mon("w3"); a = await st(); ok("A3 stays 0, not lapsed", a.c.strikes === 0 && a.last[0].lapsed === false, JSON.stringify(a));
// B: hand back with 2 warnings on file, sign again: first Monday no strike-off, second yes
await ev(`(() => { const c = TLX.state("plow").con[${JSON.stringify(R)}]; c.strikes = 2; c.clean = true; return true; })()`);
console.log("quit", await ev(`TLXPL.con.quit(${JSON.stringify(R)})`));
a = await st(); ok("B1 handed back: file holds 2", !a.c && a.rec && a.rec.strikes === 2, JSON.stringify(a));
await mon("w4"); a = await st(); ok("B2 monday with no contract: file untouched", a.rec && a.rec.strikes === 2, JSON.stringify(a));
await blade(); console.log("resign", await ev(`TLXPL.con.sign(${JSON.stringify(R)})`), await ev(`JSON.stringify({q: TOASTQ.slice(-2), t: [...document.querySelectorAll("#toasts > *")].map(e => e.textContent), sb: TLX.state("plow").strBan, h: GS.hour, ban: TLX.state("plow").conBan})`));
a = await st(); ok("B3 re-signed with 2, not clean", a.c && a.c.strikes === 2 && a.c.clean === false, JSON.stringify(a));
await mon("w5"); a = await st(); ok("B4 first monday after re-sign keeps 2", a.c.strikes === 2, JSON.stringify(a));
await mon("w6"); a = await st(); ok("B5 next monday 2->1", a.c.strikes === 1, JSON.stringify(a));
// C: reload keeps clean/strikes
const save = await J(`(() => { save(); return JSON.parse(localStorage.getItem("tracklayer.save.v2")); })()`);
await reload(save); await ev(SETUP); await sleep(900);
a = await st(); ok("C1 reload keeps con 1 warning", a.c && a.c.strikes === 1, JSON.stringify(a));
await mon("w7"); a = await st(); ok("C2 monday after reload 1->0", a.c.strikes === 0, JSON.stringify(a));
// D: ban expiry
await ev(`(() => { const s = TLX.state("plow"); const id = ${JSON.stringify(R)}; delete s.con[id]; s.conRec = {}; s.conBan[id] = GS.hour + 168; return true; })()`);
await blade(); const t0 = await ev(`TLXPL.con.sign(${JSON.stringify(R)})`); ok("D1 sign refused in ban", t0 === false, String(t0));
await ev(`GS.hour += 167; true`); await blade(); const t1 = await ev(`TLXPL.con.sign(${JSON.stringify(R)})`); ok("D2 still refused at 167 h", t1 === false, String(t1));
await ev(`GS.hour += 2; true`); await blade(); const t2 = await ev(`TLXPL.con.sign(${JSON.stringify(R)})`); ok("D3 sign works after 169 h", t2 === true, String(t2));
a = await st(); ok("D4 fresh contract clean, 0 strikes, ban cleared", a.c && a.c.strikes === 0 && a.c.clean === true && !a.ban, JSON.stringify(a));
await ev(`TABLET.toggle(true, "plow"); true`); await sleep(500);
console.log((await ev(`$("tabS").textContent.replace(/\\s+/g, " ").slice(0, 700)`)));
await done(fails ? 1 : 0);
