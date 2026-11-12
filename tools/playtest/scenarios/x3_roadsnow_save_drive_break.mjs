// Beta break of 3.2a road snow (v197), round 2: junk / old / short roads state in a planted save, a clock that runs
// backwards, and the pickup driven along one stretch plowed vs half drifted vs fully drifted. Prints numbers, asserts
// on page errors, NaN and "loads at all".
import { boot, ev, sleep, done, reload, tap, down, up } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
const roadsOk = `(() => ({ err: TLXR.err || null, terr: TLXR.tickErr || null, ready: TLXR.ready, nan: TLXR.routes.some(r => r.st && (r.st.s.some(v => !isFinite(v)) || !isFinite(r.st.p) || !isFinite(r.st.w))), n: TLXR.routes.filter(r => r.st).map(r => r.st.s.length + "/" + r.seg.length).join(" ") }))()`;
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(800);
await ev(`save(); true`);
const cur = JSON.parse(await (await import("../lib.mjs")).raw(`localStorage.getItem("tracklayer.save.v2")`));
console.log("roads state saved:", JSON.stringify(cur.x && cur.x.sys && cur.x.sys.roads).slice(0, 200));

// ---- A: planted junk
const variants = {
  nullR: s => { s.r = null; },
  arrR: s => { s.r = [1, 2, 3]; },
  shortS: s => { s.r = { fv888: { s: [0.9, 0.9], p: 100, w: 0.2 } }; },
  longS: s => { s.r = { fv888: { s: Array(500).fill(0.8), p: 1e9, w: "x" } }; },
  strS: s => { s.r = { fv888: { s: "abc", p: "7", w: null }, gamvik: 5, dyfjord: { s: [null, "0.5", {}, -3, 9e9] } }; },
  hStr: s => { s.h = "soon"; s.r = {}; },
  hNeg: s => { s.h = -50; },
  hHuge: s => { s.h = 1e9; },
  hFuture: s => { s.h = cur.hour !== undefined ? cur.hour + 500 : 600; s.r = { lebesby: { s: Array(60).fill(0.9), p: -1, w: 0 } }; },
  noRoads: s => { delete cur.x.sys.roads; }
};
for (const [name, f] of Object.entries(variants)) {
  const sv = JSON.parse(JSON.stringify(cur));
  if (name === "noRoads") delete sv.x.sys.roads; else { sv.x.sys.roads = sv.x.sys.roads || { v: 2, s: {} }; const st = sv.x.sys.roads.s || (sv.x.sys.roads.s = {}); f(st); }
  await reload(sv);
  await ev(`WX.at = () => 0; GS.storm = 0; true`);
  await waitGame(3);
  await ev(`GS.hour += 0.5; true`); await waitGame(2);
  const r = await J(roadsOk);
  console.log("A", name, JSON.stringify(r));
  ok(r.ready && !r.err && !r.terr && !r.nan, "A " + name + ": loads, roads ready, no NaN");
}

// ---- B: clock runs backwards then forward (sleep / debug), snow must not go NaN or vanish
await reload(cur);
await ev(`WX.at = () => 1; GS.storm = 1; true`);
for (let k = 0; k < 8; k++) { await ev(`GS.hour += 0.5; true`); await waitGame(0.35); }
const b0 = await J(`TLXR.routes.filter(r => r.st).map(r => Math.max(...r.st.s))`);
await ev(`GS.hour -= 30; true`); await waitGame(1.5);
for (let k = 0; k < 4; k++) { await ev(`GS.hour += 0.5; true`); await waitGame(0.35); }
const b1 = await J(`TLXR.routes.filter(r => r.st).map(r => Math.max(...r.st.s))`);
console.log("B max snow before / after hour -30:", JSON.stringify(b0.map(v => +v.toFixed(2))), JSON.stringify(b1.map(v => +v.toFixed(2))));
ok(!(await J(roadsOk)).nan, "B: no NaN after the clock ran backwards");

// ---- C: the pickup on one stretch at 0 / 0.5 / 1.0 snow
await ev(`WX.at = () => 0; GS.storm = 0; TLXR.setSnow(null, 0); GS.cash = 9000; true`);
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400); await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400); await ev(`closeGarage(); true`);
await ev(`(() => { const r = TLX.state("vehicles").owned[0]; const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); crashCancel(); FOOT.on = true; FOOT.x = r.x + fz * 3 - fx * 0.3; FOOT.z = r.z - fx * 3 - fz * 0.3; FOOT.yaw = r.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(800); await tap("KeyQ");
ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14), "C: seated in the pickup");
const S = await J(`(() => { const r = TLXR.routes.find(r => r.id === "fv888"); const way = [depot, ...SITES, ...STATIONS].filter(p => p && p.x !== undefined);
  const cand = []; for (let i = 3; i < r.pts.length - 40; i += 5) { const a = r.pts[i], b = r.pts[i + 12]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L > 6) cand.push(i); }
  const i = cand[Math.floor(cand.length / 3)]; return { i, len: r.pts.length }; })()`);
const lvl = async v => {
  await ev(`(() => { TLXR.setSnow(null, 0); const r = TLXR.routes.find(r => r.id === "fv888"); const a = r.pts[${S.i}], b = r.pts[${S.i} + 4];
    r.st.s.forEach((_, j) => { const g = r.seg[j]; if (Math.hypot(g.mx - a[0], g.mz - a[1]) < 700) r.st.s[j] = ${v}; }); TLXR.setSnow("fv888", ${v}, undefined); return 1; })()`);
  // setSnow(null,0) then whole route: restrict again to the local window so the weather-free plow can't interfere
  await ev(`(() => { const r = TLXR.routes.find(r => r.id === "fv888"); const a = r.pts[${S.i}]; r.st.s.forEach((_, j) => { const g = r.seg[j]; r.st.s[j] = Math.hypot(g.mx - a[0], g.mz - a[1]) < 700 ? ${v} : 0; }); r.st.p = -1; r.st.w = -99; TLXR.setSnow("fv888", ${v}, r.seg.findIndex(g => Math.hypot(g.mx - a[0], g.mz - a[1]) < 1)); return 1; })()`);
  await sleep(300);
  await ev(`(() => { const r = TLXR.routes.find(r => r.id === "fv888"); const a = r.pts[${S.i}], b = r.pts[${S.i} + 3]; BOG.on = false; BOG.acc = 0; BOG.immune = 0; crashCancel(); P.x = a[0]; P.z = a[1]; P.yaw = Math.atan2(b[0] - a[0], b[1] - a[1]); P.vx = P.vz = P.vy = 0; P.y = surf(a[0], a[1]) + 0.2; recenter(a[0], a[1], true); return 1; })()`);
  await waitGame(2.5);
  const bog0 = await ev(`BOG.on`); const d8 = []; for (let k = 0; k < 3; k++) { await waitGame(3); d8.push(+(await J(`depthAt(Math.round((P.x + HALF) / CELL), Math.round((P.z + HALF) / CELL))`)).toFixed(2)); }
  const x0 = await J(`({ x: P.x, z: P.z, d: depthAt(Math.round((P.x + HALF) / CELL), Math.round((P.z + HALF) / CELL)), sn: TLXR.snowAt(P.x, P.z) })`);
  let bog = false, maxv = 0; await down("KeyW");
  const t0 = await clock();
  while ((await clock()) - t0 < 14) { const s = await J(`({ b: BOG.on, v: Math.hypot(P.vx, P.vz) })`); bog = bog || s.b; maxv = Math.max(maxv, s.v); await sleep(200); }
  await up("KeyW");
  const x1 = await J(`({ x: P.x, z: P.z, nan: [P.x, P.y, P.z].some(v => !isFinite(v)), hint: (document.getElementById("toasts") || {}).innerText || "" })`);
  return { v, bog0, d8, depth: +x0.d.toFixed(2), sn: x0.sn, moved: +Math.hypot(x1.x - x0.x, x1.z - x0.z).toFixed(1), maxv: +maxv.toFixed(1), bog, nan: x1.nan };
};
const rows = []; for (const v of (process.env.ORDER || "0,0.5,1").split(",").map(Number)) { const r = await lvl(v); rows.push(r); console.log("C", JSON.stringify(r)); }
ok(rows.every(r => !r.nan), "C: no NaN driving the stretches");
console.log("C summary: moved in 14 game s at snow 0 / 0.5 / 1:", rows.map(r => r.moved).join(" / "));

const errs = await J(`TLXR.err || TLXR.tickErr || null`); ok(!errs, "no road error " + errs);
console.log(fails ? `${fails} FAILED` : "all asserts passed");
await done(fails ? 1 : 0);
