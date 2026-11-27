import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {ASSET_NAMES} from './lib';
import {
    checkArchitectures,
    checkAssetSet,
    checkBridgeTeam,
    checkBundleId,
    checkDownloadRedirect,
    checkDraftState,
    checkLatestJson,
    checkMinimumSystem,
    checkNotice,
    checkSigningKind,
    checkSpctl,
    checkStapler,
    checkVersion,
    formatResult,
    parseCodesign,
    parseVerifyArgs,
    summarize,
} from './verifyLib';

const developerId = `Executable=/Applications/Stagistic Editor.app/Contents/MacOS/stagistic
Identifier=com.stagistic.editor
Format=app bundle with Mach-O thin (arm64)
CodeDirectory v=20500 size=1 flags=0x10000(runtime) hashes=1+7 location=embedded
Authority=Developer ID Application: Milan Zitka (ABCDE12345)
Authority=Developer ID Certification Authority
Authority=Apple Root CA
TeamIdentifier=ABCDE12345
`;
const adHoc = `Identifier=com.stagistic.editor
CodeDirectory v=20400 size=1 flags=0x2(adhoc) hashes=1+7 location=embedded
Signature=adhoc
TeamIdentifier=not set
`;

describe('codesign parsing', () => {
    it('detects Developer ID with team', () => {
        expect(parseCodesign(developerId)).toEqual({
            kind: 'developer-id',
            authority: 'Developer ID Application: Milan Zitka (ABCDE12345)',
            teamId: 'ABCDE12345',
        });
    });

    it('detects ad-hoc and unsigned', () => {
        expect(parseCodesign(adHoc)).toEqual({kind: 'ad-hoc'});
        expect(parseCodesign('code object is not signed at all').kind).toBe('unsigned');
    });

    it('gates ad-hoc on --allow-ad-hoc', () => {
        expect(checkSigningKind({kind: 'ad-hoc'}, true).status).toBe('PASS');
        expect(checkSigningKind({kind: 'ad-hoc'}, false).status).toBe('FAIL');
        expect(checkSigningKind({kind: 'unsigned'}, true).status).toBe('FAIL');
        expect(checkSigningKind(parseCodesign(developerId), false).status).toBe('PASS');
    });

    it('compares bridge and app team', () => {
        const app = parseCodesign(developerId);

        expect(checkBridgeTeam(app, app).status).toBe('PASS');
        expect(checkBridgeTeam(app, {
            ...app,
            teamId: 'OTHER00000',
        }).status).toBe('FAIL');
        expect(checkBridgeTeam(app, {kind: 'ad-hoc'}).status).toBe('FAIL');
    });
});

describe('bundle checks', () => {
    it('checks identifier, version, minimum system and architecture', () => {
        expect(checkBundleId('com.stagistic.editor').status).toBe('PASS');
        expect(checkBundleId('com.other').status).toBe('FAIL');
        expect(checkVersion('1.0.0').status).toBe('PASS');
        expect(checkVersion('1.0.0', '1.0.1').status).toBe('FAIL');
        expect(checkVersion('1.0.0', '1.0.0').status).toBe('PASS');
        expect(checkMinimumSystem('15.0').status).toBe('PASS');
        expect(checkMinimumSystem('14.0').status).toBe('FAIL');
        expect(checkArchitectures('arm64\n').status).toBe('PASS');
        expect(checkArchitectures('x86_64 arm64').status).toBe('FAIL');
    });

    it('evaluates spctl and stapler output', () => {
        const accepted = '/Applications/X.app: accepted\nsource=Notarized Developer ID\norigin=Developer ID Application: X';

        expect(checkSpctl(accepted, 0).status).toBe('PASS');
        expect(checkSpctl('/X.app: accepted\nsource=Developer ID', 0).status).toBe('FAIL');
        expect(checkSpctl('/X.app: rejected\nsource=no usable signature', 3).status).toBe('FAIL');
        expect(checkStapler('stapler-app', 'Processing: x\nThe validate action worked!', 0).status).toBe('PASS');
        expect(checkStapler('stapler-app', 'Could not find ticket', 65).status).toBe('FAIL');
    });
});

describe('draft checks', () => {
    it('requires the exact asset set', () => {
        expect(checkAssetSet(Object.values(ASSET_NAMES)).status).toBe('PASS');
        expect(checkAssetSet([ASSET_NAMES.dmg]).status).toBe('FAIL');
        expect(checkAssetSet([...Object.values(ASSET_NAMES), 'extra.zip']).status).toBe('FAIL');
    });

    it('requires a draft with a body', () => {
        expect(checkDraftState({
            isDraft: true,
            body: 'x',
            tagName: 'v1.0.0',
        }, 'v1.0.0').every(result => result.status === 'PASS')).toBe(true);
        expect(checkDraftState({
            isDraft: false,
            body: ' ',
            tagName: 'v1.0.0',
        }, 'v1.0.0').filter(result => result.status === 'FAIL')).toHaveLength(2);
    });

    it('compares latest.json', () => {
        const good = {
            version: '1.0.0',
            pub_date: '2026-01-01T00:00:00.000Z',
            platforms: {'darwin-aarch64': {
                signature: 'sig',
                url: 'https://github.com/littlewall/stagistic/releases/download/v1.0.0/Stagistic-Editor-mac-arm64.app.tar.gz',
            }},
        };

        expect(checkLatestJson(good, {
            version: '1.0.0',
            signature: 'sig',
        }).every(result => result.status === 'PASS')).toBe(true);
        expect(checkLatestJson({
            ...good,
            pub_date: 'nope',
        }, {
            version: '1.0.1',
            signature: 'other',
        }).filter(result => result.status === 'FAIL')).toHaveLength(4);
        expect(checkLatestJson(null, {
            version: '1.0.0',
            signature: 'sig',
        }).some(result => result.status === 'FAIL')).toBe(true);
    });
});

describe('live checks', () => {
    it('checks the download redirect', () => {
        const dmg = 'https://github.com/littlewall/stagistic/releases/download/v1.0.0/Stagistic-Editor-mac-arm64.dmg';

        expect(checkDownloadRedirect(dmg, '1.0.0').status).toBe('PASS');
        expect(checkDownloadRedirect('https://github.com/littlewall/stagistic/releases/latest/download/Stagistic-Editor-mac-arm64.dmg', '1.0.0').status).toBe('FAIL');
        expect(checkDownloadRedirect(null, '1.0.0').status).toBe('FAIL');
    });

    it('checks the notice', () => {
        expect(checkNotice(200, 'application/json', '{}', 'no-store').every(result => result.status === 'PASS')).toBe(true);
        expect(checkNotice(200, 'text/html', '<html>', 'max-age=60').every(result => result.status === 'FAIL')).toBe(true);
    });
});

describe('arguments and output', () => {
    it('needs exactly one mode', () => {
        expect(parseVerifyArgs([
            '--dmg',
            'a.dmg',
            '--allow-ad-hoc',
        ])).toEqual({
            dmg: 'a.dmg',
            allowAdHoc: true,
        });
        expect(() => parseVerifyArgs([])).toThrow(/exactly one/);
        expect(() => parseVerifyArgs([
            '--dmg',
            'a',
            '--app',
            'b',
        ])).toThrow(/exactly one/);
        expect(() => parseVerifyArgs(['--draft', '1.0.0'])).toThrow(/vX\.Y\.Z/);
        expect(() => parseVerifyArgs(['--live', 'v1'])).toThrow(/X\.Y\.Z/);
        expect(() => parseVerifyArgs(['--wat'])).toThrow(/Unknown/);
    });

    it('formats and summarizes', () => {
        const results = [
            {
                status: 'PASS' as const,
                name: 'a',
                detail: 'd',
            },
            {
                status: 'FAIL' as const,
                name: 'b',
                detail: 'x',
            },
            {
                status: 'SKIP' as const,
                name: 'c',
                detail: '',
            },
        ];

        expect(formatResult(results[0])).toBe('PASS  a  d');
        expect(summarize(results)).toEqual({
            line: '1 passed, 1 failed, 1 skipped',
            failed: true,
        });
    });
});
