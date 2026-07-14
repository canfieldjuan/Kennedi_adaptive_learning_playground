from __future__ import annotations

import hashlib
import json
import math
import re
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any

from .config import MAX_AUDIO_INPUT_BYTES, FoundryConfig
from .drafts import DraftStore, sha256_file
from .errors import FoundryError, ValidationError
from .profiles import BILINGUAL_STORY_PROOF, SHORT_CLIP, FoundryProfile, require_canonical_profile

VIDEO_WIDTH = 960
VIDEO_HEIGHT = 544
VIDEO_FPS = 24
MAX_CLIP_SECONDS = SHORT_CLIP.max_duration_seconds
MAX_SCENE_INPUT_BYTES = 250 * 1024 * 1024
MAX_SCENE_WIDTH = 1920
MAX_SCENE_HEIGHT = 1080
MAX_SCENE_PIXELS = MAX_SCENE_WIDTH * MAX_SCENE_HEIGHT
MAX_SCENE_FPS = 60.0
IMAGE_SUFFIXES = frozenset({".png", ".jpg", ".jpeg", ".webp"})
BILINGUAL_MODES = ("english", "story_bridge", "spanish_replay")
SHA256_PATTERN = re.compile(r"^[0-9a-f]{64}$")
UTC_TIMESTAMP_PATTERN = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$"
)


class MediaTools:
    def __init__(self, config: FoundryConfig, store: DraftStore):
        self.config = config
        self.store = store

    def assemble_storyboard(self, storyboard_path: str) -> dict[str, Any]:
        profile = SHORT_CLIP
        path = self.config.resolve_input(storyboard_path, max_bytes=256 * 1024)
        try:
            spec = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise ValidationError("storyboard must be valid JSON") from exc
        title, scenes, narration, source_brief_id = validate_storyboard(spec, profile=profile)
        with tempfile.TemporaryDirectory(prefix="foundry-storyboard-inputs-") as temp_name:
            snapshots = Path(temp_name)
            resolved_scenes = []
            source_inputs = []
            for index, item in enumerate(scenes):
                source = self.config.resolve_input(item["path"], max_bytes=MAX_SCENE_INPUT_BYTES)
                snapshot, record = snapshot_source(
                    source, snapshots / f"scene-{index:02d}{source.suffix.lower()}", MAX_SCENE_INPUT_BYTES
                )
                scene_details = self._inspect_scene_input(
                    snapshot,
                    timeout_seconds=profile.render_timeout_seconds,
                )
                resolved_scenes.append((snapshot, item["duration_ms"]))
                source_inputs.append({**record, "duration_ms": item["duration_ms"], **scene_details})

            resolved_narration = []
            narration_inputs = []
            for index, item in enumerate(narration):
                source = self.config.resolve_input(item["path"], max_bytes=MAX_AUDIO_INPUT_BYTES)
                snapshot, record = snapshot_source(
                    source, snapshots / f"narration-{index:02d}{source.suffix.lower()}", MAX_AUDIO_INPUT_BYTES
                )
                stream = first_stream(self.probe(snapshot), "audio")
                if stream is None:
                    raise ValidationError(f"narration has no audio stream: {source.name}")
                peak = self.audio_peak(snapshot)
                if peak >= -0.1:
                    raise ValidationError(f"narration is clipped or too close to 0 dBFS: {source.name}")
                resolved_narration.append((snapshot, item["start_ms"]))
                narration_inputs.append({**record, "start_ms": item["start_ms"], "source_peak_dbfs": peak})

            draft_id, draft_dir, manifest = self.store.create(
                kind="narrated_clip",
                workflow={"id": "human_narration_assembly", "version": 1, "models": []},
                inputs={
                    "profile": profile.as_record(),
                    "title": title,
                    "scenes": source_inputs,
                    "narration": narration_inputs,
                },
                source_brief_id=source_brief_id,
            )
            output = draft_dir / "learning-clip.webm"
            poster = draft_dir / "poster.png"
            contact_sheet = draft_dir / "contact-sheet.png"
            total_seconds = sum(duration for _, duration in resolved_scenes) / 1000
            try:
                self._assemble_video(
                    resolved_scenes,
                    resolved_narration,
                    output,
                    total_seconds,
                    timeout_seconds=profile.render_timeout_seconds,
                )
                self._run(
                    ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-sseof", "-0.1", "-i", str(output), "-frames:v", "1", str(poster)],
                    timeout_seconds=profile.render_timeout_seconds,
                )
                self.create_contact_sheet(
                    output,
                    contact_sheet,
                    sample_count=profile.contact_sheet_samples,
                    columns=profile.contact_sheet_columns,
                    timeout_seconds=profile.render_timeout_seconds,
                )
                qa = self.inspect_learning_clip(output, profile=profile)
                for candidate, role in ((output, "learning_clip"), (poster, "poster"), (contact_sheet, "contact_sheet")):
                    self.store.add_output(draft_dir, manifest, candidate, role=role)
                self.store.add_qa(draft_dir, manifest, {"name": "media_contract", "status": "pass", "details": qa})
            except Exception as exc:
                self.store.add_qa(draft_dir, manifest, {"name": "media_contract", "status": "fail", "details": str(exc)})
                raise
            return {"draft_id": draft_id, "draft_dir": str(draft_dir), "manifest": manifest}

    def assemble_bilingual_story_proof(self, storyboard_path: str) -> dict[str, Any]:
        profile = BILINGUAL_STORY_PROOF
        path = self.config.resolve_input(storyboard_path, max_bytes=512 * 1024)
        try:
            spec = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise ValidationError("bilingual proof storyboard must be valid JSON") from exc
        title, scenes, modes, source_brief_id = validate_bilingual_story_proof(spec, profile=profile)

        with tempfile.TemporaryDirectory(prefix="foundry-bilingual-proof-inputs-") as temp_name:
            snapshots = Path(temp_name)
            resolved_scenes: list[tuple[Path, int]] = []
            source_scenes: list[dict[str, Any]] = []
            for index, item in enumerate(scenes):
                source = self.config.resolve_input(item["path"], max_bytes=MAX_SCENE_INPUT_BYTES)
                snapshot, record = snapshot_source(
                    source,
                    snapshots / f"scene-{index:02d}{source.suffix.lower()}",
                    MAX_SCENE_INPUT_BYTES,
                )
                scene_details = self._inspect_scene_input(
                    snapshot,
                    timeout_seconds=profile.render_timeout_seconds,
                )
                resolved_scenes.append((snapshot, item["duration_ms"]))
                source_scenes.append({**record, "duration_ms": item["duration_ms"], **scene_details})

            resolved_modes: dict[str, list[tuple[Path, int]]] = {}
            source_modes: dict[str, dict[str, Any]] = {}
            approved_spanish_cue_ids: list[str] = []
            for mode in BILINGUAL_MODES:
                resolved_narration: list[tuple[Path, int]] = []
                narration_inputs: list[dict[str, Any]] = []
                for index, item in enumerate(modes[mode]):
                    source = self.config.resolve_input(item["path"], max_bytes=MAX_AUDIO_INPUT_BYTES)
                    snapshot, record = snapshot_source(
                        source,
                        snapshots / f"{mode}-narration-{index:02d}{source.suffix.lower()}",
                        MAX_AUDIO_INPUT_BYTES,
                    )
                    stream = first_stream(
                        self.probe(snapshot, timeout_seconds=profile.render_timeout_seconds),
                        "audio",
                    )
                    if stream is None:
                        raise ValidationError(f"narration has no audio stream: {source.name}")
                    peak = self.audio_peak(snapshot, timeout_seconds=profile.render_timeout_seconds)
                    if peak >= -0.1:
                        raise ValidationError(f"narration is clipped or too close to 0 dBFS: {source.name}")
                    if item["language"] == "es-419":
                        approval = item["spanish_approval"]
                        if approval["audio_sha256"] != record["sha256"]:
                            raise ValidationError(
                                f"Spanish approval audio hash does not match cue {item['cue_id']}"
                            )
                        approved_spanish_cue_ids.append(item["cue_id"])
                    resolved_narration.append((snapshot, item["start_ms"]))
                    narration_inputs.append({
                        **record,
                        "cue_id": item["cue_id"],
                        "start_ms": item["start_ms"],
                        "language": item["language"],
                        "text": item["text"],
                        "source_peak_dbfs": peak,
                        "spanish_approval": item.get("spanish_approval"),
                    })
                resolved_modes[mode] = resolved_narration
                source_modes[mode] = {"narration": narration_inputs}

            draft_id, draft_dir, manifest = self.store.create(
                kind="bilingual_story_proof",
                workflow={"id": "human_bilingual_story_proof_assembly", "version": 1, "models": []},
                inputs={
                    "profile": profile.as_record(),
                    "title": title,
                    "scenes": source_scenes,
                    "modes": source_modes,
                    "spanish_review": {
                        "register": "es-419",
                        "status": "approved",
                        "approved_cue_ids": approved_spanish_cue_ids,
                    },
                },
                source_brief_id=source_brief_id,
            )
            outputs = {mode: draft_dir / f"story-{mode.replace('_', '-')}.webm" for mode in BILINGUAL_MODES}
            poster = draft_dir / "poster.png"
            contact_sheet = draft_dir / "contact-sheet.png"
            total_seconds = sum(duration for _, duration in resolved_scenes) / 1000
            try:
                mode_qa: dict[str, Any] = {}
                for mode in BILINGUAL_MODES:
                    self._assemble_video(
                        resolved_scenes,
                        resolved_modes[mode],
                        outputs[mode],
                        total_seconds,
                        timeout_seconds=profile.render_timeout_seconds,
                    )
                    mode_qa[mode] = self.inspect_learning_clip(
                        outputs[mode],
                        profile=profile,
                    )
                self._run(
                    [
                        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
                        "-sseof", "-0.1", "-i", str(outputs["english"]),
                        "-frames:v", "1", str(poster),
                    ],
                    timeout_seconds=profile.render_timeout_seconds,
                )
                self.create_contact_sheet(
                    outputs["english"],
                    contact_sheet,
                    sample_count=profile.contact_sheet_samples,
                    columns=profile.contact_sheet_columns,
                    timeout_seconds=profile.render_timeout_seconds,
                )
                for mode in BILINGUAL_MODES:
                    self.store.add_output(draft_dir, manifest, outputs[mode], role=f"story_mode_{mode}")
                self.store.add_output(draft_dir, manifest, poster, role="poster")
                self.store.add_output(draft_dir, manifest, contact_sheet, role="contact_sheet")
                self.store.add_qa(draft_dir, manifest, {
                    "name": "bilingual_story_proof_contract",
                    "status": "pass",
                    "details": {
                        "profile": profile.as_record(),
                        "modes": mode_qa,
                        "contact_sheet": {
                            "samples": profile.contact_sheet_samples,
                            "columns": profile.contact_sheet_columns,
                        },
                        "spanish_review": {
                            "status": "pass",
                            "register": "es-419",
                            "approved_cue_ids": approved_spanish_cue_ids,
                        },
                    },
                })
            except Exception as exc:
                self.store.add_qa(draft_dir, manifest, {
                    "name": "bilingual_story_proof_contract",
                    "status": "fail",
                    "details": str(exc),
                })
                raise
            return {"draft_id": draft_id, "draft_dir": str(draft_dir), "manifest": manifest}

    def _inspect_scene_input(
        self,
        path: Path,
        *,
        timeout_seconds: int = SHORT_CLIP.render_timeout_seconds,
    ) -> dict[str, int | float]:
        stream = first_stream(self.probe(path, timeout_seconds=timeout_seconds), "video")
        if stream is None:
            raise ValidationError(f"scene is not decodable video or image: {path.name}")
        try:
            width = int(stream.get("width", 0))
            height = int(stream.get("height", 0))
        except (TypeError, ValueError) as exc:
            raise ValidationError(f"scene dimensions are invalid: {path.name}") from exc
        if (
            width <= 0 or height <= 0
            or width > MAX_SCENE_WIDTH or height > MAX_SCENE_HEIGHT
            or width * height > MAX_SCENE_PIXELS
        ):
            raise ValidationError(f"scene dimensions exceed the 1920x1080 decode limit: {path.name}")
        details: dict[str, int | float] = {"width": width, "height": height}
        if path.suffix.lower() not in IMAGE_SUFFIXES:
            try:
                fps = fraction_value(stream.get("avg_frame_rate"))
                if fps <= 0:
                    fps = fraction_value(stream.get("r_frame_rate"))
            except (TypeError, ValueError, ZeroDivisionError) as exc:
                raise ValidationError(f"scene frame rate is invalid: {path.name}") from exc
            if not math.isfinite(fps) or not 0 < fps <= MAX_SCENE_FPS:
                raise ValidationError(f"scene frame rate exceeds the 60 fps decode limit: {path.name}")
            details["fps"] = fps
        return details

    def create_contact_sheet(
        self,
        video: Path,
        destination: Path,
        *,
        sample_count: int = SHORT_CLIP.contact_sheet_samples,
        columns: int = SHORT_CLIP.contact_sheet_columns,
        timeout_seconds: int = SHORT_CLIP.render_timeout_seconds,
    ) -> None:
        duration = float(self.probe(video, timeout_seconds=timeout_seconds).get("format", {}).get("duration", 0))
        if duration <= 0:
            raise ValidationError("contact sheet source requires a finite duration")
        if (
            isinstance(sample_count, bool)
            or not isinstance(sample_count, int)
            or isinstance(columns, bool)
            or not isinstance(columns, int)
            or sample_count <= 0
            or columns <= 0
            or sample_count % columns != 0
        ):
            raise ValidationError("contact sheet density must form a finite rectangular grid")
        sample_rate = sample_count / duration
        rows = sample_count // columns
        self._run([
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(video),
            "-vf", f"fps={sample_rate:.8f},scale=240:-1,tile={columns}x{rows}:padding=8:margin=8:color=white",
            "-frames:v", "1", str(destination),
        ], timeout_seconds=timeout_seconds)

    def inspect_learning_clip(
        self,
        path: Path,
        *,
        profile: FoundryProfile = SHORT_CLIP,
    ) -> dict[str, Any]:
        profile = require_canonical_profile(profile)
        probe = self.probe(path, timeout_seconds=profile.render_timeout_seconds)
        video = first_stream(probe, "video")
        audio = first_stream(probe, "audio")
        duration = float(probe.get("format", {}).get("duration", 0))
        if video is None or audio is None:
            raise ValidationError("learning clip requires video and audio streams")
        if (video.get("codec_name"), video.get("width"), video.get("height")) != ("vp9", VIDEO_WIDTH, VIDEO_HEIGHT):
            raise ValidationError("learning clip must be VP9 at 960x544")
        if (audio.get("codec_name"), int(audio.get("sample_rate", 0)), audio.get("channels")) != ("opus", 48000, 1):
            raise ValidationError("learning clip must be 48kHz mono Opus")
        if not profile.min_duration_seconds <= duration <= profile.max_duration_seconds + 0.1:
            raise ValidationError(f"learning clip duration is outside the {profile.profile_id} limit")
        output_bytes = path.stat().st_size
        if output_bytes > profile.max_output_bytes:
            raise ValidationError(f"learning clip exceeds the {profile.profile_id} output size limit")
        loudness = self.loudness(path, timeout_seconds=profile.render_timeout_seconds)
        if not -19.0 <= loudness["integrated_lufs"] <= -17.0:
            raise ValidationError(
                f"learning clip loudness {loudness['integrated_lufs']:.2f} LUFS must be within one LU of -18 LUFS"
            )
        if loudness["true_peak_dbtp"] > -2.0:
            raise ValidationError("learning clip true peak exceeds -2 dBTP")
        return {"duration_seconds": duration, "bytes": output_bytes, "video": video, "audio": audio, **loudness}

    def inspect_silent_motion(self, path: Path) -> dict[str, Any]:
        probe = self.probe(path)
        video = first_stream(probe, "video")
        audio = first_stream(probe, "audio")
        duration = float(probe.get("format", {}).get("duration", 0))
        if video is None or audio is not None:
            raise ValidationError("motion draft must contain one silent video stream")
        if (video.get("width"), video.get("height")) != (VIDEO_WIDTH, VIDEO_HEIGHT):
            raise ValidationError("Wan output calibration did not produce 960x544")
        fps = fraction_value(video.get("avg_frame_rate") or video.get("r_frame_rate"))
        if not math.isclose(fps, VIDEO_FPS, abs_tol=0.01):
            raise ValidationError("motion draft must be 24fps")
        if not 3.2 <= duration <= 3.6:
            raise ValidationError("motion draft duration must match 81 frames at 24fps")
        return {"duration_seconds": duration, "video": video, "sha256": sha256_file(path)}

    def probe(self, path: Path, *, timeout_seconds: int = SHORT_CLIP.render_timeout_seconds) -> dict[str, Any]:
        result = self._run([
            "ffprobe", "-v", "error", "-show_entries",
            "format=duration,size,bit_rate:stream=index,codec_name,codec_type,sample_rate,channels,width,height,r_frame_rate,avg_frame_rate",
            "-of", "json", str(path),
        ], timeout_seconds=timeout_seconds)
        try:
            value = json.loads(result.stdout)
        except json.JSONDecodeError as exc:
            raise FoundryError("ffprobe returned invalid JSON") from exc
        if not isinstance(value, dict):
            raise FoundryError("ffprobe result must be an object")
        return value

    def audio_peak(self, path: Path, *, timeout_seconds: int = SHORT_CLIP.render_timeout_seconds) -> float:
        result = self._run(
            ["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "volumedetect", "-f", "null", "-"],
            timeout_seconds=timeout_seconds,
        )
        match = re.search(r"max_volume:\s*(-?[0-9.]+) dB", result.stderr)
        if not match:
            raise FoundryError("could not measure source audio peak")
        return float(match.group(1))

    def loudness(self, path: Path, *, timeout_seconds: int = SHORT_CLIP.render_timeout_seconds) -> dict[str, float]:
        data = self._loudnorm_measurement(path, target_peak=-2, timeout_seconds=timeout_seconds)
        return {"integrated_lufs": data["input_i"], "true_peak_dbtp": data["input_tp"]}

    def _loudnorm_measurement(
        self,
        path: Path,
        *,
        target_peak: int,
        timeout_seconds: int = SHORT_CLIP.render_timeout_seconds,
    ) -> dict[str, float]:
        result = self._run([
            "ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-map", "0:a:0",
            "-af", f"loudnorm=I=-18:TP={target_peak}:LRA=7:print_format=json", "-f", "null", "-",
        ], timeout_seconds=timeout_seconds)
        matches = re.findall(r"\{[^{}]+\}", result.stderr, flags=re.DOTALL)
        if not matches:
            raise FoundryError("could not measure output loudness")
        data = json.loads(matches[-1])
        try:
            measurement = {
                "input_i": float(data["input_i"]),
                "input_tp": float(data["input_tp"]),
                "input_lra": float(data["input_lra"]),
                "input_thresh": float(data["input_thresh"]),
                "target_offset": float(data["target_offset"]),
            }
        except (KeyError, TypeError, ValueError) as exc:
            raise FoundryError("ffmpeg returned invalid loudness measurements") from exc
        if not all(math.isfinite(value) for value in measurement.values()):
            raise ValidationError("narration mix is silent or cannot be normalized")
        return measurement

    def _assemble_video(
        self,
        scenes: list[tuple[Path, int]],
        narration: list[tuple[Path, int]],
        output: Path,
        total_seconds: float,
        *,
        timeout_seconds: int = SHORT_CLIP.render_timeout_seconds,
    ) -> None:
        with tempfile.TemporaryDirectory(prefix="foundry-media-") as temp_name:
            temp = Path(temp_name)
            segments = []
            video_filter = (
                f"scale={VIDEO_WIDTH}:{VIDEO_HEIGHT}:force_original_aspect_ratio=decrease,"
                f"pad={VIDEO_WIDTH}:{VIDEO_HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=#f7f0df,"
                f"fps={VIDEO_FPS},format=yuv420p"
            )
            for index, (source, duration_ms) in enumerate(scenes):
                segment = temp / f"scene-{index:02d}.mp4"
                seconds = duration_ms / 1000
                if source.suffix.lower() in IMAGE_SUFFIXES:
                    args = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-loop", "1", "-i", str(source)]
                    segment_filter = video_filter
                else:
                    args = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(source)]
                    segment_filter = f"{video_filter},tpad=stop_mode=clone:stop_duration={seconds:.3f}"
                self._run(
                    args + ["-vf", segment_filter, "-t", f"{seconds:.3f}", "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", str(segment)],
                    timeout_seconds=timeout_seconds,
                )
                segments.append(segment)
            concat_file = temp / "segments.txt"
            concat_file.write_text("".join(f"file '{item.as_posix()}'\n" for item in segments), encoding="utf-8")
            joined = temp / "joined.mp4"
            self._run(
                ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(concat_file), "-c", "copy", str(joined)],
                timeout_seconds=timeout_seconds,
            )

            mixed_audio = temp / "narration-mix.wav"
            command = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error"]
            filters = []
            labels = []
            for index, (source, start_ms) in enumerate(narration):
                command += ["-i", str(source)]
                label = f"a{index}"
                filters.append(
                    f"[{index}:a]silenceremove=start_periods=1:start_duration=0.05:start_threshold=-55dB,"
                    f"highpass=f=70,adelay=delays={start_ms}:all=1[{label}]"
                )
                labels.append(f"[{label}]")
            filters.append(
                f"{''.join(labels)}amix=inputs={len(labels)}:duration=longest:normalize=0,"
                f"asetpts=N/SR/TB,apad=whole_dur={total_seconds:.3f},"
                f"atrim=duration={total_seconds:.3f}[mixed]"
            )
            command += [
                "-filter_complex", ";".join(filters), "-map", "[mixed]",
                "-c:a", "pcm_f32le", "-ar", "48000", "-ac", "1", str(mixed_audio),
            ]
            self._run(command, timeout_seconds=timeout_seconds)
            measured = self._loudnorm_measurement(
                mixed_audio,
                target_peak=-3,
                timeout_seconds=timeout_seconds,
            )
            normalization = (
                "loudnorm=I=-18:TP=-3:LRA=7:linear=true"
                f":measured_I={measured['input_i']}"
                f":measured_TP={measured['input_tp']}"
                f":measured_LRA={measured['input_lra']}"
                f":measured_thresh={measured['input_thresh']}"
                f":offset={measured['target_offset']}"
            )
            self._run([
                "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
                "-i", str(joined), "-i", str(mixed_audio),
                "-filter_complex", f"[1:a]{normalization}[audio]",
                "-map", "0:v:0", "-map", "[audio]",
                "-c:v", "libvpx-vp9", "-crf", "32", "-b:v", "0", "-c:a", "libopus",
                "-b:a", "80k", "-ar", "48000", "-ac", "1", str(output),
            ], timeout_seconds=timeout_seconds)

    @staticmethod
    def _run(
        args: list[str],
        *,
        timeout_seconds: int = SHORT_CLIP.render_timeout_seconds,
    ) -> subprocess.CompletedProcess[str]:
        try:
            return subprocess.run(args, check=True, capture_output=True, text=True, timeout=timeout_seconds)
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError) as exc:
            detail = getattr(exc, "stderr", "") or str(exc)
            raise FoundryError(f"media command failed: {detail[-1000:]}") from exc


def validate_storyboard(
    value: Any,
    *,
    profile: FoundryProfile = SHORT_CLIP,
) -> tuple[str, list[dict[str, Any]], list[dict[str, Any]], str | None]:
    profile = require_canonical_profile(profile)
    if profile is not SHORT_CLIP:
        raise ValidationError("single narrated storyboards require the short_clip profile")
    if not isinstance(value, dict):
        raise ValidationError("storyboard must be an object")
    title = value.get("title")
    scenes = value.get("scenes")
    narration = value.get("narration")
    if not isinstance(title, str) or not title.strip() or len(title) > 120:
        raise ValidationError("storyboard title must contain 1 to 120 characters")
    if not isinstance(scenes, list) or not 1 <= len(scenes) <= profile.max_scene_count:
        raise ValidationError(f"storyboard requires 1 to {profile.max_scene_count} scenes")
    if not isinstance(narration, list) or not 1 <= len(narration) <= profile.max_narration_cues_per_mode:
        raise ValidationError(
            f"storyboard requires 1 to {profile.max_narration_cues_per_mode} narration cues"
        )
    total_ms = 0
    for scene in scenes:
        if not isinstance(scene, dict) or not isinstance(scene.get("path"), str):
            raise ValidationError("each scene requires a path")
        duration = scene.get("duration_ms")
        if isinstance(duration, bool) or not isinstance(duration, int) or not 500 <= duration <= 10000:
            raise ValidationError("scene duration must be 500 to 10000 ms")
        total_ms += duration
    if not int(profile.min_duration_seconds * 1000) <= total_ms <= int(profile.max_duration_seconds * 1000):
        raise ValidationError(f"storyboard duration is outside the {profile.profile_id} limit")
    for cue in narration:
        if not isinstance(cue, dict) or not isinstance(cue.get("path"), str):
            raise ValidationError("each narration cue requires a path")
        start = cue.get("start_ms")
        if isinstance(start, bool) or not isinstance(start, int) or not 0 <= start < total_ms:
            raise ValidationError("narration start must be inside the storyboard duration")
    source_brief_id = value.get("source_brief_id")
    if source_brief_id is not None and (not isinstance(source_brief_id, str) or len(source_brief_id) > 160):
        raise ValidationError("source brief id is invalid")
    return title.strip(), scenes, narration, source_brief_id


def validate_bilingual_story_proof(
    value: Any,
    *,
    profile: FoundryProfile = BILINGUAL_STORY_PROOF,
) -> tuple[str, list[dict[str, Any]], dict[str, list[dict[str, Any]]], str | None]:
    profile = require_canonical_profile(profile)
    if profile is not BILINGUAL_STORY_PROOF:
        raise ValidationError("bilingual proof requires the bilingual_story_proof profile")
    if not isinstance(value, dict):
        raise ValidationError("bilingual proof storyboard must be an object")
    if value.get("profile") != profile.profile_id:
        raise ValidationError("bilingual proof storyboard must declare bilingual_story_proof")
    title = value.get("title")
    scenes = value.get("scenes")
    modes = value.get("modes")
    if not isinstance(title, str) or not title.strip() or len(title) > 120:
        raise ValidationError("bilingual proof title must contain 1 to 120 characters")
    if not isinstance(scenes, list) or not 1 <= len(scenes) <= profile.max_scene_count:
        raise ValidationError(f"bilingual proof requires 1 to {profile.max_scene_count} scenes")
    if not isinstance(modes, dict) or set(modes) != set(BILINGUAL_MODES):
        raise ValidationError("bilingual proof requires exactly english, story_bridge, and spanish_replay modes")

    total_ms = 0
    for scene in scenes:
        if not isinstance(scene, dict) or not isinstance(scene.get("path"), str):
            raise ValidationError("each bilingual proof scene requires a path")
        duration = scene.get("duration_ms")
        if isinstance(duration, bool) or not isinstance(duration, int) or not 500 <= duration <= 10000:
            raise ValidationError("bilingual proof scene duration must be 500 to 10000 ms")
        total_ms += duration
    if not int(profile.min_duration_seconds * 1000) <= total_ms <= int(profile.max_duration_seconds * 1000):
        raise ValidationError("bilingual proof duration must be 45 to 90 seconds")

    cue_ids: set[str] = set()
    validated_modes: dict[str, list[dict[str, Any]]] = {}
    for mode in BILINGUAL_MODES:
        mode_value = modes[mode]
        if not isinstance(mode_value, dict) or set(mode_value) != {"narration"}:
            raise ValidationError(f"bilingual proof mode {mode} must contain only narration")
        narration = mode_value["narration"]
        if not isinstance(narration, list) or not 1 <= len(narration) <= profile.max_narration_cues_per_mode:
            raise ValidationError(
                f"bilingual proof mode {mode} requires 1 to {profile.max_narration_cues_per_mode} narration cues"
            )
        languages: set[str] = set()
        for cue in narration:
            validate_bilingual_narration_cue(cue, mode=mode, total_ms=total_ms, cue_ids=cue_ids)
            languages.add(cue["language"])
        if mode == "english" and languages != {"en"}:
            raise ValidationError("English mode narration must use only en")
        if mode == "spanish_replay" and languages != {"es-419"}:
            raise ValidationError("Spanish Replay narration must use only es-419")
        if mode == "story_bridge" and languages != {"en", "es-419"}:
            raise ValidationError("Story Bridge narration must include en and es-419")
        validated_modes[mode] = narration

    source_brief_id = value.get("source_brief_id")
    if source_brief_id is not None and (
        not isinstance(source_brief_id, str) or not source_brief_id or len(source_brief_id) > 160
    ):
        raise ValidationError("source brief id is invalid")
    return title.strip(), scenes, validated_modes, source_brief_id


def validate_bilingual_narration_cue(
    cue: Any,
    *,
    mode: str,
    total_ms: int,
    cue_ids: set[str],
) -> None:
    if not isinstance(cue, dict):
        raise ValidationError(f"bilingual proof mode {mode} narration cue must be an object")
    allowed_fields = {"cue_id", "path", "start_ms", "language", "text", "spanish_approval"}
    if set(cue) - allowed_fields:
        raise ValidationError(f"bilingual proof mode {mode} narration cue has unsupported fields")
    cue_id = cue.get("cue_id")
    if not isinstance(cue_id, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", cue_id):
        raise ValidationError("bilingual proof narration cue id is invalid")
    if cue_id in cue_ids:
        raise ValidationError("bilingual proof narration cue ids must be globally unique")
    cue_ids.add(cue_id)
    if not isinstance(cue.get("path"), str) or not cue["path"]:
        raise ValidationError(f"bilingual proof narration cue {cue_id} requires a path")
    start_ms = cue.get("start_ms")
    if isinstance(start_ms, bool) or not isinstance(start_ms, int) or not 0 <= start_ms < total_ms:
        raise ValidationError(f"bilingual proof narration cue {cue_id} start must be inside the story")
    language = cue.get("language")
    if language not in {"en", "es-419"}:
        raise ValidationError(f"bilingual proof narration cue {cue_id} language is invalid")
    text = cue.get("text")
    if not isinstance(text, str) or not text.strip() or len(text) > 500:
        raise ValidationError(f"bilingual proof narration cue {cue_id} text is invalid")
    if language == "es-419":
        validate_spanish_review(cue.get("spanish_approval"), cue_id=cue_id, spanish_text=text)
    elif "spanish_approval" in cue:
        raise ValidationError(f"English narration cue {cue_id} cannot declare Spanish approval")


def validate_spanish_review(value: Any, *, cue_id: str, spanish_text: str) -> None:
    if not isinstance(value, dict):
        raise ValidationError(f"Spanish narration cue {cue_id} requires an approval record")
    required_fields = {
        "spanish_text",
        "english_intent",
        "register",
        "pronunciation_review_status",
        "reviewer",
        "approved_at",
        "approval_version",
        "audio_sha256",
    }
    if set(value) != required_fields:
        raise ValidationError(f"Spanish narration cue {cue_id} approval fields are invalid")
    if value.get("spanish_text") != spanish_text:
        raise ValidationError(f"Spanish narration cue {cue_id} approval text does not match")
    english_intent = value.get("english_intent")
    if not isinstance(english_intent, str) or not english_intent.strip() or len(english_intent) > 500:
        raise ValidationError(f"Spanish narration cue {cue_id} English intent is invalid")
    if value.get("register") != "es-419":
        raise ValidationError(f"Spanish narration cue {cue_id} register must be es-419")
    if value.get("pronunciation_review_status") != "approved":
        raise ValidationError(f"Spanish narration cue {cue_id} pronunciation review must be approved")
    reviewer = value.get("reviewer")
    if not isinstance(reviewer, str) or not reviewer.strip() or len(reviewer) > 120:
        raise ValidationError(f"Spanish narration cue {cue_id} reviewer is invalid")
    approval_version = value.get("approval_version")
    if not isinstance(approval_version, str) or not approval_version.strip() or len(approval_version) > 40:
        raise ValidationError(f"Spanish narration cue {cue_id} approval version is invalid")
    approved_at = value.get("approved_at")
    if not isinstance(approved_at, str) or not UTC_TIMESTAMP_PATTERN.fullmatch(approved_at):
        raise ValidationError(f"Spanish narration cue {cue_id} approval timestamp is invalid")
    try:
        parsed_at = datetime.fromisoformat(approved_at.removesuffix("Z") + "+00:00")
    except ValueError as exc:
        raise ValidationError(f"Spanish narration cue {cue_id} approval timestamp is invalid") from exc
    if parsed_at.utcoffset() is None or parsed_at.utcoffset().total_seconds() != 0:
        raise ValidationError(f"Spanish narration cue {cue_id} approval timestamp must be UTC")
    audio_sha256 = value.get("audio_sha256")
    if not isinstance(audio_sha256, str) or not SHA256_PATTERN.fullmatch(audio_sha256):
        raise ValidationError(f"Spanish narration cue {cue_id} audio hash is invalid")


def first_stream(probe: dict[str, Any], kind: str) -> dict[str, Any] | None:
    streams = probe.get("streams", [])
    if not isinstance(streams, list):
        return None
    return next((item for item in streams if isinstance(item, dict) and item.get("codec_type") == kind), None)


def snapshot_source(source: Path, destination: Path, max_bytes: int) -> tuple[Path, dict[str, Any]]:
    digest = hashlib.sha256()
    total = 0
    try:
        with source.open("rb") as input_file, destination.open("xb") as output_file:
            while chunk := input_file.read(1024 * 1024):
                total += len(chunk)
                if total > max_bytes:
                    raise ValidationError(f"source exceeds the size limit: {source.name}")
                digest.update(chunk)
                output_file.write(chunk)
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    return destination, {"name": source.name, "bytes": total, "sha256": digest.hexdigest()}


def fraction_value(value: Any) -> float:
    if not isinstance(value, str) or "/" not in value:
        return 0.0
    numerator, denominator = value.split("/", 1)
    return float(numerator) / float(denominator) if float(denominator) else 0.0
