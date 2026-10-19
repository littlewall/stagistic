# Music and lyrics documentation Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Preserve the shared workspace; do not stage or commit.

**Goal:** Finish the approved category overview and seven music task guides.

**Architecture:** Markdown under `/editor/music/`, an immediate-link sidebar group, shared keycaps and static editor icons. No application behavior changes.

**Tech Stack:** Astro, Starlight, Lucode, Markdown, SVG, moon checks.

**Spec:** `docs/proposals/editor-documentation-music-and-lyrics.md`, approved 12 October 2026.

## Global Constraints

- English user-facing articles; Czech proposal and verification notes.
- Code for literal input, titles, filenames and prefixes; semantic white keycaps and actual icon-only controls.
- Document current UI only. Internal hit support has no user-facing mode setter in the current pill; explain imported point accents without inventing a creation command.
- The shared browser remains with the human after its previous interruption; source verification must be described accurately.
- Preserve unrelated edits and staging. No commits, deployment or schema changes.

## Review Focus

- Active `#` draft-pill entry, exact unassigned matches, suggestion selection, Add music dialog and cancellation must be distinguished from the dormant compose branch.
- Ending after a block, derived ends and drag restrictions must match implementation; no unsupported start dragging or hit conversion.
- Music does not automatically change Dialogue to Lyrics. Lyrics, Aside and speaker transitions follow actual block flow.
- Unassign preserves the catalog item and PDF; Delete removes its markers and catalog entry while preserving prose.
- Current attachments provide one Integrated score PDF slot; saving a PDF is separate from printing it.

## Task 1: Verify and write

**Files:** `apps/docs/src/content/docs/editor/music/{index,add,range,lyrics,navigate,manage,score,remove}.md` and required static icons under `apps/docs/public/icons/editor/`.

- [x] Inspect controls, active draft-pill/range operations, timeline derivation, deletion and PDF handling.
- [x] Write seven independent task guides using the approved Robin/Alex example.
- [x] Check conditional controls, exact effects and unsupported operations against source.

## Task 2: Integrate and verify

**Files:** `apps/docs/src/navigation/sections.ts`, `apps/docs/README.md`, relevant Writing your script links, approved proposal and this record.

- [x] Add the flat Music and lyrics sidebar group and contextual cross-links.
- [x] Update article inventory and icon provenance.
- [x] Run `moon run docs:lint docs:typecheck docs:build`; validate generated internal links, fragments and icon paths; run scoped `git diff --check`.
- [x] Request independent review, resolve findings and run `graphify update .` after navigation changes.

## Verification record

Ověřeno 12. 10. 2026:

- Závěrečné `moon run docs:lint docs:typecheck docs:build` po obsahových opravách prošlo. Astro check bez chyb, varování a hints; build vytvořil 46 stránek.
- Kontrola finálního HTML: 4756 místních odkazů a zdrojů, 470 fragmentů, bez neplatných cílů.
- Nezávislá kontrola nalezla dvě důležité a dvě drobné nepřesnosti; všechny byly opravené a opakovaná kontrola upravených postupů nemá blokující nálezy.
- `git diff --check` pro změny dokumentace prošel.
- `graphify update .` prošel: 8369 uzlů, 20662 hran, 424 komunit. Stávající omezení parseru SQL/JSON a velikosti HTML vizualizace zůstala beze změny.
- Přidány dva SVG se skutečnými cestami NavArrowRight a LinkSlash z aktuálního iconoir-react, oba s stroke-width 1.5 a uvedeným původem v README.
- Bez změn funkčnosti aplikace, schématu, stagingu, commitu a nasazení. Nové jednotkové testy pro text nebyly přidány.

## Opravy po nezávislé kontrole

Původní podklad nesprávně přenesl starší compose větev na současné UI. Aktivní `MusicInputExtension` vytváří draft MusicStartPill a fokusuje Music title; `MusicPill` přes blur volá `musicPillCreation`. Proto `#out` zadává název `out` a není ukončovacím příkazem. Neplatný postup i odkaz byly odstraněny. Stávající `musicCompose.browser.test.tsx` výslovně očekává založení hudby pojmenované `out`.

Po výběru nebo vytvoření čtenář výslovně klikne do prózy před pill. Prázdný draft se zruší, Escape jej odstraní a Cancel v dialogu odstraní nový draft. Opuštění neprázdného draft pole dokončuje zadávání místo zrušení.

Přetažení konce vyžaduje krátké podržení před pohybem; způsobilé cíle se zobrazí při aktivaci. Reset music end je nabídnutý jen tam, kde další blok umožňuje návrat k delšímu automatickému úseku: nikoli na konci dokumentu, před Scene/Act či před dalším otevřeným hudebním začátkem.

Ukončovací zkratka je ověřena samostatně přes `useEditorExtensions` → `MusicCommandsExtension.addProseMirrorPlugins` → `musicBoundaryPlugin.handleKeyDown`. Shift + Command/Ctrl + O funguje v próze mimo hudební title pole a při dostupném předchozím hudebním začátku. Článek uvádí obě platformy se sémantickými klávesami.

## Ověřené hranice

- Hudební nabídka přebírá Unassigned položky, nebo otevře Add music pro nový název. Dialog má Music title, správce metadat má Name.
- Hudební konce jsou explicitní nebo odvozené. Přesun konce je po startu, v téže scéně a nejpozději u dalšího otevřeného startu; Scene/Act nejsou cíle. Přesun počátečního úchytu není slibován.
- Interní bodové akcenty se vysvětlují na importovaném obsahu. Aktuální pill nemá ovládání pro vytvoření akcentu nebo přepnutí režimu.
- Číslování se odvozuje ze scény a počtu startů: samostatně například `2)`, při více `2.A)` a `2.B)`.
- Lyrics/Dialogue/Aside jsou nezávislé na hudebním rozsahu i typu Song/Instrumental. Uvedeny výchozí přechody i vliv vlastního flow.
- Unassign zachovává položku a PDF; Delete odstraňuje položku i případné značky z dokumentu při zachování prózy. Článek neslibuje fyzické smazání každého osiřelého blobu při Delete, pouze ztrátu přiřazení partitury k odstraněné položce.
- Integrated score je jeden PDF slot s Upload PDF, Replace PDF, náhledem přes název souboru a potvrzením Remove. Tisk i zálohy se odkazují na odpovídající kategorie.

Ověření je podle aktivních zdrojů a relevantních existujících testových očekávání. Živý průchod editorem, vizuální kontrola nových článků, nové přetažení ani nahrání PDF nebyly provedeny. Sdílený prohlížeč zůstal po předchozím lidském převzetí nedotčený.
