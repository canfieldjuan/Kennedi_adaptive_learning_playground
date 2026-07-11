from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

from .errors import ValidationError

LOOPBACK_HOSTS = frozenset({"127.0.0.1", "localhost", "::1"})
MAX_IMAGE_INPUT_BYTES = 25 * 1024 * 1024
MAX_AUDIO_INPUT_BYTES = 100 * 1024 * 1024
MAX_OUTPUT_BYTES = 250 * 1024 * 1024
MAX_OUTPUT_COUNT = 8
MAX_SEED = 2**63 - 1


@dataclass(frozen=True)
class FoundryConfig:
    project_root: Path
    comfy_url: str
    drafts_root: Path
    imports_root: Path
    references_root: Path
    job_timeout_seconds: int

    def __post_init__(self) -> None:
        object.__setattr__(self, "comfy_url", validate_loopback_url(self.comfy_url))
        if (
            isinstance(self.job_timeout_seconds, bool)
            or not isinstance(self.job_timeout_seconds, int)
            or not 30 <= self.job_timeout_seconds <= 1800
        ):
            raise ValidationError("job timeout must be between 30 and 1800 seconds")

    @classmethod
    def discover(cls) -> "FoundryConfig":
        default_root = Path(__file__).resolve().parents[3]
        project_root = Path(os.environ.get("CONTENT_FOUNDRY_PROJECT_ROOT", default_root)).expanduser().resolve()
        comfy_url = validate_loopback_url(os.environ.get("COMFYUI_URL", "http://127.0.0.1:8188"))
        timeout = parse_timeout(os.environ.get("CONTENT_FOUNDRY_JOB_TIMEOUT", "1800"))
        local_root = project_root / ".content-foundry"
        return cls(
            project_root=project_root,
            comfy_url=comfy_url,
            drafts_root=local_root / "drafts",
            imports_root=local_root / "imports",
            references_root=project_root / "tools" / "content-foundry" / "references",
            job_timeout_seconds=timeout,
        )

    @property
    def allowed_input_roots(self) -> tuple[Path, Path]:
        return (self.imports_root, self.references_root)

    def ensure_local_directories(self) -> None:
        self.drafts_root.mkdir(parents=True, exist_ok=True)
        self.imports_root.mkdir(parents=True, exist_ok=True)
        self.references_root.mkdir(parents=True, exist_ok=True)

    def resolve_input(self, value: str, *, max_bytes: int) -> Path:
        raw = Path(value).expanduser()
        candidate = raw if raw.is_absolute() else self.imports_root / raw
        try:
            resolved = candidate.resolve(strict=True)
        except OSError as exc:
            raise ValidationError(f"input file does not exist: {value}") from exc
        if not resolved.is_file():
            raise ValidationError(f"input path is not a file: {value}")
        if not any(resolved.is_relative_to(root.resolve()) for root in self.allowed_input_roots):
            raise ValidationError("input path is outside approved Foundry roots")
        if resolved.stat().st_size > max_bytes:
            raise ValidationError(f"input exceeds {max_bytes} bytes")
        return resolved


def validate_loopback_url(value: str) -> str:
    if not isinstance(value, str):
        raise ValidationError("ComfyUI URL must be text")
    parsed = urlparse(value.rstrip("/"))
    if (
        parsed.scheme != "http"
        or parsed.hostname not in LOOPBACK_HOSTS
        or parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
        or parsed.path not in ("", "/")
    ):
        raise ValidationError("ComfyUI URL must be loopback-only HTTP with no path or credentials")
    try:
        _ = parsed.port
    except ValueError as exc:
        raise ValidationError("ComfyUI URL has an invalid port") from exc
    return value.rstrip("/")


def parse_timeout(value: str) -> int:
    try:
        timeout = int(value)
    except ValueError as exc:
        raise ValidationError("job timeout must be an integer") from exc
    if not 30 <= timeout <= 1800:
        raise ValidationError("job timeout must be between 30 and 1800 seconds")
    return timeout
