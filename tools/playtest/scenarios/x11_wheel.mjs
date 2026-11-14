// Slice 11.2 (G4): the quick-customize wheel (tlx-gunwheel.js, on the rifle model in tlx-guns.js). Asserts, exit 1 on a failure.
//  A. a planted save with the rifle + owned spare parts loads (rifle and parts survive a reload; the stock part is on each slot).
//  B. KEYBOARD: HOLD R opens the wheel over the game without pausing it, 1 picks the slot, 2 picks a part you own: it snaps on,
//     the wheel closes and the stats move the right way. A part you don't own isn't offered and can't be fitted.
//  C. PAD: hold D-pad left opens it, D-pad + A move and pick, B backs out; a tap of D-pad left does not open it.
//  D. TOUCH: hold the GUN button, tap the slot, tap the part. Every prompt comes from btn() in each scheme.
//  E. with the rifle shouldered the wheel still opens, swaps a part, and the rifle in hand is rebuilt (no page error).
//  F. PEOPLE (the hard rule, against tlx-guns.js's trigger): with a person (a rider, the dog) in the line of fire, close to the
//     shooter, standing where the animal is or behind it, the rifle stays on safe: no shot, no round spent, the animal untouched.
//  G. the shop's cards and the wheel agree: a part bought at Jakt & Våpen appears in the wheel's strip.
import { boot, ev, tap, down, up, sleep, done, shot, reload, padSet, padOff, send } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(60); }
async function until(expr, secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) { if (await ev(expr)) return true; await sleep(80); } return !!(await ev(expr)); }
const G = () => J(`(() => { const g = TLXGUN.gun(), s = TLXGUN.state(); return g ? { parts: g.parts, ammo: s.ammo, rounds: g.rounds, stats: TLXGUN.stats(g), cash: GS.cash } : null; })()`);
const W = () => J(`({ open: TLXWHEEL.W.open, stage: TLXWHEEL.W.stage, slot: TLXWHEEL.W.slot, hl: TLXWHEEL.W.hl, hidden: $("gnWheel").hidden, text: $("gnWheel").textContent, parts: [...$("gnWheel").querySelectorAll("button[data-part]")].map(b => b.dataset.part), slots: $("gnWheel").querySelectorAll("button[data-slot]").length })`);
async function holdR() { await down("KeyR"); await until("TLXWHEEL.W.open", 6); await up("KeyR"); await sleep(150); }
const toasts = () => J(`(TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))`);

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = true; WX.at = () => 0; GS.storm = 0; GS.hour = 36; WILD.max = 0; true`); await sleep(500);

const stand = async () => { await ev(`(() => { FOOT.on = true; VEH.cur = null; FOOT.sp = FOOT.fwd = 0; camState.init = false; INT.on = false; return true; })()`); await sleep(250); };

// ---- A: plant a save with the rifle and spare parts, reload it
await stand();
await ev(`GS.cash = 9000; TLXGUN.takeCourse(); TLXGUN.buyRifle("bolt308"); for (const p of ["barrel:carb18", "barrel:heavy24", "stock:synth", "magazine:det10"]) TLXGUN.buyPart(...p.split(":"));
  for (const [s, i] of [["barrel", "std22"], ["stock", "walnut"], ["magazine", "int3"]]) TLXGUN.fit(s, i, true); TLXGUN.buyAmmo(); save(); true`);   // buying fits it: the stock parts go back on, the bought ones stay in the kit
const planted = await J(`JSON.parse(localStorage.getItem("tracklayer.save.v2"))`);
ok(planted.x && planted.x.sys.guns && planted.x.sys.guns.s.owned.length === 1 && Object.keys(planted.x.sys.guns.s.parts).length === 4, "A: the save holds the rifle and 4 bought parts");
await reload(planted); await sleep(600);
await ev(`tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.hour = 36; WILD.max = 0; true`); await stand();
let g = await G(); console.log("A", JSON.stringify(g));
ok(g && g.parts.barrel === "std22" && g.parts.sight === "iron" && g.ammo === 20 && Object.keys(g.parts).length === 5, "A: after a reload the rifle is there, every slot on its stock part, 20 rounds in the pack");
const owned0 = await J(`[["barrel","carb18"],["barrel","heavy24"],["stock","synth"],["magazine","det10"],["sight","scope39"],["barrel","std22"]].map(([s, i]) => TLXGUN.ownsPart(s, i))`);
ok(owned0.join() === "true,true,true,true,false,true", "A: owns the bought parts and the stock part, not the scope: " + owned0.join());

// ---- B: the wheel by keyboard
await ev(`INP.dev = "kbm"; true`);
const st0 = g.stats, clk0 = await clock();
await down("KeyR"); await sleep(700);
let w = await W(); await shot("x11_wheel");
ok(w.open && !w.hidden && w.slots === 6, "B: HOLD R opens the wheel, five part slots and Ammo round the rifle");
ok((await clock()) - clk0 > 0.25, "B: the game keeps running with the wheel open (game clock +" + ((await clock()) - clk0).toFixed(2) + " s)");
ok(/Esc close/.test(w.text) && /1-6 pick a slot/.test(w.text), "B: its help line names the controls through btn(): " + w.text.slice(-120));
await up("KeyR"); await sleep(200);
ok((await W()).open, "B: letting go leaves it open for the pick (hold opens, picking closes)");
await tap("Digit1"); await sleep(250); w = await W();
ok(w.stage === "part" && w.slot === 0 && w.parts.join() === "std22,carb18,heavy24", "B: slot 1 (barrel) lists the three barrels I own: " + w.parts.join());
await tap("Backspace"); await sleep(150); await tap("Digit5"); await sleep(250); w = await W();
ok(w.parts.join() === "iron", "B: the sight slot lists only the iron sights: the scope isn't owned, so it isn't offered (" + w.parts.join() + ")");
ok((await ev(`TLXGUN.fit("sight", "scope39", true)`)) === false && (await G()).parts.sight === "iron", "B: and fit() refuses a part that isn't owned");
await tap("Backspace"); await sleep(150); await tap("Digit1"); await sleep(200);
await shot("x11_strip");
await tap("Digit2"); await sleep(300); g = await G(); w = await W();
ok(g.parts.barrel === "carb18" && !w.open && w.hidden, "B: pressing 2 fits the carbine barrel and the wheel closes");
ok(g.stats.handling > st0.handling && g.stats.spread > st0.spread && g.stats.kg < st0.kg && g.stats.noise > st0.noise && g.stats.range < st0.range, `B: stats moved the right way: handling ${st0.handling}->${g.stats.handling}, spread ${st0.spread}->${g.stats.spread} MOA (less accurate), weight ${st0.kg}->${g.stats.kg}, noise ${st0.noise}->${g.stats.noise}, reach ${st0.range}->${g.stats.range}`);
// a 10-round magazine raises the capacity; the wheel as the only way to change it
await holdR(); await tap("Digit4"); await sleep(200); await tap("Digit2"); await sleep(300); g = await G();
console.log("B mag", JSON.stringify(await ev(`TLXGUN.stats(TLXGUN.gun()).cap`)));
ok(g.parts.magazine === "det10" && (await ev(`TLXGUN.stats(TLXGUN.gun()).cap`)) === 10, "B: the magazine slot works the same (10-round fitted, capacity 10)");
await ev(`TLXGUN.fit("magazine", "int3", true); true`);
// a quick tap of R must not open it
await tap("KeyR", 60); await sleep(300);
ok(!(await W()).open, "B: a quick tap of R doesn't open the wheel (hold, don't tap)");
// Esc closes without changing anything
await holdR(); await tap("Escape"); await sleep(250);
ok(!(await W()).open && (await ev(`$("settings").hidden`)), "B: Esc closes the wheel and doesn't open Settings");

// ---- C: the wheel by pad
await padSet({ 14: 1 }); await sleep(120); await padSet({}); await sleep(300);
ok(!(await W()).open, "C: a quick tap of D-pad left doesn't open the wheel");
await padSet({ 14: 1 }); await until("TLXWHEEL.W.open", 6); await sleep(100); await padSet({}); await sleep(300); w = await W();
ok(w.open && (await ev(`INP.dev`)) === "pad", "C: HOLD D-pad left opens the wheel (pad)");
ok(/D-pad \/ stick pick a slot/.test(w.text) && /B close/.test(w.text), "C: its help names the pad controls: " + w.text.slice(-110));
await padSet({ 0: 1 }); await sleep(200); await padSet({}); await sleep(300); w = await W();     // A on the highlighted slot (barrel)
ok(w.stage === "part" && w.slot === 0, "C: A opens the highlighted slot (barrel)");
await padSet({ 15: 1 }); await sleep(150); await padSet({}); await sleep(250);                      // right: short -> long
await padSet({ 0: 1 }); await sleep(200); await padSet({}); await sleep(350); g = await G(); w = await W();
ok(g.parts.barrel === "heavy24" && !w.open, "C: D-pad right then A fits the heavy barrel (" + g.parts.barrel + "), wheel closed");
ok(g.stats.spread < st0.spread && g.stats.handling < st0.handling && g.stats.range > st0.range, `C: heavy barrel: spread ${st0.spread}->${g.stats.spread} MOA (tighter), handling ${st0.handling}->${g.stats.handling}, reach ${st0.range}->${g.stats.range}`);
await padSet({ 14: 1 }); await until("TLXWHEEL.W.open", 6); await sleep(100); await padSet({}); await sleep(250);
await padSet({ 1: 1 }); await sleep(200); await padSet({}); await sleep(300);
ok(!(await W()).open && (await ev(`GS.garageOpen`)) === false, "C: B closes the wheel (and doesn't open the garage)");

// ---- D: the wheel by touch
await padOff(); await sleep(200);
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(700);
ok(!(await ev(`$("gnGun").hidden`)) && (await ev(`$("gnGun").textContent`)) === "GUN", "D: the GUN button is on the touch screen, reading GUN");
await ev(`(() => { const b = $("gnGun"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 9, pointerType: "touch" })); return true; })()`);
await waitGame(0.5);
ok((await W()).open, "D: HOLDING the GUN button opens the wheel");
await ev(`$("gnGun").dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 9, pointerType: "touch" })); true`); await sleep(200);
ok((await W()).open, "D: releasing leaves it open for the taps");
w = await W(); ok(/Tap a slot/.test(w.text), "D: touch help text: " + w.text.slice(-90));
await shot("x11_touch_wheel");
await ev(`$("gnWheel").querySelector('button[data-slot="0"]').click(); true`); await sleep(250);
await shot("x11_touch_strip");
await ev(`$("gnWheel").querySelector('button[data-part="std22"]').click(); true`); await sleep(300); g = await G();
ok(g.parts.barrel === "std22" && !(await W()).open, "D: tap the slot, tap the part: the standard barrel is back on, wheel closed");
await ev(`$("gnGun").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 9, pointerType: "touch" })); true`); await sleep(40);
await ev(`$("gnGun").dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 9, pointerType: "touch" })); true`); await sleep(300);
ok(!(await W()).open, "D: a quick tap of GUN doesn't open it (it says to hold)");
await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`); await sleep(300);


// ---- out on the open fell, for E and F: a clear 260 m line, nobody down-range, away from every house
await ev(`(() => { WILD.max = 0; for (const G of WILD.groups) for (const q of G.m) wildFree(q); WILD.groups.length = 0; window.__an = [];
  window.__mk = (kind, d, off) => { const yw = window.__yaw + off, x = FOOT.x + Math.sin(yw) * d, z = FOOT.z + Math.cos(yw) * d, q = wildRig(kind);
    const G = { kind, sp: QSP[kind], x, z, yaw: yw + 1.57, state: "graze", t: 999, v: 0, m: [q] };
    Object.assign(q, { x, z, yaw: G.yaw, v: 0, ox: 0, oz: 0, graze: 0.3, wT: 999 }); q.ant.visible = true; WILD.groups.push(G); window.__an.push(G); return window.__an.length - 1; };
  return true; })()`);
const spot = await J(`(() => { const W = { x: depot.x, z: depot.z };
  for (let r = 500; r < 2600; r += 60) for (let an = 0; an < 6.28; an += 0.35) {
    const x = W.x + Math.cos(an) * r, z = W.z + Math.sin(an) * r;
    if (Math.abs(x) > HALF - 400 || Math.abs(z) > HALF - 400 || isSea(x, z) || isWater(x, z) || obNear(x, z, 12)) continue;
    FOOT.x = x; FOOT.z = z; if (TLXGUN.slungWhy() && TLXGUN.slungWhy() !== "busy") continue;
    for (let yw = 0; yw < 6.28; yw += 0.4) {
      const dx = Math.sin(yw), dz = Math.cos(yw); let good = true, g0 = surf(x, z);
      for (let t = 10; t <= 260 && good; t += 10) { const px = x + dx * t, pz = z + dz * t; if (isSea(px, pz) || isWater(px, pz) || Math.abs(surf(px, pz) - g0) > 1.6 || solidNear(px, pz, 3)) good = false; }
      if (!good || TLXGUN.unsafe(x, z, dx, dz)) continue;
      FOOT.on = true; FOOT.y = surf(x, z); FOOT.yaw = yw; FOOT.sp = 0; window.__yaw = yw; P.x = x - dx * 6; P.z = z - dz * 6; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(x, z, true); camState.init = false;
      return { x: Math.round(x), z: Math.round(z), yaw: +yw.toFixed(2), r };
    } }
  return null; })()`);
console.log("spot", JSON.stringify(spot));
ok(!!spot, "E: found open fell with a clear 260 m line");
if (!spot) await done(1);
await sleep(900);
const aimAt = n => ev(`(() => { const q = window.__an[${n}].m[0], sc = q.g.scale.x, cy = surf(q.x, q.z) + q.sp.hipY * sc * 0.92, ey = Math.max(FOOT.y, surf(FOOT.x, FOOT.z) - 0.4) + 1.6, d = Math.hypot(q.x - FOOT.x, q.z - FOOT.z);
  FOOT.yaw = Math.atan2(q.x - FOOT.x, q.z - FOOT.z); TLXGUN.AIM.pitch = Math.atan2(cy - ey, d); return d; })()`);

// ---- E: shoulder the rifle (L), then change a part through the wheel without lowering it
await ev(`TLXGUN.fit("barrel", "std22", true); TLXGUN.fit("sight", "iron", true); true`);
await tap("KeyL");
ok(await until("TLXGUN.AIM.on && TLXGUN.AIM.t >= 1", 5), "E: L shoulders the rifle");
await until("TLXGUN.gun().rounds === 3", 6);
const vk0 = await ev("TLXGUN.AIM.vmKey");
await holdR(); w = await W();
ok(w.open && (await ev("TLXGUN.AIM.on")), "E: hold R opens the wheel with the rifle still at the shoulder");
await tap("Digit1"); await sleep(250); await tap("Digit3"); await sleep(400); g = await G();
ok(g.parts.barrel === "heavy24" && !(await W()).open && (await ev("TLXGUN.AIM.on")), "E: picking the heavy barrel fits it, closes the wheel, and the rifle stays up");
await sleep(500);
const vk1 = await ev("TLXGUN.AIM.vmKey"); console.log("E vmKey", vk0, "->", vk1);
ok(vk0 !== vk1, "E: the rifle in your hands was rebuilt to match the new barrel");
await ev(`TLXGUN.fit("barrel", "std22", true); true`);

// ---- F: people can never be shot. A rider / the dog in the line of fire, or close by, and the trigger stays on safe.
await ev(`for (const G of WILD.groups) for (const q of G.m) wildFree(q); WILD.groups.length = 0; window.__an.length = 0; true`);
await ev(`window.__mk("reindeer", 70, 0)`); await sleep(300); await ev(`window.__p0 = TLX.api.people; true`);
ok(await until("TLXGUN.AIM.on && TLXGUN.AIM.t >= 1 && TLXGUN.AIM.bolt <= 0 && TLXGUN.gun().rounds > 0", 8), "F: rifle up, loaded, bolt worked");
const refuse = async (label, who, place) => {
  await ev(`window.__an[0].m[0].dead = 0; window.__an[0].m[0].deadK = 0; window.__an[0].m[0].g.visible = true; WILD.groups[0].state = "graze"; true`);
  await ev(`(() => { const f = FOOT, a = Math.sin(f.yaw), b = Math.cos(f.yaw), q = window.__an[0].m[0]; window.__pp = ${place}; TLX.api.people = () => [window.__pp]; return true; })()`);
  await aimAt(0); await frames(2);
  const b = await J(`({ r: TLXGUN.gun().rounds, taken: JSON.stringify(TLXGUN.state().taken), dead: !!window.__an[0].m[0].dead, safe: TLXGUN.unsafe(FOOT.x, FOOT.z, Math.sin(FOOT.yaw), Math.cos(FOOT.yaw)) })`);
  const fired = await ev(`TLXGUN.fire()`); await frames(2);
  const a = await J(`({ r: TLXGUN.gun().rounds, taken: JSON.stringify(TLXGUN.state().taken), dead: !!window.__an[0].m[0].dead, res: TLXGUN.AIM.last && TLXGUN.AIM.last.res, why: TLXGUN.AIM.last && TLXGUN.AIM.last.why })`);
  console.log("F", label, JSON.stringify({ b, fired, a }));
  ok(fired === false && !!b.safe && a.r === b.r && a.taken === b.taken && !a.dead && a.res === "safe", `F: ${label}: fire() refused ("${a.why}"), no round spent (${b.r} -> ${a.r}), no kill recorded, the animal untouched`);
  await ev(`TLX.api.people = window.__p0; true`);
  await until("TLXGUN.AIM.safeT <= 0", 4);
};
async function frames(n = 3) { const p0 = await ev("TLXGUN.AIM.ph"); let last = p0, c = 0; for (let i = 0; i < 200 && c < n; i++) { await sleep(40); const p = await ev("TLXGUN.AIM.ph"); if (p !== last) { c++; last = p; } } }
await refuse("a rider 25 m ahead in the line, in front of the animal", "rider", `{ x: f.x + a * 25, z: f.z + b * 25, who: "rider" }`);
await refuse("a rider standing exactly where the animal is", "rider", `{ x: q.x, z: q.z, who: "rider" }`);
await refuse("a person 150 m beyond the animal, same line", "rider", `{ x: f.x + a * 220, z: f.z + b * 220, who: "rider" }`);
await refuse("the dog close in the line", "dog", `{ x: f.x + a * 8, z: f.z + b * 8, who: "dog" }`);
await refuse("a rider with the animal 70 m out, 3 m off the line", "rider", `{ x: f.x + a * 40 + b * 3, z: f.z + b * 40 - a * 3, who: "rider" }`);
// control: nobody about, the same shot is taken (the refusals above are the gate, not a broken rifle)
await ev(`window.__an[0].m[0].dead = 0; TLX.api.people = window.__p0; true`); await aimAt(0); await frames(2);
const c0 = await ev(`TLXGUN.gun().rounds`); const fired = await ev(`TLXGUN.fire()`); await frames(2);
const c1 = await J(`({ r: TLXGUN.gun().rounds, res: TLXGUN.AIM.last && TLXGUN.AIM.last.res })`);
ok(fired === true && c1.r === c0 - 1 && c1.res !== "safe", `F: control: with nobody about the trigger breaks (rounds ${c0} -> ${c1.r}, result "${c1.res}")`);
await ev(`TLX.api.people = window.__p0; true`);

// ---- G: the shop and the wheel agree
await ev(`TLXGUN.lower(true); true`); await sleep(300);
await ev(`GS.cash = 9000; TLXGUN.buyPart("sight", "red1"); TLXGUN.fit("sight", "iron", true); true`); await sleep(200);
await holdR(); await tap("Digit5"); await sleep(250); w = await W();
ok(w.parts.join() === "iron,red1,scope39".split(",").filter(x => x !== "scope39").join() || w.parts.join() === "iron,red1", "G: a red dot bought at the shop is in the wheel's sight strip: " + w.parts.join());
await tap("Escape"); await sleep(200);

// ---- H: persistence
await ev(`save(); true`);
const sv = await J(`JSON.parse(localStorage.getItem("tracklayer.save.v2"))`);
await reload(sv); await sleep(800);
await ev(`tutSkip(); FOOT.on = true; true`);
g = await G(); ok(g && g.parts.barrel === "std22" && (await ev(`TLXGUN.ownsPart("barrel","heavy24")`)), "H: the rifle and the owned parts survive a reload");
await holdR(); ok((await W()).open, "H: and the wheel opens on the reloaded rifle");
await tap("Escape");
delete sv.x.sys.guns; await reload(sv); await sleep(800);
await ev(`tutSkip(); FOOT.on = true; true`); await down("KeyR"); await sleep(600); await up("KeyR");
ok(!(await W()).open && (await ev(`TLXGUN.gun() === null`)), "H: with no rifle the wheel stays shut");
await done(fails ? 1 : 0);
