"""Approved offline sparse-pose fitting; never imported by scene playback.

Only key VALUES vary. Phase grid, holds, extrema declarations, PCHIP tangents,
reference acceptance rules and native proportions are fixed. The shared
validator, not the numerical objective, decides admission.
"""
import json
import math
from pathlib import Path
import time

from .curves import Motion
from .poses import author, curve, HIP_HEIGHT
from .spec import TARGET, SceneKind, Side, THIGH_LENGTH, SHIN_LENGTH, finite
from .kinematics import NativeGeometry
from .sample_scene import times, angle_delta
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
            if not finite(x):raise ValueError('Finite fit values required')
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
        if len(values)!=len(self.initial) or any(not finite(x) or abs(x)>35 for x in values):
            raise ValueError('Complete finite bounded pose-value chart required')
        it=iter(values)
        def take(n):return [next(it) for _ in range(n)]
        def fraction(v,lo,hi):return lo+(hi-lo)/(1+math.exp(-v))
        def ramp(lo,hi,params):
            weights=[math.exp(v) for v in params]+[1.];total=sum(weights);out=[];c=0.
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
        a,*rest=take(8);lo=-math.exp(a);z7,z6=ramp(lo,0,rest[:2]);z9,z0,z1,z2,z3=ramp(lo,0,rest[2:])
        d['heel']=[z0,z1,z2,z3,0.,0.,z6,z7,lo,z9]
        a,*rest=take(9);peak=math.exp(a);rise=ramp(0,peak,rest[:6]);z10,z9=ramp(0,peak,rest[6:])
        d['ball']=[0.,0.,*rise,peak,z9,z10,0.]
        a,*rest=take(6);peak=math.exp(a);rise=ramp(0,peak,rest[:4]);z7=fraction(rest[4],0,peak)
        d['toe']=[0.,0.,*rise,peak,z7,0.]
        raw=[plant]+[d[name][i] for name,ids in ACTIVE.items() for i in ids]
        return self.owner.build([v/s for v,s in zip(raw,self.owner.scales)])

    def project(self,values):return values


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
    def __init__(self, space, velocity_weight=1.):
        self.space=space
        self.velocity_weight=velocity_weight
        self.schedule=sorted({t for t in times(TARGET) if 0<=t<=24}|
            {24*p for rows in ANCHORS.values() for p,*_ in rows})
        self.calls=0

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
            reach=math.dist(pts['hip'],target)
            if reach>THIGH_LENGTH+SHIN_LENGTH-1e-5:
                raise ValueError('Search proposals must remain strictly reachable')
            out.append(max(0.,reach-(THIGH_LENGTH+SHIN_LENGTH-1e-5))/.0001)
            for point in ('heel','ball','toe'):out.append(max(0.,-pts[point][2]-.0002)/.001)
            for joint,anchors in ANCHORS.items():
                # Low-weight guide, never a new admission band.
                out.append((a[joint]-desired(p%1,anchors))/5)
                # Search for the intended order by sign outside the extrema
                # windows. The validator still uses prominence and all samples.
                inside_window=any(v.contains(p%1) for v in SIGNATURES[joint])
                slope=desired((p+1e-5)%1,anchors)-desired((p-1e-5)%1,anchors)
                sign=1 if slope>=0 else -1
                out.append(max(0.,-sign*omega[joint]-.02)/.2 if not inside_window else 0.)
        for joint in ANCHORS:
            for expected in SIGNATURES[joint]:
                values=[row[2][joint] for row in samples if expected.contains((row[0]/24)%1)]
                v=(min if expected.kind is Kind.MINIMUM else max)(values)
                low,high=expected.low,expected.high
                out.append(max(0.,low+.05-v,v-(high-.05))/.15)
                out.append((v-(low+high)/2)/60)
        out.append(max(0.,samples[0][2]['knee']-4.95)/.15)
        for a,b in zip(samples,samples[1:]):
            dt=b[0]-a[0]
            for joint in a[3]:out.append(self.velocity_weight*max(0.,abs(b[3][joint]-a[3][joint])*.25/dt-1.98)/.15)
            for joint,anchors in ANCHORS.items():
                pa,pb=a[0]/24,b[0]/24
                outside=[p for p in (pa,pb) if not any(v.contains(p%1) for v in SIGNATURES[joint])]
                if outside:
                    p=outside[0]
                    sign=1 if desired((p+1e-5)%1,anchors)>=desired((p-1e-5)%1,anchors) else -1
                    out.append(max(0.,-sign*(b[2][joint]-a[2][joint])/dt)/.1)
                else:out.append(0.)
            for point in ('hip','knee','ankle','toe'):
                vx=(b[1][point][0]-a[1][point][0])/dt
                applies=point in ('hip','knee') or a[0]>=14.4-1e-9
                out.append(max(0.,-vx+.0001)/.002 if applies else 0.)
        grid=[r for r in samples if abs(r[0]*4-round(r[0]*4))<1e-8]
        holds={v.point.value:v for v in TARGET.holds(SceneKind.NATIVE)}
        for point in ('hip','knee','ankle','heel','ball','toe'):
            prior=None
            for a,b in zip(grid,grid[1:]):
                held=point in holds and holds[point].covers(a[0]/24,b[0]/24)
                speed=math.dist(a[1][point],b[1][point])/(b[0]-a[0])
                out.append(max(0.,.0055-max(prior,speed))/.001 if prior is not None and not held else 0.)
                prior=None if held else speed
            if point in holds:
                hold=holds[point];entry=hold.start*24
                # The heel's approach crosses the seam; translate sample time.
                approach=[r for r in samples if (entry-hold.approach*24 <= r[0]<=entry)] if entry else [r for r in samples if r[0]>=24*(1-hold.approach)]
                for a,b in zip(approach,approach[1:]):
                    change=math.dist(b[4][point],(0,0,0))-math.dist(a[4][point],(0,0,0))
                    out.append(max(0.,change-.0003)/.001)
        release=min(samples,key=lambda r:abs(r[0]-14.4))
        for point in ('ankle','heel'):
            out.append(max(0.,.006-math.dist(release[4][point],(0,0,0)))/.001)
        pre=max(r[1]['toe'][2] for r in samples if .6<r[0]/24<.75)
        dip=min(r[1]['toe'][2] for r in samples if .75<=r[0]/24<=.85)
        post=max(r[1]['toe'][2] for r in samples if .85<r[0]/24<1.)
        for peak in (pre,post):out.append(max(0.,.0015-(peak-dip))/.0001)
        for phase,sign in ((.75,-1),(.85,1)):
            row=min(samples,key=lambda r:abs(r[0]-phase*24))
            out.append(max(0.,-sign*row[4]['toe'][2])/.001)
        return out

    def score(self,x):
        try:r=self.residuals(x)
        except (ValueError,ZeroDivisionError):return math.inf,None
        return sum(v*v for v in r),r


def solve(matrix, vector):
    """Pivoted elimination for the small pose-value normal system only."""
    a=[list(row)+[value] for row,value in zip(matrix,vector)]
    n=len(a)
    for i in range(n):
        pivot=max(range(i,n),key=lambda j:abs(a[j][i]));a[i],a[pivot]=a[pivot],a[i]
        if abs(a[i][i])<1e-14:raise ValueError('Singular fit step')
        scale=a[i][i]
        for k in range(i,n+1):a[i][k]/=scale
        for j in range(i+1,n):
            scale=a[j][i]
            for k in range(i,n+1):a[j][k]-=scale*a[i][k]
    result=[0.]*n
    for i in range(n-1,-1,-1):result[i]=a[i][-1]-sum(a[i][j]*result[j] for j in range(i+1,n))
    return result


def fit(output, iterations=160, resume=None, seed=None, velocity_weight=1.):
    if type(iterations) is not int or not 1<=iterations<=1000:
        raise ValueError('Fitting requires an explicit bounded iteration count')
    if not finite(velocity_weight) or not .01<=velocity_weight<=1.:
        raise ValueError('Positive bounded objective weight required; acceptance is always unchanged')
    seed=PoseSpace().build(json.loads(Path(seed).read_text())['values']) if seed else None
    space=PoseChart(seed); objective=Objective(space,velocity_weight)
    x=list(json.loads(Path(resume).read_text())['values']) if resume else space.initial
    score,r=objective.score(x)
    if r is None:raise ValueError('Initial pose outside closed curve constraints')
    damping=.05;start=time.monotonic();stuck=0
    for iteration in range(iterations):
        jac=[]
        for j in range(len(x)):
            epsilon=1e-4;trial=list(x);trial[j]+=epsilon
            _,rr=objective.score(trial)
            if rr is None:
                epsilon=-epsilon;trial[j]=x[j]+epsilon;_,rr=objective.score(trial)
            if rr is None:jac.append([0.]*len(r))
            else:jac.append([(b-a)/epsilon for a,b in zip(r,rr)])
        n=len(x); normal=[[0.]*n for _ in range(n)]
        for i in range(n):
            for j in range(i+1):normal[i][j]=normal[j][i]=sum(a*b for a,b in zip(jac[i],jac[j]))
        gradient=[-sum(a*b for a,b in zip(col,r)) for col in jac]
        accepted=False
        for attempt in range(9):
            matrix=[row[:] for row in normal]
            for i in range(n):matrix[i][i]+=damping*max(1.,normal[i][i])
            step=solve(matrix,gradient)
            step=[max(-.5,min(.5,v)) for v in step]
            for power in range(14):
                alpha=.5**power;trial=space.project([a+alpha*b for a,b in zip(x,step)])
                value,rr=objective.score(trial)
                if value<score-1e-10:
                    x,score,r=trial,value,rr;accepted=True;break
            if accepted:damping=max(1e-7,damping/2);break
            damping*=5
        stuck=0 if accepted else stuck+1
        record={'iteration':iteration,'score':score,'values':x,'parameters':space.parameters,'velocity_weight':velocity_weight,
                'calls':objective.calls,'seconds':time.monotonic()-start,'damping':damping}
        if iteration%10==0 or stuck:
            report=NativeGeometry(space.build(x)).assess()
            record['validation']=report['violation_counts']
            output.write_text(json.dumps(record,indent=2))
            output.with_suffix('.validation.json').write_text(json.dumps(report,indent=2))
            print('FIT_PROGRESS',json.dumps({k:v for k,v in record.items() if k not in ('values','parameters')}),flush=True)
            if report['status']=='PASS':return record
        if stuck>=3:break
    report=NativeGeometry(space.build(x)).assess()
    record['validation']=report['violation_counts']
    record['status']=report['status']
    output.write_text(json.dumps(record,indent=2))
    output.with_suffix('.validation.json').write_text(json.dumps(report,indent=2))
    return record


if __name__=='__main__':
    import argparse,os
    os.umask(0o077)
    parser=argparse.ArgumentParser();parser.add_argument('--output',required=True,type=Path)
    parser.add_argument('--iterations',type=int,default=160);parser.add_argument('--resume',type=Path)
    parser.add_argument('--seed',type=Path)
    parser.add_argument('--velocity-weight',type=float,default=1.)
    args=parser.parse_args();fit(args.output,args.iterations,args.resume,args.seed,args.velocity_weight)
