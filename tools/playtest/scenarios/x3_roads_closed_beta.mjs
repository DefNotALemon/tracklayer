// 3.1 beta: the shut Ifjordfjellet road vs an open road: sled drive, pickup drive, on foot, then reload and re-check.
import { boot, reload, ev, sleep, done, shot, down, up, tap } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
const prep = async () => { await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`); await sleep(500); };
// a straight gentle stretch of route `id`
const spotOf = id => J(`(() => { const r = TLXR.routes.find(r => r.id === "${id}"); for (let i = 30; i < r.pts.length - 30; i++) { const a = r.pts[i], b = r.pts[i + 8];
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 40) continue; if (Math.abs(groundAt(b[0], b[1]) - groundAt(a[0], a[1])) > 1.6) continue;
  return { x: a[0], z: a[1], ux: (b[0] - a[0]) / L, uz: (b[1] - a[1]) / L }; } return null; })()`);
const place = s => ev(`(() => { const s = ${JSON.stringify(s)}; if (VEH.cur) TLXV.swapTo(null); FOOT.on = false; crashCancel(); P.x = s.x; P.z = s.z; P.yaw = Math.atan2(s.ux, s.uz); P.vx = P.vz = P.vy = 0; P.y = surf(P.x, P.z) + 0.3; BOG.on = false; BOG.acc = 0; recenter(P.x, P.z, true); return 1; })()`);
const drive = async s => { await place(s); await waitGame(1.2); const y = await ev("yardAt(P.x, P.z)"); const a = await J("[P.x, P.z]"); await down("KeyW"); await waitGame(5); await up("KeyW");
  const b = await J("[P.x, P.z, Math.hypot(P.vx, P.vz), BOG.on, CRASH && CRASH.on]"); return { y, d: Math.hypot(b[0] - a[0], b[1] - a[1]), v: b[2], bog: b[3], crash: b[4] }; };

await boot(); await prep();
const open = await spotOf("fv888"), shut = await spotOf("ifjordfjellet");
console.log("spots", JSON.stringify(open), JSON.stringify(shut));
ok(open && shut, "found stretches on both roads");
const o1 = await drive(open), c1 = await drive(shut);
console.log("sled open", JSON.stringify(o1), "shut", JSON.stringify(c1));
ok(o1.y > 0.8 && c1.y < 0.5, `open road plowed (${o1.y}), shut road not (${c1.y})`);
ok(o1.d > c1.d, `sled goes further on the open road (${o1.d.toFixed(1)} vs ${c1.d.toFixed(1)} m)`);
ok(!c1.crash, "no crash on the shut road");
// pad drive on the shut road
await place(shut); await waitGame(1);
const rt = await J(`TLXR.routes.find(r => r.id === "ifjordfjellet").closed`);
ok(rt === true, "route still flagged closed");
await shot("shut_road");
// on foot on the shut road
await place(shut); await waitGame(1); await tap("KeyQ"); let t = 0; while (t++ < 60 && !(await ev("FOOT.on"))) await sleep(200);
ok(await ev("FOOT.on"), "dismount on the shut road");
const a = await J("[FOOT.x, FOOT.z]"); await down("KeyW"); await waitGame(5); await up("KeyW"); const b = await J("[FOOT.x, FOOT.z]");
const wd = Math.hypot(b[0] - a[0], b[1] - a[1]); console.log("foot shut", wd.toFixed(1));
ok(wd > 3, "walks on the shut road (" + wd.toFixed(1) + " m)");
// reload: still closed, still unplowed, no error
await reload(); await prep();
const st = await J(`({ err: TLXR.err || null, closed: TLXR.routes.find(r => r.id === "ifjordfjellet").closed, y: yardAt(${shut.x}, ${shut.z}) })`);
console.log("after reload", JSON.stringify(st));
ok(!st.err && st.closed && st.y < 0.5, "after reload the road is still shut and unplowed");
// night: advance 1.5h steps (crossing days must not open it)
for (let i = 0; i < 6; i++) { await ev("GS.hour += 1.5; true"); await sleep(400); }
const st2 = await J(`({ closed: TLXR.routes.find(r => r.id === "ifjordfjellet").closed, y: yardAt(${shut.x}, ${shut.z}) })`);
console.log("9 h later", JSON.stringify(st2));
ok(st2.closed, "still shut 9 game hours later");
await done(fails);
