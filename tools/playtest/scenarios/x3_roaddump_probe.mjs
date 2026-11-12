// dump road points (all routes) + ground heights to OUT json, for plotting
import { boot, ev, sleep, done } from "../lib.mjs";
import { writeFileSync } from "fs";
await boot();
await ev(`tutSkip(); true`); await sleep(300);
const s = await ev(`JSON.stringify(TLXR.routes.map(r => ({ id: r.id, segs: r.segs.filter(g => !g.street).map(g => g.pts.map(p => [Math.round(p[0]*10)/10, Math.round(p[1]*10)/10, Math.round(groundAt(p[0], p[1])*10)/10])) })))`);
writeFileSync(process.env.DUMP, s); console.log("wrote", s.length);
await done(0);
