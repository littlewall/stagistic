import assert from 'node:assert/strict';
import {
    mkdirSync,
    mkdtempSync,
    writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {describe, it} from 'node:test';
import {fileURLToPath} from 'node:url';

import {runAsk} from '../lib/run.mjs';

const fakeBin = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'bin');

const repoWith = roles => {
    const cwd = mkdtempSync(path.join(tmpdir(), 'agent-roles-repo-'));

    mkdirSync(path.join(cwd, '.agents'));
    writeFileSync(path.join(cwd, '.agents', 'roles.json'), JSON.stringify({roles}));

    return cwd;
};

const ask = options => runAsk({
    role: 'reviewer',
    prompt: 'Say ok',
    home: mkdtempSync(path.join(tmpdir(), 'agent-roles-home-')),
    cwd: repoWith({reviewer: {
        provider: 'codex',
        model: 'gpt-6.1-sol',
        effort: 'high',
    }}),
    ...options,
    env: {PATH: `${fakeBin}:/usr/bin:/bin:${path.dirname(process.execPath)}`, ...options?.env},
});

describe('runAsk', () => {
    it('passes prompt with quotes, newlines and leading dash verbatim', async () => {
        const prompt = '-x "quoted" \'single\'\nsecond line $HOME';

        for (const provider of ['codex', 'agy']) {
            const model = provider === 'codex' ? 'gpt-6.1-sol' : 'claude-opus-4-6-thinking';
            const result = await ask({
                prompt,
                cwd: repoWith({reviewer: {
                    provider,
                    model,
                    effort: 'high',
                }}),
            });

            assert.equal(result.exitCode, 0, provider);
            assert.equal(result.output, prompt, provider);
        }
    });

    it('exits 3 with fallback when logged out', async () => {
        const result = await ask({env: {FAKE_MODE: 'logged-out'}});

        assert.equal(result.exitCode, 3);
        assert.match(result.message, /codex unavailable \(not logged in\)\. Fix: run `codex login`\. Fallback: opus\/high \(subagent reviewer\)/);
    });

    it('exits 3 quickly when agy waits for authentication', async () => {
        const started = Date.now();
        const result = await ask({
            cwd: repoWith({reviewer: {
                provider: 'agy',
                model: 'claude-opus-4-6-thinking',
                effort: 'high',
            }}),
            env: {FAKE_MODE: 'logged-out'},
        });

        assert.equal(result.exitCode, 3);
        assert.ok(Date.now() - started < 5000);
    });

    it('exits 1 when a failing codex echoes a prompt mentioning quota or login', async () => {
        const result = await ask({prompt: 'Review the quota and login handling', env: {FAKE_MODE: 'fail-echo'}});

        assert.equal(result.exitCode, 1);
        assert.match(result.message, /model gpt-x not found/);
    });

    it('exits 3 when quota is exhausted', async () => {
        const result = await ask({env: {FAKE_MODE: 'quota'}});

        assert.equal(result.exitCode, 3);
        assert.match(result.message, /quota/);
    });

    it('exits 3 when the CLI is missing', async () => {
        const result = await ask({env: {PATH: '/nonexistent'}});

        assert.equal(result.exitCode, 3);
        assert.match(result.message, /not installed/);
    });

    it('exits 1 on task failure and on timeout', async () => {
        assert.equal((await ask({env: {FAKE_MODE: 'fail'}})).exitCode, 1);

        const slow = await ask({env: {FAKE_MODE: 'slow'}, timeoutSeconds: 1});

        assert.equal(slow.exitCode, 1);
        assert.match(slow.message, /timed out/);
    });

    it('exits 2 for claude-provider and write roles', async () => {
        const claude = await ask({cwd: repoWith({})});

        assert.equal(claude.exitCode, 2);
        assert.match(claude.message, /runs as Claude subagent/);
        assert.equal((await ask({role: 'implementer'})).exitCode, 2);
    });

    it('exits 2 for invalid config', async () => {
        const result = await ask({overrides: {model: 'nope'}});

        assert.equal(result.exitCode, 2);
        assert.match(result.message, /model nope not in tiers\.codex/);
    });

    it('applies per-call overrides', async () => {
        const result = await ask({
            overrides: {
                provider: 'agy',
                model: 'gemini-3.8-flash-low',
                effort: 'low',
            },
            env: {FAKE_MODE: 'args'},
        });

        assert.equal(result.exitCode, 0);
        assert.ok(JSON.parse(result.output).includes('gemini-3.8-flash-low'));
    });

    const agyReviewer = () => repoWith({reviewer: {
        provider: 'agy',
        model: 'claude-opus-4-6-thinking',
        effort: 'high',
    }});

    it('exits 1 when agy exits 0 with an empty answer and denied actions', async () => {
        const result = await ask({cwd: agyReviewer(), env: {FAKE_MODE: 'denied'}});

        assert.equal(result.exitCode, 1);
        assert.match(result.message, /agy failed: denied actions: write_file/);
    });

    it('exits 1 when agy exits 0 with status ERROR', async () => {
        const result = await ask({cwd: agyReviewer(), env: {FAKE_MODE: 'error-exit0'}});

        assert.equal(result.exitCode, 1);
        assert.match(result.message, /agy failed: model exploded/);
    });

    it('exits 3 when agy exits 0 with an authentication error', async () => {
        const result = await ask({cwd: agyReviewer(), env: {FAKE_MODE: 'auth-exit0'}});

        assert.equal(result.exitCode, 3);
    });

    it('exits 1 when codex exits 0 without a final message', async () => {
        const result = await ask({env: {FAKE_MODE: 'no-output'}});

        assert.equal(result.exitCode, 1);
        assert.match(result.message, /codex failed: no final message/);
    });

    it('names the stored role fallback when a one-off override is unavailable', async () => {
        const fromExternal = await ask({
            overrides: {
                provider: 'agy',
                model: 'gemini-3.8-flash-low',
                effort: 'low',
            },
            env: {FAKE_MODE: 'logged-out'},
        });

        assert.equal(fromExternal.exitCode, 3);
        assert.match(fromExternal.message, /Fallback: opus\/high \(subagent reviewer\)/);

        const fromClaude = await ask({
            cwd: repoWith({reviewer: {
                provider: 'claude',
                model: 'sonnet',
                effort: 'medium',
            }}),
            overrides: {
                provider: 'codex',
                model: 'gpt-6.1-sol',
                effort: 'high',
            },
            env: {FAKE_MODE: 'logged-out'},
        });

        assert.equal(fromClaude.exitCode, 3);
        assert.match(fromClaude.message, /Fallback: sonnet\/medium \(subagent reviewer\)/);
    });
});
