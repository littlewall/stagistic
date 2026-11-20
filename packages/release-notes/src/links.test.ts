import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {resolveNoteImage, resolveNoteLink} from './links';

describe('resolveNoteLink', () => {
    it('joins a site path to the given site', () => {
        expect(resolveNoteLink('/guide/templates', 'https://docs.stagistic.com')).toBe('https://docs.stagistic.com/guide/templates');
    });

    it('keeps an https address', () => {
        expect(resolveNoteLink('https://example.com/a', 'https://stagistic.com')).toBe('https://example.com/a');
    });

    it.each([
        undefined,
        '',
        '//evil.example/x',
        'http://example.com/a',
        'javascript:alert(1)',
        'guide/templates',
    ])('drops %s', value => {
        expect(resolveNoteLink(value, 'https://stagistic.com')).toBeUndefined();
    });
});

describe('resolveNoteImage', () => {
    it('keeps a path served by the site itself', () => {
        expect(resolveNoteImage('/images/templates.png')).toBe('/images/templates.png');
    });

    it.each([
        undefined,
        '',
        '//evil.example/x.png',
        'https://example.com/x.png',
        'images/x.png',
    ])('drops %s', value => {
        expect(resolveNoteImage(value)).toBeUndefined();
    });
});
