"""Known-solution numerical regressions; no motion fitting in these tests."""
from contextlib import ExitStack
from dataclasses import dataclass
import json
import math
from storybook.animation.maya_walk import differential as dmath
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

from storybook.animation.maya_walk.fitting import bounded_step, fit
from storybook.animation.maya_walk.numerics import (
    bounded_least_squares, finite_difference, DerivativeStatus, UnreliableJacobian)

FITTING = 'storybook.animation.maya_walk.fitting'
FAILED_GAIT = {'status': 'FAIL', 'violation_counts': {'synthetic': 1}}


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

    def project(self, values):
        return values


class _Arctangent:
    """r_i = atan(10 x_i). From 0.15 the solved step overshoots the root."""
    def __init__(self):
        self.calls = 0

    def score(self, x):
        self.calls += 1
        r = [dmath.atan(10*v) for v in x]
        return sum(v*v for v in r), r


class _Linear:
    """r = x. The linear model is exact, so actual equals predicted."""
    calls = 0

    def score(self, x):
        return sum(v*v for v in x), list(x)


def _strict(text):
    def reject(value):
        raise ValueError(value)
    return json.loads(text, parse_constant=reject)


def _synthetic_fit(objective, iterations=1, derivative=None, prior=None, solver=None):
    """Run fit() on the two-coordinate chart. Returns (record, saved record)."""
    with ExitStack() as stack:
        folder = Path(stack.enter_context(tempfile.TemporaryDirectory()))
        stack.enter_context(patch(FITTING+'.PoseChart', _Chart))
        stack.enter_context(patch(FITTING+'.Objective', return_value=objective))
        geometry = stack.enter_context(patch(FITTING+'.NativeGeometry'))
        geometry.return_value.assess.return_value = FAILED_GAIT
        if derivative is not None:
            stack.enter_context(patch(FITTING+'.analytic_jacobian', return_value=derivative))
        if solver is not None:
            stack.enter_context(patch(FITTING+'.bounded_least_squares', **solver))
        resume = None
        if prior is not None:
            resume = folder/'prior.json'
            resume.write_text(json.dumps(prior))
        output = folder/'fit.json'
        record = fit(output, iterations=iterations, resume=resume)
        return record, _strict(output.read_text())


def _raised(damping, attempts):
    for _ in range(attempts):
        damping *= 5
    return damping


class NumericalTests(unittest.TestCase):
    def test_nearly_duplicate_interior_directions_reach_known_solution(self):
        epsilon = 1e-6
        matrix = [[1., 1.-epsilon], [1.-epsilon, 1.]]
        expected = [.25, -.25]
        rhs = [sum(a*b for a,b in zip(row,expected)) for row in matrix]
        actual = bounded_step(matrix, rhs).require_converged()
        for got, want in zip(actual, expected):
            self.assertAlmostEqual(got, want, delta=1e-6)

    def test_scaled_columns_preserve_original_box_and_known_solution(self):
        from storybook.animation.maya_walk.numerics import bounded_least_squares
        for scales in ((1.,1.), (1e-8,1e8), (1e8,1e-8)):
            for expected in ((.25,-.25),(.5,-.5)):
                columns=[[scales[0],0.],[0.,scales[1]]]
                result=bounded_least_squares(columns,[s*v for s,v in zip(scales,expected)])
                self.assertLessEqual(result.optimality,result.tolerance)
                for actual,want in zip(result.require_converged(),expected):
                    self.assertAlmostEqual(actual,want,delta=1e-9)
        # Desired unconstrained steps exceed opposite box faces.
        result=bounded_least_squares([[1e-8,0.],[0.,1e8]],[1e-8,-1e8])
        self.assertEqual(result.require_converged(),(.5,-.5))

    def test_damping_resolves_duplicate_and_zero_columns(self):
        from storybook.animation.maya_walk.numerics import bounded_least_squares,SolveStatus
        columns=[[1.,2.],[1.,2.],[0.,0.]]
        rejected=bounded_least_squares(columns,[.4,.8])
        self.assertEqual(rejected.status,SolveStatus.RANK_DEFICIENT)
        accepted=bounded_least_squares(columns,[.4,.8],damping=1e-7)
        step=accepted.require_converged()
        self.assertAlmostEqual(step[0],.2,delta=1e-7)
        self.assertAlmostEqual(step[1],.2,delta=1e-7)
        self.assertEqual(step[2],0.)
        self.assertEqual(bounded_least_squares([[0.],[0.]],[1.],damping=.1).require_converged(),(0.,0.))

    def test_iteration_cap_is_explicit_and_unusable(self):
        from storybook.animation.maya_walk.numerics import SolveStatus,UnconvergedStep
        result=bounded_step([[2.,1.],[1.,2.]],[4.,1.],max_iterations=1)
        self.assertEqual(result.status,SolveStatus.ITERATION_LIMIT)
        self.assertGreater(result.optimality,result.tolerance)
        with self.assertRaises(UnconvergedStep):result.require_converged()

    def test_invalid_and_falsy_numerical_inputs_rejected(self):
        import math
        from storybook.animation.maya_walk.numerics import bounded_least_squares
        for name,values in {
            'limit':(0,False,'',-1,math.nan,math.inf),
            'damping':(False,'',-1,math.nan,math.inf),
            'max_iterations':(0,False,'',1.5,10001),
            'tolerance':(0,False,'',-1,1e-5,math.nan,math.inf),
        }.items():
            for value in values:
                with self.subTest(name=name,value=value),self.assertRaises(ValueError):
                    bounded_least_squares([[1.]],[1.],**{name:value})
        for columns,rhs in (([],[1.]),([[1.]],[]),([[1.],[1.,2.]],[1.]),
                            ([[False]],[1.]),([[1.]],[math.nan])):
            with self.subTest(columns=columns,rhs=rhs),self.assertRaises(ValueError):
                bounded_least_squares(columns,rhs)
        for matrix in ([[1.,2.],[0.,1.]],[[1.,2.],[2.,1.]],[[0.]],[[math.nan]]):
            with self.subTest(matrix=matrix),self.assertRaises(ValueError):
                bounded_step(matrix,[0.]*len(matrix))
        self.assertEqual(bounded_least_squares([[1.]],[0.],damping=0.,max_iterations=1).require_converged(),(0.,))

    def test_random_known_kkt_solutions_on_both_bound_faces(self):
        import random
        rng=random.Random(714)
        # A=I+u*u^T is SPD. Manufacture a solution with correct KKT signs;
        # this independently checks release of wrongly active coordinates.
        for _ in range(30):
            n=6;u=[rng.uniform(-2,2) for _ in range(n)]
            matrix=[[u[i]*u[j]+(i==j) for j in range(n)] for i in range(n)]
            expected=[rng.choice((-.5,.5,rng.uniform(-.4,.4))) for _ in range(n)]
            gradient=[rng.uniform(.1,2)*(-1 if v==.5 else 1) if abs(v)==.5 else 0. for v in expected]
            rhs=[sum(a*b for a,b in zip(row,expected))-g for row,g in zip(matrix,gradient)]
            result=bounded_step(matrix,rhs)
            self.assertLessEqual(result.optimality,result.tolerance)
            for actual,want in zip(result.require_converged(),expected):
                self.assertAlmostEqual(actual,want,delta=1e-8)

    def test_unconverged_step_never_reaches_objective(self):
        from unittest.mock import Mock
        from storybook.animation.maya_walk.fitting import trial_step
        from storybook.animation.maya_walk.numerics import UnconvergedStep
        result=bounded_step([[2.,1.],[1.,2.]],[4.,1.],max_iterations=1)
        objective=Mock();space=Mock()
        with self.assertRaises(UnconvergedStep):
            trial_step(objective,space,[0.,0.],1.,[1.,1.],((1.,0.),(0.,1.)),result,.05)
        objective.score.assert_not_called();space.project.assert_not_called()

    def test_adaptive_differences_and_domain_boundaries(self):
        import math
        from storybook.animation.maya_walk.numerics import finite_difference,DerivativeStatus
        def score(x):
            r=[math.sin(x[0]),1e-10*math.exp(x[1])]
            return sum(v*v for v in r),r
        _,r=score([.2,.3]);result=finite_difference(score,[.2,.3],r)
        columns=result.require_resolved()
        self.assertAlmostEqual(columns[0][0],math.cos(.2),delta=1e-8)
        self.assertAlmostEqual(columns[1][1],1e-10*math.exp(.3),delta=1e-18)
        for sign,status in ((1,DerivativeStatus.FORWARD),(-1,DerivativeStatus.BACKWARD)):
            def boundary(x):return (sum(v*v for v in x),x) if sign*x[0]>=0 else (math.inf,None)
            result=finite_difference(boundary,[0.],[0.])
            self.assertEqual(result.differences[0].status,status)
            self.assertEqual(result.require_resolved(),((1.,),))

    def test_unresolved_or_malformed_derivatives_cannot_be_used(self):
        import math
        from storybook.animation.maya_walk.numerics import finite_difference,DerivativeStatus,UnreliableJacobian
        for score in (lambda x:(math.inf,None),lambda x:(1.,[1. if x[0]>0 else -1.])):
            result=finite_difference(score,[0.],[0.])
            self.assertEqual(result.differences[0].status,DerivativeStatus.UNRESOLVED)
            with self.assertRaises(UnreliableJacobian):result.require_resolved()
        for rhs in ([0.,0.],[math.nan],[False]):
            with self.assertRaises(ValueError):finite_difference(lambda x:(0.,rhs),[0.],[0.])

    def test_fitter_records_failed_solve_without_parameter_trial(self):
        import json,tempfile
        from pathlib import Path
        from unittest.mock import patch,Mock
        from storybook.animation.maya_walk.fitting import fit,PoseChart
        from storybook.animation.maya_walk.numerics import finite_difference
        # Synthetic caller test, never a gait fit: all geometry and derivatives
        # are mocked, and objective is allowed only the initial evaluation.
        chart=PoseChart();n=len(chart.initial)
        derivative=finite_difference(lambda x:(0.,x),[0.]*n,[0.]*n)
        bad=bounded_step([[2.,1.],[1.,2.]],[4.,1.],max_iterations=1)
        objective=Mock();objective.score.return_value=(1.,[1.]);objective.calls=1
        report={'status':'FAIL','violation_counts':{'synthetic':1}}
        with tempfile.TemporaryDirectory() as folder, \
             patch('storybook.animation.maya_walk.fitting.Objective',return_value=objective), \
             patch('storybook.animation.maya_walk.fitting.analytic_jacobian',return_value=derivative), \
             patch('storybook.animation.maya_walk.fitting.bounded_least_squares',return_value=bad), \
             patch('storybook.animation.maya_walk.fitting.NativeGeometry') as geometry:
            geometry.return_value.assess.return_value=report
            output=Path(folder)/'test.json';result=fit(output,iterations=1)
            self.assertEqual(result['termination'],'linear_solve_failed')
            self.assertEqual(result['values'],chart.initial)
            self.assertEqual(json.loads(output.read_text())['termination'],'linear_solve_failed')
            objective.score.assert_called_once_with(chart.initial)
            attempts=result['numerics']['attempts']
            self.assertEqual([a['verdict'] for a in attempts],['unsolved']*9)
            self.assertEqual({a['solve_status'] for a in attempts},{'iteration_limit'})
            self.assertEqual([a['damping'] for a in attempts],[_raised(.05,k) for k in range(9)])
            self.assertEqual(result['damping'],_raised(.05,9))


    def test_false_convergence_certificate_is_unrepresentable(self):
        from dataclasses import replace
        from storybook.animation.maya_walk.numerics import SolveStatus
        result=bounded_step([[2.,1.],[1.,2.]],[4.,1.],max_iterations=1)
        with self.assertRaises(ValueError):replace(result,status=SolveStatus.CONVERGED)
        with self.assertRaises(ValueError):replace(result,status='converged')

    def test_fitter_stops_and_writes_strict_json_on_unresolved_derivative(self):
        import json,math,tempfile
        from pathlib import Path
        from unittest.mock import patch,Mock
        from storybook.animation.maya_walk.fitting import fit,PoseChart
        from storybook.animation.maya_walk.numerics import finite_difference
        chart=PoseChart();unresolved=finite_difference(lambda x:(math.inf,None),[0.],[0.])
        objective=Mock();objective.score.return_value=(1.,[1.]);objective.calls=1
        with tempfile.TemporaryDirectory() as folder, \
             patch('storybook.animation.maya_walk.fitting.Objective',return_value=objective), \
             patch('storybook.animation.maya_walk.fitting.analytic_jacobian',return_value=unresolved), \
             patch('storybook.animation.maya_walk.fitting.bounded_least_squares') as solver, \
             patch('storybook.animation.maya_walk.fitting.NativeGeometry') as geometry:
            geometry.return_value.assess.return_value={'status':'FAIL','violation_counts':{'synthetic':1}}
            output=Path(folder)/'test.json';result=fit(output,iterations=1)
            self.assertEqual(result['termination'],'derivatives_unresolved')
            self.assertEqual(result['values'],chart.initial)
            # parse_constant rejects NaN/Infinity extension tokens.
            def reject(value):raise ValueError(value)
            self.assertEqual(json.loads(output.read_text(),parse_constant=reject)['termination'],'derivatives_unresolved')
            objective.score.assert_called_once_with(chart.initial);solver.assert_not_called()


    def test_frozen_derivative_stop_direction_resolves_within_trust_bound(self):
        # Under the old pointwise objective this direction needed probes > .1;
        # the fine-interval objective resolves it at the first probe. Probe
        # widening itself is covered by the synthetic ZeroResponseTests.
        import json
        from pathlib import Path
        from storybook.animation.maya_walk.fitting import PoseChart,TimingChart,Objective
        from storybook.animation.maya_walk.numerics import finite_difference
        fixture=json.loads(Path(__file__).with_name('frozen-derivative-stop.json').read_text())
        space=TimingChart(PoseChart());objective=Objective(space,guide_weight=0.)
        values=fixture['values'];index=fixture['unresolved_coordinate']
        self.assertEqual(list(space.parameters[index]),fixture['parameter'])
        visited=[]
        def score(coordinate):
            changed=values[:];changed[index]=coordinate[0]
            visited.append(abs(changed[index]-values[index]))
            return objective.score(changed)
        _,residuals=score([values[index]])
        result=finite_difference(score,[values[index]],residuals)
        result.require_resolved()
        self.assertLessEqual(max(visited),.5+1e-12)
        self.assertLessEqual(result.differences[0].relative_error,.05)


    def test_probe_ladder_obeys_closed_positive_bound(self):
        import math
        from storybook.animation.maya_walk.numerics import _probe_sizes,TRUST_LIMIT,finite_difference
        for limit in (1e-6,.1,TRUST_LIMIT):
            sizes=list(_probe_sizes(limit))
            self.assertGreater(min(sizes),0.)
            self.assertEqual(max(sizes),limit)
            self.assertLess(len(sizes),30)
        for limit in (0.,False,'',-1.,math.nan,math.inf):
            with self.subTest(limit=limit),self.assertRaises(ValueError):
                finite_difference(lambda x:(0.,x),[0.],[0.],limit=limit)


class StepAdmissionTests(unittest.TestCase):
    """Outer step admission and damping. Synthetic, except the frozen fixture."""

    def test_overshooting_step_is_refused_and_damping_is_not_lowered(self):
        record, saved = _synthetic_fit(_Arctangent())
        # Regression: the old policy cut this step in half until the score
        # dropped, accepted it, then halved damping from 0.05 to 0.025.
        self.assertGreaterEqual(record['damping'], .05)
        attempts = record['numerics']['attempts']
        self.assertEqual([a['verdict'] for a in attempts], ['no_decrease', 'admitted'])
        self.assertEqual([a['damping'] for a in attempts], [.05, .25])
        self.assertTrue(.25 <= attempts[1]['ratio'] < .75, attempts[1])
        self.assertEqual(record['damping'], .25)
        self.assertAlmostEqual(record['score'], 2*math.atan(1.5)**2-attempts[1]['actual'], delta=1e-12)
        self.assertEqual(saved['numerics']['attempts'], attempts)

    def test_synthetic_nonlinear_fit_converges_and_stops_as_no_descent(self):
        record, saved = _synthetic_fit(_Arctangent(), iterations=40)
        self.assertLess(record['score'], 1e-9)
        self.assertEqual(record['termination'], 'no_descent')
        self.assertEqual(saved['termination'], 'no_descent')
        self.assertEqual({a['verdict'] for a in saved['numerics']['attempts']}, {'no_decrease'})

    def test_next_damping_follows_every_row_of_the_policy_table(self):
        from storybook.animation.maya_walk.fitting import StepReceipt, StepVerdict, next_damping
        for verdict in StepVerdict:
            if verdict is not StepVerdict.ADMITTED:
                with self.subTest(verdict=verdict):
                    self.assertEqual(next_damping(StepReceipt(.2, verdict)), 1.)

        def admitted(damping, ratio):
            return StepReceipt(damping, StepVerdict.ADMITTED, ratio, 1.)
        for ratio, factor in ((1e-9, 5), (math.nextafter(.25, 0), 5), (.25, 1), (.5, 1),
                              (math.nextafter(.75, 0), 1), (.75, .5), (1., .5), (40., .5)):
            with self.subTest(ratio=ratio):
                self.assertEqual(admitted(.2, ratio).ratio, ratio)
                self.assertEqual(next_damping(admitted(.2, ratio)), .2*factor)
        # Lowering stops at the existing floor.
        self.assertEqual(next_damping(admitted(4e-7, 1.)), 2e-7)
        self.assertEqual(next_damping(admitted(1.5e-7, 1.)), 1e-7)
        self.assertEqual(next_damping(admitted(1e-7, 1.)), 1e-7)

    def test_admitted_receipt_cannot_hold_a_step_that_fails_admission(self):
        from storybook.animation.maya_walk.fitting import StepReceipt, StepVerdict
        self.assertEqual(StepReceipt(.05, StepVerdict.ADMITTED, 2e-10, 1.).ratio, 2e-10)
        for actual, predicted in ((1e-10, 1.), (0., 1.), (-1., 1.), (None, 1.), (1., 0.),
                                  (1., -1.), (1., None), (1., 5e-324)):
            with self.subTest(actual=actual, predicted=predicted), self.assertRaises(ValueError):
                StepReceipt(.05, StepVerdict.ADMITTED, actual, predicted)
        for verdict in StepVerdict:
            for bad in (math.nan, math.inf, -math.inf, True, '1'):
                with self.subTest(verdict=verdict, bad=bad):
                    with self.assertRaises(ValueError):
                        StepReceipt(.05, verdict, bad, 1.)
                    with self.assertRaises(ValueError):
                        StepReceipt(.05, verdict, 1., bad)
        for damping in (0., -1., math.nan, math.inf, None, False, ''):
            with self.subTest(damping=damping), self.assertRaises(ValueError):
                StepReceipt(damping, StepVerdict.NO_DECREASE)
        with self.assertRaises(ValueError):
            StepReceipt(.05, 'admitted', 1., 1.)
        rejected = StepReceipt(.05, StepVerdict.NO_DECREASE, -2., 4.)
        self.assertEqual(rejected.ratio, -.5)
        self.assertIsNone(StepReceipt(.05, StepVerdict.OUT_OF_DOMAIN, None, 4.).ratio)
        self.assertIsNone(StepReceipt(.05, StepVerdict.NON_POSITIVE_PREDICTION, 1., 0.).ratio)

    def _trial(self, value, after=(0.,), *, score=1., residuals=(-1.,), columns=((1.,),), rhs=(1.,), project=None):
        """One coordinate at 2.0; the solved step is +0.5 unless rhs is changed."""
        from storybook.animation.maya_walk.fitting import trial_step
        solution = bounded_least_squares([[1.]], list(rhs))
        objective = Mock()
        objective.score.return_value = (value, None if after is None else list(after))
        space = Mock()
        space.project.side_effect = project or (lambda values: values)
        receipt, update = trial_step(objective, space, [2.], score, list(residuals), columns, solution, .05)
        # The step is scored exactly once: there is no shortened retry.
        objective.score.assert_called_once()
        space.project.assert_called_once_with([2.+solution.step[0]])
        self.assertEqual(receipt.damping, .05)
        return receipt, update, objective

    def test_full_step_is_scored_once_and_admitted_with_its_receipt(self):
        from storybook.animation.maya_walk.fitting import StepVerdict
        receipt, update, objective = self._trial(.5)
        self.assertIs(receipt.verdict, StepVerdict.ADMITTED)
        self.assertEqual((receipt.actual, receipt.predicted, receipt.ratio), (.5, .75, .5/.75))
        self.assertEqual(update, ([2.5], .5, [0.]))
        objective.score.assert_called_once_with([2.5])

    def test_prediction_uses_the_displacement_that_was_evaluated(self):
        from storybook.animation.maya_walk.fitting import StepVerdict
        receipt, update, objective = self._trial(.5, project=lambda values: [2.25])
        self.assertIs(receipt.verdict, StepVerdict.ADMITTED)
        self.assertEqual(receipt.predicted, .4375)
        self.assertEqual(update[0], [2.25])
        objective.score.assert_called_once_with([2.25])

    def test_every_rejection_reason_discards_the_step(self):
        from storybook.animation.maya_walk.fitting import StepVerdict
        cases = {
            'out of domain': (dict(value=math.inf, after=None), StepVerdict.OUT_OF_DOMAIN, None, .75),
            'infinite score': (dict(value=math.inf), StepVerdict.NON_FINITE, None, .75),
            'nan score': (dict(value=math.nan), StepVerdict.NON_FINITE, None, .75),
            'score rose': (dict(value=2.), StepVerdict.NO_DECREASE, -1., .75),
            'score unchanged': (dict(value=1.), StepVerdict.NO_DECREASE, 0., .75),
            'decrease at the floor': (dict(value=1e-10, score=2e-10), StepVerdict.NO_DECREASE, 1e-10, .75),
            'zero prediction': (dict(value=.5, rhs=(0.,)), StepVerdict.NON_POSITIVE_PREDICTION, .5, 0.),
            'negative prediction': (dict(value=.5, columns=((-1.,),)), StepVerdict.NON_POSITIVE_PREDICTION, .5, -1.25),
            'infinite prediction': (dict(value=.5, columns=((1e200,),), residuals=(1e200,)), StepVerdict.NON_FINITE, .5, None),
            'overflowing prediction': (dict(value=.5, columns=((2e154, 2e154),), residuals=(-1e154, -1e154)), StepVerdict.NON_FINITE, .5, None),
            'indeterminate prediction': (dict(value=.5, columns=((1e200, 1e200),), residuals=(1e200, -1e200)), StepVerdict.NON_FINITE, .5, None),
            'infinite ratio': (dict(value=0., columns=((1e-161,),), residuals=(-1e-161,)), StepVerdict.NON_FINITE, 1., None),
        }
        for name, (arguments, verdict, actual, predicted) in cases.items():
            with self.subTest(name):
                receipt, update, _ = self._trial(**arguments)
                self.assertIs(receipt.verdict, verdict)
                self.assertIsNone(update)
                self.assertEqual(receipt.actual, actual)
                if name == 'infinite ratio':
                    self.assertGreater(receipt.predicted, 0.)
                    self.assertIsNone(receipt.ratio)
                else:
                    self.assertEqual(receipt.predicted, predicted)

    def test_decrease_just_above_the_floor_is_admitted(self):
        from storybook.animation.maya_walk.fitting import StepVerdict
        receipt, update, _ = self._trial(math.nextafter(1e-10, 0.), score=2e-10)
        self.assertIs(receipt.verdict, StepVerdict.ADMITTED)
        self.assertGreater(receipt.actual, 1e-10)
        self.assertIsNotNone(update)

    def test_rejected_full_step_raises_damping_on_the_same_linearization(self):
        from storybook.animation.maya_walk.fitting import admit_step, StepVerdict
        objective = _Arctangent()
        x = list(_Chart.initial)
        score, residuals = objective.score(x)
        columns = finite_difference(objective.score, x, residuals).require_resolved()
        scored = objective.calls
        update, damping, receipts, solves = admit_step(objective, _Chart(), x, score, residuals, columns, .05)
        self.assertEqual([r.verdict for r in receipts], [StepVerdict.NO_DECREASE, StepVerdict.ADMITTED])
        self.assertEqual([r.damping for r in receipts], [.05, .25])
        self.assertEqual(objective.calls-scored, 2)
        self.assertEqual(len(solves), 2)
        full = bounded_least_squares(columns, [-v for v in residuals], .25).require_converged()
        self.assertEqual(update[0], [a+b for a, b in zip(x, full)])
        self.assertEqual(damping, .25)
        self.assertEqual(x, _Chart.initial)

    def test_well_predicted_step_lowers_damping_and_poor_one_raises_it(self):
        from storybook.animation.maya_walk.fitting import admit_step, StepVerdict
        x = [.3, -.2]
        columns = ((1., 0.), (0., 1.))
        update, damping, receipts, _ = admit_step(_Linear(), _Chart(), x, .13, x, columns, .05)
        self.assertIs(receipts[-1].verdict, StepVerdict.ADMITTED)
        self.assertEqual(len(receipts), 1)
        self.assertAlmostEqual(receipts[0].ratio, 1., delta=1e-12)
        self.assertEqual(damping, .025)
        update, damping, receipts, _ = admit_step(_Linear(), _Chart(), x, .13, x, columns, 1e-7)
        self.assertEqual(damping, 1e-7)

        class Shallow:
            """Admissible, but far short of what the linear model promised."""
            def score(self, values):
                return .13-.001, list(values)
        update, damping, receipts, _ = admit_step(Shallow(), _Chart(), x, .13, x, columns, .05)
        self.assertIs(receipts[-1].verdict, StepVerdict.ADMITTED)
        self.assertLess(receipts[0].ratio, .25)
        self.assertIsNotNone(update)
        self.assertEqual(damping, .25)

    def test_attempts_are_bounded_and_rejections_change_nothing(self):
        from storybook.animation.maya_walk.fitting import admit_step, StepVerdict
        objective = Mock()
        objective.score.return_value = (1., [1., 1.])
        x = [0., 0.]
        update, damping, receipts, solves = admit_step(
            objective, _Chart(), x, 1., [1., 1.], ((1., 0.), (0., 1.)), .05)
        self.assertIsNone(update)
        self.assertEqual([r.verdict for r in receipts], [StepVerdict.NO_DECREASE]*9)
        self.assertEqual([r.damping for r in receipts], [_raised(.05, k) for k in range(9)])
        self.assertEqual(damping, _raised(.05, 9))
        self.assertEqual(objective.score.call_count, 9)
        self.assertEqual(len(solves), 9)
        self.assertEqual(x, [0., 0.])

    def test_three_fully_rejected_iterations_end_as_no_descent(self):
        objective = Mock()
        objective.score.return_value = (1., [1., 1.])
        objective.calls = 1
        identity = finite_difference(lambda x: (0., x), [0., 0.], [0., 0.])
        # A fixed converged solve keeps this about the outer policy alone.
        solution = bounded_least_squares([[1., 0.], [0., 1.]], [.1, .1])
        solution.require_converged()
        record, saved = _synthetic_fit(objective, iterations=10, derivative=identity,
                                       solver={'return_value': solution})
        self.assertEqual(record['termination'], 'no_descent')
        self.assertEqual(record['iteration'], 2)
        self.assertEqual(record['values'], _Chart.initial)
        self.assertEqual(record['score'], 1.)
        self.assertEqual(objective.score.call_count, 1+27)
        self.assertEqual([a['verdict'] for a in saved['numerics']['attempts']], ['no_decrease']*9)
        self.assertEqual(record['damping'], _raised(.05, 27))

    def test_unsolved_attempts_raise_damping_and_do_not_fail_a_solved_iteration(self):
        unsolved = bounded_step([[2., 1.], [1., 2.]], [4., 1.], max_iterations=1)
        x = _Chart.initial
        solved = bounded_least_squares([[1., 0.], [0., 1.]], [-v for v in x], 1.25)
        solved.require_converged()
        record, saved = _synthetic_fit(_Linear(), solver={'side_effect': [unsolved, unsolved, solved]})
        attempts = saved['numerics']['attempts']
        self.assertEqual([a['verdict'] for a in attempts], ['unsolved', 'unsolved', 'admitted'])
        self.assertEqual([a['solve_status'] for a in attempts], ['iteration_limit']*2+['converged'])
        self.assertEqual([a['damping'] for a in attempts], [.05, .25, 1.25])
        self.assertEqual([a['actual'] for a in attempts[:2]], [None, None])
        self.assertAlmostEqual(attempts[2]['ratio'], 1., delta=1e-12)
        self.assertEqual(record['termination'], 'iteration_limit')
        self.assertEqual(record['damping'], .625)
        self.assertLess(record['score'], .045)

    def test_resume_never_trusts_a_saved_damping(self):
        first, _ = _synthetic_fit(_Arctangent())
        prior = {'source_signature': first['source_signature'], 'values': list(_Chart.initial), 'damping': 1e-7}
        record, _ = _synthetic_fit(_Arctangent(), prior=prior)
        self.assertEqual(record['numerics']['attempts'][0]['damping'], .05)

    def test_collapsed_damping_admits_a_full_step_at_frozen_iteration_60(self):
        # The fixture's recorded score (428.685...) belongs to the old pointwise
        # objective, under which the first attempts were refused. The
        # fine-interval objective scores this point higher and admits the first
        # full step; refusal and recovery are covered synthetically above.
        from storybook.animation.maya_walk.fitting import (
            PoseChart, TimingChart, Objective, admit_step, StepVerdict)
        fixture = json.loads(Path(__file__).with_name('frozen-outer-step.json').read_text())
        space = TimingChart(PoseChart())
        objective = Objective(space, fixture['velocity_weight'], fixture['guide_weight'])
        x = fixture['values']
        score, residuals = objective.score(x)
        self.assertGreater(score, fixture['score'])
        self.assertAlmostEqual(score, 167627.33977017563, delta=1e-6)
        derivative = finite_difference(objective.score, x, residuals)
        columns = derivative.require_resolved()
        self.assertTrue(all(d.norm > 0 for d in derivative.differences))
        scored = []

        class Counting:
            def score(self, values):
                scored.append(list(values))
                return objective.score(values)
        self.assertEqual(fixture['collapsed_damping'], 1e-7)
        update, damping, receipts, _ = admit_step(
            Counting(), space, x, score, residuals, columns, fixture['collapsed_damping'])
        verdicts = [r.verdict for r in receipts]
        self.assertEqual(verdicts, [StepVerdict.ADMITTED])
        admitted = receipts[-1]
        self.assertGreaterEqual(admitted.ratio, .75)
        self.assertEqual(admitted.damping, 1e-7)
        self.assertEqual(damping, 1e-7)
        # One evaluation per attempt, and the kept one is the full solved step.
        self.assertEqual(len(scored), len(receipts))
        full = bounded_least_squares(columns, [-v for v in residuals], admitted.damping).require_converged()
        self.assertEqual(update[0], [a+b for a, b in zip(x, full)])
        self.assertEqual(scored[-1], update[0])
        self.assertAlmostEqual(update[1], score-admitted.actual, delta=1e-9)


class ZeroResponseTests(unittest.TestCase):
    """A zero response is absence of signal, not agreement."""

    def _one(self, response, x=0.):
        visited = []

        def score(values):
            visited.append(abs(values[0]-x))
            r = response(values[0])
            return (math.inf, None) if r is None else (sum(v*v for v in r), list(r))
        _, residuals = score([x])
        result = finite_difference(score, [x], residuals)
        return result, visited

    def test_dead_zone_does_not_hide_the_slope_beyond_it(self):
        result, visited = self._one(lambda v: [v if abs(v) >= 1e-3 else 0.])
        self.assertIs(result.differences[0].status, DerivativeStatus.CENTRAL)
        self.assertEqual(result.require_resolved(), ((1.,),))
        self.assertGreater(result.differences[0].norm, 0.)
        self.assertGreater(max(visited), 1e-3)

    def test_zero_then_inconsistent_response_is_unresolved(self):
        result, visited = self._one(lambda v: [0. if abs(v) < 1e-3 else math.copysign(1., v)])
        self.assertIs(result.differences[0].status, DerivativeStatus.UNRESOLVED)
        self.assertEqual(max(visited), .5)
        with self.assertRaises(UnreliableJacobian):
            result.require_resolved()

    def test_direction_with_no_response_anywhere_is_flat(self):
        from storybook.animation.maya_walk.numerics import _probe_sizes, TRUST_LIMIT
        result, visited = self._one(lambda v: [1., 2.])
        difference = result.differences[0]
        self.assertIs(difference.status, DerivativeStatus.FLAT)
        self.assertEqual((difference.norm, difference.relative_error), (0., None))
        self.assertEqual(difference.step, TRUST_LIMIT)
        self.assertEqual(result.require_resolved(), ((0., 0.),))
        # Every size of the ladder was evaluated before the claim was made.
        for h in _probe_sizes(TRUST_LIMIT):
            self.assertIn(h, visited)
            self.assertIn(h/2, visited)

    def test_flat_on_one_side_of_a_domain_boundary(self):
        result, _ = self._one(lambda v: [3.] if v >= 0 else None)
        self.assertIs(result.differences[0].status, DerivativeStatus.FLAT)
        self.assertEqual(result.require_resolved(), ((0.,),))

    def test_flat_is_not_claimed_when_part_of_the_ladder_is_outside_the_domain(self):
        result, _ = self._one(lambda v: [3.] if abs(v) <= .3 else None)
        self.assertIs(result.differences[0].status, DerivativeStatus.UNRESOLVED)
        with self.assertRaises(UnreliableJacobian):
            result.require_resolved()

    def test_response_seen_by_only_one_difference_is_not_flat(self):
        # 0.5 is only ever a coarse probe and 0.25 only ever a fine one.
        for name, response in (('coarse only', lambda v: [math.copysign(1., v) if abs(v) > .45 else 0.]),
                               ('fine only', lambda v: [math.copysign(1., v) if .22 < abs(v) < .3 else 0.])):
            with self.subTest(name):
                result, _ = self._one(response)
                self.assertIs(result.differences[0].status, DerivativeStatus.UNRESOLVED)

    def test_flat_column_keeps_its_coordinate_still(self):
        result, _ = self._one(lambda v: [1., 2.])
        columns = [[1., 0.], list(result.require_resolved()[0])]
        self.assertEqual(bounded_least_squares(columns, [.3, .4], 1e-7).require_converged()[1], 0.)

    def test_saturated_frozen_coordinate_is_refused_not_certified_zero(self):
        from storybook.animation.maya_walk.fitting import PoseChart, TimingChart, Objective
        fixture = json.loads(Path(__file__).with_name('frozen-derivative-stop.json').read_text())
        space = TimingChart(PoseChart())
        objective = Objective(space, guide_weight=0.)
        index = 64
        self.assertEqual(space.parameters[index], ('phase_foot_x', 2))
        values = list(fixture['values'])
        values[index] = -19.

        def score(coordinate):
            changed = values[:]
            changed[index] = coordinate[0]
            return objective.score(changed)
        _, residuals = score([values[index]])
        self.assertIsNotNone(residuals)
        result = finite_difference(score, [values[index]], residuals)
        # Regression: this was admitted as central with norm 0.0 at the first probe.
        self.assertIs(result.differences[0].status, DerivativeStatus.UNRESOLVED)
        with self.assertRaises(UnreliableJacobian):
            result.require_resolved()
