// Beta test 4.1c2 gritter at speed: pad and touch holds while rolling, empty hopper mid-drive, storm night. Asserts, exit 1.
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

const HELD = () => J(`(() => { const b = TLXPL.rt(${U}); return { grit: !!b.grit, down: b.down, hop: +TLXPL.hopOf(${U}).toFixed(1), v: +Math.hypot(P.vx, P.vz).toFixed(1), hint: TLXPL.hint(), dev: INP.dev, pill: $("tcE").hidden ? null : $("tcE").textContent, nan: !isFinite(P.x + P.y + P.z + P.vx + P.vz) }; })()`);
const prep = async (hop, s) => { await seat(uid); await ev(`TLX.state("plow").blades[${U}].hop = ${hop}; __putR(${ID}, ${s}, 1, 0); TLXPL.rt(${U}).down = false; TLXPL.rt(${U}).grit = false; TLXPL.rt(${U}).gKg = 0; true`); await waitGame(0.8); await clearToasts(); };
async function rollTo(vmax, secs) { const t0 = await clock(); let gas = false, steer = null;
  while ((await clock()) - t0 < secs) { const s = await J(`__steer(${ID}, 1, 0, 14)`); const wg = s.v < vmax; if (wg !== gas) { if (wg) await down("KeyW"); else await up("KeyW"); gas = wg; }
    const w = s.e > 0.04 ? "KeyA" : s.e < -0.04 ? "KeyD" : null; if (w !== steer) { if (steer) await up(steer); if (w) await down(w); steer = w; } await sleep(90); }
  if (steer) await up(steer); return () => up("KeyW"); }

await section("P pad L3 hold while rolling", async () => {
  await prep(3000, S0 + 20);
  const stop = await rollTo(9, 5); let s = await HELD(); console.log("  rolling", JSON.stringify(s)); ok(s.v > 4, "rolling at " + s.v + " m/s");
  await padSet({ 10: 1 }, [0, 0, 0, 0], PS); await sleep(1100);
  // keep W held through the pad hold
  s = await HELD(); await padSet({}, [0, 0, 0, 0], PS); await waitGame(0.6); s = await HELD();
  ok(s.grit && !s.down, "L3 held while rolling starts the gritter, blade stays up: " + JSON.stringify(s));
  const h0 = s.hop; await rollTo(9, 4); s = await HELD(); ok(s.hop < h0 - 1, `hopper falls while rolling (${h0} -> ${s.hop})`);
  await padSet({ 10: 1 }, [0, 0, 0, 0], PS); await sleep(1100); await padSet({}, [0, 0, 0, 0], PS); await waitGame(0.6); s = await HELD();
  ok(!s.grit && !s.down, "L3 held again stops it"); await padOff(); await stop(); await ev("P.vx = P.vz = 0; true");
});

await section("T touch pill hold while rolling", async () => {
  await prep(3000, S0 + 20);
  await send("Emulation.setTouchEmulationEnabled", { enabled: true });
  await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 640, y: 200 }] }); await sleep(100); await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await ev(`SET.touch = "on"; setTouchUI(); true`); await sleep(500);
  const P1 = `$("tcE").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 5, pointerType: "touch" })); true`, P2 = `$("tcE").dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 5, pointerType: "touch" })); true`;
  const stop = await rollTo(9, 4); await ev(P1); await sleep(1100); await ev(P2); await waitGame(0.6); let s = await HELD();
  ok(s.grit && !s.down && s.dev === "touch", "pill held while rolling starts it: " + JSON.stringify(s));
  // a tap while gritting drops the blade, gritter stays
  await ev(P1); await sleep(150); await ev(P2); await waitGame(0.6); s = await HELD(); ok(s.down && s.grit && s.pill === "BLADE UP", "tap drops blade, gritter runs on: " + s.pill);
  // finger left down through a long time: lift away with pointercancel
  await ev(P1); await sleep(1400); await ev(`$("tcE").dispatchEvent(new PointerEvent("pointercancel", { bubbles: true, pointerId: 5, pointerType: "touch" })); true`); await waitGame(0.6); s = await HELD();
  console.log("  after pointercancel mid-hold", JSON.stringify(s)); ok(!s.nan, "no NaN after cancel");
  await ev(`SET.touch = "auto"; setTouchUI(); true`); await send("Emulation.setTouchEmulationEnabled", { enabled: false }); await stop(); await ev("P.vx = P.vz = 0; true");
});

await section("E hopper empties mid-drive", async () => {
  await prep(25, S0 + 20);
  await down("KeyE"); await sleep(800); await up("KeyE"); await sleep(200);
  let s = await HELD(); ok(s.grit, "started with 25 kg");
  const stop = await rollTo(9, 9); s = await HELD(); const t = await toasts();
  ok(!s.grit && s.hop <= 0.5 && t.some(m => /hopper is empty|out of grit|ran out/i.test(m)), "empties and stops, says so: " + JSON.stringify(s) + " " + JSON.stringify(t.slice(-2)));
  ok(s.hop >= 0, "hopper never negative: " + s.hop);
  await stop(); await ev("P.vx = P.vz = 0; true");
});

await section("N storm night, live", async () => {
  await ev(`GS.hour = 23.5; GS.storm = 1; WX.at = () => 1; true`);
  await prep(3000, S0 + 20);
  await down("KeyE"); await sleep(800); await up("KeyE"); await sleep(200);
  const stop = await rollTo(8, 6); const s = await HELD(); const g = await ev(`TLXPL.gritSpot(P.x - Math.sin(P.yaw) * 8, P.z - Math.cos(P.yaw) * 8) ? JSON.stringify(TLXPL.gritSpot(P.x - Math.sin(P.yaw) * 8, P.z - Math.cos(P.yaw) * 8)) : "null"`);
  console.log("  storm night", JSON.stringify(s), g);
  ok(s.grit && !s.nan, "gritter runs in a storm at night: " + s.hint);
  await sideCam(); await sleep(400); await shot("n_storm_grit"); await camOff();
  await stop(); await ev(`TLXPL.rt(${U}).grit = false; P.vx = P.vz = 0; true`);
});
await done(fails ? 1 : 0);
