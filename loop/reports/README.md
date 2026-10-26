# Playtest reports

One file per playtester pass: `NNNN-<slug>.md` (NNNN = next number, zero-padded). Template:

```
# NNNN — <focus> (<goal G1/G2/G3>) — main @ <short hash>
Scenario: tools/playtest/scenarios/<file>.mjs   Shots: <sheet path>

## Findings (most important first)
1. [G1][severity high|med|low] What happens, where, numbers (gameClock), still name. Suggested fix.

## Verified since last time
- <landed builder change>: works / regressed (numbers)

## Ideas
- Optional: things that would make it better that aren't bugs.
```

Reports are append-only: never edit an older report; write a new one.
