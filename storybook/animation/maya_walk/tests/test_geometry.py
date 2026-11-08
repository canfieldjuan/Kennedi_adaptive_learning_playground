"""Source geometry and reachable-target admission, separate from Blender proof."""
from dataclasses import replace
import math
import unittest
from storybook.animation.maya_walk.spec import THIGH_LENGTH, SHIN_LENGTH, REACH_TOLERANCE
from storybook.animation.maya_walk.tests.fixtures import fixture
from storybook.animation.maya_walk.tests.test_validation import report


class ReachTests(unittest.TestCase):
    def test_target_reach_bounds(self):
        rows=fixture()
        for reach, rejected in ((.5,False),(THIGH_LENGTH+SHIN_LENGTH,False),
                                (THIGH_LENGTH+SHIN_LENGTH+REACH_TOLERANCE*.5,False),
                                (THIGH_LENGTH+SHIN_LENGTH+REACH_TOLERANCE*2,True),
                                (abs(THIGH_LENGTH-SHIN_LENGTH),False),
                                (abs(THIGH_LENGTH-SHIN_LENGTH)-REACH_TOLERANCE*2,True)):
            changed=[replace(r,ik_target=(r.points['hip'][0],r.points['hip'][1],r.points['hip'][2]-reach)) for r in rows]
            with self.subTest(reach=reach):
                self.assertEqual('ik_target_unreachable' in report(changed)['violation_counts'],rejected)

    def test_target_must_be_finite_complete_vector(self):
        row=fixture()[0]
        for target in ((0,0),None,(0,0,math.nan),(False,0,0)):
            with self.subTest(target=target),self.assertRaises(ValueError):
                replace(row,ik_target=target)


class GeometryTests(unittest.TestCase):
    def test_toe_clearance_dip_can_come_from_boot_rotation(self):
        from storybook.animation.maya_walk.poses import author,curve
        from storybook.animation.maya_walk.curves import Motion
        from storybook.animation.maya_walk.kinematics import NativeGeometry
        motion=author(); curves=[]
        heights=((0.,0.),(.6,0.),(.64,.006),(.68,.02),(.72,.04),(.76,.02),
                 (.8,.01),(.84,.005),(.88,.003),(.92,.002),(.96,.001),(.99,.0001))
        for c in motion.curves:
            if c.rule.channel[0] in ('CTRL_Foot_near','CTRL_Foot_far') and c.rule.channel[1:]==('location',2):
                c=curve(c.rule.channel,heights,holds=((0.,.6),),maxima=(.72,))
                self.assertEqual(len(c.rule.turns),1)
            curves.append(c)
        result=NativeGeometry(Motion(motion.spec,tuple(curves))).assess()
        self.assertNotIn('toe_dip_signature',result['violation_counts'])
        self.assertNotIn('toe_clearance',result['violation_counts'])
        # This isolates the landmark topology, not a claim of a qualified gait.
        self.assertEqual(result['status'],'FAIL')

    def test_native_rest_geometry_and_segment_lengths(self):
        from storybook.animation.maya_walk.poses import author, curve
        from storybook.animation.maya_walk.curves import Motion
        from storybook.animation.maya_walk.kinematics import NativeGeometry
        from storybook.animation.maya_walk.spec import Side
        motion=author(); curves=[]
        for c in motion.curves:
            owner,prop,index=c.rule.channel
            if owner.startswith('CTRL_'):
                value=.94 if (owner,prop,index)==('CTRL_Hips','location',2) else 0.
                c=curve(c.rule.channel,[(0.,value)],constant=True)
            curves.append(c)
        kernel=NativeGeometry(Motion(motion.spec,tuple(curves)))
        points,angles,target=kernel.at(0.,Side.NEAR)
        self.assertEqual(target,(0.,-.1,.2))
        self.assertAlmostEqual(math.dist(points['hip'],points['knee']),THIGH_LENGTH,places=12)
        self.assertAlmostEqual(math.dist(points['knee'],points['ankle']),SHIN_LENGTH,places=12)
        self.assertGreater(points['knee'][0],0.)
        self.assertAlmostEqual(angles['foot_pitch'],0.)
        self.assertGreater(angles['ankle'],0.)

    def test_writer_refuses_known_bad_source_before_touching_blender(self):
        from storybook.animation.maya_walk.blender_writer import write_motion,InvalidMotion
        from storybook.animation.maya_walk.poses import author,curve
        from storybook.animation.maya_walk.curves import Motion
        motion=author()
        bad=Motion(motion.spec,tuple(
            curve(c.rule.channel,[(0.,2.)],constant=True)
            if c.rule.channel==('CTRL_Hips','location',2) else c
            for c in motion.curves))
        with self.assertRaises(InvalidMotion) as failure:
            write_motion(None,bad)
        self.assertIn('ik_target_unreachable',failure.exception.report['violation_counts'])


class FittingTests(unittest.TestCase):
    def test_ordered_value_chart_avoids_colliding_key_constraints(self):
        from storybook.animation.maya_walk.fitting import PoseChart
        space=PoseChart()
        for delta in (-4.,0.,4.):
            values=[v+delta*(1 if i%2 else -1) for i,v in enumerate(space.initial)]
            motion=space.build(values)
            self.assertTrue(all(len(c.keys)<=12 for c in motion.curves))
        for bad in ([],space.initial[:-1],space.initial+[0.]):
            with self.assertRaises(ValueError):space.build(bad)

    def test_fit_changes_only_values_under_fixed_source_constraints(self):
        from storybook.animation.maya_walk.fitting import PoseChart
        from storybook.animation.maya_walk.spec import TARGET
        space=PoseChart();base=space.build(space.initial)
        foot_height=next(c for c in base.curves if c.rule.channel==('CTRL_Foot_near','location',2))
        self.assertEqual([(t.phase,t.kind.value) for t in foot_height.rule.turns],[(.72,'maximum')])
        changed=space.initial[:];changed[1]+=.01
        result=space.build(changed)
        self.assertEqual(result.spec,TARGET)
        for a,b in zip(base.curves,result.curves):
            self.assertEqual(a.rule,b.rule)
            self.assertEqual([k.phase for k in a.keys],[k.phase for k in b.keys])
            self.assertEqual([k.tangent for k in a.keys],[k.tangent for k in b.keys])
            self.assertLessEqual(len(b.keys),12)
        self.assertNotEqual(base,result)

    def test_fit_admits_only_complete_finite_value_vectors(self):
        from storybook.animation.maya_walk.fitting import PoseSpace
        space=PoseSpace()
        for bad in ([],space.initial[:-1],space.initial+[0.]):
            with self.assertRaises(ValueError):space.build(bad)
        for bad in (False,'',math.nan,math.inf):
            values=space.initial[:];values[0]=bad
            with self.subTest(bad=bad),self.assertRaises(ValueError):space.build(values)
