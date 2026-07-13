# Change Contract: Emma voice pack — total coverage

## Root Cause

Owner-reported: the browser voice still surfaces in places — Story Stage's
setup phase most audibly. The first voice-pack slice enumerated resolved
story narrations but not the Pick Three setup lines (step prompts, entity
spoken intros, the ready line), and deliberately deferred Number Train's
templated lines and the cafe's fix feedback because their strings lived
inline in game code where a duplicate enumeration would drift.

## Correct Fix Must Touch

- `src/modules/number-train/train-lines.ts` (new) — all spoken train lines
  as pure builders (count/load/sequence success, support, structural hint,
  counting/sequence hints, seat capacity); activity imports them.
- `src/modules/number-train/NumberTrainActivity.ts` — mechanical rewire to
  the builders; moved functions deleted; zero string changes (pinned by
  existing tests).
- `src/modules/kennedis-orders/cafe-lines.ts` (new) — getFixFeedback,
  getCorrectAnswer, getRequestedQuantity, getFoodLabel moved verbatim;
  activity imports them back.
- `scripts/voice/collect-voice-lines.ts` — new sources: story setup lines
  (3 step prompts, 12 entity spokenIntros, ready line); per-train-activity
  deterministic plan enumeration (seeded in JSON) covering prompts,
  successes, hints, and the full reachable support/structural space;
  per-cafe-activity fix-feedback enumeration through the real builder;
  arrival_audio.
- Manifest + clips regenerated (471 lines; +177 clips, --only-missing).

## Must Not Change

- Any spoken STRING (the extraction is behavior-identical; existing tests
  pin the templates).
- Event evidence shapes, round-plan logic, seat capacity behavior.
- The runtime voice-pack service (unchanged from #107).

## Verification

- Full gate + typecheck (lockstep contract test re-validates coverage
  automatically against the new collector).
- Live probe: story setup prompt plays an Emma clip; train count success
  plays an Emma clip (was speechSynthesis in the #107 probe).

## Contract Amendments

(none yet)
