# Pilot dokumentace: Postavy

Stav: struktura, flow a tón odsouhlaseny 6. 10. 2026, včetně skupin a potvrzených/nepotvrzených postav. První verze rozcestníku a šesti článků je připravena v `apps/docs/src/content/docs/editor/characters/` k obsahové kontrole. Níže zůstává schválený návrh a původní pracovní ukázka.

## Co na pilotu ověříme

Na jedné kategorii odsouhlasíme cestu čtenáře, členění a tón. Navrhuji **Characters / Postavy**: obsahuje běžnou práci i obtížně objevitelné interakce (`+`, `/`, `@`), ale má jasné hranice.

Předpoklad: návrh a komentáře probíráme česky; publikované články pokračují v angličtině jako současná Knowledge base.

Úspěch znamená, že uživatel najde konkrétní úkol, zvládne ho podle krátkého návodu a pozná, jak pokračovat v psaní. Nemusí předtím přečíst celou kategorii.

## Směr výkladu

Doporučuji krátké návody podle úkolů, propojené jedním drobným příkladem. Alternativou je jeden dlouhý tutoriál, který se lépe čte poprvé, ale hůř se v něm hledá konkrétní odpověď. Samostatná sada otázek a odpovědí zase neposkytne dostatečnou orientaci novému uživateli.

„Storytelling“ zde znamená návaznost práce: **Robin mluví → vyjasníme stav nové postavy → Alex se přidá → pracujeme s pojmenovanou skupinou → Robin něco udělá ve scénické poznámce → potřebujeme upravit údaje o postavě.** Stejná jména používáme v příkladech napříč kategorií. Články přesto začínají vlastní situací a obsahují všechny potřebné kroky.

Nenápadná funkce se objeví ve chvíli, kdy řeší daný úkol. `@` patří přímo do postupu pro odkaz na postavu; `+` a `/` do společné repliky. Neodsuneme je do boxu s tipy.

## Cesta kategorií

Na `/editor/characters/` bude krátké vysvětlení rozdílu mezi mluvčím repliky a odkazem na postavu uvnitř poznámky. Poté rozcestník podle toho, co chce čtenář udělat:

| Článek | Co uživatel potřebuje | Cílová URL |
| --- | --- | --- |
| Choose who is speaking | Zadat nového nebo vybrat existujícího mluvčího a pokračovat replikou. | `/editor/characters/speakers/` |
| Confirm characters | Pochopit potvrzené a nepotvrzené postavy, poznat jejich stav a vědět, kdy a jak postavu potvrdit. | `/editor/characters/confirmation/` |
| Write dialogue for multiple characters | Přidat další jméno v jednom character bloku a pochopit volbu oddělovače. | `/editor/characters/multiple-speakers/` |
| Work with character groups | Vytvořit pojmenovanou skupinu, pracovat s jejími členy a použít ji ve scénáři. | `/editor/characters/groups/` |
| Refer to a character in a stage direction | Vložit odkaz přes `@` a vrátit se k běžnému textu. | `/editor/characters/references/` |
| Manage characters | Najít a upravit údaje o postavě. | `/editor/characters/manage/` |

Pořadí slouží jako přirozená cesta pro první čtení. Není to povinná posloupnost. Rozcestník nebude opakovat celé návody. Současný sidebar má zatím jen odkaz na kategorii; členění do podstránek upravíme při jejím naplnění.

### Jak do sebe témata zapadají

Potvrzené a nepotvrzené postavy vysvětlíme krátce už při prvním zadání mluvčího; samostatný článek popíše význam stavu a postup potvrzení. Rozlišíme **dokončení zadávání jména** pomocí Enter/Tab od **potvrzení postavy** ve správě postav. Slovo „potvrdit“ tak nebude označovat dvě různé činnosti bez vysvětlení.

Skupiny postav dostanou vlastní článek vedle více mluvčích. Na stejných postavách ukážeme rozdíl mezi několika jmény v jednom character bloku a pojmenovanou skupinou. Oba články na sebe odkážou v místě, kde se čtenář rozhoduje, který postup potřebuje.

Obecná správa postav nebude tato vysvětlení opakovat; odkáže na potvrzení a skupiny z příslušných operací.

## Stavba jednoho článku

1. **Situace a výsledek:** jedna až dvě věty, kdy postup použít a co vznikne.
2. **Krátký postup:** podmínka včetně typu bloku, konkrétní kroky a jejich výsledek. Klávesa, otevření nabídky i dokončení patří sem.
3. **Pokračování a změny:** návrat k běžnému psaní, oprava či zrušení, pokud jsou pro úkol podstatné.
4. **Související práce:** jeden nebo dva odkazy, které skutečně navazují.

Příklad bude součástí postupu, nikoli povinná další sekce opakující stejné kroky. Otázky a odpovědi přidáme jen tam, kde zůstává konkrétní nejasnost. Prázdné sekce a univerzální FAQ nebudeme vyrábět.

Tón: krátké přímé věty, přesné názvy z rozhraní, běžná divadelní terminologie. Vyhneme se marketingovému úvodu, technické reprezentaci dokumentu a formulacím jako „simply“ či „just“.

## Ukázka článku k posouzení tónu

Následující text je pracovní ukázka. Návrh ukazuje základní cestu s napsáním celého jména; našeptávání a práce s již vloženým odkazem se doplní po ověření jejich úplného průběhu v rozhraní.

---

### Refer to a character in a stage direction

When a stage direction describes what a character does, you can insert their name as a character reference.

#### Insert a reference

For example, you want to write “Robin opens the door.”

1. Place the cursor in a **Stage direction** block where the character's name should go.
2. Type `@` to start entering a character reference.
3. Type `Robin` and press **Enter** to finish the reference. **Tab** also finishes it.
4. Continue typing `opens the door.` as ordinary text after the reference.

Enter finishes the reference and leaves you in the same stage direction, ready to continue the sentence.

#### Cancel before finishing

Press **Escape** while entering the name to remove the unfinished reference.

#### Related tasks

- To put a character's name above a speech, see **Choose who is speaking**.
- To refer to music in a stage direction, see **Music and lyrics**.

---

Při publikaci budou související témata skutečné odkazy. Ukázka není technickým zápisem Stagistic Syntax.

## Obrazový doprovod

U `@` a dalších jmen dává smysl krátký záznam skutečného editoru: kurzor → zadání → dokončení → pokračování. Textový postup zůstane úplný i bez něj. Statický obrázek použijeme, když stačí ukázat výsledný blok nebo umístění ovládacího prvku.

Pro první odsouhlasení stačí text. Screenshoty pořídíme až k finálnímu ověřenému postupu, aby odpovídaly jeho přesným krokům.

## Ověření před publikací

Základ ukázky `@` je ověřen v aktuálním zdrojovém kódu: zahájení zadávání, potvrzení přes Enter/Tab, přidaná mezera pro pokračování a odstranění rozpracovaného odkazu přes Escape. Celý uživatelský průchod zatím nebyl ověřen v prohlížeči.

Zdrojové opory:

- `packages/editor/src/editor/tiptap/extensions/characterTagInput/textInputHandlers.ts` — zahájení přes `@`.
- `packages/editor/src/editor/tiptap/extensions/characterTagInput/keyDownHandlers.ts` — potvrzení a zrušení.
- `packages/editor/src/editor/tiptap/extensions/characterTagInput/transactions.ts` — vložení a dokončení odkazu.

Před dokončením celé kategorie ověříme:

- Způsob výběru existující postavy a chování nového jména, včetně návaznosti na správce postav.
- Přesný význam rozdílu mezi `+` a `/`, podmínky jejich použití a úpravu pořadí jmen.
- Našeptávání, úpravu již vloženého odkazu a chování při opuštění zadávání.
- Dostupné operace ve správci postav a jejich dopad na existující text.
- Význam potvrzeného a nepotvrzeného stavu, jejich označení v rozhraní a postup potvrzení; dokončení zadávání jména nesmí být zaměněno za potvrzení postavy.
- Vytvoření a použití skupiny, správu členů a rozdíl proti více jednotlivým mluvčím v jednom bloku.

Tyto neověřené vlastnosti zatím nepopisujeme jako hotové sliby produktu.

## Co si teď odsouhlasit

- Pilotní kategorii Postavy a šest návodů podle úkolů, včetně skupin a potvrzených/nepotvrzených postav.
- Krátké samostatné články s návazností a stejnými příkladovými postavami.
- Tón a míru podrobnosti ukázky: účel → konkrétní postup → pokračování nebo zrušení → související práce.

Po odsouhlasení naplníme pouze tuto kategorii. Ověříme ji v editoru a projdeme ji ve skutečné Knowledge base; teprve potom použijeme její vzor pro další kategorie.
