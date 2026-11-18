// Expansion slice 4.1c1: the plow truck, Nordtrekk Brøyt 4x2, and its 3.5 m blade (tlx-vehicles.js row `plowtruck`,
// tlx-plow.js BLADES row `b35`). Asserts, exit 1 on a failure.
//   A buying: the Trucks tab row ($16,800, locked without the Freight licence), refused without the licence and without
//     the cash, bought with both; it counts as one of the three trucks; the blade is on it from the first frame.
//   B the blade is the truck's: it cannot be taken off or fitted elsewhere, the Plow tab shows it as fitted (and offers a
//     mend when worn), it is never listed used, and a plow truck that is gone leaves nothing in the shed.
//   C in the field: 30 cm and 60 cm from a cleared pad, against the pickup's blade in the same 60 cm; the cut is 3 m wide
//     at the yard level, the windrow on the right, the left untouched, the snow cut = the snow laid.
//   D a 90 cm drift, 12 m of it, taken at a run: through it, no "stuck" line.
//   E one DRIVEN pass (keys) down the middle of a snowed-in road stretch opens it: both sides marked by the one blade.
//   F the control on keyboard, two pads and touch (the pill's word, the hint's control name).
//   G a reload: the truck, its blade (up), the model. H its turning room, printed. I stills.
// Fields are built by the test (see x4_blade.mjs). Headless runs ~0.6x: all by gameClock. ONLY=BCD... (A always).
import { boot, ev, raw, sleep, done, down, up, tap, reload, shot, sideCam, camOff, padSet, padOff, send } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(120); }
const ONLY = process.env.ONLY, STILLS = !process.env.NOSTILLS;
const section = async (n, f) => { if (ONLY && n[0] !== "A" && !ONLY.includes(n[0])) return; console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80); return true; })()`);
const PS = "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)";
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; TLXR.ROADS.plowAt = 2; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
const KIT = `(() => {
  if (!window.__F) { const fb0 = freshBase; window.__F = []; freshBase = (ix, iz) => { const F = window.__F, x = ix * CELL - HALF, z = iz * CELL - HALF; for (let i = F.length - 1; i >= 0; i--) { const q = F[i]; if (x >= q[0] && x <= q[1] && z >= q[2] && z <= q[3]) return q[4]; } return fb0(ix, iz); }; }
  window.__field = (x0, x1, z0, z1, dep) => { window.__F.push([x0 - 0.01, x1 + 0.01, z0 - 0.01, z1 + 0.01, dep]); for (let iz = Math.ceil((z0 + HALF) / CELL); iz <= Math.floor((z1 + HALF) / CELL); iz++) for (let ix = Math.ceil((x0 + HALF) / CELL); ix <= Math.floor((x1 + HALF) / CELL); ix++) {
    const c = getChunk(ix >> 5, iz >> 5), k = (iz & 31) * CH + (ix & 31), d0 = c.d[k]; c.f[k] = dep; c.d[k] = dep; if (c.g) c.g[k] = 0; writeCell(ix, iz, d0, dep, dep); } return true; };
  window.__reset = () => { BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; crashCancel(); FOOT.on = false; P.vx = P.vy = P.vz = 0; const B = TLXPL.rt(TLXV.state().cur); B.last = null; B.carry = 0; B.volCut = 0; B.volLaid = 0; B.full = false; };
  window.__put = (x, z, yaw) => { __reset(); P.x = x; P.z = z; P.yaw = yaw || 0; P.y = surf(x, z); recenter(x, z, true); camState.init = false; window.__t0 = [x, z, gameClock]; return true; };
  window.__cell = (x, z) => { const ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL), d = depthAt(ix, iz), f = freshAt(ix, iz); return { d, f, p: packOf(d, f) }; };
  window.__rt = id => TLXR.routes.find(r => r.id === id);
  window.__lane = (id, s, dir, off) => { const r = __rt(id), c = r.cum, p = r.pts; s = Math.max(0, Math.min(r.len - 0.01, s)); let i = 1; while (i < c.length - 1 && c[i] < s) i++;
    const a = p[i - 1], b = p[i], L = c[i] - c[i - 1] || 1, t = (s - c[i - 1]) / L, tx = (b[0] - a[0]) / L * dir, tz = (b[1] - a[1]) / L * dir;
    return { x: a[0] + (b[0] - a[0]) * t - tz * off, z: a[1] + (b[1] - a[1]) * t + tx * off, yaw: Math.atan2(tx, tz) }; };
  window.__putR = (id, s, dir, off) => { const q = __lane(id, s, dir, off); return __put(q.x, q.z, q.yaw); };
  window.__steer = (id, dir, off, ahead) => { const n = TLXR.near(P.x, P.z), t = __lane(id, n.s + dir * ahead, dir, off); let e = Math.atan2(t.x - P.x, t.z - P.z) - P.yaw; while (e > Math.PI) e -= 2 * Math.PI; while (e < -Math.PI) e += 2 * Math.PI;
    return { e, s: n.s, d: n.d, rid: n.route && n.route.id, v: Math.hypot(P.vx, P.vz), bog: BOG.on, why: TLXV.rt().why || "" }; };
  window.__rc = (id, i) => { const c = TLXPL.road.get(id + ":" + i); return c ? { n: c.n, c: [c.c[0], c.c[1]], s0: c.s0 } : null; };
  window.__across = (id, s) => { const o = []; for (let off = -2.8; off <= 2.81; off += 0.7) { const q = __lane(id, s, 1, off), ix = Math.round((q.x + HALF) / CELL), iz = Math.round((q.z + HALF) / CELL), d = depthAt(ix, iz), f = freshAt(ix, iz); o.push([+d.toFixed(2), +f.toFixed(2)]); } return o; };
  if (!window.__hornW) { const h0 = horn; window.__horn = 0; horn = function () { window.__horn++; return h0.apply(this, arguments); }; window.__hornW = true; }
  return true; })()`;
const moved = () => J(`({ mv: +(P.z - __t0[1]).toFixed(1), dx: +(P.x - __t0[0]).toFixed(2), v: +Math.hypot(P.vx, P.vz).toFixed(2), t: +(gameClock - __t0[2]).toFixed(1), bog: BOG.on, why: TLXV.rt().why, drag: Math.round(TLXPL.rt(TLXV.state().cur).drag), depth: +TLXPL.rt(TLXV.state().cur).depth.toFixed(2), carry: +TLXPL.rt(TLXV.state().cur).carry.toFixed(2), full: !!TLXPL.rt(TLXV.state().cur).full })`);
const trucksRows = () => J(`(() => { const out = []; VEH.tabs.find(t => t.id === "trucks").render(document.createElement("div"), (n, d, p, c) => out.push({ n, d, p, c })); return out; })()`);
const plowRows = () => J(`(() => { const out = []; VEH.tabs.find(t => t.id === "plow").render(document.createElement("div"), (n, d, p, c) => out.push({ n, d, p, c })); return out; })()`);
const seat = async u => { await ev(`TLXV.swapTo(${JSON.stringify(u)}); FOOT.on = false; true`); await sleep(600); };

await boot();
await ev(SETUP); await sleep(600); await ev(KIT);

let uid = null, pk = null, spot = null;
await section("A buying", async () => {
  await ev(`GS.cash = 30000; GS.lic = GS.lic || {}; GS.lic.freight = false; true`);
  let rows = await trucksRows(), r = rows.find(q => /Brøyt/.test(q.n));
  ok(r && r.p === "$16800" && r.c === "locked" && /Freight licence/.test(r.d) && /3\.5 m blade/.test(r.d), "the Trucks tab lists the Nordtrekk Brøyt 4x2 at $16800, locked: it needs the Freight licence (" + JSON.stringify(r && [r.n, r.p, r.c]) + ")");
  await clearToasts(); await ev(`TLXV.buy("plowtruck"); true`); await sleep(250);
  let s = await J(`({ n: TLXV.state().owned.length, cash: GS.cash })`), t = await toasts();
  ok(s.n === 0 && s.cash === 30000 && t.some(m => /needs your Freight licence/.test(m)), "no licence: not sold, the cash stays, the line says why");
  await ev(`GS.lic.freight = true; GS.cash = 16000; true`); await clearToasts(); await ev(`TLXV.buy("plowtruck"); true`); await sleep(250);
  s = await J(`({ n: TLXV.state().owned.length, cash: GS.cash })`); t = await toasts();
  ok(s.n === 0 && s.cash === 16000 && t.some(m => /is \$16,800/.test(m)), "the licence but $16,000: not sold (" + JSON.stringify(t) + ")");
  await ev(`GS.cash = 30000; true`); rows = await trucksRows(); r = rows.find(q => /Brøyt/.test(q.n));
  ok(r && r.c === "", "with the licence and the cash the row is open");
  await ev(`TLXV.buy("plowtruck"); true`); await sleep(500);
  s = await J(`(() => { const o = TLXV.state().owned, r = o[0], p = TLX.state("plow"), B = r ? TLXPL.rt(r.uid) : null, R = r ? TLXV.runtimeOf(r.uid) : null; return { n: o.length, id: r && r.id, uid: r && r.uid, cash: GS.cash, blade: r && p.blades[r.uid], shed: p.shed.length, model: !!(B && R && B.grp && B.grp.parent === R.grp), kids: B && B.grp ? B.grp.children.length : 0, hull: R ? !!TLXPL.hull(R) : false, hr: R && TLXPL.hull(R) ? +TLXPL.hull(R).r.toFixed(2) : 0 }; })()`);
  console.log("  bought", JSON.stringify(s));
  ok(s.n === 1 && s.id === "plowtruck" && s.cash === 30000 - 16800, "bought: $16,800 gone once, one truck on the forecourt");
  ok(s.blade && s.blade.id === "b35" && s.blade.cond === 100 && s.shed === 0, "its blade came with it: the Brøytskjær 3.5, a whole edge, nothing in the shed");
  ok(s.model && s.kids === 2 && s.hull && s.hr > 1.5, "the blade's model is on the truck and is part of its hull (" + s.hr + " m half-width)");
  uid = s.uid;
  // one of the three trucks
  await ev(`GS.cash = 60000; TLXV.buy("pickup"); TLXV.buy("pickup"); true`); await sleep(400);
  pk = await ev(`TLXV.state().owned[1].uid`);
  await clearToasts(); await ev(`TLXV.buy("plowtruck"); true`); await sleep(250);
  s = await J(`({ n: TLXV.state().owned.length, cash: GS.cash })`); t = await toasts(); rows = await trucksRows(); r = rows.find(q => /Brøyt/.test(q.n));
  ok(s.n === 3 && t.some(m => /enough trucks/.test(m)) && r.c === "locked" && /Owned ×1/.test(r.p), "it counts as one of the three trucks: a fourth is refused and the row is locked (" + r.p + ")");
  spot = await J(`(() => { for (let r = 150; r < 3600; r += 41) for (let a = 0; a < 6.28; a += 0.19) { const x = depot.x + Math.cos(a) * r, z = depot.z + Math.sin(a) * r; let bad = false;
    for (let k = -10; k <= 100 && !bad; k += 10) for (const sx of [-7, 0, 7]) if (isSea(x + sx, z + k) || isWater(x + sx, z + k) || obNear(x + sx, z + k, 8) || slopeAt(x + sx, z + k, 8) > 0.03 || yardAt(x + sx, z + k) > 0.02 || bioAt(x + sx, z + k) === 1) { bad = true; break; }
    if (!bad && Math.abs(groundAt(x, z) - groundAt(x, z + 90)) < 1.2 && (!window.TLXR || TLXR.near(x, z + 45).d > 70)) return { x, z }; } return null; })()`);
  ok(!!spot, "a flat open strip for the fields: " + JSON.stringify(spot));
});
if (!uid || !pk || !spot) await done(1);
const U = JSON.stringify(uid), PK = JSON.stringify(pk);

await section("B the blade is the truck's", async () => {
  await clearToasts(); const r0 = await ev(`TLXPL.unfit(${U})`); await sleep(250);
  let s = await J(`({ b: TLX.state("plow").blades[${U}], shed: TLX.state("plow").shed.length })`), t = await toasts();
  ok(r0 === false && s.b && s.b.id === "b35" && s.shed === 0 && t.some(m => /part of the truck/.test(m)), "taking it off is refused: it is part of the truck (" + JSON.stringify(t) + ")");
  const c0 = await ev("GS.cash");
  ok((await ev(`TLXPL.fit(${PK}, "b35")`)) === false && (await ev(`TLXPL.fit(${U}, "b23")`)) === false && (await ev("GS.cash")) === c0, "it fits no pickup, and the pickup's blade does not go on the plow truck");
  let rows = await plowRows(); console.log("  Plow tab:", JSON.stringify(rows.map(q => [q.n, q.p, q.c])));
  const mine = rows.find(q => /Brøytskjær 3.5 on the Nordtrekk Brøyt/.test(q.n));
  ok(mine && mine.p === "Fitted" && mine.c === "locked" && /stays on it/.test(mine.d) && /One pass/.test(mine.d) && /Cutting edge 100%/.test(mine.d), "the Plow tab shows it fitted for good, with its edge and what it does");
  ok(rows.filter(q => /^Fit the Fjellskjær 2.3/.test(q.n)).length === 2 && !rows.some(q => /Fit the Brøytskjær|Take the Brøytskjær/.test(q.n)), "the two pickups are still offered the Fjellskjær; nothing offers to fit or remove the truck's own");
  await ev(`TLX.state("plow").blades[${U}].cond = 62.4; true`); rows = await plowRows();
  const mend = rows.find(q => /^Mend the cutting edge of the Nordtrekk Brøyt/.test(q.n));
  ok(mend && mend.p === "$" + 37 * 6, "worn to 62%, the tab offers the mend at $6 a point (" + (mend && mend.p) + ")");
  await ev(`TLX.state("plow").blades[${U}].cond = 100; true`);
  const pool = await J(`(() => { GS.delivered = 20; return TLXPL.mkt.pool([]); })()`);
  ok(pool.every(q => q.item !== "blade:b35") && pool.some(q => q.item === "blade:b23"), "Bytteboden may list a used Fjellskjær (two bladeless pickups) but never the truck's blade: " + JSON.stringify(pool));
  s = await J(`(() => { const p = TLX.state("plow"); p.blades["v99"] = { id: "b35", cond: 80 }; p.shed.push("b35"); p.shedC.push(80); delete p.blades[${U}]; TLXPL.tidy(); return { keys: Object.keys(p.blades), shed: p.shed.slice(), b: p.blades[${U}] }; })()`);
  ok(s.keys.length === 1 && s.keys[0] === uid && s.shed.length === 0 && s.b.id === "b35", "a plow truck that is gone leaves no blade in the shed, and a save that lost the blade gets it back (" + JSON.stringify(s.keys) + ")");
  await sleep(300);
  ok(await ev(`(() => { const B = TLXPL.rt(${U}), R = TLXV.runtimeOf(${U}); return !!(B.grp && R && B.grp.parent === R.grp); })()`), "and its model is still on the truck");
});

const X = spot.x, Z = spot.z;
const run = async (lane, depth, secs, z0 = Z) => {
  await ev(`__F.length = 0; __field(${X + lane - 7}, ${X + lane + 7}, ${z0 - 9}, ${z0 + 105}, ${depth}); __field(${X + lane - 7}, ${X + lane + 7}, ${z0 - 9}, ${z0 + 7}, 0.06); __put(${X + lane}, ${z0}); TLXPL.rt(TLXV.state().cur).down = true; true`);
  await waitGame(0.9); await ev(`window.__t0 = [P.x, P.z, gameClock]; true`);
  await down("KeyW"); await waitGame(secs); const r = await moved(); await up("KeyW");
  await waitGame(0.3); return r;
};

await section("C in the field", async () => {
  await seat(pk); await ev(`TLX.state("plow").blades[${PK}] = { id: "b23", cond: 100, throw: "r" }; true`); await sleep(300);
  const p60 = await run(0, 0.6, 9); console.log("  pickup, 60 cm", JSON.stringify(p60));
  await seat(uid);
  ok(await ev(`!!VEH.cur && !FOOT.on && TLXV.state().cur === ${U}`), "seated in the plow truck");
  const r30 = await run(0, 0.3, 9), h30 = await ev("TLXPL.hint()"); console.log("  plow truck, 30 cm", JSON.stringify(r30), "|", h30);
  const r60 = await run(0, 0.6, 11); console.log("  plow truck, 60 cm", JSON.stringify(r60));
  ok(r60.v >= 5.5 && !r60.bog && !r60.full, `60 cm at ${r60.v} m/s (${Math.round(r60.v * 3.6)} km/h; 20 km/h or more), not bogged, the blade not choked`);
  ok(r60.v > p60.v * 1.6, `against the pickup's ${p60.v} m/s (${Math.round(p60.v * 3.6)} km/h) in the same snow`);
  ok(r30.v > r60.v + 0.8 && r30.v <= 22.5, `30 cm is quicker still: ${r30.v} m/s (${Math.round(r30.v * 3.6)} km/h)`);
  ok(/BLADE DOWN · \d+ km\/h · cutting \d+ cm/.test(h30), "the hint gives speed and depth: " + h30);
  ok(Math.abs(r60.dx) < 1.5, "it holds its line (" + r60.dx + " m aside)");
  // the cross-section 25 m from the start, in the 60 cm
  const cs = await J(`(() => { const z = ${Z} + 25, o = { lane: [], right: [], left: [] };
    for (let x = -1.25; x <= 1.251; x += 0.25) o.lane.push(__cell(${X} + x, z));
    for (let x = 1.9; x <= 5.01; x += 0.25) o.right.push(__cell(${X} - x, z));
    for (let x = 2.0; x <= 3.01; x += 0.25) o.left.push(__cell(${X} + x, z));
    const B = TLXPL.rt(TLXV.state().cur); o.cut = B.volCut; o.laid = B.volLaid; o.carry = B.carry; return o; })()`);
  const lane = cs.lane.map(c => +(c.d / c.f).toFixed(2)), right = cs.right.map(c => +(c.d - c.f).toFixed(2)), left = cs.left.map(c => +(c.d - c.f).toFixed(2));
  console.log("  lane d/f", lane.join(" ")); console.log("  right d-f", right.join(" "), "| left d-f", left.join(" "));
  ok(lane.every(v => v <= 0.2), "the lane is cut to the yard level across 2.5 m and more (d/f " + Math.max(...lane) + " at most): wider than the truck");
  ok(Math.max(...right) >= 0.5 && right.filter(v => v > 0.15).length >= 6, "a windrow stands on the right, " + Math.max(...right) + " m over the pack at its crest and " + (right.filter(v => v > 0.15).length * 0.25).toFixed(1) + " m wide");
  ok(left.every(v => Math.abs(v) <= 0.02), "the snow on the left is as it was");
  ok(cs.cut > 40 && Math.abs(cs.laid + cs.carry - cs.cut) / cs.cut < 0.25, `the snow cut is the snow laid: ${cs.cut.toFixed(1)} m3 cut, ${cs.laid.toFixed(1)} laid, ${cs.carry.toFixed(2)} on the blade`);
  // blade up in 40 cm: ten tonnes sink (printed; the truck's own physics, as the tractor's)
  await ev(`__F.length = 0; __field(${X - 7}, ${X + 7}, ${Z - 9}, ${Z + 105}, 0.4); __put(${X}, ${Z}); TLXPL.rt(${U}).down = false; true`); await waitGame(0.9); await ev(`window.__t0 = [P.x, P.z, gameClock]; true`);
  await down("KeyW"); await waitGame(8); const upR = await moved(); await up("KeyW"); await waitGame(0.3);
  console.log("  blade UP in 40 cm", JSON.stringify(upR));
  ok(upR.drag === 0 && upR.mv < r60.mv * 0.6, `with the blade UP, 40 cm of powder is no road for it: ${upR.mv} m in 8 s (the blade puts ${upR.drag} N on it)`);
});

await section("D a 90 cm drift at a run", async () => {
  await seat(uid);
  // a cleared run-up of 45 m, 12 m of drift, cleared beyond
  await ev(`__F.length = 0; __field(${X - 7}, ${X + 7}, ${Z - 9}, ${Z + 110}, 0.06); __field(${X - 7}, ${X + 7}, ${Z + 50}, ${Z + 62}, 0.9); __put(${X}, ${Z}); TLXPL.rt(${U}).down = true; true`);
  await waitGame(0.9); await clearToasts(); await ev(`window.__t0 = [P.x, P.z, gameClock]; window.__vin = 0; window.__vmin = 99; true`);
  await down("KeyW");
  for (let k = 0; k < 160; k++) { const m = await J(`({ z: P.z - ${Z}, v: Math.hypot(P.vx, P.vz) })`); if (m.z < 44.5) await ev(`window.__vin = ${m.v}; true`); else if (m.z < 58) await ev(`window.__vmin = Math.min(window.__vmin, ${m.v}); true`); if (m.z > 70 || (k > 40 && m.v < 0.2)) break; await sleep(100); }
  const r = await moved(), v = await J(`({ vin: +window.__vin.toFixed(1), vmin: +window.__vmin.toFixed(1) })`); await up("KeyW"); const t = await toasts();
  console.log("  drift", JSON.stringify(r), JSON.stringify(v), JSON.stringify(t));
  ok(r.mv > 66 && !r.bog, `a 90 cm drift 12 m long, met at ${v.vin} m/s: through it (${r.mv} m on), slowest ${v.vmin} m/s`);
  ok(v.vmin < v.vin - 0.5, "and it felt it: the drift took speed off the truck");
  ok(!t.some(m => /more snow than the truck can push|wheels|stuck/i.test(m)), "nothing called it stuck");
});

async function drive(id, dir, off, secs, stop) {
  const t0 = await clock(); let steerKey = null, gas = false, last = null, maxD = 0, vs = [], still = 0, n = 0;
  try {
    while ((await clock()) - t0 < secs) {
      const s = last = await J(`__steer(${JSON.stringify(id)}, ${dir}, ${off}, 14)`); n++;
      maxD = Math.max(maxD, s.d); vs.push(s.v);
      const wantGas = s.v < 7.5; if (wantGas !== gas) { if (wantGas) await down("KeyW"); else await up("KeyW"); gas = wantGas; }
      const want = s.e > 0.04 ? "KeyA" : s.e < -0.04 ? "KeyD" : null;
      if (want !== steerKey) { if (steerKey) await up(steerKey); if (want) await down(want); steerKey = want; }
      if (await stop(s)) break;
      still = s.v < 0.3 && n > 30 ? still + 1 : 0; if (still > 60) break;
      await sleep(90);
    }
  } finally { if (steerKey) await up(steerKey); await up("KeyW"); }
  return { t: +((await clock()) - t0).toFixed(1), s: Math.round(last.s), v: +(vs.reduce((a, b) => a + b, 0) / Math.max(1, vs.length)).toFixed(1), maxD: +maxD.toFixed(1), bog: last.bog, why: last.why, stopped: still > 60 };
}

await section("E one driven pass opens a road stretch", async () => {
  await seat(uid); await ev(`__F.length = 0; true`);
  const RD = await J(`(() => { const SEG = TLXR.ROADS.seg, out = [];
    for (const def of TLXR.ROADS.routes) { if (def.convoy || def.closed) continue; const r = __rt(def.id); if (!r || !r.st) continue;
      for (let i = 1; i < r.seg.length - 1; i++) { if (!r.seg[i - 1].legs.length || !r.seg[i].legs.length || !r.seg[i + 1].legs.length || (i + 1) * SEG + 40 > r.len) continue;
        let turn = 0, y0 = null, bad = false; for (let s = i * SEG - 40; s <= (i + 1) * SEG + 40; s += 8) { const q = __lane(def.id, s, 1, 0); if (y0 !== null) { let e = q.yaw - y0; while (e > Math.PI) e -= 2 * Math.PI; while (e < -Math.PI) e += 2 * Math.PI; turn = Math.max(turn, Math.abs(e)); } y0 = q.yaw; const n = TLXR.near(q.x, q.z); if (n.route !== r || Math.abs(n.s - s) > 3) bad = true; }
        if (!bad) out.push({ id: def.id, name: r.name, i, turn: +turn.toFixed(3) }); } }
    out.sort((a, b) => a.turn - b.turn); return out[0] || null; })()`);
  console.log("  stretch", JSON.stringify(RD));
  if (!RD) { ok(false, "no straight road stretch found"); return; }
  const SEG = 400, id = JSON.stringify(RD.id), LEVEL = 0.9;
  await ev(`TLXR.setSnow(${id}, ${LEVEL}, ${RD.i}); true`);
  await ev(`__putR(${id}, ${RD.i * SEG - 36}, 1, 0); true`); await waitGame(1.0);
  const pre = await J(`({ acr: __across(${id}, ${RD.i * SEG + 200}), st: TLXR.status(${id}), opened: TLX.state("plow").opened })`);
  const dmid = pre.acr[Math.floor(pre.acr.length / 2)];
  console.log("  the stretch at " + LEVEL + ", [d, f] across its middle:", JSON.stringify(pre.acr));
  ok(pre.st === "snowed in" && dmid[0] > 0.5, `the ${RD.name} is snowed in: ${Math.round(dmid[0] * 100)} cm on the crown (a pickup's blade stops 21 m into this)`);
  await ev(`TLXPL.rt(${U}).down = true; TLXPL.rt(${U}).last = null; true`); await clearToasts();
  let openedAt = null;
  const r = await drive(RD.id, 1, 0, 200, async s => { if (openedAt === null && (await ev(`TLX.state("plow").opened`)) > pre.opened) openedAt = Math.round(s.s - RD.i * SEG); return s.s > (RD.i + 1) * SEG + 14; });
  const a = await J(`({ sn: __rt(${id}).st.s[${RD.i}], t: __rt(${id}).st.t[${RD.i}], st: TLXR.status(${id}), opened: TLX.state("plow").opened, rc: __rc(${id}, ${RD.i}), acr: __across(${id}, ${RD.i * SEG + 200}), hour: GS.hour })`), t = await toasts();
  console.log("  pass", JSON.stringify(r), "opened at", openedAt, JSON.stringify(a), JSON.stringify(t));
  ok(!r.stopped && !r.bog && r.s > (RD.i + 1) * SEG, `the plow truck drives the whole 400 m of it: ${r.t} game s at a mean ${r.v} m/s (${Math.round(r.v * 3.6)} km/h)`);
  ok(r.maxD < 3.2, `keeping to the road (${r.maxD} m from the line at most)`);
  ok(a.opened === pre.opened + 1 && a.sn === 0 && a.rc === null, "ONE pass opened the stretch: its snow 0, the marks gone, the count up by one" + (openedAt !== null ? " (" + openedAt + " m along it)" : ""));
  ok(a.st === "open" && Number.isFinite(a.t), "the road reads open and the scraped hour is stamped");
  ok(t.some(m => m.includes(RD.name) && /open again|opened|plowed/.test(m)) && !t.some(m => /plow's been round/.test(m)), "the line names the road and is yours: " + JSON.stringify(t.filter(m => m.includes(RD.name))));
  ok(a.acr.every(c => c[0] / Math.max(c[1], 0.01) <= 0.3), "and the whole width is cut");
  if (STILLS) { await ev(`__putR(${id}, ${RD.i * SEG + 320}, 1, 0); TLXPL.rt(${U}).down = true; true`); await waitGame(0.8); await sideCam(undefined, 17, 7, 0.3); await shot("e1_road_opened_looking_back"); await camOff(); }
  await ev(`TLXPL.rt(${U}).down = false; true`);
});

await section("F the control on three schemes", async () => {
  await seat(uid); await ev(`__F.length = 0; __field(${X - 7}, ${X + 7}, ${Z - 9}, ${Z + 40}, 0.3); __field(${X - 7}, ${X + 7}, ${Z - 9}, ${Z + 3.4}, 0.06); __put(${X}, ${Z}); TLXPL.rt(${U}).down = false; window.__horn = 0; true`); await waitGame(1);
  const B = () => J(`(() => { const b = TLXPL.rt(${U}); return { down: b.down, k: +b.k.toFixed(2), horn: window.__horn, hint: TLXPL.hint(), shown: WN.show ? WN.hint : "", dev: INP.dev, pill: $("tcE").hidden ? null : $("tcE").textContent, y: b.B ? +b.B.position.y.toFixed(2) : null, lbl: VEH.cur && VEH.cur.useLabel ? VEH.cur.useLabel() : "none" }; })()`);
  await tap("KeyE"); await waitGame(0.8); let s = await B();
  ok(s.down && s.k > 0.9 && s.y < 0.05 && s.horn === 0 && s.lbl === "BLADE UP", `E drops the blade (lowered ${s.k}) and the horn stays silent`);
  ok(/^BLADE DOWN/.test(s.hint) && /E: lift it/.test(s.hint) && s.shown.includes("BLADE DOWN"), "the hint on screen, blade down, names E to lift it: " + s.shown);
  await tap("KeyE"); await waitGame(0.8); s = await B();
  ok(!s.down && s.k < 0.1 && /^E: drop the blade · \d+ cm of snow ahead/.test(s.hint), "E again lifts it and the hint offers E to drop it: " + s.hint);
  for (const [name, id] of [["Xbox", undefined], ["DualSense", PS]]) {
    await padSet({ 10: 1 }, [0, 0, 0, 0], id); await sleep(200); await padSet({}, [0, 0, 0, 0], id); await waitGame(0.8); s = await B();
    ok(s.down && s.horn === 0 && s.dev === "pad" && /L3: lift it/.test(s.hint), `${name}: L3 drops it and the hint names L3: ` + s.hint);
    await padSet({ 10: 1 }, [0, 0, 0, 0], id); await sleep(200); await padSet({}, [0, 0, 0, 0], id); await waitGame(0.8); s = await B();
    ok(!s.down && /^L3: drop the blade/.test(s.hint), `${name}: L3 lifts it`);
  }
  await padOff(); await sleep(200);
  await send("Emulation.setTouchEmulationEnabled", { enabled: true });
  await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 640, y: 200 }] }); await sleep(100);
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(200);
  await ev(`SET.touch = "on"; setTouchUI(); true`); await sleep(600); s = await B();
  ok(s.dev === "touch" && s.pill === "BLADE DOWN" && /^tap BLADE DOWN/.test(s.hint), "touch: the pill reads BLADE DOWN and the hint says tap it (" + s.pill + ")");
  await ev(`$("tcE").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 5, pointerType: "touch" })); true`); await sleep(180);
  await ev(`$("tcE").dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 5, pointerType: "touch" })); true`); await waitGame(0.8); s = await B();
  ok(s.down && s.pill === "BLADE UP" && s.horn === 0 && /tap BLADE UP/.test(s.hint), "touch: a press drops it, the pill now reads BLADE UP");
  await ev(`SET.touch = "auto"; setTouchUI(); true`); await send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await tap("KeyH"); await sleep(150); await tap("KeyH"); await sleep(200);
  // held: it slews like the pickup's
  await down("KeyE"); await sleep(750); await up("KeyE"); await sleep(300);
  s = await J(`({ th: TLXPL.throwOf(${U}), down: TLXPL.rt(${U}).down })`);
  ok(s.th === "l" && s.down, "held with the blade down, it slews to throw left and stays down");
  await ev(`TLX.state("plow").blades[${U}].throw = "r"; true`);
});

await section("G a reload", async () => {
  await seat(uid); await ev(`TLXPL.rt(${U}).down = true; TLX.state("plow").blades[${U}].cond = 77; save(); true`); await sleep(200);
  await reload(); await ev(SETUP); await sleep(500); await ev(KIT);
  const s = await J(`(() => { const u = TLXV.state().cur, p = TLX.state("plow"), r = TLXV.state().owned.find(q => q.uid === ${U}), b = TLXPL.rt(${U}), R = TLXV.runtimeOf(${U}); return { cur: u, seated: !!VEH.cur && !FOOT.on, id: r && r.id, blade: p.blades[${U}], shed: p.shed.length, down: b.down, model: !!(b.grp && R && b.grp.parent === R.grp), lbl: VEH.cur && VEH.cur.useLabel ? VEH.cur.useLabel() : "none" }; })()`);
  console.log("  reloaded", JSON.stringify(s));
  ok(s.cur === uid && s.seated && s.id === "plowtruck", "reload: back in the plow truck");
  ok(s.blade && s.blade.id === "b35" && Math.abs(s.blade.cond - 77) < 0.01 && s.shed === 0, "its blade and the blade's edge (77%) are saved");
  ok(s.down === false && s.model && s.lbl === "BLADE DOWN", "the blade is UP after a reload, its model on the truck, the control still the blade's");
  await ev(`TLX.state("plow").blades[${U}].cond = 100; true`);
});

await section("H turning room", async () => {
  await seat(uid); await ev(`__F.length = 0; __field(${X - 40}, ${X + 40}, ${Z - 20}, ${Z + 70}, 0.05); __put(${X}, ${Z}); TLXPL.rt(${U}).down = false; window.__tr = { x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9 }; true`); await waitGame(0.6);
  await ev(`(() => { const f = () => { const t = window.__tr; if (!t) return; t.x0 = Math.min(t.x0, P.x); t.x1 = Math.max(t.x1, P.x); t.z0 = Math.min(t.z0, P.z); t.z1 = Math.max(t.z1, P.z); requestAnimationFrame(f); }; requestAnimationFrame(f); return true; })()`);
  await down("KeyA"); const t0 = await clock(); let gas = false;
  while ((await clock()) - t0 < 16) { const v = await ev("Math.hypot(P.vx, P.vz)"); const want = v < 3; if (want !== gas) { if (want) await down("KeyW"); else await up("KeyW"); gas = want; } await sleep(90); }
  await up("KeyW"); await up("KeyA");
  const tr = await J(`(() => { const t = window.__tr; window.__tr = null; return { dx: +(t.x1 - t.x0).toFixed(1), dz: +(t.z1 - t.z0).toFixed(1) }; })()`);
  const dia = Math.max(tr.dx, tr.dz), wall = dia + 3.1 + 2 * 0.9;
  console.log(`  full lock at a walk: the truck's middle turns a circle ${dia} m across; with the blade it needs about ${wall.toFixed(0)} m between banks (a road is 6.4 m: a three-point turn, or a yard)`);
  ok(dia > 8 && dia < 30, "its turning circle is a lorry's (" + dia + " m across at the truck's middle)");
});

await section("I stills", async () => {
  if (!STILLS) return;
  await seat(uid);
  const vcam = async (yawOff, dist, h, ty = 1.4, fwd = 1.4) => { await sideCam(); await ev(`window.camOv = c => { const yaw = P.yaw + ${yawOff}, tx = P.x + Math.sin(P.yaw) * ${fwd}, tz = P.z + Math.cos(P.yaw) * ${fwd}; c.position.set(tx + Math.sin(yaw) * ${dist}, P.y + ${ty} + ${h}, tz + Math.cos(yaw) * ${dist}); c.lookAt(tx, P.y + ${ty}, tz); }; true`); await sleep(400); };
  await ev(`__F.length = 0; __field(${X - 30}, ${X + 30}, ${Z - 30}, ${Z + 30}, 0.05); __put(${X}, ${Z}); TLXPL.rt(${U}).down = false; true`); await waitGame(1.2);
  await vcam(1.5708, 12, 0.6); await shot("i1_side_up");
  await vcam(0.6, 10.5, 1.6); await shot("i2_front34_up");
  await vcam(Math.PI - 0.6, 10.5, 1.8, 1.4, -0.5); await shot("i3_rear34");
  await ev(`TLXPL.rt(${U}).down = true; true`); await waitGame(1);
  await vcam(1.5708, 12, 0.6); await shot("i4_side_down");
  await vcam(0.55, 8, 0.9, 1.0, 3.6); await shot("i5_blade_close_down");
  await ev(`GS.hour = 23; true`); await waitGame(1.5);
  await vcam(0.6, 10.5, 1.6); await shot("i6_front34_night");
  await ev(`GS.hour = 12; true`); await waitGame(1.0);
  await ev(`__F.length = 0; __field(${X - 7}, ${X + 7}, ${Z - 9}, ${Z + 105}, 0.5); __field(${X - 7}, ${X + 7}, ${Z - 9}, ${Z + 7}, 0.06); __put(${X}, ${Z}); TLXPL.rt(${U}).down = true; true`); await waitGame(0.8);
  await down("KeyW"); await waitGame(5); await vcam(Math.PI - 0.35, 16, 8, 0.6, -7); await shot("i7_cutting_behind_high"); await vcam(0.5, 11, 2.2, 1.2, 2); await shot("i8_cutting_front34");
  await camOff(); await ev(`camMode = 2; camState.init = false; true`); await waitGame(0.8); await shot("i9_cab");
  await up("KeyW"); await ev(`camMode = 0; camState.init = false; true`); await waitGame(1.2);
  await camOff();
});

console.log(fails ? `${fails} FAILED` : "ALL PASSED");
await done(fails ? 1 : 0);
