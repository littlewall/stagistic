import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, it} from 'node:test';

import {
    ConfigError,
    defaultConfigPath,
    loadConfig,
    resolveRole,
    validateConfig,
} from '../lib/config.mjs';

const writeJson = (dir, name, value) => {
    const file = join(dir, name);

    writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value));

    return file;
};

const load = (...overrides) => {
    const dir = mkdtempSync(join(tmpdir(), 'agent-roles-'));
    const files = overrides.map((value, index) => writeJson(dir, `layer${index}.json`, value));

    return loadConfig({files: [defaultConfigPath, ...files]});
};

describe('loadConfig', () => {
    it('merges later layers over earlier ones', () => {
        const config = load(
            {roles: {reviewer: {
                provider: 'codex',
                model: 'gpt-6.1-terra',
                effort: 'medium',
            }}},
            {roles: {reviewer: {model: 'gpt-6.1-sol', effort: 'high'}}},
        );
        const reviewer = resolveRole(config, 'reviewer');

        assert.equal(reviewer.provider, 'codex');
        assert.equal(reviewer.model, 'gpt-6.1-sol');
        assert.equal(reviewer.effort, 'high');
        assert.equal(reviewer.kind, 'read');
        assert.deepEqual(validateConfig(config), []);
    });

    it('skips missing layer files', () => {
        const config = loadConfig({files: [defaultConfigPath, join(tmpdir(), 'agent-roles-missing.json')]});

        assert.equal(resolveRole(config, 'scout').model, 'haiku');
    });

    it('reports malformed JSON with file path', () => {
        const dir = mkdtempSync(join(tmpdir(), 'agent-roles-'));
        const file = writeJson(dir, 'broken.json', '{"roles": ');

        assert.throws(() => loadConfig({files: [defaultConfigPath, file]}), error => {
            assert.ok(error instanceof ConfigError);
            assert.ok(error.message.startsWith(file));

            return true;
        });
    });

    it('rejects unknown role and kind/tools overrides', () => {
        assert.throws(() => load({roles: {ghost: {model: 'haiku'}}}), /unknown role ghost/);
        assert.throws(() => load({roles: {scout: {kind: 'write'}}}), /kind\/tools are fixed by agent-roles/);
        assert.throws(() => load({roles: {scout: {tools: ['Write']}}}), /kind\/tools are fixed by agent-roles/);
    });
});

describe('loadConfig shape errors', () => {
    for (const [label, value] of Object.entries({
        'null layer': 'null',
        'null role': {roles: {scout: null}},
        'string role': {roles: {scout: 'codex'}},
        'array roles': {roles: []},
    })) {
        it(`reports ${label} with file path`, () => {
            const dir = mkdtempSync(join(tmpdir(), 'agent-roles-'));
            const file = writeJson(dir, 'shape.json', value);

            assert.throws(() => loadConfig({files: [defaultConfigPath, file]}), error => {
                assert.ok(error instanceof ConfigError, error.stack);
                assert.ok(error.message.startsWith(file));

                return true;
            });
        });
    }
});

describe('validateConfig', () => {
    it('accepts defaults', () => {
        assert.deepEqual(validateConfig(load()), []);
    });

    it('rejects external provider for write role', () => {
        const errors = validateConfig(load({roles: {implementer: {provider: 'codex', model: 'gpt-6.1-sol'}}}));

        assert.ok(errors.includes('implementer: write roles must use provider claude or opencode'), errors.join('\n'));
    });

    it('rejects external provider for execute role', () => {
        const errors = validateConfig(load({roles: {verifier: {provider: 'agy', model: 'gemini-3.8-flash-low'}}}));

        assert.ok(errors.includes('verifier: execute roles must use provider claude or opencode'), errors.join('\n'));
    });

    it('rejects unknown provider', () => {
        const errors = validateConfig(load({roles: {scout: {provider: 'gemini'}}}));

        assert.ok(errors.includes('scout: unknown provider gemini'), errors.join('\n'));
    });

    it('rejects model missing from tier table', () => {
        const errors = validateConfig(load({roles: {reviewer: {
            provider: 'codex',
            model: 'x',
            effort: 'high',
        }}}));

        assert.ok(errors.includes('reviewer: model x not in tiers.codex'), errors.join('\n'));
    });

    it('rejects invalid effort', () => {
        const errors = validateConfig(load({roles: {reviewer: {
            provider: 'codex',
            model: 'gpt-6.1-sol',
            effort: 'huge',
        }}}));

        assert.ok(errors.includes('reviewer: effort huge not valid for codex'), errors.join('\n'));
    });

    it('rejects claude tier gap', () => {
        const config = load({roles: {reviewer: {
            provider: 'codex',
            model: 'gpt-6.1-sol',
            effort: 'high',
        }}});

        delete config.tiers.claude.opus;

        const errors = validateConfig(config);

        assert.ok(errors.includes('reviewer: no Claude model for tier high'), errors.join('\n'));
    });

    it('rejects two Claude models in one tier', () => {
        const errors = validateConfig(load({tiers: {claude: {fable: 'high'}}}));

        assert.ok(errors.includes('tiers.claude: tier high has several models (opus, fable)'), errors.join('\n'));
    });
});

describe('resolveRole', () => {
    it('resolves fallback to same-tier Claude model with mapped effort', () => {
        const config = load({roles: {reviewer: {
            provider: 'codex',
            model: 'gpt-6.1-sol',
            effort: 'ultra',
        }}});
        const reviewer = resolveRole(config, 'reviewer');

        assert.equal(reviewer.tier, 'high');
        assert.deepEqual(reviewer.fallback, {model: 'opus', effort: 'max'});
    });

    it('has no fallback for claude roles', () => {
        const scout = resolveRole(load(), 'scout');

        assert.equal(scout.provider, 'claude');
        assert.equal(scout.fallback, null);
        assert.equal(scout.tier, 'low');
        assert.deepEqual(scout.tools, [
            'Read',
            'Grep',
            'Glob',
            'Bash',
        ]);
    });
});
