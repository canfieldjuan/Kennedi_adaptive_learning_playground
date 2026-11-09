"""Known-solution numerical regressions; no motion fitting in these tests."""
import unittest
from storybook.animation.maya_walk.fitting import bounded_step


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
        with self.assertRaises(UnconvergedStep):trial_step(objective,space,[0.,0.],1.,result)
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
             patch('storybook.animation.maya_walk.fitting.finite_difference',return_value=derivative), \
             patch('storybook.animation.maya_walk.fitting.bounded_least_squares',return_value=bad), \
             patch('storybook.animation.maya_walk.fitting.NativeGeometry') as geometry:
            geometry.return_value.assess.return_value=report
            output=Path(folder)/'test.json';result=fit(output,iterations=1)
            self.assertEqual(result['termination'],'linear_solve_failed')
            self.assertEqual(result['values'],chart.initial)
            self.assertEqual(json.loads(output.read_text())['termination'],'linear_solve_failed')
            objective.score.assert_called_once_with(chart.initial)


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
             patch('storybook.animation.maya_walk.fitting.finite_difference',return_value=unresolved), \
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


    def test_weak_frozen_direction_uses_available_probe_range(self):
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
        self.assertGreater(max(visited),.1)
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
