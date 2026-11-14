// Beta break test for slice 2.6c (towing the strapped sled). Strapped sled behind a driving truck, swap Q from sled to truck and back,
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


// ---- A: unhitch the trailer while the sled is strapped on it
const TM = () => J(`({ mass: TLXV.rt() ? TLXV.rt().mass : null, on: TLXV.haul().on, strap: TLXV.haul().strap, cur: TLX.state("vehicles").cur })`);
await walkerBy("truck"); await sleep(1200); await tap("KeyQ"); await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14); await waitGame(0.5);
let t = await TM(); const m_loaded = t.mass; console.log("A loaded", JSON.stringify(t));
// B: reset key (N) in the truck while towing
const b0 = await J(`({ x: P.x, z: P.z, hx: TLXV.haul().x, hz: TLXV.haul().z })`);
await tap("KeyN"); await waitGame(1.5);
t = await TM(); const b1 = await J(`({ x: P.x, z: P.z, hx: TLXV.haul().x, hz: TLXV.haul().z, fin: [P.x, P.z, TLXV.haul().x, TLXV.haul().z].every(Number.isFinite) })`);
const gap = Math.hypot(b1.x - b1.hx, b1.z - b1.hz);
console.log("B after N", JSON.stringify(b1), "gap", gap.toFixed(1), JSON.stringify(t));
ok(b1.fin && (t.on == null || gap < 12), `reset key in the truck while towing: finite, trailer ${t.on == null ? "dropped" : "still hitched, " + gap.toFixed(1) + " m behind"}, strap ${t.strap ? "kept" : "dropped"}`);
// A continued: get out, unhitch with E at the coupler
await ev(`crashCancel(); true`); await tap("KeyQ"); await waitUntil("FOOT.on && !DMT.on", 12); await waitGame(0.5);
await ev(`(() => { const h = TLXV.haul(), c = TLXV.haulCoupler(h), lx = Math.cos(h.yaw), lz = -Math.sin(h.yaw); FOOT.on = true; FOOT.x = c[0] + lx * 1.6; FOOT.z = c[1] + lz * 1.6; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.yaw = h.yaw - Math.PI / 2; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await waitGame(0.8); const hint = await ev(`$("wnHint").textContent`); console.log("at coupler:", hint);
await tap("KeyE"); await waitGame(0.6); t = await TM();
ok(t.on == null && !!t.strap, `unhitched with the sled strapped: trailer free (on ${t.on}), strap kept (${!!t.strap})`);
// truck now empty: get in, mass back to the bare truck
await walkerBy("truck"); await sleep(1200); await tap("KeyQ"); await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14); await waitGame(0.5);
t = await TM(); console.log("A truck alone", JSON.stringify(t));
ok(t.mass != null && t.mass < m_loaded - 600, `truck alone sheds the trailer and sled weight (${m_loaded} -> ${t.mass} kg)`);
// ---- C: fit a hitch rig on the SLED while it is strapped on the trailer (garage), is the strap dropped?
await ev(`crashCancel(); true`);
await ev(`(() => { const s = TLX.state("vehicles"); const keys = Object.keys(PARTS.hitch ? PARTS : {}); return 1; })()`);
const hk = await J(`(PARTS.hitch ? PARTS.hitch.options.map(o => o.id) : [])`); console.log("hitch options", JSON.stringify(hk));
if (hk.length > 1) {
  await ev(`GS.own.parts.hitch = ${JSON.stringify(hk[1])}; GS.own.owned = GS.own.owned || {}; true`); await waitGame(1.5);
  const c = await J(`({ strap: TLXV.haul().strap, rig: TLXV.rigOn(), hitch: GS.own.parts.hitch })`);
  ok(!(c.strap && c.rig === "sled"), `sled fitted with ${hk[1]} while strapped: ${c.strap ? "STILL strapped with a rig (" + JSON.stringify(c.rig) + ")" : "strap dropped"}`);
}
// ---- D: save whose trailer is hitched to a truck that no longer exists, strap kept
await ev(`save(); true`);
const sv = await J(`JSON.parse(localStorage.getItem("tracklayer.save.v2"))`);
const hv = sv.x.sys.vehicles.s; hv.haul.strap = hv.haul.strap || { x: 0, z: 0.69, yaw: 0 }; hv.haul.on = "v99";
await reload(sv); await sleep(1500); await waitGame(1);
const d = await J(`({ on: TLXV.haul() && TLXV.haul().on, strap: TLXV.haul() && TLXV.haul().strap, nan: [P.x, P.z, camera.position.x].some(v => !isFinite(v)) })`);
ok(!d.nan, `trailer hitched to a missing truck v99 loads finite (on ${d.on}, strap ${!!d.strap})`);
await shot("x2towbreak_d");
await done(fails ? 1 : 0);
