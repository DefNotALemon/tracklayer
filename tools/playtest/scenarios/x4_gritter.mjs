// Expansion slice 4.1c2: the gritter on the plow truck (tlx-plow.js GRT, tlx-vehicles.js TLXV.addGrip). Asserts, exit 1.
//   A the hopper: empty on a new truck, the Plow tab's fill row (by the kilo, what the cash covers, refused away from the
//     garage, "Full"), its weight on the truck.
//   B the control on keyboard, a pad and touch: a tap still drops/lifts the blade, a HOLD with the blade up starts and
//     stops the gritter, the hint names the control per scheme; an empty hopper refuses; a menu up: nothing.
//   C braking on a hard road before gritting (the baseline for E).
//   D spreading, DRIVEN with the keys: the hopper goes down by the metres, the 10 m lengths behind are stamped, the
//     lengths ahead and the snow beside the road are not, the hint names the road, the disc turns, grit flies.
//   E grip: the same stop on the gritted lengths is shorter; a pickup feels it too.
//   F it wears off with the hours and new snow buries it; on a stretch under deep snow it does not bite; off the road.
//   G the hopper runs empty: the spinner stops and says so.  H a reload, and a save from before this slice.  I stills.
// Headless runs ~0.6x: all by gameClock. ONLY=BCD... (A always).
import { boot, ev, sleep, done, down, up, tap, reload, shot, sideCam, camOff, padSet, padOff, send } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(120); }
const ONLY = process.env.ONLY, STILLS = !process.env.NOSTILLS;
const section = async (n, f) => { if (ONLY && n[0] !== "A" && !ONLY.includes(n[0])) return; console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80); return true; })()`);
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; TLXR.ROADS.plowAt = 2; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
const KIT = `(() => {
  window.__reset = () => { BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; crashCancel(); FOOT.on = false; P.vx = P.vy = P.vz = 0; const B = TLXPL.rt(TLXV.state().cur); B.last = null; B.carry = 0; };
  window.__put = (x, z, yaw) => { __reset(); P.x = x; P.z = z; P.yaw = yaw || 0; P.y = surf(x, z); recenter(x, z, true); camState.init = false; window.__t0 = [x, z, gameClock]; return true; };
  window.__rt = id => TLXR.routes.find(r => r.id === id);
  window.__lane = (id, s, dir, off) => { const r = __rt(id), c = r.cum, p = r.pts; s = Math.max(0, Math.min(r.len - 0.01, s)); let i = 1; while (i < c.length - 1 && c[i] < s) i++;
    const a = p[i - 1], b = p[i], L = c[i] - c[i - 1] || 1, t = (s - c[i - 1]) / L, tx = (b[0] - a[0]) / L * dir, tz = (b[1] - a[1]) / L * dir;
    return { x: a[0] + (b[0] - a[0]) * t - tz * off, z: a[1] + (b[1] - a[1]) * t + tx * off, yaw: Math.atan2(tx, tz) }; };
  window.__putR = (id, s, dir, off) => { const q = __lane(id, s, dir, off); return __put(q.x, q.z, q.yaw); };
  window.__steer = (id, dir, off, ahead) => { const n = TLXR.near(P.x, P.z), t = __lane(id, n.s + dir * ahead, dir, off); let e = Math.atan2(t.x - P.x, t.z - P.z) - P.yaw; while (e > Math.PI) e -= 2 * Math.PI; while (e < -Math.PI) e += 2 * Math.PI;
    return { e, s: n.s, d: n.d, rid: n.route && n.route.id, v: Math.hypot(P.vx, P.vz), bog: BOG.on }; };
  window.__stamp = (id, i, n) => { const s = TLX.state("plow"), k = id + ":" + i; if (!s.grit[k]) s.grit[k] = { h: new Array(40).fill(0), s0: __rt(id).st.s[i] }; for (let j = 0; j < n; j++) s.grit[k].h[j] = GS.hour; return true; };
  window.__gAt = (id, s) => { const q = __lane(id, s, 1, 0); return +TLXPL.gritAt(q.x, q.z).toFixed(3); };
  window.__grip = () => { const R = TLXV.runtimeOf(TLXV.state().cur); return R ? +R.grip.toFixed(3) : null; };
  return true; })()`;
const plowRows = () => J(`(() => { const out = []; VEH.tabs.find(t => t.id === "plow").render(document.createElement("div"), (n, d, p, c, f) => out.push({ n, d, p, c })); return out; })()`);
const seat = async u => { await ev(`TLXV.swapTo(${JSON.stringify(u)}); FOOT.on = false; true`); await sleep(600); };
const PS = "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)";

await boot();
await ev(SETUP); await sleep(600); await ev(KIT);

let uid = null, pk = null, RD = null;
await section("A the hopper", async () => {
  await ev(`GS.cash = 40000; GS.lic = GS.lic || {}; GS.lic.freight = true; TLXV.buy("plowtruck"); true`); await sleep(500);
  let s = await J(`(() => { const o = TLXV.state().owned, r = o[0], p = TLX.state("plow"), B = TLXPL.rt(r.uid); return { uid: r.uid, id: r.id, blade: p.blades[r.uid], hop: TLXPL.hopOf(r.uid), heap: !!B.heap && B.heap.visible, disc: !!B.disc, grit: p.grit, kg: p.gritKg }; })()`);
  uid = s.uid; console.log("  bought", JSON.stringify(s));
  ok(s.id === "plowtruck" && s.blade.hop === 0 && s.hop === 0 && s.heap === false && s.disc, "a new plow truck: the hopper is empty (no grit showing in it), the spinner's disc is on the truck");
  ok(s.grit && Object.keys(s.grit).length === 0 && s.kg === 0, "nothing gritted yet");
  const U = JSON.stringify(uid);
  await seat(uid);
  const m0 = await ev(`TLXV.runtimeOf(${U}).mass`);
  let rows = await plowRows(), f = rows.find(q => /^Fill the Nordtrekk Brøyt 4x2's hopper/.test(q.n));
  console.log("  fill row:", JSON.stringify(f && [f.n, f.p, f.c]), "|", f && f.d.replace(/<[^>]+>/g, "").slice(0, 330));
  ok(f && f.p === "$150" && f.c === "" && /holds 0 kg of its 3\.0 t/.test(f.d) && /hold E to start and stop the gritter/.test(f.d) && /\$50 a tonne/.test(f.d) && /7\.5 km/.test(f.d), "the Plow tab offers to fill it: $150 for 3 t, $50 a tonne, and says how the gritter is worked");
  await ev(`GS.cash = 60; true`); await clearToasts(); const r1 = await ev(`TLXPL.fill(${U})`); await sleep(200);
  s = await J(`({ hop: TLXPL.hopOf(${U}), cash: GS.cash })`); let t = await toasts();
  ok(r1 === true && s.hop === 1200 && s.cash === 0 && t.some(m => /\$60 of grit: the hopper holds 1\.2 t of its 3\.0 t/.test(m)), "$60 buys 1.2 t: " + JSON.stringify(t));
  rows = await plowRows(); f = rows.find(q => /^Fill the/.test(q.n));
  ok(f && f.p === "$90" && f.c === "locked", "with no cash the row is locked, the rest priced at $90");
  // away from the garage
  await ev(`GS.cash = 5000; window.__home = [P.x, P.z, P.yaw]; P.x += 300; true`); await clearToasts(); const r2 = await ev(`TLXPL.fill(${U})`); await sleep(200); t = await toasts();
  ok(r2 === false && (await ev(`TLXPL.hopOf(${U})`)) === 1200 && (await ev("GS.cash")) === 5000 && t.some(m => /within 60 m of the garage to fill its hopper/.test(m)), "300 m from the garage: not filled, not charged, told why");
  await ev(`P.x = __home[0]; P.z = __home[1]; true`); await clearToasts(); const r3 = await ev(`TLXPL.fill(${U})`); await sleep(300);
  s = await J(`({ hop: TLXPL.hopOf(${U}), cash: GS.cash, heap: TLXPL.rt(${U}).heap.visible })`); t = await toasts();
  ok(r3 === true && s.hop === 3000 && s.cash === 5000 - 90 && t.some(m => /The hopper is full: 3\.0 t of grit \(\$90\)/.test(m)), "back at the garage the rest goes in for $90: " + JSON.stringify(t.slice(-1)));
  rows = await plowRows(); f = rows.find(q => /^Fill the/.test(q.n));
  ok(f && f.p === "Full" && f.c === "locked" && (await ev(`TLXPL.fill(${U})`)) === false && (await ev("GS.cash")) === 5000 - 90, "full: the row reads Full and takes no more money");
  await waitGame(0.6);
  const m1 = await ev(`TLXV.runtimeOf(${U}).mass`), hv = await ev(`TLXPL.rt(${U}).heap.visible`);
  ok(Math.abs(m1 - m0 - 3000) < 1 && hv, `the grit rides on the truck: ${Math.round(m0)} kg -> ${Math.round(m1)} kg, and shows heaped in the hopper`);
  await ev(`GS.cash = 30000; TLXV.buy("pickup"); true`); await sleep(400); pk = await ev(`TLXV.state().owned[1].uid`);
  ok((await ev(`TLXPL.fill(${JSON.stringify(pk)})`)) === false && !(await plowRows()).some(q => /Fill the Fjellvogn/.test(q.n)), "a pickup has no hopper to fill");
  // a straight, open, hard road stretch
  await ev(`TLXR.setPlowed(null, 30); true`); await sleep(300);
  RD = await J(`(() => { const SEG = TLXR.ROADS.seg, out = [];
    for (const def of TLXR.ROADS.routes) { if (def.convoy || def.closed) continue; const r = __rt(def.id); if (!r || !r.st) continue;
      for (let i = 1; i < r.seg.length - 1; i++) { if (!r.seg[i - 1].legs.length || !r.seg[i].legs.length || !r.seg[i + 1].legs.length || (i + 1) * SEG + 40 > r.len) continue;
        let turn = 0, y0 = null, bad = false; for (let s = i * SEG - 40; s <= (i + 1) * SEG + 40; s += 8) { const q = __lane(def.id, s, 1, 0); if (y0 !== null) { let e = q.yaw - y0; while (e > Math.PI) e -= 2 * Math.PI; while (e < -Math.PI) e += 2 * Math.PI; turn = Math.max(turn, Math.abs(e)); } y0 = q.yaw; const n = TLXR.near(q.x, q.z); if (n.route !== r || Math.abs(n.s - s) > 3) bad = true; }
        const a = __lane(def.id, i * SEG + 20, 1, 0), b = __lane(def.id, i * SEG + 220, 1, 0), gr = Math.abs(groundAt(a.x, a.z) - groundAt(b.x, b.z)) / 200;
        if (!bad) out.push({ id: def.id, name: r.name, i, turn: +turn.toFixed(3), gr: +gr.toFixed(3), sc: turn + gr * 4 }); } }
    out.sort((a, b) => a.sc - b.sc); return out[0] || null; })()`);
  console.log("  stretch", JSON.stringify(RD));
  ok(!!RD, "a straight road stretch to work on");
});
if (!uid || !pk || !RD) await done(1);
const U = JSON.stringify(uid), PK = JSON.stringify(pk), ID = JSON.stringify(RD.id), SEG = 400, S0 = RD.i * SEG;
const B = () => J(`(() => { const b = TLXPL.rt(${U}); return { down: b.down, grit: !!b.grit, hop: Math.round(TLXPL.hopOf(${U})), hint: TLXPL.hint(), shown: WN.show ? WN.hint : "", dev: INP.dev, pill: $("tcE").hidden ? null : $("tcE").textContent, note: b.gNote || "" }; })()`);

await section("B the control on three schemes", async () => {
  await seat(uid); await ev(`__putR(${ID}, ${S0 + 30}, 1, 0); TLXPL.rt(${U}).down = false; TLXPL.rt(${U}).grit = false; true`); await waitGame(1);
  let s = await B();
  ok(!s.down && !s.grit && /hold E: gritter on · 3\.0 t of grit$/.test(s.hint) && s.shown.includes("hold E: gritter on"), "standing on a hard road, blade up, the hint offers the hold: " + s.shown);
  await tap("KeyE"); await waitGame(0.8); s = await B();
  ok(s.down && !s.grit, "a tap of E still drops the blade (and starts no gritter)");
  await tap("KeyE"); await waitGame(0.8); s = await B();
  ok(!s.down && !s.grit, "a tap again lifts it");
  await clearToasts(); await down("KeyE"); await sleep(750); const mid = await B(); await up("KeyE"); await waitGame(0.7); s = await B(); let t = await toasts();
  ok(mid.grit && !mid.down && s.grit && !s.down && t.some(m => /The gritter is on: it spreads behind the truck while it rolls\. 3\.0 t in the hopper/.test(m)), "E HELD with the blade up starts the gritter and the blade stays up: " + JSON.stringify(t));
  ok(/GRITTING · 3\.0 t in the hopper · it spreads once the truck rolls · hold E: gritter off$/.test(s.hint) && s.hop === 3000, "standing still nothing comes out, and the hint says so: " + s.hint);
  await tap("KeyE"); await waitGame(0.8); s = await B();
  ok(s.down && s.grit && /^BLADE DOWN/.test(s.hint) && /GRITTING · 3\.0 t in the hopper/.test(s.hint) && !/gritter off/.test(s.hint), "with it running a tap drops the blade and the gritter runs on: " + s.hint);
  await down("KeyE"); await sleep(750); await up("KeyE"); await waitGame(0.5); s = await B();
  ok(s.down && s.grit && (await ev(`TLXPL.throwOf(${U})`)) === "l", "blade down, the hold slews the blade as before and leaves the gritter alone");
  await ev(`TLX.state("plow").blades[${U}].throw = "r"; true`); await tap("KeyE"); await waitGame(0.8);
  await clearToasts(); await down("KeyE"); await sleep(750); await up("KeyE"); await waitGame(0.5); s = await B(); t = await toasts();
  ok(!s.grit && !s.down && t.some(m => m === "The gritter is off."), "blade up again, the hold stops it");
  // a menu up: nothing
  await ev(`$("settings").hidden = false; true`); await down("KeyE"); await sleep(750); await up("KeyE"); await sleep(300); s = await B();
  ok(!s.grit && !s.down, "under Settings a held press starts nothing and drops nothing"); await ev(`$("settings").hidden = true; true`); await sleep(200);
  // pads
  for (const [name, id] of [["Xbox", undefined], ["DualSense", PS]]) {
    await padSet({ 10: 1 }, [0, 0, 0, 0], id); await sleep(750); await padSet({}, [0, 0, 0, 0], id); await waitGame(0.6); s = await B();
    ok(s.grit && !s.down && s.dev === "pad" && /hold L3: gritter off/.test(s.hint), `${name}: L3 held starts it, the hint names L3: ` + s.hint);
    await padSet({ 10: 1 }, [0, 0, 0, 0], id); await sleep(750); await padSet({}, [0, 0, 0, 0], id); await waitGame(0.6); s = await B();
    ok(!s.grit && !s.down && /hold L3: gritter on · 3\.0 t of grit$/.test(s.hint), `${name}: L3 held again stops it`);
    await padSet({ 10: 1 }, [0, 0, 0, 0], id); await sleep(180); await padSet({}, [0, 0, 0, 0], id); await waitGame(0.8); s = await B();
    ok(s.down && !s.grit, `${name}: a tap of L3 drops the blade`);
    await padSet({ 10: 1 }, [0, 0, 0, 0], id); await sleep(180); await padSet({}, [0, 0, 0, 0], id); await waitGame(0.8);
  }
  await padOff(); await sleep(200);
  // touch
  await send("Emulation.setTouchEmulationEnabled", { enabled: true });
  await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 640, y: 200 }] }); await sleep(100);
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(200);
  await ev(`SET.touch = "on"; setTouchUI(); true`); await sleep(600); s = await B();
  ok(s.dev === "touch" && s.pill === "BLADE DOWN" && /hold BLADE DOWN: gritter on · 3\.0 t of grit$/.test(s.hint), "touch: the hint says hold BLADE DOWN: " + s.hint);
  const press = async ms => { await ev(`$("tcE").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 5, pointerType: "touch" })); true`); await sleep(ms); await ev(`$("tcE").dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 5, pointerType: "touch" })); true`); };
  await press(750); await waitGame(0.6); s = await B();
  ok(s.grit && !s.down && /hold BLADE DOWN: gritter off/.test(s.hint), "touch: the pill held starts it: " + s.hint);
  await press(180); await waitGame(0.8); s = await B();
  ok(s.down && s.grit && s.pill === "BLADE UP", "touch: a tap drops the blade");
  await press(180); await waitGame(0.8); await press(750); await waitGame(0.6); s = await B();
  ok(!s.down && !s.grit, "touch: tap to lift, hold to stop");
  const rowT = (await plowRows()).find(q => /^Fill the/.test(q.n));
  ok(rowT && /hold the BLADE DOWN button to start and stop the gritter/.test(rowT.d), "touch: the Plow tab names the button, not a key");
  await ev(`SET.touch = "auto"; setTouchUI(); true`); await send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await tap("KeyH"); await sleep(150); await tap("KeyH"); await sleep(200);
  // empty hopper
  await ev(`TLX.state("plow").blades[${U}].hop = 0; true`); await clearToasts(); await down("KeyE"); await sleep(750); await up("KeyE"); await waitGame(0.5); s = await B(); t = await toasts();
  ok(!s.grit && !s.down && !/grit/i.test(s.hint) && t.some(m => /The hopper is empty\. The garage's Plow tab fills it: \$50 a tonne/.test(m)), "an empty hopper: the hold starts nothing and says where grit comes from");
});

async function brake(u, s, v0) {                                                 // metres to stop from v0 on the road at s, the brake held
  await seat(u); await ev(`__putR(${ID}, ${s}, 1, 0); TLXPL.rt(${U}).down = false; TLXPL.rt(${U}).grit = false; true`); await waitGame(0.8);
  await ev(`(() => { P.vx = Math.sin(P.yaw) * ${v0}; P.vz = Math.cos(P.yaw) * ${v0}; window.__b = { x: P.x, z: P.z, d: 0, on: true, g: [], mu: [] };
    const f = () => { const b = window.__b; if (!b.on) return; const vf = P.vx * Math.sin(P.yaw) + P.vz * Math.cos(P.yaw); if (vf < 0.4) { b.on = false; return; } b.d = Math.hypot(P.x - b.x, P.z - b.z); b.g.push(__grip()); requestAnimationFrame(f); }; requestAnimationFrame(f); return true; })()`);
  await down("KeyS"); for (let k = 0; k < 120 && await ev("window.__b.on"); k++) await sleep(60); await up("KeyS");
  const r = await J(`({ d: +window.__b.d.toFixed(2), g: window.__b.g.length ? +(window.__b.g.reduce((a, b) => a + b, 0) / window.__b.g.length).toFixed(3) : 0 })`); await ev(`P.vx = P.vz = 0; true`); return r;
}
let base = null, basePk = null;
await section("C braking on the hard road, before", async () => {
  await ev(`TLX.state("plow").blades[${U}].hop = 300; true`);
  base = await brake(uid, S0 + 40, 14); basePk = await brake(pk, S0 + 40, 12);
  console.log("  plow truck 14 m/s ->", JSON.stringify(base), "| pickup 12 m/s ->", JSON.stringify(basePk));
  ok(base.d > 12 && base.d < 60 && base.g === 1 && basePk.g === 1, `ungritted: the plow truck stops from 50 km/h in ${base.d} m, grip factor ${base.g}`);
});

async function drive(id, dir, off, secs, vmax, stop) {
  const t0 = await clock(); let steerKey = null, gas = false, last = null, maxD = 0, n = 0, still = 0;
  try {
    while ((await clock()) - t0 < secs) {
      const s = last = await J(`__steer(${JSON.stringify(id)}, ${dir}, ${off}, 14)`); n++; maxD = Math.max(maxD, s.d);
      const wantGas = s.v < vmax; if (wantGas !== gas) { if (wantGas) await down("KeyW"); else await up("KeyW"); gas = wantGas; }
      const want = s.e > 0.04 ? "KeyA" : s.e < -0.04 ? "KeyD" : null;
      if (want !== steerKey) { if (steerKey) await up(steerKey); if (want) await down(want); steerKey = want; }
      if (await stop(s)) break;
      still = s.v < 0.3 && n > 30 ? still + 1 : 0; if (still > 60) break;
      await sleep(90);
    }
  } finally { if (steerKey) await up(steerKey); await up("KeyW"); }
  return { t: +((await clock()) - t0).toFixed(1), s: +last.s.toFixed(1), maxD: +maxD.toFixed(1), stopped: still > 60 };
}

await section("D spreading, driven", async () => {
  await seat(uid); await ev(`TLX.state("plow").blades[${U}].hop = 300; TLX.state("plow").gritKg = 0; __putR(${ID}, ${S0 + 12}, 1, 0); TLXPL.rt(${U}).down = false; TLXPL.rt(${U}).grit = false; TLXPL.rt(${U}).gKg = 0; mkLive = 0; true`); await waitGame(0.8);
  const d0 = await ev(`TLXPL.rt(${U}).disc.rotation.y`);
  await down("KeyE"); await sleep(750); await up("KeyE"); await sleep(250);
  ok((await B()).grit, "the gritter is started with the control");
  let mid = null;
  const r = await drive(RD.id, 1, 0, 90, 8, async s => { if (!mid && s.s > S0 + 90) mid = await J(`({ hint: TLXPL.hint(), shown: WN.show ? WN.hint : "", muck: mkLive > 0 })`); return s.s > S0 + 172; });
  await waitGame(1.5);
  const a = await J(`(() => { const p = TLX.state("plow"), g = p.grit[${ID} + ":" + ${RD.i}], b = TLXPL.rt(${U}), n = TLXR.near(P.x, P.z); return { hop: +TLXPL.hopOf(${U}).toFixed(1), kg: +p.gritKg.toFixed(1), s: +n.s.toFixed(1), h: g ? g.h.map(x => (x > 0 ? 1 : 0)).join("") : null, s0: g && g.s0, disc: +b.disc.rotation.y.toFixed(1), spot: TLXPL.gritSpot(P.x - Math.sin(P.yaw) * 8, P.z - Math.cos(P.yaw) * 8) }; })()`);
  console.log("  drive", JSON.stringify(r), JSON.stringify(a), "|", mid && mid.shown);
  const rolled = a.s - (S0 + 12), want = rolled * 0.4;
  ok(!r.stopped && r.maxD < 3.2 && rolled > 150, `driven ${rolled.toFixed(0)} m along the ${RD.name} with the keys (${r.maxD} m off its line at most)`);
  ok(Math.abs(a.kg - want) / want < 0.15 && Math.abs(300 - a.hop - a.kg) < 0.5, `the hopper went down by ${a.kg} kg over those metres (0.4 kg a metre: ${want.toFixed(0)} kg), 300 -> ${a.hop} kg`);
  const ones = a.h ? (a.h.match(/1/g) || []).length : 0, firstB = Math.floor((12 - 3.4 + 12) / 10), lastB = Math.floor((a.s - S0 - 3.4) / 10);
  ok(a.h && ones >= lastB - firstB - 1 && ones <= lastB + 1 && /^0?1+0+$/.test(a.h), `the 10 m lengths behind it are stamped, the ones ahead are not: ${a.h} (${ones} of ${a.h && a.h.length})`);
  const g = await J(`({ behind: __gAt(${ID}, ${S0 + 100}), ahead: __gAt(${ID}, ${S0 + 300}), beside: (() => { const q = __lane(${ID}, ${S0 + 100}, 1, 9); return TLXPL.gritAt(q.x, q.z); })(), other: __gAt(${ID}, ${S0 + 500}) })`);
  ok(g.behind === 1 && g.ahead === 0 && g.beside === 0 && g.other === 0, "grit is where it was laid and nowhere else: " + JSON.stringify(g));
  ok(mid && /GRITTING · \d+ kg in the hopper · /.test(mid.hint) && mid.hint.includes(RD.name) && /\d+% of this stretch gritted · hold E: gritter off/.test(mid.hint) && mid.shown.includes("GRITTING"), "rolling, the hint names the road and the share gritted: " + (mid && mid.hint));
  ok(mid && mid.muck && a.disc - d0 > 20, `grit flies off the spinner and its disc turns (${(a.disc - d0).toFixed(0)} rad)`);
  ok(a.spot && Math.abs(a.spot.k - ones / a.spot.n) < 0.06, `the stretch reads ${Math.round((a.spot ? a.spot.k : 0) * 100)}% gritted`);
  if (STILLS) {
    await ev(`__putR(${ID}, ${S0 + 60}, 1, 0); TLXPL.rt(${U}).grit = true; TLX.state("plow").blades[${U}].hop = 3000; true`); await waitGame(0.5);
    await down("KeyW"); await waitGame(4.5);
    await sideCam(); await ev(`window.camOv = c => { const yaw = P.yaw + Math.PI - 0.5, tx = P.x - Math.sin(P.yaw) * 3, tz = P.z - Math.cos(P.yaw) * 3; c.position.set(tx + Math.sin(yaw) * 9, P.y + 3.4, tz + Math.cos(yaw) * 9); c.lookAt(tx, P.y + 1.0, tz); }; true`); await sleep(500); await shot("d1_gritting_rear34");
    await ev(`window.camOv = c => { const yaw = P.yaw + Math.PI, tx = P.x - Math.sin(P.yaw) * 4, tz = P.z - Math.cos(P.yaw) * 4; c.position.set(tx + Math.sin(yaw) * 6, P.y + 1.6, tz + Math.cos(yaw) * 6); c.lookAt(tx, P.y + 0.7, tz); }; true`); await sleep(500); await shot("d2_gritting_behind_low");
    await up("KeyW"); await camOff(); await ev(`TLXPL.rt(${U}).grit = false; TLX.state("plow").blades[${U}].hop = 300; P.vx = P.vz = 0; true`); await waitGame(0.5);
  }
  await ev(`TLXPL.rt(${U}).grit = false; true`);
});

await section("E grip on the gritted lengths", async () => {
  if (!base) { ok(false, "no baseline (run C)"); return; }
  await ev(`TLX.state("plow").blades[${U}].hop = 300; __stamp(${ID}, ${RD.i}, 18); true`);   // the still drive in D may have restamped some: all of 0-180 m, now
  const a = await brake(uid, S0 + 40, 14), p = await brake(pk, S0 + 40, 12);
  console.log("  plow truck 14 m/s ->", JSON.stringify(a), "| pickup 12 m/s ->", JSON.stringify(p));
  ok(a.g > 1.3 && a.g <= 1.351, `on grit the tyres' grip is up by a third (factor ${a.g})`);
  ok(a.d < base.d * 0.93, `the plow truck stops from 50 km/h in ${a.d} m against ${base.d} m before (${Math.round((1 - a.d / base.d) * 100)}% shorter)`);
  ok(p.g > 1.3 && p.d < basePk.d * 0.95, `a pickup feels it too: ${p.d} m against ${basePk.d} m from 43 km/h`);
});

await section("F it wears off, is buried, and needs a hard road", async () => {
  await seat(uid);
  const h0 = await ev("GS.hour");
  await ev(`__stamp(${ID}, ${RD.i}, 18); true`);
  const now = await ev(`__gAt(${ID}, ${S0 + 100})`);
  await ev(`GS.hour = ${h0} + 5; true`); const at5 = await ev(`__gAt(${ID}, ${S0 + 100})`);
  await ev(`GS.hour = ${h0} + 8; true`); const at8 = await ev(`__gAt(${ID}, ${S0 + 100})`);
  await ev(`GS.hour = ${h0} + 10.5; true`); const at10 = await ev(`__gAt(${ID}, ${S0 + 100})`);
  ok(now === 1 && at5 === 1 && at8 > 0.2 && at8 < 0.8 && at10 === 0, `full for 6 hours, fading after (${at8} at 8 h), gone by 10: ${[now, at5, at8, at10].join(" ")}`);
  await ev(`GS.hour = ${h0}; true`);
  const sn0 = await ev(`__rt(${ID}).st.s[${RD.i}]`);
  await ev(`TLXR.setSnow(${ID}, ${sn0} + 0.06, ${RD.i}); true`); const half = await ev(`__gAt(${ID}, ${S0 + 100})`);
  await ev(`TLXR.setSnow(${ID}, ${sn0} + 0.12, ${RD.i}); true`); const bur = await ev(`__gAt(${ID}, ${S0 + 100})`);
  ok(half > 0.1 && half < 0.9 && bur === 0, `new snow buries it: ${half} with 6 points of new snow on the stretch, ${bur} with 12`);
  // a stretch under deep snow, blade up: it goes on the snow
  // (the ten tonnes sink and stop within metres, blade up: what the gritter said while it still rolled is recorded per frame)
  const rec = () => ev(`(() => { window.__gn = { on: true, notes: [], hints: [] }; const f = () => { const g = window.__gn; if (!g.on) return; const b = TLXPL.rt(${U}); if (b.grit && b.gNote !== "still" && !g.notes.includes(b.gNote)) { g.notes.push(b.gNote); g.hints.push(TLXPL.hint()); } requestAnimationFrame(f); }; requestAnimationFrame(f); return true; })()`);
  const recEnd = () => J(`(() => { const g = window.__gn; g.on = false; return { notes: g.notes, hints: g.hints }; })()`);
  await ev(`TLXR.setSnow(${ID}, 0.6, ${RD.i + 1}); TLX.state("plow").blades[${U}].hop = 300; __putR(${ID}, ${S0 + SEG + 30}, 1, 0); TLXPL.rt(${U}).down = false; TLXPL.rt(${U}).grit = true; true`); await waitGame(0.6);
  await rec(); await ev(`P.vx = Math.sin(P.yaw) * 6; P.vz = Math.cos(P.yaw) * 6; true`); await down("KeyW"); await waitGame(1.2); await up("KeyW"); let n = await recEnd();
  const deep = await J(`({ g: TLX.state("plow").grit[${ID} + ":" + ${RD.i + 1}] || null, hop: TLXPL.hopOf(${U}) })`);
  console.log("  deep", JSON.stringify(n), JSON.stringify(deep));
  ok(n.notes.length === 1 && n.notes[0] === "deep" && /too deep for grit to bite: plow it first/.test(n.hints[0]) && deep.g === null && deep.hop < 300, "on a stretch under 60 points of snow, blade up: the grit is spent, nothing is stamped, the hint says plow first");
  // the same stretch with the blade DOWN and cutting: the grit lands on the cut lane behind it and counts
  await ev(`__putR(${ID}, ${S0 + SEG + 30}, 1, 0); TLXPL.rt(${U}).down = true; TLXPL.rt(${U}).k = 1; TLXPL.rt(${U}).grit = true; true`); await waitGame(0.6);
  await rec(); await down("KeyW"); await waitGame(6); await up("KeyW"); n = await recEnd();
  const cutg = await J(`(() => { const g = TLX.state("plow").grit[${ID} + ":" + ${RD.i + 1}]; return { h: g ? g.h.filter(x => x > 0).length : 0, s0: g && g.s0, mv: +Math.hypot(P.x - __t0[0], P.z - __t0[1]).toFixed(1) }; })()`);
  console.log("  deep, blade down", JSON.stringify(n.notes), JSON.stringify(cutg));
  ok(n.notes.includes("") && cutg.h >= 1 && cutg.mv > 10, `blade down and cutting through it (${cutg.mv} m), the grit goes on the lane it has just cut: ${cutg.h} lengths stamped`);
  await ev(`TLXPL.rt(${U}).down = false; TLXPL.rt(${U}).grit = false; delete TLX.state("plow").grit[${ID} + ":" + ${RD.i + 1}]; P.vx = P.vz = 0; true`); let s = null;
  await ev(`TLXR.setSnow(${ID}, 0, ${RD.i + 1}); TLXR.setSnow(${ID}, ${sn0}, ${RD.i}); true`);
  // off the road
  await ev(`(() => { const q = __lane(${ID}, ${S0 + 100}, 1, 14); __put(q.x, q.z, q.yaw); TLXPL.rt(${U}).grit = true; return true; })()`); await waitGame(0.5);
  await rec(); await ev(`P.vx = Math.sin(P.yaw) * 6; P.vz = Math.cos(P.yaw) * 6; true`); await down("KeyW"); await waitGame(1); await up("KeyW"); n = await recEnd();
  ok(n.notes.length === 1 && n.notes[0] === "off" && /off the road: it is going on the snow/.test(n.hints[0]), "14 m off the road the hint says it is going on the snow: " + n.hints[0]);
  await ev(`TLXPL.rt(${U}).grit = false; P.vx = P.vz = 0; true`);
});

await section("G the hopper runs empty", async () => {
  await seat(uid); await ev(`TLX.state("plow").blades[${U}].hop = 6; __putR(${ID}, ${S0 + 200}, 1, 0); TLXPL.rt(${U}).down = false; TLXPL.rt(${U}).grit = true; true`); await waitGame(0.6); await clearToasts();
  const r = await drive(RD.id, 1, 0, 30, 6, async () => !(await ev(`TLXPL.rt(${U}).grit`)));
  await waitGame(0.4); const s = await J(`({ grit: !!TLXPL.rt(${U}).grit, hop: TLXPL.hopOf(${U}), heap: TLXPL.rt(${U}).heap.visible, hint: TLXPL.hint() })`), t = await toasts();
  console.log("  empty", JSON.stringify(r), JSON.stringify(s), JSON.stringify(t));
  ok(!s.grit && s.hop === 0 && !s.heap && t.some(m => /The hopper is empty: the spinner has stopped/.test(m)) && !/GRITTING/.test(s.hint), `6 kg lasted ${(r.s - S0 - 200).toFixed(0)} m: the spinner stops, says so, and the hopper shows empty`);
});

await section("H a reload, and an older save", async () => {
  await seat(uid);
  await ev(`__putR(${ID}, ${S0 + 200}, 1, 0); TLXPL.rt(${U}).grit = false; true`); await waitGame(0.5);
  await ev(`(() => { const p = TLX.state("plow"); p.blades[${U}].hop = 1234.5; __stamp(${ID}, ${RD.i}, 18); P.vx = P.vz = 0; save(); TLXPL.rt(${U}).grit = true; return true; })()`); await sleep(200);
  const before = await J(`({ a: __gAt(${ID}, ${S0 + 100}), kg: TLX.state("plow").gritKg, hour: GS.hour })`);
  await reload(); await ev(SETUP.replace("GS.hour = 12; ", "")); await sleep(500); await ev(KIT);
  let s = await J(`(() => { const p = TLX.state("plow"), b = TLXPL.rt(${U}); return { hop: TLXPL.hopOf(${U}), grit: !!b.grit, a: __gAt(${ID}, ${S0 + 100}), ahead: __gAt(${ID}, ${S0 + 300}), kg: p.gritKg, keys: Object.keys(p.grit), heap: !!b.heap && b.heap.visible, hour: GS.hour }; })()`);
  console.log("  reloaded", JSON.stringify(s), "before", JSON.stringify(before));
  ok(Math.abs(s.hop - 1234.5) < 0.01 && s.heap && Math.abs(s.kg - before.kg) < 0.01, "reload: the hopper's 1,234.5 kg and the total spread are saved");
  ok(s.a === before.a && s.a > 0.9 && s.ahead === 0 && s.keys.includes(RD.id + ":" + RD.i), "the gritted lengths are saved with the road: " + JSON.stringify(s.keys));
  ok(s.grit === false, "the spinner is off after a reload");
  s = await J(`(() => { const p = TLX.state("plow"); delete p.blades[${U}].hop; delete p.grit; delete p.gritKg; p.blades[${PK}] = { id: "b23", cond: 80, throw: "r", hop: 500 }; TLXPL.tidy(); return { hop: p.blades[${U}].hop, grit: p.grit, kg: p.gritKg, pk: p.blades[${PK}] }; })()`);
  ok(s.hop === 0 && s.grit && Object.keys(s.grit).length === 0 && s.kg === 0 && s.pk && s.pk.hop === undefined, "a save from before the gritter: an empty hopper, nothing gritted, and a pickup's blade has no hopper");
  s = await J(`(() => { const p = TLX.state("plow"); p.grit["x:1"] = { h: [GS.hour - 30, 0], s0: 0 }; p.grit["y:2"] = "junk"; p.grit["z:3"] = { h: [GS.hour - 1], s0: 0 }; TLXPL.tidy(); return Object.keys(p.grit); })()`);
  ok(s.length === 1 && s[0] === "z:3", "grit long worn off (and junk) is dropped from the save: " + JSON.stringify(s));
  await ev(`delete TLX.state("plow").grit["z:3"]; delete TLX.state("plow").blades[${PK}]; true`);
});

await section("I stills", async () => {
  if (!STILLS) return;
  await seat(uid); await ev(`GS.hour = 12; __putR(${ID}, ${S0 + 60}, 1, 0); TLXPL.rt(${U}).down = false; TLX.state("plow").blades[${U}].hop = 3000; true`); await waitGame(1.2);
  const vcam = async (yawOff, dist, h, ty = 1.4, fwd = 1.4) => { await sideCam(); await ev(`window.camOv = c => { const yaw = P.yaw + ${yawOff}, tx = P.x + Math.sin(P.yaw) * ${fwd}, tz = P.z + Math.cos(P.yaw) * ${fwd}; c.position.set(tx + Math.sin(yaw) * ${dist}, P.y + ${ty} + ${h}, tz + Math.cos(yaw) * ${dist}); c.lookAt(tx, P.y + ${ty}, tz); }; true`); await sleep(400); };
  await vcam(Math.PI - 0.6, 9, 3.6, 1.8, -1.5); await shot("i1_hopper_full");
  await ev(`TLX.state("plow").blades[${U}].hop = 900; TLXPL.rt(${U}).grit = true; true`); await waitGame(0.3); await ev(`TLXPL.rt(${U}).grit = false; true`); await sleep(300); await shot("i2_hopper_third");
  await ev(`TLX.state("plow").blades[${U}].hop = 0; TLXPL.rt(${U}).grit = true; true`); await waitGame(0.3); await sleep(300); await shot("i3_hopper_empty");
  await vcam(Math.PI + 0.25, 4.2, 0.2, 0.8, -3.2); await shot("i4_spinner_close");
  await camOff();
});

console.log(fails ? `${fails} FAILED` : "ALL PASSED");
await done(fails ? 1 : 0);
