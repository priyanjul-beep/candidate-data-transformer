from __future__ import annotations

from typing import Any

from jsonschema import Draft202012Validator

DEFAULT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": [
        "candidate_id",
        "full_name",
        "emails",
        "phones",
        "location",
        "links",
        "headline",
        "years_experience",
        "skills",
        "experience",
        "education",
        "provenance",
        "overall_confidence",
    ],
    "properties": {
        "candidate_id": {"type": "string"},
        "full_name": {"type": ["string", "null"]},
        "emails": {"type": "array", "items": {"type": "string"}},
        "phones": {"type": "array", "items": {"type": "string"}},
        "location": {
            "type": "object",
            "required": ["city", "region", "country"],
            "properties": {
                "city": {"type": ["string", "null"]},
                "region": {"type": ["string", "null"]},
                "country": {"type": ["string", "null"]},
            },
        },
        "links": {
            "type": "object",
            "required": ["linkedin", "github", "portfolio", "other"],
            "properties": {
                "linkedin": {"type": ["string", "null"]},
                "github": {"type": ["string", "null"]},
                "portfolio": {"type": ["string", "null"]},
                "other": {"type": "array", "items": {"type": "string"}},
            },
        },
        "headline": {"type": ["string", "null"]},
        "years_experience": {"type": ["number", "null"]},
        "skills": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["name", "confidence", "sources"],
                "properties": {
                    "name": {"type": "string"},
                    "confidence": {"type": "number"},
                    "sources": {"type": "array", "items": {"type": "string"}},
                },
            },
        },
        "experience": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["company", "title", "start", "end", "summary"],
                "properties": {
                    "company": {"type": ["string", "null"]},
                    "title": {"type": ["string", "null"]},
                    "start": {"type": ["string", "null"]},
                    "end": {"type": ["string", "null"]},
                    "summary": {"type": ["string", "null"]},
                },
            },
        },
        "education": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["institution", "degree", "field", "start_year", "end_year"],
                "properties": {
                    "institution": {"type": ["string", "null"]},
                    "degree": {"type": ["string", "null"]},
                    "field": {"type": ["string", "null"]},
                    "start_year": {"type": ["integer", "null"]},
                    "end_year": {"type": ["integer", "null"]},
                },
            },
        },
        "provenance": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["field", "source", "method"],
                "properties": {
                    "field": {"type": "string"},
                    "source": {"type": "string"},
                    "method": {"type": "string"},
                },
            },
        },
        "overall_confidence": {"type": "number"},
    },
}


def validate_default_profile(record: dict[str, Any]) -> list[str]:
    validator = Draft202012Validator(DEFAULT_SCHEMA)
    errors = sorted(validator.iter_errors(record), key=lambda e: e.path)
    return [f"{'.'.join(map(str, e.path))}: {e.message}" for e in errors]


def validate_custom_projection(projected: dict[str, Any], config: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    type_map = {
        "string": str,
        "number": (int, float),
        "object": dict,
        "string[]": list,
        "object[]": list,
    }

    def get_path(obj: dict[str, Any], path: str) -> Any:
        cur: Any = obj
        for part in path.split("."):
            if not isinstance(cur, dict) or part not in cur:
                return None
            cur = cur[part]
        return cur

    for field in config.get("fields", []):
        path = field["path"]
        expected = field.get("type")
        value = get_path(projected, path)
        if value is None:
            if field.get("required"):
                errors.append(f"Missing required field: {path}")
            continue
        if expected in type_map and not isinstance(value, type_map[expected]):
            errors.append(f"Field {path} expected {expected}, got {type(value).__name__}")
    return errors
