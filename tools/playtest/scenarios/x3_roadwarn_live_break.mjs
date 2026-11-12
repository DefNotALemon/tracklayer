// 3.2b1 beta (live cycle): real storm fills the roads (no setSnow), Jobs app row + open tablet follow it live, toasts,
// plow reopens, sleep-skip, reload mid-shut, old save without x.roads.
import { boot, ev, sleep, done, reload, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
async function hours(h, step = 0.25) { for (let t = 0; t < h; t += step) { await ev(`GS.hour += ${step}; true`); await waitGame(0.35); } }
const toasts = `Array.from(document.querySelectorAll("#toasts > *")).map(e => e.textContent)`;
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; GS.cash = 9000; true`); await sleep(800);
await ev(`TLXR.setSnow(null, 0); (() => { const j = Object.assign({}, GS.jobs[0] || {}); j.from = depot; j.dest = SITES.find(s => s.id === "mehamn"); j.cargo = "Test crate"; j.pay = 50; GS.claims.push(j); })(); true`);
const row = () => J(`(() => { const r = jobsList().find(e => e.kind === "claim" || e.kind === "load"); return r ? { meta: r.meta, road: r.road || "" } : null; })()`);
let r0 = await row(); ok(r0 && !/snowed/.test(r0.meta), "A: dry roads, no warning (" + (r0 && r0.meta) + ")");
// open the Jobs app and keep it open while the storm hits
await ev(`TABLET.toggle(true, "jobs"); true`); await waitGame(1);
await ev(`WX.at = () => 1; true`);
let shutAt = -1; for (let h = 0; h < 14; h += 0.5) { await hours(0.5, 0.25); if (await J(`TLXR.status("fv888") === "snowed in"`)) { shutAt = h + 0.5; break; } }
console.log("fv888 shut after storm hours:", shutAt);
ok(shutAt > 0, "B: a real storm snows the Mehamn road in (" + shutAt + " h)");
const tb = await J(toasts); console.log("toasts:", JSON.stringify(tb));
ok(tb.some(t => /drifting shut/.test(t)), "B: the 'drifting shut' toast appeared");
let r1 = await row(); console.log("row after storm:", JSON.stringify(r1));
ok(r1 && /Mehamn road snowed in/.test(r1.meta), "B: Jobs row warns");
const dom = await J(`(() => { const t = document.getElementById("tabS"); return { txt: /snowed in/.test(t ? t.innerText : "") }; })()`);
console.log("open Jobs app shows warning without reopening:", JSON.stringify(dom));
ok(dom.txt, "B: the already-open Jobs app updated to show the warning live");
await shot("b_jobs_open_shut");
// clear weather: plow
await ev(`WX.at = () => 0; true`);
let openAt = -1; for (let h = 0; h < 12; h += 0.5) { await hours(0.5, 0.25); if (await J(`TLXR.status("fv888") === "open"`)) { openAt = h + 0.5; break; } }
console.log("fv888 open after clearing, hours:", openAt);
ok(openAt > 0, "C: the plow reopens the road");
const tc = await J(toasts); console.log("toasts:", JSON.stringify(tc));
let r2 = await row(); console.log("row after plow:", JSON.stringify(r2));
ok(r2 && !/snowed/.test(r2.meta), "C: warning gone after the plow");
await waitGame(1.2);
const dom2 = await J(`(() => { const t = document.getElementById("tabS"); return /snowed in/.test(t ? t.innerText : ""); })()`);
ok(!dom2, "C: open Jobs app dropped the warning live");
await ev(`TABLET.toggle(false); true`);
// D: sleep skip while shut
await ev(`TLXR.setSnow("fv888", 0.7); true`); await waitGame(0.5);
ok((await row()).meta.includes("snowed in"), "D: shut again");
await ev(`GS.hour += 6; true`); await waitGame(1);
const d = await J(`({ st: TLXR.status("fv888"), row: (jobsList().find(e => e.kind === "claim" || e.kind === "load") || {}).meta })`);
console.log("after a 6 h sleep:", JSON.stringify(d));
ok(d.st === "open" && !/snowed/.test(d.row), "D: a long sleep reopens the roads and the warning goes");
// E: reload while shut, then an OLD save (no x.roads) while on foot in the village
await ev(`TLXR.setSnow("fv888", 0.7); true`); await waitGame(0.5);
await reload(); await sleep(1500); await ev(`tutSkip(); FOOT.on = false; WX.at = () => 0; true`);
const e1 = await J(`({ st: TLXR.status("fv888"), warn: TLXR.tripWarn(depot.x, depot.z, SITES.find(s => s.id === "mehamn")) })`);
console.log("after reload:", JSON.stringify(e1));
ok(e1.st === "snowed in" && /Mehamn road snowed in/.test(e1.warn), "E: shut roads survive reload and still warn");
const sv = await J(`(() => { const o = JSON.parse(JSON.stringify(window.__lastSave || {})); return Object.keys(o).length; })()`).catch(() => 0);
const old = await ev(`(() => { try { save && save(); } catch (e) {} const k = Object.keys(localStorage).find(k => /tracklayer/i.test(k)); return k ? localStorage.getItem(k) : ""; })()`);
let oldObj = null; try { oldObj = JSON.parse(old); } catch (e) {}
if (oldObj) {
  if (oldObj.x && oldObj.x.sys) delete oldObj.x.sys.roads; else delete oldObj.x;
  await reload(oldObj); await sleep(1500); await ev(`tutSkip(); FOOT.on = false; true`);
  const f = await J(`({ ready: TLXR.ready, st: TLXR.status("fv888"), w: TLXR.tripWarn(depot.x, depot.z, SITES.find(s => s.id === "mehamn")), leg: TLXR.legend().length })`);
  console.log("old save (no x.roads):", JSON.stringify(f));
  ok(f.ready && f.st === "open" && f.w === "" && f.leg > 0, "E: old save loads with open roads, no warning, legend renders");
} else console.log("could not read save for old-save test (skipped)");
const errs = await J(`(window.__errs || [])`).catch(() => []);
console.log(fails ? `${fails} FAILED` : "all asserts passed");
await done(fails ? 1 : 0);
