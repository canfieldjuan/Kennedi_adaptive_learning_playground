"""The step solver honors the timing-coordinate domain instead of refusing whole steps."""
import itertools
import json
import math
from pathlib import Path
import random
import unittest
from unittest.mock import patch

from storybook.animation.maya_walk.fitting import (
    PoseChart, TimingChart, Objective, admit_step, StepVerdict, DAMPING_START, TIMING_COORDINATE_LIMIT)
from storybook.animation.maya_walk.numerics import (
    analytic_jacobian, bounded_least_squares, bounded_step, TRUST_LIMIT, BOUND_TOLERANCE)

FROZEN = Path(__file__).with_name('frozen-jacobian-stop.json')
LIMIT = TIMING_COORDINATE_LIMIT


def _solve_free(columns, rhs, fixed):
    """Least squares over the free coordinates with the others pinned; tiny normal equations."""
    n = len(columns)
    free = [i for i in range(n) if i not in fixed]
    target = [b-sum(columns[i][j]*v for i, v in fixed.items()) for j, b in enumerate(rhs)]
    a = [[sum(columns[p][j]*columns[q][j] for j in range(len(rhs))) for q in free] for p in free]
    g = [sum(columns[p][j]*target[j] for j in range(len(rhs))) for p in free]
    m = len(free)
    for k in range(m):
        pivot = max(range(k, m), key=lambda r: abs(a[r][k]))
        a[k], a[pivot], g[k], g[pivot] = a[pivot], a[k], g[pivot], g[k]
        for r in range(k+1, m):
            f = a[r][k]/a[k][k]
            a[r] = [x-f*y for x, y in zip(a[r], a[k])]
            g[r] -= f*g[k]
    solved = [0.]*m
    for k in reversed(range(m)):
        solved[k] = (g[k]-sum(a[k][c]*solved[c] for c in range(k+1, m)))/a[k][k]
    step = [0.]*n
    for i, v in fixed.items():
        step[i] = v
    for i, v in zip(free, solved):
        step[i] = v
    return step


def _brute_force(columns, rhs, lower, upper):
    """Exact box-constrained least squares by enumerating every active set."""
    best = None
    for sides in itertools.product((None, 'lo', 'hi'), repeat=len(columns)):
        fixed = {i: (lower[i] if s == 'lo' else upper[i]) for i, s in enumerate(sides) if s}
        step = _solve_free(columns, rhs, fixed)
        if any(v < a-1e-12 or v > b+1e-12 for v, a, b in zip(step, lower, upper)):
            continue
        value = sum((sum(c[j]*s for c, s in zip(columns, step))-rhs[j])**2 for j in range(len(rhs)))
        if best is None or value < best[0]:
            best = (value, step)
    return best


class SolverBoundTests(unittest.TestCase):
    IDENTITY = [[1., 0.], [0., 1.]]

    def test_each_side_and_a_zero_width_side_bind_exactly(self):
        cases = (([-.4, .3], [-.1, -.5], [.5, .5], (-.1, .3)),
                 ([.4, .3], [-.5, -.5], [.2, .5], (.2, .3)),
                 ([-.4, .3], [0., -.5], [.5, .5], (0., .3)),
                 ([.4, -.3], [-.5, -.5], [0., .5], (0., -.3)))
        for rhs, lower, upper, want in cases:
            with self.subTest(rhs=rhs, lower=lower, upper=upper):
                step = bounded_least_squares(self.IDENTITY, rhs, lower=lower, upper=upper).require_converged()
                self.assertEqual(step[0], want[0])  # the bound coordinate lands exactly on its bound
                self.assertAlmostEqual(step[1], want[1], delta=1e-15)

    def test_asymmetric_boxes_match_exhaustive_active_sets(self):
        rng = random.Random(20261113)
        for case in range(300):
            n = rng.choice((2, 3))
            columns = [[rng.uniform(-2, 2) for _ in range(n+1)] for _ in range(n)]
            rhs = [rng.uniform(-3, 3) for _ in range(n+1)]
            lower = [rng.choice((0., -.5, -rng.uniform(0, .5))) for _ in range(n)]
            upper = [rng.choice((0., .5, rng.uniform(0, .5))) for _ in range(n)]
            with self.subTest(case=case):
                result = bounded_least_squares(columns, rhs, lower=lower, upper=upper)
                step = result.require_converged()
                value, want = _brute_force(columns, rhs, lower, upper)
                got = sum((sum(c[j]*s for c, s in zip(columns, step))-rhs[j])**2 for j in range(len(rhs)))
                self.assertAlmostEqual(got, value, delta=1e-9*max(1., value))
                for a, b in zip(step, want):
                    self.assertAlmostEqual(a, b, delta=1e-7)
                for v, a, b in zip(step, lower, upper):
                    self.assertTrue(a-BOUND_TOLERANCE*TRUST_LIMIT <= v <= b+BOUND_TOLERANCE*TRUST_LIMIT)

    def test_a_bound_hit_then_released_reaches_the_exact_optimum(self):
        # Found by search against a copy of the solver with release disabled,
        # which reports numerical_failure here: the first solve pins x0 at its
        # 0.01 ceiling, and the optimum needs x0 released to the interior.
        columns = [[-.2, .9], [-1.1, 1.8]]
        rhs = [.8, -.9]
        lower, upper = [-.5, -.5], [.01, .5]
        result = bounded_least_squares(columns, rhs, lower=lower, upper=upper)
        step = result.require_converged()
        value, want = _brute_force(columns, rhs, lower, upper)
        for a, b in zip(step, want):
            self.assertAlmostEqual(a, b, delta=1e-12)
        self.assertTrue(lower[0] < step[0] < upper[0])
        self.assertEqual(step[1], -.5)
        self.assertGreater(result.iterations, 2)

    def test_zero_width_sides_with_asymmetric_boxes_reach_the_exact_optimum(self):
        # Coordinates at a wall: found by search; a wrong floor step fraction
        # divides by zero on these, the exact one converges.
        cases = (
            ([[1.7, .2, .7, .5], [1.9, -1.7, -.5, 1.2], [-.5, -1.3, -1.5, -.7]], [-.2, -.1, -.7, -1.1],
             [-.1, -.5, -.2], [.5, 0., 0.]),
            ([[.6, .8, -1.3, -1.7], [.5, .6, -1.2, -1.5], [-.2, .7, 1.3, -1.6]], [1.2, -.8, .4, .7],
             [-.2, -.2, 0.], [.5, .1, .5]),
            ([[1.9, -.3, -1.5, .7], [1., .3, 1.5, .5], [1.2, -.8, -1.6, -.2]], [-1.1, -.4, -.9, .3],
             [0., -.1, -.2], [.2, .2, .1]),
            ([[.8, .5, -1.2, -1.3], [.3, -1.2, -1.8, 0.], [-.2, -.7, -.9, .3]], [.8, 1.4, -1., .3],
             [0., -.2, -.1], [.1, 0., .5]),
        )
        for case, (columns, rhs, lower, upper) in enumerate(cases):
            with self.subTest(case=case):
                step = bounded_least_squares(columns, rhs, lower=lower, upper=upper).require_converged()
                _, want = _brute_force(columns, rhs, lower, upper)
                for a, b in zip(step, want):
                    self.assertAlmostEqual(a, b, delta=1e-12)

    def test_explicit_trust_box_is_bit_identical_to_the_default(self):
        rng = random.Random(7)
        for case in range(50):
            n = rng.choice((1, 2, 4))
            columns = [[rng.uniform(-3, 3) for _ in range(n+2)] for _ in range(n)]
            rhs = [rng.uniform(-4, 4) for _ in range(n+2)]
            damping = rng.choice((0., .05, 1e-7, 3.))
            with self.subTest(case=case):
                self.assertEqual(
                    bounded_least_squares(columns, rhs, damping),
                    bounded_least_squares(columns, rhs, damping, lower=[-TRUST_LIMIT]*n, upper=[TRUST_LIMIT]*n))

    def test_invalid_bounds_are_refused(self):
        good = ([-.5, -.5], [.5, .5])
        bad = {
            'lower only': {'lower': good[0]},
            'upper only': {'upper': good[1]},
            'short': {'lower': [-.5], 'upper': [.5]},
            'long': {'lower': [-.5]*3, 'upper': [.5]*3},
            'empty': {'lower': [], 'upper': []},
            'not a sequence': {'lower': iter(good[0]), 'upper': iter(good[1])},
            'nan': {'lower': [math.nan, -.5], 'upper': good[1]},
            'inf': {'lower': good[0], 'upper': [math.inf, .5]},
            'bool': {'lower': [False, -.5], 'upper': good[1]},
            'positive lower': {'lower': [.1, -.5], 'upper': good[1]},
            'negative upper': {'lower': good[0], 'upper': [-.1, .5]},
            'lower beyond trust': {'lower': [math.nextafter(-.5, -1.), -.5], 'upper': good[1]},
            'upper beyond trust': {'lower': good[0], 'upper': [.5, math.nextafter(.5, 1.)]},
        }
        for name, bounds in bad.items():
            with self.subTest(name), self.assertRaises(ValueError):
                bounded_least_squares(self.IDENTITY, [.1, .1], **bounds)
        for name in ('lower only', 'upper only'):
            with self.subTest(name), self.assertRaisesRegex(ValueError, 'given together'):
                bounded_least_squares(self.IDENTITY, [.1, .1], **bad[name])
        # Falsy values that are valid bounds are honored, not replaced by defaults.
        step = bounded_least_squares(self.IDENTITY, [.3, .3], lower=[0, 0], upper=[0, 0]).require_converged()
        self.assertEqual(step, (0., 0.))

    def test_quadratic_adapter_passes_bounds_through(self):
        free = bounded_step([[2., 1.], [1., 2.]], [.4, .1]).require_converged()
        self.assertGreater(free[0], .1)
        step = bounded_step([[2., 1.], [1., 2.]], [.4, .1], lower=[-.5, -.5], upper=[.1, .5]).require_converged()
        self.assertLessEqual(step[0], .1)
        self.assertAlmostEqual(step[0], .1, delta=1e-15)



class TimingChartBoundTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.space = TimingChart(PoseChart())
        cls.x = json.loads(FROZEN.read_text())['values']
        cls.V = cls.space.value_count
        cls.wall = next(i for i, p in enumerate(cls.space.parameters) if tuple(p) == ('phase_toe', 5))

    def with_value(self, index, value):
        y = list(self.x)
        y[index] = value
        return y

    def test_value_and_interior_timing_coordinates_keep_the_trust_box(self):
        lower, upper = self.space.step_bounds(self.x)
        self.assertEqual(len(lower), len(self.x))
        self.assertEqual(lower[:self.V], [-TRUST_LIMIT]*self.V)
        self.assertEqual(upper[:self.V], [TRUST_LIMIT]*self.V)
        interior = [i for i in range(self.V, len(self.x)) if abs(self.x[i]) < LIMIT-TRUST_LIMIT]
        self.assertTrue(interior)
        for i in interior:
            self.assertEqual((lower[i], upper[i]), (-TRUST_LIMIT, TRUST_LIMIT))

    def test_a_coordinate_near_either_wall_is_clipped_to_it(self):
        lower, upper = self.space.step_bounds(self.x)
        self.assertEqual(upper[self.wall], TRUST_LIMIT)
        self.assertAlmostEqual(lower[self.wall], -(LIMIT+self.x[self.wall]), delta=1e-14)
        self.assertGreaterEqual(self.x[self.wall]+lower[self.wall], -LIMIT)
        for value, side in ((-LIMIT, 'lower'), (LIMIT, 'upper')):
            with self.subTest(value=value):
                lower, upper = self.space.step_bounds(self.with_value(self.wall, value))
                bound = lower if side == 'lower' else upper
                self.assertEqual(bound[self.wall], 0.)
        lower, upper = self.space.step_bounds(self.with_value(self.wall, 19.8))
        self.assertAlmostEqual(upper[self.wall], .2, delta=1e-14)
        self.assertEqual(lower[self.wall], -TRUST_LIMIT)

    def test_exactness_precondition_holds(self):
        # step_bounds needs no ulp correction only while a clipped side's coordinate
        # is within a factor of two of the wall (Sterbenz); see its docstring.
        self.assertLessEqual(TRUST_LIMIT, LIMIT/2)

    def test_bounds_land_inside_the_domain_in_floating_point(self):
        rng = random.Random(5)
        values = [-LIMIT, LIMIT, LIMIT/2, -LIMIT/2]
        for start in (-LIMIT, LIMIT, -LIMIT+TRUST_LIMIT, LIMIT-TRUST_LIMIT):
            v = start
            for _ in range(200):
                v = math.nextafter(v, 0.)
                values.append(v)
        values += [rng.uniform(LIMIT-.6, LIMIT)*rng.choice((-1, 1)) for _ in range(400)]
        for v in values:
            with self.subTest(v=v):
                lower, upper = self.space.step_bounds(self.with_value(self.wall, v))
                lo, hi = lower[self.wall], upper[self.wall]
                self.assertTrue(-TRUST_LIMIT <= lo <= 0. <= hi <= TRUST_LIMIT)
                self.assertGreaterEqual(v+lo, -LIMIT)
                self.assertLessEqual(v+hi, LIMIT)
                if lo > -TRUST_LIMIT:
                    self.assertEqual(v+lo, -LIMIT)
                if hi < TRUST_LIMIT:
                    self.assertEqual(v+hi, LIMIT)

    def test_out_of_domain_or_nonfinite_coordinates_are_refused(self):
        for value in (math.nextafter(-LIMIT, -30.), math.nextafter(LIMIT, 30.), math.nan, math.inf):
            with self.subTest(value=value), self.assertRaises(ValueError):
                self.space.step_bounds(self.with_value(self.wall, value))

    def test_a_timed_vector_of_the_wrong_length_is_refused(self):
        # The value part is complete in both cases; only the timing part is wrong.
        for values in (self.x[:-1], [*self.x, 0.]):
            with self.subTest(length=len(values)), self.assertRaisesRegex(ValueError, 'Complete timed pose vector'):
                self.space.step_bounds(values)

    def test_projection_absorbs_only_the_solver_rounding_tolerance(self):
        edge = LIMIT+BOUND_TOLERANCE*TRUST_LIMIT
        for sign in (-1., 1.):
            with self.subTest(sign=sign):
                at_edge = self.with_value(self.wall, sign*edge)
                projected = self.space.project(at_edge)
                self.assertEqual(projected[self.wall], sign*LIMIT)
                self.assertEqual([v for i, v in enumerate(projected) if i != self.wall],
                                 [v for i, v in enumerate(at_edge) if i != self.wall])
                self.assertEqual(at_edge[self.wall], sign*edge)
                self.space.layout(projected)
                beyond = self.with_value(self.wall, sign*math.nextafter(edge, 30.))
                self.assertEqual(self.space.project(beyond), beyond)
                with self.assertRaises(ValueError):
                    self.space.layout(self.space.project(beyond))
        self.assertEqual(self.space.project(self.x), self.x)
        big = list(self.x)
        big[0] = 1e6
        self.assertEqual(self.space.project(big)[0], 1e6)

    def test_value_chart_alone_has_only_the_trust_box(self):
        chart = PoseChart()
        lower, upper = chart.step_bounds(chart.initial)
        self.assertEqual((lower, upper), ([-TRUST_LIMIT]*len(chart.initial), [TRUST_LIMIT]*len(chart.initial)))
        with self.assertRaises(ValueError):
            chart.step_bounds(chart.initial[:-1])


class AdmissionUsesChartBoundsTests(unittest.TestCase):
    def test_every_attempt_solves_inside_the_charts_bounds(self):
        class Chart:
            def step_bounds(self, values):
                return [-.1, 0.], [.2, .3]

            def project(self, values):
                return values

        class Linear:
            def score(self, values):
                return sum(v*v for v in values), list(values)
        import storybook.animation.maya_walk.fitting as fitting
        calls = []

        def spy(*args, **kwargs):
            calls.append(kwargs)
            return bounded_least_squares(*args, **kwargs)
        x = [.3, .4]
        with patch.object(fitting, 'bounded_least_squares', side_effect=spy):
            update, _, receipts, _ = admit_step(Linear(), Chart(), x, .25, x, ((1., 0.), (0., 1.)), .05)
        self.assertTrue(calls)
        for kwargs in calls:
            self.assertEqual((kwargs['lower'], kwargs['upper']), ([-.1, 0.], [.2, .3]))
        self.assertIs(receipts[-1].verdict, StepVerdict.ADMITTED)
        self.assertEqual(update[0], [.3+(-.1), .4])


class FrozenTimingWallTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.space = TimingChart(PoseChart())
        cls.objective = Objective(cls.space, 1., 0.)
        cls.x = json.loads(FROZEN.read_text())['values']
        cls.score, cls.residuals = cls.objective.score(cls.x)
        cls.columns = analytic_jacobian(cls.objective.score, cls.x, cls.residuals).require_resolved()
        cls.wall = next(i for i, p in enumerate(cls.space.parameters) if tuple(p) == ('phase_toe', 5))

    def test_first_step_at_frozen_third_fit_point_is_admitted_inside_the_domain(self):
        # On base 98d79aa every attempt here is refused out_of_domain: the solved
        # step takes phase_toe[5] from -19.78 to -20.28 and the chart refuses it.
        self.assertAlmostEqual(self.x[self.wall], -19.783354649571557, delta=0)
        update, _, receipts, _ = admit_step(
            self.objective, self.space, self.x, self.score, self.residuals, self.columns, DAMPING_START)
        self.assertNotIn(StepVerdict.OUT_OF_DOMAIN, [r.verdict for r in receipts])
        self.assertIsNotNone(update)
        self.assertIs(receipts[-1].verdict, StepVerdict.ADMITTED)
        values, score, _ = update
        self.assertLess(score, self.score)
        timing = values[self.space.value_count:]
        self.assertTrue(all(-20. <= v <= 20. for v in timing))
        self.assertGreaterEqual(values[self.wall], -20.)


if __name__ == '__main__':
    unittest.main()
