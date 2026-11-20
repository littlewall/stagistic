import {spawnSync} from 'node:child_process';
import {createHash, randomUUID} from 'node:crypto';
import {
    closeSync,
    existsSync,
    mkdirSync,
    openSync,
    readFileSync,
    renameSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import path from 'node:path';

import {gitOutput, verificationFingerprint} from './verificationInputs.mjs';

const allowedTask = /^[a-z][a-z0-9-]*:(test|test-browser|test-related|test-all|typecheck|lint|format-check|duplicates|duplicates-changed)$/;
const delay = new Int32Array(new SharedArrayBuffer(4));

const readRecord = file => {
    try {
        return JSON.parse(readFileSync(file, 'utf8'));
    } catch {
        return null;
    }
};

const acquireLock = file => {
    const deadline = Date.now() + 60_000;

    while (true) {
        try {
            const fd = openSync(file, 'wx', 0o600);

            writeFileSync(fd, JSON.stringify({pid: process.pid}));
            closeSync(fd);

            return;
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }

            const owner = readRecord(file);

            if (owner?.pid) {
                try {
                    process.kill(owner.pid, 0);
                } catch (ownerError) {
                    if (ownerError.code === 'ESRCH') {
                        rmSync(file, {force: true});
                        continue;
                    }
                }
            }

            if (Date.now() >= deadline) {
                throw new Error('This verification is already running. Read its log or retry after it finishes.', {cause: error});
            }

            Atomics.wait(delay, 0, 0, 50);
        }
    }
};

// Shared with the Claude hook. Keep the related command in step with moon.yml.
const commandFor = (root, task, args) => task === 'root:test-related'
    ? [
        path.join(root, 'node_modules/.bin/vp'),
        'test',
        'related',
        '--run',
        '--passWithNoTests',
        '--',
        ...args,
    ]
    : [
        path.join(root, 'node_modules/.bin/moon'),
        'run',
        task,
        '--',
        ...args,
    ];

export const verifyTask = ({
    root,
    task,
    args = [],
    fresh = false,
}) => {
    if (!allowedTask.test(task) || args.some(arg => (/^(--(watch|fix|update)(=|$)|-u)/).test(arg))) {
        throw new Error('Verification accepts one non-mutating check task; watch/fix/update commands must run separately.');
    }

    const directory = path.join(gitOutput(root, ['rev-parse', '--absolute-git-dir']).trim(), 'agent-verification');
    const command = commandFor(root, task, args);
    const key = createHash('sha256').update(JSON.stringify([task, args])).digest('hex');
    const recordFile = path.join(directory, `${key}.json`);
    const lockFile = path.join(directory, `${key}.lock`);
    const reusable = !fresh && task !== 'root:test-all' && task !== 'marketing:test';

    mkdirSync(directory, {recursive: true});
    acquireLock(lockFile);
    try {
        const fingerprint = verificationFingerprint(root);
        const previous = readRecord(recordFile);

        if (reusable && previous?.ok && previous.fingerprint === fingerprint && existsSync(previous.logPath)) {
            return {
                ...previous,
                reused: true,
                output: '',
            };
        }

        const startedAt = new Date().toISOString();
        const logPath = path.join(directory, `${key}-${randomUUID()}.log`);
        const fd = openSync(logPath, 'wx', 0o600);
        let result;

        try {
            writeFileSync(fd, `${JSON.stringify({
                task,
                args,
                command,
                startedAt,
            })}\n`);
            result = spawnSync(command[0], command.slice(1), {
                cwd: root,
                stdio: [
                    'ignore',
                    fd,
                    fd,
                ],
            });

            if (result.error) {
                writeFileSync(fd, `${result.error.message}\n`);
            }
        } finally {
            closeSync(fd);
        }

        const record = {
            task,
            args,
            command,
            fingerprint,
            startedAt,
            durationMs: Date.now() - Date.parse(startedAt),
            ok: result.status === 0,
            exitCode: result.status ?? 1,
            signal: result.signal,
            logPath,
            stable: verificationFingerprint(root) === fingerprint,
        };
        const temporary = `${recordFile}.${randomUUID()}.tmp`;

        // Failed/unstable runs stay reviewable but can never satisfy another check.
        writeFileSync(temporary, JSON.stringify({...record, ok: record.ok && record.stable}), {mode: 0o600});
        renameSync(temporary, recordFile);

        return {
            ...record,
            reused: false,
            output: record.ok ? '' : readFileSync(logPath, 'utf8').slice(-12_000),
        };
    } finally {
        rmSync(lockFile, {force: true});
    }
};
