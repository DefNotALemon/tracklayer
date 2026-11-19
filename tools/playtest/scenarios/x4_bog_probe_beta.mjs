// probe: pickup parked in 58 cm powder by park(): bog record, toasts, dig prompts
import { boot, ev, sleep, done, down, up, park } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 60000; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`); await sleep(600);
await ev(`TLXV.buy("pickup"); true`); await sleep(300);
const U = JSON.stringify(await ev(`TLXV.state().owned[0].uid`));
await ev(`TLXV.swapTo(${U}); FOOT.on = false; true`); await sleep(800);
await park(); await sleep(800);
console.log(JSON.stringify(await J(`({ fresh: typeof freshAt === "function" ? freshAt(Math.floor(P.x/0.25), Math.floor(P.z/0.25)) : null, depth: surf(P.x,P.z) - groundAt(P.x,P.z), bog: TLXV.state().owned[0].bog || null, gnd: P.gnd, toasts: [...document.querySelectorAll("#toasts *")].map(e => e.textContent).slice(0,5), hint: document.querySelector("#rideHint, #wnHint") && document.querySelector("#rideHint, #wnHint").textContent })`)));
await down("KeyW"); await sleep(3000); 
console.log(JSON.stringify(await J(`({ v: Math.hypot(P.vx,P.vz), bog: TLXV.state().owned[0].bog || null, toasts: [...document.querySelectorAll("#toasts *")].map(e => e.textContent).slice(0,5), hint: [...document.querySelectorAll("[id*=int],[id*=Hint],[id*=hint]")].map(e=>e.id+":"+e.textContent.slice(0,80)).filter(s=>s.length>8).slice(0,4) })`)));
await up("KeyW");
await done(0);
