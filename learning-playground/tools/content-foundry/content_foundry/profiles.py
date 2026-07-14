from __future__ import annotations

from dataclasses import asdict, dataclass
from types import MappingProxyType
from typing import Any

from .errors import ValidationError


@dataclass(frozen=True)
class FoundryProfile:
    profile_id: str
    min_duration_seconds: float
    max_duration_seconds: float
    max_scene_count: int
    max_narration_cues_per_mode: int
    render_timeout_seconds: int
    max_output_bytes: int
    contact_sheet_samples: int
    contact_sheet_columns: int

    def as_record(self) -> dict[str, Any]:
        return asdict(self)


SHORT_CLIP = FoundryProfile(
    profile_id="short_clip",
    min_duration_seconds=0.5,
    max_duration_seconds=30.0,
    max_scene_count=6,
    max_narration_cues_per_mode=12,
    render_timeout_seconds=300,
    max_output_bytes=64 * 1024 * 1024,
    contact_sheet_samples=8,
    contact_sheet_columns=4,
)

BILINGUAL_STORY_PROOF = FoundryProfile(
    profile_id="bilingual_story_proof",
    min_duration_seconds=45.0,
    max_duration_seconds=90.0,
    max_scene_count=12,
    max_narration_cues_per_mode=24,
    render_timeout_seconds=900,
    max_output_bytes=128 * 1024 * 1024,
    contact_sheet_samples=12,
    contact_sheet_columns=4,
)

PROFILES = MappingProxyType({
    SHORT_CLIP.profile_id: SHORT_CLIP,
    BILINGUAL_STORY_PROOF.profile_id: BILINGUAL_STORY_PROOF,
})


def get_profile(profile_id: str) -> FoundryProfile:
    if not isinstance(profile_id, str) or profile_id not in PROFILES:
        raise ValidationError(f"unsupported Content Foundry profile: {profile_id}")
    return PROFILES[profile_id]


def require_canonical_profile(profile: FoundryProfile) -> FoundryProfile:
    if not isinstance(profile, FoundryProfile):
        raise ValidationError("Content Foundry profile must be a canonical named profile")
    canonical = PROFILES.get(profile.profile_id)
    if canonical is None or canonical != profile:
        raise ValidationError("Content Foundry profile limits do not match the canonical profile")
    return canonical
