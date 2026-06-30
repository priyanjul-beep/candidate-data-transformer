# Eightfold Assignment - Multi-Source Candidate Data Transformer

This project implements an end-to-end candidate profile transformer with:

- **Structured sources**: Recruiter CSV, ATS JSON
- **Unstructured source**: recruiter notes TXT
- Canonical merge with normalization + dedupe + conflict resolution
- Provenance and confidence tracking
- Runtime configurable output projection
- Validation for default and custom outputs
- Minimal **Streamlit UI** and **CLI**
- Tests for core + edge cases

## Project structure

- [src/pipeline.py](src/pipeline.py): orchestration
- [src/extractors.py](src/extractors.py): source adapters
- [src/normalizers.py](src/normalizers.py): format normalization
- [src/merger.py](src/merger.py): merge/confidence/provenance
- [src/projector.py](src/projector.py): runtime output projection
- [src/validator.py](src/validator.py): schema/type validation
- [run_pipeline.py](run_pipeline.py): CLI entrypoint
- [app.py](app.py): Streamlit UI
- [docs/technical_design_one_pager.md](docs/technical_design_one_pager.md): one-page design
- [docs/PriyaNJ_priya@example.com_Eightfold.pdf](docs/PriyaNJ_priya@example.com_Eightfold.pdf): generated design PDF

## Install

```bash
pip install -r requirements.txt
```

## Run (CLI)

Default schema output:

```bash
python run_pipeline.py \
  --recruiter-csv data/samples/recruiter_export.csv \
  --ats-json data/samples/ats_blob.json \
  --notes data/samples/recruiter_notes.txt \
  --out outputs/default_output.json
```

Custom config output:

```bash
python run_pipeline.py \
  --recruiter-csv data/samples/recruiter_export.csv \
  --ats-json data/samples/ats_blob.json \
  --notes data/samples/recruiter_notes.txt \
  --config data/samples/custom_config.json \
  --out outputs/custom_output.json
```

## Run (UI)

```bash
streamlit run app.py
```

Use bundled samples or upload your own files. You can edit custom config directly in UI.

## Generate one-page PDF

```bash
python docs/generate_design_pdf.py
```

## Run tests

```bash
pytest -q
```

## Notes / assumptions

- Unknown/malformed values become null or are dropped per rules.
- Missing source never crashes pipeline.
- The implementation is deterministic for same inputs.
- Scope intentionally excludes PDF OCR and live API integrations.
