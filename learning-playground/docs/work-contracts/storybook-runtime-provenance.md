# Storybook observed runtime provenance

## Before Code

### Root Cause
render_set and kept_candidates identify a server only by comfyui_version. The same ComfyUI build can use another PyTorch/Python build, device or launch options and still append to/resume the old set. Existing recipes record expected model pins, not server-attested file contents. No standard endpoint in the inspected ComfyUI server exposes loaded model hashes or custom-node revisions.

### Inventory
Baseline origin/main 1d0a3c2; story-recipe.py owns graph building and set recording. Local ComfyUI-master/server.py:656 exposes /system_stats with system.os, python_version, pytorch_version, comfyui_version, argv, embedded_python and devices (name/type/index plus volatile memory counters). Both local endpoints are offline. Existing fake ComfyUI and same-recipe/version resume cases are the validated harness. The readiness and comparison slices are separate local/published work and are not redesigned here.

### Correct Fix Must Touch
- storybook/tools/story-recipe.py: one server_runtime projection owns schema-versioned server-reported system/device identity. Capture available stable fields, exclude free/allocated memory counters, preserve explicit null for absent values, reject malformed known fields before generation. Record unverified model-file bytes/custom-node revisions/driver/environment overrides explicitly. Do not call this proof of identical output or verified loaded weights.
- render_set records that runtime in new recipes and compares the same identity before and after each seed, including the combined two-stage sheet seed. kept_candidates compares it on resume. Bump the set writer; old sets lacking identity are not mixed into new sets, while existing locks still validate without the new metadata. New seed failures preserve previously recorded candidates.
- storybook/tools/test-story-recipe.py: extend FakeComfy stats with a callable snapshot provider. Exercise actual CLI recording, same-identity resume despite memory changes, Python/PyTorch/device/argv changes between runs, drift at a seed boundary, malformed known fields, partial older responses, legacy locks and two-stage callers.

### Must Not Change
Graph, prompts, model pins, sampler settings/defaults, actual launch settings, server startup, existing art or approved locks, comparison/readiness commands, external machine configuration. No local-model hashing presented as proof about a remote server. The first slice covers API-observable identity only; loaded-file/custom-node attestation needs a separately qualified machine-side collector.

### Verification Plan
Fail-first new CLI case expects runtime metadata; baseline recipe lacks it. Then targeted new cases, existing resume/lost-server/bad-reply/two-stage/lock callers; source and real-art selftest; git diff --check. No real GPU use. Durable evidence outside worktrees. Publication queued behind the single owned active comparison PR; no second PR is opened here.

## Contract Amendments

Integration after PRs 166/167: keep the now-merged comparison selection/output paths and book-ready validator unchanged. Retain their exact existing test cases while adding runtime cases and the FakeComfy callable stats provider. Qualify resume and validation through the merged comparison/readiness entrypoints. No new behavior or runtime settings are introduced by this reconciliation.

## Cold Diff Audit
### Gaps
The API-observed identity slice is implemented and verified. Live-server qualification, machine-side weight/custom-node attestation, remote CI/review and publication remain outstanding. Matching this projection is not a proof of matching model bytes or pixel output; changes not exposed by the endpoint cannot be detected. A runtime can also change and revert between boundary snapshots. No continuous attestation is claimed.

### Change By Change Reconstruction
- storybook/tools/story-recipe.py:216 advances the set writer and admits runtime metadata on recipes/locks without requiring it on legacy locks.
- :1087 replaces version-only parsing with one server_runtime projection. Known malformed fields are rejected; absent fields remain null. Device name/type/index are retained; memory allocation counters are omitted. Unverified facts are listed explicitly.
- :1135 uses that projection in the existing resume decision. :1173 records it and :1198/:1212 compare it before/after a seed before any candidate is recorded. The old independent version parser is removed, while the old version field/message remains compatible.
- storybook/tools/test-story-recipe.py:128 permits callable system snapshots in the existing FakeComfy boundary. New cases at :2055 and :2092 exercise actual commands and queued job counts; existing resume/bad-reply/two-stage callers remain exercised.
- Graph/template/model pins remain byte-for-byte outside the diff. No real server was started and no real generation command was run.

### Origin and Regression Proof
Version-only reader introduced in 27ed0e78/f28bfc26, with resume's version comparison in 759aa267 (git blame). The failure is loss of identity at that reader and its consumers, so the replacement owner feeds both persistence and comparison. No downstream guess about image differences was added. The new CLI test failed first with render recipe has no runtime provenance; the fixed code passes recorded metadata/resume/drift cases.

### Verification
- Initial runtime + existing resume/bad-reply/two-stage callers: RUNTIME_AND_CALLERS 44 / 44.
- Final strengthened runtime boundary cases: RUNTIME_BOUNDARY_CHECKS 21 / 21; raw output preserved in runtime-tests.log outside the worktree.
- Source selftest and real-art selftest (including existing child locks): both 0 problems.
- git diff --check: clean.
- boundary-probe: stable identity and changing free memory resume; changed Python/PyTorch/argv/GPU starts fresh; malformed/mixed device lists and boolean device index fail before jobs; absent fields remain explicit unknowns; pre-job drift queues no job; post-job drift retains earlier seed only. Legacy locks validate; old un-stamped draft sets are not resumed. The projected, validated value is the one persisted and compared.
- effect-trace: stop observed-runtime drift from mixing a render set | server_runtime feeds kept_candidates and pre/post-seed checks | CLI job counts, recorded candidate list and persisted runtime assertions prove the selected branches move.
- Full duplicate suite deferred to CI after publication. Live 8188/8189 both refuse connection. Model hashes, custom-node revisions, driver and environment overrides remain explicitly unverified.

