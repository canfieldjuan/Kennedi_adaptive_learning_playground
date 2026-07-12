# Kennedi Content Foundry

Local build-side tooling for issue #79. It talks only to loopback ComfyUI,
loads versioned API workflow templates, and writes draft-only artifacts under
`.content-foundry/`.

## Runtime

Start ComfyUI separately, then run the MCP server with an environment that has
`mcp==1.27.2` installed:

```bash
cd learning-playground/tools/content-foundry
/home/juan-canfield/Desktop/ComfyUI-master/venv/bin/python mcp_server.py
```

LM Studio can add the server as a stdio MCP entry using that exact interpreter
and script. FTL's trusted host-stdio path uses the `MCP_STDIO_SERVERS`
environment variable; its user-managed MCP settings accept HTTP endpoints, not
host commands. Configure and restart each host separately, then verify tool
discovery and `content_foundry_status` from inside that host. Home-level client
configuration is intentionally not written by this repository.

Example LM Studio server entry:

```json
{
  "command": "/home/juan-canfield/Desktop/ComfyUI-master/venv/bin/python",
  "args": [
    "/home/juan-canfield/Desktop/Kennedi_adaptive_learning_playground/learning-playground/tools/content-foundry/mcp_server.py"
  ]
}
```

Example FTL trusted-host value:

```bash
MCP_STDIO_SERVERS='[{"name":"kennedi-content-foundry","command":"/home/juan-canfield/Desktop/ComfyUI-master/venv/bin/python","args":["/home/juan-canfield/Desktop/Kennedi_adaptive_learning_playground/learning-playground/tools/content-foundry/mcp_server.py"]}]'
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
- `validate_draft`

No MCP approval or publication tool exists. A parent may record a local decision
manually:

```bash
python3 foundry.py record-decision draft-UUID approved --reviewer Parent --notes "Reviewed locally"
```

That decision does not copy anything into `public/assets` or an activity
manifest. App integration remains a separate reviewed change.
