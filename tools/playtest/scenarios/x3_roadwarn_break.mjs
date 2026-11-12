// 3.2b1 beta (break it): odd targets, per-frame cost, save reload with shut roads, sled cross-country, night, phone layout.
import { boot, ev, sleep, done, shot, send, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; GS.cash = 9000; true`); await sleep(800);
await ev(`TLXR.setSnow(null, 0.6); true`);
// A: odd targets never throw
const A = await J(`(() => { const out = []; const t = [null, undefined, {}, {x: NaN, z: NaN}, {x: 1e9, z: 1e9}, {x: depot.x, z: depot.z}, depot, {x: -5000, z: -5000}]; for (const g of t) { try { out.push(String(TLXR.tripWarn(P.x, P.z, g))); } catch (e) { out.push("THROW " + e.message); } } try { out.push(String(TLXR.tripWarn(NaN, NaN, depot))); } catch (e) { out.push("THROW " + e.message); } try { out.push(String(TLXR.drift(NaN, NaN))); } catch (e) { out.push("THROW " + e.message); } return out; })()`);
console.log("A odd targets:", JSON.stringify(A));
ok(!A.some(s => /THROW/.test(s)), "A: no throws for null/NaN/far/odd targets");
// B: cost per call uncached (moving rider -> cache keys change every 30 m) and jobsList cost with 8 claims
const B = await J(`(() => { const s = SITES.filter(q => q.x !== undefined).slice(0, 12); const t0 = performance.now(); let n = 0; for (let i = 0; i < 400; i++) { const q = s[i % s.length]; TLXR.tripWarn(depot.x + i * 31, depot.z + i * 17, q); n++; } const per = (performance.now() - t0) / n; const t1 = performance.now(); for (let i = 0; i < 30; i++) jobsList(); return { perCall: per, jobsList: (performance.now() - t1) / 30 }; })()`);
console.log("B cost ms:", JSON.stringify(B));
ok(B.perCall < 1.5, `B: uncached trip check ${B.perCall.toFixed(3)} ms/call (< 1.5 ms)`);
// C: sled cross-country: rider 40 m off the road in open country, target Mehamn with the road shut -> does it warn?
const C = await J(`(() => { TLXR.setSnow("fv888", 0.6); const rt = TLXR.routes.find(r => r.id === "fv888"); const i = Math.floor(rt.pts.length / 2); const m = SITES.find(s => s.id === "mehamn"); const r = {}; for (const off of [20, 55, 90, 200]) r[off] = TLXR.tripWarn(rt.pts[i][0] + off, rt.pts[i][1], m); return r; })()`);
console.log("C offroad rider -> Mehamn (offset m):", JSON.stringify(C));
// D: save/reload with the roads shut
await ev(`TLXR.setSnow("fv888", 0.6); save && save(); true`).catch(() => {});
const sv = await ev(`(() => { try { return JSON.stringify(JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => /tracklayer|tl_/i.test(k)) || "")) ) } catch (e) { return ""; } })()`);
await reload(); await sleep(1500);
await ev(`tutSkip(); FOOT.on = false; true`);
const D = await J(`({ shut: TLXR.routes.filter(r => r.seg.some(g => g.shut)).map(r => r.id), w: TLXR.tripWarn(depot.x, depot.z, SITES.find(s => s.id === "mehamn")) })`);
console.log("D after reload (state as saved by game):", JSON.stringify(D));
// E: night, phone-size tablet legend
await ev(`TLXR.setSnow("fv888", 0.6); GS.hour = 34 + 6; WX.at = () => 0; true`);
await send("Emulation.setDeviceMetricsOverride", { width: 740, height: 360, deviceScaleFactor: 2, mobile: true });
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
await ev(`SET.touch = "on"; setTouchUI(); TABLET.toggle(true, "map"); true`); await waitGame(1.8);
const E = await J(`(() => { const l = document.getElementById("tabRoadLeg"), w = document.getElementById("tabWid"), t = document.querySelector("#tabS .tmtop"), s = document.getElementById("tabS"); const r = e => { if (!e) return null; const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom].map(Math.round); }; return { leg: r(l), wid: r(w), top: r(t), tab: r(s), legText: l && l.textContent }; })()`);
console.log("E phone map:", JSON.stringify(E));
const ov = (a, b) => a && b && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
ok(E.leg && !ov(E.leg, E.wid), "E: legend does not overlap the map widget on a phone");
ok(E.leg && !ov(E.leg, E.top), "E: legend does not overlap the layer chips on a phone");
await shot("e_phone_map");
await ev(`TABLET.toggle(false); true`);
// F: compass overflow with long warning, phone
await ev(`(() => { const m = SITES.find(s => s.id === "mehamn"); P.x = m.x + 6; P.z = m.z + 6; P.vx = P.vz = 0; P.y = surf(P.x, P.z) + 0.1; recenter(P.x, P.z, true); })(); true`); await waitGame(1);
const F = await J(`(() => { const j = document.getElementById("job"), b = j.getBoundingClientRect(), s = document.getElementById("jobSub"); return { text: s.textContent, jobBox: [b.left, b.right, b.top, b.bottom].map(Math.round), subW: s.scrollWidth, subClient: s.clientWidth, vw: innerWidth }; })()`);
console.log("F compass phone:", JSON.stringify(F));
ok(F.jobBox[0] >= 0 && F.jobBox[1] <= F.vw, "F: compass panel stays on screen with the warning");
ok(F.subW <= F.subClient + 2, `F: warning text isn't clipped (scrollWidth ${F.subW} vs ${F.subClient})`);
await shot("f_phone_compass");
// G: legend when tablet re-renders many times (leak/dup): count elements
await ev(`TABLET.toggle(true, "map"); true`); await waitGame(0.5);
for (let i = 0; i < 4; i++) { await ev(`TABLET.render(); true`); }
const G = await J(`document.querySelectorAll("#tabRoadLeg").length`);
ok(G === 1, "G: exactly one legend after repeated renders (" + G + ")");
await send("Emulation.clearDeviceMetricsOverride");
await ev(`TABLET.toggle(false); true`);
console.log(fails ? `${fails} FAILED` : "all asserts passed");
await done(fails ? 1 : 0);
