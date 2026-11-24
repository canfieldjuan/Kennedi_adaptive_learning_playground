"""The step solver honors the leg's reach limit (contract maya-walk-reach-limit)."""
from contextlib import ExitStack
from dataclasses import dataclass
import itertools
import json
import math
from pathlib import Path
import random
import tempfile
import unittest
from unittest.mock import patch

from storybook.animation.maya_walk import fitting
from storybook.animation.maya_walk.differential import Dual
from storybook.animation.maya_walk.fitting import (
    PoseChart, TimingChart, Objective, admit_step, carry_start, reach_linearization, reach_rows,
    REACH_LIMIT, REACH_BACKOFF, DAMPING_START, StepVerdict)
from storybook.animation.maya_walk.kinematics import NativeGeometry
from storybook.animation.maya_walk.numerics import (
    BOUND_TOLERANCE, TRUST_LIMIT, SolveStatus, UnconvergedStep, analytic_jacobian, bounded_least_squares,
    constrained_least_squares, row_shortfall, rows_hold, _certificate)
from storybook.animation.maya_walk.spec import Side, THIGH_LENGTH, SHIN_LENGTH

HERE = Path(__file__).parent
REACH_STOP = HERE/'frozen-reach-stop.json'
FLAT_STOP = HERE/'frozen-flat-stop.json'
OUTER_STEP = HERE/'frozen-outer-step.json'
SLACK = BOUND_TOLERANCE*TRUST_LIMIT
IDENTITY = [[1., 0.], [0., 1.]]


def _linearize(objective, x):
    score, residuals = objective.score(x)
    columns = analytic_jacobian(objective.score, x, residuals).require_resolved()
    margins, derivative = reach_linearization(objective, x)
    return score, residuals, columns, margins, reach_rows(margins, derivative.require_resolved())


class FrozenReachStopTests(unittest.TestCase):
    """The carried fit's final point: it stopped on the hinge's tie on base 3d58321."""

    @classmethod
    def setUpClass(cls):
        cls.fixture = json.loads(REACH_STOP.read_text())
        cls.space = TimingChart(PoseChart())
        cls.objective = Objective(cls.space, 1., 0.)

    def test_the_fixture_is_the_carried_fit_under_the_current_chart(self):
        self.assertEqual(sorted(self.fixture), ['parameters', 'source_signature', 'values'])
        self.assertEqual([list(p) for p in self.space.parameters], self.fixture['parameters'])
        self.assertEqual(self.fixture['source_signature'], fitting.source_signature(True))

    def test_derivatives_resolve_and_a_step_keeping_every_leg_reachable_is_admitted(self):
        # Fail first: on base analytic_jacobian refuses every direction here
        # (nonsmooth, from the reach hinge's exact tie at frame 22.25).
        x = self.fixture['values']
        score, residuals, columns, margins, rows = _linearize(self.objective, x)
        self.assertEqual(score, 26734.496978721134)
        self.assertEqual(min(margins), 0.)
        update, _, receipts, solves = admit_step(self.objective, self.space, x, score, residuals, columns,
                                                 DAMPING_START, rows)
        self.assertIsNotNone(update)
        self.assertIs(receipts[-1].verdict, StepVerdict.ADMITTED)
        self.assertTrue(solves[-1]['constrained'])
        self.assertLess(update[1], score)
        after = self.objective.reach_margins(update[0])
        self.assertGreater(min(after), 0.)
        # The sample on the wall moved off it.
        wall = margins.index(0.)
        self.assertGreater(after[wall], 0.)


class ParityTests(unittest.TestCase):
    """Where no reach row binds, the box-only step is used unchanged."""

    def points(self):
        flat = json.loads(FLAT_STOP.read_text())
        outer = json.loads(OUTER_STEP.read_text())
        space = TimingChart(PoseChart(floor=0.))
        yield 'fourth fit', space, Objective(space, 1., 0.), flat['values'], 1065.0984973977909
        yield 'outer step', space, Objective(space, outer['velocity_weight'], outer['guide_weight']), \
            outer['values'], 167627.33977017563

    def test_no_attempt_runs_the_constrained_solve_and_steps_match_the_box_only_path(self):
        for name, space, objective, x, base_score in self.points():
            with self.subTest(name):
                score, residuals, columns, margins, rows = _linearize(objective, x)
                # Removing the dead hinge changes no score: these are base 3d58321's.
                self.assertEqual(score, base_score)
                self.assertGreater(min(margins), REACH_BACKOFF)
                with_rows = admit_step(objective, space, x, score, residuals, columns, DAMPING_START, rows)
                box_only = admit_step(objective, space, x, score, residuals, columns, DAMPING_START)
                self.assertEqual([s['constrained'] for s in with_rows[3]], [False]*len(with_rows[3]))
                self.assertEqual(with_rows[0], box_only[0])
                self.assertEqual(with_rows[1:3], box_only[1:3])

    def test_the_hinge_rows_were_zero_so_removing_them_leaves_the_solve_bit_identical(self):
        # On base each scheduled sample also appended the hinge: an exact zero
        # Jacobian row with a zero right-hand side wherever the point scored.
        for name, space, objective, x, _ in self.points():
            with self.subTest(name):
                score, residuals, columns, _, _ = _linearize(objective, x)
                extra = len(objective.schedule)
                lower, upper = space.step_bounds(x)
                now = bounded_least_squares(columns, [-v for v in residuals], DAMPING_START, lower=lower, upper=upper)
                base = bounded_least_squares([[*c, *[0.]*extra] for c in columns],
                                             [-v for v in residuals]+[0.]*extra, DAMPING_START,
                                             lower=lower, upper=upper)
                self.assertEqual(now, base)


class ConstrainedSolveTests(unittest.TestCase):
    """Known small problems; answers checked by hand."""

    def solve(self, rows, rhs=(1., 1.), columns=IDENTITY, **options):
        return constrained_least_squares(columns, list(rhs), rows=rows, **options)

    def assertStep(self, result, expected):
        self.assertIs(result.status, SolveStatus.CONVERGED)
        for got, want in zip(result.require_converged(), expected):
            self.assertAlmostEqual(got, want, delta=1e-14)

    def test_an_active_row_is_met_with_equality(self):
        # min |d-(1,1)|² with d0+d1 <= .6: the projection onto the row, (.3, .3).
        self.assertStep(self.solve([((-1., -1.), -.6)]), (.3, .3))

    def test_a_slack_row_leaves_the_box_only_optimum(self):
        result = self.solve([((-1., -1.), -5.)])
        box = bounded_least_squares(IDENTITY, [1., 1.]).require_converged()
        self.assertStep(result, box)
        self.assertLessEqual(max(abs(a-b) for a, b in zip(result.step, box)), SLACK)

    def test_a_row_and_a_bound_both_active(self):
        # d0-d1 >= .3: d0 stops at the box (.5) and the row then gives d1 = .2.
        self.assertStep(self.solve([((1., -1.), .3)]), (.5, .2))

    def test_duplicate_rows_give_the_same_answer(self):
        self.assertStep(self.solve([((-1., -1.), -.6)]*3), (.3, .3))
        self.assertStep(self.solve([((-1., -1.), -.6), ((-2., -2.), -1.2)]), (.3, .3))

    def test_scaled_columns_and_damping_keep_the_real_units(self):
        # Column scaling is internal: the answer is in real units. With
        # damping 1 on the normalized coordinate the unconstrained step is
        # (1/(1+1), 1/(1+1)) scaled back; the row d1 <= .1 binds on d1 only.
        columns = [[4., 0.], [0., .25]]
        free = bounded_least_squares(columns, [1., 1.], 1.).require_converged()
        result = constrained_least_squares(columns, [1., 1.], 1., rows=[((0., -1.), -.1)])
        self.assertStep(result, (free[0], .1))

    def test_an_infeasible_set_is_certified_and_has_no_step(self):
        for name, rows in (('past the box', [((1., 0.), .7)]),
                           ('two rows apart', [((1., 0.), .3), ((-1., 0.), -.2)]),
                           ('zero row with positive bound', [((0., 0.), 1e-6)])):
            with self.subTest(name):
                result = self.solve(rows)
                self.assertIs(result.status, SolveStatus.INFEASIBLE)
                self.assertEqual(result.step, (0., 0.))
                with self.assertRaises(UnconvergedStep):
                    result.require_converged()

    def test_a_zero_row_that_always_holds_is_ignored(self):
        self.assertStep(self.solve([((0., 0.), -1.)]), (.5, .5))

    def test_a_row_reaching_exactly_the_box_corner_is_feasible(self):
        # d0+d1 >= 1 is met only at (.5, .5): feasible, not infeasible.
        self.assertStep(self.solve([((1., 1.), 1.)], rhs=(0., 0.)), (.5, .5))

    def test_random_problems_meet_their_rows_and_beat_every_feasible_grid_point(self):
        rng = random.Random(184)
        grid = [i/40-.5 for i in range(41)]
        for trial in range(40):
            columns = [[rng.uniform(-2, 2) for _ in range(3)] for _ in range(2)]
            rhs = [rng.uniform(-2, 2) for _ in range(3)]
            rows = [((rng.uniform(-1, 1), rng.uniform(-1, 1)), rng.uniform(-.4, .2)) for _ in range(rng.randint(1, 3))]
            result = constrained_least_squares(columns, rhs, 1e-3, rows=rows)
            with self.subTest(trial=trial):
                if result.status is SolveStatus.INFEASIBLE:
                    self.assertFalse(any(rows_hold((a, b), rows) for a, b in itertools.product(grid, grid)))
                    continue
                step = result.require_converged()
                self.assertTrue(rows_hold(step, rows))

                def cost(d):
                    r = [math.fsum(c[j]*v for c, v in zip(columns, d))-b for j, b in enumerate(rhs)]
                    return math.fsum(v*v for v in r)+1e-3*math.fsum((v*math.hypot(*c))**2 for v, c in zip(d, columns))
                best = min((cost(p) for p in itertools.product(grid, grid) if rows_hold(p, rows)), default=None)
                if best is not None:
                    self.assertLessEqual(cost(step), best+1e-12)

    def test_malformed_rows_are_refused(self):
        for rows in ([((1.,), 0.)], [((1., 1.),)], [((math.nan, 1.), 0.)], [((1., 1.), math.inf)],
                     ((1., 1.), 0.), 'rows'):
            with self.subTest(rows=rows), self.assertRaises(ValueError):
                self.solve(rows)


class CertificateTests(unittest.TestCase):
    """Each clause of the constrained solve's certificate, probed on both sides."""

    def test_row_feasibility_is_judged_within_the_box_slack(self):
        rows = [((2., 0.), .5)]  # d0 >= .25, measured along the unit normal
        self.assertTrue(rows_hold((.25-.9*SLACK, 0.), rows))
        self.assertFalse(rows_hold((.25-1.1*SLACK, 0.), rows))
        self.assertEqual(row_shortfall((.3, 0.), rows), 0.)
        self.assertEqual(row_shortfall((0., 0.), [((0., 0.), 1.)]), math.inf)

    def certify(self, y, multiplier, rows=None):
        # min |y-(1,1)|² on the box [-.5, .5]² with the row -y0-y1 >= -.6.
        rows = rows or [((-1/math.sqrt(2), -1/math.sqrt(2)), -.6/math.sqrt(2), (-1., -1.), -.6)]
        return _certificate(IDENTITY, [1., 1.], 0., list(y), [-.5, -.5], [.5, .5], rows, [multiplier],
                            tuple(y), SLACK)

    def test_the_true_multiplier_passes(self):
        # Gradient (y - rhs) = (-.7, -.7) = μ c with c = -(1,1)/√2: μ = .7√2.
        stationarity, signs, complementary = self.certify((.3, .3), .7*math.sqrt(2))
        self.assertLess(stationarity, 1e-15)
        self.assertTrue(signs and complementary)

    def test_a_negative_multiplier_fails_the_sign_clause(self):
        _, signs, _ = self.certify((.3, .3), -.7*math.sqrt(2))
        self.assertFalse(signs)

    def test_a_wrong_multiplier_fails_stationarity(self):
        stationarity, _, _ = self.certify((.3, .3), .5)
        self.assertGreater(stationarity, 1e-3)

    def test_a_multiplier_on_a_row_away_from_equality_breaks_complementarity(self):
        _, _, complementary = self.certify((.2, .3), .7*math.sqrt(2))
        self.assertFalse(complementary)
        _, _, complementary = self.certify((.3-.4*SLACK, .3-.4*SLACK), .7*math.sqrt(2))
        self.assertTrue(complementary)

    def test_a_coordinate_on_its_bound_may_push_out_of_the_box_only(self):
        # rhs (1, 1), no row: at (.5, .5) the gradient points out of the box.
        stationarity, _, _ = _certificate(IDENTITY, [1., 1.], 0., [.5, .5], [-.5, -.5], [.5, .5], [], [],
                                          (.5, .5), SLACK)
        self.assertEqual(stationarity, 0.)
        stationarity, _, _ = _certificate(IDENTITY, [-1., 1.], 0., [.5, .5], [-.5, -.5], [.5, .5], [], [],
                                          (.5, .5), SLACK)
        self.assertEqual(stationarity, 1.5)

    def test_a_coordinate_on_its_lower_bound_may_push_out_of_the_box_only(self):
        stationarity, _, _ = _certificate(IDENTITY, [-1., -1.], 0., [-.5, -.5], [-.5, -.5], [.5, .5], [], [],
                                          (-.5, -.5), SLACK)
        self.assertEqual(stationarity, 0.)
        stationarity, _, _ = _certificate(IDENTITY, [1., -1.], 0., [-.5, -.5], [-.5, -.5], [.5, .5], [], [],
                                          (-.5, -.5), SLACK)
        self.assertEqual(stationarity, 1.5)

    def test_every_failing_certificate_clause_makes_the_solve_a_numerical_failure(self):
        rows = [((-1., -1.), -.6)]
        self.assertIs(constrained_least_squares(IDENTITY, [1., 1.], rows=rows).status, SolveStatus.CONVERGED)
        for name, verdict in (('stationarity', (1., True, True)), ('signs', (0., False, True)),
                              ('complementarity', (0., True, False))):
            with self.subTest(name), \
                    patch('storybook.animation.maya_walk.numerics._certificate', return_value=verdict):
                result = constrained_least_squares(IDENTITY, [1., 1.], rows=rows)
                self.assertIs(result.status, SolveStatus.NUMERICAL_FAILURE)
                self.assertEqual(result.step, (0., 0.))


class ReachRowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.space = TimingChart(PoseChart())
        cls.objective = Objective(cls.space, 1., 0.)
        cls.x = json.loads(REACH_STOP.read_text())['values']

    def test_the_named_limit_is_the_guard_threshold(self):
        self.assertEqual(REACH_LIMIT, THIGH_LENGTH+SHIN_LENGTH-1e-5)
        self.assertEqual(REACH_BACKOFF, 1e-6)

    def test_margins_match_the_guard_distance_on_floats_and_duals(self):
        margins = self.objective.reach_margins(self.x)
        model = NativeGeometry(self.space.build(self.x))
        expected = []
        for t in self.objective.schedule:
            points, _, target = model.at(t, Side.NEAR)
            expected.append(THIGH_LENGTH+SHIN_LENGTH-1e-5-math.dist(points['hip'], target))
        self.assertEqual(margins, expected)
        duals = self.objective.reach_margins([Dual.variable(v, i, len(self.x)) for i, v in enumerate(self.x)])
        self.assertEqual([d.value for d in duals], margins)

    def test_the_guard_refuses_through_the_margin_owner(self):
        self.assertIsNotNone(self.objective.score(self.x)[1])
        shifted = lambda points, target: REACH_LIMIT-fitting.dmath.dist(points['hip'], target)-1e-3
        with patch(fitting.__name__+'.reach_margin', side_effect=shifted):
            with self.assertRaisesRegex(ValueError, 'strictly reachable'):
                self.objective.residuals(self.x)
            self.assertLess(min(self.objective.reach_margins(self.x)), 0.)

    def test_the_guard_admits_a_zero_margin_and_refuses_any_negative_one(self):
        for margin, scores in ((0., True), (5e-324, True), (-5e-324, False), (-1e-12, False)):
            with self.subTest(margin=margin), patch(fitting.__name__+'.reach_margin', return_value=margin):
                self.assertIs(self.objective.score(self.x)[1] is not None, scores)

    def test_the_row_sign_admits_growing_the_margin_and_refuses_shrinking_it(self):
        # One sample on the wall (m = 0) whose margin grows with d0.
        rows = reach_rows([0.], [(1.,), (0.,)])
        self.assertEqual(rows, (((1., 0.), REACH_BACKOFF),))
        self.assertTrue(rows_hold((2*REACH_BACKOFF, 0.), rows))
        self.assertFalse(rows_hold((-2*REACH_BACKOFF, 0.), rows))
        self.assertFalse(rows_hold((0., 0.), rows))
        # A margin well inside keeps its room: m + G·d >= backoff.
        rows = reach_rows([.01], [(1.,), (0.,)])
        self.assertTrue(rows_hold((-.01+2*REACH_BACKOFF, 0.), rows))
        self.assertFalse(rows_hold((-.01, 0.), rows))

    def test_a_start_below_the_backoff_forces_a_step_that_grows_its_wall_margins(self):
        fixture = json.loads(FLAT_STOP.read_text())
        x, drop = carry_start(fixture, self.space, self.objective)
        self.assertGreater(drop, 0.)
        score, residuals, columns, margins, rows = _linearize(self.objective, x)
        below = [k for k, m in enumerate(margins) if m < REACH_BACKOFF]
        self.assertTrue(below)
        update, _, receipts, solves = admit_step(self.objective, self.space, x, score, residuals, columns,
                                                 DAMPING_START, rows)
        # Curvature may refuse a constrained step; damping then shortens it.
        self.assertIs(receipts[-1].verdict, StepVerdict.ADMITTED)
        self.assertTrue(solves[0]['constrained'])
        after = self.objective.reach_margins(update[0])
        for k in below:
            self.assertGreater(after[k], margins[k])
        self.assertGreater(min(after), 0.)


@dataclass(frozen=True)
class _Source:
    values: tuple


class _Chart:
    """Two free coordinates standing in for the pose chart; no gait code runs."""
    initial = [.15, -.15]
    parameters = [('synthetic', 0), ('synthetic', 1)]

    def __init__(self, seed=None):
        pass

    def build(self, values):
        return _Source(tuple(values))

    def step_bounds(self, values):
        return [-.5]*len(values), [.5]*len(values)

    def project(self, values):
        return values


def _synthetic_fit(objective, iterations):
    """Run fit() on the two-coordinate chart. Returns (record, saved record)."""
    with ExitStack() as stack:
        folder = Path(stack.enter_context(tempfile.TemporaryDirectory()))
        stack.enter_context(patch(fitting.__name__+'.PoseChart', _Chart))
        stack.enter_context(patch(fitting.__name__+'.Objective', return_value=objective))
        geometry = stack.enter_context(patch(fitting.__name__+'.NativeGeometry'))
        geometry.return_value.assess.return_value = {'status': 'FAIL', 'violation_counts': {'synthetic': 1}}
        output = folder/'fit.json'
        record = fitting.fit(output, iterations=iterations)
        return record, json.loads(output.read_text())


class _OnTheWall:
    """Two coordinates, smooth residuals, and one reach sample that cannot move."""
    calls = 0

    def score(self, x):
        return sum(v*v for v in x), list(x)

    def reach_margins(self, x):
        return [0.]  # On the wall with a zero derivative: no step can open the backoff.


class InfeasibleFitTests(unittest.TestCase):
    def test_an_infeasible_solve_is_unsolved_and_ends_the_fit(self):
        record, saved = _synthetic_fit(_OnTheWall(), iterations=5)
        attempts = saved['numerics']['attempts']
        self.assertEqual(len(attempts), 1)
        self.assertEqual(attempts[0]['verdict'], 'unsolved')
        self.assertEqual(attempts[0]['solve_status'], 'infeasible')
        self.assertTrue(attempts[0]['constrained'])
        self.assertEqual(record['termination'], 'linear_solve_failed')
        self.assertEqual(record['iteration'], 0)
        self.assertEqual(saved['numerics']['reach_differences'][0]['status'], 'analytic')

    def test_an_unresolved_margin_derivative_ends_the_fit_with_its_receipt(self):
        from storybook.animation.maya_walk import differential as dmath

        class Kinked(_OnTheWall):
            def reach_margins(self, x):
                return [dmath.maximum(dmath.primal(x[0]), x[0])+1.]
        record, saved = _synthetic_fit(Kinked(), iterations=5)
        self.assertEqual(record['termination'], 'derivatives_unresolved')
        self.assertEqual(saved['numerics']['attempts'], [])
        self.assertEqual(saved['numerics']['reach_differences'][0]['status'], 'unresolved')


if __name__ == '__main__':
    unittest.main()
