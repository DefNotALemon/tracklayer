// Beta break-it for 3.5b3a trailer runs, round 2: days passing mid-run, swapping to the pickup while coupled, give-up while coupled, then deliver.
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
const setup = () => ev(`crashCancel(); FOOT.on = false; GS.hour = 12; GS.storm = 0; WX.at = () => 0; TLX.setOn("traffic", false); GS.load = []; GS.claims = []; GS.apps.freight = 1; GS.signed.freight = true; GS.lic.freight = true; true`);
const freight = async () => { await ev(`TABLET.toggle(true, "freight"); TABLET.render(); true`); await sleep(350); return J(`(() => { const el = $("tabS"); return { txt: el.innerText || el.textContent, take: [...el.querySelectorAll('[data-act^="rigrun:"]')].map(b => b.dataset.act.split(":")[1] + "=" + b.textContent.trim()) }; })()`); };
const tabOff = async () => { await ev(`TABLET.open && TABLET.close(); true`); await sleep(250); };
const run = () => J(`TLXRIG.run()`);
const hud = () => J(`({ title: $("jobTitle").textContent, sub: $("jobSub").textContent })`);
await boot();
await ev(`tutSkip(); true`); await sleep(600);
await setup(); await ev(`GS.cash = 60000; TLXV.buy("pickup"); TLXV.buy("tractor"); true`); await sleep(500);
const tk = (await J(`TLX.state("vehicles").owned.map(r => ({ uid: r.uid, id: r.id }))`)).find(o => o.id === "tractor");
const O = (await J(`TLXRIG.offers()`)).find(o => o.id === "kj");
await ev(`TLXRIG.take("kj")`); await sleep(300);
await swap(tk.uid); await place("kj", 1.6, 0.02); await waitGame(0.6);
ok(await backUnder("kj", 25), "coupled to the loaded trailer");
await useAtLegs("kj"); await waitGame(0.5);
const m1 = await ev("TLXV.rt().mass");

const mass = () => ev("TLXV.rt().mass");
const err = () => ev("TLXRIG.err");
const m0 = await mass();
console.log("mass loaded", Math.round(m1), "cur", await J("TLXV.state().cur"));
// A. days pass
await ev(`GS.hour += 30; true`); await waitGame(2);
{ const r = await run(), t = await tr("kj"), f = await freight();
  console.log("A", JSON.stringify({ r: !!r, on: t.on, cargoKg: t.cargoKg, take: f.take, err: await err() }));
  ok(r && t.cargoKg === O.kg, "run and cargo survive 30 game hours");
  ok(/UNDER WAY/i.test(f.txt), "Freight shows the run UNDER WAY after a day"); await tabOff(); }
// B. swap to pickup while the trailer is coupled
const pk = (await J(`TLX.state("vehicles").owned.map(r => ({ uid: r.uid, id: r.id }))`)).find(o => o.id === "pickup");
await swap(pk.uid); await waitGame(1);
{ const t = await tr("kj"), h = await hud(), r = await run(), e = await err();
  console.log("B", JSON.stringify({ on: t.on, legs: t.legs, cargoKg: t.cargoKg, hud: h, run: !!r, err: e }));
  ok(!e, "no rig error after swapping to the pickup mid-run");
  ok(r && t.cargoKg === O.kg, "swapping away keeps the run and its cargo");
  ok(h.title && h.title.length > 0, "compass has a title with the pickup active: " + JSON.stringify(h));
  ok(!t.on || t.on === tk.uid, "trailer stays with the tractor (on=" + t.on + ")"); }
await swap(tk.uid); await waitGame(1);
{ const mm = await mass(); ok(Math.abs(mm - m1) < 120, `lorry mass back to ${Math.round(m1)} after swap-back (${Math.round(mm)})`); }
// C. give up while coupled
await clearToasts(); await tabOff();
await ev(`TLXRIG.giveUp(); true`); await waitGame(0.6);
{ const t = await tr("kj"), mm = await mass(), ts = await toasts();
  console.log("C", JSON.stringify({ cargoKg: t.cargoKg, on: t.on, mass: Math.round(mm), toasts: ts, err: await err() }));
  ok(t.cargoKg === 0 && mm < m1 - O.kg * 0.8, `give up drops cargo from the lorry (${Math.round(m1)} -> ${Math.round(mm)})`);
  ok(ts.some(x => /given up/i.test(x)), "give-up toast shown"); ok(!(await run()), "no run left");
  const f = await freight(); console.log("offers after", f.take.join(","));
  ok(f.take.length > 0, "Freight posts a run again after giving up"); await tabOff(); }
// D. retake and deliver: park trailer at bay (uncoupled, legs down) and check pay
await ev(`TLXRIG.take("kj")`); await waitGame(0.4);
const O2 = await run(); console.log("O2", JSON.stringify(O2));
const c1 = await ev("GS.cash");
await ev(`(() => { const T = TLXRIG.list().find(t => t.id === "kj"); const b = TLXRIG.bays().find(b => b.id === "${O2 ? O2.to : "kj"}"); const s = TLX.state("rig").t.kj; const L = T.L; s.on = null; s.legs = 1; s.x = b.x - Math.sin(b.yaw||0) * L/2; s.z = b.z - Math.cos(b.yaw||0) * L/2; return 1; })()`);
await waitGame(2.5);
{ const gain = (await ev("GS.cash")) - c1, ts = await toasts(), rr = await run();
  console.log("D", JSON.stringify({ gain, pay: O2 && O2.pay, run: !!rr, ts, err: await err() }));
  ok(gain > 0 && !rr, `delivered by placement: paid $${gain} of posted $${O2 && O2.pay}`);
  ok(!(await err()), "no rig error at the end"); }
await done(fails ? 1 : 0);
