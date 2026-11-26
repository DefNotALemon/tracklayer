// I5 haptics: what the pad is told, per surface and event. The pad itself is replaced by a sink that records every
// frame the system would send; the DualSense report builder is checked byte by byte.
import { boot, ev, sleep, done, hold, down, up, padSet, padOff, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 400)); } };
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.setOn("police", false); TLX.setOn("traffic", false); GS.warmth = 100; GS.fuel = GS.cap; true`); await sleep(1200);
await ev(`window.__hs = []; TLXHAP.PREF.on = true; TLXHAP.PREF.k = 1; TLXHAP.PREF.trig = true; TLXHAP.PREF.bar = true; TLXHAP.sink = o => { __hs.push({ s: o.strong, w: o.weak, r2: o.r2, l2: o.l2, rgb: o.rgb, surf: o.surf }); if (__hs.length > 600) __hs.shift(); }; true`);
const clear = () => ev(`__hs.length = 0; TLXHAP.ev.length = 0; true`);
const stat = () => J(`(() => { const a = __hs; if (!a.length) return { n: 0 }; const mean = k => a.reduce((s, q) => s + q[k], 0) / a.length, max = k => Math.max(...a.map(q => q[k])); const surf = {}; for (const q of a) surf[q.surf] = (surf[q.surf] || 0) + 1; return { n: a.length, s: mean("s"), w: mean("w"), smax: max("s"), wmax: max("w"), surf, last: a[a.length - 1], ev: TLXHAP.ev.map(e => e.name) }; })()`);

await section("A the report a DualSense is sent", async () => {
  const r = await J(`(() => { const X = TLXHAP, enc = new TextEncoder().encode("123456789"); const fb = [...X.trigBytes({ mode: "fb", from: 2, k: 8 })], vib = [...X.trigBytes({ mode: "vib", from: 3, k: 6, hz: 22 })], off = [...X.trigBytes(null)];
    const o = { weak: 0.5, strong: 1, r2: { mode: "fb", from: 2, k: 4 }, l2: null, rgb: [1, 2, 3] }, usb = X.report(o, false, 0), bt = X.report(o, true, 5);
    const all = new Uint8Array(75); all[0] = 0xa2; all[1] = 0x31; all.set(bt.data.subarray(0, 73), 2); const c = X.crc32(all);
    return { crc: X.crc32(enc), fb, vib, off, usb: { id: usb.id, n: usb.data.length, m: [usb.data[2], usb.data[3]], r2: usb.data[10], l2: usb.data[21], rgb: [usb.data[44], usb.data[45], usb.data[46]], f0: usb.data[0], f1: usb.data[1] }, bt: { id: bt.id, n: bt.data.length, tag: bt.data[0], m: [bt.data[4], bt.data[5]], crcOk: bt.data[73] === (c & 255) && bt.data[76] === (c >>> 24) } }; })()`);
  ok(r.crc === 0xcbf43926, "CRC-32 of the check string is cbf43926 (" + r.crc.toString(16) + ")");
  let zones = 0; for (let i = 2; i < 10; i++) zones += 7 * Math.pow(8, i);
  ok(r.fb[0] === 0x21 && r.fb[1] === 0xfc && r.fb[2] === 0x03 && r.fb[3] === zones % 256 && r.fb[6] === Math.floor(zones / 16777216) % 256, "a feedback trigger from position 2 at full strength: mode 21, zones 2-9, three bits each: " + r.fb.slice(0, 7).join(","));
  ok(r.vib[0] === 0x26 && r.vib[1] === 0xf8 && r.vib[9] === 22, "a vibrating trigger: mode 26, zones 3-9, 22 Hz");
  ok(r.off[0] === 0x05, "a trigger let go: mode 05");
  ok(r.usb.id === 2 && r.usb.n === 47 && r.usb.m[0] === 128 && r.usb.m[1] === 255 && r.usb.r2 === 0x21 && r.usb.l2 === 0x05 && r.usb.rgb.join() === "1,2,3" && (r.usb.f0 & 0x0f) === 0x0f && (r.usb.f1 & 0x04), "USB: report 2, 47 bytes, light motor then heavy motor, both triggers, the light bar: " + JSON.stringify(r.usb));
  ok(r.bt.id === 0x31 && r.bt.n === 77 && r.bt.tag === 0x50 && r.bt.m[0] === 128 && r.bt.m[1] === 255 && r.bt.crcOk, "Bluetooth: report 31, 77 bytes, the sequence tag, the same body two bytes on, a CRC that checks");
});

await section("B the engine and the ground", async () => {
  await clear(); await sleep(1500); const idle = await stat();
  ok(idle.n > 10 && idle.w > 0.02 && idle.w < 0.12 && idle.s < 0.08, `standing with the engine running: a faint idle in the light motor (${idle.w.toFixed(3)} / ${idle.s.toFixed(3)}, ${idle.n} frames)`);
  ok(idle.last.r2 && idle.last.r2.mode === "fb" && idle.last.l2 && idle.last.l2.mode === "fb", "both triggers have a wall to pull against");
  await down("KeyW"); await sleep(600); await clear(); await sleep(2500); const pull = await stat(); await up("KeyW");
  ok(pull.w > idle.w * 1.8, `full throttle: the revs come up through the pad (${pull.w.toFixed(3)} against ${idle.w.toFixed(3)})`);
  const sf = Object.keys(pull.surf).sort((a, b) => pull.surf[b] - pull.surf[a])[0]; ok(["powder", "packed", "bare", "ice", "bog"].includes(sf), "the ground under the track has a name: " + JSON.stringify(pull.surf));
  // the same speed on four grounds: each feels different
  const feel = async (set, label) => { await ev(`window.__hx = () => { ${set} P.gnd = true; P.airT = 0; P.shake = 0; P.vx = Math.sin(P.yaw) * 12; P.vz = Math.cos(P.yaw) * 12; TLXHAP.quiet(); }; true`); const o = []; for (let i = 0; i < 40; i++) { o.push(await J(`(() => { __hx(); const m = TLXHAP.mix(); return [m.strong, m.weak, m.surf]; })()`)); } return { s: o.reduce((a, q) => a + q[0], 0) / o.length, w: o.reduce((a, q) => a + q[1], 0) / o.length, surf: o[0][2], label }; };
  const save = await J(`({ ice: P.ice, pack: P.pack, bare: P.bare, exc: P.exc })`);
  const pow = await feel(`P.ice = false; P.pack = 0; P.bare = 0; P.exc = 0.7;`, "powder"), pk = await feel(`P.ice = false; P.pack = 1; P.bare = 0; P.exc = 0;`, "packed"), ice = await feel(`P.ice = true; P.pack = 0; P.bare = 0; P.exc = 0;`, "ice"), bare = await feel(`P.ice = false; P.pack = 0; P.bare = 1; P.exc = 0;`, "bare");
  await ev(`P.ice = ${save.ice}; P.pack = ${save.pack}; P.bare = ${save.bare}; P.exc = ${save.exc}; P.vx = P.vz = 0; true`);
  console.log("   feel:", JSON.stringify([pow, pk, ice, bare]));
  ok(pow.surf === "powder" && pk.surf === "packed" && ice.surf === "ice" && bare.surf === "bare", "powder, a packed trail, ice and bare ground are told apart");
  ok(pow.s > pk.s * 2 && pow.s > ice.s * 2, `powder is the heavy one (heavy motor ${pow.s.toFixed(3)} against ${pk.s.toFixed(3)} packed, ${ice.s.toFixed(3)} ice)`);
  ok(ice.w > pk.w * 1.3, `ice chatters in the light motor more than a packed trail hums (${ice.w.toFixed(3)} against ${pk.w.toFixed(3)})`);
  ok(bare.s + bare.w > pk.s + pk.w + 0.1, "bare ground is the rough one");
});

await section("C things that happen", async () => {
  let s;
  await clear(); await ev(`thud(0.8); true`); await sleep(250); s = await stat(); ok(s.ev.includes("thud") && s.smax > 0.5, `a knock is a knock (${s.smax.toFixed(2)})`);
  await clear(); await ev(`whump(0.9); true`); await sleep(500); s = await stat(); ok(s.ev.includes("whump") && s.smax > 0.4, "the snowpack settling is a slow deep roll");
  await clear(); await ev(`iceCrackSnd(0.8); true`); await sleep(350); s = await stat(); ok(s.ev.includes("ice") && s.wmax > 0.6 && s.smax < 0.4, `ice cracking is two sharp ticks in the light motor (${s.wmax.toFixed(2)})`);
  // landings by height
  const land = async h => { await ev(`TLXHAP.ev.length = 0; TLXHAP.st.air = true; TLXHAP.st.peak = ${h}; P.gnd = true; P.airT = 0; true`); await sleep(260); return (await J(`TLXHAP.ev.filter(e => e.name === "land")[0] || null`)); };
  const lo = await land(0.6), hi = await land(3.5), none = await land(0.1);
  ok(lo && hi && hi.strong > lo.strong + 0.3 && hi.dur > lo.dur && !none, `a landing is felt by its height (0.6 m ${lo && lo.strong.toFixed(2)}, 3.5 m ${hi && hi.strong.toFixed(2)}, a 10 cm hop nothing)`);
  // bog
  const bog = await J(`(() => { const b = BOG.on; BOG.on = true; input.thr = 1; let mx = 0, r2 = null; for (let i = 0; i < 12; i++) { const m = TLXHAP.mix(); mx = Math.max(mx, m.strong); r2 = m.r2; } BOG.on = b; input.thr = 0; return { mx, r2 }; })()`);
  ok(bog.mx > 0.35 && bog.r2 && bog.r2.mode === "vib", `bogged with the throttle open: the pad labours and the trigger goes slack and fizzes (${bog.mx.toFixed(2)})`);
  // freezing
  const cold = await J(`(() => { const w = GS.warmth; GS.warmth = 8; let mx = 0, rgb = null; for (let i = 0; i < 60; i++) { TLXHAP.tickFor(0.05); const m = TLXHAP.mix(); mx = Math.max(mx, m.strong); rgb = m.rgb; } GS.warmth = w; return { mx, rgb }; })()`);
  ok(cold.mx > 0.3 && cold.rgb[2] > 100 && cold.rgb[0] === 0, `freezing: a heartbeat in the heavy motor and a blue light bar (${cold.mx.toFixed(2)}, rgb ${cold.rgb})`);
  const lowf = await J(`(() => { const f = GS.fuel; GS.fuel = GS.cap * 0.05; const m = TLXHAP.mix(); GS.fuel = f; return m.rgb; })()`); ok(lowf[0] === 255 && lowf[1] === 120, "low fuel: an amber light bar (" + lowf + ")");
  await clear(); await ev(`crashEject("test", 12, 2, 0); true`); await sleep(400); s = await stat(); ok(s.ev.includes("crash") && s.smax > 0.9, "a crash is everything the pad has"); await ev(`crashCancel(); FOOT.on = false; true`); await sleep(600);
});

await section("D the switches and a real pad", async () => {
  await ev(`TLXHAP.PREF.k = 0.5; true`); await clear(); await ev(`thud(1); true`); await sleep(200); let s = await stat(); const half = s.smax;
  await ev(`TLXHAP.PREF.k = 1; true`); await clear(); await ev(`thud(1); true`); await sleep(200); s = await stat();
  ok(half > 0.3 && s.smax > half * 1.6, `strength scales what is sent (${half.toFixed(2)} at 50%, ${s.smax.toFixed(2)} at 100%)`);
  await ev(`TLXHAP.PREF.on = false; true`); await clear(); await ev(`thud(1); true`); await sleep(300); s = await stat();
  ok(s.smax === 0 && s.wmax === 0 && !s.last.r2 && !s.last.l2, "off is off: nothing in either motor, no trigger effect"); await ev(`TLXHAP.PREF.on = true; true`);
  // through a pad's own actuator: Xbox (dual rumble + trigger rumble) and a pad with nothing
  await padSet({}, [0, 0, 0, 0]);
  await ev(`window.__fx = []; __fakePad.vibrationActuator = { effects: ["dual-rumble", "trigger-rumble"], playEffect(t, p) { __fx.push([t, p.strongMagnitude, p.weakMagnitude, p.rightTrigger || 0]); return Promise.resolve("complete"); } }; TLXHAP.sink = null; true`);
  await sleep(300); await ev(`thud(1); BOG.on = true; input.thr = 1; true`); await sleep(400); await ev(`BOG.on = false; true`);
  const fx = await J(`({ n: __fx.length, dual: __fx.filter(f => f[0] === "dual-rumble").length, trig: __fx.filter(f => f[0] === "trigger-rumble").length, mx: Math.max(0, ...__fx.map(f => f[1])), pads: TLX.api.pads().length })`);
  ok(fx.pads >= 1 && fx.dual > 2 && fx.mx > 0.5, `an Xbox pad gets dual rumble through the Gamepad API (${fx.dual} effects, peak ${fx.mx.toFixed(2)})`);
  ok(fx.trig > 0, `and its impulse triggers are used where the browser offers them (${fx.trig})`);
  await ev(`__fakePad.vibrationActuator = null; __fx.length = 0; thud(1); true`); await sleep(300);
  ok((await J(`__fx.length`)) === 0 && !(await ev(`TLXHAP.err`)), "a pad with no actuator is left alone, without an error");
  await padOff();
});

await section("E the Controller app", async () => {
  await ev(`TLX.api.TABLET.toggle(true, "haptics"); true`); await sleep(700);
  const t = await J(`(() => { const el = document.getElementById("tabS"); return { txt: el.innerText.slice(0, 600), btns: [...el.querySelectorAll("[data-act]")].map(b => b.dataset.act) }; })()`);
  ok(/Haptics/i.test(t.txt) && t.btns.includes("on") && t.btns.includes("up") && t.btns.includes("dn") && t.btns.includes("tr") && t.btns.includes("bar") && t.btns.includes("t:landing"), "the app has on/off, weaker / stronger, triggers, light bar and a try-it row: " + t.btns.join(" "));
  await ev(`document.querySelector('#tabS [data-act="dn"]').click(); true`); await sleep(300);
  ok((await J(`TLXHAP.PREF.k`)) === 0.9 && /90%/.test(await ev(`document.getElementById("tabS").innerText`)), "WEAKER takes the strength to 90% and the page says so");
  ok((await J(`JSON.parse(localStorage.getItem("tracklayer.hap.v1")).k`)) === 0.9, "the preference is kept on this device");
  await ev(`document.querySelector('#tabS [data-act="up"]').click(); true`); await sleep(200);
  await shot("haptics_app", 90);
  await ev(`TLX.api.TABLET.toggle(false); localStorage.removeItem("tracklayer.hap.v1"); true`);
});
console.log(fails ? `FAILS: ${fails}` : "all passed");
await done(fails ? 1 : 0);
