// 0105 beta of the 0102 fix (v182): break attempts by the real garage UI, at night, buying another sled while strapped.
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
const lane = await J(`(() => { let best = null; for (const Y of YARDS) { if (Y.x2 === undefined || Y.r > 2) continue; const L = Math.hypot(Y.x2 - Y.x, Y.z2 - Y.z); if (!best || L > best.L) best = { x: Y.x, z: Y.z, x2: Y.x2, z2: Y.z2, L }; } return best; })()`);
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
// 1: real garage UI click on every hitch row while strapped (parts tab), at night
await ev(`GS.hour = 23; GS.cash = 90000; garageTab = "parts"; openGarage(); true`); await sleep(500);
const rows = await J(`[...document.querySelectorAll("#garageBody .row")].map(e => e.textContent.slice(0, 40))`);
ok(rows.length > 5, `parts tab shows ${rows.length} rows`);
const clicked = await J(`(() => { const rs = [...document.querySelectorAll("#garageBody .row")]; const names = Object.keys(HITCH).map(k => partDef("hitch", k).name); let n = 0; for (const r of rs) { if (names.some(nm => r.textContent.startsWith(nm))) { r.click(); n++; } } return n; })()`);
await waitGame(0.5); s = await ST(); const t1 = await toasts();
ok(clicked > 0 && s.hitch === "none" && !!s.strap, `UI-clicked ${clicked} rig rows while strapped: hitch ${s.hitch}, strap ${!!s.strap}`);
ok(t1.filter(m => /Unstrap it/.test(m)).length > 0, "refusal toast shown via UI");
// 2: fitting the 'none' row and receiver rows while strapped still works / doesn't crash
const cash0 = await ev("GS.cash");
ok(cash0 === 90000, `no cash charged by refused fits (cash ${cash0})`);
await ev(`closeGarage(); true`);
// 3: strapped sled, hour 23, E-unstrap then fit rig through UI succeeds
await besideDeck(); await waitGame(0.8); await tap("KeyE"); await waitGame(0.6); s = await ST();
ok(!s.strap, `E unstraps (strap ${JSON.stringify(s.strap)}) hint "${s.hint}"`);
await ev(`garageTab = "parts"; openGarage(); true`); await sleep(400);
await ev(`fitPart("hitch", "akja"); true`); await waitGame(0.4); s = await ST();
{ const tq = await toasts(); ok(s.hitch === "akja" || tq.some(m => /akja|toboggan/i.test(m) && /needs|licen|rescues/.test(m)), `unstrapped, fit akja: hitch ${s.hitch}; last toasts ${JSON.stringify(tq.slice(-2))}`); }
await ev(`closeGarage(); true`);
// 4: sled with rig on deck, walk to it: strap refused; unfit rig, strap again, then buy another sled in the garage while strapped
await ev(`GS.own.parts.hitch = "none"; true`); await waitGame(0.6); await besideDeck(); await waitGame(0.8);
await tap("KeyE"); await waitGame(0.6); s = await ST(); ok(!!s.strap, `re-strapped (${!!s.strap})`);
const other = await J(`SLEDS.map(x => x.id).find(id => !GS.own.sleds.includes(id) && !SLEDS.find(q=>q.id===id).rare)`);
await ev(`GS.cash = 900000; garageTab = "sleds"; openGarage(); buySled(${JSON.stringify(other)}); closeGarage(); true`); await waitGame(1.2);
s = await ST(); const sn = await J(`({ sled: GS.own.sled, strap: !!TLXV.haul().strap, cur: TLX.state("vehicles").cur })`);
console.log("toasts", JSON.stringify((await toasts()).slice(-3)));
ok(!s.nan, `bought ${other} while strapped: finite; sled ${sn.sled}, strap ${sn.strap}, cur ${sn.cur}`);
await shot("x2rigstrap2");
await done(fails ? 1 : 0);
