from __future__ import annotations

import fcntl
import hashlib
import json
import os
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .errors import ValidationError

DRAFT_SCHEMA_VERSION = 1


class DraftStore:
    def __init__(self, root: Path):
        self.root = root

    def create(
        self,
        *,
        kind: str,
        workflow: dict[str, Any],
        inputs: dict[str, Any],
        source_brief_id: str | None = None,
    ) -> tuple[str, Path, dict[str, Any]]:
        if source_brief_id is not None and (not isinstance(source_brief_id, str) or len(source_brief_id) > 160):
            raise ValidationError("source brief id is invalid")
        self.root.mkdir(parents=True, exist_ok=True)
        draft_id = f"draft-{uuid.uuid4()}"
        draft_dir = self.root / draft_id
        draft_dir.mkdir(mode=0o700)
        manifest: dict[str, Any] = {
            "schema_version": DRAFT_SCHEMA_VERSION,
            "draft_id": draft_id,
            "status": "draft",
            "kind": kind,
            "created_at": now_iso(),
            "source_brief_id": source_brief_id or None,
            "workflow": workflow,
            "inputs": inputs,
            "outputs": [],
            "qa": {"checks": [], "requires_parent_visual_review": True},
            "approval": None,
        }
        self.write(draft_dir, manifest)
        return draft_id, draft_dir, manifest

    def load(self, draft_id: str) -> tuple[Path, dict[str, Any]]:
        validate_draft_id(draft_id)
        draft_dir = self.root / draft_id
        path = draft_dir / "draft.json"
        try:
            manifest = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise ValidationError(f"cannot read draft: {draft_id}") from exc
        validate_manifest(manifest, draft_id)
        return draft_dir, manifest

    def add_output(self, draft_dir: Path, manifest: dict[str, Any], path: Path, *, role: str) -> None:
        resolved = path.resolve(strict=True)
        resolved_draft = draft_dir.resolve()
        if not resolved.is_relative_to(resolved_draft):
            raise ValidationError("draft output escaped its draft directory")
        relative_path = resolved.relative_to(resolved_draft).as_posix()
        manifest["outputs"].append({
            "role": role,
            "path": relative_path,
            "bytes": resolved.stat().st_size,
            "sha256": sha256_file(resolved),
        })
        self.write(draft_dir, manifest)

    def add_qa(self, draft_dir: Path, manifest: dict[str, Any], check: dict[str, Any]) -> None:
        manifest["qa"]["checks"].append(check)
        self.write(draft_dir, manifest)

    def record_parent_decision(
        self,
        draft_id: str,
        *,
        decision: str,
        reviewer: str,
        notes: str,
    ) -> dict[str, Any]:
        if decision not in {"approved", "rejected"}:
            raise ValidationError("decision must be approved or rejected")
        if not isinstance(reviewer, str) or not isinstance(notes, str):
            raise ValidationError("reviewer and notes must be text")
        reviewer = reviewer.strip()
        if not reviewer or len(reviewer) > 120:
            raise ValidationError("reviewer must contain 1 to 120 characters")
        if len(notes) > 2000:
            raise ValidationError("approval notes cannot exceed 2000 characters")
        validate_draft_id(draft_id)
        draft_dir = self.root / draft_id
        if not draft_dir.is_dir():
            raise ValidationError(f"cannot read draft: {draft_id}")
        lock_path = draft_dir / ".decision.lock"
        with lock_path.open("a+", encoding="utf-8") as lock:
            fcntl.flock(lock.fileno(), fcntl.LOCK_EX)
            _, manifest = self.load(draft_id)
            if manifest["status"] != "draft" or manifest["approval"] is not None:
                raise ValidationError("draft already has a parent decision")
            if decision == "approved":
                checks = manifest["qa"]["checks"]
                if not manifest["outputs"] or not checks or any(check.get("status") != "pass" for check in checks):
                    raise ValidationError("only a draft with outputs and passing QA can be approved")
            manifest["status"] = decision
            manifest["approval"] = {
                "decision": decision,
                "reviewer": reviewer,
                "notes": notes.strip(),
                "created_at": now_iso(),
                "output_hashes": [item["sha256"] for item in manifest["outputs"]],
            }
            self.write(draft_dir, manifest)
            return manifest

    def write(self, draft_dir: Path, manifest: dict[str, Any]) -> None:
        validate_manifest(manifest, manifest.get("draft_id"))
        draft_dir.mkdir(parents=True, exist_ok=True)
        fd, temp_name = tempfile.mkstemp(prefix="draft.", suffix=".tmp", dir=draft_dir)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as output:
                json.dump(manifest, output, indent=2, sort_keys=True)
                output.write("\n")
                output.flush()
                os.fsync(output.fileno())
            os.replace(temp_name, draft_dir / "draft.json")
        finally:
            if os.path.exists(temp_name):
                os.unlink(temp_name)


def validate_draft_id(value: str) -> None:
    if not isinstance(value, str) or not value.startswith("draft-"):
        raise ValidationError("invalid draft id")
    try:
        parsed = uuid.UUID(value.removeprefix("draft-"))
    except (ValueError, AttributeError) as exc:
        raise ValidationError("invalid draft id") from exc
    if str(parsed) != value.removeprefix("draft-"):
        raise ValidationError("invalid draft id")


def validate_manifest(manifest: Any, expected_id: str | None) -> None:
    if not isinstance(manifest, dict):
        raise ValidationError("draft manifest must be an object")
    if manifest.get("schema_version") != DRAFT_SCHEMA_VERSION:
        raise ValidationError("unsupported draft schema version")
    if expected_id and manifest.get("draft_id") != expected_id:
        raise ValidationError("draft id does not match its directory")
    if manifest.get("status") not in {"draft", "approved", "rejected"}:
        raise ValidationError("invalid draft status")
    if not isinstance(manifest.get("outputs"), list):
        raise ValidationError("draft outputs must be an array")
    for output in manifest["outputs"]:
        if not isinstance(output, dict):
            raise ValidationError("draft output must be an object")
        output_path = output.get("path")
        if (
            not isinstance(output_path, str)
            or not output_path
            or Path(output_path).is_absolute()
            or "\\" in output_path
            or any(part in {"", ".", ".."} for part in Path(output_path).parts)
        ):
            raise ValidationError("draft output path is unsafe")
        if not isinstance(output.get("role"), str) or not output["role"]:
            raise ValidationError("draft output role is invalid")
        if isinstance(output.get("bytes"), bool) or not isinstance(output.get("bytes"), int) or output["bytes"] < 0:
            raise ValidationError("draft output size is invalid")
        sha256 = output.get("sha256")
        if not isinstance(sha256, str) or len(sha256) != 64 or any(char not in "0123456789abcdef" for char in sha256):
            raise ValidationError("draft output hash is invalid")
    qa = manifest.get("qa")
    if (
        not isinstance(qa, dict)
        or qa.get("requires_parent_visual_review") is not True
        or not isinstance(qa.get("checks"), list)
        or any(not isinstance(check, dict) for check in qa["checks"])
    ):
        raise ValidationError("draft must require parent visual review")
    approval = manifest.get("approval")
    if manifest["status"] == "draft" and approval is not None:
        raise ValidationError("draft status cannot contain an approval")
    if manifest["status"] != "draft" and not isinstance(approval, dict):
        raise ValidationError("decided draft must contain an approval record")
    if isinstance(approval, dict):
        if approval.get("decision") != manifest["status"]:
            raise ValidationError("approval decision does not match draft status")
        if not isinstance(approval.get("reviewer"), str) or not approval["reviewer"]:
            raise ValidationError("approval reviewer is invalid")
        if not isinstance(approval.get("notes"), str) or not isinstance(approval.get("created_at"), str):
            raise ValidationError("approval metadata is invalid")
        if approval.get("output_hashes") != [output["sha256"] for output in manifest["outputs"]]:
            raise ValidationError("approval hashes do not match draft outputs")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()
