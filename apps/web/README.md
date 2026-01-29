# Stagistic Web App

This app hosts the Stagistic front-end, including the editor route at `/editor`.

## Structure

```
src/
  routes/
    editor/
      Editor.tsx
      index.tsx
      components/
      plugins/
      styles/
      types/
      ui/
      utils/
```

- **Editor route**: `src/routes/editor` contains the base editor module.
- **Placeholder UI**: components and layout are stubbed for quick iteration.
- **Plugins/types/utils**: ready for Plate.js integrations and shared editor types.

## Local development

```bash
pnpm install
pnpm --filter @stagistic/web dev
```

Visit `http://localhost:3000/editor` to see the editor scaffold.

## Scripts

- `pnpm --filter @stagistic/web dev`
- `pnpm --filter @stagistic/web build`
- `pnpm --filter @stagistic/web lint`
- `pnpm --filter @stagistic/web format`
