/// <reference types="node" />

import {execFileSync, spawnSync} from 'node:child_process';
import {
    chmodSync,
    copyFileSync,
    existsSync,
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
if (process.env.STAGISTIC_VERIFY_DELAY_MS && args[0] === 'test') {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Number(process.env.STAGISTIC_VERIFY_DELAY_MS));
}
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
    if ((bin === 'vp' && args[0] === 'test') || bin === 'moon') {
        if (content.includes('MUTATE_INPUT')) {
            fs.writeFileSync(file, content.replace('MUTATE_INPUT', 'GOOD'));
        }
        if (content.includes('TEST_ERROR')) {
            process.stderr.write('Failing test for ' + file + '\\n');
            failed = true;
        }
        continue;
    }
    if ((bin === 'vp' && content.includes('LINT_ERROR'))
        || (bin === 'stylelint' && content.includes('STYLE_ERROR'))
        || (bin === 'jscpd' && content.includes('CLONE_ERROR'))) {
        process.stderr.write('Unfixed problem in ' + file + '\\n');
        failed = true;
    }
}
process.stdout.write('tool output\\n');
process.exit(failed ? 1 : 0);
`;

export const fixture = () => {
    const root = mkdtempSync(path.join(tmpdir(), 'stagistic hook '));

    temporaryRoots.push(root);
    mkdirSync(path.join(root, 'scripts'));
    mkdirSync(path.join(root, 'node_modules/.bin'), {recursive: true});
    copyFileSync(hookSource, path.join(root, 'scripts/agent-fix.mjs'));
    copyFileSync(duplicatesSource, path.join(root, 'scripts/check-duplicates.mjs'));
    for (const file of [
        'verify.mjs',
        'verification.mjs',
        'verificationInputs.mjs',
    ]) {
        const source = fileURLToPath(new URL(`../../../scripts/${file}`, import.meta.url));

        if (existsSync(source)) {
            copyFileSync(source, path.join(root, 'scripts', file));
        }
    }

    writeFileSync(
        path.join(root, '.gitignore'),
        'node_modules/\ncommands.jsonl\nignored.ts\nscripts/agent-fix.mjs\nscripts/check-duplicates.mjs\nscripts/verify.mjs\nscripts/verification.mjs\nscripts/verificationInputs.mjs\n',
    );
    execFileSync('git', ['init', '--quiet'], {cwd: root});
    for (const bin of [
        'moon',
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
        verify: (task = 'root:test-related', args = ['edited.ts'], flags: string[] = [], env = {}) => spawnSync(
            process.execPath,
            [
                'scripts/verify.mjs',
                ...flags,
                task,
                '--',
                ...args,
            ],
            {
                cwd: root,
                encoding: 'utf8',
                env: {...process.env, ...env},
            },
        ),
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

export const stop = {
    hook_event_name: 'Stop',
    session_id: 'test-session',
    stop_hook_active: false,
};

afterEach(() => {
    temporaryRoots.splice(0).forEach(root => rmSync(root, {recursive: true, force: true}));
});

