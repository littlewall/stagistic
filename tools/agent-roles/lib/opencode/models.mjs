import {spawnSync} from 'node:child_process';

const LIST_TIMEOUT_MS = 30_000;

/** Live OpenCode Go model ids from `opencode models`; `error` explains why the list is unavailable. */
export const listGoModels = ({cwd, env = {}}) => {
    const result = spawnSync('opencode', ['models'], {
        cwd,
        env: {...process.env, ...env},
        input: '',
        encoding: 'utf8',
        timeout: LIST_TIMEOUT_MS,
    });

    if (result.error) return {
        models: [],
        error: result.error.code === 'ENOENT' ? 'opencode not installed' : result.error.message,
        spawnError: result.error,
    };

    if (result.status !== 0) return {models: [], error: `opencode models exited ${result.status}: ${result.stderr.trim()}`};

    return {models: result.stdout.split('\n').map(line => line.trim()).filter(line => line.startsWith('opencode-go/'))};
};

/** Go models missing from the tier table, and configured models the subscription no longer offers. */
export const modelReport = (config, available) => {
    const known = Object.keys(config.tiers.opencode ?? {});

    return {
        unclassified: available.filter(model => !known.includes(model)),
        missing: known.filter(model => !available.includes(model)),
    };
};
