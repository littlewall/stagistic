# Animation review — TODO

Akční úkoly z review animací na větvi `tests`. Seřazeno podle naléhavosti.

## 🔴 Blocker — opravit před mergem

1. **ProgressBar: indeterminate animace běží na layout property `left`.**
   `progress-wave` animuje `left: -35% → 100%` v `infinite` smyčce → layout + paint na main threadu každý frame, pořád.
   Přepsat na `transform: translateX(...)` (GPU-only). [packages/ui/src/feedback/ProgressBar.module.css:50](../../packages/ui/src/feedback/ProgressBar.module.css#L50)

2. **ProgressBar: easing nekonečné smyčky.**
   `animation: progress-wave 1.2s ease-in-out infinite` → změnit na `linear infinite`. Konstantní/smyčkový pohyb = `linear`; `ease-in-out` dělá na švu smyčky pauzu/„nádech“. [packages/ui/src/feedback/ProgressBar.module.css:48](../../packages/ui/src/feedback/ProgressBar.module.css#L48)

3. **HomeRoute: hover-lift není gatovaný pro touch.**
   `.continueCard:hover { transform: translateY(-2px) }` zůstane „přilepený“ po tapnutí na touch (false hover). Obalit do `@media (hover: hover) and (pointer: fine)`. Křivka `cubic-bezier(.16,1,.3,1)` je dobrá, nechat. [packages/app-routes/src/routes/home/HomeRoute.module.css:15](../../packages/app-routes/src/routes/home/HomeRoute.module.css#L15)

4. **Chybí `prefers-reduced-motion` na pohybové animace.**
   Aktuálně ho má jen skeleton shimmer. Doplnit pro pohyb pozice — sidebar slide, mobilní drawer, card lift: pod `@media (prefers-reduced-motion: reduce)` ponechat opacity/fade, zrušit translate/posun.

## 🟠 High — řešit, ale není to hard blocker

5. **Editor: `grid-template-columns` animace reflowuje celý dokument.**
   `transition: grid-template-columns .24s ease` na `.contentRow` (obaluje celý script canvas) → reflow celého TipTap dokumentu 60×/s po 240 ms. Na dlouhém scénáři nejdražší věc na obrazovce.
   Buď animovat sidebar sloupec přes `transform: translateX` + overlay (jak už dělá mobilní větev s `box-shadow: var(--shadow-panel)`), nebo ponechat a ověřit na dokumentu se 100+ bloky.
   [packages/editor/src/editor/Editor.module.css:147](../../packages/editor/src/editor/Editor.module.css#L147), [:41](../../packages/editor/src/editor/Editor.module.css#L41)

6. **Editor: chevron toggle ikona se nepřeklápí plynule.**
   `.sidebarToggleIcon` má `rotate(0deg)` → `.flipped { rotate(180deg) }` bez `transition`. Panel jede 240 ms, ikona scvakne okamžitě → nekohezní.
   Doplnit `transition: transform .24s ease`. [packages/editor/src/editor/Editor.module.css:117](../../packages/editor/src/editor/Editor.module.css#L117)

## 🟡 Polish — nice-to-have, ladí pocit

7. **Editor: mobilní drawer používá slabý `ease`.**
   `transition: transform .24s ease …` → přejít na drawer křivku `cubic-bezier(0.32, 0.72, 0, 1)` (iOS-like), aby slide působil fyzicky. [packages/editor/src/editor/Editor.module.css:249](../../packages/editor/src/editor/Editor.module.css#L249)

8. **Block actions: nedokončený crossfade při pressu.**
   `.triggerIcon` má `transition: opacity .15s ease`, ale `.dragGrip` žádnou → ikona vyfaduje, grip „popne“. Doplnit `transition: opacity .15s ease` i na `.dragGrip`. [packages/editor/src/editor/components/EditorBlockActionsOverlay.module.css](../../packages/editor/src/editor/components/EditorBlockActionsOverlay.module.css)

9. **Block actions menu: zvážit vstupní animaci (volitelné).**
   Menu naskakuje okamžitě — žádný `@starting-style` ani `transform-origin` z triggeru. Instant je obhajitelný (často používaný editor control). Pokud animovat: 120–150 ms `opacity` + `scale(0.97)` z anchored origin triggeru. Nikdy `scale(0)`. [packages/editor/src/editor/components/EditorBlockActionsOverlay.module.css](../../packages/editor/src/editor/components/EditorBlockActionsOverlay.module.css)

## 🔵 Backlog — mimo rozsah diffu, založit ticket

10. **Drag reorder nemá FLIP animaci.**
    Bloky při `applyPreviewMove` skáčou na nové pozice — chybí otevírání mezery (Notion/Linear feel). Na ProseMirror dokumentu je to náročné, proto samostatný ticket. Logika dragu jinak OK (pointer capture, multi-touch guard, 6px threshold, 130ms press delay, edge auto-scroll, čistý cancel/revert).

---

## Bez nálezů / pozitiva (neřešit)

- `transition: all` v `AppHeader` nahrazeno explicitními properties.
- Skeleton shimmer korektně respektuje `prefers-reduced-motion` se statickým fallbackem.
- Spinnery používají `linear infinite`.
- Color/background přechody konzistentně `.15s ease` (správně dle easing tabulky).
- Drag interakce: pointer capture, per-`pointerId` multi-touch guard, threshold, auto-scroll, revert — bez výhrad.
