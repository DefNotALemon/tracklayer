// Beta break test for the wounds/bandage hazard itself (tlx-wounds.js): bandage on key / pad / touch, pad D-pad-down clash with
// "call for help" (empty tank), bleeding behind menus, bleed-out blackout, reload mid-bleed.
import { boot, reload, ev, raw, tap, sleep, shot, done, padSet } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(100); }
const W = () => J(`({ n: TLX.state("wounds").wounds.length, ages: TLX.state("wounds").wounds.map(w => +w.age.toFixed(1)), b: TLX.state("wounds").bandages, hp: +GS.health.toFixed(1), dead: !!GS.dead, fuel: GS.fuel, helpOn: HELP.on, called: HELP.called })`);
const dpad = async idx => { await padSet({ [idx]: 1 }); await sleep(160); await padSet({}); await sleep(200); };
const farSpot = () => ev(`(() => { let best = null, bd = 0; for (let x = -WORLD/2 + 200; x < WORLD/2 - 200; x += 150) for (let z = -WORLD/2 + 200; z < WORLD/2 - 200; z += 150) { if (isSea(x, z) || isWater(x, z)) continue; const d = Math.min(...SITES.map(s => Math.hypot(x - s.x, z - s.z))); if (d > bd) { bd = d; best = [x, z]; } } crashCancel(); FOOT.on = false; P.x = best[0]; P.z = best[1]; P.y = surf(P.x, P.z); P.vx = P.vz = 0; recenter(P.x, P.z, true); return 1; })()`);
const reset = async () => { await ev(`(() => { const s = TLX.state("wounds"); s.wounds = []; s.health = 100; s.bandages = 3; s.cd = 9999; GS.fuel = 8; return 1; })()`); };

await boot();
await ev(`tutSkip(); GS.hour = 34; true`); await sleep(500);
await farSpot(); await sleep(800); await reset();

// A: key bandage, fresh vs soaked
await ev(`TLX.wounds.hit(); true`); await waitGame(1);
await tap("KeyU"); await sleep(300);
let w = await W(); ok(w.n === 0 && w.b === 2, "A1 U on a fresh wound dresses it " + JSON.stringify(w));
await ev(`TLX.wounds.hit(); true`); await waitGame(7.5);
await tap("KeyU"); await sleep(300);
w = await W(); ok(w.n === 1 && w.b === 2, "A2 soaked wound refuses a bandage, bandage kept " + JSON.stringify(w));
await ev(`TLX.wounds.hit(); true`); await waitGame(0.5); await tap("KeyU"); await sleep(300);
w = await W(); ok(w.n === 1 && w.b === 1, "A3 bandage picks the fresh one " + JSON.stringify(w));
await reset();

// B: pad D-pad down with an empty tank (help wanted) and a bleeding rider
await ev(`TLX.wounds.hit(); GS.fuel = 0; true`); await waitGame(1);
await dpad(13); await sleep(300);
w = await W();
ok(w.n === 0, "B1 pad D-pad down dresses the wound while the tank is empty " + JSON.stringify(w));
await shot("xw_padclash");
await ev(`HELP.on = false; HELP.called = false; true`); await reset();

// C: touch button visible while open, hidden after
await ev(`TLX.wounds.hit(); true`); await waitGame(1.5);
const tb = () => J(`(() => { const b = document.getElementById("tcBand"); const r = b.getBoundingClientRect(); return { hidden: b.hidden, w: r.width }; })()`);
await ev(`SET.touch = "on"; setTouchUI(); true`); await sleep(500);
let t = await tb(); ok(!t.hidden && t.w > 30, "C1 BANDAGE touch button shows while bleeding " + JSON.stringify(t));
await ev(`document.getElementById("tcBand").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); true`); await sleep(300);
w = await W(); ok(w.n === 0, "C2 touch BANDAGE dresses it " + JSON.stringify(w));
await sleep(400); t = await tb(); ok(t.hidden, "C3 touch button hides again once dressed " + JSON.stringify(t));
await ev(`SET.touch = "auto"; setTouchUI(); true`); await reset();

// D: bleeding behind menus
await ev(`TLX.wounds.hit(); true`); await waitGame(0.5);
const h0 = (await W()).hp;
await ev(`toggleSettings(true); true`); await sleep(6000);
const h1 = (await W()).hp; await ev(`toggleSettings(false); true`);
console.log("D1 settings open ~6 s wall: hp", h0, "->", h1, "(bleeding continues behind menu:", h1 < h0, ")");
await ev(`TABLET.toggle(true, "map"); true`); await sleep(1000);
await tap("KeyU"); await sleep(300);
console.log("D2 U with tablet open:", JSON.stringify(await W()));
await ev(`TABLET.close(); true`); await reset();

// E: bleed out -> blackout tow
await ev(`GS.cash = 500; TLX.wounds.hit(); TLX.wounds.hit(); TLX.wounds.hit(); TLX.state("wounds").health = 6; true`);
await waitGame(8); await sleep(1500);
w = await W(); const bl = await ev(`!$("black").hidden`);
console.log("E bleed-out:", JSON.stringify(w), "black shown", bl, "cash", await ev(`GS.cash`));
ok(w.dead || bl, "E1 health 0 triggers the tow blackout");
await shot("xw_blackout");
await sleep(9000);
console.log("E2 later:", JSON.stringify(await W()), "black hidden", await ev(`$("black").hidden`), "cash", await ev(`GS.cash`));
await shot("xw_after");
await ev(`GS.dead = false; $("black").hidden = true; true`);

// F: reload mid-bleed
await farSpot(); await sleep(500); await reset();
await ev(`TLX.wounds.hit(); true`); await waitGame(3.5); await ev(`save(); true`);
const sv = JSON.parse(await raw(`localStorage.getItem("tracklayer.save.v2")`));
console.log("F saved wounds", JSON.stringify(sv.x && sv.x.sys && sv.x.sys.wounds));
await reload(sv); await ev(`tutSkip(); true`); await sleep(800);
w = await W(); console.log("F after reload:", JSON.stringify(w));
ok(w.n === 1 && w.ages[0] >= 3, "F1 an open wound survives a reload with its age");
console.log("fails:", fails);
await done(fails ? 1 : 0);
