// HUD location badge (top-left #zoneName): what does it say parked at the quay, the garage, a home yard, a village,
// a herder cabin, out on the fell, and on foot in town? Reports 0004 F3 / 0005 F2: it said "OPEN BACKCOUNTRY"
// beside the Kjøllefjord quay buildings. Run: tools/playtest/run.sh tools/playtest/scenarios/g3_zone_badge.mjs
import { boot, ev, sleep, shot, tap, done } from "../lib.mjs";
await boot();
const spots = JSON.parse(await ev(`JSON.stringify((() => {
  const S = id => SITES.find(s => s.id === id), o = [];
  o.push({ n: "quay", x: depot.x + 18, z: depot.z + 10 });
  o.push({ n: "town edge 95m", x: depot.x + 95 * Math.cos(1.1), z: depot.z + 95 * Math.sin(1.1) });
  o.push({ n: "garage", x: garageSite.x - 6, z: garageSite.z + 4 });
  for (const id of ["strandbu", "mehamn", "dyfjord", "windfarm", "sandfjord", "relay"]) { const s = S(id); o.push({ n: id, x: s.x + 14, z: s.z + 9 }); }
  o.push({ n: "backcountry", x: depot.x + 700, z: depot.z + 500 });
  return o;
})())`));
for (const s of spots) {
  await ev(`(() => { P.x = ${s.x}; P.z = ${s.z}; P.vx = P.vz = 0; recenter(P.x, P.z, true); P.y = surf(P.x, P.z) + 0.3; return 1; })()`);
  await sleep(700);
  const z = await ev(`document.getElementById("zoneName").textContent`);
  console.log(`${s.n.padEnd(14)} badge: ${z}`);
  if (s.n === "quay") await shot("01_quay");
}
// on foot in town: park at the quay, climb off, walk 30 m away from the sled
await ev(`(() => { P.x = depot.x + 18; P.z = depot.z + 10; P.vx = P.vz = 0; recenter(P.x, P.z, true); P.y = surf(P.x, P.z) + 0.3; return 1; })()`);
await sleep(800); await tap("KeyQ"); await sleep(2500);
await ev(`(() => { FOOT.x = depot.x + 40; FOOT.z = depot.z + 40; return 1; })()`); await sleep(700);
console.log(`on foot town  badge: ${await ev(`document.getElementById("zoneName").textContent`)} (onFoot ${await ev("FOOT.on")})`);
await ev(`(() => { FOOT.x = depot.x + 650; FOOT.z = depot.z + 500; return 1; })()`); await sleep(700);
console.log(`on foot fell  badge: ${await ev(`document.getElementById("zoneName").textContent`)}`);
await done();
