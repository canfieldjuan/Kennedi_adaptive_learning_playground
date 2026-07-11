from __future__ import annotations

import hashlib
import json
import mimetypes
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path
from typing import Any

from .config import MAX_IMAGE_INPUT_BYTES, MAX_OUTPUT_BYTES, MAX_OUTPUT_COUNT, validate_loopback_url
from .errors import ComfyUIError


class ComfyClient:
    def __init__(self, base_url: str, *, timeout_seconds: int):
        self.base_url = validate_loopback_url(base_url)
        if isinstance(timeout_seconds, bool) or not isinstance(timeout_seconds, int) or not 30 <= timeout_seconds <= 1800:
            raise ComfyUIError("ComfyUI timeout must be between 30 and 1800 seconds")
        self.timeout_seconds = timeout_seconds
        self._opener = urllib.request.build_opener(NoRedirectHandler())

    def status(self) -> dict[str, Any]:
        return {
            "backend": self.base_url,
            "system_stats": self._json_request("GET", "/system_stats"),
            "queue": self._json_request("GET", "/queue"),
        }

    def upload(self, path: Path) -> str:
        name, _record = self.upload_with_record(path)
        return name

    def upload_with_record(self, path: Path) -> tuple[str, dict[str, Any]]:
        data = path.read_bytes()
        if len(data) > MAX_IMAGE_INPUT_BYTES:
            raise ComfyUIError("image input exceeds the size limit")
        record = {
            "name": path.name,
            "bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest(),
        }
        boundary = uuid.uuid4().hex
        stored_name = f"foundry-{record['sha256']}{path.suffix.lower()}"
        content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        prefix = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="image"; filename="{stored_name}"\r\n'
            f"Content-Type: {content_type}\r\n\r\n"
        ).encode("utf-8")
        suffix = (
            f"\r\n--{boundary}\r\n"
            'Content-Disposition: form-data; name="overwrite"\r\n\r\n'
            f"true\r\n--{boundary}--\r\n"
        ).encode("utf-8")
        response = self._json_request(
            "POST", "/upload/image", body=prefix + data + suffix,
            content_type=f"multipart/form-data; boundary={boundary}",
        )
        name = response.get("name")
        if not safe_filename(name):
            raise ComfyUIError("ComfyUI returned an invalid uploaded filename")
        return name, record

    def run(self, graph: dict[str, Any], output_dir: Path) -> list[Path]:
        queued = self._json_request(
            "POST", "/prompt",
            body=json.dumps({"prompt": graph, "client_id": uuid.uuid4().hex}).encode("utf-8"),
            content_type="application/json",
        )
        prompt_id = queued.get("prompt_id")
        if not isinstance(prompt_id, str) or not prompt_id:
            raise ComfyUIError("ComfyUI rejected the workflow without a prompt id")
        deadline = time.monotonic() + self.timeout_seconds
        while time.monotonic() < deadline:
            history = self._json_request("GET", f"/history/{urllib.parse.quote(prompt_id, safe='')}")
            if prompt_id in history:
                return self._collect_outputs(history[prompt_id], output_dir)
            time.sleep(1)
        try:
            cancelled = self._cancel_prompt(prompt_id)
        except ComfyUIError as exc:
            raise ComfyUIError(
                f"ComfyUI job timed out after {self.timeout_seconds} seconds and cancellation failed: {exc}"
            ) from exc
        history = self._json_request("GET", f"/history/{urllib.parse.quote(prompt_id, safe='')}")
        if prompt_id in history:
            return self._collect_outputs(history[prompt_id], output_dir)
        if cancelled:
            raise ComfyUIError(f"ComfyUI job timed out after {self.timeout_seconds} seconds and was cancelled")
        raise ComfyUIError(f"ComfyUI job timed out after {self.timeout_seconds} seconds and is no longer active")

    def _cancel_prompt(self, prompt_id: str) -> bool:
        path = f"/api/jobs/{urllib.parse.quote(prompt_id, safe='')}/cancel"
        response = self._json_request("POST", path)
        return response.get("cancelled") is True

    def _collect_outputs(self, entry: Any, output_dir: Path) -> list[Path]:
        if not isinstance(entry, dict):
            raise ComfyUIError("ComfyUI history entry is malformed")
        status = entry.get("status", {})
        if isinstance(status, dict) and status.get("status_str") == "error":
            raise ComfyUIError(self._error_message(status))
        outputs = entry.get("outputs")
        if not isinstance(outputs, dict):
            raise ComfyUIError("ComfyUI job completed without output metadata")
        descriptors: list[dict[str, Any]] = []
        for node_output in outputs.values():
            if not isinstance(node_output, dict):
                continue
            for kind in ("images", "video", "gifs"):
                items = node_output.get(kind, [])
                if isinstance(items, list):
                    descriptors.extend(item for item in items if isinstance(item, dict))
        if not descriptors:
            raise ComfyUIError("ComfyUI job completed without downloadable outputs")
        if len(descriptors) > MAX_OUTPUT_COUNT:
            raise ComfyUIError("ComfyUI returned too many outputs")
        output_dir.mkdir(parents=True, exist_ok=True)
        return [self._download(item, output_dir) for item in descriptors]

    def _download(self, descriptor: dict[str, Any], output_dir: Path) -> Path:
        filename = descriptor.get("filename")
        subfolder = descriptor.get("subfolder", "")
        output_type = descriptor.get("type", "output")
        if (
            not safe_filename(filename)
        ):
            raise ComfyUIError("ComfyUI output filename is unsafe")
        if not isinstance(subfolder, str):
            raise ComfyUIError("ComfyUI output subfolder is unsafe")
        subfolder_path = Path(subfolder)
        if (
            len(subfolder) > 500
            or "\\" in subfolder
            or subfolder_path.is_absolute()
            or any(part in {"", ".", ".."} for part in subfolder_path.parts)
        ) and subfolder != "":
            raise ComfyUIError("ComfyUI output subfolder is unsafe")
        if output_type not in {"output", "temp"}:
            raise ComfyUIError("ComfyUI output type is unsafe")
        query = urllib.parse.urlencode({"filename": filename, "subfolder": subfolder, "type": output_type})
        request = urllib.request.Request(f"{self.base_url}/view?{query}")
        try:
            with self._opener.open(request, timeout=60) as response:
                length = response.headers.get("Content-Length")
                if length and int(length) > MAX_OUTPUT_BYTES:
                    raise ComfyUIError("ComfyUI output exceeds the size limit")
                data = response.read(MAX_OUTPUT_BYTES + 1)
        except (urllib.error.URLError, ValueError) as exc:
            raise ComfyUIError(f"cannot download ComfyUI output: {exc}") from exc
        if len(data) > MAX_OUTPUT_BYTES:
            raise ComfyUIError("ComfyUI output exceeds the size limit")
        destination = output_dir / filename
        if not destination.resolve().is_relative_to(output_dir.resolve()):
            raise ComfyUIError("ComfyUI output escaped the draft directory")
        try:
            with destination.open("xb") as target:
                target.write(data)
        except FileExistsError as exc:
            raise ComfyUIError("ComfyUI returned duplicate output filenames") from exc
        return destination

    def _json_request(
        self, method: str, path: str, *, body: bytes | None = None, content_type: str | None = None
    ) -> dict[str, Any]:
        headers = {"Content-Type": content_type} if content_type else {}
        request = urllib.request.Request(f"{self.base_url}{path}", data=body, headers=headers, method=method)
        try:
            with self._opener.open(request, timeout=60) as response:
                raw = response.read(2 * 1024 * 1024 + 1)
        except urllib.error.URLError as exc:
            raise ComfyUIError(f"ComfyUI is not reachable at {self.base_url}: {exc}") from exc
        if len(raw) > 2 * 1024 * 1024:
            raise ComfyUIError("ComfyUI JSON response exceeds the size limit")
        try:
            value = json.loads(raw) if raw else {}
        except json.JSONDecodeError as exc:
            raise ComfyUIError("ComfyUI returned invalid JSON") from exc
        if not isinstance(value, dict):
            raise ComfyUIError("ComfyUI JSON response must be an object")
        return value

    @staticmethod
    def _error_message(status: dict[str, Any]) -> str:
        messages = status.get("messages", [])
        details = []
        if isinstance(messages, list):
            for message in messages:
                if isinstance(message, list) and len(message) == 2 and message[0] == "execution_error" and isinstance(message[1], dict):
                    details.append(str(message[1].get("exception_message", "workflow failed")))
        return "; ".join(details)[:800] or "ComfyUI workflow failed"


class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, _request: Any, _fp: Any, _code: int, _message: str, _headers: Any, _newurl: str) -> None:
        return None


def safe_filename(value: Any) -> bool:
    return (
        isinstance(value, str)
        and 1 <= len(value) <= 240
        and Path(value).name == value
        and "\\" not in value
        and not any(ord(char) < 32 or ord(char) == 127 for char in value)
    )
