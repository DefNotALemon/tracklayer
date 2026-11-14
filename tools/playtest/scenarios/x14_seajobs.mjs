// Expansion slice 14.2b: sea jobs for skiff owners, the BY BOAT tag, a jetty's warmth (tlx-boats.js). Asserts, exit 1 on a failure.
//   no sea jobs without a boat; with one the board posts them (the first from the jetty nearest the boat), priced by the
//   distance by sea; the Parcels card and the Jobs row carry BY BOAT; claimed on the sled at the quay it does NOT load,
//   in the boat alongside the jetty it does; it hands over at the destination's jetty and pays; a sled can neither load
//   nor deliver one; a snowed-in road at posting adds 35% and a chip; the ordinary board still refills with sea jobs on
//   it and sea jobs survive a board rebuild; tied up at a jetty you warm up, and the quay jetty fills the tank.
//   Measured by gameClock. NOSTILLS=1 skips the stills.
import { boot, ev, tap, sleep, done, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
const STILLS = !process.env.NOSTILLS;
async function waitUntil(expr, maxGame = 12) { const t0 = await clock(); while ((await clock()) - t0 < maxGame) { if (await ev(expr)) return true; await sleep(150); } return false; }
async function gameWait(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
const moveTo = (i, side = 1) => ev(`(() => { const b = TLXB.berthPose(TLXB.DOCKS[${i}], ${side}); P.x = b.x; P.z = b.z; P.yaw = b.yaw; P.vx = P.vz = 0; P.y = wlvAt(P.x, P.z) || 0; recenter(P.x, P.z, true); return 1; })()`);
const toasts = () => J(`(typeof TOASTQ !== "undefined" ? TOASTQ.map(t => t.msg || t[0] || String(t)) : []).concat([...document.querySelectorAll("#toasts > *")].map(e => e.textContent))`);
const seaJ = `GS.jobs.filter(j => j.sea).map(j => ({ cargo: j.cargo, from: j.from.id, dest: j.dest.id, km: j.seaKm, pay: j.pay, shut: j.shut || "", fragile: !!j.fragile }))`;

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; true`);

// ---- 1. no boat, no sea jobs
await gameWait(7);
ok((await J(seaJ)).length === 0, "without a boat the board has no sea jobs");

// ---- 2. buy a skiff: the board posts sea freight
await ev(`GS.cash = 4000; garageTab = "boats"; openGarage(); true`); await sleep(400);
await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(300);
await ev(`closeGarage(); true`);
const posted = await waitUntil(`GS.jobs.some(j => j.sea)`, 10);
let sj = await J(seaJ);
console.log("posted", JSON.stringify(sj));
ok(posted && sj.length === 1, "owning a skiff, a sea job is posted within 10 game seconds");
ok(sj[0] && sj[0].from === "depot", `the first one leaves from the jetty nearest the boat (${sj[0] && sj[0].from})`);
ok(sj[0] && await ev(`!!TLXB.dockFor(SITES.find(s => s.id === ${JSON.stringify(sj[0].dest)}))`), `its destination has a jetty (${sj[0] && sj[0].dest})`);
// the distances by sea, every pair
const pairs = await J(`(() => { const o = []; for (const A of TLXB.DOCKS) for (const B of TLXB.DOCKS) if (A !== B) o.push({ a: A.name, b: B.name, sea: +TLXB.seaKm(A, B).toFixed(2), crow: +(Math.hypot(A.x - B.x, A.z - B.z) / 1000).toFixed(2) }); return o; })()`);
console.log("sea km", pairs.map(p => `${p.a}>${p.b} ${p.sea} (crow ${p.crow})`).join(" | "));
ok(pairs.every(p => p.sea >= p.crow - 0.01 && p.sea < p.crow * 3.5 && p.sea > 0.2), "by sea every jetty pair is at least the crow's line and under 3.5x it");
ok(pairs.every(p => Math.abs(p.sea - pairs.find(q => q.a === p.b && q.b === p.a).sea) < 0.15), "the distance by sea is the same both ways (within 150 m)");
{ const j = sj[0], mult = await J(`TLXB.ROW.slots`); const base = 45 + j.km * 130; ok(j.pay >= base * 0.8 && j.pay <= base * 1.3 * 1.36, `pay follows the sea distance: ${j.km} km -> $${j.pay} ($${(j.pay / j.km).toFixed(0)}/km; a sled parcel pays about $120/km plus climb)`); void mult; }
// the notification
const note = await J(`[...document.querySelectorAll("#tnote, .tnote, #notes > *")].map(e => e.textContent).join(" | ")`);
console.log("notify:", note.slice(0, 200));

// ---- 3. the Parcels card
await ev(`TABLET.toggle(true, "parcels"); true`); await sleep(1200);
let html = await ev(`document.getElementById("tabV").innerText`);
ok(/by sea/.test(html), "the Parcels board lists it with its distance by sea");
await ev(`(() => { const r = [...document.querySelectorAll(".pbr.job")].find(e => e.textContent.includes(${JSON.stringify(sj[0].cargo)})); if (r) r.click(); return !!r; })()`); await sleep(700);
html = await ev(`document.getElementById("tabV").innerText`);
ok(/BY BOAT/.test(html) && /Goes by boat/.test(html), "selected, the card shows the BY BOAT chip and says how it works");
if (STILLS) await shot("x14s_card");
// claim it with the card's button (a click, as a tap would)
const btnOk = await ev(`(() => { const b = [...document.querySelectorAll("[data-a]")].find(e => /CLAIM/.test(e.textContent)); if (b) b.click(); return !!b; })()`); await sleep(500);
let c = await J(`({ claims: GS.claims.filter(j => j.sea).length, load: GS.load.filter(j => j.sea).length, near: GS.near && GS.near.id, foot: FOOT.on })`);
ok(btnOk && c.claims === 1, `the CLAIM button claims it (${JSON.stringify(c)})`);
ok((await toasts()).some(t => /by boat/.test(t) && /quay jetty/.test(t)), "the claim toast says it waits on the quay jetty for the boat");
await ev(`TABLET.toggle(false); true`);

// ---- 4. on the sled at the quay it does not load
await ev(`(() => { P.x = depot.x + 4; P.z = depot.z + 4; P.vx = P.vz = 0; recenter(P.x, P.z, true); return 1; })()`);
await gameWait(3);
c = await J(`({ claims: GS.claims.filter(j => j.sea).length, load: GS.load.filter(j => j.sea).length, near: GS.near && GS.near.id })`);
ok(c.near === "depot" && c.claims === 1 && c.load === 0, `stopped at the quay on the sled, the sea job stays claimed, not loaded (${JSON.stringify(c)})`);
// the Jobs row and the compass
const row = await J(`(() => { const r = jobsList().find(e => e.obj && e.obj.sea); jobTrack(r.obj, true); return { chips: r.chips, meta: r.meta, road: r.road || "" }; })()`);
await sleep(600);
const sub0 = await ev(`$("jobSub").textContent`);
ok(/BY BOAT/.test(row.chips) && /for the boat/.test(row.meta), "the Jobs row carries BY BOAT: " + row.meta);
ok(/it goes by boat/.test(sub0), "on the sled the compass line says it goes by boat: " + sub0);

// ---- 5. the ordinary board still refills, and sea jobs survive a rebuild
await ev(`GS.jobs = GS.jobs.filter(j => j.sea); TLXB.seaPost(); tabWork(); true`);
await gameWait(1);
c = await J(`({ plain: GS.jobs.filter(j => !j.sea).length, sea: GS.jobs.filter(j => j.sea).length })`);
ok(c.plain >= 1 && c.sea >= 1, `with only sea jobs left on it the board posts ordinary parcels again, and the sea job stays (${JSON.stringify(c)})`);
await ev(`GS.jobs = []; makeJobs(depot); true`); await gameWait(1);
c = await J(`({ plain: GS.jobs.filter(j => !j.sea).length, sea: GS.jobs.filter(j => j.sea).length })`);
ok(c.sea >= 1, `a rebuilt board gets its untaken sea jobs back (${JSON.stringify(c)})`);

// ---- 6. a sled can neither load nor deliver sea freight (the gate itself, with no vehicle swapped in)
const gate = await J(`(() => { const s = TLXB.DOCKS[1].site, cur = VEH.cur; VEH.cur = null; const cash = GS.cash;
  const L = { dest: s, cargo: "Crab pots (test)", fragile: false, pay: 100, hits: 0, sea: true }; GS.load.push(L); deliver(s); const kept = GS.load.includes(L); GS.load = GS.load.filter(j => j !== L);
  const C = { from: s, dest: depot, cargo: "Net floats (test)", fragile: false, pay: 100, sea: true }; GS.claims.push(C); collectClaims(s); const waits = GS.claims.includes(C); GS.claims = GS.claims.filter(j => j !== C); GS.load = GS.load.filter(j => j !== C);
  VEH.cur = cur; return { kept, waits, paid: GS.cash - cash }; })()`);
ok(gate.kept && gate.paid === 0, "deliver() at the village from a sled leaves a sea parcel aboard, unpaid");
ok(gate.waits, "collectClaims() at the village from a sled leaves a sea pickup waiting");

// ---- 7. step into the boat at the quay jetty: it loads; warmth and fuel while tied up
const bt = (await J(`TLX.state("vehicles").owned.filter(r => r.id === "skiff")`))[0];
await ev(`(() => { const D = TLXB.DOCKS[0], fx = Math.sin(D.yaw), fz = Math.cos(D.yaw), sd = Math.sign((${bt.x} - D.x) * fz - (${bt.z} - D.z) * fx), u = D.len - 3.1, v = sd * 0.6;
  FOOT.on = true; FOOT.x = D.x + fz * v + fx * u; FOOT.z = D.z - fx * v + fz * u; FOOT.yaw = D.yaw; FOOT.y = walkFloor(FOOT.x, FOOT.z); recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(1200);
await tap("KeyQ");
const inOk = await waitUntil("!MNT.on && !FOOT.on && VEH.cur && VEH.cur.pin === 'boat'", 12);
ok(inOk, "stepped into the skiff at the quay jetty");
const loaded = await waitUntil(`GS.load.some(j => j.sea)`, 8);
c = await J(`({ claims: GS.claims.filter(j => j.sea).length, load: GS.load.filter(j => j.sea).length, slots: ST.slots })`);
ok(loaded && c.claims === 0, `alongside the quay jetty the claimed sea job loads into the boat (${JSON.stringify(c)})`);
ok((await toasts()).some(t => /Loaded: /.test(t)), "the Loaded toast fires");
await ev(`GS.hour = 34; GS.warmth = 50; GS.fuel = 6; true`);
await gameWait(2.5);
let w = await J(`({ warm: +GS.warmth.toFixed(1), fuel: +GS.fuel.toFixed(1), cap: GS.cap, shore: VEH.cur.shore() && VEH.cur.shore().id })`);
ok(w.shore === "depot" && w.warm > 60 && w.fuel > 12, `tied up at the quay jetty you warm up and she fills: warmth 50 -> ${w.warm}, fuel 6 -> ${w.fuel} of ${w.cap} L`);
// in the boat the compass heads for the destination's jetty
await sleep(500);
const sub1 = await ev(`$("jobSub").textContent`);
ok(/to its jetty/.test(sub1) && !/road|snowed/.test(sub1), "aboard, the compass heads for its jetty and leaves the roads out of it: " + sub1);

// ---- 8. 80 m off: cold again; then the destination's jetty: paid
const dest = sj[0].dest, di = await J(`TLXB.DOCKS.findIndex(D => D.site.id === ${JSON.stringify(dest)})`);
await ev(`(() => { const D = TLXB.DOCKS[${di}], e = TLXB.dockEnd(D); let best = null; for (let r = 80; r < 200 && !best; r += 20) for (let a = 0; a < 6.283; a += 0.2) { const x = e.x + Math.sin(a) * r, z = e.z + Math.cos(a) * r; if (isSea(x, z) && TLXB.depthAt(x, z) > 1.2 && !TLXB.dockAt(x, z)) { best = [x, z]; break; } } P.x = best[0]; P.z = best[1]; P.vx = P.vz = 0; P.y = wlvAt(P.x, P.z) || 0; recenter(P.x, P.z, true); GS.warmth = 80; return 1; })()`);
await gameWait(3);
w = await J(`({ warm: +GS.warmth.toFixed(2), shore: VEH.cur.shore(), n: GS.load.filter(j => j.sea).length })`);
ok(!w.shore && w.warm < 80 && w.n === 1, `off the jetty she's an open boat again: warmth 80 -> ${w.warm}, the freight still aboard`);
const cash0 = await ev("GS.cash"), pay = await J(`GS.load.find(j => j.sea).pay`);
await moveTo(di);
const del = await waitUntil(`!GS.load.some(j => j.sea)`, 6);
const cash1 = await ev("GS.cash");
ok(del && cash1 >= cash0 + pay, `tied up at the ${dest} jetty the sea freight is handed over: cash ${cash0} -> ${cash1} (pay $${pay})`);
ok((await toasts()).some(t => /Delivered/.test(t)), "the delivery toast fires: " + ((await toasts()).find(t => /Delivered/.test(t)) || "-"));
await ev(`GS.warmth = 40; true`); const f0 = await ev("GS.fuel");
await gameWait(2.5);
w = await J(`({ warm: +GS.warmth.toFixed(1), fuel: GS.fuel, shore: VEH.cur.shore() && VEH.cur.shore().id })`);
ok(w.shore === dest && w.warm > 50, `tied up at a village jetty you have the village's warmth: 40 -> ${w.warm}`);
if (STILLS) await shot("x14s_tiedup");

// ---- 9. a snowed-in road when the job is posted: +35% and a chip
const sh = await J(`(() => { const t0 = TLXR.tripWarn; GS.jobs = GS.jobs.filter(j => !j.sea); TLXR.tripWarn = () => ""; const a = TLXB.seaPost(); TLXR.tripWarn = () => "fv888 snowed in"; const b = TLXB.seaPost(); TLXR.tripWarn = t0;
  const mul = c => ({ "Fish boxes on ice": 1, "Coils of longline": 0.95, "Crab pots": 0.9, "An outboard for the workshop": 1.15, "A drum of marine diesel": 1.05, "Tubs of salmon smolt": 1.25, "Net floats and rope": 0.85, "Bales of klippfisk": 1, "Lamp glass for the lighthouse": 1.2 })[c];
  return { a: { pay: a.pay, base: (45 + a.seaKm * 130) * mul(a.cargo), shut: a.shut || "", chips: parcelChips(a) }, b: { pay: b.pay, base: (45 + b.seaKm * 130) * mul(b.cargo), shut: b.shut || "", chips: parcelChips(b) } }; })()`);
console.log("shut", JSON.stringify({ a: [sh.a.pay, +sh.a.base.toFixed(0)], b: [sh.b.pay, +sh.b.base.toFixed(0)] }));
ok(!sh.a.shut && Math.abs(sh.a.pay / sh.a.base - 1) < 0.08 && !/ROAD SHUT/.test(sh.a.chips), `open road: plain pay ($${sh.a.pay} for a base of $${sh.a.base.toFixed(0)}), no chip`);
ok(sh.b.shut && Math.abs(sh.b.pay / sh.b.base - 1.35) < 0.08 && /ROAD SHUT \+35%/.test(sh.b.chips), `road snowed in: 35% over ($${sh.b.pay} for a base of $${sh.b.base.toFixed(0)}) and the ROAD SHUT chip`);
// no more than a boatful claimed
const cap = await J(`(() => { let n = 0; for (let k = 0; k < 8; k++) { const j = TLXB.seaPost(); if (!j) break; takeParcel(GS.jobs.indexOf(j)); n = GS.claims.filter(c => c.sea).length; } return n; })()`);
ok(cap === 4, `sea claims stop at a boatful (${cap})`);

console.log(fails ? `x14_seajobs: ${fails} FAIL` : "x14_seajobs: all ok");
await done(fails ? 1 : 0);
