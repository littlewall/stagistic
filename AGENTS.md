## Goldern rules for working on Codex
- Be brief. Use the fewest words possible to get your point across.
- Be specific. Avoid vague language; provide concrete details.
- Be direct. Say what you mean without unnecessary qualifiers or hedging.

## Code navigation
Use `mcp__codegraph__codegraph_context` FIRST for any architecture/flow/symbol question.
Use `mcp__codegraph__codegraph_trace` for call-path questions.
Only fall back to grep/Read for details codegraph didn't cover.

## DB schema changes
After any change to `packages/db/src/` schema or `drizzle/*.sql` files, run:
`pnpm --filter @stagistic/db db:compile-migrations`
(`db:generate` does this automatically; manual SQL edits do not.)

## Design context
See [PRODUCT.md](PRODUCT.md) and [DESIGN.md](DESIGN.md) before any UI work.

**Register:** product (app-first). The editor app (`apps/web`) is the primary surface; the landing page (`apps/landing`) is brand register.

**North Star:** "The Dark Stage" — the interface exists in the wings; the script is the spotlight.

**Five principles:**
1. The script is the center — when in doubt, subtract.
2. Theatrical without theatrics — prompt-book precision, not poster noise.
3. Structure is a first-class feature — acts, scenes, characters are meaningful data.
4. Compose, don't sprawl — editor + future production apps grow by composition.
5. Professional discretion — no onboarding fanfare; a playwright picks it up and works.

**Anti-references:** Heavy SaaS dashboards (Jira/Asana), gamified writing apps, loud marketing/AI landing aesthetics (gradients, feature grids, eyebrow-on-every-section).
