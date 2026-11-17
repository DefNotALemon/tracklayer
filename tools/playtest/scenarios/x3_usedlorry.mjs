// Expansion slice 3.5b3b: used tractor units on Bytteboden "Vehicles" (tlx-vehicles.js v23, the sitesFor / noRoom bridges in
// tracklayer.js). Asserts, exit 1 on a failure.
//   A. the pool: no tractor without the Freight licence or before 6 deliveries; with both, it lists
//   B. sellers: only people within MKT_LORRY.r of a semitrailer lay-by sell one; pickups and trailers still sell anywhere
//   C. the listing: name, used price under new, a drawn photo, the Vehicles tab and the detail page (which lay-by)
//   D. paid by SEND: it waits (one at a time, the garage's row says so), nothing on the ground; stopped at the seller's:
//      the lorry stands in the nearest lay-by on plowed ground, clear of the trailer, facing out, at its real condition
//      with a quarter tank, and the toast names the lay-by
//   E. you take the wheel and it drives out of the lay-by under its own power, not bogged
//   F. a lemon inspected in person drops its price; paid in person with the first lorry still in the bay: the second
//      stands 7 m+ from it; with the lay-by full the seller says so and keeps the lorry until there is room
//   G. a reload keeps both lorries; three trucks: no tractor (and no pickup) in the pool
// Stills (OUT): the Vehicles tab, the detail page, the lorry in the lay-by.
import { boot, ev, sleep, done, reload, down, up, shot } from "../lib.mjs";
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
const setup = () => ev(`crashCancel(); FOOT.on = false; GS.hour = 12; GS.storm = 0; WX.at = () => 0; TLX.setOn("traffic", false); GS.load = []; GS.claims = []; GS.apps.freight = 1; GS.signed.freight = true; GS.lic.freight = true; GS.delivered = 10; GS.cash = 60000; true`);
const pool = () => J(`mktPool("veh").map(p => p.item)`);
// a tractor listing at a given seller site, lemon or not, put on the board
const makeL = (site, lemon, real) => J(`(() => { let l = null; for (let i = 0; i < 6000 && !l; i++) { const q = mktMake(CAL.abs()); if (q && q.cat === "veh" && q.item === "tractor") l = q; }
  if (!l) return null; l.site = "${site}"; l.lemon = ${lemon}; l.real = ${lemon} ? ${real} : l.adv; l.life = 200; l.mute = false; l.deal = null; GS.mkt.list.push(l); return { id: l.id, site: l.site, ask: l.ask, adv: l.adv, real: l.real, seller: l.seller }; })()`);
// stop the sled 8-20 m from a site, clear of buildings
const toSite = id => J(`(() => { const s = SITES.find(q => q.id === "${id}"); crashCancel(); FOOT.on = false; if (TLX.state("vehicles").cur != null) TLXV.swapTo(null);
  for (let r = 8; r < 21; r += 2) for (let a = 0; a < 6.28; a += 0.4) { const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
    if (isSea(x, z) || isWater(x, z) || obNear(x, z, 3)) continue;
    P.x = x; P.z = z; P.y = surf(x, z) + 0.2; P.vx = P.vy = P.vz = 0; recenter(x, z, true); return { x, z, r }; }
  return null; })()`);
const lorries = () => J(`TLX.state("vehicles").owned.filter(r => r.id === "tractor").map(r => ({ uid: r.uid, x: r.x, z: r.z, yaw: r.yaw, cond: r.cond, fuel: r.fuel }))`);
// where a lorry stands against a lay-by: metres ahead of its middle (u), sideways (v), heading error, plowed, clear
const inBay = (uid, bayId) => J(`(() => { const r = TLX.state("vehicles").owned.find(q => q.uid === ${JSON.stringify(uid)}), b = TLXRIG.bays().find(q => q.id === "${bayId}"), fx = Math.sin(b.yaw), fz = Math.cos(b.yaw);
  const dx = r.x - b.x, dz = r.z - b.z, T = TLXRIG.list().find(t => t.id === "${bayId}");
  let yard = 1, wet = false; for (const o of [-2.9, 0, 2.9]) { const x = r.x + fx * o, z = r.z + fz * o; yard = Math.min(yard, yardAt(x, z)); if (isWater(x, z) || isSea(x, z)) wet = true; }
  let dyaw = r.yaw - b.yaw; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
  return { u: dx * fx + dz * fz, v: dx * fz - dz * fx, dyaw, yard, wet, road: TLXR.near(r.x, r.z).d, kp: Math.hypot(r.x - T.kx, r.z - T.kz), y: surf(r.x, r.z) }; })()`);

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await setup();
const bays = await J("TLXRIG.bays()");
ok(bays.length === 3 && bays.every(b => Number.isFinite(b.yaw)), `three lay-bys with a heading: ${bays.map(b => b.name).join(", ")}`);

// ---- A. the pool
await ev(`GS.lic.freight = false; true`);
let p = await pool(); ok(!p.includes("tractor") && p.includes("pickup"), `without the Freight licence: no tractor unit on Bytteboden (${p})`);
await ev(`GS.lic.freight = true; GS.delivered = 3; true`);
p = await pool(); ok(!p.includes("tractor"), `licensed but only 3 deliveries: not yet (${p})`);
await ev(`GS.delivered = 10; true`);
p = await pool(); ok(p.includes("tractor") && p.includes("pickup") && p.includes("haul"), `licensed, 10 deliveries: tractor unit, pickup and trailer (${p})`);

// ---- B. where its sellers live
const S = await J(`(() => { const ms = mktSites(), ok = TLXV.mkt.sitesFor("tractor", ms), bs = TLXRIG.bays(), dOf = s => Math.min(...bs.map(b => Math.hypot(b.x - s.x, b.z - s.z)));
  const seen = {}, other = new Set(); let n = 0;
  for (let i = 0; i < 9000; i++) { const q = mktMake(CAL.abs()); if (!q || q.cat !== "veh") continue; if (q.item === "tractor") { n++; seen[q.site] = 1; } else other.add(q.site); }
  return { all: ms.length, ok: ok.map(s => ({ id: s.id, d: Math.round(dOf(s)), bay: bs.slice().sort((a, b) => Math.hypot(a.x - s.x, a.z - s.z) - Math.hypot(b.x - s.x, b.z - s.z))[0].id })), n, seen: Object.keys(seen), other: other.size, pickAny: TLXV.mkt.sitesFor("pickup", ms).length }; })()`);
console.log("lorry sellers:", S.ok.map(s => `${s.id} ${s.d} m (${s.bay})`).join(", "));
ok(S.ok.length >= 3 && S.ok.length < S.all && S.ok.every(s => s.d <= 1500), `${S.ok.length} of ${S.all} seller sites are within 1.5 km of a lay-by`);
ok(new Set(S.ok.map(s => s.bay)).size >= 2, `they are spread over ${new Set(S.ok.map(s => s.bay)).size} lay-bys`);
ok(S.n >= 20 && S.seen.every(id => S.ok.some(s => s.id === id)), `${S.n} tractor listings made: every one at one of those sites (${S.seen.length} different)`);
ok(S.pickAny === S.all && S.other > S.ok.length, `pickups and trailers still sell anywhere (${S.other} sites seen)`);

// ---- C. the listing
const near = S.ok.slice().sort((a, b) => a.d - b.d)[0];
const bay = bays.find(b => b.id === near.bay);
const L1 = await makeL(near.id, false, 0);
ok(!!L1, `a tractor unit listed at ${near.id}, ${near.d} m from the ${bay.name}: ask $${L1 && L1.ask}`);
const inf = await J(`mktInfo(GS.mkt.list.find(l => l.id === ${L1.id}))`);
ok(/Nordtrekk 4x2 tractor unit/.test(inf.name) && inf.newP === 11500 && L1.ask >= 3800 && L1.ask < 11500, `"${inf.name}", new $${inf.newP}, used $${L1.ask}; ${inf.stat}`);
const picN = await ev(`mktPic(GS.mkt.list.find(l => l.id === ${L1.id})).length`);
ok(picN > 3000, `the listing has a drawn photo (${picN} bytes)`);
await ev(`TABLET.toggle(true, "market"); MKT.view = null; MKT.cat = "veh"; TABLET.render(); true`); await sleep(500);
ok(/Nordtrekk 4x2 tractor unit/.test(await ev(`$("tabV").textContent`)), "the Vehicles tab lists it");
await still("lorrytab");
await ev(`MKT.view = ${L1.id}; TABLET.render(); true`); await sleep(400);
const det = await ev(`$("tabV").textContent`);
ok(/new ≈ \$11,500/.test(det) && det.includes(bay.name) && /drive it away/.test(det), `the detail page: the new price, and that it stands in the ${bay.name}`);
await still("lorrydetail");
await ev(`TABLET.toggle(false); true`);

// ---- D. paid by SEND, collected at the seller's door, found in the lay-by
await clearToasts();
await ev(`mktPay(GS.mkt.list.find(l => l.id === ${L1.id})); true`); await sleep(400);
ok(await ev(`GS.mkt.held.some(h => h.cat === "veh" && h.item === "tractor" && h.state === "wait")`), "SEND: paid for, it waits for you");
ok((await toasts()).some(t => t.includes(bay.name)), "the toast says which lay-by it stands in");
p = await pool(); ok(!p.includes("tractor"), `one used lorry at a time: none in the pool while one waits (${p})`);
ok((await lorries()).length === 0, "nothing on the ground until you have been to the seller's");
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400);
{ const row = await ev(`(() => { const r = [...document.querySelectorAll("#garageBody .row")].find(e => /Nordtrekk/.test(e.textContent) && !/Repair/.test(e.textContent)); return r ? r.textContent : ""; })()`);
  ok(/paid for a used tractor unit/.test(row) && row.includes(L1.seller), `the garage's Nordtrekk row says one is paid for (${L1.seller})`); }
await ev(`closeGarage(); true`);
await clearToasts();
const s1 = await toSite(near.id);
ok(!!s1, `stopped ${s1 && s1.r} m from the seller`);
ok(await waitUntil(`TLX.state("vehicles").owned.some(r => r.id === "tractor")`, 8), "stopped there: the lorry is yours");
let ls = await lorries();
const A = ls[0], a = await inBay(A.uid, near.bay);
console.log("lorry 1 in the bay:", JSON.stringify(a));
ok(Math.abs(a.u) <= 9 && Math.abs(a.v) < 0.2 && Math.abs(a.dyaw) < 0.02, `it stands in the ${bay.name}: ${a.u.toFixed(1)} m ahead of its middle, in line, facing out`);
ok(a.yard >= 0.5 && !a.wet && a.road > 3.5, `on plowed ground nose to tail (plow ${a.yard.toFixed(2)}), dry, ${a.road.toFixed(1)} m off the road's centre line`);
ok(a.kp > 8 && !(await ev(`obNear(${A.x}, ${A.z}, 1.5)`)), `clear of the lay-by's trailer (${a.kp.toFixed(1)} m ahead of its kingpin)`);
ok(A.cond === Math.round(L1.real * 100) && A.fuel === 75, `at ${A.cond}% (ad ${Math.round(L1.adv * 100)}%) with ${A.fuel} L, a quarter tank`);
{ const t = await toasts(); ok(t.some(m => /hands you the keys/.test(m) && m.includes(bay.name) && /on your Map/.test(m)), "toast: the keys, the lay-by, on your Map"); }
ok(await ev(`GS.mkt.held.length === 0`), "nothing left waiting");
{ const pins = await J(`(() => { const out = []; try { for (const f of (TABLET.layers && TABLET.layers.vehicles) || []) out.push(...f()); } catch (e) { return null; } return out; })()`);
  if (pins) ok(pins.some(q => Math.hypot(q.x - A.x, q.z - A.z) < 1), "the Map's vehicle pins include it"); else console.log("note: Map layer list not readable from the scenario; pin not asserted"); }

// ---- E. drive it out
await ev(`TLXV.swapTo(${JSON.stringify(A.uid)}); FOOT.on = false; true`); await sleep(1400);
ok(await ev(`TLX.state("vehicles").cur === ${JSON.stringify(A.uid)}`), "at its wheel");
await sleep(500); await still("lorrybay");
{ const p0 = await J(`({ x: P.x, z: P.z })`); await down("KeyW"); await waitGame(5); await up("KeyW");
  const p1 = await J(`({ x: P.x, z: P.z, v: Math.hypot(P.vx, P.vz), bog: BOG.on })`), d = Math.hypot(p1.x - p0.x, p1.z - p0.z);
  ok(d > 8 && !p1.bog, `it pulls out of the lay-by under its own power: ${d.toFixed(1)} m in 5 s, ${p1.v.toFixed(1)} m/s, not bogged`);
  await down("KeyS"); await waitGame(2.5); await up("KeyS"); }

// ---- F. a second one, a lemon, with the first still in the bay; then a full lay-by
await ev(`(() => { const r = TLX.state("vehicles").owned.find(q => q.uid === ${JSON.stringify(A.uid)}); TLXV.swapTo(null); r.x = ${A.x}; r.z = ${A.z}; r.yaw = ${A.yaw}; return 1; })()`); await sleep(900);
const L2 = await makeL(near.id, true, 0.5);
ok(!!L2, `a second one listed while you own one: ask $${L2 && L2.ask}`);
await toSite(near.id); await waitGame(0.8);
await clearToasts();
const askB = await ev(`GS.mkt.list.find(l => l.id === ${L2.id}).ask`);
await ev(`mktInspect(GS.mkt.list.find(l => l.id === ${L2.id})); true`); await sleep(300);
const askA = await ev(`GS.mkt.list.find(l => l.id === ${L2.id}).ask`);
ok((await toasts()).some(t => /Not what the ad said/.test(t)) && askA < askB, `looked over in person, the lemon shows: ask $${askB} -> $${askA}`);
const cashB = await ev("GS.cash"), price = await ev(`mktPrice(GS.mkt.list.find(l => l.id === ${L2.id}))`);
await ev(`mktPay(GS.mkt.list.find(l => l.id === ${L2.id})); true`); await sleep(500);
ls = await lorries();
ok(ls.length === 2 && cashB - (await ev("GS.cash")) === price, `paid $${price} at the door: two lorries`);
{ const B = ls.find(q => q.uid !== A.uid), b = B && await inBay(B.uid, near.bay), gap = B ? Math.hypot(B.x - A.x, B.z - A.z) : 0;
  console.log("lorry 2 in the bay:", JSON.stringify(b));
  ok(B && gap >= 7 && Math.abs(b.v) < 0.2 && b.yard >= 0.5 && b.kp > 4.5 && B.cond === 50, `the second stands ${gap.toFixed(1)} m from the first, in line, on plowed ground, ${b && b.kp.toFixed(1)} m ahead of the kingpin, at ${B && B.cond}%`);
  ok(!(await ev(`obNear(${B.x}, ${B.z}, 1.5)`)), "and clear of the trailer");
}
// a third paid for by SEND: the lay-by is full
await ev(`TLX.state("vehicles").owned.length = 2; true`);
p = await pool(); ok(p.includes("tractor"), `with two trucks a tractor unit still lists (${p})`);
const L3 = await makeL(near.id, false, 0);
await ev(`(() => { P.x += 900; recenter(P.x, P.z, true); mktPay(GS.mkt.list.find(l => l.id === ${L3.id})); return 1; })()`); await sleep(300);
ok(await ev(`GS.mkt.held.some(h => h.item === "tractor")`), "a third, paid by SEND, waits");
p = await pool(); ok(!p.includes("tractor") && !p.includes("pickup"), `two trucks and one paid for: no more trucks in the pool (${p})`);
await clearToasts();
await ev(`MKT.nagT = -99; true`);
await toSite(near.id); await waitGame(2.5);
ok((await lorries()).length === 2 && await ev(`GS.mkt.held.some(h => h.item === "tractor")`), "with both places in the lay-by taken it is not handed over");
ok((await toasts()).some(t => /no room to stand it in the/.test(t) && t.includes(bay.name)), "the seller says the lay-by is full");
// move the first lorry off to the forecourt: now it comes
await ev(`(() => { const r = TLX.state("vehicles").owned.find(q => q.uid === ${JSON.stringify(A.uid)}); r.x = depot.x + 40; r.z = depot.z; return 1; })()`);
await toSite(near.id);
ok(await waitUntil(`TLX.state("vehicles").owned.filter(r => r.id === "tractor").length === 3`, 8), "with a place free again it is handed over");

// ---- G. reload; three trucks
await ev(`save(); true`);
await reload(); await sleep(800);
ls = await lorries();
ok(ls.length === 3 && ls.some(q => q.cond === 50) && ls.every(q => q.fuel > 0), `after a reload: ${ls.length} lorries (${ls.map(q => q.cond + "%").join(", ")})`);
await ev(`GS.delivered = 10; GS.lic.freight = true; true`);
p = await pool(); ok(!p.includes("tractor") && !p.includes("pickup"), `three trucks: neither a tractor unit nor a pickup in the pool (${p})`);

await done(fails ? 1 : 0);
