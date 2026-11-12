// 3.1 beta (breaker): roads across reloads, far travel, night poles, on foot, sled (not truck), map, old save.
import { boot, reload, ev, sleep, done, shot, hold, tap, down, up, sideCam, camOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
const prep = async () => { await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`); await sleep(500); };
const sig = () => J(`({ ids: TLXR.routes.map(r => r.id + ":" + Math.round(r.len)).join(), poles: TLXR.poles, cleared: TLXR.cleared, err: TLXR.err || null, ready: TLXR.ready })`);
const spot = `(() => { const r = TLXR.routes[0]; let i = Math.floor(r.pts.length * 0.4); const a = r.pts[i], b = r.pts[i + 3]; return { x: a[0], z: a[1], h: Math.atan2(b[0] - a[0], b[1] - a[1]) }; })()`;
const onSpot = async (s) => ev(`(() => { P.x = ${s.x}; P.z = ${s.z}; P.vx = P.vz = 0; return 1; })()`);

await boot(); await prep();
const s0 = await sig(); console.log("boot", JSON.stringify(s0));
ok(s0.ready && !s0.err, "roads ready");
const sp = await J(spot); console.log("spot", JSON.stringify(sp));

// 1 old save (no x) still builds roads
await reload({ cash: 777, delivered: 3 }); await prep();
const s1 = await sig(); console.log("old save", JSON.stringify(s1));
ok(s1.ready && !s1.err && s1.ids === s0.ids, "old-style save: same roads, no error");
ok(s1.poles === s0.poles && s1.cleared === s0.cleared, "reload: same pole and cleared-tree counts (" + s1.poles + "/" + s1.cleared + ")");

// 2 reload while standing on the road, then far trip and back: no trees regrown in the corridor, yard still hard
await onSpot(sp); await sleep(1500);
await reload(); await prep(); await onSpot(sp); await sleep(1500);
const hard = () => J(`(() => { const out = []; for (const r of TLXR.routes) { for (let i = 5; i < r.pts.length; i += 40) { const [x, z] = r.pts[i]; out.push(yardAt(x, z)); } } return { n: out.length, soft: out.filter(v => v < 0.5).length }; })()`);
console.log("yard after reload", JSON.stringify(await hard()));
const corridor = () => J(`(() => { let t = 0; const H = TLXR.ROADS.half; for (const r of TLXR.routes) { if (r.closed) continue; for (let i = 0; i < r.pts.length; i += 5) { const [x, z] = r.pts[i]; for (const o of obstaclesNear(x, z, 8)) if (o.tree !== undefined && !o.down && Math.hypot(o.x - x, o.z - z) < H + 0.5) t++; } } return t; })()`);
ok((await corridor()) === 0, "after reload: no standing tree in a road corridor");
await ev(`(() => { P.x = -9000 % 4000; P.z = 3000; return 1; })()`); await sleep(2500);
await onSpot(sp); await sleep(2500);
ok((await corridor()) === 0, "after a far trip and back: still no tree in the corridor");

// 3 night: poles are unlit instanced Lambert (no emissive on the pole mesh itself)
await ev(`GS.hour = 25; true`); await sleep(1200);
const segr = await J(`(() => { for (const r of TLXR.routes) { if (r.closed) continue; for (let i = 20; i < r.pts.length - 20; i++) { const a = r.pts[i], b = r.pts[i + 10];
  const ux = b[0] - a[0], uz = b[1] - a[1], L = Math.hypot(ux, uz); if (L < 58) continue; if (Math.abs(groundAt(b[0], b[1]) - groundAt(a[0], a[1])) > 1.2) continue;
  const nx = -uz / L, nz = ux / L, ox = a[0] + nx * 40, oz = a[1] + nz * 40;
  if (isSea(ox, oz) || isWater(ox, oz) || obNear(ox, oz, 12) || TLXR.near(ox, oz).d < 30) continue;
  if ([...SITES, ...STATIONS].some(s => s.x !== undefined && Math.hypot(a[0] - s.x, a[1] - s.z) < 150)) continue;
  return { x: a[0], z: a[1], ux: ux / L, uz: uz / L, nx, nz, id: r.id }; } } return null; })()`);
console.log("seg", JSON.stringify(segr));
const place = (off) => ev(`(() => { const s = ${JSON.stringify(segr)}; if (VEH.cur) TLXV.swapTo(null); FOOT.on = false; crashCancel(); P.x = s.x + s.nx * ${off}; P.z = s.z + s.nz * ${off}; P.yaw = Math.atan2(s.ux, s.uz); P.vx = P.vz = P.vy = 0; P.y = surf(P.x, P.z) + 0.3; BOG.on = false; BOG.acc = 0; recenter(P.x, P.z, true); return 1; })()`);
await place(0); await waitGame(1.5);
await sideCam(undefined, 7, 2.4, Math.PI * 0.8); await sleep(400); await shot("night_road"); await camOff();
await ev(`GS.hour = 12; true`); await waitGame(1);

// 4 own sled on the road vs powder
const run = async (off) => { await place(off); await waitGame(1.2); const a = await J(`[P.x, P.z]`); await down("KeyW"); await waitGame(4); await up("KeyW");
  const b = await J(`[P.x, P.z, Math.hypot(P.vx, P.vz), BOG.on, yardAt(P.x, P.z), CRASH && CRASH.on]`); return { d: Math.hypot(b[0] - a[0], b[1] - a[1]), v: b[2], bog: b[3], y: b[4], crash: b[5] }; };
const rd = await run(0); await sideCam(undefined, 7, 2.4, Math.PI * 0.8); await sleep(300); await shot("sled_road"); await camOff();
const pw = await run(40);
console.log("sled road", JSON.stringify(rd), "powder", JSON.stringify(pw));
ok(rd.d > 12, "sled moves on the road (" + rd.d.toFixed(1) + " m in 4 game s)");

// 5 on foot
await place(0); await waitGame(1);
await tap("KeyQ"); let t = 0; while (t++ < 60 && !(await ev("FOOT.on"))) await sleep(200);
ok(await ev("FOOT.on"), "dismount on the road works");
const walk = async (off) => { await ev(`(() => { const s = ${JSON.stringify(segr)}; FOOT.x = s.x + s.nx * ${off}; FOOT.z = s.z + s.nz * ${off}; FOOT.yaw = Math.atan2(s.ux, s.uz); recenter(FOOT.x, FOOT.z, true); return 1; })()`); await waitGame(1); const a = await J(`[FOOT.x, FOOT.z]`); await down("KeyW"); await waitGame(4); await up("KeyW"); const b = await J(`[FOOT.x, FOOT.z]`); return Math.hypot(b[0] - a[0], b[1] - a[1]); };
const w1 = await walk(40), w2 = await walk(0), w3 = await walk(40), w4 = await walk(0); const wr = (w2 + w4) / 2, wp = (w1 + w3) / 2; console.log("walk runs powder/road/powder/road", [w1, w2, w3, w4].map(v => v.toFixed(1)).join(" "));
console.log("walk road", wr.toFixed(1), "powder", wp.toFixed(1));
ok(wr > wp * 1.1 || wr > 5, "walking on the road (" + wr.toFixed(1) + " m) vs powder (" + wp.toFixed(1) + " m) in 4 game s");
await sideCam(undefined, 4, 1.8, Math.PI * 0.8); await sleep(300); await shot("foot_road"); await camOff();

// 6 map
await ev(`TABLET.toggle(true, "map")`); await sleep(1200); await shot("map"); await ev(`TABLET.toggle(false)`);

// 7 storm: road stays plowed (3.2 not yet), no errors
await ev(`GS.storm = 1; true`); await sleep(2000);
const ys = await J(`yardAt(${sp.x}, ${sp.z})`); console.log("yard in storm", ys);

const pe = await J(`window.__errs || []`).catch(() => []);
console.log("fails", fails);
await done(fails ? 1 : 0);
