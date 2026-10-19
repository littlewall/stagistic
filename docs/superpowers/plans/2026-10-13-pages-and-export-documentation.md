# Pages and export documentation Implementation Plan

**Spec:** `docs/proposals/editor-documentation-pages-and-export.md`, approved 13 October 2026.

**Goal:** Write the approved overview and eight independent task guides, then integrate and verify them.

**Scope:** English Markdown in `apps/docs/src/content/docs/editor/export/`; existing flat navigation, white keycaps and actual thin SVG controls. No application behavior, schema, deployment, staging or commits.

**Execution:** Inline, preserving the existing shared workspace. Use the executing-plans workflow for continuous work and one independent content review at the end. Content/navigation changes are checked with the docs toolchain and generated output, without implementation-mirroring tests.

## Task 1: Verify and write

- [x] Verify active export/settings entrypoints and persisted document settings versus temporary export choices.
- [x] Verify filtered dialogue/groups, pagination, initial pages, title/header/footer data, integrated score placement and preview/download states.
- [x] Write `index.md`, `pdf.md`, `layout.md`, `title-page.md`, `headers-footers.md`, `initial-pages.md`, `characters.md`, `page-breaks.md` and `integrated-score.md` with contextual conditions and related tasks.
- [x] Add only required thin icons copied from actual registered controls.

## Task 2: Integrate and verify

- [x] Add the flat sidebar group, article inventory, icon provenance and relevant cross-links.
- [x] Run `moon run docs:lint docs:typecheck docs:build`; check generated links, fragments/assets and scoped `git diff --check`.
- [x] Request one independent source-based content review and resolve concrete findings.
- [x] Refresh the graph after navigation changes; update the approved proposal and this verification record.

## Decisions and verification record

- Preserve existing uncommitted Finding and reviewing refinements. They are outside this category.
- Shared browser remains human-owned until a new handoff. No live UI or visual verification is claimed.
- Before writing, derive claims from active handlers and export plans rather than labels or unused settings alone.
- Ruling: the approved example becomes Alex's complete scenes rather than only Alex's replies — `filterByCharacter.ts` retains scene groups, including other speakers. This reflects the existing application behavior; no filtering behavior was changed.
- Ověřeno 13. října 2026: `moon run docs:lint docs:typecheck docs:build` — všechny tři úlohy prošly, včetně opakování po obsahových upřesněních z nezávislé kontroly; Astro check 0 chyb, varování a doporučení; build 60 stránek a index Pagefind. Existující varování o konfliktu vlastní route `/404` zůstává beze změny.
- Finální kontrola generovaného HTML: 7 946 interních odkazů a odkazů na soubory, 658 fragmentů, bez chybějících cílů, ikon nebo kotev. Kontrola názvů kláves v nových článcích nenašla neformátované výskyty.
- Scoped `git diff --check`: bez chyb.
- `graphify update .`: exit 0; 8 494 uzlů, 20 769 hran, 414 komunit. Existující upozornění na šest souborů bez uzlů, chybějící SQL parser a velikost HTML vizualizace zůstávají beze změny.
- Nezávislá obsahová kontrola ověřila 59 odkazů, šest fragmentů a osm odkazů na ikony nové kategorie. Dvě důležitá upřesnění byla porovnána s aktivním zdrojem a zapracována: zachované reference nejsou zárukou ponechání celých vynechaných stran; vložení not vyžaduje zahrnutí bloku s koncem hudebního úseku. Ostatní popsané chování odpovídá zdrojům. Kontroly po změnách prošly; žádný nález nezůstal nevyřešený.
- Ruling: preserved pagination means original references and text positions within retained pages — `transcribeExportPlan.ts:238–244` omits wholly excluded normal pages after assigning reference numbers. Partly empty pages and inserted alignment blanks can remain.
- Ruling: score inclusion requires the range's ending block in the output — `planIntegratedAssembly.ts:55–59` skips an ending without an output page. The guide explains Show notes and character-selection remedies without changing export behavior.
- Ověření chování vychází z aktivních zdrojů. Živý průchod ani vizuální kontrola v prohlížeči neproběhly. Nic nebylo staged, commitováno ani nasazeno; chování aplikace ani schéma dokumentu či DB se nezměnilo.
