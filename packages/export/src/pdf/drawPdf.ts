import {jsPDF} from 'jspdf';
import {PDFDocument, type PDFPage, rgb, StandardFonts} from 'pdf-lib';

import type {PageItem, StaffRowItem, TitlePageImageItem, TranscriptResult, VisualLine, VisualRun} from '../visualLine';
import {drawStaffRow} from './drawStaffRow';
import {getPdfMonoFontFamily, registerFonts} from './fonts';
import {planIntegratedAssembly} from './planIntegratedAssembly';

const PX_TO_PT = 72 / 96;

const isPageBreak = (item: PageItem): item is {type: '__page_break__'} => 'type' in item && item.type === '__page_break__';
const isStaffRow = (item: PageItem): item is StaffRowItem => 'type' in item && item.type === 'staff-row';
const isTitlePageImage = (item: PageItem): item is TitlePageImageItem => 'type' in item && item.type === 'title-page-image';
const getFontStyle = (run: VisualRun) => {
    if (run.bold && run.italic) {
        return 'bolditalic';
    }

    if (run.bold) {
        return 'bold';
    }

    return run.italic ? 'italic' : 'normal';
};

const drawUnderline = (doc: jsPDF, run: VisualRun, y: number) => {
    const xPt = run.x * PX_TO_PT;
    const yPt = (y + run.fontSizePx * 0.85) * PX_TO_PT;
    const width = doc.getTextWidth(run.text);

    doc.setLineWidth(0.4);
    doc.line(xPt, yPt, xPt + width, yPt);
};

const drawLine = (doc: jsPDF, line: VisualLine, monoFontFamily: string) => {
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

const resolveFooterX = (transcript: TranscriptResult, footer: NonNullable<TranscriptResult['integratedFooter']>, textWidth: number) => {
    const contentWidth = transcript.pageWidthPx - transcript.marginLeftPx - transcript.marginRightPx;

    if (footer.alignment === 'center') {
        return transcript.marginLeftPx + (contentWidth - textWidth) / 2;
    }

    if (footer.alignment === 'right') {
        return transcript.pageWidthPx - transcript.marginRightPx - textWidth;
    }

    return transcript.marginLeftPx;
};

const drawIntegratedPageNumber = async (document: PDFDocument, page: PDFPage, transcript: TranscriptResult, pageNumber: number) => {
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
        x,
        y: baselineY,
        size: fontSizePt,
        font,
        color: rgb(0, 0, 0),
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

export const drawPdf = async (transcript: TranscriptResult): Promise<Blob> => {
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

        if (isStaffRow(item)) {
            drawStaffRow(doc, item, monoFontFamily);

            return;
        }

        if (isTitlePageImage(item)) {
            doc.addImage(item.dataUrl, item.format, item.x * PX_TO_PT, item.y * PX_TO_PT, item.widthPx * PX_TO_PT, item.heightPx * PX_TO_PT);

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
    const leadingPages = transcript.leadingPageCount ?? 0;
    const scorePagesByMusicId = new Map<string, PDFPage[]>();
    const scorePageCounts = new Map<string, number>();

    for (const score of transcript.integratedScores) {
        const buffer = transcript.scorePdfs?.[score.musicId];

        if (!buffer) {
            continue;
        }

        const scoreDocument = await PDFDocument.load(buffer);
        const pages = await result.copyPages(scoreDocument, scoreDocument.getPageIndices());

        scorePagesByMusicId.set(score.musicId, pages);
        scorePageCounts.set(score.musicId, pages.length);
    }

    const assembly = planIntegratedAssembly({
        scriptPageSourceBlockIds: transcript.scriptPageSourceBlockIds ?? [],
        scores: transcript.integratedScores.map(score => ({
            musicId: score.musicId,
            startBlockId: score.startBlockId,
            afterBlockId: score.afterBlockId,
            pageCount: scorePageCounts.get(score.musicId) ?? 0,
        })),
    });

    for (let index = 0; index < leadingPages; index += 1) {
        result.addPage(generatedPages[index]);
    }

    const {width, height} = generatedPages[0].getSize();

    assembly.steps.forEach(step => {
        if (step.kind === 'blank') {
            result.addPage([width, height]);

            return;
        }

        if (step.kind === 'script') {
            result.addPage(generatedPages[leadingPages + (step.scriptPageIndex ?? 0)]);

            return;
        }

        const pages = scorePagesByMusicId.get(step.musicId ?? '');

        if (pages) {
            result.addPage(pages[step.scorePageIndex ?? 0]);
        }
    });

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
