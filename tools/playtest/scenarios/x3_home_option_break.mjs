// Beta 3.4b2b round 4: the "traffic" option flipped while owners are out. A away cars come home when it goes off (spot, circles, mesh);
// B back on: nobody re-leaves until a reload, no tick error; C option off mid-drive home, then on and a fresh send home works;
// D option off survives reload (no car away at boot), on again after reload.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s, fn) { const t0 = await clock(); while ((await clock()) - t0 < s) { if (fn && await fn()) return true; await sleep(150); } return false; }
process.env.TL_AWAY = "1";
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34.5; true`); await sleep(1200);
const circ = i => `(() => { const c = TLXC.cars[${i}]; return obstaclesNear(c.x, c.z, 4).filter(o => Math.hypot(o.x - c.x, o.z - c.z) < 3.2 && o.top > -1e8).length; })()`;

// ---- A
const H = await J(`TLXT.homes.slice(0, 4).map(h => h.ci)`);
ok(H.length >= 3, `setup: ${H.length} homes`);
await ev(`(() => { for (const i of ${JSON.stringify(H)}) TLXC.setAway(i, true); return true; })()`); await sleep(500);
const a0 = await J(`({ n: TLXC.awayN(), c: ${H.map(i => circ(i)).join(" + ")} })`);
console.log("A before:", JSON.stringify(a0)); ok(a0.n >= 3, `A: ${a0.n} away`);
await ev(`TLX.setOn("traffic", false); true`); await sleep(1500);
const a1 = await J(`({ n: TLXC.awayN(), on: TLX.on("traffic"), hid: ${JSON.stringify(H)}.map(i => !!TLXC.cars[i].hid), circ: ${JSON.stringify(H)}.map(i => ${circ("i")}), grp: TLXT.group.visible, err: TLXT.tickErr || TLXC.tickErr || TLXT.err || null })`);
console.log("A after:", JSON.stringify(a1));
ok(!a1.on && a1.n === 0, "A: option off, nobody away");
ok(a1.hid.every(h => !h), "A: every car mesh back");
ok(a1.circ.every(c => c > 0), `A: collision circles back (${a1.circ})`);
ok(!a1.grp && !a1.err, `A: traffic group hidden, err ${a1.err}`);

// ---- B
await ev(`TLX.setOn("traffic", true); true`); await waitGame(8);
const b = await J(`({ n: TLXC.awayN(), on: TLX.on("traffic"), grp: TLXT.group.visible, moving: TLXT.cars.filter(c => c.on).length, err: TLXT.tickErr || TLXC.tickErr || TLXT.err || null })`);
console.log("B:", JSON.stringify(b));
ok(b.on && b.grp && !b.err, `B: back on, group visible, err ${b.err}`);
ok(b.n === 0, `B: nobody re-leaves before a reload (${b.n} away)`);

// ---- C
await ev(`(() => { for (const c of TLXC.cars) TLXC.setAway(c.i, false); for (const c of TLXT.cars) c.on = false; for (const h of TLXT.homes) h.taken = -1; TLXT.hold = false; const h = TLXT.homes[0]; TLXC.setAway(h.ci, true);
  const x = h.x + 70, z = h.z + 40; P.x = x; P.z = z; P.y = surf(x, z) + 0.3; P.vx = P.vz = 0; recenter(x, z, true); window.__hd = TLXT.homesDone; TLXT.sendHome(0, 120, 0); return true; })()`);
await waitGame(6);
const c0 = await J(`({ st: TLXT.cars.filter(c => c.st === "home").length, away: TLXC.awayN() })`); console.log("C driving:", JSON.stringify(c0));
await ev(`TLX.setOn("traffic", false); true`); await sleep(1500);
const c1 = await J(`({ away: TLXC.awayN(), home: TLXT.cars.filter(c => c.st === "home").length, taken: TLXT.homes.filter(h => h.taken >= 0).length, circ: ${circ(0)}, hid: !!TLXC.cars[TLXT.homes[0].ci].hid })`);
console.log("C off mid-drive:", JSON.stringify(c1));
ok(c1.away === 0 && c1.home === 0 && c1.taken === 0, "C: car released, spot home, nothing held");
ok(c1.circ > 0 && !c1.hid, "C: spot has its car back");
await ev(`TLX.setOn("traffic", true); true`); await sleep(1500);
await ev(`(() => { const h = TLXT.homes[1]; TLXC.setAway(h.ci, true); const x = h.x + 70, z = h.z + 40; P.x = x; P.z = z; P.y = surf(x, z) + 0.3; recenter(x, z, true); window.__hd = TLXT.homesDone; TLXT.sendHome(1, 120, 0); return true; })()`);
const arrived = await waitGame(80, async () => (await J(`TLXT.homesDone - window.__hd`)) > 0);
const c2 = await J(`({ away: TLXC.awayN(), err: TLXT.tickErr || TLXC.tickErr || null })`);
console.log("C re-send:", JSON.stringify({ arrived, ...c2 }));
ok(arrived && c2.away === 0 && !c2.err, "C: a fresh drive home after the toggle parks");

// ---- D
await ev(`TLX.setOn("traffic", false); true`); await sleep(500);
await reload();
const d = await J(`({ on: TLX.on("traffic"), away: TLXC.awayN(), homes: TLXT.homes.length, err: TLXT.err || null })`);
console.log("D off after reload:", JSON.stringify(d));
ok(!d.on && d.away === 0 && !d.err, "D: option off persisted, nobody away at boot");
await ev(`TLX.setOn("traffic", true); true`); await sleep(1500);
const d2 = await J(`({ on: TLX.on("traffic"), away: TLXC.awayN(), err: TLXT.tickErr || TLXC.tickErr || null })`);
ok(d2.on && !d2.err, `D: on again, err ${d2.err}, away ${d2.away}`);
console.log(fails ? `${fails} FAILED` : "all passed"); await done(fails ? 1 : 0);
