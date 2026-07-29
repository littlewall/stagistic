import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {loadExampleScriptTemplate} from './loadExampleScriptTemplate';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

describe('loadExampleScriptTemplate', () => {
    it('loads a non-empty valid score PDF only with the example template', async () => {
        const template = await loadExampleScriptTemplate();
        const pdf = await pdfjs.getDocument({
            data: await template.score.blob.arrayBuffer(),
        }).promise;

        try {
            expect(template.score.type).toBe('application/pdf');
            expect(template.score.size).toBeGreaterThan(0);
            expect(pdf.numPages).toBeGreaterThan(0);
        } finally {
            await pdf.destroy();
        }
    });
});
