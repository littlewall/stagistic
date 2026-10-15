import * as lib0 from 'lib0/buffer';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {fromBase64, toBase64} from './base64';

describe('base64', () => {
    it('matches the standard encoding (same output as lib0 in Node) and round-trips', () => {
        const bytes = Uint8Array.from({length: 70_000}, (_, index) => (index * 31) % 256);

        expect(toBase64(bytes)).toBe(lib0.toBase64(bytes));
        expect(fromBase64(toBase64(bytes))).toEqual(bytes);
        expect(toBase64(bytes.subarray(3, 9))).toBe(lib0.toBase64(bytes.subarray(3, 9)));
        expect(toBase64(new TextEncoder().encode('Man'))).toBe('TWFu');
        expect(toBase64(new Uint8Array())).toBe('');
    });
});
