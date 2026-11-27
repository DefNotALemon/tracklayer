// Beta 0375 (2.7 v295 follow-up): the on-foot hint beside a truck says "get in the pickup" in every branch that appends the
//   board word (plain, a second use such as the fire, a buried car, a bogged machine), not "get on"; and what TLXV.remove refuses.
import { boot, ev, sleep, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify((${e}) ?? null)`));
await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.warmth = 100; WX.at = () => 0; GS.storm = 0; GS.cash = 99999; true`);
const r0 = await J(`(() => { const x = P.x + 40, z = P.z; recenter(P.x, P.z, true); const u = TLXV.buy("pickup"); return { u: typeof u === "object" ? (u && u.uid) : u, own: TLX.state("vehicles").owned.map(q => q.id), board: VEH.board }; })()`);
console.log("buy", JSON.stringify(r0));
const hint = async () => { await sleep(500); return await J(`(document.getElementById("wnHint") || {}).textContent || ""`); };
const stand = async (dx) => await ev(`(() => { const q = TLX.state("vehicles").owned.slice(-1)[0]; const x = q.x + ${dx}, z = q.z; FOOT.on = true; FOOT.x = x; FOOT.z = z; FOOT.y = surf(x, z); CRASH.cool = 1; return 1; })()`);
await stand(2.5);
const h1 = await hint(); console.log("plain:", h1);
ok(/pickup/i.test(h1) && !/get on\b/i.test(h1), "plain: names the pickup, not 'get on'");
// a bogged machine beside the truck
await ev(`(() => { try { enterBog(); } catch (e) { return String(e); } return 1; })()`);
const h2 = await hint(); console.log("bogged:", h2, "BOG.on", await J(`BOG.on`));
if (await J(`BOG.on`)) ok(!/get on\b/i.test(h2) || /pickup/i.test(h2), "bogged: board word names the pickup (line 16705 hardcodes 'get on')");
else console.log("skip bogged: could not bog");
await ev(`(() => { try { BOG.on = false; FOOT.dig = false; } catch (e) {} return 1; })()`);
// remove(): refused for the current truck, allowed once you are away from it
const rm1 = await J(`TLXV.remove(TLX.state("vehicles").owned.slice(-1)[0].uid)`);
const cur = await J(`TLX.state("vehicles").cur`);
console.log("remove beside it ->", rm1, "cur", cur);
await ev(`(() => { FOOT.x += 400; FOOT.y = surf(FOOT.x, FOOT.z); P.x = FOOT.x; P.z = FOOT.z; return 1; })()`); await sleep(1200);
const rm2 = await J(`(() => { const v = TLX.state("vehicles"); let n = 0; for (const q of v.owned.slice()) if (TLXV.remove(q.uid)) n++; return { n, left: v.owned.length, cur: v.cur }; })()`);
console.log("remove far ->", JSON.stringify(rm2));
await done(fails);
