#!/usr/bin/env node
import {fileURLToPath} from 'node:url';

import {runCli} from '../lib/cli.mjs';

const result = runCli(process.argv.slice(2), {toolDir: fileURLToPath(new URL('..', import.meta.url))});

process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
process.exitCode = result.exitCode;
