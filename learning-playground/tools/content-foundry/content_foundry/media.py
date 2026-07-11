from __future__ import annotations

import json
import math
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Any

from .config import MAX_AUDIO_INPUT_BYTES, FoundryConfig
from .drafts import DraftStore, sha256_file
from .errors import FoundryError, ValidationError

VIDEO_WIDTH = 960
VIDEO_HEIGHT = 544
VIDEO_FPS = 24
MAX_CLIP_SECONDS = 30.0


class MediaTools:
    def __init__(self, config: FoundryConfig, store: DraftStore):
        self.config = config
        self.store = store

    def assemble_storyboard(self, storyboard_path: str) -> dict[str, Any]:
        path = self.config.resolve_input(storyboard_path, max_bytes=256 * 1024)
        try:
            spec = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise ValidationError("storyboard must be valid JSON") from exc
        title, scenes, narration, source_brief_id = validate_storyboard(spec)
        resolved_scenes = [
            (self.config.resolve_input(item["path"], max_bytes=250 * 1024 * 1024), item["duration_ms"])
            for item in scenes
        ]
        resolved_narration = [
            (self.config.resolve_input(item["path"], max_bytes=MAX_AUDIO_INPUT_BYTES), item["start_ms"])
            for item in narration
        ]
        source_inputs = [
            {"name": source.name, "sha256": sha256_file(source), "duration_ms": duration}
            for source, duration in resolved_scenes
        ]
        narration_inputs = []
        for source, start_ms in resolved_narration:
            stream = first_stream(self.probe(source), "audio")
            if stream is None:
                raise ValidationError(f"narration has no audio stream: {source.name}")
            peak = self.audio_peak(source)
            if peak >= -0.1:
                raise ValidationError(f"narration is clipped or too close to 0 dBFS: {source.name}")
            narration_inputs.append({
                "name": source.name,
                "sha256": sha256_file(source),
                "start_ms": start_ms,
                "source_peak_dbfs": peak,
            })
        draft_id, draft_dir, manifest = self.store.create(
            kind="narrated_clip",
            workflow={"id": "human_narration_assembly", "version": 1, "models": []},
            inputs={"title": title, "scenes": source_inputs, "narration": narration_inputs},
            source_brief_id=source_brief_id,
        )
        output = draft_dir / "learning-clip.webm"
        poster = draft_dir / "poster.png"
        contact_sheet = draft_dir / "contact-sheet.png"
        total_seconds = sum(duration for _, duration in resolved_scenes) / 1000
        try:
            self._assemble_video(resolved_scenes, resolved_narration, output, total_seconds)
            self._run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-sseof", "-0.1", "-i", str(output), "-frames:v", "1", str(poster)])
            self.create_contact_sheet(output, contact_sheet)
            qa = self.inspect_learning_clip(output)
            for candidate, role in ((output, "learning_clip"), (poster, "poster"), (contact_sheet, "contact_sheet")):
                self.store.add_output(draft_dir, manifest, candidate, role=role)
            self.store.add_qa(draft_dir, manifest, {"name": "media_contract", "status": "pass", "details": qa})
        except Exception as exc:
            self.store.add_qa(draft_dir, manifest, {"name": "media_contract", "status": "fail", "details": str(exc)})
            raise
        return {"draft_id": draft_id, "draft_dir": str(draft_dir), "manifest": manifest}

    def create_contact_sheet(self, video: Path, destination: Path) -> None:
        duration = float(self.probe(video).get("format", {}).get("duration", 0))
        if duration <= 0:
            raise ValidationError("contact sheet source requires a finite duration")
        sample_rate = 8 / duration
        self._run([
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(video),
            "-vf", f"fps={sample_rate:.8f},scale=240:-1,tile=4x2:padding=8:margin=8:color=white",
            "-frames:v", "1", str(destination),
        ])

    def inspect_learning_clip(self, path: Path) -> dict[str, Any]:
        probe = self.probe(path)
        video = first_stream(probe, "video")
        audio = first_stream(probe, "audio")
        duration = float(probe.get("format", {}).get("duration", 0))
        if video is None or audio is None:
            raise ValidationError("learning clip requires video and audio streams")
        if (video.get("codec_name"), video.get("width"), video.get("height")) != ("vp9", VIDEO_WIDTH, VIDEO_HEIGHT):
            raise ValidationError("learning clip must be VP9 at 960x544")
        if (audio.get("codec_name"), int(audio.get("sample_rate", 0)), audio.get("channels")) != ("opus", 48000, 1):
            raise ValidationError("learning clip must be 48kHz mono Opus")
        if not 0 < duration <= MAX_CLIP_SECONDS + 0.1:
            raise ValidationError("learning clip duration is outside the finite limit")
        loudness = self.loudness(path)
        if not -19.0 <= loudness["integrated_lufs"] <= -17.0:
            raise ValidationError(
                f"learning clip loudness {loudness['integrated_lufs']:.2f} LUFS must be within one LU of -18 LUFS"
            )
        if loudness["true_peak_dbtp"] > -2.0:
            raise ValidationError("learning clip true peak exceeds -2 dBTP")
        return {"duration_seconds": duration, "video": video, "audio": audio, **loudness}

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

    def probe(self, path: Path) -> dict[str, Any]:
        result = self._run([
            "ffprobe", "-v", "error", "-show_entries",
            "format=duration,size,bit_rate:stream=index,codec_name,codec_type,sample_rate,channels,width,height,r_frame_rate,avg_frame_rate",
            "-of", "json", str(path),
        ])
        try:
            value = json.loads(result.stdout)
        except json.JSONDecodeError as exc:
            raise FoundryError("ffprobe returned invalid JSON") from exc
        if not isinstance(value, dict):
            raise FoundryError("ffprobe result must be an object")
        return value

    def audio_peak(self, path: Path) -> float:
        result = self._run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "volumedetect", "-f", "null", "-"])
        match = re.search(r"max_volume:\s*(-?[0-9.]+) dB", result.stderr)
        if not match:
            raise FoundryError("could not measure source audio peak")
        return float(match.group(1))

    def loudness(self, path: Path) -> dict[str, float]:
        data = self._loudnorm_measurement(path, target_peak=-2)
        return {"integrated_lufs": data["input_i"], "true_peak_dbtp": data["input_tp"]}

    def _loudnorm_measurement(self, path: Path, *, target_peak: int) -> dict[str, float]:
        result = self._run([
            "ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-map", "0:a:0",
            "-af", f"loudnorm=I=-18:TP={target_peak}:LRA=7:print_format=json", "-f", "null", "-",
        ])
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
                if source.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}:
                    args = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-loop", "1", "-t", f"{seconds:.3f}", "-i", str(source)]
                else:
                    args = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(source), "-t", f"{seconds:.3f}"]
                self._run(args + ["-vf", video_filter, "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", str(segment)])
                segments.append(segment)
            concat_file = temp / "segments.txt"
            concat_file.write_text("".join(f"file '{item.as_posix()}'\n" for item in segments), encoding="utf-8")
            joined = temp / "joined.mp4"
            self._run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(concat_file), "-c", "copy", str(joined)])

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
                "-c:a", "pcm_s24le", "-ar", "48000", "-ac", "1", str(mixed_audio),
            ]
            self._run(command)
            measured = self._loudnorm_measurement(mixed_audio, target_peak=-3)
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
            ])

    @staticmethod
    def _run(args: list[str]) -> subprocess.CompletedProcess[str]:
        try:
            return subprocess.run(args, check=True, capture_output=True, text=True, timeout=300)
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError) as exc:
            detail = getattr(exc, "stderr", "") or str(exc)
            raise FoundryError(f"media command failed: {detail[-1000:]}") from exc


def validate_storyboard(value: Any) -> tuple[str, list[dict[str, Any]], list[dict[str, Any]], str | None]:
    if not isinstance(value, dict):
        raise ValidationError("storyboard must be an object")
    title = value.get("title")
    scenes = value.get("scenes")
    narration = value.get("narration")
    if not isinstance(title, str) or not title.strip() or len(title) > 120:
        raise ValidationError("storyboard title must contain 1 to 120 characters")
    if not isinstance(scenes, list) or not 1 <= len(scenes) <= 6:
        raise ValidationError("storyboard requires 1 to 6 scenes")
    if not isinstance(narration, list) or not 1 <= len(narration) <= 12:
        raise ValidationError("storyboard requires 1 to 12 narration cues")
    total_ms = 0
    for scene in scenes:
        if not isinstance(scene, dict) or not isinstance(scene.get("path"), str):
            raise ValidationError("each scene requires a path")
        duration = scene.get("duration_ms")
        if isinstance(duration, bool) or not isinstance(duration, int) or not 500 <= duration <= 10000:
            raise ValidationError("scene duration must be 500 to 10000 ms")
        total_ms += duration
    if total_ms > int(MAX_CLIP_SECONDS * 1000):
        raise ValidationError("storyboard exceeds the 30-second clip limit")
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


def first_stream(probe: dict[str, Any], kind: str) -> dict[str, Any] | None:
    streams = probe.get("streams", [])
    if not isinstance(streams, list):
        return None
    return next((item for item in streams if isinstance(item, dict) and item.get("codec_type") == kind), None)


def fraction_value(value: Any) -> float:
    if not isinstance(value, str) or "/" not in value:
        return 0.0
    numerator, denominator = value.split("/", 1)
    return float(numerator) / float(denominator) if float(denominator) else 0.0
