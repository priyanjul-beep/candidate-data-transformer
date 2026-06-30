from __future__ import annotations

import json
import tempfile
from pathlib import Path
from typing import Any

import streamlit as st

from src.pipeline import run_pipeline
from src.projector import project
from src.validator import validate_custom_projection, validate_default_profile

st.set_page_config(page_title="Candidate Data Transformer", layout="wide")
st.title("Multi-Source Candidate Data Transformer")
st.caption("Eightfold assignment demo UI")


def _init_state() -> None:
    defaults: dict[str, Any] = {
        "config_text": "",
        "active_canonical": None,
        "active_projected": None,
        "active_validation_errors": [],
        "projection_modal_open": False,
        "projection_generated": False,
        "selected_projection_fields": [],
        "projection_fields_search": "",
        "used_generated_projection_config": False,
        "last_input_mode": None,
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value


def _parse_editor_config(text: str) -> dict[str, Any] | None:
    if not text.strip():
        return None
    return json.loads(text)


def _apply_projection_from_config(canonical: dict[str, Any], cfg: dict[str, Any] | None) -> None:
    projection_config = cfg if cfg is not None else {
        "fields": [
            {"path": "candidate_id", "type": "string", "required": True},
            {"path": "full_name", "type": "string"},
            {"path": "emails", "type": "string[]"},
            {"path": "phones", "type": "string[]", "normalize": "E164"},
            {"path": "location", "type": "object"},
            {"path": "links", "type": "object"},
            {"path": "headline", "type": "string"},
            {"path": "years_experience", "type": "number"},
            {"path": "skills", "type": "object[]"},
            {"path": "experience", "type": "object[]"},
            {"path": "education", "type": "object[]"},
        ],
        "include_confidence": True,
        "include_provenance": True,
        "on_missing": "null",
    }
    projected = project(canonical, projection_config)
    if cfg is None:
        validation_errors = validate_default_profile(projected)
    else:
        validation_errors = validate_custom_projection(projected, projection_config)

    st.session_state["active_projected"] = projected
    st.session_state["active_validation_errors"] = validation_errors
    st.session_state["projection_generated"] = True


@st.dialog("Customize Projected Output")
def _projection_modal(config_text: str) -> None:
    canonical = st.session_state.get("active_canonical")
    if not canonical:
        st.warning("Run Transformer first to generate canonical record.")
        if st.button("Close", key="modal_close_no_canonical"):
            st.session_state["projection_modal_open"] = False
            st.rerun()
        return

    st.write("Select the fields from the canonical record that you want in the projected output.")

    all_fields = list(canonical.keys())
    selected_fields = st.session_state.get("selected_projection_fields", [])
    for field in all_fields:
        checkbox_key = f"field_checkbox_{field}"
        if checkbox_key not in st.session_state:
            st.session_state[checkbox_key] = field in selected_fields

    st.text_input(
        "Search canonical keys",
        key="projection_fields_search",
        placeholder="Type to filter keys...",
    )
    query = st.session_state.get("projection_fields_search", "").strip().lower()

    filtered_fields = [f for f in all_fields if query in f.lower()]

    act_col1, act_col2 = st.columns(2)
    with act_col1:
        if st.button("Select All", use_container_width=True, key="modal_select_all"):
            st.session_state["selected_projection_fields"] = all_fields.copy()
            for field in all_fields:
                st.session_state[f"field_checkbox_{field}"] = True
            st.rerun()
    with act_col2:
        if st.button("Clear All", use_container_width=True, key="modal_clear_all"):
            st.session_state["selected_projection_fields"] = []
            for field in all_fields:
                st.session_state[f"field_checkbox_{field}"] = False
            st.rerun()

    for field in filtered_fields:
        st.checkbox(field, key=f"field_checkbox_{field}")

    st.session_state["selected_projection_fields"] = [
        field for field in all_fields if st.session_state.get(f"field_checkbox_{field}", False)
    ]
    st.caption(f"Selected: {len(st.session_state['selected_projection_fields'])} fields")

    col_cancel, col_skip, col_generate = st.columns(3)
    with col_cancel:
        if st.button("Cancel", use_container_width=True, key="modal_cancel"):
            st.session_state["projection_modal_open"] = False
            st.rerun()
    with col_skip:
        if st.button("Skip", use_container_width=True, key="modal_skip"):
            try:
                editor_cfg = _parse_editor_config(config_text)
            except json.JSONDecodeError as e:
                st.error(f"Invalid config JSON: {e}")
                return
            _apply_projection_from_config(canonical, editor_cfg)
            st.session_state["used_generated_projection_config"] = False
            st.session_state["projection_modal_open"] = False
            st.rerun()
    with col_generate:
        if st.button("Generate Output", type="primary", use_container_width=True, key="modal_generate"):
            selected = st.session_state["selected_projection_fields"]
            auto_cfg = {
                "fields": [
                    {"path": path}
                    for path in selected
                    if path not in {"overall_confidence", "provenance"}
                ],
                "include_confidence": "overall_confidence" in selected,
                "include_provenance": "provenance" in selected,
                "on_missing": "null",
            }
            _apply_projection_from_config(canonical, auto_cfg)
            st.session_state["used_generated_projection_config"] = True
            st.session_state["projection_modal_open"] = False
            st.rerun()


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

_init_state()

input_mode = st.radio(
    "Input mode",
    options=["Uploaded files", "Bundled sample files"],
    index=0,
    horizontal=True,
)

if st.session_state["last_input_mode"] != input_mode:
    if input_mode == "Bundled sample files":
        st.session_state["config_text"] = Path(sample_config).read_text(encoding="utf-8")
    elif st.session_state["last_input_mode"] is None:
        st.session_state["config_text"] = ""
    st.session_state["last_input_mode"] = input_mode

uploads_disabled = input_mode == "Bundled sample files"

col1, col2 = st.columns(2)
with col1:
    recruiter_upload = st.file_uploader("Recruiter CSV", type=["csv"], disabled=uploads_disabled)
    ats_upload = st.file_uploader("ATS JSON", type=["json"], disabled=uploads_disabled)
with col2:
    notes_upload = st.file_uploader("Recruiter Notes TXT", type=["txt"], disabled=uploads_disabled)
    config_upload = st.file_uploader("Custom Config JSON (optional)", type=["json"], disabled=uploads_disabled)

if input_mode == "Bundled sample files":
    recruiter_path = sample_recruiter
    ats_path = sample_ats
    notes_path = sample_notes
else:
    recruiter_path = _save_uploaded(recruiter_upload)
    ats_path = _save_uploaded(ats_upload)
    notes_path = _save_uploaded(notes_upload)
    if config_upload is not None:
        st.session_state["config_text"] = config_upload.read().decode("utf-8")

st.subheader("Custom Projection Config")
st.session_state["config_text"] = st.text_area(
    "Edit JSON config (leave empty to use default schema)",
    value=st.session_state.get("config_text", ""),
    key="projection_config_editor",
    height=220,
)

if st.button("Run Transformer", type="primary"):
    if input_mode == "Uploaded files" and not any([recruiter_path, ats_path, notes_path]):
        st.error("Please upload at least one source file (CSV, JSON, or TXT).")
        st.stop()

    result = run_pipeline(
        recruiter_csv_path=recruiter_path,
        ats_json_path=ats_path,
        notes_txt_path=notes_path,
        config=None,
    )

    st.session_state["active_canonical"] = result["canonical"]
    st.session_state["active_projected"] = None
    st.session_state["active_validation_errors"] = []
    st.session_state["projection_generated"] = False
    st.session_state["projection_modal_open"] = False
    st.session_state["used_generated_projection_config"] = False
    st.session_state["projection_fields_search"] = ""
    st.session_state["selected_projection_fields"] = list(result["canonical"].keys())
    for key in [k for k in list(st.session_state.keys()) if k.startswith("field_checkbox_")]:
        del st.session_state[key]

if st.session_state.get("active_canonical") is not None:
    tab1, tab2, tab3 = st.tabs(["Projected Output", "Canonical Record", "Validation"])
    with tab1:
        if not st.session_state.get("projection_generated"):
            st.info("No projected output generated yet.")
            if st.button("Customize Projected Output", type="primary", key="open_modal_button"):
                st.session_state["projection_modal_open"] = True
                st.rerun()
        else:
            st.json(st.session_state["active_projected"])
            st.download_button(
                label="Download projected JSON",
                data=json.dumps(st.session_state["active_projected"], indent=2),
                file_name="projected_output.json",
                mime="application/json",
            )
            if st.session_state.get("used_generated_projection_config"):
                st.caption("Projection generated from selected canonical fields.")
            else:
                st.caption("Projection generated using Projection Config JSON editor (Skip path).")
    with tab2:
        st.json(st.session_state["active_canonical"])
    with tab3:
        errors = st.session_state.get("active_validation_errors", [])
        if not st.session_state.get("projection_generated"):
            st.info("Generate projected output first to run validation.")
        elif errors:
            st.error("Validation failed")
            for err in errors:
                st.write(f"- {err}")
        else:
            st.success("Validation passed")

if st.session_state.get("projection_modal_open"):
    _projection_modal(st.session_state.get("config_text", ""))
