# Finding and reviewing documentation Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans task-by-task. Preserve the shared workspace; do not stage or commit.

**Goal:** Complete the approved overview and six review task guides.

**Architecture:** Markdown under `/editor/review/`, a flat sidebar group, shared keycaps and static icons. No application behavior changes.

**Tech Stack:** Astro, Starlight, Lucode, Markdown, SVG, moon checks.

**Spec:** `docs/proposals/editor-documentation-finding-and-reviewing.md`, approved 12 October 2026.

## Global Constraints

- English user-facing guides; Czech proposal and verification record.
- Literal input in code, platform-specific white keycaps, actual icons for controls without text.
- Trace registered search/comment controls and handlers, rather than inferring behavior from labels alone.
- Keep the human-owned shared browser untouched until a new handoff. Record source verification honestly.
- Preserve unrelated edits and staging. No commits, deployment or schema changes.

## Review Focus

- Search filters affect replacement; Clear search and resetting options have different scope.
- Enter navigates in Find, replaces in Replace with, and adds a line in a comment unless combined with Command/Ctrl.
- Passage anchors and block anchors differ; Detached comments remain accessible through List.
- Resolve preserves a thread; deleting a thread offers its own notification Undo, separate from editor history.
- Undo/redo of script edits is not permanent version history or a guarantee for every metadata operation.

## Task 1: Verify and write

**Files:** `apps/docs/src/content/docs/editor/review/{index,find,replace,comment,threads,comments-view,history}.md` and required SVGs in `apps/docs/public/icons/editor/`.

- [x] Verify active search, replace, comment composers, navigation/filtering and history handlers.
- [x] Write six independent guides around Alex's revised line and its editing note.
- [x] Check conditions, focus-dependent shortcuts and scopes against current source.

## Task 2: Integrate and verify

**Files:** `apps/docs/src/navigation/sections.ts`, `apps/docs/README.md`, relevant cross-links, approved proposal and this record.

- [x] Add the flat sidebar group and contextual links, update article inventory and icon provenance.
- [x] Run `moon run docs:lint docs:typecheck docs:build`, validate generated links/fragments/assets, and run scoped `git diff --check`.
- [x] Request independent content review, resolve findings, and run `graphify update .` after navigation changes.

## Verification record

Ověřeno 13. října 2026 po obnovení přerušené práce:

- Při obnovení již existoval rozcestník, všech šest článků, jedenáct ikon, navigace i aktualizovaný inventář. Pracovní strom byl čistý; hotový obsah byl uložen v uživatelském commitu `b6fd94cc`. Tyto operace se neopakovaly.
- Doplněno vykreslení kláves ve třech zbývajících formulacích v Replace text a Reply and resolve comments. Kontrola článků nenalezla další neformátované názvy kláves.
- `moon run docs:lint docs:typecheck docs:build`: všechny tři úlohy prošly, včetně opakování po obsahovém upřesnění z nezávislé kontroly. Astro check: 0 chyb, varování i doporučení. Build: 52 stránek a vyhledávací index Pagefind. Existující varování o konfliktu vlastní route `/404` zůstává beze změny.
- Kontrola generovaného HTML: 6 027 interních odkazů a odkazů na soubory, 552 fragmentů; žádný chybějící cíl, obrázek ani kotva.
- Scoped `git diff --check`: bez chyb.
- `graphify update .`: exit 0; 8 428 uzlů, 20 713 hran, 435 komunit. Existující upozornění na šest souborů bez uzlů, chybějící SQL parser a velikost HTML vizualizace zůstávají beze změny.
- Nezávislá obsahová kontrola: bez blokujících nálezů. Jedno drobné upřesnění bylo ověřeno v `useEditorComments.ts` a `SceneCollapseExtension.ts` a zapracováno: otevření karty v List samo nerozbalí sbalenou scénu. Kontrola samostatně potvrdila 32 odkazů, čtyři fragmenty a 16 odkazů na ikony v nové kategorii.
- Ověření chování vychází z aktivních zdrojů, včetně skutečně registrovaných obsluh hledání, komentářů a kláves historie. Živý průchod ani vizuální kontrola v prohlížeči neproběhly; sdílený prohlížeč nebyl znovu předán.
- V této navazující práci nebylo změněno chování aplikace ani schéma dokumentu či DB. Nebylo nic staged, commitováno ani nasazeno.
