// probe for beta fix 0127: telemetry of the pickup driven (bend-aware driver) through given route spots. ROUTE/FROM env
// or the defaults (fv888 15%/45%, lebesby 15%). Logs every 0.5 game s: idx, v, off, yard, sink, drag, gp, BOG.acc, pitch.
import { boot, ev, tap, sleep, done, down, up } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; GS.cash = 9000; true`); await sleep(600);
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400); await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400); await ev(`closeGarage(); true`);
await ev(`(() => { const r = TLX.state("vehicles").owned[0]; const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); crashCancel(); FOOT.on = true; FOOT.x = r.x + fz * 3 - fx * 0.3; FOOT.z = r.z - fx * 3 - fz * 0.3; FOOT.yaw = r.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(800); await tap("KeyQ"); console.log("seated", await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14));
const runs = (process.env.RUNS || "fv888:0.15,fv888:0.45,lebesby:0.15").split(",").map(s => s.split(":"));
for (const [id, f] of runs) {
  const ri = await J(`TLXR.routes.findIndex(r => r.id === "${id}")`), n = await J(`TLXR.routes[${ri}].pts.length`), idx = Math.floor(n * +f);
  await ev(`(() => { const r = TLXR.routes[${ri}]; const a = r.pts[${idx}], b = r.pts[${idx} + 3]; BOG.on = false; BOG.acc = 0; BOG.immune = 0; crashCancel(); P.x = a[0]; P.z = a[1]; P.yaw = Math.atan2(b[0] - a[0], b[1] - a[1]); P.vx = P.vz = P.vy = 0; P.y = surf(a[0], a[1]) + 0.2; recenter(a[0], a[1], true); return 1; })()`);
  await waitGame(1.2);
  const t0 = await clock(); let gas = false, sk = null, lastLog = -1;
  while ((await clock()) - t0 < 22) {
    const s = await J(`(() => { const p = TLXR.routes[${ri}].pts; let bi = 0, bd = 1e9; for (let i = 0; i < p.length; i++) { const d = Math.hypot(p[i][0] - P.x, p[i][1] - P.z); if (d < bd) { bd = d; bi = i; } }
      let j = bi, acc = 0; while (j < p.length - 1 && acc < 14) { acc += Math.hypot(p[j + 1][0] - p[j][0], p[j + 1][1] - p[j][1]); j++; }
      let rmin = 1e9; for (let i = Math.max(2, bi + 1); i < Math.min(p.length - 2, bi + 6); i++) rmin = Math.min(rmin, TLXR.turnR ? TLXR.turnR(p, i) : 50);
      const t = p[j]; let e = Math.atan2(t[0] - P.x, t[1] - P.z) - P.yaw; while (e > Math.PI) e -= 2 * Math.PI; while (e < -Math.PI) e += 2 * Math.PI;
      const R = TLXV.rt() || {}; const a = p[Math.max(0, bi - 3)], b = p[Math.min(p.length - 1, bi + 3)];
      const gr = (groundAt(b[0], b[1]) - groundAt(a[0], a[1])) / Math.max(1, Math.hypot(b[0] - a[0], b[1] - a[1]));
      return { bi, bd: +bd.toFixed(1), e: +e.toFixed(2), rmin: +rmin.toFixed(0), v: +Math.hypot(P.vx, P.vz).toFixed(1), bog: BOG.on, acc: +BOG.acc.toFixed(2), yard: +yardAt(P.x, P.z).toFixed(2),
        sink: (R.sink || []).map(q => +q.toFixed(2)), drag: Math.round(R.drag || 0), gp: +(R.gp || 0).toFixed(2), gr: +gr.toFixed(3), depth: +(surf(P.x, P.z) - groundAt(P.x, P.z)).toFixed(2), pos: [Math.round(P.x), Math.round(P.z)] }; })()`);
    const vt = Math.min(14, Math.max(4, s.rmin * 0.45)), wantGas = s.v < vt;
    if (wantGas !== gas) { if (wantGas) await down("KeyW"); else await up("KeyW"); gas = wantGas; }
    const want = s.e > 0.08 ? "KeyA" : s.e < -0.08 ? "KeyD" : null;
    if (want !== sk) { if (sk) await up(sk); if (want) await down(want); sk = want; }
    const tt = (await clock()) - t0; if (tt - lastLog > 0.5) { lastLog = tt; console.log(id, f, tt.toFixed(1), JSON.stringify(s)); }
    if (s.bog) break;
    await sleep(100);
  }
  if (sk) await up(sk); await up("KeyW");
}
await done(0);
