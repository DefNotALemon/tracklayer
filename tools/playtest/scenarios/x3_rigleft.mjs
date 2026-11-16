// Expansion slice 3.5b2b2: a rig left standing, the third trailer, marker lamps after dark, coupled speed and hill numbers
// (tlx-rig.js v3). Asserts, exit 1 on a failure.
//   A. three trailers: the curtainsider (mh) has its own lay-by outside Mehamn, clear, plowed, solid
//   B. marker lamps: dull by day; after dark near-black on a trailer on its legs, lit on a coupled one
//   C. coupled in its own lay-by and swapped away from: no triangle, no toast (it is where trailers stand)
//   D. coupled top speed on a cleared road, and a standing start on the steepest stretch of open road (numbers, by script)
//   E. swapped away from on the road: the rig stays coupled, a toast says so, a warning triangle stands 12 m behind the
//      tail on the trailer's line; back in the lorry it is gone; leaving again says it again
//   F. the lorry gone from the save while coupled (sold): a toast, the trailer on its legs, the triangle still out
//   G. a reload keeps all of that
// Stills (OUT): the triangle behind the left rig by day and at night.
import { boot, ev, tap, sleep, done, reload, down, up, shot, sideCam, camOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(120); }
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
const place = (id, ahead, yawOff = 0, vf = 0) => ev(`(() => { const t = TLXRIG.list().find(t => t.id === "${id}"), yaw = t.yaw + ${yawOff}, fz = TLXV.rt().def.fifthZ;
  const fx = t.kx + Math.sin(t.yaw) * ${ahead}, fzz = t.kz + Math.cos(t.yaw) * ${ahead};
  P.x = fx - Math.sin(yaw) * fz; P.z = fzz - Math.cos(yaw) * fz; P.yaw = yaw; P.vx = Math.sin(yaw) * ${vf}; P.vz = Math.cos(yaw) * ${vf}; P.vy = 0; P.y = surf(P.x, P.z); BOG.on = false; BOG.acc = 0; FOOT.on = false; FOOT.g.visible = false; recenter(P.x, P.z, true); camState.init = false; return 1; })()`);
async function backUnder(id, secs = 25) { const t0 = await clock(); while ((await clock()) - t0 < secs) { if ((await tr(id)).on) return true; const v = (await spd()).vf; if (v > -1.0) { await down("KeyS"); await sleep(120); await up("KeyS"); } await sleep(120); } return false; }
const swap = async uid => { await ev(`TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(1300); };
// a rail: each frame the lorry is put on the road's centre line, heading along it, its speed kept (steering out of the
// picture: what is measured is what the engine, the weight, the snow and the grade allow)
const rail = (id, i0, dir, v0 = 0) => ev(`(() => { const rt = TLXR.routes.find(r => r.id === "${id}"), p = rt.pts; let i = ${i0}; window.__rail = true;
  const f = () => { if (!window.__rail) return; requestAnimationFrame(f);
    for (let n = 0; n < 40; n++) { const j = i + ${dir}; if (j < 0 || j >= p.length) { window.__rail = false; return; }
      const ux = p[j][0] - p[i][0], uz = p[j][1] - p[i][1], uu = ux * ux + uz * uz || 1, t = ((P.x - p[i][0]) * ux + (P.z - p[i][1]) * uz) / uu;
      if (t > 1) { i = j; continue; }
      const L = Math.sqrt(uu), yaw = Math.atan2(ux, uz), v = P.vx * Math.sin(P.yaw) + P.vz * Math.cos(P.yaw), tt = Math.max(0, t);
      P.x = p[i][0] + ux * tt; P.z = p[i][1] + uz * tt; P.yaw = yaw; P.yr = 0; P.vx = Math.sin(yaw) * v; P.vz = Math.cos(yaw) * v; window.__railI = i; break; } };
  const j = i + ${dir}; P.x = p[i][0]; P.z = p[i][1]; P.yaw = Math.atan2(p[j][0] - p[i][0], p[j][1] - p[i][1]); P.vy = 0; P.vx = Math.sin(P.yaw) * ${v0}; P.vz = Math.cos(P.yaw) * ${v0}; P.y = surf(P.x, P.z); BOG.on = false; BOG.acc = 0; FOOT.on = false; FOOT.g.visible = false; recenter(P.x, P.z, true); camState.init = false;
  requestAnimationFrame(f); return 1; })()`);
const railOff = () => ev(`window.__rail = false; P.vx = P.vz = 0; true`);
const vcam = async (yawOff, dist, h, ty = 1.2, back = 0) => { await sideCam(); await ev(`window.camOv = c => { const t = TLXRIG.list().find(t => t.id === "kj"), yaw = t.yaw + ${yawOff}, tx = t.x - Math.sin(t.yaw) * ${back}, tz = t.z - Math.cos(t.yaw) * ${back}, y = surf(tx, tz); c.position.set(tx + Math.sin(yaw) * ${dist}, y + ${ty} + ${h}, tz + Math.cos(yaw) * ${dist}); c.lookAt(tx, y + ${ty}, tz); }; true`); await sleep(400); };

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.hour = 12; GS.storm = 0; WX.at = () => 0; TLX.setOn("traffic", false); GS.cash = 60000; GS.lic.freight = true; true`);

// ---- A. three trailers
const L = await J(`TLXRIG.list()`);
ok(L.length === 3 && L.map(t => t.id + ":" + t.type).join() === "kj:dist,lb:tank,mh:haul" && !(await ev("TLXRIG.err")) && (await J("TLXRIG.miss")).length === 0, `three trailers, each with a lay-by: ${L.map(t => t.id + " " + t.name).join(", ")}`);
{ const mh = L[2], q = await J(`(() => { const t = TLXRIG.list()[2], m = SITES.find(s => s.id === "mehamn"), fx = Math.sin(t.yaw), fz = Math.cos(t.yaw); let bad = 0, pk = 0, n = 0;
    for (let u = -t.over; u <= t.L + 20; u += 2) { const x = t.x + fx * u, z = t.z + fz * u; if (isSea(x, z) || isWater(x, z)) bad++; n++; if (yardAt(x, z) > 0.3) pk++; }
    return { all: TLXRIG.list().map(t => t.id + " " + (Math.abs(groundAt(t.kx, t.kz) - groundAt(t.x, t.z)) / t.L * 100).toFixed(1) + "% s" + (t.home ? t.home.s : "-")).join(", "), dM: m ? Math.round(Math.hypot(t.x - m.x, t.z - m.z)) : -1, road: +TLXR.near(t.x, t.z).d.toFixed(1), bad, pk, n, circ: TLXRIG.circles("mh").length, kg: t.kg, len: +(t.front + t.L + t.over).toFixed(1), slope: +Math.abs(groundAt(t.kx, t.kz) - groundAt(t.x, t.z)).toFixed(2) }; })()`);
  console.log("mh", JSON.stringify(q));
  ok(mh.legs === 1 && mh.on === null && q.bad === 0 && q.pk >= q.n - 1 && q.road > 4 && q.road < 8 && q.dM > 100 && q.dM < 2600 && q.circ >= 7 && q.kg === 6800 && q.slope / mh.L <= 0.05,
    `the curtainsider (${q.len} m, 6.8 t) stands on its legs in a plowed lay-by ${q.road} m off the road's centre, ${q.dM} m from Mehamn, ${q.circ} solid circles`); }

// ---- B. lamps by day and after dark, on legs
await ev(`(() => { const t = TLXRIG.list()[0]; P.x = t.kx + Math.cos(t.yaw) * 8; P.z = t.kz - Math.sin(t.yaw) * 8; P.vx = P.vz = 0; P.y = surf(P.x, P.z); recenter(P.x, P.z, true); return 1; })()`); await sleep(900);
const dayL = (await tr("kj")).lamp, dayF = await ev("dayFactor()");
await ev(`GS.hour = 23; true`); await sleep(700);
const nightL = (await tr("kj")).lamp, nightF = await ev("dayFactor()");
ok(dayF > 0.6 && nightF < 0.1 && Math.abs(dayL - 0.55) < 0.12 && nightL < 0.2 && !(await tr("kj")).tri, `a trailer on its legs in its lay-by: lamps ${dayL.toFixed(2)} by day, ${nightL.toFixed(2)} after dark (unpowered), no triangle`);
await ev(`GS.hour = 12; true`);

// ---- C. couple in the lay-by, swap away: nothing to mark
await ev(`TLXV.buy("pickup"); TLXV.buy("tractor"); true`); await sleep(500);
const own = await J(`TLX.state("vehicles").owned.map(r => ({ uid: r.uid, id: r.id }))`), pu = own.find(o => o.id === "pickup"), tk = own.find(o => o.id === "tractor");
ok(pu && tk, "a pickup and a tractor unit bought");
await swap(tk.uid); await place("kj", 1.6, 0.02); await waitGame(0.6);
ok(await backUnder("kj", 25), "the tractor couples the box trailer"); await sleep(400);
await ev(`TLX.state("rig").t.kj.legs = 0; P.vx = P.vz = 0; true`); await waitGame(0.4);
await clearToasts(); await swap(pu.uid); await waitGame(0.5);
{ const t = await tr("kj"), ts = await toasts();
  ok(t.on === tk.uid && !t.tri && !t.left && !ts.some(m => /stay here, coupled/.test(m)), "swapped away from in its own lay-by: still coupled, no triangle, no toast"); }
await ev(`GS.hour = 23; true`); await sleep(600);
{ const t = await tr("kj"); ok(t.lamp > 1.8, `after dark the coupled trailer's marker lamps are lit (${t.lamp.toFixed(2)})`); }
await ev(`GS.hour = 12; true`);
await swap(tk.uid);

// ---- D. numbers: top speed on the most level cleared road, standing starts on a 9% grade and on the steepest open road,
// and the steepest taken at a run
const runs = await J(`(() => { let flat = null, hill = null, mid = null;
  for (const r of TLXR.routes) { if (!r.cum || r.closed) continue; const q = r.pts, cc = r.cum, n = q.length, far = k => Math.hypot(q[k][0] - depot.x, q[k][1] - depot.z) > TOWN_R + 60;
    const wet = (i, j) => { for (let k = i; k <= j; k++) if (isWater(q[k][0], q[k][1]) || isSea(q[k][0], q[k][1])) return true; return false; };
    const gr = []; { let j = 0; for (let i = 0; i < n; i++) { while (j < n - 1 && cc[j] - cc[i] < 30) j++; gr.push(cc[j] - cc[i] < 30 ? 0 : Math.abs(groundAt(q[j][0], q[j][1]) - groundAt(q[i][0], q[i][1])) / (cc[j] - cc[i])); } }
    for (let i = 0, j = 0; i < n; i += 4) { while (j < n - 1 && cc[j] - cc[i] < 900) j++; if (cc[j] - cc[i] < 900) break; if (!far(i) || !far(j)) continue; let g = 0; for (let k = i; k < j; k++) g = Math.max(g, gr[k]); if (!flat || g < flat.g) flat = { id: r.id, i, j, g }; }
    for (let i = 0, j = 0; i < n; i++) { while (j < n - 1 && cc[j] - cc[i] < 80) j++; if (cc[j] - cc[i] < 80) break; if (!far(i) || !far(j) || wet(i, j)) continue;
      const g = (groundAt(q[j][0], q[j][1]) - groundAt(q[i][0], q[i][1])) / (cc[j] - cc[i]), up = g > 0, o = { id: r.id, i: up ? i : j, e: up ? j : i, dir: up ? 1 : -1, g: Math.abs(g) };
      if (!hill || o.g > hill.g) hill = o; if (o.g <= 0.09 && (!mid || o.g > mid.g)) mid = o; } }
  { const r = TLXR.routes.find(r => r.id === hill.id), cc = r.cum; let k = hill.i; while (k - hill.dir >= 0 && k - hill.dir < r.pts.length && Math.abs(cc[k] - cc[hill.i]) < 160) k -= hill.dir; hill.a = k; let e = hill.e; while (e + hill.dir >= 0 && e + hill.dir < r.pts.length && Math.abs(cc[e] - cc[hill.e]) < 60) e += hill.dir; hill.x = e; }
  return { flat, hill, mid }; })()`);
console.log("runs", JSON.stringify(runs));
await ev(`TLXR.setPlowed && TLXR.setPlowed(null, 0); true`);
const F = runs.flat;
await rail(F.id, F.i, 1); await sleep(600);
let vmax = 0, v10 = 0, v20 = 0, dist = 0, tTop = 0, vEnd = 0, tEnd = 0;
{ await down("KeyW"); const p0 = await spd(); let last = p0;
  for (;;) { await sleep(400); const q = await spd(), t = q.t - p0.t; dist += Math.hypot(q.x - last.x, q.z - last.z); last = q; vEnd = q.v; tEnd = t; if (q.v > vmax + 0.05) { vmax = q.v; tTop = t; } if (!v10 && t >= 10) v10 = q.v; if (!v20 && t >= 20) v20 = q.v; if (t > 80 || dist > 860 || !(await ev("window.__rail"))) break; }
  await up("KeyW"); }
const massC = await J(`TLXV.rt().mass`), artMax = Math.abs((await tr("kj")).art) * 57.3;
await railOff(); await sleep(300);
console.log("top", JSON.stringify({ road: F.id, gmax: +F.g.toFixed(3), vmax, v10, v20, vEnd, tEnd: Math.round(tEnd), dist: Math.round(dist), tTop: Math.round(tTop), massC }));
ok(Math.abs(massC - 14400) < 60 && F.g < 0.05 && vmax > 12 && vmax <= 25.3 && v10 > 3 && v10 < vmax, `coupled (14.4 t) on the most level 900 m of cleared road (${F.id}, at most ${(F.g * 100).toFixed(1)}%): ${v10.toFixed(1)} m/s at 10 s, ${v20.toFixed(1)} at 20 s, ${vmax.toFixed(1)} m/s (${Math.round(vmax * 3.6)} km/h) the most it reached, ${vEnd.toFixed(1)} after ${Math.round(tEnd)} s and ${Math.round(dist)} m (bobtail is limited to 25)`);
ok((await tr("kj")).on === tk.uid && artMax < 25, `the trailer is still on, ${artMax.toFixed(0)} deg of articulation at the end of the run`);
// a standing start (or a run-in at v0) up a stretch: how far, how fast, what the lorry said
async function climb(Hh, i, v0, secs, far) {
  await rail(Hh.id, i, Hh.dir, v0); await sleep(v0 ? 60 : 900); await clearToasts();
  const p0 = await spd(), y0 = await ev("groundAt(P.x, P.z)"); await down("KeyW"); let last = p0, q = p0, d = 0, vmin = 99; const said = new Set();
  for (;;) { await sleep(300); q = await spd(); d += Math.hypot(q.x - last.x, q.z - last.z); last = q; vmin = Math.min(vmin, q.v); for (const m of await toasts()) said.add(m); if (q.t - p0.t >= secs || d > far) break; }
  await up("KeyW"); const y1 = await ev("groundAt(P.x, P.z)"); await railOff(); await sleep(300);
  const o = { id: Hh.id, g: +(Hh.g * 100).toFixed(1), d: +d.toFixed(1), v: q.v, vmin, rise: +(y1 - y0).toFixed(1), t: +(q.t - p0.t).toFixed(1), said: [...said] }; console.log("climb", JSON.stringify(o)); return o;
}
const M = runs.mid, H = runs.hill;
{ const c = await climb(M, M.i, 0, 14, 75);
  ok(M.g > 0.05 && c.d > 15 && c.v > 1.5, `a standing start on a ${c.g}% grade (${c.id}), cleared road: ${c.d.toFixed(0)} m and ${c.v.toFixed(1)} m/s after ${c.t.toFixed(0)} s`); }
{ const c = await climb(H, H.i, 0, 20, 60), steep = c.said.some(m => /Too steep to climb/.test(m));
  ok(c.d > 15 ? c.v > 1 : steep, c.d > 15 ? `a standing start on the steepest 80 m of open road (${c.id}, ${c.g}%): ${c.d.toFixed(0)} m and ${c.v.toFixed(1)} m/s after ${c.t.toFixed(0)} s` : `a standing start on the steepest 80 m of open road (${c.id}, ${c.g}%) does not get away (${c.d.toFixed(1)} m in ${c.t.toFixed(0)} s) and the lorry says why: "${c.said.find(m => /Too steep/.test(m)) || ""}"`); }
{ const r = await J(`(() => { const rt = TLXR.routes.find(r => r.id === "${H.id}"); return Math.abs(rt.cum[${H.x}] - rt.cum[${H.a}]); })()`);
  const c = await climb(H, H.a, 12, 40, r - 4), over = c.d >= r - 6;
  ok(over ? c.vmin > 0.5 : c.said.some(m => /Too steep/.test(m)) || c.v < 0.3, over ? `taken at a run (12 m/s, 160 m before it) the rig is over the steepest stretch: never under ${c.vmin.toFixed(1)} m/s across ${c.d.toFixed(0)} m` : `taken at a run (12 m/s, 160 m before it) the rig stalls on the steepest stretch after ${c.d.toFixed(0)} of ${r.toFixed(0)} m`); }

// ---- E. left on the road
await rail(F.id, F.i + 8, 1); await sleep(500); await railOff(); await waitGame(1.2);
await clearToasts(); await swap(pu.uid); await waitGame(0.6);
let t = await tr("kj"), ts = await toasts();
ok(t.on === tk.uid && t.left && ts.filter(m => /stay here, coupled/.test(m)).length === 1 && ts.some(m => /warning triangle/.test(m) && /box trailer/.test(m)), `swapped away from on the road: still coupled, one toast: "${ts.find(m => /stay here/.test(m)) || ""}"`);
await ev(`(() => { const t = TLXRIG.list()[0]; P.x = t.x - Math.sin(t.yaw) * 40 + Math.cos(t.yaw) * 3; P.z = t.z - Math.cos(t.yaw) * 40 - Math.sin(t.yaw) * 3; P.vx = P.vz = 0; P.y = surf(P.x, P.z); recenter(P.x, P.z, true); camState.init = false; return 1; })()`); await sleep(900);
t = await tr("kj"); ok(t.tri && t.vis, "with the pickup pulled up 40 m behind it, the triangle is out");
{ const fx = Math.sin(t.yaw), fz = Math.cos(t.yaw), ex = t.triP[0] - t.x, ez = t.triP[2] - t.z, along = ex * fx + ez * fz, side = ex * fz - ez * fx, gy = await ev(`surf(${t.triP[0]}, ${t.triP[2]})`);
  ok(Math.abs(along + t.over + 12) < 0.3 && Math.abs(side) < 0.1 && Math.abs(t.triP[1] - gy) < 0.3, `the triangle stands ${(-along - t.over).toFixed(1)} m behind the tail on the trailer's line, on the ground`); }
{ const pins = await J(`(TABLET.layers.vehicles || []).flatMap(f => f()).map(p => p.name)`); ok(pins.includes("Box trailer"), "and the Map pins the trailer"); }
await ev(`(() => { const t = TLXRIG.list()[0]; P.x = t.x - Math.sin(t.yaw) * 40 + Math.cos(t.yaw) * 3; P.z = t.z - Math.cos(t.yaw) * 40 - Math.sin(t.yaw) * 3; P.vx = P.vz = 0; P.y = surf(P.x, P.z); recenter(P.x, P.z, true); return 1; })()`); await sleep(500);
await vcam(Math.PI + 0.25, 13, 1.6, 0.8, 14); await still("l1_triangle_day");
await ev(`GS.hour = 23; true`); await sleep(900); await still("l2_triangle_night");
{ const q = await tr("kj"); ok(q.lamp > 1.8 && q.tri, `after dark the left rig keeps its marker lamps on (${q.lamp.toFixed(2)})`); }
await ev(`GS.hour = 12; true`); await camOff();
await clearToasts(); await swap(tk.uid); await waitGame(0.5);
t = await tr("kj"); ok(!t.tri && !t.left, "back in the lorry the triangle is taken in");
await waitGame(0.5); await swap(pu.uid); await waitGame(0.5); ts = await toasts();
ok((await tr("kj")).tri && ts.filter(m => /stay here, coupled/.test(m)).length === 1, "leaving it again says so again, once");

// ---- F. the lorry gone from the save (sold) while coupled
await clearToasts();
await ev(`(() => { const S = TLX.state("vehicles"); S.owned = S.owned.filter(r => r.uid !== ${JSON.stringify(tk.uid)}); return 1; })()`); await waitGame(0.8);
t = await tr("kj"); ts = await toasts();
ok(t.on === null && t.legs === 1 && t.tri && !(await ev("TLXRIG.err")) && ts.filter(m => /lorry is gone/.test(m)).length === 1, `the lorry sold from under it: "${ts.find(m => /lorry is gone/.test(m)) || ""}", trailer on its legs, triangle out`);
await ev(`GS.hour = 23; true`); await sleep(600);
ok((await tr("kj")).lamp < 0.2, "and its lamps are dark after dark, with no lorry to power them");
await ev(`GS.hour = 12; true`);

// ---- G. reload
await ev(`save(); true`); await sleep(300); const sv = await tr("kj");
await reload(); await sleep(700);
await ev(`tutSkip(); GS.storm = 0; WX.at = () => 0; TLX.setOn("traffic", false); true`); await waitGame(0.6);
{ const a = await J(`TLXRIG.list()`), k = a[0];
  await ev(`(() => { const t = TLXRIG.list()[0]; P.x = t.kx + Math.cos(t.yaw) * 8; P.z = t.kz - Math.sin(t.yaw) * 8; P.vx = P.vz = 0; P.y = surf(P.x, P.z); recenter(P.x, P.z, true); return 1; })()`); await sleep(900);
  const k2 = await tr("kj");
  ok(a.length === 3 && k.on === null && k.legs === 1 && Math.hypot(k.x - sv.x, k.z - sv.z) < 0.05 && k2.tri && a[2].on === null && Math.hypot(a[2].x - L[2].x, a[2].z - L[2].z) < 0.05 && !(await ev("TLXRIG.err")),
    "a reload: the box trailer stands where it was left with its triangle out, the curtainsider in its lay-by"); }

console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
