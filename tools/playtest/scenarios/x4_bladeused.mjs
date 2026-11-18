// Expansion slice 4.1b3a: used plow blades on Bytteboden (tlx-plow.js MKB, through TLXV.addMkt). Asserts, exit 1 on a failure.
//   A when one is listed: no pickup -> never; a pickup, too few deliveries -> never; a pickup and no blade -> yes; every
//     pickup with a blade (fitted, in the shed, or one paid for and waiting) -> no; two pickups, one blade -> yes
//   B the listing: its name, its card (the cutting edge is the condition, the price of a new edge), cheaper than new,
//     a photo that draws, the reasons for selling and the lemon's tell are the blade's own
//   C paid for by SEND from the sled: it waits; a blade is not a truck (a third truck can still be bought, nothing is
//     refunded); stopping at the seller's on the SLED does not hand it over and says to come in a pickup
//   D the order survives a reload
//   E in a pickup with no blade: bolted on at the door, its edge the listing's condition, the model on the truck, the
//     Plow tab shows it; the listing left the board; the cash moved once
//   F a lemon bought in person in a pickup that already carries a blade: into the shed with its real (ragged) edge,
//     the seller's lie is told, the Plow tab fits it to the second pickup for nothing and it cuts ragged
//   G with a blade for every pickup a listing still on the board is hidden
// One still of the listing's page (the photo). Headless runs ~0.6x: all by gameClock.
import { boot, ev, sleep, done, reload, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(120); }
async function waitUntil(expr, maxGame = 10) { const t0 = await clock(); while ((await clock()) - t0 < maxGame) { if (await ev(expr)) return true; await sleep(150); } return false; }
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80);
  return 1; })()`);
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; GS.hour = 12; GS.storm = 0; WX.at = () => 0; TLX.setOn("traffic", false); GS.load = []; GS.claims = []; GS.delivered = 10; GS.cash = 20000; true`;
const IT = "blade:b23";
const poolHas = () => ev(`mktPool("veh").some(p => p.item === "${IT}")`);
const makeL = (site, o = {}) => J(`(() => { let l = null; for (let i = 0; i < 20000 && !l; i++) { const q = mktMake(CAL.abs()); if (q && q.cat === "veh" && q.item === "${IT}") l = q; }
  if (!l) return null; l.site = "${site}"; l.lemon = ${!!o.lemon}; l.adv = ${o.adv || 0.72}; l.real = ${o.real || o.adv || 0.72}; l.life = 200; l.mute = false; l.deal = null; GS.mkt.list.push(l);
  return { id: l.id, site: l.site, ask: l.ask, seller: l.seller, why: l.why, tell: l.tell }; })()`);
const toSite = id => J(`(() => { const s = SITES.find(q => q.id === "${id}"); crashCancel(); FOOT.on = false;
  for (let r = 9; r < 22; r += 2) for (let a = 0; a < 6.28; a += 0.4) { const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
    if (isSea(x, z) || isWater(x, z) || obNear(x, z, 4.5)) continue;
    P.x = x; P.z = z; P.yaw = Math.atan2(x - s.x, z - s.z); P.y = surf(x, z) + 0.2; P.vx = P.vy = P.vz = 0; recenter(x, z, true); return { x, z, r }; }
  return null; })()`);
const away = id => ev(`(() => { const s = SITES.find(q => q.id === "${id}"); crashCancel(); FOOT.on = false; P.x = s.x + 600; P.z = s.z + 200; P.y = surf(P.x, P.z) + 0.2; P.vx = P.vy = P.vz = 0; recenter(P.x, P.z, true); return 1; })()`);
const pay = id => ev(`mktPay(GS.mkt.list.find(l => l.id === ${id})); true`);
const heldN = () => ev(`GS.mkt.held.filter(h => h.item === "${IT}").length`);
const plow = () => J(`TLX.state("plow")`);
const rows = () => J(`(() => { const out = []; VEH.tabs.find(t => t.id === "plow").render(document.createElement("div"), (n, d, p, c) => out.push({ n, d: String(d).replace(/<[^>]+>/g, ""), p, c })); return out; })()`);
const inTruck = uid => ev(`(() => { TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; return TLXV.state().cur === ${JSON.stringify(uid)}; })()`);
const onSled = () => ev(`(() => { TLXV.swapTo(null); FOOT.on = false; return TLXV.state().cur == null; })()`);

await boot();
await ev(SETUP); await sleep(600);
ok(await ev(`typeof TLXV.addMkt === "function" && TLXPL.mkt.owns("${IT}") && !TLXPL.mkt.owns("pickup")`), "the plow system answers for \"blade:b23\" in the Vehicles category, and for nothing else");
const sites = await J(`mktSites().map(s => ({ id: s.id, d: Math.hypot(s.x - depot.x, s.z - depot.z) })).sort((a, b) => a.d - b.d).filter(s => s.d > 300).slice(0, 3).map(s => s.id)`);
const [siteA, siteB] = sites;
console.log("seller sites:", siteA, siteB);

// ---- A. when one is listed
ok(!(await poolHas()), "A: no pickup: no used blade is listed");
await ev(`TLXV.buy("pickup"); true`); await sleep(300);
const u1 = await ev(`TLXV.state().owned[0].uid`);
await ev(`GS.delivered = 3; true`);
ok(!(await poolHas()), "A: a pickup but 3 deliveries: not yet");
await ev(`GS.delivered = 10; true`);
ok(await poolHas(), "A: a pickup, no blade, 10 deliveries: a used blade can be listed");
await ev(`(() => { const p = TLX.state("plow"); p.blades[${JSON.stringify(u1)}] = { id: "b23", cond: 100, throw: "r" }; return 1; })()`);
ok(!(await poolHas()), "A: the pickup has a blade: none is listed");
await ev(`(() => { const p = TLX.state("plow"); delete p.blades[${JSON.stringify(u1)}]; p.shed.push("b23"); p.shedC.push(100); return 1; })()`);
ok(!(await poolHas()), "A: the blade is in the shed: none is listed");
await ev(`(() => { const p = TLX.state("plow"); p.shed.length = 0; p.shedC.length = 0; GS.mkt.held.push({ lid: -77, cat: "veh", item: "${IT}", site: "${siteA}", seller: "T", name: "x", cond: 0.7, adv: 0.7, paid: 1, state: "wait" }); return 1; })()`);
ok(!(await poolHas()), "A: one is paid for and waiting: no second is listed");
await ev(`GS.mkt.held = GS.mkt.held.filter(h => h.lid !== -77); true`);

// ---- B. the listing
await ev(`GS.mkt.list = GS.mkt.list.filter(l => l.cat !== "veh"); true`);
const L1 = await makeL(siteA, { adv: 0.72 });
ok(!!L1, "B: a used blade listing is made");
const inf = await J(`(() => { const l = GS.mkt.list.find(q => q.id === ${L1.id}), i = mktInfo(l), pic = mktPic(l), card = mktCardHtml(l, 0); return { name: i.name, stat: i.stat, newP: i.newP, kind: i.kind, pic: pic.length, card: card.replace(/<[^>]+>/g, " "), visible: mktVisible(l) }; })()`);
console.log("  listing:", inf.name, "|", inf.stat, "| asks", L1.ask, "| why:", L1.why);
ok(inf.name === "Fjellskjær 2.3 plow blade" && inf.newP === 1450 && inf.kind === "blade", "B: it is the Fjellskjær 2.3 plow blade, $1,450 new");
ok(/cutting edge 72%/.test(inf.stat) && /a new edge is \$168/.test(inf.stat) && /fits the/.test(inf.stat), "B: the card gives the cutting edge (72%) and what a new edge costs ($168)");
ok(L1.ask < 1450 && L1.ask > 400, `B: it asks less than a new one ($${L1.ask})`);
ok(inf.pic > 2000 && inf.visible && /Fjellskjær 2\.3 plow blade/.test(inf.card), "B: its photo draws and its card is on the board");
ok(await ev(`TLXPL.mkt.why().includes(${JSON.stringify(L1.why)}) && TLXPL.mkt.tell().includes(${JSON.stringify(L1.tell)})`), "B: the reason for selling and the lemon's tell are a blade's");
await ev(`MKT.view = ${L1.id}; MKT.cat = "veh"; TABLET.toggle(true, "market"); true`); await sleep(700);
await shot("u1_listing");
await ev(`MKT.view = null; TABLET.toggle(true, "market"); true`); await sleep(500);
await shot("u2_board");
await ev(`TABLET.toggle(false); true`); await sleep(300);

// ---- C. paid for by SEND from the sled
await onSled(); await away(siteA); await waitGame(0.4); await clearToasts();
const c0 = await ev("GS.cash");
await pay(L1.id); await sleep(400);
let t = await toasts();
ok(await heldN() === 1 && await ev("GS.cash") === c0 - L1.ask && !(await ev(`GS.mkt.list.some(l => l.id === ${L1.id})`)), `C: paid by SEND: $${L1.ask} gone once, the blade waits at the seller's`);
ok(t.some(x => /Sent /.test(x) && /come in a pickup/.test(x) && /280 kg/.test(x)), "C: the line says to come in a pickup: " + JSON.stringify(t.filter(x => /Sent /.test(x)).slice(0, 1)));
ok(await ev(`TLXV.mkt.payWhy({ cat: "veh", item: "pickup" }, GS.mkt.held) === ""`) , "C: a waiting blade is not a truck: a used pickup can still be paid for");
ok(await ev(`TLXV.state().owned.push({ uid: "vx1", id: "pickup", x: depot.x + 60, z: depot.z + 6, yaw: 0, fuel: 40, cond: 100, load: [] }, { uid: "vx2", id: "pickup", x: depot.x + 70, z: depot.z + 6, yaw: 0, fuel: 40, cond: 100, load: [] }) && true`), "C: (three trucks on the ground)");
await toSite(siteA); await clearToasts(); await ev(`MKT.nagT = -99; true`); await waitGame(4.6);     // past heldRefund's 2 s round, twice (the nag is said every 10 s of game time: its clock is wound back)
t = await toasts();
ok(await heldN() === 1 && await ev("GS.cash") === c0 - L1.ask && !t.some(x => /refunds/.test(x)), "C: stopped at the seller's on the sled with three trucks: not handed over, nothing refunded");
ok(t.some(x => /ready when you are/.test(x) && /280 kg/.test(x) && /come in the Fjellvogn/.test(x)), "C: the seller says to come in the pickup: " + JSON.stringify(t.filter(x => /ready/.test(x)).slice(0, 1)));
ok(await ev(`!jobsList().some(r => r.kind === "mkt" && r.obj && r.obj.item === "${IT}")`), "C: on the sled the Jobs app does not send you to collect it");
const heldCard = await ev(`mktHeldHtml(GS.mkt.held.find(h => h.item === "${IT}")).replace(/<[^>]+>/g, " ")`);
ok(/come in the Fjellvogn/.test(heldCard), "C: Bytteboden's order card says why it waits");
await ev(`(() => { const s = TLX.state("vehicles"); s.owned = s.owned.filter(r => r.uid !== "vx1" && r.uid !== "vx2"); return 1; })()`);

// ---- D. the order survives a reload
await away(siteA); await ev(`save(); true`);
await reload(); await ev(SETUP); await sleep(600);
const hD = await J(`GS.mkt.held.filter(h => h.item === "${IT}").map(h => ({ state: h.state, name: h.name, paid: h.paid, cond: h.cond }))`);
ok(hD.length === 1 && hD[0].state === "wait" && hD[0].paid === L1.ask && hD[0].cond === 0.72, "D: after a reload the blade still waits, paid for: " + JSON.stringify(hD));
ok((await plow()).shed.length === 0 && Object.keys((await plow()).blades).length === 0, "D: and no blade is yours yet");

// ---- E. collected in a pickup with no blade
const uE = await ev(`TLXV.state().owned[0].uid`);
ok(await inTruck(uE), "E: in the pickup"); await sleep(500);
ok(await ev(`jobsList().some(r => r.kind === "mkt" && r.obj && r.obj.item === "${IT}")`), "E: in the pickup the Jobs app lists the blade to collect");
await clearToasts();
await toSite(siteA);
ok(await waitUntil(`!!TLX.state("plow").blades[${JSON.stringify(uE)}]`, 8), "E: stopped at the seller's in the pickup: the blade is bolted on");
await sleep(300); t = await toasts();
const pE = await plow();
ok(pE.blades[uE] && pE.blades[uE].id === "b23" && pE.blades[uE].cond === 72 && pE.blades[uE].throw === "r" && pE.shed.length === 0, "E: its cutting edge is the listing's 72%: " + JSON.stringify(pE.blades[uE]));
ok(await heldN() === 0 && await ev("GS.cash") === 20000, "E: nothing waits any more (cash untouched since the reload's setup)");
ok(t.some(x => /helps you bolt the Fjellskjær 2\.3 onto the Fjellvogn/.test(x) && /Cutting edge 72%/.test(x) && /drops and lifts it/.test(x)), "E: the line says so and how to work it: " + JSON.stringify(t.filter(x => /bolt/.test(x)).slice(0, 1)));
ok(await ev(`(() => { const B = TLXPL.rt(${JSON.stringify(uE)}), R = TLXV.runtimeOf(${JSON.stringify(uE)}); return !!(B.grp && R && B.grp.parent === R.grp); })()`), "E: the blade's model is on the truck");
ok(await ev(`!!TLXPL.hull(TLXV.runtimeOf(${JSON.stringify(uE)}))`), "E: and it is part of the truck's hull");
let rw = await rows();
ok(rw.some(r => /^Take the Fjellskjær 2\.3 off/.test(r.n) && /Cutting edge 72%/.test(r.d)) && rw.some(r => /^Mend the cutting edge/.test(r.n) && r.p === "$168"), "E: the Plow tab shows it at 72%, a new edge $168");
ok(await ev(`(() => { const f = document.createElement("div"); VEH.tabs.find(t => t.id === "plow").render(f, () => { }); return /Used blades turn up on Bytteboden/.test(f.textContent); })()`), "E: the Plow tab's foot line points at Bytteboden");
ok(!(await poolHas()), "E: one pickup, one blade: no more are listed");

// ---- F. a lemon, bought in person in a pickup that already has a blade
await ev(`TLXV.state().owned.push({ uid: "vy1", id: "pickup", x: depot.x + 60, z: depot.z + 6, yaw: 0, fuel: 40, cond: 100, load: [] }); true`);
ok(await poolHas(), "F: a second pickup: a blade is listed again");
const L2 = await makeL(siteB, { adv: 0.8, real: 0.25, lemon: true });
ok(!!L2, "F: a lemon listing (80% in the ad, 25% in truth)");
await toSite(siteB); await waitGame(0.6); await clearToasts();
const cF = await ev("GS.cash");
await pay(L2.id);
ok(await waitUntil(`TLX.state("plow").shed.length === 1`, 8), "F: paid in person in the bladed pickup: the blade goes to the shed");
await sleep(2400); t = await toasts();
const pF = await plow();
ok(pF.shed[0] === "b23" && pF.shedC[0] === 25 && pF.blades[uE].cond === 72 && await ev("GS.cash") === cF - L2.ask, "F: with its real edge (25%); the fitted blade untouched; paid once: " + JSON.stringify({ shed: pF.shed, shedC: pF.shedC }));
ok(t.some(x => /already carries a blade/.test(x) && /garage's shed/.test(x) && /Cutting edge 25%/.test(x) && /cuts ragged/.test(x)), "F: the line says where it went and that it is ragged: " + JSON.stringify(t.filter(x => /already carries/.test(x)).slice(0, 1)));
ok(t.some(x => /Not what the ad said/.test(x) && /25%, not 80%/.test(x)), "F: the seller's lie is told: " + JSON.stringify(t.filter(x => /Not what/.test(x)).slice(0, 1)));
await ev(`(() => { const g = SITES.find(s => s.id === garageSite.id) || garageSite, r = TLXV.state().owned.find(q => q.uid === "vy1"); r.x = g.x + 14; r.z = g.z + 14; return 1; })()`);
rw = await rows();
const fitRow = rw.find(r => /^Fit the Fjellskjær 2\.3 to the Fjellvogn no\. 2/.test(r.n));
ok(fitRow && fitRow.p === "Yours · free" && fitRow.c === "" && /its cutting edge at 25%/.test(fitRow.d), "F: the Plow tab offers it to the second pickup for nothing, edge 25%: " + (fitRow ? fitRow.p : "no row"));
const cF2 = await ev("GS.cash");
ok(await ev(`TLXPL.fit("vy1", "b23")`) && await ev("GS.cash") === cF2, "F: fitted, no charge");
ok(await ev(`TLXPL.condOf("vy1") === 25 && TLXPL.leaveOf("vy1", TLXPL.BLADES[0]) === TLXPL.BL.raggedLeave && TLX.state("plow").shed.length === 0`), "F: on the truck it is at 25% and cuts ragged");

// ---- G. a blade for every pickup: a listing left on the board is hidden
await ev(`TLXV.state().owned.push({ uid: "vy2", id: "pickup", x: depot.x + 80, z: depot.z + 6, yaw: 0, fuel: 40, cond: 100, load: [] }); true`);
const L3 = await makeL(siteA, { adv: 0.7 });
ok(L3 && await ev(`mktVisible(GS.mkt.list.find(l => l.id === ${L3.id}))`), "G: three pickups, two blades: a listing shows");
await ev(`(() => { const p = TLX.state("plow"); p.blades.vy2 = { id: "b23", cond: 100, throw: "r" }; return 1; })()`);
ok(!(await ev(`mktVisible(GS.mkt.list.find(l => l.id === ${L3.id}))`)), "G: a new blade on the third: the listing is hidden");
ok(await ev(`TLXV.mkt.payWhy({ cat: "veh", item: "pickup" }, GS.mkt.held) !== ""`), "G: (and three trucks are still three trucks)");

await done(fails ? 1 : 0);
