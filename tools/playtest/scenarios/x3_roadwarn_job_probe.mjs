// probe: why is #job display:none after boot? (3.2b1 beta)
import { boot, ev, sleep, done } from "../lib.mjs";
await boot();
await ev(`tutSkip(); true`); await sleep(1500);
console.log(await ev(`JSON.stringify({ hidden: $("job").hidden, disp: getComputedStyle($("job")).display, body: document.body.className, tut: TUT.stage, jl: jobsList().length, started, parentDisp: getComputedStyle($("job").parentElement).display, sub: $("jobSub").textContent })`));
await ev(`$("job").hidden = false; true`); await sleep(500);
console.log(await ev(`JSON.stringify({ hidden: $("job").hidden, disp: getComputedStyle($("job")).display, box: $("job").getBoundingClientRect().width })`));
await done(0);
