import {readFileSync} from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

const HELPER = '__stagisticSimpleQuery';
const pgliteRoot = path.resolve(import.meta.dirname, '../../node_modules/@electric-sql/pglite');

const source = (file: string): string => readFileSync(path.join(pgliteRoot, 'dist/worker', file), 'utf8');

describe.each(['index.js', 'index.cjs'])('patched PGlite worker %s', file => {
    const code = source(file);

    it('declares the raw-query helper once, under a name nothing else uses', () => {
        expect(code.match(new RegExp(`function ${HELPER}\\(`, 'gu'))).toHaveLength(1);
        expect(code.match(new RegExp(`(?:var|let|const) ${HELPER}\\b|[,;]${HELPER}=`, 'gu'))).toBeNull();
    });

    it('closes the dead tab\'s transaction with Sync, then ROLLBACK, through that helper', () => {
        expect(code).toContain(`${HELPER}("ROLLBACK")`);

        const fn = (/function __stagisticSimpleQuery\(t\)\{[^}]*\}/u).exec(code)?.[0];

        expect(fn).toBeDefined();

        const build = vm.runInNewContext(`${fn}; ${HELPER}`, {
            TextEncoder,
            DataView,
            Uint8Array,
        }) as (sql: string) => Uint8Array;
        const bytes = build('ROLLBACK');

        expect(bytes.slice(0, 5)).toEqual(Uint8Array.from([
            83,
            0,
            0,
            0,
            4,
        ]));
        expect(bytes[5]).toBe(81);
        expect(new TextDecoder().decode(bytes.slice(10))).toBe('ROLLBACK\0');
    });

    it.each([
        'execProtocol',
        'execProtocolStream',
        'execProtocolRaw',
    ])('rejects %s from a tab once it is closed', method => {
        expect(code).toContain(`async ${method}(s){if(tabClosed)throw new Error("Tab closed");`);
    });
});
