// Beta 6.1b: hop between the two station rooms, and duplicate caretaker vacancy.
import { boot, ev, sleep, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const stepIn = async (room, wait) => { await ev(`(() => { if (INT.on) intGoOut(); const b = INT.beacons.find(q => q.cab.id === "slettnes:${room}"); crashCancel(); FOOT.on = true; FOOT.x = b.x; FOOT.z = b.z; FOOT.y = surf(b.x, b.z); return true; })()`); await sleep(wait); return J(`({ on: INT.on, id: INT.on ? INT.cab.id : null })`); };
await boot();
await ev(`tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.hour = 34; GS.cash = 50000; GS.apps.realestate = 1; TLX.state("staff").apps = []; true`);
await sleep(800);
await ev(`TLX.prop.setTab("light"); TABLET.toggle(true, "realestate"); TABLET.render(); document.querySelector('#tabV [data-act="probuy:slettnes"]').click(); TABLET.toggle(false); true`);
for (const wait of [1500, 4000]) {
  const seq = [];
  for (const r of ["house", "tower", "house", "tower"]) seq.push(JSON.stringify(await stepIn(r, wait)));
  console.log("wait", wait, seq.join(" "));
  ok(seq.every((s, i) => s.includes(i % 2 ? "tower" : "house")), `hops with ${wait} ms between all enter`);
  await ev(`if (INT.on) intGoOut(); true`); await sleep(1500);
}
const v = await J(`(() => { const n0 = TLX.state("staff").apps.length; TLX.staff.post({ id: "pr:slettnes", role: "caretaker" }); TLX.staff.post({ id: "pr:slettnes", role: "caretaker" }); return { n0, n: TLX.state("staff").apps.filter(a => a.place === "pr:slettnes" || a.id === "pr:slettnes").length, all: TLX.state("staff").apps.length }; })()`);
console.log("vacancies", JSON.stringify(v));
await done(fails ? 1 : 0);
