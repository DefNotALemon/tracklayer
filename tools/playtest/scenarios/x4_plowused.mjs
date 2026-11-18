// Expansion slice 4.1c3: a used plow truck on Bytteboden "Vehicles", by the lorry rules (tlx-vehicles.js v30, tlx-plow.js v10).
// Asserts, exit 1 on a failure.
//   A. the pool: no plow truck without the Freight licence or before 6 deliveries; with both it lists beside the tractor unit
//   B. sellers: only people within 1.5 km of a lay-by sell one
//   C. the listing: name, new price, used price under it, the blade's edge in the stat line, a drawn photo unlike the
//      tractor unit's, the Vehicles tab and the detail page (which lay-by)
//   D. paid by SEND: it waits, one at a time (the pool, a second listing's pay refusal, the garage's row); collected at the
//      seller's door: it stands in the lay-by, at its real condition with a quarter tank, with its factory blade whose
//      cutting edge is the truck's condition, an empty hopper, the model on the truck; the toast says so
//   E. at its wheel: a tap of the use control drops the blade, it pulls out of the lay-by; the Plow tab offers the mend
//   F. a lemon looked over in person drops its price; bought at the door it stands 7 m+ from the first, edge = real condition
//   G. a reload keeps both trucks and both edges; the Freight licence gone with one paid for: the seller refunds it by name
//   H. three trucks: no plow truck in the pool
// Stills (OUT): the Vehicles tab, the detail page, the truck in the lay-by.
import { boot, ev, sleep, done, reload, down, up, tap, shot, OUT } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(120); }
async function waitUntil(expr, maxGame = 12) { const t0 = await clock(); while ((await clock()) - t0 < maxGame) { if (await ev(expr)) return true; await sleep(150); } return false; }
const NOSTILLS = !!process.env.NOSTILLS;
const still = async name => { if (!NOSTILLS) await shot(name); };
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80);
  return 1; })()`);
const setup = () => ev(`crashCancel(); FOOT.on = false; GS.hour = 12; GS.storm = 0; WX.at = () => 0; TLX.setOn("traffic", false); GS.load = []; GS.claims = []; GS.apps.freight = 1; GS.signed.freight = true; GS.lic.freight = true; GS.delivered = 10; GS.cash = 90000; true`);
const pool = () => J(`mktPool("veh").map(p => p.item)`);
const makeL = (site, lemon, real, item = "plowtruck") => J(`(() => { let l = null; for (let i = 0; i < 20000 && !l; i++) { const q = mktMake(CAL.abs()); if (q && q.cat === "veh" && q.item === "${item}") l = q; }
  if (!l) return null; l.site = "${site}"; l.lemon = ${lemon}; l.real = ${lemon} ? ${real} : l.adv; l.life = 200; l.mute = false; l.deal = null; GS.mkt.list.push(l); return { id: l.id, site: l.site, ask: l.ask, adv: l.adv, real: l.real, seller: l.seller }; })()`);
const toSite = id => J(`(() => { const s = SITES.find(q => q.id === "${id}"); crashCancel(); FOOT.on = false; if (TLX.state("vehicles").cur != null) TLXV.swapTo(null);
  for (let r = 8; r < 21; r += 2) for (let a = 0; a < 6.28; a += 0.4) { const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
    if (isSea(x, z) || isWater(x, z) || obNear(x, z, 3)) continue;
    P.x = x; P.z = z; P.y = surf(x, z) + 0.2; P.vx = P.vy = P.vz = 0; recenter(x, z, true); return { x, z, r }; }
  return null; })()`);
const plows = () => J(`TLX.state("vehicles").owned.filter(r => r.id === "plowtruck").map(r => { const b = TLX.state("plow").blades[r.uid] || null, B = TLXPL.rt(r.uid), R = TLXV.runtimeOf(r.uid);
  return { uid: r.uid, x: r.x, z: r.z, yaw: r.yaw, cond: r.cond, fuel: r.fuel, used: r.used === undefined ? null : r.used, blade: b, model: !!(B && R && B.grp && B.grp.parent === R.grp) }; })`);
const inBay = (uid, bayId) => J(`(() => { const r = TLX.state("vehicles").owned.find(q => q.uid === ${JSON.stringify(uid)}), b = TLXRIG.bays().find(q => q.id === "${bayId}"), fx = Math.sin(b.yaw), fz = Math.cos(b.yaw);
  const dx = r.x - b.x, dz = r.z - b.z, T = TLXRIG.list().find(t => t.id === "${bayId}");
  let yard = 1, wet = false; for (const o of [-2.9, 0, 2.9]) { const x = r.x + fx * o, z = r.z + fz * o; yard = Math.min(yard, yardAt(x, z)); if (isWater(x, z) || isSea(x, z)) wet = true; }
  let dyaw = r.yaw - b.yaw; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
  return { u: dx * fx + dz * fz, v: dx * fz - dz * fx, dyaw, yard, wet, road: TLXR.near(r.x, r.z).d, kp: Math.hypot(r.x - T.kx, r.z - T.kz) }; })()`);

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await setup();
const bays = await J("TLXRIG.bays()");
ok(bays.length >= 1 && bays.every(b => Number.isFinite(b.yaw)), `${bays.length} lay-bys: ${bays.map(b => b.name).join(", ")}`);

// ---- A. the pool
await ev(`GS.lic.freight = false; true`);
let p = await pool(); ok(!p.includes("plowtruck") && p.includes("pickup"), `without the Freight licence: no plow truck on Bytteboden (${p})`);
await ev(`GS.lic.freight = true; GS.delivered = 3; true`);
p = await pool(); ok(!p.includes("plowtruck"), `licensed but only 3 deliveries: not yet (${p})`);
await ev(`GS.delivered = 10; true`);
p = await pool(); ok(p.includes("plowtruck") && p.includes("tractor") && p.includes("pickup"), `licensed, 10 deliveries: plow truck, tractor unit and pickup (${p})`);
{ const w = await J(`mktPool("veh").filter(q => q.item === "plowtruck" || q.item === "tractor").map(q => [q.item, q.w])`);
  const wp = w.find(q => q[0] === "plowtruck")[1], wt = w.find(q => q[0] === "tractor")[1];
  ok(wp > 0 && wp < wt, `it is rarer than a tractor unit (weight ${wp} against ${wt})`); }

// ---- B. where its sellers live
const S = await J(`(() => { const ms = mktSites(), ok = TLXV.mkt.sitesFor("plowtruck", ms), bs = TLXRIG.bays(), dOf = s => Math.min(...bs.map(b => Math.hypot(b.x - s.x, b.z - s.z)));
  const seen = {}; let n = 0, nt = 0;
  for (let i = 0; i < 12000; i++) { const q = mktMake(CAL.abs()); if (!q || q.cat !== "veh") continue; if (q.item === "plowtruck") { n++; seen[q.site] = 1; } else if (q.item === "tractor") nt++; }
  return { all: ms.length, ok: ok.map(s => ({ id: s.id, d: Math.round(dOf(s)), bay: bs.slice().sort((a, b) => Math.hypot(a.x - s.x, a.z - s.z) - Math.hypot(b.x - s.x, b.z - s.z))[0].id })), n, nt, seen: Object.keys(seen) }; })()`);
ok(S.ok.length >= 3 && S.ok.length < S.all && S.ok.every(s => s.d <= 1500), `${S.ok.length} of ${S.all} seller sites are within 1.5 km of a lay-by`);
ok(S.n >= 8 && S.n < S.nt && S.seen.every(id => S.ok.some(s => s.id === id)), `${S.n} plow truck listings made (${S.nt} tractor units): every one at one of those sites (${S.seen.length} different)`);

// ---- C. the listing
const near = S.ok.slice().sort((a, b) => a.d - b.d)[0];
const bay = bays.find(b => b.id === near.bay);
const L1 = await makeL(near.id, false, 0);
ok(!!L1, `a plow truck listed at ${near.id}, ${near.d} m from the ${bay.name}: ask $${L1 && L1.ask}`);
const inf = await J(`mktInfo(GS.mkt.list.find(l => l.id === ${L1.id}))`);
const adv = Math.round(L1.adv * 100);
ok(/Nordtrekk Brøyt 4x2 plow truck/.test(inf.name) && inf.newP === 16800 && L1.ask >= 5000 && L1.ask < 16800, `"${inf.name}", new $${inf.newP}, used $${L1.ask}`);
ok(inf.stat.includes(`cutting edge ${adv}%`) && /3\.5 m blade/.test(inf.stat) && /hopper empty/.test(inf.stat), `the stat line gives the blade and its edge: ${inf.stat}`);
{ const pics = await J(`(() => { const a = mktPic(GS.mkt.list.find(l => l.id === ${L1.id})); let t = null; for (let i = 0; i < 20000 && !t; i++) { const q = mktMake(CAL.abs()); if (q && q.cat === "veh" && q.item === "tractor") t = q; } const b = t ? mktPic(t) : ""; return { a: a.length, b: b.length, same: a === b }; })()`);
  ok(pics.a > 3000 && pics.b > 3000 && !pics.same, `the listing has its own drawn photo (${pics.a} bytes; the tractor unit's is ${pics.b})`);
  if (!NOSTILLS) { const u = await ev(`mktPic(GS.mkt.list.find(l => l.id === ${L1.id}))`), m = /^data:image\/(\w+);base64,(.*)$/.exec(u || ""); if (m) { const fs = await import("node:fs"); fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(`${OUT}/plowusedpic.${m[1] === "jpeg" ? "jpg" : m[1]}`, Buffer.from(m[2], "base64")); } } }
{ const wt = await J(`({ why: TLXV.mkt.why("plowtruck"), tell: TLXV.mkt.tell("plowtruck"), twhy: TLXV.mkt.why("tractor"), pwhy: TLXV.mkt.why("pickup") })`);
  ok(wt.why.length >= 4 && wt.tell.length >= 3 && wt.why[0] !== wt.twhy[0] && wt.why[0] !== wt.pwhy[0], `its sellers have their own reasons and its lemons their own faults (${wt.why.length} / ${wt.tell.length})`); }
await ev(`TABLET.toggle(true, "market"); MKT.view = null; MKT.cat = "veh"; TABLET.render(); true`); await sleep(500);
ok(/Nordtrekk Brøyt 4x2 plow truck/.test(await ev(`$("tabV").textContent`)), "the Vehicles tab lists it");
await still("plowusedtab");
await ev(`MKT.view = ${L1.id}; TABLET.render(); true`); await sleep(400);
const det = await ev(`$("tabV").textContent`);
ok(/new ≈ \$16,800/.test(det) && det.includes(bay.name) && /drive it away/.test(det), `the detail page: the new price, and that it stands in the ${bay.name}`);
await still("plowuseddetail");
await ev(`TABLET.toggle(false); true`);

// ---- D. paid by SEND, collected at the seller's door, found in the lay-by
await clearToasts();
await ev(`mktPay(GS.mkt.list.find(l => l.id === ${L1.id})); true`); await sleep(400);
ok(await ev(`GS.mkt.held.some(h => h.cat === "veh" && h.item === "plowtruck" && h.state === "wait")`), "SEND: paid for, it waits for you");
ok((await toasts()).some(t => t.includes(bay.name)), "the toast says which lay-by it stands in");
p = await pool(); ok(!p.includes("plowtruck") && p.includes("tractor"), `one used plow truck at a time: none in the pool while one waits (${p})`);
{ const Lx = await J(`(() => { const l = Object.assign({}, GS.mkt.held.find(h => h.item === "plowtruck"), { id: 987654 }); return { why: TLXV.mkt.payWhy({ item: "plowtruck", cat: "veh" }, GS.mkt.held), t: TLXV.mkt.payWhy({ item: "tractor", cat: "veh" }, GS.mkt.held) }; })()`);
  ok(/already paid for a plow truck/.test(Lx.why) && Lx.why.includes(L1.seller) && Lx.t === "", `a second plow truck can't be paid for meanwhile ("${Lx.why}"); a tractor unit can`); }
ok((await plows()).length === 0, "nothing on the ground until you have been to the seller's");
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400);
{ const row = await ev(`(() => { const r = [...document.querySelectorAll("#garageBody .row")].find(e => /Nordtrekk Brøyt/.test(e.textContent) && !/Repair/.test(e.textContent)); return r ? r.textContent : ""; })()`);
  ok(/paid for a used plow truck/.test(row) && row.includes(L1.seller), `the garage's Brøyt row says one is paid for (${L1.seller})`); }
await ev(`closeGarage(); true`);
await clearToasts();
const s1 = await toSite(near.id);
ok(!!s1, `stopped ${s1 && s1.r} m from the seller`);
ok(await waitUntil(`TLX.state("vehicles").owned.some(r => r.id === "plowtruck")`, 8), "stopped there: the plow truck is yours");
await waitGame(0.6);
let ls = await plows();
const A = ls[0], a = await inBay(A.uid, near.bay);
console.log("plow truck 1:", JSON.stringify(A), JSON.stringify(a));
ok(Math.abs(a.u) <= 9 && Math.abs(a.v) < 0.2 && Math.abs(a.dyaw) < 0.02, `it stands in the ${bay.name}: ${a.u.toFixed(1)} m ahead of its middle, in line, facing out`);
ok(a.yard >= 0.5 && !a.wet && a.road > 3.5, `on plowed ground nose to tail (plow ${a.yard.toFixed(2)}), dry, ${a.road.toFixed(1)} m off the road's centre line`);
ok(a.kp > 8 && !(await ev(`obNear(${A.x}, ${A.z}, 1.5)`)), `clear of the lay-by's trailer (${a.kp.toFixed(1)} m from its kingpin)`);
ok(A.cond === Math.round(L1.real * 100) && A.fuel === 75, `at ${A.cond}% (ad ${adv}%) with ${A.fuel} L, a quarter tank`);
ok(A.blade && A.blade.id === "b35" && A.blade.cond === A.cond && A.blade.hop === 0, `its own blade is on it, cutting edge ${A.blade && A.blade.cond}% (the truck's condition), hopper ${A.blade && A.blade.hop} kg`);
ok(A.used === null, "the used mark is spent once the blade is handed over");
ok(A.model, "the blade's model is on the truck");
ok(await ev(`TLX.state("plow").shed.length === 0`), "nothing went to the blade shed");
{ const t = await toasts(); ok(t.some(m => /hands you the keys/.test(m) && m.includes(bay.name) && /cutting edge as worn as the truck/.test(m) && /hopper empty/.test(m)), "toast: the keys, the lay-by, the worn edge, the empty hopper"); }
ok(await ev(`GS.mkt.held.length === 0`), "nothing left waiting");

// ---- E. at its wheel
await ev(`TLXV.swapTo(${JSON.stringify(A.uid)}); FOOT.on = false; true`); await sleep(1400);
ok(await ev(`TLX.state("vehicles").cur === ${JSON.stringify(A.uid)}`), "at its wheel");
await sleep(500); await still("plowusedbay");
await tap("KeyE"); await waitGame(0.9);
ok(await ev(`TLXPL.rt(${JSON.stringify(A.uid)}).down === true`), "a tap of the use control drops its blade");
await tap("KeyE"); await waitGame(0.9);
ok(await ev(`TLXPL.rt(${JSON.stringify(A.uid)}).down === false`), "and a tap lifts it");
{ const p0 = await J(`({ x: P.x, z: P.z })`); await down("KeyW"); await waitGame(5); await up("KeyW");
  const p1 = await J(`({ x: P.x, z: P.z, v: Math.hypot(P.vx, P.vz), bog: BOG.on })`), d = Math.hypot(p1.x - p0.x, p1.z - p0.z);
  ok(d > 6 && !p1.bog, `it pulls out of the lay-by under its own power: ${d.toFixed(1)} m in 5 s, ${p1.v.toFixed(1)} m/s, not bogged`);
  await down("KeyS"); await waitGame(2.5); await up("KeyS"); }
{ const m = await J(`({ cost: TLXPL.mendCost(${JSON.stringify(A.uid)}), cond: TLXPL.condOf(${JSON.stringify(A.uid)}) })`);
  ok(m.cond === A.cond && m.cost === (100 - A.cond) * 6, `the Plow tab's mend prices its edge: ${m.cond}% -> $${m.cost}`); }

// ---- F. a second one, a lemon, with the first still in the bay
await ev(`(() => { const r = TLX.state("vehicles").owned.find(q => q.uid === ${JSON.stringify(A.uid)}); TLXV.swapTo(null); r.x = ${A.x}; r.z = ${A.z}; r.yaw = ${A.yaw}; return 1; })()`); await sleep(900);
p = await J(`mktPool("veh").filter(q => q.item === "plowtruck").map(q => q.w)`); ok(p.length === 1 && p[0] < 0.1, `owning one, another still lists, seldom (weight ${p})`);
const L2 = await makeL(near.id, true, 0.5);
ok(!!L2, `a second one listed while you own one: ask $${L2 && L2.ask}`);
await toSite(near.id); await waitGame(0.8);
await clearToasts();
const askB = await ev(`GS.mkt.list.find(l => l.id === ${L2.id}).ask`);
await ev(`mktInspect(GS.mkt.list.find(l => l.id === ${L2.id})); true`); await sleep(300);
const askA = await ev(`GS.mkt.list.find(l => l.id === ${L2.id}).ask`);
ok((await toasts()).some(t => /Not what the ad said/.test(t)) && askA < askB, `looked over in person, the lemon shows: ask $${askB} -> $${askA}`);
{ const i2 = await J(`(() => { const l = GS.mkt.list.find(l => l.id === ${L2.id}); return mktInfo(l, l.insp ? l.real : l.adv); })()`); ok(/cutting edge 50%/.test(i2.stat), `and the inspected listing gives the true edge: ${i2.stat}`); }
const cashB = await ev("GS.cash"), price = await ev(`mktPrice(GS.mkt.list.find(l => l.id === ${L2.id}))`);
await ev(`mktPay(GS.mkt.list.find(l => l.id === ${L2.id})); true`); await sleep(500); await waitGame(0.6);
ls = await plows();
ok(ls.length === 2 && cashB - (await ev("GS.cash")) === price, `paid $${price} at the door: two plow trucks`);
{ const B = ls.find(q => q.uid !== A.uid), b = B && await inBay(B.uid, near.bay), gap = B ? Math.hypot(B.x - A.x, B.z - A.z) : 0;
  console.log("plow truck 2:", JSON.stringify(B), JSON.stringify(b));
  ok(B && gap >= 7 && Math.abs(b.v) < 0.2 && b.yard >= 0.5 && B.cond === 50, `the second stands ${gap.toFixed(1)} m from the first, in line, on plowed ground, at ${B && B.cond}%`);
  ok(B && B.blade && B.blade.cond === 50 && B.blade.hop === 0 && B.model, `its blade's edge is the truth too: ${B && B.blade && B.blade.cond}%`);
  ok(!(await ev(`obNear(${B.x}, ${B.z}, 1.5)`)), "and clear of the trailer");
}
// a new one from the garage still comes with a whole edge
{ const n = await J(`(() => { const s = TLX.state("vehicles"); s.owned.push({ uid: "v" + (++s.seq), id: "plowtruck", x: depot.x + 30, z: depot.z + 6, yaw: 0, fuel: 300, cond: 100, load: [] }); TLXPL.tidy(); const u = s.owned[s.owned.length - 1].uid, b = TLX.state("plow").blades[u]; s.owned.pop(); TLXPL.tidy(); return b; })()`);
  ok(n && n.cond === 100, `a new truck's blade is whole (${n && n.cond}%)`); }

// ---- G. reload; then the licence gone with one paid for
await ev(`TLX.state("plow").blades[${JSON.stringify(A.uid)}].cond = ${A.cond} - 3; save(); true`);
await reload(); await sleep(800);
ls = await plows();
ok(ls.length === 2 && ls.some(q => q.cond === 50 && q.blade && q.blade.cond === 50) && ls.some(q => q.uid === A.uid && q.blade && q.blade.cond === A.cond - 3), `after a reload: ${ls.length} plow trucks, edges ${ls.map(q => q.blade && q.blade.cond + "%").join(", ")} (the first one's wear since kept)`);
await setup();
// (made and paid in one call: a listing left on the board between two calls can be pruned by the market's own tick)
const L3 = await J(`(() => { let l = null; for (let i = 0; i < 20000 && !l; i++) { const q = mktMake(CAL.abs()); if (q && q.cat === "veh" && q.item === "plowtruck") l = q; }
  if (!l) return null; l.site = "${near.id}"; l.lemon = false; l.real = l.adv; l.life = 200; l.mute = false; l.deal = null; GS.mkt.list.push(l);
  P.x += 900; recenter(P.x, P.z, true); mktPay(l); return { id: l.id }; })()`); await sleep(300);
ok(!!L3 && await ev(`GS.mkt.held.some(h => h.item === "plowtruck")`), "a third, paid by SEND, waits");
p = await pool(); ok(!p.includes("plowtruck") && !p.includes("tractor") && !p.includes("pickup"), `two trucks and one paid for: no more trucks in the pool (${p})`);
await clearToasts();
const cashR = await ev("GS.cash");
await ev(`GS.lic.freight = false; true`); await waitGame(3);
{ const t = await toasts(), back = (await ev("GS.cash")) - cashR;
  ok(back > 0 && !(await ev(`GS.mkt.held.some(h => h.item === "plowtruck")`)) && t.some(m => /refunds/.test(m) && /plow truck/.test(m) && /A plow truck needs your Freight licence/.test(m)), `the licence gone: the seller refunds $${back} for the plow truck and says why`); }
await ev(`GS.lic.freight = true; true`);

// ---- H. three trucks
await ev(`(() => { const s = TLX.state("vehicles"); s.owned.push({ uid: "v" + (++s.seq), id: "pickup", x: depot.x + 30, z: depot.z + 6, yaw: 0, fuel: 60, cond: 100, load: [] }); return 1; })()`);
p = await pool(); ok(!p.includes("plowtruck") && !p.includes("tractor") && !p.includes("pickup"), `three trucks: no truck of any kind in the pool (${p})`);

await done(fails ? 1 : 0);
