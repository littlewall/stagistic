# Pilotní dokumentace postav

Schválený návrh: `docs/proposals/editor-documentation-pilot.md`, včetně skupin a potvrzených/nepotvrzených postav. Pracujeme v aktuálním workspace. Bez commitu a publikace; další kategorie zůstávají mimo rozsah.

1. Ověřit zadání mluvčího, oddělovače, odkazy, potvrzení a skupiny v aktuálním kódu a dostupném editoru. Uchovat zdrojové opory a ověřovací záznam zde.
2. Nahradit rozcestník `apps/docs/src/content/docs/editor/characters/index.md` a přidat šest článků: speakers, confirmation, multiple-speakers, groups, references, manage. Anglický obsah, příklady Robin/Alex, krátké samostatné návody.
3. Zpřístupnit články v navigaci `apps/docs/src/navigation/sections.ts` jako samostatnou skupinu bez dalšího vnořování kvůli Lucode mobile drawer. Ostatní kategorie nepřepisovat.
4. Spustit moon docs:lint, docs:typecheck a docs:build; ověřit vygenerované interní odkazy, mobilní navigaci a přímo dosažitelné články v náhledu. Aktualizovat graphify po změně navigace.

## Záznam ověření

Hotovo: rozcestník a šest anglických článků; samostatná plochá skupina Characters v navigaci. Ostatní kategorie nebyly naplněny.

Zdrojové opory:

- `scriptBlock/handlers/textInput.ts` a jeho testy: `+` a `/` jsou rovnocenné vstupy, `+` se převádí na `/`; oddělovač uvnitř závorek zůstává textem.
- `scriptBlock/handlers/enter.ts`: pokračování podle nastavení dalšího bloku, výchozí character → dialogue.
- `components/characterSuggestions/model/applyCharacterSuggestion.ts`: náhrada jména u kurzoru a zachování ostatních mluvčích.
- `components/characterSuggestions/useCharacterSuggestions.ts` a `characterTagInput/*`: výběr návrhu je nutné následně dokončit přes Enter/Tab; Escape odstraní rozpracovaný odkaz.
- `packages/ui/src/editor-panels/{EditorSidebar,CharacterRowPending,CharacterRowConfirmed,CharacterGroupRow}.tsx`: stavy, názvy ovládacích prvků a vstupy do správce.
- `packages/ui/src/dialogs/attribute-manager/{AttributeManagerCharacterDetail,AttributeManagerGroupDetail,CreateGroupModal,RemoveCharacterModal,RemoveGroupModal}.tsx` a `useCharacterActions.ts`: editace, členství a důsledky odstranění.

Průchod skutečným editorem na novém lokálním originu `localhost:5180`, v testovacím scénáři Documentation pilot:

- Změna typu bloku přes menu na Character, zadání `Robin+Alex` → `ROBIN/ALEX`, Enter → Dialogue.
- Potvrzení obou jmen přes Confirm, otevření správce postav.
- Vytvoření ENSEMBLE, přidání Robin a Alex v Members, zmizení označení Empty v sidebaru.
- `@Robin`, Tab, pokračování běžným textem `opens the door.` ve stejném bloku.
- Escape při zadávání nového odkazu odstranil rozpracované jméno.
- Přejmenování potvrzeného Robina na Robin Hart aktualizovalo mluvčího i odkaz ve scénické poznámce.

Omezení ověření: výběr návrhu `@` a všechny varianty editace/odstranění nejsou samostatně ověřeny v prohlížeči; popis je opřen o aktuální implementaci a nezávislou kontrolu. Testovací origin má vlastní místní data; skutečné uživatelské scénáře nebyly upravovány.

Kontroly: moon docs:lint, docs:typecheck, docs:build a root:format-check pro sections.ts prošly. Sestavení obsahuje 19 stránek. Kontrola HTML našla 713 funkčních interních odkazů a 115 platných kotev. Známé upozornění Starlight na kolizi generování /404 zůstává beze změny.

Mobilní náhled při 390 px nemá vodorovný přesah; otevřený drawer obsahuje Overview a všech šest článků. Syntax má jen svůj globální přepínač, její články do Editor sidebaru nevstupují.

Nezávislá kontrola zachytila chybějící dokončení po výběru návrhu v článku references; krok byl opraven a znovu sestaven. Další blokující nálezy nebyly. Graphify byl aktualizován po změně navigace. Bez commitu a nasazení.
