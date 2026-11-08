"""Blender entry point for frozen action export, replay and independent parity."""
from array import array
import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
import zipfile

sys.dont_write_bytecode = True
if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from storybook.animation.maya_walk.blender_writer import owned_curves, replay_legacy
from storybook.animation.maya_walk.legacy import LegacyFixture


# Pins are shared with the original reproduction inventory.
from storybook.animation.maya_walk.__main__ import BASELINES


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()).hexdigest()


def action_source(bpy, source_hash):
    profiles, channels, lookup = [], [], {}
    for obj, curve in owned_curves(bpy):
        policies = {(p.interpolation, p.handle_left_type, p.handle_right_type) for p in curve.keyframe_points}
        if len(policies) != 1:
            raise ValueError("Legacy fixture requires the observed homogeneous key policy")
        interpolation, left, right = policies.pop()
        if left != right:
            raise ValueError("Unexpected asymmetric historical handle policy")
        profile = {"interpolation": interpolation, "handle": left,
                   "keys": [[*p.co, *p.handle_left, *p.handle_right] for p in curve.keyframe_points]}
        fingerprint = digest(profile)
        if fingerprint not in lookup:
            lookup[fingerprint] = len(profiles)
            profiles.append(profile)
        channels.append([obj.name, curve.data_path, curve.array_index, lookup[fingerprint]])
    return {"format": "maya-legacy-actions-v1", "source_sha256": source_hash,
            "channels": channels, "curves": profiles}


def rna_values(block):
    """Read existing primitive RNA properties and named pointers structurally."""
    result = {}
    for prop in block.bl_rna.properties:
        if prop.identifier == "rna_type" or prop.type == "COLLECTION":
            continue
        value = getattr(block, prop.identifier)
        if prop.type == "POINTER":
            result[prop.identifier] = None if value is None else getattr(value, "name", type(value).__name__)
        elif prop.type in ("BOOLEAN", "INT", "FLOAT") and prop.is_array:
            result[prop.identifier] = list(value)
        elif isinstance(value, set):
            result[prop.identifier] = sorted(value)
        elif isinstance(value, (str, int, float, bool)) or value is None:
            result[prop.identifier] = value
    return result


def static_snapshot(bpy):
    result = {"meshes": {}, "armatures": {}, "objects": {}, "images": {}, "materials": {}}
    for obj in bpy.data.objects:
        result["objects"][obj.name] = {"type": obj.type, "parent": obj.parent.name if obj.parent else None,
            "parent_type": obj.parent_type, "parent_bone": obj.parent_bone,
            "parent_inverse": [v for row in obj.matrix_parent_inverse for v in row],
            "rotation_mode": obj.rotation_mode, "hidden_render": obj.hide_render,
            "constraints": [rna_values(c) for c in obj.constraints],
            "modifiers": [rna_values(m) for m in obj.modifiers]}
        if obj.type == "MESH":
            result["meshes"][obj.name] = digest({
                "vertices": [list(v.co) for v in obj.data.vertices],
                "polygons": [list(p.vertices) for p in obj.data.polygons],
                "uv": [[list(v.uv) for v in layer.data] for layer in obj.data.uv_layers],
                "weights": [[(obj.vertex_groups[g.group].name, g.weight) for g in v.groups] for v in obj.data.vertices],
                "materials": [m.name if m else None for m in obj.data.materials],
                "material_indices": [p.material_index for p in obj.data.polygons]})
        if obj.type == "ARMATURE":
            result["armatures"][obj.name] = {b.name: {
                "rest": [v for row in b.matrix_local for v in row], "length": b.length,
                "parent": b.parent.name if b.parent else None, "connected": b.use_connect,
                "pose_rotation_mode": obj.pose.bones[b.name].rotation_mode,
                "constraints": [rna_values(c) for c in obj.pose.bones[b.name].constraints]}
                for b in obj.data.bones}
    for image in bpy.data.images:
        if image.packed_file:
            result["images"][image.name] = hashlib.sha256(image.packed_file.data).hexdigest()
    for mat in bpy.data.materials:
        tree = mat.node_tree
        result["materials"][mat.name] = digest({"properties": rna_values(mat),
            "nodes": [{"properties": rna_values(n), "inputs": [
                [s.name, list(s.default_value) if hasattr(s.default_value, "__iter__") and not isinstance(s.default_value, str) else s.default_value]
                for s in n.inputs if hasattr(s, "default_value") and s.type not in ("SHADER", "OBJECT", "IMAGE", "GEOMETRY", "MATERIAL", "COLLECTION", "TEXTURE")]} for n in tree.nodes] if tree else [],
            "links": [[l.from_node.name, l.from_socket.identifier, l.to_node.name, l.to_socket.identifier] for l in tree.links] if tree else []})
    return result


def snapshot(bpy, path, source_hash):
    scene = bpy.context.scene
    objects = sorted(bpy.data.objects, key=lambda o: o.name)
    groups = []
    for obj in objects:
        groups.append({"kind": "object_world", "name": obj.name, "size": 16})
        if obj.type == "ARMATURE":
            for bone in sorted(obj.pose.bones, key=lambda b: b.name):
                groups.append({"kind": "bone_matrix", "name": obj.name+"/"+bone.name, "size": 16})
        if obj.type == "MESH" and obj.name.startswith("ART "):
            groups.append({"kind": "painted_vertices_world", "name": obj.name, "size": len(obj.data.vertices)*3})
    manifest = {"format": "maya-parity-snapshot-v1", "source_sha256": source_hash,
                "runtime": bpy.app.build_hash.decode(), "frames": 513, "start_frame": 1, "step": .25,
                "coordinate_format": "little-endian float64", "groups": groups,
                "static": static_snapshot(bpy), "actions": action_source(bpy, BASELINES["release"][2])}
    with zipfile.ZipFile(path, "x", compression=zipfile.ZIP_DEFLATED, compresslevel=1) as archive:
        archive.writestr("manifest.json", json.dumps(manifest, separators=(",", ":"), allow_nan=False))
        for index in range(513):
            t = index/4
            scene.frame_set(int(t)+1, subframe=t % 1)
            bpy.context.view_layer.update()
            graph = bpy.context.evaluated_depsgraph_get()
            values = array("d")
            for obj in objects:
                ev = obj.evaluated_get(graph)
                values.extend(v for row in ev.matrix_world for v in row)
                if obj.type == "ARMATURE":
                    for bone in sorted(ev.pose.bones, key=lambda b: b.name):
                        values.extend(v for row in bone.matrix for v in row)
                if obj.type == "MESH" and obj.name.startswith("ART "):
                    mesh = ev.to_mesh()
                    try:
                        if len(mesh.vertices) != len(obj.data.vertices):
                            raise ValueError("Unexpected topology-changing painted modifier")
                        for vertex in mesh.vertices:
                            values.extend(ev.matrix_world @ vertex.co)
                    finally:
                        ev.to_mesh_clear()
            if len(values) != sum(g["size"] for g in groups):
                raise ValueError("Snapshot layout differs from manifest")
            if sys.byteorder != "little":
                values.byteswap()
            archive.writestr(f"frames/{index:04d}.bin", values.tobytes())
            if index % 128 == 0:
                print("PARITY_SAMPLE", index, flush=True)
    path.chmod(0o600)
    print("PARITY_SNAPSHOT", json.dumps({"groups": len(groups), "values_per_frame": sum(g["size"] for g in groups),
                                       "frames": 513, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}), flush=True)


def main():
    import bpy
    os.umask(0o077)
    parser = argparse.ArgumentParser()
    parser.add_argument("operation", choices=("export", "replay", "snapshot"))
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--input-sha256", required=True)
    parser.add_argument("--fixture", type=Path)
    parser.add_argument("--fixture-sha256")
    args = parser.parse_args(sys.argv[sys.argv.index("--")+1:])
    source = Path(bpy.data.filepath).resolve()
    actual = hashlib.sha256(source.read_bytes()).hexdigest()
    if actual != args.input_sha256 or bpy.app.build_hash.decode() != "d13f752e3b9c":
        raise ValueError("Input or runtime pin mismatch")
    if args.output.exists() or source == args.output.resolve():
        raise ValueError("Output must be new, never an input asset")
    if bpy.app.handlers.frame_change_pre or bpy.app.handlers.frame_change_post:
        raise ValueError("Playback handlers forbidden")
    args.output.parent.mkdir(parents=True, mode=0o700, exist_ok=True)
    if args.operation == "export":
        if actual != BASELINES["release"][2]:
            raise ValueError("Only pinned C may be frozen")
        args.output.write_text(json.dumps(action_source(bpy, actual), separators=(",", ":"), allow_nan=False)+"\n")
        fixture = LegacyFixture.load(args.output, hashlib.sha256(args.output.read_bytes()).hexdigest())
        print("LEGACY_EXPORTED", json.dumps({"channels": len(fixture.curves), "sha256": hashlib.sha256(args.output.read_bytes()).hexdigest()}), flush=True)
    elif args.operation == "replay":
        if actual != BASELINES["painted"][2]:
            raise ValueError("Replay starts only from pinned P")
        before = static_snapshot(bpy)
        fixture = LegacyFixture.load(args.fixture, args.fixture_sha256)
        replay_legacy(bpy, fixture)
        bpy.context.scene.frame_set(1)
        bpy.context.view_layer.update()
        if before != static_snapshot(bpy):
            raise ValueError("Static scene changed during action serialization")
        bpy.context.scene["proof_status"] = "Lossless legacy replay; not a corrected or accepted walk"
        bpy.ops.wm.save_as_mainfile(filepath=str(args.output))
        print("LEGACY_REBUILT", json.dumps({"sha256": hashlib.sha256(args.output.read_bytes()).hexdigest(), "channels": len(fixture.curves)}), flush=True)
    else:
        snapshot(bpy, args.output, actual)
    args.output.chmod(0o600)
    if hashlib.sha256(source.read_bytes()).hexdigest() != actual:
        raise ValueError("Original input changed")


if __name__ == "__main__":
    main()
