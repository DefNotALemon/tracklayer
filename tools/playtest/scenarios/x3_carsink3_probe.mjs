// probe (3.4b2a): the near snow patch's drawn height (pdata = ground + depth cached at fill time) vs surf() under a car
import { boot, ev, sleep, done } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(1000);
const probe = `(x, z) => { const ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL), i = ix - pox, j = iz - poz;
  if (i < 0 || j < 0 || i >= S || j >= S) return null; const o = (j * S + i) * 4; const xx = ix * CELL - HALF, zz = iz * CELL - HALF;
  return [+(pdata[o] - (groundAt(xx, zz) + depthAt(ix, iz))).toFixed(2), +(pdata[o] - surf(xx, zz)).toFixed(2)]; }`;
for (const S of [811, 1500]) {
  const q = await J(`(() => { const pr = ${probe}; const p = TLXT.lanePt("skjanes", ${S} - 30, 1); P.x = p.cx + 12; P.z = p.cz + 12; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(P.x, P.z, true);
    const c = TLXT.place("skjanes", ${S}, 1); c.v = 0; TLXT.TRAF.passWait = 1e9; const o = [];
    for (const l of [-3, 0, 3]) o.push([l, pr(c.x + l, c.z)]);
    return { S: ${S}, o }; })()`);
  console.log("after force recenter", JSON.stringify(q));
}
// a pass without a forced recenter: teleport far and let the game recenter itself (row reuse)
const q2 = await J(`(() => { const pr = ${probe}; const p = TLXT.lanePt("skjanes", 1200, 1); P.x = p.cx + 6; P.z = p.cz; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; return true; })()`);
await sleep(4000);
const q3 = await J(`(() => { const pr = ${probe}; const p = TLXT.lanePt("skjanes", 1200, 1); const o = []; let worst = 0, n = 0;
  for (let a = -40; a <= 40; a += 2) for (let b = -40; b <= 40; b += 2) { const r = pr(P.x + a, P.z + b); if (r) { n++; if (Math.abs(r[1]) > Math.abs(worst)) worst = r[1]; } }
  return { n, worst, here: pr(p.cx, p.cz) }; })()`);
console.log("natural recenter", JSON.stringify(q3));
// whole-patch scan for stale cells
const q4 = await J(`(() => { let worst = 0, wx = 0, wz = 0, bad = 0, n = 0; for (let j = 0; j < S; j += 4) for (let i = 0; i < S; i += 4) { const ix = pox + i, iz = poz + j, o = (j * S + i) * 4; const xx = ix * CELL - HALF, zz = iz * CELL - HALF; const e = pdata[o] - (groundAt(xx, zz) + depthAt(ix, iz)); n++; if (Math.abs(e) > 0.05) bad++; if (Math.abs(e) > Math.abs(worst)) { worst = e; wx = xx; wz = zz; } }
  const r = TLXR.near ? TLXR.near(wx, wz) : null; return { n, bad, worst: +worst.toFixed(2), wx, wz, P: [P.x, P.z], road: r && (r.d !== undefined ? r.d : r) }; })()`);
console.log("patch scan", JSON.stringify(q4));
await done(0);
