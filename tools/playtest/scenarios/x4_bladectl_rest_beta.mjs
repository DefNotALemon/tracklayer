// Beta: 4.1a1 blade use control "rests" while Settings / garage / tablet / god menu is up (README), on keyboard and pad;
// and the horn rule in the same states. Prints blade state + horn count per case. Exit 1 on a failure.
import { boot, ev, tap, sleep, done, padSet, padOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 9000; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`); await sleep(600);
await ev(`TLXV.buy("pickup"); true`); await sleep(300);
const uid = await ev(`TLXV.state().owned[0].uid`);
await ev(`TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(600);
await ev(`if (!window.__hornW) { const h0 = horn; window.__horn = 0; horn = function () { window.__horn++; return h0.apply(this, arguments); }; window.__hornW = true; } true`);
const B = () => J(`(() => { const u = TLXV.state().cur, b = TLXPL.rt(u); return { down: b.down, horn: window.__horn, tab: !!TABLET.open, ga: !!GS.garageOpen, set: !$("settings").hidden }; })()`);
const L3 = async () => { await padSet({ 10: 1 }, [0, 0, 0, 0]); await sleep(200); await padSet({}, [0, 0, 0, 0]); await waitGame(0.6); };
const states = {
  tablet: [`TABLET.toggle(true, "map"); true`, `TABLET.toggle(false); true`],
  settings: [`$("settings").hidden = false; true`, `$("settings").hidden = true; true`],
  garage: [`GS.garageOpen = true; true`, `GS.garageOpen = false; true`],
};
for (const withBlade of [false, true]) {
  if (withBlade) await ev(`TLXPL.fit(${JSON.stringify(uid)}, "b23"); true`);
  console.log("--- blade fitted: " + withBlade);
  for (const [nm, [on, off]] of Object.entries(states)) {
    await ev(on); await sleep(500);
    let b0 = await B();
    await tap("KeyE"); await waitGame(0.6); let b = await B();
    console.log(nm, "E", JSON.stringify(b0), "->", JSON.stringify(b));
    ok(b.down === b0.down, `${nm} open, blade ${withBlade}: E leaves the blade alone`);
    await L3(); let c = await B();
    console.log(nm, "L3 ->", JSON.stringify(c));
    ok(c.down === b0.down, `${nm} open, blade ${withBlade}: L3 leaves the blade alone`);
    console.log(`   horn count during ${nm}: ${c.horn - b0.horn} (E+L3)`);
    await ev(off); await sleep(500);
    // after closing, the control works again
    const h = (await B()).horn;
    await tap("KeyE"); await waitGame(0.8); b = await B();
    if (withBlade) { ok(b.down !== b0.down, `${nm} closed: E works the blade again`); await tap("KeyE"); await waitGame(0.8); }
    else ok(b.horn === h + 1, `${nm} closed: E is the horn again`);
  }
}
await padOff();
console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
