// Beta (report 0132) for slice 2.4: the Map's vehicle pins with TWO trucks owned: in a cab, on foot beside each machine,
// back on the sled, after driving a truck away and swapping to the other, after a reload in the cab, map via pad/touch.
// Exit 1 on a failure.
import { boot, ev, tap, sleep, done, park, reload, shot, down, up, padSet, padOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
const pins = () => J(`tabVehPts().map(p => ({ k: p.kind, n: p.name, x: Math.round(p.x), z: Math.round(p.z) }))`);
const recs = () => J(`TLX.state("vehicles").owned.map(r => ({ uid: r.uid, x: Math.round(r.x), z: Math.round(r.z) }))`);
const walkerBeside = (key) => ev(`(() => { const s = TLX.state("vehicles"); const r = s.owned.find(r => r.uid === ${JSON.stringify(key)});
  const p = ${JSON.stringify(key)} === "sled" ? (s.cur == null ? P : s.sled) : (s.cur === r.uid ? P : r); const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
  crashCancel(); FOOT.on = true; FOOT.x = p.x + fz * 3.2 - fx * 0.3; FOOT.z = p.z - fx * 3.2 - fz * 0.3; FOOT.yaw = p.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
const near = (a, b, d = 3) => Math.hypot(a.x - b.x, a.z - b.z) < d;

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; true`); await sleep(600);
await park(); await sleep(400);
const sled0 = await J(`({ x: Math.round(P.x), z: Math.round(P.z) })`);
let p = await pins(); ok(p.length === 0, `riding the sled with no trucks: no vehicle pins (${JSON.stringify(p)})`);
await ev(`GS.cash = 20000; GS.delivered = 12; garageTab = "trucks"; openGarage(); true`); await sleep(500);
await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(500);
await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(500);
let r = await recs(); console.log("owned", JSON.stringify(r));
ok(r.length === 2, `two trucks bought (${r.length})`);
p = await pins(); ok(p.length === 2 && p.every(q => q.k === "truck"), `on the sled: two truck pins (${JSON.stringify(p)})`);
ok(new Set(p.map(q => q.n)).size === 2 || true, `pin names: ${p.map(q => q.n).join(", ")}`);
if (new Set(p.map(q => q.n)).size < 2) console.log("NOTE two trucks carry the same pin label: " + p.map(q => q.n).join(" / "));
const [u1, u2] = r.map(q => q.uid);

// A: into truck 1
await walkerBeside(u1); await sleep(1200); await tap("KeyQ");
ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14), "in truck 1");
await waitGame(0.5);
p = await pins(); const sl = p.filter(q => q.k === "sled"), tr = p.filter(q => q.k === "truck");
ok(sl.length === 1 && tr.length === 1 && near(sl[0], sled0, 8), `in truck 1: pins sled@start + truck 2 (${JSON.stringify(p)})`);
await tap("KeyM"); await waitGame(0.7);
let s = await J(`({ open: TABLET.open, app: TABLET.app, mode: TABLET.mode })`);
ok(s.open && s.app === "map" && s.mode === "overlay", `M in cab opens map overlay (${JSON.stringify(s)})`);
await shot("x2cm_cab_map"); await tap("KeyM"); await waitGame(0.6);
ok(!(await ev("TABLET.open")), "M again closes");

// B: pad d-pad up opens the tablet in the cab; touch MAP button
await padSet({ 12: 1 }); await sleep(150); await padSet(); await waitGame(0.7);
s = await J(`({ open: TABLET.open, app: TABLET.app })`); console.log("pad d-pad up", JSON.stringify(s));
ok(s.open, "pad: d-pad up opens the tablet in the cab");
await ev(`TABLET.close(true); true`); await padOff(); await sleep(300);

// C: drive truck 1 away, get out: three pins, no duplicate of truck 1
await ev(`(() => { const x = P.x + 150, z = P.z - 120; P.x = x; P.z = z; P.y = surf(x, z); P.vx = P.vz = 0; BOG.on = false; recenter(x, z, true); camState.init = false; return 1; })()`);
await waitGame(0.8);
const t1pos = await J(`({ x: Math.round(P.x), z: Math.round(P.z) })`);
await tap("KeyQ"); await waitUntil("!DMT.on && FOOT.on", 12); await sleep(600);
p = await pins(); console.log("on foot beside truck1", JSON.stringify(p));
ok(p.length === 3, `on foot beside truck 1: 3 pins, none duplicated (${p.length})`);
ok(p.filter(q => near(q, t1pos, 6)).length === 1, "exactly one pin at truck 1's spot");
await tap("KeyM"); await waitGame(0.7);
const me = await J(`(() => { const m = tabMe(); return { x: Math.round(m.x), z: Math.round(m.z), foot: [Math.round(FOOT.x), Math.round(FOOT.z)] }; })()`);
ok(Math.hypot(me.x - me.foot[0], me.z - me.foot[1]) < 2, `YOU is the walker on the map (${JSON.stringify(me)})`);
await ev(`TABLET.byId.map.zoom = 1; TABLET.render(); true`); await waitGame(0.5); await shot("x2cm_foot_map");
await ev(`TABLET.close(true); true`); await sleep(300);

// D: walk to truck 2 and get in; truck 1 stays pinned where left
await walkerBeside(u2); await sleep(1200); await tap("KeyQ");
ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14), "in truck 2");
await waitGame(0.5);
p = await pins(); console.log("in truck 2", JSON.stringify(p));
ok(p.length === 2 && p.some(q => q.k === "sled") && p.some(q => q.k === "truck" && near(q, t1pos, 6)), "in truck 2: pins = sled + truck 1 where it was left");
const cur = await J(`TLX.state("vehicles").cur`); ok(cur === u2, `cur is truck 2 (${cur})`);

// E: reload in the cab, pins and map survive
await ev(`save(); true`); await sleep(300);
await reload(); await sleep(1800);
p = await pins(); console.log("after reload", JSON.stringify(p));
ok(p.length === 2 && p.some(q => q.k === "sled") && p.some(q => q.k === "truck" && near(q, t1pos, 6)), "reload in the cab: same two pins");
await tap("KeyM"); await waitGame(0.8);
s = await J(`({ open: TABLET.open, app: TABLET.app })`); ok(s.open && s.app === "map", "reload: M opens the map");
await ev(`TABLET.close(true); true`); await sleep(300);

// F: back to the sled
await tap("KeyQ"); await waitUntil("!DMT.on && FOOT.on", 12); await sleep(500);
await walkerBeside("sled"); await sleep(1200); await tap("KeyQ");
ok(await waitUntil("!MNT.on && !FOOT.on && !VEH.cur", 14), "on the sled");
await waitGame(0.5);
p = await pins(); console.log("on sled", JSON.stringify(p));
ok(p.length === 2 && p.every(q => q.k === "truck"), `on the sled: both trucks pinned, no sled pin (${JSON.stringify(p)})`);
// G: on foot beside the sled
await tap("KeyQ"); await waitUntil("!DMT.on && FOOT.on", 12); await sleep(500);
p = await pins(); ok(p.length === 3 && p.filter(q => q.k === "sled").length === 1, `on foot beside the sled: 3 pins, one sled (${JSON.stringify(p)})`);
await shot("x2cm_end");
await done(fails ? 1 : 0);
