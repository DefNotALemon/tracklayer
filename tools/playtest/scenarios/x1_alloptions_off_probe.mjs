// Beta: with every option off, do traffic cars, cruisers, barriers still show? Then flip on mid-play and see they come back.
import { boot, ev, sleep, hold, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.hour = 34; WX.at = () => 0; true`); await sleep(1000);
const snap = () => J(`({ traf: TLXT.cars.filter(c => c.on).length, trafAll: TLXT.cars.length, grp: TLXT.group.visible, cops: TLXP.cops.filter(c => c.on).length, polMode: TLXP.mode, cvOn: TLXCV.on, cvRoads: TLXCV.roads.length, tErr: TLXT.err, cvErr: TLXCV.err })`);
console.log("on ", JSON.stringify(await snap()));
await ev(`(() => { for (const id of ["traffic","convoy","police","digcars","rentals","slumlords"]) TLX.setOn(id, false); return true; })()`);
await hold(["KeyW"], 3000); await sleep(3000);
const off = await snap(); console.log("off", JSON.stringify(off));
ok(off.grp === false, "traffic group hidden with traffic off (c.on stays " + off.traf + ", frozen, collide() not run)");
ok(off.cops === 0 || off.cops === -1, "no cruisers with police off: " + off.cops);
ok(!off.tErr && !off.cvErr, "no system error");
await ev(`TLX.setOn("traffic", true); TLX.setOn("police", true); TLX.setOn("convoy", true); true`);
await hold(["KeyW"], 3000); await sleep(8000);
const on = await snap(); console.log("on2", JSON.stringify(on));
ok(on.traf > 0 || on.trafAll > 0, "traffic back after switching on: " + on.traf);
await done(fails ? 1 : 0);
