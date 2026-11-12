// Probe: is the H help panel and the sled bog toast keyboard-only while a pad/touch is the active device?
import { boot, ev, send, tap, sleep, done, padSet, padOff } from "../lib.mjs";
await boot(); await ev(`tutSkip(); FOOT.on = false; true`); await sleep(500);
const help = () => ev(`(() => { const h = document.getElementById("help"); return JSON.stringify({ hidden: h.hidden, t: h.textContent.replace(/\\s+/g, " ").slice(0, 160) }); })()`);
console.log("kbm", await help());
await padSet({ 7: 1 }, [0, 0, 0, 0]); await sleep(400); await padSet(); await sleep(300);
await ev(`INP.dev + "/" + INP.pad`).then(v => console.log("dev", v));
await ev(`document.getElementById("help").hidden = false; true`); await sleep(300);
console.log("pad ", await help());
await padOff();
await send("Emulation.setTouchEmulationEnabled", { enabled: true });
await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 640, y: 200 }] }); await sleep(100);
await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(500);
console.log("touch", await ev(`INP.dev`), await help());
// bog toast on the sled (no winch) with a pad
await padSet({ 7: 1 }, [0, 0, 0, 0]); await sleep(300); await padSet(); await sleep(300);
await ev(`FOOT.on = false; for (const e of [...document.querySelectorAll("#toasts > *")]) e.remove(); (typeof TOASTQ !== "undefined") && (TOASTQ.length = 0); true`);
const fn = await ev(`(() => { const m = String(typeof bogToast === "function" ? bogToast : "") ; return m.slice(0, 40); })()`);
console.log("bogToast fn?", fn);
await done(0);
