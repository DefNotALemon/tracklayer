// Gram's two days of backlog on a new game and on loading an old save: the longest frames in the first 10 s after the game starts, with the backlog and with it switched off (TLXGR.noBl, set by a hook before tlx-gram.js runs).
//   new game   a brand-new game (empty localStorage), backlog on / off
//   old save   this game's own save with the Gram state taken out (x.sys.gram), backlog on / off
// A rAF recorder is installed before every load (Page.addScriptToEvaluateOnNewDocument); frames count from the first one after the game and Gram report started and ready.
// Prints longest frame / 99th percentile / frames over 50 and 100 ms per run, the backlog's own longest piece, and asserts that the backlog adds no frame over 50 ms to the run without it
// (a headless software-GL frame is slow on its own: only the DIFFERENCE is Gram's) and that no single backlog piece takes more than 100 ms (one frame of backlog work under 250 ms: the shot engine's own start-up is in the first). No stills. Exit 1 on a failed assert.
import { boot, ev, raw, sleep, send, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await send("Page.addScriptToEvaluateOnNewDocument", { source: `Object.defineProperty(window, "TLXGR", { configurable: true, get() { return undefined; }, set(v) { Object.defineProperty(window, "TLXGR", { value: v, writable: true, configurable: true }); if (sessionStorage.getItem("__noBl")) v.noBl = true; } });
window.__ft = []; window.__st = 0; (function () { let last = performance.now(); function f() { const n = performance.now(); window.__ft.push([n, n - last, window.TLXGR && TLXGR.bl ? 1 : 0, window.TLXGR && TLXGR.stepMs ? TLXGR.stepMs.length : 0]); last = n; if (!window.__st && window.__tl) { try { if (window.__tl("typeof started !== 'undefined' && started && typeof TLXGR !== 'undefined' && TLXGR.ready")) window.__st = n; } catch (e) { } } requestAnimationFrame(f); } requestAnimationFrame(f); })();` });
const setNoBl = async on => { await raw(`${on ? 'sessionStorage.setItem("__noBl", "1")' : 'sessionStorage.removeItem("__noBl")'}; true`); };
const measure = async tag => {
  for (let i = 0; i < 120 && !(await J(`window.__st`)); i++) await sleep(250);
  await sleep(10500);
  const r = await J(`(() => { const st = window.__st, all = window.__ft.filter(f => f[0] >= st && f[0] < st + 10000), fr = all.map(f => f[1]).sort((a, b) => a - b), blf = all.filter(f => f[2]).map(f => f[1]).sort((a, b) => a - b), top = all.slice().sort((a, b) => b[1] - a[1]).slice(0, 4).map(f => Math.round(f[1]) + (f[2] ? "*" : "")); return { blMax: blf[blf.length - 1] || 0, blN: blf.length, top, n: fr.length, max: fr[fr.length - 1] || 0, p99: fr[Math.floor(fr.length * 0.99)] || 0, over50: fr.filter(d => d > 50).length, over100: fr.filter(d => d > 100).length, bl: !!TLXGR.bl, noBl: !!TLXGR.noBl, piece: Math.max(0, ...TLXGR.stepMs), pmax: Math.max(0, ...(TLXGR.pieceLog || []).map(q => q[1])), posts: TLXGR.localPosts().length, pieces: (TLXGR.pieceLog || []).slice().sort((a, b) => b[1] - a[1]).slice(0, 4).map(q => "stage " + q[0] + " " + q[1] + " ms " + q[2]) }; })()`);
  console.log(`${tag.padEnd(22)} frames ${String(r.n).padStart(3)}, longest ${r.max.toFixed(0).padStart(4)} ms, p99 ${r.p99.toFixed(0).padStart(4)} ms, over 50 ms ${String(r.over50).padStart(3)}, over 100 ms ${String(r.over100).padStart(3)}; backlog ${r.noBl ? "off" : r.bl ? "still running at 10 s" : "done"}; longest backlog frame of work ${r.piece.toFixed(0)} ms (the shot engine starting up is in it), longest single piece ${r.pmax} ms; ${r.posts} Local posts; slowest four frames ${r.top.join(" ")} ms (* = while the backlog ran: ${r.blN} frames, longest ${r.blMax.toFixed(0)} ms); costliest pieces: ${r.pieces.join("; ") || "-"}`);
  return r;
};
const fresh = async noBl => { await setNoBl(noBl); await ev("save = function () { }; true"); await raw("localStorage.clear(); true"); await reload(); return measure("new game, backlog " + (noBl ? "off" : "on")); };
const A = await fresh(false), B = await fresh(true);
// the old save: this game's own, written by a run that finished its backlog, with the Gram state taken out
await setNoBl(false); await ev("save = function () { }; true"); await raw("localStorage.clear(); true"); await reload();
for (let i = 0; i < 240 && (await J(`!!TLXGR.bl`)); i++) await sleep(250);
await ev(`save(); true`); await sleep(500);
let plant = null; try { const o = JSON.parse(await raw(`localStorage.getItem("tracklayer.save.v2")`)); if (o && o.x && o.x.sys) delete o.x.sys.gram; plant = o; } catch (e) { console.log("could not read the save:", String(e).slice(0, 200)); }
ok(!!plant && !!plant.x, "the game's own save was read to make an old save without Gram state");
let C = null, D = null;
if (plant) {
  await setNoBl(false); await ev("save = function () { }; true"); await reload(plant); C = await measure("old save, backlog on");
  await setNoBl(true); await ev("save = function () { }; true"); await reload(plant); D = await measure("old save, backlog off");
  ok(A.max <= B.max + 50, `a new game: the backlog adds no frame over 50 ms (longest ${A.max.toFixed(0)} ms with it, ${B.max.toFixed(0)} ms without)`);
  ok(C.max <= D.max + 50, `loading an old save: the backlog adds no frame over 50 ms (longest ${C.max.toFixed(0)} ms with it, ${D.max.toFixed(0)} ms without)`);
  ok(A.pmax < 100 && C.pmax < 100 && A.piece < 250 && C.piece < 250, `no backlog piece is over 100 ms and no frame of backlog work over 250 ms (pieces ${A.pmax} new game / ${C.pmax} old save; frames of work ${A.piece.toFixed(0)} / ${C.piece.toFixed(0)})`);
}
console.log(fails ? `GRAM BACKLOG: ${fails} failed` : "GRAM BACKLOG: passed");
await done(fails ? 1 : 0);
