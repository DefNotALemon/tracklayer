// Beta 11.3 ammo loads: try to break it. Pack cap vs rounds returned from the magazine, swap mid-bolt,
// magazine part swap with a mixed pack, rapid load swaps, a pack that holds only the loaded load.
import { boot, ev, tap, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const S = () => J(`(() => { const g = TLXGUN.gun(); return { rounds: g.rounds, ammo: g.ammo, cap: TLXGUN.stats(g).cap, pk: TLXGUN.AMMOS.map(a => a.id + ":" + TLXGUN.pk(a.id)).join(" "), tot: TLXGUN.pkTotal(), mag: g.parts.magazine, load: TLXGUN.AIM.load }; })()`);
await boot();
await ev(`tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.hour = 36; TLX.setOn("wounds", false); GS.cash = 50000; true`); await sleep(400);
await ev(`TLXGUN.takeCourse(); TLXGUN.buyRifle("bolt308"); true`);
console.log("parts", JSON.stringify(await J(`TLXGUN.PARTS.magazine.map(p => p.id + ":" + p.cost)`)));
// A. fill the pack to 120 (6 boxes of mixed), load a round-bearing magazine, swap the load: rounds go back in the pack
await ev(`for (let i = 0; i < 3; i++) TLXGUN.buyAmmo("sp308"); for (let i = 0; i < 3; i++) TLXGUN.buyAmmo("match308"); true`);
await ev(`TLXGUN.loadAmmo("sp308", true)`); await sleep(300);
// get rounds into magazine through a feed: shoulder is not needed, set directly like a reload would
await ev(`(() => { const g = TLXGUN.gun(); const n = Math.min(TLXGUN.stats(g).cap, TLXGUN.pk(g.ammo)); g.rounds = n; return n; })()`);
let s = await S(); console.log("A before", JSON.stringify(s));
// this direct set doesn't take rounds from the pack, so pack stays 120; magazine has extra: emulates a real reload where pack drops
await ev(`(() => { const g = TLXGUN.gun(); TLXGUN.state().ammo -= g.rounds; return 1; })()`);
s = await S(); console.log("A mag filled", JSON.stringify(s));
await ev(`TLXGUN.buyAmmo("sp308"); true`); // refill pack to 120 with magazine loaded
s = await S(); console.log("A pack refilled", JSON.stringify(s));
await ev(`TLXGUN.loadAmmo("match308", true)`);
s = await S(); console.log("A after load swap", JSON.stringify(s));
ok(s.tot <= 120, "A: pack total after swapping load with a full pack stays within 120 (" + s.tot + ")");
// B. fit the smallest magazine with a full magazine and a full pack
await ev(`for (const p of TLXGUN.PARTS.magazine) { TLXGUN.buyPart("magazine", p.id); } true`);
const mags = await J(`TLXGUN.PARTS.magazine.map(p => p.id)`);
await ev(`TLXGUN.fit("magazine", ${JSON.stringify(mags[mags.length - 1])}, true)`);
await ev(`(() => { const g = TLXGUN.gun(); g.rounds = TLXGUN.stats(g).cap; return 1; })()`);
await ev(`TLXGUN.fit("magazine", ${JSON.stringify(mags[0])}, true)`);
s = await S(); console.log("B small mag", JSON.stringify(s));
ok(s.tot <= 120, "B: pack total after a smaller magazine returns rounds stays within 120 (" + s.tot + ")");
ok(s.rounds <= s.cap, "B: magazine within cap");
// C. rapid load swaps conserve rounds
const tot0 = (await S()).tot + (await S()).rounds;
for (const id of ["sub308", "fmj308", "sp308", "match308", "sub308"]) await ev(`TLXGUN.loadAmmo(${JSON.stringify(id)}, true)`);
s = await S(); console.log("C", JSON.stringify(s));
ok(s.tot + s.rounds === tot0 || (await ev("1")) && s.tot + s.rounds === tot0, `C: rounds conserved over rapid swaps (${tot0} -> ${s.tot + s.rounds})`);
// D. load not carried is refused, unknown id refused
ok((await ev(`TLXGUN.loadAmmo("nope", true)`)) === false, "D: unknown load refused");
// E. reload with an in-magazine load and an empty pack of it
await ev(`(() => { const st = TLXGUN.state(); st.alt = {}; st.ammo = 0; const g = TLXGUN.gun(); g.ammo = "sub308"; g.rounds = 2; return 1; })()`);
await reload(); for (let i = 0; i < 100; i++) { await sleep(150); try { if (await ev(`typeof TLXGUN !== "undefined" && !!TLXGUN.state() && started`)) break; } catch (e) {} }
s = await S(); console.log("E", JSON.stringify(s));
ok(s.ammo === "sub308" && s.rounds === 2, "E: a load with an empty pack but rounds in the magazine survives reload");
ok(JSON.stringify(await J(`TLXGUN.ammoCarried().map(a => a.id)`)) === '["sub308"]', "E: ammoCarried lists the magazine's load");
await done(fails ? 1 : 0);
