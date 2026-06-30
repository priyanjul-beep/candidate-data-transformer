# Multi-Source Candidate Data Transformer — Technical Design (One Pager)

## 1) Pipeline overview

I use a deterministic 7-step pipeline:

1. **Ingest** input sources (CSV, ATS JSON, notes text). Any source may be missing or malformed.
2. **Extract** source-specific fields into a common intermediate evidence format:
   - `Evidence(field, value, confidence, source, method)`.
3. **Normalize** values:
   - email lowercasing + format check,
   - phone to E.164,
   - country to ISO-3166 alpha-2,
   - date to `YYYY-MM`,
   - skill synonym canonicalization.
4. **Merge / resolve conflicts** into one canonical profile.
5. **Compute confidence** per selected field and `overall_confidence`.
6. **Project to runtime output schema** using config (`fields`, `from`, `normalize`, include provenance/confidence, `on_missing`).
7. **Validate** projected output:
   - default schema validated via JSON Schema,
   - custom projection type-checked per config.

This guarantees traceability, robustness, and deterministic outputs for same inputs.

## 2) Canonical schema + normalization decisions

Canonical record fields follow assignment default:
`candidate_id`, `full_name`, `emails[]`, `phones[]`, `location{city,region,country}`,
`links{linkedin,github,portfolio,other[]}`, `headline`, `years_experience`,
`skills[{name,confidence,sources[]}]`,
`experience[{company,title,start,end,summary}]`,
`education[{institution,degree,field,start_year,end_year}]`,
`provenance[{field,source,method}]`, `overall_confidence`.

Formats chosen:
- Phones: E.164 via `phonenumbers`
- Dates: `YYYY-MM`
- Country: ISO alpha-2 map (fallback pass-through if unknown)
- Skills: canonical lower-case name with synonym mapping (e.g., `ml -> machine learning`, `nodejs -> node.js`)

## 3) Merge/conflict policy and confidence

- **Scalar fields** (`full_name`, `headline`, `years_experience`, link leaves, location leaves):
  choose highest-confidence non-empty evidence.
- **List fields** (`emails`, `phones`, `links.other`):
  normalize + dedupe (order preserved).
- **Skills**:
  canonical name as key, merge sources, keep max confidence per skill.
- **Experience/Education**:
  append normalized records from trusted structures (CSV/ATS); malformed entries ignored.

Confidence scoring:
- Each extractor gives source-aware base confidence (e.g., recruiter email > note regex).
- `overall_confidence` is average of included field confidences.
- Provenance stores `{field, source, method}` for explainability.

## 4) Runtime configurable output

Projection layer is separated from canonical merge. Config supports:
- selecting subset of fields,
- remapping (`from`) from canonical paths (supports `phones[0]`, `skills[].name`),
- per-field normalization (`E164`, `canonical`),
- toggling provenance/confidence,
- missing value policy (`null`, `omit`, `error`).

This allows output schema changes with **zero engine code changes**.

## 5) Edge cases handled + intentional scope limits

Handled:
1. Missing source file -> ignored; pipeline continues.
2. Malformed ATS JSON -> ignored; pipeline continues.
3. Invalid phone/email -> dropped (not invented).
4. Conflicting values across sources -> deterministic winner by confidence.
5. Partial/missing fields -> `null`/`omit`/error by config.

Deliberately out of scope (time-boxed):
- full global address parsing/geocoding,
- advanced entity resolution for multiple candidates in one run,
- OCR/PDF resume parsing,
- live API calls/rate-limit logic for GitHub/LinkedIn.
