"""Closed measurement/specification types. Cross-channel rules live in validate."""
from dataclasses import asdict, dataclass, fields
from enum import Enum
import math
from types import MappingProxyType


class Side(str, Enum):
    NEAR = "near"
    FAR = "far"


class Point(str, Enum):
    HIP = "hip"
    KNEE = "knee"
    ANKLE = "ankle"
    HEEL = "heel"
    BALL = "ball"
    TOE = "toe"
    PAINTED_HEEL = "painted_heel"


class SceneKind(str, Enum):
    NATIVE = "native"
    PAINTED = "painted"


class BaselineAlias(str, Enum):
    NATIVE = "native"
    PAINTED = "painted"
    RELEASE = "release"
    CANDIDATE = "candidate"


def finite(value):
    return type(value) in (int, float) and math.isfinite(value)


@dataclass(frozen=True)
class Hold:
    point: Point
    start: float
    end: float
    approach: float

    def __post_init__(self):
        if not isinstance(self.point, Point):
            raise ValueError("Closed point required")
        if not all(finite(v) for v in (self.start, self.end, self.approach)):
            raise ValueError("Finite hold bounds required")
        if not (0 <= self.start < self.end < 1 and 0 < self.approach < 1):
            raise ValueError("Ordered nonwrapping hold and positive approach required")
        if self.point in (Point.HIP, Point.KNEE):
            raise ValueError("Hip and knee may not declare holds")

    def covers(self, start, end):
        # Interval coverage, including endpoints, not a pointwise exemption.
        return self.start - 1e-10 <= start <= end <= self.end + 1e-10


@dataclass(frozen=True)
class GaitSpec:
    name: str
    cycle_frames: float
    foot_flat: float
    heel_off: float
    ball_off: float
    toe_off: float
    expected_cadence: float = 120.
    expected_step_hip_ratio: float = .70
    speed_epsilon: float = .005
    backward_tolerance: float = .0005
    stall_intervals: int = 2
    angular_prominence: float = 1.
    height_prominence: float = .001
    velocity_change_per_quarter: float = 2.
    contact_speed_tolerance: float = .0005
    ground_tolerance: float = .00001
    ratio_tolerance: float = .01
    cadence_tolerance: float = .1
    hold_position_tolerance: float = .00001
    contact_time_tolerance: float = .25
    fps: int = 24

    def __post_init__(self):
        if not isinstance(self.name, str) or not self.name:
            raise ValueError("Named spec required")
        if not (all(finite(getattr(self, f.name)) for f in fields(self)
                    if f.name != "name") and self.cycle_frames > 0):
            raise ValueError("Finite numeric spec fields required")
        if not 0 < self.foot_flat < self.heel_off < self.ball_off < self.toe_off < 1:
            raise ValueError("Strictly ordered foot events required")
        if type(self.fps) is not int or not 1 <= self.fps <= 240:
            raise ValueError("Integral fps between 1 and 240 required")
        if type(self.stall_intervals) is not int or self.stall_intervals < 1:
            raise ValueError("Positive integral stall duration required")
        if not 0 < self.contact_time_tolerance <= .25:
            raise ValueError("Contact matching tolerance must be at most one quarter frame")
        if any(getattr(self, f.name) <= 0 for f in fields(self)
               if f.name not in {"name", "foot_flat", "heel_off", "ball_off", "toe_off"}):
            raise ValueError("Positive measurement limits required")

    def offset(self, side):
        if not isinstance(side, Side):
            raise ValueError("Closed side required")
        return 0. if side is Side.NEAR else self.cycle_frames / 2

    def holds(self, kind):
        holds = (Hold(Point.HEEL, 0., self.heel_off, .08),
                 Hold(Point.BALL, self.foot_flat, self.ball_off, .04),
                 Hold(Point.TOE, self.foot_flat, self.toe_off, .04),
                 Hold(Point.ANKLE, self.foot_flat, self.heel_off, .04))
        # Painted heel is an additional material release probe, not the exact
        # anatomical support point; full-cycle holds use the native landmarks.
        return holds

    def cycles(self, side, start=0., end=127.):
        offset = self.offset(side)
        first = math.ceil((start + offset) / self.cycle_frames)
        last = math.floor((end + offset) / self.cycle_frames)
        return tuple((n, n * self.cycle_frames - offset,
                      (n + 1) * self.cycle_frames - offset)
                     for n in range(first, last))

    def to_dict(self):
        return asdict(self)


BASELINE = GaitSpec("native-painted-release-original-clock", 32., 4/32, 10/32, 17/32, .6)
TARGET = GaitSpec("reference-candidate", 24., .08, .35, .53, .6)
JOINTS = frozenset(("hip", "knee", "ankle", "foot_pitch"))
UPPER = frozenset(("free_arm", "free_forearm", "holding_arm", "holding_forearm", "lantern"))


@dataclass(frozen=True)
class Sample:
    time: float
    side: Side
    points: dict
    velocity: dict
    angles: dict
    angular_velocity: dict
    upper: dict
    ik_target: tuple

    def __post_init__(self):
        if not finite(self.time) or not isinstance(self.side, Side):
            raise ValueError("Finite sample time and closed side required")
        if not isinstance(self.ik_target, (list, tuple)) or len(self.ik_target) != 3 or not all(finite(v) for v in self.ik_target):
            raise ValueError("Finite measured IK target vector required")
        object.__setattr__(self, "ik_target", tuple(self.ik_target))
        required = {p.value for p in Point if p is not Point.PAINTED_HEEL}
        keys = set(self.points)
        if keys not in (required, required | {Point.PAINTED_HEEL.value}):
            raise ValueError("Complete closed point inventory required")
        if set(self.velocity) != keys:
            raise ValueError("Velocity inventory differs from points")
        for mapping in (self.points, self.velocity):
            if any(not isinstance(v, (tuple, list)) or len(v) != 3 or
                   not all(finite(x) for x in v) for v in mapping.values()):
                raise ValueError("Finite 3D points and velocities required")
        for mapping in (self.angles, self.angular_velocity):
            if set(mapping) != JOINTS or not all(finite(v) for v in mapping.values()):
                raise ValueError("Complete finite closed joint inventory required")
        if set(self.upper) not in (set(), UPPER) or not all(finite(v) for v in self.upper.values()):
            raise ValueError("Complete finite upper inventory or native-only sample required")
        for field in ("points", "velocity"):
            object.__setattr__(self, field, MappingProxyType({k: tuple(v) for k, v in getattr(self, field).items()}))
        for field in ("angles", "angular_velocity", "upper"):
            object.__setattr__(self, field, MappingProxyType(dict(getattr(self, field))))

    @classmethod
    def from_dict(cls, data):
        if type(data) is not dict or set(data) != {f.name for f in fields(cls)}:
            raise ValueError("Unknown or missing sample fields")
        return cls(**{**data, "side": Side(data["side"])})


# Fine interval-measurement grid (contract maya-walk-interval-measurement,
# Amendment 1). 1/8 frame is the finest spacing at which pinned-Blender
# evaluation noise stays under 10% of the acceleration limit near extension.
FINE_SPACING = 1/8
PROGRESSION_POINTS = ("hip", "knee", "ankle", "toe")


@dataclass(frozen=True)
class MotionTrack:
    """Uniform fine track of one side's joint angles and progression-point X.

    Times are ``start + i*spacing``; a uniform grid cannot hold gaps. The two
    interval rules read only this track, never the pointwise observations.
    """
    side: Side
    start: float
    spacing: float
    angles: dict
    progress_x: dict

    def __post_init__(self):
        if not isinstance(self.side, Side):
            raise ValueError("Closed side required")
        if not finite(self.start) or type(self.spacing) is not float or self.spacing != FINE_SPACING:
            raise ValueError("Finite start and the qualified fine spacing required")
        if (not isinstance(self.angles, (dict, MappingProxyType)) or set(self.angles) != JOINTS or
                not isinstance(self.progress_x, (dict, MappingProxyType)) or set(self.progress_x) != set(PROGRESSION_POINTS)):
            raise ValueError("Closed joint and progression-point inventory required")
        columns = (*self.angles.values(), *self.progress_x.values())
        if any(not isinstance(c, (list, tuple)) for c in columns):
            raise ValueError("Sequence columns required")
        counts = {len(c) for c in columns}
        if len(counts) != 1 or counts.pop() < 3:
            raise ValueError("Equal columns of at least three samples required")
        if not all(finite(v) for c in columns for v in c):
            raise ValueError("Finite track values required")
        object.__setattr__(self, "angles", MappingProxyType({k: tuple(v) for k, v in self.angles.items()}))
        object.__setattr__(self, "progress_x", MappingProxyType({k: tuple(v) for k, v in self.progress_x.items()}))

    @property
    def count(self):
        return len(self.angles["knee"])

    def times(self):
        return tuple(self.start+i*self.spacing for i in range(self.count))

    def to_dict(self):
        return {"side": self.side.value, "start": self.start, "spacing": self.spacing,
                "angles": {k: list(v) for k, v in self.angles.items()},
                "progress_x": {k: list(v) for k, v in self.progress_x.items()}}

    @classmethod
    def from_dict(cls, data):
        if type(data) is not dict or set(data) != {f.name for f in fields(cls)}:
            raise ValueError("Unknown or missing track fields")
        return cls(**{**data, "side": Side(data["side"])})


@dataclass(frozen=True)
class Runtime:
    version: str
    build: str
    factory_process: bool
    autoexec_disabled: bool

    def __post_init__(self):
        if not all(isinstance(v, str) and v for v in (self.version, self.build)):
            raise ValueError("Runtime identity required")
        if self.factory_process is not True or self.autoexec_disabled is not True:
            raise ValueError("Fresh factory process and disabled autoexec required")


@dataclass(frozen=True)
class SamplePacket:
    format: str
    alias: BaselineAlias
    scene_sha256: str
    scene_kind: SceneKind
    runtime: Runtime
    fps: float
    scene_units_meters: float
    rest_hip_height: float
    spec: GaitSpec
    time_domain: tuple
    validation_domain: tuple
    derivative_half_width: float
    point_definition: str
    actions: tuple
    samples: tuple[Sample, ...]
    tracks: tuple[MotionTrack, ...]

    def __post_init__(self):
        if self.format != "maya-walk-samples-v3" or not isinstance(self.alias, BaselineAlias):
            raise ValueError("Closed baseline alias and sample format required")
        if not isinstance(self.scene_kind, SceneKind) or not isinstance(self.runtime, Runtime):
            raise ValueError("Typed scene kind and runtime required")
        if not isinstance(self.scene_sha256, str) or len(self.scene_sha256) != 64 or len(bytes.fromhex(self.scene_sha256)) != 32:
            raise ValueError("SHA256 required")
        if not all(finite(v) and v > 0 for v in (self.fps, self.rest_hip_height, self.scene_units_meters, self.derivative_half_width)):
            raise ValueError("Positive finite measurement metadata required")
        if self.scene_units_meters != 1. or self.derivative_half_width != 1/128:
            raise ValueError("Unqualified spatial units or derivative spacing")
        if self.time_domain != (0, 128) or self.validation_domain != (0, 127):
            raise ValueError("Incorrect required measurement domain")
        if not isinstance(self.spec, GaitSpec) or not all(isinstance(r, Sample) for r in self.samples):
            raise ValueError("Typed source specification and sample records required")
        if any(not self.time_domain[0] <= r.time <= self.time_domain[1] for r in self.samples):
            raise ValueError("Sample outside declared domain")
        # One fine track per side, covering the whole domain plus one step on
        # each side so every in-domain grid time has a centred measurement.
        if (not isinstance(self.tracks, tuple) or not all(isinstance(t, MotionTrack) for t in self.tracks) or
                sorted(t.side.value for t in self.tracks) != sorted(s.value for s in Side)):
            raise ValueError("Exactly one typed fine track per side required")
        span = self.time_domain[1]-self.time_domain[0]
        if any(t.start != self.time_domain[0]-t.spacing or t.count != round(span/t.spacing)+3 for t in self.tracks):
            raise ValueError("Fine track must cover the domain plus one step at each end")

    def track_map(self):
        return {t.side: t for t in self.tracks}

    @classmethod
    def from_dict(cls, data):
        if type(data) is not dict or set(data) != {f.name for f in fields(cls)}:
            raise ValueError("Unknown or missing packet fields")
        return cls(**{**data, "alias": BaselineAlias(data["alias"]), "scene_kind": SceneKind(data["scene_kind"]),
                      "runtime": Runtime(**data["runtime"]), "spec": GaitSpec(**data["spec"]),
                      "time_domain": tuple(data["time_domain"]), "validation_domain": tuple(data["validation_domain"]),
                      "actions": tuple(data["actions"]), "samples": tuple(Sample.from_dict(r) for r in data["samples"]),
                      "tracks": tuple(MotionTrack.from_dict(t) for t in data["tracks"])})


# Single inventory shared by legacy parity and authored motion.
UPPER_BONES = ("root", "body", "head", "hem_left", "hem_right", "holding_shoulder",
               "holding_arm", "holding_forearm", "lantern", "free_shoulder", "free_arm", "free_forearm")
CHANNELS = frozenset(
    [("CTRL_Hips", "location", i) for i in (0, 2)] +
    [("Camera_"+view, "location", 0) for view in ("Side", "ThreeQuarter")] +
    [("CTRL_Foot_"+side, "location", i) for side in ("near", "far") for i in (0, 2)] +
    [("CTRL_"+control+"_"+side, "rotation_euler", 1)
     for side in ("near", "far") for control in ("Heel", "BallRoll", "ToePivot")] +
    [("MAYA_PAINTED_UPPER_RIG", f'pose.bones["{bone}"].{prop}', i)
     for bone in UPPER_BONES for prop, size in (("location", 3), ("rotation_quaternion", 4), ("scale", 3))
     for i in range(size)])

# Fixed proportions of the pinned native rig, shared by authoring and checks.
THIGH_LENGTH = .39
SHIN_LENGTH = .36
REACH_TOLERANCE = 1e-6
