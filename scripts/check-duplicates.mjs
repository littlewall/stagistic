#!/usr/bin/env node
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const status = spawnSync('git', [
    'status',
    '--porcelain=v1',
    '-z',
    '--',
    '.jscpd.json',
    '.jscpd-baseline.json',
], {cwd: root, encoding: 'utf8'});

if (status.status !== 0) {
    process.stderr.write(status.stderr || status.error?.message || 'Cannot inspect duplication configuration changes.\n');
    process.exit(2);
}

// Configuration changes affect unchanged source files too.
const args = ['--config', '.jscpd.json'];

if (!status.stdout) {
    args.push('--changed');
}

const result = spawnSync(path.join(root, 'node_modules/.bin/jscpd'), [...args, '--'], {
    cwd: root,
    stdio: 'inherit',
});

if (result.error) {
    process.stderr.write(`${result.error.message}\n`);
}

process.exit(result.status ?? 2);
