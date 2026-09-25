import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import {describe, expect, it} from 'vite-plus/test';

import {loadExampleScriptTemplate} from './loadExampleScriptTemplate';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

describe('loadExampleScriptTemplate', () => {
    it('loads a valid score PDF and title-page logo with the example template', async () => {
        const template = await loadExampleScriptTemplate();
        const pdf = await pdfjs.getDocument({
            data: await template.score.blob.arrayBuffer(),
        }).promise;

        try {
            expect(template.score.type).toBe('application/pdf');
            expect(template.score.size).toBeGreaterThan(0);
            expect(pdf.numPages).toBeGreaterThan(0);
            expect(template.titlePage.logo?.dataUrl).toMatch(/^data:image\/png;base64,/u);
        } finally {
            await pdf.destroy();
        }
    });

    it('declares the logo size of the bundled image', async () => {
        const {logo} = (await loadExampleScriptTemplate()).titlePage;
        const image = new Image();

        image.src = logo?.dataUrl ?? '';
        await image.decode();

        expect([image.naturalWidth, image.naturalHeight]).toEqual([logo?.widthPx, logo?.heightPx]);
    });
});
