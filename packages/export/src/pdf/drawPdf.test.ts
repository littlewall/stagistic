import {PDFDocument} from 'pdf-lib';
import {describe, expect, it} from 'vite-plus/test';

import type {StaffRowItem, TranscriptResult} from '../visualLine';
import {drawPdf} from './drawPdf';

const staffRow: StaffRowItem = {
    type: 'staff-row',
    label: {
        text: 'Kylie (soprano)',
        x: 144,
        y: 400,
        fontSizePx: 16,
    },
    staff: {
        xPx: 350,
        widthPx: 300,
        baselineY: 440,
        unitPx: 6.4,
        clef: 'treble',
        notes: [
            {
                position: -2,
                alter: 0,
                ledgerPositions: [-2],
                xFraction: 0.15,
            },
            {
                position: 10,
                alter: 1,
                ledgerPositions: [10],
                xFraction: 0.8,
            },
        ],
    },
};

const transcript: TranscriptResult = {
    pageWidthPx: 794,
    pageHeightPx: 1123,
    marginLeftPx: 144,
    marginRightPx: 96,
    marginTopPx: 96,
    items: [staffRow],
};

describe('drawPdf special items', () => {
    it('draws a staff-row leading page into a valid, non-empty PDF', async () => {
        const blob = await drawPdf(transcript);

        expect(blob.size).toBeGreaterThan(0);
        expect(blob.type).toBe('application/pdf');

        const bytes = new Uint8Array(await blob.arrayBuffer());
        const parsed = await PDFDocument.load(bytes);

        expect(parsed.getPageCount()).toBe(1);
    });

    it('draws a staff row without an accidental just as safely', async () => {
        const naturalOnly: TranscriptResult = {
            ...transcript,
            items: [
                {
                    ...staffRow,
                    staff: {
                        ...staffRow.staff,
                        clef: 'treble-8vb',
                        notes: [
                            {
                                position: 0,
                                alter: 0,
                                ledgerPositions: [],
                                xFraction: 0.15,
                            },
                            {
                                position: 4,
                                alter: -1,
                                ledgerPositions: [],
                                xFraction: 0.8,
                            },
                        ],
                    },
                },
            ],
        };

        const blob = await drawPdf(naturalOnly);

        expect(blob.size).toBeGreaterThan(0);
    });

    it('embeds a title-page image into a valid PDF', async () => {
        const withImage: TranscriptResult = {
            ...transcript,
            items: [
                {
                    type: 'title-page-image',
                    dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
                    format: 'PNG',
                    x: 147,
                    y: 60,
                    widthPx: 500,
                    heightPx: 300,
                },
            ],
        };
        const blob = await drawPdf(withImage);
        const parsed = await PDFDocument.load(await blob.arrayBuffer());

        expect(parsed.getPageCount()).toBe(1);
        expect(blob.size).toBeGreaterThan(0);
    });
});
