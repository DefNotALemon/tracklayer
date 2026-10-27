#!/bin/bash
# Tracklayer playtest runner: headless Chrome over CDP against a throwaway test copy of a checkout.
#
#   tools/playtest/run.sh <scenario.mjs> [out dir]
#
# Builds a test copy of THIS checkout (the one run.sh lives in, or $TL_SRC) with the window.__tl eval hook,
# serves it on a free port, starts a fresh-profile headless Chrome on another free port, runs the scenario
# with node, and kills both on exit (even on Ctrl-C / error). Every run is isolated: fresh site dir, fresh
# Chrome profile (so no save from an earlier run leaks in), its own ports (so parallel bots never drive each
# other's page). Scenario gets env: TL_URL, TL_CDP (port), OUT (screenshot dir). Exit code = node's.
# Typical run: 40-120 s. Keep scenarios under ~6 min so a cron pass's tool call stays under its 8-min limit.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="${TL_SRC:-$(cd "$HERE/../.." && pwd)}"
SCEN="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
STAMP="$(date +%m%d-%H%M%S)-$$"
BASE="$HOME/.hermes/cache/scratch/tlloop"
OUT="${2:-$BASE/shots/$STAMP}"
SITE="$BASE/site_$STAMP"; PROF="$BASE/prof_$STAMP"
mkdir -p "$OUT" "$BASE"
free_port() { /usr/bin/python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1])'; }
HTTP=$(free_port); CDP=$(free_port)
/usr/bin/python3 "$HERE/mksite.py" "$SRC" "$SITE" >/dev/null || exit 2
PIDS=()
# Each fresh Chrome profile is ~160 MB. Parking them as .old_prof_* (pruned only after 24 h idle) piled up 48 GB
# in one day of the loop and drove the disk toward the 20 GB pause, so the run now deletes its own throwaway site
# + profile on exit, and sweeps any parked .old_site_/.old_prof_ dirs left by earlier runs (never a live prof_/site_).
gone() { case "$1" in "$BASE"/site_*|"$BASE"/prof_*|"$BASE"/.old_site_*|"$BASE"/.old_prof_*) /bin/rm -rf -- "$1" 2>/dev/null;; esac; }
cleanup() { for p in "${PIDS[@]}"; do kill "$p" 2>/dev/null; done; sleep 0.5; for p in "${PIDS[@]}"; do kill -9 "$p" 2>/dev/null; done; gone "$SITE"; gone "$PROF"; }
for d in "$BASE"/.old_site_* "$BASE"/.old_prof_*; do [ -e "$d" ] && gone "$d"; done
trap cleanup EXIT INT TERM
( cd "$SITE" && exec /usr/bin/python3 -m http.server "$HTTP" --bind 127.0.0.1 >/dev/null 2>&1 ) & PIDS+=($!)
nice -n 10 "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port="$CDP" \
  --user-data-dir="$PROF" --no-first-run --no-default-browser-check --mute-audio --use-angle=metal \
  --enable-unsafe-swiftshader --window-size=1280,720 about:blank >/dev/null 2>&1 & PIDS+=($!)
for i in $(seq 1 60); do curl -s "http://127.0.0.1:$CDP/json/version" >/dev/null 2>&1 && break; sleep 0.5; done
echo "playtest: src=$SRC site=$SITE http=$HTTP cdp=$CDP out=$OUT"
TL_URL="http://127.0.0.1:$HTTP/index.html" TL_CDP="$CDP" OUT="$OUT" node "$SCEN"
RC=$?
echo "playtest: exit $RC, shots in $OUT"
exit $RC
