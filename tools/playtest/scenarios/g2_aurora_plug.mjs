// G2: does the Aurora E (battery sled) get anything for its $14500 besides stats? Parks it, nearly flat, at
// stops with no fuel for sale (a village/cabin without jerry cans, the quay) and at a pump, then at the
// same stops on a Matriarch for comparison. Logs litres gained, cash spent and toasts over ~8 game-s.
// Also prints range (L ÷ burn) for the Matriarch and the Aurora, and the Aurora's garage card perk line.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_aurora_plug.mjs
import { boot, ev, done, sleep } from "../lib.mjs";
await boot();
await ev(`(() => { GS.own.sleds = SLEDS.map(x => x.id); GS.cash = 5000; GS.delivered = 70; window.__toasts = []; const t0 = toast; toast = (m, k) => { window.__toasts.push(m); return t0(m, k); }; WX.at = () => 0; GS.storm = 0; return 1; })()`);
const spots = JSON.parse(await ev(`(() => {
  const plain = SITES.filter(s => s.x !== undefined && !s.fuelPrice && s !== depot && s !== garageSite && s.kind === "village").slice(0, 1);
  const cab = SITES.filter(s => s.x !== undefined && !s.fuelPrice && s.kind !== "village" && s !== depot && s !== garageSite).slice(0, 1);
  const st = STATIONS.filter(t => t.x !== undefined).slice(0, 1);
  const L = [];
  for (const s of plain.concat(cab)) L.push({ name: s.name, x: s.x, z: s.z, kind: s.kind || s.type });
  L.push({ name: "Kjøllefjord quay", x: depot.x, z: depot.z, kind: "depot" });
  for (const t of st) L.push({ name: t.name, x: t.x, z: t.z, kind: "station" });
  return JSON.stringify(L);
})()`));
const stat = JSON.parse(await ev(`(() => { const o = {}; for (const id of ["matriarch", "aurora"]) { GS.own.sled = id; restat(); o[id] = { fuel: ST.fuel, burn: +ST.burn.toFixed(2), range: +(ST.fuel / ST.burn).toFixed(1) }; } return JSON.stringify(o); })()`));
console.log("RANGE", JSON.stringify(stat));
const card = await ev(`(() => { document.querySelector("#garage").hidden = false; garageTab = "sleds"; renderGarage(); const t = [...document.querySelectorAll("#garageBody .row")].map(b => b.innerText.replace(/\\n+/g, " | ")).filter(t => /Aurora E/.test(t)); document.querySelector("#garage").hidden = true; return t.join(" || "); })()`);
console.log("CARD", card);
for (const id of ["matriarch", "aurora"]) {
  for (const s of spots) {
    await ev(`(() => { if (FS.spot) fuelEnd("left"); GS.own.sled = "${id}"; restat(); P.x = ${s.x} + 4; P.z = ${s.z} + 4; P.vx = P.vz = 0; recenter(P.x, P.z, true); P.y = surf(P.x, P.z) + 0.3; GS.fuel = 3; GS.cash = 5000; window.__toasts = []; window.__t0 = gameClock; return 1; })()`);
    for (let i = 0; i < 40; i++) { await sleep(400); const t = +(await ev(`gameClock - window.__t0`)); if (t > 8) break; }
    const r = JSON.parse(await ev(`JSON.stringify({ L: +(GS.fuel - 3).toFixed(1), cap: GS.cap, spent: 5000 - GS.cash, t: +(gameClock - window.__t0).toFixed(1), near: GS.near ? GS.near.name : null, toasts: window.__toasts.slice(0, 3) })`));
    console.log(`${id.padEnd(9)} @ ${s.kind.padEnd(8)} ${s.name.padEnd(26)} +${r.L} L of ${r.cap} in ${r.t}s, spent $${r.spent}, near=${r.near} | ${r.toasts.join(" / ")}`);
  }
}
const low = await ev(`(() => { if (FS.spot) fuelEnd("left"); GS.own.sled = "aurora"; restat(); P.x = SPAWN.x + 900; P.z = SPAWN.z + 300; GS.near = null; GS.fuel = GS.cap * 0.15; GS.lowWarned = false; window.__toasts = []; return 1; })()`);
await sleep(2500);
console.log("LOW-WARN aurora:", await ev(`window.__toasts.filter(t => /low/i.test(t)).join(" / ")`));
await done();
