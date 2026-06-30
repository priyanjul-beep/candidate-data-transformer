from __future__ import annotations

import argparse
import json
from pathlib import Path

from src.pipeline import run_pipeline


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Multi-source Candidate Data Transformer")
    parser.add_argument("--recruiter-csv", type=str, default=None)
    parser.add_argument("--ats-json", type=str, default=None)
    parser.add_argument("--notes", type=str, default=None)
    parser.add_argument("--config", type=str, default=None, help="Optional custom projection config JSON")
    parser.add_argument("--out", type=str, default="outputs/default_output.json")
    parser.add_argument("--candidate-id", type=str, default="candidate-001")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    custom_config = None
    if args.config:
        custom_config = json.loads(Path(args.config).read_text(encoding="utf-8"))

    result = run_pipeline(
        recruiter_csv_path=args.recruiter_csv,
        ats_json_path=args.ats_json,
        notes_txt_path=args.notes,
        config=custom_config,
        candidate_id=args.candidate_id,
    )

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(result["projected"], indent=2), encoding="utf-8")

    print("Projected profile:")
    print(json.dumps(result["projected"], indent=2))
    if result["validation_errors"]:
        print("\nValidation errors:")
        for err in result["validation_errors"]:
            print("-", err)
    else:
        print("\nValidation: OK")


if __name__ == "__main__":
    main()
