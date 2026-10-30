import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
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

import {ConfigError} from '../config.mjs';

export const writeJson = (file, value) => {
    const temp = `${file}.${randomUUID()}.tmp`;

    writeFileSync(temp, `${JSON.stringify(value, null, 4)}\n`, {mode: 0o600});
    renameSync(temp, file);
};

const claim = (file, metadata) => {
    let fd;

    try {
        fd = openSync(file, 'wx', 0o600);
    } catch (error) {
        if (error.code === 'EEXIST') throw new Error(`Worker lock exists: ${file}. Inspect the recorded process/run before removing a stale lock.`, {cause: error});

        throw error;
    }
    writeFileSync(fd, JSON.stringify({pid: process.pid, ...metadata}));
    closeSync(fd);

    return () => rmSync(file, {force: true});
};

const snapshot = (cwd, logDir, phase) => {
    const errors = [];
    const commands = [
        {suffix: 'status.txt', args: ['status', '--porcelain=v1']},
        {
            suffix: 'patch',
            args: [
                'diff',
                '--no-ext-diff',
                '--binary',
                'HEAD',
            ],
        },
    ];

    for (const {suffix, args} of commands) {
        const result = spawnSync('git', ['--no-optional-locks', ...args], {
            cwd,
            encoding: 'utf8',
            maxBuffer: 16 * 1024 * 1024,
        });

        writeFileSync(path.join(logDir, `${phase}.${suffix}`), result.stdout ?? '', {mode: 0o600});

        if (result.error || result.status !== 0) errors.push(`${suffix}: ${result.error?.message ?? result.stderr.trim()}`);
    }

    if (errors.length) writeJson(path.join(logDir, `${phase}.snapshot-errors.json`), errors);

    return errors;
};

export const openRun = ({
    cwd,
    task,
    role,
    fingerprint,
    kind,
}) => {
    const base = path.join(cwd, '.scratch', 'agent-roles');
    const dir = path.join(base, task, role);

    mkdirSync(dir, {recursive: true, mode: 0o700});

    const releases = [];

    try {
        if (kind !== 'read') releases.push(claim(path.join(base, 'writer.lock'), {task, role}));

        releases.push(claim(path.join(dir, 'active.lock'), {task, role}));

        const file = path.join(dir, 'session.json');
        let previous = null;

        if (existsSync(file)) {
            try {
                previous = JSON.parse(readFileSync(file, 'utf8'));

                if (previous?.version !== 1 || typeof previous.fingerprint !== 'string'
                    || (previous.sessionId !== null && !(/^ses_[a-zA-Z0-9_-]+$/).test(previous.sessionId))) throw new Error('invalid schema');
            } catch (error) {
                throw new ConfigError(`Invalid worker session state ${file}: ${error.message}; inspect it before retrying`);
            }
        }

        const logDir = path.join(dir, 'runs', randomUUID());

        mkdirSync(logDir, {recursive: true, mode: 0o700});

        const state = {
            version: 1,
            fingerprint,
            sessionId: previous?.fingerprint === fingerprint ? previous.sessionId : null,
            status: 'running',
            logDir,
            workerPid: null,
        };
        const save = changes => {
            Object.assign(state, changes);
            writeJson(file, state);
        };

        save({});

        const beforeErrors = kind === 'read' ? [] : snapshot(cwd, logDir, 'before');

        return {
            state,
            logDir,
            save,
            finish(result) {
                const afterErrors = kind === 'read' ? [] : snapshot(cwd, logDir, 'after');
                const snapshotWarnings = [...beforeErrors, ...afterErrors];
                const recorded = {...result, snapshotWarnings};

                if (snapshotWarnings.length) recorded.message = `${result.message ?? ''} Snapshot warning: incomplete before/after data; inspect ${logDir}/*snapshot-errors.json and the live working tree.`.trim();

                save({status: result.exitCode === 0 ? 'completed' : 'failed', workerPid: result.cleanupConfirmed === false ? state.workerPid : null});
                writeJson(path.join(logDir, 'result.json'), recorded);

                return recorded;
            },
            release() {
                releases.toReversed().forEach(release => release());
            },
        };
    } catch (error) {
        releases.toReversed().forEach(release => release());
        throw error;
    }
};
