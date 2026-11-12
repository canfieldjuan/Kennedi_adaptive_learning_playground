"""Read-only Blender adapter. Run in a fresh factory process, never save input."""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import sys

sys.dont_write_bytecode = True

# Blender's --python entry point can import only this checkout's source.
if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from storybook.animation.maya_walk.spec import (BASELINE, FINE_SPACING, PROGRESSION_POINTS, TARGET,
                                                GaitSpec, Side, SceneKind)


def weights_at(point, a, b, c):
    den = (b[1]-c[1])*(a[0]-c[0]) + (c[0]-b[0])*(a[1]-c[1])
    if abs(den) < 1e-14:
        return None
    u = ((b[1]-c[1])*(point[0]-c[0]) + (c[0]-b[0])*(point[1]-c[1])) / den
    v = ((c[1]-a[1])*(point[0]-c[0]) + (a[0]-c[0])*(point[1]-c[1])) / den
    w = 1-u-v
    return (u, v, w) if min(u, v, w) >= -1e-7 else None


def material_locator(mesh, pixel, size):
    point = (pixel[0]/size[0], 1-pixel[1]/size[1])
    uv = mesh.uv_layers.active.data
    mesh.calc_loop_triangles()
    for tri in mesh.loop_triangles:
        weights = weights_at(point, *(uv[i].uv for i in tri.loops))
        if weights is not None:
            return tuple(tri.vertices), weights
    raise ValueError(f"Registered heel pixel outside UV mesh: {pixel}")


def angle_delta(a, b):
    return (a-b+180) % 360 - 180


def ankle_dorsiflexion(foot_pitch, shin_distal_angle):
    """Foot angle above horizontal relative to distal shin angle from down."""
    return angle_delta(foot_pitch, shin_distal_angle)


def times(spec):
    values = {i/4 for i in range(513)}
    # Exact events throughout the scene, not a selected local verification window.
    events = (0., spec.foot_flat, spec.heel_off, spec.ball_off, spec.toe_off)
    for side in Side:
        for n in range(-1, math.ceil(128/spec.cycle_frames)+2):
            for phase in events:
                t = (n+phase)*spec.cycle_frames-spec.offset(side)
                if 0 <= t <= 128:
                    values.add(round(t, 9))
                    if phase == spec.toe_off:
                        # One-sided departure in addition to a centered velocity.
                        values.update(round(t+d, 9) for d in (1/128, .25) if t+d <= 128)
    return sorted(values)


def fine_times(start, end, spacing=FINE_SPACING):
    """The one fine-track schedule: uniform grid from start-δ to end+δ."""
    count = round((end-start)/spacing)+3
    if count < 3 or abs(start+(count-3)*spacing-end) > 1e-9:
        raise ValueError("Fine window must span whole grid steps")
    return [start+(i-1)*spacing for i in range(count)]


def action_inventory(bpy):
    result = []
    for obj in bpy.data.objects:
        data = obj.animation_data
        if not data:
            continue
        if data.drivers or data.nla_tracks:
            raise ValueError(f"Unqualified animation driver/NLA on {obj.name}")
        if not data.action:
            continue
        for layer in data.action.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for curve in bag.fcurves:
                        result.append({"object": obj.name, "action": data.action.name,
                                       "path": curve.data_path, "index": curve.array_index,
                                       "key_count": len(curve.keyframe_points),
                                       "modifiers": [m.type for m in curve.modifiers]})
    return result


def main():
    import bpy
    from mathutils import Vector

    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--sha256", required=True)
    parser.add_argument("--kind", required=True, choices=[k.value for k in SceneKind])
    parser.add_argument("--alias", required=True)
    args = parser.parse_args(sys.argv[sys.argv.index("--")+1:])
    source = Path(bpy.data.filepath).resolve()
    with source.open("rb") as handle:
        digest = hashlib.file_digest(handle, "sha256").hexdigest()
    if digest != args.sha256:
        raise ValueError("Input scene hash differs from sealed inventory")
    if bpy.app.build_hash.decode() != "d13f752e3b9c":
        raise ValueError("Baseline qualification requires the pinned Blender build")
    if bpy.app.handlers.frame_change_pre or bpy.app.handlers.frame_change_post:
        raise ValueError("Playback handlers violate source-only native evaluation")
    kind = SceneKind(args.kind)
    spec = TARGET if args.alias == "candidate" else BASELINE
    if args.alias == "candidate" and GaitSpec(**json.loads(bpy.context.scene.get("gait_spec", "null"))) != spec:
        raise ValueError("Saved source clock differs from candidate specification")
    scene = bpy.context.scene
    rig = bpy.data.objects["MAYA_CONTROL_RIG"]
    upper = bpy.data.objects.get("MAYA_PAINTED_UPPER_RIG")
    if (upper is not None) != (kind is SceneKind.PAINTED):
        raise ValueError("Declared scene kind disagrees with saved scene")
    # The material pixels are the exact registered points of the historical
    # release reproduction. Native near maps to visible far painted artwork.
    locators = {}
    if kind is SceneKind.PAINTED:
        size = bpy.data.images["maya-parts-v2.png"].size
        for side, art, pixel in ((Side.NEAR, "far", (1121.5, 1137.5)),
                                 (Side.FAR, "near", (1120.5, 774.5))):
            obj = bpy.data.objects[f"ART {art} yellow boot"]
            locators[side] = (obj, *material_locator(obj.data, pixel, size))

    def sample(t):
        floor = math.floor(t)
        scene.frame_set(floor+1, subframe=t-floor)
        bpy.context.view_layer.update()
        graph = bpy.context.evaluated_depsgraph_get()
        evaluated = rig.evaluated_get(graph)
        world = evaluated.matrix_world
        pelvis = evaluated.pose.bones["pelvis"]
        pdir = world.to_3x3() @ (pelvis.tail-pelvis.head)
        pelvis_tilt = math.degrees(math.atan2(-pdir.x, pdir.z))
        arms = {}
        if upper is not None:
            ev_upper = upper.evaluated_get(graph)
            for name in ("free_arm", "free_forearm", "holding_arm", "holding_forearm", "lantern"):
                bone = ev_upper.pose.bones[name]
                v = ev_upper.matrix_world.to_3x3() @ (bone.tail-bone.head)
                arms[name] = math.degrees(math.atan2(v.x, -v.z))
        result = {}
        for side in Side:
            prefix = side.value + "_"
            thigh, shin, foot = (evaluated.pose.bones[prefix+n] for n in ("thigh", "shin", "foot"))
            h, k, a = (world @ p for p in (thigh.head, shin.head, shin.tail))
            points = {"hip": h, "knee": k, "ankle": a}
            y = rig.data.bones[prefix+"foot"].head_local.y
            for name, x, bone_name in (("heel", -.09, "foot"), ("ball", .15, "foot"), ("toe", .28, "toe")):
                pose = evaluated.pose.bones[prefix+bone_name]
                rest = rig.data.bones[prefix+bone_name]
                points[name] = world @ pose.matrix @ rest.matrix_local.inverted() @ Vector((x, y, 0.))
            if locators:
                obj, ids, weights = locators[side]
                ev = obj.evaluated_get(graph)
                mesh = ev.to_mesh()
                try:
                    points["painted_heel"] = ev.matrix_world @ sum(
                        (mesh.vertices[i].co*w for i, w in zip(ids, weights)), Vector())
                finally:
                    ev.to_mesh_clear()
            thigh_dir, shin_dir = k-h, a-k
            foot_dir = world.to_3x3() @ (foot.tail-foot.head)
            theta = math.degrees(math.atan2(shin_dir.x, -shin_dir.z))
            pitch = math.degrees(math.atan2(foot_dir.z, foot_dir.x))
            angles = {"hip": angle_delta(math.degrees(math.atan2(thigh_dir.x, -thigh_dir.z)), pelvis_tilt),
                      "knee": math.degrees(thigh_dir.angle(shin_dir)),
                      "ankle": ankle_dorsiflexion(pitch, theta), "foot_pitch": pitch}
            result[side] = {"points": {k: list(v) for k, v in points.items()},
                            "angles": angles, "upper": arms,
                            "ik_target": list(bpy.data.objects["MCH_Ankle_"+side.value].evaluated_get(graph).matrix_world.translation)}
        return result

    rows = []
    h = 1/128
    schedule = times(spec)
    for index, t in enumerate(schedule):
        before, center, after = sample(t-h), sample(t), sample(t+h)
        for side in Side:
            row = center[side]
            velocity = {key: [(b-a)/(2*h) for a, b in zip(before[side]["points"][key], after[side]["points"][key])]
                        for key in row["points"]}
            omega = {key: angle_delta(after[side]["angles"][key], before[side]["angles"][key])/(2*h)
                     for key in row["angles"]}
            rows.append({"time": t, "side": side.value, **row,
                         "velocity": velocity, "angular_velocity": omega})
        if index % 100 == 0:
            print(f"SAMPLE_PROGRESS {args.alias} {index}/{len(schedule)}", flush=True)
    # Fine interval track from the same evaluated pose definitions.
    fine = fine_times(0, 128)
    track_rows = [sample(t) for t in fine]
    tracks = [{"side": side.value, "start": fine[0], "spacing": FINE_SPACING,
               "angles": {key: [r[side]["angles"][key] for r in track_rows] for key in track_rows[0][side]["angles"]},
               "progress_x": {key: [r[side]["points"][key][0] for r in track_rows] for key in PROGRESSION_POINTS}}
              for side in Side]
    result = {"format": "maya-walk-samples-v3", "alias": args.alias,
              "scene_sha256": digest, "scene_kind": kind.value,
              "runtime": {"version": bpy.app.version_string, "build": bpy.app.build_hash.decode(),
                          "factory_process": True, "autoexec_disabled": not bpy.context.preferences.filepaths.use_scripts_auto_execute},
              "fps": scene.render.fps/scene.render.fps_base,
              "scene_units_meters": scene.unit_settings.scale_length,
              "rest_hip_height": (rig.matrix_world @ rig.data.bones["pelvis"].head_local).z,
              "spec": spec.to_dict(), "time_domain": [0, 128],
              "validation_domain": [0, 127], "derivative_half_width": h,
              "point_definition": "Native rest landmarks transformed by evaluated pose bones; painted heel is registered opaque material",
              "actions": action_inventory(bpy), "samples": rows, "tracks": tracks}
    os.umask(0o077)
    args.output.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, separators=(",", ":"), allow_nan=False)+"\n")
    args.output.chmod(0o600)
    with source.open("rb") as handle:
        after_digest = hashlib.file_digest(handle, "sha256").hexdigest()
    if after_digest != digest:
        raise ValueError("Input scene changed during sampling")
    print("SAMPLE_COMPLETE", json.dumps({"alias": args.alias, "rows": len(rows), "input_unchanged": True,
                                         "output": str(args.output)}), flush=True)


if __name__ == "__main__":
    main()
