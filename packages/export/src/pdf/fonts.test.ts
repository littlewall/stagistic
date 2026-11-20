import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
});

describe('export fonts', () => {
    it('reports an HTML fallback page as a missing file, not as a font', async () => {
        vi.stubGlobal('fetch', () => Promise.resolve(new Response('<!doctype html>', {headers: {'content-type': 'text/html'}})));

        const {registerFonts} = await import('./fonts');
        const {PdfFileLoadError} = await import('./pdfFileLoadError');

        await expect(registerFonts({} as never)).rejects.toBeInstanceOf(PdfFileLoadError);
    });

    it('reports a failed font request as a missing file', async () => {
        vi.stubGlobal('fetch', () => Promise.resolve(new Response('', {status: 404})));

        const {registerFonts} = await import('./fonts');
        const {PdfFileLoadError} = await import('./pdfFileLoadError');

        await expect(registerFonts({} as never)).rejects.toBeInstanceOf(PdfFileLoadError);
    });
});
