import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    assertUpdaterReady,
    ASSET_NAMES,
    buildConfigOverride,
    dmgNotarizeCommands,
    ghCommands,
    hasUpdaterSigningKey,
    latestJson,
    mcpBuildArgs,
    parseArgs,
    plainNotes,
    resolveReleaseNumber,
    selectSigning,
    signingEnv,
    tauriBuildArgs,
    UPDATER_PUBKEY_PLACEHOLDER,
} from './lib';

const apple = {
    APPLE_SIGNING_IDENTITY: 'Developer ID Application: X (T)',
    APPLE_API_ISSUER: 'i',
    APPLE_API_KEY: 'k',
    APPLE_API_KEY_PATH: '/k.p8',
};

describe('release script', () => {
    it('uses stable asset names', () => {
        expect(Object.values(ASSET_NAMES)).toEqual([
            'Stagistic-Editor-mac-arm64.dmg',
            'Stagistic-Editor-mac-arm64.app.tar.gz',
            'Stagistic-Editor-mac-arm64.app.tar.gz.sig',
            'latest.json',
        ]);
    });

    it('builds latest.json', () => {
        expect(latestJson({
            version: '1.0.0',
            notes: 'n',
            pubDate: '2026-01-01T00:00:00.000Z',
            signature: 'sig',
        })).toEqual({
            version: '1.0.0',
            notes: 'n',
            pub_date: '2026-01-01T00:00:00.000Z',
            platforms: {'darwin-aarch64': {
                signature: 'sig',
                url: 'https://github.com/littlewall/stagistic/releases/download/v1.0.0/Stagistic-Editor-mac-arm64.app.tar.gz',
            }},
        });
    });

    it('renders plain notes', () => {
        const notes = plainNotes({notes: [{title: 'A', description: 'a'}, {title: 'B', description: 'b'}]} as never);

        expect(notes).toBe('A\na\n\nB\nb');
    });

    it('refuses version and tag mismatches', () => {
        const same = [{file: 'a', version: '1.0.0'}, {file: 'b', version: '1.0.0'}];

        expect(resolveReleaseNumber(same, 'v1.0.0')).toBe('1.0.0');
        expect(resolveReleaseNumber(same)).toBe('1.0.0');
        expect(() => resolveReleaseNumber(same, 'v1.0.1')).toThrow(/does not match/);
        expect(() => resolveReleaseNumber([...same, {file: 'c', version: '0.9.0'}])).toThrow(/disagrees/);
        expect(() => resolveReleaseNumber([{file: 'c', version: 'unreadable'}])).toThrow(/disagrees/);
    });

    it('validates arguments', () => {
        expect(parseArgs([
            '--tag',
            'v1.0.0',
            '--publish-draft',
        ])).toEqual({tag: 'v1.0.0', publishDraft: true});
        expect(() => parseArgs(['--test-version', '1.0.0'])).toThrow(/X.Y.Z-test.N/);
        expect(() => parseArgs(['--tag'])).toThrow(/needs a value/);
        expect(() => parseArgs(['--nope'])).toThrow(/Unknown/);
    });

    it('overrides config at build time only', () => {
        expect(buildConfigOverride({hasUpdaterConfig: false})).toBeUndefined();
        expect(tauriBuildArgs(undefined)).toEqual([
            'build',
            '--target',
            'aarch64-apple-darwin',
        ]);

        const override = buildConfigOverride({
            testVersion: '1.0.0-test.1',
            updaterEndpoint: 'http://x/latest.json',
            hasUpdaterConfig: false,
        });

        expect(override).toEqual({version: '1.0.0-test.1'});
        expect(tauriBuildArgs(override).slice(-2)).toEqual(['--config', '{"version":"1.0.0-test.1"}']);
        expect(buildConfigOverride({
            updaterEndpoint: 'http://x/latest.json',
            hasUpdaterConfig: true,
        })).toEqual({plugins: {updater: {endpoints: ['http://x/latest.json']}}});
    });

    it('skips updater artifacts when no updater signing key is set', () => {
        expect(hasUpdaterSigningKey({})).toBe(false);
        expect(hasUpdaterSigningKey({TAURI_SIGNING_PRIVATE_KEY: 'k'})).toBe(true);
        expect(hasUpdaterSigningKey({TAURI_SIGNING_PRIVATE_KEY_PATH: '/k'})).toBe(true);
        expect(buildConfigOverride({hasUpdaterConfig: true, hasUpdaterSigningKey: false}))
            .toEqual({bundle: {createUpdaterArtifacts: false}});
        expect(buildConfigOverride({hasUpdaterConfig: true, hasUpdaterSigningKey: true})).toBeUndefined();
        expect(buildConfigOverride({hasUpdaterConfig: false, hasUpdaterSigningKey: false})).toBeUndefined();
    });

    it('selects signing from env', () => {
        expect(selectSigning({})).toEqual({mode: 'ad-hoc'});
        expect(selectSigning({APPLE_SIGNING_IDENTITY: '-'})).toEqual({mode: 'ad-hoc'});
        expect(selectSigning(apple)).toEqual({mode: 'developer-id', identity: apple.APPLE_SIGNING_IDENTITY});
        expect(() => selectSigning({APPLE_SIGNING_IDENTITY: 'Dev'})).toThrow(/Incomplete/);
        expect(() => selectSigning({APPLE_API_KEY: 'k'})).toThrow(/Incomplete/);
    });

    it('derives MCP args and env from the signing mode', () => {
        const adHoc = signingEnv({APPLE_API_KEY: 'x'}, {mode: 'ad-hoc'});

        expect(mcpBuildArgs({mode: 'ad-hoc'})).toEqual(['scripts/build-artifacts.mjs']);
        expect(adHoc).toMatchObject({
            CI: 'true',
            APPLE_SIGNING_IDENTITY: '-',
            APPLE_API_KEY: undefined,
        });

        const signed = selectSigning(apple);

        expect(mcpBuildArgs(signed)).toContain('--release');
        expect(signingEnv(apple, signed)).toMatchObject({STAGISTIC_MCP_SIGNING_IDENTITY: apple.APPLE_SIGNING_IDENTITY, CI: 'true'});
    });

    it('lays out the DMG window on GitHub Actions only, unless set explicitly', () => {
        const signing = selectSigning({});

        expect(signingEnv({GITHUB_ACTIONS: 'true'}, signing).TAURI_BUNDLER_DMG_IGNORE_CI).toBe('true');
        expect(signingEnv({}, signing).TAURI_BUNDLER_DMG_IGNORE_CI).toBeUndefined();
        expect(signingEnv({TAURI_BUNDLER_DMG_IGNORE_CI: 'true'}, signing).TAURI_BUNDLER_DMG_IGNORE_CI).toBe('true');
    });

    it('passes the updater key path to the Tauri CLI as TAURI_SIGNING_PRIVATE_KEY', () => {
        expect(signingEnv({TAURI_SIGNING_PRIVATE_KEY_PATH: '/k.key'}, {mode: 'ad-hoc'}).TAURI_SIGNING_PRIVATE_KEY).toBe('/k.key');
        expect(signingEnv({TAURI_SIGNING_PRIVATE_KEY: 'inline', TAURI_SIGNING_PRIVATE_KEY_PATH: '/k.key'}, {mode: 'ad-hoc'}).TAURI_SIGNING_PRIVATE_KEY).toBe('inline');
        expect(signingEnv({}, {mode: 'ad-hoc'}).TAURI_SIGNING_PRIVATE_KEY).toBeUndefined();
    });

    it('signs, notarizes and staples the DMG only for Developer ID builds', () => {
        expect(dmgNotarizeCommands('/o/a.dmg', {mode: 'ad-hoc'}, apple)).toEqual([]);

        const commands = dmgNotarizeCommands('/o/a.dmg', selectSigning(apple), apple);

        expect(commands.map(([command, args]) => [command, args[0]])).toEqual([
            ['codesign', '--force'],
            ['xcrun', 'notarytool'],
            ['xcrun', 'stapler'],
        ]);
        expect(commands[0][1]).toContain(apple.APPLE_SIGNING_IDENTITY);
        expect(commands[1][1]).toEqual(expect.arrayContaining([
            '/o/a.dmg',
            '/k.p8',
            'k',
            'i',
            '--wait',
        ]));
    });

    it('constructs gh commands for create and update', () => {
        const files = ['o/a.dmg', 'o/latest.json'];
        const [create, ...none] = ghCommands({
            version: '1.0.0',
            exists: false,
            bodyFile: 'o/body.md',
            files,
        });

        expect(none).toEqual([]);
        expect(create.slice(0, 3)).toEqual([
            'release',
            'create',
            'v1.0.0',
        ]);
        expect(create).toContain('--draft');
        expect(create).not.toContain('--prerelease');
        expect(create.slice(-2)).toEqual(files);

        const update = ghCommands({
            version: '1.0.0-test.1',
            exists: true,
            bodyFile: 'o/body.md',
            files,
        });

        expect(update.map(command => command[1])).toEqual(['edit', 'upload']);
        expect(update[0]).toContain('--draft');
        expect(update[1]).toContain('--clobber');
        expect(update.flat()).not.toContain('create');
        expect(ghCommands({
            version: '1.0.0-test.1',
            exists: false,
            bodyFile: 'b',
            files,
        })[0]).toContain('--prerelease');
    });
});

describe('assertUpdaterReady', () => {
    const ready = {
        hasUpdaterConfig: true,
        canSignUpdates: true,
        pubkey: 'real-key',
    };

    it('lets local and test runs build without a key or a real public key', () => {
        expect(() => assertUpdaterReady({
            args: {publishDraft: false},
            hasUpdaterConfig: true,
            canSignUpdates: false,
            pubkey: UPDATER_PUBKEY_PLACEHOLDER,
        })).not.toThrow();
    });

    it('fails a tagged run without the signing key', () => {
        expect(() => assertUpdaterReady({
            args: {tag: 'v1.0.0', publishDraft: false},
            ...ready,
            canSignUpdates: false,
        }))
            .toThrow(/TAURI_SIGNING_PRIVATE_KEY/);
    });

    it('fails a published run without the signing key', () => {
        expect(() => assertUpdaterReady({
            args: {publishDraft: true},
            ...ready,
            canSignUpdates: false,
        }))
            .toThrow(/TAURI_SIGNING_PRIVATE_KEY/);
    });

    it('fails a release run while the public key is still the placeholder', () => {
        expect(() => assertUpdaterReady({
            args: {tag: 'v1.0.0', publishDraft: true},
            ...ready,
            pubkey: UPDATER_PUBKEY_PLACEHOLDER,
        }))
            .toThrow(/placeholder/);
    });

    it('passes a release run with key and public key', () => {
        expect(() => assertUpdaterReady({args: {tag: 'v1.0.0', publishDraft: true}, ...ready})).not.toThrow();
    });
});
