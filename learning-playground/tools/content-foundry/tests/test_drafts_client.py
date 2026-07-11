from __future__ import annotations

import hashlib
import multiprocessing
import threading
import sys
import tempfile
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

TOOLS_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOLS_ROOT))

from content_foundry.comfy_client import ComfyClient
from content_foundry.config import MAX_IMAGE_INPUT_BYTES, MAX_OUTPUT_COUNT
from content_foundry.drafts import DraftStore, validate_manifest
from content_foundry.errors import ComfyUIError, ValidationError


def decide_in_process(root: str, draft_id: str, decision: str, queue: multiprocessing.Queue) -> None:
    try:
        result = DraftStore(Path(root)).record_parent_decision(draft_id, decision=decision, reviewer="Parent", notes=decision)
        queue.put(("ok", result["status"]))
    except ValidationError as exc:
        queue.put(("error", str(exc)))


class DraftStoreTests(unittest.TestCase):
    def test_nested_outputs_are_recorded_relative_to_the_draft(self) -> None:
        with tempfile.TemporaryDirectory() as temp_name:
            store = DraftStore(Path(temp_name))
            draft_id, draft_dir, manifest = store.create(kind="image", workflow={}, inputs={})
            output = draft_dir / "outputs" / "scene.png"
            output.parent.mkdir()
            output.write_bytes(b"image")
            store.add_output(draft_dir, manifest, output, role="image")
            _, loaded = store.load(draft_id)
            self.assertEqual(loaded["outputs"][0]["path"], "outputs/scene.png")
            self.assertEqual(len(loaded["outputs"][0]["sha256"]), 64)

    def test_output_escape_and_tampered_manifest_paths_are_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as temp_name:
            root = Path(temp_name)
            store = DraftStore(root / "drafts")
            _, draft_dir, manifest = store.create(kind="image", workflow={}, inputs={})
            outside = root / "outside.png"
            outside.write_bytes(b"x")
            with self.assertRaises(ValidationError):
                store.add_output(draft_dir, manifest, outside, role="image")
            manifest["outputs"] = [{"role": "image", "path": "../outside.png", "bytes": 1, "sha256": "0" * 64}]
            with self.assertRaises(ValidationError):
                validate_manifest(manifest, manifest["draft_id"])

    def test_missing_or_unprefixed_draft_id_has_no_side_effect(self) -> None:
        with tempfile.TemporaryDirectory() as temp_name:
            root = Path(temp_name)
            store = DraftStore(root)
            for value in ("00000000-0000-0000-0000-000000000000", "draft-missing", "../draft-bad"):
                with self.subTest(value=value), self.assertRaises(ValidationError):
                    store.record_parent_decision(value, decision="approved", reviewer="Parent", notes="")
            self.assertEqual(list(root.glob("*")), [])

    def test_parent_decision_is_one_time_and_records_output_hashes(self) -> None:
        with tempfile.TemporaryDirectory() as temp_name:
            store = DraftStore(Path(temp_name))
            draft_id, draft_dir, manifest = store.create(kind="image", workflow={}, inputs={})
            output = draft_dir / "scene.png"
            output.write_bytes(b"image")
            store.add_output(draft_dir, manifest, output, role="image")
            store.add_qa(draft_dir, manifest, {"name": "image_contract", "status": "pass"})
            decided = store.record_parent_decision(draft_id, decision="approved", reviewer=" Parent ", notes=" looks good ")
            self.assertEqual(decided["status"], "approved")
            self.assertEqual(decided["approval"]["output_hashes"], [manifest["outputs"][0]["sha256"]])
            with self.assertRaises(ValidationError):
                store.record_parent_decision(draft_id, decision="rejected", reviewer="Parent", notes="changed")

    def test_failed_or_empty_draft_cannot_be_approved(self) -> None:
        with tempfile.TemporaryDirectory() as temp_name:
            store = DraftStore(Path(temp_name))
            draft_id, draft_dir, manifest = store.create(kind="image", workflow={}, inputs={})
            with self.assertRaises(ValidationError):
                store.record_parent_decision(draft_id, decision="approved", reviewer="Parent", notes="")
            output = draft_dir / "scene.png"
            output.write_bytes(b"image")
            store.add_output(draft_dir, manifest, output, role="image")
            store.add_qa(draft_dir, manifest, {"name": "image_contract", "status": "fail"})
            with self.assertRaises(ValidationError):
                store.record_parent_decision(draft_id, decision="approved", reviewer="Parent", notes="")
            rejected = store.record_parent_decision(draft_id, decision="rejected", reviewer="Parent", notes="QA failed")
            self.assertEqual(rejected["status"], "rejected")

    def test_in_flight_writers_cannot_erase_a_parent_rejection(self) -> None:
        with tempfile.TemporaryDirectory() as temp_name:
            store = DraftStore(Path(temp_name))
            draft_id, draft_dir, stale_manifest = store.create(kind="image", workflow={}, inputs={})
            rejected = store.record_parent_decision(draft_id, decision="rejected", reviewer="Parent", notes="Stop")
            output = draft_dir / "scene.png"
            output.write_bytes(b"late image")

            self.assertFalse(store.add_output(draft_dir, stale_manifest, output, role="image"))
            self.assertFalse(store.add_qa(draft_dir, stale_manifest, {"name": "late", "status": "pass"}))
            _, persisted = store.load(draft_id)
            self.assertEqual(persisted, rejected)
            self.assertEqual(stale_manifest, rejected)

    def test_approval_recomputes_output_hashes(self) -> None:
        with tempfile.TemporaryDirectory() as temp_name:
            store = DraftStore(Path(temp_name))
            draft_id, draft_dir, manifest = store.create(kind="image", workflow={}, inputs={})
            output = draft_dir / "scene.png"
            output.write_bytes(b"reviewed image")
            store.add_output(draft_dir, manifest, output, role="image")
            store.add_qa(draft_dir, manifest, {"name": "image_contract", "status": "pass"})
            output.write_bytes(b"changed after review")

            with self.assertRaisesRegex(ValidationError, "changed after QA"):
                store.record_parent_decision(draft_id, decision="approved", reviewer="Parent", notes="")
            _, persisted = store.load(draft_id)
            self.assertEqual(persisted["status"], "draft")
            self.assertIsNone(persisted["approval"])

    @unittest.skipUnless(sys.platform.startswith("linux"), "fcntl decision locking is Linux-specific")
    def test_concurrent_parent_decisions_allow_exactly_one_winner(self) -> None:
        with tempfile.TemporaryDirectory() as temp_name:
            draft_id, _, _ = DraftStore(Path(temp_name)).create(kind="image", workflow={}, inputs={})
            context = multiprocessing.get_context("fork")
            queue = context.Queue()
            processes = [context.Process(target=decide_in_process, args=(temp_name, draft_id, decision, queue)) for decision in ("approved", "rejected")]
            for process in processes:
                process.start()
            for process in processes:
                process.join(timeout=10)
                self.assertFalse(process.is_alive())
                self.assertEqual(process.exitcode, 0)
            results = [queue.get(timeout=2) for _ in processes]
            self.assertEqual(sum(kind == "ok" for kind, _ in results), 1)
            self.assertEqual(sum(kind == "error" for kind, _ in results), 1)


class FakeResponse:
    def __init__(self, data: bytes):
        self.data = data
        self.headers = {"Content-Length": str(len(data))}

    def __enter__(self) -> "FakeResponse":
        return self

    def __exit__(self, *_args: object) -> None:
        return None

    def read(self, limit: int = -1) -> bytes:
        return self.data if limit < 0 else self.data[:limit]


class ComfyClientTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = ComfyClient("http://127.0.0.1:8188", timeout_seconds=30)

    def test_direct_client_construction_enforces_url_and_timeout(self) -> None:
        with self.assertRaises(ValidationError):
            ComfyClient("http://example.com:8188", timeout_seconds=30)
        for timeout in (True, 29, 1801):
            with self.subTest(timeout=timeout), self.assertRaises(ComfyUIError):
                ComfyClient("http://127.0.0.1:8188", timeout_seconds=timeout)  # type: ignore[arg-type]

    def test_history_must_be_successful_and_contain_bounded_outputs(self) -> None:
        for entry in (None, {}, {"outputs": {}}, {"status": {"status_str": "error"}, "outputs": {}}):
            with self.subTest(entry=entry), self.assertRaises(ComfyUIError):
                self.client._collect_outputs(entry, Path("unused"))
        too_many = {"outputs": {"1": {"images": [{"filename": f"{index}.png"} for index in range(MAX_OUTPUT_COUNT + 1)]}}}
        with self.assertRaises(ComfyUIError):
            self.client._collect_outputs(too_many, Path("unused"))

    def test_upload_caps_the_exact_bytes_read_from_disk(self) -> None:
        with tempfile.TemporaryDirectory() as temp_name:
            source = Path(temp_name) / "oversized.png"
            source.write_bytes(b"x" * (MAX_IMAGE_INPUT_BYTES + 1))
            with patch.object(self.client, "_json_request") as request, self.assertRaisesRegex(
                ComfyUIError, "image input exceeds the size limit"
            ):
                self.client.upload_with_record(source)
            request.assert_not_called()

    def test_identical_uploads_reuse_a_content_addressed_name(self) -> None:
        with tempfile.TemporaryDirectory() as temp_name:
            source = Path(temp_name) / "bear.png"
            source.write_bytes(b"same reviewed bear")
            expected_name = f"foundry-{hashlib.sha256(source.read_bytes()).hexdigest()}.png"

            with patch.object(self.client, "_json_request", return_value={"name": expected_name}) as request:
                first = self.client.upload_with_record(source)
                second = self.client.upload_with_record(source)

            self.assertEqual(first, second)
            self.assertEqual(first[0], expected_name)
            for call in request.call_args_list:
                body = call.kwargs["body"]
                self.assertIn(f'filename="{expected_name}"'.encode(), body)
                self.assertIn(b'name="overwrite"\r\n\r\ntrue', body)

    def test_timeout_cancels_only_the_accepted_prompt(self) -> None:
        calls = []

        def request(method: str, path: str, **kwargs: object) -> dict:
            calls.append((method, path, kwargs.get("body")))
            if path == "/prompt":
                return {"prompt_id": "11111111-1111-4111-8111-111111111111"}
            if method == "POST" and path == "/api/jobs/11111111-1111-4111-8111-111111111111/cancel":
                return {"cancelled": True}
            if path == "/history/11111111-1111-4111-8111-111111111111":
                return {}
            self.fail(f"unexpected request: {method} {path}")

        with patch.object(self.client, "_json_request", side_effect=request), patch(
            "content_foundry.comfy_client.time.monotonic", side_effect=[0, 31]
        ), self.assertRaisesRegex(ComfyUIError, "timed out.*was cancelled"):
            self.client.run({"1": {"class_type": "Test", "inputs": {}}}, Path("unused"))
        self.assertEqual([(method, path) for method, path, _body in calls], [
            ("POST", "/prompt"),
            ("POST", "/api/jobs/11111111-1111-4111-8111-111111111111/cancel"),
            ("GET", "/history/11111111-1111-4111-8111-111111111111"),
        ])
        self.assertNotIn("/interrupt", [path for _method, path, _body in calls])

    def test_history_wins_when_a_timed_out_prompt_finishes_during_cancellation(self) -> None:
        prompt_id = "11111111-1111-4111-8111-111111111111"

        def request(method: str, path: str, **_kwargs: object) -> dict:
            if path == "/prompt":
                return {"prompt_id": prompt_id}
            if method == "POST" and path == f"/api/jobs/{prompt_id}/cancel":
                return {"cancelled": False}
            if path == f"/history/{prompt_id}":
                return {prompt_id: {"outputs": {}}}
            self.fail(f"unexpected request: {method} {path}")

        expected = [Path("completed.png")]
        with patch.object(self.client, "_json_request", side_effect=request), patch.object(
            self.client, "_collect_outputs", return_value=expected
        ) as collect, patch(
            "content_foundry.comfy_client.time.monotonic", side_effect=[0, 31]
        ):
            self.assertEqual(self.client.run({"1": {}}, Path("unused")), expected)
        collect.assert_called_once()

    def test_output_descriptor_rejects_unsafe_filename_subfolder_and_type(self) -> None:
        with tempfile.TemporaryDirectory() as temp_name:
            output = Path(temp_name)
            descriptors = (
                {"filename": "../escape.png", "subfolder": "", "type": "output"},
                {"filename": "scene.png", "subfolder": "/absolute", "type": "output"},
                {"filename": "scene.png", "subfolder": 7, "type": "output"},
                {"filename": "scene.png", "subfolder": "", "type": "input"},
            )
            for descriptor in descriptors:
                with self.subTest(descriptor=descriptor), self.assertRaises(ComfyUIError):
                    self.client._download(descriptor, output)

    def test_duplicate_remote_filenames_cannot_overwrite_a_download(self) -> None:
        entry = {"outputs": {"1": {"images": [
            {"filename": "scene.png", "subfolder": "", "type": "output"},
            {"filename": "scene.png", "subfolder": "", "type": "output"},
        ]}}}
        with tempfile.TemporaryDirectory() as temp_name:
            with patch.object(self.client._opener, "open", return_value=FakeResponse(b"image")), self.assertRaises(ComfyUIError):
                self.client._collect_outputs(entry, Path(temp_name))
            self.assertEqual((Path(temp_name) / "scene.png").read_bytes(), b"image")

    def test_http_redirects_are_not_followed(self) -> None:
        requests = []

        class RedirectHandler(BaseHTTPRequestHandler):
            def do_GET(self) -> None:
                requests.append(self.path)
                if self.path == "/redirect":
                    self.send_response(302)
                    self.send_header("Location", "/target")
                    self.end_headers()
                else:
                    self.send_response(200)
                    self.end_headers()
                    self.wfile.write(b"{}")

            def log_message(self, _format: str, *_args: object) -> None:
                return None

        server = ThreadingHTTPServer(("127.0.0.1", 0), RedirectHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            client = ComfyClient(f"http://127.0.0.1:{server.server_port}", timeout_seconds=30)
            with self.assertRaises(ComfyUIError):
                client._json_request("GET", "/redirect")
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)
        self.assertEqual(requests, ["/redirect"])


if __name__ == "__main__":
    unittest.main()
