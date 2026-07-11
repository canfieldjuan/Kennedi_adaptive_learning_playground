from __future__ import annotations

import ast
import sys
import tempfile
import unittest
from pathlib import Path

TOOLS_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = TOOLS_ROOT.parents[1]
sys.path.insert(0, str(TOOLS_ROOT))

from content_foundry.config import FoundryConfig
from content_foundry.errors import ValidationError
from content_foundry.service import ContentFoundryService


class FakeComfyClient:
    def __init__(self) -> None:
        self.uploads: list[Path] = []
        self.graphs: list[dict] = []

    def status(self) -> dict:
        return {"test": "ready"}

    def upload(self, path: Path) -> str:
        self.uploads.append(path)
        return f"uploaded-{path.name}"

    def run(self, graph: dict, output_dir: Path) -> list[Path]:
        self.graphs.append(graph)
        output_dir.mkdir(parents=True, exist_ok=True)
        output = output_dir / "scene.png"
        output.write_bytes(b"generated image")
        return [output]


class FakeMedia:
    def probe(self, _path: Path) -> dict:
        return {"streams": [{"codec_type": "video", "width": 960, "height": 544}]}


class ServiceContractTests(unittest.TestCase):
    def test_generated_scene_remains_a_review_required_draft(self) -> None:
        with tempfile.TemporaryDirectory() as temp_name:
            local = Path(temp_name)
            imports = local / "imports"; imports.mkdir()
            (imports / "bear.png").write_bytes(b"reference")
            client = FakeComfyClient()
            config = FoundryConfig(PROJECT_ROOT, "http://127.0.0.1:8188", local / "drafts", imports, TOOLS_ROOT / "references", 60)
            service = ContentFoundryService(config, client=client)  # type: ignore[arg-type]
            service.media = FakeMedia()  # type: ignore[assignment]
            result = service.generate_illustrated_scene(prompt="Daddy Bear carries warm bread", reference_path="bear.png", seed=0, quality="draft", source_brief_id="brief-1")
            manifest = result["manifest"]
            self.assertEqual(manifest["status"], "draft")
            self.assertIsNone(manifest["approval"])
            self.assertTrue(manifest["qa"]["requires_parent_visual_review"])
            self.assertEqual(manifest["workflow"]["id"], "flux_illustrated_redux")
            self.assertEqual(manifest["inputs"]["seed"], 0)
            self.assertEqual(manifest["outputs"][0]["path"], "outputs/scene.png")
            self.assertTrue(service.validate_draft(draft_id=result["draft_id"])["valid"])
            graph = client.graphs[0]
            self.assertEqual((graph["12"]["inputs"]["width"], graph["12"]["inputs"]["height"]), (960, 544))
            self.assertEqual(graph["13"]["inputs"]["steps"], 16)

    def test_evidence_bearing_motion_is_rejected_before_upload(self) -> None:
        with tempfile.TemporaryDirectory() as temp_name:
            local = Path(temp_name)
            imports = local / "imports"; imports.mkdir(); (imports / "scene.png").write_bytes(b"scene")
            client = FakeComfyClient()
            config = FoundryConfig(PROJECT_ROOT, "http://127.0.0.1:8188", local / "drafts", imports, TOOLS_ROOT / "references", 60)
            service = ContentFoundryService(config, client=client)  # type: ignore[arg-type]
            with self.assertRaises(ValidationError):
                service.animate_scene_safe(image_path="scene.png", motion_prompt="pick up three berries")
            self.assertEqual(client.uploads, [])

    def test_boolean_strength_cannot_defeat_numeric_bounds(self) -> None:
        with tempfile.TemporaryDirectory() as temp_name:
            local = Path(temp_name)
            imports = local / "imports"; imports.mkdir(); (imports / "scene.png").write_bytes(b"scene")
            config = FoundryConfig(PROJECT_ROOT, "http://127.0.0.1:8188", local / "drafts", imports, TOOLS_ROOT / "references", 60)
            service = ContentFoundryService(config, client=FakeComfyClient())  # type: ignore[arg-type]
            with self.assertRaises(ValidationError):
                service.generate_illustrated_scene(prompt="Bear waves", reference_path="scene.png", reference_strength=True)  # type: ignore[arg-type]

    def test_mcp_surface_has_no_approval_or_publication_tool(self) -> None:
        source = (TOOLS_ROOT / "mcp_server.py").read_text(encoding="utf-8")
        tree = ast.parse(source)
        tool_functions = {
            node.name for node in tree.body if isinstance(node, ast.FunctionDef)
            and any(isinstance(decorator, ast.Call) and ast.unparse(decorator.func) == "mcp.tool" for decorator in node.decorator_list)
        }
        self.assertEqual(tool_functions, {"content_foundry_status", "generate_illustrated_scene", "edit_illustrated_scene", "animate_scene_safe", "assemble_narrated_clip", "validate_draft"})
        self.assertNotIn("public/assets", source)
        self.assertFalse(any("approve" in name or "publish" in name for name in tool_functions))


if __name__ == "__main__":
    unittest.main()
