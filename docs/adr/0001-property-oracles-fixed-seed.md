# Property oracles: fixed seed in `test`, random exploration only by hand

Core data operations (`.stagistic` and `.stepkg` codecs, the document projection, pagination, `ScriptRepository`) are checked by fast-check properties against independent oracles: round-trips, invariants and simple reference models that never import the production logic they check. The regular `test` tasks run these properties with a fixed seed and modest run counts, because the shared verification runner reuses successful results only for identical inputs, and a random seed would make a passing run unrepeatable. Random-seed exploration with more runs lives in a separate `root:test-explore` task, run only by hand at the end of feature development or before a merge (always `--fresh`, never in `test-all` or continuous testing); every counterexample it finds is shrunk and kept as an ordinary regression test beside its oracle.

## Considered Options

- Random seed in every run: more coverage over time, but flaky-looking failures during unrelated work and no result reuse.
- Exploration inside `test-all`: makes the mandatory merge gate slow and non-deterministic.
