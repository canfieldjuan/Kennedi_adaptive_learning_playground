from __future__ import annotations

from pathlib import Path
from typing import Any

from .comfy_client import ComfyClient
from .config import MAX_IMAGE_INPUT_BYTES, FoundryConfig
from .drafts import DraftStore, sha256_file
from .errors import ValidationError
from .media import MediaTools, first_stream
from .workflows import (
    SAFE_MOTION_NEGATIVE,
    PRESETS,
    WorkflowRegistry,
    illustrated_prompt,
    resolve_preset,
    resolve_quality,
    resolve_seed,
    validate_motion_prompt,
)

IMAGE_SUFFIXES = frozenset({".png", ".jpg", ".jpeg", ".webp"})


class ContentFoundryService:
    def __init__(self, config: FoundryConfig | None = None, client: ComfyClient | None = None):
        self.config = config or FoundryConfig.discover()
        self.config.ensure_local_directories()
        root = self.config.project_root / "tools" / "content-foundry"
        self.registry = WorkflowRegistry(root / "workflows")
        self.store = DraftStore(self.config.drafts_root)
        self.client = client or ComfyClient(self.config.comfy_url, timeout_seconds=self.config.job_timeout_seconds)
        self.media = MediaTools(self.config, self.store)

    def status(self) -> dict[str, Any]:
        return {
            "content_foundry": "ready",
            "drafts_root": str(self.config.drafts_root),
            "imports_root": str(self.config.imports_root),
            "workflows": sorted(("flux_illustrated_redux", "flux_inpaint", "flux_inpaint_canny", "wan_safe_motion")),
            "limits": {"image_presets": ["video_scene", "square_asset"], "wan_frames": 81, "wan_fps": 24, "max_clip_seconds": 30},
            "comfyui": self.client.status(),
        }

    def generate_illustrated_scene(
        self, *, prompt: str, reference_path: str, preset: str = "video_scene",
        quality: str = "final", seed: int = -1, reference_strength: float = 0.8,
        source_brief_id: str | None = None,
    ) -> dict[str, Any]:
        reference = self._image_input(reference_path)
        if isinstance(reference_strength, bool) or not isinstance(reference_strength, (int, float)) or not 0.3 <= reference_strength <= 1.2:
            raise ValidationError("reference strength must be between 0.3 and 1.2")
        width, height = resolve_preset(preset)
        steps = resolve_quality(quality)
        actual_seed = resolve_seed(seed)
        final_prompt = illustrated_prompt(prompt)
        graph, workflow = self.registry.render("flux_illustrated_redux", {
            "reference_image": self.client.upload(reference), "prompt": final_prompt,
            "reference_strength": reference_strength, "width": width, "height": height,
            "seed": actual_seed, "steps": steps, "filename_prefix": "content-foundry/illustrated",
        })
        return self._run_image_draft(
            kind="illustrated_scene", graph=graph, workflow=workflow,
            inputs={"prompt": final_prompt, "preset": preset, "quality": quality, "seed": actual_seed, "reference": source_record(reference), "reference_strength": reference_strength},
            expected=(width, height), source_brief_id=source_brief_id,
        )

    def edit_illustrated_scene(
        self, *, image_path: str, mask_path: str, prompt: str,
        preserve_structure: bool = False, quality: str = "final", seed: int = -1,
        control_strength: float = 0.6, source_brief_id: str | None = None,
    ) -> dict[str, Any]:
        image = self._image_input(image_path)
        mask = self._image_input(mask_path)
        if not isinstance(preserve_structure, bool):
            raise ValidationError("preserve structure must be true or false")
        if preserve_structure and (
            isinstance(control_strength, bool)
            or not isinstance(control_strength, (int, float))
            or not 0.1 <= control_strength <= 1.0
        ):
            raise ValidationError("control strength must be between 0.1 and 1.0")
        image_stream = first_stream(self.media.probe(image), "video")
        mask_stream = first_stream(self.media.probe(mask), "video")
        if image_stream is None or mask_stream is None:
            raise ValidationError("image and mask must be decodable images")
        expected = (int(image_stream.get("width", 0)), int(image_stream.get("height", 0)))
        mask_dimensions = (int(mask_stream.get("width", 0)), int(mask_stream.get("height", 0)))
        if expected != mask_dimensions:
            raise ValidationError("mask dimensions must match the source image")
        if expected not in PRESETS.values():
            raise ValidationError("edit dimensions must match a supported Foundry image preset")
        actual_seed = resolve_seed(seed)
        steps = resolve_quality(quality)
        final_prompt = illustrated_prompt(prompt)
        workflow_id = "flux_inpaint_canny" if preserve_structure else "flux_inpaint"
        values: dict[str, Any] = {
            "image": self.client.upload(image), "mask": self.client.upload(mask), "prompt": final_prompt,
            "seed": actual_seed, "steps": steps, "filename_prefix": "content-foundry/edit",
        }
        if preserve_structure:
            values["control_strength"] = control_strength
        graph, workflow = self.registry.render(workflow_id, values)
        return self._run_image_draft(
            kind="illustrated_edit", graph=graph, workflow=workflow,
            inputs={
                "prompt": final_prompt,
                "quality": quality,
                "seed": actual_seed,
                "image": source_record(image),
                "mask": source_record(mask),
                "preserve_structure": preserve_structure,
                "control_strength": control_strength if preserve_structure else None,
            },
            expected=expected, source_brief_id=source_brief_id,
        )

    def animate_scene_safe(
        self, *, image_path: str, motion_prompt: str, seed: int = -1,
        source_brief_id: str | None = None,
    ) -> dict[str, Any]:
        image = self._image_input(image_path)
        prompt = validate_motion_prompt(motion_prompt)
        actual_seed = resolve_seed(seed)
        graph, workflow = self.registry.render("wan_safe_motion", {
            "image": self.client.upload(image), "prompt": prompt,
            "negative_prompt": SAFE_MOTION_NEGATIVE, "seed": actual_seed,
            "filename_prefix": "content-foundry/motion",
        })
        draft_id, draft_dir, manifest = self.store.create(
            kind="safe_motion", workflow=workflow,
            inputs={"prompt": prompt, "negative_prompt": SAFE_MOTION_NEGATIVE, "seed": actual_seed, "source": source_record(image), "target": "960x544", "frames": 81, "fps": 24},
            source_brief_id=source_brief_id,
        )
        try:
            outputs = self.client.run(graph, draft_dir / "outputs")
            if len(outputs) != 1:
                raise ValidationError("motion workflow must return exactly one output")
            qa = self.media.inspect_silent_motion(outputs[0])
            contact = draft_dir / "contact-sheet.png"
            self.media.create_contact_sheet(outputs[0], contact)
            self.store.add_output(draft_dir, manifest, outputs[0], role="motion_clip")
            self.store.add_output(draft_dir, manifest, contact, role="contact_sheet")
            self.store.add_qa(draft_dir, manifest, {"name": "motion_contract", "status": "pass", "details": qa})
        except Exception as exc:
            self.store.add_qa(draft_dir, manifest, {"name": "motion_contract", "status": "fail", "details": str(exc)})
            raise
        return result(draft_id, draft_dir, manifest)

    def assemble_narrated_clip(self, *, storyboard_path: str) -> dict[str, Any]:
        return self.media.assemble_storyboard(storyboard_path)

    def validate_draft(self, *, draft_id: str) -> dict[str, Any]:
        draft_dir, manifest = self.store.load(draft_id)
        mismatches = []
        for output in manifest["outputs"]:
            path = (draft_dir / output["path"]).resolve()
            if not path.is_relative_to(draft_dir.resolve()):
                mismatches.append(output["path"])
                continue
            if not path.is_file() or sha256_file(path) != output["sha256"]:
                mismatches.append(output["path"])
        return {"draft_id": draft_id, "status": manifest["status"], "valid": not mismatches, "hash_mismatches": mismatches, "requires_parent_visual_review": True}

    def _run_image_draft(
        self, *, kind: str, graph: dict[str, Any], workflow: dict[str, Any],
        inputs: dict[str, Any], expected: tuple[int, int], source_brief_id: str | None,
    ) -> dict[str, Any]:
        draft_id, draft_dir, manifest = self.store.create(kind=kind, workflow=workflow, inputs=inputs, source_brief_id=source_brief_id)
        try:
            outputs = self.client.run(graph, draft_dir / "outputs")
            if len(outputs) != 1:
                raise ValidationError("image workflow must return exactly one output")
            stream = first_stream(self.media.probe(outputs[0]), "video")
            actual = None if stream is None else (int(stream.get("width", 0)), int(stream.get("height", 0)))
            if actual != expected:
                raise ValidationError(f"image output dimensions {actual} do not match {expected}")
            self.store.add_output(draft_dir, manifest, outputs[0], role="image")
            self.store.add_qa(draft_dir, manifest, {"name": "image_dimensions", "status": "pass", "details": {"width": expected[0], "height": expected[1]}})
        except Exception as exc:
            self.store.add_qa(draft_dir, manifest, {"name": "image_generation", "status": "fail", "details": str(exc)})
            raise
        return result(draft_id, draft_dir, manifest)

    def _image_input(self, value: str) -> Path:
        path = self.config.resolve_input(value, max_bytes=MAX_IMAGE_INPUT_BYTES)
        if path.suffix.lower() not in IMAGE_SUFFIXES:
            raise ValidationError("image inputs must be PNG, JPEG, or WebP")
        return path


def source_record(path: Path) -> dict[str, Any]:
    return {"name": path.name, "bytes": path.stat().st_size, "sha256": sha256_file(path)}


def result(draft_id: str, draft_dir: Path, manifest: dict[str, Any]) -> dict[str, Any]:
    return {"draft_id": draft_id, "draft_dir": str(draft_dir), "manifest": manifest}
