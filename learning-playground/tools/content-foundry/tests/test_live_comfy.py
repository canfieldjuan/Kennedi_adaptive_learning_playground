from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path
from typing import Any

TOOLS_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOLS_ROOT))

from content_foundry.comfy_client import ComfyClient
from content_foundry.config import FoundryConfig
from content_foundry.workflows import DEFINITIONS, WorkflowRegistry


@unittest.skipUnless(os.environ.get("CONTENT_FOUNDRY_LIVE") == "1", "set CONTENT_FOUNDRY_LIVE=1 for local ComfyUI compatibility checks")
class LiveComfyCompatibilityTests(unittest.TestCase):
    def test_canonical_nodes_and_models_exist_in_live_comfy(self) -> None:
        config = FoundryConfig.discover()
        client = ComfyClient(config.comfy_url, timeout_seconds=config.job_timeout_seconds)
        object_info = client._json_request("GET", "/object_info")
        registry = WorkflowRegistry(TOOLS_ROOT / "workflows")
        model_fields = {"unet_name", "clip_name", "clip_name1", "clip_name2", "vae_name", "style_model_name", "control_net_name"}
        for workflow_id in DEFINITIONS:
            graph, _ = registry.render(workflow_id, {})
            for node_id, node in graph.items():
                with self.subTest(workflow=workflow_id, node=node_id, class_type=node["class_type"]):
                    self.assertIn(node["class_type"], object_info)
                definition = object_info.get(node["class_type"], {})
                for field, value in node["inputs"].items():
                    if field not in model_fields or not isinstance(value, str):
                        continue
                    allowed = allowed_values(definition, field)
                    with self.subTest(workflow=workflow_id, node=node_id, model=value):
                        self.assertIsNotNone(allowed)
                        self.assertIn(value, allowed)


def allowed_values(definition: Any, field: str) -> list[str] | None:
    if not isinstance(definition, dict):
        return None
    inputs = definition.get("input", {})
    if not isinstance(inputs, dict):
        return None
    for group_name in ("required", "optional"):
        group = inputs.get(group_name, {})
        if not isinstance(group, dict) or field not in group:
            continue
        descriptor = group[field]
        if isinstance(descriptor, list) and descriptor and isinstance(descriptor[0], list):
            return [value for value in descriptor[0] if isinstance(value, str)]
    return None


if __name__ == "__main__":
    unittest.main()
