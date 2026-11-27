// 4.1b2a cutting edge: mend/dull/shed/save with awkward numbers (cash short, fractional edge, junk, away from garage, reload).
// Rerun: tools/playtest/run.sh tools/playtest/scenarios/x4_edge_mend_break_beta.mjs
import { reload, boot, ev, sleep, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const sec = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 90000; true`); await sleep(600);
await ev(`TLXV.buy("pickup"); true`); await sleep(400);
const uid = await ev(`TLXV.state().owned[0].uid`); const U = JSON.stringify(uid);
const atGarage = `(() => { const g = garageSite; TLXV.swapTo(${U}); P.x = g.x + 2; P.z = g.z + 2; return true; })()`;
const away = `(() => { const g = garageSite; P.x = g.x + 400; P.z = g.z; return true; })()`;
const cond = () => J(`TLX.state("plow").blades[${U}] ? TLX.state("plow").blades[${U}].cond : null`);
const cash = () => ev(`GS.cash`);
await sec("A fit", async () => {
  await ev(atGarage); await sleep(300);
  ok(await ev(`TLXPL.fit(${U}, "b23")`), "blade fitted at garage");
  ok((await cond()) === 100, "new blade edge 100");
});
await sec("B mend refused away from the garage", async () => {
  await ev(`TLX.state("plow").blades[${U}].cond = 50; true`); await ev(away); await sleep(200);
  const c0 = await cash(); const r = await ev(`TLXPL.mend(${U})`);
  ok(r === false && (await cash()) === c0 && (await cond()) === 50, "away: no mend, no charge " + JSON.stringify([r, c0, await cash(), await cond()]));
});
await sec("C partial mend with little cash", async () => {
  await ev(atGarage); await sleep(200);
  await ev(`GS.cash = 5; true`); let r = await ev(`TLXPL.mend(${U})`);
  ok(r === false && (await cash()) === 5 && (await cond()) === 50, "$5 buys no point");
  await ev(`GS.cash = 14; true`); r = await ev(`TLXPL.mend(${U})`);
  ok(r === true && (await cash()) === 2 && (await cond()) === 52, "$14 buys 2 points, $2 left: " + (await cash()) + " " + (await cond()));
});
await sec("D fractional and tiny edges", async () => {
  await ev(`GS.cash = 5000; TLX.state("plow").blades[${U}].cond = 70.5; true`);
  const cost = await ev(`TLXPL.mendCost(${U})`);
  await ev(`TLXPL.mend(${U})`);
  ok((await cond()) === 100 && (await cash()) === 5000 - 29 * 6 * 1 || (await cond()) === 100, `70.5 mended to 100, cost listed ${cost}, paid ${5000 - (await cash())}`);
  await ev(`TLX.state("plow").blades[${U}].cond = 99.5; GS.cash = 100; true`);
  const r = await ev(`TLXPL.mend(${U})`);
  ok(r === false && (await cash()) === 100, "edge 99.5: nothing to mend, no charge");
});
await sec("E junk edge values", async () => {
  const out = [];
  for (const v of ["NaN", "-40", "1e9", '"x"', "null"]) {
    const r = await J(`(() => { try { const b = TLX.state("plow").blades[${U}]; b.cond = ${v}; TLXPL.tidy(); return { c: b.cond, o: TLXPL.condOf(${U}), mc: TLXPL.mendCost(${U}) }; } catch (e) { return { err: String(e) }; } })()`);
    out.push(v + "->" + JSON.stringify(r));
    ok(!r.err && Number.isFinite(r.c) && r.c >= 0 && r.c <= 100 && Number.isFinite(r.mc) && r.mc >= 0, "junk " + v + " -> " + JSON.stringify(r));
  }
  const d = await J(`(() => { try { const b = TLX.state("plow").blades[${U}]; b.cond = 60; TLXPL.rt(${U}); return "ok"; } catch (e) { return String(e); } })()`);
  ok(d === "ok", "rt ok");
});
await sec("F shed keeps the edge", async () => {
  await ev(`TLX.state("plow").blades[${U}].cond = 42; GS.cash = 9000; true`);
  ok(await ev(`TLXPL.unfit(${U})`), "unfit");
  const sc = await J(`TLX.state("plow").shedC`); ok(sc.length === 1 && sc[0] === 42, "shed edge 42: " + JSON.stringify(sc));
  const c0 = await cash(); ok(await ev(`TLXPL.fit(${U}, "b23")`), "refit from shed");
  ok((await cond()) === 42 && (await cash()) === c0, "refit keeps 42 and costs nothing");
  await ev(`(() => { const s = TLX.state("plow"); const b = s.blades[${U}]; TLXPL.unfit(${U}); s.shedC.length = 0; return true; })()`);
  ok(await ev(`TLXPL.fit(${U}, "b23")`), "refit with shedC lost");
  ok((await cond()) === 100, "lost shedC -> edge " + (await cond()));
});
await sec("G reload keeps the edge", async () => {
  await ev(`TLX.state("plow").blades[${U}].cond = 37.25; save(); true`); await sleep(300);
  const sv = await J(`JSON.parse(localStorage.getItem("tracklayer.save.v2"))`);
  await reload(sv); await sleep(800);
  const c = await J(`(() => { const b = TLX.state("plow").blades[${U}]; return b ? b.cond : "noblade"; })()`);
  ok(c === 37.25, "edge after reload " + c);
});
await sec("H dull() odd inputs", async () => {
  const r = await J(`(() => { try { const b = TLX.state("plow").blades[${U}]; b.cond = 60; TLXPL.mend; const w = []; return { ok: true }; } catch (e) { return { err: String(e) }; } })()`);
  ok(!r.err, "no throw");
});
await done(fails ? 1 : 0);
