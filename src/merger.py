from __future__ import annotations

from collections import defaultdict
from typing import Any

from .models import Evidence, default_canonical_profile
from .normalizers import (
    normalize_country,
    normalize_date_yyyy_mm,
    normalize_email,
    normalize_phone,
    normalize_skill,
    safe_float,
)


def _dedupe_keep_order(values: list[Any]) -> list[Any]:
    seen = set()
    out = []
    for value in values:
        key = str(value)
        if key in seen:
            continue
        seen.add(key)
        out.append(value)
    return out


def _winner(evidences: list[Evidence]) -> Evidence | None:
    valid = [e for e in evidences if e.value not in (None, "", [], {})]
    if not valid:
        return None
    valid.sort(key=lambda e: e.confidence, reverse=True)
    return valid[0]


def merge_evidence(evidences: list[Evidence], candidate_id: str = "candidate-001") -> dict[str, Any]:
    profile = default_canonical_profile(candidate_id)
    by_field: dict[str, list[Evidence]] = defaultdict(list)
    for item in evidences:
        by_field[item.field].append(item)

    provenance: list[dict[str, str]] = []
    confidence_parts: list[float] = []

    # Scalars.
    for field in ["full_name", "headline", "years_experience"]:
        winner = _winner(by_field.get(field, []))
        if not winner:
            continue
        value = winner.value
        if field == "years_experience":
            value = safe_float(value)
            if value is not None:
                value = round(value, 1)
        profile[field] = value
        confidence_parts.append(winner.confidence)
        provenance.append({"field": field, "source": winner.source, "method": winner.method})

    # Emails.
    emails = []
    email_sources = []
    for e in by_field.get("emails", []):
        normalized = normalize_email(str(e.value))
        if normalized:
            emails.append(normalized)
            email_sources.append((e.source, e.method, e.confidence))
    profile["emails"] = _dedupe_keep_order(emails)
    if profile["emails"]:
        best = sorted(email_sources, key=lambda x: x[2], reverse=True)[0]
        confidence_parts.append(best[2])
        provenance.append({"field": "emails", "source": best[0], "method": best[1]})

    # Phones.
    phones = []
    phone_sources = []
    for e in by_field.get("phones", []):
        normalized = normalize_phone(str(e.value))
        if normalized:
            phones.append(normalized)
            phone_sources.append((e.source, e.method, e.confidence))
    profile["phones"] = _dedupe_keep_order(phones)
    if profile["phones"]:
        best = sorted(phone_sources, key=lambda x: x[2], reverse=True)[0]
        confidence_parts.append(best[2])
        provenance.append({"field": "phones", "source": best[0], "method": best[1]})

    # Location.
    for leaf in ["city", "region", "country"]:
        field = f"location.{leaf}"
        winner = _winner(by_field.get(field, []))
        if not winner:
            continue
        val = str(winner.value).strip()
        if leaf == "country":
            val = normalize_country(val) or val
        profile["location"][leaf] = val
        confidence_parts.append(winner.confidence)
        provenance.append({"field": field, "source": winner.source, "method": winner.method})

    # Links.
    for leaf in ["linkedin", "github", "portfolio"]:
        field = f"links.{leaf}"
        winner = _winner(by_field.get(field, []))
        if winner:
            profile["links"][leaf] = winner.value
            confidence_parts.append(winner.confidence)
            provenance.append({"field": field, "source": winner.source, "method": winner.method})

    other_links = []
    for e in by_field.get("links.other", []):
        if e.value:
            other_links.append(str(e.value).strip())
            confidence_parts.append(e.confidence)
            provenance.append({"field": "links.other", "source": e.source, "method": e.method})
    profile["links"]["other"] = _dedupe_keep_order(other_links)

    # Skills - canonicalized and merged.
    skill_bucket: dict[str, dict[str, Any]] = {}
    skill_sources: set[str] = set()
    skill_methods: set[str] = set()
    for e in by_field.get("skills", []):
        name = normalize_skill(str(e.value))
        if not name:
            continue
        skill_sources.add(e.source)
        skill_methods.add(e.method)
        existing = skill_bucket.get(name)
        if not existing:
            skill_bucket[name] = {
                "name": name,
                "confidence": e.confidence,
                "sources": [e.source],
            }
        else:
            existing["confidence"] = max(existing["confidence"], e.confidence)
            if e.source not in existing["sources"]:
                existing["sources"].append(e.source)
    profile["skills"] = sorted(skill_bucket.values(), key=lambda x: (-x["confidence"], x["name"]))
    if profile["skills"]:
        confidence_parts.append(sum(x["confidence"] for x in profile["skills"]) / len(profile["skills"]))
        skill_source = next(iter(skill_sources)) if len(skill_sources) == 1 else "multi"
        skill_method = next(iter(skill_methods)) if len(skill_methods) == 1 else "canonical_merge"
        provenance.append({"field": "skills", "source": skill_source, "method": skill_method})

    # Experience.
    exp_values = []
    for e in by_field.get("experience", []):
        if not isinstance(e.value, dict):
            continue
        item = {
            "company": e.value.get("company"),
            "title": e.value.get("title"),
            "start": normalize_date_yyyy_mm(e.value.get("start")),
            "end": normalize_date_yyyy_mm(e.value.get("end")),
            "summary": e.value.get("summary"),
        }
        exp_values.append(item)
        confidence_parts.append(e.confidence)
        provenance.append({"field": "experience", "source": e.source, "method": e.method})
    profile["experience"] = exp_values

    # Education.
    edu_values = []
    for e in by_field.get("education", []):
        if not isinstance(e.value, dict):
            continue
        item = {
            "institution": e.value.get("institution"),
            "degree": e.value.get("degree"),
            "field": e.value.get("field"),
            "start_year": e.value.get("start_year"),
            "end_year": e.value.get("end_year"),
        }
        edu_values.append(item)
        confidence_parts.append(e.confidence)
        provenance.append({"field": "education", "source": e.source, "method": e.method})
    profile["education"] = edu_values

    profile["provenance"] = provenance
    profile["overall_confidence"] = round(
        (sum(confidence_parts) / len(confidence_parts)) if confidence_parts else 0.0, 4
    )
    return profile
