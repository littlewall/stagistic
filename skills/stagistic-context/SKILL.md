---
name: stagistic-context
description: Stagistic repo context and constraints. Use when working in this repo to remember project direction, editor source-of-truth, and code-organization preferences (offline desktop first, future web app, maximize shared code, editor prototype lives in sibling playground repo).
---

# Stagistic Context

## Project direction

- Build a cloud web app later, but right now deliver an offline desktop app in `apps/desktop`.
- Expect a future web app in `apps/web`; keep code as reusable as possible to avoid duplication.

## Editor source of truth

- The Fountain editor prototype lives in the sibling repo `../stagistic-editor-playground`.
- Treat the playground as the canonical behavior/styling for the editor.
- When migrating editor features, move reusable logic into shared packages, and wire apps to use those packages.

## Code organization defaults

- Put editor data types, parsing, and serialization in a shared package.
- Put editor UI (Plate components, blocks, styles) in a reusable package.
- Keep app-specific layout and branding in the app layer, but share editor behavior and styles.
