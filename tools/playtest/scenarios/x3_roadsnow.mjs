// Slice 3.2a (G4): road snow. Storms fill the open roads stretch by stretch, the council plow clears them once the
// weather eases, the state is saved, the Map paints a snowed-in stretch ice blue. Asserts, exit 1 on a failure.
//  A. every open road is cut into stretches with plowed legs; all open at boot; the fell road is "closed".
//  B. a storm (pinned, game hours stepped) fills a stretch of the Kjøllefjord-Mehamn road: snow >= 0.35, "snowed in",
//     the plow map there drops (yardAt), the snow it settles to rises 10 cm+ and the real depth starts climbing; a toast
//     says the road is drifting shut; the chart pixel turns ice blue; house yards in town and the powder beside the
//     road don't change; the plow does not go out while it's still storming.
//  C. the storm eases: the plow sets out, the stretch is cut back to its plowed depth at once, the road reads "open",
//     the chart is orange again and a toast says the roads are open.
//  D. saved: a snowed-in Dyfjord road survives a reload; an old save with no road state loads with every road open.
//  E. a jump of more than 2 game hours (a night's sleep) finds every road plowed.
import { boot, ev, sleep, done, shot, sideCam, camOff, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
const watchToasts = () => ev(`(() => { window.__TS = window.__TS || []; const o = new MutationObserver(() => { for (const c of $("toasts").children) if (!window.__TS.includes(c.textContent)) window.__TS.push(c.textContent); }); o.observe($("toasts"), { childList: true, subtree: true, characterData: true }); return true; })()`);
const toasts = () => J(`(window.__TS || []).concat((TOASTQ || []).map(t => t.msg))`);
const NOSTILLS = !!process.env.NOSTILLS;

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(800);
await watchToasts();

// ---- A
const A = await J(`TLXR.routes.map(r => ({ id: r.id, closed: r.closed, n: r.seg.length, legs: r.seg.filter(g => g.legs.length).length, st: TLXR.status(r.id), len: Math.round(r.len), err: TLXR.err || null, terr: TLXR.tickErr || null }))`);
console.log("routes", A.map(r => `${r.id} ${r.len} m ${r.legs}/${r.n} stretches ${r.st}`).join(", "));
ok(A.every(r => !r.err && !r.terr), "A: roads built and ticking with no error");
ok(A.filter(r => !r.closed).every(r => r.legs >= Math.floor(r.len / 400) * 0.6 && r.st === "open"), "A: every open road has plowed stretches and reads open");
ok(A.filter(r => r.closed).every(r => r.st === "closed"), "A: the fell road reads closed");

// the test stretch: a middle stretch of fv888 well clear of villages and stations
const S = await J(`(() => { const r = TLXR.routes.find(r => r.id === "fv888"), way = [depot, ...SITES, ...STATIONS].filter(p => p && p.x !== undefined);
  const c = r.seg.map((g, i) => ({ i, g })).filter(o => o.g.legs.length && !way.some(p => Math.hypot(o.g.mx - p.x, o.g.mz - p.z) < 160) && TLXR.near(o.g.mx, o.g.mz).d < 1 && !isSea(o.g.mx, o.g.mz));
  const o = c[Math.floor(c.length / 2)], run = o.g.runs[0], pt = run[Math.floor(run.length / 2)];
  const D = KIT.doors[0];
  return { i: o.i, a: o.g.a, x: o.g.mx, z: o.g.mz, px: pt[0], pz: pt[1], dx: D.x + D.nx * (D.d / 2 + 2), dz: D.z + D.nz * (D.d / 2 + 2) }; })()`);
console.log("test stretch", JSON.stringify(S));
await ev(`(() => { const x = ${S.x}, z = ${S.z}; crashCancel(); FOOT.on = false; P.x = x; P.z = z; P.y = surf(x, z) + 0.3; P.vx = P.vz = P.vy = 0; recenter(x, z, true); return true; })()`);
await waitGame(2);
const probe = `(() => { const x = ${S.x}, z = ${S.z}, n = TLXR.near(x, z), r = TLXR.routes.find(r => r.id === "fv888");
  let d = 0, tg = 0, k = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const qx = x + a * 0.6, qz = z + b * 0.6, ix = Math.round((qx + HALF) / CELL), iz = Math.round((qz + HALF) / CELL);
    d += depthAt(ix, iz); tg += freshAt(ix, iz) * (1 - 0.85 * yardAt(qx, qz)); k++; }
  // the powder 22 m off the road, square to it
  const ox = x + 22, oz = z, oi = Math.round((ox + HALF) / CELL), oj = Math.round((oz + HALF) / CELL);
  const px = mapBg.getContext("2d").getImageData(Math.floor((${S.px} + HALF) * M2SRC), Math.floor((${S.pz} + HALF) * M2SRC), 1, 1).data;
  return { d: d / k, tg: tg / k, y: yardAt(x, z), off: TLXR.near(ox, oz).d > 8 ? depthAt(oi, oj) : null, door: yardAt(${S.dx}, ${S.dz}), st: TLXR.status("fv888"), snow: r.st.s[${S.i}], p: r.st.p, px: [...px], h: GS.hour }; })()`;
const B0 = await J(probe);
console.log("plowed:", JSON.stringify(B0));
ok(B0.y >= 0.75 && B0.snow === 0, "B: the stretch starts plowed (yardAt " + B0.y.toFixed(2) + ")");
ok(B0.px[0] > B0.px[2] + 40, "B: chart pixel orange at the start " + B0.px);
if (!NOSTILLS) { await sideCam(undefined, 7, 3.2, 0.6); await shot("x3rs_plowed"); }

// ---- B: the storm
await ev(`WX.at = () => 1; GS.storm = 1; GS.stormPhase = "storm"; true`);
for (let k = 0; k < 10; k++) { await ev(`GS.hour += 0.3; true`); await waitGame(0.5); }
await waitGame(12);
const B1 = await J(probe);
console.log("after 3 h of storm:", JSON.stringify(B1));
ok(B1.snow >= 0.35 && B1.st === "snowed in", "B: 3 storm hours fill the stretch (snow " + B1.snow.toFixed(2) + ", " + B1.st + ")");
ok(B1.y < B0.y - 0.25, "B: the plow map drops on the road (yardAt " + B0.y.toFixed(2) + " -> " + B1.y.toFixed(2) + ")");
ok(B1.tg > B0.tg + 0.1, "B: the snow it settles to rises 10 cm+ (" + B0.tg.toFixed(2) + " -> " + B1.tg.toFixed(2) + " m)");
ok(B1.d > B0.d + 0.03, "B: the real depth on the road is climbing (" + B0.d.toFixed(2) + " -> " + B1.d.toFixed(2) + " m)");
ok(B1.p < 0, "B: no plow out while it's still storming (p " + B1.p + ")");
ok(Math.abs(B1.door - B0.door) < 0.01 && B0.door > 0.5, "B: the yard at a town door stays plowed (" + B0.door.toFixed(2) + " -> " + B1.door.toFixed(2) + ")");
ok(B0.off === null || Math.abs(B1.off - B0.off) < 0.02, "B: the powder 22 m off the road is untouched (" + B0.off + " -> " + B1.off + ")");
ok(B1.px[2] > B1.px[0] + 40 && B1.px[2] > 150, "B: chart pixel ice blue " + B1.px);
let T = await toasts();
ok(T.some(t => /drifting shut/.test(t)), "B: a toast says the road is drifting shut (" + (T.find(t => /drifting/.test(t)) || T.slice(-3).join(" | ")) + ")");
if (!NOSTILLS) { await ev(`WX.at = () => 0; GS.storm = 0; true`); await sleep(400); await shot("x3rs_snowed"); await ev(`TABLET.toggle(true, "map"); true`); await sleep(900); await shot("x3rs_map_snowed"); await ev(`TABLET.toggle(false); true`); await sleep(300); await ev(`WX.at = () => 1; GS.storm = 1; true`); }

// ---- C: the storm eases, the plow goes out
await ev(`WX.at = () => 0; GS.storm = 0; GS.stormPhase = "calm"; true`);
let started = false, C = null;
for (let k = 0; k < 40; k++) {
  await ev(`GS.hour += 0.15; true`); await waitGame(0.4);
  C = await J(probe); if (C.p >= 0) started = true;
  if (C.st === "open" && C.snow === 0 && (await J(`TLXR.routes.every(r => !r.st || r.st.p < 0) && TLXR.routes.every(r => TLXR.status(r.id) !== "snowed in")`))) break;
}
await waitGame(1);
C = await J(probe);
console.log("after the plow:", JSON.stringify(C));
ok(started, "C: the council plow set out once the storm eased");
ok(C.st === "open" && C.snow === 0, "C: the stretch is plowed and the road reads open");
ok(C.d <= B0.d + 0.02 && C.y >= B0.y - 0.01, "C: cut back to its plowed depth at once (" + B1.d.toFixed(2) + " -> " + C.d.toFixed(2) + " m, start " + B0.d.toFixed(2) + ")");
ok(C.px[0] > C.px[2] + 40, "C: chart pixel orange again " + C.px);
T = await toasts();
ok(T.some(t => /roads are open again/.test(t)), "C: a toast says the roads are open again");
if (!NOSTILLS) { await shot("x3rs_replowed"); await camOff(); }

// ---- D: saved
await ev(`TLXR.setSnow("dyfjord", 0.6); save(); true`);
const sv = await J(`JSON.parse(localStorage.getItem("tracklayer.save.v2")).x.sys.roads`);
ok(sv.v >= 2 && sv.s.r.dyfjord.s.every(v => v === 0.6), "D: the save carries the Dyfjord road's snow (v" + sv.v + ")");
await reload();
await ev(`WX.at = () => 0; GS.storm = 0; true`);
const D1 = await J(`({ dy: TLXR.status("dyfjord"), fv: TLXR.status("fv888"), s: TLXR.routes.find(r => r.id === "dyfjord").st.s.slice(0, 3), err: TLXR.err || TLXR.tickErr || null })`);
console.log("after reload:", JSON.stringify(D1));
ok(D1.dy === "snowed in" && D1.fv === "open" && !D1.err, "D: after a reload the Dyfjord road is still snowed in, fv888 open");
const old = await J(`(() => { const s = JSON.parse(localStorage.getItem("tracklayer.save.v2")); delete s.x.sys.roads; return s; })()`);
await reload(old);
const D2 = await J(`({ st: TLXR.routes.map(r => TLXR.status(r.id)), err: TLXR.err || TLXR.tickErr || null })`);
ok(!D2.err && D2.st.filter(s => s === "snowed in").length === 0, "D: a save with no road state loads with every road open (" + D2.st.join(",") + ")");

// ---- E: a long jump of the clock
const ms = await J(`(() => { const t0 = performance.now(); TLXR.setSnow(null, 0.5); const t1 = performance.now(); TLXR.setSnow(null, 0); return [t1 - t0, performance.now() - t1]; })()`);
console.log("re-reading every road's plow map: snowing in", ms[0].toFixed(1), "ms, plowed", ms[1].toFixed(1), "ms");
ok(ms[0] < 120 && ms[1] < 120, "E: re-reading every road at once costs under 120 ms headless (it happens every ~20 s of a storm at most)");
await ev(`WX.at = () => 0; GS.storm = 0; TLXR.setSnow(null, 0.8); true`);
const E0 = await J(`TLXR.routes.map(r => TLXR.status(r.id))`);
await ev(`GS.hour += 3; true`); await waitGame(1);
const E1 = await J(`TLXR.routes.map(r => TLXR.status(r.id))`);
ok(E0.filter(s => s === "snowed in").length >= 5 && E1.filter(s => s === "snowed in").length === 0, "E: snowed in (" + E0.join(",") + ") -> 3 h later every road plowed (" + E1.join(",") + ")");

console.log(fails ? `${fails} FAILED` : "all asserts passed");
await done(fails ? 1 : 0);
