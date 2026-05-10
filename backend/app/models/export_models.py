"""
Pydantic models for the PDF export endpoint.

These mirror the TypeScript interfaces in src/api/exportApi.ts and must
be kept in sync with them.
"""

from pydantic import BaseModel, Field


class ChordExportItem(BaseModel):
    """
    A single chord block to be rendered in the exported PDF.

    Attributes:
        chordName:      Chord symbol shown below the staff.  e.g. "Am7"
        notes:          MIDI note names (kept for future use / metadata).
        notationImage:  High-resolution PNG rendered by the client from the
                        VexFlow SVG via an HTML canvas at 3× scale, encoded
                        as a data-URL ("data:image/png;base64,…").
                        May be an empty string if conversion failed; the
                        backend will fall back to a placeholder staff.
    """

    chordName: str = Field(..., description="Chord symbol, e.g. 'Am7'.")
    notes: list[str] = Field(
        ..., description="MIDI note names, e.g. ['A3','C4','E4','G4']."
    )
    notationImage: str = Field(
        default="",
        description=(
            "PNG data-URL rendered from the VexFlow SVG at 3× scale.  "
            "Empty string triggers the fallback placeholder staff."
        ),
    )


class ExportPdfRequest(BaseModel):
    """
    Payload sent by the client when requesting a PDF export.

    Attributes:
        title:  User-supplied title displayed at the top of the PDF.
        chords: Ordered list of chord blocks (root → selected node).
    """

    title: str = Field(
        ...,
        min_length=1,
        description="Title of the progression, centred at the top of the PDF.",
        examples=["My Jazz Progression"],
    )
    chords: list[ChordExportItem] = Field(
        ...,
        min_length=1,
        description="Ordered chord blocks from root to the selected node.",
    )
