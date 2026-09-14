import {PDFDocument} from 'pdf-lib';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {readPdfPageCounts} from './readPdfPageCounts';

const makePdf = async (pageCount: number) => {
    const doc = await PDFDocument.create();

    for (let index = 0; index < pageCount; index += 1) {
        doc.addPage([100, 100]);
    }

    const bytes = await doc.save();

    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
};

describe('readPdfPageCounts', () => {
    it('reads the page count of each score', async () => {
        const counts = await readPdfPageCounts({
            m1: await makePdf(3),
            m2: await makePdf(1),
        });

        expect(counts).toEqual({m1: 3, m2: 1});
    });

    it('omits scores that fail to parse', async () => {
        const counts = await readPdfPageCounts({
            broken: new TextEncoder().encode('not a pdf').buffer,
        });

        expect(counts).toEqual({});
    });
});
