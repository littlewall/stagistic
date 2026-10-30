import {
    degrees,
    type PDFDocument,
    type PDFEmbeddedPage,
} from 'pdf-lib';

import type {TranscriptResult} from '../model/visualLine';
import {drawIntegratedPageNumber} from './drawIntegratedPageNumber';

interface ScoreArtwork {
    width: number,
    height: number,
    rotation: number,
    embedded?: PDFEmbeddedPage,
}

/** Preserve the visible crop and rotation; blank PDF sheets have no artwork to embed. */
export const embedScoreArtwork = async (target: PDFDocument, source: PDFDocument): Promise<ScoreArtwork[]> => {
    const sheets: ScoreArtwork[] = [];

    for (const page of source.getPages()) {
        const {
            x,
            y,
            width,
            height,
        } = page.getCropBox();
        const rotation = ((page.getRotation().angle % 360) + 360) % 360;
        const embedded = page.node.Contents() ? await target.embedPage(page, {
            left: x,
            bottom: y,
            right: x + width,
            top: y + height,
        }) : undefined;

        sheets.push({
            width,
            height,
            rotation,
            embedded,
        });
    }

    return sheets;
};

export const appendScoreArtwork = async (document: PDFDocument, sheet: ScoreArtwork, transcript: TranscriptResult, pageNumber: number) => {
    const {
        width,
        height,
        rotation,
    } = sheet;
    const sideways = rotation === 90 || rotation === 270;
    const visibleWidth = sideways ? height : width;
    const visibleHeight = sideways ? width : height;
    const page = document.addPage([visibleWidth, visibleHeight]);
    const offsets: Record<number, {x: number, y: number}> = {
        0: {x: 0, y: 0},
        90: {x: 0, y: width},
        180: {x: width, y: height},
        270: {x: height, y: 0},
    };
    const offset = offsets[rotation] ?? offsets[0];

    if (sheet.embedded) page.drawPage(sheet.embedded, {
        x: offset.x,
        y: offset.y,
        width,
        height,
        rotate: degrees(-rotation),
    });

    await drawIntegratedPageNumber(document, page, transcript, pageNumber);
};
