from dataclasses import replace
import math
import unittest

from storybook.animation.maya_walk.reference import Kind
from storybook.animation.maya_walk.spec import BASELINE, Hold, Point, SceneKind, Side
from storybook.animation.maya_walk.validate import extrema, validate_cycle
from storybook.animation.maya_walk.tests.fixtures import SPEC, fixture


def report(rows, spec=SPEC):
    return validate_cycle(rows, spec, SceneKind.NATIVE, fps=24., rest_hip_height=.94,
                          scene_sha256="public-analytic-fixture", alias="fixture")


class ExtremaTests(unittest.TestCase):
    def test_periodic_seam_and_plateau_count_once(self):
        phases = [i/8 for i in range(8)]
        peaks = extrema(phases, [0, 0, 1, 2, 2, 1, 0, 0], .5)
        self.assertEqual([p.kind for p in peaks].count(Kind.MAXIMUM), 1)
        self.assertEqual([p.kind for p in peaks].count(Kind.MINIMUM), 1)
        self.assertAlmostEqual(next(p.phase for p in peaks if p.kind is Kind.MINIMUM), .9375)

    def test_prominence_both_sides_and_exact_threshold(self):
        phases = [i/8 for i in range(8)]
        values = [0, 2, 1.1, 2, 0, -2, -1, -2]
        self.assertFalse(any(abs(p.phase-.25) < 1e-9 for p in extrema(phases, values, 1.)))
        self.assertTrue(any(abs(p.phase-.75) < 1e-9 for p in extrema(phases, values, 1.)))
        self.assertEqual(extrema(phases, [2]*8, 1.), [])

    def test_nonperiodic_swing_dip_does_not_join_endpoints(self):
        peaks = extrema([.61, .7, .8, .9, .99], [0, .08, .02, .06, .04], .001, False)
        self.assertEqual([(p.phase, p.kind) for p in peaks],
                         [(.7, Kind.MAXIMUM), (.8, Kind.MINIMUM), (.9, Kind.MAXIMUM)])

    def test_invalid_series_fail_closed(self):
        for phases, values, prominence in [([], [], 1.), ([0, .2, .1], [1, 2, 3], 1.),
                                           ([0, .1, .2], [1, math.nan, 2], 1.),
                                           ([0, .1, .2], [1, 2, 1], 0)]:
            with self.subTest(phases=phases, prominence=prominence), self.assertRaises(ValueError):
                extrema(phases, values, prominence)


class SpecTests(unittest.TestCase):
    def test_falsy_nonfinite_and_wrong_types_cannot_defeat_limits(self):
        for key in ("cycle_frames", "speed_epsilon", "stall_intervals", "expected_cadence"):
            for value in (0, "", False, -1, math.inf, math.nan):
                with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                    replace(BASELINE, **{key: value})

    def test_events_and_hold_inventory_closed(self):
        with self.assertRaises(ValueError):
            replace(BASELINE, toe_off=.2)
        with self.assertRaises(ValueError):
            Hold(Point.KNEE, 0, .5, .1)
        hold = Hold(Point.TOE, .1, .6, .1)
        self.assertTrue(hold.covers(.1, .6))
        self.assertFalse(hold.covers(.59, .61))
        self.assertFalse(hold.covers(.09, .11))

    def test_all_complete_cycles_both_legs(self):
        self.assertEqual(BASELINE.cycles(Side.NEAR), ((0, 0., 32.), (1, 32., 64.), (2, 64., 96.)))
        self.assertEqual(BASELINE.cycles(Side.FAR), ((1, 16., 48.), (2, 48., 80.), (3, 80., 112.)))


class WholeCycleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = fixture()

    def test_positive_measurement_fixture_passes_every_rule(self):
        result = report(self.rows)
        self.assertEqual(result["status"], "PASS", result["violations"][:5])
        self.assertEqual(result["coverage"]["complete_cycles"], 6)

    def test_constant_pelvis_is_missing_motion_not_success(self):
        rows = [replace(r, points={**r.points, "hip": (r.points["hip"][0], 0., .94)}) for r in self.rows]
        self.assertIn("missing_amplitude", report(rows)["violation_counts"])

    def test_reinsert_knee_reextension_fails_signature(self):
        def mutate(r):
            p = ((r.time+SPEC.offset(r.side))/SPEC.cycle_frames) % 1
            # Additional flex/extend beat in otherwise increasing initial swing.
            value = r.angles["knee"] + (20*math.sin(math.pi*(p-.50)/.08) if .50 < p < .58 else 0)
            return replace(r, angles={**r.angles, "knee": value})
        result = report([mutate(r) for r in self.rows])
        self.assertIn("extrema_count", result["violation_counts"])

    def test_release_stop_detected_both_legs_every_cycle(self):
        rows = [replace(r, velocity={**r.velocity, "ankle": (0., 0., 0.)}) if
                abs(((r.time+SPEC.offset(r.side))/32) % 1-.6) < 1e-8 else r for r in self.rows]
        failures = [v for v in report(rows)["violations"] if v["rule"] == "release_stall" and v["channel"] == "ankle"]
        self.assertEqual(len(failures), 6)
        self.assertEqual({v["side"] for v in failures}, {"near", "far"})

    def test_swing_stall_and_backward_hip_fail(self):
        rows = [replace(r, points={**r.points, "ankle": (.7, 0., .25), "hip": (-r.time, 0., r.points["hip"][2])})
                if 24 <= r.time <= 26 else r for r in self.rows]
        rules = report(rows)["violation_counts"]
        self.assertIn("point_stall", rules)
        self.assertIn("point_backward", rules)

    def test_stall_across_cycle_seam_is_not_split_into_passes(self):
        rows = [replace(r, points={**r.points, "knee": (1., 0., .5)})
                if r.side is Side.NEAR and 31.75 <= r.time <= 32.25 else r for r in self.rows]
        failures = [v for v in report(rows)["violations"] if v["rule"] == "point_stall" and v["channel"] == "knee"]
        self.assertTrue(any(v["frame"] == 32.75 for v in failures), failures)

    def test_declared_hold_does_not_hide_sliding(self):
        rows = [replace(r, points={**r.points, "toe": (r.points["toe"][0]+.01*r.time, 0., 0.)})
                if 8 <= r.time <= 10 else r for r in self.rows]
        self.assertIn("hold_slip", report(rows)["violation_counts"])

    def test_missing_samples_leg_and_empty_never_pass(self):
        for rows in ([], self.rows[2:], [r for r in self.rows if r.side is Side.NEAR],
                     [r for r in self.rows if abs(r.time-19.2) > 1e-8]):
            with self.subTest(count=len(rows)):
                self.assertEqual(report(rows)["status"], "FAIL")

    def test_velocity_jump_at_seam_and_contact_reacceleration_fail(self):
        rows = [replace(r, angular_velocity={**r.angular_velocity, "hip": 100.},
                        velocity={**r.velocity, "heel": (10., 0., 0.)})
                if r.time in (31.75, 32.) else r for r in self.rows]
        rules = report(rows)["violation_counts"]
        self.assertIn("angular_velocity_jump", rules)
        self.assertIn("contact_reacceleration", rules)

    def test_global_parameters_are_observed_not_echoed(self):
        result = report(self.rows, replace(SPEC, expected_cadence=120., expected_step_hip_ratio=.7))
        self.assertIn("global_cadence", result["violation_counts"])
        self.assertIn("global_step_ratio", result["violation_counts"])
        self.assertAlmostEqual(result["global"]["steps"][0]["cadence"], 90.)
        self.assertAlmostEqual(result["global"]["strides"][0]["stride_length"], .9)
        self.assertEqual(result["global"]["strides"][0]["duration_frames"], 32.)


if __name__ == "__main__":
    unittest.main()
