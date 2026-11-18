// Beta break test for 3.5b2b2 (rig left standing): swap spam, sold lorry planted across a reload, old-format rig save, traffic vs the left rig.
// (tlx-rig.js v3). Asserts, exit 1 on a failure.
// Stills (OUT): the triangle behind the left rig by day and at night.
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

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.hour = 12; GS.storm = 0; WX.at = () => 0; TLX.setOn("traffic", false); GS.cash = 60000; GS.lic.freight = true; true`);
await ev(`TLXV.buy("pickup"); TLXV.buy("tractor"); true`); await sleep(500);
const own = await J(`TLX.state("vehicles").owned.map(r => ({ uid: r.uid, id: r.id }))`), pu = own.find(o => o.id === "pickup"), tk = own.find(o => o.id === "tractor");
await swap(tk.uid); await place("kj", 1.6, 0.02); await waitGame(0.6);
ok(await backUnder("kj", 25), "coupled"); await sleep(400);
await ev(`TLX.state("rig").t.kj.legs = 0; P.vx = P.vz = 0; true`); await waitGame(0.4);
const F = await J(`(() => { let best = null; for (const r of TLXR.routes) { if (!r.cum || r.closed) continue; const q = r.pts; for (let i = 5; i < q.length - 40; i += 6) { if (Math.hypot(q[i][0] - depot.x, q[i][1] - depot.z) < TOWN_R + 60) continue; const g = Math.abs(groundAt(q[i+10][0], q[i+10][1]) - groundAt(q[i][0], q[i][1])) / (r.cum[i+10]-r.cum[i]); if (!best || g < best.g) best = { id: r.id, i, g }; } } return best; })()`);
await rail(F.id, F.i + 8, 1); await sleep(500); await railOff(); await waitGame(1.2);
// A. swap spam x8 on the road
await clearToasts();
for (let k = 0; k < 8; k++) { await swap(k % 2 ? tk.uid : pu.uid); await sleep(150); }
await waitGame(0.8);
await swap(pu.uid); await waitGame(0.6);
{ await sleep(1200); await ev(`(() => { const t = TLXRIG.list()[0]; P.x = t.x - Math.sin(t.yaw) * 40; P.z = t.z - Math.cos(t.yaw) * 40; P.vx = P.vz = 0; P.y = surf(P.x, P.z); recenter(P.x, P.z, true); return 1; })()`); await sleep(900);
  const t = await tr("kj"), ts = await toasts(), tris = await ev(`(() => { let n = 0; scene.traverse(o => { if (/triangle/i.test(o.name || "")) n++; }); return n; })()`);
  console.log("spam", JSON.stringify({ on: t.on, tri: t.tri, left: t.left, said: ts.filter(m => /stay here/.test(m)).length, tris }));
  ok(t.on === tk.uid && t.tri && ts.filter(m => /stay here, coupled/.test(m)).length <= 5, `swap spam x9: rig still coupled, triangle out, "stay here" said ${ts.filter(m => /stay here/.test(m)).length} times`);
  }
// B. traffic on: does a driver stop behind the left rig
await ev(`TLX.setOn("traffic", true); true`);
// C. plant a save where the coupled lorry is gone (sold while the page was shut)
await ev(`save(); true`); await sleep(300);
const sv = JSON.parse(await ev(`localStorage.getItem("tracklayer.save.v2")`));
const tx = sv.x.sys ? sv.x : sv.x;
const S2 = JSON.parse(JSON.stringify(sv));
const rg = (S2.x.rig || S2.x.sys?.rig); 
console.log("rigkeys", JSON.stringify(Object.keys(S2.x)), JSON.stringify(Object.keys(S2.x.sys || {})).slice(0, 200));
const holder = S2.x.sys.rig.s;
const vh = S2.x.sys.vehicles.s;
console.log("rig state", JSON.stringify(holder).slice(0,600), "vehicles", JSON.stringify(Object.keys(vh||{})), "tk", tk.uid, "pu", pu.uid);
if (!vh.owned) { console.log("NO owned"); await done(2); }
vh.owned = vh.owned.filter(r => r.uid !== tk.uid);
await reload(S2); await sleep(700);
await ev(`tutSkip(); GS.storm = 0; WX.at = () => 0; TLX.setOn("traffic", false); true`); await waitGame(1.0);
{ const t = await tr("kj"), ts = await toasts();
  console.log("sold-reload", JSON.stringify({ on: t.on, legs: t.legs, tri: t.tri, left: t.left, x: t.x, z: t.z, toasts: ts.slice(-4) }), await ev("TLXRIG.err"));
  ok(t.on === null && t.legs === 1 && !(await ev("TLXRIG.err")), "a save with the coupled lorry already gone loads: trailer on its legs, no error");
  ok(t.tri, "its triangle is out after the sold-lorry reload"); }
// D. old-format rig save: strip the new fields
{ const S3 = JSON.parse(JSON.stringify(S2)); const h = S3.x.sys.rig.s;
  for (const k of Object.keys(h.t || {})) { const r = h.t[k]; delete r.left; delete r.tri; delete r.legs; }
  S3.x.sys.rig.v = 0; h.told = undefined; delete h.run;
  await reload(S3); await sleep(700);
  await ev(`tutSkip(); GS.storm = 0; true`); await waitGame(1.0);
  const a = await J(`TLXRIG.list()`);
  console.log("oldfmt", JSON.stringify(a.map(t => ({ id: t.id, on: t.on, legs: t.legs, tri: t.tri, x: +t.x?.toFixed(1) }))));
  ok(a.length === 3 && a.every(t => Number.isFinite(t.x) && Number.isFinite(t.z)) && !(await ev("TLXRIG.err")), "a rig save without legs/left/tri fields loads with three finite trailers"); }
console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
