// Beta break test for 14.4b1 boatyard hull repair: junk cond values, a second boat, mid-tow, dead, busy, tablet up, spam.
import { boot, ev, tap, sleep, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const boats = `TLX.state("vehicles").owned.filter(r => r.id === "skiff")`;
await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 36; GS.cash = 5000; true`);
await ev(`garageTab = "boats"; openGarage(); true`); await sleep(400);
await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(300);
await ev(`closeGarage(); true`); await sleep(300);
const n0 = await J(`${boats}.length`); ok(n0 >= 1, `owns a skiff (${n0})`);
// junk conds
for (const v of ["NaN", "null", "undefined", "'abc'", "-50", "250", "'40'", "Infinity"]) {
  await ev(`${boats}[0].cond = ${v}; true`);
  const r = await J(`({ c: TLXB.repairCost(${boats}[0]), b: TLXB.repairBlock(${boats}[0]) })`);
  ok(Number.isFinite(r.c) && r.c >= 0 && r.c <= 800, `cond=${v}: cost ${r.c} finite and 0..800 (block: "${r.b.slice(0, 40)}")`);
}
// repair at yard? place boat at yard foot
await ev(`(() => { const r = ${boats}[0]; r.cond = 30; return 1; })()`);
const near = await J(`(() => { const r = ${boats}[0]; return { atYard: TLXB.atYard(r), blk: TLXB.repairBlock(r) }; })()`);
console.log("start", JSON.stringify(near));
// spam repair
await ev(`GS.cash = 1000; true`);
const sp = await J(`(() => { const r = ${boats}[0]; const c0 = GS.cash; const a = []; for (let i = 0; i < 5; i++) a.push(TLXB.repair(r.uid)); return { a, spent: c0 - GS.cash, cond: r.cond }; })()`);
console.log("spam", JSON.stringify(sp));
ok(sp.a.filter(Boolean).length <= 1 && sp.spent <= 560, `five repair() calls charge once at most ($${sp.spent}), cond ${sp.cond}`);
// dead / busy / mid-tow
await ev(`${boats}[0].cond = 40; true`);
for (const [nm, setup, undo] of [["GS.dead", "GS.dead = true", "GS.dead = false"], ["HELP open", "HELP.on = true", "HELP.on = false"]]) {
  await ev(`${setup}; true`); const cash = await J(`GS.cash`);
  const r = await J(`TLXB.repair(${boats}[0].uid)`); const c2 = await J(`GS.cash`);
  ok(!r && c2 === cash, `${nm}: repair refused, no charge`); await ev(`${undo}; true`);
}
const tw = await J(`(() => { const r = ${boats}[0]; const R = TLXB.RTS ? TLXB.RTS.get(r.uid) : null; return !!R; })()`);
console.log("RTS exposed", tw);
// tablet up + door use key
await ev(`(() => { const y = TLXB.yard(); FOOT.on = true; FOOT.g.visible = true; FOOT.x = y.door.x; FOOT.z = y.door.z; FOOT.sp = 0; return 1; })()`); await sleep(600);
await ev(`GS.cash = 5000; TABLET.toggle(true, "boats"); true`); await sleep(700);
const cash = await J(`GS.cash`), cond = await J(`${boats}[0].cond`);
await tap("KeyE"); await sleep(600);
const after = await J(`({ cash: GS.cash, cond: ${boats}[0].cond, shop: !!(window.shopOpen && shopOpen()), tab: !TABLET.isClosed?.() })`);
console.log("tablet-up E", JSON.stringify({ cash, cond }), JSON.stringify(after));
ok(after.cash === cash && after.cond === cond, `with the tablet up, the door's use key neither charges nor mends (cond ${cond} -> ${after.cond})`);
await ev(`TABLET.toggle(false); true`); await sleep(300);
// second boat: dent only the second, at yard? and first sound
const two = await J(`(() => { const o = TLX.state("vehicles").owned; const r2 = JSON.parse(JSON.stringify(o.find(r => r.id === "skiff"))); r2.uid = "t_" + r2.uid + "x"; o.push(r2); ${boats}[0].cond = 100; r2.cond = 55; return { n: ${boats}.length, c: TLXB.repairCost(r2), blk: TLXB.repairBlock(r2), at: TLXB.atYard(r2) }; })()`);
console.log("two", JSON.stringify(two));
await ev(`TABLET.toggle(true, "boats"); true`); await sleep(800);
const txt = await ev(`document.getElementById("tabV").innerText`);
ok((txt.match(/REPAIR HULL/g) || []).length <= 1, `two skiffs, one dented: at most one REPAIR HULL on the card (${(txt.match(/REPAIR HULL/g) || []).length})`);
await ev(`TABLET.toggle(false); true`);
// reload keeps cond; an old save with no cond
await ev(`TLX.state("vehicles").owned.forEach(r => delete r.cond); true`);
const old = await J(`${boats}.map(r => TLXB.repairCost(r))`);
ok(old.every(c => c === 0), `old saves with no cond field read sound, no card (${old})`);
await done(fails ? 1 : 0);
