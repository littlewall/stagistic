#!/usr/bin/env node
/*
 * Claude Code PostToolUse hook (.claude/settings.json): after an agent edits a
 * file, run the same fixers as the commit hook (`staged` in vite.config.ts) on
 * that file only, so lint and format problems surface right away instead of at
 * commit time. What the fixers cannot fix goes back to the agent (exit 2).
 */
import {spawnSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const STYLE = /\.(css|scss)$/;
const SKIPPED = /(^|\/)(node_modules|dist|graphify-out|\.astro|\.moon)\//;

const readInput = () => {
    try {
        return JSON.parse(readFileSync(0, 'utf8'));
    } catch {
        return {};
    }
};

const editedFile = input => {
    const file = input?.tool_input?.file_path ?? input?.tool_input?.notebook_path;

    if (typeof file !== 'string' || !existsSync(file)) {
        return null;
    }

    const relative = path.relative(root, path.resolve(file));

    return relative.startsWith('..') || SKIPPED.test(relative) ? null : relative;
};

/*
 * The commands of the moon tasks the commit hook runs (moon.yml: `lint-js-fix`,
 * `format`, `stylelint-fix`), called directly: through `moon run` an edit costs
 * ~7 s (toolchain sync), directly ~1 s. Keep them in step with moon.yml.
 */
const tasksFor = file => {
    if (SCRIPT.test(file)) {
        return [
            {
                name: 'root:lint-js-fix',
                command: [
                    'vp',
                    'lint',
                    '--fix',
                ],
            },
            {name: 'root:format', command: ['eslint', '--fix']},
        ];
    }

    return STYLE.test(file) ? [{name: 'root:stylelint-fix', command: ['stylelint', '--fix']}] : [];
};

const run = ({command: [bin, ...args]}, file) => {
    const result = spawnSync(path.join(root, 'node_modules/.bin', bin), [...args, file], {cwd: root, encoding: 'utf8'});

    return {ok: result.status === 0, output: `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()};
};

const file = editedFile(readInput());

if (file) {
    const failures = tasksFor(file).map(task => ({task: task.name, ...run(task, file)})).filter(result => !result.ok);

    if (failures.length > 0) {
        process.stderr.write(`Lint/format problems in ${file} that the fixers could not fix (commit hook would fail):\n`);
        failures.forEach(failure => process.stderr.write(`\n[${failure.task}]\n${failure.output}\n`));
        process.exit(2);
    }
}
