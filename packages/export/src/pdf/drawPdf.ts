import {jsPDF} from 'jspdf';
import {
    PDFDocument,
    type PDFPage,
    rgb,
    StandardFonts,
} from 'pdf-lib';

import type {
    PageItem,
    TranscriptResult,
    VisualLine,
    VisualRun,
} from '../visualLine';
import {
    getPdfMonoFontFamily,
    registerFonts,
} from './fonts';

const PX_TO_PT = 72 / 96;

const isPageBreak = (item: PageItem): item is {type: '__page_break__'} => 'type' in item && item.type === '__page_break__';
const getFontStyle = (run: VisualRun) => {
    if (run.bold && run.italic) {
        return 'bolditalic';
    }

    if (run.bold) {
        return 'bold';
    }

    return run.italic ? 'italic' : 'normal';
};

const drawUnderline = (
    doc: jsPDF,
    run: VisualRun,
    y: number,
) => {
    const xPt = run.x * PX_TO_PT;
    const yPt = (y + run.fontSizePx * 0.85) * PX_TO_PT;
    const width = doc.getTextWidth(run.text);

    doc.setLineWidth(0.4);
    doc.line(xPt, yPt, xPt + width, yPt);
};

const drawLine = (
    doc: jsPDF,
    line: VisualLine,
    monoFontFamily: string,
) => {
    line.runs.forEach(run => {
        const family = run.fontFamily.includes('Courier') ? monoFontFamily : 'Helvetica';

        doc.setFont(family, getFontStyle(run));
        doc.setFontSize(run.fontSizePx * PX_TO_PT);
        doc.text(run.text, run.x * PX_TO_PT, line.y * PX_TO_PT, {baseline: 'top'});

        if (run.underline) {
            drawUnderline(doc, run, line.y);
        }
    });
};

const getFooterFont = (footer: NonNullable<TranscriptResult['integratedFooter']>) => {
    if (footer.bold && footer.italic) {
        return StandardFonts.CourierBoldOblique;
    }

    if (footer.bold) {
        return StandardFonts.CourierBold;
    }

    return footer.italic ? StandardFonts.CourierOblique : StandardFonts.Courier;
};

const resolveFooterX = (
    transcript: TranscriptResult,
    footer: NonNullable<TranscriptResult['integratedFooter']>,
    textWidth: number,
) => {
    const contentWidth = transcript.pageWidthPx - transcript.marginLeftPx - transcript.marginRightPx;

    if (footer.alignment === 'center') {
        return transcript.marginLeftPx + (contentWidth - textWidth) / 2;
    }

    if (footer.alignment === 'right') {
        return transcript.pageWidthPx - transcript.marginRightPx - textWidth;
    }

    return transcript.marginLeftPx;
};

const drawIntegratedPageNumber = async (
    document: PDFDocument,
    page: PDFPage,
    transcript: TranscriptResult,
    pageNumber: number,
) => {
    const footer = transcript.integratedFooter;

    if (!footer) {
        return;
    }

    const font = await document.embedFont(getFooterFont(footer));
    const text = footer.text.replaceAll('{{page_number}}', `${pageNumber}.`);
    const fontSizePt = footer.fontSizePx * PX_TO_PT;
    const textWidthPt = font.widthOfTextAtSize(text, fontSizePt);
    const textWidthPx = textWidthPt / PX_TO_PT;
    const {height} = page.getSize();
    const yTopPt = footer.yPx * PX_TO_PT;
    const lineHeightPt = fontSizePt * 1.4;
    const baselineY = height - yTopPt - fontSizePt;
    const x = resolveFooterX(transcript, footer, textWidthPx) * PX_TO_PT;

    page.drawRectangle({
        x: 0,
        y: height - yTopPt - lineHeightPt,
        width: page.getWidth(),
        height: lineHeightPt,
        color: rgb(1, 1, 1),
    });
    page.drawText(text, {
        x, y: baselineY, size: fontSizePt, font, color: rgb(0, 0, 0),
    });

    if (footer.underline) {
        page.drawLine({
            start: {x, y: baselineY - fontSizePt * 0.1},
            end: {x: x + textWidthPt, y: baselineY - fontSizePt * 0.1},
            thickness: 0.4,
            color: rgb(0, 0, 0),
        });
    }
};

export const drawPdf = async (
    transcript: TranscriptResult,
): Promise<Blob> => {
    const pageWidthPt = transcript.pageWidthPx * PX_TO_PT;
    const pageHeightPt = transcript.pageHeightPx * PX_TO_PT;
    const doc = new jsPDF({
        unit: 'pt',
        format: [pageWidthPt, pageHeightPt],
    });

    let monoFontFamily = 'Courier';

    try {
        await registerFonts(doc);
        monoFontFamily = getPdfMonoFontFamily();
    } catch (error) {
        console.error('Export PDF font embedding failed; falling back to core Courier.', error);
    }

    transcript.items.forEach(item => {
        if (isPageBreak(item)) {
            doc.addPage();

            return;
        }

        drawLine(doc, item, monoFontFamily);
    });

    if (!transcript.integratedScores || transcript.integratedScores.length === 0) {
        return doc.output('blob');
    }

    const generated = await PDFDocument.load(doc.output('arraybuffer'));
    const result = await PDFDocument.create();
    const generatedPages = await result.copyPages(generated, generated.getPageIndices());
    const scoresAfterPage = new Map<number, ArrayBuffer[]>();
    const leadingPages = transcript.leadingPageCount ?? 0;
    const musicStartGeneratedPageIndexes = new Set<number>();

    transcript.integratedScores.forEach(score => {
        const startPageIndex = (transcript.scriptPageSourceBlockIds ?? [])
            .findIndex(sourceIds => sourceIds.includes(score.startBlockId));

        if (startPageIndex >= 0) {
            musicStartGeneratedPageIndexes.add(leadingPages + startPageIndex + 1);
        }
    });

    transcript.integratedScores.forEach(score => {
        const sourcePages = transcript.scriptPageSourceBlockIds ?? [];
        let sourcePageIndex = -1;

        sourcePages.forEach((sourceIds, index) => {
            if (sourceIds.includes(score.afterBlockId)) {
                sourcePageIndex = index;
            }
        });

        const pdf = transcript.scorePdfs?.[score.musicId];

        if (sourcePageIndex === undefined || sourcePageIndex < 0 || !pdf) {
            return;
        }

        const pageIndex = leadingPages + sourcePageIndex;
        const existing = scoresAfterPage.get(pageIndex) ?? [];

        existing.push(pdf);
        scoresAfterPage.set(pageIndex, existing);
    });

    let requireOddBookPage = false;

    for (let pageIndex = 0; pageIndex < generatedPages.length; pageIndex += 1) {
        if (musicStartGeneratedPageIndexes.has(pageIndex) && (result.getPageCount() + 1) % 2 === 0) {
            const previous = generatedPages[Math.max(0, pageIndex - 1)];
            const {width, height} = previous.getSize();

            result.addPage([width, height]);
        }

        if (requireOddBookPage && (result.getPageCount() + 1) % 2 === 0) {
            const previous = generatedPages[Math.max(0, pageIndex - 1)];
            const {width, height} = previous.getSize();

            result.addPage([width, height]);
        }

        requireOddBookPage = false;
        result.addPage(generatedPages[pageIndex]);

        const scorePdfs = scoresAfterPage.get(pageIndex) ?? [];

        if (transcript.integratedScores.some(score => {
            const sourcePageIndex = (transcript.scriptPageSourceBlockIds ?? [])
                .reduce((lastIndex, sourceIds, index) => sourceIds.includes(score.afterBlockId) ? index : lastIndex, -1);

            return sourcePageIndex >= 0 && leadingPages + sourcePageIndex === pageIndex;
        })) {
            requireOddBookPage = true;
        }

        for (const scorePdf of scorePdfs) {
            if ((result.getPageCount() + 1) % 2 === 0) {
                const page = generatedPages[pageIndex];
                const {width, height} = page.getSize();

                result.addPage([width, height]);
            }

            const score = await PDFDocument.load(scorePdf);
            const pages = await result.copyPages(score, score.getPageIndices());

            pages.forEach(page => result.addPage(page));
        }
    }

    const finalPages = result.getPages();

    for (const [index, page] of finalPages.entries()) {
        /*
         * Front matter keeps its own roman pagination. The integrated sequence
         * begins with the first generated script page and includes inserted PDF pages.
         */
        if (index < leadingPages) {
            continue;
        }

        await drawIntegratedPageNumber(result, page, transcript, index - leadingPages + 1);
    }

    const bytes = await result.save();

    return new Blob([bytes as unknown as BlobPart], {type: 'application/pdf'});
};
