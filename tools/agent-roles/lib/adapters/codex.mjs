import {readFileSync} from 'node:fs';

import {classify} from './common.mjs';

/** codex echoes the prompt and progress on stderr; only its `ERROR:` lines describe the failure. */
const errorText = (stderr = '') => {
    const lines = stderr.split('\n').filter(line => line.startsWith('ERROR:'));

    return lines.length > 0 ? lines.join('\n') : stderr.trim().split('\n').at(-1);
};

const FIXES = {
    install: 'install the Codex CLI',
    'not logged in': 'run `codex login`',
    quota: 'wait for the Codex usage limit to reset',
};

export const codex = {
    name: 'codex',
    buildInvocation: ({
        model,
        effort,
        cwd,
        prompt,
        outFile,
    }) => ({
        cmd: 'codex',
        args: [
            'exec',
            '--skip-git-repo-check',
            '-s',
            'read-only',
            '-m',
            model,
            '-c',
            `model_reasoning_effort="${effort}"`,
            '-c',
            'web_search="live"',
            '-C',
            cwd,
            '-o',
            outFile,
            '-',
        ],
        stdin: prompt,
    }),
    parseOutput: ({outFile}) => readFileSync(outFile, 'utf8'),
    detectUnavailable: () => null,
    classifyFailure: ({spawnError, stderr}) => classify({
        spawnError,
        text: errorText(stderr),
        fixes: FIXES,
    }),
};
