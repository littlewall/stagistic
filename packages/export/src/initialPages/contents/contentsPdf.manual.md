# Export Contents Initial Page — PDF Verification Record

This document records the visual and structural verification procedure for the Contents initial page in both export templates (Basic and Integrated Score), fulfilling Task 12 of the export contents specification.

---

## Verification Checklist

### 1. Basic Export Template

- [x] **Heading**: Displays `CONTENTS`, `SCENES`, or `MUSICAL NUMBERS` centered, matching the selected variant.
- [x] **Column Headers**: A single `script` header appears underlined and right-aligned.
- [x] **Act Headings**: Act names (e.g. `ACT ONE`, `ACT TWO`) are centered above their respective scene and music entries.
- [x] **Scene Entries**: Formatted as `<number>. <title>`, left-aligned, with script page numbers right-aligned.
- [x] **Musical Number Entries**: Formatted as `<number>) <title>`, bold, indented appropriately (flush in `musical-numbers`, nested in `scenes-and-musical-numbers`).
- [x] **Singers**: Singer credits are printed below the song title in smaller italic type.
- [x] **Instrumentals**: Labeled as *Instrumental* in italic when kind is instrumental or when no singers are credited.
- [x] **Group Deduplication**: Groups whose members all sing individually are suppressed in favor of the individual singers.
- [x] **Pre-Scene Music**: Music appearing before the first scene of an act (e.g. Overture, Entr'acte) is listed under the act heading before the first scene.
- [x] **Continuation & Overflow**: Overflow pages repeat the main page heading, current act heading, and column headers. An act heading is never orphaned at the bottom of a page, and a music title is never split from its singer line.

---

### 2. Integrated Score Export Template

- [x] **Two-Column Header**: Both `script` and `score` column headers appear right-aligned and underlined.
- [x] **Integrated Page Numbers**: Each music entry with an attached score PDF displays its starting page in the unified book pagination under the `score` column.
- [x] **Empty Score Cells**: Scene lines and musical numbers without attached score PDFs leave the `score` column blank.
- [x] **Assembly Parity & Blanks**: Script pages continue to begin on odd book pages; blank balancing pages are inserted before multi-page scores as planned by `planIntegratedAssembly`.

---

### 3. Pagination Invariants

- [x] **Roman Numerals**: Front matter pages carry continuous lower-case Roman numerals (`i`, `ii`, `iii`, etc.).
- [x] **Script Start**: Script page 1 always begins on an odd physical page (recto) in the book.
- [x] **Sidebar Sync**: The sidebar `+1` balancing blank indicator accurately reflects whether a blank page is inserted before script page 1.

---

## Verification Fixture Summary

- **Script**: Multi-act script with Act One (Scenes 1–3, Songs 1–2) and Act Two (Entr'acte 0, Scenes 4–6, Song 3).
- **Singers Test**: Song with individual lyrics from singers A & B, plus a chorus group composed of A & B. Only individual names appear.
- **Instrumental Test**: Entr'acte set to instrumental kind without lyrics; correctly displays *Instrumental*.
- **Score Attachment**: Attached multi-page PDF score to Song 1. Verified that its score page number matches the start page in the compiled book.
- **Pagination**: Front matter roman numerals sequence unbroken across title page, characters & places, and contents page.
