// Tracklayer: haptics (goal G7, loop/HOME.md I5). The pad feels the machine and the ground.
//   - every pad: dual rumble through the Gamepad API (vibrationActuator.playEffect), Xbox pads also trigger rumble
//   - a DualSense, once connected over WebHID (Controller app > CONNECT, Chrome / Edge): its own motors, adaptive
//     triggers (throttle load, powder slack, rev limiter, brake firmness and slide pulses) and the light bar
// What is felt is designed per surface and event, not one buzz: engine idle and revs, powder / packed trail / ice /
// bare ground, landings by height, bogging down, ice cracking, a hit by its speed, the blade biting, a heartbeat when
// you are freezing. The preference (on, strength, triggers, light bar) is the device's, kept in localStorage.
(() => {
"use strict";
const KEY = "tracklayer.hap.v1", clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const PREF = { on: true, k: 1, trig: true, bar: true };
try { Object.assign(PREF, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { /* defaults */ }
const savePref = () => { try { localStorage.setItem(KEY, JSON.stringify(PREF)); } catch (e) { /* private mode */ } };
let api = null;
const X = window.TLXHAP = { PREF, log: [], hid: null, hidKind: "", err: "", sink: null, last: null, ev: [], st: {} };
const note = o => { X.log.push(o); if (X.log.length > 400) X.log.shift(); };

/* ---------------- the DualSense over WebHID ---------------- */
const DS = [{ vendorId: 0x054c, productId: 0x0ce6 }, { vendorId: 0x054c, productId: 0x0df2 }];
const CRCT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = bytes => { let c = 0xffffffff; for (let i = 0; i < bytes.length; i++) c = CRCT[(c ^ bytes[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
// a trigger's 11 bytes. off | feedback(from, strength 1..8): a wall from a position on | vibration(from, amplitude 1..8, Hz)
function trigBytes(e) {
  const b = new Uint8Array(11); if (!e || !e.mode) { b[0] = 0x05; return b; }
  const from = clamp(Math.round(e.from || 0), 0, 9), v = (clamp(Math.round(e.k), 1, 8) - 1) & 7; let act = 0, zones = 0;
  for (let i = from; i < 10; i++) { act |= 1 << i; zones += v * Math.pow(8, i); }                       // 3 bits a zone, 30 bits in all: past what a 32-bit shift holds
  b[0] = e.mode === "vib" ? 0x26 : 0x21; b[1] = act & 255; b[2] = (act >> 8) & 255;
  b[3] = zones % 256; b[4] = Math.floor(zones / 256) % 256; b[5] = Math.floor(zones / 65536) % 256; b[6] = Math.floor(zones / 16777216) % 256;
  if (e.mode === "vib") b[9] = clamp(Math.round(e.hz || 30), 1, 255);
  return b;
}
// the common 47 bytes of an output report: motors, both triggers, light bar
function common(o) {
  const d = new Uint8Array(47);
  d[0] = 0x03 | 0x04 | 0x08;                                                                            // rumble (compat), right trigger, left trigger
  d[1] = 0x04 | 0x10;                                                                                   // light bar, player lamps
  d[2] = clamp(Math.round(o.weak * 255), 0, 255); d[3] = clamp(Math.round(o.strong * 255), 0, 255);     // right (light) motor, left (heavy) motor
  d.set(trigBytes(o.r2), 10); d.set(trigBytes(o.l2), 21);
  d[38] = 0x04; d[41] = 0x02; d[42] = 0x02; d[43] = 0x04;                                               // lamps: steady, dim, the middle one
  d[44] = o.rgb[0]; d[45] = o.rgb[1]; d[46] = o.rgb[2];
  return d;
}
function report(o, bt, seq) {
  const c = common(o); if (!bt) return { id: 0x02, data: c };
  const d = new Uint8Array(77); d[0] = ((seq & 15) << 4); d[1] = 0x10; d.set(c, 2);                      // Bluetooth: report 0x31, a tag, the same bytes, a CRC-32 over 0xA2 + id + body
  const all = new Uint8Array(75); all[0] = 0xa2; all[1] = 0x31; all.set(d.subarray(0, 73), 2); const k = crc32(all);
  d[73] = k & 255; d[74] = (k >>> 8) & 255; d[75] = (k >>> 16) & 255; d[76] = (k >>> 24) & 255;
  return { id: 0x31, data: d };
}
X.crc32 = crc32; X.trigBytes = trigBytes; X.report = report;
const hidOk = () => !!(navigator.hid && navigator.hid.requestDevice);
async function adopt(dev) {
  if (!dev) return false; if (!dev.opened) await dev.open();
  const bt = dev.collections.some(c => (c.outputReports || []).some(r => r.reportId === 0x31));
  X.hid = dev; X.hidBt = bt; X.hidKind = (dev.productId === 0x0df2 ? "DualSense Edge" : "DualSense") + (bt ? " (Bluetooth)" : " (USB)"); X.err = ""; X.seq = 0; return true;
}
async function connect() {                                                                              // needs a real click or key press: the browser's rule
  if (!hidOk()) { X.err = "This browser has no WebHID: the pad gets plain rumble. Chrome or Edge can do the triggers and the light bar."; return false; }
  try { const got = await navigator.hid.requestDevice({ filters: DS }); if (!got || !got.length) { X.err = "No controller picked."; return false; } return await adopt(got[0]); }
  catch (e) { X.err = String(e && e.message || e); return false; }
}
async function reconnect() { if (!hidOk() || X.hid) return; try { const ds = await navigator.hid.getDevices(); const d = ds.find(q => DS.some(f => f.vendorId === q.vendorId && f.productId === q.productId)); if (d) await adopt(d); } catch (e) { /* asked again from the app */ } }
function forget() { const d = X.hid; X.hid = null; X.hidKind = ""; if (d) { try { const r = report({ weak: 0, strong: 0, r2: null, l2: null, rgb: [0, 0, 40] }, X.hidBt, 0); d.sendReport(r.id, r.data).catch(() => { }); d.close().catch(() => { }); } catch (e) { /* gone */ } } }
if (hidOk()) navigator.hid.addEventListener("disconnect", e => { if (X.hid === e.device) { X.hid = null; X.hidKind = ""; } });
X.connect = connect; X.forget = forget;

/* ---------------- what is felt ---------------- */
// pulses: short events added on top of the running mix. { t0, dur, strong, weak, hz } (hz > 0: the pulse beats)
const PUL = []; let now = 0;
function pulse(name, dur, strong, weak, hz) { PUL.push({ name, t0: now, dur, strong, weak, hz: hz || 0 }); if (PUL.length > 12) PUL.shift(); X.ev.push({ name, t: now, strong, weak, dur }); if (X.ev.length > 60) X.ev.shift(); }
X.pulse = pulse;
function onEv(k, v) {
  v = +v || 0;
  if (k === "thud") pulse("thud", 0.16 + 0.1 * clamp(v, 0, 1.5), clamp(0.35 + 0.6 * v, 0, 1), clamp(0.2 + 0.3 * v, 0, 1));
  else if (k === "whump") pulse("whump", 0.7, clamp(0.45 + 0.5 * v, 0, 1), 0.15, 9);                    // the snowpack settling under you: slow and deep
  else if (k === "ice") { pulse("ice", 0.16, 0.1, clamp(0.75 + 0.4 * v, 0, 1)); PUL.push({ name: "ice2", t0: now + 0.2, dur: 0.14, strong: 0.05, weak: clamp(0.5 + 0.4 * v, 0, 1), hz: 0 }); }   // two sharp ticks
  else if (k === "crash") pulse("crash", 0.5 + clamp(v / 30, 0, 0.5), 1, clamp(0.5 + v / 30, 0, 1));
}
const hash = n => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
// the running mix from the machine's state: returns { strong, weak, r2, l2, rgb, surf }
function mix(dt) {
  const P = api.P, GS = api.GS, I = api.input || {}, out = { strong: 0, weak: 0, r2: null, l2: null, rgb: [20, 60, 120], surf: "" }, S = X.st;
  const foot = api.FOOT && api.FOOT.on, cab = api.veh && api.veh.cur, v = Math.hypot(P.vx, P.vz), thr = clamp(I.thr || 0, 0, 1), brk = clamp(I.brk || 0, 0, 1);
  const run = api.started() && !GS.dead && !(api.busy && api.busy());
  if (run && !foot) {
    const fuel = GS.fuel > 0, rpm = clamp(P.rpm || 0, 0, 1), air = !P.gnd && P.airT > 0.12;
    // the engine: a faint idle in the light motor, revs climbing into both
    if (fuel) { out.weak += 0.035 + 0.16 * rpm * (0.35 + 0.65 * thr); out.strong += 0.05 * rpm * thr; }
    // the ground, by what the track is on
    const bog = api.BOG && api.BOG.on, vk = clamp(v / 22, 0, 1);
    let surf = air ? "air" : bog ? "bog" : P.ice ? "ice" : (P.bare || 0) > 0.5 ? "bare" : (P.pack || 0) > 0.55 ? "packed" : "powder";
    if (cab) surf = air ? "air" : "road";
    out.surf = surf; S.ph = (S.ph || 0) + dt * (6 + v * 1.7);
    if (surf === "powder") out.strong += vk * (0.1 + 0.16 * clamp((P.exc || 0) + (P.sink || 0) * 2, 0, 1)) * (0.75 + 0.25 * Math.sin(S.ph * 0.6));       // soft, slow, heavy
    else if (surf === "packed") out.weak += vk * 0.08 * (0.6 + 0.4 * hash(Math.floor(S.ph)));                                                             // a fine buzz
    else if (surf === "ice") out.weak += vk * 0.45 * (hash(Math.floor(S.ph * 2.2)) > 0.45 ? 1 : 0.15);                                                     // chatter
    else if (surf === "bare" || surf === "road") { const j = hash(Math.floor(S.ph * 1.4)); out.strong += vk * (cab ? 0.1 : 0.3) * j; out.weak += vk * (cab ? 0.06 : 0.22) * (1 - j); }   // gravel: rough and uneven
    else if (surf === "bog") { S.bp = (S.bp || 0) + dt * 13; out.strong += (0.25 + 0.45 * thr) * (0.5 + 0.5 * Math.sin(S.bp)); out.weak += 0.2 * thr; }                              // digging in: the whole pad labours
    if (P.shake) out.strong += clamp(P.shake, 0, 1) * 0.3;
    // a landing, by how high it came from
    if (S.air && !air) { const h = S.peak || 0; if (h > 0.25) pulse("land", 0.14 + clamp(h / 8, 0, 0.3), clamp(0.3 + h / 3.5, 0, 1), clamp(0.15 + h / 6, 0, 0.8)); }
    if (air) S.peak = Math.max(S.peak || 0, P.airPeak || 0); else S.peak = 0; S.air = air;
    // the triggers: load on the throttle, firmness and slide on the brake
    if (PREF.trig) {
      const spin = !air && thr > 0.5 && v < 3 && (bog || (P.exc || 0) > 0.6), lim = rpm > 0.965 && thr > 0.9;
      if (!fuel) out.r2 = null;                                                                          // an empty tank: nothing behind the trigger
      else if (spin) out.r2 = { mode: "vib", from: 1, k: 3, hz: 55 };                                    // the track spinning free in powder: slack and fizzing
      else if (lim) out.r2 = { mode: "vib", from: 6, k: 5, hz: 38 };                                     // the rev limiter kicking back at the end of the pull
      else out.r2 = { mode: "fb", from: 2, k: 1 + Math.round(6 * clamp(0.15 + (P.drag || 0) * 0.5 + (P.exc || 0) * 0.5 + (bog ? 0.5 : 0), 0, 1)) };
      const slide = !air && brk > 0.25 && v > 4 && (P.ice || surf === "packed");
      out.l2 = slide ? { mode: "vib", from: 3, k: 6, hz: 22 } : { mode: "fb", from: 3, k: 5 };            // a slide pulses under the finger
    }
  }
  // freezing: a heartbeat, on foot too
  if (run && GS.warmth < 28) { const beat = (now * (1.1 + (28 - GS.warmth) / 40)) % 1; const k = clamp((28 - GS.warmth) / 28, 0.25, 1); if (beat < 0.08 || (beat > 0.2 && beat < 0.27)) out.strong += 0.5 * k; }
  // the light bar: how you are
  if (PREF.bar) { if (run && GS.warmth < 35) { const p = 0.5 + 0.5 * Math.sin(now * 3); out.rgb = [0, Math.round(30 + 50 * p), Math.round(120 + 135 * p)]; } else if (run && !foot && GS.cap && GS.fuel / GS.cap < 0.12) out.rgb = [255, 120, 0]; else if (run && GS.dead) out.rgb = [255, 0, 0]; else out.rgb = [70, 110, 160]; }
  // the pulses on top
  for (let i = PUL.length - 1; i >= 0; i--) { const p = PUL[i], a = now - p.t0; if (a < 0) continue; if (a > p.dur) { PUL.splice(i, 1); continue; } const env = (1 - a / p.dur) * (p.hz ? 0.5 + 0.5 * Math.sin(a * p.hz * 6.283) : 1); out.strong = Math.max(out.strong, p.strong * env); out.weak = Math.max(out.weak, p.weak * env); }
  const k = PREF.on ? PREF.k : 0; out.strong = clamp(out.strong * k, 0, 1); out.weak = clamp(out.weak * k, 0, 1);
  if (!PREF.on) { out.r2 = out.l2 = null; }
  return out;
}

/* ---------------- sending it ---------------- */
let acc = 0, quiet = true;
function send(o) {
  X.last = o; if (X.sink) { X.sink(o); return; }
  const silent = o.strong < 0.004 && o.weak < 0.004;
  if (X.hid && X.hid.opened) {
    const r = report(o, X.hidBt, X.seq = ((X.seq || 0) + 1) & 15); X.hid.sendReport(r.id, r.data).catch(e => { X.err = String(e && e.message || e); });
    note({ via: "hid", strong: o.strong, weak: o.weak, r2: o.r2 && o.r2.mode, l2: o.l2 && o.l2.mode }); return;
  }
  if (silent && quiet) return; quiet = silent;
  for (const gp of api.pads()) {
    const va = gp.vibrationActuator; if (!va || !va.playEffect) { const h = gp.hapticActuators && gp.hapticActuators[0]; if (h && h.pulse && !silent) { try { h.pulse(Math.max(o.strong, o.weak), 70); } catch (e) { /* Firefox's old API */ } } continue; }
    try {
      va.playEffect("dual-rumble", { startDelay: 0, duration: 90, strongMagnitude: o.strong, weakMagnitude: o.weak }).catch(() => { });
      const fx = va.effects || []; if (PREF.trig && fx.includes && fx.includes("trigger-rumble") && (o.r2 || o.l2)) va.playEffect("trigger-rumble", { startDelay: 0, duration: 90, strongMagnitude: 0, weakMagnitude: 0, rightTrigger: o.r2 && o.r2.mode === "vib" ? 0.5 * PREF.k : 0, leftTrigger: o.l2 && o.l2.mode === "vib" ? 0.6 * PREF.k : 0 }).catch(() => { });   // an Xbox pad's impulse triggers
      note({ via: "pad", strong: o.strong, weak: o.weak });
    } catch (e) { X.err = String(e && e.message || e); }
  }
}
X.test = name => { const T = { engine: [0.5, 0.15, 0.45, 0], landing: [0.3, 0.9, 0.5, 0], ice: [0.09, 0.1, 0.9, 0], bog: [0.8, 0.7, 0.3, 13], crash: [0.7, 1, 0.9, 0], heartbeat: [0.09, 0.6, 0, 0] }[name]; if (T) pulse("test:" + name, T[0], T[1], T[2], T[3]); };

/* ---------------- the Controller app ---------------- */
const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 8h10a4 4 0 0 1 4 4.5l-.6 4a2.2 2.2 0 0 1-4 .9L15 15H9l-1.400 2.400a2.200 2.200 0 0 1-4-.9l-.6-4A4 4 0 0 1 7 8z"/><path d="M8 11v2.500M6.750 12.250h2.500"/><circle cx="16.500" cy="12" r=".7"/></svg>';
function render(el) {
  const Ui = api.ui, pads = api.pads(), pad = pads[0], name = X.hidKind || (pad ? (/dualsense|054c/i.test(pad.id) ? "DualSense" : /xbox|045e/i.test(pad.id) ? "Xbox controller" : pad.id.split("(")[0].trim()) : "No controller seen yet");
  const can = pad && pad.vibrationActuator ? "rumble" : pad ? "no rumble on this pad in this browser" : "press a button on it";
  let h = Ui.tabHead("CONTROLLER", "Haptics", PREF.on ? "ON" : "OFF");
  h += `<div class="tsub">${Ui.esc(name)} ${Ui.chip(X.hid ? "TRIGGERS + LIGHT BAR" : can.toUpperCase(), X.hid || (pad && pad.vibrationActuator) ? "ok" : "due")}</div>`;
  h += Ui.sec("Feel", "what the pad does");
  h += `<div class="trow2" style="display:flex;gap:6px;flex-wrap:wrap;margin:4px 0"><button type="button" class="tbtn${PREF.on ? "" : " ghost"}" data-tf="hp:on" data-act="on">${PREF.on ? "HAPTICS ON" : "HAPTICS OFF"}</button><button type="button" class="tbtn ghost" data-tf="hp:dn" data-act="dn">WEAKER</button><span class="tnote2" style="align-self:center;min-width:64px;text-align:center">Strength ${Math.round(PREF.k * 100)}%</span><button type="button" class="tbtn ghost" data-tf="hp:up" data-act="up">STRONGER</button></div>`;
  h += `<div style="display:flex;gap:6px;flex-wrap:wrap;margin:4px 0"><button type="button" class="tbtn${PREF.trig ? "" : " ghost"}" data-tf="hp:tr" data-act="tr">TRIGGERS ${PREF.trig ? "ON" : "OFF"}</button><button type="button" class="tbtn${PREF.bar ? "" : " ghost"}" data-tf="hp:bar" data-act="bar">LIGHT BAR ${PREF.bar ? "ON" : "OFF"}</button></div>`;
  h += Ui.sec("DualSense", X.hid ? "connected" : hidOk() ? "not connected" : "not in this browser");
  h += X.hid ? `<p class="tnote2">${Ui.esc(X.hidKind)}: the throttle trigger loads up with the pull and goes slack when the track spins, the brake pulses in a slide, the light bar shows cold and low fuel.</p><button type="button" class="tbtn ghost" data-tf="hp:dis" data-act="dis">DISCONNECT</button>`
    : hidOk() ? `<p class="tnote2">Rumble works already. For the adaptive triggers and the light bar the browser asks once which controller to use: click CONNECT with the mouse or press Enter on it (a pad button cannot open that window).</p><button type="button" class="tbtn" data-tf="hp:con" data-act="con">CONNECT DUALSENSE</button>`
    : `<p class="tnote2">This browser cannot talk to the DualSense's triggers and light bar (it needs WebHID: Chrome or Edge on a computer). Rumble still works where the browser offers it.</p>`;
  if (X.err) h += `<p class="tnote2"><b>${Ui.esc(X.err)}</b></p>`;
  h += Ui.sec("Try it", "feel each one");
  h += `<div style="display:flex;gap:6px;flex-wrap:wrap;margin:4px 0">` + ["engine", "landing", "ice", "bog", "crash", "heartbeat"].map(n => `<button type="button" class="tbtn ghost sm" data-tf="hp:t:${n}" data-act="t:${n}">${n.toUpperCase()}</button>`).join("") + `</div>`;
  el.innerHTML = h;
  const re = () => api.TABLET.refresh && api.TABLET.refresh();
  for (const b of el.querySelectorAll("[data-act]")) b.addEventListener("click", () => {
    const a = b.dataset.act;
    if (a === "on") PREF.on = !PREF.on; else if (a === "dn") PREF.k = clamp(Math.round((PREF.k - 0.1) * 10) / 10, 0.2, 1.5); else if (a === "up") PREF.k = clamp(Math.round((PREF.k + 0.1) * 10) / 10, 0.2, 1.5);
    else if (a === "tr") PREF.trig = !PREF.trig; else if (a === "bar") PREF.bar = !PREF.bar; else if (a === "dis") forget();
    else if (a === "con") { connect().then(re); return; } else if (a.slice(0, 2) === "t:") { X.test(a.slice(2)); return; }
    savePref(); if (a === "up" || a === "dn") X.test("landing"); re();
  });
}

TLX.register({
  id: "haptics", v: 1, state0: () => ({}),
  init(a) {
    api = a; if (a.hapx) a.hapx.push(onEv);
    a.TABLET.register({ id: "haptics", name: "Controller", icon: ICON, order: 9.6, render });
    reconnect();
  },
  tick(dt) {
    if (!api) return; now += dt; acc += dt; if (acc < 0.045) return; const d = acc; acc = 0;
    let o; try { o = mix(d); } catch (e) { if (!X.err) X.err = String(e); return; }
    send(o);
  }
});
X.mix = () => mix(0.05); X.tickFor = dt => { now += dt; }; X.quiet = () => { PUL.length = 0; X.st.air = false; X.st.peak = 0; }; X.render = render;
})();
