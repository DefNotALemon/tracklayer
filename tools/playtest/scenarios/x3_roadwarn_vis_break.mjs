// 3.2b1 beta: is the compass row (#job) with its road warning actually visible to the player (no job / with a claim)?
import { boot, ev, sleep, done, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(800);
const vis = () => J(`(() => { const j = document.getElementById("job"), cs = getComputedStyle(j), b = j.getBoundingClientRect(); return { disp: cs.display, op: cs.opacity, vis: cs.visibility, box: [b.left, b.top, b.right, b.bottom].map(Math.round), sub: document.getElementById("jobSub").textContent, title: document.getElementById("jobTitle").textContent, vw: innerWidth }; })()`);
const goMehamn = `(() => { const m = SITES.find(s => s.id === "mehamn"); P.x = m.x + 6; P.z = m.z + 6; P.vx = P.vz = 0; P.y = surf(P.x, P.z) + 0.1; recenter(P.x, P.z, true); })(); true`;
await ev(`TLXR.setSnow(null, 0); TLXR.setSnow("fv888", 0.6); ${goMehamn}`); await waitGame(1.2);
const a = await vis(); console.log("no job, road shut:", JSON.stringify(a));
ok(a.box[2] - a.box[0] > 20, "no-job compass row is on screen (" + JSON.stringify(a.box) + ")");
await shot("a_nojob");
await ev(`(() => { const j = Object.assign({}, GS.jobs[0] || {}); j.from = depot; if (!j.dest) j.dest = SITES.find(s => s.id === "dyfjord"); if (!j.cargo) j.cargo = "Test crate"; if (!j.pay) j.pay = 50; GS.claims.push(j); })(); true`); await waitGame(1.2);
const b = await vis(); console.log("claim at quay:", JSON.stringify(b));
ok(b.box[2] - b.box[0] > 20 && /snowed in/.test(b.sub), "claim row visible with the warning");
await shot("b_claim");
// width: long job name + warning
await ev(`(() => { GS.claims[GS.claims.length - 1].cargo = "Fresh fish for the Skjånes processing plant"; })(); true`); await waitGame(1);
const c = await vis(); console.log("long:", JSON.stringify(c));
await shot("c_long");
console.log(fails ? `${fails} FAILED` : "all asserts passed");
await done(fails ? 1 : 0);
