from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

TOOLS_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOLS_ROOT))

from content_foundry.config import FoundryConfig
from content_foundry.drafts import DraftStore
from content_foundry.errors import ValidationError
from content_foundry.media import MediaTools, validate_storyboard


class StoryboardValidationTests(unittest.TestCase):
    def test_valid_storyboard_returns_normalized_fields(self) -> None:
        title, scenes, cues, brief = validate_storyboard({
            "title": " Bear Bread ", "scenes": [{"path": "scene.png", "duration_ms": 500}],
            "narration": [{"path": "voice.wav", "start_ms": 0}], "source_brief_id": "brief-1",
        })
        self.assertEqual(title, "Bear Bread")
        self.assertEqual(len(scenes), 1)
        self.assertEqual(len(cues), 1)
        self.assertEqual(brief, "brief-1")

    def test_storyboard_caps_and_boolean_defeats_are_rejected(self) -> None:
        base = {"title": "Clip", "scenes": [{"path": "scene.png", "duration_ms": 500}], "narration": [{"path": "voice.wav", "start_ms": 0}]}
        cases = []
        value = json.loads(json.dumps(base)); value["scenes"][0]["duration_ms"] = True; cases.append(value)
        value = json.loads(json.dumps(base)); value["narration"][0]["start_ms"] = False; cases.append(value)
        value = json.loads(json.dumps(base)); value["scenes"] = [{"path": "scene.png", "duration_ms": 10000}] * 4; cases.append(value)
        value = json.loads(json.dumps(base)); value["narration"][0]["start_ms"] = 500; cases.append(value)
        for value in cases:
            with self.subTest(value=value), self.assertRaises(ValidationError):
                validate_storyboard(value)

    def test_short_motion_contact_sheet_samples_across_the_clip(self) -> None:
        with tempfile.TemporaryDirectory() as temp_name:
            root = Path(temp_name)
            config = FoundryConfig(root, "http://127.0.0.1:8188", root / "drafts", root / "imports", root / "references", 60)
            media = MediaTools(config, DraftStore(config.drafts_root))
            with patch.object(media, "probe", return_value={"format": {"duration": "3.375"}}), patch.object(media, "_run") as run:
                media.create_contact_sheet(root / "motion.mp4", root / "contact.png")
            args = run.call_args.args[0]
            filter_value = args[args.index("-vf") + 1]
            sample_rate = float(filter_value.split(",", 1)[0].removeprefix("fps="))
            self.assertAlmostEqual(sample_rate * 3.375, 8, places=6)


class MediaIntegrationTests(unittest.TestCase):
    def run_command(self, args: list[str]) -> subprocess.CompletedProcess[bytes]:
        return subprocess.run(args, check=True, capture_output=True, timeout=60)

    def max_volume(self, path: Path, *, start: float, duration: float) -> float:
        result = self.run_command([
            "ffmpeg", "-hide_banner", "-nostats", "-ss", str(start), "-t", str(duration),
            "-i", str(path), "-map", "0:a:0", "-af", "volumedetect", "-f", "null", "-",
        ])
        match = re.search(rb"max_volume:\s*(-?[0-9.]+) dB", result.stderr)
        self.assertIsNotNone(match)
        return float(match.group(1))

    def test_three_scene_human_narration_clip_meets_media_contract(self) -> None:
        with tempfile.TemporaryDirectory() as temp_name:
            root = Path(temp_name)
            imports, drafts, references = root / "imports", root / "drafts", root / "references"
            imports.mkdir(); references.mkdir()
            for index, color in enumerate(("#6f4e9c", "#f0b84b", "#4f9d69"), start=1):
                self.run_command(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", f"color=c={color}:s=960x544:d=0.1", "-frames:v", "1", str(imports / f"scene-{index}.png")])
                self.run_command(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", f"sine=frequency={350 + index * 100}:duration=0.65", "-af", "volume=0.5", "-ar", "48000", "-ac", "1", str(imports / f"voice-{index}.wav")])
            storyboard = {
                "title": "Synthetic three-scene contract clip", "source_brief_id": "test-brief",
                "scenes": [{"path": f"scene-{index}.png", "duration_ms": 1500} for index in range(1, 4)],
                "narration": [{"path": f"voice-{index}.wav", "start_ms": (index - 1) * 1500} for index in range(1, 4)],
            }
            (imports / "storyboard.json").write_text(json.dumps(storyboard), encoding="utf-8")
            config = FoundryConfig(root, "http://127.0.0.1:8188", drafts, imports, references, 60)
            result = MediaTools(config, DraftStore(drafts)).assemble_storyboard("storyboard.json")
            draft_dir, manifest = Path(result["draft_dir"]), result["manifest"]
            self.assertEqual(manifest["status"], "draft")
            self.assertTrue(manifest["qa"]["requires_parent_visual_review"])
            self.assertEqual(manifest["qa"]["checks"][-1]["status"], "pass")
            self.assertEqual({item["role"] for item in manifest["outputs"]}, {"learning_clip", "poster", "contact_sheet"})
            for output in manifest["outputs"]:
                self.assertTrue((draft_dir / output["path"]).is_file())
                self.assertEqual(len(output["sha256"]), 64)
            details = manifest["qa"]["checks"][-1]["details"]
            self.assertEqual((details["video"]["codec_name"], details["video"]["width"], details["video"]["height"]), ("vp9", 960, 544))
            self.assertEqual((details["audio"]["codec_name"], int(details["audio"]["sample_rate"]), details["audio"]["channels"]), ("opus", 48000, 1))
            self.assertLessEqual(details["duration_seconds"], 30.1)
            self.assertGreaterEqual(details["integrated_lufs"], -19.0)
            self.assertLessEqual(details["integrated_lufs"], -17.0)
            self.assertLessEqual(details["true_peak_dbtp"], -2.0)

    def test_stereo_narration_stays_silent_until_its_storyboard_start(self) -> None:
        with tempfile.TemporaryDirectory() as temp_name:
            root = Path(temp_name)
            imports, drafts, references = root / "imports", root / "drafts", root / "references"
            imports.mkdir(); references.mkdir()
            self.run_command([
                "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi",
                "-i", "color=c=#6f4e9c:s=960x544:d=0.1", "-frames:v", "1", str(imports / "scene.png"),
            ])
            self.run_command([
                "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi",
                "-i", "sine=frequency=440:duration=1.2",
                "-af", "pan=stereo|c0=c0|c1=c0,volume=0.5", "-ar", "48000", str(imports / "stereo.wav"),
            ])
            storyboard = {
                "title": "Stereo delay contract",
                "scenes": [{"path": "scene.png", "duration_ms": 3000}],
                "narration": [{"path": "stereo.wav", "start_ms": 1000}],
            }
            (imports / "storyboard.json").write_text(json.dumps(storyboard), encoding="utf-8")
            config = FoundryConfig(root, "http://127.0.0.1:8188", drafts, imports, references, 60)
            result = MediaTools(config, DraftStore(drafts)).assemble_storyboard("storyboard.json")
            clip = Path(result["draft_dir"]) / "learning-clip.webm"

            self.assertLessEqual(self.max_volume(clip, start=0, duration=0.75), -60)
            self.assertGreater(self.max_volume(clip, start=1.05, duration=0.45), -40)


if __name__ == "__main__":
    unittest.main()
