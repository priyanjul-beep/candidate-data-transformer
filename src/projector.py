from __future__ import annotations

from typing import Any

from .normalizers import normalize_phone, normalize_skill


def default_projection_config() -> dict[str, Any]:
    return {
        "fields": [
            {"path": "candidate_id", "type": "string", "required": True},
            {"path": "full_name", "type": "string"},
            {"path": "emails", "type": "string[]"},
            {"path": "phones", "type": "string[]", "normalize": "E164"},
            {"path": "location", "type": "object"},
            {"path": "links", "type": "object"},
            {"path": "headline", "type": "string"},
            {"path": "years_experience", "type": "number"},
            {"path": "skills", "type": "object[]"},
            {"path": "experience", "type": "object[]"},
            {"path": "education", "type": "object[]"},
        ],
        "include_confidence": True,
        "include_provenance": True,
        "on_missing": "null",
    }


def _extract_simple(obj: Any, parts: list[str]) -> Any:
    current = obj
    for part in parts:
        if current is None:
            return None
        if isinstance(current, dict):
            current = current.get(part)
        else:
            return None
    return current


def extract_path(obj: dict[str, Any], path: str) -> Any:
    if "[]" in path:
        left, _, right = path.partition("[]")
        left = left.rstrip(".")
        right = right.lstrip(".")
        arr = _extract_simple(obj, left.split("."))
        if not isinstance(arr, list):
            return None
        if not right:
            return arr
        result = []
        for item in arr:
            if isinstance(item, dict):
                value = _extract_simple(item, right.split("."))
                if value is not None:
                    result.append(value)
        return result

    if "[" in path and path.endswith("]"):
        base, _, idx_text = path.partition("[")
        idx = int(idx_text[:-1])
        arr = _extract_simple(obj, base.split("."))
        if isinstance(arr, list) and len(arr) > idx:
            return arr[idx]
        return None

    return _extract_simple(obj, path.split("."))


def set_path(obj: dict[str, Any], path: str, value: Any) -> None:
    parts = path.split(".")
    current = obj
    for part in parts[:-1]:
        if part not in current or not isinstance(current[part], dict):
            current[part] = {}
        current = current[part]
    current[parts[-1]] = value


def _apply_normalization(value: Any, mode: str | None) -> Any:
    if not mode:
        return value
    if mode == "E164":
        if isinstance(value, str):
            return normalize_phone(value)
        if isinstance(value, list):
            return [v for v in (normalize_phone(str(x)) for x in value) if v]
    if mode == "canonical":
        if isinstance(value, list):
            return [normalize_skill(str(x)) for x in value]
        if isinstance(value, str):
            return normalize_skill(value)
    return value


def project(canonical: dict[str, Any], config: dict[str, Any]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    on_missing = config.get("on_missing", "null")

    for field in config.get("fields", []):
        out_path = field["path"]
        src_path = field.get("from", out_path)
        value = extract_path(canonical, src_path)
        value = _apply_normalization(value, field.get("normalize"))

        if value is None:
            if on_missing == "omit":
                continue
            if on_missing == "error" and field.get("required"):
                raise ValueError(f"Required field missing: {out_path}")
            if on_missing == "null":
                set_path(result, out_path, None)
                continue

        set_path(result, out_path, value)

    if config.get("include_confidence", True):
        result["overall_confidence"] = canonical.get("overall_confidence")
    if config.get("include_provenance", True):
        result["provenance"] = canonical.get("provenance", [])
    return result
