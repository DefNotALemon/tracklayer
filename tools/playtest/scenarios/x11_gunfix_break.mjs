// Beta tester 2: try to break tlx-guns v4 fixes (0190 #1 menus, 0192 #1 pack cap). Report-only: exit 1 on a FAIL.
import { boot, ev, tap, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const S = () => J(`(() => { const g = TLXGUN.gun(); return { rounds: g.rounds, ammo: g.ammo, tot: TLXGUN.pkTotal(), sp: TLXGUN.pk("sp308"), match: TLXGUN.pk("match308"), mag: g.parts.magazine, on: TLXGUN.AIM.on, cash: GS.cash }; })()`);
const clock = () => ev("gameClock");
async function until(expr, secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) { if (await ev(expr)) return true; await sleep(80); } return !!(await ev(expr)); }
const plant = (sp, match, mag, rounds, ammo = "sp308") => ev(`(() => { const s = TLXGUN.state(), g = TLXGUN.gun(); s.ammo = ${sp}; s.alt = ${match} ? { match308: ${match} } : {}; g.parts.magazine = ${JSON.stringify(mag)}; g.ammo = ${JSON.stringify(ammo)}; g.rounds = ${rounds}; return true; })()`);
await boot();
await ev(`tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.hour = 36; TLX.setOn("wounds", false); GS.cash = 50000; true`); await sleep(400);
await ev(`TLXGUN.takeCourse(); TLXGUN.buyRifle("bolt308"); TLXGUN.buyPart("magazine","det10"); TLXGUN.buyPart("magazine","int3"); true`);
// 1 legacy over-cap pack (an old save held 127)
await plant(127, 0, "det10", 10);
let r = await ev(`TLXGUN.fit("magazine","int3",true)`), s = await S();
ok(r === false && s.tot === 127, `1 legacy 127 pack, smaller mag: refused cleanly (${r}, pack ${s.tot})`);
await plant(100, 27, "det10", 0);
r = await ev(`TLXGUN.loadAmmo("match308", true)`); s = await S();
console.log("1b", JSON.stringify(s)); ok(r === true && s.ammo === "match308", "1b empty mag, load swap on an over-cap pack works (" + r + ")");
// 2 buying ammo past the cap
await plant(118, 0, "det10", 0);
const c0 = (await S()).cash; await ev(`TLXGUN.buyAmmo("sp308"); TLXGUN.buyAmmo("match308"); true`); s = await S();
ok(s.tot <= 120, `2 buyAmmo with a near-full pack stays <=120 (${s.tot}, paid ${c0 - s.cash})`);
// 3 mid-bolt / mid-load: Settings over a shouldered rifle, then back
await plant(60, 0, "det10", 3);
await ev(`FOOT.on = true; true`);
await tap("KeyL"); await until("TLXGUN.AIM.on && TLXGUN.AIM.t >= 1", 6);
await ev(`TLXGUN.AIM.load = 1; true`); s = await S(); const b = s.tot + s.rounds;
await ev("toggleSettings(true); true"); await sleep(400);
s = await S(); ok(!s.on, "3 Settings mid-load slings"); ok(s.tot + s.rounds === b, `3 rounds conserved over sling mid-load (${b} -> ${s.tot + s.rounds})`);
await ev("toggleSettings(false); true");
// 4 god menu / death card
await tap("KeyL"); await until("TLXGUN.AIM.on && TLXGUN.AIM.t >= 1", 6);
await ev("godToggle ? 0 : 0").catch(() => 0);
const gn = await ev(`typeof toggleGod`); console.log("god fn", gn);
await ev(`document.getElementById("god").hidden = false; true`); await sleep(300);
s = await S(); ok(!s.on, "4 god menu slings the rifle"); await ev(`document.getElementById("god").hidden = true; true`);
await tap("KeyL"); await until("TLXGUN.AIM.on && TLXGUN.AIM.t >= 1", 6);
await ev(`GS.dead = true; true`); await sleep(300); s = await S(); ok(!s.on, "4b death card slings"); await ev(`GS.dead = false; true`);
// 5 touch FIRE button under Settings
await tap("KeyL"); await until("TLXGUN.AIM.on && TLXGUN.AIM.t >= 1 && TLXGUN.AIM.bolt <= 0 && TLXGUN.AIM.load <= 0", 6);
await plant(60, 0, "det10", 5); s = await S();
r = await J(`(() => { $("settings").hidden = false; const a = TLX.guns && TLXGUN.fire(); $("settings").hidden = true; return { a, n: TLXGUN.gun().rounds }; })()`);
ok(r.n === 5, "5 fire under Settings spends nothing (" + r.n + ")");
// 6 pad A (shoulder) with the garage open
await ev(`TLXGUN.AIM.on && TLXGUN.toggle(); GS.garageOpen = true; true`); await sleep(300);
await ev(`gameKey({code:"KeyL"}); true`); await sleep(300); s = await S(); ok(!s.on, "6 L with garage open does not shoulder");
await ev(`GS.garageOpen = false; true`);
// 7 Settings then reload: rifle state saved sanely
await ev("save(); true"); await reload(); await sleep(1500); s = await S(); ok(!s.on && s.tot <= 120, `7 after reload not shouldered, pack ${s.tot}`);
await done(fails ? 1 : 0);
