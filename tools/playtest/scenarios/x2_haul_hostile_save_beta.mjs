// Beta test 2.6a/2.6b: the sled trailer's saved record (state.haul) planted hostile, each through a real reload.
// Prints ok/FAIL; exit 1 on a failure.
import { boot, ev, sleep, done, reload, raw } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; true`);
await ev(`(() => { const o = GS.own; o.partsOwned["recv:ball"] = true; o.partsOwned["hitch:trailer"] = true; o.parts.recv = "ball"; o.parts.hitch = "trailer"; GS.cash = 9000; restat(); return 1; })()`);
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400);
await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(400);
await ev(`save(); true`);
const base = JSON.parse(await raw(`localStorage.getItem("tracklayer.save.v2")`) || "null");
ok(base && base.x && base.x.sys.vehicles.s, "base save has vehicles state");
const vs = base.x.sys.vehicles.s;
console.log("haul in base:", JSON.stringify(vs.haul), "owned:", vs.owned.map(r => r.uid).join(","));
const uid = vs.owned[0] && vs.owned[0].uid;
const mk = h => { const b = JSON.parse(JSON.stringify(base)); b.x.sys.vehicles.s.haul = h; return b; };
const probe = () => J(`(() => { const s = TLX.state("vehicles"), h = s.haul; return { h, rigOn: TLXV.rigOn(), err: 0, tabs: document.body.textContent.indexOf("NaN") >= 0 || document.body.textContent.indexOf("undefined") >= 0 }; })()`);
const cases = {
  strings: { on: null, x: "12", z: "-5", yaw: "1.2", ramp: "1", cond: "50", strap: null },
  nulls: { on: null, x: null, z: null, yaw: null, ramp: null, cond: null, strap: null },
  gone_truck: { on: "v999", x: 5, z: 5, yaw: 0, ramp: 0, cond: 80, strap: { x: 0, z: 0, yaw: 0 } },
  strap_wild: { on: uid, x: 5, z: 5, yaw: 0, ramp: 0, cond: 80, strap: { x: 1e9, z: -1e9, yaw: 99 } },
  strap_strings: { on: null, x: 5, z: 5, yaw: 0, ramp: 0, cond: 80, strap: { x: "0", z: "1", yaw: "0" } },
  cond_neg: { on: null, x: 5, z: 5, yaw: 0, ramp: 2, cond: -40, strap: null },
  inf: { on: null, x: 1e308 * 10, z: 5, yaw: 0, ramp: 0, cond: 1e9, strap: null },
  array: [1, 2, 3],
  strap_no_on: { on: null, x: 5, z: 5, yaw: 0, ramp: 0, cond: 80, strap: { x: 0, z: 1, yaw: 0 } },
  on_number: { on: 1, x: 5, z: 5, yaw: 0, ramp: 0, cond: 80, strap: null },
};
for (const [name, h] of Object.entries(cases)) {
  const plant = mk(h);
  const nerr = await J(`0`).catch(() => 0);
  await reload(plant); await sleep(1200);
  const errs = await J(`(window.__errs || []).length`).catch(() => 0);
  let r; try { r = await probe(); } catch (e) { r = { threw: String(e) }; }
  const hh = r.h;
  const fin = !hh || [hh.x, hh.z, hh.yaw].every(Number.isFinite);
  ok(!r.threw, `${name}: loads, no throw`);
  ok(fin, `${name}: pose finite -> ${JSON.stringify(hh)}`);
  if (hh) {
    ok(hh.cond >= 0 && hh.cond <= 100, `${name}: cond in range (${hh.cond})`);
    ok(!hh.strap || hh.on != null, `${name}: strap implies on a truck (strap ${JSON.stringify(hh.strap)}, on ${hh.on})`);
    ok(hh.ramp === 0 || hh.ramp === 1, `${name}: ramp 0/1 (${hh.ramp})`);
  }
  // the garage Trucks tab + Plow-less map layer render without NaN
  await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400);
  const txt = await ev(`document.querySelector("#garageBody").textContent`);
  ok(!/NaN|undefined|object Object/.test(txt), `${name}: Trucks tab text clean`);
  await ev(`closeGarage(); true`);
}
console.log("page errors:", (await import("../lib.mjs")).errors.length ? "SEE ABOVE" : "none");
await done(fails ? 1 : 0);
