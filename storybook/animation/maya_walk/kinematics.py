"""Read-only planar model of the pinned native rig for source assessment.

This never writes controls or feeds evaluated positions back into animation.
The saved Blender scene remains the final measurement authority. The diagnostic
models the existing IK reach limit and also reports the unclipped target, so an
unreachable source cannot masquerade as a valid straight leg.
"""
import math
from . import differential as dmath

from .curves import Motion
from .poses import ANKLE, BALL, HEEL, TIP, HIP_HEIGHT, rotate
from .sample_scene import times, angle_delta
from .spec import Sample, Side, SceneKind, THIGH_LENGTH, SHIN_LENGTH
from .validate import validate_cycle


class NativeGeometry:
    def __init__(self, motion):
        if type(motion) is not Motion:
            raise TypeError('Typed sparse source required')
        self.motion = motion
        self.curves = {c.rule.channel: c for c in motion.curves}

    def at(self, time, side):
        if not isinstance(side, Side):
            raise TypeError('Closed side required')
        spec = self.motion.spec
        p = time/spec.cycle_frames
        q = p+spec.offset(side)/spec.cycle_frames
        def value(owner, prop, index, phase):
            curve = self.curves[(owner, prop, index)]
            return curve.at(phase)
        hip = (value('CTRL_Hips','location',0,p), value('CTRL_Hips','location',2,p))
        root_x = value('CTRL_Foot_'+side.value,'location',0,q)
        root_x -= self.curves[('CTRL_Foot_'+side.value,'location',0)].rule.translation*(q-p)
        root_z = value('CTRL_Foot_'+side.value,'location',2,q)
        heel, ball, toe = (dmath.degrees(value('CTRL_'+name+'_'+side.value,'rotation_euler',1,q))
                           for name in ('Heel','BallRoll','ToePivot'))
        def point(x,z,chain):
            v=(x,z)
            for pivot,angle in chain:
                v=rotate(v,pivot,angle)
            return (v[0]+root_x,v[1]+root_z)
        chain=((BALL,ball),(TIP,toe),(HEEL,heel))
        target=point(0.,ANKLE,chain)
        dx,dz=target[0]-hip[0],target[1]-hip[1]
        distance=dmath.hypot(dx,dz)
        if distance == 0:
            raise ValueError('Coincident hip and target has no defined sagittal direction')
        # Emulate native nonstretching IK only in this diagnostic. The original
        # target is retained for the validator's explicit feasibility rule.
        reach=dmath.minimum(THIGH_LENGTH+SHIN_LENGTH,dmath.maximum(abs(THIGH_LENGTH-SHIN_LENGTH),distance))
        projection=(THIGH_LENGTH**2-SHIN_LENGTH**2+reach**2)/(2*reach)
        perpendicular=dmath.sqrt(dmath.maximum(0.,THIGH_LENGTH**2-projection**2))
        ux,uz=dx/distance,dz/distance
        knee=(hip[0]+projection*ux-perpendicular*uz,
              hip[1]+projection*uz+perpendicular*ux)
        ankle=(hip[0]+reach*ux,hip[1]+reach*uz)
        thigh_angle=dmath.degrees(dmath.atan2(knee[0]-hip[0],hip[1]-knee[1]))
        shin_angle=dmath.degrees(dmath.atan2(ankle[0]-knee[0],knee[1]-ankle[1]))
        pitch=-heel-ball-toe
        points={'hip':hip,'knee':knee,'ankle':ankle,'heel':point(HEEL,0.,chain),
                'ball':point(BALL,0.,chain),'toe':point(TIP,0.,((TIP,toe),(HEEL,heel)))}
        y=-.1 if side is Side.NEAR else .1
        return ({k:(x,y,z) for k,(x,z) in points.items()},
                {'hip':thigh_angle,'knee':abs(angle_delta(thigh_angle,shin_angle)),
                 'ankle':angle_delta(pitch,shin_angle),'foot_pitch':pitch},
                (target[0],y,target[1]))

    def samples(self):
        rows=[]; h=1/128
        for time in times(self.motion.spec):
            for side in Side:
                before,ba,_=self.at(time-h,side)
                points,angles,target=self.at(time,side)
                after,aa,_=self.at(time+h,side)
                velocity={k:tuple((b-a)/(2*h) for a,b in zip(before[k],after[k])) for k in points}
                omega={k:angle_delta(aa[k],ba[k])/(2*h) for k in angles}
                rows.append(Sample(time,side,points,velocity,angles,omega,{},target))
        return rows

    def assess(self):
        return validate_cycle(self.samples(),self.motion.spec,SceneKind.NATIVE,
                              fps=self.motion.spec.fps,rest_hip_height=HIP_HEIGHT,
                              scene_sha256='source-assessment',alias='source-assessment')
