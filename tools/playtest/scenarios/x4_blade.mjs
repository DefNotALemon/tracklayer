// Expansion slice 4.1a1: the blade on the Fjellvogn (tlx-plow.js). The mechanics. Asserts, exit 1 on a failure.
//   A fresh game has the plow state, no blade, and a Plow tab; B fitting takes $1,450 once, taking it off and
//   refitting is free, a truck far from the garage is refused, the model is on the truck, a sold truck's blade goes
//   to the shed; C blade UP (and no blade at all) into a 40 cm field the pickup creeps and stops as it does today;
//   D blade DOWN beside it: 40 m or more in the same game time at a working pace, the lane behind cut to the yard
//   level across the wheel tracks, a windrow on the right, the left untouched, the volume laid = the volume cut;
//   E steady speed falls from a cut lane to 30 cm to 60 cm; F a 1.0 m drift from a standstill stops it inside 3 m and
//   the only "stuck" line is the blade's.
// The fields are built by the test: every cell in a strip is set to one depth of unpacked snow (f = d), on flat open
// ground, so the numbers don't depend on where the weather left the snow. Headless runs ~0.6x: all by gameClock.
// ONLY=ABC... runs some sections (A always).  x4_bladectl.mjs has the controls, the save, frame time and the stills.
import { boot, ev, sleep, done, down, up } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(120); }
const ONLY = process.env.ONLY;
const section = async (n, f) => { if (ONLY && n[0] !== "A" && !ONLY.includes(n[0])) return; console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80); return true; })()`);

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 9000; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`); await sleep(600);
// test kit in the page: a strip of snow of one depth, the truck put at a spot, a cross-section of the snow
await ev(`(() => {
  // the snowpack itself reads the strips (a chunk far from the truck is dropped and rebuilt from freshBase, so cells alone would not stay)
  const fb0 = freshBase; window.__F = []; freshBase = (ix, iz) => { const F = window.__F, x = ix * CELL - HALF, z = iz * CELL - HALF; for (let i = F.length - 1; i >= 0; i--) { const q = F[i]; if (x >= q[0] && x <= q[1] && z >= q[2] && z <= q[3]) return q[4]; } return fb0(ix, iz); };
  window.__field = (x0, x1, z0, z1, dep) => { window.__F.push([x0 - 0.01, x1 + 0.01, z0 - 0.01, z1 + 0.01, dep]); for (let iz = Math.ceil((z0 + HALF) / CELL); iz <= Math.floor((z1 + HALF) / CELL); iz++) for (let ix = Math.ceil((x0 + HALF) / CELL); ix <= Math.floor((x1 + HALF) / CELL); ix++) {
    const c = getChunk(ix >> 5, iz >> 5), k = (iz & 31) * CH + (ix & 31), d0 = c.d[k]; c.f[k] = dep; c.d[k] = dep; if (c.g) c.g[k] = 0; writeCell(ix, iz, d0, dep, dep); } return true; };
  window.__put = (x, z) => { BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; P.x = x; P.z = z; P.yaw = 0; P.vx = P.vy = P.vz = 0; P.y = surf(x, z); recenter(x, z, true); camState.init = false; window.__t0 = [x, z, gameClock]; const B = TLXPL.rt(TLXV.state().cur); B.last = null; B.carry = 0; B.volCut = 0; B.volLaid = 0; B.full = false; return true; };
  window.__cell = (x, z) => { const ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL), d = depthAt(ix, iz), f = freshAt(ix, iz); return { d, f, p: packOf(d, f) }; };
  return true; })()`);
const moved = () => J(`({ mv: +(P.z - __t0[1]).toFixed(1), dx: +(P.x - __t0[0]).toFixed(2), v: +Math.hypot(P.vx, P.vz).toFixed(2), t: +(gameClock - __t0[2]).toFixed(1), bog: BOG.on, why: TLXV.rt().why, drag: Math.round(TLXPL.rt(TLXV.state().cur).drag), depth: +TLXPL.rt(TLXV.state().cur).depth.toFixed(2), carry: +TLXPL.rt(TLXV.state().cur).carry.toFixed(2) })`);

let uid = null, spot = null;
await section("A fresh game", async () => {
  const a = await J(`({ st: TLX.state("plow"), tab: VEH.tabs.map(t => t.id), api: typeof TLXPL, bs: typeof bladeSnow, hs: typeof heapSnow })`);
  ok(a.st && Object.keys(a.st.blades).length === 0 && a.st.shed.length === 0 && a.st.m === 0, "fresh game: the plow state is there with no blade (" + JSON.stringify(a.st) + ")");
  ok(a.tab.includes("plow") && a.tab.includes("trucks"), "the garage has a Plow tab beside Trucks");
  // no pickup: the tab's one row points at the Trucks tab
  const rows = await J(`(() => { const out = []; VEH.tabs.find(t => t.id === "plow").render(document.createElement("div"), (n, d, p, c) => out.push({ n, d, p, c })); return out; })()`);
  ok(rows.length === 1 && rows[0].c === "locked" && /Trucks tab/.test(rows[0].d) && rows[0].p === "$1450", "no pickup: one locked row at $1450 that points at the Trucks tab");
  // the truck, and a flat open strip 90 m long for the fields
  await ev(`TLXV.buy("pickup"); true`); await sleep(300);
  uid = await ev(`TLXV.state().owned[0].uid`);
  spot = await J(`(() => { for (let r = 150; r < 3600; r += 41) for (let a = 0; a < 6.28; a += 0.19) { const x = depot.x + Math.cos(a) * r, z = depot.z + Math.sin(a) * r; let bad = false;
    for (let k = -10; k <= 90 && !bad; k += 10) for (const sx of [-6, 0, 6]) if (isSea(x + sx, z + k) || isWater(x + sx, z + k) || obNear(x + sx, z + k, 7) || slopeAt(x + sx, z + k, 8) > 0.03 || yardAt(x + sx, z + k) > 0.02 || bioAt(x + sx, z + k) === 1) { bad = true; break; }
    if (!bad && Math.abs(groundAt(x, z) - groundAt(x, z + 80)) < 1.2 && (!window.TLXR || TLXR.near(x, z + 40).d > 70)) return { x, z }; } return null; })()`);
  ok(!!spot, "a flat open strip for the fields: " + JSON.stringify(spot));
});
if (!spot || !uid) await done(1);

await section("B fitting", async () => {
  const c0 = await ev("GS.cash");
  let r = await J(`(() => { const out = []; VEH.tabs.find(t => t.id === "plow").render(document.createElement("div"), (n, d, p, c) => out.push({ n, p, c })); return out; })()`);
  ok(r.length === 1 && /^Fit the Fjellskjær 2.3 to the Fjellvogn$/.test(r[0].n) && r[0].p === "$1450" && r[0].c === "", "with a pickup on the forecourt: Fit the Fjellskjær 2.3, $1450, not locked (" + JSON.stringify(r[0]) + ")");
  await ev(`TLXPL.fit(${JSON.stringify(uid)}, "b23"); true`);
  let s = await J(`({ cash: GS.cash, has: !!TLX.state("plow").blades[${JSON.stringify(uid)}], model: !!TLXPL.rt(${JSON.stringify(uid)}).grp && TLXPL.rt(${JSON.stringify(uid)}).grp.parent === TLXV.runtimeOf(${JSON.stringify(uid)}).grp, kids: TLXPL.rt(${JSON.stringify(uid)}).grp ? TLXPL.rt(${JSON.stringify(uid)}).grp.children.length : 0 })`);
  ok(s.has && c0 - s.cash === 1450, "fitting takes $1,450 (" + (c0 - s.cash) + ")");
  ok(s.model && s.kids === 3, "the blade's model hangs on the truck's own group (frame, lamps, the lifting part)");
  await ev(`TLXPL.fit(${JSON.stringify(uid)}, "b23"); true`);
  ok((await ev("GS.cash")) === s.cash, "fitting a truck that has one does nothing");
  await ev(`TLXPL.unfit(${JSON.stringify(uid)}); true`);
  s = await J(`({ cash: GS.cash, st: TLX.state("plow"), gone: !TLXPL.rt(${JSON.stringify(uid)}).grp })`);
  ok(!s.st.blades[uid] && s.st.shed.length === 1 && s.gone && s.cash === c0 - 1450, "taking it off: into the shed, the model gone, no money back");
  r = await J(`(() => { const out = []; VEH.tabs.find(t => t.id === "plow").render(document.createElement("div"), (n, d, p, c) => out.push({ n, p, c })); return out; })()`);
  ok(r[0].p === "Yours · free", "the tab offers it back for nothing (" + r[0].p + ")");
  // far from the garage: refused, with a line that says why
  await clearToasts();
  await ev(`(() => { const t = TLXV.state().owned[0]; window.__home = [t.x, t.z]; t.x += 300; return true; })()`);
  await ev(`TLXPL.fit(${JSON.stringify(uid)}, "b23"); true`); await sleep(250);
  s = await J(`({ has: !!TLX.state("plow").blades[${JSON.stringify(uid)}], shed: TLX.state("plow").shed.length })`); let t = await toasts();
  ok(!s.has && s.shed === 1 && t.some(m => /within 60 m of the garage/.test(m)), "300 m from the garage: not fitted, told to bring it within 60 m");
  r = await J(`(() => { const out = []; VEH.tabs.find(t => t.id === "plow").render(document.createElement("div"), (n, d, p, c) => out.push({ n, d, p, c })); return out; })()`);
  ok(r[0].c === "locked" && /from the garage/.test(r[0].d), "and the tab's row is locked and gives the distance");
  await ev(`(() => { const t = TLXV.state().owned[0]; t.x = __home[0]; return true; })()`);
  await ev(`TLXPL.fit(${JSON.stringify(uid)}, "b23"); true`);
  s = await J(`({ cash: GS.cash, st: TLX.state("plow") })`);
  ok(!!s.st.blades[uid] && s.st.shed.length === 0 && s.cash === c0 - 1450, "refitting from the shed is free");
  // a blade whose truck is gone goes to the shed (a sold truck, an old save)
  s = await J(`(() => { const p = TLX.state("plow"); p.blades["v99"] = { id: "b23", cond: 100 }; p.blades["v98"] = { id: "nope" }; TLXPL.tidy(); return { keys: Object.keys(p.blades), shed: p.shed.slice() }; })()`);
  ok(s.keys.length === 1 && s.keys[0] === uid && s.shed.length === 1 && s.shed[0] === "b23", "a blade on a truck you no longer own moves to the shed; an unknown blade is dropped");
  await ev(`TLX.state("plow").shed.length = 0; true`);
});

// into the truck for the rest
await ev(`(() => { const p = TLX.state("plow"); if (!p.blades[${JSON.stringify(uid)}]) p.blades[${JSON.stringify(uid)}] = { id: "b23", cond: 100 }; TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; return true; })()`); await sleep(600);
ok(await ev(`!!VEH.cur && !FOOT.on && TLXV.state().cur === ${JSON.stringify(uid)}`), "seated in the pickup");
const X = spot.x, Z = spot.z;
// a fresh strip of one depth, W for secs of game time. pad: the truck starts on a cleared pad with the snow beginning 1.2 m
// ahead of the blade, as you would plow out of a yard (a truck standing IN 40 cm with its blade down is stuck where it sits:
// its wheels are in the snow the blade has not reached, which section G shows)
const run = async (lane, depth, secs, bladeDown, pad = false, z0 = Z) => {
  await ev(`__F.length = 0; __field(${X + lane - 6}, ${X + lane + 6}, ${z0 - 8}, ${z0 + 95}, ${depth}); ${pad ? `__field(${X + lane - 6}, ${X + lane + 6}, ${z0 - 8}, ${z0 + 5}, 0.06);` : ""} __put(${X + lane}, ${z0}); TLXPL.rt(${JSON.stringify(uid)}).down = ${bladeDown}; true`);
  await waitGame(0.9); await ev(`window.__t0 = [P.x, P.z, gameClock]; true`);
  await down("KeyW"); await waitGame(secs); const r = await moved(); await up("KeyW");
  await waitGame(0.3); return r;
};

let upRun = null;
await section("C blade up: the pickup in 40 cm is what it was", async () => {
  await ev(`TLXPL.unfit(${JSON.stringify(uid)}); true`);                        // 4.1a must not change a bladeless pickup
  const bare = await run(0, 0.4, 8, false);
  await ev(`TLX.state("plow").shed.length = 0; TLX.state("plow").blades[${JSON.stringify(uid)}] = { id: "b23", cond: 100 }; true`); await sleep(200);
  upRun = await run(0, 0.4, 8, false);
  console.log("  no blade", JSON.stringify(bare)); console.log("  blade up", JSON.stringify(upRun));
  ok(bare.mv < 14, `no blade, 40 cm of powder, W for 8 s: it creeps ${bare.mv} m and no further (as x2_standstart has it)`);
  ok(upRun.mv < 14 && Math.abs(upRun.mv - bare.mv) < 5, `blade fitted but UP: the same creep (${upRun.mv} m against ${bare.mv} m)`);
  ok(upRun.drag === 0, "an up blade puts no push on the truck (" + upRun.drag + " N)");
});

await section("D blade down: a lane, a windrow", async () => {
  if (!upRun) upRun = { mv: 5 };
  const r = await run(0, 0.4, 12, true, true);
  console.log("  blade down", JSON.stringify(r));
  ok(r.mv >= 40, `blade DOWN in the same 40 cm, W for 12 s: ${r.mv} m (40 m or more)`);
  ok(r.mv > upRun.mv * 3, `against ${upRun.mv} m with it up`);
  ok(r.v >= 3 && r.v <= 7.5, `at a working pace: ${r.v} m/s (3 to 7.5)`);
  ok(!r.bog && Math.abs(r.dx) < 1.5, "not bogged, and it holds its line (" + r.dx + " m aside)");
  // the cross-section 20 m from the start (15 m into the cut)
  const cs = await J(`(() => { const z = ${Z} + 20, o = { lane: [], right: [], left: [] };
    for (let x = -0.95; x <= 0.951; x += 0.25) o.lane.push(__cell(${X} + x, z));
    for (let x = 1.2; x <= 2.21; x += 0.25) { o.right.push(__cell(${X} - x, z)); }
    for (let x = 1.5; x <= 2.51; x += 0.25) { o.left.push(__cell(${X} + x, z)); }
    const B = TLXPL.rt(TLXV.state().cur); o.cut = B.volCut; o.laid = B.volLaid; o.carry = B.carry; o.m = TLX.state("plow").m; return o; })()`);
  const lane = cs.lane.map(c => +(c.d / c.f).toFixed(2)), packs = cs.lane.map(c => +c.p.toFixed(2)), right = cs.right.map(c => +(c.d - c.f).toFixed(2)), left = cs.left.map(c => +(c.d - c.f).toFixed(2));
  console.log("  lane d/f", lane.join(" "), "| pack", packs.join(" ")); console.log("  right d-f", right.join(" "), "| left d-f", left.join(" "));
  ok(lane.every(v => v <= 0.2), "the lane is cut to the yard level across 1.9 m, both wheel tracks and the centre (d/f " + Math.max(...lane) + " at most)");
  ok(packs.every(p => p >= 0.9), "and reads as hard pack there (" + Math.min(...packs) + " at least)");
  ok(Math.max(...right) >= 0.3 && right.reduce((a, b) => a + b, 0) / right.length >= 0.1, "a windrow stands on the right, 1.2 to 2.2 m off the line: " + Math.max(...right) + " m over the pack at its crest");
  ok(left.every(v => Math.abs(v) <= 0.02), "the snow on the left is as it was");
  ok(cs.cut > 5 && Math.abs(cs.laid + cs.carry - cs.cut) / cs.cut < 0.25, `the snow cut is the snow laid: ${cs.cut.toFixed(1)} m3 cut, ${cs.laid.toFixed(1)} laid, ${cs.carry.toFixed(2)} on the blade`);
  ok(cs.m > 30, "metres cut are counted (" + Math.round(cs.m) + ")");
  // back along the lane it just cut, blade down: nothing to cut, nothing pushes
  await ev(`__put(${X}, ${Z}); true`); await waitGame(0.6); await ev(`window.__t0 = [P.x, P.z, gameClock]; true`);
  await down("KeyW"); await waitGame(3.5); const again = await moved(); const hint = await ev(`TLXPL.hint()`); await up("KeyW"); await waitGame(0.3);   // 3.5 s: still inside the 47 m it cut
  console.log("  cut lane again", JSON.stringify(again), "|", hint);
  ok(again.mv < r.mv && again.v > r.v + 1.5 && again.drag < 600, `down the lane it cut, blade still down: ${again.v} m/s, ${again.drag} N on the blade`);
  ok(/BLADE DOWN/.test(hint) && /nothing to cut/.test(hint), "and the hint says there is nothing to cut: " + hint);
  globalThis.__vLane = again.v;
});

await section("E the deeper the slower", async () => {
  const r30 = await run(0, 0.3, 10, true, true), h30 = await ev(`TLXPL.hint()`), r60 = await run(0, 0.6, 10, true, true);
  console.log("  30 cm", JSON.stringify(r30), "|", h30); console.log("  60 cm", JSON.stringify(r60));
  const vL = globalThis.__vLane || 99;
  ok(r30.v >= 3.5 && r30.v <= 8, `30 cm is steady work: ${r30.v} m/s (${Math.round(r30.v * 3.6)} km/h)`);
  ok(r60.v >= 1.2 && r60.v <= 4.5 && !r60.bog, `60 cm is a crawl: ${r60.v} m/s (${Math.round(r60.v * 3.6)} km/h), not bogged`);
  ok(vL > r30.v && r30.v > r60.v + 0.8, `a cut lane ${vL === 99 ? "(not run)" : vL} > 30 cm ${r30.v} > 60 cm ${r60.v} m/s`);
  ok(/BLADE DOWN · \d+ km\/h · cutting \d+ cm/.test(h30), "the hint gives speed and depth while cutting: " + h30);
});

await section("F a drift over the blade", async () => {
  // a cleared pad to stand on, then a metre of snow from 1.5 m ahead of the blade
  await ev(`__F.length = 0; __field(${X - 6}, ${X + 6}, ${Z - 8}, ${Z + 60}, 0.06); __field(${X - 6}, ${X + 6}, ${Z + 5}, ${Z + 60}, 1.0); __put(${X}, ${Z}); TLXPL.rt(${JSON.stringify(uid)}).down = true; true`);
  await waitGame(0.9); await clearToasts(); await ev(`window.__t0 = [P.x, P.z, gameClock]; true`);
  await down("KeyW"); await waitGame(6); const r = await moved(); await waitGame(2.5); const r2 = await moved(); await up("KeyW");
  const t = await toasts();
  console.log("  drift", JSON.stringify(r), JSON.stringify(r2), JSON.stringify(t));
  ok(r.mv - 1.9 < 3, `a 1.0 m drift met 1.9 m out, W for 6 s: ${(r.mv - 1.9).toFixed(1)} m into it (under 3)`);
  ok(r2.mv - r.mv < 0.6 && r2.v < 0.4, "and it stays stopped (" + r2.v + " m/s)");
  ok(t.some(m => /blade is into more snow/.test(m)), "the line that shows says the blade is into more than the truck can push");
  ok(!t.some(m => /wheels|grip|deeper than the|throttle|steep/i.test(m)), "and nothing blames the wheels, the grip or the throttle");
  // lift it, back up: it comes away
  await ev(`TLXPL.rt(${JSON.stringify(uid)}).down = false; true`); await waitGame(0.5); await ev(`window.__t0 = [P.x, P.z, gameClock]; true`);
  await down("KeyS"); await waitGame(4); const b = await moved(); await up("KeyS");
  ok(b.mv < -2, `blade up and reverse: it backs out along its lane (${b.mv} m)`);
});

await section("G dropped where it stands in deep snow", async () => {
  // standing in 40 cm with the blade dropped: the wheels are in snow the blade never reached. Printed, and it must say why.
  await clearToasts();
  const r = await run(0, 0.4, 6, true); const t = await toasts(), h = await ev(`TLXPL.hint()`);
  console.log("  standing start in 40 cm, blade down", JSON.stringify(r), JSON.stringify(t));
  ok(r.mv < 14, "no better than with it up (" + r.mv + " m)");
  console.log("  hint:", h);
  ok(/wheels stand in snow it has not cut/.test(h) && /back up to cleared ground/.test(h), "and the hint says what is wrong and what to do: start from cleared ground");
  // creeping with it up, then dropped on the move
  await ev(`__F.length = 0; __field(${X - 6}, ${X + 6}, ${Z - 8}, ${Z + 95}, 0.3); __put(${X}, ${Z}); TLXPL.rt(${JSON.stringify(uid)}).down = false; true`); await waitGame(0.8);
  await down("KeyW"); await waitGame(3); await ev(`TLXPL.rt(${JSON.stringify(uid)}).down = true; window.__t0 = [P.x, P.z, gameClock]; true`); await waitGame(8); const m = await moved(); await up("KeyW");
  console.log("  30 cm, creeping, blade dropped on the move", JSON.stringify(m));
  ok(m.mv > 15 && !m.bog, `in 30 cm, creeping with it up and dropping it on the move: it cuts its own way out (${m.mv} m in 8 s, ${m.v} m/s)`);
});

console.log(fails ? `${fails} FAILED` : "ALL PASSED");
await done(fails ? 1 : 0);
