#!/usr/bin/env node
import {parseArgs} from 'node:util';

import {ConfigError} from '../lib/config.mjs';
import {syncAgents} from '../lib/sync.mjs';

const {values} = parseArgs({options: {cwd: {type: 'string'}, check: {type: 'boolean'}}});

try {
    const {
        written,
        drift,
        errors,
    } = syncAgents({cwd: values.cwd ?? process.cwd(), check: values.check});

    if (errors.length > 0) {
        process.stderr.write(`agent-roles: invalid config, nothing written:\n${errors.map(error => `  ${error}`).join('\n')}\n`);
        process.exitCode = 1;
    } else if (drift.length > 0) {
        process.stderr.write(`agent-roles: generated agents out of date (run sync):\n${drift.map(file => `  ${file}`).join('\n')}\n`);
        process.exitCode = 1;
    } else {
        process.stdout.write(values.check ? 'agent-roles: agents up to date\n' : `agent-roles: ${written.length} agent file(s) written\n`);
    }
} catch (error) {
    if (!(error instanceof ConfigError)) {
        throw error;
    }

    process.stderr.write(`agent-roles: ${error.message}\n`);
    process.exitCode = 1;
}
