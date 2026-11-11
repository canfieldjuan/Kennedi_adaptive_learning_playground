"""Analytic measurement, branch boundaries and the actual weak-direction stop."""
from dataclasses import FrozenInstanceError
import json
import math
from pathlib import Path
import unittest

from storybook.animation.maya_walk import differential as d
from storybook.animation.maya_walk.curves import pchip
from storybook.animation.maya_walk.numerics import (
    analytic_jacobian, finite_difference, DerivativeStatus, UnreliableJacobian, Difference, JacobianResult)


def jacobian(function, values):
    def score(x):
        r=function(x)
        return d.total(v*v for v in r),r
    _,r=score(values)
    return analytic_jacobian(score,values,r)


class ScalarTests(unittest.TestCase):
    def test_immutable_finite_closed_scalar(self):
        valid=d.Dual.variable(0.,0,1)
        with self.assertRaises(FrozenInstanceError):valid.value=1.
        for value in (False,'',None,math.inf,math.nan):
            with self.subTest(value=value),self.assertRaises(ValueError):d.Dual(value,(1.,))
        for gradient in ([],(),[1.],(False,),('',),(math.inf,)):
            with self.subTest(gradient=gradient),self.assertRaises(ValueError):d.Dual(1.,gradient)
        for uncertain in ({0},frozenset({-1}),frozenset({1}),frozenset({False})):
            with self.subTest(uncertain=uncertain),self.assertRaises(ValueError):d.Dual(1.,(1.,),uncertain)
        for index,size in ((0,0),(False,1),(0,False),(-1,1),(1,1),(0,1.)):
            with self.subTest(index=index,size=size),self.assertRaises(ValueError):d.Dual.variable(1.,index,size)
        with self.assertRaises(ValueError):valid+d.Dual.variable(0.,0,2)
        with self.assertRaises(TypeError):d.DifferentiationFailure('nonsmooth')

    def test_unadapted_float_primitives_cannot_erase_derivatives(self):
        x=d.Dual.variable(.2,0,1)
        for operation in (float,int,bool,math.sin,math.exp,math.sqrt):
            with self.subTest(operation=operation),self.assertRaises(d.DifferentiationFailure) as failure:
                operation(x)
            self.assertIs(failure.exception.reason,d.Failure.UNSUPPORTED)

    def test_arithmetic_chain_rules_and_mixed_operands(self):
        result=jacobian(lambda x:[x[0]+2,2+x[0],x[0]-2,2-x[0],x[0]*3,3*x[0],
                                  x[0]/3,3/x[0],x[0]**3,2**x[0],x[0]**x[1],-x[0]], [2.,3.])
        first,second=result.require_resolved()
        expected=(1,1,1,-1,3,3,1/3,-.75,12,4*math.log(2),12,-1)
        for got,want in zip(first,expected):self.assertAlmostEqual(got,want,places=12)
        self.assertAlmostEqual(second[10],8*math.log(2),places=12)
        self.assertTrue(all(v==0 for i,v in enumerate(second) if i!=10))

    def test_transcendental_geometry_rules(self):
        result=jacobian(lambda x:[d.exp(x[0]),d.sin(x[0]),d.cos(x[0]),d.atan(x[0]),
                                  d.sqrt(x[0]),d.radians(x[0]),d.degrees(x[0]),
                                  d.atan2(x[0],x[1]),d.hypot(x[0],x[1]),
                                  d.dist((x[0],x[1]),(1.,1.))], [2.,3.])
        a,b=result.require_resolved()
        expected=(math.exp(2),math.cos(2),-math.sin(2),.2,1/(2*math.sqrt(2)),math.pi/180,
                  180/math.pi,3/13,2/math.sqrt(13),1/math.sqrt(5))
        for got,want in zip(a,expected):self.assertAlmostEqual(got,want,places=12)
        self.assertAlmostEqual(b[7],-2/13,places=12)
        self.assertAlmostEqual(b[8],3/math.sqrt(13),places=12)
        self.assertAlmostEqual(b[9],2/math.sqrt(5),places=12)

    def test_compensated_sum_preserves_primal_and_gradient(self):
        x=d.Dual.variable(1.,0,1)
        values=[1e16,x,-1e16]
        total=d.total(values)
        self.assertEqual(total.value,sum([1e16,1.,-1e16]))
        self.assertEqual(total.gradient,(1.,))

    def test_true_stationary_zero_is_analytic_not_sampled_flat(self):
        result=jacobian(lambda x:[x[0]**2,0.], [0.])
        self.assertEqual(result.require_resolved(),((0.,0.),))
        self.assertIs(result.differences[0].status,DerivativeStatus.ANALYTIC)

    def test_weak_nested_response_has_known_nonzero_derivative(self):
        def residual(x):
            # The primal subtraction loses this response entirely at float64.
            return [(d.sqrt(1.+d.exp(x[0])*1e-12)-1.)*128]
        result=jacobian(residual,[-20.])
        want=64e-12*math.exp(-20)/math.sqrt(1+math.exp(-20)*1e-12)
        self.assertGreater(result.columns[0][0],0)
        self.assertAlmostEqual(result.require_resolved()[0][0]/want,1.,places=13)

    def test_abs_hinge_and_norm_boundaries_refuse_only_moving_directions(self):
        for fn in (lambda x:[abs(x[0])],lambda x:[d.maximum(0.,x[0])],
                   lambda x:[d.minimum(0.,x[0])],lambda x:[d.hypot(x[0],0.)],
                   lambda x:[d.sqrt(x[0])]):
            with self.subTest(fn=fn):
                result=jacobian(fn,[0.,1.])
                self.assertIs(result.differences[0].reason,d.Failure.NONSMOOTH)
                self.assertIs(result.differences[1].status,DerivativeStatus.ANALYTIC)
                with self.assertRaises(UnreliableJacobian):result.require_resolved()
        for x,derivative in ((-1.,-1.),(1.,1.)):
            self.assertEqual(jacobian(lambda x:[abs(x[0])],[x]).require_resolved(),((derivative,),))
        for fn in (lambda x:[d.hypot(x[0]-x[0],0.)],lambda x:[abs(x[0])*0.],
                   lambda x:[d.maximum(0.,x[0]**2)]):
            self.assertEqual(jacobian(fn,[0.]).require_resolved(),((0.,),))

    def test_extrema_selection_ties_do_not_silently_choose_a_derivative(self):
        result=jacobian(lambda x:[d.maximum([(x[0],0.),(-x[0],1.)],key=lambda r:r[0])[0]],[0.])
        self.assertIs(result.differences[0].reason,d.Failure.NONSMOOTH)
        self.assertEqual(jacobian(lambda x:[d.maximum(x[0],x[0])],[.2]).require_resolved(),((1.,),))
        self.assertEqual(jacobian(lambda x:[d.maximum(x[0],x[0]-1.)],[0.]).require_resolved(),((1.,),))

    def test_pchip_boundary_and_angle_wrap_remain_explicit(self):
        self.assertIs(jacobian(lambda x:[pchip(.1,.1,x[0],1.)],[0.]).differences[0].reason,d.Failure.NONSMOOTH)
        for x,want in ((-.1,0.),(.1,None)):
            result=jacobian(lambda x:[pchip(.1,.1,x[0],1.)],[x])
            actual=result.require_resolved()[0][0]
            if want is not None:self.assertEqual(actual,want)
            else:self.assertAlmostEqual(actual,2/(1+x)**2,places=12)
        self.assertIs(jacobian(lambda x:[(x[0]+180)%360-180],[180.]).differences[0].reason,d.Failure.NONSMOOTH)
        self.assertEqual(jacobian(lambda x:[(x[0]+180)%360-180],[0.]).require_resolved(),((1.,),))
        self.assertIs(jacobian(lambda x:[math.floor(x[0])],[0.]).differences[0].reason,d.Failure.NONSMOOTH)
        self.assertEqual(jacobian(lambda x:[math.floor(x[0])],[.2]).require_resolved(),((0.,),))

    def test_closed_jacobian_receipts_cannot_admit_mixed_or_invalid_columns(self):
        valid=Difference(DerivativeStatus.ANALYTIC,0.,1.,None)
        self.assertEqual(JacobianResult(((1.,),),(valid,)).require_resolved(),((1.,),))
        for status,step,norm,error,reason in [('analytic',0,1,None,None),
                (DerivativeStatus.ANALYTIC,False,1,None,None),
                (DerivativeStatus.ANALYTIC,0,math.inf,None,None),
                (DerivativeStatus.ANALYTIC,0,1,None,'unsupported'),
                (DerivativeStatus.ANALYTIC,0,1,None,d.Failure.UNSUPPORTED),
                (DerivativeStatus.CENTRAL,0,1,0.,None),
                (DerivativeStatus.CENTRAL,.1,1,.050001,None),
                (DerivativeStatus.FLAT,.1,1,None,None),
                (DerivativeStatus.UNRESOLVED,0,1,None,None)]:
            with self.subTest(status=status,step=step,norm=norm),self.assertRaises(ValueError):
                Difference(status,step,norm,error,reason)
        refused=Difference(DerivativeStatus.UNRESOLVED,0,0,None,d.Failure.NONSMOOTH)
        for columns,receipts in (((),()),(((1.,),),()),(((),),(valid,)),
                (((0.,),),(valid,)),(((math.nan,),),(valid,)),(((1.,),),(refused,)),
                (((1.,),(1.,0.)),(valid,valid))):
            with self.subTest(columns=columns),self.assertRaises(ValueError):JacobianResult(columns,receipts)

    def test_moving_key_phase_and_value_chain_rule_across_periodic_seam(self):
        from storybook.animation.maya_walk.poses import curve
        def values(x):
            c=curve(('CTRL_Foot_near','location',0),[(0.,0.),(x[1],x[0]),(.7,.8)],travel=1.)
            return [c.at(t) for t in (-.05,0.,.15,.3,.65,1.05)]
        x=[.4,.3];expected=analytic_jacobian(lambda x:(0.,values(x)),x,values(x)).require_resolved()
        reference=finite_difference(lambda x:(0.,values(x)),x,values(x)).require_resolved()
        for actual,measured in zip(expected,reference):
            for a,b in zip(actual,measured):self.assertAlmostEqual(a,b,delta=1e-4)

    def test_timing_chart_retains_every_interior_phase_sensitivity(self):
        from storybook.animation.maya_walk.fitting import PoseChart,TimingChart
        space=TimingChart(PoseChart());x=space.initial
        def phases(x):return [p for _,profile in space.layout(x).profiles for p in profile]
        result=analytic_jacobian(lambda x:(0.,phases(x)),x,phases(x))
        result.require_resolved()
        self.assertTrue(all(v.norm==0 for v in result.differences[:space.value_count]))
        self.assertTrue(all(v.norm>0 for v in result.differences[space.value_count:]))

    def test_adapter_refuses_bad_primal_and_unsupported_math_without_fallback(self):
        result=analytic_jacobian(lambda x:(0.,[math.sin(x[0])]),[.2],[math.sin(.2)])
        self.assertIs(result.differences[0].reason,d.Failure.UNSUPPORTED)
        result=analytic_jacobian(lambda x:(0.,[x[0]+1]),[.2],[.2])
        self.assertIs(result.differences[0].reason,d.Failure.PRIMAL_MISMATCH)
        result=analytic_jacobian(lambda x:(0.,[d.exp(x[0])]),[1000.],[0.])
        self.assertIs(result.differences[0].reason,d.Failure.NONFINITE)
        for x,r in (([],[0.]),([0.],[]),([False],[0.]),([''],[0.]),([0.],[math.inf])):
            with self.subTest(x=x,r=r),self.assertRaises(ValueError):analytic_jacobian(lambda x:(0.,x),x,r)

    def test_overflowing_column_norm_is_a_typed_refusal(self):
        result=analytic_jacobian(lambda x:(0.,[1e308*x[0]]*4),[0.],[0.]*4)
        self.assertIs(result.differences[0].reason,d.Failure.NONFINITE)
        with self.assertRaises(UnreliableJacobian):result.require_resolved()

    def test_fitter_consumes_analytic_weak_column_and_records_it(self):
        from storybook.animation.maya_walk.tests.test_fitting_numerics import _synthetic_fit
        from storybook.animation.maya_walk.numerics import StepResult,SolveStatus
        class Weak:
            calls=0
            def score(self,x):
                self.calls+=1
                r=[d.sqrt(1.+1e-20*d.exp(x[0]))-1.,x[1]]
                return d.total(v*v for v in r),r
        stopped=StepResult((0.,0.),SolveStatus.ITERATION_LIMIT,1,1.,1e-10,0.,(1.,1.))
        record,saved=_synthetic_fit(Weak(),solver={'return_value':stopped})
        self.assertEqual(json.loads(json.dumps(record,allow_nan=False)),saved)
        self.assertEqual(record['numerics']['differences'][0]['status'],DerivativeStatus.ANALYTIC)
        self.assertGreater(record['numerics']['differences'][0]['norm'],0.)
        self.assertEqual(record['termination'],'linear_solve_failed')


class FrozenTests(unittest.TestCase):
    def test_real_frozen_stop_and_neighbors_have_analytic_nonzero_columns(self):
        from storybook.animation.maya_walk.fitting import PoseChart,TimingChart,Objective
        frozen=json.loads((Path(__file__).parent/'frozen-jacobian-stop.json').read_text())
        for offset in (4.,0.,-2.):
            x=list(frozen['values']);x[31]+=offset
            objective=Objective(TimingChart(PoseChart()),1.,0.)
            _,r=objective.score(x)
            result=analytic_jacobian(objective.score,x,r)
            with self.subTest(offset=offset):
                self.assertEqual(len(result.require_resolved()),len(x))
                self.assertTrue(all(v.status is DerivativeStatus.ANALYTIC for v in result.differences))
                self.assertGreater(result.differences[31].norm,0.)
        # The original finite-difference refusal stays intact as an independent
        # check; analytic measurement does not relax its acceptance threshold.
        x=frozen['values'];objective=Objective(TimingChart(PoseChart()),1.,0.);_,r=objective.score(x)
        self.assertIs(finite_difference(objective.score,x,r).differences[31].status,DerivativeStatus.UNRESOLVED)


if __name__=='__main__':unittest.main()
