# Tracklayer on Steam

Lemon, 27 Nov 2026: "i want to register a steam page for tracklayer so we can release it next month on the 27th of
december". After the timing advice (below) he chose the later launch: "i LOVE your advice on when to launch ... I'll
take your word", and asked: "start on all of those ... get me plenty of optionss for store pages" (the desktop build,
the store page text, the store assets).

Worktree `~/Documents/GitHub/tracklayer-steam` (branch `steam`, `git push origin steam:main`).

## Dates (Steamworks docs read 27 Nov 2026)
- First titles: 21 days between paying the $100 app fee and release; the identity, tax and bank paperwork "may take
  up to 30 days".
- A public Coming Soon page for at least 14 days before release.
- Store page review 3-5 business days (submit 7+ days ahead); build review separate, after the page is submitted.
- Within 14 days of the release date the date can only be moved by asking Valve.
- Target (default until Lemon names one): **Wednesday 27 January 2027**. Clear of the Winter Sale, a month of
  wishlists, keeps his 27th.

| When | What | Who |
|---|---|---|
| now | Steamworks sign-up, $100 fee, tax + bank + identity | Lemon |
| by 11 Dec | Store page submitted for review | Lemon pastes what S2/S3 made |
| by 18 Dec | Coming Soon page public | Lemon |
| by 8 Jan | Windows build uploaded and submitted for review | S1, S4, Lemon's upload |
| 27 Jan | Release | Lemon presses the button |

## Rules
- The web game stays the game. The desktop build is the same files in a shell; nothing forks. Desktop-only behaviour
  hangs off `window.TLDesktop` (absent on the web) so the website and itch never change.
- No network at run time in the desktop build: three.js and the two fonts ship inside it.
- Store capsules and screenshots are made from the game's own renders. Screenshots are untouched game frames
  (Steam's rule: screenshots show the game). No generated art on the page.
- Steam's content survey asks about AI. The honest answer is that the code and procedural art were made with AI
  tools and nothing is generated while you play; the wording is in `steam/store/` for Lemon to paste.
- Tests run the shell with a hidden window (`TL_TEST=1`): never a window over Lemon's work, never focus taken.

## Slices
| # | Slice | State |
|---|---|---|
| S1 | Desktop shell (Electron): offline bundle, saves on disk, full screen, Quit, mac + Windows builds, hidden smoke test | done (v296, 27 Nov 2026). Unverified: Tracklayer.exe never run (built on a Mac, exe icon/version not edited), F11/Alt+Enter/real full screen never exercised (tests never full-screen), real gamepad on the Quit entry, Steam Deck |
| S2 | Store page options: positioning, short and long descriptions, tags, capsule designs, mock pages to compare | building (chat session) |
| S3 | Final assets for the page Lemon picks: every capsule size, library set, 8+ screenshots at 1920x1080, trailer | not started (needs his pick) |
| S4 | Steamworks hookup: App ID, overlay, Steam Cloud on the save file, achievements, depot upload script | waits on Lemon's App ID |
| S5 | Release pass: first-hour play on the Windows build, controller + Steam Deck check, launch-day checklist | not started |

### S1 the shell
`steam/` in the repo: `package.json` (electron, electron-builder as dev deps), `main.js`, `preload.js`, `build.mjs`,
`vendor/` (three.min.js r128, the Barlow Semi Condensed and Caveat font files with their licences), `test/smoke.mjs`,
`README.md`, `.gitignore` (node_modules, app, dist).
- `build.mjs` stages `steam/app/` from the repo root: index.html and every top-level .js and icon, with the CDN
  three.js tag and the Google Fonts links rewritten to the local copies. It fails if anything staged still names an
  `http(s)://` resource the page would load.
- Pages are served on a fixed custom origin (`app://tracklayer/`) so localStorage keeps its saves between versions.
- Saves on disk: every `tracklayer.*` localStorage key is mirrored to `<userData>/saves/tracklayer-save.json` (on a
  timer when changed, and on quit); at launch a file newer than what localStorage holds is put back before the game
  reads it. This is the file Steam Cloud will sync in S4.
- Starts full screen; Alt+Enter / F11 toggles; the game's own full-screen setting drives the window.
- `window.TLDesktop = { quit(), version }`: the title menu shows Quit only when it exists (keyboard, pad and mouse).
- Builds: `npm run dist:mac` (arm64 folder, tested here) and `npm run dist:win` (x64 folder for the Steam depot).
- Test `steam/test/smoke.mjs` (hidden window, CDP): reaches the title menu, starts a ride, no page errors, no request
  off `app://`, a save written in run 1 is there in run 2, and comes back from the file alone after localStorage is
  wiped.

## Decisions (defaults built until Lemon says otherwise)
- Price: $9.99 with a 10% launch week discount. His call.
- Full release or Early Access: Early Access (the big updates are still landing weekly; the page says so). His call.
- Platforms at launch: Windows. macOS and Steam Deck verified come after.
- The free web version stays up as the demo.
