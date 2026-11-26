"""Per-joint velocity-continuity limits measured from real children.

Contract maya-walk-joint-velocity-limits. Behavioural tests use only names that
exist before the change, so on the base they fail on behaviour; the API tests
import the new names inside each test.
"""
from dataclasses import replace
import json
import math
from pathlib import Path
import tempfile
import unittest
from unittest import mock

from storybook.animation.maya_walk import validate as V
from storybook.animation.maya_walk.spec import BASELINE, TARGET, SceneKind, Side
from storybook.animation.maya_walk.tests.fixtures import SPEC, fixture, tracks, with_track

ROWS = fixture()
TRACKS = tracks()
JOINT_NAMES = ("hip", "knee", "ankle", "foot_pitch")


def report(tracks_by_side, spec=SPEC, rows=ROWS):
    return V.validate_cycle(rows, spec, SceneKind.NATIVE, tracks=tracks_by_side, fps=24., rest_hip_height=.94,
                            scene_sha256="public-analytic-fixture", alias="fixture")


def jumps(result, joint=None):
    return [v for v in result["violations"] if v["rule"] == "angular_velocity_jump" and
            (joint is None or v["channel"] == joint)]


def kink(side, joint, value, vertex):
    """Replace one joint's column by a V-kink measuring exactly ``value`` at ``vertex``.

    With θ = c|t-v| the rule's value at the vertex is .5c/δ = 4c (δ = 1/8 frame);
    the column is linear elsewhere, so no other sample measures anything.
    """
    c = value/4
    grid = TRACKS[side].times()
    return with_track(TRACKS, side, angles={joint: [c*abs(t-vertex) for t in grid]})


class BehaviourTests(unittest.TestCase):
    """Fail first on the base: a real child's knee passes, a jerky hip fails."""

    def test_knee_value_a_child_reaches_passes(self):
        self.assertEqual(jumps(report(kink(Side.NEAR, "knee", 3., 41.)), "knee"), [])

    def test_hip_value_no_child_reaches_fails(self):
        hits = jumps(report(kink(Side.NEAR, "hip", 1.6, 41.)), "hip")
        self.assertEqual({(v["side"], v["frame"]) for v in hits}, {("near", 42.)})

    def test_one_value_follows_each_joints_own_limit(self):
        for joint, fails in (("hip", True), ("knee", False), ("ankle", False), ("foot_pitch", False)):
            with self.subTest(joint=joint):
                self.assertEqual(bool(jumps(report(kink(Side.NEAR, joint, 3., 41.)), joint)), fails)


class LimitOwnerTests(unittest.TestCase):
    def test_limits_are_the_cited_maxima_rounded_up_to_a_hundredth(self):
        from storybook.animation.maya_walk.reference import CHILD_JOINT_ACCELERATION_MAXIMA as M
        from storybook.animation.maya_walk.spec import CHILD_JOINT_LIMITS as L
        self.assertEqual(set(M), set(JOINT_NAMES))
        self.assertEqual({j: L.of(j) for j in JOINT_NAMES}, {"hip": 1.47, "knee": 3.54, "ankle": 4.35, "foot_pitch": 5.06})
        for joint, maximum in M.items():
            with self.subTest(joint=joint):
                self.assertGreaterEqual(L.of(joint), maximum)
                self.assertLess(L.of(joint)-maximum, .01)
                self.assertEqual(L.of(joint), math.ceil(maximum*100)/100)

    def test_owners_carry_the_child_limits(self):
        from storybook.animation.maya_walk.spec import CHILD_JOINT_LIMITS
        for spec in (TARGET, BASELINE, SPEC):
            self.assertIs(spec.velocity_change_per_quarter, CHILD_JOINT_LIMITS)

    def test_closed_joint_set_and_admission(self):
        from storybook.animation.maya_walk.spec import JOINTS, JointLimits
        good = dict(hip=1., knee=2., ankle=3., foot_pitch=4.)
        self.assertEqual({f for f in good}, set(JOINTS))
        limits = JointLimits(**good)
        self.assertEqual([limits.of(j) for j in JOINT_NAMES], [1., 2., 3., 4.])
        for joint in ("toe", "Knee", "", None):
            with self.subTest(lookup=joint), self.assertRaises(ValueError):
                limits.of(joint)
        for bad in (math.nan, math.inf, -math.inf, 0., -1., True, False, "2", None, 2):
            for joint in JOINT_NAMES:
                with self.subTest(joint=joint, value=bad), self.assertRaises(ValueError):
                    JointLimits(**{**good, joint: bad})
        for data in ({k: v for k, v in good.items() if k != "ankle"}, {**good, "toe": 1.}, [], "2.0", None, 2.):
            with self.subTest(data=data), self.assertRaises(ValueError):
                JointLimits.from_dict(data)
        self.assertEqual(JointLimits.from_dict(dict(good)), limits)
        self.assertEqual(JointLimits.uniform(2.), JointLimits(2., 2., 2., 2.))

    def test_spec_reader_migrates_the_legacy_scalar_and_round_trips(self):
        from storybook.animation.maya_walk.spec import GaitSpec, JointLimits
        current = BASELINE.to_dict()
        self.assertEqual(current["velocity_change_per_quarter"], {"hip": 1.47, "knee": 3.54, "ankle": 4.35, "foot_pitch": 5.06})
        self.assertEqual(GaitSpec.from_dict(json.loads(json.dumps(current))), BASELINE)
        legacy = GaitSpec.from_dict({**current, "velocity_change_per_quarter": 2.})
        self.assertEqual(legacy.velocity_change_per_quarter, JointLimits.uniform(2.))
        self.assertEqual(replace(legacy, velocity_change_per_quarter=BASELINE.velocity_change_per_quarter), BASELINE)
        for bad in (math.nan, 0., -2., True, "2.0", None, {"hip": 1.}, {**current["velocity_change_per_quarter"], "toe": 1.}):
            with self.subTest(value=bad), self.assertRaises(ValueError):
                GaitSpec.from_dict({**current, "velocity_change_per_quarter": bad})

    def test_spec_construction_refuses_a_scalar_limit(self):
        with self.assertRaises(ValueError):
            replace(BASELINE, velocity_change_per_quarter=2.)


class BoundaryTests(unittest.TestCase):
    def test_every_joint_both_sides_first_and_last_cycles(self):
        from storybook.animation.maya_walk.spec import CHILD_JOINT_LIMITS
        for joint in JOINT_NAMES:
            limit = CHILD_JOINT_LIMITS.of(joint)
            for side, vertex in ((Side.NEAR, 1.), (Side.FAR, 111.)):
                for factor, rejected in ((1-1e-9, False), (1+1e-9, True)):
                    with self.subTest(joint=joint, side=side, factor=factor):
                        hits = jumps(report(kink(side, joint, limit*factor, vertex)), joint)
                        self.assertEqual(bool(hits), rejected)
                        if rejected:
                            self.assertEqual({(v["side"], v["channel"], v["frame"], v["limit"]) for v in hits},
                                             {(side.value, joint, vertex+1, limit)})

    def test_exactly_the_limit_passes_and_the_next_float_fails(self):
        from storybook.animation.maya_walk.spec import CHILD_JOINT_LIMITS
        real = V.interval_motion
        for joint in JOINT_NAMES:
            limit = CHILD_JOINT_LIMITS.of(joint)
            for value, rejected in ((limit, False), (math.nextafter(limit, math.inf), True)):
                def crafted(*args, value=value, joint=joint):
                    motion = real(*args)
                    motion["acceleration"] = {j: [(t, value if j == joint and i == 5 else 0.) for i, (t, _) in enumerate(v)]
                                              for j, v in motion["acceleration"].items()}
                    return motion
                with self.subTest(joint=joint, value=value), mock.patch.object(V, "interval_motion", crafted):
                    self.assertEqual(bool(jumps(report(TRACKS), joint)), rejected)

    def test_detection_bounds_are_reported_per_joint(self):
        from storybook.animation.maya_walk.spec import CHILD_JOINT_LIMITS
        bounds = V.measurement_resolution(SPEC, .125)
        self.assertEqual(bounds["angle_step_detected_above_degrees"],
                         {j: 8*CHILD_JOINT_LIMITS.of(j)*.125**2 for j in JOINT_NAMES})
        self.assertEqual(bounds["velocity_change_detected_above_degrees_per_frame"],
                         {j: 12*CHILD_JOINT_LIMITS.of(j)*.125 for j in JOINT_NAMES})
        self.assertEqual(report(TRACKS)["cycles"][0]["measurement_resolution"], bounds)


class PolicyGateTests(unittest.TestCase):
    def test_gate_admits_current_and_legacy_and_returns_the_owner(self):
        from storybook.animation.maya_walk.spec import GaitSpec, admitted_policy
        legacy = GaitSpec.from_dict({**TARGET.to_dict(), "velocity_change_per_quarter": 2.})
        self.assertEqual(admitted_policy(TARGET, TARGET), (TARGET, "current"))
        self.assertEqual(admitted_policy(legacy, TARGET), (TARGET, "legacy-uniform-2.0"))

    def test_gate_refuses_unreviewed_limits_and_other_policies(self):
        from storybook.animation.maya_walk.spec import GaitSpec, JointLimits, admitted_policy
        child = TARGET.velocity_change_per_quarter
        legacy = GaitSpec.from_dict({**TARGET.to_dict(), "velocity_change_per_quarter": 2.})
        refused = {
            "uniform 2.5": replace(TARGET, velocity_change_per_quarter=JointLimits.uniform(2.5)),
            "one joint changed": replace(TARGET, velocity_change_per_quarter=replace(child, knee=3.55)),
            "legacy with another clock": replace(legacy, cycle_frames=25.),
            "legacy with another event": replace(legacy, toe_off=.61),
            "current with another name": replace(TARGET, name="other"),
            "baseline for target": BASELINE,
        }
        for label, recorded in refused.items():
            with self.subTest(label), self.assertRaises(ValueError):
                admitted_policy(recorded, TARGET)
        for value in (None, TARGET.to_dict()):
            with self.subTest(value=type(value)), self.assertRaises(ValueError):
                admitted_policy(value, TARGET)


class SavedSceneTests(unittest.TestCase):
    """sample_scene's candidate check: the same gate, on the scene's saved gait_spec JSON."""

    def test_saved_candidate_scene_passes_the_gate(self):
        from storybook.animation.maya_walk.sample_scene import admit_saved_candidate
        current = TARGET.to_dict()
        for limits in (current["velocity_change_per_quarter"], 2.):
            with self.subTest(limits=limits):
                admit_saved_candidate(json.dumps({**current, "velocity_change_per_quarter": limits}, sort_keys=True))
        refused = {"uniform 2.5": {**current, "velocity_change_per_quarter": 2.5},
                   "another event": {**current, "velocity_change_per_quarter": 2., "toe_off": .61},
                   "baseline": BASELINE.to_dict(), "unknown field": {**current, "extra": 1.}}
        for label, saved in refused.items():
            with self.subTest(label), self.assertRaises(ValueError):
                admit_saved_candidate(json.dumps(saved))
        for raw in ("null", "[]", "not json"):
            with self.subTest(raw=raw), self.assertRaises(ValueError):
                admit_saved_candidate(raw)


class AnalyzeTests(unittest.TestCase):
    """End to end through __main__.analyze, from written packet files."""

    @classmethod
    def setUpClass(cls):
        from storybook.animation.maya_walk.__main__ import BASELINES
        # Near leg: knee kink measuring 3.0 (a real child's knee) and hip kink
        # measuring 1.6 (beyond every measured child's hip), both at frame 42.
        grid = TRACKS[Side.NEAR].times()
        cls.tracks = with_track(TRACKS, Side.NEAR, angles={"knee": [3./4*abs(t-41.) for t in grid],
                                                           "hip": [1.6/4*abs(t-41.) for t in grid]})
        cls.rows = [{"time": r.time, "side": r.side.value, "ik_target": r.ik_target,
                     **{k: dict(getattr(r, k)) for k in ("points", "velocity", "angles", "angular_velocity", "upper")}}
                    for r in ROWS]
        cls.base = {"format": "maya-walk-samples-v3", "alias": "native", "scene_sha256": BASELINES["native"][2],
                    "scene_kind": "native", "runtime": {"version": "fixture", "build": "fixture", "factory_process": True,
                                                        "autoexec_disabled": True},
                    "fps": 24, "scene_units_meters": 1., "rest_hip_height": .94, "spec": BASELINE.to_dict(),
                    "time_domain": [0, 128], "validation_domain": [0, 127], "derivative_half_width": 1/128,
                    "point_definition": "public fixture", "actions": [], "samples": cls.rows,
                    "tracks": [t.to_dict() for t in cls.tracks.values()]}

    def analyze(self, packet):
        from storybook.animation.maya_walk.__main__ import analyze
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/"packet.json"
            path.write_text(json.dumps(packet))
            return analyze(path)

    def with_limits(self, limits, spec_change=None):
        spec = {**self.base["spec"], **(spec_change or {}), "velocity_change_per_quarter": limits}
        return {**self.base, "spec": spec}

    def test_legacy_and_current_packets_are_judged_by_the_owner(self):
        current = self.base["spec"]["velocity_change_per_quarter"]
        for limits, form in ((2., "legacy-uniform-2.0"), (current, "current")):
            with self.subTest(form=form):
                _, _, result = self.analyze(self.with_limits(limits))
                self.assertEqual(result["packet_limits"], form)
                near = [v for v in jumps(result) if v["side"] == "near"]
                self.assertEqual({v["channel"] for v in near}, {"hip"})        # knee 3.0 passes, hip 1.6 fails
                self.assertEqual({v["limit"] for v in near}, {1.47})

    def test_candidate_packet_passes_the_same_gate(self):
        for limits in (2., TARGET.to_dict()["velocity_change_per_quarter"]):
            with self.subTest(limits=limits):
                packet = {**self.base, "alias": "candidate", "scene_kind": "painted", "scene_sha256": "ab"*32,
                          "spec": {**TARGET.to_dict(), "velocity_change_per_quarter": limits}}
                self.analyze(packet)

    def test_unreviewed_or_mismatched_packets_are_refused_before_validation(self):
        current = self.base["spec"]["velocity_change_per_quarter"]
        refused = {
            "uniform 2.5": self.with_limits(2.5),
            "one joint changed": self.with_limits({**current, "hip": 1.48}),
            "legacy with another clock": self.with_limits(2., {"cycle_frames": 31.}),
            "candidate with another clock": {**self.base, "alias": "candidate", "scene_kind": "painted",
                                             "scene_sha256": "ab"*32,
                                             "spec": {**TARGET.to_dict(), "velocity_change_per_quarter": 2., "toe_off": .61}},
        }
        for label, packet in refused.items():
            with self.subTest(label), mock.patch("storybook.animation.maya_walk.__main__.validate_cycle") as validate, \
                    self.assertRaises(ValueError):
                self.analyze(packet)
            validate.assert_not_called()


class ObjectiveOwnerTests(unittest.TestCase):
    def test_objective_threshold_is_each_joints_limit_less_the_margin(self):
        from storybook.animation.maya_walk import fitting as F
        x = json.loads((Path(__file__).parent/"frozen-jacobian-stop.json").read_text())["values"]
        space = F.TimingChart(F.PoseChart(floor=0.))
        crafted = {"acceleration": {j: [(0., F.TARGET.velocity_change_per_quarter.of(j)-F.OBJECTIVE_LIMIT_MARGIN+.15)]
                                    for j in JOINT_NAMES},
                   "forward": {}}
        objective = F.Objective(space, 1., 0.)
        with mock.patch.object(F.Objective, "fine_motion", return_value=crafted):
            residuals = list(objective.residuals(x))
        # Each joint sits .15 above its own threshold, so each hinge is exactly w.
        w = math.sqrt(F.FINE_SPACING/.25)
        self.assertEqual(sum(1 for i in range(len(residuals)-3) if all(abs(residuals[i+k]-w) < 1e-12 for k in range(4))), 1)
        self.assertEqual(F.OBJECTIVE_LIMIT_MARGIN, .02)

    def test_changing_the_owner_moves_validator_and_objective_together(self):
        from storybook.animation.maya_walk import fitting as F
        moved = replace(F.TARGET, velocity_change_per_quarter=replace(F.TARGET.velocity_change_per_quarter, knee=10.))
        crafted = {"acceleration": {"knee": [(0., 5.)]}, "forward": {}}
        x = json.loads((Path(__file__).parent/"frozen-jacobian-stop.json").read_text())["values"]
        space = F.TimingChart(F.PoseChart(floor=0.))
        with mock.patch.object(F.Objective, "fine_motion", return_value=crafted):
            before = [v for v in F.Objective(space, 1., 0.).residuals(x)]
            with mock.patch.object(F, "TARGET", moved):
                after = [v for v in F.Objective(space, 1., 0.).residuals(x)]
        w = math.sqrt(F.FINE_SPACING/.25)
        self.assertEqual(sum(abs(a-b) > 1e-12 for a, b in zip(before, after)), 1)
        self.assertIn(w*(5.-(F.TARGET.velocity_change_per_quarter.of("knee")-.02))/.15, before)
        self.assertNotIn("knee", {v["channel"] for v in jumps(report(kink(Side.NEAR, "knee", 5., 41.),
                                                                          spec=replace(SPEC, velocity_change_per_quarter=moved.velocity_change_per_quarter)))})


if __name__ == "__main__":
    unittest.main()
