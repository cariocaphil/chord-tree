"""
Router: /export
───────────────
POST /export/pdf

Accepts a list of chord blocks, each carrying:
  - chordName     – chord symbol (e.g. "Am7")
  - notes         – MIDI note names (metadata only)
  - notationImage – PNG data-URL rendered by the client from VexFlow at 3×

Generates an A4 PDF with ReportLab and streams it back as a downloadable file.

Layout
──────
  • Title centred at the top (Helvetica-Bold 22 pt)
  • Export date centred below the title (Helvetica 11 pt, grey)
  • Chord blocks in rows of 3, centred horizontally, auto-wrapping to new
    rows and new pages as needed.
  • Each block contains:
      – The PNG notation image, scaled to fit the slot (aspect-ratio
        preserved, centred horizontally)
      – Chord name in Helvetica-Bold 11 pt, centred below the image

Image embedding
───────────────
  The client rasterises each VexFlow SVG to PNG using an HTML canvas at 3×
  scale before sending.  The backend decodes the base64 payload and places
  it with ReportLab’s canvas.drawImage / ImageReader — no SVG-to-PDF
  translation, no font substitution, no glyph loss.
  If the image field is empty the block falls back to a five-line
  placeholder staff so the chord name is still rendered cleanly.
"""

from __future__ import annotations

import io
import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from app.models.export_models import ChordExportItem, ExportPdfRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/export", tags=["export"])

# ── Layout constants (all values are ReportLab points; 1 pt = 1/72 inch) ──────
#
# A4 usable width = 595.28 − 2×50 = 495.28 pt
# 3 blocks per row: 3×155 + 2×10 = 485 pt  ≤ 495.28 ✓
# 4 blocks per row: 4×155 + 3×10 = 650 pt  > 495.28 ✗

_PAGE_MARGIN       = 50.0   # uniform margin around the page
_TITLE_FONT_SIZE   = 22.0
_DATE_FONT_SIZE    = 11.0
_TITLE_LINE_H      = 30.0   # vertical space consumed by the title line
_DATE_LINE_H       = 26.0   # vertical space consumed by the date line
_HEADER_GAP        = 20.0   # gap between the date line and the first chord row

_BLOCK_W           = 155.0  # total width of one chord block
_BLOCK_H           = 158.0  # total height of one chord block
_BLOCK_GAP_X       = 10.0   # horizontal gap between blocks in a row
_BLOCK_GAP_Y       = 18.0   # vertical gap between rows

# Notation image slot inside each block
_NOTATION_W        = 143.0  # max width of the notation image area
_NOTATION_H        = 122.0  # max height of the notation image area
_NOTATION_PAD_TOP  = 8.0    # gap from block top to top of image

_CHORD_NAME_SIZE   = 11.0   # font size for the chord name label
_CHORD_NAME_PAD_B  = 8.0    # gap from block bottom edge to chord-name baseline

# Fallback five-line staff (drawn when notationImage is empty / undecodable)
_STAFF_LINE_COUNT  = 5
_STAFF_LINE_GAP    = 7.0    # vertical gap between staff lines
_STAFF_MARGIN_X    = 12.0   # horizontal inset from block edges
_STAFF_PAD_TOP     = 18.0   # gap from block top to topmost staff line


# ── Internal helpers ──────────────────────────────────────────────────────────

def _safe_filename(title: str) -> str:
    """Return a filesystem-safe version of *title* for Content-Disposition."""
    safe = "".join(c if c.isalnum() or c in " _-" else "_" for c in title).strip()
    return (safe or "chord_progression").replace(" ", "_") + ".pdf"


def _draw_fallback_staff(
    c,  # reportlab.pdfgen.canvas.Canvas
    bx: float,
    block_top_y: float,
) -> None:
    """Draw a five-line placeholder staff when no image is available."""
    c.setStrokeColorRGB(0.60, 0.60, 0.60)
    c.setLineWidth(0.7)
    staff_x1 = bx + _STAFF_MARGIN_X
    staff_x2 = bx + _BLOCK_W - _STAFF_MARGIN_X
    for i in range(_STAFF_LINE_COUNT):
        line_y = block_top_y - _STAFF_PAD_TOP - i * _STAFF_LINE_GAP
        c.line(staff_x1, line_y, staff_x2, line_y)
    c.setStrokeColorRGB(0, 0, 0)
    c.setLineWidth(1.0)


def _draw_notation_image(
    c,
    chord: ChordExportItem,
    bx: float,
    block_top_y: float,
) -> bool:
    """
    Decode *chord.notationImage* (a PNG data-URL) and draw it into the
    notation slot inside the chord block.

    The image is scaled uniformly to fit *(_NOTATION_W, _NOTATION_H)* and
    centred horizontally.  Returns True on success, False if the image
    could not be decoded so the caller can fall back to the placeholder.
    """
    import base64
    from reportlab.lib.utils import ImageReader  # type: ignore

    img_str = chord.notationImage.strip()
    if not img_str:
        return False

    try:
        # Strip "data:image/png;base64," prefix if present.
        if "," in img_str:
            img_str = img_str.split(",", 1)[1]

        img_bytes  = base64.b64decode(img_str)
        img_reader = ImageReader(io.BytesIO(img_bytes))

        orig_w, orig_h = img_reader.getSize()
        if orig_w <= 0 or orig_h <= 0:
            logger.warning("Zero-size image for chord '%s'", chord.chordName)
            return False

        # Scale uniformly so the image fits the notation slot.
        scale   = min(_NOTATION_W / orig_w, _NOTATION_H / orig_h)
        draw_w  = orig_w * scale
        draw_h  = orig_h * scale

        # Centre horizontally; anchor vertically from the block’s top edge.
        draw_x  = bx + (_BLOCK_W - draw_w) / 2
        draw_y  = block_top_y - _NOTATION_PAD_TOP - draw_h  # ReportLab: y = bottom

        # mask='auto' handles any residual transparency in the PNG correctly.
        c.drawImage(img_reader, draw_x, draw_y, draw_w, draw_h, mask="auto")
        return True

    except Exception as exc:
        logger.warning("Image draw failed for '%s': %s", chord.chordName, exc)
        return False


def _draw_chord_block(
    c,
    chord: ChordExportItem,
    bx: float,
    block_top_y: float,
) -> None:
    """
    Render a single chord block at position (*bx*, *block_top_y*).

    block_top_y is the y-coordinate of the block’s top edge in ReportLab’s
    coordinate system (origin = bottom-left of the page).
    """
    # ── Subtle background + border ───────────────────────────────────────────
    c.setStrokeColorRGB(0.80, 0.80, 0.80)
    c.setFillColorRGB(0.97, 0.97, 0.97)
    c.setLineWidth(0.6)
    c.roundRect(
        bx, block_top_y - _BLOCK_H,
        _BLOCK_W, _BLOCK_H,
        6,          # corner radius
        stroke=1, fill=1,
    )
    c.setFillColorRGB(0, 0, 0)
    c.setStrokeColorRGB(0, 0, 0)
    c.setLineWidth(1.0)

    # ── Notation image (PNG) or fallback staff ────────────────────────────
    if not _draw_notation_image(c, chord, bx, block_top_y):
        _draw_fallback_staff(c, bx, block_top_y)

    # ── Chord name centred below the notation ────────────────────────────
    c.setFont("Helvetica-Bold", _CHORD_NAME_SIZE)
    c.setFillColorRGB(0.10, 0.10, 0.10)
    name_y = block_top_y - _BLOCK_H + _CHORD_NAME_PAD_B
    c.drawCentredString(bx + _BLOCK_W / 2, name_y, chord.chordName)
    c.setFillColorRGB(0, 0, 0)


def _build_pdf(title: str, chords: list[ChordExportItem], export_date: str) -> bytes:
    """
    Build and return the PDF bytes for the given export data.

    All drawing is done directly on a ReportLab canvas for precise control
    over position; no Platypus flowables are used.
    """
    from reportlab.pdfgen import canvas as rl_canvas  # type: ignore
    from reportlab.lib.pagesizes import A4            # type: ignore

    buf = io.BytesIO()
    page_w, page_h = A4  # ≈ 595.28 × 841.89 pt

    usable_w = page_w - 2 * _PAGE_MARGIN

    # How many chord blocks fit side-by-side on one row.
    chords_per_row = max(
        1,
        int((usable_w + _BLOCK_GAP_X) / (_BLOCK_W + _BLOCK_GAP_X)),
    )

    c = rl_canvas.Canvas(buf, pagesize=A4)
    c.setTitle(title)
    c.setAuthor("Chord Tree")
    c.setSubject("Chord Progression Export")

    # ── Page header (title + date) ────────────────────────────────────────────
    y = page_h - _PAGE_MARGIN

    c.setFont("Helvetica-Bold", _TITLE_FONT_SIZE)
    c.setFillColorRGB(0.08, 0.08, 0.08)
    c.drawCentredString(page_w / 2, y, title)
    y -= _TITLE_LINE_H

    c.setFont("Helvetica", _DATE_FONT_SIZE)
    c.setFillColorRGB(0.45, 0.45, 0.45)
    c.drawCentredString(page_w / 2, y, f"Exported {export_date}")
    y -= _DATE_LINE_H + _HEADER_GAP

    c.setFillColorRGB(0, 0, 0)

    # ── Chord rows ────────────────────────────────────────────────────────────
    for row_start in range(0, len(chords), chords_per_row):
        row = chords[row_start : row_start + chords_per_row]

        # Start a new page if this row would overflow the bottom margin.
        if y - _BLOCK_H < _PAGE_MARGIN:
            c.showPage()
            c.setTitle(title)
            y = page_h - _PAGE_MARGIN

        # Centre the row horizontally on the page.
        n = len(row)
        row_w = n * _BLOCK_W + (n - 1) * _BLOCK_GAP_X
        x_start = _PAGE_MARGIN + (usable_w - row_w) / 2

        for col, chord in enumerate(row):
            bx = x_start + col * (_BLOCK_W + _BLOCK_GAP_X)
            _draw_chord_block(c, chord, bx, y)

        y -= _BLOCK_H + _BLOCK_GAP_Y

    c.save()
    return buf.getvalue()


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post(
    "/pdf",
    summary="Export a chord progression as a downloadable PDF",
    response_description="A4 PDF containing the progression title, export date, and chord notation blocks.",
    responses={
        200: {"content": {"application/pdf": {}}},
        422: {"description": "Validation error (missing fields, empty chord list, …)"},
        500: {"description": "PDF generation failed"},
    },
)
async def export_pdf(body: ExportPdfRequest) -> StreamingResponse:
    """
    Generate a printable A4 PDF for the selected chord path.

    Each chord is rendered as a rounded block containing:
    - Staff notation (converted from the client-supplied VexFlow SVG)
    - Chord name centred below the staff

    Blocks wrap to new rows automatically; new pages are added if needed.
    """
    logger.info(
        "POST /export/pdf | title='%s' chords=%d",
        body.title,
        len(body.chords),
    )

    export_date = datetime.now().strftime("%B %d, %Y")

    try:
        pdf_bytes = _build_pdf(body.title, body.chords, export_date)
    except Exception as exc:
        logger.exception("PDF generation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PDF generation failed — please try again.",
        ) from exc

    filename = _safe_filename(body.title)

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
