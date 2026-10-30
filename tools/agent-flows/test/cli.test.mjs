import assert from 'node:assert/strict';
import {
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

import {runCli} from '../lib/cli.mjs';

const temporaryDirs = [];

afterEach(() => {
    for (const dir of temporaryDirs.splice(0)) {
        rmSync(dir, {recursive: true, force: true});
    }
});

const fixture = () => {
    const home = mkdtempSync(path.join(tmpdir(), 'flow-cli-'));

    temporaryDirs.push(home);

    const root = path.join(home, 'plugin');
    const toolDir = path.join(home, 'tool');
    const registry = path.join(home, '.claude/plugins/installed_plugins.json');
    const skill = path.join(root, 'skills/engineering/tdd/SKILL.md');

    for (const dir of [
        path.dirname(registry),
        path.dirname(skill),
        toolDir,
    ]) {
        mkdirSync(dir, {recursive: true});
    }

    writeFileSync(registry, JSON.stringify({plugins: {
        'test@market': [
            {
                scope: 'project',
                projectPath: home,
                installPath: root,
                version: '1',
            },
        ],
    }}));
    writeFileSync(skill, 'red before green\n');
    writeFileSync(path.join(toolDir, 'flows.json'), JSON.stringify({plugin: 'test@market', skills: ['tdd']}));

    return {
        home,
        cwd: home,
        toolDir,
        skill,
    };
};

it('resolves live skill paths and rejects skills outside the monitored set', () => {
    const options = fixture();
    const result = runCli(['resolve', 'tdd'], options);

    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout.trim(), options.skill);
    assert.equal(runCli(['resolve', '../escape'], options).exitCode, 2);
    assert.equal(runCli(['resolve', 'setup-matt-pocock-skills'], options).exitCode, 2);
});

it('check reports an unreviewed install without creating a lock', () => {
    const options = fixture();
    const result = runCli(['check'], options);

    assert.equal(result.exitCode, 1);
    assert.match(result.stdout, /accept/);
    assert.match(result.stdout, /red before green/);
    assert.equal(existsSync(path.join(options.toolDir, 'upstream.lock.json')), false);
});

it('explicit accept records the baseline and check detects subsequent edits without accepting them', () => {
    const options = fixture();

    assert.equal(runCli(['accept'], options).exitCode, 0);
    assert.equal(runCli(['check'], options).exitCode, 0);
    assert.equal(runCli(['session-start'], options).stdout, '');

    const lockPath = path.join(options.toolDir, 'upstream.lock.json');
    const before = readFileSync(lockPath, 'utf8');

    writeFileSync(options.skill, 'commit your work\n');

    const result = runCli(['check'], options);

    assert.equal(result.exitCode, 1);
    assert.match(result.stdout, /\+commit your work/);
    assert.equal(readFileSync(lockPath, 'utf8'), before);
});

it('session hook reports drift as context and always exits zero', () => {
    const options = fixture();
    const result = runCli(['session-start'], options);
    const payload = JSON.parse(result.stdout);

    assert.equal(result.exitCode, 0);
    assert.equal(payload.hookSpecificOutput.hookEventName, 'SessionStart');
    assert.match(payload.hookSpecificOutput.additionalContext, /not reviewed|unreviewed/i);
    assert.doesNotMatch(payload.hookSpecificOutput.additionalContext, /red before green/);

    rmSync(path.join(options.home, '.claude'), {recursive: true});

    const missing = runCli(['session-start'], options);

    assert.equal(missing.exitCode, 0);
    assert.match(JSON.parse(missing.stdout).hookSpecificOutput.additionalContext, /not installed/);
});

it('invalid CLI arguments never accept or overwrite a baseline', () => {
    const options = fixture();

    assert.equal(runCli(['accept', 'oops'], options).exitCode, 2);
    assert.equal(runCli([], options).exitCode, 2);
    assert.equal(existsSync(path.join(options.toolDir, 'upstream.lock.json')), false);
});
