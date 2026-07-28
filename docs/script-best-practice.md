# Script Editor — Best Practices & Design Decisions

> Specifikace chování muzikálového script editoru. Editor drží sémantiku,
> sazbu řeší export.

## 0. Základní principy

1. **Jeden obsah, mnoho views** — Outline, Music, Edit a exporty jsou pohledy
   nad jednou datovou strukturou.
2. **Sémantika v editoru, sazba v exportu** — dekorace nesmí měnit tok textu.
3. **Computed číslo, stabilní `id`** — čísla scén, hudebních položek a stránek
   se počítají; odkazy drží stabilní identita.
4. **Warningy, ne tvrdé bloky** — konvence nesmí blokovat kreativní psaní;
   výjimkou je porušení integrity dat.

## 1. Struktura dokumentu

- Hierarchie **Akt → Scéna** je nadřazená číslování i formátování.
- Nová scéna začíná v exportu na nové straně.
- Hudba nikdy nepřesahuje hranici scény. Scéna je tvrdá hranice intervalu i
  číslování.
- Automatické stránkování používá formát **Akt–Scéna–strana**.

## 2. Sémantické bloky

- **Stage direction** se formátuje podle pozice ve scéně.
- **Aside** je sémanticky vázaný k replice.
- **Lyrics** podporují úrovně zanoření přes `Tab` / `Shift+Tab`.
- **Character cue** je jméno postavy před replikou; tento divadelní termín
  zůstává a není součástí hudební domény.
- Postavu lze ve stage direction označit přes `@`.

## 3. Music systém

### 3.1 Účel

`Music` je záznam pro herce a režiséry: píseň, muzikálové číslo nebo
instrumentální/podkresová hudba. Není to pokyn pro zvukaře.

Budoucí light, sound a FX cues jsou jiná doména. Budou mít vlastní datový model
a samostatný view mimo editor scénáře.

### 3.2 Datový model

| Vlastnost | Význam |
|---|---|
| `id` | stabilní identita |
| `kind` | `song` \| `instrumental` |
| `mode` | `open` (interval) \| `hit` (okamžik) |
| `startBlockId` | blok s `musicStart` |
| `endBlockId` | blok s explicitním `musicOut`; u hitu startovní blok |
| `sceneNumber` | computed číslo scény |
| `indexInScene` | computed pořadí hudby ve scéně |

- Otevřená hudba končí explicitním `musicOut`, dalším otevřeným `musicStart`
  nebo koncem scény.
- Otevřené hudební intervaly se nepřekrývají ani nevnořují.
- `hit` je bod a neuzavírá právě otevřenou hudbu.
- Stage direction obsahuje nejvýše jeden hudební marker.

### 3.3 Syntaxe

- Start: `@@music N "title"`
- Konec: `@@out N`
- `@@out` zůstává: dvojité `@` ho jednoznačně váže k hudební syntaxi a „out“
  je zavedený divadelní výraz.
- Staré `@@cue` není podporované.

## 4. Interakce v editoru

- `#` ve stage direction otevře picker pro vytvoření nebo výběr hudby.
- Start i out se vykreslují jako inline atomické pills na konci bloku.
- Titulek lze upravit přímo v pillu.
- Menu umožňuje přepnout `open` ↔ `hit`, přejít na druhý konec intervalu,
  otevřít Music manager a hudbu odstranit.
- Backspace/Delete vedle pillu hudební marker nesmaže; odstranění je explicitní
  akce z menu.
- Přesun nebo rozdělení bloku nesmí marker oddělit od jeho bloku.

## 5. Číslování a zobrazení

- Jediná hudební položka ve scéně má číslo scény (`3.`).
- Více položek dostává písmena (`3.A`, `3.B`, …).
- Out zobrazuje číslo a titul hudby, kterou uzavírá.
- Číslo je vždy odvozené z pořadí dokumentu; `id` se nemění.
- Music sidebar rozlišuje přiřazené a nepřiřazené položky.

## 6. Persistence a přílohy

- Dokument je source of truth pro umístění `musicStart` / `musicOut`.
- `script_music` je relační projekce a katalog hudby.
- `script_music_attachments` váže PDF přílohy přes `music_id`.
- Přejmenování názvu nebo typu je optimistické; neúspěch se vrátí na potvrzený
  stav.
- Odpojení hudby od dokumentu nemaže katalogovou položku ani její přílohy.

## 7. Export

- Hudební pills se přepisují jako tučné číslo + titul; out jako odvozený out
  label.
- Editorové dekorace nesmí měnit šířku ani výšku řádku proti exportu.
- Musical Numbers lze generovat z Music katalogu a dokumentové projekce.

## 8. Hraniční stavy

- Smazání `musicStart` odstraní přiřazení a jeho explicitní out.
- Smazání `musicOut` vrátí otevřenou hudbu na implicitní konec.
- Smazání scény odstraní její dokumentové markery; katalogová pravidla se řeší
  explicitní uživatelskou akcí.
- Vložení hudby doprostřed řady pouze přepočítá čísla; stabilní `id` zůstávají.
- Copy/paste nesmí vytvořit druhý marker se stejným `musicId`.
- Orphan `musicOut` nevytváří relační řádek.

## 9. Odložené

- Samostatné production cue views pro Lights, Sound a FX.
- Skladatelský sync view nad hudbou a připojenými partiturami.
- Pokročilé skupiny/reprízy a více současných hudebních zdrojů.
