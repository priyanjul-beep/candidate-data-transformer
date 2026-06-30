from src.pipeline import run_pipeline


def test_missing_source_does_not_crash() -> None:
    result = run_pipeline(recruiter_csv_path="data/samples/recruiter_export.csv")
    assert isinstance(result["projected"], dict)


def test_invalid_json_source_degrades_gracefully(tmp_path) -> None:
    bad_json = tmp_path / "bad.json"
    bad_json.write_text("{not-valid", encoding="utf-8")

    result = run_pipeline(
        recruiter_csv_path="data/samples/recruiter_export.csv",
        ats_json_path=str(bad_json),
        notes_txt_path="data/samples/recruiter_notes.txt",
    )
    assert isinstance(result["projected"], dict)
