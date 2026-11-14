// Beta 14.2a: try to break village jetties. No assertions that exit non-zero; prints findings.
import { boot, ev, tap, sleep, done, reload } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; true`);
// A. no boat owned: on the sled / on foot at the Dyfjord jetty with a parcel for Dyfjord
await ev(`GS.load.push({ dest: TLXB.DOCKS[1].site, cargo: "Groceries", fragile: false, pay: 120, hits: 0 }); true`);
const c0 = await ev("GS.cash");
await ev(`(() => { const D = TLXB.DOCKS[1], fx = Math.sin(D.yaw), fz = Math.cos(D.yaw); FOOT.on = true; FOOT.x = D.x + fx * (D.len - 2); FOOT.z = D.z + fz * (D.len - 2); FOOT.y = walkFloor(FOOT.x, FOOT.z); recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(2500);
console.log("A on foot at jetty, no boat:", JSON.stringify(await J(`({ n: GS.load.length, cash: GS.cash, sub: $("jobSub").textContent })`)), "cash0", c0);
// B. sled compass text while parcel for no-jetty place
await ev(`FOOT.on = false; GS.load = [{ dest: SITES.find(q => q.kind === "cabin"), cargo: "Snowshoes", fragile: false, pay: 60, hits: 0 }]; true`);
await sleep(1500);
console.log("B sled compass:", await ev(`$("jobSub").textContent`));
// C. old save without vehicles state
await ev(`GS.load = []; true`);
await reload();
await sleep(800);
console.log("C jetties after reload with a save:", await ev(`TLXB.DOCKS.length`));
const old = await J(`(() => { const o = JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => /tracklayer|tl/i.test(k)))||"{}"); return Object.keys(o).slice(0,5); })()`).catch(e => "n/a " + e);
console.log("save keys", JSON.stringify(old));
// D. Map docks layer with zoom
console.log("D layer", await ev(`TABLET.layerPts("docks").length`));
// E. does a skiff owner's boat at a village jetty survive reload (moored away from quay)?
await ev(`GS.cash = 4000; garageTab = "boats"; openGarage(); true`); await sleep(400);
await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(300);
await ev(`closeGarage(); true`);
await ev(`(() => { const r = TLX.state("vehicles").owned.find(r => r.id === "skiff"); const b = TLXB.berthPose(TLXB.DOCKS[2], 1); r.x = b.x; r.z = b.z; r.yaw = b.yaw; return 1; })()`);
await reload(); await sleep(1000);
console.log("E boat after reload", JSON.stringify(await J(`TLX.state("vehicles").owned.filter(r=>r.id==="skiff").map(r=>[Math.round(r.x),Math.round(r.z)])`)), "lebesby dock", JSON.stringify(await J(`[Math.round(TLXB.DOCKS[2].x),Math.round(TLXB.DOCKS[2].z)]`)));
// F. fragile parcel hits at jetty, expired late parcel
await ev(`TLXB.DOCKS[1] && 1; GS.load = [{ dest: TLXB.DOCKS[1].site, cargo: "Eggs", fragile: true, pay: 100, hits: 3 }]; true`);
await ev(`(() => { const r = TLX.state("vehicles").owned.find(r => r.id === "skiff"); window.__v = r; return 1; })()`);
console.log("done");
await done(0);
