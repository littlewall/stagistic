# Další kategorie: Scripts and files

Stav: členění a příklad odsouhlaseny 7. 10. 2026. Rozcestník a sedm článků jsou připravené v `apps/docs/src/content/docs/editor/scripts/`, s vlastní plochou skupinou sidebaru. Postupy jsou ověřené podle současné implementace; živý průchod editorem neproběhl.

## Upřesnění podle implementace

Duplikace vždy kopíruje obsah, ale Copy settings a Copy attributes jsou původně vypnuté. Kopie nemá původní podtitul, údaje titulní strany, hudební přílohy ani komentáře; pro zálohu s těmito údaji slouží `.stepkg`. Title a Subtitle v přejmenování odpovídají i údajům titulní strany. Saved potvrzuje místní uložení v aktuálním webovém prohlížeči, nikoli přenos na jiné zařízení.

Při obnově se existující scénář hledá podle identity uložené v balíčku. Shodný název nestačí; přejmenování identity nemění. Import as new copy vytváří samostatný scénář, Replace existing nahrazuje snapshot bez slučování pozdějších změn. `.stagistic` vytváří nový scénář a tuto nabídku nahrazení nemá.

## Co má čtenář zvládnout

Začít nový scénář nebo otevřít existující, vyznat se v domácí knihovně a udělat samostatnou pracovní kopii. Rozumět automatickému ukládání, stáhnout vlastní soubor a vědět, jak ho přenést či obnovit. Nakonec bezpečně odstranit scénář, který už nepotřebuje.

Kategorie bude na `/editor/scripts/`, se stejným rozcestníkem a plochou skupinou sidebaru jako dosavadní hotové kategorie. Navrhuji sedm krátkých článků. Ukládání a záloha budou dva propojené úkoly: vysvětlení, kam se práce ukládá, a praktický postup, jak získat vlastní soubor.

## Společný příklad

Scénář s Robinem a Alexem pracovně nazveme `The door`. Později ho přejmenujeme na `The last door` a pro zkoušku vytvoříme kopii `The last door — rehearsal draft`.

Při práci se soubory použijeme tento scénář jako příklad staženého balíčku a obnovené kopie. Každý článek bude fungovat samostatně; jeho přečtení nebude záviset na vytvoření všech variant.

## Rozcestník a články

| Článek | Co řeší | URL |
| --- | --- | --- |
| Create and open a script | Založit scénář přes New script, zadat pracovní název a vybrat One-act nebo Multi-act. Vysvětlit výchozí strukturu a otevření existujícího scénáře. U prázdné knihovny krátce ukázat dostupný příklad. | `/editor/scripts/create/` |
| Find your scripts | Orientovat se v kartách na domácí stránce, najít scénář podle názvu či podtitulu a zvolit řazení. Vysvětlit, kdy se vyhledávání a řazení zobrazí a co znamená Newest first. | `/editor/scripts/find/` |
| Rename or duplicate a script | Upravit název a vytvořit samostatnou pracovní kopii. Odlišit přejmenování od duplikace a objasnit rozsah kopie i vztah názvu k titulní straně podle skutečné implementace. | `/editor/scripts/copies/` |
| Understand saving and storage | Vysvětlit automatické ukládání, indikátor v hlavičce a místo uložení ve webové aplikaci. Odpovědět na běžné situace: zavření editoru, návrat později, jiný prohlížeč či zařízení a neúspěšné uložení. Pro přenos a vlastní zálohu odkázat na stažení souboru. | `/editor/scripts/saving/` |
| Download a script file | Stáhnout scénář z editoru. Porovnat dostupné `.stagistic` a `.stepkg` podle skutečně zachovaného obsahu, údajů a příloh; ukázat volbu pro vlastní zálohu a přenos. Odkázat na import pro otevření souboru později. | `/editor/scripts/download/` |
| Import or restore a script | Vybrat nebo přetáhnout podporovaný soubor a otevřít ho v aplikaci. U balíčku pro existující scénář vysvětlit Import as new copy a Replace existing, nabídku zálohy před nahrazením a očekávaný výsledek každé volby. | `/editor/scripts/import/` |
| Delete a script | Najít odstranění v nabídce scénáře, přečíst jeho rozsah a zadat požadované potvrzení. Vysvětlit nevratnost odstranění v aplikaci a odkázat na vlastní zálohu před odstraněním. | `/editor/scripts/delete/` |

Pořadí vede od první práce přes správu knihovny k uchování a obnově. Stažení souboru je před importem, aby obnovení přirozeně navazovalo na vlastní zálohu. Import ale bude dostupný také přímo z rozcestníku pro člověka, který už soubor má.

## Flow jednotlivého článku

Zachováme situace → krátký postup → očekávaný výsledek → důležité podmínky → navazující úkol.

Například Rename or duplicate a script začne potřebou vyzkoušet úpravy pro zkoušku. Ukáže duplikaci do `The last door — rehearsal draft` a vysvětlí, že čtenář pracuje s další kopií scénáře. Samostatná část pak vyřeší prostou změnu pracovního názvu. Přesný rozsah kopírovaných údajů a příloh ověříme před finálním textem.

Understand saving and storage bude mít krátké praktické vysvětlení a situační podnadpisy. Nebude popisovat databázi ani technické mechanismy; uživatel potřebuje vědět, kde svou práci najde a kdy potřebuje vlastní soubor.

Import or restore a script začne běžným importem. Volby pro již existující scénář vysvětlí až ve chvíli, kdy je aplikace nabídne. Nahrazení odlišíme od nové kopie podle výsledku, ne jen podle názvu tlačítka.

## Obtížně objevitelné chování v kontextu

- **Začátek:** One-act začíná pouze scénou; Multi-act začíná Act One a scénou. Pozdější práci s akty propojí článek s Acts and scenes.
- **Prázdná knihovna:** Create example script se nyní nabízí, až když je knihovna načtená a prázdná. Nepředstavíme ho jako trvale dostupnou akci.
- **Vyhledávání:** vyhledávání a řazení se nyní zobrazují od pěti scénářů. Článek vysvětlí chybějící ovládání u menší knihovny.
- **Řazení:** Newest first používá poslední změnu, nikoli pouze datum založení. Vyhledávání zahrnuje název i podtitul.
- **Kopie:** duplikace je další scénář, nikoli historie verzí. Rozsah duplikace a následných změn před napsáním potvrdíme ve zdrojích.
- **Uložení:** hlavička má stavy Saving…, Saved a Couldn’t save. Vysvětlíme jejich význam pro skutečné ukládání; nebudeme odvozovat cloudovou synchronizaci z názvu interní komponenty.
- **Soubor:** dostupné stažení textového formátu a balíčku má rozdílný účel. Přesný rozsah každého formátu ověříme; nepředpokládáme, že textový soubor zachová všechny údaje a přílohy.
- **Obnova:** u `.stepkg` aplikace rozpoznává existující scénář a podle výsledku nabídne novou kopii nebo nahrazení. Nahrazení vyžaduje vlastní potvrzení a nabízí stažení zálohy.
- **Odstranění:** odstranění celého scénáře není stejné jako odstranění nadpisu scény, které zachovává její text. Zde mizí scénář i obsah; dialog výslovně uvádí nevratnost.

## Hranice vůči ostatním kategoriím

- Getting started zůstane stručným vstupem; konkrétní vytvoření a import odkáže sem.
- Acts and scenes řeší vnitřní strukturu jednotlivého scénáře. Zde vysvětlíme jen volbu počáteční struktury při založení.
- Pages and export řeší titulní stranu, vzhled a tiskový výstup. Stažení pracovního souboru pro další editaci a obnovu bude zde.
- Syntax vysvětluje technický formát `.stagistic`. Uživatel v této kategorii soubor stáhne nebo importuje; nemusí ručně psát jeho syntaxi.
- Samostatnou kategorii Script settings ani hypotetické sdílení a synchronizaci nepřidáváme. Vysvětlení ukládání odpoví současné aplikaci.

## Vizuální a jazykové zásady

Články zůstanou anglicky. Zachováme bílé klávesy se symbolem a názvem, tenké skutečné ikony vedle popisků a kód pro psané názvy, potvrzovací texty i přípony souborů, včetně nadpisů a descriptions. U akcí na kartách ukážeme skutečnou nabídku, bez závislosti na neověřeném gestu či ovládání.

## Ověření před psaním

Podrobně ověřit výchozí obsah obou variant založení, otevření karty, přejmenování a jeho vztah k titulní straně, obsah duplikátu, podmínky vyhledávání a řazení, skutečný význam indikátoru uložení, rozsah místního úložiště, oba exportované formáty, import nové kopie, rozpoznání existujícího scénáře a nahrazení včetně zálohy, a potvrzení odstranění.

Případné živé ověření provést pouze na samostatných zkušebních scénářích po novém předání sdíleného prohlížeče. Bez živého průchodu označit ověření jako kontrolu podle zdrojů.

Zdrojové body:

- `packages/app-routes/src/routes/home/HomeRoute.tsx`
- `packages/app-routes/src/routes/home/homeDashboardModel.ts`
- `packages/app-routes/src/routes/home/ScriptListSection.tsx`
- `packages/ui/src/molecules/ScriptCard/ScriptCard.tsx`
- `packages/ui/src/dialogs/script/{NewScriptModal,RenameScriptModal,DuplicateScriptModal,DeleteScriptModal,ImportScriptModal}.tsx`
- `packages/ui/src/dialogs/script/import/useImportScriptModalState.ts`
- `packages/ui/src/layout/header/SyncIndicator.tsx`
- `packages/app-routes/src/routes/script/workspace/useSaveIndicator.ts`
- `packages/app-routes/src/routes/script/editor/useScriptEditorHeaderActions.ts`
- `packages/app-routes/src/global-modals/useStepkgPackageMutations.ts`
- `packages/db/src/queries/scripts/duplicate.ts`
- `packages/db/src/repo/package/`
- `apps/web/src/App.tsx` a `apps/web/src/db/`

## Další krok

Redakčně projít rozcestník a sedm článků. Výsledky kontrol jsou v `docs/superpowers/plans/2026-10-07-scripts-and-files-documentation.md`. Dokumentace zatím nebyla nasazena.
