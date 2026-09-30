import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {formatDocumentTitle} from './documentTitle';

describe('formatDocumentTitle', () => {
    it.each([
        [undefined, 'Stagistic Editor'],
        ['', 'Stagistic Editor'],
        ['Scripts', 'Scripts — Stagistic Editor'],
        ['My Script', 'My Script — Stagistic Editor'],
        ['Export · My Script', 'Export · My Script — Stagistic Editor'],
    ])('formats %s as %s', (context, expected) => {
        expect(formatDocumentTitle(context)).toBe(expected);
    });
});
