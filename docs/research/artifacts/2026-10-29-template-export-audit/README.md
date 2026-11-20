# Reprodukce auditu 2026-10-29

Tyto zdroje pouze zaznamenávají současné chování. Jejich úspěšný běh neznamená,
že chování aplikace je správné. Nejsou součástí běžné testovací sady.

Z kořene repozitáře, pokud cílové dočasné soubory již neexistují:

```sh
mkdir -p /tmp/stagistic-template-audit
cp docs/research/artifacts/2026-10-29-template-export-audit/export-probe.ts.txt packages/export/src/test/templateAudit.audit.test.ts
moon run export:test -- src/test/templateAudit.audit.test.ts
cp docs/research/artifacts/2026-10-29-template-export-audit/editor-probe.tsx.txt packages/editor/src/editor/templateSpacing.audit.browser.test.tsx
moon run editor:test-browser -- src/editor/templateSpacing.audit.browser.test.tsx
```

Exportní probe zapisuje `observations.json` a `filter-observations.json` do
`/tmp/stagistic-template-audit/`. Browser probe vypisuje `EDITOR_SPACING_AUDIT`
do stdout. Plná tabulka zachycená při auditu je součástí
[uložených výsledků](../../2026-10-29-template-export-audit-results.json).
Souhrn v tomto souboru navíc obsahuje odvozené kontroly výsledných pozic scén;
ty vznikly z pořadí `assembly.steps`, nikoli z nové implementace plánovače.

Po zaznamenání výsledků odstraňte pouze uvedené dočasné kopie:

```sh
rm packages/export/src/test/templateAudit.audit.test.ts
rm packages/editor/src/editor/templateSpacing.audit.browser.test.tsx
```

Primární PDF byla stažena z odkazů v hlavním auditu a kontrolována pomocí
`pdfinfo` a `pdftoppm -f 1 -singlefile -scale-to 1100 -png`. Jejich kopie
nejsou přidávány do repozitáře.
