# Modular Export View — Design

Date: 2026-07-07
Status: Approved for planning

## Goal

Turn the placeholder Export view (`/script/:scriptId/export`, view `'export'` in
the header `ViewSwitcher`) into a real, **modular** export environment.

The export system must support many **templates** (basic script, later
"integrated script + score", …). Each template is further customizable **per
export** via inputs (filters, cue PDFs) and options (page-break rules, blank
pages). **Per-export config is ephemeral — nothing persists to the DB.**

Every export screen shares the same shell: a control panel (template picker +
input + options) beside a **paginated preview that is byte-identical to the
exported file** — there must be zero discrepancy between preview and export.

## Core principle — the editor's pagination is the single source of truth

What the user sees paginated in the editor MUST equal what they export: same
size, spacing, page splits. The TipTap pagination extension already measures
real DOM layout (`BlockCacheEntry.height`, per-line `BlockLineMap.topRel`) and
computes page breaks (`PageInfo.startPos/endPos`). Export reproduces that; it
never re-paginates.

Export-only behaviors (scene on new page, scene on **odd** page, blank pages,
character filter) are a **layer on top of** the editor pagination — applied
*upstream* by transforming the ProseMirror document and/or driving pagination
decorations, so the paginated DOM already reflects them **before** anything
reaches the PDF layer.

## Scope

**In scope (phase 1 — "Basic" template)**
- Export shell: `ExportProvider`, `ExportControlPanel`, `ExportPreview`,
  `ExportMeasureSurface`.
- Template registry + one template: **Basic** (script as-is).
- Reusable, controlled modules: character filter, page-break rules, blank pages.
- Render pipeline: DOM-transcription → `VisualLine[]` → jsPDF (worker) → Blob →
  pdf.js preview. Debounced, cancellable auto-regeneration.

**Out of scope (must not be designed against — additive later)**
- **Integrated script + score** template: per-cue PDF upload, merged/repaginated
  output via `pdf-lib`. The pipeline must accommodate a post-step without change.
- Saving/reusing export configs. Non-PDF output formats.

## Approach — chosen render engine

**DOM-transcription → jsPDF in a worker** (as in the open-source `Lycoon/scriptio`
TipTap screenwriter). The PDF layer does **no layout**:

1. **Measure.** Walk the real paginated editor DOM; Range API yields `VisualLine`
   objects = text runs with exact X/Y (px). Page breaks are the *same*
   `.pagination-page-break` widgets the editor renders, emitted as sentinel lines.
   Computed styles resolve marks (bold/italic/…); CSS pseudo-content is injected
   manually where the tree walker can't see it.
2. **Draw.** A worker places each run with jsPDF `doc.text(run.text, x, y)`,
   `PX_TO_PT = 72/96`; page breaks split pages. No wrapping, no re-pagination.
   Output `doc.output("blob")`. Fonts registered from base64 TTF (same faces as
   editor).
3. **Preview.** pdf.js renders that Blob — literally the downloaded bytes.

Because the PDF is a faithful transcription of the editor's measured lines:
**editor == preview == export**, by construction.

**Rejected:**
- `@react-pdf/renderer` — its own Yoga layout engine re-wraps/re-paginates →
  editor↔export drift. Disqualifying given the source-of-truth principle.
- Browser `window.print()` / paged.js — can't hand back a Blob to preview/merge;
  print-engine variance.
- `html2canvas` + jsPDF — raster, non-selectable text.
- pdf-lib from scratch — reimplements a text layout engine (huge, drift-prone).
  (pdf-lib is still used later, only for the score **merge** post-step.)

## Architecture — three layers (compose by components, reuse by modules)

The composition is A+B: reusable modules (A), composed as JSX inside a template
component (B), not via a declarative descriptor array.

### 1. Shared modules — controlled components (reusable)

Each does one thing, is pure `value` + `onChange`, knows nothing about "export":

- `CharacterFilterModule` — pick one/more characters; export only scenes where a
  character appears in a **character block OR stage directions**.
- `PageBreakModule` — start acts/scenes on a new page; scenes on an **odd** page.
- `BlankPagesModule` — blank pages between title page and script; each blank
  toggles whether it counts toward page numbering.
- `CuePdfModule` — later phase (score): attach a PDF per cue.

Independently testable; reused across templates (Basic and Score both use
page-break + blank-page modules).

### 2. Template — React component that owns typed state (composition)

```tsx
export const BasicExportTemplate: ExportTemplateComponent = ({script, onArtifact}) => {
    const [config, setConfig] = useState<BasicExportConfig>(BASIC_DEFAULTS);
    useExportPreview({config, script, derive: deriveBasicExportPlan, onArtifact}); // debounced, cancellable
    return (
        <ExportPanel>
            <ExportPanel.Input>
                <CharacterFilterModule
                    value={config.characterFilter}
                    onChange={cf => setConfig(c => ({...c, characterFilter: cf}))}
                    characters={script.characters}
                />
            </ExportPanel.Input>
            <ExportPanel.Options>
                <PageBreakModule  value={config.pageBreaks}  onChange={pb => setConfig(c => ({...c, pageBreaks: pb}))} />
                <BlankPagesModule value={config.blankPages}  onChange={bp => setConfig(c => ({...c, blankPages: bp}))} />
            </ExportPanel.Options>
        </ExportPanel>
    );
};
```

`ExportPanel.Input` / `ExportPanel.Options` are presentational sections from the
shared library (consistent headings/spacing). The template decides what goes
where — no shell magic.

### 3. Derive + transcription — the render, split cleanly

The template's export logic is a **pure** function; heavy PDF work is **shared
infrastructure**, not per-template code:

```ts
deriveBasicExportPlan(config: BasicExportConfig, script: ScriptData): ExportPlan
```

```ts
interface ExportPlan {
    doc: ScriptDocument,               // transformed ProseMirror doc (e.g. filtered scenes)
    pagination: PaginationOverrides,   // forced breaks, odd-page starts, blank-page sentinels
    postSteps?: ExportPostStep[],      // e.g. score merge (pdf-lib) — later phase
}
```

Shared pipeline (template-agnostic): `ExportPlan → ExportMeasureSurface renders
the transformed, re-paginated doc → transcribe VisualLines → worker jsPDF → Blob
→ (postSteps) → artifact`.

Where each option lives:

| Export option                         | Applied in `ExportPlan`                                  |
|---------------------------------------|----------------------------------------------------------|
| Character filter                      | `doc` — remove non-matching scenes **before** pagination |
| Scene/act on new page                 | `pagination` — forced break at scene start               |
| Scene on **odd** page                 | `pagination` — forced break + blank spacer if it lands even |
| Blank pages title↔script (counted?)   | `pagination` — blank-page sentinels; flag = counts toward numbering |
| Score: cue PDFs merged & repaginated  | `postSteps` — `pdf-lib` interleave + renumber (later)    |

### Registry

```ts
Record<templateId, {
    label: string,
    description: string,
    Component: ExportTemplateComponent, // owns UI + ephemeral state (composes modules)
    defaults: unknown,                  // per-template default config (ephemeral)
}>
```

New template = one file: a component (composes modules) + its `derive*` plan
function. It does not touch the shell or other templates.

## Layout — the export screen

Single control panel beside a dominant preview ("script is the spotlight"):

```
┌─────────────────────────────────────────────────────────────┐
│  AppHeader   [ Editor | Export ]         … script title …     │
├──────────────────┬──────────────────────────────────────────┤
│ CONTROL PANEL    │                                            │
│ (~320px, scroll) │           PREVIEW (dominant)               │
│  Template ▾      │        pdf.js paginated viewer             │
│  ── Input ──     │        (Dark Stage, scroll, page-nav)      │
│   Character filter│       [ page 1 ] [ page 2 ] …             │
│  ── Options ──   │                                            │
│   Page breaks    │        [ ‹ 2 / 14 › ]   [ zoom ]           │
│   Blank pages    │                                            │
│  [ ⭳ Export PDF ]│                                            │
└──────────────────┴──────────────────────────────────────────┘
     (+ ExportMeasureSurface — offscreen, laid out, lives behind preview)
```

```tsx
<ExportProvider template script>          // active templateId, ephemeral config, artifact state
  <AppLayout header={<ScriptEditorAppHeader activeView="export" />}>
    <ExportControlPanel>
      <TemplatePicker />                   // switch template → reset config to defaults, remount Component
      <ActiveTemplate.Component />         // §Architecture-2: composes modules into ExportPanel.Input/.Options
      <ExportDownloadButton />             // downloads current artifact Blob
    </ExportControlPanel>
    <ExportPreview />                      // pdf.js viewer over the artifact Blob + page-nav/zoom
    <ExportMeasureSurface />               // offscreen paginated surface (§Approach) the transcriber walks
  </AppLayout>
</ExportProvider>
```

**Responsibilities**
- `ExportProvider` — holds `templateId` + artifact/status state and provides the
  shared machinery (`script`, measure surface handle, worker) via context. It
  does not itself run the cycle.
- `useExportPreview` — the hook the template calls; drives the debounced,
  cancellable `derive → measure → worker → Blob` cycle using the provider's
  machinery and the template's `config` + `derive`, then reports the artifact
  back to the provider.
- `ExportControlPanel` — layout only (picker + template modules + download); no
  template knowledge.
- `ExportPreview` — pure pdf.js display of the Blob + navigation.
- `ExportMeasureSurface` — invisible but **laid out** (measurement needs real
  layout, not `display:none`); reuses the editor extensions + resolved settings +
  `EditorSurfaceCache`. Its only job is to provide a measurable paginated DOM for
  the transformed doc.

**Preview states (debounced auto-regen)**
- *Regenerating* — subtle overlay over the previous render; never blank (no
  flicker between versions).
- *Empty filter* — character filter removes everything: empty state in preview,
  not an empty PDF.
- *Error* — transcription/render failure: inline message in preview; panel stays
  usable.

**Template switch** resets config to that template's `defaults` (ephemeral, so
safe) and remounts `ActiveTemplate.Component`.

## Data flow

```
config change
  → (debounce)
  → deriveExportPlan(config, script)          // pure, per-template
  → ExportMeasureSurface renders plan.doc with plan.pagination overrides
  → transcribe measured DOM → VisualLine[]
  → worker: jsPDF draw → Blob
  → (plan.postSteps, e.g. pdf-lib merge)      // later phase
  → artifact Blob → ExportPreview (pdf.js) + ExportDownloadButton
```

Each new config change **cancels** the in-flight cycle (AbortSignal) before
starting the next.

## Testing strategy

- **Modules** — unit tests: controlled `value`/`onChange` behavior in isolation
  (`vite-plus/test`).
- **`derive*` plan functions** — pure unit tests: given config + script, assert
  the transformed doc (filtered scenes) and pagination overrides (forced breaks,
  odd-page spacers, blank sentinels). No DOM.
- **Transcription** — browser test (`*.browser.test.tsx`, `test:browser`):
  render a known doc on the measure surface, assert `VisualLine[]` (page-break
  sentinels at expected positions, run coordinates monotonic per page).
- **Fidelity guard** — browser test asserting the measure surface's page breaks
  match the transcribed page-break sentinels (editor == export invariant).
- **Shell** — browser test: switch template resets config; debounced regen
  cancels prior cycle; empty-filter and error states render.

## Open questions (resolve during planning)

- Exact `VisualLine` / `PaginationOverrides` shapes — derive from the pagination
  extension's existing structures rather than inventing parallel types.
- Font inventory: which TTF faces the editor uses and their base64 packaging for
  the worker.
- Whether `ExportMeasureSurface` reuses `EditorSurfaceCache` instances or owns a
  dedicated export-only cache keyed by the transformed doc + overrides.
