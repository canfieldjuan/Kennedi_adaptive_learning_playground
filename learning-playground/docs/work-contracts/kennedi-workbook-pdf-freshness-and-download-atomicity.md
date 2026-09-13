# Kennedi Workbook: PDF Freshness and Download Atomicity

Post-merge follow-up to PR #133 (Pages 1-6 rebuild): two Codex findings on
that PR (comment ids 3998987174, 3998987181), plus findings Codex raised on
this fix's own diff across four further review passes.

## Before Code

### Root Cause

Two independent bugs, both in `workbook/tools/*.py` and
`workbook/scripts/*.mjs` (outside the six page files PR #133 touched):

1. `download()` in `comfy-generate.py`/`comfy-generate-redux.py` opened
   `out_path` directly (`open(out_path, "wb")`), which truncates it
   immediately. A dropped connection or timeout partway through the read
   destroyed a pre-existing (possibly already-approved) generated asset
   instead of just failing to produce a new one.
2. `verify.mjs`'s PDF-freshness check compared only each page's title
   (`pdftotext` extraction vs. `meta.title`). A body-only edit -- wording,
   `tracingWord()` tuning, a swapped illustration, shared CSS -- changes
   what's rendered without changing any title, so a stale committed PDF
   could pass verification undetected.

### Correct Fix Must Touch

- `workbook/tools/comfy-generate.py`, `workbook/tools/comfy-generate-redux.py`
  -- `download()`: atomic temp-file write, symlink-safe temp creation.
- `workbook/scripts/export-pdf.mjs` -- write a content hash of the exact
  source rendered, computed from a single buffer shared with the render
  call (not a separate re-read after rendering).
- `workbook/scripts/verify.mjs` -- compare that hash against a fresh
  recomputation, alongside (not replacing) the existing pdftotext title
  check.
- `.github/workflows/workbook-quality.yml` -- catch the case where a PR's
  committed `dist/` output doesn't match what the PR's own source would
  produce (CI's own full-pipeline run otherwise regenerates everything
  fresh and can't observe that gap).
- `learning-playground/docs/work-contracts/` -- this contract.

### Must Not Change

- The six rebuilt page files, `src/content/**`, `docs/design-system.md`,
  `docs/art/asset-provenance.md` -- PR #133's actual content/art work is
  out of scope here; this PR touches only the tooling/verification layer.
- The `pdftotext` title check in `verify.mjs` -- kept alongside the new
  hash check, not replaced: it independently proves Chrome's PDF
  *rendering* itself didn't corrupt the text, a failure class a source-hash
  match can't rule out.
- `--redux-strength`'s `required=True` (no default) -- already fixed and
  merged in PR #133 (d1710a5); unrelated to this work.

## Contract Amendments

- **Round 2** (after the first push, PR #134): Codex found the hash-write
  in `export-pdf.mjs` re-read `preview.html` from disk *after* `page.pdf()`
  resolved, separately from the `page.goto()` that loaded it at the start --
  a window, spanning the whole render duration, where a concurrent
  `npm run build` could desync "what got hashed" from "what got rendered."
  Amended `Correct Fix Must Touch` to read the source once into a buffer,
  hash that buffer, and render that exact buffer via `page.setContent()`
  instead of `goto()`. Also found `download()`'s temp-sibling name had no
  per-process component; amended to suffix it with `os.getpid()`.
- **Round 3** (after the second push): Codex found (a) the pid-suffixed
  temp name from round 2 was still predictable, and `open(tmp_path, "wb")`
  follows a pre-existing symlink at that path rather than refusing it --
  amended to `tempfile.mkstemp()` (O_CREAT|O_EXCL, unguessable name),
  which also subsumes the round-2 pid fix; (b) no CI check catches a PR
  whose committed `dist/` doesn't match its own source, since the existing
  workflow always regenerates `dist/` fresh before verifying it -- amended
  `Correct Fix Must Touch` to add a `git status`-based drift check to
  `workbook-quality.yml`, scoped to exclude `dist/pdf/*.pdf` specifically
  (Chrome's PDF printer embeds a `CreationDate`/`ModDate` timestamp, so the
  PDF's raw bytes differ on every regeneration even when every rendered
  page is byte-identical -- confirmed directly by diffing two consecutive
  exports of unchanged source; a blanket diff would make the gate
  permanently red regardless of correctness). The `.sourcehash` sidecar
  (content-derived, confirmed byte-deterministic) stays in the check and
  carries the real freshness signal.
- **Waived, not fixed** (round 3, two findings): Codex additionally raised
  (i) a race between two concurrent `npm run pdf` invocations racing to
  publish the PDF/hash pair, and (ii) a race between `npm run verify` and a
  concurrent `npm run build` rewriting `preview.html` mid-run. Both require
  a genuinely concurrent multi-process invocation of this tool against the
  same repo checkout; the tool has exactly one documented, supported
  invocation shape (`npm run all`, fully sequential, single developer,
  single machine) and no evidence anywhere of a concurrent-invocation
  workflow. (i) additionally wouldn't be closed by fixing hash-pairing
  alone: Playwright's own `page.pdf({ path })` already writes the PDF
  non-atomically, a pre-existing property outside this diff's surface, so
  the scenario Codex describes isn't actually preventable within this
  fix's scope. Recorded here rather than silently dropped, per this
  contract's own review-guideline bar (`AGENTS.md`: only a *plausible*
  failure path blocks).
- **Round 4** (after the third push): Codex found two more issues.
  (a) The round-3 drift check's `dist/pdf/*.pdf` exclusion, while correct
  (the PDF's raw bytes are never deterministic), left a real gap: nothing
  anywhere ever inspected the *originally committed* PDF's own content --
  CI's `npm run pdf` step overwrites it with a fresh one before
  `verify.mjs` ever runs, and the drift check explicitly skips it. A PR
  that committed a stale, corrupted, or mismatched PDF (with an otherwise
  correct `dist/` tree) would sail through unnoticed. Amended
  `Correct Fix Must Touch`: reordered `workbook-quality.yml` to run
  `npm run build && npm run verify` *before* `npm run pdf` ever touches
  the committed file -- this reuses `verify.mjs`'s existing pdfinfo/
  pdftotext/sourcehash checks unchanged, now exercised against the actual
  committed PDF and its actual committed sidecar instead of a freshly
  regenerated pair. (b) `tempfile.mkstemp()` creates the temp sibling mode
  0600 regardless of umask, and `os.replace()` carries that mode onto
  `out_path` -- since `out_path` is routinely an existing, previously
  approved asset (the tool's own documented primary use case), silently
  narrowing it from (typically) 0644 to 0600 on every successful download
  could leave it unreadable to whatever else reads it later. Amended
  `download()` to `chmod` the temp file to match `out_path`'s existing
  mode before replacing it, or to the umask-appropriate default mode for
  a genuinely new file.
- **Round 5** (after the fourth push): Codex found the round-4 pre-check
  closed the wrong gap. `verify.mjs`'s hash check and the round-4
  pre-check both only ever compare the `.sourcehash` *sidecar* against
  current source -- neither reads the committed PDF's own bytes/content,
  so a PR that runs `npm run all` locally (regenerating everything
  self-consistently) but then commits every artifact *except* the large
  PDF binary would still pass both: the freshly-regenerated sidecar
  correctly matches current source, while the stale PDF sitting next to
  it is never inspected. Reproduced exactly: edited a page's body text,
  ran `npm run all`, then reverted only `dist/pdf/*.pdf` back to its old
  committed version (simulating "committed everything except the PDF") --
  confirmed `npm run verify` reported all-green ("PDF source hash matches
  current dist/preview.html") despite the PDF's actual content being
  stale. Amended `Correct Fix Must Touch`: added a CI step that snapshots
  the committed PDF before `npm run pdf` overwrites it, then compares
  `pdftotext`-extracted text from that snapshot against extracted text
  from the fresh regeneration -- this reads the committed PDF's own real
  content directly, not a hash-sidecar proxy for it. Both sides go through
  identical extraction, so fidelity quirks cancel out; confirmed
  empirically that two regenerations of unchanged source produce
  byte-identical normalized text, and that the reproduced stale-PDF
  scenario above is correctly caught by this new check. Also fixed:
  `mkstemp`'s prefix used `out_path`'s full basename, so a basename near
  the filesystem's `NAME_MAX` (250 of 255 bytes, Codex's own example)
  would make the generated temp name (prefix + random + `.part`) exceed
  the limit and raise `ENAMETOOLONG` before any download starts, even
  though `out_path` itself is perfectly valid -- amended to truncate the
  prefix to 32 chars.
- **Waived, not fixed** (round 5, one finding): Codex additionally raised
  a scenario where `--out` is itself a symlink (e.g. `latest.png ->
  versioned.png`), where `os.replace()` replaces the symlink's own
  directory entry rather than following it to update the target. This has
  no basis in how this tool is actually invoked anywhere in this repo --
  every `--out` value is a direct, explicit path into
  `design-source/.../locked-poses/`, never a "latest"-style symlink
  convention, and there is no such convention anywhere in this codebase.
  Recorded rather than implemented, per the same plausibility bar as the
  round-3 waivers.

## Cold Diff Audit

### Gaps

- change without contract trace: none.
- contract requirement not delivered: none.
- protected surface touched: none -- confirmed via `git diff` against
  `main` before this contract was written: only `workbook/tools/*.py`,
  `workbook/scripts/export-pdf.mjs`, `workbook/scripts/verify.mjs`,
  `workbook/dist/pdf/*`, `.github/workflows/workbook-quality.yml`, and this
  contract are touched.

### Change By Change Reconstruction

- `comfy-generate.py`, `comfy-generate-redux.py` -- `download()` rewritten:
  `tempfile.mkstemp()` creates the temp sibling exclusively (random name,
  prefix bounded to 32 chars of `out_path`'s basename so a near-`NAME_MAX`
  `out_path` can't overflow the generated name, `O_CREAT|O_EXCL` so no
  predictable path exists to pre-place a symlink at); before writing,
  `chmod`s the temp file to match `out_path`'s existing mode if it exists,
  else to the current umask's default mode; the download writes through
  the returned fd; `os.replace()` renames it onto `out_path` only after
  the full response is read; any exception during either step removes the
  partial temp file (if it still exists) and re-raises unchanged.
- `export-pdf.mjs` -- reads `preview.html` once into a buffer; hashes that
  buffer (SHA-256); renders that same buffer via `page.setContent()`
  (replacing the earlier `page.goto(file://...)` + later separate
  `readFileSync`); writes the hash to `<pdf>.sourcehash` after `page.pdf()`
  completes.
- `verify.mjs` -- new block after the existing pdftotext loop: reads
  `<pdf>.sourcehash`, recomputes SHA-256 of the current `preview.html`,
  fails with a clear message on mismatch or a missing hash file.
- `workbook-quality.yml` -- step before `npm run pdf` runs: `npm run
  build && npm run verify` (validating the committed PDF's own content via
  `verify.mjs`'s existing checks before anything overwrites it), then
  snapshots the committed PDF to `/tmp`. New step after `npm run all`:
  compares `pdftotext`-extracted, normalized text from that snapshot
  against extracted text from the fresh regeneration, failing on any
  difference. Step after that: fails if
  `git status --porcelain -- dist/ ':!dist/pdf/*.pdf'` is non-empty.
- `dist/pdf/kennedi-is-the-boss-book-1.pdf` -- regenerated (content
  unchanged; only the Chrome-embedded timestamp differs from the PR
  #133 version, an expected non-deterministic byproduct, not a real edit).

### Contract Traceability

- `download()` atomicity + symlink-safety + mode preservation + bounded
  temp-prefix -> Root Cause 1, amended rounds 3, 4, and 5.
- `export-pdf.mjs` / `verify.mjs` hash check + TOCTOU fix -> Root Cause 2,
  amended round 2.
- `workbook-quality.yml` drift check + pre-overwrite committed-PDF
  validation + committed-PDF text-content check -> amended rounds 3, 4,
  and 5.
- Waived concurrent-process and symlink-destination findings -> recorded
  above, not implemented.

### Verification

- `npm run all` (build -> pdf -> screenshots -> rasterize -> verify):
  green, each round.
- Genuine negative test (round 1 and re-run round 2, same method): edit a
  page's body text, `npm run build` only (not `pdf`), confirm `verify`
  fails on the new hash check while the pdftotext title check still
  passes; revert; rebuild clean.
- Genuine negative test (round 3, `workbook-quality.yml` drift check):
  edit a page's body text, run the full `npm run all` (simulating CI's
  own regeneration), confirm `git status --porcelain -- dist/
  ':!dist/pdf/*.pdf'` correctly flags `preview.html`, the changed page,
  its screenshot, its raster, and the `.sourcehash` sidecar as drifted;
  confirm the PDF binary itself is correctly excluded; revert; rebuild
  clean.
- Positive-case re-check: same command against the true clean/committed
  state reports no drift (confirms the PDF-exclude doesn't mask real
  drift and doesn't itself produce a false failure).
- Genuine negative test (round 5, committed-PDF text-content check):
  reproduced Codex's exact scenario -- edited a page's body text, ran
  `npm run all` (regenerating everything self-consistently), then
  reverted *only* `dist/pdf/*.pdf` back to its old committed version
  (simulating "committed everything except the PDF binary"). Confirmed
  `npm run verify` incorrectly reported all-green at that point (proving
  the gap the finding described was real); then confirmed the new
  pdftotext text-comparison correctly catches the mismatch, with the
  diff showing the actual stale vs. fresh page-2 wording. Reverted,
  rebuilt clean, reconfirmed the positive case (true committed state)
  passes.
- `download()`: tested against a simulated dropped connection (local
  `http.server` handler that sends a `Content-Length` larger than the
  bytes actually written, then closes) and a normal success case --
  original file untouched and no `.part` debris on failure in either the
  pid-suffixed (round 2) or `mkstemp` (round 3+) version; new content
  correctly replaces old content on success.
- `download()` NAME_MAX case (round 5): reproduced Codex's exact scenario
  with a 250-byte basename; confirmed the old unbounded-prefix scheme
  would have exceeded 255 bytes (asserted directly in the test, not
  assumed) and that the bounded-prefix version succeeds.
- `mkstemp` symlink-safety (round 3): directly verified that
  `os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)` -- the exact
  primitive `mkstemp` relies on -- raises `FileExistsError` rather than
  following a pre-existing symlink at that path, on the actual target
  filesystem (not assumed from documentation alone).
- Tagged-PDF structure re-checked after the `goto` -> `setContent` swap via
  `pdfinfo -struct` and a grep for `/Alt` strings: 37 Figure elements, 37
  matching real (non-empty) Alt descriptions.
- Visual inspection of the two highest-risk rasterized pages after the
  `setContent` swap (B/b tracing on page 5, "help" tracing on page 6):
  both still render as clean hollow letters, no bridging or tangling.
- Genuine negative test (round 4, pre-overwrite PDF validation): with the
  working tree otherwise clean and matching HEAD, overwrote the committed
  `.sourcehash` sidecar with a bogus value (simulating a stale/mismatched
  committed PDF+hash pair) and confirmed `npm run build && npm run verify`
  fails on the source-hash check before anything regenerates; restored the
  real value and reconfirmed green. Also confirmed the positive case
  (true committed state) passes this same pre-check.
- `download()` mode-preservation (round 4): directly tested both branches
  -- replacing an existing mode-0644 file preserves 0644 (not mkstemp's
  0600 default), and creating a brand-new file gets the real process
  umask's default mode (0o666 & ~umask), not 0600. Re-ran the round-3
  regression tests (success/no-debris, failure/no-debris/original-
  untouched, symlink-safety) unchanged and passing.
- `workbook-quality-gate` CI job itself (not just local simulation)
  observed green on GitHub Actions after the round-3 push, including the
  new drift-check step running for real in a fresh checkout.
