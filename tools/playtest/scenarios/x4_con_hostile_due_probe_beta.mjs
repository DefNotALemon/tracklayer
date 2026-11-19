// Probe: a saved con.due key that is not a stretch of the road (999, -1) and a 1e12 h clock: does it strike / cost on hand back?
import { boot, ev, sleep, done, reload } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
await boot(); await ev(SETUP); await sleep(500);
const mk = async due => { await ev(`(() => { const s = TLX.state("plow"); s.con = { dyfjord: { name: "x", strikes: 0, due: ${due} } }; s.conRec = {}; save(); return true; })()`); return J(`JSON.parse(localStorage.getItem("tracklayer.save.v2"))`); };
for (const [n, due] of Object.entries({ none: "{}", oob: '{"999":[5,1],"-1":[1e12,1]}', late: '{"0":[1e12,1]}' })) {
  const save = await mk(due); await reload(save); await ev(SETUP); await sleep(900);
  const a = await J(`(() => { const s = TLX.state("plow"); const c0 = JSON.stringify(s.con.dyfjord); TLXPL.con.step(); return { before: c0, after: JSON.stringify(s.con.dyfjord), cost: TLXPL.con.quitCost ? TLXPL.con.quitCost("dyfjord") : "n/a", keys: Object.keys(TLXPL.con) }; })()`);
  console.log(n, JSON.stringify(a));
  await sleep(300);
  await ev(`TABLET.toggle(true, "plow"); true`); await sleep(500);
  const t = await ev(`$("tabS").textContent.replace(/\\s+/g, " ").slice(0, 500)`); console.log("  app:", t);
  await ev(`TABLET.toggle(false); true`);
}
await done(0);
