// probe: does a reload mid-bleed far from town keep the wound? (report 0143 finding F)
import { boot, reload, ev, raw, sleep, done } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(100); }
const info = () => J(`({ n: TLX.state("wounds").wounds.length, hp: +GS.health.toFixed(1), fuel: +GS.fuel.toFixed(1), x: Math.round(P.x), z: Math.round(P.z), foot: FOOT.on, site: Math.round(Math.min(...SITES.map(s => Math.hypot(P.x - s.x, P.z - s.z)))) })`);
await boot();
await ev(`tutSkip(); GS.hour = 34; true`); await sleep(500);
await ev(`(() => { let best = null, bd = 0; for (let x = -WORLD/2 + 200; x < WORLD/2 - 200; x += 150) for (let z = -WORLD/2 + 200; z < WORLD/2 - 200; z += 150) { if (isSea(x, z) || isWater(x, z)) continue; const d = Math.min(...SITES.map(s => Math.hypot(x - s.x, z - s.z))); if (d > bd) { bd = d; best = [x, z]; } } crashCancel(); FOOT.on = false; P.x = best[0]; P.z = best[1]; P.y = surf(P.x, P.z); P.vx = P.vz = 0; recenter(P.x, P.z, true); GS.fuel = 8; return 1; })()`);
await sleep(800);
await ev(`TLX.wounds.hit(); true`); await waitGame(3); 
console.log("before save", JSON.stringify(await info()));
await ev(`save(); true`);
const sv = JSON.parse(await raw(`localStorage.getItem("tracklayer.save.v2")`));
console.log("save pos", JSON.stringify(sv.pos || sv.P || Object.keys(sv).slice(0, 40)), "wounds", JSON.stringify(sv.x.sys.wounds));
await reload(sv); await ev(`tutSkip(); true`); await sleep(300);
console.log("right after reload", JSON.stringify(await info()));
await sleep(1500);
console.log("1.5 s later", JSON.stringify(await info()));
await done(0);
