// Expansion slice 3.5b3a: trailer runs (tlx-rig.js v4, tlx-roads.js v10, the jobX / appX bridges in tracklayer.js).
// Asserts, exit 1 on a failure.
//   A. the Freight app: no licence = no section; licence without a tractor unit = a note, nothing to take
//   B. with a tractor: one run posted per trailer, to a lay-by at least 300 m off, paid by tonnes and road metres
//   C. TAKE (a click on the card's button): saved, the cargo's weight on the trailer, a Jobs row, the compass on the kingpin
//   D. coupled, legs up at the legs (the use provider): the whole weight on the lorry, the compass on the far lay-by
//   E. loaded, a standing start on a 9% road and on the steepest stretch of open road (numbers, by script on a rail)
//   F. in the far lay-by still coupled: not paid yet, the compass says uncouple; uncoupled at the legs: paid with the
//      10% for standing clear of the road, no warning triangle, new runs posted
//   G. a trailer stood ON the road at the far lay-by: paid without the 10%, and the triangle is out
//   H. a reload in the middle of a run keeps it; GIVE UP ends it for nothing
//   I. a save whose run names a trailer that does not exist loads with no run
// Stills (OUT): the Freight app with runs posted and with one under way, the compass on the haul.
import { boot, ev, sleep, done, reload, down, up, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(120); }
const NOSTILLS = !!process.env.NOSTILLS;
const still = async name => { if (!NOSTILLS) await shot(name); };
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80);
  return 1; })()`);
const tr = id => J(`TLXRIG.list().find(t => t.id === "${id}")`);
const spd = () => J(`({ t: +gameClock.toFixed(2), v: +Math.hypot(P.vx, P.vz).toFixed(2), vf: +(P.vx * Math.sin(P.yaw) + P.vz * Math.cos(P.yaw)).toFixed(2), x: P.x, z: P.z, yaw: P.yaw })`);
const place = (id, ahead, yawOff = 0) => ev(`(() => { const t = TLXRIG.list().find(t => t.id === "${id}"), yaw = t.yaw + ${yawOff}, fz = TLXV.rt().def.fifthZ;
  const fx = t.kx + Math.sin(t.yaw) * ${ahead}, fzz = t.kz + Math.cos(t.yaw) * ${ahead};
  P.x = fx - Math.sin(yaw) * fz; P.z = fzz - Math.cos(yaw) * fz; P.yaw = yaw; P.vx = P.vz = 0; P.vy = 0; P.y = surf(P.x, P.z); BOG.on = false; BOG.acc = 0; FOOT.on = false; FOOT.g.visible = false; recenter(P.x, P.z, true); camState.init = false; return 1; })()`);
async function backUnder(id, secs = 25) { const t0 = await clock(); while ((await clock()) - t0 < secs) { if ((await tr(id)).on) return true; const v = (await spd()).vf; if (v > -1.0) { await down("KeyS"); await sleep(120); await up("KeyS"); } await sleep(120); } return false; }
const swap = async uid => { await ev(`TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(1300); };
const atLegs = (id, side = 1.9) => ev(`(() => { const t = TLXRIG.list().find(t => t.id === "${id}"), l = TLXRIG.legsPt("${id}"); P.vx = P.vz = 0; FOOT.on = true; FOOT.g.visible = true; FOOT.x = l[0] + Math.cos(t.yaw) * ${side}; FOOT.z = l[1] - Math.sin(t.yaw) * ${side}; FOOT.yaw = t.yaw - 1.57; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; return 1; })()`);
const useAtLegs = async id => { await atLegs(id); await sleep(350); const lab = await ev(`(() => { const r = footXUse(); if (!r) return ""; r.act(); return r.label; })()`); await sleep(300); await ev(`FOOT.on = false; FOOT.g.visible = false; true`); return lab; };
const rail = (id, i0, dir, v0 = 0) => ev(`(() => { const rt = TLXR.routes.find(r => r.id === "${id}"), p = rt.pts; let i = ${i0}; window.__rail = true;
  const f = () => { if (!window.__rail) return; requestAnimationFrame(f);
    for (let n = 0; n < 40; n++) { const j = i + ${dir}; if (j < 0 || j >= p.length) { window.__rail = false; return; }
      const ux = p[j][0] - p[i][0], uz = p[j][1] - p[i][1], uu = ux * ux + uz * uz || 1, t = ((P.x - p[i][0]) * ux + (P.z - p[i][1]) * uz) / uu;
      if (t > 1) { i = j; continue; }
      const yaw = Math.atan2(ux, uz), v = P.vx * Math.sin(P.yaw) + P.vz * Math.cos(P.yaw), tt = Math.max(0, t);
      P.x = p[i][0] + ux * tt; P.z = p[i][1] + uz * tt; P.yaw = yaw; P.yr = 0; P.vx = Math.sin(yaw) * v; P.vz = Math.cos(yaw) * v; break; } };
  const j = i + ${dir}; P.x = p[i][0]; P.z = p[i][1]; P.yaw = Math.atan2(p[j][0] - p[i][0], p[j][1] - p[i][1]); P.vy = 0; P.vx = Math.sin(P.yaw) * ${v0}; P.vz = Math.cos(P.yaw) * ${v0}; P.y = surf(P.x, P.z); BOG.on = false; BOG.acc = 0; FOOT.on = false; FOOT.g.visible = false; recenter(P.x, P.z, true); camState.init = false;
  requestAnimationFrame(f); return 1; })()`);
const railOff = () => ev(`window.__rail = false; P.vx = P.vz = 0; true`);
const setup = () => ev(`crashCancel(); FOOT.on = false; GS.hour = 12; GS.storm = 0; WX.at = () => 0; TLX.setOn("traffic", false); GS.load = []; GS.claims = []; GS.apps.freight = 1; GS.signed.freight = true; GS.lic.freight = true; true`);
const freight = async () => { await ev(`TABLET.toggle(true, "freight"); TABLET.render(); true`); await sleep(350); return J(`(() => { const el = $("tabS"); return { txt: el.innerText || el.textContent, take: [...el.querySelectorAll('[data-act^="rigrun:"]')].map(b => b.dataset.act.split(":")[1] + "=" + b.textContent.trim()) }; })()`); };
const tabOff = async () => { await ev(`TABLET.open && TABLET.close(); true`); await sleep(250); };
const hud = () => J(`({ title: $("jobTitle").textContent, sub: $("jobSub").textContent })`);
const run = () => J(`TLXRIG.run()`);
const row = () => J(`(() => { const r = jobsList().find(r => r.kind === "rigrun"); return r ? { title: r.title, meta: r.meta, pay: r.pay, tgt: r.tgt, auto: r.auto } : null; })()`);

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await setup(); await ev(`GS.cash = 60000; true`);
ok(!(await ev("TLXRIG.err")) && (await J("TLXRIG.bays()")).length === 3, `three lay-bys to haul between: ${(await J("TLXRIG.bays()")).map(b => b.name).join(", ")}`);

// ---- A. licence and tractor gates
await ev(`GS.lic.freight = false; true`);
{ const f = await freight(); ok(!/Trailer runs/i.test(f.txt) && f.take.length === 0, "without the Freight licence the Freight app has no Trailer runs section"); }
await ev(`GS.lic.freight = true; true`);
{ const f = await freight(); ok(/Trailer runs/i.test(f.txt) && /tractor unit of your own/.test(f.txt) && f.take.length === 0 && !(await ev("TLXRIG.ownsTractor()")), "licensed but with no tractor unit: a note about the lay-bys, nothing to take");
  ok((await ev(`TLXRIG.take("kj")`)) === false && (await run()) === null, "and a run cannot be taken without one"); }
await tabOff();

// ---- B. the posted runs
await ev(`TLXV.buy("pickup"); TLXV.buy("tractor"); true`); await sleep(500);
const own = await J(`TLX.state("vehicles").owned.map(r => ({ uid: r.uid, id: r.id }))`), pu = own.find(o => o.id === "pickup"), tk = own.find(o => o.id === "tractor");
ok(pu && tk, "a pickup and a tractor unit bought");
const offs = await J(`TLXRIG.offers().map(o => { const t = TLXRIG.list().find(t => t.id === o.id), b = TLXRIG.bays().find(b => b.id === o.to); return Object.assign({ air: Math.round(Math.hypot(b.x - t.x, b.z - t.z)), toName: b.name }, o); })`);
console.log("offers", JSON.stringify(offs));
ok(offs.length === 3 && offs.every(o => o.to !== o.id && o.air > 300 && o.m >= o.air * 0.9 && o.m < o.air * 3 && o.kg >= 2000 && o.kg <= 4000 && o.pay === Math.round((150 + 26 * o.kg / 1000 * o.m / 1000) / 5) * 5),
  `one run per trailer: ${offs.map(o => `${o.cargo} ${(o.kg / 1000).toFixed(1)} t ${o.id} -> ${o.toName}, ${(o.m / 1000).toFixed(1)} km by road (${(o.air / 1000).toFixed(1)} straight), $${o.pay}`).join("; ")}`);
ok(offs.every(o => o.pay >= 200 && o.pay <= 1500), `pay in range: ${offs.map(o => "$" + o.pay).join(", ")}`);
await waitGame(4);
ok((await ev(`TLX.state("rig").told`)) === 1, "the first time runs are posted for your lorry the tablet says so (once: saved)");
await ev(`P.x = TLXRIG.list()[0].kx + 60; P.z = TLXRIG.list()[0].kz + 40; P.vx = P.vz = 0; P.y = surf(P.x, P.z); FOOT.on = false; recenter(P.x, P.z, true); camState.init = false; true`); await sleep(1500);
{ const f = await freight(); await sleep(900); await still("rr_1_posted");
  ok(f.take.length === 3 && f.take.every(t => /=TAKE$/.test(t)) && /by road/.test(f.txt) && /pays by the tonne/.test(f.txt), `Freight lists them with a TAKE button each: ${f.take.join(", ")}`); }

// ---- C. take the box trailer's run with a click
const O = offs.find(o => o.id === "kj"), cash0 = await ev("GS.cash"), mul = await ev("payMul()");
await clearToasts();
await ev(`$("tabS").querySelector('[data-act="rigrun:kj"]').click(); true`); await sleep(400);
{ const r = await run(), t = await tr("kj"), f = await freight(), ts = await toasts(); await still("rr_2_underway");
  ok(r && r.id === "kj" && r.to === O.to && r.pay === O.pay && r.kg === O.kg && t.cargoKg === O.kg, `taken: the run is in the save, ${O.kg} kg of ${O.cargo} on the box trailer`);
  ok(f.take.length === 1 && f.take[0] === "x=GIVE UP" && /UNDER WAY/i.test(f.txt) && ts.some(m => /Trailer run taken/.test(m)) && (await J("TLXRIG.offers()")).length === 0, "Freight shows it under way with GIVE UP; nothing else is posted while it is on");
  ok((await ev(`TLXRIG.take("lb")`)) === false, "a second run cannot be taken on top of it"); }
await tabOff();
await ev(`P.x = TLXRIG.list()[0].kx + 60; P.z = TLXRIG.list()[0].kz + 40; P.y = surf(P.x, P.z); FOOT.on = false; recenter(P.x, P.z, true); true`); await waitGame(0.5);
{ const r = await row(), h = await hud(), t = await tr("kj");
  ok(r && r.auto && Math.hypot(r.tgt.x - t.kx, r.tgt.z - t.kz) < 0.5 && /back the fifth wheel under its kingpin/.test(r.meta), `Jobs lists it: "${r && r.title}" · ${r && r.meta}`);
  ok(/Trailer run: the box trailer/.test(h.title) && /back the fifth wheel/.test(h.sub) && h.sub.includes(O.toName), `the compass follows it by itself: "${h.title}" / "${h.sub}"`); }

// ---- D. couple, legs up
await swap(tk.uid); await place("kj", 1.6, 0.02); await waitGame(0.6);
ok(await backUnder("kj", 25), "the tractor couples the loaded box trailer"); await sleep(300);
{ const h = await hud(); ok(/wind its legs up/.test(h.sub), `coupled, legs down: "${h.sub}"`); }
await clearToasts();
{ const lab = await useAtLegs("kj"), ts = await toasts(), tons = ((7200 + O.kg) / 1000).toFixed(1);
  ok(lab === "LEGS UP" && (await tr("kj")).legs === 0 && ts.some(m => m.includes(`${tons} t behind you`)), `use at the legs winds them up and says ${tons} t behind you`); }
await waitGame(0.5);
{ const m = await ev("TLXV.rt().mass"), h = await hud(), r = await row(), b = await J(`TLXRIG.bays().find(b => b.id === "${O.to}")`);
  ok(Math.abs(m - (7200 + 7200 + O.kg)) < 80, `the lorry weighs ${Math.round(m)} kg with the loaded trailer on (7.2 t + 7.2 t + ${(O.kg / 1000).toFixed(1)} t)`);
  ok(h.title.includes("→ " + O.toName) && /aboard/.test(h.sub) && h.sub.includes("$") && Math.hypot(r.tgt.x - b.x, r.tgt.z - b.z) < 0.5, `the compass turns to the far lay-by: "${h.title}" / "${h.sub}"`);
  await ev(`camState.init = false; true`); await waitGame(1.5); await still("rr_3_haul"); }

// ---- E. loaded on a hill
const runs = await J(`(() => { let hill = null, mid = null;
  for (const r of TLXR.routes) { if (!r.cum || r.closed) continue; const q = r.pts, cc = r.cum, n = q.length, far = k => Math.hypot(q[k][0] - depot.x, q[k][1] - depot.z) > TOWN_R + 60;
    const wet = (i, j) => { for (let k = i; k <= j; k++) if (isWater(q[k][0], q[k][1]) || isSea(q[k][0], q[k][1])) return true; return false; };
    for (let i = 0, j = 0; i < n; i++) { while (j < n - 1 && cc[j] - cc[i] < 80) j++; if (cc[j] - cc[i] < 80) break; if (!far(i) || !far(j) || wet(i, j)) continue;
      const g = (groundAt(q[j][0], q[j][1]) - groundAt(q[i][0], q[i][1])) / (cc[j] - cc[i]), up = g > 0, o = { id: r.id, i: up ? i : j, e: up ? j : i, dir: up ? 1 : -1, g: Math.abs(g) };
      if (!hill || o.g > hill.g) hill = o; if (o.g <= 0.09 && (!mid || o.g > mid.g)) mid = o; } }
  { const r = TLXR.routes.find(r => r.id === hill.id), cc = r.cum; let k = hill.i; while (k - hill.dir >= 0 && k - hill.dir < r.pts.length && Math.abs(cc[k] - cc[hill.i]) < 160) k -= hill.dir; hill.a = k; let e = hill.e; while (e + hill.dir >= 0 && e + hill.dir < r.pts.length && Math.abs(cc[e] - cc[hill.e]) < 60) e += hill.dir; hill.x = e; hill.len = Math.abs(cc[e] - cc[k]); }
  return { hill, mid }; })()`);
await ev(`TLXR.setPlowed && TLXR.setPlowed(null, 0); true`);
async function climb(Hh, secs, far, i0 = Hh.i, v0 = 0) {
  await rail(Hh.id, i0, Hh.dir, v0); await sleep(v0 ? 60 : 900); await clearToasts();
  const p0 = await spd(); await down("KeyW"); let last = p0, q = p0, d = 0, vmin = 99; const said = new Set();
  for (;;) { await sleep(300); q = await spd(); d += Math.hypot(q.x - last.x, q.z - last.z); last = q; vmin = Math.min(vmin, q.v); for (const m of await toasts()) said.add(m); if (q.t - p0.t >= secs || d > far) break; }
  await up("KeyW"); await railOff(); await sleep(300);
  const o = { id: Hh.id, g: +(Hh.g * 100).toFixed(1), d: +d.toFixed(1), v: q.v, vmin, t: +(q.t - p0.t).toFixed(1), said: [...said] }; console.log("climb", JSON.stringify(o)); return o;
}
{ const c = await climb(runs.mid, 14, 75);
  ok(runs.mid.g > 0.05 && c.d > 12 && c.v > 1.2, `loaded (${((14400 + O.kg) / 1000).toFixed(1)} t), a standing start on a ${c.g}% grade (${c.id}): ${c.d.toFixed(0)} m and ${c.v.toFixed(1)} m/s after ${c.t.toFixed(0)} s`); }
{ const c = await climb(runs.hill, 20, 60), steep = c.said.some(m => /Too steep to climb|more throttle|steep/i.test(m));
  ok(c.d > 12 ? c.v > 0.8 : steep, c.d > 12 ? `loaded, a standing start on the steepest 80 m of open road (${c.id}, ${c.g}%): ${c.d.toFixed(0)} m and ${c.v.toFixed(1)} m/s after ${c.t.toFixed(0)} s` : `loaded, a standing start on the steepest 80 m of open road (${c.id}, ${c.g}%) does not get away (${c.d.toFixed(1)} m) and the lorry says why`); }
{ const H = runs.hill, c = await climb(H, 40, H.len - 4, H.a, 12), over = c.d >= H.len - 6;
  ok(over && c.vmin > 0.5, over ? `loaded, taken at a run (12 m/s, 160 m before it) the rig is over the steepest stretch: never under ${c.vmin.toFixed(1)} m/s across ${c.d.toFixed(0)} m` : `loaded, taken at a run the rig stalls on the steepest stretch after ${c.d.toFixed(0)} of ${H.len.toFixed(0)} m`); }
ok((await tr("kj")).on === tk.uid && (await run()) !== null, "the trailer is still on and the run still open");

// ---- F. the far lay-by
const putInBay = (to, ahead = 8) => ev(`(() => { const h = TLXRIG.list().find(t => t.id === "${to}").home, b = TLXRIG.bays().find(b => b.id === "${to}"), fz = TLXV.rt().def.fifthZ, sy = Math.sin(h.yaw), cy = Math.cos(h.yaw);
  const fx = b.x + sy * ${ahead}, fzz = b.z + cy * ${ahead}; P.x = fx - sy * fz; P.z = fzz - cy * fz; P.yaw = h.yaw; P.vx = P.vz = P.vy = 0; P.yr = 0; P.y = surf(P.x, P.z); BOG.on = false; BOG.acc = 0; FOOT.on = false; FOOT.g.visible = false;
  const s = TLX.state("rig").t.kj, L = TLXRIG.list()[0].L; s.x = fx - sy * L; s.z = fzz - cy * L; s.yaw = h.yaw; recenter(P.x, P.z, true); camState.init = false; return 1; })()`);
await putInBay(O.to); await waitGame(0.8);
{ const t = await tr("kj"), h = await hud(), b = await J(`TLXRIG.bays().find(b => b.id === "${O.to}")`), dm = Math.hypot(t.x - b.x, t.z - b.z);
  console.log("in bay", JSON.stringify({ dm: +dm.toFixed(1), clear: t.clear, inBay: t.inBay, art: +t.art.toFixed(2), on: t.on }));
  ok(t.on === tk.uid && dm < 30 && t.clear && (await run()) !== null && (await ev("GS.cash")) === cash0 - 0, "in the far lay-by, still coupled: not delivered, not paid");
  ok(/uncouple at its legs/.test(h.sub), `the compass says what is left: "${h.sub}"`); }
await clearToasts();
{ const lab = await useAtLegs("kj"); await waitGame(0.5);
  const t = await tr("kj"), ts = await toasts(), cash = await ev("GS.cash"), want = Math.round(O.pay * mul * 1.1), st = await J(`TLX.state("rig")`);
  console.log("delivered", JSON.stringify({ lab, cash0, cash, want, mul, ts: ts.filter(m => /run|Legs/.test(m)) }));
  ok(lab === "UNCOUPLE" && t.on === null && t.legs === 1, "use at the legs uncouples it there");
  ok(st.run === null && st.done === 1 && cash - cash0 === want && ts.some(m => /Trailer run delivered to the/.test(m) && /clear of the road/.test(m)), `delivered: $${cash - cash0} paid ($${O.pay}${mul !== 1 ? " x" + mul + " polar night" : ""} + 10% for standing clear of the road)`);
  ok(t.cargoKg === 0 && t.inBay && !t.left && !t.tri, "the trailer is empty and, clear of the road in a lay-by, needs no warning triangle"); }
const offs2 = await J(`TLXRIG.offers()`);
{ const o = offs2.find(o => o.id === "kj"), h = await hud();
  ok(offs2.length === 3 && o && o.to !== O.to, `runs are posted again; the box trailer's next one starts from where it stands (to ${o && o.to})`);
  ok(!/Trailer run|lay-by/.test(h.title), `the compass is back to "${h.title}"`); }

// ---- G. stood on the road: paid without the bonus, triangle out
await ev(`P.x += Math.sin(P.yaw) * 30; P.z += Math.cos(P.yaw) * 30; true`);
{ const o = offs2.find(o => o.id === "lb"), c0 = await ev("GS.cash");
  ok(await ev(`TLXRIG.take("lb")`), `the tanker's run taken (${o.cargo} to ${o.to})`);
  await clearToasts();
  await ev(`(() => { const b = TLXRIG.bays().find(b => b.id === "${o.to}"), h = TLXRIG.list().find(t => t.id === "${o.to}").home, rt = TLXR.near(b.x, b.z).route; let best = null, bd = 1e9; for (const p of rt.pts) { const d = Math.hypot(p[0] - b.x, p[1] - b.z); if (d < bd) { bd = d; best = p; } }
    const s = TLX.state("rig").t.lb; s.x = best[0]; s.z = best[1]; s.yaw = h.yaw; s.on = null; s.legs = 1; return 1; })()`);
  await waitGame(0.6);
  const t = await tr("lb"), ts = await toasts(), c1 = await ev("GS.cash");
  ok((await run()) === null && c1 - c0 === Math.round(o.pay * mul) && ts.some(m => /would have paid 10% more/.test(m)), `a trailer stood on the road at the far lay-by is delivered for $${c1 - c0}, without the 10%`);
  ok(!t.clear && !t.inBay && t.left, "and, on the road, it is a trailer left standing (warning triangle)"); }

// ---- H. reload mid-run, then give up
const o3 = (await J(`TLXRIG.offers()`)).find(o => o.id === "mh");
ok(o3 && await ev(`TLXRIG.take("mh")`), `the curtainsider's run taken (${o3 && o3.cargo} to ${o3 && o3.to})`);
await ev(`save(); true`);
const saved = await J(`JSON.parse(localStorage.getItem("tracklayer.save.v2"))`);
await reload(); await sleep(700);
await ev(`tutSkip(); true`); await sleep(300); await setup(); await waitGame(0.6);
{ const r = await run(), t = await tr("mh"), jr = await row(), h = await hud(), kjT = await tr("kj");
  ok(r && r.id === "mh" && r.to === o3.to && r.pay === o3.pay && t.cargoKg === o3.kg && !(await ev("TLXRIG.err")), "after a reload the run is still on, its cargo still on the curtainsider");
  ok(jr && /Trailer run/.test(h.title), `Jobs and the compass have it again: "${h.title}"`);
  ok(kjT.inBay && !kjT.tri && (await ev(`TLX.state("rig").done`)) === 2, "the delivered box trailer still stands in the far lay-by; two runs done"); }
{ const c0 = await ev("GS.cash"); await freight(); await clearToasts();
  await ev(`$("tabS").querySelector('[data-act="rigrun:x"]').click(); true`); await sleep(400);
  const f = await freight(), ts = await toasts();
  ok((await run()) === null && (await ev("GS.cash")) === c0 && (await tr("mh")).cargoKg === 0 && ts.some(m => /Run given up/.test(m)), "GIVE UP ends the run for nothing: no pay, no charge, the trailer empty");
  ok(f.take.length === 3 && f.take.every(t => /=TAKE$/.test(t)), "and the runs are posted again"); }
await tabOff();

// ---- I. a save with a run for a trailer that does not exist
saved.x.sys.rig.s.run = { id: "zz", to: "kj", cargo: "ghosts", kg: 1000, m: 10, pay: 5 };
await reload(saved); await sleep(700);
await ev(`tutSkip(); true`); await sleep(300); await waitGame(0.5);
ok((await run()) === null && !(await ev("TLXRIG.err")) && (await J("TLXRIG.list()")).length === 3 && (await J("TLXRIG.list()")).every(t => t.cargoKg === 0), "a save whose run names an unknown trailer loads with no run and three empty trailers");

await done(fails ? 1 : 0);
