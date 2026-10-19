import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {loadPgliteFsBundle, loadPgliteWasmModule} from './assets';

afterEach(() => vi.restoreAllMocks());

describe('PGlite asset loading', () => {
    it('loads the filesystem bundle and compiles the WASM binary', async () => {
        const fetchAsset = vi.spyOn(globalThis, 'fetch')
            .mockResolvedValueOnce(new Response('filesystem bundle'))
            .mockResolvedValueOnce(new Response(new Uint8Array([
                0,
                97,
                115,
                109,
                1,
                0,
                0,
                0,
            ])));

        expect(await (await loadPgliteFsBundle('/pglite.data')).text()).toBe('filesystem bundle');
        expect(await loadPgliteWasmModule('/pglite.wasm')).toBeInstanceOf(WebAssembly.Module);
        expect(fetchAsset.mock.calls.map(([url]) => url)).toEqual(['/pglite.data', '/pglite.wasm']);
    });

    it.each([
        ['fs bundle', loadPgliteFsBundle],
        ['wasm', loadPgliteWasmModule],
    ] as const)('reports the failed %s response before reading its contents', async (name, load) => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('missing asset', {status: 404}));

        await expect(load('/missing')).rejects.toThrow(`Failed to load PGlite ${name} (404)`);
    });

    it('rejects an invalid WASM binary', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('not wasm'));

        await expect(loadPgliteWasmModule('/invalid.wasm')).rejects.toBeInstanceOf(WebAssembly.CompileError);
    });
});
