# 0376 — Steam desktop shell hooks (v296, 808fa15): title QUIT row, fullscreen routing, browser unchanged: beta

Scenario: new `steam_title_beta.mjs` (stubs `window.TLDesktop` in plain Chrome; `W=`/`H=` env set the window). Electron app itself not run (needs the shell); this covers the three hooks in tracklayer.js.

## Findings
1. **OK: browser build unchanged.** No `TLDesktop` -> 6 rows (RIDE..CREDITS), no QUIT, no `body.desk`.
2. **OK: desktop build.** With the stub: 7 rows, QUIT last, `body.desk` set; Up from the first row wraps onto QUIT; activating it calls `TLDesktop.quit()`; a `quit` that throws is swallowed. `FSC.go()`/`exit()` call `setFullscreen(true/false)` and `FSC.on()` reads the shell (`FSC.api` true).
3. **OK: layout at the app's real minimum.** At 1280x720 QUIT bottom 603 px, key hints at 669; at 960x540 (Electron `minWidth/minHeight`) QUIT clears the hint row and date panel (still `01_desktop`).
4. **POLISH: below the shell's minimum the last row is cut off.** At 640x360 (itch-sized embed, not the desktop window) QUIT bottom is 362 px of 360. Unreachable in the Steam window (min 960x540) and QUIT only exists with `TLDesktop`, so no action unless the shell minimum is ever lowered.
Not covered: the real Electron window, save-to-file, the settings fullscreen toggle inside Electron.
