# Getting started documentation Implementation Plan

**Spec:** `docs/proposals/editor-documentation-getting-started.md`, approved 14 October 2026.

**Goal:** Replace the existing placeholder with the approved first-scene walkthrough on `/editor/getting-started/`.

**Scope:** One English article, existing route and sidebar position, established white keycaps, literal code and thin control icons. Update inventory and relevant cross-links. No application behavior, dependencies, document/DB schema, staging, commits or deployment.

**Execution:** Inline in the existing shared workspace; one independent content review after writing. Low-impact documentation changes use the docs toolchain and generated-link checks, without implementation-mirroring tests.

## Task 1: Verify and write

- [x] Verify new One-act initialization, default Scene/Stage direction/Character/Dialogue flow and active workspace/sidebar controls.
- [x] Write the complete first-scene walkthrough, including new-name state and local save/portable-file purposes.
- [x] Update the approved proposal, inventory and contextual links; preserve navigation and unrelated research files.

## Task 2: Verify the result

- [x] Run `moon run docs:lint docs:typecheck docs:build` and check generated internal links, fragments, icons and key presentation.
- [x] Request one independent source-based content review and resolve concrete findings.
- [x] Run scoped `git diff --check`, refresh the knowledge graph and finish this verification record.

## Decisions and verification record

- One-act creates one empty Scene node. The guide explicitly selects and names it, without promising a particular initial cursor position.
- Default next-element settings advance Scene → Stage direction → Character → Dialogue → Character at the end of nonempty blocks. Empty blocks and modified settings are linked to their existing guides.
- Sidebar opening controls use custom inline PanelIcon paths. Two thin assets show their closed state; the article explains that the live icon fills its selected side when open. Settings and home assets are reused.
- The browser remains human-owned until a new handoff. Source verification is recorded without claiming live UI, browser-test or visual checks.
- Ověřeno 14. října 2026: finální `moon run docs:lint docs:typecheck docs:build` — všechny tři úlohy prošly. Astro check: 0 chyb, varování a doporučení. Build: 60 stránek a vyhledávací index Pagefind. Existující varování o konfliktu vlastní route `/404` zůstává beze změny.
- První běh typecheck/build skončil chybou práce se soubory Astro (`UnknownFilesystemError`). Při opakování se nereprodukovala; následné běhy prošly bez změn toolchainu. Konkrétní příčina prvního selhání není potvrzená.
- Kontrola generovaného HTML: 7 969 interních odkazů a odkazů na soubory, 671 fragmentů, bez chybějících cílů, ikon nebo kotev. Kontrola kláves našla pouze sloveso Enter v pokynu k vyplnění Script name; nejde o název klávesy. Všechny skutečné výskyty kláves jsou v `kbd`.
- Nezávislá obsahová kontrola: bez blokujících nálezů. Potvrdila počáteční Scene, aktivní výchozí flow, velká písmena, nepotvrzená jména, přepínače sidebarů a původ ikon. Samostatně ověřila 25 odkazů, jeden fragment a pět odkazů na ikony.
- Scoped `git diff --check`: bez chyb.
- `graphify update .`: exit 0; 8 537 uzlů, 20 809 hran, 433 komunit. Existující upozornění na šest souborů bez uzlů, chybějící SQL parser a velikost HTML vizualizace zůstávají beze změny.
- Route i sidebar zůstaly na původním místě. Unrelated `docs/research/` bylo zachováno. Ověření chování je podle aktivních zdrojů; živý průchod, browser testy ani vizuální kontrola neproběhly. Nic nebylo staged, commitováno ani nasazeno a chování aplikace ani schéma dokumentu či DB se nezměnilo.
