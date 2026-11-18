// Beta break test for 3.5b3b used tractor units (tester 1, pass of 18 Nov). Tries to break what x3_usedlorry.mjs does not:
//   A. paid by SEND, reload before collecting: the order survives and still collects at the seller's door
//   B. collected while sat at the wheel of another truck (its record is stale while it is the active vehicle)
//   C. truck cap: 2 trucks owned + a pickup paid for and waiting + a lorry listing bought in person: never 4 trucks
//   D. Freight licence gone with a lorry order waiting: refund
//   E. sold-back lorry: pool lists a tractor again
// Asserts, exit 1 on a failure; no stills.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(120); }
async function waitUntil(expr, maxGame = 12) { const t0 = await clock(); while ((await clock()) - t0 < maxGame) { if (await ev(expr)) return true; await sleep(150); } return false; }
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80);
  return 1; })()`);
const setup = () => ev(`crashCancel(); FOOT.on = false; GS.hour = 12; GS.storm = 0; WX.at = () => 0; TLX.setOn("traffic", false); GS.load = []; GS.claims = []; GS.apps.freight = 1; GS.signed.freight = true; GS.lic.freight = true; GS.delivered = 10; GS.cash = 80000; true`);
const makeL = (site, item, lemon) => J(`(() => { let l = null; for (let i = 0; i < 9000 && !l; i++) { const q = mktMake(CAL.abs()); if (q && q.cat === "veh" && q.item === "${item}") l = q; }
  if (!l) return null; l.site = "${site}"; l.lemon = ${lemon}; l.real = l.adv; l.life = 200; l.mute = false; l.deal = null; GS.mkt.list.push(l); return { id: l.id, site: l.site, ask: l.ask, seller: l.seller }; })()`);
const toSite = id => J(`(() => { const s = SITES.find(q => q.id === "${id}"); crashCancel(); FOOT.on = false;
  for (let r = 8; r < 21; r += 2) for (let a = 0; a < 6.28; a += 0.4) { const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
    if (isSea(x, z) || isWater(x, z) || obNear(x, z, 3)) continue;
    P.x = x; P.z = z; P.y = surf(x, z) + 0.2; P.vx = P.vy = P.vz = 0; recenter(x, z, true); return { x, z, r }; }
  return null; })()`);
const away = id => ev(`(() => { const s = SITES.find(q => q.id === "${id}"); P.x = s.x + 900; P.z = s.z; recenter(P.x, P.z, true); return 1; })()`);
const trucks = () => J(`TLX.state("vehicles").owned.map(r => ({ uid: r.uid, id: r.id, x: r.x, z: r.z, cond: r.cond }))`);

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await setup();
const ms = await J(`(() => { const ms = mktSites(), ok = TLXV.mkt.sitesFor("tractor", ms), bs = TLXRIG.bays(); return ok.map(s => ({ id: s.id, d: Math.min(...bs.map(b => Math.hypot(b.x - s.x, b.z - s.z))) })).sort((a, b) => a.d - b.d); })()`);
const site = ms[0].id, site2 = (ms[1] || ms[0]).id;
console.log("seller sites:", JSON.stringify(ms.slice(0, 3)));

// ---- A. SEND then reload then collect
await clearToasts();
const L1 = await makeL(site, "tractor", false);
await away(site);
await ev(`mktPay(GS.mkt.list.find(l => l.id === ${L1.id})); true`); await sleep(400);
ok(await ev(`GS.mkt.held.some(h => h.item === "tractor")`), "A: paid by SEND, order waits");
await ev(`save(); true`); await reload(); await sleep(900);
await ev(`FOOT.on = false; GS.hour = 12; WX.at = () => 0; TLX.setOn("traffic", false); true`);
ok(await ev(`GS.mkt.held.some(h => h.item === "tractor")`), "A: order survives a reload");
ok((await trucks()).length === 0, "A: nothing on the ground yet");
await toSite(site);
ok(await waitUntil(`TLX.state("vehicles").owned.some(r => r.id === "tractor")`, 10), "A: collected after the reload");

// ---- B. collect while at the wheel of another truck
await ev(`GS.cash = 80000; GS.delivered = 10; GS.lic.freight = true; true`);
const t0 = await trucks();
const pk = await J(`(() => { const s = TLX.state("vehicles"); s.owned.push({ uid: "v" + (++s.seq), id: "pickup", x: depot.x + 30, z: depot.z + 5, yaw: 0, fuel: 60, cond: 100, load: [] }); return s.owned[s.owned.length - 1].uid; })()`);
await ev(`TLXV.swapTo(${JSON.stringify(pk)}); FOOT.on = false; true`); await sleep(1200);
const L2 = await makeL(site2, "tractor", false);
await toSite(site2);
await ev(`mktPay(GS.mkt.list.find(l => l.id === ${L2.id})); true`); await sleep(500);
const okB = await waitUntil(`TLX.state("vehicles").owned.filter(r => r.id === "tractor").length === 2`, 8);
ok(okB, "B: collected with the pickup as the active vehicle (" + JSON.stringify(await toasts()).slice(0, 200) + ")");
const t1 = await trucks();
const nf = t1.filter(r => !Number.isFinite(r.x) || !Number.isFinite(r.z));
ok(nf.length === 0, "B: every truck record has finite coordinates");
ok(await ev(`TLX.state("vehicles").cur === ${JSON.stringify(pk)}`), "B: still at the pickup's wheel");
await ev(`TLXV.swapTo(null); true`); await sleep(800);

// ---- C. cap: owned (3 now) -> trim to 2, hold a pickup, buy a lorry listing in person
await ev(`TLX.state("vehicles").owned.length = 2; true`);
const own = await trucks();
console.log("owned for C:", own.map(r => r.id).join(","));
const L3 = await makeL(site, "tractor", false);   // listed BEFORE the pickup is paid for
await ev(`window.__keep = GS.mkt.list.filter(l => l.id === ${L3.id}); GS.mkt.list = GS.mkt.list.filter(l => l.id !== ${L3.id}); true`);
const LP = await makeL(site2, "pickup", false);
await ev(`GS.mkt.list.push(...window.__keep); true`);
await away(site2);
await ev(`mktPay(GS.mkt.list.find(l => l.id === ${LP.id})); true`); await sleep(400);
const heldP = await ev(`GS.mkt.held.some(h => h.item === "pickup")`);
console.log("pickup held:", heldP);
await toSite(site); await waitGame(0.8);
await clearToasts();
await ev(`mktPay(GS.mkt.list.find(l => l.id === ${L3.id})); true`); await sleep(500);
const after = await trucks();
const heldN = await ev(`GS.mkt.held.filter(h => h.cat === "veh" && h.item !== "haul").length`);
console.log("after C: owned", after.length, "held", heldN, JSON.stringify((await toasts()).slice(0, 4)));
ok(after.length + heldN <= 3, `C: never more than 3 trucks owned + paid for (owned ${after.length}, held ${heldN})`);
// now collect the pickup at its seller
await toSite(site2); await waitGame(3);
const fin = (await trucks()).length, finHeld = await ev(`GS.mkt.held.filter(h => h.cat === "veh" && h.item !== "haul").length`);
ok(fin <= 3, `C: after collecting everything: ${fin} trucks on the ground, ${finHeld} still held`);

// ---- D. licence gone with an order waiting -> refund
await ev(`TLX.state("vehicles").owned.length = 0; GS.mkt.held = []; GS.cash = 80000; GS.mkt.list = GS.mkt.list.filter(l => l.cat !== "veh"); true`);   // since the 0228 #1 fix C's lorry listing is still on the board (refused), and the board lists nothing twice
const L4 = await makeL(site, "tractor", false);
await away(site);
const c0 = await ev("GS.cash");
await ev(`mktPay(GS.mkt.list.find(l => l.id === ${L4.id})); true`); await sleep(400);
const paid = c0 - await ev("GS.cash");
await clearToasts();
await ev(`GS.lic.freight = false; true`); await waitUntil(`!GS.mkt.held.some(h => h.item === "tractor")`, 8); await sleep(300);   // the refund round is every 2 s of GAME time: a fixed 2.8 s wall sleep missed it on a loaded machine
const c1 = await ev("GS.cash");
ok(!(await ev(`GS.mkt.held.some(h => h.item === "tractor")`)) && c1 === c0, `D: licence gone: order refunded (paid ${paid}, cash back to ${c1} vs ${c0})`);
ok((await toasts()).some(t => /refunds/.test(t)), "D: and a toast says so");
await ev(`GS.lic.freight = true; true`);

// ---- E. collect, then sell it back; the pool lists a tractor again
const L5 = await makeL(site, "tractor", false);
await toSite(site);
await ev(`mktPay(GS.mkt.list.find(l => l.id === ${L5.id})); true`);
ok(await waitUntil(`TLX.state("vehicles").owned.some(r => r.id === "tractor")`, 8), "E: collected");
await ev(`TLX.state("vehicles").owned.length = 0; true`);
const pool = await J(`mktPool("veh").map(p => p.item)`);
ok(pool.includes("tractor"), `E: with the lorry gone a tractor unit lists again (${pool})`);

await done(fails ? 1 : 0);
