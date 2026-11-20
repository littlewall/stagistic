import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {parseVersionManifest} from './versionManifest';

describe('version manifest', () => {
    it('reads the Release number and the database generation', () => {
        const text = '{"release":"0.2.0","dbGeneration":"27/20261103094608_x/0.3.7"}';

        expect(parseVersionManifest(text)).toEqual({release: '0.2.0', dbGeneration: '27/20261103094608_x/0.3.7'});
    });

    it.each([
        ['an HTML page', '<!doctype html><html></html>'],
        ['empty text', ''],
        ['a JSON array', '[]'],
        ['null', 'null'],
        ['a missing release', '{"dbGeneration":"1/a/0.3.7"}'],
        ['a non-string release', '{"release":2,"dbGeneration":"1/a/0.3.7"}'],
        ['a malformed release', '{"release":"v2","dbGeneration":"1/a/0.3.7"}'],
        ['a missing generation', '{"release":"0.2.0"}'],
        ['an unreadable generation', '{"release":"0.2.0","dbGeneration":"nonsense"}'],
    ])('rejects %s', (_name, text) => {
        expect(parseVersionManifest(text)).toBeNull();
    });
});
