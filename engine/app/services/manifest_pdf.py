"""Approval manifest export — deterministic PDF via fpdf2.

One manifest = one review's complete governance record: content snapshot,
every finding + citation + evidence ids + human decision, the policy version
evaluated, and the approver's signature block. Byte-determinism is a product
property (the same record always renders the same PDF), so construction dates
are pinned and a SHA-256 of the bytes is returned for storage on the approval
row.
"""

import hashlib
from datetime import UTC, datetime
from typing import Any

from fpdf import FPDF

from app.contracts import ApprovalEntry, Issue, Review

INK = (28, 37, 54)        # paper-ink navy
REDPEN = (194, 64, 42)    # flagged
GREENINK = (31, 107, 74)  # resolved
CITE = (36, 85, 197)      # citation blue
PAPER = (251, 250, 247)

# fpdf2 core fonts are latin-1. The corpus is full of typographic Unicode
# (curly quotes, em-dashes, ellipses); normalizing once, deterministically,
# keeps bytes stable without bundling a font.
_LATIN1_MAP = {
    "\u2018": "'", "\u2019": "'", "\u201a": ",",
    "\u201c": '"', "\u201d": '"',
    "\u2013": "-", "\u2014": "--", "\u2212": "-",
    "\u2026": "...", "\u20ac": "EUR",
    "\u00a0": " ", "\u200b": "",
}


def latin1(text: str) -> str:
    """Deterministic latin-1-safe normalization for core-font PDF text."""
    for src, dst in _LATIN1_MAP.items():
        text = text.replace(src, dst)
    return text.encode("latin-1", "replace").decode("latin-1")


class ManifestPDF(FPDF):
    """FPDF that latin-1-normalizes every emitted string at one chokepoint.

    Keeps all downstream call sites free of encoding scaffolding and makes the
    byte output independent of the corpus's typographic characters.
    """

    def cell(self, *args: Any, **kwargs: Any) -> Any:  # noqa: ANN401
        if len(args) > 2:
            args = (*args[:2], latin1(str(args[2])), *args[3:])
        if isinstance(kwargs.get("text"), str):
            kwargs["text"] = latin1(kwargs["text"])
        return super().cell(*args, **kwargs)

    def multi_cell(self, *args: Any, **kwargs: Any) -> Any:  # noqa: ANN401
        if len(args) > 2:
            args = (*args[:2], latin1(str(args[2])), *args[3:])
        if isinstance(kwargs.get("text"), str):
            kwargs["text"] = latin1(kwargs["text"])
        return super().multi_cell(*args, **kwargs)




def _pinned_now(fixed_ms: int | None = None) -> datetime:
    if fixed_ms is not None:
        return datetime.fromtimestamp(fixed_ms / 1000, tz=UTC)
    return datetime.now(UTC)


def build_manifest_pdf(
    review: Review,
    approval: ApprovalEntry,
    brand: str,
    generated_ms: int | None = None,
) -> tuple[bytes, str]:
    """Render the manifest; returns (bytes, sha256-hex)."""

    pdf = ManifestPDF(format="A4", unit="mm")
    pdf.set_creation_date(_pinned_now(generated_ms))
    pdf.set_margins(16, 16, 16)
    pdf.set_auto_page_break(True, 16)
    pdf.add_page()
    pdf.alias_nb_pages()

    # ---- Masthead --------------------------------------------------------
    pdf.set_fill_color(*PAPER)
    pdf.rect(0, 0, 210, 42, style="F")
    pdf.set_xy(16, 12)
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_text_color(*INK)
    pdf.cell(0, 10, "Approval Manifest", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(*REDPEN)
    pdf.set_xy(16, 22)
    pdf.cell(0, 6, brand, new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(*INK)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_xy(16, 29)
    pdf.cell(0, 6, review.title, new_x="LMARGIN", new_y="NEXT")

    # ---- Meta block ------------------------------------------------------
    y = 46
    pdf.set_y(y)
    pdf.set_font("Helvetica", "", 9)
    meta_rows = [
        ("Review", f"{review.id} · {review.channel} · author {review.author}"),
        ("Policy version", review.policy_version),
        ("Submitted", _fmt_ms(review.submitted_at)),
        ("Content versions", str(len(review.sections))),
        ("Findings", str(len(review.issues))),
        ("Approval state", f"{approval.state.value} · {approval.approver}"
                          f"{(' · ' + _fmt_ms(approval.signed_at)) if approval.signed_at else ''}"),
    ]
    for label, value in meta_rows:
        pdf.set_x(16)
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(120, 120, 120)
        pdf.cell(26, 5, label.upper())
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*INK)
        pdf.cell(0, 5, value, new_x="LMARGIN", new_y="NEXT")
        y += 5

    # ---- Content snapshot -------------------------------------------------
    pdf.ln(3)
    pdf.set_draw_color(*INK)
    pdf.line(16, pdf.get_y(), 194, pdf.get_y())
    pdf.ln(2)
    _h2(pdf, "Content under approval")
    for section in review.sections:
        pdf.set_font("Helvetica", "B", 9)
        pdf.multi_cell(0, 5, section.heading or "(untitled block)", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*INK)
        pdf.multi_cell(0, 4.5, section.body.strip(), new_x="LMARGIN", new_y="NEXT")
        pdf.ln(1)

    # ---- Findings ledger ---------------------------------------------------
    pdf.ln(2)
    pdf.line(16, pdf.get_y(), 194, pdf.get_y())
    pdf.ln(2)
    _h2(pdf, "Findings + citations (cite it or don't flag it)")
    if review.issues:
        for issue in review.issues:
            _issue_block(pdf, issue)
    else:
        pdf.set_font("Helvetica", "I", 9)
        pdf.multi_cell(0, 5, "No findings were open at sign time.", new_x="LMARGIN", new_y="NEXT")

    # ---- Decision --------------------------------------------------------
    pdf.ln(3)
    pdf.line(16, pdf.get_y(), 194, pdf.get_y())
    pdf.ln(2)
    _h2(pdf, "Decision")
    pdf.set_font("Helvetica", "", 9)
    state_line = {
        "signed": "APPROVED — signed by {name} on {when}".format(
            name=approval.approver,
            when=_fmt_ms(approval.signed_at) or "—",
        ),
        "returned": f"CHANGES REQUESTED — returned by {approval.approver}",
        "waiting": f"WAITING — routed to {approval.approver}",
    }[approval.state.value]
    pdf.set_text_color(*(GREENINK if approval.state.value == "signed" else REDPEN))
    pdf.multi_cell(0, 5, state_line, new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(*INK)
    if approval.note:
        pdf.multi_cell(0, 4.5, f"Note: {approval.note}", new_x="LMARGIN", new_y="NEXT")

    # ---- Footer -----------------------------------------------------------
    pdf.ln(3)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(110, 110, 110)
    pdf.multi_cell(
        0, 4.5,
        "This manifest was rendered deterministically: identical approval records "
        "produce identical bytes. Findings cite exact clauses and evidence ids; "
        "policy version governs which rules this decision rests on.",
        new_x="LMARGIN", new_y="NEXT",
    )
    _page_numbers(pdf)

    data = bytes(pdf.output())
    digest = hashlib.sha256(data).hexdigest()
    return data, digest


def _issue_block(pdf: FPDF, issue: Issue) -> None:
    if issue.status == "dismissed":
        pdf.set_draw_color(160, 160, 160)
        label_color = (110, 110, 110)
    elif issue.status in {"edited", "accepted"}:
        label_color = GREENINK
        pdf.set_draw_color(*GREENINK)
    else:
        label_color = REDPEN
        pdf.set_draw_color(*REDPEN)

    pdf.set_draw_color(*INK)
    pdf.set_x(16.5)
    y0 = pdf.get_y()
    pdf.line(16.5, y0, 16.5, y0 + 18)
    pdf.set_x(19)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*label_color)
    head = f"{issue.headline}  [{issue.severity.value.upper()} · {issue.status.value}"
    head += f" · rule {issue.citation.clause}" if issue.citation else " · advisory"
    head += "]"
    pdf.multi_cell(0, 4.5, head, new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(*INK)
    pdf.set_font("Helvetica", "", 8.5)
    pdf.multi_cell(0, 4, f"Quote: “{issue.quote}”", new_x="LMARGIN", new_y="NEXT")
    if issue.citation:
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(*CITE)
        pdf.multi_cell(
            0, 4,
            f"§{issue.citation.clause} {issue.citation.section_label} "
            f"(v{issue.citation.version}): {issue.citation.text}",
            new_x="LMARGIN", new_y="NEXT",
        )
        pdf.set_text_color(*INK)
    if issue.verification:
        pdf.set_font("Helvetica", "", 8)
        pdf.multi_cell(
            0, 4, f"Verification: {issue.verification}"
                  + (f" · evidence: {', '.join(issue.evidence_ids)}"
                     if issue.evidence_ids else ""),
            new_x="LMARGIN", new_y="NEXT",
        )
    if issue.status == "dismissed" and issue.reason:
        pdf.multi_cell(0, 4, f"Dismiss reason: {issue.reason}", new_x="LMARGIN", new_y="NEXT")
    if issue.status == "edited" and issue.replacement:
        pdf.multi_cell(0, 4, f"Applied edit: “{issue.replacement}”", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1.5)


def _h2(pdf: FPDF, text: str) -> None:
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*INK)
    pdf.multi_cell(0, 6, text, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(0.5)


def _fmt_ms(ms: int | None) -> str:
    if not ms:
        return "—"
    return datetime.fromtimestamp(ms / 1000, tz=UTC).strftime("%d %b %Y %H:%M UTC")


def _page_numbers(pdf: FPDF) -> None:
    pdf.set_y(-14)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(120, 120, 120)
    pdf.cell(0, 8, f"{pdf.page_no()}/{{nb}}", align="R")