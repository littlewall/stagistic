# Sdileni desktop/web - navrh modularizace

## Kratke shrnuti aktualniho stavu
- Desktop app obsahuje vetsinu feature logiky (routes, store, repo, modaly) v `apps/desktop/src`.
- Sdilene balicky uz existuji (`packages/ui`, `packages/shared`, `packages/editor-core`, `packages/sync-core`).
- Web app je zatim minimalni a nema feature logiku.
- Router verze se lisi: desktop ma `react-router-dom` v7, web ma v6.

## Co presunout do sdilenych casti (navrh)
### 1) Feature logika pro skripty (store + hook)
Aktualne:
- `apps/desktop/src/store/scriptsStore.ts`
- `apps/desktop/src/hooks/useScripts.ts`

Navrh:
- Presunout do noveho balicku `packages/app-core` (nebo `packages/features/scripts`).
- Vytvorit API s injekci repository (port/adaptor), napriklad:
  - `createScriptsStore(repo: ScriptRepository)`
  - `ScriptsStoreProvider` + `useScripts()`

Duvod:
- `useScripts` a store jsou stejne pro desktop i web, rozdil je jen v implementaci repository.

### 2) Editor utility
Aktualne:
- `apps/desktop/src/utils/editorDefaults.ts`

Navrh:
- Presunout do `packages/editor-core` (napr. `editorDefaults.ts`) nebo do `packages/shared/editor`.

Duvod:
- Utility pracuji se Slate hodnotami, nejsou desktop-specific.

### 3) Modal pro vytvareni skriptu
Aktualne:
- `apps/desktop/src/components/NewScriptModal.tsx` + CSS

Navrh:
- Presunout do `packages/ui` (napr. `packages/ui/src/dialogs/NewScriptModal.tsx`).

Duvod:
- Ciste UI komponenta, bez Tauri zavislosti.

### 4) Routes / obrazovky
Aktualne:
- `apps/desktop/src/routes/*`

Navrh:
- Presunout do `packages/app-routes` (nebo do `packages/app-shell`).
- Desktop i web by pouzivaly stejny set routes, pouze ruzne repository a platform adaptry.

Duvod:
- Vsechny route komponenty jsou prakticky web-safe (React + router + shared UI).

### 5) Eventy (menu / app-level akce)
Aktualne:
- `apps/desktop/src/constants/menuEvents.ts`
- listenery jsou v routech

Navrh:
- Presunout konstanty + helpery do `packages/app-core/events`.
- V desktopu zustane pouze Tauri listener, ktery tyto eventy dispatchuje.

### 6) UUID helper
Aktualne:
- `apps/desktop/src/repo/uuid.ts`

Navrh:
- Presunout do `packages/shared/src/ids/uuidv7.ts` a re-exportovat.

Duvod:
- Neni desktop-specific (crypto je i v browseru).

## Co musi zustat v desktop app
- Tauri API (napr. `@tauri-apps/api/event`, `@tauri-apps/plugin-sql`, `@tauri-apps/plugin-fs`).
- DB adapter + migrace:
  - `apps/desktop/src/db/*`
  - `apps/desktop/src/repo/localSqliteRepo.ts`
- Menu handler (Tauri menu events) v `apps/desktop/src/App.tsx`.
- `src-tauri/` + build a packaging konfigurace.

## Potrebne sjednoceni / rizika
1) **React Router**: sjednotit verzi v desktop i web (idealne v7), jinak nebude sdileni routes hladke.
2) **Script type**: `Script` je dnes definovan v `packages/ui`. Zvazte presun do `packages/shared` nebo noveho `packages/domain`.
3) **Zavislosti**: pokud se `useScripts` presune do shared balicku, web bude potrebovat zavislosti jako `@tanstack/react-db`, `@stagistic/db`, `@stagistic/shared`.

## Navrhovana struktura (priklad)
```
packages/
  app-core/
    scripts/
      scriptsStore.ts
      useScripts.ts
      ScriptRepositoryProvider.tsx
    events/
      menuEvents.ts
      appEvents.ts
  app-routes/
    HomeRoute.tsx
    ScriptListRoute.tsx
    ScriptEditorRoute.tsx
    ScriptSettingsRoute.tsx
  ui/
    dialogs/
      NewScriptModal.tsx

apps/
  desktop/
    src/platform/
      tauriMenu.ts
      localDb.ts
      localSqliteRepo.ts
  web/
    src/platform/
      httpRepo.ts
```

## Postup migrace (minimalni bolest)
1) Presun `editorDefaults.ts` do shared balicku.
2) Presun `NewScriptModal` do `packages/ui`.
3) Vytvor `ScriptRepositoryProvider` a presun `scriptsStore` + `useScripts` do `packages/app-core`.
4) Presun routy do `packages/app-routes` a v obou appkach pouzij stejny router.
5) Sjednot verzi `react-router-dom` v desktop + web.
6) Zaved platform-specific repo (`localSqliteRepo` vs `httpRepo`) a injektuj ho do provideru.

## Poznamky k dalimu rozsireni
- `ScriptEditorRoute` ma dost logiky (autosave, sceny). Doporucuji z toho vyseparovat `useScriptEditor` hook v `app-core`.
- Menu eventy lze casem nahradit `appEvents` API (napr. `emitNewScript()`), aby routy nebyly zavisle na `window`.

