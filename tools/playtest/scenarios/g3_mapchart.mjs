// G3: the tablet Map app's chart: town block/road detail and sled-country glyphs. Stills over Kjøllefjord at three zooms,
// a village, and the whole map. Asserts the town layer drew (house footprints, lanes) and no page errors.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_mapchart.mjs
import { boot, ev, tap, shot, sleep, done, OUT } from "../lib.mjs";
import fs from "node:fs";
await boot(); await tap("KeyH"); await sleep(3500);
await ev(`tutSkip(); true`);
const info = JSON.parse(await ev(`JSON.stringify({ foot: KIT.foot.length, lanes: TOWNL.length, town: KIT.foot.filter(h=>Math.hypot(h.x-depot.x,h.z-depot.z)<TOWN_R).length })`));
console.log("town layer data", JSON.stringify(info));
let bad = 0; if (info.foot < 15 || info.lanes < 10 || info.town < 12) { bad++; console.log("FAIL: town data too thin"); }
async function view(name, x, z, span) {
  await ev(`(() => { P.x = ${x}; P.z = ${z}; FOOT.on = false; TABLET.toggle(true, "map"); return true; })()`);
  await sleep(700);
  await ev(`(() => { const m = TABLET.apps.find(a => a.id === "map"); m.panX = m.panZ = 0; m.spanT = m.span = ${span}; return true; })()`);
  await sleep(1500); await shot(name);
  const url = await ev(`document.querySelector("#tabS canvas").toDataURL("image/png")`);   // the chart itself, full resolution
  fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(`${OUT}/${name}_chart.png`, Buffer.from(url.split(",")[1], "base64"));
}
await view("map_town_close", -1300, -385, 200);
await view("map_town_mid", -1300, -385, 420);
await view("map_outskirts", -1100, -300, 1500);
await view("map_village", 661, -3146, 260);
await view("map_whole", 0, 0, 8192);
console.log(bad ? "FAIL" : "ok");
await done(bad ? 1 : 0);
