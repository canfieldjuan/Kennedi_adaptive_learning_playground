"""Every moving key keeps moving (contract maya-walk-motion-floor)."""
import hashlib
import json
import math
from pathlib import Path
import random
import tempfile
import unittest
from unittest.mock import Mock, patch

from storybook.animation.maya_walk import differential as dmath, fitting
from storybook.animation.maya_walk.fitting import (
    BRANCHES, HIP_HEIGHT_ENVELOPE, PoseChart, progress, TimingChart, PHASES, CHANNEL, MOTION_FLOOR, POSE_COORDINATE_LIMIT,
    TIMING_COORDINATE_LIMIT, carry_start, source_signature, floor_zero_signature, time_anchors, fit)
from storybook.animation.maya_walk.numerics import TRUST_LIMIT, BOUND_TOLERANCE, analytic_jacobian

FLAT = Path(__file__).with_name('frozen-flat-stop.json')
LIMIT = POSE_COORDINATE_LIMIT


def keys(motion, name):
    curve = {c.rule.channel: c for c in motion.curves}[CHANNEL[name]]
    return [(k.phase, k.value) for k in curve.keys[:len(PHASES[name])]]


def branches(motion, stride):
    """Independent restatement of the 12 moving branches: (name, [(phase, value)...])."""
    k = {n: keys(motion, n) for n in PHASES}
    hx, hz, fx, fz = k['hip_x'], k['hip_z'], k['foot_x'], k['foot_z']
    h, b, t = k['heel'], k['ball'], k['toe']
    return [
        ('hip_x forward', [*hx, (.5, stride/2)]),
        ('hip_z rise', hz[0:3]),
        ('hip_z fall', [*hz[2:6], (.55, hz[0][1])]),
        ('foot_x swing', [*fx[1:], (1., fx[0][1]+stride)]),
        ('foot_z lift', fz[1:5]),
        ('foot_z lower', [*fz[4:], (1., 0.)]),
        ('heel to lowest', h[5:9]),
        ('heel from lowest', [h[8], h[9], *((1+p, v) for p, v in h[0:5])]),
        ('ball rise', b[1:9]),
        ('ball fall', b[8:12]),
        ('toe rise', t[1:7]),
        ('toe fall', t[6:9]),
    ]


def ratios(points):
    """Each segment's share of its branch over the smooth (cosine) share between the same ends."""
    (p0, v0), (pn, vn) = points[0], points[-1]
    ease = lambda p: (1-math.cos(math.pi*(p-p0)/(pn-p0)))/2
    return [((vb-va)/(vn-v0))/(ease(pb)-ease(pa)) for (pa, va), (pb, vb) in zip(points, points[1:])]


# Envelope coordinates set a branch's height (hip bob, peaks, plant), not a share.
# Shrinking a height to zero is the separate route deferred to issue 183, so the
# property ranges every share over the whole domain and envelopes over +-8.
ENVELOPE = {('plant', 0), ('hip_z', 0), ('hip_z', 1), ('foot_z', 0), ('heel', 0), ('ball', 0), ('toe', 0)}


def random_vector(space, rng, scale):
    values = [rng.uniform(-8., 8.) if p in ENVELOPE else rng.uniform(-scale, scale)
              for p in space.parameters[:space.value_count]]
    timing = [rng.uniform(-TIMING_COORDINATE_LIMIT, TIMING_COORDINATE_LIMIT)
              for _ in range(len(space.initial)-space.value_count)]
    return values+timing


class FloorConstantTests(unittest.TestCase):
    def test_floor_admits_steady_travel_and_the_solver_precondition_holds(self):
        self.assertGreater(MOTION_FLOOR, 0.)
        self.assertLess(MOTION_FLOOR, 2/math.pi)
        self.assertLessEqual(TRUST_LIMIT, POSE_COORDINATE_LIMIT/2)

    def test_chart_floor_is_admitted_by_one_rule(self):
        for floor in (0., .5, .99):
            self.assertEqual(PoseChart(floor=floor).floor, floor)
        for floor in (0, 1, False, True, -.1, 1., math.nan, math.inf, '0.5', None):
            with self.subTest(floor=floor), self.assertRaises(ValueError):
                PoseChart(floor=floor)

    def test_branch_ends_are_fixed_anchors_and_keys_lie_between_them(self):
        self.assertEqual(len(BRANCHES), 12)
        for branch, (name, start, end, ids) in BRANCHES.items():
            period = .5 if name.startswith('hip_') else 1.
            for p in (start, end):
                with self.subTest(branch=branch, phase=p):
                    self.assertTrue(any(abs(p % period - a % period) < 1e-12 for a in time_anchors(name)))
            unwrapped = [PHASES[name][i]+(1 if end > 1 and PHASES[name][i] < start else 0) for i in ids]
            for p in unwrapped:
                self.assertLess(min(start, end), p)
                self.assertLess(p, max(start, end))
            # Measuring order: keys move steadily away from the start.
            distance = [abs(p-start) for p in unwrapped]
            self.assertEqual(distance, sorted(distance))


class FloorPropertyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.space = TimingChart(PoseChart())
        cls.stride = cls.space.value_chart.stride

    def test_no_segment_moves_less_than_the_floor_anywhere_in_the_domain(self):
        rng = random.Random(20261121)
        for trial in range(300):
            x = random_vector(self.space, rng, LIMIT if trial % 3 == 0 else 8.)
            motion = self.space.build(x)
            for name, points in branches(motion, self.stride):
                (p0, v0), (pn, vn) = points[0], points[-1]
                # Key values are stored near their own magnitude, so a segment is
                # known to a few ulps of the largest value, not of its own gap.
                slack = 8*math.ulp(max(abs(v) for _, v in points))
                for (pa, va), (pb, vb), r in zip(points, points[1:], ratios(points)):
                    smooth = ((1-math.cos(math.pi*(pb-p0)/(pn-p0)))-(1-math.cos(math.pi*(pa-p0)/(pn-p0))))/2
                    with self.subTest(trial=trial, branch=name):
                        self.assertGreaterEqual(abs(vb-va), MOTION_FLOOR*smooth*abs(vn-v0)-slack)
                        self.assertGreater(r, 0.)

    def test_a_share_coordinate_on_its_wall_leaves_its_segment_at_the_floor(self):
        x = list(self.space.initial)
        index = self.space.parameters.index(('hip_z', 3))
        x[index] = -LIMIT
        points = dict(branches(self.space.build(x), self.stride))['hip_z fall']
        last = ratios(points)[-1]
        self.assertGreaterEqual(last, MOTION_FLOOR*(1-1e-9))
        self.assertLess(last, MOTION_FLOOR*(1+1e-9))

    def test_floor_zero_can_park_and_the_floor_cannot(self):
        x = list(self.space.initial)
        x[self.space.parameters.index(('hip_z', 3))] = -LIMIT
        with self.assertRaisesRegex(ValueError, 'Flat segment lacks a declared channel hold'):
            TimingChart(PoseChart(floor=0.)).build(x)
        self.space.build(x)


class EncodingTests(unittest.TestCase):
    def setUp(self):
        self.space = TimingChart(PoseChart())
        self.chart = self.space.value_chart

    def decoded(self, x):
        motion = self.space.build(x)
        return {n: [v for _, v in keys(motion, n)] for n in PHASES}, dict(self.space.layout(x).profiles)

    def test_encoding_inverts_decoding_at_the_timed_key_times(self):
        rng = random.Random(7)
        for trial in range(40):
            x = random_vector(self.space, rng, 6.)
            values, phases = self.decoded(x)
            parameters, coordinates = self.chart.encode(values, phases)
            self.assertEqual(parameters, self.chart.parameters)
            for a, b in zip(coordinates, x[:self.space.value_count]):
                with self.subTest(trial=trial):
                    self.assertAlmostEqual(a, b, delta=1e-6)

    def test_projection_raises_only_parked_segments_and_keeps_the_others_shape(self):
        fixture = json.loads(FLAT.read_text())
        old = TimingChart(PoseChart(floor=0.))
        motion = old.build(fixture['values'])
        values = {n: [v for _, v in keys(motion, n)] for n in PHASES}
        phases = dict(old.layout(fixture['values']).profiles)
        x = [*self.chart.encode(values, phases)[1], *fixture['values'][self.space.value_count:]]
        before = dict(branches(motion, self.chart.stride))
        after = dict(branches(self.space.build(x), self.chart.stride))
        raised = 0
        for name in before:
            old_r, new_r = ratios(before[name]), ratios(after[name])
            kept = [(a, b) for a, b in zip(old_r, new_r) if a >= MOTION_FLOOR]
            for a, b in zip(old_r, new_r):
                if a < MOTION_FLOOR:
                    raised += 1
                    self.assertAlmostEqual(b, MOTION_FLOOR, delta=1e-9)
            # Kept segments give up excess proportionally: one factor per branch.
            factors = {round((b-MOTION_FLOOR)/(a-MOTION_FLOOR), 9) for a, b in kept if a > MOTION_FLOOR+1e-6}
            self.assertLessEqual(len(factors), 1, name)
        self.assertGreater(raised, 0)

    def test_a_segment_just_above_the_floor_still_encodes_inside_the_domain(self):
        # Review finding on 19e0caf: a tiny positive excess (or a tiny last
        # excess) used to encode past +-35, and build then refused the start.
        # Step the key a float at a time across the floor point, so cancellation
        # leaves every small excess, positive and negative.
        values = {n: list(v) for n, v in self.chart.owner.fixed.items()}
        z = values['hip_z']
        lo, hi = z[0], z[2]
        smooth = progress(PHASES, 'hip_fall')
        index = self.chart.parameters.index(('hip_z', 3))
        worst = 0.
        for key, target in ((5, lo+MOTION_FLOOR*smooth[0]*(hi-lo)),
                            (3, hi-MOTION_FLOOR*(1-smooth[2])*(hi-lo))):
            trial = {n: list(v) for n, v in values.items()}
            for k in range(-64, 65):
                trial['hip_z'][key] = target+k*math.ulp(target)
                _, coordinates = self.chart.encode(trial, PHASES)
                worst = max(worst, *(abs(v) for v in coordinates[index:index+3]))
                with self.subTest(key=key, step=k):
                    self.assertTrue(all(abs(v) <= 30.+1e-9 for v in coordinates[index:index+3]))
        self.assertGreater(worst, 29.)  # the scan reached the clip

    def test_encode_refuses_a_walk_outside_the_pose_domain(self):
        # A peak encodes as log(peak): one below e^-35 lies outside the domain.
        values = {n: list(v) for n, v in self.chart.owner.fixed.items()}
        peak = values['ball'][8]
        for scale in (math.exp(-36), math.exp(-34)):
            values['ball'] = [v*scale/peak for v in values['ball']]
            peak = values['ball'][8]
            if scale < math.exp(-35):
                with self.assertRaisesRegex(ValueError, 'not representable'):
                    self.chart.encode(values, PHASES)
            else:
                self.chart.encode(values, PHASES)
        self.assertLess(HIP_HEIGHT_ENVELOPE[0], HIP_HEIGHT_ENVELOPE[1])

    def test_floor_zero_encoding_is_the_original_log_gap_ratio(self):
        chart = PoseChart(floor=0.)
        values = {n: list(v) for n, v in chart.owner.fixed.items()}
        z = values['hip_z']
        _, coordinates = chart.encode(values, PHASES)
        start = chart.parameters.index(('hip_z', 2))
        self.assertEqual(coordinates[start], math.log((z[1]-z[0])/(z[2]-z[1])))
        gaps = [z[5]-z[0], z[4]-z[5], z[3]-z[4], z[2]-z[3]]
        self.assertEqual(coordinates[start+1:start+4], [math.log(g/gaps[-1]) for g in gaps[:-1]])


class TimedKeysTests(unittest.TestCase):
    def test_values_follow_the_timed_key_times_through_the_ease(self):
        space = TimingChart(PoseChart())
        x = list(space.initial)
        for i in range(space.value_count, len(x)):
            x[i] += 3. if i % 2 else -3.
        phases = dict(space.layout(x).profiles)
        timed = space.build(x)
        direct = space.value_chart.build(x[:space.value_count], phases)
        untimed = space.value_chart.build(x[:space.value_count])
        for name in PHASES:
            with self.subTest(name=name):
                self.assertEqual([v for _, v in keys(timed, name)], [v for _, v in keys(direct, name)])
        self.assertNotEqual([v for _, v in keys(timed, 'hip_z')], [v for _, v in keys(untimed, 'hip_z')])

    def test_a_phase_profile_must_be_complete(self):
        chart = PoseChart()
        broken = dict(PHASES)
        del broken['toe']
        with self.assertRaises(ValueError):
            chart.build(chart.initial, broken)
        short = dict(PHASES, toe=PHASES['toe'][:-1])
        with self.assertRaises(ValueError):
            chart.build(chart.initial, short)


class PoseDomainTests(unittest.TestCase):
    def setUp(self):
        self.chart = PoseChart()
        self.n = len(self.chart.initial)

    def bounds_at(self, v):
        x = list(self.chart.initial)
        x[0] = v
        lower, upper = self.chart.step_bounds(x)
        return lower[0], upper[0]

    def test_interior_coordinates_keep_the_trust_box(self):
        lower, upper = self.chart.step_bounds([0.]*self.n)
        self.assertEqual((lower, upper), ([-TRUST_LIMIT]*self.n, [TRUST_LIMIT]*self.n))

    def test_a_coordinate_near_or_on_either_wall_is_clipped_to_it(self):
        self.assertEqual(self.bounds_at(LIMIT-.2), (-TRUST_LIMIT, LIMIT-(LIMIT-.2)))
        self.assertEqual(self.bounds_at(-LIMIT+.2), (-LIMIT-(-LIMIT+.2), TRUST_LIMIT))
        self.assertEqual(self.bounds_at(LIMIT), (-TRUST_LIMIT, 0.))
        self.assertEqual(self.bounds_at(-LIMIT), (0., TRUST_LIMIT))

    def test_bounds_land_inside_the_domain_in_floating_point(self):
        rng = random.Random(35)
        samples = [LIMIT-rng.uniform(0, 1) for _ in range(4000)]+[LIMIT/2+rng.uniform(-1, 1) for _ in range(2000)]
        for v in samples+[-s for s in samples]:
            lower, upper = self.bounds_at(v)
            self.assertLessEqual(abs(v+lower), LIMIT)
            self.assertLessEqual(abs(v+upper), LIMIT)
            if upper < TRUST_LIMIT:
                self.assertEqual(v+upper, LIMIT)
            if lower > -TRUST_LIMIT:
                self.assertEqual(v+lower, -LIMIT)

    def test_out_of_domain_nonfinite_or_incomplete_vectors_are_refused(self):
        for v in (LIMIT+1e-9, -LIMIT-1e-9, math.nan, math.inf):
            x = list(self.chart.initial)
            x[0] = v
            with self.subTest(v=v), self.assertRaises(ValueError):
                self.chart.step_bounds(x)
        for x in ([0.]*(self.n-1), [0.]*(self.n+1)):
            with self.assertRaises(ValueError):
                self.chart.step_bounds(x)
        x = list(self.chart.initial)
        x[0] = LIMIT+1e-9
        with self.assertRaises(ValueError):
            self.chart.build(x)
        x[0] = LIMIT
        self.chart.build(x)

    def test_projection_absorbs_only_the_solver_rounding_tolerance(self):
        edge = BOUND_TOLERANCE*TRUST_LIMIT
        for sign in (1., -1.):
            self.assertEqual(self.chart.project([sign*(LIMIT+edge)]), [sign*LIMIT])
            beyond = sign*(LIMIT+2*edge)
            self.assertEqual(self.chart.project([beyond]), [beyond])
            self.assertEqual(self.chart.project([sign*(LIMIT-.1)]), [sign*(LIMIT-.1)])

    def test_timing_chart_delegates_its_value_part(self):
        space = TimingChart(self.chart)
        x = list(space.initial)
        x[0] = LIMIT+BOUND_TOLERANCE*TRUST_LIMIT
        self.assertEqual(space.project(x)[0], LIMIT)
        lower, upper = space.step_bounds([LIMIT, *x[1:]])
        self.assertEqual(upper[0], 0.)


class _HipReach:
    """Scores a start only when its hip lowest point is at or below a ceiling.

    The residual is a hinge on that ceiling, so the smallest scoring drop sits
    on the hinge's tie, as the real reach guard does.
    """
    def __init__(self, space, ceiling):
        self.space, self.ceiling, self.calls = space, ceiling, 0
        self.index = space.parameters.index(('hip_z', 0))

    def score(self, x):
        self.calls += 1
        lowest = .83+.17/(1+dmath.exp(-x[self.index]))
        if dmath.primal(lowest) > self.ceiling:
            return math.inf, None
        r = [dmath.maximum(0., lowest-self.ceiling)+1.]
        return dmath.total(v*v for v in r), r


class CarryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixture = json.loads(FLAT.read_text())
        cls.space = TimingChart(PoseChart())
        old = TimingChart(PoseChart(floor=0.))
        cls.lowest = min(v for _, v in keys(old.build(cls.fixture['values']), 'hip_z'))
        cls.bob = max(v for _, v in keys(old.build(cls.fixture['values']), 'hip_z'))-cls.lowest

    def test_a_reachable_start_is_not_lowered(self):
        x, drop = carry_start(self.fixture, self.space, _HipReach(self.space, 1.))
        self.assertEqual(drop, 0.)
        self.assertEqual(x[self.space.value_count:], self.fixture['values'][self.space.value_count:])

    def test_the_smallest_reaching_drop_is_found_from_both_sides(self):
        need = .3*self.bob
        objective = _HipReach(self.space, self.lowest-need)
        x, drop = carry_start(self.fixture, self.space, objective)
        self.assertGreaterEqual(drop, need-1e-12)
        self.assertLess(drop, need+1e-9)
        _, residuals = objective.score(x)
        self.assertIsNotNone(residuals)
        # The returned start is off the hinge: the fitter can differentiate it.
        analytic_jacobian(objective.score, x, residuals).require_resolved()

    def test_no_drop_within_one_bob_is_refused(self):
        with self.assertRaises(ValueError):
            carry_start(self.fixture, self.space, _HipReach(self.space, self.lowest-1.01*self.bob))

    def near_the_envelope(self, lowest, highest):
        values = list(self.fixture['values'])
        parameters = self.space.parameters
        values[parameters.index(('hip_z', 0))] = math.log((lowest-.83)/(1-lowest))
        values[parameters.index(('hip_z', 1))] = math.log((highest-lowest)/(1-highest))
        return dict(self.fixture, values=values)

    def test_a_carry_near_the_hip_envelope_searches_only_representable_drops(self):
        # Review finding on 19e0caf: the whole-bob endpoint (.093) crossed the
        # .83 envelope and encode raised, though a .005 drop scores.
        prior = self.near_the_envelope(.85, .943)
        x, drop = carry_start(prior, self.space, _HipReach(self.space, .845))
        self.assertGreater(drop, .005-1e-9)
        self.assertLess(drop, .005+1e-6)
        with self.assertRaisesRegex(ValueError, 'No representable hip drop'):
            carry_start(prior, self.space, _HipReach(self.space, .829))

    def test_a_value_seed_must_carry_the_current_value_chart(self):
        # Review finding on 19e0caf: a pre-floor value seed was copied as is and
        # decoded as a different walk.
        chart = PoseChart()
        objective = Mock()
        objective.score.return_value = (1., [1.])
        objective.calls = 1
        report = {'status': 'FAIL', 'violation_counts': {'synthetic': 1}}
        with tempfile.TemporaryDirectory() as folder, \
                patch(fitting.__name__+'.Objective', return_value=objective), \
                patch(fitting.__name__+'.analytic_jacobian') as jacobian, \
                patch(fitting.__name__+'.NativeGeometry') as geometry:
            jacobian.return_value.require_resolved.side_effect = fitting.UnreliableJacobian('synthetic')
            jacobian.return_value.differences = ()
            geometry.return_value.assess.return_value = report
            seed = Path(folder)/'value-seed.json'
            base = {'parameters': [list(p) for p in chart.parameters], 'values': list(chart.initial)}
            for signature in (floor_zero_signature(False), source_signature(True), None):
                seed.write_text(json.dumps(dict(base, source_signature=signature)))
                with self.subTest(signature=signature), self.assertRaisesRegex(ValueError, 'carry it first'):
                    fit(Path(folder)/'out.json', iterations=1, timing=True, value_seed=seed)
            seed.write_text(json.dumps(dict(base, source_signature=source_signature(False))))
            record = fit(Path(folder)/'out.json', iterations=1, timing=True, value_seed=seed)
            self.assertEqual(record['values'][:len(chart.initial)], chart.initial)

    def test_inventory_and_timing_mismatches_are_refused(self):
        objective = _HipReach(self.space, 1.)
        for prior in (dict(self.fixture, parameters=self.fixture['parameters'][:-1]),
                      dict(self.fixture, values=self.fixture['values'][:-1]),
                      dict(self.fixture, timing=False), dict(self.fixture, timing=None),
                      dict(self.fixture, source_signature=source_signature(True)),
                      dict(self.fixture, source_signature=None)):
            with self.assertRaises(ValueError):
                carry_start(prior, self.space, objective)

    def test_fit_records_the_carry_and_refuses_a_plain_resume_or_two_sources(self):
        objective = Mock()
        objective.score.return_value = (1., [1.])
        objective.calls = 1
        report = {'status': 'FAIL', 'violation_counts': {'synthetic': 1}}
        with tempfile.TemporaryDirectory() as folder, \
                patch(fitting.__name__+'.Objective', return_value=objective), \
                patch(fitting.__name__+'.analytic_jacobian') as jacobian, \
                patch(fitting.__name__+'.NativeGeometry') as geometry:
            jacobian.return_value.require_resolved.side_effect = fitting.UnreliableJacobian('synthetic')
            jacobian.return_value.differences = ()
            geometry.return_value.assess.return_value = report
            output = Path(folder)/'carried.json'
            record = fit(output, iterations=1, timing=True, carry=FLAT)
            self.assertEqual(record['carried_from_signature'], self.fixture['source_signature'])
            self.assertEqual(record['carry_hip_drop'], 0.)
            self.assertEqual(record['input_sha256'], hashlib.sha256(FLAT.read_bytes()).hexdigest())
            self.assertEqual(record['source_signature'], source_signature(True))
            with self.assertRaises(ValueError):
                fit(output, iterations=1, timing=True, resume=FLAT)
            with self.assertRaises(ValueError):
                fit(output, iterations=1, timing=True, resume=FLAT, carry=FLAT)

    def test_fit_records_the_drop_the_carry_needed(self):
        objective = Mock()
        objective.score.return_value = (1., [1.])
        objective.calls = 1
        report = {'status': 'FAIL', 'violation_counts': {'synthetic': 1}}
        start = list(self.space.initial)
        with tempfile.TemporaryDirectory() as folder, \
                patch(fitting.__name__+'.Objective', return_value=objective), \
                patch(fitting.__name__+'.carry_start', return_value=(start, .0125)) as carried, \
                patch(fitting.__name__+'.analytic_jacobian') as jacobian, \
                patch(fitting.__name__+'.NativeGeometry') as geometry:
            jacobian.return_value.require_resolved.side_effect = fitting.UnreliableJacobian('synthetic')
            jacobian.return_value.differences = ()
            geometry.return_value.assess.return_value = report
            record = fit(Path(folder)/'carried.json', iterations=1, timing=True, carry=FLAT)
        carried.assert_called_once()
        self.assertEqual(record['carry_hip_drop'], .0125)
        self.assertEqual(record['values'], start)

    def test_the_signature_pins_the_floor_and_the_pose_domain(self):
        base = source_signature(True)
        # The fixture came from a fit on 3802836, before the floor existed.
        self.assertEqual(self.fixture['source_signature'], floor_zero_signature(True))
        self.assertNotEqual(floor_zero_signature(True), floor_zero_signature(False))
        self.assertNotEqual(base, self.fixture['source_signature'])
        with patch(fitting.__name__+'.MOTION_FLOOR', .25):
            self.assertNotEqual(source_signature(True), base)
        with patch(fitting.__name__+'.POSE_COORDINATE_LIMIT', 30.):
            self.assertNotEqual(source_signature(True), base)


if __name__ == '__main__':
    unittest.main()
