# Content Foundry Issue 79 Reconciliation Work Contract

## Before Code

### Root Cause

Issue #79 still presents every arc item as incomplete even though the merged
repository implements and verifies most of the pipeline. At the same time, its
completion criterion says both LM Studio and FTL can invoke the versioned
server, but live host configuration does not support that claim: LM Studio is
bound to the separate legacy ComfyUI MCP server, while the installed FTL stack
accepts trusted stdio servers only through `MCP_STDIO_SERVERS` and the current
host environment does not define that binding. The README compounds the
mismatch by saying both hosts should point directly to the same interpreter and script.
Without a claim-by-claim reconciliation, the issue is simultaneously stale
about completed work and overstated about host readiness.

### Correct Fix Must Touch

- Read every issue #79 checklist and completion claim against current merged
  code, tests, work contracts, and live host configuration. Classify each claim
  as confirmed, contradicted, or could-not-determine with source locations.
- Invoke the versioned Content Foundry server through an MCP stdio client,
  enumerate its tools, and call `content_foundry_status` without submitting a
  generation job. Confirm that approval and publication tools are absent.
- Update `tools/content-foundry/README.md` so it distinguishes LM Studio's stdio
  configuration shape from FTL's trusted host-stdio requirement and its
  HTTP-only user-managed settings, without implying an unverified binding.
- Update issue #79's checklist only for claims supported by merged evidence.
  Add a dated reconciliation section naming the exact remaining completion
  blockers: versioned-server invocation through both hosts, one real manual
  parent decision record, and separate reviewed integration of approved media.
- Record exact commands, host observations, issue mutations, verification, and
  a line-cited cold diff audit in this work contract.

### Must Not Change

Do not modify LM Studio or FTL configuration, either host's source or database,
the ComfyUI installation, models, nodes, or environment, PR #101 or its
worktree/artifacts, generated media, parent approval records, public assets,
activity or video catalogs, child runtime, curriculum, learning engines, parent
UI, package dependencies, MCP tool behavior, canonical generation workflows,
or any unrelated issue/PR. Do not start FTL services, submit generation jobs,
approve or publish a draft, close issue #79, or mark host/integration completion
without direct evidence.

## Claim Audit

### Confirmed

- Canonical workflow templates and bounded mutation are implemented by
  `tools/content-foundry/content_foundry/workflows.py:51-101`.
- The MCP tools delegate to one `ContentFoundryService`, which loads that
  registry, at `tools/content-foundry/mcp_server.py:10-49` and
  `tools/content-foundry/content_foundry/service.py:25-33`.
- Loopback, path, byte, timeout, prompt, seed, and preset guards are implemented
  at `tools/content-foundry/content_foundry/config.py:10-15`, lines 27-49, and
  lines 61-90, plus `tools/content-foundry/content_foundry/workflows.py:104-143`.
- Redux generation, explicit-mask Fill, optional Canny guidance, and bounded Wan
  v2 are implemented at `tools/content-foundry/content_foundry/service.py:45-152`.
- Human narration assembly, posters, contact sheets, media QA, and source
  snapshots are implemented at
  `tools/content-foundry/content_foundry/media.py:33-90`.
- Manual parent decision recording exists only in the CLI/store at
  `tools/content-foundry/foundry.py:13-38` and
  `tools/content-foundry/content_foundry/drafts.py:80-113`. The MCP surface is
  generation/validation-only at `tools/content-foundry/mcp_server.py:16-49`,
  enforced by `tools/content-foundry/tests/test_service_contract.py:183-192`.
- A real three-scene narrated draft was produced, reviewed, validated, and kept
  unpublished at `docs/work-contracts/content-foundry-live-run.md:59-78`.
- A direct MCP stdio client initialized `kennedi-content-foundry` server version
  `1.27.2`, listed exactly the six expected tools, called
  `content_foundry_status` successfully, observed all four workflows and an
  empty ComfyUI queue, and found no approval/publication tools.

### Contradicted

- The issue's claim that LM Studio can invoke the versioned server is false for
  the current host state. `/home/juan-canfield/.lmstudio/mcp.json` contains only
  a `comfyui` entry targeting
  `/home/juan-canfield/Desktop/ComfyUI-master/comfyui_mcp_server.py`, not the
  repository Content Foundry entrypoint.
- The issue's claim that FTL can invoke the versioned server is false for the
  current host state. FTL supports trusted stdio through `MCP_STDIO_SERVERS` at
  `/home/juan-canfield/Desktop/finetunelab.ai/lib/tools/mcp/host-config.ts:1-73`,
  but that environment key is absent and the FTL web/training services are
  stopped. User-managed FTL MCP rows are intentionally HTTP-only at
  `supabase/migrations/20260628000000_create_mcp_servers.sql:4-29`.
- No real manual parent decision receipt currently survives. The live-run
  evidence explicitly records the successful draft as `status: draft` with no
  publication at `docs/work-contracts/content-foundry-live-run.md:75-78`, and
  the later capability matrix likewise left every draft unapproved.
- No approved Content Foundry output has entered the app through a separate
  integration PR. PR #101 is a separate owner-look video-production proof and
  is explicitly outside this slice; it is not evidence for issue #79's final
  integration gate.

### Could Not Determine

- None. Every issue checklist item could be located in merged code/evidence or
  evaluated against current host state. The issue must remain open because the
  three contradicted completion gates above are real, not unknown.

## Reconciliation Receipt

### Direct MCP Probe

ComfyUI 0.25.0 was started unchanged on loopback for the status call and stopped
immediately afterward. No generation job was submitted. This exact stdio probe
ran through `mcp==1.27.2`:

```bash
/home/juan-canfield/Desktop/ComfyUI-master/venv/bin/python - <<'PY'
import asyncio
import json
from pathlib import Path
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

SERVER = str(Path.cwd() / "learning-playground/tools/content-foundry/mcp_server.py")
PYTHON = "/home/juan-canfield/Desktop/ComfyUI-master/venv/bin/python"

async def main():
    params = StdioServerParameters(command=PYTHON, args=[SERVER])
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            initialized = await session.initialize()
            listed = await session.list_tools()
            names = sorted(tool.name for tool in listed.tools)
            result = await session.call_tool("content_foundry_status", {})
            print(json.dumps({
                "server": initialized.serverInfo.name,
                "version": initialized.serverInfo.version,
                "tools": names,
                "status": json.loads(result.content[0].text),
                "is_error": result.isError,
            }, indent=2, sort_keys=True))

asyncio.run(main())
PY
```

The result identified `kennedi-content-foundry` version `1.27.2`, returned
`content_foundry: ready`, listed the four canonical workflows and the bounded
limits, and exposed exactly:

- `animate_scene_safe`
- `assemble_narrated_clip`
- `content_foundry_status`
- `edit_illustrated_scene`
- `generate_illustrated_scene`
- `validate_draft`

No tool name contained approval or publication behavior.

### Host Observations

- LM Studio was running, but both `/home/juan-canfield/.lmstudio/mcp.json` and
  its last-synced state contained only a `comfyui` server invoking the separate
  `/home/juan-canfield/Desktop/ComfyUI-master/comfyui_mcp_server.py`.
- FTL's trusted stdio parser names `MCP_STDIO_SERVERS`, but the current
  `/home/juan-canfield/Desktop/finetunelab.ai/.env.local` key set did not contain
  it. `ftl status` reported Neo4j running and Graphiti, training, and the Next.js
  web UI stopped. No FTL service was started or configuration changed.

### Issue Mutation

Issue #79 remained open. Its dated 2026-07-12 reconciliation now marks ten
implementation/draft-proof checklist items complete and leaves host invocation
and approved-media integration unchecked. It separately names the missing real
parent decision receipt as a completion blocker. The post-update read at
`2026-07-12T17:59:56Z` confirmed the corrected historical-risk wording,
unchecked host status, and all three remaining completion blockers.

## Contract Amendments

Record any scope change before touching a newly required area.

## Cold Diff Audit

### Gaps

- change without contract trace: none
- contract requirement not delivered: none
- protected surface touched: none

No standing contract gap remains. The host claim was not weakened into a direct
stdio-protocol claim; it remains unchecked because neither host is currently
bound to the versioned server.

### Change By Change Reconstruction

- `docs/work-contracts/content-foundry-issue-79-reconciliation.md:1` records the
  before-code contract, source-grounded claim classifications, exact protocol
  proof, live host state, issue mutation receipt, and this cold audit.
- `tools/content-foundry/README.md:17` replaces the false shared-host setup claim
  with separate LM Studio stdio and FTL trusted-host instructions; lines 24-39
  provide concrete configuration shapes while preserving the rule that the
  repository never writes home-level client configuration.
- GitHub issue #79 was reconciled in place: ten confirmed items are checked,
  host verification and integration remain unchecked, the absence of a real
  parent decision receipt is explicit, and the issue remains open.

### Contract Traceability

- The work contract traces to the root-cause requirement to separate merged
  implementation truth from unverified host/completion claims.
- The README change traces only to the required host-transport correction.
- The issue mutation traces only to the source-cited checklist reconciliation.
- No MCP behavior, workflow, test, dependency, host config, FTL/LM Studio source,
  ComfyUI file, generated media, approval record, app surface, PR #101 artifact,
  or unrelated issue/PR changed.

### Verification

- Direct MCP stdio initialize/list-tools/`content_foundry_status`: passed with six
  expected tools, four workflows, empty queue, and no approval/publication tool.
- ComfyUI temporary loopback start/stop: passed; no prompt was queued.
- `ftl status`: completed read-only; web/training services were stopped.
- Issue #79 post-update read: open, ten checked items, two unchecked arc items,
  and three explicit completion blockers.
- `npm ci`: installed 56 locked packages; audit found zero vulnerabilities.
- `npm test`: passed 46 Content Foundry tests with one intentional default live
  skip, 57 Vitest files, and 764 app tests.
- `npm run typecheck`: passed.
- `npm run build`: passed; Vite transformed 125 modules.
- `npm run lint --if-present`: passed; no lint script is declared.
- `npm run check:work-contract`: passed as part of `npm test`.
- `git diff --check`: passed after the final evidence update.

Gap audit: DONE.
