from __future__ import annotations

import re
from datetime import datetime

import phonenumbers

_SKILL_MAP = {
    "js": "javascript",
    "node": "node.js",
    "nodejs": "node.js",
    "py": "python",
    "postgres": "postgresql",
    "ml": "machine learning",
    "ai": "artificial intelligence",
    "nlp": "natural language processing",
}

_COUNTRY_MAP = {
    "united states": "US",
    "usa": "US",
    "us": "US",
    "india": "IN",
    "in": "IN",
    "united kingdom": "GB",
    "uk": "GB",
    "germany": "DE",
    "canada": "CA",
}


def normalize_email(value: str | None) -> str | None:
    if not value:
        return None
    value = value.strip().lower()
    if re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", value):
        return value
    return None


def normalize_phone(value: str | None, default_region: str = "US") -> str | None:
    if not value:
        return None
    try:
        parsed = phonenumbers.parse(value, default_region)
        if not phonenumbers.is_valid_number(parsed):
            return None
        return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    except phonenumbers.NumberParseException:
        return None


def normalize_country(value: str | None) -> str | None:
    if not value:
        return None
    key = value.strip().lower()
    if key in _COUNTRY_MAP:
        return _COUNTRY_MAP[key]
    if len(value.strip()) == 2:
        return value.strip().upper()
    return None


def normalize_skill(value: str | None) -> str | None:
    if not value:
        return None
    key = re.sub(r"\s+", " ", value.strip().lower())
    return _SKILL_MAP.get(key, key)


def normalize_date_yyyy_mm(value: str | None) -> str | None:
    if not value:
        return None
    text = value.strip()
    formats = [
        "%Y-%m",
        "%Y/%m",
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%b %Y",
        "%B %Y",
        "%m/%Y",
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(text, fmt)
            return dt.strftime("%Y-%m")
        except ValueError:
            continue
    m = re.search(r"(19|20)\d{2}", text)
    if m:
        return f"{m.group(0)}-01"
    return None


def safe_float(value: object) -> float | None:
    try:
        return float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
