import {
    ASSET_NAMES,
    releaseUrl,
    UPDATER_PLATFORM,
} from './lib';

export const BUNDLE_IDENTIFIER = 'com.stagistic.editor';
export const MIN_MACOS_MAJOR = '15';

export type CheckStatus = 'PASS' | 'FAIL' | 'SKIP';

export interface CheckResult {
    status: CheckStatus,
    name: string,
    detail: string,
}

export const pass = (name: string, detail = ''): CheckResult => ({
    status: 'PASS',
    name,
    detail,
});
export const fail = (name: string, detail: string): CheckResult => ({
    status: 'FAIL',
    name,
    detail,
});
export const skip = (name: string, detail: string): CheckResult => ({
    status: 'SKIP',
    name,
    detail,
});

const check = (ok: boolean, name: string, okDetail: string, failDetail: string): CheckResult => ok ? pass(name, okDetail) : fail(name, failDetail);

export const formatResult = (result: CheckResult): string => `${result.status}  ${result.name}  ${result.detail}`.trimEnd();

export const summarize = (results: readonly CheckResult[]): {line: string, failed: boolean} => {
    const count = (status: CheckStatus): number => results.filter(result => result.status === status).length;

    return {
        line: `${count('PASS')} passed, ${count('FAIL')} failed, ${count('SKIP')} skipped`,
        failed: count('FAIL') > 0,
    };
};

export interface VerifyArgs {
    dmg?: string,
    app?: string,
    draft?: string,
    live?: string,
    version?: string,
    allowAdHoc: boolean,
}

export const parseVerifyArgs = (argv: readonly string[]): VerifyArgs => {
    const args: VerifyArgs = {allowAdHoc: false};
    const flags = {
        '--dmg': 'dmg',
        '--app': 'app',
        '--draft': 'draft',
        '--live': 'live',
        '--version': 'version',
    } as const;

    for (let index = 0; index < argv.length; index++) {
        const arg = argv[index];

        if (arg === '--') {
            continue;
        }

        if (arg === '--allow-ad-hoc') {
            args.allowAdHoc = true;
        } else if (arg in flags) {
            const value = argv[index + 1];

            if (value === undefined || value.startsWith('--')) {
                throw new Error(`${arg} needs a value.`);
            }

            args[flags[arg as keyof typeof flags]] = value;
            index++;
        } else {
            throw new Error(`Unknown argument ${arg}.`);
        }
    }

    const modes = [
        args.dmg,
        args.app,
        args.draft,
        args.live,
    ].filter(value => value !== undefined);

    if (modes.length !== 1) {
        throw new Error('Pass exactly one of --dmg <path>, --app <path>, --draft vX.Y.Z, --live X.Y.Z.');
    }

    if (args.draft !== undefined && !(/^v\d+\.\d+\.\d+(?:-[\w.]+)?$/).test(args.draft)) {
        throw new Error(`--draft must look like vX.Y.Z, got ${args.draft}.`);
    }

    if (args.live !== undefined && !(/^\d+\.\d+\.\d+(?:-[\w.]+)?$/).test(args.live)) {
        throw new Error(`--live must look like X.Y.Z, got ${args.live}.`);
    }

    return args;
};

export const checkBundleId = (actual: string): CheckResult => check(actual === BUNDLE_IDENTIFIER, 'bundle-id', actual, `expected ${BUNDLE_IDENTIFIER}, got ${actual || '(none)'}`);

export const checkVersion = (actual: string, expected?: string): CheckResult => {
    if (expected === undefined) {
        return actual === '' ? fail('version', 'CFBundleShortVersionString missing') : pass('version', actual);
    }

    return check(actual === expected, 'version', actual, `expected ${expected}, got ${actual || '(none)'}`);
};

export const checkMinimumSystem = (actual: string): CheckResult => check(
    actual.split('.')[0] === MIN_MACOS_MAJOR,
    'min-macos',
    actual,
    `LSMinimumSystemVersion must start with ${MIN_MACOS_MAJOR}, got ${actual || '(none)'}`,
);

/** `lipo -archs` output, e.g. `arm64`; anything else (x86_64, universal) fails. */
export const checkArchitectures = (output: string): CheckResult => {
    const archs = output.trim().split(/\s+/).filter(Boolean)
        .toSorted();

    return check(archs.length === 1 && archs[0] === 'arm64', 'architecture', archs.join(' '), `expected exactly arm64, got ${archs.join(' ') || '(none)'}`);
};

export type SigningKind = 'developer-id' | 'ad-hoc' | 'unsigned';

export interface CodesignInfo {
    kind: SigningKind,
    authority?: string,
    teamId?: string,
}

/** Parses `codesign -dv --verbose=2` output (stderr). */
export const parseCodesign = (output: string): CodesignInfo => {
    const authority = (/^Authority=(Developer ID Application:.*)$/m).exec(output)?.[1];
    const teamId = (/^TeamIdentifier=(\S+)$/m).exec(output)?.[1];

    if (authority !== undefined) {
        return {
            kind: 'developer-id',
            authority,
            teamId: teamId === 'not set' ? undefined : teamId,
        };
    }

    if ((/^Signature=adhoc$/m).test(output) || (/flags=0x[\da-f]+\([^)]*adhoc/).test(output)) {
        return {kind: 'ad-hoc'};
    }

    return {kind: 'unsigned'};
};

export const checkSigningKind = (info: CodesignInfo, allowAdHoc: boolean): CheckResult => {
    if (info.kind === 'developer-id') {
        return pass('signing', `Developer ID, team ${info.teamId ?? 'unknown'}`);
    }

    if (info.kind === 'ad-hoc') {
        return allowAdHoc ? pass('signing', 'ad-hoc (allowed)') : fail('signing', 'ad-hoc signed; a public Release needs Developer ID (use --allow-ad-hoc for test builds)');
    }

    return fail('signing', 'not signed');
};

/** `spctl --assess --type execute -vv` output with its exit status. */
export const checkSpctl = (output: string, status: number): CheckResult => {
    const accepted = status === 0 && (/: accepted/).test(output);
    const notarized = (/source=Notarized Developer ID/).test(output);

    if (accepted && notarized) {
        return pass('gatekeeper', 'accepted, Notarized Developer ID');
    }

    return fail('gatekeeper', accepted ? 'accepted but source is not Notarized Developer ID' : `rejected: ${output.trim().split('\n')[0] ?? ''}`);
};

export const checkStapler = (name: string, output: string, status: number): CheckResult => check(
    status === 0 && (/The validate action worked/).test(output),
    name,
    'ticket stapled',
    `no valid ticket: ${output.trim().split('\n').pop() ?? ''}`,
);

export const checkBridgeTeam = (app: CodesignInfo, bridge: CodesignInfo): CheckResult => {
    if (bridge.kind !== 'developer-id' || bridge.teamId === undefined) {
        return fail('mcp-bridge-signing', `bridge is ${bridge.kind}, expected Developer ID`);
    }

    return check(bridge.teamId === app.teamId, 'mcp-bridge-signing', `team ${bridge.teamId}`, `bridge team ${bridge.teamId} differs from app team ${app.teamId ?? 'unknown'}`);
};

export const checkAssetSet = (names: readonly string[]): CheckResult => {
    const expected = Object.values(ASSET_NAMES).toSorted();
    const actual = names.toSorted();
    const missing = expected.filter(name => !actual.includes(name));
    const extra = actual.filter(name => !expected.includes(name as never));

    return check(missing.length === 0 && extra.length === 0, 'assets', `${expected.length} assets`, `missing: ${missing.join(', ') || '-'}; unexpected: ${extra.join(', ') || '-'}`);
};

export const checkDraftState = (release: {
    isDraft: boolean,
    body: string,
    tagName: string,
}, tag: string): CheckResult[] => [
    check(release.tagName === tag, 'draft-tag', release.tagName, `expected ${tag}, got ${release.tagName}`),
    check(release.isDraft, 'draft-state', 'is a draft', 'release is already published (or not a draft)'),
    check(release.body.trim() !== '', 'draft-body', `${release.body.length} chars`, 'release body is empty'),
];

/** latest.json from a draft against the expected version, URL and `.sig` content. */
export const checkLatestJson = (latest: unknown, options: {version: string, signature: string}): CheckResult[] => {
    const value = (typeof latest === 'object' && latest !== null ? latest : {}) as Record<string, unknown>;
    const platforms = (value.platforms ?? {}) as Record<string, {url?: unknown, signature?: unknown} | undefined>;
    const entry = platforms[UPDATER_PLATFORM];
    const expectedUrl = releaseUrl(options.version, ASSET_NAMES.updaterArchive);
    const pubDate = typeof value.pub_date === 'string' ? value.pub_date : '';

    return [
        check(value.version === options.version, 'latest-version', String(value.version), `expected ${options.version}, got ${String(value.version)}`),
        check(entry?.url === expectedUrl, 'latest-url', expectedUrl, `expected ${expectedUrl}, got ${String(entry?.url)}`),
        check(entry?.signature === options.signature && options.signature !== '', 'latest-signature', 'matches .sig', 'signature differs from the .sig asset'),
        check(pubDate !== '' && !Number.isNaN(Date.parse(pubDate)), 'latest-pub-date', pubDate, `pub_date is not a date: ${pubDate || '(none)'}`),
    ];
};

export const checkLiveLatest = (latest: unknown, version: string): CheckResult => {
    const actual = (latest as {version?: unknown} | null)?.version;

    return check(actual === version, 'live-latest-json', String(actual), `expected ${version}, got ${String(actual)}`);
};

/** The DMG location a download redirect must reach, for a version. */
export const expectedDmgPath = (version: string): string => `/littlewall/stagistic/releases/download/v${version}/${ASSET_NAMES.dmg}`;

export const checkDownloadRedirect = (location: string | null, version: string): CheckResult => {
    if (location === null) {
        return fail('live-download', 'no Location header');
    }

    const url = new URL(location, 'https://stagistic.com');
    const path = decodeURIComponent(url.pathname);
    const ok = path === expectedDmgPath(version) || (path.includes(`/v${version}/`) && path.endsWith(ASSET_NAMES.dmg));

    return check(ok, 'live-download', location, `expected a link to ${ASSET_NAMES.dmg} of v${version}, got ${location}`);
};

export const checkNotice = (status: number, contentType: string | null, body: string, cacheControl: string | null): CheckResult[] => {
    const json = (() => {
        try {
            JSON.parse(body);

            return true;
        } catch {
            return false;
        }
    })();

    return [
        check(status === 200 && json, 'live-notice', `${status}${contentType ? ` ${contentType}` : ''}`, `expected 200 with JSON, got ${status}`),
        check((cacheControl ?? '').includes('no-store'), 'live-notice-cache', cacheControl ?? '', `cache-control must contain no-store, got ${cacheControl ?? '(none)'}`),
    ];
};

export const checkContains = (name: string, status: number, body: string, needle: string): CheckResult => check(
    status === 200 && body.includes(needle),
    name,
    `contains ${needle}`,
    status === 200 ? `page does not mention ${needle}` : `status ${status}`,
);

export const checkStatus = (name: string, status: number): CheckResult => check(status === 200, name, String(status), `expected 200, got ${status}`);

export const checkWebVersion = (manifest: unknown, version: string): CheckResult => {
    const actual = (manifest as {release?: unknown} | null)?.release;

    return check(actual === version, 'live-web-version', String(actual), `expected ${version}, got ${String(actual)}`);
};
