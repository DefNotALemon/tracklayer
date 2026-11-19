import { boot, ev, tap, sleep, done, reload, down, up, shot, sideCam, camOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(120); }
const NOSTILLS = !!process.env.NOSTILLS;
const still = async name => { if (!NOSTILLS) await shot(name); };
// every toast shown since the last clearToasts(), not only the ones on screen now: a toast lives 4.2 s of WALL time and
// headless game time runs slower than that, so one said at the start of a 2.5 s hold could be gone when it was read
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80);
  return 1; })()`);
const tr = id => J(`TLXRIG.list().find(t => t.id === "${id}")`);
const spd = () => J(`({ t: +gameClock.toFixed(2), v: +Math.hypot(P.vx, P.vz).toFixed(2), vf: +(P.vx * Math.sin(P.yaw) + P.vz * Math.cos(P.yaw)).toFixed(2), x: P.x, z: P.z, yaw: P.yaw })`);
const place = (id, ahead, yawOff = 0, vf = 0) => ev(`(() => { const t = TLXRIG.list().find(t => t.id === "${id}"), yaw = t.yaw + ${yawOff}, fz = TLXV.rt().def.fifthZ;
  const fx = t.kx + Math.sin(t.yaw) * ${ahead}, fzz = t.kz + Math.cos(t.yaw) * ${ahead};
  P.x = fx - Math.sin(yaw) * fz; P.z = fzz - Math.cos(yaw) * fz; P.yaw = yaw; P.vx = Math.sin(yaw) * ${vf}; P.vz = Math.cos(yaw) * ${vf}; P.vy = 0; P.y = surf(P.x, P.z); BOG.on = false; BOG.acc = 0; FOOT.on = false; FOOT.g.visible = false; recenter(P.x, P.z, true); camState.init = false; return 1; })()`);
async function backUnder(id, secs = 25) { const t0 = await clock(); while ((await clock()) - t0 < secs) { if ((await tr(id)).on) return true; const v = (await spd()).vf; if (v > -1.0) { await down("KeyS"); await sleep(120); await up("KeyS"); } await sleep(120); } return false; }
const swap = async uid => { await ev(`TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(1300); };
// a rail: each frame the lorry is put on the road's centre line, heading along it, its speed kept (steering out of the
// picture: what is measured is what the engine, the weight, the snow and the grade allow)
const rail = (id, i0, dir, v0 = 0) => ev(`(() => { const rt = TLXR.routes.find(r => r.id === "${id}"), p = rt.pts; let i = ${i0}; window.__rail = true;
  const f = () => { if (!window.__rail) return; requestAnimationFrame(f);
    for (let n = 0; n < 40; n++) { const j = i + ${dir}; if (j < 0 || j >= p.length) { window.__rail = false; return; }
      const ux = p[j][0] - p[i][0], uz = p[j][1] - p[i][1], uu = ux * ux + uz * uz || 1, t = ((P.x - p[i][0]) * ux + (P.z - p[i][1]) * uz) / uu;
      if (t > 1) { i = j; continue; }
      const L = Math.sqrt(uu), yaw = Math.atan2(ux, uz), v = P.vx * Math.sin(P.yaw) + P.vz * Math.cos(P.yaw), tt = Math.max(0, t);
      P.x = p[i][0] + ux * tt; P.z = p[i][1] + uz * tt; P.yaw = yaw; P.yr = 0; P.vx = Math.sin(yaw) * v; P.vz = Math.cos(yaw) * v; window.__railI = i; break; } };
  const j = i + ${dir}; P.x = p[i][0]; P.z = p[i][1]; P.yaw = Math.atan2(p[j][0] - p[i][0], p[j][1] - p[i][1]); P.vy = 0; P.vx = Math.sin(P.yaw) * ${v0}; P.vz = Math.cos(P.yaw) * ${v0}; P.y = surf(P.x, P.z); BOG.on = false; BOG.acc = 0; FOOT.on = false; FOOT.g.visible = false; recenter(P.x, P.z, true); camState.init = false;
  requestAnimationFrame(f); return 1; })()`);
const railOff = () => ev(`window.__rail = false; P.vx = P.vz = 0; true`);
const vcam = async (yawOff, dist, h, ty = 1.2, back = 0) => { await sideCam(); await ev(`window.camOv = c => { const t = TLXRIG.list().find(t => t.id === "kj"), yaw = t.yaw + ${yawOff}, tx = t.x - Math.sin(t.yaw) * ${back}, tz = t.z - Math.cos(t.yaw) * ${back}, y = surf(tx, tz); c.position.set(tx + Math.sin(yaw) * ${dist}, y + ${ty} + ${h}, tz + Math.cos(yaw) * ${dist}); c.lookAt(tx, y + ${ty}, tz); }; true`); await sleep(400); };

// Beta break test 2 for 3.5b2b2: the curtainsider (mh) coupling, a second trailer while coupled, night storm triangle,
// reload with the lorry present but swapped away, pickup nosing a trailer on its legs.
const B = async (id) => { /* nothing */ };
await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.hour = 12; GS.storm = 0; WX.at = () => 0; TLX.setOn("traffic", false); GS.cash = 60000; GS.lic.freight = true; true`);
await ev(`TLXV.buy("pickup"); TLXV.buy("tractor"); true`); await sleep(500);
const own = await J(`TLX.state("vehicles").owned.map(r => ({ uid: r.uid, id: r.id }))`), pu = own.find(o => o.id === "pickup"), tk = own.find(o => o.id === "tractor");
// 1. couple the curtainsider
await swap(tk.uid); await place("mh", 1.6, 0.02); await waitGame(0.6);
ok(await backUnder("mh", 30), "the tractor couples the curtainsider (mh)"); await sleep(400);
{ const t = await tr("mh"); console.log("mh", JSON.stringify({ on: t.on, legs: t.legs, art: t.art, mass: await ev("TLXV.rt().mass") }));
  ok(t.on === tk.uid && Math.abs(await ev("TLXV.rt().mass") - (await J("TLXV.rt().def.mass || 0")) ) >= 0, `mh coupled, mass ${await ev("TLXV.rt().mass")}`); }
const mass = await ev("TLXV.rt().mass"); ok(mass > 12000 && mass < 16000, `coupled mass plausible with a 6.8 t load trailer: ${mass}`);
// 1b. pull straight out first (no teleport)
await ev(`TLX.state("rig").t.mh.legs = 0; true`);
{ const p0 = await J(`({ x: P.x, z: P.z, on: TLXRIG.list().find(t=>t.id==="mh").on })`); await tap("KeyR"); await down("KeyW"); await waitGame(8); const mid1 = await J(`({ x: P.x, z: P.z, v: Math.hypot(P.vx,P.vz), thr: input.thr, gear: GB.gear, bog: BOG.on, foot: FOOT.on, veh: TLXV.rt().def.id, lock: (TLXV.rt().held||null) })`); await up("KeyW"); const d = Math.hypot(mid1.x - p0.x, mid1.z - p0.z);
  console.log("pull1", JSON.stringify({ p0, mid1, d })); ok(d > 20, `holding W for 8 s game time moves the coupled rig out of its lay-by (${d.toFixed(1)} m)`); }
// 2. while coupled, try to also back under kj (second trailer): must refuse
{ await ev(`TLXRIG.list().find(t=>t.id==="kj")`); await ev(`(() => { const t = TLXRIG.list().find(t=>t.id==="kj"); P.x = t.kx + Math.sin(t.yaw)*1.6 - Math.sin(t.yaw)*3; P.z = t.kz + Math.cos(t.yaw)*1.6 - Math.cos(t.yaw)*3; return 1; })()`); await waitGame(0.5);
  const a = await tr("kj"), b = await tr("mh"); ok(!(a.on && b.on && a.on === b.on), `one lorry never holds two trailers (kj.on=${a.on}, mh.on=${b.on})`); 
  console.log("two", JSON.stringify({ kj: a.on, mh: b.on, err: await ev("TLXRIG.err") })); }
// 3. pull out of the lay-by onto the road, then left at night in a storm
console.log("gear", JSON.stringify(await J(`({ g: GB.gear, dir: GB.dir, x: P.x, z: P.z })`))); await tap("KeyR"); await waitGame(0.3);
await down("KeyW"); await waitGame(9); await up("KeyW"); await waitGame(1.5);
console.log("pulled", JSON.stringify(await J(`({ x: P.x, z: P.z, g: GB.gear, dir: GB.dir, on: TLXRIG.list().find(t=>t.id==="mh").on, v: Math.hypot(P.vx,P.vz) })`)));
await ev(`GS.hour = 23; GS.storm = 1; WX.at = () => 1; true`);
const mh = await tr("mh"); if (!mh.on) { await ev(`(() => { const t = TLXRIG.list().find(t=>t.id==="kj"); return 1; })()`); }
const coupled = (await tr("mh")).on ? "mh" : "kj";
await clearToasts(); await swap(pu.uid); await waitGame(0.8);
{ const t = await tr(coupled), ts = await toasts(); console.log("left", JSON.stringify({ id: coupled, left: t.left, tri: t.tri, lamp: t.lamp, vis: t.vis, ts: ts.slice(0, 3) }));
  ok(t.on === tk.uid, "swapped away in the storm: still coupled"); }
// 4. pickup nosing the trailer on legs
await ev(`(() => { const t = TLXRIG.list().find(t=>t.id==="lb"); const yaw = t.yaw; P.x = t.x - Math.sin(yaw) * (t.over + 15); P.z = t.z - Math.cos(yaw) * (t.over + 15); P.yaw = yaw; P.vx = P.vz = 0; P.vy = 0; P.y = surf(P.x, P.z); FOOT.on = false; recenter(P.x, P.z, true); return 1; })()`);
await sleep(500); await down("KeyW"); await sleep(5000); await up("KeyW");
{ const s = await J(`({ v: Math.hypot(P.vx, P.vz), x: P.x, z: P.z, nan: !isFinite(P.x + P.z + P.y) })`), lb = await tr("lb");
  const d = Math.hypot(s.x - lb.x, s.z - lb.z); console.log("nose", JSON.stringify({ s, d, lb: [lb.x, lb.z] }));
  ok(!s.nan, "driving into a trailer's tail: finite position"); }
// 5. reload with the lorry present, swapped away
await ev(`save(); true`); await sleep(300); const sv = await tr(coupled);
await reload(); await sleep(700);
await ev(`tutSkip(); WX.at = () => 0; GS.storm = 0; TLX.setOn("traffic", false); true`); await waitGame(0.8);
{ const k = await tr(coupled); console.log("reload", JSON.stringify({ on: k.on, tri: k.tri, left: k.left, x: k.x, sx: sv.x, err: await ev("TLXRIG.err") }));
  ok(k.on === sv.on && Math.hypot(k.x - sv.x, k.z - sv.z) < 0.5 && !(await ev("TLXRIG.err")), "reload: rig still coupled to the same lorry, same place");
  ok(k.left, `reload: rig still counts as left (tri=${k.tri} is only built near the player, left=${k.left})`);
  for (const w of [2, 4]) { await waitGame(w); const k2 = await tr(coupled); console.log("reload+", w, JSON.stringify({ tri: k2.tri, left: k2.left, vis: k2.vis })); }
  const d0 = await J(`(() => { const t = TLXRIG.list().find(t=>t.id==="${coupled}"); return Math.hypot(P.x - t.x, P.z - t.z); })()`); console.log("dist to rig", d0);
  await ev(`(() => { const t = TLXRIG.list().find(t=>t.id==="${coupled}"); P.x = t.x - Math.sin(t.yaw) * 40; P.z = t.z - Math.cos(t.yaw) * 40; P.y = surf(P.x,P.z); recenter(P.x, P.z, true); return 1; })()`); await waitGame(1.5);
  { const k3 = await tr(coupled); ok(k3.tri, `reload: triangle out once the player is 40 m behind (tri=${k3.tri}, vis=${k3.vis})`); } }
// 6. drive away in the lorry after reload: trailer follows
await swap(tk.uid); await waitGame(0.6);
{ const k = await tr(coupled); ok(k.on === tk.uid && !k.tri, "back in the lorry after reload: triangle in, still coupled"); }
console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
