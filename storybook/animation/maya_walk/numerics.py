"""Offline bounded least squares; no gait rules or motion corrections.

Active-set/QR method: Stark & Parker, Bounded-Variable Least-Squares (1995),
https://www.stat.berkeley.edu/~stark/Preprints/bvls.pdf . This is an independent
stdlib implementation. Scaling transforms both variables and bounds exactly.
"""
from dataclasses import dataclass
from enum import Enum
import math
from .differential import Dual, Failure, DifferentiationFailure

from .spec import finite


TRUST_LIMIT = .5
# Relative slack, times the trust limit, within which a converged step may sit
# outside its bounds from rounding. Chart projections absorb exactly this much.
BOUND_TOLERANCE = 1e-12


class SolveStatus(str, Enum):
    CONVERGED = 'converged'
    ITERATION_LIMIT = 'iteration_limit'
    RANK_DEFICIENT = 'rank_deficient'
    NUMERICAL_FAILURE = 'numerical_failure'


class UnconvergedStep(RuntimeError):
    pass


@dataclass(frozen=True)
class StepResult:
    step: tuple
    status: SolveStatus
    iterations: int
    optimality: float
    tolerance: float
    predicted_reduction: float
    scales: tuple

    def __post_init__(self):
        if not isinstance(self.status, SolveStatus):
            raise ValueError('Closed numerical solve status required')
        if self.status is SolveStatus.CONVERGED and (
                not finite(self.optimality) or not finite(self.tolerance)
                or self.optimality < 0 or not 0 < self.tolerance
                or self.optimality > self.tolerance
                or not self.step or any(not finite(v) for v in self.step)):
            raise ValueError('Converged step requires a finite passing certificate')

    def require_converged(self):
        if self.status is not SolveStatus.CONVERGED:
            raise UnconvergedStep(f'{self.status.value}: optimality={self.optimality}, tolerance={self.tolerance}')
        return self.step


def _dot(a, b):
    return math.fsum(x*y for x, y in zip(a, b))


def _qr(columns, rhs):
    """Householder QR, returning R and Q-transformed rhs; no normal equations."""
    n = len(columns)
    m = len(rhs)
    if m < n:
        raise ArithmeticError('Underdetermined unregularized system')
    work = [list(c) for c in columns]
    target = list(rhs)
    threshold = 32*math.ulp(1.)*max(m, n)*max((math.hypot(*c) for c in work), default=0.)
    for k in range(n):
        tail = work[k][k:]
        norm = math.hypot(*tail)
        if norm <= threshold:
            raise ArithmeticError('Numerically rank deficient')
        diagonal = -math.copysign(norm, tail[0])
        divisor = tail[0]-diagonal
        v = [1.] + [x/divisor for x in tail[1:]]
        tau = (diagonal-tail[0])/diagonal
        for c in work[k+1:] + [target]:
            factor = tau*_dot(v, c[k:])
            c[k:] = [x-factor*y for x, y in zip(c[k:], v)]
        work[k][k] = diagonal
        work[k][k+1:] = [0.]*(m-k-1)
    return [[work[j][i] if j >= i else 0. for j in range(n)] for i in range(n)], target[:n]


def _backsolve(matrix, rhs):
    x = [0.]*len(rhs)
    for i in reversed(range(len(rhs))):
        x[i] = (rhs[i]-_dot(matrix[i][i+1:], x[i+1:]))/matrix[i][i]
    return x


def _step_bounds(lower, upper, n, limit):
    """Per-coordinate step bounds; omitted means the symmetric trust box."""
    if lower is None and upper is None:
        return [-limit]*n, [limit]*n
    if lower is None or upper is None:
        raise ValueError('Lower and upper step bounds are given together')
    if type(lower) not in (list, tuple) or type(upper) not in (list, tuple) or len(lower) != n or len(upper) != n:
        raise ValueError('One lower and one upper step bound per coordinate required')
    if any(not finite(v) for v in (*lower, *upper)):
        raise ValueError('Finite step bounds required')
    if any(not -limit <= a <= 0. <= b <= limit for a, b in zip(lower, upper)):
        raise ValueError('Step bounds must keep a zero step and stay within the trust limit')
    return [float(v) for v in lower], [float(v) for v in upper]


def bounded_least_squares(columns, rhs, damping=0., limit=TRUST_LIMIT, *, lower=None, upper=None,
                          max_iterations=1000, tolerance=1e-10):
    """Minimize ||J step-rhs||² + damping*||D step||², lower <= step <= upper.

    Without explicit bounds the box is |step| <= limit. A caller with a domain
    passes per-coordinate bounds inside that box; a side may have zero width.
    D contains nonzero Jacobian column norms (one for zero columns). QR avoids
    squaring the condition number. Positive damping resolves duplicate directions
    in *normalized* coordinates; it does not invent information in a zero column.
    The finite active-set budget is never reported as convergence. The KKT check
    uses the original scaled columns, independently of the reduced QR solve.
    """
    if not finite(limit) or limit <= 0:
        raise ValueError('Positive finite step limit required')
    if not finite(damping) or damping < 0:
        raise ValueError('Nonnegative finite damping required')
    if type(max_iterations) is not int or not 1 <= max_iterations <= 10000:
        raise ValueError('Explicit bounded positive solve budget required')
    if not finite(tolerance) or not 0 < tolerance <= 1e-6:
        raise ValueError('Positive bounded numerical tolerance required')
    n = len(columns)
    if not n or not rhs or any(len(c) != len(rhs) for c in columns):
        raise ValueError('Complete nonempty least-squares system required')
    if any(not finite(v) for c in columns for v in c) or any(not finite(v) for v in rhs):
        raise ValueError('Finite least-squares system required')
    lower, upper = _step_bounds(lower, upper, n, limit)
    norms = [math.hypot(*c) for c in columns]
    scales = [s if s else 1. for s in norms]
    if any(not math.isfinite(s) or not math.isfinite(limit*s) or limit*s == 0 for s in scales):
        raise ValueError('Unrepresentable numerical scale or bound')
    normalized = [[v/s for v in c] for c, s in zip(columns, scales)]
    # Exact zero rows carry no directional information, even if rhs is nonzero.
    rows = [j for j in range(len(rhs)) if any(c[j] for c in normalized)]
    root = math.sqrt(damping)
    augmented = [[c[j] for j in rows] + [root if i == k else 0. for k in range(n)]
                 for i, c in enumerate(normalized)]
    target = [rhs[j] for j in rows] + [0.]*n
    floors = [a*s for a, s in zip(lower, scales)]
    ceilings = [b*s for b, s in zip(upper, scales)]
    slack = BOUND_TOLERANCE*limit
    threshold = tolerance*max(1., math.hypot(*rhs))
    y = [0.]*n
    active = [0]*n  # -1 lower, +1 upper, 0 free

    def certificate():
        residual = [_dot(row, y)-b for row, b in zip(zip(*normalized), rhs)]
        gradient = [_dot(c, residual)+damping*v for c, v in zip(normalized, y)]
        violation = [abs(g) if a == 0 else max(0., a*g) for a, g in zip(active, gradient)]
        return gradient, max(violation)

    def result(status, iterations):
        _, optimality = certificate()
        step = tuple(v/s for v, s in zip(y, scales))
        effect = [_dot(row, step) for row in zip(*columns)]
        reduction = 2*_dot(effect, rhs)-_dot(effect, effect)-damping*_dot(y, y)
        if any(not math.isfinite(v) for v in (*step, optimality, reduction)):
            status = SolveStatus.NUMERICAL_FAILURE
        if status is SolveStatus.CONVERGED and (optimality > threshold or any(
                v < a-slack or v > b+slack for v, a, b in zip(step, lower, upper))):
            status = SolveStatus.NUMERICAL_FAILURE
        return StepResult(step, status, iterations, optimality, threshold, reduction, tuple(scales))

    try:
        reduced, reduced_rhs = _qr(augmented, target)
    except ArithmeticError:
        return result(SolveStatus.RANK_DEFICIENT, 0)
    for iteration in range(1, max_iterations+1):
        free = [i for i, a in enumerate(active) if not a]
        if free:
            adjusted = [b-math.fsum(row[i]*y[i] for i, a in enumerate(active) if a)
                        for row, b in zip(reduced, reduced_rhs)]
            try:
                q, b = _qr([[row[i] for row in reduced] for i in free], adjusted)
                solution = _backsolve(q, b)
            except ArithmeticError:
                return result(SolveStatus.RANK_DEFICIENT, iteration)
            candidate = y[:]
            for i, v in zip(free, solution):
                candidate[i] = v
            hits = []
            for i in free:
                if candidate[i] > ceilings[i]:
                    hits.append(((ceilings[i]-y[i])/(candidate[i]-y[i]), i, 1))
                elif candidate[i] < floors[i]:
                    hits.append(((floors[i]-y[i])/(candidate[i]-y[i]), i, -1))
            if hits:
                alpha, index, sign = min(hits)
                for i in free:
                    y[i] += alpha*(candidate[i]-y[i])
                y[index] = ceilings[index] if sign > 0 else floors[index]
                active[index] = sign
                continue
            y = candidate
        gradient, optimality = certificate()
        if optimality <= threshold:
            return result(SolveStatus.CONVERGED, iteration)
        releases = [(active[i]*gradient[i], i) for i in range(n) if active[i]]
        if not releases or max(releases)[0] <= threshold:
            return result(SolveStatus.NUMERICAL_FAILURE, iteration)
        active[max(releases)[1]] = 0
    return result(SolveStatus.ITERATION_LIMIT, max_iterations)


def bounded_step(matrix, vector, limit=TRUST_LIMIT, **options):
    """SPD-quadratic adapter for regressions; production passes J directly.

    Factor the already-formed quadratic into the same bounded LS owner. Column
    scaling is handled there. This adapter must not hide nonconvergence either.
    """
    n = len(vector)
    if not n or len(matrix) != n or any(len(row) != n for row in matrix):
        raise ValueError('Complete search quadratic required')
    if any(not finite(v) for row in matrix for v in row) or any(not finite(v) for v in vector):
        raise ValueError('Finite search quadratic required')
    if any(matrix[i][j] != matrix[j][i] for i in range(n) for j in range(i)):
        raise ValueError('Symmetric search quadratic required')
    lower = [[0.]*n for _ in range(n)]
    for i in range(n):
        for j in range(i+1):
            v = matrix[i][j]-_dot(lower[i][:j], lower[j][:j])
            if i == j:
                if v <= 0:
                    raise ValueError('Positive definite search quadratic required')
                lower[i][j] = math.sqrt(v)
            else:
                lower[i][j] = v/lower[j][j]
    rhs = []
    for i in range(n):
        rhs.append((vector[i]-_dot(lower[i][:i], rhs))/lower[i][i])
    return bounded_least_squares(lower, rhs, limit=limit, **options)


class DerivativeStatus(str, Enum):
    ANALYTIC = 'analytic'
    CENTRAL = 'central'
    FORWARD = 'forward'
    BACKWARD = 'backward'
    FLAT = 'flat'
    UNRESOLVED = 'unresolved'


class UnreliableJacobian(RuntimeError):
    pass


@dataclass(frozen=True)
class Difference:
    status: DerivativeStatus
    step: float
    norm: float
    relative_error: float | None
    reason: 'Failure | None' = None

    def __post_init__(self):
        if not isinstance(self.status, DerivativeStatus) or not all(finite(v) and v >= 0 for v in (self.step,self.norm)):
            raise ValueError('Closed finite derivative receipt required')
        if self.relative_error is not None and (not finite(self.relative_error) or not 0 <= self.relative_error <= .05):
            raise ValueError('Admitted probe disagreement must be bounded')
        if self.reason is not None and type(self.reason) is not Failure:
            raise ValueError('Closed derivative refusal reason required')
        if self.status in (DerivativeStatus.ANALYTIC,DerivativeStatus.UNRESOLVED):
            if self.step != 0 or self.relative_error is not None:
                raise ValueError('Analytic/refused direction has no probe step')
            if self.status is DerivativeStatus.UNRESOLVED and self.norm != 0:
                raise ValueError('Unresolved direction has no admitted norm')
        elif self.step <= 0 or self.reason is not None:
            raise ValueError('Sampled direction requires a probe and no refusal')
        if self.status is DerivativeStatus.FLAT:
            if self.norm != 0 or self.relative_error is not None:
                raise ValueError('Sampled flat direction must have zero response')
        elif self.status not in (DerivativeStatus.ANALYTIC,DerivativeStatus.UNRESOLVED):
            if self.norm <= 0 or self.relative_error is None:
                raise ValueError('Sampled direction requires nonzero measured agreement')
        if self.status is DerivativeStatus.ANALYTIC and self.reason is not None:
            raise ValueError('Admitted analytic direction cannot carry a refusal')


@dataclass(frozen=True)
class JacobianResult:
    columns: tuple
    differences: tuple

    def __post_init__(self):
        if type(self.columns) is not tuple or type(self.differences) is not tuple or not self.columns or len(self.columns) != len(self.differences):
            raise ValueError('Complete immutable Jacobian inventory required')
        sizes=set()
        for column,difference in zip(self.columns,self.differences):
            if type(column) is not tuple or type(difference) is not Difference:
                raise ValueError('Typed immutable Jacobian direction required')
            if difference.status is DerivativeStatus.UNRESOLVED:
                if column:raise ValueError('Unresolved direction cannot carry an admitted column')
            else:
                if not column or any(not finite(v) for v in column) or math.hypot(*column) != difference.norm:
                    raise ValueError('Column must match its finite admitted norm')
                sizes.add(len(column))
        if len(sizes)>1:raise ValueError('Residual dimensions differ')

    def require_resolved(self):
        if any(d.status is DerivativeStatus.UNRESOLVED for d in self.differences):
            raise UnreliableJacobian('Unresolved numerical directions; no trial step allowed')
        return self.columns


def analytic_jacobian(score, x, residuals):
    """Differentiate shared arithmetic, preserving tiny nonzero directions.

    Exact primal parity is required. Unsupported/nonsmooth evaluations refuse;
    no finite-difference fallback or manufactured flat direction is admitted.
    """
    if not x or not residuals or any(not finite(v) for v in (*x, *residuals)):
        raise ValueError('Complete finite linearization point required')
    size = len(x)
    def refused(reason):
        return JacobianResult(tuple(() for _ in x), tuple(
            Difference(DerivativeStatus.UNRESOLVED, 0., 0., None, reason) for _ in x))
    try:
        _, values = score([Dual.variable(v,i,size) for i,v in enumerate(x)])
        if values is None or len(values) != len(residuals):
            return refused(Failure.PRIMAL_MISMATCH)
        rows, uncertain = [], set()
        for value, expected in zip(values,residuals):
            if type(value) is Dual:
                if len(value.gradient) != size:
                    raise ValueError('Residual derivative dimensions differ')
                actual = value.value
                rows.append(value.gradient)
                uncertain.update(value.uncertain)
            elif finite(value):
                actual = value
                rows.append((0.,)*size)
            else:
                return refused(Failure.NONFINITE)
            if actual != expected:
                return refused(Failure.PRIMAL_MISMATCH)
        columns = tuple(tuple(row[i] for row in rows) for i in range(size))
        norms = tuple(math.hypot(*c) for c in columns)
        if any(not finite(norm) for norm in norms):
            return refused(Failure.NONFINITE)
        return JacobianResult(tuple(() if i in uncertain else c for i,c in enumerate(columns)), tuple(
            Difference(DerivativeStatus.UNRESOLVED, 0., 0., None, Failure.NONSMOOTH) if i in uncertain
            else Difference(DerivativeStatus.ANALYTIC, 0., norm, None)
            for i,norm in enumerate(norms)))
    except DifferentiationFailure as error:
        return refused(error.reason)
    except OverflowError:
        return refused(Failure.NONFINITE)


def _probe_sizes(limit):
    if not finite(limit) or limit <= 0:
        raise ValueError('Positive finite probe limit required')
    step = min(1e-4, limit)
    yield step
    yield step/10
    while step < limit:
        step = min(2*step, limit)
        yield step


def finite_difference(score, x, residuals, limit=TRUST_LIMIT):
    """Compare two probe sizes before scaling a direction, respecting the domain.

    Central differences are preferred; a domain boundary uses the same one-sided
    orientation at both sizes. Weak directions try larger probes to overcome
    cancellation, up to the same numerical trust bound used by the solve.

    An exactly zero response is absence of signal, not agreement: it never
    admits a direction at the size where it was seen. A zero column is returned
    only as FLAT, after every size of the ladder was evaluated and none showed
    a response. A response that appears but never agrees is UNRESOLVED.
    Probe sizes and agreement tolerances are numerical, never gait thresholds.
    """
    if not x or not residuals or any(not finite(v) for v in (*x, *residuals)):
        raise ValueError('Complete finite linearization point required')
    columns, differences = [], []
    for i in range(len(x)):
        chosen = None
        flat = True
        for h in _probe_sizes(limit):
            probes = []
            for delta in (h, -h, h/2, -h/2):
                trial = list(x)
                trial[i] += delta
                _, values = score(trial)
                if values is not None and (len(values) != len(residuals) or any(not finite(v) for v in values)):
                    raise ValueError('Residual dimension and finiteness must be invariant')
                probes.append(values)
            plus, minus, half_plus, half_minus = probes
            if all(v is not None for v in probes):
                coarse = [(a-b)/(2*h) for a, b in zip(plus, minus)]
                fine = [(a-b)/h for a, b in zip(half_plus, half_minus)]
                status = DerivativeStatus.CENTRAL
            elif plus is not None and half_plus is not None:
                coarse = [(a-b)/h for a, b in zip(plus, residuals)]
                fine = [(a-b)/(h/2) for a, b in zip(half_plus, residuals)]
                status = DerivativeStatus.FORWARD
            elif minus is not None and half_minus is not None:
                coarse = [(b-a)/h for a, b in zip(minus, residuals)]
                fine = [(b-a)/(h/2) for a, b in zip(half_minus, residuals)]
                status = DerivativeStatus.BACKWARD
            else:
                flat = False
                continue
            if not any(coarse) and not any(fine):
                continue
            flat = False
            norm = math.hypot(*fine)
            error = math.hypot(*(a-b for a, b in zip(coarse, fine)))
            relative = error/norm if norm else math.inf
            if relative <= .05:
                chosen = (tuple(fine), Difference(status, h/2, norm, relative))
                break
        if chosen is None and flat:
            chosen = ((0.,)*len(residuals), Difference(DerivativeStatus.FLAT, h, 0., None))
        elif chosen is None:
            chosen = ((), Difference(DerivativeStatus.UNRESOLVED, 0., 0., None))
        column, difference = chosen
        columns.append(column)
        differences.append(difference)
    return JacobianResult(tuple(columns), tuple(differences))
