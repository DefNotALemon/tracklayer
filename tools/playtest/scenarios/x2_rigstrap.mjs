// Beta fix 0102 #1: a hitch rig and the trailer straps never coexist on the sled. With the sled strapped to the trailer,
// the garage refuses to fit a rig (strap kept, part unchanged, toast says unstrap), a rig put on another way (a seller,
// a school) drops the straps with a toast, the reload keeps that consistent, and with the rig off again E straps it back.
// Prints ok/FAIL; exit 1 on a failure.
import { boot, ev, tap, sleep, done, park, reload, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
const toasts = () => J(`(TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))`);
const besideDeck = () => ev(`(() => { const h = TLXV.haul(); const w = TLXV.haulWorld(h, TLXV.HAUL.deckW / 2 + 0.75, 0.7); FOOT.on = true; FOOT.x = w[0]; FOOT.z = w[1]; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.yaw = h.yaw - Math.PI / 2; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
const ST = () => J(`({ strap: TLXV.haul().strap, rig: TLXV.rigOn(), hitch: GS.own.parts.hitch, hint: $("wnHint").textContent, nan: [P.x, P.z, camera.position.x, camera.quaternion.x].some(v => !isFinite(v)) })`);

await boot(); await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`);
await park(); await sleep(400);
await ev(`GS.cash = 90000; garageTab = "trucks"; openGarage(); true`); await sleep(500);
await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400);
await ev(`[...document.querySelectorAll("#garageBody .row")].find(e => /Fjordhenger/.test(e.textContent)).click(); closeGarage(); true`); await sleep(400);
ok(!!(await ev(`TLXV.haul() ? 1 : 0`)), "bought truck + sled trailer");
const lane = await J(`(() => { let best = null; for (const Y of YARDS) { if (Y.x2 === undefined || Math.hypot(Y.x - depot.x, Y.z - depot.z) > TOWN_R || Y.r > 5) continue; const L = Math.hypot(Y.x2 - Y.x, Y.z2 - Y.z); if (!best || L > best.L) best = { x: Y.x, z: Y.z, x2: Y.x2, z2: Y.z2, L }; } return best; })()`);
// trailer standing free on a lane, ramp down; the sled on its deck at the front rail
await ev(`(() => { const L = ${JSON.stringify(lane)}, ux = (L.x2 - L.x) / L.L, uz = (L.z2 - L.z) / L.L, yaw = Math.atan2(ux, uz);
  const r = TLX.state("vehicles").owned[0]; r.x = L.x + ux * 14; r.z = L.z + uz * 14; r.yaw = yaw; crashCancel(); FOOT.on = false;
  const h = TLXV.haul(); h.on = null; h.x = L.x + ux * 5; h.z = L.z + uz * 5; h.yaw = yaw; h.ramp = 1; recenter(h.x, h.z, true); return 1; })()`);
await sleep(500);
const sledOnto = () => ev(`(() => { const h = TLXV.haul(), lim = 2.25 - 0.06 - 1.5, w = TLXV.haulWorld(h, 0, lim - 0.05); crashCancel(); FOOT.on = false; const s = TLX.state("vehicles");
  const p = s.cur == null ? P : (s.sled || VEH.sled); if (!p) return 0; p.x = w[0]; p.z = w[1]; p.yaw = h.yaw; if (s.cur == null) { P.vx = P.vz = P.vy = 0; P.yr = 0; } p.y = TLXV.deckAt(p.x, p.z, 99); return 1; })()`);
ok(await sledOnto(), "sled placed on the deck");
await waitGame(0.6); await besideDeck(); await waitGame(0.8);
let s = await ST(); ok(/strap the sled/.test(s.hint), `hint beside the deck: "${s.hint}"`);
await tap("KeyE"); await waitGame(0.5); s = await ST(); ok(!!s.strap && s.rig === "sled" && s.hitch === "none", `strapped with no rig (hitch ${s.hitch})`);

// 1: the garage refuses a rig while strapped
const rig = await J(`PARTS.hitch.options.map(o => o.id).find(id => HITCH[id] && recvOk(id)) || PARTS.hitch.options.map(o => o.id).find(id => HITCH[id])`);
await ev(`GS.own.parts.recv = GS.own.parts.recv; fitPart("hitch", ${JSON.stringify(rig)}); true`); await waitGame(0.4);
s = await ST(); const t1 = await toasts();
ok(s.hitch === "none" && !!s.strap, `garage fit of ${rig} while strapped refused (hitch ${s.hitch}, strap ${!!s.strap})`);
ok(t1.some(m => /strapped to the trailer\. Unstrap it/.test(m)), `garage says unstrap first: ${JSON.stringify(t1.filter(m => /strap/i.test(m)).slice(-1))}`);
// 2: a rig put on another way (seller collect, school) drops the straps
await ev(`GS.own.parts.hitch = ${JSON.stringify(rig)}; true`); await waitGame(1.0);
s = await ST(); const t2 = await toasts();
ok(!s.strap && s.rig === "sled", `rig set directly: straps dropped (strap ${JSON.stringify(s.strap)}, rig on ${s.rig})`);
ok(t2.some(m => /went on the sled, so its straps/.test(m)), "toast says the straps came off");
await besideDeck(); await waitGame(0.6); s = await ST();
ok(/Unhitch the .* from the sled first/.test(s.hint), `beside the deck with the rig on: "${s.hint}"`);
// 3: reload keeps it consistent
await ev(`save(); true`);
const sv = await J(`JSON.parse(localStorage.getItem("tracklayer.save.v2"))`);
await reload(sv); await sleep(1500); await waitGame(1);
s = await ST(); ok(!s.nan && !(s.strap && s.rig === "sled" && s.hitch !== "none"), `after reload: finite, strap ${!!s.strap}, rig ${s.rig}, hitch ${s.hitch}`);
// 4: a damaged save with a rig AND the strap loads with the strap dropped
const sv2 = await J(`JSON.parse(localStorage.getItem("tracklayer.save.v2"))`);
const hv = sv2.x.sys.vehicles.s; hv.haul.strap = { x: 0, z: 0.69, yaw: 0 }; if (hv.rig) delete hv.rig.kind;
await reload(sv2); await sleep(1500); await waitGame(1);
s = await ST(); ok(!s.nan && !(s.strap && s.rig === "sled" && s.hitch !== "none"), `damaged save (rig + strap): strap ${!!s.strap}, rig ${s.rig}, hitch ${s.hitch}`);
// 5: rig off again, E straps it back down
await ev(`crashCancel(); GS.own.parts.hitch = "none"; true`); await waitGame(0.6);
await sledOnto(); await waitGame(0.6); await besideDeck(); await waitGame(0.8);
await tap("KeyE"); await waitGame(0.5); s = await ST();
ok(!!s.strap && s.hitch === "none", `rig off: E straps the sled again (strap ${!!s.strap})`);
await shot("x2rigstrap");
await done(fails ? 1 : 0);
