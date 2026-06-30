from src.pipeline import run_pipeline


def test_default_pipeline_has_required_fields() -> None:
    result = run_pipeline(
        recruiter_csv_path="data/samples/recruiter_export.csv",
        ats_json_path="data/samples/ats_blob.json",
        notes_txt_path="data/samples/recruiter_notes.txt",
    )
    output = result["projected"]

    assert output["candidate_id"] == "candidate-001"
    assert output["emails"]
    assert output["phones"]
    assert isinstance(output["skills"], list)
    assert "overall_confidence" in output
    assert not result["validation_errors"]


def test_custom_projection_works() -> None:
    import json
    from pathlib import Path

    cfg = json.loads(Path("data/samples/custom_config.json").read_text(encoding="utf-8"))
    result = run_pipeline(
        recruiter_csv_path="data/samples/recruiter_export.csv",
        ats_json_path="data/samples/ats_blob.json",
        notes_txt_path="data/samples/recruiter_notes.txt",
        config=cfg,
    )
    output = result["projected"]

    assert "primary_email" in output
    assert "skills" in output
    assert isinstance(output["skills"], list)
