// Beta break test for 4.1c2 (gritter): out-of-order use. Prints findings, asserts, exit 1 on fail.
//  A spinner on, swap to the pickup and back  B two plow trucks keep separate hoppers  C reverse + spinner
//  D dismount/sled with spinner on  E hour jumps (night, backwards, day roll)  F old-save style corrupt grit  G garage open while rolling
import { boot, ev, sleep, done, down, up, tap } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
const sec = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 23.5; TLXR.ROADS.plowAt = 2; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`);
await sleep(600);
await ev(`GS.cash = 200000; GS.lic = GS.lic || {}; GS.lic.freight = true; TLXV.buy("plowtruck"); true`); await sleep(500);
await ev(`TLXV.buy("pickup"); true`); await sleep(500);
const own = await J(`TLXV.state().owned.map(o => ({ uid: o.uid, id: o.id }))`);
console.log("  owned", JSON.stringify(own));
const pt = own.find(o => o.id === "plowtruck"), pk = own.find(o => o.id === "pickup");
ok(!!pt && !!pk, "bought a plow truck and a pickup");
if (!pt || !pk) await done(1);
const PT = JSON.stringify(pt.uid), PK = JSON.stringify(pk.uid);
const seat = async u => { await ev(`TLXV.swapTo(${u}); FOOT.on = false; true`); await sleep(700); };
const drive = async (secs, key = "KeyW") => { await down(key); await waitGame(secs); await up(key); };
await seat(PT); await ev(`TLXPL.fill(${PT}); true`); await sleep(300);
const st = () => J(`(() => { const b = TLXPL.rt(${PT}); return { grit: !!b.grit, hop: Math.round(TLXPL.hopOf(${PT})), kg: Math.round(TLX.state("plow").gritKg), cur: TLXV.state().cur, keys: Object.keys(TLX.state("plow").grit).length, v: Math.hypot(P.vx, P.vz) }; })()`);
await sec("A swap while spinning", async () => {
  await ev(`TLXPL.gritToggle && TLXPL.gritToggle(${PT}); true`); await sleep(300);
  let s = await st(); ok(s.grit, "spinner on: " + JSON.stringify(s));
  await seat(PK); await ev(`P.vx = 0; P.vz = 0; true`); await drive(2);
  const s2 = await st(); ok(s2.hop === s.hop, "driving the pickup spends none of the plow truck's grit: " + s.hop + " -> " + s2.hop);
  const pg = await J(`!!TLXPL.rt(${PK}).grit`); ok(!pg, "pickup never shows a gritter flag");
  await seat(PT); await drive(2);
  const s3 = await st(); console.log("  back in plow truck", JSON.stringify(s3));
  ok(s3.hop <= s.hop, "hopper not refilled by swapping");
});
await sec("B two plow trucks", async () => {
  await ev(`TLXV.buy("plowtruck"); true`); await sleep(500);
  const o = await J(`TLXV.state().owned.filter(o => o.id === "plowtruck").map(o => o.uid)`);
  console.log("  plow trucks", o.length);
  if (o.length < 2) { ok(true, "second plow truck refused (truck cap?) - skipped"); return; }
  const h = await J(`[${JSON.stringify(o[0])}, ${JSON.stringify(o[1])}].map(u => Math.round(TLXPL.hopOf(u)))`);
  ok(h[1] === 0 && h[0] > 0, "second truck's hopper is empty and the first keeps its grit: " + h);
});
await sec("C reverse with spinner", async () => {
  await seat(PT); await ev(`GS.hour = 12; true`);
  const r = await J(`(() => { const x = TLXR.routes[0]; return x ? x.id : null })()`);
  const a = await st(); await ev(`if (!TLXPL.rt(${PT}).grit) TLXPL.gritToggle(${PT}); P.yaw = 0; true`);
  await drive(2.5, "KeyS"); const b = await st();
  console.log("  reverse", JSON.stringify([a, b]));
  ok(Number.isFinite(b.hop) && b.hop >= 0, "hopper stays a sane number after reversing");
});
await sec("D dismount / switch to sled with spinner on", async () => {
  await ev(`if (!TLXPL.rt(${PT}).grit) TLXPL.gritToggle(${PT}); true`);
  const a = await st();
  await ev(`TLXV.swapTo(null); FOOT.on = false; true`).catch(() => {}); await sleep(700);
  await ev(`P.vx = 0; P.vz = -8; true`); await waitGame(2);
  const b = await st(); console.log("  on sled", JSON.stringify([a, b]));
  ok(b.hop === a.hop, "sled riding spends no grit: " + a.hop + " -> " + b.hop);
  await seat(PT); await ev(`FOOT.on = true; true`); await sleep(500); await ev(`P.vz = 8; true`); await waitGame(1.5);
  const c = await st(); ok(c.hop === b.hop, "on foot beside a rolling truck: no grit spent: " + b.hop + " -> " + c.hop);
  await ev(`FOOT.on = false; true`);
});
await sec("E hours jump", async () => {
  const run = async h => { await ev(`GS.hour = ${h}; true`); await sleep(300); return J(`(() => { const o = []; const g = TLX.state("plow").grit; for (const k in g) for (const h of g[k].h) if (h > 0) { o.push(TLXPL.GRT.hours); break; } return { keys: Object.keys(g).length, hint: TLXPL.hint(), err: window.__err || null }; })()`); };
  let r = await run(5); console.log("  hour back to 5", JSON.stringify(r)); ok(typeof r.hint === "string", "hour set backwards: no throw");
  r = await run(40); console.log("  hour 40", JSON.stringify(r)); ok(typeof r.hint === "string", "hour 40 (next day): no throw");
  const g = await J(`(() => { const x = TLXR.ROADS.routes.find(d => !d.convoy && !d.closed); return Number.isFinite(TLXPL.gritAt(P.x, P.z)); })()`);
  ok(g, "gritAt is finite after the jump");
});
await sec("F corrupt grit entries", async () => {
  await ev(`(() => { const s = TLX.state("plow"); s.grit["bad:1"] = { h: [NaN, "x", null], s0: NaN }; s.grit["bad:2"] = null; s.gritKg = NaN; s.blades[${PT}].hop = -50; return true; })()`);
  await sleep(500);
  const r = await J(`({ hop: TLXPL.hopOf(${PT}), gat: TLXPL.gritAt(P.x, P.z), hint: TLXPL.hint() })`);
  console.log("  ", JSON.stringify(r));
  ok(Number.isFinite(r.hop) && r.hop >= 0, "negative hopper reads as >= 0: " + r.hop);
  ok(Number.isFinite(r.gat), "gritAt finite with junk entries");
});
await sec("G garage open while rolling", async () => {
  await ev(`TLXPL.rt(${PT}).hop; TLXPL.fill(${PT}); true`);
  await ev(`if (!TLXPL.rt(${PT}).grit) TLXPL.gritToggle(${PT}); true`);
  const a = await st(); await ev(`GS.garageOpen = true; P.vz = 10; true`); await waitGame(2); const b = await st();
  await ev(`GS.garageOpen = false; true`);
  console.log("  garage", JSON.stringify([a, b]));
  ok(b.hop >= a.hop - 5, "no grit sprayed while the garage menu is open: " + a.hop + " -> " + b.hop);
});
const errs = await ev(`window.__pageErrs ? window.__pageErrs.length : 0`);
console.log(fails ? "FAILS " + fails : "ALL PASSED");
await done(fails ? 1 : 0);
