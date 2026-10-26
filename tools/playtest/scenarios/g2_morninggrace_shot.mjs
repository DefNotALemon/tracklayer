// G2 verify v93: visual check that a brand-new save's sky stays clear through the morning and a storm
// eases in by mid-afternoon. Jumps GS.hour (keeps WX.seed fixed) and shoots the sky each time.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_morninggrace_shot.mjs
import { boot, ev, shot, sleep, done } from "../lib.mjs";
await boot();
async function at(hour, label) {
  await ev(`GS.hour = ${hour}; true`);
  await sleep(600);
  const info = await ev(`JSON.stringify({ hour: +(GS.hour%24).toFixed(2), storm: +GS.storm.toFixed(2), wx: +WX.at(P.x,P.z).toFixed(2) })`);
  console.log(label, info);
  await shot(label);
}
await at(10, "01_h10");
await at(13, "02_h13");
await at(14.2, "03_h14_2");
await at(16, "04_h16");
await done();
