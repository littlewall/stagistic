import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {
    chmodSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterEach, it} from 'node:test';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';

import {runAsk} from '../lib/run.mjs';
import {syncAgents} from '../lib/sync.mjs';

const bin = fileURLToPath(new URL('./fixtures/bin', import.meta.url));
const dirs = [];

afterEach(() => dirs.splice(0).forEach(dir => rmSync(dir, {recursive: true, force: true})));

const setup = () => {
    const cwd = mkdtempSync(path.join(tmpdir(), 'go-runtime-'));

    dirs.push(cwd);
    mkdirSync(path.join(cwd, '.agents'));

    const go = {
        provider: 'opencode',
        model: 'opencode-go/glm-5.3-flash',
        effort: 'low',
    };

    writeFileSync(path.join(cwd, '.agents/roles.json'), JSON.stringify({roles: {
        scout: go,
        verifier: go,
        implementer: {
            provider: 'opencode',
            model: 'opencode-go/glm-5.2',
            effort: 'high',
        },
    }}));
    syncAgents({cwd});

    const env = {PATH: `${bin}:/usr/bin:/bin:${path.dirname(process.execPath)}`};

    return {
        cwd,
        env,
        ask: extra => runAsk({
            cwd,
            role: 'implementer',
            task: 'feature-a',
            prompt: 'Do the task',
            ...extra,
            env: {...env, ...extra?.env},
        }),
    };
};
const state = (cwd, task = 'feature-a', role = 'implementer') => JSON.parse(readFileSync(path.join(cwd, '.scratch/agent-roles', task, role, 'session.json'), 'utf8'));

it('runs a Go write role directly with private process isolation and exact stdin', async () => {
    const {ask} = setup();
    const prompt = '-quoted "text"\n$HOME `literal`';
    const result = await ask({prompt, env: {FAKE_GO_MODE: 'args'}});

    assert.equal(result.exitCode, 0, result.message);

    const answer = JSON.parse(result.output);

    assert.equal(answer.prompt, prompt);
    assert.ok(answer.args.includes('--standalone'));
    assert.ok(answer.args.includes('opencode-go/glm-5.2#high'));
    assert.equal(answer.args[answer.args.indexOf('--agent') + 1], 'roles-implementer');
    assert.match(answer.permissions, /"edit": "allow"/);
    assert.ok(existsSync(path.join(result.logDir, 'stdout.jsonl')));
});

it('resumes the same task and role, while keeping other tasks and roles separate', async () => {
    const {cwd, ask} = setup();

    assert.equal((await ask()).exitCode, 0);

    const first = state(cwd).sessionId;
    const again = await ask({env: {FAKE_GO_MODE: 'args'}});
    const args = JSON.parse(again.output).args;

    assert.equal(args[args.indexOf('--session') + 1], first);
    await ask({task: 'feature-b'});
    await ask({role: 'scout'});
    assert.notEqual(state(cwd, 'feature-b').sessionId, first);
    assert.notEqual(state(cwd, 'feature-a', 'scout').sessionId, first);
});

it('requires a safe explicit task key and fresh generated agent definitions', async () => {
    const {cwd, ask} = setup();

    assert.equal((await ask({task: undefined})).exitCode, 2);
    assert.equal((await ask({task: '../escape'})).exitCode, 2);
    writeFileSync(path.join(cwd, '.opencode/agents/roles-implementer.md'), 'stale');

    const result = await ask();

    assert.equal(result.exitCode, 2);
    assert.match(result.message, /sync/);
});

it('starts fresh when the configured effort changes instead of mixing targets in one session', async () => {
    const {cwd, ask} = setup();

    await ask();

    const file = path.join(cwd, '.agents/roles.json');
    const config = JSON.parse(readFileSync(file, 'utf8'));

    config.roles.implementer.effort = 'max';
    writeFileSync(file, JSON.stringify(config));
    syncAgents({cwd});

    const result = await ask({env: {FAKE_GO_MODE: 'args'}});

    assert.equal(result.exitCode, 0, result.message);
    assert.equal(JSON.parse(result.output).args.includes('--session'), false);
});

it('omits the variant suffix for models configured with default effort', async () => {
    const {cwd, ask} = setup();
    const file = path.join(cwd, '.agents/roles.json');
    const config = JSON.parse(readFileSync(file, 'utf8'));

    config.roles.implementer = {
        provider: 'opencode',
        model: 'opencode-go/kimi-k2.7-code',
        effort: 'default',
    };
    writeFileSync(file, JSON.stringify(config));
    syncAgents({cwd});

    const result = await ask({env: {FAKE_GO_MODE: 'args'}});

    assert.equal(result.exitCode, 0, result.message);
    assert.ok(JSON.parse(result.output).args.includes('opencode-go/kimi-k2.7-code'));
});

it('keeps failed write sessions and logs without suggesting an automatic fallback', async () => {
    const {cwd, ask} = setup();
    const result = await ask({env: {FAKE_GO_MODE: 'quota'}});

    assert.equal(result.exitCode, 1);
    assert.doesNotMatch(result.message, /Fallback:/);
    assert.match(result.message, /inspect|review/i);
    assert.ok(state(cwd).sessionId);
    assert.equal(state(cwd).status, 'failed');
    assert.ok(existsSync(path.join(result.logDir, 'result.json')));
});

it('permits read-only provider-unavailable fallback, including JSON errors with exit zero', async () => {
    const {ask} = setup();
    const result = await ask({role: 'scout', env: {FAKE_GO_MODE: 'auth'}});

    assert.equal(result.exitCode, 3, result.message);
    assert.match(result.message, /Fallback: haiku\/low/);
});

it('rejects empty, malformed and unfinished zero-exit responses', async () => {
    const {ask} = setup();

    for (const mode of [
        'empty',
        'malformed',
        'unfinished',
    ]) {
        const result = await ask({env: {FAKE_GO_MODE: mode}});

        assert.equal(result.exitCode, 1, `${mode}: ${result.message}`);
    }
});

it('updates streamed text parts without duplicating assistant text or classifying ordinary quota words as errors', async () => {
    const {ask} = setup();
    const result = await ask({prompt: 'Review the quota handling', env: {FAKE_GO_MODE: 'update'}});

    assert.equal(result.exitCode, 0);
    assert.equal(result.output, 'Review the quota handling updated');
});

it('refuses corrupt session state without overwriting it', async () => {
    const {cwd, ask} = setup();

    await ask();

    const file = path.join(cwd, '.scratch/agent-roles/feature-a/implementer/session.json');

    writeFileSync(file, '{broken');
    assert.equal((await ask()).exitCode, 2);
    assert.equal(readFileSync(file, 'utf8'), '{broken');
});

it('serializes writers across task keys and releases the lock only after timeout cleanup', async () => {
    const {cwd, ask} = setup();
    const ready = path.join(cwd, 'ready');
    const running = ask({timeoutSeconds: 0.6, env: {FAKE_GO_MODE: 'hang', FAKE_GO_READY: ready}});

    for (let i = 0; i < 100 && !existsSync(ready); i++) await delay(10);

    assert.ok(existsSync(ready));

    const competing = await ask({task: 'feature-b'});

    assert.equal(competing.exitCode, 1);
    assert.match(competing.message, /lock|writer/i);
    assert.equal((await running).exitCode, 1);
    assert.equal((await ask({task: 'feature-b'})).exitCode, 0);
});

for (const mode of ['child', 'detached-child']) it(`kills a worker ${mode} on timeout before another writer can start`, async () => {
    const {cwd, ask} = setup();
    const survivor = path.join(cwd, 'survivor');
    const childPid = path.join(cwd, 'child.pid');
    const pending = ask({
        timeoutSeconds: 1,
        env: {
            FAKE_GO_MODE: mode,
            FAKE_GO_SURVIVOR: survivor,
            FAKE_GO_CHILD_PID: childPid,
        },
    });

    for (let i = 0; i < 100 && !existsSync(childPid); i++) await delay(5);

    assert.ok(existsSync(childPid), 'the descendant must actually start for this test to prove cleanup');

    const result = await pending;

    assert.equal(result.exitCode, 1);
    await delay(1700);
    assert.equal(existsSync(survivor), false);
});

for (const signal of ['SIGTERM', 'SIGHUP']) it(`cancels the running CLI and descendant on ${signal} while preserving failure logs`, async () => {
    const {cwd, env} = setup();
    const childPid = path.join(cwd, 'cancel-child.pid');
    const survivor = path.join(cwd, 'cancel-survivor');
    const child = spawn(process.execPath, [
        fileURLToPath(new URL('../bin/ask.mjs', import.meta.url)),
        '--role',
        'implementer',
        '--task',
        'cancel',
        '--cwd',
        cwd,
        '-',
    ], {
        env: {
            ...process.env,
            ...env,
            FAKE_GO_MODE: 'child',
            FAKE_GO_SURVIVOR: survivor,
            FAKE_GO_CHILD_PID: childPid,
        },
        stdio: [
            'pipe',
            'ignore',
            'ignore',
        ],
    });

    child.stdin.end('Do the task');

    const completed = new Promise(resolve => child.on('close', resolve));

    for (let i = 0; i < 200 && !existsSync(childPid); i++) await delay(5);

    assert.ok(existsSync(childPid));
    child.kill(signal);
    assert.equal(await completed, 1);
    assert.equal(state(cwd, 'cancel').status, 'failed');
    await delay(1700);
    assert.equal(existsSync(survivor), false);
});

it('marks incomplete git snapshots explicitly instead of silently trusting partial output', async () => {
    const {cwd, ask} = setup();
    const fakeGit = path.join(cwd, 'snapshot-bin');

    mkdirSync(fakeGit);

    const script = path.join(fakeGit, 'git');

    writeFileSync(script, '#!/usr/bin/env node\nprocess.stdout.write("partial snapshot"); process.stderr.write("simulated snapshot failure"); process.exit(1);\n');
    chmodSync(script, 0o755);

    const previousPath = process.env.PATH;

    process.env.PATH = `${fakeGit}:${previousPath}`;
    try {
        const result = await ask();

        assert.equal(result.exitCode, 0);
        assert.match(result.message, /snapshot warning/i);
        assert.match(readFileSync(path.join(result.logDir, 'before.snapshot-errors.json'), 'utf8'), /simulated snapshot failure/);
    } finally {
        process.env.PATH = previousPath;
    }
});

const setCandidates = (cwd, models) => {
    const file = path.join(cwd, '.agents/roles.json');
    const config = JSON.parse(readFileSync(file, 'utf8'));

    config.roles.implementer = {
        provider: 'opencode',
        models,
        effort: 'high',
    };
    writeFileSync(file, JSON.stringify(config));
};

it('picks the first candidate available in OpenCode Go without a new sync', async () => {
    const {cwd, ask} = setup();

    setCandidates(cwd, ['opencode-go/glm-5.2', 'opencode-go/glm-5.3']);
    assert.deepEqual(syncAgents({cwd, check: true}).drift, []);

    const result = await ask({env: {FAKE_GO_MODE: 'args', FAKE_GO_MODELS: 'opencode-go/glm-5.3,opencode-go/glm-5.3-flash'}});

    assert.equal(result.exitCode, 0, result.message);
    assert.ok(JSON.parse(result.output).args.includes('opencode-go/glm-5.3#high'));
    assert.equal(state(cwd).model, 'opencode-go/glm-5.3');
});

it('returns a safe fallback before starting when no candidate is available', async () => {
    const {cwd, ask} = setup();
    const result = await ask({env: {FAKE_GO_MODELS: 'opencode-go/glm-5.3-flash'}});

    assert.equal(result.exitCode, 3);
    assert.match(result.message, /opencode-go\/glm-5\.2/);
    assert.match(result.message, /agents-models/);
    assert.match(result.message, /Fallback: sonnet\/high \(subagent implementer\)/);
    assert.equal(existsSync(path.join(cwd, '.scratch/agent-roles/feature-a/implementer/session.json')), false);
});

it('reports a failing model listing as provider unavailable', async () => {
    const {ask} = setup();
    const result = await ask({env: {FAKE_GO_MODELS_FAIL: '1'}});

    assert.equal(result.exitCode, 3);
    assert.match(result.message, /models failed/);
});

it('lets a one-off --model pick another model only within the role tier', async () => {
    const {ask} = setup();
    const same = await ask({overrides: {model: 'opencode-go/glm-5.3'}, env: {FAKE_GO_MODE: 'args'}});
    const cheaper = await ask({overrides: {model: 'opencode-go/glm-5.3-flash', effort: 'low'}});

    assert.equal(same.exitCode, 0, same.message);
    assert.ok(JSON.parse(same.output).args.includes('opencode-go/glm-5.3#high'));
    assert.equal(cheaper.exitCode, 2);
    assert.match(cheaper.message, /tier/);
});
