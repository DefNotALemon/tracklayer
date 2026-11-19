// Beta (0298): 4.1b1 slew through reload on pickup AND plow truck: blade angle visual, down state, no swing on load. Exit 1 on FAIL.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 60000; GS.lic = GS.lic || {}; GS.lic.freight = true; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`); await sleep(600);
await ev(`TLXV.buy("pickup"); true`); await sleep(300);
await ev(`TLXV.buy("plowtruck"); true`); await sleep(300);
const own = await J(`TLXV.state().owned.map(o => ({ uid: o.uid, id: o.id || o.kind }))`);
console.log("  owned", JSON.stringify(own));
const pk = own.find(o => o.id === "pickup"), pt = own.find(o => o.id === "plowtruck");
ok(!!pk && !!pt, "A bought pickup and plow truck");
await ev(`TLXPL.fit(${JSON.stringify(pk.uid)}, "b23"); true`);
// pickup: down + throw left
await ev(`TLXV.swapTo(${JSON.stringify(pk.uid)}); FOOT.on = false; true`); await sleep(800);
await ev(`TLXPL.rt(${JSON.stringify(pk.uid)}).down = true; TLXPL.slew(${JSON.stringify(pk.uid)}, "l"); true`); await sleep(1500);
// plow truck: throw square (two slews from r -> l -> s)
await ev(`TLXV.swapTo(${JSON.stringify(pt.uid)}); FOOT.on = false; true`); await sleep(800);
await ev(`TLXPL.rt(${JSON.stringify(pt.uid)}).down = true; TLXPL.slew(${JSON.stringify(pt.uid)}, "s"); true`); await sleep(1500);
const pre = await J(`(() => { const o = {}; for (const u of [${JSON.stringify(pk.uid)}, ${JSON.stringify(pt.uid)}]) { const b = TLXPL.rt(u); o[u] = { th: TLXPL.throwOf(u), a: b.a, down: b.down, st: TLXPL.state().blades[u] }; } return o; })()`);
console.log("  before", JSON.stringify(pre));
await ev(`save(); true`);
const saved = JSON.parse(await ev(`localStorage.getItem("tracklayer.save.v2")`));
await reload(saved); await sleep(1500); await ev(`tutSkip(); FOOT.on = false; true`); await sleep(600);
const own2 = await J(`TLXV.state().owned.map(o => o.uid)`);
console.log("  uids after", JSON.stringify(own2), "cur", JSON.stringify(await J(`TLXV.state().cur || null`)));
for (const [name, v] of [["pickup", pk], ["plowtruck", pt]]) {
  const p = pre[v.uid];
  const q = await J(`(() => { const u = ${JSON.stringify(v.uid)}; const b = TLXPL.rt(u); return { th: TLXPL.throwOf(u), a: b && b.a, down: b && b.down }; })()`);
  console.log("  after", name, JSON.stringify(q));
  ok(q.th === p.th, `${name} throw survives (${p.th} -> ${q.th})`);
  ok(q.down === p.down, `${name} blade down state (${p.down} -> ${q.down})`);
}
// swap to each after reload, sample angle over 1 s: must not swing from wrong angle
for (const [name, v] of [["pickup", pk], ["plowtruck", pt]]) {
  await ev(`TLXV.swapTo(${JSON.stringify(v.uid)}); FOOT.on = false; true`);
  const s = [];
  for (let i = 0; i < 6; i++) { s.push(await J(`TLXPL.rt(${JSON.stringify(v.uid)}).a`)); await sleep(180); }
  const tgt = await J(`TLXPL.THROWS[TLXPL.throwOf(${JSON.stringify(v.uid)})].sign * TLXPL.bladeOf(${JSON.stringify(v.uid)}).ang`);
  console.log("  angle series", name, JSON.stringify(s.map(x => +(+x).toFixed(3))), "target", tgt.toFixed(3));
  ok(s.every(x => Number.isFinite(x)), `${name} angle finite`);
  ok(Math.abs(s[s.length - 1] - tgt) < 0.02, `${name} settles at target`);
  ok(Math.abs(s[0] - tgt) < 0.1, `${name} no visible swing on load (first sample ${(+s[0]).toFixed(2)})`);
}
await done(fails ? 1 : 0);
