// Probe for report: what the nan_pose / fuel_wild / dup_uid loads leave in the records.
import { boot, ev, sleep, done, reload, raw } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot(); await ev(`tutSkip(); true`); await sleep(600); await ev(`crashCancel(); FOOT.on = false; true`);
await ev(`GS.cash = 30000; garageTab = "trucks"; openGarage(); true`); await sleep(400);
await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(500);
await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(400);
await ev(`save(); true`);
const base = JSON.parse(await raw(`localStorage.getItem("tracklayer.save.v2")`));
const mk = f => { const b = JSON.parse(JSON.stringify(base)); f(b.x.sys.vehicles.s); return b; };
const dump = `(() => TLX.state("vehicles").owned.map(r => ({ uid: r.uid, x: r.x, z: r.z, yaw: r.yaw, fuel: r.fuel })))()`;
for (const [n, f] of [["nan_pose", s => s.owned.forEach(r => { r.x = null; r.z = null; r.yaw = null; })], ["fuel_wild", s => { s.owned[0].fuel = -50; s.owned[1].fuel = 1e9; }], ["dup_uid", s => { s.owned[1].uid = s.owned[0].uid; }]]) {
  await reload(mk(f)); await sleep(1500); await ev(`tutSkip(); true`); await sleep(500);
  console.log(n, JSON.stringify(await J(dump)));
  if (n === "dup_uid") { await ev(`garageTab="trucks"; openGarage(); true`); await sleep(400); console.log(" garage rows:", await ev(`document.querySelector("#garageBody").innerText.replace(/\\s+/g," ").slice(0,500)`)); await ev(`closeGarage(); true`); }
  if (n === "fuel_wild") { await ev(`(() => { const q = TLX.state("vehicles").owned[1]; crashCancel(); FOOT.on = true; FOOT.x = q.x + 3; FOOT.z = q.z; FOOT.y = surf(FOOT.x, FOOT.z); recenter(FOOT.x, FOOT.z, true); })()`); await sleep(900); const { tap } = await import("../lib.mjs"); await tap("KeyQ"); await sleep(4500); console.log(" in truck 2 fuel:", await ev(`GS.fuel`), await ev(`TLX.state("vehicles").cur`)); }
}
await done(0);
