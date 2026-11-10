import math
from dataclasses import replace
import unittest

from storybook.animation.maya_walk.curves import (
    ChannelRule, ChannelHold, Curve, Derived, Key, Motion, Pinned, Reason, Turn)
from storybook.animation.maya_walk.poses import author, curve
from storybook.animation.maya_walk.reference import Kind
from storybook.animation.maya_walk.spec import TARGET, CHANNELS
from storybook.animation.maya_walk.blender_writer import serialize_motion

CHANNEL=('CTRL_Foot_near','location',0)


class SourceTests(unittest.TestCase):
    def test_key_has_no_implicit_zero_slope(self):
        with self.assertRaises(TypeError):
            Key(.6,.32)
        for value in (0,None,'derived',False):
            with self.subTest(value=value),self.assertRaises(ValueError):
                Key(.6,.32,value)

    def test_pins_require_matching_spec_and_not_just_a_reason(self):
        source=next(c for c in author().curves if c.rule.channel==CHANNEL)
        # Planted foot origin legitimately leaves its hold at zero derivative.
        valid=replace(source,keys=tuple(replace(k,tangent=Pinned(0.,Reason.HOLD)) if k.phase==.6 else k for k in source.keys))
        self.assertEqual(valid.slopes[1],0.)
        for phase,reason,slope in ((.68,Reason.HOLD,0.),(.6,Reason.TURNAROUND,0.),(.6,Reason.HOLD,1.)):
            keys=tuple(replace(k,tangent=Pinned(slope,reason)) if k.phase==phase else k for k in source.keys)
            with self.subTest(phase=phase,reason=reason,slope=slope),self.assertRaisesRegex(ValueError,'Pinned slope'):
                replace(source,keys=keys)

    def test_roll_peak_and_pin_cannot_move_to_toeoff(self):
        source=next(c for c in author().curves if c.rule.channel==('CTRL_BallRoll_near','rotation_euler',1))
        # Move the peak while keeping the fixed declared turnaround at .64.
        for pin in (Derived(),Pinned(0.,Reason.TURNAROUND)):
            keys=tuple(replace(k,value=1.,tangent=pin) if k.phase==.6 else k for k in source.keys)
            with self.assertRaisesRegex(ValueError,'matching declared turnaround'):
                replace(source,keys=keys)

    def test_zero_ball_slope_at_release_is_not_a_declared_hold(self):
        source=next(c for c in author().curves if c.rule.channel==('CTRL_BallRoll_near','rotation_euler',1))
        for reason in Reason:
            keys=tuple(replace(k,tangent=Pinned(0.,reason)) if k.phase==TARGET.toe_off else k for k in source.keys)
            with self.assertRaisesRegex(ValueError,'Pinned slope'):
                replace(source,keys=keys)
        valid=replace(source,keys=tuple(replace(k,tangent=Pinned(0.,Reason.TURNAROUND)) if k.phase==.64 else k for k in source.keys))
        self.assertEqual(valid.at(.64,True),0.)

    def test_invalid_frame_rates_rejected_at_spec(self):
        for value in (0,False,24.,241,math.inf):
            with self.subTest(value=value),self.assertRaises(ValueError):
                replace(TARGET,fps=value)

    def test_twelve_thirteen_key_boundary(self):
        for n in (2,12,13):
            rule=ChannelRule(CHANNEL,translation=1.)
            keys=tuple(Key(i/n,i/n,Derived()) for i in range(n))
            if n==13:
                with self.assertRaisesRegex(ValueError,'1 to 12'):
                    Curve(rule,keys)
            else:
                c=Curve(rule,keys)
                self.assertAlmostEqual(c.at(.245),.245)

    def test_nonfinite_missing_mixed_inventory_rejected(self):
        for v in (False,'',math.nan,math.inf):
            with self.subTest(v=v),self.assertRaises(ValueError):
                Key(.2,v,Derived())
        source=author()
        for curves in ((),source.curves[:-1],source.curves+(source.curves[0],)):
            with self.assertRaisesRegex(ValueError,'Every animated channel'):
                Motion(TARGET,curves)
        with self.assertRaises(TypeError):
            serialize_motion(source.curves)

    def test_periodic_derivative_and_translated_seam(self):
        for c in author().curves:
            self.assertAlmostEqual(c.at(1.)-c.at(0.),c.rule.translation,places=10)
            self.assertAlmostEqual(c.at(1.,True),c.at(0.,True),places=9)
            for k,m in zip(c.keys,c.slopes):
                self.assertAlmostEqual(c.at(k.phase),k.value,places=10)
                self.assertAlmostEqual(c.at(k.phase,True),m,places=8)
                self.assertAlmostEqual(c.at(k.phase-1e-8,True),c.at(k.phase+1e-8,True),delta=1e-4)

    def test_shape_preservation_and_declared_flats(self):
        for c in author().curves:
            if c.rule.constant:continue
            for i,a in enumerate(c.keys):
                b=c.keys[(i+1)%len(c.keys)]; wrap=i==len(c.keys)-1
                end=b.phase+wrap
                lo,hi=sorted((a.value,b.value+wrap*c.rule.translation))
                for j in range(101):
                    v=c.at(a.phase+(end-a.phase)*j/100)
                    self.assertGreaterEqual(v,lo-1e-10)
                    self.assertLessEqual(v,hi+1e-10)
        with self.assertRaisesRegex(ValueError,'Flat segment'):
            curve(CHANNEL,[(0,0),(.6,0),(.8,.8)],travel=1)
        with self.assertRaisesRegex(ValueError,'Extremum lacks'):
            curve(CHANNEL,[(0,0),(.5,1)])

    def test_retiming_applies_to_all_channels_including_upper_and_followers(self):
        a=author(); b=author(replace(TARGET,cycle_frames=30,expected_cadence=96))
        self.assertEqual({c.rule.channel for c in a.curves},CHANNELS)
        for ca,cb in zip(a.curves,b.curves):
            self.assertEqual(ca,cb)
        sa,sb=serialize_motion(a),serialize_motion(b)
        for ca,cb in zip(sa,sb):
            self.assertEqual((ca.owner,ca.path,ca.index),(cb.owner,cb.path,cb.index))
            # Match the same cycle/phase key: serialization has the same start.
            for ka,kb in zip(ca.keys,cb.keys):
                self.assertAlmostEqual((ka[0]-1)/24,(kb[0]-1)/30)
                self.assertEqual(ka[1],kb[1])
                self.assertAlmostEqual((ka[2]-1)/24,(kb[2]-1)/30)


if __name__=='__main__':
    unittest.main()
