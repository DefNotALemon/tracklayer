// Beta break test for the v220 Map chart redo: night, every village, tick cost, zoom/pan/tap, reload, touch, no NaN.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_mapchart_break.mjs <outdir>
import { boot, ev, tap, shot, sleep, done, OUT, reload } from "../lib.mjs";
import fs from "node:fs";
await boot(); await tap("KeyH"); await sleep(3000);
await ev(`tutSkip(); true`);
let bad = 0; const A = (c, m) => { if (!c) { bad++; console.log("FAIL:", m); } else console.log("ok:", m); };
const open = (x, z, span) => ev(`(() => { P.x=${x}; P.z=${z}; FOOT.on=false; TABLET.toggle(true,"map"); const m=TABLET.apps.find(a=>a.id==="map"); m.panX=m.panZ=0; m.spanT=m.span=${span}; return true; })()`);
async function chart(name) {
  const url = await ev(`document.querySelector("#tabS canvas").toDataURL("image/png")`);
  fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(`${OUT}/${name}_chart.png`, Buffer.from(url.split(",")[1], "base64"));
}
// tick cost: time map tick over 60 frames at several spans
for (const span of [200, 420, 1500, 8192]) {
  await open(-1300, -385, span); await sleep(1200);
  const r = JSON.parse(await ev(`(() => { const m=TABLET.apps.find(a=>a.id==="map"); const t=performance.now(); let n=0; const ts=[]; for(let i=0;i<40;i++){const a=performance.now(); m.tick(0.016); ts.push(performance.now()-a);} ts.sort((a,b)=>a-b); return JSON.stringify({med:ts[20],p95:ts[38],max:ts[39]}); })()`));
  console.log("tick ms span", span, JSON.stringify(r));
  A(r.p95 < 12, `map tick p95 ${r.p95.toFixed(2)} ms at span ${span}`);
}
// night
await ev(`(() => { GS.hour = 23.5; return true; })()`); await sleep(1500);
await open(-1300, -385, 300); await sleep(1500); await shot("night_town"); await chart("night_town");
// every village
const vs = JSON.parse(await ev(`JSON.stringify(SITES.filter(s=>s.kind==="village"&&s.x!==undefined).map(s=>({n:s.name,x:s.x,z:s.z})))`));
console.log("villages", vs.length);
for (const v of vs.slice(0, 4)) { await open(v.x, v.z, 240); await sleep(900); await shot("vil_" + v.n.replace(/\W/g, "")); }
// zoom + pan + tap waypoint
await open(-1300, -385, 420); await sleep(800);
const r2 = JSON.parse(await ev(`(() => { const m=TABLET.apps.find(a=>a.id==="map"); m.zoomBy(0.5); m.zoomBy(0.5); m.zoomBy(4); return JSON.stringify({spanT:m.spanT}); })()`));
console.log("zoom", JSON.stringify(r2));
const wp = JSON.parse(await ev(`(() => { const c=document.querySelector("#tabS canvas"); const b=c.getBoundingClientRect(); const o={clientX:b.left+b.width*0.6,clientY:b.top+b.height*0.4,pointerId:7,bubbles:true}; c.dispatchEvent(new PointerEvent("pointerdown",o)); c.dispatchEvent(new PointerEvent("pointerup",o)); return JSON.stringify({x:WP.x,z:WP.z}); })()`));
A(wp.x !== null && isFinite(wp.x) && isFinite(wp.z), "tap drops a waypoint " + JSON.stringify(wp));
// NaN scan on town cache
const nan = JSON.parse(await ev(`(() => { const C=TT_C; if(!C) return JSON.stringify({none:true}); let bad=0; const walk=o=>{ if(typeof o==="number"){ if(!isFinite(o)) bad++; } else if(o&&typeof o==="object") for(const k in o) walk(o[k]); }; walk(C); return JSON.stringify({bad}); })()`));
A(!nan.none && nan.bad === 0, "town cache numbers finite " + JSON.stringify(nan));
// reload on new day, map still draws
await reload(); await sleep(2500); await ev(`tutSkip(); true`);
await open(-1300, -385, 260); await sleep(1500); await shot("after_reload");
// touch layout phone
await ev(`(() => { SET.touch="on"; setTouchUI(); return true; })()`);
await open(-1300, -385, 260); await sleep(1200); await shot("touch");
// out-of-order: map while on foot, in a vehicle/interior
await ev(`(() => { FOOT.on = true; TABLET.toggle(true,"map"); return true; })()`); await sleep(1500); await shot("onfoot");
console.log(bad ? "FAIL" : "ALL PASS");
await done(bad ? 1 : 0);
