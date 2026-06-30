# Eightfold Assignment - Multi-Source Candidate Data Transformer

This project implements an end-to-end candidate profile transformer with:

- **Structured sources**: Recruiter CSV, ATS JSON
- **Unstructured source**: recruiter notes TXT
- Canonical merge with normalization + dedupe + conflict resolution
- Provenance and confidence tracking
- Runtime configurable output projection
- Validation for default and custom outputs
- Minimal **Express UI** and **CLI**
- Tests for core + edge cases

## Project structure

- [src/pipeline.ts](src/pipeline.ts): orchestration
- [src/extractors.ts](src/extractors.ts): source adapters
- [src/normalizers.ts](src/normalizers.ts): format normalization
- [src/merger.ts](src/merger.ts): merge/confidence/provenance
- [src/projector.ts](src/projector.ts): runtime output projection
- [src/validator.ts](src/validator.ts): schema/type validation
- [src/run_pipeline.ts](src/run_pipeline.ts): CLI entrypoint
- [src/ui/server.ts](src/ui/server.ts): web UI server
- [src/ui/views/index.ejs](src/ui/views/index.ejs): UI page
- [docs/technical_design_one_pager.md](docs/technical_design_one_pager.md): one-page design
- [docs/PriyaNJ_priya@example.com_Eightfold.pdf](docs/PriyaNJ_priya@example.com_Eightfold.pdf): generated design PDF

## Install

```bash
npm install
```

## Run (CLI)

Build first:

```bash
npm run build
```

Default schema output:

```bash
npm run cli -- \
  --recruiter-csv data/samples/recruiter_export.csv \
  --ats-json data/samples/ats_blob.json \
  --notes data/samples/recruiter_notes.txt \
  --out outputs/default_output.json
```

Custom config output:

```bash
npm run cli -- \
  --recruiter-csv data/samples/recruiter_export.csv \
  --ats-json data/samples/ats_blob.json \
  --notes data/samples/recruiter_notes.txt \
  --config data/samples/custom_config.json \
  --out outputs/custom_output.json
```

## Run (UI)

```bash
npm run ui
```

Open the URL printed in terminal (3000 or next free port).

UI supports:
- bundled sample mode, or
- manual file uploads for `Recruiter CSV`, `ATS JSON`, and `Notes TXT`.

Each uploaded file is validated immediately after selection.

One-page design deliverable is available at [docs/PriyaNJ_priya@example.com_Eightfold.pdf](docs/PriyaNJ_priya@example.com_Eightfold.pdf).

## Run tests

```bash
npm test
```

## Notes / assumptions

- Unknown/malformed values become null or are dropped per rules.
- Missing source never crashes pipeline.
- The implementation is deterministic for same inputs.
- Scope intentionally excludes PDF OCR and live API integrations.
