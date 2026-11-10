"""Sparse periodic Hermite source with one weighted-harmonic PCHIP rule.

Slopes are per cycle fraction. World translation uses translated seam neighbors.
No implicit zero slope, fitted boundary polynomial, or sampled correction exists.
"""
from dataclasses import dataclass, field
from enum import Enum
import math

from .reference import Kind
from .spec import CHANNELS, GaitSpec, finite


class Reason(str, Enum):
    HOLD = 'hold'
    TURNAROUND = 'turnaround'


@dataclass(frozen=True)
class Derived:
    pass


@dataclass(frozen=True)
class Pinned:
    slope: float
    reason: Reason

    def __post_init__(self):
        if not finite(self.slope) or not isinstance(self.reason, Reason):
            raise ValueError('Finite slope and closed pin reason required')


@dataclass(frozen=True)
class Key:
    phase: float
    value: float
    tangent: Derived | Pinned

    def __post_init__(self):
        if not finite(self.phase) or not 0 <= self.phase < 1 or not finite(self.value):
            raise ValueError('Finite key value and phase in [0, 1) required')
        if type(self.tangent) not in (Derived, Pinned):
            raise ValueError('Explicit Derived or Pinned tangent required')


@dataclass(frozen=True)
class ChannelHold:
    start: float
    end: float

    def __post_init__(self):
        if not all(finite(x) for x in (self.start, self.end)) or not 0 <= self.start < self.end <= 1:
            raise ValueError('Ordered hold interval within cycle required')

    def covers(self, start, end):
        return self.start-1e-10 <= start <= end <= self.end+1e-10


@dataclass(frozen=True)
class Turn:
    phase: float
    kind: Kind

    def __post_init__(self):
        if not finite(self.phase) or not 0 <= self.phase < 1 or not isinstance(self.kind, Kind):
            raise ValueError('Closed turnaround declaration required')


@dataclass(frozen=True)
class ChannelRule:
    channel: tuple
    holds: tuple[ChannelHold, ...] = ()
    turns: tuple[Turn, ...] = ()
    translation: float = 0.
    constant: bool = False

    def __post_init__(self):
        if type(self.channel) is not tuple or self.channel not in CHANNELS or type(self.channel[2]) is not int:
            raise ValueError('Closed animated channel required')
        if type(self.holds) is not tuple or any(type(h) is not ChannelHold for h in self.holds):
            raise ValueError('Typed immutable channel holds required')
        if type(self.turns) is not tuple or any(type(t) is not Turn for t in self.turns):
            raise ValueError('Typed immutable channel turns required')
        if len({t.phase for t in self.turns}) != len(self.turns):
            raise ValueError('Duplicate turnaround')
        if not finite(self.translation) or type(self.constant) is not bool:
            raise ValueError('Finite translation and explicit constant flag required')
        if self.constant and (self.holds or self.turns or self.translation):
            raise ValueError('Constants cannot declare motion')


def pchip(h0, h1, d0, d1):
    """Fritsch–Butland weighted harmonic mean, including periodic neighbors."""
    if d0*d1 <= 0:
        return 0.
    w1, w2 = 2*h1+h0, h1+2*h0
    return (w1+w2)/(w1/d0+w2/d1)


@dataclass(frozen=True)
class Curve:
    rule: ChannelRule
    keys: tuple[Key, ...]
    slopes: tuple[float, ...] = field(init=False)

    def __post_init__(self):
        if type(self.rule) is not ChannelRule or type(self.keys) is not tuple or not 1 <= len(self.keys) <= 12:
            raise ValueError('Spec-bound sparse curve requires 1 to 12 keys')
        if any(type(k) is not Key for k in self.keys) or any(b.phase <= a.phase for a,b in zip(self.keys,self.keys[1:])):
            raise ValueError('Strictly ordered typed keys required')
        if self.rule.constant:
            if len(self.keys) != 1 or type(self.keys[0].tangent) is not Derived:
                raise ValueError('Constant requires one derived key')
            object.__setattr__(self, 'slopes', (0.,))
            return
        if len(self.keys) < 2:
            raise ValueError('Moving curve needs at least two keys')
        widths, secants = [], []
        for i,a in enumerate(self.keys):
            b=self.keys[(i+1)%len(self.keys)]
            wrap=i==len(self.keys)-1
            h=b.phase+int(wrap)-a.phase
            d=(b.value+wrap*self.rule.translation-a.value)/h
            widths.append(h); secants.append(d)
            if abs(d) < 1e-12:
                # A wrapped flat segment must be covered on both seam sides.
                spans=((a.phase,1.),(0.,b.phase)) if wrap else ((a.phase,b.phase),)
                if any(y>x and not any(v.covers(x,y) for v in self.rule.holds) for x,y in spans):
                    raise ValueError('Flat segment lacks a declared channel hold')
        slopes=[]; observed=[]
        for i,k in enumerate(self.keys):
            a,b=secants[i-1],secants[i]
            m=pchip(widths[i-1],widths[i],a,b)
            turn=Kind.MAXIMUM if a>0>b else Kind.MINIMUM if a<0<b else None
            declared=[t for t in self.rule.turns if abs(t.phase-k.phase)<1e-10 and t.kind is turn]
            if turn:
                if len(declared)!=1:
                    raise ValueError('Extremum lacks matching declared turnaround')
                observed.append(declared[0])
            if type(k.tangent) is Pinned:
                hold=any(h.covers(k.phase,k.phase) or (k.phase==0 and h.end==1) for h in self.rule.holds)
                match=(hold and (abs(a)<1e-12 or abs(b)<1e-12)) if k.tangent.reason is Reason.HOLD else bool(declared)
                if not match or k.tangent.slope != 0 or abs(m)>1e-12:
                    raise ValueError('Pinned slope does not match declared hold or turnaround')
                m=k.tangent.slope
            slopes.append(m)
        if set(observed)!=set(self.rule.turns):
            raise ValueError('Declared turnaround absent from keys')
        object.__setattr__(self,'slopes',tuple(slopes))

    def at(self, phase, derivative=False):
        if not finite(phase) or type(derivative) is not bool:
            raise ValueError('Finite phase and boolean derivative required')
        if self.rule.constant:
            return 0. if derivative else self.keys[0].value
        cycle=math.floor(phase-self.keys[0].phase)
        p=phase-cycle
        i=next((j for j in range(len(self.keys)-1) if p<self.keys[j+1].phase),len(self.keys)-1)
        a,b=self.keys[i],self.keys[(i+1)%len(self.keys)]
        wrap=i==len(self.keys)-1
        h=b.phase+int(wrap)-a.phase; u=(p-a.phase)/h
        v0=a.value; v1=b.value+wrap*self.rule.translation
        m0,m1=self.slopes[i],self.slopes[(i+1)%len(self.keys)]
        if derivative:
            return ((6*u*u-6*u)*v0+(-6*u*u+6*u)*v1)/h+(3*u*u-4*u+1)*m0+(3*u*u-2*u)*m1
        return ((2*u**3-3*u*u+1)*v0+(u**3-2*u*u+u)*h*m0+
                (-2*u**3+3*u*u)*v1+(u**3-u*u)*h*m1+cycle*self.rule.translation)


@dataclass(frozen=True)
class Motion:
    spec: GaitSpec
    curves: tuple[Curve, ...]

    def __post_init__(self):
        if type(self.spec) is not GaitSpec or type(self.curves) is not tuple or any(type(c) is not Curve for c in self.curves):
            raise ValueError('Typed clock and sparse curves required')
        actual=[c.rule.channel for c in self.curves]
        if len(actual)!=len(CHANNELS) or set(actual)!=CHANNELS:
            raise ValueError('Every animated channel required exactly once')
