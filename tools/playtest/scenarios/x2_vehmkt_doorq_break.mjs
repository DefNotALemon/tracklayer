// Beta breaker for 2.7: at the two seller sites whose yard spot is ~5 m from a door ring (relay, risfjord),
// stand 2.4 m off the used pickup: does Q get in? Does E/walking onto the door ring steal it? Exit 1 on FAIL.
import { boot, ev, sleep, tap, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.delivered = 12; GS.cash = 90000; true`); await sleep(600);
for (const id of ["relay", "risfjord"]) {
  const r = await J(`(() => {
    const s = TLX.state("vehicles"); s.owned.length = 0; s.cur = null; GS.mkt.held.length = 0; crashCancel(); FOOT.on = false;
    const site = SITES.find(q => q.id === "${id}");
    P.x = site.x + 12; P.z = site.z; P.y = surf(P.x, P.z) + 0.2; P.vx = P.vy = P.vz = 0; recenter(P.x, P.z, true);
    GS.mkt.held.push({ cat: "veh", item: "pickup", cond: 0.7, seller: "T", site: "${id}", name: "T", state: "wait", seed: 1 });
    mktCollect(site);
    const o = s.owned[0]; const fx = Math.sin(o.yaw), fz = Math.cos(o.yaw);
    FOOT.on = true; FOOT.x = o.x + fz * 2.4; FOOT.z = o.z - fx * 2.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.yaw = o.yaw - 1.4; recenter(FOOT.x, FOOT.z, true);
    let door = 1e9; for (const b of INT.beacons) door = Math.min(door, Math.hypot(b.x - FOOT.x, b.z - FOOT.z));
    return { door, uid: o.uid };
  })()`);
  await sleep(900);
  const hint = await ev(`$("wnHint").textContent`);
  console.log(`${id}: door ${r.door.toFixed(1)} m from the walker; hint "${hint}"`);
  await tap("KeyQ"); for (let i = 0; i < 40; i++) { await sleep(400); if (!(await J("({f:FOOT.on})")).f) break; }
  const g = await J(`({ foot: FOOT.on, cur: TLX.state("vehicles").cur, intOn: !!INT.on })`);
  ok(!g.foot && g.cur === r.uid && !g.intOn, `${id}: Q gets in the pickup (${JSON.stringify(g)})`);
}
await done(fails ? 1 : 0);
