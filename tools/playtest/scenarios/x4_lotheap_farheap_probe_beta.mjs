// Beta probe: a saved lot held for a heap whose position is nowhere near the lot (hx/hz 1e9) -- does it ever resolve?
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
await boot(); await ev(SETUP); await sleep(500);
const A = (await J(`TLXPL.lot.list().map(c => ({ id: c.id, n: c.n, x: c.x, z: c.z, r: c.r }))`))[0];
await ev(`(() => { const s = TLX.state("plow"); s.lot = { ${A.id}: { s: 0.9, h: 1, due: 1, miss: 0, wk: 0, n: 0, hp: 1, hv: 400, hx: 1e9, hz: -1e9, mk: "1".repeat(${A.n}), ms: 1 } }; save(); return true; })()`);
const save = await J(`JSON.parse(localStorage.getItem("tracklayer.save.v2"))`);
await reload(save); await ev(SETUP); await sleep(800);
// stand in the lot, blade up, a few seconds; then read what the player is told
await ev(`BOG.on = false; crashCancel(); FOOT.on = false; P.x = ${A.x}; P.z = ${A.z}; P.y = surf(P.x, P.z); P.vx = P.vz = 0; true`);
await sleep(4000);
const r = await J(`({ st: TLX.state("plow").lot.${A.id}, line: TLXPL.lot.line(), jobs: jobsList().filter(r => r.kind === "plowlot").map(r => ({ title: r.title, meta: r.meta, tgt: r.tgt })) })`);
console.log(JSON.stringify(r).replace(/"mk":"[01]+"/, '"mk":"..."'));
ok(!r.st || !r.st.hp || Math.hypot(r.st.hx - A.x, r.st.hz - A.z) < A.r + 5, "the heap is back inside the lot (or the hold is gone) after standing in it");
ok(!/^.*\(0\.0|400\.0 m3/.test(r.line), "the hint does not claim 400 m3 of snow in a lot that holds none");
console.log(fails ? `FAILED: ${fails}` : "all ok");
await done(fails ? 1 : 0);
