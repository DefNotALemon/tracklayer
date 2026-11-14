// v220 chart: waypoint tap, drag-pan then tap, reopen keeps marker, spans extremes. Asserts WP set via pointer events.
import { boot, ev, tap, sleep, shot, done } from "../lib.mjs";
await boot(); await tap("KeyH"); await sleep(3500); await ev(`tutSkip(); true`);
let bad = 0; const fail = m => { bad++; console.log("FAIL:", m); };
await ev(`(() => { P.x=-1300; P.z=-385; FOOT.on=false; TABLET.toggle(true,"map"); const m=TABLET.apps.find(a=>a.id==="map"); m.spanT=m.span=200; return true; })()`); await sleep(1500);
const ptr = (t, fx, fy) => ev(`(() => { const c=document.querySelector("#tabS canvas"); const b=c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent("${t}",{clientX:b.left+b.width*${fx},clientY:b.top+b.height*${fy},pointerId:7,bubbles:true})); return true; })()`);
await ptr("pointerdown", .6, .4); await ptr("pointerup", .6, .4); await sleep(300);
const w1 = JSON.parse(await ev(`JSON.stringify({x:WP.x,z:WP.z})`)); console.log("tap WP", JSON.stringify(w1));
if (w1.x === null) fail("tap set no waypoint");
// drag
await ptr("pointerdown", .5, .5); await ptr("pointermove", .3, .5); await ptr("pointerup", .3, .5); await sleep(300);
const w2 = JSON.parse(await ev(`JSON.stringify({x:WP.x,z:WP.z,pan:TABLET.apps.find(a=>a.id==="map").panX})`)); console.log("after drag", JSON.stringify(w2));
if (w2.x !== w1.x) fail("a drag moved the waypoint"); if (!w2.pan) fail("drag did not pan");
await shot("after_pan");
// extreme zoom
for (const s of [20, 60, 8192, 20000]) { await ev(`(() => { const m=TABLET.apps.find(a=>a.id==="map"); m.spanT=${s}; return true; })()`); await sleep(1200);
  console.log("span", s, await ev(`JSON.stringify({s:+TABLET.apps.find(a=>a.id==="map").span.toFixed(0)})`)); await shot("span_"+s); }
// close/reopen
await ev(`TABLET.toggle(false); true`); await sleep(300); await ev(`TABLET.toggle(true,"map"); true`); await sleep(800);
console.log("WP after reopen", await ev(`JSON.stringify({x:WP.x,z:WP.z})`));
console.log(bad ? "FAIL" : "ok"); await done(bad ? 1 : 0);
