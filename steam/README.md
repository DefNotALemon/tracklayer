# Tracklayer desktop shell (Electron)

The browser game in an Electron window, for Steam. No Steamworks yet (slice S4). The repo's `index.html` is not changed for this:
the website keeps its CDN links, `build.mjs` makes the offline copy.

```
cd steam
npm install            # electron + electron-builder (about 1 GB with the caches)
npm run stage          # builds steam/app/ from the repo root (offline copy of the game)
npm start              # stage + open the game in full screen
npm test               # hidden-window smoke test (needs the two dist builds below, or TL_SKIP_DIST=1)
npm run dist:mac       # dist/mac-arm64/Tracklayer.app   (arm64)
npm run dist:win       # dist/win-unpacked/Tracklayer.exe (x64 folder, for the Steam depot)
```

## What it does
- `build.mjs` stages `app/`: `index.html`, every top-level `.js`, icons, manifest and `vendor/`. It swaps the three.js CDN tag for
  `vendor/three.min.js` (r128) and the three Google Fonts links for `vendor/fonts.css` (woff2 files). It **exits 1** if the staged
  `index.html` still loads anything over `http(s)` or names a script/file that is not staged.
- `main.js` serves `app/` at `app://tracklayer/` (standard + secure scheme, correct MIME types, query strings like `?v=294` work, path
  traversal refused). One window, `contextIsolation`, `sandbox`, no Node in the page, no menu bar on Windows/Linux, background
  throttling off, asks for the fast GPU, single instance. Every request, navigation and `window.open` that is not `app://tracklayer/` is
  cancelled and counted. F11 and Alt+Enter toggle full screen; the game's own Full screen setting drives the real window.
- `preload.js` keeps saves on disk (below) and exposes `window.TLDesktop = { quit(), version, platform, setFullscreen(bool), isFullscreen() }`.
  The game shows QUIT on the title menu only when `TLDesktop` exists.
- `asar: true` works: files are read through Electron's fs, so `app/` ships inside `resources/app.asar`.

## Where the save file is
`<userData>/saves/tracklayer-save.json` (plus `tracklayer-save.json.bak`, the previous good file):

| OS | Path |
|---|---|
| macOS | `~/Library/Application Support/Tracklayer/saves/` |
| Windows | `%APPDATA%\Tracklayer\saves\` |
| Linux | `~/.config/Tracklayer/saves/` |

Format: `{ "v": 1, "t": <ms>, "keys": { "<localStorage key>": "<string>", ... } }` with every `tracklayer.*` localStorage key. It is
written (temp file + rename, one `.bak` kept) about every 5 s when something changed, on `pagehide` and on quit (quit waits for the last
write). At launch, before any game script runs, the file is put back into localStorage if localStorage has no game data or the file's `t`
is newer than the `tracklayer.desktop.t` stamp kept in localStorage. A corrupt file falls back to the `.bak`, then to doing nothing (and
logs it). Removed keys (a deleted slot) are removed from the file too. This is the file Steam Cloud will sync in S4.

## Test
`npm test` runs `test/smoke.mjs`: it launches Electron itself with `TL_TEST=1` (window created with `show:false`, never shown, focused
or full screen; no Dock icon), a fresh `--user-data-dir` under `$TMPDIR` and a free `--remote-debugging-port`, and drives the page over
CDP with Node's own WebSocket. With `TL_TEST=1` main.js adds `window.__tl = e => eval(e);` to `tracklayer.js` while serving (the same
hook as `tools/playtest/mksite.py`); a staged or packaged build never contains it. Runs: dev shell (boot, 10 s riding, save, quit),
same profile again, save file only, corrupt file with a good `.bak`, both files bad, the packaged `.app`, the Windows folder (files only),
and plain Chrome without `TLDesktop` (no QUIT).

## Windows build from a Mac
`npm run dist:win` needs no Wine: `win.signAndEditExecutable` is `false`, so electron-builder does not edit the exe's icon/version
resources or sign it. The folder is complete, but `Tracklayer.exe` carries Electron's default icon and file properties until it is built on
Windows (or with Wine) with that flag removed. It has never been run on Windows from here.

## SteamPipe (getting a build into Steam)
The Steamworks SDK is unzipped at `~/Downloads/sdk`. `node steam/steampipe/make.mjs <AppID> [winDepot] [macDepot]` writes two build
scripts into `steam/dist/steampipe/` from whatever is built in `dist/`: `app_upload.vdf` (uploads to Steam, sets nothing live) and
`app_local.vdf` (puts the content on the local content server instead). Run one with
`~/Downloads/sdk/tools/ContentBuilder/builder_osx/steamcmd.sh +login <build account> +run_app_build <file> +quit` (Lemon logs in himself:
password and Steam Guard are his to type; `steamcmd` first needs `chmod +x` and is an Intel binary, Rosetta is installed).

Local content server: any HTTP server over `~/Downloads/sdk/tools/ContentServer/htdocs` (the SDK's own one is a Windows exe).
`python3 -m http.server 8090 --bind 127.0.0.1 --directory ~/Downloads/sdk/tools/ContentServer/htdocs`. Port 8080 is taken by Steam
itself. To install from it, the app needs a password-protected branch named `local` (Steamworks > SteamPipe > Builds), the local build
set to that branch, and a file `steam_dev.cfg` next to Steam's executable (`/Applications/Steam.app/Contents/MacOS/`) holding
`@LocalContentServer "127.0.0.1:8090"`, then a Steam restart. Valve's own note: most partners don't need this, a private beta branch
does the same job through a normal upload.

## Licences
`vendor/LICENSE-three.txt` (MIT), `vendor/OFL-barlow.txt`, `vendor/OFL-caveat.txt` (SIL OFL 1.1). `vendor/getfonts.py` is the one-off
script that localised the Google Fonts css (kept for provenance, not staged).
