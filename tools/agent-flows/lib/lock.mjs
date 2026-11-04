import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {
    cpSync,
    existsSync,
    readdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import path from 'node:path';

import {
    FlowError,
    resolvePluginRoot,
    skillDir,
} from './upstream.mjs';

const LOCK = 'upstream.lock.json';
const REVIEWED = 'upstream-reviewed';

const readJson = file => JSON.parse(readFileSync(file, 'utf8'));

/** Relative path → sha256 for every file under `dir`. */
const hashDir = dir => Object.fromEntries(readdirSync(dir, {recursive: true, withFileTypes: true})
    .filter(entry => entry.isFile())
    .map(entry => path.relative(dir, path.join(entry.parentPath, entry.name)))
    .toSorted()
    .map(file => [file, createHash('sha256').update(readFileSync(path.join(dir, file))).digest('hex')]));

const context = ({
    home,
    cwd,
    toolDir,
    skills,
}) => {
    const config = readJson(path.join(toolDir, 'flows.json'));
    const {root, version} = resolvePluginRoot({
        home,
        cwd,
        plugin: config.plugin,
    });

    return {
        config,
        root,
        version,
        skills: skills ?? config.skills,
    };
};

const diffFile = (reviewed, current) => {
    const result = spawnSync('diff', [
        '-u',
        '-N',
        reviewed,
        current,
    ], {encoding: 'utf8'});

    if (result.error || result.status > 1 || result.signal) {
        throw new FlowError(`cannot compare upstream files: ${result.error?.message ?? result.stderr}`);
    }

    return result.stdout;
};

/** Compares the installed plugin's skills with the last reviewed state. */
export const checkUpstream = options => {
    const {
        config,
        root,
        version,
        skills,
    } = context(options);
    const lockFile = path.join(options.toolDir, LOCK);
    const lock = existsSync(lockFile) ? readJson(lockFile) : null;
    const changed = [];
    const missing = [];

    for (const skill of skills) {
        let dir;

        try {
            dir = skillDir(root, skill);
        } catch {
            missing.push(skill);
            continue;
        }

        const current = hashDir(dir);
        const locked = lock?.skills?.[skill]?.files ?? {};
        const files = [...new Set([...Object.keys(current), ...Object.keys(locked)])]
            .filter(file => current[file] !== locked[file])
            .toSorted();

        if (files.length > 0) {
            const reviewedDir = path.join(options.toolDir, REVIEWED, skill);
            const diff = files.map(file => diffFile(path.join(reviewedDir, file), path.join(dir, file))).join('');

            changed.push({
                skill,
                files,
                diff,
            });
        }
    }

    const metadataChanged = !lock || lock.plugin !== config.plugin || lock.version !== version
        || JSON.stringify(Object.keys(lock.skills ?? {}).toSorted()) !== JSON.stringify(skills.toSorted());

    return {
        clean: !metadataChanged && changed.length === 0 && missing.length === 0,
        changed,
        missing,
        version,
        lockedVersion: lock?.version ?? null,
        metadataChanged,
    };
};

/** Records the installed skills as reviewed: copies them for later diffs and rewrites the lock. */
export const acceptUpstream = options => {
    const {
        config,
        root,
        version,
        skills,
    } = context(options);
    const reviewedRoot = path.join(options.toolDir, REVIEWED);
    const entries = skills.map(skill => {
        const dir = skillDir(root, skill);

        return [skill, {files: hashDir(dir), dir}];
    });

    rmSync(reviewedRoot, {recursive: true, force: true});

    for (const [skill, {dir}] of entries) {
        cpSync(dir, path.join(reviewedRoot, skill), {recursive: true});
    }

    const lock = {
        plugin: config.plugin,
        version,
        skills: Object.fromEntries(entries.map(([skill, {files}]) => [skill, {files}])),
    };

    writeFileSync(path.join(options.toolDir, LOCK), `${JSON.stringify(lock, null, 4)}\n`);

    return lock;
};

export {FlowError};
