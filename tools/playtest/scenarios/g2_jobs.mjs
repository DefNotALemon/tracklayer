// Jobs app + compass tracking: take a few jobs, check the Jobs app lists them, Track one (button and J key),
// and that the top-middle compass (#job) points at the tracked job, then falls back to Auto.
import { boot, ev, tap, shot, sleep, done, park } from "../lib.mjs";
await boot();
const hud = () => ev(`JSON.stringify({ t: $("jobTitle").textContent, s: $("jobSub").textContent, pin: $("jobPin").hidden ? null : $("jobPin").textContent, arrow: $("arrow").style.transform, sel: JOBT.sel ? (JOBT.sel.cargo || JOBT.sel.name || String(JOBT.sel)) : null })`);
console.log("board", await ev(`JSON.stringify(GS.jobs.map(j => [j.cargo, (j.from || depot).id, j.dest.id]))`));
// take three: whatever's at the quay goes aboard
console.log("take", await ev(`(() => { let n = 0; for (let i = 0; i < 6 && n < 3 && GS.jobs.length; i++) { const k = GS.jobs.findIndex(j => (j.from || depot) === depot); if (k < 0) break; acceptJob(k); n++; } return JSON.stringify({ load: GS.load.map(j => j.cargo + "→" + j.dest.id), claims: GS.claims.length }); })()`));
console.log("claims", await ev(`(() => { const far = SITES.filter(x => x !== depot && x !== garageSite && x.type !== "relay"); let n = 0; while (GS.jobs.length && n < 2) { const j = GS.jobs.shift(); j.from = far[(n * 3 + 2) % far.length]; GS.claims.push(j); n++; } return JSON.stringify(GS.claims.map(j => j.cargo + " @" + j.from.id)); })()`));
await park();
console.log("mail", await ev(`GS.mail.push({ id: ++GS.mailSeq, n: 3, v: 40, misses: 0, forId: 0, born: GS.hour, from: [] }); GS.mail.length`));
await sleep(800);
console.log("auto hud", await hud());
console.log("list", await ev(`JSON.stringify(jobsList().map(r => [r.kind, r.title, Math.round(Math.hypot(r.tgt.x - P.x, r.tgt.z - P.z))]))`));
await ev(`TABLET.toggle(true, "jobs"); true`); await sleep(2500);
await shot("01_jobs_app");
console.log("app text", await ev(`$("tabV").innerText.slice(0, 600)`));
// press Track on the last row via its button
console.log("click", await ev(`(() => { const b = [...document.querySelectorAll("#tabV [data-act^='jt:']")]; b[b.length - 1].click(); return b.length; })()`));
await sleep(600);
console.log("after Track", await hud());
await shot("02_jobs_tracked");
await ev(`TABLET.toggle(false); true`); await sleep(2000);
console.log("hud tracked", await hud());
await shot("03_hud_tracked");
// J steps through; past the last it returns to Auto
for (let i = 0; i < 5; i++) { await tap("KeyJ"); await sleep(500); console.log("J", i, await hud()); }
// a tracked load that's delivered drops back to auto
await tap("KeyJ"); await sleep(400);
console.log("before deliver", await hud());
console.log("deliver", await ev(`(() => { const j = JOBT.sel; if (!j || !j.dest) return "not a load"; GS.load.splice(GS.load.indexOf(j), 1); return "removed"; })()`));
await sleep(600);
console.log("after deliver", await hud());
// clicking the compass opens the Jobs app
const box = await ev(`JSON.stringify($("job").getBoundingClientRect())`); const b = JSON.parse(box);
const { click } = await import("../lib.mjs"); await click(b.x + b.width / 2, b.y + b.height / 2); await sleep(1500);
console.log("compass click opens", await ev(`TABLET.open + " " + TABLET.app`));
await done();
