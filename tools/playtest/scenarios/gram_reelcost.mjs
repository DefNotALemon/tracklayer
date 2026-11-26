// Reel start-up cost per kind: the first frame of a reel cold (nothing prepared) and with the prefetch done, each prefetch stage's worst cost, and the steady frame; prints uptime first and last (a loaded machine says so). Measures, asserts nothing.
// scratch: per reel kind: cost of the first frame of a reel (cold, and with the prefetch done) vs the steady frame; prints uptime first
import { boot, ev, sleep, done } from "../lib.mjs";
import { execSync } from "node:child_process";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
console.log("uptime:", execSync("uptime").toString().trim());
await boot({ width: 1280, height: 720 });
await ev(`tutSkip(); crashCancel(); FOOT.on = true; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); true`); await sleep(1500);
for (let i = 0; i < 160 && (await J(`!!TLXGR.bl`)); i++) await sleep(250);
await ev(`TLXGR.forceW = true; TLXGR.hold = true; GS.hour = 40*24+11; TLXRL.force = "real"; TLXGR.fpsOk = true; true`);
const types = await J(`Object.keys(TLXRL.types)`);
const rows = [];
for (const ty of types) {
  const ok = await J(`(() => { const hs = [10.5, 12.2, 14.5, 16, 9.8, 13.1]; for (let i = 0; i < 12; i++) { const H = 40*24 + hs[i % 6]; const p = TLXGR.H.pickPerson(H); try { if (p && TLXRL.genOne(H, p, "${ty}")) return true; } catch (e) { } } return false; })()`);
  if (!ok) { console.log("no reel for", ty); continue; }
  const r = await J(`(() => { const R = TLXRL, L = R.list(), i = L.findIndex(q => q.ty === "${ty}"), rec = L[i]; const fr = () => { const a = performance.now(); R.frameNow(); return performance.now() - a; };
    const cold = () => { R.stop(); R.next = null; R.pf = null; R.play = null; const a = performance.now(); R.start(rec); R.frameNow(); return performance.now() - a; };
    const mn = a => Math.min(...a), med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
    const colds = [], pres = [], steadies = [], stagesAll = [];
    for (let rep = 0; rep < 4; rep++) {
      // forget the actors' warm state each repeat is not possible: the first repeat is the true first time for this kind in this page, the rest are warmer; keep repeat 0 apart
      colds.push(cold()); const st = []; for (let k = 0; k < 16; k++) st.push(fr()); steadies.push(med(st)); R.stop();
      R.cur = Math.max(0, i - 1); R.next = null; R.pf = null; const stage = []; for (let k = 0; k < 14; k++) { const a = performance.now(); const more = R.prefetch(true); stage.push(performance.now() - a); if (!more) break; }
      stagesAll.push(stage); const a2 = performance.now(); R.start(rec); R.frameNow(); pres.push(performance.now() - a2); R.stop(); R.cur = 0;
    }
    return { ty: "${ty}", cold: mn(colds.slice(1)), cold0: colds[0], pre: mn(pres), stageMax: mn(stagesAll.slice(1).map(s => Math.max(...s))), stage0Max: Math.max(...stagesAll[0]), st0: stagesAll[0].map(x => Math.round(x)), steady: mn(steadies), steadyMax: Math.max(...steadies), nst: stagesAll[1].length }; })()`);
  if (r.stage0Max > 50) console.log('   first-build stages (ms) for', r.ty, JSON.stringify(r.st0));
  rows.push(r); console.log(r.ty.padEnd(12), "cold(best)", r.cold.toFixed(0).padStart(4), "very first", r.cold0.toFixed(0).padStart(4), "prefetched-first", r.pre.toFixed(0).padStart(4), "prefetch stages", r.nst, "worst (best of 3)", r.stageMax.toFixed(0).padStart(4), "worst, first build", r.stage0Max.toFixed(0).padStart(4), "steady median", r.steady.toFixed(0).padStart(4));
}
const q = (a, p) => { a = a.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };
console.log("kinds", rows.length, "| cold first frame p50/p95/max", q(rows.map(r => r.cold0), 0.5).toFixed(0), q(rows.map(r => r.cold0), 0.95).toFixed(0), Math.max(...rows.map(r => r.cold0)).toFixed(0), "| prefetched first p50/p95/max", q(rows.map(r => r.pre), 0.5).toFixed(0), q(rows.map(r => r.pre), 0.95).toFixed(0), Math.max(...rows.map(r => r.pre)).toFixed(0), "| worst prefetch stage (first build) p95/max", q(rows.map(r => r.stage0Max), 0.95).toFixed(0), Math.max(...rows.map(r => r.stage0Max)).toFixed(0), "| steady mean p50/p95", q(rows.map(r => r.steady), 0.5).toFixed(0), q(rows.map(r => r.steady), 0.95).toFixed(0), "steady max over all", Math.max(...rows.map(r => r.steadyMax)).toFixed(0));
console.log("uptime after:", execSync("uptime").toString().trim());
await done();
