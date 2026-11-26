import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    buildArgs,
    isTestBuild,
    newestFile,
    parseAnswer,
    parseUpdateTestArgs,
    renderReport,
    servedFile,
    STEPS,
    testVersions,
    UPDATE_TEST_ENDPOINT,
} from './updateTestLib';

describe('update test helpers', () => {
    it('derives versions, endpoint and build arguments', () => {
        expect(testVersions('1.0.0')).toEqual({
            a: '1.0.0-test.1',
            b: '1.0.0-test.2',
        });
        expect(UPDATE_TEST_ENDPOINT).toBe('http://127.0.0.1:8765/latest.json');
        expect(buildArgs('1.0.0-test.1', 'update-test-out/A')).toEqual([
            'scripts/release/cli.ts',
            '--test-version',
            '1.0.0-test.1',
            '--updater-endpoint',
            'http://127.0.0.1:8765/latest.json',
            '--out-dir',
            'update-test-out/A',
        ]);
    });

    it('recognises test builds', () => {
        expect(isTestBuild('1.0.0-test.2')).toBe(true);
        expect(isTestBuild('1.0.0')).toBe(false);
        expect(isTestBuild('1.0.0-beta.1')).toBe(false);
    });

    it('parses --from by id and number', () => {
        expect(parseUpdateTestArgs([])).toEqual({fromIndex: 0});
        expect(parseUpdateTestArgs(['--from', 'install-a'])).toEqual({fromIndex: 3});
        expect(parseUpdateTestArgs([
            '--',
            '--from',
            '6',
        ])).toEqual({fromIndex: 5});
        expect(() => parseUpdateTestArgs(['--from', 'nope'])).toThrow(/step id/);
        expect(() => parseUpdateTestArgs(['--from', '10'])).toThrow(/step id/);
        expect(() => parseUpdateTestArgs(['--from'])).toThrow(/step id/);
        expect(() => parseUpdateTestArgs(['--x'])).toThrow(/Unknown/);
        expect(STEPS).toHaveLength(9);
    });

    it('parses answers', () => {
        expect(parseAnswer('\n')).toBe('run');
        expect(parseAnswer(' S ')).toBe('skip');
        expect(parseAnswer('q')).toBe('quit');
        expect(parseAnswer('x')).toBeUndefined();
    });

    it('picks the newest file', () => {
        expect(newestFile([])).toBeUndefined();
        expect(newestFile([
            {
                name: 'a',
                mtimeMs: 1,
            },
            {
                name: 'b',
                mtimeMs: 3,
            },
            {
                name: 'c',
                mtimeMs: 2,
            },
        ])?.name).toBe('b');
    });

    it('serves only latest.json and the archive', () => {
        expect(servedFile('/latest.json')).toBe('latest.json');
        expect(servedFile('/Stagistic-Editor-mac-arm64.app.tar.gz?x=1')).toBe('Stagistic-Editor-mac-arm64.app.tar.gz');
        expect(servedFile('/Stagistic-Editor-mac-arm64.dmg')).toBeUndefined();
        expect(servedFile('/../etc/passwd')).toBeUndefined();
    });

    it('renders a report', () => {
        const report = renderReport({
            base: '1.0.0',
            startedAt: '2026-01-01T00:00:00Z',
            entries: [
                {
                    step: 'Preflight',
                    status: 'PASS',
                    startedAt: '00:00:00',
                    seconds: 2,
                    notes: ['ad-hoc'],
                },
                {
                    step: 'Build A',
                    status: 'SKIP',
                    startedAt: '00:00:02',
                    seconds: 0,
                    notes: [],
                },
            ],
            answers: [
                {
                    question: 'Data intact',
                    answer: 'y',
                },
            ],
        });

        expect(report).toContain('| Preflight | PASS | 00:00:00 | 2 | ad-hoc |');
        expect(report).toContain('| Build A | SKIP |');
        expect(report).toContain('- Data intact: y');
        expect(report).toContain('1.0.0-test.1 to B 1.0.0-test.2');
    });
});
