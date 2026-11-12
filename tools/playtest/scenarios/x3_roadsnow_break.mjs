// Beta break of 3.2a road snow (v197): drizzle fill rate, plow waiting on a local storm, rider on the stretch when the
// plow passes, reload mid-plow. Numbers only (prints), asserts on page errors/NaN.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
async function hours(h, step = 0.25) { for (let t = 0; t < h; t += step) { await ev(`GS.hour += ${step}; true`); await waitGame(0.35); } }
const sum = `TLXR.routes.filter(r => !r.closed).map(r => ({ id: r.id, st: TLXR.status(r.id), mx: +Math.max(...r.st.s).toFixed(2), n: r.st.s.filter(v => v >= 0.35).length + "/" + r.st.s.length, p: Math.round(r.st.p) }))`;
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(800);

// ---- D: drizzle (weather 0.5) for 12 game hours
await ev(`WX.at = () => 0.5; true`);
await hours(12, 0.5);
let D = await J(sum); console.log("drizzle 0.5 x 12 h:", JSON.stringify(D.map(r => `${r.id} ${r.st} max ${r.mx} shut ${r.n} plow ${r.p}`)));
const shutDrizzle = D.filter(r => r.st === "snowed in").length;
console.log("roads snowed in by a 12 h drizzle:", shutDrizzle, "/ 5");
await ev(`WX.at = () => 0; true`); await hours(1.5, 0.25);
D = await J(sum); console.log("1.5 h after drizzle ends:", JSON.stringify(D.map(r => `${r.id} ${r.st} p ${r.p}`)));
await hours(3, 0.25);
D = await J(sum); console.log("4.5 h after:", JSON.stringify(D.map(r => `${r.id} ${r.st} p ${r.p}`)));

// ---- C: storm only around the start of fv888, rest of the road fine: does the plow ever go?
await ev(`TLXR.setSnow(null, 0); true`);
await ev(`(() => { const r = TLXR.routes.find(r => r.id === "fv888"); window.__sx = r.pts[0][0]; window.__sz = r.pts[0][1]; WX.at = (x, z) => Math.hypot(x - __sx, z - __sz) < 4000 ? 1 : 0; return true; })()`);
await hours(4, 0.25);
let C = await J(`(() => { const r = TLXR.routes.find(r => r.id === "fv888"); return { st: TLXR.status("fv888"), mx: Math.max(...r.st.s), p: r.st.p, far: r.seg.filter(g => Math.hypot(g.mx - __sx, g.mz - __sz) > 5000 && g.legs.length).length }; })()`);
console.log("storm 4 km round the start, 4 h:", JSON.stringify(C));
// give one road a distant snowed stretch while weather is clear at the start
await ev(`(() => { const r = TLXR.routes.find(r => r.id === "fv888"); const i = r.seg.length - 3; TLXR.setSnow("fv888", 0.7, i); window.__far = i; WX.at = () => 0; return i; })()`);
await hours(6, 0.5);
C = await J(`(() => { const r = TLXR.routes.find(r => r.id === "fv888"); return { st: TLXR.status("fv888"), far: r.st.s[__far], p: r.st.p, w: r.st.w }; })()`);
console.log("clear weather 6 h later:", JSON.stringify(C));
ok(C.far === 0 || C.far === undefined || C.p >= 0 || C.st === "open", "C: a snowed stretch eventually gets plowed in fair weather");

// ---- A: rider on the stretch when the plow passes
await ev(`TLXR.setSnow(null, 0); WX.at = () => 0; true`); await hours(0.5);
const S = await J(`(() => { const r = TLXR.routes.find(r => r.id === "fv888"), way = [depot, ...SITES, ...STATIONS].filter(p => p && p.x !== undefined);
  const c = r.seg.map((g, i) => ({ i, g })).filter(o => o.g.legs.length && o.g.a > 800 && !way.some(p => Math.hypot(o.g.mx - p.x, o.g.mz - p.z) < 160) && TLXR.near(o.g.mx, o.g.mz).d < 1 && !isSea(o.g.mx, o.g.mz));
  const o = c[Math.floor(c.length / 2)]; return { i: o.i, a: o.g.a, x: o.g.mx, z: o.g.mz }; })()`);
await ev(`(() => { crashCancel(); FOOT.on = false; P.x = ${S.x}; P.z = ${S.z}; P.y = surf(${S.x}, ${S.z}) + 0.3; P.vx = P.vz = P.vy = 0; recenter(${S.x}, ${S.z}, true); return true; })()`);
await waitGame(2);
await ev(`TLXR.setSnow("fv888", 0.6, ${S.i}); true`); await waitGame(8);
const A0 = await J(`({ y: P.y, s: surf(P.x, P.z), d: depthAt(Math.round((P.x + HALF) / CELL), Math.round((P.z + HALF) / CELL)) })`);
// the plow reaches the stretch: place it 60 m before and step the clock in small steps, sampling P.y each frame
await ev(`(() => { const r = TLXR.routes.find(r => r.id === "fv888"); r.st.p = ${S.a} - 60; r.st.w = 0; window.__ys = []; window.__samp = setInterval(() => __ys.push([+P.y.toFixed(3), +surf(P.x, P.z).toFixed(3)]), 50); return true; })()`);
for (let k = 0; k < 16; k++) { await ev(`GS.hour += 0.002; true`); await sleep(120); }
await waitGame(3);
const ys = await J(`(clearInterval(__samp), __ys)`);
let maxStep = 0; for (let i = 1; i < ys.length; i++) maxStep = Math.max(maxStep, Math.abs(ys[i][0] - ys[i - 1][0]));
const A1 = await J(`({ y: P.y, s: surf(P.x, P.z), p: TLXR.routes.find(r => r.id === "fv888").st.p, snow: TLXR.routes.find(r => r.id === "fv888").st.s[${S.i}], nan: [P.x, P.y, P.z, camera.position.y].some(v => !isFinite(v)) })`);
console.log("rider on stretch: before", JSON.stringify(A0), "after", JSON.stringify(A1), "max per-50ms P.y step", maxStep.toFixed(3), "samples", ys.length, "surf range", Math.min(...ys.map(a => a[1])).toFixed(2), Math.max(...ys.map(a => a[1])).toFixed(2));
ok(!A1.nan, "A: no NaN");
console.log("A: surface dropped", (A0.s - A1.s).toFixed(2), "m under the parked rider as the plow passed; stretch snow now", A1.snow);

// ---- B: reload mid-plow
await ev(`WX.at = () => 1; GS.storm = 1; true`); await hours(4, 0.5);
await ev(`WX.at = () => 0; GS.storm = 0; GS.stormPhase = "calm"; true`);
let B = null; for (let k = 0; k < 40; k++) { await ev(`GS.hour += 0.1; true`); await waitGame(0.3); B = await J(`TLXR.routes.map(r => ({ id: r.id, p: Math.round(r.st ? r.st.p : -9), sn: r.st ? r.st.s.filter(v => v >= 0.35).length : 0 }))`); if (B.some(r => r.p > 3000)) break; }
console.log("mid-plow:", JSON.stringify(B));
await ev(`save(); true`); await sleep(300);
await reload();
await ev(`WX.at = () => 0; GS.storm = 0; true`);
const B2 = await J(`TLXR.routes.map(r => ({ id: r.id, p: Math.round(r.st ? r.st.p : -9), sn: r.st ? r.st.s.filter(v => v >= 0.35).length : 0 }))`);
console.log("after reload:", JSON.stringify(B2));
ok(B.every((r, i) => r.sn === B2[i].sn && (r.p === B2[i].p || (r.p >= 0 && B2[i].p >= r.p && B2[i].p - r.p < 600))), "B: plow resumes where it was (clock keeps running during the reload, so p may advance a little) and the snowed stretches match");
await hours(1, 0.25);
console.log("1 h on:", JSON.stringify(await J(`TLXR.routes.map(r => ({ id: r.id, p: Math.round(r.st ? r.st.p : -9) }))`)));

const errs = await J(`TLXR.err || TLXR.tickErr || null`); ok(!errs, "no road error " + errs);
console.log(fails ? `${fails} FAILED` : "all asserts passed");
await done(fails ? 1 : 0);
