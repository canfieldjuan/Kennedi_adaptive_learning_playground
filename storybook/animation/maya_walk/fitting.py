"""Approved offline sparse-pose fitting; never imported by scene playback.

Pose values and, with the accepted timing amendment, interior key phases vary.
Holds, extrema anchors, PCHIP tangents, reference acceptance rules and native
proportions are fixed. The shared validator decides admission.
"""
from dataclasses import asdict, dataclass, replace
from enum import Enum
import hashlib
import json
import math
from pathlib import Path
import time
from . import differential as dmath

from .numerics import (bounded_step, bounded_least_squares, SolveStatus,
                       analytic_jacobian, UnreliableJacobian, TRUST_LIMIT, BOUND_TOLERANCE)
from .curves import Motion
from .poses import author, curve, HIP_HEIGHT
from .spec import FINE_SPACING, PROGRESSION_POINTS, TARGET, SceneKind, Side, THIGH_LENGTH, SHIN_LENGTH, finite
from .kinematics import NativeGeometry
from .sample_scene import fine_times, times, angle_delta
from .validate import interval_motion
from .reference import SIGNATURES, Kind


PHASES = {
    'hip_x': (0.,.05,.14,.35,.40,.49),
    'hip_z': (.05,.14,.30,.35,.40,.49),
    'foot_x': (0.,.6,.64,.68,.72,.76,.8,.84,.88,.92,.96,.99),
    'foot_z': (0.,.6,.64,.68,.72,.76,.8,.84,.88,.92,.96,.99),
    'heel': (0.,.02,.04,.06,.08,.8,.88,.92,.94,.98),
    'ball': (0.,.35,.4,.45,.5,.53,.55,.6,.64,.72,.8,.88),
    'toe': (0.,.53,.55,.58,.6,.62,.64,.68,.72),
}
ACTIVE = {'hip_x':tuple(range(1,6)), 'hip_z':tuple(range(6)),
          'foot_x':tuple(range(2,12)), 'foot_z':tuple(range(2,12)),
          'heel':(0,1,2,3,6,7,8,9), 'ball':tuple(range(2,11)), 'toe':tuple(range(2,8))}
CHANNEL = {'hip_x':('CTRL_Hips','location',0), 'hip_z':('CTRL_Hips','location',2),
           'foot_x':('CTRL_Foot_near','location',0),'foot_z':('CTRL_Foot_near','location',2),
           'heel':('CTRL_Heel_near','rotation_euler',1),
           'ball':('CTRL_BallRoll_near','rotation_euler',1),'toe':('CTRL_ToePivot_near','rotation_euler',1)}
HOLDS={'hip_x':(), 'hip_z':(), 'foot_x':((0.,.6),), 'foot_z':((0.,.6),),
       'heel':((.08,.8),),'ball':((0.,.35),(.88,1.)),'toe':((0.,.53),(.72,1.))}
MINIMA={'hip_x':(), 'hip_z':(.05,.55),'foot_x':(),'foot_z':(),'heel':(.94,),'ball':(),'toe':()}
MAXIMA={'hip_x':(), 'hip_z':(.30,.80),'foot_x':(),'foot_z':(.72,),'heel':(),'ball':(.64,),'toe':(.64,)}


class PoseSpace:
    def __init__(self):
        self.base=author()
        self.stride=2*TARGET.expected_step_hip_ratio*HIP_HEIGHT
        original={c.rule.channel:c for c in self.base.curves}
        self.fixed={name:[original[CHANNEL[name]].at(p) for p in phases] for name,phases in PHASES.items()}
        # Toe-tip clearance is measured after reverse-foot rotation. It does
        # not require a second maximum of the translating foot control.
        peak=self.fixed['foot_z'][4]
        for i,p in enumerate(PHASES['foot_z']):
            if p>.72:self.fixed['foot_z'][i]=peak*(1+math.cos(math.pi*(p-.72)/.28))/2
        self.parameters=[('plant_x',0)]+[(name,i) for name,ids in ACTIVE.items() for i in ids]
        self.initial=[self.fixed['foot_x'][0]]+[self.fixed[name][i] for name,ids in ACTIVE.items() for i in ids]
        self.scales=[.1]+[.1 if name in ('hip_x','foot_x') else .02 if name in ('hip_z','foot_z') else .2
                         for name,ids in ACTIVE.items() for i in ids]
        self.initial=[x/s for x,s in zip(self.initial,self.scales)]

    def build(self, values):
        if len(values)!=len(self.parameters):
            raise ValueError('Complete closed pose-value vector required')
        data={name:list(vals) for name,vals in self.fixed.items()}
        for (name,i),x,scale in zip(self.parameters,values,self.scales):
            if not dmath.finite(x):raise ValueError('Finite fit values required')
            if name=='plant_x':
                plant=x*scale
                data['foot_x'][0]=plant;data['foot_x'][1]=plant
            else:data[name][i]=x*scale
        if not .05<plant<.5 or not all(.83<z<1.0 for z in data['hip_z']):
            raise ValueError('Authoring search outside fixed rig envelope')
        if not all(0<x<self.stride/2 for x in data['hip_x'][1:]):raise ValueError('Forward hip phase order')
        if not all(0<z<.25 for z in data['foot_z'][2:]):raise ValueError('Swing source height bounds')
        result={c.rule.channel:c for c in self.base.curves}
        for name,vals in data.items():
            rows=list(zip(PHASES[name],vals))
            if name.startswith('hip_'):
                travel=self.stride if name=='hip_x' else 0.
                rows += [(p+.5,v+travel/2) for p,v in rows]
                result[CHANNEL[name]]=curve(CHANNEL[name],rows,holds=HOLDS[name],minima=MINIMA[name],maxima=MAXIMA[name],travel=travel)
            else:
                travel=self.stride if name=='foot_x' else 0.
                for side in ('near','far'):
                    key=(CHANNEL[name][0].removesuffix('near')+side,*CHANNEL[name][1:])
                    result[key]=curve(key,rows,holds=HOLDS[name],minima=MINIMA[name],maxima=MAXIMA[name],travel=travel)
        root=result[CHANNEL['hip_x']]
        for camera,x in (('Camera_Side',0.),('Camera_ThreeQuarter',1.7)):
            key=(camera,'location',0)
            result[key]=curve(key,[(k.phase,k.value+x) for k in root.keys],travel=self.stride)
        return Motion(TARGET,tuple(result[k] for k in sorted(result)))


class PoseChart:
    """Smooth interior coordinates of the same finite sparse key values.

    Positive interval fractions encode the fixed monotone branches. This avoids
    a singular active-set system when several neighboring values coincide.
    No phase, derivative, handle or polynomial coefficient is a fit variable.
    """
    def __init__(self, seed=None):
        self.owner=PoseSpace();d=self.owner.fixed;self.stride=self.owner.stride
        if seed is not None:
            curves={c.rule.channel:c for c in seed.curves}
            d={name:[curves[CHANNEL[name]].at(p) for p in phases] for name,phases in PHASES.items()}
        self.parameters=[];self.initial=[]
        def push(name, values):
            self.parameters.extend((name,i) for i in range(len(values)))
            self.initial.extend(values)
        def fraction(v,lo,hi):return math.log((v-lo)/(hi-v))
        def ramp(values):
            gaps=[b-a for a,b in zip(values,values[1:])]
            return [math.log(g/gaps[-1]) for g in gaps[:-1]]
        push('plant',[fraction(d['foot_x'][0],.05,.5)])
        push('hip_x',ramp([*d['hip_x'],self.stride/2]))
        z=d['hip_z'];lo,hi=z[0],z[2]
        push('hip_z',[fraction(lo,.83,1.),fraction(hi,lo,1.),fraction(z[1],lo,hi),*ramp([lo,z[5],z[4],z[3],hi])])
        push('foot_x',ramp([*d['foot_x'][1:],d['foot_x'][0]+self.stride]))
        z=d['foot_z'];peak=z[4]
        push('foot_z',[fraction(peak,0,.25),*ramp([0,z[2],z[3],peak]),
                       *ramp([0,*reversed(z[5:]),peak])])
        z=d['heel'];lo=z[8]
        push('heel',[math.log(-lo),*ramp([lo,z[7],z[6],0]),*ramp([lo,z[9],z[0],z[1],z[2],z[3],0])])
        z=d['ball'];peak=z[8]
        push('ball',[math.log(peak),*ramp([0,*z[2:9]]),*ramp([0,z[10],z[9],peak])])
        z=d['toe'];peak=z[6]
        push('toe',[math.log(peak),*ramp([0,*z[2:7]]),fraction(z[7],0,peak)])

    def build(self,values):
        if len(values)!=len(self.initial) or any(not dmath.finite(x) or abs(x)>35 for x in values):
            raise ValueError('Complete finite bounded pose-value chart required')
        it=iter(values)
        def take(n):return [next(it) for _ in range(n)]
        def fraction(v,lo,hi):return lo+(hi-lo)/(1+dmath.exp(-v))
        def ramp(lo,hi,params):
            weights=[dmath.exp(v) for v in params]+[1.];total=dmath.total(weights);out=[];c=0.
            for w in weights[:-1]:c+=w;out.append(lo+(hi-lo)*c/total)
            return out
        d={name:list(vals) for name,vals in self.owner.fixed.items()}
        plant=fraction(next(it),.05,.5)
        d['hip_x']=[0.,*ramp(0,self.stride/2,take(5))]
        a,b,c,*rest=take(6);lo=fraction(a,.83,1.);hi=fraction(b,lo,1.)
        z5,z4,z3=ramp(lo,hi,rest)
        d['hip_z']=[lo,fraction(c,lo,hi),hi,z3,z4,z5]
        d['foot_x']=[plant,plant,*ramp(plant,plant+self.stride,take(10))]
        a,*rest=take(10);peak=fraction(a,0,.25)
        z2,z3=ramp(0,peak,rest[:2]);tail=ramp(0,peak,rest[2:])
        d['foot_z']=[0.,0.,z2,z3,peak,*reversed(tail)]
        a,*rest=take(8);lo=-dmath.exp(a);z7,z6=ramp(lo,0,rest[:2]);z9,z0,z1,z2,z3=ramp(lo,0,rest[2:])
        d['heel']=[z0,z1,z2,z3,0.,0.,z6,z7,lo,z9]
        a,*rest=take(9);peak=dmath.exp(a);rise=ramp(0,peak,rest[:6]);z10,z9=ramp(0,peak,rest[6:])
        d['ball']=[0.,0.,*rise,peak,z9,z10,0.]
        a,*rest=take(6);peak=dmath.exp(a);rise=ramp(0,peak,rest[:4]);z7=fraction(rest[4],0,peak)
        d['toe']=[0.,0.,*rise,peak,z7,0.]
        raw=[plant]+[d[name][i] for name,ids in ACTIVE.items() for i in ids]
        return self.owner.build([v/s for v,s in zip(raw,self.owner.scales)])

    def step_bounds(self,values):
        """Value coordinates are open-interval charts: only the trust box bounds a step."""
        if len(values)!=len(self.initial):raise ValueError('Complete pose vector required')
        return [-TRUST_LIMIT]*len(values),[TRUST_LIMIT]*len(values)

    def project(self,values):return values


def time_anchors(name):
    period=.5 if name.startswith('hip_') else 1.
    anchors={0.,period}
    for start,end in HOLDS[name]:anchors.update((start,end))
    anchors.update(round(p%period,9) for p in (*MINIMA[name],*MAXIMA[name]))
    # Preserve authored contact-event keys in addition to held boundaries.
    if name=='ball':anchors.update((.5,TARGET.ball_off,TARGET.toe_off))
    if name=='toe':anchors.add(TARGET.toe_off)
    return tuple(sorted(anchors))


@dataclass(frozen=True)
class PhaseLayout:
    profiles: tuple

    def __post_init__(self):
        if type(self.profiles) is not tuple or any(type(r) is not tuple or len(r)!=2 for r in self.profiles):
            raise ValueError('Immutable named phase profiles required')
        names=[r[0] for r in self.profiles]
        if len(names)!=len(PHASES) or set(names)!=set(PHASES):
            raise ValueError('Exactly one phase profile per owned control')
        spacing=.25/TARGET.cycle_frames
        for name,phases in self.profiles:
            period=.5 if name.startswith('hip_') else 1.
            if type(phases) is not tuple or len(phases)!=len(PHASES[name]) or any(not dmath.finite(p) or not 0<=p<period for p in phases):
                raise ValueError('Complete finite phase profile in its period required')
            widths=[b-a for a,b in zip(phases,phases[1:])]+[phases[0]+period-phases[-1]]
            if min(widths)<spacing-1e-12:
                raise ValueError('Neighboring keys require one quarter frame including the seam')
            anchors=time_anchors(name)
            for original,actual in zip(PHASES[name],phases):
                if any(abs(original-a)<1e-12 for a in anchors):
                    if actual!=original:raise ValueError('Fixed key anchor moved')
                else:
                    lo=max(a for a in anchors if a<original)
                    hi=min(a for a in anchors if a>original)
                    if not lo<actual<hi:raise ValueError('Interior key crossed a fixed anchor')


# Timing coordinates are log gap ratios. Past this magnitude a key sits within
# about 1e-9 frame of its minimum spacing and its Jacobian column is numerically
# negligible; a finite bound is needed anyway because exp() raises past about
# 709.78. The chart refuses values outside; the step solver receives it as a bound.
TIMING_COORDINATE_LIMIT = 20.


class TimingChart:
    """Ordered interior times; fixed anchors and minimum spacing by construction."""
    def __init__(self, value_chart):
        self.value_chart=value_chart
        self.value_count=len(value_chart.initial)
        self.initial=list(value_chart.initial)
        self.parameters=list(value_chart.parameters)
        self.segments=[]
        spacing=.25/TARGET.cycle_frames
        for name,phases in PHASES.items():
            period=.5 if name.startswith('hip_') else 1.
            for lo,hi in zip(time_anchors(name),time_anchors(name)[1:]):
                ids=tuple(i for i,p in enumerate(phases) if lo<p<hi)
                if not ids:continue
                minima=[spacing]*(len(ids)+1)
                if lo==0 and phases[0]!=0:minima[0]=0.
                if hi==period and phases[0]!=0:minima[-1]=0.
                slack=hi-lo-sum(minima)
                if slack<=0:raise ValueError('No room for the fixed sparse key inventory')
                sequence=[lo,*(phases[i] for i in ids),hi]
                gaps=[max(b-a-m,1e-6) for a,b,m in zip(sequence,sequence[1:],minima)]
                encoded=[math.log(v/gaps[-1]) for v in gaps[:-1]]
                self.segments.append((name,lo,hi,ids,tuple(minima),slack))
                self.parameters.extend(('phase_'+name,i) for i in ids)
                self.initial.extend(encoded)

    def layout(self, values):
        if len(values)!=len(self.initial) or any(not dmath.finite(v) for v in values):
            raise ValueError('Complete finite timed pose vector required')
        coordinates=values[self.value_count:]
        if any(abs(v)>TIMING_COORDINATE_LIMIT for v in coordinates):raise ValueError('Bounded phase coordinates required')
        data={k:list(v) for k,v in PHASES.items()};index=0
        for name,lo,hi,ids,minima,slack in self.segments:
            weights=[dmath.exp(v) for v in coordinates[index:index+len(ids)]]+[1.]
            total=dmath.total(weights);position=lo
            for j,i in enumerate(ids):
                position+=minima[j]+slack*weights[j]/total
                data[name][i]=position
            index+=len(ids)
        return PhaseLayout(tuple((name,tuple(data[name])) for name in sorted(data)))

    def build(self, values):
        phases=dict(self.layout(values).profiles)
        motion=self.value_chart.build(values[:self.value_count])
        result={c.rule.channel:c for c in motion.curves}
        for name,profile in phases.items():
            keys=[CHANNEL[name]]
            if name.startswith('hip_'):
                profile=(*profile,*(p+.5 for p in profile))
            else:keys.append((keys[0][0].removesuffix('near')+'far',*keys[0][1:]))
            if name=='hip_x':keys.extend((camera,'location',0) for camera in ('Camera_Side','Camera_ThreeQuarter'))
            for key in keys:
                c=result[key]
                result[key]=replace(c,keys=tuple(replace(k,phase=p) for k,p in zip(c.keys,profile)))
        return Motion(motion.spec,tuple(result[k] for k in sorted(result)))

    def step_bounds(self,values):
        """Trust box clipped to the timing domain; x+bound stays inside in floating point.

        Exact without correction while TRUST_LIMIT <= limit/2: a clipped side has
        limit/2 <= |v| <= limit, so -limit-v is exact (Sterbenz) and v+bound lands on
        the wall exactly; an unclipped side's exact sum is inside the wall, and
        round-to-nearest cannot cross the representable wall.
        """
        if len(values)!=len(self.initial):raise ValueError('Complete timed pose vector required')
        lower,upper=self.value_chart.step_bounds(values[:self.value_count])
        limit=TIMING_COORDINATE_LIMIT
        for v in values[self.value_count:]:
            if not dmath.finite(v) or abs(v)>limit:raise ValueError('Timing coordinate outside its domain')
            lower.append(max(-TRUST_LIMIT,-limit-v));upper.append(min(TRUST_LIMIT,limit-v))
        return lower,upper

    def project(self,values):
        """Return the solver's rounding-level excess to the wall; larger excess stays refused."""
        limit=TIMING_COORDINATE_LIMIT;edge=limit+BOUND_TOLERANCE*TRUST_LIMIT
        return [*values[:self.value_count],
                *(math.copysign(limit,v) if limit<abs(v)<=edge else v for v in values[self.value_count:])]


# Search guide only; final acceptance is the independent validate_cycle result.
ANCHORS={
    'knee':((0.,3.,0.,5.),(.14,18.,15.,22.),(.4,3.,0.,5.),(.72,61.,60.,65.)),
    'hip':((.53,-10.,-15.,-5.),(.88,30.,25.,35.)),
    'ankle':((.08,-10.,-15.,-5.),(.45,8.,5.,15.),(.62,-18.,-25.,-15.),(.90,1.,-3.,5.)),
}


def desired(phase, knots):
    points=sorted((p,v) for p,v,*_ in knots)
    extended=[(points[-1][0]-1,points[-1][1]),*points,(points[0][0]+1,points[0][1])]
    for (a,x),(b,y) in zip(extended,extended[1:]):
        if a<=phase<=b:
            u=(phase-a)/(b-a)
            return x+(y-x)*(1-math.cos(math.pi*u))/2
    raise AssertionError('Guide coverage')


class Objective:
    def __init__(self, space, velocity_weight=1., guide_weight=1.):
        self.space=space
        self.velocity_weight=velocity_weight
        self.guide_weight=guide_weight
        self.schedule=sorted({t for t in times(TARGET) if 0<=t<=24}|
            {24*p for rows in ANCHORS.values() for p,*_ in rows})
        # Same fine grid and measurement owner as the validator's interval rules.
        self.fine=fine_times(0,24)
        self.calls=0

    def fine_motion(self,model):
        """Near-side fine interval measurements over the closed cycle and seam."""
        rows=[model.at(t,Side.NEAR) for t in self.fine]
        return interval_motion(self.fine,{k:[r[1][k] for r in rows] for k in rows[0][1]},
                               {k:[r[0][k][0] for r in rows] for k in PROGRESSION_POINTS},
                               TARGET,0.,24.,FINE_SPACING)

    def residuals(self,x):
        model=NativeGeometry(self.space.build(x)); self.calls+=1
        samples=[]; out=[]; h=1/128
        for t in self.schedule:
            pts,a,target=model.at(t,Side.NEAR)
            b,ba,_=model.at(t-h,Side.NEAR); c,ca,_=model.at(t+h,Side.NEAR)
            omega={k:angle_delta(ca[k],ba[k])/(2*h) for k in a}
            velocity={k:tuple((v-u)/(2*h) for u,v in zip(b[k],c[k])) for k in pts}
            samples.append((t,pts,a,omega,velocity))
            p=t/24
            reach=dmath.dist(pts['hip'],target)
            if reach>THIGH_LENGTH+SHIN_LENGTH-1e-5:
                raise ValueError('Search proposals must remain strictly reachable')
            out.append(dmath.maximum(0.,reach-(THIGH_LENGTH+SHIN_LENGTH-1e-5))/.0001)
            for point in ('heel','ball','toe'):out.append(dmath.maximum(0.,-pts[point][2])/ .001)
            for point in ('hip','knee','ankle','toe'):
                applies=point in ('hip','knee') or p>=TARGET.toe_off-1e-9
                out.append(dmath.maximum(0.,-velocity[point][0]+.0001)/.002 if applies else 0.)
            for joint,anchors in ANCHORS.items():
                # Low-weight guide, never a new admission band.
                out.append(self.guide_weight*(a[joint]-desired(p%1,anchors))/5)
        turns={}
        for joint in ANCHORS:
            selected=[]
            for expected in SIGNATURES[joint]:
                rows=[row for row in samples[:-1] if expected.contains((row[0]/24)%1)]
                row=(dmath.minimum if expected.kind is Kind.MINIMUM else dmath.maximum)(rows,key=lambda row:row[2][joint])
                v=row[2][joint]
                selected.append((row[0],expected.kind))
                low,high=expected.low,expected.high
                out.append(dmath.maximum(0.,low+.05-v,v-(high-.05))/.15)
                out.append(self.guide_weight*(v-(low+high)/2)/60)
            turns[joint]=sorted(selected)
        out.append(dmath.maximum(0.,samples[0][2]['knee']-4.95)/.15)
        for a,b in zip(samples,samples[1:]):
            dt=b[0]-a[0]
            for joint in ANCHORS:
                # One monotone branch between each window's selected extremum.
                # This also guides away from extra reversals *inside* a window;
                # window membership alone does not imply correct peak count.
                t=(a[0]+b[0])/2
                prior=[k for u,k in turns[joint] if u<=t]
                kind=prior[-1] if prior else turns[joint][-1][1]
                sign=1 if kind is Kind.MINIMUM else -1
                out.append(dmath.maximum(0.,-sign*(b[2][joint]-a[2][joint])/dt-.001)/.1)
        # Fine interval families. sqrt(δ/.25) keeps a violation sustained over
        # one quarter frame at its former weight; only hidden motion gains.
        weight=math.sqrt(FINE_SPACING/.25)
        motion=self.fine_motion(model)
        for values in motion['acceleration'].values():
            for _,jump in values:out.append(self.velocity_weight*weight*dmath.maximum(0.,jump-1.98)/.15)
        for intervals in motion['forward'].values():
            for _,_,vx,applies in intervals:out.append(weight*dmath.maximum(0.,-vx+.0001)/.002 if applies else 0.)
        grid=[r for r in samples if abs(r[0]*4-round(r[0]*4))<1e-8]
        holds={v.point.value:v for v in TARGET.holds(SceneKind.NATIVE)}
        for point in ('hip','knee','ankle','heel','ball','toe'):
            prior=None
            for a,b in zip(grid,grid[1:]):
                held=point in holds and holds[point].covers(a[0]/24,b[0]/24)
                speed=dmath.dist(a[1][point],b[1][point])/(b[0]-a[0])
                out.append(dmath.maximum(0.,.0055-dmath.maximum(prior,speed))/.001 if prior is not None and not held else 0.)
                prior=None if held else speed
            if point in holds:
                hold=holds[point];entry=hold.start*24
                # The heel's approach crosses the seam; translate sample time.
                approach=[r for r in samples if (entry-hold.approach*24 <= r[0]<=entry)] if entry else [r for r in samples if r[0]>=24*(1-hold.approach)]
                for a,b in zip(approach,approach[1:]):
                    change=dmath.dist(b[4][point],(0,0,0))-dmath.dist(a[4][point],(0,0,0))
                    out.append(dmath.maximum(0.,change-.0003)/.001)
        release=dmath.minimum(samples,key=lambda r:abs(r[0]-14.4))
        for point in ('ankle','heel'):
            out.append(dmath.maximum(0.,.006-dmath.dist(release[4][point],(0,0,0)))/.001)
        for hold in holds.values():
            t=hold.end*TARGET.cycle_frames
            before=model.at(t,Side.NEAR)[0][hold.point.value]
            after=model.at(t+h,Side.NEAR)[0][hold.point.value]
            out.append(dmath.maximum(0.,2e-9-dmath.dist(before,after))/1e-9)
        pre=dmath.maximum(r[1]['toe'][2] for r in samples if .6<r[0]/24<.75)
        dip=dmath.minimum(r[1]['toe'][2] for r in samples if .75<=r[0]/24<=.85)
        post=dmath.maximum(r[1]['toe'][2] for r in samples if .85<r[0]/24<1.)
        for peak in (pre,post):out.append(dmath.maximum(0.,.0015-(peak-dip))/.0001)
        for phase,sign in ((.75,-1),(.85,1)):
            row=dmath.minimum(samples,key=lambda r:abs(r[0]-phase*24))
            out.append(dmath.maximum(0.,-sign*row[4]['toe'][2])/.001)
        return out

    def score(self,x):
        try:r=self.residuals(x)
        except (ValueError,ZeroDivisionError):return math.inf,None
        return dmath.total(v*v for v in r),r


class FitTermination(str, Enum):
    RUNNING = 'running'
    GAIT_PASS = 'gait_pass'
    ITERATION_LIMIT = 'iteration_limit'
    NO_DESCENT = 'no_descent'
    LINEAR_SOLVE_FAILED = 'linear_solve_failed'
    DERIVATIVES_UNRESOLVED = 'derivatives_unresolved'


# Existing outer-search constants, named so one function owns damping.
DAMPING_START = .05
DAMPING_RAISE = 5.
DAMPING_FLOOR = 1e-7
STEP_ATTEMPTS = 9
DESCENT_FLOOR = 1e-10
# Conventional gain-ratio bands for damping control: actual reduction over the
# reduction the undamped linear model predicted. Numerical, never gait limits.
RATIO_RAISE = .25
RATIO_LOWER = .75


class StepVerdict(str, Enum):
    ADMITTED = 'admitted'
    UNSOLVED = 'unsolved'
    OUT_OF_DOMAIN = 'out_of_domain'
    NON_FINITE = 'non_finite'
    NO_DECREASE = 'no_decrease'
    NON_POSITIVE_PREDICTION = 'non_positive_prediction'


@dataclass(frozen=True)
class StepReceipt:
    """What one attempt at one damping did; the only input to the next damping.

    actual is the score before minus the score after. predicted is the
    reduction the undamped linear model gives for the displacement that was
    evaluated. A value that was not measured, or was not finite, is None.
    """
    damping: float
    verdict: StepVerdict
    actual: float | None = None
    predicted: float | None = None

    def __post_init__(self):
        if not isinstance(self.verdict, StepVerdict):
            raise ValueError('Closed step verdict required')
        if not finite(self.damping) or self.damping <= 0:
            raise ValueError('Positive finite damping required')
        if any(v is not None and not finite(v) for v in (self.actual, self.predicted)):
            raise ValueError('A receipt holds finite numbers or nothing')
        if self.verdict is StepVerdict.ADMITTED and (
                self.actual is None or self.actual <= DESCENT_FLOOR or self.ratio is None):
            raise ValueError('Admission requires real descent and a finite positive prediction')

    @property
    def ratio(self):
        if self.actual is None or self.predicted is None or self.predicted <= 0:
            return None
        value = self.actual/self.predicted
        return value if math.isfinite(value) else None

    def record(self):
        return {'damping': self.damping, 'verdict': self.verdict.value,
                'actual': self.actual, 'predicted': self.predicted, 'ratio': self.ratio}


def next_damping(receipt):
    """The only place damping changes after initialization.

    Only an admitted full step that the linear model predicted well lowers it.
    """
    if receipt.verdict is not StepVerdict.ADMITTED or receipt.ratio < RATIO_RAISE:
        return receipt.damping*DAMPING_RAISE
    if receipt.ratio < RATIO_LOWER:
        return receipt.damping
    return max(DAMPING_FLOOR, receipt.damping/2)


def _linear_reduction(columns, residuals, moved):
    """-(2 r.Jd + |Jd|^2): equals |r|^2 - |r + Jd|^2 without cancellation."""
    try:
        effect = [math.fsum(c*d for c, d in zip(row, moved)) for row in zip(*columns)]
        return -(2*math.fsum(r*e for r, e in zip(residuals, effect))
                 + math.fsum(e*e for e in effect))
    except (OverflowError, ValueError):
        return math.nan


def trial_step(objective, space, x, score, residuals, columns, solution, damping):
    """Score the full converged step once and report what it did.

    The only consumer of a numerical step requires its convergence receipt.
    There is no shortened retry: a step that is too long is refused, and the
    caller raises damping and solves again on the same linearization.
    Returns (receipt, (values, score, residuals)) or (receipt, None).
    """
    step = solution.require_converged()
    trial = space.project([a+b for a, b in zip(x, step)])
    value, after = objective.score(trial)
    predicted = _linear_reduction(columns, residuals, [a-b for a, b in zip(trial, x)])
    predicted = predicted if math.isfinite(predicted) else None

    def refuse(verdict, actual=None):
        return StepReceipt(damping, verdict, actual, predicted), None
    if after is None:
        return refuse(StepVerdict.OUT_OF_DOMAIN)
    actual = score-value
    if not math.isfinite(actual):
        return refuse(StepVerdict.NON_FINITE)
    if actual <= DESCENT_FLOOR:
        return refuse(StepVerdict.NO_DECREASE, actual)
    if predicted is None:
        return refuse(StepVerdict.NON_FINITE, actual)
    if predicted <= 0:
        return refuse(StepVerdict.NON_POSITIVE_PREDICTION, actual)
    if not math.isfinite(actual/predicted):
        return refuse(StepVerdict.NON_FINITE, actual)
    return StepReceipt(damping, StepVerdict.ADMITTED, actual, predicted), (trial, value, after)


def admit_step(objective, space, x, score, residuals, columns, damping):
    """One iteration's bounded attempts on one linearization.

    Each attempt solves at the current damping and scores that full step once.
    Returns (update or None, next damping, receipts, solve records).
    """
    receipts, solves = [], []
    lower, upper = space.step_bounds(x)
    for _ in range(STEP_ATTEMPTS):
        solution = bounded_least_squares(columns, [-v for v in residuals], damping, lower=lower, upper=upper)
        solves.append({k: v for k, v in asdict(solution).items() if k not in ('step', 'scales')})
        if solution.status is SolveStatus.CONVERGED:
            receipt, update = trial_step(objective, space, x, score, residuals, columns, solution, damping)
        else:
            receipt, update = StepReceipt(damping, StepVerdict.UNSOLVED), None
        receipts.append(receipt)
        damping = next_damping(receipt)
        if update is not None:
            return update, damping, receipts, solves
    return None, damping, receipts, solves


def fit(output, iterations=160, resume=None, seed=None, velocity_weight=1., timing=False, value_seed=None, guide_weight=1.):
    if type(iterations) is not int or not 1<=iterations<=1000:
        raise ValueError('Fitting requires an explicit bounded iteration count')
    if not finite(velocity_weight) or not .01<=velocity_weight<=1.:
        raise ValueError('Positive bounded objective weight required; acceptance is always unchanged')
    if not finite(guide_weight) or not 0<=guide_weight<=1.:
        raise ValueError('Bounded shaping preference required; acceptance is always unchanged')
    if sum(p is not None for p in (resume,seed,value_seed))>1:raise ValueError('One explicit starting source required')
    if type(timing) is not bool or (value_seed and not timing):raise ValueError('Value-to-timing transition requires timing mode')
    signature=hashlib.sha256(json.dumps({'phases':PHASES,'holds':HOLDS,'minima':MINIMA,'maxima':MAXIMA,
        'anchors':{n:time_anchors(n) for n in PHASES},'spacing':.25,'timing':timing},sort_keys=True).encode()).hexdigest()
    starting_path=next((p for p in (resume,seed,value_seed) if p is not None),None)
    input_pin=hashlib.sha256(Path(starting_path).read_bytes()).hexdigest() if starting_path else None
    seed=PoseSpace().build(json.loads(Path(seed).read_text())['values']) if seed else None
    value_chart=PoseChart(seed)
    space=TimingChart(value_chart) if timing else value_chart
    objective=Objective(space,velocity_weight,guide_weight);x=list(space.initial)
    if resume:
        prior=json.loads(Path(resume).read_text())
        if prior.get('source_signature')!=signature:raise ValueError('Resume layout or coordinate system differs; use a pinned explicit seed')
        x=list(prior['values'])
    if value_seed:
        prior=json.loads(Path(value_seed).read_text())
        if prior.get('parameters')!=[list(p) for p in value_chart.parameters]:raise ValueError('Value-seed parameter inventory differs')
        x[:space.value_count]=prior['values']
    score,r=objective.score(x)
    if r is None:raise ValueError('Initial pose outside closed curve constraints')
    damping=DAMPING_START;start=time.monotonic();stuck=0
    termination=FitTermination.RUNNING
    for iteration in range(iterations):
        derivative=analytic_jacobian(objective.score,x,r)
        accepted=False;solves=[];attempts=[]
        try:
            jac=derivative.require_resolved()
        except UnreliableJacobian:
            termination=FitTermination.DERIVATIVES_UNRESOLVED
        else:
            update,damping,receipts,solves=admit_step(objective,space,x,score,r,jac,damping)
            attempts=[{'solve_status':solve['status'].value,**receipt.record()} for solve,receipt in zip(solves,receipts)]
            if update is not None:
                x,score,r=update;accepted=True
            if all(receipt.verdict is StepVerdict.UNSOLVED for receipt in receipts):
                termination=FitTermination.LINEAR_SOLVE_FAILED
        stuck=0 if accepted else stuck+1
        if stuck>=3 and termination is FitTermination.RUNNING:
            termination=FitTermination.NO_DESCENT
        if iteration==iterations-1 and termination is FitTermination.RUNNING:
            termination=FitTermination.ITERATION_LIMIT
        record={'iteration':iteration,'score':score,'values':x,'parameters':space.parameters,'velocity_weight':velocity_weight,'guide_weight':guide_weight,
                'source_signature':signature,'input_sha256':input_pin,'timing':timing,
                'calls':objective.calls,'seconds':time.monotonic()-start,'damping':damping,
                'numerics':{'method':'scaled-qr-active-set-v1','jacobian':'forward-mode-v1','solves':solves,'attempts':attempts,
                            'differences':[asdict(d) for d in derivative.differences]},
                'termination':termination.value}
        if iteration%10==0 or stuck:
            report=NativeGeometry(space.build(x)).assess()
            record['validation']=report['violation_counts']
            record['status']=report['status']
            output.write_text(json.dumps(record,indent=2,allow_nan=False))
            output.with_suffix('.validation.json').write_text(json.dumps(report,indent=2))
            output.with_suffix('.source.json').write_text(json.dumps({'status':report['status'],'motion':asdict(space.build(x))},indent=2))
            print('FIT_PROGRESS',json.dumps({k:v for k,v in record.items() if k not in ('values','parameters','source_signature','input_sha256','numerics')}),flush=True)
            if report['status']=='PASS':
                record['termination']=FitTermination.GAIT_PASS.value
                output.write_text(json.dumps(record,indent=2,allow_nan=False))
                return record
        if termination is not FitTermination.RUNNING:break
    report=NativeGeometry(space.build(x)).assess()
    record['validation']=report['violation_counts']
    record['status']=report['status']
    if report['status']=='PASS':record['termination']=FitTermination.GAIT_PASS.value
    output.write_text(json.dumps(record,indent=2,allow_nan=False))
    output.with_suffix('.validation.json').write_text(json.dumps(report,indent=2))
    output.with_suffix('.source.json').write_text(json.dumps({'status':report['status'],'motion':asdict(space.build(x))},indent=2))
    return record


if __name__=='__main__':
    import argparse,os
    os.umask(0o077)
    parser=argparse.ArgumentParser();parser.add_argument('--output',required=True,type=Path)
    parser.add_argument('--iterations',type=int,default=160);parser.add_argument('--resume',type=Path)
    parser.add_argument('--seed',type=Path)
    parser.add_argument('--velocity-weight',type=float,default=1.)
    parser.add_argument('--guide-weight',type=float,default=1.)
    parser.add_argument('--timing',action='store_true');parser.add_argument('--value-seed',type=Path)
    args=parser.parse_args();fit(args.output,args.iterations,args.resume,args.seed,args.velocity_weight,args.timing,args.value_seed,args.guide_weight)
