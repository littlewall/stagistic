import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {
    lstatSync,
    readdirSync,
    readFileSync,
    readlinkSync,
} from 'node:fs';
import path from 'node:path';

export const gitOutput = (root, args) => {
    const result = spawnSync('git', args, {
        cwd: root,
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
    });

    if (result.status !== 0) {
        throw new Error(`Cannot inspect verification inputs: ${result.stderr ?? result.error?.message}`);
    }

    return result.stdout;
};

// Hash content, not mtimes: formatters may rewrite a file without changing it.
const hashFile = (hash, root, file) => {
    hash.update(file).update('\0');
    try {
        const absolute = path.join(root, file);
        const stat = lstatSync(absolute);

        hash.update(String(stat.mode)).update('\0');

        if (stat.isSymbolicLink()) {
            hash.update(readlinkSync(absolute));
        } else if (stat.isFile()) {
            hash.update(readFileSync(absolute));
        }
    } catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }

        hash.update('missing');
    }

    hash.update('\0');
};

export const verificationFingerprint = root => {
    const files = new Set(gitOutput(root, [
        'ls-files',
        '--cached',
        '--others',
        '--exclude-standard',
        '-z',
    ])
        .split('\0').filter(Boolean));
    const directories = new Set(['.', ...[...files].filter(file => path.basename(file) === 'package.json').map(file => path.dirname(file))]);

    for (const directory of directories) {
        try {
            for (const name of readdirSync(path.join(root, directory))) {
                if (name === '.env' || name.startsWith('.env.')) {
                    files.add(path.join(directory, name));
                }
            }
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    }

    for (const file of ['node_modules/.modules.yaml', 'node_modules/.pnpm/lock.yaml']) {
        files.add(file);
    }

    /*
     * Do not include harness/session variables: the hook and CLI must share results.
     * External services and any other runtime inputs require --fresh.
     */
    const environment = Object.entries(process.env).filter(([key]) => (/^(CI|NODE_ENV|NODE_OPTIONS|TZ|LANG|LC_.*|VITE_.*|VITEST.*|PLAYWRIGHT.*|BROWSER.*|DATABASE_URL|PGLITE.*|STAGISTIC_.*)$/).test(key))
        .toSorted(([left], [right]) => left.localeCompare(right));
    const hash = createHash('sha256');

    hash.update(JSON.stringify([
        process.version,
        process.platform,
        process.arch,
        environment,
    ]));
    hash.update(gitOutput(root, [
        'status',
        '--porcelain=v1',
        '-z',
        '--untracked-files=all',
    ]));
    hash.update(gitOutput(root, [
        'diff',
        '--cached',
        '--raw',
        '-z',
    ]));
    for (const file of [...files].toSorted()) {
        hashFile(hash, root, file);
    }

    return hash.digest('hex');
};
