# Acts and scenes documentation Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Work continues in the shared workspace; do not stage or commit.

**Goal:** Publish the approved category overview and six task guides in the existing knowledge base.

**Architecture:** Markdown articles under `/editor/structure/`, immediate links in the existing Editor sidebar, and shared keyboard/icon styles. No application behavior changes.

**Tech Stack:** Astro, Starlight, Lucode, Markdown, static SVG assets, moon checks.

**Spec:** `docs/proposals/editor-documentation-acts-and-scenes.md`, approved 7 October 2026.

## Global Constraints

- English user-facing content; Czech proposal and verification notes.
- Actual editor labels and icons, white semantic keycaps, inline code for literal user input.
- Source-check exact insertion, movement, collapse, numbering and deletion behavior.
- Do not take over the shared browser without a new handoff following the previous human interruption.
- Preserve unrelated edits and staging. No commits, deployment or schema changes.

## Review Focus

- Scene heading removal preserves text but drops synopsis and place assignments.
- First scene protections and act boundaries must match implementation.
- Moving a section must describe exactly which content moves with it.
- Sidebar group collapse and editor scene collapse must remain distinct.
- Scene numbering and place edits must use available settings and controls.

## Task 1: Verify procedures and write content

**Files:** `apps/docs/src/content/docs/editor/structure/{index,add,navigate,rearrange,details,numbering,headings}.md`; required static icons in `apps/docs/public/icons/editor/`.

- [x] Inspect source controls, command implementations and relevant existing tests for all six guides.
- [x] Write independent task guides using the shared Robin/Alex example and contextual exceptions.
- [x] Check factual claims against the implementation; record limitations of practical verification.

## Task 2: Integrate and verify

**Files:** `apps/docs/src/navigation/sections.ts`, `apps/docs/README.md`, approved proposal and this record.

- [x] Add a flat Acts and scenes sidebar group and replace the preparatory overview.
- [x] Update article inventory and icon provenance.
- [x] Run `moon run docs:lint docs:typecheck docs:build`, validate generated internal links, fragments and assets, and run scoped `git diff --check`.
- [x] Request an independent content review, resolve findings, then run `graphify update .`.

## Verification record

Ověřeno 7. 10. 2026:

- `moon run docs:lint docs:typecheck docs:build`: všechny tři úlohy prošly; Astro check bez chyb, varování a hints.
- Po doplnění symbolů šipek v klávesovém postupu znovu prošel `moon run docs:build`: 32 stránek.
- Kontrola sestavených HTML: 2365 místních odkazů a zdrojů, 276 fragmentů, bez neplatných cílů.
- Nezávislá obsahová kontrola: bez blokujících nálezů; 26 odkazů, pět fragmentů a ikony nové kategorie platné. Potvrzen rozdíl mezi ochranou prvního nadpisu před odstraněním a převodem typu.
- `git diff --check` pro změny dokumentace prošel.
- `graphify update .` prošel: 8243 uzlů, 20552 hran, 394 komunit. Stávající omezení parseru SQL/JSON a velikosti HTML vizualizace zůstala beze změny.
- Nebyla změněna funkčnost aplikace, schéma ani staging; bez commitu a nasazení.

Postupy jsou ověřené podle implementace a příslušných existujících testových scénářů, nikoli novým živým průchodem editorem. Sdílený prohlížeč zůstal po předchozím lidském převzetí nedotčený. Vizuální kontrolu nových článků ani živé přetažení neoznačujeme za provedené. Nové jednotkové testy pro samotný text nebyly přidány.

Upřesnění schváleného návrhu podle zdrojů: sidebar neumí přesun celého aktu ani sbalení seznamu pod aktem; editor umí sbalit tělo scény. Attribute manager nyní nabízí místa, nikoli editaci synopsis. Příslušné nedostupné postupy nebyly publikovány.

Klíčové ověřené zdroje: `StructureSidebarContextActions.tsx`, `actBlockMutations.ts` (první akt před první blok, další na konec), `handlers/enter.ts` (Scene a Act), `StructureRowAct.tsx` (přímé přejmenování a okamžité odstranění), `useStructureSidebarDnd.ts`, `structureDndConfig.ts`, `structureReorder.ts` (přesun těla do další strukturální hranice), `SceneCollapseOverlay.tsx`, `sceneCollapseModel.ts`, `AttributeManagerSceneDetail.tsx`, `AttributeManagerPlaceDetail.tsx`, `SceneNumberingExtension.ts`, `structureRows.ts`, `ElementNumericControls.tsx`, `sceneActions.ts`, `SceneGuardExtension.ts` a modály odstranění/převodu.
