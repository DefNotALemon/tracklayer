// Beta break-it for 3.5b3a trailer runs: reload while coupled mid-haul, delivering into an occupied lay-by, hostile run saves.
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
// ---- 1. reload mid-haul, coupled, legs up
await ev(`save(); true`);
const saved = await J(`JSON.parse(localStorage.getItem("tracklayer.save.v2"))`);
await reload(); await sleep(800); await ev(`tutSkip(); true`); await sleep(300); await setup(); await waitGame(0.8);
{ const r = await run(), t = await tr("kj"); const cur = await J(`TLXV.state().cur`);
  console.log("after reload", JSON.stringify({ run: !!r, on: t.on, legs: t.legs, cargo: t.cargoKg, cur, tk: tk.uid }));
  if (cur !== tk.uid) { await swap(tk.uid); await waitGame(0.5); }
  const m2 = await ev("TLXV.rt().mass"), h = await hud();
  ok(r && t.on === tk.uid && t.legs === 0 && t.cargoKg === O.kg, "reload mid-haul: run, coupling, legs up, cargo all kept");
  ok(Math.abs(m2 - m1) < 80, `lorry mass unchanged across the reload (${Math.round(m1)} -> ${Math.round(m2)})`);
  ok(/aboard/.test(h.sub), `compass still on the haul: "${h.title}" / "${h.sub}"`); }
// ---- 2. delivered into a lay-by where another trailer already stands
const to = O.to, other = await J(`TLXRIG.list().find(t => t.id === "${to}")`);
console.log("other trailer", JSON.stringify({ id: other.id, inBay: other.inBay, x: other.x, z: other.z }));
await ev(`(() => { const h = TLXRIG.list().find(t => t.id === "${to}").home, b = TLXRIG.bays().find(b => b.id === "${to}"), fz = TLXV.rt().def.fifthZ, sy = Math.sin(h.yaw), cy = Math.cos(h.yaw);
  const fx = b.x + sy * 2, fzz = b.z + cy * 2; P.x = fx - sy * fz; P.z = fzz - cy * fz; P.yaw = h.yaw; P.vx = P.vz = P.vy = 0; P.yr = 0; P.y = surf(P.x, P.z); FOOT.on = false;
  const s = TLX.state("rig").t.kj, L = TLXRIG.list()[0].L; s.x = fx - sy * L; s.z = fzz - cy * L; s.yaw = h.yaw; recenter(P.x, P.z, true); camState.init = false; return 1; })()`);
await waitGame(0.8);
{ const a = await tr("kj"), b = await tr(to), d = Math.hypot(a.x - b.x, a.z - b.z);
  console.log("two trailers", JSON.stringify({ d: +d.toFixed(2), aL: a.L, bInBay: b.inBay }));
  ok(d > 8, `trailer brought in beside a trailer already in the lay-by: ${d.toFixed(1)} m between their rear ends (a trailer is ~12 m, so < 8 m means they overlap)`); }
const c0 = await ev("GS.cash"); await useAtLegs("kj"); await waitGame(0.5);
console.log("paid", (await ev("GS.cash")) - c0);
// ---- 3. hostile saves
async function plant(run, label) {
  const s = JSON.parse(JSON.stringify(saved)); s.x.sys.rig.s.run = run; s.cash = 1000;
  await reload(s); await sleep(800); await ev(`tutSkip(); true`); await sleep(300); await waitGame(1);
  const r = await run_(), cash = await ev("GS.cash"), errs = await ev("TLXRIG.err");
  return { label, r, cash, errs };
}
const run_ = () => run();
{ const o = await plant({ id: "kj", to: "kj", cargo: "ghosts", kg: 1000, m: 10, pay: 5000 }, "to === id");
  console.log("to=id", JSON.stringify(o)); ok(!(o.cash > 1000 + 100), `run whose destination is its own trailer's bay does not pay out on load (cash ${o.cash})`); }
{ const o = await plant({ id: "kj", to: "lb", cargo: "bricks", kg: "3200", m: 2000, pay: 500 }, "kg string");
  const m = await J(`TLXRIG.list().find(t => t.id === "kj").cargoKg`); console.log("kg string", JSON.stringify({ run: o.r && o.r.kg, cargoKg: m, type: typeof m }));
  ok(o.r === null || typeof m === "number", `string kg either rejected or coerced: cargoKg is ${typeof m} (${m})`); }
{ const o = await plant({ id: "kj", to: "lb", cargo: "gold", kg: 1000, m: 2000, pay: 99999999 }, "huge pay");
  console.log("huge pay", JSON.stringify(o.r)); ok(o.r === null || o.r.pay < 100000, `a run paying $${o.r && o.r.pay} is kept as is (no cap)`); }
await done(fails ? 1 : 0);
