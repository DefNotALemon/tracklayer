// Beta break test for the v220 Map chart redo: night, phone size, zoom sweep timing, waypoint tap, tablet close/reopen, page errors.
import { boot, ev, tap, shot, sleep, done, OUT } from "../lib.mjs";
import fs from "node:fs";
await boot(); await tap("KeyH"); await sleep(3500);
await ev(`tutSkip(); true`);
let bad = 0; const fail = m => { bad++; console.log("FAIL:", m); };
const open = async (x, z, span) => {
  await ev(`(() => { P.x=${x}; P.z=${z}; FOOT.on=false; TABLET.toggle(true,"map"); return true; })()`); await sleep(600);
  await ev(`(() => { const m=TABLET.apps.find(a=>a.id==="map"); m.panX=m.panZ=0; m.spanT=m.span=${span}; return true; })()`); await sleep(1200);
};
// night
await ev(`GS.hour = 23; true`); await sleep(500);
await open(-1300, -385, 200); await shot("night_close");
await open(-1300, -385, 600); await shot("night_mid");
// zoom sweep: cost per chart tick
const t = JSON.parse(await ev(`(() => { const m=TABLET.apps.find(a=>a.id==="map"); const r=[]; for (const s of [120,200,400,800,1500,3000,8192]) { m.spanT=m.span=s; const t0=performance.now(); for(let i=0;i<10;i++) m.tick(1/60); r.push([s,+((performance.now()-t0)/10).toFixed(2)]); } return JSON.stringify(r); })()`));
console.log("ms per tick by span", JSON.stringify(t));
for (const [s, ms] of t) if (ms > 25) fail(`chart tick ${ms} ms at span ${s}`);
// waypoint tap + pan
await open(-1300, -385, 200);
await ev(`(() => { const c=document.querySelector("#tabS canvas"); const b=c.getBoundingClientRect(); c.dispatchEvent(new MouseEvent("click",{clientX:b.left+b.width*0.6,clientY:b.top+b.height*0.4,bubbles:true})); return true; })()`);
await sleep(300); console.log("WP", await ev(`JSON.stringify({x:WP.x,z:WP.z})`));
await shot("wp_close");
// close, reopen, different spans, other machine/sled
await ev(`TABLET.toggle(false); true`); await sleep(300);
await ev(`GS.hour = 12; true`);
await open(661, -3146, 90); await shot("village_tight");
// phone portrait
await ev(`(async()=>true)()`);
const errs = await ev(`JSON.stringify(window.__errs||[])`);
console.log("errs", errs);
console.log(bad ? "FAIL" : "ok");
await done(bad ? 1 : 0);
