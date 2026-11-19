// Beta probe: x3_crawl's "flat land spot" search came back null on main (v256). Counts which criterion rejects candidates,
// from the sled's start and from the depot, to tell a stale scenario from a map change.
import { boot, ev, sleep, done } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); true`); await sleep(600);
const r = await J(`(() => { const c = {tot:0, sea:0, water:0, bio:0, ob:0, ob2:0, slope:0, slope2:0, pass:0}; const x0 = P.x, z0 = P.z; const eg = [];
 for (let r = 700; r < 2500; r += 130) for (let k = 0; k < 40; k++) { const x = x0 + Math.sin(k*0.157+r)*r, z = z0 + Math.cos(k*0.157+r)*r; c.tot++;
  if (isSea(x,z)) { c.sea++; continue; } if (isWater(x,z)) { c.water++; continue; }
  let bad = false; for (let a=-2;a<=2;a++) for (let b=-1;b<=3;b++) { const i = clamp(Math.round((x+a*20+HALF)/GRES),0,GN-1), j = clamp(Math.round((z+b*20+HALF)/GRES),0,GN-1); if (bio[j*GN+i]===1||bio[j*GN+i]===3) bad = true; }
  if (bad) { c.bio++; continue; } if (obNear(x,z,60) || obNear(x,z+30,30)) { c.ob++; continue; }
  const s1 = slopeAt(x,z,8), s2 = slopeAt(x,z+20,10); if (s1 >= 0.045 || s2 >= 0.05) { c.slope++; if (eg.length<6) eg.push([+s1.toFixed(3), +s2.toFixed(3)]); continue; } c.pass++; }
 return { c, eg, start: [P.x, P.z] }; })()`);
console.log(JSON.stringify(r));
await done(0);
