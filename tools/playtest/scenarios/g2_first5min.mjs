// G2: the first 5 minutes of a brand-new save. What's on the Parcels board at t=0, is the first job
// obvious, how clear is the pitch (pay, route, note), and what happens when you take the top one.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_first5min.mjs
import { boot, ev, tap, shot, sleep, st, done } from "../lib.mjs";
await boot();
const s0 = await st();
console.log("start", JSON.stringify(s0));
// Open the tablet (Tab opens to Home); go to Parcels, same as tapping its icon.
await tap("Tab");
await sleep(500);
await shot("00_tab_home");
await ev(`TABLET.go("parcels"); true`);
await sleep(700);
await shot("01_parcels_fresh");
console.log("board", await ev(`JSON.stringify({
  nPosted: TABLET.apps.find(a=>a.id==="parcels").posted.length,
  rows: TABLET.apps.find(a=>a.id==="parcels").posted.slice(0,4).map(r => ({
    title: r.title, pay: r.pay, sub: r.sub, note: (r.note||"").slice(0,140), warn: r.warn||"", kind: r.kind
  }))
})`));
// Row DOM text as the player actually sees it (icons/chips included)
console.log("rowsDOM:\n" + await ev(`[...document.querySelectorAll("#pbRows .pbr")].slice(0,4).map(r=>r.innerText.replace(/\\n+/g," | ")).join("\\n")`));
console.log("capDOM: " + await ev(`(document.querySelector("#pbCap")||{}).innerText||""`));
// Click the top posted row's act button (ACCEPT/CLAIM) to see what happens.
const before = await ev(`GS.jobs.length + "," + (GS.load||[]).length`);
await ev(`(() => { const a = TABLET.apps.find(x=>x.id==="parcels"); const r = a.posted.find(x=>x.act); if (r) r.act(); return !!r; })()`);
await sleep(500);
await shot("02_after_accept");
const after = await ev(`GS.jobs.length + "," + (GS.load||[]).length`);
console.log(`jobs,load before=${before} after=${after}`);
console.log("toast: " + await ev(`(document.querySelector("#toast")||{}).innerText || [...document.querySelectorAll(".toast")].map(t=>t.innerText).join(" / ")`));
await tap("KeyH");
await done();
