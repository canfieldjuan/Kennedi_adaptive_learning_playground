# Content Foundry Host Invocation Proof Work Contract

## Before Code

### Root Cause

Issue #79 requires LM Studio and FTL to invoke the versioned Content Foundry
server, but neither live host is currently bound to it. LM Studio's active and
last-synced MCP configuration contains only the separate legacy ComfyUI server.
FTL's supported checkout can load trusted stdio servers from
`MCP_STDIO_SERVERS`, but that key is absent. The installed `ftl` launcher points
to `/home/juan-canfield/Desktop/web-ui`, a different stale tree that does not
contain the trusted stdio loader, while the supported implementation lives at
`/home/juan-canfield/Desktop/finetunelab.ai`. A direct generic MCP client probe
proves the server protocol, but it does not prove either named host discovered
or invoked the server.

### Correct Fix Must Touch

- Preserve LM Studio's existing `comfyui` entry while adding a distinct
  `kennedi-content-foundry` stdio entry in its live MCP configuration, reload
  the host, and prove the host synchronized that binding.
- Add the same trusted stdio binding to the supported FTL checkout's local
  environment, start only the FTL web surface needed for the proof from that
  checkout, and prove its host loader discovers the server and its MCP client
  lists the versioned server's tools.
- From each named host path, invoke `content_foundry_status` and record the
  returned server readiness, canonical workflow list, and bounded limits. A
  config-file match or generic stdio probe alone is insufficient.
- Confirm both host surfaces expose the six generation/validation tools and no
  approval or publication tool. Do not submit a generation request.
- Record the exact host configuration shape, process/reload path, observations,
  commands, and results in this work contract without copying unrelated secrets.
- Update the Content Foundry README only if the live proof reveals a necessary
  host-start or verification correction.
- Update issue #79's host-invocation checklist and reconciliation text only if
  both named-host proofs succeed. Keep the issue open for any remaining parent
  decision or approved-media integration gate.

### Must Not Change

Do not modify LM Studio or FTL application source, the stale
`/home/juan-canfield/Desktop/web-ui` tree or launcher, the ComfyUI installation,
models, nodes, workflows, or environment, the Content Foundry MCP tools or
guards, package dependencies, generated media, draft or parent approval state,
public assets, catalogs, child runtime, curriculum, learning engines, parent UI,
PR #101 or its worktree/artifacts, or any unrelated repository, issue, PR,
branch, worktree, service, or untracked file. Do not generate, approve, publish,
or integrate media. Do not claim host proof from configuration presence alone.

## Build Receipt

### Stable Runtime Source

The runtime snapshot was extracted with `git archive` from exact merged commit
`b5af98d8d836995f1ecd7a094d9f725311f3296c` into
`~/.local/share/kennedi-content-foundry/b5af98d/`. Its `SOURCE_COMMIT` records
that full SHA. `mcp_server.py` in the snapshot and `git show` of the same path at
that commit both hashed to
`928937bc11b909c324ba2a475da206de85dd682eb7213c8f3cb7bc01418adb7e`.

### LM Studio

- `/home/juan-canfield/.lmstudio/mcp.json` retained its existing `comfyui`
  entry and gained `kennedi-content-foundry`, using the ComfyUI virtualenv
  interpreter and the immutable runtime snapshot entrypoint.
- LM Studio hot-synchronized that exact entry into
  `.lmstudio/.internal/last-synced-mcp-state.json` at the same update second.
- LM Studio 0.4.16+2 was restarted with a temporary loopback-only Chromium
  debugging port so the proof could inspect and drive the host deterministically.
  Its Integrations picker discovered `mcp/kennedi-content-foundry`.
- A clean chat with an empty system prompt and only the status request caused
  the loaded model to select `content_foundry_status` from
  `mcp/kennedi-content-foundry`. LM Studio displayed its per-call tool approval
  boundary before execution.
- LM Studio's persisted conversation receipt
  `.lmstudio/conversations/1783890978006.conversation.json` contains exactly the
  six expected Content Foundry descriptors and no tool name containing
  `approve` or `publish`: `animate_scene_safe`, `assemble_narrated_clip`,
  `content_foundry_status`, `edit_illustrated_scene`,
  `generate_illustrated_scene`, and `validate_draft`.
- The named-host result reported `content_foundry: ready`, all four canonical
  workflows, image presets `video_scene` and `square_asset`, Wan 81 frames at 24
  fps, a 30-second clip cap, ComfyUI 0.25.0 on loopback, and empty running and
  pending queues.

### FTL

- The installed `ftl` launcher resolves to `/home/juan-canfield/Desktop/web-ui`
  and that tree has no trusted stdio loader. It was not modified or used as
  evidence. The supported checkout is
  `/home/juan-canfield/Desktop/finetunelab.ai`, whose
  `lib/tools/mcp/host-config.ts:10-73` loads `MCP_STDIO_SERVERS` and whose
  `lib/tools/mcp/client.ts:82-271` performs stdio discovery and tool calls.
- The supported checkout's `.env.local` gained only the
  `kennedi-content-foundry` trusted stdio binding to the same interpreter and
  immutable runtime snapshot.
- A status-only probe loaded that file through Next's environment loader, then
  invoked FTL's own `loadHostStdioServers` and `McpClientManager`. The resolved
  host was `host-stdio:kennedi-content-foundry`, enabled over stdio, and the
  manager connected with client identity `finetunelab-mcp-client`.
- FTL listed the same six expected tools, found no approval/publication tool,
  called only `content_foundry_status`, and received `is_error: false`,
  `content_foundry: ready`, the four workflows and bounded limits, ComfyUI
  0.25.0, and empty running and pending queues.

No generation call was submitted by either host. The ComfyUI queue was empty
before and after both proofs.

### Decisive Commands

The immutable source extraction and identity check were:

```bash
git archive b5af98d8d836995f1ecd7a094d9f725311f3296c learning-playground/tools/content-foundry \
  | tar -x -C /home/juan-canfield/.local/share/kennedi-content-foundry/b5af98d
git show b5af98d8d836995f1ecd7a094d9f725311f3296c:learning-playground/tools/content-foundry/mcp_server.py \
  | sha256sum
sha256sum /home/juan-canfield/.local/share/kennedi-content-foundry/b5af98d/learning-playground/tools/content-foundry/mcp_server.py
```

LM Studio was temporarily launched with
`--remote-debugging-address=127.0.0.1 --remote-debugging-port=9223`. Chromium
DevTools `Runtime.evaluate` selected the discovered
`mcp/kennedi-content-foundry` integration and sent this exact clean-chat prompt:

```text
Call the content_foundry_status tool now. Return only its tool result and do not call any other tool.
```

The durable host receipt was read with:

```bash
jq '[.. | objects
  | select(has("name") and (.name | type == "string")
    and (.name | test("^(content_foundry_status|generate_illustrated_scene|edit_illustrated_scene|animate_scene_safe|assemble_narrated_clip|validate_draft)$")))
  | .name] | unique' \
  /home/juan-canfield/.lmstudio/conversations/1783890978006.conversation.json
jq '[.. | objects
  | select(has("name") and (.name | type == "string")
    and (.name | test("approve|publish"; "i")))
  | .name] | unique' \
  /home/juan-canfield/.lmstudio/conversations/1783890978006.conversation.json
```

FTL's own loader and client were invoked from the supported checkout with this
status-only probe (the dynamic imports use CJS-default interop):

```bash
cd /home/juan-canfield/Desktop/finetunelab.ai
npx --yes tsx@4.23.0 -e '
(async () => {
  const envModule = await import("@next/env");
  envModule.default.loadEnvConfig(process.cwd());
  const hostModule = await import("./lib/tools/mcp/host-config.ts");
  const clientModule = await import("./lib/tools/mcp/client.ts");
  const target = hostModule.default.loadHostStdioServers()
    .find((server) => server.name === "kennedi-content-foundry");
  if (!target) throw new Error("kennedi-content-foundry host binding missing");
  const manager = new clientModule.default.McpClientManager({ requestTimeoutMs: 10000 });
  try {
    await manager.connect(target);
    const tools = await manager.listTools(target.id);
    const result = await manager.callTool(target.id, "content_foundry_status", {});
    console.log(JSON.stringify({
      client: "finetunelab-mcp-client",
      host: target,
      tools: tools.map((tool) => tool.name).sort(),
      result,
    }, null, 2));
  } finally {
    await manager.disconnectAll();
  }
})().catch((error) => { console.error(error); process.exit(1); });'
```

### Issue Mutation And Host Cleanup

Issue #79 remains open. Its host-invocation checklist item is now checked, the
reconciliation names both successful named-host paths, and the remaining gates
are limited to a real parent decision receipt and separate reviewed app
integration of approved media.

The temporary ComfyUI process stopped cleanly after both proofs. LM Studio was
restored to its normal launch command without the temporary debugging port; its
active synchronized MCP state still contains both the preserved legacy
`comfyui` entry and the additive `kennedi-content-foundry` entry. No FTL web,
training, Graphiti, or database service was started for the core host-stack
proof.

## Contract Amendments

### Stable Runtime Snapshot

The unowned shared playground checkout is detached at a commit that predates the
Content Foundry files, and this slice worktree must be removed after merge.
Pointing host configuration at either location would therefore be missing or
temporary. Install an immutable local runtime snapshot of
`learning-playground/tools/content-foundry` from exact merged commit
`b5af98d8d836995f1ecd7a094d9f725311f3296c` under
`~/.local/share/kennedi-content-foundry/`, record the source commit beside it,
and bind both hosts to that snapshot. This adds only a local host runtime
artifact; the unowned shared checkout and every application source remain
protected.

### FTL Core Host Path

The supported FTL web route is authenticated, but its MCP behavior delegates to
the same trusted-host loader and client manager exercised by this proof. No web
surface was needed to establish named-host discovery and invocation, and
starting it would add authentication/database state without strengthening that
claim. The contract's "only the FTL web surface needed" bound therefore resolves
to no service start; the proof uses the load-and-call path at
`lib/tools/mcp/host-config.ts:10-73` and
`lib/tools/mcp/client.ts:82-271` directly.

## Cold Diff Audit

### Gaps

- change without contract trace: none
- contract requirement not delivered: none
- protected surface touched: none

No standing gap remains. The host checklist moved only after both named hosts
performed a real status call, and the temporary proof processes and debug port
were removed.

### Change By Change Reconstruction

- `docs/work-contracts/content-foundry-host-invocation-proof.md:5-49` defines the
  source-derived root cause, required named-host proof, and protected surfaces;
  lines 53-189 record source identity, both host results, decisive commands,
  issue mutation, and process cleanup.
- `/home/juan-canfield/.local/share/kennedi-content-foundry/b5af98d/SOURCE_COMMIT:1`
  pins the immutable runtime snapshot to the merged source SHA. The snapshot's
  `mcp_server.py` hash matches `git show` of that commit as recorded at this
  contract's lines 55-60.
- `/home/juan-canfield/.lmstudio/mcp.json:3-14` preserves the original legacy
  `comfyui` entry byte-for-byte and adds only the distinct versioned Content
  Foundry command; LM Studio's synchronized state and conversation receipt prove
  that the host consumed it at this contract's lines 62-85.
- `/home/juan-canfield/Desktop/finetunelab.ai/.env.local:2` adds the single
  trusted stdio binding. Removing that one line produces a byte-identical copy
  of the pre-change backup; FTL's loader/client result is recorded at lines
  87-105.
- GitHub issue #79 checks only the now-proven host-invocation item, records both
  host receipts, remains open, and retains the two real completion blockers at
  this contract's lines 177-182.

### Contract Traceability

- The work contract and issue mutation trace to the root-cause requirement to
  replace stale host claims with named-host evidence.
- The LM Studio and FTL bindings trace to `Correct Fix Must Touch` lines 20-31.
- The immutable runtime snapshot traces only to the stable-runtime amendment at
  lines 193-204; it prevents either binding from depending on an unowned or
  short-lived worktree.
- The FTL core-stack probe traces to the clarified host path immediately above;
  no authenticated web/database behavior was required or changed.
- No LM Studio, FTL, ComfyUI, Content Foundry, playground, curriculum, parent UI,
  or child runtime source changed. No package manifest/lockfile, generated media,
  draft, approval record, public asset, PR #101 artifact, stale launcher tree,
  shared checkout file, or unrelated issue/PR moved.

### Verification

- Runtime source identity: `git archive`, `git show | sha256sum`, and snapshot
  `sha256sum` agreed on the exact merged server bytes.
- LM Studio: active and synchronized configs contained the preserved legacy and
  additive versioned entries; the Integration picker found the named server;
  the persisted conversation listed exactly six expected tools, no
  approval/publication tool, and a successful ready/empty-queue status result.
- FTL: Next's environment loader plus FTL's `loadHostStdioServers` and
  `McpClientManager` resolved `host-stdio:kennedi-content-foundry`, listed the
  same six tools, and returned `is_error: false`, ready status, bounded limits,
  ComfyUI 0.25.0, and an empty queue.
- Config delta audit: LM Studio's prior entry compared equal to backup; FTL's
  prior environment compared byte-for-byte equal after removing its one new
  binding.
- Cleanup audit: ComfyUI port 8188 and temporary debug port 9223 were closed;
  LM Studio was running normally with both bindings still synchronized.
- Issue #79 post-read: open, host item checked, parent-receipt and integration
  blockers retained.
- `npm ci`: installed 56 locked packages; audit found zero vulnerabilities.
- `npm test`: passed 46 Content Foundry tests with one intentional skip, 57
  Vitest files, and 764 app tests.
- `npm run typecheck`: passed.
- `npm run build`: passed; Vite transformed 125 modules.
- `npm run lint --if-present`: passed; no lint script is declared.
- `npm run check:work-contract`: passed.
- `git diff --check`: passed.

Gap audit: DONE.
