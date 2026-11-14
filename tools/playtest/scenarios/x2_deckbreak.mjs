// Beta break test for slice 2.6b (sled on the trailer). Strapped sled behind a driving truck, swap Q from sled to truck and back,
// reset key while strapped, UNstrapped sled on the deck with the truck driving off, trailer hitched at the moment of straps,
// strap saved with the trailer on a truck, mid-ramp reload. Prints ok/FAIL; exit 1 on a failure.
import { boot, ev, tap, sleep, done, park, reload, shot, down, up } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
// where is the parked/live sled relative to the deck
const SL = () => J(`(() => { const h = TLXV.haul(), s = TLX.state("vehicles"), p = s.cur == null ? P : (s.sled || VEH.sled); const L = TLXV.haulLocal(h, p.x, p.z);
  return { lx: L.x, lz: L.z, y: p.y, dy: Number.isFinite(p.y) ? p.y - (TLXV.haulR().pl ? TLXV.haulR().pl.y + TLXV.haulR().pl.dz * L.z + TLXV.haulR().pl.dx * L.x : 0) : null, strap: h.strap, on: h.on, cur: s.cur,
    nan: [p.x, p.z, p.yaw, camera.position.x, camera.quaternion.x].some(v => !isFinite(v)), foot: FOOT.on, hint: $("wnHint").textContent }; })()`);
const walkerBy = (what) => ev(`(() => { const s = TLX.state("vehicles"); let p; if ("${what}" === "truck") { const r = s.owned[0]; p = s.cur === r.uid ? P : r; } else p = s.cur == null ? P : (s.sled || VEH.sled);
  const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw); FOOT.on = true; FOOT.x = p.x + fz * 3.2 - fx * 0.3; FOOT.z = p.z - fx * 3.2 - fz * 0.3; FOOT.yaw = p.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
const besideDeck = () => ev(`(() => { const h = TLXV.haul(), L = TLXV.haulLocal(h, 0, 0); const w = TLXV.haulWorld(h, TLXV.HAUL.deckW / 2 + 0.75, 0.7); FOOT.on = true; FOOT.x = w[0]; FOOT.z = w[1]; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.yaw = h.yaw - Math.PI / 2; recenter(FOOT.x, FOOT.z, true); return 1; })()`);

await boot(); await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`);
await park(); await sleep(400);
await ev(`GS.cash = 9000; garageTab = "trucks"; openGarage(); true`); await sleep(500);
await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400);
await ev(`[...document.querySelectorAll("#garageBody .row")].find(e => /Fjordhenger/.test(e.textContent)).click(); closeGarage(); true`); await sleep(400);
ok(!!(await ev(`TLXV.haul() ? 1 : 0`)), "bought truck + trailer");
const lane = await J(`(() => { let best = null; for (const Y of YARDS) { if (Y.x2 === undefined || Math.hypot(Y.x - depot.x, Y.z - depot.z) > TOWN_R || Y.r > 5) continue; const L = Math.hypot(Y.x2 - Y.x, Y.z2 - Y.z); if (!best || L > best.L) best = { x: Y.x, z: Y.z, x2: Y.x2, z2: Y.z2, L }; } return best; })()`);
// truck hitched to the trailer on the lane, trailer ramp down
await ev(`(() => { const L = ${JSON.stringify(lane)}, ux = (L.x2 - L.x) / L.L, uz = (L.z2 - L.z) / L.L, yaw = Math.atan2(ux, uz);
  const r = TLX.state("vehicles").owned[0]; r.x = L.x + ux * 14; r.z = L.z + uz * 14; r.yaw = yaw; crashCancel(); FOOT.on = false;
  const bx = r.x - ux * 3.1, bz = r.z - uz * 3.1, cx = bx - ux * 0.9, cz = bz - uz * 0.9, h = TLXV.haul();
  h.on = null; h.x = cx - ux * TLXV.HAUL.L; h.z = cz - uz * TLXV.HAUL.L; h.yaw = yaw; h.ramp = 1; recenter(r.x, r.z, true); return 1; })()`);
await sleep(500);
await ev(`(() => { const h = TLXV.haul(), c = TLXV.haulCoupler(h), lx = Math.cos(h.yaw), lz = -Math.sin(h.yaw); FOOT.on = true; FOOT.x = c[0] + lx * 1.6; FOOT.z = c[1] + lz * 1.6; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.yaw = h.yaw - Math.PI / 2; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await waitGame(0.8); await tap("KeyE"); await waitGame(0.6);
ok((await ev(`TLXV.haul().on`)) === "v1", "trailer hitched to the truck");

// put the sled on the deck at the front rail (as if driven), ride state, then strap with E
const sledOnto = () => ev(`(() => { const h = TLXV.haul(), lim = 2.25 - 0.06 - 1.5, w = TLXV.haulWorld(h, 0, lim - 0.05); crashCancel(); FOOT.on = false; const s = TLX.state("vehicles");
  const p = s.cur == null ? P : (s.sled || VEH.sled); if (!p) return 0; p.x = w[0]; p.z = w[1]; p.yaw = h.yaw; if (s.cur == null) { P.vx = P.vz = P.vy = 0; P.yr = 0; } p.y = TLXV.deckAt(p.x, p.z, 99); return 1; })()`);
ok(await sledOnto(), "sled placed on deck (sled is the active vehicle)");
await waitGame(0.6); await besideDeck(); await waitGame(0.8);
let s = await SL(); ok(/strap the sled/.test(s.hint), `hint beside deck on a hitched trailer: "${s.hint}"`);
await tap("KeyE"); await waitGame(0.5); s = await SL(); ok(!!s.strap, "strapped while hitched");

// ---- A: swap to the truck with Q (sled becomes a parked record), drive 8 s with turns, sled must stay glued
await walkerBy("truck"); await sleep(1200); await tap("KeyQ");
ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14), "Q into the truck");
await waitGame(0.5); s = await SL(); ok(s.strap && !s.nan && Math.abs(s.dy) < 0.15, `swapped to truck: sled still glued (lz ${s.lz.toFixed(2)}, dy ${s.dy && s.dy.toFixed(2)})`);
const a0 = await J(`({ x: P.x, z: P.z })`);
await down("KeyW"); await waitGame(3); const a1 = await J(`({ x: P.x, z: P.z, sp: Math.hypot(P.vx, P.vz), hint: $("wnHint").textContent, bog: typeof ST === "function" ? 0 : 0 })`);
console.log("A truck after 3 s throttle", JSON.stringify(a1), "moved", Math.hypot(a1.x - a0.x, a1.z - a0.z).toFixed(1));
ok(Math.hypot(a1.x - a0.x, a1.z - a0.z) > 5, `truck with the strapped sled aboard moves under throttle (${Math.hypot(a1.x - a0.x, a1.z - a0.z).toFixed(1)} m in 3 s)`);
await down("KeyA"); await waitGame(2.5); await up("KeyA"); await down("KeyD"); await waitGame(2.5); await up("KeyD"); await waitGame(1.5); await up("KeyW");
s = await SL(); const st0 = await J(`TLXV.haul().strap`);
ok(!s.nan && Math.abs(s.lx - st0.x) < 0.05 && Math.abs(s.lz - st0.z) < 0.05 && Math.abs(s.dy) < 0.2, `after driving with turns the sled is still at its strap spot (lx ${s.lx.toFixed(2)}/${st0.x.toFixed(2)}, lz ${s.lz.toFixed(2)}/${st0.z.toFixed(2)}, dy ${s.dy && s.dy.toFixed(2)})`);
await shot("x2deckbreak_a_towing");

// ---- B: park, get out, walk to the strapped sled, Q on it (mount a strapped sled), throttle + reset key
await waitGame(2);
await ev(`crashCancel(); true`); await tap("KeyQ"); await waitUntil("FOOT.on && !DMT.on", 12); await waitGame(0.5);
await besideDeck(); await waitGame(0.8); s = await SL(); console.log("beside strapped", s.hint);
await tap("KeyQ"); const mounted = await waitUntil("!FOOT.on && !MNT.on && !VEH.cur", 14);
ok(mounted, "Q mounts the strapped sled");
await waitGame(0.5); const sp0 = await SL();
await down("KeyW"); await waitGame(1.5); await up("KeyW"); s = await SL();
ok(Math.abs(s.lz - sp0.lz) < 0.05 && s.strap, `throttle on the strapped sled: no movement (${(s.lz - sp0.lz).toFixed(3)} m)`);
await tap("KeyN"); await waitGame(1.0); s = await SL();
console.log("after reset key", JSON.stringify(s));
ok(!s.nan && (s.strap ? Math.abs(s.dy) < 0.2 : true), `reset key while strapped: ${s.strap ? "still strapped on deck" : "strap dropped"}, sled lz ${s.lz.toFixed(1)}, dy ${s.dy && s.dy.toFixed(2)}`);
// ---- C: unstrapped sled on the deck, swap to truck, drive off: where does the parked sled end up?
await besideDeck().catch(() => 0); await ev(`FOOT.on = true; true`);
await sleep(300);
if ((await SL()).strap) { await besideDeck(); await waitGame(0.8); await tap("KeyE"); await waitGame(0.5); }
else { await sledOnto(); await waitGame(0.5); }
s = await SL(); console.log("C pre", JSON.stringify(s));
await walkerBy("truck"); await sleep(1000); await tap("KeyQ"); await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14);
const tr0 = await J(`({ x: TLXV.haul().x, z: TLXV.haul().z })`);
await down("KeyW"); await waitGame(5); await up("KeyW"); await waitGame(1.5);
const tr1 = await J(`({ x: TLXV.haul().x, z: TLXV.haul().z, sp: Math.hypot(P.vx, P.vz), bog: ST ? 0 : 0 })`);
console.log("C truck moved", Math.hypot(tr1.x - tr0.x, tr1.z - tr0.z).toFixed(1), "m in 5 s of throttle");
ok(Math.hypot(tr1.x - tr0.x, tr1.z - tr0.z) > 8, "truck pulls the loaded trailer away (moved >8 m in 5 s)");
s = await SL(); console.log("C post", JSON.stringify(s));
ok(!s.nan && !s.strap, `unstrapped sled, truck drove off 5 s: sled is ${Math.abs(s.dy) < 0.3 ? "still on the deck" : "off the deck / stranded"} (lz ${s.lz.toFixed(1)}, dy ${s.dy && s.dy.toFixed(2)})`);
await shot("x2deckbreak_c_unstrapped");

// ---- D: save carries a strap while the trailer is parked on its own; mid-ramp reload
await ev(`save(); true`);
const sv = await J(`JSON.parse(localStorage.getItem("tracklayer.save.v2"))`);
const h = sv.x.sys.vehicles.s.haul; console.log("saved haul", JSON.stringify(h));
h.strap = { x: 0, z: 0.7, yaw: 3.0 };     // strap yaw reversed 170 deg
await reload(sv); await sleep(1500); await waitGame(1);
s = await SL(); ok(!s.nan, `reversed-yaw strap loads, finite (${JSON.stringify({ lz: s.lz, dy: s.dy, strap: s.strap })})`);
await ev(`WX.at = () => 0; true`);
const sv2 = JSON.parse(JSON.stringify(sv)); sv2.x.sys.vehicles.s.haul.strap = { x: 0, z: 40, yaw: 0 };   // strap spot far outside the deck
await reload(sv2); await sleep(1500); await waitGame(1);
s = await SL(); ok(!s.nan && (!s.strap || s.lz < 3), `strap spot 40 m off the deck: ${s.strap ? "accepted, sled " + s.lz.toFixed(1) + " m ahead of trailer centre, dy " + (s.dy && s.dy.toFixed(1)) : "rejected"}`);
await done(fails ? 1 : 0);
