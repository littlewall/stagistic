import {classify} from './common.mjs';

const FIXES = {
    install: 'install the Antigravity CLI (agy)',
    'not logged in': 'run `agy` once and sign in',
    quota: 'wait for the Antigravity quota to reset',
};

const parseJson = stdout => {
    try {
        return JSON.parse(stdout);
    } catch {
        return null;
    }
};

export const agy = {
    name: 'agy',
    /*
     * Default headless mode auto-denies writes; `--mode plan` writes a plan instead of answering.
     * agy model ids carry their effort and reject `--effort`; the config effort only maps the Claude fallback.
     */
    buildInvocation: ({model, prompt}) => ({
        cmd: 'agy',
        args: [
            `--print=${prompt}`,
            '--sandbox',
            '--model',
            model,
            '--output-format',
            'json',
        ],
    }),
    parseOutput: ({stdout}) => parseJson(stdout)?.response ?? '',
    outputFailure: ({stdout}) => {
        const json = parseJson(stdout);

        if (!json) {
            return 'unparseable output';
        }

        if (json.status !== 'SUCCESS') {
            return json.error ?? `status ${json.status}`;
        }

        if (!json.response?.trim()) {
            return json.denied_actions?.length
                ? `denied actions: ${json.denied_actions.map(({action}) => action).join(', ')}`
                : 'empty response';
        }

        return null;
    },
    // Logged out, agy blocks on an interactive authentication prompt.
    detectUnavailable: stderr => ((/Waiting for authentication/i).test(stderr) ? 'not logged in' : null),
    classifyFailure: ({
        spawnError,
        stdout,
        stderr,
    }) => classify({
        spawnError,
        text: parseJson(stdout)?.error ?? stderr,
        fixes: FIXES,
    }),
};
