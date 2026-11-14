// Beta 6.1b break-it: Slettnes station out of order. Prints findings; exit 1 on failed checks.
import { boot, reload, ev, tap, down, up, sleep, shot, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const R = id => J(`TLX.prop.rec("slettnes:${id}")`);
const buy = `(() => { const b = document.querySelector('#tabV [data-act="probuy:slettnes"]'); if (b) b.click(); return GS.cash; })()`;
const stepIn = async room => { await ev(`(() => { if (INT.on) intGoOut(); const b = INT.beacons.find(q => q.cab.id === "slettnes:${room}"); crashCancel(); FOOT.on = true; FOOT.x = b.x; FOOT.z = b.z; FOOT.y = surf(b.x, b.z); return true; })()`); await sleep(1500); return ev("INT.on"); };

await boot();
await ev(`tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.hour = 34; GS.cash = 12500; GS.apps.realestate = 1; true`);
await sleep(1000);
// 1. exactly the price, double click
await ev(`TLX.prop.setTab("light"); TABLET.toggle(true, "realestate"); TABLET.render(); true`); await sleep(400);
const c1 = await ev(buy); const c2 = await ev(buy);
const own = await ev(`TLX.prop.owns("slettnes")`);
ok(own && c1 === 0 && c2 === 0, `1: exact price buys once, cash ${c1} then ${c2}`);
await ev(`TABLET.render(); true`);
const txt = await ev(`$("tabV").textContent`);
ok(!/BUY IT/.test(txt), "1: no BUY button left after buying");
await ev(`TABLET.toggle(false); true`);
// 2. enter at night, sweep halfway, reload mid-room
await ev(`GS.hour = 46; TLX.state("prop").kit = 3; true`);
ok(await stepIn("house"), "2: into house at night");
await shot("x6b_night_house");
await ev(`(() => { for (const [x, z] of TLX.prop.freeCells(INT.room)) { INT.px = x; INT.pz = z; FOOT.yaw = 0; const u = TLX.prop.use(); if (u && u.label === "SWEEP") return true; } return false; })()`);
await tap("KeyE"); await sleep(500);
const sw = await ev(`TLX.prop.SW.on`);
console.log("sweeping:", sw);
// 3. walk out while sweeping: sweep state must stop
await ev(`intGoOut(); true`); await sleep(800);
const st = await J(`({ sw: TLX.prop.SW.on, int: INT.on, kit: TLX.state("prop").kit, foot: FOOT.on })`);
ok(!st.sw && !st.int, "3: leaving the room mid-sweep stops the sweep " + JSON.stringify(st));
// 4. reload while inside the tower
ok(await stepIn("tower"), "4: into tower");
await reload(); await sleep(1500);
const rl = await J(`({ int: INT.on, own: TLX.prop.owns("slettnes"), foot: FOOT.on, err: !!document.querySelector("#err") })`);
console.log("after reload inside tower:", JSON.stringify(rl));
ok(rl.own, "4: ownership survives reload from inside a room");
// 5. entering a room by walk-in, then enter other door immediately, no stale colliders
ok(await stepIn("house") && await stepIn("tower") && await stepIn("house"), "5: house->tower->house hops all enter");
const kit = await ev(`TLX.state("prop").kit`);
// 6. sweep with zero kit
await ev(`TLX.state("prop").kit = 0; true`);
const u0 = await J(`(() => { const u = footUse(); return u; })()`);
console.log("zero-kit footUse:", JSON.stringify(u0));
// 7. staff for station: post twice, hire none
const dup = await J(`(() => { const a = TLX.staff.post({ id: "pr:slettnes", role: "caretaker" }), b = TLX.staff.post({ id: "pr:slettnes", role: "caretaker" }); return { a: !!a, b: !!b, n: TLX.state("staff").apps.length }; })()`);
console.log("double-post vacancy:", JSON.stringify(dup));
// 8. depot cabin page after owning lighthouse: strip + buy depot works
await ev(`if (INT.on) intGoOut(); GS.cash = 50000; TLX.prop.setTab("depot"); TABLET.toggle(true, "realestate"); TABLET.render(); true`); await sleep(500);
const dp = await J(`[...document.querySelectorAll('#tabV [data-act]')].map(b => b.dataset.act).slice(0, 12)`);
console.log("depot page acts:", JSON.stringify(dp));
ok(dp.length > 0, "8: depot page still has actions with a lighthouse owned");
await shot("x6b_depot_page");
await done(fails ? 1 : 0);
