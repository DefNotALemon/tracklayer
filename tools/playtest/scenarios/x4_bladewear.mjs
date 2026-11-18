// Expansion slice 4.1b2a: the blade's cutting edge wears and is mended (tlx-plow.js). Asserts, exit 1 on a failure.
//   A a new blade's edge is 100, the Plow tab says so and offers no mending; B cutting wears it by the metres cut
//   (a point every BL.wearM m), the blade up or parked wears nothing; C under 30 the cut is ragged: twice the snow
//   left in the lane, one line when it gets there, the hint says so from then on, a good edge beside it cuts clean;
//   D mending at the garage: the row and its price, refused away from the garage, as many points as the cash covers,
//   a full mend; E a blade in the shed keeps its edge (off and on again, a truck that is gone); F the edge is saved,
//   and a save from before it (no cond, no shedC) loads as a new edge.
// The fields are built by the test as in x4_blade.mjs. Headless runs ~0.6x: all by gameClock. ONLY=ABC... (A always).
import { boot, ev, raw, sleep, done, down, up, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(120); }
const ONLY = process.env.ONLY;
const section = async (n, f) => { if (ONLY && n[0] !== "A" && !ONLY.includes(n[0])) return; console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80); return true; })()`);
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 9000; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`;
const kit = () => ev(`(() => {
  if (!window.__F) { const fb0 = freshBase; window.__F = []; freshBase = (ix, iz) => { const F = window.__F, x = ix * CELL - HALF, z = iz * CELL - HALF; for (let i = F.length - 1; i >= 0; i--) { const q = F[i]; if (x >= q[0] && x <= q[1] && z >= q[2] && z <= q[3]) return q[4]; } return fb0(ix, iz); }; }
  window.__field = (x0, x1, z0, z1, dep) => { window.__F.push([x0 - 0.01, x1 + 0.01, z0 - 0.01, z1 + 0.01, dep]); for (let iz = Math.ceil((z0 + HALF) / CELL); iz <= Math.floor((z1 + HALF) / CELL); iz++) for (let ix = Math.ceil((x0 + HALF) / CELL); ix <= Math.floor((x1 + HALF) / CELL); ix++) {
    const c = getChunk(ix >> 5, iz >> 5), k = (iz & 31) * CH + (ix & 31), d0 = c.d[k]; c.f[k] = dep; c.d[k] = dep; if (c.g) c.g[k] = 0; writeCell(ix, iz, d0, dep, dep); } return true; };
  window.__put = (x, z) => { BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; crashCancel(); FOOT.on = false; P.x = x; P.z = z; P.yaw = 0; P.vx = P.vy = P.vz = 0; P.y = surf(x, z); recenter(x, z, true); camState.init = false; const B = TLXPL.rt(TLXV.state().cur); B.last = null; B.carry = 0; B.full = false; return true; };
  window.__cell = (x, z) => { const ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL), d = depthAt(ix, iz), f = freshAt(ix, iz); return { d, f }; };
  window.__pl = () => { const p = TLX.state("plow"), u = TLXV.state().cur, b = p.blades[u]; return { cond: b ? b.cond : null, m: p.m, shed: p.shed, shedC: p.shedC, cash: GS.cash, z: P.z, hint: TLXPL.hint() }; };
  window.__rows = () => { const out = []; VEH.tabs.find(t => t.id === "plow").render(document.createElement("div"), (n, d, p, c) => out.push({ n, d, p, c })); return out; };
  return true; })()`);

await boot();
await ev(SETUP); await sleep(600); await kit();

let uid = null, spot = null, U = null;
await section("A a new blade", async () => {
  const st = await J(`TLX.state("plow")`);
  ok(st && Array.isArray(st.shedC) && st.shedC.length === 0, "fresh game: the plow state has an empty shed and no edges kept (" + JSON.stringify(st) + ")");
  await ev(`TLXV.buy("pickup"); true`); await sleep(300);
  uid = await ev(`TLXV.state().owned[0].uid`); U = JSON.stringify(uid);
  await ev(`TLXPL.fit(${U}, "b23"); true`); await sleep(200);
  await ev(`(() => { TLXV.swapTo(${U}); FOOT.on = false; return true; })()`); await sleep(600);
  ok(await ev(`!!VEH.cur && !FOOT.on && TLXV.state().cur === ${U}`), "seated in the pickup, the blade fitted");
  const a = await J(`({ pl: __pl(), rows: __rows(), cost: TLXPL.mendCost(${U}), leave: TLXPL.leaveOf(${U}, TLXPL.BLADES[0]), BL: { wearM: TLXPL.BL.wearM, ragged: TLXPL.BL.ragged, mend: TLXPL.BL.mend, rl: TLXPL.BL.raggedLeave } })`);
  console.log("  tunables", JSON.stringify(a.BL));
  ok(a.pl.cond === 100 && a.cost === 0 && a.leave === 0.15, "a new blade: cutting edge 100, nothing to mend, it leaves 0.15 of the pack");
  ok(a.rows.length === 1 && /^Take the/.test(a.rows[0].n) && /Cutting edge 100%\./.test(a.rows[0].d), "the Plow tab: one row, and it gives the edge: " + (a.rows[0] && a.rows[0].d.replace(/<[^>]+>/g, "").slice(-60)));
  ok(a.rows.every(r => !/^Mend/.test(r.n)), "no mending offered for a whole edge");
  spot = await J(`(() => { for (let r = 150; r < 3600; r += 41) for (let a = 0; a < 6.28; a += 0.19) { const x = depot.x + Math.cos(a) * r, z = depot.z + Math.sin(a) * r; let bad = false;
    for (let k = -10; k <= 100 && !bad; k += 10) for (const sx of [-12, -6, 0, 6, 12]) if (isSea(x + sx, z + k) || isWater(x + sx, z + k) || obNear(x + sx, z + k, 7) || slopeAt(x + sx, z + k, 8) > 0.03 || yardAt(x + sx, z + k) > 0.02 || bioAt(x + sx, z + k) === 1) { bad = true; break; }
    if (!bad && Math.abs(groundAt(x, z) - groundAt(x, z + 80)) < 1.2 && (!window.TLXR || TLXR.near(x, z + 40).d > 70)) return { x, z }; } return null; })()`);
  ok(!!spot, "a flat open strip for the fields: " + JSON.stringify(spot));
});
if (!spot || !uid) await done(1);
const X = spot.x, Z = spot.z;
const setCond = c => ev(`TLX.state("plow").blades[${U}].cond = ${c}; true`);
// a 30 cm strip with a cleared pad to start from; W for secs of game time; -> the plow's numbers before and after
const run = async (lane, secs, bladeDown) => {
  await ev(`__F.length = 0; __field(${X + lane - 5}, ${X + lane + 5}, ${Z - 8}, ${Z + 98}, 0.3); __field(${X + lane - 5}, ${X + lane + 5}, ${Z - 8}, ${Z + 5}, 0.06); __put(${X + lane}, ${Z}); TLXPL.rt(${U}).down = ${bladeDown}; true`);
  await waitGame(0.9); const a = await J(`__pl()`);
  await down("KeyW"); await waitGame(secs); await up("KeyW"); const b = await J(`__pl()`);
  await waitGame(0.3); return { a, b, mv: +(b.z - a.z).toFixed(1), dm: b.m - a.m, dc: a.cond - b.cond };
};
const laneDF = (lane, z) => J(`(() => { const o = []; for (let x = -0.75; x <= 0.751; x += 0.25) { const c = __cell(${X + lane} + x, ${z}); o.push(+(c.d / c.f).toFixed(3)); } return o; })()`);

await section("B cutting wears it", async () => {
  const r = await run(0, 9, true);
  console.log(`  blade down 9 s: moved ${r.mv} m, cut ${r.dm.toFixed(1)} m, edge ${r.a.cond} -> ${r.b.cond.toFixed(4)}`);
  const wearM = await ev("TLXPL.BL.wearM");
  ok(r.dm > 25, "it cut a lane (" + r.dm.toFixed(1) + " m counted)");
  ok(r.dc > 0 && Math.abs(r.dc - r.dm / wearM) < 0.004, `the edge wore by the metres cut: ${r.dc.toFixed(4)} points for ${r.dm.toFixed(1)} m (a point every ${wearM} m: ${(r.dm / wearM).toFixed(4)})`);
  await ev(`__put(${X}, ${Z}); TLXPL.rt(${U}).down = false; true`); await waitGame(0.5);
  const c1 = (await J(`__pl()`)).cond;                                          // (it coasted on, cutting, after the key came up)
  const z0 = await ev("P.z"); await down("KeyW"); await waitGame(4); await up("KeyW"); await waitGame(0.3);
  const u = await J(`__pl()`);
  ok(u.z - z0 > 8 && u.cond === c1, `blade UP along the lane (${(u.z - z0).toFixed(1)} m): the edge is as it was (${u.cond.toFixed(4)})`);
  const cs = await laneDF(0, Z + 20); console.log("  a good edge's lane, d/f:", cs.join(" "));
  ok(cs.every(v => v <= 0.2), "and a good edge cuts to the yard level (d/f " + Math.max(...cs) + " at most)");
});

await section("C a ragged edge", async () => {
  await setCond(30.06); await clearToasts();
  const h0 = (await J(`__pl()`)).hint;
  const r = await run(12, 9, true); await sleep(200);
  const t = await toasts(), said = t.filter(m => /worn ragged/.test(m));
  console.log(`  from 30.06: cut ${r.dm.toFixed(1)} m, edge ${r.b.cond.toFixed(3)}; toasts ${JSON.stringify(t)}`);
  ok(r.b.cond < 30 && r.b.cond > 29.5, "the edge crossed 30 while cutting (" + r.b.cond.toFixed(3) + ")");
  ok(said.length === 1 && /Plow tab mends it/.test(said[0]), "one line says it is worn ragged and where it is mended: " + JSON.stringify(said));
  ok(!/worn edge/.test(h0), "the hint said nothing of the edge at 30 or over");
  // a whole lane on the ragged edge, and the hint while it cuts
  await setCond(22); await clearToasts();
  await ev(`__F.length = 0; __field(${X + 24 - 5}, ${X + 24 + 5}, ${Z - 8}, ${Z + 98}, 0.3); __field(${X + 24 - 5}, ${X + 24 + 5}, ${Z - 8}, ${Z + 5}, 0.06); __put(${X + 24}, ${Z}); TLXPL.rt(${U}).down = true; true`); await waitGame(0.9);
  await down("KeyW"); await waitGame(5); const hint = await ev("TLXPL.hint()"); await waitGame(4); await up("KeyW"); await waitGame(0.3);
  const cs = await laneDF(24, Z + 20), a = await J(`({ leave: TLXPL.leaveOf(${U}, TLXPL.BLADES[0]), rows: __rows(), t: 0 })`), t2 = await toasts();
  console.log("  a ragged edge's lane, d/f:", cs.join(" ")); console.log("  hint:", hint);
  ok(a.leave === 0.3, "under 30 the blade leaves 0.3 of the pack");
  ok(cs.every(v => v >= 0.27 && v <= 0.36), "the lane it cut stands at twice a good edge's (d/f " + Math.min(...cs) + " to " + Math.max(...cs) + ")");
  ok(/BLADE DOWN/.test(hint) && /worn edge, a ragged cut: mend it at the garage/.test(hint), "the hint says so while it cuts");
  ok(!t2.some(m => /worn ragged/.test(m)), "and the line is not said again below 30");
  ok(/worn ragged, it leaves twice the snow/.test(a.rows[0].d), "the Plow tab's row says worn ragged");
});

await section("D mending", async () => {
  const g = await J(`TLX.api.world.garage()`);
  await ev(`__put(${g.x + 10}, ${g.z + 4}); TLXPL.rt(${U}).down = false; true`); await waitGame(0.4);
  await setCond(29.4); await ev(`GS.cash = 9000; true`);
  let a = await J(`({ rows: __rows(), cost: TLXPL.mendCost(${U}) })`), m = a.rows.find(r => /^Mend the cutting edge/.test(r.n));
  ok(a.cost === 420 && m && m.p === "$420" && m.c === "" && a.rows.length === 2, "at the garage with the edge at 29.4: a Mend row, 70 points at $6 = $420, not locked (" + JSON.stringify(m && { n: m.n, p: m.p, c: m.c }) + ")");
  // away from the garage: locked, refused, told why
  await ev(`P.x += 300; true`); await clearToasts();
  a = await J(`({ rows: __rows(), did: TLXPL.mend(${U}), pl: __pl() })`); m = a.rows.find(r => /^Mend/.test(r.n)); await sleep(250); let t = await toasts();
  ok(m && m.c === "locked" && /Bring it within 60 m/.test(m.d) && a.did === false && a.pl.cond === 29.4 && a.pl.cash === 9000 && t.some(x => /within 60 m of the garage to have the cutting edge mended/.test(x)), "300 m away: the row is locked, nothing is mended or charged, a line says to bring it in");
  await ev(`P.x -= 300; true`);
  // not enough for all of it: as many points as the cash covers
  await ev(`GS.cash = 100; true`); await clearToasts();
  a = await J(`({ rows: __rows(), did: TLXPL.mend(${U}), pl: __pl() })`); m = a.rows.find(r => /^Mend/.test(r.n)); await sleep(250); t = await toasts();
  console.log("  $100:", JSON.stringify({ cond: a.pl.cond, cash: a.pl.cash }), JSON.stringify(t));
  ok(m && m.c === "" && /your \$100 buys 16 of the 70 points/.test(m.d), "with $100 the row says what it buys: " + (m && m.d.replace(/<[^>]+>/g, "").slice(-70)));
  ok(a.did === true && Math.abs(a.pl.cond - 45.4) < 1e-9 && a.pl.cash === 4, "16 points for $96: the edge at 45.4, $4 left");
  ok(t.some(x => /\$96 of work on the cutting edge: it is at 45%\. The rest is \$324\./.test(x)), "and the line gives what was done and what is left");
  await clearToasts();
  a = await J(`({ did: TLXPL.mend(${U}), pl: __pl(), rows: __rows() })`); m = a.rows.find(r => /^Mend/.test(r.n)); await sleep(250); t = await toasts();
  ok(a.did === false && a.pl.cash === 4 && m && m.c === "locked" && t.some(x => /\$6 a point\. You have \$4/.test(x)), "$4 buys no point: refused with the price, the row locked");
  // the rest
  await ev(`GS.cash = 9000; true`); await clearToasts();
  a = await J(`({ did: TLXPL.mend(${U}), pl: __pl(), rows: __rows(), leave: TLXPL.leaveOf(${U}, TLXPL.BLADES[0]) })`); await sleep(250); t = await toasts();
  ok(a.did === true && a.pl.cond === 100 && a.pl.cash === 9000 - 324 && a.leave === 0.15, "with the cash: a new edge for the 54 points left ($324), cutting clean again");
  ok(a.rows.length === 1 && t.some(x => /has a new cutting edge \(\$324\)/.test(x)), "the Mend row is gone and a line says so");
  ok((await ev(`TLXPL.mend(${U})`)) === false && (await ev("GS.cash")) === 9000 - 324, "mending a whole edge does nothing");
});

await section("E the shed keeps the edge", async () => {
  const g = await J(`TLX.api.world.garage()`);
  await ev(`__put(${g.x + 10}, ${g.z + 4}); TLXPL.rt(${U}).down = false; GS.cash = 5000; true`); await waitGame(0.3);
  await setCond(64.5);
  await ev(`TLXPL.unfit(${U}); true`);
  let a = await J(`({ st: TLX.state("plow"), rows: __rows() })`);
  ok(!a.st.blades[uid] && a.st.shed.length === 1 && a.st.shedC.length === 1 && a.st.shedC[0] === 64.5, "taken off at 64.5: the shed holds it with its edge (" + JSON.stringify(a.st.shedC) + ")");
  ok(/in the shed, its cutting edge at 65%/.test(a.rows[0].d) && a.rows[0].p === "Yours · free", "the Fit row says what edge it has");
  await ev(`TLXPL.fit(${U}, "b23"); true`);
  a = await J(`({ st: TLX.state("plow"), cash: GS.cash })`);
  ok(a.st.blades[uid] && a.st.blades[uid].cond === 64.5 && a.st.shed.length === 0 && a.st.shedC.length === 0 && a.cash === 5000, "refitted for nothing with the same edge");
  // a truck that is gone, a shed someone emptied, an edge out of range
  a = await J(`(() => { const p = TLX.state("plow"); p.blades["v99"] = { id: "b23", cond: 41 }; p.blades[${U}].cond = 140; TLXPL.tidy(); const o = { shed: p.shed.slice(), shedC: p.shedC.slice(), cond: p.blades[${U}].cond }; p.shed.length = 0; TLXPL.tidy(); o.after = p.shedC.length; p.shed.push("b23"); p.shedC.length = 0; TLXPL.tidy(); o.pad = p.shedC.slice(); p.shed.length = 0; TLXPL.tidy(); p.blades[${U}].cond = 64.5; return o; })()`);
  ok(a.shed.length === 1 && a.shedC[0] === 41, "a blade whose truck is gone goes to the shed with its edge (41)");
  ok(a.cond === 100 && a.after === 0 && a.pad.length === 1 && a.pad[0] === 100, "an edge over 100 is clamped, the edges kept follow the shed, a shed blade with no edge on record is whole");
});

await section("F the save", async () => {
  await setCond(64.5); await ev(`save(); true`); await sleep(200);
  await reload(); await ev(SETUP); await sleep(500); await kit();
  let a = await J(`TLX.state("plow")`);
  ok(a.blades[uid] && a.blades[uid].cond === 64.5, "reload: the edge is as it was saved (" + (a.blades[uid] && a.blades[uid].cond) + ")");
  // a save from before the edge wore: no cond on the blade, no shedC, one blade in the shed
  const sv = JSON.parse(await raw(`localStorage.getItem("tracklayer.save.v2")`));
  const ps = sv.x.sys.plow.s; delete ps.blades[uid].cond; delete ps.shedC; ps.shed = ["b23"];   // saved as { v, s: state }
  await reload(sv); await ev(SETUP); await sleep(500); await kit();
  a = await J(`({ st: TLX.state("plow"), leave: TLXPL.leaveOf(${U}, TLXPL.BLADES[0]), cost: TLXPL.mendCost(${U}) })`);
  console.log("  old save", JSON.stringify(a.st));
  ok(a.st.blades[uid] && a.st.blades[uid].cond === 100 && a.leave === 0.15 && a.cost === 0, "a save with no edge on the blade loads as a new edge");
  ok(a.st.shed.length === 1 && Array.isArray(a.st.shedC) && a.st.shedC.length === 1 && a.st.shedC[0] === 100, "and its shed blade as whole");
});
await done(fails ? 1 : 0);
