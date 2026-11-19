// Beta, 4.2b1/4.2c1 marks: the saved-marks regex caps a mask at 64 chars. Do any drives (1 m a char) or lots (n squares) run longer,
//   so a part-cleared one loses its progress on reload? Lists lengths, then part-cuts the longest drive and reloads.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
await boot(); await ev(SETUP); await sleep(600);
const d = await J(`TLXPL.drv.list().map(c => ({ key: c.key, L: Math.round(c.L) }))`);
const l = await J(`TLXPL.lot.list().map(c => ({ id: c.id, n: c.n }))`);
console.log("drive lengths", JSON.stringify(d.map(c => c.L).sort((a, b) => b - a)));
console.log("lot n", JSON.stringify(l.map(c => c.n).sort((a, b) => b - a)));
ok(d.every(c => c.L <= 64), `all ${d.length} drives <= 64 m (max ${Math.max(...d.map(c => c.L))})`);
// plant marks the same length as the longest of each kind, reload, see if tidy keeps them
const D = d.reduce((a, b) => (b.L > a.L ? b : a)), Lt = l.reduce((a, b) => (b.n > a.n ? b : a));
const plant = `(() => { const s = TLX.state("plow"); s.drv = s.drv || {}; s.lot = s.lot || {};
  s.drv[${JSON.stringify(D.key)}] = { s: 0.9, h: 1, due: 1, miss: 0, wk: 0, n: 0, mk: "1".repeat(${D.L >> 1}) + "0".repeat(${D.L - (D.L >> 1)}), ms: 0.9 };
  s.lot[${JSON.stringify(Lt.id)}] = { s: 0.9, h: 1, due: 1, miss: 0, wk: 0, n: 0, mk: "1".repeat(${Lt.n >> 1}) + "0".repeat(${Lt.n - (Lt.n >> 1)}), ms: 0.9 }; save(); return true; })()`;
await ev(plant);
const save = await J(`JSON.parse(localStorage.getItem("tracklayer.save.v2"))`);
await reload(save); await ev(SETUP); await sleep(900);
const r = await J(`({ d: (TLX.state("plow").drv[${JSON.stringify(D.key)}] || {}).mk || null, l: (TLX.state("plow").lot[${JSON.stringify(Lt.id)}] || {}).mk || null })`);
console.log("after reload: drive mk len", r.d && r.d.length, "lot mk len", r.l && r.l.length);
ok(r.d && r.d.length === D.L, `longest drive (${D.L} m) keeps its marks through a reload`);
ok(r.l && r.l.length === Lt.n, `largest lot (${Lt.n}) keeps its marks through a reload`);
await done(fails ? 1 : 0);
