// Expansion milestone 9: the four seasons (tlx-seasons.js). Asserts, exit 1 on a failure.
// Run: tools/playtest/run.sh tools/playtest/scenarios/x9_seasons.mjs
//  9.1 the snow-free look is one uniform + two material colours: winter untouched, summer green, autumn gold then bare,
//      frost on an autumn night and gone by day, no new meshes or shader programs, option off = base look
//  9.2 mud season: the roads soften in April/May (grip down, rolling up, a sled drags), the town's streets stay paved,
//      nothing in winter or with the option off
//  9.3 playable summer: 1 June is a normal day (day hooks run, Mondays fire), the skip works from any day and settles the
//      bills, dust and vehicle wear; 1 November after a played summer brings the winter back; option off = the base skip
//  9.4 the three light vehicles are in the table, buyable, behave differently, and parcels exist in summer
//  also: the Seasons app, the options, the save
import { boot, reload, ev, raw, sleep, done, down, up } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
// put the calendar on a date and hour without crossing a day change, and bring the melt (and so the world) to it
const at = async (y, m, d, h = 14, boot_ = true) => ev(`(() => { const D = Math.round((Date.UTC(${y}, ${m}, ${d}) - CAL_EPOCH) / 864e5); const k = Math.floor(GS.hour / 24); GS.hour = k * 24 + ${h}; CAL.off = (D - k) * 24; CAL.dc = null; CAL.lastDay = CAL.dayIndex(); ${boot_ ? "meltBoot();" : ""} if (TLX.seasons) TLX.seasons.dress(TLX.seasons.look()); return CAL.now().label; })()`);
const seasons = e => J(`(() => { const S = TLX.seasons; return ${e}; })()`);
const cardGone = async () => { for (let i = 0; i < 100; i++) { if (!(await ev(`SEASON.card`))) return true; await sleep(400); } return false; };
const frames = async n => { for (let i = 0; i < n; i++) await sleep(250); };

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 20000; true`); await sleep(800);

// ---------- 0: it is registered, saved, optional
let a = await J(`({ sys: !!TLX.state("seasons"), api: !!TLX.seasons, app: TABLET.apps ? !!TABLET.apps.seasons || !!TABLET.apps.find && !!TABLET.apps.find(q => q.id === "seasons") : null,
  opts: ["seasonlook", "mudseason", "playsummer", "summerwear", "atvs"].map(o => TLX.on(o)), rows: TLXV.VEHICLES.filter(d => d.opt === "atvs").map(d => d.id),
  scripts: [...document.scripts].map(s => s.getAttribute("src")).filter(Boolean).filter(s => /tlx-seasons/.test(s)), tint: !!TLX.api.season.tint, dump: Object.keys(TLX.dump().sys) })`);
console.log("0", JSON.stringify(a));
ok(a.sys && a.api && a.scripts.length === 1, "the seasons system is registered and its script loaded");
ok(a.opts.every(Boolean), "all five options exist and are on by default");
ok(a.rows.join() === "atv,sxs,cart" && a.tint, "the three vehicle rows and the tint uniform are there");
ok(a.dump.includes("seasons"), "state is written to the save under x.sys.seasons");

// ---------- 9.1 the look
const programs = () => ev(`renderer.info.programs.length`), kids = () => ev(`scene.children.length`);
const Lw = (await at(2027, 0, 15, 12), await seasons(`({ L: S.look(), tint: TLX.api.season.tint.value.toArray(), cap: TLX.api.season.trees.birch()[0].cap.material.color.toArray(), pcap: TLX.api.season.trees.pine()[0].cap.material.color.toArray() })`));
ok(Lw.L.phase === "winter" && Lw.L.snow > 0.95 && Lw.tint.every(v => Math.abs(v - 1) < 0.02), "January: winter, snow lying, the ground tint is neutral");
ok(Lw.cap.every(v => v > 0.97) && Lw.pcap.every(v => v > 0.97), "January: birch and pine caps are the snow's white");
await at(2027, 6, 15, 14); await frames(2);
const Ls = await seasons(`({ L: S.look(), tint: TLX.api.season.tint.value.toArray(), cap: TLX.api.season.trees.birch()[0].cap.material.color.toArray(), pcap: TLX.api.season.trees.pine()[0].cap.material.color.toArray(), melt: MELT.k })`);
console.log("summer", JSON.stringify(Ls));
ok(Ls.L.phase === "summer" && Ls.melt > 0.99 && Ls.L.snow < 0.05, "mid July: summer, the melt is complete");
ok(Ls.tint[1] > Ls.tint[0] * 1.2 && Ls.tint[1] > Ls.tint[2] * 1.2, "July: the heather and ground read green");
ok(Ls.cap[1] > Ls.cap[0] * 1.5 && Ls.cap[1] > Ls.cap[2] * 2, "July: the birches are in leaf (green caps)");
ok(Ls.pcap[1] > Ls.pcap[0] && Ls.pcap[0] < 0.4, "July: the pines are dark needles, no snow");
await at(2027, 8, 25, 14);
const Lg = await seasons(`({ tint: TLX.api.season.tint.value.toArray(), cap: TLX.api.season.trees.birch()[0].cap.material.color.toArray(), ph: S.look().phase })`);
ok(Lg.ph === "autumn" && Lg.cap[0] > Lg.cap[2] * 3 && Lg.cap[0] > Lg.cap[1], "25 Sept: autumn, the birches are gold");
ok(Lg.tint[0] > Lg.tint[1] && Lg.tint[1] > Lg.tint[2], "25 Sept: the heather is russet");
await at(2027, 9, 27, 14);
const Lb = await seasons(`({ cap: TLX.api.season.trees.birch()[0].cap.material.color.toArray() })`);
ok(Lb.cap[0] < 0.5 && Lb.cap[2] < 0.3, "27 Oct: the birches are bare again (dark brown buds)");
const fN = await at(2027, 9, 5, 4), frostN = await seasons(`({ f: S.look().frost, tint: TLX.api.season.tint.value.toArray() })`);
const frostD = (await at(2027, 9, 5, 14), await seasons(`({ f: S.look().frost, tint: TLX.api.season.tint.value.toArray() })`));
console.log("frost", JSON.stringify(frostN), JSON.stringify(frostD));
ok(frostN.f > 0.6 && frostD.f < 0.05, "5 Oct: hard frost at 04:00, none at 14:00");
ok(frostN.tint[2] > frostD.tint[2] + 0.1, "the frost lightens the ground at night (blue channel " + frostN.tint[2].toFixed(2) + " vs " + frostD.tint[2].toFixed(2) + ")");
// the cost: dress the world in eight different looks, a frame apart, twice. Nothing is added to the scene and the second
// round compiles no shader program (the first may meet the game's own lazy ones: a spark, a lake)
await at(2027, 6, 15, 14); await frames(4);
const LOOKS = [[0.85, 0.8, 0.75], [0.9, 1.3, 0.8], [1.5, 1.0, 0.6], [1.45, 1.5, 1.6], [1, 1, 1], [1.15, 0.95, 0.8], [0.5, 0.5, 0.5], [1.2, 1.1, 1]];
const sweep = async () => { for (const L of LOOKS) { await ev(`(() => { const S = TLX.seasons, l = S.look(); l.ground = ${JSON.stringify(L)}; l.birch = ${JSON.stringify(L.map(v => v * 0.6))}; l.pine = ${JSON.stringify(L.map(v => v * 0.3))}; l.snow = ${L[0] > 1.4 ? 1 : 0}; S.dress(l); return 1; })()`); await sleep(300); } };
await sweep(); await sleep(500);
const p0 = await programs();
await sweep(); await sleep(500);
const p1 = await programs();
const kSync = await J(`(() => { const S = TLX.seasons, n0 = scene.children.length; for (let i = 0; i < 40; i++) { const l = S.look(); l.ground = [1 + i / 40, 1, 1]; l.birch = [i / 40, 0.5, 0.2]; S.dress(l); } return [n0, scene.children.length]; })()`);
ok(kSync[0] === kSync[1], `the seasonal look adds no meshes (scene children ${kSync[0]} -> ${kSync[1]} over 40 dressings)`);
ok(p1 === p0, `and compiles no shader program (${p0} -> ${p1} over a second round of eight looks): it is a uniform and two material colours`);
// option off: the base look
await ev(`TLX.setOn("seasonlook", false); true`); await at(2027, 6, 15, 14); await frames(2);
a = await seasons(`({ tint: TLX.api.season.tint.value.toArray(), cap: TLX.api.season.trees.birch()[0].cap.material.color.toArray() })`);
ok(a.tint.every(v => Math.abs(v - 1) < 0.01) && a.cap.every(v => v > 0.97), "option seasonlook off: neutral ground, white caps (the base look)");
await ev(`TLX.setOn("seasonlook", true); true`);

// ---------- 9.2 mud
await at(2027, 3, 25, 15); await frames(3);
a = await J(`(() => { const S = TLX.seasons, D = TLX.api.world.depot, R = TLXR.routes;
  let road = null, off = null;
  for (const rt of R) for (const p of rt.pts) { const x = p[0] !== undefined ? p[0] : p.x, z = p[1] !== undefined ? p[1] : p.z; if (Math.hypot(x - D.x, z - D.z) > 400 && TLXR.onRoad(x, z)) { road = { x, z }; break; } if (road) break; }
  if (road) for (let r = 60; r < 300 && !off; r += 20) for (let t = 0; t < 6.28; t += 0.7) { const x = road.x + Math.cos(t) * r, z = road.z + Math.sin(t) * r; if (!TLXR.onRoad(x, z) && !TLX.api.world.isSea(x, z) && Math.hypot(x - D.x, z - D.z) > 300) { off = { x, z }; break; } }
  return { road, off, k: S.mudK(), mr: road ? S.mudAt(road.x, road.z) : -1, mo: off ? S.mudAt(off.x, off.z) : -1, town: S.mudAt(D.x + 20, D.z + 10),
    g: road ? S.gripAt(road.x, road.z) : 1, rl: road ? S.rollAt(road.x, road.z) : 1, date: CAL.now().label, rts: R.length }; })()`);
console.log("9.2", JSON.stringify(a));
ok(a.road && a.off, "found a village road away from the town and open ground beside it (" + a.rts + " routes)");
ok(a.k > 0.15, "25 April: mud season is on (" + a.k.toFixed(2) + ")");
ok(a.mr > a.mo && a.mo > 0, `the road is muddier than the ground beside it (${a.mr.toFixed(2)} vs ${a.mo.toFixed(2)})`);
ok(a.town === 0, "the depot town's streets are paved: no mud");
ok(a.g < 0.9 && a.rl > 1.15, `a truck on that road gets ${Math.round((1 - a.g) * 100)}% less grip and ${Math.round((a.rl - 1) * 100)}% more rolling resistance`);
// a sled drags on the mud road, not on the ground beside it, not in a mud-free week
const drag = async (pt, setup) => J(`(() => { ${setup || ""} FOOT.on = false; VEH.cur = null; P.x = ${pt.x}; P.z = ${pt.z}; P.vx = 0; P.vz = 12; const sys = TLX.systems.find(d => d.id === "seasons"); for (let i = 0; i < 10; i++) sys.tick(0.1); return Math.hypot(P.vx, P.vz); })()`);
const vRoad = await drag(a.road), vOff = await drag(a.off);
console.log("sled drag", vRoad, vOff);
ok(vRoad < vOff - 0.5, `a sled at 12 m/s keeps ${vRoad.toFixed(1)} m/s after a second on the mud road, ${vOff.toFixed(1)} on the open ground`);
await ev(`TLX.setOn("mudseason", false); true`); await sleep(1200);
a = await seasons(`({ k: S.mudK(), g: S.gripAt(${a.road.x}, ${a.road.z}) })`);
ok(a.k === 0 && a.g === 1, "option mudseason off: no mud, full grip");
await ev(`TLX.setOn("mudseason", true); true`);
await at(2027, 0, 20, 14); await sleep(700);
a = await seasons(`({ k: S.mudK() })`);
ok(a.k === 0, "January: no mud");
// a truck really feels it: the physics reads the factor (R.roll)
await at(2027, 3, 25, 15); await frames(2);
a = await J(`(() => { const S = TLX.seasons; TLXV.buy("pickup"); const u = TLXV.state().owned.find(r => r.id === "pickup"); return u ? u.uid : null; })()`);
ok(a, "bought the pickup to drive on the mud");
if (a) {
  const uid = a;
  const rd = await J(`(() => { const D = TLX.api.world.depot; for (const rt of TLXR.routes) for (const p of rt.pts) { const x = p[0] !== undefined ? p[0] : p.x, z = p[1] !== undefined ? p[1] : p.z; if (Math.hypot(x - D.x, z - D.z) > 400 && TLXR.onRoad(x, z)) return { x, z }; } return null; })()`);
  await ev(`(() => { TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; P.x = ${rd.x}; P.z = ${rd.z}; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(P.x, P.z, true); return 1; })()`);
  await sleep(1500);
  const mud = await J(`({ roll: TLXV.rt() ? TLXV.rt().roll : null, grip: TLXV.rt() ? TLXV.rt().grip : null, veh: !!VEH.cur })`);
  await at(2027, 0, 20, 14, false); await ev(`TLX.seasons.mudK(); true`); await sleep(1500);
  const win = await J(`({ roll: TLXV.rt() ? TLXV.rt().roll : null, grip: TLXV.rt() ? TLXV.rt().grip : null })`);
  console.log("truck", JSON.stringify(mud), JSON.stringify(win));
  ok(mud.veh && mud.roll > 1.1 && mud.grip < 0.95, `driving the pickup on the mud road: rolling x${(mud.roll || 0).toFixed(2)}, grip x${(mud.grip || 0).toFixed(2)}`);
  ok(win.roll === 1 && win.grip === 1, "the same road in January: rolling x1, grip x1");
}

// ---------- 9.3 playable summer
await ev(`TLXV.swapTo(null); FOOT.on = false; true`).catch(() => { });
await ev(`window.__mon9 = 0; window.__days9 = 0; TLX.register({ id: "t9", v: 1, state0: () => ({}), monday() { window.__mon9++; } }); CAL.onDayChange((n, prev) => { if (prev !== null) window.__days9++; }); true`);
await at(2027, 4, 31, 20, false); await frames(2);                       // 31 May, evening
await ev(`GS.hour += 5; true`); await sleep(1200);                          // over midnight into 1 June
a = await J(`({ lbl: CAL.now().label, m: CAL.now().m, played: TLX.state("seasons").played, days: window.__days9, card: SEASON.card, toasts: [...document.querySelectorAll("#toasts *")].map(e => e.textContent).join(" | ") })`);
console.log("9.3 june", JSON.stringify(a));
ok(a.m === 5 && a.played && !a.card, `1 June is a day you play (${a.lbl}), not a montage; the day hooks ran (${a.days})`);
// a week later the Monday settle-up reaches the systems
for (let i = 0; i < 8; i++) { await ev(`CAL.off += 24; true`); await sleep(350); }
a = await J(`({ lbl: CAL.now().label, m: CAL.now().m, mon: window.__mon9, played: TLX.state("seasons").played })`);
ok(a.m === 5 && a.mon >= 1 && a.played, `a Monday in June settles as in winter (${a.mon} Monday hook(s) by ${a.lbl})`);
// the Seasons app offers the skip
await ev(`TABLET.toggle(true, "seasons"); true`); await sleep(600);
const txt = await ev(`$("tabS").textContent`);
ok(/SKIP TO 1 NOVEMBER/i.test(txt) && /days to 1 November/i.test(txt), "the Seasons app shows the skip and the days to winter");
await ev(`TABLET.close(true); true`); await sleep(300);
// parcels exist in summer
a = await J(`(() => { makeJobs(depot); return { jobs: GS.jobs.length, work: meltWork() }; })()`);
ok(a.jobs > 0, `parcels are posted in summer (${a.jobs} jobs on the board, work x${a.work.toFixed(2)})`);
// the skip, from a day in the middle: set up what it should settle
await at(2027, 6, 20, 14, false); await frames(2);
const setup = await J(`(() => {
  SEASON.addBill({ name: "x9 test bill", perWeek: () => -100 });
  const pr = TLX.prop, P = pr.PROP; pr.allRooms = () => [{ key: "x9a", w: 0, k: 1 }, { key: "x9b", w: 1, k: 1 }];
  pr.rec("x9a").grit = 0; pr.rec("x9a").dust = 0; pr.rec("x9b").grit = 90; pr.rec("x9b").dust = 90;
  const v = TLXV.state().owned.find(r => r.id === "pickup"); v.cond = 100; v.x = TLX.api.world.depot.x + 900; v.z = TLX.api.world.depot.z + 900;
  GS.cash = 5000; const days = TLX.seasons.daysToNov(), prev = TLX.seasons.billsPreview(days);
  return { days, prev, cash: GS.cash, uid: v.uid, cur: TLXV.state().cur }; })()`);
console.log("skip setup", JSON.stringify(setup));
ok(setup.days > 100 && setup.prev.lines.some(l => l.name === "x9 test bill") && setup.prev.total < 0, `skip preview from 20 July: ${setup.days} days, bills ${setup.prev.total}`);
await ev(`FOOT.on = false; TLX.seasons.skipNow("test"); true`);
await sleep(800);
a = await J(`(() => { const pr = TLX.prop, v = TLXV.state().owned.find(r => r.uid === ${JSON.stringify(setup.uid)}); return { lbl: CAL.now().label, m: CAL.now().m, d: CAL.now().d, cash: GS.cash, a: pr.rec("x9a"), b: pr.rec("x9b"), cond: v.cond, played: TLX.state("seasons").played, st: TLX.seasons.stats(), card: SEASON.card, mk: MELT.kq }; })()`);
console.log("after skip", JSON.stringify(a));
ok(a.m === 10 && a.d === 1, `the skip lands on 1 November (${a.lbl})`);
ok(a.cash === setup.cash + setup.prev.total, `the bills of every skipped week were settled ($${setup.cash} -> $${a.cash}, expected ${setup.prev.total})`);
const gd = (await seasons(`S.WEAR`)), P_ = { gritDay: 6, dustDay: 4 };
ok(a.a.grit > 50 && a.a.dust > 50, `an unattended place gathered dust over the summer (grit ${a.a.grit.toFixed(0)}, dust ${a.a.dust.toFixed(0)})`);
ok(a.b.grit < 90 && a.b.dust < 90 && a.b.grit < a.a.grit, `a place with a caretaker was kept (grit ${a.b.grit.toFixed(0)}, dust ${a.b.dust.toFixed(0)})`);
const weeks = setup.days / 7;
ok(Math.abs((100 - a.cond) - gd.perWeek * weeks) < 0.2 && a.cond < 100, `a pickup left out all summer lost ${(100 - a.cond).toFixed(1)}% (${gd.perWeek}% x ${weeks.toFixed(1)} weeks)`);
ok(!a.played && a.st.skips === 1 && a.st.days === setup.days, "the skip is counted and the played flag is clear");
ok(a.mk === 0, "the world is refrozen after a skip");
await cardGone();                                                          // the montage card closes itself
// the vehicle near the garage wears less
a = await J(`(() => { const v = TLXV.state().owned.find(r => r.id === "pickup"); const g = TLX.api.world.garage(); v.cond = 100; v.x = g.x + 10; v.z = g.z; v.uid; return TLX.seasons.settleSkip(70), v.cond; })()`);
ok(a < 100 && 100 - a < gd.perWeek * 10 * 0.5, `parked at the garage it weathers less (${(100 - a).toFixed(1)}% over 10 weeks)`);
// option summerwear off: the skip settles only the bills
a = await J(`(() => { TLX.setOn("summerwear", false); const v = TLXV.state().owned.find(r => r.id === "pickup"); v.cond = 100; const o = TLX.seasons.settleSkip(70); TLX.setOn("summerwear", true); return { c: v.cond, o }; })()`);
ok(a.c === 100 && a.o.rooms === 0, "option summerwear off: no wear and no dust from a skip");

// the winter comes back on 1 November after a played summer
await at(2027, 9, 31, 20); await frames(2);
await ev(`TLX.state("seasons").played = true; true`);
const w0 = await seasons(`S.stats().winters`);
await ev(`GS.hour += 5; true`); await sleep(1500);
a = await J(`({ card: SEASON.card, ld: CAL.lastDay, di: CAL.dayIndex(), lbl: CAL.now().label, played: TLX.state("seasons").played, w: TLX.state("seasons").winters, kq: MELT.kq, snow: TLX.seasons.snowK() })`);
console.log("nov 1", JSON.stringify(a));
ok(a.lbl.includes("1 Nov") && !a.played && a.w === w0 + 1, `1 November after a played summer: winter returns (${a.lbl}, winters ${a.w})`);
ok(a.kq === 0 && a.snow > 0.95, "the world is refrozen: melt 0, snow back on the trees");

// option playsummer off: the base game's automatic skip on 1 June
await ev(`TLX.setOn("playsummer", false); true`);
await at(2028, 4, 31, 20); await frames(2);
const s0 = await seasons(`S.stats().skips`);
await ev(`GS.hour += 5; true`); await sleep(1500);
a = await J(`({ card: SEASON.card, ld: CAL.lastDay, di: CAL.dayIndex(), m: CAL.now().m, d: CAL.now().d, skips: TLX.state("seasons").skips, played: TLX.state("seasons").played })`);
ok(a.m === 10 && a.d === 1 && a.skips === s0 + 1 && !a.played, `option playsummer off: 1 June skips to 1 November by itself (month ${a.m}, skips ${a.skips})`);
await cardGone();
await ev(`TLX.setOn("playsummer", true); true`);

// ---------- 9.4 the vehicles
await at(2028, 6, 10, 14); await frames(2);
a = await J(`(() => {
  const out = {}; GS.cash = 30000; TLXV.state().owned = [];
  for (const id of ["atv", "sxs", "cart"]) { const c0 = GS.cash; TLXV.buy(id); out[id] = { paid: c0 - GS.cash, owned: TLXV.state().owned.filter(r => r.id === id).length }; }
  out.cash = GS.cash; out.trucks = TLXV.state().owned.length; return out; })()`);
console.log("9.4 buy", JSON.stringify(a));
ok(a.atv.paid === 3400 && a.sxs.paid === 7800 && a.cart.paid === 1900 && a.trucks === 3, "buying charges the table's price for each of the three");
// they have their own numbers
a = await J(`(() => { const d = id => TLXV.VEHICLES.find(v => v.id === id); const p = d("pickup"); return { atv: d("atv"), sxs: d("sxs"), cart: d("cart"), p: { mass: p.mass, top: p.top, mu: p.mu.loose } }; })()`);
ok(a.atv.mass < a.p.mass / 3 && a.atv.mu.loose > a.p.mu && a.cart.top < 10 && a.sxs.slots > a.atv.slots && a.atv.slots > a.cart.slots, "light, grippier, a slow cart, more room in the side-by-side: each row has its own numbers");
// and they drive: full throttle on bare summer ground, the ATV outruns the cart
const drive = async id => {
  const uid = await J(`(() => { const r = TLXV.state().owned.find(r => r.id === ${JSON.stringify(id)}); return r ? r.uid : null; })()`); if (!uid) return null;
  await ev(`(() => { TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; const D = TLX.api.world.depot; let best = null; for (let r = 150; r < 900 && !best; r += 30) for (let t = 0; t < 6.28; t += 0.4) { const x = D.x + Math.cos(t) * r, z = D.z + Math.sin(t) * r; if (TLX.api.world.isSea(x, z) || TLX.api.world.isWater(x, z) || TLX.api.world.obNear(x, z, 40) || TLX.api.world.slopeAt(x, z, 8) > 0.04) continue; best = { x, z }; break; }
    P.x = best.x; P.z = best.z; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = P.vy = 0; P.yaw = 0; BOG.on = false; recenter(P.x, P.z, true); camState.init = false; window.__thr = true; return 1; })()`);
  await down("KeyW");
  const t0 = +(await ev("gameClock")); while (+(await ev("gameClock")) - t0 < 7) await sleep(150);
  const r = await J(`({ v: Math.hypot(P.vx, P.vz), veh: !!VEH.cur, name: VEH.cur && VEH.cur.noun })`);
  await up("KeyW");
  return r;
};
const vA = await drive("atv"), vC = await drive("cart");
console.log("drive", JSON.stringify(vA), JSON.stringify(vC));
ok(vA && vC && vA.veh && vC.veh, "the four-wheeler and the cart can each be driven");
ok(vA && vC && vA.v > 12 && vC.v < 10 && vA.v > vC.v * 1.8, `on bare ground the four-wheeler reaches ${vA && vA.v.toFixed(1)} m/s, the cart tops out at ${vC && vC.v.toFixed(1)}`);
await ev(`TLXV.swapTo(null); true`).catch(() => { });
// option atvs off: not offered, and cannot be bought
a = await J(`(() => { TLX.setOn("atvs", false); const n0 = TLXV.state().owned.length, c0 = GS.cash; TLXV.state().owned = TLXV.state().owned.filter(r => !["atv", "sxs", "cart"].includes(r.id)); const n1 = TLXV.state().owned.length; TLXV.buy("atv"); const bought = TLXV.state().owned.length > n1; TLX.setOn("atvs", true); return { bought }; })()`);
ok(!a.bought, "option atvs off: the four-wheeler cannot be bought");

// ---------- the save keeps it
await ev(`TLX.state("seasons").skips = 7; TLX.state("seasons").played = true; save(); true`);
const sv = JSON.parse(await raw(`localStorage.getItem("tracklayer.save.v2")`));
ok(sv.x && sv.x.sys.seasons && sv.x.sys.seasons.s.skips === 7 && sv.x.sys.seasons.s.played === true, "x.sys.seasons is in the save with its state");
await reload(sv); await sleep(800);
a = await J(`({ st: TLX.state("seasons"), v: TLXV.VEHICLES.some(d => d.id === "atv") })`);
ok(a.st.skips === 7 && a.st.played === true && a.v, "the state and the rows survive a reload");
// an old save (no seasons state) loads and starts fresh
delete sv.x.sys.seasons; await reload(sv); await sleep(800);
a = await J(`({ st: TLX.state("seasons") })`);
ok(a.st && a.st.skips === 0 && a.st.played === false && a.st.winters === 0, "a save from before the seasons loads with a fresh seasons state");

console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
