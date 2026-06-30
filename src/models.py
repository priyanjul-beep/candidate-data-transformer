from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class Evidence:
    field: str
    value: Any
    confidence: float
    source: str
    method: str


def default_canonical_profile(candidate_id: str = "candidate-001") -> dict[str, Any]:
    return {
        "candidate_id": candidate_id,
        "full_name": None,
        "emails": [],
        "phones": [],
        "location": {"city": None, "region": None, "country": None},
        "links": {"linkedin": None, "github": None, "portfolio": None, "other": []},
        "headline": None,
        "years_experience": None,
        "skills": [],
        "experience": [],
        "education": [],
        "provenance": [],
        "overall_confidence": 0.0,
    }
