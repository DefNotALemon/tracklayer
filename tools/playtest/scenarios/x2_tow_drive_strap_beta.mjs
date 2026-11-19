// Beta: strapped sled stays on the deck while the truck DRIVES (straight, hard turns, hard brake, reverse), then reload mid-tow.
// Samples sled position in deck-local coords each ~0.3 game s; exit 1 on failure.

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

// ---- drive
await walkerBy("truck"); await sleep(1200); await tap("KeyQ"); await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14); await waitGame(0.5);
const samp = [];
async function drive(label, keys, secs, pre) {
  if (pre) await ev(pre);
  for (const k of keys) await down(k);
  const t0 = await clock(); let maxl = 0, maxs = 0, bad = 0;
  while ((await clock()) - t0 < secs) { const s = await SL(); const v = await J(`Math.hypot(P.vx, P.vz)`); maxs = Math.max(maxs, v);
    if (s.nan) bad++; maxl = Math.max(maxl, Math.abs(s.lx) + 0, 0); samp.push([label, s.lx, s.lz, s.dy]); await sleep(250); }
  for (const k of keys) await up(k);
  const s = await SL(); console.log(label, "end", JSON.stringify({ lx: s.lx?.toFixed(2), lz: s.lz?.toFixed(2), dy: s.dy?.toFixed(2), strap: !!s.strap, on: s.on, maxSpeed: maxs.toFixed(1) }));
  ok(bad === 0 && !!s.strap && Math.abs(s.lx) < 1.2 && Math.abs(s.lz) < 3 && s.dy != null && Math.abs(s.dy) < 0.6, label + ": sled still strapped on the deck, finite");
  return s;
}
await drive("straight", ["KeyW"], 8);
await drive("turn left", ["KeyW", "KeyA"], 5);
await drive("turn right", ["KeyW", "KeyD"], 5);
await drive("hard brake", ["KeyS"], 3, `P.vx = Math.sin(P.yaw) * 14; P.vz = Math.cos(P.yaw) * 14; true`);
await drive("reverse", ["KeyS"], 6);
const mass = await ev(`TLXV.rt() ? TLXV.rt().mass : null`); console.log("mass", mass);
// reload mid-tow
await ev(`save(); true`);
const sv = await J(`JSON.parse(localStorage.getItem("tracklayer.save.v2"))`);
await reload(sv); await ev(`tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; true`); await sleep(1200);
const a = await J(`({ ho: !!TLXV.haul(), strap: !!(TLXV.haul() && TLXV.haul().strap), on: TLXV.haul() && TLXV.haul().on, cur: TLX.state("vehicles").cur, fin: [P.x, P.z, camera.position.x].every(Number.isFinite), tr: TLX.state("vehicles").owned.length })`);
console.log("after reload", JSON.stringify(a));
ok(a.fin && a.ho, "reload mid-tow: world finite, trailer still owned");
ok(!!a.strap, "strap survives reload (or is dropped consistently): strap=" + a.strap);
await done(fails ? 1 : 0);
