#!/usr/bin/env node
/*
 * Claude Code PostToolUse/Stop hooks: run the commit hook's fixers without
 * touching the index. Stop also catches changes made through shell commands.
 * Recheck lint after formatting: formatting can introduce max-lines errors.
 * jscpd scans all source roots so copies of unchanged code are caught too.
 * Stop then runs the node tests related to the changed scripts.
 * https://code.claude.com/docs/en/hooks#stop
 */
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {
    existsSync,
    lstatSync,
    mkdirSync,
    readFileSync,
    realpathSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {verifyTask} from './verification.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const STYLE = /\.(css|scss)$/;
const DUPLICATION = /\.(ts|tsx|js|jsx|mjs|cjs|css|scss|astro)$/;
const DUPLICATION_CONFIG = new Set(['.jscpd.json', '.jscpd-baseline.json']);
const SKIPPED = /(^|\/)(node_modules|dist|graphify-out|\.astro|\.moon)\//;

const readInput = () => {
    try {
        return JSON.parse(readFileSync(0, 'utf8'));
    } catch {
        return {};
    }
};

const supportedFile = file => {
    if (typeof file !== 'string') {
        return null;
    }

    let absolute;

    try {
        if (!lstatSync(file).isFile()) {
            return null;
        }

        absolute = realpathSync(file);
    } catch {
        return null;
    }

    const relative = path.relative(root, absolute);

    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)
        || SKIPPED.test(relative) || (!DUPLICATION.test(relative) && !DUPLICATION_CONFIG.has(relative))) {
        return null;
    }

    return relative;
};

const git = args => {
    const result = spawnSync('git', args, {cwd: root, encoding: 'utf8'});

    if (result.status !== 0) {
        throw new Error(`Cannot inspect changed files: ${result.stderr ?? result.error?.message ?? 'git failed'}`);
    }

    return result.stdout;
};

const changedFiles = () => {
    const paths = [
        git([
            'diff',
            '--name-only',
            '-z',
            '--diff-filter=ACMRD',
            '--',
        ]),
        git([
            'diff',
            '--cached',
            '--name-only',
            '-z',
            '--diff-filter=ACMRD',
            '--',
        ]),
        git([
            'ls-files',
            '--others',
            '--exclude-standard',
            '-z',
            '--',
        ]),
    ].flatMap(output => output.split('\0')).filter(Boolean);

    const supported = paths.map(file => (DUPLICATION_CONFIG.has(file) ? file : supportedFile(path.join(root, file))));

    return [...new Set(supported.filter(file => file !== null))]
        .toSorted((left, right) => left.localeCompare(right));
};

/*
 * The commands of the moon tasks the commit hook runs (moon.yml: `lint-js-fix`,
 * `format`, `stylelint-fix`, `duplicates-changed`), called directly: through `moon run` an edit costs
 * ~7 s (toolchain sync), directly ~1 s. Keep them in step with moon.yml.
 */
const run = (name, [bin, ...args], files) => {
    const executable = path.isAbsolute(bin) ? bin : path.join(root, 'node_modules/.bin', bin);
    const result = spawnSync(executable, [
        ...args,
        '--',
        ...files,
    ], {
        cwd: root,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
    });

    return {
        name,
        ok: result.status === 0,
        output: `${result.stdout ?? ''}${result.stderr ?? ''}${result.error?.message ?? ''}`.trim(),
    };
};

const fixFiles = files => {
    const scripts = files.filter(file => SCRIPT.test(file));
    const styles = files.filter(file => STYLE.test(file));
    const results = [];

    if (scripts.length > 0) {
        run('root:lint-js-fix', [
            'vp',
            'lint',
            '--fix',
        ], scripts);
        results.push(run('root:format', ['eslint', '--fix'], scripts));
        // Only report remaining diagnostics, including those introduced by formatting.
        results.push(run('final JavaScript lint', ['vp', 'lint'], scripts));
    }

    if (styles.length > 0) {
        results.push(run('root:stylelint-fix', ['stylelint', '--fix'], styles));
    }

    if (files.length > 0) {
        // The shared wrapper checks all clones when configuration or baseline changes.
        results.push(run('root:duplicates-changed', [
            process.execPath,
            path.join(root, 'scripts/check-duplicates.mjs'),
        ], []));
    }

    return results.filter(result => !result.ok);
};

/*
 * Stop only (moon.yml `test-related`): node tests that import a changed script.
 * Browser, e2e and marketing suites stay manual (`root:test-all`).
 */
const testFiles = files => {
    const scripts = files.filter(file => SCRIPT.test(file) && existsSync(path.join(root, file)));

    if (scripts.length === 0) {
        return [];
    }

    const result = verifyTask({
        root,
        task: 'root:test-related',
        args: scripts,
    });

    return result.ok ? [] : [{...result, name: result.task}];
};

const stopStateFile = input => {
    if (input.hook_event_name !== 'Stop' || typeof input.session_id !== 'string') {
        return null;
    }

    const sessionKey = createHash('sha256').update(input.session_id).digest('hex');

    return path.join(git(['rev-parse', '--absolute-git-dir']).trim(), 'agent-fix', `${sessionKey}.json`);
};

const repeatedStopFailure = (input, stateFile, files, failures) => {
    if (!stateFile) {
        return false;
    }

    const hash = createHash('sha256');

    for (const file of files) {
        hash.update(file).update('\0');
        try {
            hash.update('present\0').update(readFileSync(path.join(root, file)));
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }

            hash.update('deleted');
        }

        hash.update('\0');
    }

    hash.update(failures.map(failure => failure.name).join('\0'));

    const fingerprint = hash.digest('hex');
    let previous;

    try {
        previous = JSON.parse(readFileSync(stateFile, 'utf8')).fingerprint;
    } catch {
        previous = null;
    }

    mkdirSync(path.dirname(stateFile), {recursive: true});
    writeFileSync(stateFile, JSON.stringify({fingerprint}));

    return input.stop_hook_active === true && previous === fingerprint;
};

try {
    const input = readInput();
    const files = input.hook_event_name === 'Stop'
        ? changedFiles()
        : [supportedFile(input?.tool_input?.file_path ?? input?.tool_input?.notebook_path)].filter(file => file !== null);
    const fixFailures = fixFiles(files);
    // Tests run once the code lints, so a lint failure is not reported twice.
    const failures = fixFailures.length === 0 && input.hook_event_name === 'Stop' ? testFiles(files) : fixFailures;
    const stateFile = stopStateFile(input);

    if (failures.length > 0) {
        const message = 'Lint/format/duplication or related test failures remain. Fix these before finishing:\n'
            + failures.map(failure => `\n[${failure.name}]\n${failure.output}\n`).join('');

        if (repeatedStopFailure(input, stateFile, files, failures)) {
            // Avoid an endless continuation when Claude makes no progress on the same failure.
            process.stdout.write(JSON.stringify({
                systemMessage: `The same lint/format/duplication/test errors remain unchanged; stopping repeated automatic retries.\n${message}`,
            }));
            process.exit(0);
        }

        process.stderr.write(message);
        process.exit(2);
    }

    if (stateFile) {
        rmSync(stateFile, {force: true});
    }
} catch (error) {
    process.stderr.write(`Lint/format hook failed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(2);
}
