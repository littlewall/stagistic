# Property oracles

Core data operations are checked with [fast-check](https://fast-check.dev) properties against independent oracles. Rationale: [ADR 0001](adr/0001-property-oracles-fixed-seed.md).

## Oracle kinds

1. Round-trip: `normalize(decode(encode(x))) == normalize(x)`, plus a text fixpoint `encode(decode(t)) == t` for encoded text. Used for `.stagistic`, stepkg and the document-to-PGlite projection.
2. Invariant: a property that must hold for any input (pagination places each block once and in order; each block is in exactly one scene; character stats match tags; rename A->B->A is identity).
3. Reference model: a plain `Map` model run against `ScriptRepository` with `fc.asyncModelRun`; reactive reads must equal direct reads after each command.
4. Hostile input: arbitrary text or corrupted bytes must never throw unexpectedly; only controlled errors.

## Generators

Shared arbitraries live in `@stagistic/test-oracles` (`packages/test-oracles`): valid `ScriptDocument` (schema v4), title page, hostile text/bytes, `normalizeScriptDocument`, and `oracleParameters`. Concrete oracles live beside each package's tests as `*.property.test.ts`. Unreachable shapes (not producible by the editor) are omitted in the generator with a comment.

## Seeds and replay

- `test`: fixed seed (`DEFAULT_FC_SEED`), modest runs (pure 100, PGlite 25), so results stay reusable.
- Override: `STAGISTIC_FC_SEED=<int|random>`, `STAGISTIC_FC_RUNS=<n>`.
- Explore: `moon run root:verify -- --fresh root:test-explore`. Random seed, pure 2000 / PGlite 800 runs (`STAGISTIC_FC_EXPLORE=1`); the target is at most ~10 minutes in total. Manual only: end of feature work or before merge. Not part of `test`, `test-all`, `test-related` or hooks.
- On failure the task prints `Replay: STAGISTIC_FC_EXPLORE=1 STAGISTIC_FC_SEED=<seed> node_modules/.bin/vp test run <file>`. fast-check also prints `path`; pass it as a `path` parameter to jump to the shrunk case.

## Counterexamples

Every shrunk counterexample becomes a named example test beside its oracle. Fix the bug, or record a documented exception in the oracle; never add an exception just to go green. A known, undecided loss is kept as `it.fails` with its reason until decided.

## Sabotage check

Each new oracle needs a recorded proof it can fail: temporarily break the code under test (drop a field, reorder, swallow an error), confirm the oracle fails, then revert. Record it in the ticket.

## Independence rule

An oracle never imports the production logic it checks, only types and constants. Otherwise bug and check agree. Use a simple model, the inverse operation, or a structural invariant.

## Backlog

- app-core optimistic layer (`createReactiveCollection`, optimistic actions, `fc.scheduledModelRun` race tests, browser tests).
- Repository domains beyond characters/groups: comments, music, locations, snapshot CRUD, settings, title page, scripts list.
- Mutation testing (Stryker).
