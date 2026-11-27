// Beta 0374 (slice 2.7, v295 seller-door clearance): break it. At the three tight sites (risfjord, relay, sandfjord) hand over
//   two pickups in a row, a pickup then a trailer, and a pickup while the buyer stands on the door side; check each truck's
//   distance to every door ring, to the other truck, slope and water, and that the spot survives a reload.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify((${e}) || null)`));
await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.warmth = 100; WX.at = () => 0; GS.storm = 0; true`);
const DOOR = `((x, z) => { let bd = 1e9; for (const b of INT.beacons) { if (!b.g.visible) continue; bd = Math.min(bd, Math.hypot(x - b.x, z - b.z)); } return bd; })`;
for (const id of ["risfjord", "relay", "sandfjord"]) {
  for (const mode of ["sled", "doorside-foot"]) {
    const r = await J(`(() => { const s = SITES.find(q => q.id === "${id}"); crashCancel(); CRASH.cool = 1;
      let bx = 0, bz = 0, bd = 1e9; for (const b of INT.beacons) { if (!b.g.visible) continue; const d = Math.hypot(s.x - b.x, s.z - b.z); if (d < bd) { bd = d; bx = b.x; bz = b.z; } }
      const x = "${mode}" === "sled" ? s.x + 9 : bx + 1.5, z = "${mode}" === "sled" ? s.z : bz + 1.5;
      if ("${mode}" === "sled") { FOOT.on = false; P.x = x; P.z = z; P.y = surf(x, z) + 0.2; P.vx = P.vy = P.vz = 0; }
      else { FOOT.on = true; FOOT.x = x; FOOT.z = z; FOOT.y = surf(x, z); }
      recenter(x, z, true);
      const v = TLX.state("vehicles"), n0 = v.owned.length, out = [];
      for (const item of ["pickup", "pickup", "haul"]) { if (item === "haul") v.haul = null;
        const msg = TLXV.mkt.collect({ item, cond: 0.8, seller: "T", site: s.id }, s);
        const q = item === "haul" ? v.haul : v.owned[v.owned.length - 1]; if (!q || (item === "pickup" && v.owned.length === n0 + out.filter(o => o.item === "pickup").length)) { out.push({ item, none: msg }); continue; }
        out.push({ item, d: ${DOOR}(q.x, q.z), sl: slopeAt(q.x, q.z, 6), wet: isWater(q.x, q.z) || isSea(q.x, q.z), ds: Math.hypot(q.x - s.x, q.z - s.z), x: q.x, z: q.z }); }
      for (let i = n0; i < v.owned.length; i++) for (let j = i + 1; j < v.owned.length; j++) out.push({ gap: Math.hypot(v.owned[i].x - v.owned[j].x, v.owned[i].z - v.owned[j].z) });
      return out; })()`);
    for (const o of r) {
      if (o.none) ok(false, `${id}/${mode} ${o.item}: nothing set down ("${o.none}")`);
      else if (o.gap !== undefined) ok(o.gap >= 5, `${id}/${mode}: two pickups ${o.gap.toFixed(1)} m apart`);
      else ok(o.d >= 10.5 && !o.wet && o.sl < 0.35 && o.ds <= 40, `${id}/${mode} ${o.item}: door ${o.d.toFixed(1)} m, seller ${o.ds.toFixed(1)} m, slope ${o.sl.toFixed(2)}, wet ${o.wet}`);
    }
    await ev(`(() => { const v = TLX.state("vehicles"); v.haul = null; for (const q of v.owned.slice()) TLXV.remove(q.uid); return 1; })()`); await sleep(400);
  }
}
// cleanup leaves nothing behind; a handed-over truck is saved in the real save
const left = await J(`TLX.state("vehicles").owned.length`);
ok(left === 0, `all test trucks removed again (${left} left)`);
const saved = await J(`(() => { const s = SITES.find(q => q.id === "risfjord"); FOOT.on = false; P.x = s.x + 9; P.z = s.z; P.y = surf(P.x, P.z) + 0.2; recenter(P.x, P.z, true);
  TLXV.mkt.collect({ item: "pickup", cond: 0.8, seller: "T", site: s.id }, s); const q = TLX.state("vehicles").owned.slice(-1)[0]; return { n: TLX.state("vehicles").owned.length, x: q.x }; })()`);
console.log("saved", JSON.stringify(saved));
ok(saved && saved.n === 1, "one truck after handover");
await done(fails);
