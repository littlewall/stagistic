# Další kategorie: Music and lyrics

Stav: členění a společný příklad odsouhlaseny 12. 10. 2026. Rozcestník a sedm článků jsou připravené v `apps/docs/src/content/docs/editor/music/`, s vlastní plochou skupinou sidebaru. Postupy jsou ověřené podle aktuálně používané implementace, nikoli živým průchodem editorem.

## Upřesnění při implementaci

Aktivní zadávání přes `#` vytváří draft hudební pill a používá `MusicPill`, `musicPillCreation` a `MusicDraftSuggestionsOverlay`. Starší větev compose commit v `musicInput/plugin.ts` a `transactions.ts` popisuje jiné chování a není podkladem hotových postupů. `#out` v současném editoru vytváří nebo použije hudbu s názvem `out`; neukončuje úsek. Ukončení je dokumentováno přes nabídky Music actions a Block actions, případně přes Command/Ctrl + Shift + O v próze bloku.

Po dokončení názvu nebo výběru je potřeba kliknout do prózy před pill, než čtenář pokračuje v poznámce. Opuštění neprázdného draft pole provádí dokončení, nikoli zrušení. Přetažení konce vyžaduje krátké podržení před tažením; reset není dostupný na posledním bloku ani těsně před další strukturální hranicí či otevřeným hudebním začátkem.

Interní model umí bodové akcenty z importu, ale současná pill nenabízí jejich vytvoření ani přepnutí režimu. Článek vysvětluje jejich rozpoznání bez neexistujícího postupu. Přílohy mají jeden slot Integrated score pro PDF.

## Co má čtenář zvládnout

Vložit hudbu do scénické poznámky, určit její rozsah a napsat zpívaný text i mluvenou repliku. Najít hudební položku, upravit její údaje, připojit partituru a odlišit odebrání ze scénáře od odstranění z hudebního seznamu.

Rozcestník na `/editor/music/` krátce odliší tři věci: hudební položku v seznamu, její umístění a rozsah ve scénáři, a Lyrics jako typ psaného textu. Toto vysvětlení je potřeba při konkrétním úkolu; nezačneme technickou syntaxí ani seznamem všech značek.

Navrhuji sedm samostatných článků a plochou skupinu sidebaru, stejně jako v dokončených kategoriích.

## Společný příklad

Navážeme na Robina a Alexe ze scénáře `The last door`:

| Situace | Ukázka |
| --- | --- |
| Robin se chystá odejít a začíná píseň | Song s názvem `Time to go` vložená do scénické poznámky |
| Robin zpívá | Lyrics: `The road is calling me.` |
| Poznámka ke zpěvu | Aside: `quietly` |
| Alex do hudby promluví | Dialogue: `Wait for me.` |
| Píseň má skončit na zvoleném místě | Nastavení konce hudebního úseku |
| Zavření dveří doprovodí krátký hudební akcent | Instrumental s názvem `Door sting` u poznámky `Alex closes the door.` |
| Pro zkoušku potřebujeme partituru | PDF `time-to-go-score.pdf` připojené k `Time to go` |

Každý článek použije jen potřebnou část příkladu. Čtenář nemusí vytvořit celý příběh ani dokončit předchozí návody.

## Rozcestník a články

| Článek | Co řeší | URL |
| --- | --- | --- |
| Add music to a stage direction | Ve Stage direction začít přes `#`, najít dosud neumístěnou položku nebo založit novou. Vysvětlit potvrzení zadávání, navazující dialog Add music a pokračování v psaní poznámky. | `/editor/music/add/` |
| Choose where music plays | Určit konec delšího úseku, přesunout jeho koncový bod a vrátit se k odvozenému konci, pokud je reset dostupný. Vysvětlit vztah k hranicím scén i další hudbě a rozpoznání importovaného krátkého akcentu. | `/editor/music/range/` |
| Write lyrics and spoken lines | Zvolit Lyrics, pokračovat zpěvem, vložit Aside a vrátit se k němu. Přepnout na Dialogue pro mluvenou část a znovu na Lyrics; objasnit, že typ textu a probíhající hudba jsou samostatné volby. | `/editor/music/lyrics/` |
| Find music in your script | Použít Music sidebar, rozlišit Assigned a Unassigned, přejít na začátek či účinný konec úseku a orientovat se v hudebním číslování. | `/editor/music/navigate/` |
| Manage musical numbers | Předem založit položku v seznamu, přejmenovat ji a zvolit Song nebo Instrumental. Otevřít správu položky a vysvětlit, co se změní v jejím propojeném umístění. | `/editor/music/manage/` |
| Attach a score PDF | Nahrát partituru do Integrated score, otevřít náhled, nahradit nebo odstranit PDF. Pro tisk s partiturou odkázat do Pages and export a pro přenos souboru do Scripts and files. | `/editor/music/score/` |
| Unassign or delete music | Odebrat umístění hudby a zachovat položku pro nové použití, nebo odstranit položku ze seznamu. Vysvětlit rozsah operací, dopad na značky a přílohy podle implementace a zachování psaného textu. | `/editor/music/remove/` |

Pořadí vede od vložení hudby k jejímu rozsahu a psaní, potom k orientaci a správě. Odebrání bude samostatný poslední článek, protože má jiný účinek než změna konce úseku nebo odstranění PDF.

## Flow článků

Zachováme situace → krátký postup → očekávaný výsledek → relevantní podmínky → navazující úkol.

Add music to a stage direction začne potřebou spustit `Time to go` při Robinově odchodu. Postup ukáže `#` ve Stage direction a nabídku existujících neumístěných položek. Pokud položka neexistuje, vysvětlí následný dialog založení. Výsledek ukáže hudbu umístěnou ve scénáři, nikoli jen záznam v seznamu.

Choose where music plays naváže situací, kdy má hudba doprovázet několik replik a potom skončit. Po běžném úseku vysvětlí rozpoznání krátkého akcentu `Door sting` v importovaném scénáři. Pojmy začátek, konec a krátký akcent vysvětlíme jazykem divadelní práce; technické hodnoty interního modelu nejsou potřeba.

Write lyrics and spoken lines spojí Lyrics a Dialogue v jedné situaci. Vysvětlí skutečný tok kláves a návrat po Aside, ale nebude předpokládat automatickou změnu repliky na zpěv jen kvůli tomu, že ve scénáři probíhá Song.

## Obtížně objevitelné chování v kontextu

- **Zadávání:** `#` ve Stage direction otevírá zadávání hudby. Během zadávání se potvrzuje jiná operace než běžné pokračování novým blokem; klávesy vysvětlíme u tohoto kroku.
- **Výběr:** návrhy existujících položek filtrují Unassigned. Již umístěnou položku nepředstavíme jako libovolně opakovatelný odkaz. Případnou reprízu vysvětlíme až po ověření dostupného postupu.
- **Nová položka:** potvrzení nového názvu může otevřít Add music. Dokončení dialogu je součást vložení hudby; nebudeme tvrdit, že samotné napsání názvu už vytváří hotovou položku.
- **Konec:** hudba může skončit po určeném bloku nebo mít odvozený konec podle dalšího začátku, strukturální hranice či konce scénáře. Reset music end vrací odvozený konec, nikoli odstranění hudby; jeho nabídka závisí na následujícím bloku.
- **Krátký akcent:** interní režim hit označuje bodový vstup a neukončuje už probíhající otevřený hudební úsek. Článek jej vysvětlí v importovaném obsahu, bez neexistujícího ovládání pro jeho vytvoření.
- **Zpěv a řeč:** Lyrics a Dialogue lze střídat; hudební úsek a Song/Instrumental nejsou náhradou výběru typu psaného bloku. Tok po Character a pokračování přes Aside musí odpovídat aktuálním nastavením a implementaci.
- **Seznam:** vytvoření položky v hudebním seznamu ji může ponechat jako Unassigned. Umístění a vytvoření nejsou vždy jeden krok.
- **Číslování:** vychází z umístění hudby ve scénách a pořadí hudebních začátků. Přesné zobrazení a změny po přesunu vysvětlíme až po ověření formátování.
- **Odebrání:** Unassign music odstraní umístění včetně jeho výslovného konce a ponechá položku pro opětovné použití. Delete music odstraňuje položku ze seznamu; dostupnost a dopady na další údaje ověříme samostatně.
- **Partitura:** aktuální správce má jeden PDF slot Integrated score s Upload PDF, Replace PDF, náhledem přes jméno souboru a Remove. Neslibujeme obecný správce libovolných audio souborů ani více druhů partitur.

## Hranice vůči ostatním kategoriím

- Writing your script vysvětluje obecné bloky, flow, formátování a klávesy. Zde popíšeme jejich použití při zpěvu a mluvení, bez opakování celé reference.
- Characters řeší výběr zpívající postavy, více mluvčích a skupiny. Hudební návody na tyto úkoly odkážou.
- Acts and scenes řeší strukturu, která zároveň tvoří hranice hudebních úseků. Zde vysvětlíme jen její dopad na probíhající hudbu.
- Pages and export řeší vložení partitury do výsledného výstupu a jeho vzhled. Nahrání PDF a přiřazení k hudbě patří sem.
- Scripts and files řeší zálohu a přenos `.stepkg` s přílohami. Návod k PDF na tuto možnost odkáže.
- Syntax zůstává technickou referencí. Ovládání `#` v editoru nebudeme zaměňovat se zápisem uloženého textového formátu.

## Vizuální a jazykové zásady

Články budou anglicky. Použijeme schválené bílé klávesy se symbolem a názvem, tenké skutečné ikony u ovládání bez textu a inline code pro psané znaky, názvy, přípony i ukázkové věty. Totéž platí v nadpisech a descriptions.

Symboly hudebního začátku a konce mohou záviset na stavu úseku. Každou ikonku proto ukážeme u konkrétní situace a vysvětlíme její účinek; nepředstavíme jednu univerzální ikonu pro všechny hudební akce.

## Ověření před psaním

Ověřeno podle aktivních zdrojů: potvrzení a zrušení draft pill přes `#`, výběr Unassigned položky, nový název a dialog založení, návrat fokusu do prózy, explicitní i odvozený konec, podržení a pohyb koncového bodu, číslování, Song/Instrumental, Lyrics/Dialogue/Aside a návrat ke zpěvu. Dále přejmenování, Unassign, Delete, dostupnost akcí pro Assigned/Unassigned a postup PDF včetně nahrazení a odstranění. Starší compose větev byla při obsahové kontrole odlišena od skutečně používané obsluhy.

Živé ověření případně provést jen na zkušebním scénáři po novém předání sdíleného prohlížeče. Bez tohoto průchodu označit ověření jako kontrolu podle zdrojů.

Zdrojové body:

- `packages/editor/src/editor/tiptap/extensions/MusicInputExtension.ts` a aktivní handleTextInput v `musicInput/plugin.ts`
- `packages/editor/src/editor/tiptap/nodes/MusicPill.tsx`
- `packages/editor/src/editor/tiptap/nodes/musicPillCreation.ts` a `musicPillHelpers.ts`
- `packages/editor/src/editor/components/MusicDraftSuggestionsOverlay.tsx`
- `packages/editor/src/editor/components/blockActions/stageDirectionMusicActions.ts`
- `packages/editor/src/editor/components/musicRange/`
- `packages/editor/src/editor/tiptap/extensions/music/{musicCommands,musicOutCommands}.ts`
- `packages/editor/src/editor/tiptap/extensions/music/musicBoundaryPlugin.ts`
- `packages/script/src/music/{deriveMusic,format}.ts`
- `packages/editor/src/editor/tiptap/scriptBlock/handlers/{enter,tab,shortcuts}.ts`
- `packages/app-routes/src/routes/script/editor/music/`
- `packages/app-routes/src/routes/script/attribute-manager/MusicAttachmentsDetail.tsx`
- `packages/app-routes/src/routes/script/attribute-manager/useMusicAttachmentsState.ts`
- `packages/ui/src/dialogs/attribute-manager/AttributeManagerMusicDetail.tsx`

## Další krok

Redakčně projít rozcestník a sedm článků. Výsledky kontrol a omezení praktického ověření jsou v `docs/superpowers/plans/2026-10-12-music-and-lyrics-documentation.md`. Dokumentace zatím nebyla nasazena.
