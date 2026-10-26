// G3 follow-up to v139 fuel cabins (report 0054/0071 leftover): walk from a standstill 12 m out toward the
// jerry-can pallet at the first two fuel cabins, measure snagging on the pallet obstacle (addOb r:1.0) and
// whether the shovelled yard patch (addYard r:1.6) reads as packed snow underfoot, then shoot the cans at
// night (no headlamp exists on foot; judged under ambient + the price-board glow).
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_fuelcabin_walkup.mjs [outdir]
import { boot, ev, shot, sideCam, camOff, done, sleep, down, up } from "../lib.mjs";
await boot();
await ev("GS.storm = 0; GS.hour = 12; true");

const cellJ = `(x, z) => { const ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL), d = depthAt(ix, iz), f = freshAt(ix, iz); return { d: +d.toFixed(2), pack: +(f > 0.02 ? Math.max(0, Math.min(1, 1 - d / f)) : 1).toFixed(2) }; }`;

function setFoot(x, z, yawExpr) {
  return ev(`(() => {
    FOOT.on = true; FOOT.ski = false; FOOT.dig = false; FOOT.x = ${x}; FOOT.z = ${z};
    FOOT.yaw = ${yawExpr}; P.x = FOOT.x - Math.sin(FOOT.yaw) * 5; P.z = FOOT.z - Math.cos(FOOT.yaw) * 5; P.y = surf(P.x, P.z) + 0.3; recenter(P.x, P.z, true);
    FOOT.y = surf(FOOT.x, FOOT.z) + 0.1; FOOT.sp = 0; FOOT.fwd = 0; FOOT.turn = 0;
    FOOT.tired = 0; FOOT.strain = 0.6; FOOT.step = 0; FOOT.half = 0; if (FOOT.g) FOOT.g.visible = true;
    camState.init = false; true;
  })()`);
}
// walk straight at a target (tx,tz) for up to `cap` game-s or until well past it, sampling every ~0.25 s;
// flags a snag as 3+ consecutive samples under 0.08 m (a real stall, not just a slow powder step), and
// reports the closest approach to the pallet (does the walker actually reach it, or get pushed wide?).
async function walk(tx, tz, cap, trace = false) {
  const samples = []; const t0 = await ev("gameClock");
  await down("KeyW");
  try {
    for (;;) {
      await sleep(250);
      const s = JSON.parse(await ev(`JSON.stringify({x: FOOT.x, z: FOOT.z, t: gameClock, sp: +FOOT.sp.toFixed(2), d: +Math.hypot(FOOT.x - (${tx}), FOOT.z - (${tz})).toFixed(2)})`));
      samples.push(s);
      if (s.t - t0 > cap || (s.t - t0 > 2 && s.d > 14)) break;
    }
  } finally { await up("KeyW"); }
  if (trace) console.log("TRACE " + JSON.stringify(samples.map(s => ({ t: +(s.t - t0).toFixed(2), sp: s.sp, d: s.d }))));
  let snagRun = 0, snagMax = 0;
  for (let i = 1; i < samples.length; i++) {
    const d = Math.hypot(samples[i].x - samples[i - 1].x, samples[i].z - samples[i - 1].z);
    snagRun = d < 0.08 ? snagRun + 1 : 0; snagMax = Math.max(snagMax, snagRun);
  }
  const s0 = samples[0], sN = samples[samples.length - 1];
  const minD = Math.min(...samples.map(s => s.d));
  const m = Math.hypot(sN.x - s0.x, sN.z - s0.z), dt = sN.t - t0;
  return { m: +m.toFixed(1), secs: +dt.toFixed(2), avg: +(m / dt).toFixed(2), snagStalls: snagMax, nSamples: samples.length, minDist: +minD.toFixed(2), endDist: sN.d };
}

const pal = JSON.parse(await ev(`(() => {
  const out = [];
  scene.traverse(o => { if (o.isGroup && o.userData.fuelCans) out.push({ name: o.userData.fuelCans, x: o.position.x, z: o.position.z, a: o.rotation.y }); });
  return JSON.stringify(out);
})()`));
console.log("cabins found", pal.length, pal.map(p => p.name));

const rows = [];
for (let i = 0; i < Math.min(2, pal.length); i++) {
  const c = pal[i];
  // approach from 12 m out, straight at the pallet group's centre (the worst case for the obstacle)
  const ax = c.x + Math.sin(c.a) * 12, az = c.z + Math.cos(c.a) * 12;
  const yaw = Math.atan2(c.x - ax, c.z - az);
  await setFoot(ax.toFixed(2), az.toFixed(2), yaw.toFixed(4));
  await sleep(500);
  const startAt = JSON.parse(await ev(`JSON.stringify((${cellJ})(${ax}, ${az}))`));
  const yardAt = JSON.parse(await ev(`JSON.stringify((${cellJ})(${c.x}, ${c.z}))`));
  const w = await walk(c.x, c.z, 12, i === 0);
  rows.push({ cabin: c.name, startDepth: startAt.d, startPack: startAt.pack, yardDepth: yardAt.d, yardPack: yardAt.pack, ...w });
  console.log(`${c.name.padEnd(14)} start d ${startAt.d} pack ${startAt.pack} · yard-centre d ${yardAt.d} pack ${yardAt.pack} · walked ${w.m} m net in ${w.secs}s = ${w.avg} m/s, snag-run ${w.snagStalls}, closest ${w.minDist} m, ended ${w.endDist} m from pallet`);
}

// stills at cabin 0: day walk-up (6 m), then night at the cans (1.3 m)
if (pal.length) {
  const c = pal[0];
  await setFoot((c.x + Math.sin(c.a) * 6).toFixed(2), (c.z + Math.cos(c.a) * 6).toFixed(2), (Math.atan2(-Math.sin(c.a), -Math.cos(c.a))).toFixed(4));
  await sleep(500);
  await sideCam(`[${c.x}, surf(${c.x}, ${c.z}) + 1, ${c.z}]`, 7, 2.2, 1.57); await sleep(400); await shot("00_day_walkup_6m");
  await camOff(); await sleep(250); await shot("01_day_chase_walkup");

  await ev("GS.hour = 22; true");
  await setFoot((c.x + Math.sin(c.a) * 1.6).toFixed(2), (c.z + Math.cos(c.a) * 1.6).toFixed(2), (Math.atan2(-Math.sin(c.a), -Math.cos(c.a))).toFixed(4));
  await sleep(800);
  await sideCam(`[${c.x}, surf(${c.x}, ${c.z}) + 1, ${c.z}]`, 2.2, 1.7, 1.2); await sleep(400); await shot("02_night_cans_close");
  await camOff(); await sleep(300); await shot("03_night_chase_cans");
}

console.log("ROWS " + JSON.stringify(rows));
await done();
