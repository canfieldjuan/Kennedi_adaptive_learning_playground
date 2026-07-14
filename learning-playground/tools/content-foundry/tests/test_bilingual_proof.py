from __future__ import annotations

import hashlib
import json
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
from content_foundry.media import MediaTools, validate_bilingual_story_proof, validate_storyboard
from content_foundry.profiles import BILINGUAL_STORY_PROOF, SHORT_CLIP, FoundryProfile, get_profile


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def spanish_approval(text: str, audio_sha256: str = "1" * 64) -> dict:
    return {
        "spanish_text": text,
        "english_intent": "Approved English intent.",
        "register": "es-419",
        "pronunciation_review_status": "approved",
        "reviewer": "Fluent reviewer",
        "approved_at": "2026-07-13T18:00:00Z",
        "approval_version": "1",
        "audio_sha256": audio_sha256,
    }


def make_proof(*, scene_durations: list[int] | None = None) -> dict:
    durations = scene_durations or [9000] * 5
    bridge_text = "La puerta es roja."
    spanish_text = "El castillo despertó sin sus colores."
    return {
        "profile": "bilingual_story_proof",
        "title": "The Castle Lost Its Colors - proof",
        "source_brief_id": "issue-113-castle-proof",
        "scenes": [
            {"path": f"scene-{index}.png", "duration_ms": duration}
            for index, duration in enumerate(durations)
        ],
        "modes": {
            "english": {"narration": [{
                "cue_id": "english-opening",
                "path": "english.wav",
                "start_ms": 0,
                "language": "en",
                "text": "The castle woke up without its colors.",
            }]},
            "story_bridge": {"narration": [{
                "cue_id": "bridge-opening",
                "path": "bridge-en.wav",
                "start_ms": 0,
                "language": "en",
                "text": "The castle woke up without its colors.",
            }, {
                "cue_id": "bridge-red-door",
                "path": "bridge-es.wav",
                "start_ms": 9000,
                "language": "es-419",
                "text": bridge_text,
                "spanish_approval": spanish_approval(bridge_text),
            }]},
            "spanish_replay": {"narration": [{
                "cue_id": "spanish-opening",
                "path": "spanish.wav",
                "start_ms": 0,
                "language": "es-419",
                "text": spanish_text,
                "spanish_approval": spanish_approval(spanish_text),
            }]},
        },
    }


class FoundryProfileTests(unittest.TestCase):
    def test_short_clip_limits_remain_unchanged_and_proof_is_separate(self) -> None:
        self.assertEqual(SHORT_CLIP.as_record(), {
            "profile_id": "short_clip",
            "min_duration_seconds": 0.5,
            "max_duration_seconds": 30.0,
            "max_scene_count": 6,
            "max_narration_cues_per_mode": 12,
            "render_timeout_seconds": 300,
            "max_output_bytes": 64 * 1024 * 1024,
            "contact_sheet_samples": 8,
            "contact_sheet_columns": 4,
        })
        self.assertEqual(BILINGUAL_STORY_PROOF.max_duration_seconds, 90.0)
        self.assertEqual(BILINGUAL_STORY_PROOF.render_timeout_seconds, 900)
        self.assertIs(get_profile("short_clip"), SHORT_CLIP)
        self.assertIs(get_profile("bilingual_story_proof"), BILINGUAL_STORY_PROOF)
        with self.assertRaisesRegex(ValidationError, "unsupported Content Foundry profile"):
            get_profile("bilingual_story_episode")

    def test_lookalike_profile_cannot_raise_canonical_limits(self) -> None:
        loosened = FoundryProfile(
            profile_id="bilingual_story_proof",
            min_duration_seconds=0.5,
            max_duration_seconds=3600,
            max_scene_count=100,
            max_narration_cues_per_mode=100,
            render_timeout_seconds=3600,
            max_output_bytes=1024 * 1024 * 1024,
            contact_sheet_samples=100,
            contact_sheet_columns=10,
        )
        with self.assertRaisesRegex(ValidationError, "canonical profile"):
            validate_bilingual_story_proof(make_proof(), profile=loosened)

    def test_short_clip_still_accepts_30_seconds_and_rejects_more(self) -> None:
        exact = {
            "title": "Exact short clip",
            "scenes": [{"path": "scene.png", "duration_ms": 5000}] * 6,
            "narration": [
                {"path": "voice.wav", "start_ms": index * 1000}
                for index in range(12)
            ],
        }
        self.assertEqual(sum(scene["duration_ms"] for scene in validate_storyboard(exact)[1]), 30000)
        too_long = json.loads(json.dumps(exact))
        too_long["scenes"][-1]["duration_ms"] = 5001
        with self.assertRaisesRegex(ValidationError, "short_clip limit"):
            validate_storyboard(too_long)

    def test_proof_duration_accepts_inclusive_edges_and_rejects_both_sides(self) -> None:
        for durations in ([9000] * 5, [10000] * 9):
            with self.subTest(durations=durations):
                validate_bilingual_story_proof(make_proof(scene_durations=list(durations)))
        for durations in ([10000, 10000, 10000, 10000, 4999], [10000] * 9 + [500]):
            with self.subTest(durations=durations), self.assertRaisesRegex(
                ValidationError, "45 to 90 seconds"
            ):
                validate_bilingual_story_proof(make_proof(scene_durations=list(durations)))

    def test_proof_rejects_scene_cue_mode_language_and_id_boundary_defeats(self) -> None:
        cases: list[tuple[str, dict, str]] = []
        too_many_scenes = make_proof(scene_durations=[3500] * 13)
        cases.append(("scenes", too_many_scenes, "1 to 12 scenes"))
        too_many_cues = make_proof()
        too_many_cues["modes"]["english"]["narration"] = [
            {
                "cue_id": f"english-{index}",
                "path": "english.wav",
                "start_ms": index * 1000,
                "language": "en",
                "text": "Line.",
            }
            for index in range(25)
        ]
        cases.append(("cues", too_many_cues, "1 to 24 narration cues"))
        missing_mode = make_proof()
        del missing_mode["modes"]["spanish_replay"]
        cases.append(("modes", missing_mode, "exactly english"))
        weak_bridge = make_proof()
        weak_bridge["modes"]["story_bridge"]["narration"][1]["language"] = "en"
        del weak_bridge["modes"]["story_bridge"]["narration"][1]["spanish_approval"]
        cases.append(("bridge languages", weak_bridge, "must include en and es-419"))
        duplicate_id = make_proof()
        duplicate_id["modes"]["spanish_replay"]["narration"][0]["cue_id"] = "english-opening"
        cases.append(("ids", duplicate_id, "globally unique"))
        for label, value, message in cases:
            with self.subTest(label=label), self.assertRaisesRegex(ValidationError, message):
                validate_bilingual_story_proof(value)

    def test_proof_accepts_exact_scene_and_per_mode_cue_caps(self) -> None:
        proof = make_proof(scene_durations=[3750] * 12)
        proof["modes"]["english"]["narration"] = [
            {
                "cue_id": f"english-cap-{index}",
                "path": "english.wav",
                "start_ms": index * 1000,
                "language": "en",
                "text": "English line.",
            }
            for index in range(24)
        ]
        proof["modes"]["story_bridge"]["narration"] = [
            {
                "cue_id": f"bridge-cap-{index}",
                "path": "bridge-es.wav" if index == 23 else "bridge-en.wav",
                "start_ms": index * 1000,
                "language": "es-419" if index == 23 else "en",
                "text": "La puerta es roja." if index == 23 else "English bridge line.",
                **({"spanish_approval": spanish_approval("La puerta es roja.")} if index == 23 else {}),
            }
            for index in range(24)
        ]
        proof["modes"]["spanish_replay"]["narration"] = [
            {
                "cue_id": f"spanish-cap-{index}",
                "path": "spanish.wav",
                "start_ms": index * 1000,
                "language": "es-419",
                "text": "El castillo tiene colores.",
                "spanish_approval": spanish_approval("El castillo tiene colores."),
            }
            for index in range(24)
        ]

        _title, scenes, modes, _brief = validate_bilingual_story_proof(proof)

        self.assertEqual(len(scenes), 12)
        self.assertTrue(all(len(modes[mode]) == 24 for mode in modes))

    def test_spanish_review_gate_rejects_pending_text_drift_and_bad_hash(self) -> None:
        cases: list[tuple[str, dict, str]] = []
        pending = make_proof()
        pending["modes"]["spanish_replay"]["narration"][0]["spanish_approval"]["pronunciation_review_status"] = "pending"
        cases.append(("pending", pending, "must be approved"))
        drift = make_proof()
        drift["modes"]["spanish_replay"]["narration"][0]["spanish_approval"]["spanish_text"] = "Otro texto."
        cases.append(("text", drift, "does not match"))
        bad_hash = make_proof()
        bad_hash["modes"]["spanish_replay"]["narration"][0]["spanish_approval"]["audio_sha256"] = "nope"
        cases.append(("hash", bad_hash, "audio hash is invalid"))
        date_only = make_proof()
        date_only["modes"]["spanish_replay"]["narration"][0]["spanish_approval"]["approved_at"] = "2026-07-13Z"
        cases.append(("timestamp", date_only, "timestamp is invalid"))
        for label, value, message in cases:
            with self.subTest(label=label), self.assertRaisesRegex(ValidationError, message):
                validate_bilingual_story_proof(value)


class BilingualProofAssemblyTests(unittest.TestCase):
    def make_local_proof(self, root: Path) -> tuple[MediaTools, Path, dict]:
        imports = root / "imports"
        references = root / "references"
        imports.mkdir()
        references.mkdir()
        for index in range(5):
            (imports / f"scene-{index}.png").write_bytes(f"scene-{index}".encode())
        audio = {
            "english.wav": b"english",
            "bridge-en.wav": b"bridge-en",
            "bridge-es.wav": b"bridge-es",
            "spanish.wav": b"spanish",
        }
        for name, data in audio.items():
            (imports / name).write_bytes(data)
        proof = make_proof()
        proof["modes"]["story_bridge"]["narration"][1]["spanish_approval"]["audio_sha256"] = digest(audio["bridge-es.wav"])
        proof["modes"]["spanish_replay"]["narration"][0]["spanish_approval"]["audio_sha256"] = digest(audio["spanish.wav"])
        storyboard = imports / "proof.json"
        storyboard.write_text(json.dumps(proof), encoding="utf-8")
        config = FoundryConfig(root, "http://127.0.0.1:8188", root / "drafts", imports, references, 60)
        return MediaTools(config, DraftStore(config.drafts_root)), storyboard, proof

    def test_proof_assembly_emits_three_hashed_mode_exports_and_profile_qa(self) -> None:
        with tempfile.TemporaryDirectory() as temp_name:
            root = Path(temp_name)
            media, _storyboard, _proof = self.make_local_proof(root)
            assembled_scene_sets: list[list[Path]] = []

            def probe(path: Path, *, timeout_seconds: int = 300) -> dict:
                self.assertIn(timeout_seconds, {300, 900})
                if path.suffix == ".png":
                    return {"streams": [{"codec_type": "video", "width": 960, "height": 544}]}
                return {"streams": [{"codec_type": "audio"}]}

            def assemble(
                scenes: list[tuple[Path, int]],
                narration: list[tuple[Path, int]],
                output: Path,
                total_seconds: float,
                *,
                timeout_seconds: int,
            ) -> None:
                self.assertEqual(total_seconds, 45.0)
                self.assertEqual(timeout_seconds, 900)
                self.assertTrue(narration)
                assembled_scene_sets.append([path for path, _duration in scenes])
                output.write_bytes(f"mode-{len(assembled_scene_sets)}".encode())

            def inspect(path: Path, *, profile) -> dict:
                self.assertIs(profile, BILINGUAL_STORY_PROOF)
                return {"duration_seconds": 45.0, "bytes": path.stat().st_size}

            def command(args: list[str], *, timeout_seconds: int = 300) -> subprocess.CompletedProcess[str]:
                self.assertEqual(timeout_seconds, 900)
                Path(args[-1]).write_bytes(b"poster")
                return subprocess.CompletedProcess(args, 0, "", "")

            def contact(
                _video: Path,
                destination: Path,
                *,
                sample_count: int,
                columns: int,
                timeout_seconds: int,
            ) -> None:
                self.assertEqual((sample_count, columns, timeout_seconds), (12, 4, 900))
                destination.write_bytes(b"contact")

            with patch.object(media, "probe", side_effect=probe), patch.object(
                media, "audio_peak", return_value=-6.0
            ), patch.object(media, "_assemble_video", side_effect=assemble), patch.object(
                media, "inspect_learning_clip", side_effect=inspect
            ), patch.object(media, "_run", side_effect=command), patch.object(
                media, "create_contact_sheet", side_effect=contact
            ):
                result = media.assemble_bilingual_story_proof("proof.json")

            manifest = result["manifest"]
            self.assertEqual(manifest["kind"], "bilingual_story_proof")
            self.assertEqual(manifest["status"], "draft")
            self.assertIsNone(manifest["approval"])
            self.assertEqual(manifest["inputs"]["profile"], BILINGUAL_STORY_PROOF.as_record())
            self.assertEqual(len(assembled_scene_sets), 3)
            self.assertTrue(all(paths == assembled_scene_sets[0] for paths in assembled_scene_sets[1:]))
            self.assertEqual({output["role"] for output in manifest["outputs"]}, {
                "story_mode_english",
                "story_mode_story_bridge",
                "story_mode_spanish_replay",
                "poster",
                "contact_sheet",
            })
            self.assertTrue(all(len(output["sha256"]) == 64 for output in manifest["outputs"]))
            qa = manifest["qa"]["checks"][-1]
            self.assertEqual((qa["name"], qa["status"]), ("bilingual_story_proof_contract", "pass"))
            self.assertEqual(set(qa["details"]["modes"]), {"english", "story_bridge", "spanish_replay"})
            self.assertEqual(qa["details"]["contact_sheet"], {"samples": 12, "columns": 4})
            self.assertEqual(qa["details"]["spanish_review"]["status"], "pass")

    def test_spanish_approval_hash_must_match_snapshotted_audio(self) -> None:
        with tempfile.TemporaryDirectory() as temp_name:
            root = Path(temp_name)
            media, storyboard, proof = self.make_local_proof(root)
            proof["modes"]["spanish_replay"]["narration"][0]["spanish_approval"]["audio_sha256"] = "0" * 64
            storyboard.write_text(json.dumps(proof), encoding="utf-8")

            def probe(path: Path, *, timeout_seconds: int = 300) -> dict:
                if path.suffix == ".png":
                    return {"streams": [{"codec_type": "video", "width": 960, "height": 544}]}
                return {"streams": [{"codec_type": "audio"}]}

            with patch.object(media, "probe", side_effect=probe), patch.object(
                media, "audio_peak", return_value=-6.0
            ), self.assertRaisesRegex(ValidationError, "audio hash does not match"):
                media.assemble_bilingual_story_proof("proof.json")
            self.assertFalse((root / "drafts").exists())

    def test_profile_contact_sheet_density_and_output_size_are_enforced(self) -> None:
        with tempfile.TemporaryDirectory() as temp_name:
            root = Path(temp_name)
            config = FoundryConfig(root, "http://127.0.0.1:8188", root / "drafts", root / "imports", root / "references", 60)
            media = MediaTools(config, DraftStore(config.drafts_root))
            output = root / "proof.webm"
            with output.open("wb") as output_file:
                output_file.truncate(BILINGUAL_STORY_PROOF.max_output_bytes + 1)
            probe = {
                "format": {"duration": "45"},
                "streams": [
                    {"codec_type": "video", "codec_name": "vp9", "width": 960, "height": 544},
                    {"codec_type": "audio", "codec_name": "opus", "sample_rate": "48000", "channels": 1},
                ],
            }
            with patch.object(media, "probe", return_value=probe), self.assertRaisesRegex(
                ValidationError, "output size limit"
            ):
                media.inspect_learning_clip(output, profile=BILINGUAL_STORY_PROOF)

            with output.open("wb") as output_file:
                output_file.truncate(BILINGUAL_STORY_PROOF.max_output_bytes)
            with patch.object(media, "probe", return_value=probe), patch.object(
                media,
                "loudness",
                return_value={"integrated_lufs": -18.0, "true_peak_dbtp": -2.0},
            ):
                details = media.inspect_learning_clip(output, profile=BILINGUAL_STORY_PROOF)
            self.assertEqual(details["bytes"], BILINGUAL_STORY_PROOF.max_output_bytes)

            with patch.object(media, "probe", return_value={"format": {"duration": "45"}}), patch.object(
                media, "_run"
            ) as run:
                media.create_contact_sheet(
                    output,
                    root / "contact.png",
                    sample_count=12,
                    columns=4,
                    timeout_seconds=900,
                )
            args = run.call_args.args[0]
            self.assertIn("tile=4x3", args[args.index("-vf") + 1])
            self.assertEqual(run.call_args.kwargs["timeout_seconds"], 900)
            with patch.object(media, "probe", return_value={"format": {"duration": "45"}}), self.assertRaisesRegex(
                ValidationError, "finite rectangular grid"
            ):
                media.create_contact_sheet(output, root / "bad-contact.png", sample_count=True, columns=1)


if __name__ == "__main__":
    unittest.main()
