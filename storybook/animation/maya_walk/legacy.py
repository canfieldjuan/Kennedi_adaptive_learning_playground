"""Lossless historical action fixture. This is not the sparse authoring model."""
from dataclasses import dataclass
from enum import Enum
import hashlib
import json

from .spec import finite


class Interpolation(str, Enum):
    BEZIER = "BEZIER"
    LINEAR = "LINEAR"


class Handle(str, Enum):
    FREE = "FREE"
    AUTO_CLAMPED = "AUTO_CLAMPED"


from .spec import UPPER_BONES, CHANNELS


@dataclass(frozen=True)
class SerializedCurve:
    """Internal Blender serialization record, obtained from a validated model."""
    owner: str
    path: str
    index: int
    interpolation: Interpolation
    handle: Handle
    # Each row preserves frame/value and both Bezier handles without refitting.
    keys: tuple[tuple[float, ...], ...]

    def __post_init__(self):
        if (self.owner, self.path, self.index) not in CHANNELS or type(self.index) is not int:
            raise ValueError("Unknown animated channel")
        if not isinstance(self.interpolation, Interpolation) or not isinstance(self.handle, Handle):
            raise ValueError("Closed key policy required")
        if type(self.keys) is not tuple or not self.keys or any(type(k) is not tuple or len(k) != 6 or not all(finite(v) for v in k) for k in self.keys):
            raise ValueError("Nonempty finite key coordinates required")
        if any(b[0] <= a[0] for a, b in zip(self.keys, self.keys[1:])):
            raise ValueError("Strictly ordered key times required")


@dataclass(frozen=True)
class LegacyFixture:
    curves: tuple[SerializedCurve, ...]
    source_sha256: str

    def __post_init__(self):
        if type(self.curves) is not tuple or not all(isinstance(c, SerializedCurve) for c in self.curves):
            raise ValueError("Typed historical curves required")
        actual = [(c.owner, c.path, c.index) for c in self.curves]
        if len(actual) != len(CHANNELS) or set(actual) != CHANNELS:
            raise ValueError("Every historical animated channel required exactly once")
        if self.source_sha256 != "b244c634349a59110de602b740253cf30d56dc09466d0817a7eee2fb61b7fbf9":
            raise ValueError("Historical fixture must originate at pinned C")

    @classmethod
    def load(cls, path, expected_sha256):
        raw = path.read_bytes()
        if hashlib.sha256(raw).hexdigest() != expected_sha256:
            raise ValueError("Historical source fixture hash mismatch")
        data = json.loads(raw)
        if set(data) != {"format", "source_sha256", "channels", "curves"} or data["format"] != "maya-legacy-actions-v1":
            raise ValueError("Closed historical fixture format required")
        curves = []
        for item in data["channels"]:
            if type(item) is not list or len(item) != 4 or type(item[3]) is not int or not 0 <= item[3] < len(data["curves"]):
                raise ValueError("Invalid historical curve reference")
            owner, prop, index, ref = item
            profile = data["curves"][ref]
            if set(profile) != {"interpolation", "handle", "keys"}:
                raise ValueError("Unknown or missing historical curve fields")
            curves.append(SerializedCurve(owner, prop, index, Interpolation(profile["interpolation"]),
                                          Handle(profile["handle"]), tuple(tuple(k) for k in profile["keys"])))
        return cls(tuple(curves), data["source_sha256"])
