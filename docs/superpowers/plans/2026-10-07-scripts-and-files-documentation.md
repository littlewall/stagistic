# Scripts and files documentation Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Preserve the shared workspace; do not stage or commit.

**Goal:** Finish the approved category overview and seven task guides.

**Architecture:** Markdown articles under `/editor/scripts/`, one flat sidebar group and the existing icon/keycap presentation. No application behavior changes.

**Tech Stack:** Astro, Starlight, Lucode, Markdown, static SVG assets, moon checks.

**Spec:** `docs/proposals/editor-documentation-scripts-and-files.md`, approved 7 October 2026.

## Global Constraints

- English user-facing guides; Czech proposal and verification record.
- Literal user input and extensions in code; semantic keycaps and actual icon-only controls.
- Distinguish local saving, duplication, portable backup, new-copy import and replacement.
- Do not take over the shared browser after its previous human interruption without a new handoff.
- No staging, commits, deployment, schema changes or edits to app behavior.

## Review Focus

- Both creation shapes and conditional example/search controls match the current home screen.
- Duplicate switches and title-page behavior must describe actual copied data.
- Saved indicates local persistence; it must not imply cloud sync or a downloaded backup.
- `.stagistic` and `.stepkg` preserve different data; importing the former always creates a new script.
- Package replacement restores a snapshot, rather than merging changes, and identifies scripts by package identity.

## Task 1: Verify and write

**Files:** `apps/docs/src/content/docs/editor/scripts/{index,create,find,copies,saving,download,import,delete}.md` and required icons under `apps/docs/public/icons/editor/`.

- [x] Inspect actual controls, repository operations, import/export mappings and relevant existing tests.
- [x] Write seven standalone task guides around the shared script example.
- [x] Source-check copied data, saving scope, package identity and destructive confirmations.

## Task 2: Integrate and validate

**Files:** `apps/docs/src/navigation/sections.ts`, `apps/docs/README.md`, relevant Getting started links, approved proposal and this record.

- [x] Add the flat sidebar group and links from related introductions.
- [x] Update article inventory and icon provenance.
- [x] Run `moon run docs:lint docs:typecheck docs:build`, validate generated links/fragments/assets, and run scoped `git diff --check`.
- [x] Request independent content review, resolve findings and run `graphify update .` after navigation changes.

## Verification record

Ověřeno 7. 10. 2026:

- `moon run docs:lint docs:typecheck docs:build`: všechny tři úlohy prošly; Astro check bez chyb, varování a hints. Sestavení obsahuje 39 stránek.
- Kontrola HTML: 3457 místních odkazů a zdrojů, 366 fragmentů, bez neplatných cílů.
- Nezávislá obsahová kontrola: bez blokujících nálezů; 54 odkazů, šest fragmentů a sedm výskytů ikon nové kategorie mají platné cíle. Ověřeny rozdíly duplikace a balíčku, rozsah místního ukládání a postup při chybě uložení.
- Opraven drobný nález: import může chybu ukázat také v toastu, proto návod říká přečíst chybovou zprávu aplikace, nikoli pouze zprávu v dialogu.
- Po opravě znovu prošel `moon run docs:build` (39 stránek). Závěrečný scoped `git diff --check` prošel.
- SVG pro Home, Download a MoreHoriz byly převzaty z aktuálního `iconoir-react` použitého komponentami UI, se zdokumentovaným původem a stroke-width 1.5.
- `graphify update .` prošel: 8303 uzlů, 20605 hran, 415 komunit. Stávající omezení parseru SQL/JSON a velikosti HTML vizualizace zůstala beze změny.
- Bez změn funkčnosti aplikace, schématu, stagingu, commitu a nasazení. Nové jednotkové testy pro samotný text nebyly přidány.

Postupy jsou ověřeny podle implementace a existujících testových zdrojů. Nový živý průchod editorem, stahování a obnova zkušebního balíčku ani vizuální kontrola stránek nebyly provedeny: sdílený prohlížeč zůstal po předchozím lidském převzetí nedotčený.

Důležité ověřené skutečnosti:

- Home nabízí příklad jen v načtené prázdné knihovně; vyhledávání a řazení od pěti scénářů. Newest first používá updatedAt, hledání název i podtitul.
- One-act zakládá Scene bez Act; Multi-act začíná Act a Scene. Prázdný pracovní název dostává Untitled script.
- Rename mění Title i Subtitle používané titulní stranou. Duplikace vždy kopíruje obsah, volitelně settings a potvrzené postavy/skupiny; původní podtitul, údaje titulní strany, hudební přílohy a komentáře se nekopírují.
- Webový repository používá místní databázi a IndexedDB pro přílohy. Indikátor Saved je krátkodobý; saving se ukazuje u delšího uložení a error při neúspěchu.
- `.stagistic` se serializuje z aktuálního editoru a podporovaných údajů titulní strany. `.stepkg` před přípravou provádí flush a zahrnuje snapshot metadat, příloh a komentářů.
- Rozpoznání existujícího scénáře při importu používá ID v balíčku. Nová kopie přemapuje identity; nahrazení obnovuje snapshot bez slučování. Záloha před nahrazením je samostatná volba, ne automatická podmínka tlačítka.
- Nahrazení vyžaduje `replace me`, odstranění `delete me`. Články popisují účinek a ukazují skutečné popisky ovládání.
