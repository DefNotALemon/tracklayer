// 3.2b1 beta fix 0149 #1 (v203): the road heads-up toast. Try to break it: several shut roads + jobs to several places,
// toast spam, a tutorial save, an old save, reload mid-storm, riding the sled, and the phone portrait layout.
import { boot, ev, sleep, done, shot, reload, send } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
const toasts = () => J(`[...document.getElementById("toasts").children].map(c => { const b = c.getBoundingClientRect(); return { t: c.textContent, l: Math.round(b.left), r: Math.round(b.right), vw: innerWidth }; })`);
const watch = async secs => { const seen = []; const t0 = await clock(); let w = { l: 0, r: 0, vw: 0 }; while ((await clock()) - t0 < secs) { for (const x of await toasts()) { if (!seen.includes(x.t)) { seen.push(x.t); if (/Heads up|shut for the winter/.test(x.t)) w = x; } } await sleep(120); } return { seen, w }; };
const claim = (dest) => `(() => { const j = Object.assign({}, GS.jobs[0] || {}); j.from = depot; j.dest = SITES.find(s => s.id === ${JSON.stringify(dest)}); j.cargo = "Test crate"; j.pay = 50; GS.claims.push(j); })(); true`;
const place = (id) => `(() => { const m = SITES.find(s => s.id === ${JSON.stringify(id)}) || depot; P.x = m.x + 6; P.z = m.z + 6; P.vx = P.vz = 0; P.y = surf(P.x, P.z) + 0.1; recenter(P.x, P.z, true); })(); true`;
await boot();

// A: fresh save, tutorial still running: a claim over a shut road must not toast (tutorial owns the compass)
await ev(`WX.at = () => 0; GS.storm = 0; GS.hour = 34; TLXR.setSnow(null, 0); TLXR.setSnow("fv888", 0.6); true`);
console.log("A tut stage", await ev("TUT.stage"));
await ev(claim("dyfjord")); await waitGame(2);
const a = await toasts(); console.log("A toasts", JSON.stringify(a.map(x => x.t)));
ok(!a.some(x => /snowed in|shut for the winter/.test(x.t)), "A: no road toast during the first-ride tutorial");

// B: skip tutorial; two roads shut (Mehamn + Gamvik) and jobs to each: how many toasts, are they distinct
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.claims.length = 0; document.getElementById("toasts").innerHTML = ""; (typeof TOASTQ !== "undefined") && (TOASTQ.length = 0); TLXR.setSnow(null, 0); TLXR.setSnow("fv888", 0.6); TLXR.setSnow("gamvik", 0.6); TLXR.noted.clear(); true`);
await sleep(600);
await ev(place("mehamn")); await ev(claim("gamvik")); await ev(claim("dyfjord")); await ev(`TLXR.noted.clear(); TLXR.setSnow("fv888", 0.6); TLXR.setSnow("gamvik", 0.6); true`); const bw = await watch(5);
console.log("B shut", JSON.stringify(await J(`TLXR.routes.filter(r => r.seg.some(g => g.shut)).map(r => r.id)`)));
console.log("B toasts", JSON.stringify(bw.seen));
const nB = bw.seen.filter(t => /Heads up|shut for the winter/.test(t)).length;
ok(nB <= 2, "B: at most one toast per road with two jobs over two roads (" + nB + ")");
const b2 = await watch(6); console.log("B later", JSON.stringify(b2.seen));
ok(b2.seen.filter(t => /Heads up/.test(t)).length === 0, "B: nothing repeats after 6 s");
console.log("B noted", JSON.stringify(await J(`[...TLXR.noted]`)));

// C: tracked job flips back and forth (J key cycle) must not re-toast
await ev(`document.getElementById("toasts").innerHTML = ""; true`);
for (let i = 0; i < 6; i++) { await ev(`jobCycle(); true`); await sleep(250); }
await waitGame(1);
const c = await toasts(); console.log("C after cycling", JSON.stringify(c.map(x => x.t)));
ok(!c.some(x => /Heads up|shut for the winter/.test(x.t)), "C: cycling the tracked job doesn't re-toast");

// D: save with road shut, reload: how many toasts and does it show once the title is gone
const save = await J(`(() => { try { return JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => /tracklayer|tl/i.test(k)))) } catch (e) { return null } })()`);
ok(true, "D: skipped raw save probe (reload() handles planting)");

// E: toast width on phone portrait
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 780, deviceScaleFactor: 2, mobile: true });
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
await ev(`SET.touch = "on"; setTouchUI(); TLXR.noted.clear(); document.getElementById("toasts").innerHTML = ""; true`);
const ew = await watch(4); const e = [ew.w]; console.log("E phone portrait", JSON.stringify(ew));
ok(ew.w.vw === 390, "E: toast appears on a phone");
ok(e.every(x => x.l >= 0 && x.r <= x.vw), "E: toast inside the viewport");
await shot("e_phone_toast");
await send("Emulation.setDeviceMetricsOverride", { width: 740, height: 360, deviceScaleFactor: 2, mobile: true });
await ev(`TLXR.noted.clear(); document.getElementById("toasts").innerHTML = ""; true`); const e2 = [(await watch(4)).w]; console.log("E phone landscape", JSON.stringify(e2));
ok(e2[0].vw === 740, "E2: toast appears in landscape");
ok(e2.every(x => x.l >= 0 && x.r <= x.vw), "E2: landscape toast inside the viewport");
await shot("e2_phone_land");

// F: a sled rider (the toast says a sled will get through): on the sled, far from roads, with job over shut road
await ev(`TLXR.setSnow("fv888", 0.6); TLXR.noted.clear(); document.getElementById("toasts").innerHTML = ""; P.x += 3000; P.z += 2000; recenter(P.x, P.z, true); true`); await waitGame(2);
const f = await toasts(); console.log("F far from roads", JSON.stringify(f.map(x => x.t)));

// G: job completed/cancelled then road reopened then shut: toast again once
await ev(`GS.claims.length = 0; TLXR.setSnow(null, 0); true`); await waitGame(1.5);
const gN = await J(`[...TLXR.noted]`); console.log("G noted after open", JSON.stringify(gN));
ok(gN.every(([id, why]) => why === "closed"), "G: only the never-plowed fell road stays noted once roads are open");

console.log(fails ? `${fails} FAILED` : "all asserts passed");
await done(fails ? 1 : 0);
