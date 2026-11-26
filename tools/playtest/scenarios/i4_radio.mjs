// I4 the radio: six stations with their own music, made in the browser; talk between songs; safety updates on every
// station; reception; heard from the sled when on foot; the Radio app.
import { boot, ev, sleep, done, reload, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 400)); } };
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.setOn("police", false); TLX.setOn("traffic", false); true`); await sleep(1500);
// a meter on the radio's own output
await ev(`(() => { const G = TLXRAD.graph(); if (!G) return false; const an = G.AC.createAnalyser(); an.fftSize = 2048; G.vol.connect(an); window.__an = an; window.__peak = (ms) => new Promise(res => { let mx = 0, sum = 0, n = 0; const b = new Float32Array(2048), t0 = performance.now(); const f = () => { an.getFloatTimeDomainData(b); for (const v of b) { mx = Math.max(mx, Math.abs(v)); sum += v * v; n++; } if (performance.now() - t0 < ms) setTimeout(f, 40); else res(JSON.stringify({ peak: mx, rms: Math.sqrt(sum / n) })); }; f(); }); return true; })()`);
const peak = async ms => JSON.parse(await ev(`__peak(${ms})`));

await section("A six stations, each its own music, hours without a repeat", async () => {
  const r = await J(`(() => { const out = {}; for (const st of TLXRAD.ST) { const seeds = new Set(), titles = new Set(); let dur = 0, bpm = [1e9, 0], beats = new Set(); for (let n = 0; n < 120; n++) { const s = TLXRAD.song(st, n); seeds.add(s.seed); titles.add(s.title); dur += s.dur; bpm = [Math.min(bpm[0], s.bpm), Math.max(bpm[1], s.bpm)]; beats.add(s.beats); } out[st.id] = { style: st.style, seeds: seeds.size, titles: titles.size, hours: dur / 3600, bpm, beats: [...beats] }; } return out; })()`);
  const ids = Object.keys(r); ok(ids.length === 6 && new Set(ids.map(k => r[k].style)).size === 6, "six stations, six styles: " + ids.map(k => k + "=" + r[k].style).join(" "));
  ok(ids.every(k => r[k].seeds === 120 && r[k].hours > 2.5), "120 songs in a row on a station are 120 different tunes, over two and a half hours of music: " + ids.map(k => r[k].hours.toFixed(1) + " h").join(" "));
  ok(r.natt.bpm[1] < 70 && r.fjell.bpm[0] > 110 && r.nordkinn.beats.join() === "3" && r.fjell.beats.join() === "4", `the styles are really different: the night station under 70 bpm, rock over 110, the dance band in three`);
  const a = await J(`(() => { const st = TLXRAD.ST[0], a = TLXRAD.at(st, 50000), b = TLXRAD.at(st, 50000.5), c = TLXRAD.at(st, 50000 + a.s.dur + 20); return { n: a.s.n, same: b.s.n === a.s.n && Math.abs(b.pos - a.pos - 0.5) < 1e-6, later: c.s.n > a.s.n }; })()`);
  ok(a.same && a.later, "a station is a clock: the same moment is the same place in the same song, and later is a later song");
});

await section("B it makes sound, and off is silence", async () => {
  await ev(`TLXRAD.state().on = true; TLXRAD.state().vol = 0.7; true`);
  for (const id of await J(`TLXRAD.ST.map(s => s.id)`)) {
    await ev(`TLXRAD.act("st:${id}"); TLXRAD.forceSong && TLXRAD.forceSong(); true`); await sleep(600); const n0 = await J(`TLXRAD.notes`); const p = await peak(2600); const n1 = await J(`TLXRAD.notes`), tu = await J(`TLXRAD.tuned`);
    ok(tu && tu.st === id && (tu.talk || n1 - n0 > 3 || p.rms > 0.01) && (tu.talk || p.rms > 0.002), `${id}: ${tu && tu.talk ? "the presenter is on" : `"${tu && tu.title}" is playing: ${n1 - n0} notes in 2.6 s, level ${p.rms.toFixed(4)}`}`);
  }
  ok(!(await ev(`TLXRAD.err`)), "no error from any station: " + (await ev(`TLXRAD.err`)));
  await ev(`TLXRAD.act("on"); true`); await sleep(900); const n0 = await J(`TLXRAD.notes`); const p = await peak(1500); const n1 = await J(`TLXRAD.notes`);
  ok(n1 === n0 && p.rms < 0.0015, `switched off: no note is played and the output is silent (${p.rms.toFixed(5)})`);
  await ev(`TLXRAD.act("on"); true`); await sleep(500);
});

await section("C safety updates cut in on every station", async () => {
  for (const id of await J(`TLXRAD.ST.map(s => s.id)`)) {
    await ev(`TLXRAD.act("st:${id}"); true`); await sleep(500); await ev(`TLXRAD.safety("Test warning for ${id}: the road over the fell is shut."); true`); await sleep(700);
    const c = await J(`(() => { const c = TLXRAD.caps[TLXRAD.caps.length - 1], l = TLXRAD.log[TLXRAD.log.length - 1]; return { kind: c && c.kind, text: c && c.text, st: l && l.st, el: document.getElementById("radioCap").innerText }; })()`);
    ok(c.kind === "alert" && c.st === id && /SAFETY/.test(c.el) && /road over the fell/.test(c.el), `${id}: the warning is read out over the music`);
    await sleep(8200);
  }
  await ev(`TLXN.post({ kind: "storm", text: "A storm is building west of the peninsula." }); TLXN.post({ kind: "ski", text: "Lovely on Lysløypa today." }); true`); await sleep(900);
  const l = await J(`TLXRAD.alerts.map(a => a.text)`); ok(l.some(t => /storm is building/.test(t)) && !l.some(t => /Lysløypa/.test(t)), "a storm on the village news is a safety update; a ski report is not");
  await sleep(8600); await ev(`WX.at = () => 0.9; true`); let s2 = []; for (let i = 0; i < 30; i++) { await sleep(400); s2 = await J(`TLXRAD.alerts.map(a => a.text)`); if (s2.some(t => /storm is over the peninsula/.test(t))) break; } await ev(`WX.at = () => 0; GS.storm = 0; true`);
  ok(s2.some(t => /storm is over the peninsula/.test(t)), "the storm arriving is announced whatever is on");
});

await section("D reception and where the radio is", async () => {
  const r = await J(`(() => { const x = P.x, z = P.z, s = GS.storm; const here = TLXRAD.reception(); const m = TLX.api.world.SITES.find(q => q.type === "relay"); P.x = m.x + 40; P.z = m.z + 40; const atMast = TLXRAD.reception(); GS.storm = 1; const inStorm = TLXRAD.reception(); GS.storm = 0; let worst = 1, wp = null; for (const v of TLX.api.world.SITES) { if (v.x === undefined) continue; P.x = v.x; P.z = v.z; const q = TLXRAD.reception(); if (q < worst) { worst = q; wp = v.name; } } P.x = x; P.z = z; GS.storm = s; return { here, atMast, inStorm, worst, wp }; })()`);
  ok(r.atMast > 0.95 && r.inStorm < r.atMast - 0.2 && r.worst < r.atMast - 0.15, `by the mast the signal is full (${r.atMast.toFixed(2)}), a storm takes it down (${r.inStorm.toFixed(2)}), and behind the fell at ${r.wp} it is poor (${r.worst.toFixed(2)})`);
  await ev(`FOOT.on = true; FOOT.x = P.x + 3; FOOT.z = P.z; true`); await sleep(400); const near = await J(`TLXRAD.near`);
  await ev(`FOOT.x = P.x + 45; true`); await sleep(400); const far = await J(`TLXRAD.near`); await ev(`FOOT.on = false; true`); await sleep(300);
  ok(near > 0.6 && far < 0.03 && (await J(`TLXRAD.near`)) === 1, `on foot the radio is the sled's: clear beside it (${near.toFixed(2)}), gone at 45 m (${far.toFixed(3)}), full again in the saddle`);
});

await section("E what is said, and the app", async () => {
  const t = await J(`(() => { TLXN.post({ kind: "wildlife", who: TLXN.people[5].id, place: "Mehamn", text: "A moose in the school yard, taking its time." }); const st = TLXRAD.ST[0], s = TLXRAD.song(st, 3), L = TLXRAD.talk(st, s, TLXRAD.song(st, 4)); const v = TLXRAD.ST[3], L2 = TLXRAD.talk(v, TLXRAD.song(v, 3), TLXRAD.song(v, 4)); return { L, L2, title: s.title, next: TLXRAD.song(st, 4).title }; })()`);
  ok(t.L[0][1].includes(t.title) && t.L[t.L.length - 1][1].includes(t.next) && t.L.some(l => /weather/i.test(l[1])), "between songs the presenter names the tune that was, the weather and the tune to come");
  ok(t.L.some(l => /rings in|Word from/.test(l[0] + l[1])), "Radio Nordkinn reads out what the villages have seen: " + JSON.stringify(t.L[1]).slice(0, 140));
  ok(t.L2.some(l => /drivers|Roads/.test(l[1])), "the drivers' station does the roads");
  await ev(`TLX.api.TABLET.toggle(true, "radio"); true`); await sleep(700);
  const a = await J(`(() => { const el = document.getElementById("tabS"); return { txt: el.innerText.slice(0, 900), acts: [...el.querySelectorAll("[data-act]")].map(b => b.dataset.act) }; })()`);
  ok(["on", "nx", "pv", "vu", "vd", "vo"].every(k => a.acts.includes(k)) && a.acts.filter(k => k.startsWith("st:")).length === 6 && /SIGNAL/.test(a.txt), "the app: on/off, station back and forward, quieter / louder, six stations to tune, spoken voice, the signal");
  const before = await J(`({ st: TLXRAD.state().st, vol: TLXRAD.state().vol })`); await ev(`document.querySelector('#tabS [data-act="nx"]').click(); document.querySelector('#tabS [data-act="vd"]').click(); true`); await sleep(400);
  const after = await J(`({ st: TLXRAD.state().st, vol: TLXRAD.state().vol })`); ok(after.st !== before.st && Math.abs(after.vol - (before.vol - 0.1)) < 1e-6, `the buttons work: ${before.st} -> ${after.st}, volume ${before.vol} -> ${after.vol}`);
  await shot("radio_app", 90); await ev(`TLX.api.TABLET.toggle(false); save(); true`);
  await reload(); await ev(`tutSkip(); crashCancel(); true`); await sleep(900);
  const kept = await J(`({ st: TLXRAD.state().st, vol: TLXRAD.state().vol, on: TLXRAD.state().on })`); ok(kept.st === after.st && Math.abs(kept.vol - after.vol) < 1e-6 && kept.on, "the station and volume are kept in the save");
  ok(!(await ev(`TLXRAD.err`)), "no radio error");
});
console.log(fails ? `FAILS: ${fails}` : "all passed");
await done(fails ? 1 : 0);
