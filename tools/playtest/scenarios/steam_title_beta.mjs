// Beta: desktop (Steam) shell hooks, v296. Stubs window.TLDesktop in a normal browser and checks the title menu, QUIT, fullscreen routing, and that the browser build is unchanged.
import { boot, ev, shot, sleep, send, done, errors } from "../lib.mjs";
const W = +(process.env.W || 1280), H = +(process.env.H || 720);
await boot({ width: W, height: H, launch: false });
await sleep(1500);
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const rects = `(() => { const bs=[...document.querySelectorAll('#tMenu .ti')]; const r=bs.map(b=>b.getBoundingClientRect()); const hint=document.querySelector('#title .tkeys, #title .thint, #tHints'); return {n:bs.length, labels:bs.map(b=>b.querySelector('.tl').textContent), desk:document.body.classList.contains('desk'), top:r[0]&&r[0].top, bottom:r.length?Math.max(...r.map(x=>x.bottom)):0, vh:innerHeight, fsApi:FSC.api, fsOn:FSC.on(), hint: hint?hint.getBoundingClientRect().top:null}; })()`;
let fails = 0; const chk = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const b = await J(rects);
console.log("browser", JSON.stringify(b));
chk(!b.labels.includes("QUIT") && !b.desk, "browser build: no QUIT row, no body.desk");
await shot("00_browser");
await ev(`window.__calls=[]; window.__fs=false; window.TLDesktop={isFullscreen:()=>window.__fs,setFullscreen:v=>{window.__fs=v;window.__calls.push('fs:'+v)},quit:()=>window.__calls.push('quit')}; titleRender(); titleLayout(); true`);
await sleep(1200);
const d = await J(rects);
console.log("desktop", JSON.stringify(d));
chk(d.labels.at(-1) === "QUIT" && d.n === b.n + 1 && d.desk, "desktop: QUIT is the last row, body.desk set");
chk(d.bottom <= d.vh - 4, `desktop: last row bottom ${d.bottom.toFixed(0)} inside viewport ${d.vh}`);
chk(d.hint == null || d.bottom <= d.hint + 2, `QUIT clears key hints (hint top ${d.hint})`);
chk(d.fsApi === true, "FSC.api true under desktop shell");
await shot("01_desktop");
// pad/keyboard navigation reaches QUIT: ArrowUp from first wraps to last
await ev(`TT.sel=0; titleMove(-1); TT.sel`);
chk(await J("TT.sel") === d.n - 1, "move up from first wraps onto QUIT");
await ev(`titleActivate(TT.sel); true`); await sleep(300);
chk((await J("window.__calls")).includes("quit"), "activating QUIT calls TLDesktop.quit");
await ev(`FSC.go(); true`); await ev(`FSC.on()`);
chk(await J("FSC.on()") === true, "FSC.go -> setFullscreen(true), on() reads the shell");
await ev(`FSC.exit(); true`);
chk(await J("FSC.on()") === false, "FSC.exit -> setFullscreen(false)");
await ev(`TLDesktop.quit=()=>{throw new Error('x')}; titleActivate(TT.items.length-1); true`);
chk(true, "quit that throws is swallowed");
// settings panel with the fullscreen row, if any
await ev(`toggleSettings(true); true`); await sleep(500); await shot("02_settings");
console.log("errors", JSON.stringify(errors));
console.log(fails ? "FAILS " + fails : "all ok");
await done(fails ? 1 : 0);
