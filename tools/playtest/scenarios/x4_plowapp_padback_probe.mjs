// probe: pad B from the Plow app vs another app, how many presses to close the tablet
import { boot, ev, sleep, done, padSet, padOff } from "../lib.mjs";
const press = async b => { await padSet({ [b]: 1 }); await sleep(150); await padSet(); await sleep(450); };
await boot();
await ev(`tutSkip(); FOOT.on = false; GS.cash = 40000; GS.lic = GS.lic || {}; GS.lic.freight = true; TLXV.buy("plowtruck"); true`); await sleep(600);
const uid = await ev(`TLXV.state().owned.find(r => r.id === "plowtruck").uid`);
await ev(`TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(600);
for (const app of ["plow", "map", "jobs"]) {
  await ev(`TABLET.toggle(true, ${JSON.stringify(app)}); true`); await sleep(400);
  for (let i = 1; i <= 3; i++) {
    await press(1);
    console.log(app, "after B x" + i, await ev(`JSON.stringify({ open: TABLET.open, app: TABLET.cur || TABLET.app || null })`));
    if (!(await ev(`TABLET.open`))) break;
  }
}
await padOff(); await done(0);
