// S/Down: brake while moving, then reverse when stopped; W goes forward again. No gear UI.
import { boot, ev, sleep, hold, down, up, park, done } from "../lib.mjs";
await boot();
await park();
await sleep(1500);
const vf = () => ev("(Math.round((P.vx*Math.sin(P.yaw)+P.vz*Math.cos(P.yaw))*100)/100)+' '+document.getElementById('gearV').textContent+'|'+typeof shiftKey");
await down("KeyW"); await sleep(3500); await up("KeyW");
console.log("after W", await vf());
await down("KeyS"); await sleep(1200); console.log("S 1.2s", await vf());
await sleep(5000); console.log("S 6s", await vf());
await up("KeyS"); await sleep(1500); console.log("released", await vf());
await down("ArrowDown"); await sleep(3500); console.log("ArrowDown", await vf()); await up("ArrowDown");
await down("KeyW"); await sleep(2500); console.log("W again", await vf()); await up("KeyW");
await done();
