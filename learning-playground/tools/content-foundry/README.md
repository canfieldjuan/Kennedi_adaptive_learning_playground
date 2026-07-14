# Kennedi Content Foundry

Local build-side tooling for issue #79. It talks only to loopback ComfyUI,
loads versioned API workflow templates, and writes draft-only artifacts under
`.content-foundry/`.

## Runtime

Start ComfyUI separately, then run the MCP server with an environment that has
`mcp==1.27.2` installed:

```bash
export COMFYUI_VENV_PYTHON="<COMFYUI_ROOT>/venv/bin/python"
export REPO_ROOT="<REPO_ROOT>"
cd "$REPO_ROOT/learning-playground/tools/content-foundry"
"$COMFYUI_VENV_PYTHON" mcp_server.py
```

Replace `<COMFYUI_ROOT>` and `<REPO_ROOT>` with absolute paths on the host.

LM Studio can add the server as a stdio MCP entry using that exact interpreter
and script. FTL's trusted host-stdio path uses the `MCP_STDIO_SERVERS`
environment variable; its user-managed MCP settings accept HTTP endpoints, not
host commands. Configure and restart each host separately, then verify tool
discovery and `content_foundry_status` from inside that host. Home-level client
configuration is intentionally not written by this repository.

Example LM Studio server entry:

```json
{
  "command": "<COMFYUI_ROOT>/venv/bin/python",
  "args": [
    "<REPO_ROOT>/learning-playground/tools/content-foundry/mcp_server.py"
  ]
}
```

Example FTL trusted-host value:

```bash
export MCP_STDIO_SERVERS='[{"name":"kennedi-content-foundry","command":"<COMFYUI_ROOT>/venv/bin/python","args":["<REPO_ROOT>/learning-playground/tools/content-foundry/mcp_server.py"]}]'
```

## Local roots

- Approved references: `tools/content-foundry/references/`
- Parent/import inputs: `.content-foundry/imports/`
- Generated drafts: `.content-foundry/drafts/`

Absolute input paths are accepted only when they resolve inside one of the two
input roots. Copy source images, masks, scene files, and human WAV recordings to
the imports root before invoking a tool.

## Tools

- `content_foundry_status`
- `generate_illustrated_scene`
- `edit_illustrated_scene`
- `animate_scene_safe`
- `assemble_narrated_clip`
- `assemble_bilingual_story_proof`
- `validate_draft`

## Bilingual story proof

`bilingual_story_proof` is an offline 45-to-90-second assembly profile. It uses
one shared local scene sequence and emits separate English, Story Bridge, and
Spanish Replay WebM files inside one review-required draft. The existing
`short_clip` profile keeps its 30-second limits.

The proof storyboard must declare exactly those three modes. Spanish narration
cues require an approved neutral Latin American Spanish (`es-419`) review record,
and its audio hash must match the exact local WAV bytes assembled by Foundry.
See `examples/bilingual-story-proof.example.json` for the authored shape.

Manual CLI assembly:

```bash
python3 foundry.py assemble-bilingual-proof bilingual-story-proof.json
```

Assembly records hashes, provenance, contact-sheet settings, and media QA. It
does not approve, publish, or add media to the Video Vault.

No MCP approval or publication tool exists. A parent may record a local decision
manually:

```bash
python3 foundry.py record-decision draft-UUID approved --reviewer Parent --notes "Reviewed locally"
```

That decision does not copy anything into `public/assets` or an activity
manifest. App integration remains a separate reviewed change.
