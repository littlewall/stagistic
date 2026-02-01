# UI/Routes: kandidati na sdilene komponenty

Cil: snizit duplicity ve stylech a markupu v routech, sjednotit spacing, typografii a interakce.

## Pozorovane duplicity
V routech (`packages/app-routes`) se opakuje:
- tlacitka: `primaryButton`, `secondaryButton`, `ghostButton`, `dangerButton`
- typografie: `kicker`, `title`, `subtitle`, `sectionTitle`, `sectionSubtitle`, `sectionHint`
- layout: `page` + `section` + `sectionHeader`
- karty + grid: `card`, `cardHeader`, `cardTitle`, `cardTag`, `cardMeta`, `cardFooter`, `cardGrid`/`grid`
- formulare: `label`, `input`, `actions`
- hero blok + heroCard (Home)

## Navrh noveho systemu (komponenty + styly)

### 1) Primitiva: Button
**Problem**: ve `HomeRoute`, `ScriptListRoute`, `ScriptSettingsRoute` se opakuje stejne CSS pro tlacitka.

**Komponenta**: `Button` (v `packages/ui/src/primitives/Button.tsx`)
- props: `variant = primary | secondary | ghost | danger`, `size = sm | md`, `as = button | a | Link`.
- sjednotit padding, radius, hover, disabled.

### 2) Primitiva: Text styles
**Problem**: opakovany `kicker`, `title`, `subtitle`.

**Komponenty**:
- `Kicker` (uppercase, letter-spacing, muted)
- `PageTitle` / `SectionTitle`
- `SubtleText` / `SectionSubtitle`

Alternativa: utility classes v `@stagistic/ui/styles/typography.css`.

### 3) Layout: PageContainer
**Problem**: `page` wrapper v kazde route ma podobne paddingy a overflow.

**Komponenta**: `PageContainer`
- prop `variant = standard | compact` (rozdil v gap/padding).

### 4) Layout: Section + SectionHeader
**Problem**: `section` a `sectionHeader` se opakuji ve vice routech.

**Komponenty**:
- `Section` (card-like blok s border, radius)
- `SectionHeader` (title + optional actions)

### 5) Card + CardGrid
**Problem**: `card` + `cardGrid` jsou temer identicke mezi Home a ScriptList.

**Komponenty**:
- `Card` (hover, focus, padding)
- `CardHeader` (title + tag)
- `CardMeta`, `CardFooter`
- `CardGrid` (responsive 2-column -> 1-column)

### 6) Form controls
**Problem**: `label`, `input`, `actions` v ScriptSettings.

**Komponenty**:
- `Field` (label + input wrapper)
- `TextInput` (base input styles)
- `FormActions` (row of buttons)

### 7) Hero layout (Home)
**Problem**: `hero` + `heroCard` styl je samostatny, ale muze byt znovu pouzity.

**Komponenty**:
- `Hero` (grid layout)
- `HeroCard` (title/value/hint + CTA button)

### 8) Status Tag
**Problem**: `cardTag` styl se opakuje.

**Komponenta**: `Tag` s variantami (draft, outline, etc.).

## Dopady a benefit
- jednotne spacingy, radius a shadow bez ruznych variant CSS
- rychlejsi tvorba novych obrazovek (skladame z komponent)
- vyrazne mene CSS v routech (redukce v `app-routes`)

## Pripravene k implementaci (priorita)
1) `Button` (nejvyssi dopad, opakuje se nejvic)
2) `Card` + `CardGrid`
3) `PageContainer` + `Section` + `SectionHeader`
4) `Kicker`, `Title`, `Subtitle`
5) `TextInput` + `Field`
6) `Tag`
7) `Hero` / `HeroCard`

## Poznamky k zavedenemu stylu
- Uz existuji tokeny v `@stagistic/ui/styles/base.css` a `tokens.css`.
- Doporučuji pridat UI primitives do `packages/ui/src/primitives/*` a exportovat v `packages/ui/src/index.ts`.

## Update: Text styles (minimalisticke)
Zavedeno do `@stagistic/ui`:
- `Kicker` (uppercase, muted)
- `PageTitle` (H1)
- `SectionTitle` (H2)
- `SubtleText` (muted text)

Zameneno v routech (Home, ScriptList, ScriptSettings) za jednotne text komponenty.

Poznamka:
- `SubtleText` pokryva drivejsi `subtitle`, `sectionSubtitle`, `sectionHint`, `cardMeta`.

## Update: PageContainer
Zavedeno `PageContainer` v `@stagistic/ui` s variantami `standard` a `compact`.
Pouzito v:
- `HomeRoute` (standard)
- `ScriptListRoute` (standard)
- `ScriptSettingsRoute` (compact)

## Update: Section + SectionHeader
Zavedeno `Section` a `SectionHeader` v `@stagistic/ui`.
Pouzito v:
- `HomeRoute` (sekce Recent scripts)
- `ScriptSettingsRoute` (General + Danger zone)

## Update: Grid + Card
Zavedeno:
- `Grid` (obecny layout, `columns` 1/2)
- `Card`, `CardHeader`, `CardContent`, `CardFooter`

Pouzito v:
- `HomeRoute` (recent scripts)
- `ScriptListRoute`

## Update: TextInput + ButtonGroup
Zavedeno:
- `TextInput` (label + description uvnitr)
- `ButtonGroup` (obecny wrapper pro tlacitka)

Pouzito v:
- `ScriptSettingsRoute` (form pro premenovani)

## Update: Hero layout + Card variant
- `HeroLayout` (layout wrapper pro dvousloupcovy hero)
- `Card` dostal variantu `highlight` (pro hero card)

Pouzito v:
- `HomeRoute` (hero blok + hero card)

## Update: Tag
Zavedeno `Tag` v `@stagistic/ui`.
Pouzito v:
- `HomeRoute`
- `ScriptListRoute`

## Update: Atomic design struktura
Komponenty v `@stagistic/ui` jsou presunute do:
- `atoms/` (Button, Tag, Typography)
- `molecules/` (ButtonGroup, Card, forms/TextInput)
- `organisms/` (PageContainer, Section, Grid, HeroLayout)
