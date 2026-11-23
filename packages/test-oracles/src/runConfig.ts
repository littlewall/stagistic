import type {Parameters} from 'fast-check';

export const FC_SEED_ENV = 'STAGISTIC_FC_SEED';
export const FC_RUNS_ENV = 'STAGISTIC_FC_RUNS';

/*
 * Fixed default seed: regular runs are deterministic so shared verification
 * results stay reusable (docs/adr/0001-property-oracles-fixed-seed.md).
 */
export const DEFAULT_FC_SEED = 20_261_120;

/* `pure` = in-memory functions; `pglite` = properties that open a PGlite database per run. */
export type OracleKind = 'pure' | 'pglite';

export const DEFAULT_FC_RUNS: Record<OracleKind, number> = {
    pure: 100,
    pglite: 25,
};

export const FC_EXPLORE_ENV = 'STAGISTIC_FC_EXPLORE';

/* Explore mode (`root:test-explore`): more runs; random seed unless STAGISTIC_FC_SEED is set. */
export const EXPLORE_FC_RUNS: Record<OracleKind, number> = {
    pure: 2000,
    pglite: 800,
};

type OracleEnv = Record<string, string | undefined>;

const parseInteger = (name: string, raw: string): number => {
    if (!(/^-?\d+$/u).test(raw.trim())) {
        throw new Error(`${name} must be an integer, got "${raw}".`);
    }

    return Number(raw.trim());
};

/*
 * Resolves fast-check parameters from the environment.
 * - STAGISTIC_FC_SEED: integer, or `random` for a fresh seed (exploration).
 * - STAGISTIC_FC_EXPLORE=1: random seed and larger default runs (set by root:test-explore).
 * - STAGISTIC_FC_RUNS: positive integer overriding the default run count.
 * fast-check's failure report prints `seed` and `path`; keep it as is for replay.
 */
export const resolveOracleParameters = (
    kind: OracleKind = 'pure',
    env: OracleEnv = process.env,
): Pick<Parameters<unknown>, 'seed' | 'numRuns'> => {
    const rawSeed = env[FC_SEED_ENV]?.trim();
    const rawRuns = env[FC_RUNS_ENV]?.trim();
    const explore = env[FC_EXPLORE_ENV]?.trim() === '1';
    let seed = explore ? Math.floor(Math.random() * 0x1_0000_0000) : DEFAULT_FC_SEED;
    let numRuns = (explore ? EXPLORE_FC_RUNS : DEFAULT_FC_RUNS)[kind];

    if (rawSeed) {
        seed = rawSeed === 'random'
            ? Math.floor(Math.random() * 0x1_0000_0000)
            : parseInteger(FC_SEED_ENV, rawSeed);
    }

    if (rawRuns) {
        numRuns = parseInteger(FC_RUNS_ENV, rawRuns);

        if (numRuns < 1) {
            throw new Error(`${FC_RUNS_ENV} must be at least 1, got "${rawRuns}".`);
        }
    }

    return {seed, numRuns};
};

export const oracleParameters = (kind: OracleKind = 'pure'): Parameters<unknown> => resolveOracleParameters(kind);
