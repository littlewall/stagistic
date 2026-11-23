import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    DEFAULT_FC_SEED,
    EXPLORE_FC_RUNS,
    resolveOracleParameters,
} from './runConfig';

describe('resolveOracleParameters', () => {
    it('defaults to a fixed seed with 100 runs for pure properties', () => {
        expect(resolveOracleParameters('pure', {})).toEqual({seed: DEFAULT_FC_SEED, numRuns: 100});
    });

    it('uses a smaller default run count for PGlite properties', () => {
        expect(resolveOracleParameters('pglite', {})).toEqual({seed: DEFAULT_FC_SEED, numRuns: 25});
    });

    it('reads seed and runs from the environment', () => {
        expect(resolveOracleParameters('pure', {STAGISTIC_FC_SEED: '42', STAGISTIC_FC_RUNS: '7'})).toEqual({seed: 42, numRuns: 7});
    });

    it('uses larger default run counts in explore mode', () => {
        expect(resolveOracleParameters('pure', {STAGISTIC_FC_EXPLORE: '1'}).numRuns).toBe(EXPLORE_FC_RUNS.pure);
        expect(resolveOracleParameters('pglite', {STAGISTIC_FC_EXPLORE: '1'}).numRuns).toBe(EXPLORE_FC_RUNS.pglite);
    });

    it('explore mode draws a random seed unless one is set', () => {
        const random = resolveOracleParameters('pure', {STAGISTIC_FC_EXPLORE: '1'});

        expect(random.seed).not.toBe(DEFAULT_FC_SEED);
        expect(resolveOracleParameters('pure', {
            STAGISTIC_FC_EXPLORE: '1',
            STAGISTIC_FC_SEED: '5',
            STAGISTIC_FC_RUNS: '3',
        })).toEqual({seed: 5, numRuns: 3});
    });

    it('draws a fresh integer seed for `random`', () => {
        const {seed} = resolveOracleParameters('pure', {STAGISTIC_FC_SEED: 'random'});

        expect(Number.isInteger(seed)).toBe(true);
    });

    it('rejects malformed values instead of silently falling back', () => {
        expect(() => resolveOracleParameters('pure', {STAGISTIC_FC_SEED: 'abc'})).toThrow(/STAGISTIC_FC_SEED/u);
        expect(() => resolveOracleParameters('pure', {STAGISTIC_FC_RUNS: '0'})).toThrow(/STAGISTIC_FC_RUNS/u);
    });
});
