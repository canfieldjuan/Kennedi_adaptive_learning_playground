"""Finite forward-mode arithmetic for the offline fitting measurement only.

Normal numbers delegate to the original primitives. A Dual cannot implicitly
become a float: an unadapted primitive must refuse, never erase sensitivity.
Uncertain directions survive until Jacobian admission, including abs/min/max
ties. No pose, interpolation or geometry formula is duplicated here.
"""
import builtins
from dataclasses import dataclass
from enum import Enum
import math


class Failure(str, Enum):
    NONSMOOTH = 'nonsmooth'
    NONFINITE = 'nonfinite'
    UNSUPPORTED = 'unsupported'
    PRIMAL_MISMATCH = 'primal_mismatch'


class DifferentiationFailure(RuntimeError):
    def __init__(self, reason):
        if type(reason) is not Failure:
            raise TypeError('Closed differentiation failure required')
        self.reason = reason
        super().__init__(reason.value)


def finite(value):
    return type(value) is Dual or (type(value) in (int, float) and math.isfinite(value))


def primal(value):
    return value.value if type(value) is Dual else value


@dataclass(frozen=True, slots=True, eq=False)
class Dual:
    value: float
    gradient: tuple
    uncertain: frozenset = frozenset()

    def __post_init__(self):
        if type(self.value) not in (int, float) or not math.isfinite(self.value):
            raise ValueError('Finite numeric primal required')
        if type(self.gradient) is not tuple or not self.gradient or any(
                type(v) not in (int, float) or not math.isfinite(v) for v in self.gradient):
            raise ValueError('Nonempty immutable finite gradient required')
        if type(self.uncertain) is not frozenset or any(
                type(i) is not int or not 0 <= i < len(self.gradient) for i in self.uncertain):
            raise ValueError('Closed uncertain direction indices required')

    @classmethod
    def variable(cls, value, index, size):
        if type(size) is not int or size < 1 or type(index) is not int or not 0 <= index < size:
            raise ValueError('Valid direction and positive dimension required')
        return cls(value, tuple(1. if i == index else 0. for i in range(size)))

    def _parts(self, other):
        if type(other) is Dual:
            if len(other.gradient) != len(self.gradient):
                raise ValueError('Derivative dimensions differ')
            return other.value, other.gradient, other.uncertain
        if type(other) not in (int, float) or not math.isfinite(other):
            raise ValueError('Finite scalar operand required')
        return other, (0.,)*len(self.gradient), frozenset()

    def __float__(self):
        raise DifferentiationFailure(Failure.UNSUPPORTED)

    def __int__(self):
        raise DifferentiationFailure(Failure.UNSUPPORTED)

    def __bool__(self):
        raise DifferentiationFailure(Failure.UNSUPPORTED)

    def __floor__(self):
        # Segment/seam selection is discrete; curve evaluation retains phase
        # sensitivity on the selected, C1-matched interpolation segment.
        value = math.floor(self.value)
        if self.uncertain or (self.value == value and any(self.gradient)):
            raise DifferentiationFailure(Failure.NONSMOOTH)
        return value

    def __eq__(self, other):
        return self.value == primal(other)

    def __hash__(self):
        return hash(self.value)

    def __lt__(self, other): return self.value < primal(other)
    def __le__(self, other): return self.value <= primal(other)
    def __gt__(self, other): return self.value > primal(other)
    def __ge__(self, other): return self.value >= primal(other)

    def __add__(self, other):
        v, g, u = self._parts(other)
        return result(self.value+v, tuple(a+b for a,b in zip(self.gradient,g)), self.uncertain|u)

    __radd__ = __add__

    def __neg__(self):
        return result(-self.value, tuple(-v for v in self.gradient), self.uncertain)

    def __sub__(self, other):
        if self is other:
            return 0.
        v, g, u = self._parts(other)
        return result(self.value-v, tuple(a-b for a,b in zip(self.gradient,g)), self.uncertain|u)

    def __rsub__(self, other):
        return -self+other

    def __mul__(self, other):
        v, g, u = self._parts(other)
        value = self.value*v
        if (not self.value and not any(self.gradient) and not self.uncertain) or (
                not v and not any(g) and not u):
            return value
        return result(value, tuple(a*v+self.value*b for a,b in zip(self.gradient,g)), self.uncertain|u)

    __rmul__ = __mul__

    def __truediv__(self, other):
        v, g, u = self._parts(other)
        value = self.value/v
        return result(value, tuple((a-value*b)/v for a,b in zip(self.gradient,g)), self.uncertain|u)

    def __rtruediv__(self, other):
        v, g, u = self._parts(other)
        value = v/self.value
        return result(value, tuple((a-value*b)/self.value for a,b in zip(g,self.gradient)), self.uncertain|u)

    def __pow__(self, other):
        v, g, u = self._parts(other)
        value = self.value**v
        if not any(g):
            if not v:
                return value
            factor = v*self.value**(v-1)
            return result(value, tuple(factor*a for a in self.gradient), self.uncertain|u)
        if self.value <= 0:
            raise DifferentiationFailure(Failure.NONSMOOTH)
        return result(value, tuple(value*(b*math.log(self.value)+v*a/self.value)
                                   for a,b in zip(self.gradient,g)), self.uncertain|u)

    def __rpow__(self, other):
        if type(other) not in (int, float) or other <= 0:
            raise DifferentiationFailure(Failure.NONSMOOTH)
        value = other**self.value
        return result(value, tuple(value*math.log(other)*g for g in self.gradient), self.uncertain)

    def __abs__(self):
        if self.value > 0:return self
        if self.value < 0:return -self
        return result(0., (0.,)*len(self.gradient), self.uncertain|nonzero(self.gradient))

    def __mod__(self, other):
        v, g, u = self._parts(other)
        value = self.value % v
        quotient = math.floor(self.value/v)
        gradient = tuple(a-quotient*b for a,b in zip(self.gradient,g))
        uncertain = self.uncertain|u
        if value == 0:uncertain |= nonzero(gradient)
        return result(value, gradient, uncertain)


def nonzero(gradient):
    return frozenset(i for i,v in enumerate(gradient) if v != 0)


def result(value, gradient, uncertain=frozenset()):
    if type(value) not in (int, float) or not math.isfinite(value) or any(not math.isfinite(v) for v in gradient):
        raise DifferentiationFailure(Failure.NONFINITE)
    if not uncertain and not any(gradient):
        return value
    return Dual(value, gradient, uncertain)


def _unary(value, function, derivative):
    if type(value) is not Dual:return function(value)
    p = function(value.value)
    return result(p, tuple(derivative(value.value,p)*v for v in value.gradient), value.uncertain)


def exp(x):return _unary(x, math.exp, lambda x,y:y)
def sin(x):return _unary(x, math.sin, lambda x,y:math.cos(x))
def cos(x):return _unary(x, math.cos, lambda x,y:-math.sin(x))
def atan(x):return _unary(x, math.atan, lambda x,y:1/(1+x*x))
def radians(x):return _unary(x, math.radians, lambda x,y:math.pi/180)
def degrees(x):return _unary(x, math.degrees, lambda x,y:180/math.pi)


def sqrt(x):
    if type(x) is not Dual:return math.sqrt(x)
    p = math.sqrt(x.value)
    if p == 0:
        return result(p, (0.,)*len(x.gradient), x.uncertain|nonzero(x.gradient))
    return result(p, tuple(g/(2*p) for g in x.gradient), x.uncertain)


def atan2(y, x):
    dual = y if type(y) is Dual else x
    if type(dual) is not Dual:return math.atan2(y,x)
    py, gy, uy = dual._parts(y)
    px, gx, ux = dual._parts(x)
    p = math.atan2(py,px)
    denominator = px*px+py*py
    if denominator == 0:
        return result(p, (0.,)*len(dual.gradient), uy|ux|nonzero(gy)|nonzero(gx))
    uncertain = uy|ux
    if py == 0 and px < 0:uncertain |= nonzero(gy)
    return result(p, tuple((px*a-py*b)/denominator for a,b in zip(gy,gx)), uncertain)


def _norm(values, p):
    dual = next((v for v in values if type(v) is Dual), None)
    if dual is None:return p
    parts = [dual._parts(v) for v in values]
    uncertain = frozenset().union(*(u for _,_,u in parts))
    if p == 0:
        return result(p, (0.,)*len(dual.gradient), uncertain|frozenset().union(*(nonzero(g) for _,g,_ in parts)))
    return result(p, tuple(math.fsum(v*g[i] for v,g,_ in parts)/p
                           for i in range(len(dual.gradient))), uncertain)


def hypot(*values):
    return _norm(values, math.hypot(*(primal(v) for v in values)))


def total(values):
    # Python's float sum uses compensated arithmetic; summing Dual objects by
    # repeated __add__ would change the primal before differentiation starts.
    values = tuple(values)
    p = builtins.sum(primal(v) for v in values)
    dual = next((v for v in values if type(v) is Dual), None)
    if dual is None:return p
    parts = [dual._parts(v) for v in values]
    return result(p, tuple(math.fsum(g[i] for _,g,_ in parts) for i in range(len(dual.gradient))),
                  frozenset().union(*(u for _,_,u in parts)))


def dist(a, b):
    a,b=tuple(a),tuple(b)
    p=math.dist(tuple(primal(v) for v in a),tuple(primal(v) for v in b))
    return _norm(tuple(x-y for x,y in zip(a,b)), p)


def _extreme(chooser, args, key):
    values = list(args[0]) if len(args) == 1 else list(args)
    selected = chooser(values, key=key)
    keys = [key(v) if key else v for v in values]
    chosen = key(selected) if key else selected
    tied = [v for v in keys if primal(v) == primal(chosen)]
    dual = next((v for v in tied if type(v) is Dual),None)
    if dual is None:return selected
    _, gradient, uncertain = dual._parts(chosen)
    for v in tied:
        _, g, u = dual._parts(v)
        uncertain |= u|frozenset(i for i,(a,b) in enumerate(zip(gradient,g)) if a != b)
    if key:
        if uncertain:raise DifferentiationFailure(Failure.NONSMOOTH)
        return selected
    return result(primal(chosen),gradient,uncertain)


def minimum(*args, key=None):return _extreme(builtins.min,args,key)
def maximum(*args, key=None):return _extreme(builtins.max,args,key)


def zero_branch(boundary):
    """Constant branch whose boundary is nonsmooth only in moving directions."""
    if type(boundary) is not Dual:return 0.
    uncertain = boundary.uncertain
    if boundary.value == 0:uncertain |= nonzero(boundary.gradient)
    return result(0., (0.,)*len(boundary.gradient), uncertain)
