import {
    type PDFDocument,
    type PDFPage,
    rgb,
    StandardFonts,
} from 'pdf-lib';

import type {TranscriptResult} from '../model/visualLine';

const numberFont = (bold: boolean, italic: boolean) => {
    if (bold && italic) return StandardFonts.CourierBoldOblique;

    if (bold) return StandardFonts.CourierBold;

    return italic ? StandardFonts.CourierOblique : StandardFonts.Courier;
};

export const drawIntegratedPageNumber = async (document: PDFDocument, page: PDFPage, transcript: TranscriptResult, pageNumber: number) => {
    const footer = transcript.integratedFooter;

    if (!footer) return;

    const font = await document.embedFont(numberFont(footer.bold, footer.italic));
    const text = footer.text.replaceAll('{{page_number}}', `${pageNumber}.`);
    const width = page.getWidth();
    const left = (footer.marginLeftPx ?? transcript.marginLeftPx) * 0.75;
    const right = (footer.marginRightPx ?? transcript.marginRightPx) * 0.75;
    const fontSize = footer.fontSizePx * 0.75;
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const x = footer.alignment === 'center' ? left + (width - left - right - textWidth) / 2 : footer.alignment === 'right' ? width - right - textWidth : left;
    // Match jsPDF's top text baseline used on the generated script pages.
    const y = (transcript.pageHeightPx - footer.yPx) * 0.75 - fontSize * 0.85;

    page.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
    });

    if (footer.underline) page.drawLine({
        start: {x, y: y - fontSize * 0.1},
        end: {x: x + textWidth, y: y - fontSize * 0.1},
        thickness: 0.4,
        color: rgb(0, 0, 0),
    });
};
