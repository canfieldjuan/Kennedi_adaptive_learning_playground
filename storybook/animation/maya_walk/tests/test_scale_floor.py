"""The step solves' damping scale never falls below SCALE_FLOOR.

Contract: learning-playground/docs/work-contracts/maya-walk-solver-scale-floor.md.
No fit runs here; the frozen test solves one linearization only.
"""
import json
import math
from pathlib import Path
import random
import unittest

from storybook.animation.maya_walk import numerics
from storybook.animation.maya_walk.numerics import (
    SolveStatus, bounded_least_squares, bounded_step, constrained_least_squares, rows_hold)

HERE = Path(__file__).parent
TINY = 1e-13
DAMPINGS = (1e2, 1e4, 1e6)


def _largest(step):
    return max(abs(v) for v in step)


def parity_systems():
    """Systems whose column norms are all >= 1 or exactly 0, rebuilt the same way every run.

    Each entry is (name, solve name, columns, rhs, keyword options). The golden
    file holds their exact results on the base, before the scale floor.
    """
    systems = [
        ('wide scales', 'bounded', [[1e8, 0.], [0., 1.]], [1e8*.25, -.25], {}),
        ('opposite faces', 'bounded', [[1., 0.], [0., 1e8]], [1., -1e8], {}),
        ('duplicate and zero', 'bounded', [[1., 2.], [1., 2.], [0., 0.]], [.4, .8], {'damping': 1e-7}),
        ('zero column only', 'bounded', [[0.], [0.]], [1.], {'damping': .1}),
    ]
    rng = random.Random(1127)
    for k in range(24):
        n = rng.randint(2, 6)
        m = n+rng.randint(0, 3)
        columns = []
        for i in range(n):
            if i and rng.random() < .2:
                columns.append([0.]*m)
                continue
            raw = [rng.uniform(-1, 1) for _ in range(m)]
            norm = math.hypot(*raw)
            size = 10**rng.uniform(0, 3)
            # Rounding can leave a rescaled column a hair under 1; keep it at or above.
            column = [v*size/norm for v in raw]
            while math.hypot(*column) < 1.:
                column = [v*(1+1e-15) for v in column]
            columns.append(column)
        rhs = [rng.uniform(-5, 5) for _ in range(m)]
        damping = rng.choice((0., 1e-3, 1., 1e2)) if all(any(c) for c in columns) else rng.choice((1e-3, 1., 1e2))
        options = {'damping': damping}
        if rng.random() < .5:
            options['lower'] = [-rng.uniform(0, .5) for _ in range(n)]
            options['upper'] = [rng.uniform(0, .5) for _ in range(n)]
        systems.append((f'random {k} bounded', 'bounded', columns, rhs, dict(options)))
        rows = tuple((tuple(rng.uniform(-1, 1) for _ in range(n)), rng.uniform(-.2, .05)) for _ in range(2))
        systems.append((f'random {k} constrained', 'constrained', columns, rhs, {**options, 'rows': rows}))
    return systems


def damping_zero_systems():
    """Undamped systems with columns of any norm, including far below 1.

    At damping 0 the damping metric multiplies nothing, so both solves must
    match the base bit for bit. The first entries are the review's two cases.
    """
    systems = [
        ('review case', 'bounded', [[1., 0.], [0., 1e-14]], [.2, 3e-15], {}),
        ('review case constrained', 'constrained', [[1., 0.], [0., 1e-14]], [.2, 3e-15], {}),
    ]
    rng = random.Random(2711)
    for k in range(20):
        n = rng.randint(2, 5)
        m = n+rng.randint(0, 3)
        columns = []
        for _ in range(n):
            raw = [rng.uniform(-1, 1) for _ in range(m)]
            norm = math.hypot(*raw)
            size = 10**rng.uniform(-16, 3)
            columns.append([v*size/norm for v in raw])
        rhs = [rng.uniform(-5, 5)*10**rng.uniform(-16, 0) for _ in range(m)]
        options = {}
        if rng.random() < .5:
            options['lower'] = [-rng.uniform(0, .5) for _ in range(n)]
            options['upper'] = [rng.uniform(0, .5) for _ in range(n)]
        systems.append((f'undamped {k} bounded', 'bounded', columns, rhs, dict(options)))
        rows = tuple((tuple(rng.uniform(-1, 1) for _ in range(n)), rng.uniform(-.2, .05)) for _ in range(2))
        systems.append((f'undamped {k} constrained', 'constrained', columns, rhs, {**options, 'rows': rows}))
    return systems


def solve_record(solve, columns, rhs, options):
    result = (bounded_least_squares if solve == 'bounded' else constrained_least_squares)(columns, rhs, **options)
    return {'status': result.status.value, 'iterations': result.iterations,
            'step': [v.hex() for v in result.step], 'optimality': result.optimality.hex(),
            'tolerance': result.tolerance.hex(), 'predicted_reduction': result.predicted_reduction.hex(),
            'scales': [v.hex() for v in result.scales]}


class FailFirstTests(unittest.TestCase):
    def test_near_zero_column_step_is_bounded_by_damping(self):
        # Coordinate 1's column has norm 1e-13. Its normal equation with D_1 = 1
        # is (1e-26 + damping) d_1 = 1e-13, so |d_1| <= |rhs·J_1| / damping.
        # The solve certifies its gradient only to its tolerance, which adds
        # tolerance / damping (rounding alone gives 2.2e-19 at damping 1e6).
        columns, rhs = [[1., 0.], [0., TINY]], [.3, 1.]
        previous = math.inf
        for damping in (1., 1e3, 1e6):
            for solve in (bounded_least_squares, constrained_least_squares):
                with self.subTest(solve=solve.__name__, damping=damping):
                    result = solve(columns, rhs, damping)
                    step = result.require_converged()
                    self.assertLessEqual(abs(step[1]), (TINY*1.+result.tolerance)/damping)
            self.assertLess(abs(step[1]), previous)
            previous = abs(step[1])

    def test_frozen_stall_point_step_shrinks_with_damping(self):
        from storybook.animation.maya_walk import fitting as F
        from storybook.animation.maya_walk.numerics import analytic_jacobian
        frozen = json.loads((HERE/'frozen-stall-point.json').read_text())
        space = F.TimingChart(F.PoseChart())
        objective = F.Objective(space, frozen['velocity_weight'], frozen['guide_weight'])
        x = list(frozen['values'])
        score, residuals = objective.score(x)
        self.assertEqual(score, frozen['score'])
        columns = analytic_jacobian(objective.score, x, residuals).require_resolved()
        margins, derivative = F.reach_linearization(objective, x)
        rows = F.reach_rows(margins, derivative.require_resolved())
        lower, upper = space.step_bounds(x)
        rhs = [-v for v in residuals]
        boxed = []
        for damping in DAMPINGS:
            box = bounded_least_squares(columns, rhs, damping, lower=lower, upper=upper)
            # The rows bind here, so the production step is the constrained one.
            self.assertFalse(rows_hold(box.require_converged(), rows))
            constrained = constrained_least_squares(columns, rhs, damping, lower=lower, upper=upper, rows=rows)
            with self.subTest(damping=damping):
                self.assertLess(_largest(constrained.require_converged()), 1e-2)
            boxed.append(_largest(box.step))
        self.assertEqual(boxed, sorted(boxed, reverse=True))
        self.assertEqual(len(set(boxed)), len(boxed))
        self.assertLess(boxed[-1], 1e-4)


class ScaleRuleTests(unittest.TestCase):
    def test_damping_metric_is_column_norm_floored_at_one(self):
        # Diagonal J: coordinate j's minimizer is J_j r_j / (J_j² + damping D_j²),
        # D_j = max(|J_j|, 1). The norms span 1e-14 to 10, so the floor binds
        # for some and not for others. Right-hand sides keep every step inside
        # the box, so the closed form is the answer.
        self.assertEqual(numerics.SCALE_FLOOR, 1.)
        diagonal = (1e-14, 1e-6, .3, 1., 4., 10.)
        rhs = (1e-15, 1e-7, .03, .1, .4, 1.)
        n = len(diagonal)
        columns = [[a if i == j else 0. for i in range(n)] for j, a in enumerate(diagonal)]
        for damping in (0., 1e-30, 1e-7, 1., 1e2, 1e6):
            expected = [a*r/(a*a+damping*max(a, 1.)**2) for a, r in zip(diagonal, rhs)]
            for solve in (bounded_least_squares, constrained_least_squares):
                with self.subTest(solve=solve.__name__, damping=damping):
                    result = solve(columns, list(rhs), damping)
                    for got, want in zip(result.require_converged(), expected):
                        self.assertAlmostEqual(got, want, delta=1e-12*max(1., abs(want)))
                    # The reported reduction charges damping·||D step||².
                    effect = [a*d for a, d in zip(diagonal, result.step)]
                    want = (2*sum(e*r for e, r in zip(effect, rhs))-sum(e*e for e in effect)
                            - damping*sum((max(a, 1.)*d)**2 for a, d in zip(diagonal, result.step)))
                    self.assertAlmostEqual(result.predicted_reduction, want, delta=1e-12*max(1., abs(want)))

    def test_equilibration_scales(self):
        # Ordinary columns keep their norm and a zero column keeps 1, at any
        # damping. A near-zero column is sized by its damped column's norm.
        columns = [[3., 4.], [0., 0.], [TINY, 0.], [.3, .4], [1., 0.]]
        for damping, near in ((0., (TINY, .5)), (4., (math.hypot(TINY, 2.), math.hypot(.5, 2.)))):
            expected = (5., 1., near[0], near[1], 1.)
            for solve in (bounded_least_squares, constrained_least_squares):
                with self.subTest(solve=solve.__name__, damping=damping):
                    self.assertEqual(solve(columns, [1., 1.], damping).scales, expected)

    def test_review_cases_converge_without_damping(self):
        # Both were rank deficient when one number did both jobs.
        for solve in (bounded_least_squares, constrained_least_squares):
            for damping, want in ((0., .3), (1e-30, 1e-14*3e-15/(1e-28+1e-30))):
                with self.subTest(solve=solve.__name__, damping=damping):
                    step = solve([[1., 0.], [0., 1e-14]], [.2, 3e-15], damping).require_converged()
                    self.assertAlmostEqual(step[0], .2, delta=1e-12)
                    self.assertAlmostEqual(step[1], want, delta=1e-12)
        step = bounded_step([[1., 0.], [0., 1e-28]], [.2, 3e-29]).require_converged()
        self.assertAlmostEqual(step[0], .2, delta=1e-12)
        self.assertAlmostEqual(step[1], .3, delta=1e-12)
        # A denormal column norm at damping 0: its damping weight would be
        # infinite, but no damping applies, so the solve matches the base.
        for solve in (bounded_least_squares, constrained_least_squares):
            with self.subTest(solve=solve.__name__, norm=1e-310):
                result = solve([[1., 0.], [0., 1e-310]], [.2, 3e-311])
                self.assertEqual(result.scales, (1., 1e-310))
                step = result.require_converged()
                self.assertAlmostEqual(step[1], .3, delta=1e-12)

    def test_damping_zero_matches_base_for_any_column_norm(self):
        golden = json.loads((HERE/'scale-floor-parity-undamped.json').read_text())
        systems = damping_zero_systems()
        self.assertEqual([name for name, *_ in systems], list(golden))
        below = 0
        for name, solve, columns, rhs, options in systems:
            below += any(math.hypot(*c) < 1. for c in columns)
            with self.subTest(name):
                self.assertEqual(solve_record(solve, columns, rhs, options), golden[name])
        self.assertGreater(below, len(systems)//2)

    def test_parity_with_base_for_norms_at_least_one_or_zero(self):
        golden = json.loads((HERE/'scale-floor-parity.json').read_text())
        systems = parity_systems()
        self.assertEqual([name for name, *_ in systems], list(golden))
        statuses = set()
        for name, solve, columns, rhs, options in systems:
            self.assertTrue(all(math.hypot(*c) >= 1. or not any(c) for c in columns), name)
            with self.subTest(name):
                record = solve_record(solve, columns, rhs, options)
                self.assertEqual(record, golden[name])
                statuses.add((solve, record['status']))
        # The golden set exercises converged results of both solves.
        self.assertIn(('bounded', 'converged'), statuses)
        self.assertIn(('constrained', 'converged'), statuses)


class ConstrainedTests(unittest.TestCase):
    columns = [[1., .5, 0.], [0., TINY, 0.], [.2, 0., 1.]]
    rhs = [.4, 1., -.3]

    def test_free_rows_give_the_bounded_step(self):
        for damping in (1e-3, 1., 1e3):
            with self.subTest(damping=damping):
                box = bounded_least_squares(self.columns, self.rhs, damping).require_converged()
                loose = ((tuple([1., 1., 1.]), -10.),)
                self.assertTrue(rows_hold(box, loose))
                result = constrained_least_squares(self.columns, self.rhs, damping, rows=loose)
                for got, want in zip(result.require_converged(), box):
                    self.assertAlmostEqual(got, want, delta=1e-9)

    def test_binding_row_on_near_zero_coordinate_certifies(self):
        # The row asks the near-zero coordinate to move at least 0.1 against damping.
        rows = (((0., 1., 0.), .1),)
        for damping in (1e-3, 1., 1e3):
            with self.subTest(damping=damping):
                result = constrained_least_squares(self.columns, self.rhs, damping, rows=rows)
                step = result.require_converged()
                self.assertLessEqual(result.optimality, result.tolerance)
                self.assertTrue(rows_hold(step, rows))
                self.assertAlmostEqual(step[1], .1, delta=1e-12)
                self.assertTrue(all(-.5 <= v <= .5 for v in step))

    def test_infeasible_rows_are_still_certified_infeasible(self):
        rows = (((0., 1., 0.), .6),)
        result = constrained_least_squares(self.columns, self.rhs, 1., rows=rows)
        self.assertIs(result.status, SolveStatus.INFEASIBLE)


class DampingZeroTests(unittest.TestCase):
    def test_minimizer_does_not_depend_on_scale_below_one(self):
        # Diagonal columns below 1: the least-squares solution is rhs_i / J_ii.
        columns, rhs = [[.5, 0.], [0., 1e-3]], [.1, 1e-4]
        step = bounded_least_squares(columns, rhs).require_converged()
        self.assertAlmostEqual(step[0], .2, delta=1e-12)
        self.assertAlmostEqual(step[1], .1, delta=1e-12)
        # Coupled columns below 1: the exact interior solution of J d = rhs.
        columns = [[.3, .1], [.2, .4]]
        expected = (.25, -.15)
        rhs = [columns[0][j]*expected[0]+columns[1][j]*expected[1] for j in range(2)]
        for got, want in zip(bounded_least_squares(columns, rhs).require_converged(), expected):
            self.assertAlmostEqual(got, want, delta=1e-12)

    def test_bounded_step_adapter_with_small_quadratic(self):
        matrix = [[.04, .01], [.01, .09]]
        expected = (.3, -.2)
        vector = [sum(a*b for a, b in zip(row, expected)) for row in matrix]
        for got, want in zip(bounded_step(matrix, vector).require_converged(), expected):
            self.assertAlmostEqual(got, want, delta=1e-10)


if __name__ == '__main__':
    unittest.main()
