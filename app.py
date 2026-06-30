from __future__ import annotations

import json
import tempfile
from pathlib import Path

import streamlit as st

from src.pipeline import run_pipeline

st.set_page_config(page_title="Candidate Data Transformer", layout="wide")
st.title("Multi-Source Candidate Data Transformer")
st.caption("Eightfold assignment demo UI")


def _save_uploaded(uploaded_file) -> str | None:
    if not uploaded_file:
        return None
    with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{uploaded_file.name}") as tmp:
        tmp.write(uploaded_file.read())
        return tmp.name


sample_recruiter = "data/samples/recruiter_export.csv"
sample_ats = "data/samples/ats_blob.json"
sample_notes = "data/samples/recruiter_notes.txt"
sample_config = "data/samples/custom_config.json"

use_samples = st.checkbox("Use bundled sample input files", value=True)

col1, col2 = st.columns(2)
with col1:
    recruiter_upload = st.file_uploader("Recruiter CSV", type=["csv"])
    ats_upload = st.file_uploader("ATS JSON", type=["json"])
with col2:
    notes_upload = st.file_uploader("Recruiter Notes TXT", type=["txt"])
    config_upload = st.file_uploader("Custom Config JSON (optional)", type=["json"])

if use_samples:
    recruiter_path = sample_recruiter
    ats_path = sample_ats
    notes_path = sample_notes
    config_text = Path(sample_config).read_text(encoding="utf-8")
else:
    recruiter_path = _save_uploaded(recruiter_upload)
    ats_path = _save_uploaded(ats_upload)
    notes_path = _save_uploaded(notes_upload)
    config_text = config_upload.read().decode("utf-8") if config_upload else ""

st.subheader("Custom Projection Config")
config_text = st.text_area(
    "Edit JSON config (leave empty to use default schema)",
    value=config_text,
    height=220,
)

if st.button("Run Transformer", type="primary"):
    custom_cfg = None
    if config_text.strip():
        try:
            custom_cfg = json.loads(config_text)
        except json.JSONDecodeError as e:
            st.error(f"Invalid config JSON: {e}")
            st.stop()

    result = run_pipeline(
        recruiter_csv_path=recruiter_path,
        ats_json_path=ats_path,
        notes_txt_path=notes_path,
        config=custom_cfg,
    )

    tab1, tab2, tab3 = st.tabs(["Projected Output", "Canonical Record", "Validation"])
    with tab1:
        st.json(result["projected"])
        st.download_button(
            label="Download projected JSON",
            data=json.dumps(result["projected"], indent=2),
            file_name="projected_output.json",
            mime="application/json",
        )
    with tab2:
        st.json(result["canonical"])
    with tab3:
        if result["validation_errors"]:
            st.error("Validation failed")
            for err in result["validation_errors"]:
                st.write(f"- {err}")
        else:
            st.success("Validation passed")
