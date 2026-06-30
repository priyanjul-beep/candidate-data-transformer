from __future__ import annotations

from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


def main() -> None:
    md_path = Path("docs/technical_design_one_pager.md")
    out_path = Path("docs/PriyaNJ_priya@example.com_Eightfold.pdf")

    lines = md_path.read_text(encoding="utf-8").splitlines()

    doc = SimpleDocTemplate(
        str(out_path),
        pagesize=A4,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
    )

    styles = getSampleStyleSheet()
    title_style = styles["Heading2"]
    body_style = ParagraphStyle(
        "Body",
        parent=styles["BodyText"],
        fontSize=9,
        leading=11,
        spaceAfter=4,
    )

    story = []
    for line in lines:
        if line.startswith("# "):
            story.append(Paragraph(line[2:].strip(), title_style))
            story.append(Spacer(1, 6))
        elif line.strip() == "":
            story.append(Spacer(1, 2))
        else:
            text = line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            story.append(Paragraph(text, body_style))

    doc.build(story)
    print(f"Generated: {out_path}")


if __name__ == "__main__":
    main()
