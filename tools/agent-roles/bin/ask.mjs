#!/usr/bin/env node
import {text} from 'node:stream/consumers';
import {parseArgs} from 'node:util';

import {EXIT, runAsk} from '../lib/run.mjs';

const USAGE = 'Usage: ask.mjs --role <role> [--cwd <dir>] [--provider p] [--model m] [--effort e] [--timeout s] (<prompt> | -)';

const parse = () => {
    try {
        return parseArgs({
            allowPositionals: true,
            options: {
                role: {type: 'string'},
                cwd: {type: 'string'},
                provider: {type: 'string'},
                model: {type: 'string'},
                effort: {type: 'string'},
                timeout: {type: 'string'},
            },
        });
    } catch (error) {
        return {error};
    }
};

const {
    values,
    positionals,
    error,
} = parse();

if (error || !values.role || positionals.length !== 1) {
    process.stderr.write(`${error ? `${error.message}\n` : ''}${USAGE}\n`);
    process.exit(EXIT.usage);
}

const prompt = positionals[0] === '-' ? await text(process.stdin) : positionals[0];
const overrides = Object.fromEntries([
    'provider',
    'model',
    'effort',
]
    .filter(key => values[key] !== undefined)
    .map(key => [key, values[key]]));
const result = await runAsk({
    role: values.role,
    prompt,
    cwd: values.cwd ?? process.cwd(),
    overrides,
    timeoutSeconds: values.timeout === undefined ? undefined : Number(values.timeout),
});

if (result.output) {
    process.stdout.write(result.output.endsWith('\n') ? result.output : `${result.output}\n`);
}

if (result.message) {
    process.stderr.write(`${result.message}\n`);
}

process.exitCode = result.exitCode;
