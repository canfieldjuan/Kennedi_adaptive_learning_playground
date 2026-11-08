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
    def test_bounded_step_solves_coupled_search_not_independent_clipping(self):
        from storybook.animation.maya_walk.fitting import bounded_step
        for sign in (-1.,1.):
            step=bounded_step([[2.,1.],[1.,2.]],[sign*4.,0.])
            self.assertAlmostEqual(step[0],sign*.5)
            self.assertAlmostEqual(step[1],-sign*.25)
        self.assertEqual(bounded_step([[2.,1.],[1.,2.]],[0.,0.]),[0.,0.])
        for limit in (0.,False,'',-1.,math.nan,math.inf):
            with self.subTest(limit=limit),self.assertRaises(ValueError):
                bounded_step([[1.]],[1.],limit)

    def test_timing_chart_preserves_anchors_spacing_and_curve_contract(self):
        from storybook.animation.maya_walk.fitting import PoseChart,TimingChart,PHASES,time_anchors
        from storybook.animation.maya_walk.spec import TARGET
        chart=TimingChart(PoseChart());base=chart.value_chart.build(chart.value_chart.initial)
        original={c.rule.channel:c for c in base.curves}
        for delta in (-4.,0.,4.):
            values=chart.initial[:]
            for i in range(chart.value_count,len(values)):values[i]+=delta*(1 if i%2 else -1)
            layout=dict(chart.layout(values).profiles)
            motion=chart.build(values)
            self.assertEqual(motion.spec,TARGET)
            for name,phases in layout.items():
                period=.5 if name.startswith('hip_') else 1.
                widths=[b-a for a,b in zip(phases,phases[1:])]+[phases[0]+period-phases[-1]]
                self.assertGreaterEqual(min(widths),.25/TARGET.cycle_frames-1e-12)
                for before,after in zip(PHASES[name],phases):
                    if any(abs(before-a)<1e-12 for a in time_anchors(name)):self.assertEqual(before,after)
            changed={c.rule.channel:c for c in motion.curves}
            for c in motion.curves:
                old=original[c.rule.channel]
                self.assertEqual(c.rule,old.rule)
                self.assertEqual([(k.value,k.tangent) for k in c.keys],[(k.value,k.tangent) for k in old.keys])
                self.assertLessEqual(len(c.keys),12)
                if '_near' in c.rule.channel[0]:
                    other=(c.rule.channel[0].replace('_near','_far'),*c.rule.channel[1:])
                    if c.rule.channel[0].startswith(('CTRL_Foot','CTRL_Heel','CTRL_BallRoll','CTRL_ToePivot')):
                        self.assertEqual(c.keys,changed[other].keys)
                if c.rule.channel[0]=='MAYA_PAINTED_UPPER_RIG':self.assertEqual(c,old)
            self.assertTrue(any(c.rule.channel[0]=='MAYA_PAINTED_UPPER_RIG' for c in motion.curves))
            root=changed[('CTRL_Hips','location',0)]
            for camera in ('Camera_Side','Camera_ThreeQuarter'):
                self.assertEqual([k.phase for k in root.keys],[k.phase for k in changed[(camera,'location',0)].keys])
            for i in range(6):self.assertAlmostEqual(root.keys[i+6].phase-root.keys[i].phase,.5)

    def test_timing_layout_rejects_moved_anchor_collision_and_incomplete_input(self):
        from storybook.animation.maya_walk.fitting import PoseChart,TimingChart,PhaseLayout
        chart=TimingChart(PoseChart());profiles=chart.layout(chart.initial).profiles
        for bad in ((),profiles[:-1],profiles+(profiles[0],),list(profiles)):
            with self.assertRaises(ValueError):PhaseLayout(bad)
        for name,index,value in (('foot_z',4,.73),('foot_x',2,.59),('foot_x',11,.999),
                                 ('heel',1,.001),('hip_z',1,math.nan)):
            changed=dict(profiles);phases=list(changed[name]);phases[index]=value;changed[name]=tuple(phases)
            with self.subTest(name=name,value=value),self.assertRaises(ValueError):PhaseLayout(tuple(changed.items()))
        for bad in ([],chart.initial[:-1],chart.initial+[0.]):
            with self.assertRaises(ValueError):chart.build(bad)
        for index in (0,chart.value_count):
            for bad in (False,'',math.inf,math.nan,36.):
                values=chart.initial[:];values[index]=bad
                with self.subTest(index=index,bad=bad),self.assertRaises(ValueError):chart.build(values)

    def test_timing_resume_rejects_coordinate_system_mismatch(self):
        import json,tempfile
        from pathlib import Path
        from storybook.animation.maya_walk.fitting import fit
        with tempfile.TemporaryDirectory() as folder:
            seed=Path(folder)/'seed.json';output=Path(folder)/'result.json'
            seed.write_text(json.dumps({'values':[],'source_signature':'different'}))
            with self.assertRaisesRegex(ValueError,'Resume layout'):fit(output,1,resume=seed,timing=True)
            self.assertFalse(output.exists())

    def test_fit_shaping_weight_cannot_change_admission_or_accept_invalid_weight(self):
        from pathlib import Path
        from storybook.animation.maya_walk.fitting import PoseChart,Objective,fit
        space=PoseChart();strict=Objective(space,guide_weight=0.);guided=Objective(space,guide_weight=1.)
        self.assertEqual(strict.space.build(space.initial),guided.space.build(space.initial))
        for weight in (False,'',-1.,1.01,math.nan,math.inf):
            with self.subTest(weight=weight),self.assertRaises(ValueError):
                fit(Path('unused-result'),1,guide_weight=weight)

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
