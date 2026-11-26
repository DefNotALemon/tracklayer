// Tracklayer: the radio (goal G7, loop/HOME.md I4). A radio on the sled and in every cab, with real sound.
// Six stations, each its own style, all made in the browser (WebAudio oscillators and noise, nothing to load):
//   Radio Nordkinn (local talk, call-ins from the village news, gammeldans), Fjell FM (rock), Nattradio (ambient),
//   Veiradio (country, the drivers' station), Sámi Radio (joik-inspired), P2 Klassisk (piano and strings).
// A station is a clock: a song is a seed, every bar of it is worked out from the seed and the bar's number, so tuning
// in lands you in the middle of whatever is on, and a station does not repeat a tune for hours. Between songs the
// presenter talks (captions always; the browser's voice if switched on). SAFETY UPDATES cut in on every station:
// a two-tone alert, the music ducked, the warning read out. Reception fades behind the fell from the mast at
// Slettnes and in a storm: hiss, dull treble, dropouts. On foot the radio is heard from the sled, fading with distance.
(() => {
"use strict";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const mulb = a => () => { a |= 0; a = a + 0x6d2b79f5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const hz = n => 440 * Math.pow(2, (n - 69) / 12);
const MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10], PENT = [0, 3, 5, 7, 10], MAJP = [0, 2, 4, 7, 9];
const deg = (scale, d) => scale[((d % scale.length) + scale.length) % scale.length] + 12 * Math.floor(d / scale.length);
let api = null, S = null;
const X = window.TLXRAD = { ready: false, err: "", caps: [], alerts: [], notes: 0, log: [], q: 1, tuned: null, hold: false };

/* ---------------- the stations ---------------- */
const ST = [
  { id: "nordkinn", name: "Radio Nordkinn", mhz: "92.4", style: "gammeldans", host: "Ragnhild", tag: "the voice of the peninsula" },
  { id: "fjell", name: "Fjell FM", mhz: "101.7", style: "rock", host: "Stian", tag: "loud enough for the fell" },
  { id: "natt", name: "Nattradio", mhz: "88.1", style: "ambient", host: "Liv", tag: "for the dark months" },
  { id: "vei", name: "Veiradio", mhz: "104.3", style: "country", host: "Odd", tag: "for everyone with a plow on the front" },
  { id: "sami", name: "Sámi Radio", mhz: "96.9", style: "joik", host: "Máret", tag: "Sámi Radio, Davvin" },
  { id: "p2", name: "P2 Klassisk", mhz: "99.5", style: "classical", host: "Henrik", tag: "music, and the news on the hour" }
];
X.ST = ST;
const stOf = id => ST.find(s => s.id === id) || ST[0];
// a song: everything a bar needs, from the station and the song's number
const TITLES = {
  gammeldans: [["Vals", "Reinlender", "Polka", "Masurka"], ["fra Kjøllefjord", "over Ifjordfjellet", "til Marit", "på kaia", "i mørketida", "fra Dyfjord", "for plogmannen", "ved fyret"]],
  rock: [["Whiteout", "Carbide", "Two-Stroke", "Black Ice", "Overdrive", "Northern", "Cold Start", "Full Throttle"], ["Heart", "Road", "Night", "Thunder", "Machine", "Blues", "Sunday", "Radio"]],
  ambient: [["Blue hour", "Snowfall", "Drift", "Aurora", "Still water", "Polar night", "Frost", "Far lights"], ["I", "II", "III", "over the fjord", "at four", "for no one", "slowly", "from the hut"]],
  country: [["Diesel", "Long way to", "Plow driver's", "Last ferry from", "Coffee at", "Headlights on", "Chains on", "Sixty below in"], ["Blues", "Mehamn", "Waltz", "Lebesby", "the Depot", "the Fell", "My Mind", "Ifjord"]],
  joik: [["Luohti", "Vuelie", "Joik"], ["for the herd", "for the wind", "for the fell", "for áhkku", "for the river", "for the white reindeer", "for the first sun", "for a friend"]],
  classical: [["Prelude", "Nocturne", "Étude", "Impromptu", "Berceuse", "Elegy", "Romance", "Intermezzo"], ["in D minor", "in A", "in E flat", "for the north", "in G minor", "in F", "No. 2", "No. 5"]]
};
function song(st, n) {
  const r = mulb((st.id.charCodeAt(0) * 7919 + st.id.charCodeAt(1) * 104729 + n * 2654435761) | 0), pick = a => a[Math.floor(r() * a.length)], T = TITLES[st.style];
  const o = { n, st: st.id, style: st.style, key: 45 + Math.floor(r() * 12), seed: Math.floor(r() * 1e9), title: pick(T[0]) + " " + pick(T[1]) };
  if (st.style === "gammeldans") { o.bpm = 150 + r() * 36; o.beats = 3; o.bars = 120; o.scale = MAJ; o.prog = pick([[0, 0, 4, 4, 4, 4, 0, 0], [0, 3, 4, 0, 0, 3, 4, 0], [0, 0, 3, 3, 4, 4, 0, 0]]); }
  else if (st.style === "rock") { o.bpm = 118 + r() * 34; o.beats = 4; o.bars = 56; o.scale = MIN; o.key -= 5; o.prog = pick([[0, 0, 5, 6], [0, 5, 2, 6], [0, 3, 6, 5], [0, 6, 5, 6]]); }
  else if (st.style === "ambient") { o.bpm = 50 + r() * 14; o.beats = 4; o.bars = 26; o.scale = pick([MAJ, MIN]); o.prog = pick([[0, 3, 5, 3], [0, 5, 3, 4], [0, 2, 3, 0], [5, 3, 0, 4]]); }
  else if (st.style === "country") { o.bpm = 96 + r() * 30; o.beats = 4; o.bars = 52; o.scale = MAJ; o.prog = pick([[0, 0, 3, 0, 4, 3, 0, 4], [0, 3, 0, 4, 0, 3, 4, 0], [0, 0, 0, 3, 3, 0, 4, 0]]); }
  else if (st.style === "joik") { o.bpm = 84 + r() * 28; o.beats = 4; o.bars = 44; o.scale = pick([PENT, MAJP]); o.key += 3; o.prog = [0]; }
  else { o.bpm = 62 + r() * 40; o.beats = r() < 0.4 ? 3 : 4; o.bars = 40; o.scale = pick([MIN, MAJ, MIN]); o.prog = pick([[0, 3, 4, 0, 5, 3, 4, 0], [0, 5, 3, 4, 0, 5, 1, 4], [0, 4, 5, 2, 3, 0, 3, 4]]); }
  // a motif: steps of the scale, one a beat-half, said twice and answered
  o.motif = []; let d = Math.floor(r() * 5); for (let i = 0; i < 16; i++) { d += Math.floor(r() * 5) - 2; d = clamp(d, -2, 9); o.motif.push(r() < 0.22 ? null : d); }
  o.bar = 60 / o.bpm * o.beats; o.dur = o.bars * o.bar; return o;
}
X.song = song;
// the station's clock: which song is on at station time T, and where in it. A break for talk follows every song.
const TALK = 14;
function at(st, T) {
  const c = st._c; if (c && T >= c.t0 && T < c.t0 + c.s.dur + TALK) return { s: c.s, t0: c.t0, pos: T - c.t0, talk: T - c.t0 >= c.s.dur };
  let n = Math.floor(T / 150), t0 = 0;                                                                     // close guess, then walk: songs are 90-200 s
  // walk from an anchor every 64 songs so far times stay cheap
  const A = st._a || (st._a = [{ n: 0, t: 0 }]); let a = A[0]; for (const q of A) if (q.t <= T) a = q; n = a.n; t0 = a.t;
  for (let guard = 0; guard < 100000; guard++) { const s = song(st, n), end = t0 + s.dur + TALK; if (T < end) { st._c = { s, t0 }; return { s, t0, pos: T - t0, talk: T - t0 >= s.dur }; } t0 = end; n++; if (n % 64 === 0 && A[A.length - 1].n < n) A.push({ n, t: t0 }); }
  return null;
}
X.at = at;

/* ---------------- the sound ---------------- */
let G = null;                                                                                              // the graph: out -> tone -> master; static beside it
function graph() {
  const au = api.audio(); if (!au) return null; if (G && G.AC === au.AC) return G;
  const AC = au.AC, out = AC.createGain(), lp = AC.createBiquadFilter(), hp = AC.createBiquadFilter(), comp = AC.createDynamicsCompressor(), vol = AC.createGain(), stat = AC.createGain(), sf = AC.createBiquadFilter(), ns = AC.createBufferSource();
  lp.type = "lowpass"; lp.frequency.value = 9000; hp.type = "highpass"; hp.frequency.value = 130; comp.threshold.value = -16; comp.ratio.value = 5; vol.gain.value = 0;
  out.connect(hp); hp.connect(lp); lp.connect(comp); comp.connect(vol); vol.connect(au.master);
  ns.buffer = au.buf; ns.loop = true; sf.type = "bandpass"; sf.frequency.value = 2600; sf.Q.value = 0.4; stat.gain.value = 0; ns.connect(sf); sf.connect(stat); stat.connect(vol); ns.start();
  const alert = AC.createGain(); alert.gain.value = 1; alert.connect(vol);
  const dl = AC.createDelay(1.5), fb = AC.createGain(), wet = AC.createGain(); dl.delayTime.value = 0.42; fb.gain.value = 0.45; wet.gain.value = 0.5; dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(out);   // an echo send for the slow stations
  const dist = AC.createWaveShaper(), dg = AC.createGain(), cv = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; cv[i] = Math.tanh(x * 4.5) * 0.8; } dist.curve = cv; dg.gain.value = 0.55; dist.connect(dg); dg.connect(out);   // a fuzz box for the guitars
  G = { AC, out, lp, vol, stat, alert, echo: dl, dist, buf: au.buf, bus: null }; return G;
}
function newBus() { const b = G.AC.createGain(); b.gain.value = 1; b.connect(G.out); return b; }
// one note. o: { type, a (attack), r (release), det (a second oscillator, cents), vib, to (send: "echo" | "dist"), lp, from (glide from this pitch) }
function tone(bus, f, t, d, v, o) {
  if (!(f > 20) || !(v > 0)) return; o = o || {}; const AC = G.AC, g = AC.createGain(), a = o.a === undefined ? 0.008 : o.a, r = o.r === undefined ? 0.08 : o.r, n = o.det ? 2 : 1; X.notes++;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + a); if (o.dec) g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v * o.dec), t + d); else g.gain.setValueAtTime(v, t + Math.max(a, d - 0.01)); g.gain.linearRampToValueAtTime(0.0001, t + d + r);
  let dst = g; if (o.lp) { const fl = AC.createBiquadFilter(); fl.type = o.bp ? "bandpass" : "lowpass"; fl.frequency.value = o.lp; if (o.q) fl.Q.value = o.q; g.connect(fl); dst = fl; }
  dst.connect(o.to === "dist" ? G.dist : bus); if (o.to === "echo" || o.echo) { const s = AC.createGain(); s.gain.value = o.echo || 0.5; dst.connect(s); s.connect(G.echo); }
  for (let i = 0; i < n; i++) { const os = AC.createOscillator(); os.type = o.type || "triangle"; if (o.from) { os.frequency.setValueAtTime(o.from, t); os.frequency.exponentialRampToValueAtTime(f, t + Math.min(0.12, d * 0.5)); } else os.frequency.setValueAtTime(f, t); if (i) os.detune.value = o.det;
    if (o.vib) { const l = AC.createOscillator(), lg = AC.createGain(); l.frequency.value = o.vib; lg.gain.value = f * 0.012; l.connect(lg); lg.connect(os.frequency); l.start(t); l.stop(t + d + r + 0.05); }
    os.connect(g); os.start(t); os.stop(t + d + r + 0.05); }
}
function hit(bus, t, d, v, f, type, q) { const AC = G.AC, s = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = G.buf; s.loop = true; fl.type = type || "highpass"; fl.frequency.value = f; if (q) fl.Q.value = q; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0005, t + d); s.connect(fl); fl.connect(g); g.connect(bus); s.start(t, (t * 7.3) % 1.5); s.stop(t + d + 0.02); X.notes++; }
const kick = (bus, t, v) => { const AC = G.AC, os = AC.createOscillator(), g = AC.createGain(); os.frequency.setValueAtTime(140, t); os.frequency.exponentialRampToValueAtTime(42, t + 0.12); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.24); os.connect(g); g.connect(bus); os.start(t); os.stop(t + 0.26); X.notes++; };
const triad = (s, d) => [deg(s.scale, d), deg(s.scale, d + 2), deg(s.scale, d + 4)];
// one bar of a song at time t
function bar(bus, s, i, t) {
  const r = mulb((s.seed + i * 40503) | 0), beat = 60 / s.bpm, ch = s.prog[i % s.prog.length], tri = triad(s, ch), root = s.key + tri[0], sect = Math.floor(i / 8) % 4, B = sect === 2, last = i >= s.bars - 2, first = i < 2;
  const mel = k => { const m = s.motif[(k + (B ? 8 : 0)) % 16]; return m === null ? null : s.key + 12 + deg(s.scale, m + (B ? 2 : 0) + ch % 3); };
  if (s.style === "gammeldans") {                                                                           // oom-pah-pah, an accordion on top
    tone(bus, hz(root - 12), t, beat * 0.8, 0.2, { type: "triangle", dec: 0.3 });
    for (let b = 1; b < 3; b++) for (const n of tri) tone(bus, hz(s.key + n), t + b * beat, beat * 0.32, 0.05, { type: "sawtooth", det: 9, lp: 2400 });
    for (let k = 0; k < 6; k++) { const m = mel(i * 6 + k); if (m !== null && (k % 2 === 0 || r() < 0.55)) tone(bus, hz(m), t + k * beat / 2, beat * (k % 2 ? 0.42 : 0.5), 0.085, { type: "sawtooth", det: 11, lp: 3200, vib: 5.5, a: 0.02 }); }
  } else if (s.style === "rock") {
    const fill = i % 8 === 7;
    for (let b = 0; b < 4; b++) { if (b % 2 === 0 || (b === 3 && r() < 0.3)) kick(bus, t + b * beat, 0.5); if (b % 2 === 1) hit(bus, t + b * beat, 0.16, 0.3, 1400, "bandpass", 0.7); for (let h = 0; h < 2; h++) hit(bus, t + (b + h / 2) * beat, 0.04, 0.07, 7000); }
    if (fill) for (let k = 0; k < 4; k++) hit(bus, t + (3 + k / 4) * beat, 0.12, 0.22, 500 + k * 250, "bandpass", 1.2);
    for (let k = 0; k < 8; k++) { if (first && k > 0) break; const on = k % 2 === 0 || r() < 0.6; if (on) { tone(bus, hz(root - 12), t + k * beat / 2, beat * 0.42, 0.11, { type: "sawtooth", to: "dist", lp: 1800 }); tone(bus, hz(root - 5), t + k * beat / 2, beat * 0.42, 0.08, { type: "sawtooth", to: "dist", lp: 1800 }); } }
    tone(bus, hz(root - 24), t, beat * 3.6, 0.2, { type: "triangle" });
    if (sect >= 1 && !last) for (let k = 0; k < 8; k++) { const m = mel(i * 8 + k); if (m !== null && r() < 0.75) tone(bus, hz(m + 12 * (sect === 3 ? 1 : 0)), t + k * beat / 2, beat * 0.45, 0.07, { type: "square", lp: 3000, vib: 6, from: r() < 0.25 ? hz(m - 2) : 0, echo: 0.25 }); }
  } else if (s.style === "ambient") {
    for (const n of tri) tone(bus, hz(s.key + n), t, s.bar * 1.15, 0.07, { type: "sine", a: s.bar * 0.45, r: s.bar * 0.6, det: 6, echo: 0.6 });
    tone(bus, hz(root - 12), t, s.bar * 1.1, 0.09, { type: "sine", a: s.bar * 0.5, r: s.bar * 0.5 });
    for (let k = 0; k < 4; k++) if (r() < 0.38) { const m = s.key + 24 + deg(s.scale, Math.floor(r() * 7) + ch); tone(bus, hz(m), t + k * beat + r() * 0.2, 1.6, 0.05, { type: "sine", dec: 0.05, r: 1.2, echo: 0.9 }); }
  } else if (s.style === "country") {                                                                       // boom-chick with a swing, a twangy lead
    const sw = k => (k % 2 ? 0.62 : 0) * beat + Math.floor(k / 2) * beat;
    for (let b = 0; b < 4; b++) { tone(bus, hz(s.key - 12 + (b % 2 ? tri[2] - 12 : tri[0])), t + b * beat, beat * 0.5, b % 2 ? 0 : 0.2, { type: "triangle", dec: 0.25 }); if (b % 2 === 0) tone(bus, hz(s.key - 12 + (b === 2 ? tri[2] - 12 : tri[0])), t + b * beat, beat * 0.5, 0.2, { type: "triangle", dec: 0.25 }); else { for (const n of tri) tone(bus, hz(s.key + n), t + b * beat + 0.012 * (n % 5), 0.14, 0.05, { type: "triangle", dec: 0.1, lp: 3500 }); hit(bus, t + b * beat, 0.07, 0.1, 3000); } }
    if (sect !== 0 || i % 2) for (let k = 0; k < 8; k++) { const m = mel(i * 8 + k); if (m !== null && r() < 0.7) tone(bus, hz(m), t + sw(k), beat * 0.4, 0.08, { type: "sawtooth", lp: 2600, q: 3, from: r() < 0.3 ? hz(m - 1) : 0, dec: 0.3, echo: 0.15 }); }
    if (i % 4 === 3) tone(bus, hz(s.key + 12 + tri[1]), t + 2 * beat, beat * 1.8, 0.05, { type: "sine", vib: 5, from: hz(s.key + 12 + tri[0]), a: 0.05, echo: 0.3 });   // the steel guitar sliding up
  } else if (s.style === "joik") {                                                                          // a frame drum, a drone, one voice turning a phrase over and over
    for (let b = 0; b < 4; b++) { const v = b === 0 ? 0.42 : b === 2 ? 0.3 : 0.14; kick(bus, t + b * beat, v * 0.8); hit(bus, t + b * beat, 0.09, v * 0.25, 260, "bandpass", 1.5); if (r() < 0.3) hit(bus, t + (b + 0.5) * beat, 0.05, 0.06, 320, "bandpass", 2); }
    tone(bus, hz(s.key - 12), t, s.bar, 0.06, { type: "sawtooth", lp: 420, a: 0.3, r: 0.4 }); tone(bus, hz(s.key - 5), t, s.bar, 0.035, { type: "sawtooth", lp: 500, a: 0.3, r: 0.4 });
    if (i >= 2 && !(i % 8 === 7 && r() < 0.6)) { const ph = (i % 4) * 4, lift = Math.floor(i / 16) % 2 ? 1 : 0; let k = 0; while (k < 8) { const m = s.motif[(ph + k) % 16], len = r() < 0.3 ? 2 : 1; if (m !== null) { const n = s.key + 12 + deg(s.scale, clamp(m, 0, 7) + lift), f = hz(n); for (const [fo, q, v] of [[700, 5, 0.1], [1150, 6, 0.06], [2600, 7, 0.025]]) tone(bus, f, t + k * beat / 2, beat * 0.5 * len * 0.95, v, { type: "sawtooth", lp: fo, bp: 1, q, vib: 5.2, a: 0.05, r: 0.09, from: r() < 0.45 ? hz(n - 2) : 0, echo: 0.25 }); } k += len; } }
  } else {                                                                                                   // classical: a piano's broken chords and a singing line, strings under the second half
    const n8 = s.beats * 2; for (let k = 0; k < n8; k++) { const n = s.key - 12 + tri[k % 3] + (k % 6 >= 3 ? 12 : 0); tone(bus, hz(n), t + k * beat / 2, beat * 0.9, 0.07, { type: "triangle", dec: 0.12, r: 0.3, echo: 0.2 }); }
    tone(bus, hz(root - 24), t, s.bar * 0.95, 0.1, { type: "sine", dec: 0.3, r: 0.4 });
    for (let k = 0; k < s.beats; k++) { const m = mel(i * 4 + k); if (m !== null && (k === 0 || r() < 0.7)) { tone(bus, hz(m), t + k * beat, beat * 0.95, 0.11, { type: "triangle", dec: 0.2, r: 0.5, echo: 0.3 }); tone(bus, hz(m) * 2, t + k * beat, beat * 0.5, 0.02, { type: "sine", dec: 0.1, r: 0.3 }); } }
    if (sect >= 2) for (const n of tri) tone(bus, hz(s.key + n), t, s.bar * 1.02, 0.03, { type: "sawtooth", lp: 1500, det: 8, a: s.bar * 0.3, r: s.bar * 0.3, vib: 4.5 });
  }
}
// the station's jingle: three notes and its own colour
function jingle(bus, st, t) { const k = { nordkinn: [69, 73, 76], fjell: [57, 57, 64], natt: [72, 79, 76], vei: [62, 66, 69], sami: [67, 70, 74], p2: [64, 71, 68] }[st.id]; k.forEach((n, i) => tone(bus, hz(n), t + i * 0.22, 0.4, 0.12, { type: st.id === "fjell" ? "sawtooth" : "triangle", to: st.id === "fjell" ? "dist" : null, dec: 0.2, r: 0.5, echo: 0.5, det: st.id === "nordkinn" ? 10 : 0 })); }
// the alert that cuts in on every station
function alertTone(t) { for (let i = 0; i < 4; i++) { const os = G.AC.createOscillator(), g = G.AC.createGain(), a = t + i * 0.33; os.type = "sine"; os.frequency.value = i % 2 ? 960 : 853; g.gain.setValueAtTime(0.0001, a); g.gain.linearRampToValueAtTime(0.22, a + 0.02); g.gain.setValueAtTime(0.22, a + 0.27); g.gain.linearRampToValueAtTime(0.0001, a + 0.31); os.connect(g); g.connect(G.alert); os.start(a); os.stop(a + 0.34); } }

/* ---------------- what is said ---------------- */
function cap(who, text, kind, secs) {
  const c = { t: performance.now(), who, text, kind: kind || "talk", st: S.st, secs: secs || 6 }; X.caps.push(c); if (X.caps.length > 40) X.caps.shift(); showCap(c);
  if (S.voice && window.speechSynthesis && !X.mute) { try { const u = new SpeechSynthesisUtterance(text); u.rate = 1.02; u.volume = clamp(S.vol * X.q * (X.near || 0), 0, 1); speechSynthesis.speak(u); } catch (e) { /* no voice on this device */ } }
}
let capEl = null, capT = 0;
function showCap(c) {
  if (!capEl) { capEl = document.createElement("div"); capEl.id = "radioCap"; capEl.setAttribute("aria-live", "polite"); capEl.style.cssText = "position:fixed;left:50%;bottom:max(6px,env(safe-area-inset-bottom));transform:translateX(-50%);max-width:min(560px,62vw);padding:4px 10px;border-radius:8px;background:rgba(8,14,20,.72);color:#e9f1f7;font:500 12px/1.3 'Barlow Semi Condensed',system-ui,sans-serif;pointer-events:none;z-index:6;text-align:center;opacity:0;transition:opacity .35s"; document.body.appendChild(capEl); }
  const st = stOf(c.st); capEl.innerHTML = `<span style="color:${c.kind === "alert" ? "#ffb04a" : "#8fc4f0"};font-weight:700;letter-spacing:.06em;font-size:10px">${c.kind === "alert" ? "⚠ SAFETY · " : ""}${st.name.toUpperCase()} ${st.mhz}${c.who ? " · " + esc(c.who) : ""}</span><br>${esc(c.text)}`;
  capEl.style.opacity = X.near > 0.08 ? "1" : "0"; capT = performance.now() + c.secs * 1000;
}
const esc = t => String(t).replace(/[&<>"]/g, q => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[q]));
const wxWord = () => { const g = api.GS; return g.stormPhase === "storm" ? "a storm over the peninsula: stay off the fell if you can" : g.warned ? "a storm on the way, be where you mean to be before it comes" : g.storm > 0.2 ? "snow showers, light wind" : "clear and cold, a good day to be out"; };
const clock = () => { const h = ((api.GS.hour % 24) + 24) % 24; return String(Math.floor(h)).padStart(2, "0") + ":" + String(Math.floor((h % 1) * 60)).padStart(2, "0"); };
// the talk after a song: said in the 14 s before the next one
function talk(st, s, next) {
  const r = mulb((s.seed ^ 0x5bd1e995) | 0), N = window.TLXN, lines = [];
  const recent = N && N.since ? N.since(api.GS.hour - 30).filter(p => p && p.text && p.kind !== "ski").slice(-12) : [], pickN = () => recent.length ? recent[Math.floor(r() * recent.length)] : null;
  const name = p => { const w = p && p.who && N.people && N.people.find ? N.people.find(q => q.id === p.who) : null; return p && p.who === "you" ? "a listener" : w ? w.first + (w.vname ? " in " + w.vname : "") : null; };
  lines.push([st.host, `That was "${s.title}". You are on ${st.name}, ${st.tag}. It is ${clock()}.`]);
  if (st.id === "nordkinn") { const p = pickN(); if (p) { const who = name(p); lines.push([who ? who + " rings in" : st.host, who ? `"${p.text}"` : `Word from ${p.place || "the peninsula"}: ${p.text}`]); } else lines.push([st.host, "Ring in with what you have seen out there: the trail, the road, the reindeer. The line is open."]); lines.push([st.host, `The weather: ${wxWord()}.`]); }
  else if (st.id === "vei") { const p = recent.filter(q => q.kind === "road" || q.kind === "ferry" || q.kind === "storm").pop(); lines.push([st.host, p ? `For the drivers: ${p.text}` : `Roads on the Nordkinn: ${api.GS.stormPhase === "storm" ? "hard going, convoy driving where the barriers are down" : "open, mind the drifts on the fell"}.`]); lines.push([st.host, "Keep the coffee hot and the beacon on."]); }
  else if (st.id === "p2") { const p = pickN(); lines.push([st.host, p ? `The news in brief. From ${p.place || "the Nordkinn"}: ${p.text}` : `The news in brief: a quiet day on the Nordkinn.`]); lines.push([st.host, `The forecast: ${wxWord()}.`]); }
  else if (st.id === "natt") lines.push([st.host, api.GS.stormPhase === "storm" ? "Wind against the wall tonight. Stay in, if you can. We will keep you company." : "Still out there? Look up now and then. This next one is slow."]);
  else if (st.id === "sami") lines.push([st.host, "Bures buot guldaleddjiide. To everyone with the herd tonight: " + wxWord() + "."]);
  else lines.push([st.host, api.GS.stormPhase === "storm" ? "If you can hear this over the wind, turn it up." : "Throttle open, visor down. Here we go."]);
  lines.push([st.host, `Next: "${next.title}".`]);
  return lines;
}
X.talk = talk;

/* ---------------- safety updates: on every station ---------------- */
const QA = [];
function safety(text, key) { if (!text) return; const k = key || text; if (X.alerts.some(a => a.key === k && performance.now() - a.t < 60000)) return; const a = { key: k, text, t: performance.now(), h: api.GS.hour, played: false, st: null }; X.alerts.push(a); if (X.alerts.length > 30) X.alerts.shift(); QA.push(a); }
X.safety = safety;
const SAFE = { storm: 1, road: 1, rescue: 1, avalanche: 1, ice: 1, convoy: 1 };
function onPost(p) { if (!p || !p.text || !SAFE[p.kind]) return; if (p.kind === "rescue" && !(Math.hypot((p.x || 0) - api.P.x, (p.z || 0) - api.P.z) < 2500)) return; safety(p.text, p.kind + ":" + p.id); }
let ph0 = null, warn0 = null;
function watchWx() { const g = api.GS; if (ph0 === null) { ph0 = g.stormPhase; warn0 = !!g.warned; return; } if (g.warned && !warn0 && g.stormPhase !== "storm") safety("Storm warning for the Nordkinn peninsula. Snow and strong wind within hours. Finish what you are doing and get to shelter.", "warn:" + Math.floor(g.hour)); if (g.stormPhase !== ph0) safety(g.stormPhase === "storm" ? "The storm is over the peninsula now. Visibility on the fell is close to nothing. Do not set out." : "The storm has passed. Roads are being cleared: expect drifts and the plow.", "ph:" + g.stormPhase + Math.floor(g.hour)); ph0 = g.stormPhase; warn0 = !!g.warned; }

/* ---------------- reception ---------------- */
let mast = null, qT = 0;
function reception() {
  const W = api.world, P = api.P, F = api.FOOT, x = F && F.on ? F.x : P.x, z = F && F.on ? F.z : P.z;
  if (!mast) { const s = (W.SITES || []).find(q => q.type === "relay" && q.x !== undefined); mast = s ? { x: s.x, z: s.z, y: W.groundAt(s.x, s.z) + 45 } : { x: 2750, z: -3560, y: 60 }; }
  // how much hill stands between you and the mast: the deepest the straight line runs under the ground
  let under = 0; const y0 = W.groundAt(x, z) + 2, n = 14; for (let i = 1; i < n; i++) { const k = i / n, gx = lerp(x, mast.x, k), gz = lerp(z, mast.z, k), line = lerp(y0, mast.y, k); under = Math.max(under, W.groundAt(gx, gz) - line); }
  const d = Math.hypot(x - mast.x, z - mast.z); let q = 1 - clamp(under / 160, 0, 0.6) - clamp((d - 5000) / 12000, 0, 0.2) - clamp(api.GS.storm || 0, 0, 1) * 0.3; return clamp(q, 0.12, 1);
}

/* ---------------- running it ---------------- */
let T0 = null, next = 0, cur = null, talked = -1, jing = -1, gate = 1, gateT = 0, duck = 1, duckT = 0, capsQ = [];
const stationTime = () => { if (T0 === null) T0 = 40000 + (Date.now() / 1000) % 20000 - G.AC.currentTime; return T0 + G.AC.currentTime; };
function retune() { if (G && G.bus) { const b = G.bus, t = G.AC.currentTime; b.gain.setValueAtTime(b.gain.value, t); b.gain.linearRampToValueAtTime(0, t + 0.12); setTimeout(() => { try { b.disconnect(); } catch (e) { } }, 1500); G.bus = null; } cur = null; next = 0; talked = -1; jing = -1; capsQ.length = 0; X.tuned = null; }
function tick(dt) {
  if (!api || !api.started()) return; watchWx();
  const now = performance.now(); if (capEl && now > capT) capEl.style.opacity = "0";
  if (!S.on || X.hold) { if (G) { G.vol.gain.setTargetAtTime(0, G.AC.currentTime, 0.08); G.stat.gain.setTargetAtTime(0, G.AC.currentTime, 0.08); } if (cur) retune(); QA.length = 0; return; }
  if (!graph()) return; const AC = G.AC, t = AC.currentTime, st = stOf(S.st);
  // where the radio is: under you on the sled or in the cab; on foot it stays with the sled and fades with distance
  const F = api.FOOT, P = api.P, inCab = api.veh && api.veh.cur; let near = 1; if (F && F.on && !inCab) { const d = Math.hypot(F.x - P.x, F.z - P.z); near = d > 60 ? 0 : 1 / (1 + Math.pow(d / 5, 2)); } X.near = near;
  qT -= dt; if (qT <= 0) { qT = 0.5; try { X.q = reception(); } catch (e) { X.q = 1; } }
  const q = X.q; gateT -= dt; if (gateT <= 0) { gateT = 0.08 + Math.random() * 0.25; gate = q < 0.4 && Math.random() < (0.4 - q) * 1.6 ? 0.08 : 1; }          // dropouts when it is bad
  if (now >= duckT) duck = 1;
  G.vol.gain.setTargetAtTime(S.vol * near * 0.9, t, 0.1); G.stat.gain.setTargetAtTime((1 - q) * 0.5, t, 0.2); G.lp.frequency.setTargetAtTime(lerp(1400, 9000, q), t, 0.2);
  if (!G.bus) { G.bus = newBus(); } G.bus.gain.setTargetAtTime(gate * duck * (0.35 + 0.65 * q), t, 0.05);
  // the music: schedule bars a little ahead
  const T = stationTime(); let a = at(st, T + 0.05); if (!a) return; X.tuned = { st: st.id, title: a.s.title, n: a.s.n, pos: a.pos, talk: a.talk, q };
  if (!cur || cur.n !== a.s.n) { cur = a.s; next = 0; }
  if (!a.talk) { const first = Math.max(0, Math.ceil((a.pos - 0.02) / cur.bar)); if (next < first) next = first; while (next < cur.bars && a.t0 + next * cur.bar < T + 0.4) { const when = t + (a.t0 + next * cur.bar - T); if (when > t - 0.01) { try { bar(G.bus, cur, next, Math.max(when, t + 0.01)); } catch (e) { X.err = String(e); } } next++; } }
  else {
    if (jing !== cur.n) { jing = cur.n; jingle(G.bus, st, t + 0.3); }
    if (talked !== cur.n) { talked = cur.n; const L = talk(st, cur, song(st, cur.n + 1)), left = Math.max(2, cur.dur + TALK - a.pos - 0.5); capsQ = L.slice(0, Math.max(1, Math.floor(left / 3.4))).map((l, i) => ({ at: now + 900 + i * (left / Math.min(L.length, Math.max(1, Math.floor(left / 3.4)))) * 1000, l, secs: Math.min(5.5, left / L.length + 1.5) })); }
  }
  while (capsQ.length && now >= capsQ[0].at) { const c = capsQ.shift(); if (!QA.length && duck === 1) cap(c.l[0], c.l[1], "talk", c.secs); }
  // a safety update: over whatever is on
  if (QA.length && duck === 1) { const al = QA.shift(); al.played = true; al.st = st.id; duck = 0.14; duckT = now + 8500; alertTone(t + 0.05); cap(st.host, al.text, "alert", 8); X.log.push({ k: "alert", st: st.id, text: al.text }); if (X.log.length > 60) X.log.shift(); }
}

/* ---------------- the Radio app ---------------- */
const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M7 8 17 3"/><circle cx="8.500" cy="14" r="2.500"/><path d="M14 12h4M14 15h4"/></svg>';
function render(el) {
  const Ui = api.ui, st = stOf(S.st), tu = X.tuned, bars = "▁▂▃▅▇".slice(0, 1 + Math.round(X.q * 4));
  let h = Ui.tabHead("RADIO", S.on ? `${st.name} ${st.mhz}` : "Radio", S.on ? "ON" : "OFF");
  h += `<div class="tsub">${S.on ? (tu ? (tu.talk ? Ui.esc(st.host) + " is talking" : `Playing: ${Ui.esc(tu.title)}`) : "Tuning…") + " " + Ui.chip("SIGNAL " + bars, X.q > 0.5 ? "ok" : "due") : "Switched off. No music plays with the radio off."}</div>`;
  h += `<div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0"><button type="button" class="tbtn${S.on ? "" : " ghost"}" data-tf="rd:on" data-act="on">${S.on ? "RADIO ON" : "RADIO OFF"}</button><button type="button" class="tbtn ghost" data-tf="rd:pv" data-act="pv">◀ STATION</button><button type="button" class="tbtn ghost" data-tf="rd:nx" data-act="nx">STATION ▶</button><button type="button" class="tbtn ghost" data-tf="rd:vd" data-act="vd">QUIETER</button><span class="tnote2" style="align-self:center">Vol ${Math.round(S.vol * 100)}%</span><button type="button" class="tbtn ghost" data-tf="rd:vu" data-act="vu">LOUDER</button></div>`;
  h += Ui.sec("Stations", "six, each its own music");
  for (const s of ST) h += Ui.tabCard({ tf: "rd:s:" + s.id, title: `${s.name} · ${s.mhz}`, chips: s.id === S.st && S.on ? Ui.chip("ON AIR", "ok") : "", meta: ({ gammeldans: "Local talk, call-ins, old-time dance music", rock: "Rock", ambient: "Slow, quiet music for the dark", country: "Country, and the roads", joik: "Joik and drum", classical: "Piano and strings, news on the hour" })[s.style], note: `With ${s.host}: ${s.tag}.`, act: "st:" + s.id, actLabel: s.id === S.st ? "TUNED" : "TUNE IN" });
  h += Ui.sec("Voice", "captions are always shown");
  h += `<div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0"><button type="button" class="tbtn${S.voice ? "" : " ghost"}" data-tf="rd:vo" data-act="vo">SPOKEN VOICE ${S.voice ? "ON" : "OFF"}</button></div><p class="tnote2">Safety updates (storm warnings, a road shut, a rescue near you) cut in on every station. Reception fades behind the fell and in a storm.</p>`;
  el.innerHTML = h;
  for (const b of el.querySelectorAll("[data-act]")) b.addEventListener("click", () => { act(b.dataset.act); api.TABLET.refresh && api.TABLET.refresh(); });
}
function act(a) {
  const i = ST.findIndex(s => s.id === S.st);
  if (a === "on") S.on = !S.on; else if (a === "nx") { S.st = ST[(i + 1) % ST.length].id; S.on = true; retune(); } else if (a === "pv") { S.st = ST[(i + ST.length - 1) % ST.length].id; S.on = true; retune(); }
  else if (a === "vu") S.vol = clamp(Math.round((S.vol + 0.1) * 10) / 10, 0.1, 1); else if (a === "vd") S.vol = clamp(Math.round((S.vol - 0.1) * 10) / 10, 0.1, 1); else if (a === "vo") { S.voice = !S.voice; if (!S.voice && window.speechSynthesis) speechSynthesis.cancel(); }
  else if (a.slice(0, 3) === "st:") { const id = a.slice(3); if (ST.some(s => s.id === id)) { S.st = id; S.on = true; retune(); } }
  if (a === "on" || a.slice(0, 3) === "st:" || a === "nx" || a === "pv") { const st = stOf(S.st); if (S.on) cap("", `Tuned to ${st.name}, ${st.mhz} FM.`, "talk", 2.5); }
  api.save();
}
X.act = act; X.render = render;

TLX.register({
  id: "radio", v: 1, state0: () => ({ on: true, st: "nordkinn", vol: 0.5, voice: false }),
  migrate(st) { const d = { on: true, st: "nordkinn", vol: 0.5, voice: false }; if (!st || typeof st !== "object") return d; return { on: st.on !== false, st: ST.some(s => s.id === st.st) ? st.st : "nordkinn", vol: clamp(+st.vol || 0.5, 0.1, 1), voice: !!st.voice }; },
  init(a) {
    api = a; S = TLX.state("radio"); if (!S || typeof S !== "object" || !ST.some(s => s.id === S.st) || !(S.vol >= 0.1 && S.vol <= 1)) { const d = { on: true, st: "nordkinn", vol: 0.5, voice: false }; if (S && typeof S === "object") Object.assign(S, d); }
    a.TABLET.register({ id: "radio", name: "Radio", icon: ICON, order: 9.4, live: 3, render });
    if (window.TLXN && TLXN.on) TLXN.on(onPost);
    X.ready = true;
  },
  tick(dt) { try { tick(dt); } catch (e) { if (!X.err) { X.err = String(e && e.stack || e); console.error("TLX radio", e); } } }
});
X.state = () => S; X.retune = retune; X.graph = () => graph(); X.reception = () => reception();
})();
