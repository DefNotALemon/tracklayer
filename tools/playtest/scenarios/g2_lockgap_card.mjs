// G2 playtest (follow-up to v141 sledGap, backlog): visually judge the late-ladder lock cards' new
// gap text on the Freight app — does the longer sentence wrap cleanly and fit the card, and does the
// same text read OK in the warn toast when you tap CLAIM on a locked card?
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_lockgap_card.mjs
import { boot, ev, shot, done, sleep } from "../lib.mjs";
await boot();

async function setupCase(label, patch) {
  await ev(`(() => {
    GS.apps.freight = 1; GS.signed.freight = true; GS.lic.freight = true;
    GS.own.partsOwned["hitch:flatbed"] = true; GS.own.parts.hitch = "flatbed";
    GS.own.partsOwned["recv:heavy"] = true; GS.own.parts.recv = "heavy";
    GS.own.partsOwned["hitch:trailer"] = true;
    ${patch}
    restat(); GS.contracts = null;
    let c = null;
    for (let i = 0; i < 60 && !c; i++) { makeContracts(depot); c = GS.contracts.find(x => x.fell && !x.tonne); }
    window.__found = c ? GS.contracts.indexOf(c) : -1;
    return true;
  })()`);
  const idx = await ev("window.__found");
  console.log(label, "contract index:", idx);
  return idx;
}

async function showAndClick(idx, cardShot, toastShot) {
  await ev('TABLET.toggle(true, "freight"); true');
  await sleep(600);
  await ev(`(() => { const el = document.querySelector('[data-tf="con:${idx}"]'); if (el) el.scrollIntoView({block:"center"}); return !!el; })()`);
  await sleep(300);
  await shot(cardShot);
  const cardText = await ev(`(() => { const el = document.querySelector('[data-tf="con:${idx}"]'); return el ? el.textContent.slice(0,400) : 'CARD NOT FOUND'; })()`);
  console.log(cardShot, "card text:", cardText);
  await ev(`takeContract(${idx}); true`);
  await sleep(400);
  await shot(toastShot);
  const toastText = await ev("(() => { const ts = document.querySelectorAll('#toasts .toast, .toast'); const t = ts[ts.length-1]; return t ? t.textContent.slice(0,300) : 'NO TOAST FOUND'; })()");
  console.log(toastShot, "toast text:", toastText);
  await ev('TABLET.toggle(true); true');
  await sleep(2500); // let toast clear before next case
}

// Case A: deliveries requirement already met, cash short (the longest gap sentence: "$N more")
let idxA = await setupCase("A short-cash", `GS.delivered = 40; GS.cash = 800; GS.own.sleds = ["frontier","woodsman","ranger","sprint","summit"]; GS.own.sled = "summit";`);
if (idxA >= 0) await showAndClick(idxA, "01_case_a_locked_card_long_text", "02_case_a_toast");
else { console.log("case A: no fell contract found"); await shot("01_case_a_FAILED"); }

// Case B: owns the required sled already (shortest gap text: "swap onto it there")
let idxB = await setupCase("B owns-apex", `GS.delivered = 40; GS.cash = 50000; GS.own.sleds = SLEDS.map(s=>s.id); GS.own.sled = "summit";`);
if (idxB >= 0) await showAndClick(idxB, "03_case_b_owns_card_short_text", "04_case_b_toast");
else { console.log("case B: no fell contract found"); await shot("03_case_b_FAILED"); }

await done();
