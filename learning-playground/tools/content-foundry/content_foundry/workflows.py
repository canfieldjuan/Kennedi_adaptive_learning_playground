from __future__ import annotations

import copy
import hashlib
import json
import secrets
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .config import MAX_SEED
from .errors import ValidationError

Graph = dict[str, dict[str, Any]]
PRESETS = {"video_scene": (960, 544), "square_asset": (1024, 1024)}
QUALITY_STEPS = {"draft": 16, "final": 24}
SAFE_STYLE_SUFFIX = (
    " Friendly flat 2D children's storybook illustration, rounded forms, warm cream background, "
    "dark purple ink outlines, simple local color palette, uncluttered composition, one clear "
    "action, preschool-safe, without text, letters, numerals, logos, brands, watermark, scary "
    "imagery, or realistic people."
)
SAFE_MOTION_NEGATIVE = (
    "blurry, distorted, morphing, flicker, watermark, text artifacts, extra limbs, missing limbs, "
    "changing object count, changing letters, changing numerals, face drift, camera cuts, fast "
    "motion, frightening expression"
)
SAFE_MOTION_CLAUSES = frozenset({
    "subtle breathing",
    "gentle breathing",
    "one blink",
    "gentle steam",
    "soft steam",
    "small smile",
    "slight head tilt",
    "gentle fabric sway",
    "slow light shift",
    "locked camera",
    "still composition",
})


@dataclass(frozen=True)
class WorkflowDefinition:
    workflow_id: str
    filename: str
    version: int
    mutable_fields: dict[str, tuple[str, str]]


DEFINITIONS = {
    "flux_illustrated_redux": WorkflowDefinition("flux_illustrated_redux", "flux-illustrated-redux.v1.json", 1, {
        "reference_image": ("4", "image"), "prompt": ("5", "text"),
        "reference_strength": ("11", "strength"), "width": ("12", "width"),
        "height": ("12", "height"), "seed": ("13", "seed"), "steps": ("13", "steps"),
        "filename_prefix": ("15", "filename_prefix"),
    }),
    "flux_inpaint": WorkflowDefinition("flux_inpaint", "flux-inpaint.v1.json", 1, {
        "image": ("4", "image"), "mask": ("5", "image"), "prompt": ("6", "text"),
        "seed": ("10", "seed"), "steps": ("10", "steps"),
        "filename_prefix": ("12", "filename_prefix"),
    }),
    "flux_inpaint_canny": WorkflowDefinition("flux_inpaint_canny", "flux-inpaint-canny.v1.json", 1, {
        "image": ("4", "image"), "mask": ("5", "image"), "prompt": ("6", "text"),
        "seed": ("10", "seed"), "steps": ("10", "steps"),
        "control_strength": ("15", "strength"), "filename_prefix": ("12", "filename_prefix"),
    }),
    "wan_safe_motion": WorkflowDefinition("wan_safe_motion", "wan-safe-motion.v1.json", 1, {
        "image": ("5", "image"), "prompt": ("6", "text"),
        "negative_prompt": ("7", "text"), "seed": ("9", "seed"),
        "filename_prefix": ("12", "filename_prefix"),
    }),
}


class WorkflowRegistry:
    def __init__(self, workflows_root: Path):
        self.workflows_root = workflows_root

    def render(self, workflow_id: str, values: dict[str, Any]) -> tuple[Graph, dict[str, Any]]:
        definition = DEFINITIONS.get(workflow_id)
        if definition is None:
            raise ValidationError(f"unknown workflow: {workflow_id}")
        unknown = set(values) - set(definition.mutable_fields)
        if unknown:
            raise ValidationError(f"unsupported workflow fields: {sorted(unknown)}")
        path = self.workflows_root / definition.filename
        try:
            graph = copy.deepcopy(json.loads(path.read_text(encoding="utf-8")))
        except (OSError, json.JSONDecodeError) as exc:
            raise ValidationError(f"cannot load workflow template: {definition.filename}") from exc
        for name, value in values.items():
            node_id, input_name = definition.mutable_fields[name]
            graph[node_id]["inputs"][input_name] = value
        validate_graph(graph)
        return graph, {
            "id": definition.workflow_id,
            "version": definition.version,
            "template_sha256": sha256_file(path),
            "models": collect_model_names(graph),
        }


def validate_prompt(value: str) -> str:
    if not isinstance(value, str):
        raise ValidationError("prompt must be text")
    prompt = value.strip()
    if not prompt or len(prompt) > 4000:
        raise ValidationError("prompt must contain 1 to 4000 characters")
    if "http://" in prompt.lower() or "https://" in prompt.lower():
        raise ValidationError("prompts cannot contain external URLs")
    return prompt


def illustrated_prompt(value: str) -> str:
    return validate_prompt(value) + SAFE_STYLE_SUFFIX


def validate_motion_prompt(value: str) -> str:
    prompt = validate_prompt(value)
    clauses = [clause.strip().lower() for clause in prompt.split(",")]
    if not 1 <= len(clauses) <= 6 or any(clause not in SAFE_MOTION_CLAUSES for clause in clauses):
        raise ValidationError("v1 motion prompts must use approved ambient micro-motion clauses")
    return prompt


def resolve_preset(name: str) -> tuple[int, int]:
    if name not in PRESETS:
        raise ValidationError(f"unsupported preset: {name}")
    return PRESETS[name]


def resolve_quality(name: str) -> int:
    if name not in QUALITY_STEPS:
        raise ValidationError(f"unsupported quality: {name}")
    return QUALITY_STEPS[name]


def resolve_seed(seed: int) -> int:
    if seed == -1:
        return secrets.randbelow(MAX_SEED + 1)
    if isinstance(seed, bool) or not isinstance(seed, int) or not 0 <= seed <= MAX_SEED:
        raise ValidationError(f"seed must be -1 or between 0 and {MAX_SEED}")
    return seed


def validate_graph(graph: Graph) -> None:
    if not isinstance(graph, dict) or not graph:
        raise ValidationError("workflow graph cannot be empty")
    for node_id, node in graph.items():
        if not isinstance(node_id, str) or not isinstance(node, dict):
            raise ValidationError("workflow nodes must use string ids and object values")
        if not isinstance(node.get("class_type"), str) or not isinstance(node.get("inputs"), dict):
            raise ValidationError(f"workflow node {node_id} is malformed")
        for value in node["inputs"].values():
            if is_link(value) and value[0] not in graph:
                raise ValidationError(f"workflow node {node_id} references missing node {value[0]}")


def is_link(value: Any) -> bool:
    return isinstance(value, list) and len(value) == 2 and isinstance(value[0], str) and isinstance(value[1], int)


def collect_model_names(graph: Graph) -> list[str]:
    model_keys = {"unet_name", "clip_name", "clip_name1", "clip_name2", "vae_name", "style_model_name", "control_net_name"}
    return sorted({value for node in graph.values() for key, value in node["inputs"].items() if key in model_keys and isinstance(value, str)})


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()
