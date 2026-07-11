# Video Vault Evidence Contract

## Intake Policy

- Video Vault v1 accepts repository-bundled local media only.
- Every manifest and item is explicitly parent approved before child rendering.
- Parent-imported media is unsupported until durable local blob storage and an
  explicit parent intake flow exist.
- External URLs, remote thumbnails, autoplay, loops, and autoplay chaining are
  forbidden.
- Invalid manifests fail closed to the existing empty state.

## Evidence Policy

- Finishing a video records exposure and completion only.
- Exposure is not a correct vocabulary response.
- Exposure must not create accuracy, successful transfer context, retention, or
  mastery evidence.
- Vocabulary evidence requires a separate child response activity or an
  explicit parent observation.
- Completion events identify their local provenance, manifest, media type,
  duration, and `exposure_only` role.
- An ended clip may reveal a manual route to a separate response activity. It
  must not navigate, score, or start that activity until the child taps it.

## Parent Observation Access

- The gated Parent Panel may offer a manual launch into an already-approved
  local Video Vault activity so a parent can observe the clip/response fit.
- The parent launch is access only. Rendering or pressing it emits no exposure,
  response, accuracy, transfer, retention, or mastery evidence.
- The launch must honor the existing parent Video Playback setting and remain
  non-navigable while playback is Off.
- Parent observation access must not add Video Vault to the four-choice child
  home, autoplay media, or navigate automatically to the response activity.

## Narration Quality

- `Bear Bakes Bread` uses a parent-recorded local voice track. Its three short
  lines align with the mixing, baking, and finished-bread visual beats.
- The final WebM must keep a 48 kHz mono audio stream, avoid clipped peaks, and
  stay near -18 LUFS integrated loudness with true peak no higher than -2 dB.
- Replacing narration must preserve the existing video stream, manual playback,
  exposure-only evidence role, and separate response handoff.
- A narration replacement increments the manifest version, and completion
  metadata cites that numeric version so observations remain distinguishable.
- Source recordings are build inputs only. The deployed app uses the bundled
  WebM and makes no runtime network or microphone request.

## Future Content

The first local clip is paired with a separate evidence-bearing response
activity. The clip remains exposure-only; the response activity alone records
correct or incorrect vocabulary evidence. A parent-import path remains deferred
until IndexedDB or equivalent durable blob storage is designed and tested.
