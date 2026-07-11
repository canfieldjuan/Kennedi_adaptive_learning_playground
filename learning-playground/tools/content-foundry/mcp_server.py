#!/usr/bin/env python3
"""MCP entrypoint. Generation and validation only; approval is intentionally absent."""

from __future__ import annotations

import json

from mcp.server.fastmcp import FastMCP

from content_foundry import ContentFoundryService

mcp = FastMCP("kennedi-content-foundry")
service = ContentFoundryService()


@mcp.tool()
def content_foundry_status() -> str:
    """Report local ComfyUI health, available canonical workflows, and hard limits."""
    return json.dumps(service.status())


@mcp.tool()
def generate_illustrated_scene(prompt: str, reference_path: str, preset: str = "video_scene", quality: str = "final", seed: int = -1, reference_strength: float = 0.8, source_brief_id: str = "") -> str:
    """Create a draft-only, reference-guided illustrated image."""
    return json.dumps(service.generate_illustrated_scene(prompt=prompt, reference_path=reference_path, preset=preset, quality=quality, seed=seed, reference_strength=reference_strength, source_brief_id=source_brief_id or None))


@mcp.tool()
def edit_illustrated_scene(image_path: str, mask_path: str, prompt: str, preserve_structure: bool = False, quality: str = "final", seed: int = -1, control_strength: float = 0.6, source_brief_id: str = "") -> str:
    """Edit only an explicit masked region, optionally preserving line structure."""
    return json.dumps(service.edit_illustrated_scene(image_path=image_path, mask_path=mask_path, prompt=prompt, preserve_structure=preserve_structure, quality=quality, seed=seed, control_strength=control_strength, source_brief_id=source_brief_id or None))


@mcp.tool()
def animate_scene_safe(image_path: str, motion_prompt: str = "subtle breathing, one blink, gentle steam, locked camera", seed: int = -1, source_brief_id: str = "") -> str:
    """Create one bounded silent Wan micro-motion draft; no instructional actions."""
    return json.dumps(service.animate_scene_safe(image_path=image_path, motion_prompt=motion_prompt, seed=seed, source_brief_id=source_brief_id or None))


@mcp.tool()
def assemble_narrated_clip(storyboard_path: str) -> str:
    """Assemble local scenes and human WAV cues from an allowlisted storyboard."""
    return json.dumps(service.assemble_narrated_clip(storyboard_path=storyboard_path))


@mcp.tool()
def validate_draft(draft_id: str) -> str:
    """Recompute draft output hashes without approving or publishing anything."""
    return json.dumps(service.validate_draft(draft_id=draft_id))


if __name__ == "__main__":
    mcp.run()
