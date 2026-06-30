from __future__ import annotations

from typing import Any

from .extractors import extract_from_ats_json, extract_from_notes_txt, extract_from_recruiter_csv
from .merger import merge_evidence
from .projector import default_projection_config, project
from .validator import validate_custom_projection, validate_default_profile


def run_pipeline(
    recruiter_csv_path: str | None = None,
    ats_json_path: str | None = None,
    notes_txt_path: str | None = None,
    config: dict[str, Any] | None = None,
    candidate_id: str = "candidate-001",
) -> dict[str, Any]:
    evidence = []
    evidence.extend(extract_from_recruiter_csv(recruiter_csv_path))
    evidence.extend(extract_from_ats_json(ats_json_path))
    evidence.extend(extract_from_notes_txt(notes_txt_path))

    canonical = merge_evidence(evidence, candidate_id=candidate_id)
    projection_config = config if config is not None else default_projection_config()
    projected = project(canonical, projection_config)

    validation_errors: list[str]
    if config is None:
        validation_errors = validate_default_profile(projected)
    else:
        validation_errors = validate_custom_projection(projected, projection_config)

    return {
        "canonical": canonical,
        "projected": projected,
        "validation_errors": validation_errors,
    }
