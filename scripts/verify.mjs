#!/usr/bin/env node
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {verifyTask} from './verification.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const fresh = args[0] === '--fresh';

if (fresh) {
    args.shift();
}

const task = args.shift();

if (args[0] === '--') {
    args.shift();
}

try {
    const result = verifyTask({
        root,
        task,
        args,
        fresh,
    });
    const status = result.reused ? 'REUSED' : result.ok ? 'PASS' : 'FAIL';

    process.stdout.write(`${status} ${task} (${result.durationMs} ms)${result.stable ? '' : ' — inputs changed; result will not be reused'}\nLog: ${result.logPath}\n`);

    if (!result.ok) {
        process.stderr.write(`${result.output}\n`);
    }

    process.exitCode = result.exitCode;
} catch (error) {
    process.stderr.write(`${error.message}\nUsage: moon run root:verify -- [--fresh] <project>:<check> [-- <arguments>]\n`);
    process.exitCode = 1;
}
