// Beta 4.1b2a: try to break the cutting edge: odd saved values, display rounding at the ragged line, wear when idle, reload.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 9000; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`); await sleep(500);
await ev(`TLXV.buy("pickup"); true`); await sleep(300);
const U = JSON.stringify(await ev(`TLXV.state().owned[0].uid`));
await ev(`TLXPL.fit(${U}, "b23"); TLXV.swapTo(${U}); FOOT.on = false; true`); await sleep(600);
const rows = () => J(`(() => { const out = []; VEH.tabs.find(t => t.id === "plow").render(document.createElement("div"), (n, d, p, c) => out.push({ n, d: d.replace(/<[^>]+>/g, ""), p, c })); return out; })()`);
const setC = c => ev(`TLX.state("plow").blades[${U}].cond = ${c}; true`);
// 1 display rounding around the ragged line
for (const c of [29.6, 30, 30.4]) { await setC(c); const r = await rows(); const t = r.map(x => x.d).join(" | ");
  console.log("  cond", c, "shows:", (t.match(/Cutting edge [^.]*\./) || [""])[0], "| leave", await ev(`TLXPL.leaveOf(${U}, TLXPL.BLADES[0])`), "| mend rows", r.filter(x => /^Mend/.test(x.n)).length);
  const shown = (t.match(/Cutting edge (\d+)%(: worn ragged)?/) || []); const rag = !!shown[2];
  ok(c >= 30 ? !rag : rag, `cond ${c}: ragged flag ${rag} matches the 30 line`);
  if (+shown[1] === 30 && rag) ok(false, `POLISH: row reads "30%" and "worn ragged" at ${c} (30 is the line)`); }
// 2 odd saved values
for (const bad of ["null", "NaN", "-5", "250", '"abc"', "undefined"]) {
  await ev(`TLX.state("plow").blades[${U}].cond = ${bad}; true`);
  const r = await J(`({ leave: TLXPL.leaveOf(${U}, TLXPL.BLADES[0]), cost: TLXPL.mendCost(${U}), hint: TLXPL.hint() })`).catch(e => ({ err: String(e).slice(0, 80) }));
  console.log("  cond", bad, JSON.stringify(r));
  ok(!r.err && Number.isFinite(r.cost) && r.cost >= 0 && r.cost <= 600, `cond ${bad}: cost ${r.cost} sane`);
}
// 3 idle: blade down on a cleared road/standing, no wear
await setC(80); await ev(`TLXPL.rt(${U}).down = true; true`); await sleep(2500);
ok((await J(`TLX.state("plow").blades[${U}].cond`)) === 80, "blade down, standing still: no wear");
// 4 mid-action reload keeps edge
await setC(41.5); await ev(`TLX.state("plow").m = 12; true`);
const s = await J(`JSON.parse(JSON.stringify(SAVEOBJ_FALLBACK))`).catch(() => null);
await reload(); await sleep(800);
const after = await J(`TLX.state("plow").blades`).catch(() => null);
console.log("  after reload", JSON.stringify(after));
ok(after && Object.values(after).some(b => Math.abs(b.cond - 41.5) < 0.01), "reload keeps the edge at 41.5 (unplanted reload)");
console.log("page errors check by harness"); await done(fails ? 1 : 0);
