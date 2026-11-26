import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    buildConfigOverride,
    isLoopbackHttpEndpoint,
    latestJson,
    parseArgs,
} from './lib';

const local = 'http://127.0.0.1:8765/latest.json';

describe('local http updater endpoint', () => {
    it('recognises loopback http endpoints only', () => {
        expect(isLoopbackHttpEndpoint(local)).toBe(true);
        expect(isLoopbackHttpEndpoint('http://localhost:9000/latest.json')).toBe(true);
        expect(isLoopbackHttpEndpoint('http://localhost/latest.json')).toBe(false);
        expect(isLoopbackHttpEndpoint('http://example.com:80/latest.json')).toBe(false);
        expect(isLoopbackHttpEndpoint('http://127.0.0.1.evil.com:80/x')).toBe(false);
        expect(isLoopbackHttpEndpoint('https://127.0.0.1:8765/latest.json')).toBe(false);
    });

    it('allows insecure transport in the override for a test build', () => {
        expect(buildConfigOverride({
            testVersion: '1.0.0-test.1',
            updaterEndpoint: local,
            hasUpdaterConfig: true,
        })).toEqual({
            version: '1.0.0-test.1',
            plugins: {updater: {
                endpoints: [local],
                dangerousInsecureTransportProtocol: true,
            }},
        });
    });

    it('keeps https endpoints and non-test builds strict', () => {
        const https = buildConfigOverride({
            testVersion: '1.0.0-test.1',
            updaterEndpoint: 'https://example.com/latest.json',
            hasUpdaterConfig: true,
        });

        expect(https?.plugins).toEqual({updater: {endpoints: ['https://example.com/latest.json']}});
        expect(buildConfigOverride({
            updaterEndpoint: local,
            hasUpdaterConfig: true,
        })?.plugins).toEqual({updater: {endpoints: [local]}});
    });

    it('validates endpoint arguments', () => {
        const base = ['--updater-endpoint'];

        expect(parseArgs([
            ...base,
            local,
            '--test-version',
            '1.0.0-test.1',
        ]).updaterEndpoint).toBe(local);
        expect(parseArgs([...base, 'https://example.com/latest.json']).updaterEndpoint).toBe('https://example.com/latest.json');
        expect(() => parseArgs([
            ...base,
            'http://example.com:80/latest.json',
            '--test-version',
            '1.0.0-test.1',
        ])).toThrow(/127\.0\.0\.1/);
        expect(() => parseArgs([...base, local])).toThrow(/--test-version/);
        expect(() => parseArgs([
            ...base,
            local,
            '--test-version',
            '1.0.0-test.1',
            '--tag',
            'v1.0.0',
        ])).toThrow(/--tag/);
        expect(() => parseArgs([
            ...base,
            'https://example.com/latest.json',
            '--publish-draft',
        ])).toThrow(/--publish-draft/);
    });

    it('points latest.json at the archive next to the endpoint', () => {
        const options = {
            version: '1.0.0-test.2',
            notes: 'n',
            pubDate: '2026-01-01T00:00:00.000Z',
            signature: 'sig',
        };

        expect(latestJson({
            ...options,
            updaterEndpoint: local,
        }).platforms['darwin-aarch64'].url).toBe('http://127.0.0.1:8765/Stagistic-Editor-mac-arm64.app.tar.gz');
        expect(latestJson(options).platforms['darwin-aarch64'].url).toContain('github.com/littlewall');
    });
});
