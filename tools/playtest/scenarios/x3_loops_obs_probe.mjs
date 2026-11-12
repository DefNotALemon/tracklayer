// probe: what obstacle sits within 3 m of each open road's points, and is the point on a street segment or a loop?
import { boot, ev, sleep, done } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot(); await ev(`tutSkip(); true`); await sleep(600);
const r = await J(`(() => { const res = []; for (const r of TLXR.routes.filter(r => !r.closed)) { let off = 0; for (const sg of r.segs) { const p = sg.pts; for (let i = 0; i < p.length; i++) { const [x, z] = p[i]; if (obNear(x, z, 3)) { let nearest = null; try { const o = (typeof OBS !== "undefined" ? OBS : []).map(o => ({ o, d: Math.hypot(o.x - x, o.z - z) })).sort((a, b) => a.d - b.d)[0]; nearest = o && { d: +o.d.toFixed(1), r: o.o.r, k: o.o.kind || o.o.type || o.o.t, x: Math.round(o.o.x), z: Math.round(o.o.z) }; } catch (e) { nearest = String(e); } res.push({ id: r.id, street: !!sg.street, x: Math.round(x), z: Math.round(z), i, n: p.length, nearest, yard: +yardAt(x, z).toFixed(2) }); } } } } return res; })()`);
for (const o of r) console.log(JSON.stringify(o));
await done(0);
