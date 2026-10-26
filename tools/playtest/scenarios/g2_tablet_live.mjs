// G2: does the open tablet keep up with a delivery? (report 0021 F1: Parcels kept showing $0 / 1/1 full /
// the load ABOARD after the drop-off paid out.) New save, take the top Parcels job, park the sled at its
// destination with the tablet open on Parcels, let the game's own proximity check deliver it, then read the
// open screen's text. Then the same with Home open. Prints stale=true/false per screen.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_tablet_live.mjs
import { boot, ev, tap, shot, sleep, done } from "../lib.mjs";
await boot();
await tap("KeyH");
async function trial(app) {
  await ev(`(() => { if (!TABLET.open) TABLET.toggle(undefined, "parcels"); else TABLET.go("parcels"); return true; })()`);
  await sleep(600);
  const ok = await ev(`(() => { const a = TABLET.apps.find(x=>x.id==="parcels"); const r = a.posted.find(x=>x.act); if (r) r.act(); return !!r && GS.load.length > 0; })()`);
  await sleep(400);
  if (!ok) { console.log(`[${app || "home"}] skipped: no job to take straight onto the rack here`); return; }
  if (app !== "parcels") { await ev(`TABLET.go(${app ? `"${app}"` : "null"}); true`); await sleep(500); }
  const job = await ev(`JSON.stringify({ cargo: GS.load[0] && GS.load[0].cargo, dest: GS.load[0] && GS.load[0].dest.name, cash: GS.cash, app: TABLET.app })`);
  console.log(`[${app || "home"}] accepted=${ok} ${job}`);
  const cash0 = await ev(`GS.cash`);
  // park at the destination, stopped, so the per-frame site check delivers it
  await ev(`(() => { const d = GS.load[0].dest; P.x = d.x + 6; P.z = d.z + 6; P.y = surf(P.x, P.z).y + 0.3; P.vx = P.vz = 0; return true; })()`);
  let t = 0; while (t < 40 && await ev(`GS.load.length`) > 0) { await sleep(250); t++; }
  await sleep(800);
  const r = JSON.parse(await ev(`JSON.stringify({ load: GS.load.length, cash: GS.cash, app: TABLET.app, open: TABLET.open, text: document.getElementById("tabS").innerText.replace(/\\s+/g, " ") })`));
  const cargo = JSON.parse(job).cargo || "";
  const showsCash = r.text.includes("$" + r.cash.toLocaleString("en-US")) || r.text.includes("$" + r.cash);
  const showsCargo = cargo && r.text.toLowerCase().includes(cargo.toLowerCase());
  const stale = !showsCash || (app === "parcels" && showsCargo && /aboard/i.test(r.text));
  console.log(`[${app || "home"}] delivered=${r.load === 0} cash ${cash0}->${r.cash} screenShowsCash=${showsCash} screenStillListsCargo=${showsCargo} stale=${stale}`);
  console.log(`[${app || "home"}] text: ${r.text.slice(0, 400)}`);
  await shot(`${app || "home"}_after`);
}
await trial("parcels");
await trial(null);
await done();
