import assert from 'node:assert/strict';
import {
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterEach, it} from 'node:test';

import {
    defaultConfigPath,
    loadConfig,
    resolveRole,
    validateConfig,
} from '../lib/config.mjs';
import {syncAgents} from '../lib/sync.mjs';

const dirs = [];

afterEach(() => dirs.splice(0).forEach(dir => rmSync(dir, {recursive: true, force: true})));

const setup = roles => {
    const cwd = mkdtempSync(path.join(tmpdir(), 'go-config-'));

    dirs.push(cwd);

    const layer = path.join(cwd, 'override.json');

    writeFileSync(layer, JSON.stringify({roles}));

    return loadConfig({files: [defaultConfigPath, layer]});
};
const go = {
    provider: 'opencode',
    model: 'opencode-go/glm-5.2',
    effort: 'high',
};

it('permits OpenCode Go write and execute roles with a same-tier Claude fallback', () => {
    const config = setup({implementer: go, verifier: go});

    assert.deepEqual(validateConfig(config), []);
    assert.deepEqual(resolveRole(config, 'implementer').fallback, {model: 'sonnet', effort: 'high'});
});

it('validates Go effort against the specific model, not just the provider', () => {
    const config = setup({implementer: {...go, effort: 'low'}});

    assert.ok(validateConfig(config).some(error => error.includes('not valid for opencode-go/glm-5.2')));
});

it('allows a model with no reasoning variant through the explicit default effort', () => {
    const config = setup({scout: {
        provider: 'opencode',
        model: 'opencode-go/kimi-k2.7-code',
        effort: 'default',
    }});

    assert.deepEqual(validateConfig(config), []);
});

it('reports a malformed Go model as a config error instead of throwing', () => {
    assert.ok(validateConfig(setup({scout: {...go, model: null}})).length > 0);
});

it('keeps Codex and Antigravity write/execute roles forbidden', () => {
    const config = setup({implementer: {
        provider: 'codex',
        model: 'gpt-6.1-sol',
        effort: 'high',
    }});

    assert.ok(validateConfig(config).some(error => error.includes('write roles must use provider')));
});

it('generates OpenCode role permissions alongside Claude fallbacks', async () => {
    const {mkdirSync} = await import('node:fs');
    const cwd = mkdtempSync(path.join(tmpdir(), 'go-sync-'));

    dirs.push(cwd);
    mkdirSync(path.join(cwd, '.agents'));
    writeFileSync(path.join(cwd, '.agents/roles.json'), JSON.stringify({roles: {
        scout: {
            provider: 'opencode',
            model: 'opencode-go/glm-5.3-flash',
            effort: 'low',
        },
        implementer: go,
    }}));
    assert.deepEqual(syncAgents({cwd}).errors, []);

    const scout = readFileSync(path.join(cwd, '.opencode/agents/roles-scout.md'), 'utf8');
    const writer = readFileSync(path.join(cwd, '.opencode/agents/roles-implementer.md'), 'utf8');

    assert.match(scout, /"edit": "deny"/);
    assert.match(scout, /"bash": "deny"/);
    assert.match(writer, /"edit": "allow"/);
    assert.match(writer, /"git \*": "deny"/);
    assert.match(readFileSync(path.join(cwd, '.claude/agents/implementer.md'), 'utf8'), /external: opencode\//);
    assert.deepEqual(syncAgents({cwd, check: true}).drift, []);
    assert.deepEqual(syncAgents({cwd}).written, []);
});

it('accepts an ordered same-tier Go candidate list and resolves its first model', () => {
    const config = setup({implementer: {
        provider: 'opencode',
        models: ['opencode-go/glm-5.2', 'opencode-go/glm-5.3'],
        effort: 'high',
    }});
    const resolved = resolveRole(config, 'implementer');

    assert.deepEqual(validateConfig(config), []);
    assert.equal(resolved.model, 'opencode-go/glm-5.2');
    assert.deepEqual(resolved.models, ['opencode-go/glm-5.2', 'opencode-go/glm-5.3']);
    assert.equal(resolved.tier, 'mid');
    assert.equal(config.roles.implementer.model, undefined);
});

it('rejects Go candidates of mixed tiers or without the role effort', () => {
    const mixed = setup({implementer: {
        provider: 'opencode',
        models: ['opencode-go/glm-5.2', 'opencode-go/glm-5.3-flash'],
        effort: 'high',
    }});
    const effort = setup({implementer: {
        provider: 'opencode',
        models: ['opencode-go/glm-5.2', 'opencode-go/kimi-k2.7-code'],
        effort: 'high',
    }});

    assert.ok(validateConfig(mixed).some(error => error.includes('same tier')));
    assert.ok(validateConfig(effort).some(error => error.includes('not valid for opencode-go/kimi-k2.7-code')));
    assert.ok(validateConfig(setup({implementer: {...go, models: []}})).some(error => error.includes('models')));
});

it('allows a candidate list only for OpenCode roles', () => {
    const config = setup({reviewer: {
        provider: 'codex',
        models: ['gpt-6.1-sol'],
        effort: 'high',
    }});

    assert.ok(validateConfig(config).some(error => error.includes('only for opencode')));
});
