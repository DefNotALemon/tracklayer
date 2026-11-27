// Beta check for v298 tether: toast wording on touch and keyboard, crash mid-reload keeps no rope.
import { boot, ev, sleep, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
await boot();
await ev(`tutSkip(); true`); await sleep(500);
const crashToast = async () => {
  await ev(`(() => { crashCancel(); FOOT.on = false; CRASH.cool = 0; window.__ts = []; if (!window.__tsI) window.__tsI = setInterval(() => { for (const m of [...$("toasts").children].map(c => c.textContent)) if (!window.__ts.includes(m)) window.__ts.push(m); }, 60); P.vx = Math.sin(P.yaw)*9; P.vz = Math.cos(P.yaw)*9; return crashEject("test", P.vx, 1, P.vz, null); })()`);
  for (let i = 0; i < 200; i++) { await sleep(200); if (await ev(`FOOT.on && !CRASH.on`) === true) break; }
  await sleep(500);
  return JSON.parse(await ev(`JSON.stringify(window.__ts.filter(m => /tether caught/.test(m)))`));
};
let t = await crashToast(); console.log("kbd", t);
ok(t.length && /Press Q/.test(t[0]), "keyboard: Press Q");
await ev(`INP.dev = "touch"; SET.touch = "on"; setTouchUI(); true`);
t = await crashToast(); console.log("touch", t, await ev(`INP.dev`));
ok(t.length && /Tap /.test(t[t.length-1]) && !/Press /.test(t[t.length-1]), "touch: Tap <button>, no Press");
ok(!/undefined|\[object/.test(t[0] || ""), "touch: no undefined in text");
console.log("rope after:", await ev(`!!(ROPE.mesh && ROPE.mesh.visible) + "/" + ROPE.clip`));
await done(fails ? 1 : 0);
