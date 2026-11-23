#!/usr/bin/env node
/*
 * root:test-explore: runs every *.property.test.ts in explore mode
 * (random seed, larger run counts). Manual use only; see docs/testing-oracles.md.
 */
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = {...process.env, STAGISTIC_FC_EXPLORE: '1'};
const child = spawn(path.join(root, 'node_modules/.bin/vp'), [
    'test',
    'run',
    '.property.test.ts',
    ...process.argv.slice(2),
], {
    cwd: root,
    env,
    stdio: [
        'inherit',
        'pipe',
        'pipe',
    ],
});
let output = '';

// Stream output live (long explore runs); keep a copy to find the seed for the replay hint.
child.stdout.on('data', chunk => {
    output += chunk;
    process.stdout.write(chunk);
});
child.stderr.on('data', chunk => {
    output += chunk;
    process.stderr.write(chunk);
});

const status = await new Promise(resolve => {
    child.on('error', () => resolve(1));
    child.on('close', code => resolve(code ?? 1));
});
const result = {status};

if (result.status !== 0) {
    const seeds = [...new Set([...output.matchAll(/seed:\s*(-?\d+)/gu)].map(match => match[1]))];
    const files = [...new Set([...output.matchAll(/(?:FAIL|❯)\s+(?:\S+\s+)?(\S+\.property\.test\.ts)/gu)].map(match => match[1]))];

    for (const seed of seeds) {
        const target = files.length === 1 ? path.basename(files[0]) : '<file>.property.test.ts';

        process.stderr.write(`\nReplay: STAGISTIC_FC_EXPLORE=1 STAGISTIC_FC_SEED=${seed} node_modules/.bin/vp test run ${target}\n`
            + '(fast-check also printed `path`; add it as `path` in the property parameters to jump to the shrunk case.)\n');
    }

    if (seeds.length === 0) {
        process.stderr.write('\nNo fast-check seed found in the output; see the failure above.\n');
    }
}

process.exitCode = status;
