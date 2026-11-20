/// <reference types="node" />

import {spawn} from 'node:child_process';
import {readFileSync, rmSync} from 'node:fs';
import path from 'node:path';

import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {fixture, stop} from './agentFixFixtures';

const testRuns = (repo: ReturnType<typeof fixture>) => repo.commands()
    .filter(command => command.bin === 'vp' && command.args[0] === 'test');

describe('shared verification results', () => {
    it('reuses a successful check across agents and Stop sessions without changing the index', () => {
        const repo = fixture();

        repo.write('edited.ts', 'GOOD');
        repo.git('add', 'edited.ts');

        const indexBefore = repo.git('diff', '--cached', '--binary');

        expect(repo.verify().status).toBe(0);
        expect(repo.verify().stdout).toContain('REUSED');
        expect(repo.run(stop).status).toBe(0);
        expect(repo.run({...stop, session_id: 'another-agent'}).status).toBe(0);
        expect(testRuns(repo)).toHaveLength(1);
        expect(repo.git('diff', '--cached', '--binary')).toBe(indexBefore);
    });

    it.each([
        'edited.ts',
        'dependency.ts',
        'vite.config.ts',
        'pnpm-lock.yaml',
    ])('invalidates success when %s changes', file => {
        const repo = fixture();

        repo.write('edited.ts', 'GOOD');
        repo.write(file, 'before');
        repo.git('add', '.');
        expect(repo.verify().status).toBe(0);
        repo.write(file, 'after');
        expect(repo.verify().status).toBe(0);
        expect(testRuns(repo)).toHaveLength(2);
    });

    it('invalidates success on added/deleted files and staging changes', () => {
        const repo = fixture();

        repo.write('edited.ts', 'GOOD');
        expect(repo.verify().status).toBe(0);
        repo.write('new.ts', 'GOOD');
        expect(repo.verify().status).toBe(0);
        repo.git('add', 'new.ts');
        expect(repo.verify().status).toBe(0);
        rmSync(path.join(repo.root, 'new.ts'));
        expect(repo.verify().status).toBe(0);
        expect(testRuns(repo)).toHaveLength(4);
    });

    it('invalidates results on dotenv, environment and dependency installation changes', () => {
        const repo = fixture();

        repo.write('.gitignore', `${repo.read('.gitignore')}\n.env.local\n`);
        repo.write('edited.ts', 'GOOD');
        expect(repo.verify().status).toBe(0);
        repo.write('.env.local', 'SECRET=first');
        expect(repo.verify().status).toBe(0);
        expect(repo.verify(undefined, undefined, [], {NODE_ENV: 'different'}).status).toBe(0);
        repo.write('node_modules/.modules.yaml', 'new installation');
        expect(repo.verify().status).toBe(0);
        expect(testRuns(repo)).toHaveLength(4);
    });

    it('does not reuse failures and retains diagnostics in a log', () => {
        const repo = fixture();

        repo.write('edited.ts', 'TEST_ERROR');

        const result = repo.verify();

        expect(result.status).toBe(1);
        expect(result.stderr).toContain('Failing test for edited.ts');

        const logPath = result.stdout.split('Log: ')[1]?.trim();

        expect(readFileSync(logPath, 'utf8')).toContain('Failing test for edited.ts');
        expect(repo.verify().status).toBe(1);
        expect(testRuns(repo)).toHaveLength(2);
    });

    it('runs afresh when requested and when inputs change during a check', () => {
        const repo = fixture();

        repo.write('edited.ts', 'GOOD');
        expect(repo.verify().status).toBe(0);
        expect(repo.verify(undefined, undefined, ['--fresh']).status).toBe(0);
        repo.write('edited.ts', 'MUTATE_INPUT');
        expect(repo.verify().status).toBe(0);
        expect(repo.verify().status).toBe(0);
        expect(testRuns(repo)).toHaveLength(4);
    });

    it('keeps distinct test selections separate and forwards filenames literally', () => {
        const repo = fixture();
        const file = 'name with\nspaces.ts';

        repo.write('edited.ts', 'GOOD');
        repo.write(file, 'GOOD');
        expect(repo.verify().status).toBe(0);
        expect(repo.verify('root:test-related', [file]).status).toBe(0);
        expect(testRuns(repo)).toHaveLength(2);
        expect(testRuns(repo).at(-1)?.args.at(-1)).toBe(file);
    });

    it('shares a single execution when agents start the same check concurrently', async () => {
        const repo = fixture();

        repo.write('edited.ts', 'GOOD');

        const run = () => new Promise<number | null>((resolve, reject) => {
            const child = spawn(process.execPath, [
                'scripts/verify.mjs',
                'root:test-related',
                '--',
                'edited.ts',
            ], {
                cwd: repo.root,
                stdio: 'ignore',
                env: {...process.env, STAGISTIC_VERIFY_DELAY_MS: '150'},
            });

            child.on('error', reject);
            child.on('exit', resolve);
        });

        expect(await Promise.all([run(), run()])).toEqual([0, 0]);
        expect(testRuns(repo)).toHaveLength(1);
    });

    it('runs full regression afresh and rejects mutating/watch/recursive tasks', () => {
        const repo = fixture();

        repo.write('edited.ts', 'GOOD');
        expect(repo.verify('root:test-all', []).status).toBe(0);
        expect(repo.verify('root:test-all', []).status).toBe(0);
        expect(repo.commands().filter(command => command.bin === 'moon')).toHaveLength(2);
        for (const task of [
            'root:verify',
            'root:format',
            'root:test-watch',
        ]) {
            expect(repo.verify(task, []).status).not.toBe(0);
        }

        expect(repo.verify('script:test', ['--update=true']).status).not.toBe(0);
        expect(repo.commands().filter(command => command.bin === 'moon')).toHaveLength(2);
    });
});
