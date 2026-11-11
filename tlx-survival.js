// Tracklayer — survival stats: hunger and thirst (11 Nov 2026, loop/LOOP.md Owner note "minimalist HUD + survival stats + bleed/bandage").
//
// Two new stats, 0-100, both start full. They drain slowly with game time while you're out working (a delivery game, not a
// survival one: a full tank of each lasts about 1.5 h and 1 h of play) and refill at the quay and the garage the same way the
// fuel tank does (GS.fuel +6/s there in tracklayer.js; here +HUNGER_FILL / +THIRST_FILL per second). Empty is a mild penalty:
// you lose warmth a little faster. The bars in the bottom-left corner are drawn by tlx-hud.js from GS.hunger / GS.thirst.
//
// SAVED under x.sys.survival: { hunger, thirst }. GS.hunger / GS.thirst are accessors onto that state (so the game and the
// harness can read and write them like GS.warmth). An old save has no state and starts full (state0 + migrate).
(() => {
"use strict";
const HUNGER_DRAIN = 100 / 5400, THIRST_DRAIN = 100 / 3600;   // points per game second: empty in 90 min / 60 min
const HUNGER_FILL = 7, THIRST_FILL = 12;                      // points per second at the quay or garage
const EMPTY_COLD = 0.25;                                      // extra warmth lost per second while either is empty
const WARN = 25;
let api = null;
const S = () => TLX.state("survival");
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;

TLX.register({
  id: "survival", v: 1,
  state0: () => ({ hunger: 100, thirst: 100, warnH: false, warnT: false }),
  migrate(st, from) { st.hunger = typeof st.hunger === "number" ? st.hunger : 100; st.thirst = typeof st.thirst === "number" ? st.thirst : 100; return st; },
  init(a) {
    api = a;
    for (const k of ["hunger", "thirst"]) Object.defineProperty(a.GS, k, { configurable: true, enumerable: false, get: () => { const s = S(); return s ? s[k] : 100; }, set: v => { const s = S(); if (s) s[k] = clamp(+v || 0, 0, 100); } });
  },
  tick(dt) {
    const s = S(), G = api && api.GS; if (!s || !G) return;
    if (!api.started() || G.dead || api.busy() || api.tutHidden() || dt <= 0) return;
    const W = api.world, near = G.near;
    if (near && (near === W.depot || near === W.garage())) {
      s.hunger = Math.min(100, s.hunger + HUNGER_FILL * dt); s.thirst = Math.min(100, s.thirst + THIRST_FILL * dt);
      if (s.hunger > WARN + 15) s.warnH = false; if (s.thirst > WARN + 15) s.warnT = false;
      return;
    }
    s.hunger = Math.max(0, s.hunger - HUNGER_DRAIN * dt); s.thirst = Math.max(0, s.thirst - THIRST_DRAIN * dt);
    if (s.hunger < WARN && !s.warnH) { s.warnH = true; api.toast("You're getting hungry. The quay has a hot meal.", "warn"); }
    if (s.thirst < WARN && !s.warnT) { s.warnT = true; api.toast("You're thirsty. Water at the quay.", "warn"); }
    if (s.hunger <= 0 || s.thirst <= 0) { if (G.warmth > 1) G.warmth = Math.max(1, G.warmth - EMPTY_COLD * dt); }   // weak, not fatal: the cold path still decides blackouts
  }
});
TLX.survival = { HUNGER_DRAIN, THIRST_DRAIN, HUNGER_FILL, THIRST_FILL };
})();
