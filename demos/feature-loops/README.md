# Feature loops

This workspace contains manual marketing captures. It drives the real local editor
with Playwright; Recordly is responsible for recording and post-production.

## Editor blocks

Start the web app in one terminal:

```sh
corepack pnpm --filter @stagistic/web dev
```

Then start the capture runner in another terminal:

```sh
corepack pnpm --filter @stagistic/feature-demos demo:editor-blocks
```

The runner opens a headed Chromium window at 1440 × 900, 100% zoom, dark mode,
and device scale factor 1. Before opening the visible editor it uses a fresh
browser profile to acknowledge the public-preview notice and seeds the same
demo script, cast, and music on every run.

When the terminal prints `Ready for Recordly`, move the physical cursor outside
the window, start Recordly recording, and press Enter in the terminal. The flow
holds for 900 ms, types every non-prepopulated block character by character,
then holds the final stage direction for 1400 ms. When it prints `Flow complete`,
stop the Recordly recording, then press Enter to close Chromium. The script is
not reset before that final confirmation.

To use a different local server address:

```sh
STAGISTIC_DEMO_BASE_URL=http://localhost:3000 \
corepack pnpm --filter @stagistic/feature-demos demo:editor-blocks
```

The flow writes `ACT I`, a scene and stage direction, MARA and ELI through the
real character suggestions, dialogue, aside, and two lyric lines. It starts
`Dawn in Gold` in a stage direction before ELI.
