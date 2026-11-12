// probe: road grades (along line, 30 m) per route and what the pickup does from rest on the steepest stretch
import { boot, ev, tap, sleep, done, down, up } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(100); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; GS.cash = 9000; true`); await sleep(600);
const st = await J(`TLXR.routes.map(r => { const g = TLXR.grades(r.pts).slice().sort((a, b) => a - b); const n = g.length; return { id: r.id, closed: r.closed, n, p50: +g[Math.floor(n * .5)].toFixed(3), p95: +g[Math.floor(n * .95)].toFixed(3), max: +g[n - 1].toFixed(3), over10: g.filter(v => v > 0.10).length, over15: g.filter(v => v > 0.15).length, over25: g.filter(v => v > 0.25).length }; })`);
for (const s of st) console.log(JSON.stringify(s));
// longitudinal + cross grade at the stuck spot (lebesby idx 108) and the 0.495 spot (fv888 idx 141)
const lg = (ri, idx) => J(`(() => { const r = TLXR.routes[${ri}]; const a = r.pts[${idx}], b = r.pts[${idx} + 6]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); return { long: +((groundAt(b[0], b[1]) - groundAt(a[0], a[1])) / L).toFixed(3), cross: +((groundAt(a[0] - (b[1] - a[1]) / L * 6, a[1] + (b[0] - a[0]) / L * 6) - groundAt(a[0] + (b[1] - a[1]) / L * 6, a[1] - (b[0] - a[0]) / L * 6)) / 12).toFixed(3) }; })()`);
console.log("lebesby108", JSON.stringify(await lg(4, 108)), "fv888 141", JSON.stringify(await lg(0, 141)));
// worst long grade on each open route by sampling every 3 pts
const worst = await J(`TLXR.routes.filter(r => !r.closed).map(r => { let w = 0, wi = 0; for (let i = 0; i + 8 < r.pts.length; i++) { const a = r.pts[i], b = r.pts[i + 8]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 12) continue; const g = Math.abs(groundAt(b[0], b[1]) - groundAt(a[0], a[1])) / L; if (g > w) { w = g; wi = i; } } return { id: r.id, w: +w.toFixed(3), wi, n: r.pts.length }; })`);
console.log("worst", JSON.stringify(worst));
await done(0);
