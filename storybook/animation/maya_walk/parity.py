"""Independent saved-scene comparison against the supplied lower-rig oracle."""
from array import array
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys
import zipfile

from .legacy import LegacyFixture


FIXTURE_SHA256 = "5f15d718e062dea21687ba4c2a98fb494ae2bb382105013f4859fc57aa61a9dd"
ORACLE_SHA256 = "2cb590c9aa8684017ca3be2be361636de02cb08ebadde69a15b5722cb091ebb7"
LOWER_BONES = frozenset(("pelvis", *(side+"_"+bone for side in ("near", "far") for bone in ("thigh", "shin", "foot", "toe"))))


def read_oracle(path):
    raw = path.read_bytes()
    if hashlib.sha256(raw).hexdigest() != ORACLE_SHA256:
        raise ValueError("Supplied lower oracle pin mismatch")
    data = json.loads(raw)
    if type(data) is not list or len(data) != 513:
        raise ValueError("Oracle must cover all quarter frames 1 through 129")
    for row in data:
        if type(row) is not dict or set(row) != LOWER_BONES:
            raise ValueError("Complete lower-bone inventory required")
        if any(type(v) is not list or len(v) != 16 or not all(type(x) in (int, float) and math.isfinite(x) for x in v) for v in row.values()):
            raise ValueError("Finite armature-space 4 by 4 oracle matrices required")
    return data


def frame_values(archive, index, count):
    values = array("d")
    values.frombytes(archive.read(f"frames/{index:04d}.bin"))
    if sys.byteorder != "little":
        values.byteswap()
    if len(values) != count or not all(math.isfinite(x) for x in values):
        raise ValueError("Incomplete/nonfinite independent snapshot")
    return values


def compare_snapshots(original_path, rebuilt_path, oracle_path, tolerance=1e-6):
    if type(tolerance) not in (int, float) or not math.isfinite(tolerance) or not 0 < tolerance <= 1e-6:
        raise ValueError("Parity tolerance cannot exceed the accepted limit")
    oracle = read_oracle(oracle_path)
    failures = []
    maxima = {}
    with zipfile.ZipFile(original_path) as original, zipfile.ZipFile(rebuilt_path) as rebuilt:
        a = json.loads(original.read("manifest.json"))
        b = json.loads(rebuilt.read("manifest.json"))
        for manifest in (a, b):
            if (manifest["format"], manifest["runtime"], manifest["frames"], manifest["start_frame"], manifest["step"], manifest["coordinate_format"]) != (
                    "maya-parity-snapshot-v1", "d13f752e3b9c", 513, 1, .25, "little-endian float64"):
                raise ValueError("Snapshot domain/runtime/format differs from parity contract")
            expected_files = {"manifest.json", *(f"frames/{i:04d}.bin" for i in range(513))}
            archive = original if manifest is a else rebuilt
            if len(archive.namelist()) != len(expected_files) or set(archive.namelist()) != expected_files:
                raise ValueError("Missing or extra snapshot frame records")
        if a["groups"] != b["groups"] or not a["groups"]:
            raise ValueError("Snapshot group inventories differ or are empty")
        if a["static"] != b["static"]:
            failures.append({"rule": "static_preservation", "changed_sections": [key for key in a["static"] if a["static"][key] != b["static"].get(key)]})
        if a["actions"] != b["actions"]:
            failures.append({"rule": "lossless_action_data", "detail": "Exported key coordinates or policies differ"})
        groups = a["groups"]
        lower = {g["name"].split("/", 1)[1] for g in groups if g["kind"] == "bone_matrix" and g["name"].startswith("MAYA_CONTROL_RIG/")}
        if lower != LOWER_BONES or not any(g["kind"] == "painted_vertices_world" for g in groups):
            raise ValueError("Independent snapshot missing lower rig or painted geometry")
        count = sum(g["size"] for g in groups)

        def measure(category, group, left, right, index):
            if len(left) != len(right) or not left:
                raise ValueError("Incomplete parity group")
            error, entry = max((abs(x-y), i) for i, (x, y) in enumerate(zip(left, right)))
            worst = {"error": error, "frame": 1+index/4, "group": group, "entry": entry}
            if category not in maxima or error > maxima[category]["error"]:
                maxima[category] = worst
            if error > tolerance:
                failures.append({"rule": category, **worst, "limit": tolerance})

        for index in range(513):
            left, right = (frame_values(z, index, count) for z in (original, rebuilt))
            offset = 0
            for group in groups:
                end = offset+group["size"]
                measure(group["kind"], group["name"], left[offset:end], right[offset:end], index)
                if group["kind"] == "bone_matrix" and group["name"].startswith("MAYA_CONTROL_RIG/"):
                    name = group["name"].split("/", 1)[1]
                    measure("independent_original_vs_supplied_oracle", name, oracle[index][name], left[offset:end], index)
                    measure("rebuilt_vs_supplied_oracle", name, oracle[index][name], right[offset:end], index)
                offset = end
    return {"format": "maya-port-parity-v1", "status": "FAIL" if failures else "PASS", "frames": 513,
            "tolerance": tolerance, "maxima": maxima, "violations": failures,
            "source_scene_sha256": a["source_sha256"], "rebuilt_scene_sha256": b["source_sha256"],
            "oracle_sha256": ORACLE_SHA256, "groups": len(groups), "values_per_frame": count,
            "all_static_data_equal": a["static"] == b["static"], "all_action_data_equal": a["actions"] == b["actions"],
            "artistic_acceptance": False}


def run_port(args):
    from .__main__ import BASELINES, write_json
    output = args.output_dir.resolve()
    output.mkdir(mode=0o700, parents=True, exist_ok=False)
    source = Path(__file__).parent
    fixture = source/"tests/legacy-actions.json"
    LegacyFixture.load(fixture, FIXTURE_SHA256)
    inventory = {str(p.relative_to(source)): hashlib.sha256(p.read_bytes()).hexdigest()
                 for p in sorted(source.rglob("*")) if p.is_file() and p.suffix in (".py", ".json")}
    write_json(output/"source-inventory.json", inventory)

    def run(alias, scene, digest, operation, target, extra=()):
        command = [args.blender, "--background", "--factory-startup", "--disable-autoexec", "--threads", "2",
                   str(scene), "--python-exit-code", "17", "--python", str(source/"legacy_scene.py"), "--",
                   operation, "--output", str(target), "--input-sha256", digest, *extra]
        with (output/f"{alias}.log").open("w") as log:
            result = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT, timeout=300)
        write_json(output/f"{alias}-command.json", {"command": command, "exit_code": result.returncode})
        if result.returncode:
            print((output/f"{alias}.log").read_text(), file=sys.stderr)
            raise RuntimeError(f"Parity {alias} process failed: {result.returncode}")
        print("PORT_STEP", alias, "PASS", flush=True)

    original = args.evidence_root/BASELINES["release"][0]
    painted = args.evidence_root/BASELINES["painted"][0]
    rebuilt = output/"maya-legacy-rebuilt.blend"
    run("original-snapshot", original, BASELINES["release"][2], "snapshot", output/"original.zip")
    run("rebuild", painted, BASELINES["painted"][2], "replay", rebuilt,
        ("--fixture", str(fixture), "--fixture-sha256", FIXTURE_SHA256))
    run("rebuilt-snapshot", rebuilt, hashlib.sha256(rebuilt.read_bytes()).hexdigest(), "snapshot", output/"rebuilt.zip")
    report = compare_snapshots(output/"original.zip", output/"rebuilt.zip",
                               args.evidence_root/"maya-continuous-release-2026-11-07/native-baseline-matrices.json")
    write_json(output/"parity.json", report)
    print("PORT_PARITY", json.dumps({k: v for k, v in report.items() if k != "violations"}), flush=True)
    return 0 if report["status"] == "PASS" else 1
