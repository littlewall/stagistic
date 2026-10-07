# Uživatelská dokumentace editoru — návrh směru

Formát a systém odsouhlaseny. Kategorie a konkrétní obsah přijdou následně. Technická reference bude v docs; původní stránka syntaxe na landing page zůstane jako stručné představení formátu.

## Doporučení

**Jedna společná knowledge base na `docs.stagistic.com` pro budoucí balík aplikací Stagistic. Samostatné sekce Editor (`/editor/`) a Syntax (`/syntax/`), každá s vlastní navigací a úvodem, společný rozcestník `/` a trvalé odkazy v hlavičce. Uživatelská příručka Editoru bude dostupná z landing page i přímo z aplikace. Tematické články s krátkými postupy a příklady, doplněné otázkami a odpověďmi. Technicky samostatná Astro aplikace se Starlight ve stávajícím monorepu.**

Čtenářem je dramatik nebo libretista. Dokumentace mu pomáhá napsat scénář a pochopit chování editoru. Názvy článků mají vycházet z jeho záměru, například „Jak napsat společnou repliku více postav“. Technické názvy interních komponent do příručky nepatří.

## Umístění a propojení

| Místo | Úloha |
| --- | --- |
| `docs.stagistic.com` | Celá příručka, veřejná a dostupná bez přihlášení. Každý článek má vlastní stabilní URL. |
| Landing page | Viditelný odkaz „Nápověda“ nebo „Příručka“ a krátké představení Stagistic Syntax s odkazem na technickou referenci. |
| Editor | Vstup do příručky a odkazy na konkrétní články z relevantních míst. |

V první verzi stačí v editoru jeden snadno dostupný odkaz. Kontextové odkazy lze přidávat postupně; měly by otevírat příručku v nové kartě, aby autor neztratil rozepsaný scénář. Celý systém nápovědy uvnitř editoru bych nyní nestavěl.

Samostatná aplikace přidá jeden deployment, ale umožní dokumentaci rozvíjet bez zásahů do editoru a marketingových stránek. Obsah zůstane ve stejném repozitáři, takže změna funkce a její popis mohou být součástí stejné změny.

## Formát a navigace

Základní cesta bude **oblast práce → téma → konkrétní postup**. Na úvodní stránce krátký rozcestník, uvnitř navigace mezi tématy, vyhledávání a obsah aktuálního článku. Zpočátku bych držel nejvýše dvě úrovně navigace; podkategorie přidával až tam, kde skutečně pomohou.

Samostatný článek dává smysl pro jednu související činnost. Více drobných otázek k téže činnosti může zůstat v článku jako nadpisy s přímými odkazy. FAQ doplní nejasnosti a nečekané chování; hlavní obsah budou tvořit souvislé návody.

Článek má jednoduchý vzor:

1. **K čemu to slouží** — jedna nebo dvě věty.
2. **Jak na to** — krátký postup včetně místa, kde funguje.
3. **Příklad** — konkrétní zápis a výsledek; obrázek, pokud pomůže.
4. **Další možnosti a časté otázky** — související zkratky, zvláštnosti a odkazy.

Tak se „skryté“ funkce stanou běžnou součástí práce. Psaní `@` bude popsáno u odkazování na postavy ve scénické poznámce, `#` u hudebních odkazů a `+` či `/` u více postav v jedné replice. Jde o ilustraci způsobu členění; přesné chování a význam jednotlivých variant ověříme při psaní podle aktuálního editoru.

Pro rychlé dohledání může později existovat stručná referenční tabulka zkratek a značek. Každá položka odkáže na vysvětlení v příslušném tématu. Vyhledávání má umožnit najít téma přes běžný název i označení používané v rozhraní, například „hudba“, „music cue“ nebo „pill“.

## Technický základ

**Astro Starlight**, obsah převážně v Markdownu; MDX jen pro články, které potřebují vlastní ukázku nebo komponentu. Starlight nabízí navigaci, vyhledávání, lokalizaci a podporu Markdown/MDX. Viz [oficiální přehled](https://starlight.astro.build/).

Landing page už používá Astro, takže tento směr navazuje na používaný stack. Při implementaci ověříme kompatibilní verze závislostí. Vzhled příručky má být klidný a čitelný, s typografií a barvami Stagistic; rozsáhlé přepisování standardní navigace není pro první verzi potřeba.

## Uživatelská příručka a technická reference

Existující stránka `/editor/syntax` je technický popis textového formátu. Nepředpokládáme, že by uživatelé scénáře psali přímo v tomto formátu. Znalost syntaxe proto nebude předpokladem pro čtení uživatelské příručky.

Úplný technický popis přesuneme do stejného dokumentačního systému, do samostatné části **Technická reference → Syntaxe formátu**, například na `/syntax/reference`. Dosavadní obsah lze převzít s úpravami potřebnými pro nový publikační systém.

Původní stránka `/editor/syntax` zůstane na landing page jako krátké představení formátu. Vysvětlí, co je Stagistic Syntax a proč vznikla vlastní syntaxe: podle autora žádný existující formát nepokrývá všechny potřeby Stagistic pro divadelní hry a muzikály. Doplní několik názorných příkladů rozdílů oproti Fountain a výrazný odkaz na úplný popis v docs. Konkrétní srovnání ověříme podle specifikací obou formátů při psaní obsahu.

Stránka na landing page nebude obsahovat úplnou referenci ani přesměrovávat návštěvníka. Referenční pravidla budeme udržovat v docs; landing page bude vysvětlovat motivaci a přínos formátu.

Uživatelská příručka a technická reference sdílejí publikační systém, ale mají samostatnou navigaci podle svého účelu. Úvod dokumentace nabízí Editor a Syntax rovnocenně; vstup z aplikace vede přímo do sekce Editor. Technická reference bude dostupná samostatným odkazem. Technické články se nebudou objevovat mezi běžnými návody; výsledky vyhledávání musí rozlišovat příslušnost k příručce nebo referenci.

Příručka vysvětlí například, že napsání `@` ve scénické poznámce vyvolá zadávání odkazu na postavu. Technická reference popíše reprezentaci odkazu v textovém formátu. Propojovat je budeme pouze tam, kde čtenáři pomůže přejít k druhému typu informací.

Samostatný systém pro technickou referenci zatím nepřináší odpovídající užitek.

## Další fáze

Následuje návrh konkrétního stromu kategorií uživatelské příručky a hranic jednotlivých článků. Technická reference zatím potřebuje pouze existující popis syntaxe; další technická témata přidáme, až budou potřebná. Teprve po schválení stromu začneme psát obsah. Jazyk příručky určíme před psaním.
