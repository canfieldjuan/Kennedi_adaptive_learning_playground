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
    "joint_acceleration": ("Kerr B, Pascoe J, Thomason P, Rutz E, Passmore E (2025). Gait dataset - Typically "
                           "developing children processed with CGM2. Murdoch Children's Research Institute. "
                           "doi:10.25374/MCRI.28216448.v2, CC BY 4.0; file SHA256 "
                           "f9905a48c32fa4c84f61c8a12269170a5d762b35ce25d20378d9e15c3d5e8149"),
}

# Velocity-continuity value (validate.interval_motion, degrees/frame per quarter
# frame) of 64 typically developing children's legs (PiG_KAD sagittal angles,
# SOURCES["joint_acceleration"]) placed on the 24-frame, 24 fps target cycle
# through a periodic 10-harmonic reconstruction: the largest value per joint.
# Cited maxima only; the per-leg table stays in private evidence.
CHILD_JOINT_ACCELERATION_MAXIMA = {
    "hip": 1.464747588210571,
    "knee": 3.5305865452809826,
    "ankle": 4.343150958120987,
    "foot_pitch": 5.053233555034353,
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
