/// <reference types="node" />

import {execFileSync, spawnSync} from 'node:child_process';
import {
    chmodSync,
    copyFileSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

const hookSource = fileURLToPath(new URL('../../../scripts/agent-fix.mjs', import.meta.url));
const duplicatesSource = fileURLToPath(new URL('../../../scripts/check-duplicates.mjs', import.meta.url));
const temporaryRoots: string[] = [];

interface Invocation {
    bin: string,
    args: string[],
}

// Real child processes exercise the hook's argument handling and Git/index behavior.
const fakeTool = `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const bin = path.basename(process.argv[1]);
const args = process.argv.slice(2);
fs.appendFileSync('commands.jsonl', JSON.stringify({bin, args}) + '\\n');
const files = bin === 'jscpd'
    ? fs.readdirSync('.').filter(file => /\\.(ts|astro|css)$/.test(file))
    : args.filter(arg => /\\.(ts|tsx|js|css)$/.test(arg));
let failed = false;
for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    if (bin === 'eslint' && args.includes('--fix')) {
        content = content.replaceAll('FORMAT_FIX', 'GOOD')
            .replaceAll('FORMAT_TO_BAD', 'LINT_ERROR')
            .replaceAll('LINT_ERROR_THEN_FIXED', 'GOOD');
        fs.writeFileSync(file, content);
    }
    if (bin === 'stylelint' && args.includes('--fix')) {
        content = content.replaceAll('STYLE_FIX', 'GOOD');
        fs.writeFileSync(file, content);
    }
    if ((bin === 'vp' && content.includes('LINT_ERROR'))
        || (bin === 'stylelint' && content.includes('STYLE_ERROR'))
        || (bin === 'jscpd' && content.includes('CLONE_ERROR'))) {
        process.stderr.write('Unfixed problem in ' + file + '\\n');
        failed = true;
    }
}
process.exit(failed ? 1 : 0);
`;

const fixture = () => {
    const root = mkdtempSync(path.join(tmpdir(), 'stagistic hook '));

    temporaryRoots.push(root);
    mkdirSync(path.join(root, 'scripts'));
    mkdirSync(path.join(root, 'node_modules/.bin'), {recursive: true});
    copyFileSync(hookSource, path.join(root, 'scripts/agent-fix.mjs'));
    copyFileSync(duplicatesSource, path.join(root, 'scripts/check-duplicates.mjs'));
    writeFileSync(
        path.join(root, '.gitignore'),
        'node_modules/\ncommands.jsonl\nignored.ts\nscripts/agent-fix.mjs\nscripts/check-duplicates.mjs\n',
    );
    execFileSync('git', ['init', '--quiet'], {cwd: root});
    for (const bin of [
        'vp',
        'eslint',
        'stylelint',
        'jscpd',
    ]) {
        const target = path.join(root, 'node_modules/.bin', bin);

        writeFileSync(target, fakeTool);
        chmodSync(target, 0o755);
    }

    return {
        root,
        write: (file: string, content: string) => writeFileSync(path.join(root, file), content),
        read: (file: string) => readFileSync(path.join(root, file), 'utf8'),
        git: (...args: string[]) => execFileSync('git', args, {cwd: root, encoding: 'utf8'}),
        run: (input: object) => spawnSync(process.execPath, ['scripts/agent-fix.mjs'], {
            cwd: root,
            input: JSON.stringify(input),
            encoding: 'utf8',
        }),
        commands: (): Invocation[] => {
            try {
                return readFileSync(path.join(root, 'commands.jsonl'), 'utf8').trim().split('\n')
                    .map(line => JSON.parse(line) as Invocation);
            } catch {
                return [];
            }
        },
    };
};

const stop = {
    hook_event_name: 'Stop',
    session_id: 'test-session',
    stop_hook_active: false,
};

afterEach(() => {
    temporaryRoots.splice(0).forEach(root => rmSync(root, {recursive: true, force: true}));
});

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
