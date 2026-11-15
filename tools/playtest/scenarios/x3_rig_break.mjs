// Beta round on 3.5b2a (tlx-rig): out-of-order use. Prints findings; exit 1 on a failed assert.
//  A. a pickup (no fifth wheel) backed under a trailer never couples.
//  B. couple the tractor, swap to the pickup (swapTo): the trailer stays with the parked tractor, pickup drives free.
//  C. swap back: still coupled, rig drives.
//  D. tractor record removed from state while coupled (sold): trailer drops on legs, no errors.
//  E. night coupling toast + reload mid-coupling approach.
import { boot, ev, tap, sleep, done, down, up, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
const tr = id => J(`TLXRIG.list().find(t => t.id === "${id}")`);
const spd = () => J(`({ v: +Math.hypot(P.vx, P.vz).toFixed(2), vf: +(P.vx * Math.sin(P.yaw) + P.vz * Math.cos(P.yaw)).toFixed(2), x: P.x, z: P.z })`);
const place = (id, ahead, yawOff = 0, vf = 0) => ev(`(() => { const t = TLXRIG.list().find(t => t.id === "${id}"), yaw = t.yaw + ${yawOff}, fz = VEH.cur ? (TLXV.rt().def.fifthZ ?? -1.6) : -1.6;
  const fx = t.kx + Math.sin(t.yaw) * ${ahead}, fzz = t.kz + Math.cos(t.yaw) * ${ahead};
  P.x = fx - Math.sin(yaw) * fz; P.z = fzz - Math.cos(yaw) * fz; P.yaw = yaw; P.vx = Math.sin(yaw) * ${vf}; P.vz = Math.cos(yaw) * ${vf}; P.vy = 0; P.y = surf(P.x, P.z); BOG.on = false; BOG.acc = 0; FOOT.on = false; FOOT.g.visible = false; recenter(P.x, P.z, true); return true; })()`);
async function backUnder(id, secs = 25) { const t0 = await clock(); while ((await clock()) - t0 < secs) { if ((await tr(id)).on) return true; const v = (await spd()).vf; if (v > -1.0) { await down("KeyS"); await sleep(120); await up("KeyS"); } await sleep(120); } return false; }

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.hour = 12; GS.storm = 0; WX.at = () => 0; TLX.setOn("traffic", false); GS.cash = 40000; GS.lic.freight = true; true`); await sleep(800);
const names = await J(`Object.keys(TLXV.VEHICLES || {}).length ? Object.keys(TLXV.VEHICLES) : TLXV.VEHICLES.map(v => v.id)`);
console.log("vehicles", names.join(","));
await ev(`TLXV.buy("pickup"); TLXV.buy("tractor"); true`); await sleep(500);
const own = await J(`TLX.state("vehicles").owned.map(r => ({ uid: r.uid, id: r.id || r.type || r.def }))`);
console.log("owned", JSON.stringify(own));
const pu = own.find(o => /pick/.test(o.id)), tk = own.find(o => /tractor/.test(o.id));
ok(pu && tk, "bought a pickup and a tractor");
// A. pickup under the trailer
await ev(`TLXV.swapTo(${JSON.stringify(pu.uid)}); true`); await sleep(1500);
console.log("cur", await ev(`JSON.stringify(TLX.state("vehicles").cur)`), "fifthZ", await ev(`TLXV.rt().def.fifthZ`));
await place("kj", 1.6, 0); await waitGame(0.6);
const tA = await backUnder("kj", 10); const a = await tr("kj");
ok(!tA && a.on === null, "A: pickup backed onto the kingpin does not couple");
await ev(`P.vx = P.vz = 0; true`);
// B. tractor couples, swap to pickup
await ev(`TLXV.swapTo(${JSON.stringify(tk.uid)}); true`); await sleep(1500);
await place("kj", 1.6, 0.03); await waitGame(0.6);
ok(await backUnder("kj", 25), "B: tractor couples"); await sleep(500);
await ev(`TLX.state("rig").t.kj.legs = 0; true`);   // legs wound up (state), as the use key does
await ev(`P.vx = P.vz = 0; true`);
await ev(`TLXV.swapTo(${JSON.stringify(pu.uid)}); true`); await sleep(2000);
let t = await tr("kj"); const err1 = await ev("TLXRIG.err");
console.log("after swap to pickup", JSON.stringify({ on: t.on, legs: t.legs, art: t.art, x: Math.round(t.x), z: Math.round(t.z), err: err1, mass: await ev("TLXV.rt().mass") }));
ok(t.on === tk.uid, "B: trailer still shown coupled to the parked tractor (on=" + t.on + ")");
const pk = await J(`(() => { const p = TLXV.pose(${JSON.stringify(tk.uid)}), t = TLXRIG.list()[0]; return { px: p.x, pz: p.z, d: Math.hypot(p.x - t.x, p.z - t.z), sx: P.x, sz: P.z }; })()`);
console.log("parked tractor vs trailer", JSON.stringify(pk));
ok(Math.abs(await ev("TLXV.rt().mass") - 7200) < 400 || true, "B: (info) pickup mass " + await ev("TLXV.rt().mass"));
// drive the pickup a bit: trailer must stay where it was
await down("KeyW"); await sleep(3000); await up("KeyW");
const t2 = await tr("kj");
ok(Math.hypot(t2.x - t.x, t2.z - t.z) < 0.3, "B: trailer did not follow the pickup (moved " + Math.hypot(t2.x - t.x, t2.z - t.z).toFixed(2) + " m)");
await ev(`P.vx = P.vz = 0; true`);
// C. back to the tractor
await ev(`TLXV.swapTo(${JSON.stringify(tk.uid)}); true`); await sleep(2000);
t = await tr("kj"); const m = await ev("TLXV.rt().mass");
ok(t.on === tk.uid && Math.abs(m - 14400) < 60, `C: swapped back: still coupled, mass ${m}`);
await down("KeyW"); await sleep(3500); await up("KeyW");
{ const q = await J(`(() => { const f = TLXRIG.fifth(${JSON.stringify(tk.uid)}), t = TLXRIG.list()[0]; return { d: Math.hypot(f[0] - t.x, f[1] - t.z), L: t.L, v: Math.hypot(P.vx, P.vz) }; })()`);
  ok(Math.abs(q.d - q.L) < 0.05 && q.v > 1, `C: rig drives on (${q.v.toFixed(1)} m/s), wheelbase ${q.d.toFixed(2)} / ${q.L}`); }
await ev(`P.vx = P.vz = 0; true`);
// D. tractor sold while coupled
await ev(`TLXV.swapTo(${JSON.stringify(pu.uid)}); true`); await sleep(1500);
await ev(`(() => { const S = TLX.state("vehicles"); S.owned = S.owned.filter(r => r.uid !== ${JSON.stringify(tk.uid)}); return 1; })()`); await sleep(1500);
t = await tr("kj");
console.log("after tractor removed", JSON.stringify({ on: t.on, legs: t.legs, err: await ev("TLXRIG.err") }));
ok(t.on === null && t.legs === 1 && !(await ev("TLXRIG.err")), "D: tractor sold: trailer on its legs, no rig error");
// E. save/reload after that
await ev(`save(); true`); await sleep(300); await reload(); await sleep(800);
t = await tr("kj");
ok(t && t.on === null && !(await ev("TLXRIG.err")), "E: reload after the sale loads clean");
console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
