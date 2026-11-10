"""The single action serialization owner. Blender imports stay local."""
from .legacy import CHANNELS, LegacyFixture, SerializedCurve


def owned_curves(bpy):
    """Fail closed on extra action layers, unused actions, NLA and drivers."""
    assigned = set()
    result = []
    for obj in bpy.data.objects:
        data = obj.animation_data
        if not data:
            continue
        if data.drivers or data.nla_tracks:
            raise ValueError(f"Unowned NLA/driver animation on {obj.name}")
        action = data.action
        if action is None:
            continue
        if action.name in assigned or len(action.slots) != 1 or len(action.layers) != 1:
            raise ValueError("One owned object/slot/layer per action required")
        assigned.add(action.name)
        layer = action.layers[0]
        if len(layer.strips) != 1 or layer.strips[0].type != "KEYFRAME" or len(layer.strips[0].channelbags) != 1:
            raise ValueError("One keyframe strip/channelbag required")
        for curve in layer.strips[0].channelbags[0].fcurves:
            key = (obj.name, curve.data_path, curve.array_index)
            if key not in CHANNELS or curve.modifiers or curve.mute or curve.extrapolation != "CONSTANT":
                raise ValueError(f"Unsupported animated channel state: {key}")
            result.append((obj, curve))
    if assigned != {a.name for a in bpy.data.actions}:
        raise ValueError("Unused or unowned action datablock")
    actual = [(obj.name, c.data_path, c.array_index) for obj, c in result]
    if set(actual) != CHANNELS or len(actual) != len(CHANNELS):
        raise ValueError("Animated channel inventory differs from the owned model")
    # Animation outside object actions is not silently retained by a rebuild.
    for collection in (bpy.data.scenes, bpy.data.materials, bpy.data.cameras, bpy.data.lights,
                       bpy.data.meshes, bpy.data.armatures, bpy.data.worlds, bpy.data.shape_keys,
                       bpy.data.node_groups):
        for block in collection:
            for candidate in (block, getattr(block, "node_tree", None)):
                data = getattr(candidate, "animation_data", None)
                if data and (data.action or data.nla_tracks or data.drivers):
                    raise ValueError(f"Unowned non-object animation: {block.name}")
    return sorted(result, key=lambda item: (item[0].name, item[1].data_path, item[1].array_index))


def _replace_actions(bpy, curves):
    """Internal serializer; public entry points enforce their source model."""
    if not all(isinstance(c, SerializedCurve) for c in curves):
        raise TypeError("Validated serialization records required")
    existing = owned_curves(bpy)
    for name in {o.name for o, _ in existing}:
        bpy.data.objects[name].animation_data_clear()
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)
    for record in curves:
        obj = bpy.data.objects[record.owner]
        # Let Blender create its own slot/layer/channelbag using its structured
        # key insertion API; no dependence on private action layout APIs.
        obj.keyframe_insert(record.path, index=record.index, frame=record.keys[0][0])
        curve = next(c for layer in obj.animation_data.action.layers for strip in layer.strips
                     for bag in strip.channelbags for c in bag.fcurves
                     if c.data_path == record.path and c.array_index == record.index)
        curve.keyframe_points.clear()
        curve.keyframe_points.add(len(record.keys))
        for point, key in zip(curve.keyframe_points, record.keys):
            point.co = key[:2]
            point.interpolation = record.interpolation.value
            point.handle_left_type = record.handle.value
            point.handle_right_type = record.handle.value
            point.handle_left = key[2:4]
            point.handle_right = key[4:6]
        curve.extrapolation = "CONSTANT"
        curve.update()
    owned_curves(bpy)


def replay_legacy(bpy, fixture):
    if not isinstance(fixture, LegacyFixture):
        raise TypeError("A separately typed lossless historical fixture is required")
    _replace_actions(bpy, fixture.curves)


def serialize_motion(motion):
    """Expand validated cycle keys; no resampling or extra fitted keys."""
    import math
    from .curves import Motion
    from .legacy import Interpolation, Handle
    if type(motion) is not Motion:
        raise TypeError('Spec-bound sparse Motion required')
    result=[]
    duration=motion.spec.cycle_frames
    for curve in motion.curves:
        # Rechecking the cap here keeps the writer admission explicit.
        if len(curve.keys)>12:
            raise ValueError('Writer refuses more than 12 keys per channel per cycle')
        owner,path,index=curve.rule.channel
        offset=.5 if owner.endswith('_far') else 0.
        rows=[]
        for n in range(-2,math.ceil(128/duration)+3):
            for key,slope in zip(curve.keys,curve.slopes):
                rows.append(((n+key.phase-offset)*duration+1,
                             key.value+(n-offset)*curve.rule.translation,slope/duration))
        keys=[]
        for i,(t,v,m) in enumerate(rows):
            dl=(t-rows[i-1][0])/3 if i else duration/3
            dr=(rows[i+1][0]-t)/3 if i+1<len(rows) else duration/3
            keys.append((t,v,t-dl,v-m*dl,t+dr,v+m*dr))
        result.append(SerializedCurve(owner,path,index,Interpolation.BEZIER,Handle.FREE,tuple(keys)))
    return tuple(result)


class InvalidMotion(ValueError):
    """An authored source failed the shared whole-cycle rules before writing."""
    def __init__(self, report):
        self.report = report
        super().__init__('Source motion fails whole-cycle admission: '+str(report['violation_counts']))


def write_motion(bpy, motion):
    from .kinematics import NativeGeometry
    report = NativeGeometry(motion).assess()
    if report['status'] != 'PASS':
        raise InvalidMotion(report)
    _replace_actions(bpy,serialize_motion(motion))
    return report
