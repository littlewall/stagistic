# Database Architecture

Kompletní databázová struktura Stagistic po rewrite.

**ORM:** Drizzle ORM
**Dialect:** PostgreSQL
**Runtime:** PGlite (Postgres v WASM) — web i desktop
**Schema:** `packages/db/src/schema.ts`
**Queries:** `packages/db/src/queries/`
**Migrations:** `packages/db/drizzle/`

---

## ER Diagram (textový)

```
scripts
  │
  ├──< script_blocks >──┐
  │      │               │
  │      ├──< script_block_character_refs >──< script_characters
  │      │                                        │
  │      ├──< script_block_annotations (budoucí)  ├──< script_character_genders
  │      │                                        │
  │      ├── scene_id ──> script_scenes           │
  │      │                    │                   │
  │      └── act_id ──> script_acts               │
  │                                               │
  ├──< script_scenes ──< script_locations         │
  │                                               │
  ├──< script_acts                                │
  │                                               │
  ├──< script_characters ─────────────────────────┘
  │
  ├──< script_configs
  │      │
  │      └──< script_config_blocks
  │
  └──< sync_outbox
```

Legenda: `──<` = one-to-many (FK), `──>` = FK reference direction

---

## Tabulky

### scripts

Hlavní tabulka projektů (scénářů).

| Sloupec | Typ | Constraints | Popis |
|---------|-----|-------------|-------|
| `id` | text | PK | UUIDv7 |
| `title` | text | NOT NULL | Název scénáře |
| `created_at` | bigint | NOT NULL | Unix timestamp (ms) |
| `updated_at` | bigint | NOT NULL | Unix timestamp (ms) |

> **Změna oproti stávajícímu stavu:** Odstraněn sloupec `active_block_id` (přesunut do client-only TanStack Store — ephemeral UI state, nepersistuje se).

---

### script_blocks

**Core tabulka rewritu.** Každý blok scriptu = jeden řádek. Nahrazuje `script_latest.content_json` (JSON blob).

| Sloupec | Typ | Constraints | Popis |
|---------|-----|-------------|-------|
| `id` | text | PK | UUIDv7 |
| `script_id` | text | FK → `scripts.id` CASCADE, NOT NULL | |
| `block_type` | text | NOT NULL | Viz enum hodnoty níže |
| `order_no` | integer | NOT NULL | Globální pořadí v rámci scriptu |
| `text_content` | text | NOT NULL, default `''` | Plain text obsahu bloku (pro search, statistiky, sidebar) |
| `content_json` | text | nullable | TipTap inline content JSON s marks. `null` pokud blok nemá žádné marks. Viz [Content JSON Format](#content-json-format) |
| `scene_id` | text | FK → `script_scenes.id` SET NULL, nullable | Scéna, do které blok patří |
| `act_id` | text | FK → `script_acts.id` SET NULL, nullable | Akt, do kterého blok patří |
| `column_group_id` | text | nullable | ID skupiny sloupců (pro dual dialogue) |
| `column_index` | integer | nullable | Index sloupce v rámci skupiny (0, 1) |
| `created_at` | bigint | NOT NULL | |
| `updated_at` | bigint | NOT NULL | |

**Indexy:**
- `UNIQUE (script_id, order_no)` — zajišťuje unikátní pořadí
- `(script_id, block_type)` — query per typ
- `(script_id, scene_id)` — query per scéna
- `(script_id, act_id)` — query per akt

**Block type enum hodnoty:**

| Hodnota | Popis | TipTap Node name |
|---------|-------|-------------------|
| `scene_heading` | Hlavička scény (INT./EXT.) | `sceneHeading` |
| `act` | Nadpis aktu | `act` |
| `action` | Akce / popis | `action` |
| `character` | Jméno postavy (cue) | `character` |
| `dual_dialogue_character` | Jméno postavy v dual dialogue | `dualDialogueCharacter` |
| `parenthetical` | Herecká poznámka v závorce | `parenthetical` |
| `dialogue` | Dialog | `dialogue` |
| `transition` | Přechod (CUT TO:) | `transition` |
| `lyrics` | Text písně | `lyrics` |
| `note` | Poznámka ke scénáři | `note` |

---

### Content JSON Format

Pole `content_json` obsahuje TipTap inline content ve formátu:

```json
[
  { "type": "text", "text": "Hello " },
  { "type": "text", "text": "world", "marks": [{ "type": "bold" }] },
  { "type": "text", "text": " — this is ", "marks": [{ "type": "italic" }] },
  { "type": "text", "text": "important", "marks": [{ "type": "bold" }, { "type": "italic" }] }
]
```

**Aktuální mark typy:**
- `bold`, `italic`, `underline`

**Budoucí mark typy (viz D10):**
- `comment` — `attrs: { commentId: string }`
- `cue` — `attrs: { cueId: string, cueType: string }`
- `highlight` — `attrs: { color: string, label?: string }`
- `directionNote` — `attrs: { noteId: string }`

Marks s `attrs` obsahujícím ID odkazují do `script_block_annotations` tabulky (budoucí) pro rich payloady.

Pokud blok nemá žádné marks (jen plain text), `content_json` je `null` a content se rekonstruuje z `text_content`.

---

### script_scenes

Metadata scén. Propojená s `script_blocks` přes `heading_block_id`.

| Sloupec | Typ | Constraints | Popis |
|---------|-----|-------------|-------|
| `id` | text | PK | UUIDv7 |
| `script_id` | text | FK → `scripts.id` CASCADE, NOT NULL | |
| `heading_block_id` | text | FK → `script_blocks.id` SET NULL, nullable | Blok scene_heading, který definuje tuto scénu |
| `scene_number` | text | nullable | Číslo scény (user-defined, nemusí být číslo) |
| `color_hex` | text | nullable | Barva scény pro vizuální odlišení |
| `synopsis` | text | nullable | Shrnutí scény |
| `location_id` | text | FK → `script_locations.id` SET NULL, nullable | Lokace scény |
| `created_at` | bigint | NOT NULL | |
| `updated_at` | bigint | NOT NULL | |

---

### script_acts

Metadata aktů.

| Sloupec | Typ | Constraints | Popis |
|---------|-----|-------------|-------|
| `id` | text | PK | UUIDv7 |
| `script_id` | text | FK → `scripts.id` CASCADE, NOT NULL | |
| `heading_block_id` | text | FK → `script_blocks.id` SET NULL, nullable | Blok act, který definuje tento akt |
| `name` | text | NOT NULL | Název aktu |
| `created_at` | bigint | NOT NULL | |
| `updated_at` | bigint | NOT NULL | |

---

### script_locations

Registry lokací v rámci scénáře.

| Sloupec | Typ | Constraints | Popis |
|---------|-----|-------------|-------|
| `id` | text | PK | UUIDv7 |
| `script_id` | text | FK → `scripts.id` CASCADE, NOT NULL | |
| `name` | text | NOT NULL | Název lokace |
| `description` | text | nullable | Popis lokace |
| `created_at` | bigint | NOT NULL | |
| `updated_at` | bigint | NOT NULL | |

**Indexy:**
- `UNIQUE (script_id, name)` — každá lokace je unikátní v rámci scriptu

---

### script_characters

Registry postav. **Rozšíření oproti stávajícímu stavu.**

| Sloupec | Typ | Constraints | Popis |
|---------|-----|-------------|-------|
| `id` | text | PK | UUIDv7 |
| `script_id` | text | FK → `scripts.id` CASCADE, NOT NULL | |
| `character_key` | text | NOT NULL | Normalizované jméno (uppercase, bez parentheticals) |
| `color_hex` | text | nullable | Barva postavy pro vizuální odlišení |
| `gender_key` | text | nullable | Klíč pohlaví (FK logicky → genders) |
| `notes` | text | nullable | **Nové.** Poznámky k postavě |
| `backstory` | text | nullable | **Nové.** Backstory postavy |
| `created_at` | bigint | NOT NULL | |
| `updated_at` | bigint | NOT NULL | |

**Indexy:**
- `UNIQUE (script_id, character_key)`

---

### script_block_character_refs

Vazba blok ↔ postava. Nahrazuje JSON atribut `characterRefs` na node.

| Sloupec | Typ | Constraints | Popis |
|---------|-----|-------------|-------|
| `block_id` | text | FK → `script_blocks.id` CASCADE, NOT NULL | |
| `character_id` | text | FK → `script_characters.id` CASCADE, NOT NULL | |
| `character_key` | text | NOT NULL | Normalizované jméno (pro lookup) |
| `is_confirmed` | boolean | NOT NULL, default `false` | Potvrzená vazba (user explicitně propojil) |

**PK:** `(block_id, character_key)`

**Indexy:**
- `(character_id)` — lookup všech bloků jedné postavy

---

### script_character_genders

Vlastní definice pohlaví per script. **Beze změn.**

| Sloupec | Typ | Constraints | Popis |
|---------|-----|-------------|-------|
| `id` | text | PK | |
| `script_id` | text | FK → `scripts.id` CASCADE | |
| `gender_key` | text | NOT NULL | |
| `gender_label` | text | NOT NULL | |
| `created_at` | bigint | NOT NULL | |
| `updated_at` | bigint | NOT NULL | |

**Indexy:**
- `UNIQUE (script_id, gender_key)`

---

### script_configs

Konfigurace editoru per script per namespace. **Beze změn.**

| Sloupec | Typ | Constraints | Popis |
|---------|-----|-------------|-------|
| `id` | text | PK | |
| `script_id` | text | FK → `scripts.id` CASCADE | |
| `namespace` | text | NOT NULL | |
| `payload_json` | text | | |
| `created_at` | bigint | NOT NULL | |
| `updated_at` | bigint | NOT NULL | |
| `schema_version` | integer | default 1 | |

**Indexy:**
- `UNIQUE (script_id, namespace)`

---

### script_config_blocks

Formátování per blok typ v rámci konfigurace. **Beze změn.**

| Sloupec | Typ | Constraints | Popis |
|---------|-----|-------------|-------|
| `id` | text | PK | |
| `config_id` | text | FK → `script_configs.id` CASCADE | |
| `block_type` | text | NOT NULL | |
| `spacing_before_millis` | integer | | |
| `line_height_millis` | integer | | |
| `indent_left_chars` | integer | | |
| `indent_right_chars` | integer | | |
| `shortcut` | text | | |
| `next_element` | text | | |
| `text_align` | text | | |
| `casing` | text | | |
| `is_bold` | boolean | | |
| `is_italic` | boolean | | |
| `is_underline` | boolean | | |
| `created_at` | bigint | NOT NULL | |
| `updated_at` | bigint | NOT NULL | |

**Indexy:**
- `UNIQUE (config_id, block_type)`

---

### sync_outbox

Outbox pro budoucí cloud sync. **Beze změn, zatím disabled.**

| Sloupec | Typ | Constraints | Popis |
|---------|-----|-------------|-------|
| `id` | text | PK | |
| `script_id` | text | nullable | |
| `op_type` | text | | Operace: `block.upsert`, `block.delete`, `scene.upsert`, ... |
| `payload_json` | text | | |
| `created_at` | bigint | nullable | |
| `status` | text | default `'pending'` | `pending`, `sent`, `failed` |

---

## Tabulky k odstranění (po migraci dat)

| Tabulka | Důvod odstranění |
|---------|------------------|
| `script_latest` | Nahrazena `script_blocks` (normalizovaná struktura) |
| `script_versions` | Nahrazena budoucím `script_scene_versions` (per scéna) |
| `script_block_index_meta` | Nepotřeba — bloky jsou přímo v DB, ne derivované z JSON |
| `script_block_index_rows` | Nepotřeba — `script_blocks` JE index |

---

## Budoucí tabulky (pouze návrh — neimplementovat teď)

### script_layers

Vrstvy pro produkční anotace. Každé oddělení (lighting, sound, choreography, direction, acting, ...) pracuje ve vlastní vrstvě. (Viz D14)

| Sloupec | Typ | Constraints | Popis |
|---------|-----|-------------|-------|
| `id` | text | PK | UUIDv7 |
| `script_id` | text | FK → `scripts.id` CASCADE, NOT NULL | |
| `name` | text | NOT NULL | "Lighting Cues", "Director's Notes", "Actor: Jan", ... |
| `layer_type` | text | NOT NULL | `cue_sheet`, `notes`, `annotations`, ... |
| `department` | text | NOT NULL | `lighting`, `sound`, `choreography`, `direction`, `acting`, `stage_management`, ... |
| `color_hex` | text | nullable | Barva pro vizuální odlišení v editoru |
| `is_visible` | boolean | NOT NULL, default `true` | Default viditelnost pro nové pohledy |
| `order_no` | integer | NOT NULL | Pořadí vrstev v UI |
| `created_by` | text | nullable | User ID (budoucí FK → users) |
| `created_at` | bigint | NOT NULL | |
| `updated_at` | bigint | NOT NULL | |

**Indexy:**
- `(script_id, department)`
- `UNIQUE (script_id, name)`

---

### script_block_annotations

Produkční inline anotace provázané s pozicemi v blocích. Renderují se jako ProseMirror Decorations (NE marks v content_json). Patří do vrstvy (layer). Viz D10 revised, D14.

| Sloupec | Typ | Constraints | Popis |
|---------|-----|-------------|-------|
| `id` | text | PK | UUIDv7 |
| `block_id` | text | FK → `script_blocks.id` CASCADE, NOT NULL | |
| `layer_id` | text | FK → `script_layers.id` CASCADE, NOT NULL | Vrstva, do které anotace patří |
| `annotation_type` | text | NOT NULL | `comment`, `cue_light`, `cue_sound`, `cue_choreography`, `direction_note`, `blocking_note`, `highlight`, ... |
| `start_offset` | integer | nullable | Pozice začátku v rámci bloku (character offset). Null = anotace na celý blok |
| `end_offset` | integer | nullable | Pozice konce. Null = anotace na celý blok |
| `anchor_text` | text | nullable | Okolní text pro fallback re-anchoring (pokud se offsety posunou při editaci) |
| `payload_json` | text | NOT NULL | Type-specific data (viz příklady níže) |
| `status` | text | NOT NULL, default `'active'` | `active`, `orphaned` (text smazán), `resolved` (pro komentáře) |
| `created_by` | text | nullable | User ID (budoucí FK → users) |
| `created_at` | bigint | NOT NULL | |
| `updated_at` | bigint | NOT NULL | |

**Indexy:**
- `(block_id, annotation_type)` — lookup anotací bloku per typ
- `(layer_id)` — lookup všech anotací vrstvy
- `(block_id, layer_id)` — efektivní filtr: "co vidím na tomto bloku v tomto view"
- `(status)` — filtr orphaned anotací pro maintenance

**Offset maintenance:**
Při editaci textu bloku Block Sync Engine přemapuje `start_offset`/`end_offset` přes ProseMirror `tr.mapping.map(pos)`. Pokud text pod anotací kompletně smazán, status se změní na `orphaned` a user rozhodne (smazat / re-anchor).

**Příklady payload_json:**

Comment:
```json
{
  "thread": [
    { "authorId": "user_123", "text": "Tady by měla být pauza", "createdAt": 1740000000000 },
    { "authorId": "user_456", "text": "Souhlasím", "createdAt": 1740000001000 }
  ]
}
```

Cue (light):
```json
{
  "cueNumber": "LX 42",
  "timing": "on word",
  "description": "Fade to blue wash",
  "duration": 3.0,
  "intensity": 80
}
```

Cue (sound):
```json
{
  "cueNumber": "SFX 12",
  "soundFile": "thunder_roll.wav",
  "timing": "on word",
  "volume": 0.7,
  "fadeIn": 1.5
}
```

Direction note:
```json
{
  "text": "Herec se otočí k publiku, chvíle ticha před replikou",
  "priority": "high"
}
```

Choreography note:
```json
{
  "text": "8 dob: krok-krok-otáčka-skok, formace trojúhelník",
  "musicBar": 32,
  "formation": "triangle"
}
```

---

### script_views

Pohledy — definují, co uživatel vidí a může editovat. (Viz D15)

| Sloupec | Typ | Constraints | Popis |
|---------|-----|-------------|-------|
| `id` | text | PK | UUIDv7 |
| `script_id` | text | FK → `scripts.id` CASCADE, NOT NULL | |
| `name` | text | NOT NULL | "Director's View", "Actor: Jan", "SM Cue Sheet" |
| `role_template` | text | nullable | `writer`, `director`, `stage_manager`, `actor`, `lighting_designer`, `sound_designer`, `choreographer`, `custom` |
| `config_json` | text | NOT NULL | View configuration JSON (viz docs/decisions.md D15) |
| `created_by` | text | nullable | User ID |
| `created_at` | bigint | NOT NULL | |
| `updated_at` | bigint | NOT NULL | |

---

### script_props

Rekvizity s vazbou na scény.

| Sloupec | Typ | Constraints | Popis |
|---------|-----|-------------|-------|
| `id` | text | PK | UUIDv7 |
| `script_id` | text | FK → `scripts.id` CASCADE, NOT NULL | |
| `name` | text | NOT NULL | Název rekvizity |
| `description` | text | nullable | Popis |
| `category` | text | nullable | `hand_prop`, `set_piece`, `furniture`, `consumable`, ... |
| `created_at` | bigint | NOT NULL | |
| `updated_at` | bigint | NOT NULL | |

**Vazba na scény:** junction tabulka `script_scene_props(scene_id FK, prop_id FK, notes text)`.

---

### script_costumes

Kostýmy s vazbou na postavy a scény.

| Sloupec | Typ | Constraints | Popis |
|---------|-----|-------------|-------|
| `id` | text | PK | UUIDv7 |
| `script_id` | text | FK → `scripts.id` CASCADE, NOT NULL | |
| `character_id` | text | FK → `script_characters.id` CASCADE, NOT NULL | |
| `name` | text | NOT NULL | Název kostýmu / look |
| `description` | text | nullable | |
| `created_at` | bigint | NOT NULL | |
| `updated_at` | bigint | NOT NULL | |

**Vazba na scény:** junction tabulka `script_scene_costumes(scene_id FK, costume_id FK, quick_change boolean)`.

---

### script_cue_sheets

Seřazené cue listy per oddělení — agregace z anotací.

| Sloupec | Typ | Constraints | Popis |
|---------|-----|-------------|-------|
| `id` | text | PK | UUIDv7 |
| `script_id` | text | FK → `scripts.id` CASCADE, NOT NULL | |
| `layer_id` | text | FK → `script_layers.id` CASCADE, NOT NULL | |
| `name` | text | NOT NULL | "LX Cue Sheet", "SFX Cue Sheet" |
| `cue_order_json` | text | NOT NULL | Seřazený list `[{ annotationId, cueNumber, sceneId }]` |
| `created_at` | bigint | NOT NULL | |
| `updated_at` | bigint | NOT NULL | |

---

### script_scene_versions

User-initiated snapshoty scén.

| Sloupec | Typ | Constraints | Popis |
|---------|-----|-------------|-------|
| `id` | text | PK | UUIDv7 |
| `scene_id` | text | FK → `script_scenes.id` CASCADE | |
| `message` | text | nullable | Uživatelský popis verze |
| `blocks_json` | text | NOT NULL | JSON array bloků scény v momentě snapshotu |
| `created_at` | bigint | NOT NULL | |

---

## Query moduly

Všechny query funkce v `packages/db/src/queries/`:

### blocks/

| Funkce | Popis |
|--------|-------|
| `listByScript(scriptId, opts?)` | Všechny bloky scriptu, seřazené dle `order_no`. Opts: filtr per `block_type`, `scene_id`, `act_id` |
| `listByScene(sceneId)` | Bloky jedné scény |
| `listByAct(actId)` | Bloky jednoho aktu |
| `getById(id)` | Jeden blok |
| `bulkUpsert(blocks[])` | Batch insert/update bloků (pro sync z editoru) |
| `bulkDelete(ids[])` | Batch delete bloků |
| `reorder(scriptId, moves[])` | Přečíslování `order_no` po přesunu |

### scenes/

| Funkce | Popis |
|--------|-------|
| `listByScript(scriptId)` | Všechny scény scriptu |
| `upsert(scene)` | Vytvořit nebo aktualizovat scénu |
| `delete(sceneId)` | Smazat scénu (bloky zůstávají, `scene_id` se nulluje) |
| `updateMetadata(sceneId, data)` | Update color_hex, synopsis, location_id |

### acts/

| Funkce | Popis |
|--------|-------|
| `listByScript(scriptId)` | Všechny akty scriptu |
| `upsert(act)` | Vytvořit nebo aktualizovat akt |
| `delete(actId)` | Smazat akt (bloky zůstávají, `act_id` se nulluje) |

### locations/

| Funkce | Popis |
|--------|-------|
| `listByScript(scriptId)` | Všechny lokace scriptu |
| `upsert(location)` | Vytvořit nebo aktualizovat lokaci |
| `delete(locationId)` | Smazat lokaci |

### blockCharacterRefs/

| Funkce | Popis |
|--------|-------|
| `listByBlock(blockId)` | Refs jednoho bloku |
| `listByScript(scriptId)` | Všechny refs scriptu (JOIN přes blocks) |
| `listByCharacter(characterId)` | Všechny bloky odkazující na postavu |
| `replaceForBlock(blockId, refs[])` | Nahradit refs bloku (delete + insert) |
| `deleteByCharacter(characterId)` | Odebrat postavu ze všech bloků |

### characters/ (rozšířit existující)

Existující funkce zachovány, přidány:
| Funkce | Popis |
|--------|-------|
| `updateNotes(characterId, notes)` | **Nové.** Update poznámek |
| `updateBackstory(characterId, backstory)` | **Nové.** Update backstory |

### Zachované beze změn:

- `scripts/crud.ts`
- `scripts/config.ts`
- `characters/genders.ts`
- `scripts/outbox.ts`

---

## Migrace

### Nová migrace: `0006_normalize_blocks.sql`

1. Vytvořit tabulky: `script_blocks`, `script_scenes`, `script_acts`, `script_locations`, `script_block_character_refs`
2. Přidat sloupce do `script_characters`: `notes`, `backstory`
3. Odebrat sloupec `active_block_id` z `scripts`

### Data migrace: `packages/db/scripts/migrate-json-to-blocks.ts`

Jednorázový script:
1. Načíst všechny řádky z `script_latest`
2. Parsovat `content_json` → TipTap JSON nodes
3. Pro každý node: insert do `script_blocks` (extrakce `text_content`, `content_json`, `block_type`, `order_no`)
4. Vytvořit `script_scenes` z `scene_heading` bloků
5. Vytvořit `script_acts` z `act` bloků
6. Extrahovat `characterRefs` atributy → insert do `script_block_character_refs`
7. Validovat: query zpět, rebuild document, porovnat s originálem

### Budoucí migrace: `0007_drop_legacy_tables.sql`

Po ověření dat:
1. DROP `script_latest`
2. DROP `script_versions`
3. DROP `script_block_index_meta`
4. DROP `script_block_index_rows`

---

## Konvence

- **ID format:** UUIDv7 (time-sortable) generované přes `@stagistic/shared` utility
- **Timestamps:** Unix milliseconds jako `bigint` (konzistentní s existujícím kódem)
- **Foreign keys:** Text, ne UUID typ (Drizzle + PGlite kompatibilita)
- **Cascade behavior:** `ON DELETE CASCADE` pro parent→child (script→blocks, block→refs). `ON DELETE SET NULL` pro optional refs (block→scene, scene→location).
- **Naming:** snake_case pro tabulky a sloupce, `script_` prefix pro všechny tabulky
