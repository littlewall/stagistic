import {describe, expect, it} from 'vite-plus/test';

import {stableJsonBytes, stableJsonStringify} from './stableJson';

describe('stableJsonStringify', () => {
    it('sorts object keys recursively without reordering arrays', () => {
        expect(stableJsonStringify({z: 1, a: {y: 2, b: 3}, rows: [{z: 1, a: 2}]})).toBe('{"a":{"b":3,"y":2},"rows":[{"a":2,"z":1}],"z":1}');
    });

    it('returns exact UTF-8 bytes', () => {
        expect(new TextDecoder().decode(stableJsonBytes({title: 'Příliš žluťoučký'}))).toBe('{"title":"Příliš žluťoučký"}');
    });
});
