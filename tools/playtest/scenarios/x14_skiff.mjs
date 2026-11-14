// Expansion slice 14.1: the skiff and the small-boat jetty (tlx-boats.js). Asserts, exit 1 on a failure.
//   the jetty is sited off a low bit of shore near the quay and you can walk out along its planks (past the sea wall, at
//   deck height); the garage's Boats tab sells the skiff and moors it at a berth; walking up makes it the current vehicle
//   and the hint names it; Q steps in (animation completes, seated, the walker hidden); W gets her onto the plane (speed
//   by gameClock, floating at the waterline, no dunking); the tiller turns her; reverse stops her; driving at the shore
//   grounds her in the water without crossing onto land; Q steps out onto standable ground; fuel burns; save -> reload()
//   keeps the boat, and a reload while seated comes back seated and afloat; the pad (LB) gets in too.
// Headless Chrome runs ~0.6x real time: everything is measured by gameClock. NOSTILLS=1 skips the stills.
import { boot, ev, tap, sleep, done, reload, down, up, shot, sideCam, camOff, padSet } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
const STILLS = !process.env.NOSTILLS;
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(150); }
async function waitUntil(expr, maxGame = 12) { const t0 = await clock(); while ((await clock()) - t0 < maxGame) { if (await ev(expr)) return true; await sleep(150); } return false; }
const holdFor = async (codes, secs, fn) => { codes = [].concat(codes); for (const c of codes) await down(c); const t0 = await clock(), out = [];
  try { for (;;) { await sleep(250); const t = await clock(); out.push(await fn()); if (t - t0 >= secs) break; } } finally { for (const c of codes) await up(c); } return out; };
const B = () => J(`{ t: +gameClock.toFixed(2), v: +Math.hypot(P.vx, P.vz).toFixed(2), x: P.x, z: P.z, y: +P.y.toFixed(3), yaw: P.yaw, dep: +TLXB.depthAt(P.x, P.z).toFixed(2), help: HELP.on, foot: FOOT.on, fuel: GS.fuel, ag: TLXV.rt ? 0 : 0 }`);
const dockW = (u, v) => `(() => { const D = TLXB.DOCKS[0], fx = Math.sin(D.yaw), fz = Math.cos(D.yaw); return [D.x + fz * (${v}) + fx * (${u}), D.z - fx * (${v}) + fz * (${u})]; })()`;
const putWalker = (u, v, yawExpr = "TLXB.DOCKS[0].yaw") => ev(`(() => { const p = ${dockW(u, v)}; FOOT.on = true; FOOT.x = p[0]; FOOT.z = p[1]; FOOT.yaw = ${yawExpr}; FOOT.y = walkFloor(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; true`);

// ---- 1. the jetty
let s = await J(`(() => { const D = TLXB.DOCKS[0]; if (!D) return { n: 0 }; const m = ${dockW("D.len - 2", 0)}; return { n: TLXB.DOCKS.length, dd: Math.hypot(D.x - depot.x, D.z - depot.z), len: D.len, y: D.y, gy: D.gy, fl: TLXB.floorAt(m[0], m[1]), sea: isSea(m[0], m[1]), dep: TLXB.depthAt(m[0], m[1]), tabs: VEH.tabs.map(t => t.name) }; })()`);
console.log("dock", JSON.stringify(s));
ok(s.n >= 1 && s.dd < 300, `a jetty is sited near the quay (${s.dd && s.dd.toFixed(0)} m from the depot, ${s.len} m long)`);
ok(s.sea && s.dep > 1 && Math.abs(s.fl - s.y) < 0.01, `its outer end stands over ${s.dep && s.dep.toFixed(1)} m of sea with planks at ${s.y} m`);
ok(s.tabs.includes("Boats") && s.tabs.indexOf("Trucks") < s.tabs.indexOf("Boats"), "the garage has a Boats tab after Trucks: " + s.tabs.join(","));
// walk out along it: the sea wall lets you onto the planks, at deck height
await putWalker(1, 0); await sleep(500);
const w0 = await J(`({ x: FOOT.x, z: FOOT.z })`);
await holdFor("KeyW", 3, async () => 0);
s = await J(`(() => { const D = TLXB.DOCKS[0], fx = Math.sin(D.yaw), fz = Math.cos(D.yaw), u = (FOOT.x - D.x) * fx + (FOOT.z - D.z) * fz; return { u, y: FOOT.y, fl: TLXB.floorAt(FOOT.x, FOOT.z), sea: isSea(FOOT.x, FOOT.z), on: FOOT.on }; })()`);
ok(s.u > 2.5 && s.fl !== null && Math.abs(s.y - s.fl) < 0.08, `walking out along the jetty: ${s.u.toFixed(1)} m out, boots at ${s.y.toFixed(2)} on planks at ${s.fl && s.fl.toFixed(2)}${s.sea ? " (over the sea)" : ""}`);
// the edge is still the sea: walking off sideways stops at the planks
await putWalker(6, 0, "TLXB.DOCKS[0].yaw + Math.PI / 2"); await sleep(300);
await holdFor("KeyW", 2, async () => 0);
s = await J(`({ fl: TLXB.floorAt(FOOT.x, FOOT.z), y: FOOT.y })`);
ok(s.fl !== null, "walking off the side of the jetty stops at its edge (no walking on water)");

// ---- 2. buying
await ev(`FOOT.on = false; crashCancel(); GS.cash = 4000; true`); await sleep(300);
await ev(`garageTab = "boats"; openGarage(); true`); await sleep(500);
s = await J(`({ rows: [...document.querySelectorAll("#garageBody .row")].map(b => b.textContent) })`);
ok(s.rows.length >= 1 && /Fjordsnekka/.test(s.rows[0]) && /\$2600/.test(s.rows[0]), "the Boats tab lists the skiff at $2600");
await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400);
await ev(`closeGarage(); true`);
const bt = (await J(`TLX.state("vehicles").owned.filter(r => r.id === "skiff")`))[0];
ok(bt && (await ev("GS.cash")) === 1400, "buying took $2600 and added a skiff record");
s = await J(`({ dep: TLXB.depthAt(${bt.x}, ${bt.z}), sea: isSea(${bt.x}, ${bt.z}), fuel: ${bt.fuel}, trucks: VEH.tabs.length })`);
ok(s.sea && s.dep >= 0.9 && s.fuel === 25, `she's moored at a berth in ${s.dep.toFixed(1)} m of water with a full 25 L`);
// the Trucks tab still offers the pickup (a boat isn't a truck on the forecourt)
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400);
s = await J(`({ rows: [...document.querySelectorAll("#garageBody .row")].map(b => b.textContent) })`);
ok(/Fjellvogn/.test(s.rows[0]) && !s.rows.some(r => /Fjordsnekka/.test(r)), "the Trucks tab doesn't list the boat");
await ev(`closeGarage(); true`);
if (STILLS) { await putWalker(0, 0); await sleep(300); await sideCam(`(() => { const p = ${dockW("TLXB.DOCKS[0].len / 2", 0)}; return [p[0], 1, p[1]]; })()`, 16, 7, 1.2); await shot("x14_jetty"); await camOff(); await ev(`FOOT.on = false; true`); }

// ---- 3. walk up; the nearest-vehicle rule picks her; the hint names her
await putWalker("TLXB.DOCKS[0].len - 3.1", `${0} + Math.sign(((${bt.x} - TLXB.DOCKS[0].x) * Math.cos(TLXB.DOCKS[0].yaw) - (${bt.z} - TLXB.DOCKS[0].z) * Math.sin(TLXB.DOCKS[0].yaw))) * 0.6`, "TLXB.DOCKS[0].yaw"); await sleep(1200);
s = await J(`({ cur: TLX.state("vehicles").cur, hint: $("wnHint").textContent, near: VEH.cur ? VEH.cur.nearMount() : false })`);
ok(s.cur === bt.uid && s.near, "on the jetty beside her she's the current vehicle and within reach");
ok(/get in the skiff/.test(s.hint), "the hint names her: " + s.hint);
if (STILLS) { await sideCam("[P.x, P.y + 0.3, P.z]", 7, 2.6, 2.2); await shot("x14_moored"); await camOff(); }

// ---- 4. step in
await tap("KeyQ"); await sleep(300);
ok(await ev("MNT.on"), "Q starts stepping in");
if (STILLS) { await waitGame(0.75); await sideCam("[P.x, P.y + 0.6, P.z]", 4.5, 1.6, 1.9); await shot("x14_stepin"); await camOff(); }
const inDone = await waitUntil("!MNT.on", 10); await sleep(300);
s = await J(`({ foot: FOOT.on, pin: VEH.cur && VEH.cur.pin, walker: FOOT.g.visible, drv: TLXV.rt().drvBody.visible, cap: GS.cap, slots: ST.slots, fuel: GS.fuel })`);
ok(inDone && !s.foot && s.pin === "boat" && !s.walker, "seated in the boat, the walker hidden");
ok(s.cap === 25 && s.slots === 4 && Math.abs(s.fuel - 25) < 0.05, `her tank and parcel space are the boat's (${s.cap} L, ${s.slots} parcels, ${s.fuel.toFixed(2)} L)`);

// ---- 5. under way
const fuel0 = await ev("GS.fuel");
let r = await holdFor("KeyW", 9, B);
const top = Math.max(...r.map(o => o.v)), lowY = Math.min(...r.map(o => o.y)), hiY = Math.max(...r.map(o => o.y));
console.log("run", r.map(o => o.v).join(" "));
ok(top > 7 && top < 12.5, `W gets her onto the plane: ${top.toFixed(1)} m/s after 9 s of throttle`);
const t4 = r.find(o => o.t - r[0].t >= 3.5); ok(t4 && t4.v < top - 1, `she climbs onto the plane rather than leaping (${t4 && t4.v} m/s at 3.5 s)`);
ok(lowY > -0.35 && hiY < 0.45 && r.every(o => !o.help && !o.foot), `she floats at the waterline (y ${lowY.toFixed(2)}..${hiY.toFixed(2)}), no dunking`);
ok((await ev("GS.fuel")) < fuel0, "the outboard burns fuel");
if (STILLS) { await down("KeyW"); await sideCam("[P.x, P.y + 0.4, P.z]", 8, 2.5, 2.4); await shot("x14_planing"); await camOff(); await up("KeyW"); }
// the tiller
const y0 = await ev("P.yaw");
r = await holdFor(["KeyW", "KeyD"], 3, B);
const dyaw = Math.abs(((r[r.length - 1].yaw - y0 + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI);
ok(dyaw > 0.6, `the tiller turns her: ${dyaw.toFixed(2)} rad in 3 s`);
// reverse stops her
const v0r = await ev("Math.hypot(P.vx, P.vz)");
r = await holdFor("KeyS", 6, B);
const stopAt = r.find(o => o.v < 0.8);
ok(stopAt && stopAt.t - r[0].t < 5, `reverse brings her to a stop from ${v0r.toFixed(1)} m/s in ${stopAt ? (stopAt.t - r[0].t).toFixed(1) : "-"} s, then backs her (${r[r.length - 1].v} m/s astern)`);
await waitGame(1);

// ---- 6. the shallows: aim her at the shore beside the jetty and hold the throttle
await ev(`(() => { const D = TLXB.DOCKS[0], fx = Math.sin(D.yaw), fz = Math.cos(D.yaw); let best = null;
  for (const sd of [-1, 1]) for (let off = 8; off <= 30; off += 2) { const x = D.x + fz * sd * off + fx * 16, z = D.z - fx * sd * off + fz * 16; if (TLXB.depthAt(x, z) > 1.2 && isSea(x, z)) { best = [x, z]; break; } if (best) break; }
  if (!best) best = [D.x + fx * 18, D.z + fz * 18];
  P.x = best[0]; P.z = best[1]; P.yaw = D.yaw + Math.PI; P.vx = P.vz = 0; return 1; })()`);
await waitGame(0.6);
r = await holdFor("KeyW", 12, B);
const last = r[r.length - 1], minDep = Math.min(...r.map(o => o.dep));
console.log("shore", r.map(o => `${o.v}/${o.dep}`).join(" "));
ok(last.v < 0.8 && minDep > 0.15, `driving at the shore she grounds in the water (${last.v} m/s, least depth under her ${minDep.toFixed(2)} m)`);
ok(!last.help && !last.foot, "no dunking, still aboard");
// a shore too high to step onto: Q says so and keeps you aboard (no stepping out onto the water)
const ls0 = await J(`TLXB.landSpot()`);
console.log("landSpot at the shore", JSON.stringify(ls0));
if (!ls0) { await tap("KeyQ"); await sleep(400); s = await J(`({ dmt: DMT.on, foot: FOOT.on })`); ok(!s.dmt && !s.foot, "the shore here is too high to step onto: Q keeps you aboard"); }
// bring her alongside the jetty and step out onto the planks
await ev(`(() => { const D = TLXB.DOCKS[0], b = TLXB.berthOK(D, 1) ? TLXB.berthPose(D, 1) : TLXB.berthPose(D, -1); P.x = b.x; P.z = b.z; P.yaw = b.yaw; P.vx = P.vz = 0; return 1; })()`);
await waitGame(0.8);
const ls = await J(`TLXB.landSpot()`);
console.log("landSpot at the berth", JSON.stringify(ls));
await tap("KeyQ"); await sleep(300);
const outStarted = await ev("DMT.on");
const outDone = await waitUntil("!DMT.on", 10); await sleep(400);
s = await J(`({ foot: FOOT.on, fl: TLXB.floorAt(FOOT.x, FOOT.z), sea: isSea(FOOT.x, FOOT.z), y: FOOT.y, surf: surf(FOOT.x, FOOT.z), vis: FOOT.g.visible })`);
ok(ls && outStarted && outDone && s.foot && s.vis && (s.fl !== null || !s.sea), `Q steps her skipper out onto ${s.fl !== null ? "the jetty" : "the shore"}`);
// walk a step on the shore to prove you're really there
await holdFor("KeyA", 0.4, async () => 0); await holdFor("KeyW", 0.8, async () => 0);
s = await J(`({ foot: FOOT.on, sea: isSea(FOOT.x, FOOT.z), fl: TLXB.floorAt(FOOT.x, FOOT.z) })`);
ok(s.foot && (!s.sea || s.fl !== null), "and can walk about on it");

// ---- 7. save -> reload keeps the boat where she was left
const boatPos = await J(`(() => { const s = TLX.state("vehicles"), r = s.owned.find(r => r.id === "skiff"); const cur = s.cur === r.uid; return { x: cur ? P.x : r.x, z: cur ? P.z : r.z, fuel: cur ? GS.fuel : r.fuel }; })()`);
await ev(`save(); true`);
await reload();
await sleep(800);
s = await J(`(() => { const s = TLX.state("vehicles"), r = s.owned.find(r => r.id === "skiff"); return r ? { x: r.x, z: r.z, fuel: r.fuel, dep: TLXB.depthAt(r.x, r.z) } : null; })()`);
ok(s && Math.hypot(s.x - boatPos.x, s.z - boatPos.z) < 1.5 && Math.abs(s.fuel - boatPos.fuel) < 0.2 && s.dep > 0.15, `reload: she's where she was left (${s && Math.hypot(s.x - boatPos.x, s.z - boatPos.z).toFixed(2)} m), fuel kept`);

// ---- 8. the pad's LB gets in; a reload while seated comes back seated and afloat
await ev(`(() => { const s = TLX.state("vehicles"), r = s.owned.find(r => r.id === "skiff"); const ls = (() => { const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); for (const sd of [-1, 1]) for (const lz of [0, -0.6, 0.6, 1.2, -1.2]) for (let off = 0.4; off < 1.2; off += 0.2) { const x = r.x + fz * sd * (0.85 + off) + fx * lz, z = r.z - fx * sd * (0.85 + off) + fz * lz; if (TLXB.floorAt(x, z) !== null || (!isSea(x, z) && !isWater(x, z))) return [x, z]; } for (let off = 0.25; off < 1.1; off += 0.25) { const x = r.x + fx * (2.3 + off), z = r.z + fz * (2.3 + off); if (!isSea(x, z)) return [x, z]; } return [r.x + fz * 1.4, r.z - fx * 1.4]; })();
  crashCancel(); FOOT.on = true; FOOT.x = ls[0]; FOOT.z = ls[1]; FOOT.y = walkFloor(FOOT.x, FOOT.z); recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(1200);
await padSet({ 4: 1 }); await sleep(250); await padSet(); await sleep(300);
const padIn = await waitUntil("!MNT.on && !FOOT.on", 10);
ok(padIn && (await ev("VEH.cur && VEH.cur.pin")) === "boat", "the pad's LB steps in too");
await ev(`save(); true`);
await reload(); await sleep(1000);
s = await J(`({ foot: FOOT.on, pin: VEH.cur && VEH.cur.pin, y: P.y, dep: TLXB.depthAt(P.x, P.z), drv: TLXV.rt().drvBody.visible })`);
ok(!s.foot && s.pin === "boat" && Math.abs(s.y) < 0.45 && s.dep > 0.15, `a reload while seated comes back in the boat, afloat (y ${s.y.toFixed(2)})`);
r = await holdFor("KeyW", 2, B);
ok(r[r.length - 1].v > 1, "and she drives after the reload");
if (STILLS) { await sideCam("[P.x, P.y + 0.5, P.z]", 3.2, 1.2, 1.57); await shot("x14_seated"); await camOff(); }

console.log(fails ? `${fails} FAIL` : "all ok");
await done(fails ? 1 : 0);
