from __future__ import annotations

import csv
import json
import re
from pathlib import Path

from .models import Evidence

KNOWN_SKILLS = [
    "python",
    "java",
    "javascript",
    "sql",
    "aws",
    "docker",
    "kubernetes",
    "machine learning",
    "nlp",
    "react",
    "node",
    "postgres",
]


def extract_from_recruiter_csv(path: str | None) -> list[Evidence]:
    if not path:
        return []
    p = Path(path)
    if not p.exists():
        return []

    out: list[Evidence] = []
    with p.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row.get("name")
            email = row.get("email")
            phone = row.get("phone")
            company = row.get("current_company")
            title = row.get("title")
            location = row.get("location")
            skills = row.get("skills")

            if name:
                out.append(Evidence("full_name", name, 0.93, "recruiter_csv", "column:name"))
            if email:
                out.append(Evidence("emails", email, 0.97, "recruiter_csv", "column:email"))
            if phone:
                out.append(Evidence("phones", phone, 0.9, "recruiter_csv", "column:phone"))
            if title:
                out.append(Evidence("headline", title, 0.7, "recruiter_csv", "column:title"))
            if company or title:
                out.append(
                    Evidence(
                        "experience",
                        {
                            "company": company,
                            "title": title,
                            "start": None,
                            "end": None,
                            "summary": "Current role from recruiter export",
                        },
                        0.75,
                        "recruiter_csv",
                        "row_to_experience",
                    )
                )
            if location:
                parts = [x.strip() for x in location.split(",")]
                city = parts[0] if len(parts) > 0 else None
                region = parts[1] if len(parts) > 1 else None
                country = parts[2] if len(parts) > 2 else None
                if city:
                    out.append(Evidence("location.city", city, 0.8, "recruiter_csv", "parse_location"))
                if region:
                    out.append(Evidence("location.region", region, 0.8, "recruiter_csv", "parse_location"))
                if country:
                    out.append(Evidence("location.country", country, 0.8, "recruiter_csv", "parse_location"))
            if skills:
                for s in [k.strip() for k in skills.split(",") if k.strip()]:
                    out.append(Evidence("skills", s, 0.8, "recruiter_csv", "column:skills"))
    return out


def extract_from_ats_json(path: str | None) -> list[Evidence]:
    if not path:
        return []
    p = Path(path)
    if not p.exists():
        return []

    try:
        payload = json.loads(p.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []

    out: list[Evidence] = []
    if name := payload.get("fullName"):
        out.append(Evidence("full_name", name, 0.88, "ats_json", "field:fullName"))
    if email := payload.get("primaryEmail"):
        out.append(Evidence("emails", email, 0.92, "ats_json", "field:primaryEmail"))
    if phone := payload.get("phoneNumber"):
        out.append(Evidence("phones", phone, 0.87, "ats_json", "field:phoneNumber"))
    if yrs := payload.get("yearsExp"):
        out.append(Evidence("years_experience", yrs, 0.78, "ats_json", "field:yearsExp"))
    if links := payload.get("links", {}):
        if isinstance(links, dict):
            if gh := links.get("github"):
                out.append(Evidence("links.github", gh, 0.83, "ats_json", "field:links.github"))
            if li := links.get("linkedin"):
                out.append(Evidence("links.linkedin", li, 0.83, "ats_json", "field:links.linkedin"))

    for sk in payload.get("skills", []):
        out.append(Evidence("skills", sk, 0.85, "ats_json", "field:skills"))

    for item in payload.get("experience", []):
        if isinstance(item, dict):
            out.append(Evidence("experience", item, 0.8, "ats_json", "field:experience"))

    for item in payload.get("education", []):
        if isinstance(item, dict):
            out.append(Evidence("education", item, 0.82, "ats_json", "field:education"))
    return out


def extract_from_notes_txt(path: str | None) -> list[Evidence]:
    if not path:
        return []
    p = Path(path)
    if not p.exists():
        return []

    text = p.read_text(encoding="utf-8", errors="ignore")
    out: list[Evidence] = []

    name_match = re.search(r"name\s*:\s*(.+)", text, flags=re.IGNORECASE)
    if name_match:
        out.append(Evidence("full_name", name_match.group(1).strip(), 0.72, "notes_txt", "regex:name"))

    for email in re.findall(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text):
        out.append(Evidence("emails", email, 0.7, "notes_txt", "regex:email"))

    for phone in re.findall(r"(?:\+?\d[\d\s().-]{8,}\d)", text):
        out.append(Evidence("phones", phone, 0.65, "notes_txt", "regex:phone"))

    years_match = re.search(r"(\d+)\+?\s+years", text, flags=re.IGNORECASE)
    if years_match:
        out.append(
            Evidence(
                "years_experience",
                int(years_match.group(1)),
                0.7,
                "notes_txt",
                "regex:years_experience",
            )
        )

    linkedin = re.search(r"https?://(?:www\.)?linkedin\.com/\S+", text, flags=re.IGNORECASE)
    if linkedin:
        out.append(Evidence("links.linkedin", linkedin.group(0), 0.74, "notes_txt", "regex:linkedin"))

    github = re.search(r"https?://(?:www\.)?github\.com/\S+", text, flags=re.IGNORECASE)
    if github:
        out.append(Evidence("links.github", github.group(0), 0.74, "notes_txt", "regex:github"))

    for skill in KNOWN_SKILLS:
        if re.search(rf"\b{re.escape(skill)}\b", text, flags=re.IGNORECASE):
            out.append(Evidence("skills", skill, 0.62, "notes_txt", "keyword_match"))

    return out
