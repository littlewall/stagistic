/// <reference types="node" />

import {rmSync} from 'node:fs';
import path from 'node:path';

import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {fixture, stop} from './agentFixFixtures';

describe('Claude lint/format hooks', () => {
    it('fixes staged, unstaged and untracked files in batches without changing the index', () => {
        const repo = fixture();

        repo.write('staged.ts', 'original staged content');
        repo.git('add', 'staged.ts');
        repo.write('staged.ts', 'FORMAT_FIX');
        repo.write('untracked.ts', 'FORMAT_FIX');
        repo.write('styles.css', 'STYLE_FIX');

        const indexBefore = repo.git('diff', '--cached', '--binary');
        const result = repo.run(stop);

        expect(result.status).toBe(0);
        expect(repo.read('staged.ts')).toBe('GOOD');
        expect(repo.read('untracked.ts')).toBe('GOOD');
        expect(repo.read('styles.css')).toBe('GOOD');
        expect(repo.git('diff', '--cached', '--binary')).toBe(indexBefore);
        expect(repo.commands().filter(command => command.bin === 'eslint')).toHaveLength(1);
    });

    it('rejects lint errors introduced by the formatter, including in the post-edit hook', () => {
        const repo = fixture();

        repo.write('edited.ts', 'FORMAT_TO_BAD');

        const result = repo.run({tool_input: {file_path: path.join(repo.root, 'edited.ts')}});

        expect(result.status).toBe(2);
        expect(result.stderr).toContain('Unfixed problem');
        expect(repo.read('edited.ts')).toBe('LINT_ERROR');
        expect(repo.commands().filter(command => command.bin === 'vp').at(-1)).toMatchObject({
            bin: 'vp',
            args: [
                'lint',
                '--',
                'edited.ts',
            ],
        });
    });

    it('does not report stale lint diagnostics that formatting has fixed', () => {
        const repo = fixture();

        repo.write('edited.ts', 'LINT_ERROR_THEN_FIXED');

        expect(repo.run({tool_input: {file_path: path.join(repo.root, 'edited.ts')}}).status).toBe(0);
        expect(repo.read('edited.ts')).toBe('GOOD');
    });

    it('blocks completion on remaining JavaScript or CSS errors', () => {
        const repo = fixture();

        repo.write('broken.ts', 'LINT_ERROR');
        repo.write('broken.css', 'STYLE_ERROR');

        const result = repo.run(stop);

        expect(result.status).toBe(2);
        expect(result.stderr).toContain('broken.ts');
        expect(result.stderr).toContain('broken.css');
    });

    it('runs the node tests related to changed scripts on Stop only', () => {
        const repo = fixture();
        const testRuns = () => repo.commands().filter(command => command.bin === 'vp' && command.args[0] === 'test');

        repo.write('edited.ts', 'GOOD');
        repo.write('styles.css', 'GOOD');

        expect(repo.run({tool_input: {file_path: path.join(repo.root, 'edited.ts')}}).status).toBe(0);
        expect(testRuns()).toHaveLength(0);

        expect(repo.run(stop).status).toBe(0);
        expect(testRuns()).toEqual([
            {
                bin: 'vp',
                args: [
                    'test',
                    'related',
                    '--run',
                    '--passWithNoTests',
                    '--',
                    'edited.ts',
                ],
            },
        ]);
    });

    it('blocks completion on failing related tests', () => {
        const repo = fixture();

        repo.write('edited.ts', 'TEST_ERROR');

        const result = repo.run(stop);

        expect(result.status).toBe(2);
        expect(result.stderr).toContain('[root:test-related]');
        expect(result.stderr).toContain('Failing test for edited.ts');
    });

    it('skips related tests while lint still fails', () => {
        const repo = fixture();

        repo.write('edited.ts', 'LINT_ERROR TEST_ERROR');

        const result = repo.run(stop);

        expect(result.status).toBe(2);
        expect(result.stderr).not.toContain('root:test-related');
        expect(repo.commands().some(command => command.bin === 'vp' && command.args[0] === 'test')).toBe(false);
    });

    it('handles spaces and newlines in paths, ignoring deleted, ignored and unsupported files', () => {
        const repo = fixture();

        repo.write('deleted.ts', 'LINT_ERROR');
        repo.git('add', 'deleted.ts');
        rmSync(path.join(repo.root, 'deleted.ts'));
        repo.write('name with\nspaces.ts', 'FORMAT_FIX');
        repo.write('ignored.ts', 'LINT_ERROR');
        repo.write('notes.md', 'LINT_ERROR');

        expect(repo.run(stop).status).toBe(0);
        expect(repo.read('name with\nspaces.ts')).toBe('GOOD');
        expect(repo.commands().flatMap(command => command.args)).not.toContain('deleted.ts');
        expect(repo.read('ignored.ts')).toBe('LINT_ERROR');
        expect(repo.read('notes.md')).toBe('LINT_ERROR');
    });

    it('is silent when no supported files changed', () => {
        const repo = fixture();
        const result = repo.run(stop);

        expect(result.status).toBe(0);
        expect(result.stdout).toBe('');
        expect(repo.commands()).toEqual([]);
    });

    it.each(['copy.ts', 'copy.astro'])('blocks new duplication in %s without restricting the scan to that file', file => {
        const repo = fixture();

        repo.write(file, 'CLONE_ERROR');

        const result = repo.run({tool_input: {file_path: path.join(repo.root, file)}});

        expect(result.status).toBe(2);
        expect(result.stderr).toContain('root:duplicates-changed');
        expect(repo.commands().at(-1)).toEqual({
            bin: 'jscpd',
            args: [
                '--config',
                '.jscpd.json',
                '--changed',
                '--',
            ],
        });
    });

    it.each(['.jscpd.json', '.jscpd-baseline.json'])('checks every clone when %s changes', file => {
        const repo = fixture();

        repo.write(file, '{}');
        repo.write('existing.ts', 'CLONE_ERROR');

        const result = repo.run({tool_input: {file_path: path.join(repo.root, file)}});

        expect(result.status).toBe(2);
        expect(repo.commands().at(-1)?.args).not.toContain('--changed');
    });

    it.each(['.jscpd.json', '.jscpd-baseline.json'])('checks deleted %s configuration on Stop', file => {
        const repo = fixture();

        repo.write(file, '{}');
        repo.git('add', file);
        rmSync(path.join(repo.root, file));
        repo.write('ignored.ts', 'CLONE_ERROR');

        expect(repo.run(stop).status).toBe(2);
        expect(repo.commands().at(-1)?.args).not.toContain('--changed');
        expect(repo.run({...stop, stop_hook_active: true}).status).toBe(0);
    });

    it('avoids repeating an unchanged Stop failure but checks again after another edit', () => {
        const repo = fixture();

        repo.write('broken.ts', 'LINT_ERROR');
        expect(repo.run(stop).status).toBe(2);

        const repeated = repo.run({...stop, stop_hook_active: true});

        expect(repeated.status).toBe(0);
        expect(repeated.stdout).toContain('systemMessage');
        expect(repeated.stdout).toContain('Unfixed problem');

        repo.write('broken.ts', 'LINT_ERROR changed');
        expect(repo.run({...stop, stop_hook_active: true}).status).toBe(2);
        repo.write('broken.ts', 'GOOD');
        expect(repo.run({...stop, stop_hook_active: true}).status).toBe(0);
    });
});
