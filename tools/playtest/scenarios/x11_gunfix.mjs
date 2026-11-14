// Beta fixes on the rifle (tlx-guns v4). Asserts, exit 1 on a failure.
//  0192 #1  the pack takes 120 rounds and stays there when rounds come back out of the magazine:
//    A. a smaller magazine with a full pack and nowhere for the spare rounds: refused, said, nothing changes
//    B. the same swap with room in the pack: the spare rounds go back, to exactly 120 at the limit
//    C. a change of load with a full pack: as many new rounds go straight in the magazine as old ones come out
//    D. a change of load with a full pack and too few of the new load to trade: refused, said, nothing changes
//    E. buying a magazine that can't go on yet: you pay once, you own it, the old one stays on
//    F. nothing vanishes over a reload
//  0190 #1  a menu over the game: the trigger is dead under Settings / the garage, Settings coming up slings the rifle,
//    it won't come up while Settings is open, and it shoulders and fires again once the menu is gone
import { boot, ev, tap, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function ready() { for (let i = 0; i < 100; i++) { await sleep(150); try { if (await ev(`typeof TLXGUN !== "undefined" && !!TLXGUN.state() && started`)) { await sleep(300); return true; } } catch (e) {} } return false; }
async function until(expr, secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) { if (await ev(expr)) return true; await sleep(80); } return !!(await ev(expr)); }
const toasts = () => J(`(TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))`);
const S = () => J(`(() => { const g = TLXGUN.gun(); return { rounds: g.rounds, ammo: g.ammo, cap: TLXGUN.stats(g).cap, sp: TLXGUN.pk("sp308"), match: TLXGUN.pk("match308"), tot: TLXGUN.pkTotal(), mag: g.parts.magazine, cash: GS.cash }; })()`);
// plant a pack and a magazine outright (what a few boxes and a few reloads leave you with)
const plant = (sp, match, mag, rounds, ammo = "sp308") => ev(`(() => { const s = TLXGUN.state(), g = TLXGUN.gun(); s.ammo = ${sp}; s.alt = ${match} ? { match308: ${match} } : {}; g.parts.magazine = ${JSON.stringify(mag)}; g.ammo = ${JSON.stringify(ammo)}; g.rounds = ${rounds}; return true; })()`);

await boot();
await ev(`tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.hour = 36; TLX.setOn("wounds", false); GS.cash = 50000; true`); await sleep(400);
ok(await ev(`TLXGUN.takeCourse() && TLXGUN.buyRifle("bolt308") && TLXGUN.buyPart("magazine", "det10")`), "setup: licence, rifle, the 10-round magazine");

// A
await plant(60, 60, "det10", 10);
let r = await ev(`TLXGUN.fit("magazine", "int3", true)`), s = await S(), tl = await toasts();
console.log("A", JSON.stringify(s));
ok(r === false && s.mag === "det10" && s.rounds === 10 && s.tot === 120, `A: full pack, 7 spare rounds: the 3-round box is refused, nothing moves (mag ${s.mag}, ${s.rounds} in it, pack ${s.tot})`);
ok(tl.some(t => /pack's too full \(120 of 120\) for the 7 rounds/.test(t)), "A: and it says why: " + (tl.find(t => /too full/.test(t)) || "(no toast)"));
// B
await plant(50, 60, "det10", 10);
r = await ev(`TLXGUN.fit("magazine", "int3", true)`); s = await S(); console.log("B", JSON.stringify(s));
ok(r === true && s.mag === "int3" && s.rounds === 3 && s.sp === 57 && s.tot === 117, `B: with room, the 7 spare rounds go back in the pack (${s.tot}, ${s.rounds} in the magazine)`);
await plant(53, 60, "det10", 10);
r = await ev(`TLXGUN.fit("magazine", "int3", true)`); s = await S();
ok(r === true && s.tot === 120 && s.rounds === 3, `B: at the limit it fills the pack to exactly 120 (${s.tot})`);
// C
await plant(60, 60, "det10", 10);
r = await ev(`TLXGUN.loadAmmo("match308", true)`); s = await S(); console.log("C", JSON.stringify(s));
ok(r === true && s.ammo === "match308" && s.tot === 120 && s.sp === 70 && s.match === 50 && s.rounds === 10, `C: full pack, change of load: 10 soft points back, 10 match straight in (pack ${s.tot}: ${s.sp} + ${s.match}, magazine ${s.rounds} ${s.ammo})`);
await plant(40, 60, "det10", 10);
r = await ev(`TLXGUN.loadAmmo("match308", true)`); s = await S();
ok(r === true && s.rounds === 0 && s.sp === 50 && s.match === 60 && s.tot === 110, `C: with room it works as before: the magazine empties into the pack (${s.tot}, magazine ${s.rounds})`);
await plant(57, 60, "det10", 10);
r = await ev(`TLXGUN.loadAmmo("match308", true)`); s = await S();
ok(r === true && s.rounds === 7 && s.tot === 120 && s.tot + s.rounds === 127, `C: partly full: only the 7 that don't fit are traded (pack ${s.tot}, magazine ${s.rounds})`);
// D
await plant(118, 2, "det10", 10);
r = await ev(`TLXGUN.loadAmmo("match308", true)`); s = await S(); tl = await toasts(); console.log("D", JSON.stringify(s));
ok(r === false && s.ammo === "sp308" && s.rounds === 10 && s.sp === 118 && s.match === 2, `D: full pack and only 2 match to trade for 10: refused, nothing moves (pack ${s.tot}, magazine ${s.rounds} ${s.ammo})`);
ok(tl.some(t => /pack's full \(120 of 120\): no room for the 10 soft point rounds/.test(t)), "D: and it says why: " + (tl.find(t => /pack's full/.test(t)) || "(no toast)"));
// E
await plant(60, 60, "det10", 10);
const c0 = (await S()).cash;
r = await ev(`TLXGUN.buyPart("magazine", "det5")`); s = await S();
ok(r === true && s.mag === "det10" && s.cash === c0 - 140 && (await ev(`TLXGUN.ownsPart("magazine", "det5")`)) && s.tot === 120 && s.rounds === 10, `E: a magazine bought with no room to fit it: paid (${c0 - s.cash}), owned, the old one stays on`);
r = await ev(`TLXGUN.buyPart("magazine", "det5")`); s = await S();
ok(r === false && s.cash === c0 - 140, "E: asking again doesn't charge again");
await plant(50, 60, "det10", 10);
r = await ev(`TLXGUN.buyPart("magazine", "det5")`); s = await S();
ok(r === true && s.mag === "det5" && s.rounds === 5 && s.tot === 115 && s.cash === c0 - 140, `E: with room it goes on free (pack ${s.tot}, magazine ${s.rounds})`);
// F
await plant(60, 60, "det10", 10); await ev(`TLXGUN.loadAmmo("match308", true)`);
const before = await S();
await ev("save(); true"); await reload(); ok(await ready(), "F: reloaded");
s = await S(); console.log("F", JSON.stringify(s));
ok(s.tot === before.tot && s.rounds === before.rounds && s.sp === before.sp && s.match === before.match && s.tot <= 120, `F: nothing vanishes over a reload (${before.tot} + ${before.rounds} -> ${s.tot} + ${s.rounds})`);

// ---- 0190 #1: menus ----
await ev(`tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.hour = 36; TLX.setOn("wounds", false); WILD.max = 0; for (const G of WILD.groups) for (const q of G.m) wildFree(q); WILD.groups.length = 0; FOOT.on = true; true`); await sleep(400);
const spot = await J(`(() => { const W = { x: depot.x, z: depot.z };
  for (let r = 500; r < 2600; r += 60) for (let an = 0; an < 6.28; an += 0.35) {
    const x = W.x + Math.cos(an) * r, z = W.z + Math.sin(an) * r;
    if (Math.abs(x) > HALF - 400 || Math.abs(z) > HALF - 400 || isSea(x, z) || isWater(x, z) || obNear(x, z, 12)) continue;
    FOOT.x = x; FOOT.z = z; if (TLXGUN.slungWhy() && TLXGUN.slungWhy() !== "busy") continue;
    for (let yw = 0; yw < 6.28; yw += 0.4) {
      const dx = Math.sin(yw), dz = Math.cos(yw); let good = true, g0 = surf(x, z);
      for (let t = 10; t <= 260 && good; t += 10) { const px = x + dx * t, pz = z + dz * t; if (isSea(px, pz) || isWater(px, pz) || Math.abs(surf(px, pz) - g0) > 1.6 || solidNear(px, pz, 3)) good = false; }
      if (!good || TLXGUN.unsafe(x, z, dx, dz)) continue;
      FOOT.y = surf(x, z); FOOT.yaw = yw; FOOT.sp = 0; P.x = x - dx * 6; P.z = z - dz * 6; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(x, z, true); camState.init = false;
      return { x: Math.round(x), z: Math.round(z), yaw: +yw.toFixed(2), r };
    } }
  return null; })()`);
console.log("spot", JSON.stringify(spot));
ok(!!spot, "G: open fell found");
if (!spot) await done(1);
await sleep(900);
await plant(40, 0, "det10", 10);
await tap("KeyL");
ok(await until("TLXGUN.AIM.on && TLXGUN.AIM.t >= 1 && TLXGUN.AIM.load <= 0 && TLXGUN.AIM.bolt <= 0", 6), "G: rifle shouldered, 10 in the magazine");
// the trigger itself, with a menu up (before the next frame slings the rifle)
r = await J(`(() => { const g = TLXGUN.gun(), n0 = g.rounds, out = {};
  $("settings").hidden = false; out.settings = TLXGUN.fire(); $("settings").hidden = true;
  GS.garageOpen = true; out.garage = TLXGUN.fire(); GS.garageOpen = false;
  out.spent = n0 - g.rounds; out.on = TLXGUN.AIM.on; return out; })()`);
ok(r.settings === false && r.garage === false && r.spent === 0 && r.on, `G: the trigger is dead under Settings and the garage (rounds spent ${r.spent})`);
// the real thing: Settings comes up while shouldered, then E
let n0 = (await S()).rounds;
await ev("toggleSettings(true); true");
await tap("KeyE"); await sleep(400);
s = await S(); let a = await J(`({ on: TLXGUN.AIM.on, hud: !!$("gunHud") && !$("gunHud").hidden, set: !$("settings").hidden, walker: !!(FOOT.g && FOOT.g.visible) })`);
console.log("G settings", JSON.stringify(a), "rounds", n0, "->", s.rounds);
ok(a.set && s.rounds === n0, `G: Settings open + the use key: no shot (rounds ${n0} -> ${s.rounds})`);
ok(!a.on && !a.hud && a.walker, "G: Settings coming up slings the rifle: sight off the screen, the walker is back");
await tap("KeyL"); await sleep(400);
ok(!(await ev("TLXGUN.AIM.on")), "G: the rifle control does nothing while Settings is open");
await ev("toggleSettings(false); true"); await sleep(300);
await tap("KeyL");
ok(await until("TLXGUN.AIM.on && TLXGUN.AIM.t >= 1 && TLXGUN.AIM.load <= 0 && TLXGUN.AIM.bolt <= 0", 6), "G: Settings shut: it shoulders again");
n0 = (await S()).rounds;
await tap("KeyE"); await sleep(300);
s = await S();
ok(s.rounds === n0 - 1, `G: and the use key fires again (rounds ${n0} -> ${s.rounds})`);
await done(fails ? 1 : 0);
