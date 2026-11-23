---
type: fix
bump: patch
title: Scripts come back intact from a .stagistic file
---

Exporting a script to `.stagistic` and importing it again now keeps everything you wrote: `*`, `_`, `\` and `@` typed as text, lowercase lyrics, all-caps dialogue, empty stage directions and character cues, the kind of a music number, character names with a colon, acts without scenes and a manual title-page date left empty. A broken file is reported instead of stopping the import. In older files, a `~` line right after lyrics now opens as an empty dialogue line, and several `~` lines in a row stay separate.
