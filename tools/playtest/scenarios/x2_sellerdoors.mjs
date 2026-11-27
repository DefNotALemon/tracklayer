// Beta 0221 #1 (slice 2.7): a used pickup or sled trailer set down at a seller's stands clear of every door ring, at EVERY
//   seller site, so that beside the truck the on-foot hint is "get in the pickup" and never a door's "walk into the light".
//   For each marketplace seller site: stop the sled there as a buyer would, have the seller hand over a pickup, measure the
//   distance to the nearest door ring, stand 2.4 m off the truck on the side facing that door and at its nose and tail, read
//   the hint; at the three sites whose door is nearest, press the mount control and check you are in the cab. Then the same
//   distance check for the sled trailer. Asserts, exit 1 on a failure. NOSTILLS=1 skips the stills.
import { boot, ev, tap, sleep, done, park, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify((${e}) || null)`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(120); }
async function waitUntil(expr, maxGame = 12) { const t0 = await clock(); while ((await clock()) - t0 < maxGame) { if (await ev(expr)) return true; await sleep(150); } return false; }
const CLEAR = 10.5;   // the door hint reaches 7.5 m, the mount hint 3 m: a truck this far from a ring never loses its hint

const toSite = id => J(`(() => { const s = SITES.find(q => q.id === "${id}"); crashCancel(); FOOT.on = false; CRASH.cool = 1;
  for (const lim of [0.08, 9]) for (let r = 8; r < 21; r += 2) for (let a = 0; a < 6.28; a += 0.4) { const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
    if (isSea(x, z) || isWater(x, z) || obNear(x, z, 3) || slopeAt(x, z, 8) > lim) continue;   /* level ground first: on the windfarm slope the parked sled slid off at 4 m/s and was no longer "stopped here" */
    P.x = x; P.z = z; P.y = surf(x, z) + 0.2; P.vx = P.vy = P.vz = 0; recenter(x, z, true); return { x, z, r }; }
  return null; })()`);
// nearest visible door ring to a point
const DOOR = `((x, z) => { let bd = 1e9, bn = ""; for (const b of INT.beacons) { if (!b.g.visible) continue; const d = Math.hypot(x - b.x, z - b.z); if (d < bd) { bd = d; bn = (b.cab && (b.cab.name || b.cab.id)) || ""; } } return { d: bd, n: bn }; })`;
// put the walker at a spot round the truck: side toward the nearest door, nose, tail
const stand = (uid, where) => ev(`(() => { const r = TLX.state("vehicles").owned.find(q => q.uid === "${uid}"), fx = Math.sin(r.yaw), fz = Math.cos(r.yaw);
  let bx = 0, bz = 0, bd = 1e9; for (const b of INT.beacons) { if (!b.g.visible) continue; const d = Math.hypot(r.x - b.x, r.z - b.z); if (d < bd) { bd = d; bx = b.x; bz = b.z; } }
  const sgn = ((bx - r.x) * fz + (bz - r.z) * -fx) >= 0 ? 1 : -1;
  let x = r.x + fz * 2.4 * sgn, z = r.z - fx * 2.4 * sgn;
  if ("${where}" === "drv") { x = r.x + fz * 2.4; z = r.z - fx * 2.4; }
  crashCancel(); FOOT.on = true; FOOT.x = x; FOOT.z = z; FOOT.y = surf(x, z); FOOT.sp = 0; FOOT.yaw = Math.atan2(r.x - x, r.z - z); GS.warmth = 100; recenter(x, z, true); return 1; })()`);
// back on the sled and the truck gone, ready for the next site
async function sweep(uid) {
  await ev(`(() => { const s = TLX.state("vehicles"); if (s.cur && !FOOT.on) { TLXV.swapTo(null); return 1; }
    if (s.cur && s.sled) { FOOT.x = s.sled.x + 1.5; FOOT.z = s.sled.z; FOOT.y = surf(FOOT.x, FOOT.z); recenter(FOOT.x, FOOT.z, true); } return 1; })()`);
  await waitUntil(`TLX.state("vehicles").cur == null`, 6);
  await ev(`TLXV.swapTo(null); FOOT.on = false; MNT.on = false; DMT.on = false; true`);
  await waitGame(0.3);
  return ev(`TLXV.remove("${uid}")`);
}

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.warmth = 100; WX.at = () => 0; GS.storm = 0; true`);
await park();

const sites = await J(`mktSites().map(s => ({ id: s.id, name: shortName(s) }))`);
ok(sites && sites.length >= 10, `seller sites on the map: ${sites && sites.length}`);
const rows = [];
for (const st of sites) {
  const at = await toSite(st.id);
  if (!at) { ok(false, `${st.id}: nowhere to stop the sled`); continue; }
  await waitGame(0.2);
  const got = await J(`(() => { const s = TLX.state("vehicles"), site = SITES.find(q => q.id === "${st.id}"), n0 = s.owned.length;
    const msg = TLXV.mkt.collect({ item: "pickup", cond: 0.8, seller: "Test", site: site.id }, site); const r = s.owned[n0]; if (!r) return { msg };
    const dr = ${DOOR}(r.x, r.z); return { msg, uid: r.uid, x: r.x, z: r.z, dSite: Math.hypot(r.x - site.x, r.z - site.z), dDoor: dr.d, door: dr.n, water: isWater(r.x, r.z) || isSea(r.x, r.z) }; })()`);
  if (!got || !got.uid) { ok(false, `${st.id}: no pickup set down ("${got && got.msg}")`); continue; }
  const hints = {};
  for (const w of ["door", "drv"]) { await stand(got.uid, w); await waitGame(0.6); hints[w] = await ev(`$("wnHint").textContent`); }
  const good = /get in the pickup/.test(hints.door) && /get in the pickup/.test(hints.drv);
  rows.push({ id: st.id, uid: got.uid, dDoor: got.dDoor, dSite: got.dSite, good });
  ok(got.dDoor >= CLEAR && got.dSite <= 40 && !got.water, `${st.id}: pickup ${got.dSite.toFixed(1)} m from the seller, ${got.dDoor > 999 ? "no door ring" : got.dDoor.toFixed(1) + " m from the nearest door ring (" + got.door + ")"}`);
  ok(good, `${st.id}: beside it the hint names the pickup (door side "${hints.door.slice(0, 46)}", driver's side "${hints.drv.slice(0, 46)}")`);
  rows[rows.length - 1].swept = await sweep(got.uid);
}
ok(rows.length === sites.length, `a pickup was set down at all ${sites.length} seller sites (${rows.length})`);
ok(rows.every(r => r.swept), `each test truck was cleared away again (${rows.filter(r => !r.swept).map(r => r.id).join(",") || "all"})`);

// ---- the mount control itself, at the three sites whose door ring is nearest
const near3 = rows.slice().sort((a, b) => a.dDoor - b.dDoor).slice(0, 3);
for (const row of near3) {
  await toSite(row.id); await waitGame(0.2);
  const uid = await ev(`(() => { const s = TLX.state("vehicles"), site = SITES.find(q => q.id === "${row.id}"), n0 = s.owned.length; TLXV.mkt.collect({ item: "pickup", cond: 0.8, seller: "Test", site: site.id }, site); return s.owned[n0] ? s.owned[n0].uid : ""; })()`);
  if (!uid) { ok(false, `${row.id}: no pickup for the mount check`); continue; }
  await stand(uid, "drv"); await waitGame(0.6);
  if (row === near3[0] && !process.env.NOSTILLS) await shot("sellerdoor_" + row.id);
  await tap("KeyQ");
  ok(await waitUntil(`!FOOT.on && TLX.state("vehicles").cur === "${uid}"`, 12), `${row.id} (door ${row.dDoor.toFixed(1)} m): the mount control puts you in the cab`);
  await sweep(uid);
}

// ---- the sled trailer, same rule
let tOk = 0, tMin = 1e9, tBad = [];
for (const st of sites) {
  if (!(await toSite(st.id))) continue;
  const t = await J(`(() => { const s = TLX.state("vehicles"), site = SITES.find(q => q.id === "${st.id}"); s.haul = null;
    const msg = TLXV.mkt.collect({ item: "haul", cond: 0.8, seller: "Test", site: site.id }, site); const h = s.haul; if (!h) return { msg };
    const mid = (TLXV.HAUL.L + TLXV.HAUL.deckZ0) / 2, x = h.x + Math.sin(h.yaw) * mid, z = h.z + Math.cos(h.yaw) * mid, dr = ${DOOR}(x, z); s.haul = null; return { d: dr.d, dSite: Math.hypot(x - site.x, z - site.z) }; })()`);
  if (t && t.d >= CLEAR && t.dSite <= 40) tOk++; else tBad.push(st.id + (t && t.d ? " " + t.d.toFixed(1) + " m" : " none"));
  if (t && t.d < tMin) tMin = t.d;
}
ok(tOk === sites.length, `the sled trailer stands ${CLEAR} m+ from every door ring at all ${sites.length} seller sites (nearest ${tMin.toFixed(1)} m${tBad.length ? "; short: " + tBad.join(", ") : ""})`);

console.log(`door distances: ${rows.map(r => r.id + " " + (r.dDoor > 999 ? "-" : r.dDoor.toFixed(1))).join(", ")}`);
await done(fails);
