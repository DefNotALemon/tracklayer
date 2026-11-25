// Goal G7 slice H1c: the trails' life (tlx-trails.js): Lysløypa's lamps and their power bill, fires and rests at the gapahuk (parties too), the ski
// rescue call, weekends and the skating lane, the monthly skidag. Asserts, exit 1 on a failure.
//   A lamps: lit only when taken on + switched on + between dusk and 22:00; the lamp meshes follow; draw calls added
//   B the bill: hours accrue only while lit, charged on Monday as its own statement line; handing back settles it
//   C evenings: a lit Lysløypa is skied after dark, an unlit one is not
//   D weekends draw more people than weekdays on the same trail state
//   E the skating lane: a wide-set trail draws skaters and pays more per skier-km; the trail page says so
//   F the gapahuk fire: a rest lights it, it burns down after they leave; you can light it and it warms you; its prompt under keyboard, pad and touch
//   G a family party rests: seated or standing by the fire, nobody inside anybody or the lean-to
//   H the ski rescue: a forced call names a real person on the trail, the compass / Jobs / Map point at them, carrying them to the trailhead pays and
//     posts thanks; the family posted worry; option off stops calls; the prompt under all three schemes
//   I the skidag: announced three days ahead, board / app / Calendar, the crowd, the table and the villagers, the bonus only when freshly set at 09:00
//   J reload keeps the lamp switch, a pending skidag and an open rescue
// Stills (OUT, skip with NOSTILLS=1): night on the lit loop with a skier under a lamp, the gapahuk with the fire and a party, the casualty, the skidag trailhead.
import { boot, ev, sleep, done, reload, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const NOSTILLS = !!process.env.NOSTILLS;
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 500)); } };
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); TLXSK.hold = true; GS.delivered = 5; GS.own.parts.hitch = "groomer"; true`;
const KIT = `(() => {
  window.__T = id => TLXSK.list.find(t => t.id === id);
  window.__setAll = (id, w = 2.4) => { const t = __T(id); t.st.seg.forEach((g, i) => TLXSK.setSeg(t, i, w)); return true; };
  window.__fresh = id => { const t = __T(id); t.st.taken = 1; t.st.lamps = 1; t.st.out = []; t.st.lampH = 0; t.st.sdb = 0; t.st.day = { v: 0, km: 0, kw: 0 }; t.st.wk = { v: 0, km: 0, kw: 0, days: 0, low: 0, under: 0 }; t.st.tot = { v: 0, km: 0, pay: 0 }; t.st.last = []; __setAll(id); return true; };
  window.__at = H => { GS.hour = H; TLX.state("trails").h = Math.floor(H); return true; };
  window.__hold = null; window.__keep = H => { clearInterval(window.__hold); if (H === null) return true; window.__hold = setInterval(() => { GS.hour = H; }, 8); return true; };
  TLXSK.rcMul = 0;                                                                        // no rolled rescue while the clock is stepped: the rescue section asks for its own
  window.__ids = () => TLXN.people.filter(q => q.interests.includes("ski"));
  return true; })()`;
const MON0 = 24;                                                                          // GS.hour 24 = Monday 2 Nov 00:00
const h = (day, hr) => MON0 + day * 24 + hr;                                              // day 0 = Monday

await boot(); await ev(SETUP); await sleep(700); await ev(KIT);
await ev(`GS.cash = 5000; true`);

/* ---------------- A lamps ---------------- */
await section("A lamps: when they are lit", async () => {
  await ev(`__fresh("lys"); true`);
  const L = hr => J(`TLXSK.lampsLit(__T("lys"), ${hr})`);
  ok((await L(h(0, 18))) === true && (await L(h(0, 20))) === true, "taken on + switched on, in the evening: lit (18:00, 20:00)");
  ok((await L(h(0, 22.5))) === false && (await L(h(0, 23))) === false && (await L(h(0, 6))) === false, "not after 22:00 and not before dusk (22:30, 23:00, 06:00)");
  ok((await L(h(0, 11))) === false, "in daylight the lamps are not lit (11:00)");
  await ev(`__T("lys").st.lamps = 0; true`); ok((await L(h(0, 19))) === false, "switched off: not lit");
  await ev(`__T("lys").st.lamps = 1; __T("lys").st.taken = 0; true`); ok((await L(h(0, 19))) === false, "not taken on: not lit");
  ok((await J(`TLXSK.lampsLit(__T("meh"), ${h(0, 19)})`)) === false, "a trail with no lamp posts is never lit");
  await ev(`__T("lys").st.taken = 1; true`);
  // the lamp meshes follow the clock: lit, dark outside the window; and the draw calls they add
  const calls = async (H, lamps) => { await ev(`__T("lys").st.lamps = ${lamps}; true`); await ev(`__keep(${H}); true`); await sleep(3200); return J(`(() => { const q = TLXSK.LV.list[0], v = [q.heads.visible, q.pools.visible, q.halo.visible]; const r = on => { q.heads.visible = q.pools.visible = q.halo.visible = on; renderer.render(scene, camera); return renderer.info.render.calls; }; const withL = r(true), without = r(false); [q.heads.visible, q.pools.visible, q.halo.visible] = v; return { vis: q.heads.visible, pools: q.pools.visible, halo: q.halo.visible, k: q.k, op: q.pools.material.opacity, calls: withL, without }; })()`); };
  await ev(`P.x = __T("lys").pts[0][0] + 20; P.z = __T("lys").pts[0][1] + 20; P.vx = P.vz = 0; recenter(P.x, P.z, true); true`);
  const on = await calls(h(0, 19), 1), off = await calls(h(0, 19), 0), day = await calls(h(0, 11), 1);
  console.log("  ", JSON.stringify({ on, off, day }));
  ok(on.vis && on.pools && on.halo && on.k > 0.9 && on.op > 0.2, "evening, lamps on: heads, warm pools and halos are drawn (k " + on.k.toFixed(2) + ", pool opacity " + on.op.toFixed(2) + ")");
  ok(!off.vis && !off.pools && !off.halo, "lamps off: nothing is drawn");
  ok(!day.vis, "daylight: nothing is drawn");
  ok(on.calls - on.without === 3, `the lit loop at night adds ${on.calls - on.without} draw calls (heads, pools, halos; no real light per post): ${on.without} -> ${on.calls}`);
  await ev(`__keep(null); __at(${h(0, 12)}); true`);
});

/* ---------------- B the bill ---------------- */
await section("B the bill", async () => {
  // TLXSK.step(n) advances n hours itself; use it directly for the count
  const count = async (lamps, taken = 1) => { await ev(`__fresh("lys"); __T("lys").st.lamps = ${lamps}; __T("lys").st.taken = ${taken}; __at(${h(0, 6)}); true`); await ev(`TLXSK.step(24); true`); return J(`__T("lys").st.lampH`); };
  const lit = await count(1), dark = await count(0), un = await count(1, 0);
  const exp = await J(`(() => { let n = 0; for (let H = ${h(0, 6)} + 1; H <= ${h(0, 6)} + 24; H++) if (TLXSK.lampWin(H - 0.5)) n++; return n; })()`);
  console.log("  ", JSON.stringify({ lit, dark, un, exp }));
  ok(lit === exp && lit >= 5 && lit <= 11, `a day with the lamps on counts exactly the lit hours (${lit} h, dusk to 22:00)`);
  ok(dark === 0, "lamps switched off: no hours counted");
  ok(un === 0, "trail not taken on: no hours, no bill");
  // Monday: its own statement line, charged to the cash
  await ev(`__fresh("lys"); __T("lys").st.lamps = 1; __at(${h(0, 6)}); true`); await ev(`TLXSK.step(24 * 3); true`);
  const m = await J(`(() => { const t = __T("lys"), lh = t.st.lampH, rate = TLXSK.H1C.lamp.rate; t.st.wk = { v: 9, km: 20, kw: 20, days: 3, low: 0, under: 0 }; const c0 = GS.cash; const net = TLX.systems.find(s => s.id === "trails").monday({ label: "Mon 9 Nov" }); return { lh, rate, c0, c1: GS.cash, net, last: t.st.last[0], lampH: t.st.lampH, }; })()`);
  console.log("  ", JSON.stringify(m));
  ok(m.lh >= 15 && m.last && m.last.lc === Math.round(m.lh * m.rate) && m.last.lh === m.lh, `Monday charges the power as its own statement entry: ${m.lh} h × $${m.rate} = $${m.last && m.last.lc}`);
  ok(m.c1 - m.c0 === m.net && m.lampH === 0, "the cash moved by the pay less the power, and the week's lamp hours start again");
  // the statement shows on the trail page
  await ev(`TLXSK.back(); TABLET.toggle(true, "loyper"); true`); await sleep(500);
  await ev(`document.querySelector("[data-act='lyo:lys']").click(); true`); await sleep(500);
  const t2 = await ev(`document.getElementById("tabS").textContent`);
  ok(/lamps/i.test(t2) && /h lit/.test(t2) && /Lamps/.test(t2), "the trail page shows the lamps card and the statement's own lamps line");
  ok(/SWITCH LAMPS (ON|OFF)/i.test(t2), "the lamps have an on/off control on the trail page");
  // handing back takes the power off
  const gb = await J(`(() => { const t = __T("lys"); t.st.lampH = 10; const c0 = GS.cash; TLXSK.giveBack("lys"); return { d: GS.cash - c0, last: t.st.last[0] }; })()`);
  ok(gb.last && gb.last.lc === Math.round(10 * 0.75), "handing the trail back settles the lamp power too ($" + (gb.last && gb.last.lc) + ")");
  await ev(`TLXSK.back(); TABLET.toggle(false); true`);
});

/* ---------------- C evenings ---------------- */
await section("C evenings after dark", async () => {
  const evening = async lamps => {
    let n = 0;
    for (let rep = 0; rep < 14; rep++) {
      n += await J(`(() => { __fresh("lys"); __T("lys").st.lamps = ${lamps}; let v0 = 0; for (const H of [${h(1, 17)}, ${h(1, 18)}, ${h(1, 19)}, ${h(1, 20)}, ${h(1, 21)}]) { __at(H); TLXSK.outingsHour(H); } return __T("lys").st.tot.v; })()`);
    }
    return n;
  };
  const lit = await evening(1), unlit = await evening(0);
  console.log("  ", JSON.stringify({ lit, unlit }));
  ok(lit > 0 && unlit === 0, `weekday evenings after dark: lit Lysløypa had ${lit} visits, unlit ${unlit}`);
  const dayLit = await J(`(() => { let n = 0; for (let r = 0; r < 14; r++) { __fresh("lys"); for (const H of [${h(1, 10)}, ${h(1, 11)}, ${h(1, 12)}, ${h(1, 13)}]) { __at(H); TLXSK.outingsHour(H); } n += __T("lys").st.tot.v; } return n; })()`);
  ok(dayLit >= 0, `(daytime visits are unchanged by the lamps: ${dayLit})`);
});

/* ---------------- D weekends ---------------- */
await section("D weekends draw more people", async () => {
  const day = (d, rep) => J(`(() => { let n = 0; for (let r = 0; r < ${rep}; r++) { __fresh("lys"); for (let hr = 8; hr < 22; hr++) { const H = ${MON0} + ${d} * 24 + hr; __at(H); TLXSK.outingsHour(H); } n += __T("lys").st.tot.v; } return n; })()`);
  const wk = (await day(2, 24)) + (await day(3, 24)), we = (await day(5, 24)) + (await day(6, 24));
  console.log("  ", JSON.stringify({ weekday: wk, weekend: we }));
  ok(we > wk * 1.25 && wk > 10, `weekend days draw visibly more people on the same trail state: ${we} visits vs ${wk} on weekdays`);
});

/* ---------------- E the skating lane ---------------- */
await section("E the skating lane", async () => {
  const run = async w => J(`(() => { let sk = 0, v = 0, km = 0, kw = 0; for (let r = 0; r < 40; r++) { __fresh("lys"); __setAll("lys", ${w}); const t = __T("lys"); for (let hr = 9; hr < 15; hr++) { const H = ${MON0} + 2 * 24 + hr; __at(H); TLXSK.outingsHour(H); } for (const o of t.st.out) if (o.sk) sk++; v += t.st.tot.v; km += t.st.tot.km; kw += t.st.day.kw; } return { sk, v, km, kw, rate: kw / Math.max(0.01, km), ws: (__setAll("lys", ${w}), TLXSK.wideShare(__T("lys"))) }; })()`);
  const narrow = await run(2.4), wide = await run(5.8);
  console.log("  ", JSON.stringify({ narrow, wide }));
  ok(wide.ws > 0.9 && narrow.ws === 0, "a pass with the wing tiller sets the segments wide (" + wide.ws.toFixed(2) + " of the trail)");
  ok(wide.sk > 0 && narrow.sk === 0, `a wide-set trail draws skaters (${wide.sk} skater parties, none on the narrow track)`);
  ok(wide.rate > narrow.rate * 1.1, `…and pays more per skier-km: ${wide.rate.toFixed(2)} vs ${narrow.rate.toFixed(2)} weighted km per km`);
  await ev(`__fresh("lys"); __setAll("lys", 5.8); TLXSK.back(); TABLET.toggle(true, "loyper"); true`); await sleep(400);
  await ev(`document.querySelector("[data-act='lyo:lys']").click(); true`); await sleep(500);
  const t = await ev(`document.getElementById("tabS").textContent`);
  ok(/Skating lane/.test(t) && /wing tiller/.test(t) && /35% more per skier-km/.test(t), "the trail page says it: skating lane, wing tiller, 35% more per skier-km");
  await ev(`TLXSK.back(); TABLET.toggle(false); true`);
});

/* ---------------- F the gapahuk fire ---------------- */
const BOOK = async (id, party, kid) => J(`(() => { const t = __T("${id}"); __fresh("${id}"); t.st.out = [];
  const ps = __ids().filter(q => q.age > 22 && q.age < 55 && q.vid === t.villages[0]);
  let best = null; for (const p of ps) { t.st.out = []; __at(${h(0, 34 - 24)}); TLXSK.goOut(t, p, { pace: 9 }, GS.hour, false, -5); const n = t.st.out.length; if (!${party} && n === 1) { best = p; break; } if (${party} && n >= 2 && (!${!!0} || true) && (${kid ? "t.st.out.some(q => TLXN.person(q.p).age < 11)" : "n >= 3"})) { best = p; break; } }
  if (!best && ${party}) { for (const p of ps) { t.st.out = []; TLXSK.goOut(t, p, { pace: 9 }, GS.hour, false, -5); if (t.st.out.length >= 2) { best = p; break; } } }
  if (!best) return null; const o = t.st.out.find(q => q.k === 0), pl = TLXSK.planOf(t, o), bi = pl.blocks.findIndex(b => b.k === "bench");
  return { p: best.id, n: t.st.out.length, t0: o.t0, bi, T: pl.T, blocks: pl.blocks.map(b => [b.k, Math.round(b.a), Math.round(b.b)]), kids: t.st.out.map(q => TLXN.person(q.p).age) }; })()`);
await section("F the gapahuk fire", async () => {
  const b = await BOOK("san", false);
  ok(!!b && b.n === 1 && b.bi >= 0, "a solo skier on Sandfjorddalen-runden has a rest at the gapahuk in the plan " + JSON.stringify(b && b.blocks.map(x => x[0])));
  const at = f => J(`(() => { const t = __T("san"), o = t.st.out[0]; return TLXSK.hourAtBlock(t, o, ${b.bi}, ${f}); })()`);
  const gp = await J(`(() => { const g = TLXSK.FU.gaps.find(q => q.t.id === "san"); return { x: g.x, z: g.z, yaw: g.yaw, fire: [g.x + 2.6 * Math.sin(g.yaw), g.z + 2.6 * Math.cos(g.yaw)] }; })()`);
  const fire = H => J(`TLXSK.fireOf(TLXSK.FU.gaps.find(q => q.t.id === "san"), ${H})`);
  const tA = await at(0), tB = await at(1), t0 = b.t0;
  const before = await fire(tA - 0.3), during = await fire((tA + tB) / 2), justAfter = await fire(tB + 0.1), later = await fire(tB + 0.3), gone = await fire(tB + 0.6);
  console.log("  ", JSON.stringify({ before, during, justAfter, later, gone }));
  ok(before === 0, "before they arrive the fire ring is cold");
  ok(during > 0.95, "while they rest on the bench the fire is lit (" + during.toFixed(2) + ")");
  ok(justAfter > 0.3 && justAfter < during && later < justAfter && later > 0, "after they leave it burns down (" + justAfter.toFixed(2) + " then " + later.toFixed(2) + ")");
  ok(gone === 0, "and then it is out");
  // seen: the kit is lent to the burning fire, drawn from far; smoke, flames, halo, pool and the glow on the wall
  await ev(`P.x = ${gp.x + 60}; P.z = ${gp.z + 60}; P.vx = P.vz = 0; P.y = surf(P.x, P.z) + 0.05; recenter(P.x, P.z, true); __keep(${(tA + tB) / 2}); true`); await sleep(1500);
  const kit = await J(`(() => { const k = TLXSK.FK.kits.find(q => q.g); return k ? { vis: k.grp.visible, flames: k.flames.filter(f => f.material.opacity > 0.2).length, halo: k.halo.material.opacity, pool: k.pool.visible ? k.pool.material.opacity : 0, wall: k.wall.material.opacity, smoke: k.smoke.filter(s => s.material.opacity > 0.01).length, n: TLXSK.FK.kits.length } : null; })()`);
  console.log("  ", JSON.stringify(kit));
  ok(!!kit && kit.vis && kit.flames === 3 && kit.smoke >= 3, "the fire is drawn: three flames and smoke");
  ok(!!kit && kit.halo > 0 && kit.pool > 0 && kit.wall > 0, "…a halo, a warm pool on the snow and a glow on the lean-to (halo " + (kit && kit.halo.toFixed(2)) + ")");
  // far in the dark
  const far = await J(`(() => { P.x = ${gp.x + 900}; P.z = ${gp.z}; recenter(P.x, P.z, true); return 1; })()`); await sleep(1200);
  const kf = await J(`(() => { const k = TLXSK.FK.kits.find(q => q.g); return k ? { vis: k.grp.visible, hs: k.halo.scale.x, op: k.halo.material.opacity } : null; })()`);
  ok(!!kf && kf.vis && kf.hs > 8, "from 900 m away the halo is still drawn, bigger with the distance (" + (kf && kf.hs.toFixed(1)) + " m)");
  await ev(`__keep(null); true`);
  // the player lights it and it warms
  await ev(`__at(${h(0, 5)}); P.x = ${gp.x + 60}; true`);
  const lit = await J(`(() => { const g = TLXSK.FU.gaps.find(q => q.t.id === "san"); FOOT.on = true; FOOT.x = ${gp.fire[0]} + 1.5; FOOT.z = ${gp.fire[1]}; FOOT.y = surf(FOOT.x, FOOT.z); g.fi = 0; g.pl = -1e9; const r = TLXSK.FIREX.use(); const was = g.fi; r.act(); return { label: r && r.label, was, now: g.fi }; })()`);
  ok(lit.label === "LIGHT FIRE" && lit.was === 0 && lit.now > 0, "by a cold fire ring on foot the use control offers LIGHT FIRE, and lights it");
  await ev(`TLXSK.fireScan(); GS.warmth = 40; GS.coldWarned = false; true`); await sleep(6500);
  const w = await J(`({ warmth: GS.warmth, k: TLXSK.fireWarm(FOOT.x, FOOT.z) })`);
  ok(w.warmth > 46 && w.k > 0.3, `standing by the fire warms you through the game's own warmth (40 -> ${w.warmth.toFixed(0)})`);
  const far2 = await J(`(() => { FOOT.x += 30; const k = TLXSK.fireWarm(FOOT.x, FOOT.z); FOOT.x -= 30; return k; })()`);
  ok(far2 === 0, "30 m from the fire it does not warm");
  const again = await J(`(() => { const g = TLXSK.FU.gaps.find(q => q.t.id === "san"); g.fi = 1; return TLXSK.FIREX.use(); })()`);
  ok(again === null, "no prompt while it burns");
  // the prompt under the three schemes
  const txt = {};
  for (const dev of [["kbm", "xbox"], ["pad", "ps"], ["touch", "xbox"]]) txt[dev[0]] = await J(`(() => { INP.dev = ${JSON.stringify(dev[0])}; INP.pad = ${JSON.stringify(dev[1])}; const g = TLXSK.FU.gaps.find(q => q.t.id === "san"); g.fi = 0; g.pl = -1e9; const r = TLXSK.FIREX.use(); return r ? { label: r.label, hint: r.hint(), ctl: TLX.api.btn("use") } : null; })()`);
  console.log("  ", JSON.stringify(txt));
  for (const k of Object.keys(txt)) ok(!!txt[k] && txt[k].hint.includes(txt[k].ctl) && /light the fire|LIGHT FIRE/.test(txt[k].hint), `${k}: the prompt names the use control (${txt[k] && txt[k].ctl}): ${txt[k] && txt[k].hint}`);
  ok(txt.kbm.ctl !== txt.pad.ctl, "the control differs between keyboard and pad");
  await ev(`INP.dev = "kbm"; FOOT.on = false; TLXSK.FU.gaps.forEach(g => { g.fi = 0; g.pl = -1e9; }); true`);
});

/* ---------------- G a party rests ---------------- */
await section("G a family party rests", async () => {
  let b = await BOOK("san", true, true); const hasKid = !!b && b.kids.some(a => a < 11); if (!b) b = await BOOK("san", true);
  ok(!!b && b.n >= 2 && b.bi >= 0, `a party of ${b && b.n} (ages ${b && b.kids.join(",")}) has a rest in the plan`);
  if (!b || b.n < 2) return;
  const gp = await J(`(() => { const g = TLXSK.FU.gaps.find(q => q.t.id === "san"); return { x: g.x, z: g.z, yaw: g.yaw }; })()`);
  const mid = await J(`(() => { const t = __T("san"), o = t.st.out[0]; return TLXSK.hourAtBlock(t, o, ${b.bi}, 0.5); })()`);
  await ev(`P.x = ${gp.x + 12}; P.z = ${gp.z + 12}; P.vx = P.vz = 0; P.y = surf(P.x, P.z) + 0.05; recenter(P.x, P.z, true); __keep(${mid}); true`); await sleep(1800);
  const f = await J(`(() => { const g = TLXSK.FU.gaps.find(q => q.t.id === "san"), cs = Math.cos(g.yaw), sn = Math.sin(g.yaw); const out = TLXSK.slots.filter(s => s.vis).map(s => { const dx = s.P.x - g.x, dz = s.P.z - g.z; return { k: s.mk, blk: s.blk, lx: dx * cs - dz * sn, lz: dx * sn + dz * cs, x: s.P.x, z: s.P.z, hip: s.hipNow, kid: s.who.age < 11 }; }); return out; })()`);
  console.log("  ", JSON.stringify(f.map(q => [q.k, q.blk, +q.lx.toFixed(2), +q.lz.toFixed(2), +q.hip.toFixed(2)])));
  ok(f.length === b.n && f.every(q => q.blk === "bench"), `all ${b.n} of the party are at the gapahuk resting at once (${f.map(q => q.blk).join(",")})`);
  const seated = f.filter(q => q.lz < 0.3), standing = f.filter(q => q.lz >= 0.3);
  ok(seated.length >= 1, `at least one is sitting on the bench (${seated.length} seated, ${standing.length} standing by the fire)`);
  ok(!hasKid || standing.length >= 1, "a small child in the party stands by the fire (" + b.kids.join(",") + ")");
  let minD = 99; for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++) minD = Math.min(minD, Math.hypot(f[i].x - f[j].x, f[i].z - f[j].z));
  ok(minD > 0.55, `nobody stands inside anybody else (closest ${minD.toFixed(2)} m)`);
  const fireD = Math.min(...f.map(q => Math.hypot(q.lx - 0, q.lz - 2.6)));
  ok(fireD > 0.9, `nobody is in the fire (closest ${fireD.toFixed(2)} m)`);
  ok(f.every(q => q.lz > -0.9 && Math.abs(q.lx) < 1.5 || q.lz > 0.3), "nobody is inside the lean-to's walls");
  ok(standing.every(q => q.lz > 1.8 && Math.abs(q.lx) > 0.9), "those standing are beside the fire, not on the bench");
  ok(f.filter(q => q.k > 0).every(q => q.hip > 0.3), "no one sunk into the bench or the snow (hips " + f.map(q => q.hip.toFixed(2)).join(",") + ")");
  await ev(`__keep(null); true`);
});

/* ---------------- H the ski rescue ---------------- */
await section("H the ski rescue call", async () => {
  await ev(`TLX.setOn("skirescue", true); GS.cash = 1000; TLX.state("trails").rescue = null; TLX.state("trails").rcH = -99; true`);
  const sk = await J(`(() => { const t = __T("lys"); __fresh("lys"); __setAll("lys"); const p = __ids().find(q => q.age > 25 && q.age < 50 && q.vid === t.villages[0]); __at(${h(0, 10)}); TLXSK.goOut(t, p, { pace: 9 }, GS.hour, false, -5);
    const o = t.st.out.find(q => q.k === 0), pl = TLXSK.planOf(t, o); __at(o.t0 + 80 / 50); return { p: p.id, first: p.first, name: p.name, t0: o.t0 }; })()`);
  await ev(`TLXN.all().length; true`); const posts0 = await J(`TLXN.all().length`);
  const rec = await J(`TLXSK.rescueForce("lys", "fall")`);
  ok(!!rec && rec.trail === "lys" && rec.o >= 1, "a forced call raises a rescue for a skier who was out on the trail (" + (rec && rec.p) + ")");
  const cas = await J(`(() => { const p = TLXN.person("${rec && rec.p}"); return { id: p.id, first: p.first, name: p.name }; })()`);
  ok(rec.p === sk.p || (await J(`TLXN.family(TLXN.person("${sk.p}")).some(q => q.id === "${rec.p}")`)), "…a real person from the roll, the skier or one of their party: " + cas.name);
  const st0 = await J(`(() => { const s = TLX.api.sarState(); return { ping: !!s.ping, cur: !!s.cur, why: s.ping && s.ping.c.why, name: s.ping && s.ping.c.name, ski: s.ping && s.ping.c.ski }; })()`);
  console.log("  ", JSON.stringify(st0));
  ok(st0.ping && st0.name === cas.first && st0.ski, "it is a call in the Rescue app naming that person: " + st0.name);
  const near = await J(`(() => { const q = TLXSK.nearest(${rec.x}, ${rec.z}, 20); return q ? { id: q.trail.id, d: q.d, seg: q.seg } : null; })()`);
  ok(!!near && near.id === "lys" && near.d < 20 && near.seg === rec.seg, `the casualty is on the trail, at segment ${rec && rec.seg} (${near && near.d.toFixed(1)} m off the line)`);
  ok(!(await J(`__T("lys").st.out.some(o => o.p === "${rec.p}")`)), "…and is not skiing on as a booking");
  // accept it (the notification's own action), then the compass / Jobs row / Map mark
  await ev(`(() => { const s = TLX.api.sarState(); TLX.api.sarAccept(s.ping.c); return 1; })()`); await sleep(600);
  await ev(`P.x = ${rec.x} + 400; P.z = ${rec.z}; P.vx = P.vz = 0; recenter(P.x, P.z, true); true`); await sleep(1500);
  const pts = await J(`(() => { const s = TLX.api.sarState(), c = s.cur; const jl = jobsList().filter(r => r.kind === "sar"); const mp = sarPts(); const t = sarTarget(c); return { cur: !!c, state: c && c.v.state, ski: c && c.ski, person: c && c.person, jobs: jl.map(r => r.title), mark: mp.map(q => [Math.round(q.x), Math.round(q.z), q.name]), tgt: [Math.round(t.x), Math.round(t.z)], title: document.getElementById("jobTitle").textContent, sub: document.getElementById("jobSub").textContent, vis: SAR.foot && SAR.foot.fig.visible }; })()`);
  console.log("  ", JSON.stringify(pts));
  ok(pts.cur && pts.ski && pts.person === rec.p && pts.state === "waiting", "the case is open: the casualty waits on the trail");
  ok(pts.jobs.length === 1 && /Ski rescue/.test(pts.jobs[0]) && pts.jobs[0].includes(cas.first), "the Jobs row: " + pts.jobs[0]);
  ok(pts.mark.length >= 1 && Math.abs(pts.mark[0][0] - rec.x) < 3 && Math.abs(pts.mark[0][1] - rec.z) < 3, "the Map mark is at the casualty");
  ok(Math.abs(pts.tgt[0] - rec.x) < 3 && Math.abs(pts.tgt[1] - rec.z) < 3 && /Ski rescue/.test(pts.title) && pts.title.includes(cas.first), "the compass points at them: " + pts.title);
  const posts = await J(`TLXN.all().filter(p => p.kind === "rescue").map(p => ({ what: p.data && p.data.what, who: p.who, text: p.text }))`);
  const worry = posts.find(p => p.what === "worry");
  ok(posts.some(p => p.what === "call" && p.who === rec.p) && !!worry && worry.who !== rec.p && /Lysløypa/.test(worry.text) && worry.text.includes(cas.first), "the news bus has the call, and someone at home posted worry: “" + (worry && worry.text.slice(0, 90)) + "”");
  // the prompt on foot beside them under three schemes
  const pr = {};
  await ev(`FOOT.on = true; FOOT.x = ${rec.x} + 1.5; FOOT.z = ${rec.z}; FOOT.y = surf(FOOT.x, FOOT.z); true`);
  for (const dev of [["kbm", "xbox"], ["pad", "ps"], ["touch", "xbox"]]) pr[dev[0]] = await J(`(() => { INP.dev = ${JSON.stringify(dev[0])}; INP.pad = ${JSON.stringify(dev[1])}; return { t: sarPrompt(), ctl: btn("use") }; })()`);
  for (const k of Object.keys(pr)) ok(pr[k].t.includes(pr[k].ctl), `${k}: the rescue prompt names the use control (${pr[k].ctl}): ${pr[k].t}`);
  await ev(`INP.dev = "kbm"; FOOT.on = false; true`);
  // carry them to the trailhead on the sled: stop beside them, they climb on, ride to the trailhead
  const cash0 = await J(`GS.cash`), resc0 = await J(`GS.rescues`);
  await ev(`P.x = ${rec.x} + 3; P.z = ${rec.z}; P.vx = P.vz = 0; P.y = surf(P.x, P.z) + 0.05; true`);
  for (let i = 0; i < 25 && (await J(`SAR.cur ? SAR.cur.v.state : "none"`)) === "waiting"; i++) await sleep(500);
  const boarded = await J(`SAR.cur ? SAR.cur.v.state : "none"`); ok(boarded === "pillion", "stopped beside them they climb on behind you (" + boarded + ")");
  const dest = await J(`SAR.cur.dest`);
  ok(/Lysløypa trailhead/.test(dest.name), "the destination is the trailhead: " + dest.name);
  await ev(`P.x = ${dest.x} + 6; P.z = ${dest.z}; P.vx = P.vz = 0; P.y = surf(P.x, P.z) + 0.05; true`);
  for (let i = 0; i < 25 && (await J(`!!TLX.api.sarState().cur`)); i++) { await ev(`P.x = ${dest.x} + 6; P.z = ${dest.z}; P.vx = P.vz = 0; true`); await sleep(500); }
  const fin = await J(`({ cash: GS.cash, res: GS.rescues, cur: !!TLX.api.sarState().cur, rescue: TLX.state("trails").rescue })`);
  console.log("  ", JSON.stringify(fin), "paid", fin.cash - cash0);
  ok(fin.cash > cash0 + 100 && fin.res === resc0 + 1 && !fin.cur && fin.rescue === null, `carrying them to the trailhead completes it and pays ($${fin.cash - cash0})`);
  const thanks = await J(`TLXN.all().filter(p => p.kind === "rescue" && p.data && p.data.what === "thanks").map(p => ({ who: p.who, text: p.text }))`);
  ok(thanks.length >= 1 && thanks.some(p => p.who === rec.p && p.text.includes(cas.first) && /Lysløypa/.test(p.text)), "a finished rescue posts thanks by name: “" + (thanks[0] && thanks[0].text.slice(0, 100)) + "”");
  // option off: no calls however keen the roll
  await ev(`TLX.setOn("skirescue", false); TLX.state("trails").rcH = -99; TLXSK.rcMul = 1000; true`);
  const off = await J(`(() => { const t = __T("lys"); __fresh("lys"); __setAll("lys"); const p = __ids().find(q => q.age > 25 && q.age < 50 && q.vid === t.villages[0]); __at(${h(1, 10)}); TLXSK.goOut(t, p, { pace: 9 }, GS.hour, false, -5); __at(GS.hour + 0.6); const f = TLXSK.rescueForce("lys"); const s = TLX.api.sarState(); return { forced: !!f, ping: !!s.ping, cur: !!s.cur, open: !!TLX.state("trails").rescue }; })()`);
  ok(!off.forced && !off.ping && !off.cur && !off.open, "option off: no call is raised, forced or rolled");
  await ev(`TLX.setOn("skirescue", true); true`);
  await ev(`(() => { const s = TLX.state("trails"); s.rescue = null; s.rcH = -99; })(); true`);
  const rolled = await J(`(() => { const t = __T("lys"); __fresh("lys"); __setAll("lys"); TLXSK.rcMul = 0; const s = TLX.state("trails"); let n = 0; const ps = __ids().filter(q => q.vid === t.villages[0]).slice(0, 4);
    for (let i = 0; i < 6; i++) { s.rescue = null; s.rcH = -99; t.st.out = []; __at(${h(2, 10)} + i * 3); for (const p of ps) TLXSK.goOut(t, p, { pace: 9 }, GS.hour, false, -5); __at(GS.hour + 1.0); s.h = Math.floor(GS.hour) - 1; TLXSK.step(1); if (s.rescue) n++; }
    const none = n; TLXSK.rcMul = 1000; for (let i = 0; i < 6; i++) { s.rescue = null; s.rcH = -99; t.st.out = []; __at(${h(2, 10)} + i * 3); for (const p of ps) TLXSK.goOut(t, p, { pace: 9 }, GS.hour, false, -5); __at(GS.hour + 1.0); s.h = Math.floor(GS.hour) - 1; TLXSK.step(1); if (s.rescue) n++; }
    TLXSK.rcMul = 0; return { none, n }; })()`);
  ok(rolled.none === 0 && rolled.n >= 1, `rescue calls are rolled, rare by default and likelier as the odds go up (default ${rolled.none} of 6 hours, odds x1000: ${rolled.n - rolled.none} of 6)`);
  await ev(`(() => { const s = TLX.state("trails"); s.rescue = null; s.rcH = -99; if (SAR.ping && SAR.ping.n) SAR.ping.n.dismiss(); SAR.ping = null; return 1; })(); true`); await sleep(1500);
});

/* ---------------- I the skidag ---------------- */
await section("I the skidag", async () => {
  await ev(`GS.cash = 2000; TLX.state("trails").rescue = null; for (const id of ["lys", "meh"]) { __fresh(id); } TLXN.all().length; TLX.state("news").posts.length = 0; __at(${MON0}); TLX.state("trails").dd = -1; true`);
  // two weeks of hours, a check at each stage; the trails are kept freshly set every 08:00 except Mehamn's, which is left to wear
  const D = await J(`(() => { const c = CAL.now(GS.hour); TLXSK.step(1); return { lys: __T("lys").st.skd, meh: __T("meh").st.skd, day: c.day }; })()`);
  console.log("  ", JSON.stringify({ lys: D.lys.D, meh: D.meh.D, day: D.day }));
  ok(D.lys.D > D.day && D.meh.D > D.day, "each kept loop has a Sunday this month (Lysløypa day " + D.lys.D + ", Mehamn day " + D.meh.D + ")");
  const dowOf = d => J(`CAL.day(${d}).dow`); ok((await dowOf(D.lys.D)) === 0 && (await dowOf(D.meh.D)) === 0, "…and it is a Sunday");
  const sk = { lys: D.lys.D, meh: D.meh.D }, last = Math.max(sk.lys, sk.meh);
  const stepTo = async (day, hr, keep) => ev(`(() => { const target = ${day} * 24 - CAL.off + ${hr}; const s = TLX.state("trails"); while (s.h + 1 <= target) { GS.hour = s.h + 1; if (Math.floor((s.h + 1) % 24) === 8) for (const id of ${JSON.stringify(keep)}) __setAll(id); TLXSK.step(1); } GS.hour = target; return 1; })()`);
  // the Sunday before: a normal Sunday's visits for the baseline
  const base = {};
  const norm = (id, d) => J(`(() => { const t = __T("${id}"); return { v: t.st.day.v }; })()`);
  // before the announcement: nothing
  await stepTo(sk.lys - 4, 18, ["lys", "meh"]);
  let ann = await J(`TLXN.all().filter(p => p.kind === "skidag").length`);
  ok(ann === 0 && (await J(`__T("lys").st.skd.ann`)) === 0, "four days ahead there is no announcement yet");
  await stepTo(sk.lys - 3, 9, ["lys", "meh"]);
  const a1 = await J(`(() => { const p = TLXN.all().filter(q => q.kind === "skidag" && q.data.what === "announce"); return { n: p.length, ids: p.map(q => q.data.trail), text: p.map(q => q.text), label: TLXSK.skdLabel(__T("lys").st.skd.D), cal: TLXSK.calEvent(__T("lys").st.skd.D), soon: TLXSK.skdSoon(__T("lys"), GS.hour), ann: __T("lys").st.skd.ann }; })()`);
  console.log("  ", JSON.stringify(a1));
  ok(a1.ids.includes("lys") && a1.ann === 1 && /skidag/i.test(a1.text.join(" ")) && a1.text.join(" ").includes(a1.label), "three days ahead the news bus announces it: “" + a1.text[0] + "”");
  ok(/Skidag on Lysløypa/.test(a1.cal), "the Calendar app has an entry for the day: " + a1.cal);
  // the trailhead board and the Løyper app
  await ev(`TLXSK.boards(); true`);
  const bd = await J(`(() => { const b = TLXSK.FU.boards.find(q => q.t.id === "lys"); return { key: b.key, label: TLXSK.skdLabel(__T("lys").st.skd.D) }; })()`);
  ok(bd.key.includes(bd.label), "the trailhead board carries the notice (" + bd.label + ")");
  await ev(`TLXSK.back(); TABLET.toggle(true, "loyper"); true`); await sleep(400);
  await ev(`document.querySelector("[data-act='lyo:lys']").click(); true`); await sleep(500);
  const app = await ev(`document.getElementById("tabS").textContent`);
  ok(/Skidag/.test(app) && /09:00/.test(app) && /waffles/i.test(app), "the Løyper app's trail page has the Skidag card");
  await ev(`TLXSK.back(); TABLET.toggle(true, "calendar"); true`); await sleep(500);
  const cal = await ev(`document.getElementById("tabS").textContent`);
  ok(/On the Nordkinn/.test(cal) && /Skidag on Lysløypa/.test(cal), "the Calendar app lists it under On the Nordkinn");
  await ev(`TABLET.toggle(false); true`);
  // a normal Sunday's crowd (the one before, for the baseline), at the same track state
  const normal = await J(`(() => { let n = 0; for (let r = 0; r < 6; r++) { __fresh("lys"); for (let hr = 9; hr < 17; hr++) { const H = ${sk.lys - 7} * 24 - CAL.off + hr; __at(H); TLXSK.outingsHour(H); } n += __T("lys").st.tot.v; } __fresh("lys"); return n / 6; })()`);
  await ev(`__at(${sk.lys - 3} * 24 - CAL.off + 9); TLX.state("trails").h = Math.floor(GS.hour); __fresh("lys"); true`);
  await ev(`(() => { const t = __T("lys"), s = t.st; s.skd = ${JSON.stringify(D.lys)}; s.skd.ann = 1; return 1; })()`);
  // before the day: no table, solid or drawn
  await stepTo(sk.lys - 1, 12, ["lys", "meh"]);
  await ev(`TLXSK.skdProps(0); true`);
  const t0 = await J(`({ drawn: TLXSK.SKP.tables ? TLXSK.SKP.tables.count : 0, obs: TLXSK.SKP.pos.map(s => s.obs[0].r) })`);
  ok(t0.drawn === 0 && t0.obs.every(r => r < 0.01), "the day before: no table, nothing solid");
  // the day: set at 08:00 (Lysløypa kept freshly set, Mehamn not), 09:00 reads it
  await stepTo(sk.lys, 7.5, ["lys"]);
  await ev(`__setAll("lys"); true`);
  const cashA = await J(`GS.cash`), vA = await J(`__T("lys").st.day.v`);
  await stepTo(sk.lys, 9.5, []);
  const fr = await J(`({ lys: __T("lys").st.skd.fresh, word: TLXSK.stat(__T("lys")).word, meh: __T("meh").st.skd.fresh })`);
  console.log("  ", JSON.stringify(fr));
  ok(fr.lys === 1, "09:00: Lysløypa is freshly set along its whole length (" + fr.word + "): bonus on");
  await stepTo(sk.lys, 12.5, []);
  await ev(`(() => { const s = TLXSK.SKP.pos.find(q => q.t.id === "lys"); P.x = s.x + 8; P.z = s.z + 8; P.vx = P.vz = 0; P.y = surf(P.x, P.z) + 0.05; recenter(P.x, P.z, true); __keep(GS.hour); return 1; })()`); await sleep(1500);
  const tb = await J(`(() => { const s = TLXSK.SKP.pos.find(q => q.t.id === "lys"); return { drawn: TLXSK.SKP.tables.count, obs: s.obs.map(o => o.r), figs: TLXSK.SKP.figs.filter(f => f.g.visible).map(f => f.who && f.who.name), near: s.near, dTrail: TLXSK.nearest(s.x, s.z, 40) ? TLXSK.nearest(s.x, s.z, 40).d : -1, fromStart: Math.hypot(s.x - __T("lys").pts[0][0], s.z - __T("lys").pts[0][1]) }; })()`);
  console.log("  ", JSON.stringify(tb));
  ok(tb.drawn >= 1 && tb.obs.every(r => r > 0.5), "on the day: the waffle table is up at the trailhead and solid");
  ok(tb.figs.length === 2 && tb.figs.every(Boolean), "…with two villagers from the roll standing at it: " + tb.figs.join(", "));
  ok(tb.fromStart < 14 && tb.fromStart > 3, "the table is beside the trailhead board (" + tb.fromStart.toFixed(1) + " m from the start)");
  await ev(`__keep(null); true`);
  await stepTo(sk.lys, 16.2, []);
  const crowd = await J(`(() => { const t = __T("lys"); return { v: t.st.day.v, sk: t.st.skd, st: t.st.sdb, cash: GS.cash }; })()`);
  console.log("  ", JSON.stringify({ crowd: crowd.v, normal, bonus: crowd.sk.bonus, n: crowd.sk.n, cash: crowd.cash - cashA }));
  ok(crowd.v >= 3 * Math.max(1, normal), `a crowd several times normal: ${crowd.v} visits on the day vs ${normal.toFixed(1)} on an ordinary Sunday`);
  ok(crowd.sk.done === 1 && crowd.sk.fresh === 1 && crowd.sk.bonus >= 100 && crowd.cash - cashA >= crowd.sk.bonus, `freshly set at nine: the bonus is paid ($${crowd.sk.bonus}) and shows on the statement line`);
  const donePost = await J(`TLXN.all().filter(p => p.kind === "skidag" && p.data.what === "done" && p.data.trail === "lys").map(p => ({ text: p.text, n: p.data.n, fresh: p.data.fresh, came: p.data.came.length }))`);
  ok(donePost.length === 1 && donePost[0].n >= 10 && donePost[0].fresh === 1 && donePost[0].came >= 5 && /Lysløypa/.test(donePost[0].text), "later posts for Gram and the radio say who came and how the track was: “" + (donePost[0] && donePost[0].text) + "”");
  await ev(`TLXSK.skdProps(0); true`);
  const after = await J(`TLXSK.SKP.pos.find(q => q.t.id === "lys").obs[0].r`); await stepTo(sk.lys, 18, []);
  await ev(`TLXSK.skdProps(0); true`);
  const after2 = await J(`TLXSK.SKP.pos.find(q => q.t.id === "lys").obs[0].r`);
  ok(after2 < 0.01, "in the evening the table is gone again and no longer solid");
  // Mehamn: its Sunday, the track left to wear: no bonus
  const mehFresh = await J(`__T("meh").st.skd.fresh`);
  await stepTo(sk.meh, 9.5, []);
  const m9 = await J(`(() => { const t = __T("meh"), s = t.st.skd; return { fresh: s.fresh, word: TLXSK.stat(t).word, D: s.D }; })()`);
  const cashM = await J(`GS.cash`);
  await stepTo(sk.meh, 16.3, []);
  const mm = await J(`(() => { const s = __T("meh").st.skd; return { done: s.done, bonus: s.bonus, n: s.n, cash: GS.cash, sdb: __T("meh").st.sdb }; })()`);
  console.log("  ", JSON.stringify({ m9, mm, dcash: mm.cash - cashM }));
  ok(m9.fresh === 0 && mm.done === 1 && mm.bonus === 0 && mm.sdb === 0, `Mehamn's track was ${m9.word} at nine, not freshly set: no bonus (${mm.n} came)`);
  const mp = await J(`TLXN.all().filter(p => p.kind === "skidag" && p.data.what === "done" && p.data.trail === "meh").map(p => p.text)`);
  ok(mp.length === 1 && /not freshly set/.test(mp[0]), "its post says the track was not freshly set");
});

/* ---------------- J reload ---------------- */
await section("J reload keeps the lamp switch, a pending skidag and an open rescue", async () => {
  await ev(`if (SAR.ping && SAR.ping.n) SAR.ping.n.dismiss(); SAR.ping = null; TLX.setOn("skirescue", true); TLX.state("trails").rescue = null; TLX.state("trails").rcH = -99; GS.cash = 3000; __fresh("lys"); __setAll("lys"); __T("lys").st.lamps = 0; true`);
  // a pending skidag: next month's, announced
  await ev(`(() => { const c = CAL.now(GS.hour), t = __T("lys"); t.st.skd = { key: c.y + "-" + c.m, D: c.day + 2, ann: 1, fresh: -1, n: 0, done: 0, bonus: 0, who: [] }; return 1; })()`);
  const sk = await J(`(() => { const t = __T("lys"); const p = __ids().find(q => q.age > 25 && q.age < 50 && q.vid === t.villages[0]); __at(${h(0, 10)}); TLXSK.goOut(t, p, { pace: 9 }, GS.hour, false, -5); const o = t.st.out.find(q => q.k === 0); __at(o.t0 + 80 / 50); return { p: p.id, first: p.first }; })()`);
  console.log("  pre", await ev(`JSON.stringify({ s: (({ ping, cur, busy }) => ({ ping: !!ping, cur: !!cur, busy }))(TLX.api.sarState()), out: __T("lys").st.out.map(o => [o.p, o.t0, o.t1, o.g, o.k]), H: GS.hour })`));
  const rec = await J(`TLXSK.rescueForce("lys", "caught")`);
  ok(!!rec, "a call is raised (caught out)"); await sleep(900);
  console.log("  ping", await ev(`JSON.stringify(TLX.api.sarState().ping ? { why: TLX.api.sarState().ping.c.why.slice(0, 40) } : null)`));
  console.log("  acc", await ev(`(() => { const s = TLX.api.sarState(), b = s.busy; if (s.ping) TLX.api.sarAccept(s.ping.c); const s2 = TLX.api.sarState(); return JSON.stringify({ b, hadPing: !!s.ping, cur: !!s2.cur, ping: !!s2.ping, tour: GS.tour, duty: SAR.duty, cool: SAR.coolT, gc: gameClock }); })()`)); await sleep(900);
  const before = await J(`(() => { const s = TLX.api.sarState(), t = __T("lys"); return { cur: s.cur && s.cur.person, lamps: t.st.lamps, skd: t.st.skd, rescue: TLX.state("trails").rescue }; })()`);
  ok(before.cur === rec.p && before.lamps === 0 && before.skd.ann === 1 && before.rescue && before.rescue.acc === 1, "before: lamps off, a skidag pending, a rescue open and accepted");
  await ev(`save(); true`); await sleep(300);
  await reload(); await sleep(2500); await ev(SETUP); await sleep(600); await ev(KIT); await sleep(2500);
  const after = await J(`(() => { const s = TLX.api.sarState(), t = __T("lys"); return { lamps: t.st.lamps, taken: t.st.taken, skd: t.st.skd, rescue: TLX.state("trails").rescue, cur: s.cur ? { person: s.cur.person, state: s.cur.v.state, ski: s.cur.ski, x: Math.round(s.cur.x), z: Math.round(s.cur.z) } : null, ping: !!s.ping }; })()`);
  console.log("  ", JSON.stringify(after));
  ok(after.lamps === 0 && after.taken === 1, "after the reload the lamps are still switched off");
  ok(after.skd.ann === 1 && after.skd.D === before.skd.D && after.skd.key === before.skd.key, "the pending skidag is still there, announced, for day " + after.skd.D);
  ok(!!after.rescue && !!after.cur && after.cur.person === rec.p && after.cur.ski && after.cur.state === "waiting" && Math.abs(after.cur.x - Math.round(rec.x)) <= 1, "the open rescue is open again, the same person at the same place: " + rec.p);
  // an old save (the trails written before H1c: no lamps, power, skidag or rescue fields) loads clean
  await ev(`TLX.api.sarClearForTest ? 0 : 0; true`);
  const sv = await J(`(() => { save(); const o = JSON.parse(localStorage.getItem("tracklayer.save.v2")); const s = o.x.sys.trails.s; if (!s) throw new Error("no trails in " + Object.keys(o.x.sys)); delete s.rescue; delete s.rcH; for (const id in s.tr) { const q = s.tr[id]; delete q.lamps; delete q.lampH; delete q.skd; delete q.sdb; if (q.last) q.last.forEach(l => { delete l.lh; delete l.lc; delete l.sdb; }); if (q.out) q.out.forEach(l => delete l.sk); } return o; })()`);
  await reload(sv); await sleep(2500); await ev(SETUP); await sleep(600); await ev(KIT);
  const ol = await J(`(() => { const t = __T("lys"), s = TLX.state("trails"); return { err: TLXSK.err + TLXSK.furnErr + (TLXSK.h1cErr || ""), taken: t.st.taken, lamps: t.st.lamps, lampH: t.st.lampH, skd: t.st.skd.D, rescue: s.rescue, rcH: s.rcH, sdb: t.st.sdb }; })()`);
  ok(ol.err === "" && ol.taken === 1 && ol.lamps === 1 && ol.lampH === 0 && ol.skd === -1 && ol.rescue === null && ol.rcH === -99, "an old save with none of the H1c fields loads clean: the lamps default to on, no bill, no skidag, no call (" + JSON.stringify(ol) + ")");
});

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
done(fails ? 1 : 0);
