"""Local read-only reproduction commands; the motion writer is not released yet."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

from .spec import BASELINE, SamplePacket
from .validate import validate_cycle
from .review import render_plots


BASELINES = {
    "native": ("maya-control-rig-proof-2026-11-07/maya-control-rig.blend", "native",
               "867a09694644afcabc97b08c60d1133b3b4539f3885fe978c32533dbf6cf4830"),
    "painted": ("maya-painted-control-rig-2026-11-07/maya-painted-control-rig.blend", "painted",
                "fc92ced549200fe84e42a8fbfcab95cf44e82d44ff64896f3ad62fd5d2235eee"),
    "release": ("maya-continuous-release-2026-11-07/maya-continuous-release.blend", "painted",
                "b244c634349a59110de602b740253cf30d56dc09466d0817a7eee2fb61b7fbf9"),
}


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, allow_nan=False)+"\n")
    path.chmod(0o600)


def analyze(path):
    packet = json.loads(path.read_text())
    model = SamplePacket.from_dict(packet)
    _, kind, digest = BASELINES[model.alias.value]
    if model.scene_kind.value != kind or model.scene_sha256 != digest or model.spec != BASELINE:
        raise ValueError("Baseline identity or policy differs from the sealed owner")
    samples = model.samples
    report = validate_cycle(samples, model.spec, model.scene_kind, fps=model.fps,
                            rest_hip_height=model.rest_hip_height, scene_sha256=model.scene_sha256,
                            alias=model.alias.value)
    report["sample_packet_sha256"] = hashlib.sha256(path.read_bytes()).hexdigest()
    return packet, samples, report


def reproduce(args):
    output = args.output_dir.resolve()
    output.mkdir(mode=0o700, parents=True, exist_ok=False)
    sources = {str(p.relative_to(Path(__file__).parent)): hashlib.sha256(p.read_bytes()).hexdigest()
               for p in sorted(Path(__file__).parent.rglob("*.py"))}
    write_json(output/"source-inventory.json", sources)
    results = {}
    for alias, (relative, kind, digest) in BASELINES.items():
        path = args.evidence_root.resolve()/relative
        samples = output/f"{alias}-samples.json"
        command = [args.blender, "--background", "--factory-startup", "--disable-autoexec",
                   "--threads", "2", str(path), "--python-exit-code", "17",
                   "--python", str(Path(__file__).with_name("sample_scene.py")), "--",
                   "--output", str(samples), "--kind", kind, "--alias", alias, "--sha256", digest]
        with (output/f"{alias}-sample.log").open("w") as log:
            result = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT, timeout=180)
        write_json(output/f"{alias}-command.json", {"command": command, "exit_code": result.returncode})
        if result.returncode:
            print((output/f"{alias}-sample.log").read_text(), file=sys.stderr)
            raise RuntimeError(f"Sampler failed for {alias}: {result.returncode}")
        packet, rows, report = analyze(samples)
        report["plots"] = render_plots(packet, report, output)
        write_json(output/f"{alias}-validation.json", report)
        required = "release_stall" if alias in ("native", "painted") else "knee_near_straight"
        reproduced = report["status"] == "FAIL" and required in report["violation_counts"]
        # Require the actual failing rule for both legs and every complete cycle.
        expected_cycles = {(c["side"], c["cycle"]) for c in report["cycles"]}
        actual_cycles = {(v["side"], v["cycle"]) for v in report["violations"] if v["rule"] == required}
        reproduced = reproduced and len(expected_cycles) == report["coverage"]["expected_cycles"] and actual_cycles == expected_cycles
        if alias == "release":
            reproduced = reproduced and "release_stall" not in report["violation_counts"]
        results[alias] = {"reproduced": reproduced, "required_rule": required,
                          "coverage": report["coverage"], "violation_counts": report["violation_counts"],
                          "release": report["cycles"][0]["release"] if report["cycles"] else None,
                          "report_sha256": hashlib.sha256((output/f"{alias}-validation.json").read_bytes()).hexdigest()}
        print("BASELINE_RESULT", alias, json.dumps(results[alias]), flush=True)
    write_json(output/"reproduction.json", {"status": "REPRODUCED" if all(r["reproduced"] for r in results.values()) else "FAIL", "baselines": results})
    return 0 if all(r["reproduced"] for r in results.values()) else 1


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    rep = commands.add_parser("reproduce")
    rep.add_argument("--evidence-root", type=Path, required=True)
    rep.add_argument("--output-dir", type=Path, required=True)
    rep.add_argument("--blender", default="blender")
    port = commands.add_parser("port-parity")
    port.add_argument("--evidence-root", type=Path, required=True)
    port.add_argument("--output-dir", type=Path, required=True)
    port.add_argument("--blender", default="blender")
    check = commands.add_parser("validate")
    check.add_argument("samples", type=Path)
    check.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.command == "reproduce":
        return reproduce(args)
    if args.command == "port-parity":
        from .parity import run_port
        return run_port(args)
    packet, _, report = analyze(args.samples)
    report["plots"] = render_plots(packet, report, args.output.parent)
    write_json(args.output, report)
    print(json.dumps({"status": report["status"], "counts": report["violation_counts"]}))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
