// Map chart vs the redone Kjøllefjord street grid (v229): does the chart's town layer match the real streets/houses?
// Also: night, waypoint on a street, tablet open while riding down a street, reload with tablet open.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_mapchart_grid_v229.mjs <outdir>
import { boot, ev, tap, shot, sleep, done, OUT, errors, reload } from "../lib.mjs";
import fs from "node:fs";
await boot(); await tap("KeyH"); await sleep(3500);
await ev(`tutSkip(); FOOT.on = false; true`);
const info = JSON.parse(await ev(`JSON.stringify({ depot: [depot.x, depot.z], foot: KIT.foot.length, lanes: TOWNL.length,
  town: KIT.foot.filter(h=>Math.hypot(h.x-depot.x,h.z-depot.z)<TOWN_R).length, doors: (KIT.doors||[]).length,
  townYards: YARDS.filter(Y=>Math.hypot(Y.x-depot.x,Y.z-depot.z)<TOWN_R).length, TOWN_R })`));
console.log("data", JSON.stringify(info));
let bad = 0;
// lane coverage: sample every town yard centre; is a TOWNL segment within r+3 m?
const cov = JSON.parse(await ev(`(() => { let miss = 0, n = 0, ex = [];
  const ys = YARDS.filter(Y=>Math.hypot(Y.x-depot.x,Y.z-depot.z)<TOWN_R);
  const segs = []; for (const l of TOWNL) { const pts = l.pts || l.p || l; if (Array.isArray(pts)) for (let i=0;i<pts.length-1;i++) segs.push([pts[i], pts[i+1]]); }
  const d = (p,a,b) => { const ax=a[0]??a.x, az=a[1]??a.z, bx=b[0]??b.x, bz=b[1]??b.z; const vx=bx-ax, vz=bz-az; const t=Math.max(0,Math.min(1,((p.x-ax)*vx+(p.z-az)*vz)/(vx*vx+vz*vz||1))); return Math.hypot(p.x-(ax+t*vx), p.z-(az+t*vz)); };
  for (const Y of ys) { n++; let m = 1e9; for (const s of segs) m = Math.min(m, d(Y, s[0], s[1])); if (m > (Y.r||3)+4) { miss++; if (ex.length<4) ex.push([Math.round(Y.x),Math.round(Y.z),Math.round(m)]); } }
  return JSON.stringify({ n, miss, segs: segs.length, ex, sample: JSON.stringify(TOWNL[0]).slice(0,120) }); })()`));
console.log("lane coverage", JSON.stringify(cov));
if (cov.segs === 0) { console.log("NOTE: TOWNL shape unknown"); }
else console.log("lane miss share", cov.miss, "/", cov.n, "(depot pen discs expected)");
const dep = info.depot;
async function view(name, x, z, span) {
  await ev(`(() => { P.x = ${x}; P.z = ${z}; FOOT.on = false; TABLET.toggle(true, "map"); return true; })()`);
  await sleep(700);
  await ev(`(() => { const m = TABLET.apps.find(a => a.id === "map"); m.panX = m.panZ = 0; m.spanT = m.span = ${span}; return true; })()`);
  await sleep(1500); await shot(name);
  const url = await ev(`document.querySelector("#tabS canvas").toDataURL("image/png")`);
  fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(`${OUT}/${name}_chart.png`, Buffer.from(url.split(",")[1], "base64"));
}
await ev(`WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`);
await view("day_close", dep[0], dep[1], 260);
await view("day_wide", dep[0], dep[1], 900);
// east trailhead (edge of the grid)
await view("east_edge", dep[0] + 200, dep[1], 300);
await ev(`GS.hour = 23; true`); await sleep(1500);
await view("night_close", dep[0], dep[1], 260);
// waypoint on a street junction, then ride and check compass target
const wp = JSON.parse(await ev(`(() => { const m = TABLET.apps.find(a => a.id === "map"); const c = document.querySelector("#tabS canvas"); const r = c.getBoundingClientRect();
  for (const t of ["pointerdown","pointerup"]) c.dispatchEvent(new PointerEvent(t, { clientX: r.left + r.width*0.7, clientY: r.top + r.height*0.3, pointerId: 7, bubbles: true }));
  return JSON.stringify({ x: WP.x, z: WP.z, d: Math.hypot(WP.x-depot.x, WP.z-depot.z) }); })()`));
console.log("waypoint", JSON.stringify(wp));
if (wp.x == null) { bad++; console.log("FAIL: tap set no waypoint"); }
await ev(`TABLET.toggle(false); true`); await sleep(1200);
const hud = await ev(`JSON.stringify({ title: document.querySelector("#jobTitle")?.textContent, sub: document.querySelector("#jobSub")?.textContent })`);
console.log("hud with wp", hud);
await shot("hud_wp");
// reload with tablet open on map
await ev(`TABLET.toggle(true, "map"); true`);
await reload();
await sleep(2500);
const after = await ev(`JSON.stringify({ tab: TABLET.open ?? null, wp: WP.x })`);
console.log("after reload", after);
console.log("page errors:", errors.length ? errors.slice(0, 5).join(" | ") : "none");
if (errors.length) bad++;
console.log(bad ? "FAIL" : "ok");
await done(bad ? 1 : 0);
