# Eightfold Assignment - Multi-Source Candidate Data Transformer

This project implements an end-to-end candidate profile transformer with:

- **Structured sources**: Recruiter CSV, ATS JSON
- **Unstructured source**: recruiter notes TXT
- Canonical merge with normalization + dedupe + conflict resolution
- Dynamic provenance and confidence tracking (source-aware)
- Interactive output projection via modal UI
- Advanced field selection with search, select-all, clear-all
- Validation for default and custom projections
- Streamlit UI with dual input modes
- Python CLI and programmatic API
- Comprehensive test coverage

## Project structure

- [src/pipeline.py](src/pipeline.py): orchestration
- [src/extractors.py](src/extractors.py): source adapters (CSV, JSON, TXT)
- [src/normalizers.py](src/normalizers.py): format normalization
- [src/merger.py](src/merger.py): merge/confidence/provenance with dynamic source tracking
- [src/projector.py](src/projector.py): runtime output projection
- [src/validator.py](src/validator.py): schema/type validation
- [src/models.py](src/models.py): data models (Evidence, canonical profile)
- [app.py](app.py): Streamlit UI with interactive projection modal
- [run_pipeline.py](run_pipeline.py): CLI entrypoint
- [data/samples/](data/samples/): bundled sample files and custom config template

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

## Run (Streamlit UI)

```bash
streamlit run app.py
```

Open browser to `http://localhost:8501` (or next available port).

Live app: [https://candidate-data-transformer-sn4wmpxrabbdhbsrqbbbfg.streamlit.app](https://candidate-data-transformer-sn4wmpxrabbdhbsrqbbbfg.streamlit.app)

### UI Features

**Input Mode Selection:**
- **Bundled sample files** → pre-loads sample data, uploads disabled
- **Uploaded files** → manual upload of CSV, JSON, TXT sources

**Projection Customization:**
1. Click "Run Transformer" to generate canonical record
2. Navigate to "Projected Output" tab
3. Click "Customize Projected Output" modal opens
4. Modal shows all canonical record fields as checkboxes
5. Use search to filter fields dynamically (type-to-search)
6. Use "Select All" / "Clear All" for batch operations
7. Choose action:
   - **Generate Output**: auto-build config from selected fields → project
   - **Skip**: use JSON editor config → project
   - **Cancel**: close modal without projection
8. View projected JSON with full provenance tracking

**JSON Config (Optional):**
- Edit "Custom Projection Config" JSON to manually control field mappings
- If empty, default schema is used
- Used when clicking "Skip" in projection modal

## Custom Config JSON

`data/samples/custom_config.json` controls which fields appear in the projected output and how they are transformed. Structure:

```json
{
  "fields": [
    {
      "path": "output_field_name",
      "from": "canonical_path_or_index",
      "type": "string|number|object|string[]|object[]",
      "normalize": "E164|canonical",
      "required": true
    }
  ],
  "include_confidence": true,
  "include_provenance": true,
  "on_missing": "null|omit|error"
}
```

### Field Configuration

- **path** (required): Output field name in projected result
- **from** (optional): Source path in canonical record (defaults to path)
  - `emails[0]` → first email
  - `skills[].name` → extract name from all skills
  - `links.github` → nested field access
- **type** (optional): Describes field type for validation
- **normalize** (optional):
  - `E164`: normalize phone numbers to international format
  - `canonical`: normalize skill names
- **required** (optional): if true, raises error if field is missing

### Global Options

- **include_confidence**: Add overall_confidence to output
- **include_provenance**: Add provenance array to output
- **on_missing**: Behavior for missing fields
  - `null`: include field with null value
  - `omit`: exclude field from output
  - `error`: raise error if required field missing

### Example

Input canonical record has:
- `emails: ["priya@example.com", "priya.j@company.com"]`
- `skills: [{name: "python", confidence: 0.9}, {name: "aws", confidence: 0.85}]`
- `links: {github: "https://github.com/priyanjul", linkedin: null}`

With config:
```json
{
  "fields": [
    {"path": "primary_email", "from": "emails[0]"},
    {"path": "all_skills", "from": "skills[].name"},
    {"path": "github_url", "from": "links.github"}
  ]
}
```

Output:
```json
{
  "primary_email": "priya@example.com",
  "all_skills": ["python", "aws"],
  "github_url": "https://github.com/priyanjul"
}
```

## Run tests

```bash
pytest tests/ -v
```

## Notes / assumptions

- Unknown/malformed values become null or are dropped per rules.
- Missing source never crashes pipeline.
- Dynamic provenance: skills source reflects actual contributors (single source if only one file provides skills, "multi" if multiple sources)
- Projection is fully configurable; no field is hardcoded in output
- Canonical record always includes all raw evidence for maximum transparency
- The implementation is deterministic for same inputs.
- Scope intentionally excludes PDF OCR and live API integrations.
