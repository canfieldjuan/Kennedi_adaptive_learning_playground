from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

TOOLS_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOLS_ROOT))

from content_foundry.config import MAX_SEED, FoundryConfig, parse_timeout, validate_loopback_url
from content_foundry.errors import ValidationError
from content_foundry.workflows import DEFINITIONS, WorkflowRegistry, illustrated_prompt, resolve_preset, resolve_quality, resolve_seed, validate_graph, validate_motion_prompt, validate_prompt


class ConfigTests(unittest.TestCase):
    def test_loopback_urls_accept_only_plain_local_http(self) -> None:
        self.assertEqual(validate_loopback_url("http://127.0.0.1:8188/"), "http://127.0.0.1:8188")
        self.assertEqual(validate_loopback_url("http://localhost:8188"), "http://localhost:8188")
        self.assertEqual(validate_loopback_url("http://[::1]:8188"), "http://[::1]:8188")
        for value in ("https://127.0.0.1:8188", "http://example.com:8188", "http://user:pass@localhost:8188", "http://localhost:8188/api", "http://localhost:8188?next=http://example.com", "http://localhost:99999"):
            with self.subTest(value=value), self.assertRaises(ValidationError):
                validate_loopback_url(value)

    def test_timeout_has_finite_inclusive_bounds(self) -> None:
        self.assertEqual(parse_timeout("30"), 30)
        self.assertEqual(parse_timeout("1800"), 1800)
        for value in ("29", "1801", "false", "30.5"):
            with self.subTest(value=value), self.assertRaises(ValidationError):
                parse_timeout(value)

    def test_direct_config_construction_cannot_bypass_loopback_or_timeout_guards(self) -> None:
        with tempfile.TemporaryDirectory() as temp_name:
            root = Path(temp_name)
            with self.assertRaises(ValidationError):
                FoundryConfig(root, "http://example.com:8188", root / "drafts", root / "imports", root / "references", 60)
            for timeout in (True, 0, "60"):
                with self.subTest(timeout=timeout), self.assertRaises(ValidationError):
                    FoundryConfig(root, "http://127.0.0.1:8188", root / "drafts", root / "imports", root / "references", timeout)  # type: ignore[arg-type]

    def test_input_resolution_stays_inside_approved_roots(self) -> None:
        with tempfile.TemporaryDirectory() as temp_name:
            root = Path(temp_name)
            imports, references, drafts = root / "imports", root / "references", root / "drafts"
            imports.mkdir()
            references.mkdir()
            config = FoundryConfig(root, "http://127.0.0.1:8188", drafts, imports, references, 60)
            local = imports / "scene.png"
            local.write_bytes(b"abc")
            reference = references / "style.png"
            reference.write_bytes(b"abcd")
            outside = root / "outside.png"
            outside.write_bytes(b"x")
            escape = imports / "escape.png"
            escape.symlink_to(outside)
            self.assertEqual(config.resolve_input("scene.png", max_bytes=3), local.resolve())
            self.assertEqual(config.resolve_input(str(reference), max_bytes=4), reference.resolve())
            for value in (str(outside), str(escape), "missing.png"):
                with self.subTest(value=value), self.assertRaises(ValidationError):
                    config.resolve_input(value, max_bytes=10)
            with self.assertRaises(ValidationError):
                config.resolve_input("scene.png", max_bytes=2)


class WorkflowTests(unittest.TestCase):
    def setUp(self) -> None:
        self.registry = WorkflowRegistry(TOOLS_ROOT / "workflows")

    def test_every_canonical_template_loads_and_records_models(self) -> None:
        for workflow_id in DEFINITIONS:
            with self.subTest(workflow_id=workflow_id):
                graph, metadata = self.registry.render(workflow_id, {})
                self.assertTrue(graph)
                self.assertEqual(metadata["id"], workflow_id)
                self.assertEqual(metadata["version"], 1)
                self.assertEqual(len(metadata["template_sha256"]), 64)
                self.assertTrue(metadata["models"])

    def test_only_declared_fields_can_mutate_a_template_copy(self) -> None:
        graph, _ = self.registry.render("flux_illustrated_redux", {"seed": 0, "width": 1024})
        self.assertEqual(graph["13"]["inputs"]["seed"], 0)
        self.assertEqual(graph["12"]["inputs"]["width"], 1024)
        original = json.loads((TOOLS_ROOT / "workflows" / "flux-illustrated-redux.v1.json").read_text())
        self.assertEqual(original["12"]["inputs"]["width"], 960)
        with self.assertRaises(ValidationError):
            self.registry.render("flux_illustrated_redux", {"batch_size": 100})
        with self.assertRaises(ValidationError):
            self.registry.render("missing", {})

    def test_graph_validation_rejects_missing_references(self) -> None:
        with self.assertRaises(ValidationError):
            validate_graph({"1": {"class_type": "SaveImage", "inputs": {"images": ["2", 0]}}})

    def test_prompt_and_motion_guards_probe_both_sides(self) -> None:
        self.assertEqual(validate_prompt("  gentle steam  "), "gentle steam")
        self.assertIn("storybook illustration", illustrated_prompt("Bear waves"))
        self.assertEqual(validate_motion_prompt("subtle breathing, one blink, locked camera"), "subtle breathing, one blink, locked camera")
        for value in ("", "x" * 4001, "visit HTTPS://example.com", "pick up two berries", "bear places three berries", "move the letter"):
            target = validate_motion_prompt if "berries" in value or "letter" in value else validate_prompt
            with self.subTest(value=value[:30]), self.assertRaises(ValidationError):
                target(value)

    def test_presets_quality_and_seed_are_bounded(self) -> None:
        self.assertEqual(resolve_preset("video_scene"), (960, 544))
        self.assertEqual(resolve_quality("draft"), 16)
        self.assertEqual(resolve_seed(0), 0)
        self.assertEqual(resolve_seed(MAX_SEED), MAX_SEED)
        self.assertGreaterEqual(resolve_seed(-1), 0)
        for value in (True, -2, MAX_SEED + 1, 1.5, "1"):
            with self.subTest(value=value), self.assertRaises(ValidationError):
                resolve_seed(value)  # type: ignore[arg-type]
        with self.assertRaises(ValidationError):
            resolve_preset("phone")
        with self.assertRaises(ValidationError):
            resolve_quality("unbounded")

    def test_wan_template_encodes_calibrated_fixed_motion_budget(self) -> None:
        graph, _ = self.registry.render("wan_safe_motion", {})
        self.assertEqual((graph["8"]["inputs"]["width"], graph["8"]["inputs"]["height"]), (480, 272))
        self.assertEqual(graph["8"]["inputs"]["length"], 81)
        self.assertEqual(graph["11"]["inputs"]["fps"], 24.0)


if __name__ == "__main__":
    unittest.main()
