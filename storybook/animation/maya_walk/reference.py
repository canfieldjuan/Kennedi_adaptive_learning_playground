"""Cited facts and explicitly chosen animation bands; no copied dataset.

These bands are design tolerances, not population confidence intervals.
See the accepted change contract for reference disagreements and attribution.
"""
from dataclasses import dataclass
from enum import Enum
import math


class Kind(str, Enum):
    MAXIMUM = "maximum"
    MINIMUM = "minimum"


@dataclass(frozen=True)
class Extremum:
    kind: Kind
    start: float
    end: float
    low: float | None
    high: float | None

    def __post_init__(self):
        if not isinstance(self.kind, Kind):
            raise ValueError("Closed extremum kind required")
        if not all(math.isfinite(x) and 0 <= x <= 1 for x in (self.start, self.end)):
            raise ValueError("Extremum window must be a cycle fraction")
        if (self.low is None) != (self.high is None):
            raise ValueError("Both amplitude bounds required, or neither")
        if self.low is not None and not (math.isfinite(self.low) and
                                       math.isfinite(self.high) and self.low <= self.high):
            raise ValueError("Finite ordered amplitude band required")

    def contains(self, phase):
        phase %= 1
        if self.start > self.end:
            return phase >= self.start or phase <= self.end
        return self.start <= phase <= self.end


SOURCES = {
    "events": "https://ouhsc.edu/bserdac/dthompso/web/gait/knmatics/stance.htm",
    "knee": "https://ouhsc.edu/bserdac/dthompso/web/pk/kneegraf.htm",
    "ankle": "https://ouhsc.edu/bserdac/dthompso/web/gait/knmatics/ankgait.htm",
    "joint_amplitudes": "https://www.oandplibrary.org/alp/chap13-01.asp",
    "pelvis_proxy": "https://ouhsc.edu/bserdac/dthompso/web/gait/knmatics/gait.htm",
    "global": "https://ouhsc.edu/bserdac/dthompso/web/gait/knmatics/stride.htm",
    "toe": "https://pubmed.ncbi.nlm.nih.gov/21354576/",
}

# Circular order starts with the extremum nearest the initial-contact seam.
SIGNATURES = {
    "knee": (
        Extremum(Kind.MINIMUM, .95, .05, 0, 5),
        Extremum(Kind.MAXIMUM, .10, .18, 15, 22),
        Extremum(Kind.MINIMUM, .35, .45, 0, 5),
        Extremum(Kind.MAXIMUM, .68, .76, 60, 65),
    ),
    "ankle": (
        Extremum(Kind.MINIMUM, .05, .12, -15, -5),
        Extremum(Kind.MAXIMUM, .35, .50, 5, 15),
        Extremum(Kind.MINIMUM, .58, .66, -25, -15),
        Extremum(Kind.MAXIMUM, .80, 1., -3, 5),
    ),
    "hip": (
        Extremum(Kind.MINIMUM, .48, .58, -15, -5),
        Extremum(Kind.MAXIMUM, .82, .95, 25, 35),
    ),
    "pelvis_height": (
        Extremum(Kind.MINIMUM, 0., .10, None, None),
        Extremum(Kind.MAXIMUM, .25, .35, None, None),
        Extremum(Kind.MINIMUM, .50, .60, None, None),
        Extremum(Kind.MAXIMUM, .75, .85, None, None),
    ),
}
