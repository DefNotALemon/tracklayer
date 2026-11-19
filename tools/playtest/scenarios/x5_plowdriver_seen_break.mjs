// 5.4b1 beta break: night, traffic on, ram from behind, let go while seen, far/near loop.
//, exit 1 on a failure.
//   A a driver with their OWN truck, in: a plow truck in their paint stands beside the road's first end (off the plowed
//     width, not in water, clear of walls), blade up, beacon dark, nobody at the wheel; no Map pin; it is solid.
//   B snow on a stretch, you far away: the clock's pace (5.4a1 unchanged): out and opened in minutes of game time.
//   C snow again, you beside the road: the truck is ON the road at p, in the right-hand lane, facing up the road, a
//     driver at the wheel, beacon flashing, a Map pin; it moves at a truck's speed (no more than 12.5 m/s), the blade
//     comes down on the snowed stretch and the truck is held to 7 m/s there; the stretch's due clock does not run away
//     while you watch (no warning); behind the blade its own lane is cut and the other lane is not; the stretch opens.
//   D you stand in its lane: it waits short of you; step aside and it goes on.
//   E it is solid to the sled; the traffic sees it (a `led` car in TLXT.extra) with the traffic option on and off.
//   F heading in: it faces back down the road in the other lane, the pin says so; home again it stands on its spot.
//   G a driver in YOUR truck: out, your truck's own model is on the road (drawn, the record still `out`), back in it is
//     on its parking spot again and the road has no seen truck.
//   H a reload mid-run: the truck is back on the road where the save has it. Let go: the truck is gone.
// Stills (OUT): the parked truck, the truck plowing, heading in, your own truck out.
import { boot, ev, sleep, done, reload, shot, park } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const NOSTILLS = !!process.env.NOSTILLS;
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };

const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
const KIT = `(() => {
  window.__rt = id => TLXR.routes.find(r => r.id === id);
  window.__q = (h, st) => { st = st || 0.5; for (let t = 0; t < h - 1e-6; t += st) { GS.hour += Math.min(st, h - t); TLX.state("roads").h = GS.hour; TLXPL.con.step(); } return true; };
  window.__pdr = id => { const q = TLX.state("plow").pdr[id]; return q ? JSON.parse(JSON.stringify(q)) : null; };
  window.__drv = (id, work, xp, hap) => { const m = TLX.staff.at("plow:" + id); m.tr.work = work; m.tr.temper = 0; m.xpReal = xp; m.hap = hap; m.mood = 0; m.wage = TLX.staff.fair(m); m.paidTo = GS.hour; return TLXPL.pdr.skill(m, id); };
  // the seen truck of a road, as numbers
  window.__z = id => { const Z = TLXPL.pdr.seen.get(id); if (!Z) return null; const R = Z.R, B = Z.gh ? null : null, r = __rt(id), n = TLXR.near(Z.x, Z.z);
    const bl = [...R.grp.children].length;
    return { uid: Z.uid, gh: Z.gh, s: Z.s, off: Z.off, x: Z.x, z: Z.z, yaw: Z.yaw, v: Z.v, vis: R.grp.visible, gx: R.grp.position.x, gz: R.grp.position.z, gy: R.grp.position.y, surf: surf(Z.x, Z.z),
      drv: R.drvBody.visible, lit: !!Z.lit, bc: Z.bc.userData.mat.color.r, car: Z.car ? { on: Z.car.on, x: Z.car.x, z: Z.car.z, led: Z.car.led, inX: TLXT.extra.includes(Z.car), n: Z.car.circ.length } : null,
      roadD: n.d, roadS: n.s, def: R.def.id, kids: bl, tint: R.tintMat ? R.tintMat.color.getHex() : null }; };
  window.__blade = id => { const Z = TLXPL.pdr.seen.get(id); if (!Z) return null; let k = null; Z.R.grp.traverse(o => { }); return Z.uid; };
  // you, on the sled, set down at a place (and kept there: no drift)
  window.__me = (x0, z0) => { crashCancel(); FOOT.on = false; if (VEH.cur) TLXV.swapTo(null); let x = x0, z = z0;
    const wet = (a, b) => isSea(a, b) || isWater(a, b) || isSea(a + 3, b) || isWater(a - 3, b) || isWater(a, b + 3) || isWater(a, b - 3);
    scan: for (let r = 0; r < 120; r += 4) for (let a = 0; a < 6.28; a += 0.4) { const u = x0 + Math.cos(a) * r, v = z0 + Math.sin(a) * r; if (!wet(u, v)) { x = u; z = v; break scan; } }   /* never set down in a lake */
    P.x = x; P.z = z; P.y = surf(x, z) + 0.2; P.vx = P.vz = P.vy = 0; recenter(x, z, true); return true; };
  // the due clock runs on the roads' own time: hold the roads' clock with the game's
  if (!window.__rh) window.__rh = setInterval(() => { try { TLX.state("roads").h = GS.hour; } catch (e) { } }, 30);
  // a sampler: the seen truck's speed and place, 10 times a second of wall time, by the game clock
  window.__samp = id => { window.__sm = []; clearInterval(window.__smI); window.__smI = setInterval(() => { const Z = TLXPL.pdr.seen.get(id), q = TLX.state("plow").pdr[id]; if (Z && q) window.__sm.push([gameClock, Z.s, q.p, Z.v, q.st, Z.x, Z.z, TLXPL.pdr.lost[id] || 0]); }, 100); return true; };
  if (!window.__camHk) { window.__camHk = true; const rr = renderer.render.bind(renderer); renderer.render = (sc, cam) => { const o = window.__cam; if (o && sc === scene) { cam.position.set(o.x, o.y, o.z); cam.lookAt(o.tx, o.ty, o.tz); cam.updateMatrixWorld(); } rr(sc, cam); }; }
  window.__look = (id, dist, h, side) => { const Z = TLXPL.pdr.seen.get(id); if (!Z) { window.__cam = null; return false; } const fx = Math.sin(Z.yaw), fz = Math.cos(Z.yaw); const cx = Z.x + fx * dist * 0.75 + fz * side, cz = Z.z + fz * dist * 0.75 - fx * side; window.__cam = { x: cx, z: cz, y: Math.max(surf(cx, cz), surf(Z.x, Z.z)) + h, tx: Z.x, ty: surf(Z.x, Z.z) + 1.4, tz: Z.z }; return true; };
  return true; })()`;
const SEG = 400;
const still = async (name, rid, dist = 11, h = 3.2, side = 6) => { if (NOSTILLS) return; await ev(`__look(${rid}, ${dist}, ${h}, ${side})`); await sleep(350); await shot(name); await ev(`window.__cam = null; true`); };

await boot();
await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 90000; GS.lic = GS.lic || {}; GS.lic.freight = true; true`);
let RID = "dyfjord", I = 0;
const routes = await J(`TLXPL.con.routes().map(r => ({ id: r.id, len: Math.round(r.len) }))`);
if (!routes.some(r => r.id === RID)) RID = routes[0].id;
const rid = JSON.stringify(RID);
const z = () => J(`__z(${rid})`);
const pdr = () => J(`__pdr(${rid})`);
const hire = async kit => {
  await ev(`TLXPL.PDR.mine = ${kit === "mine" ? 1 : 0}; true`);
  const id = await ev(`(() => { const S = TLX.state("staff"); S.apps = S.apps.filter(a => a.place !== "plow:" + ${rid}); const a = TLX.staff.post({ id: "plow:" + ${rid}, role: "plowdriver" }); a.tr.honest = true; a.xp = a.xpReal = 10; a.exp = GS.hour + 400; return a.id; })()`);
  const h = await ev(`TLX.staff.hire(${JSON.stringify(id)})`);
  await ev(`__drv(${rid}, 1, 10, 70); TLXPL.con.step(); true`); await sleep(400);
  return h === true;
};
const snow = (i, v) => ev(`TLXR.setSnow(${rid}, ${v}, ${i}); TLXPL.con.step(); true`);

await section("break: night, traffic ON, ram, let go while seen, far/near loop", async () => {
  await ev(`TLXV.buy("plowtruck"); true`); await sleep(500);
  await ev(`TLXPL.PDR.mine = 0; TLXPL.con.sign(${rid}); TLX.staff.tick(); true`); await sleep(300);
  I = await ev(`(() => { const r = __rt(${rid}); let b = -1; for (let i = 1; i < r.seg.length - 1; i++) if (r.seg[i].legs.length && (i + 1) * 400 + 40 <= r.len) { b = i; break; } return b; })()`);
  ok(await hire("own"), "driver hired, stretch " + I);
  // night + traffic on
  await ev(`GS.hour = 26; TLX.state("roads").h = 26; TLX.setOn("traffic", true); TLXT.hold = false; true`);
  const me = await J(`(() => { const p = TLXPL.pdr.pt(__rt(${rid}), ${I * SEG} - 60); return { x: p.x - p.tz * -22, z: p.z + p.tx * -22 }; })()`);
  await ev(`__me(${me.x}, ${me.z})`); await sleep(500);
  await snow(I, 0.5); await ev(`__q(0.74, 0.37)`);
  let q = await pdr(), a = null;
  for (let n = 0; n < 60 && !(a && a.s > 80); n++) { await sleep(500); q = await pdr(); a = await z(); }
  ok(q.st === "out" && a && a.vis, "out at night with traffic on: " + (a && Math.round(a.s)));
  console.log("  ", JSON.stringify(a));
  let bmax = 0, bmin = 9; for (let n = 0; n < 12; n++) { const b = await z(); if (b) { bmax = Math.max(bmax, b.bc); bmin = Math.min(bmin, b.bc); } await sleep(120); }
  ok(a && a.lit && bmax > bmin + 0.05, "beacon flashing at night (colour " + bmin.toFixed(2) + ".." + bmax.toFixed(2) + ")");
  await still("b1_night", rid);
  // ram it at speed from behind in its lane
  const ram = await J(`(() => { const Z = TLXPL.pdr.seen.get(${rid}); const fx = Math.sin(Z.yaw), fz = Math.cos(Z.yaw); return { x: Z.x - fx * 60, z: Z.z - fz * 60, yaw: Z.yaw, fx, fz }; })()`);
  await ev(`(() => { __me(${ram.x} + ${ram.fx} * 40, ${ram.z} + ${ram.fz} * 40); P.yaw = ${ram.yaw}; window.__ri = setInterval(() => { P.vx = ${ram.fx} * 30; P.vz = ${ram.fz} * 30; }, 30); return true; })()`);
  let minD = 1e9, nan = false, maxBack = 0;
  for (let n = 0; n < 30; n++) { await sleep(150); const r = await J(`(() => { const Z = TLXPL.pdr.seen.get(${rid}); return Z ? { d: Math.hypot(P.x - Z.x, P.z - Z.z), px: P.x, py: P.y, v: Math.hypot(P.vx, P.vz), zx: Z.x, zv: Z.v, crash: !!CRASH.on } : null; })()`); if (!r) break; if (!Number.isFinite(r.px) || !Number.isFinite(r.py)) nan = true; minD = Math.min(minD, r.d); }
  await ev(`clearInterval(window.__ri); true`);
  ok(!nan, "no NaN after ramming; min distance " + minD.toFixed(2) + " m");
  ok(minD > 1.0, "sled did not pass through the truck (min " + minD.toFixed(2) + ")");
  ok((await ev(`TLXPL.pdr.sx.err`)) === null, "no seen-truck error after ram");
  await ev(`crashCancel(); FOOT.on = false; true`);
  // let go while seen
  const m = await J(`(() => { const m = TLX.staff.at("plow:" + ${rid}); return m ? m.id : null; })()`);
  await ev(`__me(${me.x}, ${me.z}); true`); await sleep(400);
  const gh0 = await ev(`TLXV.ghosts.size`);
  await ev(`TLX.staff.letGo(${m}); true`); await sleep(1200);
  a = await z(); q = await pdr();
  console.log("  after letGo", JSON.stringify({ q, a: a && { gh: a.gh, vis: a.vis } }));
  ok(a === null, "let go while seen: no seen truck left");
  ok((await ev(`TLXPL.pdr.pins().length`)) === 0, "no pin left");
  ok((await ev(`TLXT.extra.filter(c => c.led).length`)) === 0, "no led car left");
  ok((await ev(`TLXV.ghosts.size`)) === 0, "no ghost left (had " + gh0 + ")");
  ok((await ev(`TLXPL.pdr.sx.err`)) === null, "no error after let go");
  // far and near loop with a second hire
  ok(await hire("own"), "rehired");
  await snow(I, 0.5); await ev(`__q(0.74, 0.37)`);
  const base = await ev(`scene.children.length`);
  for (let k = 0; k < 6; k++) { await ev(`__me(${me.x} + 3000, ${me.z} + 3000)`); await sleep(600); await ev(`__me(${me.x}, ${me.z})`); await sleep(900); }
  a = await z(); q = await pdr();
  const after = await ev(`scene.children.length`);
  ok(Math.abs(after - base) < 40, "scene children steady after 6 far/near trips: " + base + " -> " + after);
  ok(!!a || q.st === "home", "truck still there or home (" + q.st + ")");
  ok((await ev(`TLXV.ghosts.size`)) <= 1, "ghosts <= 1: " + (await ev(`TLXV.ghosts.size`)));
  ok((await ev(`TLXPL.pdr.sx.err`)) === null, "no error after loop");
});
console.log(fails ? `FAILED: ${fails}` : "all ok");
await done(fails ? 1 : 0);
