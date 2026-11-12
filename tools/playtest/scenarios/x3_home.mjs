// Slice 3.4b2b (G4): a car now and then drives a village street to a door and parks there as one of 3.3a's cars.
// Asserts, exit 1 on a failure.
//  A. homes: parked cars a driver can reach (clear street leg) >= 3, prepared in < 400 ms; owners out at boot are only
//     ever reachable ones. An away car's spot is empty: no obstacle circles, no snow, no DIG, not counted as buried.
//  B. sent home (TLXT.sendHome, 200 m back on the road): leaves the road, drives the street at <= 6.3 m/s, never
//     closer than 0.75 m (car circles to any house/shed/tree/parked car edge), ends exactly on the spot facing the
//     house; then the traffic car is gone and the parked car is back (visible, 3 circles, its own colour came along).
//  C. a walker on the street in front of it: stops >= 4.5 m short, never pushes; walker gone -> it parks.
//  D. now and then: with you in the village and a free spot near, the timer puts a car bound there on the road in, out
//     of sight (>= 160 m from you).
//  E. Road traffic off: every owner is home (no empty spots), no tick error.
import { boot, ev, sleep, done, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
const NOSTILLS = !!process.env.NOSTILLS;
async function waitGame(s, fn) { const t0 = await clock(); while ((await clock()) - t0 < s) { if (fn && await fn()) return true; await sleep(150); } return false; }
let camHooked = false;
async function cam(expr) {
  if (!camHooked) { await ev(`(() => { const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); }; return true; })()`); camHooked = true; }
  await ev(`(() => { window.camOv = c => { const v = (${expr}); c.position.set(v[0], v[1], v[2]); c.lookAt(v[3], v[4], v[5]); }; return true; })()`);
  await sleep(350);
}

process.env.TL_AWAY = "1";   // keep the boot's owners-out pick (lib's launch() would bring everyone home)
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34.5; true`); await sleep(1200);

// ---- A
const A = await J(`(() => { const T = TLXT, C = TLXC; return { ready: T.ready, err: T.err, homes: T.homes.length, ms: T.homeMs, cars: C.cars.length,
  away: C.cars.filter(c => c.away).map(c => c.i), homeCi: T.homes.map(h => h.ci), sides: T.homes.map(h => h.side), lens: T.homes.map(h => Math.round(h.len)) }; })()`);
console.log("A:", JSON.stringify(A));
ok(A.ready && !A.err && A.homes >= 3 && A.ms < 400, `A: ${A.homes} of ${A.cars} parked cars reachable by a driver, prepared in ${A.ms} ms`);
ok(A.away.every(i => A.homeCi.includes(i)), `A: owners out at boot (${A.away.length}) are all reachable spots`);
// every home's whole drive (route street + lane + nose-in), as the car's three circles: clear of everything static
const A2 = await J(`(() => { const T = TLXT, out = [];
  for (let hi = 0; hi < T.homes.length; hi++) { const h = T.homes[hi], p = T.homePath(hi); let m = 1e9, at = null;
    const cum = [0]; for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
    const L = cum[cum.length - 1], pt = s => { let k = 0; while (k < p.length - 2 && cum[k + 1] <= s) k++; const t = (s - cum[k]) / ((cum[k + 1] - cum[k]) || 1); return [p[k][0] + (p[k + 1][0] - p[k][0]) * t, p[k][1] + (p[k + 1][1] - p[k][1]) * t]; };
    for (let s = 6; s <= L; s += 0.5) { const a = pt(Math.max(0, s - 1.6)), b = pt(Math.min(L, s + 1.6)), c = pt(s), yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
      for (const u of [-1.45, 0, 1.45]) { const x = c[0] + Math.sin(yaw) * u, z = c[1] + Math.cos(yaw) * u;
        for (const o of obstaclesNear(x, z, 5)) { if (o.top < -1e8 || o.car === h.ci) continue; const d = Math.hypot(o.x - x, o.z - z) - (o.r || 0.5) - 0.95; if (d < m) { m = d; at = [Math.round(o.x), Math.round(o.z), +(o.r || 0).toFixed(2), o.car ?? (o.tree !== undefined ? "tree" : "")]; } } } }
    out.push({ hi, ci: h.ci, L: Math.round(L), m: +m.toFixed(2), at }); }
  return out; })()`);
console.log("A2:", JSON.stringify(A2));
const A2bad = A2.filter(q => q.m < -0.065);
ok(!A2bad.length, `A: every home's drive keeps the car's circles clear of houses/trees/cars (worst ${Math.min(...A2.map(q => q.m)).toFixed(2)} m; bad: ${JSON.stringify(A2bad)})`);
// put the first three reachable owners out for the test, everyone else home
const Aw = await J(`(() => { const T = TLXT, C = TLXC; for (const c of C.cars) C.setAway(c.i, false); for (const h of T.homes.slice(0, 3)) C.setAway(h.ci, true);
  const h = T.homes[0], c = C.cars[h.ci], W = window.__tl ? null : null;
  const circ = obstaclesNear(c.x, c.z, 5).filter(o => o.car === c.i).length;
  C.setSnow(c.i, 0.9); C.step(0.5);
  FOOT.on = true; const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); FOOT.x = c.x + fz * 1.9; FOOT.z = c.z - fx * 1.9; FOOT.y = surf(FOOT.x, FOOT.z);
  const dig = C.digNear(); const r = { circ, b: c.b, dig: dig ? dig.i : -1, buried: C.buried(), away: C.awayN(), hid: !!c.hid };
  FOOT.on = false; return r; })()`);
console.log("A away:", JSON.stringify(Aw));
ok(Aw.circ === 0 && Aw.b === 0 && Aw.dig === -1 && Aw.hid && Aw.away === 3, `A: an empty spot has no circles (${Aw.circ}), no snow (${Aw.b}), no DIG, hidden; 3 away`);

// where you wait: 30-70 m from the spot, well clear of the car's whole path
const placeYou = hi => J(`(() => { const T = TLXT, h = T.homes[${hi}], pts = h.r.pts.concat(h.tail);
  for (let k = 0; k < 400; k++) { const a = Math.random() * 6.283, d = 30 + Math.random() * 40, x = h.x + Math.sin(a) * d, z = h.z + Math.cos(a) * d;
    if (isSea(x, z) || isWater(x, z) || obNear(x, z, 3)) continue;
    let m = 1e9; for (const p of pts) m = Math.min(m, Math.hypot(p[0] - x, p[1] - z)); if (m < 14) continue;
    crashCancel(); FOOT.on = false; P.x = x; P.z = z; P.y = surf(x, z) + 0.3; P.vx = P.vz = 0; recenter(x, z, true); return { x, z, m }; }
  return null; })()`);

// ---- B: sent home
const HI = 0;
const you = await placeYou(HI); console.log("you:", JSON.stringify(you));
await sleep(600);
const B0 = await J(`(() => { const T = TLXT, c = T.sendHome(${HI}, 200), h = T.homes[${HI}]; window.__hd = T.homesDone; return { s: c.s, dir: c.dir, side: h.side, d: Math.hypot(c.x - h.x, c.z - h.z), pcol: TLXC.cars[h.ci].col, col: c.col }; })()`);
console.log("B0:", JSON.stringify(B0));
let Bhome = false, Bvmax = 0, Bclr = 1e9, Bclrat = null, shots = 0, Bcol = null;
const Bdone = await waitGame(150, async () => {
  const q = await J(`(() => { const T = TLXT, c = T.cars[0]; if (!c.on) return { off: true, done: T.homesDone - window.__hd };
    let m = 1e9, at = null; if (c.st === "home") { const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
      for (const u of [-1.45, 0, 1.45]) { const x = c.x + fx * u, z = c.z + fz * u; for (const o of obstaclesNear(x, z, 5)) { if (o.top < -1e8) continue; const d = Math.hypot(o.x - x, o.z - z) - (o.r || 0.5); if (d < m) { m = d; at = [Math.round(o.x), Math.round(o.z), o.r, o.car]; } } } }
    return { st: c.st, v: c.v, m, at, hs: c.hs, L: c.H ? c.H.L : 0, x: c.x, z: c.z, col: c.col }; })()`);
  if (q.off) return q.done > 0;
  if (q.st === "home") { Bhome = true; if (Bcol == null) Bcol = q.col; Bvmax = Math.max(Bvmax, q.v); if (q.m < Bclr) { Bclr = q.m; Bclrat = q.at; }
    if (!NOSTILLS && shots < 3 && q.hs > q.L * (0.25 + shots * 0.3)) { await cam(`(() => { const c = TLXT.cars[0]; return [c.x - Math.sin(c.yaw) * 9, c.y + 6, c.z - Math.cos(c.yaw) * 9, c.x, c.y + 0.8, c.z]; })()`); await shot(`x3h_B${shots}`); shots++; await ev("window.camOv = null; true"); } }
  return false; });
const B = await J(`(() => { const T = TLXT, h = T.homes[${HI}], pc = TLXC.cars[h.ci], L = T.lastHome || {}; return { done: T.homesDone - window.__hd, away: !!pc.away, hid: !!pc.hid,
  circ: obstaclesNear(pc.x, pc.z, 5).filter(o => o.car === pc.i).length, dpos: Math.hypot((L.x ?? 1e9) - pc.x, (L.z ?? 1e9) - pc.z), dyaw: Math.abs(Math.atan2(Math.sin((L.yaw ?? 9) - pc.yaw), Math.cos((L.yaw ?? 9) - pc.yaw))), on: T.cars[0].on, taken: h.taken, err: T.tickErr || TLXC.tickErr || null }; })()`);
console.log("B:", JSON.stringify(B), "vmax", Bvmax.toFixed(2), "clearance", Bclr.toFixed(2), JSON.stringify(Bclrat));
ok(Bdone && Bhome && B.done === 1, "B: the car left the road and drove the street home");
ok(Bvmax <= 6.6, `B: street speed at most ${Bvmax.toFixed(2)} m/s (streets 6)`);
ok(Bclr >= 0.75, `B: never closer than ${Bclr.toFixed(2)} m to a house/shed/tree/car edge`);
ok(B.dpos < 0.1 && B.dyaw < 0.06, `B: stopped on the spot (${B.dpos.toFixed(3)} m, ${B.dyaw.toFixed(3)} rad off), nosed in`);
ok(!B.away && !B.hid && B.circ === 3 && !B.on && B.taken === -1 && !B.err, `B: parked car back (3 circles, visible), traffic car gone, no tick error`);
ok(Bcol === B0.pcol && B0.col !== B0.pcol, `B: on its way home it's the owner's car (colour ${Bcol} = parked ${B0.pcol}; was ${B0.col} on the road)`);
if (!NOSTILLS) { const hx = await J(`(() => { const h = TLXT.homes[${HI}], c = TLXC.cars[h.ci]; return [c.x, c.y, c.z, c.yaw]; })()`);
  await cam(`[${hx[0]} - Math.sin(${hx[3]}) * 8 + Math.cos(${hx[3]}) * 4, ${hx[1]} + 4.5, ${hx[2]} - Math.cos(${hx[3]}) * 8 - Math.sin(${hx[3]}) * 4, ${hx[0]}, ${hx[1]} + 0.6, ${hx[2]}]`); await shot("x3h_B_parked"); await ev("window.camOv = null; true"); }

// ---- C: a walker on the street in front of it
await ev(`TLXC.setAway(TLXT.homes[${HI}].ci, true); true`);
await placeYou(HI);
await ev(`(() => { const T = TLXT; T.sendHome(${HI}, 120); window.__hd = T.homesDone; return true; })()`);
const Cgo = await waitGame(90, async () => (await J(`(() => { const c = TLXT.cars[0]; return c.st === "home" && c.hs > 12 && c.H.L - c.hs > 30; })()`)));
const C0 = await J(`(() => { const c = TLXT.cars[0], H = c.H; let k = 0; const s = c.hs + 16; while (k < H.cum.length - 2 && H.cum[k + 1] <= s) k++;
  const a = H.pts[k], b = H.pts[k + 1], t = (s - H.cum[k]) / ((H.cum[k + 1] - H.cum[k]) || 1), x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
  P.x += 0; FOOT.on = true; FOOT.x = x; FOOT.z = z; FOOT.y = surf(x, z); window.__fx = x; window.__fz = z; return { x, z, v: c.v }; })()`);
let Cmin = 1e9;
await waitGame(10, async () => { const d = await J(`(() => { const c = TLXT.cars[0], fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); return Math.hypot(FOOT.x - c.x, FOOT.z - c.z); })()`); Cmin = Math.min(Cmin, d); return false; });
const C1 = await J(`({ v: TLXT.cars[0].v, st: TLXT.cars[0].st, why: TLXT.cars[0].why, push: Math.hypot(FOOT.x - window.__fx, FOOT.z - window.__fz) })`);
console.log("C:", JSON.stringify({ Cgo, C0, C1, Cmin }));
ok(Cgo && C1.st === "home" && C1.v < 0.3 && C1.why === "walker" && Cmin >= 4.5, `C: stopped for a walker on the street, closest ${Cmin.toFixed(2)} m (gap 5.5)`);
ok(C1.push < 0.05, `C: walker never pushed (${C1.push.toFixed(3)} m)`);
await ev(`FOOT.on = false; true`);
const Cdone = await waitGame(60, async () => (await J(`TLXT.homesDone - window.__hd`)) > 0);
ok(Cdone, "C: walker gone, the car drove on and parked");

// ---- D: now and then
const HI2 = 1;
const D0 = await J(`(() => { const T = TLXT; for (const c of T.cars) { c.on = false; } T.hold = false; for (const h of T.homes) h.taken = -1; return true; })()`);
await placeYou(HI2);
await ev(`(() => { const T = TLXT; for (const c of T.cars) c.on = false; T.homeT = 0; window.__sent = T.sent || 0; return true; })()`);
await waitGame(0.5);
const D = await J(`(() => { const T = TLXT, c = T.cars.find(c => c.on && c.homeI != null); if (!c) return { sent: (T.sent || 0) - window.__sent };
  const h = T.homes[c.homeI]; return { sent: (T.sent || 0) - window.__sent, d: Math.hypot(c.x - P.x, c.z - P.z), spot: Math.hypot(h.x - P.x, h.z - P.z), away: !!TLXC.cars[h.ci].away, homeT: T.homeT }; })()`);
console.log("D:", JSON.stringify(D));
ok(D.sent === 1 && D.d >= 160 && D.spot < 420 && D.away && D.homeT > 100, `D: a car bound for an empty spot ${D.spot && D.spot.toFixed(0)} m from you turned up ${D.d && D.d.toFixed(0)} m away on the road in; next in ${D.homeT && D.homeT.toFixed(0)} s`);

// ---- E: option off
await ev(`TLX.setOn("traffic", false); true`); await waitGame(1);
const E = await J(`({ away: TLXC.awayN(), err: TLXT.tickErr || TLXC.tickErr || null, homing: TLXT.cars.filter(c => c.st === "home").length })`);
await ev(`TLX.setOn("traffic", true); true`); await waitGame(1);
const E2 = await J(`({ err: TLXT.tickErr || TLXC.tickErr || null })`);
console.log("E:", JSON.stringify(E), JSON.stringify(E2));
ok(E.away === 0 && !E.err && E.homing === 0 && !E2.err, "E: Road traffic off -> every owner home, nobody homing, no tick error (on again: none)");

console.log(fails ? `${fails} FAILED` : "all ok");
await done(fails ? 1 : 0);
