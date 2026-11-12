// Options row under touch: four taps in a row flip the option on/off/on/off (no double fire). Prints each tap.
import { boot, ev, sleep, shot, done, send } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); FOOT.on = false; crashCancel(); true`); await sleep(500);
await ev(`SET.touch = "on"; setTouchUI(); toggleSettings(true); window.__ck = []; const b = document.querySelector('#optRows button[data-opt="wounds"]'); for (const t of ["pointerdown","touchstart","mousedown","touchend","pointerup","mouseup","click"]) b.addEventListener(t, e => window.__ck.push(t + ":" + TLX.on("wounds")), true); true`); await sleep(400);
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
for (let i = 0; i < 4; i++) {
  await ev(`document.querySelector('#optRows button[data-opt="wounds"]').scrollIntoView({block:"center"}); window.__ck.length = 0; true`); await sleep(400);
  const r = await J(`document.querySelector('#optRows button[data-opt="wounds"]').getBoundingClientRect().toJSON()`);
  const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
  await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: cx, y: cy }] });
  await sleep(90);
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await sleep(500);
  console.log(i, "y", cy | 0, await J(`window.__ck`), await J(`document.querySelector('#optRows button[data-opt="wounds"]').textContent`));
}
await done(0);
