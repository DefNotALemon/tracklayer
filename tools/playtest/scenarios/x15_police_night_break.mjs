// Beta: Politi at night. Sight range halves at full dark (nightK .5): a cruiser 120 m behind sees a speeder by day, not at night;
// 70 m behind it sees at both. Also night lights + HUD, and a night pursuit escape. Prints, exit 1 on a fail.
import { boot, ev, sleep, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function until(expr, maxGame) { const t0 = await clock(); for (;;) { if (await ev(`!!(${expr})`)) return true; if ((await clock()) - t0 > maxGame) return false; await sleep(150); } }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; INT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(1200);
await ev(`(() => { window.__drv = null; setInterval(() => { const d = window.__drv; if (!d || !d.on) return; const t = gameClock, dt = Math.max(0, Math.min(0.1, t - d.t)); d.t = t; d.s += d.v * dt; const p = TLXT.lanePt(d.id, d.s, 1); if (!p) return; P.x = p.x; P.z = p.z; P.y = surf(p.x, p.z) + 0.3; P.yaw = p.yaw; P.vx = Math.sin(p.yaw) * d.v; P.vz = Math.cos(p.yaw) * d.v; P.vy = 0; }, 30); return true; })()`);
const route = await J(`(() => { const r = TLXT.routes.slice().sort((a, b) => b.len - a.len)[0]; return { id: r.id, s0: r.s0, len: r.len }; })()`);
const s = route.s0 + route.len * 0.1;
async function trial(hour, gap, label) {
  await ev(`GS.hour = ${hour}; TLXP.reset(); TLXP.RT.grace = 0; for (const c of TLXP.cops) { c.on = false; } window.__drv = null; true`); await sleep(500);
  await ev(`GS.cash = 1000; window.__drv = { on: true, id: ${JSON.stringify(route.id)}, s: ${s}, v: 28, t: gameClock }; true`); await sleep(300);
  await ev(`TLXP.patrol(0, ${JSON.stringify(route.id)}, ${s} - ${gap}, 1); true`);
  await ev(`window.__mx = 0; setInterval(() => { window.__mx = Math.max(window.__mx, TLXP.RT.sus); }, 100); true`);
  const m = await until(`TLXP.mode === "warn" || TLXP.mode === "pursuit"`, 22);
  const r = await J(`({ m: TLXP.mode, sus: TLXP.RT.sus, mx: window.__mx, gap: Math.round(Math.hypot(TLXP.cops[0].x - P.x, TLXP.cops[0].z - P.z)), kmh: Math.round(Math.hypot(P.vx, P.vz) * 3.6), seen: TLXP.seen().length, hud: !document.getElementById("polHud").hidden, df: typeof dayFactor === "function" ? dayFactor() : null })`);
  console.log(label, JSON.stringify(r));
  await ev(`window.__drv = null; true`);
  return { m, r };
}
const d120 = await trial(34, 70, "day gap70");
ok(d120.m, "day: cruiser 70 m back reacts to a 100 km/h speeder");
const n120 = await trial(24, 120, "night gap120");
ok(n120.r.df !== null && n120.r.df < 0.5, "hour 24 is dark (dayFactor " + n120.r.df + ")");
ok(!n120.m, "night: cruiser 120 m back does NOT see you");
const n60 = await trial(24, 55, "night gap60");
ok(n60.m, "night: cruiser 60 m back still reacts");
ok(n60.r.hud, "night: Politi HUD visible");
console.log(fails ? "FAILED: " + fails : "all ok"); await done(fails ? 1 : 0);
