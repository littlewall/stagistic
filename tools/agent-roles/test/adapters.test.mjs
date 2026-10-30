import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {adapters} from '../lib/adapters/index.mjs';

const PROMPT = 'Review "this"\n-x plan';
const invocation = name => adapters[name].buildInvocation({
    model: 'm1',
    effort: 'high',
    cwd: '/repo',
    prompt: PROMPT,
    outFile: '/tmp/out.txt',
});

describe('codex adapter', () => {
    it('builds read-only argv with prompt on stdin', () => {
        const {
            cmd,
            args,
            stdin,
        } = invocation('codex');

        assert.equal(cmd, 'codex');
        assert.deepEqual(args, [
            'exec',
            '--skip-git-repo-check',
            '-s',
            'read-only',
            '-m',
            'm1',
            '-c',
            'model_reasoning_effort="high"',
            '-c',
            'web_search="live"',
            '-C',
            '/repo',
            '-o',
            '/tmp/out.txt',
            '-',
        ]);
        assert.equal(stdin, PROMPT);
        assert.ok(args.every(arg => !arg.includes('Review')));
    });

    it('classifies failures', () => {
        const {classifyFailure} = adapters.codex;

        assert.equal(classifyFailure({spawnError: {code: 'ENOENT'}}).kind, 'unavailable');
        assert.equal(classifyFailure({code: 1, stderr: 'unexpected status 401 Unauthorized'}).kind, 'unavailable');
        assert.equal(classifyFailure({code: 1, stderr: 'You have hit your usage limit.'}).kind, 'unavailable');
        assert.equal(classifyFailure({code: 1, stderr: 'model crashed'}).kind, 'failed');
    });
});

describe('agy adapter', () => {
    it('builds sandboxed headless argv with prompt as one --print= element', () => {
        const {
            cmd,
            args,
            stdin,
        } = invocation('agy');

        assert.equal(cmd, 'agy');
        assert.deepEqual(args, [
            `--print=${PROMPT}`,
            '--sandbox',
            '--model',
            'm1',
            '--output-format',
            'json',
        ]);
        assert.equal(stdin, undefined);
    });

    it('parses the JSON response field', () => {
        assert.equal(adapters.agy.parseOutput({stdout: '{"status":"SUCCESS","response":"ok\\n"}'}), 'ok\n');
    });

    it('detects the authentication wait on stderr', () => {
        assert.equal(adapters.agy.detectUnavailable('Waiting for authentication (timeout 60s)...'), 'not logged in');
        assert.equal(adapters.agy.detectUnavailable('working'), null);
    });

    it('classifies failures', () => {
        const {classifyFailure} = adapters.agy;

        assert.equal(classifyFailure({spawnError: {code: 'ENOENT'}}).kind, 'unavailable');
        assert.equal(classifyFailure({code: 1, stdout: '{"status":"ERROR","error":"authentication failed or timed out"}'}).kind, 'unavailable');
        assert.equal(classifyFailure({code: 1, stdout: '{"status":"ERROR","error":"quota exceeded"}'}).kind, 'unavailable');
        assert.equal(classifyFailure({code: 1, stdout: '{"status":"ERROR","error":"model exploded"}'}).kind, 'failed');
    });
});
