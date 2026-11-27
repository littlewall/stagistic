import type {Release} from '@stagistic/release-notes';

export const REPOSITORY = 'littlewall/stagistic';
export const TARGET_TRIPLE = 'aarch64-apple-darwin';
export const UPDATER_PLATFORM = 'darwin-aarch64';

export const ASSET_NAMES = {
    dmg: 'Stagistic-Editor-mac-arm64.dmg',
    updaterArchive: 'Stagistic-Editor-mac-arm64.app.tar.gz',
    updaterSignature: 'Stagistic-Editor-mac-arm64.app.tar.gz.sig',
    latest: 'latest.json',
} as const;

export interface ReleaseArgs {
    tag?: string,
    testVersion?: string,
    updaterEndpoint?: string,
    publishDraft: boolean,
    outDir?: string,
}

const VALUE_FLAGS = {
    '--tag': 'tag',
    '--test-version': 'testVersion',
    '--updater-endpoint': 'updaterEndpoint',
    '--out-dir': 'outDir',
} as const;

export const parseArgs = (argv: readonly string[]): ReleaseArgs => {
    const args: ReleaseArgs = {publishDraft: false};

    for (let index = 0; index < argv.length; index++) {
        const arg = argv[index];

        if (arg === '--') {
            continue;
        }

        if (arg === '--publish-draft') {
            args.publishDraft = true;
        } else if (arg in VALUE_FLAGS) {
            const value = argv[index + 1];

            if (value === undefined || value.startsWith('--')) {
                throw new Error(`${arg} needs a value.`);
            }

            args[VALUE_FLAGS[arg as keyof typeof VALUE_FLAGS]] = value;
            index++;
        } else {
            throw new Error(`Unknown argument ${arg}.`);
        }
    }

    if (args.testVersion !== undefined && !(/^\d+\.\d+\.\d+-test\.\d+$/).test(args.testVersion)) {
        throw new Error(`--test-version must look like X.Y.Z-test.N, got ${args.testVersion}.`);
    }

    if (args.updaterEndpoint !== undefined) {
        assertUpdaterEndpoint(args);
    }

    return args;
};

/** True for `http://127.0.0.1:<port>/…` and `http://localhost:<port>/…`. */
export const isLoopbackHttpEndpoint = (endpoint: string): boolean => (/^http:\/\/(?:127\.0\.0\.1|localhost):\d+(?:\/|$)/).test(endpoint);

const assertUpdaterEndpoint = (args: ReleaseArgs): void => {
    const endpoint = args.updaterEndpoint ?? '';

    if (args.tag !== undefined || args.publishDraft) {
        throw new Error('--updater-endpoint is for test builds; it cannot be combined with --tag or --publish-draft.');
    }

    if (endpoint.startsWith('http://')) {
        if (!isLoopbackHttpEndpoint(endpoint)) {
            throw new Error(`Plain http is allowed only for 127.0.0.1 or localhost with a port, got ${endpoint}.`);
        }

        if (args.testVersion === undefined) {
            throw new Error('An http:// --updater-endpoint needs --test-version.');
        }
    }
};

/** The one Release number every file agrees on; throws on disagreement, unreadable numbers or a tag mismatch. */
export const resolveReleaseNumber = (files: readonly {file: string, version: string}[], tag?: string): string => {
    const versions = new Set(files.map(file => file.version));

    if (files.length === 0 || versions.size !== 1 || versions.has('unreadable')) {
        const detail = files.map(file => `${file.file}: ${file.version}`).join(', ');

        throw new Error(`Release number disagrees across files (${detail}).`);
    }

    const [version] = versions;

    if (tag !== undefined && tag !== `v${version}`) {
        throw new Error(`Tag ${tag} does not match Release v${version}.`);
    }

    return version;
};

export const UPDATER_PUBKEY_PLACEHOLDER = 'REPLACE_WITH_STAGISTIC_UPDATER_PUBLIC_KEY';

/** True when a TAURI_SIGNING_PRIVATE_KEY (inline or as a file path) is set. */
export const hasUpdaterSigningKey = (env: Record<string, string | undefined>): boolean => {
    return Boolean(env.TAURI_SIGNING_PRIVATE_KEY) || Boolean(env.TAURI_SIGNING_PRIVATE_KEY_PATH);
};

/**
 * A tagged or published Release must ship signed updater artifacts: without
 * the signing key or the real public key, installed apps could never update.
 * Local and test runs keep the soft path.
 */
export const assertUpdaterReady = (options: {
    args: Pick<ReleaseArgs, 'tag' | 'publishDraft'>,
    hasUpdaterConfig: boolean,
    canSignUpdates: boolean,
    pubkey?: string,
}): void => {
    if (options.args.tag === undefined && !options.args.publishDraft) {
        return;
    }

    if (!options.hasUpdaterConfig) {
        throw new Error('plugins.updater is missing in tauri.conf.json; a tagged or published Release needs it.');
    }

    if (!options.canSignUpdates) {
        throw new Error('TAURI_SIGNING_PRIVATE_KEY is not set; a tagged or published Release must be signed (docs/releasing/credentials.md). Nothing was built or uploaded.');
    }

    if (options.pubkey === undefined || options.pubkey === UPDATER_PUBKEY_PLACEHOLDER) {
        throw new Error('plugins.updater.pubkey in tauri.conf.json is still the placeholder; paste the public key (docs/releasing/credentials.md). Nothing was built or uploaded.');
    }
};

/** The effective version of the build: the test version when given, else the Release number. */
export const effectiveVersion = (release: string, testVersion?: string): string => testVersion ?? release;

/**
 * Build-time `tauri build --config` override; never written to files.
 * The updater endpoint is applied only when the base config already has an updater plugin.
 */
export const buildConfigOverride = (options: {
    testVersion?: string,
    updaterEndpoint?: string,
    hasUpdaterConfig: boolean,
    /** Whether a TAURI_SIGNING_PRIVATE_KEY is available; without it updater artifacts cannot be signed. */
    hasUpdaterSigningKey?: boolean,
}): Record<string, unknown> | undefined => {
    const override: Record<string, unknown> = {};

    if (options.hasUpdaterConfig && options.hasUpdaterSigningKey === false) {
        override.bundle = {createUpdaterArtifacts: false};
    }

    if (options.testVersion !== undefined) {
        override.version = options.testVersion;
    }

    if (options.updaterEndpoint !== undefined && options.hasUpdaterConfig) {
        const insecure = options.testVersion !== undefined && isLoopbackHttpEndpoint(options.updaterEndpoint);

        override.plugins = {updater: {
            endpoints: [options.updaterEndpoint],
            ...insecure ? {dangerousInsecureTransportProtocol: true} : {},
        }};
    }

    return Object.keys(override).length === 0 ? undefined : override;
};

export const tauriBuildArgs = (override: Record<string, unknown> | undefined): string[] => [
    'build',
    '--target',
    TARGET_TRIPLE,
    ...override === undefined ? [] : ['--config', JSON.stringify(override)],
];

export type SigningMode = {mode: 'developer-id', identity: string} | {mode: 'ad-hoc'};

const NOTARIZATION_VARIABLES = [
    'APPLE_API_ISSUER',
    'APPLE_API_KEY',
    'APPLE_API_KEY_PATH',
] as const;

/** Developer ID + notarization when every Apple credential is set, ad-hoc when none is; a partial set is an error. */
export const selectSigning = (env: Readonly<Record<string, string | undefined>>): SigningMode => {
    const present = (name: string): boolean => (env[name] ?? '') !== '';
    const identity = env.APPLE_SIGNING_IDENTITY ?? '';
    const names = ['APPLE_SIGNING_IDENTITY', ...NOTARIZATION_VARIABLES];
    const missing = names.filter(name => !present(name));

    if (missing.length === 0 && identity !== '-') {
        return {mode: 'developer-id', identity};
    }

    if (names.some(present) && !(missing.length === names.length - 1 && identity === '-')) {
        throw new Error(`Incomplete Apple credentials; missing ${missing.join(', ')}. Set all or none for ad-hoc signing.`);
    }

    return {mode: 'ad-hoc'};
};

/** Environment for the MCP bundle and `tauri build` under a signing mode. */
export const signingEnv = (env: Readonly<Record<string, string | undefined>>, signing: SigningMode): Record<string, string | undefined> => {
    const base = {
        ...env,
        CI: 'true',
        // The Tauri CLI reads only TAURI_SIGNING_PRIVATE_KEY (a path or the key itself), not *_PATH.
        TAURI_SIGNING_PRIVATE_KEY: env.TAURI_SIGNING_PRIVATE_KEY || env.TAURI_SIGNING_PRIVATE_KEY_PATH || undefined,
    };

    if (signing.mode === 'developer-id') {
        return {
            ...base,
            STAGISTIC_MCP_SIGNING_IDENTITY: signing.identity,
        };
    }

    return {
        ...base,
        APPLE_SIGNING_IDENTITY: '-',
        APPLE_API_ISSUER: undefined,
        APPLE_API_KEY: undefined,
        APPLE_API_KEY_PATH: undefined,
        APPLE_ID: undefined,
        APPLE_PASSWORD: undefined,
        APPLE_TEAM_ID: undefined,
        STAGISTIC_MCP_SIGNING_IDENTITY: undefined,
    };
};

/**
 * Commands that sign, notarize and staple the DMG for a Developer ID build.
 * Tauri notarizes only the app inside; the downloaded DMG needs its own ticket.
 */
export const dmgNotarizeCommands = (
    dmg: string,
    signing: SigningMode,
    env: Readonly<Record<string, string | undefined>>,
): [string, string[]][] => {
    if (signing.mode !== 'developer-id') {
        return [];
    }

    return [
        [
            'codesign',
            [
                '--force',
                '--timestamp',
                '--sign',
                signing.identity,
                dmg,
            ],
        ],
        [
            'xcrun',
            [
                'notarytool',
                'submit',
                dmg,
                '--key',
                env.APPLE_API_KEY_PATH ?? '',
                '--key-id',
                env.APPLE_API_KEY ?? '',
                '--issuer',
                env.APPLE_API_ISSUER ?? '',
                '--wait',
            ],
        ],
        [
            'xcrun',
            [
                'stapler',
                'staple',
                dmg,
            ],
        ],
    ];
};

/** `node` arguments for the MCP artifact build: Developer ID release or ad-hoc. */
export const mcpBuildArgs = (signing: SigningMode): string[] => ['scripts/build-artifacts.mjs', ...signing.mode === 'developer-id' ? ['--release'] : []];

export const releaseUrl = (version: string, asset: string): string => `https://github.com/${REPOSITORY}/releases/download/v${version}/${asset}`;

export const latestJson = (options: {
    version: string,
    notes: string,
    pubDate: string,
    signature: string,
    /** Updater endpoint override: the archive is expected next to latest.json there. */
    updaterEndpoint?: string,
}) => ({
    version: options.version,
    notes: options.notes,
    pub_date: options.pubDate,
    platforms: {
        [UPDATER_PLATFORM]: {
            signature: options.signature,
            url: options.updaterEndpoint === undefined
                ? releaseUrl(options.version, ASSET_NAMES.updaterArchive)
                : new URL(ASSET_NAMES.updaterArchive, options.updaterEndpoint).toString(),
        },
    },
});

/** Plain text of a Release's notes for the updater prompt. */
export const plainNotes = (release: Release): string => release.notes.map(note => `${note.title}\n${note.description}`).join('\n\n');

export const draftTag = (version: string): string => `v${version}`;

/** `gh` argument lists, in order, to create or update the draft Release. Never publishes. */
export const ghCommands = (options: {
    version: string,
    exists: boolean,
    bodyFile: string,
    files: readonly string[],
}): string[][] => {
    const tag = draftTag(options.version);
    const repo = ['--repo', REPOSITORY];

    if (!options.exists) {
        return [
            [
                'release',
                'create',
                tag,
                ...repo,
                '--draft',
                ...options.version.includes('-') ? ['--prerelease'] : [],
                '--title',
                tag,
                '--notes-file',
                options.bodyFile,
                ...options.files,
            ],
        ];
    }

    return [
        [
            'release',
            'edit',
            tag,
            ...repo,
            '--draft',
            '--notes-file',
            options.bodyFile,
        ],
        [
            'release',
            'upload',
            tag,
            ...repo,
            '--clobber',
            ...options.files,
        ],
    ];
};
