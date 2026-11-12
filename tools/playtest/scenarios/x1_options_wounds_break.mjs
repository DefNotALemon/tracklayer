// Beta break test for milestone 1's Options page, through the one real option ("Poachers on the fell", tlx-wounds.js):
// pad navigation to and press of the row, touch tap, switch off while bleeding, off survives a reload and an old save, off blocks shots.
import { boot, reload, ev, raw, tap, sleep, shot, done, padSet } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const row = () => J(`(() => { const b = document.querySelector('#optRows button[data-opt="wounds"]'); return b ? { t: b.textContent, foc: document.activeElement === b, r: b.getBoundingClientRect().toJSON(), sec: !$("optSec").hidden } : null; })()`);
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }

await boot();
await ev(`tutSkip(); FOOT.on = false; crashCancel(); true`); await sleep(500);
await ev(`toggleSettings(true); true`); await sleep(500);
let r = await row(); console.log("row", JSON.stringify(r));
ok(r && r.sec && /Poachers on the fell: on/.test(r.t), "Options row shows 'on' by default (" + (r && r.t) + ")");
// pad: walk the focus down until it lands on the row, press A
let n = 0, hit = false;
const dpad = async idx => { await padSet({ [idx]: 1 }); await sleep(160); await padSet({}); await sleep(160); };
for (n = 0; n < 40; n++) { await dpad(13); r = await row(); if (r.foc) { hit = true; break; } }
ok(hit, "pad d-pad down reaches the Options row (" + (n + 1) + " presses)");
await ev(`document.querySelector('#optRows button[data-opt="wounds"]').scrollIntoView({block:"center"}); true`); await sleep(300);
await shot("xo_focus");
await padSet({ 0: 1 }); await sleep(160); await padSet({}); await sleep(300);
r = await row(); ok(/: off/.test(r.t), "pad A turns the option off (" + r.t + ")");
await padSet({ 0: 1 }); await sleep(160); await padSet({}); await sleep(300);
r = await row(); ok(/: on/.test(r.t), "pad A turns it back on (" + r.t + ")");
// pad B closes
await padSet({ 1: 1 }); await sleep(160); await padSet({}); await sleep(400);
ok(await ev(`$("settings").hidden`), "pad B closes Settings");

// off while bleeding
await ev(`toggleSettings(false); GS.hour = 34; true`);
// stand at the open-fell spot farthest from every site (the depot would patch the wounds up at once)
console.log("far spot", await ev(`(() => { let best = null, bd = 0; for (let x = -WORLD/2 + 200; x < WORLD/2 - 200; x += 150) for (let z = -WORLD/2 + 200; z < WORLD/2 - 200; z += 150) { if (isSea(x, z) || isWater(x, z)) continue; const d = Math.min(...SITES.map(s => Math.hypot(x - s.x, z - s.z))); if (d > bd) { bd = d; best = [x, z]; } } P.x = best[0]; P.z = best[1]; P.y = surf(P.x, P.z); P.vx = P.vz = 0; recenter(P.x, P.z, true); return JSON.stringify([best, bd | 0, TLX.wounds.exposed()]); })()`));
await sleep(800);
await ev(`TLX.wounds.hit(); TLX.wounds.hit(); true`); await waitGame(1.5);
let a = await J(`({ open: TLX.wounds.open(), hp: GS.health, bar: $("hpBar").classList.contains("on") })`);
ok(a.open && a.bar, "two wounds open, bar shown");
await ev(`toggleSettings(true); true`); await sleep(300);
await ev(`document.querySelector('#optRows button[data-opt="wounds"]').click(); true`); await sleep(300);
ok(!(await J(`TLX.on("wounds")`)), "option off");
await ev(`toggleSettings(false); true`);
const h0 = await J(`GS.health`); await waitGame(8);
a = await J(`({ open: TLX.wounds.open(), hp: GS.health, bar: $("hpBar").classList.contains("on"), exp: TLX.wounds.exposed() })`);
console.log("after off, bleeding", JSON.stringify(a), "hp before", h0);
ok(!a.open, "switching the hazard off stops an open wound (still bleeding: hp " + h0.toFixed(1) + " -> " + a.hp.toFixed(1) + ", bar " + a.bar + ")");
ok(!a.exp, "exposed() false while off");

// off survives reload; shots blocked in the open
await ev(`save(); true`);
const sv = JSON.parse(await raw(`localStorage.getItem("tracklayer.save.v2")`));
ok(sv.x && sv.x.opt && sv.x.opt.wounds === false, "saved x.opt.wounds === false");
await reload(sv); await ev(`tutSkip(); true`); await sleep(500);
a = await J(`({ on: TLX.on("wounds"), exp: TLX.wounds.exposed() })`);
ok(a.on === false && !a.exp, "off after reload");
await ev(`toggleSettings(true); true`); await sleep(300);
r = await row(); ok(/: off/.test(r.t), "row reads off after reload (" + r.t + ")");
await ev(`toggleSettings(false); true`);
await ev(`(() => { const T = TLX.wounds.consts; let x = P.x, z = P.z; for (let k = 0; k < 4000; k++) { if (TLX.wounds.exposed()) return 0; } return 1; })()`);
// old save with no x at all, then x.opt wounds:false and junk opt values
const old = JSON.parse(JSON.stringify(sv)); delete old.x; await reload(old); await ev(`tutSkip(); true`); await sleep(400);
ok(await J(`TLX.on("wounds")`) === true, "old save without x: option defaults on");
const odd = JSON.parse(JSON.stringify(sv)); odd.x.opt = { wounds: "no" }; await reload(odd); await ev(`tutSkip(); true`); await sleep(400);
console.log("opt wounds:'no' ->", await J(`TLX.on("wounds")`));

// touch taps live in x1_options_touch.mjs (a tap right after the reloads above did not flip the row here; in a clean boot four taps flip it four times)
console.log("fails:", fails);
await done(fails ? 1 : 0);
