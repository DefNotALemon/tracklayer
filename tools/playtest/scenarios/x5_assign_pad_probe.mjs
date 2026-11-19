// Probe: d-pad focus path on the Staff card with a driver and two ASSIGN buttons
import { boot, ev, sleep, done, padSet } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const pad = async n => { await padSet({ [n]: 1 }); await sleep(160); await padSet({}); await sleep(350); };
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 90000; GS.lic = GS.lic || {}; GS.lic.freight = true; TLXV.buy("plowtruck"); TLXV.buy("plowtruck"); true`); await sleep(800);
const rid = JSON.stringify(await J(`TLXPL.con.routes()[0].id`));
await ev(`TLXPL.PDR.mine = 1; TLXPL.PDR.wayMax = 0; TLXPL.con.sign(${rid}); TLX.staff.tick(); true`); await sleep(300);
const DID = (await J(`TLX.state("staff").apps`))[0].id;
await ev(`TLX.staff.hire(${DID}); TABLET.toggle(true, "staff"); TABLET.render(); true`); await sleep(500);
console.log("focusables", JSON.stringify(await J(`TABLET.focusables().map(e => e.dataset.tf)`)));
console.log("start", await ev(`TABLET.focus`));
console.log(await J(`[...$("tabS").querySelectorAll("[data-tf]")].map(e=>e.dataset.tf+" "+Math.round(e.getBoundingClientRect().left)+","+Math.round(e.getBoundingClientRect().top))`));
for (const [name, c] of [["down",13],["right",15],["right",15],["right",15],["right",15],["right",15],["down",13],["left",14],["left",14],["left",14],["down",13],["down",13]]) { await pad(c); console.log(name, await ev(`TABLET.focus`)); }
await done(0);
