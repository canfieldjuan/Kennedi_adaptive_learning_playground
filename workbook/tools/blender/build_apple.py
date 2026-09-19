"""Build the line-art apple in Blender and render it.

Usage:
  blender --background --factory-startup --python workbook/tools/blender/build_apple.py -- \
      [--profile PROFILE.json] [--out-dir DIR] [--silhouette BODY_ONLY.png]

Writes apple-lineart.png (print art) and apple-shaded.png (form check) to --out-dir.
"""
import argparse
import json
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

WORKBOOK = Path(__file__).resolve().parents[2]
ASSET_DIR = WORKBOOK / "design-source" / "blender" / "apple"

Z_SCALE = 0.8924          # rendered silhouette aspect matches the reference's 0.929
LOBE_DEPTH = 0.085
HUMP_HEIGHT = 0.14
CAMERA_TILT = math.radians(10)
HIGHLIGHT_TARGET = Vector((-0.60, 0.0, 0.58))


def smoothstep(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", type=Path, default=ASSET_DIR / "profile.json")
    parser.add_argument("--out-dir", type=Path, default=ASSET_DIR)
    parser.add_argument("--silhouette", type=Path, default=None)
    return parser.parse_args(argv)


def reset_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    # Tone-mapped view transforms (AgX, Filmic) render pure white as grey.
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'
    scene.render.resolution_x = scene.render.resolution_y = 1000
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    if scene.world is None:
        scene.world = bpy.data.worlds.new("World")
    scene.world.use_nodes = True
    background = next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND')
    background.inputs['Color'].default_value = (1, 1, 1, 1)
    background.inputs['Strength'].default_value = 1.0
    return scene


def flat_white_material():
    mat = bpy.data.materials.new("FlatWhite")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    # Emission ignores lighting, so fills stay literal white (the print rule is black ink only).
    emit = nodes.new("ShaderNodeEmission")
    emit.inputs['Color'].default_value = (1, 1, 1, 1)
    out = nodes.new("ShaderNodeOutputMaterial")
    mat.node_tree.links.new(emit.outputs['Emission'], out.inputs['Surface'])
    return mat


def link_mesh(name, mesh, mat):
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def build_body(profile, mat):
    bm = bmesh.new()
    verts = [bm.verts.new((r, 0.0, z)) for r, z in profile]
    edges = [bm.edges.new((verts[i], verts[i + 1])) for i in range(len(verts) - 1)]
    bmesh.ops.spin(bm, geom=verts + edges, axis=(0, 0, 1), cent=(0, 0, 0),
                   angle=math.radians(360), steps=96, use_duplicate=False)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005)
    for v in bm.verts:
        x, y, z = v.co
        r = math.hypot(x, y)
        if r < 1e-6:
            continue
        theta = math.atan2(y, x)
        lobes = math.sin(2 * theta) ** 2
        # Humps only left/right of the stem: diagonal humps form a saddle that draws a line across the top.
        humps = math.cos(theta) ** 2
        base = smoothstep((-0.50 - z) / 0.40)
        band = smoothstep((r - 0.30) / 0.20) * (1 - smoothstep((r - 0.62) / 0.28))
        shoulder = smoothstep((z - 0.70) / 0.16) * band
        v.co.z += -LOBE_DEPTH * lobes * base + HUMP_HEIGHT * humps * shoulder
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new("AppleBodyMesh")
    bm.to_mesh(mesh)
    bm.free()
    for poly in mesh.polygons:
        poly.use_smooth = True
    body = link_mesh("AppleBody", mesh, mat)
    subsurf = body.modifiers.new("Smooth", type='SUBSURF')
    subsurf.levels = 2
    subsurf.render_levels = 3
    body.scale = (1, 1, Z_SCALE)
    return body


def build_stem(floor_z, mat):
    points = [(0.00, 0.02, floor_z - 0.02), (0.03, 0.02, floor_z + 0.22),
              (0.12, 0.02, floor_z + 0.46), (0.26, 0.02, floor_z + 0.62)]
    curve = bpy.data.curves.new("StemCurve", type='CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = 0.055
    curve.bevel_resolution = 4
    curve.use_fill_caps = True
    spline = curve.splines.new('BEZIER')
    spline.bezier_points.add(len(points) - 1)
    for bp, co, radius in zip(spline.bezier_points, points, (1.1, 1.0, 0.92, 0.85)):
        bp.co = co
        bp.radius = radius
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
    temp = bpy.data.objects.new("StemCurve", curve)
    bpy.context.collection.objects.link(temp)
    mesh = bpy.data.meshes.new_from_object(temp.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(temp, do_unlink=True)
    bpy.data.curves.remove(curve)

    bm = bmesh.new()
    bm.from_mesh(mesh)
    tip = Vector(points[-1])
    tangent = (tip - Vector(points[-2])).normalized()
    cut = bmesh.ops.bisect_plane(
        bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
        plane_co=tip - tangent * 0.02,
        plane_no=(tangent + Vector((0.55, 0.0, -0.35))).normalized(),
        clear_outer=True,
    )
    bmesh.ops.edgenet_fill(bm, edges=[e for e in cut['geom_cut'] if isinstance(e, bmesh.types.BMEdge)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    for poly in mesh.polygons:
        poly.use_smooth = True
    return link_mesh("Stem", mesh, mat)


def build_leaf(mat, location):
    n_rows, length, half_width, mid = 13, 1.16, 0.27, 0.60
    rib_shift, rib_rows = 0.24, (3, 5, 7)
    peak_exponent = math.log(0.5) / math.log(0.38)   # widest point 38% of the way from the base
    rows = []
    for i in range(n_rows):
        t = i / (n_rows - 1)
        rows.append((length * t, half_width * math.sin(math.pi * t ** peak_exponent) ** 1.25))
    rows[0], rows[-1] = (0.0, 0.015), (length, 0.0)

    bm = bmesh.new()
    spine = [bm.verts.new((0.0, y, 0.0)) for y, _ in rows]

    def ring(sign, frac, shift):
        return [bm.verts.new((sign * hw * frac, min(y + shift * hw / half_width, length - 0.02), 0.0))
                if hw > 1e-4 else None for y, hw in rows]

    # The inner ring sits further toward the tip, so the ribs angle forward like real veins.
    mid_r, mid_l = ring(1, mid, rib_shift), ring(-1, mid, rib_shift)
    out_r, out_l = ring(1, 1.0, 0.0), ring(-1, 1.0, 0.0)

    def strip(inner, outer):
        for i in range(n_rows - 1):
            a, b = inner[i] or spine[i], inner[i + 1] or spine[i + 1]
            c, d = outer[i], outer[i + 1]
            if c and d:
                bm.faces.new((a, c, d, b))
            elif c or d:
                bm.faces.new((a, c or d, b))

    strip(spine, mid_r)
    strip(mid_r, out_r)
    strip(spine, mid_l)
    strip(mid_l, out_l)
    # Mirrored halves are wound oppositely; left as-is, the spine renders as a thick contour.
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for face in bm.faces:
        if face.normal.z < 0:
            face.normal_flip()

    bm.verts.index_update()
    veins = {frozenset((spine[i].index, spine[i + 1].index)) for i in range(n_rows - 1)}
    for i in rib_rows:
        for side in (mid_r, mid_l):
            if side[i]:
                veins.add(frozenset((spine[i].index, side[i].index)))
    mesh = bpy.data.meshes.new("LeafMesh")
    bm.to_mesh(mesh)
    bm.free()

    # Freestyle reads edge marks from this attribute, and only draws marks on edges that have faces.
    marks = mesh.attributes.new("freestyle_edge", 'BOOLEAN', 'EDGE')
    for edge in mesh.edges:
        marks.data[edge.index].value = frozenset(edge.vertices) in veins

    for v in mesh.vertices:
        t = min(max(v.co.y / length, 0.0), 1.0)
        u = v.co.x / half_width
        v.co.z += -0.20 * t * t + 0.07 * u * u + 0.10 * t * u   # arc, cup, slight twist
    for poly in mesh.polygons:
        poly.use_smooth = True

    leaf = link_mesh("Leaf", mesh, mat)
    leaf.location = location
    leaf.rotation_euler = (math.radians(90) - CAMERA_TILT, math.radians(-50), 0.0)
    leaf.scale = (0.82, 0.82, 0.82)
    return leaf


def build_camera(scene):
    data = bpy.data.cameras.new("Camera")
    data.type = 'ORTHO'
    data.ortho_scale = 3.35
    cam = bpy.data.objects.new("Camera", data)
    bpy.context.collection.objects.link(cam)
    cam.location = (0.0, -6.0 * math.cos(CAMERA_TILT), 0.26 + 6.0 * math.sin(CAMERA_TILT))
    cam.rotation_euler = (math.radians(90) - CAMERA_TILT, 0.0, 0.0)
    scene.camera = cam
    return cam


def seat_highlight(body, cam, mat):
    bm = bmesh.new()
    bm.faces.new([bm.verts.new((0.075 * math.cos(a), 0.115 * math.sin(a), 0.0))
                  for a in (2 * math.pi * i / 20 for i in range(20))])
    mesh = bpy.data.meshes.new("HighlightMesh")
    bm.to_mesh(mesh)
    bm.free()
    highlight = link_mesh("Highlight", mesh, mat)

    # A flat disc facing the camera clips into the curved surface; lay it along the surface normal instead.
    bpy.context.view_layer.update()
    evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    forward = (cam.matrix_world.to_quaternion() @ Vector((0, 0, -1))).normalized()
    to_local = body.matrix_world.inverted()
    hit, loc, normal, _ = evaluated.ray_cast(to_local @ (HIGHLIGHT_TARGET - forward * 4.0),
                                             (to_local.to_3x3() @ forward).normalized())
    if not hit:
        raise RuntimeError("highlight ray missed the apple body")
    normal_w = (body.matrix_world.inverted().transposed().to_3x3() @ normal).normalized()
    highlight.location = body.matrix_world @ loc + normal_w * 0.012
    highlight.rotation_euler = normal_w.to_track_quat('Z', 'Y').to_euler()
    highlight.rotation_euler.rotate_axis('Z', math.radians(-38))
    return highlight


def setup_linesets(scene):
    scene.render.use_freestyle = True
    scene.render.line_thickness_mode = 'ABSOLUTE'
    scene.render.line_thickness = 1.0
    view_layer = bpy.context.view_layer
    view_layer.use_freestyle = True
    settings = view_layer.freestyle_settings
    while settings.linesets:
        settings.linesets.remove(settings.linesets[0])

    def lineset(name, edge_types):
        ls = settings.linesets.new(name)
        ls.select_by_visibility = True
        ls.visibility = 'VISIBLE'
        ls.select_by_edge_types = True
        for attr in ("select_silhouette", "select_border", "select_crease",
                     "select_contour", "select_external_contour", "select_edge_mark"):
            setattr(ls, attr, attr in edge_types)
        ls.linestyle.color = (0, 0, 0)
        ls.linestyle.caps = 'ROUND'
        return ls.linestyle

    outline = lineset("Outline", {"select_silhouette", "select_border", "select_crease", "select_contour"})
    outline.thickness = 12.0
    nib = outline.thickness_modifiers.new(name="PenNib", type='CALLIGRAPHY')
    nib.orientation = 45.0
    nib.thickness_min, nib.thickness_max = 9.0, 16.0
    nib.blend = 'MIX'
    nib.influence = 1.0

    veins = lineset("Veins", {"select_edge_mark"})
    veins.thickness = 9.0
    taper = veins.thickness_modifiers.new(name="Taper", type='ALONG_STROKE')
    taper.blend = 'MULTIPLY'
    taper.value_min, taper.value_max = 0.45, 1.0


def render(scene, path):
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    print(f"wrote {path}")


def main():
    args = parse_args()
    profile = json.loads(args.profile.read_text())["profile"]
    args.out_dir.mkdir(parents=True, exist_ok=True)

    scene = reset_scene()
    mat = flat_white_material()
    body = build_body(profile, mat)
    floor_z = profile[0][1] * Z_SCALE
    stem = build_stem(floor_z, mat)
    leaf = build_leaf(mat, (-0.04, 0.05, floor_z + 0.14))
    cam = build_camera(scene)
    highlight = seat_highlight(body, cam, mat)
    setup_linesets(scene)

    render(scene, args.out_dir / "apple-lineart.png")
    if args.silhouette:
        for obj in (stem, leaf, highlight):
            obj.hide_render = True
        render(scene, args.silhouette)
        for obj in (stem, leaf, highlight):
            obj.hide_render = False

    # Shaded form check: line art hides surface problems like lathe banding.
    highlight.hide_render = True
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.render.use_freestyle = False
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'SINGLE'
    scene.display.shading.single_color = (0.8, 0.8, 0.8)
    render(scene, args.out_dir / "apple-shaded.png")


main()
