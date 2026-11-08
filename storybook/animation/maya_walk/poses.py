"""Coordinated reference poses at Maya's fixed proportions; no frame samples.

Lower swing keys use the two-link forward geometry of the cited joint poses.
The native IK remains the only runtime solver. All 134 scalar channels share
one GaitSpec clock, including constants, quaternion components and followers.
"""
import math
from dataclasses import dataclass

from .curves import ChannelHold, ChannelRule, Curve, Derived, Key, Motion, Turn
from .reference import Kind
from .spec import CHANNELS, TARGET, UPPER_BONES, finite


@dataclass(frozen=True)
class Amplitudes:
    hip: float = 1.
    knee: float = 1.
    ankle: float = 1.
    pelvis: float = 1.
    arms: float = 1.

    def __post_init__(self):
        if any(not finite(v) or v <= 0 for v in vars(self).values()):
            raise ValueError('Positive named joint amplitude factors required')


AMPLITUDES = Amplitudes()
HIP_HEIGHT = .94
THIGH, SHIN, ANKLE = .39, .36, .2
HEEL, BALL, TIP = -.09, .15, .28
# Static local axes of world Y from the pinned rest skeleton, not old motion.
UPPER_AXES = {
    'root': (0,0,-1), 'body': (0,0,-1), 'head': (0,0,-1),
    'hem_left': (0,0,-1), 'hem_right': (0,0,-1),
    'holding_shoulder': (.884918094,0,.465746641),
    'holding_arm': (.660627782,0,.750713587),
    'holding_forearm': (.877262235,0,.480011463),
    'lantern': (0,0,1), 'free_shoulder': (-.60744983,0,.794357896),
    'free_arm': (-.358978987,0,.933345437),
    'free_forearm': (-.724345088,0,.689437270),
}


def curve(channel, rows, *, holds=(), minima=(), maxima=(), travel=0., constant=False):
    rule=ChannelRule(channel, tuple(ChannelHold(*h) for h in holds),
                     tuple(Turn(p,Kind.MINIMUM) for p in minima)+tuple(Turn(p,Kind.MAXIMUM) for p in maxima),
                     travel,constant)
    return Curve(rule,tuple(Key(p,v,Derived()) for p,v in rows))


def rotate(point,pivot,degrees):
    x,z=point[0]-pivot,point[1]; a=math.radians(degrees)
    return pivot+math.cos(a)*x+math.sin(a)*z, -math.sin(a)*x+math.cos(a)*z


def author(spec=TARGET, amplitudes=AMPLITUDES):
    if type(amplitudes) is not Amplitudes:
        raise ValueError('Named amplitude factors required')
    stride=2*spec.expected_step_hip_ratio*HIP_HEIGHT
    c={}
    def put(item):
        c[item.rule.channel]=item
        return item
    def channel(owner,prop,index):
        return owner,prop,index
    # Loading lowers the pelvis; each midstance has one high point. The sparse
    # intermediate poses coordinate native reach without changing proportions.
    hip_half=((0.,.9266),(.05,.913),(.14,.926),(.25,.947),(.35,.9358),(.40,.9344))
    hip=put(curve(channel('CTRL_Hips','location',2),
        [(p+offset,HIP_HEIGHT+(z-HIP_HEIGHT)*amplitudes.pelvis) for offset in (0.,.5) for p,z in hip_half],
        minima=(.05,.55),maxima=(.25,.75)))
    put(curve(channel('CTRL_Hips','location',0),[(0.,0.),(.5,stride/2)],travel=stride))
    for name,x in (('Camera_Side',0.),('Camera_ThreeQuarter',1.7)):
        put(curve(channel(name,'location',0),[(0.,x),(.5,x+stride/2)],travel=stride))
    ff,ho,bo,to=spec.foot_flat,spec.heel_off,spec.ball_off,spec.toe_off
    # Shared control profile; far phase is applied only by the writer's clock.
    for side in ('near','far'):
        ch=lambda name,prop='rotation_euler',index=1: channel('CTRL_'+name+'_'+side,prop,index)
        heel=put(curve(ch('Heel'),[(p,math.radians(v)*amplitudes.ankle) for p,v in
            ((0.,-20),(.04,-12.3),(ff,0),(.8,0),(.88,-14),(.94,-20.8))],
            holds=((ff,.8),),minima=(.94,)))
        ball=put(curve(ch('BallRoll'),[(p,math.radians(v)*amplitudes.ankle) for p,v in
            ((0.,0),(ho,0),(.4,4),(.5,20),(to,48),(.64,56),(.72,44),(.8,15),(.88,0))],
            holds=((0.,ho),(.88,1.)),maxima=(.64,)))
        toe=put(curve(ch('ToePivot'),[(p,math.radians(v)*amplitudes.ankle) for p,v in
            ((0.,0),(bo,0),(to,8),(.64,9),(.72,0))],
            holds=((0.,bo),(.72,1.)),maxima=(.64,)))
        # Hip flexion and knee flexion from the reference signature at swing
        # poses, not independent invented ankle heights. Values between poses
        # are always the same periodic tangent rule.
        swing=((.68,15,60),(.72,24,63),(.80,30,45),(.88,32,20))
        xs=[(0.,.32),(to,.32)]; zs=[(0.,0.),(to,0.)]
        for p,h,k in swing:
            h=math.radians(h*amplitudes.hip); k=math.radians(k*amplitudes.knee)
            ankle=(0.,ANKLE)
            for pivot,profile in ((BALL,ball),(TIP,toe),(HEEL,heel)):
                ankle=rotate(ankle,pivot,math.degrees(profile.at(p)))
            xs.append((p,p*stride+THIGH*math.sin(h)+SHIN*math.sin(h-k)-ankle[0]))
            zs.append((p,hip.at(p)-THIGH*math.cos(h)-SHIN*math.cos(h-k)-ankle[1]))
        # Terminal extension poses retain forward heel progression. Solve
        # ankle height from the reference knee and the chosen deceleration
        # positions, rather than letting an independent height exceed reach.
        for p,x,k in ((.92,1.57,12),(.96,1.62,6),(.99,1.635,4.3)):
            x *= stride/1.316
            ankle=(0.,ANKLE)
            for pivot,profile in ((BALL,ball),(TIP,toe),(HEEL,heel)):
                ankle=rotate(ankle,pivot,math.degrees(profile.at(p)))
            length2=THIGH**2+SHIN**2+2*THIGH*SHIN*math.cos(math.radians(k*amplitudes.knee))
            z=hip.at(p)-math.sqrt(length2-(x+ankle[0]-p*stride)**2)-ankle[1]
            xs.append((p,x));zs.append((p,z))
        put(curve(ch('Foot','location',0),xs,holds=((0.,to),),travel=stride))
        put(curve(ch('Foot','location',2),zs,holds=((0.,to),),maxima=(.72,.88),minima=(.8,)))
    # Upper articulation in the same phase domain. Native far is visible near,
    # so the free and holding arms are authored in opposite leg phase.
    angles={
        'root': (0.,0.), 'body': (-1.4,0.), 'head': (1.2,.4),
        'hem_left': (0.,2.), 'hem_right': (0.,-2.),
        'holding_shoulder': (0.,-2.), 'holding_arm': (0.,-5.),
        'holding_forearm': (8.,2.), 'lantern': (-3.,2.),
        'free_shoulder': (0.,3.), 'free_arm': (0.,20.), 'free_forearm': (58.,8.),
    }
    phases=(0.,.125,.25,.375,.5,.625,.75,.875)
    wave=(0.,math.sqrt(.5),1.,math.sqrt(.5),0.,-math.sqrt(.5),-1.,-math.sqrt(.5))
    for bone in UPPER_BONES:
        base,amp=angles[bone]; amp*=amplitudes.arms
        axis=UPPER_AXES[bone]; norm=math.sqrt(sum(x*x for x in axis)); axis=tuple(x/norm for x in axis)
        q=[]
        for w in wave:
            a=math.radians(base+amp*w)/2
            q.append((math.cos(a),*(x*math.sin(a) for x in axis)))
        for prop,size in (('location',3),('scale',3),('rotation_quaternion',4)):
            for index in range(size):
                key=channel('MAYA_PAINTED_UPPER_RIG',f'pose.bones["{bone}"].{prop}',index)
                if prop!='rotation_quaternion' or amp==0 or (index>0 and axis[index-1]==0):
                    value=(1. if prop=='scale' else 0.) if prop!='rotation_quaternion' else q[0][index]
                    put(curve(key,[(0.,value)],constant=True))
                else:
                    # Closed trigonometric component cases of the declared
                    # oscillation: cosine is even when the base angle is zero.
                    if index==0 and base==0:
                        minima,maxima=(.25,.75),(0.,.5)
                    else:
                        sign=(-base*amp if index==0 else axis[index-1]*amp)
                        minima,maxima=((.75,),(.25,)) if sign>0 else ((.25,),(.75,))
                    put(curve(key,list(zip(phases,(v[index] for v in q))),minima=minima,maxima=maxima))
    return Motion(spec,tuple(c[k] for k in sorted(CHANNELS)))
