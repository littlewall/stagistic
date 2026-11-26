import {ASSET_NAMES} from './lib';

export const UPDATE_TEST_PORT = 8765;
export const UPDATE_TEST_ENDPOINT = `http://127.0.0.1:${UPDATE_TEST_PORT}/latest.json`;
export const INSTALLED_APP = '/Applications/Stagistic Editor.app';
export const PROCESS_NAME = 'Stagistic Editor';
export const UPDATE_TIMEOUT_MS = 10 * 60 * 1000;

export const STEPS = [
    {
        id: 'preflight',
        title: 'Preflight',
    },
    {
        id: 'build-a',
        title: 'Build A',
    },
    {
        id: 'build-b',
        title: 'Build B',
    },
    {
        id: 'install-a',
        title: 'Install A',
    },
    {
        id: 'use-a',
        title: 'Use A and quit',
    },
    {
        id: 'serve-b',
        title: 'Serve B',
    },
    {
        id: 'update',
        title: 'Update A to B',
    },
    {
        id: 'verify',
        title: 'Verify after update',
    },
    {
        id: 'cleanup',
        title: 'Cleanup and report',
    },
] as const;

export type StepId = typeof STEPS[number]['id'];

export const testVersions = (base: string): {a: string, b: string} => ({
    a: `${base}-test.1`,
    b: `${base}-test.2`,
});

/** `cli.ts` arguments for one test build; `outDir` is relative to apps/desktop. */
export const buildArgs = (version: string, outDir: string): string[] => [
    'scripts/release/cli.ts',
    '--test-version',
    version,
    '--updater-endpoint',
    UPDATE_TEST_ENDPOINT,
    '--out-dir',
    outDir,
];

export const isTestBuild = (version: string): boolean => (/^\d+\.\d+\.\d+-test\.\d+$/).test(version);

/** `--from <step>`: a step id or its 1-based number. Returns the index of the first step to run. */
export const parseUpdateTestArgs = (argv: readonly string[]): {fromIndex: number} => {
    let fromIndex = 0;

    for (let index = 0; index < argv.length; index++) {
        const arg = argv[index];

        if (arg === '--') {
            continue;
        }

        if (arg !== '--from') {
            throw new Error(`Unknown argument ${arg}.`);
        }

        const value = argv[++index];
        const byId = STEPS.findIndex(step => step.id === value);
        const byNumber = (/^\d+$/).test(value ?? '') ? Number(value) - 1 : -1;
        const found = byId === -1 ? byNumber : byId;

        if (found < 0 || found >= STEPS.length) {
            throw new Error(`--from needs a step id (${STEPS.map(step => step.id).join(', ')}) or number 1-${STEPS.length}.`);
        }

        fromIndex = found;
    }

    return {fromIndex};
};

export type Answer = 'run' | 'skip' | 'quit';

/** Enter = run/continue, `s` = skip, `q` = quit; anything else asks again (undefined). */
export const parseAnswer = (line: string): Answer | undefined => {
    const text = line.trim().toLowerCase();

    if (text === '') {
        return 'run';
    }

    if (text === 's') {
        return 'skip';
    }

    return text === 'q' ? 'quit' : undefined;
};

export interface NamedFile {
    name: string,
    mtimeMs: number,
}

export const newestFile = (files: readonly NamedFile[]): NamedFile | undefined => files.reduce<NamedFile | undefined>(
    (best, file) => best === undefined || file.mtimeMs > best.mtimeMs ? file : best,
    undefined,
);

/** The archive and latest.json are the only files the test server hands out. */
export const servedFile = (urlPath: string): string | undefined => {
    const name = decodeURIComponent(urlPath.split('?')[0]).replace(/^\//, '');

    return name === ASSET_NAMES.latest || name === ASSET_NAMES.updaterArchive ? name : undefined;
};

export interface ReportEntry {
    step: string,
    status: 'PASS' | 'FAIL' | 'SKIP',
    startedAt: string,
    seconds: number,
    notes: string[],
}

export const renderReport = (options: {
    base: string,
    startedAt: string,
    entries: readonly ReportEntry[],
    answers: readonly {question: string, answer: string}[],
}): string => {
    const lines = [
        '# Update test report',
        '',
        `Release ${options.base}, A ${testVersions(options.base).a} to B ${testVersions(options.base).b}, started ${options.startedAt}.`,
        '',
        '| Step | Result | Started | Seconds | Notes |',
        '| --- | --- | --- | --- | --- |',
        ...options.entries.map(entry => `| ${entry.step} | ${entry.status} | ${entry.startedAt} | ${entry.seconds} | ${entry.notes.join('; ').replaceAll('|', '/')} |`),
        '',
        '## Your answers',
        '',
        ...options.answers.length === 0 ? ['None.'] : options.answers.map(item => `- ${item.question}: ${item.answer}`),
        '',
    ];

    return lines.join('\n');
};
