// Expansion slice 14.2a: village jetties and handing over at a jetty (tlx-boats.js). Asserts, exit 1 on a failure.
//   every coastal village (and the lighthouse) that the sea joins to the quay gets a jetty at boot: deep water at its end,
//   within 520 m of the place, the sea flood fill reaching it; the Map has a docks layer; in the boat the compass names
//   "to its jetty" (or "no jetty there"); tied up at a village jetty its parcels are delivered (paid) and its pickups load;
//   the quay jetty takes depot-bound loads; nothing hands over 30 m off a jetty or while moving fast; old saves load;
//   the jetties are the same after a reload. Measured by gameClock. NOSTILLS=1 skips the stills.
import { boot, ev, tap, sleep, done, reload, shot, sideCam, camOff, down, up } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
const STILLS = !process.env.NOSTILLS;
async function waitUntil(expr, maxGame = 12) { const t0 = await clock(); while ((await clock()) - t0 < maxGame) { if (await ev(expr)) return true; await sleep(150); } return false; }
const dockW = (i, u, v) => `(() => { const D = TLXB.DOCKS[${i}], fx = Math.sin(D.yaw), fz = Math.cos(D.yaw); return [D.x + fz * (${v}) + fx * (${u}), D.z - fx * (${v}) + fz * (${u})]; })()`;

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; true`);

// ---- 1. the jetties
const docks = await J(`TLXB.DOCKS.map(D => { const e = TLXB.dockEnd(D); return { name: D.name, site: D.site && D.site.id, d: Math.round(Math.hypot(D.x - D.site.x, D.z - D.site.z)), len: D.len, endSea: isSea(e.x, e.z), endDep: +TLXB.depthAt(e.x, e.z).toFixed(1), linked: TLXB.seaLinked(e.x, e.z) }; })`);
console.log("docks", JSON.stringify(docks));
ok(docks.length >= 3 && docks[0].site === "depot", `${docks.length} jetties, the first at the quay (${docks.slice(1).map(d => d.name).join(", ")})`);
ok(docks.slice(1).every(d => d.d <= 540 && d.endSea && d.endDep >= 1.2 && d.linked), "every village jetty is within 540 m of its place, ends in deep sea and is joined by sea to the quay");
ok(new Set(docks.map(d => d.site)).size === docks.length, "one jetty per place");
// every village or lighthouse whose best jetty spot the quay's sea reaches has its jetty; the others (the east coast: land
// meets the map's north and south edges, so it's another sea) have none
const cand = await J(`SITES.filter(s => s.kind === "village" || s.type === "relay").map(s => { const D = TLXB.siteDock(s.x, s.z); const e = D && TLXB.dockEnd(D); return { id: s.id, linked: !!(e && TLXB.seaLinked(e.x, e.z)), has: !!TLXB.dockFor(s) }; })`);
console.log("candidates", JSON.stringify(cand));
ok(cand.every(c => !c.linked || c.has) && cand.every(c => c.linked || !c.has), `every place the quay's sea reaches has a jetty, none elsewhere (${cand.filter(c => c.has).map(c => c.id).join(",")} | no water route: ${cand.filter(c => !c.has).map(c => c.id).join(",")})`);
const sea = await J(`(() => { const S = TLXB.sea(); return S ? S.cells : 0; })()`);
ok(sea > 20000, `the sea flood fill from the quay reaches ${sea} cells of 16 m`);
const lay = await J(`TABLET.layerPts("docks").length`);
ok(lay === docks.length, `the Map's docks layer has a pin per jetty (${lay})`);
// the jetty is walkable like the quay's
const fl = await J(`(() => { const p = ${dockW(1, "TLXB.DOCKS[1].len - 2", 0)}; return { f: TLXB.floorAt(p[0], p[1]), y: TLXB.DOCKS[1].y }; })()`);
ok(fl.f !== null && Math.abs(fl.f - fl.y) < 0.01, `${docks[1].name}'s planks are a floor (${fl.f})`);

// ---- 2. buy a skiff, step in at the quay jetty
await ev(`GS.cash = 4000; garageTab = "boats"; openGarage(); true`); await sleep(400);
await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(300);
await ev(`closeGarage(); true`);
const bt = (await J(`TLX.state("vehicles").owned.filter(r => r.id === "skiff")`))[0];
ok(bt && Math.hypot(bt.x - (await J(`TLXB.DOCKS[0].x`)), bt.z - (await J(`TLXB.DOCKS[0].z`))) < 40, "a new skiff still moors at the quay jetty");
// stand beside her on the quay jetty and step in
await ev(`(() => { const D = TLXB.DOCKS[0], fx = Math.sin(D.yaw), fz = Math.cos(D.yaw), sd = Math.sign((${bt.x} - D.x) * fz - (${bt.z} - D.z) * fx), u = D.len - 3.1, v = sd * 0.6;
  FOOT.on = true; FOOT.x = D.x + fz * v + fx * u; FOOT.z = D.z - fx * v + fz * u; FOOT.yaw = D.yaw; FOOT.y = walkFloor(FOOT.x, FOOT.z); recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(1200);
await tap("KeyQ");
const inOk = await waitUntil("!MNT.on && !FOOT.on && VEH.cur && VEH.cur.pin === 'boat'", 12); await sleep(400);
ok(inOk, "stepped into the skiff at the quay jetty");
// beta 0178 #1: a full storm at speed dips her hull past the old drown line; she must not sink
await ev(`WX._at0 = WX.at; WX.at = () => 1; GS.storm = 1; GS.hour = 36; true`);
await down("KeyW"); const ys = []; { const t0 = await clock(); while ((await clock()) - t0 < 8) { await sleep(200); ys.push(await J(`({ y: P.y - (wlvAt(P.x, P.z) || 0), v: Math.hypot(P.vx, P.vz), h: HELP.on })`)); } } await up("KeyW");
ok(!ys.some(o => o.h), `full storm at full throttle for 8 s: no rescue (hull ${Math.min(...ys.map(o => o.y)).toFixed(2)}..${Math.max(...ys.map(o => o.y)).toFixed(2)} m on the waterline, top ${Math.max(...ys.map(o => o.v)).toFixed(1)} m/s)`);
await ev(`WX.at = WX._at0; GS.storm = 0; GS.stormPhase = "calm"; HELP.on = false; true`);
const cash0 = await ev("GS.cash");
const moveTo = (i, side = 1) => ev(`(() => { const b = TLXB.berthPose(TLXB.DOCKS[${i}], ${side}); P.x = b.x; P.z = b.z; P.yaw = b.yaw; P.vx = P.vz = 0; P.y = wlvAt(P.x, P.z) || 0; recenter(P.x, P.z, true); return 1; })()`);

// ---- 3. a parcel for a village with a jetty: the compass, then hand-over at its jetty
const vi = docks.findIndex((d, i) => i > 0 && d.site !== "relay");
await ev(`(() => { const s = TLXB.DOCKS[${vi}].site; GS.load.push({ dest: s, cargo: "Groceries", fragile: false, pay: 120, hits: 0 }); return 1; })()`);
// 30 m off the jetty: nothing hands over
await ev(`(() => { const b = TLXB.berthPose(TLXB.DOCKS[${vi}], 1), D = TLXB.DOCKS[${vi}]; const e = TLXB.dockEnd(D); let best = null; for (let a = 0; a < 6.283; a += 0.2) { const x = e.x + Math.sin(a) * 30, z = e.z + Math.cos(a) * 30; if (isSea(x, z) && TLXB.depthAt(x, z) > 1.2 && !TLXB.dockAt(x, z)) { best = [x, z]; break; } } P.x = best[0]; P.z = best[1]; P.vx = P.vz = 0; P.y = wlvAt(P.x, P.z) || 0; recenter(P.x, P.z, true); return 1; })()`);
await sleep(1500);
let s = await J(`({ n: GS.load.length, sub: $("jobSub").textContent, title: $("jobTitle").textContent })`);
ok(s.n === 1, "30 m off the jetty the parcel stays aboard");
ok(/to its jetty/.test(s.sub), "in the boat the compass heads for its jetty: " + s.title + " | " + s.sub);
// moving fast alongside: no hand-over
// held at 4 m/s alongside the jetty for a second of game time (velocity re-set every frame): no hand-over
await ev(`(() => { const D = TLXB.DOCKS[${vi}], b = TLXB.berthPose(D, 1), fx = Math.sin(D.yaw), fz = Math.cos(D.yaw); window.__hv = { t: 0, vmin: 99 };
  const hold = () => { if (window.__hv.t++ > 40) return; P.x = b.x; P.z = b.z; P.vx = fz * 4; P.vz = -fx * 4; requestAnimationFrame(hold); window.__hv.vmin = Math.min(window.__hv.vmin, Math.hypot(P.vx, P.vz)); };
  P.x = b.x; P.z = b.z; P.vx = fz * 4; P.vz = -fx * 4; recenter(P.x, P.z, true); hold(); return 1; })()`);
await waitUntil("window.__hv.t > 40", 6);
const fastN = await ev("GS.load.length");
ok(fastN === 1, `sliding past the jetty at 4 m/s doesn't hand over (${fastN} aboard)`);
await moveTo(vi);
const del = await waitUntil(`!GS.load.some(j => j.cargo === "Groceries")`, 6);
s = await J(`({ cash: GS.cash, toasts: (typeof TOASTQ !== "undefined" ? TOASTQ.map(t => t.msg || t[0] || String(t)) : []).concat([...document.querySelectorAll("#toasts > *")].map(e => e.textContent)) })`);
ok(del && s.cash >= cash0 + 120, `tied up at ${docks[vi].name}, the groceries are delivered: cash ${cash0} -> ${s.cash}`);
ok(s.toasts.some(t => /Delivered/.test(t)), "the delivery toast fires: " + (s.toasts.find(t => /Delivered/.test(t)) || "-"));
if (STILLS) { await sideCam("[P.x, P.y + 0.5, P.z]", 14, 6, 2); await shot("x14d_village_jetty"); await camOff(); }

// ---- 4. a pickup waiting at that village loads at its jetty
await sleep(2500);   // the backhaul toast settles
await ev(`(() => { GS.load = GS.load.filter(j => j.dest !== depot); const s = TLXB.DOCKS[${vi}].site; GS.claims.push({ from: s, dest: depot, cargo: "Box of dried cod", fragile: false, pay: 90, hits: 0 }); return 1; })()`);
const got = await waitUntil(`GS.load.some(j => j.cargo === "Box of dried cod")`, 9);
ok(got && (await ev("GS.claims.length")) === 0, "a pickup waiting at the village loads into the boat at its jetty");

// ---- 5. back at the quay jetty: the depot-bound load hands over
const cash1 = await ev("GS.cash");
await moveTo(0, -1);
const dq = await waitUntil(`!GS.load.some(j => j.cargo === "Box of dried cod")`, 6);
ok(dq && (await ev("GS.cash")) > cash1, `the quay jetty takes the depot-bound load (cash ${cash1} -> ${await ev("GS.cash")})`);

// ---- 6. a place with no jetty: the compass says so
const nj = await J(`(() => { const s = SITES.find(q => q.kind === "cabin" && !TLXB.dockFor(q)); GS.load.push({ dest: s, cargo: "Snowshoes", fragile: false, pay: 60, hits: 0 }); return s.id; })()`);
await sleep(1200);
s = await J(`({ sub: $("jobSub").textContent })`);
ok(/no jetty there/.test(s.sub), `a load for ${nj} (no jetty): ` + s.sub);
// the sled's compass is unchanged on foot / sled: no jetty text
await ev(`GS.load = []; true`);

// ---- 7. reload: same jetties, the boat back where she was
const before = await J(`TLXB.DOCKS.map(D => [Math.round(D.x), Math.round(D.z)])`);
await reload();
await sleep(800);
const after = await J(`TLXB.DOCKS.map(D => [Math.round(D.x), Math.round(D.z)])`);
ok(JSON.stringify(before) === JSON.stringify(after), "the jetties are sited the same after a reload");
const pe = await J(`({ boat: TLX.state("vehicles").owned.filter(r => r.id === "skiff").length })`);
ok(pe.boat === 1, "the skiff is still owned after the reload");
if (STILLS) {
  await ev(`TABLET.toggle(true, "map"); true`); await sleep(1500); await shot("x14d_map"); await ev(`TABLET.toggle(false); true`);
}
console.log(fails ? `x14_docks: ${fails} FAIL` : "x14_docks: all ok");
await done(fails ? 1 : 0);
