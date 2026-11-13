"""Fine-interval measurement: the shared owner, its validator rules and objective.

Contract maya-walk-interval-measurement (Amendment 1): both interval rules read a
uniform 1/8-frame track instead of pointwise observation velocities.
"""
import json
import math
from pathlib import Path
import unittest

from storybook.animation.maya_walk.sample_scene import fine_times, times
from storybook.animation.maya_walk.spec import FINE_SPACING, SceneKind, Side
from storybook.animation.maya_walk.validate import (TrackCoverageError, interval_motion,
                                                    measurement_resolution, validate_cycle)
from storybook.animation.maya_walk.tests.fixtures import SPEC, fixture, tracks, with_track

ROWS = fixture()
TRACKS = tracks()
D = FINE_SPACING


def report(tracks_by_side, rows=ROWS):
    return validate_cycle(rows, SPEC, SceneKind.NATIVE, tracks=tracks_by_side, fps=24., rest_hip_height=.94,
                          scene_sha256="public-analytic-fixture", alias="fixture")


def violations(result, rule, channel=None, side=None):
    return [v for v in result["violations"] if v["rule"] == rule and
            (channel is None or v["channel"] == channel) and (side is None or v["side"] == side.value)]


def add_angle(side, joint, offset):
    """Tracks with ``offset(t)`` added to one side's joint column."""
    old = TRACKS[side]
    return with_track(TRACKS, side, angles={joint: [v+offset(t) for t, v in zip(old.times(), old.angles[joint])]})


def backward_step(side, point, interval_start, velocity):
    """Tracks whose one interval starting at ``interval_start`` moves at ``velocity``.

    Every later value shifts by the same amount, so no other interval changes.
    """
    old = TRACKS[side]
    xs = list(old.progress_x[point]); grid = old.times()
    k = next(i for i, t in enumerate(grid) if abs(t-interval_start) < 1e-12)
    shift = (xs[k]+velocity*D)-xs[k+1]
    xs = xs[:k+1]+[x+shift for x in xs[k+1:]]
    return with_track(TRACKS, side, progress_x={point: xs})


class SharedOwnerTests(unittest.TestCase):
    def grid_series(self, f, start=-1., end=1.):
        grid = fine_times(start, end)
        return grid, {"knee": [f(t) for t in grid]}, {"hip": [t for t in grid]}

    def worst(self, f, start=-1., end=1.):
        grid, angles, xs = self.grid_series(f, start, end)
        motion = interval_motion(grid, angles, xs, SPEC, start, end, D)
        return max(j for _, j in motion["acceleration"]["knee"])

    def test_definition_is_the_exact_wrapped_second_difference(self):
        # A V-kink of slope c gives exactly .5*c/δ at its vertex, nothing else.
        grid, angles, xs = self.grid_series(lambda t: .5*abs(t))
        values = dict(interval_motion(grid, angles, xs, SPEC, -1., 1., D)["acceleration"]["knee"])
        self.assertEqual(values[0.], 2.)
        self.assertTrue(all(v == 0. for t, v in values.items() if t != 0.))
        # Wrapping: a smooth path through ±180 is not a 360-degree jump.
        wrapped = self.worst(lambda t: (179.9+.1*t+180) % 360-180)
        self.assertLess(wrapped, 1e-6)

    def test_step_bound_is_exact_at_the_worst_grid_offset(self):
        width = 1e-6
        def ramp(size, centre):
            return lambda t: size*min(1., max(0., (t-centre+width/2)/width))
        bound = measurement_resolution(SPEC, D)["angle_step_detected_above_degrees"]
        self.assertEqual(bound, .25)
        self.assertLess(self.worst(ramp(bound*.96, 0.)), 2.)          # centred: two half steps
        for k in range(17):                                           # every offset in one interval
            with self.subTest(offset=k):
                self.assertGreater(self.worst(ramp(bound*1.04, k/16*D)), 2.)

    def test_concentrated_velocity_change_bound_holds_at_every_offset_and_width(self):
        bound = measurement_resolution(SPEC, D)["velocity_change_detected_above_degrees_per_frame"]
        self.assertEqual(bound, 3.)
        def velocity_ramp(change, start, width):
            def f(t):
                u = t-start
                return 0. if u <= 0 else change*u*u/(2*width) if u < width else change*(u-width/2)
            return f
        for width in (1e-6, D/2, D):
            for k in range(17):
                with self.subTest(width=width, offset=k):
                    self.assertGreater(self.worst(velocity_ramp(bound*1.001, k/16*D, width)), 2.)

    def test_forward_velocity_is_the_exact_interval_average_with_applicability(self):
        grid = fine_times(0., 32.)
        motion = interval_motion(grid, {"knee": [0.]*len(grid)},
                                 {"hip": [2*t for t in grid], "ankle": [t for t in grid]}, SPEC, 0., 32., D)
        self.assertTrue(all(v == 2. for _, _, v, applies in motion["forward"]["hip"] if applies))
        ankle = {t0: applies for t0, _, _, applies in motion["forward"]["ankle"]}
        self.assertFalse(ankle[19.125])     # phase .5977, before toe-off .6
        self.assertTrue(ankle[19.25])       # first interval starting after toe-off
        self.assertEqual(len(motion["forward"]["hip"]), 256)
        self.assertEqual(len(motion["acceleration"]["knee"]), 257)

    def test_window_off_grid_or_without_margin_refuses(self):
        grid = fine_times(0., 32.)
        cols = ({"knee": [0.]*len(grid)}, {"hip": list(grid)})
        for start, end in ((-D, 32.), (0., 32.+D), (.0625, 32.), (0., 0.), (40., 48.)):
            with self.subTest(window=(start, end)), self.assertRaises(TrackCoverageError):
                interval_motion(grid, *cols, SPEC, start, end, D)


class ValidatorIntervalTests(unittest.TestCase):
    def test_hidden_spike_between_observations_fails_only_through_the_track(self):
        # Observation rows are untouched, so the old pointwise rule (which only
        # had these rows) would pass. 40.125 is not an observation time.
        self.assertNotIn(40.125, {round(t, 9) for t in times(SPEC)})
        self.assertEqual(report(TRACKS)["status"], "PASS")
        result = report(add_angle(Side.NEAR, "knee", lambda t: 3. if t == 40.125 else 0.))
        hits = violations(result, "angular_velocity_jump", "knee", Side.NEAR)
        self.assertTrue(any(v["frame"] == 41.125 and v["value"]["interval_frames"] == [41., 41.25] for v in hits), hits[:3])
        self.assertEqual(set(result["violation_counts"]), {"angular_velocity_jump"})

    def test_acceleration_limit_boundary_both_sides_first_and_last_cycles(self):
        for side, vertex in ((Side.NEAR, 1.), (Side.FAR, 111.)):
            for c, rejected in ((.5, False), (.5*(1+1e-9), True)):
                with self.subTest(side=side, slope=c):
                    result = report(add_angle(side, "foot_pitch", lambda t, c=c, vertex=vertex: c*abs(t-vertex)))
                    hits = violations(result, "angular_velocity_jump")
                    self.assertEqual(bool(hits), rejected)
                    if rejected:
                        self.assertEqual({(v["side"], v["channel"], v["frame"]) for v in hits},
                                         {(side.value, "foot_pitch", vertex+1)})

    def test_seam_spike_is_centred_and_reported_in_both_adjacent_cycles(self):
        result = report(add_angle(Side.NEAR, "hip", lambda t: 5. if t == 32. else 0.))
        hits = violations(result, "angular_velocity_jump", "hip", Side.NEAR)
        self.assertEqual({v["cycle"] for v in hits if v["frame"] == 33.}, {0, 1})

    def test_backward_tolerance_boundary_and_toe_off_applicability(self):
        tol = SPEC.backward_tolerance
        for v, rejected in ((-tol*(1-1e-6), False), (-tol*(1+1e-6), True)):
            with self.subTest(velocity=v):
                hits = violations(report(backward_step(Side.FAR, "hip", 50., v)), "point_backward", "hip")
                self.assertEqual(bool(hits), rejected)
                if rejected:
                    self.assertEqual(hits[0]["value"]["interval_frames"], [51., 51.125])
        # Near ankle: stance interval before toe-off is exempt, swing is not.
        self.assertFalse(violations(report(backward_step(Side.NEAR, "ankle", 19.125, -.01)), "point_backward"))
        self.assertTrue(violations(report(backward_step(Side.NEAR, "ankle", 19.25, -.01)), "point_backward", "ankle"))

    def test_track_short_of_a_cycle_fails_closed(self):
        old = TRACKS[Side.FAR]
        keep = len(fine_times(0, 64))
        from storybook.animation.maya_walk.spec import MotionTrack
        short = {**TRACKS, Side.FAR: MotionTrack(Side.FAR, old.start, old.spacing,
                                                 {k: v[:keep] for k, v in old.angles.items()},
                                                 {k: v[:keep] for k, v in old.progress_x.items()})}
        result = report(short)
        missing = [v for v in result["violations"] if v["rule"] == "missing_sample" and v["channel"] == "fine_track"]
        self.assertEqual({(v["side"], v["cycle"]) for v in missing}, {("far", 2), ("far", 3)})
        self.assertEqual(result["status"], "FAIL")

    def test_tracks_are_required_and_closed(self):
        for bad in (None, {}, {Side.NEAR: TRACKS[Side.NEAR]}, {Side.NEAR: TRACKS[Side.FAR], Side.FAR: TRACKS[Side.NEAR]},
                    {Side.NEAR: TRACKS[Side.NEAR], Side.FAR: "track"}, list(TRACKS.values())):
            with self.subTest(bad=type(bad).__name__), self.assertRaises(ValueError):
                report(bad)
        with self.assertRaises(TypeError):
            validate_cycle(ROWS, SPEC, SceneKind.NATIVE, fps=24., rest_hip_height=.94,
                           scene_sha256="public-analytic-fixture", alias="fixture")

    def test_reported_maximum_is_the_maximum_of_every_cycle_window(self):
        result = report(add_angle(Side.FAR, "knee", lambda t: 1. if t == 70. else 0.))
        tracks_by_side = add_angle(Side.FAR, "knee", lambda t: 1. if t == 70. else 0.)
        for cycle in result["cycles"]:
            side = Side(cycle["side"]); start, end = (f-1 for f in cycle["frames"])
            track = tracks_by_side[side]
            motion = interval_motion(track.times(), track.angles, track.progress_x, SPEC, start, end, D)
            with self.subTest(side=side, cycle=cycle["cycle"]):
                self.assertEqual(cycle["joint_maximum_velocity_change"],
                                 {j: max(v for _, v in values) for j, values in motion["acceleration"].items()})

    def test_report_states_measurement_resolution(self):
        cycle = report(TRACKS)["cycles"][0]
        self.assertEqual(cycle["measurement_resolution"],
                         {"spacing_frames": .125, "angle_step_detected_above_degrees": .25,
                          "velocity_change_detected_above_degrees_per_frame": 3.,
                          "backward_displacement_detected_above_units": .0005*.125})


class FrozenFitTests(unittest.TestCase):
    """The third fit's heel-strike pop: recorded 2.0486 by the old pointwise rule."""

    @classmethod
    def setUpClass(cls):
        from storybook.animation.maya_walk.fitting import Objective, PoseChart, TimingChart
        from storybook.animation.maya_walk.kinematics import NativeGeometry
        cls.x = json.loads((Path(__file__).parent/"frozen-jacobian-stop.json").read_text())["values"]
        cls.space = TimingChart(PoseChart())
        cls.model = NativeGeometry(cls.space.build(cls.x))
        cls.report = cls.model.assess()
        cls.Objective = Objective

    def test_heel_strike_pop_fails_on_the_fine_track(self):
        hits = {v["frame"]: v["value"]["degrees_per_frame_per_quarter"]
                for v in violations(self.report, "angular_velocity_jump", "knee", Side.NEAR) if v["cycle"] == 0}
        self.assertGreater(hits[25.], 40.)
        near = next(c for c in self.report["cycles"] if c["side"] == "near" and c["cycle"] == 0)
        self.assertGreater(near["joint_maximum_velocity_change"]["knee"], 45.)

    def test_objective_and_validator_measure_identically(self):
        objective = self.Objective(self.space, 1., 0.)
        fine = objective.fine_motion(self.model)
        track = self.model.tracks()[Side.NEAR]
        shared = interval_motion(track.times(), track.angles, track.progress_x, self.model.motion.spec, 0., 24., D)
        self.assertEqual(fine, shared)

    def test_both_fine_families_enter_the_residuals_as_one_weighted_block(self):
        from unittest import mock
        w = math.sqrt(D/.25)
        crafted = {"acceleration": {"knee": [(0., 1.98+.15*k) for k in (1, 2, 3)], "hip": [(0., 1.)]},
                   "forward": {"hip": [(0., D, -.0019, True), (D, 2*D, -.0019, False)], "toe": [(0., D, .5, True)]}}
        objective = self.Objective(self.space, .5, 0.)
        with mock.patch.object(self.Objective, "fine_motion", return_value=crafted):
            residuals = list(objective.residuals(self.x))
        block = [.5*w*k for k in (1, 2, 3)]+[0.]+[w*1., 0., 0.]
        starts = [i for i in range(len(residuals)-len(block)+1)
                  if all(abs(residuals[i+j]-v) < 1e-12 for j, v in enumerate(block))]
        self.assertEqual(len(starts), 1, "fine families must appear once, in order, with their weights")

    def test_native_tracks_cover_the_whole_scene_domain(self):
        for track in self.model.tracks().values():
            self.assertEqual((track.start, track.count, track.times()[-1]), (-D, 1027, 128+D))
        self.assertFalse([v for v in self.report["violations"] if v["rule"] == "missing_sample"])
        self.assertEqual(self.report["coverage"]["complete_cycles"], self.report["coverage"]["expected_cycles"])

    def test_native_tracks_follow_each_side_geometry(self):
        tracks_by_side = self.model.tracks()
        for side in Side:
            track = tracks_by_side[side]
            for i in (0, 77, track.count-1):
                t = track.times()[i]
                points, angles, _ = self.model.at(t, side)
                with self.subTest(side=side, time=t):
                    self.assertEqual(track.angles["knee"][i], angles["knee"])
                    self.assertEqual(track.progress_x["ankle"][i], points["ankle"][0])
        self.assertNotEqual(tracks_by_side[Side.NEAR].angles["knee"], tracks_by_side[Side.FAR].angles["knee"])

    def test_acceleration_family_is_exactly_the_weighted_hinge(self):
        heavy, light = (self.Objective(self.space, w, 0.) for w in (1., 0.))
        (s1, _), (s0, _) = heavy.score(self.x), light.score(self.x)
        motion = heavy.fine_motion(self.model)
        expected = sum((math.sqrt(D/.25)*max(0., j-1.98)/.15)**2
                       for values in motion["acceleration"].values() for _, j in values)
        self.assertAlmostEqual((s1-s0)/expected, 1., places=9)


if __name__ == "__main__":
    unittest.main()
