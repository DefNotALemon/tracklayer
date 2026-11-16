// Expansion slice 3.5b2a: semitrailers and the fifth-wheel coupling (tlx-rig.js). Asserts, exit 1 on a failure.
//   two trailers stand on their legs in plowed lay-bys beside the road (a box trailer outside Kjøllefjord, a tanker outside
//   Lebesby), clear of the road, pinned on the Map; backing the tractor under the kingpin too fast or crooked does not
//   couple and says why; at a crawl and in line it locks and stops the tractor; with the legs down the lorry will not move
//   and says so; on foot at the legs the use key winds them up (keyboard), the rig then pulls away slower than the bobtail
//   with the trailer exactly its wheelbase behind the fifth wheel, cuts inside a bend and straightens after, brakes, backs
//   up; a teleport (rescue / reset) brings the trailer along; UNCOUPLE (pad L3) stands it and the tractor drives out from
//   under it without re-locking; LEGS UP on touch; save / reload coupled, and a save naming a tractor that is gone.
// Stills (OUT): the trailer on its legs, the coupled rig from the side and rear quarter, in a bend from above.
import { boot, ev, tap, sleep, done, padSet, padOff, reload, down, up, shot, sideCam, camOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(120); }
async function waitUntil(expr, maxGame = 14) { const t0 = await clock(); while ((await clock()) - t0 < maxGame) { if (await ev(expr)) return true; await sleep(120); } return false; }
const NOSTILLS = !!process.env.NOSTILLS;
const still = async name => { if (!NOSTILLS) await shot(name); };
// every toast shown since the last clearToasts(), not only the ones on screen now: a toast lives 4.2 s of WALL time and
// headless game time runs slower than that, so one said at the start of a 2.5 s hold could be gone when it was read
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80);
  return 1; })()`);
const tr = id => J(`TLXRIG.list().find(t => t.id === "${id}")`);
const spd = () => J(`({ t: +gameClock.toFixed(2), v: +Math.hypot(P.vx, P.vz).toFixed(2), vf: +(P.vx * Math.sin(P.yaw) + P.vz * Math.cos(P.yaw)).toFixed(2), x: P.x, z: P.z, yaw: P.yaw })`);
const holdFor = async (codes, secs, fn = spd) => {
  codes = [].concat(codes); for (const c of codes) await down(c); const t0 = await clock(), out = [];
  try { for (;;) { await sleep(200); const t = await clock(); out.push(await fn()); if (t - t0 >= secs) break; } } finally { for (const c of codes) await up(c); }
  return out;
};
// the tractor (seated) with its fifth wheel `ahead` m in front of the kingpin of trailer id, `yawOff` off its line, rolling at vf
const place = (id, ahead, yawOff = 0, vf = 0) => ev(`(() => { const t = TLXRIG.list().find(t => t.id === "${id}"), yaw = t.yaw + ${yawOff}, fz = VEH.cur ? TLXV.rt().def.fifthZ : -1.6;
  const fx = t.kx + Math.sin(t.yaw) * ${ahead}, fzz = t.kz + Math.cos(t.yaw) * ${ahead};
  P.x = fx - Math.sin(yaw) * fz; P.z = fzz - Math.cos(yaw) * fz; P.yaw = yaw; P.vx = Math.sin(yaw) * ${vf}; P.vz = Math.cos(yaw) * ${vf}; P.vy = 0; P.y = surf(P.x, P.z); BOG.on = false; BOG.acc = 0; FOOT.on = false; FOOT.g.visible = false; recenter(P.x, P.z, true); camState.init = false; return 1; })()`);
// the walker beside the legs of trailer id (the lorry stays the current vehicle: it is the nearest)
const atLegs = (id, side = 1.9) => ev(`(() => { const t = TLXRIG.list().find(t => t.id === "${id}"), l = TLXRIG.legsPt("${id}"); P.vx = P.vz = 0; FOOT.on = true; FOOT.g.visible = true; FOOT.x = l[0] + Math.cos(t.yaw) * ${side}; FOOT.z = l[1] - Math.sin(t.yaw) * ${side}; FOOT.yaw = t.yaw - 1.57; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; return 1; })()`);
const seat = () => ev(`FOOT.on = false; FOOT.g.visible = false; P.vx = P.vz = 0; true`);
const vcam = async (yawOff, dist, h, ty = 1.6, back = 0) => { await sideCam(); await ev(`window.camOv = c => { const yaw = P.yaw + ${yawOff}, tx = P.x - Math.sin(P.yaw) * ${back}, tz = P.z - Math.cos(P.yaw) * ${back}; c.position.set(tx + Math.sin(yaw) * ${dist}, P.y + ${ty} + ${h}, tz + Math.cos(yaw) * ${dist}); c.lookAt(tx, P.y + ${ty}, tz); }; true`); await sleep(350); };

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.hour = 12; GS.storm = 0; WX.at = () => 0; true`);
await ev(`TLX.setOn("traffic", false); true`);

// ---- A. the trailers in their lay-bys
let L = await J(`TLXRIG.list()`);
console.log("rig", JSON.stringify({ err: await ev("TLXRIG.err"), miss: await J("TLXRIG.miss"), list: L.map(t => ({ id: t.id, type: t.type, x: Math.round(t.x), z: Math.round(t.z), s: t.home && t.home.s })) }));
ok(L.length >= 2 && L[0].id === "kj" && L[0].type === "dist" && L[1].id === "lb" && L[1].type === "tank" && !(await ev("TLXRIG.err")), "two trailers: a box trailer (kj) and a tanker (lb)");
for (const t of L) {
  const q = await J(`(() => { const t = TLXRIG.list().find(t => t.id === "${t.id}"), fx = Math.sin(t.yaw), fz = Math.cos(t.yaw); const pts = [[t.x, t.z], [t.kx, t.kz], [t.kx + fx * 15, t.kz + fz * 15]];
    return { yard: pts.map(p => +yardAt(p[0], p[1]).toFixed(2)), road: pts.map(p => +TLXR.near(p[0], p[1]).d.toFixed(2)), ob: pts.some(p => obstaclesNear(p[0], p[1], 3).some(o => !o.rig && !(o.top < -1e8) && Math.hypot(o.x - p[0], o.z - p[1]) < (o.r || 0.5) + 1.4)), wet: pts.some(p => isWater(p[0], p[1]) || isSea(p[0], p[1])), dg: +(groundAt(t.kx, t.kz) - groundAt(t.x, t.z)).toFixed(2), dep: Math.round(Math.hypot(t.x - depot.x, t.z - depot.z)), snow: +depthAt(Math.round((t.kx + fx * 10 + HALF) / CELL), Math.round((t.kz + fz * 10 + HALF) / CELL)).toFixed(2) }; })()`);
  console.log(t.id, JSON.stringify(q));
  ok(t.on === null && t.legs === 1 && q.yard.every(y => y > 0.5) && !q.ob && !q.wet && Math.abs(q.dg) < 0.4, `${t.id}: on its legs, uncoupled, on plowed, level, clear ground (yard ${q.yard.join("/")}, kingpin ${q.dg} m above the axles' ground)`);
  ok(q.road.every(d => d > 5 && d < 7), `${t.id}: beside the road, clear of its lanes (${q.road.join("/")} m from the centre line; the road is 3.2 m either side)`);
}
ok(Math.hypot(L[0].x - L[1].x, L[0].z - L[1].z) > 1500, `the two stand in different places (${Math.round(Math.hypot(L[0].x - L[1].x, L[0].z - L[1].z))} m apart)`);
{ const pins = await J(`TABLET.layers.vehicles.flatMap(f => f()).map(p => p.name)`);
  ok(pins.includes("Box trailer") && pins.includes("Tanker trailer"), "the Map's vehicle layer pins both: " + pins.join(", ")); }

// ---- B. the tractor: bought, climbed into, brought to the box trailer
await ev(`GS.cash = 12000; GS.lic.freight = true; TLXV.buy("tractor"); true`); await sleep(400);
await ev(`(() => { const r = TLX.state("vehicles").owned[0], fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); FOOT.on = true; FOOT.x = r.x + fz * 3.4 + fx * 1.6; FOOT.z = r.z - fx * 3.4 + fz * 1.6; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`); await sleep(1300);
await tap("KeyQ"); await sleep(300);
ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 16), "in the tractor's cab (the real climb)");
const uid = await ev(`TLX.state("vehicles").cur`);
await place("kj", 6); await sleep(1500);
let t = await tr("kj");
ok(t.vis && t.nW === 4 && t.legY !== null && t.legY < 0.02, `the trailer is drawn: 4 wheels, legs down (inner legs ${t.legY} m up)`);
await vcam(1.5708, 13, 1.0, 1.6, 7); await still("r1_onlegs_side");
await vcam(0.5, 12, 2.5, 1.4, 6); await still("r2_approach");
await camOff();
const m0 = await J(`TLXV.rt().mass`);

// ---- C. refusals: too fast, crooked
await clearToasts(); await place("kj", 0.9, 0, -3.2); await waitGame(0.5);
t = await tr("kj"); let ts = await toasts();
ok(t.on === null && ts.some(s => /Too fast/.test(s)), "backing under it at 3 m/s does not couple and says so: " + (ts.find(s => /Too fast/.test(s)) || ts.join(" | ")));
await waitGame(1.2);
{ const q = await J(`(() => { const t = TLXRIG.list()[0], f = TLXRIG.fifth("${uid}"); return { along: +((f[0] - t.kx) * Math.sin(t.yaw) + (f[1] - t.kz) * Math.cos(t.yaw)).toFixed(2), v: +Math.hypot(P.vx, P.vz).toFixed(2) }; })()`);
  ok(q.along > -0.85, `the trailer's front stops the cab running on under it (fifth wheel ${q.along} m past the kingpin, ${q.v} m/s)`); }
await ev(`P.vx = P.vz = 0; true`); await place("kj", 3, 0); await waitGame(5.5);          // clear of it: re-armed, the toast timer run out
await clearToasts(); await place("kj", 0.8, 0.3, -1.2); await waitGame(0.9);
t = await tr("kj"); ts = await toasts();
ok(t.on === null && ts.some(s => /Not lined up/.test(s)), "17 degrees off its line does not couple and says so: " + (ts.find(s => /Not lined up/.test(s)) || ts.join(" | ")));
await ev(`P.vx = P.vz = 0; true`);

// ---- D. the coupling: straight, at a crawl (taps of reverse)
await place("kj", 1.6, 0.03); await waitGame(0.6); await clearToasts();
{ const t0 = await clock(); let n = 0; while ((await clock()) - t0 < 25) { if ((await tr("kj")).on) break; const v = (await spd()).vf; if (v > -1.0) { await down("KeyS"); await sleep(120); await up("KeyS"); n++; } await sleep(120); }
  console.log("taps of reverse:", n); }
t = await tr("kj"); ts = await toasts();
{ const q = await J(`(() => { const f = TLXRIG.fifth("${uid}"), t = TLXRIG.list()[0]; return { d: +Math.hypot(f[0] - t.kx, f[1] - t.kz).toFixed(3), v: +Math.hypot(P.vx, P.vz).toFixed(2), art: +(t.art * 57.3).toFixed(1) }; })()`);
  ok(t.on === uid && t.legs === 1 && q.d < 0.02 && ts.some(s => /Coupled/.test(s)), `at a crawl and in line it locks: kingpin ${q.d} m from the fifth wheel, articulation ${q.art} deg; "${(ts.find(s => /Coupled/.test(s)) || "").slice(0, 60)}"`); }
// legs down: the lorry is held
await waitGame(5.2); await clearToasts();
{ const a = await spd(); const r = await holdFor("KeyW", 2.5, async () => Object.assign(await spd(), await J(`({ thr: input.thr, said: TLXRIG.list()[0].said, now: gameClock, foot: FOOT.on })`))); const b = r[r.length - 1]; ts = await toasts(); console.log("held", JSON.stringify(b), ts.join(" | "));
  ok(Math.hypot(b.x - a.x, b.z - a.z) < 0.1 && ts.some(s => /legs are still down/.test(s)), `with the legs down full throttle moves it ${Math.hypot(b.x - a.x, b.z - a.z).toFixed(2)} m and a toast says why`); }

// ---- E. on foot at the legs: keyboard
await atLegs("kj"); await sleep(900);
let s = await J(`({ use: footUse(), hint: $("wnHint").textContent, cur: TLX.state("vehicles").cur })`);
ok(s.use === "LEGS UP" && /wind the box trailer's legs up/.test(s.hint) && s.cur === uid, `at the legs the use control reads LEGS UP: "${s.hint}"`);
await vcam(1.9, 9, 0.8, 1.4, 5); await still("r3_coupled_legsdown"); await camOff();
await tap("KeyE"); await sleep(500);
t = await tr("kj"); ok(t.on === uid && t.legs === 0, "the use key winds the legs up");
await waitGame(1.6); t = await tr("kj"); ok(t.legY > 0.35, `and the inner legs draw up (${t.legY.toFixed(2)} m)`);
s = await J(`({ use: footUse(), hint: $("wnHint").textContent })`);
ok(s.use === "UNCOUPLE" && /uncouple the box trailer/.test(s.hint), `now it offers UNCOUPLE: "${s.hint}"`);

// ---- F. on the road: pull away, the wheelbase holds, a bend, the brakes, reverse
const road = await J(`(() => { let best = null; for (const rt of TLXR.routes) { if (!rt.cum || rt.closed) continue; const p = rt.pts, c = rt.cum;
    for (let i = 4; i < p.length - 4; i += 3) { if (Math.hypot(p[i][0] - depot.x, p[i][1] - depot.z) < TOWN_R + 150) continue; let j = i; while (j < p.length - 1 && c[j] - c[i] < 260) j++; if (c[j] - c[i] < 260) break;
      const L = c[j] - c[i], str = Math.hypot(p[j][0] - p[i][0], p[j][1] - p[i][1]) / L; let gmax = 0, off = 0; for (let k = i; k < j; k++) { gmax = Math.max(gmax, Math.abs(groundAt(p[k + 1][0], p[k + 1][1]) - groundAt(p[k][0], p[k][1])) / Math.max(0.5, c[k + 1] - c[k]));
        const ux = (p[j][0] - p[i][0]) / (L * str), uz = (p[j][1] - p[i][1]) / (L * str), dx = p[k][0] - p[i][0], dz = p[k][1] - p[i][1]; off = Math.max(off, Math.abs(dx * uz - dz * ux)); }
      if (isWater(p[i][0], p[i][1])) continue; const sc = off + gmax * 60; if (!best || sc < best.sc) best = { sc, id: rt.id, x: p[i][0], z: p[i][1], x2: p[j][0], z2: p[j][1], L, off: +off.toFixed(2), gmax: +gmax.toFixed(3) }; } }
  return best; })()`);
const rl = Math.hypot(road.x2 - road.x, road.z2 - road.z), ux = (road.x2 - road.x) / rl, uz = (road.z2 - road.z) / rl;
const toRoad = (along = 20) => ev(`(() => { TLXR.setPlowed && TLXR.setPlowed(null, 0); const x = ${road.x} + ${ux} * ${along}, z = ${road.z} + ${uz} * ${along}; P.x = x; P.z = z; P.yaw = Math.atan2(${ux}, ${uz}); P.vx = P.vz = P.vy = 0; BOG.on = false; BOG.acc = 0; FOOT.on = false; FOOT.g.visible = false; recenter(x, z, true); P.y = surf(x, z); camState.init = false; return 1; })()`);
const before = await tr("kj");
await toRoad(); await sleep(1300);
t = await tr("kj");
{ const q = await J(`(() => { const f = TLXRIG.fifth("${uid}"), t = TLXRIG.list()[0]; return { d: +Math.hypot(f[0] - t.x, f[1] - t.z).toFixed(3), art: +(t.art * 57.3).toFixed(1), jump: Math.round(Math.hypot(t.x - ${before.x}, t.z - ${before.z})) }; })()`);
  ok(Math.abs(q.d - t.L) < 0.02 && Math.abs(q.art) < 1 && q.jump > 30, `a teleport of the lorry (a rescue, a reset) brings the trailer along, straight behind (${q.jump} m, axle ${q.d} m behind the fifth wheel, ${q.art} deg)`); }
const m1 = await J(`TLXV.rt().mass`);
let r = await holdFor("KeyW", 4, async () => Object.assign(await spd(), await J(`(() => { const f = TLXRIG.fifth("${uid}"), t = TLXRIG.list()[0]; return { d: Math.hypot(f[0] - t.x, f[1] - t.z), art: t.art }; })()`)));
const v4 = r[r.length - 1].v;
console.log("pull", JSON.stringify(await J(`({ sink: +TLXRIG.list()[0].sink.toFixed(3), drag: Math.round(TLXRIG.list()[0].drag), truck: Math.round(TLXV.rt().drag), fe: Math.round(TLXV.rt().fe), t0: Math.round(TLXV.rt().t0) })`)), r.map(q => q.v).join(" "));
ok(m0 === 7200 && Math.abs(m1 - 14400) < 60, `the trailer's 7.2 t is on the lorry: ${m0} kg bobtail, ${m1} kg coupled`);
ok(v4 > 2.5 && v4 < 7.5, `it pulls away, slower than the bobtail: ${v4.toFixed(1)} m/s after 4 s (bobtail 8.6)`);
ok(r.every(q => Math.abs(q.d - t.L) < 0.02 && Math.abs(q.art) < 0.03), "on the straight the axles stay exactly the wheelbase behind the fifth wheel, in line");
await still("r4_chase");
{ const cam = await J(`({ tow: +camState.tow.toFixed(1) })`); ok(cam.tow > 5, `the chase camera backs off to show the trailer (${cam.tow} m)`); }
r = await holdFor("KeyW", 5);
const vTop = r[r.length - 1].v;
// brakes
{ const b0 = await spd(); await down("KeyS"); let b1 = b0; for (let i = 0; i < 200; i++) { await sleep(100); b1 = await spd(); if (b1.vf < 0.3) break; } await up("KeyS");
  const dec = (b0.v - b1.v) / Math.max(0.1, b1.t - b0.t), dS = Math.hypot(b1.x - b0.x, b1.z - b0.z);
  ok(b1.vf < 0.6 && dec > 2 && dec < 6.5, `the brakes (the trailer's axles help) stop 14.4 t from ${b0.v.toFixed(1)} m/s in ${dS.toFixed(0)} m (${dec.toFixed(1)} m/s2)`); }
await sleep(500); await ev(`P.vx = P.vz = 0; true`);
// a bend: steer left at low speed on the plowed road's width, then straighten
await toRoad(60); await sleep(900);
await holdFor("KeyW", 1.6);
{ const rr = await holdFor(["KeyW", "KeyA"], 1.8, async () => J(`(() => { const t = TLXRIG.list()[0], f = TLXRIG.fifth("${uid}"); return { art: t.art, d: Math.hypot(f[0] - t.x, f[1] - t.z), yaw: P.yaw, v: Math.hypot(P.vx, P.vz) }; })()`));
  const amax = Math.max(...rr.map(q => Math.abs(q.art))) * 57.3;
  await vcam(2.4, 16, 9, 1.0, 6); await still("r5_bend_above"); await camOff();
  ok(amax > 4 && amax < 60 && rr.every(q => Math.abs(q.d - t.L) < 0.02), `in a bend the trailer swings on the coupling and cuts inside (${amax.toFixed(1)} deg of articulation at up to ${Math.max(...rr.map(q => q.v)).toFixed(1)} m/s), the wheelbase held`);
  // the trailer's axles run inside the tractor's rear axle's path: nearer the centre of the turn
  const st = await J(`(() => { const t = TLXRIG.list()[0]; const lx = Math.cos(P.yaw), lz = -Math.sin(P.yaw); return { side: (t.x - P.x) * lx + (t.z - P.z) * lz, steer: TLXV.rt().steer }; })()`);
  console.log("bend", JSON.stringify(st));
  await ev(`(() => { const yaw = P.yaw; P.vx = Math.sin(yaw) * 5; P.vz = Math.cos(yaw) * 5; return 1; })()`);
  // straighten: coast on a plowed pad would be best; here the truck's own heading is held by hand
  const y0 = (await spd()).yaw; let aEnd = 99;
  for (let i = 0; i < 140; i++) { await ev(`(() => { P.yaw = ${y0}; const v = 6; P.vx = Math.sin(P.yaw) * v; P.vz = Math.cos(P.yaw) * v; BOG.on = false; BOG.acc = 0; return 1; })()`); await sleep(100); aEnd = Math.abs((await tr("kj")).art) * 57.3; if (aEnd < 1.5) break; }
  ok(aEnd < 1.5, `and straightens out behind the tractor after (${aEnd.toFixed(1)} deg)`); }
await ev(`P.vx = P.vz = 0; true`);
// reverse: the rig backs up, the coupling holds
await toRoad(120); await sleep(900);
{ const a = await tr("kj"); await down("KeyS"); await waitGame(3); await up("KeyS"); const b = await tr("kj"), q = await spd();
  const back = -((b.x - a.x) * ux + (b.z - a.z) * uz);
  ok(back > 1.5 && Math.abs(b.art) < 1.05 && q.vf < -0.5, `S at a standstill backs the whole rig up (trailer ${back.toFixed(1)} m back in 3 s, ${(b.art * 57.3).toFixed(1)} deg)`); }
await sleep(300); await ev(`P.vx = P.vz = 0; true`); await toRoad(160); await sleep(900);
await vcam(1.5708, 17, 1.2, 1.6, 6); await still("r6_rig_side");
await vcam(2.6, 15, 3.5, 1.4, 8); await still("r7_rig_rear34");
await ev(`GS.hour = 23; true`); await sleep(900); await vcam(0.7, 15, 2.5, 1.4, 5); await still("r8_night"); await ev(`GS.hour = 12; true`); await camOff();

// ---- G. save and reload coupled
await ev(`save(); true`); await sleep(300);
const sv = await tr("kj"), pp = await spd();
await reload(); await sleep(700);
await ev(`tutSkip(); GS.storm = 0; WX.at = () => 0; TLX.setOn("traffic", false); true`);
t = await tr("kj");
s = await J(`({ cur: TLX.state("vehicles").cur, veh: !!VEH.cur, foot: FOOT.on, x: P.x, z: P.z, mass: 0 })`);
ok(s.veh && !s.foot && s.cur === uid && t.on === uid && t.legs === 0 && Math.hypot(t.x - sv.x, t.z - sv.z) < 0.3 && Math.hypot(s.x - pp.x, s.z - pp.z) < 0.5, "a reload while driving the rig comes back coupled, legs up, trailer and lorry where they were");
{ const lb = await tr("lb"); ok(lb.on === null && lb.legs === 1 && Math.hypot(lb.x - L[1].x, lb.z - L[1].z) < 0.05, "the tanker is still on its legs in its lay-by"); }
r = await holdFor("KeyW", 3); ok(r[r.length - 1].v > 1.5 && Math.abs((await J(`TLXV.rt().mass`)) - 14400) < 60, `and drives on with the trailer (${r[r.length - 1].v.toFixed(1)} m/s after 3 s)`);
await sleep(300); await ev(`P.vx = P.vz = 0; true`); await sleep(600);

// ---- H. uncouple with a pad (L3), drive out from under it, no re-lock; then couple again and LEGS UP on touch
await atLegs("kj"); await sleep(900);
await padSet({}, [0, 0, 0.7, 0]); await sleep(350); await padSet({}); await sleep(450);   // a nudge of the right stick: the pad is the active scheme
s = await J(`({ use: footUse(), hint: $("wnHint").textContent })`);
ok(s.use === "UNCOUPLE" && !/\bE:/.test(s.hint) && /uncouple the box trailer/.test(s.hint), `pad: the hint names the pad's button, not a key: "${s.hint}"`);
await padSet({ 10: 1 }); await sleep(350); await padSet({}); await sleep(500); await padOff();
t = await tr("kj"); ok(t.on === null && t.legs === 1, "pad: L3 at the legs winds them down and uncouples");
const stood = t;
await ev(`INP.dev = "kbm"; true`); await seat(); await sleep(400);
r = await holdFor("KeyW", 3.5);
t = await tr("kj");
{ const f = await J(`TLXRIG.fifth("${uid}")`), gap = Math.hypot(f[0] - t.kx, f[1] - t.kz);
  ok(gap > 4 && Math.hypot(t.x - stood.x, t.z - stood.z) < 0.01 && t.on === null && Math.abs((await J(`TLXV.rt().mass`)) - 7200) < 60, `the tractor drives out from under it (${gap.toFixed(1)} m clear), the trailer stays put, the lorry is 7.2 t again`); }
await ev(`P.vx = P.vz = 0; true`);
await waitGame(5.2); await place("kj", 1.6, 0); await waitGame(0.5);
{ const t0 = await clock(); while ((await clock()) - t0 < 25) { if ((await tr("kj")).on) break; const v = (await spd()).vf; if (v > -1.0) { await down("KeyS"); await sleep(120); await up("KeyS"); } await sleep(120); } }
t = await tr("kj"); ok(t.on === uid && t.legs === 1, "backed under it again where it was left (on the road): coupled");
await atLegs("kj"); await sleep(600);
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(800);
s = await J(`({ hidden: $("tcUse").hidden, label: $("tcUse").textContent, hint: $("wnHint").textContent })`);
ok(!s.hidden && s.label === "LEGS UP" && /tap LEGS UP/.test(s.hint), `touch: the use button reads LEGS UP and the hint says to tap it: "${s.hint}"`);
await ev(`(() => { const b = $("tcUse"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return 1; })()`); await sleep(500);
t = await tr("kj"); ok(t.on === uid && t.legs === 0, "touch: the button winds the legs up");
await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`).catch(() => 0);

// ---- I. a save that names a tractor that is gone: the trailer stands on its legs where it was
await ev(`TLX.state("rig").t.kj.on = "ghost"; save(); save = function () { }; true`); await sleep(200);
const was = await tr("kj");
await reload(); await sleep(700);
t = await tr("kj");
ok(t && t.on === null && t.legs === 1 && Math.hypot(t.x - was.x, t.z - was.z) < 0.3, "a save coupled to a lorry that no longer exists loads with the trailer on its legs, uncoupled, where it stood");
ok(!(await ev("TLXRIG.err")), "no rig errors: " + (await ev("TLXRIG.err")));

console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
