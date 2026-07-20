# Live Pagination Settings Design

## Goal

Apply page size, page margins, base typography, and header/footer changes without rebuilding the live Tiptap editor. The editor DOM, selection, and content remain mounted while pagination recalculates.

## Root Cause

Tiptap binds `addCommands` and `addProseMirrorPlugins` to separate context objects. Each receives a copied `options` value. `updatePaginationSettings` currently assigns to its command context's `this.options`, so the pagination plugin continues reading the options captured by its own context.

The editor also treats the complete resolved settings object as part of its surface signature. Any settings edit therefore creates a signature miss and rebuilds the editor even when the setting already has a safe live-update path.

## Design

`PaginationStorage` owns the current `PaginationOptions`. `addStorage` initializes them from the configured extension options. `updatePaginationSettings` compares and updates `storage.options`, increments `optionsVersion`, and dispatches the existing control transaction. The pagination plugin reads `storage.options` for initial state, measurement, layout keys, and recalculation.

The pagination extension is created once per React editor mount. Initial options still come from the hydrated settings; later page and typography changes flow through `usePaginationSettings` into mutable storage.

The editor surface signature contains only settings that intentionally require rebuilding:

- `blocks`
- `structure`
- `visual`

The following remain outside the rebuild signature and update through existing live React or pagination paths:

- `page`
- `typography`
- `headerFooter`

Export-only `initialPages` remains excluded from the editor runtime settings.

## Update Flow

```txt
settings modal draft
  -> resolved editor settings
  -> CSS variables and header/footer React overlay update
  -> updatePaginationSettings command
  -> PaginationStorage.options + optionsVersion
  -> pagination plugin recalculation
  -> updated page boundaries and header/footer geometry
```

The Tiptap editor instance and DOM remain unchanged throughout this flow.

## Tests

- Change the existing propagation regression test to assert that command updates reach `PaginationStorage.options`, then verify the plugin produces pagination state using the new value.
- Extend the editor surface browser test to assert page, typography, and header/footer changes preserve the same editor DOM instance.
- Assert a block or structure change still rebuilds the editor.
- Run pagination browser tests, editor unit tests, typecheck, and lint for affected packages.

## Non-goals

- Making block behavior or structure settings fully live-updateable.
- Changing persistence or modal draft ownership.
- Rendering two editor instances or masking rebuilds with transition UI.
