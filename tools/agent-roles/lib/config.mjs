import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const defaultConfigPath = path.join(toolRoot, 'roles.default.json');

const PROVIDERS = [
    'claude',
    'codex',
    'agy',
    'opencode',
];
const FIXED_ROLE_FIELDS = ['kind', 'tools'];
const MERGED_MAPS = [
    'tiers',
    'effortToClaude',
    'modelEfforts',
];

export class ConfigError extends Error {
    name = 'ConfigError';
}

/*
 * Layer files, later wins: tool defaults → repository override.
 * No user layer: generated agent files are committed and must not depend on one machine.
 */
export const configFiles = ({cwd}) => [defaultConfigPath, path.join(cwd, '.agents', 'roles.json')];

const isPlainObject = value => typeof value === 'object' && value !== null && !Array.isArray(value);

const readLayer = file => {
    try {
        const layer = JSON.parse(readFileSync(file, 'utf8'));

        if (!isPlainObject(layer) || (layer.roles !== undefined && !isPlainObject(layer.roles))) {
            throw new ConfigError('expected an object with an optional "roles" object');
        }

        return layer;
    } catch (error) {
        throw new ConfigError(`${file}: ${error.message}`);
    }
};

/** `model` and the OpenCode candidate list `models` replace each other across layers and overrides. */
export const withModelFields = (role, fields) => {
    const merged = {...role, ...fields};

    if ('models' in fields && !('model' in fields)) delete merged.model;

    if ('model' in fields && !('models' in fields)) delete merged.models;

    return merged;
};

const mergeLayer = (config, layer, file) => {
    for (const [role, fields] of Object.entries(layer.roles ?? {})) {
        if (!config.roles[role]) {
            throw new ConfigError(`${file}: unknown role ${role}`);
        }

        if (!isPlainObject(fields)) {
            throw new ConfigError(`${file}: ${role}: expected an object with provider/model/effort`);
        }

        if (FIXED_ROLE_FIELDS.some(field => field in fields)) {
            throw new ConfigError(`${file}: ${role}: kind/tools are fixed by agent-roles`);
        }

        config.roles[role] = withModelFields(config.roles[role], fields);
    }

    for (const key of MERGED_MAPS) {
        config[key] ??= {};
        for (const [provider, map] of Object.entries(layer[key] ?? {})) {
            config[key][provider] = {...config[key][provider], ...map};
        }
    }

    for (const [provider, list] of Object.entries(layer.efforts ?? {})) {
        config.efforts[provider] = list;
    }

    if (layer.timeoutSeconds !== undefined) {
        config.timeoutSeconds = layer.timeoutSeconds;
    }
};

export const loadConfig = ({
    cwd = process.cwd(),
    files = configFiles({cwd}),
} = {}) => {
    const [first, ...rest] = files;
    const config = readLayer(first);

    for (const file of rest) {
        if (existsSync(file)) {
            mergeLayer(config, readLayer(file), file);
        }
    }

    return config;
};

const claudeModelForTier = (config, tier) => Object.entries(config.tiers.claude ?? {})
    .filter(([, modelTier]) => modelTier === tier)
    .map(([model]) => model);

/** OpenCode roles may list same-tier candidates in preference order; others have one model. */
export const roleModels = ({model, models}) => models ?? [model];

/** Go-only checks for every candidate: namespace, model variant, tier table and a shared tier. */
const validateGoModels = (config, role, {
    provider,
    models,
    effort,
}, candidates) => {
    if (provider !== 'opencode') return models === undefined ? [] : [`${role}: models list is only for opencode roles`];

    const errors = candidates.flatMap((model, index) => {
        if (typeof model !== 'string' || !model.startsWith('opencode-go/')) return [`${role}: opencode roles must use an opencode-go/ model`];

        // The first candidate's tier is reported by validateRole.
        if (index > 0 && !config.tiers.opencode?.[model]) return [`${role}: model ${model} not in tiers.opencode`];

        return config.modelEfforts?.opencode?.[model]?.includes(effort) ? [] : [`${role}: effort ${effort} not valid for ${model}`];
    });
    const tiers = new Set(candidates.map(model => config.tiers.opencode?.[model]).filter(Boolean));

    if (tiers.size > 1) errors.push(`${role}: models must share the same tier (${[...tiers].join(', ')})`);

    return errors;
};

const validateRole = (config, role, fields) => {
    const {
        kind,
        provider,
        effort,
    } = fields;

    if (!PROVIDERS.includes(provider)) {
        return [`${role}: unknown provider ${provider}`];
    }

    if (fields.models !== undefined && (!Array.isArray(fields.models) || fields.models.length === 0)) {
        return [`${role}: models must be a nonempty array`];
    }

    const candidates = roleModels(fields);
    const [model] = candidates;
    const errors = validateGoModels(config, role, fields, candidates);

    if (kind !== 'read' && !['claude', 'opencode'].includes(provider)) {
        errors.push(`${role}: ${kind} roles must use provider claude or opencode`);
    }

    const tier = config.tiers[provider]?.[model];

    if (!tier) {
        errors.push(`${role}: model ${model} not in tiers.${provider}`);
    }

    if (!config.efforts[provider]?.includes(effort)) {
        errors.push(`${role}: effort ${effort} not valid for ${provider}`);
    }

    if (provider !== 'claude' && tier) {
        if (claudeModelForTier(config, tier).length === 0) {
            errors.push(`${role}: no Claude model for tier ${tier}`);
        }

        if (!config.effortToClaude[provider]?.[effort]) {
            errors.push(`${role}: no effortToClaude.${provider} mapping for ${effort}`);
        }
    }

    return errors;
};

/** Human-readable errors; empty when the config is valid. */
export const validateConfig = config => {
    const errors = [];
    const byTier = Object.groupBy(Object.keys(config.tiers.claude ?? {}), model => config.tiers.claude[model]);

    for (const [tier, models] of Object.entries(byTier)) {
        if (models.length > 1) {
            errors.push(`tiers.claude: tier ${tier} has several models (${models.join(', ')})`);
        }
    }

    for (const [role, fields] of Object.entries(config.roles)) {
        errors.push(...validateRole(config, role, fields));
    }

    return errors;
};

/** Role with its tier and, for external providers, the same-tier Claude fallback. */
export const resolveRole = (config, role) => {
    const fields = config.roles[role];

    if (!fields) {
        throw new ConfigError(`unknown role ${role}`);
    }

    const {
        kind,
        provider,
        effort,
        tools,
    } = fields;
    const models = roleModels(fields);
    const [model] = models;
    const tier = config.tiers[provider]?.[model] ?? null;
    const fallback = provider === 'claude'
        ? null
        : {model: claudeModelForTier(config, tier)[0] ?? null, effort: config.effortToClaude[provider]?.[effort] ?? null};

    return {
        role,
        kind,
        provider,
        model,
        models,
        effort,
        tier,
        tools,
        fallback,
    };
};
