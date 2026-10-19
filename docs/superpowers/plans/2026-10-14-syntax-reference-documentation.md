# Syntax reference documentation Implementation Plan

**Spec:** `docs/proposals/syntax-documentation-structure.md`, approved 14 October 2026 with audience clarification: implementers and text-only-editor enthusiasts. Package transfer is outside this reference; one brief boundary link is enough.

**Goal:** Complete the Syntax overview, seven reference chapters, full example and marker lookup in the existing docs app.

**Scope:** English technical Markdown and flat navigation; existing palette/layout. No parser/serializer behavior, schema, dependencies, staging, commits or deployment. LP shortening follows this wave.

**Execution:** Inline source verification and writing, then one independent technical review. Exercise examples through the real parser/serializer; use the docs toolchain and generated output for the website checks. Preserve the shared workspace.

## Task 1: Verify rules and examples

- [x] Verify classification order, speech state, headings, cue forms, character references, formatting/literals, frontmatter and music resolution.
- [x] Exercise examples and edge cases through current parser/serializer; record semantic results and any limits without changing application code.

## Task 2: Write and integrate

- [x] Write Syntax overview, `reference/{index,frontmatter,structure,speech,directions,music,text}.md`, `examples/index.md` and `markers/index.md`.
- [x] Update flat navigation, article inventory and relevant links; keep package details in Editor docs.
- [x] Update approved proposal and verification record with actual scope and refinements.

## Task 3: Verify the result

- [x] Run `moon run docs:lint docs:typecheck docs:build`; validate generated local links, fragments and assets.
- [x] Request one independent technical review and resolve concrete findings.
- [x] Run scoped `git diff --check`, refresh the graph and finish the record.

## Decisions and verification record

- Syntax source examples are code, not keyboard instructions. No new keycap/icon components are needed.
- Describe an implementable text model and reference-reader behavior, rather than the editor's private node schema or an invented public SDK.
- Current reader/writer limitations must be explicit where they affect interpretation. Do not promise universal semantic or byte-for-byte round trips.
- Shared browser remains human-owned until a new handoff. No live/browser/visual verification is claimed.
- Ruling: retain the implementer/plain-text audience clarification — package handling receives only one boundary link to Editor documentation, without a package chapter or application walkthrough.
- Ověřeno 14. října 2026: 22 publikovaných `text` code fences bylo načteno přímo z Markdown a spuštěno aktuálním `parseStagistic`. Výsledné pořadí typů bylo porovnáno s ručně sestavenými očekáváními pro každou ukázku; žádná neshoda.
- Další runtime kontrola parseru/serializace: 19 sémantických tvrzení a 15 případů očekávané chyby, všechny prošly. Pokrývají titul, credits, pevné datum, reference, tabulátor, společné cue, otevřenou hudbu, samostatný Hit, doložené limity exportu, null YAML/credits a chybové případy. Zahrnují i nynější odmítnutí uvozovaného uppercase cue s dvojtečkou; neoznačujeme je za obecně neplatný záměr formátu.
- Úplný příklad `When Night Falls` produkuje 18 bloků. Jeho pořadí typů, otevřený hudební režim a pevné datum se zachovaly po serializaci a novém čtení. Exportní datum bylo při probes fixované na 14. října 2026; nejde o garanci pro všechny možné vstupy.
- Nezávislá technická kontrola našla jedno důležité a dvě drobná upřesnění: rozpoznání dvojtečky uvnitř uvozovaného cue, null v metadatech a zastaralé formulace README. Vše bylo ověřeno proti aktivnímu zdroji a zapracováno. Kontrola prvního návrhu samostatně potvrdila 61 odkazů a 27 fragmentů; žádný nález nezůstal nevyřešený.
- První paralelní běh Astro build/typecheck kolidoval při rename společného `apps/docs/node_modules/.astro/data-store.json.tmp` (ENOENT). Finální `moon run docs:lint docs:typecheck docs:build --concurrency 1` prošel ve všech třech úlohách bez úprav toolchainu. Astro check: 0 chyb, varování a doporučení. Build: 68 stránek a index Pagefind. Existující upozornění na vlastní route `/404` zůstává beze změny.
- Finální generované HTML: 8 411 interních odkazů a odkazů na soubory, 785 fragmentů, žádný chybějící cíl, asset nebo kotva.
- Scoped `git diff --check`: bez chyb.
- `graphify update .`: exit 0; 8 598 uzlů, 20 860 hran, 444 komunit. Existující upozornění na šest souborů bez uzlů, chybějící SQL parser a velikost HTML vizualizace zůstávají beze změny.
- Nedošlo ke změně parseru, serializace, dokumentového/DB schématu ani původní LP stránky. Nic nebylo staged, commitováno ani nasazeno. Browser testy a živá/vizuální kontrola neproběhly; publikované příklady byly skutečně spuštěné parserem/serializací.
