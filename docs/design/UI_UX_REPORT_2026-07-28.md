# Stagistic — generální UI/UX audit

**Datum:** 28. 7. 2026  
**Režim:** redesign · preserve  
**Rozsah:** home, vytvoření/import scénáře, editor, sidebary, attribute manager, settings, export, dark mode, landing page a syntax reference.

## Executive summary

Stagistic už má vlastní rozpoznatelný vizuální jazyk. „The Dark Stage“, dvě typografické voice a důraz na script canvas fungují. Core editor působí jako nástroj pro psaní, ne jako generický SaaS dashboard. Landing page je ještě výraznější a patří k nejlepším částem produktu.

Největší problém není estetika, ale **pravdivost a úplnost rozhraní**:

- vedle hlavní home existuje starší `/script/list` s jiným layoutem;
- landing CTA `Open in browser` nikam nevede;
- account menu nabízí `Account settings` a `Sign out`, ale aplikace jim nepředává žádnou akci;
- marketing popisuje několik schopností, které nejsou v produktu dohledatelné;
- klíčové accessibility kontrakty jsou neúplné: editor nemá accessible name, settings dialog nemá focus trap, focus states jsou na více místech potlačené a light-mode placeholder má přibližně jen 2.0:1 kontrast.

### Celkové skóre: 7.2 / 10 — dobrý a výrazný základ, před release potřebuje konsolidační průchod

| Dimenze | Skóre | Shrnutí |
|---|---:|---|
| Philosophy alignment | 8.4 | Core editor i landing věrně podporují „script is the center“. |
| Visual hierarchy | 7.7 | Editor, landing a syntax jsou čitelné; settings a home zbytečně fragmentují pozornost. |
| Craft quality | 7.1 | Silné tokeny a flat surfaces, ale drift dokumentace, focus states a několik rogue hodnot. |
| Functionality | 5.9 | Dead actions, duplicitní route, nepravdivé sliby a keyboard/a11y mezery. |
| Originality | 8.1 | Prompt-book/editorial charakter je vlastní a vyhýbá se generickému AI/SaaS vzhledu. |

### Skóre podle povrchu

| Povrch | Skóre | Stav |
|---|---:|---|
| Landing page | 8.4 | Silná značka a kompozice; zásadní problém jsou dead CTA a copy accuracy. |
| Syntax reference | 8.1 | Výborný editorial dokument; na úzkém viewportu chybí náhrada za skryté TOC. |
| Core editor | 7.8 | Canvas je správně dominantní; first-use stav je příliš prázdný a a11y role chybí. |
| Attribute manager | 7.4 | Dobrá informační architektura; některé empty states jsou duplicitní. |
| Home | 7.0 | Čistá, ale stejný scénář se opakuje v `Continue writing` a `All scripts`. |
| Export | 6.8 | Logické skupiny, ale prázdný preview stav nic nevysvětluje a panel je na menší šířce těsný. |
| Settings | 6.1 | Funkčně bohaté, ale navigace, casing, responsive layout a modal semantics potřebují sjednotit. |
| `/script/list` | 4.0 | Starší paralelní UI, které by nemělo zůstat jako veřejná route. |

## Design read

```yaml
artifact: desktop-first writing tool + editorial landing
audience: playwrights and librettists working in long focused sessions
visual-language: restrained prompt-book editorial tool
mode: redesign-preserve
visual-variance: 3 app / 6 landing
motion-intensity: 3
information-density: 7 app / 4 landing
asset-dependence: 2 app / 4 landing
brand-fidelity: 9
```

## Co zachovat

1. **„The Dark Stage“ jako north star.** Metafora je užitečná a v produktu skutečně viditelná: canvas je spotlight, okolí ustupuje.
2. **Two-Voice system.** IBM Plex Sans pro nástroj a Courier Prime pro text/strukturu scénáře dává produktu okamžitou identitu.
3. **Flat-by-default.** Tonální vrstvy místo card/shadow sprawl fungují; zejména editor, attribute manager a landing nepůsobí jako dashboard.
4. **OKLCH semantic tokens.** Základ je technicky i vizuálně silný a dark mode je velmi dobrý.
5. **Landing composition.** Hero s reálným script excerptem, lineární feature list a FAQ bez card gridu přesně odpovídají anti-referencím.
6. **Destructive confirmation.** Delete flow s explicitním `delete me` je jasný, klidný a bezpečný.

## Fixes podle priority

### 1. Odstranit dead actions a paralelní informační architekturu — Critical

**Aktuálně**

- Obě CTA `Open in browser` mají `href="#"`: [index.astro](../../apps/landing/src/pages/index.astro#L128), [index.astro](../../apps/landing/src/pages/index.astro#L274).
- Account menu vždy zobrazuje `Account settings` a `Sign out`: [AccountMenu.tsx](../../packages/ui/src/layout/header/AccountMenu.tsx#L47), ale běžný header nedostává `onMenuAction`: [AppHeader.tsx](../../packages/app-routes/src/layout/AppHeader.tsx#L14).
- Route `/script/list` je stále veřejná: [App.tsx](../../apps/web/src/App.tsx#L80). Má vlastní hero/card layout a interactive card s vnořenými tlačítky: [ScriptListRoute.tsx](../../packages/app-routes/src/routes/script/ScriptListRoute.tsx#L30).

**Proč**

Dead affordance ničí důvěru rychleji než nedostupná funkce. Dvě knihovny scénářů navíc vytvářejí nejasnou IA a starší route vizuálně porušuje nový home register.

**Doporučení**

- Napojit obě CTA na reálnou web app URL; do té doby použít text `Web app coming in alpha` bez link affordance.
- Skrýt account položky, pokud nemají handler. Theme switch může existovat samostatně jako `Appearance`.
- `/script/list` změnit na redirect na `/` a následně route i komponentu odstranit.
- Nikdy nedávat `role="button"` na card, která obsahuje další tlačítka. Primární název scénáře může být samostatný link; akce zůstanou siblings.

### 2. Uzavřít accessibility kontrakty editoru a modalů — Critical

**Aktuálně**

- Hlavní `contenteditable` má jen `tabindex="0"`; chybí `role="textbox"`, `aria-multiline` a accessible name. `EditorContent` atributy nedoplňuje: [EditorCanvas.tsx](../../packages/editor/src/editor/components/EditorCanvas.tsx#L57).
- Settings modal ručně implementuje jen `Escape`; nemá focus trap, initial focus ani restore focus a background zůstává v accessibility tree: [ScriptSettingsModal.tsx](../../packages/ui/src/dialogs/ScriptSettingsModal.tsx#L27).
- Drop zone vytváří focusable `DropZone` a uvnitř další `Button`, takže accessibility tree obsahuje dva buttony pro jednu akci: [ImportDropZone.tsx](../../packages/ui/src/dialogs/importScript/ImportDropZone.tsx#L18).
- Header a view switcher explicitně odstraňují focus ring bez stejně silné náhrady: [AppHeader.module.css](../../packages/ui/src/layout/AppHeader.module.css#L80), [ViewSwitcher.module.css](../../packages/ui/src/layout/header/ViewSwitcher.module.css#L21).
- Input focus používá pouze velmi jemnou změnu borderu: [Input.module.css](../../packages/ui/src/atoms/Input.module.css#L19). Light placeholder (`muted` při 60% opacity na surface) vychází přibližně na **2.0:1**.

**Proč**

Editor je hlavní plocha produktu; pokud screen reader neví, že jde o víceřádkový script editor, je nedostupná samotná core task. U modalů hrozí tabbing do zakrytého editoru. Nízký kontrast placeholderů a nejasný focus zvyšují chybovost i bez screen readeru.

**Doporučení**

- Editor: `role="textbox"`, `aria-multiline="true"`, `aria-label="Script editor"` a stručná `aria-describedby` nápověda ke shortcutům.
- Settings postavit na stejném React Aria modal/dialog základu jako ostatní dialogy.
- Drop zone má být jeden focus target; file trigger patří dovnitř obsahově, ne jako druhé nested button affordance.
- Definovat jeden globální focus contract: `2px solid var(--color-focus-ring)`, offset `2px`; na tmavém pozadí případně doplnit surface halo.
- Light placeholder nepoužívat přes opacity; vytvořit explicitní placeholder token s minimálně 4.5:1.
- Přidat axe/browser test pro home, editor, settings, attribute manager a export.

### 3. Srovnat marketingové sliby s reálným produktem — Critical

**Aktuálně**

Landing tvrdí:

- reprise relationships a score pacing;
- stage time a vyhledání všech replik postavy;
- live dramatis personae s `scene count`;
- running-time estimates;
- opt-in cloud sync.

Relevantní copy je v [index.astro](../../apps/landing/src/pages/index.astro#L13), [index.astro](../../apps/landing/src/pages/index.astro#L23), [index.astro](../../apps/landing/src/pages/index.astro#L28) a FAQ v [index.astro](../../apps/landing/src/pages/index.astro#L49). V codebase jsou dohledatelné některé podklady pro characters/first appearance a export, ne však celý popsaný rozsah.

Současně landing říká `No account needed`, ale app globálně ukazuje account avatar a `Sign out`.

**Proč**

Pro alpha produkt je přesnost copy součást UX. Uživatel si vytvoří mentální model ještě před otevřením editoru; falešně široký slib pak každý chybějící panel mění v pocit rozbité funkce.

**Doporučení**

- Každý feature claim označit jako `Available`, `Alpha` nebo `Planned`, interně i v copy review.
- Dočasně popsat jen to, co lze dokončit v aktuálním flow: structured acts/scenes, script blocks, characters, music markers/attachments, formatting/settings a PDF export.
- `No account needed` zachovat, ale account UI do doby skutečné identity přejmenovat na `Appearance` nebo skrýt.
- Přidat na landing GitHub link; open-source claim bez odkazu je zbytečně slabý.

### 4. Aktualizovat design system podle skutečných tokenů — Important

**Aktuálně**

`DESIGN.md` popisuje:

- Working Amber `oklch(.762 .098 53.1)`;
- Note Blue hue `239`;
- neutrals na hue `51`;
- jeden accent.

Implementace ale používá Coolors paletu:

- copper hue `62.72`;
- lavender hue `277.48`;
- paper hue `80.72`;
- umber a aubergine;

viz [tokens.css](../../packages/ui/styles/tokens.css#L81) a [global.css](../../apps/landing/src/styles/global.css#L7). Selection/focus surfaces jsou nyní lavender mix, CTA/progress/music používají copper. Vizuálně to funguje, ale není to systém popsaný v dokumentaci.

**Doporučení**

Aktuální implementaci bych **nevracel**. Copper + lavender dává Stagisticu větší osobitost a landing page na této paletě funguje velmi dobře. Aktualizovat pravidla:

- **Copper = action / progress / music.**
- **Lavender = selection / focus / utility.**
- Neutrály aplikace zůstanou hue-cohesive; landing smí používat paper/umber jako brand register.
- „One Accent Rule“ změnit na **Two Semantic Accents Rule**; barvy se nesmějí zaměňovat dekorativně.
- Sjednotit default scale (`1.08` v tokenu vs `1.1` ve `.size-md`) a doplnit tokeny pro touch target, placeholder a focus halo.

### 5. Zjednodušit home a posílit první minutu v editoru — Important

**Aktuálně**

Home model vloží každý scénář editovaný za posledních 7 dní do `Continue writing` a zároveň znovu do `All scripts`: [homeDashboardModel.ts](../../packages/app-routes/src/routes/home/homeDashboardModel.ts#L39). U jednoho scénáře tak obrazovka ukazuje dva identické řádky.

Nový editor se otevře s `ACT ONE` a téměř prázdnou stránkou. Placeholder extension sice přidá `data-placeholder="Start writing your script"`: [PlaceholderExtension.ts](../../packages/editor/src/editor/tiptap/extensions/PlaceholderExtension.ts#L16), ale pro atribut není v editor CSS renderovací pravidlo. Toolbar současně hlásí `Select block in editor`.

**Proč**

Home začíná připomínat dashboard, který `PRODUCT.md` odmítá. V editoru je zase profesional discretion zaměněná za absenci orientace: první klik není zřejmý a core task nezačíná okamžitě.

**Doporučení**

- Defaultně jedna sekce `Scripts`, sort `Recently edited`. Search a sort ponechat.
- Pokud knihovna překročí např. 12 položek, lze přidat `Recent` se 3 položkami, ale v `All scripts` je neopakovat.
- Po vytvoření scénáře autofocusnout první scene block.
- Renderovat tichý placeholder `Start writing…`; po prvním vstupu zmizí.
- Disabled block selector nahradit neutrálním textem až mimo empty-first-run, nebo při autofocusu rovnou ukázat `Scene`.
- Export empty state změnit z `No preview` na `Add script content to generate a PDF preview.` a vypnout download, dokud není exportovatelný obsah.

### 6. Sjednotit responsive kontrakt a overlay placement — Important

**Aktuálně**

Rozhraní používá breakpointy `720`, `900`, `1024` a `1100` px. `DESIGN.md` přitom zmiňuje sidebar collapse při `≤1024px`. V auditovaném viewportu 606×696:

- settings modal skládá 240px vysokou navigaci nad obsah a vytváří dva vertikální scroll kontexty;
- editor sidebar zabere přibližně polovinu viewportu;
- selector panelu se může otevřít mimo pravý okraj viewportu;
- export je rozdělen na 320px control pane a zbytek preview, který už nemá dost prostoru.

**Doporučení**

- Dokumentovat tři explicitní režimy, ne náhodné breakpointy:
  - `wide ≥ 1200`: oba sidebary in-flow;
  - `compact 800–1199`: sidebary jako drawers;
  - `narrow < 800`: vždy maximálně jeden drawer, settings/export jako single-pane flow.
- Popovery používat s viewport collision/flip logikou.
- Na narrow settings zobrazit selector aktuální sekce + `Back to settings`, ne současně celou navigaci i panel.
- Na narrow export přepínat `Options / Preview`, ne držet split view.

Desktop-first může znamenat omezenou mobilní optimalizaci, ale neměl by znamenat clipped nebo neovladatelné overlaye.

### 7. Zavést jednotný content standard — Polish

**Aktuálně**

- Settings kombinuje `Title Page`, `Initial pages`, `Page Layout`, `Visual Preferences`, `Blocks settings`, `Danger zone`: [settingsMenu.ts](../../packages/app-routes/src/routes/script/settings/settingsMenu.ts#L71).
- Empty copy používá `Add a Character block` s neobvyklým capitalized common noun.
- Toast close label je česky v jinak anglické aplikaci: [ToastProvider.tsx](../../packages/ui/src/feedback/ToastProvider.tsx#L58).
- Attribute manager na prázdném Characters panelu opakuje `No confirmed characters` v list i detail části.
- Syntax page na `<860px` úplně skrývá TOC: [syntax.module.css](../../apps/landing/src/pages/syntax.module.css#L456).

**Doporučení**

- UI používat sentence case: `Title page`, `Page layout`, `Visual preferences`, `Block settings`, `Danger zone`.
- Strukturální typy uppercase pouze tam, kde mluví hlas scénáře: `ACT`, `SCENE`; v běžné instrukci `character block`.
- Jazyk aplikace držet 100% English, dokud není připravená skutečná lokalizační vrstva.
- Empty state ve split view: list vysvětlí, že nic neexistuje; detail řekne, co uživatel udělá (`Create a character to edit details here.`).
- Na narrow syntax přidat collapsed `On this page` jump menu.

## Doporučená revize design pravidel

### Zachovat beze změny

- Script is the center.
- Theatrical without theatrics.
- Structure is a first-class feature.
- Compose, don't sprawl.
- Professional discretion.
- Two-Voice typography.
- Flat-by-default elevation.

### Aktualizovat

1. **Accent semantics:** Copper pro action/progress/music, lavender pro selection/focus.
2. **Focus contract:** focus nesmí být pouze jemná změna surface/borderu.
3. **Responsive modes:** wide / compact / narrow s jasnými behaviorálními kontrakty.
4. **Content contract:** sentence case, jedno UI locale, žádné dead actions, žádné `Coming soon` uvnitř primárního flow.
5. **Empty-state contract:** stav musí vysvětlit další krok, ne jen absenci dat.
6. **Interactive nesting:** clickable container nesmí obsahovat další interactive descendants.

### Odstranit

- představu, že `≤5 %` jednoho amber accentu ještě popisuje současný produkt;
- veřejné placeholder panely a account actions bez handleru;
- starší `/script/list`;
- marketingové claimy bez odpovídajícího end-to-end flow.

## Doporučený rollout

### Fáze 1 — release blockers

1. Opravit landing CTA.
2. Skrýt dead account actions.
3. Redirectnout `/script/list`.
4. Srovnat marketing claims s aktuálním feature setem.
5. Doplnit accessible editor role/name.
6. Převést settings na focus-trapped dialog.

### Fáze 2 — core UX consolidation

1. Zjednodušit home na jeden neduplicitní seznam.
2. Opravit first-use autofocus a placeholder.
3. Sjednotit focus/placeholder tokeny.
4. Opravit DropZone semantics.
5. Upravit narrow settings/export a popover collision.

### Fáze 3 — polish a governance

1. Aktualizovat `DESIGN.md`.
2. Udělat copy inventory a sentence-case pass.
3. Přidat accessibility/browser smoke testy.
4. Doplnit narrow syntax TOC.
5. Sloučit rogue CSS hodnoty do tokenů a odstranit fallback hex/rgb hodnoty.

## Tři quick wins

- [ ] `href="#"` nahradit skutečným web app URL a skrýt account položky bez handleru.
- [ ] Změnit toast label na `Dismiss notification` a settings menu na sentence case.
- [ ] Přidat editoru `aria-label="Script editor"` + viditelný `Start writing…` placeholder.

## Audit notes

- Vizuální průchod proběhl v živé lokální aplikaci v light i dark mode.
- Auditovaný browser viewport byl 606×696; wide desktop behavior bylo ověřeno převážně ze skutečných layout pravidel a component source.
- Vytvořený testovací scénář `UI Audit Draft` byl po auditu z lokálního úložiště odstraněn.
- Nebyly měněny produkční komponenty ani design tokeny; výstupem je pouze tento report.
