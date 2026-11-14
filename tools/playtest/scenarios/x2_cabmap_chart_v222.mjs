// Beta 0175: slice 2.4 vehicle pins on the redone (v220) Map chart: two trucks owned, in cab, zoomed whole-map and close; pin/label legibility stills + chip check.
import { boot, ev, sleep, done, park, shot } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); true`); await sleep(500);
await ev(`crashCancel(); FOOT.on = false; true`); await park(); await sleep(300);
for (let i = 0; i < 2; i++) { await ev(`GS.cash = 20000; garageTab = "trucks"; openGarage(); true`); await sleep(400); await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(400); }
console.log("owned", await J(`TLX.state("vehicles").owned.map(r=>[r.uid,Math.round(r.x),Math.round(r.z)])`));
await ev(`(() => { const r = TLX.state("vehicles").owned[0]; crashCancel(); FOOT.on = true; FOOT.x = r.x + 3; FOOT.z = r.z; FOOT.y = surf(FOOT.x, FOOT.z); recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(800);
for (const mode of ["foot"]) {
  await ev(`TABLET.toggle(true, "map"); true`); await sleep(1200);
  await shot("01_map_default");
  console.log("chips", await J(`[...document.querySelectorAll("#tablet .chip, #tabS .chip, .mapchip, #tablet button")].map(e=>e.textContent.trim()).filter(Boolean).slice(0,30)`));
  for (let k = 0; k < 6; k++) { await ev(`(() => { const a = TABLET.apps ? 0 : 0; const m = document.querySelector("#tablet canvas, #tabS canvas"); if (m) m.dispatchEvent(new WheelEvent("wheel", {deltaY: -300, bubbles:true, cancelable:true, clientX: m.getBoundingClientRect().left + m.getBoundingClientRect().width/2, clientY: m.getBoundingClientRect().top + m.getBoundingClientRect().height/2})); return 1; })()`); await sleep(300); }
  await sleep(1200); await shot("02_map_zoomed");
  for (let k = 0; k < 12; k++) { await ev(`(() => { const m = document.querySelector("#tablet canvas, #tabS canvas"); if (m) m.dispatchEvent(new WheelEvent("wheel", {deltaY: 300, bubbles:true, cancelable:true, clientX: m.getBoundingClientRect().left + m.getBoundingClientRect().width/2, clientY: m.getBoundingClientRect().top + m.getBoundingClientRect().height/2})); return 1; })()`); await sleep(200); }
  await sleep(1500); await shot("03_map_whole");
  await ev(`TABLET.toggle(false); true`);
}
console.log("pins", await J(`tabVehPts().map(p=>[p.kind,p.name,Math.round(p.x),Math.round(p.z)])`));
await done();
